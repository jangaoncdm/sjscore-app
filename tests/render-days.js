/* HIS OWN LAST FORTNIGHT — the attendance calendar on the home screen.

   Asked 16.10.2026. The server half is suite 40. This drives the REAL field
   app at 390px against the district's answer for one officer's fourteen
   days and asserts what the officer sees:
     · fourteen tiles, one a day, in the states the answer carries — marked,
       late, on sanctioned leave, Sunday or holiday, not marked;
     · THE PHONE'S OWN RECEIPT BEATS THE DISTRICT'S ANSWER: a mark still
       queued on this phone is drawn as held, never as not marked;
     · TODAY IS NEVER A MISS: outlined, whatever the hour (rule 2);
     · the voluntary office sees its marks and nothing against its blanks;
     · when the district cannot answer, the card is simply absent — no error,
       no empty frame;
     · and IT ACCUSES NOBODY: not one word of sanction on the card.
   Screenshots go to Info/days-render/ so the card can be looked at before it
   is shipped. Usage: node tests/render-days.js
   Playwright is deliberately not a dependency: npm i playwright --no-save. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const APP = path.join(__dirname, '..', 'app');
const OUTDIR = path.join(__dirname, '..', 'Info', 'days-render');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png',
               '.webmanifest':'application/manifest+json' };
function serve(){
  return new Promise(res => {
    const srv = http.createServer((q, s) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      if(/\/config\.js$/.test(u)){
        s.writeHead(200, { 'Content-Type':'text/javascript' });
        return s.end("window.SJGP_SERVER='https://mock.district/exec';window.SJGP_TENANT='';");
      }
      const f = path.join(APP, u === '/' ? 'index.html' : u);
      if(!fs.existsSync(f) || fs.statSync(f).isDirectory()){ s.writeHead(404); return s.end('no'); }
      s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      s.end(fs.readFileSync(f));
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}
let pass = 0, fail = 0;
const ck = (ok, what, detail) => {
  if(ok){ pass++; console.log('  ok    ' + what); }
  else  { fail++; console.log('  FAIL  ' + what + (detail ? '   — ' + detail : '')); }
};
const key = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
const today = () => key(new Date());
const ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return key(d); };

/* THE DISTRICT'S ANSWER for the last fourteen days, built on the real
   calendar so the pass does not depend on the day it is run: every Sunday
   is off, one weekday is a holiday, one is sanctioned leave, one working day
   is a miss, one mark is late, and today is unmarked. */
function answer(opts){
  opts = opts || {};
  const days = [], T = { working:0, marked:0, late:0, leaveDays:0, notMarked:0 };
  const wk = [];
  for(let n = 13; n >= 0; n--){ const d = new Date(); d.setDate(d.getDate() - n); wk.push({ k:key(d), dow:d.getDay(), n }); }
  const weekdays = wk.filter(x => x.dow !== 0 && x.n > 0);
  const hol = weekdays[1] && weekdays[1].k, leave = weekdays[3] && weekdays[3].k,
        miss = weekdays[5] && weekdays[5].k, late = weekdays[7] && weekdays[7].k, far = weekdays[2] && weekdays[2].k;
  wk.forEach(x => {
    const off = x.dow === 0 ? 'Sunday' : x.k === hol ? 'A general holiday' : '';
    const lv = x.k === leave ? 'CL' : '';
    const marked = !off && !lv && x.k !== miss && x.n > 0 && !opts.exempt ? true : (!off && !lv && x.n > 0 && opts.exempt && x.n % 3 === 0);
    const at = marked ? x.k + 'T' + (x.k === late ? '11:42' : '09:1' + (x.n % 10)) + ':00+05:30' : '';
    const d = { date:x.k, off, marked, at, late: marked && x.k === late, out:false, leave:lv };
    /* where the mark was made: most at the village office, one 7 km away */
    if(marked){ d.acc = 8 + x.n; d.km = x.k === far ? 7.2 : +(0.1 * (x.n % 3)).toFixed(1); d.place = 'Konne'; }
    days.push(d);
    if(lv){ T.leaveDays++; return; }
    if(off) return;
    if(!opts.exempt) T.working++;
    if(marked){ T.marked++; if(d.late) T.late++; }
    else if(!opts.exempt && x.n > 0) T.notMarked++;
  });
  return { ok:true, today:today(), from:ago(13), to:today(), cutoff:11, exempt:!!opts.exempt, fenceKm:5, placed:true, days, totals:T,
           at:new Date().toISOString(), sanction:false, note:'What the district holds for you.', _miss:miss, _late:late, _leave:leave, _hol:hol, _far:far };
}
/* a mark in made today, already with the district, so the gate stays down */
const markIn = (phone, extra) => {
  const o = {}, d = today(), ts = new Date(Date.now() - 120*60000).toISOString();
  o[d] = { id:'A1', date:d, ts, lat:17.7, lng:79.1, acc:11, verified:true, status:'PRESENT', phone, sync:'synced' };
  return Object.assign(o, extra || {});
};
const who = (role, name) => ({ name, role, phone:'9000000014', mandal:'Jangaon', gp:'Konne', gps:['Konne'] });
const BASE = { url:'https://mock.district/exec', cache:[], master:[], leave:[], prefs:{ sun:0, big:0 }, who:'9000000014',
               session:{ token:'T1', user: who('PS', 'K. Ramesh') }, out:{},
               /* his place of duty, as op=duty leaves it on the phone: a mark still on this phone is measured against it */
               duty:{ on:true, km:5, acc:1000, which:'gp', why:'', pts:[{ name:'Konne', lat:17.7, lng:79.1 }], at:Date.now() } };
/* the forecast service's record for his mandal, the fortnight behind and today */
const WX = (() => {
  const days = []; for(let n = 13; n >= 0; n--){ const d = new Date(); d.setDate(d.getDate() - n); days.push({ date:key(d), tmax: 27 + (n * 7) % 13, tmin: 21, rain: n % 5 === 0 ? 12 : 0 }); }
  return { ok:true, at:new Date().toISOString(), date:today(), source:'Open-Meteo', level:'CALM',
           mine:{ mandal:'Jangaon', level:'CALM', temp:30, tmax:33, tmin:22, rain:0, rainChance:10, wind:12, today:'Clear', days } };
})();
const SANCTION = /show.?cause|casual leave|debit|loss of pay|default|notice|disciplin|penalt/i;

(async () => {
  if(!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive:true });
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();

  async function open_(store, daysAnswer, shot, dark){
    const ctx = await br.newContext({ viewport:{ width:390, height:844 }, colorScheme: dark ? 'dark' : 'light' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    let asked = 0;
    await p.route('**/mock.district/**', r => {
      const q = r.request();
      const rep = o => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(o) });
      if(q.method() === 'POST'){ let x = {}; try{ x = JSON.parse(q.postData() || '{}'); }catch(e){}
        if(x.kind === 'attendance') return r.abort('failed');            /* a village road: the queued mark stays queued */
        return rep({ ok:true }); }
      if(/op=myDays/.test(q.url())){ asked++; return rep(daysAnswer); }
      if(/op=weather/.test(q.url())) return rep(WX);
      if(/op=duty/.test(q.url())) return rep({ ok:true, on:true, km:5, acc:1000, which:'gp', why:'', duty:[{ name:'Konne', lat:17.7, lng:79.1 }] });
      if(/op=out/.test(q.url())) return rep({ ok:true, date:today(), markedIn:true, markedOut:false, outFrom:'', canOut:false, why:'' });
      if(/op=gpdp/.test(q.url())) return rep({ ok:true, year:'2026-27', due:false, mine:null, maxMB:8 });
      return rep({ ok:true, rows:[], gps:[], reminders:[], holidays:{}, mine:null });
    });
    await p.goto(base + '/manifest.webmanifest', { waitUntil:'domcontentloaded' });
    await p.evaluate(a => localStorage.setItem('sjf5', JSON.stringify(a)), store);
    await p.goto(base + '/index.html', { waitUntil:'domcontentloaded' });
    await p.waitForTimeout(2400);
    const card = await p.evaluate(() => {
      const c = document.getElementById('days'); if(!c) return null;
      const read = sel => [...c.querySelectorAll(sel)].map(b => ({ cls:b.className.replace(/\bd\b|\bnow\b|\bsm\b/g,'').trim(), say:b.dataset.say, num:b.querySelector('b').textContent }));
      return { text: c.innerText, tiles: read('.grid:not(.sm) .d'), pl: read('.grid.pl .d'), wx: read('.grid.wx .d'),
               now: (c.querySelector('.grid:not(.sm) .d.now') || {}).dataset ? c.querySelector('.grid:not(.sm) .d.now').dataset.say : '' };
    });
    const home = await p.evaluate(() => (document.getElementById('homeBody') || document.body).innerText);
    const wide = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    const order = await p.evaluate(() => [...document.querySelectorAll('#homeBody > *')].slice(0, 3).map(e => e.className.split(' ')[0]));
    if(shot){
      await p.evaluate(() => { const c = document.getElementById('days'); if(c) c.scrollIntoView({ block:'center' }); });
      await p.waitForTimeout(250);
      await p.screenshot({ path: path.join(OUTDIR, shot + '.png'), fullPage:false });
      const c = await p.$('#days');
      if(c) await c.screenshot({ path: path.join(OUTDIR, shot + '-card.png') });
    }
    return { p, ctx, errs, card, home, wide, order, asked: () => asked };
  }

  console.log('\n1. a field officer’s fortnight — the card, the states, the words');
  {
    const A = answer();
    const r = await open_({ ...BASE, att: markIn('9000000014') }, A, '1-fortnight');
    ck(!!r.card, 'the card is on the home screen');
    if(r.card){
      ck(r.card.tiles.length === 14, 'fourteen tiles', String(r.card.tiles.length));
      ck(r.order[0] === 'tcard' && r.order[1] === 'days', 'directly under the Today card', r.order.join(' > '));
      const by = {}; A.days.forEach((d, i) => { by[d.date] = r.card.tiles[i]; });
      ck(by[A._miss] && by[A._miss].cls === 'miss', 'the working day with no mark is drawn as not marked', JSON.stringify(by[A._miss]));
      ck(by[A._late] && by[A._late].cls === 'late', 'the late mark is drawn as late', JSON.stringify(by[A._late]));
      ck(!/never a miss|Sunday or holiday|Tap a day|read at/i.test(r.card.text), 'no legend and no note under the tiles — the card carries figures only', r.card.text.slice(-120));
      ck(by[A._leave] && by[A._leave].cls === 'lv', 'sanctioned leave is drawn as leave', JSON.stringify(by[A._leave]));
      ck(by[A._hol] && by[A._hol].cls === 'off' && /general holiday/i.test(by[A._hol].say), 'the holiday is off, by name', JSON.stringify(by[A._hol]));
      const sun = A.days.find(d => d.off === 'Sunday');
      ck(!sun || (by[sun.date] && by[sun.date].cls === 'off'), 'the Sunday is off');
      const td = r.card.tiles[13];
      ck(td.cls === 'ok', 'today, marked on this phone and received, is green', JSON.stringify(td));
      ck(/of \d+ working days marked/.test(r.card.text), 'the headline counts the working days', (r.card.text.match(/.*working days marked/) || [''])[0]);
      ck(/1 not marked/.test(r.card.text), 'and names the one day not marked', (r.card.text.match(/[^\n]*not marked[^\n]*/) || [''])[0]);
      /* the two rows under it (asked 17.10.2026) */
      ck(r.card.pl.length === 14, 'fourteen tiles of distance from the place of duty', String(r.card.pl.length));
      ck(/Distance from place of duty/i.test(r.card.text), 'labelled as such');
      const pl = {}; A.days.forEach((d, i) => { pl[d.date] = r.card.pl[i]; });
      ck(pl[A._far] && pl[A._far].cls === 'p2' && /7\.2 km from Konne/.test(pl[A._far].say), 'the mark 7 km out is amber and says so', JSON.stringify(pl[A._far]));
      ck(pl[A._late] && pl[A._late].cls === 'p0', 'a mark at the office is green', JSON.stringify(pl[A._late]));
      ck(pl[A._miss] && pl[A._miss].cls === 'pn', 'a day with no mark has no distance', JSON.stringify(pl[A._miss]));
      ck(r.card.wx.length === 14, 'fourteen tiles of temperature', String(r.card.wx.length));
      ck(/Temperature/i.test(r.card.text), 'labelled as such');
      ck(r.card.wx.every(t => /^\d+$/.test(t.num)), 'each carrying the day’s maximum, the unit on the label', JSON.stringify(r.card.wx.slice(0, 3)));
      ck(r.card.wx.some(t => /mm rain/.test(t.say)), 'and the rain where there was any');
      ck(!SANCTION.test(r.card.text), 'not one word of sanction on the card', (r.card.text.match(SANCTION) || ['clean'])[0]);
    }
    ck(!r.wide, 'no sideways scroll at 390px');
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');
    await r.ctx.close();
  }

  console.log('\n2. today not yet marked — outlined, never a miss (seen on the voluntary office, since the gate stands in front of everyone else’s unmarked morning)');
  {
    const A = answer({ exempt:true });
    const r = await open_({ ...BASE, att:{}, session:{ token:'T1', user: who('MSO', 'P. Sarala') } }, A, '2-today-open');
    ck(!!r.card, 'the card is drawn');
    if(r.card){
      const td = r.card.tiles[13];
      ck(td.cls === 'today', 'today is outlined, not red', JSON.stringify(td));
      ck(/not marked yet/.test(td.say), 'and says not marked YET', td.say);
    }
    await r.ctx.close();
  }

  console.log('\n3. a mark queued on a village road — held on this phone, never not marked');
  {
    const A = answer();
    const y = A._miss;                                   /* the district has nothing for that day… */
    const att = markIn('9000000014');
    att[y] = { id:'A0', date:y, ts:y + 'T09:20:00+05:30', lat:17.7, lng:79.1, acc:11, verified:true, status:'PRESENT', phone:'9000000014', sync:'queued' };
    const r = await open_({ ...BASE, att }, A, '3-held');
    ck(!!r.card, 'the card is drawn');
    if(r.card){
      const t = r.card.tiles[A.days.findIndex(d => d.date === y)];
      ck(t && t.cls === 'held', '…and the phone draws its own queued mark as held', JSON.stringify(t));
      const tp = r.card.pl[13];
      ck(tp && tp.cls === 'p0' && /0 km from Konne/.test(tp.say), 'and measures that queued mark against his place of duty off the phone’s own points', JSON.stringify(tp));
      ck(/held on this phone/.test(r.card.text), 'the line says so');
      ck(/1 held on this phone/.test(r.card.text) && !/\d+ not marked/.test(r.card.text), 'counted as held, not as a miss', (r.card.text.split('\n')[2] || ''));
    }
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');
    await r.ctx.close();
  }

  console.log('\n4. the voluntary office — marks drawn, nothing counted against the blanks');
  {
    const A = answer({ exempt:true });
    const r = await open_({ ...BASE, att: markIn('9000000014'), session:{ token:'T1', user: who('MSO', 'P. Sarala') } }, A, '4-voluntary');
    ck(!!r.card, 'the card is drawn');
    if(r.card){
      ck(!r.card.tiles.some(t => t.cls === 'miss'), 'no tile is red');
      ck(/voluntarily|not asked of your office/i.test(r.card.text), 'and the headline says it is voluntary', (r.card.text.split('\n')[1] || ''));
      ck(!/not marked\b/.test(r.card.text.replace(/not marked yet/g, '')), 'nothing is counted as not marked');
    }
    await r.ctx.close();
  }

  console.log('\n5. the district cannot answer — no card, no error');
  {
    const r = await open_({ ...BASE, att: markIn('9000000014') }, { ok:false, error:'This register does not answer "myDays".' }, null);
    ck(!r.card, 'the card is simply absent');
    ck(/Marked for today|Marking out/i.test(r.home), 'and the Today card stands as it always did');
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');
    await r.ctx.close();
  }

  console.log('\n6. the dark theme, for the record');
  {
    const r = await open_({ ...BASE, att: markIn('9000000014') }, answer(), '6-dark', true);
    ck(!!r.card, 'the card is drawn in the dark theme');
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');
    await r.ctx.close();
  }

  await br.close(); srv.close();
  console.log('\n' + pass + ' ok, ' + fail + ' failed · screenshots in ' + OUTDIR);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

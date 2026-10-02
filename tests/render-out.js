/* MARKING OUT, IN A REAL BROWSER, against app/.

   The server half is held by suite 30. None of what follows is server logic:
   it is the home-screen card, the store, and the screen the card opens, and a
   unit test of any one of the three passes while the officer holding the phone
   sees the fault. Three things here have each already gone wrong once in this
   app and are asserted rather than hoped for:

     · THE PHONE'S OWN RECEIPT BEATS THE DISTRICT'S ANSWER. A mark out still
       queued on a village road must not come back as unmarked and set the
       card asking him to do it again. That was reported twice about the
       advisory, in the officer's own words, and the second report was the
       first fix's fault;

     · THE SCREEN IS NOT A GATE. The mark in stands between sign-in and the
       app because marking it is the whole point of the morning. An officer
       who forgot to close his day must not be shut out of his own records all
       evening for it, so there is always a way back;

     · AND IT ACCUSES NOBODY. Not a word about a show-cause notice, casual
       leave, a debit or a default appears on the card, whatever state it is
       in. A reminder by mail the next morning is the whole of the
       consequence, by the Collector's direction, and an officer who reads
       "default" on a government register rings the mandal office.

   Usage: node tests/render-out.js
   Playwright is deliberately not a dependency: npm i playwright --no-save. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const APP = path.join(__dirname, '..', 'app');
const OUTDIR = path.join(__dirname, '..', 'Info', 'out-render');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png',
               '.webmanifest':'application/manifest+json' };

function serve(){
  return new Promise(res => {
    const srv = http.createServer((q, s) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      if(/\/config\.js$/.test(u)){
        s.writeHead(200, { 'Content-Type':'text/javascript' });
        /* the sanitation register: marking out is its alone */
        return s.end("window.SJGP_SERVER='https://mock.district/exec';window.SJGP_TENANT='';");
      }
      const f = path.join(APP, u === '/' ? 'index.html' : u);
      if(!fs.existsSync(f) || fs.statSync(f).isDirectory()){ s.writeHead(404); return s.end('no'); }
      s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(s);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

let pass = 0, fail = 0;
const ck = (ok, what, detail) => {
  if(ok){ pass++; console.log('  PASS  ' + what + (detail ? '   — ' + detail : '')); }
  else  { fail++; console.log('  FAIL  ' + what + (detail ? '   — ' + detail : '')); }
};

const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
};
/* a mark in made `agoMin` minutes ago, already with the district */
const markIn = agoMin => {
  const o = {}, ts = new Date(Date.now() - agoMin*60000).toISOString();
  o[today()] = { id:'A1', date:today(), ts:ts, lat:17.7, lng:79.1, acc:11,
                 verified:true, status:'PRESENT', phone:'9000000014', sync:'synced' };
  return o;
};
const BASE = { url:'https://mock.district/exec', cache:[], master:[], leave:[], prefs:{ sun:0, big:0 },
               who:'9000000014',
               session:{ token:'T1', user:{ name:'D. FirstMiss', role:'PS', phone:'9000000014',
                                            mandal:'Jangaon', gp:'Konne', gps:['Konne'] } } };

/* WORDS THAT MAY NOT APPEAR, in any state of the card. */
const SANCTION = /show.?cause|casual leave|debit|loss of pay|default|notice|disciplin|penalt/i;

(async () => {
  if(!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive:true });
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();

  /* The store is written from a page that is NOT index.html: the app builds an
     empty store on load and its own debounced save puts that straight back
     over anything written afterwards. */
  /* `failOut` KILLS THE LINE for the marking-out post alone. Without it the
     queued case cannot be tested at all: the page syncs on render, the mock
     answers ok, and the row is synced before the assertion reads it — which is
     the app behaving correctly and the test measuring nothing. */
  async function open_(store, outAnswer, shot, failOut){
    const ctx = await br.newContext({ viewport:{ width:390, height:844 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    const posted = [];
    await p.route('**/mock.district/**', r => {
      const q = r.request();
      const rep = o => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(o) });
      if(q.method() === 'POST'){
        let x = {}; try{ x = JSON.parse(q.postData() || '{}'); }catch(e){}
        posted.push(x);
        if(x.kind === 'attendanceOut'){
          if(failOut) return r.abort('failed');       /* a village road */
          return rep({ ok:true, outAt:(x.att||{}).ts });
        }
        return rep({ ok:true });
      }
      if(/op=out/.test(q.url())) return rep(outAnswer || { ok:false });
      if(/op=gpdp/.test(q.url())) return rep({ ok:true, year:'2026-27', due:false, mine:null, maxMB:8 });
      return rep({ ok:true, rows:[], gps:[], reminders:[], holidays:{}, mine:null });
    });
    await p.goto(base + '/manifest.webmanifest', { waitUntil:'domcontentloaded' });
    await p.evaluate(a => localStorage.setItem('sjf5', JSON.stringify(a)), store);
    await p.goto(base + '/index.html', { waitUntil:'domcontentloaded' });
    await p.waitForTimeout(2200);
    const home = await p.evaluate(() => {
      const b = document.getElementById('homeBody');
      return b ? b.innerText : document.body.innerText;
    });
    const wide = await p.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if(shot) await p.screenshot({ path: path.join(OUTDIR, shot + '.png'), fullPage:false });
    return { p, ctx, errs, home, wide, posted,
             store: () => p.evaluate(() => JSON.parse(localStorage.getItem('sjf5'))) };
  }

  /* the district's answer for a mark in made `agoMin` ago */
  const answer = (agoMin, over) => {
    const inAt = new Date(Date.now() - agoMin*60000);
    const from = new Date(inAt.getTime() + 450*60000);
    return Object.assign({ ok:true, date:today(), markedIn:true, inAt:inAt.toISOString(),
      markedOut:false, outAt:'', outFrom:from.toISOString(),
      canOut: Date.now() >= from.getTime(), why:'' }, over || {});
  };

  console.log('\n1. no mark in — there is nothing to close, and the card is not there');
  {
    const r = await open_({ ...BASE, att:{}, out:{} }, { ok:true, date:today(), markedIn:false,
      markedOut:false, canOut:false, why:'no mark in today' }, '1-no-mark-in');
    ck(!/mark(ing)? out/i.test(r.home), 'nothing about marking out is offered',
       (r.home.match(/.{0,30}mark.{0,20}out.{0,20}/i) || ['clean'])[0]);
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');
    await r.ctx.close();
  }

  console.log('\n2. marked in two hours ago — the hour is named and nothing is offered yet');
  {
    const r = await open_({ ...BASE, att:markIn(120), out:{} }, answer(120), '2-not-yet');
    ck(/Marking out opens at/i.test(r.home), 'the officer is told WHEN, not told to wait',
       (r.home.match(/Marking out opens at [^\n.]*/i) || [''])[0]);
    ck(!(await r.p.$('#outGo')), 'and there is no button to press');
    ck(!SANCTION.test(r.home), 'not one word of sanction on the screen',
       (r.home.match(SANCTION) || ['clean'])[0]);
    ck(!r.wide, 'no sideways scroll at 390px');
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');
    await r.ctx.close();
  }

  console.log('\n3. eight hours later — the button is there, and it opens the same screen the mark in uses');
  {
    const r = await open_({ ...BASE, att:markIn(480), out:{} }, answer(480), '3-open');
    ck(!!(await r.p.$('#outGo')), 'the button is offered');
    ck(/has been open since/i.test(r.home), 'and it says since when',
       (r.home.match(/open since [^\n.]*/i) || [''])[0]);
    ck(!SANCTION.test(r.home), 'still not a word of sanction',
       (r.home.match(SANCTION) || ['clean'])[0]);

    await r.p.click('#outGo');
    await r.p.waitForTimeout(700);
    const on = await r.p.evaluate(() => document.getElementById('attend').classList.contains('on'));
    const title = await r.p.$eval('#attTitle', e => e.textContent);
    const priv = await r.p.$eval('#attPriv', e => e.textContent);
    ck(on, 'the marking-out screen opens');
    ck(/Mark out for today/i.test(title), 'headed as marking out, not as attendance', title);
    ck(/press .?Mark out/i.test(priv), 'and says what IS recorded, in the same words as the mark in');
    ck(/no hours are worked out/i.test(priv),
       'AND THAT NO HOURS ARE WORKED OUT FROM IT — the gate is on the button, not a figure about a man');
    ck(!SANCTION.test(priv), 'the screen accuses nobody either',
       (priv.match(SANCTION) || ['clean'])[0]);
    await r.p.screenshot({ path: path.join(OUTDIR, '4-the-screen.png') });

    /* IT IS NOT A GATE: there is a way back, and it leads to the app */
    ck(!!(await r.p.$('#attOutBack')), 'there is a way back out of it');
    await r.p.click('#attOutBack');
    await r.p.waitForTimeout(600);
    const back = await r.p.evaluate(() => ({
      gone: !document.getElementById('attend').classList.contains('on'),
      app: !document.getElementById('app').hidden }));
    ck(back.gone && back.app, 'and it returns him to the app rather than holding him');
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');
    await r.ctx.close();
  }

  console.log('\n4. a mark out already made and already sent');
  {
    const o = {}; o[today()] = { id:'O1', date:today(), ts:new Date(Date.now() - 20*60000).toISOString(),
                                 lat:17.7, lng:79.1, acc:9, verified:true, sync:'synced' };
    const r = await open_({ ...BASE, att:markIn(480), out:o },
      answer(480, { markedOut:true, outAt:o[today()].ts }), '5-closed');
    ck(/Marked out at/i.test(r.home), 'the day reads as closed',
       (r.home.match(/Marked out at [^\n.]*/i) || [''])[0]);
    ck(!(await r.p.$('#outGo')), 'and he is not asked again');
    ck(!SANCTION.test(r.home), 'no sanction named', (r.home.match(SANCTION) || ['clean'])[0]);
    await r.ctx.close();
  }

  console.log('\n5. THE RECEIPT THE PHONE HOLDS BEATS THE DISTRICT — a mark out still queued');
  {
    const o = {}; o[today()] = { id:'O1', date:today(), ts:new Date(Date.now() - 20*60000).toISOString(),
                                 lat:17.7, lng:79.1, acc:9, verified:true, sync:'local' };
    /* the district has not got it yet and says so — the card must not believe it */
    const r = await open_({ ...BASE, att:markIn(480), out:o }, answer(480), '6-queued', true);
    ck(/Marked out at/i.test(r.home), 'his own mark stands on the screen',
       (r.home.match(/Marked out at [^\n.]*/i) || [''])[0]);
    ck(!(await r.p.$('#outGo')), 'AND HE IS NOT ASKED TO DO IT AGAIN — reported twice about the circular');
    ck(/has not reached the district/i.test(r.home),
       'but he is told plainly that the district does not have it yet');
    ck(!!(await r.p.$('#outPush')), 'with the button that sends it');
    ck(!SANCTION.test(r.home), 'and still no sanction', (r.home.match(SANCTION) || ['clean'])[0]);
    await r.ctx.close();
  }

  console.log('\n6. marked in at four in the afternoon — the hours cannot be served, and nothing is held against him');
  {
    const r = await open_({ ...BASE, att:markIn(60), out:{} },
      answer(60, { outFrom:'', canOut:false,
                   why:'seven and a half hours would run past the end of the day' }), '7-cannot-serve');
    ck(/not open today/i.test(r.home), 'the card says so plainly',
       (r.home.match(/[^\n]*not open today[^\n]*/i) || [''])[0]);
    ck(/Nothing is counted against you/i.test(r.home), 'AND THAT NOTHING IS COUNTED AGAINST HIM');
    ck(!(await r.p.$('#outGo')), 'and offers no button');
    ck(!SANCTION.test(r.home), 'no sanction named', (r.home.match(SANCTION) || ['clean'])[0]);
    await r.ctx.close();
  }

  console.log('\n7. the whole mark, pressed through: what goes to the district');
  {
    const r = await open_({ ...BASE, att:markIn(480), out:{} }, answer(480), null);
    await r.p.click('#outGo');
    await r.p.waitForTimeout(600);
    /* there is no camera in a headless browser, so the photograph is put in
       the app's own hands the way the camera would, and the mark is pressed */
    await r.p.evaluate(() => {
      ATT.fix = { lat:17.71, lng:79.11, acc:8 };
      ATT.b64 = 'eHh4';
      ATT.ts  = new Date().toISOString();
      drawAttendance();
    });
    await r.p.click('#attMark');
    await r.p.waitForTimeout(1200);
    const sent = r.posted.filter(x => x.kind === 'attendanceOut')[0];
    ck(!!sent, 'the district is sent a marking out');
    ck(!!sent && !!sent.att.ts, 'carrying the time the handset claims (ts, as the mark in does)');
    ck(!!sent && sent.att.lat === 17.71 && sent.att.acc === 8,
       'the coordinates and how precise they were');
    ck(!!sent && sent.att.verified === true, 'and whether that was trustworthy');
    ck(!!sent && !!sent.photo && !!sent.photo.b64, 'with the photograph');
    const d = await r.store();
    ck(!!(d.out || {})[today()], 'and it is written on the phone as well, so a lost line costs nothing');
    /* THE CARD, NOT THE WHOLE APP. The notices screen is headed 'Notices'
       and sits in the DOM at all times; scanning document.body therefore
       reported the app's own furniture as a sanction named by this feature. */
    const screen = await r.p.evaluate(() => {
      const b = document.getElementById('homeBody');
      return b ? b.innerText : '';
    });
    ck(!/attend/i.test(await r.p.evaluate(() => document.getElementById('attend').className)) ||
       !(await r.p.evaluate(() => document.getElementById('attend').classList.contains('on'))),
       'the screen closes itself afterwards');
    ck(!SANCTION.test(screen), 'and the home screen says nothing about any sanction',
       (screen.match(SANCTION) || ['clean'])[0]);
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');
    await r.p.screenshot({ path: path.join(OUTDIR, '8-after.png') });
    await r.ctx.close();
  }

  await br.close(); srv.close();
  console.log('\n  ' + pass + ' passed, ' + fail + ' failed   ·   screenshots in Info/out-render/\n');
  process.exitCode = fail ? 1 : 0;
})();

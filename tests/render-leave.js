/* LEAVE UNDER THE STANDING ORDER — what the officer and the Collector see.

   Ordered 17.10.2026, and in the afternoon: "let them feel it like the
   process before". The server half is suite 41. This drives the REAL field
   app at 390px against a mocked district and asserts that the screens are
   the screens they always were:
     1. an officer applies and is told "Sent to the Collector"; the row reads
        Pending; the form carries no explanatory line. A few minutes later
        the district's file shows it sanctioned under the Collector's name,
        with no remarks and not one word about a rule;
     2. an application the district keeps waiting reads as Pending and says
        nothing about why;
     3. the Collector opens a sanction and CANCELS it: the button is his and
        nobody else's, it refuses to go without remarks, the confirmation
        stands above the sheet, what went on the wire is CANCELLED with those
        remarks, and the row reads "Cancelled by the Collector", never
        "Withdrawn" — and the officer reads the same with the remarks.
   Screenshots go to Info/leave-render/. Usage: node tests/render-leave.js
   Playwright is deliberately not a dependency: npm i playwright --no-save. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const APP = path.join(__dirname, '..', 'app');
const OUTDIR = path.join(__dirname, '..', 'Info', 'leave-render');
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
const inDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return key(d); };
const HAND = 'Sandeep Kumar Jha (COLLECTOR)';
const RULEWORDS = /by rule|standing order|entitlement|set it aside|sanctioned here at once/i;

const markIn = phone => {
  const o = {}, d = today(), ts = new Date(Date.now() - 120*60000).toISOString();
  o[d] = { id:'A1', date:d, ts, lat:17.7, lng:79.1, acc:11, verified:true, status:'PRESENT', phone, sync:'synced' };
  return o;
};
const officer = { name:'K. Ramesh', role:'PS', phone:'9000000014', mandal:'Jangaon', gp:'Konne', gps:['Konne'] };
const collector = { name:'Sandeep Kumar Jha', role:'COLLECTOR', phone:'9000000001', mandal:'', gp:'', gps:[] };
const store = (u, extra) => Object.assign({ url:'https://mock.district/exec', cache:[], master:[], leave:[], prefs:{ sun:0, big:0 },
  who:u.phone, session:{ token:'T1', user:u }, out:{}, att: markIn(u.phone) }, extra || {});

(async () => {
  if(!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive:true });
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();

  /* THE DISTRICT, mocked and stateful: what is applied for is what op=leave
     answers afterwards, because refreshLeave replaces every synced row with
     the district's list and a planted row would otherwise vanish. */
  async function open_(st, district){
    const ctx = await br.newContext({ viewport:{ width:390, height:844 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    const wire = [];
    await p.route('**/mock.district/**', r => {
      const q = r.request();
      const rep = o => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(o) });
      if(q.method() === 'POST'){
        let x = {}; try{ x = JSON.parse(q.postData() || '{}'); }catch(e){}
        wire.push(x);
        if(x.kind === 'leave') return rep(district.onLeave(x));
        if(x.kind === 'leaveDecision') return rep(district.onDecision(x));
        return rep({ ok:true });
      }
      if(/op=leave\b/.test(q.url())) return rep({ ok:true, rows: district.rows });
      if(/op=myDays/.test(q.url())) return rep({ ok:false, error:'not here' });
      if(/op=out/.test(q.url())) return rep({ ok:true, date:today(), markedIn:true, markedOut:false, outFrom:'', canOut:false, why:'' });
      if(/op=gpdp/.test(q.url())) return rep({ ok:true, year:'2026-27', due:false, mine:null, maxMB:8 });
      return rep({ ok:true, rows:[], gps:[], reminders:[], holidays:{}, mine:null });
    });
    await p.goto(base + '/manifest.webmanifest', { waitUntil:'domcontentloaded' });
    await p.evaluate(a => localStorage.setItem('sjf5', JSON.stringify(a)), st);
    await p.goto(base + '/index.html', { waitUntil:'domcontentloaded' });
    await p.waitForTimeout(1200);
    await p.evaluate(() => openLeave());
    await p.waitForTimeout(600);
    return { p, ctx, errs, wire };
  }
  const shot = (p, n) => p.screenshot({ path: path.join(OUTDIR, n + '.png'), fullPage:false });
  const text = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText : ''; }, sel);
  const wide = p => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  const refresh = p => p.evaluate(() => refreshLeave()).then(() => p.waitForTimeout(400));

  /* a district that takes the application and holds it; `pass` later turns
     it into the Collector's sanction, as the standing order does */
  const district = () => {
    const d = { rows:[] };
    d.onLeave = x => {
      const l = x.leave;
      d.rows.unshift({ id:l.id, appliedAt:l.appliedAt, phone:officer.phone, name:officer.name, role:officer.role, mandal:officer.mandal,
        type:l.type, from:l.from, to:l.to, days:l.days, reason:l.reason, address:l.address || '', hq:!!l.hq, cert:l.cert || '',
        status:'PENDING', decidedBy:'', decidedAt:'', remarks:'' });
      return { ok:true, id:l.id, status:'PENDING' };
    };
    d.pass = id => { const r = d.rows.find(l => l.id === id); if(r){ r.status = 'APPROVED'; r.decidedBy = HAND; r.decidedAt = new Date().toISOString(); r.remarks = ''; } };
    d.onDecision = () => ({ ok:false, error:'not expected here' });
    return d;
  };

  console.log('\n1. an officer applies — "Sent to the Collector", Pending, then Sanctioned under his name');
  {
    const D = district();
    const r = await open_(store(officer), D), p = r.p;
    const empty = await text(p, '#lvBody');
    ck(/No application yet/.test(empty), 'the empty screen says only that there is no application');
    ck(!/goes to the Collector|sanctioned/i.test(empty), 'and explains nothing', empty.slice(0, 200));
    ck(!/On a certificate|Nothing is deducted/.test(empty), 'the leave account names the kinds and describes none of them');
    await p.click('#lvNew'); await p.waitForTimeout(300);
    const form = await text(p, '#sheetBody');
    ck(/Apply for leave/.test(form) && !/goes to the Collector|You will see the orders|Tick if you/.test(form), 'the form has its heading and no explanatory line on it', form.slice(0, 120));
    ck((await text(p, '#lvSend')) === 'Send to the Collector', 'the button says "Send to the Collector"', await text(p, '#lvSend'));
    await p.fill('#lvReason', 'Family function');
    await p.evaluate(() => { const e = document.querySelector('#lvFrom'); if(e) e.dispatchEvent(new Event('change')); });
    await p.waitForTimeout(200);
    ck(/1 day/.test(await text(p, '#sheetBody')), 'the form counts the days he has picked');
    await shot(p, '0-the-apply-form');
    await p.click('#lvSend'); await p.waitForTimeout(900);
    const toast = await text(p, '#toast');
    ck(toast === 'Sent to the Collector', 'the toast says "Sent to the Collector" and nothing more', toast);
    ck(D.rows.length === 1, 'one application reached the district');
    ck(r.wire.filter(x => x.kind === 'leave').length === 1, 'sent once');
    let body = await text(p, '#lvBody');
    ck(/Pending/.test(body) && !/Sanctioned/.test(body), 'the row reads Pending', body.slice(0, 200));
    await shot(p, '1-sent-to-the-collector');
    /* five minutes on, the district's file shows the order */
    D.pass(D.rows[0].id);
    await refresh(p);
    body = await text(p, '#lvBody');
    ck(/Sanctioned/.test(body) && !/Pending/.test(body), 'after the district passes it the row reads Sanctioned', body.slice(0, 200));
    ck(!RULEWORDS.test(body), 'with no word of a rule', (body.match(RULEWORDS) || [''])[0]);
    await shot(p, '1b-sanctioned');
    await p.click('#lvBody [data-lv]'); await p.waitForTimeout(300);
    const sheet = await text(p, '#sheetBody');
    ck(new RegExp('Orders by\\s*' + HAND.replace(/[()]/g, '\\$&')).test(sheet.replace(/\n/g, ' ')), 'the application names the Collector as the hand', sheet.slice(0, 300));
    ck(!/Remarks/.test(sheet), 'and carries no remarks');
    ck(!RULEWORDS.test(sheet), 'and no word of a rule', (sheet.match(RULEWORDS) || [''])[0]);
    ck(!(await p.$('#lvAside')) && !(await p.$('#lvOk')), 'the officer has no button to cancel or sanction');
    await shot(p, '1c-the-application');
    ck(!(await wide(p)), 'no sideways scroll');
    ck(r.errs.length === 0, 'no script error', r.errs.join(' | '));
    await r.ctx.close();
  }

  console.log('\n2. an application the district keeps waiting — Pending, and nothing said about why');
  {
    const D = district();
    const r = await open_(store(officer), D), p = r.p;
    await p.click('#lvNew'); await p.waitForTimeout(300);
    await p.fill('#lvReason', 'Personal');
    await p.click('#lvSend'); await p.waitForTimeout(900);
    ck((await text(p, '#toast')) === 'Sent to the Collector', 'the same toast', await text(p, '#toast'));
    await refresh(p);
    const body = await text(p, '#lvBody');
    ck(/Pending/.test(body) && !/Sanctioned/.test(body), 'the row reads Pending after a refresh too', body.slice(0, 200));
    ck(!/exceed|held|With the Collector/i.test(body), 'and gives no reason');
    await p.click('#lvBody [data-lv]'); await p.waitForTimeout(300);
    const sheet = await text(p, '#sheetBody');
    ck(/Withdraw the application/.test(sheet) && !/lvnote|only the Collector|given back whole/i.test(sheet), 'he may withdraw it, with no paragraph explaining withdrawal', sheet.slice(-200));
    await shot(p, '2-waiting');
    ck(r.errs.length === 0, 'no script error', r.errs.join(' | '));
    await r.ctx.close();
  }

  console.log('\n3. the Collector cancels a sanction');
  {
    const D = district();
    const when = new Date(Date.now() - 3600000).toISOString();
    D.rows = [{ id:'LVr1', appliedAt:when, phone:officer.phone, name:officer.name, role:officer.role, mandal:officer.mandal,
      type:'CL', from:inDays(3), to:inDays(4), days:2, reason:'Family function', address:'', hq:false, cert:'',
      status:'APPROVED', decidedBy:HAND, decidedAt:when, remarks:'' }];
    D.onDecision = x => {
      const row = D.rows.find(l => l.id === x.id);
      if(x.status !== 'CANCELLED' || !String(x.remarks || '').trim()) return { ok:false, error:'Remarks are required.' };
      row.status = 'CANCELLED'; row.decidedBy = HAND + ' · cancelled'; row.decidedAt = new Date().toISOString();
      row.remarks = 'Cancelled by the Collector: ' + x.remarks;
      return { ok:true, id:x.id, status:'CANCELLED', decidedBy:row.decidedBy, decidedAt:row.decidedAt };
    };
    const r = await open_(store(collector), D), p = r.p;
    await p.click('#lvBody [data-lvf="APPROVED"]'); await p.waitForTimeout(300);
    const list = await text(p, '#lvBody');
    ck(/K\. Ramesh/.test(list) && /Sanctioned/.test(list), 'under Sanctioned he reads the officer and the status', list.slice(0, 240));
    await p.click('#lvBody [data-lv="LVr1"]'); await p.waitForTimeout(300);
    ck(!!(await p.$('#lvAside')), 'the Collector has the button to cancel it');
    ck((await text(p, '#lvAside')) === 'Cancel this sanction', 'in those words', await text(p, '#lvAside'));
    ck(!(await p.$('#lvOk')), 'and no button to sanction what is sanctioned');
    const note = await text(p, '#sheetBody');
    ck(!/whole spell|apportioned/.test(note), 'and no paragraph under it', note.slice(-200));
    await shot(p, '3-the-collector-opens-it');
    /* no words, no order */
    await p.click('#lvAside'); await p.waitForTimeout(300);
    ck(/Remarks are required/.test(await text(p, '#toast')), 'without remarks it refuses to go', await text(p, '#toast'));
    ck(r.wire.filter(x => x.kind === 'leaveDecision').length === 0, 'and nothing went on the wire');
    /* with words, a confirmation first — ABOVE the sheet, where it can be pressed */
    await p.fill('#lvRem', 'Required at the review on the 19th.');
    await p.click('#lvAside'); await p.waitForTimeout(300);
    const yes = await p.$('#cfYes');
    ck(!!yes, 'a confirmation is asked');
    const conf = await text(p, '#sheetBody');
    ck(/Cancel this sanction\?/.test(conf) && /K\. Ramesh/.test(conf) && !/&amp;|&#/.test(conf), 'naming the officer, with nothing double-escaped', conf.slice(0, 200));
    await shot(p, '3b-confirm');
    await yes.click(); await p.waitForTimeout(900);
    const sent = r.wire.filter(x => x.kind === 'leaveDecision');
    ck(sent.length === 1, 'one order went on the wire');
    ck(sent[0] && sent[0].status === 'CANCELLED' && sent[0].id === 'LVr1', 'CANCELLED, by id', JSON.stringify(sent[0] || {}));
    ck(sent[0] && /Required at the review/.test(sent[0].remarks), 'carrying his remarks');
    ck(/Cancelled/.test(await text(p, '#toast')), 'the toast says cancelled, not withdrawn', await text(p, '#toast'));
    await p.click('#lvBody [data-lvf="ALL"]'); await p.waitForTimeout(300);
    const all = await text(p, '#lvBody');
    ck(/Cancelled by the Collector/.test(all), 'under All it reads "Cancelled by the Collector"', all.slice(0, 240));
    ck(!/Withdrawn/.test(all), 'never as withdrawn');
    await shot(p, '3c-cancelled');
    ck(!(await wide(p)), 'no sideways scroll');
    ck(r.errs.length === 0, 'no script error', r.errs.join(' | '));
    await r.ctx.close();

    /* and the officer, afterwards: the same district, his own phone */
    console.log('\n3d. the officer reads the cancellation');
    const o = await open_(store(officer), D), q = o.p;
    const mine = await text(q, '#lvBody');
    ck(/Cancelled by the Collector/.test(mine), 'his list reads "Cancelled by the Collector"', mine.slice(0, 300));
    await q.click('#lvBody [data-lv="LVr1"]'); await q.waitForTimeout(300);
    const sh = await text(q, '#sheetBody');
    ck(/Required at the review/.test(sh), 'and the application carries the Collector’s remarks', sh.slice(-300));
    ck(!(await q.$('#lvWithdraw')), 'nothing left for him to withdraw');
    ck(!RULEWORDS.test(sh), 'and no word of a rule', (sh.match(RULEWORDS) || [''])[0]);
    await shot(q, '3d-the-officer-reads-it');
    ck(o.errs.length === 0, 'no script error', o.errs.join(' | '));
    await o.ctx.close();
  }

  await br.close(); srv.close();
  console.log('\n  ' + pass + ' passed, ' + fail + ' failed   ·   screenshots in Info/leave-render/\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

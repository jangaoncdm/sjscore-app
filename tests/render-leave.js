/* LEAVE SANCTIONED BY RULE — what the officer and the Collector see.

   Ordered 17.10.2026. The server half is suite 41. This drives the REAL field
   app at 390px against a mocked district and asserts the three screens the
   order touches:
     1. an officer applies for leave within the rules and is told on the spot
        that it is sanctioned by rule — the toast, the pill on the row, and
        the hand named on the application;
     2. an application the district HELD for the Collector says why, and
        reads as pending, never as sanctioned;
     3. the Collector opens a sanction passed by rule and SETS IT ASIDE: the
        button is there for him and for nobody else, it refuses to go without
        his reasons, the confirmation stands above the sheet, and what went on
        the wire is CANCELLED with those remarks — then the row reads as set
        aside, not as withdrawn.
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
const RULE_BY = 'By rule · within entitlement';

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

  /* a district that passes the order by rule on everything within the rules */
  const byRule = () => {
    const d = { rows:[] };
    d.onLeave = x => {
      const l = x.leave, when = new Date().toISOString();
      const row = { id:l.id, appliedAt:l.appliedAt, phone:officer.phone, name:officer.name, role:officer.role, mandal:officer.mandal,
        type:l.type, from:l.from, to:l.to, days:l.days, reason:l.reason, address:l.address || '', hq:!!l.hq, cert:l.cert || '',
        status:'APPROVED', decidedBy:RULE_BY, decidedAt:when,
        remarks:'Sanctioned by rule, within entitlement: CL ' + l.days + ' of 6 for 2026 after this spell. The Collector may set it aside.' };
      d.rows.unshift(row);
      return { ok:true, id:l.id, status:'APPROVED', auto:true, decidedBy:RULE_BY, decidedAt:when, remarks:row.remarks };
    };
    d.onDecision = () => ({ ok:false, error:'not expected here' });
    return d;
  };

  console.log('\n1. an officer applies within the rules — sanctioned by rule, on the spot');
  {
    const D = byRule();
    const r = await open_(store(officer), D), p = r.p;
    ck(/Leave within the rules, beginning today or later, is sanctioned here at once/.test(await text(p, '#lvBody')),
       'the empty screen tells him the rule');
    await p.click('#lvNew'); await p.waitForTimeout(300);
    ck((await text(p, '#lvSend')) === 'Send the application', 'the button no longer says "Send to the Collector"', await text(p, '#lvSend'));
    await p.fill('#lvReason', 'Family function');
    await p.click('#lvSend'); await p.waitForTimeout(900);
    const toast = await text(p, '#toast');
    ck(/Sanctioned by rule/.test(toast), 'the toast says it is sanctioned by rule', toast);
    ck(/set it aside/.test(toast), 'and that the Collector sees it and may set it aside', toast);
    ck(D.rows.length === 1, 'one application reached the district');
    ck(r.wire.filter(x => x.kind === 'leave').length === 1, 'sent once');
    const body = await text(p, '#lvBody');
    ck(/Sanctioned by rule/.test(body), 'the row carries the pill "Sanctioned by rule"', body.slice(0, 200));
    ck(!/Pending/.test(body), 'and nothing on it reads as pending');
    await shot(p, '1-sanctioned-by-rule');
    await p.click('#lvBody [data-lv]'); await p.waitForTimeout(300);
    const sheet = await text(p, '#sheetBody');
    ck(/Orders by\s*By rule/.test(sheet.replace(/\n/g, ' ')), 'the application names the rule as the hand', sheet.slice(0, 300));
    ck(/CL 1 of 6 for 2026/.test(sheet), 'and carries the arithmetic that passed it');
    ck(!(await p.$('#lvAside')), 'the officer has no button to set a sanction aside');
    ck(!(await p.$('#lvOk')), 'nor to sanction');
    await shot(p, '1b-the-application');
    ck(!(await wide(p)), 'no sideways scroll');
    ck(r.errs.length === 0, 'no script error', r.errs.join(' | '));
    await r.ctx.close();
  }

  console.log('\n2. an application the district held for the Collector');
  {
    const D = byRule();
    D.onLeave = x => {
      const l = x.leave;
      D.rows.unshift({ id:l.id, appliedAt:l.appliedAt, phone:officer.phone, name:officer.name, role:officer.role, mandal:officer.mandal,
        type:l.type, from:l.from, to:l.to, days:l.days, reason:l.reason, status:'PENDING', decidedBy:'', decidedAt:'', remarks:'' });
      return { ok:true, id:l.id, status:'PENDING', held:'That would exceed the year’s CL: 6 for 2026, 6 already sanctioned, 1 now sought.' };
    };
    const r = await open_(store(officer), D), p = r.p;
    await p.click('#lvNew'); await p.waitForTimeout(300);
    await p.fill('#lvReason', 'Personal');
    await p.click('#lvSend'); await p.waitForTimeout(900);
    const toast = await text(p, '#toast');
    ck(/With the Collector for orders/.test(toast), 'the toast says it is with the Collector', toast);
    ck(/exceed/.test(toast), 'and why', toast);
    const body = await text(p, '#lvBody');
    ck(/Pending/.test(body) && !/Sanctioned/.test(body), 'the row reads as pending and never as sanctioned', body.slice(0, 200));
    await shot(p, '2-held-for-the-collector');
    ck(r.errs.length === 0, 'no script error', r.errs.join(' | '));
    await r.ctx.close();
  }

  console.log('\n3. the Collector sets a sanction passed by rule aside');
  {
    const D = byRule();
    const when = new Date(Date.now() - 3600000).toISOString();
    D.rows = [{ id:'LVr1', appliedAt:when, phone:officer.phone, name:officer.name, role:officer.role, mandal:officer.mandal,
      type:'CL', from:inDays(3), to:inDays(4), days:2, reason:'Family function', address:'', hq:false, cert:'',
      status:'APPROVED', decidedBy:RULE_BY, decidedAt:when,
      remarks:'Sanctioned by rule, within entitlement: CL 2 of 6 for 2026 after this spell. The Collector may set it aside.' }];
    D.onDecision = x => {
      const row = D.rows.find(l => l.id === x.id);
      if(x.status !== 'CANCELLED' || !String(x.remarks || '').trim()) return { ok:false, error:'Say why it is set aside.' };
      row.status = 'CANCELLED'; row.decidedBy = 'Sandeep Kumar Jha (COLLECTOR) · set aside'; row.decidedAt = new Date().toISOString();
      row.remarks = 'Set aside by the Collector: ' + x.remarks;
      return { ok:true, id:x.id, status:'CANCELLED', decidedBy:row.decidedBy, decidedAt:row.decidedAt };
    };
    const r = await open_(store(collector), D), p = r.p;
    await p.click('#lvBody [data-lvf="APPROVED"]'); await p.waitForTimeout(300);
    const list = await text(p, '#lvBody');
    ck(/K\. Ramesh/.test(list) && /Sanctioned by rule/.test(list), 'under Sanctioned he reads the officer and the hand', list.slice(0, 240));
    await p.click('#lvBody [data-lv="LVr1"]'); await p.waitForTimeout(300);
    ck(!!(await p.$('#lvAside')), 'the Collector has the button to set it aside');
    ck(!(await p.$('#lvOk')), 'and no button to sanction what is sanctioned');
    const note = await text(p, '#sheetBody');
    ck(/whole spell returns/.test(note), 'the sheet says the whole spell returns', note.slice(-300));
    ck(/apportioned by your office/.test(note), 'and that a spell partly availed is for his office, not this screen');
    await shot(p, '3-the-collector-opens-it');
    /* no words, no order */
    await p.click('#lvAside'); await p.waitForTimeout(300);
    ck(/Say why/.test(await text(p, '#toast')), 'without remarks it refuses to go', await text(p, '#toast'));
    ck(r.wire.filter(x => x.kind === 'leaveDecision').length === 0, 'and nothing went on the wire');
    ck(!!(await p.$('#lvAside')), 'the sheet is still open');
    /* with words, a confirmation first — ABOVE the sheet, where it can be pressed */
    await p.fill('#lvRem', 'Required at the review on the 19th.');
    await p.click('#lvAside'); await p.waitForTimeout(300);
    const yes = await p.$('#cfYes');
    ck(!!yes, 'a confirmation is asked');
    const conf = await text(p, '#sheetBody');
    ck(/Set this sanction aside\?/.test(conf) && /K\. Ramesh/.test(conf) && !/&amp;|&#/.test(conf), 'naming the officer, with nothing double-escaped', conf.slice(0, 200));
    await shot(p, '3b-confirm');
    await yes.click(); await p.waitForTimeout(900);
    const sent = r.wire.filter(x => x.kind === 'leaveDecision');
    ck(sent.length === 1, 'one order went on the wire');
    ck(sent[0] && sent[0].status === 'CANCELLED' && sent[0].id === 'LVr1', 'CANCELLED, by id', JSON.stringify(sent[0] || {}));
    ck(sent[0] && /Required at the review/.test(sent[0].remarks), 'carrying his remarks');
    ck(/Set aside/.test(await text(p, '#toast')), 'the toast says set aside, not withdrawn', await text(p, '#toast'));
    ck(!/K\. Ramesh/.test(await text(p, '#lvBody')), 'the row leaves Sanctioned');
    await p.click('#lvBody [data-lvf="ALL"]'); await p.waitForTimeout(300);
    const all = await text(p, '#lvBody');
    ck(/Set aside by the Collector/.test(all), 'and under All it reads "Set aside by the Collector"', all.slice(0, 240));
    ck(!/Withdrawn/.test(all), 'never as withdrawn');
    await shot(p, '3c-set-aside');
    ck(!(await wide(p)), 'no sideways scroll');
    ck(r.errs.length === 0, 'no script error', r.errs.join(' | '));
    await r.ctx.close();
  }

  await br.close(); srv.close();
  console.log('\n  ' + pass + ' passed, ' + fail + ' failed   ·   screenshots in Info/leave-render/\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

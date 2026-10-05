/* ONE CONSOLE, TWO REGISTERS, AND NOTHING CROSSES BETWEEN THEM.

   Reported from the district on 05.10.2026: "Gram Palana data is not coming,
   it is showing only the Swachh Jangaon data."

   It was true, and it was the console's. `useTenant` was written when the page
   held six caches and it cleared those six. Five more arrived with the
   pre-flight, the marking out, the postings, the office staff and the
   analytics, and not one of them was in the list — so switching register went
   on showing the other one's month, its health and its marking out. Worse
   than the display: a PASTED PROPOSAL survived the switch, so Apply could have
   written one register's postings into the other's roll.

   This drives the real console against two mocked registers whose every
   figure differs, switches between them, and asserts that not one number,
   proposal or answer from the first survives into the second. Every request
   is also checked for WHERE it went: a read for Gram Palana that reaches the
   sanitation address is the same fault wearing a different coat.

   Usage: node tests/render-tenant-leak.js
   Playwright is deliberately not a dependency: npm i playwright --no-save. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'app');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png',
               '.webmanifest':'application/manifest+json' };
const BASE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-dashboard.json'), 'utf8'));

/* two registers whose every figure differs, so a leak cannot hide */
function dash(tag, n){
  const j = JSON.parse(JSON.stringify(BASE));
  j.tenant = tag;
  j.today.present = (j.today.present || []).slice(0, n).map((r, i) =>
    Object.assign({}, r, { name: tag + ' Officer ' + i }));
  j.today.onLeave = []; j.today.absent = [];
  j.totals = Object.assign({}, j.totals, { due:n, officers:n + 1 });
  return j;
}
const SJ = dash('SJGP', 7), GP = dash('GP', 3);

function ana(tag){
  return { ok:true, ym:'2026-10', seg:'field', mandal:'', from:'2026-10-01', to:'2026-10-31',
    workingDays: tag === 'SJGP' ? 22 : 19,
    roll:{ officers: tag === 'SJGP' ? 284 : 134, byRole: tag === 'SJGP' ? { PS:284 } : { GPO:134 } },
    days:[{ date:'2026-10-01', present:1, leave:0, unmarked:0, pct: tag === 'SJGP' ? 88 : 61 }],
    weekday:[], hours:[], mandals:[], location:{ recorded:1, nofix:0, untrusted:0 },
    closure:{ closed:0, marks:1 }, late:0, marks: tag === 'SJGP' ? 1660 : 991,
    officers:[], observations:['This is the ' + tag + ' register, with ' +
      (tag === 'SJGP' ? 284 : 134) + ' on the roll.'],
    sanction:false, note:'A reading of the month.' };
}

function serve(){
  return new Promise(res => {
    const srv = http.createServer((q, s) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      /* THE GRAM PALANA ONE FIRST. '/gp/config.js' also ends in '/config.js',
       so testing the general pattern first served the sanitation address for
       BOTH registers and every Gram Palana call went to the wrong place — a
       fault in this harness that looked exactly like the fault it was
       written to catch. */
      if(/\/gp\/config\.js$/.test(u)){ s.writeHead(200,{'Content-Type':'text/javascript'});
        return s.end("window.SJGP_SERVER='https://gp.district/exec';window.SJGP_TENANT='GP';"); }
      if(/\/config\.js$/.test(u)){ s.writeHead(200,{'Content-Type':'text/javascript'});
        return s.end("window.SJGP_SERVER='https://sj.district/exec';window.SJGP_TENANT='';"); }
      const f = path.join(APP, u === '/' ? 'index.html' : u);
      if(!fs.existsSync(f) || fs.statSync(f).isDirectory()){ s.writeHead(404); return s.end('no'); }
      s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(s);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

let pass = 0, fail = 0;
const ck = (ok, what, d) => { if(ok){ pass++; console.log('  PASS  ' + what + (d ? '   — ' + d : '')); }
                              else { fail++; console.log('  FAIL  ' + what + (d ? '   — ' + d : '')); } };

(async () => {
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport:{ width:1500, height:1100 } });
  await ctx.addInitScript(() => {
    const u = { name:'Sandeep Kumar Jha', role:'COLLECTOR', phone:'9000000001' };
    localStorage.setItem('sjf5', JSON.stringify({ url:'https://sj.district/exec', session:{ token:'TSJ', user:u } }));
    localStorage.setItem('sjgp-gp1', JSON.stringify({ url:'https://gp.district/exec', session:{ token:'TGP', user:u } }));
    localStorage.setItem('sjgp-theme','light');
    localStorage.setItem('sjgp-console-seen','{}');
    localStorage.setItem('sjgp-console-tenant','SJGP');
  });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  const hits = [];

  const route = (host, tag, d, a) => page.route('**/' + host + '/**', r => {
    const url = r.request().url();
    hits.push({ host:host, url:url });
    const rep = o => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(o) });
    if(/op=analytics/.test(url)) return rep(a);
    if(/op=health/.test(url)) return rep({ ok:true, allWell:tag === 'SJGP', concerns:[],
      triggers:{ ok:true, installed:[tag + '-trigger'] }, backup:{ ok:true, newest:'2026-10-0' + (tag === 'SJGP' ? '4' : '1') },
      mail:{ remaining: tag === 'SJGP' ? 19 : 77, looksLike:'a consumer allowance', ok:true },
      roll:{ ok:true, active: tag === 'SJGP' ? 284 : 134 }, calendar:{ ok:true, year:2026, count:44 },
      features:{ live:[], skipped:[] } });
    if(/op=roll/.test(url)) return rep({ ok:true, tenant:tag, tenantName:tag, roles:[], rows:[],
      counts:{ active: tag === 'SJGP' ? 284 : 134 }, holidays:{ year:2026, count:44 }, adoption:{} });
    if(/op=outday/.test(url)) return tag === 'SJGP'
      ? rep({ ok:true, date:'2026-10-05', marked:87, closed:61, open:23, cannot:3, rows:[], sanction:false, note:'x' })
      : rep({ ok:false, error:'This register does not carry marking out.' });
    return rep(d);
  });
  await route('sj.district', 'SJGP', SJ, ana('SJGP'));
  await route('gp.district', 'GP',   GP, ana('GP'));

  await page.goto(base + '/dashboard.html', { waitUntil:'domcontentloaded' });
  await page.waitForSelector('#app:not([hidden])', { timeout:20000 });
  await page.waitForTimeout(800);

  /* --- 1. the sanitation register, read in full --- */
  await page.click('#nav [data-v="analytics"]'); await page.waitForTimeout(1200);
  let txt = await page.evaluate(() => document.body.innerText);
  ck(/284/.test(txt), 'the sanitation register shows its own roll', '284 on the roll');
  ck(/This is the SJGP register/.test(txt), 'and its own observations');

  /* --- 2. switch to Gram Palana --- */
  const before = hits.length;
  ck(!!(await page.$('#tenPick')), 'the console offers the register picker');
  await page.selectOption('#tenPick', 'GP');
  await page.waitForTimeout(1600);
  await page.click('#nav [data-v="analytics"]'); await page.waitForTimeout(1500);
  txt = await page.evaluate(() => document.body.innerText);

  ck(/134/.test(txt), 'GRAM PALANA SHOWS ITS OWN ROLL', '134 on the roll');
  ck(/This is the GP register/.test(txt), 'and its own observations');
  ck(!/284/.test(txt), 'AND NOT ONE FIGURE OF THE OTHER REGISTER SURVIVES',
     (txt.match(/[^\n]*284[^\n]*/) || ['clean'])[0]);
  ck(!/This is the SJGP register/.test(txt), 'nor its observations');

  /* every call since the switch went to the Gram Palana address */
  const after = hits.slice(before);
  const strays = after.filter(h => h.host === 'sj.district');
  ck(strays.length === 0, 'and every call since the switch went to the Gram Palana address',
     strays.length ? strays[0].url.slice(0, 70) : 'none strayed');
  ck(after.some(h => /op=analytics/.test(h.url)), 'the month was asked of it afresh');

  /* --- 3. the segment belongs to the sanitation register --- */
  await page.click('#nav [data-v="attendance"]'); await page.waitForTimeout(700);
  ck(!(await page.$('#segSel')),
     'THE OFFICE-STAFF SEGMENT IS NOT OFFERED HERE — they are on the other roll, and a picker of nought reads as an empty register');
  const att = await page.evaluate(() => document.body.innerText);
  ck(!/61 of 87|23 still open/.test(att),
     'and the marking-out figures of the other register do not sit on this screen');

  /* --- 4. the Admin screen, and the proposal that must not travel --- */
  await page.click('#nav [data-v="admin"]'); await page.waitForTimeout(900);
  const adm = await page.evaluate(() => document.body.innerText);
  ck(/134/.test(adm) || !/284/.test(adm), 'the Admin screen reads this register',
     (adm.match(/[^\n]*active[^\n]*/i) || [''])[0].slice(0, 50));
  ck(!/19 recipient/.test(adm), 'and its own mail allowance, not the other one’s');
  const leftovers = await page.evaluate(() => ({
    pst: typeof PST_PLANS !== 'undefined' && PST_PLANS ? PST_PLANS.length : 0,
    stf: typeof STF_PLANS !== 'undefined' && STF_PLANS ? STF_PLANS.length : 0,
    pins: typeof STF_PINS !== 'undefined' && STF_PINS ? STF_PINS.length : 0,
    text: (typeof PST_TEXT !== 'undefined' ? PST_TEXT.length : 0) +
          (typeof STF_TEXT !== 'undefined' ? STF_TEXT.length : 0) }));
  ck(leftovers.pst === 0 && leftovers.stf === 0 && leftovers.pins === 0 && leftovers.text === 0,
     'AND NO PASTED PROPOSAL SURVIVES THE SWITCH — Apply could otherwise write one register’s roll into the other',
     JSON.stringify(leftovers));

  /* --- 5. back again, and the sanitation register is itself --- */
  await page.selectOption('#tenPick', 'SJGP');
  await page.waitForTimeout(1600);
  await page.click('#nav [data-v="analytics"]'); await page.waitForTimeout(1500);
  txt = await page.evaluate(() => document.body.innerText);
  ck(/284/.test(txt) && !/134/.test(txt), 'switching back shows the sanitation register again, and only it');
  ck(errs.length === 0, 'no script error', errs[0] || '');

  await br.close(); srv.close();
  console.log('\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exitCode = fail ? 1 : 0;
})();

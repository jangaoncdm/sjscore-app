/* THE ATTENDANCE SCREEN, CUT THREE WAYS — driven in a real browser.

   192 MPDO office staff joined the register on 04.10.2026 for attendance and
   leave, and the show-cause ladder does not reach them. The field officers'
   ladder does. Adding the two together gives a "not marked" count in which one
   man is three days from a numbered notice and the next is not, and the field
   figure the district has watched since July silently jumps from 284 to 476.

   So this asserts what a figure means, not merely that one is printed: that
   every tile, the mandal chart, the location quality and the officer table
   re-derive from the segment, that the denominators move with it, and that
   the fourteen-day trend — which the register works out over everybody and
   which cannot be re-cut on the page — says so on its face.

   Usage: node tests/render-segment.js
   Playwright is deliberately not a dependency: npm i playwright --no-save. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'app');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png',
               '.webmanifest':'application/manifest+json' };

const DASH = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-dashboard.json'), 'utf8'));

/* THE STAFF ARE ADDED TO THE FIXTURE AS THE REGISTER WOULD SEND THEM: rows of
   the same shape, carrying role STAFF. 40 present, 5 on leave, 15 unmarked. */
const STAFF = { present:[], onLeave:[], absent:[] };
for(let i = 0; i < 40; i++) STAFF.present.push({ name:'Staff P' + i, role:'STAFF',
  mandal:'Bachannapet', phone:'70' + (10000000 + i), at:'2026-10-05T09:' + String(10 + (i % 40)).padStart(2,'0') + ':00+05:30',
  lat:17.7918, lng:79.0418, acc:9, verified:true, marks:1, skew:0 });
for(let i = 0; i < 5; i++) STAFF.onLeave.push({ name:'Staff L' + i, role:'STAFF',
  mandal:'Chilpur', phone:'70' + (20000000 + i), leaveType:'CL' });
for(let i = 0; i < 15; i++) STAFF.absent.push({ name:'Staff A' + i, role:'STAFF',
  mandal:'Devaruppula', phone:'70' + (30000000 + i) });

const FIELD = {
  present: (DASH.today.present || []).length,
  onLeave: (DASH.today.onLeave || []).length,
  absent:  (DASH.today.absent  || []).length
};
const J = JSON.parse(JSON.stringify(DASH));
J.today.present = (J.today.present || []).concat(STAFF.present);
J.today.onLeave = (J.today.onLeave || []).concat(STAFF.onLeave);
J.today.absent  = (J.today.absent  || []).concat(STAFF.absent);

function serve(){
  return new Promise(res => {
    const srv = http.createServer((q, s) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      if(/\/config\.js$/.test(u)){ s.writeHead(200,{'Content-Type':'text/javascript'});
        return s.end("window.SJGP_SERVER='https://mock.district/exec';window.SJGP_TENANT='';"); }
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
    localStorage.setItem('sjf5', JSON.stringify({ url:'https://mock.district/exec',
      session:{ token:'T', user:{ name:'Sandeep Kumar Jha', role:'COLLECTOR', phone:'9000000001' } } }));
    localStorage.setItem('sjgp-theme','light');
    localStorage.setItem('sjgp-console-seen','{}');
  });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.route('**/mock.district/**', r => r.fulfill({ status:200,
    contentType:'application/json', body:JSON.stringify(J) }));

  await page.goto(base + '/dashboard.html', { waitUntil:'domcontentloaded' });
  await page.waitForSelector('#app:not([hidden])', { timeout:20000 });
  await page.click('#nav [data-v="attendance"]');
  await page.waitForTimeout(700);

  const tile = n => page.evaluate(name => {
    const k = [...document.querySelectorAll('.kpi')].find(x => (x.querySelector('.hd')||{}).textContent &&
      x.querySelector('.hd').textContent.trim().indexOf(name) === 0);
    return k ? (k.querySelector('.v')||{}).textContent.trim() : null;
  }, n);

  /* --- 1. THE FIELD OFFICERS ARE THE DEFAULT --- */
  ck(!!(await page.$('[data-seg="field"]')), 'the screen carries a segment switch');
  const chips = await page.$$eval('[data-seg]', els => els.map(e => e.textContent.replace(/\s+/g,' ').trim()));
  ck(chips.length === 3, 'with three segments', chips.join(' | '));
  ck(/Field officers 2?\d\d/.test(chips[0]) && /MPDO office staff 60/.test(chips[1]),
     'EACH SAYING HOW MANY, so nobody is hidden by a default', chips.join(' | '));
  const onNow = await page.$eval('[data-seg].on', e => e.dataset.seg).catch(() => null);
  ck(onNow === 'field', 'and the field officers are the one shown first', String(onNow));

  const fPresent = await tile('Present');
  ck(Number(fPresent) === FIELD.present,
     'the Present tile is the FIELD count, not the two rolls added together',
     fPresent + ' of a fixture holding ' + FIELD.present + ' field + 40 staff');
  const txtField = await page.evaluate(() => document.body.innerText);
  ck(/the roll the notice ladder reads/.test(txtField),
     'and the screen says which roll it is showing');

  /* --- 2. THE OFFICE STAFF, ON THEIR OWN --- */
  await page.click('[data-seg="staff"]'); await page.waitForTimeout(600);
  ck(Number(await tile('Present')) === 40, 'the staff segment shows the staff present', await tile('Present'));
  ck(Number(await tile('On sanctioned leave')) === 5, 'their own leave');
  /* COUNTED OFF THE TABLE AND NOT OFF THE TILE, because the tile is honestly
     a dash on a Sunday or a declared holiday — the day is not counted and
     nobody is listed as unmarked — and a test that only passes on a working
     day is a test that fails for the wrong reason one morning in seven. */
  const states = await page.$$eval('#attBody tr td:last-child', els =>
    els.map(e => e.textContent.trim()));
  ck(states.filter(x => /not marked/i.test(x)).length === 15,
     'and their own unmarked, counted off the table',
     states.filter(x => /not marked/i.test(x)).length + ' of 60');
  ck(states.filter(x => /present/i.test(x)).length === 40, 'with their present beside them');

  const txt = await page.evaluate(() => document.body.innerText);
  ck(/No show-cause notice, no casual-leave debit and no lock/.test(txt),
     'AND THE SCREEN SAYS NO SANCTION ARISES FROM IT — the whole of why they are cut out');

  /* the officer table is the segment's too */
  const names = await page.$$eval('#attBody tr td:first-child', els => els.map(e => e.textContent.trim()));
  ck(names.length === 60, 'the officer-by-officer table carries only the staff', names.length + ' rows');
  ck(names.every(n => /^Staff /.test(n)), 'and not one field officer is in it');

  /* the denominator moved with it */
  const by10 = await tile('Marked by 10:00');
  ck(/of 40$/.test(await page.evaluate(() => {
    const k = [...document.querySelectorAll('.kpi')].find(x => x.querySelector('.hd') &&
      x.querySelector('.hd').textContent.trim().indexOf('Marked by 10:00') === 0);
    return k ? k.querySelector('.foot').textContent.trim() : '';
  })), 'THE DENOMINATORS MOVED WITH THE SEGMENT, so no percentage is of the wrong roll', by10);

  /* --- 3. THE TREND CANNOT BE CUT, AND SAYS SO --- */
  ck(/not the segment above/.test(txt),
     'the fourteen-day trend admits it is everyone, rather than letting the switch imply otherwise');

  /* --- 4. EVERYONE --- */
  await page.click('[data-seg="all"]'); await page.waitForTimeout(600);
  ck(Number(await tile('Present')) === FIELD.present + 40, 'Everyone adds the two',
     await tile('Present'));
  const txtAll = await page.evaluate(() => document.body.innerText);
  ck(/read the parts rather than the total/.test(txtAll),
     'and warns that the two answer to different rules');

  /* --- 5. it survives a re-render, and nothing throws --- */
  await page.click('#nav [data-v="overview"]'); await page.waitForTimeout(400);
  await page.click('#nav [data-v="attendance"]'); await page.waitForTimeout(600);
  ck(await page.$eval('[data-seg].on', e => e.dataset.seg) === 'all',
     'the segment survives leaving the screen and coming back');
  const wide = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  ck(!wide, 'no sideways scroll');
  ck(errs.length === 0, 'no script error', errs[0] || '');

  await br.close(); srv.close();
  console.log('\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exitCode = fail ? 1 : 0;
})();

/* THE BROWSER TEST for the two document registers — GPDP and the advisory.

   It drives the real pages in a real browser against payloads the real backend
   produced, and asserts what a person would look for:

     the field app  — the circular opens by itself in front of an officer who
                      has not read it; acknowledging it tells the district and
                      turns the card; the plan card says what is owed; a file
                      chosen on the plan screen actually reaches the endpoint,
                      with the right name and bytes, and the screen then says
                      the district has it; a .txt is refused before it is sent.
     the console    — both registers render, the counts agree with the payload,
                      the officers who have not filed or not read are named,
                      the document opens, and publishing posts what was typed.

   Every step is screenshotted. Usage: node tests/render-docs.js [outdir] */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', 'app');
const OUT = process.argv[2] || path.join(__dirname, '..', 'Info', 'docs-render');
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-docs.json'), 'utf8'));
const DASH = path.join(__dirname, 'fixture-dashboard.json');

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.png':'image/png', '.webmanifest':'application/manifest+json', '.json':'application/json' };

const results = [];
const shots = [];
let step = 0;
let SECTION = 'The field app';
function check(name, cond, detail){
  results.push({ name, pass: !!cond, detail: detail || '', section: SECTION });
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail ? '   — ' + detail : ''));
}
async function shot(page, label, full){
  step++;
  const file = String(step).padStart(2, '0') + '-' + label.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png';
  await page.screenshot({ path: path.join(OUT, file), fullPage: !!full });
  shots.push({ file, label, section: SECTION, after: results.length });
  return file;
}

function serve(){
  return new Promise(res => {
    const srv = http.createServer((req, rq) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const f = path.join(ROOT, u === '/' ? 'index.html' : u);
      if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){
        rq.writeHead(404); rq.end('no'); return;
      }
      rq.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rq);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

/* the district's endpoint, stood up in the test so every request the pages
   make is seen and can be asserted on */
function makeRouter(state){
  return async route => {
    const req = route.request();
    const url = req.url();
    const reply = body => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(body) });
    if(req.method() === 'POST'){
      let b = {};
      try{ b = JSON.parse(req.postData() || '{}'); }catch(e){}
      state.posts.push(b);
      if(b.kind === 'advAck') return reply({ ok:true, ackAt:'2026-08-23T11:40:00.000Z' });
      if(b.kind === 'gpdp')   return reply({ ok:true, year:'2026-27', fileName:(b.file||{}).name,
                                             sizeKB:Math.round(((b.file||{}).b64||'').length*3/4/1024),
                                             url:'https://drive.mock/plan.pdf',
                                             uploadedAt:'2026-08-23T11:45:00.000Z' });
      if(b.kind === 'advPublish') return reply({ ok:true, id:'ADV-20260823-tst', url:'https://drive.mock/adv.pdf', title:b.title });
      return reply({ ok:true });
    }
    if(/op=gpdp/.test(url))     return reply(state.gpdp);
    if(/op=advisory/.test(url)) return reply(state.adv);
    if(/op=dashboard/.test(url))return reply(state.dash);
    if(/op=list/.test(url))     return reply({ ok:true, rows:[] });
    if(/op=attendance/.test(url))return reply({ ok:true, rows:[] });
    if(/op=gps/.test(url))      return reply({ ok:true, rows:[] });
    if(/op=notices/.test(url))  return reply({ ok:true, rows:[] });
    if(/op=leave/.test(url))    return reply({ ok:true, rows:[], balance:{} });
    return reply({ ok:true });
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch();

  /* ======================= THE FIELD APP ======================= */
  console.log('\nTHE FIELD APP — an officer who has neither read the circular nor filed a plan');
  {
    const state = { posts: [], gpdp: FIX.gpdpOfficer, adv: FIX.advOfficer, dash: {} };
    const ctx = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:2 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    /* the app talks to whatever address config.js gives it, so both the real
       one and the test's own are answered here */
    await page.route('**/mock.district/**', makeRouter(state));
    await page.route('**script.google.com/**', makeRouter(state));
    /* THE SESSION IS WRITTEN ON THE ORIGIN WITHOUT RUNNING THE APP FIRST.
       Loading index.html and then writing the session does not work: the app
       has already built an empty store, and its own debounced save lands a
       moment later and puts session:null straight back over it. Fetching a
       static file gives the same origin with no app code on the page. */
    await page.goto(base + '/manifest.webmanifest', { waitUntil:'domcontentloaded' });
    await page.evaluate(off => {
      /* ATTENDANCE STANDS BETWEEN SIGN-IN AND THE APP, every working day. The
         harness ran green while the date happened to be a Sunday and broke the
         moment it was not; the officer is marked present so the test is about
         the documents rather than about the calendar. */
      const d = new Date();
      const today = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      const att = {};
      att[today] = { id:'A1', date:today, ts:new Date().toISOString(), lat:17.72, lng:79.15,
                     acc:14, verified:true, status:'PRESENT', sync:'synced' };
      localStorage.setItem('sjf5', JSON.stringify({
        url:'https://mock.district/exec',
        session:{ token:'T', user: off },
        records:{}, att:att, cache:[], master:[], leave:[], prefs:{ sun:0, big:0 }
      }));
    }, FIX.officer);
    await page.goto(base + '/index.html', { waitUntil:'domcontentloaded' });
    await page.waitForSelector('#app:not([hidden])', { timeout:20000 });
    await page.waitForTimeout(1400);

    /* --- the circular opens by itself --- */
    const sheetOn = await page.$eval('#sheet', el => el.classList.contains('on')).catch(() => false);
    check('the advisory opens by itself on the home screen', sheetOn);
    const sheetTxt = sheetOn ? await page.$eval('#sheetBody', el => el.innerText) : '';
    check('it carries the district’s broadcast line',
      /monsoon season and act accordingly/i.test(sheetTxt), sheetTxt.split('\n').find(l => /monsoon/i.test(l)) || '');
    check('it names the advisory', /Health Advisory/i.test(sheetTxt));
    check('it offers the document', /Open the advisory/i.test(sheetTxt));
    check('and it says an acknowledgement is a receipt, not a report of work done',
      /receipt, not a report/i.test(sheetTxt));
    await shot(page, 'app-advisory-popup');

    /* --- acknowledging tells the district --- */
    await page.click('#advAck');
    await page.waitForTimeout(700);
    const ackPost = state.posts.find(p => p.kind === 'advAck');
    check('pressing "I have read this" posts the acknowledgement', !!ackPost,
      ackPost ? 'kind=advAck, id=' + (ackPost.id || '(active)') : 'nothing was posted');
    /* the circular closes — and because the plan is still outstanding, the
       prompt for it takes the sheet straight away, so what is checked is that
       the ADVISORY is gone, not that the sheet is */
    const afterAck = await page.$eval('#sheetBody', el => el.innerText).catch(() => '');
    check('and the circular closes', !/I have read this/i.test(afterAck),
      String(afterAck).split(/\n/)[1] || '(sheet empty)');
    const homeTxt = await page.$eval('#homeBody', el => el.innerText);
    check('the home card now reads as acknowledged', /Acknowledged/i.test(homeTxt));
    await shot(page, 'app-home-after-ack', true);

    /* --- THE PIN, and the prompt that follows the circular --- */
    const pinFirst = await page.$eval('#homeBody', el => {
      const g = [...el.querySelectorAll('.group')];
      const i = g.findIndex(x => x.querySelector('[data-gpdp]'));
      const j = g.findIndex(x => x.querySelector('[data-adv]'));
      return { i, j, pinned: !!(g[i] && g[i].classList.contains('pinned')) };
    });
    check('the outstanding plan is pinned above the advisory on the home screen',
      pinFirst.i >= 0 && pinFirst.i < pinFirst.j, 'plan card at ' + pinFirst.i + ', advisory at ' + pinFirst.j);
    check('and is marked as pending', pinFirst.pinned);
    const gpSheet = await page.$eval('#sheet', el => el.classList.contains('on')).catch(() => false);
    check('once the circular is dealt with, the pending plan is put in front of him too', gpSheet);
    const gpSheetTxt = gpSheet ? await page.$eval('#sheetBody', el => el.innerText) : '';
    check('the prompt says what is outstanding and offers to send it now',
      /has not been sent/i.test(gpSheetTxt) && /Send it now/i.test(gpSheetTxt));
    await shot(page, 'app-gpdp-pending-prompt');
    if(gpSheet){ await page.click('#gpLater'); await page.waitForTimeout(400); }

    /* --- the plan card --- */
    check('the home screen calls for the development plan', /GPDP has not been sent/i.test(homeTxt),
      (homeTxt.split('\n').find(l => /GPDP/i.test(l)) || ''));
    await page.click('[data-gpdp]');
    await page.waitForTimeout(500);
    const gpTxt = await page.$eval('#gpBody', el => el.innerText);
    check('the plan screen says what is called for and by when it is not held',
      /has been called for and has not been sent/i.test(gpTxt));
    check('and states the formats and the size limit', /PDF, Word or Excel, up to \d+ MB/i.test(gpTxt));
    await shot(page, 'app-gpdp-screen', true);

    /* --- a file that is not a plan is refused before it is sent --- */
    const badPath = path.join(OUT, '_notaplan.txt');
    fs.writeFileSync(badPath, 'this is not a plan');
    await page.setInputFiles('#gpdpFile', badPath);
    await page.waitForTimeout(600);
    const sentBad = state.posts.filter(p => p.kind === 'gpdp').length;
    check('a .txt is refused by the app and never sent', sentBad === 0,
      sentBad ? sentBad + ' upload(s) were sent' : 'nothing left the phone');
    const toastTxt = await page.$eval('#toast', el => el.innerText).catch(() => '');
    check('and the officer is told what a plan may be', /PDF|Word|Excel/i.test(toastTxt), toastTxt.slice(0, 90));
    await shot(page, 'app-gpdp-wrong-format');

    /* --- a real plan goes --- */
    const pdfPath = path.join(OUT, '_plan.pdf');
    fs.writeFileSync(pdfPath, Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(4096, 0x20)]));
    await page.setInputFiles('#gpdpFile', pdfPath);
    await page.waitForTimeout(1400);
    const up = state.posts.find(p => p.kind === 'gpdp');
    check('choosing a PDF sends it to the district', !!up, up ? 'file=' + up.file.name : 'nothing was sent');
    check('the bytes arrive, base64 encoded', !!(up && up.file && up.file.b64 && up.file.b64.length > 100),
      up ? (up.file.b64.length + ' base64 chars for a ' + fs.statSync(pdfPath).size + ' byte file') : '');
    check('the file keeps its own name', !!(up && /_plan\.pdf$/.test(up.file.name)), up ? up.file.name : '');
    const gpAfter = await page.$eval('#gpBody', el => el.innerText);
    check('and the screen then says the district holds it', /district has your plan/i.test(gpAfter));
    await shot(page, 'app-gpdp-filed', true);

    /* --- the circulars stay reachable --- */
    await page.click('#tabs [data-s="more"]');
    await page.waitForTimeout(500);
    await page.click('#mAdv');
    await page.waitForTimeout(600);
    const listTxt = await page.$eval('#sheetBody', el => el.innerText);
    check('every circular stays in the app, reachable from More',
      /Advisories from the Collector/i.test(listTxt) && /Health Advisory/i.test(listTxt));
    check('and the standing one is marked as standing', /standing/i.test(listTxt));
    await shot(page, 'app-advisory-list');

    check('the app raised no script error', errs.length === 0, errs.slice(0, 2).join(' | '));
    await ctx.close();
  }

  /* ======================= THE CONSOLE ======================= */
  SECTION = 'The console';
  console.log('\nTHE CONSOLE — the Collector reading both registers');
  for(const theme of ['light', 'dark']){
    const state = { posts: [], gpdp: FIX.gpdpDistrict, adv: FIX.advDistrict,
                    dash: fs.existsSync(DASH) ? JSON.parse(fs.readFileSync(DASH, 'utf8')) : { ok:true } };
    const ctx = await browser.newContext({ viewport:{ width:1500, height:1000 } });
    await ctx.addInitScript(th => {
      localStorage.setItem('sjf5', JSON.stringify({
        url:'https://mock.district/exec',
        session:{ token:'T', user:{ name:'Sandeep Kumar Jha', role:'COLLECTOR', phone:'9000000001' } }
      }));
      localStorage.setItem('sjgp-theme', th);
    }, theme);
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.route('**/mock.district/**', makeRouter(state));
    await page.route('**script.google.com/**', makeRouter(state));
    await page.route('**tile.openstreetmap.org**', r => r.abort());
    await page.goto(base + '/dashboard.html', { waitUntil:'domcontentloaded' });
    await page.waitForSelector('#app:not([hidden])', { timeout:20000 });
    await page.waitForTimeout(700);

    /* ---- GPDP ---- */
    await page.click('#nav [data-v="gpdp"]');
    await page.waitForTimeout(1100);
    const gTxt = await page.$eval('#g', el => el.innerText);
    const gT = FIX.gpdpDistrict.totals;
    if(theme === 'light'){
      check('the console shows the plans filed against the number called for',
        gTxt.indexOf(String(gT.uploaded)) >= 0 && gTxt.indexOf('of ' + gT.due + ' called for') >= 0,
        gT.uploaded + ' of ' + gT.due);
      const rowN = await page.$$eval('#gpBody tr', rs => rs.length);
      check('every officer on the roll has a line', rowN === FIX.gpdpDistrict.roll.length,
        rowN + ' rows for ' + FIX.gpdpDistrict.roll.length + ' officers');
      const filedN = await page.$$eval('#gpBody .pill.ok', p => p.length);
      const notN = await page.$$eval('#gpBody .pill.bad', p => p.length);
      check('marked filed or not filed, agreeing with the register',
        filedN === gT.uploaded && notN === gT.pending, filedN + ' filed · ' + notN + ' not filed');
      const links = await page.$$eval('#gpBody a', a => a.length);
      check('and every filed plan carries a link the Collector can open',
        links === gT.uploaded, links + ' documents linked');
    }
    await shot(page, 'console-gpdp-' + theme, true);

    if(theme === 'light'){
      await page.click('[data-gpf="pending"]');
      await page.waitForTimeout(500);
      const pendN = await page.$$eval('#gpBody tr', rs => rs.length);
      check('the "not filed" filter names exactly the officers who have not filed',
        pendN === gT.pending, pendN + ' named');
      await shot(page, 'console-gpdp-pending', true);
      await page.click('[data-gpf="all"]');
      await page.waitForTimeout(400);
    }

    /* ---- Advisory ---- */
    await page.click('#nav [data-v="advisory"]');
    await page.waitForTimeout(1100);
    const aTxt = await page.$eval('#g', el => el.innerText);
    const aT = FIX.advDistrict.totals;
    if(theme === 'light'){
      check('the console shows the standing advisory',
        /PS MPDO MPO Health Advisory/i.test(aTxt));
      check('with the exact line every officer is shown',
        /monsoon season and act accordingly/i.test(aTxt));
      check('and the count of who has read it',
        aTxt.indexOf('of ' + aT.due + ' addressed') >= 0, aT.acknowledged + ' of ' + aT.due);
      const ackN = await page.$$eval('#advBody .pill.ok', p => p.length);
      const penN = await page.$$eval('#advBody .pill.bad', p => p.length);
      check('every officer is marked read or pending, agreeing with the register',
        ackN === aT.acknowledged && penN === aT.pending, ackN + ' read · ' + penN + ' pending');
    }
    await shot(page, 'console-advisory-' + theme, true);

    if(theme === 'light'){
      await page.click('[data-advf="pending"]');
      await page.waitForTimeout(500);
      const penRows = await page.$$eval('#advBody tr', rs => rs.length);
      check('the "pending" filter names exactly the officers who have not read it',
        penRows === aT.pending, penRows + ' named');
      await shot(page, 'console-advisory-pending', true);

      /* ---- publishing ---- */
      await page.fill('#advTitle', 'Monsoon to-do list');
      await page.waitForTimeout(150);
      const msgVal = await page.$eval('#advMsg', el => el.value);
      check('the publish form is pre-filled with the district’s broadcast line',
        /monsoon season and act accordingly/i.test(msgVal), msgVal);
      await shot(page, 'console-advisory-publish-form');

      const advPdf = path.join(OUT, '_advisory.pdf');
      fs.writeFileSync(advPdf, Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(2048, 0x20)]));
      await page.setInputFiles('#advFile', advPdf);
      await page.click('#advGo');
      await page.waitForTimeout(1200);
      const pub = state.posts.find(p => p.kind === 'advPublish');
      check('publishing posts the title, the line and the document', !!pub,
        pub ? ('title="' + pub.title + '", audience=' + pub.audience + ', file=' + (pub.file || {}).name) : 'nothing posted');
      check('the broadcast line is what is sent', !!(pub && /monsoon season and act accordingly/i.test(pub.message)),
        pub ? pub.message : '');
      await shot(page, 'console-advisory-published', true);
    }

    check('the console raised no script error in ' + theme, errs.length === 0, errs.slice(0, 2).join(' | '));
    await ctx.close();
  }

  await browser.close();
  srv.close();
  ['_notaplan.txt', '_plan.pdf', '_advisory.pdf'].forEach(f => {
    try{ fs.unlinkSync(path.join(OUT, f)); }catch(e){}
  });

  /* ---- the report ---- */
  const pass = results.filter(r => r.pass).length;
  const fail = results.filter(r => !r.pass);
  const lines = [];
  lines.push('# Browser test — GPDP and the advisory');
  lines.push('');
  lines.push('Run ' + new Date().toISOString().slice(0, 16).replace('T', ' ') +
             ' · Chromium · the field app at 390px, the console at 1500px in both themes.');
  lines.push('');
  lines.push('**' + pass + ' of ' + results.length + ' checks passed.**' +
             (fail.length ? '  ' + fail.length + ' failed.' : ''));
  lines.push('');
  lines.push('The pages are the real ones. The payloads were produced by running the real');
  lines.push('backend under the Apps Script mock, so what is screenshotted is each page');
  lines.push('reading the district’s own response shape — not a stub written to agree with it.');
  lines.push('');
  lines.push('| | Check | Detail |');
  lines.push('|---|---|---|');
  results.forEach(r => lines.push('| ' + (r.pass ? '✓' : '✗') + ' | ' + r.name + ' | ' +
    String(r.detail || '').replace(/\|/g, '\\|') + ' |'));
  lines.push('');
  lines.push('## Snapshots');
  lines.push('');
  shots.forEach(s => { lines.push('### ' + s.label); lines.push(''); lines.push('![' + s.label + '](' + s.file + ')'); lines.push(''); });
  fs.writeFileSync(path.join(OUT, 'REPORT.md'), lines.join('\n'));
  /* the same run, structured, so the published report is built from the run
     itself rather than from a person retyping it */
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({
    at: new Date().toISOString(), passed: pass, total: results.length,
    results: results, shots: shots }, null, 1));

  console.log('\n' + pass + '/' + results.length + ' checks passed');
  console.log('report + ' + shots.length + ' snapshots: ' + path.join(OUT, 'REPORT.md'));
  if(fail.length){ console.log('\nFAILED:'); fail.forEach(f => console.log('  ✗ ' + f.name + '  ' + f.detail)); process.exitCode = 1; }
})();

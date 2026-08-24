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
/* the counts the composer reads to say who a choice reaches, derived from the
   same roll the register was built from */
(() => {
  const roll = FIX.advDistrict.roll || [];
  const c = { byRole:{}, byMandal:{}, byRoleMandal:{}, mandals:[], total:roll.length };
  const seen = {};
  roll.forEach(r => {
    c.byRole[r.role] = (c.byRole[r.role] || 0) + 1;
    const m = r.mandal || 'Unassigned';
    c.byMandal[m] = (c.byMandal[m] || 0) + 1;
    c.byRoleMandal[r.role + '|' + m] = (c.byRoleMandal[r.role + '|' + m] || 0) + 1;
    if(!seen[m]){ seen[m] = true; c.mandals.push(m); }
  });
  c.mandals.sort();
  FIX.advDistrict.roll_counts = c;
})();
const DASH = path.join(__dirname, 'fixture-dashboard.json');

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.png':'image/png', '.webmanifest':'application/manifest+json', '.json':'application/json' };

/* The forecast the harness serves. It is the shape the backend returns, with
   one mandal severe and one on watch, so the map, the table, the level pills
   and the draft all have something real to render. */
const MANDALS = ['Bachannapeta','Chilpur','Devaruppula','Ghanpur (Stn)','Jangaon','Kodakandla',
                 'Lingala Ghanpur','Narmetta','Palakurthy','Raghunathpalle','Tharigoppula','Zaffergadh'];
const WXROWS = MANDALS.map((m, i) => {
  const level = i === 0 ? 'SEVERE' : i === 1 ? 'WATCH' : 'CALM';
  const rain  = i === 0 ? 88 : i === 1 ? 31 : (i % 4);
  return { mandal:m, lat: 17.55 + i * 0.035, lng: 79.02 + (i % 5) * 0.06, located: i !== 11,
           temp: 26 + (i % 5), humidity: 70 - i, code: level === 'CALM' ? 2 : 65,
           now: level === 'CALM' ? 'Partly cloudy' : 'Rain', windNow: 9 + i,
           tmax: 29 + (i % 4), tmin: 23, rain: rain,
           rainChance: level === 'CALM' ? 20 : 85, wind: level === 'SEVERE' ? 46 : 14 + i,
           dayCode: level === 'CALM' ? 2 : 65,
           rainClass: rain > 64.4 ? 'heavy rain' : rain > 15.5 ? 'moderate rain' : rain >= 2.5 ? 'light rain' : '',
           today: level === 'CALM' ? 'Partly cloudy' : 'Rain', level: level };
});
const WXFIX = {
  ok:true, at:new Date().toISOString(), date:new Date().toISOString().slice(0,10),
  level:'SEVERE', counts:{ severe:1, watch:1, calm:10 }, rows:WXROWS,
  source:'Open-Meteo · thresholds after the India Meteorological Department',
  draft:'Heavy rain expected today — up to 88 mm, wind to 46 km/h. Worst in Bachannapeta. ' +
        'Secretaries to check drains, tank bunds and the chlorination of drinking water sources, ' +
        'and to report any breach or waterlogging to the MPDO the same day.'
};
/* the officer the app is driven as sits in Jangaon, so Jangaon is the mandal
   given the severe day — otherwise the card and the notification it raises are
   never exercised at all */
const WXMINE = { ok:true, at:WXFIX.at, date:WXFIX.date, source:WXFIX.source,
                 mine: Object.assign({}, WXROWS[4], { level:'SEVERE', rain:88, wind:46,
                   rainClass:'heavy rain', today:'Rain', tmax:31 }),
                 level:'SEVERE' };

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
    if(/op=weather/.test(url))  return reply(state.wx);
    if(/op=gpdp/.test(url))     return reply(state.gpdp);
    if(/op=advisory/.test(url)){
      /* THE CONSOLE MAY ASK FOR A CIRCULAR OUT OF THE HISTORY, by name. The
         district answers with that circular's own register — the same shape,
         rebuilt against the roll it addressed. */
      const m2 = /[?&]id=([^&]+)/.exec(url);
      const want = m2 ? decodeURIComponent(m2[1]) : '';
      if(want && FIX.advRetired && FIX.advRetired.advisory && FIX.advRetired.advisory.id === want)
        return reply(FIX.advRetired);
      return reply(state.adv);
    }
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
    const state = { posts: [], gpdp: FIX.gpdpOfficer, adv: FIX.advOfficer, dash: {}, wx: WXMINE };
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

    /* --- THE BADGES, while both are outstanding --- */
    const b1 = await page.$eval('#homeBadge', el => ({ hidden: el.hidden, n: el.textContent })).catch(() => null);
    check('the home tab carries a badge for what is outstanding',
      !!b1 && !b1.hidden, b1 ? ('badge reads "' + b1.n + '"') : 'no badge element');
    check('and it counts BOTH — the circular and the plan', !!b1 && b1.n === '2', b1 ? b1.n : '');
    const b2 = await page.$eval('#moreBadge', el => ({ hidden: el.hidden, n: el.textContent })).catch(() => null);
    check('More carries the same count, because that is where the rows are',
      !!b2 && !b2.hidden && b2.n === '2', b2 ? b2.n : '');

    /* --- acknowledging the circular takes one off --- */
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
    const b3 = await page.$eval('#homeBadge', el => ({ hidden: el.hidden, n: el.textContent })).catch(() => null);
    check('and the badge drops to one', !!b3 && !b3.hidden && b3.n === '1', b3 ? b3.n : '');
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
    if(gpSheet){ await page.click('#gpLater'); await page.waitForTimeout(500); }
    /* photographed with nothing covering the tab bar — a badge nobody can see
       in the picture proves nothing to the reader of the report */
    await shot(page, 'app-badges');

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

    /* --- the weather over his own mandal --- */
    const wxTxt = await page.$eval('#homeBody', el => el.innerText);
    check('the officer is shown the forecast for his own mandal',
      /Jangaon · forecast/i.test(wxTxt),
      (String(wxTxt).split(/\n/).find(l => /forecast/i.test(l)) || ''));
    check('with what the district calls it, not a raw code',
      /Severe weather expected|Watch the weather/i.test(wxTxt));
    check('and the rainfall in the IMD’s words', /heavy rain|moderate rain/i.test(wxTxt));
    await shot(page, 'app-weather-card', true);

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

    /* the badge is only useful if it goes away when the work is done */
    const cleared = await page.$eval('#homeBadge', el => el.hidden).catch(() => null);
    check('and the badge clears once nothing is outstanding', cleared === true,
      cleared === true ? 'hidden' : 'still showing');

    check('the app raised no script error', errs.length === 0, errs.slice(0, 2).join(' | '));
    await ctx.close();
  }

  /* ============ THE CIRCULAR MUST NOT COME BACK ============
     Reported from the field: acknowledged, and it kept opening every time. The
     receipt used to be written only when the server answered, so a dropped
     signal — the ordinary case on a village road — meant the circular opened
     again the next morning. Here the district REFUSES the receipt outright and
     the circular must still never be put up again on that handset. */
  SECTION = 'The circular must not come back';
  console.log('\nTHE REPEAT — a receipt the district never got');
  {
    const state = { posts: [], gpdp: FIX.gpdpOfficer, adv: FIX.advOfficer, dash: {}, wx: WXMINE };
    const ctx = await browser.newContext({ viewport:{ width:390, height:844 } });
    const page = await ctx.newPage();
    const router = async route => {
      const req = route.request();
      const reply = b2 => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(b2) });
      if(req.method() === 'POST'){
        let b2 = {}; try{ b2 = JSON.parse(req.postData() || '{}'); }catch(e){}
        state.posts.push(b2);
        if(b2.kind === 'advAck') return reply({ ok:false, error:'busy — try again' });
        return reply({ ok:true });
      }
      const u = req.url();
      if(/op=weather/.test(u))  return reply(state.wx);
      if(/op=advisory/.test(u)) return reply(state.adv);   /* still says unacknowledged */
      if(/op=gpdp/.test(u))     return reply(state.gpdp);
      return reply({ ok:true, rows:[] });
    };
    await page.route('**/mock.district/**', router);
    await page.route('**script.google.com/**', router);
    await page.goto(base + '/manifest.webmanifest', { waitUntil:'domcontentloaded' });
    await page.evaluate(off => {
      const d = new Date();
      const today = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      const att = {}; att[today] = { id:'A1', date:today, ts:new Date().toISOString(), verified:true, status:'PRESENT', sync:'synced' };
      localStorage.setItem('sjf5', JSON.stringify({ url:'https://mock.district/exec',
        session:{ token:'T', user: off }, records:{}, att:att, cache:[], master:[], leave:[], prefs:{ sun:0, big:0 } }));
    }, FIX.officer);

    const openIt = async () => {
      await page.goto(base + '/index.html', { waitUntil:'domcontentloaded' });
      await page.waitForSelector('#app:not([hidden])', { timeout:20000 });
      await page.waitForTimeout(2000);
      const on = await page.$eval('#sheet', el => el.classList.contains('on'));
      const txt = on ? await page.$eval('#sheetBody', el => el.innerText) : '';
      return { on, isAdvisory: /I have read this/i.test(txt) };
    };

    let o = await openIt();
    check('the circular opens the first time', o.isAdvisory);
    await page.click('#advAck');
    await page.waitForTimeout(900);
    const tried = state.posts.filter(p2 => p2.kind === 'advAck').length;
    check('the district is told, and refuses', tried >= 1, tried + ' attempt(s), all refused');
    const homeAfter = await page.$eval('#homeBody', el => el.innerText);
    check('the card still reads acknowledged — he pressed it, and that stands',
      /Acknowledged/i.test(homeAfter));

    o = await openIt();
    check('and on the next opening the circular does NOT come back', !o.isAdvisory,
      o.on ? 'a sheet is up, but it is not the circular' : 'nothing is up');
    o = await openIt();
    check('nor the one after that', !o.isAdvisory);
    const q = await page.evaluate(() => (JSON.parse(localStorage.getItem('sjf5') || '{}').advAckQ || []).length);
    check('the receipt is held on the phone and retried, not dropped', q >= 1, q + ' queued');
    await shot(page, 'app-advisory-not-repeated', true);
    await ctx.close();
  }

  /* ======================= THE CONSOLE ======================= */
  SECTION = 'The console';
  console.log('\nTHE CONSOLE — the Collector reading both registers');
  for(const theme of ['light', 'dark']){
    const state = { posts: [], gpdp: FIX.gpdpDistrict, adv: FIX.advDistrict, wx: WXFIX,
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
    page.on('pageerror', e => { errs.push(String(e)); console.log('   PAGEERROR: ' + String(e).split(/\n/)[0]); });
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
      await page.click('[data-advf="all"]');
      await page.waitForTimeout(400);

      /* ---- NOTHING GOES OFF THE CONSOLE ----
         Publishing retires the standing circular; it has never deleted one.
         But the console could read only the circular in force, so a new one
         took the previous circular and its whole read/unread register off the
         screen. The history is on the page, and any of them opens. */
      const histN = await page.$$eval('[data-advopen]', rs => rs.length);
      check('every circular the district has issued is on the console',
        histN === (FIX.advDistrict.list || []).length, histN + ' on the register');
      check('the retired circular is still named, and marked retired',
        /Chlorination of drinking water sources/i.test(aTxt) && /retired/i.test(aTxt));
      const oT = FIX.advRetired.totals;
      check('carrying the tally it collected before it was retired',
        aTxt.indexOf(oT.acknowledged + '/' + oT.due) >= 0,
        oT.acknowledged + ' of ' + oT.due + ' read');
      await shot(page, 'console-advisory-history', true);

      await page.click('[data-advopen="' + FIX.advRetired.advisory.id + '"]');
      await page.waitForTimeout(900);
      const rTxt = await page.$eval('#g', el => el.innerText);
      check('opening it rebuilds the register against that circular',
        /Chlorination of drinking water sources/i.test(rTxt) &&
        rTxt.indexOf('of ' + oT.due + ' addressed') >= 0, oT.acknowledged + ' of ' + oT.due);
      check('and says plainly that this one has been retired',
        /already retired/i.test(rTxt));
      const rAck = await page.$$eval('#advBody .pill.ok', pp => pp.length);
      check('with the receipts given against it, name by name',
        rAck === oT.acknowledged, rAck + ' read');
      await shot(page, 'console-advisory-retired', true);

      await page.click('#advBack');
      await page.waitForTimeout(900);
      const bTxt = await page.$eval('#g', el => el.innerText);
      check('and the way back to the circular now standing',
        /PS MPDO MPO Health Advisory/i.test(bTxt) && !/already retired/i.test(bTxt));

      /* ---- publishing ---- */
      await page.fill('#advTitle', 'Monsoon to-do list');
      await page.waitForTimeout(150);
      const msgVal = await page.$eval('#advMsg', el => el.value);
      check('the publish form is pre-filled with the district’s broadcast line',
        /monsoon season and act accordingly/i.test(msgVal), msgVal);
      /* ---- addressed by role and by mandal ---- */
      const chips = await page.$$eval('#advMandals [data-advm]', els => els.length);
      check('the composer offers every mandal as a chip', chips === FIX.advDistrict.roll_counts.mandals.length + 1,
        chips + ' chips for ' + FIX.advDistrict.roll_counts.mandals.length + ' mandals, plus "Every mandal"');
      const reach0 = await page.$eval('#advReach', el => el.textContent.trim());
      check('and says how many officers the choice reaches, before it reaches them',
        /reaches \d+ officers in the whole district/i.test(reach0), reach0);

      await page.selectOption('#advAud', 'PS');
      await page.waitForTimeout(700);
      const reachPS = await page.$eval('#advReach', el => el.textContent.trim());
      check('narrowing to a role narrows the count', /reaches \d+ PSs/i.test(reachPS), reachPS);

      const firstMandal = FIX.advDistrict.roll_counts.mandals[0];
      await page.click('[data-advm="' + firstMandal + '"]');
      await page.waitForTimeout(700);
      const reachBoth = await page.$eval('#advReach', el => el.textContent.trim());
      check('and adding a mandal narrows it again — the two compose',
        reachBoth.indexOf(firstMandal) >= 0, reachBoth);
      await shot(page, 'console-advisory-addressing');

      /* back to everyone for the publish check below */
      /* THE WORDS MUST SURVIVE THE CHOICE. Picking a role or a mandal
         re-renders the view; the title and the line the Collector had typed
         used to go with it. */
      const keptTitle = await page.$eval('#advTitle', el => el.value);
      const keptMsg = await page.$eval('#advMsg', el => el.value);
      check('what the Collector typed survives changing the audience',
        keptTitle === 'Monsoon to-do list' && /monsoon season/i.test(keptMsg), keptTitle);

      await page.click('[data-advm=""]');
      await page.selectOption('#advAud', 'ALL');
      await page.waitForTimeout(600);
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

    /* ---- weather ---- */
    await page.click('#nav [data-v="map"]');
    await page.waitForTimeout(1400);
    const mapTxt = await page.$eval('#g', el => el.innerText);
    if(theme === 'light'){
      check('the map view carries the weather over the district',
        /Weather over the district/i.test(mapTxt));
      const rows = await page.$$eval('[data-k="wxT"] tbody tr', r => r.length);
      check('every mandal has a line', rows === WXROWS.length, rows + ' of ' + WXROWS.length);
      const sev = await page.$$eval('[data-k="wxT"] .pill.bad', p => p.length);
      const wat = await page.$$eval('[data-k="wxT"] .pill.warn', p => p.length);
      check('marked severe or watch, agreeing with the forecast',
        sev === 1 && wat === 1, sev + ' severe · ' + wat + ' watch');
      /* THE WEATHER MUST BE VISIBLE ON THE MAP, NOT MERELY PRESENT IN IT.
         It was drawn with circleMarker, whose radius is in pixels — twelve
         20px specks lost among 159 officers' marks at district zoom. Reported
         as "I cannot see the weather condition on map". */
      const wxGeo = await page.evaluate(() => {
        if(typeof WXLAYER === 'undefined' || !WXLAYER) return null;
        const ls = Object.keys(WXLAYER._layers).map(k => WXLAYER._layers[k]);
        return { n: ls.length,
                 metres: (ls[0] && typeof ls[0].getRadius === 'function') ? ls[0].getRadius() : 0,
                 pane: ls[0] ? ls[0].options.pane : '' };
      });
      check('every mandal is drawn on the map', !!wxGeo && wxGeo.n === WXROWS.length,
        wxGeo ? wxGeo.n + ' areas' : 'no weather layer');
      check('as an area on the ground, measured in metres — not a pixel dot',
        !!wxGeo && wxGeo.metres >= 1000, wxGeo ? wxGeo.metres + ' m radius' : '');
      check('and it sits in its own pane, beneath the officers’ marks',
        !!wxGeo && wxGeo.pane === 'wx', wxGeo ? wxGeo.pane : '');

      /* clicking the chip must SHOW it — turning a layer on while the map is
         framed somewhere else changes nothing a reader can see */
      const zBefore = await page.evaluate(() => MAP2 ? MAP2.getZoom() : 0);
      await page.click('#wxToggle'); await page.waitForTimeout(700);
      const offN = await page.evaluate(() =>
        (typeof WXLAYER !== 'undefined' && WXLAYER) ? Object.keys(WXLAYER._layers).length : 0);
      check('the chip takes the weather off the map', offN === 0, offN + ' areas left');
      const label = await page.$eval('#wxToggle', el => el.textContent.trim());
      check('and the chip then offers to put it back', /Show on the map/i.test(label), label);
      await page.click('#wxToggle'); await page.waitForTimeout(1200);
      const zAfter = await page.evaluate(() => MAP2 ? MAP2.getZoom() : 0);
      const onN = await page.evaluate(() =>
        (typeof WXLAYER !== 'undefined' && WXLAYER) ? Object.keys(WXLAYER._layers).length : 0);
      check('putting it back draws it again', onN === WXROWS.length, onN + ' areas');
      check('and brings the map to the weather instead of leaving it framed elsewhere',
        zAfter > zBefore, 'zoom ' + zBefore + ' → ' + zAfter);
      await shot(page, 'console-weather-on-the-map', false);
      check('the draft names the rain, the wind and the mandal',
        /88 mm/.test(mapTxt) && /46 km\/h/.test(mapTxt) && /Bachannapeta/.test(mapTxt));
    }
    await shot(page, 'console-weather-' + theme, true);

    if(theme === 'light'){
      const pubBefore = state.posts.filter(p => p.kind === 'advPublish').length;
      await page.click('#wxDraft');
      await page.waitForTimeout(1100);
      const title = await page.$eval('#advTitle', el => el.value);
      const msg = await page.$eval('#advMsg', el => el.value);
      check('the draft is carried into the advisory composer, not sent from the map',
        /Weather advisory/i.test(title) && /Heavy rain expected/i.test(msg), title);
      check('and nothing was published on the way', state.posts.filter(p => p.kind === 'advPublish').length === pubBefore,
        'publishes before ' + pubBefore + ', after ' + state.posts.filter(p => p.kind === 'advPublish').length);
      await shot(page, 'console-weather-draft-carried', true);
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

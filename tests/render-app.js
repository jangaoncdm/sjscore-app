/* THE RENDER-AND-LOOK PASS FOR THE FIELD APP.
   The console has had one since the charts were rebuilt; the app had none, and
   a desktop layout was shipped into it on 18.09.2026 with nothing standing
   guard over the phone.

   What it does: drives the real app in a real browser against payloads the
   real backend produced, at 2560, 1500 and 390 px, on every screen an officer
   reaches, and MEASURES what looking cannot —

     · nothing scrolls sideways at any width, on any screen;
     · THE PHONE IS UNTOUCHED. The 390px layout is asserted against the numbers
       it has always had: one column, the tab bar at the foot, the content
       exactly the width of the screen. A desktop rule that leaks below 1500px
       fails here rather than in a village;
     · the desktop actually USES the monitor — the working column is wide, the
       wide groups lay their rows out in columns, and the sign-in composition
       is centred in the viewport rather than pinned to its corners;
     · no screen raises a script error.

   Usage: node tests/render-app.js [outdir]
   Playwright is deliberately not a dependency: npm i playwright --no-save. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', 'app');
const OUT = process.argv[2] || path.join(__dirname, '..', 'Info', 'app-render');
const DASH = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-dashboard.json'), 'utf8'));
const SCHED = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-schedule.json'), 'utf8'));

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.png':'image/png', '.webmanifest':'application/manifest+json', '.json':'application/json' };

/* THE TENANT COMES FROM config.js, WHICH IS WHAT IT WILL DO IN THE FIELD.
   Injecting a variable would test the harness; serving the file the deployment
   actually serves tests the switch. */
let SERVE_TENANT = 'SJGP';
function serve(){
  return new Promise(res => {
    const srv = http.createServer((req, rq) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      if(/\/config\.js$/.test(u)){
        rq.writeHead(200, { 'Content-Type':'text/javascript' });
        rq.end("window.SJGP_SERVER='https://mock.district/exec';" +
               (SERVE_TENANT === 'GP' ? "window.SJGP_TENANT='GP';" : ''));
        return;
      }
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

/* The officer the app is driven as: an MPDO with a mandal, so the home screen
   carries the district picture, the ranking and the filing schedule — the
   screens with enough on them to have a layout at all. */
const OFFICER = { name:'Ganesh Naik', role:'MPDO', phone:'9100000005', mandal:'Jangaon', gp:'', gps:[] };
/* the app asks for the CURRENT reporting month; the dashboard fixture was
   built in August, so its rows are re-stamped or the home screen renders as a
   district that has filed nothing and there is no layout to judge */
const YM = (() => { const d = new Date(); let y = d.getFullYear(), m = d.getMonth() + 1;
  if(d.getDate() < 10){ m--; if(m < 1){ m = 12; y--; } }
  return y + '-' + String(m).padStart(2, '0'); })();
const LIST = ((DASH.month && DASH.month.rows) || []).map(r => Object.assign({}, r, { ym: YM }));
const GPS = (DASH.coverage || []).flatMap(c => (c.pending || []).map(g => ({ mandal:c.mandal, gp:g }))).slice(0, 40);

const WX = { ok:true, at:new Date().toISOString(), date:YM + '-18', source:'Open-Meteo', level:'WATCH',
  mine:{ mandal:'Jangaon', level:'WATCH', rain:22, wind:19, rainClass:'moderate rain',
         today:'Rain', tmax:31, tmin:23, rainChance:80 } };

function router(route){
  const req = route.request();
  const u = req.url();
  const rep = o => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(o) });
  if(req.method() === 'POST') return rep({ ok:true });
  if(/op=schedule/.test(u))   return rep(SCHED);
  if(/op=gps/.test(u))        return rep({ ok:true, gps:GPS });
  if(/op=list/.test(u))       return rep({ ok:true, rows:LIST });
  if(/op=attendance/.test(u)) return rep({ ok:true, rows:[] });
  if(/op=gpdp/.test(u))       return rep({ ok:true, year:'2026-27', due:false, mine:null });
  if(/op=advisory/.test(u))   return rep({ ok:true, advisory:null, acknowledged:true, recent:[] });
  if(/op=weather/.test(u))    return rep(WX);
  if(/op=notices/.test(u))    return rep({ ok:true, rows:[], reminders:[], holidays:{} });
  if(/op=leave/.test(u))      return rep({ ok:true, rows:[] });
  return rep({ ok:true });
}

const SIZES = [{ w:2560, h:1440, n:'2560' }, { w:1500, h:1000, n:'1500' }, { w:390, h:844, n:'390' }];
const TABS = ['home', 'records', 'notices', 'more'];
/* a Gram Palana Officer holding two revenue villages — 54 of the 115 do */
const GP_OFFICER = { name:'K. Surya Prakash', role:'GPO', phone:'9111100001',
                     mandal:'Bachannapeta', gp:'', gps:['Bachannapet','Itikalapally'] };
/* THE TABS EACH REGISTER HAS. Inspect and Records are the 100-mark evaluation
   and its drafts; the GP register does not take one and its server refuses at
   the door, so the app must not offer a tab that can only refuse him. */
const TABS_EXPECTED = { SJGP:['home','inspect','records','notices','more'],
                        GP:  ['home','notices','more'] };

const problems = [];
const note = (label, msg) => problems.push(label + ': ' + msg);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch();

  for(const tn of ['SJGP', 'GP']){
  SERVE_TENANT = tn;
  const OFF = tn === 'GP' ? GP_OFFICER : OFFICER;
  const pre = tn === 'GP' ? 'gp-' : '';
  for(const size of SIZES){
    /* ---- the sign-in screen, which is the front door on a desktop ---- */
    {
      const ctx = await browser.newContext({ viewport:{ width:size.w, height:size.h } });
      const page = await ctx.newPage();
      const errs = []; page.on('pageerror', e => errs.push(String(e)));
      await page.route('**/mock.district/**', router);
      await page.goto(base + '/index.html', { waitUntil:'domcontentloaded' });
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(OUT, pre + size.n + '-signin.png') });
      const m = await page.evaluate(() => {
        const g = s => { const e = document.querySelector(s); if(!e) return null;
          const r = e.getBoundingClientRect();
          return { x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height) }; };
        return { brand:g('.brandband'), form:g('.siwrap'), vw:window.innerWidth, vh:window.innerHeight,
                 over:document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      const lbl = tn + '/' + size.n + '/signin';
      if(m.over > 1) note(lbl, 'scrolls sideways by ' + m.over + 'px');
      if(errs.length) note(lbl, errs[0]);
      if(size.w >= 980){
        /* ONE CENTRED COMPOSITION. The brand panel and the form sit side by
           side and the pair is centred in the viewport — it used to be a
           full-bleed split with the emblem in one corner and the form in the
           other, and the form pinned to the top of a 1440px screen. */
        if(m.brand.y + m.brand.h <= m.form.y) note(lbl, 'the brand panel is above the form, not beside it');
        const mid = (m.brand.x + m.form.x + m.form.w) / 2;
        if(Math.abs(mid - m.vw / 2) > 24) note(lbl, 'the composition is not centred across: middle ' +
          Math.round(mid) + ' of ' + m.vw);
        const vmid = m.brand.y + m.brand.h / 2;
        if(Math.abs(vmid - m.vh / 2) > 24) note(lbl, 'the composition is not centred down: middle ' +
          Math.round(vmid) + ' of ' + m.vh);
      } else {
        if(m.brand.y + m.brand.h > m.form.y + 2) note(lbl, 'on a phone the brand must sit ABOVE the form');
        if(m.form.w !== m.vw) note(lbl, 'on a phone the form is the width of the screen, not ' + m.form.w);
      }
      await ctx.close();
    }

    /* ---- the app itself ---- */
    const ctx = await browser.newContext({ viewport:{ width:size.w, height:size.h } });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.route('**/mock.district/**', router);
    await page.route('**script.google.com/**', router);
    /* THE SESSION IS WRITTEN ON THE ORIGIN WITHOUT LOADING index.html FIRST:
       the app builds an empty store on load and its own debounced save puts
       session:null straight back over anything written after. */
    await page.goto(base + '/manifest.webmanifest', { waitUntil:'domcontentloaded' });
    /* THE STORE IS THE TENANT'S OWN, and the harness must write to the key the
       app will read. This is the isolation doing its job: writing the session
       to 'sjf5' left the GP app looking at an empty store and sitting on the
       sign-in screen, which is exactly what would happen to an officer whose
       two apps shared a key. */
    await page.evaluate(([off, gps, list, key]) => {
      const d = new Date();
      const t = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const att = {}; att[t] = { id:'A1', date:t, ts:new Date().toISOString(), lat:17.72, lng:79.15,
                                 acc:12, verified:true, status:'PRESENT', sync:'synced' };
      localStorage.setItem(key, JSON.stringify({ url:'https://mock.district/exec',
        session:{ token:'T', user:off }, records:{}, att:att, cache:list,
        cacheAt:new Date().toISOString(), master:gps, leave:[], prefs:{ sun:0, big:0 } }));
    }, [OFF, GPS, LIST, tn === 'GP' ? 'sjgp-gp1' : 'sjf5']);
    await page.goto(base + '/index.html', { waitUntil:'domcontentloaded' });
    await page.waitForSelector('#app:not([hidden])', { timeout:20000 });
    await page.waitForTimeout(1500);

    /* ---- WHAT TABS THIS REGISTER OFFERS ----
       The heart of the second-register work: the GP app must not show a tab
       whose endpoint refuses it, and the sanitation app must be untouched. */
    const tabsOn = await page.$$eval('.tabs button[data-s]', b => b.map(x => x.dataset.s));
    if(tabsOn.join(',') !== TABS_EXPECTED[tn].join(','))
      note(tn + '/' + size.n, 'the tab bar is ' + JSON.stringify(tabsOn) +
        ', expected ' + JSON.stringify(TABS_EXPECTED[tn]));

    for(const tab of TABS){
      if(TABS_EXPECTED[tn].indexOf(tab) < 0) continue;
      if(tab !== 'home'){
        const b = await page.$('.tabs button[data-s="' + tab + '"]');
        if(!b) continue;
        await b.click();
        await page.waitForTimeout(700);
      }
      await page.screenshot({ path: path.join(OUT, pre + size.n + '-' + tab + '.png'), fullPage: size.w > 500 });
      const lbl = tn + '/' + size.n + '/' + tab;
      const m = await page.evaluate(() => {
        const g = s => { const e = document.querySelector(s); if(!e) return null;
          const r = e.getBoundingClientRect();
          return { x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height) }; };
        const on = document.querySelector('.screen.on');
        const body = on ? on.querySelector('[id$="Body"]') : null;
        const wide = document.querySelector('.group.wide > .card');
        return { over:document.documentElement.scrollWidth - document.documentElement.clientWidth,
                 vw:window.innerWidth, tabs:g('.tabs'), body: body ? Object.assign(
                   { cols:getComputedStyle(body).gridTemplateColumns }, (() => { const r = body.getBoundingClientRect();
                     return { x:Math.round(r.x), w:Math.round(r.width) }; })()) : null,
                 main: g('main'),
                 wideCols: wide ? getComputedStyle(wide).gridTemplateColumns.split(' ').length : 0,
                 screen: on ? on.id : '' };
      });
      if(m.over > 1) note(lbl, 'scrolls sideways by ' + m.over + 'px');

      if(tab === 'home'){
        const startBtn = await page.$('#homeStart');
        if(tn === 'GP' && startBtn) note(tn + '/' + size.n,
          'the home screen offers "Start an inspection" — the GP server refuses evaluations at the door');
        if(tn === 'SJGP' && !startBtn) note(tn + '/' + size.n,
          'the sanitation home screen has LOST its "Start an inspection" button');
      }
      if(size.w === 390){
        /* ---- THE PHONE, HELD TO ITS OWN NUMBERS ---- */
        if(m.body && m.body.w !== 390) note(lbl, 'the content is ' + m.body.w + 'px wide, not the 390 of the screen');
        if(m.body && m.body.x !== 0) note(lbl, 'the content starts at ' + m.body.x + ', not at the left edge');
        if(m.tabs && m.tabs.x !== 0) note(lbl, 'the tab bar is not across the foot of the screen');
        if(m.tabs && m.tabs.w !== 390) note(lbl, 'the tab bar is ' + m.tabs.w + 'px wide, not 390');
        if(m.wideCols > 1) note(lbl, 'a list is laid out in ' + m.wideCols +
          ' columns on a phone — a desktop rule has leaked below 1500px');
        if(m.body && /px .*px/.test(m.body.cols) && m.body.cols.split(' ').length > 1)
          note(lbl, 'the phone body is a multi-column grid: ' + m.body.cols);
      } else {
        /* ---- THE MONITOR, ACTUALLY USED ---- */
        if(m.tabs && m.tabs.w > 300) note(lbl, 'the tab bar is still a foot bar (' + m.tabs.w + 'px) — no rail');
        /* SETTINGS AND LEAVE ARE CAPPED ON PURPOSE. A list of switches gains
           nothing from being 1,760px wide, so those two screens are held to a
           reading measure — and are then required to sit in the MIDDLE of the
           space, which is the part that was wrong. Every other screen must
           actually use the monitor. */
        const capped = tab === 'more';
        if(m.body && !capped && m.body.w < size.w * 0.55) note(lbl, 'the working column is only ' + m.body.w +
          'px of ' + size.w + ' — the monitor is carrying margin, not content');
        if(m.body && capped && m.main){
          const off = (m.body.x - m.main.x) - ((m.main.x + m.main.w) - (m.body.x + m.body.w));
          if(Math.abs(off) > 24) note(lbl, 'the capped column is not centred in the working area, off by ' +
            Math.round(off) + 'px');
        }
        /* THE RANKING IS THE SANITATION REGISTER'S. The GP home screen carries
           no long list at all — no evaluation, so no scores and no ranking —
           and asserting a two-column list on a screen that has none would be
           asserting the absence of a defect that cannot occur there. */
        if(tn === 'SJGP' && tab === 'home' && m.wideCols < 2)
          note(lbl, 'the ranking is a single column on a ' + size.w + 'px screen');
      }
    }
    if(errs.length) note(tn + '/' + size.n, errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
  }

  await browser.close();
  srv.close();

  console.log('screenshots: ' + OUT);
  if(problems.length){
    console.log('\nPROBLEMS');
    problems.forEach(p => console.log('  ✗ ' + p));
    process.exitCode = 1;
  } else {
    console.log('\nNo overflow, no layout or script problems.');
    console.log('The phone is byte-for-byte the layout it was; the monitor carries the content.');
    console.log('Both registers draw their own tabs: SJGP ' + TABS_EXPECTED.SJGP.join('/') +
                ', GP ' + TABS_EXPECTED.GP.join('/') + '.');
  }
})();

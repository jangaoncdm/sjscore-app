/* THE RENDER-AND-LOOK PASS.
   A validator checks colour, not layout. This drives the real console against
   a real backend payload, screenshots every view at three widths in both
   themes, and MEASURES the chart geometry — because "the cards line up" is a
   claim that can be checked with numbers instead of believed.

   Usage: node tests/render-console.js [outdir] */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', 'app');
const FIX = path.join(__dirname, 'fixture-dashboard.json');
const OUT = process.argv[2] || path.join(__dirname, '..', 'Info', 'console-render');

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.png':'image/png', '.webmanifest':'application/manifest+json', '.json':'application/json' };

function serve(){
  return new Promise(res => {
    const srv = http.createServer((req, rq) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      /* the config files the district publishes beside the console — one per
         register. It reads them at boot to learn each register's address, so a
         harness that does not serve them is not serving production. */
      if(u === '/config.js' || u === '/gp/config.js' || u === '/hrms/config.js'){
        rq.writeHead(200, { 'Content-Type':'text/javascript' });
        const gp = u.indexOf('/gp/') === 0, hr = u.indexOf('/hrms/') === 0;
        rq.end("window.SJGP_SERVER='" +
               (gp ? 'https://gp.district/exec' : hr ? 'https://hrms.district/exec' : 'https://mock.district/exec') +
               "';" + (gp ? "window.SJGP_TENANT='GP';" : ''));
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

const VIEWS = ['overview', 'attendance', 'villages', 'schedule', 'leave', 'notices', 'map', 'duty', 'mock', 'admin'];
/* the Not-measured reading is its own call, like the schedule */
const MOCKFIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-mockloc.json'), 'utf8'));
/* the leave register is its own call too, read when the Leave screen is opened */
const LEAVEFIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-leave.json'), 'utf8'));
const ATTCALFIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-attcal.json'), 'utf8'));
/* the filing schedule is fetched by its own call, so it needs its own fixture —
   built by fixture-dashboard.js off the same real backend run */
const SCHEDFIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-schedule.json'), 'utf8'));

/* MARKING OUT, as the feature's own endpoint answers it. The tile and the
   Out column read this and not the dashboard payload, so without a fixture
   of its own the panel would be measured empty — and an empty panel is
   exactly what the first run of this pass showed, reading
   'undefined of undefined' off the dashboard payload it had fallen back to. */
const OUTFIX = { ok:true, date:'2026-10-02', marked:87, closed:61, open:23, cannot:3,
  sanction:false,
  note:'A day left unclosed draws nothing — no reminder, no notice, no debit and no lock.',
  rows:[] };

/* THE OFFICER ROLL the Admin view reads. Shaped like op=roll's answer, with
   the three states that view has to draw: a man off the roll, a man with no
   PIN, and a number sitting on two rows. */
const ROLLFIX = { ok:true,
  roles:['PS','MPO','MSO','MPDO','DLPO','DPO','COLLECTOR'],
  mandals:['Bachannapeta','Chilpur','Devaruppula','Ghanpur (Stn)','Jangaon','Kodakandla',
           'Lingala Ghanpur','Narmetta','Palakurthy','Raghunathpalle','Tharigoppula','Zaffergadh'],
  rows:[
    { phone:'9000000001', name:'Sandeep Kumar Jha', role:'COLLECTOR', mandal:'', gp:'', email:'cdm@x', hasPin:true,  active:true,  rows:1 },
    { phone:'9848100201', name:'Rachakonda Upender', role:'PS',   mandal:'Raghunathpalle', gp:'Kodavatancha', email:'a@x', hasPin:true,  active:true,  rows:1 },
    { phone:'9848100202', name:'Gopagani Sandhya Rani', role:'PS', mandal:'Palakurthy',   gp:'Errabelli',    email:'b@x', hasPin:true,  active:true,  rows:1 },
    { phone:'9848100203', name:'Burra Bhanuchander', role:'PS',  mandal:'Devaruppula',   gp:'Ramboji Gudem', email:'c@x', hasPin:false, active:true,  rows:1 },
    { phone:'9848100204', name:'Donthi Praveen Kumar', role:'PS', mandal:'Jangaon',      gp:'Pedda Thanda (M)', email:'d@x', hasPin:true, active:true, rows:2 },
    { phone:'9848100205', name:'K. Ravi Kumar', role:'MPO',      mandal:'Chilpur',       gp:'',             email:'e@x', hasPin:true,  active:true,  rows:1 },
    { phone:'9848100206', name:'M. Sattaiah',   role:'MPDO',     mandal:'Narmetta',      gp:'',             email:'f@x', hasPin:true,  active:true,  rows:1 },
    { phone:'9848100207', name:'Gone Away',     role:'PS',       mandal:'Zaffergadh',    gp:'Old Charge',   email:'g@x', hasPin:true,  active:false, rows:1 }
  ] };
/* FIVE WIDTHS, BECAUSE THE CONSOLE RESIZES EVERYTHING (16.10.2026). Three
   widths found the phone and the 2K faults; what they could not see was the
   1366px laptop every mandal office actually owns and the 1920px monitor
   most desks have, which are the two widths the console is read on most. The
   two are driven in the light theme only — the dark theme is a palette, not
   a layout, and 2560, 1500 and 390 already prove it at both ends. Pass the
   widths you want as SIZES=1366,1920 to drive a few. */
const ALL_SIZES = [
  { w:2560, h:1440, n:'2560' }, { w:1920, h:1080, n:'1920', themes:['light'] },
  { w:1500, h:1000, n:'1500' }, { w:1366, h:768,  n:'1366', themes:['light'] },
  { w:390,  h:844,  n:'390' } ];
const SIZES = process.env.SIZES
  ? ALL_SIZES.filter(z => process.env.SIZES.split(',').includes(z.n))
  : ALL_SIZES;

/* ---- THE SECOND REGISTER, for the tenant switch ----
   Plainly different figures, so a screenshot of one cannot be mistaken for a
   screenshot of the other, and so the check below can prove the console
   actually re-read rather than redrawing what it already had. */
const GPFIX = JSON.parse(JSON.stringify(payloadRaw()));
function payloadRaw(){ return JSON.parse(fs.readFileSync(FIX, 'utf8')); }
(() => {
  GPFIX.totals = { officers:134, gps:180, due:133 };
  /* the place of duty the Gram Palana roll can measure against, which the
     sanitation roll has no coordinates for */
  GPFIX.today.present = GPFIX.today.present.slice(0, 91).map((r, i) =>
    Object.assign({}, r, { role:'GPO', dutyKm: Math.round((r.km || 1) * 10) / 10,
                           dutyGp: 'Village ' + (i + 1) }));
  GPFIX.today.onLeave = GPFIX.today.onLeave.slice(0, 3);
  GPFIX.today.absent  = GPFIX.today.absent.slice(0, 5).map(r => Object.assign({}, r, { role:'GPO' }));
  /* the Gram Palana register takes no evaluation: no filings, no grades */
  GPFIX.month = { rows:[], grades:{A:0,B:0,C:0,D:0}, avg:null, rfCount:0 };
  GPFIX.trend = [];
  GPFIX.coverage = [];
})();

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const payload = JSON.parse(fs.readFileSync(FIX, 'utf8'));
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch();
  const problems = [];

  for(const size of SIZES){
    for(const theme of (size.themes || ['light', 'dark'])){
      const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h },
        deviceScaleFactor: 1 });
      await ctx.addInitScript(([data, th]) => {
        const who = { name: 'Sandeep Kumar Jha', role: 'COLLECTOR', phone: '9000000001' };
        localStorage.setItem('sjf5', JSON.stringify({
          url: 'https://mock.district/exec', session: { token: 'T', user: who } }));
        /* THE SECOND REGISTER'S OWN STORE. The console reads it because both
           apps are served from one domain; the token is its own and means
           nothing to the other register's server. */
        localStorage.setItem('sjgp-gp1', JSON.stringify({
          url: 'https://gp.district/exec', session: { token: 'TGP', user: who } }));
        localStorage.removeItem('sjgp-console-tenant');
        localStorage.setItem('sjgp-theme', th);
        localStorage.setItem('sjgp-console-seen', '{}');
      }, [null, theme]);

      const page = await ctx.newPage();
      /* the district's own reply, served locally */
      /* each register answers on its own address, as they will in the field */
      await page.route('**/mock.district/**', r => {
        const u = r.request().url();
        const gp = /gp\.district/.test(u);
        r.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify(gp ? GPFIX
                             : /op=roll/.test(u) ? ROLLFIX
                             : /op=schedule/.test(u) ? SCHEDFIX
                             : /op=mockloc/.test(u) ? MOCKFIX
                             : /op=leaveRegister/.test(u) ? LEAVEFIX
                             : /op=attCalendar/.test(u) ? ATTCALFIX
                             : /op=outday/.test(u) ? OUTFIX : payload) });
      });
      await page.route('**/gp.district/**', r =>
        r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(GPFIX) }));
      /* no map tiles over the wire in a render check */
      await page.route('**tile.openstreetmap.org**', r => r.abort());

      const errs = [];
      page.on('pageerror', e => errs.push(String(e)));
      /* the tile requests are aborted by this harness on purpose; their
         failures are the harness talking to itself, not a defect of the page */
      page.on('console', m => {
        const t = m.text();
        if(m.type() === 'error' && !/ERR_FAILED|tile\.openstreetmap/.test(t)) errs.push('console: ' + t);
      });

      await page.goto(base + '/dashboard.html', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#app:not([hidden])', { timeout: 20000 });
      await page.waitForTimeout(700);

      /* THE PASS DRIVES WHAT A PERSON WOULD ACTUALLY TOUCH. Below 760 the
         rail is a drawer behind More and the destinations are in the bottom
         bar, so clicking the rail here was clicking something no reader can
         see. Four destinations are in the bar; the rest are reached the way
         a reader reaches them, by opening the drawer first. */
      const phone = size.w <= 760;
      const go = async v => {
        if(!phone) return page.click('#nav [data-v="' + v + '"]');
        const inBar = await page.$('#bnav [data-v="' + v + '"]');
        if(inBar && await inBar.isVisible()) return inBar.click();
        await page.click('#navMore');
        await page.waitForTimeout(120);
        await page.click('#nav [data-v="' + v + '"]');
      };

      for(const v of VIEWS){
        await go(v);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(450);
        await page.screenshot({ path: path.join(OUT, size.n + '-' + theme + '-' + v + '.png'),
          fullPage: size.w > 500 });

        /* ---- THE SANITATION REGISTER IS FENCED (10.10.2026), SO THE FIGURE
           THE FENCE DECIDED ON IS THE FIGURE SHOWN. The console printed only
           the distance from the middle of the mandal, and a Secretary at his
           own office on the far edge of Lingala Ghanpur read "17.3 km"
           against his name while his mark had passed the fence. Both
           distances are drawn now, officer by officer, and the mandal one is
           kept because a village the roll has not placed has nothing else. */
        /* ---- ATTENDANCE, DAY BY DAY (16.10.2026): the year's calendar on the
           Overview and on the Attendance screen, off its own call. The fixture
           plants a fortnight of marks; the map must show them, total the
           weeks, offer the measures, and say that due is today's roll. ---- */
        if(v === 'overview' || v === 'attendance'){
          const lbl = size.n + '/' + theme + '/' + v + '/calendar';
          await page.waitForTimeout(500);
          const txt = await page.$eval('#g', e => e.innerText);
          /* THE LAST 30 DAYS BY DEFAULT (25.10.2026), squeezed into one row:
             thirty days, the planted fortnight tinted, the figure printed on
             the day on anything wider than a phone, and the day square. */
          const strip = await page.evaluate(() => {
            const s = document.querySelector('#atcCal.atcstrip'); if(!s) return null;
            const cs = [...s.querySelectorAll('.c')], tinted = cs.filter(c => /k[1-5]/.test(c.className));
            const r = cs[0].getBoundingClientRect();
            return { n: cs.length, tinted: tinted.length, withNum: tinted.filter(c => /^\d+$/.test(c.textContent.trim())).length,
                     w: Math.round(r.width), h: Math.round(r.height), dates: s.querySelectorAll('.dd').length,
                     fontPx: parseFloat(getComputedStyle(cs[0]).fontSize) || 0 };
          });
          if(!strip) problems.push(lbl + ': the attendance calendar does not open on the last 30 days');
          else {
            if(strip.n !== 30) problems.push(lbl + ': the strip has ' + strip.n + ' days, not 30');
            if(strip.tinted < 8) problems.push(lbl + ': the strip has ' + strip.tinted + ' filled days, expected the planted fortnight');
            if(size.w > 760 && strip.withNum !== strip.tinted) problems.push(lbl + ': ' + (strip.tinted - strip.withNum) + ' tinted days carry no figure');
            if(size.w <= 760 && strip.fontPx > 0) problems.push(lbl + ': a phone day draws a figure it cannot fit (' + strip.fontPx + 'px)');
            if(Math.abs(strip.w - strip.h) > 3) problems.push(lbl + ': a strip day is ' + strip.w + 'x' + strip.h + 'px — not square');
            if(strip.w > 50) problems.push(lbl + ': a strip day is ' + strip.w + 'px wide — the strip sprawls');
            if(strip.dates !== 30) problems.push(lbl + ': ' + strip.dates + ' dates under 30 days');
          }
          if(!/Attendance, day by day · the last 30 days/.test(txt)) problems.push(lbl + ': the heading does not name the window');
          /* the window is a row of tabs, and the year is one tab away with its weeks and totals */
          const wins = await page.$$eval('#atcWindow [data-atcw]', os => os.map(o => o.dataset.atcw)).catch(() => []);
          if(!(wins.includes('21') && wins.includes('30') && wins.includes('year'))) problems.push(lbl + ': the windows are not all offered');
          await page.click('#atcWindow [data-atcw="21"]'); await page.waitForTimeout(350);
          const n21 = await page.$$eval('#atcCal.atcstrip .c', cs => cs.length).catch(() => 0);
          if(n21 !== 21) problems.push(lbl + ': the 21-day window drew ' + n21 + ' days');
          await page.click('#atcWindow [data-atcw="year"]'); await page.waitForTimeout(350);
          const cells = await page.$$eval('#atcCal td.c', cs => cs.filter(c => /k[1-5]/.test(c.className)).length).catch(() => 0);
          if(cells < 8) problems.push(lbl + ': the year calendar has ' + cells + ' filled days, expected the planted fortnight');
          const wk = await page.$$eval('#atcCal td.w', ws => ws.filter(w => w.textContent.trim()).length).catch(() => 0);
          if(wk < 2) problems.push(lbl + ': the week totals row is empty');
          const yearSel = await page.$('#atcYear');
          if(!yearSel) problems.push(lbl + ': the year has no year select');
          if(!/Due is today/i.test(txt)) problems.push(lbl + ': the screen does not say that due is today’s roll');
          const opts = await page.$$eval('#atcMeasure [data-atc]', os => os.map(o => o.dataset.atc)).catch(() => []);
          if(!(opts.includes('notmarked') && opts.includes('late') && opts.includes('leave'))) problems.push(lbl + ': the measures are not all offered');
          /* AND THEY ARE TABS THAT WORK: pressing one redraws the map under
             that measure, and the strip is as wide as the grid, not a column
             of it — the fault the dropdown had. */
          const stripW = await page.$eval('#atcMeasure', e => Math.round(e.getBoundingClientRect().width)).catch(() => 0);
          if(stripW < 200) problems.push(lbl + ': the measure strip is ' + stripW + 'px wide — squeezed into a grid column');
          await page.click('#atcMeasure [data-atc="late"]');
          await page.waitForTimeout(350);
          const sel = await page.$eval('#atcMeasure [data-atc="late"]', e => e.getAttribute('aria-selected')).catch(() => '');
          if(sel !== 'true') problems.push(lbl + ': pressing a measure tab does not select it');
          const hd = await page.$eval('#g', e => e.innerText);
          if(!/Marked late · /.test(hd)) problems.push(lbl + ': the calendar heading does not follow the measure chosen');
          await page.click('#atcMeasure [data-atc="marked"]');
          await page.waitForTimeout(350);
          /* A SQUARE DAY, at every width: the cell the page actually drew */
          const cell = await page.$eval('#atcCal td.c', e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }).catch(() => null);
          if(cell && Math.abs(cell.w - cell.h) > 6) problems.push(lbl + ': a calendar day is ' + cell.w + 'x' + cell.h + 'px — not square');
          if(!/CSV · week by week/.test(txt)) problems.push(lbl + ': no way to download the days');
          /* back to the default, so the next view and the screenshot show what the Collector opens on */
          await page.click('#atcWindow [data-atcw="30"]'); await page.waitForTimeout(350);
          const back = await page.$('#atcCal.atcstrip');
          if(!back) problems.push(lbl + ': the 30-day window does not come back');
        }
        /* ---- THE MONTH IS A HEAT MAP WITH THE FIGURES ON IT (16.10.2026 as a
           fortnight; turned on its side and stretched to 30 days 25.10.2026):
           thirty dated columns, six measures down a sticky left column,
           tinted tiles under the figures, each row to its own high, the
           Sunday off, the figures still there to read, no sprawl. ---- */
        if(v === 'overview'){
          const lbl = size.n + '/' + theme + '/overview/month';
          const d = await page.evaluate(() => {
            const t = document.querySelector('.dayhm'); if(!t) return null;
            const tinted = t.querySelectorAll('td.c.k1,td.c.k2,td.c.k3,td.c.k4,td.c.k5');
            const withNum = [...tinted].filter(c => /^\d+$/.test(c.textContent.trim())).length;
            const r = t.querySelector('td.c').getBoundingClientRect();
            return { tinted: tinted.length, withNum, off: t.querySelectorAll('td.c.off').length,
                     dark: [...t.querySelectorAll('td.c.k5')].length, rows: t.querySelectorAll('tbody tr').length,
                     days: t.querySelectorAll('thead th.dy').length, w: Math.round(r.width),
                     sticky: getComputedStyle(t.querySelector('th.lbl')).position, clickable: t.querySelectorAll('[data-dd]').length };
          });
          if(!d) problems.push(lbl + ': the day-by-day table is not a heat map');
          else {
            if(d.days !== 30) problems.push(lbl + ': ' + d.days + ' dated columns, not 30');
            if(d.rows !== 6) problems.push(lbl + ': ' + d.rows + ' measure rows, not 6');
            if(d.tinted < 20) problems.push(lbl + ': only ' + d.tinted + ' tinted cells');
            if(d.withNum !== d.tinted) problems.push(lbl + ': ' + (d.tinted - d.withNum) + ' tinted cells carry no figure');
            if(d.dark < 1) problems.push(lbl + ': no row reaches its own high');
            if(d.off < 1) problems.push(lbl + ': the Sunday is not drawn off');
            if(d.w > 50) problems.push(lbl + ': a day column is ' + d.w + 'px wide — the month sprawls');
            if(d.sticky !== 'sticky') problems.push(lbl + ': the measure labels do not stay put when the month scrolls');
            if(d.clickable < 30 * 7) problems.push(lbl + ': only ' + d.clickable + ' cells open their day');
          }
          const hd = await page.$eval('#g', e => e.innerText);
          if(!/Day by day · the last 30 days/.test(hd)) problems.push(lbl + ': the heading still says fortnight');
        }
        if(v === 'attendance'){
          const lbl = size.n + '/' + theme + '/attendance';
          const txt = await page.$eval('#g', e => e.innerText);
          /* THE SEGMENT IS TABS ACROSS THE GRID (16.10.2026). The dropdown
             it replaced sat in one twelfth of the grid, 60px wide with its
             caption wrapping word by word beneath it, at every width. */
          const seg = await page.evaluate(() => {
            const t = document.getElementById('segTabs'); if(!t) return null;
            const bar = t.closest('.segbar'), g = document.getElementById('g');
            return { tabs: t.querySelectorAll('[data-seg]').length,
                     barW: Math.round(bar.getBoundingClientRect().width), gridW: Math.round(g.getBoundingClientRect().width),
                     sel: (t.querySelector('[aria-selected="true"]') || {}).dataset ? t.querySelector('[aria-selected="true"]').dataset.seg : '' };
          });
          if(!seg) problems.push(lbl + ': no segment tabs');
          else {
            if(seg.tabs !== 3) problems.push(lbl + ': ' + seg.tabs + ' segment tabs, expected three rolls');
            if(seg.barW < seg.gridW - 2) problems.push(lbl + ': the segment bar is ' + seg.barW + 'px of a ' + seg.gridW + 'px grid — it is in one column again');
            if(seg.sel !== 'field') problems.push(lbl + ': the field officers are not the roll shown first');
            await page.click('#segTabs [data-seg="all"]');
            await page.waitForTimeout(400);
            const after = await page.$eval('#segTabs [data-seg="all"]', e => e.getAttribute('aria-selected')).catch(() => '');
            if(after !== 'true') problems.push(lbl + ': pressing a segment tab does not select it');
            const note = await page.$eval('#g', e => e.innerText);
            if(!/Both rolls together/.test(note)) problems.push(lbl + ': the note does not follow the segment chosen');
            await page.click('#segTabs [data-seg="field"]');
            await page.waitForTimeout(400);
          }
          /* THE WIDE TIER (above 1980): seven tiles in one row, the two
             half-screen tables side by side. Below it, neither. */
          const wide = await page.evaluate(() => {
            const ks = [...document.querySelectorAll('.kpirow .kpi')].map(k => Math.round(k.getBoundingClientRect().top));
            const w6 = [...document.querySelectorAll('.panel.w6')].map(p => Math.round(p.getBoundingClientRect().top));
            return { tiles: ks.length, tileRows: new Set(ks).size, w6: w6.length, w6Rows: new Set(w6).size };
          });
          if(size.w >= 1980){
            if(wide.tiles >= 6 && wide.tileRows !== 1) problems.push(lbl + ': ' + wide.tiles + ' tiles sit in ' + wide.tileRows + ' rows on a 2K screen');
            if(wide.w6 === 2 && wide.w6Rows !== 1) problems.push(lbl + ': the refused and the marked-away tables are stacked on a 2K screen');
          } else if(size.w > 760){
            if(wide.w6 === 2 && wide.w6Rows !== 2) problems.push(lbl + ': the wide tier has leaked below 1980px');
          }
          if(!/from place of duty/i.test(txt))
            problems.push(lbl + ': the attendance screen does not carry the distance from the place of duty, which is what the fence decides on');
          if(!/from mandal/i.test(txt))
            problems.push(lbl + ': the distance from the mandal was dropped, and an unplaced village has nothing else');
          if(!/place of duty/i.test(txt))
            problems.push(lbl + ': the officer-by-officer table has no place-of-duty column');
        }
        /* ---- AND THE MPO AND THE MPDO (12.10.2026): the screen says, mandal
           by mandal, whether they are fenced off the roster's office, off the
           headquarters village standing in for it, or not at all. The fixture
           seeds all three states on purpose; a screen that has never been
           drawn with an unfenced mandal has never shown the Collector the one
           line he has to act on. */
        /* ---- NOT MEASURED (12.10.2026): the screen the fence cannot be. The
           fixture plants a point pinned to the village office at one metre,
           a metre at points that move, and two officers on one point; the
           screen must show the first as a finding, the second as a lead and
           not a finding, the third as a shared morning — and must say, in
           words, that it accuses nobody. ---- */
        if(v === 'mock'){
          const lbl = size.n + '/' + theme + '/mock';
          await page.waitForTimeout(600);
          const txt = await page.$eval('#g', e => e.innerText);
          const nF = await page.$$eval('#mkFind tbody tr', rs => rs.filter(r => !r.querySelector('.empty')).length).catch(() => 0);
          const nL = await page.$$eval('#mkLead tbody tr', rs => rs.filter(r => !r.querySelector('.empty')).length).catch(() => 0);
          if(nF < 1) problems.push(lbl + ': the pinned officer is not shown as a finding');
          if(nL < 1) problems.push(lbl + ': the moving-metre officer is not shown as a lead');
          if(!/a typed point/i.test(txt)) problems.push(lbl + ': the identical-point verdict is not drawn');
          if(!/the point moves/i.test(txt)) problems.push(lbl + ': a metre at moving points is not told apart from a pinned one');
          if(!/One point, two officers/i.test(txt)) problems.push(lbl + ': the shared mornings are not shown');
          if(!/refuses a mark|accuses nobody|Evidence, not a charge|evidence, not a charge/i.test(txt))
            problems.push(lbl + ': the screen does not say that it accuses nobody');
          if(!/CSV/.test(txt)) problems.push(lbl + ': no way to download the reading');
          const opened = await page.$$eval('#mkFind details', ds => ds.length);
          if(opened < 1) problems.push(lbl + ': a finding does not open to its mornings');
        }
        /* ---- THE LEAVE REGISTER (16.10.2026): the heat map and the table are
           drawn off their own call; the fixture plants spells across the year,
           one crossing a month edge, one officer with casual leave exhausted
           and a refused application. The screen must show the months, the
           balance, say that awaiting is not debited, and offer the CSV. ---- */
        if(v === 'leave'){
          const lbl = size.n + '/' + theme + '/leave';
          await page.waitForTimeout(600);
          const txt = await page.$eval('#g', e => e.innerText);
          const cells = await page.$$eval('#lvHeat td.c', cs => cs.filter(c => /k[1-5]/.test(c.className)).length).catch(() => 0);
          if(cells < 5) problems.push(lbl + ': the heat map has ' + cells + ' filled cells, expected the planted spells');
          const months = await page.$$eval('#lvHeat thead th', ths => ths.map(t => t.textContent.trim())).catch(() => []);
          if(!(months.includes('Feb') && months.includes('Dec'))) problems.push(lbl + ': the heat map does not run January to December');
          const rows = await page.$$eval('#lvReg tbody tr', rs => rs.filter(r => !r.querySelector('.empty')).length).catch(() => 0);
          if(rows < 5) problems.push(lbl + ': the register table has ' + rows + ' lines');
          if(!/left/i.test(txt)) problems.push(lbl + ': no balance is printed');
          if(!/no yearly figure/i.test(txt)) problems.push(lbl + ': medical leave is not said to have no yearly figure');
          if(!/not debited/i.test(txt)) problems.push(lbl + ': the screen does not say that awaiting is not debited');
          if(!/exhausted/i.test(txt)) problems.push(lbl + ': no tile counts casual leave exhausted');
          const left0 = await page.$$eval('#lvReg .left0', es => es.length).catch(() => 0);
          if(left0 < 1) problems.push(lbl + ': the officer whose casual leave is exhausted is not marked');
          if(!/CSV · the register/.test(txt)) problems.push(lbl + ': no way to download the register');
          const calc = await page.$$eval('#lvCal td.c', cs => cs.filter(c => /k[1-5]/.test(c.className)).length).catch(() => 0);
          if(calc < 10) problems.push(lbl + ': the district calendar has ' + calc + ' filled days, expected the planted spells');
          const wk = await page.$$eval('#lvCal td.w', ws => ws.filter(w => w.textContent.trim()).length).catch(() => 0);
          if(wk < 3) problems.push(lbl + ': the week totals row is empty');
          if(!/officer-days/.test(txt)) problems.push(lbl + ': the district calendar does not total its officer-days');
          if(!/busiest week/i.test(txt)) problems.push(lbl + ': the busiest week is not named');
          if(!/CSV · week by week/.test(txt)) problems.push(lbl + ': no way to download the weeks');
          const sel = await page.$$eval('#lvYear option', os => os.length).catch(() => 0);
          if(sel < 1) problems.push(lbl + ': no year to choose');
        }
        if(v === 'duty'){
          const lbl = size.n + '/' + theme + '/duty';
          const txt = await page.$eval('#g', e => e.innerText);
          if(!/Where the MPO and the MPDO are fenced/i.test(txt))
            problems.push(lbl + ': the Place of duty screen says nothing about the mandal officers');
          if(!/the headquarters village/i.test(txt))
            problems.push(lbl + ': a mandal fenced off the headquarters village is not named as a derivation');
          if(!/the mandal office/i.test(txt))
            problems.push(lbl + ': a mandal fenced off the roster’s own office is not shown as such');
          if(!/not placed — not fenced/i.test(txt))
            problems.push(lbl + ': the mandal that fences nobody is not named');
          if(!/Mandal offices placed/i.test(txt))
            problems.push(lbl + ': no tile says how much of the mandal-officer order is in force');
        }

        /* ---- THE MEASUREMENT.
           Cards that sit in the SAME ROW must line up: same panel height, and
           their plots starting at the same offset from the top of the card.
           Comparing every plot on the page instead would be meaningless here —
           this console keeps a 12-column editorial layout, so a full-width
           card and a third-width card are different sizes on purpose. Rows are
           found by the panels' shared top edge. ---- */
        const geo = await page.$$eval('.panel', ps => ps
          .filter(p => p.querySelector('.plot'))
          .map(p => {
            const pr = p.getBoundingClientRect(), q = p.querySelector('.plot').getBoundingClientRect();
            return { rowTop: Math.round(pr.top), panelH: Math.round(pr.height),
                     plotTop: Math.round(q.top - pr.top), plotH: Math.round(q.height),
                     /* a card carrying a control strip above its plot cannot start
                        level with a card that has none, and padding the other card
                        with 75px of nothing would be the worse of the two designs.
                        Named here so the exception is on the record, not hidden. */
                     furniture: !!p.querySelector('.mtabs'),
                     /* NAME THE CARD. Two bare offsets say a row is wrong and
                        leave you to find out which card and why; the heading
                        and the measured height of the heading block say it
                        outright. The lesson is the pre-flight's: a message
                        true of a thousand faults is not a message. */
                     title: ((p.querySelector('.hd') || {}).textContent || '(no heading)')
                       .trim().slice(0, 38),
                     hdH: p.querySelector('.hd')
                       ? Math.round(p.querySelector('.hd').getBoundingClientRect().height) : 0 };
          }));
        const rows = {};
        geo.forEach(g => { (rows[g.rowTop] = rows[g.rowTop] || []).push(g); });
        Object.keys(rows).forEach(k => {
          const r = rows[k];
          if(r.length < 2) return;
          const hs = [...new Set(r.map(x => x.panelH))];
          const plain = r.filter(x => !x.furniture);
          const os = [...new Set(plain.map(x => x.plotTop))];
          const label = size.n + '/' + theme + '/' + v + ' row@' + k;
          if(hs.length > 1) problems.push(label + ': cards in one row differ in height ' + JSON.stringify(hs));
          if(os.length > 1) problems.push(label + ': plots in one row start at different offsets — ' +
            plain.map(x => '"' + x.title + '" plot at ' + x.plotTop + ' (heading ' + x.hdH + 'px)').join(' vs '));
          if(r.length !== plain.length) console.log('    (' + label + ': one card carries a tab strip above its plot — offset exempt)');
        });
        if(geo.length) console.log('  ' + size.n + '/' + theme + '/' + v + ' — ' + geo.length +
          ' chart card(s) in ' + Object.keys(rows).length + ' row(s); plot heights ' +
          JSON.stringify([...new Set(geo.map(g => g.plotH))]));

        /* ---- overflow: nothing may push the page sideways ---- */
        const over = await page.evaluate(() =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if(over > 1) problems.push(size.n + '/' + theme + '/' + v + ': page scrolls sideways by ' + over + 'px');

        /* ---- the review of 29.10.2026: ticks that do not collide, a line chart
           drawn at its card's width, and tiles with no blank slot in a row ---- */
        const pol = await page.evaluate(() => {
          const out = [];
          document.querySelectorAll('svg.c-line').forEach(svg => {
            /* the date ticks share the foot line; the value ticks stand up the left */
            const all = [...svg.querySelectorAll('text.c-tick')].filter(e => e.getBoundingClientRect().width);
            const foot = Math.max(...all.map(e => Math.round(e.getBoundingClientRect().top)));
            const te = all.filter(e => Math.abs(e.getBoundingClientRect().top - foot) < 3).sort((p, q) => p.getBoundingClientRect().left - q.getBoundingClientRect().left), t = te.map(e => e.getBoundingClientRect());
            for(let i = 1; i < t.length; i++) if(t[i].left < t[i-1].right - 1) { out.push('two date ticks overlap on a line chart: ' + te[i-1].textContent + ' / ' + te[i].textContent + ' (' + Math.round(t[i-1].right - t[i].left) + 'px)'); break; }
            const vb = svg.viewBox.baseVal, w = svg.getBoundingClientRect().width;
            if(vb && w && Math.abs(vb.width - w) > 40) out.push('a line chart is drawn ' + Math.round(vb.width) + ' wide and scaled to ' + Math.round(w));
          });
          document.querySelectorAll('.kpirow').forEach(row => {
            const ks = [...row.children].filter(k => k.classList.contains('kpi'));
            if(ks.length < 2) return;
            const rb = row.getBoundingClientRect(), tops = {};
            ks.forEach(k => { const r = k.getBoundingClientRect(); const y = Math.round(r.top); tops[y] = Math.max(tops[y] || 0, r.right); });
            Object.values(tops).forEach(right => { if(rb.right - right > 60) out.push('a row of tiles leaves a blank slot of ' + Math.round(rb.right - right) + 'px'); });
          });
          return [...new Set(out)];
        });
        pol.forEach(m => problems.push(size.n + '/' + theme + '/' + v + ': ' + m));
        /* ---- any chart text still wearing a hardcoded hex? ---- */
        const hard = await page.$$eval('.plot [style*="#"], .plot [fill^="#"], .plot [stroke^="#"]',
          els => els.slice(0, 6).map(e => e.tagName + ' ' + (e.getAttribute('style') || '').slice(0, 60)));
        if(hard.length) problems.push(size.n + '/' + theme + '/' + v + ': hardcoded colour in a chart — ' + JSON.stringify(hard));
      }
      /* ================= THE PHONE'S NAVIGATION =================
         THE DEFECT THIS REPLACED: below 760 the rail went static and laid
         thirteen full-width buttons down the page, so the first figure was
         roughly 840px below the top and a supervisor scrolled a screen and a
         half of menu to reach it. Asserted by the numbers, because "it looks
         better" is not a measurement. */
      if(size.w <= 760){
        const lbl = size.n + '/' + theme + '/phone-nav';
        await go('overview');
        await page.waitForTimeout(300);
        const nav = await page.evaluate(() => {
          const r = document.querySelector('.rail'), b = document.getElementById('bnav');
          const k = document.querySelector('.kpi') || document.querySelector('.panel');
          const br = b ? b.getBoundingClientRect() : null;
          return {
            railShown: r ? getComputedStyle(r).display !== 'none' : true,
            barShown: b ? getComputedStyle(b).display !== 'none' : false,
            barFixed: b ? getComputedStyle(b).position === 'fixed' : false,
            barBottom: br ? Math.round(br.bottom) : -1,
            viewportH: window.innerHeight,
            dests: b ? [...b.querySelectorAll('button')].filter(x => !x.hidden).length : 0,
            tap: b ? Math.min(...[...b.querySelectorAll('button')]
              .filter(x => !x.hidden).map(x => Math.round(x.getBoundingClientRect().height))) : 0,
            firstFigureTop: k ? Math.round(k.getBoundingClientRect().top + window.scrollY) : -1
          };
        });
        if(nav.railShown) problems.push(lbl + ': the rail is on screen at ' + size.w +
          'px — it must be a drawer behind More, not a stack of buttons above the content');
        if(!nav.barShown || !nav.barFixed) problems.push(lbl + ': no fixed navigation bar at the foot');
        if(nav.barBottom !== nav.viewportH) problems.push(lbl + ': the bar is not at the foot of the screen (' +
          nav.barBottom + ' of ' + nav.viewportH + ')');
        if(nav.dests < 4 || nav.dests > 5) problems.push(lbl + ': the bar carries ' + nav.dests +
          ' destinations; Material allows three to five');
        if(nav.tap < 44) problems.push(lbl + ': a bar destination is ' + nav.tap + 'px tall, under the 44px floor');
        /* the whole point of the change, as a number */
        if(nav.firstFigureTop > 320) problems.push(lbl + ': the first figure is ' + nav.firstFigureTop +
          'px down the page — the menu is still in front of the content');
        console.log('  ' + lbl + ' — rail hidden, ' + nav.dests + ' destinations at ' + nav.tap +
          'px, first figure ' + nav.firstFigureTop + 'px down');

        /* AND More MUST OPEN THE REST. A bar of five that cannot reach the
           other eight destinations is not navigation, it is a shortcut. */
        await page.click('#navMore');
        await page.waitForTimeout(220);
        const open = await page.evaluate(() => {
          const r = document.querySelector('.rail');
          return { shown: getComputedStyle(r).display !== 'none',
            reach: [...document.querySelectorAll('#nav [data-v]')].filter(b => !b.hidden).length };
        });
        if(!open.shown) problems.push(lbl + ': More does not open the rail');
        if(open.reach < 8) problems.push(lbl + ': the drawer reaches only ' + open.reach + ' destinations');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(180);
        const shut = await page.evaluate(() =>
          getComputedStyle(document.querySelector('.rail')).display !== 'none');
        if(shut) problems.push(lbl + ': Escape does not shut the drawer');
      }

      /* ================= THE TENANT SWITCH =================
         Only at the desktop widths and once per theme: it is one control and
         two payloads, not a layout to measure at every size. */
      if(size.w === 1500){
        const lbl = size.n + '/' + theme + '/tenant';
        await page.click('#nav [data-v="overview"]');
        await page.waitForTimeout(400);
        const sel = await page.$('#tenPick');
        if(!sel) problems.push(lbl + ': no register switch, though the device is signed in to both');
        else {
          const shown = await page.$eval('#tenPick', e => !e.hidden);
          if(!shown) problems.push(lbl + ': the register switch is hidden with two registers signed in');
          const before = await page.$eval('#g', e => e.innerText);
          await page.screenshot({ path: path.join(OUT, size.n + '-' + theme + '-tenant-sjgp.png') });

          await page.selectOption('#tenPick', 'GP');
          await page.waitForTimeout(1400);
          const after = await page.$eval('#g', e => e.innerText);
          await page.screenshot({ path: path.join(OUT, size.n + '-' + theme + '-tenant-gp.png') });

          /* IT ACTUALLY RE-READ. The two registers look alike — attendance,
             leave, a map — so identical text would mean the console had
             redrawn what it already had against a different address. */
          if(before === after) problems.push(lbl + ': switching register changed nothing on screen');

          /* THE HEADER SAYS WHICH ONE. Reading one register believing it is
             the other is the single mistake this control can cause. */
          const nm = await page.$eval('#tenName', e => e.hidden ? '' : e.textContent).catch(() => '');
          if(!/Gram Palana/i.test(nm) || /Swachh Jangaon/i.test(nm))
            problems.push(lbl + ': the header does not name the register being read — "' + nm + '"');

          /* THE GEO-TAGGED MARK AGAINST THE PLACE OF DUTY, officer by officer.
             It was only ever two summary tiles, and "where is the geo-tagging"
             is a question about a man and a morning, not about a percentage.
             The sanitation register has no coordinates to measure against and
             must NOT grow the column. */
          const attTxt = await (async () => {
            await page.click('#nav [data-v="attendance"]'); await page.waitForTimeout(800);
            return page.$eval('#g', e => e.innerText);
          })();
          /* the table headers are uppercased by CSS, so innerText gives
             "PLACE OF DUTY" — match case-blind or this cannot pass */
          if(!/place of duty/i.test(attTxt))
            problems.push(lbl + ': the GP attendance table does not carry the place of duty');
          if(!/marked away from the place of duty/i.test(attTxt))
            problems.push(lbl + ': the GP register still measures from the mandal, not the place of duty');
          if(attTxt.indexOf('Village 1') < 0)
            problems.push(lbl + ': no officer is shown the village he is posted to');

          /* A CIRCULAR IS ADDRESSED TO ROLES THIS REGISTER HAS. It offered
             Panchayat Secretaries and MPDOs on the Revenue register, none of
             whom exist there, so it would have reached nobody. */
          await page.click('#nav [data-v="advisory"]'); await page.waitForTimeout(800);
          const aud = await page.$$eval('#advAud option', o => o.map(x => x.textContent.trim())).catch(() => []);
          if(aud.length){
            if(aud.join(' ').indexOf('Panchayat') >= 0)
              problems.push(lbl + ': the GP circular composer still offers Panchayat roles — ' + JSON.stringify(aud));
            if(aud.join(' ').indexOf('Gram Palana Officers') < 0)
              problems.push(lbl + ': the GP circular composer does not offer this register’s own roles — ' + JSON.stringify(aud));
          }
          await page.click('#nav [data-v="overview"]'); await page.waitForTimeout(600);

          /* AND THE RAIL SHOWS ONLY WHAT THAT REGISTER HAS. The GP register
             takes no evaluation and carries no filing schedule; its server
             refuses both, so a rail item could only lead to an empty screen. */
          /* WHAT IS ON THE SCREEN, not what the property says. Reading
             x.hidden passed while every item was still visible, because the
             rail's own display:flex beats the UA's [hidden]{display:none}. */
          const vis = b => b.filter(x => x.offsetParent !== null &&
            getComputedStyle(x).display !== 'none').map(x => x.dataset.v);
          const railGp = await page.$$eval('#nav [data-v]', vis);
          ['villages', 'schedule', 'gpdp'].forEach(v => {
            if(railGp.indexOf(v) >= 0) problems.push(lbl + ': the GP rail still offers "' + v + '", which that register does not have');
          });
          if(railGp.indexOf('attendance') < 0) problems.push(lbl + ': the GP rail has lost Attendance, which it does have');

          /* THE GP OVERVIEW CARRIES NO EVALUATION. "Villages evaluated 0 of 0",
             "District average —" and an empty grade ring are not a district
             doing badly; they are figures for work nobody was asked to do. */
          const gpText = await page.$eval('#g', e => e.innerText);
          ['Evaluation outcomes', 'Villages evaluated', 'District average', 'Red flags'].forEach(w => {
            if(gpText.indexOf(w) >= 0) problems.push(lbl + ': the GP overview still shows "' + w + '"');
          });
          if(gpText.indexOf('Marked at the village office') < 0)
            problems.push(lbl + ': the GP overview does not show the place of duty, which is what that register has');
          if(!/a distance, not a default/.test(gpText))
            problems.push(lbl + ': the GP overview does not say that a distance accuses nobody');

          /* and back again, with the sanitation register whole */
          await page.selectOption('#tenPick', 'SJGP');
          await page.waitForTimeout(1400);
          const railSj = await page.$$eval('#nav [data-v]', vis);
          ['villages', 'schedule'].forEach(v => {
            if(railSj.indexOf(v) < 0) problems.push(lbl + ': switching back left the sanitation rail without "' + v + '"');
          });
          const back = await page.$eval('#g', e => e.innerText);
          if(back === after) problems.push(lbl + ': switching back did not re-read the sanitation register');
          const nm2 = await page.$eval('#tenName', e => e.hidden ? '' : e.textContent).catch(() => '');
          if(!/Swachh/i.test(nm2)) problems.push(lbl + ': back on SJGP the header does not say so — "' + nm2 + '"');
          const sjText = await page.$eval('#g', e => e.innerText);
          ['Villages evaluated', 'District average'].forEach(w => {
            if(sjText.indexOf(w) < 0) problems.push(lbl + ': the sanitation overview has LOST "' + w + '"');
          });
          console.log('  ' + lbl + ' — switched to GP and back; rail GP ' + JSON.stringify(railGp));
        }
      }

      if(errs.length) problems.push(size.n + '/' + theme + ': ' + errs.slice(0, 4).join(' | '));
      await ctx.close();
    }
  }
  await browser.close();
  srv.close();

  console.log('\nscreenshots: ' + OUT);
  if(problems.length){ console.log('\nPROBLEMS'); problems.forEach(p => console.log('  ✗ ' + p)); process.exitCode = 1; }
  else console.log('\nNo layout, overflow, colour or script problems found.');
})();

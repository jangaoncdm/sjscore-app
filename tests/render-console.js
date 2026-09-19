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

const VIEWS = ['overview', 'attendance', 'villages', 'schedule', 'leave', 'notices', 'map', 'admin'];
/* the filing schedule is fetched by its own call, so it needs its own fixture —
   built by fixture-dashboard.js off the same real backend run */
const SCHEDFIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-schedule.json'), 'utf8'));

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
const SIZES = [{ w:2560, h:1440, n:'2560' }, { w:1500, h:1000, n:'1500' }, { w:390, h:844, n:'390' }];

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
    for(const theme of ['light', 'dark']){
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
                             : /op=schedule/.test(u) ? SCHEDFIX : payload) });
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

      for(const v of VIEWS){
        await page.click('#nav [data-v="' + v + '"]');
        await page.waitForTimeout(450);
        await page.screenshot({ path: path.join(OUT, size.n + '-' + theme + '-' + v + '.png'),
          fullPage: size.w > 500 });

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
                     furniture: !!p.querySelector('.mtabs') };
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
          if(os.length > 1) problems.push(label + ': plots in one row start at different offsets ' + JSON.stringify(os));
          if(r.length !== plain.length) console.log('    (' + label + ': one card carries a tab strip above its plot — offset exempt)');
        });
        if(geo.length) console.log('  ' + size.n + '/' + theme + '/' + v + ' — ' + geo.length +
          ' chart card(s) in ' + Object.keys(rows).length + ' row(s); plot heights ' +
          JSON.stringify([...new Set(geo.map(g => g.plotH))]));

        /* ---- overflow: nothing may push the page sideways ---- */
        const over = await page.evaluate(() =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if(over > 1) problems.push(size.n + '/' + theme + '/' + v + ': page scrolls sideways by ' + over + 'px');

        /* ---- any chart text still wearing a hardcoded hex? ---- */
        const hard = await page.$$eval('.plot [style*="#"], .plot [fill^="#"], .plot [stroke^="#"]',
          els => els.slice(0, 6).map(e => e.tagName + ' ' + (e.getAttribute('style') || '').slice(0, 60)));
        if(hard.length) problems.push(size.n + '/' + theme + '/' + v + ': hardcoded colour in a chart — ' + JSON.stringify(hard));
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

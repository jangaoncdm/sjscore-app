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

const VIEWS = ['overview', 'attendance', 'villages', 'leave', 'notices', 'map'];
const SIZES = [{ w:2560, h:1440, n:'2560' }, { w:1500, h:1000, n:'1500' }, { w:390, h:844, n:'390' }];

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
        localStorage.setItem('sjf5', JSON.stringify({
          url: 'https://mock.district/exec',
          session: { token: 'T', user: { name: 'Sandeep Kumar Jha', role: 'COLLECTOR', phone: '9000000001' } }
        }));
        localStorage.setItem('sjgp-theme', th);
        localStorage.setItem('sjgp-console-seen', '{}');
      }, [null, theme]);

      const page = await ctx.newPage();
      /* the district's own reply, served locally */
      await page.route('**/mock.district/**', r =>
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) }));
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

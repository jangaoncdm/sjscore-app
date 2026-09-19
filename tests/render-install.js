/* THE INSTALLATION PAGE, RENDERED.

   It is the page 414 officers are sent to put the register on their phone, so
   it is checked the way every other screen here is: at the phone width they
   actually hold, and on a monitor, in both themes.

   The square is measured. A QR printed too small is a QR that will not scan,
   and nobody finds that out until an officer is standing in a village with a
   camera that will not lock on.

   Usage: node tests/render-install.js */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const APP = path.join(__dirname, '..', 'app');
const OUT = path.join(__dirname, '..', 'Info', 'install-render');
const MIN_QR = 180;   /* below this a phone camera starts to struggle */

function serve(){
  return new Promise(res => {
    const srv = http.createServer((q, s) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      const f = path.join(APP, u === '/' ? 'install.html' : u);
      if(!fs.existsSync(f) || fs.statSync(f).isDirectory()){ s.writeHead(404); return s.end('no'); }
      s.writeHead(200, { 'Content-Type':'text/html' });
      fs.createReadStream(f).pipe(s);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port + '/install.html';
  const br = await chromium.launch();
  let bad = 0;
  for(const w of [390, 1500, 2560]){
    for(const th of ['light', 'dark']){
      const ctx = await br.newContext({ viewport:{ width:w, height:1200 }, colorScheme:th });
      const p = await ctx.newPage();
      const errs = []; p.on('pageerror', e => errs.push(String(e)));
      await p.goto(base, { waitUntil:'domcontentloaded' });
      await p.waitForTimeout(400);
      const m = await p.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
        qr: [...document.querySelectorAll('.qr svg')].map(s => Math.round(s.getBoundingClientRect().width)),
        links: [...document.querySelectorAll('.url a')].map(a => a.textContent.trim()),
        h: Math.round(document.body.scrollHeight)
      }));
      const tag = w + '/' + th;
      if(m.sw > m.cw + 1){ bad++; console.log('  FAIL ' + tag + ': sideways scroll ' + m.sw + ' > ' + m.cw); }
      if(errs.length){ bad++; console.log('  FAIL ' + tag + ': script error ' + errs[0]); }
      if(m.qr.length !== 2){ bad++; console.log('  FAIL ' + tag + ': expected two squares, saw ' + m.qr.length); }
      if(m.qr.some(x => x < MIN_QR)){ bad++; console.log('  FAIL ' + tag + ': a square is only ' + m.qr.join(',') + ' px'); }
      if(m.links.length !== 2 || m.links.some(l => l.indexOf('https://') !== 0)){
        bad++; console.log('  FAIL ' + tag + ': the address is not written out in words — ' + JSON.stringify(m.links));
      }
      console.log('  ' + String(w).padStart(4) + '/' + th.padEnd(5) +
        '  squares ' + m.qr.join(',') + 'px  page ' + m.h + 'px');
      await p.screenshot({ path: path.join(OUT, w + '-' + th + '.png'),
                           fullPage: (w === 1500 && th === 'light') });
      await ctx.close();
    }
  }
  await br.close(); srv.close();
  console.log('\nscreenshots: ' + OUT);
  console.log(bad ? ('\n' + bad + ' problem(s)') : '\nno problems');
  if(bad) process.exitCode = 1;
})();

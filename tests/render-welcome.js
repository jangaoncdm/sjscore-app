/* THE WELCOME, RENDERED. The splash in front of sign-in is never shown to a driven browser, so no
   other pass sees it; this one asks for it by name (?welcome=1), catches it at 300 ms and at 1.8 s,
   and asserts that it is gone from the document by 4 s with sign-in underneath — because a welcome
   that stayed would stand between 280 officers and their attendance.
   Usage: node tests/render-welcome.js      Playwright is not a dependency: npm i playwright --no-save */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', 'app');
const OUT = path.join(__dirname, '..', 'Info', 'welcome-render');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png', '.webmanifest':'application/manifest+json' };
(async () => {
  fs.mkdirSync(OUT, { recursive:true });
  const srv = http.createServer((req, rq) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if(/\/config\.js$/.test(u)){ rq.writeHead(200, { 'Content-Type':'text/javascript' }); rq.end("window.SJGP_SERVER='https://mock.district/exec';"); return; }
    const f = path.join(ROOT, u === '/' ? 'index.html' : u);
    if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ rq.writeHead(404); rq.end('no'); return; }
    rq.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rq);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const br = await chromium.launch();
  const problems = [];
  let n = 0;
  const ck = (ok, what, extra) => { n++; console.log((ok ? '  PASS  ' : '  FAIL  ') + what + (extra ? '   — ' + extra : '')); if(!ok) problems.push(what); };
  const ctx = await br.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:2 });
  const p = await ctx.newPage(); p.on('pageerror', e => problems.push('script error: ' + e));
  /* 1. a driven browser is not shown it */
  await p.goto(base, { waitUntil:'load' }); await p.waitForTimeout(300);
  ck(!(await p.$('#welcome')), 'a driven browser is never shown the welcome');
  /* 2. asked for by name, it draws */
  await p.goto(base + '?welcome=1', { waitUntil:'load' }); await p.waitForTimeout(300);
  ck(await p.$eval('#welcome', el => !el.hidden && getComputedStyle(el).opacity === '1'), 'asked for, it is on the screen at 300 ms');
  await p.screenshot({ path: path.join(OUT, 'welcome-300ms.png') });
  ck(await p.$eval('#welcome img', el => el.naturalWidth > 0), 'the emblem has loaded', 'icons/icon-192.png');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, 'welcome-1800ms.png') });
  ck(await p.$eval('#welcome', el => /Swachh/.test(el.textContent) && /Government of Telangana/.test(el.textContent)), 'it names the state and the register');
  await p.waitForTimeout(2200);
  ck(!(await p.$('#welcome')), 'and by 4 s it is gone from the document', 'not hidden: removed');
  ck(await p.$eval('#signin', el => getComputedStyle(el).display !== 'none'), 'with sign-in underneath');
  await p.screenshot({ path: path.join(OUT, 'after.png') });
  /* 3. a tap takes it away at once */
  await p.goto(base + '?welcome=1', { waitUntil:'load' }); await p.waitForTimeout(200);
  await p.click('#welcome'); await p.waitForTimeout(600);
  ck(!(await p.$('#welcome')), 'a tap takes it away at once');
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  ck(!wide, 'no sideways scroll');
  await br.close(); srv.close();
  console.log('\n' + (n - problems.length) + ' passed, ' + problems.length + ' failed   ·   screenshots in Info/welcome-render/');
  if(problems.length) process.exit(1);
})();

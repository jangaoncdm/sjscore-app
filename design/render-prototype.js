/* Renders every screen of design/prototype.html at phone width, light and
   dark, into Info/design/. Playwright is not a dependency: npm i playwright --no-save. */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, '..', 'Info', 'design');
const SCREENS = ['signin', 'home', 'mark', 'photo', 'marked', 'inspect', 'score', 'summary', 'filed', 'records', 'leave', 'notices', 'more', 'offline'];
const SHEETS = ['still', 'refused'];
(async () => {
  fs.mkdirSync(OUT, { recursive:true });
  const html = fs.readFileSync(path.join(__dirname, 'prototype.html'), 'utf8');
  const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html; charset=utf-8'); r.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + html); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const br = await chromium.launch();
  let problems = [];
  for(const theme of ['light', 'dark']){
    const ctx = await br.newContext({ viewport:{ width:390, height:844 }, colorScheme:theme, deviceScaleFactor:2 });
    const p = await ctx.newPage();
    p.on('pageerror', e => problems.push(theme + ': ' + e));
    for(const s of SCREENS.concat(SHEETS)){
      await p.goto(base + '#' + s, { waitUntil:'load' });
      await p.waitForTimeout(350);
      const wide = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      if(wide) problems.push(theme + '/' + s + ': sideways scroll');
      await p.screenshot({ path: path.join(OUT, s + '-' + theme + '.png') });
    }
    await ctx.close();
  }
  /* and the desk at a monitor, once */
  const ctx2 = await br.newContext({ viewport:{ width:1440, height:900 } });
  const p2 = await ctx2.newPage(); await p2.goto(base + '#home'); await p2.waitForTimeout(350);
  await p2.screenshot({ path: path.join(OUT, 'desk-1440.png') });
  await br.close(); srv.close();
  console.log((SCREENS.length + SHEETS.length) * 2 + 1, 'screenshots in', OUT);
  if(problems.length){ console.log('PROBLEMS:'); problems.forEach(x => console.log(' ', x)); process.exit(1); }
  console.log('no script errors, no sideways scroll');
})();

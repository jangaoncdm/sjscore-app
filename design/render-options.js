/* Renders design/options.html: each of the five directions with its four phones, plus every welcome
   screen frozen at 300 ms and again when the motion has settled, into Info/design/options/.
   Fails on a script error or sideways scroll. Playwright is not a dependency: npm i playwright --no-save. */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, '..', 'Info', 'design', 'options');
const OPTS = { m:'a-material', c:'b-cupertino', u:'c-base', o:'d-lime', s:'e-saffron' };
(async () => {
  fs.mkdirSync(OUT, { recursive:true });
  const html = fs.readFileSync(path.join(__dirname, 'options.html'), 'utf8');
  const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html; charset=utf-8'); r.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + html); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const br = await chromium.launch();
  const problems = [];
  const ctx = await br.newContext({ viewport:{ width:1760, height:960 }, deviceScaleFactor:1 });
  const p = await ctx.newPage();
  p.on('pageerror', e => problems.push(String(e)));
  let n = 0;
  for(const k of Object.keys(OPTS)){
    await p.goto(base + '#' + k, { waitUntil:'load' });
    /* the welcome, 300 ms in: the seal is still arriving */
    await p.waitForTimeout(300);
    const wel = p.locator('.opt.on .ph').first();
    await wel.screenshot({ path: path.join(OUT, OPTS[k] + '-welcome-300ms.png') }); n++;
    await p.waitForTimeout(3800);
    await wel.screenshot({ path: path.join(OUT, OPTS[k] + '-welcome-settled.png') }); n++;
    const wide = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    if(wide) problems.push(k + ': sideways scroll at 1760');
    const shown = await p.evaluate(() => document.querySelectorAll('.opt.on .ph').length);
    if(shown !== 4) problems.push(k + ': ' + shown + ' phones shown, expected 4');
    await p.screenshot({ path: path.join(OUT, OPTS[k] + '-all.png'), fullPage:true }); n++;
  }
  /* phone width: the gallery itself must not scroll sideways on a handset */
  const ctx2 = await br.newContext({ viewport:{ width:390, height:844 } });
  const p2 = await ctx2.newPage(); p2.on('pageerror', e => problems.push('390: ' + e));
  await p2.goto(base + '#s', { waitUntil:'load' }); await p2.waitForTimeout(400);
  const wide2 = await p2.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if(wide2) problems.push('sideways scroll at 390');
  await p2.screenshot({ path: path.join(OUT, 'gallery-390.png') }); n++;
  await br.close(); srv.close();
  console.log(n, 'screenshots in', OUT);
  if(problems.length){ console.log('PROBLEMS:'); problems.forEach(x => console.log(' ', x)); process.exit(1); }
  console.log('no script errors, no sideways scroll, four phones per direction');
})();

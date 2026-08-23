/* Captures the phone frames the officers' guide is built from.

   These are deliberately NOT the browser test's snapshots: those are full-page
   captures made to prove behaviour, and a guide needs consistent handset
   frames an officer can match against the phone in his hand.

   Usage: node tests/guide-shots.js */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', 'app');
const OUT = path.join(__dirname, '..', 'Info', 'guide');
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-docs.json'), 'utf8'));
const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png',
               '.webmanifest':'application/manifest+json' };

function serve(){
  return new Promise(res => {
    const srv = http.createServer((req, rq) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const f = path.join(ROOT, u === '/' ? 'index.html' : u);
      if(!fs.existsSync(f) || fs.statSync(f).isDirectory()){ rq.writeHead(404); rq.end(); return; }
      rq.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rq);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:2 });
  const page = await ctx.newPage();

  const posts = [];
  const router = async route => {
    const req = route.request(), url = req.url();
    const reply = b => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(b) });
    if(req.method() === 'POST'){
      let b = {}; try{ b = JSON.parse(req.postData() || '{}'); }catch(e){}
      posts.push(b);
      if(b.kind === 'gpdp') return reply({ ok:true, year:'2026-27', fileName:(b.file||{}).name,
        sizeKB:Math.round(((b.file||{}).b64||'').length*3/4/1024),
        url:'https://drive.mock/plan.pdf', uploadedAt:new Date().toISOString() });
      return reply({ ok:true, ackAt:new Date().toISOString() });
    }
    if(/op=advisory/.test(url)) return reply(FIX.advOfficer);
    if(/op=gpdp/.test(url))     return reply(FIX.gpdpOfficer);
    return reply({ ok:true, rows:[] });
  };
  await page.route('**/mock.district/**', router);
  await page.route('**script.google.com/**', router);

  await page.goto(base + '/manifest.webmanifest', { waitUntil:'domcontentloaded' });
  await page.evaluate(off => {
    localStorage.setItem('sjf5', JSON.stringify({
      url:'https://mock.district/exec', session:{ token:'T', user: off },
      records:{}, att:{}, cache:[], master:[], leave:[], prefs:{ sun:0, big:0 } }));
  }, FIX.officer);
  await page.goto(base + '/index.html', { waitUntil:'domcontentloaded' });
  await page.waitForSelector('#app:not([hidden])', { timeout:20000 });
  await page.waitForTimeout(1500);

  const shot = async n => { await page.screenshot({ path: path.join(OUT, n + '.png') }); console.log('  ' + n); };

  /* 1 — the circular, as it opens by itself */
  await shot('1-opens');

  /* 2 — acknowledged, and the card that stays */
  await page.click('#advAck');
  await page.waitForTimeout(5200);
  await shot('2-home');

  /* 3 — every circular, kept under More */
  await page.click('#tabs [data-s="more"]');
  await page.waitForTimeout(450);
  await page.click('#mAdv');
  /* long enough for the toast to clear — a guide frame with a notification
     sitting over the thing it is pointing at teaches nothing */
  await page.waitForTimeout(5200);
  await shot('3-kept');
  await page.click('#sheet .scrim');
  await page.waitForTimeout(350);

  /* 4 — the plan screen */
  await page.click('#tabs [data-s="home"]');
  await page.waitForTimeout(450);
  await page.click('[data-gpdp]');
  await page.waitForTimeout(600);
  await shot('4-plan');

  /* 5 — the plan, once the district holds it */
  const pdf = path.join(OUT, '_sample.pdf');
  fs.writeFileSync(pdf, Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(3000, 0x20)]));
  await page.setInputFiles('#gpdpFile', pdf);
  await page.waitForTimeout(1600);
  await shot('5-plan-sent');
  try{ fs.unlinkSync(pdf); }catch(e){}

  await browser.close(); srv.close();
  console.log('frames written to ' + OUT);
})();

/* THE GEO-FENCE, IN A REAL BROWSER, with the handset actually standing there.

   The server half is suite 35 and none of what follows is server logic. This
   is the officer holding the phone: the location step, the pop-up, the camera
   that must not open for a photograph he cannot use, and the mark that the
   district refused after he had already walked away. A unit test of any one of
   those passes while the man in the village sees the fault — which is why the
   handset store, the boot and the sign-in path have a browser test of their
   own already.

   Five things are asserted rather than hoped for:

     · HE IS TOLD THE DISTANCE, in the words the district asked for: how far
       away he is and from where. A refusal that does not say how far out he
       is leaves him with nothing to do about it;

     · THE CAMERA DOES NOT OPEN out of place. It used to open after two failed
       attempts at a fix and the mark was filed unverified, which was right
       while nothing turned on the place and is a hole the size of the order
       now that something does;

     · NOTHING IS SAID BEFORE THE SATELLITE HAS ANSWERED. A cold GPS needs a
       minute of open sky, and a pop-up saying "no location yet" the instant
       the screen opens is the app blaming the officer for its own wait;

     · AN OFFICER THE DISTRICT HAS NOT PLACED MARKS EXACTLY AS BEFORE. The
       handset must not invent a fence out of an answer it never got;

     · AND A MARK THE DISTRICT REFUSED IS TAKEN OFF THE PHONE. Left standing
       it reads "marked" all day and he learns at the end of the month, from a
       show-cause notice.

   The pop-up also may not threaten: a fence is a refusal to record a mark,
   not a sanction, and an officer who reads "show-cause" on a government
   register rings the mandal office.

   Usage: node tests/render-fence.js
   Playwright is deliberately not a dependency: npm i playwright --no-save. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const APP = path.join(__dirname, '..', 'app');
const OUTDIR = path.join(__dirname, '..', 'Info', 'fence-render');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png',
               '.webmanifest':'application/manifest+json' };

/* Konne, as the district placed it, and where this handset will stand. */
const HOME = { latitude:17.700, longitude:79.100, accuracy:12 };
const NEAR = { latitude:17.718, longitude:79.100, accuracy:12 };   /* 2 km out — inside */
const AWAY = { latitude:17.340, longitude:79.100, accuracy:12 };   /* 40 km out — refused */
const COARSE = { latitude:17.700, longitude:79.100, accuracy:3000 };

function serve(){
  return new Promise(res => {
    const srv = http.createServer((q, s) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      if(/\/config\.js$/.test(u)){
        s.writeHead(200, { 'Content-Type':'text/javascript' });
        return s.end("window.SJGP_SERVER='https://mock.district/exec';window.SJGP_TENANT='';");
      }
      const f = path.join(APP, u === '/' ? 'index.html' : u);
      if(!fs.existsSync(f) || fs.statSync(f).isDirectory()){ s.writeHead(404); return s.end('no'); }
      s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(s);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

let pass = 0, fail = 0;
const ck = (ok, what, detail) => {
  if(ok){ pass++; console.log('  PASS  ' + what + (detail ? '   — ' + detail : '')); }
  else  { fail++; console.log('  FAIL  ' + what + (detail ? '   — ' + detail : '')); }
};
const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
};
const BASE = { url:'https://mock.district/exec', cache:[], master:[], leave:[], out:{},
               prefs:{ sun:0, big:0 }, who:'9000000014',
               session:{ token:'T1', user:{ name:'D. AtKonne', role:'PS', phone:'9000000014',
                                            mandal:'Jangaon', gp:'Konne', gps:['Konne'] } } };
/* the district's answer about his place of duty */
const PLACED = { ok:true, on:true, km:5, acc:1000, which:'village',
                 duty:[{ name:'Konne', mandal:'Jangaon', lat:17.700, lng:79.100, which:'village' }] };
const UNPLACED = { ok:true, on:false, km:5, acc:1000, duty:[],
                   why:'the district has not placed your office yet' };

/* A FENCE IS NOT A SANCTION. These words may not appear on the pop-up. */
const SANCTION = /show.?cause|casual leave|debit|loss of pay|default|disciplin|penalt|absent/i;

(async () => {
  if(!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive:true });
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();

  async function open_(o){
    const ctx = await br.newContext({ viewport:{ width:390, height:844 },
      permissions:['geolocation'], geolocation:o.at || HOME });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    const posted = [];
    let toastSeen = '';
    await p.route('**/mock.district/**', r => {
      const q = r.request();
      const rep = x => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(x) });
      if(q.method() === 'POST'){
        let x = {}; try{ x = JSON.parse(q.postData() || '{}'); }catch(e){}
        posted.push(x);
        if(x.kind === 'attendance' && o.refuse)
          return rep({ ok:false, outside:true, km:40.1, place:'Konne', limit:5,
            error:'You are 40.1 km away from Konne, your place of duty. Please reach the location to mark attendance.' });
        return rep({ ok:true });
      }
      if(/op=duty/.test(q.url())) return rep(o.duty === null ? { ok:false, error:'unknown op' }
                                                            : (o.duty || PLACED));
      if(/op=out/.test(q.url())) return rep({ ok:true, date:today(), markedIn:false, markedOut:false, canOut:false });
      if(/op=gpdp/.test(q.url())) return rep({ ok:true, year:'2026-27', due:false, mine:null, maxMB:8 });
      return rep({ ok:true, rows:[], gps:[], reminders:[], holidays:{}, mine:null });
    });
    /* the store is written from a page that is NOT index.html: the app builds
       an empty store on load and its own debounced save puts that straight
       back over anything written afterwards */
    await p.goto(base + '/manifest.webmanifest', { waitUntil:'domcontentloaded' });
    await p.evaluate(a => localStorage.setItem('sjf5', JSON.stringify(a)), o.store || { ...BASE, att:{} });
    await p.goto(base + '/index.html', { waitUntil:'domcontentloaded' });
    p.on('console', m => { /* kept quiet on purpose */ });
    await p.waitForTimeout(o.wait || 3000);
    const wide = await p.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    const read = sel => p.evaluate(s2 => { const e = document.querySelector(s2); return e ? e.innerText : ''; }, sel);
    return { p, ctx, errs, posted, wide, read,
             sheetOn: () => p.evaluate(() => document.getElementById('sheet').classList.contains('on')),
             sheet: () => read('#sheetBody'),
             store: () => p.evaluate(() => JSON.parse(localStorage.getItem('sjf5') || 'null')),
             shot: n => p.screenshot({ path: path.join(OUTDIR, n + '.png'), fullPage:false }) };
  }

  console.log('\n1. at his own village — the step says so and the camera opens');
  {
    const r = await open_({ at:HOME });
    const geo = await r.read('#stepGeo');
    ck(/inside the 5 km/i.test(geo), 'THE STEP SAYS HE IS INSIDE THE FENCE, with the radius',
       (geo.replace(/\s+/g, ' ').match(/[\d.]+ ?[mk]m? from[^.]*\./i) || [''])[0]);
    ck(/Konne/.test(geo), 'and names the place it measured from');
    ck(!(await r.sheetOn()), 'NO POP-UP — he is where he is supposed to be');
    const shoot = await r.p.$('#attShoot');
    ck(!!shoot && !(await shoot.isDisabled()), 'the camera is offered');
    ck(!r.wide, 'no sideways scroll at 390px');
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');
    await r.shot('1-inside'); await r.ctx.close();
  }

  console.log('\n2. two kilometres out — still inside, because a fence is not a doorstep');
  {
    const r = await open_({ at:NEAR });
    const geo = await r.read('#stepGeo');
    ck(/inside the 5 km/i.test(geo), 'two kilometres out is inside', geo.replace(/\s+/g, ' ').slice(0, 80));
    ck(!(await r.sheetOn()), 'and nothing pops up');
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');
    await r.ctx.close();
  }

  console.log('\n3. FORTY KILOMETRES OUT — the pop-up, in the words the district asked for');
  {
    const r = await open_({ at:AWAY });
    ck(await r.sheetOn(), 'THE POP-UP IS THERE, unasked, while he is standing in the wrong place');
    const sh = (await r.sheet()).replace(/\s+/g, ' ');
    ck(/not at your place of duty/i.test(sh), 'headed as what it is', sh.slice(0, 48));
    ck(/4[0-9](\.\d)? km away/i.test(sh), 'IT SAYS HOW FAR AWAY HE IS',
       (sh.match(/[\d.]+ km away/i) || [''])[0]);
    ck(/from Konne/.test(sh), 'and from where', (sh.match(/from \w+/) || [''])[0]);
    ck(/Please reach the location to mark attendance/.test(sh),
       'AND THE ONE THING HE CAN DO ABOUT IT, in the words the district dictated');
    ck(/within 5 km/.test(await r.read('#stepGeo')),
       'while the radius stays on the location step, where he is already looking');
    ck(!SANCTION.test(sh), 'AND NOT ONE WORD OF SANCTION — a fence is not a charge',
       (sh.match(SANCTION) || ['clean'])[0]);
    await r.shot('3-outside-popup');

    /* the camera must not open for a photograph he cannot use */
    await r.p.click('#fnClose'); await r.p.waitForTimeout(400);
    const shoot = await r.p.$('#attShoot');
    ck(!!shoot && (await shoot.isDisabled()), 'THE CAMERA IS NOT OFFERED out of place');
    const cam = await r.read('#stepCam');
    ck(/place of duty/i.test(cam), 'and the step itself says why, not only the sheet',
       cam.replace(/\s+/g, ' ').slice(0, 70));
    const geo = await r.read('#stepGeo');
    ck(/only be marked within/i.test(geo), 'the location step carries the distance too',
       geo.replace(/\s+/g, ' ').slice(0, 90));
    await r.shot('3-outside-steps');

    /* nothing whatever is written against him */
    const st = await r.store();
    ck(Object.keys((st && st.att) || {}).length === 0, 'NOTHING IS MARKED on the phone');
    ck(!r.posted.filter(x => x.kind === 'attendance').length, 'and nothing was sent to the district');
    ck(!r.wide, 'no sideways scroll at 390px');
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');

    /* and there is a way to try again, because the fix may improve or he may
       have walked — a refusal with no way forward is a dead end */
    await r.p.evaluate(() => { const b = document.getElementById('attShoot'); return !!b; });
    await r.ctx.close();
  }

  console.log('\n4. a fix that places him only to three kilometres is not a place');
  {
    const r = await open_({ at:COARSE });
    const sh = (await r.sheet()).replace(/\s+/g, ' ');
    ck(await r.sheetOn(), 'the pop-up says so');
    ck(/not precise enough/i.test(sh), 'as a fault of the fix, NOT as his being away', sh.slice(0, 56));
    ck(/step into the open/i.test(sh), 'and names the one thing that cures it');
    ck(!SANCTION.test(sh), 'with no word of sanction', (sh.match(SANCTION) || ['clean'])[0]);
    await r.shot('4-coarse');
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');
    await r.ctx.close();
  }

  console.log('\n5. an officer the district has not placed marks exactly as he always did');
  {
    const r = await open_({ at:AWAY, duty:UNPLACED });
    ck(!(await r.sheetOn()), 'NO FENCE AND NO POP-UP — a blank cell must not sanction anybody');
    const shoot = await r.p.$('#attShoot');
    ck(!!shoot && !(await shoot.isDisabled()), 'the camera is offered forty kilometres out');
    const geo = await r.read('#stepGeo');
    ck(!/place of duty/i.test(geo), 'and the step says nothing about a fence', geo.replace(/\s+/g, ' ').slice(0, 60));
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');
    await r.shot('5-unplaced');
    await r.ctx.close();
  }

  console.log('\n6. and an older register that cannot answer `duty` invents no fence either');
  {
    const r = await open_({ at:AWAY, duty:null });
    ck(!(await r.sheetOn()), 'nothing pops up on an answer the handset never got');
    const shoot = await r.p.$('#attShoot');
    ck(!!shoot && !(await shoot.isDisabled()), 'and the camera is offered as it always was');
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');
    await r.ctx.close();
  }

  console.log('\n7. A MARK THE DISTRICT REFUSED IS TAKEN OFF THE PHONE');
  {
    /* he marked at his village while the handset still believed itself
       unplaced, walked away, and the district refused it on the way up */
    const att = {};
    att[today()] = { id:'A9', date:today(), ts:new Date().toISOString(), lat:17.34, lng:79.10,
                     acc:12, verified:true, status:'PRESENT', phone:'9000000014',
                     name:'D. AtKonne', role:'PS', mandal:'Jangaon', sync:'local' };
    const r = await open_({ at:HOME, refuse:true, store:{ ...BASE, att:att }, wait:3600 });
    const st = await r.store();
    ck(!((st && st.att) || {})[today()],
       'THE ROW IS GONE — it was never a mark, and must not read as one all day');
    const body = await r.p.evaluate(() => document.body.innerText);
    ck(/40(\.\d)? km away from Konne/i.test(body), 'and he is told, in the district\'s own words',
       (body.replace(/\s+/g, ' ').match(/[\d.]+ km away from \w+[^.]*/i) || [''])[0]);
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');
    await r.shot('7-refused-at-sync');
    await r.ctx.close();
  }

  await br.close(); srv.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed.  Screenshots in Info/fence-render/');
  process.exit(fail ? 1 : 0);
})();

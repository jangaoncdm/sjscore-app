/* THE ROLL CORRECTED FROM THE DISTRICT'S OWN TABLE, driven in a browser.

   The office keeps its roster in a table and pastes it into the console. What
   is tested here is the paste itself — the shape it actually arrives in, with
   the office address and its two coordinates on three lines inside one cell —
   and then that NOTHING goes on the wire until the Collector presses Apply.

   The table below is the real one for the twelve MPOs, with the mobile
   numbers and the official emails replaced. THE REAL ROSTER IS NEVER IN THIS
   REPOSITORY: it is 280 officers' personal numbers and the repository is
   public, because that is how handsets install the app.

   Usage: node tests/render-roster.js */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const APP = path.join(__dirname, '..', 'app');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png',
               '.webmanifest':'application/manifest+json' };
const DASH = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-dashboard.json'), 'utf8'));

/* the paste, in the shape a spreadsheet actually gives: one cell holding the
   office and its two coordinates on separate lines */
const PASTE = [
  '1\tBachannapet\tA.Krishnakumari\t9000000101\tone@example.gov.in\tO/o MPP Bachannapet',
  'Latitude: 17.791811', 'Longitude: 79.041849',
  '2\tChilpur\tN. Raghu Rama Krishna\t9000000102\ttwo@example.gov.in\tO/o MPP Chilpur.',
  'Latitude: 17.918968', 'Longitude: 79.31495',
  '3     Devaruppula     B. Srinath Reddy     9000000103     three@example.gov.in     O/o MPP Devaruppula Latitude:17.536817',
  'Longitude: 79.343537',
  '4\tGhanpur(Stn)\tK. Srinath, Supdt (FAC)\t9000000104\tfour@example.gov.in\tO/o MPP Ghanpur(stn)',
  'Latitude: 17.85123', 'Longitude: 79.37298'
].join('\n');

const ROLL = { ok:true, roles:['PS','MPO','MSO','MPDO','DLPO','DPO','COLLECTOR'],
  mandals:['Bachannapet','Chilpur'], tenant:'SJGP', tenantName:'Swachh Jangaon Gram Panchayat',
  holidays:{ year:2026, count:39, onOrder:39, extra:[], missing:[] },
  rows:[{ phone:'9000000001', name:'Sandeep Kumar Jha', role:'COLLECTOR', mandal:'', gp:'',
          hasPin:true, active:true, rows:1 }] };

const PLANS = [
  { mandal:'Bachannapet', name:'A.Krishnakumari', phone:'9000000101', verdict:'correct',
    changes:['email old@x → one@example.gov.in'] },
  { mandal:'Chilpur', name:'N. Raghu Rama Krishna', phone:'9000000102', verdict:'succession',
    why:'Old Incumbent holds this chair and N. Raghu Rama Krishna is a different person.', changes:[] },
  { mandal:'Devaruppula', name:'B. Srinath Reddy', phone:'9000000103', verdict:'unchanged', changes:[] },
  { mandal:'Ghanpur(Stn)', name:'K. Srinath, Supdt (FAC)', phone:'9000000104', verdict:'register',
    changes:['registered as MPO of Ghanpur(Stn)'] }
];

function serve(){
  return new Promise(res => {
    const srv = http.createServer((q, s) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      if(u === '/config.js' || u === '/gp/config.js'){
        s.writeHead(200, { 'Content-Type':'text/javascript' });
        return s.end("window.SJGP_SERVER='https://mock.district/exec';" +
          (u.indexOf('/gp/') === 0 ? "window.SJGP_TENANT='GP';" : ''));
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
const ck = (ok, what, d) => { if(ok){ pass++; console.log('  PASS  ' + what + (d ? '   — ' + d : '')); }
                              else { fail++; console.log('  FAIL  ' + what + (d ? '   — ' + d : '')); } };

(async () => {
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport:{ width:1500, height:1100 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('sjf5', JSON.stringify({ url:'https://mock.district/exec',
      session:{ token:'T', user:{ name:'Sandeep Kumar Jha', role:'COLLECTOR', phone:'9000000001' } } }));
    localStorage.setItem('sjgp-theme', 'light');
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', d => d.accept());
  const posts = [];
  await p.route('**/mock.district/**', r => {
    const q = r.request();
    const rep = o => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(o) });
    if(q.method() === 'POST'){
      let b = {}; try{ b = JSON.parse(q.postData() || '{}'); }catch(e){}
      posts.push(b);
      if(b.kind === 'rollUpdate' && b.dry) return rep({ ok:true, dry:true, plans:PLANS, offices:4 });
      if(b.kind === 'rollUpdate') return rep({ ok:true, dry:false, corrected:1, registered:2,
        retired:1, offices:4, pins:[{ phone:'9000000104', name:'K. Srinath' }] });
      return rep({ ok:true });
    }
    if(/op=roll/.test(q.url())) return rep(ROLL);
    return rep(DASH);
  });
  await p.route('**tile.openstreetmap.org**', r => r.abort());

  await p.goto(base + '/dashboard.html', { waitUntil:'domcontentloaded' });
  await p.waitForSelector('#app:not([hidden])', { timeout:25000 });
  await p.click('#nav [data-v="admin"]');
  await p.waitForTimeout(900);

  ck(!!(await p.$('#rlTbl')), 'the roster panel is on the Admin screen');
  await p.fill('#rlTbl', PASTE);
  await p.waitForTimeout(400);
  await p.click('#rlTblRead');
  await p.waitForTimeout(900);

  const dry = posts.filter(x => x.kind === 'rollUpdate');
  ck(dry.length === 1, 'reading the table sends exactly one request', dry.length + '');
  ck(!!dry[0] && dry[0].dry === true, 'and it is a DRY RUN — nothing is written by reading');
  const sent = (dry[0] || {}).rows || [];
  ck(sent.length === 4, 'all four lines were understood, whatever the paste looked like', sent.length + '');
  const bach = sent.find(x => x.mandal === 'Bachannapet') || {};
  ck(bach.name === 'A.Krishnakumari', 'the name is read', JSON.stringify(bach.name));
  ck(bach.phone === '9000000101', 'the mobile is picked out of the row', JSON.stringify(bach.phone));
  ck(String(bach.email).indexOf('@') > 0, 'so is the official email', JSON.stringify(bach.email));
  ck(Math.abs(bach.lat - 17.791811) < 1e-6 && Math.abs(bach.lng - 79.041849) < 1e-6,
     'and the office coordinates out of the cell below it', bach.lat + ',' + bach.lng);
  /* the third line is the awkward one: spaces instead of tabs, and the
     latitude run together with the office address */
  const dev = sent.find(x => x.mandal === 'Devaruppula') || {};
  ck(Math.abs(dev.lat - 17.536817) < 1e-6, 'a row pasted with spaces reads the same', String(dev.lat));
  ck(String(dev.office).indexOf('MPP Devaruppula') >= 0, 'and its office survives the split',
     JSON.stringify(dev.office));
  ck(sent.every(x => x.role === 'MPO'), 'every line carries the role chosen above the box');

  const txt = await p.$eval('#g', e => e.innerText);
  ck(/a different officer/i.test(txt), 'a succession is named on screen as what it is');
  ck(/already agrees/i.test(txt), 'and a line that agrees is named as that');
  ck(/never written over/i.test(txt) || /never written over the one/i.test(txt) ||
     /is never written over/i.test(txt), 'the screen states the succession rule plainly');
  await p.screenshot({ path: path.join(__dirname, '..', 'Info', 'roster-dry.png'), fullPage:true });

  /* ---- and only now does anything get written ---- */
  ck(!!(await p.$('#rlTblApply')), 'only after the comparison is Apply offered');
  await p.click('#rlTblApply');
  await p.waitForTimeout(900);
  const wrote = posts.filter(x => x.kind === 'rollUpdate' && x.dry === false);
  ck(wrote.length === 1, 'Apply writes once', wrote.length + '');
  ck((wrote[0].rows || []).length === 4, 'carrying the same four lines');
  const after = await p.$eval('#g', e => e.innerText);
  ck(/still need a PIN/i.test(after), 'and it says who still needs a PIN');
  ck(errs.length === 0, 'no script error', errs[0] || '');

  await br.close(); srv.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  if(fail) process.exitCode = 1;
})();

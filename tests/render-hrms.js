/* THE DISTRICT HRMS APP — driven in a real browser, end to end.

   The employee's whole journey: a number the district seeded, a PIN he
   chooses himself, an application, and his own register afterwards. Nothing
   here is mocked away except the network, and what the network answers is the
   REAL backend running in the Apps Script mock — so the app is driven against
   the same saveLeave_, the same overlap refusal and the same twin-row fold
   the district will run on.

   Three things it guards that are easy to get wrong and expensive to get
   wrong on a register that sanctions leave:

     · the first sign-in tells him the row is HIS TO CLAIM rather than sending
       five thousand people to telephone an office on the first morning;
     · a refusal is a refusal: nothing is ever shown as sent that the district
       did not take, because an application for leave is a request for orders
       and not a fact a handset can hold;
     · and medical leave is never drawn as a balance of nought, which reads as
       "none left" and is the opposite of the rule.

   Usage: node tests/render-hrms.js
   Playwright is deliberately not a dependency: npm i playwright --no-save. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const mock = require('./gasmock.js');
const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'hrms');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.webmanifest':'application/manifest+json',
               '.png':'image/png' };

/* ---- the real register, in the Apps Script mock ---- */
const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active','Designation','EmpId'];
const L = ['id','appliedAt','phone','name','role','mandal','type','fromDate','toDate','days',
           'reason','address','leaveHq','certificate','status','decidedBy','decidedAt','remarks','receivedAt'];
function register(){
  const e = mock.load({ now:'2026-10-06T10:00:00+05:30' });
  e.props.TENANT = 'HRMS';
  e.mkSheet('Users', U, [
    { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Mandal:'', GP:'', Email:'c@x', Active:'TRUE' },
    { Phone:'9444400001', Name:'K. Ramesh', Role:'EMP', Mandal:'Collectorate', GP:'', Email:'',
      Active:'TRUE', Designation:'Senior Assistant', EmpId:'JN/2291' }
  ]);
  e.mkSheet('Leave', L, []);
  e.mkSheet('Audit', ['At','Action','Subject','Detail','By'], []);
  return e;
}

let pass = 0, fail = 0;
const ck = (ok, what, d) => { if(ok){ pass++; console.log('  PASS  ' + what + (d ? '   — ' + d : '')); }
                              else { fail++; console.log('  FAIL  ' + what + (d ? '   — ' + d : '')); } };

function serve(noConfig){
  return new Promise(res => {
    const srv = http.createServer((q, s) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      if(/\/config\.js$/.test(u)){
        /* WITHHELD ON PURPOSE in the last section: the deploy Action publishes
           /hrms/ whether or not the register has been stood up, so this is
           the exact state the printed install card sends an employee to. */
        if(noConfig){ s.writeHead(404); return s.end('not stood up'); }
        s.writeHead(200,{'Content-Type':'text/javascript'});
        return s.end("window.SJGP_SERVER='https://hrms.district/exec';"); }
      const f = path.join(APP, u === '/' ? 'index.html' : u.replace(/^\//, ''));
      if(!fs.existsSync(f) || fs.statSync(f).isDirectory()){ s.writeHead(404); return s.end('no'); }
      s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(s);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  const OUT = path.join(ROOT, 'Info', 'hrms-render');
  if(!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive:true });
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport:{ width:390, height:844 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));

  let E = register();
  let dead = false;               /* the village road, for the refusal test */
  await page.route('**/hrms.district/**', r => {
    if(dead) return r.abort('failed');
    const q = r.request();
    let out;
    if(q.method() === 'POST'){
      let b = {}; try{ b = JSON.parse(q.postData() || '{}'); }catch(e){}
      out = E.post(b);
    } else {
      const sp = new URL(q.url()).searchParams, p = {};
      sp.forEach((v, k) => { p[k] = v; });
      out = E.get(p.op, p);
    }
    r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(out) });
  });

  await page.goto(base + '/', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(400);

  /* ---- 1. the first sign-in ---- */
  ck(await page.isVisible('#vSignin'), 'the app opens on sign in');
  await page.screenshot({ path: path.join(OUT, '0-sign-in.png') });
  await page.fill('#iPhone', '9444400001');
  await page.fill('#iPin', '1234');
  await page.click('#bSignin'); await page.waitForTimeout(700);
  ck(await page.isVisible('#vClaim'),
     'A NUMBER WITH NO PIN IS SHOWN THE CLAIM SCREEN, not an error telling him to telephone the office');
  ck(/K\. Ramesh/.test(await page.textContent('#claimName')), 'greeting him by name', await page.textContent('#claimName'));
  await page.screenshot({ path: path.join(OUT, '1-claim.png') });

  /* the employee id is the second factor, and a wrong one is refused */
  await page.fill('#cEmp', 'JN/0000'); await page.fill('#cPin', '8421'); await page.fill('#cPin2', '8421');
  await page.click('#bClaim'); await page.waitForTimeout(600);
  ck(await page.isVisible('#vClaim'), 'a wrong employee id does not claim the row');
  ck(/do not match/.test(await page.textContent('#mClaim')), 'and says so without naming which half was wrong',
     (await page.textContent('#mClaim')).slice(0, 60));

  /* two different PINs are caught on the page, before the district is troubled */
  await page.fill('#cEmp', 'JN/2291'); await page.fill('#cPin', '8421'); await page.fill('#cPin2', '9999');
  await page.click('#bClaim'); await page.waitForTimeout(400);
  ck(/not the same/.test(await page.textContent('#mClaim')), 'two different PINs are caught here');

  await page.fill('#cPin2', '8421');
  await page.click('#bClaim'); await page.waitForTimeout(900);
  ck(await page.isVisible('#vHome'), 'THE RIGHT ID AND A PIN OF HIS OWN SIGNS HIM IN');
  ck(/K\. Ramesh/.test(await page.textContent('#hName')), 'on his own page');
  ck(/Senior Assistant/.test(await page.textContent('#hWho')), 'with his designation and office',
     await page.textContent('#hWho'));

  /* and the register recorded the claim, never the PIN */
  const audit = JSON.stringify(E.sheets['Audit'].rows);
  ck(audit.indexOf('HRMS ROW CLAIMED') >= 0, 'the claim is on the Audit tab');
  ck(audit.indexOf('8421') < 0, 'AND THE PIN IS NOT');

  /* ---- 2. the balances ---- */
  const bal = await page.textContent('#hBal');
  ck(/Casual leave/.test(bal) && /Earned leave/.test(bal), 'his year is drawn', bal.replace(/\s+/g,' ').slice(0, 70));
  ck(/no yearly limit/.test(bal),
     'AND MEDICAL LEAVE IS NOT DRAWN AS A BALANCE OF NOUGHT — which reads as "none left", the opposite of the rule');
  ck(!/Permission to leave headquarters/.test(bal), 'the headquarters permission is not a balance either');
  await page.screenshot({ path: path.join(OUT, '2-home-empty.png') });

  /* ---- 3. he applies ---- */
  await page.click('#bApply'); await page.waitForTimeout(400);
  ck(await page.isVisible('#vApply'), 'the application form opens');
  await page.selectOption('#aType', 'CL');
  await page.fill('#aFrom', '2026-10-12'); await page.fill('#aTo', '2026-10-13');
  await page.waitForTimeout(300);
  const n1 = await page.textContent('#aNote');
  ck(/2 day\(s\)/.test(n1), 'the days are counted as he picks them', n1);
  ck(/this would leave you/.test(n1), 'and what it would leave him is worked out live', n1);
  await page.screenshot({ path: path.join(OUT, '3-apply.png') });

  await page.click('#bSend'); await page.waitForTimeout(500);
  ck(/reason is needed/.test(await page.textContent('#mApply')), 'a reason is required — the orders are passed on it');

  await page.fill('#aReason', 'Family function at Warangal.');
  await page.fill('#aAddr', 'H.No 4-21, Warangal.');
  await page.click('#bSend'); await page.waitForTimeout(1400);
  ck(await page.isVisible('#vHome'), 'on sending he is returned to his own page');
  const list = await page.textContent('#hList');
  ck(/Casual leave/.test(list), 'the application is on it', list.replace(/\s+/g,' ').slice(0, 70));
  ck(/awaiting orders/.test(list), 'AWAITING ORDERS — nothing is taken from him until it is sanctioned');
  await page.screenshot({ path: path.join(OUT, '4-home-applied.png') });
  ck(E.sheets['Leave'].rows.length === 2, 'and the register holds exactly one row for it',
     (E.sheets['Leave'].rows.length - 1) + ' row(s)');

  /* ---- 4. the overlap is the REGISTER's refusal, not the page's ---- */
  await page.click('#bApply'); await page.waitForTimeout(300);
  await page.selectOption('#aType', 'CL');
  await page.fill('#aFrom', '2026-10-13'); await page.fill('#aTo', '2026-10-14');
  await page.fill('#aReason', 'Again.');
  await page.click('#bSend'); await page.waitForTimeout(1200);
  ck(await page.isVisible('#vApply'), 'an overlapping spell leaves him on the form');
  const om = await page.textContent('#mApply');
  ck(/already|overlap/i.test(om), 'AND THE REFUSAL IS THE REGISTER’S OWN, through saveLeave_', om.slice(0, 70));
  await page.screenshot({ path: path.join(OUT, '5-refused-overlap.png') });
  ck(E.sheets['Leave'].rows.length === 2, 'nothing was written for it');

  /* ---- 5. NOTHING IS SHOWN AS SENT THAT WAS NOT ---- */
  dead = true;
  await page.fill('#aFrom', '2026-11-02'); await page.fill('#aTo', '2026-11-03');
  await page.fill('#aReason', 'On a village road.');
  await page.click('#bSend'); await page.waitForTimeout(1200);
  const dm = await page.textContent('#mApply');
  ck(/nothing has been applied for/.test(dm),
     'A LINE THAT DROPPED SAYS NOTHING HAS BEEN APPLIED FOR — an application is a request for orders, not a fact the handset can hold', dm.slice(0, 80));
  ck(await page.isVisible('#vApply'), 'and he is left on the form, not told it went');
  await page.screenshot({ path: path.join(OUT, '6-no-line.png') });
  dead = false;

  /* ---- 6. he signs out and back in with his own PIN ---- */
  await page.click('#bCancel'); await page.waitForTimeout(300);
  await page.click('#bOut'); await page.waitForTimeout(400);
  ck(await page.isVisible('#vSignin'), 'he signs out');
  await page.fill('#iPhone', '9444400001'); await page.fill('#iPin', '8421');
  await page.click('#bSignin'); await page.waitForTimeout(900);
  ck(await page.isVisible('#vHome'), 'and back in with the PIN HE chose');
  ck(/Casual leave/.test(await page.textContent('#hList')), 'his application is still there');

  /* ---- 6b. and the same screen once the Collector has passed orders ---- */
  {
    const cdm = E.ctx.issueToken_(E.ctx.findByPhone_('9000000001'));
    /* the kind is `leaveDecision` and the field is `status` — passing
       `decideLeave`/`decision` falls through doPost to the last guard and
       comes back as "this register does not take village evaluations", which
       is the fall-through this project has a rule about and which doGet's
       tail was closed for. */
    const mine = E.get('leave', { token:cdm }).rows || [];
    const id = (mine.filter(function(x){ return String(x.phone).indexOf('9444400001') >= 0; })[0] || {}).id;
    if(id) E.post({ kind:'leaveDecision', token:cdm, id:id, status:'APPROVED', remarks:'' });
    await page.click('#bRefresh'); await page.waitForTimeout(900);
    const after = await page.textContent('#hList');
    ck(/approved/i.test(after), 'a sanctioned application shows as approved on his own page',
       (after.replace(/\s+/g,' ').match(/[^·]{0,40}approved/i) || [''])[0]);
    await page.screenshot({ path: path.join(OUT, '7-approved.png') });
  }

  /* ---- 6c. THE EMPLOYEE IS NOT OFFERED ORDERS ---- */
  ck(await page.isHidden('#bOrders'),
     'an employee is never offered the orders screen — it is not his');

  /* ---- 6d. AND THE COLLECTOR PASSES THEM, IN THE APP ----

     Every order on every one of these registers is passed in the field app;
     the console only shows the waiting list. This app had no such screen at
     all, so there was no way on earth to sanction a single application on the
     register whose whole purpose is leave. */
  {
    /* a second employee, so there is something still waiting */
    E.post({ kind:'hrmsSeed', token:E.ctx.issueToken_(E.ctx.findByPhone_('9000000001')),
      rows:[{ name:'B. Waiting', office:'DPO', desig:'Typist', emp:'JN/7', phone:'9444400003' }] });
    E.post({ kind:'claimPin', u:'9444400003', emp:'JN/7', pin:'3333' });
    const tok2 = E.post({ kind:'login', u:'9444400003', p:'3333' }).token;
    E.post({ kind:'leave', token:tok2, leave:{ id:'HR-W1', type:'CL',
      from:'2026-11-10', to:'2026-11-10', days:1, reason:'Village work.' } });
    E.post({ kind:'leave', token:tok2, leave:{ id:'HR-W2', type:'EL',
      from:'2026-12-01', to:'2026-12-03', days:3, reason:'Marriage at home.' } });

    await page.click('#bOut'); await page.waitForTimeout(400);
    /* the Collector signs in with a PIN of his own, set the same way */
    E.post({ kind:'claimPin', u:'9000000001', emp:'', pin:'9090' });
    const code = (E.get('hrmsClaims', { token:E.ctx.issueToken_(E.ctx.findByPhone_('9000000001')) }).open || [])
      .filter(function(o){ return o.phone === '9000000001'; })[0];
    /* the Collector's row is not on the rollout list — he is seeded with the
       register, so his PIN is issued the way every other Collector PIN is */
    E.sheets['Users'].rows.forEach(function(r){
      if(String(r[0]).replace(/\D/g, '').slice(-10) === '9000000001') r[7] = E.ctx.hash_('9000000001', '9090'); });

    await page.fill('#iPhone', '9000000001'); await page.fill('#iPin', '9090');
    await page.click('#bSignin'); await page.waitForTimeout(1200);
    ck(await page.isVisible('#vHome'), 'the Collector signs in');
    ck(await page.isVisible('#bOrders'), 'AND HE IS OFFERED THE ORDERS SCREEN');
    ck(/2/.test(await page.textContent('#bOrdersN')), 'with what is waiting counted on the button',
       (await page.textContent('#bOrdersN')).trim());

    await page.click('#bOrders'); await page.waitForTimeout(900);
    ck(await page.isVisible('#vOrders'), 'it opens');
    const ol = await page.textContent('#oList');
    ck(/B\. Waiting/.test(ol), 'naming the employee');
    ck(/Typist/.test(ol) && /DPO/.test(ol), 'with his designation and office, so an order is passed on a person');
    ck(/Marriage at home/.test(ol), 'and the reason the orders are passed on');
    await page.screenshot({ path: path.join(OUT, '8-orders.png') });

    /* SANCTION ONE */
    await page.click('[data-ok="HR-W1"]'); await page.waitForTimeout(1000);
    ck(/Sanctioned/.test(await page.textContent('#mOrders')), 'one is sanctioned');
    const row = E.sheets['Leave'].rows.filter(function(r){ return r[0] === 'HR-W1'; })[0];
    ck(String(row[14]).toUpperCase() === 'APPROVED', 'AND THE REGISTER SAYS SO', String(row[14]));
    ck(!/B\. Waiting[\s\S]*Village work/.test(await page.textContent('#oList')) ||
       !/Village work/.test(await page.textContent('#oList')),
       'and it leaves the waiting list by itself');

    /* A REFUSAL CARRIES ITS OWN WORDS */
    page.once('dialog', d => d.accept('   '));
    await page.click('[data-no="HR-W2"]'); await page.waitForTimeout(700);
    ck(/needs its reason/.test(await page.textContent('#mOrders')),
       'A REFUSAL WITH NO WORDS IS REFUSED — they are what the employee is told');
    const still = E.sheets['Leave'].rows.filter(function(r){ return r[0] === 'HR-W2'; })[0];
    ck(String(still[14] || 'PENDING').toUpperCase() === 'PENDING', 'and nothing was written by it');

    page.once('dialog', d => d.accept('The office cannot spare you that week.'));
    await page.click('[data-no="HR-W2"]'); await page.waitForTimeout(1000);
    ck(/Refused, and the employee is told why/.test(await page.textContent('#mOrders')), 'with words, it is refused');
    const gone = E.sheets['Leave'].rows.filter(function(r){ return r[0] === 'HR-W2'; })[0];
    ck(String(gone[14]).toUpperCase() === 'REJECTED', 'the register records the refusal');
    ck(String(gone[17] || '').indexOf('cannot spare') >= 0,
       'AND KEEPS THE WORDS — nothing is destroyed (rule 7)', String(gone[17] || ''));
    await page.screenshot({ path: path.join(OUT, '9-orders-passed.png') });

    const ow = await page.evaluate(() => document.body.innerText);
    ck(!/show.?cause|debit/i.test(ow), 'and the orders screen names no sanction either');
  }

  /* ---- 7. it is a leave register and says so ---- */
  await page.click('#bOrdersBack').catch(() => {}); await page.waitForTimeout(400);
  const foot = await page.textContent('#hFoot');
  ck(/takes no attendance and raises no notice/.test(foot),
     'the page says plainly that it takes no attendance and raises no notice', foot.trim().slice(0, 60));
  const whole = await page.evaluate(() => document.body.innerText);
  ck(!/show.?cause|debit|attendance mark/i.test(whole), 'and nothing on it names a sanction');

  const wide = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  ck(!wide, 'no sideways scroll at 390px');
  ck(errs.length === 0, 'no script error', errs[0] || '');

  /* ---- 8. AN APP WITH NO ADDRESS DOES NOT BLAME THE OFFICER'S SIGNAL ----

     The boot guard said plainly that config.js had not been written — and
     then the employee pressed the only button on the screen, the POST went to
     the page itself, the browser answered 405, and the catch replaced that
     honest sentence with 'Try again where there is a line.' He was being told
     the fault was his network on a register that had never been stood up, and
     he would try again at a better signal for ever. Found by rendering the
     live /hrms/ the day it was published, which is where the install card
     points today. */
  {
    const srv2 = await serve(true);
    const p2 = await br.newPage({ viewport:{ width:390, height:844 } });
    const e2 = []; p2.on('pageerror', x => e2.push(String(x.message)));
    await p2.goto('http://127.0.0.1:' + srv2.address().port + '/?t=' + Date.now(),
                  { waitUntil:'networkidle' });
    await p2.waitForTimeout(500);

    const arrival = (await p2.textContent('#mSignin')).trim();
    ck(/no district address/i.test(arrival),
       'with no config.js it says on arrival that the app has no district address',
       arrival.slice(0, 50));

    await p2.fill('#iPhone', '9876543210');
    await p2.fill('#iPin', '1234');
    await p2.click('#bSignin');
    await p2.waitForTimeout(800);
    const after = (await p2.textContent('#mSignin')).trim();
    ck(!/where there is a line|could not be reached/i.test(after),
       'AND PRESSING SIGN IN DOES NOT BLAME HIS SIGNAL', after.slice(0, 60));
    ck(/not been stood up/i.test(after),
       'it says the register has not been stood up', after.slice(0, 60));
    ck(/not your signal/i.test(after),
       'and says in as many words that it is not his signal');
    ck(await p2.isVisible('#vSignin'), 'he is left on the sign-in screen, not a blank one');
    ck(e2.length === 0, 'no script error with no config', e2[0] || '');
    await p2.screenshot({ path: path.join(OUT, '10-no-address.png'), fullPage:true });
    await p2.close(); srv2.close();
  }

  await br.close(); srv.close();
  console.log('\n  ' + pass + ' passed, ' + fail + ' failed   ·   screenshots in Info/hrms-render/\n');
  process.exitCode = fail ? 1 : 0;
})();

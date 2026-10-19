/* THE DISTRICT HRMS APP — driven in a real browser, end to end.

   Rebuilt 18.10.2026 with the app. The employee's whole journey: a number the
   district seeded with his Service Register figures, a PIN he chooses
   himself, an application picked on a calendar, his own register and his
   year month by month afterwards; the head of an office's calendar of his
   own people; the Collector's inbox. Nothing here is mocked away except the
   network, and what the network answers is the REAL backend running in the
   Apps Script mock — so the app is driven against the same saveLeave_, the
   same overlap refusal, the same leaveOpening_ the district will run on.

   What it guards that is expensive to get wrong on a register that sanctions
   leave:
     · the first sign-in tells him the row is HIS TO CLAIM;
     · the figure on the rail is the register's, from the Service Register —
       9 of 15 after six availed before the balance date, 214 at credit — and
       never the pro-rated table once his office has supplied the figures;
     · a refusal is a refusal: nothing is shown as sent that the district did
       not take, and a dropped line is never reported as "no order was passed";
     · medical leave is never drawn as a balance of nought;
     · the heat map a head of office sees is HIS office's people and nobody
       else's, and the Collector's is the district's;
     · a driven browser is not shown the welcome, and asked for by name it
       draws and is gone with the sign-in underneath.

   Usage: node tests/render-hrms.js
   Playwright is deliberately not a dependency: npm i playwright --no-save. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const mock = require('./gasmock.js');
const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'hrms');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.webmanifest':'application/manifest+json', '.png':'image/png' };

/* ---- the real register, in the Apps Script mock ---- */
const NOW = '2026-10-19T10:00:00+05:30';                 /* a Monday */
const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active','Designation','EmpId',
           'Gender','DOB','Category','Department','Place','Gazetted','EnteredOn','PostOn','Status','Controller','AuthCL','AuthOther',
           'BalAsOn','ELCredit','HPLCredit','CLUsed','OHUsed','CCLUsed','VerifiedBy','VerifiedOn'];
const L = ['id','appliedAt','phone','name','role','mandal','type','fromDate','toDate','days',
           'reason','address','leaveHq','certificate','status','decidedBy','decidedAt','remarks','receivedAt','standingOrder'];
const OFFICE = 'Office of the District Panchayat Officer, Jangaon';
function register(){
  const e = mock.load({ now:NOW });
  e.props.TENANT = 'HRMS';
  e.mkSheet('Users', U, [
    { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Mandal:'', Active:'TRUE' },
    { Phone:'9000000002', Name:'V. Reddy', Role:'HOD', Mandal:OFFICE, Active:'TRUE', Designation:'District Panchayat Officer', EmpId:'HOD1', Hash:'' },
    { Phone:'9000000003', Name:'T. Rao', Role:'HOD', Mandal:'Office of the District Treasury Officer, Jangaon', Active:'TRUE', Designation:'District Treasury Officer', EmpId:'HOD2' },
    /* the employee, with the Service Register's figures as his office returned them */
    { Phone:'9444400001', Name:'K. Srinivas Rao', Role:'EMP', Mandal:OFFICE, Active:'TRUE', Designation:'Superintendent', EmpId:'2071534',
      Gender:'Male', DOB:'1972-06-15', Category:'Regular', Department:'Panchayat Raj and Rural Development', Place:'District Headquarters',
      Gazetted:'Non-Gazetted', EnteredOn:'1998-11-12', PostOn:'2025-07-01', Status:'On duty', Controller:'District Panchayat Officer, Jangaon',
      AuthCL:'District Panchayat Officer, Jangaon', AuthOther:'District Collector, Jangaon',
      BalAsOn:'2026-09-30', ELCredit:214, HPLCredit:168, CLUsed:6, OHUsed:2, VerifiedBy:'S. Laxmi, Superintendent (A Section)', VerifiedOn:'2026-09-30' },
    { Phone:'9444400002', Name:'M. Anitha', Role:'EMP', Mandal:OFFICE, Active:'TRUE', Designation:'Senior Assistant', EmpId:'E2', Gender:'Female', BalAsOn:'2026-09-30', CLUsed:3, CCLUsed:0 },
    { Phone:'9444400003', Name:'P. Swapna', Role:'EMP', Mandal:'Office of the District Treasury Officer, Jangaon', Active:'TRUE', Designation:'Typist', EmpId:'E3', Gender:'Female' }
  ]);
  e.mkSheet('Leave', L, [
    /* sanctioned leave in his office, and in another, for the calendar */
    { id:'L-A1', appliedAt:'2026-10-10T09:00:00Z', phone:'9444400002', name:'M. Anitha', role:'EMP', mandal:OFFICE, type:'CL', fromDate:'2026-10-19', toDate:'2026-10-21', days:3,
      reason:'Family function', status:'APPROVED', decidedBy:'Sandeep Kumar Jha (COLLECTOR)', decidedAt:'2026-10-11T04:00:00Z', receivedAt:'2026-10-10T09:00:00Z' },
    { id:'L-A2', appliedAt:'2026-10-01T09:00:00Z', phone:'9444400002', name:'M. Anitha', role:'EMP', mandal:OFFICE, type:'EL', fromDate:'2026-10-05', toDate:'2026-10-09', days:5,
      reason:'Personal', status:'APPROVED', decidedBy:'Sandeep Kumar Jha (COLLECTOR)', decidedAt:'2026-10-02T04:00:00Z', receivedAt:'2026-10-01T09:00:00Z' },
    { id:'L-T1', appliedAt:'2026-10-12T09:00:00Z', phone:'9444400003', name:'P. Swapna', role:'EMP', mandal:'Office of the District Treasury Officer, Jangaon', type:'CL', fromDate:'2026-10-19', toDate:'2026-10-19', days:1,
      reason:'Not well', status:'APPROVED', decidedBy:'Sandeep Kumar Jha (COLLECTOR)', decidedAt:'2026-10-13T04:00:00Z', receivedAt:'2026-10-12T09:00:00Z' },
    /* one awaiting orders in the Treasury, for the inbox */
    { id:'L-T2', appliedAt:'2026-10-18T09:00:00Z', phone:'9444400003', name:'P. Swapna', role:'EMP', mandal:'Office of the District Treasury Officer, Jangaon', type:'CL', fromDate:'2026-10-27', toDate:'2026-10-28', days:2,
      reason:'Child’s examinations', status:'PENDING', receivedAt:'2026-10-18T09:00:00Z' }
  ]);
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
  /* THE HANDSET'S CLOCK IS PINNED to the register's day, or the picker greys
     the days the fixture applies for and the pass fails one week in seven */
  const ctx = await br.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:2 });
  await ctx.addInitScript(`{ const T = ${Date.parse(NOW)}; const _D = Date;
    class D extends _D { constructor(...a){ super(...(a.length ? a : [T])); } static now(){ return T; } }
    window.Date = D; }`);
  /* the four location readings come a couple of seconds apart on a phone;
     the pass need not wait for them */
  await ctx.addInitScript('window.HRMS_STILL_GAP = 120;');
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));

  let E = register();
  let dead = false;
  const bulk = [], sent = [], marks = [];
  await page.route('**/hrms.district/**', r => {
    if(dead) return r.abort('failed');
    const q = r.request();
    let out;
    if(q.method() === 'POST'){
      let b = {}; try{ b = JSON.parse(q.postData() || '{}'); }catch(e){}
      if(Array.isArray(b.ids)) bulk.push(b.ids.length);
      if(b.kind === 'leave') sent.push(b.leave || {});
      if(b.kind === 'attendance') marks.push(b);
      out = E.post(b);
    } else {
      const sp = new URL(q.url()).searchParams, p = {};
      sp.forEach((v, k) => { p[k] = v; });
      out = E.get(p.op, p);
    }
    r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(out) });
  });
  const shot = n => page.screenshot({ path: path.join(OUT, n + '.png') });
  const txt = async sel => (await page.textContent(sel).catch(() => '')) || '';
  const settle = (ms) => page.waitForTimeout(ms || 500);

  await page.goto(base + '/', { waitUntil:'domcontentloaded' });
  await settle(400);

  /* ---- 1. the first sign-in ---- */
  ck(await page.isVisible('#iPhone'), 'the app opens on sign in');
  ck(!(await page.$('#welcome')), 'A DRIVEN BROWSER IS NOT SHOWN THE WELCOME — the pass sees the app');
  await shot('0-sign-in');
  await page.fill('#iPhone', '9444400001'); await page.fill('#iPin', '1234');
  await page.click('#bSignin'); await settle(700);
  ck(await page.isVisible('#cEmp'), 'A NUMBER WITH NO PIN IS SHOWN THE CLAIM SCREEN, not an error telling him to telephone the office');
  ck(/K\. Srinivas Rao/.test(await txt('#claimName')), 'greeting him by name', await txt('#claimName'));
  await shot('1-claim');
  await page.fill('#cEmp', '0000000'); await page.fill('#cPin', '8421'); await page.fill('#cPin2', '8421');
  await page.click('#bClaim'); await settle(600);
  ck(/do not match/.test(await txt('#mClaim')), 'a wrong employee id is refused', (await txt('#mClaim')).slice(0, 60));
  await page.fill('#cEmp', '2071534');
  await page.click('#bClaim'); await settle(900);
  ck(await page.isVisible('[data-act="newreq"]'), 'the right one sets his PIN and lands him on Home');
  ck(/^K\. Srinivas Rao$/.test((await txt('.title-l')).trim()), 'GREETED BY HIS WHOLE NAME, not its last two words', await txt('.title-l'));

  /* ---- 2. THE RAIL IS THE REGISTER'S ACCOUNT, off the Service Register ---- */
  const rail = await page.$$eval('.rail .bal', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  ck(rail.length >= 5, 'the rail carries his kinds of leave', rail.length + ' cards');
  ck(/Casual leave\s*9\s*of 15/.test(rail[0] || ''), 'CASUAL LEAVE IS 9 OF 15: the year’s fifteen less the six his office recorded, NOT the pro-rated four', rail[0]);
  ck(/Earned leave\s*214\s*days/.test(rail[1] || ''), 'EARNED LEAVE IS THE BALANCE AT CREDIT, 214', rail[1]);
  ck(/Half pay leave\s*168/.test(rail[2] || ''), 'half pay leave is offered because his record carries it', rail[2]);
  ck(/Optional holiday\s*1\s*of 3/.test(rail[3] || ''), 'optional holidays: one of the Collector’s three left after two availed', rail[3]);
  ck(!rail.some(x => /Child care/.test(x)), 'child care leave is not offered to a man whose record carries none');
  const ml = rail.filter(x => /Medical/.test(x))[0] || '';
  ck(/0\s*taken/.test(ml) && /no yearly limit/.test(ml), 'MEDICAL LEAVE IS NEVER A BALANCE OF NOUGHT', ml);
  ck(!(await page.isVisible('[data-tab="inbox"]')), 'an employee has no Inbox tab');
  await shot('2-home');

  /* ---- 3. he applies: two taps on the calendar, then the details ---- */
  await page.click('[data-act="newreq"]'); await settle(300);
  ck(await page.isVisible('[data-pick]'), 'the request opens on a calendar');
  ck(/Tap the first day/.test(await txt('.card.tonal b')), 'and asks for the first day');
  await page.click('[data-pick="2026-10-27"]'); await settle(150);
  await page.click('[data-pick="2026-10-28"]'); await settle(150);
  ck(/2 days/.test(await txt('.card.tonal b')), 'two taps are two days', await txt('.card.tonal b'));
  ck(/leaves you 7 of 15/.test(await txt('.card.tonal span')), 'and he is told what it leaves him before he asks', await txt('.card.tonal span'));
  await shot('3-pick');
  /* a day already gone cannot be picked */
  await page.click('[data-pick="2026-10-13"]'); await settle(200);
  ck(/already gone/.test(await txt('#toast')), 'a day already gone is refused on the phone', await txt('#toast'));
  await page.click('[data-act="next"]'); await settle(300);
  ck(await page.isVisible('#rReason'), 'step two asks for the reason');
  ck(!(await page.isVisible('#rCert')), 'and not for a certificate, because this is casual leave');
  await page.click('[data-act="send"]'); await settle(300);
  ck(/reason is needed/i.test(await txt('#mApply')), 'without a reason nothing goes', await txt('#mApply'));
  await page.fill('#rReason', 'Personal work at native place');
  await page.fill('#rAddr', 'Khammam');
  await page.click('[data-act="hq"]');
  await shot('3b-details');
  await page.click('[data-act="send"]'); await settle(900);
  ck(/Sent to the District Magistrate/.test(await txt('#toast')), 'SENT TO THE DISTRICT MAGISTRATE, and nothing else is said', await txt('#toast'));
  ck(sent.length === 1 && sent[0].type === 'CL' && sent[0].from === '2026-10-27' && sent[0].to === '2026-10-28' && sent[0].days === 2 && sent[0].hq === true,
     'what went on the wire is what he picked', JSON.stringify(sent[0]));
  const lv = E.sheets['Leave'].rows.slice(1).filter(r => String(r[2]) === "'9444400001" || String(r[2]) === '9444400001');
  ck(lv.length === 1 && String(lv[0][14]) === 'PENDING', 'and the REGISTER holds it, PENDING');
  const home1 = await txt('#screen');
  ck(/Awaiting orders/.test(home1), 'it stands on his home screen as awaiting orders');
  await shot('4-home-after');

  /* ---- 3a. the certificate follows the kind ---- */
  await page.click('[data-act="newreq"]'); await settle(300);
  await page.click('[data-kind="ML"]'); await settle(200);
  await page.click('[data-cm="1"]'); await settle(150);              /* November */
  await page.click('[data-pick="2026-11-02"]'); await page.click('[data-pick="2026-11-04"]'); await settle(150);
  ck(/inside a spell of 15/.test(await txt('.card.tonal span')), 'medical leave is measured against the spell, not a year', await txt('.card.tonal span'));
  await page.click('[data-act="next"]'); await settle(300);
  ck(await page.isVisible('#rCert'), 'and step two asks for the certificate');
  await page.click('[data-go="home"]'); await settle(300);

  /* ---- 3b. an optional holiday is one notified day ---- */
  await page.click('[data-act="newreq"]'); await settle(300);
  await page.click('[data-kind="OH"]'); await settle(200);
  await page.click('[data-pick="2026-10-28"]'); await settle(200);
  ck(/notified days/.test(await txt('#toast')), 'a day not on the G.O.’s list is refused for an optional holiday', await txt('#toast'));
  await page.click('[data-cm="1"]'); await settle(150);              /* November */
  await page.click('[data-pick="2026-11-08"]'); await settle(200);
  ck(/1 day/.test(await txt('.card.tonal b')) && /Naraka Chaturdhi/.test(await txt('.scroll')), 'a notified day is taken and named', await txt('.card.tonal b'));
  await page.click('[data-go="home"]'); await settle(300);

  /* ---- 4. the overlap is the REGISTER's refusal, not the page's ---- */
  await page.click('[data-act="newreq"]'); await settle(300);
  await page.click('[data-pick="2026-10-28"]'); await page.click('[data-pick="2026-10-29"]'); await settle(150);
  await page.click('[data-act="next"]'); await settle(300);
  await page.fill('#rReason', 'again'); await page.click('[data-act="send"]'); await settle(700);
  ck(/already with the Collector/.test(await txt('#mApply')), 'a second application over the same days is refused by the register', (await txt('#mApply')).slice(0, 70));
  ck(E.sheets['Leave'].rows.slice(1).filter(r => /9444400001/.test(String(r[2]))).length === 1, 'and nothing was written');

  /* ---- 5. NOTHING IS SHOWN AS SENT THAT WAS NOT ---- */
  dead = true;
  await page.click('[data-go="request"]'); await settle(200);        /* back to the calendar */
  await page.click('[data-cm="1"]'); await settle(150);              /* November */
  await page.click('[data-pick="2026-11-16"]'); await page.click('[data-pick="2026-11-17"]'); await settle(150);
  await page.click('[data-act="next"]'); await settle(300);
  await page.fill('#rReason', 'road'); await page.click('[data-act="send"]'); await settle(700);
  ck(/nothing has been applied for/.test(await txt('#mApply')), 'on a dead line he is told nothing was applied for', (await txt('#mApply')).slice(0, 70));
  dead = false;
  await page.click('[data-go="home"]'); await settle(300);

  /* ---- 6. his register, his year, the request opened ---- */
  await page.click('[data-tab="leave"]'); await settle(400);
  ck(await page.isVisible('.months'), 'the Leave screen carries his year month by month');
  const strip = await page.$$eval('.months .m', els => els.map(e => e.className + '|' + e.textContent.trim()));
  ck(/\bw\b/.test(strip[9] || ''), 'OCTOBER IS OUTLINED AS AWAITING, not drawn as taken', strip[9]);
  ck(/Opening balances/.test(await txt('#screen')) && /S\. Laxmi/.test(await txt('#screen')), 'the opening balances name who verified them');
  await shot('5-leave');
  await page.click('[data-detail]'); await settle(300);
  ck(/With the District Magistrate/.test(await txt('.steps')) && /Awaiting orders/.test(await txt('.steps')), 'the request’s journey stands with the District Magistrate');
  ck(await page.isVisible('[data-act="withdraw"]'), 'and he may withdraw it while it waits');
  await shot('6-request');
  await page.click('[data-go="leave"]'); await settle(300);

  /* ---- 7. his own calendar ---- */
  await page.click('[data-tab="calendar"]'); await settle(400);
  ck(!(await page.isVisible('[data-scope]')), 'an employee is offered no office calendar');
  ck((await page.$$('.cal .d.mine')).length === 2, 'his two days awaiting orders are outlined on his own calendar');
  ck(/Holidays this month/.test(await txt('#screen')), 'and the month’s holidays are listed');
  await shot('7-calendar');

  /* ---- 7a. ATTENDANCE, VOLUNTARY (19.10.2026) ----
     The card offers the mark and names no sanction; the sheet holds Mark
     until the location is read and the photograph taken; one mark goes up
     with its readings and its photograph; the card then reads the
     district's receipt and the register holds one row. */
  await ctx.grantPermissions(['geolocation'], { origin: base });
  await ctx.setGeolocation({ latitude: 17.7215, longitude: 79.1512, accuracy: 30 });
  await page.click('[data-tab="home"]'); await settle(400);
  const tc = await txt('#todayCard');
  ck(/Attendance/.test(tc) && /not marked/.test(tc) && !/voluntary/i.test(tc), 'the Today card offers the mark and nothing more — not even the word voluntary (19.10.2026)', tc.replace(/\s+/g, ' ').trim().slice(0, 80));
  ck(!/notice|debit|casual leave|lock/i.test(tc), 'and not one word on it names a sanction');
  await page.click('[data-act="mark"]'); await settle(300);
  ck(await page.isVisible('#attMark'), 'the mark sheet opens');
  ck(await page.$eval('#attMark', b => b.disabled), 'and Mark is held until the location is read and the photograph taken');
  await page.waitForFunction(() => { const s = document.getElementById('sheet').textContent; return /Location ±/.test(s) && !/Reading your location/.test(s); }, null, { timeout: 20000 });
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  await page.setInputFiles('#attFile', { name: 'selfie.png', mimeType: 'image/png', buffer: PNG }); await settle(600);
  ck(!(await page.$eval('#attMark', b => b.disabled)), 'with both in hand, Mark is live');
  await shot('7a-mark');
  await page.click('#attMark'); await settle(1000);
  ck(marks.length === 1 && !!marks[0].att && (marks[0].att.reads.r1 || []).length === 4, 'ONE MARK WENT UP, with its four readings', String(marks.length));
  ck(!!(marks[0] && marks[0].photo && marks[0].photo.b64), 'and its photograph');
  const tc2 = await txt('#todayCard');
  ck(/Marked at/.test(tc2) && /Received by the district/.test(tc2), 'THE CARD READS THE DISTRICT\'S RECEIPT', tc2.replace(/\s+/g, ' ').trim().slice(0, 80));
  const AT = E.sheets['Attendance'], ahd = AT ? AT.rows[0].map(String) : [];
  const attRows = AT ? AT.rows.slice(1) : [];
  ck(attRows.length === 1 && String(attRows[0][ahd.indexOf('phone')]).replace(/^'/, '') === '9444400001', 'and the register holds one row, his', String(attRows.length));
  ck(!(await page.isVisible('[data-act="mark"]')), 'a second mark is not offered');
  await shot('7a-marked');

  /* ---- 8. sign out, and the Collector passes orders in the app ---- */
  await page.click('[data-tab="me"]'); await settle(300);
  ck(/2071534/.test(await txt('#screen')) && /Superannuation/.test(await txt('#screen')) && /30\.06\.2033/.test(await txt('#screen')),
     'ME carries his service record and his superannuation at sixty-one', '30.06.2033');
  await shot('8-me');
  await page.click('[data-act="signout"]'); await settle(300);
  ck(await page.isVisible('#iPhone'), 'signed out');
  /* the Collector claims his row the same way, with an employee id typed by hand */
  E.sheets['Users'].rows[1][10] = 'ADMIN1';
  await page.fill('#iPhone', '9000000001'); await page.fill('#iPin', '1111'); await page.click('#bSignin'); await settle(600);
  await page.fill('#cEmp', 'ADMIN1'); await page.fill('#cPin', '1111'); await page.fill('#cPin2', '1111'); await page.click('#bClaim'); await settle(1200);
  ck(await page.isVisible('[data-tab="inbox"]'), 'THE COLLECTOR HAS AN INBOX');
  const cnt = await txt('.nav .cnt');
  ck(cnt.trim() === '2', 'with the two applications waiting counted on the tab', cnt);
  ck(await page.isVisible('.cal.mini'), 'AND THE DISTRICT’S HEAT MAP ON HIS HOME SCREEN', await txt('.cal.mini .eyebrow'));
  ck(/The district on leave/.test(await txt('.cal.mini')), 'named as the district’s', await txt('.cal.mini .eyebrow'));
  const cell19 = await page.getAttribute('.cal.mini [data-day="2026-10-19"]', 'class');
  ck(/k[1-5]/.test(cell19 || '') && /today/.test(cell19 || ''), 'today carries the two away and is outlined', cell19);
  await shot('9-collector-home');
  await page.click('[data-tab="inbox"]'); await settle(500);
  ck((await page.$$('[data-order]')).length === 2, 'the inbox lists both');
  await shot('10-inbox');
  await page.click('[data-order]'); await settle(300);
  ck(/Asks for/.test(await txt('#screen')), 'an application opens for orders');
  await page.click('[data-act="refuse"]'); await settle(200);
  ck(/Remarks are needed/.test(await txt('#mOrder')), 'A REFUSAL WITHOUT WORDS IS REFUSED', await txt('#mOrder'));
  await shot('11-order');
  await page.click('[data-act="sanction"]'); await settle(900);
  ck(/Sanctioned\./.test(await txt('#toast')), 'sanctioned', await txt('#toast'));
  const okRows = E.sheets['Leave'].rows.slice(1).filter(r => String(r[14]) === 'APPROVED' && /Sandeep/.test(String(r[15])));
  ck(okRows.length === 4, 'the register holds the order in the Collector’s hand', okRows.length + ' approved');
  ck((await page.$$('[data-order]')).length === 1, 'and one is left');
  /* the one left is refused, with words */
  await page.click('[data-order]'); await settle(300);
  await page.fill('#oRem', 'Review of the mandal works is fixed for that week.');
  await page.click('[data-act="refuse"]'); await settle(900);
  ck(/told why/.test(await txt('#toast')), 'refused, and the employee is told why', await txt('#toast'));
  ck(E.sheets['Leave'].rows.slice(1).some(r => String(r[14]) === 'REJECTED' && /mandal works/.test(String(r[17]))), 'the words are on the register');
  ck(/Nothing is waiting/.test(await txt('#screen')), 'the desk is clear');

  /* ---- 8a. SANCTION ALL REALLY MEANS ALL, in batches of twenty-five ---- */
  for(let i = 0; i < 30; i++) E.addRow('Leave', { id:'B-' + i, appliedAt:'2026-10-18T0' + (i % 9) + ':00:00Z', phone:'9444400002', name:'M. Anitha', role:'EMP', mandal:OFFICE,
    type:'EL', fromDate:'2027-0' + (1 + (i % 9)) + '-' + ('0' + (1 + (i % 27))).slice(-2), toDate:'2027-0' + (1 + (i % 9)) + '-' + ('0' + (1 + (i % 27))).slice(-2), days:1, reason:'b' + i, status:'PENDING', receivedAt:'2026-10-18T09:00:00Z' });
  await page.click('[data-act="refresh"]'); await settle(900);
  ck((await page.$$('[data-order]')).length === 30, 'thirty are waiting');
  await page.click('[data-act="all"]'); await settle(300);
  await page.click('#sheet [data-yes]'); await settle(2500);
  ck(bulk.length === 2 && bulk[0] === 25 && bulk[1] === 5, 'TWO REQUESTS OF 25 AND 5 — never one that the server would cut at 200', JSON.stringify(bulk));
  ck(/30 sanctioned/.test(await txt('#mOrders')), 'and thirty sanctioned', await txt('#mOrders'));
  await shot('12-sanction-all');

  /* ---- 8b. a lost line is never 'no order was passed' ---- */
  E.addRow('Leave', { id:'C-1', appliedAt:'2026-10-18T09:00:00Z', phone:'9444400002', name:'M. Anitha', role:'EMP', mandal:OFFICE, type:'CL', fromDate:'2026-12-01', toDate:'2026-12-01', days:1, reason:'c', status:'PENDING', receivedAt:'2026-10-18T09:00:00Z' });
  await page.click('[data-act="refresh"]'); await settle(900);
  await page.click('[data-order]'); await settle(300);
  dead = true;
  await page.click('[data-act="sanction"]'); await settle(700);
  const lost = await txt('#mOrder');
  ck(/NOT KNOWN/.test(lost) && !/no order has been passed\./i.test(lost.replace(/if the application is still on it, no order has been passed on it\./i, '')), 'A DROPPED LINE SAYS WHAT IS CERTAIN AND WHAT IS NOT', lost.slice(0, 80));
  dead = false;
  await page.click('[data-go="inbox"]'); await settle(300);

  /* ---- 9. THE HEAD OF AN OFFICE SEES HIS OWN PEOPLE AND NOBODY ELSE'S ---- */
  await page.click('[data-tab="me"]'); await settle(200); await page.click('[data-act="signout"]'); await settle(300);
  await page.fill('#iPhone', '9000000002'); await page.fill('#iPin', '2222'); await page.click('#bSignin'); await settle(600);
  await page.fill('#cEmp', 'HOD1'); await page.fill('#cPin', '2222'); await page.fill('#cPin2', '2222'); await page.click('#bClaim'); await settle(1200);
  ck(!(await page.isVisible('[data-tab="inbox"]')), 'a head of office has no inbox: every application goes to the Collector');
  ck(await page.isVisible('.cal.mini'), 'BUT HIS OFFICE’S HEAT MAP IS ON HIS HOME SCREEN');
  ck(/Your office on leave/.test(await txt('.cal.mini')), 'named as his office’s', await txt('.cal.mini .eyebrow'));
  await shot('13-hod-home');
  await page.click('[data-tab="calendar"]'); await settle(500);
  ck(await page.isVisible('[data-scope="office"]'), 'the calendar offers his office and his own');
  const away = await page.$$eval('.row .txt b', els => els.map(e => e.textContent.trim()));
  ck(away.indexOf('M. Anitha') >= 0 && away.indexOf('P. Swapna') < 0, 'AWAY TODAY IS HIS OFFICE: Anitha is on it and the Treasury’s typist is not', away.join(', '));
  const roll = await txt('.cal .small');
  ck(/of 3 on the roll/.test(roll), 'the roll is his office’s three', roll.slice(0, 120));
  await shot('14-hod-calendar');
  await page.click('[data-day="2026-10-19"]'); await settle(400);
  ck(/1<\/b> on sanctioned leave|<b>1<\/b>/.test(await page.innerHTML('#sheet')) || /\b1\b.*on sanctioned leave/.test(await txt('#sheet')), 'a day opens with its count', (await txt('#sheet')).slice(0, 60));
  await shot('15-day');

  ck(!errs.length, 'no script error anywhere above', errs.slice(0, 2).join(' | '));
  /* THE FIRST PAGE IS CLOSED BEFORE THE STORE IS TAMPERED WITH. The pages
     below share its origin and its localStorage, and a signed-in page writes
     its own live session back over the dead one planted for section 11 the
     next time it answers the district — which it does every few minutes and
     on every refresh. */
  await page.close();

  /* ---- 10. AN APP WITH NO ADDRESS DOES NOT BLAME THE OFFICER'S SIGNAL ---- */
  const srv2 = await serve(true);
  const p2 = await ctx.newPage(); const errs2 = []; p2.on('pageerror', e => errs2.push(String(e)));
  await p2.goto('http://127.0.0.1:' + srv2.address().port + '/', { waitUntil:'domcontentloaded' }); await p2.waitForTimeout(400);
  const m0 = (await p2.textContent('#mSignin').catch(() => '')) || '';
  ck(/no district address/.test(m0), 'with no config.js it says on arrival that the app has no district address', m0.slice(0, 60));
  await p2.fill('#iPhone', '9444400001'); await p2.fill('#iPin', '1234'); await p2.click('#bSignin'); await p2.waitForTimeout(500);
  const m1 = (await p2.textContent('#mSignin').catch(() => '')) || '';
  ck(/not your signal/.test(m1) && !/where there is a line/.test(m1), 'AND PRESSING SIGN IN DOES NOT BLAME HIS SIGNAL', m1.slice(0, 70));
  ck(!errs2.length, 'no script error with no config');
  await p2.close(); srv2.close();

  /* ---- 11. A TOKEN THE REGISTER WILL NOT TAKE ---- */
  /* ITS OWN CONTEXT, so no other page of this pass can write a live session
     back over the dead one planted below */
  const ctx3 = await br.newContext({ viewport:{ width:390, height:844 } });
  const p3 = await ctx3.newPage(); const errs3 = []; p3.on('pageerror', e => errs3.push(String(e)));
  await p3.route('**/hrms.district/**', r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:false, error:'auth' }) }));
  await p3.goto(base + '/', { waitUntil:'domcontentloaded' });
  await p3.evaluate(() => { localStorage.setItem('sjgp-hrms1', JSON.stringify({ session:{ token:'dead', user:{ name:'K. Srinivas Rao', role:'EMP', phone:'9444400001' } }, rows:[] })); });
  await p3.reload({ waitUntil:'domcontentloaded' }); await p3.waitForTimeout(1500);
  const m3 = (await p3.textContent('#mSignin').catch(() => '')) || '';
  ck(/no longer signed in/.test(m3), 'it says the device is not signed in any more', m3.slice(0, 60));
  ck(!/\bauth\b/.test(await p3.textContent('body')), 'THE WORD auth IS NEVER PUT ON THE SCREEN');
  const gone = await p3.evaluate(() => (JSON.parse(localStorage.getItem('sjgp-hrms1') || '{}').session));
  ck(gone == null, 'AND THE REJECTED TOKEN IS OFF THE HANDSET', String(gone));
  ck(!errs3.length, 'no script error on a refused token');
  await ctx3.close();

  /* ---- 12. THE WELCOME, asked for by name ---- */
  const ctx4 = await br.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:2 });   /* a fresh handset: nobody signed in */
  const p4 = await ctx4.newPage(); const errs4 = []; p4.on('pageerror', e => errs4.push(String(e)));
  await p4.goto(base + '/?welcome=1', { waitUntil:'domcontentloaded' }); await p4.waitForTimeout(300);
  ck(await p4.isVisible('#welcome'), 'asked for by name, the welcome draws');
  const emb = await p4.$eval('#welcome .emb img', i => i.complete && i.naturalWidth > 0).catch(() => false);
  ck(emb, 'and the emblem loaded');
  ck((await p4.$$('#welcome h1 span')).length === 2 && !!(await p4.$('#welcome .place')) && (await p4.$$('#welcome .chips span')).length === 3, 'the words of the name arrive in turn, then the place and the three things it is for');
  await p4.waitForTimeout(1500);
  await p4.screenshot({ path: path.join(OUT, '16b-welcome-landed.png') });
  await p4.screenshot({ path: path.join(OUT, '16-welcome.png') });
  await p4.waitForTimeout(2200);
  ck(!(await p4.$('#welcome')), 'and by four seconds it is GONE FROM THE DOCUMENT');
  ck(await p4.isVisible('#iPhone'), 'with sign in underneath');
  ck(!errs4.length, 'no script error with the welcome');
  await ctx4.close();

  await br.close(); srv.close();
  console.log('\n  ' + pass + ' passed, ' + fail + ' failed   ·   screenshots in Info/hrms-render/');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

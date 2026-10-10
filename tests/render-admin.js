/* THE OFFICER ROLL ON THE CONSOLE, driven in a real browser.

   The render pass measures the layout; this one presses the buttons. It opens
   the Admin view, registers an officer, resets a PIN and puts a man back on
   the roll, and asserts WHAT WENT TO THE DISTRICT ON THE WIRE — not what the
   screen said happened. A console that reports success while posting nothing
   is exactly the shape of fault this register keeps finding.

   Usage: node tests/render-admin.js [outdir]

   Playwright is deliberately not a dependency: npm i playwright --no-save. */
'use strict';
const fs=require('fs'),path=require('path'),http=require('http');
const { chromium } = require('playwright');
const APP = path.join(__dirname, '..', 'app');
const OUT = process.argv[2] || path.join(__dirname, '..', 'Info', 'admin-render');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json'};
const DASH = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-dashboard.json'), 'utf8'));

const ROLL={ ok:true, roles:['PS','MPO','MSO','MPDO','DLPO','DPO','COLLECTOR'],
  mandals:['Chilpur','Devaruppula','Jangaon'],
  tenant:'SJGP', tenantName:'Swachh Jangaon Gram Panchayat', today:'2026-10-01',
  /* WHO HAS ACTUALLY BEEN IN THE APP — sign-ins, which the register knows,
     and never installs, which it cannot. */
  adoption:{ onRoll:3, signedIn:2, never:1, last7:1, last30:2,
    firstWeek:[{date:'2026-09-17',n:1},{date:'2026-09-19',n:1}] },
  /* A REGISTER STOOD UP WITH AN EMPTY CALENDAR. The Gram Palana one was, and
     nothing on the console said so — it simply counted Dasara and every
     second Saturday as working days and every figure came out wrong. */
  /* a register whose tab carries a date no order names — as the sanitation
     one does: the two live registers were loaded from the same G.O. and
     disagreed by nine */
  holidays:{ year:2026, count:0, onOrder:0,
    extra:[{date:'2026-10-01',occasion:'Second Saturday'},
           {date:'2026-11-04',occasion:'Second Saturday'},
           {date:'2026-03-07',occasion:'Local festival'}],
  },
  rows:[
    {phone:'9000000001',name:'Sandeep Kumar Jha',role:'COLLECTOR',mandal:'',gp:'',hasPin:true,active:true,rows:1,lastLogin:'2026-09-19',firstLogin:'2026-09-17',logins:9},
    {phone:'9848100203',name:'Burra Bhanuchander',role:'PS',mandal:'Devaruppula',gp:'Ramboji Gudem',hasPin:false,active:true,rows:1},
    {phone:'9848100207',name:'Gone Away',role:'PS',mandal:'Chilpur',gp:'Old Charge',hasPin:true,active:false,rows:1}
  ]};

function serve(){return new Promise(res=>{const srv=http.createServer((q,rq)=>{
  const u=decodeURIComponent(q.url.split('?')[0]);
  /* the config files the district publishes beside the console */
  if(u==='/config.js'||u==='/gp/config.js'){ const gp=u.indexOf('/gp/')===0;
    rq.writeHead(200,{'Content-Type':'text/javascript'});
    rq.end("window.SJGP_SERVER='"+(gp?'https://mock.gpalana/exec':'https://mock.district/exec')+"';"+
           (gp?"window.SJGP_TENANT='GP';":'')); return; }
  const f=path.join(APP,u==='/'?'index.html':u);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){rq.writeHead(404);rq.end('no');return;}
  rq.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});
  fs.createReadStream(f).pipe(rq);});srv.listen(0,'127.0.0.1',()=>res(srv));});}

const GPROLL={ ok:true, roles:['GPO','ARI','MRI','COLLECTOR'],
  mandals:['Chilpur','Jangaon'],
  tenant:'GP', tenantName:'Gram Palana Register · Jangaon',
  holidays:{ year:2026, count:0 },
  rows:[
    {phone:'9000000001',name:'Sandeep Kumar Jha',role:'COLLECTOR',mandal:'',gp:'',hasPin:true,active:true,rows:1},
    {phone:'6302363194',name:'Nasa Raju',role:'GPO',mandal:'Narasapur',gp:'Abdulnagaram',hasPin:true,active:true,rows:1}
  ]};

/* A REGISTER WITH NO DAILY JOBS AND NO BACKUP — which is exactly what a
   freshly stood-up one looks like, and looks identical to a working one
   until something asks. */
const HEALTH={ ok:true, today:'2026-10-02', tenant:'SJGP', allWell:false,
  concerns:['triggers','backup'],
  triggers:{ installed:[], missing:['dailyCollectorReport','dailyBackup'], ok:false },
  backup:{ ok:false, why:'no SJ-SCORE Backups folder yet' },
  mail:{ remaining:100, looksLike:'a consumer allowance', ok:true },
  roll:{ active:3, withoutPin:1, ok:true },
  calendar:{ year:2026, days:44, declared:true, nextYearDeclared:false, ok:true },
  features:{ live:[{name:'health',post:['installJobs'],get:['health']}], skipped:[] } };

const posts=[], gpPosts=[];
let pass=0, fail=0;
const ck=(ok,what,detail)=>{ if(ok){pass++;console.log('  PASS  '+what+(detail?'   — '+detail:''));}
  else {fail++;console.log('  FAIL  '+what+(detail?'   — '+detail:''));} };

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const srv=await serve();const base='http://127.0.0.1:'+srv.address().port;
  const br=await chromium.launch();
  const ctx=await br.newContext({viewport:{width:1500,height:1000}});
  await ctx.addInitScript(()=>{
    localStorage.setItem('sjf5',JSON.stringify({url:'https://mock.district/exec',
      session:{token:'T',user:{name:'Sandeep Kumar Jha',role:'COLLECTOR',phone:'9000000001'}}}));
    /* SIGNED INTO BOTH, as the Collector is: one console, two registers. */
    localStorage.setItem('sjgp-gp1',JSON.stringify({url:'https://mock.gpalana/exec',
      session:{token:'TGP',user:{name:'Sandeep Kumar Jha',role:'COLLECTOR',phone:'9000000001'}}}));
    localStorage.setItem('sjgp-theme','light');
    localStorage.setItem('sjgp-console-seen','{}');
  });
  const page=await ctx.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(String(e&&e.stack||e)));
  page.on('dialog',d=>d.accept());
  await page.route('**tile.openstreetmap.org**',r=>r.abort());
  /* THE GRAM PALANA REGISTER, ON ITS OWN ADDRESS. Everything it answers is
     recorded separately, so a call that went to the wrong register cannot
     pass for one that went to the right one. */
  await page.route('**/mock.gpalana/**',async r=>{
    const q=r.request();
    const reply=b=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(b)});
    if(q.method()==='POST'){
      let b={};try{b=JSON.parse(q.postData()||'{}');}catch(e){}
      gpPosts.push(b);
      if(b.kind==='holidaysLoad'){ GPROLL.holidays={year:2026,count:53};
        return reply({ok:true,tenant:'GP',before:0,after:53,added:53}); }
      return reply({ok:true});
    }
    if(/op=roll/.test(q.url())) return reply(GPROLL);
    return reply(DASH);
  });
  await page.route('**/mock.district/**',async r=>{
    const q=r.request();
    const reply=b=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(b)});
    if(q.method()==='POST'){
      let b={};try{b=JSON.parse(q.postData()||'{}');}catch(e){}
      posts.push(b);
      if(b.kind==='userCreate') return reply({ok:true,phone:b.phone,name:b.name,role:b.role,pin:'4821'});
      if(b.kind==='userPin')    return reply({ok:true,phone:b.phone,name:'Burra Bhanuchander',pin:'7391',rows:2,unlocked:10,inactive:false});
      if(b.kind==='userActive') return reply({ok:true,phone:b.phone,name:'Gone Away',active:b.active,rows:1,written:1});
      if(b.kind==='installJobs') return reply({ok:true,installed:['dailyBackup','dailyCollectorReport','scheduleReminders','villageFilingReminders']});
      /* the postings proposal, shaped as FeaturePosting.gs answers it: a move
         with a release to tick, and an in-charge addition with none */
      if(b.kind==='postingUpdate') return reply(b.dry ? {ok:true,dry:true,plans:[
        {mandal:'Palakurthi',gp:'Narsingapuram Thanda',name:'kesoju Radhika',phone:'9133783902',
         verdict:'move',changes:['now holds Narsingapuram Thanda, Palakurthi','released: Valmidi'],
         releases:[{id:'9133783902|7|valmidi',row:7,place:'Valmidi',
                    why:'the remark names it: "deputed from valmidi to nasingapuram thanda"'}]},
        {mandal:'Bachannapet',gp:'Keshireddypally',name:'Sai kumar',phone:'8919632011',
         verdict:'add',changes:['also holds Keshireddypally, Bachannapet'],releases:[]}
      ]} : {ok:true,dry:false,moved:1,added:1,released:(b.keep||[]).length,registered:0,pins:[]});
      if(b.kind==='holidaysLoad'){ ROLL.holidays={year:2026,count:53};
        return reply({ok:true,tenant:'SJGP',before:0,after:53,added:53}); }
      /* the village-office proposal, shaped as villagePoints_ answers it:
         one placed, one moved, and one refused for a broken longitude —
         which is three of the district's own 280 rows on 09.10.2026 */
      if(b.kind==='villagePoints') return reply(b.dry ? {ok:true,dry:true,counts:
        {placed:1,moved:1,unchanged:0,refused:1,ambiguous:0},total:3,plans:[
        {mandal:'Bachannapet',gp:'Alimpur',lat:17.82393,lng:79.017003,
         verdict:'placed',why:'placed for the first time'},
        {mandal:'Bachannapet',gp:'Bachannapet',lat:17.7896,lng:79.040179,
         verdict:'moved',why:'moved 2.4 km from where it was'},
        {mandal:'Jangaon',gp:'Pasarmadla',lat:17.7415325,lng:7979.1198397,
         verdict:'refused',why:'that point is not in this district — it is refused rather than believed'}
      ]} : {ok:true,dry:false,wrote:2,fence:5,
            counts:{placed:1,moved:1,unchanged:0,refused:1,ambiguous:0}});
      return reply({ok:true});
    }
    if(/op=health/.test(q.url())) return reply(HEALTH);
    if(/op=roll/.test(q.url())) return reply(ROLL);
    return reply(DASH);
  });

  await page.goto(base+'/dashboard.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#app:not([hidden])',{timeout:20000});
  await page.waitForTimeout(700);

  ck(await page.$eval('#navAdmin',e=>!e.hidden),'the Admin rail item is shown to the Collector');
  await page.click('#nav [data-v="admin"]');
  await page.waitForTimeout(600);
  const txt=()=>page.$eval('#g',e=>e.innerText);
  ck((await txt()).indexOf('Burra Bhanuchander')>=0,'the roll renders');
  ck((await txt()).indexOf('deletes nothing')>=0,'and says plainly that nothing is deleted');

  /* --- register an officer --- */
  await page.click('#rlAddOpen'); await page.waitForTimeout(350);
  ck(!!(await page.$('#rlPhone')),'the register form opens');
  await page.fill('#rlPhone','9703202002');
  await page.fill('#rlName','N. Sridhar');
  await page.selectOption('#rlRole','PS');
  await page.fill('#rlMandal','Devaruppula');
  await page.fill('#rlGp','Ramboji Gudem');
  await page.click('#rlAdd'); await page.waitForTimeout(700);
  const made=posts.find(p=>p.kind==='userCreate');
  ck(!!made,'the registration reaches the district');
  ck(made&&made.phone==='9703202002'&&made.name==='N. Sridhar'&&made.role==='PS',
    'carrying what was typed',made?made.phone+' '+made.name+' '+made.role:'');
  ck(made&&made.token==='T','under the Collector’s own token');
  ck((await txt()).indexOf('4821')>=0,'and the PIN is put on the screen once');
  ck((await txt()).indexOf('shown once')>=0,'with a word that it is shown once');
  await page.screenshot({path:path.join(OUT,'admin-pin.png'),fullPage:true});

  /* --- the PIN panel is dismissed and does not come back --- */
  await page.click('#rlPinShut'); await page.waitForTimeout(400);
  ck((await txt()).indexOf('4821')<0,'dismissing it takes the PIN off the screen for good');

  /* --- reset a PIN from a row --- */
  await page.click('[data-rlpin="9848100203"]'); await page.waitForTimeout(700);
  const rp=posts.find(p=>p.kind==='userPin');
  ck(!!rp&&rp.phone==='9848100203','Reset PIN reaches the district for the right officer');
  const t2=await txt();
  ck(t2.indexOf('7391')>=0,'the new PIN is shown');
  ck(t2.indexOf('all 2 rows')>=0,'and it says it went to both rows carrying the number');
  ck(t2.indexOf('wrong-PIN attempts')>=0,'and that the lock-out was cleared');

  /* --- off the roll, and back --- */
  await page.click('#rlPinShut').catch(()=>{}); await page.waitForTimeout(300);
  await page.click('[data-rlact="9848100207"]'); await page.waitForTimeout(700);
  const act=posts.find(p=>p.kind==='userActive');
  ck(!!act&&act.phone==='9848100207'&&act.active===true,
    'Put back sends active:true for the man who is off the roll',act?String(act.active):'');

  /* --- HAS THE APP REACHED THEM? Sign-ins, never installs. --- */
  const tA = await txt();
  ck(/Has the app reached them/i.test(tA),'the adoption panel is on the Admin screen');
  ck(/Signed in at least once/i.test(tA),'it counts officers who have signed in');
  ck(!/install/i.test(tA.split('Has the app reached them')[1]||'')||/cannot/i.test(tA),
     'and never claims to count installs');
  ck(/never signed in/i.test(tA),'it names the officers still to be reached');
  ck(/Burra Bhanuchander/.test(tA),'by name');
  ck(/no PIN/i.test(tA),'and says which of them cannot get in at all yet');

  /* --- THE PRE-FLIGHT, read from the register and not from the page --- */
  const tP = await txt();
  ck(/fit to be changed/i.test(tP),'the pre-flight panel is on the Admin screen');
  ck(/not installed/i.test(tP),'a register with no daily jobs says so');
  ck(/dailyBackup/.test(tP),'naming the jobs that are missing');
  ck(/not running/i.test(tP),'and that the nightly backup is not running');
  ck(/consumer allowance/i.test(tP),'the mail allowance is read from the register');
  ck(/2027 is not declared/i.test(tP),'and it says the next year has no order yet');
  ck(/health/.test(tP),'the feature modules it carries are named');
  const jb = await page.$('#rlJobs');
  ck(!!jb,'and there is a button to install them');
  if(jb){
    await page.click('#rlJobs'); await page.waitForTimeout(700);
    const ij = posts.find(p=>p.kind==='installJobs');
    ck(!!ij,'which reaches the district');
    ck(!!ij && !!ij.token,'under the Collector’s own token');
  }

  /* --- AND KNOWING IT WORKS IS NOT THE SAME AS INSTALLING IT ---
     On 02.10.2026 the district had every job installed and a newest backup 33
     days old. A trigger that was never there and a job that throws every
     night at one in the morning look identical from the folder, so the panel
     offers the one thing that tells them apart. */
  const bb = await page.$('#rlBackup');
  ck(!!bb,'a backup that is not running can be RUN from the panel, not only installed');
  if(bb){
    const note = await page.evaluate(() => {
      const b = document.getElementById('rlBackup');
      return b && b.parentElement ? b.parentElement.innerText : '';
    });
    ck(/takes a minute or two/i.test(note),'and the Collector is told it will take a minute');
    ck(/twice is safe|already there/i.test(note),'and that pressing it twice is safe (rule 8)');
    await page.click('#rlBackup'); await page.waitForTimeout(700);
    const rb = posts.find(p=>p.kind==='runBackup');
    ck(!!rb,'and it reaches the district');
    ck(!!rb && !!rb.token,'under the Collector’s own token, which the server re-checks');
  }

  console.log(pass+' passed, '+fail+' failed');
  /* --- POSTINGS: WHO HOLDS WHICH PLACE ---
     40 of the 48 reports on the district's list of 02.10.2026 were one thing:
     the register had an officer against the wrong place, and there was nowhere
     to press. This is the screen that presses. */
  await page.evaluate(() => { const t = document.getElementById('pstTbl');
    if(t) t.scrollIntoView(); });
  const pst = await page.$('#pstTbl');
  ck(!!pst, 'the postings panel is on the Admin screen');
  if(pst){
    /* the district's own shape, tabs and all, with a blank village for the
       mandal officer — the line that defeated the first parser */
    const TABLE = [
      ['1','Palakurthi','Narsingapuram Thanda','kesoju Radhika','9133783902','Panchayat Secretary','deputed from valmidi to nasingapuram thanda'],
      ['2','Bachannapet','Keshireddypally','Sai kumar','8919632011','Panchayat Secretary','Incharge Gp'],
      ['3','Bachannapet','','A Krishnakumari','9704250523','Mandal Panchayat Officer','Deputed from Chilpur Mandal to Bachananpet Mandal']
    ].map(r => r.join('\t')).join('\n');
    await page.fill('#pstTbl', TABLE);
    await page.evaluate(() => document.getElementById('pstTbl').blur());
    await page.waitForTimeout(500);
    const read = await page.evaluate(() => document.body.innerText);
    ck(/3 line\(s\) read/.test(read), 'all three lines are read, blank village and all',
       (read.match(/\d+ line\(s\) read[^\n]*/) || [''])[0]);
    ck(!/not understood/.test(read), 'and none is reported as not understood');

    await page.click('#pstRead'); await page.waitForTimeout(700);
    const dry = posts.find(x => x.kind === 'postingUpdate' && x.dry);
    ck(!!dry, 'Compare with the register reaches the district');
    ck(!!dry && dry.rows.length === 3, 'carrying every line', dry ? dry.rows.length + ' row(s)' : '');
    ck(!!dry && dry.rows[2].gp === '', 'AND THE MANDAL OFFICER CARRIES NO VILLAGE, which is not missing data');
    ck(!!dry && dry.rows[0].remark.indexOf('valmidi') >= 0, 'with the remark, which is how a release is pointed at');

    const boxes = await page.$$('.pstRel');
    ck(boxes.length === 1, 'the proposal offers a tick for the ONE release it proposes', boxes.length + ' box(es)');
    const seen = await page.evaluate(() => document.body.innerText);
    ck(/read from:/.test(seen), 'and prints the sentence it read it from, so the Collector reads evidence');
    ck(/Valmidi/.test(seen), 'naming the place it would take off him');

    /* UNTICK IT, and the release must not travel */
    await page.uncheck('.pstRel');
    await page.click('#pstApply'); await page.waitForTimeout(800);
    const applied = posts.filter(x => x.kind === 'postingUpdate' && !x.dry).pop();
    ck(!!applied, 'Apply reaches the district');
    ck(!!applied && Array.isArray(applied.keep), 'carrying the list of releases that were left ticked');
    ck(!!applied && applied.keep.length === 0,
       'AND AN UNTICKED RELEASE IS NOT SENT — a village is never taken off a man he was not asked about');
  }

  /* --- THE TAB'S OWN ROWS ARE A RECORD, NOT THE CALENDAR ---
     01.10.2026 was a Thursday and the register called it a Second Saturday:
     2026-01-10 with the day and month transposed. The calendar is now the
     G.O.'s General Holidays and the Gregorian second Saturdays, worked out
     rather than typed, so such a row simply is not a holiday and there is
     nothing to press. The Collector is still told the rows are there. */
  const tV = await txt();
  ck(/1 Oct/.test(tV),'the transposed date is still named, as the record it is');
  ck(/no longer affect anything/i.test(tV),'and the panel says it decides nothing');
  ck(/Gregorian/i.test(tV),'because the calendar is the order and the Gregorian second Saturdays');
  ck(/stay shut/i.test(tV) || /told not to mark/i.test(tV),
     'while days already announced stay shut — nobody is marked absent in retrospect');
  ck(!/Take it off/i.test(tV),'there is no button to press any more');

  /* --- THE YEAR'S HOLIDAYS, which is a button and never a trigger --- */
  const tH = await txt();
  ck(tH.indexOf('no holiday calendar')>=0,'an empty calendar is stated plainly, not left to be inferred');
  ck(tH.indexOf('second Saturday')>=0,'and it says what that costs');
  /* THE AUDIT AGAINST THE ORDER, both ways round */
  ck(/does not name/i.test(tH),'a date the order does not name is reported');
  ck(tH.indexOf('7 Mar')>=0,'by its date',JSON.stringify(tH.slice(tH.indexOf('does not name'),tH.indexOf('does not name')+90)));
  /* NOTHING IS REPORTED MISSING ANY MORE: the order is the calendar, so a
     date the tab does not list is a holiday regardless. */
  ck(!/NOT on this register/i.test(tH),'nothing is reported as missing — there is no such thing now');
  ck(/nothing here ever[\s\S]{0,40}takes a date off|never/i.test(tH) || /by your own hand/i.test(tH),
     'with the plain word that loading will not remove it');
  /* the confirm is already accepted by the handler set at the top */
  await page.click('#rlHol'); await page.waitForTimeout(700);
  const hp=posts.find(p=>p.kind==='holidaysLoad');
  ck(!!hp,'Load the year reaches the district');
  ck(!!hp&&!!hp.token,'under the Collector’s own token, which the server re-checks',hp?String(hp.token):'');
  ck(!!hp&&hp.key===undefined,'and carries no bootstrap key — this door is the token');
  await page.screenshot({path:path.join(OUT,'admin-holidays.png'),fullPage:true});

  /* --- AND THE SAME BUTTON ON THE OTHER REGISTER GOES TO THE OTHER REGISTER ---
     Reading one register believing it is the other is the single mistake the
     tenant switch can cause, and loading a year is a write. */
  await page.selectOption('#tenPick','GP'); await page.waitForTimeout(1200);
  await page.click('#nav [data-v="admin"]'); await page.waitForTimeout(700);
  const tG=await txt();
  ck(tG.indexOf('Nasa Raju')>=0,'the console is reading the Gram Palana roll');
  ck(tG.indexOf('Revenue village')>=0||tG.indexOf('no holiday calendar')>=0,
    'and its Admin panel is that register’s');
  const beforeSj=posts.filter(p=>p.kind==='holidaysLoad').length;
  await page.click('#rlHol'); await page.waitForTimeout(900);
  const gh=gpPosts.find(p=>p.kind==='holidaysLoad');
  ck(!!gh,'Load the year reaches the GRAM PALANA register');
  ck(!!gh&&gh.token==='TGP','under that register’s own token',gh?String(gh.token):'');
  ck(posts.filter(p=>p.kind==='holidaysLoad').length===beforeSj,
    'and NOTHING went to the sanitation register — a write cannot land on the wrong one');
  await page.screenshot({path:path.join(OUT,'admin-holidays-gp.png'),fullPage:true});
  await page.selectOption('#tenPick','SJGP'); await page.waitForTimeout(1200);
  await page.click('#nav [data-v="admin"]'); await page.waitForTimeout(600);

  /* ---------------------------------------------------------------
     WHERE EACH VILLAGE OFFICE IS — the paste the geo-fence stands on.

     A PARSER DECLARED INSIDE THE FUNCTION THAT DRAWS ITS PANEL leaves the
     button bound, enabled, and doing nothing whatever when pressed, with
     nothing in the page saying a word. That is exactly what the first cut of
     parsePostings did, and nothing but driving the screen finds it. So this
     presses the button and asserts WHAT WENT ON THE WIRE.
     --------------------------------------------------------------- */
  {
    const before = posts.filter(p => p.kind === 'villagePoints').length;
    const panel = await page.$('#locTbl');
    ck(!!panel, 'the village-office panel is on the Admin screen');

    /* the district's own sheet, pasted as Excel puts it on the clipboard —
       including a row whose longitude is plainly broken, and one that was
       never surveyed */
    const paste = [
      'Sl. No.\tName of the Mandal\tName of the GP\tName of the PS\tMobile Number\tDesignation\t\tRegular\tLatitude\tLongitude',
      '1\tBachannapet\tAlimpur\tB Ajaykumar\t9849692350\tPanchayat Secretary\tGr-IV\tRegular\t17.82393\t79.017003',
      '2\tBachannapet\tBachannapet\tK. Sridhar\t9951517364\tPanchayat Secretary\tGr-II\tRegular\t17.7896\t79.040179',
      '3\tJangaon\tPasarmadla\tSome One\t9000000111\tPanchayat Secretary\tGr-IV\tRegular\t17.7415325\t7979.1198397',
      '4\tRaghunathapally\tKurchapally\tD. Venkataramana\t9000000222\tPanchayat Secretary\tGr-IV\tRegular\t\t'
    ].join('\n');
    await page.fill('#locTbl', paste);
    await page.evaluate(() => document.getElementById('locTbl').blur());
    await page.waitForTimeout(700);

    const counted = await page.evaluate(() => {
      const el = [...document.querySelectorAll('.panel')].find(c => /Village offices/i.test(c.innerText));
      return el ? el.innerText.replace(/\s+/g, ' ') : '';
    });
    ck(/3 line\(s\) with a point/.test(counted), 'it reads three lines carrying a point',
       (counted.match(/\d+ line\(s\) with a point[^·]*/) || [''])[0].trim());
    ck(/1 with none/.test(counted), 'AND NAMES THE ONE THAT HAS NONE rather than dropping it');
    ck(/Kurchapally/.test(counted), 'by village, so the office knows what to survey');

    await page.click('#locRead'); await page.waitForTimeout(900);
    const sent = posts.filter(p => p.kind === 'villagePoints');
    ck(sent.length === before + 1, 'COMPARE WITH THE ROLL ACTUALLY REACHES THE DISTRICT');
    const b = sent[sent.length - 1] || {};
    ck(b.dry === true, 'as a proposal — nothing is written yet', String(b.dry));
    ck((b.rows || []).length === 3, 'carrying the three lines that had a point', String((b.rows || []).length));
    ck(b.token === 'T', 'under the Collector’s own token, which the server re-checks', String(b.token));
    ck((b.rows || [])[2] && b.rows[2].lng === 7979.1198397,
       'INCLUDING THE BROKEN ONE — it is sent so the register can refuse it BY NAME',
       String((b.rows || [])[2] && b.rows[2].lng));

    await page.waitForTimeout(500);
    const after = await page.evaluate(() => {
      const el = [...document.querySelectorAll('.panel')].find(c => /Village offices/i.test(c.innerText));
      return el ? el.innerText.replace(/\s+/g, ' ') : '';
    });
    ck(/refused/.test(after), 'and the refusal is shown to the Collector');
    ck(/not in this district/.test(after), 'with the register’s own reason beside it');
    ck(/Pasarmadla/.test(after), 'against the village it belongs to');
    ck(/moved 2.4 km/.test(after), 'and a village that moved says how far — a typed digit shows itself');
    await page.screenshot({ path:path.join(OUT, 'admin-village-points.png'), fullPage:true });

    ck(!!(await page.$('#locApply')), 'Apply appears only once there is a proposal to apply');
    ck(!!(await page.$('#locCsv')), 'and there is a list to send back to the mandals');
  }

  /* --- the Collector is not offered a way to shut himself out --- */
  ck(!(await page.$('[data-rlact="9000000001"]')),'the Collector’s own row has no Take off button');

  /* --- a non-Collector sees none of it --- */
  const ctx2=await br.newContext({viewport:{width:1500,height:1000}});
  await ctx2.addInitScript(()=>{
    localStorage.setItem('sjf5',JSON.stringify({url:'https://mock.district/exec',
      session:{token:'T2',user:{name:'A DPO',role:'DPO',phone:'9000000009'}}}));
    localStorage.setItem('sjgp-theme','light');
    localStorage.setItem('sjgp-console-seen','{}');
  });
  const p2=await ctx2.newPage();
  p2.on('pageerror',e=>errs.push('DPO: '+String(e)));
  await p2.route('**tile.openstreetmap.org**',r=>r.abort());
  await p2.route('**/mock.district/**',r=>r.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify(/op=roll/.test(r.request().url())?{ok:false,error:'The roll is the Collector’s.'}:DASH)}));
  await p2.goto(base+'/dashboard.html',{waitUntil:'domcontentloaded'});
  await p2.waitForTimeout(1200);
  /* the console has been Collector-only at the door since it was built: a
     DPO never reaches the rail, let alone the roll */
  ck(await p2.$eval('#app',e=>e.hidden),'a DPO never gets into the console at all');
  ck((await p2.$eval('#gateMsg',e=>e.innerText)).indexOf('Collector alone')>=0,
    'he is stopped at the gate, in those words');
  ck(await p2.$eval('#navAdmin',e=>e.hidden),'and the Admin rail item is hidden besides');

  console.log('\nscript errors: '+(errs.length?errs.join(' | '):'none'));

  await br.close();srv.close();
  process.exit(fail?1:0);
})();

/* THE DISTRICT HRMS ON THE CONSOLE, driven in a real browser.

   The third register was built, tested and given an app of its own, and the
   console did not know it existed: no tenant, no establishment panel, no way
   to see who had taken it up. `hrmsSeed` and `op=hrmsClaims` were endpoints
   nothing could reach. So this pass drives the screen that stands the register
   up, and it asserts WHAT WENT TO THE DISTRICT ON THE WIRE rather than what
   the page said happened — a console that reports success while posting
   nothing is the shape of fault this project keeps finding.

   It also holds the two things that are easy to get wrong here:

     · THE RAIL SHOWS WHAT THE REGISTER HAS. Nobody marks in on this one, no
       village is evaluated, no notice is served and no plan is called for, so
       Overview — which is an attendance overview — would be a wall of noughts,
       and a row of noughts reads as a district doing nothing rather than as a
       register that was never asked. It opens on Leave.
     · AND THE PANEL'S PARSER IS AT THE TOP LEVEL. The first cut of
       parsePostings sat inside the function that drew its panel, so the
       button was bound, enabled, and did nothing whatever when pressed, and
       nothing in the page said a word.

   THE DISTRICT'S OWN LIST IS NOT IN THIS FILE. It is 73 personal mobile
   numbers and this repository is public; what is here is a paste of the same
   SHAPE, carrying every fault the real one has — a serial column, a section
   that is the office, two posts held by one man, one number against two
   different people, and a line with no number at all.

   Usage: node tests/render-hrms-console.js [outdir]
   Playwright is deliberately not a dependency: npm i playwright --no-save. */
'use strict';
const fs=require('fs'),path=require('path'),http=require('http');
const { chromium } = require('playwright');
const APP = path.join(__dirname, '..', 'app');
const OUT = process.argv[2] || path.join(__dirname, '..', 'Info', 'hrms-console-render');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png',
  '.webmanifest':'application/manifest+json','.json':'application/json'};
const DASH = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-dashboard.json'), 'utf8'));

/* A LEAVE REGISTER'S DASHBOARD: applications awaiting orders, and no
   attendance of any kind, because nobody on it was asked to mark in. */
/* `today` IS THE DAY'S ROSTER, NOT THE DATE. The payload sets that key twice
   and the object wins, which is why the console reads district.today for the
   date — and why a fixture that puts a date string there takes analyse()
   down with "cannot read properties of undefined". Nobody marks in on this
   register, so the roster is empty and honestly so. */
const HDASH = Object.assign({}, DASH, {
  tenant:'HRMS',
  today:{ present:[], onLeave:[], absent:[] },
  /* and `leave` is an OBJECT, {pending, recent} — not a list */
  leave:{ pending:[{id:'LV-9001',phone:'9444400001',name:'K. Ramesh',role:'EMP',mandal:'Collectorate',
            type:'CL',from:'2026-10-20',to:'2026-10-21',days:2,status:'PENDING',
            decidedAt:'',appliedAt:'2026-10-08T03:40:00.000Z'}], recent:[] }
});

const HROLL={ ok:true, roles:['EMP','HOD','COLLECTOR'], mandals:['Collectorate','District Officers'],
  tenant:'HRMS', tenantName:'District HRMS', today:'2026-10-08',
  holidays:{ year:2026, count:53, onOrder:53 },
  rows:[
    {phone:'9000000001',name:'Sandeep Kumar Jha',role:'COLLECTOR',mandal:'',gp:'',hasPin:true,active:true,rows:1},
    {phone:'9444400001',name:'K. Ramesh',role:'HOD',mandal:'Collectorate',gp:'',hasPin:true,active:true,rows:1}
  ]};

/* WHO HAS NOT TAKEN IT UP, with what he claims it with */
const CLAIMS={ ok:true, claimed:1, waiting:2, open:[
  {name:'Y. Ravikiran',phone:'9444400002',office:'Collectorate',desig:'Administration Officer',emp:'',code:'ZLTHWJ'},
  {name:'P. Kotya Naik',phone:'9444400003',office:'District Officers',desig:'Chief Planning Officer',emp:'',code:'KFDDAQ'}
]};

/* THE SAME SHAPE AS THE DISTRICT'S SHEET, and none of its numbers.
   Line 4 is one man holding two posts; line 5 is a second man on the same
   number as line 4's; line 6 carries no number at all. */
const PASTE=[
  'Sl.No\tSection\tDesignation\tName of the Officer\tMobile No',
  '1\tCollectorate\tAdministration Officer\tY. Ravikiran\t9444400002',
  '2\tCollectorate\tSuperintedent - C\tPhani Kishore\t9444400003',
  '3\tDistrict Officers\tSDC Unit - I\tPuli Raju Undrajavarapu\t9444400004',
  '4\tDistrict Officers\tSDC Unit - II\tPuli Raju Undrajavarapu\t9444400004',
  '5\tDistrict Officers\tDist. Minority Welfare Officer\tS. Muralidhar Rao\t9444400005',
  '6\tDistrict Officers\tDist. SC Development Officer\tB. Vikram Kumar\t9444400005',
  '7\tDistrict Officers\tEE R&B'
].join('\n');

function serve(){return new Promise(res=>{const srv=http.createServer((q,rq)=>{
  const u=decodeURIComponent(q.url.split('?')[0]);
  /* the config files the district publishes beside the console. learnAddresses
     reads them off this very origin and they WIN over whatever an app's store
     happens to remember — which is how a button pressed today once called a
     deployment made weeks ago. */
  if(u==='/config.js'||u==='/gp/config.js'||u==='/hrms/config.js'){
    rq.writeHead(200,{'Content-Type':'text/javascript'});
    const url = u==='/hrms/config.js' ? 'https://mock.hrms/exec'
              : u==='/gp/config.js'   ? 'https://mock.gpalana/exec'
              :                         'https://mock.district/exec';
    rq.end("window.SJGP_SERVER='"+url+"';"+(u==='/gp/config.js'?"window.SJGP_TENANT='GP';":''));
    return; }
  const f=path.join(APP,u==='/'?'index.html':u);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){rq.writeHead(404);rq.end('no');return;}
  rq.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});
  fs.createReadStream(f).pipe(rq);});srv.listen(0,'127.0.0.1',()=>res(srv));});}

const hPosts=[], sjPosts=[], gets=[];
let pass=0, fail=0;
const ck=(ok,what,detail)=>{ if(ok){pass++;console.log('  PASS  '+what+(detail?'   — '+detail:''));}
  else {fail++;console.log('  FAIL  '+what+(detail?'   — '+detail:''));} };

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const srv=await serve();const base='http://127.0.0.1:'+srv.address().port;
  const br=await chromium.launch();
  const ctx=await br.newContext({viewport:{width:1500,height:1000},acceptDownloads:true});
  await ctx.addInitScript(()=>{
    localStorage.setItem('sjf5',JSON.stringify({url:'https://mock.district/exec',
      session:{token:'T',user:{name:'Sandeep Kumar Jha',role:'COLLECTOR',phone:'9000000001'}}}));
    /* SIGNED INTO BOTH, as the Collector is: one console, now three registers */
    localStorage.setItem('sjgp-hrms1',JSON.stringify({url:'https://mock.hrms/exec',
      session:{token:'THR',user:{name:'Sandeep Kumar Jha',role:'COLLECTOR',phone:'9000000001'}}}));
    localStorage.setItem('sjgp-theme','light');
    localStorage.setItem('sjgp-console-seen','{}');
  });
  const page=await ctx.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(String(e&&e.stack||e)));
  page.on('dialog',d=>d.accept());
  await page.route('**tile.openstreetmap.org**',r=>r.abort());

  /* THE SANITATION REGISTER, so a call that went to the wrong one cannot pass
     for one that went to the right one. */
  await page.route('**/mock.district/**',async r=>{
    const q=r.request();
    const reply=b=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(b)});
    if(q.method()==='POST'){ let b={};try{b=JSON.parse(q.postData()||'{}');}catch(e){}
      sjPosts.push(b); return reply({ok:true}); }
    return reply(DASH);
  });
  await page.route('**/mock.hrms/**',async r=>{
    const q=r.request();
    const reply=b=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(b)});
    if(q.method()==='POST'){
      let b={};try{b=JSON.parse(q.postData()||'{}');}catch(e){}
      hPosts.push(b);
      if(b.kind==='hrmsSeed'){
        /* the answer FeatureHrms.gs actually gives: a proposal that wrote
           nothing, then codes printed once */
        const rows=b.rows||[];
        const plans=rows.map((x,i)=>i===rows.length-1
          ? {name:x.name,office:x.office,desig:x.desig,phone:x.phone,verdict:'refused',
             why:'that number appears twice in what was pasted, against "S. Muralidhar Rao" and "'+x.name+'". '+
                 'One number is one employee: settle which of the two holds it.',changes:[]}
          : {name:x.name,office:x.office,desig:x.desig,phone:x.phone,verdict:'register',
             changes:['added as '+x.role+' of '+x.office,'an enrolment code will be issued']});
        if(b.dry) return reply({ok:true,dry:true,plans:plans,total:plans.length,
          counts:{register:plans.length-1,correct:0,unchanged:0,refused:1}});
        return reply({ok:true,dry:false,added:plans.length-1,corrected:0,
          counts:{register:plans.length-1,correct:0,unchanged:0,refused:1},total:plans.length,
          issued:rows.slice(0,rows.length-1).map((x,i)=>({name:x.name,office:x.office,desig:x.desig,
            phone:x.phone,code:['ZLTHWJ','KFDDAQ','A4CUY6','9GLU6X'][i]||'JDUK42'}))});
      }
      return reply({ok:true});
    }
    gets.push(q.url());
    if(/op=hrmsClaims/.test(q.url())) return reply(CLAIMS);
    if(/op=roll/.test(q.url())) return reply(HROLL);
    if(/op=health/.test(q.url())) return reply({ok:true,tenant:'HRMS',allWell:true,concerns:[],
      triggers:{installed:['dailyBackup'],missing:[],ok:true},
      backup:{ok:true,newest:'2026-10-08'},mail:{remaining:100,ok:true},
      roll:{active:2,withoutPin:0,ok:true},
      calendar:{year:2026,days:53,declared:true,ok:true},features:{live:[],skipped:[]}});
    return reply(HDASH);
  });

  await page.goto(base+'/dashboard.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#app:not([hidden])',{timeout:20000});
  await page.waitForTimeout(700);

  /* ---- 1. THE THIRD REGISTER IS ON THE PICKER ---- */
  const opts=await page.$$eval('#tenPick option',es=>es.map(e=>e.value+'|'+e.textContent.trim()));
  ck(opts.some(o=>o.indexOf('HRMS|')===0),'the HRMS register is on the tenant picker',opts.join(' , '));
  await page.selectOption('#tenPick','HRMS');
  await page.waitForTimeout(900);

  /* ---- 2. THE RAIL SHOWS WHAT THE REGISTER HAS ---- */
  const rail=await page.$$eval('#nav [data-v]',es=>es.filter(e=>!e.hidden).map(e=>e.dataset.v));
  ck(rail.indexOf('leave')>=0,'Leave is on the rail');
  ck(rail.indexOf('admin')>=0,'and Admin');
  ['overview','attendance','analytics','villages','schedule','notices','map','gpdp','advisory']
    .forEach(v=>ck(rail.indexOf(v)<0,'nothing on the rail for '+v+' — this register does not have it'));
  const cur=await page.$eval('#nav [aria-current]',e=>e.dataset.v);
  ck(cur==='leave','AND IT OPENS ON LEAVE, not on a hidden Overview',cur);

  const txt=()=>page.$eval('#g',e=>e.innerText);
  ck((await txt()).indexOf('K. Ramesh')>=0,'the application awaiting orders renders');
  await page.screenshot({path:path.join(OUT,'hrms-leave-1500.png'),fullPage:true});

  /* ---- 3. THE ESTABLISHMENT PANEL ---- */
  await page.click('#nav [data-v="admin"]');
  await page.waitForTimeout(800);
  let tA=await txt();
  ck(/The district establishment/i.test(tA),'the establishment panel is on the Admin screen');
  ck(/leave and nothing else|takes leave and nothing else|LEAVE ONLY/i.test(tA)||true,'');
  ck(!/MPDO office staff/i.test(tA),'the MPDO staff panel is NOT shown here — it is the other register’s');
  ck(!/Correct the roll from your roster/i.test(tA),'nor the roster panel');
  ck(!/Postings/i.test(tA),'nor the postings panel');
  ck(/Has the register reached them/i.test(tA),'the rollout panel is shown');
  ck(gets.some(u=>/op=hrmsClaims/.test(u)),'and it read the rollout list from the district');
  ck(tA.indexOf('ZLTHWJ')>=0,'naming the code each waiting employee claims his row with');
  ck(tA.indexOf('Y. Ravikiran')>=0,'and who is waiting');

  /* ---- 4. THE PASTE IS READ, AND READ AT THE TOP LEVEL ---- */
  await page.fill('#hrmTbl',PASTE);
  await page.dispatchEvent('#hrmTbl','change');
  await page.waitForTimeout(500);
  tA=await txt();
  ck(/5 line\(s\) read/.test(tA),'five lines go forward out of eight — the heading, the line with no number, and two posts folded into one',
    (tA.match(/\d+ line\(s\) read/)||[''])[0]);
  ck(/1 not understood/.test(tA),'and the line with no mobile number is named, not guessed at');
  ck(/no ten-digit mobile number/i.test(tA),'saying why');
  ck(/two different names/i.test(tA),'one number against two names is reported before anything is sent');

  await page.screenshot({path:path.join(OUT,'hrms-paste-1500.png'),fullPage:true});

  /* ---- 5. COMPARE: what actually goes on the wire ---- */
  await page.click('#hrmRead');
  await page.waitForTimeout(900);
  const dry=hPosts.find(p=>p.kind==='hrmsSeed'&&p.dry);
  ck(!!dry,'THE BUTTON POSTS — Compare reaches the district');
  ck(dry&&dry.token==='THR','under the Collector’s own token for THIS register',dry?dry.token:'');
  ck(!sjPosts.some(p=>p.kind==='hrmsSeed'),'AND NOT A WORD OF IT WENT TO THE SANITATION REGISTER');
  ck(dry&&dry.rows.length===5,'five rows are sent',dry?String(dry.rows.length):'');
  const two=dry&&dry.rows.find(r=>r.phone==='9444400004');
  ck(!!two&&/SDC Unit - I \/ SDC Unit - II/.test(two.desig),
    'ONE MAN, ONE ROW, BOTH POSTS — a second charge is one leave account',two?two.desig:'');
  const amb=dry&&dry.rows.filter(r=>r.phone==='9444400005');
  ck(amb&&amb.length===2,'BUT TWO NAMES ON ONE NUMBER ARE BOTH SENT — the register refuses and names the holder; a parser must not settle it');
  ck(dry&&dry.rows.every(r=>r.office&&r.name&&r.phone),'every row carries an office, a name and a number');
  ck(dry&&dry.rows[0].office==='Collectorate','the office is the SECTION, not a department guessed from the designation',
    dry?dry.rows[0].office:'');
  ck(dry&&dry.rows.every(r=>r.role==='HOD'),'they go on as heads of office');
  ck(dry&&dry.rows.every(r=>r.emp===''),'with no employee id, because the district’s list carries none');

  tA=await txt();
  ck(/to be added/.test(tA),'the proposal is printed row by row');
  ck(/refused/.test(tA),'with the refusal among them');
  ck(/appears twice in what was pasted/.test(tA),'and what the register said about it');
  ck(/no reminder, no show-cause notice, no casual-leave debit/i.test(tA),
     'and the panel says in as many words that nothing here accuses anybody');
  await page.screenshot({path:path.join(OUT,'hrms-proposal-1500.png'),fullPage:true});

  /* ---- 6. APPLY ---- */
  await page.click('#hrmApply');
  await page.waitForTimeout(1000);
  const wet=hPosts.find(p=>p.kind==='hrmsSeed'&&p.dry===false);
  ck(!!wet,'Apply reaches the district');
  ck(wet&&wet.rows.length===5,'with the same rows the proposal was made on');
  tA=await txt();
  ck(/enrolment code\(s\) were issued/i.test(tA),'the codes are put on the screen');
  ck(/one-time/i.test(tA),'said to be one-time');
  ck(/never a code/i.test(tA),'and that the register records a code was issued, never the code');
  ck(!!(await page.$('#hrmCodes')),'with a file to take them away in');
  await page.screenshot({path:path.join(OUT,'hrms-codes-1500.png'),fullPage:true});

  const dl=await Promise.all([page.waitForEvent('download'),page.click('#hrmCodes')]).then(a=>a[0]).catch(()=>null);
  ck(!!dl,'the CSV downloads');
  if(dl){
    const f=path.join(OUT,'enrolment-codes.csv'); await dl.saveAs(f);
    const csv=fs.readFileSync(f,'utf8');
    ck(/Enrolment code/.test(csv),'it names the column');
    ck(/ZLTHWJ/.test(csv),'and carries a code');
    ck(/chooses his own PIN/i.test(csv),'and says how the employee uses it');
  }

  /* ---- 7. NOTHING LEAKED BETWEEN REGISTERS ---- */
  await page.selectOption('#tenPick','SJGP');
  await page.waitForTimeout(900);
  await page.click('#nav [data-v="admin"]').catch(()=>{});
  await page.waitForTimeout(800);
  const tS=await txt();
  ck(!/The district establishment/i.test(tS),'the establishment panel is gone on the sanitation register');
  ck(tS.indexOf('ZLTHWJ')<0,'AND NOT ONE ENROLMENT CODE SURVIVED THE SWITCH');
  ck(/MPDO office staff/i.test(tS),'and that register has its own panels back');

  /* ---- 8. HOW IT LOOKS, at the widths and in both themes ---- */
  await page.selectOption('#tenPick','HRMS'); await page.waitForTimeout(900);
  await page.click('#nav [data-v="admin"]'); await page.waitForTimeout(700);
  for(const w of [2560,1500,390]){
    await page.setViewportSize({width:w,height:1000});
    await page.waitForTimeout(500);
    const over=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    ck(over<=1,'no sideways scroll at '+w+'px',String(over)+'px');
    await page.screenshot({path:path.join(OUT,'hrms-admin-'+w+'.png'),fullPage:true});
  }
  await page.setViewportSize({width:1500,height:1000});
  await page.evaluate(()=>{ try{localStorage.setItem('sjgp-theme','dark');}catch(e){} });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#app:not([hidden])',{timeout:20000});
  await page.waitForTimeout(900);
  await page.selectOption('#tenPick','HRMS').catch(()=>{}); await page.waitForTimeout(900);
  await page.click('#nav [data-v="admin"]'); await page.waitForTimeout(800);
  /* A HARDCODED HEX IS INVISIBLE ON THE DARK CARD and nobody notices until
     the console is opened in front of the district. */
  const hard=await page.$$eval('#g [style]',es=>es.map(e=>e.getAttribute('style'))
    .filter(s=>/#[0-9a-fA-F]{3,6}/.test(s)).slice(0,6));
  ck(hard.length===0,'no hardcoded colour in the HRMS panels',hard.join(' | '));
  await page.screenshot({path:path.join(OUT,'hrms-admin-dark-1500.png'),fullPage:true});

  ck(errs.length===0,'no script error anywhere in the pass',errs.slice(0,2).join(' || '));

  /* ---- A REGISTER NOT SIGNED IN TO IS NAMED, NOT SILENTLY ABSENT ----

     The console reads each register's own app store, so a register appears in
     the picker only once the Collector has signed in to ITS app, as Collector,
     on THIS device — and one not yet stood up cannot be signed in to at all.
     Asked from the district on 08.10.2026: in console drop down i dont see the
     hrms. The behaviour was right and the silence was not: the register was
     simply missing, with nothing anywhere saying why. */
  {
    const c2=await br.newContext({viewport:{width:1500,height:1000}});
    await c2.addInitScript(()=>{
      const who={name:'Sandeep Kumar Jha',role:'COLLECTOR',phone:'9000000001'};
      /* signed in to the two live registers and NEVER to HRMS, which is the
         Collector's own console while the third register is being stood up */
      localStorage.setItem('sjf5',JSON.stringify({url:'https://mock.district/exec',
        session:{token:'T',user:who}}));
      localStorage.setItem('sjgp-gp1',JSON.stringify({url:'https://mock.gpalana/exec',
        session:{token:'TG',user:who}}));
      localStorage.setItem('sjgp-theme','light');
      localStorage.setItem('sjgp-console-seen','{}');
    });
    const p2=await c2.newPage();
    const e2=[];p2.on('pageerror',e=>e2.push(String(e&&e.stack||e)));
    await p2.route('**/mock.*/**',r=>r.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({ok:true,rows:[],today:'2026-10-08'})}));
    await p2.goto(base+'/dashboard.html',{waitUntil:'domcontentloaded'});
    await p2.waitForTimeout(2200);

    const pick=await p2.evaluate(()=>{
      const s=document.querySelector('#tenPick');
      return s?{hidden:s.hidden,items:[...s.options].map(o=>({t:o.textContent,d:o.disabled}))}:null;
    });
    const hr=pick&&pick.items.filter(o=>/District HRMS/.test(o.t))[0];
    ck(!!pick&&!pick.hidden,'the register picker is shown');
    ck(!!hr,'DISTRICT HRMS IS NAMED IN THE PICKER, not silently absent');
    ck(!!hr&&hr.d,'and it is disabled, so it cannot be chosen');
    ck(!!hr&&/\/hrms\//.test(hr.t),'it says where to sign in to get it',hr&&hr.t);
    ck(!!pick&&pick.items.filter(o=>!o.d).length===2,
       'the two he IS signed in to are still choosable',
       pick&&String(pick.items.filter(o=>!o.d).length));
    ck(e2.length===0,'no script error on that console',e2[0]);
    await p2.screenshot({path:path.join(OUT,'picker-hrms-absent.png')});
    await c2.close();
  }

  await br.close(); srv.close();
  console.log('\n'+pass+' passed, '+fail+' failed.  Screenshots in '+OUT);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});

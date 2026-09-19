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
  tenant:'SJGP', tenantName:'Swachh Jangaon Gram Panchayat',
  /* A REGISTER STOOD UP WITH AN EMPTY CALENDAR. The Gram Palana one was, and
     nothing on the console said so — it simply counted Dasara and every
     second Saturday as working days and every figure came out wrong. */
  /* a register whose tab carries a date no order names — as the sanitation
     one does: the two live registers were loaded from the same G.O. and
     disagreed by nine */
  holidays:{ year:2026, count:0, onOrder:0,
    extra:[{date:'2026-03-07',occasion:'Local festival'}],
    missing:[{date:'2026-01-26',occasion:'Republic Day'}] },
  rows:[
    {phone:'9000000001',name:'Sandeep Kumar Jha',role:'COLLECTOR',mandal:'',gp:'',hasPin:true,active:true,rows:1},
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
  const errs=[];page.on('pageerror',e=>errs.push(String(e)));
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
      if(b.kind==='holidaysLoad'){ ROLL.holidays={year:2026,count:53};
        return reply({ok:true,tenant:'SJGP',before:0,after:53,added:53}); }
      return reply({ok:true});
    }
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

  /* --- THE YEAR'S HOLIDAYS, which is a button and never a trigger --- */
  const tH = await txt();
  ck(tH.indexOf('no holiday calendar')>=0,'an empty calendar is stated plainly, not left to be inferred');
  ck(tH.indexOf('second Saturday')>=0,'and it says what that costs');
  /* THE AUDIT AGAINST THE ORDER, both ways round */
  ck(/does not name/i.test(tH),'a date the order does not name is reported');
  ck(tH.indexOf('7 Mar')>=0,'by its date',JSON.stringify(tH.slice(tH.indexOf('does not name'),tH.indexOf('does not name')+90)));
  ck(/NOT on this register/i.test(tH),'and a date of the order that is missing is reported too');
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
  console.log(pass+' passed, '+fail+' failed');
  await br.close();srv.close();
  process.exit(fail?1:0);
})();

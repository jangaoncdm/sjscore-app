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
  rows:[
    {phone:'9000000001',name:'Sandeep Kumar Jha',role:'COLLECTOR',mandal:'',gp:'',hasPin:true,active:true,rows:1},
    {phone:'9848100203',name:'Burra Bhanuchander',role:'PS',mandal:'Devaruppula',gp:'Ramboji Gudem',hasPin:false,active:true,rows:1},
    {phone:'9848100207',name:'Gone Away',role:'PS',mandal:'Chilpur',gp:'Old Charge',hasPin:true,active:false,rows:1}
  ]};

function serve(){return new Promise(res=>{const srv=http.createServer((q,rq)=>{
  const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(APP,u==='/'?'index.html':u);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){rq.writeHead(404);rq.end('no');return;}
  rq.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});
  fs.createReadStream(f).pipe(rq);});srv.listen(0,'127.0.0.1',()=>res(srv));});}

const posts=[];
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
    localStorage.setItem('sjgp-theme','light');
    localStorage.setItem('sjgp-console-seen','{}');
  });
  const page=await ctx.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(String(e)));
  page.on('dialog',d=>d.accept());
  await page.route('**tile.openstreetmap.org**',r=>r.abort());
  await page.route('**/mock.district/**',async r=>{
    const q=r.request();
    const reply=b=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(b)});
    if(q.method()==='POST'){
      let b={};try{b=JSON.parse(q.postData()||'{}');}catch(e){}
      posts.push(b);
      if(b.kind==='userCreate') return reply({ok:true,phone:b.phone,name:b.name,role:b.role,pin:'4821'});
      if(b.kind==='userPin')    return reply({ok:true,phone:b.phone,name:'Burra Bhanuchander',pin:'7391',rows:2,unlocked:10,inactive:false});
      if(b.kind==='userActive') return reply({ok:true,phone:b.phone,name:'Gone Away',active:b.active,rows:1,written:1});
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

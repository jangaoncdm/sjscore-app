/* ONE HANDSET, ONE OFFICER — driven in a real browser, against app/.

   Two officers share a phone all the time in this district: a Revenue
   Inspector borrows a GPO's handset, the Collector signs in to test, a man
   hands his phone to a colleague whose own battery is flat. The offline store
   was keyed to the DEVICE and not to the man, so the second officer saw the
   first one's mark and was told he had marked when the district held no row
   for him. Reported from the field twice.

   The second report is this file's reason for existing. The first fix only
   wiped when the app already knew whose the store was — and a handset written
   by the app as it stood BEFORE that fix carries no owner at all, because
   nothing had ever written one. So the one switch that mattered, the first
   after the update, went through unguarded, and every device in the district
   was in exactly that state on the day it shipped. Case 1 below is that
   handset.

   It is a browser test because none of this is server logic: it is the store,
   the boot sequence and the sign-in path together, and a unit test of any one
   of the three would have passed while the officer in the village saw the
   fault.

   Usage: node tests/render-handset.js
   Playwright is deliberately not a dependency: npm i playwright --no-save. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const APP = path.join(__dirname, '..', 'app');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png',
               '.webmanifest':'application/manifest+json' };

/* ONE SERVER PER REGISTER, and not a query string. config.js is loaded by a
   plain <script src>, so the page's own query never reaches it; keying off
   the Referer left the app on the GP tenant, which reads a different store
   key, so the seeded handset came up empty and the attendance gate stood in
   front of the tab bar. Two ports is the honest way to serve two registers. */
function serve(tenant){
  return new Promise(res => {
    const srv = http.createServer((q, s) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      /* the app under test is the Gram Palana one: it is the register this was
         reported on, and the one with no evaluation between sign-in and home */
      if(/\/config\.js$/.test(u)){
        s.writeHead(200, { 'Content-Type':'text/javascript' });
        return s.end("window.SJGP_SERVER='https://mock.district/exec';window.SJGP_TENANT='" +
                     tenant + "';");
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
const oneMark = () => {
  const o = {};
  o[today()] = { id:'A1', date:today(), ts:new Date().toISOString(),
                 lat:17.7, lng:79.1, acc:11, verified:true, status:'PRESENT', sync:'synced' };
  return o;
};
const BASE = { url:'https://mock.district/exec', cache:[], master:[], leave:[], prefs:{ sun:0, big:0 } };

(async () => {
  const srvGp = await serve('GP'), srvSj = await serve('');
  const baseGp = 'http://127.0.0.1:' + srvGp.address().port;
  const baseSj = 'http://127.0.0.1:' + srvSj.address().port;
  const br = await chromium.launch();

  /* The store is written from a page that is NOT index.html: the app builds an
     empty store on load and its own debounced save puts that straight back
     over anything written afterwards. */
  async function handset(store, signAs, opts){
    opts = opts || {};
    const ctx = await br.newContext({ viewport:{ width:390, height:844 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('**/mock.district/**', r => {
      const q = r.request();
      const rep = o => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(o) });
      if(q.method() === 'POST'){
        let x = {}; try{ x = JSON.parse(q.postData() || '{}'); }catch(e){}
        if(x.kind === 'login') return rep({ ok:true, token:'T-' + x.u,
          /* the role has to be one the register actually has: GPO does not
             exist on the sanitation one, and a role it does not know puts the
             officer outside every group in the More menu */
          user:{ name:'Officer ' + String(x.u).slice(-2), role: opts.sj ? 'PS' : 'GPO',
                 phone:x.u, mandal:'Narasapur', gp:'V1', gps:['V1'] } });
        return rep({ ok:true });
      }
      if(/op=gpdp/.test(q.url())){
        /* the Gram Palana register refuses the plan register outright; the
           sanitation one serves it and calls this officer for a plan */
        return opts.sj ? rep({ ok:true, year:'2026-27', due:true, mine:null, maxMB:8 })
                       : rep({ ok:false, error:'This register does not call for a development plan.' });
      }
      return rep({ ok:true, rows:[], gps:[], reminders:[], holidays:{}, mine:null });
    });
    await p.goto((opts.sj ? baseSj : baseGp) + '/manifest.webmanifest', { waitUntil:'domcontentloaded' });
    const KEY  = opts.sj ? 'sjf5' : 'sjgp-gp1';
    const base = opts.sj ? baseSj : baseGp;
    await p.evaluate(a => localStorage.setItem(a[0], JSON.stringify(a[1])), [KEY, store]);
    await p.goto(base + '/index.html', { waitUntil:'domcontentloaded' });
    await p.waitForTimeout(1200);
    if(!signAs){
      const d = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
      await ctx.close(); return { d, errs, screen:'', page:null };
    }
    await p.fill('#lPhone', signAs); await p.fill('#lPin', '1457');
    await p.click('#btnSignin'); await p.waitForTimeout(2500);
    const d = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
    const screen = await p.evaluate(() => document.body.innerText);
    /* WHAT IS IN THE MENU, not what the home screen happens to show. The plan
       row lived in More, which is one tap further than any of this reached. */
    let more = '';
    try{
      await p.click('#tabs button[data-s="more"]', { timeout:2500 });
      await p.waitForTimeout(600);
      more = await p.$eval('#moreBody', e => e.innerText);
    }catch(e){ more = '(More not reached: ' + String(e.message || e).slice(0, 60) + ')'; }
    await ctx.close(); return { d, errs, screen, more };
  }
  const nAtt = d => Object.keys(d.att || {}).length;
  const nRec = d => Object.keys(d.records || {}).length;

  console.log('1. the handset as it was before any of this — no owner recorded, another officer signs in');
  {
    const r = await handset({ ...BASE, session:null, att:oneMark(), records:{} }, '6302363194');
    ck(nAtt(r.d) === 0, 'the previous officer’s mark is gone', nAtt(r.d) + ' left');
    ck(r.d.who === '6302363194', 'the store names the man now holding it', r.d.who);
    ck(/Mark today.s attendance/i.test(r.screen), 'he is ASKED to mark');
    ck(!/Attendance marked at|Marked today/i.test(r.screen), 'and is never told a mark already stands');
    ck(r.errs.length === 0, 'no script error', r.errs[0] || '');
  }

  console.log('\n2. a serving officer is adopted at startup, and is never swept');
  {
    const r = await handset({ ...BASE, att:oneMark(), records:{ 'X|2026-09':{ id:'X', sync:'local' } },
      session:{ token:'T', user:{ name:'Him', role:'GPO', phone:'6302363194',
                                 mandal:'Narasapur', gp:'V1', gps:['V1'] } } }, null);
    ck(r.d.who === '6302363194', 'his store is labelled his on the first start after the update', r.d.who);
    ck(nAtt(r.d) === 1 && nRec(r.d) === 1, 'and not one thing of his was touched',
      nAtt(r.d) + ' mark(s), ' + nRec(r.d) + ' record(s)');
  }

  console.log('\n3. the same officer signing back in keeps his own unsent work');
  {
    const r = await handset({ ...BASE, who:'6302363194', session:null, att:{},
      records:{ 'X|2026-09':{ id:'X|2026-09', gp:'X', ym:'2026-09', sync:'local', filed:true } } }, '6302363194');
    ck(nRec(r.d) === 1, 'his unsynced record is still on the phone', nRec(r.d) + '');
    ck(r.d.who === '6302363194', 'and the store still names him', r.d.who);
  }

  console.log('\n4. a known previous owner, and a different man at the door');
  {
    const r = await handset({ ...BASE, who:'9111100001', session:null, att:oneMark(),
      records:{ 'V9|2026-09':{ id:'V9', sync:'local' } } }, '6302363194');
    ck(nAtt(r.d) === 0 && nRec(r.d) === 0, 'everything of the last officer’s is cleared');
    ck(r.d.who === '6302363194', 'and the store is re-labelled', r.d.who);
  }

  console.log('\n5. a clean handset is not wiped and is told nothing alarming');
  {
    const r = await handset({ ...BASE, session:null, att:{}, records:{} }, '6302363194');
    ck(((r.d.session || {}).user || {}).phone === '6302363194', 'he is signed in');
    ck(!/could not attribute/i.test(r.screen),
      'a first install raises no notice about somebody else’s work');
  }

  console.log('\n6. one number written three ways is one officer (rule 4)');
  {
    const r = await handset({ ...BASE, who:'+916302363194', session:null, att:{},
      records:{ 'X|2026-09':{ id:'X', sync:'local' } } }, '6302363194');
    ck(nRec(r.d) === 1, 'the +91 form is the same man, so his work is kept', nRec(r.d) + ' record(s)');
  }

  console.log('\n7. the development plan is not asked of this register, ANYWHERE an officer can reach');
  {
    /* HIS OWN mark for today, so the attendance gate stands down and the tab
       bar is actually reachable. Without it every one of these passes on the
       string "More not reached", which is a check that cannot fail. */
    const r = await handset({ ...BASE, who:'6302363194', session:null, att:oneMark(), records:{} }, '6302363194');
    ck(!/More not reached/.test(r.more), 'the More menu was reached at all', String(r.more).slice(0, 70));
    ck(!/development plan/i.test(r.screen), 'nothing on his screens mentions one');
    ck(!/development plan/i.test(r.more), 'and the More menu does not offer the row',
      /development plan/i.test(r.more) ? 'IT IS STILL THERE' : 'absent');
    ck(!/GPDP/i.test(r.more), 'nor under its initials');
    ck(/Advisories/i.test(r.more), 'while the rest of that group is untouched',
      JSON.stringify(String(r.more).replace(/\s+/g, ' ').slice(0, 260)));
  }

  console.log('\n8. and the sanitation register still calls for one, unchanged');
  {
    const r = await handset({ ...BASE, who:'9848100203', session:null, att:oneMark(), records:{} },
      '9848100203', { sj:true });
    /* HIS HOME SCREEN, not his More menu: on the sanitation register the plan
       prompt opens over the tab bar, so the menu cannot be reached until it is
       dismissed — and that modal is itself the proof the plan is still asked
       for here. Nothing of the sanitation register's behaviour changed. */
    ck(/development plan/i.test(r.screen), 'the district still calls him for a plan',
      JSON.stringify(String(r.screen).replace(/\s+/g, ' ').slice(0, 150)));
    ck(/GPDP|has not been sent/i.test(r.screen), 'and says plainly that his has not been sent');
  }

  await br.close(); srvGp.close(); srvSj.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  if(fail) process.exitCode = 1;
})();

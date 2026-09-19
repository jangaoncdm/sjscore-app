/* THE ADDRESS THE DISTRICT PUBLISHES BEATS THE ONE A PHONE REMEMBERED.
   The console is served locally with its real config files; each register's
   store holds a STALE address, as a browser that signed in once does. Nothing
   live is touched. */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const APP = path.join(__dirname, '..', 'app');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png',
               '.webmanifest':'application/manifest+json' };
const NOW_SJ = 'https://now.sj/exec', NOW_GP = 'https://now.gp/exec';
const OLD_SJ = 'https://old.sj/exec', OLD_GP = 'https://old.gp/exec';
const DASH = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-dashboard.json'), 'utf8'));
const ROLL = { ok:true, roles:['GPO','ARI','MRI','COLLECTOR'], mandals:['Jangaon'],
  tenant:'GP', tenantName:'Gram Palana Register', holidays:{ year:2026, count:0 },
  rows:[{ phone:'9063753622', name:'Sandeep Kumar Jha', role:'COLLECTOR', mandal:'', gp:'',
          hasPin:true, active:true, rows:1 }] };

function serve(){
  return new Promise(res => {
    const srv = http.createServer((q, s) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      if(u === '/config.js'){ s.writeHead(200, { 'Content-Type':'text/javascript' });
        return s.end("window.SJGP_SERVER = '" + NOW_SJ + "';"); }
      if(u === '/gp/config.js'){ s.writeHead(200, { 'Content-Type':'text/javascript' });
        return s.end("window.SJGP_SERVER = '" + NOW_GP + "';window.SJGP_TENANT='GP';"); }
      const f = path.join(APP, u === '/' ? 'index.html' : u);
      if(!fs.existsSync(f) || fs.statSync(f).isDirectory()){ s.writeHead(404); return s.end('no'); }
      s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(s);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

let pass = 0, fail = 0;
const ck = (ok, what, d) => { if(ok){ pass++; console.log('  PASS  ' + what + (d ? '   - ' + d : '')); }
                              else { fail++; console.log('  FAIL  ' + what + (d ? '   - ' + d : '')); } };

(async () => {
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport:{ width:1500, height:1000 } });
  await ctx.addInitScript(a => {
    /* the stale addresses a browser would be carrying */
    localStorage.setItem('sjf5', JSON.stringify({ url:a[0],
      session:{ token:'T-SJ', user:{ name:'Sandeep Kumar Jha', role:'COLLECTOR', phone:'9063753622' } } }));
    localStorage.setItem('sjgp-gp1', JSON.stringify({ url:a[1],
      session:{ token:'T-GP', user:{ name:'Sandeep Kumar Jha', role:'COLLECTOR', phone:'9063753622' } } }));
    localStorage.setItem('sjgp-theme', 'light');
  }, [OLD_SJ, OLD_GP]);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', d => d.accept());
  const hits = [];
  const route = (pat, label, ok) => p.route(pat, r => {
    const q = r.request();
    hits.push(label + ' ' + q.method());
    const rep = o => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(o) });
    if(!ok) return rep({ ok:false, error:'unknown request' });
    if(q.method() === 'POST'){
      let b = {}; try{ b = JSON.parse(q.postData() || '{}'); }catch(e){}
      if(b.kind === 'holidaysLoad'){ hits.push('LOAD->' + label);
        return rep({ ok:true, tenant:'GP', before:0, after:53, added:53 }); }
      return rep({ ok:true });
    }
    if(/op=roll/.test(q.url())) return rep(ROLL);
    return rep(DASH);
  });
  await route('**old.sj**', 'OLD-SJ', false);
  await route('**old.gp**', 'OLD-GP', false);
  await route('**now.sj**', 'NOW-SJ', true);
  await route('**now.gp**', 'NOW-GP', true);
  await p.route('**tile.openstreetmap.org**', r => r.abort());

  await p.goto(base + '/dashboard.html', { waitUntil:'domcontentloaded' });
  await p.waitForSelector('#app:not([hidden])', { timeout:25000 });
  await p.waitForTimeout(1500);
  ck(hits.filter(h => h.indexOf('OLD-SJ') === 0).length === 0,
     'the console never calls the address the store remembered',
     hits.filter(h => h.indexOf('OLD') === 0).join(',') || 'none');
  ck(hits.some(h => h.indexOf('NOW-SJ') === 0), 'it calls the one the district publishes');

  await p.selectOption('#tenPick', 'GP'); await p.waitForTimeout(1800);
  await p.click('#nav [data-v="admin"]'); await p.waitForTimeout(1500);
  ck(!!(await p.$('#rlHol')), 'the Load-the-year button is there');
  await p.click('#rlHol'); await p.waitForTimeout(1500);
  ck(hits.indexOf('LOAD->NOW-GP') >= 0, 'Load the year reaches the CURRENT Gram Palana address',
     hits.filter(h => h.indexOf('LOAD') === 0).join(',') || 'it went nowhere');
  ck(hits.filter(h => h.indexOf('OLD-GP') === 0).length === 0,
     'and never the stale one');
  const g = await p.$eval('#g', e => e.innerText).catch(() => '');
  ck(/53 date/.test(g), 'and the console reports the year loaded',
     JSON.stringify(g.replace(/\s+/g,' ').slice(0, 120)));
  ck(errs.length === 0, 'no script error', errs[0] || '');
  await br.close(); srv.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  if(fail) process.exitCode = 1;
})();

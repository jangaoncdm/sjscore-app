/* THE ANALYTICS SCREEN — a month, read every way at once, in a real browser.

   The console showed today very well and the last fortnight as a line. This is
   the screen that answers what a review actually asks: how did this month go,
   for whom, where, and what is different about it.

   What this pass guards is the same thing suite 33 guards on the server side,
   but on the glass: that every figure drawn is of ONE roll and says which,
   that the pickers re-ask the register rather than re-cutting a stale answer,
   that the observations are drawn as the arithmetic they are, and that the
   screen says in as many words that it accuses nobody.

   Usage: node tests/render-analytics.js
   Playwright is deliberately not a dependency: npm i playwright --no-save. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'app');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.png':'image/png',
               '.webmanifest':'application/manifest+json' };
const DASH = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-dashboard.json'), 'utf8'));

/* the register's own answer, shaped as FeatureAnalytics.gs returns it */
function answer(ym, seg, mandal){
  const days = [];
  for(let d = 1; d <= 22; d++){
    const pct = seg === 'staff' ? 70 + (d % 7) : 80 + (d % 11);
    days.push({ date:ym + '-' + String(d).padStart(2,'0'),
      present:Math.round(pct), leave:2, unmarked:Math.max(0, 30 - Math.round(pct)), pct:pct });
  }
  const officers = [];
  for(let i = 0; i < 12; i++) officers.push({ name:(seg === 'staff' ? 'Staff ' : 'Officer ') + i,
    role: seg === 'staff' ? 'STAFF' : 'PS', desig: seg === 'staff' ? 'Data Entry Operator' : '',
    mandal: i % 2 ? 'Jangaon' : 'Chilpur', phone:'90000000' + String(10 + i),
    present:20 - i, unmarked:i, late:i % 3, longest: i > 8 ? 4 : 1, pct:Math.round((20 - i) * 100 / 22) });
  return { ok:true, ym:ym, seg:seg, mandal:mandal || '', from:ym + '-01', to:ym + '-31',
    workingDays:22, roll:{ officers: seg === 'staff' ? 192 : 284,
      byRole: seg === 'staff' ? { STAFF:192 } : { PS:220, MPO:12, MPDO:12 } },
    days:days, weekday:[{ day:'Monday', pct:88, marks:900 }, { day:'Saturday', pct:71, marks:600 }],
    hours:[{ hour:8, n:120 }, { hour:9, n:800 }, { hour:10, n:400 }, { hour:12, n:60 }],
    mandals:[{ mandal:'Jangaon', officers:30, marks:600, pct:91 },
             { mandal:'Chilpur', officers:22, marks:380, pct:78 }],
    location:{ recorded:1500, nofix:120, untrusted:40 },
    closure:{ closed:900, marks:1660 }, late:210, marks:1660,
    officers:officers,
    observations:[
      'Across 22 working day(s), ' + (seg === 'staff' ? 192 : 284) + ' ' +
        (seg === 'staff' ? 'MPDO office staff' : 'field officers') + ' marked on average 85% of days.',
      'Thinnest day 07.10.2026 at 71%; fullest 12.10.2026 at 94%.',
      'Best mandal Jangaon at 91%, lowest Chilpur at 78%.',
      '210 of 1660 marks (13%) were made at or after 11:00.' ].concat(
      seg === 'staff' ? ['No show-cause notice, no casual-leave debit and no lock arises for the office staff from any of this.'] : []),
    sanction:false,
    note:'A reading of the month. No notice, no debit and no lock reads any of it.' };
}

function serve(){
  return new Promise(res => {
    const srv = http.createServer((q, s) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      if(/\/config\.js$/.test(u)){ s.writeHead(200,{'Content-Type':'text/javascript'});
        return s.end("window.SJGP_SERVER='https://mock.district/exec';window.SJGP_TENANT='';"); }
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
  const OUT = path.join(ROOT, 'Info', 'analytics-render');
  if(!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive:true });
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  const asked = [];

  for(const theme of ['light','dark']){
    const ctx = await br.newContext({ viewport:{ width:1500, height:1200 } });
    await ctx.addInitScript(t => {
      localStorage.setItem('sjf5', JSON.stringify({ url:'https://mock.district/exec',
        session:{ token:'T', user:{ name:'Sandeep Kumar Jha', role:'COLLECTOR', phone:'9000000001' } } }));
      localStorage.setItem('sjgp-theme', t);
      localStorage.setItem('sjgp-console-seen','{}');
    }, theme);
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.route('**/mock.district/**', r => {
      const u = r.request().url();
      if(/op=analytics/.test(u)){
        const q = new URL(u).searchParams;
        asked.push({ ym:q.get('ym'), seg:q.get('seg'), mandal:q.get('mandal') || '' });
        return r.fulfill({ status:200, contentType:'application/json',
          body:JSON.stringify(answer(q.get('ym'), q.get('seg'), q.get('mandal'))) });
      }
      return r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(DASH) });
    });

    await page.goto(base + '/dashboard.html', { waitUntil:'domcontentloaded' });
    await page.waitForSelector('#app:not([hidden])', { timeout:20000 });

    if(theme === 'light'){
      ck(!!(await page.$('#nav [data-v="analytics"]')), 'the Analytics tab is in the rail');
    }
    await page.click('#nav [data-v="analytics"]');
    await page.waitForTimeout(1200);

    const txt = await page.evaluate(() => document.body.innerText);
    if(theme === 'light'){
      ck(asked.length > 0, 'opening the tab asks the register for the month',
         asked[0] ? JSON.stringify(asked[0]) : 'never asked');
      ck(asked[0] && asked[0].seg === 'field', 'and asks for the FIELD officers first');

      ck(!!(await page.$('#anaYm')) && !!(await page.$('#anaSeg')) && !!(await page.$('#anaMandal')),
         'with three dropdowns — month, roll and mandal');
      const months = await page.$$eval('#anaYm option', o => o.length);
      ck(months === 12, 'twelve months to choose from', months + ' options');

      /* the figures */
      ck(/Working days/.test(txt) && /22/.test(txt), 'the working days of the month are stated');
      ck(/Average attendance/.test(txt), 'with the average attendance');
      ck(/at or after 11:00/.test(txt), 'and how many marks were late');

      /* the panels */
      ['Attendance day by day','What the month was made of','What the location readings were worth',
       'Attendance by weekday','The hour the mark was made','The mandals, ranked',
       'Officer by officer','What the month says'].forEach(p =>
        ck(txt.indexOf(p) >= 0, 'panel: ' + p));

      /* IT ACCUSES NOBODY, and says so */
      ck(/It accuses nobody/.test(txt), 'the officer table says in as many words that it accuses nobody');
      ck(/yours to read on the facts/i.test(txt), 'and leaves the meaning to the Collector');
      ck(/each sentence names the number it came from/i.test(txt),
         'AND THE OBSERVATIONS SAY THEY ARE ARITHMETIC, not something generated');
      ck(!/\bAI\b|generated by|model/i.test(txt), 'nothing on the screen claims to be a model');

      /* the observations are drawn */
      const obs = await page.$$eval('.obs li', els => els.map(e => e.textContent.trim()));
      ck(obs.length >= 4, 'every observation is drawn', obs.length);
      ck(obs.every(o => /\d/.test(o)), 'and each carries a figure');

      /* ---- the pickers re-ask the register ---- */
      await page.selectOption('#anaSeg', 'staff'); await page.waitForTimeout(900);
      const last = asked[asked.length - 1];
      ck(last && last.seg === 'staff', 'choosing the office staff re-asks the register', JSON.stringify(last));
      const t2 = await page.evaluate(() => document.body.innerText);
      ck(/192/.test(t2), 'and the screen redraws on their roll');
      ck(/no lock arises for the office staff/i.test(t2),
         'telling the Collector plainly that no sanction comes of it');

      await page.selectOption('#anaMandal', { index:1 }); await page.waitForTimeout(900);
      ck(asked[asked.length - 1].mandal !== '', 'and a mandal narrows it',
         asked[asked.length - 1].mandal);

      const wide = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      ck(!wide, 'no sideways scroll at 1500px');
    }

    /* every card in a row the same height — the console's own rule */
    const bad = await page.evaluate(() => {
      const rows = {};
      document.querySelectorAll('#g .panel').forEach(p => {
        const t = Math.round(p.getBoundingClientRect().top);
        (rows[t] = rows[t] || []).push(Math.round(p.getBoundingClientRect().height));
      });
      return Object.keys(rows).filter(t => rows[t].length > 1 &&
        Math.max(...rows[t]) - Math.min(...rows[t]) > 2).length;
    });
    ck(bad === 0, theme + ': cards sharing a row share a height', bad + ' row(s) ragged');

    const hard = await page.evaluate(() => {
      let n = 0;
      document.querySelectorAll('#g svg [fill],#g svg [stroke]').forEach(el => {
        ['fill','stroke'].forEach(a => { const v = el.getAttribute(a);
          if(v && /^#|^rgb/.test(v) && v !== 'none') n++; });
      });
      return n;
    });
    ck(hard === 0, theme + ': no hardcoded colour inside a chart', hard + ' found');

    await page.screenshot({ path: path.join(OUT, 'analytics-' + theme + '.png'), fullPage:true });
    ck(errs.length === 0, theme + ': no script error', errs[0] || '');
    await ctx.close();
  }

  await br.close(); srv.close();
  console.log('\n  ' + pass + ' passed, ' + fail + ' failed   ·   screenshots in Info/analytics-render/\n');
  process.exitCode = fail ? 1 : 0;
})();

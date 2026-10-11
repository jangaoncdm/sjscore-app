/* ============================================================================
   Renders every mockup at 1440 and 390 and writes shots/.

   IT IS A CHECK AS WELL AS A CAMERA. Before claiming a layout looks right you
   render it, and a screenshot nobody measured is a screenshot that hides a
   sideways scroll. Each page is failed on:
     - any script error on the page
     - a horizontal scrollbar at either width (documentElement wider than the
       viewport), which is the one defect a thumbnail will not show you
     - an element overflowing the right edge of the viewport
     - two cards in the same grid row whose heights differ by more than 2px
   Run it after build.js:  node design-research/dashboard-layouts/shoot.js
   Playwright is deliberately not a dependency: npm i playwright --no-save
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require(path.join('C:', 'Users', 'jhama', 'sjscore-app', 'node_modules', 'playwright'));
/* It renders this folder by default. --dir and --match point it at another
   set built the same way (looks/ holds one layout in four looks), and
   --themes adds a second measured frame in the opposite theme at 1440: a
   look that only works in the theme it was drawn in is not a look. */
const ARG = {};
process.argv.slice(2).forEach(a => {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a); if(m) ARG[m[1]] = m[2] === undefined ? true : m[2];
});
const DIR = ARG.dir ? path.join(__dirname, ARG.dir) : __dirname;
const SHOTS = path.join(DIR, 'shots');
const MATCH = new RegExp(ARG.match || '^\\d\\d-.*\\.html$');
const WIDTHS = [[1440, 'desk'], [390, 'phone']];

(async () => {
  if(!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive:true });
  const files = fs.readdirSync(DIR).filter(f => MATCH.test(f)).sort()
    /* the gallery is shot too: its own thumbnails are live iframes and a
       header that collides with a shared class is exactly the kind of fault
       this pass exists to catch. */
    .concat(fs.existsSync(path.join(DIR, 'index.html')) && !MATCH.test('index.html')
      ? ['index.html'] : []);
  const br = await chromium.launch();
  let pass = 0, fail = 0;
  const report = [];

  for(const f of files){
    for(const [w, tag] of WIDTHS){
      const ctx = await br.newContext({ viewport:{ width:w, height: w === 390 ? 844 : 960 },
                                        deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', e => errs.push(String(e).split('\n')[0]));
      p.on('console', m => { if(m.type() === 'error') errs.push('console: ' + m.text()); });
      await p.goto('file://' + path.join(DIR, f).replace(/\\/g, '/'), { waitUntil:'load' });
      await p.waitForTimeout(260);
      /* AN IFRAME BELOW THE FOLD DOES NOT PAINT, and fullPage does not make
         it. Walking the page down and back is what puts the gallery's lower
         thumbnails in the screenshot. */
      await p.evaluate(async () => {
        const H = document.documentElement.scrollHeight;
        for(let y = 0; y < H; y += 600){ window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
        window.scrollTo(0, 0);
      });
      await p.waitForTimeout(420);

      /* a closure, so the opposite theme can be measured by the same rules
         rather than by a second copy of them that is free to drift */
      const measure = () => p.evaluate(() => {
        const de = document.documentElement;
        /* A PAGE THAT SCROLLS SIDEWAYS AND A CARD THAT DOES ARE NOT THE SAME
           FAULT. The console's own pivot scrolls twenty columns of days inside
           its card on purpose, and a twelve-mandal bar chart on a 390px phone
           has to do the same or the bars are two pixels wide. So an element is
           only counted as overflowing if NOTHING above it is a scroll
           container: inside one, running past the right edge is the feature.
           The page-level check below stays absolute. */
        const scrolls = n => {
          for(let p = n.parentElement; p && p !== document.body; p = p.parentElement){
            const ox = getComputedStyle(p).overflowX;
            if(ox === 'auto' || ox === 'scroll') return true;
          }
          return false;
        };
        const over = [];
        document.querySelectorAll('body *').forEach(n => {
          const r = n.getBoundingClientRect();
          /* AN OFF-CANVAS PANEL IS NOT OVERFLOW EITHER. A drawer parked at
             translateX(100%) sits entirely past the right edge on purpose;
             what matters is content PARTLY on screen and pushing the page. */
          if(r.left >= window.innerWidth - 0.5) return;
          if(getComputedStyle(n).visibility === 'hidden') return;
          if(r.width && r.right > window.innerWidth + 1.5 && !scrolls(n))
            over.push((n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') +
                       (n.className && typeof n.className === 'string' ?
                        '.' + n.className.trim().split(/\s+/).slice(0,2).join('.') : '')) +
                      ' +' + Math.round(r.right - window.innerWidth) + 'px');
        });
        /* cards sharing a grid row must share a height */
        const rows = {}, bad = [];
        document.querySelectorAll('.grid>*, .strip>*').forEach(n => {
          const r = n.getBoundingClientRect();
          const key = Math.round(r.top / 4);
          (rows[key] = rows[key] || []).push({ h: Math.round(r.height),
            n: n.className.split(/\s+/)[0] });
        });
        Object.keys(rows).forEach(k => {
          const hs = rows[k].map(x => x.h);
          if(rows[k].length > 1 && Math.max.apply(null, hs) - Math.min.apply(null, hs) > 2)
            bad.push(rows[k].length + ' cards ' + hs.join('/'));
        });
        return { scrollW: de.scrollWidth, inner: window.innerWidth,
                 docH: de.scrollHeight, over: over.slice(0, 6), rowsBad: bad.slice(0, 4) };
      });
      const m = await measure();

      const sideways = m.scrollW > m.inner + 1;
      const probs = [];
      if(errs.length) probs.push('script: ' + errs[0]);
      if(sideways) probs.push('sideways scroll ' + m.scrollW + ' > ' + m.inner);
      if(m.over.length) probs.push('overflows right: ' + m.over.join(', '));
      if(m.rowsBad.length) probs.push('row heights differ: ' + m.rowsBad.join(' · '));

      const shot = f.replace(/\.html$/, '') + '-' + tag + '.png';
      await p.screenshot({ path: path.join(SHOTS, shot), fullPage: true });
      /* a pattern whose point is a panel that opens is not shown by a
         screenshot of it shut: labDemo() opens it for one extra frame */
      const hasDemo = await p.evaluate(() => typeof window.labDemo === 'function');
      if(hasDemo){
        await p.evaluate(() => window.labDemo());
        await p.waitForTimeout(320);
        await p.screenshot({ path: path.join(SHOTS,
          f.replace(/\.html$/, '') + '-' + tag + '-open.png'), fullPage: true });
      }
      /* THE OTHER THEME IS NOT A FREE FRAME, IT IS A SECOND CHECK. A look that
         sets a ground and forgets the dark ground reads as a design decision
         until the console is opened in a dark room in front of the district,
         which is the fault CLAUDE.md already records against hardcoded chart
         colours. The toggle is the page's own, so the charts redraw the way
         they do for a reader. */
      if(ARG.themes && w === 1440){
        const alt = await p.evaluate(() => {
          document.body.classList.toggle('dark');
          if(window.onThemeChange) window.onThemeChange();
          return document.body.classList.contains('dark') ? 'dark' : 'light';
        });
        await p.waitForTimeout(360);
        const m2 = await measure();
        if(m2.scrollW > m2.inner + 1) probs.push(alt + ': sideways scroll ' + m2.scrollW);
        if(m2.over.length) probs.push(alt + ': overflows right: ' + m2.over.join(', '));
        if(m2.rowsBad.length) probs.push(alt + ': row heights differ: ' + m2.rowsBad.join(' · '));
        if(errs.length && probs.every(x => x.indexOf('script:') !== 0))
          probs.push('script: ' + errs[0]);
        await p.screenshot({ path: path.join(SHOTS,
          f.replace(/\.html$/, '') + '-' + tag + '-' + alt + '.png'), fullPage: true });
      }
      report.push({ file:f, width:w, tag, shot, height:m.docH, problems:probs });
      if(probs.length){ fail++; console.log('  FAIL ' + f + ' @' + w + '  ' + probs.join(' | ')); }
      else { pass++; console.log('  ok   ' + f + ' @' + w + '  ' + m.docH + 'px tall  -> ' + shot); }
      await ctx.close();
    }
  }
  await br.close();
  fs.writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();

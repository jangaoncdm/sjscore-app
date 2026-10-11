/* ============================================================================
   ONE LAYOUT, FOUR LOOKS.

   The ten-pattern study answered which LAYOUT. This answers what it should
   look like, and it answers it the only way that has ever worked here: by
   rendering it, not by describing it.

   So the layout is held still. Every file below is pattern 02 - the navigation
   rail recommended by the study - assembled from the same fragment, the same
   sample district and the same chart helpers. The ONLY difference between any
   two of these pages is the look file appended last. A difference you can see
   is therefore a difference of look and feel and nothing else, which is the
   same discipline the ten mockups were built under.

   WHAT A LOOK FILE MAY NOT CHANGE. The chart series (--cs*, --co*, --st-*)
   were computed and validated against card surfaces #FFFFFF and #171B2D, the
   record is in prompt/palette-validation.txt, and the validator script is not
   installed in this working copy. So no look file moves a series colour, and
   none moves a card surface away from those two except 'flat sheet', which
   moves it to #FFFFFF itself. Grounds, rules, radii, shadows and the command
   bar are fair game; the eight series colours are not.

     node design-research/dashboard-layouts/looks/build-looks.js
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const DIR = __dirname, ROOT = path.dirname(DIR);
const SH = path.join(ROOT, '_shared'), SRC = path.join(ROOT, 'src');
const read = p => fs.readFileSync(p, 'utf8');

const TOKENS = read(path.join(SH, 'tokens.css'));
const CHROME = read(path.join(SH, 'chrome.css'));
const DATA   = read(path.join(SH, 'data.js'));
const CHARTS = read(path.join(SH, 'charts.js'));

/* the recommended layout, split on the same markers build.js uses */
const LAYOUT = (() => {
  const txt = read(path.join(SRC, '02-nav-rail.html'));
  const at = m => txt.indexOf(m);
  const iM = at('<!--@META'), iC = at('<!--@CSS-->'), iH = at('<!--@HTML-->'), iJ = at('<!--@JS-->');
  if (iM < 0 || iC < 0 || iH < 0 || iJ < 0) throw new Error('02-nav-rail.html is missing a marker');
  return {
    meta: JSON.parse(txt.slice(iM + 9, txt.indexOf('-->', iM)).trim()),
    css:  txt.slice(iC + 11, iH).trim(),
    html: txt.slice(iH + 12, iJ).trim(),
    js:   txt.slice(iJ + 10).trim()
  };
})();

/* A LOOK FILE CARRIES ITS OWN DESCRIPTION, in a @META comment at the top, so
   the gallery below cannot drift from the file it is describing. */
function look(file) {
  const css = read(path.join(DIR, file));
  const i = css.indexOf('/*@META');
  if (i !== 0) throw new Error(file + ' must open with a /*@META {...} */ comment');
  const meta = JSON.parse(css.slice(i + 7, css.indexOf('*/', i)).trim());
  return Object.assign({ file, out: 'look-' + file.replace(/\.css$/, '') + '.html', css }, meta);
}

/* The banner is the harness and is not part of any look: it names the look,
   drives the four widget states the study asks every mockup to carry, and
   switches the theme. A look that is dark BY DESIGN opens dark and the button
   offers light, not the other way round. */
function banner(L, all) {
  const others = all.filter(x => x.slug !== L.slug)
    .map(x => `<a href="${x.out}">${x.n}</a>`).join(' ');
  return `<div class="lab">
  <b>Look ${L.n} &middot; ${L.title}</b>
  <span style="opacity:.72">layout 02, navigation rail &mdash; held still across all four</span>
  <span class="sp"></span>
  <span style="opacity:.72">one widget's states:</span>
  <span class="states" id="labStates">
    <button data-st="ready"   aria-pressed="true">Ready</button>
    <button data-st="loading" aria-pressed="false">Loading</button>
    <button data-st="empty"   aria-pressed="false">Empty</button>
    <button data-st="error"   aria-pressed="false">Error</button>
  </span>
  <button id="labTheme">${L.dark ? 'Light' : 'Dark'}</button>
  <span style="opacity:.72">other looks: ${others}</span>
  <a href="index.html">All four</a>
</div>`;
}

const RUNTIME = `
(function(){
  var t = document.getElementById('labTheme');
  if(t) t.onclick = function(){
    document.body.classList.toggle('dark');
    t.textContent = document.body.classList.contains('dark') ? 'Light' : 'Dark';
    if(window.onThemeChange) window.onThemeChange();
  };
  var s = document.getElementById('labStates');
  if(s) s.addEventListener('click', function(e){
    var b = e.target.closest('button[data-st]'); if(!b) return;
    [].forEach.call(s.querySelectorAll('button'), function(x){
      x.setAttribute('aria-pressed', String(x === b)); });
    if(window.setWidgetState) window.setWidgetState(b.dataset.st);
  });
})();`;

function page(L, all) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="description" content="Look ${L.n}, ${L.title} - ${L.oneline} Layout 02 for the SJGP district monitoring console. Sample data only.">
<title>SJGP look ${L.n} &middot; ${L.title}</title>
<style>
${TOKENS}
${CHROME}
/* ============ LAYOUT 02: ${LAYOUT.meta.title.toUpperCase()} ============ */
${LAYOUT.css}
/* ============ LOOK ${L.n}: ${L.title.toUpperCase()} ============ */
${L.css}
</style>
</head>
<body${L.dark ? ' class="dark"' : ''}>
${banner(L, all)}
${LAYOUT.html}
<script>
${DATA}
</script>
<script>
${CHARTS}
</script>
<script>
${LAYOUT.js}
</script>
<script>${RUNTIME}
</script>
</body>
</html>
`;
}

const looks = fs.readdirSync(DIR).filter(f => /^\d-.*\.css$/.test(f)).sort().map(look);
looks.forEach(L => {
  fs.writeFileSync(path.join(DIR, L.out), page(L, looks));
  console.log('  wrote ' + L.out + '  (' +
    (fs.statSync(path.join(DIR, L.out)).size / 1024).toFixed(0) + ' kB)  ' + L.title);
});
fs.writeFileSync(path.join(DIR, 'looks.json'),
  JSON.stringify(looks.map(L => ({ n: L.n, slug: L.slug, title: L.title, out: L.out,
    dark: !!L.dark, oneline: L.oneline, feel: L.feel })), null, 2));
console.log(looks.length + ' looks built on layout ' + LAYOUT.meta.n + ' (' + LAYOUT.meta.title + ')');

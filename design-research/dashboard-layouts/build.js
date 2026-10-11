/* ============================================================================
   Assembles ten SELF-CONTAINED mockups from one shared token set.

   WHY A BUILD STEP FOR FILES THAT MUST NOT NEED ONE. The brief asks for ten
   self-contained HTML files AND for identical tokens across all ten, so that a
   difference you can see between two of them is a difference of LAYOUT. Ten
   hand-copied style blocks drift the moment one is edited. So the tokens, the
   primitives, the sample data and the chart helpers live in _shared/ and are
   INLINED into each output file. The outputs need no build, no network and no
   node_modules to open; this script only writes them.

     node design-research/dashboard-layouts/build.js

   Source fragments are in src/, split by marker comments. They are plain text
   here, never evaluated, so a ${...} inside a fragment belongs to the mockup's
   own runtime and not to this script.
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const DIR = __dirname, SRC = path.join(DIR, 'src'), SH = path.join(DIR, '_shared');
const read = p => fs.readFileSync(p, 'utf8');

const TOKENS = read(path.join(SH, 'tokens.css'));
const CHROME = read(path.join(SH, 'chrome.css'));
const DATA   = read(path.join(SH, 'data.js'));
const CHARTS = read(path.join(SH, 'charts.js'));

function split(txt){
  const at = m => txt.indexOf(m);
  const iM = at('<!--@META'), iC = at('<!--@CSS-->'), iH = at('<!--@HTML-->'), iJ = at('<!--@JS-->');
  if(iM < 0 || iC < 0 || iH < 0 || iJ < 0) throw new Error('fragment is missing a marker');
  const meta = JSON.parse(txt.slice(iM + 9, txt.indexOf('-->', iM)).trim());
  return { meta,
    css:  txt.slice(iC + 11, iH).trim(),
    html: txt.slice(iH + 12, iJ).trim(),
    js:   txt.slice(iJ + 10).trim() };
}

/* The lab banner is not part of any pattern. It is the harness: it names the
   pattern, switches the theme and drives the loading / empty / error states
   the brief asks every mockup to carry. */
function banner(m){
  return `<div class="lab">
  <b>Pattern ${m.n} · ${m.title}</b>
  <span style="opacity:.72">${m.origin}</span>
  <span class="sp"></span>
  <span style="opacity:.72">one widget's states:</span>
  <span class="states" id="labStates">
    <button data-st="ready"   aria-pressed="true">Ready</button>
    <button data-st="loading" aria-pressed="false">Loading</button>
    <button data-st="empty"   aria-pressed="false">Empty</button>
    <button data-st="error"   aria-pressed="false">Error</button>
  </span>
  <button id="labTheme">Dark</button>
  <a href="index.html">All ten</a>
</div>`;
}

const RUNTIME = `
/* the harness: theme and the four states. Shared, so every mockup answers the
   state switch the same way and the comparison stays about layout. */
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

function page(f){
  const m = f.meta;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="description" content="${m.title} — layout study for the SJGP district monitoring console. Sample data only.">
<title>SJGP layout ${m.n} · ${m.title}</title>
<style>
${TOKENS}
${CHROME}
/* ============ PATTERN ${m.n}: ${m.title.toUpperCase()} ============ */
${f.css}
</style>
</head>
<body>
${banner(m)}
${f.html}
<script>
${DATA}
</script>
<script>
${CHARTS}
</script>
<script>
${f.js}
</script>
<script>${RUNTIME}
</script>
</body>
</html>
`;
}

const files = fs.readdirSync(SRC).filter(f => /^\d\d-.*\.html$/.test(f)).sort();
const built = [];
files.forEach(f => {
  const frag = split(read(path.join(SRC, f)));
  const out = f;
  fs.writeFileSync(path.join(DIR, out), page(frag));
  built.push(Object.assign({ file: out }, frag.meta));
  console.log('  wrote ' + out + '  (' +
    (fs.statSync(path.join(DIR, out)).size / 1024).toFixed(0) + ' kB)');
});
fs.writeFileSync(path.join(DIR, '_shared', 'patterns.json'), JSON.stringify(built, null, 2));
console.log(built.length + ' mockups built from ' + path.relative(process.cwd(), SRC));

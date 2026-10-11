/* ============================================================================
   Writes looks/index.html: the four looks of the recommended layout, with a
   side-by-side bench that holds any two of them at a chosen width.

   Thumbnails are the captured screenshots, for the reason the ten-pattern
   gallery uses them: four live iframes on one page is survivable, but the
   screenshots are deterministic, they open instantly on a district
   connection, and they ARE the pages. The bench below is live.

   Run after build-looks.js and the shoot:
     node looks/build-looks.js
     node shoot.js --dir=looks --match='^look-\d.*\.html$' --themes
     node looks/gallery-looks.js
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const DIR = __dirname, ROOT = path.dirname(DIR);
const looks = JSON.parse(fs.readFileSync(path.join(DIR, 'looks.json'), 'utf8'));
const shots = fs.existsSync(path.join(DIR, 'shots', 'report.json'))
  ? JSON.parse(fs.readFileSync(path.join(DIR, 'shots', 'report.json'), 'utf8')) : [];
const tall = (f, tag) => { const r = shots.find(s => s.file === f && s.tag === tag);
  return r ? r.height : null; };

const TOKENS = fs.readFileSync(path.join(ROOT, '_shared', 'tokens.css'), 'utf8');
const CHROME = fs.readFileSync(path.join(ROOT, '_shared', 'chrome.css'), 'utf8');

const stem = L => L.out.replace(/\.html$/, '');
const alt  = L => L.dark ? 'light' : 'dark';

const cards = looks.map(L => `
  <article class="g">
    <a class="frame" href="${L.out}" aria-label="Open ${L.title}"><img
      src="shots/${stem(L)}-desk.png" alt="${L.title} at 1440px"></a>
    <div class="cap">
      <div class="n">${L.n}</div>
      <div class="t"><b>${L.title}</b><span>${L.oneline}</span></div>
    </div>
    <p class="feel">${L.feel}</p>
    <div class="meta">
      <span class="pill ${L.dark ? 'info' : 'mut'}">${L.dark ? 'dark by default' : 'light by default'}</span>
      <span class="h">${tall(L.out, 'desk') || '?'}px at 1440 &middot; ${tall(L.out, 'phone') || '?'}px at 390</span>
    </div>
    <div class="links">
      <a class="btn sm" href="${L.out}">Open</a>
      <a class="btn sm" href="shots/${stem(L)}-desk.png">1440</a>
      <a class="btn sm" href="shots/${stem(L)}-phone.png">390</a>
      <a class="btn sm" href="shots/${stem(L)}-desk-${alt(L)}.png">in ${alt(L)}</a>
      <button class="btn sm" data-bench="${L.out}">Compare</button>
    </div>
  </article>`).join('');

const opts = looks.map(L => `<option value="${L.out}">${L.n} &middot; ${L.title}</option>`).join('');

fs.writeFileSync(path.join(DIR, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="description" content="One layout, four looks: the recommended navigation-rail layout for the SJGP console rendered in four different grounds and chrome languages.">
<title>SJGP console &middot; one layout, four looks</title>
<style>
${TOKENS}
${CHROME}
.wrap{max-width:1800px;margin:0 auto;padding:0 var(--s3) var(--s6)}
.head{padding:var(--s4) 0 var(--s3)}
.head h1{font-size:30px;letter-spacing:-.02em;line-height:1.15}
.head p{max-width:76ch;font-size:var(--f-body);color:var(--tx-2);line-height:var(--lh-prose);
  margin-top:11px}
.head .headbar{display:flex;gap:var(--s1);flex-wrap:wrap;margin-top:var(--s3);align-items:center}
.note{margin-top:var(--s3);padding:var(--s2);border-radius:var(--r);background:var(--well);
  box-shadow:var(--nm-in-sm);font-size:var(--f-small);color:var(--tx-2);line-height:var(--lh-prose);
  max-width:84ch}
.note b{color:var(--tx)}
.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(400px,1fr));gap:var(--s3);
  margin-top:var(--s3)}
.g{background:var(--panel);border-radius:var(--r);box-shadow:var(--nm-out);overflow:hidden;
  display:flex;flex-direction:column}
.frame{display:block;height:300px;overflow:hidden;background:var(--bg);
  border-bottom:1px solid var(--line-2)}
.frame img{width:100%;display:block}
.g:hover .frame img{opacity:.93}
.cap{display:flex;gap:var(--s2);align-items:flex-start;padding:var(--s2) var(--s2) var(--s1)}
.cap .n{font:750 24px/1 var(--mono);color:var(--pri);flex:none;width:28px}
.cap .t b{display:block;font-size:var(--f-h2);line-height:1.25;letter-spacing:-.01em}
.cap .t span{display:block;font-size:var(--f-small);color:var(--tx-2);margin-top:4px;
  line-height:var(--lh)}
.feel{padding:0 var(--s2) var(--s2);font-size:var(--f-small);color:var(--tx-3);
  line-height:var(--lh-prose)}
.meta{display:flex;gap:var(--s1);align-items:center;flex-wrap:wrap;padding:0 var(--s2) var(--s1)}
.meta .h{font:var(--f-micro) var(--mono);color:var(--tx-3)}
.links{display:flex;gap:6px;flex-wrap:wrap;padding:0 var(--s2) var(--s2);margin-top:auto}
.bench{position:fixed;inset:0;z-index:40;background:var(--bg);display:none;flex-direction:column}
.bench.on{display:flex}
.bench .bh{display:flex;gap:var(--s1);align-items:center;flex-wrap:wrap;padding:11px var(--s3);
  background:var(--panel);border-bottom:1px solid var(--line)}
.bench .bh .sp{flex:1}
.bench .bb{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);
  min-height:0}
.bench .pane{background:var(--bg);display:flex;flex-direction:column;min-width:0}
.bench .pane .lbl{font:750 var(--f-eyebrow)/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;
  color:var(--tx-3);padding:7px var(--s2);background:var(--panel);border-bottom:1px solid var(--line-2)}
.bench .pane .hold{flex:1;overflow:auto;display:flex;justify-content:center;min-height:0}
.bench iframe{border:0;flex:none}
@media(max-width:980px){.bench .bb{grid-template-columns:1fr;grid-template-rows:1fr 1fr}}
@media(max-width:760px){
  .wrap{padding:0 var(--s2) var(--s5)}
  .gal{grid-template-columns:1fr}
  .head h1{font-size:23px}
}
</style>
</head>
<body>
<div class="wrap">
  <div class="head">
    <div class="eyebrow">SJGP &middot; district monitoring console &middot; look and feel</div>
    <h1>One layout, four looks</h1>
    <p>Every page below is the same layout: pattern 02, the navigation rail the study
      recommended, with the same sample district, the same filters, the same charts and the
      same twelve mandals. The <b>only</b> thing that differs between any two of them is the
      look file appended last, so a difference you can see is a difference of ground, rule,
      radius and weight, and nothing else. Officer names, village names and all figures are
      invented: this repository is public.</p>
    <div class="headbar">
      <button class="btn pri" id="openBench">Compare two side by side</button>
      <a class="btn" href="../index.html">The ten layouts</a>
      <a class="btn" href="../REPORT.md">The written report</a>
      <button class="btn" id="theme">Dark</button>
    </div>
    <div class="note"><b>What none of them changes.</b> The eight chart series, the five-step
      ordinal ramp and the four status colours are untouched in all four. They were computed
      and validated against card surfaces #FFFFFF and #171B2D, the record including the
      palette that failed is in <code>prompt/palette-validation.txt</code>, and the validator
      script is not installed in this working copy, so no look moves a series colour or a card
      surface away from those two. What changes is the ground under the panels, the rules, the
      corner radius, the shadows and the command bar.</div>
  </div>
  <div class="gal">${cards}</div>
</div>

<div class="bench" id="bench">
  <div class="bh">
    <b style="font-size:var(--f-body)">Side by side</b>
    <select class="sel" id="selA">${opts}</select>
    <select class="sel" id="selB">${opts}</select>
    <label>Width <select class="sel" id="selW">
      <option value="1440">1440 &mdash; desktop</option>
      <option value="1280">1280 &mdash; laptop</option>
      <option value="768">768 &mdash; tablet</option>
      <option value="390">390 &mdash; phone</option></select></label>
    <span class="sp"></span>
    <button class="btn sm" id="closeBench">Close</button>
  </div>
  <div class="bb">
    <div class="pane"><span class="lbl" id="lblA"></span><div class="hold"><iframe id="fA"></iframe></div></div>
    <div class="pane"><span class="lbl" id="lblB"></span><div class="hold"><iframe id="fB"></iframe></div></div>
  </div>
</div>

<script>
var LOOKS = ${JSON.stringify(looks.map(L => ({ out: L.out, n: L.n, title: L.title })))};
var bench = document.getElementById('bench');
var selA = document.getElementById('selA'), selB = document.getElementById('selB'),
    selW = document.getElementById('selW');
selB.selectedIndex = 1;

function paint(){
  var w = +selW.value;
  [['A', selA], ['B', selB]].forEach(function(pair){
    var f = document.getElementById('f' + pair[0]);
    var L = LOOKS.filter(function(x){ return x.out === pair[1].value; })[0];
    document.getElementById('lbl' + pair[0]).textContent = L.n + ' \\u00b7 ' + L.title + ' \\u00b7 ' + w + 'px';
    f.style.width = w + 'px';
    /* real width, scrolled - never scaled down. A look judged at 0.4 scale is
       a look judged on nothing, and the whole point is to read the type. */
    f.style.height = '3000px';
    if(f.getAttribute('src') !== L.out) f.setAttribute('src', L.out);
  });
}
selA.onchange = selB.onchange = selW.onchange = paint;
document.getElementById('openBench').onclick = function(){ bench.classList.add('on'); paint(); };
document.getElementById('closeBench').onclick = function(){ bench.classList.remove('on'); };
document.addEventListener('keydown', function(e){ if(e.key === 'Escape') bench.classList.remove('on'); });
document.addEventListener('click', function(e){
  var b = e.target.closest('[data-bench]'); if(!b) return;
  selA.value = b.dataset.bench;
  if(selB.value === selA.value) selB.selectedIndex = (selA.selectedIndex + 1) % LOOKS.length;
  bench.classList.add('on'); paint();
});
var t = document.getElementById('theme');
t.onclick = function(){
  document.body.classList.toggle('dark');
  t.textContent = document.body.classList.contains('dark') ? 'Light' : 'Dark';
};
</script>
</body>
</html>
`);
console.log('wrote looks/index.html with ' + looks.length + ' looks');

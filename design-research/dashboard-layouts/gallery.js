/* ============================================================================
   Writes index.html: the ten mockups as live iframe thumbnails, and a
   side-by-side bench that holds any two of them at a chosen width.

   THE THUMBNAILS ARE LIVE IFRAMES, NOT SCREENSHOTS. A picture of a layout
   cannot be scrolled, cannot be switched to dark, and cannot show you that a
   drawer opens. The screenshots are kept beside them for the report, which has
   to be readable without a browser.

   Run after build.js and shoot.js:  node gallery.js
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const DIR = __dirname;
const pats = JSON.parse(fs.readFileSync(path.join(DIR, '_shared', 'patterns.json'), 'utf8'));
const shots = fs.existsSync(path.join(DIR, 'shots', 'report.json'))
  ? JSON.parse(fs.readFileSync(path.join(DIR, 'shots', 'report.json'), 'utf8')) : [];
const tall = (f, tag) => { const r = shots.find(s => s.file === f && s.tag === tag); return r ? r.height : null; };

const TOKENS = fs.readFileSync(path.join(DIR, '_shared', 'tokens.css'), 'utf8');
const CHROME = fs.readFileSync(path.join(DIR, '_shared', 'chrome.css'), 'utf8');

const cards = pats.map(p => `
  <article class="g">
    <a class="frame" href="${p.file}" aria-label="Open ${p.title}"><img
      src="shots/${p.file.replace(/\.html$/, '')}-desk.png" alt="${p.title} at 1440px"></a>
    <div class="cap">
      <div class="n">${p.n}</div>
      <div class="t"><b>${p.title}</b><span>${p.origin}</span></div>
    </div>
    <div class="meta">
      <span class="pill mut">${p.family}</span>
      <span class="h">${tall(p.file, 'desk') || '?'}px at 1440 · ${tall(p.file, 'phone') || '?'}px at 390</span>
    </div>
    <div class="links">
      <a class="btn sm" href="${p.file}">Open</a>
      <a class="btn sm" href="shots/${p.file.replace(/\.html$/, '')}-desk.png">1440 shot</a>
      <a class="btn sm" href="shots/${p.file.replace(/\.html$/, '')}-phone.png">390 shot</a>
      <button class="btn sm" data-bench="${p.file}">Compare</button>
    </div>
  </article>`).join('');

const opts = pats.map(p => `<option value="${p.file}">${p.n} · ${p.title}</option>`).join('');

fs.writeFileSync(path.join(DIR, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="description" content="Ten layout patterns for the SJGP district monitoring console, built with identical tokens so the comparison is about layout.">
<title>SJGP console · ten layout patterns</title>
<style>
${TOKENS}
${CHROME}
.wrap{max-width:1800px;margin:0 auto;padding:0 var(--s3) var(--s6)}
.head{padding:var(--s4) 0 var(--s3)}
.head h1{font-size:30px;letter-spacing:-.02em;line-height:1.15}
.head p{max-width:72ch;font-size:var(--f-body);color:var(--tx-2);line-height:var(--lh-prose);
  margin-top:11px}
/* NOT .bar: chrome.css defines .bar as the 7px progress-bar primitive, and
   this row inherited height:7px and overflow:hidden, clipping its own buttons
   to a sliver. A shared primitive set is a shared NAMESPACE. */
.head .headbar{display:flex;gap:var(--s1);flex-wrap:wrap;margin-top:var(--s3);align-items:center}
.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:var(--s3)}
.g{background:var(--panel);border-radius:var(--r);box-shadow:var(--nm-out);overflow:hidden;
  display:flex;flex-direction:column}
/* THE THUMBNAIL IS THE SCREENSHOT, NOT A LIVE FRAME. Ten iframes on one page
   is past what Chromium will paint at once - frames seven to ten came back
   blank in the capture and stayed blank after scrolling, which is a gallery
   that lies about four of its ten. The screenshots are the pages, they are
   deterministic, and they open instantly on a district connection. The LIVE
   view is one click away and the side-by-side bench below is live. */
.frame{display:block;height:280px;overflow:hidden;background:var(--bg);
  border-bottom:1px solid var(--line-2);position:relative}
.frame img{width:100%;display:block}
.g:hover .frame img{opacity:.92}
.cap{display:flex;gap:var(--s2);align-items:flex-start;padding:var(--s2) var(--s2) var(--s1)}
.cap .n{font:750 22px/1 var(--mono);color:var(--pri);flex:none;width:34px}
.cap .t b{display:block;font-size:var(--f-base);line-height:1.3}
.cap .t span{display:block;font-size:var(--f-micro);color:var(--tx-3);margin-top:3px}
.meta{display:flex;gap:var(--s1);align-items:center;flex-wrap:wrap;padding:0 var(--s2) var(--s1)}
.meta .h{font:var(--f-micro) var(--mono);color:var(--tx-3)}
.links{display:flex;gap:6px;flex-wrap:wrap;padding:0 var(--s2) var(--s2);margin-top:auto}
/* the bench */
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
    <div class="eyebrow">SJGP · district monitoring console · layout study</div>
    <h1>Ten industry-standard layouts, each built with the console's own data</h1>
    <p>Every mockup below uses the same token set, the same chart helpers and the same sample
      figures, so a difference you can see between any two of them is a difference of
      <b>layout</b> and not of styling. Officer names, village names and all figures are
      invented: this repository is public and the district's roster is not in it.
      Each page carries filters, a chart, a table or list, a status element, and the
      loading, empty and error states of one widget — switch them in the black bar at the top
      of any mockup.</p>
    <div class="headbar">
      <button class="btn pri" id="openBench">Compare two side by side</button>
      <a class="btn" href="REPORT.md">The written report</a>
      <a class="btn" href="shots/">All screenshots</a>
      <button class="btn" id="theme">Dark</button>
    </div>
  </div>
  <div class="gal">${cards}</div>
</div>

<div class="bench" id="bench">
  <div class="bh">
    <b style="font-size:var(--f-body)">Side by side</b>
    <select class="sel" id="selA">${opts}</select>
    <select class="sel" id="selB">${opts}</select>
    <label>Width <select class="sel" id="selW">
      <option value="1440">1440 — desktop</option>
      <option value="1280">1280 — laptop</option>
      <option value="768">768 — tablet</option>
      <option value="390">390 — phone</option></select></label>
    <span class="sp"></span>
    <button class="btn sm" id="closeBench">Close</button>
  </div>
  <div class="bb">
    <div class="pane"><span class="lbl" id="lblA"></span><div class="hold"><iframe id="fA"></iframe></div></div>
    <div class="pane"><span class="lbl" id="lblB"></span><div class="hold"><iframe id="fB"></iframe></div></div>
  </div>
</div>

<script>
var PATS = ${JSON.stringify(pats.map(p => ({ file:p.file, n:p.n, title:p.title })))};
var bench = document.getElementById('bench');
var selA = document.getElementById('selA'), selB = document.getElementById('selB'),
    selW = document.getElementById('selW');
selB.selectedIndex = 1;

function paint(){
  var w = +selW.value;
  [['A', selA], ['B', selB]].forEach(function(pair){
    var f = document.getElementById('f' + pair[0]);
    var p = PATS.filter(function(x){ return x.file === pair[1].value; })[0];
    document.getElementById('lbl' + pair[0]).textContent = p.n + ' · ' + p.title + ' · ' + w + 'px';
    f.style.width = w + 'px';
    /* the frame is given the real width and the pane scrolls it, rather than
       scaling it down: a layout judged at 0.4 scale is a layout judged on
       nothing, and the whole point of the bench is to read the type */
    f.style.height = '3000px';
    if(f.getAttribute('src') !== p.file) f.setAttribute('src', p.file);
  });
}
selA.onchange = selB.onchange = selW.onchange = paint;
document.getElementById('openBench').onclick = function(){ bench.classList.add('on'); paint(); };
document.getElementById('closeBench').onclick = function(){ bench.classList.remove('on'); };
document.addEventListener('keydown', function(e){ if(e.key === 'Escape') bench.classList.remove('on'); });
document.addEventListener('click', function(e){
  var b = e.target.closest('[data-bench]'); if(!b) return;
  selA.value = b.dataset.bench;
  if(selB.value === selA.value) selB.selectedIndex = (selA.selectedIndex + 1) % PATS.length;
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
console.log('wrote index.html with ' + pats.length + ' patterns');

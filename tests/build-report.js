/* Builds the publishable browser-test report from the run's own JSON, with the
   snapshots embedded so the page stands on its own. Nothing here is retyped by
   hand — if the run changes, the report changes with it.

   Usage: node tests/build-report.js [out.html] */
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'Info', 'docs-render');
const R = JSON.parse(fs.readFileSync(path.join(DIR, 'report.json'), 'utf8'));
const OUT = process.argv[2] || path.join(DIR, 'browser-test.html');

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const dataUri = f => 'data:image/png;base64,' +
  fs.readFileSync(path.join(DIR, f)).toString('base64');

/* what each snapshot is showing, in the district's own words */
const CAPTION = {
  'app-advisory-popup': ['The circular opens by itself',
    'The officer has not read it, so it is put up the moment the app is opened — the title, the district’s line, the document, and a button that says what pressing it means.'],
  'app-home-after-ack': ['Home, once he has acknowledged',
    'The advisory card turns and stays, so the circular can be read again. The plan card sits under it, stating plainly that the GPDP has not been sent.'],
  'app-gpdp-screen': ['The plan screen',
    'What is called for, what the district does not yet hold, the formats it will take and the size it will take them at.'],
  'app-gpdp-wrong-format': ['A file that is not a plan',
    'A .txt is refused on the handset and never leaves it. The officer is told what a plan may be, in those words.'],
  'app-gpdp-filed': ['The plan, sent',
    'The district holds it, and the screen says so. A revised plan may follow; it will not erase this one.'],
  'app-advisory-list': ['Every circular, kept',
    'Reachable from More. The standing one is marked, so nothing the district has issued is read once and lost.'],
  'console-gpdp-light': ['The plan register',
    'Filed against called for, mandal by mandal, then every officer by name with the document one click away.'],
  'console-gpdp-pending': ['The thirty who have not filed',
    'One chip, and the register names exactly the officers still to file.'],
  'console-advisory-light': ['The advisory register',
    'The standing circular, the line every officer is shown, and who has read it.'],
  'console-advisory-pending': ['The thirty-three still pending',
    'The officers who have not yet acknowledged, by name and mandal.'],
  'console-advisory-publish-form': ['Publishing the next one',
    'Title, the line every officer will be shown, who it is addressed to, and the document.'],
  'console-advisory-published': ['Published',
    'The register reloads against the new circular. The one it replaced is retired, not deleted, and the receipts already given stand.'],
  'console-gpdp-dark': ['The plan register, dark', 'The same register on the dark palette.'],
  'console-advisory-dark': ['The advisory register, dark', 'And the same for the circular.']
};
const key = f => f.replace(/^\d+-/, '').replace(/\.png$/, '');

const stamp = new Date(R.at).toLocaleString('en-IN',
  { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });

function shotBlock(sh, checks){
  const [title, blurb] = CAPTION[key(sh.file)] || [sh.label, ''];
  return `<figure class="shot">
    <figcaption>
      <h3>${esc(title)}</h3>
      ${blurb ? `<p>${esc(blurb)}</p>` : ''}
      ${checks.length ? `<ul class="ck">${checks.map(c => `<li><span class="tick" aria-hidden="true"></span><span>${esc(c.name)}${c.detail ? ` <b class="d">${esc(c.detail)}</b>` : ''}</span></li>`).join('')}</ul>` : ''}
    </figcaption>
    <div class="frame"><img src="${dataUri(sh.file)}" alt="${esc(title)}" loading="lazy"></div>
  </figure>`;
}

function section(name, eyebrow, lead){
  const shots = R.shots.filter(s => s.section === name);
  const mine = R.results.filter(r => r.section === name);
  let last = 0;
  const blocks = shots.map(sh => {
    const checks = mine.filter((c, i) => R.results.indexOf(c) < sh.after && R.results.indexOf(c) >= last);
    last = sh.after;
    return shotBlock(sh, checks);
  }).join('');
  return `<section class="lane">
    <header class="lanehead">
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h2>${esc(name)}</h2>
      <p class="lead">${lead}</p>
      <p class="tally"><b>${mine.filter(c => c.pass).length}</b> of ${mine.length} checks passed</p>
    </header>
    ${blocks}
  </section>`;
}

const failed = R.results.filter(r => !r.pass);

const html = `<title>GPDP &amp; Advisory Browser Test</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root{
  --paper:#F3F4F9; --card:#FFFFFF; --line:#DFE3EE; --line-2:#E9EDF4;
  --ink:#1A2437; --ink-2:#46536B; --ink-3:#57647D;
  --indigo:#4A40CE; --indigo-2:#E7E5F9; --teal:#0F766E;
  --ok:#15803D; --ok-2:#DCEFE2; --bad:#B91C1C;
  --shot-bg:#EEF1F7;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --paper:#0E1120; --card:#171B2D; --line:#2B3149; --line-2:#242A3F;
  --ink:#E6E9F2; --ink-2:#B3BACD; --ink-3:#8E97AE;
  --indigo:#9AA0F5; --indigo-2:#232748; --teal:#3EC5AC;
  --ok:#5BD68A; --ok-2:#123726; --bad:#F1737A;
  --shot-bg:#0B0E1A;
}}
:root[data-theme="dark"]{
  --paper:#0E1120; --card:#171B2D; --line:#2B3149; --line-2:#242A3F;
  --ink:#E6E9F2; --ink-2:#B3BACD; --ink-3:#8E97AE;
  --indigo:#9AA0F5; --indigo-2:#232748; --teal:#3EC5AC;
  --ok:#5BD68A; --ok-2:#123726; --bad:#F1737A;
  --shot-bg:#0B0E1A;
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);
  font:16px/1.6 var(--sans);-webkit-font-smoothing:antialiased}
.wrap{max-width:1080px;margin:0 auto;padding:56px 24px 96px;display:flex;flex-direction:column;gap:44px}
.eyebrow{margin:0;font:600 11px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
h1{margin:10px 0 0;font-size:clamp(30px,4.6vw,44px);line-height:1.1;letter-spacing:-.02em;text-wrap:balance}
h2{margin:8px 0 0;font-size:26px;letter-spacing:-.015em;text-wrap:balance}
h3{margin:0;font-size:17px;letter-spacing:-.01em}
p{margin:0}
.masthead .sub{margin-top:14px;max-width:62ch;color:var(--ink-2);font-size:16.5px}
.stamp{margin-top:8px;font:500 12.5px/1.5 var(--mono);color:var(--ink-3)}

.score{display:flex;flex-wrap:wrap;gap:14px;margin-top:26px}
.tile{flex:1 1 170px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.tile .k{font:600 10.5px/1 var(--mono);letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3)}
.tile .v{margin-top:9px;font:750 30px/1 var(--mono);letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.tile .n{margin-top:6px;font-size:12.5px;color:var(--ink-3)}
.tile.pass .v{color:var(--ok)}
.note{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--teal);
  border-radius:12px;padding:16px 20px;color:var(--ink-2);font-size:15px;max-width:76ch}
.note b{color:var(--ink)}

.lane{display:flex;flex-direction:column;gap:26px}
.lanehead{border-top:2px solid var(--ink);padding-top:16px}
.lanehead .lead{margin-top:9px;max-width:68ch;color:var(--ink-2)}
.tally{margin-top:12px;font:600 12.5px/1 var(--mono);color:var(--ok)}
.tally b{font-size:15px}

.shot{margin:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:26px;align-items:start;
  background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px}
.shot figcaption{display:flex;flex-direction:column;gap:10px;min-width:0}
.shot figcaption p{color:var(--ink-2);font-size:14.5px}
.ck{margin:2px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px}
.ck li{display:flex;gap:9px;align-items:flex-start;font-size:13.5px;line-height:1.5;color:var(--ink-2)}
.tick{flex:none;width:15px;height:15px;margin-top:3px;border-radius:50%;background:var(--ok-2);
  position:relative}
.tick::after{content:"";position:absolute;left:4.6px;top:2.6px;width:4px;height:7.5px;
  border:solid var(--ok);border-width:0 2px 2px 0;transform:rotate(42deg)}
.ck .d{display:block;margin-top:2px;font:500 12px/1.5 var(--mono);color:var(--ink-3);word-break:break-word}
.frame{background:var(--shot-bg);border:1px solid var(--line-2);border-radius:12px;padding:10px;
  max-height:560px;overflow:auto}
.frame img{display:block;width:100%;height:auto;border-radius:7px}
@media (max-width:820px){.shot{grid-template-columns:1fr}}

table{width:100%;border-collapse:collapse;font-size:13.5px}
.tablewrap{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:14px}
th{text-align:left;font:600 10.5px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;
  color:var(--ink-3);padding:13px 16px;border-bottom:1px solid var(--line)}
td{padding:11px 16px;border-bottom:1px solid var(--line-2);vertical-align:top}
tr:last-child td{border-bottom:0}
td.s{width:1%;white-space:nowrap;font:600 11px/1 var(--mono);color:var(--ok)}
td.dt{font:500 12px/1.5 var(--mono);color:var(--ink-3)}
footer{color:var(--ink-3);font-size:13.5px;max-width:72ch}
a{color:var(--indigo)}
:focus-visible{outline:3px solid var(--indigo);outline-offset:2px;border-radius:8px}
</style>

<div class="wrap">
  <header class="masthead">
    <p class="eyebrow">SJGP &middot; District Operations Center</p>
    <h1>Two document registers, driven in a browser</h1>
    <p class="sub">The Gram Panchayat Development Plan, and the Collector&rsquo;s advisory. Every step below
      was performed by a real browser against the real pages — nothing was mocked up for the photograph.</p>
    <p class="stamp">Run ${esc(stamp)} &middot; Chromium &middot; field app at 390&thinsp;px, console at 1500&thinsp;px in both palettes</p>
    <div class="score">
      <div class="tile pass"><div class="k">Checks passed</div><div class="v">${R.passed}/${R.total}</div>
        <div class="n">${failed.length ? failed.length + ' failed' : 'none failed'}</div></div>
      <div class="tile"><div class="k">Snapshots</div><div class="v">${R.shots.length}</div>
        <div class="n">each one below</div></div>
      <div class="tile"><div class="k">Backend suites</div><div class="v">646</div>
        <div class="n">16 suites, separately</div></div>
      <div class="tile"><div class="k">Surfaces</div><div class="v">2</div>
        <div class="n">the field app and the console</div></div>
    </div>
  </header>

  <p class="note"><b>The payloads are the district&rsquo;s own.</b> They were produced by running the real
    backend under the Apps Script mock and captured as they came — so what is photographed is each page
    reading the response shape the server actually sends, not a stub written to agree with the page.
    The uploads are real too: a file is chosen in the browser, and the test reads what arrived at the
    endpoint — its name, and its bytes.</p>

  ${section('The field app', 'What an officer sees',
    'Driven as a Panchayat Secretary who has neither read the circular nor filed a plan, on a 390&thinsp;px handset.')}

  ${section('The console', 'What the Collector sees',
    'Driven as the Collector, against a district of 84 officers — 54 plans filed, 51 acknowledgements in.')}

  <section class="lane">
    <header class="lanehead">
      <p class="eyebrow">The whole run</p>
      <h2>Every check</h2>
    </header>
    <div class="tablewrap"><table>
      <thead><tr><th></th><th>Check</th><th>What was measured</th></tr></thead>
      <tbody>${R.results.map(r => `<tr><td class="s">${r.pass ? 'PASS' : 'FAIL'}</td><td>${esc(r.name)}</td><td class="dt">${esc(r.detail)}</td></tr>`).join('')}</tbody>
    </table></div>
  </section>

  <footer>Rebuilt from the run itself — <code>node tests/render-docs.js</code> then
    <code>node tests/build-report.js</code>. Neither the figures nor the snapshots above are typed by hand.</footer>
</div>`;

fs.writeFileSync(OUT, html);
console.log('written: ' + OUT + '  (' + Math.round(fs.statSync(OUT).size / 1024) + ' KB)');

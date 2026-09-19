/* THE INSTALLATION PAGE — one address the district can circulate.

   The A5 cards (tests/install-cards.js) are for printing and pinning up. This
   is the other half: a published page an officer can be sent by message, on
   the same site the apps are served from, carrying BOTH registers, the QR for
   each, the address in type he can key in, and what to do after it opens.

   THE ADDRESS IN WORDS AS WELL AS IN THE SQUARE. A QR is unreadable to a
   person: a card carrying only a square cannot be checked by the person
   holding it, and cannot be used at all by a handset whose camera will not
   focus. Both, always.

   IT IS NOT A CREDENTIAL AND IT SAYS SO. Anyone who opens it reaches a
   sign-in page and gets no further without a number on the roll and its PIN.
   Saying so on the page is what stops it being treated as a secret, and what
   stops an officer hesitating to forward it.

   NO NETWORK, NO WEBFONT, NO CDN, and the squares are inline SVG built here —
   the page has to open on a handset on a village road with one bar.

   Every square is decoded by tests/qr-check.js before it is published: an
   independent decoder at three sizes and turned a quarter round, compared
   module for module against an independent encoder.

   Usage: node tests/build-install-page.js        (writes app/install.html) */
'use strict';
const fs = require('fs');
const path = require('path');
const QR = require('./qr.js');

const OUT = path.join(__dirname, '..', 'app', 'install.html');
const SITE = 'https://jangaoncdm.github.io/sjscore-app';

const REGISTERS = [
  { tag:'Gram Palana Register',
    sub:'Revenue department',
    who:'Gram Palana Officers · Mandal and Assistant Revenue Inspectors',
    url: SITE + '/gp/',
    does:'Attendance carrying the place it was marked from, leave, and the day’s report.' },
  { tag:'Swachh Jangaon Gram Panchayat',
    sub:'Sanitation',
    who:'Panchayat Secretaries · MPO · MSO · MPDO · DPO · DLPO',
    url: SITE + '/',
    does:'Attendance, the 100-mark village evaluation with photographs, leave and the filing schedule.' }
];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

function block(r){
  const qr = QR.svg(r.url, { px: 8 });
  const m = QR.encode(r.url);
  return `<section class="reg">
  <p class="eyebrow">${esc(r.sub)}</p>
  <h2>${esc(r.tag)}</h2>
  <p class="who">${esc(r.who)}</p>
  <div class="row">
    <div class="qr" aria-label="QR code for ${esc(r.url)}">${qr}</div>
    <div class="side">
      <p class="lbl">Open this address</p>
      <p class="url"><a href="${esc(r.url)}">${esc(r.url)}</a></p>
      <p class="does">${esc(r.does)}</p>
      <p class="ver">QR version ${m.version} · ${m.size}&times;${m.size}</p>
    </div>
  </div>
</section>`;
}

const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Install the district register · Jangaon</title>
<meta name="description" content="How to install the Jangaon District field registers on a phone.">
<style>
  /* NO WEBFONT AND NO CDN. This page is opened by an officer on a village
     road, and it must render with one bar of signal or none at all. */
  :root{
    --paper:#F3F4F9; --card:#FFFFFF; --ink:#10121C; --ink-2:#545A6E; --ink-3:#767D93;
    --line:rgba(16,18,28,.12); --pri:#4A40CE; --teal:#0F766E;
  }
  @media (prefers-color-scheme: dark){
    :root:not([data-theme="light"]){
      --paper:#10121C; --card:#171B2D; --ink:#EEF0F7; --ink-2:#AEB4C8; --ink-3:#8A90A6;
      --line:rgba(238,240,247,.14);
    }
  }
  :root[data-theme="dark"]{
    --paper:#10121C; --card:#171B2D; --ink:#EEF0F7; --ink-2:#AEB4C8; --ink-3:#8A90A6;
    --line:rgba(238,240,247,.14);
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans",sans-serif;
    color:var(--ink);background:var(--paper);padding:28px 16px 64px}
  .wrap{max-width:860px;margin:0 auto}
  header{text-align:center;margin-bottom:26px}
  .seal{font:700 12px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
  h1{font-size:27px;letter-spacing:-.02em;margin-top:9px;line-height:1.25}
  .lede{color:var(--ink-2);margin-top:10px;font-size:15px}
  .reg{background:var(--card);border:1px solid var(--line);border-radius:16px;
    padding:22px;margin-top:18px}
  .eyebrow{font:700 11px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    letter-spacing:.15em;text-transform:uppercase;color:var(--ink-3)}
  .reg h2{font-size:21px;margin-top:8px;letter-spacing:-.01em}
  .who{color:var(--ink-2);font-size:14px;margin-top:5px}
  .row{display:flex;gap:22px;align-items:center;margin-top:18px;flex-wrap:wrap}
  .qr{background:#fff;padding:10px;border-radius:12px;border:1px solid var(--line);
    line-height:0;flex:0 0 auto}
  .qr svg{display:block;width:264px;height:264px}
  .side{flex:1 1 260px;min-width:0}
  .lbl{font:700 11px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
  .url{margin-top:7px;font:15px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    word-break:break-all}
  .url a{color:var(--pri);text-decoration:none;border-bottom:1px solid var(--line)}
  .does{color:var(--ink-2);font-size:14px;margin-top:12px}
  .ver{color:var(--ink-3);font-size:12px;margin-top:12px;
    font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
  .steps{background:var(--card);border:1px solid var(--line);border-radius:16px;
    padding:22px;margin-top:18px}
  .steps h3{font-size:16px}
  .steps ol{margin:12px 0 0 20px}
  .steps li{margin-top:8px;color:var(--ink-2)}
  .steps li b{color:var(--ink)}
  .two{display:flex;gap:18px;flex-wrap:wrap;margin-top:14px}
  .two > div{flex:1 1 300px;min-width:0}
  .note{border-left:3px solid var(--teal);padding:2px 0 2px 14px;margin-top:16px;
    color:var(--ink-2);font-size:14px}
  footer{text-align:center;color:var(--ink-3);font-size:13px;margin-top:30px;line-height:1.7}
  @media (max-width:560px){
    .qr svg{width:212px;height:212px}
    h1{font-size:23px}
  }
</style></head>
<body>
<div class="wrap">
  <header>
    <p class="seal">Collectorate · Jangaon District · Telangana</p>
    <h1>Installing the district register on your phone</h1>
    <p class="lede">There is no app store and nothing to download. The register opens in the
    phone’s browser and is then kept on the home screen like any other app, and it works
    with no signal once it is installed.</p>
  </header>

  ${REGISTERS.map(block).join('\n')}

  <section class="steps">
    <h3>After it opens</h3>
    <div class="two">
      <div>
        <p class="lbl">Android · Chrome</p>
        <ol>
          <li>Open the address above, or photograph the square with the camera.</li>
          <li>Tap the <b>⋮</b> menu at the top right.</li>
          <li>Tap <b>Add to Home screen</b>, then <b>Install</b>.</li>
        </ol>
      </div>
      <div>
        <p class="lbl">iPhone · Safari</p>
        <ol>
          <li>Open the address in <b>Safari</b> — not Chrome, which cannot install it.</li>
          <li>Tap the <b>Share</b> button at the foot of the screen.</li>
          <li>Tap <b>Add to Home Screen</b>.</li>
        </ol>
      </div>
    </div>
    <p class="note">Sign in with <b>your ten-digit mobile number as registered by the district</b>
    and the PIN issued to you, then change the PIN from <b>More › Change my PIN</b>.
    If the number is not recognised or the PIN does not work, the office will reset it — ten
    wrong attempts lock the app for an hour, so ask rather than keep trying.</p>
  </section>

  <section class="steps">
    <h3>What this page is not</h3>
    <p style="color:var(--ink-2);font-size:14px;margin-top:10px">
      <b>It is not a credential.</b> Anyone who opens either address reaches a sign-in page and
      gets no further without a number on the roll and the PIN issued against it. This page may be
      forwarded, printed and pinned on a notice board. Your PIN may not: it is yours, it is never
      written on the register, and nobody in the district can read it back to you — it can only be
      reset.</p>
  </section>

  <footer>
    Office of the Collector &amp; District Magistrate, Jangaon District, Telangana.<br>
    Each register is open only to officers on its own roll.
  </footer>
</div>
</body></html>
`;

fs.writeFileSync(OUT, html);
REGISTERS.forEach(r => {
  const m = QR.encode(r.url);
  console.log('  ' + r.tag.padEnd(32) + 'v' + m.version + ' ' + m.size + '×' + m.size + '  ' + r.url);
});
console.log('\nwritten: app/install.html  (' + html.length + ' bytes, no webfont, no CDN)');
console.log('Run  node tests/qr-check.js  to decode every square before publishing.');

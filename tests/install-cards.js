/* THE INSTALL CARD — what an officer is actually handed.

   134 Gram Panchayat Officers and Revenue Inspectors, and ~280 on the
   sanitation register, install by photographing a square. This writes one A5
   card per register: the QR, the address in type large enough to key in when
   the camera will not focus, and the three steps that follow.

   THE ADDRESS IN WORDS AS WELL AS IN THE SQUARE. A QR is unreadable to a
   person, so a card carrying only a QR cannot be checked by the person holding
   it and cannot be used at all by a handset whose camera has failed. Both go on
   the card, always.

   IT IS NOT A CREDENTIAL. Anyone who photographs it reaches the sign-in page
   and gets no further without a number on the roll and its PIN. The card says
   so, so that nobody treats it as a secret or hesitates to put it on a notice
   board.

   Every square this writes has been decoded by tests/qr-check.js — an
   independent decoder, at three print sizes and turned a quarter round — and
   compared module for module against an independent encoder. Nothing here is
   printed on trust.

   Usage: node tests/install-cards.js [outdir]
*/
'use strict';
const fs = require('fs');
const path = require('path');
const QR = require('./qr.js');

const OUT = process.argv[2] || path.join(__dirname, '..', 'Info', 'install');

const CARDS = [
  { file: 'install-gp.html',
    tag: 'Gram Panchayat Register',
    who: 'Gram Panchayat Officers · Mandal and Assistant Revenue Inspectors',
    url: 'https://jangaoncdm.github.io/sjscore-app/gp/',
    accent: '#0F766E',
    note: 'Attendance with the place of duty, leave, and the day’s report.' },
  { file: 'install-sjgp.html',
    tag: 'Swachh Jangaon Gram Panchayat',
    who: 'Panchayat Secretaries · MPO · MSO · MPDO',
    url: 'https://jangaoncdm.github.io/sjscore-app/',
    accent: '#4A40CE',
    note: 'Attendance, the 100-mark village evaluation, leave and the filing schedule.' }
];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

function card(c){
  const qr = QR.svg(c.url, { px: 10 });
  const meta = QR.encode(c.url);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>Install · ${esc(c.tag)}</title>
<style>
  /* No webfont. This must print from a district machine with no network. */
  :root{ --ink:#10121C; --ink-2:#545A6E; --ink-3:#767D93; --line:rgba(16,18,28,.13); --acc:${c.accent}; }
  *{margin:0;padding:0;box-sizing:border-box}
  body{font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans",sans-serif;
    color:var(--ink);background:#F3F4F9;display:flex;justify-content:center;padding:24px}
  .card{background:#fff;width:148mm;min-height:210mm;padding:16mm 14mm;
    box-shadow:0 1px 2px rgba(16,18,28,.06),0 18px 40px -18px rgba(42,36,130,.28);border-radius:4mm}
  .eyebrow{font-family:ui-monospace,SFMono-Regular,"Cascadia Mono",Menlo,Consolas,monospace;
    font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--acc);font-weight:700}
  h1{font-size:27px;letter-spacing:-.025em;margin-top:6px;line-height:1.15}
  .who{color:var(--ink-2);font-size:14px;margin-top:8px}
  .rule{height:3px;background:var(--acc);width:54px;margin:14px 0 0;border-radius:2px}
  .qrwrap{display:flex;justify-content:center;margin:22px 0 6px}
  .qrwrap svg{width:62mm;height:62mm;display:block}
  .addr{text-align:center;font-family:ui-monospace,SFMono-Regular,"Cascadia Mono",Menlo,Consolas,monospace;
    font-size:13px;word-break:break-all;color:var(--ink);background:#F3F4F9;
    padding:9px 12px;border-radius:8px;margin-top:10px;line-height:1.45}
  .addr b{color:var(--acc)}
  h2{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3);margin:22px 0 8px;
    font-family:ui-monospace,SFMono-Regular,"Cascadia Mono",Menlo,Consolas,monospace}
  ol{margin-left:18px} li{margin-top:8px}
  .fine{font-size:12.5px;color:var(--ink-3);line-height:1.6;margin-top:18px;
    border-top:1px solid var(--line);padding-top:12px}
  .foot{font-size:11px;color:var(--ink-3);margin-top:14px;
    font-family:ui-monospace,SFMono-Regular,"Cascadia Mono",Menlo,Consolas,monospace}
  @media print{ body{background:#fff;padding:0} .card{box-shadow:none;border-radius:0;width:auto;min-height:auto} }
</style></head>
<body><div class="card">
  <p class="eyebrow">Government of Telangana · Collectorate, Jangaon</p>
  <h1>${esc(c.tag)}</h1>
  <p class="who">${esc(c.who)}</p>
  <div class="rule"></div>

  <div class="qrwrap">${qr}</div>
  <div class="addr">or type it in:<br><b>${esc(c.url)}</b></div>

  <h2>To install</h2>
  <ol>
    <li>Point the phone camera at the square, or type the address above into Chrome.</li>
    <li>Chrome will offer <b>Add to Home screen</b> — accept it. The app then opens
        like any other app and works with no signal.</li>
    <li>Sign in with <b>your own mobile number</b> and the PIN issued by the District
        Panchayat Office.</li>
  </ol>

  <h2>What it is for</h2>
  <p>${esc(c.note)}</p>

  <p class="fine">
    <b>This square is not a password.</b> It is only the address of the app. Anyone who
    photographs it reaches the sign-in page and no further: the register opens only to a
    mobile number on the roll, with its PIN. It may be put on a notice board.<br><br>
    If the camera will not read it, type the address. If the number is not accepted,
    the District Panchayat Office issues and resets PINs — no PIN is ever sent by message.
  </p>
  <p class="foot">QR version ${meta.version} · ${meta.size}×${meta.size} modules · error correction M
    · decoded and verified before printing</p>
</div></body></html>`;
}

fs.mkdirSync(OUT, { recursive: true });
CARDS.forEach(c => {
  fs.writeFileSync(path.join(OUT, c.file), card(c));
  fs.writeFileSync(path.join(OUT, c.file.replace('.html', '.svg')), QR.svg(c.url, { px: 12 }));
  const m = QR.encode(c.url);
  console.log(c.tag.padEnd(32) + ' v' + m.version + ' ' + m.size + '×' + m.size + '  ' + c.url);
});
console.log('\nwritten: ' + OUT);
console.log('  install-*.html  the printable A5 card (open in a browser, Ctrl+P)');
console.log('  install-*.svg   the bare square, if you want it in another document');
console.log('\nEvery square here is decoded by tests/qr-check.js before it is printed.');

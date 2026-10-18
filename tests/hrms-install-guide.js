/* THE INSTALL GUIDE FOR THE DISTRICT HRMS — Android and iPhone, step by step.

   The install card (tests/install-cards.js) is the A5 square a notice board
   carries. This is the page an office is sent when somebody asks "how": one
   address, one square, and the taps that follow on each kind of phone —
   because the two are not the same. Chrome on Android offers to install the
   page; Safari on an iPhone never offers and the employee has to find "Add to
   Home Screen" under the Share button himself, and Chrome on an iPhone cannot
   do it at all. A guide that says "install the app" and stops is how a third
   of the district learns the app does not work on their phone.

   It is written once here and published twice: as hrms/install.html on the
   site, so an office can open it on a screen, and as a PDF for the circular.
   The square is the same QR.svg every card carries, decoded by tests/qr-check.js
   against an independent decoder; the address is beside it in words, because
   a square cannot be checked by the person holding it. It is not a credential
   and says so: anyone who photographs it reaches the sign-in and gets no
   further without a number on the establishment and the code his office gave
   him.

   Usage: node tests/hrms-install-guide.js          # writes hrms/install.html,
                                                    # Info/install/HRMS-install-guide.pdf
*/
'use strict';
const fs = require('fs');
const path = require('path');
const QR = require('./qr.js');

const URL = 'https://jangaoncdm.github.io/sjscore-app/hrms/';
const ROOT = path.join(__dirname, '..');
const HTML = path.join(ROOT, 'hrms', 'install.html');
const OUT = path.join(ROOT, 'Info', 'install');

function page(){
  const qr = QR.svg(URL, { px: 10 });
  const step = (n, t, d) => `<li><b>${n}</b><div><strong>${t}</strong>${d ? `<span>${d}</span>` : ''}</div></li>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>District HRMS · Jangaon — how to install the app</title>
<style>
  :root{--ink:#14162B;--ink-2:#454A6B;--ink-3:#6E7390;--acc:#4A40CE;--paper:#FFFFFF;--tint:#F3F4F9;--line:#E3E5F0}
  *{box-sizing:border-box}
  body{margin:0;background:var(--tint);color:var(--ink);font:15px/1.55 -apple-system,"Segoe UI",Roboto,"Noto Sans",Arial,sans-serif}
  .sheet{max-width:860px;margin:0 auto;padding:28px 20px 48px}
  .card{background:var(--paper);border-radius:18px;padding:26px 28px;box-shadow:0 1px 2px rgba(20,22,43,.06)}
  .eyebrow{font:700 10.5px/1 ui-monospace,Consolas,monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--acc)}
  h1{font-size:30px;line-height:1.1;letter-spacing:-.025em;margin:8px 0 6px}
  h2{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3);margin:26px 0 10px;padding-top:18px;border-top:1px solid var(--line)}
  .lead{color:var(--ink-2);font-size:15.5px;max-width:60ch}
  .top{display:flex;gap:26px;align-items:flex-start;flex-wrap:wrap;margin-top:18px}
  .qrwrap{flex:0 0 auto;background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px}
  .qrwrap svg{width:54mm;height:54mm;display:block}
  .addr{flex:1 1 260px;min-width:0}
  .url{font:600 15px/1.4 ui-monospace,Consolas,monospace;word-break:break-all;background:var(--tint);border-radius:10px;padding:10px 12px;margin:6px 0 10px}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  @media (max-width:640px){.two{grid-template-columns:1fr}}
  .col{background:var(--tint);border-radius:14px;padding:16px 18px}
  .col h3{margin:0 0 4px;font-size:17px;letter-spacing:-.01em}
  .col .sub{color:var(--ink-3);font-size:13px;margin:0 0 10px}
  ol{list-style:none;margin:0;padding:0}
  ol li{display:flex;gap:12px;padding:9px 0;border-top:1px solid var(--line)}
  ol li:first-child{border-top:0}
  ol li b{flex:0 0 26px;height:26px;border-radius:50%;background:var(--acc);color:#fff;font-size:13px;display:grid;place-items:center}
  ol li div{min-width:0}
  ol li strong{display:block;font-size:14.5px}
  ol li span{display:block;color:var(--ink-2);font-size:13.5px;margin-top:2px}
  .note{background:#FFF7E6;border-radius:12px;padding:12px 14px;color:#6B4E00;font-size:13.5px;margin-top:14px}
  .fine{font-size:12.5px;color:var(--ink-3);line-height:1.6;margin-top:22px;padding-top:14px;border-top:1px solid var(--line)}
  @media print{body{background:#fff}.sheet{padding:0;max-width:none}.card{box-shadow:none;border-radius:0;padding:0}h2{break-after:avoid}.col{break-inside:avoid}}
  @page{size:A4;margin:16mm 15mm}
</style></head><body><div class="sheet"><div class="card">
<p class="eyebrow">Government of Telangana · Jangaon District</p>
<h1>District HRMS — install the app on your phone</h1>
<p class="lead">One address for every phone. Apply for leave, see what the year has left you, and track every application to the District Magistrate’s order — from your own handset.</p>

<div class="top">
  <div class="qrwrap">${qr}</div>
  <div class="addr">
    <p class="eyebrow" style="color:var(--ink-3)">The address, in words</p>
    <div class="url">${URL}</div>
    <p style="margin:0;color:var(--ink-2);font-size:14px">Scan the square with the phone’s camera, or type the address into the browser. Both open the same page. Nothing is installed from a shop: the app is this page, kept on your home screen.</p>
  </div>
</div>

<h2>Installing</h2>
<div class="two">
  <div class="col">
    <h3>Android</h3>
    <p class="sub">Chrome — the browser most phones already have</p>
    <ol>
      ${step(1, 'Open the address in Chrome.', 'Scan the square with the camera and tap the link, or type the address.')}
      ${step(2, 'Tap “Add to Home Screen” on the page.', 'It is on the Home screen and under Me. If you do not see it, open Chrome’s menu (the three dots, top right) and tap “Install app” or “Add to Home screen”.')}
      ${step(3, 'Tap Install.', 'The HRMS icon appears among your apps. Open it from there from now on.')}
    </ol>
  </div>
  <div class="col">
    <h3>iPhone</h3>
    <p class="sub">Safari only — Chrome on an iPhone cannot add it</p>
    <ol>
      ${step(1, 'Open the address in Safari.', 'Scan the square with the Camera app and tap the link. If it opens in another browser, copy the address and paste it into Safari.')}
      ${step(2, 'Tap the Share button.', 'The square with an arrow pointing up, at the bottom of the screen (or at the top on an iPad).')}
      ${step(3, 'Scroll the sheet and tap “Add to Home Screen”, then “Add”.', 'The HRMS icon appears on the Home Screen. Open it from there from now on — not from Safari.')}
    </ol>
  </div>
</div>
<div class="note">The first time, open the app where there is a signal. After that it opens without one, and anything you send while offline goes up when the line returns.</div>

<h2>Signing in for the first time</h2>
<ol>
  ${step(1, 'Open HRMS from the home screen and enter your mobile number.', 'The number your office holds for you on the establishment. Tap Sign in.')}
  ${step(2, 'Enter the code your office gave you.', 'A six-character enrolment code from your office’s sheet — or, where the sheet says so, your employee id. It is used once and then spent.')}
  ${step(3, 'Choose your own PIN — 4 to 8 digits — and enter it twice.', 'Nobody else knows it. You sign in with your number and this PIN from then on.')}
  ${step(4, 'You are in.', 'Home shows what you have, what is coming and what needs you. Request opens an application; every application shows its journey to the District Magistrate’s order.')}
</ol>

<h2>If something does not work</h2>
<ol>
  ${step('?', '“This number is not on the establishment.”', 'Your office has not sent your row, or holds a different number for you. Ask your office; it checks the number and the employee id against your name.')}
  ${step('?', 'The code is refused.', 'A code opens one row once. If it was used already, or typed from a smudged sheet, your office asks the Collectorate for the row to be looked at.')}
  ${step('?', 'No “Add to Home Screen” on an iPhone.', 'You are not in Safari. Copy the address into Safari and try again.')}
</ol>

<p class="fine">This square and this address are <strong>not a credential</strong>. Anyone who photographs them reaches the sign-in page and gets no further without a number on the establishment and the code or PIN that goes with it. Put them on the notice board. &nbsp;·&nbsp; Issued by the Collectorate, Jangaon, for the offices of the district establishment.</p>
</div></div></body></html>`;
}

(async () => {
  const html = page();
  fs.writeFileSync(HTML, html);
  console.log('written  : hrms/install.html');
  fs.mkdirSync(OUT, { recursive: true });
  let pw; try{ pw = require('playwright'); }catch(e){ console.log('playwright is not installed — the PDF was not written (npm i playwright --no-save)'); return; }
  const browser = await pw.chromium.launch();
  const pg = await browser.newPage();
  await pg.setContent(html, { waitUntil: 'load' });
  const pdf = path.join(OUT, 'HRMS-install-guide.pdf');
  await pg.pdf({ path: pdf, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' } });
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.screenshot({ path: path.join(OUT, 'HRMS-install-guide-390.png'), fullPage: true });
  await browser.close();
  console.log('written  : Info/install/HRMS-install-guide.pdf  (and a 390px screenshot beside it)');
})();

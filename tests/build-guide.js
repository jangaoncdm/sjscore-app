/* Builds the officers' guide — an A4 PDF the district can print or send on
   WhatsApp alongside the advisory itself. The phone frames come from
   guide-shots.js, which drives the real app, so no screen in this document is
   a drawing of what the app might look like.

   Usage: node tests/guide-shots.js && node tests/build-guide.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIR = path.join(__dirname, '..', 'Info', 'guide');
const OUT_HTML = path.join(DIR, 'SJGP-advisory-guide.html');
const OUT_PDF  = path.join(DIR, 'SJGP-advisory-guide.pdf');

const img = f => 'data:image/png;base64,' + fs.readFileSync(path.join(DIR, f)).toString('base64');
const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* Every step is one thing the officer does, in the order he does it. The
   numbering is real sequence, not decoration. */
const ADVISORY = [
  { shot:'1-opens', h:'The advisory opens by itself',
    p:'Open SJGP as you always do. When the Collector has issued an advisory, it comes up on its own, over the home screen. You do not have to go looking for it.',
    l:['Read the line in bold — that is the instruction.',
       '<b>Open the advisory</b> shows you the full document.',
       '<b>Later</b> puts it away for now. It will come up again the next time you open the app.'] },
  { shot:'2-home', h:'Press “I have read this”',
    p:'This tells the district you have seen the advisory. The card then turns green and stays on your home screen, so you can read it again whenever you need to.',
    l:['It is a <b>receipt</b>, not a report that the work is done.',
       'It needs signal. If you have none, press it again where there is a line.',
       'Pressing it twice does no harm — the district records it once.'] },
  { shot:'3-kept', h:'Every advisory is kept',
    p:'Go to <b>More ▸ Advisories</b> at any time. Every circular the Collector has issued to you is there, newest first, with its document.',
    l:['The one in force is marked <b>standing</b>.',
       'Nothing is removed when a new advisory is issued.'] }
];

const PLAN = [
  { shot:'2b-plan-card', h:'The plan card on your home screen',
    p:'Under the advisory sits the Gram Panchayat Development Plan the district has called for. It says whether yours has been sent.',
    l:['Tap it to open the plan screen.'] },
  { shot:'4-plan', h:'Send your development plan',
    p:'Press <b>Choose the file</b> and pick the plan from your phone. It goes to the district straight away.',
    l:['PDF, Word or Excel. Nothing else is accepted.',
       'Up to 8 MB.',
       'It goes to the district as you send it, so send it where there is signal — it is too large to be held on the phone and sent later.'] },
  { shot:'5-plan-sent', h:'The district has it',
    p:'When the screen says the district has your plan, it is done. You do not need to send it again.',
    l:['If you send a corrected plan later, the district keeps both and reads the newest as the one that stands.'] }
];

const stamp = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' }).replace(/\//g, '.');

const steps = (list, start) => list.map((s, i) => `
  <section class="step">
    <div class="txt">
      <p class="n">${start + i}</p>
      <h3>${s.h}</h3>
      <p class="lede">${s.p}</p>
      <ul>${s.l.map(x => `<li>${x}</li>`).join('')}</ul>
    </div>
    <div class="shot"><img src="${img(s.shot + '.png')}" alt=""></div>
  </section>`).join('');

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>SJGP — Advisory and Development Plan</title>
<style>
@page{ size:A4; margin:14mm 15mm 16mm; }
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#1A2437;
  font:11pt/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}

header.mast{border-bottom:2.5pt solid #4A40CE;padding-bottom:9pt;margin-bottom:14pt}
.gov{font:600 8.5pt/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  letter-spacing:.14em;text-transform:uppercase;color:#57647D}
h1{margin:6pt 0 0;font-size:19pt;line-height:1.15;letter-spacing:-.01em}
.sub{margin:5pt 0 0;font-size:10pt;color:#46536B;max-width:150mm}
.rc{margin-top:6pt;font:500 8.5pt/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#57647D}

.callout{border:0.8pt solid #DFE3EE;border-left:3pt solid #0F766E;background:#F3F4F9;
  border-radius:5pt;padding:9pt 12pt;margin:0 0 14pt}
.callout .k{font:600 8pt/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  letter-spacing:.12em;text-transform:uppercase;color:#0F766E}
.callout p{margin:5pt 0 0;font-size:11pt}
.callout b{font-weight:700}

h2{margin:0 0 10pt;font-size:13pt;letter-spacing:-.01em;
  border-bottom:0.8pt solid #DFE3EE;padding-bottom:5pt}
.part{margin-top:4pt}

.step{display:flex;gap:8mm;align-items:flex-start;margin:0 0 13pt;
  break-inside:avoid;page-break-inside:avoid}
.step .txt{flex:1;min-width:0}
/* the frame is the officer's confirmation that he is on the right screen, so
   it has to be readable on a printed page, not merely present */
.step .shot{flex:0 0 52mm}
.step .shot img{display:block;width:100%;height:auto;
  border:0.8pt solid #DFE3EE;border-radius:4pt}
.n{margin:0 0 3pt;font:700 9pt/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  color:#4A40CE;letter-spacing:.1em}
.step h3{margin:0;font-size:12pt;letter-spacing:-.01em}
.lede{margin:4pt 0 0;font-size:10.5pt;color:#1A2437}
.step ul{margin:6pt 0 0;padding-left:12pt}
.step li{margin:0 0 3pt;font-size:9.8pt;color:#46536B}
.step li b{color:#1A2437}

footer{margin-top:14pt;border-top:0.8pt solid #DFE3EE;padding-top:7pt;
  font-size:9pt;color:#57647D;break-inside:avoid}
footer b{color:#1A2437}
.pagebreak{break-before:page;page-break-before:always}
</style></head><body>

<header class="mast">
  <p class="gov">Government of Telangana &middot; District Collector &amp; Magistrate, Jangaon</p>
  <h1>The Collector&rsquo;s advisory on the SJGP app</h1>
  <p class="sub">What every Panchayat Secretary, MPO, MSO and MPDO now sees when the app is opened,
    and what to do about it. Six steps, and nothing here needs training.</p>
  <p class="rc">Swachh Jangaon Gram Panchayat &middot; Rc.No.788/DPO/26/34 &middot; ${esc(stamp)}</p>
</header>

<div class="callout">
  <p class="k">The advisory now in force</p>
  <p><b>Kindly go through the to do list in the monsoon season and act accordingly.</b></p>
  <p style="font-size:9.5pt;color:#46536B">Open the advisory in the app and read the full document before you acknowledge it.</p>
</div>

<div class="part">
  <h2>Part one &middot; The advisory</h2>
  ${steps(ADVISORY, 1)}
</div>

<div class="part pagebreak">
  <h2>Part two &middot; The Gram Panchayat Development Plan</h2>
  ${steps(PLAN, 4)}
</div>

<footer>
  <p><b>The district can see who has read the advisory and who has not, and who has sent a plan
  and who has not.</b> Acknowledging an advisory records only that you have seen it. It is not a
  report that the work is done.</p>
  <p style="margin-top:5pt">If the app does not show the advisory, close it and open it again where
  there is signal. For a number that will not sign in, or a wrong village against your name,
  contact the District Panchayat Office, Jangaon.</p>
</footer>

</body></html>`;

fs.writeFileSync(OUT_HTML, html);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil:'load' });
  await page.pdf({ path: OUT_PDF, format:'A4', printBackground:true,
                   margin:{ top:'14mm', right:'15mm', bottom:'16mm', left:'15mm' } });
  await browser.close();
  console.log('PDF   : ' + OUT_PDF + '  (' + Math.round(fs.statSync(OUT_PDF).size / 1024) + ' KB)');
  console.log('HTML  : ' + OUT_HTML);
})();

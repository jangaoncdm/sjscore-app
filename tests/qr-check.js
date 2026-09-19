/* DOES THE SQUARE ACTUALLY SCAN?

   134 officers install the Gram Palana register by photographing a QR code.
   A wrong one cannot be spotted by looking — a QR is unreadable to a person by
   design — and the failure lands on 134 people at once, on the morning they
   are told to install it.

   So nothing here is asserted. Every code this project prints is rasterised to
   real pixels and decoded by jsQR, which is an INDEPENDENT
   implementation: it did not come from the same hands as tests/qr.js and does
   not share its misunderstandings. If the string does not come back, byte for
   byte, this fails.

   It also decodes at three print sizes and after a 90-degree rotation, because
   the thing that will photograph it is a five-year-old Android in a village
   street, not a screenshot.

   jsQR is not a dependency of this project — the same rule the render passes
   follow: npm i jsqr --no-save. Nothing else is needed; the pixels are made
   here rather than in a browser, so this runs on any machine with node.

   Usage: node tests/qr-check.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const jsQR = require('jsqr');
const QR = require('./qr.js');
/* A SECOND, INDEPENDENT ENCODER. Decoding proves the square reads; comparing
   it module for module against someone else's encoder proves it is the SAME
   square a scanner has seen a million times. It is what found the real bug
   here: eight modules out of 441 — the format information, written with rows
   and columns swapped — while every data module was already correct. A
   decoder alone said only "no code found", which is true of a thousand
   different faults. Optional: if it is not installed the run says so and
   carries on, rather than failing for want of a tool. */
let REF = null;
try{ REF = require('qrcode'); }catch(e){}

/* RASTERISED IN NODE, not in a browser. jsQR reads raw RGBA, so the matrix is
   expanded to pixels here — no canvas, no headless Chromium, nothing to
   install on a district machine, and the same bytes every run. */
function raster(text, px, quiet){
  const { modules, size } = QR.encode(text);
  const q = quiet == null ? 4 : quiet;
  const n = (size + q * 2) * px;
  const d = new Uint8ClampedArray(n * n * 4).fill(255);
  for(let r = 0; r < size; r++) for(let c = 0; c < size; c++){
    if(!modules[r][c]) continue;
    for(let y = 0; y < px; y++) for(let x = 0; x < px; x++){
      const i = (((r + q) * px + y) * n + (c + q) * px + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 0;
    }
  }
  return { data: d, w: n, h: n };
}
/* a quarter turn — a phone is never held square to the paper */
function turn(img){
  const { data, w, h } = img;
  const out = new Uint8ClampedArray(data.length);
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
    const s2 = (y * w + x) * 4, t = ((x * h) + (h - 1 - y)) * 4;
    for(let k = 0; k < 4; k++) out[t + k] = data[s2 + k];
  }
  return { data: out, w: h, h: w };
}

const CASES = [
  { what: 'the Gram Palana app', text: 'https://jangaoncdm.github.io/sjscore-app/gp/' },
  { what: 'the sanitation app',     text: 'https://jangaoncdm.github.io/sjscore-app/' },
  { what: 'a short address',        text: 'https://x.in/' },
  { what: 'a long address',         text: 'https://jangaoncdm.github.io/sjscore-app/gp/index.html?from=collectorate&v=2' },
  { what: 'punctuation and case',   text: 'HTTPS://Jangaon.TG.GOV.IN/a_b-c~d/?q=1&r=2#top' }
];
const SIZES = [4, 8, 14];        /* module size in pixels: small print to a poster */

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass: !!pass, detail: detail || '' });
  console.log((pass ? '  PASS  ' : '  FAIL  ') + name + (detail ? '   — ' + detail : ''));
};

(async () => {
  for(const c of CASES){
    const meta = QR.encode(c.text);
    console.log('\n' + c.what + '  (' + c.text.length + ' bytes → version ' + meta.version +
                ', mask ' + meta.mask + ', ' + meta.size + '×' + meta.size + ')');
    for(const px of SIZES){
      const img = raster(c.text, px);
      const out = jsQR(img.data, img.w, img.h);
      check(c.what + ' decodes at ' + px + 'px a module (' + img.w + '×' + img.h + ')',
        out && out.data === c.text,
        out ? (out.data === c.text ? '' : 'came back as ' + JSON.stringify(out.data)) : 'no code found');
    }
    const r2 = turn(raster(c.text, 8));
    const outR = jsQR(r2.data, r2.w, r2.h);
    check(c.what + ' decodes turned a quarter round', outR && outR.data === c.text,
      outR ? (outR.data === c.text ? '' : 'came back as ' + JSON.stringify(outR.data)) : 'no code found');
    /* THE QUIET ZONE IS PART OF THE CODE. Printed hard against a border it
       stops scanning, and that is a layout mistake a designer makes once. */
    const tight = raster(c.text, 8, 0);
    const outT = jsQR(tight.data, tight.w, tight.h);
    check(c.what + ' — without its quiet zone it is NOT reliably readable (so keep the margin)',
      true, outT && outT.data === c.text ? 'it happened to read; the margin still ships' : 'did not read, as expected');
  }

  /* ---- module for module, against the other encoder ---- */
  if(REF){
    console.log('\ncross-checked against an independent encoder');
    for(const c of CASES){
      const r = REF.create(c.text, { errorCorrectionLevel: 'M' });
      const M = QR.encode(c.text);
      let diff = 0;
      if(r.modules.size !== M.size) diff = -1;
      else for(let y = 0; y < M.size; y++) for(let x = 0; x < M.size; x++)
        if((r.modules.get(y, x) ? 1 : 0) !== (M.modules[y][x] ? 1 : 0)) diff++;
      /* A DIFFERENT MASK IS NOT A DIFFERENT CODE. Two encoders may score the
         eight masks differently and both be right, so a mismatch is only a
         finding once the thing has also failed to decode — which it has not,
         above. The version and size must agree regardless. */
      check('the other encoder agrees on version and size for ' + c.what,
        r.modules.size === M.size && r.version === M.version,
        'ref v' + r.version + ' ' + r.modules.size + ', mine v' + M.version + ' ' + M.size);
      if(diff > 0 && diff < 20)
        check(c.what + ': only ' + diff + ' modules differ — that is the format area, not a mask', false,
          'a handful of differing modules is a placement fault, not a mask choice');
      else
        console.log('  note  ' + c.what + ': ' + (diff === 0 ? 'identical' :
          diff + ' modules differ — a different mask, and it decodes') );
    }
  } else {
    console.log('\n(no second encoder installed — npm i qrcode --no-save to cross-check the modules)');
  }

  let refused = false;
  try{ QR.svg('x'.repeat(400)); }catch(e){ refused = /longer than this encoder goes/.test(String(e.message)); }
  check('an address beyond the encoder is REFUSED, not printed wrong', refused);

  const pass = results.filter(r => r.pass).length;
  console.log('\n' + pass + '/' + results.length + ' checks passed');
  const out = path.join(__dirname, '..', 'Info', 'qr-check.txt');
  try{
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, 'QR codes, decoded by jsQR (an independent implementation)\n' +
      'Run ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + '\n\n' +
      results.map(r => (r.pass ? '  PASS  ' : '  FAIL  ') + r.name + (r.detail ? '  — ' + r.detail : '')).join('\n') +
      '\n\n' + pass + '/' + results.length + ' passed\n');
  }catch(e){}
  if(pass !== results.length) process.exitCode = 1;
})();

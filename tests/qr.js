/* A QR ENCODER, BECAUSE A CODE NOBODY CAN CHECK IS WORSE THAN NO CODE.
   134 officers install the Gram Palana register by photographing a square.
   If that square is wrong they cannot install it, and nobody finds out from
   looking at it — a QR is unreadable to a person by design. So this is written
   here, in the open, and tests/qr-check.js decodes what it produces with an
   INDEPENDENT decoder and asserts the string comes back.

   Byte mode, error-correction level M (about 15% recoverable), versions 1 to 6
   — capacity 105 bytes, which is four times the longest address the district
   will ever print. Version 7 and up carry an extra version-information block
   and are deliberately out of scope: unused code that has never been decoded
   is exactly the kind of thing that fails on the one day it is needed.

   No dependency. Exported as a module and usable from the command line:
       node tests/qr.js "https://example.gov.in/" out.svg
*/
'use strict';

/* ---- the tables, level M, versions 1..6 ----
   [ total codewords, EC codewords per block, blocks in group 1, data
     codewords per block in group 1, blocks in group 2, per block in group 2 ] */
const RS_M = {
  1: [26, 10, 1, 16, 0, 0],
  2: [44, 16, 1, 28, 0, 0],
  3: [70, 26, 1, 44, 0, 0],
  4: [100, 18, 2, 32, 0, 0],
  5: [134, 24, 2, 43, 0, 0],
  6: [172, 16, 4, 27, 0, 0]
};
/* where the alignment pattern centres sit. Versions 2..6 carry one extra
   centre; version 1 carries none at all. */
const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34] };

/* ---- GF(256), the field the Reed–Solomon codewords live in ---- */
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for(let i = 0; i < 255; i++){
    EXP[i] = x; LOG[x] = i;
    x <<= 1;
    if(x & 0x100) x ^= 0x11d;          /* the QR generator polynomial */
  }
  for(let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

/* The generator polynomial for n error-correction codewords.
   IT IS BUILT LOW-TO-HIGH AND RETURNED HIGH-TO-LOW. Multiplying by (x + a^i)
   naturally fills index 0 with the CONSTANT term, and the synthetic division
   below needs index 0 to be the LEADING coefficient — which is 1, so that
   res[i] ^= 1*f cancels the term it is working on. Without the reverse the
   leading coefficient is a^(0+1+...+n-1) and every codeword comes out wrong:
   the spec's own worked example returned 123,166,70,... instead of
   165,36,212,... That is the whole of what tests/qr-check.js caught, and it
   would otherwise have been 134 officers holding a square that does not scan. */
function genPoly(n){
  let g = [1];
  for(let i = 0; i < n; i++){
    const next = new Array(g.length + 1).fill(0);
    for(let j = 0; j < g.length; j++){
      next[j] ^= mul(g[j], EXP[i]);
      next[j + 1] ^= g[j];
    }
    g = next;
  }
  return g.reverse();
}
function ecCodewords(data, n){
  const g = genPoly(n);
  const res = new Array(data.length + n).fill(0);
  data.forEach((d, i) => { res[i] = d; });
  for(let i = 0; i < data.length; i++){
    const f = res[i];
    if(!f) continue;
    for(let j = 0; j < g.length; j++) res[i + j] ^= mul(g[j], f);
  }
  return res.slice(data.length);
}

/* ---- the bit stream ---- */
function bitsFor(text){
  const bytes = Array.from(Buffer.from(String(text), 'utf8'));
  for(const v of [1, 2, 3, 4, 5, 6]){
    const [, ecw, g1, d1, g2, d2] = RS_M[v];
    const dataCW = g1 * d1 + g2 * d2;
    /* mode (4) + length (8, for versions 1..9) + the bytes */
    if(bytes.length + 2 <= dataCW) return { version: v, bytes: bytes, dataCW: dataCW, ecw: ecw };
  }
  throw new Error('That address is longer than this encoder goes (version 6, level M, 105 bytes). ' +
                  'Shorten it, or extend the table — and decode the result before printing it.');
}

function dataCodewords(text){
  const { version, bytes, dataCW, ecw } = bitsFor(text);
  const bits = [];
  const push = (val, len) => { for(let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  push(0b0100, 4);                 /* byte mode */
  push(bytes.length, 8);           /* character count, versions 1..9 */
  bytes.forEach(b => push(b, 8));
  /* terminator, then pad to a byte, then the two alternating pad bytes */
  for(let i = 0; i < 4 && bits.length < dataCW * 8; i++) bits.push(0);
  while(bits.length % 8) bits.push(0);
  const cw = [];
  for(let i = 0; i < bits.length; i += 8){
    let b = 0; for(let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    cw.push(b);
  }
  let pad = 0;
  while(cw.length < dataCW) cw.push(pad++ % 2 ? 0x11 : 0xec);
  return { version, ecw, cw };
}

/* ---- blocks, and the interleave ---- */
function finalCodewords(text){
  const { version, ecw, cw } = dataCodewords(text);
  const [, , g1, d1, g2, d2] = RS_M[version];
  const blocks = [];
  let at = 0;
  for(let i = 0; i < g1; i++){ blocks.push(cw.slice(at, at + d1)); at += d1; }
  for(let i = 0; i < g2; i++){ blocks.push(cw.slice(at, at + d2)); at += d2; }
  const ecs = blocks.map(b => ecCodewords(b, ecw));
  const out = [];
  const maxD = Math.max(...blocks.map(b => b.length));
  for(let i = 0; i < maxD; i++) blocks.forEach(b => { if(i < b.length) out.push(b[i]); });
  for(let i = 0; i < ecw; i++) ecs.forEach(e => out.push(e[i]));
  return { version, bytes: out };
}

/* ---- the matrix ---- */
function makeMatrix(version){
  const n = version * 4 + 17;
  const m = [], res = [];       /* res: a module the data may not be written to */
  for(let i = 0; i < n; i++){ m.push(new Array(n).fill(0)); res.push(new Array(n).fill(false)); }
  const put = (r, c, v) => { m[r][c] = v; res[r][c] = true; };

  const finder = (r, c) => {
    for(let i = -1; i <= 7; i++) for(let j = -1; j <= 7; j++){
      const rr = r + i, cc = c + j;
      if(rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      const on = (i >= 0 && i <= 6 && (j === 0 || j === 6)) ||
                 (j >= 0 && j <= 6 && (i === 0 || i === 6)) ||
                 (i >= 2 && i <= 4 && j >= 2 && j <= 4);
      put(rr, cc, on ? 1 : 0);
    }
  };
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);

  /* timing */
  for(let i = 8; i < n - 8; i++){ put(6, i, i % 2 ? 0 : 1); put(i, 6, i % 2 ? 0 : 1); }

  /* alignment — never over a finder */
  const cs = ALIGN[version];
  cs.forEach(r => cs.forEach(c => {
    if((r <= 8 && c <= 8) || (r <= 8 && c >= n - 9) || (r >= n - 9 && c <= 8)) return;
    for(let i = -2; i <= 2; i++) for(let j = -2; j <= 2; j++)
      put(r + i, c + j, (Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0)) ? 1 : 0);
  }));

  /* the dark module, and the format-information area reserved */
  put(n - 8, 8, 1);
  for(let i = 0; i <= 8; i++){ if(!res[8][i]) put(8, i, 0); if(!res[i][8]) put(i, 8, 0); }
  for(let i = 0; i < 8; i++){ if(!res[8][n - 1 - i]) put(8, n - 1 - i, 0); if(!res[n - 1 - i][8]) put(n - 1 - i, 8, 0); }
  return { m, res, n };
}

/* the zig-zag, right to left, skipping the timing column */
function placeData(m, res, n, bytes){
  let bit = 0;
  const total = bytes.length * 8;
  const at = i => (bytes[i >> 3] >> (7 - (i & 7))) & 1;
  let up = true;
  for(let col = n - 1; col > 0; col -= 2){
    if(col === 6) col--;                        /* the vertical timing line */
    for(let k = 0; k < n; k++){
      const row = up ? n - 1 - k : k;
      for(let c = 0; c < 2; c++){
        const cc = col - c;
        if(res[row][cc]) continue;
        m[row][cc] = bit < total ? at(bit) : 0;
        bit++;
      }
    }
    up = !up;
  }
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
];

/* format information: 5 bits (level + mask) with BCH(15,5) and the mask 0x5412 */
function formatBits(maskIdx){
  const ecBits = 0b00;                       /* level M */
  let v = (ecBits << 3) | maskIdx;
  let d = v << 10;
  for(let i = 4; i >= 0; i--) if(d & (1 << (i + 10))) d ^= 0b10100110111 << i;
  return ((v << 10) | d) ^ 0b101010000010010;
}
/* WHERE THE FIFTEEN FORMAT BITS GO. Two copies, and they do NOT run the same
   way round — which is the whole of what was wrong here. The first copy climbs
   the column beside the top-left finder and then runs left along row 8; the
   second runs right-to-left along row 8 from the top-right finder and then
   down the column above the bottom-left one. Written with rows and columns
   swapped, eight modules came out wrong out of 441 — every other module,
   including all the data, was already correct — and not one scanner could
   read the result, because the format bits are what tell it the mask. */
function putFormat(m, n, maskIdx){
  const f = formatBits(maskIdx);
  const bit = i => (f >> i) & 1;
  /* copy 1: bits 0-5 up the column, 6 and 7 at the corner, 8-14 along the row */
  for(let i = 0; i <= 5; i++) m[i][8] = bit(i);
  m[7][8] = bit(6); m[8][8] = bit(7); m[8][7] = bit(8);
  for(let i = 9; i <= 14; i++) m[8][14 - i] = bit(i);
  /* copy 2: bits 0-7 along the row from the right, 8-14 down the column */
  for(let i = 0; i <= 7; i++) m[8][n - 1 - i] = bit(i);
  for(let i = 8; i <= 14; i++) m[n - 15 + i][8] = bit(i);
  m[n - 8][8] = 1;                           /* the dark module stands */
}

function penalty(m, n){
  let p = 0;
  /* rule 1: runs of five or more */
  for(let i = 0; i < n; i++){
    for(const line of [m[i], m.map(r => r[i])]){
      let run = 1;
      for(let j = 1; j < n; j++){
        if(line[j] === line[j - 1]) run++;
        else { if(run >= 5) p += 3 + (run - 5); run = 1; }
      }
      if(run >= 5) p += 3 + (run - 5);
    }
  }
  /* rule 2: 2x2 blocks of one colour */
  for(let r = 0; r < n - 1; r++) for(let c = 0; c < n - 1; c++)
    if(m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1]) p += 3;
  /* rule 3: the finder-like 1:1:3:1:1 sequence */
  const pat1 = [1,0,1,1,1,0,1,0,0,0,0], pat2 = [0,0,0,0,1,0,1,1,1,0,1];
  const has = (line, i, pat) => pat.every((v, k) => line[i + k] === v);
  for(let i = 0; i < n; i++){
    const row = m[i], col = m.map(r => r[i]);
    for(let j = 0; j + 11 <= n; j++){
      if(has(row, j, pat1) || has(row, j, pat2)) p += 40;
      if(has(col, j, pat1) || has(col, j, pat2)) p += 40;
    }
  }
  /* rule 4: how far from half dark */
  let dark = 0;
  for(let r = 0; r < n; r++) for(let c = 0; c < n; c++) dark += m[r][c];
  p += Math.floor(Math.abs(dark * 100 / (n * n) - 50) / 5) * 10;
  return p;
}

/* ---- the whole thing ---- */
function encode(text){
  const { version, bytes } = finalCodewords(text);
  let best = null;
  for(let mi = 0; mi < 8; mi++){
    const { m, res, n } = makeMatrix(version);
    placeData(m, res, n, bytes);
    for(let r = 0; r < n; r++) for(let c = 0; c < n; c++)
      if(!res[r][c] && MASKS[mi](r, c)) m[r][c] ^= 1;
    putFormat(m, n, mi);
    const p = penalty(m, n);
    if(!best || p < best.p) best = { p, m, n, mask: mi };
  }
  return { modules: best.m, size: best.n, version, mask: best.mask };
}

/* an SVG of one path — no image, no font, nothing to fetch. It prints. */
function svg(text, opts){
  opts = opts || {};
  const q = opts.quiet == null ? 4 : opts.quiet;      /* the quiet zone is part of the code */
  const { modules, size } = encode(text);
  const total = size + q * 2;
  let d = '';
  for(let r = 0; r < size; r++) for(let c = 0; c < size; c++)
    if(modules[r][c]) d += 'M' + (c + q) + ' ' + (r + q) + 'h1v1h-1z';
  const px = opts.px || 8;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + total * px + '" height="' + total * px +
    '" viewBox="0 0 ' + total + ' ' + total + '" shape-rendering="crispEdges" role="img" aria-label="' +
    String(text).replace(/[&<>"]/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[ch])) + '">' +
    '<rect width="' + total + '" height="' + total + '" fill="#fff"/>' +
    '<path d="' + d + '" fill="#10121C"/></svg>';
}

module.exports = { encode, svg };

if(require.main === module){
  const text = process.argv[2];
  if(!text){ console.error('usage: node tests/qr.js "<text>" [out.svg]'); process.exit(1); }
  const out = svg(text);
  if(process.argv[3]){ require('fs').writeFileSync(process.argv[3], out); console.log('written: ' + process.argv[3]); }
  else process.stdout.write(out);
}

/* ============================================================================
   CHART HELPERS - shared by all ten mockups, so a chart looks identical
   whichever layout holds it.

   TWO RULES CARRIED OVER FROM THE CONSOLE, both paid for:
   1. Colours are TOKENS, never literals. A hardcoded hex is invisible on the
      dark card and nobody notices until the console is opened in front of the
      district. An SVG picks a token up through style="", because a
      presentation attribute cannot resolve a var().
   2. Charts are laid out at EXACT PIXEL SIZES, never in a scaled viewBox, so a
      ten-row chart and a three-row chart line up side by side.
   ========================================================================== */
(function(){
'use strict';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- area / line over time ---------- */
function area(rows, key, colour, w, h){
  w = w || 640; h = h || 190;
  const L = 34, R = 10, T = 12, B = 24;
  const iw = w - L - R, ih = h - T - B;
  const vals = rows.map(r => r[key]);
  const max = Math.max(10, Math.ceil(Math.max.apply(null, vals) / 25) * 25);
  const x = i => L + (rows.length < 2 ? iw / 2 : i * iw / (rows.length - 1));
  const y = v => T + ih - (v / max) * ih;
  const pts = rows.map((r, i) => x(i) + ',' + y(r[key]).toFixed(1));
  let g = '';
  for(let i = 0; i <= 4; i++){
    const gy = (T + ih - i * ih / 4).toFixed(1);
    g += `<line class="gridln" x1="${L}" y1="${gy}" x2="${w - R}" y2="${gy}"/>`
       + `<text class="axis" x="${L - 7}" y="${+gy + 3.5}" text-anchor="end">${Math.round(max * i / 4)}</text>`;
  }
  let ax = '';
  rows.forEach((r, i) => {
    const last = i === rows.length - 1;
    if(i % 3 !== 0 && !last) return;
    /* and a modulo tick sitting within 46px of the last one is dropped, or
       "8 Oct" and "9 Oct" print over each other at the right edge */
    if(!last && x(rows.length - 1) - x(i) < 46) return;
    /* the last tick is anchored to the end, or an eleven-character date is
       clipped to "11 Oc" by the right edge of the SVG */
    ax += `<text class="axis" x="${last ? w - R : x(i)}" y="${h - 7}"
      text-anchor="${last ? 'end' : i === 0 ? 'start' : 'middle'}">${esc(r.d)}</text>`; });
  const last = rows[rows.length - 1];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img"
    aria-label="${esc(key)} over the last ${rows.length} days">${g}
    <polygon points="${L},${T + ih} ${pts.join(' ')} ${x(rows.length - 1)},${T + ih}"
      style="fill:${colour};opacity:.13"/>
    <polyline points="${pts.join(' ')}" style="fill:none;stroke:${colour};stroke-width:2.2;
      stroke-linejoin:round;stroke-linecap:round"/>
    ${rows.map((r, i) => `<circle cx="${x(i)}" cy="${y(r[key]).toFixed(1)}" r="${i === rows.length - 1 ? 4 : 2.4}"
      style="fill:${colour}"/>`).join('')}
    <text class="axis" x="${x(rows.length - 1)}" y="${y(last[key]) - 9}" text-anchor="end"
      style="fill:var(--ch-ink);font-weight:700">${last[key]}</text>${ax}</svg>`;
}

/* ---------- grouped columns ---------- */
function columns(rows, series, w, h){
  w = w || 640; h = h || 210;
  /* B is deep enough for a rotated twelve-character mandal name: at 35° a
     90px label needs ~52px of vertical room, and the first build clipped
     "Devaruppula" to "-avaruppula" at the foot of the SVG. */
  const L = 34, R = 10, T = 12, B = 64;
  const iw = w - L - R, ih = h - T - B;
  const max = Math.max(1, Math.max.apply(null,
    rows.map(r => Math.max.apply(null, series.map(s => r[s.k])))));
  /* ONE SERIES IS A HISTOGRAM, NOT A GROUP. The 16px cap exists so that four
     grouped bars fit inside one slot; applied to a single series it draws
     thirteen pencils down the middle of a 1300px card and the shape of the
     morning - which is the whole point - is lost in the gaps. */
  const step = iw / rows.length;
  const bw = Math.min(series.length === 1 ? 54 : 16, (step - 10) / series.length);
  let g = '';
  for(let i = 0; i <= 4; i++){
    const gy = (T + ih - i * ih / 4).toFixed(1);
    g += `<line class="gridln" x1="${L}" y1="${gy}" x2="${w - R}" y2="${gy}"/>`
       + `<text class="axis" x="${L - 7}" y="${+gy + 3.5}" text-anchor="end">${Math.round(max * i / 4)}</text>`;
  }
  let b = '';
  rows.forEach((r, i) => {
    const cx = L + i * step + step / 2;
    series.forEach((s, si) => {
      const bh = (r[s.k] / max) * ih;
      const bx = cx - (series.length * bw) / 2 + si * bw;
      b += `<rect x="${bx.toFixed(1)}" y="${(T + ih - bh).toFixed(1)}" width="${(bw - 2).toFixed(1)}"
        height="${Math.max(0, bh).toFixed(1)}" rx="2" style="fill:${s.c}"><title>${esc(r.label)} ${esc(s.n)}: ${r[s.k]}</title></rect>`;
    });
    b += `<text class="axis" x="${cx}" y="${h - B + 16}" text-anchor="end"
      transform="rotate(-35 ${cx} ${h - B + 16})">${esc(r.label)}</text>`;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">${g}${b}</svg>`;
}

/* ---------- donut ---------- */
function donut(parts, total, caption, size){
  size = size || 150;
  const r = size / 2 - 11, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
  const sum = parts.reduce((a, p) => a + p.v, 0) || 1;
  let off = 0, seg = '';
  parts.forEach(p => {
    const len = p.v / sum * C;
    seg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" style="stroke:${p.c}"
      stroke-width="18" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}"
      stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"><title>${esc(p.k)}: ${p.v}</title></circle>`;
    off += len;
  });
  return `<div style="display:flex;gap:var(--s3);align-items:center;flex-wrap:wrap">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img"
      aria-label="${esc(caption)}">${seg}
      <text x="${cx}" y="${cy - 1}" text-anchor="middle" style="font:750 25px var(--mono);fill:var(--ch-ink)">${total}</text>
      <text x="${cx}" y="${cy + 15}" text-anchor="middle" class="axis" style="letter-spacing:.08em">${esc(caption).toUpperCase()}</text>
    </svg>
    <div style="flex:1;min-width:132px">${parts.map(p =>
      `<div style="display:flex;align-items:center;gap:7px;font-size:var(--f-small);margin:6px 0">
        <i style="width:10px;height:10px;border-radius:3px;background:${p.c};flex:none"></i>
        <span style="flex:1;color:var(--tx-2)">${esc(p.k)}</span>
        <b style="font-family:var(--mono)">${p.v}</b>
        <span style="width:36px;text-align:right;color:var(--tx-3);font-family:var(--mono)">${Math.round(p.v / sum * 100)}%</span>
      </div>`).join('')}</div></div>`;
}

/* ---------- meter: a ratio against a limit is a METER, never a two-slice ring ---- */
function meter(v, max, label, sub){
  const p = Math.max(0, Math.min(100, v / max * 100));
  const col = p >= 80 ? 'var(--st-ok)' : p >= 60 ? 'var(--st-warn)' : 'var(--st-bad)';
  return `<div>
    <div style="display:flex;align-items:baseline;gap:var(--s1)">
      <b style="font:750 var(--f-metric-lg)/1 var(--mono)">${v}</b>
      <span style="font-size:var(--f-small);color:var(--tx-3)">out of ${max} · ${esc(label)}</span></div>
    <div class="bar" style="height:11px;margin-top:11px;border-radius:6px">
      <i style="width:${p}%;background:${col}"></i></div>
    ${sub ? `<div style="font-size:var(--f-micro);color:var(--tx-3);margin-top:7px">${esc(sub)}</div>` : ''}
  </div>`;
}

/* ---------- sparkline, for a table cell ---------- */
function spark(vals, colour, w, h){
  w = w || 72; h = h || 22;
  const max = Math.max.apply(null, vals) || 1, min = Math.min.apply(null, vals);
  const rg = (max - min) || 1;
  const pts = vals.map((v, i) => (i * w / (vals.length - 1)).toFixed(1) + ',' +
    (h - 2 - ((v - min) / rg) * (h - 4)).toFixed(1));
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"
    style="display:inline-block;vertical-align:middle"><polyline points="${pts.join(' ')}"
    style="fill:none;stroke:${colour || 'var(--cs1)'};stroke-width:1.6;stroke-linejoin:round"/></svg>`;
}

/* ---------- ordered scale: ONE hue light to dark, never a rainbow ---------- */
const ORD = ['var(--co1)','var(--co2)','var(--co3)','var(--co4)','var(--co5)'];
function heat(rows, cols, get, rowLabel, colLabel){
  let h = `<div class="twrap"><table><thead><tr><th>${esc(rowLabel)}</th>`
    + cols.map(c => `<th>${esc(c)}</th>`).join('') + `</tr></thead><tbody>`;
  rows.forEach(r => {
    h += `<tr><td>${esc(r.label)}</td>` + cols.map((c, ci) => {
      const v = get(r, c, ci);
      const band = v == null ? -1 : Math.min(4, Math.floor(v / 25));
      return `<td class="num" style="background:${v == null ? 'transparent' : ORD[band]};
        color:${band >= 3 ? '#fff' : 'var(--tx)'}">${v == null ? '—' : v}</td>`;
    }).join('') + `</tr>`;
  });
  return h + `</tbody></table></div>`;
}

/* ---------- a schematic district: twelve mandals, no tiles, no network ------
   A real choropleth needs a boundary file this repository does not carry and
   a tile server a district network blocks. A TILE MAP says the same thing
   about twelve units and says it at any bandwidth: one cell per mandal,
   shaded by the measure, named in full. */
function tilemap(cells, caption){
  return `<div>
    <div class="tilemap">
      ${cells.map(c => {
        const band = Math.min(4, Math.floor(c.v / 25));
        return `<button class="tile" style="background:${ORD[band]};color:${band >= 3 ? '#fff' : 'var(--tx)'}"
          title="${esc(c.label)}: ${c.v}% · ${esc(c.sub || '')}">
          <b>${esc(c.short || c.label)}</b><span style="color:${band >= 3 ? 'rgba(255,255,255,.82)' : 'var(--tx-2)'}">${c.v}%</span>
        </button>`; }).join('')}
    </div>
    <div class="legend" style="justify-content:space-between">
      <span>${esc(caption)}</span>
      <span style="display:flex;align-items:center;gap:5px">0%
        ${ORD.map(c => `<i style="background:${c};width:18px;height:10px;border-radius:2px;margin:0"></i>`).join('')}
      100%</span></div></div>`;
}


/* ============================================================================
   SIX MORE FORMS. Each is here because a question this register actually asks
   is answered badly by the forms above, not because a chart library has them.
   prompt/dashboard-charts-prompt.md carries the method; the short version is
   that the form follows the data's job.
   ========================================================================== */

/* ---------- line: several series over time, AND the days the office shut ---
   THE LIVE CONSOLE DRAWS FOURTEEN CALENDAR DAYS AND DRAWS THEM ALL THE SAME.
   backend/Code.gs:4402 builds the window by counting back fourteen days, and
   app/dashboard.html:2093 plots every one of them identically, so "District
   activity - last 14 days" dives to nothing twice a fortnight and reads as a
   collapse. The nought is TRUE - the attendance gate does not open on a
   Sunday - but a chart that does not say which days were working days is
   asking the reader to carry the calendar in his head, and on a week with a
   General Holiday it is three cliffs, not two. The shut days are banded and
   the line BREAKS across them: a line drawn through a day nobody worked
   invents a reading, which is the same fault as the spline the console
   already took out. */
function line(rows, series, w, h, opts){
  w = w || 640; h = h || 200; opts = opts || {};
  const shut = opts.shut || (r => r.sun);
  const L = 36, R = 12, T = 14, B = 30;
  const iw = w - L - R, ih = h - T - B;
  const all = [];
  rows.forEach(r => series.forEach(s => { if(r[s.k] != null && !shut(r)) all.push(r[s.k]); }));
  const max = opts.max || Math.max(10, Math.ceil(Math.max.apply(null, all.concat([1])) / 25) * 25);
  const min = opts.min || 0;
  const x = i => L + (rows.length < 2 ? iw / 2 : i * iw / (rows.length - 1));
  const y = v => T + ih - ((v - min) / (max - min)) * ih;

  let band = '';
  rows.forEach((r, i) => {
    if(!shut(r)) return;
    const half = rows.length < 2 ? iw / 2 : iw / (rows.length - 1) / 2;
    band += `<rect x="${(x(i) - half).toFixed(1)}" y="${T}" width="${(half * 2).toFixed(1)}"
      height="${ih}" style="fill:var(--ch-grid);opacity:.55"><title>${esc(r.d)} - the office was shut</title></rect>`;
  });
  let g = '';
  for(let i = 0; i <= 4; i++){
    const gy = (T + ih - i * ih / 4).toFixed(1);
    g += `<line class="gridln" x1="${L}" y1="${gy}" x2="${w - R}" y2="${gy}"/>`
       + `<text class="axis" x="${L - 7}" y="${+gy + 3.5}" text-anchor="end">${Math.round(min + (max - min) * i / 4)}</text>`;
  }
  let pl = '';
  series.forEach(s => {
    /* BREAK the line rather than bridging a day nobody worked */
    let run = [], segs = [];
    rows.forEach((r, i) => {
      if(shut(r) || r[s.k] == null){ if(run.length) segs.push(run); run = []; return; }
      run.push(x(i) + ',' + y(r[s.k]).toFixed(1));
    });
    if(run.length) segs.push(run);
    segs.forEach(sg => {
      if(s.area && sg.length > 1){
        const x0 = sg[0].split(',')[0], x1 = sg[sg.length - 1].split(',')[0];
        pl += `<polygon points="${x0},${T + ih} ${sg.join(' ')} ${x1},${T + ih}"
          style="fill:${s.c};opacity:.12"/>`;
      }
      pl += `<polyline points="${sg.join(' ')}" style="fill:none;stroke:${s.c};stroke-width:2.2;
        stroke-linejoin:round;stroke-linecap:round"/>`;
    });
    rows.forEach((r, i) => {
      if(shut(r) || r[s.k] == null) return;
      pl += `<circle cx="${x(i)}" cy="${y(r[s.k]).toFixed(1)}" r="2.6" style="fill:${s.c}">
        <title>${esc(r.d)} ${esc(s.n)}: ${r[s.k]}</title></circle>`;
    });
  });
  /* EVERY POINT IS LABELLED WHEN THERE ARE FEW ENOUGH TO LABEL. The modulo
     was written for a fortnight; applied to six reporting months it printed
     May, Aug and Oct and left the reader counting the gaps. */
  const every = rows.length <= 8 ? 1 : 3;
  let ax = '';
  rows.forEach((r, i) => {
    const last = i === rows.length - 1;
    if(i % every !== 0 && !last) return;
    if(!last && every > 1 && x(rows.length - 1) - x(i) < 46) return;
    ax += `<text class="axis" x="${last ? w - R : x(i)}" y="${h - 9}"
      text-anchor="${last ? 'end' : i === 0 ? 'start' : 'middle'}">${esc(r.d)}</text>`; });
  /* A BAND NOBODY EXPLAINED IS A SMUDGE. If any day is banded the key says
     so, however few series there are - the band is the whole point of the
     chart and it is the one mark on it a reader has never seen before. */
  const anyShut = rows.some(shut);
  const leg = (series.length > 1 || anyShut || opts.legend)
    ? `<div class="legend">${series.map(s => `<span><i style="background:${s.c}"></i>${esc(s.n)}</span>`).join('')}
       ${anyShut ? '<span><i style="background:var(--ch-grid)"></i>office shut, no mark due</span>' : ''}</div>` : '';
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img"
    aria-label="${esc(series.map(s => s.n).join(', '))} over ${rows.length} days">
    ${band}${g}${pl}${ax}</svg>${leg}`;
}

/* ---------- stacked columns: the COMPOSITION of a day ----------------------
   Present, on leave and not marked are parts of one roll, not three
   independent series. Three lines make the reader add them up; one column
   per day shows the whole roll and the shape of the part that matters. */
function stack(rows, series, w, h, opts){
  w = w || 640; h = h || 200; opts = opts || {};
  const L = 36, R = 12, T = 14, B = 30;
  const iw = w - L - R, ih = h - T - B;
  const tot = r => series.reduce((a, s) => a + (r[s.k] || 0), 0);
  const max = Math.max(1, Math.ceil(Math.max.apply(null, rows.map(tot)) / 25) * 25);
  const step = iw / rows.length, bw = Math.min(26, step - 5);
  let g = '';
  for(let i = 0; i <= 4; i++){
    const gy = (T + ih - i * ih / 4).toFixed(1);
    g += `<line class="gridln" x1="${L}" y1="${gy}" x2="${w - R}" y2="${gy}"/>`
       + `<text class="axis" x="${L - 7}" y="${+gy + 3.5}" text-anchor="end">${Math.round(max * i / 4)}</text>`;
  }
  let b = '';
  rows.forEach((r, i) => {
    const cx = L + i * step + step / 2;
    if(tot(r) === 0){
      b += `<text class="axis" x="${cx}" y="${T + ih - 5}" text-anchor="middle"
        style="opacity:.75">shut</text>`;
    }
    let acc = 0;
    series.forEach(s => {
      const v = r[s.k] || 0; if(!v) return;
      const bh = v / max * ih;
      b += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${(T + ih - acc - bh).toFixed(1)}"
        width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" style="fill:${s.c}">
        <title>${esc(r.d)} ${esc(s.n)}: ${v}</title></rect>`;
      acc += bh;
    });
  });
  let ax = '';
  rows.forEach((r, i) => {
    const last = i === rows.length - 1;
    if(i % 3 !== 0 && !last) return;
    const cx = L + i * step + step / 2;
    if(!last && (L + (rows.length - 1) * step + step / 2) - cx < 46) return;
    ax += `<text class="axis" x="${cx}" y="${h - 9}" text-anchor="middle">${esc(r.d)}</text>`; });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">${g}${b}${ax}</svg>
    <div class="legend">${series.map(s =>
      `<span><i style="background:${s.c}"></i>${esc(s.n)}</span>`).join('')}</div>`;
}

/* ---------- one stacked bar, laid ACROSS -----------------------------------
   A single composition - four grades over one month - drawn as a vertical
   stacked column is a 26px sliver standing in the middle of a 600px card,
   and it reads worse than the ring it was meant to replace. Laid across, it
   uses the width the card actually has, the segments share one baseline, and
   the figures sit under them where they are read. */
function stackbar(parts, w, opts){
  opts = opts || {};
  w = w || 520;
  const H = opts.h || 44;
  const sum = parts.reduce((a, p) => a + p.v, 0) || 1;
  let x = 0, seg = '';
  parts.forEach((p, i) => {
    const pw = p.v / sum * w;
    seg += `<rect x="${x.toFixed(1)}" y="0" width="${Math.max(0, pw - (i < parts.length - 1 ? 1.5 : 0)).toFixed(1)}"
      height="${H}" style="fill:${p.c}"><title>${esc(p.k)}: ${p.v} (${Math.round(p.v / sum * 100)}%)</title></rect>`;
    /* the figure goes INSIDE the segment when it fits, and the key carries it
       when it does not - never half out over the next colour */
    if(pw > 42) seg += `<text x="${(x + pw / 2).toFixed(1)}" y="${H / 2 + 5}" text-anchor="middle"
      style="font:750 13px var(--mono);fill:#fff">${p.v}</text>`;
    x += pw;
  });
  return `<svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" role="img"
    aria-label="${esc(opts.label || 'composition')}" style="border-radius:var(--r-sm)">${seg}</svg>
    <div class="legend">${parts.map(p =>
      `<span><i style="background:${p.c}"></i>${esc(p.k)} <b style="font-family:var(--mono)">${p.v}</b>
       <span style="color:var(--tx-3)">${Math.round(p.v / sum * 100)}%</span></span>`).join('')}</div>`;
}

/* ---------- dumbbell: two readings of the same unit, and the gap -----------
   "Chilpur is at 50%" is half a fact. A dumbbell puts last month and this
   month on one row and makes the LENGTH of the connector the thing you read,
   which is the question a review actually asks. Sorted by the movement, not
   by the name: an alphabetical list of changes hides the changes. */
function dumbbell(rows, w, h, opts){
  opts = opts || {};
  const lw = opts.labelW || 118, R = 44;
  w = w || 520;
  const rh = 26, T = 22;
  h = h || (rows.length * rh + T + 14);
  const iw = w - lw - R;
  const max = opts.max || 100;
  const x = v => lw + (v / max) * iw;
  let g = '';
  for(let i = 0; i <= 4; i++){
    const gx = (lw + i * iw / 4).toFixed(1);
    g += `<line class="gridln" x1="${gx}" y1="${T - 8}" x2="${gx}" y2="${T + rows.length * rh - 10}"/>`
       + `<text class="axis" x="${gx}" y="${T - 12}" text-anchor="middle">${Math.round(max * i / 4)}</text>`;
  }
  let b = '';
  rows.forEach((r, i) => {
    const cy = T + i * rh + 4;
    const up = r.b >= r.a;
    const col = up ? 'var(--st-ok)' : 'var(--st-bad)';
    b += `<text class="axis" x="${lw - 9}" y="${cy + 4}" text-anchor="end"
        style="fill:var(--ch-ink);font-family:var(--sans);font-size:var(--f-small)">${esc(r.label)}</text>
      <line x1="${x(r.a).toFixed(1)}" y1="${cy}" x2="${x(r.b).toFixed(1)}" y2="${cy}"
        style="stroke:${col};stroke-width:3;stroke-linecap:round;opacity:.5"/>
      <circle cx="${x(r.a).toFixed(1)}" cy="${cy}" r="4.5" style="fill:var(--ch-surface);
        stroke:var(--st-idle);stroke-width:2"><title>${esc(r.label)} ${esc(opts.aName || 'before')}: ${r.a}</title></circle>
      <circle cx="${x(r.b).toFixed(1)}" cy="${cy}" r="5" style="fill:${col}">
        <title>${esc(r.label)} ${esc(opts.bName || 'now')}: ${r.b}</title></circle>
      <text class="axis" x="${w - 7}" y="${cy + 4}" text-anchor="end"
        style="fill:${col};font-weight:700">${up ? '+' : ''}${r.b - r.a}</text>`;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">${g}${b}</svg>
    <div class="legend"><span><i style="background:var(--st-idle)"></i>${esc(opts.aName || 'before')}</span>
      <span><i style="background:var(--st-ok)"></i>${esc(opts.bName || 'now')}, up</span>
      <span><i style="background:var(--st-bad)"></i>${esc(opts.bName || 'now')}, down</span></div>`;
}

/* ---------- bullet: actual against WHAT WAS DUE, which is not the total ----
   The house rule is that a ratio against a limit is a meter. A bullet is that
   meter with the limit drawn on it: the bar is what is filed, the tick is
   what the schedule says should be filed BY TODAY, and the pale track is the
   whole mandal. Reading 3 of 6 against 6 says a mandal is halfway; reading it
   against the 4 that were due says it is one behind, which is the fact the
   Collector acts on. */
function bullet(rows, w, h, opts){
  opts = opts || {};
  const lw = opts.labelW || 118, R = 54;
  w = w || 520;
  const rh = 26, T = 10;
  h = h || (rows.length * rh + T + 8);
  const iw = w - lw - R;
  let b = '';
  rows.forEach((r, i) => {
    const cy = T + i * rh;
    const mx = Math.max(r.total, r.due, r.v) || 1;
    const bw = v => (v / mx) * iw;
    const behind = r.v < r.due;
    b += `<text class="axis" x="${lw - 9}" y="${cy + 12}" text-anchor="end"
        style="fill:var(--ch-ink);font-family:var(--sans);font-size:var(--f-small)">${esc(r.label)}</text>
      <rect x="${lw}" y="${cy + 3}" width="${bw(r.total).toFixed(1)}" height="14" rx="3"
        style="fill:var(--ch-grid)"><title>${esc(r.label)}: ${r.total} villages in all</title></rect>
      <rect x="${lw}" y="${cy + 3}" width="${bw(r.v).toFixed(1)}" height="14" rx="3"
        style="fill:${behind ? 'var(--st-warn)' : 'var(--st-ok)'}">
        <title>${esc(r.label)}: ${r.v} filed</title></rect>
      <line x1="${(lw + bw(r.due)).toFixed(1)}" y1="${cy}" x2="${(lw + bw(r.due)).toFixed(1)}"
        y2="${cy + 20}" style="stroke:var(--ch-ink);stroke-width:2.4">
        <title>${r.due} due by today</title></line>
      <text class="axis" x="${w - 7}" y="${cy + 14}" text-anchor="end"
        style="fill:${behind ? 'var(--st-warn)' : 'var(--st-ok)'};font-weight:700">${r.v}/${r.due}</text>`;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">${b}</svg>
    <div class="legend"><span><i style="background:var(--st-ok)"></i>filed and on pace</span>
      <span><i style="background:var(--st-warn)"></i>filed but behind</span>
      <span><i style="background:var(--ch-ink);width:3px;height:14px;border-radius:0"></i>due by today</span>
      <span><i style="background:var(--ch-grid)"></i>the whole mandal</span></div>`;
}

/* ---------- small multiples: twelve mandals, one fortnight each ------------
   Twelve lines on one axis is a plate of spaghetti and twelve tabs is twelve
   clicks. Twelve SMALL charts on one identical scale is the comparison, and
   the eye finds the odd one out without reading a single figure. The scale is
   shared deliberately: a sparkline normalised to its own range makes a flat
   mandal look as dramatic as a collapsing one. */
function sparkgrid(cells, w, opts){
  opts = opts || {};
  /* EXACT PIXELS, NOT A STRETCHED viewBox. The first cut drew each cell at
     132x40 with preserveAspectRatio="none" and let the grid stretch it, which
     is precisely the scaled viewBox the house rule forbids: the horizontal
     scale then differs from the vertical one and every slope on the screen is
     a lie about its own steepness. The grid is measured, the cell width is
     worked out from it, and each chart is drawn at that width. */
  w = w || 960;
  const gap = 8;
  const cols = w >= 760 ? 4 : w >= 520 ? 3 : 2;
  const CW = Math.max(96, Math.floor((w - gap * (cols - 1)) / cols));
  const W = CW - 18, H = 40;
  return `<div class="sparkgrid" style="grid-template-columns:repeat(${cols},${CW}px)">${cells.map(c => {
    const vals = c.vals;
    const seen = vals.filter(v => v != null);
    const lastV = seen.length ? seen[seen.length - 1] : null;
    const col = lastV == null ? 'var(--st-idle)'
      : lastV >= (opts.ok != null ? opts.ok : 92) ? 'var(--st-ok)'
      : lastV >= (opts.warn != null ? opts.warn : 82) ? 'var(--st-warn)' : 'var(--st-bad)';
    const min = opts.min != null ? opts.min : 60, max = opts.max != null ? opts.max : 100;
    let run = [], segs = [];
    vals.forEach((v, i) => {
      if(v == null){ if(run.length) segs.push(run); run = []; return; }
      run.push((4 + i * (W - 8) / (vals.length - 1)).toFixed(1) + ',' +
        (H - 5 - ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * (H - 12)).toFixed(1));
    });
    if(run.length) segs.push(run);
    return `<div class="spk">
      <div class="spkh"><b>${esc(c.label)}</b><span style="color:${col}">${lastV == null ? '—' : lastV + '%'}</span></div>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <line class="gridln" x1="0" y1="${H - 5 - ((((opts.ok != null ? opts.ok : 92)) - min) / (max - min)) * (H - 12)}"
          x2="${W}" y2="${H - 5 - ((((opts.ok != null ? opts.ok : 92)) - min) / (max - min)) * (H - 12)}"
          style="stroke-dasharray:3 3"/>
        ${segs.map(sg => `<polyline points="${sg.join(' ')}" style="fill:none;stroke:${col};
          stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round"/>`).join('')}
      </svg></div>`; }).join('')}</div>
    <div class="legend"><span>one fortnight per mandal, all on the same ${opts.min != null ? opts.min : 60}&ndash;${opts.max != null ? opts.max : 100}% scale &middot; the dashed line is ${opts.ok != null ? opts.ok : 92}%</span></div>`;
}

/* ---------- lollipop: twelve ranked magnitudes ----------------------------
   A ranked list of twelve is read down the LABELS, and a full bar puts a
   great deal of ink between the name and the figure that ends it. A stem and
   a dot carry the same length with a tenth of the ink, which is Tufte's point
   and is also simply easier to scan on a weak monitor. */
function lollipop(rows, w, h, opts){
  opts = opts || {};
  const lw = opts.labelW || 118, R = 46;
  w = w || 520;
  const rh = 24, T = 20;
  h = h || (rows.length * rh + T + 10);
  const iw = w - lw - R;
  const max = opts.max || Math.max.apply(null, rows.map(r => r.v).concat([1]));
  let g = '';
  for(let i = 0; i <= 4; i++){
    const gx = (lw + i * iw / 4).toFixed(1);
    g += `<line class="gridln" x1="${gx}" y1="${T - 7}" x2="${gx}" y2="${T + rows.length * rh - 12}"/>`
       + `<text class="axis" x="${gx}" y="${T - 11}" text-anchor="middle">${Math.round(max * i / 4)}</text>`;
  }
  let b = '';
  rows.forEach((r, i) => {
    const cy = T + i * rh + 3;
    const cx = lw + (r.v / max) * iw;
    const col = r.c || 'var(--cs1)';
    b += `<text class="axis" x="${lw - 9}" y="${cy + 4}" text-anchor="end"
        style="fill:var(--ch-ink);font-family:var(--sans);font-size:var(--f-small)">${esc(r.label)}</text>
      <line x1="${lw}" y1="${cy}" x2="${cx.toFixed(1)}" y2="${cy}"
        style="stroke:${col};stroke-width:2;opacity:.42"/>
      <circle cx="${cx.toFixed(1)}" cy="${cy}" r="5" style="fill:${col}">
        <title>${esc(r.label)}: ${r.v}${esc(opts.unit || '')}</title></circle>
      <text class="axis" x="${w - 7}" y="${cy + 4}" text-anchor="end"
        style="fill:var(--ch-ink);font-weight:700">${esc(r.right != null ? r.right : r.v + (opts.unit || ''))}</text>`;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">${g}${b}</svg>`;
}

/* ---------- fit: render a chart at the container's EXACT pixel width -------
   The house rule is that charts are laid out at exact pixel sizes and never in
   a scaled viewBox, so a ten-row chart and a three-row chart line up side by
   side. A fixed pixel width is also how a 660px chart pushes a 390px phone
   sideways by 302, which is what the render check caught on the first build.
   Both are satisfied by MEASURING the container and drawing at that size:
   still exact pixels, never a scale transform, and it survives a resize and a
   theme switch. Charts registered here redraw on both. */
const _fits = [];
function fit(elOrId, draw, height){
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if(!el) return;
  _fits.push({ el, draw, height });
  _paint({ el, draw, height });
}
function _paint(f){
  const w = Math.max(240, Math.floor(f.el.clientWidth));
  f.el.innerHTML = f.draw(w, f.height);
}
function redraw(){ _fits.forEach(_paint); }
let _t;
window.addEventListener('resize', () => { clearTimeout(_t); _t = setTimeout(redraw, 120); });

window.CH = { area, columns, donut, meter, spark, heat, tilemap,
  line, stack, stackbar, dumbbell, bullet, sparkgrid, lollipop,
  esc, ORD, fit, redraw };
})();

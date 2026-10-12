/* WHICH MARKS WERE NEVER MEASURED — a reading of the attendance register for
   proxied (mock) locations, from a copy of the register taken off Drive.

   Usage:  node tests/mock-location-report.js <register.xlsx|attendance.csv> [days]

   It reads the Attendance tab of a register workbook (the nightly backup, a
   File > Download of the Sheet, or a CSV of the tab), looks back `days`
   calendar days (default 30), and writes Info/mock-location/REPORT.md.

   THE SIGNALS, AND WHY EACH ONE IS EVIDENCE AND NOT A VERDICT.

   1. THE SAME COORDINATE ON TWO DIFFERENT MORNINGS. A satellite fix is a
      measurement with noise in it: a phone held in the same spot on two days
      returns two readings a few metres apart, with different trailing
      decimals. A mock-location app returns the point that was typed into it,
      byte for byte, every time. So two dates sharing a coordinate to six
      decimals (about 11 cm) is a reading that was never measured — PROVIDED
      the handset claimed satellite precision. A wifi fix is the centroid of
      the access points in view and repeats honestly, but it says so: its
      accuracy is coarse. The combination that does not occur in nature is a
      byte-identical coordinate WITH a claimed accuracy under 60 m.

   2. THE SPREAD OF A MAN'S FIXES OVER A FORTNIGHT. Even without exact
      repeats, every honest officer's marks scatter by the width of his
      office and the day's satellite geometry. A set of fine fixes all inside
      three metres of each other for a week is the same signal as 1, softer.

   3. A COORDINATE WITH TOO FEW DECIMALS. A handset reports six or seven
      decimals. 17.65 and 79.2 were typed by a person.

   4. THE SAME COORDINATE UNDER TWO DIFFERENT OFFICERS on the same day. One
      handset, or one typed point, marking for two men. The timestamps say
      whether it was the same hand.

   5. A CONSTANT CLAIMED ACCURACY. A real receiver's accuracy figure moves
      with the sky — 8 m, 13 m, 31 m. Mock apps report the one figure they
      were configured with, so an officer whose every fix claims exactly the
      same accuracy to the metre is reporting a setting, not a measurement.

   6. THE LAST DIGIT. Over many honest fixes the final decimal is close to
      uniform over 0–9. A column of coordinates ending in the same digit, or
      in 0, is a column that was written and not read.

   NONE OF THIS IS A CHARGE. An officer who shares a phone with a colleague,
   or whose handset falls back to a saved fix, produces some of these shapes
   honestly. The report prints the evidence, the dates and the figures, and
   says what each looks like; whether it is a default under the Conduct Rules
   is read by the Collector on the facts (rule 10). Nothing here writes
   anything to the register. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');

/* FINE_ACC_M is the line between a satellite claim and a wifi one. Google's
   network positioning hands back the centroid of the access points in view,
   and it repeats byte for byte for everyone standing in the same office —
   with a claimed accuracy of twenty to sixty metres, not two kilometres. So
   sixty metres lets a wifi fix through as "fine", and an office full of
   honest staff reads as a shared typed point. Fifteen metres is a figure a
   wifi fix does not claim and a satellite in the open does. Set it from the
   environment to read the register both ways. */
const FINE_ACC_M = Number(process.env.FINE_ACC_M) > 0 ? Number(process.env.FINE_ACC_M) : 15;
const TIGHT_M = 3, MIN_DAYS = 3, SHARE_MIN = 1;

/* ---------------------------------------------------------------- reading */
function readWorkbook(file){
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mockloc-'));
  execFileSync('unzip', ['-o', '-q', file, '-d', tmp]);
  const un = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, '&');
  const strip = s => un(String(s).replace(/<[^>]+>/g, ''));
  let sst = [];
  const sstFile = path.join(tmp, 'xl', 'sharedStrings.xml');
  if(fs.existsSync(sstFile))
    sst = (fs.readFileSync(sstFile, 'utf8').match(/<si>[\s\S]*?<\/si>/g) || []).map(strip);
  const wb = fs.readFileSync(path.join(tmp, 'xl', 'workbook.xml'), 'utf8');
  const names = [...wb.matchAll(/<sheet[^>]*name="([^"]+)"/g)].map(m => un(m[1]));
  /* sheet files are named by relationship id, not by order, in a workbook
     that has had tabs moved — read the rels rather than counting */
  let rels = {};
  try{
    const rx = fs.readFileSync(path.join(tmp, 'xl', '_rels', 'workbook.xml.rels'), 'utf8');
    [...rx.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].forEach(m => { rels[m[1]] = m[2]; });
    [...rx.matchAll(/<Relationship[^>]*Target="([^"]+)"[^>]*Id="([^"]+)"/g)].forEach(m => { rels[m[2]] = m[1]; });
  }catch(e){}
  const rids = [...wb.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].map(m => [un(m[1]), m[2]]);
  const sheets = {};
  rids.forEach(([n, rid], i) => {
    let f = rels[rid] ? path.join(tmp, 'xl', rels[rid].replace(/^\/xl\//, '')) : null;
    if(!f || !fs.existsSync(f)) f = path.join(tmp, 'xl', 'worksheets', 'sheet' + (i + 1) + '.xml');
    if(!fs.existsSync(f)) return;
    const x = fs.readFileSync(f, 'utf8');
    sheets[n] = (x.match(/<row[^>]*>[\s\S]*?<\/row>/g) || []).map(r => {
      const cell = {};
      /* attributes matched lazily: a self-closing empty cell otherwise
         swallows the next cell's contents (the 04.10.2026 lesson) */
      for(const m of r.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
        const col = m[1], attr = m[2] || '', inner = m[3] || '';
        const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        const is = (inner.match(/<is>([\s\S]*?)<\/is>/) || [])[1];
        if(/t="s"/.test(attr) && v !== undefined) cell[col] = sst[+v];
        else if(is !== undefined) cell[col] = strip(is);
        else if(v !== undefined) cell[col] = v;
      }
      return cell;
    });
  });
  fs.rmSync(tmp, { recursive:true, force:true });
  return { names, sheets };
}
const colN = c => { let n = 0; for(const ch of c) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
const toRows = cells => cells.map(c => { const r = []; Object.keys(c).forEach(k => { r[colN(k)] = c[k]; }); return r; });

function readCsv(file){
  const txt = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const rows = [], re = /("([^"]|"")*"|[^,\r\n]*)(,|\r?\n|$)/g;
  let row = [], m;
  while((m = re.exec(txt)) && m[0] !== ''){
    row.push(m[1].startsWith('"') ? m[1].slice(1, -1).replace(/""/g, '"') : m[1]);
    if(m[3] !== ','){ rows.push(row); row = []; }
    if(m.index + m[0].length >= txt.length) break;
  }
  return rows;
}

/* an Excel serial or an ISO string, read as a day; Sheets stores typed
   dates as numbers in an .xlsx export (rule 3) */
function dayOf(v){
  if(v == null || v === '') return '';
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(iso) return iso[0];
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if(dmy) return dmy[3] + '-' + dmy[2].padStart(2, '0') + '-' + dmy[1].padStart(2, '0');
  const n = Number(s);
  if(isFinite(n) && n > 30000 && n < 80000){
    const d = new Date(Math.round((n - 25569) * 86400000));
    return d.toISOString().slice(0, 10);
  }
  return '';
}
/* a phone stored as a number comes out of an .xlsx as 8.01963139E9, which
   loses its last digit to the exponent if read as text */
const phone10 = s => { let t = String(s == null ? '' : s).trim();
  if(/^\d(\.\d+)?E\+?\d+$/i.test(t)) t = String(Math.round(Number(t)));
  const d = t.replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; };
const decimals = s => { const t = String(s); const i = t.indexOf('.'); return i < 0 ? 0 : t.length - i - 1; };
function metres(aLat, aLng, bLat, bLng){
  const R = 6371000, rad = Math.PI / 180;
  const dLa = (bLat - aLat) * rad, dLn = (bLng - aLng) * rad;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLn / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
const median = xs => { const a = xs.slice().sort((x, y) => x - y); const n = a.length;
  return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : null; };
const dm = d => d.slice(8) + '.' + d.slice(5, 7);
const esc = s => String(s == null ? '' : s).replace(/\|/g, '\\|');

/* ---------------------------------------------------------------- main */
(function main(){
  const file = process.argv[2], days = Number(process.argv[3]) > 0 ? Number(process.argv[3]) : 30;
  if(!file || !fs.existsSync(file)){
    console.error('usage: node tests/mock-location-report.js <register.xlsx|attendance.csv> [days]');
    process.exit(2);
  }
  let rows, source, wb = null;
  if(/\.csv$/i.test(file)){ rows = readCsv(file); source = path.basename(file) + ' (CSV)'; }
  else {
    wb = readWorkbook(file);
    const tab = wb.names.find(n => /^attendance$/i.test(n)) || wb.names.find(n => /attendance/i.test(n));
    if(!tab){ console.error('no Attendance tab in ' + file + ' — tabs: ' + wb.names.join(', ')); process.exit(2); }
    rows = toRows(wb.sheets[tab]); source = path.basename(file) + ' · tab "' + tab + '"';
  }

  /* WHERE EACH OFFICER IS SUPPOSED TO BE, when the workbook carries the roll:
     the Users tab says which village he holds and the GPs tab says where its
     office is. A point pinned three hundred metres from his own office is a
     different thing from one pinned forty kilometres away — the first passes
     the fence and the second is now refused by it — and the Collector reads
     the two differently. */
  const places = {}, holds = {};
  if(wb){
    const gt = wb.names.find(n => /^gps$/i.test(n)), ut = wb.names.find(n => /^users$/i.test(n));
    if(gt){ const g = toRows(wb.sheets[gt]); const h = g[0].map(x => String(x || '').trim().toLowerCase());
      const mi = h.indexOf('mandal'), gi = h.indexOf('gp'), la = h.indexOf('lat'), ln = h.indexOf('lng');
      if(mi >= 0 && gi >= 0 && la >= 0 && ln >= 0) g.slice(1).forEach(r => {
        const y = Number(r[la]), x = Number(r[ln]);
        if(isFinite(y) && isFinite(x) && y > 16.4 && y < 19.2 && x > 77.6 && x < 80.9)
          places[String(r[mi] || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '') + '|' + String(r[gi] || '').trim().toLowerCase()] = { lat:y, lng:x, gp:String(r[gi]).trim(), mandal:String(r[mi]).trim() };
      }); }
    if(ut){ const u = toRows(wb.sheets[ut]); const h = u[0].map(x => String(x || '').trim().toLowerCase());
      const pi = h.indexOf('phone'), mi = h.indexOf('mandal'), gi = h.indexOf('gp');
      if(pi >= 0 && gi >= 0) u.slice(1).forEach(r => { const p = phone10(r[pi]); if(!p) return;
        String(r[gi] || '').split(',').map(x => x.trim()).filter(String).forEach(gp => {
          (holds[p] = holds[p] || []).push(String(r[mi] || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '') + '|' + gp.toLowerCase()); }); }); }
  }
  /* the two tabs spell a mandal two ways (Raghunathpalle, Raghunathapally),
     so a village that misses on mandal|gp is taken by its own name when the
     roll holds exactly one village of that name — the fence's own fallback */
  const byGp = {}; Object.keys(places).forEach(k => { const g = k.split('|')[1]; (byGp[g] = byGp[g] || []).push(places[k]); });
  if(process.env.DEBUG_OFFICE) console.error('places', Object.keys(places).length, 'holds', Object.keys(holds).length,
    'sample places', Object.keys(places).slice(0, 3), 'sample holds', Object.keys(holds).slice(0, 3).map(p => p + '=' + holds[p].join(';')),
    'asked', process.env.DEBUG_OFFICE, '=', JSON.stringify(holds[process.env.DEBUG_OFFICE]));
  const officeOf = ph => (holds[ph] || []).map(k => places[k] || ((byGp[k.split('|')[1]] || []).length === 1 ? byGp[k.split('|')[1]][0] : null)).filter(Boolean);
  const fromOffice = (ph, lat, lng) => { let best = null;
    officeOf(ph).forEach(o => { const d = metres(lat, lng, o.lat, o.lng); if(best === null || d < best.m) best = { m:d, gp:o.gp }; });
    return best; };
  const head = (rows[0] || []).map(h => String(h || '').trim().toLowerCase());
  const ix = {};
  ['date','phone','name','role','mandal','markedat','lat','lng','accuracy','verified','timezone',
   'receivedat','status','markcount','skew','photo'].forEach(k => { ix[k] = head.indexOf(k); });
  if(ix.date < 0 || ix.phone < 0 || ix.lat < 0 || ix.lng < 0){
    console.error('the header does not look like the Attendance tab: ' + head.join(', ')); process.exit(2);
  }
  const cell = (r, k) => ix[k] >= 0 && r[ix[k]] != null ? String(r[ix[k]]).trim() : '';

  /* ---- gather: one mark per officer per day, the first of the day ---- */
  const all = []; let maxDay = '';
  for(let i = 1; i < rows.length; i++){
    const r = rows[i]; if(!r) continue;
    const d = dayOf(cell(r, 'date')); if(!d) continue;
    if(d > maxDay) maxDay = d;
    all.push({ d, r });
  }
  const to = maxDay, from = new Date(Date.parse(to + 'T00:00:00Z') - days * 86400000).toISOString().slice(0, 10);
  const who = {}, byDayPoint = {};
  let marks = 0, located = 0, leaveRows = 0, noFix = 0;
  all.forEach(({ d, r }) => {
    if(d < from || d > to) return;
    const ph = phone10(cell(r, 'phone')); if(!ph) return;
    if(/LEAVE/i.test(cell(r, 'status'))){ leaveRows++; return; }
    marks++;
    const lat = Number(cell(r, 'lat')), lng = Number(cell(r, 'lng'));
    const acc = cell(r, 'accuracy') === '' ? null : Number(cell(r, 'accuracy'));
    const o = who[ph] = who[ph] || { ph, name:cell(r, 'name'), role:cell(r, 'role'), mandal:cell(r, 'mandal'),
                                     days:{}, fixes:[] };
    if(!o.name && cell(r, 'name')) o.name = cell(r, 'name');
    if(o.days[d]) return;                       /* a retry is not a second morning */
    o.days[d] = 1;
    if(!(isFinite(lat) && isFinite(lng) && lat && lng)){ noFix++; return; }
    located++;
    const fx = { d, lat, lng, acc, latS:cell(r, 'lat'), lngS:cell(r, 'lng'),
                 at:cell(r, 'markedat'), rx:cell(r, 'receivedat'), tz:cell(r, 'timezone'),
                 ver:cell(r, 'verified'), skew:cell(r, 'skew') };
    o.fixes.push(fx);
    /* ONLY A FINE FIX CAN BE SHARED. A cell-tower fix is the centroid of the
       tower's cell, two kilometres wide, and every phone on that tower that
       morning returns the same point; the MPDO offices of the district share
       theirs with half their staff. That is not one handset for two. */
    if(acc != null && acc <= FINE_ACC_M){
      const key = d + '|' + lat.toFixed(6) + ',' + lng.toFixed(6);
      (byDayPoint[key] = byDayPoint[key] || []).push({ ph, name:o.name, role:o.role, mandal:o.mandal, at:fx.at, acc });
    }
  });

  /* ---- the district's own baseline: how much an honest fix scatters ---- */
  const scatter = [], lastDigits = {};
  Object.values(who).forEach(o => {
    const fine = o.fixes.filter(f => f.acc != null && f.acc <= FINE_ACC_M);
    fine.forEach(f => {
      const ld = f.latS.slice(-1); if(/\d/.test(ld)) lastDigits[ld] = (lastDigits[ld] || 0) + 1;
    });
    if(fine.length >= 2){
      const c = { lat:median(fine.map(f => f.lat)), lng:median(fine.map(f => f.lng)) };
      scatter.push(median(fine.map(f => metres(f.lat, f.lng, c.lat, c.lng))));
    }
  });
  const baseline = median(scatter);

  /* ---- per officer ---- */
  const findings = [], notJudged = [];
  Object.values(who).forEach(o => {
    const n = Object.keys(o.days).length, loc = o.fixes.length;
    if(loc < MIN_DAYS){ notJudged.push({ ...o, n, loc }); return; }
    const fine = o.fixes.filter(f => f.acc != null && f.acc <= FINE_ACC_M);
    const coarse = o.fixes.filter(f => !(f.acc != null && f.acc <= FINE_ACC_M));
    const ev = [];
    /* 1. byte-identical fine fixes on different days */
    const seen = {};
    fine.forEach(f => { const k = f.lat.toFixed(6) + ',' + f.lng.toFixed(6); (seen[k] = seen[k] || []).push(f); });
    const repeats = Object.keys(seen).filter(k => seen[k].length >= 2)
      .map(k => ({ k, days:seen[k].map(f => f.d).sort(), accs:seen[k].map(f => f.acc) }))
      .sort((a, b) => b.days.length - a.days.length);
    const repDays = repeats.reduce((s, r) => s + r.days.length, 0);
    if(repeats.length) ev.push({ kind:'repeat', w:3, text:
      'the same coordinate to six decimals on ' + repDays + ' of ' + fine.length + ' fine-fix days — ' +
      repeats.slice(0, 3).map(r => { const [la, lo] = r.k.split(',').map(Number); const d = fromOffice(o.ph, la, lo);
        return r.k + ' on ' + r.days.map(dm).join(', ') + ' (claimed ±' + [...new Set(r.accs)].join('/') + ' m' +
          (d ? ', ' + (d.m < 1000 ? Math.round(d.m) + ' m' : (d.m / 1000).toFixed(1) + ' km') + ' from his ' + d.gp + ' office' : '') + ')'; }).join('; ') });
    /* a mark that reached the district days after the date it claims is
       printed and not weighed: the app sends when it has a line, and the
       register takes the earlier of the claim and the receipt, so this is
       the one shape a phone with its clock set back would also make */
    const lateN = o.fixes.filter(f => f.rx && Date.parse(f.rx) - Date.parse(f.d + 'T00:00:00+05:30') >= 2 * 86400000).length;
    if(lateN >= 2) ev.push({ kind:'late', w:0, text: lateN + ' marks reached the district two or more days after the date they claim' });
    /* the coarse repeats are printed as what they are, never counted */
    const cseen = {};
    coarse.forEach(f => { const k = f.lat.toFixed(6) + ',' + f.lng.toFixed(6); (cseen[k] = cseen[k] || []).push(f); });
    const crep = Object.keys(cseen).filter(k => cseen[k].length >= 2);
    if(crep.length && !repeats.length) ev.push({ kind:'coarse-repeat', w:0, text:
      'the same coordinate repeats on ' + cseen[crep[0]].length + ' days, but every one of those fixes was COARSE (±' +
      [...new Set(cseen[crep[0]].map(f => f.acc == null ? '?' : f.acc))].join('/') + ' m) — a wifi fix repeats honestly' });
    /* 2. the spread of his fine fixes */
    let spread = null;
    if(fine.length >= 5){
      const c = { lat:median(fine.map(f => f.lat)), lng:median(fine.map(f => f.lng)) };
      const ds = fine.map(f => metres(f.lat, f.lng, c.lat, c.lng));
      spread = Math.max(...ds);
      if(spread <= TIGHT_M) ev.push({ kind:'tight', w:2, text:
        'all ' + fine.length + ' fine fixes lie inside ' + spread.toFixed(1) + ' m of one point — the district’s honest officers scatter by about ' +
        (baseline == null ? '?' : baseline.toFixed(0)) + ' m' });
    }
    /* 3. too few decimals */
    /* BOTH halves short, or it is not typing: the register stores the number
       the handset sent and a reading that happens to end in zeros is written
       without them — 17.664000 is stored as 17.664 — so one short half beside
       a seven-decimal other half is a trailing zero and nothing else. The
       district's own data says so: the last digit 0 never appears at all. */
    const shortD = o.fixes.filter(f => decimals(f.latS) <= 3 && decimals(f.lngS) <= 3);
    if(shortD.length) ev.push({ kind:'typed', w:2, text:
      shortD.length + ' fix' + (shortD.length === 1 ? '' : 'es') + ' carry three decimals or fewer (' +
      shortD.slice(0, 3).map(f => f.latS + ', ' + f.lngS + ' on ' + dm(f.d)).join('; ') + ') — a handset reports six or seven' });
    /* 7. THE ACCURACY A SATELLITE DOES NOT CLAIM. A handset's receiver reports
       three metres on its best day in the open and never nought or one; the
       mock-location apps report one metre because that is their default. An
       officer whose other mornings read 4 to 29 m and whose repeated point
       reads 1 m is switching between the sky and an app. */
    const lowAcc = o.fixes.filter(f => f.acc != null && f.acc <= 1);
    if(lowAcc.length >= 2){
      const others = o.fixes.filter(f => f.acc != null && f.acc > 1).map(f => f.acc);
      const pts = new Set(lowAcc.map(f => f.lat.toFixed(6) + ',' + f.lng.toFixed(6)));
      const off = officeOf(o.ph).length ? (() => { const ds = lowAcc.map(f => fromOffice(o.ph, f.lat, f.lng)).filter(Boolean); if(!ds.length) return '';
        const md = median(ds.map(x => x.m)); return ' · those points lie ' + (md < 1000 ? Math.round(md) + ' m' : (md / 1000).toFixed(1) + ' km') + ' from his ' + ds[0].gp + ' office'; })() : '';
      ev.push({ kind:'metre', w:lowAcc.length >= 3 ? 3 : 1, text:
        lowAcc.length + ' of ' + o.fixes.length + ' located days claim an accuracy of ' + [...new Set(lowAcc.map(f => f.acc))].join('/') + ' m (' +
        lowAcc.map(f => dm(f.d)).join(', ') + '), at ' + pts.size + ' point' + (pts.size === 1 ? '' : 's') +
        ' — a metre is what a mock-location app claims by default, and what a receiver claims only on a new dual-band handset under open sky' + (others.length ? '; his other days claim ' + Math.min(...others) + '–' + Math.max(...others) + ' m' : '') + off });
    }
    /* 5. a constant claimed accuracy */
    const accs = [...new Set(fine.map(f => f.acc))];
    if(fine.length >= 5 && accs.length === 1) ev.push({ kind:'flat-acc', w:1, text:
      'every one of ' + fine.length + ' fine fixes claims exactly ±' + accs[0] + ' m — a receiver’s accuracy moves with the sky' });
    /* 6. the last digit */
    const lds = {}; fine.forEach(f => { const c = f.latS.slice(-1) + f.lngS.slice(-1); lds[c] = (lds[c] || 0) + 1; });
    const topLd = Object.keys(lds).sort((a, b) => lds[b] - lds[a])[0];
    if(fine.length >= 6 && topLd && lds[topLd] >= Math.ceil(fine.length * 0.8) && !repeats.length)
      ev.push({ kind:'digits', w:1, text:
        'the last digits of latitude and longitude are "' + topLd[0] + '" and "' + topLd[1] + '" on ' + lds[topLd] + ' of ' + fine.length +
        ' fine fixes — honest readings spread their final digit over 0–9' });
    /* 4. shared with another officer, same day — filled in below */
    o.ev = ev; o.n = n; o.loc = loc; o.fineN = fine.length; o.spread = spread;
    o.score = ev.reduce((s, e) => s + e.w, 0);
  });
  /* 4. one point, two officers, one morning */
  const shared = Object.keys(byDayPoint).filter(k => {
    const ps = [...new Set(byDayPoint[k].map(x => x.ph))]; return ps.length > SHARE_MIN;
  }).map(k => ({ day:k.split('|')[0], pt:k.split('|')[1], who:byDayPoint[k] }));
  shared.forEach(s => {
    const ph = [...new Set(s.who.map(x => x.ph))];
    ph.forEach(p => {
      const o = who[p]; if(!o || !o.ev) return;
      const others = s.who.filter(x => x.ph !== p).map(x => x.name + ' (' + x.role + ', ' + x.mandal + ') at ' + (x.at || '?').slice(11, 16));
      o.ev.push({ kind:'shared', w:3, text:
        'the same coordinate ' + s.pt + ' on ' + dm(s.day) + ' as ' + others.join(' and ') +
        ' — one handset or one typed point marking for two' });
      o.score += 3;
    });
  });

  const flagged = Object.values(who).filter(o => o.ev && o.score >= 2).sort((a, b) => b.score - a.score || b.loc - a.loc);
  const weak = Object.values(who).filter(o => o.ev && o.score === 1 || (o.ev && o.score === 0 && o.ev.length))
    .sort((a, b) => b.loc - a.loc);
  const clean = Object.values(who).filter(o => o.ev && o.score === 0 && !o.ev.length).length;

  /* ---- the report ---- */
  const L = [];
  L.push('# Marks that were never measured — a reading of the attendance register');
  L.push('');
  L.push('Source: `' + source + '` · window **' + from + ' to ' + to + '** (' + days + ' days back from the last row) · written ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC');
  L.push('');
  L.push('**This is evidence, not a charge.** Every line below is a figure read off the register with the dates it was read from; what it means under the Conduct Rules is for the Collector on the facts. Two officers sharing one handset, or a phone falling back to a saved fix, produce some of these shapes honestly. Nothing here was written to any register.');
  L.push('');
  L.push('## What was read');
  L.push('');
  L.push('| | |');
  L.push('|---|---|');
  L.push('| Rows in the window | ' + marks + ' marks · ' + leaveRows + ' sanctioned-leave rows (not marks, not read) |');
  L.push('| Officers who marked | ' + Object.keys(who).length + ' |');
  L.push('| Officer-days located | ' + located + ' · ' + noFix + ' with no fix at all |');
  L.push('| Claimed 0 or 1 m | ' + Object.values(who).reduce((s, o) => s + o.fixes.filter(f => f.acc != null && f.acc <= 1).length, 0) + ' officer-days, from ' + Object.values(who).filter(o => o.fixes.some(f => f.acc != null && f.acc <= 1)).length + ' officers |');
  L.push('| Judged | ' + (flagged.length + weak.length + clean) + ' officers with ' + MIN_DAYS + ' or more located days · ' + notJudged.length + ' with fewer, listed below and **not judged** |');
  L.push('| The district’s own baseline | an honest officer’s fine fixes scatter by a median of **' + (baseline == null ? '—' : baseline.toFixed(0) + ' m**') + ' from day to day — this is what a satellite does in Jangaon, and every finding is read against it |');
  L.push('| Last digit of latitude, over every fine fix | ' + '0123456789'.split('').map(d => d + ':' + (lastDigits[d] || 0)).join(' · ') + ' |');
  L.push('');
  L.push('A **fine** fix is one the handset itself said was within ±' + FINE_ACC_M + ' m. Only fine fixes are held against an officer, because a wifi fix is the centroid of the access points in view and repeats honestly — it is coarse, and says so.');
  L.push('');
  L.push('## The signals');
  L.push('');
  L.push('1. **The same coordinate on two different mornings, to six decimals.** A measurement has noise in it; a typed point does not. Weight 3.');
  L.push('2. **Every fine fix inside ' + TIGHT_M + ' m of one point** over five or more days. The same signal, softer. Weight 2.');
  L.push('3. **Three decimals or fewer.** A handset reports six or seven; a person types two. Weight 2.');
  L.push('4. **One coordinate under two officers on the same morning.** One handset or one typed point marking for two. Weight 3, against both.');
  L.push('5. **A constant claimed accuracy** across every fine fix. A receiver’s figure moves with the sky. Weight 1.');
  L.push('6. **The same last digit** on four fixes in five. Honest readings spread it over 0–9. Weight 1.');
  L.push('7. **A claimed accuracy of 0 or 1 m** on three or more days. Older handsets report three metres on their best day; a new dual-band handset under open sky can report one, and so does every mock-location app by default. On its own this is a lead and not a verdict: read it with the point. A point that moves from day to day at 1 m is a good phone; a point that never moves at 1 m is an app. Weight 3 (weight 1 on two days).');
  L.push('');
  L.push('A fix is **fine** at ±' + FINE_ACC_M + ' m or better. The line sits there because Google’s network positioning hands back the centroid of the wifi access points or the cell tower in view, repeats it byte for byte for everyone in the same building, and claims twenty metres to two kilometres for it. Those repeats are honest and are not counted; the MPDO offices of the district produce them every morning.');
  L.push('');
  L.push('An officer is listed under **Findings** at a weight of 2 or more; a single weight-1 signal is listed as weak and is not, on its own, evidence of anything.');
  L.push('');
  L.push('## Findings — ' + flagged.length + ' officer' + (flagged.length === 1 ? '' : 's'));
  L.push('');
  if(!flagged.length) L.push('No officer in this window shows a shape that a measured location does not produce.');
  flagged.forEach((o, i) => {
    L.push('### ' + (i + 1) + '. ' + esc(o.name || o.ph) + ' · ' + esc(o.role) + ' · ' + esc(o.mandal) + ' · ' + o.ph);
    L.push('');
    L.push('Marked on ' + o.n + ' days, ' + o.loc + ' located, ' + o.fineN + ' with a fine fix' +
           (o.spread == null ? '' : ' · his fine fixes spread over ' + o.spread.toFixed(0) + ' m') + ' · weight ' + o.score);
    L.push('');
    o.ev.filter(e => e.w > 0).forEach(e => L.push('- **' + e.kind + '** — ' + esc(e.text)));
    o.ev.filter(e => e.w === 0).forEach(e => L.push('- *(not counted)* ' + esc(e.text)));
    L.push('');
    L.push('| Day | Marked at | Latitude | Longitude | Claimed ± m | Verified | Timezone | Skew |');
    L.push('|---|---|---|---|---|---|---|---|');
    o.fixes.slice().sort((a, b) => a.d.localeCompare(b.d)).forEach(f =>
      L.push('| ' + f.d + ' | ' + (f.at || '').replace('T', ' ').slice(0, 19) + ' | ' + f.latS + ' | ' + f.lngS + ' | ' +
             (f.acc == null ? '—' : f.acc) + ' | ' + f.ver + ' | ' + f.tz + ' | ' + f.skew + ' |'));
    L.push('');
  });
  if(shared.length){
    L.push('## One point, two officers, one morning — ' + shared.length + ' occasion' + (shared.length === 1 ? '' : 's'));
    L.push('');
    L.push('| Day | Point | Officers | Marked at |');
    L.push('|---|---|---|---|');
    shared.sort((a, b) => a.day.localeCompare(b.day)).forEach(s =>
      L.push('| ' + s.day + ' | ' + s.pt + ' | ' + s.who.map(x => esc(x.name) + ' (' + x.role + ', ' + esc(x.mandal) + ')').join(' · ') +
             ' | ' + s.who.map(x => (x.at || '?').slice(11, 16)).join(' · ') + ' |'));
    L.push('');
  }
  L.push('## Weak signals — ' + weak.length + ' officer' + (weak.length === 1 ? '' : 's') + ', not evidence on their own');
  L.push('');
  if(weak.length){
    L.push('| Officer | Role | Mandal | Days located | What was seen |');
    L.push('|---|---|---|---|---|');
    weak.forEach(o => L.push('| ' + esc(o.name || o.ph) + ' | ' + esc(o.role) + ' | ' + esc(o.mandal) + ' | ' + o.loc + ' | ' +
                             o.ev.map(e => esc(e.text)).join('; ') + ' |'));
  } else L.push('None.');
  L.push('');
  L.push('## Not judged — ' + notJudged.length + ' officer' + (notJudged.length === 1 ? '' : 's') + ' with fewer than ' + MIN_DAYS + ' located days');
  L.push('');
  L.push('A reading that treated three marks as a clean sheet would be the report that omits what it could not run. ' +
         (notJudged.length ? notJudged.map(o => esc(o.name || o.ph) + ' (' + o.loc + ')').join(', ') : 'None.'));
  L.push('');
  L.push('## ' + clean + ' officers show nothing');
  L.push('');
  L.push('Their fixes move from day to day by the width of an office, carry six or seven decimals, claim an accuracy that changes with the sky, and repeat nowhere. That is what a measured location looks like.');
  L.push('');

  const outDir = path.join(__dirname, '..', 'Info', 'mock-location');
  fs.mkdirSync(outDir, { recursive:true });
  const out = path.join(outDir, 'REPORT.md');
  fs.writeFileSync(out, L.join('\n') + '\n');
  console.log('window ' + from + ' to ' + to + ' · ' + marks + ' marks · ' + Object.keys(who).length + ' officers · ' +
              flagged.length + ' flagged · ' + weak.length + ' weak · ' + notJudged.length + ' not judged · baseline ' +
              (baseline == null ? '—' : baseline.toFixed(0) + ' m'));
  console.log('written ' + out);
})();

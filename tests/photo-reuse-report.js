/* THE SAME PHOTOGRAPH TWICE — a reading of the attendance photographs' Drive
   metadata for pictures that were stored and re-sent rather than taken.

   Usage:  node tests/photo-reuse-report.js <dir of page files> [names.xlsx]

   The page files are what the Drive listing returned, one file per line:
   title|fileSize|createdTime|parentId|id, where the title is
   ATT_<phone>_<yyyy-mm-dd>.jpg as the register names them. No photograph is
   read, only its size and the moment it arrived.

   WHY A BYTE LENGTH IS EVIDENCE. A camera frame is compressed to JPEG and
   the length of the result depends on every pixel; two frames taken on two
   mornings, however alike, do not compress to the same number of bytes. The
   sizes here run from about twenty to a hundred and thirty thousand bytes,
   so two honest photographs of one officer agreeing by chance is roughly a
   one-in-a-hundred-thousand event per pair. The same length on two
   different DATES is therefore the same file sent again — a stored picture
   uploaded in place of a live one. A retry on the same day is the same
   upload repeated and is not counted: the register already folds those.

   THE SAME LENGTH UNDER TWO OFFICERS on any day is one picture serving two
   men, or one handset marking for both.

   A LATE UPLOAD IS NOT EVIDENCE. The app writes locally and sends when it
   has a line, so a photograph for Tuesday arriving on Thursday is weak
   signal; the register already treats it that way. It is printed, and
   weighted at nothing.

   NONE OF THIS IS A CHARGE. The report prints the figures, the dates and
   the file ids, so each can be opened and looked at. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');

const dir = process.argv[2], namesFile = process.argv[3];
if(!dir || !fs.existsSync(dir)){ console.error('usage: node tests/photo-reuse-report.js <dir> [names.xlsx]'); process.exit(2); }

/* ---- the names, from the district's own table, if given ---- */
const names = {};
if(namesFile && fs.existsSync(namesFile)){
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'names-'));
  execFileSync('unzip', ['-o', '-q', namesFile, '-d', tmp]);
  const un = s => String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
  const strip = s => un(String(s).replace(/<[^>]+>/g, ''));
  let sst = [];
  const sstFile = path.join(tmp, 'xl', 'sharedStrings.xml');
  if(fs.existsSync(sstFile)) sst = (fs.readFileSync(sstFile,'utf8').match(/<si>[\s\S]*?<\/si>/g)||[]).map(strip);
  fs.readdirSync(path.join(tmp,'xl','worksheets')).filter(f => /\.xml$/i.test(f)).forEach(f => {
    const x = fs.readFileSync(path.join(tmp,'xl','worksheets',f),'utf8');
    (x.match(/<row[^>]*>[\s\S]*?<\/row>/g)||[]).forEach(r => {
      const cells = [];
      for(const m of r.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
        const attr=m[2]||'', inner=m[3]||'';
        const v=(inner.match(/<v>([\s\S]*?)<\/v>/)||[])[1];
        if(/t="s"/.test(attr)&&v!==undefined) cells.push(sst[+v]); else if(v!==undefined) cells.push(v);
      }
      /* mandal, village, name, mobile in that order on the district's table */
      const ph = cells.map(c => String(c)).find(c => /^\d(\.\d+)?E9$/.test(c) || /^\d{10}$/.test(c));
      if(!ph) return;
      const d = /E9$/.test(ph) ? String(Math.round(Number(ph))) : ph;
      const i = cells.indexOf(ph);
      const one = s => String(s).replace(/\s+/g, ' ').trim();   /* the table breaks a long name across two lines */
      if(i >= 3) names[d] = { name:one(cells[i-1]), village:one(cells[i-2]), mandal:one(cells[i-3]) };
    });
  });
  fs.rmSync(tmp, { recursive:true, force:true });
}

/* ---- the listing ---- */
const rows = [];
fs.readdirSync(dir).filter(f => /\.txt$/.test(f)).sort().forEach(f => {
  fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/).forEach(line => {
    const p = line.split('|'); if(p.length < 5) return;
    const m = p[0].match(/^ATT_(\d{10})_(\d{4}-\d{2}-\d{2})\.jpg$/i); if(!m) return;
    rows.push({ ph:m[1], d:m[2], size:Number(p[1]), at:p[2], parent:p[3], id:p[4] });
  });
});
/* the same file id listed twice (overlapping windows) is one file */
const seenId = {}; const files = rows.filter(r => !seenId[r.id] && (seenId[r.id] = 1));

const who = {};
files.forEach(r => {
  const o = who[r.ph] = who[r.ph] || { ph:r.ph, days:{} };
  (o.days[r.d] = o.days[r.d] || []).push(r);
});
const nm = ph => names[ph] ? names[ph].name + ' (PS, ' + names[ph].village + ', ' + names[ph].mandal + ')' : ph;
const dm = d => d.slice(8) + '.' + d.slice(5, 7);
const esc = s => String(s == null ? '' : s).replace(/\|/g, '\\|');

/* ---- 1. one officer, one byte length, two dates ---- */
const findings = [];
Object.values(who).forEach(o => {
  const bySize = {};
  Object.keys(o.days).forEach(d => {
    const sizes = [...new Set(o.days[d].map(r => r.size))];
    sizes.forEach(s => { (bySize[s] = bySize[s] || []).push(d); });
  });
  const rep = Object.keys(bySize).filter(s => bySize[s].length >= 2)
    .map(s => ({ size:Number(s), dates:bySize[s].sort() })).sort((a, b) => b.dates.length - a.dates.length);
  if(!rep.length) return;
  const repDays = new Set(); rep.forEach(r => r.dates.forEach(d => repDays.add(d)));
  findings.push({ ph:o.ph, days:Object.keys(o.days).length, rep, repDays:repDays.size,
                  ids:rep.map(r => r.dates.map(d => o.days[d].find(x => x.size === r.size)).filter(Boolean)) });
});
findings.sort((a, b) => b.repDays - a.repDays || b.rep.length - a.rep.length);

/* ---- 2. one byte length, two officers, ONE DAY, ONE FOLDER ----
   Across ten thousand files and a hundred thousand possible lengths, two
   different officers sharing a length somewhere in the month is a birthday
   coincidence — about five hundred such pairs are expected by chance, and
   that is what the first cut of this report printed. The same length on the
   same DATE in the same mandal folder is a different matter: a folder holds
   a few dozen files, and the chance of two honest photographs agreeing
   there is a few in a thousand over the whole month. That is the signal. */
const sizeOwners = {};
files.forEach(r => { const k = r.d + '|' + r.parent + '|' + r.size;
  (sizeOwners[k] = sizeOwners[k] || {})[r.ph] = (sizeOwners[k][r.ph] || []).concat([r]); });
const shared = Object.keys(sizeOwners).filter(k => Object.keys(sizeOwners[k]).length >= 2)
  .map(k => ({ size:Number(k.split('|')[2]), day:k.split('|')[0],
               by:Object.keys(sizeOwners[k]).map(ph => ({ ph, rows:sizeOwners[k][ph] })) }))
  .sort((a, b) => a.day.localeCompare(b.day));
/* and the loose version, counted only, so the arithmetic above is on the record */
const loose = {}; files.forEach(r => { (loose[r.size] = loose[r.size] || new Set()).add(r.ph); });
const looseN = Object.keys(loose).filter(s => loose[s].size >= 2).length;

/* ---- 3. late uploads, printed and not weighed ---- */
const late = [];
files.forEach(r => {
  const lag = (Date.parse(r.at) - Date.parse(r.d + 'T00:00:00+05:30')) / 86400000;
  if(lag >= 2) late.push({ ...r, lag:Math.floor(lag) });
});

/* ---- the report ---- */
const L = [];
const days = [...new Set(files.map(r => r.d))].sort();
L.push('# The same photograph twice — a reading of the attendance photographs');
L.push('');
L.push('Source: Drive listing of `SJ-SCORE Attendance` · photographs dated **' + days[0] + ' to ' + days[days.length - 1] + '** · ' + files.length + ' files · ' + Object.keys(who).length + ' officers · written ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC');
L.push('');
L.push('**Evidence, not a charge.** No photograph was opened. A JPEG’s byte length depends on every pixel of the frame, so two pictures taken on two mornings do not come out the same length; the same length on two dates is the same file sent twice. Every finding carries the file ids so the pictures themselves can be opened from the folder and compared by eye. A retry on the same day is one upload repeated and is never counted.');
L.push('');
L.push('## Findings — ' + findings.length + ' officer' + (findings.length === 1 ? '' : 's') + ' sent the same photograph on more than one date');
L.push('');
if(!findings.length) L.push('None. Every officer’s photographs differ in length from day to day, which is what a camera does.');
findings.forEach((f, i) => {
  L.push('### ' + (i + 1) + '. ' + esc(nm(f.ph)) + ' · marked on ' + f.days + ' days · the same picture on ' + f.repDays + ' of them');
  L.push('');
  L.push('| Bytes | Dates it was sent on | File ids (open from the folder) |');
  L.push('|---|---|---|');
  f.rep.forEach((r, k) => L.push('| ' + r.size + ' | ' + r.dates.map(dm).join(', ') + ' | ' + f.ids[k].map(x => x.id).join(' · ') + ' |'));
  L.push('');
});
L.push('## One byte length under two officers, same day, same mandal folder — ' + shared.length + ' case' + (shared.length === 1 ? '' : 's'));
L.push('');
L.push('Two different officers whose photographs for the same date, in the same mandal folder, have exactly the same byte length. A folder holds a few dozen files a day, so two honest pictures agreeing there is a few-in-a-thousand event over the whole month. (Across the whole month and every folder, ' + looseN + ' lengths are shared by two or more officers, and that is what chance predicts for ten thousand files over a hundred thousand possible lengths; it is not evidence and is not listed.)');
L.push('');
if(!shared.length) L.push('None.');
else {
  L.push('| Day | Bytes | Officers | Uploaded at | File ids |');
  L.push('|---|---|---|---|---|');
  shared.forEach(s => L.push('| ' + s.day + ' | ' + s.size + ' | ' + s.by.map(b => esc(nm(b.ph))).join(' · ') + ' | ' +
    s.by.map(b => b.rows[0].at.slice(11, 16) + 'Z').join(' · ') + ' | ' + s.by.map(b => b.rows[0].id).join(' · ') + ' |'));
}
L.push('');
L.push('## Late uploads — ' + late.length + ', printed and not weighed');
L.push('');
L.push('A photograph that reached the district two or more days after the date it is for. The app sends when it has a line; this is weak signal on its own.');
L.push('');
const lateBy = {}; late.forEach(r => { lateBy[r.ph] = (lateBy[r.ph] || 0) + 1; });
const lateTop = Object.keys(lateBy).sort((a, b) => lateBy[b] - lateBy[a]).slice(0, 25);
if(lateTop.length){
  L.push('| Officer | Late photographs | Example |');
  L.push('|---|---|---|');
  lateTop.forEach(ph => { const ex = late.find(r => r.ph === ph);
    L.push('| ' + esc(nm(ph)) + ' | ' + lateBy[ph] + ' | ' + dm(ex.d) + ' arrived ' + ex.at.slice(0, 16).replace('T', ' ') + 'Z, ' + ex.lag + ' day' + (ex.lag === 1 ? '' : 's') + ' later |'); });
}
L.push('');
L.push('## What was read');
L.push('');
L.push('| | |');
L.push('|---|---|');
L.push('| Files | ' + files.length + ' (' + rows.length + ' listed, overlaps removed) |');
L.push('| Officers | ' + Object.keys(who).length + ' |');
L.push('| Dates | ' + days.length + ' · ' + days[0] + ' to ' + days[days.length - 1] + ' |');
L.push('| Officer-days | ' + Object.values(who).reduce((s, o) => s + Object.keys(o.days).length, 0) + ' |');
L.push('| Distinct byte lengths | ' + Object.keys(sizeOwners).length + ' |');
L.push('');

const outDir = path.join(__dirname, '..', 'Info', 'mock-location');
fs.mkdirSync(outDir, { recursive:true });
const out = path.join(outDir, 'PHOTO-REPORT.md');
fs.writeFileSync(out, L.join('\n') + '\n');
console.log(files.length + ' files · ' + Object.keys(who).length + ' officers · ' + days.length + ' dates · ' +
            findings.length + ' officers re-sent a photograph · ' + shared.length + ' lengths shared across officers · ' + late.length + ' late');
console.log('written ' + out);

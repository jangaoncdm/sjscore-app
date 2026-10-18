/* THE BASE FORMAT WORKBOOKS, READ INTO ONE PASTE.

   Every Head of Office returns A Section's Base Format: one workbook, one row
   an employee, thirty-six columns taken from the Service Register and the last
   pay slip. Twenty-six came back through October 2026. This reads every .xlsx
   in hms/HRMS DATA and writes, INTO THAT SAME FOLDER AND NOWHERE ELSE:

     _PASTE.tsv    the rows the console's establishment panel takes, with the
                   workbook's own code row (A1 … X2) on top so the console
                   maps the columns by code and never by position;
     _ISSUES.csv   every row the register will refuse or mark incomplete, and
                   why, office by office — the sheet to send back.

   hms/ is gitignored: these files carry a thousand personal mobile numbers
   and the repository is public. Nothing here is committed.

   It needs no dependency: the workbook is a zip of XML and is read the way
   tests/gp-seed.js reads the Gram Palana roster — lazily, because an empty
   cell is self-closing and a greedy match reads every value after a blank one
   column to the left. The one .xls (State Audit) is a binary format this does
   not read; it is named in the output so nobody believes it was.

   Usage: node tests/hrms-base-seed.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'hms', 'HRMS DATA');
const CODES = ['A1','A2','A3','A4','A5','A6','B1','B2','B3','B4','B5','B6','B7','B8','B9','B10','B11','B12','B13','B14','B15',
               'C1','C2','C3','D1','D2','D3','D4','D5','D6','D7','D8','D9','R1'];
const DATES = { A4:1, B7:1, B8:1, B9:1, D1:1, D9:1 };
const NUMS  = { D2:1, D3:1, D4:1, D5:1, D6:1, D7:1 };
const MANDATORY = { A2:'name', A3:'gender', A4:'date of birth', A5:'mobile', B1:'category', B2:'department', B3:'designation',
                    B4:'office', B5:'place of working', B6:'gazetted', B8:'date of joining the present post', B13:'status',
                    C1:'controlling officer', C2:'casual-leave authority', C3:'other-leave authority', D1:'balance date',
                    D4:'casual leave availed', D8:'verified by', D9:'verification date' };

function un(s){ return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&'); }
const strip = s => un(String(s).replace(/<[^>]+>/g, ''));

/* the first sheet whose name begins "Base", by its rId and not by its order */
function readBase(file){
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hrmsbase-'));
  try{
    execFileSync('unzip', ['-o', '-q', file, '-d', tmp]);
    let sst = [];
    const sf = path.join(tmp, 'xl', 'sharedStrings.xml');
    if(fs.existsSync(sf)) sst = (fs.readFileSync(sf, 'utf8').match(/<si>[\s\S]*?<\/si>/g) || []).map(strip);
    const wb = fs.readFileSync(path.join(tmp, 'xl', 'workbook.xml'), 'utf8');
    const rels = fs.readFileSync(path.join(tmp, 'xl', '_rels', 'workbook.xml.rels'), 'utf8');
    const target = {};
    for(const m of rels.matchAll(/<Relationship\b[^>]*?Id="([^"]+)"[^>]*?Target="([^"]+)"/g)) target[m[1]] = m[2];
    for(const m of rels.matchAll(/<Relationship\b[^>]*?Target="([^"]+)"[^>]*?Id="([^"]+)"/g)) target[m[2]] = target[m[2]] || m[1];
    let pick = null;
    for(const m of wb.matchAll(/<sheet\b[^>]*?name="([^"]+)"[^>]*?r:id="([^"]+)"/g)){
      if(/^base/i.test(un(m[1]).trim())){ pick = target[m[2]]; break; }
    }
    if(!pick){ const m = wb.match(/<sheet\b[^>]*?r:id="([^"]+)"/); pick = m ? target[m[1]] : 'worksheets/sheet1.xml'; }
    const f = path.join(tmp, 'xl', pick.replace(/^\/xl\//, '').replace(/^xl\//, ''));
    const x = fs.readFileSync(f, 'utf8');
    const rows = {};
    for(const r of x.matchAll(/<row\b[^>]*?r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)){
      const cell = {};
      for(const m of r[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
        const col = m[1], attr = m[2] || '', inner = m[3] || '';
        const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        const is = (inner.match(/<is>([\s\S]*?)<\/is>/) || [])[1];
        if(/t="s"/.test(attr) && v !== undefined) cell[col] = sst[+v];
        else if(is !== undefined) cell[col] = strip(is);
        else if(v !== undefined) cell[col] = un(v);
      }
      rows[+r[1]] = cell;
    }
    return rows;
  } finally { fs.rmSync(tmp, { recursive:true, force:true }); }
}

/* Excel keeps a date as days since 30.12.1899; the console takes dd-mm-yyyy */
function dateOut(v){
  const s = String(v == null ? '' : v).trim();
  if(!s) return '';
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[3] + '-' + m[2] + '-' + m[1];
  m = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/); if(m) return ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2) + '-' + m[3];
  if(/^\d{4,6}(\.\d+)?$/.test(s)){ const n = Number(s); if(n > 20000 && n < 80000){
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
    return ('0' + d.getUTCDate()).slice(-2) + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + d.getUTCFullYear(); } }
  return s;                                   /* left as typed, and named below */
}
const csvCell = v => { const s = String(v == null ? '' : v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = rows => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

(function main(){
  if(!fs.existsSync(SRC)){ console.error('No hms/HRMS DATA folder. Nothing to read.'); process.exit(1); }
  const files = fs.readdirSync(SRC).filter(f => /\.xlsx?$/i.test(f) && !/^[_~]/.test(f)).sort();
  const out = [CODES.join('\t')], issues = [['Workbook','Row','Name','Mobile','What the register will do','Why']];
  const seenPhone = {}, seenEmp = {};
  let total = 0, clean = 0;
  files.forEach(fn => {
    if(/\.xls$/i.test(fn)){ issues.push([fn, '', '', '', 'NOT READ', 'an older .xls workbook — save it as .xlsx and run this again']); console.log('  skipped  ' + fn + '  (.xls)'); return; }
    let rows;
    try{ rows = readBase(path.join(SRC, fn)); }
    catch(e){ issues.push([fn, '', '', '', 'NOT READ', String(e.message || e).slice(0, 80)]); console.log('  failed   ' + fn); return; }
    /* the code row is row 2 in the format; trust it where it is there,
       and fall back to the format's own column order where it is not */
    /* THE CODE ROW IS FOUND WHEREVER IT SITS. Two offices put a serial column
       in front of the format, so A1 is in column B there and reading by
       position would call a man's mobile number his date of birth. The row
       carrying A1 and A2 is found by its contents, and the codes are mapped
       to the columns they actually occupy. An office that deleted the code
       row altogether is read by the format's own order, from row 2. */
    let colOf = {};
    const nums = Object.keys(rows).map(Number).sort((a, b) => a - b);
    const codeRow = nums.find(n => Object.keys(rows[n]).some(col => String(rows[n][col]).trim() === 'A1') &&
                                   Object.keys(rows[n]).some(col => String(rows[n][col]).trim() === 'A2'));
    const alpha = i => { let s = ''; i++; while(i > 0){ const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
    if(codeRow) Object.keys(rows[codeRow]).forEach(col => { const c = String(rows[codeRow][col]).trim(); if(CODES.indexOf(c) >= 0) colOf[c] = col; });
    else CODES.forEach((c, i) => { colOf[c] = alpha(i); });
    const first = codeRow ? codeRow + 2 : 2;           /* the code row, the headings, then the rows */
    let n = 0;
    nums.forEach(rn => {
      if(rn < first) return;
      const r = rows[rn];
      const get = c => { const col = colOf[c]; return col ? String(r[col] == null ? '' : r[col]).trim() : ''; };
      if(!CODES.some(c => c !== 'X1' && c !== 'X2' && get(c))) return;
      /* the Field Guide's own example row, if an office left it standing */
      if(get('A1') === '2071534' && /srinivas rao/i.test(get('A2'))) return;
      n++; total++;
      const why = [];
      /* a number typed into a numeric cell comes back as 9876543210.0 from one
         office and 9.87654321E9 from none so far; the decimal is not a digit */
      let phone = get('A5').replace(/\.0+$/, '').replace(/\D/g, '');
      if(phone.length === 11 && phone[0] === '0') phone = phone.slice(1); if(phone.length === 12 && phone.slice(0, 2) === '91') phone = phone.slice(2);
      let verdict = '';
      if(phone.length !== 10){ verdict = 'REFUSED'; why.push('mobile is not ten digits (' + get('A5') + ')'); }
      else if(seenPhone[phone]){ verdict = 'REFUSED'; why.push('mobile already on row ' + seenPhone[phone]); }
      else seenPhone[phone] = fn + ' row ' + rn;
      if(!get('A2')){ verdict = 'REFUSED'; why.push('no name'); }
      if(/\bsir\b/i.test(get('A2'))){ verdict = 'REFUSED'; why.push('"' + get('A2') + '" is a post, not a person'); }
      if(!get('B4')){ verdict = 'REFUSED'; why.push('no office (B4)'); }
      const emp = get('A1'); if(emp){ if(seenEmp[emp]) why.push('employee id also on ' + seenEmp[emp]); else seenEmp[emp] = fn + ' row ' + rn; }
      else why.push('no employee id — an enrolment code will be issued');
      const bal = ['D2','D3','D4','D5','D6'].some(c => get(c) !== '');
      /* THE VERIFICATION DATE STANDS IN FOR A BLANK BALANCE DATE. The format
         asks for both and a hundred rows gave only the second; the figures
         were verified on that day, so that is the day they stand as on. */
      if(bal && !dateOut(get('D1')) && /^\d{2}-\d{2}-\d{4}$/.test(dateOut(get('D9')))){ r[colOf.D1] = get('D9'); why.push('balance date taken from the verification date'); }
      if(bal && !dateOut(get('D1'))){ verdict = 'REFUSED'; why.push('balances given with no balance date (D1)'); }
      Object.keys(MANDATORY).forEach(c => { if(!get(c) && !(c === 'D4' && !bal)) why.push(MANDATORY[c] + ' blank'); });
      Object.keys(DATES).forEach(c => { const d = get(c); if(d && !/^\d{2}-\d{2}-\d{4}$/.test(dateOut(d))) why.push(c + ' is not a date: ' + d); });
      if(!verdict && why.length) verdict = 'ADDED, INCOMPLETE';
      if(!verdict){ verdict = 'ADDED'; clean++; }
      if(why.length) issues.push([fn, String(rn), get('A2'), phone || get('A5'), verdict, why.join('; ')]);
      out.push(CODES.map(c => { const v = c === 'A5' ? phone || get(c) : get(c); return DATES[c] ? dateOut(v) : String(v).replace(/[\t\r\n]+/g, ' '); }).join('\t'));
    });
    console.log('  ' + String(n).padStart(5) + '  ' + fn);
  });
  fs.writeFileSync(path.join(SRC, '_PASTE.tsv'), out.join('\r\n') + '\r\n');
  fs.writeFileSync(path.join(SRC, '_ISSUES.csv'), csv(issues));
  console.log('\n' + total + ' employees from ' + files.filter(f => /\.xlsx$/i.test(f)).length + ' workbooks · ' + clean + ' complete · ' +
    (issues.length - 1) + ' line(s) on the issues sheet');
  console.log('written  : hms/HRMS DATA/_PASTE.tsv  (paste into the console, Admin > The district establishment)');
  console.log('written  : hms/HRMS DATA/_ISSUES.csv (what to send back to the offices)');
})();

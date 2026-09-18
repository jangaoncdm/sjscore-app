/* THE GRAM PANCHAYAT ROSTER, TURNED INTO TWO TABS.

   Reads Domain/GP/<the district's workbook>.xlsx and writes two CSV files the
   Collector imports into the new GP Sheet: `Users` and `GPs`.

   IT WRITES INTO Domain/GP/, WHICH IS GITIGNORED, AND NOWHERE ELSE. The
   workbook carries 134 officers' personal mobile numbers and this repository
   is public; the rosters have always stayed off it, and the seed is a roster.
   Nothing this script produces may be committed.

   WHAT IT DOES TO THE DATA, AND WHAT IT REFUSES TO DO:

   · ONE OFFICER, ONE ROW. 54 of the 115 Gram Panchayat Officers hold more than
     one revenue village — "Incharge GPO" — and one holds four. The register
     has folded a number across rows since v5 (a Secretary holding two GPs has
     two rows and one login), but the roll reads better as one row per officer
     with his villages in the GP column, which is the same shape findByPhone_
     already folds to. Held villages are joined with a comma.
   · MANDAL NAMES ARE NORMALISED to one spelling. The workbook spells the same
     mandal three ways between its two sheets — GHANPUR(STN), Ghanpur (Stn),
     CHILPUR, Chilpur — and two of them do not match the sanitation register's
     roll at all: Bachannapet against Bachannapeta, Raghunathapalli against
     Raghunathpalle. The Collector's console will show both registers, so they
     are brought to one form here.
   · A COORDINATE THAT CANNOT BE BELIEVED IS LEFT BLANK, NOT GUESSED AT. Two of
     the 180 rows are wrong — a longitude of 7852556, and one row with the
     latitude copied into the longitude column. They are written blank and
     NAMED in the report, because a village with no coordinate yields no
     distance, while a wrong one yields a five-hundred-kilometre accusation
     against an officer sitting in his own office.
   · NOTHING IS INVENTED. A row with no name or no ten-digit mobile is reported
     and left out; it is not filled in with a guess.

   Usage: node tests/gp-seed.js */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '..', 'Domain', 'GP');

/* The district's own spellings, brought to one form. The left side is what the
   workbook says (punctuation and case ignored); the right is what the roll
   will read, matching the sanitation register where the two mean one mandal. */
const MANDAL = {
  bachannapet:'Bachannapeta', bachannapeta:'Bachannapeta',
  chilpur:'Chilpur',
  devaruppula:'Devaruppula',
  ghanpurstn:'Ghanpur (Stn)',
  jangaon:'Jangaon',
  kodakandla:'Kodakandla',
  lingalaghanpur:'Lingala Ghanpur',
  narmetta:'Narmetta',
  palakurthy:'Palakurthy',
  raghunathapalli:'Raghunathpalle', raghunathpalle:'Raghunathpalle',
  tharigoppula:'Tharigoppula',
  zaffergadh:'Zaffergadh'
};
/* the district's own box — the same one suspectMark_ uses */
const BOX = { latMin:16.4, latMax:19.2, lngMin:77.6, lngMax:80.9 };

const mkey = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const mandalOf = s => MANDAL[mkey(s)] || null;
const titled = s => String(s || '').trim().replace(/\s+/g, ' ');
const phone10 = v => { const d = String(v == null ? '' : v).replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) : ''; };

/* ---- the workbook, read without a dependency ----
   SheetJS in this repository is the browser build and will not load in node,
   and a government machine should not be made to npm-install a parser to read
   a file it already has. An .xlsx is a zip of XML; unzip and read it. */
function readWorkbook(file){
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gpseed-'));
  execFileSync('unzip', ['-o', '-q', file, '-d', tmp]);
  const un = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, '&');
  const strip = s => un(String(s).replace(/<[^>]+>/g, ''));
  let sst = [];
  const sstFile = path.join(tmp, 'xl', 'sharedStrings.xml');
  if(fs.existsSync(sstFile)){
    const x = fs.readFileSync(sstFile, 'utf8');
    sst = (x.match(/<si>[\s\S]*?<\/si>/g) || []).map(strip);
  }
  const wb = fs.readFileSync(path.join(tmp, 'xl', 'workbook.xml'), 'utf8');
  const names = [...wb.matchAll(/<sheet[^>]*name="([^"]+)"/g)].map(m => un(m[1]));
  const sheets = {};
  names.forEach((n, i) => {
    const f = path.join(tmp, 'xl', 'worksheets', 'sheet' + (i + 1) + '.xml');
    if(!fs.existsSync(f)) return;
    const x = fs.readFileSync(f, 'utf8');
    const rows = (x.match(/<row[^>]*>[\s\S]*?<\/row>/g) || []).map(r => {
      const cell = {};
      for(const m of r.matchAll(/<c r="([A-Z]+)\d+"([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)){
        const col = m[1], attr = m[2] || '', inner = m[3] || '';
        const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        const is = (inner.match(/<is>([\s\S]*?)<\/is>/) || [])[1];
        if(/t="s"/.test(attr) && v !== undefined) cell[col] = sst[+v];
        else if(is !== undefined) cell[col] = strip(is);
        else if(v !== undefined) cell[col] = v;
      }
      return cell;
    });
    sheets[n] = rows;
  });
  fs.rmSync(tmp, { recursive:true, force:true });
  return sheets;
}

const csvCell = v => { const s = String(v == null ? '' : v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = rows => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

(function main(){
  if(!fs.existsSync(SRC_DIR)){ console.error('No Domain/GP folder. Nothing to read.'); process.exit(1); }
  const book = fs.readdirSync(SRC_DIR).filter(f => /\.xlsx$/i.test(f))[0];
  if(!book){ console.error('No .xlsx in Domain/GP.'); process.exit(1); }
  console.log('reading  : Domain/GP/' + book);
  const sheets = readWorkbook(path.join(SRC_DIR, book));

  const notes = [];
  const gpoRows = (sheets.GPO || []).slice(1);
  const riRows  = (sheets.RI  || []).slice(1);

  /* ---- the village roll, with its offices ---- */
  const villages = [];       /* {mandal, gp, lat, lng} */
  const byPhone = {};        /* phone -> {name, role, mandal, gps:[]} */
  gpoRows.forEach((r, i) => {
    const line = 'GPO row ' + (i + 2);
    const mandal = mandalOf(r.C);
    const gp = titled(r.D), name = titled(r.G), ph = phone10(r.I);
    if(!mandal){ notes.push(line + ': mandal "' + titled(r.C) + '" is not one of the twelve — left out'); return; }
    if(!gp){ notes.push(line + ': no revenue village named — left out'); return; }
    if(!name){ notes.push(line + ' (' + gp + '): no officer named — left out'); return; }
    if(!ph){ notes.push(line + ' (' + gp + '): mobile "' + String(r.I || '') + '" is not ten digits — left out'); return; }
    let lat = Number(r.E), lng = Number(r.F);
    if(!isFinite(lat) || !isFinite(lng) ||
       lat < BOX.latMin || lat > BOX.latMax || lng < BOX.lngMin || lng > BOX.lngMax){
      notes.push(line + ': ' + mandal + ' · ' + gp + ' — the GP office coordinate cannot be believed (' +
        r.E + ', ' + r.F + '). WRITTEN BLANK. No distance will be measured for this village until it is corrected.');
      lat = ''; lng = '';
    }
    villages.push({ mandal, gp, lat, lng });
    const o = byPhone[ph] = byPhone[ph] || { phone:ph, name, role:'GPO', mandal, gps:[] };
    /* the FIRST spelling of his name wins, as the village roll does */
    if(o.gps.indexOf(gp) < 0) o.gps.push(gp);
    if(o.mandal !== mandal) notes.push(line + ': ' + name + ' holds villages in ' + o.mandal +
      ' and ' + mandal + ' — the roll shows ' + o.mandal + ', which is where his first village is');
  });

  riRows.forEach((r, i) => {
    const line = 'RI row ' + (i + 2);
    const mandal = mandalOf(r.C);
    const name = titled(r.D), role = String(r.E || '').toUpperCase().trim(), ph = phone10(r.F);
    if(!mandal){ notes.push(line + ': mandal "' + titled(r.C) + '" is not one of the twelve — left out'); return; }
    if(!name || !ph){ notes.push(line + ': no name or no ten-digit mobile — left out'); return; }
    if(role !== 'MRI' && role !== 'ARI'){ notes.push(line + ': designation "' + role + '" is neither MRI nor ARI — left out'); return; }
    if(byPhone[ph]){
      notes.push(line + ': ' + ph + ' is already on the roll as ' + byPhone[ph].role +
        ' — ONE NUMBER IS ONE OFFICER, so the Revenue Inspector row is left out and must be given its own number');
      return;
    }
    byPhone[ph] = { phone:ph, name, role, mandal, gps:[] };
  });

  const officers = Object.keys(byPhone).map(k => byPhone[k])
    .sort((a, b) => a.mandal.localeCompare(b.mandal) || a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  /* ---- the two tabs ---- */
  const users = [['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active']]
    .concat(officers.map(o => [o.phone, o.name, o.role, o.mandal, o.gps.join(', '), '', '', '', 'TRUE']));
  const gps = [['Mandal','GP','Lat','Lng']]
    .concat(villages.sort((a, b) => a.mandal.localeCompare(b.mandal) || a.gp.localeCompare(b.gp))
      .map(v => [v.mandal, v.gp, v.lat, v.lng]));

  fs.writeFileSync(path.join(SRC_DIR, 'seed-Users.csv'), csv(users));
  fs.writeFileSync(path.join(SRC_DIR, 'seed-GPs.csv'), csv(gps));
  fs.writeFileSync(path.join(SRC_DIR, 'seed-report.txt'),
    'The GP roster, as the seed read it\n' +
    '  officers on the roll : ' + officers.length + '\n' +
    '  of them GPO          : ' + officers.filter(o => o.role === 'GPO').length + '\n' +
    '  of them MRI / ARI    : ' + officers.filter(o => o.role === 'MRI').length + ' / ' +
                                  officers.filter(o => o.role === 'ARI').length + '\n' +
    '  revenue villages     : ' + villages.length + '\n' +
    '  with a usable office : ' + villages.filter(v => v.lat !== '').length + '\n' +
    '  holding >1 village   : ' + officers.filter(o => o.gps.length > 1).length + '\n\n' +
    (notes.length ? 'WHAT COULD NOT BE READ, OR WAS CHANGED\n' + notes.map(n => '  • ' + n).join('\n') + '\n'
                  : 'Every row read cleanly.\n'));

  console.log('officers : ' + officers.length + '  (GPO ' + officers.filter(o => o.role === 'GPO').length +
    ', MRI ' + officers.filter(o => o.role === 'MRI').length +
    ', ARI ' + officers.filter(o => o.role === 'ARI').length + ')');
  console.log('villages : ' + villages.length + '  (' + villages.filter(v => v.lat !== '').length + ' with a usable GP office)');
  console.log('written  : Domain/GP/seed-Users.csv, seed-GPs.csv, seed-report.txt   (gitignored)');
  if(notes.length){
    console.log('\nWHAT COULD NOT BE READ, OR WAS CHANGED  (' + notes.length + ')');
    notes.forEach(n => console.log('  • ' + n));
  }
})();

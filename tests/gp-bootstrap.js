/* PUT THE ROLL INTO THE NEW REGISTER, ONCE, WITHOUT IT TOUCHING GITHUB.

   The roll is 134 officers' personal mobile numbers. This repository is public
   — it is public so that handsets can install the app from it — and a GitHub
   secret is not a hiding place either: anyone who can push a workflow can
   print one. So the roll goes straight from the district's own machine to the
   district's own Apps Script web app, over HTTPS, and never anywhere else.

   What travels through GitHub is a random key with no personal data in it,
   baked into the one file that exists only in the Gram Panchayat project.

   IT CANNOT OVERWRITE A LIVE REGISTER. The endpoint refuses unless the Users
   tab is empty, so the moment one officer is on the roll this stops working —
   there is no window in which it could overwrite a roll people are signing in
   against. The sanitation register has no key at all and never will.

   Usage:
     node tests/gp-bootstrap.js <exec-url> <bootstrap-key>
     node tests/gp-bootstrap.js <exec-url> <bootstrap-key> --dry-run

   It reads Domain/GP/seed-Users.csv and seed-GPs.csv, which tests/gp-seed.js
   writes and which are gitignored.
*/
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const SRC = path.join(__dirname, '..', 'Domain', 'GP');

/* a CSV reader that copes with the quoted, comma-bearing GP column */
function readCsv(file){
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const rows = [];
  let cur = [], val = '', q = false;
  for(let i = 0; i < raw.length; i++){
    const c = raw[i];
    if(q){
      if(c === '"' && raw[i + 1] === '"'){ val += '"'; i++; }
      else if(c === '"') q = false;
      else val += c;
    } else if(c === '"') q = true;
    else if(c === ','){ cur.push(val); val = ''; }
    else if(c === '\n'){ cur.push(val); rows.push(cur); cur = []; val = ''; }
    else if(c !== '\r') val += c;
  }
  if(val.length || cur.length){ cur.push(val); rows.push(cur); }
  const head = rows.shift().map(h => h.trim());
  return rows.filter(r => r.some(x => String(x).trim())).map(r => {
    const o = {}; head.forEach((h, i) => { o[h] = (r[i] == null ? '' : r[i]).trim(); }); return o;
  });
}

function post(url, body){
  return new Promise((res, rej) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8', 'Content-Length': Buffer.byteLength(data) } },
      r => {
        /* Apps Script answers a POST with a redirect to its content host */
        if(r.statusCode >= 300 && r.statusCode < 400 && r.headers.location){
          https.get(r.headers.location, r2 => {
            let s = ''; r2.on('data', d => s += d); r2.on('end', () => res(s));
          }).on('error', rej);
          return;
        }
        let s = ''; r.on('data', d => s += d); r.on('end', () => res(s));
      });
    req.on('error', rej);
    req.write(data); req.end();
  });
}

(async () => {
  const [url, key] = process.argv.slice(2);
  const dry = process.argv.includes('--dry-run');
  if(!url || !key){
    console.error('usage: node tests/gp-bootstrap.js <exec-url> <bootstrap-key> [--dry-run]');
    process.exit(1);
  }
  const uFile = path.join(SRC, 'seed-Users.csv'), gFile = path.join(SRC, 'seed-GPs.csv');
  if(!fs.existsSync(uFile)){
    console.error('No ' + uFile + '. Run  node tests/gp-seed.js  first.');
    process.exit(1);
  }
  const users = readCsv(uFile).map(r => [r.Phone, r.Name, r.Role, r.Mandal, r.GP, r.Email || '']);
  const gps   = fs.existsSync(gFile)
    ? readCsv(gFile).map(r => [r.Mandal, r.GP, r.Lat, r.Lng]) : [];

  const roles = {};
  users.forEach(u => { roles[u[2]] = (roles[u[2]] || 0) + 1; });
  const placed = gps.filter(g => String(g[2]).trim() && String(g[3]).trim()).length;
  console.log('to be seeded:');
  console.log('  officers  ' + users.length + '   (' +
    Object.keys(roles).sort().map(k => k + ' ' + roles[k]).join(', ') + ')');
  console.log('  villages  ' + gps.length + '   (' + placed + ' with a usable GP office)');
  console.log('  into      ' + url);
  /* the roll is never printed. A terminal is a log too. */

  if(dry){ console.log('\n--dry-run: nothing was sent.'); return; }

  const out = await post(url, { kind: 'bootstrap', key: key, users: users, gps: gps });
  let j = null;
  try{ j = JSON.parse(out); }catch(e){}
  if(!j){ console.error('\nThe register did not answer with JSON:\n' + String(out).slice(0, 400)); process.exit(1); }
  if(j.ok === false){ console.error('\nRefused: ' + j.error); process.exit(1); }
  console.log('\nseeded: ' + j.officers + ' officers and ' + j.villages +
    ' villages into the ' + j.tenant + ' register.');
  console.log('This endpoint has now stopped working — a register with a roll cannot be seeded again.');
})();

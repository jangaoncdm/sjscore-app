/* THE PIN LIST, FOR HANDING OUT AT ROLLOUT.

   134 officers have to be told their PIN once, and there is no way to do that
   one console reset at a time. This takes the list from the register and
   writes it, sorted by mandal, so the DPO office can print a page per mandal
   and hand it to the Mandal Revenue Inspector to distribute.

   IT CANNOT READ AN ACCOUNT AN OFFICER HAS MADE HIS OWN. The register checks
   every row against the PIN it would derive for that number today: only rows
   whose stored hash still matches are listed. The moment an officer changes
   his PIN he drops off this list for good, and the count of those withheld is
   reported rather than quietly passed over.

   IT WRITES INTO Domain/GP/, WHICH IS GITIGNORED, AND NOWHERE ELSE — and the
   PINs are never printed to the terminal, because a terminal is a log too.

   THIS FILE IS A LIST OF LIVE CREDENTIALS. Print it, hand it out, and delete
   it. Officers should change their PIN on first sign-in; every one who does
   disappears from any future list.

   Usage: node tests/gp-pinlist.js <exec-url> <bootstrap-key>
*/
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT = path.join(__dirname, '..', 'Domain', 'GP');

function post(url, body){
  return new Promise((res, rej) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({ hostname:u.hostname, path:u.pathname + u.search, method:'POST',
      headers:{ 'Content-Type':'text/plain;charset=utf-8', 'Content-Length':Buffer.byteLength(data) } },
      r => {
        if(r.statusCode >= 300 && r.statusCode < 400 && r.headers.location){
          https.get(r.headers.location, r2 => { let s=''; r2.on('data',d=>s+=d); r2.on('end',()=>res(s)); }).on('error', rej);
          return;
        }
        let s=''; r.on('data',d=>s+=d); r.on('end',()=>res(s));
      });
    req.on('error', rej); req.write(data); req.end();
  });
}
const cell = v => { const s = String(v == null ? '' : v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };

(async () => {
  const [url, key] = process.argv.slice(2);
  if(!url || !key){ console.error('usage: node tests/gp-pinlist.js <exec-url> <bootstrap-key>'); process.exit(1); }
  const raw = await post(url, { kind:'pinList', key:key });
  let j = null; try{ j = JSON.parse(raw); }catch(e){}
  if(!j){ console.error('The register did not answer with JSON:\n' + String(raw).slice(0,300)); process.exit(1); }
  if(j.ok === false){ console.error('Refused: ' + j.error); process.exit(1); }

  const rows = j.rows.slice().sort((a,b) =>
    String(a.mandal).localeCompare(String(b.mandal)) ||
    String(a.role).localeCompare(String(b.role)) ||
    String(a.name).localeCompare(String(b.name)));

  const body = [['Mandal','Role','Officer','Mobile','PIN','Revenue village(s)']]
    .concat(rows.map(r => [r.mandal, r.role, r.name, r.phone, r.pin, r.gp]));
  body.push([]);
  body.push(['App: https://jangaoncdm.github.io/sjscore-app/gp/']);
  body.push(['Each officer should change his PIN on first sign-in: More > Change PIN.']);
  body.push(['This sheet is a list of live credentials. Hand it out and destroy it.']);
  if(j.withheld) body.push([j.withheld + ' officer(s) are not listed: they have already set their own PIN.']);

  const file = path.join(OUT, 'PINS-do-not-commit.csv');
  fs.writeFileSync(file, '﻿' + body.map(r => r.map(cell).join(',')).join('\r\n') + '\r\n');

  /* the roll, by mandal, without a single PIN on the screen */
  const byM = {};
  rows.forEach(r => { byM[r.mandal] = (byM[r.mandal] || 0) + 1; });
  console.log('listed for distribution: ' + rows.length + ' officer(s)' +
    (j.withheld ? ', ' + j.withheld + ' withheld (they have set their own PIN)' : ''));
  Object.keys(byM).sort().forEach(m => console.log('  ' + m.padEnd(18) + byM[m]));
  console.log('\nwritten: Domain/GP/PINS-do-not-commit.csv   (gitignored)');
  console.log('No PIN has been printed here. Print the file, hand it out, delete it.');
})();

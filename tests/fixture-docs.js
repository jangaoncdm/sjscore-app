/* Builds the GPDP and advisory payloads by running the REAL backend under the
   Apps Script mock — the district view the console reads, and the officer view
   the field app reads. The browser test drives the pages against these, so
   what is screenshotted is the page reading the district's own response shape.

   Usage: node tests/fixture-docs.js */
'use strict';
const fs = require('fs');
const path = require('path');
const mock = require('./gasmock.js');

const MANDALS = ['Jangaon', 'Chilpur', 'Devaruppula', 'Ghanpur (Stn)', 'Kodakandla',
  'Lingala Ghanpur', 'Narmetta', 'Palakurthy', 'Raghunathpalle', 'Tharigoppula',
  'Bachannapeta', 'Zaffergadh'];
const FIRST = ['Anil','Bhavani','Chandra','Divya','Eshwar','Ganesh','Harika','Indra',
  'Jyothi','Kavitha','Lakshmi','Mahesh','Naveen','Padma','Ramesh','Sunitha',
  'Tarun','Usha','Venkat','Yadagiri','Srinivas','Manjula','Praveen','Sampath'];
const LAST = ['Reddy','Rao','Kumar','Sharma','Goud','Naik','Yadav','Chary','Babu','Devi'];

let seed = 20260823;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = a => a[Math.floor(rnd() * a.length)];
const b64 = n => Buffer.from('x'.repeat(n)).toString('base64');

const MSG = 'Kindly go through the to do list in the monsoon season and act accordingly';

function build(){
  const env = mock.load({ now: '2026-08-23T11:20:00+05:30' });
  const c = env.ctx;
  const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'];

  const users = [{ Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR',
                   Mandal:'', GP:'', Email:'cdm@mock.example', Active:'TRUE' }];
  let ph = 9100000000;
  MANDALS.forEach((m, mi) => {
    const n = 4 + (mi % 3);
    for(let i = 0; i < n; i++){
      users.push({ Phone:String(++ph), Name: pick(FIRST) + ' ' + pick(LAST), Role:'PS',
                   Mandal:m, GP: m.replace(/[^A-Za-z]/g,'').slice(0,5) + 'pally ' + (i+1), Active:'TRUE' });
    }
    users.push({ Phone:String(++ph), Name: pick(FIRST)+' '+pick(LAST), Role:'MPDO', Mandal:m, GP:'', Active:'TRUE' });
    users.push({ Phone:String(++ph), Name: pick(FIRST)+' '+pick(LAST), Role:'MPO',  Mandal:m, GP:'', Active:'TRUE' });
  });
  env.mkSheet('Users', U, users);
  env.sheets['Users'].rows.slice(1).forEach(r => {
    const p = c.phone10_(r[0]); if(p) r[U.indexOf('Hash')] = c.hash_(p, '1111');
  });
  const cdm = env.post({ kind:'login', u:'9000000001', p:'1111' }).token;

  /* The Secretary the field app is driven as is held back from both, on
     purpose: the browser test has to see the screen an officer who has done
     NEITHER is shown, and then drive him through doing both. */
  const officers = users.filter(u => u.Role !== 'COLLECTOR');
  const her = officers.find(u => u.Role === 'PS');
  officers.forEach(u => {
    if(u.Phone === her.Phone) return;
    if(rnd() < 0.34) return;
    const tok = env.post({ kind:'login', u:u.Phone, p:'1111' }).token;
    const ext = rnd() < 0.7 ? 'pdf' : (rnd() < 0.5 ? 'docx' : 'xlsx');
    env.post({ kind:'gpdp', token:tok,
      file:{ name:(u.GP || u.Mandal) + ' GPDP 2026-27.' + ext, b64: b64(200 + Math.floor(rnd()*3000)) } });
  });

  /* AN EARLIER CIRCULAR, SINCE RETIRED. The district has issued more than one,
     and the console must go on showing every one of them with the receipts it
     collected — publishing a new circular retires the standing one, it has
     never deleted it. */
  const older = env.post({ kind:'advPublish', token:cdm, title:'Chlorination of drinking water sources',
             message:'Every source in the panchayat to be chlorinated and the register signed before Friday.',
             audience:'PS', mandals:['Jangaon', 'Chilpur'] });
  officers.forEach(u => {
    if(u.Phone === her.Phone) return;
    if(u.Role !== 'PS' || ['Jangaon','Chilpur'].indexOf(u.Mandal) < 0) return;
    if(rnd() < 0.3) return;
    const tok = env.post({ kind:'login', u:u.Phone, p:'1111' }).token;
    env.post({ kind:'advAck', token:tok });
  });

  /* the circular now standing, and about half the district has read it */
  env.post({ kind:'advPublish', token:cdm, title:'PS MPDO MPO Health Advisory',
             message: MSG, audience:'ALL',
             file:{ name:'PS MPDO MPO HEALTH ADVISORY.pdf', b64: b64(9000) } });
  officers.forEach(u => {
    if(u.Phone === her.Phone) return;
    if(rnd() < 0.48) return;
    const tok = env.post({ kind:'login', u:u.Phone, p:'1111' }).token;
    env.post({ kind:'advAck', token:tok });
  });

  const herTok = env.post({ kind:'login', u:her.Phone, p:'1111' }).token;

  return {
    gpdpDistrict: env.get('gpdp', { token: cdm }),
    advDistrict:  env.get('advisory', { token: cdm }),
    /* the same register, rebuilt against the circular already retired — what
       the console asks for when the Collector opens one out of the history */
    advRetired:   env.get('advisory', { token: cdm, id: older.id }),
    gpdpOfficer:  env.get('gpdp', { token: herTok }),
    advOfficer:   env.get('advisory', { token: herTok }),
    officer: { name: her.Name, role: her.Role, phone: her.Phone, mandal: her.Mandal,
               gp: her.GP, gps: [her.GP] }
  };
}

const out = path.join(__dirname, 'fixture-docs.json');
const d = build();
fs.writeFileSync(out, JSON.stringify(d));
console.log('GPDP    : ' + d.gpdpDistrict.totals.uploaded + ' filed of ' + d.gpdpDistrict.totals.due +
            '  (' + d.gpdpDistrict.year + ')');
console.log('ADVISORY: ' + d.advDistrict.totals.acknowledged + ' read of ' + d.advDistrict.totals.due +
            '  "' + d.advDistrict.advisory.title + '"');
console.log('HISTORY : ' + (d.advDistrict.list || []).length + ' circular(s) on the register  ' +
            (d.advDistrict.list || []).map(x => x.acknowledged + '/' + x.due + ' ' + x.status).join(' · '));
console.log('officer : ' + d.officer.name + ' (' + d.officer.role + ', ' + d.officer.gp + ')' +
            '  plan filed: ' + (d.gpdpOfficer.mine ? 'yes' : 'no') +
            ', advisory read: ' + (d.advOfficer.acknowledged ? 'yes' : 'no'));
console.log('written : ' + out);

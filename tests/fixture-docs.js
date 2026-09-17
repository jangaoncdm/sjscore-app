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
                   Mandal:'', GP:'', Email:'cdm@mock.example', Active:'TRUE' },
                 { Phone:'9000000002', Name:'K. Srinivas Rao',  Role:'DPO',  Mandal:'', GP:'', Active:'TRUE' },
                 { Phone:'9000000003', Name:'B. Anitha Kumari', Role:'DLPO', Mandal:'', GP:'', Active:'TRUE' }];
  const gps = [];
  let ph = 9100000000;
  MANDALS.forEach((m, mi) => {
    const n = 4 + (mi % 3);
    for(let i = 0; i < n; i++){
      const gp = m.replace(/[^A-Za-z]/g,'').slice(0,5) + 'pally ' + (i+1);
      gps.push({ Mandal:m, GP:gp });
      users.push({ Phone:String(++ph), Name: pick(FIRST) + ' ' + pick(LAST), Role:'PS',
                   Mandal:m, GP: gp, Active:'TRUE' });
    }
    users.push({ Phone:String(++ph), Name: pick(FIRST)+' '+pick(LAST), Role:'MPDO', Mandal:m, GP:'', Active:'TRUE' });
    users.push({ Phone:String(++ph), Name: pick(FIRST)+' '+pick(LAST), Role:'MPO',  Mandal:m, GP:'', Active:'TRUE' });
  });
  env.mkSheet('Users', U, users);
  /* the village roll and an empty Inspections tab, so the filing schedule has
     a pendency to allocate and a record to read what is filed off */
  env.mkSheet('GPs', ['Mandal','GP'], gps);
  env.mkSheet('Inspections', env.eval('HEADERS'), []);
  env.mkSheet('Holidays', ['Date','Occasion'], []);
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

  /* ---- THE FILING SCHEDULE ----
     Published by the real backend. The caps are scaled to this fixture's
     district the way fixture-dashboard.js scales them, so that both shapes are
     on the screen: a district officer working whole mandals, and a mandal's
     MPO and MPDO named together on the rest. The officer the app is then
     driven as is an MPDO with villages, a day for each of them, and a message
     from the Collector waiting — because the schedule card, the modal and the
     day-by-day list are what this section has to look at. */
  env.post({ kind:'schedulePublish', token:cdm, dpoCap:6, dlpoCap:6 });
  const him = users.find(u => u.Role === 'MPDO');
  const himTok = env.post({ kind:'login', u:him.Phone, p:'1111' }).token;
  /* a village or two already filed by his own hand, so his list has both a
     line that is closed and lines that are not */
  const mineFirst = env.get('schedule', { token: himTok });
  ((mineFirst.mine || {}).rows || []).slice(0, 2).forEach((r, i) => {
    env.post({ kind:'inspection', token: himTok, record:{
      id: r.gp + '|' + mineFirst.ym, ym: mineFirst.ym, mandal: r.mandal, gp: r.gp,
      date: r.dueDate || '2026-08-23', score: 71 + i * 9, grade:'B' } });
  });
  env.post({ kind:'schedNudge', token:cdm, to:him.Phone, nudge:'MESSAGE',
             text:'Take the mandal headquarters villages first; the rest can follow.' });

  const schedOfficer = env.get('schedule', { token: himTok });
  const schedDistrict = env.get('schedule', { token: cdm, all:'1' });
  /* NOBODY IS BEHIND ON THE DAY A SCHEDULE IS PUBLISHED, and that is the
     honest reading, not a shortcoming of the fixture. The behind-pace card is
     a later morning's screen, so the clock is moved on five days with nothing
     further filed and the same officer is read again. Both are kept: the app
     has to be looked at on the first day and on the fifth. */
  env.setNow('2026-08-28T09:15:00+05:30');
  const schedOfficerLate = env.get('schedule', { token: himTok });
  env.setNow('2026-08-23T11:20:00+05:30');

  return {
    schedOfficer: schedOfficer,
    schedOfficerLate: schedOfficerLate,
    schedDistrict: schedDistrict,
    schedWho: { name: him.Name, role: him.Role, phone: him.Phone, mandal: him.Mandal, gp: '', gps: [] },
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
const so = d.schedOfficer || {};
console.log('SCHEDULE: ' + (d.schedDistrict.district || {}).villages + ' villages over ' +
            ((d.schedDistrict.district || {}).officers || []).length + ' officers');
console.log('  driven : ' + d.schedWho.name + ' (' + d.schedWho.role + ', ' + d.schedWho.mandal + ')  ' +
            ((so.mine && (so.mine.filed + ' of ' + so.mine.assigned + ' filed, ' + so.mine.behind + ' behind')) || 'no lines') +
            '  · ' + (so.nudges || []).length + ' message(s) waiting');
console.log('  day 5  : ' + ((d.schedOfficerLate.mine || {}).behind) + ' behind, ' +
            ((d.schedOfficerLate.mine || {}).dueByToday) + ' due by then');
console.log('written : ' + out);

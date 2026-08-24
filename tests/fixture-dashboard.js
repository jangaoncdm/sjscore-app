/* Builds a realistic dashboard payload by running the REAL backend under the
   Apps Script mock, and writes it to a JSON file. The render pass drives the
   console against this, so what gets screenshotted is the console reading the
   district's own response shape — not a hand-written stub that agrees with
   whatever the console happens to expect.

   Usage: node tests/fixture-dashboard.js <out.json> */
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

/* deterministic pseudo-random: the fixture must be the same every run, or a
   screenshot diff is noise */
let seed = 20260822;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = a => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

function build(){
  const env = mock.load({ now: '2026-08-21T17:05:00+05:30' });
  const c = env.ctx;
  const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'];

  /* WHERE EACH MANDAL SITS. The marks used to be scattered at random over the
     whole district, which made a distance from the officer's own mandal
     meaningless — every officer looked 40 km from home. They are now laid
     around a point per mandal, the way real marks fall. */
  const HOME = {};
  MANDALS.forEach((m, i) => {
    HOME[m] = { lat: 17.62 + (i % 4) * 0.14, lng: 79.02 + Math.floor(i / 4) * 0.16 };
  });
  /* and two officers who marked from far outside their mandal — the case the
     district reported: "verified · ±31 m" against a phone 60-odd km away. */
  const AWAY_PH = {};

  const users = [{ Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR',
                   Mandal:'', GP:'', Email:'cdm@mock.example', Active:'TRUE' }];
  const gps = [];
  let ph = 9100000000;
  MANDALS.forEach((m, mi) => {
    const n = 5 + (mi % 4);                       /* 5–8 villages a mandal */
    for(let i = 0; i < n; i++){
      const gp = m.replace(/[^A-Za-z]/g, '').slice(0, 5) + 'pally ' + (i + 1);
      gps.push({ Mandal: m, GP: gp });
      users.push({ Phone: String(++ph), Name: pick(FIRST) + ' ' + pick(LAST), Role: 'PS',
                   Mandal: m, GP: gp, Email: '', Active: 'TRUE' });
    }
    users.push({ Phone: String(++ph), Name: pick(FIRST) + ' ' + pick(LAST), Role: 'MPDO', Mandal: m, GP: '', Active:'TRUE' });
    users.push({ Phone: String(++ph), Name: pick(FIRST) + ' ' + pick(LAST), Role: 'MPO',  Mandal: m, GP: '', Active:'TRUE' });
    users.push({ Phone: String(++ph), Name: pick(FIRST) + ' ' + pick(LAST), Role: 'MSO',  Mandal: m, GP: '', Active:'TRUE' });
  });
  env.mkSheet('Users', U, users);
  const sh = env.sheets['Users'];
  sh.rows.slice(1).forEach(r => {
    if(c.phone10_(r[0]) === '9000000001') r[U.indexOf('Hash')] = c.hash_('9000000001', '9999');
  });
  const token = env.post({ kind:'login', u:'9000000001', p:'9999' }).token;

  env.mkSheet('GPs', ['Mandal','GP'], gps);
  env.mkSheet('Holidays', ['Date','Occasion'], [{ Date:'2026-08-15', Occasion:'Independence Day' }]);

  /* this month's filings — a real spread of scores, some red flags */
  const insp = [];
  gps.forEach((g, i) => {
    if(i % 5 === 3) return;                       /* some villages not filed yet */
    const score = Math.max(28, Math.min(97, Math.round(64 + (rnd() - 0.42) * 52)));
    const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D';
    insp.push({ id:'I' + i, ym:'2026-08', mandal:g.Mandal.toUpperCase(), gp:g.GP,
      date:'2026-08-' + String(4 + (i % 16)).padStart(2,'0'), score:score, grade:grade,
      rf: score < 45 && i % 3 === 0 ? 'RF' + (1 + i % 3) : '',
      officer: users.find(u => u.GP === g.GP).Name,
      lat: 17.6 + rnd() * 0.5, lng: 79.0 + rnd() * 0.45 });
  });
  /* two earlier months, so the score trend has something to draw */
  ['2026-06','2026-07'].forEach((ym, k) => {
    gps.forEach((g, i) => {
      if(i % 4 === 2) return;
      const score = Math.max(30, Math.min(95, Math.round((58 + k * 4) + (rnd() - 0.45) * 46)));
      insp.push({ id:'I' + ym + i, ym:ym, mandal:g.Mandal.toUpperCase(), gp:g.GP,
        date: ym + '-1' + (i % 9), score:score,
        grade: score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D',
        rf:'', officer: users.find(u => u.GP === g.GP).Name });
    });
  });
  env.mkSheet('Inspections', env.eval('HEADERS'), insp);

  /* a fortnight of attendance, and today's marks with a spread of fix quality */
  const days = [];
  for(let k = 13; k >= 0; k--){
    const d = new Date(Date.parse('2026-08-21T12:00:00+05:30') - k * 86400000);
    days.push(d.toISOString().slice(0, 10));
  }
  const marking = users.filter(u => u.Role !== 'COLLECTOR' && u.Role !== 'MSO');
  /* two of them, picked steadily so the fixture is the same every run */
  [7, 22, 43, 61].forEach(i => { if(marking[i]) AWAY_PH[marking[i].Phone] = true; });
  /* the officers whose leave the Collector has sanctioned for today. They are
     chosen BEFORE the marking loop and skipped in it: an officer on sanctioned
     leave rightly writes no attendance row, and the console must show him on
     leave rather than absent. That is rule 9, and the fixture has to exercise
     it or the amber segment is never drawn on any screenshot. */
  const onLeaveToday = marking.slice(3, 9).map(u => u.Phone);
  const TODAY = days[days.length - 1];
  days.forEach(day => {
    const dow = new Date(day + 'T12:00:00+05:30').getDay();
    if(dow === 0) return;
    marking.forEach((u, i) => {
      if(day === TODAY && onLeaveToday.indexOf(u.Phone) >= 0) return;
      if(rnd() < 0.12) return;                    /* the day's absentees */
      const hour = 8 + (rnd() < 0.75 ? int(0,2) : int(3,6));
      const at = day + 'T' + String(hour).padStart(2,'0') + ':' + String(int(0,59)).padStart(2,'0') + ':00+05:30';
      const good = rnd() < 0.78;
      const hm2 = HOME[u.Mandal] || { lat:17.72, lng:79.14 };
      /* A MARK MADE NOWHERE NEAR THE MANDAL, and a precise one at that — the
         reading is better than most of the honest ones, which is exactly how
         the word "verified" came to be read as proof of presence. */
      const away = day === TODAY && AWAY_PH[u.Phone];
      env.mark(u.Phone, day, at, at, {
        name:u.Name, role:u.Role, mandal:u.Mandal,
        lat: away ? 17.40 + rnd()*0.02
           : good ? hm2.lat + (rnd()-0.5)*0.05
           : (rnd() < 0.5 ? hm2.lat + (rnd()-0.5)*0.05 : 12.9 + rnd()*0.3),
        lng: away ? 78.46 + rnd()*0.02
           : good ? hm2.lng + (rnd()-0.5)*0.05
           : hm2.lng + (rnd()-0.5)*0.05,
        accuracy: away ? int(9, 34) : good ? int(6, 60) : int(300, 2400),
        verified: (away || good) ? 'true' : 'false',
        timezone: rnd() < 0.985 ? 'Asia/Calcutta' : 'Asia/Dubai',
        skew: rnd() < 0.9 ? 0 : int(-900, 900)
      });
    });
  });

  const lv = [];
  onLeaveToday.forEach((phone, i) => {
    const u = marking.find(x => x.Phone === phone);
    lv.push({ id:'LV' + i, phone:u.Phone, name:u.Name, role:u.Role, mandal:u.Mandal,
      type: pick(['CL','OH']), fromDate: TODAY, toDate: TODAY, days:1,
      status:'APPROVED', appliedAt:'2026-08-20T10:00:00.000Z', reason:'Personal' });
  });
  /* three still awaiting the Collector's orders — they cover nothing yet */
  for(let i = 0; i < 3; i++){
    const u = marking[int(0, marking.length - 1)];
    lv.push({ id:'LVP' + i, phone:u.Phone, name:u.Name, role:u.Role, mandal:u.Mandal,
      type:'CL', fromDate:'2026-08-24', toDate:'2026-08-25', days:2,
      status:'PENDING', appliedAt:'2026-08-21T03:00:00.000Z', reason:'Personal' });
  }
  env.mkSheet('Leave', env.eval('L_HEAD'), lv);

  const d = env.get('dashboard', { token: token });
  if(d.ok === false) throw new Error('the backend refused: ' + d.error);
  return d;
}

const out = process.argv[2] || path.join(__dirname, 'fixture-dashboard.json');
const data = build();
fs.writeFileSync(out, JSON.stringify(data));
console.log('officers on the roll : ' + data.totals.officers);
console.log('present today        : ' + data.today.present.length);
console.log('on leave / not marked: ' + data.today.onLeave.length + ' / ' + data.today.absent.length);
console.log('villages filed       : ' + data.month.rows.length + '  grades ' + JSON.stringify(data.month.grades));
console.log('mandals              : ' + data.coverage.length);
console.log('trend months         : ' + (data.trend || []).length);
console.log('written              : ' + out);

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
                   Mandal:'', GP:'', Email:'cdm@mock.example', Active:'TRUE' },
                 /* the two district offices the filing schedule assigns to */
                 { Phone:'9000000002', Name:'K. Srinivas Rao', Role:'DPO',
                   Mandal:'', GP:'', Email:'dpo@mock.example', Active:'TRUE' },
                 { Phone:'9000000003', Name:'B. Anitha Kumari', Role:'DLPO',
                   Mandal:'', GP:'', Email:'dlpo@mock.example', Active:'TRUE' }];
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

  /* ---- THE FILING SCHEDULE, published by the real backend ----
     The caps are scaled to this fixture's district, not left at the
     Collector's sixty: seventy-eight villages with sixty to each office would
     put the whole district on two men and the console's officer table would
     have two lines in it. Five each leaves both shapes on the screen — a
     district officer working whole mandals, and a mandal's MPO and MPDO
     named together on the rest — which is what the render pass has to look at.
     The allocation rule being exercised is the real one; only the figure that
     the Collector's order sets is scaled. */
  const pub = env.post({ kind:'schedulePublish', token:token, dpoCap:5, dlpoCap:5 });
  if(pub.ok === false) throw new Error('the schedule was refused: ' + pub.error);
  /* A SCHEDULE WITH NOTHING FILED AGAINST IT IS THE FIRST MORNING OF ONE, and
     the console has to be looked at on a later morning too — a pace meter
     reads differently at nought than at two thirds. Some of the scheduled
     villages are therefore filed here, on days inside the window and on or
     before today, exactly as an officer's own filing would arrive. They are
     read back off the Inspections register like any other, never written to
     the Schedule tab: what is filed is never a stored label. */
  const pace0 = env.get('schedule', { token:token, all:'1' });
  const ish = env.sheets['Inspections'], ihd = ish.rows[0].map(String);
  let doneN = 0;
  ((pace0.district || {}).officers || []).forEach((o, oi) => {
    /* and some officers have filed nothing at all, because some have not —
       the console has to draw a man who is behind as well as one who is not */
    if(oi % 3 === 1) return;
    (o.rows || []).forEach((r, i) => {
      if(i % 3 !== 0) return;                      /* about a third of each list */
      if(r.dueDate && r.dueDate > TODAY) return;   /* nothing filed from the future */
      const row = new Array(ihd.length).fill('');
      const put = (k, v) => { const at = ihd.indexOf(k); if(at >= 0) row[at] = v; };
      const score = Math.max(34, Math.min(95, Math.round(66 + (rnd() - 0.45) * 46)));
      put('id', 'SCH' + (++doneN)); put('ym', '2026-08');
      put('mandal', r.mandal); put('gp', r.gp);
      put('date', r.dueDate || TODAY); put('score', score);
      put('grade', score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D');
      put('officer', o.name + ' (' + o.phone + ')');
      ish.rows.push(row);
    });
  });
  const someone = ((pace0.district || {}).officers || [])[0];
  if(someone) env.post({ kind:'schedNudge', token:token, to:someone.phone,
    nudge:'MESSAGE', text:'Take the mandal headquarters villages first; the rest can follow.' });
  /* These rows went onto the tab directly rather than through the endpoint, so
     the held reading of the pace knows nothing about them. The server drops it
     by itself on a real filing; a fixture writing behind its back has to say so. */
  env.cacheStore = {};

  /* and some officers have told the district they have read it, so the
     acknowledgement column on the console has both of its states in it */
  const ash = env.sheets['SchedAck'], ahd = ash.rows[0].map(String);
  ((pace0.district || {}).officers || []).forEach((o, oi) => {
    if(oi % 4 === 3) return;
    const row = new Array(ahd.length).fill('');
    const put = (k, v) => { const at = ahd.indexOf(k); if(at >= 0) row[at] = v; };
    put('ym', '2026-08'); put('phone', o.phone); put('name', o.name); put('role', o.role);
    put('mandal', (o.mandals || []).join(', '));
    put('ackAt', '2026-08-' + String(15 + (oi % 5)).padStart(2, '0') + 'T04:30:00.000Z');
    put('receivedAt', '2026-08-' + String(15 + (oi % 5)).padStart(2, '0') + 'T04:30:02.000Z');
    ash.rows.push(row);
  });
  env.ctx.scheduleReminders();
  const s = env.get('schedule', { token: token, all: '1' });
  if(s.ok === false) throw new Error('the schedule register refused: ' + s.error);

  return { dash: d, sched: s, pub: pub };
}

const out = process.argv[2] || path.join(__dirname, 'fixture-dashboard.json');
const built = build();
const data = built.dash;
fs.writeFileSync(out, JSON.stringify(data));
const sout = out.replace(/fixture-dashboard\.json$/, 'fixture-schedule.json');
fs.writeFileSync(sout === out ? path.join(__dirname, 'fixture-schedule.json') : sout,
                 JSON.stringify(built.sched));
console.log('officers on the roll : ' + data.totals.officers);
console.log('present today        : ' + data.today.present.length);
console.log('on leave / not marked: ' + data.today.onLeave.length + ' / ' + data.today.absent.length);
console.log('villages filed       : ' + data.month.rows.length + '  grades ' + JSON.stringify(data.month.grades));
console.log('mandals              : ' + data.coverage.length);
console.log('trend months         : ' + (data.trend || []).length);
const sd = built.sched.district || {};
console.log('schedule             : ' + sd.villages + ' villages over ' + (sd.officers || []).length +
  ' officers · ' + sd.filed + ' filed · ' + sd.behind + ' behind · ' + sd.workingDaysLeft + ' wd left');
console.log('  offices            : ' + (built.pub.offices || []).map(o => o.role + ' ' + o.villages).join(' · '));
console.log('written              : ' + out);

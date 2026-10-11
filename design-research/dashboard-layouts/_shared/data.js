/* ============================================================================
   SJGP SAMPLE DATA - shared by all ten mockups.

   WHAT IS REAL AND WHAT IS NOT.
   Real: the twelve mandal names of Jangaon district, the metric names, the
   grades A-D, the reporting-month window (10th to 9th), the five parts of the
   district health index, the notice ladder's vocabulary, the five-kilometre
   geo-fence and the three-kilometre place-of-duty threshold. Those are taken
   from app/dashboard.html and backend/Code.gs.

   NOT REAL: every officer name, every village name, every figure, every
   coordinate. They are generated below from a fixed seed, exactly as
   tests/fixture-dashboard.js does it, because THIS REPOSITORY IS PUBLIC and
   the district's roster carries personal mobile numbers. No mockup may show a
   real officer. A mockup that needs a believable name makes one up.
   ========================================================================== */
(function(){
'use strict';

/* deterministic: the same figures every run, or two screenshots of the same
   pattern differ for a reason that has nothing to do with the pattern */
let _s = 20261011;
const rnd = () => (_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = a => a[Math.floor(rnd() * a.length)];
const int  = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const MANDALS = ['Jangaon','Chilpur','Devaruppula','Ghanpur (Stn)','Kodakandla',
  'Lingala Ghanpur','Narmetta','Palakurthy','Raghunathpalle','Tharigoppula',
  'Bachannapeta','Zaffergadh'];

const FIRST = ['Anil','Bhavani','Chandra','Divya','Eshwar','Ganesh','Harika','Indra',
  'Jyothi','Kavitha','Lakshmi','Mahesh','Naveen','Padma','Ramesh','Sunitha',
  'Tarun','Usha','Venkat','Yadagiri','Srinivas','Manjula','Praveen','Sampath'];
const LAST = ['Reddy','Rao','Kumar','Sharma','Goud','Naik','Yadav','Chary','Babu','Devi'];
const VSTEM = ['Kistapur','Ananthasagar','Peddapalli','Mallampalli','Gudur','Nagaram',
  'Cherlapalli','Yellapur','Thimmapur','Rayaparthi','Oglapur','Devareddypalli',
  'Mustyala','Kothapalli','Bandanagaram','Sarvapur','Pembarthi','Edunuthula'];

const name = () => pick(FIRST) + ' ' + pick(LAST);

/* ---- the roll: 78 villages across 12 mandals ---- */
const villages = [];
MANDALS.forEach((m, mi) => {
  const n = [8,6,7,8,5,6,7,8,5,6,7,5][mi];
  for(let i = 0; i < n; i++){
    const score = int(41, 94);
    villages.push({
      gp: pick(VSTEM) + ' ' + (i + 1),
      mandal: m,
      score: score,
      grade: score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D',
      filed: rnd() < 0.5,
      rf: score < 50 && rnd() < 0.6 ? int(1, 3) : 0,
      officer: name(),
      placed: rnd() > 0.03,
      lat: 17.55 + rnd() * 0.42,
      lng: 78.95 + rnd() * 0.55
    });
  }
});
const filed = villages.filter(v => v.filed);

/* ---- the roll of officers ---- */
const ROLES = ['PS','PS','PS','PS','PS','PS','MPO','MPDO','MSO'];
const officers = [];
for(let i = 0; i < 284; i++){
  const m = pick(MANDALS), role = pick(ROLES);
  const r = rnd();
  officers.push({
    id: 'O' + (1000 + i),
    name: name(),
    role: role,
    mandal: m,
    gp: role === 'PS' ? pick(VSTEM) + ' ' + int(1, 8) : '',
    /* A WORKING DAY IN A DISTRICT THAT IS WORKING. The first cut put 24% of
       the roll unmarked, which turned the status wall in pattern 05 red in
       eight cells of twelve - and a wall that is two-thirds red is a wall
       nobody triages, which is the pre-flight's cry-wolf lesson in a
       different file. 88% marked is the shape of a real morning. */
    status: r < 0.88 ? 'present' : r < 0.93 ? 'leave' : r < 0.955 ? 'refused' : 'missing',
    at: String(int(8, 10)).padStart(2,'0') + ':' + String(int(0, 59)).padStart(2,'0'),
    acc: int(8, 180),
    dutyKm: +(rnd() * (rnd() < 0.12 ? 38 : 2.4)).toFixed(1),
    misses: r > 0.955 ? int(1, 5) : 0
  });
}
const by = s => officers.filter(o => o.status === s);

/* ---- the fourteen-day trend ---- */
const days = [];
for(let d = 13; d >= 0; d--){
  const dt = new Date(2026, 9, 9 - d);
  const sun = dt.getDay() === 0;
  days.push({
    d: dt.getDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()],
    iso: dt.toISOString().slice(0, 10),
    sun: sun,
    present: sun ? 0 : int(243, 262),
    leave:   sun ? 0 : int(3, 11),
    missing: sun ? 0 : int(8, 22),
    refused: sun ? 0 : int(0, 6),
    filed:   sun ? 0 : int(1, 6)
  });
}

/* ---- coverage by mandal ----
   carries LAST month as well, because every question worth asking of a
   mandal is a question about movement: 3 of 6 is a different fact when last
   month was 1 and when last month was 5. */
const coverage = MANDALS.map(m => {
  const all = villages.filter(v => v.mandal === m);
  const done = all.filter(v => v.filed).length;
  const sc = all.filter(v => v.filed).map(v => v.score);
  const avg = sc.length ? Math.round(sc.reduce((a,b) => a + b, 0) / sc.length) : null;
  return { mandal:m, done:done, total:all.length,
    pct: Math.round(done / all.length * 100),
    /* what the schedule says should be filed by today, not by month end */
    due: Math.round(all.length * 0.62),
    prevPct: Math.max(4, Math.min(100, Math.round(done / all.length * 100) + int(-26, 22))),
    avg: avg,
    prevAvg: avg == null ? null : Math.max(38, Math.min(97, avg + int(-9, 7))),
    officers: officers.filter(o => o.mandal === m).length,
    present: officers.filter(o => o.mandal === m && o.status === 'present').length,
    refused: officers.filter(o => o.mandal === m && o.status === 'refused').length,
    /* the mandal's own fortnight, as a percentage of its roll marked */
    series: days.map(d => d.sun ? null : int(72, 100)) };
});

/* ---- six reporting months, for the trend ----
   The district adopted the register on 20.07.2026, so July is short at the
   top and is marked as such rather than being drawn as a bad month. */
const months = [
  { ym:'May 2026',  avg:61, filed:48, of:78, part:false },
  { ym:'Jun 2026',  avg:64, filed:55, of:78, part:false },
  { ym:'Jul 2026',  avg:63, filed:31, of:78, part:true  },
  { ym:'Aug 2026',  avg:66, filed:62, of:78, part:false },
  { ym:'Sep 2026',  avg:69, filed:71, of:78, part:false },
  { ym:'Oct 2026',  avg:null, filed:null, of:78, part:false, running:true }
];

/* ---- when the district marks in: thirteen hours of one morning ----
   An ORDERED scale, so it is drawn in one hue light to dark and never in
   thirteen identities. */
const hours = [];
for(let hh = 6; hh <= 18; hh++){
  const peak = Math.exp(-Math.pow(hh - 9.4, 2) / 2.1);
  hours.push({ h:hh, n: Math.round(peak * 96) + (hh >= 8 && hh <= 11 ? int(0, 14) : int(0, 3)) });
}

/* ---- the exception queue: what actually needs orders ---- */
const issues = [
  { p:1, t:'23 attendance marks cannot be trusted as proof of presence',
    d:'Coarse fix, a phone not on Indian time, or coordinates outside the district.',
    a:'Ask each officer to mark again with location switched on.', view:'attendance', n:23 },
  { p:1, t:'4 officers refused by the geo-fence from the same distance every day',
    d:'A steady distance is the office recorded in the wrong place, not a wandering officer.',
    a:'Correct the village office before any notice is proposed.', view:'duty', n:4 },
  { p:2, t:'12 villages at grade D without a red flag',
    d:'Chilpur 5 (48), Pembarthi 7 (52), Kothapalli 1 (48), Gudur 3 (50).',
    a:'Direct a fortnightly re-visit; deficiencies carry into next month.', view:'villages', n:12 },
  { p:2, t:'3 leave applications waiting beyond 48 hours',
    d:'The oldest has waited 51 hours.',
    a:'Pass orders today - held days block fresh applications.', view:'leave', n:3 },
  { p:3, t:'20 villages still to evaluate, 10 working days left',
    d:'2 a day to close the month on the 9th.',
    a:'Chase Lingala Ghanpur and Bachannapeta first.', view:'villages', n:20 }
];

/* ---- leave awaiting orders ---- */
const leave = [];
for(let i = 0; i < 7; i++) leave.push({
  name: name(), role: pick(ROLES), mandal: pick(MANDALS),
  type: pick(['Casual','Medical','Earned','Optional holiday']),
  days: int(1, 6), from: int(12, 20) + ' Oct', waited: int(4, 51)
});

/* ---- the notice ladder ---- */
const notices = [
  { no:'—', name:name(), mandal:pick(MANDALS), misses:3, stage:'Proposed', day:'11 Oct' },
  { no:'—', name:name(), mandal:pick(MANDALS), misses:3, stage:'Proposed', day:'11 Oct' },
  { no:'SJSP-SCN/142', name:name(), mandal:pick(MANDALS), misses:5, stage:'Served', day:'08 Oct' },
  { no:'SJSP-SCN/141', name:name(), mandal:pick(MANDALS), misses:4, stage:'Acknowledged', day:'06 Oct' },
  { no:'SJSP-SCN/139', name:name(), mandal:pick(MANDALS), misses:6, stage:'Cured', day:'02 Oct' }
];

/* ---- the geo-fence screen ---- */
/* DERIVED, NEVER TYPED. The first cut carried the real district's 273 of 280
   beside a sample roll of 78 villages, so the same screen said both. Two
   figures for one thing is the duplication this whole study is about. */
const _unplaced = villages.filter(v => !v.placed).length;
const fence = {
  on: true, km: 5, total: villages.length,
  placed: villages.length - _unplaced, unplaced: _unplaced,
  refusedToday: by('refused').length,
  steady: [
    { name:name(), gp:'Mustyala 4', mandal:'Palakurthy', median:7.2, spread:0.4, days:9 },
    { name:name(), gp:'Gudur 2', mandal:'Chilpur', median:11.8, spread:0.3, days:7 },
    { name:name(), gp:'Nagaram 6', mandal:'Narmetta', median:6.1, spread:0.6, days:6 },
    { name:name(), gp:'Oglapur 3', mandal:'Zaffergadh', median:9.4, spread:0.5, days:5 }
  ],
  scattered: [
    { name:name(), gp:'Kistapur 1', mandal:'Jangaon', median:14.2, spread:22.6, days:4 },
    { name:name(), gp:'Yellapur 5', mandal:'Kodakandla', median:8.8, spread:17.1, days:3 }
  ]
};

/* ---- the filing schedule ---- */
const schedule = { published:true, from:'21 Sept', to:'9 Oct', workingDays:15,
  acknowledged:198, roll:247,
  behind: MANDALS.slice(0, 6).map(m => ({ mandal:m, set:int(6,14), filed:int(2,9), by:pick(['MPDO','MPO','MSO','DPO']) })) };

const present = by('present').length, onLeave = by('leave').length,
      missing = by('missing').length, refused = by('refused').length;
const grades = { A:filed.filter(v=>v.grade==='A').length, B:filed.filter(v=>v.grade==='B').length,
                 C:filed.filter(v=>v.grade==='C').length, D:filed.filter(v=>v.grade==='D').length };
const avg = Math.round(filed.reduce((a,v) => a + v.score, 0) / filed.length);

window.SJ = {
  district:'Jangaon', state:'Telangana',
  /* A WORKING DAY, DELIBERATELY. The attendance gate does not open on a
     Sunday, so a Sunday screen shows a roll of noughts and every layout below
     would be judged on an empty day. 9 October 2026 is a Friday. */
  today:'Friday, 9 October 2026',
  ym:'October 2026', window:'10 Oct - 9 Nov',
  prevWindow:'September 2026 · 10 Sept - 9 Oct',
  mandals: MANDALS, villages, filed, officers, days, coverage, issues, leave,
  notices, fence, schedule, grades, hours,
  /* the running month carries the figure the rest of the screen is showing,
     or the trend and the KPI beside it disagree about today */
  months: months.map(m => m.running
    ? Object.assign({}, m, { avg: avg, filed: filed.length }) : m),
  totals:{
    officers: officers.length, present, onLeave, missing, refused,
    villages: villages.length, filedN: filed.length, avg, prevAvg: avg - 2,
    rf: villages.filter(v => v.rf).length,
    unplaced: villages.filter(v => !v.placed).length,
    by10: Math.round(present * 0.82),
    health: 77,
    parts:[
      { k:'Attendance', v:null, why:'Sunday - not counted' },
      { k:'Coverage',   v:100,  why:'39 filed against 17 expected by now' },
      { k:'Scores',     v:67,   why:'district average 67' },
      { k:'Red flags',  v:100,  why:'0 of 39 filings flagged' },
      { k:'Leave desk', v:0,    why:'oldest waiting 51 h' }
    ]
  },
  fmt:{
    pct:(a,b) => b ? Math.round(a / b * 100) : 0,
    inits:n => String(n).split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase()
  }
};
})();

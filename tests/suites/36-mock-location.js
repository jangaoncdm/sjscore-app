/* A LOCATION THAT WAS NOT MEASURED — reading the register for a proxied fix.

   Asked from the district on 12.10.2026: officers are marking attendance
   through a location proxy, and how is it to be detected.

   The reading cannot see a proxy — the browser is never told whether a fix
   was mocked, and only a native Android app is — so it reads the consequence
   instead: a satellite fix moves by metres between one morning and the next,
   and a coordinate typed into a proxy app does not move at all.

   WHAT MUST HOLD, and most of it is about NOT accusing people:

     - a coordinate repeated across days while the handset claims satellite
       precision is named, worst first;
     - A WIFI FIX REPEATS HONESTLY. A village office with one router hands
       back the same coarse point every morning, and that officer must never
       appear as a finding — he is printed as what he is. He also must not
       drag the district's own baseline towards nought, or every genuinely
       still officer is then measured against a standard that is already
       still;
     - A RETRY IS NOT A SECOND MORNING. markCount exists because officers tap
       again, and those rows carry the same fix by construction: read the
       wrong way the officers with the WORST signal would top the list;
     - an officer with too few located days is reported as NOT JUDGED and
       never as a clean sheet — the report that quietly omits what it could
       not run is the fault this project already has a rule about;
     - a register with a blank accuracy column must not read as every officer
       reporting "exactly 0 m" every day;
     - it writes NOTHING, to any tab. */
'use strict';
const mock = require('../gasmock.js');

const A = ['id', 'date', 'phone', 'name', 'role', 'mandal', 'markedAt', 'lat', 'lng', 'accuracy',
           'verified', 'photo', 'timezone', 'receivedAt', 'status', 'leaveId', 'leaveType',
           'markCount', 'firstMarkAt', 'skew'];

/* the working days of the fortnight before 12.10.2026 */
const DAYS = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-05',
              '2026-10-06', '2026-10-07', '2026-10-08'];

let seq = 0;
function mark(o){
  seq++;
  return {
    id: 'att_' + seq, date: o.date, phone: o.phone, name: o.name,
    role: o.role || 'PS', mandal: o.mandal || 'Jangaon',
    markedAt: o.date + 'T09:10:00+05:30', receivedAt: o.date + 'T09:10:30Z',
    lat: o.lat, lng: o.lng, accuracy: o.acc === undefined ? 12 : o.acc,
    verified: 'TRUE', photo: 'ph_' + seq,
    timezone: o.tz || 'Asia/Calcutta', status: 'PRESENT'
  };
}

module.exports = {
  name: 'a location that was not measured (showMockLocations)',
  run(t){
    const env = mock.load({ admin: true, now: '2026-10-12T12:00:00+05:30' });
    const c = env.ctx;
    const rows = [];

    /* 1 — THE PROXY. One typed point, eight mornings, and the handset
           asserting a satellite's precision for a place it never measured. */
    DAYS.forEach(d => rows.push(mark({
      date: d, phone: '9000000001', name: 'P. Ravi', mandal: 'Jangaon',
      lat: 17.721000, lng: 79.180000, acc: 5
    })));

    /* 2 — AN HONEST OFFICER. The same desk every morning, and no two fixes
           alike, because that is what a measurement is. */
    const jit = [0, 0.00022, -0.00014, 0.00031, -0.00025, 0.00017, -0.00009, 0.00028];
    DAYS.forEach((d, i) => rows.push(mark({
      date: d, phone: '9000000002', name: 'K. Ramesh', mandal: 'Devaruppula',
      lat: 17.730000 + jit[i], lng: 79.190000 - jit[(i + 3) % 8], acc: 8 + (i * 3) % 19
    })));

    /* 3 — THE WIFI FIX. Identical to seven decimals, six mornings running,
           and entirely innocent: the handset says plainly it is vague. */
    DAYS.slice(0, 6).forEach(d => rows.push(mark({
      date: d, phone: '9000000003', name: 'S. Latha', mandal: 'Chilpur',
      lat: 17.740000, lng: 79.200000, acc: 1200
    })));

    /* 4 — THE RETRIER. One morning, six taps, one fix. He has ONE located
           day and must be read as one. */
    for(let k = 0; k < 6; k++) rows.push(mark({
      date: '2026-10-07', phone: '9000000004', name: 'M. Anil', mandal: 'Palakurthy',
      lat: 17.750000, lng: 79.210000, acc: 6
    }));

    /* 5 — TOO FEW DAYS to say anything about at all. */
    rows.push(mark({ date: '2026-10-06', phone: '9000000005', name: 'D. Suresh',
      mandal: 'Zaffergadh', lat: 17.760000, lng: 79.220000, acc: 9 }));
    rows.push(mark({ date: '2026-10-07', phone: '9000000005', name: 'D. Suresh',
      mandal: 'Zaffergadh', lat: 17.760180, lng: 79.220090, acc: 14 }));

    /* 6 — A BLANK ACCURACY COLUMN. Scattered marks, no accuracy recorded:
           this must not read as "exactly ±0 m on every one of 8 days". */
    DAYS.forEach((d, i) => rows.push(mark({
      date: d, phone: '9000000006', name: 'B. Gopal', mandal: 'Kodakandla',
      lat: 17.770000 + jit[i], lng: 79.230000 + jit[(i + 5) % 8], acc: ''
    })));

    /* 7 — A HANDSET REPORTING ANOTHER COUNTRY'S CLOCK. */
    DAYS.forEach((d, i) => rows.push(mark({
      date: d, phone: '9000000007', name: 'T. Nag', mandal: 'Lingala Ghanpur',
      lat: 17.780000 + jit[i], lng: 79.240000 - jit[(i + 2) % 8], acc: 11 + i,
      tz: 'Asia/Dubai'
    })));

    /* 8 — OUTSIDE THE WINDOW. A proxy five months ago is not this reading's
           business and must not appear in it. */
    ['2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08'].forEach(d => rows.push(mark({
      date: d, phone: '9000000008', name: 'O. Oldmark', mandal: 'Ghanpur (Stn)',
      lat: 17.790000, lng: 79.250000, acc: 4
    })));

    env.mkSheet('Attendance', env.eval('A_HEAD'), rows);   /* the register's own header, so a column added since is not read as a touch */

    const before = JSON.stringify(env.sheets['Attendance'].rows);
    const sheetsBefore = Object.keys(env.sheets).sort().join(',');
    const out = c.showMockLocations();

    /* ---- it writes nothing ---- */
    t.eq(JSON.stringify(env.sheets['Attendance'].rows), before,
      'the reading does not touch a single attendance row');
    t.eq(Object.keys(env.sheets).sort().join(','), sheetsBefore,
      'and it creates no tab of its own — nothing is written anywhere');
    t.contains(out, 'read only', 'and it says so at the top');

    /* ---- the proxy is found, and named first ---- */
    t.contains(out, 'P. Ravi', 'the officer marking from one typed point is named');
    t.contains(out, 'NEAR CERTAIN', 'and at the top tier, because eight identical mornings is not a measurement');
    t.ok(/1\.\s+P\. Ravi/.test(out), 'he is first in the list — worst first');
    t.contains(out, '17.721000, 79.180000', 'the coordinate itself is printed, so it can be looked up');
    t.ok(/8 different days/.test(out), 'and how many days share it');

    /* ---- THE WIFI FIX IS NOT AN ACCUSATION ---- */
    const findings = out.split('REPEATED, BUT HONESTLY SO')[0];
    t.ok(findings.indexOf('S. Latha') < 0,
      'the officer on a vague repeated fix is NOT among the findings');
    t.contains(out, 'REPEATED, BUT HONESTLY SO',
      'he is printed under his own heading instead');
    t.ok(out.indexOf('S. Latha') > out.indexOf('REPEATED, BUT HONESTLY SO'),
      'and that is where he appears');

    /* ---- a retry is not a second morning ---- */
    t.ok(findings.indexOf('M. Anil') < 0,
      'six taps on one morning are not six mornings, so the retrier is not a finding');
    t.contains(out, 'retries folded away: 5',
      'the five extra rows of that morning are counted and declared');
    t.ok(/NOT JUDGED/.test(out) && out.split('NOT JUDGED')[1].indexOf('M. Anil') >= 0,
      'he is reported as not judged — one located day says nothing either way');

    /* ---- too few days is not a clean sheet ---- */
    t.ok(out.split('NOT JUDGED')[1].indexOf('D. Suresh') >= 0,
      'an officer with two located days is listed as not judged');
    t.contains(out, 'They are not a clean sheet',
      'and the report says in as many words that this is not an acquittal');

    /* ---- a blank accuracy column accuses nobody ---- */
    t.ok(findings.indexOf('B. Gopal') < 0,
      'an officer whose accuracy was never recorded is not flagged for it');
    t.ok(!/exactly ±0 m/.test(out),
      'and nothing in the report reads as "exactly 0 m on every day"');

    /* ---- the clock of another country is worth a look, no more ---- */
    t.contains(out, 'T. Nag', 'a handset reporting a foreign timezone is raised');
    t.contains(out, 'WORTH A LOOK', 'at the lowest tier');
    t.contains(out, 'Asia/Dubai', 'naming what it actually said');

    /* A COORDINATE IS ONLY PRINTED WHERE A COORDINATE IS THE FINDING. Nothing
       of his repeats, and printing his largest cluster — one arbitrary
       morning — reads to the Collector as a repeat that was never found. */
    const nag = out.split('T. Nag')[1].split('\n').slice(0, 4).join('\n');
    t.ok(!/17\.78\d+, 79\.2\d+/.test(nag),
      'an officer raised for his clock is given no coordinate line');
    t.contains(nag, 'nothing of his repeats',
      'he is told plainly that nothing of his repeats');

    /* ---- the window is respected ---- */
    t.ok(out.indexOf('O. Oldmark') < 0,
      'marks older than the window are not read at all');

    /* ---- THE BASELINE IS THE HONEST OFFICERS, NOT THE STILL ONES ---- */
    const base = /scatter by a\s*\n?\s*median of (\d+) m/.exec(out) ||
                 /median of (\d+) m/.exec(out);
    t.ok(!!base, 'the district’s own scatter is printed, so a flag has a scale');
    t.ok(base && Number(base[1]) > 3,
      'and it is the real officers’ figure (' + (base ? base[1] : '?') +
      ' m) — the wifi officer’s nought is kept out of it');

    /* ---- the honest limit is stated, not buried ---- */
    t.contains(out, 'IT CANNOT SEE A PROXY DIRECTLY',
      'the report says plainly what it cannot do');
    t.contains(out, 'names the careless, not the careful',
      'and that a patient proxy defeats it');
    t.contains(out, 'photograph',
      'and points at the one thing that actually settles it');

    /* ---- a window with nothing in it is not a pass mark ---- */
    const env2 = mock.load({ admin: true, now: '2026-10-12T12:00:00+05:30' });
    env2.mkSheet('Attendance', env2.eval('A_HEAD'), []);
    const empty = env2.ctx.showMockLocations();
    t.contains(empty, 'NOTHING STANDS OUT', 'an empty register reports nothing standing out');
    t.contains(empty, 'not proof nobody is doing it',
      'and refuses to be read as proof that nobody is doing it');
  }
};

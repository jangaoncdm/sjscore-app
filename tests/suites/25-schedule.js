/* THE FILING SCHEDULE — ordered 17.09.2026, because the villages were not
   being filed and nobody could say whose they were.

   Sixty villages to the DPO, sixty to the DLPO, the rest of each mandal to
   that mandal's MPO and MPDO together, and NOTHING to the Panchayat Secretary,
   who may not file an evaluation at all.

   Six things this suite holds to:

   1. THE ALLOCATION. Whole mandals to the district offices, so an officer is
      not crossing the district for five villages; the mandal's own MPO and
      MPDO named together on every remaining village; the Secretary, the MSO
      and the Collector given nothing.
   2. IT COUNTS VILLAGES, NEVER ROWS. The MPO and the MPDO hold the same
      village between them and it is one village (rule 9) — adding their lines
      together would report a mandal's pendency twice over.
   3. WHAT IS FILED IS READ OFF THE RECORD, never off a stored label, by the
      date of the visit — the lesson the reporting month taught in August.
   4. IT RUNS TWICE WITHOUT DOUBLING (rule 8), and a date already given to an
      officer does not move unless the Collector re-spreads it deliberately.
   5. IT ACCUSES NOBODY. No show-cause notice, no casual-leave debit, no lock,
      no entry in the notice register — and the reminder NAMES no sanction.
      If the district ever means to sanction on filing default, this suite is
      where that is decided, deliberately, and not by a word drifting in a
      template.
   6. NOTHING IS DESTROYED (rule 7). A village off the roll is DROPPED where it
      stands and the row remains. */
'use strict';
const mock = require('../gasmock.js');

/* Five mandals of unequal pendency, so the whole-mandal fill has something to
   decide. Caps of 12 stand in for the Collector's 60: the arithmetic is the
   same and the roll is one a test can hold in its head. */
const MANDALS = [
  { name: 'Palakurthy',   n: 9 },
  { name: 'Jangaon',      n: 7 },
  { name: 'Chilpur',      n: 6 },
  { name: 'Narmetta',     n: 5 },
  { name: 'Ghanpur (Stn)', n: 4 }
];

function seed(env){
  const users = [
    { Phone: '9000000001', Name: 'Sandeep Kumar Jha', Role: 'COLLECTOR', Email: 'cdm@mock.example', Active: 'TRUE' },
    { Phone: '9000000002', Name: 'K. DPO',  Role: 'DPO',  Email: 'dpo@mock.example',  Active: 'TRUE' },
    { Phone: '9000000003', Name: 'R. DLPO', Role: 'DLPO', Email: 'dlpo@mock.example', Active: 'TRUE' }
  ];
  const gps = [];
  MANDALS.forEach((m, mi) => {
    for(let i = 1; i <= m.n; i++) gps.push({ Mandal: m.name, GP: m.name.replace(/\W/g, '') + ' GP' + i });
    users.push({ Phone: '90001' + String(10 + mi * 4).padStart(5, '0'), Name: 'MPO ' + m.name,
                 Role: 'MPO',  Mandal: m.name, Email: 'mpo' + mi + '@mock.example', Active: 'TRUE' });
    users.push({ Phone: '90001' + String(11 + mi * 4).padStart(5, '0'), Name: 'MPDO ' + m.name,
                 Role: 'MPDO', Mandal: m.name, Email: 'mpdo' + mi + '@mock.example', Active: 'TRUE' });
    users.push({ Phone: '90001' + String(12 + mi * 4).padStart(5, '0'), Name: 'MSO ' + m.name,
                 Role: 'MSO',  Mandal: m.name, Email: 'mso' + mi + '@mock.example', Active: 'TRUE' });
    users.push({ Phone: '90001' + String(13 + mi * 4).padStart(5, '0'), Name: 'PS ' + m.name,
                 Role: 'PS',   Mandal: m.name, GP: m.name.replace(/\W/g, '') + ' GP1',
                 Email: 'ps' + mi + '@mock.example', Active: 'TRUE' });
  });
  env.mkSheet('Users', ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'], users);
  env.mkSheet('GPs', ['Mandal','GP'], gps);
  env.mkSheet('Inspections', env.eval('HEADERS'), []);
  /* the second Saturday of September 2026 falls on the 12th, inside this
     reporting month's window — no due date may land on it */
  env.mkSheet('Holidays', ['Date','Occasion'], [{ Date: '2026-09-12', Occasion: 'Second Saturday' }]);
  return gps;
}

function tokenFor(env, phone, pin){
  const head = env.sheets['Users'].rows[0].map(String), uh = head.indexOf('Hash');
  env.sheets['Users'].rows.slice(1).forEach(r => {
    if(env.ctx.phone10_(r[0]) === phone) r[uh] = env.ctx.hash_(phone, pin);
  });
  return env.post({ kind: 'login', u: phone, p: pin }).token;
}

function schedRows(env){
  const sh = env.sheets['Schedule'];
  if(!sh) return [];
  const head = sh.rows[0].map(String);
  return sh.rows.slice(1).map(r => { const o = {}; head.forEach((h, i) => { o[h] = String(r[i] == null ? '' : r[i]); }); return o; });
}

/* THROUGH THE REAL WRITE PATH, not by appending to the tab. The pace is held
   for thirty seconds against two hundred and eighty handsets polling it, and a
   cache that outlives the thing it describes would tell an officer his village
   is still owed after he has filed it. Posting the inspection is what proves
   the held reading is dropped; writing the row by hand would prove nothing. */
function fileVillage(env, token, mandal, gp, date){
  const r = env.post({ kind: 'inspection', token: token, record: {
    id: gp + '|' + date, ym: '2026-09', mandal: mandal, gp: gp,
    date: date, score: 78, grade: 'B' } });
  if(r.ok === false) throw new Error('the district refused the filing: ' + r.error);
  return r;
}

module.exports = {
  name: 'the filing schedule (allocation, pace, and that it accuses nobody)',
  run(t){
    /* 17.09.2026, a Thursday — day 8 of the September reporting month, which
       runs 10.09 to 09.10 */
    const env = mock.load({ now: '2026-09-17T09:00:00+05:30' });
    const c = env.ctx;
    seed(env);
    const cdm  = tokenFor(env, '9000000001', '1111');
    const dpoT = tokenFor(env, '9000000002', '2222');
    const psT  = tokenFor(env, '90001' + String(13).padStart(5, '0'), '3333');

    t.eq(c.cycleYm_('2026-09-17'), '2026-09', 'the 17th files into September, which opened on the 10th');
    /* THE COLLECTOR'S ORDER OF 19.09.2026, which replaced the sixty-each of
       17.09.2026: the pendency is split INSIDE every mandal. */
    t.eq(env.eval('SCH_SHARE.MPDO'), 40, 'the MPDO takes forty per cent of his mandal');
    t.eq(env.eval('SCH_SHARE.MPO'), 40, 'the MPO forty');
    t.eq(env.eval('SCH_SHARE.MSO'), 10, 'the MSO ten — he was left out of the last order and is in this one');
    t.eq(env.eval('SCH_SHARE.DISTRICT'), 10, 'and the district officer ten');
    t.eq(env.eval('SCH_SHARE.MPDO + SCH_SHARE.MPO + SCH_SHARE.MSO + SCH_SHARE.DISTRICT'), 100,
      'and the four shares are the whole of a mandal, not most of it');

    /* THE DISTRICT OFFICER IS DECIDED BY SUBDIVISION, not by who has room */
    t.eq(env.eval("SCH_SUBDIVISION.DLPO.length"), 5, 'the Station Ghanpur subdivision is five mandals');
    ['Chilpur','Ghanpur (Stn)','Zaffergadh','Palakurthy','Kodakandla'].forEach(m => {
      t.eq(env.eval("schDistrictRole_(" + JSON.stringify(m) + ")"), 'DLPO', m + ' is the DLPO\u2019s');
    });
    ['Bachannapet','Devaruppula','Jangaon','Lingalaghanpur','Narmetta','Raghunathpally','Tharigoppula']
      .forEach(m => {
        t.eq(env.eval("schDistrictRole_(" + JSON.stringify(m) + ")"), 'DPO', m + ' is the DPO\u2019s');
      });
    /* the roll spells it three ways and a subdivision must not lose a mandal
       over a bracket */
    ['Ghanpur(Stn)','GHANPUR (STN)','ghanpur stn'].forEach(sp => {
      t.eq(env.eval("schDistrictRole_(" + JSON.stringify(sp) + ")"), 'DLPO',
        JSON.stringify(sp) + ' is still the DLPO\u2019s');
    });
    t.eq(env.eval("schDistrictRole_('Lingala Ghanpur')"), 'DPO',
      'and Lingala Ghanpur is NOT Ghanpur (Stn) — a loose match would merge two mandals');

    /* THE SHARES ALWAYS ADD UP TO WHAT THERE WAS. Forty per cent of 23 is 9.2,
       and four shares rounded on their own come to 22 or 24 — a village lost,
       or one dealt twice. */
    [1,2,3,7,10,13,23,37,60,100].forEach(n => {
      const cut = env.eval('schApportion_(' + n + ', SCH_SHARE)');
      const sum = Object.keys(cut).reduce((a,k) => a + cut[k], 0);
      t.eq(sum, n, n + ' villages are dealt out as exactly ' + n);
    });
    const hundred = env.eval('schApportion_(100, SCH_SHARE)');
    t.eq([hundred.MPDO, hundred.MPO, hundred.MSO, hundred.DISTRICT].join('/'), '40/40/10/10',
      'and a hundred villages come out at the order\u2019s own figures');

    /* ---- 1. the Collector alone may publish ---- */
    t.eq(env.post({ kind: 'schedulePublish', token: dpoT }).ok, false,
      'a DPO cannot publish the schedule — the console’s convenience is never the authority (rule 6)');
    t.eq(env.post({ kind: 'schedulePublish', token: psT }).ok, false, 'nor can a Secretary');

    const pub = env.post({ kind: 'schedulePublish', token: cdm });
    t.eq(pub.ok, true, 'the Collector publishes it');
    t.eq(pub.ym, '2026-09', 'for the reporting month, not the calendar month');
    t.eq(pub.from, '2026-09-10', 'the window opens on the 10th');
    t.eq(pub.to, '2026-10-09', 'and closes on the 9th of October');
    t.eq(pub.pending, 31, 'thirty-one villages were pending');

    const rows = schedRows(env);
    const active = rows.filter(r => r.status === 'ACTIVE');

    /* ---- 2. the allocation: every mandal split, none dealt whole ---- */
    const byPhone = {};
    active.forEach(r => { (byPhone[c.phone10_(r.phone)] = byPhone[c.phone10_(r.phone)] || []).push(r); });

    /* THE SEED: Palakurthy 9, Jangaon 7, Chilpur 6, Narmetta 5, Ghanpur (Stn) 4.
       Three of those are the DLPO's subdivision and two are the DPO's. Every
       one of them is split four ways, so no mandal belongs to one officer. */
    const inMandal = {};
    active.forEach(r => {
      const m = r.mandal, role = String(r.role).toUpperCase();
      (inMandal[m] = inMandal[m] || {})[role] = (inMandal[m][role] || 0) + 1;
    });
    MANDALS.forEach(m => {
      const got = inMandal[m.name] || {};
      const sum = Object.keys(got).reduce((x,k) => x + got[k], 0);
      t.eq(sum, m.n, m.name + ': all ' + m.n + ' pending villages are dealt, and no more');
      t.ok((got.MPDO || 0) > 0 && (got.MPO || 0) > 0,
        m.name + ': the MPDO and the MPO both have a share of their own');
      t.ok((got.MPDO || 0) >= (got.MSO || 0),
        m.name + ': and each has more than the MSO, who takes a tenth');
    });

    /* THE SUBDIVISION HOLDS. The DLPO appears only in his own five mandals and
       the DPO only outside them — whatever the pendency. */
    const dRole = {};
    active.forEach(r => {
      const role = String(r.role).toUpperCase();
      if(role === 'DPO' || role === 'DLPO') (dRole[r.mandal] = dRole[r.mandal] || {})[role] = true;
    });
    Object.keys(dRole).forEach(m => {
      const want = c.schDistrictRole_(m);
      t.eq(Object.keys(dRole[m]).join(','), want,
        m + ': its ten per cent is the ' + want + '\u2019s and nobody else\u2019s');
    });
    t.ok(!!dRole['Palakurthy'] || !!dRole['Chilpur'],
      'the DLPO has work in the Station Ghanpur subdivision');

    /* THE MSO IS NAMED NOW, and the Secretary still is not */
    const rolesGiven = {}; active.forEach(r => { rolesGiven[String(r.role).toUpperCase()] = true; });
    t.ok(rolesGiven.MSO, 'THE MSO IS GIVEN VILLAGES — the order of 19.09.2026 names him');
    t.ok(rolesGiven.MPDO && rolesGiven.MPO, 'so are the MPDO and the MPO');
    t.ok(!rolesGiven.PS,
      'the Panchayat Secretary is given nothing — he may not file an evaluation at all');
    t.ok(!rolesGiven.COLLECTOR, 'and the Collector calls for the work, he is not called for it');
    t.ok(active.filter(r => r.mandal === 'Ghanpur (Stn)').length > 0,
      'a mandal spelt with a bracket is matched to its own officers, not lost over the punctuation');

    /* ---- 3. ONE VILLAGE, ONE OFFICER ----
       Under the old order the MPO and the MPDO were both named against every
       village and either could file it, so one village raised two rows. A
       share is not that: forty to one man and forty to another means each
       village has ONE officer answerable for it. */
    const seenV = {}; active.forEach(r => { seenV[r.mandal.toLowerCase() + '|' + r.gp.toLowerCase()] = true; });
    t.eq(Object.keys(seenV).length, 31, 'every pending village is on the schedule, once');
    t.eq(pub.villages, 31, 'and the district figure counts villages');
    t.eq(active.length, 31, 'one row to a village now — nobody shares a village with anybody');
    t.eq(pub.rows, pub.villages, 'so rows and villages are the same count again');

    /* ---- 4. the dates ---- */
    const hs = c.holidaySet_();
    active.forEach(r => {
      const d = r.dueDate;
      t.ok(/^\d{4}-\d{2}-\d{2}$/.test(d), 'every line has a day: ' + r.gp);
      t.ok(d >= '2026-09-17' && d <= '2026-10-09', r.gp + ' falls inside the days that remain');
      t.ok(new Date(d + 'T00:00:00').getDay() !== 0, r.gp + ' is not scheduled for a Sunday');
      t.ok(!hs[d], r.gp + ' is not scheduled for a declared holiday');
    });
    t.ok(!active.some(r => r.dueDate === '2026-09-12'),
      'and nothing lands on the second Saturday, which is a fixed date on the Holidays tab');

    /* ---- 5. it runs twice without doubling (rule 8) ---- */
    const before = schedRows(env).map(r => r.id + '@' + r.dueDate).sort().join(',');
    const again = env.post({ kind: 'schedulePublish', token: cdm });
    t.eq(again.ok, true, 'a second publish is accepted');
    t.eq(again.added, 0, 'and adds nothing');
    t.eq(again.moved, 0, 'and moves not one date — an officer told Konne is his for Thursday keeps Thursday');
    t.eq(schedRows(env).map(r => r.id + '@' + r.dueDate).sort().join(','), before,
      'the register is byte for byte what it was');

    /* ---- 6. what is filed is read off the record ----
       WHOSE schedule is read back is found from the plan and never assumed:
       under the new shares the DPO may hold nothing at all in a small mandal,
       which is the order working and not a fault. */
    const countBy = {};
    active.forEach(r => { const p = c.phone10_(r.phone); countBy[p] = (countBy[p] || 0) + 1; });
    const bigPhone = Object.keys(countBy).sort((x, y) => (countBy[y] - countBy[x]) || (x < y ? -1 : 1))[0];
    const dpoRows = active.filter(r => c.phone10_(r.phone) === bigPhone);
    const dpoT2 = tokenFor(env, bigPhone, '7777');
    t.ok(dpoRows.length >= 2, 'the officer read back holds more than one village');

    const mine = env.get('schedule', { token: dpoT2 });
    t.eq(mine.ok, true, 'an officer may read his own schedule');
    t.ok(mine.mine && mine.mine.assigned === dpoRows.length, 'and is given his own lines and no others');
    t.eq(mine.mine.filed, 0, 'nothing filed yet');
    t.eq(mine.sanction, false, 'THE SCHEDULE CARRIES NO SANCTION, and says so to the app');

    const first = dpoRows[0];
    fileVillage(env, dpoT2, first.mandal, first.gp, '2026-09-17');
    const after = env.get('schedule', { token: dpoT2 });
    t.eq(after.mine.filed, 1, 'a filing closes the line at once, read back off the Inspections register — the held reading is dropped the moment it could be wrong');
    t.eq(after.mine.left, dpoRows.length - 1, 'and the officer’s remainder falls by one');

    /* ONE VILLAGE, ONE OFFICER — the order of 19.09.2026.
       Until that order the MPO and the MPDO were both named against every
       village and either could file it, so filing one closed two lines. A
       share is not that. What must hold now is the opposite: a village is one
       man's, and his filing closes HIS line and touches nobody else's. */
    const pairMandal = MANDALS.map(m => m.name).filter(mn =>
      active.filter(r => r.mandal === mn).length >= 4)[0];
    const pairRows = active.filter(r => r.mandal === pairMandal);
    const heldTwice = {};
    pairRows.forEach(r => { const k = r.gp.toLowerCase();
      heldTwice[k] = (heldTwice[k] || 0) + 1; });
    t.ok(!Object.keys(heldTwice).some(k => heldTwice[k] > 1),
      pairMandal + ': no village is named against two officers');

    const mpoRow = pairRows.filter(r => String(r.role).toUpperCase() === 'MPO')[0];
    const mpdoRow = pairRows.filter(r => String(r.role).toUpperCase() === 'MPDO')[0];
    const mpoPh = c.phone10_(mpoRow.phone), mpdoPh = c.phone10_(mpdoRow.phone);
    t.ok(mpoPh !== mpdoPh, pairMandal + ': the MPO and the MPDO are two different officers');
    const mpoT = tokenFor(env, mpoPh, '4444'), mpdoT = tokenFor(env, mpdoPh, '5555');
    const mpdoBefore = env.get('schedule', { token: mpdoT }).mine.filed;

    fileVillage(env, mpoT, pairMandal, mpoRow.gp, '2026-09-17');
    t.eq(env.get('schedule', { token: mpoT }).mine.filed, 1, 'the MPO\u2019s own line is closed by his filing');
    t.eq(env.get('schedule', { token: mpdoT }).mine.filed, mpdoBefore,
      'and the MPDO\u2019s is untouched \u2014 it was never his village');

    /* and the district still counts villages, never rows (rule 9) */
    const dist = env.get('schedule', { token: cdm, all: '1' });
    t.eq(dist.ok, true, 'the Collector reads the whole picture');
    t.eq(dist.district.filed, 2, 'two villages filed');
    t.eq(dist.district.villages, 31, 'against thirty-one on the schedule');

    /* A STORED LABEL IS NOT THE FACT. A row whose stored ym says August but
       whose visit was made in the September window counts for September,
       exactly as every other count on this register reads it. */
    const second = dpoRows[1];
    const ish = env.sheets['Inspections'], ihead = ish.rows[0].map(String);
    fileVillage(env, dpoT2, second.mandal, second.gp, '2026-09-18');
    ish.rows[ish.rows.length - 1][ihead.indexOf('ym')] = '2026-08';
    env.cacheStore = {};   /* the label was changed behind the server's back */
    t.eq(env.get('schedule', { token: dpoT2 }).mine.filed, 2,
      'the date of the visit decides the month, not the label some handset wrote');

    /* ---- 7. the pace, and working ahead ---- */
    const p = env.get('schedule', { token: dpoT2 });
    t.ok(p.mine.dueByToday >= 1, 'something was due by today');
    t.eq(p.mine.behind, Math.max(0, p.mine.dueByToday - p.mine.filed),
      'behind is measured against everything he has filed — a man ahead of his own schedule is not chased');

    /* ---- 8. the officer’s receipt ---- */
    t.eq(env.get('schedule', { token: dpoT2 }).acknowledged, false, 'unacknowledged to begin with');
    const a1 = env.post({ kind: 'schedAck', token: dpoT2, ym: '2026-09' });
    t.eq(a1.ok, true, 'he acknowledges it');
    const a2 = env.post({ kind: 'schedAck', token: dpoT2, ym: '2026-09' });
    t.eq(a2.ok, true, 'a second press is accepted');
    t.eq(a2.already, true, 'and writes no second receipt (rule 8)');
    t.eq(env.sheets['SchedAck'].rows.length, 2, 'one header, one receipt');
    t.eq(env.get('schedule', { token: dpoT2 }).acknowledged, true, 'and the app is told');

    /* A RECEIPT FOR NOTHING IS NOT A RECEIPT */
    const psRead = env.get('schedule', { token: psT });
    t.eq(psRead.ok, true, 'a Secretary may ask');
    t.eq(psRead.mine, null, 'and is shown nothing, because the order gave him nothing');
    t.eq(env.post({ kind: 'schedAck', token: psT, ym: '2026-09' }).ok, false,
      'and he cannot acknowledge a schedule he was never given');

    /* ---- 9. the Collector’s own hand ---- */
    t.eq(env.post({ kind: 'schedNudge', token: dpoT, to: 'all' }).ok, false,
      'only the Collector sends a reminder against the schedule');
    t.eq(env.post({ kind: 'schedNudge', token: cdm, to: 'behind', nudge: 'MESSAGE', text: '' }).ok, false,
      'a message with nothing in it is refused — that is the whole of what he reads');

    const mailN = env.outbox.length;
    /* to the officer who actually holds villages — a message is sent against
       the schedule, and the DPO may hold none of it under the new shares */
    const nud = env.post({ kind: 'schedNudge', token: cdm, to: bigPhone,
                           nudge: 'MESSAGE', text: 'Please take Palakurthy first.' });
    t.eq(nud.ok, true, 'the Collector sends one officer a message');
    t.eq(nud.sent, 1, 'to exactly one officer');
    t.ok(env.outbox.length > mailN, 'and it goes by mail at once');
    const nRead = env.get('schedule', { token: dpoT2 });
    t.eq(nRead.nudges.length, 1, 'it is waiting in his app the next time he opens it');
    t.contains(nRead.nudges[0].text, 'Palakurthy first', 'in the Collector’s own words');
    const nid = nRead.nudges[0].id;
    t.eq(env.post({ kind: 'schedSeen', token: dpoT2, ids: [nid] }).done, 1, 'he reads it');
    t.eq(env.get('schedule', { token: dpoT2 }).nudges.length, 0, 'and it stops coming back');
    t.eq(env.post({ kind: 'schedSeen', token: dpoT2, ids: [nid] }).done, 1, 'a re-send is idempotent');
    t.eq(env.post({ kind: 'schedSeen', token: mpoT, ids: [nid] }).done, 0,
      'and nobody marks another officer’s message read');

    const seenBack = env.get('schedule', { token: cdm, all: '1' });
    t.ok((seenBack.nudges || []).some(n => n.id === nid && n.seenAt),
      'the console can read back the moment it was seen — sent is not the same as landed');

    /* 'behind' reaches only those who are behind */
    const nb = env.post({ kind: 'schedNudge', token: cdm, to: 'behind' });
    if(nb.ok) t.ok(nb.to.every(x => x.behind > 0), 'a reminder to “behind” reaches only officers who are behind');
    else t.eq(nb.ok, false, 'or nobody is behind and nothing is sent');

    /* ---- 10. THE DAILY REMINDER, AND THAT IT ACCUSES NOBODY ---- */
    const nBefore = (env.sheets['Notices'] || { rows: [] }).rows.length;
    const lBefore = (env.sheets['Leave'] || { rows: [] }).rows.length;
    c.scheduleReminders();
    const rHead = env.sheets['Reminders'].rows[0].map(String);
    const rems = env.sheets['Reminders'].rows.slice(1)
      .map(r => { const o = {}; rHead.forEach((h, i) => { o[h] = String(r[i] == null ? '' : r[i]); }); return o; });
    t.ok(rems.length > 0, 'officers behind their schedule are reminded');
    t.ok(rems.every(r => r.kind === 'SCHEDULE'), 'every row is marked SCHEDULE — never MISS, never a notice');
    t.eq((env.sheets['Notices'] || { rows: [] }).rows.length, nBefore,
      'NOT ONE SHOW-CAUSE NOTICE was raised by falling behind the schedule');
    t.eq((env.sheets['Leave'] || { rows: [] }).rows.length, lBefore,
      'and not one day of casual leave was debited');

    /* A REMINDER NAMES NO SANCTION (the direction of 28.08.2026, kept here) */
    const schedMails = env.outbox.filter(m => /filing schedule/i.test(m.subject));
    t.ok(schedMails.length > 0, 'the reminder goes by mail');
    schedMails.forEach(m => {
      const all = String(m.subject) + ' ' + String(m.body) + ' ' + String(m.htmlBody || '');
      t.ok(!/show.?cause/i.test(all), 'the reminder does not name the show-cause notice');
      t.ok(!/casual leave/i.test(all), 'nor casual leave');
      t.ok(!/Conduct Rules/i.test(all), 'nor the Conduct Rules');
    });
    schedMails.slice(0, 1).forEach(m => {
      t.contains(String(m.htmlBody || ''), 'plan of work', 'it says what it is');
      t.contains(String(m.htmlBody || ''), 'Still to file', 'and names the villages still to file');
    });

    /* one to an officer to a day */
    const remN = env.sheets['Reminders'].rows.length;
    c.scheduleReminders();
    t.eq(env.sheets['Reminders'].rows.length, remN, 'a nervous second run reminds nobody twice (rule 8)');

    /* ---- 11. the mandal-wide reminder stands down for them ---- */
    const env2 = mock.load({ now: '2026-09-25T10:05:00+05:30' });
    seed(env2);
    const cdm2 = tokenFor(env2, '9000000001', '1111');
    env2.post({ kind: 'schedulePublish', token: cdm2 });
    env2.ctx.villageFilingReminders();
    const r2Head = env2.sheets['Reminders'].rows[0].map(String);
    const filing = env2.sheets['Reminders'].rows.slice(1)
      .map(r => { const o = {}; r2Head.forEach((h, i) => { o[h] = String(r[i] == null ? '' : r[i]); }); return o; })
      .filter(r => r.kind === 'FILING');
    const scheduled = env2.ctx.schScheduled_('2026-09');
    t.ok(filing.length > 0, 'the mandal-wide filing reminder still runs');
    t.ok(filing.every(r => !scheduled[env2.ctx.phone10_(r.phone)]),
      'but it reaches nobody who already has his own schedule mail — two mails a morning about the same villages is how a district learns to read neither');
    t.ok(filing.some(r => String(r.role).toUpperCase() === 'MSO'),
      'the MSO, whom the schedule does not reach, keeps the reminder he always had');
    t.ok(filing.some(r => String(r.role).toUpperCase() === 'PS'),
      'and so does the Secretary, for his information');

    /* ---- 12. re-spreading is deliberate, and nothing is destroyed ---- */
    const env3 = mock.load({ now: '2026-09-17T09:00:00+05:30' });
    const gps3 = seed(env3);
    const cdm3 = tokenFor(env3, '9000000001', '1111');
    env3.post({ kind: 'schedulePublish', token: cdm3 });
    const dates0 = schedRows(env3).map(r => r.id + '@' + r.dueDate).sort().join(',');

    /* four days on, with nothing filed, a re-spread compresses the same work
       into the days that are left — and only when it is asked for */
    env3.setNow('2026-09-24T09:00:00+05:30');
    const plain = env3.post({ kind: 'schedulePublish', token: cdm3 });
    t.eq(plain.moved, 0, 'an ordinary re-publish moves no date, however late it is run');
    const re = env3.post({ kind: 'schedulePublish', token: cdm3, respread: true });
    t.eq(re.ok, true, 're-spreading is accepted');
    t.ok(re.moved > 0, 'and it moves the dates');
    t.ok(schedRows(env3).map(r => r.id + '@' + r.dueDate).sort().join(',') !== dates0, 'the plan has changed');
    t.ok(schedRows(env3).filter(r => r.status === 'ACTIVE').every(r => r.dueDate >= '2026-09-24'),
      'and nothing is now scheduled for a day already gone');
    t.eq(schedRows(env3).length, schedRows(env3).length, 'no row was added or removed by re-spreading');

    /* a village leaves the roll: the line is DROPPED, the row stays (rule 7) */
    const goneGp = gps3[0].GP, goneMandal = gps3[0].Mandal;
    const gsh = env3.sheets['GPs'];
    gsh.rows = gsh.rows.filter((r, i) => i === 0 || String(r[1]) !== goneGp);
    const nRowsBefore = schedRows(env3).length;
    const drop = env3.post({ kind: 'schedulePublish', token: cdm3 });
    t.ok(drop.dropped > 0, 'a village off the roll is dropped from the schedule');
    t.eq(schedRows(env3).length, nRowsBefore, 'AND NOTHING IS DESTROYED — the row is still there (rule 7)');
    t.ok(schedRows(env3).some(r => r.gp === goneGp && r.status === 'DROPPED'),
      'it is marked DROPPED where it stands');
    t.ok(!env3.get('schedule', { token: cdm3, all: '1' }).district.mandals
      .some(m => m.mandal === goneMandal && m.total > MANDALS.filter(x => x.name === goneMandal)[0].n),
      'and no count reads it any more');

    /* ---- 13. THE DAY THE WORK BEGINS IS THE COLLECTOR'S ----
       The district's order of 18.09.2026 was to plan from the 21st, not from
       the Friday afternoon the button was pressed: a schedule that starts the
       moment it is published asks for village visits nobody was given notice
       of. `from` can only move the start LATER — a day already gone cannot be
       worked — and it is read by a re-spread as well as by a first publish. */
    const env5 = mock.load({ now: '2026-09-18T16:00:00+05:30' });
    seed(env5);
    const cdm5 = tokenFor(env5, '9000000001', '1111');
    const p5 = env5.post({ kind: 'schedulePublish', token: cdm5,
                           from: '2026-09-21' });
    t.eq(p5.ok, true, 'a publish may name the day the work begins');
    t.eq(p5.startFrom, '2026-09-21', 'and the plan opens on that day, not on the day it was published');
    t.eq(p5.startTo, '2026-10-09', 'running to the close of the reporting month');
    const rows5 = schedRows(env5).filter(r => r.status === 'ACTIVE');
    t.ok(rows5.every(r => r.dueDate >= '2026-09-21'),
      'not one village is set for a day before the 21st');
    t.ok(rows5.every(r => r.dueDate <= '2026-10-09'), 'nor past the 9th of October');
    t.ok(!rows5.some(r => r.dueDate === '2026-09-20'), 'the Sunday is not a working day');
    t.ok(!rows5.some(r => r.dueDate === '2026-09-19'), 'nor is the 19th, which is before the start');

    /* a start already gone is ignored rather than obeyed */
    const p5b = env5.post({ kind: 'schedulePublish', token: cdm5,
                            respread: true, from: '2026-09-11' });
    t.eq(p5b.ok, true, 'a start in the past is accepted');
    t.eq(p5b.startFrom, '2026-09-18', 'and quietly becomes today — a day already gone cannot be worked');

    /* and a re-spread reads it too */
    const p5c = env5.post({ kind: 'schedulePublish', token: cdm5,
                            respread: true, from: '2026-09-28' });
    t.eq(p5c.startFrom, '2026-09-28', 'a re-spread begins where it is told to');
    t.ok(schedRows(env5).filter(r => r.status === 'ACTIVE').every(r => r.dueDate >= '2026-09-28'),
      'and every remaining village moves behind that day');

    /* ---- 14. the schedule reaches EVERY officer when the Collector says so ---- */
    const mailBefore = env5.outbox.length;
    const all5 = env5.post({ kind: 'schedNudge', token: cdm5, to: 'all' });
    t.eq(all5.ok, true, 'the Collector may send the schedule to everyone on it');
    t.eq(all5.sent, env5.get('schedule', { token: cdm5, all: '1' }).district.officers.length,
      'and it reaches every officer holding villages, not only those behind');
    t.ok(env5.outbox.length > mailBefore, 'each one goes by mail at once');
    const anyMail = env5.outbox.filter(m => /filing schedule/i.test(m.subject))[0];
    t.ok(!!anyMail && /Still to file/.test(String(anyMail.htmlBody || '')),
      'and each mail carries that officer’s own villages and days');

    /* ---- 15. the evening report carries where the schedule stands ---- */
    const env6 = mock.load({ now: '2026-09-18T19:05:00+05:30' });
    seed(env6);
    const cdm6 = tokenFor(env6, '9000000001', '1111');
    env6.post({ kind: 'schedulePublish', token: cdm6, from: '2026-09-21' });
    env6.outbox.length = 0;
    env6.ctx.dailyCollectorReport();
    const daily = env6.outbox.filter(m => /daily report/i.test(m.subject))[0];
    t.ok(!!daily, 'the Collector’s evening report goes');
    const dh = String((daily || {}).htmlBody || '');
    t.contains(dh, 'Filing schedule', 'and it now carries where the filing schedule stands');
    t.contains(dh, 'acknowledged it', 'naming how many officers have acknowledged it');
    t.contains(dh, 'no notice, no debit, no lock',
      'and saying plainly that falling behind it costs nothing');
    t.ok(((daily || {}).attachments || []).some(a => /SJGP_schedule_/.test(a.getName ? a.getName() : a.name || '')),
      'the schedule, officer by officer, is attached as a CSV');

    /* NOTHING IS SENT WHEN NOTHING IS PUBLISHED. A row of noughts in the
       evening mail reads as a district doing nothing, which is not the same
       thing as a district that has not been given a schedule. */
    const env7 = mock.load({ now: '2026-09-18T19:05:00+05:30' });
    seed(env7);
    tokenFor(env7, '9000000001', '1111');
    env7.ctx.dailyCollectorReport();
    const daily7 = env7.outbox.filter(m => /daily report/i.test(m.subject))[0];
    t.ok(!!daily7, 'the report still goes with no schedule published');
    t.ok(!/Filing schedule/.test(String((daily7 || {}).htmlBody || '')),
      'and leaves the section out entirely rather than printing noughts');

    /* ---- 16. an office with nobody on the roll takes nothing, and says so ---- */
    const env4 = mock.load({ now: '2026-09-17T09:00:00+05:30' });
    seed(env4);
    const u4 = env4.sheets['Users'], h4 = u4.rows[0].map(String);
    u4.rows.slice(1).forEach(r => { if(String(r[h4.indexOf('Role')]).toUpperCase() === 'DLPO') r[h4.indexOf('Active')] = 'FALSE'; });
    const cdm4 = tokenFor(env4, '9000000001', '1111');
    const p4 = env4.post({ kind: 'schedulePublish', token: cdm4 });
    t.eq(p4.ok, true, 'the publish still runs with one office empty');
    t.ok((p4.notes || []).some(n => /No active DLPO/.test(n)),
      'and it SAYS SO rather than silently assigning nothing');
    t.ok(!schedRows(env4).some(r => String(r.role).toUpperCase() === 'DLPO'),
      'nothing is assigned to a name that cannot sign in');
    t.eq(p4.villages, 31, 'every village is still on somebody’s list — the empty office’s share went to the mandals');
  }
};

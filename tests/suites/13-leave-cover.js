/* Sanctioned leave on the console, and the counts of the village roll.
   On Varalakshmi Vratham 2026 ninety officers held approved leave, wrote
   no attendance row — as they should — and the console read every one of
   them as absent. And the district showed 102 villages filed plus 275
   pending against a roll far smaller: duplicate GPs rows and case-blind
   spelling both counted. These suites hold the repairs. */
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'leave cover & the village roll (console counting)',
  run(t){
    /* 21.08.2026, a Friday, mid-morning */
    const env = mock.load({ now: '2026-08-21T09:30:00+05:30', admin: true });
    const c = env.ctx;
    const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'];
    env.mkSheet('Users', U, [
      { Phone: '9000000001', Name: 'Sandeep Kumar Jha', Role: 'COLLECTOR', Email: 'cdm@mock.example', Active: 'TRUE' },
      { Phone: '9000000041', Name: 'L. OnLeave',   Role: 'PS', Mandal: 'Jangaon',  GP: 'Konne',    Active: 'TRUE' },
      { Phone: '9000000042', Name: 'W. WorkedAnyway', Role: 'PS', Mandal: 'Jangaon', GP: 'Malkapur', Active: 'TRUE' },
      { Phone: '9000000043', Name: 'P. StillWaiting', Role: 'PS', Mandal: 'Chilpur', GP: 'Venkatadripeta', Active: 'TRUE' },
      { Phone: '9000000044', Name: 'Q. Present',   Role: 'MPO', Mandal: 'Chilpur', Active: 'TRUE' }
    ]);
    const sh = env.sheets['Users'];
    sh.rows.slice(1).forEach(r => { if(c.phone10_(r[U.indexOf('Phone')]) === '9000000001') r[U.indexOf('Hash')] = c.hash_('9000000001', '9999'); });
    const cdm = env.post({ kind: 'login', u: '9000000001', p: '9999' }).token;

    /* the village roll carries a duplicate row; the filing spells the
       village its own way */
    env.mkSheet('GPs', ['Mandal','GP'], [
      { Mandal: 'Jangaon', GP: 'Konne' },
      { Mandal: 'Jangaon', GP: 'Malkapur' },
      { Mandal: 'Jangaon', GP: 'Malkapur' },          /* the duplicate */
      { Mandal: 'Chilpur', GP: 'Venkatadripeta' }
    ]);
    env.mkSheet('Inspections', env.eval('HEADERS'), [
      { id: 'I1', ym: '2026-08', mandal: 'JANGAON', gp: ' konne ', date: '2026-08-12', score: 80, grade: 'B' }
    ]);
    env.mkSheet('Holidays', ['Date','Occasion'], []);

    /* the leave register: one sanctioned spell for today, one for earlier
       in the fortnight, one officer sanctioned who marked anyway, one
       still waiting */
    env.mkSheet('Leave', env.eval('L_HEAD'), [
      { id: 'LC1', phone: '9000000041', name: 'L. OnLeave', role: 'PS', mandal: 'Jangaon', type: 'CL',
        fromDate: '2026-08-21', toDate: '2026-08-21', days: 1, status: 'APPROVED', appliedAt: '2026-08-20T10:00:00.000Z' },
      { id: 'LC2', phone: '9000000041', name: 'L. OnLeave', role: 'PS', mandal: 'Jangaon', type: 'CL',
        fromDate: '2026-08-18', toDate: '2026-08-19', days: 2, status: 'APPROVED', appliedAt: '2026-08-17T10:00:00.000Z' },
      { id: 'LC3', phone: '9000000042', name: 'W. WorkedAnyway', role: 'PS', mandal: 'Jangaon', type: 'OH',
        fromDate: '2026-08-21', toDate: '2026-08-21', days: 1, status: 'APPROVED', appliedAt: '2026-08-20T11:00:00.000Z' },
      { id: 'LC4', phone: '9000000043', name: 'P. StillWaiting', role: 'PS', mandal: 'Chilpur', type: 'CL',
        fromDate: '2026-08-21', toDate: '2026-08-21', days: 1, status: 'PENDING', appliedAt: '2026-08-21T03:00:00.000Z' }
    ]);
    env.mark('9000000042', '2026-08-21', '2026-08-21T08:00:00+05:30');
    env.mark('9000000044', '2026-08-21', '2026-08-21T08:10:00+05:30');

    const d = env.get('dashboard', { token: cdm });
    t.eq(d.ok !== false, true, 'the console assembles');

    /* the sanctioned officer is on leave, not absent */
    const absNames = d.today.absent.map(r => r.name);
    t.ok(absNames.indexOf('L. OnLeave') < 0, 'an officer on sanctioned leave is not on the absent list');
    t.ok(absNames.indexOf('P. StillWaiting') >= 0, 'an application still waiting covers nothing — its officer stands absent');
    const onL = d.today.onLeave.find(r => r.name === 'L. OnLeave');
    t.ok(!!onL, 'he stands in the leave column instead');
    t.eq(onL.leaveType, 'CL', 'with the sanctioned type against his name');
    t.eq(onL.sanctioned, true, 'and marked as covered by sanction, not by a row he wrote');
    t.ok(d.today.present.some(r => r.phone === '9000000042'), 'sanctioned but marked anyway: the mark wins — he is present, once');
    t.ok(!d.today.onLeave.some(r => r.phone === '9000000042'), 'and he is not counted a second time as on leave');

    /* the fortnight matrix reads the sanction too */
    const mRow = d.attm.rows.find(r => r[0] === 'L. OnLeave');
    const days = mRow[3];                       /* 14 chars, oldest first */
    t.eq(days.charAt(13), 'L', 'today reads L in the matrix');
    t.eq(days.charAt(10), 'L', 'so does the 18th, from the earlier sanctioned spell');
    t.eq(days.charAt(11), 'L', 'and the 19th');
    t.eq(days.charAt(12), '-', 'the 20th, uncovered and unmarked, stays a blank — the sanction is not stretched');
    const todayLine = d.att14[13];
    t.eq(todayLine.leave, 1, 'the day-line counts the sanctioned officer as leave — and the one who marked anyway only as present');
    t.eq(todayLine.present, 2, 'two marks, two present');

    /* the village roll: duplicates collapsed, spelling matched case-blind */
    t.eq(d.totals.gps, 3, 'the roll counts villages, not rows — the duplicate is one village');
    const jang = d.coverage.find(x => x.mandal === 'Jangaon');
    t.eq(jang.total, 2, 'Jangaon holds two villages, not three');
    t.eq(jang.done, 1, 'the filing spelt " konne " in capitals still counts as Konne filed');
    t.eq(jang.pending.join(','), 'Malkapur', 'and only Malkapur is pending — filed plus pending equals the roll');

    /* ---- the Admin registers ---- */

    /* twin rows under one id: the pre-lock race wrote the same id twice */
    env.addRow('Leave', { id: 'TW1', phone: '9000000044', name: 'Q. Present', role: 'MPO', mandal: 'Chilpur',
      type: 'CL', fromDate: '2026-08-25', toDate: '2026-08-25', days: 1, status: 'CANCELLED',
      decidedBy: 'Withdrawn by the applicant', appliedAt: '2026-08-20T12:00:00.000Z' });
    env.addRow('Leave', { id: 'TW1', phone: '9000000044', name: 'Q. Present', role: 'MPO', mandal: 'Chilpur',
      type: 'CL', fromDate: '2026-08-25', toDate: '2026-08-25', days: 1, status: 'PENDING',
      appliedAt: '2026-08-20T12:00:00.000Z' });
    env.addRow('Leave', { id: 'TW2', phone: '9000000043', name: 'P. StillWaiting', role: 'PS', mandal: 'Chilpur',
      type: 'CL', fromDate: '2026-08-26', toDate: '2026-08-26', days: 1, status: 'PENDING',
      appliedAt: '2026-08-20T13:00:00.000Z' });
    env.addRow('Leave', { id: 'TW2', phone: '9000000043', name: 'P. StillWaiting', role: 'PS', mandal: 'Chilpur',
      type: 'CL', fromDate: '2026-08-26', toDate: '2026-08-26', days: 1, status: 'APPROVED',
      decidedBy: 'Sandeep Kumar Jha (COLLECTOR)', appliedAt: '2026-08-20T13:00:00.000Z' });

    const lHead = env.sheets['Leave'].rows[0].map(String);
    const lCol = (row, h) => String(env.sheets['Leave'].rows[row][lHead.indexOf(h)] || '');
    const rowsOf = id => env.sheets['Leave'].rows.map((r, i) => ({ r: r, i: i }))
      .filter(x => x.i > 0 && String(x.r[lHead.indexOf('id')]) === id);

    c.findTwinLeaveRows();                                 /* dry — writes nothing */
    t.eq(rowsOf('TW1').map(x => lCol(x.i, 'status')).join(','), 'CANCELLED,PENDING', 'the dry run changes nothing');

    c.closeTwinLeaveRows(true);
    t.eq(rowsOf('TW1').map(x => lCol(x.i, 'status')).join(','), 'CANCELLED,WITHDRAWN', 'the phantom PENDING twin is closed; the record row stands');
    t.contains(lCol(rowsOf('TW1')[1].i, 'remarks'), 'Twin row', 'and says why, on the row itself');
    t.eq(rowsOf('TW2').map(x => lCol(x.i, 'status')).join(','), 'PENDING,APPROVED', 'a twin carrying a decision of its own is not touched by a script');
    const leaveN = env.sheets['Leave'].rows.length;
    c.closeTwinLeaveRows(true);
    t.eq(env.sheets['Leave'].rows.length, leaveN, 'run twice, nothing more happens');
    t.eq(rowsOf('TW1').map(x => lCol(x.i, 'status')).join(','), 'CANCELLED,WITHDRAWN', 'and nothing changes');
    t.ok(env.sheets['Audit'] && env.sheets['Audit'].rows.length > 1, 'the closure is on the Audit tab');

    /* the roll itself: the duplicate row goes, audited */
    c.gpRollAudit();                                       /* dry — writes nothing */
    t.eq(env.sheets['GPs'].rows.length, 5, 'the audit alone deletes nothing');
    c.applyGpDedupe();
    t.eq(env.sheets['GPs'].rows.length, 4, 'the duplicate Malkapur row is removed');
    t.eq(c.gpRoll_().length, 3, 'and the roll still reads three villages');
    c.applyGpDedupe();
    t.eq(env.sheets['GPs'].rows.length, 4, 'a second run finds nothing to remove');
  }
};

/* AN OFFICER'S OWN LAST FORTNIGHT (FeatureMyDays.gs) — asked 16.10.2026.

   His own record and nobody else's; one officer one day; late by the
   ladder's own reading; sanctioned leave off the register and off the
   attendance tab as one set (rule 9); Sundays and holidays off; today never
   counted as unmarked (rule 2); the voluntary office with nothing counted
   against its blanks; cached by the day; writes nothing; names no sanction;
   not answered on the District HRMS, which keeps no attendance. */
'use strict';
const mock = require('../gasmock.js');

const U = ['Phone', 'Name', 'Role', 'Mandal', 'GP', 'Email', 'InitPin', 'Hash', 'Active'];
const SANCTION = /show.?cause|casual leave|debit|loss of pay|default|notice|disciplin|penalt/i;

function world(tenant){
  const env = mock.load({ now:'2026-10-16T10:00:00+05:30', admin:true });   /* a Friday */
  if(tenant) env.props.TENANT = tenant;
  const c = env.ctx;
  env.mkSheet('Users', U, [
    { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Email:'cdm@mock.example', Active:'TRUE' },
    { Phone:'9000000081', Name:'A. Officer', Role:'PS',  Mandal:'Devaruppula', GP:'Devaruppula', Active:'TRUE' },
    { Phone:'9000000082', Name:'B. Other',   Role:'PS',  Mandal:'Devaruppula', GP:'Kadavendi',   Active:'TRUE' },
    { Phone:'9000000083', Name:'C. Mso',     Role:'MSO', Mandal:'Devaruppula', Active:'TRUE' }
  ]);
  env.sheets['Users'].rows.slice(1).forEach(r => { const p = c.phone10_(r[0]); if(p) r[U.indexOf('Hash')] = c.hash_(p, '1111'); });
  /* THE CALENDAR IS THE ORDER'S (01.10.2026): for a year the G.O. covers, a
     date typed onto the tab that the order does not name is not a holiday,
     and the second Saturday is computed. So the off day inside this window
     is Saturday 10 October, and the tab is left empty on purpose. */
  env.mkSheet('Holidays', ['Date', 'Occasion'], []);
  const L = env.eval('L_HEAD');
  env.mkSheet('Leave', L, [
    { id:'L1', phone:'9000000081', name:'A. Officer', role:'PS', mandal:'Devaruppula', type:'CL', fromDate:'2026-10-09', toDate:'2026-10-09', days:1, status:'APPROVED', appliedAt:'2026-10-01T04:00:00Z', decidedAt:'2026-10-02T04:00:00Z' },
    { id:'L2', phone:'9000000081', name:'A. Officer', role:'PS', mandal:'Devaruppula', type:'CL', fromDate:'2026-10-15', toDate:'2026-10-15', days:1, status:'PENDING',  appliedAt:'2026-10-14T04:00:00Z' },
    { id:'L3', phone:'9000000082', name:'B. Other',   role:'PS', mandal:'Devaruppula', type:'CL', fromDate:'2026-10-14', toDate:'2026-10-14', days:1, status:'APPROVED', appliedAt:'2026-10-10T04:00:00Z', decidedAt:'2026-10-11T04:00:00Z' }
  ]);
  const put = (ph, name, role, day, hhmm, rx) =>
    env.mark(ph, day, day + 'T' + hhmm + ':00+05:30', rx || day + 'T' + hhmm + ':30+05:30',
      { name, role, mandal:'Devaruppula', lat:17.6, lng:79.05, accuracy:9, verified:'TRUE', timezone:'Asia/Calcutta', skew:0 });
  /* before the window: not on the card */
  put('9000000081', 'A. Officer', 'PS', '2026-10-01', '09:10');
  /* the window is 3 Oct (Sat) to 16 Oct (Fri) */
  put('9000000081', 'A. Officer', 'PS', '2026-10-05', '09:10');           /* Mon */
  put('9000000081', 'A. Officer', 'PS', '2026-10-06', '09:12');           /* Tue, twice: a retry */
  put('9000000081', 'A. Officer', 'PS', '2026-10-06', '09:13');
  put('9000000081', 'A. Officer', 'PS', '2026-10-07', '11:40');           /* Wed, late */
  put('9000000081', 'A. Officer', 'PS', '2026-10-08', '10:50', '2026-10-08T09:52:00+05:30'); /* Thu: a fast phone; on time by receipt */
  /* Fri 9: on sanctioned leave, no mark. Sat 10: the second Saturday, off, and marked anyway. Sun 11: off. Mon 12: a working Monday, no mark. */
  put('9000000081', 'A. Officer', 'PS', '2026-10-10', '09:30');
  put('9000000081', 'A. Officer', 'PS', '2026-10-13', '09:05');           /* Tue */
  /* Wed 14: nothing — a miss. Thu 15: leave applied for, not yet sanctioned, no mark — a miss. Fri 16: today, not yet marked. */
  /* the other officer marks every day and must not leak in */
  ['2026-10-03','2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-12','2026-10-13','2026-10-15','2026-10-16'].forEach(d => put('9000000082', 'B. Other', 'PS', d, '09:00'));
  /* the register's own leave row on the attendance tab for B on the 14th */
  env.mark('9000000082', '2026-10-14', '', '', { name:'B. Other', role:'PS', mandal:'Devaruppula', status:'LEAVE', leaveType:'CL' });
  /* the MSO marked once, voluntarily */
  put('9000000083', 'C. Mso', 'MSO', '2026-10-06', '09:00');
  return env;
}
const tok = (env, ph) => env.post({ kind:'login', u:ph, p:'1111' }).token;

module.exports = {
  name: 'an officer’s own last fortnight (FeatureMyDays: the calendar on his home screen)',
  run(t){
    const env = world();
    const a = tok(env, '9000000081'), b = tok(env, '9000000082'), mso = tok(env, '9000000083'), cdm = tok(env, '9000000001');

    const r = env.get('myDays', { token:a });
    t.eq(r.ok, true, 'the officer is answered');
    t.eq(r.from, '2026-10-03', 'fourteen days back');
    t.eq(r.to, '2026-10-16', 'to today');
    t.eq((r.days || []).length, 14, 'fourteen cells');
    t.eq(r.days[0].date, '2026-10-03', 'oldest first');
    t.eq(r.days[13].date, '2026-10-16', 'today last');
    t.eq(r.cutoff, 11, 'and the cutoff is the ladder’s own');
    t.eq(r.sanction, false, 'sanction:false travels with it');
    t.ok(!SANCTION.test(JSON.stringify(r)), 'and not one word of sanction in the answer');
    const by = {}; r.days.forEach(d => { by[d.date] = d; });

    /* ---- the days ---- */
    t.ok(!by['2026-10-01'], 'the mark before the window is not on the card');
    t.eq(by['2026-10-05'].marked, true, 'Monday marked');
    t.eq(by['2026-10-05'].late, false, 'on time');
    t.ok(/09:12|03:42/.test(by['2026-10-06'].at), 'Tuesday: the earliest of the two rows is the mark (' + by['2026-10-06'].at + ')');
    t.eq(by['2026-10-07'].late, true, 'Wednesday at 11:40 is late');
    t.eq(by['2026-10-07'].marked, true, 'and is still a mark');
    t.eq(by['2026-10-08'].late, false, 'Thursday: on time by the district’s receipt, whatever the fast phone claimed');
    t.eq(by['2026-10-09'].leave, 'CL', 'Friday is sanctioned leave');
    t.eq(by['2026-10-09'].marked, false, 'with no mark');
    t.ok(/second saturday/i.test(by['2026-10-10'].off), 'the second Saturday is off, by the computed calendar (' + by['2026-10-10'].off + ')');
    t.eq(by['2026-10-10'].marked, true, 'and the voluntary mark on it is still drawn');
    t.eq(by['2026-10-11'].off, 'Sunday', 'Sunday is off');
    t.eq(by['2026-10-12'].off, '', 'a working Monday is not off');
    t.eq(by['2026-10-12'].marked, false, 'and is not marked');
    t.eq(by['2026-10-14'].marked, false, 'the 14th is not marked');
    t.eq(by['2026-10-14'].leave, '', 'and B’s leave row on the attendance tab did not leak onto A');
    t.eq(by['2026-10-15'].leave, '', 'an application awaiting orders is not leave');
    t.eq(by['2026-10-16'].marked, false, 'today is not marked yet');

    /* ---- the totals ---- */
    t.eq(r.totals.working, 10, 'ten working days in the window: 3,5,6,7,8,12,13,14,15,16 (Sun 4, Fri 9 leave, Sat 10 second Saturday, Sun 11)');
    t.eq(r.totals.marked, 5, 'five marked on working days — the mark on the second Saturday is drawn and not counted');
    t.eq(r.totals.late, 1, 'one late');
    t.eq(r.totals.leaveDays, 1, 'one day of sanctioned leave');
    t.eq(r.totals.notMarked, 4, 'four not marked — the 3rd, 12th, 14th and 15th, and NOT today, which is still running');

    /* ---- his own and nobody else's ---- */
    const rb = env.get('myDays', { token:b });
    t.eq(rb.totals.marked, 10, 'B sees his own ten marks');
    t.eq((rb.days.find(d => d.date === '2026-10-14') || {}).leave, 'CL', 'and his leave off the attendance tab');
    t.eq(rb.totals.notMarked, 0, 'with nothing not marked');
    const rb2 = env.get('myDays', { token:b, phone:'9000000081' });
    t.eq(rb2.totals.marked, 10, 'a phone parameter is ignored: the answer is the token’s own');

    /* ---- the voluntary office ---- */
    const rm = env.get('myDays', { token:mso });
    t.eq(rm.exempt, true, 'the MSO is told attendance is not asked of him');
    t.eq(rm.totals.marked, 1, 'his voluntary mark is drawn');
    t.eq(rm.totals.notMarked, 0, 'and nothing is counted against his blanks');
    t.eq(rm.totals.working, 0, 'no working days are due of him');

    /* ---- the Collector reads his own, which is empty, and is not refused ---- */
    const rc = env.get('myDays', { token:cdm });
    t.eq(rc.ok, true, 'the Collector is answered');
    t.eq(rc.totals.marked, 0, 'with his own empty fortnight');

    /* ---- cached by the day, written nowhere ---- */
    const again = env.get('myDays', { token:a });
    t.eq(again.at, r.at, 'a second ask within the day is the same read');
    t.ok(env.get('myDays', { token:a, fresh:'1' }).at >= r.at, 'fresh=1 reads again');
    t.ok(!env.sheets['Audit'] || env.sheets['Audit'].rows.length <= 1, 'and nothing is written');

    /* ---- diag names it; the HRMS register does not carry it ---- */
    const dg = env.get('diag', { token:cdm });
    t.ok((dg.features && dg.features.live || []).some(f => f.name === 'mydays'), 'diag lists mydays among the live modules');
    const hr = world('HRMS');
    const rh = hr.get('myDays', { token:tok(hr, '9000000081') });
    t.eq(rh.ok, false, 'the District HRMS, which keeps no attendance, does not answer it');
    t.eq(rh.unknownOp, 'myDays', 'and refuses it by name');
  }
};

/* ATTENDANCE, DAY BY DAY, FOR A YEAR (FeatureAttCalendar.gs) — asked 16.10.2026.

   One officer one day however many rows; late by effMarkAt_ against the
   ladder's own cutoff; sanctioned leave read off the Leave register and the
   leave rows on the Attendance tab as one set, because silence under
   sanction is leave (rule 9); Sundays and the Holidays tab drawn off and
   never counted; the voluntary office neither due nor counted; due is
   today's roll and the answer says so; cached by the day; the Collector's
   alone; writes nothing. */
'use strict';
const mock = require('../gasmock.js');

const U = ['Phone', 'Name', 'Role', 'Mandal', 'GP', 'Email', 'InitPin', 'Hash', 'Active'];

function world(){
  const env = mock.load({ now:'2026-10-16T10:00:00+05:30', admin:true });
  const c = env.ctx;
  env.mkSheet('Users', U, [
    { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Email:'cdm@mock.example', Active:'TRUE' },
    { Phone:'9000000002', Name:'D. P. Officer',    Role:'DPO',  Email:'dpo@mock.example', Active:'TRUE' },
    { Phone:'9000000081', Name:'A. Early',   Role:'PS',  Mandal:'Devaruppula', GP:'Devaruppula', Active:'TRUE' },
    { Phone:'9000000082', Name:'B. Late',    Role:'PS',  Mandal:'Devaruppula', GP:'Kadavendi',   Active:'TRUE' },
    { Phone:'9000000083', Name:'C. Mso',     Role:'MSO', Mandal:'Devaruppula', Active:'TRUE' },
    { Phone:'9000000084', Name:'D. OnLeave', Role:'PS',  Mandal:'Devaruppula', GP:'Kadavendi',   Active:'TRUE' },
    { Phone:'9000000085', Name:'E. Gone',    Role:'PS',  Mandal:'Devaruppula', GP:'Kadavendi',   Active:'FALSE' }
  ]);
  env.sheets['Users'].rows.slice(1).forEach(r => { const p = c.phone10_(r[0]); if(p) r[U.indexOf('Hash')] = c.hash_(p, '1111'); });
  env.mkSheet('Holidays', ['Date', 'Occasion'], [{ Date:'2026-10-02', Occasion:'Gandhi Jayanti' }]);
  const L = env.eval('L_HEAD');
  env.mkSheet('Leave', L, [
    { id:'L1', phone:'9000000084', name:'D. OnLeave', role:'PS', mandal:'Devaruppula', type:'CL', fromDate:'2026-10-05', toDate:'2026-10-06', days:2, status:'APPROVED', appliedAt:'2026-10-01T04:00:00Z', decidedAt:'2026-10-02T04:00:00Z' },
    { id:'L2', phone:'9000000081', name:'A. Early',   role:'PS', mandal:'Devaruppula', type:'CL', fromDate:'2026-10-07', toDate:'2026-10-07', days:1, status:'PENDING',  appliedAt:'2026-10-01T04:00:00Z' }
  ]);
  const put = (ph, name, role, day, hhmm, rx) =>
    env.mark(ph, day, day + 'T' + hhmm + ':00+05:30', rx || day + 'T' + hhmm + ':30+05:30',
      { name, role, mandal:'Devaruppula', lat:17.6, lng:79.05, accuracy:9, verified:'TRUE', timezone:'Asia/Calcutta', skew:0 });
  /* Monday 5 Oct: A at 09:10 twice (a retry), B at 11:40 (late), the MSO at 09:00 (voluntary) */
  put('9000000081', 'A. Early', 'PS', '2026-10-05', '09:10');
  put('9000000081', 'A. Early', 'PS', '2026-10-05', '09:11');
  put('9000000082', 'B. Late',  'PS', '2026-10-05', '11:40');
  put('9000000083', 'C. Mso',   'MSO','2026-10-05', '09:00');
  /* Tuesday 6 Oct: A claims 10:50 on a phone an hour fast; received 09:52 — on time by effMarkAt_ */
  put('9000000081', 'A. Early', 'PS', '2026-10-06', '10:50', '2026-10-06T09:52:00+05:30');
  /* Sunday 4 Oct: a voluntary mark on an off day */
  put('9000000082', 'B. Late',  'PS', '2026-10-04', '09:30');
  /* the register's own leave row on the Attendance tab for D on the 5th, beside the Leave-tab spell */
  env.mark('9000000084', '2026-10-05', '', '', { name:'D. OnLeave', role:'PS', mandal:'Devaruppula', status:'LEAVE', leaveType:'CL' });
  /* last year is last year */
  put('9000000081', 'A. Early', 'PS', '2025-10-05', '09:10');
  return env;
}
const tok = (env, ph) => env.post({ kind:'login', u:ph, p:'1111' }).token;

module.exports = {
  name: 'attendance day by day (FeatureAttCalendar: the year behind the Overview)',
  run(t){
    const env = world();
    const cdm = tok(env, '9000000001'), dpo = tok(env, '9000000002');

    const no = env.get('attCalendar', { token:dpo, year:'2026' });
    t.eq(no.ok, false, 'a district officer is refused');
    const r = env.get('attCalendar', { token:cdm, year:'2026' });
    t.eq(r.ok, true, 'the Collector is answered');
    t.eq(r.year, 2026, 'for the year');
    t.eq(r.cutoff, 11, 'and the cutoff is the ladder’s own');

    /* ---- the roll ---- */
    t.eq(r.due, 4, 'due is the DPO, A, B and D — not the Collector, not the MSO, not the inactive officer');
    t.ok(/today/i.test(r.note), 'and the answer says due is today’s roll');

    /* ---- the days ---- */
    const d5 = r.cal['2026-10-05'] || {};
    t.eq(d5.marked, 2, '5 Oct: A once (a retry is not a second officer) and B; the MSO is not counted');
    t.eq(d5.late, 1, 'B at 11:40 is late');
    t.eq(d5.leave, 1, 'D is on sanctioned leave — one set, off the register and the attendance row both');
    const d6 = r.cal['2026-10-06'] || {};
    t.eq(d6.marked, 1, '6 Oct: A');
    t.eq(d6.late, 0, 'on time by the district’s receipt, whatever the fast phone claimed');
    t.eq(d6.leave, 1, 'D’s spell covers the 6th too');
    t.ok(!(r.cal['2026-10-07'] || {}).leave, 'an application awaiting orders puts nobody on leave');
    t.eq((r.cal['2026-10-04'] || {}).marked, 1, 'a voluntary Sunday mark is on the calendar');
    t.eq(r.off['2026-10-04'], 'Sunday', 'and the Sunday is marked off');
    t.ok(/Gandhi/.test(r.off['2026-10-02']), 'as is the holiday, by name');
    t.ok(!r.off['2026-10-05'], 'a Monday is not');
    t.ok(!r.cal['2025-10-05'], 'last year is not on this calendar');

    /* ---- the totals ---- */
    t.eq(r.totals.marks, 4, 'four officer-marks in the year');
    t.eq(r.totals.late, 1, 'one late');
    t.eq(r.totals.leaveDays, 2, 'two officer-days of leave');
    t.ok(r.totals.workingDays > 290 && r.totals.workingDays < 320, 'the year’s working days are counted (' + r.totals.workingDays + ')');
    t.ok(r.totals.workingDaysPast < r.totals.workingDays, 'and those already past are fewer');

    /* ---- cached by the day, written nowhere ---- */
    const again = env.get('attCalendar', { token:cdm, year:'2026' });
    t.eq(again.at, r.at, 'a second ask within the day is the same read');
    t.ok(env.get('attCalendar', { token:cdm, year:'2026', fresh:'1' }).at >= r.at, 'fresh=1 reads again');
    t.ok(!env.sheets['Audit'] || env.sheets['Audit'].rows.length <= 1, 'and nothing is written');

    /* ---- diag names it ---- */
    const dg = env.get('diag', { token:cdm });
    t.ok((dg.features && dg.features.live || []).some(f => f.name === 'attcal'), 'diag lists attcal among the live modules');
  }
};

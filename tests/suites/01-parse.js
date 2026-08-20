/* The constants the doctrine hangs on. If one of these moves, it moves
   because the Collector ordered it — not as a side effect of an edit. */
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'parse & constants',
  run(t){
    const env = mock.load({ admin: true });
    const c = env.ctx;
    const k = env.eval('({ SALT_FALLBACK, SCN_FROM_MISS, DEBIT_FROM_MISS, CUTOFF_HOUR, NOTICE_HOUR, SETTLE_HOUR,' +
      ' NOTICE_SERIES_START, A_HEAD, N_HEAD, L_HEAD, canApplyLeave_, canApproveLeave_, attExempt_, viewerRole_ })');

    /* no real salt may ever sit in the repository — the pipeline pushes this file */
    t.eq(k.SALT_FALLBACK, 'CHANGE-THIS-LONG-RANDOM-SALT', 'SALT_FALLBACK must stay the placeholder');

    t.eq(k.SCN_FROM_MISS, 3, 'the third miss draws the notice');
    t.eq(k.DEBIT_FROM_MISS, 3, 'the third miss is where the leave account starts to pay');
    t.eq(k.CUTOFF_HOUR, 11, 'attendance is due by 11:00');
    t.eq(k.NOTICE_HOUR, 18, 'the day is read at 18:00, never mid-morning');
    t.eq(k.SETTLE_HOUR, 9, 'settlement runs the next morning');
    t.eq(k.NOTICE_SERIES_START, 55, 'the signed pack closed at 54');

    /* the 2026 leave account opens in August: five months of CL, taken as 6 */
    t.eq(c.entitlement_('CL', 2026), 6, 'CL for the opening year is 6');
    t.eq(c.entitlement_('CL', 2027), 15, 'CL for a full year is 15');
    t.eq(c.entitlement_('EL', 2026), 30, 'EL is not prorated');
    t.eq(c.entitlement_('ML', 2026), 0, 'ML is on certificate, never a yearly figure');
    t.eq(c.entitlement_('HQ', 2026), 0, 'HQ is a permission, never a yearly figure');
    t.eq(c.entitlement_('OH', 2026), 5, 'five optional holidays a calendar year, per the G.O. — never prorated');

    /* roles: who may apply, who may sanction, who is exempt */
    t.ok(k.canApplyLeave_('MPO') && k.canApplyLeave_('PS') && k.canApplyLeave_('MPDO'), 'MPO, PS and MPDO apply');
    t.ok(!k.canApplyLeave_('COLLECTOR') && !k.canApplyLeave_('MSO'), 'nobody else applies through the app');
    t.ok(k.canApproveLeave_('COLLECTOR') && !k.canApproveLeave_('MPDO'), 'the Collector alone sanctions');
    t.ok(k.attExempt_('COLLECTOR') && !k.attExempt_('MPO'), 'the Collector is not asked to mark in');
    t.ok(k.attExempt_('MSO'), 'nor, since 19.08.2026, is the MSO — attendance is voluntary for him');
    t.ok(!k.attExempt_('MPDO') && !k.attExempt_('PS'), 'everyone else remains bound');
    t.ok(k.viewerRole_('PS'), 'the Secretary reads and never writes');

    /* columns are matched by header name; these names are load-bearing */
    ['markedAt', 'receivedAt', 'firstMarkAt', 'markCount', 'skew'].forEach(h =>
      t.ok(k.A_HEAD.indexOf(h) >= 0, 'Attendance carries ' + h));
    ['seq', 'status', 'clDebited', 'leaveId', 'decidedBy'].forEach(h =>
      t.ok(k.N_HEAD.indexOf(h) >= 0, 'Notices carries ' + h));
    ['fromDate', 'toDate', 'status', 'receivedAt'].forEach(h =>
      t.ok(k.L_HEAD.indexOf(h) >= 0, 'Leave carries ' + h));

    /* Admin.gs loaded alongside without clashing */
    t.ok(typeof c.holidayRepair === 'function', 'Admin.gs loads with Code.gs');
    t.ok(typeof c.migrateSalt === 'function', 'migrateSalt present');

    /* ensureHeaders_ appends new columns without disturbing a cell */
    const sh = env.mkSheet('T', ['a', 'b'], [{ a: 1, b: 2 }]);
    c.ensureHeaders_(sh, ['a', 'b', 'c', 'd']);
    t.eq(sh.rows[0].join(','), 'a,b,c,d', 'new headers land on the end');
    t.eq(sh.rows[1][0], 1, 'existing cells untouched');
    c.ensureHeaders_(sh, ['a', 'b', 'c', 'd']);
    t.eq(sh.rows[0].length, 4, 'running it again changes nothing');
  }
};

/* Leave. One application per spell, retries keep working, the Collector
   alone sanctions, the balance is checked server-side, and an applicant
   sees his own file and nobody else's. */
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'leave (saveLeave_, decideLeave_, withdraw)',
  run(t){
    const env = mock.load({ now: '2026-08-14T10:00:00+05:30' });
    const c = env.ctx;
    env.seedUsers();
    const a = c.issueToken_(c.findByPhone_('9000000011'));         /* MPO — may apply */
    const b = c.issueToken_(c.findByPhone_('9000000012'));         /* MPDO — may apply */
    const g = c.issueToken_(c.findByPhone_('9000000010'));         /* MSO — may NOT */
    const cdm = c.issueToken_(c.findByPhone_('9000000001'));

    /* who may apply is the server's decision, not the app's */
    const refused = env.post({ kind: 'leave', token: g, leave: { id: 'L0', from: '2026-08-20', to: '2026-08-20', days: 1, type: 'CL' } });
    t.eq(refused.ok, false, 'an MSO cannot apply through the app');

    const r1 = env.post({ kind: 'leave', token: a, leave: { id: 'L1', from: '2026-08-20', to: '2026-08-21', days: 2, type: 'CL', reason: 'family function' } });
    t.eq(r1.ok, true, 'a fresh application is taken');
    t.eq(r1.status, 'PENDING', 'and waits on the Collector');

    /* Rule 5 — the same id again is a retry and must keep working */
    const r1again = env.post({ kind: 'leave', token: a, leave: { id: 'L1', from: '2026-08-20', to: '2026-08-21', days: 2, type: 'CL', reason: 'family function' } });
    t.eq(r1again.ok, true, 'the same id resent is a retry, not a refusal');
    t.eq(env.sheets['Leave'].rows.length - 1, 1, 'and raises no second row');

    /* a fresh id over the same days is the double-tap — refused, and told
       which application it collides with */
    const dup = env.post({ kind: 'leave', token: a, leave: { id: 'L1b', from: '2026-08-21', to: '2026-08-22', days: 2, type: 'CL' } });
    t.eq(dup.ok, false, 'an overlapping application is refused');
    t.eq(dup.duplicate, true, 'flagged as the duplicate it is');
    t.eq(dup.existingId, 'L1', 'and names the spell it collides with');
    t.contains(dup.error, 'already with the Collector', 'in words the officer can act on');

    /* another officer's overlap is not a collision */
    const other = env.post({ kind: 'leave', token: b, leave: { id: 'L2', from: '2026-08-20', to: '2026-08-21', days: 2, type: 'CL' } });
    t.eq(other.ok, true, 'the spell rule is per officer, not per district');

    /* sanction: the Collector alone */
    const notCdm = env.post({ kind: 'leaveDecision', token: b, id: 'L1', status: 'APPROVED' });
    t.eq(notCdm.ok, false, 'an MPDO cannot sanction');
    const ok = env.post({ kind: 'leaveDecision', token: cdm, id: 'L1', status: 'APPROVED', remarks: 'Sanctioned.' });
    t.eq(ok.ok, true, 'the Collector sanctions');
    t.eq(ok.status, 'APPROVED', 'and the register turns APPROVED');

    const twice = env.post({ kind: 'leaveDecision', token: cdm, id: 'L1', status: 'REJECTED' });
    t.eq(twice.ok, false, 'orders once passed cannot be passed again');
    t.contains(twice.error, 'already been passed', 'and the refusal says so');

    /* a decided application is closed to the field */
    const editClosed = env.post({ kind: 'leave', token: a, leave: { id: 'L1', from: '2026-08-20', to: '2026-08-25', days: 6, type: 'CL' } });
    t.eq(editClosed.closed, true, 'a sanctioned spell cannot be stretched from the phone');
    const stillTwo = env.col('Leave', 'days').map(Number);
    t.eq(stillTwo[0], 2, 'the sanctioned days stand at 2');

    /* overlap with a SANCTIONED spell reads differently */
    const dupApproved = env.post({ kind: 'leave', token: a, leave: { id: 'L1c', from: '2026-08-21', to: '2026-08-21', days: 1, type: 'CL' } });
    t.contains(dupApproved.error, 'already sanctioned', 'the officer is told leave already stands for those days');

    /* the balance is the server's arithmetic: 2026 opens with 6 CL */
    const r3 = env.post({ kind: 'leave', token: a, leave: { id: 'L3', from: '2026-09-01', to: '2026-09-02', days: 2, type: 'CL' } });
    t.eq(r3.ok, true, 'a second spell within balance is taken');
    env.post({ kind: 'leaveDecision', token: cdm, id: 'L3', status: 'APPROVED' });
    const r4 = env.post({ kind: 'leave', token: a, leave: { id: 'L4', from: '2026-10-05', to: '2026-10-09', days: 5, type: 'CL' } });
    t.eq(r4.ok, true, 'applying is free — the check falls at sanction');
    const over = env.post({ kind: 'leaveDecision', token: cdm, id: 'L4', status: 'APPROVED' });
    t.eq(over.ok, false, '4 taken + 5 sought > 6: refused');
    t.contains(over.error, 'exceed', 'with the arithmetic shown');
    const rej = env.post({ kind: 'leaveDecision', token: cdm, id: 'L4', status: 'REJECTED', remarks: 'Balance exhausted.' });
    t.eq(rej.ok, true, 'rejecting it is still open');

    /* withdrawal: the applicant's own, and only while it waits */
    const r5 = env.post({ kind: 'leave', token: a, leave: { id: 'L5', from: '2026-11-02', to: '2026-11-02', days: 1, type: 'CL' } });
    t.eq(r5.ok, true, 'one more application');
    const notMine = env.post({ kind: 'leaveWithdraw', token: b, id: 'L5' });
    t.eq(notMine.ok, false, 'nobody withdraws another officer’s application');
    const wd = env.post({ kind: 'leaveWithdraw', token: a, id: 'L5' });
    t.eq(wd.status, 'CANCELLED', 'the applicant takes his own back');
    const wdDecided = env.post({ kind: 'leaveWithdraw', token: a, id: 'L1' });
    t.eq(wdDecided.ok, false, 'a sanctioned spell is beyond withdrawal');
    const wdGhost = env.post({ kind: 'leaveWithdraw', token: a, id: 'NEVER-SENT' });
    t.eq(wdGhost.ok, true, 'withdrawing an application that never reached the district is quietly fine');
    t.eq(wdGhost.local, true, 'and marked as local-only, so the phone can clean up');

    /* Rule 4 — the register an applicant reads is his own */
    const mine = env.get('leave', { token: a });
    t.ok(mine.rows.every(r => r.phone === '9000000011'), 'an applicant sees his file and nobody else’s');
    const theirs = env.get('leave', { token: b });
    t.eq(theirs.rows.length, 1, 'B sees exactly his one application');
    const allRows = env.get('leave', { token: cdm });
    t.ok(allRows.rows.length >= 5, 'the Collector sees the whole register');
  }
};

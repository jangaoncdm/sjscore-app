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

    /* a sanctioned spell can be given back — WHOLE, and only BEFORE it begins */
    const wdDecided = env.post({ kind: 'leaveWithdraw', token: a, id: 'L1' });
    t.eq(wdDecided.status, 'CANCELLED', 'sanctioned leave not yet begun comes back whole');
    const lHead2 = env.sheets['Leave'].rows[0].map(String);
    const l1Row = env.sheets['Leave'].rows.find(r => String(r[0]) === 'L1');
    t.contains(String(l1Row[lHead2.indexOf('decidedBy')]), 'before it began', 'the register says how it ended');
    t.ok(!c.sanctionedSet_('2026-08-20')['9000000011'], 'the day no longer covers him — attendance is due again');
    t.eq(c.clUsed_('9000000011', 2026), 2, 'the days return to the account (only L3 still counts)');
    const started = env.post({ kind: 'leave', token: b, leave: { id: 'LC2', from: '2026-08-14', to: '2026-08-15', days: 2, type: 'EL' } });
    t.eq(started.ok, true, 'B takes leave from today');
    env.post({ kind: 'leaveDecision', token: cdm, id: 'LC2', status: 'APPROVED' });
    const cs = env.post({ kind: 'leaveWithdraw', token: b, id: 'LC2' });
    t.eq(cs.ok, false, 'leave that has begun is a fact');
    t.contains(cs.error, 'already begun', 'and only the Collector’s office can rule on it');

    /* sent back for correction: neither refused nor sanctioned */
    env.post({ kind: 'leave', token: a, leave: { id: 'L6', from: '2026-11-10', to: '2026-11-12', days: 3, type: 'EL', reason: 'inspection tour' } });
    const noRem = env.post({ kind: 'leaveDecision', token: cdm, id: 'L6', status: 'RETURNED' });
    t.eq(noRem.ok, false, 'sending back without remarks says nothing');
    t.contains(noRem.error, 'what needs correcting', 'and is refused in words');
    const back = env.post({ kind: 'leaveDecision', token: cdm, id: 'L6', status: 'RETURNED', remarks: 'Dates clash with the review — shift by a week.' });
    t.eq(back.status, 'RETURNED', 'with remarks, it travels back');
    const fix = env.post({ kind: 'leave', token: a, leave: { id: 'L6', from: '2026-11-17', to: '2026-11-19', days: 3, type: 'EL', reason: 'inspection tour, shifted' } });
    t.eq(fix.status, 'PENDING', 'the corrected copy goes in under the SAME application and waits again');
    const l6Row = env.sheets['Leave'].rows.find(r => String(r[0]) === 'L6');
    t.eq(String(l6Row[lHead2.indexOf('fromDate')]), '2026-11-17', 'with the corrected dates');
    t.eq(String(l6Row[lHead2.indexOf('remarks')]), '', 'the return remarks stand cleared for fresh orders');
    t.eq(env.sheets['Leave'].rows.filter(r => String(r[0]) === 'L6').length, 1, 'one row, not two');
    t.eq(env.post({ kind: 'leaveDecision', token: cdm, id: 'L6', status: 'APPROVED' }).ok, true, 'and can now be sanctioned');
    const wdGhost = env.post({ kind: 'leaveWithdraw', token: a, id: 'NEVER-SENT' });
    t.eq(wdGhost.ok, true, 'withdrawing an application that never reached the district is quietly fine');
    t.eq(wdGhost.local, true, 'and marked as local-only, so the phone can clean up');

    /* the Optional Holiday: one NOTIFIED day, five a year, the list is law */
    const oh1 = env.post({ kind: 'leave', token: b, leave: { id: 'OH1', from: '2026-09-23', to: '2026-09-23', days: 3, type: 'OH' } });
    t.eq(oh1.ok, true, 'a notified optional date is taken');
    const ohRow = env.sheets['Leave'].rows.find(r => String(r[0]) === 'OH1');
    const lHead = env.sheets['Leave'].rows[0].map(String);
    t.eq(Number(ohRow[lHead.indexOf('days')]), 1, 'and it is one day whatever the client claimed');
    t.contains(String(ohRow[lHead.indexOf('reason')]), 'Yaz Dahum Shareef', 'the occasion names itself on the register');
    const ohBad = env.post({ kind: 'leave', token: b, leave: { id: 'OH2', from: '2026-09-24', to: '2026-09-24', days: 1, type: 'OH' } });
    t.eq(ohBad.ok, false, 'a date off the notified list is refused');
    t.contains(ohBad.error, 'notified optional-holiday list', 'in words');
    const ohSpan = env.post({ kind: 'leave', token: b, leave: { id: 'OH3', from: '2026-10-19', to: '2026-10-26', days: 8, type: 'OH' } });
    t.contains(ohSpan.error, 'single day', 'an optional holiday cannot span');
    /* the five-a-year cap falls at sanction, like CL's */
    ['2026-10-19', '2026-10-26', '2026-11-08', '2026-12-24'].forEach((d2, i2) =>
      env.post({ kind: 'leave', token: b, leave: { id: 'OHm' + i2, from: d2, to: d2, days: 1, type: 'OH' } }));
    ['OH1', 'OHm0', 'OHm1', 'OHm2', 'OHm3'].forEach(id2 =>
      env.post({ kind: 'leaveDecision', token: cdm, id: id2, status: 'APPROVED' }));
    env.post({ kind: 'leave', token: b, leave: { id: 'OH6', from: '2026-12-26', to: '2026-12-26', days: 1, type: 'OH' } });
    const ohOver = env.post({ kind: 'leaveDecision', token: cdm, id: 'OH6', status: 'APPROVED' });
    t.eq(ohOver.ok, false, 'the sixth optional holiday of the year is refused');
    t.contains(ohOver.error, 'OH: 5', 'with the arithmetic shown');
    /* a sanctioned optional holiday answers for the day, like any leave */
    t.ok(c.sanctionedSet_('2026-09-23')['9000000012'], 'the day is covered — no notice can arise on it');

    /* the whole waiting list in one order — each application still answers
       its own checks, and a refusal is named, never silent */
    [['2026-12-07','2026-12-08'], ['2026-12-14','2026-12-15'], ['2026-12-21','2026-12-22']].forEach((p3, i3) =>
      env.post({ kind: 'leave', token: a, leave: { id: 'LB' + i3, from: p3[0], to: p3[1], days: 2, type: 'CL' } }));
    const bulkBad = env.post({ kind: 'leaveDecision', token: cdm, ids: ['LB0'], status: 'REJECTED' });
    t.eq(bulkBad.ok, false, 'only sanction passes in bulk');
    t.contains(bulkBad.error, 'their own words', 'refusals and returns are per-case');
    const bulk = env.post({ kind: 'leaveDecision', token: cdm, ids: ['LB0', 'LB1', 'LB2', 'L6'], status: 'APPROVED' });
    t.eq(bulk.ok, true, 'the batch is taken');
    t.eq(bulk.done, 2, 'two sanction — the third would breach the year’s CL');
    t.eq(bulk.refused.length, 2, 'two are refused by name');
    t.contains(bulk.refused.find(x => x.id === 'LB2').error, 'exceed', 'the fifth and sixth CL day count the four sanctioned just before them');
    t.contains(bulk.refused.find(x => x.id === 'L6').error, 'already been passed', 'the already-decided one says so');
    const lbHead = env.sheets['Leave'].rows[0].map(String);
    t.eq(String(env.sheets['Leave'].rows.find(r => String(r[0]) === 'LB2')[lbHead.indexOf('status')]), 'PENDING',
      'the refused application stays waiting for the single-order look');
    t.eq(c.clUsed_('9000000011', 2026), 6, 'the register closes the year’s CL at exactly its entitlement');

    /* Rule 4 — the register an applicant reads is his own */
    const mine = env.get('leave', { token: a });
    t.ok(mine.rows.every(r => r.phone === '9000000011'), 'an applicant sees his file and nobody else’s');
    const theirs = env.get('leave', { token: b });
    t.eq(theirs.rows.length, 8, 'B sees exactly his own: one CL, six optional-holiday applications, one begun-and-standing EL');
    t.ok(theirs.rows.every(r => r.phone === '9000000012'), 'and nobody else’s');
    const allRows = env.get('leave', { token: cdm });
    t.ok(allRows.rows.length >= 5, 'the Collector sees the whole register');
  }
};

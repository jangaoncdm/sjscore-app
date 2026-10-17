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

    /* THE COLLECTOR'S ORDER FOR 2026 — three optional holidays, not the five
       of Annexure-II. Scoped to the year: 2027 takes the G.O.'s figure back
       by itself, without anybody editing anything. */
    t.eq(c.entitlement_('OH', 2026), 3, 'three optional holidays are granted for 2026');
    t.eq(c.entitlement_('OH', 2027), 5, "and 2027 takes the G.O.'s five back by itself");
    t.eq(c.entitlement_('CL', 2026), 6, 'the casual-leave opening balance is untouched');

    /* the Optional Holiday: one NOTIFIED day, the list is law */
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
    /* the cap falls at sanction, like CL's — the app may ask, the server decides */
    ['2026-10-19', '2026-10-26', '2026-11-08', '2026-12-24'].forEach((d2, i2) =>
      env.post({ kind: 'leave', token: b, leave: { id: 'OHm' + i2, from: d2, to: d2, days: 1, type: 'OH' } }));
    ['OH1', 'OHm0'].forEach(id2 =>
      t.eq(env.post({ kind: 'leaveDecision', token: cdm, id: id2, status: 'APPROVED' }).ok, true,
        'the first two optional holidays are sanctioned'));
    t.eq(env.post({ kind: 'leaveDecision', token: cdm, id: 'OHm1', status: 'APPROVED' }).ok, true,
      'and the third');
    const ohOver = env.post({ kind: 'leaveDecision', token: cdm, id: 'OHm2', status: 'APPROVED' });
    t.eq(ohOver.ok, false, 'the fourth optional holiday of 2026 is refused');
    t.contains(ohOver.error, 'OH: 3', 'with the arithmetic shown');
    t.contains(ohOver.error, '2026', 'against the year it is counted in');
    /* REFUSED IS NOT DESTROYED. The application stays on the register, awaiting
       the Collector, and he may still refuse it in words — the balance check
       declines to sanction, it does not delete. */
    t.eq(String(env.sheets['Leave'].rows.find(r2 => String(r2[0]) === 'OHm2')[
      env.sheets['Leave'].rows[0].map(String).indexOf('status')] || 'PENDING'), 'PENDING',
      'the refused-over-balance application is left standing, not struck off');

    /* AN ORDER REACHES FORWARD, NOT BACK. An officer who already holds more
       than three sanctioned for 2026 keeps every one of them: the check counts
       what is APPROVED and declines the NEXT one. Nothing is reversed, no
       sanction already passed is disturbed, and no debit arises — reducing what
       remains is not undoing what the Collector has already granted. */
    const held = ['2026-01-01', '2026-01-16', '2026-03-31', '2026-05-01'];
    const lH = env.sheets['Leave'].rows[0].map(String);
    held.forEach((d2, i2) => env.addRow('Leave', {
      id: 'OHold' + i2, phone: '9000000011', name: 'M. MPO', role: 'MPO', mandal: 'Jangaon',
      type: 'OH', fromDate: d2, toDate: d2, days: 1, status: 'APPROVED',
      appliedAt: '2026-01-01T04:00:00.000Z' }));
    held.forEach((d2, i2) => {
      const row = env.sheets['Leave'].rows.find(r2 => String(r2[0]) === 'OHold' + i2);
      t.eq(String(row[lH.indexOf('status')]), 'APPROVED',
        'the optional holiday of ' + d2 + ' already sanctioned still stands');
      t.ok(!!c.sanctionedSet_(d2)['9000000011'],
        'and still answers for the day — no notice can arise on it');
    });
    env.post({ kind: 'leave', token: a, leave: { id: 'OHnext', from: '2026-06-04', to: '2026-06-04', days: 1, type: 'OH' } });
    const ohPast = env.post({ kind: 'leaveDecision', token: cdm, id: 'OHnext', status: 'APPROVED' });
    t.eq(ohPast.ok, false, 'but the next one he asks for is refused');
    t.contains(ohPast.error, '4 already sanctioned', 'and the order is honest about what he already holds');
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

    /* MEDICAL LEAVE — NO YEARLY FIGURE, BUT NOT MORE THAN FIFTEEN DAYS AT A
       TIME (the Collector's order). An illness does not keep to an allowance,
       so there is nothing here to count against the year; what is capped is
       the spell. 2027 is used throughout so these dates meet none of the
       spells applied for above. */
    const d = c.issueToken_(c.findByPhone_(9000000014));   /* D — a Panchayat Secretary, nothing applied for yet */
    t.eq(c.entitlement_('ML', 2027), 0, 'medical leave answers to no yearly figure');
    t.eq(c.entitlement_('ML', 2026), 0, 'in the opening year either');

    const ml1 = env.post({ kind: 'leave', token: d, leave: { id: 'ML1', from: '2027-01-01', to: '2027-01-15', days: 15, type: 'ML', reason: 'admitted', cert: 'Govt. Hospital, Jangaon, 31.12.2026' } });
    t.eq(ml1.ok, true, 'fifteen days of medical leave is taken');
    const ml1again = env.post({ kind: 'leave', token: d, leave: { id: 'ML1', from: '2027-01-01', to: '2027-01-15', days: 15, type: 'ML' } });
    t.eq(ml1again.ok, true, 'and the same id resent is still a retry, not a refusal');
    t.eq(env.sheets['Leave'].rows.filter(r => String(r[0]) === 'ML1').length, 1, 'one row, not two');

    const ml16 = env.post({ kind: 'leave', token: d, leave: { id: 'ML2', from: '2027-03-01', to: '2027-03-16', days: 16, type: 'ML' } });
    t.eq(ml16.ok, false, 'sixteen days in one spell is refused');
    t.contains(ml16.error, '15 days at a time', 'in the words of the order');
    t.contains(ml16.error, '16 days', 'with the arithmetic shown');
    t.contains(ml16.error, 'Collector', 'and the officer told where a longer absence is decided');
    t.eq(env.sheets['Leave'].rows.filter(r => String(r[0]) === 'ML2').length, 0, 'and nothing is written for it');

    t.eq(env.post({ kind: 'leaveDecision', token: cdm, id: 'ML1', status: 'APPROVED' }).ok, true,
      'the fifteen days sanction — no balance stands in the way');

    /* THE CAP IS ON THE SPELL, NOT ON THE APPLICATION. Fifteen days sanctioned
       and one more beginning the very next morning is sixteen days at a time,
       and two rows in a register do not make that two absences. */
    const mlJoin = env.post({ kind: 'leave', token: d, leave: { id: 'ML3', from: '2027-01-16', to: '2027-01-16', days: 1, type: 'ML' } });
    t.eq(mlJoin.ok, false, 'a day that runs straight on from a sanctioned spell is refused');
    t.contains(mlJoin.error, 'one spell', 'because it is one spell');
    t.contains(mlJoin.error, '16 days', 'counted together');

    /* a clear day between them is a break, and a break is a new spell */
    const mlGap = env.post({ kind: 'leave', token: d, leave: { id: 'ML4', from: '2027-01-17', to: '2027-01-17', days: 1, type: 'ML' } });
    t.eq(mlGap.ok, true, 'with a day in between, it is a fresh spell and is taken');

    /* Rule 6 — the day count comes from the DATES. The phone only asks. */
    const mlLies = env.post({ kind: 'leave', token: d, leave: { id: 'ML5', from: '2027-05-01', to: '2027-05-20', days: 1, type: 'ML' } });
    t.eq(mlLies.ok, false, 'twenty days sent as one is still twenty days');
    t.contains(mlLies.error, '20 days', 'measured off the dates, not off the claim');

    /* and there is no annual ceiling to run into: a second full spell later in
       the same year is taken and sanctioned like the first */
    const ml2nd = env.post({ kind: 'leave', token: d, leave: { id: 'ML6', from: '2027-06-01', to: '2027-06-15', days: 15, type: 'ML' } });
    t.eq(ml2nd.ok, true, 'a second fifteen-day spell in the same year is taken');
    t.eq(env.post({ kind: 'leaveDecision', token: cdm, id: 'ML6', status: 'APPROVED' }).ok, true,
      'and sanctioned — thirty days of medical leave in a year is not a breach');

    /* a spell sent back for correction is not counted against itself */
    env.post({ kind: 'leave', token: d, leave: { id: 'ML7', from: '2027-09-01', to: '2027-09-10', days: 10, type: 'ML' } });
    env.post({ kind: 'leaveDecision', token: cdm, id: 'ML7', status: 'RETURNED', remarks: 'Enclose the certificate.' });
    const mlFix = env.post({ kind: 'leave', token: d, leave: { id: 'ML7', from: '2027-09-01', to: '2027-09-14', days: 14, type: 'ML', cert: 'Govt. Hospital, Jangaon, 31.08.2027' } });
    t.eq(mlFix.ok, true, 'the corrected copy is measured on its own, not added to the copy it replaces');

    /* THE TWIN THAT COULD NEVER BE CLEARED. Before saveLeave_ took the lock, a
       retry racing its original put the same id on the register twice. The
       Collector sanctioned it, the FIRST row turned APPROVED — and the twin sat
       PENDING for ever, because every further order looked the id up, found
       that first row already decided, and answered "orders have already been
       passed". Reported from the district on 25.08.2026 in those words: three
       applications standing in Awaiting your orders, leave already sanctioned.
       An order is passed on the APPLICATION, so it must reach every row of it.

       The console's payload is cached for 50 seconds, so everything this block
       is going to assert is set up first and read once. */
    const twinHead = env.sheets['Leave'].rows[0].map(String);
    const ixL = k => twinHead.indexOf(k);
    const twinRow = {
      id:'LVtwin', phone:'9000000014', name:'D. FirstMiss', role:'PS', mandal:'Jangaon',
      type:'CL', fromDate:'2028-02-10', toDate:'2028-02-11', days:2, status:'PENDING',
      appliedAt:'2028-02-01T04:00:00.000Z' };
    env.addRow('Leave', twinRow);
    env.addRow('Leave', twinRow);                 /* the race, as it happened */
    t.eq(env.sheets['Leave'].rows.filter(r => String(r[0]) === 'LVtwin').length, 2,
      'the register holds the same application twice');

    /* the case that was actually stuck on the district's console: the first
       row sanctioned days ago, the second left behind and undecidable */
    const stuck = { id:'LVstuck', phone:'9000000014', name:'D. FirstMiss', role:'PS', mandal:'Jangaon',
      type:'CL', fromDate:'2028-03-10', toDate:'2028-03-10', days:1,
      appliedAt:'2028-03-01T04:00:00.000Z' };
    env.addRow('Leave', Object.assign({}, stuck, { status:'APPROVED', decidedAt:'2028-03-02T04:00:00.000Z' }));
    env.addRow('Leave', Object.assign({}, stuck, { status:'PENDING' }));

    /* A ROW WITH NO ID IS NOT AN APPLICATION. It cannot be decided — every
       order is passed by id — so it must not stand in the waiting list as one
       more officer, the way a blank row once became "the standing advisory". */
    env.addRow('Leave', { id:'', phone:'9000000014', name:'', role:'', mandal:'',
      type:'', fromDate:'', toDate:'', days:0, status:'', appliedAt:'' });

    const twinOk = env.post({ kind:'leaveDecision', token:cdm, id:'LVtwin', status:'APPROVED', remarks:'Sanctioned.' });
    t.eq(twinOk.ok, true, 'the Collector sanctions the duplicated application');
    t.eq(twinOk.rows, 2, 'and the order is written to BOTH rows of it');
    t.eq(env.sheets['Leave'].rows.filter(r => String(r[0]) === 'LVtwin')
      .map(r => String(r[ixL('status')])).join(','), 'APPROVED,APPROVED',
      'no row of it is left waiting');

    /* the console, read once */
    const dashTwin = env.get('dashboard', { token: cdm });
    t.eq(dashTwin.leave.pending.filter(l => l.id === 'LVtwin').length, 0,
      'Awaiting your orders does not carry the application just sanctioned');
    t.eq(dashTwin.leave.pending.filter(l => l.id === 'LVstuck').length, 0,
      'nor the twin of one sanctioned days ago — the row that would not clear');
    t.eq(dashTwin.leave.recent.filter(l => l.id === 'LVstuck').length, 1,
      'it is read as the one sanctioned application it is');
    t.eq(dashTwin.leave.recent.filter(l => l.id === 'LVtwin').length, 1,
      'and a duplicated application is one line in the orders, not two');
    t.eq(dashTwin.leave.pending.filter(l => !String(l.id || '').trim()).length, 0,
      'a blank row at the foot of the tab is not an officer awaiting orders');

    /* ONE LINE PER APPLICATION on the officer's phone too */
    const dList = env.get('leave', { token: d });
    t.eq(dList.rows.filter(r => r.id === 'LVtwin').length, 1,
      'a twin on the register raises one card, not two');

    /* ONE SPELL, ONE DEBIT TO THE YEAR. Counting a duplicated row twice
       refuses an officer leave he still holds — and that same arithmetic is
       what turns the next debit into loss of pay. */
    t.eq(c.clUsed_('9000000014', 2028), 3, 'each duplicated spell is counted once, not twice');

    /* AND THE STUCK TWIN IS DECIDABLE AGAIN — the order reaches it and settles
       it, instead of being refused as already passed. */
    const stuckOk = env.post({ kind:'leaveDecision', token:cdm, id:'LVstuck', status:'APPROVED', remarks:'Sanctioned.' });
    t.eq(stuckOk.ok, true, 'the order the Collector could never pass now passes');
    t.eq(env.sheets['Leave'].rows.filter(r => String(r[0]) === 'LVstuck')
      .map(r => String(r[ixL('status')])).join(','), 'APPROVED,APPROVED',
      'and settles every row of it');
    /* idempotent: passing it again changes nothing and is honest about why */
    const stuckTwice = env.post({ kind:'leaveDecision', token:cdm, id:'LVstuck', status:'APPROVED' });
    t.eq(stuckTwice.ok, false, 'a second order on a settled application is refused');
    t.contains(stuckTwice.error, 'already been passed', 'in the register’s own words');

    /* Rule 4 — the register an applicant reads is his own */
    const mine = env.get('leave', { token: a });
    t.ok(mine.rows.every(r => r.phone === '9000000011'), 'an applicant sees his file and nobody else’s');
    const theirs = env.get('leave', { token: b });
    t.eq(theirs.rows.length, 7, 'B sees exactly his own: one CL, five optional-holiday applications, one begun-and-standing EL');
    t.ok(theirs.rows.every(r => r.phone === '9000000012'), 'and nobody else’s');
    const allRows = env.get('leave', { token: cdm });
    t.ok(allRows.rows.length >= 5, 'the Collector sees the whole register');
  }
};

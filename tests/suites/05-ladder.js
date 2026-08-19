/* The doctrine of the notice ladder, run end to end through the real
   issueAbsenceNotices() against mocked sheets. One evening pass on Friday
   14 August 2026, with the 11th a declared holiday, and the district
   demonstrably running on the 10th, 12th and 13th.

   Eight officers, one of each fate:
     A. Punctual   marked 09:00                     → nothing
     B. LateMark   marked 11:30 by his own clock    → reminder, LATE_MARK, never a miss
     C. LateSync   marked 10:45, arrived 12:30      → reminder, LATE_SYNC, never a miss
     D. FirstMiss  first unmarked day of the month  → reminder, miss 1
     G. SecondMiss second unmarked day              → reminder, miss 2
     E. ThirdMiss  third unmarked day               → show-cause notice PROPOSED, not served
     F. OnLeave    sanctioned leave covers the day  → nothing
     Collector     exempt                           → nothing */
'use strict';
const mock = require('../gasmock.js');

function build(){
  const env = mock.load({ now: '2026-08-14T18:05:00+05:30' });
  env.seedUsers();
  env.mkSheet('Holidays', ['Date', 'Occasion'], [{ Date: '2026-08-11', Occasion: 'Test Holiday' }]);
  env.mkSheet('Leave', env.eval('L_HEAD'), [{
    id: 'LV-F', phone: '9000000016', name: 'F. OnLeave', role: 'MPDO', mandal: 'Chilpur',
    type: 'CL', fromDate: '2026-08-14', toDate: '2026-08-15', days: 2, status: 'APPROVED'
  }]);

  const at = (d, hm) => '2026-08-' + d + 'T' + hm + ':00+05:30';
  ['9000000011', '9000000012', '9000000013', '9000000014'].forEach(p => {
    env.mark(p, '2026-08-10', at('10', '09:00'));
    env.mark(p, '2026-08-12', at('12', '09:00'));
    env.mark(p, '2026-08-13', at('13', '09:00'));
  });
  env.mark('9000000017', '2026-08-10', at('10', '09:10'));           /* G missed the 12th */
  env.mark('9000000017', '2026-08-13', at('13', '09:10'));
  env.mark('9000000015', '2026-08-13', at('13', '09:20'));           /* E missed 10th and 12th */

  env.mark('9000000011', '2026-08-14', at('14', '09:00'), at('14', '09:01'));  /* A: in time */
  env.mark('9000000012', '2026-08-14', at('14', '11:30'), at('14', '11:31'));  /* B: late by his own clock */
  env.mark('9000000013', '2026-08-14', at('14', '10:45'), at('14', '12:30'));  /* C: in time, signal late */
  return env;
}

module.exports = {
  name: 'the notice ladder (issueAbsenceNotices)',
  build: build,
  run(t, log){
    const env = build();
    env.ctx.issueAbsenceNotices();

    const remKind = {}, remMiss = {};
    const rsh = env.sheets['Reminders'];
    const rHead = rsh.rows[0].map(String);
    rsh.rows.slice(1).forEach(r => {
      const o = {}; rHead.forEach((h, i) => { o[h] = r[i]; });
      remKind[String(o.phone)] = String(o.kind);
      remMiss[String(o.phone)] = Number(o.miss);
    });

    log('Reminders written: ' + rsh.rows.slice(1).map(r => r[rHead.indexOf('name')] + ' (' + r[rHead.indexOf('kind')] + ')').join(', '));
    t.eq(rsh.rows.length - 1, 4, 'four reminders: two late arrivals, miss 1, miss 2');
    t.eq(remKind['9000000012'], 'LATE_MARK', 'B was late by his own clock');
    t.eq(remKind['9000000013'], 'LATE_SYNC', 'C’s signal was late, and the register says so');
    t.eq(remKind['9000000014'], 'MISS', 'D missed');
    t.eq(remMiss['9000000014'], 1, 'D’s first miss of the month');
    t.eq(remMiss['9000000017'], 2, 'G’s second miss of the month');
    t.ok(!remKind['9000000011'], 'A, marked in time, draws nothing');
    t.ok(!remKind['9000000016'], 'F, on sanctioned leave, draws nothing');
    t.ok(!remKind['9000000015'], 'E draws no reminder — the third miss escalates instead');
    t.ok(!remKind['9000000010'], 'M, the MSO, unmarked all month, draws nothing — his attendance is voluntary');

    const nsh = env.sheets['Notices'];
    const nHead = nsh.rows[0].map(String);
    const notices = nsh.rows.slice(1).map(r => { const o = {}; nHead.forEach((h, i) => { o[h] = r[i]; }); return o; });
    log('Notices proposed: ' + notices.map(n => n.name + ' seq ' + n.seq + ' status ' + n.status).join(', '));
    t.eq(notices.length, 1, 'one show-cause notice, and only one — the MSO’s empty month raises none');
    t.eq(String(notices[0].phone), '9000000015', 'it is E’s');
    t.eq(String(notices[0].status), 'PROPOSED', 'proposed — nothing is served without the Collector’s approval');
    t.eq(Number(notices[0].seq), 3, 'the standing is the third miss');
    t.eq(String(notices[0].no), '', 'no number — approval assigns the /SJSP-SCN/ number');
    t.eq(String(notices[0].id), 'NTC-2026-08-14-9000000015', 'the id is deterministic, so a re-run cannot double it');

    /* the proposal is not mailed to the officer; reminders are */
    t.ok(!env.outbox.some(m => m.to === 'e@mock.example'), 'E receives no email until the Collector serves');
    t.ok(env.outbox.some(m => m.to === 'b@mock.example'), 'B’s reminder is mailed at once');
    const summary = env.outbox.find(m => m.to === env.adminEmail);
    t.ok(!!summary, 'the Collector receives the day’s summary');
    t.contains(summary.subject, '1 notice(s) for your approval', 'the summary counts the approval queue');
    t.contains(summary.body, 'NOTHING HAS BEEN SERVED', 'and says in words that nothing was served');

    /* Rule 8 — run it again and the second run changes nothing */
    const remBefore = rsh.rows.length, ntcBefore = nsh.rows.length;
    env.ctx.issueAbsenceNotices();
    t.eq(rsh.rows.length, remBefore, 'a second run adds no reminder');
    t.eq(nsh.rows.length, ntcBefore, 'a second run adds no notice');
    log('Second run: no new rows — idempotent.');

    /* off days do nothing at all */
    env.setNow('2026-08-16T18:05:00+05:30');                         /* Sunday */
    env.ctx.issueAbsenceNotices();
    t.eq(rsh.rows.length, remBefore, 'a Sunday pass writes nothing');
    env.mkSheet('Holidays', ['Date', 'Occasion'], [{ Date: '2026-08-17', Occasion: 'Local Holiday' }]);
    env.setNow('2026-08-17T18:05:00+05:30');
    env.ctx.issueAbsenceNotices();
    t.eq(nsh.rows.length, ntcBefore, 'a holiday pass writes nothing');
    log('Sunday and holiday passes: nothing to do.');

    /* THE MID-MONTH GUARD. A fresh district that first ran today can
       propose nothing: there is only one active day, so nobody can be at
       three misses — however many calendar days stand unmarked behind him. */
    const env2 = mock.load({ now: '2026-08-14T18:05:00+05:30' });
    env2.seedUsers();
    env2.mkSheet('Holidays', ['Date', 'Occasion'], []);
    env2.mkSheet('Leave', env2.eval('L_HEAD'), []);
    env2.mark('9000000011', '2026-08-14', '2026-08-14T09:00:00+05:30');
    env2.ctx.issueAbsenceNotices();
    t.eq(env2.sheets['Notices'].rows.length, 1, 'switching the ladder on mid-month manufactures no notice');
    t.ok(env2.sheets['Reminders'].rows.length > 1, 'the unmarked draw first-miss reminders only');
    env2.sheets['Reminders'].rows.slice(1).forEach(r => {
      const i = env2.sheets['Reminders'].rows[0].indexOf('miss');
      t.eq(Number(r[i]), 1, 'every miss count opens at 1 on the district’s first day');
    });
    log('Mid-month start: reminders at miss 1, no notice — nobody inherits a fortnight of misses.');
  }
};

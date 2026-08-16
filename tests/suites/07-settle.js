/* The settlement. It runs the NEXT morning and judges the day that has
   CLOSED — attendance is read a third time before a rupee moves, only a
   SERVED notice at the third miss or beyond can debit, and acknowledgement
   is receipt, not excuse. */
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'settlement (settleAbsenceDebits, clUsed_)',
  run(t){
    const env = mock.load({ now: '2026-08-15T09:05:00+05:30' });   /* the morning after */
    const c = env.ctx;
    env.seedUsers([{ Phone: '9000000018', Name: 'H. Exhausted', Role: 'MPO', Mandal: 'Jangaon', Email: 'h@mock.example', Active: 'TRUE' }]);
    env.mkSheet('Holidays', ['Date', 'Occasion'], []);

    /* H has already taken the whole of 2026's casual leave */
    env.mkSheet('Leave', env.eval('L_HEAD'), [{
      id: 'LV-H', phone: '9000000018', name: 'H. Exhausted', role: 'MPO', mandal: 'Jangaon',
      type: 'CL', fromDate: '2026-08-03', toDate: '2026-08-08', days: 6, status: 'APPROVED'
    }]);
    t.eq(c.clUsed_('9000000018', 2026), 6, 'clUsed_ counts APPROVED CL of the year');
    t.eq(c.clUsed_('9000000018', 2025), 0, 'and of that year alone');
    t.eq(c.clUsed_('9000000015', 2026), 0, 'E has taken none');

    /* C's phone reached the district overnight — after the 18:00 reading */
    env.mark('9000000013', '2026-08-14', '2026-08-14T10:50:00+05:30', '2026-08-14T21:40:00+05:30');

    const N = env.eval('N_HEAD');
    env.mkSheet('Notices', N, [
      { id: 'N-E', date: '2026-08-14', phone: '9000000015', name: 'E. ThirdMiss',  role: 'MPO',  mandal: 'Chilpur', seq: 3, status: 'PENDING' },
      { id: 'N-H', date: '2026-08-14', phone: '9000000018', name: 'H. Exhausted',  role: 'MPO',  mandal: 'Jangaon', seq: 4, status: 'PENDING' },
      { id: 'N-A', date: '2026-08-14', phone: '9000000011', name: 'A. Punctual',   role: 'MPO',  mandal: 'Jangaon', seq: 3, status: 'ACK' },
      { id: 'N-B', date: '2026-08-14', phone: '9000000012', name: 'B. LateMark',   role: 'MPDO', mandal: 'Jangaon', seq: 2, status: 'PENDING' },
      { id: 'N-C', date: '2026-08-14', phone: '9000000013', name: 'C. LateSync',   role: 'MSO',  mandal: 'Chilpur', seq: 4, status: 'PENDING' },
      { id: 'N-G', date: '2026-08-14', phone: '9000000017', name: 'G. SecondMiss', role: 'MSO',  mandal: 'Jangaon', seq: 5, status: 'DROPPED' }
    ]);

    c.settleAbsenceDebits();          /* no date given: the previous working day, 14 August */

    const lHead = env.sheets['Leave'].rows[0].map(String);
    const leaves = env.sheets['Leave'].rows.slice(1).map(r => { const o = {}; lHead.forEach((h, i) => { o[h] = r[i]; }); return o; });
    const byId = {}; leaves.forEach(l => { byId[String(l.id)] = l; });

    t.eq(leaves.length, 4, 'exactly three debits joined H’s old spell on the register');

    const e = byId['SYSCL-2026-08-14-9000000015'];
    t.ok(!!e, 'E, served and still unmarked, is debited');
    t.eq(String(e.type), 'CL', 'one day of CL');
    t.eq(Number(e.days), 1, 'one day exactly');
    t.eq(String(e.status), 'APPROVED', 'entered as APPROVED — the rule sanctioned it, not a whim');
    t.contains(String(e.decidedBy), 'SYSTEM', 'and the register says the system did it');
    t.contains(String(e.reason), 'auto-debit under the SJSP attendance rule', 'the reason is written in full');

    const h = byId['SYSCL-2026-08-14-9000000018'];
    t.ok(!!h, 'H is debited too');
    t.eq(String(h.type), 'LOP', 'CL exhausted: loss of pay');
    t.contains(String(h.reason), 'loss of pay', 'and the reason says so');

    t.ok(!!byId['SYSCL-2026-08-14-9000000011'], 'A acknowledged — receipt is not excuse, the debit stands');
    t.ok(!byId['SYSCL-2026-08-14-9000000012'], 'B at seq 2 is below the debit line — reminders are free');
    t.ok(!byId['SYSCL-2026-08-14-9000000013'], 'C’s overnight sync cancelled the debit');
    t.ok(!byId['SYSCL-2026-08-14-9000000017'], 'a DROPPED notice can never debit');

    const nHead = env.sheets['Notices'].rows[0].map(String);
    const nById = {};
    env.sheets['Notices'].rows.slice(1).forEach(r => { const o = {}; nHead.forEach((h, i) => { o[h] = r[i]; }); nById[String(o.id)] = o; });
    t.eq(String(nById['N-E'].clDebited), 'TRUE', 'the notice carries the debit flag');
    t.eq(String(nById['N-E'].leaveId), 'SYSCL-2026-08-14-9000000015', 'and the cross-reference to the leave row');
    t.eq(String(nById['N-C'].clDebited), '', 'C’s notice carries no debit');

    const brief = env.outbox.find(m => m.to === env.adminEmail);
    t.ok(!!brief && /3 leave debit\(s\)/.test(brief.subject), 'the Collector is told: three debits');

    /* Rule 8 — settle the same day twice and the second run moves nothing */
    c.settleAbsenceDebits();
    t.eq(env.sheets['Leave'].rows.length - 1, 4, 'a second settlement debits nobody again');

    /* a chosen day can be settled by hand; an off day refuses */
    c.settleAbsenceDebits('2026-08-09');                         /* a Sunday */
    t.eq(env.sheets['Leave'].rows.length - 1, 4, 'a Sunday cannot be settled');
    t.ok(env.logs.some(l => /not a working day/.test(l)), 'and the log says why');

    /* after the debits, the ledger reads them */
    t.eq(c.clUsed_('9000000015', 2026), 1, 'E’s CL account now shows the day');
    t.eq(c.clUsed_('9000000018', 2026), 6, 'H’s LOP never touches the CL figure');
  }
};

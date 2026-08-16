/* Nothing is served without the Collector's approval — and between the 18:00
   reading and that approval the officer's phone may reach the district at
   last, so attendance is read a SECOND time and a cured proposal is never
   served, whatever was ticked. */
'use strict';
const mock = require('../gasmock.js');
const ladder = require('./05-ladder.js');

module.exports = {
  name: 'serving notices (decideNotices_, noticeAck)',
  run(t){
    const env = ladder.build();
    const c = env.ctx;
    c.issueAbsenceNotices();                          /* E's proposal is on the register */

    /* two more proposals, as an earlier pass would have left them */
    env.addRow('Notices', { id: 'NTC-2026-08-14-9000000014', date: '2026-08-14', phone: '9000000014',
      name: 'D. FirstMiss', role: 'PS', mandal: 'Jangaon', seq: 3, status: 'PROPOSED' });
    env.addRow('Notices', { id: 'NTC-2026-08-14-9000000017', date: '2026-08-14', phone: '9000000017',
      name: 'G. SecondMiss', role: 'MSO', mandal: 'Jangaon', seq: 3, status: 'PROPOSED' });

    /* D's phone found signal at seven in the evening — after the proposal */
    env.mark('9000000014', '2026-08-14', '2026-08-14T10:40:00+05:30', '2026-08-14T19:02:00+05:30');

    const collector = c.issueToken_(c.findByPhone_('9000000001'));
    const mpo = c.issueToken_(c.findByPhone_('9000000011'));

    /* Rule 6 — the server decides; the console's convenience is not authority */
    const refused = env.post({ kind: 'noticeDecide', token: mpo, approve: ['NTC-2026-08-14-9000000015'] });
    t.eq(refused.ok, false, 'an MPO cannot serve a notice');
    t.contains(refused.error, 'Collector alone', 'and is told so in words');

    const r = env.post({ kind: 'noticeDecide', token: collector,
      approve: ['NTC-2026-08-14-9000000015', 'NTC-2026-08-14-9000000014'],
      drop: ['NTC-2026-08-14-9000000017'] });
    t.eq(r.ok, true, 'the Collector’s decision is taken');
    t.eq(r.served, 1, 'one notice served');
    t.eq(r.cured, 1, 'one proposal cured on the second reading');
    t.eq(r.dropped, 1, 'one dropped');
    t.eq(r.mailed, 1, 'the served notice was mailed');

    const head = env.sheets['Notices'].rows[0].map(String);
    const byId = {};
    env.sheets['Notices'].rows.slice(1).forEach(row => {
      const o = {}; head.forEach((h, i) => { o[h] = row[i]; }); byId[String(o.id)] = o;
    });
    const served = byId['NTC-2026-08-14-9000000015'];
    t.eq(String(served.status), 'PENDING', 'served: PENDING until acknowledged');
    t.eq(String(served.no), '55/SJSP-SCN/2026', 'the signed series resumes at 55');
    t.contains(String(served.decidedBy), 'Sandeep Kumar Jha (COLLECTOR)', 'the register names who served it');
    t.eq(env.props['NOTICE_SEQ_NEXT'], '56', 'the running number advances once');

    const cured = byId['NTC-2026-08-14-9000000014'];
    t.eq(String(cured.status), 'CURED', 'D’s late sync cured the proposal');
    t.eq(String(cured.no), '', 'a cured proposal is never numbered');
    t.contains(String(cured.decidedBy), 'second reading', 'the register says the system withdrew it, not the Collector');
    t.ok(!env.outbox.some(m => m.to === 'd@mock.example' && /SHOW CAUSE/.test(m.subject)), 'D is never mailed a notice');

    t.eq(String(byId['NTC-2026-08-14-9000000017'].status), 'DROPPED', 'dropped dies unnumbered');
    t.eq(String(byId['NTC-2026-08-14-9000000017'].no), '', 'no number on a dropped proposal');

    /* the served copy carries the district's format, heading and rule */
    const mail = env.outbox.find(m => m.to === 'e@mock.example');
    t.ok(!!mail, 'E receives the served notice by mail');
    t.contains(mail.body, 'GOVERNMENT OF TELANGANA', 'the Government of Telangana heading');
    t.contains(mail.body, 'Notice No. 55/SJSP-SCN/2026', 'the assigned number');
    t.contains(mail.body, '14.08.2026', 'dates as dd.mm.yyyy on the served copy');
    t.contains(mail.body, 'Rule 3 of the Telangana Civil Services (Conduct) Rules, 1964', 'the rule invoked');
    t.contains(mail.body, '48 (forty-eight) hours', 'the 48-hour direction');
    t.contains(mail.body, 'SANDEEP KUMAR JHA, I.A.S.', 'the Collector’s signature block');

    /* deciding twice cannot serve twice or burn a second number */
    const again = env.post({ kind: 'noticeDecide', token: collector, approve: ['NTC-2026-08-14-9000000015'] });
    t.eq(again.served, 0, 'a served notice cannot be served again');
    t.eq(env.props['NOTICE_SEQ_NEXT'], '56', 'the series does not advance for it');

    /* acknowledgement is receipt, not excuse */
    const eTok = c.issueToken_(c.findByPhone_('9000000015'));
    const aTok = c.issueToken_(c.findByPhone_('9000000011'));
    const stranger = env.post({ kind: 'noticeAck', token: aTok, acks: [{ id: 'NTC-2026-08-14-9000000015' }] });
    t.eq(stranger.done, 0, 'an officer can acknowledge his own notices alone');

    const ack = env.post({ kind: 'noticeAck', token: eTok,
      acks: [{ id: 'NTC-2026-08-14-9000000015', note: 'Network failure at site; will produce records.' }] });
    t.eq(ack.done, 1, 'E acknowledges');
    t.eq(ack.pending, 0, 'nothing further stands against him, so the app unlocks');
    const ackedRow = env.sheets['Notices'].rows.slice(1).find(r => r[head.indexOf('id')] === 'NTC-2026-08-14-9000000015');
    t.eq(String(ackedRow[head.indexOf('status')]), 'ACK', 'the register reads ACK');
    t.contains(String(ackedRow[head.indexOf('ackNote')]), 'Network failure', 'his explanation is on the record');

    const reack = env.post({ kind: 'noticeAck', token: eTok, acks: [{ id: 'NTC-2026-08-14-9000000015' }] });
    t.eq(reack.done, 1, 'a repeated acknowledgement is a retry, and keeps working');

    /* the officer's file: served only; a proposal does not exist for him */
    const file = env.get('notices', { token: eTok });
    t.eq(file.rows.length, 1, 'E sees exactly his served notice');
    t.eq(file.rows[0].status, 'ACK', 'with its current status');
    const dTok = c.issueToken_(c.findByPhone_('9000000014'));
    t.eq(env.get('notices', { token: dTok }).rows.length, 0, 'D, cured, has no notice to see');
    const all = env.get('notices', { token: collector, all: '1' });
    t.ok(all.rows.length >= 3, 'the Collector, with all=1, sees the whole register');
  }
};

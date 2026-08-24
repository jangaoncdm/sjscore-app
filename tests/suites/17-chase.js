/* Chasing the two documents.

   The one channel that reaches an officer whose app is shut. It must mail only
   the officers who actually owe something, name only what THAT officer owes,
   and — the line that matters — write nothing against anybody. A document is
   not a default until the Collector says so in writing. */
'use strict';
const mock = require('../gasmock.js');

const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'];
const b64 = n => Buffer.from('x'.repeat(n)).toString('base64');

module.exports = {
  name: 'chasing the advisory and the plan (mail only, nothing written)',
  run(t){
    const env = mock.load({ now: '2026-08-24T10:00:00+05:30', admin: true });
    const c = env.ctx;
    env.mkSheet('Users', U, [
      { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Email:'cdm@mock.example', Active:'TRUE' },
      { Phone:'9000000031', Name:'A. BothDone',   Role:'PS',   Mandal:'Jangaon', GP:'Konne',    Email:'a@mock.example', Active:'TRUE' },
      { Phone:'9000000032', Name:'B. PlanOnly',   Role:'PS',   Mandal:'Jangaon', GP:'Malkapur', Email:'b@mock.example', Active:'TRUE' },
      { Phone:'9000000033', Name:'C. AdvOnly',    Role:'MPDO', Mandal:'Chilpur', Email:'c@mock.example', Active:'TRUE' },
      { Phone:'9000000034', Name:'D. NeitherDone',Role:'MPO',  Mandal:'Chilpur', Email:'d@mock.example', Active:'TRUE' },
      { Phone:'9000000035', Name:'E. NoAddress',  Role:'PS',   Mandal:'Chilpur', GP:'Peda',     Email:'',               Active:'TRUE' },
      { Phone:'9000000036', Name:'F. Retired',    Role:'PS',   Mandal:'Chilpur', GP:'Old',      Email:'f@mock.example', Active:'FALSE' }
    ]);
    env.sheets['Users'].rows.slice(1).forEach(r => {
      const p = c.phone10_(r[0]); if(p) r[U.indexOf('Hash')] = c.hash_(p, '1111');
    });
    const tok = ph => env.post({ kind:'login', u:ph, p:'1111' }).token;
    const cdm = tok('9000000001');

    env.post({ kind:'advPublish', token:cdm, title:'PS MPDO MPO Health Advisory',
      message:'Kindly go through the to do list in the monsoon season and act accordingly',
      audience:'ALL', file:{ name:'adv.pdf', b64:b64(2000) } });

    /* A has done both; B owes the advisory only; C owes the plan only;
       D owes both; E owes both but has no address on the roll. */
    env.post({ kind:'gpdp', token:tok('9000000031'), file:{ name:'a.pdf', b64:b64(1000) } });
    env.post({ kind:'advAck', token:tok('9000000031') });
    env.post({ kind:'gpdp', token:tok('9000000032'), file:{ name:'b.pdf', b64:b64(1000) } });
    env.post({ kind:'advAck', token:tok('9000000033') });

    /* ---- the dry run sends nothing ---- */
    const mailsBefore = env.outbox.length;
    const plan = c.showDocumentChase();
    t.eq(env.outbox.length, mailsBefore, 'reading the plan sends no mail');
    t.contains(plan, 'NOTHING HAS BEEN SENT', 'and says so');
    t.contains(plan, 'NO EMAIL ON THE ROLL', 'it names the officers it cannot reach');
    t.contains(plan, 'E. NoAddress', 'by name');

    /* ---- the send ---- */
    c.sendDocumentChase();
    const to = env.outbox.map(m => m.to);
    t.ok(to.indexOf('a@mock.example') < 0, 'the officer who has done both is not chased');
    t.ok(to.indexOf('b@mock.example') >= 0, 'the one who owes the advisory is');
    t.ok(to.indexOf('c@mock.example') >= 0, 'so is the one who owes the plan');
    t.ok(to.indexOf('d@mock.example') >= 0, 'and the one who owes both');
    t.ok(to.indexOf('f@mock.example') < 0, 'an inactive row is never mailed');
    t.ok(to.indexOf('cdm@mock.example') < 0, 'and the Collector does not chase himself');
    t.eq(env.outbox.length - mailsBefore, 3, 'three officers mailed, and only three');

    /* the mail names what THAT officer owes, and nothing else */
    const b = env.outbox.find(m => m.to === 'b@mock.example');
    t.contains(b.body, 'acknowledge', 'B is asked for the acknowledgement');
    t.ok(b.body.indexOf('Development Plan for') < 0, 'and is not asked for a plan he has sent');
    t.contains(b.body, 'monsoon season', 'the district’s own line rides in the mail');
    t.contains(b.subject, 'advisory', 'and the subject says which document it is about');

    const cM = env.outbox.find(m => m.to === 'c@mock.example');
    t.contains(cM.body, 'Development Plan for 2026-27', 'C is asked for the plan');
    t.ok(cM.body.indexOf('acknowledge') < 0, 'and not for an acknowledgement he has given');

    const d = env.outbox.find(m => m.to === 'd@mock.example');
    t.contains(d.body, 'acknowledge', 'D is asked for both — the advisory');
    t.contains(d.body, 'Development Plan for 2026-27', 'and the plan');
    t.contains(d.body, 'not a report that the work is done',
      'and every mail says an acknowledgement is receipt, not compliance');
    t.contains(d.body, 'nothing in this message is a notice under the Conduct Rules',
      'and that the chase itself is not a notice');

    /* ---- THE LINE THAT MUST HOLD ---- */
    t.ok(!env.sheets['Reminders'] || env.sheets['Reminders'].rows.length <= 1,
      'chasing writes no reminder');
    t.ok(!env.sheets['Notices'] || env.sheets['Notices'].rows.length <= 1,
      'raises no notice');
    t.ok(!env.sheets['Leave'] || env.sheets['Leave'].rows.length <= 1,
      'and debits nothing');
    t.ok(env.sheets['Audit'].rows.slice(1).some(r => /DOCUMENT CHASE/.test(String(r[1]))),
      'but the district has a record that it chased, and when');
  }
};

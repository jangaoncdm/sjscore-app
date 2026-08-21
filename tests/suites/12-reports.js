/* The reporting engine: filing reminders after the 15th — MSO and MPDO for
   action, the Secretary for information, the MPO never chased twice — and
   the Collector's one structured mail a day, guarded against doubles. */
'use strict';
const mock = require('../gasmock.js');

function seed(env){
  env.mkSheet('Users', ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'], [
    { Phone: '9000000001', Name: 'Sandeep Kumar Jha', Role: 'COLLECTOR', Email: 'cdm@mock.example', Active: 'TRUE' },
    { Phone: '9000000031', Name: 'P. Sec Konne',   Role: 'PS',   Mandal: 'Jangaon', GP: 'Konne',   Email: 'ps@mock.example',   Active: 'TRUE' },
    { Phone: '9000000032', Name: 'S. MSO Jangaon', Role: 'MSO',  Mandal: 'Jangaon', Email: 'mso@mock.example',  Active: 'TRUE' },
    { Phone: '9000000033', Name: 'D. MPDO Jangaon',Role: 'MPDO', Mandal: 'Jangaon', Email: 'mpdo@mock.example', Active: 'TRUE' },
    { Phone: '9000000034', Name: 'M. MPO Jangaon', Role: 'MPO',  Mandal: 'Jangaon', Email: 'mpo@mock.example',  Active: 'TRUE' }
  ]);
  env.mkSheet('GPs', ['Mandal','GP'], [
    { Mandal: 'Jangaon', GP: 'Konne' },
    { Mandal: 'Jangaon', GP: 'Malkapur' },
    { Mandal: 'Chilpur', GP: 'Venkatadripeta' }
  ]);
  env.mkSheet('Inspections', env.eval('HEADERS'), [
    { id: 'I1', ym: '2026-08', mandal: 'Jangaon', gp: 'Malkapur', date: '2026-08-12', score: 80, grade: 'B' }
  ]);
  env.mkSheet('Holidays', ['Date','Occasion'], []);
}

module.exports = {
  name: 'reports (villageFilingReminders, dailyCollectorReport)',
  run(t){
    /* 19.08.2026 — a Wednesday, past the 15th, on the every-third-day beat */
    const env = mock.load({ now: '2026-08-19T10:05:00+05:30' });
    const c = env.ctx;
    seed(env);
    c.villageFilingReminders();

    const rHead = env.sheets['Reminders'].rows[0].map(String);
    const rems = env.sheets['Reminders'].rows.slice(1).map(r => { const o = {}; rHead.forEach((h,i) => { o[h] = r[i]; }); return o; });
    const of = ph => rems.find(r => c.phone10_(r.phone) === ph);
    t.eq(rems.length, 3, 'three officers reminded: the Secretary, the MSO, the MPDO — nobody twice, the MPO not chased');
    t.ok(!!of('9000000031') && !!of('9000000032') && !!of('9000000033'), 'each of the chain has a reminder row');
    t.ok(!of('9000000034'), 'the MPO, who files, is not on the reminder list');
    t.eq(String(of('9000000032').kind), 'FILING', 'marked as a filing reminder — never a miss, never a notice');
    t.contains(String(of('9000000031').reason), 'information', 'the Secretary’s row says information');
    t.contains(String(of('9000000032').reason), 'task force', 'the MSO’s row says action');

    const psMail = env.outbox.find(m => m.to === 'ps@mock.example');
    const mpdoMail = env.outbox.find(m => m.to === 'mpdo@mock.example');
    t.ok(!!psMail && /information/i.test(psMail.subject), 'the Secretary’s mail is titled information');
    t.contains(psMail.body, 'Konne', 'and names his village');
    t.ok(!!mpdoMail && !/information/i.test(mpdoMail.subject), 'the MPDO’s mail asks for action');
    t.ok(env.outbox.some(m => m.to === env.adminEmail && /reminders sent/.test(m.subject)), 'the Collector gets the dispatch summary');

    /* the same day again: nothing doubles */
    const remN = env.sheets['Reminders'].rows.length, mailN = env.outbox.length;
    c.villageFilingReminders();
    t.eq(env.sheets['Reminders'].rows.length, remN, 'a re-run reminds nobody twice');
    t.ok(env.outbox.length <= mailN + 1, 'and at most re-summarises');

    /* the calendar guards */
    const env2 = mock.load({ now: '2026-08-14T10:00:00+05:30' }); seed(env2);
    env2.ctx.villageFilingReminders();
    t.ok(!env2.sheets['Reminders'] || env2.sheets['Reminders'].rows.length <= 1, 'before the 16th, the mandals have the month to themselves');
    const env3 = mock.load({ now: '2026-08-18T10:00:00+05:30' }); seed(env3);
    env3.ctx.villageFilingReminders();
    t.ok(!env3.sheets['Reminders'] || env3.sheets['Reminders'].rows.length <= 1, 'the 18th is not on the every-third-day beat');

    /* ---- the Collector's daily mail ---- */
    env.mark('9000000032', '2026-08-19', '2026-08-19T09:10:00+05:30');
    c.dailyCollectorReport();
    const rep = env.outbox.find(m => m.to === 'cdm@mock.example' && /daily report/.test(m.subject));
    t.ok(!!rep, 'the report goes to the Collector’s own address off the roll');
    t.contains(rep.subject, '19.08.2026', 'dated the district’s way');
    t.contains(rep.body, 'villages', 'and carries the filing figures');
    t.eq(env.props['LAST_DAILY_REPORT'], '2026-08-19', 'the guard remembers the day');
    const mails = env.outbox.length;
    c.dailyCollectorReport();
    t.eq(env.outbox.length, mails, 'a re-fired trigger cannot send it twice');
  }
};

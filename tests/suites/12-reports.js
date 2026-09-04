/* The reporting engine: filing reminders from day 16 of the REPORTING month,
   EVERY working day from there (the Collector's direction of 29.08.2026 — it
   had been every third day, and the day he looked was one of the four in six
   that sent nothing) — MSO and MPDO for action, the Secretary for
   information, the MPO never chased twice — and the Collector's one
   structured mail a day, both guarded against doubles.

   THE MONTH HERE IS THE REPORTING MONTH, not the calendar. August 2026 runs
   10.08 to 09.09, so day 16 of it is the 25th of August and the chase runs on
   into September until the month closes on the 9th. The dates below moved
   with the rule; they are days of that window and not of the calendar. */
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
    /* 25.08.2026 — a Tuesday, and day 16 of the August reporting month
       (which opened on the 10th), so the first reminder day of that month */
    const env = mock.load({ now: '2026-08-25T10:05:00+05:30' });
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
    const env2 = mock.load({ now: '2026-08-24T10:00:00+05:30' }); seed(env2);
    env2.ctx.villageFilingReminders();
    t.ok(!env2.sheets['Reminders'] || env2.sheets['Reminders'].rows.length <= 1,
      'the 24th is day 15 of the reporting month — the mandals still have the first half to themselves');
    /* EVERY working day from day 16, not every third. And the chase does not
       stop when the calendar month does: the August reporting month closes on
       9 September, and a village unfiled on the 9th is still being chased. */
    [['2026-08-26', 'the day after a reminder day still reminds'],
     ['2026-09-09', 'and the 9th of September, the last day of the August reporting month, still reminds']].forEach(([day, why]) => {
      const e = mock.load({ now: day + 'T10:00:00+05:30' }); seed(e);
      e.ctx.villageFilingReminders();
      t.eq((e.sheets['Reminders'] ? e.sheets['Reminders'].rows.length : 1) - 1, 3, why);
    });
    /* but a Sunday is nobody's filing day */
    const env4 = mock.load({ now: '2026-08-30T10:00:00+05:30' }); seed(env4);
    env4.ctx.villageFilingReminders();
    t.ok(!env4.sheets['Reminders'] || env4.sheets['Reminders'].rows.length <= 1, 'Sunday the 30th sends nothing — working days only');
    /* and a declared holiday is not a filing day either */
    const env5 = mock.load({ now: '2026-08-27T10:00:00+05:30' });
    seed(env5); env5.sheets['Holidays'].rows.push(['2026-08-27', 'Declared holiday']);
    env5.ctx.villageFilingReminders();
    t.ok(!env5.sheets['Reminders'] || env5.sheets['Reminders'].rows.length <= 1, 'a declared holiday sends nothing');

    /* ---- the Collector's daily mail ---- */
    env.mark('9000000032', '2026-08-25', '2026-08-25T09:10:00+05:30');
    /* one clean early mark and one late one whose fix is an area, not a place —
       so the summary tiles the mail now carries have something real to count */
    env.mark('9000000033', '2026-08-25', '2026-08-25T09:12:00+05:30', null,
      { lat: 17.72, lng: 79.15, accuracy: 18, verified: 'true', timezone: 'Asia/Calcutta' });
    env.mark('9000000034', '2026-08-25', '2026-08-25T10:40:00+05:30', null,
      { lat: 17.72, lng: 79.15, accuracy: 900, verified: 'false', timezone: 'Asia/Calcutta' });
    c.dailyCollectorReport();
    const rep = env.outbox.find(m => m.to === 'cdm@mock.example' && /daily report/.test(m.subject));
    t.ok(!!rep, 'the report goes to the Collector’s own address off the roll');
    t.contains(rep.subject, '25.08.2026', 'dated the district’s way');
    t.contains(rep.body, 'villages', 'and carries the filing figures');
    /* the dashboard panel inside the mail: six stat tiles, then the Gantt */
    t.contains(rep.htmlBody, 'The district at 25.08.2026', 'the stat tiles lead the mail');
    t.contains(rep.htmlBody, 'Villages done', 'a tile counts villages done');

    /* THE MAIL AND THE CONSOLE MUST QUOTE ONE MORNING, NOT TWO. The summary
       carries the same nine figures the console shows, read by the same rules.
       The MSO is on the roll but attendance is voluntary for him, so he is not
       among the officers due — three are, and the mail says so. */
    t.contains(rep.htmlBody, 'of 3 due', 'the denominator excludes the Collector and the exempt MSO');
    t.contains(rep.htmlBody, 'Marked by 10:00', 'the mail carries the cutoff figure the console shows');
    t.contains(rep.htmlBody, '1 of 2', 'one of the two marks on the roll was in before 10:00');
    t.contains(rep.htmlBody, 'Not trustworthy', 'and the location-quality figure');
    t.contains(rep.htmlBody, 'of 2 marks', 'counted against the marks actually made');
    t.contains(rep.htmlBody, 'District average', 'and the month’s average score');
    t.ok(rep.htmlBody.indexOf('>80<') > 0, 'which is the 80 the single filing scored');
    /* the MSO marked at 09:10 and his mark must not swell the count of the due */
    t.ok(rep.htmlBody.indexOf('of 4 due') < 0, 'the exempt officer is never counted among the due');
    t.contains(rep.htmlBody, 'Filing progress', 'the Gantt panel follows');
    /* 14 working days of the August REPORTING month have gone by the 25th —
       10..25 August less the Sundays — out of the 27 it holds in all, and the
       month still has a fortnight to run because it closes on 9 September.
       Read off the calendar month this said 16 of 21 and the district would
       have believed it had five days left when it had thirteen. */
    t.contains(rep.htmlBody, 'wd 14 of 27', 'the day marker counts working days of the reporting month, 10 Aug to 9 Sep');
    t.contains(rep.htmlBody, 'DISTRICT', 'and the district total as its last bar');
    t.contains(rep.htmlBody, '1 of 3</b> villages evaluated', 'the prose counts villages, not filings');
    /* the evaluations stand before the attendance, as a mandal table */
    t.ok(rep.htmlBody.indexOf('Village evaluations') < rep.htmlBody.indexOf('Attendance ·'),
      'village evaluations come before attendance in the body');
    t.contains(rep.htmlBody, '>Pace</th>', 'the mandal table carries a pace column');
    t.contains(rep.htmlBody, '<b>DISTRICT</b>', 'and closes with the district row');
    /* names travel in the attachment, never in the body */
    t.ok(rep.htmlBody.indexOf('P. Sec Konne') < 0, 'no officer is named in the mail body');
    t.eq(rep.attachments.length, 2, 'both registers ride along — the officers and the villages');
    t.eq(rep.attachments[0].name, 'SJGP_attendance_2026-08-25.csv', 'the attendance register, named for the day');
    t.contains(rep.attachments[0].data, 'NOT MARKED,Jangaon,P. Sec Konne,PS,9000000031',
      'the register names the unmarked, mandal and number against each');
    t.eq(rep.attachments[1].name, 'SJGP_villages_2026-08.csv', 'the village register, named for the reporting month');
    t.contains(rep.attachments[1].data, 'PENDING,Jangaon,Konne', 'a pending village leads with its mandal');
    t.contains(rep.attachments[1].data, 'Evaluated,Jangaon,Malkapur,80,B', 'a filed village carries score and grade');
    t.eq(env.props['LAST_DAILY_REPORT'], '2026-08-25', 'the guard remembers the day');
    const mails = env.outbox.length;
    c.dailyCollectorReport();
    t.eq(env.outbox.length, mails, 'a re-fired trigger cannot send it twice');

    /* the check copy: sends despite the guard, and leaves it clear */
    c.sendDailyReportNow();
    t.eq(env.outbox.length, mails + 1, 'sendDailyReportNow sends a copy even after the day’s report has gone');
    t.eq(env.props['LAST_DAILY_REPORT'], undefined, 'and leaves the guard clear, so the evening trigger still fires');

    /* ---- and the console is told the same number, by the server ----
       The console used to work the denominator out for itself as
       officers-1, which counted the MSO among the due. The morning of
       22.08.2026 it read "of 114" on screen while the mail read "of 102". */
    const uh = env.sheets['Users'].rows[0].map(String).indexOf('Hash');
    env.sheets['Users'].rows.slice(1).forEach(r => {
      if(c.phone10_(r[0]) === '9000000001') r[uh] = c.hash_('9000000001', '9999');
    });
    const tok = env.post({ kind: 'login', u: '9000000001', p: '9999' }).token;
    const d = env.get('dashboard', { token: tok });
    t.eq(d.totals.officers, 5, 'the roll carries five active rows');
    t.eq(d.totals.due, 3, 'but only three are due a mark — not the Collector, not the exempt MSO');
    t.ok(d.totals.due < d.totals.officers - 1, 'which is fewer than the subtraction the console used to make');
  }
};

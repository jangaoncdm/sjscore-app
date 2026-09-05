/* THE REPORTING MONTH.

   A village evaluation is filed for a month that runs from the 10th to the
   9th and carries the name of the month it OPENS in — August 2026 is
   10.08.2026 to 09.09.2026 — because a month's returns cannot be complete
   before the month itself is over. July 2026 opens on the 20th, the day the
   district adopted the register, so the first month is short at the top and
   not at the bottom.

   Three things this suite holds to:

   1. the window, at both its edges and across a year end;
   2. THE MONTH IS THE DISTRICT'S, NOT THE HANDSET'S — it is derived from the
      date of the visit, so a phone running an old copy of the app cannot file
      into a month the district has closed;
   3. IT TOUCHES THE FILING AND NOTHING ELSE. Attendance, its misses and the
      show-cause ladder are counted over the CALENDAR month, because a served
      notice recites the third unmarked working day "of the calendar month"
      under Rule 3 of the Conduct Rules. If that is ever to change it is
      changed here first, deliberately, and not as a side effect. */
'use strict';
const mock = require('../gasmock.js');

function seed(env){
  env.mkSheet('Users', ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'], [
    { Phone: '9000000001', Name: 'Sandeep Kumar Jha', Role: 'COLLECTOR', Email: 'cdm@mock.example', Active: 'TRUE' },
    { Phone: '9000000033', Name: 'D. MPDO Jangaon', Role: 'MPDO', Mandal: 'Jangaon', Email: 'mpdo@mock.example', Active: 'TRUE' }
  ]);
  env.mkSheet('GPs', ['Mandal','GP'], [
    { Mandal: 'Jangaon', GP: 'Konne' },
    { Mandal: 'Jangaon', GP: 'Malkapur' }
  ]);
  env.mkSheet('Holidays', ['Date','Occasion'], []);
}

function tokenFor(env, phone, pin){
  const head = env.sheets['Users'].rows[0].map(String), uh = head.indexOf('Hash');
  env.sheets['Users'].rows.slice(1).forEach(r => {
    if(env.ctx.phone10_(r[0]) === phone) r[uh] = env.ctx.hash_(phone, pin);
  });
  return env.post({ kind: 'login', u: phone, p: pin }).token;
}

module.exports = {
  name: 'the reporting month (10th to 9th, and what it leaves alone)',
  run(t){
    /* ---- 1. the window ---- */
    const env = mock.load({ now: '2026-09-03T09:00:00+05:30', admin: true });
    const c = env.ctx;

    [['2026-07-19', ''],          /* the register did not exist yet */
     ['2026-07-20', '2026-07'],   /* the day of adoption opens July */
     ['2026-07-31', '2026-07'],
     ['2026-08-09', '2026-07'],   /* July runs ON, past its own calendar end */
     ['2026-08-10', '2026-08'],   /* and the 10th opens August, not closes July */
     ['2026-09-03', '2026-08'],   /* so today, the 3rd, an officer files for August */
     ['2026-09-09', '2026-08'],
     ['2026-09-10', '2026-09'],
     ['2027-01-05', '2026-12']    /* and December 2026 runs into the new year */
    ].forEach(([d, want]) => t.eq(c.cycleYm_(d), want,
      d + ' falls in ' + (want || 'no reporting month — the register had not opened')));

    t.eq(c.cycleFrom_('2026-07'), '2026-07-20', 'July 2026 opens on the day of adoption, not the 10th');
    t.eq(c.cycleTo_('2026-07'),   '2026-08-09', 'and closes on 9 August');
    t.eq(c.cycleFrom_('2026-08'), '2026-08-10', 'August opens on the 10th');
    t.eq(c.cycleTo_('2026-08'),   '2026-09-09', 'and closes on 9 September');
    t.eq(c.cycleTo_('2026-12'),   '2027-01-09', 'December closes in the next calendar year');
    t.eq(c.cycleYm_('not a date'), '', 'a reading that is not a date is not a month');
    t.eq(c.cycleDay_('2026-08-25'), 16, 'the 25th is day 16 of the August reporting month');
    t.eq(c.cycleDay_('2026-08-10'), 1,  'and the 10th is its first day');

    /* the working-day clock counts the WINDOW, not the calendar month. Read
       off the calendar on 25 August this said five days left; the month in
       fact had thirteen, because it closes on 9 September. */
    seed(env);
    const wd = c.monthWd_('2026-08-25');
    t.eq(wd.total, 27, 'the August reporting month holds 27 working days, 10 Aug to 9 Sep');
    t.eq(wd.gone, 14, 'fourteen of them had gone by the 25th');
    t.eq(wd.left, 13, 'and thirteen remained — not the five the calendar month would have left');

    /* ---- 2. the month is derived from the date of the visit ---- */
    env.mkSheet('Inspections', env.eval('HEADERS'), []);
    const tok = tokenFor(env, '9000000033', '4321');

    /* a handset that HAS taken the update sends the reporting month */
    env.post({ kind: 'inspection', token: tok, record:
      { id: 'Konne|2026-08', gp: 'Konne', mandal: 'Jangaon', ym: '2026-08', date: '2026-09-03', score: 77 } });
    /* one that has NOT still sends the calendar month — and is corrected */
    env.post({ kind: 'inspection', token: tok, record:
      { id: 'Malkapur|2026-09', gp: 'Malkapur', mandal: 'Jangaon', ym: '2026-09', date: '2026-09-02', score: 66 } });

    const ih = env.sheets['Inspections'].rows[0].map(String);
    const rows = env.sheets['Inspections'].rows.slice(1)
      .map(r => { const o = {}; ih.forEach((h,i) => { o[h] = String(r[i]).replace(/^'/, ''); }); return o; });
    const byGp = g => rows.find(r => r.gp === g);
    t.eq(rows.length, 2, 'both filings are on the register');
    t.eq(byGp('Konne').ym, '2026-08', 'a visit on 3 September is filed against August');
    t.eq(byGp('Malkapur').ym, '2026-08',
      'and so is one from a handset that still believes it is September — the district decides the month, not the phone');
    t.eq(byGp('Malkapur').date, '2026-09-02', 'the date of the visit is not touched; only the month it is counted in');

    /* a record with no date at all keeps what the phone sent, because a blank
       month is a row no view ever finds */
    env.post({ kind: 'inspection', token: tok, record:
      { id: 'Konne|nodate', gp: 'Konne', mandal: 'Jangaon', ym: '2026-08', score: 50 } });
    const nd = env.sheets['Inspections'].rows.slice(1)
      .map(r => { const o = {}; ih.forEach((h,i) => { o[h] = String(r[i]).replace(/^'/, ''); }); return o; })
      .find(r => r.id === 'Konne|nodate');
    t.eq(nd.ym, '2026-08', 'an undated filing keeps the month the phone sent rather than losing one');

    /* ---- 3. the console opens on the reporting month and says its window ---- */
    const ctok = tokenFor(env, '9000000001', '9999');
    const d = env.get('dashboard', { token: ctok });
    t.eq(d.ym, '2026-08', 'on 3 September the console opens on August, the month being filed');
    t.eq(d.ymCur, '2026-08', 'and says which month is running today, so the picker knows what "this month" is');
    t.eq(d.ymFrom, '2026-08-10', 'the payload carries the day the month opened');
    t.eq(d.ymTo, '2026-09-09', 'and the day it closes, so the console can print the window beside the name');
    t.eq(d.month.rows.length, 3, 'all three filings are counted in it, including the one the old app mislabelled');

    /* ---- 4. ATTENDANCE IS NOT MOVED ---- */
    env.mark('9000000033', '2026-08-05', '2026-08-05T09:10:00+05:30');
    env.mark('9000000033', '2026-09-03', '2026-09-03T09:10:00+05:30');
    const augMarks = c.monthMarks_('2026-08');
    t.ok(!!augMarks['9000000033|2026-08-05'],
      'a mark on 5 August is an August mark — attendance is still counted over the CALENDAR month');
    t.ok(!augMarks['9000000033|2026-09-03'],
      'and a mark on 3 September is not, though the FILING month on that day is August');
    t.ok(!!c.monthMarks_('2026-09')['9000000033|2026-09-03'],
      'it belongs to September, where the notice ladder counts it');

    /* ---- 4b. THE FIGURE MOVES WITH NO MIGRATION RUN ----
       This is the defect the district reported. The rule was changed and the
       August figure did not go up by a single village, because only the WRITE
       path derived the month: every count still matched on the label the old
       calendar rule had stamped on the row, so a village evaluated on
       2 September went on being a September filing. The rows below carry the
       OLD labels, exactly as the live register does, and nothing has been
       re-stamped. August must still count both. */
    const env3 = mock.load({ now: '2026-09-03T09:00:00+05:30', admin: true });
    const c3 = env3.ctx;
    seed(env3);
    env3.mkSheet('Inspections', env3.eval('HEADERS'), [
      { id: 'P', ym: '2026-08', mandal: 'Jangaon', gp: 'Konne', date: '2026-08-14', score: 78, grade: 'B' },
      /* stamped 2026-09 by the old rule; by the new one it is an August filing */
      { id: 'Q', ym: '2026-09', mandal: 'Jangaon', gp: 'Malkapur', date: '2026-09-02', score: 64, grade: 'C' }
    ]);
    const ctok3 = tokenFor(env3, '9000000001', '9999');
    const d3 = env3.get('dashboard', { token: ctok3 });
    t.eq(d3.ym, '2026-08', 'on 3 September the console opens on August');
    t.eq(d3.month.rows.length, 2,
      'and BOTH filings count towards it, though one still carries the September label the old rule wrote');
    t.eq(c3.unfiledVillages_('2026-08').length, 0,
      'so no village reads as pending for August that has in fact been evaluated');
    t.eq((d3.trend || []).filter(x => x.ym === '2026-09').length, 0,
      'and nothing is left stranded in a September that has not opened yet');
    const listed = env3.get('list', { token: ctok3, ym: '2026-08' });
    t.eq(listed.rows.length, 2, 'the field app asking for August is handed both filings');
    t.ok(listed.rows.every(r => r.ym === '2026-08'),
      'each carrying the month its own date gives it, not the one stored on the row');

    /* ---- 5. re-stamping what was filed before the rule existed ---- */
    const env2 = mock.load({ now: '2026-09-03T09:00:00+05:30', admin: true });
    const c2 = env2.ctx;
    seed(env2);
    env2.mkSheet('Inspections', env2.eval('HEADERS'), [
      /* filed on the 12th: August under either rule, and must not move */
      { id: 'A', ym: '2026-08', mandal: 'Jangaon', gp: 'Malkapur', date: '2026-08-12', score: 80, grade: 'B' },
      /* filed on the 4th: labelled August by the old rule, but the August
         reporting month had not opened. This belongs to July, whose month
         ran on to the 9th of August. */
      { id: 'B', ym: '2026-08', mandal: 'Jangaon', gp: 'Konne', date: '2026-08-04', score: 71, grade: 'B' },
      /* a date this register cannot read: named, and left exactly as it is */
      { id: 'C', ym: '2026-08', mandal: 'Jangaon', gp: 'Konne', date: '', score: 60, grade: 'C' }
    ]);

    const shown = c2.showFilingMonths();
    t.contains(shown, '2026-08  →  2026-07', 'the reading names the label each filing would move to');
    t.contains(shown, 'Nothing has been written', 'and it writes nothing');
    /* the arithmetic the district actually asked for: what each month gains
       and loses. A month can fall as well as rise — it takes in the first days
       of the next calendar month and gives up the first nine days of its own. */
    t.contains(shown, 'WHAT EACH MONTH GAINS AND LOSES', 'the reading says what each month gains and loses');
    t.contains(shown, 'takes in 1, gives up 0   net +1', 'July takes in the filing of 4 August');
    t.contains(shown, 'takes in 0, gives up 1   net -1', 'and August gives it up — the figure falls, and that is the rule, not a fault');
    t.ok(env2.sheets['Inspections'].rows.slice(1)
      .every(r => String(r[1]).replace(/^'/, '') === '2026-08'), 'the register is untouched by the reading');

    const done = c2.restampFilingMonths();
    const ymCol = env2.sheets['Inspections'].rows[0].map(String).indexOf('ym');
    const lbl = id => { const r = env2.sheets['Inspections'].rows.slice(1)
      .find(x => String(x[0]) === id); return String(r[ymCol]).replace(/^'/, ''); };
    t.eq(lbl('A'), '2026-08', 'a filing already in the right month is left alone');
    t.eq(lbl('B'), '2026-07', 'one visited on 4 August moves to July');
    t.eq(lbl('C'), '2026-08', 'and one with no date is not guessed at — it keeps its label');
    t.contains(done, 'LEFT AS THEY ARE', 'the undated filing is named, not silently skipped');

    const audit = env2.sheets['Audit'].rows.slice(1).map(r => r.join(' | '));
    const moves = audit.filter(l => /FILING MONTH RE-STAMPED/.test(l));
    t.eq(moves.length, 1, 'only the row that moved is written to Audit');
    t.contains(moves[0], '2026-08 → 2026-07',
      'and it carries the label it came from — a file can be produced afterwards');

    /* rule 8: a nervous second run changes nothing */
    t.contains(c2.restampFilingMonths(), 'NOTHING TO MOVE', 'a second run finds nothing left to do');
    t.eq(lbl('B'), '2026-07', 'and the label it wrote the first time still stands');
    t.eq(env2.sheets['Audit'].rows.slice(1)
      .filter(r => /FILING MONTH RE-STAMPED/.test(r.join(' '))).length, 1,
      'nothing is written to Audit a second time either');
    /* ---- 6. A DIALOG IS A COURTESY, NEVER THE ANSWER ----
       The manifest declares an explicit oauthScopes list and script.container.ui
       is deliberately not on it: a new scope sends the live web app back for
       re-authorisation and 280 officers lose it until the Collector re-consents.
       So a menu item may not be able to draw a window. It threw in the district's
       face — "Specified permissions are not sufficient to call Ui.showModalDialog"
       — with the report already written and nowhere to be seen. The report must
       survive the window, and a WRITE must not happen when it could not ask. */
    const env4 = mock.load({ now: '2026-09-04T09:00:00+05:30', admin: true });
    seed(env4);
    env4.mkSheet('Inspections', env4.eval('HEADERS'), [
      { id: 'B', ym: '2026-08', mandal: 'Jangaon', gp: 'Konne', date: '2026-08-04', score: 71, grade: 'B' }
    ]);
    const logged = () => env4.logs.join('\n');

    env4.ctx.menuShowFilingMonths();
    t.contains(logged(), 'WHAT EACH MONTH GAINS AND LOSES',
      'the reading reaches the log even when no window may be opened');
    t.contains(logged(), 'may not open dialogs',
      'and says why there was no window, and where to read it');

    /* and the write refuses, because it could not ask */
    const ymCol4 = env4.sheets['Inspections'].rows[0].map(String).indexOf('ym');
    env4.ctx.menuRestampFilingMonths();
    t.eq(String(env4.sheets['Inspections'].rows[1][ymCol4]).replace(/^'/, ''), '2026-08',
      'nothing is written when the script could not ask — a record is not changed because a dialog failed');
    t.contains(logged(), 'NOTHING WAS WRITTEN', 'and it says so in those words');
    t.contains(logged(), 'run restampFilingMonths() yourself',
      'naming the function to run from the editor, which is the Collector pressing the button');
    t.eq((env4.sheets['Audit'] ? env4.sheets['Audit'].rows.length : 1) - 1, 0,
      'and nothing reaches the Audit tab either');

    /* run directly, as from the editor, it does the work */
    env4.ctx.restampFilingMonths();
    t.eq(String(env4.sheets['Inspections'].rows[1][ymCol4]).replace(/^'/, ''), '2026-07',
      'run from the editor it moves the label, dialog or no dialog');

    /* ---- 7. THE SECOND SATURDAY IS THE CALENDAR'S, AND STAYS THERE ----
       Asked from the district: the second Saturday is not a 10-to-10 thing,
       it belongs entirely to the calendar month. It does, and nothing here
       moves it — a second Saturday is a fixed date on the Holidays tab, put
       there by applyTsHolidays off the G.O., and every count excludes it by
       that date wherever it falls.

       What the 10th-to-9th window does do is distribute them unevenly, and
       that is arithmetic rather than a fault. A second Saturday always falls
       on the 8th to the 14th, so one on the 8th or 9th sits in the PREVIOUS
       reporting month. August 2026 therefore has none — 08.08 went to July
       and 12.09 goes to September — and its working-day count is honestly one
       higher, because within 10 Aug to 9 Sept the office was never shut for
       one. Over a year not one is lost and not one is counted twice.

       Nothing here accuses anybody: the filing reminder skips a second
       Saturday by its own date whichever window holds it, and no notice, no
       debit and no lock reads this count at all. If the district ever wants
       exactly one to a reporting month, CYCLE_DAY = 15 does it — every second
       Saturday would then sit inside the window of its own calendar month —
       and that is a change to the Collector's order, not a repair. */
    const env5 = mock.load({ now: '2026-09-05T09:00:00+05:30', admin: true });
    const c5 = env5.ctx;
    seed(env5);
    const sats = c5.TS_SECOND_SATURDAYS_2026;
    env5.sheets['Holidays'].rows = [['Date','Occasion']].concat(
      c5.TS_HOLIDAYS_2026.map(r => [r[0], r[1]]).concat(sats.map(d => [d, 'Second Saturday'])));

    t.eq(sats.filter(d => c5.cycleYm_(d) === '2026-08').length, 0,
      'the August reporting month holds no second Saturday: 08.08 is before it opens, 12.09 after it closes');
    t.eq(sats.filter(d => c5.cycleYm_(d) === '2026-07').join(','), '2026-08-08',
      'the August calendar month’s own second Saturday sits in the July reporting month');
    t.eq(sats.filter(d => c5.cycleYm_(d) === '2026-09').join(','), '2026-09-12',
      'and September’s sits in September, because it falls after the 10th');

    /* nothing lost, nothing doubled: each lands in exactly one month */
    const landed = {};
    sats.forEach(d => { const ym = c5.cycleYm_(d); if(ym) landed[ym] = (landed[ym] || 0) + 1; });
    t.eq(sats.filter(d => c5.cycleYm_(d)).length,
         Object.keys(landed).reduce((s,k) => s + landed[k], 0),
      'every second Saturday the register covers lands in exactly one reporting month');

    /* and one inside the window is genuinely taken off the working days */
    const sepWd = c5.monthWd_(c5.cycleTo_('2026-09'));
    env5.sheets['Holidays'].rows = env5.sheets['Holidays'].rows
      .filter(r => String(r[0]) !== '2026-09-12');
    t.ok(c5.monthWd_(c5.cycleTo_('2026-09')).total === sepWd.total + 1,
      'a second Saturday inside the window is a working day fewer — it is excluded by its date, as every holiday is');

  }
};

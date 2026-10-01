/* THE DAY THE REGISTER CALLED A THURSDAY A SECOND SATURDAY.

   01.10.2026 was a Thursday. The sanitation register answered that it was a
   Second Saturday and stood the attendance gate down across 280 officers: no
   officer was asked to mark, the day was not counted, and the working-day
   count every forecast reads was wrong by one more.

   It was 2026-01-10 — the second Saturday of JANUARY — sitting on the
   Holidays tab with its day and month swapped. Rule 3, in a live register,
   nine months after the rule was written for it. The swap is only possible
   where BOTH numbers are twelve or less, which is why it had lain there
   unseen: it fires on one date in the year and looks like nothing on the
   other three hundred and sixty-four.

   LOADING THE ORDER AGAIN COULD NEVER CURE IT. applyTsHolidays only ever ADDS
   what is missing, by design, and a wrong date is not missing. The count said
   48 against the order's 39 and the difference had been reported — but there
   was no way to act on it, because nothing in this register could take a date
   off a calendar.

   What this suite holds is the narrowness of what was then built:
     · the Collector's alone, re-checked on the server (rule 6);
     · it CANNOT strike a date the G.O. names — so no hand here removes Dasara;
     · it deletes nothing: the row stays, marked VOIDED, saying who and when;
     · a second press changes nothing (rule 8);
     · and the guard FAILS CLOSED — if the order's own list cannot be read,
       nothing is struck at all.
*/
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'striking a date off the calendar (the Thursday that was a Second Saturday)',
  run(t){

    /* the register as it actually stood on the morning of 01.10.2026: the
       order's own January second Saturday, and the same date swapped */
    const seed = env => {
      env.mkSheet('Users', ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'], [
        { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Mandal:'', GP:'', Active:'TRUE' },
        { Phone:'9000000014', Name:'A Secretary', Role:'PS', Mandal:'Jangaon', GP:'Konne', Active:'TRUE' }
      ]);
      env.mkSheet('Holidays', ['Date','Occasion'], [
        { Date:'2026-01-10', Occasion:'Second Saturday' },   /* the order's own */
        { Date:'2026-10-01', Occasion:'Second Saturday' },   /* the same date, swapped — TODAY */
        { Date:'2026-09-05', Occasion:'Second Saturday' },   /* 2026-05-09 swapped — ALREADY GONE */
        { Date:'2026-11-04', Occasion:'Second Saturday' },   /* 2026-04-11 swapped — STILL TO COME */
        { Date:'2026-01-26', Occasion:'Republic Day' }
      ]);
      env.mkSheet('Audit', ['At','Action','Subject','Detail','By'], []);
    };
    const tok = (env, p) => env.ctx.issueToken_(env.ctx.findByPhone_(p));

    /* ---- 1. THE FAULT, REPRODUCED ---- */
    {
      const e = mock.load({ now:'2026-10-01T09:00:00+05:30' }); seed(e);
      t.eq(e.ctx.today_(), '2026-10-01', 'the district’s day is the 1st of October');
      t.eq(new Date('2026-10-01T00:00:00').getDay(), 4, 'which is a Thursday');
      t.eq(e.ctx.isWorkingDay_('2026-10-01'), false,
        'AND THE REGISTER CALLS IT AN OFF DAY — the fault, exactly as it stood');
      t.contains(JSON.stringify(e.ctx.offInfo_('2026-10-01')), 'Second Saturday',
        'giving Second Saturday as its reason, on a Thursday');
    }

    /* ---- 2. IT IS THE COLLECTOR'S ALONE ---- */
    {
      const e = mock.load({ now:'2026-10-01T09:00:00+05:30' }); seed(e);
      const ps = tok(e, '9000000014');
      const r = e.post({ kind:'holidayVoid', token:ps, date:'2026-10-01' });
      t.eq(r.ok, false, 'a Secretary cannot strike a date off the calendar');
      t.contains(r.error, 'Collector', 'and it says whose it is');
      t.eq(e.post({ kind:'holidayVoid', token:'', date:'2026-10-01' }).ok, false,
        'nor can a caller with no token');
      t.eq(e.ctx.isWorkingDay_('2026-10-01'), false, 'and nothing was struck');
    }

    /* ---- 3. IT CANNOT STRIKE A DATE THE ORDER NAMES ----
       This is the guard that matters. The button exists to remove what the
       G.O. does not name; it must not become a way to delete Dasara. */
    {
      const e = mock.load({ now:'2026-10-01T09:00:00+05:30' }); seed(e);
      const cdm = tok(e, '9000000001');
      const r = e.post({ kind:'holidayVoid', token:cdm, date:'2026-01-26' });
      t.eq(r.ok, false, 'Republic Day cannot be struck off — the order names it');
      t.contains(r.error, 'G.O.', 'and the refusal says why');
      t.eq(e.ctx.isWorkingDay_('2026-01-26'), false, 'and it is still an off day');

      const r2 = e.post({ kind:'holidayVoid', token:cdm, date:'2026-01-10' });
      t.eq(r2.ok, false, 'nor can the order’s OWN January second Saturday');
      t.eq(e.ctx.isWorkingDay_('2026-01-10'), false, 'which also stands');
    }

    /* ---- 4. AND THEN THE WRONG DATE COMES OFF — FORWARD ONLY ----
       This is the part that had to be got right before anybody pressed the
       button. Several of the wrong dates had already gone by when they were
       found: 05.09.2026 stood as an off day all that day and 280 officers
       were told so. Making it a working day now would count every one of them
       unmarked on a day the register itself declared shut, and the 18:00 read
       would turn that into reminders and notices. A strike therefore reaches
       FORWARD: the day it is passed, and every day before it, stand as they
       were announced. */
    {
      const e = mock.load({ now:'2026-10-01T09:00:00+05:30' }); seed(e);
      const cdm = tok(e, '9000000001');
      const before = e.sheets['Holidays'].rows.length;

      const r = e.post({ kind:'holidayVoid', token:cdm,
        dates:['2026-10-01', '2026-09-05', '2026-11-04'] });
      t.eq(r.ok, true, 'the Collector strikes the three the order does not name');
      t.eq(r.struck, 3, 'all three are struck');
      t.eq(r.forward, 1, 'but only the one still to come changes a day');
      t.eq(r.stood, 2, 'the other two had already been announced and stand');

      /* NOBODY IS ACCUSED FOR A DAY THE REGISTER ITSELF CLOSED */
      t.eq(e.ctx.isWorkingDay_('2026-09-05'), false,
        'the day already gone STAYS an off day \u2014 nobody is marked absent in retrospect');
      t.eq(e.ctx.isWorkingDay_('2026-10-01'), false,
        'and so does today, which 280 officers were told this morning was a holiday');
      t.eq(e.ctx.offInfo_('2026-10-01').today, true, 'the register still says so when asked');

      /* AND IT IS GONE FROM EVERY DAY AFTER */
      t.eq(e.ctx.isWorkingDay_('2026-11-04'), true,
        'the date still to come IS a working day \u2014 which is the whole point');

      /* RULE 7: struck off the calendar, never off the tab */
      t.eq(e.sheets['Holidays'].rows.length, before, 'not one row was deleted');
      const hv = e.sheets['Holidays'].rows;
      const hh = hv[0].map(x => String(x).toLowerCase());
      const row = hv.slice(1).find(x => String(x[0]).indexOf('2026-11-04') >= 0);
      t.ok(!!row, 'the row is still there');
      t.eq(String(row[hh.indexOf('status')]).toUpperCase(), 'VOIDED', 'marked VOIDED');
      t.contains(String(row[hh.indexOf('voidedon')]), '2026-10-01', 'carrying the day it was struck');
      t.contains(String(row[hh.indexOf('note')]), 'G.O.Rt.No.1715', 'and why');
      t.eq(String(row[1]), 'Second Saturday', 'still carrying what it had claimed to be');

      /* the order's own January second Saturday is untouched */
      t.eq(e.ctx.isWorkingDay_('2026-01-10'), false, 'the order\u2019s own date is untouched');

      /* rule 7: on the Audit tab */
      const aud = JSON.stringify(e.sheets['Audit'].rows);
      t.contains(aud, 'HOLIDAY STRUCK OFF', 'the striking is on the Audit tab');
      t.contains(aud, '2026-11-04', 'with the date');
      t.contains(aud, 'Sandeep Kumar Jha', 'and the hand that passed it');

      /* ---- rule 8 ---- */
      const again = e.post({ kind:'holidayVoid', token:cdm, dates:['2026-11-04'] });
      t.eq(again.struck, 0, 'a second press strikes nothing');
      t.eq(e.sheets['Holidays'].rows.length, before, 'and writes no row');
      t.eq(e.ctx.isWorkingDay_('2026-11-04'), true, 'the date stays off the calendar');
    }

    /* ---- 4b. AND TOMORROW IT HAS TAKEN EFFECT ----
       The day it was struck stands; the day after, it is gone. */
    {
      const e = mock.load({ now:'2026-10-01T09:00:00+05:30' }); seed(e);
      const cdm = tok(e, '9000000001');
      e.post({ kind:'holidayVoid', token:cdm, dates:['2026-10-01'] });
      t.eq(e.ctx.isWorkingDay_('2026-10-01'), false, 'struck today, today still stands');
      /* the same register read the next morning */
      e.setNow('2026-10-02T09:00:00+05:30');
      t.eq(e.ctx.isWorkingDay_('2026-10-01'), false,
        'and it still stands tomorrow, because the day it covered has gone');
    }

    /* ---- 5. SEVERAL AT ONCE, AND THE ORDER'S OWN SIFTED OUT OF THEM ---- */
    {
      const e = mock.load({ now:'2026-10-01T09:00:00+05:30' }); seed(e);
      const cdm = tok(e, '9000000001');
      const r = e.post({ kind:'holidayVoid', token:cdm,
        dates:['2026-10-01', '2026-01-26', '2026-01-10'] });
      t.eq(r.ok, true, 'a list is accepted');
      t.eq(r.struck, 1, 'and only the date the order does not name is struck');
      t.eq(r.refused.length, 2, 'the other two are refused by name');
      t.contains(JSON.stringify(r.refused), 'Republic Day', 'Republic Day among them');
      t.eq(e.ctx.isWorkingDay_('2026-01-26'), false, 'and it is still an off day');
      t.eq(e.ctx.isWorkingDay_('2026-10-01'), false,
        'while today stands as announced \u2014 a strike reaches forward');
    }

    /* ---- 6. THE GUARD FAILS CLOSED ----
       If the order's own list cannot be read, nothing is struck at all. A
       guard that fails open is not a guard, and what it guards here is a
       government holiday calendar. */
    {
      const e = mock.load({ now:'2026-10-01T09:00:00+05:30' }); seed(e);
      const cdm = tok(e, '9000000001');
      e.eval('TS_HOLIDAYS_2026 = null; TS_SECOND_SATURDAYS_2026 = null;');
      const r = e.post({ kind:'holidayVoid', token:cdm, date:'2026-10-01' });
      t.eq(r.ok, false, 'with the order unreadable, nothing is struck');
      t.contains(r.error, 'could not be read', 'and it says exactly that');
      t.eq(e.ctx.isWorkingDay_('2026-10-01'), false, 'the calendar is left as it was');
    }

    /* ---- 7. A VOIDED ROW IS INVISIBLE TO EVERY COUNT, NOT JUST THIS ONE ---- */
    {
      const e = mock.load({ now:'2026-10-01T09:00:00+05:30' }); seed(e);
      const cdm = tok(e, '9000000001');
      const n0 = Object.keys(e.ctx.holidaySet_()).length;
      e.post({ kind:'holidayVoid', token:cdm, dates:['2026-11-04'] });
      t.eq(Object.keys(e.ctx.holidaySet_()).length, n0 - 1,
        'the calendar is one shorter everywhere, because everything reads holidaySet_');
      const roll = e.get('roll', { token:cdm });
      t.ok(!(roll.holidays.extra || []).some(x => x.date === '2026-11-04'),
        'and the Admin panel stops naming a date it no longer counts');
      /* A DATE STRUCK AFTER ITS OWN DAY HAS GONE still stands for that day,
         and the panel must say so rather than offer a button that does
         nothing. */
      e.post({ kind:'holidayVoid', token:cdm, dates:['2026-09-05'] });
      const roll2 = e.get('roll', { token:cdm });
      const past = (roll2.holidays.extra || []).find(x => x.date === '2026-09-05');
      t.ok(!!past, 'a date struck after its own day is still listed');
      t.eq(past.voided, true, 'and is marked as already struck');
      t.eq(e.ctx.isWorkingDay_('2026-09-05'), false, 'because it still stands for its own day');

      t.ok((roll.holidays.extra || []).some(x => x.date === '2026-10-01'),
        'while today, which still stands, is still named \u2014 nothing is hidden');
    }
  }
};

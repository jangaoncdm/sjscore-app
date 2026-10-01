/* THE CALENDAR IS THE ORDER AND THE GREGORIAN SECOND SATURDAYS.

   01.10.2026 was a Thursday. The register answered that it was a Second
   Saturday and stood the attendance gate down across 280 officers: it was
   2026-01-10 — the second Saturday of JANUARY — on the Holidays tab with its
   day and month transposed. Nine such dates were on it.

   The first cure written here was a button to strike them off one at a time,
   with a status column and a rule about reaching forward: a great deal of
   machinery to go on believing a tab that had been wrong all along. The
   district's direction was blunter and better — use the General Holidays and
   the Gregorian calendar. All of that machinery is gone.

   So:
     · the second Saturdays are COMPUTED. A typed list of twelve dates is
       twelve chances to transpose a day and a month, and this one had five;
       a date worked out from the calendar cannot be wrong, and no future year
       needs maintaining;
     · the General Holidays come from the G.O., because Dasara and Ramzan move
       and cannot be computed;
     · a transposed row on the tab is simply not in that set, so it is not a
       holiday — no striking, no status, nothing to press;
     · where the state has NOT declared a year, the tab is believed exactly as
       before, because a computed calendar alone would leave that year's
       festivals as working days and chase 280 officers through them;
     · and it reaches forward (the Collector's direction, 01.10.2026): days
       already announced as holidays stay shut, because officers were told not
       to mark on them and a register that corrects itself must not then
       accuse them of the absence it asked for.
*/
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'the calendar: the order, and the Gregorian second Saturdays',
  run(t){

    /* the tab as the live register carried it that morning */
    const seed = env => {
      env.mkSheet('Users', ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'], [
        { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Mandal:'', GP:'', Active:'TRUE' }
      ]);
      env.mkSheet('Holidays', ['Date','Occasion'], [
        { Date:'2026-01-10', Occasion:'Second Saturday' },        /* the order's own */
        { Date:'2026-01-26', Occasion:'Republic Day' },
        { Date:'2026-02-10', Occasion:'Mahatma Gandhi Jayanti' }, /* 02.10 transposed */
        { Date:'2026-09-05', Occasion:'Second Saturday' },        /* 05.09 transposed, GONE */
        { Date:'2026-10-01', Occasion:'Second Saturday' },        /* 01.10 transposed, TODAY */
        { Date:'2026-10-08', Occasion:'Bonalu' },                 /* 08.10 transposed, TO COME */
        { Date:'2026-11-04', Occasion:'Second Saturday' },        /* 04.11 transposed, TO COME */
        { Date:'2026-12-09', Occasion:'Second Saturday' }         /* 09.12 transposed, TO COME */
      ]);
      env.mkSheet('Audit', ['At','Action','Subject','Detail','By'], []);
    };
    const DOW = d => new Date(d + 'T00:00:00').getDay();

    /* ---- 1. THE SECOND SATURDAYS ARE WORKED OUT, NOT TYPED ---- */
    {
      const e = mock.load({ now:'2026-10-01T09:00:00+05:30' });
      const got = e.ctx.secondSaturdays_(2026);
      t.eq(got.length, 12, 'twelve of them, one to a month');
      got.forEach(d => {
        t.eq(DOW(d), 6, d + ' is a Saturday');
        t.ok(Number(d.slice(8)) >= 8 && Number(d.slice(8)) <= 14,
          d + ' falls between the 8th and the 14th, which only a second Saturday does');
      });
      /* and they are the G.O.'s own twelve — computed, not copied */
      t.eq(got.join(','), e.eval('TS_SECOND_SATURDAYS_2026').join(','),
        'and they are exactly the dates the G.O. listed');

      const y7 = e.ctx.secondSaturdays_(2027);
      t.eq(y7.length, 12, '2027 works out too, with nothing typed for it');
      y7.forEach(d => t.eq(DOW(d), 6, d + ' is a Saturday'));
    }

    /* ---- 2. THE TRANSPOSED DATES ARE SIMPLY NOT HOLIDAYS ---- */
    {
      const e = mock.load({ now:'2026-10-01T09:00:00+05:30' }); seed(e);
      t.eq(e.ctx.isWorkingDay_('2026-10-08'), true,
        '8 Oct — Bonalu with its day and month transposed — is a working day');
      t.eq(e.ctx.isWorkingDay_('2026-11-04'), true,
        'so is 4 Nov, a Wednesday calling itself a Second Saturday');
      t.eq(e.ctx.isWorkingDay_('2026-12-09'), true, 'and 9 Dec');
      t.ok(!e.ctx.holidaySet_()['2026-10-08'], 'none of them is on the calendar at all');
    }

    /* ---- 3. AND THE REAL ONES STAND ---- */
    {
      const e = mock.load({ now:'2026-10-01T09:00:00+05:30' }); seed(e);
      t.eq(e.ctx.isWorkingDay_('2026-11-14'), false, 'the real second Saturday of November is a holiday');
      t.eq(e.ctx.isWorkingDay_('2026-12-12'), false, 'and of December');
      t.eq(e.ctx.isWorkingDay_('2026-10-10'), false, 'and of October');
      t.eq(e.ctx.isWorkingDay_('2026-10-02'), false,
        'Gandhi Jayanthi is a holiday though the tab never carried it — the ORDER is the calendar now');

      /* a register whose tab was never loaded still has its year */
      const bare = mock.load({ now:'2026-10-01T09:00:00+05:30' });
      bare.mkSheet('Holidays', ['Date','Occasion'], []);
      t.eq(bare.ctx.isWorkingDay_('2026-10-10'), false,
        'AND SO DOES A REGISTER WITH AN EMPTY TAB — the Gram Palana fault cannot recur');
      t.ok(Object.keys(bare.ctx.holidaySet_()).length >= 10,
        'it has the rest of the year without being loaded — every day from the' +
        'straightening on comes from the order itself');
    }

    /* ---- 4. DAYS ALREADY ANNOUNCED STAY SHUT ----
       The Collector's direction of 01.10.2026. Officers were told not to mark
       on those days; a register that corrects itself must not then accuse them
       of the absence it asked for. */
    {
      const e = mock.load({ now:'2026-10-01T09:00:00+05:30' }); seed(e);
      t.eq(e.ctx.isWorkingDay_('2026-09-05'), false,
        '5 Sept was announced as a holiday and stays one — nobody is marked absent in retrospect');
      t.eq(e.ctx.isWorkingDay_('2026-10-01'), false,
        'and so does today, which 280 officers were told this morning was a holiday');
      t.eq(e.ctx.isWorkingDay_('2026-02-10'), false, 'and 10 Feb, months gone');
      t.eq(e.ctx.offInfo_('2026-10-01').today, true, 'the register says so when asked');
      t.eq(e.ctx.isWorkingDay_('2026-10-08'), true,
        'while 8 Oct, which is ahead of the line, is a working day');
    }

    /* ---- 5. A YEAR THE STATE HAS NOT DECLARED IS NOT GUESSED AT ----
       Believing a computed calendar for 2027 before the G.O. exists would make
       Dasara a working day and chase 280 officers through it. */
    {
      const e = mock.load({ now:'2026-10-01T09:00:00+05:30' }); seed(e);
      t.eq(e.ctx.orderYear_('2027'), null, 'there is no order on file for 2027');
      e.sheets['Holidays'].rows.push(["'2027-03-29", 'Holi']);
      t.eq(e.ctx.isWorkingDay_('2027-03-29'), false,
        'a 2027 holiday on the tab is still believed, because nothing has declared that year');
      t.eq(e.ctx.isWorkingDay_('2027-03-13'), true,
        'and no second Saturday is invented for it — the year is the tab’s until the G.O. arrives');
    }

    /* ---- 6. THE CONSOLE STILL NAMES WHAT THE TAB CARRIES ----
       The rows stay as the record of what was once declared. */
    {
      const e = mock.load({ now:'2026-10-01T09:00:00+05:30' }); seed(e);
      const cdm = e.ctx.issueToken_(e.ctx.findByPhone_('9000000001'));
      const roll = e.get('roll', { token:cdm });
      t.eq(roll.ok, true, 'the Collector reads the roll');
      t.ok(!!roll.holidays, 'which carries the year');
      const extra = (roll.holidays.extra || []).map(x => x.date);
      t.ok(extra.indexOf('2026-09-05') >= 0, 'a transposed date already gone is still named');
      t.ok(extra.indexOf('2026-10-08') >= 0,
        'and so is one still to come — the tab is the record, whatever the calendar now counts');
      t.eq(e.ctx.isWorkingDay_('2026-10-08'), true,
        'though it decides nothing: the day is a working day all the same');
      t.eq(roll.holidays.missing, undefined,
        'nothing is reported as MISSING any more — the order is the calendar, so a date' + ' '+
        'the tab does not list is a holiday regardless');
    }

    /* ---- 7. NOTHING PRESSES ANYTHING ANY MORE ---- */
    {
      const e = mock.load({ now:'2026-10-01T09:00:00+05:30' }); seed(e);
      const cdm = e.ctx.issueToken_(e.ctx.findByPhone_('9000000001'));
      t.eq(e.post({ kind:'holidayVoid', token:cdm, date:'2026-10-08' }).ok, false,
        'the striking endpoint is gone — a calendar that is worked out needs nothing struck off it');
    }
  }
};

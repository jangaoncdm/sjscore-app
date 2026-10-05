/* ANALYTICS — a month, read every way at once.

   The console showed today very well and the last fortnight as a line. What it
   could not answer is the question a review actually asks: how did this month
   go, for whom, where, and what is different about it.

   What this suite guards:

     · THE TWO ROLLS ARE NEVER ADDED. The field officers answer to the
       show-cause ladder and the MPDO office staff do not, so every figure is
       of ONE of them and the answer says which. A percentage mixing the two
       means nothing to either;
     · sanctioned leave is not an absence, and a day the district was shut is
       not a working day;
     · one officer with three rows on a day is one mark, not three (rule 9 in
       its own clothes: count officers, never rows);
     · the observations are ARITHMETIC. Each carries its own number so it can
       be checked against the figure beside it, and no model is asked — a key
       in a public government repository is the mistake this project already
       has a rule about;
     · and it accuses nobody: no notice, no debit and no lock reads any of it.
*/
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'analytics (a month, read every way at once)',
  run(t){

    const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active','Designation','EmpId'];
    const A = ['id','date','phone','name','role','mandal','markedAt','lat','lng','accuracy',
               'verified','photo','timezone','receivedAt','status','leaveId','leaveType',
               'markCount','firstMarkAt','skew'];
    const L = ['id','appliedAt','phone','name','role','mandal','type','fromDate','toDate','days',
               'reason','address','leaveHq','certificate','status','decidedBy','decidedAt','remarks','receivedAt'];
    /* October 2026: the 2nd is Gandhi Jayanti and the 11th a second Saturday
       on the Gregorian calendar, so the working days are fewer than the 31. */
    const NOW = '2026-10-20T10:00:00+05:30';

    const start = () => {
      const e = mock.load({ now:NOW });
      e.mkSheet('Users', U, [
        { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Mandal:'', GP:'', Email:'c@x', Active:'TRUE' },
        { Phone:'9000000011', Name:'A. Punctual',  Role:'PS',    Mandal:'Jangaon',     GP:'Konne', Email:'a@x', Active:'TRUE' },
        { Phone:'9000000012', Name:'B. Patchy',    Role:'PS',    Mandal:'Jangaon',     GP:'Konne', Email:'b@x', Active:'TRUE' },
        { Phone:'9000000013', Name:'C. Chilpur',   Role:'MPO',   Mandal:'Chilpur',     GP:'',      Email:'d@x', Active:'TRUE' },
        { Phone:'9000000010', Name:'M. Voluntary', Role:'MSO',   Mandal:'Jangaon',     GP:'',      Email:'m@x', Active:'TRUE' },
        { Phone:'7013299150', Name:'T.Srinivas',   Role:'STAFF', Mandal:'Bachannapet', GP:'',      Email:'s@x', Active:'TRUE', Designation:'AEE (PR)' },
        { Phone:'7013299151', Name:'E.Babu',       Role:'STAFF', Mandal:'Bachannapet', GP:'',      Email:'t@x', Active:'TRUE', Designation:'Data Entry Operator' }
      ]);
      e.mkSheet('Attendance', A, []);
      e.mkSheet('Leave', L, []);
      e.mkSheet('Audit', ['At','Action','Subject','Detail','By'], []);
      return e;
    };
    const cdm = e => e.ctx.issueToken_(e.ctx.findByPhone_('9000000001'));
    const ana = (e, q) => e.get('analytics', Object.assign({ token:cdm(e) }, q || {}));
    const mark = (e, ph, date, hh, more) => e.addRow('Attendance', Object.assign({
      id:'A-' + ph + '-' + date, date:date, phone:ph,
      markedAt:date + 'T' + hh + ':00:00+05:30', receivedAt:date + 'T' + hh + ':00:00+05:30',
      status:'PRESENT', accuracy:12, verified:'TRUE', lat:17.72, lng:79.14 }, more || {}));

    /* ---- 1. THE WORKING DAYS ARE THE CALENDAR'S, NOT THE MONTH'S LENGTH ---- */
    {
      const e = start();
      const r = ana(e, { ym:'2026-10', seg:'field' });
      t.eq(r.ok, true, 'the month is read');
      t.ok(r.workingDays > 0 && r.workingDays < 31,
        'Sundays and the declared holidays are not working days', r.workingDays + ' of 31');
      t.eq(r.days.length, r.workingDays, 'and the day table carries exactly those days');
      t.ok(!r.days.some(d => d.date === '2026-10-02'),
        'GANDHI JAYANTI IS NOT IN IT — a day the district was shut is not a day anybody missed');
    }

    /* ---- 2. THE TWO ROLLS ARE NEVER ADDED ---- */
    {
      const e = start();
      const f = ana(e, { ym:'2026-10', seg:'field' });
      const s = ana(e, { ym:'2026-10', seg:'staff' });
      const a = ana(e, { ym:'2026-10', seg:'all' });
      t.eq(f.roll.officers, 3, 'the field roll is the field officers');
      t.ok(!f.roll.byRole.STAFF, 'with no office staff among them');
      t.eq(s.roll.officers, 2, 'the staff roll is the staff');
      t.eq(Object.keys(s.roll.byRole).join(','), 'STAFF', 'and nobody else');
      t.eq(a.roll.officers, 5, 'and Everyone is the two together');
      t.ok(!f.roll.byRole.MSO,
        'AN MSO IS IN NEITHER — his attendance is voluntary, so he is never counted as a gap');
      t.eq(f.seg, 'field', 'and the answer says which roll it is');
    }

    /* ---- 3. ONE OFFICER, ONE DAY, HOWEVER MANY ROWS ---- */
    {
      const e = start();
      mark(e, '9000000011', '2026-10-05', '09');
      mark(e, '9000000011', '2026-10-05', '10', { id:'A-dup-1' });
      mark(e, '9000000011', '2026-10-05', '11', { id:'A-dup-2' });
      const r = ana(e, { ym:'2026-10', seg:'field' });
      const d = r.days.filter(x => x.date === '2026-10-05')[0];
      t.eq(d.present, 1, 'THREE ROWS ON ONE DAY ARE ONE OFFICER PRESENT, not three');
      t.eq(r.marks, 1, 'and one mark in the month');
      const o = r.officers.filter(x => x.phone === '9000000011')[0];
      t.eq(o.present, 1, 'and one day present against his name');
    }

    /* ---- 4. SANCTIONED LEAVE IS NOT AN ABSENCE ---- */
    {
      const e = start();
      e.addRow('Leave', { id:'L1', phone:'9000000012', status:'APPROVED', type:'CL',
                          fromDate:'2026-10-05', toDate:'2026-10-09' });
      const r = ana(e, { ym:'2026-10', seg:'field' });
      const d = r.days.filter(x => x.date === '2026-10-05')[0];
      t.eq(d.leave, 1, 'the day he was sanctioned counts as leave');
      t.ok(d.unmarked < 3, 'and not as an unmarked officer', d.unmarked + ' unmarked');
      const o = r.officers.filter(x => x.phone === '9000000012')[0];
      t.eq(o.unmarked, r.workingDays - 5,
        'HIS SANCTIONED DAYS ARE NOT COUNTED AGAINST HIM, and nor is his run broken by them');
      t.ok(o.longest < r.workingDays, 'his longest run excludes them');
    }

    /* ---- 5. THE MONTH, CUT EVERY WAY ---- */
    {
      const e = start();
      ['2026-10-05','2026-10-06','2026-10-07'].forEach(d => {
        mark(e, '9000000011', d, '09');            /* on time */
        mark(e, '9000000013', d, '12');            /* late */
      });
      mark(e, '9000000013', '2026-10-08', '13', { accuracy:900, verified:'FALSE' });
      const r = ana(e, { ym:'2026-10', seg:'field' });

      t.ok(r.hours.some(h => h.hour === 9 && h.n === 3), 'the hour of every mark is counted');
      t.eq(r.late, 4, 'and a mark at or after 11:00 is late', r.late + ' late');
      t.ok(r.weekday.length > 0, 'the weekdays are summed');
      t.ok(r.mandals.length >= 2, 'and the mandals ranked', r.mandals.map(m => m.mandal).join(', '));
      t.eq(r.mandals[0].pct >= r.mandals[r.mandals.length - 1].pct, true, 'best first');
      t.eq(r.location.untrusted, 1, 'a reading coarser than 250 m is not trusted');
      t.eq(r.location.recorded, 6, 'and the good ones are counted');

      /* the officer table is sorted by who was absent most */
      t.ok(r.officers[0].unmarked >= r.officers[r.officers.length - 1].unmarked,
        'the officer table leads with who was absent most often');
      t.ok(r.officers.every(o => o.pct >= 0 && o.pct <= 100), 'and every rate is a percentage');
    }

    /* ---- 6. THE OBSERVATIONS ARE ARITHMETIC, AND EACH CARRIES ITS NUMBER ---- */
    {
      const e = start();
      ['2026-10-05','2026-10-06'].forEach(d => mark(e, '9000000011', d, '09'));
      const r = ana(e, { ym:'2026-10', seg:'field' });
      t.ok(r.observations.length >= 3, 'the month is summed up in sentences', r.observations.length);
      t.ok(r.observations.every(o => /\d/.test(o)),
        'AND EVERY ONE CARRIES A NUMBER, so it can be checked against the figure beside it');
      t.contains(r.observations[0], 'working day', 'the first says what the month was');
      t.ok(!/model|AI|generated/i.test(JSON.stringify(r.observations)),
        'nothing claims to have been generated — it is arithmetic with a sentence round it');

      /* and the staff are told plainly that nothing arises */
      const s = ana(e, { ym:'2026-10', seg:'staff' });
      t.contains(JSON.stringify(s.observations), 'no lock arises',
        'the staff reading says no sanction comes of it');
    }

    /* ---- 7. IT ACCUSES NOBODY, AND THE SERVER DECIDES ---- */
    {
      const e = start();
      const r = ana(e, { ym:'2026-10', seg:'field' });
      t.eq(r.sanction, false, 'sanction:false travels with it, as the schedule’s does');
      t.contains(r.note, 'No notice, no debit and no lock', 'and it says so in words');

      const ps = e.ctx.issueToken_(e.ctx.findByPhone_('9000000011'));
      t.eq(e.get('analytics', { token:ps }).ok, false,
        'a Panchayat Secretary cannot read the district’s month');
    }

    /* ---- 8. A MANDAL ON ITS OWN, AND A MONTH WITH NOTHING IN IT ---- */
    {
      const e = start();
      mark(e, '9000000013', '2026-10-05', '09');
      const r = ana(e, { ym:'2026-10', seg:'field', mandal:'Chilpur' });
      t.eq(r.roll.officers, 1, 'one mandal is read on its own');
      t.eq(r.mandals.length, 1, 'and only it is ranked');

      const empty = ana(e, { ym:'2025-01', seg:'field' });
      t.eq(empty.ok, true, 'a month before the register existed still answers');
      t.eq(empty.marks, 0, 'with nothing in it');
      t.ok(empty.observations.length >= 1, 'and says so rather than returning a blank screen');
    }
  }
};

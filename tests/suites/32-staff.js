/* THE MPDO OFFICE STAFF — attendance and leave, and nothing else.

   Ordered 04.10.2026: 192 men and women of the twelve MPDO offices added to
   this register "for attendance and leave management, nothing else", in the
   district's own words.

   What this suite is really guarding is everything that would have swept them
   in by itself, because each of those is a thing done TO a person:

     · THE SHOW-CAUSE LADDER. It is built and switched off for them, exactly as
       it is for the whole Gram Palana register. An Office Subordinate who
       misses three days must not be served a numbered notice reciting Rule 3
       of the Conduct Rules, have a day of casual leave debited, or find his
       app locked. Turning that on is the Collector's written order and THIS
       SUITE IS WHERE IT IS CHANGED FIRST, deliberately;
     · the Gram Panchayat Development Plan, which gpdpDue_ asks of every role
       but the Collector;
     · the 100-mark evaluation and the filing schedule.

   And one number is one officer: a mobile already on the roll under another
   man's name is refused, and a Panchayat Secretary who also appears on the
   office list is never quietly turned into office staff.
*/
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'the MPDO office staff (attendance and leave, and nothing else)',
  run(t){

    const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active','Designation','EmpId'];
    const NOW = '2026-10-05T09:00:00+05:30';          /* a Monday, a working day */

    const start = (extra) => {
      const e = mock.load({ now:NOW });
      e.mkSheet('Users', U, [
        { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Mandal:'', GP:'', Email:'cdm@mock.example', Active:'TRUE' },
        { Phone:'9000000011', Name:'A. Punctual', Role:'PS', Mandal:'Jangaon', GP:'Konne', Email:'a@mock.example', Active:'TRUE' }
      ].concat(extra || []));
      e.mkSheet('GPs', ['Mandal','GP'], [{ Mandal:'Jangaon', GP:'Konne' }]);
      e.mkSheet('Audit', ['At','Action','Subject','Detail','By'], []);
      return e;
    };
    const cdm = e => e.ctx.issueToken_(e.ctx.findByPhone_('9000000001'));
    const paste = (e, rows, dry) => e.post({ kind:'staffUpdate', token:cdm(e), rows:rows, dry:!!dry });
    const STAFF = { mandal:'Bachannapet', name:'T.Srinivas', desig:'AEE (PR)', emp:'JNMPDO005',
                    phone:'7013299150', lat:17.791811, lng:79.041849 };

    /* ---- 1. THEY GO ON THE ROLL, AND THE OFFICE WITH THEM ---- */
    {
      const e = start();
      const dry = paste(e, [STAFF], true);
      t.eq(dry.plans[0].verdict, 'register', 'a member of staff not on the roll is registered');
      t.eq(e.sheets['Users'].rows.length, 3, 'AND THE PROPOSAL WROTE NOTHING');

      const r = paste(e, [STAFF]);
      t.eq(r.added, 1, 'on Apply he is written');
      const u = e.ctx.findByPhone_('7013299150');
      t.eq(u.role, 'STAFF', 'as STAFF — one role, whatever his designation');
      t.eq(u.mandal, 'Bachannapet', 'in his own mandal');
      t.eq(JSON.stringify(u.gps), '[]', 'holding no village, which is not missing data');
      t.eq(r.pins.length, 1, 'with a PIN shown once to the console that asked');
      t.eq(r.pins[0].desig, 'AEE (PR)',
        'and the PIN record names his designation, so the file handed to the office says who gets which');
      t.eq(r.pins[0].mandal, 'Bachannapet', 'and his mandal');
      t.noToken(JSON.stringify(e.sheets['Audit'].rows), r.pins[0].pin,
        'and the Audit tab records that one was set, never the PIN');
      t.eq(e.post({ kind:'login', u:'7013299150', p:r.pins[0].pin }).ok, true, 'and it opens the app');

      /* his designation and his employee id are on the roll, for a person to read */
      const row = e.sheets['Users'].rows.find(x => String(x[0]).indexOf('7013299150') >= 0);
      t.contains(JSON.stringify(row), 'AEE (PR)', 'his designation is on the roll');
      t.contains(JSON.stringify(row), 'JNMPDO005', 'and his employee id');

      /* THE OFFICE IS A PLACE AND NOT A PERSON */
      t.ok(!!e.sheets['Mandals'], 'the mandal office is written');
      t.eq(r.offices, 1, 'one office for the mandal');
      t.contains(JSON.stringify(e.sheets['Mandals'].rows), '17.791811', 'with its coordinates');
    }

    /* ---- 2. HE MARKS IN AND HE APPLIES FOR LEAVE, AND THAT IS THE WHOLE OF IT ---- */
    {
      const e = start();
      paste(e, [STAFF]);
      const tok = e.ctx.issueToken_(e.ctx.findByPhone_('7013299150'));

      const att = e.post({ kind:'attendance', token:tok, att:{ id:'S1', date:'2026-10-05',
        ts:'2026-10-05T09:30:00+05:30', lat:17.7918, lng:79.0418, acc:9, verified:true } });
      t.eq(att.ok, true, 'HE MARKS IN, which is what he was added for');
      /* a top-level const lives in the vm's lexical scope and not on ctx */
      t.ok(e.eval("canApplyLeave_('STAFF')"), 'AND HE MAY APPLY FOR LEAVE');

      /* and not one of the things he was not added for */
      t.eq(e.post({ kind:'inspection', token:tok, rec:{ id:'X', gp:'Konne', mandal:'Jangaon' } }).ok, false,
        'he does not file a village evaluation');
      t.eq(e.get('gpdp', { token:tok }).due, false, 'HE IS NOT CALLED FOR A DEVELOPMENT PLAN');
      t.eq(e.ctx.gpdpDue_('STAFF'), false, 'gpdpDue_ says so for the role itself');
    }

    /* ---- 3. THE LADDER IS BUILT AND SWITCHED OFF ----
       This is the section to change FIRST if the district ever orders that
       office staff be served notices. Nothing else should be touched before
       it. */
    {
      const e = start();
      paste(e, [STAFF]);
      /* a Secretary and a member of staff, neither of whom has marked */
      const gaps = e.ctx.noticeGaps_('2026-10-05').map(g => g.phone);
      t.ok(gaps.indexOf('9000000011') >= 0, 'an unmarked Panchayat Secretary is in the ladder, as he always was');
      t.ok(gaps.indexOf('7013299150') < 0,
        'AND THE UNMARKED MEMBER OF STAFF IS NOT — no reminder, no notice, no debit, no lock');
      t.eq(e.eval("sanctionExempt_('STAFF')"), true, 'the exemption is a list in TENANTS, not an edit');
      t.eq(e.eval("sanctionExempt_('PS')"), false, 'and it reaches nobody else');

      /* the engine itself, run for the day */
      e.mkSheet('Notices', ['id','no','date','phone','name','role','mandal','status'], []);
      e.mkSheet('Reminders', ['id','date','phone','name','role','mandal','miss','kind','reason','sentAt'], []);
      try{ e.ctx.issueAbsenceNotices(); }catch(err){}
      t.ok(JSON.stringify((e.sheets['Notices'] || {rows:[]}).rows).indexOf('7013299150') < 0,
        'the notice register carries nothing against him');
      /* AND THE REMINDER TAB IS THE ONE THAT CAUGHT IT. The engine builds its
         own roll and does not go through noticeGaps_, so the first cut of the
         exemption — put on noticeGaps_ alone — let a reminder go out to a Data
         Entry Operator while every other assertion here passed. */
      t.ok(JSON.stringify((e.sheets['Reminders'] || {rows:[]}).rows).indexOf('7013299150') < 0,
        'and neither does the reminder tab');
    }

    /* ---- 4. ONE NUMBER, ONE OFFICER ---- */
    {
      const e = start([
        { Phone:'9000000012', Name:'B. Secretary', Role:'PS', Mandal:'Chilpur', GP:'Konne', Email:'b@x', Active:'TRUE' }
      ]);
      const r = paste(e, [{ mandal:'Chilpur', name:'Quite Another Person', desig:'Typist',
        emp:'X1', phone:'9000000012', lat:17.9, lng:79.3 }], true);
      t.eq(r.plans[0].verdict, 'refused',
        'a mobile already on the roll under another man is refused');
      t.contains(r.plans[0].why, 'B. Secretary', 'and the man who holds it is named');
    }

    /* ---- 5. AN OFFICER OF THIS REGISTER IS NOT DEMOTED TO STAFF ----
       A Panchayat Secretary or an MPO who also appears on the office list
       keeps his role: it carries his villages, his filings and his place in
       the ladder, and overwriting it would take all of that away. */
    {
      const e = start();
      const r = paste(e, [{ mandal:'Jangaon', name:'A. Punctual', desig:'Senior Assistant',
        emp:'E9', phone:'9000000011', lat:17.72, lng:79.14 }]);
      const u = e.ctx.findByPhone_('9000000011');
      t.eq(u.role, 'PS', 'HIS ROLE IS LEFT EXACTLY AS IT IS');
      t.eq(JSON.stringify(u.gps), '["Konne"]', 'and he keeps his village');
      t.contains(JSON.stringify(e.sheets['Users'].rows), 'Senior Assistant',
        'while his designation is noted, which is all this paste is the authority for');
    }

    /* ---- 6. A SECOND MANDAL IS ADDITIONAL CHARGE, NOT A SECOND MAN ----
       The district's own list of 04.10.2026 carried four people under two
       mandals apiece — the same name spelt two ways on one mobile. */
    {
      const e = start();
      paste(e, [STAFF]);
      const r = paste(e, [{ mandal:'Chilpur', name:'T.Srinivas', desig:'AEE (PR)',
        emp:'JNMPDO005', phone:'7013299150', lat:17.918968, lng:79.31495 }]);
      t.eq(r.plans[0].verdict, 'add', 'a second mandal on one number is additional charge');
      const u = e.ctx.findByPhone_('7013299150');
      t.eq(u.mandals.length, 2, 'and he sits in both');
      const rows = e.sheets['Users'].rows.filter(x => String(x[0]).indexOf('7013299150') >= 0);
      t.eq(rows.length, 2, 'as two rows, one office each');
      const hashes = rows.map(x => String(x[7])).filter(String);
      t.eq(hashes.length, 1,
        'AND ONLY ONE OF THEM CARRIES A PIN — findByPhone_ takes it from the first row that has one');
      t.eq(e.post({ kind:'login', u:'7013299150', p:e.ctx.dayPin_('7013299150') }).ok, true,
        'so his PIN still opens the app');
    }

    /* ---- 7. NOTHING IS INVENTED, AND A SECOND PASTE CHANGES NOTHING ---- */
    {
      const e = start();
      const bad = paste(e, [
        { mandal:'Bachannapet', name:'', desig:'Typist', emp:'E1', phone:'7013299151', lat:17.79, lng:79.04 },
        { mandal:'', name:'No Mandal', desig:'Typist', emp:'E2', phone:'7013299152', lat:17.79, lng:79.04 },
        { mandal:'Bachannapet', name:'Short Number', desig:'Typist', emp:'E3', phone:'12345', lat:17.79, lng:79.04 }
      ], true);
      t.eq(bad.plans[0].verdict, 'refused', 'a row with no name is refused — the roll is read by people');
      t.eq(bad.plans[1].verdict, 'refused', 'a row with no mandal is refused');
      t.eq(bad.plans[2].verdict, 'refused', 'and a mobile number is ten digits');

      /* A COORDINATE OUTSIDE THE DISTRICT IS NOT A COORDINATE */
      const far = paste(e, [{ mandal:'Bachannapet', name:'Far Office', desig:'Typist',
        emp:'E4', phone:'7013299153', lat:28.61, lng:77.20 }], true);
      t.eq(far.plans[0].officeDropped, true, 'a coordinate outside the district is dropped, not believed');
      t.ok(!far.plans[0].office, 'and no office is written from it');

      t.eq(paste(e, []).ok, false, 'an empty paste is refused');

      /* RULE 8 */
      paste(e, [STAFF]);
      const n = e.sheets['Users'].rows.length, a = e.sheets['Audit'].rows.length;
      const again = paste(e, [STAFF]);
      t.eq(e.sheets['Users'].rows.length, n, 'a second paste writes no second row');
      t.eq(again.plans[0].verdict, 'unchanged', 'and says there was nothing to do');
      t.eq(e.sheets['Audit'].rows.length, a, 'with nothing added to the Audit tab');
    }

    /* ---- 8. THE SERVER DECIDES, AND IT IS SWACHH JANGAON'S ALONE ---- */
    {
      const e = start();
      const ps = e.ctx.issueToken_(e.ctx.findByPhone_('9000000011'));
      const r = e.post({ kind:'staffUpdate', token:ps, rows:[STAFF] });
      t.eq(r.ok, false, 'a Panchayat Secretary cannot write the office roll');
      t.contains(r.error, 'Collector alone', 'and is told whose it is');

      const g = mock.load({ now:NOW });
      g.props.TENANT = 'GP'; g.seedUsers();
      const rep = g.ctx.featureReport_();
      t.ok(!rep.live.some(f => f.name === 'staff'), 'the Gram Palana register does not carry it');
      t.eq(g.eval("sanctionExempt_('STAFF')"), false,
        'and a register that names no exemption has none — the lists default to empty');
    }
  }
};

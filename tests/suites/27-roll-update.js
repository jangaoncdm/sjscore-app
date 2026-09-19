/* THE ROLL, CORRECTED FROM THE DISTRICT'S OWN TABLE.

   The office keeps its roster in a table — mandal, name, mobile, official
   email, the office and its coordinates. Agreeing with it used to mean a
   FIELD_FIXES batch, a code edit and a deploy for one officer.

   WHAT THIS SUITE IS REALLY GUARDING is the difference between a correction
   and a succession. If the MPO of a mandal is a DIFFERENT PERSON from the one
   on the row, writing the new name and number over that row would hand the
   outgoing officer's attendance, her notices and her leave to the incoming
   man: the register would show him present on days he had not joined, and a
   show-cause notice served on one officer would stand against another. So a
   changed NUMBER against the SAME name is written in place, and a changed
   PERSON is a succession — the outgoing row is marked inactive and keeps
   everything pointing at it (rule 7), and the incoming officer gets a row of
   his own.

   It proposes before it writes, it writes nothing twice (rule 8), it deletes
   nothing, and the Collector's own role is re-checked on the server (rule 6).
*/
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'the roll corrected from the district’s table (rollUpdate)',
  run(t){

    const seed = env => {
      env.mkSheet('Users', ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'], [
        { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Mandal:'', GP:'', Active:'TRUE' },
        { Phone:'9704250523', Name:'A.Krishnakumari',   Role:'MPO', Mandal:'Bachannapet', GP:'',
          Email:'old.bachannapet@gmail.com', Active:'TRUE' },
        { Phone:'9000000077', Name:'Old Incumbent',     Role:'MPO', Mandal:'Chilpur', GP:'',
          Email:'old.chilpur@gmail.com', Active:'TRUE' },
        { Phone:'9849771797', Name:'K. Narsingarao',    Role:'MPO', Mandal:'Jangaon', GP:'',
          Email:'eoprd.jangaon@gmail.com', Active:'TRUE' },
        { Phone:'9888800001', Name:'Somebody Else',     Role:'PS',  Mandal:'Narmetta', GP:'Kamalapur',
          Active:'TRUE' }
      ]);
      env.mkSheet('GPs', ['Mandal','GP'], [{ Mandal:'Jangaon', GP:'Kodavatancha' }]);
      env.mkSheet('Audit', ['At','Action','Subject','Detail','By'], []);
    };
    const tokenFor = (env, phone) => env.ctx.issueToken_(env.ctx.findByPhone_(phone));
    const rows = () => ([
      { mandal:'Bachannapet', role:'MPO', name:'A.Krishnakumari', phone:'9704250523',
        email:'eoprd.bachannapet@gmail.com', office:'O/o MPP Bachannapet', lat:17.791811, lng:79.041849 },
      { mandal:'Chilpur', role:'MPO', name:'N. Raghu Rama Krishna', phone:'8185985909',
        email:'mpo.chilpur@gmail.com', office:'O/o MPP Chilpur', lat:17.918968, lng:79.31495 },
      { mandal:'Jangaon', role:'MPO', name:'K. Narsingarao', phone:'9849771797',
        email:'eoprd.jangaon@gmail.com', office:'O/o MPP Jangaon', lat:17.72794, lng:79.148206 },
      { mandal:'Narmetta', role:'MPO', name:'Suman Chidurala', phone:'9491634170',
        email:'eoprd.narmetta@gmail.com', office:'O/o MPP Narmetta', lat:17.886110, lng:79.161110 }
    ]);

    /* ---- 1. IT IS THE COLLECTOR'S ALONE, re-checked on the server ---- */
    {
      const e = mock.load({ now:'2026-09-19T10:00:00+05:30' }); seed(e);
      const ps = tokenFor(e, '9888800001');
      const r = e.post({ kind:'rollUpdate', token:ps, rows:rows(), dry:true });
      t.eq(r.ok, false, 'a Secretary cannot correct the roll');
      t.contains(r.error, 'Collector', 'and it says whose it is');
      t.eq(e.post({ kind:'rollUpdate', token:'', rows:rows(), dry:true }).ok, false,
        'nor can a caller with no token');
    }

    /* ---- 2. IT PROPOSES BEFORE IT WRITES ---- */
    {
      const e = mock.load({ now:'2026-09-19T10:00:00+05:30' }); seed(e);
      const cdm = tokenFor(e, '9000000001');
      const before = JSON.stringify(e.sheets['Users'].rows);
      const d = e.post({ kind:'rollUpdate', token:cdm, rows:rows(), dry:true });
      t.eq(d.ok, true, 'the dry run answers');
      t.eq(d.dry, true, 'and says it is one');
      t.eq(JSON.stringify(e.sheets['Users'].rows), before, 'having written NOTHING');
      t.eq(d.plans.length, 4, 'a plan for every line of the table');

      const by = {}; d.plans.forEach(p => { by[p.mandal] = p; });
      t.eq(by.Bachannapet.verdict, 'correct', 'the same officer with a new email is a correction');
      t.contains(by.Bachannapet.changes.join(' '), 'email', 'and the email is what changes');
      t.eq(by.Jangaon.verdict, 'unchanged', 'a line that already agrees changes nothing');
      t.eq(by.Chilpur.verdict, 'succession', 'a DIFFERENT person in the chair is a succession');
      t.contains(by.Chilpur.why, 'Old Incumbent', 'naming who holds it today');
      t.eq(by.Narmetta.verdict, 'register', 'a chair nobody holds is a registration');
      t.eq(by.Narmetta.needsPin, true, 'and he will need a PIN');
      t.eq(d.offices, 4, 'four mandal offices would be written');
    }

    /* ---- 3. AND THEN IT WRITES — without one officer inheriting another's record ---- */
    {
      const e = mock.load({ now:'2026-09-19T10:00:00+05:30' }); seed(e);
      const cdm = tokenFor(e, '9000000001');
      const w = e.post({ kind:'rollUpdate', token:cdm, rows:rows(), dry:false });
      t.eq(w.ok, true, 'it writes');
      t.eq(w.corrected, 1, 'one row corrected in place');
      t.eq(w.registered, 2, 'two officers registered — the successor and the empty chair');
      t.eq(w.retired, 1, 'and one officer taken off the roll');

      const t2 = e.ctx.uidx_(), v = t2.sh.getDataRange().getValues();
      const find = p => { for(let i = 1; i < v.length; i++)
        if(e.ctx.phone10_(v[i][t2.ix.phone]) === p) return v[i]; return null; };
      const act = r => String(r[t2.ix.active]).toUpperCase() !== 'FALSE';

      /* the correction */
      const kk = find('9704250523');
      t.ok(!!kk, 'the officer whose email changed is still on her own row');
      t.eq(String(kk[t2.ix.email]), 'eoprd.bachannapet@gmail.com', 'with the official address');
      t.eq(act(kk), true, 'and is still active');

      /* THE SUCCESSION — the whole point */
      const out = find('9000000077');
      t.ok(!!out, 'THE OUTGOING OFFICER’S ROW IS STILL THERE — nothing is destroyed (rule 7)');
      t.eq(String(out[t2.ix.name]), 'Old Incumbent', 'still carrying her own name');
      t.eq(act(out), false, 'marked inactive');
      const inc = find('8185985909');
      t.ok(!!inc, 'and the incoming officer has a row of his own');
      t.eq(String(inc[t2.ix.name]), 'N. Raghu Rama Krishna', 'in his own name');
      t.eq(String(inc[t2.ix.mandal]), 'Chilpur', 'holding the chair');
      t.ok(String(inc[t2.ix.hash] || '') === '', 'and no PIN of hers — he is not her');

      /* the empty chair */
      t.ok(!!find('9491634170'), 'the mandal that had no MPO now has one');

      /* rule 7: it is all on the Audit tab */
      const aud = JSON.stringify(e.sheets['Audit'].rows);
      t.contains(aud, 'OFFICER TAKEN OFF THE ROLL', 'the retirement is recorded');
      t.contains(aud, 'ROLL CORRECTED', 'so is the correction');
      t.contains(aud, 'OFFICER REGISTERED', 'and so is the registration');

      /* ---- rule 8: a nervous second run changes nothing ---- */
      const again = e.post({ kind:'rollUpdate', token:cdm, rows:rows(), dry:false });
      t.eq(again.corrected, 0, 'a second run corrects nothing');
      t.eq(again.registered, 0, 'registers nobody');
      t.eq(again.retired, 0, 'and retires nobody');
      t.eq(e.sheets['Users'].rows.length, v.length, 'the roll is not one row longer');
    }

    /* ---- 4. ONE NUMBER IS ONE OFFICER ---- */
    {
      const e = mock.load({ now:'2026-09-19T10:00:00+05:30' }); seed(e);
      const cdm = tokenFor(e, '9000000001');
      /* the table gives the Chilpur chair a number the Jangaon MPO already holds */
      const bad = [{ mandal:'Chilpur', role:'MPO', name:'Somebody New', phone:'9849771797',
                     email:'x@gmail.com' }];
      const d = e.post({ kind:'rollUpdate', token:cdm, rows:bad, dry:true });
      t.eq(d.plans[0].verdict, 'refused', 'a number already on the roll is refused');
      t.contains(d.plans[0].why, 'Narsingarao', 'and its holder is named');
      const w = e.post({ kind:'rollUpdate', token:cdm, rows:bad, dry:false });
      t.eq(w.registered, 0, 'nothing is written for it');
      t.eq(w.retired, 0, 'and nobody is taken off the roll over it');
    }

    /* ---- 5. WHERE THE REGISTER CANNOT TELL, IT ASKS RATHER THAN GUESSES ---- */
    {
      const e = mock.load({ now:'2026-09-19T10:00:00+05:30' });
      seed(e);
      const t2 = e.ctx.uidx_();
      t2.sh.appendRow(["'9222200002", 'Second Claimant', 'MPO', 'Bachannapet', '', '', '', '', 'TRUE']);
      const cdm = tokenFor(e, '9000000001');
      const d = e.post({ kind:'rollUpdate', token:cdm, rows:[rows()[0]], dry:true });
      t.eq(d.plans[0].verdict, 'ambiguous', 'two officers in one chair is not settled here');
      t.contains(d.plans[0].why, 'yours to settle', 'and it says so plainly');
      const w = e.post({ kind:'rollUpdate', token:cdm, rows:[rows()[0]], dry:false });
      t.eq(w.corrected, 0, 'nothing is written while it is ambiguous');
    }

    /* ---- 6. THE MANDAL OFFICES — data about a place, not about a person ---- */
    {
      const e = mock.load({ now:'2026-09-19T10:00:00+05:30' }); seed(e);
      const cdm = tokenFor(e, '9000000001');
      e.post({ kind:'rollUpdate', token:cdm, rows:rows(), dry:false });
      const off = e.ctx.mandalOffices_();
      t.eq(Object.keys(off).length, 4, 'every office with a believable coordinate is written');
      t.eq(Math.round(off['jangaon'].lat * 1000) / 1000, 17.728, 'at its own latitude');
      t.contains(off['jangaon'].office, 'MPP Jangaon', 'under its own name');

      /* A COORDINATE THAT CANNOT BE BELIEVED IS NOT A COORDINATE (rule 10).
         Two of the 180 on the other register were wrong, and a distance off
         either would have been a five-hundred-kilometre figure printed
         against a man sitting in his own office. */
      const junk = [{ mandal:'Nowhere', role:'MPO', name:'A Name', phone:'9333300003',
                      office:'O/o MPP Nowhere', lat:17.5, lng:7852556 }];
      e.post({ kind:'rollUpdate', token:cdm, rows:junk, dry:false });
      t.ok(!e.ctx.mandalOffices_()['nowhere'], 'a longitude of 7852556 is dropped, not averaged in');
    }

    /* ---- 7. NOTHING IS SENT, NOTHING IS TAKEN ---- */
    {
      const e = mock.load({ now:'2026-09-19T10:00:00+05:30' }); seed(e);
      const cdm = tokenFor(e, '9000000001');
      t.eq(e.post({ kind:'rollUpdate', token:cdm, rows:[], dry:true }).ok, false,
        'an empty table is refused rather than read as "take everyone off"');
      const w = e.post({ kind:'rollUpdate', token:cdm, rows:rows(), dry:false });
      t.ok(!JSON.stringify(w).match(/InitPin|hash/i), 'no PIN or hash rides the answer');
      t.ok(Array.isArray(w.pins), 'it names who still needs a PIN');
      t.ok(w.pins.every(p => !p.pin), 'and never carries one — a PIN is shown once, by its own call');
    }
  }
};

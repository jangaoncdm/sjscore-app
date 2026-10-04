/* POSTINGS — which officer holds which place.

   The district's issue list of 02.10.2026 held 48 reports and 40 of them were
   one thing: the register had an officer against the wrong place. This suite
   holds the two faults that caused the four clearest of them, and the module
   that lets the Collector cure the other thirty-six.

   What it is really guarding is the half that could hurt somebody. A posting
   written wrong puts a man's attendance, his notices and his filings against a
   village he has never seen, and taking a village off the WRONG officer is the
   same fault in reverse. So:

     · a release is only ever proposed for a place the REGISTER already shows
       against him, pointed at by the remark — never read out of free text;
     · a village not on the GPs tab is refused, never invented;
     · one number carrying two names is reported as ambiguous and left alone;
     · nothing is destroyed (rule 7) and a second run writes nothing (rule 8).
*/
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'postings (which officer holds which place)',
  run(t){

    const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'];
    const NOW = '2026-10-04T10:00:00+05:30';

    const start = (users, gps) => {
      const e = mock.load({ now:NOW });
      e.mkSheet('Users', U, [{ Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR',
        Mandal:'', GP:'', Email:'cdm@mock.example', Active:'TRUE' }].concat(users || []));
      e.mkSheet('GPs', ['Mandal','GP'], gps || [
        { Mandal:'Bachannapet', GP:'Mansanpally' }, { Mandal:'Bachannapet', GP:'Salvapur' },
        { Mandal:'Bachannapet', GP:'Basireddypalli' }, { Mandal:'Bachannapet', GP:'Keshireddypally' },
        { Mandal:'Palakurthi', GP:'Valmidi' }, { Mandal:'Palakurthi', GP:'Narsingapuram Thanda' },
        { Mandal:'Raghunathpally', GP:'Kusumbai Thanda' }, { Mandal:'Raghunathpally', GP:'Veldi' }
      ]);
      e.mkSheet('Audit', ['At','Action','Subject','Detail','By'], []);
      return e;
    };
    const cdm = e => e.ctx.issueToken_(e.ctx.findByPhone_('9000000001'));
    const post = (e, rows, dry) => e.post({ kind:'postingUpdate', token:cdm(e), rows:rows, dry:!!dry });
    const gpsOf = (e, ph) => e.ctx.findByPhone_(ph).gps;

    /* ---- 1. THE TWO FAULTS THE DISTRICT REPORTED ----
       Both lived in findByPhone_, and neither could be cured by correcting the
       roll, because on two of the four the roll was already right. */
    {
      /* "previously I had incharge Salvapur gp. still both villages reflect in
         my app" — Yakanna of Bachannapet, 02.10.2026. The village had been
         released by marking its row inactive, and the app went on showing it. */
      const e = start([
        { Phone:'9000000014', Name:'Yakanna', Role:'PS', Mandal:'Bachannapet', GP:'Mansanpally', Email:'y@x', Active:'TRUE' },
        { Phone:'9000000014', Name:'Yakanna', Role:'PS', Mandal:'Bachannapet', GP:'Salvapur',    Email:'y@x', Active:'FALSE' }
      ]);
      t.eq(JSON.stringify(gpsOf(e, '9000000014')), '["Mansanpally"]',
        'A VILLAGE RELEASED BY MARKING ITS ROW INACTIVE IS NOT HELD — reported as "still both villages reflect in my app"');
      const u = e.ctx.findByPhone_('9000000014');
      t.eq(u.active, true, 'and the officer himself is still on the roll');
      t.eq(e.get('gps', { token:e.ctx.issueToken_(u) }).gps.length, 1,
        'the village list the app draws shows the one he holds');

      /* and the shape mergeDuplicateOfficers leaves behind: both villages in
         one cell. Three readers in Code.gs split that on commas; this one did
         not, so the whole string was one name matching nothing. */
      const f = start([
        { Phone:'9000000014', Name:'Yakanna', Role:'PS', Mandal:'Bachannapet',
          GP:'Mansanpally, Salvapur', Email:'y@x', Active:'TRUE' }
      ]);
      t.eq(JSON.stringify(gpsOf(f, '9000000014')), '["Mansanpally","Salvapur"]',
        'TWO VILLAGES IN ONE CELL ARE TWO VILLAGES — the merged row used to give him none');
      t.eq(f.get('gps', { token:f.ctx.issueToken_(f.ctx.findByPhone_('9000000014')) }).gps.length, 2,
        'and both reach the app');

      /* THE TWO FIXES BELONG TOGETHER. mergeDuplicateOfficers writes the
         joined cell AND marks the duplicate row inactive, so on merged data
         the first fix alone would have taken him to nought villages. */
      const h = start([
        { Phone:'9000000014', Name:'Yakanna', Role:'PS', Mandal:'Bachannapet',
          GP:'Mansanpally, Salvapur', Email:'y@x', Active:'TRUE' },
        { Phone:'9000000014', Name:'Yakanna', Role:'PS', Mandal:'Bachannapet',
          GP:'Salvapur', Email:'y@x', Active:'FALSE' }
      ]);
      t.eq(JSON.stringify(gpsOf(h, '9000000014')), '["Mansanpally","Salvapur"]',
        'AND ON A MERGED ROLL BOTH FIXES TOGETHER STILL GIVE HIM BOTH');
    }

    /* ---- 2. IT PROPOSES BEFORE IT WRITES ---- */
    {
      const e = start([
        { Phone:'9000000020', Name:'kesoju Radhika', Role:'PS', Mandal:'Palakurthi', GP:'Valmidi', Email:'k@x', Active:'TRUE' }
      ]);
      const dry = post(e, [{ mandal:'Palakurthi', gp:'Narsingapuram Thanda', name:'kesoju Radhika',
        phone:'9000000020', role:'Panchayat Secretary', remark:'deputed from valmidi to nasingapuram thanda' }], true);
      t.eq(dry.ok, true, 'the proposal is returned');
      t.eq(dry.dry, true, 'marked as a proposal');
      t.eq(dry.plans[0].verdict, 'move', 'a deputation is a move');
      t.eq(JSON.stringify(gpsOf(e, '9000000020')), '["Valmidi"]',
        'AND NOTHING WAS WRITTEN — he still holds what he held');

      const r = post(e, [{ mandal:'Palakurthi', gp:'Narsingapuram Thanda', name:'kesoju Radhika',
        phone:'9000000020', role:'Panchayat Secretary', remark:'deputed from valmidi to nasingapuram thanda' }]);
      t.eq(r.ok, true, 'and on Apply it is written');
      t.eq(JSON.stringify(gpsOf(e, '9000000020')), '["Narsingapuram Thanda"]',
        'HE HOLDS THE NEW VILLAGE AND NOT THE OLD — the half that is forgotten by hand');
      t.eq(r.moved, 1, 'counted as a move');
      t.contains(JSON.stringify(e.sheets['Audit'].rows), 'POSTING MOVED', 'and it is on the Audit tab');
    }

    /* ---- 3. IN CHARGE AND FAC ADD; THEY DO NOT MOVE ----
       The Collector's glossary: deputed is a transfer, in-charge and FAC are
       taken on IN ADDITION. Reading one as the other takes a village off a man
       who still holds it. */
    {
      const e = start([
        { Phone:'9000000021', Name:'Sai kumar', Role:'PS', Mandal:'Bachannapet', GP:'Basireddypalli', Email:'s@x', Active:'TRUE' }
      ]);
      const r = post(e, [{ mandal:'Bachannapet', gp:'Keshireddypally', name:'Sai kumar',
        phone:'9000000021', role:'Panchayat Secretary', remark:'Incharge Gp' }]);
      t.eq(r.plans[0].verdict, 'add', 'an in-charge village is an addition');
      t.eq(JSON.stringify(gpsOf(e, '9000000021').sort()), '["Basireddypalli","Keshireddypally"]',
        'HE HOLDS BOTH — his own village is not taken from him');
      t.eq(r.released, 0, 'and nothing was released');

      /* FAC reads the same way */
      const f = start([
        { Phone:'9000000022', Name:'Giri Are', Role:'PS', Mandal:'Bachannapet', GP:'Mansanpally', Email:'g@x', Active:'TRUE' }
      ]);
      const r2 = post(f, [{ mandal:'Bachannapet', gp:'Salvapur', name:'Giri Are',
        phone:'9000000022', role:'Panchayat Secretary', remark:'FAC/INCHARGE' }]);
      t.eq(r2.plans[0].verdict, 'add', 'FAC is full ADDITIONAL charge, so it adds');
      t.eq(gpsOf(f, '9000000022').length, 2, 'and he holds two');
    }

    /* ---- 4. A RELEASE IS FOUND IN THE REGISTER, NOT READ OUT OF THE REMARK ----
       The remarks are free text from eleven offices. No parser should be
       trusted to pull a place name out of one and then take it off a man. */
    {
      const e = start([
        { Phone:'9000000023', Name:'B Kumar', Role:'PS', Mandal:'Bachannapet', GP:'Mansanpally', Email:'b@x', Active:'TRUE' }
      ]);
      /* the remark names a village he does NOT hold */
      const r = post(e, [{ mandal:'Bachannapet', gp:'Salvapur', name:'B Kumar', phone:'9000000023',
        role:'Panchayat Secretary', remark:'Deputed from Somewhere Else to Salvapur' }], true);
      t.eq(r.plans[0].releases.length, 0,
        'A REMARK NAMING A PLACE HE DOES NOT HOLD RELEASES NOTHING — the register is the authority');
      t.eq(r.plans[0].verdict, 'move', 'the posting itself still stands');

      /* and where it DOES name one he holds, the sentence it was read from
         travels with the proposal, so the Collector sees the evidence */
      const f = start([
        { Phone:'9000000023', Name:'B Kumar', Role:'PS', Mandal:'Bachannapet', GP:'Mansanpally', Email:'b@x', Active:'TRUE' }
      ]);
      const r2 = post(f, [{ mandal:'Bachannapet', gp:'Salvapur', name:'B Kumar', phone:'9000000023',
        role:'Panchayat Secretary', remark:'Deputed from Mansanpally to Salvapur' }], true);
      t.eq(r2.plans[0].releases.length, 1, 'a place he DOES hold is proposed for release');
      t.contains(r2.plans[0].releases[0].why, 'Deputed from Mansanpally',
        'WITH THE SENTENCE IT WAS READ FROM, so the Collector reads the evidence and not a verdict');
    }

    /* ---- 5. ONE VILLAGE, ONE SECRETARY ----
       A man deputed in must not leave the last one still holding it — that is
       "still both villages reflect in my app" arriving from the other end. */
    {
      const e = start([
        { Phone:'9000000024', Name:'Old Holder', Role:'PS', Mandal:'Raghunathpally', GP:'Veldi', Email:'o@x', Active:'TRUE' },
        { Phone:'9000000025', Name:'Shadagonda Anil Kumar', Role:'PS', Mandal:'Raghunathpally',
          GP:'Kusumbai Thanda', Email:'a@x', Active:'TRUE' }
      ]);
      const dry = post(e, [{ mandal:'Raghunathpally', gp:'Veldi', name:'Shadagonda Anil Kumar',
        phone:'9000000025', role:'Panchayat Secretary', remark:'recently deputed to veldhi from Kusumbai Thanda 26/09/2026' }], true);
      t.contains(JSON.stringify(dry.plans[0].releases), 'Old Holder',
        'the officer holding it today is NAMED in the proposal, never quietly overwritten');

      post(e, [{ mandal:'Raghunathpally', gp:'Veldi', name:'Shadagonda Anil Kumar',
        phone:'9000000025', role:'Panchayat Secretary', remark:'recently deputed to veldhi from Kusumbai Thanda 26/09/2026' }]);
      t.eq(JSON.stringify(gpsOf(e, '9000000025')), '["Veldi"]', 'the incoming officer holds it');
      t.eq(JSON.stringify(gpsOf(e, '9000000024')), '[]', 'AND THE LAST ONE DOES NOT');
      /* RULE 7: the row stays, and so does everything pointing at it */
      const rows = e.sheets['Users'].rows.filter(r => String(r[0]).indexOf('9000000024') >= 0);
      t.eq(rows.length, 1, 'his row was not deleted');
      t.contains(JSON.stringify(e.sheets['Audit'].rows), 'POSTING RELEASED', 'and the release is on the Audit tab');
    }

    /* ---- 6. A MANDAL OFFICER HOLDS NO VILLAGE ----
       Six of the seven MPO reports were mandal moves. rollPlan_ refuses those
       on purpose; this is where they are done, deliberately and with a record. */
    {
      const e = start([
        { Phone:'9000000026', Name:'A Krishnakumari', Role:'MPO', Mandal:'Chilpur', GP:'', Email:'k@x', Active:'TRUE' }
      ]);
      const r = post(e, [{ mandal:'Bachannapet', gp:'', name:'A Krishnakumari', phone:'9000000026',
        role:'Mandal Panchayat Officer', remark:'Deputed from Chilpur Mandal to Bachananpet Mandal' }]);
      t.eq(r.plans[0].verdict, 'move', 'a mandal officer moves mandal');
      const u = e.ctx.findByPhone_('9000000026');
      t.eq(u.mandal, 'Bachannapet', 'HIS MANDAL IS THE NEW ONE');
      t.ok(u.mandals.indexOf('Chilpur') < 0, 'and not the old one');
      t.eq(JSON.stringify(u.gps), '[]', 'he holds no village, which is not missing data');

      /* a village against a mandal-level officer is refused rather than written */
      const bad = post(e, [{ mandal:'Bachannapet', gp:'Mansanpally', name:'A Krishnakumari',
        phone:'9000000026', role:'Mandal Panchayat Officer', remark:'Incharge Gp' }], true);
      t.eq(bad.plans[0].verdict, 'refused', 'a village against an MPO is refused');
      t.contains(bad.plans[0].why, 'mandal-level', 'and it says why');
    }

    /* ---- 7. NOTHING IS INVENTED ---- */
    {
      const e = start([
        { Phone:'9000000027', Name:'C Officer', Role:'PS', Mandal:'Bachannapet', GP:'Mansanpally', Email:'c@x', Active:'TRUE' }
      ]);
      const r = post(e, [
        { mandal:'Bachannapet', gp:'A Village Nobody Has Heard Of', name:'C Officer',
          phone:'9000000027', role:'Panchayat Secretary', remark:'Incharge Gp' },
        { mandal:'Palakurthi', gp:'Mansanpally', name:'C Officer',
          phone:'9000000027', role:'Panchayat Secretary', remark:'Incharge Gp' },
        { mandal:'Bachannapet', gp:'Salvapur', name:'', phone:'9000000027',
          role:'Panchayat Secretary', remark:'Incharge Gp' },
        { mandal:'Bachannapet', gp:'Salvapur', name:'C Officer', phone:'12345',
          role:'Panchayat Secretary', remark:'Incharge Gp' }
      ], true);
      t.eq(r.plans[0].verdict, 'refused', 'a village not on the GPs tab is refused, never invented');
      t.contains(r.plans[0].why, 'not on the GPs tab', 'and the roll is named as the thing to fix');
      t.eq(r.plans[1].verdict, 'refused', 'a village under another mandal is refused');
      t.contains(r.plans[1].why, 'not under', 'rather than quietly moved between mandals');
      t.eq(r.plans[2].verdict, 'refused', 'a row with no name is refused — the roll is read by people');
      t.eq(r.plans[3].verdict, 'refused', 'and a mobile number is ten digits');
      t.eq(JSON.stringify(gpsOf(e, '9000000027')), '["Mansanpally"]', 'nothing was written by any of them');

      /* AN EMPTY TABLE IS NOT AN INSTRUCTION TO CLEAR THE ROLL */
      t.eq(post(e, []).ok, false, 'an empty paste is refused');
      t.contains(post(e, []).error, 'empty table', 'in those words');
    }

    /* ---- 7b. THE MANDALS SPELL THEIR OWN NAMES THREE WAYS ----
       The district's list of 02.10.2026 carries Lingalaghanpur AND
       Lingalaghanapur, Zafferghad AND Zaffergadh, in the same file; the GPs
       tab says Bachannapeta where the list says Bachannapet. Matching on the
       mandal refused an entire mandal over a trailing letter. */
    {
      const e = start([
        { Phone:'9000000040', Name:'Farzana', Role:'PS', Mandal:'Bachannapeta', GP:'Bonakollur', Email:'f@x', Active:'TRUE' }
      ], [
        { Mandal:'Bachannapeta', GP:'Bonakollur' },
        { Mandal:'Bachannapeta', GP:'Basireddypally' },
        { Mandal:'Lingalaghanapur', GP:'Nagaram' },
        { Mandal:'Ghanpur (Stn)', GP:'Komatigudem' },
        { Mandal:'Palakurthi', GP:'Valmidi' }
      ]);
      const r = post(e, [
        { mandal:'Bachannapet', gp:'Basireddypally', name:'Farzana', phone:'9000000040',
          role:'Panchayat Secretary', remark:'Incharge Gp' },
        { mandal:'Lingalaghanpur', gp:'Nagaram', name:'Farzana', phone:'9000000040',
          role:'Panchayat Secretary', remark:'Incharge Gp' }
      ], true);
      t.eq(r.plans[0].verdict, 'add',
        'BACHANNAPET IS BACHANNAPETA — a mandal is not lost over a trailing letter');
      t.contains(r.plans[0].changes.join(' '), 'Bachannapeta',
        'and the roll’s own spelling is what is written');
      t.contains(r.plans[0].note, 'the list says', 'the difference is reported, not hidden');
      t.eq(r.plans[1].verdict, 'add', 'Lingalaghanpur is Lingalaghanapur too');

      /* BUT A DIFFERENT MANDAL IS NOT A SPELLING. Accepting the roll’s word
         would move a village between mandals on the strength of a typo, and
         Lingala Ghanpur is not Ghanpur (Stn) — the rule the filing schedule
         already carries. */
      const far = post(e, [{ mandal:'Palakurthi', gp:'Bonakollur', name:'Farzana',
        phone:'9000000040', role:'Panchayat Secretary', remark:'Incharge Gp' }], true);
      t.eq(far.plans[0].verdict, 'refused', 'a village claimed for another mandal entirely is refused');
      t.contains(far.plans[0].why, 'two different mandals', 'and it says so plainly');

      const gh = post(e, [{ mandal:'Lingalaghanpur', gp:'Komatigudem', name:'Farzana',
        phone:'9000000040', role:'Panchayat Secretary', remark:'Incharge Gp' }], true);
      t.eq(gh.plans[0].verdict, 'refused', 'LINGALA GHANPUR IS NOT GHANPUR (STN)');
    }

    /* ---- 7c. A REFUSAL THAT NAMES NOTHING IS NO USE TO THE MANDAL ----
       "Basireddypalli is not on the GPs tab" sends an officer looking for a
       village he knows exists. The roll spells it Basireddypally, and saying
       so is the difference between a refusal and an instruction. */
    {
      const e = start([
        { Phone:'9000000041', Name:'Sai kumar', Role:'PS', Mandal:'Bachannapeta', GP:'Bonakollur', Email:'s@x', Active:'TRUE' }
      ], [
        { Mandal:'Bachannapeta', GP:'Bonakollur' },
        { Mandal:'Bachannapeta', GP:'Basireddypally' },
        { Mandal:'Chilpur', GP:'Deshai Thanda' }
      ]);
      const r = post(e, [
        { mandal:'Bachannapet', gp:'Basireddypalli', name:'Sai kumar', phone:'9000000041',
          role:'Panchayat Secretary', remark:'Incharge Gp' },
        { mandal:'Bachannapet', gp:'Utterly Unlike Anything', name:'Sai kumar', phone:'9000000041',
          role:'Panchayat Secretary', remark:'Incharge Gp' }
      ], true);
      t.eq(r.plans[0].verdict, 'refused', 'a village spelt differently is still refused');
      t.contains(r.plans[0].why, 'Basireddypally',
        'BUT THE ROLL’S OWN SPELLING IS NAMED, so the mandal has something to act on');
      t.ok((r.plans[0].near || []).length > 0, 'and the candidates travel with the answer, for the table sent back');
      t.eq(r.plans[1].verdict, 'refused', 'a name unlike anything on the roll is refused');
      t.eq((r.plans[1].near || []).length, 0, 'with no suggestion invented for it');
      t.contains(r.plans[1].why, 'Put the village on the roll first', 'and the roll named as the thing to fix');

      /* IT SUGGESTS AND NEVER SUBSTITUTES: nothing is written by any of this */
      t.eq(JSON.stringify(gpsOf(e, '9000000041')), '["Bonakollur"]', 'and nothing was written');
    }

    /* ---- 8. ONE NUMBER, ONE OFFICER ---- */
    {
      const e = start([
        { Phone:'9000000028', Name:'First Name', Role:'PS', Mandal:'Bachannapet', GP:'Mansanpally', Email:'f@x', Active:'TRUE' },
        { Phone:'9000000028', Name:'Quite Another', Role:'PS', Mandal:'Bachannapet', GP:'Salvapur', Email:'q@x', Active:'TRUE' }
      ]);
      const r = post(e, [{ mandal:'Bachannapet', gp:'Basireddypalli', name:'Third Person',
        phone:'9000000028', role:'Panchayat Secretary', remark:'Incharge Gp' }], true);
      t.eq(r.plans[0].verdict, 'ambiguous',
        'one number carrying two names is reported, not resolved');
      t.contains(r.plans[0].why, 'yours to settle', 'and it is left to the Collector');
    }

    /* ---- 9. A NEW OFFICER IS REGISTERED, WITH A PIN SHOWN ONCE ----
       "recently joined as mpo Palakurthy kindly provide SJ app user id and
       password" — issue 46 of the 02.10 list. */
    {
      const e = start([]);
      const r = post(e, [{ mandal:'Palakurthi', gp:'', name:'A.V. Mallikarjun', phone:'9000000029',
        role:'Mandal Panchayat Officer', remark:'recently joined as mpo Palakurthy' }]);
      t.eq(r.plans[0].verdict, 'register', 'a number not on the roll is a registration');
      t.eq(r.registered, 1, 'and he is written');
      t.eq(r.pins.length, 1, 'with a PIN returned to the console that asked for it');
      t.ok(!!r.pins[0].pin, 'a PIN is set');
      t.ok(JSON.stringify(e.sheets['Audit'].rows).indexOf(r.pins[0].pin) < 0,
        'AND THE AUDIT TAB RECORDS THAT ONE WAS SET, NEVER THE PIN ITSELF');
      t.eq(e.ctx.findByPhone_('9000000029').role, 'MPO', 'the designation in words became the role');
      /* and the PIN he is given opens the app */
      t.eq(e.post({ kind:'login', u:'9000000029', p:r.pins[0].pin }).ok, true,
        'and it opens the app');
    }

    /* ---- 10. RULE 8 — A NERVOUS SECOND PASTE CHANGES NOTHING ---- */
    {
      const e = start([
        { Phone:'9000000030', Name:'D Officer', Role:'PS', Mandal:'Palakurthi', GP:'Valmidi', Email:'d@x', Active:'TRUE' }
      ]);
      const rows = [{ mandal:'Palakurthi', gp:'Narsingapuram Thanda', name:'D Officer',
        phone:'9000000030', role:'Panchayat Secretary', remark:'deputed from Valmidi to Narsingapuram Thanda' }];
      post(e, rows);
      const after1 = JSON.stringify(gpsOf(e, '9000000030'));
      const n1 = e.sheets['Users'].rows.length, a1 = e.sheets['Audit'].rows.length;
      const r2 = post(e, rows);
      t.eq(JSON.stringify(gpsOf(e, '9000000030')), after1, 'a second run leaves him exactly as he was');
      t.eq(e.sheets['Users'].rows.length, n1, 'and writes no new row');
      t.eq(r2.plans[0].verdict, 'unchanged', 'the proposal says so plainly');
      t.eq(e.sheets['Audit'].rows.length, a1, 'and nothing is written to the Audit tab the second time');
    }

    /* ---- 11. THE SERVER DECIDES (rule 6) ---- */
    {
      const e = start([
        { Phone:'9000000031', Name:'E Officer', Role:'PS', Mandal:'Bachannapet', GP:'Mansanpally', Email:'e@x', Active:'TRUE' }
      ]);
      const ps = e.ctx.issueToken_(e.ctx.findByPhone_('9000000031'));
      const r = e.post({ kind:'postingUpdate', token:ps, rows:[{ mandal:'Bachannapet', gp:'Salvapur',
        name:'E Officer', phone:'9000000031', role:'Panchayat Secretary', remark:'Incharge Gp' }] });
      t.eq(r.ok, false, 'a Panchayat Secretary cannot change his own posting');
      t.contains(r.error, 'Collector alone', 'and is told whose it is');
      t.eq(JSON.stringify(gpsOf(e, '9000000031')), '["Mansanpally"]', 'nothing was written');
    }

    /* ---- 11b. EVERY RELEASE IS THE COLLECTOR'S OWN TICK ----
       A remark is free text from eleven offices and will not always say what
       it means. The word "Incharge" carries one of these by itself — "App not
       showing for Marigadi (Showing Incharge village Peddathanda)" is a
       complaint, and because it says Incharge nothing is proposed for release
       from it, which is right. But that is luck as much as design, so the
       proposal is ticked off ONE RELEASE AT A TIME and anything left unticked
       is not written. The Collector reads the sentence; the parser only
       points at it. */
    {
      const e = start([
        { Phone:'9000000032', Name:'Donthi Praveen Kumar', Role:'PS', Mandal:'Bachannapet',
          GP:'Mansanpally', Email:'d@x', Active:'TRUE' }
      ]);
      const rows = [{ mandal:'Bachannapet', gp:'Salvapur', name:'Donthi Praveen Kumar',
        phone:'9000000032', role:'Panchayat Secretary',
        remark:'Deputed from Mansanpally to Salvapur' }];

      const dry = post(e, rows, true);
      t.eq(dry.plans[0].releases.length, 1, 'the village named in the remark is PROPOSED for release');
      t.ok(!!dry.plans[0].releases[0].id, 'and the proposal carries an id the console can hand back');

      /* AND A COMPLAINT THAT HAPPENS TO NAME HIS OTHER VILLAGE PROPOSES
         NOTHING, because it says Incharge — this is issue 19 of the list */
      const c = start([
        { Phone:'9000000035', Name:'Donthi Praveen Kumar', Role:'PS', Mandal:'Bachannapet',
          GP:'Mansanpally', Email:'p@x', Active:'TRUE' }
      ]);
      t.eq(post(c, [{ mandal:'Bachannapet', gp:'Salvapur', name:'Donthi Praveen Kumar',
        phone:'9000000035', role:'Panchayat Secretary',
        remark:'App not showing for Salvapur (Showing Incharge village Mansanpally)' }], true)
        .plans[0].releases.length, 0,
        'a complaint naming his in-charge village releases nothing');

      /* the Collector unticks the one that WAS proposed: he means to keep it */
      const r = e.post({ kind:'postingUpdate', token:cdm(e), rows:rows, keep:[] });
      t.eq(r.released, 0, 'AN UNTICKED RELEASE IS NOT WRITTEN');
      t.eq(JSON.stringify(gpsOf(e, '9000000032').sort()), '["Mansanpally","Salvapur"]',
        'he keeps the village he meant to keep, and gains the one he was missing');

      /* and `keep` can only ever NARROW what happens, never widen it (rule 6):
         an id the server did not propose is not a release it will perform */
      const f = start([
        { Phone:'9000000033', Name:'E Officer', Role:'PS', Mandal:'Bachannapet', GP:'Mansanpally', Email:'e@x', Active:'TRUE' },
        { Phone:'9000000034', Name:'F Officer', Role:'PS', Mandal:'Bachannapet', GP:'Salvapur', Email:'f@x', Active:'TRUE' }
      ]);
      const r2 = f.post({ kind:'postingUpdate', token:cdm(f),
        rows:[{ mandal:'Bachannapet', gp:'Basireddypalli', name:'E Officer', phone:'9000000033',
                role:'Panchayat Secretary', remark:'Incharge Gp' }],
        keep:['9000000034|3|salvapur'] });
      t.eq(r2.released, 0, 'AN ID THE SERVER NEVER PROPOSED RELEASES NOTHING');
      t.eq(JSON.stringify(gpsOf(f, '9000000034')), '["Salvapur"]',
        'the other officer keeps his village — the console can narrow, never widen');
    }

    /* ---- 12. IT IS SWACHH JANGAON'S ALONE ---- */
    {
      const g = mock.load({ now:NOW });
      g.props.TENANT = 'GP';
      g.seedUsers();
      const rep = g.ctx.featureReport_();
      t.ok(!rep.live.some(f => f.name === 'posting'), 'the Gram Palana register does not carry it');
      t.ok(rep.skipped.some(f => f.name === 'posting' && /not for this register/.test(f.why)), 'and says so');
    }
  }
};

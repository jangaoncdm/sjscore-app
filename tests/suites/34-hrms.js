/* THE DISTRICT HRMS — the leave register, and the roll it stands on.

   Ordered 05.10.2026: the whole district applies for leave, tracks it and sees
   what it has left. Two to five thousand employees across every office, a
   third Sheet behind a third /exec.

   This suite guards the two things that could do real harm:

     · THE ONLY UNAUTHENTICATED WRITE ON ANY OF THESE REGISTERS. An employee
       claims his own row before he has a token, because that is the whole
       point of it. So: the number must already be on the roll, the row must
       have no PIN, the employee id must match what the office seeded, the
       refusal must be the SAME whether the number is absent or the id is
       wrong — or the refusal reads the district's establishment back one
       guess at a time — it is rate-limited like a sign-in, and a row is
       claimed once;
     · AND IT IS A LEAVE REGISTER AND NOTHING ELSE. No attendance is asked of
       anybody, so no reminder, no show-cause notice, no debit and no lock can
       reach five thousand people who were never asked to mark in.
*/
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'the District HRMS (leave, and the roll it stands on)',
  run(t){

    const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active','Designation','EmpId'];
    const L = ['id','appliedAt','phone','name','role','mandal','type','fromDate','toDate','days',
               'reason','address','leaveHq','certificate','status','decidedBy','decidedAt','remarks','receivedAt'];
    const NOW = '2026-10-06T10:00:00+05:30';

    const start = (extra) => {
      const e = mock.load({ now:NOW });
      e.props.TENANT = 'HRMS';
      e.mkSheet('Users', U, [
        { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Mandal:'', GP:'', Email:'c@x', Active:'TRUE' }
      ].concat(extra || []));
      e.mkSheet('Leave', L, []);
      e.mkSheet('Audit', ['At','Action','Subject','Detail','By'], []);
      return e;
    };
    const cdm = e => e.ctx.issueToken_(e.ctx.findByPhone_('9000000001'));
    const seed = (e, rows, dry) => e.post({ kind:'hrmsSeed', token:cdm(e), rows:rows, dry:!!dry });
    const EMP = { name:'K. Ramesh', office:'Collectorate', desig:'Senior Assistant',
                  emp:'JN/2291', phone:'9444400001', role:'EMP' };

    /* ---- 1. IT IS THE THIRD REGISTER, AND IT KNOWS IT ---- */
    {
      const e = start();
      t.eq(e.ctx.tenant_().key, 'HRMS', 'TENANT=HRMS selects it');
      t.eq(e.ctx.tenant_().sanction, false, 'no show-cause ladder');
      t.eq(e.ctx.tenant_().evaluation, false, 'no village evaluation');
      t.eq(e.ctx.tenant_().schedule, false, 'no filing schedule');
      t.eq(e.ctx.tenant_().gpdp, false, 'no development plan');
      t.eq(e.ctx.tenant_().selfPin, true, 'and the employee sets his own PIN');

      /* NOBODY MARKS IN, so the whole morning machinery walks an empty list */
      t.eq(e.eval("attExempt_('EMP')"), true, 'an employee is not asked to mark attendance');
      t.eq(e.eval("attExempt_('HOD')"), true, 'nor the head of his office');
      t.eq(e.ctx.noticeGaps_('2026-10-06').length, 0,
        'SO THE LADDER HAS NOBODY TO WALK — no reminder, no notice, no debit, no lock');
      t.eq(e.eval("canApplyLeave_('EMP')"), true, 'and leave is what he is here for');
    }

    /* ---- 2. THE OFFICE SEEDS THE ESTABLISHMENT ---- */
    {
      const e = start();
      const dry = seed(e, [EMP], true);
      t.eq(dry.plans[0].verdict, 'register', 'a new employee is added');
      t.eq(e.sheets['Users'].rows.length, 2, 'AND THE PROPOSAL WROTE NOTHING');

      const r = seed(e, [EMP]);
      t.eq(r.added, 1, 'on Apply he is on the roll');
      const u = e.ctx.findByPhone_('9444400001');
      t.eq(u.role, 'EMP', 'as an employee');
      t.eq(u.mandal, 'Collectorate', 'of his own office');
      t.eq(u.hash, '', 'WITH NO PIN — it is his to choose, not the office’s to issue');

      /* RULE 8 */
      const n = e.sheets['Users'].rows.length;
      const again = seed(e, [EMP]);
      t.eq(e.sheets['Users'].rows.length, n, 'a second paste writes no second row');
      t.eq(again.counts.unchanged, 1, 'and says there was nothing to do');

      /* A ROW WITH AN EMPLOYEE ID NEEDS NOTHING FROM THIS REGISTER — the
         office's own id is the second factor, and minting a code beside it
         would be a second standing credential for one row. */
      t.eq(e.eval("hrmsCodeIx_(uidx_())"), -1,
        'and no enrolment code column was made for a roll that carries ids');
    }

    /* ---- 2a. AND WHERE THE OFFICE HAS NO EMPLOYEE ID TO GIVE ----

       The district's own list of officers, when it arrived on 08.10.2026,
       carried Section, Designation, Name and Mobile and no id of any kind.
       That used to be a refusal, row by row, with nothing the office could do
       about it. The second factor is not dropped — it is ISSUED. */
    {
      const e = start();
      const NOID = { name:'Y.Ravikiran', office:'Collectorate',
                     desig:'Administration Officer', emp:'', phone:'9444400009' };

      /* THE PROPOSAL WRITES NOTHING — not even the column. A dry run that
         appends a header to the live sheet has written something. */
      const dry = seed(e, [NOID], true);
      t.eq(dry.plans[0].verdict, 'register', 'he is added rather than refused');
      t.contains(JSON.stringify(dry.plans[0].changes), 'enrolment code will be issued',
        'and the proposal says a code will be issued');
      t.eq(e.eval("hrmsCodeIx_(uidx_())"), -1, 'AND THE PROPOSAL MADE NO COLUMN');
      t.eq(e.sheets['Users'].rows.length, 2, 'and wrote no row');

      const r = seed(e, [NOID]);
      t.eq(r.added, 1, 'on Apply he is on the roll');
      t.eq(r.issued.length, 1, 'with one enrolment code issued');
      const code = r.issued[0].code;
      t.eq(r.issued[0].phone, '9444400009', 'against his own number');
      t.eq(code.length, 6, 'six characters');
      t.ok(/^[ACDEFGHJKLMNPQRTUVWXYZ23469]{6}$/.test(code),
        'AND NOT ONE OF THEM IS O, I, S, B, 0, 1, 5 OR 8 — it is read off a printed sheet and typed by a man who did not write it');
      t.ok(JSON.stringify(e.sheets['Audit'].rows).indexOf(code) < 0,
        'the Audit tab records that codes were issued, NEVER one of them');
      t.contains(JSON.stringify(e.sheets['Audit'].rows), 'enrolment code(s) issued',
        'and how many');

      /* RULE 8 — a nervous second paste must not invalidate the sheet the
         office has already handed out. */
      const again = seed(e, [NOID]);
      t.eq((again.issued || []).length, 0, 'a second paste mints no second code');
      t.eq(again.counts.unchanged, 1, 'and says there was nothing to do');

      /* THE NUMBER ALONE STILL DOES NOT CLAIM THE ROW. That is the whole
         reason the code exists. */
      t.eq(e.post({ kind:'claimPin', u:'9444400009', emp:'', pin:'1234' }).ok, false,
        'the number alone does not claim it');
      t.eq(e.post({ kind:'claimPin', u:'9444400009', emp:'ZZZZZZ', pin:'1234' }).ok, false,
        'nor a wrong code');

      /* the district can read the standing code back, because an office loses
         the sheet it was printed on */
      const open = e.get('hrmsClaims', { token:cdm(e) }).open
        .filter(function(o){ return o.phone === '9444400009'; })[0];
      t.eq(open.code, code, 'the Collector can read the standing code back');

      const ok = e.post({ kind:'claimPin', u:'9444400009', emp:code, pin:'7351' });
      t.eq(ok.ok, true, 'AND THE CODE CLAIMS THE ROW');
      t.eq(e.post({ kind:'login', u:'9444400009', p:'7351' }).ok, true,
        'his own chosen PIN opens the register afterwards');
      t.contains(JSON.stringify(e.sheets['Audit'].rows), 'claimed with his enrolment code',
        'and the Audit tab says which factor he claimed with');

      /* IT IS SPENT. Left on the row it is a standing second credential for a
         row that already has a PIN, sitting on a sheet somebody photocopied. */
      const ci = e.eval("hrmsCodeIx_(uidx_())");
      const row = e.sheets['Users'].rows.filter(function(x){
        return String(x[0]).replace(/\D/g, '').slice(-10) === '9444400009'; })[0];
      t.eq(String(row[ci] || ''), '', 'AND THE CODE IS SPENT — it is a one-time token');
      t.ok(!e.get('hrmsClaims', { token:cdm(e) }).open
        .some(function(o){ return o.phone === '9444400009'; }),
        'and he is off the rollout list');
    }

    /* ---- 2b. ONE NUMBER IS ONE EMPLOYEE, INSIDE ONE PASTE TOO ----

       A paste is planned against ONE snapshot of the sheet, taken before
       anything is written. So a number appearing twice in the paste was absent
       from that snapshot both times and was registered TWICE — one number on
       two rows, which is what makes the app greet a man with somebody else's
       name, and which the claim would then settle by taking the first row it
       happened to find. The district's own list of officers has four numbers
       on two rows apiece. Caught by driving that list against this backend. */
    {
      const e = start();
      const A = { name:'Dr. S. Muralidhar Rao', office:'District Officers',
                  desig:'Dist. Minority Welfare Officer', emp:'', phone:'9444400011' };
      const B = { name:'Dr. B. Vikram Kumar', office:'District Officers',
                  desig:'Dist. SC Development Officer', emp:'', phone:'9444400011' };
      const r = seed(e, [A, B]);
      t.eq(r.counts.register, 1, 'the first of the two is registered');
      t.eq(r.counts.refused, 1, 'AND THE SECOND IS REFUSED, not written beside it');
      t.eq(e.ctx.rollRows_(e.ctx.uidx_(), e.ctx.uidx_().sh.getDataRange().getValues(), '9444400011').length, 1,
        'so the number is on exactly one row');
      const dry = seed(e, [A, B], true).plans[1];
      t.contains(dry.why, 'appears twice in what was pasted', 'and the proposal says why');
      t.contains(dry.why, 'Dr. S. Muralidhar Rao', 'naming the other man');

      /* the SAME man holding a second charge is not this: one employee is one
         leave account, and the two posts are folded before they are sent */
      const C = { name:'N. L. Narsimha Rao', office:'District Officers', emp:'',
                  desig:'Dist. BC Welfare Officer / Dist. Youth & Sports Officer', phone:'9444400012' };
      t.eq(seed(e, [C]).counts.register, 1, 'a man holding two posts is one row');
      t.eq(e.ctx.findByPhone_('9444400012').desig.indexOf('Youth') > 0, true,
        'carrying both designations');
    }

    /* ---- 3. HE CLAIMS HIS OWN ROW ---- */
    {
      const e = start();
      seed(e, [EMP]);

      /* the sign-in tells him it is his to claim, rather than to telephone about */
      const first = e.post({ kind:'login', u:'9444400001', p:'1234' });
      t.eq(first.ok, false, 'he cannot sign in yet');
      t.eq(first.needPin, true, 'AND IS TOLD THE ROW IS HIS TO CLAIM');
      t.contains(first.error, 'Choose one now', 'in those words');

      const r = e.post({ kind:'claimPin', u:'9444400001', emp:'JN/2291', pin:'8421' });
      t.eq(r.ok, true, 'the claim is taken');
      t.ok(!!r.token, 'and he is signed in at once');
      t.eq(e.post({ kind:'login', u:'9444400001', p:'8421' }).ok, true,
        'his chosen PIN opens the register afterwards');
      t.contains(JSON.stringify(e.sheets['Audit'].rows), 'HRMS ROW CLAIMED',
        'the claim is on the Audit tab');
      t.ok(JSON.stringify(e.sheets['Audit'].rows).indexOf('8421') < 0,
        'AND THE PIN IS NOT — the register records that one was set, never what it is');
    }

    /* ---- 4. AND THE CLAIM IS THE ONE THING THAT COULD DO HARM ---- */
    {
      const e = start();
      seed(e, [EMP]);

      /* A MOBILE NUMBER IS NOT A SECRET. It is written in every office
         register in the district, so the number alone cannot be enough. */
      const noEmp = e.post({ kind:'claimPin', u:'9444400001', emp:'', pin:'1111' });
      t.eq(noEmp.ok, false, 'the number alone does not claim a row');
      const wrong = e.post({ kind:'claimPin', u:'9444400001', emp:'JN/0000', pin:'1111' });
      t.eq(wrong.ok, false, 'nor a wrong employee id');

      /* THE SAME ANSWER EITHER WAY. A refusal that distinguishes "no such
         number" from "wrong id" reads the establishment back one guess at a
         time. */
      const absent = e.post({ kind:'claimPin', u:'9999999999', emp:'JN/2291', pin:'1111' });
      t.eq(absent.error, wrong.error,
        'A NUMBER NOT ON THE ROLL AND A WRONG ID ANSWER IDENTICALLY — the roll is not read back one guess at a time');

      /* it is rate-limited like a sign-in */
      for(let i = 0; i < 12; i++) e.post({ kind:'claimPin', u:'9444400001', emp:'JN/x' + i, pin:'1111' });
      const after = e.post({ kind:'claimPin', u:'9444400001', emp:'JN/2291', pin:'1111' });
      t.eq(after.ok, false, 'guessing is rate-limited');
      t.contains(after.error, 'Try again after an hour', 'in the same words a wrong PIN gets');
      t.eq(e.ctx.findByPhone_('9444400001').hash, '', 'and nothing was written by any of it');
    }

    /* ---- 5. A ROW IS CLAIMED ONCE ---- */
    {
      const e = start();
      seed(e, [EMP]);
      e.post({ kind:'claimPin', u:'9444400001', emp:'JN/2291', pin:'8421' });
      const again = e.post({ kind:'claimPin', u:'9444400001', emp:'JN/2291', pin:'9999' });
      t.eq(again.ok, false, 'a claimed row cannot be claimed again');
      t.eq(again.already, true, 'and says so plainly');
      t.contains(again.error, 'can have it reset', 'naming the cure, which is the office’s');
      t.eq(e.post({ kind:'login', u:'9444400001', p:'8421' }).ok, true,
        'HIS OWN PIN STILL OPENS IT — a second claim cannot lock him out');
      t.eq(e.post({ kind:'login', u:'9444400001', p:'9999' }).ok, false, 'and the new one does not');
    }

    /* ---- 6. LEAVE IS CODE.GS'S, AND IS NOT RE-WRITTEN HERE ---- */
    {
      const e = start();
      seed(e, [EMP]);
      e.post({ kind:'claimPin', u:'9444400001', emp:'JN/2291', pin:'8421' });
      const tok = e.post({ kind:'login', u:'9444400001', p:'8421' }).token;

      /* `from` and `to` are what saveLeave_ reads — the sheet's own columns are
         fromDate and toDate, and sending those has the core see no dates at
         all. The same shape of mistake as sending `markedAt` where attendance
         reads `ts`. */
      const ap = e.post({ kind:'leave', token:tok, leave:{ id:'LV1', type:'CL',
        from:'2026-10-12', to:'2026-10-13', days:2, reason:'personal' } });
      t.eq(ap.ok, true, 'he applies for leave');

      /* the same overlap rule the other two registers run on (rule 5) */
      const clash = e.post({ kind:'leave', token:tok, leave:{ id:'LV2', type:'CL',
        from:'2026-10-13', to:'2026-10-14', days:2, reason:'again' } });
      t.eq(clash.ok, false, 'AND AN OVERLAPPING SPELL IS REFUSED, by saveLeave_ and not by anything new here');

      const mine = e.get('hrms', { token:tok });
      t.eq(mine.ok, true, 'he reads his own register');
      t.eq(mine.rows.length, 1, 'and sees his own application');
      t.eq(mine.attendance, false, 'which carries no attendance');
      t.eq(mine.sanction, false, 'and no sanction');
      t.eq(mine.me.office, 'Collectorate', 'with his own office against his name');
    }

    /* ---- 6a. AND AN ORDER IS PASSED ON IT ----

       The whole purpose of the register, and nothing here tested it. Leave is
       Code.gs's, but WHO MAY ORDER is this tenant's, and the seam left for
       delegating to heads of office must stay shut until the Collector writes
       that order — a hierarchy nobody has written down is not a thing to guess
       at on a register that debits a man's casual leave. */
    {
      const e = start();
      seed(e, [EMP, { name:'B. Head', office:'Collectorate', desig:'Administration Officer',
                      emp:'JN/7', phone:'9444400003', role:'HOD' }]);
      e.post({ kind:'claimPin', u:'9444400001', emp:'JN/2291', pin:'8421' });
      e.post({ kind:'claimPin', u:'9444400003', emp:'JN/7', pin:'7777' });
      const emp = e.post({ kind:'login', u:'9444400001', p:'8421' }).token;
      const hod = e.post({ kind:'login', u:'9444400003', p:'7777' }).token;

      t.eq(e.post({ kind:'leave', token:emp, leave:{ id:'LV9', type:'CL',
        from:'2026-10-20', to:'2026-10-21', days:2, reason:'personal' } }).ok, true,
        'the employee applies');

      const byHod = e.post({ kind:'leaveDecision', token:hod, id:'LV9', status:'APPROVED' });
      t.eq(byHod.ok, false, 'THE HEAD OF HIS OFFICE MAY NOT ORDER IT — the seam is left, deliberately shut');
      t.contains(byHod.error, 'Collector alone', 'and says who may');
      t.eq(e.post({ kind:'leaveDecision', token:emp, id:'LV9', status:'APPROVED' }).ok, false,
        'nor can he sanction his own');

      /* AND HE READS THE WAITING LIST WITHOUT WALKING THE WHOLE REGISTER.
         The console's own payload reads the Leave tab whole, which is right
         at 284 officers and is not at five thousand. */
      const wait = e.get('hrmsPending', { token:cdm(e) });
      t.eq(wait.ok, true, 'the Collector reads what is awaiting his orders');
      t.eq(wait.rows.length, 1, 'one application is waiting');
      t.eq(wait.rows[0].office, 'Collectorate',
        'with the office against his name, so an order is passed on a person and not on a number');
      t.eq(e.get('hrmsPending', { token:emp }).ok, false, 'an employee cannot read it');
      t.eq(e.get('hrmsPending', { token:hod }).ok, false, 'nor the head of his office');

      const r = e.post({ kind:'leaveDecision', token:cdm(e), id:'LV9', status:'APPROVED' });
      t.eq(r.ok, true, 'the Collector orders it');
      t.eq(e.get('hrms', { token:emp }).rows[0].status, 'APPROVED', 'and the employee sees it on his own screen');

      /* and the console moves it out of the waiting list by itself */
      const d = e.get('dashboard', { token:cdm(e) });
      t.eq(d.leave.pending.length, 0, 'it is no longer awaiting orders');
      t.eq(d.leave.recent.length, 1, 'and is on the recent list');
      /* RULE 4 — what the console holds is the whole district's, so anything
         per-employee filters by phone */
      t.eq(d.leave.recent[0].phone === '9444400001' || d.leave.recent[0].name === 'K. Ramesh', true,
        'against the employee who applied');
      t.eq(e.get('hrmsPending', { token:cdm(e) }).rows.length, 0,
        'and it has left the waiting list by itself — nothing stores whether it was decided');
    }

    /* ---- 7. THE DISTRICT SEES WHO HAS NOT CLAIMED YET ---- */
    {
      const e = start();
      seed(e, [EMP, { name:'B. Waiting', office:'DPO', desig:'Typist', emp:'JN/7', phone:'9444400003' }]);
      e.post({ kind:'claimPin', u:'9444400001', emp:'JN/2291', pin:'8421' });
      const c = e.get('hrmsClaims', { token:cdm(e) });
      t.eq(c.claimed, 1, 'one has claimed');
      t.eq(c.waiting, 1, 'one has not');
      t.contains(JSON.stringify(c.open), 'B. Waiting', 'and the rollout list names him');

      const tok = e.post({ kind:'login', u:'9444400001', p:'8421' }).token;
      t.eq(e.get('hrmsClaims', { token:tok }).ok, false,
        'an employee cannot read the district’s rollout list');
      t.eq(e.post({ kind:'hrmsSeed', token:tok, rows:[EMP] }).ok, false,
        'nor seed the establishment');
    }

    /* ---- 8. IT IS THE HRMS REGISTER'S ALONE ---- */
    {
      const sj = mock.load({ now:NOW });
      sj.seedUsers();
      const rep = sj.ctx.featureReport_();
      t.ok(!rep.live.some(f => f.name === 'hrms'), 'the sanitation register does not carry it');
      t.ok(rep.skipped.some(f => f.name === 'hrms' && /not for this register/.test(f.why)), 'and says so');
      t.eq(sj.post({ kind:'claimPin', u:'9000000014', emp:'x', pin:'1234' }).ok, false,
        'AND A ROW THERE CANNOT BE CLAIMED — those PINs are the Collector’s to issue');
    }
  }
};

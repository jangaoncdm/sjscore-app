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

      /* an employee id is what he claims with, so it is required */
      const noId = seed(e, [{ name:'X', office:'Y', desig:'Z', emp:'', phone:'9444400002' }], true);
      t.eq(noId.plans[0].verdict, 'refused', 'a row with no employee id is refused');
      t.contains(noId.plans[0].why, 'claims his row with', 'and it says why');
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

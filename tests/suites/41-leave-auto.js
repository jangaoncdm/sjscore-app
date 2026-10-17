/* SANCTIONED BY RULE — ordered 17.10.2026.

   "In the leave section auto approve if it is in the limit of user — it goes
   to the Collector, but auto approved. All leaves starting today, within
   rule." On the sanitation and Gram Palana registers an application that
   passes every check the sanction already runs, and begins today or later,
   is APPROVED the moment it is written, with the rule named as the hand.

   What this suite guards, because each is where the change could accuse
   or excuse somebody:
     · the rule never reaches BACK — leave for days already gone waits for
       the Collector, or an officer with unmarked mornings could turn them
       into leave by himself and cure his own notice;
     · what fails a check is HELD for him with the reason, never refused and
       never sanctioned, because exceeding the year means loss of pay;
     · a corrected copy he sent back comes back to him;
     · the District HRMS is NOT in the order (08.10.2026 stands there);
     · LEAVE_AUTO_OFF stands it down with no deploy;
     · the Collector can SET ASIDE a sanction, by rule or his own, with
       remarks; the row stays, the days return, the day stops answering for
       him, and Audit carries what it was;
     · and a retry cannot pass the order twice. */
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'leave sanctioned by rule (17.10.2026)',
  run(t){
    const NOW = '2026-10-17T10:00:00+05:30';            /* a Saturday, not the second */
    const fresh = () => { const e = mock.load({ now: NOW }); e.seedUsers(); return e; };
    const tok = (e, ph) => e.ctx.issueToken_(e.ctx.findByPhone_(ph));
    const lvRow = (e, id) => {
      const head = e.sheets['Leave'].rows[0].map(String);
      const r = e.sheets['Leave'].rows.find(x => String(x[0]) === id);
      return r ? Object.fromEntries(head.map((h, i) => [h, r[i]])) : null;
    };

    /* ---- 1. WITHIN THE RULES, BEGINNING TOMORROW: SANCTIONED AT ONCE ---- */
    {
      const e = fresh(), c = e.ctx, a = tok(e, '9000000011');       /* MPO, may apply; 6 CL for 2026 */
      t.eq(c.tenant_().autoLeave, true, 'the sanitation register carries the order');
      t.eq(c.leaveAutoRule_().on, true, 'and the rule is in force');
      const r = e.post({ kind:'leave', token:a, leave:{ id:'A1', type:'CL', from:'2026-10-20', to:'2026-10-21', days:2, reason:'family' } });
      t.eq(r.ok, true, 'the application is taken');
      t.eq(r.status, 'APPROVED', 'and sanctioned on the spot');
      t.eq(r.auto, true, 'the answer says the rule passed it');
      t.eq(r.decidedBy, c.LEAVE_RULE_BY || 'By rule · within entitlement', 'the hand on it is the rule, by name');
      t.contains(r.remarks, 'CL 2 of 6 for 2026', 'and the row carries the arithmetic that passed it');
      t.contains(r.remarks, 'set it aside', 'and says the Collector may set it aside');
      const row = lvRow(e, 'A1');
      t.eq(String(row.status), 'APPROVED', 'written APPROVED on the register');
      t.contains(String(row.decidedBy), 'By rule', 'with the rule as decidedBy');
      t.ok(!!c.sanctionedSet_('2026-10-20')['9000000011'], 'a sanction by rule covers the day — silence on it is leave (rule 9)');
      t.eq(c.clUsed_('9000000011', 2026), 2, 'and debits the year like any sanction');

      /* a retry of the same id is a retry: one row, one order */
      const again = e.post({ kind:'leave', token:a, leave:{ id:'A1', type:'CL', from:'2026-10-20', to:'2026-10-21', days:2 } });
      t.eq(again.ok, true, 'the same id resent is fine');
      t.eq(again.closed, true, 'and is told the application is closed');
      t.eq(e.sheets['Leave'].rows.filter(x => String(x[0]) === 'A1').length, 1, 'one row, not two');
      t.eq(c.clUsed_('9000000011', 2026), 2, 'and the year is debited once');

      /* the officer reads the order on his own file; the console reads it under Sanctioned */
      const mine = e.get('leave', { token:a });
      t.eq(mine.rows[0].status, 'APPROVED', 'his file shows it sanctioned');
      t.contains(mine.rows[0].decidedBy, 'By rule', 'by rule');
      const cdm = tok(e, '9000000001');
      const dash = e.get('dashboard', { token:cdm });
      t.eq(dash.leave.pending.filter(l => l.id === 'A1').length, 0, 'it is not in Awaiting your orders');
      const rec = dash.leave.recent.find(l => l.id === 'A1');
      t.ok(!!rec, 'it is in Recent orders');
      t.contains(rec.decidedBy, 'By rule', 'and the console is told which hand passed it');
      t.eq(e.get('diag', {}).autoLeave, true, 'diag says the rule is in force');
    }

    /* ---- 2. "STARTING TODAY": TODAY SANCTIONS, YESTERDAY WAITS ---- */
    {
      const e = fresh(), a = tok(e, '9000000011');
      const today = e.post({ kind:'leave', token:a, leave:{ id:'T1', type:'CL', from:'2026-10-17', to:'2026-10-17', days:1 } });
      t.eq(today.status, 'APPROVED', 'leave beginning today is sanctioned by rule — the order’s own words');
      const past = e.post({ kind:'leave', token:a, leave:{ id:'T2', type:'CL', from:'2026-10-15', to:'2026-10-16', days:2 } });
      t.eq(past.ok, true, 'leave for days already gone is still taken');
      t.eq(past.status, 'PENDING', 'but waits for the Collector');
      t.eq(past.held, undefined, 'not as a failed check: the rule simply does not reach back');
      t.ok(!e.ctx.sanctionedSet_('2026-10-16')['9000000011'], 'and yesterday is not covered by it — an unmarked morning cannot be cured by the officer himself');
      /* straddling: begins in the past, ends tomorrow — begins in the past */
      const straddle = e.post({ kind:'leave', token:a, leave:{ id:'T3', type:'EL', from:'2026-10-14', to:'2026-10-14', days:1 } });
      t.eq(straddle.status, 'PENDING', 'a spell that began before today waits too');
      const cdm = tok(e, '9000000001');
      const dash = e.get('dashboard', { token:cdm });
      t.eq(dash.leave.pending.filter(l => l.id === 'T2' || l.id === 'T3').length, 2, 'both stand in Awaiting your orders');
      t.eq(e.post({ kind:'leaveDecision', token:cdm, id:'T2', status:'APPROVED' }).ok, true, 'and he sanctions one as before');
    }

    /* ---- 3. WHAT FAILS A CHECK IS HELD, WITH THE REASON ---- */
    {
      const e = fresh(), c = e.ctx, a = tok(e, '9000000011');
      e.post({ kind:'leave', token:a, leave:{ id:'H0', type:'CL', from:'2026-10-20', to:'2026-10-23', days:4 } });
      t.eq(c.clUsed_('9000000011', 2026), 4, 'four of six casual days sanctioned by rule');
      const over = e.post({ kind:'leave', token:a, leave:{ id:'H1', type:'CL', from:'2026-11-02', to:'2026-11-04', days:3 } });
      t.eq(over.ok, true, 'the seventh day is applied for');
      t.eq(over.status, 'PENDING', 'and is HELD for the Collector, not sanctioned and not refused');
      t.contains(over.held, 'exceed', 'with the arithmetic');
      t.contains(over.held, '4 already sanctioned', 'naming what already stands');
      t.eq(String(lvRow(e, 'H1').status), 'PENDING', 'written PENDING on the register');
      t.eq(String(lvRow(e, 'H1').decidedBy || ''), '', 'with no hand on it');
      t.eq(c.clUsed_('9000000011', 2026), 4, 'and nothing debited for it');
      /* the Collector's own order on it answers its own checks, as before */
      const cdm = tok(e, '9000000001');
      const his = e.post({ kind:'leaveDecision', token:cdm, id:'H1', status:'APPROVED' });
      t.eq(his.ok, false, 'he cannot sanction it over the year either');
      t.eq(e.post({ kind:'leaveDecision', token:cdm, id:'H1', status:'REJECTED', remarks:'Balance exhausted.' }).ok, true, 'he refuses it in words');
      /* the optional-holiday cap and the medical spell are the same checks */
      const b = tok(e, '9000000012');
      const oh = e.post({ kind:'leave', token:b, leave:{ id:'O1', type:'OH', from:'2026-10-19', to:'2026-10-19', days:1 } });
      t.eq(oh.status, 'APPROVED', 'an optional holiday within the three is sanctioned by rule');
      const ml = e.post({ kind:'leave', token:b, leave:{ id:'M1', type:'ML', from:'2026-11-09', to:'2026-11-23', days:15, cert:'Govt. Hospital, Jangaon' } });
      t.eq(ml.status, 'APPROVED', 'fifteen days of medical leave is sanctioned by rule');
      t.contains(ml.remarks, '15-day spell', 'naming the spell cap as the rule it kept');
      const mlOver = e.post({ kind:'leave', token:b, leave:{ id:'M2', type:'ML', from:'2026-12-01', to:'2026-12-16', days:16 } });
      t.eq(mlOver.ok, false, 'sixteen is refused at the door as it always was — nothing for the rule to pass');
    }

    /* ---- 4. A CORRECTED COPY HE SENT BACK COMES BACK TO HIM ---- */
    {
      const e = fresh(), a = tok(e, '9000000011'), cdm = tok(e, '9000000001');
      e.post({ kind:'leave', token:a, leave:{ id:'R1', type:'EL', from:'2026-10-12', to:'2026-10-13', days:2 } });   /* past: waits */
      t.eq(e.post({ kind:'leaveDecision', token:cdm, id:'R1', status:'RETURNED', remarks:'Give the dates of the tour.' }).ok, true, 'he sends it back');
      const fix = e.post({ kind:'leave', token:a, leave:{ id:'R1', type:'EL', from:'2026-10-26', to:'2026-10-27', days:2, reason:'tour, 26-27 Oct' } });
      t.eq(fix.ok, true, 'the corrected copy goes in');
      t.eq(fix.status, 'PENDING', 'and waits for him although it is now within the rules and in the future — he engaged with it');
    }

    /* ---- 5. THE SWITCH, AND THE REGISTERS THE ORDER DOES NOT NAME ---- */
    {
      const e = fresh(), a = tok(e, '9000000011');
      e.props.LEAVE_AUTO_OFF = '1';
      t.eq(e.ctx.leaveAutoRule_().on, false, 'LEAVE_AUTO_OFF stands the rule down');
      const r = e.post({ kind:'leave', token:a, leave:{ id:'S1', type:'CL', from:'2026-10-20', to:'2026-10-20', days:1 } });
      t.eq(r.status, 'PENDING', 'and every application waits for the Collector again, with no deploy');
      t.eq(e.get('diag', {}).autoLeave, false, 'diag says so');
    }
    {
      const e = mock.load({ now: NOW }); e.props.TENANT = 'GP';
      t.eq(e.ctx.tenant_().key, 'GP', 'the Gram Palana register');
      t.eq(e.ctx.tenant_().autoLeave, true, 'is in the order');
    }
    {
      const e = mock.load({ now: NOW }); e.props.TENANT = 'HRMS';
      t.eq(e.ctx.tenant_().key, 'HRMS', 'the District HRMS');
      t.eq(e.ctx.tenant_().autoLeave, false, 'is NOT in the order — every application comes to the Collector (08.10.2026)');
      t.eq(e.ctx.leaveAutoRule_().on, false, 'and the rule is off there whatever the property says');
    }

    /* ---- 6. THE COLLECTOR SETS A SANCTION ASIDE ---- */
    {
      const e = fresh(), c = e.ctx, a = tok(e, '9000000011'), b = tok(e, '9000000012'), cdm = tok(e, '9000000001');
      e.mkSheet('Audit', ['at','action','subject','detail','by'], []);
      const r = e.post({ kind:'leave', token:a, leave:{ id:'X1', type:'CL', from:'2026-10-20', to:'2026-10-21', days:2 } });
      t.eq(r.status, 'APPROVED', 'sanctioned by rule');
      /* words are required, and only his hand can do it */
      const mute = e.post({ kind:'leaveDecision', token:cdm, id:'X1', status:'CANCELLED' });
      t.eq(mute.ok, false, 'setting aside without remarks is refused');
      t.contains(mute.error, 'why', 'and told to say why');
      const notHis = e.post({ kind:'leaveDecision', token:b, id:'X1', status:'CANCELLED', remarks:'no' });
      t.eq(notHis.ok, false, 'an MPDO cannot set a sanction aside');
      t.eq(String(lvRow(e, 'X1').status), 'APPROVED', 'and it still stands');
      /* the officer's own withdrawal path is untouched */
      t.eq(e.post({ kind:'leaveWithdraw', token:a, id:'X1' }).status, 'CANCELLED', 'the applicant can still give back a spell not yet begun');
      /* set aside proper, on a spell he cannot withdraw himself (it has begun) */
      const r2 = e.post({ kind:'leave', token:a, leave:{ id:'X2', type:'CL', from:'2026-10-17', to:'2026-10-19', days:3 } });
      t.eq(r2.status, 'APPROVED', 'a spell beginning today is sanctioned by rule');
      t.eq(e.post({ kind:'leaveWithdraw', token:a, id:'X2' }).ok, false, 'and the officer cannot withdraw it once begun');
      t.eq(c.clUsed_('9000000011', 2026), 3, 'three days stand debited');
      const aside = e.post({ kind:'leaveDecision', token:cdm, id:'X2', status:'CANCELLED', remarks:'Required at the review on the 19th.' });
      t.eq(aside.ok, true, 'the Collector sets it aside with his reasons');
      t.eq(aside.status, 'CANCELLED', 'and the application is CANCELLED');
      t.contains(aside.decidedBy, 'set aside', 'under his hand, named as a setting aside');
      const row = lvRow(e, 'X2');
      t.eq(String(row.status), 'CANCELLED', 'the row stays and turns CANCELLED — nothing struck off (rule 7)');
      t.contains(String(row.remarks), 'Required at the review', 'his reasons travel with it');
      t.contains(String(row.remarks), 'By rule', 'and the row keeps what it was: sanctioned by rule');
      t.eq(c.clUsed_('9000000011', 2026), 0, 'the days return to the year');
      t.ok(!c.sanctionedSet_('2026-10-19')['9000000011'], 'and the day no longer answers for him — attendance is due again');
      const au_ = () => e.sheets['Audit'].rows.slice(1).map(x => x.map(String)); const au = au_();
      t.eq(au.filter(x => x[1] === 'leaveSetAside' && x[2] === 'X2').length, 1, 'Audit carries the setting aside');
      t.contains(au.find(x => x[1] === 'leaveSetAside')[3], 'By rule', 'with the order it set aside');
      /* idempotent: a second setting aside finds nothing standing */
      const twice = e.post({ kind:'leaveDecision', token:cdm, id:'X2', status:'CANCELLED', remarks:'again' });
      t.eq(twice.ok, false, 'a second setting aside is refused');
      t.contains(twice.error, 'already been passed', 'as orders already passed');
      t.eq(au_().filter(x => x[1] === 'leaveSetAside').length, 1, 'and writes no second Audit line');
      /* his own sanction can be set aside the same way */
      e.post({ kind:'leave', token:a, leave:{ id:'X3', type:'CL', from:'2026-10-10', to:'2026-10-10', days:1 } });   /* past: his hand */
      t.eq(e.post({ kind:'leaveDecision', token:cdm, id:'X3', status:'APPROVED' }).ok, true, 'he sanctions a past spell');
      const aside3 = e.post({ kind:'leaveDecision', token:cdm, id:'X3', status:'CANCELLED', remarks:'Marked present that day after all.' });
      t.eq(aside3.ok, true, 'and may set his own sanction aside too');
      t.contains(String(lvRow(e, 'X3').remarks), 'COLLECTOR', 'the row names whose sanction it was');
      /* the officer's file shows it, in words, with the hand */
      const mine = e.get('leave', { token:a });
      const x2 = mine.rows.find(l => l.id === 'X2');
      t.eq(x2.status, 'CANCELLED', 'his file shows the spell set aside');
      t.contains(x2.decidedBy, 'set aside', 'and by whom');
      /* and the whole thing is as readable from the console */
      const dash = e.get('dashboard', { token:cdm });
      t.contains((dash.leave.recent.find(l => l.id === 'X2') || {}).decidedBy, 'set aside', 'the console reads the setting aside');
    }
  }
};

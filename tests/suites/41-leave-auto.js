/* LEAVE UNDER THE STANDING ORDER — ordered 17.10.2026.

   "In the leave section auto approve if it is in the limit of user — it goes
   to the Collector, but auto approved. All leaves starting today, within
   rule." And the same afternoon: "do not write sanctioned by rule or
   whatever — let them feel it like the process before, and approve after
   five minutes of the request; do not give any additional info."

   So an application WAITS, exactly as it always did, and five minutes after
   the district received it the register passes the order itself, in the
   Collector's own name, with no remarks. What this suite guards, because
   each is where the change could accuse or excuse somebody:
     · nothing is passed at application time, and nothing before five
       minutes — the officer's answer and his file say PENDING;
     · the hand is the Collector's, the remarks are blank, and no word of a
       rule reaches the phone; the register and Audit still say whose order
       it was (standingOrder PASSED, a leaveStandingOrder line);
     · the pass never reaches BACK — leave for days already gone waits for
       the Collector, or an officer with unmarked mornings could turn them
       into leave by himself and cure his own notice;
     · what fails a check is LEFT WAITING, silently, never refused;
     · a corrected copy he sent back comes back to him (HOLD);
     · the District HRMS is NOT in the order; LEAVE_AUTO_OFF stands it down;
     · the trigger is installed where the order applies, idempotently, and
       the lazy pass at op=leave and the console payload is the same pass;
     · the Collector can CANCEL a sanction, with remarks; the row stays, the
       days return, the day stops answering for him;
     · a retry cannot pass the order twice, and a twin already decided is
       left to settleLeaveTwins. */
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'leave under the standing order (17.10.2026)',
  run(t){
    const NOW = '2026-10-17T10:00:00+05:30';            /* a Saturday, not the second */
    const fresh = (opts) => {
      const e = mock.load(Object.assign({ now: NOW }, opts || {}));
      if(!(opts && opts.noSeed)) e.seedUsers();
      e.at = Date.parse(NOW);
      return e;
    };
    const tick = (e, min) => { e.at += min * 60000; e.setNow(new Date(e.at).toISOString()); };
    const clearCache = e => { Object.keys(e.cacheStore || {}).forEach(k => { delete e.cacheStore[k]; }); };
    const tok = (e, ph) => e.ctx.issueToken_(e.ctx.findByPhone_(ph));
    const lvRow = (e, id) => {
      const head = e.sheets['Leave'].rows[0].map(String);
      const r = e.sheets['Leave'].rows.find(x => String(x[0]) === id);
      return r ? Object.fromEntries(head.map((h, i) => [h, r[i]])) : null;
    };
    const RULEWORDS = /by rule|standing order|entitlement|"auto"/i;

    /* ---- 1. IT WAITS, AND FIVE MINUTES LATER IT IS SANCTIONED IN HIS NAME ---- */
    {
      const e = fresh(), c = e.ctx, a = tok(e, '9000000011');       /* MPO, may apply; 6 CL for 2026 */
      e.mkSheet('Audit', ['at','action','subject','detail','by'], []);
      t.eq(c.tenant_().autoLeave, true, 'the sanitation register carries the order');
      t.eq(c.leaveAutoRule_().on, true, 'and it is in force');
      t.eq(c.LEAVE_AUTO_AFTER_MIN, 5, 'five minutes after receipt');
      const r = e.post({ kind:'leave', token:a, leave:{ id:'A1', type:'CL', from:'2026-10-20', to:'2026-10-21', days:2, reason:'family' } });
      t.eq(r.ok, true, 'the application is taken');
      t.eq(r.status, 'PENDING', 'and WAITS, as it always did');
      t.eq(r.auto, undefined, 'the answer says nothing about a rule');
      t.eq(r.held, undefined, 'nor about a hold');
      t.eq(String(lvRow(e, 'A1').status), 'PENDING', 'written PENDING on the register');
      t.eq(String(lvRow(e, 'A1').standingOrder || ''), '', 'a fresh application carries no mark in standingOrder');
      /* nothing before five minutes, by whichever door */
      t.eq(e.get('leave', { token:a }).rows[0].status, 'PENDING', 'his file shows it waiting at once');
      tick(e, 4);
      const early = c.leaveStandingOrders();
      t.eq(early.on, true, 'the trigger runs');
      t.eq(early.passed, 0, 'and passes nothing at four minutes');
      t.eq(String(lvRow(e, 'A1').status), 'PENDING', 'still waiting');
      /* five minutes on: the phone asks for its file and reads the order */
      tick(e, 1.5); clearCache(e);
      const mine = e.get('leave', { token:a });
      t.eq(mine.rows[0].id, 'A1', 'his file');
      t.eq(mine.rows[0].status, 'APPROVED', 'shows it SANCTIONED — the lazy pass at op=leave');
      t.eq(mine.rows[0].decidedBy, 'Sandeep Kumar Jha (COLLECTOR)', 'under the Collector’s own name, as his hand reads');
      t.eq(mine.rows[0].remarks, '', 'with no remarks');
      t.ok(!RULEWORDS.test(JSON.stringify(mine)), 'and not one word of a rule or a standing order on the phone', JSON.stringify(mine).slice(0, 200));
      t.eq(JSON.stringify(mine).indexOf('standingOrder'), -1, 'the record column does not travel to the phone');
      const row = lvRow(e, 'A1');
      t.eq(String(row.status), 'APPROVED', 'written APPROVED on the register');
      t.eq(String(row.standingOrder), 'PASSED', 'and the register says it was the standing order');
      t.ok(!!c.sanctionedSet_('2026-10-20')['9000000011'], 'the sanction covers the day — silence on it is leave (rule 9)');
      t.eq(c.clUsed_('9000000011', 2026), 2, 'and debits the year like any sanction');
      const au = e.sheets['Audit'].rows.slice(1).map(x => x.map(String));
      t.eq(au.filter(x => x[1] === 'leaveStandingOrder' && x[2] === 'A1').length, 1, 'Audit carries one line for it');
      t.contains(au.find(x => x[1] === 'leaveStandingOrder')[3], '5 minutes after receipt', 'saying when and why');
      /* a retry of the same id is a retry: one row, one order */
      const again = e.post({ kind:'leave', token:a, leave:{ id:'A1', type:'CL', from:'2026-10-20', to:'2026-10-21', days:2 } });
      t.eq(again.closed, true, 'the same id resent is told the application is closed');
      t.eq(e.sheets['Leave'].rows.filter(x => String(x[0]) === 'A1').length, 1, 'one row, not two');
      /* the pass finds nothing more to do */
      clearCache(e);
      t.eq(c.leaveStandingOrders().passed, 0, 'a second run passes nothing (rule 8)');
      t.eq(e.sheets['Audit'].rows.slice(1).filter(x => String(x[1]) === 'leaveStandingOrder').length, 1, 'and writes no second Audit line');
      /* the console reads it under Sanctioned, like any order */
      const cdm = tok(e, '9000000001');
      clearCache(e);
      const dash = e.get('dashboard', { token:cdm });
      t.eq(dash.leave.pending.filter(l => l.id === 'A1').length, 0, 'it is not in Awaiting your orders');
      const rec = dash.leave.recent.find(l => l.id === 'A1');
      t.ok(!!rec && rec.status === 'APPROVED', 'it is in Recent orders, sanctioned');
      t.eq((rec || {}).decidedBy, 'Sandeep Kumar Jha (COLLECTOR)', 'under his name');
      const dg = e.get('diag', {});
      t.eq(dg.autoLeave, true, 'diag says the order is in force');
      t.eq(dg.autoLeaveAfterMin, 5, 'and after how long');
    }

    /* ---- 2. "STARTING TODAY": TODAY PASSES, YESTERDAY WAITS ---- */
    {
      const e = fresh(), c = e.ctx, a = tok(e, '9000000011'), cdm = tok(e, '9000000001');
      e.post({ kind:'leave', token:a, leave:{ id:'T1', type:'CL', from:'2026-10-17', to:'2026-10-17', days:1 } });
      e.post({ kind:'leave', token:a, leave:{ id:'T2', type:'EL', from:'2026-10-15', to:'2026-10-16', days:2 } });
      e.post({ kind:'leave', token:a, leave:{ id:'T3', type:'EL', from:'2026-10-14', to:'2026-10-14', days:1 } });
      tick(e, 6);
      const r = c.leaveStandingOrders();
      t.eq(r.passed, 1, 'one of the three is passed');
      t.eq(String(lvRow(e, 'T1').status), 'APPROVED', 'leave beginning today — the order’s own words');
      t.eq(String(lvRow(e, 'T2').status), 'PENDING', 'leave for days already gone waits for the Collector');
      t.eq(String(lvRow(e, 'T3').status), 'PENDING', 'so does a spell that began before today');
      t.ok(!c.sanctionedSet_('2026-10-16')['9000000011'], 'yesterday is not covered — an unmarked morning cannot be cured by the officer himself');
      clearCache(e);
      const dash = e.get('dashboard', { token:cdm });
      t.eq(dash.leave.pending.filter(l => l.id === 'T2' || l.id === 'T3').length, 2, 'both stand in Awaiting your orders');
      t.eq(e.post({ kind:'leaveDecision', token:cdm, id:'T2', status:'APPROVED' }).ok, true, 'and he sanctions one as before');
      /* "today" is the day the district RECEIVED it: an application made at
         23:58 for that day is not turned into yesterday's by the clock */
      const e2 = fresh(), a2 = tok(e2, '9000000012');
      e2.at = Date.parse('2026-10-17T23:58:00+05:30'); e2.setNow(new Date(e2.at).toISOString());
      e2.post({ kind:'leave', token:a2, leave:{ id:'N1', type:'CL', from:'2026-10-17', to:'2026-10-17', days:1 } });
      tick(e2, 6);
      t.eq(e2.ctx.leaveStandingOrders().passed, 1, 'received before midnight, passed after it: still today’s');
    }

    /* ---- 3. WHAT FAILS A CHECK IS LEFT WAITING, IN SILENCE ---- */
    {
      const e = fresh(), c = e.ctx, a = tok(e, '9000000011'), cdm = tok(e, '9000000001');
      e.post({ kind:'leave', token:a, leave:{ id:'H0', type:'CL', from:'2026-10-20', to:'2026-10-23', days:4 } });
      tick(e, 6); c.leaveStandingOrders();
      t.eq(c.clUsed_('9000000011', 2026), 4, 'four of six casual days sanctioned');
      const over = e.post({ kind:'leave', token:a, leave:{ id:'H1', type:'CL', from:'2026-11-02', to:'2026-11-04', days:3 } });
      t.eq(over.ok, true, 'the seventh day is applied for');
      t.eq(over.status, 'PENDING', 'and waits');
      tick(e, 6);
      const r = c.leaveStandingOrders();
      t.eq(r.passed, 0, 'the pass does not sanction it');
      t.eq(r.left, 1, 'and counts it as left for the Collector');
      const row = lvRow(e, 'H1');
      t.eq(String(row.status), 'PENDING', 'written PENDING — not refused');
      t.eq(String(row.decidedBy || ''), '', 'with no hand on it');
      t.eq(String(row.remarks || ''), '', 'and no reason written where the officer would read it');
      t.eq(c.clUsed_('9000000011', 2026), 4, 'nothing debited for it');
      t.eq(e.post({ kind:'leaveDecision', token:cdm, id:'H1', status:'APPROVED' }).ok, false, 'he cannot sanction it over the year either');
      t.eq(e.post({ kind:'leaveDecision', token:cdm, id:'H1', status:'REJECTED', remarks:'Balance exhausted.' }).ok, true, 'he refuses it in words');
      /* the optional-holiday cap and the medical spell are the same checks */
      const b = tok(e, '9000000012');
      ['2026-10-19', '2026-10-26', '2026-11-08', '2026-12-24'].forEach((d, i) =>
        e.post({ kind:'leave', token:b, leave:{ id:'O' + i, type:'OH', from:d, to:d, days:1 } }));
      e.post({ kind:'leave', token:b, leave:{ id:'M1', type:'ML', from:'2026-11-09', to:'2026-11-23', days:15, cert:'Govt. Hospital, Jangaon' } });
      t.eq(e.post({ kind:'leave', token:b, leave:{ id:'M2', type:'ML', from:'2026-12-01', to:'2026-12-16', days:16 } }).ok, false,
        'sixteen days of medical leave is refused at the door as it always was');
      tick(e, 6);
      const r2 = c.leaveStandingOrders();
      t.eq(['O0','O1','O2'].map(id => String(lvRow(e, id).status)).join(','), 'APPROVED,APPROVED,APPROVED', 'three optional holidays pass');
      t.eq(String(lvRow(e, 'O3').status), 'PENDING', 'the fourth of 2026 waits for the Collector');
      t.eq(String(lvRow(e, 'M1').status), 'APPROVED', 'fifteen days of medical leave pass — no balance stands in the way');
      t.eq(String(lvRow(e, 'M1').remarks || ''), '', 'with no remarks');
      t.eq(r2.left, 1, 'one left for him: the fourth optional holiday (the seventh casual day he has already refused)');
    }

    /* ---- 4. A CORRECTED COPY HE SENT BACK COMES BACK TO HIM ---- */
    {
      const e = fresh(), c = e.ctx, a = tok(e, '9000000011'), cdm = tok(e, '9000000001');
      e.post({ kind:'leave', token:a, leave:{ id:'R1', type:'EL', from:'2026-10-26', to:'2026-10-27', days:2 } });
      t.eq(e.post({ kind:'leaveDecision', token:cdm, id:'R1', status:'RETURNED', remarks:'Give the dates of the tour.' }).ok, true, 'he sends it back within the five minutes');
      const fix = e.post({ kind:'leave', token:a, leave:{ id:'R1', type:'EL', from:'2026-10-26', to:'2026-10-27', days:2, reason:'tour, 26-27 Oct' } });
      t.eq(fix.status, 'PENDING', 'the corrected copy goes in and waits');
      t.eq(String(lvRow(e, 'R1').standingOrder), 'HOLD', 'marked for his hand');
      tick(e, 10);
      t.eq(c.leaveStandingOrders().passed, 0, 'and the pass leaves it to him although it is within the rules and in the future — he engaged with it');
      t.eq(String(lvRow(e, 'R1').status), 'PENDING', 'still waiting');
      t.eq(e.post({ kind:'leaveDecision', token:cdm, id:'R1', status:'APPROVED' }).ok, true, 'he sanctions it himself');
    }

    /* ---- 5. THE SWITCH, AND THE REGISTERS THE ORDER DOES NOT NAME ---- */
    {
      const e = fresh(), c = e.ctx, a = tok(e, '9000000011');
      e.props.LEAVE_AUTO_OFF = '1';
      t.eq(c.leaveAutoRule_().on, false, 'LEAVE_AUTO_OFF stands the order down');
      e.post({ kind:'leave', token:a, leave:{ id:'S1', type:'CL', from:'2026-10-20', to:'2026-10-20', days:1 } });
      tick(e, 10);
      const r = c.leaveStandingOrders();
      t.eq(r.on, false, 'the trigger does nothing');
      t.eq(String(lvRow(e, 'S1').status), 'PENDING', 'and every application waits for the Collector again, with no deploy');
      t.eq(e.get('diag', {}).autoLeave, false, 'diag says so');
    }
    {
      const e = fresh({ noSeed:true }); e.props.TENANT = 'GP';
      t.eq(e.ctx.tenant_().key, 'GP', 'the Gram Palana register');
      t.eq(e.ctx.tenant_().autoLeave, true, 'is in the order');
    }
    {
      const e = fresh({ noSeed:true }); e.props.TENANT = 'HRMS';
      t.eq(e.ctx.tenant_().key, 'HRMS', 'the District HRMS');
      t.eq(e.ctx.tenant_().autoLeave, false, 'is NOT in the order — every application comes to the Collector (08.10.2026)');
      t.eq(e.ctx.leaveAutoRule_().on, false, 'and the pass is off there whatever the property says');
      e.ctx.installReportTriggers();
      t.eq(e.installed.indexOf('leaveStandingOrders'), -1, 'and no trigger is installed for it there');
    }

    /* ---- 6. THE CLOCKWORK, AND THE LAZY PASS ON THE CONSOLE ---- */
    {
      const e = fresh(), c = e.ctx, a = tok(e, '9000000011'), cdm = tok(e, '9000000001');
      c.installReportTriggers();
      t.eq(e.installed.filter(n => n === 'leaveStandingOrders').length, 1, 'installReportTriggers installs the five-minute trigger');
      c.installReportTriggers();
      t.eq(e.installed.filter(n => n === 'leaveStandingOrders').length, 1, 'once, however often it is pressed (rule 8)');
      /* the console payload passes what is due before it reads the file */
      e.post({ kind:'leave', token:a, leave:{ id:'D1', type:'CL', from:'2026-10-22', to:'2026-10-22', days:1 } });
      tick(e, 6); clearCache(e);
      const dash = e.get('dashboard', { token:cdm });
      t.eq(dash.leave.pending.filter(l => l.id === 'D1').length, 0, 'the console does not show it waiting');
      t.eq((dash.leave.recent.find(l => l.id === 'D1') || {}).status, 'APPROVED', 'it is in Recent orders, passed by the payload’s own pass');
      /* the lazy pass is guarded: a second ask within the minute does not read the register again */
      t.eq(c.leaveStandingOrders_().skipped, 'recent', 'and the guard holds the next lazy pass');
      /* a twin already decided on one row is not this pass’s business */
      e.post({ kind:'leave', token:a, leave:{ id:'W1', type:'CL', from:'2026-10-28', to:'2026-10-28', days:1 } });
      const head = e.sheets['Leave'].rows[0].map(String), src = e.sheets['Leave'].rows.find(x => String(x[0]) === 'W1');
      const twin = src.slice(); twin[head.indexOf('status')] = 'APPROVED'; twin[head.indexOf('decidedBy')] = 'Sandeep Kumar Jha (COLLECTOR)';
      e.sheets['Leave'].rows.push(twin);
      tick(e, 6);
      c.leaveStandingOrders();
      t.eq(String(src[head.indexOf('status')]), 'PENDING', 'a twin with a decided row is left for settleLeaveTwins');
    }

    /* ---- 7. THE COLLECTOR CANCELS A SANCTION ---- */
    {
      const e = fresh(), c = e.ctx, a = tok(e, '9000000011'), b = tok(e, '9000000012'), cdm = tok(e, '9000000001');
      e.mkSheet('Audit', ['at','action','subject','detail','by'], []);
      e.post({ kind:'leave', token:a, leave:{ id:'X1', type:'CL', from:'2026-10-20', to:'2026-10-21', days:2 } });
      e.post({ kind:'leave', token:a, leave:{ id:'X2', type:'CL', from:'2026-10-17', to:'2026-10-19', days:3 } });
      tick(e, 6); c.leaveStandingOrders();
      t.eq(String(lvRow(e, 'X1').status) + ',' + String(lvRow(e, 'X2').status), 'APPROVED,APPROVED', 'both passed under the standing order');
      /* words are required, and only his hand can do it */
      const mute = e.post({ kind:'leaveDecision', token:cdm, id:'X1', status:'CANCELLED' });
      t.eq(mute.ok, false, 'cancelling without remarks is refused');
      const notHis = e.post({ kind:'leaveDecision', token:b, id:'X1', status:'CANCELLED', remarks:'no' });
      t.eq(notHis.ok, false, 'an MPDO cannot cancel a sanction');
      t.eq(String(lvRow(e, 'X1').status), 'APPROVED', 'and it still stands');
      /* the officer's own withdrawal path is untouched */
      t.eq(e.post({ kind:'leaveWithdraw', token:a, id:'X1' }).status, 'CANCELLED', 'the applicant can still give back a spell not yet begun');
      /* the Collector cancels a spell he cannot withdraw himself (it has begun) */
      t.eq(e.post({ kind:'leaveWithdraw', token:a, id:'X2' }).ok, false, 'the officer cannot withdraw a spell once begun');
      t.eq(c.clUsed_('9000000011', 2026), 3, 'three days stand debited');
      const aside = e.post({ kind:'leaveDecision', token:cdm, id:'X2', status:'CANCELLED', remarks:'Required at the review on the 19th.' });
      t.eq(aside.ok, true, 'the Collector cancels it with his reasons');
      t.eq(aside.status, 'CANCELLED', 'and the application is CANCELLED');
      const row = lvRow(e, 'X2');
      t.eq(String(row.status), 'CANCELLED', 'the row stays and turns CANCELLED — nothing struck off (rule 7)');
      t.contains(String(row.remarks), 'Required at the review', 'his reasons travel with it');
      t.contains(String(row.remarks), 'Cancelled by the Collector', 'in those words, and nothing else recited after them');
      t.ok(!/sanctioned by/.test(String(row.remarks)), 'the old sanction is not recited where the officer reads');
      t.contains(String(row.decidedBy), 'cancelled', 'the hand says cancelled');
      t.eq(c.clUsed_('9000000011', 2026), 0, 'the days return to the year');
      t.ok(!c.sanctionedSet_('2026-10-19')['9000000011'], 'and the day no longer answers for him — attendance is due again');
      const au_ = () => e.sheets['Audit'].rows.slice(1).map(x => x.map(String));
      t.eq(au_().filter(x => x[1] === 'leaveSetAside' && x[2] === 'X2').length, 1, 'Audit carries the cancellation');
      t.contains(au_().find(x => x[1] === 'leaveSetAside')[3], 'was APPROVED by Sandeep Kumar Jha', 'and keeps whose sanction it was (rule 7)');
      const twice = e.post({ kind:'leaveDecision', token:cdm, id:'X2', status:'CANCELLED', remarks:'again' });
      t.eq(twice.ok, false, 'a second cancellation is refused');
      t.eq(au_().filter(x => x[1] === 'leaveSetAside').length, 1, 'and writes no second Audit line');
      /* the officer's file shows it cancelled, by whom, with nothing about a rule */
      const mine = e.get('leave', { token:a });
      const x2 = mine.rows.find(l => l.id === 'X2');
      t.eq(x2.status, 'CANCELLED', 'his file shows the spell cancelled');
      t.contains(x2.decidedBy, 'COLLECTOR', 'by the Collector');
      t.ok(!RULEWORDS.test(JSON.stringify(mine)), 'and still not one word of a rule on the phone');
    }
  }
};

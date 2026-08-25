/* THE APPLICATION THAT WAS SANCTIONED AND WAITING AT THE SAME TIME.

   Reported from the district on 25.08.2026: three applications standing in
   "Awaiting your orders" on the console, whose leave the Collector had already
   sanctioned. Before saveLeave_ took the script lock a retry racing its
   original could append the same application id twice; the order then settled
   the FIRST row and the twin stayed PENDING, undecidable ever after, because
   every further order found that first row already APPROVED and answered
   "orders have already been passed".

   Code.gs now passes an order on the APPLICATION and writes it to every row of
   it, and both readers fold twins. This suite is for the rows already on the
   register: what the Collector is shown before he presses anything, what the
   repair writes, and that pressing it twice writes nothing the second time. */
'use strict';
const mock = require('../gasmock.js');

const L_HEAD = ['id','appliedAt','phone','name','role','mandal','type','fromDate','toDate','days',
                'reason','address','leaveHq','certificate','status','decidedBy','decidedAt','remarks','receivedAt'];

function row(o){
  return Object.assign({
    id:'', appliedAt:'2026-08-10T04:00:00.000Z', phone:'9000000011', name:'A. Punctual',
    role:'MPO', mandal:'Jangaon', type:'CL', fromDate:'2026-08-17', toDate:'2026-08-18',
    days:2, reason:'', address:'', leaveHq:'', certificate:'', status:'PENDING',
    decidedBy:'', decidedAt:'', remarks:'', receivedAt:''
  }, o);
}

module.exports = {
  name: 'the twin application (showLeaveTwins, settleLeaveTwins)',
  run(t){
    const env = mock.load({ admin: true, now: '2026-08-25T12:00:00+05:30' });
    const c = env.ctx;
    env.seedUsers();

    env.mkSheet('Leave', L_HEAD, [
      /* 1 - sanctioned on the first row, waiting on its twin. This is the one
             the district could see and could not clear. */
      row({ id:'LV-A', name:'Rachakonda Upender', mandal:'Raghunathpalle', type:'CL', days:2,
            fromDate:'2026-08-17', toDate:'2026-08-18', status:'APPROVED',
            decidedBy:'Sandeep Kumar Jha (COLLECTOR)', decidedAt:'2026-08-16T09:00:00.000Z',
            remarks:'Sanctioned.' }),
      row({ id:'LV-A', name:'Rachakonda Upender', mandal:'Raghunathpalle', type:'CL', days:2,
            fromDate:'2026-08-17', toDate:'2026-08-18', status:'PENDING' }),

      /* 2 - a refusal that only reached one of its rows */
      row({ id:'LV-B', name:'Gopagani Sandhya Rani', mandal:'Palakurthi', type:'OH', days:1,
            fromDate:'2026-08-21', toDate:'2026-08-21', status:'REJECTED',
            decidedBy:'Sandeep Kumar Jha (COLLECTOR)', decidedAt:'2026-08-20T09:00:00.000Z',
            remarks:'Not on the notified list.' }),
      row({ id:'LV-B', name:'Gopagani Sandhya Rani', mandal:'Palakurthi', type:'OH', days:1,
            fromDate:'2026-08-21', toDate:'2026-08-21', status:'PENDING' }),

      /* 3 - genuinely waiting on BOTH rows. Nothing has been decided, so the
             repair must not touch it: that order is the Collector's to pass. */
      row({ id:'LV-C', name:'Burra Bhanuchander', mandal:'Devaruppula', type:'CL', days:1,
            fromDate:'2026-08-25', toDate:'2026-08-25', status:'PENDING' }),
      row({ id:'LV-C', name:'Burra Bhanuchander', mandal:'Devaruppula', type:'CL', days:1,
            fromDate:'2026-08-25', toDate:'2026-08-25', status:'PENDING' }),

      /* 4 - an ordinary single application, decided. Never a twin. */
      row({ id:'LV-D', name:'C. LateSync', mandal:'Chilpur', type:'EL', days:3,
            fromDate:'2026-09-01', toDate:'2026-09-03', status:'APPROVED',
            decidedBy:'Sandeep Kumar Jha (COLLECTOR)', decidedAt:'2026-08-24T09:00:00.000Z' }),

      /* 5 - a blank row at the foot of the tab. Not an application at all. */
      row({ id:'', name:'', role:'', mandal:'', type:'', fromDate:'', toDate:'', days:0, status:'' })
    ]);

    const ix = k => L_HEAD.indexOf(k);
    const rowsFor = id => env.sheets['Leave'].rows.filter(r => String(r[ix('id')]) === id);
    const statesFor = id => rowsFor(id).map(r => String(r[ix('status')])).join(',');

    /* ---- what the Collector is shown, before anything is written ---- */
    const before = env.sheets['Leave'].rows.map(r => r.slice());
    const said = c.showLeaveTwins();
    t.contains(said, 'Rachakonda Upender', 'the reading names the officer');
    t.contains(said, 'LV-A', 'and the application');
    t.contains(said, 'would write APPROVED', 'and says what settling it would do');
    t.contains(said, 'genuinely waiting on your orders', 'and leaves the undecided one to the Collector');
    t.contains(said, 'no application id', 'the blank row is reported as not an application');
    t.contains(said, 'read only', 'and it says it wrote nothing');
    t.eq(JSON.stringify(env.sheets['Leave'].rows), JSON.stringify(before),
      'the reading wrote nothing, not one cell');

    /* ---- the repair ---- */
    const out = c.settleLeaveTwins();
    t.eq(statesFor('LV-A'), 'APPROVED,APPROVED', 'the sanctioned twin is brought into line');
    t.eq(statesFor('LV-B'), 'REJECTED,REJECTED', 'a refusal reaches its twin too');
    t.eq(statesFor('LV-C'), 'PENDING,PENDING',
      'an application with no order on it is left waiting for the Collector');
    t.eq(statesFor('LV-D'), 'APPROVED', 'an ordinary application is untouched');

    /* THE ORDER IS COPIED, NEVER INVENTED - the same hand, the same date and
       the same words as the row that already carried it. */
    const settled = rowsFor('LV-A')[1];
    t.eq(String(settled[ix('decidedBy')]), 'Sandeep Kumar Jha (COLLECTOR)', 'under the hand that passed it');
    t.eq(String(settled[ix('decidedAt')]), '2026-08-16T09:00:00.000Z', 'on the date it was passed');
    t.eq(String(settled[ix('remarks')]), 'Sanctioned.', 'carrying the words it was passed in');

    /* NOTHING IS DESTROYED - both rows still stand, and every action is on the
       Audit tab, so a file can be produced from it afterwards. */
    t.eq(rowsFor('LV-A').length, 2, 'no row was deleted');
    t.eq(env.sheets['Leave'].rows.length - 1, 8, 'the register is the size it was');
    const audit = env.sheets['Audit'].rows.slice(1).map(r => String(r[1]) + '|' + String(r[2]));
    t.ok(audit.some(x => x === 'LEAVE TWIN SETTLED|LV-A'), 'the sanction settled is on the Audit tab');
    t.ok(audit.some(x => x === 'LEAVE TWIN SETTLED|LV-B'), 'and so is the refusal');
    t.ok(!audit.some(x => x === 'LEAVE TWIN SETTLED|LV-C'), 'and nothing was written against the one still waiting');
    t.contains(out, '2 application(s) settled', 'the report says what it did');

    /* ---- Rule 8: run it again ---- */
    const after = env.sheets['Leave'].rows.map(r => r.slice());
    const auditN = env.sheets['Audit'].rows.length;
    const twice = c.settleLeaveTwins();
    t.eq(JSON.stringify(env.sheets['Leave'].rows), JSON.stringify(after), 'a second run writes nothing');
    t.eq(env.sheets['Audit'].rows.length, auditN, 'and logs nothing');
    t.contains(twice, 'Nothing to settle', 'and says so plainly');

    /* ---- and the console no longer asks for orders it already has ---- */
    const cdm = c.issueToken_(c.findByPhone_('9000000001'));
    const j = env.get('dashboard', { token: cdm });
    t.eq(j.leave.pending.map(l => l.name).join(','), 'Burra Bhanuchander',
      'only the application actually awaiting orders stands in the waiting list');
    t.eq(j.leave.pending.length, 1, 'one line, not two, because the twin is folded');
    t.ok(!j.leave.pending.some(l => !String(l.id || '').trim()), 'and the blank row is not an officer');
  }
};

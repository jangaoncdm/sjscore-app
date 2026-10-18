/* THE DISTRICT HRMS · THE BASE FORMAT, THE ACCOUNT, AND WHO IS AWAY
   (18.10.2026)

   A Section's Base Format came back from the offices: thirty-six columns an
   employee, the Service Register's own figures among them. This suite guards
   what changed with it:

     · the paste is proposed before it is written, the module makes its own
       columns on the write path alone, dates arrive three ways and are kept
       one way, and a head of office is not demoted by his own workbook;
     · THE SERVICE REGISTER'S FIGURE BEATS THE OPENING TABLE — casual leave
       is the year's fifteen less what he availed before the balance date,
       earned leave a balance at credit — and the SANCTION measures against
       the same figure the screen shows, through one function, leaveOpening_;
     · the two registers that carry no such columns are untouched: the same
       function answers null there and nothing about their leave moves;
     · who is away is the office's for its head and the district's for the
       Collector, never an employee's to read, and bounded and cached. */
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'the District HRMS · the Base Format, the account and who is away (18.10.2026)',
  run(t){
    const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active','Designation','EmpId'];
    const L = ['id','appliedAt','phone','name','role','mandal','type','fromDate','toDate','days',
               'reason','address','leaveHq','certificate','status','decidedBy','decidedAt','remarks','receivedAt','standingOrder'];
    const NOW = '2026-10-19T10:00:00+05:30';
    const OFFICE = 'Office of the District Panchayat Officer, Jangaon';
    const start = (users, leave) => {
      const e = mock.load({ now:NOW });
      e.props.TENANT = 'HRMS';
      e.mkSheet('Users', U, [
        { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Mandal:'', Active:'TRUE' },
        { Phone:'9000000002', Name:'V. Reddy', Role:'HOD', Mandal:'District Officers', Active:'TRUE', Designation:'District Panchayat Officer' }
      ].concat(users || []));
      e.mkSheet('Leave', L, leave || []);
      e.mkSheet('Audit', ['At','Action','Subject','Detail','By'], []);
      return e;
    };
    const tok = (e, p) => e.ctx.issueToken_(e.ctx.findByPhone_(p));
    const seed = (e, rows, dry) => e.post({ kind:'hrmsSeed', token:tok(e, '9000000001'), rows:rows, dry:!!dry });
    const head = e => e.sheets['Users'].rows[0].map(String);
    const cellOf = (e, phone, col) => { const h = head(e); const r = e.sheets['Users'].rows.find(r => String(r[0]).replace(/^'/, '') === phone); return r ? r[h.indexOf(col)] : undefined; };
    /* the Field Guide's own example, as the console sends it off a paste */
    const RAO = { emp:'2071534', name:'K. Srinivas Rao', gender:'Male', dob:'15-06-1972', phone:'9444400001', email:'',
                  cat:'Regular', dept:'Panchayat Raj and Rural Development', desig:'Superintendent', office:OFFICE, place:'District Headquarters',
                  gaz:'Non-Gazetted', entered:'12-11-1998', post:'01-07-2025', status:'On duty', hqres:'Yes',
                  ctl:'District Panchayat Officer, Jangaon', authCL:'District Panchayat Officer, Jangaon', authOther:'District Collector, Jangaon',
                  balAsOn:'30-09-2026', el:'214', hpl:'168', clUsed:'6', ohUsed:'2', children:'2',
                  verifiedBy:'S. Laxmi, Superintendent (A Section)', verifiedOn:'30-09-2026', role:'EMP' };

    /* ---- 1. THE PASTE IS PROPOSED, THEN WRITTEN, WITH ITS OWN COLUMNS ---- */
    {
      const e = start();
      const dry = seed(e, [RAO], true);
      t.eq(dry.ok, true, 'the proposal answers');
      t.eq(dry.plans[0].verdict, 'register', 'a new employee is to be added');
      t.ok(/balances as on 30\.09\.2026/.test(dry.plans[0].changes.join(' ')), 'and the proposal names the balance date', dry.plans[0].changes.join(' | '));
      t.eq(head(e).length, U.length, 'AND THE PROPOSAL WROTE NOTHING — not even a column');
      const r = seed(e, [RAO]);
      t.eq(r.added, 1, 'on Apply he is on the roll');
      t.ok(head(e).indexOf('BalAsOn') >= 0 && head(e).indexOf('ELCredit') >= 0 && head(e).indexOf('HrRemarks') >= 0,
        'the Base Format\'s columns were made on the write path', head(e).length + ' columns');
      t.eq(String(cellOf(e, '9444400001', 'DOB')).replace(/^'/, ''), '1972-06-15', 'a date typed dd-mm-yyyy is kept ISO');
      t.eq(String(cellOf(e, '9444400001', 'BalAsOn')).replace(/^'/, ''), '2026-09-30', 'the balance date too');
      t.eq(Number(cellOf(e, '9444400001', 'ELCredit')), 214, 'and a figure is a number');
      t.eq(cellOf(e, '9444400001', 'Department'), 'Panchayat Raj and Rural Development', 'the department is kept');
      const u = e.ctx.findByPhone_('9444400001');
      t.eq(u.mandal, OFFICE, 'his office is the row\'s Mandal, which is how the calendar groups him');
      t.eq(u.hash, '', 'and NO PIN — it is his to choose');
      /* rule 8 */
      const n = e.sheets['Users'].rows.length;
      const again = seed(e, [RAO]);
      t.eq(e.sheets['Users'].rows.length, n, 'a second paste writes no second row');
      t.eq(again.counts.unchanged, 1, 'and finds nothing to do');
      /* an Excel serial arrives from a reader of the workbook itself */
      const ser = seed(e, [Object.assign({}, RAO, { phone:'9444400009', emp:'77', dob:'26475', balAsOn:'46295' })]);
      t.eq(ser.added, 1, 'a row with Excel serial dates is taken');
      t.eq(String(cellOf(e, '9444400009', 'DOB')).replace(/^'/, ''), '1972-06-25', 'and the serial is a date');
      t.eq(String(cellOf(e, '9444400009', 'BalAsOn')).replace(/^'/, ''), '2026-09-30', 'the balance date likewise');
    }

    /* ---- 2. A HEAD OF OFFICE IS NOT DEMOTED BY HIS OWN WORKBOOK ---- */
    {
      const e = start();
      const r = seed(e, [Object.assign({}, RAO, { phone:'9000000002', name:'V. Reddy', emp:'HOD1', desig:'District Panchayat Officer', role:'EMP' })]);
      t.eq(r.corrected, 1, 'his row is corrected, not duplicated');
      const u = e.ctx.findByPhone_('9000000002');
      t.eq(u.role, 'HOD', 'HE STAYS HOD though the Base Format sent him as EMP');
      t.eq(u.mandal, OFFICE, 'and his office is now his own, so his calendar is his own people');
      t.eq(e.sheets['Users'].rows.length, 3, 'two officers and the Collector, as before');
    }

    /* ---- 3. WHAT IS REFUSED, AND WHAT IS NAMED ---- */
    {
      const e = start();
      const noDate = seed(e, [Object.assign({}, RAO, { balAsOn:'', verifiedOn:'' })], true);
      t.eq(noDate.plans[0].verdict, 'refused', 'balances with no date they stand as on are refused');
      t.ok(/D1/.test(noDate.plans[0].why), 'naming the column', noDate.plans[0].why);
      const fb = seed(e, [Object.assign({}, RAO, { balAsOn:'' })], true);
      t.eq(fb.plans[0].verdict, 'register', 'but the verification date stands in for a blank balance date');
      t.ok(/30\.09\.2026/.test(fb.plans[0].changes.join(' ')), 'and the proposal says so');
      const sir = seed(e, [Object.assign({}, RAO, { name:'AC (Rev.) Sir (I/c)', phone:'9444400011' })], true);
      t.eq(sir.plans[0].verdict, 'refused', '"AC (Rev.) Sir" is a post and not a person');
      const inc = seed(e, [Object.assign({}, RAO, { gender:'', ctl:'' })], true);
      t.eq(inc.plans[0].verdict, 'register', 'a row missing mandatory columns still goes on');
      t.ok(Array.isArray(inc.plans[0].incomplete) && inc.plans[0].incomplete.indexOf('gender') >= 0 && inc.plans[0].incomplete.indexOf('controlling officer') >= 0,
        'and the office is told which', (inc.plans[0].incomplete || []).join(', '));
      t.eq(inc.counts.incomplete, 1, 'counted as incomplete');
      /* the older five-column shape is still the officers list exactly as before */
      const old = seed(e, [{ name:'Y. Ravikiran', office:'Collectorate', desig:'Administration Officer', emp:'', phone:'9444400021', role:'HOD' }]);
      t.eq(old.added, 1, 'the officers list of 08.10 still seeds');
      t.eq(old.issued.length, 1, 'with an enrolment code where there is no id');
      t.eq(head(e).indexOf('BalAsOn'), -1, 'AND NO BASE FORMAT COLUMNS WERE MADE for a paste that carried none');
    }

    /* ---- 4. THE SERVICE REGISTER'S FIGURE BEATS THE TABLE ---- */
    {
      const e = start(); seed(e, [RAO]);
      const cl = e.ctx.leaveOpening_('9444400001', 'CL', '2026');
      t.eq(cl && cl.cap, 15, 'casual leave is the year\'s fifteen, NOT the quarter\'s four');
      t.eq(cl && cl.used, 6, 'less the six his office recorded');
      t.eq(cl && cl.floor, '2026-09-30', 'counted after the balance date');
      t.eq(e.ctx.leaveOpening_('9444400001', 'CL', '2027'), null, 'next year the office\'s figure does not apply, and the table\'s fifteen stands');
      const el = e.ctx.leaveOpening_('9444400001', 'EL', '2026');
      t.eq(el && el.cap, 214, 'earned leave is the balance at credit');
      t.eq(el && el.credit, true, 'and is read as a credit, whatever the year');
      t.eq(e.ctx.leaveOpening_('9444400001', 'OH', '2026').cap, 3, 'optional holidays keep the Collector\'s three');
      t.eq(e.ctx.leaveOpening_('9444400001', 'OH', '2026').used, 2, 'less the two availed');
      t.eq(e.ctx.leaveOpening_('9444400001', 'CCL', '2026'), null, 'child care leave: nothing recorded, nothing opened');
      t.eq(e.ctx.leaveOpening_('9000000002', 'CL', '2026'), null, 'an officer with no Base Format row answers null and keeps the pro-rated table');
      t.eq(e.ctx.entitlement_('CL', '2026'), 4, 'which is still four on this register');

      /* THE OTHER TWO REGISTERS ARE UNTOUCHED */
      const g = mock.load({ now:NOW }); g.seedUsers();
      t.eq(g.ctx.leaveOpening_('9000000011', 'CL', '2026'), null, 'the sanitation register carries no such column and answers null');
      t.eq(g.ctx.entitlement_('CL', '2026'), 6, 'and its casual leave is exactly what it was');
    }

    /* ---- 5. AND THE SANCTION MEASURES AGAINST THE SAME FIGURE ---- */
    {
      const e = start(); seed(e, [RAO]);
      const me = tok(e, '9444400001'), cdm = tok(e, '9000000001');
      const apply = (id, type, from, to, days) => e.post({ kind:'leave', token:me, leave:{ id:id, type:type, from:from, to:to, days:days, reason:'r' } });
      const order = (id, st) => e.post({ kind:'leaveDecision', token:cdm, id:id, status:st, remarks:'' });
      apply('A1', 'CL', '2026-10-26', '2026-11-03', 9);
      const ok9 = order('A1', 'APPROVED');
      t.eq(ok9.ok, true, 'NINE DAYS OF CASUAL LEAVE ARE SANCTIONED — fifteen less six is nine, where the table alone would have refused at four');
      apply('A2', 'CL', '2026-11-16', '2026-11-16', 1);
      const no10 = order('A2', 'APPROVED');
      t.eq(no10.ok, false, 'the tenth is refused');
      t.ok(/15 for 2026/.test(no10.error) && /6 already availed/.test(no10.error) === false && /already availed|already sanctioned/.test(no10.error),
        'in the year\'s own words', no10.error);
      apply('A3', 'EL', '2026-12-01', '2027-07-03', 215);
      const noEl = order('A3', 'APPROVED');
      t.eq(noEl.ok, false, '215 days of earned leave against 214 at credit is refused');
      t.ok(/at credit: 214/.test(noEl.error), 'naming the credit', noEl.error);
      apply('A4', 'EL', '2026-11-20', '2026-11-24', 5);
      t.eq(order('A4', 'APPROVED').ok, true, 'five of earned leave are sanctioned');
      const mine = e.get('hrms', { token:me });
      t.eq(mine.account.types.CL.left, 0, 'the account now reads no casual leave left');
      t.eq(mine.account.types.CL.used, 15, 'fifteen used: six the office recorded and nine the register sanctioned');
      t.eq(mine.account.types.EL.left, 209, 'and 209 earned leave at credit');
      t.eq(mine.account.types.EL.used, 5, 'five taken since the balance date');
      t.eq(mine.account.types.HPL.cap, 168, 'half pay leave is offered because the record carries it');
      t.eq(mine.account.types.OH.left, 1, 'one optional holiday of three');
      t.eq(mine.account.types.ML.spell, 15, 'medical leave carries the spell, not a balance');
      t.eq(mine.account.types.CCL, undefined, 'child care leave is not offered to him');
      t.eq(mine.account.asOn, '2026-09-30', 'the account says what date it stands as on');
      t.ok(/Laxmi/.test(mine.account.verifiedBy), 'and who verified the Service Register');
      /* and the pro-rated table stands for an officer his office has not returned */
      const hod = e.get('hrms', { token:tok(e, '9000000002') });
      t.eq(hod.account.types.CL.cap, 4, 'the head of office, with no Base Format row, keeps the quarter\'s four');
      t.eq(hod.account.types.HPL, undefined, 'and is not offered half pay leave the register knows nothing of');
    }

    /* ---- 6. op=hrms CARRIES HIS RECORD, HIS DAY AND HIS HOLIDAYS ---- */
    {
      const e = start(); seed(e, [RAO]);
      const r = e.get('hrms', { token:tok(e, '9444400001') });
      t.eq(r.today, '2026-10-19', 'the district\'s day rides on the answer (rule 1)');
      t.eq(r.record.retire, '2033-06-30', 'superannuation at sixty-one, the last day of the month, as the workbook\'s X1 computes it');
      t.eq(r.record.ctl, 'District Panchayat Officer, Jangaon', 'the controlling officer, as his office recorded him');
      t.eq(r.record.empId, '2071534', 'the employee id');
      t.ok(r.holidays && typeof r.holidays === 'object', 'the holidays travel with it');
      const h = e.get('hrms', { token:tok(e, '9000000002') });
      t.eq(h.record && h.record.dob, '', 'an officer with no Base Format row has an empty record, not an error');
      /* a woman's record carries child care leave */
      seed(e, [Object.assign({}, RAO, { phone:'9444400002', name:'M. Anitha', emp:'E2', gender:'Female', cclUsed:'30' })]);
      const w = e.get('hrms', { token:tok(e, '9444400002') });
      t.eq(w.account.types.CCL && w.account.types.CCL.cap, 180, 'child care leave is 180 days of service for a woman');
      t.eq(w.account.types.CCL.left, 150, 'less the thirty her office recorded');
    }

    /* ---- 7. WHO IS AWAY: THE OFFICE'S FOR ITS HEAD, THE DISTRICT'S FOR THE COLLECTOR ---- */
    {
      const T = 'Office of the District Treasury Officer, Jangaon';
      const e = start([
        { Phone:'9444400001', Name:'K. Srinivas Rao', Role:'EMP', Mandal:OFFICE, Active:'TRUE' },
        { Phone:'9444400002', Name:'M. Anitha', Role:'EMP', Mandal:OFFICE, Active:'TRUE' },
        { Phone:'9444400003', Name:'P. Swapna', Role:'EMP', Mandal:T, Active:'TRUE' },
        { Phone:'9444400004', Name:'Gone', Role:'EMP', Mandal:OFFICE, Active:'FALSE' }
      ], [
        { id:'L1', appliedAt:'2026-10-10T09:00:00Z', phone:'9444400002', name:'M. Anitha', role:'EMP', mandal:OFFICE, type:'CL', fromDate:'2026-10-19', toDate:'2026-10-21', days:3, status:'APPROVED', receivedAt:'x' },
        { id:'L1', appliedAt:'2026-10-10T09:00:00Z', phone:'9444400002', name:'M. Anitha', role:'EMP', mandal:OFFICE, type:'CL', fromDate:'2026-10-19', toDate:'2026-10-21', days:3, status:'PENDING', receivedAt:'x' },
        { id:'L2', appliedAt:'2026-10-12T09:00:00Z', phone:'9444400003', name:'P. Swapna', role:'EMP', mandal:T, type:'CL', fromDate:'2026-10-19', toDate:'2026-10-19', days:1, status:'APPROVED', receivedAt:'x' },
        { id:'L3', appliedAt:'2026-10-18T09:00:00Z', phone:'9444400003', name:'P. Swapna', role:'EMP', mandal:T, type:'CL', fromDate:'2026-10-27', toDate:'2026-10-28', days:2, status:'PENDING', receivedAt:'x' },
        { id:'L4', appliedAt:'2026-10-01T09:00:00Z', phone:'9444400001', name:'K. Srinivas Rao', role:'EMP', mandal:OFFICE, type:'EL', fromDate:'2025-12-30', toDate:'2026-01-02', days:4, status:'APPROVED', receivedAt:'x' }
      ]);
      /* the head of the Panchayat office, placed in it */
      seed(e, [Object.assign({}, RAO, { phone:'9000000002', name:'V. Reddy', emp:'HOD1', role:'EMP', balAsOn:'', el:'', hpl:'', clUsed:'', ohUsed:'' })]);
      const emp = e.get('hrmsCalendar', { token:tok(e, '9444400001'), year:'2026' });
      t.eq(emp.ok, false, 'AN EMPLOYEE IS REFUSED the calendar — his own days are in his own rows');
      const o = e.get('hrmsCalendar', { token:tok(e, '9000000002'), year:'2026' });
      t.eq(o.ok, true, 'the head of office reads it');
      t.eq(o.scope, 'office', 'and it is his office\'s');
      t.eq(o.roll, 3, 'three on his roll: two employees and himself, not the inactive row and not the Treasury');
      t.eq(o.days['2026-10-19'], 1, 'ONE AWAY ON THE 19TH IN HIS OFFICE — the Treasury\'s typist is not counted, and the twin row of L1 is one application');
      t.eq(o.days['2026-10-21'], 1, 'and on the 21st');
      t.eq(o.days['2026-10-27'], undefined, 'nothing awaiting orders is on it');
      t.eq(o.days['2026-01-01'], 1, 'a spell that began last year counts its days in this one');
      t.eq(o.days['2025-12-31'], undefined, 'and not last year\'s');
      t.eq(o.away.length, 1, 'one away today');
      t.eq(o.away[0].name, 'M. Anitha', 'named');
      t.eq(o.pending, 0, 'nothing of his office awaits orders');
      const d = e.get('hrmsCalendar', { token:tok(e, '9000000001'), year:'2026' });
      t.eq(d.scope, 'district', 'the Collector reads the district');
      t.eq(d.days['2026-10-19'], 2, 'two away on the 19th across the district');
      t.eq(d.roll, 4, 'four on the district\'s roll, the Collector not counted');
      t.eq(d.pending, 1, 'one awaiting his orders');
      t.eq(d.away.length, 2, 'two away today');
      /* cached ten minutes: a row written now is not seen until the cache turns */
      e.addRow('Leave', { id:'L9', appliedAt:'2026-10-19T04:00:00Z', phone:'9444400001', name:'K. Srinivas Rao', role:'EMP', mandal:OFFICE, type:'CL', fromDate:'2026-10-19', toDate:'2026-10-19', days:1, status:'APPROVED', receivedAt:'x' });
      const d2 = e.get('hrmsCalendar', { token:tok(e, '9000000001'), year:'2026' });
      t.eq(d2.days['2026-10-19'], 2, 'the answer is remembered, so the Collector opening his home six times an hour reads it once');
      t.eq(d2.at, d.at, 'the same read');
    }
  }
};

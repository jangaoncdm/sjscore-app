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

    /* ---- 8. A ROW THAT NAMES NOBODY IS SET RIGHT, AND THE REST ARE SET ASIDE ----

       On 18.10.2026 a paste of the Base Format reached the console with its
       tabs turned to spaces, was read as the officers list, and wrote a
       thousand rows with a date for a name, the employee id for an office,
       the rest of the row for a designation — every one of them as HOD. */
    {
      const e = start();
      /* the roll as the misread paste left it: the code column exists, three
         shapes of misread row, and one honest row */
      e.mkSheet('Users', U.concat(['EnrolCode']), [
        { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Mandal:'', Active:'TRUE' },
        { Phone:'9000000002', Name:'V. Reddy', Role:'HOD', Mandal:'District Officers', Active:'TRUE', Designation:'District Panchayat Officer' },
        { Phone:'9444400001', Name:'30-09-2026', Role:'HOD', Mandal:'2071534', Active:'TRUE', Designation:'K. Srinivas Rao Male 15-06-1972 Regular Panchayat Raj and Rural Development Superintendent Office of the District Panchayat Officer, Jangaon District Headquarters Non-Gazetted 12-11-1998 01-07-2025 On duty Yes District Panchayat Officer, Jangaon', EnrolCode:'AAAAAA' },
        { Phone:'9444400002', Name:'M. Anitha', Role:'HOD', Mandal:'Office of the District Panchayat Officer, Jangaon', Active:'TRUE', Designation:'Female 20-04-1977 Regular Panchayat Raj and Rural Development Senior Assistant Office of the District Panchayat Officer, Jangaon District Headquarters Non-Gazetted 01-01-2010 01-01-2010 On duty Yes District Panchayat Officer, Jangaon District Panchayat Officer, Jangaon District Collector 30-09-2026 100 80 3 1 0 2 S. Laxmi', EnrolCode:'BBBBBB' },
        { Phone:'1012121389', Name:'09-10-2026', Role:'HOD', Mandal:'101212138902', Active:'TRUE', Designation:'V.Vijay Male 09-05-1989 Outsourcing Civil Supplies Acct.', EnrolCode:'CCCCCC' },
        { Phone:'9444400005', Name:'P. Honest', Role:'EMP', Mandal:'Office of the District Treasury Officer, Jangaon', Active:'TRUE', Designation:'Typist', EmpId:'E5' }
      ]);
      /* a head of office whose own workbook row arrives as EMP keeps HOD, as before */
      t.eq(e.ctx.findByPhone_('9444400001').role, 'HOD', 'before: the misread row stands as HOD');
      const dry = seed(e, [RAO], true);
      t.eq(dry.plans[0].verdict, 'correct', 'THE BASE FORMAT ROW CARRYING THAT NUMBER IS NOT REFUSED');
      t.ok(/named nobody is set right/.test(dry.plans[0].changes.join(' ')), 'and the proposal says what it is doing', dry.plans[0].changes.join(' | '));
      const r = seed(e, [RAO]);
      t.eq(r.corrected, 1, 'on Apply the row is corrected in place');
      t.eq(r.setRight, 1, 'and counted as set right');
      t.eq(e.sheets['Users'].rows.length, 7, 'NO SECOND ROW for the number');
      const u = e.ctx.findByPhone_('9444400001');
      t.eq(u.name, 'K. Srinivas Rao', 'he is named');
      t.eq(u.role, 'EMP', 'AND HIS ROLE IS THE PASTE\'S, not the HOD the misread paste gave him');
      t.eq(u.mandal, OFFICE, 'and his office is his office');
      t.eq(u.desig, 'Superintendent', 'and the row-long designation is gone');
      t.eq(cellOf(e, '9444400001', 'EnrolCode'), 'AAAAAA', 'the code already printed for his number still opens his row');
      /* the second shape: a letter name and a real office, but the whole row in the designation */
      const r2 = seed(e, [Object.assign({}, RAO, { phone:'9444400002', name:'M. Anitha', emp:'', desig:'Senior Assistant', gender:'Female' })]);
      t.eq(r2.setRight, 1, 'a row with the rest of the line written into its designation is set right too');
      t.eq(e.ctx.findByPhone_('9444400002').role, 'EMP', 'and comes down to EMP');
      /* AND NO SECOND CODE. Her office keeps no employee ids, so the paste
         gives none; the code already printed for her number is the one she
         holds, and a re-paste must not mint another over it. On 18.10.2026
         it did, to eleven employees of two such offices, and the sheets their
         offices had been handed went dead for them without a word. */
      t.eq((r2.issued || []).length, 0, 'NO NEW CODE for a row already carrying one, though the paste gave no employee id');
      t.eq(cellOf(e, '9444400002', 'EnrolCode'), 'BBBBBB', 'the code printed for her number is the one still on the row');
      /* a person's row is still a person's row */
      const no = seed(e, [Object.assign({}, RAO, { phone:'9444400005', name:'Somebody Else', emp:'E9' })], true);
      t.eq(no.plans[0].verdict, 'refused', 'ONE NUMBER UNDER TWO NAMES IS STILL REFUSED where the row is a person\'s');
      t.ok(/on the roll as "P. Honest"/.test(no.plans[0].why), 'naming the holder');

      /* the leftover: a "number" that was the first ten digits of an employee id */
      const d0 = e.post({ kind:'hrmsSetAside', token:tok(e, '9000000001'), dry:true });
      t.eq(d0.found, 1, 'ONE ROW NAMES NOBODY AND NO PASTE CAN REACH IT');
      t.eq(d0.sample[0].phone, '1012121389', 'the one with the id for a number');
      t.eq(e.sheets['Users'].rows.length, 7, 'and the proposal wrote nothing');
      const emp = e.post({ kind:'hrmsSetAside', token:tok(e, '9444400005'), dry:false });
      t.eq(emp.ok, false, 'an employee cannot set rows aside');
      const w = e.post({ kind:'hrmsSetAside', token:tok(e, '9000000001'), dry:false });
      t.eq(w.setAside, 1, 'the Collector can');
      t.eq(e.sheets['Users'].rows.length, 7, 'NOTHING IS DELETED (rule 7)');
      t.eq(cellOf(e, '1012121389', 'Active'), 'FALSE', 'the row is inactive');
      t.eq(cellOf(e, '1012121389', 'Role'), 'EMP', 'brought down from HOD');
      t.ok(/^\(set aside 18\.10\.2026\)/.test(cellOf(e, '1012121389', 'Name')), 'and its name can never be read as a person\'s');
      t.eq(cellOf(e, '1012121389', 'EnrolCode'), '', 'its code is spent');
      t.ok(/misread paste/.test(cellOf(e, '1012121389', 'HrRemarks')), 'the reason is on the row');
      t.ok(e.sheets['Audit'].rows.some(r => /ROWS SET ASIDE/.test(String(r[1]))), 'and on Audit');
      const w2 = e.post({ kind:'hrmsSetAside', token:tok(e, '9000000001'), dry:false });
      t.eq(w2.setAside, 0, 'a second press finds nothing (rule 8)');
      t.eq(e.ctx.findByPhone_('9444400005').name, 'P. Honest', 'the honest row is untouched');

      /* AN OFFICER IS NAMED BY HIS ACTIVE ROW: a set-aside row standing first
         under a number no longer names the man whose live row comes after */
      e.addRow('Users', { Phone:'1012121389', Name:'V. Vijay', Role:'EMP', Mandal:'Office of the Telangana State Civil Supplies Corporation, Jangaon', Active:'TRUE', EmpId:'101212138902' });
      const vv = e.ctx.findByPhone_('1012121389');
      t.eq(vv.name, 'V. Vijay', 'the live row names him');
      t.eq(vv.role, 'EMP', 'with its role');
      t.eq(vv.active, true, 'and he is active');
    }

    /* ---- 9. ATTENDANCE, VOLUNTARY (19.10.2026) ----
       "also add to this attendance which is optional for now." A mark is
       taken and recorded; nobody is asked for one, so silence draws nothing.
       No place of duty, so no fence; the still-check holds (rule 6). */
    {
      const e = start([{ Phone:'9444400001', Name:'K. Srinivas Rao', Role:'EMP', Mandal:OFFICE, Active:'TRUE' },
                       { Phone:'9444400002', Name:'M. Anitha', Role:'EMP', Mandal:OFFICE, Active:'TRUE' }]);
      const reads = { r1:[[17.72, 79.15, 30, 1], [17.7201, 79.1501, 28, 2], [17.72003, 79.1502, 31, 3], [17.7202, 79.15, 30, 4]], r2:[] };
      const r = e.post({ kind:'attendance', token:tok(e, '9444400001'), att:{ id:'HA-1', date:'2026-10-19', ts:'2026-10-19T04:31:00.000Z',
        lat:17.72, lng:79.15, acc:28, verified:true, tz:'Asia/Kolkata', status:'PRESENT', reads:reads }, photo:null });
      t.eq(r.ok, true, 'an employee\'s mark is taken');
      const A = e.sheets['Attendance'], ah = A.rows[0].map(String);
      const row = A.rows.slice(1).find(x => String(x[ah.indexOf('phone')]).replace(/^'/, '') === '9444400001');
      t.ok(!!row, 'and written to this register\'s own Attendance tab');
      t.eq(String(row[ah.indexOf('role')]), 'EMP', 'under his role');
      t.eq(String(row[ah.indexOf('status')]), 'PRESENT', 'as present');
      t.eq(e.ctx.fenceCheck_(e.ctx.findByPhone_('9444400001'), 17.72, 79.15, 28).gated, false,
        'NO FENCE: an office employee has no place of duty here, so no mark is refused for where it was made');
      const pinned = { r1:[[17.72, 79.15, 5, 1], [17.72, 79.15, 5, 2], [17.72, 79.15, 5, 3], [17.72, 79.15, 5, 4]], r2:[] };
      const r2 = e.post({ kind:'attendance', token:tok(e, '9444400002'), att:{ id:'HA-2', date:'2026-10-19', ts:'2026-10-19T04:32:00.000Z',
        lat:17.72, lng:79.15, acc:5, verified:true, reads:pinned }, photo:null });
      t.eq(r2.ok, false, 'but a location that was not measured is still refused (rule 6)');
      t.eq(r2.notMeasured, true, 'by name');
      t.eq(e.eval("attExempt_('EMP')"), true, 'EVERY ROLE STAYS VOLUNTARY');
      t.eq(e.ctx.noticeGaps_('2026-10-19').length, 0, 'so the one who did not mark draws nothing — no reminder, no notice, no debit, no lock');
      const mine = e.get('hrms', { token:tok(e, '9444400001') });
      t.eq(mine.attendance.voluntary, true, 'op=hrms says attendance is voluntary');
      t.eq(String((mine.attendance.today || {}).date || ''), '2026-10-19', 'and hands him back the mark the district holds');
      t.eq(String((mine.attendance.today || {}).markedAt || ''), '2026-10-19T04:31:00.000Z', 'with the moment he made it');
      const hers = e.get('hrms', { token:tok(e, '9444400002') });
      t.eq(hers.attendance.today, null, 'and nothing for the one it refused');

      /* ---- and MARKING OUT, the same afternoon ("add mark out also") ---- */
      const o1 = e.get('out', { token:tok(e, '9444400001') });
      t.eq(o1.markedIn, true, 'op=out knows he marked in');
      t.eq(o1.outFrom, '2026-10-19T12:00:00.000Z', 'and TELLS him the moment: seven and a half hours after the mark as the district judges it — the EARLIER of his 10:01 claim and the 10:00 receipt (rule 1)');
      t.eq(o1.canOut, false, 'which has not come at ten in the morning');
      const early = e.post({ kind:'attendanceOut', token:tok(e, '9444400001'), att:{ id:'HO-1', ts:'2026-10-19T12:30:00.000Z', lat:17.72, lng:79.15, acc:28, verified:true, reads:reads }, photo:null });
      t.eq(early.ok, false, 'an out sent before the hour is refused');
      t.eq(early.early, true, 'as early — the claim says 17:30 but the district received it at 10:00, and the earlier reading is the one judged (rule 1)');
      e.setNow('2026-10-19T17:45:00+05:30');
      const o2 = e.get('out', { token:tok(e, '9444400001') });
      t.eq(o2.canOut, true, 'at a quarter to six the district says the hour has come');
      const out = e.post({ kind:'attendanceOut', token:tok(e, '9444400001'), att:{ id:'HO-1', ts:'2026-10-19T12:15:00.000Z', lat:17.7201, lng:79.1501, acc:30, verified:true, reads:reads }, photo:null });
      t.eq(out.ok, true, 'and the mark out is taken');
      const ah2 = e.sheets['Attendance'].rows[0].map(String);
      const row2 = e.sheets['Attendance'].rows.slice(1).find(x => String(x[ah2.indexOf('phone')]).replace(/^'/, '') === '9444400001');
      t.eq(String(row2[ah2.indexOf('outAt')]), '2026-10-19T12:15:00.000Z', 'written onto his own row for the day — one day, one row');
      const again = e.post({ kind:'attendanceOut', token:tok(e, '9444400001'), att:{ id:'HO-1', ts:'2026-10-19T12:15:00.000Z', lat:17.7201, lng:79.1501, acc:30, verified:true, reads:reads }, photo:null });
      t.eq(again.already, true, 'the same mark arriving twice is written once (rule 5)');
      const mine2 = e.get('hrms', { token:tok(e, '9444400001') });
      t.eq(String((mine2.attendance.today || {}).outAt || ''), '2026-10-19T12:15:00.000Z', 'and op=hrms hands the out back with the in');
      /* a third employee marks in and never closes the day; the morning
         after, the out module's reminder reads attExempt and mails nobody */
      e.addRow('Users', { Phone:'9444400003', Name:'P. Swapna', Role:'EMP', Mandal:OFFICE, Active:'TRUE' });
      e.setNow('2026-10-19T10:05:00+05:30');
      const r3 = e.post({ kind:'attendance', token:tok(e, '9444400003'), att:{ id:'HA-3', date:'2026-10-19', ts:'2026-10-19T04:35:00.000Z', lat:17.72, lng:79.15, acc:28, verified:true, reads:reads }, photo:null });
      t.eq(r3.ok, true, 'a third employee marks in');
      e.setNow('2026-10-20T09:00:00+05:30');
      const said = e.ctx.featureDaily();
      t.ok(!(e.sheets['OutReminders'] && e.sheets['OutReminders'].rows.length > 1), 'THE MORNING AFTER, NOBODY IS CHASED for the day she left open — every role here is voluntary', JSON.stringify(said).slice(0, 120));
    }
  }
};

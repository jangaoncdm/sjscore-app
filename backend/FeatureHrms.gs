/* ============================================================================
 * FEATURE · DISTRICT HRMS — the leave register, and the roll it stands on
 * ----------------------------------------------------------------------------
 * Ordered 05.10.2026. The whole district applies for leave, tracks it and sees
 * what it has left: between two and five thousand employees across every
 * office. Leave itself is Code.gs's and is not re-written here — saveLeave_,
 * decideLeave_, the overlap check, the medical spell, the yearly cap and the
 * twin-row rule are the same ones the other two registers run on, and they
 * must stay the same ones. This module is the three things that are NEW:
 *
 *   · the establishment, seeded by the office from its own list;
 *   · the PIN the employee chooses for himself, the first time;
 *   · and his own view of his leave, read without walking the whole register.
 *
 * THE ROLL IS THE DISTRICT'S AND THE PIN IS THE EMPLOYEE'S. The office is the
 * only body that knows who its employees are, so it seeds them; the employee
 * claims his own row. Self-SETUP, not self-REGISTRATION: on a register that
 * sanctions leave, anyone who could enrol himself could take leave the
 * district never granted to a person it never employed.
 *
 * AND CLAIMING ASKS FOR SOMETHING ONLY HE KNOWS. A mobile number is not a
 * secret — it is written in every office register in the district — so a claim
 * on the number alone would let whoever asked first become that employee. The
 * claim therefore also asks for his EMPLOYEE ID, which the office seeded and
 * which is not public. It is not a strong second factor and it is not
 * pretended to be one: it is what can be had for nothing on a register with no
 * SMS gateway and no budget for one. Every claim is written to `Audit` with
 * the day and the number, the console shows which rows are still unclaimed,
 * and the Collector can reset any of them — so a wrong claim is visible and
 * reversible rather than silent and permanent.
 *
 * A ROW IS CLAIMED ONCE. After that the PIN is changed by the Collector, as on
 * every other register, because an unauthenticated "change my PIN" is simply
 * the claim again with no second factor at all.
 *
 * READING AT FIVE THOUSAND. The Leave tab is read whole in four places in
 * Code.gs, which is right at 284 officers and is not at 5,000 — eight
 * applications a year apiece is forty thousand rows. Everything this module
 * reads is bounded: an employee's own rows come through hrmsMine_, which walks
 * the tail of the register rather than the whole of it, and the console's
 * pending list is the small one by nature.
 * ========================================================================== */

/* how far back an employee's own leave is read. At 5,000 employees and eight
   applications a year this is about four months of the whole district, which
   is far more than any one person's own history inside it. */
var HRMS_TAIL_ROWS = 20000;

/* what the office seeds. Designation and EmpId already exist on the roll
   (the MPDO office staff brought them); Office is this register's own. */
var HRMS_SEED_COLS = ['Office','Designation','EmpId'];

/* THE SECOND FACTOR, WHERE THE OFFICE HAS NO EMPLOYEE ID TO GIVE.
 *
 * The claim asks for something only the employee knows, because a mobile
 * number is written in every office register in the district. The employee id
 * was that something — and the district's own establishment list, when it
 * arrived on 08.10.2026, did not carry one: Section, Designation, Name, Mobile
 * and nothing else. Seventy-three officers, and five thousand employees behind
 * them, with no second factor at all.
 *
 * Two ways out, and only one of them is honest. Dropping the factor lets
 * whoever reads a noticeboard become that officer on a register that sanctions
 * leave. Asking the district to find five thousand employee ids by hand is
 * weeks of work by eleven offices before one person can apply for a day off.
 *
 * So where there is no employee id the register MINTS ONE ITSELF: a six-
 * character enrolment code, issued per row, printed once for the office to
 * hand over, and CLEARED THE MOMENT IT IS USED. It is a one-time token and is
 * not pretended to be more: it is a secret the office can distribute on paper,
 * which is what an office actually has. The employee still chooses his own
 * PIN — the code only proves the row is his, and is spent doing it.
 *
 * The alphabet leaves out O/0, I/1, S/5 and B/8, because this is read off a
 * printed sheet and typed on a phone by a man who did not write it. */
/* THE BASE FORMAT (A Section's workbook to every Head of Office, returned
   through October 2026): thirty-six columns per officer and employee, taken
   from the Service Register and the last pay slip. What the module keeps of
   it, by header, beside the eleven columns Code.gs already reads. None of it
   is on U_HEAD — that array is three registers' — so the module makes its own
   room on the write path alone, as it does for the enrolment code. The
   workbook's own column codes are kept in the comments so a reader with the
   Field Guide open can follow. */
var HRMS_BASE_MAP = [
  ['gender','Gender'],          /* A3 */   ['dob','DOB'],              /* A4 */
  ['cat','Category'],           /* B1 */   ['dept','Department'],      /* B2 */
  ['place','Place'],            /* B5 */   ['gaz','Gazetted'],         /* B6 */
  ['entered','EnteredOn'],      /* B7 */   ['post','PostOn'],          /* B8 */
  ['district','DistrictOn'],    /* B9 */   ['pay','PayScale'],         /* B10 */
  ['ddo','DDO'],                /* B11 */  ['vacation','Vacation'],    /* B12 */
  ['status','Status'],          /* B13 */  ['hqres','HqResident'],     /* B14 */
  ['addr','Address'],           /* B15 */  ['ctl','Controller'],       /* C1 */
  ['authCL','AuthCL'],          /* C2 */   ['authOther','AuthOther'],  /* C3 */
  ['balAsOn','BalAsOn'],        /* D1 */   ['el','ELCredit'],          /* D2 */
  ['hpl','HPLCredit'],          /* D3 */   ['clUsed','CLUsed'],        /* D4 */
  ['ohUsed','OHUsed'],          /* D5 */   ['cclUsed','CCLUsed'],      /* D6 */
  ['children','Children'],      /* D7 */   ['verifiedBy','VerifiedBy'],/* D8 */
  ['verifiedOn','VerifiedOn'],  /* D9 */   ['remarks','HrRemarks']     /* R1 */
];
var HRMS_BASE_HEAD = HRMS_BASE_MAP.map(function(x){ return x[1]; });
var HRMS_DATE_KEYS = { dob:1, entered:1, post:1, district:1, balAsOn:1, verifiedOn:1 };
var HRMS_NUM_KEYS  = { el:1, hpl:1, clUsed:1, ohUsed:1, cclUsed:1, children:1 };
/* how long the office calendar is remembered, per scope */
var HRMS_CAL_CACHE_S = 600;

/* A DATE ARRIVES THREE WAYS and is kept one way. The console pastes what Excel
   displays — 15-06-1972, or 15.06.1972 on a machine set that way — a reader of
   the workbook sends the serial Excel stores, and a re-paste of the register's
   own export sends ISO. Anything else is not a date and is kept as nothing
   rather than guessed at: a wrong date of birth is a wrong superannuation. */
function hrmsDate_(v){
  if(v == null || v === '') return '';
  if(v instanceof Date) return dateText_(v);
  var s = String(v).trim().replace(/^'/, '');
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
  if(m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  if(/^\d{4,6}(\.\d+)?$/.test(s)){                       /* an Excel serial: days since 30.12.1899 */
    var n = Number(s); if(n > 20000 && n < 80000){
      var d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
      return d.toISOString().slice(0, 10); }
  }
  return '';
}
function hrmsNum_(v){
  if(v == null || v === '') return '';
  var n = Number(String(v).trim().replace(/,/g, '')); return isFinite(n) ? n : '';
}
/* the base columns, by header, read off the roll's own first row */
function hrmsBaseIx_(t){
  var w = Math.max(t.sh.getLastColumn(), 1);
  var head = t.sh.getRange(1, 1, 1, w).getValues()[0]
    .map(function(h){ return String(h).toLowerCase().replace(/[^a-z]/g, ''); });
  var ix = {};
  HRMS_BASE_MAP.forEach(function(x){ ix[x[0]] = head.indexOf(x[1].toLowerCase()); });
  return ix;
}
/* what the office sent of the Base Format, normalised; null when the paste
   was the older five-column officers list and carries none of it */
function hrmsBase_(r){
  var out = null;
  HRMS_BASE_MAP.forEach(function(x){
    var k = x[0]; if(r[k] == null || String(r[k]).trim() === '') return;
    var val = HRMS_DATE_KEYS[k] ? hrmsDate_(r[k]) : HRMS_NUM_KEYS[k] ? hrmsNum_(r[k]) : String(r[k]).trim().slice(0, 300);
    if(val === '') return;
    out = out || {}; out[k] = val;
  });
  /* THE VERIFICATION DATE STANDS IN FOR A BLANK BALANCE DATE: the format asks
     for both and a hundred rows gave only the second. The figures were
     verified on that day, so that is the day they stand as on. */
  if(out && !out.balAsOn && out.verifiedOn) out.balAsOn = out.verifiedOn;
  return out;
}

var HRMS_CODE_HEAD  = 'EnrolCode';
var HRMS_CODE_CHARS = 'ACDEFGHJKLMNPQRTUVWXYZ23469';
var HRMS_CODE_LEN   = 6;

function hrmsCode_(){
  var out = '';
  for(var i = 0; i < HRMS_CODE_LEN; i++)
    out += HRMS_CODE_CHARS.charAt(Math.floor(Math.random() * HRMS_CODE_CHARS.length));
  return out;
}

/* WHERE THE COLUMN IS, and WHETHER IT EXISTS, are two different questions,
   and they are asked by two different callers. hrmsPlan_ has to know whether a
   row already carries a code before it proposes issuing one — on a DRY run,
   which must write nothing, not even a header. So reading is read-only and
   making it is its own act, taken on the write path alone.
   It is NOT added to U_HEAD: that array is Code.gs's and is shared by three
   registers, and this column means nothing on the two whose PINs the Collector
   issues. A module makes its own room. */
function hrmsCodeIx_(t){
  if(t.ix.enrolcode != null) return t.ix.enrolcode;
  var w = Math.max(t.sh.getLastColumn(), 1);
  var head = t.sh.getRange(1, 1, 1, w).getValues()[0]
    .map(function(h){ return String(h).toLowerCase().replace(/[^a-z]/g, ''); });
  t.ix.enrolcode = head.indexOf('enrolcode');
  return t.ix.enrolcode;
}
function hrmsCodeCol_(t){
  if(hrmsCodeIx_(t) >= 0) return t.ix.enrolcode;
  ensureHeaders_(t.sh, [HRMS_CODE_HEAD]);
  t.ix.enrolcode = null;                       /* ask the sheet again */
  return hrmsCodeIx_(t);
}

/* the two things a row can be claimed with, read off the roll */
function hrmsFactors_(t, v, i){
  var ci = hrmsCodeIx_(t);
  return { emp: t.ix.empid >= 0 ? cell_(v[i], t.ix.empid) : '',
           code: ci >= 0 && v[i].length > ci ? cell_(v[i], ci) : '' };
}

function feature_hrms(){
  return {
    title: 'District HRMS — the leave register and its roll',
    tenants: ['HRMS'],

    post: {
      /* THE CLAIM IS NOT DECLARED HERE. It happens BEFORE auth_, so it is a
         line in doPost beside login and hrmsClaim_ below does the work;
         declaring it as a module kind as well had the registry refuse the
         whole module — "the register already answers kind claimPin" — which
         is the rule working, and is why nothing else of this module loaded
         on the first run. */

      /* THE ESTABLISHMENT, pasted by the office. Proposes before it writes,
         like every other paste on this console. */
      hrmsSeed: function(b, u){
        if(u.role !== 'COLLECTOR')
          return json_({ ok:false, error:'The establishment is seeded by the Collector alone.' });
        const rows = Array.isArray(b.rows) ? b.rows : [];
        if(!rows.length)
          return json_({ ok:false, error:'Nothing was pasted. An empty table is not an instruction to clear the roll.' });
        if(rows.length > 8000)
          return json_({ ok:false, error:'That is more rows than the district has employees. Nothing was read.' });

        const lock = LockService.getScriptLock();
        try{ lock.waitLock(30000); }
        catch(err){ return json_({ ok:false, error:'busy — try again' }); }
        try{
          const t = uidx_(), v = t.sh.getDataRange().getValues();
          /* A PASTE IS PLANNED AGAINST THE SHEET *AND AGAINST ITSELF*. Every
             row was read off one snapshot taken before anything was written,
             so a number appearing twice in the paste was absent from the
             snapshot both times and was registered TWICE — one number on two
             rows, which is what makes the app greet a man with somebody
             else's name, and which the claim would then settle by taking the
             first row it found. The district's own list of officers has four
             such numbers. Caught driving this paste against the real backend
             before it ever ran against the register. */
          const seen = {};
          const plans = rows.map(function(r){ return hrmsPlan_(t, v, r, seen); });
          if(b.dry) return json_({ ok:true, dry:true, plans:plans.slice(0, 2000),
                                   counts:hrmsCounts_(plans), total:plans.length });
          const done = hrmsWrite_(t, plans, u);
          /* THE CODES ARE PRINTED ONCE, in the answer to the call that made
             them, exactly as a PIN is. They are also readable afterwards from
             op=hrmsClaims while the row is still unclaimed, because an office
             loses a printed sheet and a re-paste would mint nothing (rule 8). */
          return json_({ ok:true, dry:false, counts:hrmsCounts_(plans), total:plans.length,
                         added:done.added, corrected:done.corrected, issued:done.issued });
        } finally { lock.releaseLock(); }
      }
    },

    get: {
      /* WHAT ONE EMPLOYEE SEES: his own applications and what the year has
         left him. Bounded — it never walks the whole register. */
      hrms: function(p, u){
        var rows = hrmsMine_(u.phone);
        var year = String(new Date().getFullYear());
        return json_({ ok:true, me:{ name:u.name, role:u.role, phone:u.phone,
                                     office:u.mandal, desig:u.desig || '' },
                       rows:rows,
                       /* HIS ACCOUNT, THE SANCTION'S OWN ARITHMETIC (18.10.2026): the
                          Service Register's figures where his office supplied them,
                          the pro-rated table where it did not, and what the register
                          has sanctioned since — the same leaveOpening_ the order
                          measures against, so the screen cannot argue with it. */
                       account:hrmsAccount_(u, rows, year),
                       record:hrmsRecord_(u.phone),
                       today:today_(),
                       holidays:hrmsHolidays_(year),
                       /* THE YEAR'S FIGURE, NOT THE TABLE'S. This sent
                          tenant_().entitlement — the full twelve months — so a
                          register adopted in October would have shown every
                          employee 15 days of casual leave and 30 of earned,
                          and only the sanction would have refused them. The
                          screen that tells a man what he has must be the same
                          arithmetic as the order that refuses him, or the
                          register argues with itself. entitlement_() is that
                          arithmetic: the opening balance for a part year, the
                          Collector's reduced optional holidays, and the table
                          only where neither applies. */
                       entitlement:(function(){
                         var y = String(new Date().getFullYear()), out = {};
                         Object.keys(tenant_().entitlement || {}).forEach(function(k){
                           out[k] = entitlement_(k, y); });
                         return out;
                       })(),
                       year:String(new Date().getFullYear()),
                       /* IT IS A LEAVE REGISTER AND NOTHING ELSE */
                       attendance:false, sanction:false });
      },

      /* WHO IS AWAY — the office's calendar for its head, the district's for the
         Collector (asked 18.10.2026: a heat map to each head of office of his
         own people on leave, and to the Collector on the home screen). A cell
         is the people whose SANCTIONED leave covers the day; nothing awaiting
         orders is on it. Bounded like everything else here: the tail of the
         Leave tab, folded by application, remembered ten minutes per scope. An
         employee is refused — his own days are already in his own rows. */
      hrmsCalendar: function(p, u){
        if(u.role !== 'COLLECTOR' && u.role !== 'HOD')
          return json_({ ok:false, error:'The calendar is read by the head of an office or the Collector.' });
        var year = Number(p.year); if(!(year > 2000 && year < 2100)) year = Number(String(today_()).slice(0, 4));
        return json_(hrmsCalendar_(u, year));
      },

      /* who has not yet claimed a PIN — the district's own rollout list */
      hrmsClaims: function(p, u){
        if(u.role !== 'COLLECTOR')
          return json_({ ok:false, error:'The roll is read by the Collector alone.' });
        const t = uidx_(), v = t.sh.getDataRange().getValues();
        let claimed = 0, waiting = 0;
        const open = [];
        for(let i = 1; i < v.length; i++){
          if(String(v[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
          const role = cell_(v[i], t.ix.role).toUpperCase();
          if(role === 'COLLECTOR') continue;
          const ph = phone10_(v[i][t.ix.phone]); if(!ph) continue;
          if(cell_(v[i], t.ix.hash)){ claimed++; continue; }
          waiting++;
          /* WITH WHAT HE CLAIMS IT WITH. The office has to put a code in a
             man's hand and will lose the sheet it was printed on; re-minting
             it would invalidate the one already given out. So the standing
             code is readable while the row is unclaimed, by the Collector's
             own token and nobody else's, and it goes the moment it is used. */
          const f = hrmsFactors_(t, v, i);
          if(open.length < 500) open.push({ name:cell_(v[i], t.ix.name), phone:ph,
            office:cell_(v[i], t.ix.mandal),
            desig: t.ix.designation >= 0 ? cell_(v[i], t.ix.designation) : '',
            emp:f.emp, code:f.code });
        }
        return json_({ ok:true, claimed:claimed, waiting:waiting, open:open });
      },

      /* WHAT IS AWAITING HIS ORDERS — and THE ORDERS ARE PASSED IN THE APP,
         which is where every order on every one of these registers is passed.
         The console only shows the waiting list; `leaveDecision` has always
         been the field app's. This register's app had no such screen at all,
         so there was no way on earth to sanction a single application on it.

         BOUNDED, like everything else here. The console's own payload reads
         the Leave tab whole, which is right at 284 officers and is not at five
         thousand — eight applications a year apiece is forty thousand rows,
         and the Collector opening his orders must not pay for the district's
         whole history to be loaded. */
      hrmsPending: function(p, u){
        if(!canApproveLeave_(u.role))
          return json_({ ok:false, error:'Leave is sanctioned by the Collector alone.' });
        const sh = sheet_('Leave', L_HEAD), m = headMap_(sh, L_HEAD);
        const lastRow = sh.getLastRow();
        if(lastRow < 2) return json_({ ok:true, rows:[], total:0 });
        const start = Math.max(2, lastRow - HRMS_TAIL_ROWS);
        const v = sh.getRange(start, 1, lastRow - start + 1, sh.getLastColumn()).getValues();
        const out = [];
        for(let i = 0; i < v.length; i++){
          const st = String(v[i][m.ix.status] || 'PENDING').toUpperCase();
          if(st !== 'PENDING') continue;
          const o = {};
          L_HEAD.forEach(function(k){ if(m.ix[k] >= 0) o[k] = v[i][m.ix[k]]; });
          o.fromDate = dateText_(o.fromDate); o.toDate = dateText_(o.toDate);
          /* the office against his name, so an order is passed on a person and
             not on a mobile number */
          const who = findByPhone_(o.phone);
          o.office = who ? (who.mandal || '') : '';
          o.desig  = who ? (who.desig || '') : '';
          out.push(o);
        }
        /* AN ORDER IS PASSED ON THE APPLICATION, NOT ON A ROW (25.08.2026):
           twins are folded on the way out so one application is one line. */
        const rows = leaveFold_ ? leaveFold_(out) : out;
        rows.sort(function(a, b){ return String(a.appliedAt).localeCompare(String(b.appliedAt)); });
        return json_({ ok:true, rows:rows.slice(0, 300), total:rows.length });
      }
    }
  };
}

/* ------------------------------------------------- the claim, before sign-in
   This is reached from doPost BEFORE auth_, because an employee claiming his
   row has no token yet — that is the whole point of it. It is the only
   unauthenticated write on this register and every guard it has is here. */
function hrmsClaim_(b){
  if(!tenant_().selfPin)
    return json_({ ok:false, error:'This register does not take a PIN chosen by the officer.' });
  const p = phone10_(b.u || '');
  const pin = String(b.pin || '').trim();
  const emp = String(b.emp || '').trim();
  if(p.length !== 10) return json_({ ok:false, error:'A mobile number is ten digits.' });
  if(!/^\d{4,8}$/.test(pin)) return json_({ ok:false, error:'A PIN is four to eight digits.' });

  /* A CLAIM IS RATE-LIMITED LIKE A SIGN-IN. Without it the employee id — four
     or six characters — could be guessed at leisure against a number read off
     any office noticeboard. Ten tries an hour, the same as a wrong PIN. */
  const rk = 'hc_' + p, n = Number(cache_().get(rk) || 0);
  if(n >= MAX_PIN_TRIES)
    return json_({ ok:false, error:'Too many attempts. Try again after an hour.' });

  const lock = LockService.getScriptLock();
  try{ lock.waitLock(20000); }
  catch(err){ return json_({ ok:false, error:'busy — try again' }); }
  try{
    const t = uidx_(), v = t.sh.getDataRange().getValues();
    const rows = [];
    for(let i = 1; i < v.length; i++) if(phone10_(v[i][t.ix.phone]) === p) rows.push(i);
    const live = rows.filter(function(i){
      return !(String(v[i][t.ix.active]).toUpperCase() === 'FALSE'); });

    /* THE SAME ANSWER WHETHER THE NUMBER IS ABSENT OR THE ID IS WRONG. A
       register that says "that number is not on the roll" tells whoever asked
       which numbers ARE, which is the district's establishment read back one
       guess at a time. */
    const refuse = function(){
      cache_().put(rk, String(n + 1), 3600);
      return json_({ ok:false, error:'That number and employee id do not match a row waiting to be claimed. ' +
        'Your office holds the establishment — ask it to check the number against your name, and ' +
        'for the employee id or the enrolment code it has for you.' });
    };
    if(!live.length) return refuse();
    if(live.some(function(i){ return !!cell_(v[i], t.ix.hash); }))
      return json_({ ok:false, already:true,
        error:'A PIN has already been set for this number. If it was not you, your office can have it reset.' });

    /* EITHER THE EMPLOYEE ID HIS OFFICE SEEDED, OR THE ENROLMENT CODE THIS
       REGISTER ISSUED BECAUSE THE OFFICE HAD NO ID TO SEED. One of the two
       must be on the row, or there is nothing to check against and the number
       alone would claim it — which is the whole thing this guard exists for. */
    const f = hrmsFactors_(t, v, live[0]);
    if(!f.emp && !f.code) return refuse();
    const by = pkey_(f.emp) && pkey_(f.emp) === pkey_(emp) ? 'employee id'
             : pkey_(f.code) && pkey_(f.code) === pkey_(emp) ? 'enrolment code' : '';
    if(!by) return refuse();

    const h = hash_(p, pin);
    const ci = hrmsCodeIx_(t);
    live.forEach(function(i){
      t.sh.getRange(i + 1, t.ix.hash + 1).setValue(h);
      if(t.ix.initpin >= 0) t.sh.getRange(i + 1, t.ix.initpin + 1).setValue('');
      /* THE CODE IS SPENT. It is a one-time token: left on the row it would
         be a standing second credential for a row that already has a PIN,
         sitting on a sheet the office photocopied. */
      if(ci >= 0) t.sh.getRange(i + 1, ci + 1).setValue('');
    });
    try{ cache_().remove(rk); }catch(err){}
    const name = cell_(v[live[0]], t.ix.name);
    /* the Audit tab records THAT a PIN was set, on which number and when —
       never the PIN, here as everywhere */
    admAudit_('HRMS ROW CLAIMED', p, name + ' set his own PIN · ' + live.length +
      ' row(s) · claimed with his ' + by);
    const who = findByPhone_(p);
    return json_({ ok:true, token:issueToken_(who), user:pub_(who) });
  } finally { lock.releaseLock(); }
}

/* ------------------------------------------------- one employee's own leave
   BOUNDED. Code.gs reads the Leave tab whole in four places, which is right at
   284 officers and is not at 5,000: eight applications a year apiece is forty
   thousand rows, and an employee opening his own screen must not pay for the
   whole district's history to be loaded. */
function hrmsMine_(phone){
  const sh = sheet_('Leave', L_HEAD), m = headMap_(sh, L_HEAD);
  const lastRow = sh.getLastRow();
  if(lastRow < 2) return [];
  const start = Math.max(2, lastRow - HRMS_TAIL_ROWS);
  const v = sh.getRange(start, 1, lastRow - start + 1, sh.getLastColumn()).getValues();
  const p = phone10_(phone), out = [];
  for(let i = 0; i < v.length; i++){
    if(phone10_(v[i][m.ix.phone]) !== p) continue;
    const o = {};
    L_HEAD.forEach(function(k){ if(m.ix[k] >= 0) o[k] = v[i][m.ix[k]]; });
    o.fromDate = dateText_(o.fromDate); o.toDate = dateText_(o.toDate);
    out.push(o);
  }
  /* one application is one line, whatever the register holds — the twin-row
     rule of 25.08.2026, which this register inherits with saveLeave_ */
  return leaveFold_ ? leaveFold_(out) : out;
}

/* ------------------------------------------------------------- the seeding
   Two shapes arrive here. The five-column officers list of 08.10.2026 —
   section, designation, name, mobile — and, from 18.10.2026, the BASE FORMAT
   the offices return: the same four and thirty-two more, the Service
   Register's own figures among them. One plan serves both: a row that carries
   base fields has them compared and written; a row that does not is the
   officers list exactly as before. */
function hrmsPlan_(t, v, r, seen){
  const name = String(r.name || '').trim();
  const office = String(r.office || '').trim();
  const desig = String(r.desig || '').trim();
  const emp = String(r.emp || '').trim();
  const email = String(r.email || '').trim();
  const phone = phone10_(r.phone || '');
  let role = String(r.role || 'EMP').trim().toUpperCase();
  const base = hrmsBase_(r);
  const out = { name:name, office:office, desig:desig, emp:emp, phone:phone, role:role, changes:[] };

  if(phone.length !== 10){ out.verdict = 'refused'; out.why = 'a mobile number is ten digits'; return out; }
  if(!name){ out.verdict = 'refused'; out.why = 'a name is needed — the roll is read by people'; return out; }
  if(!office){ out.verdict = 'refused'; out.why = 'an office is needed — leave is sanctioned through one'; return out; }
  /* A NAME THAT IS A POST IS NOT A PERSON. "AC (Rev.) Sir (I/c)" was on the
     district's list against the Welfare Officer's chair; leave is applied for
     by a person and the register must hold his name. */
  if(/\bsir\b/i.test(name)){ out.verdict = 'refused'; out.why = '"' + name + '" is a post and not a person — the officer\u2019s own name is needed'; return out; }
  /* AN EMPLOYEE ID IS WHAT HE CLAIMS HIS ROW WITH — AND WHERE THE OFFICE HAS
     NONE, AN ENROLMENT CODE IS. This used to be a refusal, and the district's
     own list of officers has no such column, so the whole establishment would
     have been refused a row at a time with nothing the office could do about
     it. The second factor is not dropped; it is issued. */
  if(!emp) out.issue = true;
  if(!rank_()[role]){ out.verdict = 'refused'; out.why = 'no such role on this register: ' + role; return out; }
  /* THE BASE FORMAT'S OWN COMPLETENESS, where it was sent: the mandatory
     columns the Field Guide marks in red. Missing ones are named, and the row
     still goes on — a man with a blank date of birth can still apply for a
     day's leave — but the office is told what to complete. */
  if(base){
    const miss = [];
    [['gender','gender'],['dob','date of birth'],['cat','employment category'],['dept','department'],
     ['place','place of working'],['gaz','gazetted or not'],['post','date of joining the present post'],
     ['status','present status'],['ctl','controlling officer'],['authCL','casual-leave authority'],
     ['authOther','other-leave authority'],['balAsOn','balance date'],['verifiedBy','who verified the Service Register']]
      .forEach(function(x){ if(!base[x[0]]) miss.push(x[1]); });
    if(!desig) miss.push('designation');
    if(miss.length) out.incomplete = miss;
    /* the balance date is what the opening figures hang on: without it they
       are figures as on nothing, and the sanction would read them as today's */
    if(!base.balAsOn && (base.el != null || base.hpl != null || base.clUsed != null || base.ohUsed != null || base.cclUsed != null)){
      out.verdict = 'refused'; out.why = 'leave balances were given with no date they stand as on (column D1) — the figures cannot be opened'; return out;
    }
    out.base = base;
  }

  /* the same number earlier in this very paste. A second CHARGE held by the
     same man is folded before it gets here — one employee is one leave
     account — so anything still duplicated is two names on one number, which
     is the district's to settle and not this register's to guess at. */
  if(seen && seen[phone]){
    out.verdict = 'refused';
    out.why = 'that number appears twice in what was pasted, against "' + seen[phone] +
      '" and "' + name + '". One number is one employee: settle which of the two holds it.';
    return out;
  }
  if(seen) seen[phone] = name;

  const mine = rollRows_(t, v, phone).filter(function(i){
    return !(String(v[i][t.ix.active]).toUpperCase() === 'FALSE'); });
  if(!mine.length){
    out.verdict = 'register';
    out.changes.push('added as ' + role + ' of ' + office);
    if(base) out.changes.push(base.balAsOn ? 'service record and balances as on ' + dmy_(base.balAsOn) : 'service record');
    if(out.issue) out.changes.push('an enrolment code will be issued');
    return out;
  }
  const was = cell_(v[mine[0]], t.ix.name);
  if(!postSameMan_(was, name)){
    out.verdict = 'refused';
    out.why = 'that number is on the roll as "' + was + '". One number is one employee: settle which of the two holds it.';
    return out;
  }
  out.row = mine[0] + 1;
  /* A HEAD OF OFFICE IS NOT DEMOTED BY HIS OWN OFFICE'S WORKBOOK. The 68
     district officers went on as HOD from the officers list; each appears
     again in his office's Base Format, where every row arrives as EMP. The
     higher standing stays, and the row gains his office and his record. */
  const wasRole = cell_(v[mine[0]], t.ix.role).toUpperCase();
  if((rank_()[wasRole] || 0) > (rank_()[role] || 0)){ role = wasRole; out.role = role; }
  if(was !== name) out.changes.push('name "' + was + '" → "' + name + '"');
  if(t.ix.mandal >= 0 && cell_(v[mine[0]], t.ix.mandal) !== office) out.changes.push('office → ' + office);
  if(t.ix.designation >= 0 && desig && cell_(v[mine[0]], t.ix.designation) !== desig) out.changes.push('designation → ' + desig);
  if(t.ix.empid >= 0 && emp && cell_(v[mine[0]], t.ix.empid) !== emp) out.changes.push('employee id → ' + emp);
  if(t.ix.email >= 0 && email && cell_(v[mine[0]], t.ix.email) !== email) out.changes.push('e-mail → ' + email);
  if(base){
    const bix = hrmsBaseIx_(t); let diff = 0;
    Object.keys(base).forEach(function(k){
      const i = bix[k]; const have = i >= 0 ? v[mine[0]][i] : undefined;
      const now = HRMS_DATE_KEYS[k] ? hrmsDate_(have) : String(have == null ? '' : have).trim();
      if(String(now) !== String(base[k])) diff++;
    });
    if(diff) out.changes.push(base.balAsOn ? 'service record and balances as on ' + dmy_(base.balAsOn) + ' (' + diff + ' field' + (diff === 1 ? '' : 's') + ')' : 'service record (' + diff + ' field' + (diff === 1 ? '' : 's') + ')');
  }
  /* A ROW ALREADY ON THE ROLL WITH NO WAY TO CLAIM IT gets a code on this
     paste rather than on a later one — the office pastes the list it has, and
     an employee who cannot claim his row is the fault being cured. Once: a
     row that already carries a code or a PIN is left alone (rule 8). */
  if(!emp && !cell_(v[mine[0]], t.ix.hash)){
    var f = hrmsFactors_(t, v, mine[0]);
    if(!f.emp && !f.code){ out.issue = true; out.row0 = mine[0];
      out.changes.push('an enrolment code will be issued'); }
  }
  out.verdict = out.changes.length ? 'correct' : 'unchanged';
  if(!out.changes.length) out.why = 'already on the roll, and nothing differs';
  return out;
}

function hrmsCounts_(plans){
  const c = { register:0, correct:0, unchanged:0, refused:0, incomplete:0 };
  plans.forEach(function(p){ if(c[p.verdict] != null) c[p.verdict]++; if(p.incomplete) c.incomplete++; });
  return c;
}

function hrmsWrite_(t, plans, u){
  const sh = t.sh;
  let added = 0, corrected = 0;
  const fresh = [], issued = [];
  /* the column before the first row is written, or a code would have nowhere
     to go and the office would be handed an establishment it cannot claim */
  const ci = plans.some(function(p){ return p.issue; }) ? hrmsCodeCol_(t) : -1;
  /* AND THE BASE FORMAT'S COLUMNS, only when a paste carries one — a register
     seeded from the officers list alone keeps its eleven columns */
  const anyBase = plans.some(function(p){ return p.base && p.verdict !== 'refused'; });
  if(anyBase) ensureHeaders_(sh, HRMS_BASE_HEAD);
  const bix = anyBase ? hrmsBaseIx_(t) : {};
  const width = Math.max(sh.getLastColumn(), U_HEAD.length);
  const putBase = function(row, base){
    Object.keys(base).forEach(function(k){
      const i = bix[k]; if(i == null || i < 0) return;
      while(row.length <= i) row.push('');
      row[i] = HRMS_DATE_KEYS[k] ? "'" + base[k] : base[k];
    });
  };
  /* CORRECTIONS GO BACK IN ONE BLOCK TOO. A thousand rows re-pasted with the
     Base Format is thirty cells each; written cell by cell that is thirty
     thousand round trips and an execution that dies half way through, leaving
     a roll nobody can tell the state of. The whole tab is read once, changed
     in memory and written once, under the lock the caller already holds. */
  const all = sh.getDataRange().getValues();
  let touched = false;
  plans.forEach(function(p){
    if(p.verdict === 'refused' || p.verdict === 'unchanged') return;
    if(p.verdict === 'register'){
      const row = new Array(width).fill('');
      const put = function(k, val){ if(t.ix[k] >= 0) row[t.ix[k]] = val; };
      put('phone', "'" + p.phone); put('name', p.name); put('role', p.role);
      put('mandal', p.office); put('gp', '');
      put('designation', p.desig); put('empid', p.emp);
      if(p.base) putBase(row, p.base);
      /* NO PIN. He sets his own, and a seeded PIN would be one more secret
         the office has to carry to five thousand people. */
      put('hash', ''); put('initpin', ''); put('active', 'TRUE');
      if(p.issue && ci >= 0){
        while(row.length <= ci) row.push('');
        p.code = hrmsCode_();
        row[ci] = p.code;
        issued.push({ name:p.name, office:p.office, desig:p.desig, phone:p.phone, code:p.code });
      }
      while(row.length < width) row.push('');
      fresh.push(row.slice(0, width));
      added++;
      return;
    }
    if(p.row){
      const i = p.row - 1, row = all[i];
      while(row.length < width) row.push('');
      if(t.ix.name >= 0 && p.name) row[t.ix.name] = p.name;
      if(t.ix.role >= 0 && p.role) row[t.ix.role] = p.role;
      if(t.ix.mandal >= 0 && p.office) row[t.ix.mandal] = p.office;
      if(t.ix.designation >= 0 && p.desig) row[t.ix.designation] = p.desig;
      if(t.ix.empid >= 0 && p.emp) row[t.ix.empid] = p.emp;
      if(p.base) putBase(row, p.base);
      if(p.issue && ci >= 0){
        p.code = hrmsCode_();
        while(row.length <= ci) row.push('');
        row[ci] = p.code;
        issued.push({ name:p.name, office:p.office, desig:p.desig, phone:p.phone, code:p.code });
      }
      /* the number keeps its apostrophe, or a re-written cell turns numeric */
      if(t.ix.phone >= 0 && /^\d+$/.test(String(row[t.ix.phone]))) row[t.ix.phone] = "'" + row[t.ix.phone];
      touched = true;
      corrected++;
    }
  });
  if(touched){
    const w2 = Math.max.apply(null, all.map(function(r){ return r.length; }).concat([width]));
    all.forEach(function(r){ while(r.length < w2) r.push(''); });
    sh.getRange(1, 1, all.length, w2).setValues(all);
  }
  /* WRITTEN IN ONE BLOCK. Five thousand appendRow calls is five thousand
     round trips to the Sheet and an execution that times out half way
     through, leaving an establishment nobody can tell the state of. */
  if(fresh.length){
    const at = sh.getLastRow() + 1;
    sh.getRange(at, 1, fresh.length, fresh[0].length).setValues(fresh);
  }
  /* the Audit tab records that codes were ISSUED and to how many — never one
     of them, exactly as it records that a PIN was set and never the PIN */
  admAudit_('HRMS ESTABLISHMENT SEEDED', tenant_().key,
    added + ' added · ' + corrected + ' corrected · ' + issued.length +
    ' enrolment code(s) issued' + (anyBase ? ' · with the Base Format' : '') + ' · by ' + u.name);
  return { added:added, corrected:corrected, issued:issued };
}

/* ----------------------------------------------------- his record and account
   WHAT THE SERVICE REGISTER SAYS OF HIM, off his own row: nothing another
   employee could read, because op=hrms answers the token's own officer alone. */
function hrmsRecord_(phone){
  const t = uidx_(), bix = hrmsBaseIx_(t);
  const v = t.sh.getDataRange().getValues(), p = phone10_(phone);
  for(let i = 1; i < v.length; i++){
    if(phone10_(v[i][t.ix.phone]) !== p) continue;
    if(String(v[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    const out = { empId: t.ix.empid >= 0 ? cell_(v[i], t.ix.empid) : '', email: t.ix.email >= 0 ? cell_(v[i], t.ix.email) : '' };
    Object.keys(bix).forEach(function(k){
      const j = bix[k]; if(j < 0) return;
      const raw = v[i][j];
      out[k] = HRMS_DATE_KEYS[k] ? hrmsDate_(raw) : HRMS_NUM_KEYS[k] ? hrmsNum_(raw) : String(raw == null ? '' : raw).trim();
    });
    /* superannuation at sixty-one, as the workbook's own column X1 computes it:
       the last day of the month the sixty-first birthday falls in, or the day
       before it when born on the first (the state's rule) */
    if(out.dob){
      const d = new Date(out.dob + 'T00:00:00Z');
      if(!isNaN(d)){
        const y = d.getUTCFullYear() + 61, m = d.getUTCMonth(), day = d.getUTCDate();
        const last = day === 1 ? new Date(Date.UTC(y, m, 0)) : new Date(Date.UTC(y, m + 1, 0));
        out.retire = last.toISOString().slice(0, 10);
      }
    }
    return out;
  }
  return null;
}

/* THE KINDS OF LEAVE AN EMPLOYEE IS OFFERED, and what each stands at. The
   sanction's own arithmetic (leaveOpening_ in Code.gs) is read first, so the
   figure on his screen is the figure the order will measure against; where
   his office has supplied no Service Register figure, the tenant's table —
   pro-rated for the opening year — stands as before. Half pay leave and child
   care leave are offered only where the record carries them: they are not on
   the tenant's table and a nought there would read as "none left". */
var HRMS_KINDS = ['CL','EL','HPL','OH','CCL','ML','HQ'];
function hrmsAccount_(u, rows, year){
  const y = String(year), out = { year:y, types:{} };
  const rec = hrmsRecord_(u.phone) || {};
  out.asOn = rec.balAsOn || ''; out.verifiedBy = rec.verifiedBy || ''; out.verifiedOn = rec.verifiedOn || '';
  const sinceOf = function(type, op, want){
    /* days of this kind sanctioned (or awaiting) after the balance date — in
       the year for the yearly kinds, whenever for a balance at credit */
    let n = 0;
    (rows || []).forEach(function(r){
      if(String(r.type).toUpperCase() !== type) return;
      if(String(r.status || 'PENDING').toUpperCase() !== want) return;
      const f = String(r.fromDate || '');
      if(op && f <= op.floor) return;
      if((!op || op.yearly) && f.slice(0, 4) !== y) return;
      n += type === 'HQ' ? 1 : (Number(r.days) || 0);
    });
    return n;
  };
  HRMS_KINDS.forEach(function(k){
    const op = leaveOpening_(u.phone, k, y);
    if(k === 'HPL' && !op) return;                                  /* not carried: not offered */
    if(k === 'CCL' && !op && String(rec.gender || '').toLowerCase() !== 'female') return;
    const cap = op ? op.cap : (k === 'HPL' ? 0 : k === 'CCL' ? CCL_TOTAL_DAYS : entitlement_(k, y));
    const used = (op ? op.used : 0) + sinceOf(k, op, 'APPROVED');
    const o = { cap:cap, used:used, left:cap > 0 ? Math.max(0, cap - used) : 0,
                awaiting:sinceOf(k, op, 'PENDING'), opening:op ? op.used : 0,
                credit:!!(op && op.credit), yearly: op ? !!op.yearly : (k === 'CL' || k === 'OH'),
                asOn: op ? op.asOn : '' };
    if(k === 'ML') o.spell = ML_MAX_SPELL;
    if(k === 'HQ') o.permission = true;
    out.types[k] = o;
  });
  return out;
}

/* the year's holidays, for the calendar on the phone — the order's dates and
   the Gregorian second Saturdays, as isWorkingDay_ reads them */
function hrmsHolidays_(year){
  const set = holidaySet_(), out = {};
  Object.keys(set).forEach(function(d){ if(d.slice(0, 4) === String(year) || d.slice(0, 4) === String(Number(year) + 1)) out[d] = set[d]; });
  return out;
}

/* ------------------------------------------------------------ who is away
   One walk of the Leave tab's tail, folded by application, for the year:
   per day, how many people's sanctioned leave covers it; who is away today;
   how many applications are waiting. The head of an office sees his office
   — the rows whose office is his — and the Collector the district. */
function hrmsCalendar_(u, year){
  const office = u.role === 'HOD' ? String(u.mandal || '') : '';
  const key = 'hrcal_' + (office ? 'o:' + office.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40) : 'd') + '_' + year;
  try{ const c = cache_().get(key); if(c) return JSON.parse(c); }catch(err){}
  const today = today_();
  const sh = sheet_('Leave', L_HEAD), m = headMap_(sh, L_HEAD);
  const lastRow = sh.getLastRow();
  const days = {}, away = [];
  let pending = 0;
  const same = function(a, b){ return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase(); };
  if(lastRow >= 2){
    const start = Math.max(2, lastRow - HRMS_TAIL_ROWS);
    const v = sh.getRange(start, 1, lastRow - start + 1, sh.getLastColumn()).getValues();
    /* AN ORDER IS PASSED ON THE APPLICATION, NOT ON A ROW (25.08.2026): an
       application may stand on two rows, one decided and its twin PENDING,
       and the DECIDED one is the application. Folded first, counted after —
       walked newest-first the PENDING twin was found first and the sanctioned
       leave under it vanished from the calendar. */
    const byId = {}, order = [];
    for(let i = 0; i < v.length; i++){
      const r = v[i];
      if(office && !same(r[m.ix.mandal], office)) continue;
      const id = String(r[m.ix.id] || '').trim(); if(!id) continue;
      const st0 = String(r[m.ix.status] || 'PENDING').toUpperCase();
      if(!byId[id]){ byId[id] = r; order.push(id); }
      else if(String(byId[id][m.ix.status] || 'PENDING').toUpperCase() === 'PENDING' && st0 !== 'PENDING') byId[id] = r;
    }
    for(let j = 0; j < order.length; j++){
      const r = byId[order[j]];
      const st = String(r[m.ix.status] || 'PENDING').toUpperCase();
      if(st === 'PENDING'){ pending++; continue; }
      if(st !== 'APPROVED') continue;
      const from = dateText_(r[m.ix.fromDate]), to = dateText_(r[m.ix.toDate]);
      let span = spanDays_(from, to); if(!(span > 0)) continue; if(span > 400) span = 400;
      const t0 = Date.parse(from + 'T00:00:00Z');
      for(let d = 0; d < span; d++){
        const dt = new Date(t0 + d * 86400000);
        if(dt.getUTCFullYear() !== year) continue;
        const k = dt.toISOString().slice(0, 10);
        days[k] = (days[k] || 0) + 1;
      }
      if(from <= today && to >= today && away.length < 80)
        away.push({ name:String(r[m.ix.name] || ''), type:String(r[m.ix.type] || ''), from:from, to:to,
                    office:String(r[m.ix.mandal] || '') });
    }
  }
  /* the roll the figure is read against */
  const t = uidx_(), uv = t.sh.getDataRange().getValues();
  let roll = 0; const ph = {};
  for(let i = 1; i < uv.length; i++){
    if(String(uv[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    const role = cell_(uv[i], t.ix.role).toUpperCase(); if(role === 'COLLECTOR') continue;
    if(office && !same(uv[i][t.ix.mandal], office)) continue;
    const p = phone10_(uv[i][t.ix.phone]); if(!p || ph[p]) continue; ph[p] = 1; roll++;
  }
  const out = { ok:true, year:year, today:today, scope: office ? 'office' : 'district', office:office,
                roll:roll, days:days, away:away, pending:pending, at:new Date().toISOString() };
  try{ cache_().put(key, JSON.stringify(out), HRMS_CAL_CACHE_S); }catch(err){}
  return out;
}

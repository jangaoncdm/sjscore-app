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
          const plans = rows.map(function(r){ return hrmsPlan_(t, v, r); });
          if(b.dry) return json_({ ok:true, dry:true, plans:plans.slice(0, 2000),
                                   counts:hrmsCounts_(plans), total:plans.length });
          const done = hrmsWrite_(t, plans, u);
          return json_({ ok:true, dry:false, counts:hrmsCounts_(plans), total:plans.length,
                         added:done.added, corrected:done.corrected });
        } finally { lock.releaseLock(); }
      }
    },

    get: {
      /* WHAT ONE EMPLOYEE SEES: his own applications and what the year has
         left him. Bounded — it never walks the whole register. */
      hrms: function(p, u){
        return json_({ ok:true, me:{ name:u.name, role:u.role, phone:u.phone,
                                     office:u.mandal, desig:u.desig || '' },
                       rows:hrmsMine_(u.phone),
                       entitlement:tenant_().entitlement,
                       year:String(new Date().getFullYear()),
                       /* IT IS A LEAVE REGISTER AND NOTHING ELSE */
                       attendance:false, sanction:false });
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
          if(open.length < 500) open.push({ name:cell_(v[i], t.ix.name), phone:ph,
            office:cell_(v[i], t.ix.mandal),
            desig: t.ix.designation >= 0 ? cell_(v[i], t.ix.designation) : '' });
        }
        return json_({ ok:true, claimed:claimed, waiting:waiting, open:open });
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
        'Your office holds the establishment; ask it to check the number and the id it has for you.' });
    };
    if(!live.length) return refuse();
    if(live.some(function(i){ return !!cell_(v[i], t.ix.hash); }))
      return json_({ ok:false, already:true,
        error:'A PIN has already been set for this number. If it was not you, your office can have it reset.' });

    const want = t.ix.empid >= 0 ? cell_(v[live[0]], t.ix.empid) : '';
    if(!want) return refuse();                 /* seeded without an id: nothing to check against */
    if(pkey_(want) !== pkey_(emp)) return refuse();

    const h = hash_(p, pin);
    live.forEach(function(i){
      t.sh.getRange(i + 1, t.ix.hash + 1).setValue(h);
      if(t.ix.initpin >= 0) t.sh.getRange(i + 1, t.ix.initpin + 1).setValue('');
    });
    try{ cache_().remove(rk); }catch(err){}
    const name = cell_(v[live[0]], t.ix.name);
    /* the Audit tab records THAT a PIN was set, on which number and when —
       never the PIN, here as everywhere */
    admAudit_('HRMS ROW CLAIMED', p, name + ' set his own PIN · ' + live.length + ' row(s)');
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

/* ------------------------------------------------------------- the seeding */
function hrmsPlan_(t, v, r){
  const name = String(r.name || '').trim();
  const office = String(r.office || '').trim();
  const desig = String(r.desig || '').trim();
  const emp = String(r.emp || '').trim();
  const phone = phone10_(r.phone || '');
  const role = String(r.role || 'EMP').trim().toUpperCase();
  const out = { name:name, office:office, desig:desig, emp:emp, phone:phone, role:role, changes:[] };

  if(phone.length !== 10){ out.verdict = 'refused'; out.why = 'a mobile number is ten digits'; return out; }
  if(!name){ out.verdict = 'refused'; out.why = 'a name is needed — the roll is read by people'; return out; }
  if(!office){ out.verdict = 'refused'; out.why = 'an office is needed — leave is sanctioned through one'; return out; }
  /* AN EMPLOYEE ID IS WHAT HE CLAIMS HIS ROW WITH. Seeded without one, he can
     never claim it and the office would have to reset a PIN for him by hand. */
  if(!emp){ out.verdict = 'refused'; out.why = 'an employee id is needed — it is what he claims his row with'; return out; }
  if(!rank_()[role]){ out.verdict = 'refused'; out.why = 'no such role on this register: ' + role; return out; }

  const mine = rollRows_(t, v, phone).filter(function(i){
    return !(String(v[i][t.ix.active]).toUpperCase() === 'FALSE'); });
  if(!mine.length){
    out.verdict = 'register';
    out.changes.push('added as ' + role + ' of ' + office);
    return out;
  }
  const was = cell_(v[mine[0]], t.ix.name);
  if(!postSameMan_(was, name)){
    out.verdict = 'refused';
    out.why = 'that number is on the roll as "' + was + '". One number is one employee: settle which of the two holds it.';
    return out;
  }
  out.row = mine[0] + 1;
  if(was !== name) out.changes.push('name "' + was + '" → "' + name + '"');
  if(t.ix.mandal >= 0 && cell_(v[mine[0]], t.ix.mandal) !== office) out.changes.push('office → ' + office);
  if(t.ix.designation >= 0 && desig && cell_(v[mine[0]], t.ix.designation) !== desig) out.changes.push('designation → ' + desig);
  if(t.ix.empid >= 0 && emp && cell_(v[mine[0]], t.ix.empid) !== emp) out.changes.push('employee id → ' + emp);
  out.verdict = out.changes.length ? 'correct' : 'unchanged';
  if(!out.changes.length) out.why = 'already on the roll, and nothing differs';
  return out;
}

function hrmsCounts_(plans){
  const c = { register:0, correct:0, unchanged:0, refused:0 };
  plans.forEach(function(p){ if(c[p.verdict] != null) c[p.verdict]++; });
  return c;
}

function hrmsWrite_(t, plans, u){
  const sh = t.sh;
  let added = 0, corrected = 0;
  const fresh = [];
  plans.forEach(function(p){
    if(p.verdict === 'refused' || p.verdict === 'unchanged') return;
    if(p.verdict === 'register'){
      const width = Math.max(sh.getLastColumn(), U_HEAD.length);
      const row = new Array(width).fill('');
      const put = function(k, val){ if(t.ix[k] >= 0) row[t.ix[k]] = val; };
      put('phone', "'" + p.phone); put('name', p.name); put('role', p.role);
      put('mandal', p.office); put('gp', '');
      put('designation', p.desig); put('empid', p.emp);
      /* NO PIN. He sets his own, and a seeded PIN would be one more secret
         the office has to carry to five thousand people. */
      put('hash', ''); put('initpin', ''); put('active', 'TRUE');
      fresh.push(row);
      added++;
      return;
    }
    if(p.row){
      const i = p.row - 1;
      if(t.ix.name >= 0 && p.name) sh.getRange(i + 1, t.ix.name + 1).setValue(p.name);
      if(t.ix.mandal >= 0 && p.office) sh.getRange(i + 1, t.ix.mandal + 1).setValue(p.office);
      if(t.ix.designation >= 0 && p.desig) sh.getRange(i + 1, t.ix.designation + 1).setValue(p.desig);
      if(t.ix.empid >= 0 && p.emp) sh.getRange(i + 1, t.ix.empid + 1).setValue(p.emp);
      corrected++;
    }
  });
  /* WRITTEN IN ONE BLOCK. Five thousand appendRow calls is five thousand
     round trips to the Sheet and an execution that times out half way
     through, leaving an establishment nobody can tell the state of. */
  if(fresh.length){
    const at = sh.getLastRow() + 1;
    sh.getRange(at, 1, fresh.length, fresh[0].length).setValues(fresh);
  }
  admAudit_('HRMS ESTABLISHMENT SEEDED', tenant_().key,
    added + ' added · ' + corrected + ' corrected · by ' + u.name);
  return { added:added, corrected:corrected };
}

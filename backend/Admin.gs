/* ============================================================================
 * SJGP · Admin.gs — district maintenance toolkit
 * ----------------------------------------------------------------------------
 * A SEPARATE FILE ON PURPOSE. Code.gs is replaced whole at every upgrade;
 * this one is not, so the maintenance work lives here and survives.
 * In Apps Script every file shares one global scope, so the helpers in
 * Code.gs (sheet_, headMap_, phone10_, hash_, today_ …) are available here.
 *
 * THE STANDING RULE OF THIS FILE: nothing is destroyed. Every function
 * writes what it did to the Audit tab, and a withdrawn evaluation is moved
 * to the Voided tab before it leaves Inspections. A record can always be
 * produced afterwards showing what was changed, by whom, and when.
 *
 * READ FIRST, THEN WRITE. Every task has a dry-run twin whose name begins
 * with "show" or "audit". Run that, read the log, then run the doer.
 * ========================================================================== */

/* Who is signing these actions — appears against every audit line. */
const ADMIN_BY = 'Collector & District Magistrate, Jangaon (Admin.gs)';

/* ---------------------------------------------------------------------------
 * 1. REGISTRATION — officers whose number is not on the roll
 * Fill the table, run showRegistrations() to check, then registerOfficers().
 * PIN: leave blank and a four-digit one is generated and shown in the log.
 * ------------------------------------------------------------------------- */
const TO_REGISTER = [
  /* phone,        name,                  role,  mandal,            gp,               email, pin */
  { phone:'9281481690', name:'',            role:'MPDO', mandal:'Tharigoppula', gp:'',              email:'', pin:'' },
  { phone:'9553399695', name:'P Madhavi',   role:'PS',   mandal:'Chilpur',      gp:'Chinnapendyal', email:'', pin:'' }
];

/* ---------------------------------------------------------------------------
 * 2. RE-MAPPING — Secretaries moved between Gram Panchayats
 * "gp" is the village the officer is to hold FROM NOW ON.
 * ------------------------------------------------------------------------- */
const TO_REMAP = [
  { phone:'8978394484', name:'A. Narmada',             gp:'Dharmapuram',      mandal:'Devaruppula',     note:'was showing Dharmagadda Thanda' },
  { phone:'7680966701', name:'L Mahesh',               gp:'Cheeturu',         mandal:'Lingala Ghanpur', note:'transferred from Ramachandru Gudem' },
  { phone:'8008756396', name:'Virri Srinivas Reddy',   gp:'Ramachandru Gudem',mandal:'Lingala Ghanpur', note:'transferred from Cheeturu' },
  { phone:'9966043654', name:'Gandi Jesumani',         gp:'Krishnajigudem',   mandal:'Chilpur',         note:'transferred to Krishnajigudem' }
  /* Amarender Reddy and Bheemagoni Madhu are NOT here on purpose —
     the issue sheet contradicts itself on those two. See CONTESTED below. */
];

/* The two rows whose Remarks and Action columns disagree. Read the note,
   settle it, move the correct line into TO_REMAP above, and delete this. */
const CONTESTED = [
  { phone:'9701790018', name:'Gottam Amarender Reddy',
    perAssignmentAndRemark:'Manikyapuram', perActionColumn:'Nagaram' },
  { phone:'9885248045', name:'Bheemagoni Madhu',
    perAssignmentAndRemark:'Nagaram',      perActionColumn:'Manikyapuram' }
];

/* ---------------------------------------------------------------------------
 * 3. WITHDRAWING EVALUATIONS FILED FROM A SECRETARY'S LOGIN
 * Do not type village names — run auditPsSubmissions() and it finds every
 * one from the role stamped on the row itself.
 * ------------------------------------------------------------------------- */

function admLog_(action, subject, detail){
  const sh = sheet_('Audit', ['at','action','subject','detail','by']);
  sh.appendRow([new Date().toISOString(), action, subject, detail, ADMIN_BY]);
}
function admRand_(){ return String(Math.floor(1000 + Math.random() * 9000)); }

/* ---- 1. registration ---------------------------------------------------- */
function showRegistrations(){
  const t = uidx_(), v = t.sh.getDataRange().getValues();
  const on = {};
  for(let i = 1; i < v.length; i++){ const p = phone10_(v[i][t.ix.phone]); if(p) on[p] = cell_(v[i], t.ix.name) || '(unnamed)'; }
  TO_REGISTER.forEach(r => {
    const p = phone10_(r.phone);
    const bad = [];
    if(p.length !== 10) bad.push('the number is not ten digits');
    if(!String(r.name || '').trim()) bad.push('NO NAME GIVEN — a login cannot be raised without one');
    if(on[p]) bad.push('already on the roll as ' + on[p]);
    Logger.log((bad.length ? '\u2717 ' : '\u2713 ') + p + ' ' + (r.name || '(no name)') + ' \u2014 ' + r.role +
               ', ' + r.mandal + (r.gp ? ' / ' + r.gp : '') + (bad.length ? '  \u2190 ' + bad.join('; ') : ''));
  });
  Logger.log('\nNothing has been written. Fix anything marked \u2717, then run registerOfficers().');
}
function registerOfficers(){
  const t = uidx_(), v = t.sh.getDataRange().getValues();
  const on = {};
  for(let i = 1; i < v.length; i++){ const p = phone10_(v[i][t.ix.phone]); if(p) on[p] = true; }
  let n = 0;
  TO_REGISTER.forEach(r => {
    const p = phone10_(r.phone);
    if(p.length !== 10 || !String(r.name || '').trim() || on[p]){
      Logger.log('skipped ' + p + ' \u2014 run showRegistrations() to see why'); return;
    }
    const pin = String(r.pin || '').trim() || admRand_();
    const row = new Array(Math.max(t.sh.getLastColumn(), U_HEAD.length)).fill('');
    const put = (k, val) => { if(t.ix[k] >= 0) row[t.ix[k]] = val; };
    put('phone', "'" + p); put('name', r.name); put('role', r.role);
    put('mandal', r.mandal || ''); put('gp', r.gp || ''); put('email', r.email || '');
    put('hash', hash_(p, pin)); put('initpin', ''); put('active', 'TRUE');
    t.sh.appendRow(row);
    admLog_('REGISTER', r.name + ' (' + p + ')', r.role + ' \u00b7 ' + (r.mandal || '') + (r.gp ? ' / ' + r.gp : ''));
    Logger.log('\u2713 ' + r.name + ' \u2014 ' + p + ' \u2014 PIN ' + pin + '  (give this to the officer; it can be changed in the app)');
    n++;
  });
  Logger.log('\n' + n + ' officer(s) registered. The PINs above are shown ONCE \u2014 note them now.');
}

/* ---- 2. re-mapping ------------------------------------------------------ */
function showRemaps(){
  const t = uidx_(), v = t.sh.getDataRange().getValues();
  TO_REMAP.forEach(r => {
    const p = phone10_(r.phone);
    let found = 0, was = '';
    for(let i = 1; i < v.length; i++) if(phone10_(v[i][t.ix.phone]) === p){ found++; was = cell_(v[i], t.ix.gp); }
    Logger.log((found === 1 ? '\u2713 ' : '\u2717 ') + p + ' ' + r.name + ': ' +
      (found === 0 ? 'NOT ON THE ROLL \u2014 register first' :
       found > 1  ? found + ' rows carry this number \u2014 fix the duplicates by hand first' :
       '"' + was + '"  \u2192  "' + r.gp + '"' + (was === r.gp ? '   (already correct)' : '')));
  });
  if(CONTESTED.length){
    Logger.log('\nNOT BEING TOUCHED \u2014 the issue sheet contradicts itself:');
    CONTESTED.forEach(c => Logger.log('  ' + c.name + ' (' + c.phone + '): the Village column and the Remark both say ' +
      c.perAssignmentAndRemark + ', but the Action column says ' + c.perActionColumn + '. Settle it, then add the correct line to TO_REMAP.'));
  }
  Logger.log('\nNothing has been written. Run remapSecretaries() when the above reads correctly.');
}
function remapSecretaries(){
  const t = uidx_(), v = t.sh.getDataRange().getValues();
  let n = 0;
  TO_REMAP.forEach(r => {
    const p = phone10_(r.phone);
    const at = [];
    for(let i = 1; i < v.length; i++) if(phone10_(v[i][t.ix.phone]) === p) at.push(i + 1);
    if(at.length !== 1){ Logger.log('skipped ' + p + ' \u2014 ' + at.length + ' matching row(s)'); return; }
    const was = String(t.sh.getRange(at[0], t.ix.gp + 1).getValue() || '');
    if(was === r.gp){ Logger.log('\u2014 ' + r.name + ' already holds ' + r.gp); return; }
    t.sh.getRange(at[0], t.ix.gp + 1).setValue(r.gp);
    if(r.mandal && t.ix.mandal >= 0) t.sh.getRange(at[0], t.ix.mandal + 1).setValue(r.mandal);
    admLog_('REMAP', r.name + ' (' + p + ')', was + ' \u2192 ' + r.gp + (r.note ? ' \u00b7 ' + r.note : ''));
    Logger.log('\u2713 ' + r.name + ': ' + was + ' \u2192 ' + r.gp);
    n++;
  });
  Logger.log('\n' + n + ' mapping(s) changed. The officer sees the new village at the next sign-in or refresh.');
}

/* ---- 3. evaluations filed from a Secretary's login ---------------------- */
/* The role is stamped on every inspection row when it is filed, so this
   finds them all — including any the mandals have not reported. */
function auditPsSubmissions(){
  const sh = sheet_('Inspections', HEADERS), m = headMap_(sh, HEADERS);
  const v = sh.getDataRange().getValues();
  const hits = [];
  for(let i = 1; i < v.length; i++){
    if(!viewerRole_(String(v[i][m.ix.role] || ''))) continue;
    hits.push({ row:i + 1, id:cell_(v[i], m.ix.id), ym:cell_(v[i], m.ix.ym), mandal:cell_(v[i], m.ix.mandal),
                gp:cell_(v[i], m.ix.gp), score:v[i][m.ix.score], officer:cell_(v[i], m.ix.officer) });
  }
  if(!hits.length){ Logger.log('No evaluation on the register was filed from a Secretary\u2019s login. Nothing to withdraw.'); return; }
  Logger.log(hits.length + ' evaluation(s) filed from a Secretary\u2019s login:\n');
  hits.forEach(h => Logger.log('  ' + h.gp + ' (' + h.mandal + ') \u00b7 ' + h.ym + ' \u00b7 score ' + h.score +
                               ' \u00b7 by ' + h.officer + '\n      id ' + h.id));
  Logger.log('\nTo withdraw ALL of them:  voidPsSubmissions()\n' +
             'To withdraw one:          voidInspectionById("<the id above>")\n' +
             'Each is copied to the Voided tab first \u2014 nothing is destroyed.');
}
function voidInspection_(sh, m, rowAt, why){
  const row = sh.getRange(rowAt, 1, 1, sh.getLastColumn()).getValues()[0];
  const vsh = sheet_('Voided', HEADERS.concat(['voidedAt','voidedBy','reason']));
  if(vsh.getLastRow() === 0) vsh.appendRow(HEADERS.concat(['voidedAt','voidedBy','reason']));
  vsh.appendRow(row.concat([new Date().toISOString(), ADMIN_BY, why]));
  admLog_('VOID EVALUATION', cell_(row, m.ix.gp) + ' \u00b7 ' + cell_(row, m.ix.ym),
          'id ' + cell_(row, m.ix.id) + ' \u00b7 score ' + row[m.ix.score] + ' \u00b7 filed by ' + cell_(row, m.ix.officer) + ' \u00b7 ' + why);
  sh.deleteRow(rowAt);
}
function voidPsSubmissions(){
  const sh = sheet_('Inspections', HEADERS), m = headMap_(sh, HEADERS);
  let n = 0;
  /* bottom upwards, so deleting a row cannot shift the ones still to check */
  for(let i = sh.getLastRow(); i >= 2; i--){
    const role = String(sh.getRange(i, m.ix.role + 1).getValue() || '');
    if(!viewerRole_(role)) continue;
    voidInspection_(sh, m, i, 'Filed from a Secretary\u2019s login; evaluations are filed by the Mandal Sanitation Task Force');
    n++;
  }
  Logger.log(n + ' evaluation(s) withdrawn to the Voided tab. District and mandal averages recompute on the next console refresh.');
}
function voidInspectionById(id){
  const want = String(id || '').trim();
  if(!want){ Logger.log('Give the id: voidInspectionById("...")'); return; }
  const sh = sheet_('Inspections', HEADERS), m = headMap_(sh, HEADERS);
  for(let i = sh.getLastRow(); i >= 2; i--){
    if(String(sh.getRange(i, m.ix.id + 1).getValue()) !== want) continue;
    voidInspection_(sh, m, i, 'Withdrawn by order of the Collector');
    Logger.log('Withdrawn to the Voided tab: ' + want);
    return;
  }
  Logger.log('No evaluation on the register carries that id.');
}

/* ---- the whole morning's work, read-only ------------------------------- */
function showAllPendingFixes(){
  Logger.log('=== REGISTRATIONS ==='); showRegistrations();
  Logger.log('\n=== RE-MAPPINGS ==='); showRemaps();
  Logger.log('\n=== EVALUATIONS FILED FROM A SECRETARY\u2019S LOGIN ==='); auditPsSubmissions();
  Logger.log('\nNothing above has been written. The doers are: registerOfficers(), remapSecretaries(), voidPsSubmissions().');
}

/* ============================================================================
 * 4. WRONGLY-SERVED NOTICES — the 6.7 sync-lag defect
 * ----------------------------------------------------------------------------
 * Until 6.7.1 the day was read at 11:15. A mark is written on the phone first
 * and reaches the Sheet only when the upload gets through, so on weak signal
 * an officer could mark at 10:46, see a green banner, and still be absent from
 * the Sheet at 11:15. Those officers were served show-cause notices they did
 * not deserve.
 *
 * These two functions find every such notice by PROOF — an attendance row now
 * exists on the Sheet for that officer for that very date — and withdraw it,
 * reversing any leave that was debited against it.
 *
 *   auditWrongNotices()      read-only; lists them with the mark time
 *   withdrawWrongNotices()   withdraws, reverses the debit, writes the Audit
 *
 * A withdrawn notice unlocks the officer's app at his next refresh.
 * ========================================================================== */
function admWrongList_(){
  const sh = sheet_('Notices', N_HEAD), m = headMap_(sh, N_HEAD);
  const v = sh.getDataRange().getValues();
  const ash = sheet_('Attendance', A_HEAD), am = headMap_(ash, A_HEAD);
  const av = ash.getDataRange().getValues();
  const marks = {};                       /* phone|date -> the time it was marked */
  for(let i = 1; i < av.length; i++){
    const p = phone10_(av[i][am.ix.phone]), d = dateText_(av[i][am.ix.date]);
    if(p && d) marks[p + '|' + d] = String(av[i][am.ix.markedAt] || av[i][am.ix.receivedAt] || '');
  }
  const out = [];
  for(let i = 1; i < v.length; i++){
    const st = String(v[i][m.ix.status] || '');
    if(st !== 'PENDING' && st !== 'ACK' && st !== 'PROPOSED') continue;
    const p = phone10_(v[i][m.ix.phone]), d = dateText_(v[i][m.ix.date]);
    const key = p + '|' + d;
    if(!(key in marks)) continue;         /* no attendance — the notice stands */
    out.push({ row:i + 1, id:cell_(v[i], m.ix.id), no:cell_(v[i], m.ix.no) || '(unnumbered)',
               date:d, phone:p, name:cell_(v[i], m.ix.name), role:cell_(v[i], m.ix.role),
               mandal:cell_(v[i], m.ix.mandal), status:st, markedAt:marks[key],
               debited:String(v[i][m.ix.clDebited]).toUpperCase() === 'TRUE',
               leaveId:cell_(v[i], m.ix.leaveId) });
  }
  return out;
}
function auditWrongNotices(){
  const bad = admWrongList_();
  if(!bad.length){
    Logger.log('No notice on the register belongs to an officer who has attendance for that date. Nothing to withdraw.');
    return;
  }
  Logger.log(bad.length + ' notice(s) served or proposed against officers who DID mark attendance:\n');
  bad.forEach(b => Logger.log('  ' + b.no + ' \u00b7 ' + b.name + ' (' + b.role + ', ' + b.mandal + ') for ' + b.date +
    '\n      status ' + b.status + (b.debited ? ' \u00b7 ONE DAY OF LEAVE DEBITED' : '') +
    '\n      attendance on the Sheet, marked ' + (b.markedAt || 'time not recorded')));
  Logger.log('\nRun withdrawWrongNotices() to withdraw all of these, reverse any leave debited,' +
             '\nand unlock those officers\u2019 apps. Nothing is destroyed \u2014 the rows stay on the' +
             '\nregister marked WITHDRAWN, and the Audit tab carries the reason.');
}
function withdrawWrongNotices(){
  const bad = admWrongList_();
  if(!bad.length){ Logger.log('Nothing to withdraw.'); return; }
  const sh = sheet_('Notices', N_HEAD), m = headMap_(sh, N_HEAD);
  const lsh = sheet_('Leave', L_HEAD), lm = headMap_(lsh, L_HEAD);
  const now = new Date().toISOString();
  let n = 0, reversed = 0;
  bad.forEach(b => {
    sh.getRange(b.row, m.ix.status + 1).setValue('WITHDRAWN');
    sh.getRange(b.row, m.ix.decidedBy + 1).setValue('WITHDRAWN \u00b7 attendance was on record; notice issued in error');
    sh.getRange(b.row, m.ix.decidedAt + 1).setValue(now);
    /* reverse the debit: the system's own leave row is cancelled, not deleted */
    if(b.debited && b.leaveId){
      const lv = lsh.getDataRange().getValues();
      for(let i = 1; i < lv.length; i++){
        if(cell_(lv[i], lm.ix.id) !== b.leaveId) continue;
        lsh.getRange(i + 1, lm.ix.status + 1).setValue('CANCELLED');
        lsh.getRange(i + 1, lm.ix.remarks + 1).setValue('Reversed \u2014 the officer had marked attendance on ' + b.date +
          '; the notice was issued in error under the pre-6.7.1 timing and stands withdrawn.');
        lsh.getRange(i + 1, lm.ix.decidedBy + 1).setValue(ADMIN_BY);
        lsh.getRange(i + 1, lm.ix.decidedAt + 1).setValue(now);
        reversed++; break;
      }
      sh.getRange(b.row, m.ix.clDebited + 1).setValue('REVERSED');
    }
    admLog_('WITHDRAW NOTICE', b.name + ' (' + b.phone + ')',
            b.no + ' for ' + b.date + ' \u2014 attendance was on record, marked ' + (b.markedAt || 'time not recorded') +
            (b.debited ? '; one day of leave reversed' : ''));
    n++;
  });
  Logger.log(n + ' notice(s) withdrawn' + (reversed ? '; ' + reversed + ' leave debit(s) reversed to CANCELLED' : '') + '.');
  Logger.log('Those officers\u2019 apps unlock at their next refresh. The register shows WITHDRAWN,');
  Logger.log('the Audit tab carries the reason, and nothing has been deleted.');
  Logger.log('\nConsider a line to the mandals: the notices were issued in error by the system\u2019s');
  Logger.log('old mid-morning cutoff, stand withdrawn, and no leave has been lost.');
}

/* ============================================================================
 * 5. SANITY AUDIT — one read-only pass over the whole register
 * ----------------------------------------------------------------------------
 * Run sanityAudit() from the editor. It writes NOTHING. It walks the live
 * Sheet and reports, in the Execution log:
 *   A. Leave accounts: each officer's CL for the year against entitlement —
 *      and flags any officer whose APPROVED CL exceeds it (the only way the
 *      display blunder could have left a real mark).
 *   B. Duplicate leave rows (same officer, overlapping APPROVED dates).
 *   C. Notices: PENDING with no number, served rows whose officer has
 *      attendance that day (wrongly served), debit flags with no leave row,
 *      and leave debits with no notice.
 *   D. Attendance: duplicate rows per officer per day, future-dated marks,
 *      and handsets whose clocks are worst.
 *   E. Roll: duplicate phones, officers with no mandal, inactive rows that
 *      still hold notices or leave PENDING.
 * The log is the report; nothing is changed.
 * ========================================================================== */
function sanityAudit(){
  const yr = Number(today_().slice(0, 4));
  const L = [];
  const say = m => L.push(m);

  /* ---- A + B · leave ---- */
  const lsh = sheet_('Leave', L_HEAD), lm = headMap_(lsh, L_HEAD);
  const lv = lsh.getDataRange().getValues();
  const acct = {}, spans = {};
  for(let i = 1; i < lv.length; i++){
    const ph = phone10_(lv[i][lm.ix.phone]); if(!ph) continue;
    const type = String(lv[i][lm.ix.type] || ''), st = String(lv[i][lm.ix.status] || '');
    const f = dateText_(lv[i][lm.ix.fromDate]), t = dateText_(lv[i][lm.ix.toDate]);
    if(st === 'APPROVED' && type === 'CL' && String(f).slice(0,4) === String(yr)){
      acct[ph] = acct[ph] || { name:cell_(lv[i], lm.ix.name), used:0 };
      acct[ph].used += Number(lv[i][lm.ix.days]) || 0;
    }
    if(st === 'APPROVED' && f && t){
      spans[ph] = spans[ph] || [];
      spans[ph].push({ f:f, t:t, id:cell_(lv[i], lm.ix.id), name:cell_(lv[i], lm.ix.name) });
    }
  }
  const ent = entitlement_('CL', yr);
  const over = Object.keys(acct).filter(p => acct[p].used > ent);
  say('A. LEAVE ACCOUNTS \u00b7 CL entitlement ' + ent + ' for ' + yr);
  say(over.length
    ? '   \u2717 ' + over.length + ' officer(s) hold MORE approved CL than the entitlement \u2014 examine these by hand:\n' +
      over.map(p => '     ' + acct[p].name + ' (' + p + '): ' + acct[p].used + ' days').join('\n')
    : '   \u2713 no officer\u2019s approved CL exceeds the entitlement \u2014 the display blunder left no mark on the register.');
  let overlaps = 0, overlapTxt = [];
  Object.keys(spans).forEach(p => {
    const s = spans[p].sort((a,b) => a.f < b.f ? -1 : 1);
    for(let i = 1; i < s.length; i++)
      if(s[i].f <= s[i-1].t){ overlaps++;
        if(overlapTxt.length < 15) overlapTxt.push('     ' + s[i].name + ' (' + p + '): ' + s[i-1].id + ' and ' + s[i].id + ' overlap'); }
  });
  say('B. OVERLAPPING APPROVED LEAVE');
  say(overlaps ? '   \u2717 ' + overlaps + ' overlap(s):\n' + overlapTxt.join('\n')
               : '   \u2713 no officer holds two approved leaves over the same day.');

  /* ---- C · notices vs attendance vs debits ---- */
  const nsh = sheet_('Notices', N_HEAD), nm = headMap_(nsh, N_HEAD);
  const nv = nsh.getDataRange().getValues();
  const marks = {};
  const ash = sheet_('Attendance', A_HEAD), am = headMap_(ash, A_HEAD);
  const av = ash.getDataRange().getValues();
  const dayRows = {};
  for(let i = 1; i < av.length; i++){
    const p = phone10_(av[i][am.ix.phone]), d = dateText_(av[i][am.ix.date]);
    if(!p || !d) continue;
    marks[p + '|' + d] = true;
    dayRows[p + '|' + d] = (dayRows[p + '|' + d] || 0) + 1;
  }
  const leaveIds = {};
  for(let i = 1; i < lv.length; i++) leaveIds[cell_(lv[i], lm.ix.id)] = String(lv[i][lm.ix.status] || '');
  let unnumbered = 0, wrongServed = [], debitNoLeave = [], orphanDebit = [];
  for(let i = 1; i < nv.length; i++){
    const st = String(nv[i][nm.ix.status] || '');
    const ph = phone10_(nv[i][nm.ix.phone]), d = dateText_(nv[i][nm.ix.date]);
    const served = st === 'PENDING' || st === 'ACK';
    if(served && !String(nv[i][nm.ix.no] || '').trim()) unnumbered++;
    if(served && marks[ph + '|' + d] && wrongServed.length < 20)
      wrongServed.push('     ' + cell_(nv[i], nm.ix.name) + ' \u00b7 ' + (nv[i][nm.ix.no] || '(unnumbered)') + ' for ' + d);
    if(String(nv[i][nm.ix.clDebited]).toUpperCase() === 'TRUE'){
      const lid = cell_(nv[i], nm.ix.leaveId);
      if(!lid || !(lid in leaveIds)) debitNoLeave.push('     ' + cell_(nv[i], nm.ix.name) + ' \u00b7 ' + d);
    }
  }
  for(let i = 1; i < lv.length; i++){
    const id = cell_(lv[i], lm.ix.id);
    if(id.indexOf('SYSCL-') !== 0) continue;
    if(String(lv[i][lm.ix.status]) !== 'APPROVED') continue;
    const parts = id.split('-');                      /* SYSCL-yyyy-mm-dd-phone */
    const d = parts.slice(1, 4).join('-'), ph = parts[4] || '';
    let found = false;
    for(let j = 1; j < nv.length; j++)
      if(phone10_(nv[j][nm.ix.phone]) === ph && dateText_(nv[j][nm.ix.date]) === d &&
         String(nv[j][nm.ix.clDebited]).toUpperCase() === 'TRUE'){ found = true; break; }
    if(!found && orphanDebit.length < 15) orphanDebit.push('     ' + cell_(lv[i], lm.ix.name) + ' \u00b7 ' + d + ' \u00b7 ' + id);
  }
  say('C. NOTICES');
  say(unnumbered ? '   \u2717 ' + unnumbered + ' SERVED notice(s) carry no number \u2014 they should not exist; send me the rows.'
                 : '   \u2713 every served notice is numbered.');
  say(wrongServed.length ? '   \u2717 served against officers WITH attendance that day \u2014 run withdrawWrongNotices():\n' + wrongServed.join('\n')
                         : '   \u2713 no served notice stands against an officer who has attendance for that date.');
  say(debitNoLeave.length ? '   \u2717 debit-flagged notice(s) with no leave row:\n' + debitNoLeave.join('\n')
                          : '   \u2713 every debit flag points at a real leave row.');
  say(orphanDebit.length ? '   \u2717 SYSTEM leave debit(s) with no matching notice:\n' + orphanDebit.join('\n')
                         : '   \u2713 every SYSTEM debit traces back to a notice.');

  /* ---- D · attendance ---- */
  const now = new Date().toISOString();
  let dupDays = [], future = [], skews = [];
  for(let i = 1; i < av.length; i++){
    const p = phone10_(av[i][am.ix.phone]), d = dateText_(av[i][am.ix.date]);
    const at = String(av[i][am.ix.markedAt] || '');
    const sk = Number(av[i][am.ix.skew]) || 0;
    if(at && at > now && future.length < 10) future.push('     ' + cell_(av[i], am.ix.name) + ' \u00b7 ' + d + ' \u00b7 claims ' + at);
    if(Math.abs(sk) > 120) skews.push({ n:cell_(av[i], am.ix.name), p:p, s:sk });
  }
  Object.keys(dayRows).forEach(k => { if(dayRows[k] > 1 && dupDays.length < 10) dupDays.push('     ' + k + ' \u00d7 ' + dayRows[k]); });
  const worst = {}; skews.forEach(x => { if(!worst[x.p] || Math.abs(x.s) > Math.abs(worst[x.p].s)) worst[x.p] = x; });
  const worstList = Object.keys(worst).map(p => worst[p]).sort((a,b) => Math.abs(b.s) - Math.abs(a.s)).slice(0, 10);
  say('D. ATTENDANCE');
  say(dupDays.length ? '   \u2013 officer-days with more than one row (re-marks; usually harmless):\n' + dupDays.join('\n')
                     : '   \u2713 one row per officer per day.');
  say(future.length ? '   \u2717 marks claiming a FUTURE time (handset clocks; the district clock governs):\n' + future.join('\n')
                    : '   \u2713 no mark claims a time still to come.');
  say(worstList.length ? '   \u2013 worst handset clocks (ask them to set time to automatic):\n' +
      worstList.map(x => '     ' + x.n + ' (' + x.p + '): ' + Math.round(Math.abs(x.s)/60) + ' min ' + (x.s>0?'fast':'slow')).join('\n')
    : '   \u2713 every handset within two minutes of the district clock.');

  /* ---- E · the roll ---- */
  const t = uidx_(), uv = t.sh.getDataRange().getValues();
  const seenP = {}, dupP = [], noMandal = [];
  for(let i = 1; i < uv.length; i++){
    const p = phone10_(uv[i][t.ix.phone]); if(!p) continue;
    if(seenP[p]) dupP.push('     ' + p + ' \u00b7 rows ' + seenP[p] + ' and ' + (i+1)); else seenP[p] = i + 1;
    if(String(uv[i][t.ix.active]).toUpperCase() !== 'FALSE' &&
       !attExempt_(cell_(uv[i], t.ix.role)) && !String(uv[i][t.ix.mandal] || '').trim())
      noMandal.push('     ' + cell_(uv[i], t.ix.name) + ' (' + p + ')');
  }
  say('E. THE ROLL');
  say(dupP.length ? '   \u2717 duplicate phone number(s):\n' + dupP.join('\n') : '   \u2713 no phone appears twice.');
  say(noMandal.length ? '   \u2013 active officer(s) with no mandal on the roll:\n' + noMandal.join('\n')
                      : '   \u2713 every active officer carries a mandal.');

  say('\nNothing has been written. Each \u2717 names its remedy; a \u2013 is worth an eye, not an order.');
  Logger.log(L.join('\n'));
}

/* ============================================================================
 * 6. HOLIDAYS — what the engine actually reads
 * ----------------------------------------------------------------------------
 * holidayCheck()   read-only. Prints every row of the Holidays tab as the
 *                  engine sees it: the raw cell, its type, the date the
 *                  engine derives, and the weekday. Then states plainly
 *                  whether TODAY is a working day and why. Run this whenever
 *                  a holiday does not bite.
 * holidayRewrite() writes each date back as PLAIN TEXT in yyyy-mm-dd. Only
 *                  needed if the Sheet and the script sit in different
 *                  timezones; text carries no timezone and cannot shift.
 *                  Occasions are left exactly as they are.
 * ========================================================================== */
function holidayCheck(){
  const L = [];
  L.push('Script timezone : ' + Session.getScriptTimeZone());
  L.push('Sheet timezone  : ' + sheetTz_());
  /* Asia/Kolkata and Asia/Calcutta are the SAME zone under two names, so the
     names are compared by what they actually do, not by how they are spelt. */
  const probe = new Date('2026-08-15T12:00:00Z');
  const sameZone = Utilities.formatDate(probe, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') ===
                   Utilities.formatDate(probe, sheetTz_(), 'yyyy-MM-dd HH:mm');
  if(!sameZone)
    L.push('  \u2717 THESE DIFFER. A date typed into the Sheet is read a day out by the\n' +
           '    script unless it is handled in the Sheet\u2019s own timezone. 6.8.4 does\n' +
           '    that; on an older Code.gs every holiday was shifting. Consider\n' +
           '    File \u2192 Settings \u2192 Time zone on the Sheet, and Project Settings \u2192\n' +
           '    Time zone in the editor, both set to (GMT+05:30) India Standard Time.');
  else L.push('  \u2713 the same zone under two names (+05:30) \u2014 no shift is possible.');
  const sh = sheet_('Holidays', H_HEAD);
  const last = sh.getLastRow();
  if(last < 2){ L.push('\nThe Holidays tab is empty.'); Logger.log(L.join('\n')); return; }
  const rng = sh.getRange(1, 1, last, 2);
  const v = rng.getValues();
  let disp = []; try{ disp = rng.getDisplayValues(); }catch(e){ disp = []; }
  L.push('\nRow  cell shows    type    engine reads   weekday      verdict   occasion');
  let bad = 0, swapped = 0;
  for(let i = 1; i < v.length; i++){
    const shown = disp[i] ? String(disp[i][0]) : '';
    const type = (v[i][0] instanceof Date) ? 'Date' : (String(v[i][0]).trim() ? 'text' : 'empty');
    const key = holidayKey_(v[i][0], shown);
    const occ = String(v[i][1] || '');
    const day = key ? WD_[new Date(key + 'T00:00:00').getDay()] : '';
    const typed = ddmmKey_(shown);
    let verdict = '\u2713';
    if(!key && String(v[i][0]).trim()){ bad++; verdict = '\u2717 unreadable'; }
    else if(typed && key && typed !== key){ swapped++; verdict = '\u2717 SHOULD BE ' + typed + ' (' + WD_[new Date(typed + 'T00:00:00').getDay()] + ')'; }
    else if(key && !occasionFits_(key, occ)) verdict = '\u2717 ' + occasionFits_(key, occ, true);
    L.push('  ' + (i + 1) + '  ' + (shown || '(blank)') + '   ' + type + '   ' +
           (key || '\u2717 NOT UNDERSTOOD') + '   ' + day + '   ' + verdict + '   ' + occ);
  }
  if(bad) L.push('\n\u2717 ' + bad + ' row(s) the engine cannot read. Retype those as 2026-08-15.');
  if(swapped) L.push('\n\u2717 ' + swapped + ' row(s) have DAY AND MONTH SWAPPED. The Sheet\u2019s date format read\n' +
    '    what you typed the other way round, so those holidays sit on the wrong\n' +
    '    date entirely. Run holidayRepair() to see the corrections, then\n' +
    '    holidayRepair(true) to write them as plain text.');
  const t = today_(), off = offInfo_(t);
  L.push('\nTODAY is ' + t + ' (' + WD_[new Date(t + 'T00:00:00').getDay()] + ')');
  L.push(off.today ? '  \u2713 OFF \u2014 ' + off.why + '. No attendance is required, no notice can arise.'
                   : '  \u2013 a WORKING day. Attendance is due and the ladder runs.');
  L.push('\nNothing has been written.');
  Logger.log(L.join('\n'));
}
function holidayRewrite(){
  const sh = sheet_('Holidays', H_HEAD);
  const last = sh.getLastRow(); if(last < 2){ Logger.log('The Holidays tab is empty.'); return; }
  const rng = sh.getRange(1, 1, last, 2);
  const v = rng.getValues();
  let disp = []; try{ disp = rng.getDisplayValues(); }catch(e){ disp = []; }
  let n = 0, skipped = 0;
  for(let i = 1; i < v.length; i++){
    const key = holidayKey_(v[i][0], disp[i] ? disp[i][0] : '');
    if(!key){ if(String(v[i][0]).trim()) skipped++; continue; }
    const cell = sh.getRange(i + 1, 1);
    cell.setNumberFormat('@');           /* plain text: no timezone, no drift */
    cell.setValue(key);
    n++;
  }
  admLog_('HOLIDAYS REWRITTEN', n + ' row(s)', 'dates written back as plain text yyyy-mm-dd');
  Logger.log(n + ' holiday date(s) rewritten as plain text yyyy-mm-dd.' +
    (skipped ? '\n' + skipped + ' row(s) could not be read and were left alone \u2014 run holidayCheck().' : '') +
    '\nRun holidayCheck() again to confirm.');
}

const WD_ = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
/* The date as the officer TYPED it: dd-mm-yyyy, which is how a Telangana
   office writes a date. This is deliberately read from the cell's displayed
   text, not from any Date value the Sheet may have made of it. */
function ddmmKey_(shown){
  const s = String(shown || '').trim().replace(/^'/, '');
  const m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
  if(!m) return '';
  const d = Number(m[1]), mo = Number(m[2]);
  if(d < 1 || d > 31 || mo < 1 || mo > 12) return '';
  const p2 = n => (n < 10 ? '0' : '') + n;
  return m[3] + '-' + p2(mo) + '-' + p2(d);
}
/* A cross-check the data proves on itself: a row called "Second Saturday"
   must fall on the second Saturday of its month. Where every such row lands
   correctly, the reading of the whole tab is right. */
function occasionFits_(key, occ, explain){
  const o = String(occ || '').toLowerCase();
  const d = new Date(key + 'T00:00:00');
  if(o.indexOf('second saturday') >= 0){
    if(d.getDay() !== 6) return explain ? 'a Second Saturday cannot fall on a ' + WD_[d.getDay()] : false;
    if(d.getDate() > 14 || d.getDate() < 8)
      return explain ? 'that is the ' + (d.getDate() < 8 ? 'first' : 'later') + ' Saturday, not the second' : false;
  }
  if(o.indexOf('sunday') >= 0 && d.getDay() !== 0) return explain ? 'not a Sunday' : false;
  return explain ? '' : true;
}

/* ----------------------------------------------------------------------------
 * holidayRepair()      dry run — proposes the correction for every row
 * holidayRepair(true)  writes them, as PLAIN TEXT yyyy-mm-dd
 * The intent is taken from the text you typed, read dd-mm-yyyy. Plain text
 * carries no date format and no timezone, so nothing can reinterpret it
 * again — not this Sheet, not a different locale, not a future paste.
 * -------------------------------------------------------------------------- */
function holidayRepair(commit){
  const sh = sheet_('Holidays', H_HEAD);
  const last = sh.getLastRow();
  if(last < 2){ Logger.log('The Holidays tab is empty.'); return; }
  const rng = sh.getRange(1, 1, last, 2);
  const v = rng.getValues();
  let disp = []; try{ disp = rng.getDisplayValues(); }catch(e){ disp = []; }

  /* Two possible readings of the tab, and the data decides between them
     rather than I do. AS-STORED is what the Sheet made of each cell.
     AS-TYPED reads the visible text as dd-mm-yyyy, the way a Telangana
     office writes a date. Every row named "Second Saturday" is then a test
     the reading must pass: it has to land on the true second Saturday of
     its month. The reading that passes more of them is the right one, and
     if neither passes cleanly nothing is written. */
  const rows = [];
  for(let i = 1; i < v.length; i++){
    const shown = disp[i] ? String(disp[i][0]) : String(v[i][0] || '');
    if(!String(shown).trim()) continue;
    rows.push({ at:i + 1, shown:shown, occ:String(v[i][1] || (disp[i] ? disp[i][1] : '')),
                stored:holidayKey_(v[i][0], shown), typed:ddmmKey_(shown) });
  }
  const score = key => { let ok = 0, bad = 0;
    rows.forEach(r => { const k = r[key]; if(!k) return;
      if(String(r.occ).toLowerCase().indexOf('second saturday') < 0) return;
      if(occasionFits_(k, r.occ)) ok++; else bad++; });
    return { ok:ok, bad:bad }; };
  const sStored = score('stored'), sTyped = score('typed');
  const use = (sTyped.ok > sStored.ok) ? 'typed' : 'stored';

  const L = [];
  L.push('Reading the tab two ways, and letting the Second Saturdays decide:');
  L.push('  as the Sheet stored it : ' + sStored.ok + ' of ' + (sStored.ok + sStored.bad) + ' Second Saturdays land correctly');
  L.push('  as you typed it (dd-mm): ' + sTyped.ok + ' of ' + (sTyped.ok + sTyped.bad) + ' Second Saturdays land correctly');
  if(sTyped.ok === 0 && sStored.ok === 0){
    Logger.log(L.join('\n') + '\n\n\u2717 Neither reading can be proved \u2014 there are no "Second Saturday" rows to\n' +
      '  test against. Nothing has been written. Send me the holidayCheck() log.');
    return;
  }
  L.push('  \u2192 taking the ' + (use === 'typed' ? 'AS TYPED (dd-mm-yyyy)' : 'AS STORED') + ' reading.\n');

  let changes = 0, unreadable = 0, misfits = 0;
  const plan = [];
  rows.forEach(r => {
    const want = r[use] || r.stored || r.typed;
    if(!want){ unreadable++; L.push('  row ' + r.at + '  ' + r.shown + '  \u2717 cannot be read \u2014 retype it as 2026-08-15'); return; }
    const fit = occasionFits_(want, r.occ, true);
    if(fit) misfits++;
    const moved = want !== r.stored;
    if(moved) changes++;
    plan.push({ row:r.at, want:want });
    L.push('  row ' + r.at + '  ' + r.shown + '  ' +
      (moved ? r.stored + ' \u2192 ' + want : want + ' (unchanged)') + '  ' +
      WD_[new Date(want + 'T00:00:00').getDay()] + '  ' + r.occ + (fit ? '   \u2717 ' + fit : ''));
  });

  Logger.log((commit === true ? 'HOLIDAY REPAIR \u2014 WRITING\n\n' : 'HOLIDAY REPAIR \u2014 DRY RUN, nothing written\n\n') +
    L.join('\n') + '\n\n' + changes + ' date(s) move; ' + (plan.length - changes) + ' already correct' +
    (unreadable ? '; ' + unreadable + ' unreadable' : '') + '.' +
    (misfits ? '\n\u2717 ' + misfits + ' row(s) still do not fit their own name \u2014 do not commit until those are explained.'
             : '\n\u2713 every row that can be checked fits its own name.') +
    (commit === true ? '\n\nWritten as plain text yyyy-mm-dd, which no date format or timezone can\nreinterpret. Run holidayCheck() to confirm.'
                     : '\n\nNothing has been written. Run  holidayRepair(true)  to commit.'));
  if(commit !== true) return;
  plan.forEach(p => { const c = sh.getRange(p.row, 1); c.setNumberFormat('@'); c.setValue(p.want); });
  admLog_('HOLIDAYS REPAIRED', plan.length + ' row(s)', changes + ' date(s) corrected; all written as plain text');
}

/* ============================================================================
 * 7. DUPLICATE LEAVE APPLICATIONS
 * ----------------------------------------------------------------------------
 * Until 6.8.6 every submission from the field carried a fresh random id, so an
 * officer who tapped Apply twice — or applied again because a weak line gave
 * him no confirmation — raised two independent applications for the same days.
 * The Collector sanctioned one; its twin sat in Waiting for ever, and the count
 * of applications awaiting orders never came down.
 *
 *   findDuplicateLeave()        read-only. Lists every officer holding more
 *                               than one live application over the same days.
 *   closeDuplicateLeave(true)   marks the surplus WITHDRAWN, keeping the one
 *                               already sanctioned where there is one, and
 *                               otherwise the earliest applied for. A refusal
 *                               is NOT used: the officer did nothing wrong and
 *                               it should not read as one on his record.
 * ========================================================================== */
function admLeaveClusters_(){
  const sh = sheet_('Leave', L_HEAD), m = headMap_(sh, L_HEAD);
  const v = sh.getDataRange().getValues();
  const byPhone = {};
  for(let i = 1; i < v.length; i++){
    const st = String(v[i][m.ix.status] || '');
    if(st !== 'PENDING' && st !== 'APPROVED') continue;      /* live only */
    const ph = phone10_(v[i][m.ix.phone]); if(!ph) continue;
    const f = dateText_(v[i][m.ix.fromDate]), t = dateText_(v[i][m.ix.toDate]);
    if(!f || !t) continue;
    (byPhone[ph] = byPhone[ph] || []).push({ at:i + 1, id:cell_(v[i], m.ix.id),
      name:cell_(v[i], m.ix.name), mandal:cell_(v[i], m.ix.mandal), type:cell_(v[i], m.ix.type),
      f:f, t:t, days:Number(v[i][m.ix.days]) || 0, st:st,
      applied:String(v[i][m.ix.appliedAt] || '') });
  }
  const clusters = [];
  Object.keys(byPhone).forEach(ph => {
    const rows = byPhone[ph].sort((a, b) => a.f < b.f ? -1 : a.f > b.f ? 1 : (a.applied < b.applied ? -1 : 1));
    let group = [rows[0]];
    for(let i = 1; i < rows.length; i++){
      const overlaps = group.some(g => rows[i].f <= g.t && rows[i].t >= g.f);
      if(overlaps) group.push(rows[i]);
      else { if(group.length > 1) clusters.push({ phone:ph, rows:group }); group = [rows[i]]; }
    }
    if(group.length > 1) clusters.push({ phone:ph, rows:group });
  });
  return clusters;
}
function findDuplicateLeave(){
  const cl = admLeaveClusters_();
  if(!cl.length){ Logger.log('No officer holds two live applications over the same days. Nothing to close.'); return; }
  const L = [cl.length + ' officer-spell(s) with more than one live application:\n'];
  cl.forEach(c => {
    const keep = admPickKeeper_(c.rows);
    L.push('  ' + c.rows[0].name + ' (' + c.phone + (c.rows[0].mandal ? ', ' + c.rows[0].mandal : '') + ')');
    c.rows.forEach(r => L.push('     ' + (r.id === keep.id ? 'KEEP  ' : 'close ') + r.id + '  ' + r.type + '  ' +
      dmy_(r.f) + (r.f === r.t ? '' : ' to ' + dmy_(r.t)) + '  ' + r.days + 'd  ' + r.st +
      '  applied ' + String(r.applied).slice(0, 10)));
  });
  L.push('\nThe one already sanctioned is kept; where none is, the earliest applied for is kept.');
  L.push('Run closeDuplicateLeave(true) to mark the rest WITHDRAWN. Nothing is deleted,');
  L.push('nothing is refused, and the Audit tab carries the reason against each.');
  Logger.log(L.join('\n'));
}
function admPickKeeper_(rows){
  const app = rows.filter(r => r.st === 'APPROVED');
  if(app.length) return app.sort((a, b) => a.applied < b.applied ? -1 : 1)[0];
  return rows.slice().sort((a, b) => a.applied < b.applied ? -1 : 1)[0];
}
function closeDuplicateLeave(commit){
  const cl = admLeaveClusters_();
  if(!cl.length){ Logger.log('Nothing to close.'); return; }
  if(commit !== true){ findDuplicateLeave(); Logger.log('\n(Dry run — nothing written. Use closeDuplicateLeave(true).)'); return; }
  const sh = sheet_('Leave', L_HEAD), m = headMap_(sh, L_HEAD);
  const now = new Date().toISOString();
  let n = 0;
  cl.forEach(c => {
    const keep = admPickKeeper_(c.rows);
    c.rows.forEach(r => {
      if(r.id === keep.id) return;
      sh.getRange(r.at, m.ix.status + 1).setValue('WITHDRAWN');
      sh.getRange(r.at, m.ix.decidedBy + 1).setValue(ADMIN_BY);
      sh.getRange(r.at, m.ix.decidedAt + 1).setValue(now);
      sh.getRange(r.at, m.ix.remarks + 1).setValue(
        'Duplicate of ' + keep.id + ' for the same days; raised twice from the field before 6.8.6 barred it. ' +
        'Closed by the office, not refused \u2014 no default by the officer.');
      admLog_('CLOSE DUPLICATE LEAVE', r.name + ' (' + c.phone + ')',
              r.id + ' for ' + dmy_(r.f) + ' closed as a duplicate of ' + keep.id);
      n++;
    });
  });
  Logger.log(n + ' duplicate application(s) marked WITHDRAWN. The Waiting count should now be right.');
}

/* ============================================================================
 * 8. THE PIPELINE — moving the two hand-edited things out of the source
 * ----------------------------------------------------------------------------
 * migrateSalt()  Run ONCE, before anything else, on the CURRENT code — that
 *                is, while the old Code.gs with the live SALT constant is
 *                still in the editor. It copies that exact value into Script
 *                Properties. After this, Code.gs holds no secret, can be
 *                pushed by clasp or pulled from GitHub, and never needs the
 *                SALT line restored by hand again.
 *                Every PIN in the district depends on this value being
 *                carried across unchanged, so the function refuses to
 *                overwrite one that is already stored, and prints a check.
 * saltStatus()   read-only. Says where the salt is coming from right now.
 * ========================================================================== */
function migrateSalt(){
  const props = PropertiesService.getScriptProperties();
  const already = String(props.getProperty('SALT') || '');
  const inCode = (typeof SALT_FALLBACK !== 'undefined') ? String(SALT_FALLBACK)
               : (typeof SALT !== 'undefined' ? String(SALT) : '');
  if(already){
    Logger.log('A SALT is already stored in Script Properties. Nothing has been changed.\n' +
      'Stored value ends with: \u2026' + already.slice(-6) + '\n' +
      (inCode && inCode !== already && inCode !== 'CHANGE-THIS-LONG-RANDOM-SALT'
        ? '\u2717 WARNING: the constant still in the code ends with \u2026' + inCode.slice(-6) +
          ' and DIFFERS from the stored one. One of them is the value every PIN was\n' +
          '  hashed with. Do not deploy until you are certain which. Test by signing in.'
        : '\u2713 nothing further to do.'));
    return;
  }
  if(!inCode || inCode === 'CHANGE-THIS-LONG-RANDOM-SALT'){
    Logger.log('\u2717 The code holds no real salt to migrate \u2014 it is still the placeholder.\n' +
      '  Run this on the CURRENT code, before pasting a new Code.gs over it.');
    return;
  }
  props.setProperty('SALT', inCode);
  try{ if(typeof SALT_CACHE !== 'undefined') SALT_CACHE = null; }catch(e){}
  admLog_('SALT MIGRATED', 'Script Properties', 'value ending \u2026' + inCode.slice(-6) + ' moved out of the source');
  Logger.log('\u2713 The salt is now in Script Properties (ends \u2026' + inCode.slice(-6) + ').\n\n' +
    'NEXT, in this order:\n' +
    '  1. Paste the new Code.gs (leave its placeholder salt line alone).\n' +
    '  2. Deploy \u25b8 Manage deployments \u25b8 pencil \u25b8 New version \u25b8 Deploy.\n' +
    '  3. Sign in on the app with a known PIN. THIS is the test that matters.\n' +
    '  4. saltStatus() will then confirm the source is free of secrets.\n\n' +
    'saltStatus() cannot report fully until step 1 is done \u2014 the old code has no\n' +
    'salt_() to ask. That is expected, not a fault. Nothing is lost either way:\n' +
    'the old value is still in the file until you replace it.');
}
/* Works on either version of Code.gs. Run before the new Code.gs is pasted
   and it reports on the old constant; run after, and it reports on salt_().
   The old code has no salt_(), so it is never called blindly. */
function saltStatus(){
  let stored = '';
  try{ stored = String(PropertiesService.getScriptProperties().getProperty('SALT') || ''); }catch(e){}
  const hasHelper = (typeof salt_ === 'function');
  const inUse = hasHelper ? String(salt_())
              : (stored || (typeof SALT_FALLBACK !== 'undefined' ? String(SALT_FALLBACK)
              : (typeof SALT !== 'undefined' ? String(SALT) : '')));
  const codeVal = (typeof SALT_FALLBACK !== 'undefined') ? String(SALT_FALLBACK)
                : (typeof SALT !== 'undefined' ? String(SALT) : '');
  const L = [];
  L.push('Stored in Script Properties : ' + (stored ? '\u2713 ends \u2026' + stored.slice(-6) : '\u2014 nothing stored'));
  L.push('Still in the source file    : ' +
    (!codeVal ? '\u2014' : codeVal === 'CHANGE-THIS-LONG-RANDOM-SALT'
      ? '\u2713 only the placeholder \u2014 the file carries no secret'
      : '\u2717 a real value, ending \u2026' + codeVal.slice(-6)));
  L.push('Backend in the editor       : ' + (hasHelper ? '6.9 or later (reads Script Properties)'
                                                       : 'older \u2014 still uses the constant in the file'));
  L.push('\nThe salt actually in use ends \u2026' + (inUse ? inUse.slice(-6) : '(none)'));
  if(stored && !hasHelper)
    L.push('\nThis is the expected state part-way through the move: the value is safely\n' +
      'stored, but the code in the editor is still the old one and is not reading it\n' +
      'yet. Paste the new Code.gs, deploy a new version, then sign in once to confirm.');
  else if(stored && hasHelper && codeVal && codeVal !== 'CHANGE-THIS-LONG-RANDOM-SALT' && codeVal !== stored)
    L.push('\n\u2717 The stored value and the one left in the file DIFFER. The stored one is\n' +
      '  what is being used. If sign-in fails, the file holds the older value.');
  else if(stored && hasHelper)
    L.push('\n\u2713 Done. The source carries no secret, so it can be pushed by the pipeline\n' +
      '  and never needs that line restored by hand again.');
  else
    L.push('\nRun migrateSalt() on the CURRENT code to move it into Script Properties.');
  Logger.log(L.join('\n'));
}

/* ============================================================================
 * 9. FIELD ISSUE REGISTER · 17.08.2026
 * ----------------------------------------------------------------------------
 * The mandals' issue tracker of 17.08.2026, encoded the same way as the
 * 28.07 register in Code.gs, with the lessons of that batch applied:
 *   - a dry-run twin (showFieldFixes2) prints the whole plan first;
 *   - every applied change is written to Audit (PINs excepted — a PIN is
 *     printed ONCE in the log and nowhere else);
 *   - fresh PINs are derived from the batch date, so running the batch a
 *     second time yields the SAME PIN and changes nothing — the 28.07
 *     resetPin seeded from the day it was run, and a nervous re-run on a
 *     later day would have re-scrambled PINs already circulated.
 *
 * THE OPS
 *   find:{phone|role|mandal|gp}  locates the row (phone exact; role exact;
 *                                mandal/gp by contains, so spelling variants
 *                                like Kothapally/Kothapalle both land)
 *   setPhone     writes the number AND re-keys the PIN (skip if already so)
 *   claimPhone   as setPhone, but first releases the number from any other
 *                row holding it — that row is left blank and flagged
 *   setName / setGp / setMandal  corrects the text
 *   resetPin     fresh PIN, number unchanged
 *   deactivate   the row stops counting — for long leave, so no absence can
 *                be manufactured against an officer who is not expected
 *   addRow       registers an officer; skipped if the number is on the roll
 * ========================================================================== */
var FIX2_BATCH = '17.08.2026';
var FIELD_FIXES_2 = [
  /* 1 — P. Madhavi returns from child-care leave to Chinnapendyala */
  {why:'Issue 1: Penthala Madhavi (PS, Chilpur) back from child-care leave — register 9553399695',
   addRow:{phone:'9553399695', name:'Penthala Madhavi', role:'PS', mandal:'Chilpur', gp:'Chinnapendyala'}},
  {why:'Issue 1: G. Ratna held Chinnapendyala in charge during that leave; on Madhavi’s return she keeps Sreepathipalle alone',
   find:{role:'PS', gp:'Sreepathipalle'}, setGp:'Sreepathipalle'},

  /* 2 — deputation into Desaithanda */
  {why:'Issue 2: Thouti Reddy Shashi Kumar deputed from Tharigoppula to Desaithanda (Chilpur) — the Desaithanda row takes his number and name',
   find:{role:'PS', gp:'Desaithanda'}, setPhone:'9493438111', setName:'Thouti Reddy Shashi Kumar'},

  /* 3 & 4 — the Peddapahad / Pedda Thanda (M) tangle, finished properly.
     28.07 confirmed 9848188052 as D. Praveen Kumar's and claimed it onto the
     row matching "Peddapahad" — but never corrected that row's name or
     village, which is why K. Jyothi's village now shows a stranger. */
  {why:'Issue 4: D. Praveen Kumar — his row reads his name and his village Pedda Thanda (M), and his PIN is reset (he reports "wrong PIN")',
   find:{phone:'9848188052'}, setName:'Donthi Praveen Kumar', setGp:'Pedda Thanda (M)', resetPin:true},
  {why:'Issue 3: Kadavergu Jyothi (PS Peddapahad, Jangaon) — the row on her number is corrected to her name and village',
   find:{phone:'8309450336'}, setName:'Kadavergu Jyothi', setGp:'Peddapahad', setMandal:'Jangaon'},
  {why:'Issue 3: and if 8309450336 was never on the roll, she is registered (skips when the line above found her)',
   addRow:{phone:'8309450336', name:'Kadavergu Jyothi', role:'PS', mandal:'Jangaon', gp:'Peddapahad'}},

  /* 5 — Venkriyala */
  {why:'Issue 5: Gouraipally Kavitha (PS Venkriyala) told "number not registered" — the Venkriyala row takes 9398525190',
   find:{role:'PS', gp:'Venkriyala'}, setPhone:'9398525190', setName:'Gouraipally Kavitha'},

  /* 6 & 7 — the Cheeturu / Ramachandragudem swap, both directions */
  {why:'Issue 6: L. Mahesh Kumar confirmed on Cheeturu (applied 28.07 — kept here so this batch reads complete)',
   find:{phone:'7680966701'}, setGp:'Cheeturu', setMandal:'Lingala Ghanpur'},
  {why:'Issue 7: V. Srinivas Reddy deputed to Ramachandragudem — if his number is on the roll, it moves',
   find:{phone:'8008756396'}, setGp:'Ramachandragudem', setMandal:'Lingala Ghanpur'},
  {why:'Issue 7: and if not (28.07 overwrote the Cheeturu row’s number, which may have been his), he is registered',
   addRow:{phone:'8008756396', name:'V. Srinivas Reddy', role:'PS', mandal:'Lingala Ghanpur', gp:'Ramachandragudem'}},
  {why:'Issue 7: D. Rambabu held Ramachandragudem in charge; he keeps Jeedikal alone once Srinivas Reddy holds it',
   find:{role:'PS', gp:'Jeedikal'}, setGp:'Jeedikal'},

  /* 8 — child-care leave: the roll must stop expecting her */
  {why:'Issue 8: Basvaraju Mounika (PS Ramrajupalle) on child-care leave — row set inactive so no absence can be counted against her; reactivate on return. Her charge is with Rajashekar — see CONTESTED_2 before touching any number.',
   find:{phone:'9391744487'}, deactivate:true},

  /* 9 — the officer says where she works; the register follows */
  {why:'Issue 9: N. Santhoshini works Dharmagadda Thanda; her row said Dharavath Thanda. NOTE: this leaves Dharavath Thanda unheld — see CONTESTED_2',
   find:{phone:'9398535516'}, setGp:'Dharmagadda Thanda'},

  /* 10 & 11 — wrong PINs */
  {why:'Issue 10: Kota Bayyanna (PS Rangarai Gudem) — wrong PIN, fresh PIN on his number',
   find:{phone:'9866775245'}, resetPin:true},
  {why:'Issue 10: and if that number was never on the roll, he is registered',
   addRow:{phone:'9866775245', name:'Kota Bayyanna', role:'PS', mandal:'Ghanpur (Stn)', gp:'Rangarai Gudem'}},
  {why:'Issue 11: Shaik Irfan (PS Pedda Thanda (Y)) — wrong PIN, fresh PIN',
   find:{phone:'7794936639'}, resetPin:true},

  /* 12 — the app shows her as MPDO because her number sits on a senior row
     too, and one number folds into one login with the senior rank winning */
  {why:'Issue 12: Thandra Swapna (PS Kothapally) shown as "MPDO Lingala Ghanpur" — 9133467909 also sits on that MPDO row and the senior rank wins the login. Her PS row claims the number; the MPDO row is blanked and NEEDS A REAL NUMBER from the office',
   find:{role:'PS', gp:'Kothapal'}, claimPhone:'9133467909'}
];

/* What the tracker asks for but the record contradicts. Nothing here is
   applied. Settle each with the office, move the answer into FIELD_FIXES_2,
   and delete the entry. */
var CONTESTED_2 = [
  {issue:8, name:'Ramrajupalle charge', q:'The tracker says "give login to 9912383087" for Rajashekar — but 28.07 already gave J. Rajashekar (Neermala) the village in charge, and if his existing sign-in works, moving him to a new number would lock him out. WHOSE number is 9912383087, and does his current login work?'},
  {issue:9, name:'Dharavath Thanda', q:'Once Santhoshini’s row moves to Dharmagadda Thanda, nobody holds Dharavath Thanda — and 28.07 put 7675827928 on a Dharmagadda Thanda row, so that village may now be held twice. Who actually holds Dharavath Thanda, and is 7675827928 a real officer?'}
];

/* the PIN a fix hands out — derived from the number AND the batch date, so
   running the batch again yields the same PIN and re-runs change nothing */
function fix2Pin_(phone){
  return String(1000 + (parseInt(hash_(phone + '|' + FIX2_BATCH, 'fix2').replace(/\D/g, '').slice(0, 6) || '0', 10) % 9000));
}
function showFieldFixes2(){ fieldFixes2_(false); }
function applyFieldFixes2(){ fieldFixes2_(true); }
function fieldFixes2_(commit){
  const t = uidx_(), sh = t.sh, v = sh.getDataRange().getValues();
  const width = Math.max(sh.getLastColumn(), U_HEAD.length);
  const byPhone = {}, out = [];
  for(let i = 1; i < v.length; i++){ const ph = phone10_(v[i][t.ix.phone]); if(ph && byPhone[ph] == null) byPhone[ph] = i; }
  const findRow = f => {
    for(let i = 1; i < v.length; i++){
      if(f.phone && phone10_(v[i][t.ix.phone]) !== phone10_(f.phone)) continue;
      if(f.role && String(v[i][t.ix.role]).trim().toUpperCase() !== f.role) continue;
      if(f.mandal && String(v[i][t.ix.mandal]).trim().toLowerCase().indexOf(f.mandal.toLowerCase()) < 0) continue;
      if(f.gp && String(v[i][t.ix.gp]).toLowerCase().indexOf(f.gp.toLowerCase()) < 0) continue;
      return i;
    } return -1;
  };
  const writeRow = i => { if(commit) sh.getRange(i + 1, 1, 1, v[i].length || width).setValues([v[i]]); };

  FIELD_FIXES_2.forEach(fx => {
    try{
      if(fx.addRow){
        const a = fx.addRow, ph = phone10_(a.phone);
        if(byPhone[ph] != null){ out.push('SKIP (already on the roll): ' + fx.why); return; }
        const pin = fix2Pin_(ph);
        const row = new Array(width).fill('');
        const put = (k, val) => { if(t.ix[k] >= 0) row[t.ix[k]] = val; };
        put('phone', "'" + ph); put('name', a.name); put('role', a.role);
        put('mandal', a.mandal || ''); put('gp', a.gp || '');
        put('hash', hash_(ph, pin)); put('initpin', ''); put('active', 'TRUE');
        if(commit){
          sh.appendRow(row);
          admLog_('FIELD FIX ' + FIX2_BATCH, a.name + ' (' + ph + ')', 'registered · ' + a.role + ' · ' + (a.mandal || '') + ' / ' + (a.gp || ''));
        }
        v.push(row); byPhone[ph] = v.length - 1;
        out.push((commit ? 'ADDED: ' : 'would ADD: ') + a.name + ' (' + a.role + ', ' + a.gp + ') ' + ph + ' — PIN ' + pin + ' (change forced on first sign-in)');
        return;
      }
      const i = findRow(fx.find);
      if(i < 0){ out.push('NOT FOUND (fix by hand): ' + fx.why); return; }
      const changed = [], audit = [];
      if(fx.deactivate){
        if(String(v[i][t.ix.active]).toUpperCase() !== 'FALSE'){
          v[i][t.ix.active] = 'FALSE'; writeRow(i);
          if(commit) admLog_('FIELD FIX ' + FIX2_BATCH, cell_(v[i], t.ix.name), 'deactivated · ' + fx.why.slice(0, 180));
          out.push((commit ? 'DEACTIVATED: ' : 'would DEACTIVATE: ') + fx.why);
        } else out.push('OK ALREADY: ' + fx.why);
        return;
      }
      if(fx.claimPhone){
        const np = phone10_(fx.claimPhone);
        if(phone10_(v[i][t.ix.phone]) === np && v[i][t.ix.hash]){ /* already his row */ }
        else{
          const other = byPhone[np];
          if(other != null && other !== i){
            v[other][t.ix.phone] = ''; v[other][t.ix.hash] = ''; writeRow(other);
            out.push('  released ' + np + ' from row ' + (other + 1) + ' (' + (cell_(v[other], t.ix.name) || cell_(v[other], t.ix.role)) + ') — that officer needs a real number before they can sign in');
            audit.push('released ' + np + ' from ' + (cell_(v[other], t.ix.name) || 'row ' + (other + 1)));
          }
          const pin = fix2Pin_(np);
          v[i][t.ix.phone] = np; v[i][t.ix.hash] = hash_(np, pin); if(t.ix.initpin >= 0) v[i][t.ix.initpin] = '';
          byPhone[np] = i;
          changed.push('claimed ' + np + ', PIN ' + pin); audit.push('claimed ' + np + ', PIN re-keyed');
        }
      }
      if(fx.setPhone){
        const np = phone10_(fx.setPhone), old = phone10_(v[i][t.ix.phone]);
        if(old === np && v[i][t.ix.hash]){ /* already right */ }
        else if(byPhone[np] != null && byPhone[np] !== i){ out.push('CONFLICT (number already on row ' + (byPhone[np] + 1) + '): ' + fx.why); return; }
        else{
          const pin = fix2Pin_(np);
          v[i][t.ix.phone] = np; v[i][t.ix.hash] = hash_(np, pin); if(t.ix.initpin >= 0) v[i][t.ix.initpin] = '';
          byPhone[np] = i;
          changed.push('phone ' + (old || '(blank)') + ' → ' + np + ', PIN ' + pin);
          audit.push('phone ' + (old || '(blank)') + ' → ' + np + ', PIN re-keyed');
        }
      }
      if(fx.setName && String(v[i][t.ix.name]).trim() !== fx.setName){
        audit.push('name "' + v[i][t.ix.name] + '" → "' + fx.setName + '"');
        changed.push('name → ' + fx.setName); v[i][t.ix.name] = fx.setName;
      }
      if(fx.setGp && String(v[i][t.ix.gp]).trim() !== fx.setGp){
        audit.push('villages "' + v[i][t.ix.gp] + '" → "' + fx.setGp + '"');
        changed.push('villages → ' + fx.setGp); v[i][t.ix.gp] = fx.setGp;
      }
      if(fx.setMandal && String(v[i][t.ix.mandal]).trim() !== fx.setMandal){
        audit.push('mandal "' + v[i][t.ix.mandal] + '" → "' + fx.setMandal + '"');
        changed.push('mandal → ' + fx.setMandal); v[i][t.ix.mandal] = fx.setMandal;
      }
      if(fx.resetPin){
        const ph = phone10_(v[i][t.ix.phone]), pin = fix2Pin_(ph);
        if(v[i][t.ix.hash] === hash_(ph, pin)){ /* this batch already reset it */ }
        else{
          v[i][t.ix.hash] = hash_(ph, pin); if(t.ix.initpin >= 0) v[i][t.ix.initpin] = '';
          changed.push('PIN reset → ' + pin); audit.push('PIN reset');
        }
      }
      if(changed.length){
        writeRow(i);
        if(commit) admLog_('FIELD FIX ' + FIX2_BATCH, cell_(v[i], t.ix.name) + ' (' + phone10_(v[i][t.ix.phone]) + ')', audit.join('; '));
        out.push((commit ? 'FIXED: ' : 'would FIX: ') + fx.why + ' — ' + changed.join('; '));
      } else out.push('OK ALREADY: ' + fx.why);
    }catch(err){ out.push('ERROR on "' + fx.why + '": ' + err); }
  });

  out.push('');
  if(CONTESTED_2.length){
    out.push('NOT TOUCHED — the tracker and the record disagree; settle these with the office:');
    CONTESTED_2.forEach(c => out.push('  Issue ' + c.issue + ' (' + c.name + '): ' + c.q));
    out.push('');
  }
  out.push(commit === true
    ? 'Applied. The PINs above are shown ONCE — circulate each to that officer alone. Now run rosterAudit(): it should show the blanked MPDO Lingala Ghanpur row, and whatever CONTESTED_2 leaves open.'
    : 'DRY RUN — nothing was written. Read the plan above, then run applyFieldFixes2().');
  Logger.log(out.join('\n'));
}

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
 * THE MENU ON THE SHEET
 * The Collector works in a browser, not in a script editor, and the function
 * dropdown is the wrong place to keep a district's maintenance. This puts
 * every job that matters on the Sheet's own menu bar, one click each, with
 * what it did shown in a dialog he can read and copy — a PIN printed into an
 * execution log is a PIN nobody circulates.
 *
 * NOTHING HERE RUNS BY ITSELF. Every writing item asks first and names what
 * it is about to change. No trigger calls any of it; that is the standing
 * rule of this file and it is not relaxed by putting the buttons in reach.
 * ------------------------------------------------------------------------- */
function onOpen(){
  SpreadsheetApp.getUi().createMenu('District maintenance')
    .addItem('1 · Read the plan (22.08 field register)', 'menuShowFixes3')
    .addItem('2 · Apply the plan (asks first)',          'menuApplyFixes3')
    .addSeparator()
    .addSeparator()
    .addItem('Chase the advisory and the plan — read first', 'menuShowChase')
    .addItem('Send the chase mail (asks first)',             'menuSendChase')
    .addSeparator()
    .addSeparator()
    .addItem('Leave shown as waiting after it was sanctioned — read first', 'menuShowLeaveTwins')
    .addItem('Settle those duplicated applications (asks first)',           'menuSettleLeaveTwins')
    .addSeparator()
    .addItem('Why can an officer not sign in?',          'menuWhySignIn')
    .addItem('What a PIN reset would do — read first',   'menuShowPinReset')
    .addItem('Reset one officer’s PIN (asks first)',     'menuResetOnePin')
    .addItem('Check the village roll',                   'menuGpSpellCheck')
    .addItem('Check the officer roll',                   'menuRosterAudit')
    .addToUi();
}

/* Collect lines, log them, and hand them back for a dialog. */
function admSay_(lines){
  const text = (lines || []).join('\n');
  Logger.log(text);
  return text;
}

/* A dialog wide enough to read a register in, and selectable so the PINs can
   be copied out in one go. Falls back to the log when there is no UI — a
   function run from the editor must not die for want of a window. */
function admShow_(title, text){
  let ui;
  try{ ui = SpreadsheetApp.getUi(); }catch(err){ Logger.log(text); return; }
  const esc = String(text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = HtmlService.createHtmlOutput(
    '<div style="font:13px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;padding:4px 2px">' +
    '<textarea readonly style="width:100%;height:430px;font:12px/1.55 ui-monospace,Consolas,monospace;' +
    'border:1px solid #D7DAE3;border-radius:8px;padding:12px;resize:vertical;white-space:pre-wrap">' +
    esc + '</textarea>' +
    '<p style="color:#5B6B84;margin:8px 2px 0">Select all and copy before closing. A PIN is shown once.</p></div>')
    .setWidth(880).setHeight(520);
  ui.showModalDialog(html, title);
}

function menuShowFixes3(){
  admShow_('The plan — nothing has been written', showFieldFixes3());
}
function menuApplyFixes3(){
  const ui = SpreadsheetApp.getUi();
  const ok = ui.alert('Apply the 22.08 field register?',
    'This writes to the Users tab: it registers officers, re-maps villages, releases numbers ' +
    'held on two rows, and issues PINs. Every change is written to Audit.\n\n' +
    'Read item 1 first if you have not. Running it twice changes nothing the second time.\n\n' +
    'Apply it now?', ui.ButtonSet.YES_NO);
  if(ok !== ui.Button.YES){ ui.alert('Nothing was written.'); return; }
  admShow_('Applied — copy the PINs now, they are shown once', applyFieldFixes3());
}
function menuShowLeaveTwins(){ admShow_('Applications appearing twice — nothing written', showLeaveTwins()); }
function menuSettleLeaveTwins(){
  const ui = SpreadsheetApp.getUi();
  const ok = ui.alert('Settle the duplicated leave applications?',
    'Each waiting duplicate is given the order another row of the SAME application already carries. ' +
    'No row is deleted, no order is invented, and an application with no decision on it is left for your orders. ' +
    'Read the list first.', ui.ButtonSet.YES_NO);
  if(ok !== ui.Button.YES) return;
  admShow_('Duplicated applications settled', settleLeaveTwins());
}
function menuWhySignIn(){
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('Which number?', 'The officer’s mobile number.', ui.ButtonSet.OK_CANCEL);
  if(res.getSelectedButton() !== ui.Button.OK) return;
  admShow_('Why that number cannot sign in', whyCannotSignIn(res.getResponseText()));
}
function menuShowChase(){ admShow_('Who is still pending — nothing sent', showDocumentChase()); }
function menuSendChase(){
  const ui = SpreadsheetApp.getUi();
  const ok = ui.alert('Mail every officer who is still pending?',
    'One mail each, naming only what that officer owes — the advisory to acknowledge, the plan to send, or both. ' +
    'It chases; it accuses nobody. No reminder, no notice and no debit is written.' +
    '\n\nRead item 1 first if you have not.\n\nSend now?',
    ui.ButtonSet.YES_NO);
  if(ok !== ui.Button.YES){ ui.alert('Nothing was sent.'); return; }
  admShow_('The chase mail has gone', sendDocumentChase());
}
function menuGpSpellCheck(){ admShow_('The village roll', gpSpellCheck()); }
function menuRosterAudit(){  admShow_('The officer roll', rosterAudit()); }

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
  /* A. Narmada (8978394484) STOOD HERE for Dharmapuram, Devaruppula. The
     tracker of 22.08.2026 deputes her the other way — out of Dharmapuram to
     Fatheshapur, Raghunathpalle — so the line was struck rather than left to
     be run later and quietly undo her new posting. It is carried in
     FIELD_FIXES_3 (issue 16), where the reason is on the record. */
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

/* ----------------------------------------------------------------------------
 * TWIN ROWS UNDER ONE ID. Before 6.9.9 the leave register was written
 * without a lock: a retry racing its original could scan, find nothing,
 * and append — the same id twice. The app reads the FIRST row with an id,
 * so every decision lands there; a later twin sits PENDING for ever,
 * unreachable from any screen, padding the Waiting count. 6.9.9 closed the
 * race; this register closes the twins it left behind. The first row is
 * the record and is never touched. A later twin that is merely PENDING is
 * marked WITHDRAWN; one that somehow carries a decision of its own is only
 * reported — that wants the office's eye, not a script's.
 * ------------------------------------------------------------------------- */
function findTwinLeaveRows(){ admTwinLeave_(false); }
function closeTwinLeaveRows(commit){ admTwinLeave_(commit === true); }
function admTwinLeave_(commit){
  const sh = sheet_('Leave', L_HEAD), m = headMap_(sh, L_HEAD);
  const v = sh.getDataRange().getValues();
  const first = {}, twins = [];
  for(let i = 1; i < v.length; i++){
    const id = cell_(v[i], m.ix.id); if(!id) continue;
    if(first[id] === undefined){ first[id] = i; continue; }
    twins.push({ at: i + 1, id: id, keeperAt: first[id] + 1,
      name: cell_(v[i], m.ix.name), phone: phone10_(v[i][m.ix.phone]),
      st: String(v[i][m.ix.status] || 'PENDING'),
      keeperSt: String(v[first[id]][m.ix.status] || 'PENDING'),
      f: dateText_(v[i][m.ix.fromDate]) });
  }
  if(!twins.length){ Logger.log('No id appears twice on the Leave register. Nothing to close.'); return; }
  const now = new Date().toISOString();
  const L = [twins.length + ' twin row(s) — the same id written twice by the pre-6.9.9 race:\n'];
  let closed = 0;
  twins.forEach(t => {
    const act = t.st === 'PENDING' ? (commit ? 'CLOSED' : 'would close') : 'LEFT ALONE (carries a decision — settle by hand)';
    L.push('  row ' + t.at + '  ' + t.id + '  ' + t.name + ' (' + t.phone + ')  ' + dmy_(t.f) +
           '  twin is ' + t.st + ', the record (row ' + t.keeperAt + ') is ' + t.keeperSt + '  → ' + act);
    if(t.st !== 'PENDING' || !commit) return;
    sh.getRange(t.at, m.ix.status + 1).setValue('WITHDRAWN');
    sh.getRange(t.at, m.ix.decidedBy + 1).setValue(ADMIN_BY);
    sh.getRange(t.at, m.ix.decidedAt + 1).setValue(now);
    sh.getRange(t.at, m.ix.remarks + 1).setValue(
      'Twin row from a sync race — the first row with this id is the record. ' +
      'Closed by the office, not refused; no default by the officer.');
    admLog_('CLOSE TWIN LEAVE ROW', t.name + ' (' + t.phone + ')',
            t.id + ' row ' + t.at + ' closed; row ' + t.keeperAt + ' (' + t.keeperSt + ') is the record');
    closed++;
  });
  L.push('');
  L.push(commit ? closed + ' twin row(s) marked WITHDRAWN; each is on the Audit tab.'
                : 'DRY RUN — nothing written. Run closeTwinLeaveRows(true) to close the PENDING twins.');
  Logger.log(L.join('\n'));
}

/* ----------------------------------------------------------------------------
 * THE VILLAGE ROLL, AUDITED. The GPs tab is the denominator of every
 * filing figure — the console, the workbook, the reminders. Duplicate rows
 * inflate it silently: the district showed 102 filed and 275 pending at
 * once. The code now collapses duplicates when it reads (gpRoll_), so the
 * counts are right either way; this pair cleans the tab itself, and shows
 * the things a script must not decide — one village name under two
 * mandals, and this month's filings whose spelling matches no roll row.
 * ------------------------------------------------------------------------- */
function gpRollAudit(){ admGpRoll_(false); }
function applyGpDedupe(){ admGpRoll_(true); }
function admGpRoll_(commit){
  const sh = sheet_('GPs', ['Mandal','GP']);
  const v = sh.getDataRange().getValues();
  const head = v[0].map(h => String(h).toLowerCase().trim());
  let mi = -1, gi = -1;
  head.forEach((h, i) => { if(h.indexOf('mandal') >= 0) mi = i; else if(h === 'gp' || h.indexOf('village') >= 0 || h.indexOf('panchayat') >= 0) gi = i; });
  if(mi < 0 || gi < 0){ mi = 0; gi = 1; }
  const nrm = s => String(s || '').trim().toLowerCase();
  const seen = {}, dupRows = [], byGp = {};
  let named = 0;
  for(let i = 1; i < v.length; i++){
    const m2 = String(v[i][mi] || '').trim(), g = String(v[i][gi] || '').trim();
    if(!m2 || !g) continue;
    named++;
    const k = nrm(m2) + '|' + nrm(g);
    if(seen[k]) dupRows.push({ at: i + 1, mandal: m2, gp: g, firstAt: seen[k] });
    else { seen[k] = i + 1; (byGp[nrm(g)] = byGp[nrm(g)] || []).push(m2); }
  }
  const L = ['THE VILLAGE ROLL — ' + named + ' named row(s), ' + Object.keys(seen).length +
             ' distinct village(s), ' + dupRows.length + ' duplicate row(s).\n'];
  if(dupRows.length){
    L.push('Duplicate rows (the first stays, these ' + (commit ? 'are deleted' : 'would be deleted') + '):');
    dupRows.forEach(d => L.push('  row ' + d.at + '  ' + d.mandal + ' / ' + d.gp + '  (first at row ' + d.firstAt + ')'));
    L.push('');
  }
  const straddle = Object.keys(byGp).filter(g => byGp[g].length > 1);
  if(straddle.length){
    L.push('One name under more than one mandal — possibly right, possibly a mis-keyed row; the office decides:');
    straddle.forEach(g => L.push('  ' + g + ': ' + byGp[g].join(' / ')));
    L.push('');
  }
  /* filings this month whose spelling matches no roll row */
  const ym = today_().slice(0, 7);
  const ish = sheet_('Inspections', HEADERS), im = headMap_(ish, HEADERS);
  const iv = ish.getDataRange().getValues();
  const stray = {};
  for(let i = 1; i < iv.length; i++){
    if(ymText_(iv[i][im.ix.ym]) !== ym) continue;
    const k = nrm(iv[i][im.ix.mandal]) + '|' + nrm(iv[i][im.ix.gp]);
    if(!seen[k]) stray[cell_(iv[i], im.ix.mandal) + ' / ' + cell_(iv[i], im.ix.gp)] = true;
  }
  const strayL = Object.keys(stray);
  if(strayL.length){
    L.push('Filed this month but matching no roll row — a spelling to reconcile, not a fault:');
    strayL.forEach(s => L.push('  ' + s));
    L.push('');
  }
  if(commit && dupRows.length){
    for(let i = dupRows.length - 1; i >= 0; i--){    /* bottom-up, so rows keep their numbers */
      sh.deleteRow(dupRows[i].at);
      admLog_('GP ROLL DEDUPE', dupRows[i].mandal + ' / ' + dupRows[i].gp,
              'duplicate row ' + dupRows[i].at + ' removed; first row ' + dupRows[i].firstAt + ' stays');
    }
    L.push(dupRows.length + ' duplicate row(s) removed; each is on the Audit tab. Run gpRollAudit() again — it should find none.');
  } else if(!commit){
    L.push(dupRows.length ? 'DRY RUN — nothing written. Run applyGpDedupe() to remove the duplicate rows.'
                          : 'Nothing to remove.');
  }
  Logger.log(L.join('\n'));
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
 *   orFind       a second place to look when find misses — used so a line
 *                anchored on the village a man is LEAVING still finds him on
 *                the second run, once he has left it
 *   resetPin     fresh PIN, number unchanged. Only where the officer asked:
 *                it invalidates the PIN he is using today
 *   pinIfNone    a PIN only if the row carries none — for a re-mapping, which
 *                changes a man's village and must not cost him his login
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

  /* 2 — deputation into Desaithanda. The 17.08 run found NO row whose
     village reads "Desaithanda", so his own number is the surer key. */
  {why:'Issue 2: Thouti Reddy Shashi Kumar deputed from Tharigoppula to Desaithanda (Chilpur) — if his number is on the roll, it moves to Desaithanda',
   find:{phone:'9493438111'}, setGp:'Desaithanda', setMandal:'Chilpur', setName:'Thouti Reddy Shashi Kumar'},
  {why:'Issue 2: and if 9493438111 was never on the roll, he is registered on Desaithanda — verify the spelling against the GPs tab afterwards',
   addRow:{phone:'9493438111', name:'Thouti Reddy Shashi Kumar', role:'PS', mandal:'Chilpur', gp:'Desaithanda'}},

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
   find:{role:'PS', gp:'Kothapal'}, claimPhone:'9133467909'},

  /* roll hygiene, 19.08 — the console greeted the Collector as "Collector &" */
  {why:'Roll hygiene 19.08: the Collector’s own row carries a designation where the name belongs — the console was greeting him with "Collector &…". Name set; number and PIN untouched',
   find:{role:'COLLECTOR'}, setName:'Sandeep Kumar Jha'}
];

/* What the tracker asks for but the record contradicts. Nothing here is
   applied. Settle each with the office, move the answer into FIELD_FIXES_2,
   and delete the entry. */
var CONTESTED_2 = [
  {issue:8, name:'Ramrajupalle charge', q:'The tracker says "give login to 9912383087" for Rajashekar — but 28.07 already gave J. Rajashekar (Neermala) the village in charge, and if his existing sign-in works, moving him to a new number would lock him out. WHOSE number is 9912383087, and does his current login work?'},
  {issue:9, name:'Dharavath Thanda', q:'Once Santhoshini’s row moves to Dharmagadda Thanda, nobody holds Dharavath Thanda — and 28.07 put 7675827928 on a Dharmagadda Thanda row, so that village may now be held twice. Who actually holds Dharavath Thanda, and is 7675827928 a real officer?'},
  {issue:'roll', name:'MSO names', q:'Rows named "MSO Lingalaghanpur", "MSO Tharigoppula" and "MSO Zaffergadh" carry a designation where the officer’s name belongs — notices of 11–13.08 went out so addressed (all since withdrawn). Which officers hold these posts? Their names go on the rows the moment the office says.'}
];

/* ============================================================================
 * 10. MSO RELIEF · 19.08.2026
 * ----------------------------------------------------------------------------
 * By the Collector's order, MSO attendance is VOLUNTARY from 19.08.2026:
 * attExempt_ in Code.gs now carries the rule going forward — no reminder,
 * no notice, no debit can be raised against an MSO. This job settles the
 * PAST: every instrument already standing against an MSO on the register
 * is taken back, in the house manner — nothing deleted, everything audited.
 *   - a PROPOSED notice dies unnumbered: DROPPED
 *   - a served notice (PENDING or ACK) is WITHDRAWN, its number kept
 *   - a leave day debited under one is reversed: the SYSCL row goes
 *     CANCELLED and the notice's flag reads REVERSED
 * Reminders stand as the history they are — they never counted, never
 * locked, never debited. Run showMsoRelief() first, read, then apply.
 * ========================================================================== */
function showMsoRelief(){ msoRelief_(false); }
function applyMsoRelief(){ msoRelief_(true); }
function msoRelief_(commit){
  const t = uidx_(), uv = t.sh.getDataRange().getValues(), mso = {};
  for(let i = 1; i < uv.length; i++)
    if(String(uv[i][t.ix.role]).trim().toUpperCase() === 'MSO'){
      const p = phone10_(uv[i][t.ix.phone]); if(p) mso[p] = cell_(uv[i], t.ix.name);
    }
  const sh = sheet_('Notices', N_HEAD), m = headMap_(sh, N_HEAD);
  const v = sh.getDataRange().getValues();
  const lsh = sheet_('Leave', L_HEAD), lm = headMap_(lsh, L_HEAD);
  const now = new Date().toISOString();
  const WHY = 'MSO attendance made voluntary by the Collector’s order of 19.08.2026';
  const out = []; let dropped = 0, withdrawn = 0, reversed = 0;
  for(let i = 1; i < v.length; i++){
    const ph = phone10_(v[i][m.ix.phone]); if(!(ph in mso)) continue;
    const st = String(v[i][m.ix.status] || '');
    if(st !== 'PROPOSED' && st !== 'PENDING' && st !== 'ACK') continue;
    const no = cell_(v[i], m.ix.no) || '(unnumbered)', d = dateText_(v[i][m.ix.date]);
    const debited = String(v[i][m.ix.clDebited]).toUpperCase() === 'TRUE';
    const lid = cell_(v[i], m.ix.leaveId);
    const newSt = st === 'PROPOSED' ? 'DROPPED' : 'WITHDRAWN';
    if(commit){
      sh.getRange(i + 1, m.ix.status + 1).setValue(newSt);
      sh.getRange(i + 1, m.ix.decidedBy + 1).setValue(newSt + ' · ' + WHY);
      sh.getRange(i + 1, m.ix.decidedAt + 1).setValue(now);
      if(debited && lid){
        const lv = lsh.getDataRange().getValues();
        for(let j = 1; j < lv.length; j++){
          if(cell_(lv[j], lm.ix.id) !== lid) continue;
          lsh.getRange(j + 1, lm.ix.status + 1).setValue('CANCELLED');
          lsh.getRange(j + 1, lm.ix.remarks + 1).setValue('Reversed — ' + WHY + '; the notice for ' + dmy_(d) + ' stands withdrawn.');
          lsh.getRange(j + 1, lm.ix.decidedBy + 1).setValue(ADMIN_BY);
          lsh.getRange(j + 1, lm.ix.decidedAt + 1).setValue(now);
          reversed++; break;
        }
        sh.getRange(i + 1, m.ix.clDebited + 1).setValue('REVERSED');
      }
      admLog_('MSO RELIEF', (mso[ph] || '') + ' (' + ph + ')',
        no + ' for ' + d + ' — ' + newSt.toLowerCase() + (debited ? '; one day of leave reversed' : ''));
    }
    if(st === 'PROPOSED') dropped++; else withdrawn++;
    out.push('  ' + (commit ? '' : 'would ') + (st === 'PROPOSED' ? 'DROP ' : 'WITHDRAW ') + no + ' · ' +
      (mso[ph] || ph) + ' · ' + d + ' (' + st + (debited ? ' · leave debit to reverse' : '') + ')');
  }
  Logger.log((commit ? 'MSO RELIEF — APPLIED\n\n' : 'MSO RELIEF — DRY RUN, nothing written\n\n') +
    Object.keys(mso).length + ' MSO(s) on the roll.\n' +
    (out.length ? out.join('\n') : '  nothing stands against any MSO — the register is already clear') +
    '\n\n' + dropped + ' proposal(s) ' + (commit ? 'dropped' : 'to drop') + ', ' + withdrawn + ' served notice(s) ' +
    (commit ? 'withdrawn' : 'to withdraw') + (commit ? ', ' + reversed + ' leave debit(s) reversed to CANCELLED' : '') + '.' +
    '\nReminders stand as history — they never counted, locked, or debited.' +
    (commit ? '\nEvery action is on the Audit tab. Those officers’ apps unlock at their next refresh.'
            : '\nRun applyMsoRelief() to write it.'));
}

/* ============================================================================
 * 11. THE TELANGANA HOLIDAY LIST · 2026
 * ----------------------------------------------------------------------------
 * G.O.Rt.No.1715, General Administration (SPL.E) Dept., dt. 06.12.2025:
 * Annexure-I's 27 General Holidays, and para 2's direction that all offices
 * remain closed on second Saturdays. On every date written here the app's
 * gate turns voluntary and no reminder, notice or debit can arise — the
 * Holidays tab is the one switch the whole engine already obeys.
 *
 * Annexure-II's OPTIONAL holidays are deliberately NOT here: the G.O. keeps
 * offices open on those days; they are an individual's choice of five, to
 * be taken as leave, not a closure of the district.
 *
 * Dates are written as PLAIN TEXT yyyy-mm-dd, which no locale or timezone
 * can reinterpret — the tab has paid for that lesson once already. Dates
 * already on the tab are skipped, so the job runs twice without harm.
 * Run showTsHolidays() first, read, then applyTsHolidays().
 * ========================================================================== */
var TS_HOLIDAYS_2026 = [
  ['2026-01-14','Bhogi'],
  ['2026-01-15','Sankranti / Pongal'],
  ['2026-01-26','Republic Day'],
  ['2026-02-15','Maha Shivaratri'],
  ['2026-03-03','Holi'],
  ['2026-03-19','Ugadi'],
  ['2026-03-21','Eidul Fitr (Ramzan)'],
  ['2026-03-22','Following day of Ramzan'],
  ['2026-03-27','Sri Rama Navami'],
  ['2026-04-03','Good Friday'],
  ['2026-04-05','Babu Jagjivan Ram’s Birthday'],
  ['2026-04-14','Dr. B.R. Ambedkar’s Birthday'],
  ['2026-05-27','Eidul Azha (Bakrid)'],
  ['2026-06-26','Shahadat Imam Hussain (R.A) 10th Moharam'],
  ['2026-08-10','Bonalu'],
  ['2026-08-15','Independence Day'],
  ['2026-08-26','Eid Miladun Nabi'],
  ['2026-09-04','Sri Krishna Astami'],
  ['2026-09-14','Vinayaka Chavithi'],
  ['2026-10-02','Mahatma Gandhi Jayanthi'],
  ['2026-10-18','Saddula Bathukamma'],
  ['2026-10-20','Vijaya Dasami / Dushera'],
  ['2026-10-21','Following day of Vijaya Dasami'],
  ['2026-11-08','Deepavali'],
  ['2026-11-24','Kartika Purnima / Guru Nanak’s Jayanthi'],
  ['2026-12-25','Christmas'],
  ['2026-12-26','Following day of Christmas (Boxing Day)']
];
/* para 2 of the G.O.: every second Saturday of 2026 */
var TS_SECOND_SATURDAYS_2026 = ['2026-01-10','2026-02-14','2026-03-14','2026-04-11','2026-05-09','2026-06-13',
  '2026-07-11','2026-08-08','2026-09-12','2026-10-10','2026-11-14','2026-12-12'];

function showTsHolidays(){ tsHolidays_(false); }
function applyTsHolidays(){ tsHolidays_(true); }
function tsHolidays_(commit){
  const sh = sheet_('Holidays', H_HEAD);
  const have = holidaySet_();                       /* read the tab as the engine reads it */
  const want = TS_HOLIDAYS_2026.concat(TS_SECOND_SATURDAYS_2026.map(d => [d, 'Second Saturday']));
  const out = []; let added = 0, skipped = 0;
  want.forEach(w => {
    const d = w[0], occ = w[1];
    if(have[d]){ skipped++; out.push('  already on the tab: ' + d + ' · ' + (have[d] === occ ? occ : have[d] + ' (list says: ' + occ + ')')); return; }
    /* the second-Saturday cross-check the tab proves on itself */
    if(occ === 'Second Saturday' && occasionFits_(d, occ) !== true){ out.push('  ✗ REFUSED ' + d + ' — it is not a second Saturday; check the list'); return; }
    if(commit) sh.appendRow(["'" + d, occ]);
    added++; out.push('  ' + (commit ? 'added: ' : 'would add: ') + d + ' · ' + occ);
  });
  if(commit && added) admLog_('HOLIDAYS LOADED', 'G.O.Rt.No.1715 dt. 06.12.2025', added + ' date(s) written as plain text; ' + skipped + ' already stood');

  /* days now declared off on which an instrument already stands — reported,
     never touched: whether those are withdrawn is the Collector's word */
  const offSet = {}; want.forEach(w => { offSet[w[0]] = w[1]; });
  const nsh = sheet_('Notices', N_HEAD), nm = headMap_(nsh, N_HEAD);
  const nv = nsh.getDataRange().getValues();
  const standing = [];
  for(let i = 1; i < nv.length; i++){
    const st = String(nv[i][nm.ix.status] || '');
    if(st !== 'PROPOSED' && st !== 'PENDING' && st !== 'ACK') continue;
    const d = dateText_(nv[i][nm.ix.date]);
    if(offSet[d]) standing.push('  ' + (cell_(nv[i], nm.ix.no) || '(unnumbered)') + ' · ' + cell_(nv[i], nm.ix.name) + ' · ' + d + ' (' + offSet[d] + ') · ' + st);
  }
  Logger.log((commit ? 'TELANGANA HOLIDAYS 2026 — APPLIED\n\n' : 'TELANGANA HOLIDAYS 2026 — DRY RUN, nothing written\n\n') +
    out.join('\n') + '\n\n' + added + ' date(s) ' + (commit ? 'added' : 'to add') + ', ' + skipped + ' already on the tab.' +
    '\nOn every listed date attendance is voluntary: the app’s gate stands open, and no reminder, notice or debit can arise.' +
    '\nAnnexure-II’s optional holidays are NOT loaded — the G.O. keeps offices open on those days.' +
    (standing.length ? '\n\n✗ INSTRUMENTS STANDING ON DAYS NOW DECLARED OFF — say the word and they are withdrawn like the MSO relief:\n' + standing.join('\n')
                     : '\n\nNo notice stands against any of these dates.') +
    (commit ? '' : '\n\nRun applyTsHolidays() to write it.'));
}

/* the PIN a fix hands out — derived from the number AND the batch date, so
   running the batch again yields the same PIN and re-runs change nothing */
/* Is this the same officer, written two ways? The registers spell a man
   "L Mahesh Kumar", "L. Mahesh Kumar" and "Mahesh Kumar L"; the trackers
   abbreviate a surname to an initial. Two names are the same officer when
   they share a word of real length — initials and honorifics do not count,
   because "A. Narmada" and "A. Ramesh" share only the A. */
function sameOfficer_(a, b){
  const words = s => String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ')
    .split(/\s+/).filter(w => w.length > 2 && ['smt','shri','sri','mrs'].indexOf(w) < 0);
  const A = words(a), B = words(b);
  if(!A.length || !B.length) return true;      /* a blank name blocks nothing */
  return A.some(w => B.indexOf(w) >= 0);
}
function batchPin_(phone, batch){
  return String(1000 + (parseInt(hash_(phone + '|' + batch, 'fix2').replace(/\D/g, '').slice(0, 6) || '0', 10) % 9000));
}
function fix2Pin_(phone){ return batchPin_(phone, FIX2_BATCH); }

function showFieldFixes2(){ fieldFixes2_(false); }
function applyFieldFixes2(){ fieldFixes2_(true); }
function fieldFixes2_(commit){
  /* no name guard: this batch was written and read line by line against the
     roll of the day, and it is kept exactly as it ran. The guard is the rule
     from 22.08 onwards — see fieldBatch_. */
  fieldBatch_(FIX2_BATCH, FIELD_FIXES_2, CONTESTED_2, commit, 'applyFieldFixes2',
    'Now run rosterAudit(): it should show the blanked MPDO Lingala Ghanpur row, and whatever CONTESTED_2 leaves open.', false);
}

/* THE ENGINE, shared by every batch. It was written for the 17.08 register
   and is kept general from 22.08: a batch is a date, a list and its open
   questions, and nothing about the machinery differs between them. One copy
   only — a second copy would drift, and this file decides who is on the roll. */
function fieldBatch_(BATCH, LIST, CONTESTED, commit, doerName, tailNote, guardNames){
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

  LIST.forEach(fx => {
    try{
      if(fx.addRow){
        const a = fx.addRow, ph = phone10_(a.phone);
        if(byPhone[ph] != null){ out.push('SKIP (already on the roll): ' + fx.why); return; }
        const pin = batchPin_(ph, BATCH);
        const row = new Array(width).fill('');
        const put = (k, val) => { if(t.ix[k] >= 0) row[t.ix[k]] = val; };
        put('phone', "'" + ph); put('name', a.name); put('role', a.role);
        put('mandal', a.mandal || ''); put('gp', a.gp || '');
        put('hash', hash_(ph, pin)); put('initpin', ''); put('active', 'TRUE');
        if(commit){
          sh.appendRow(row);
          admLog_('FIELD FIX ' + BATCH, a.name + ' (' + ph + ')', 'registered · ' + a.role + ' · ' + (a.mandal || '') + ' / ' + (a.gp || ''));
        }
        v.push(row); byPhone[ph] = v.length - 1;
        out.push((commit ? 'ADDED: ' : 'would ADD: ') + a.name + ' (' + a.role + ', ' + a.gp + ') ' + ph + ' — PIN ' + pin + ' (change forced on first sign-in)');
        return;
      }
      /* ANCHOR ON THE VILLAGE, FALL BACK TO THE NUMBER. find:{phone} returns
         the FIRST row carrying it, which for a shared number is the senior
         row — so a line meant to correct a Secretary would have rewritten an
         MPDO's row into the Secretary's name and blanked the Secretary's own.
         Every line that can name a village names it first; orFind catches the
         second run, when that village has already moved to its new holder. */
      let i = findRow(fx.find);
      if(i < 0 && fx.orFind) i = findRow(fx.orFind);
      if(i < 0){ out.push('NOT FOUND (fix by hand): ' + fx.why); return; }

      /* THE NAME GUARD. A village is often held in charge by a neighbouring
         Secretary, and a number is sometimes on a senior officer's row — so
         the row a line lands on is not always the officer the line is about.
         Rewriting it would put one officer's name over another's record,
         which is how a default gets attributed to the wrong person. When the
         row already carries a plainly different name, NOTHING on it is
         touched and the office is told. Pass renameOk:true to override, and
         only when the office has confirmed the row really is his. */
      if(guardNames && fx.setName && !fx.renameOk){
        const had = cell_(v[i], t.ix.name);
        if(had && !sameOfficer_(had, fx.setName)){
          out.push('CONFLICT (row ' + (i + 1) + ' reads "' + had + '", not "' + fx.setName +
                   '" — that row is somebody else’s, or holds the village in charge; nothing was touched): ' + fx.why);
          return;
        }
      }
      const changed = [], audit = [];
      if(fx.deactivate){
        if(String(v[i][t.ix.active]).toUpperCase() !== 'FALSE'){
          v[i][t.ix.active] = 'FALSE'; writeRow(i);
          if(commit) admLog_('FIELD FIX ' + BATCH, cell_(v[i], t.ix.name), 'deactivated · ' + fx.why.slice(0, 180));
          out.push((commit ? 'DEACTIVATED: ' : 'would DEACTIVATE: ') + fx.why);
        } else out.push('OK ALREADY: ' + fx.why);
        return;
      }
      if(fx.claimPhone){
        const np = phone10_(fx.claimPhone);
        /* Release the number from EVERY other row first — even when the
           target row already holds it. The 17.08 run found the number on
           BOTH the Secretary's row and the MPDO's, and a check that read
           "already claimed" as "already released" left the senior row in
           place — so the folded login still answered as the MPDO. */
        for(let o = 1; o < v.length; o++){
          if(o === i || phone10_(v[o][t.ix.phone]) !== np) continue;
          v[o][t.ix.phone] = ''; v[o][t.ix.hash] = ''; writeRow(o);
          out.push('  ' + (commit ? 'released ' : 'would release ') + np + ' from row ' + (o + 1) + ' (' + (cell_(v[o], t.ix.name) || cell_(v[o], t.ix.role)) + ') — that officer needs a real number before they can sign in');
          changed.push('released ' + np + ' from row ' + (o + 1));
          audit.push('released ' + np + ' from ' + (cell_(v[o], t.ix.name) || 'row ' + (o + 1)));
        }
        byPhone[np] = i;
        if(phone10_(v[i][t.ix.phone]) === np && v[i][t.ix.hash]){ /* already signed in on it — the PIN is not touched */ }
        else{
          const pin = batchPin_(np, BATCH);
          v[i][t.ix.phone] = np; v[i][t.ix.hash] = hash_(np, pin); if(t.ix.initpin >= 0) v[i][t.ix.initpin] = '';
          changed.push('claimed ' + np + ', PIN ' + pin); audit.push('claimed ' + np + ', PIN re-keyed');
        }
      }
      if(fx.setPhone){
        const np = phone10_(fx.setPhone), old = phone10_(v[i][t.ix.phone]);
        if(old === np && v[i][t.ix.hash]){ /* already right */ }
        else if(byPhone[np] != null && byPhone[np] !== i){ out.push('CONFLICT (number already on row ' + (byPhone[np] + 1) + '): ' + fx.why); return; }
        else{
          const pin = batchPin_(np, BATCH);
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
      /* A PIN ONLY WHERE THERE IS NONE. A deputation is a change of village,
         not of login — an officer whose sign-in works must not be locked out
         of it by a batch he never asked anything of, and made to wait on a
         circular. This fills the gap for a row that carries no PIN at all
         and leaves every working PIN exactly as it stands. */
      if(fx.pinIfNone && !v[i][t.ix.hash]){
        const ph0 = phone10_(v[i][t.ix.phone]);
        if(ph0.length === 10){
          const p0 = batchPin_(ph0, BATCH);
          v[i][t.ix.hash] = hash_(ph0, p0); if(t.ix.initpin >= 0) v[i][t.ix.initpin] = '';
          changed.push('had no PIN at all — PIN ' + p0); audit.push('PIN set (the row carried none)');
        }
      }
      if(fx.resetPin){
        const ph = phone10_(v[i][t.ix.phone]), pin = batchPin_(ph, BATCH);
        if(v[i][t.ix.hash] === hash_(ph, pin)){ /* this batch already reset it */ }
        else{
          v[i][t.ix.hash] = hash_(ph, pin); if(t.ix.initpin >= 0) v[i][t.ix.initpin] = '';
          changed.push('PIN reset → ' + pin); audit.push('PIN reset');
        }
      }
      if(changed.length){
        writeRow(i);
        if(commit) admLog_('FIELD FIX ' + BATCH, cell_(v[i], t.ix.name) + ' (' + phone10_(v[i][t.ix.phone]) + ')', audit.join('; '));
        out.push((commit ? 'FIXED: ' : 'would FIX: ') + fx.why + ' — ' + changed.join('; '));
      } else out.push('OK ALREADY: ' + fx.why);
    }catch(err){ out.push('ERROR on "' + fx.why + '": ' + err); }
  });

  out.push('');
  if(CONTESTED && CONTESTED.length){
    out.push('NOT TOUCHED — the tracker and the record disagree; settle these with the office:');
    CONTESTED.forEach(c => out.push('  Issue ' + c.issue + ' (' + c.name + '): ' + c.q));
    out.push('');
  }
  out.push(commit === true
    ? 'Applied. The PINs above are shown ONCE — circulate each to that officer alone. ' + (tailNote || '')
    : 'DRY RUN — nothing was written. Read the plan above, then run ' + doerName + '().');
  const text = out.join('\n');
  Logger.log(text);
  return text;      /* so the Sheet menu can put it in front of the Collector */
}

/* ============================================================================
 * 12. FIELD ISSUE REGISTER · 22.08.2026
 * ----------------------------------------------------------------------------
 * The mandals' tracker of 22.08.2026 — nineteen rows.
 *
 * READ THIS BEFORE RUNNING ANYTHING. Ten of the nineteen are the SAME
 * complaints the 17.08 register already answers, from the same officers, on
 * the same numbers. Either applyFieldFixes2() was never pressed, or it was
 * pressed and the PINs it printed never reached the officers. Settle which
 * before this batch is applied:
 *   - open the Audit tab and look for lines reading "FIELD FIX 17.08.2026".
 *     If there are none, that batch was a dry run only.
 *   - or run whyCannotSignIn('9866775245') on any one of the repeat numbers.
 * Running this batch answers them either way — the PINs here are new and
 * derived from 22.08, so they can be circulated afresh — but a district
 * should know which of the two happened before it happens a third time.
 *
 * WHAT IS NEW SINCE 17.08
 *   - six deputations between Gram Panchayats (issues 14–19), each of which
 *     leaves the officer's OLD village unheld. Those vacancies are listed in
 *     CONTESTED_3; nobody is posted to them by guesswork.
 *   - three "Getting Error" rows. Two of them are not roster faults at all
 *     and are answered in app.js, not here — see the note at the foot.
 *
 * WHY SO MANY LINES CARRY claimPhone
 * A number that sits on two rows folds into ONE login, and findByPhone_
 * gives that login the SENIOR row's name and village while taking its PIN
 * from whichever row comes FIRST in the sheet. So a Secretary can be shown
 * an MPDO's name (issues 3 and 11), and a PIN reset written to the row you
 * meant can be ignored in favour of a stale row above it (issues 4, 9, 10).
 * claimPhone releases the number from every other row before re-keying, so
 * the PIN that is printed is the PIN that will actually open the app.
 * ========================================================================== */
var FIX3_BATCH = '22.08.2026';
var FIELD_FIXES_3 = [
  /* --- registrations: "Register mobile number and Generate PIN" ---------- */

  {why:'Issue 1: Penthala Madhavi (PS Chinnapendyala, Chilpur) back from child-care leave — registered if she is not on the roll',
   addRow:{phone:'9553399695', name:'Penthala Madhavi', role:'PS', mandal:'Chilpur', gp:'Chinnapendyala'}},
  {why:'Issue 1: and if she was already on the roll, her row is corrected and given a PIN she can be told',
   find:{role:'PS', gp:'Chinnapendyal'}, orFind:{phone:'9553399695'},
   claimPhone:'9553399695', setName:'Penthala Madhavi', setGp:'Chinnapendyala', setMandal:'Chilpur', resetPin:true},

  {why:'Issue 2: Thouti Reddy Shashi Kumar deputed Tharigoppula → Desaithanda (Chilpur), with a PIN',
   find:{role:'PS', gp:'Desai'}, orFind:{phone:'9493438111'},
   claimPhone:'9493438111', setName:'Thouti Reddy Shashi Kumar', setGp:'Desaithanda', setMandal:'Chilpur', resetPin:true},
  {why:'Issue 2: and if 9493438111 was never on the roll, he is registered on Desaithanda',
   addRow:{phone:'9493438111', name:'Thouti Reddy Shashi Kumar', role:'PS', mandal:'Chilpur', gp:'Desaithanda'}},

  /* 3 — she is shown a stranger's name and village after marking: the fold.
     Found by her VILLAGE, not her number, because her number is exactly what
     is landing on somebody else's row. */
  {why:'Issue 3: Kadavergu Jyothi (PS Peddapahad, Jangaon) sees another officer’s name and village after marking — her PS row claims 8309450336 outright, releasing it from any other row, and takes a fresh PIN',
   find:{role:'PS', gp:'Peddapahad'}, orFind:{phone:'8309450336'},
   claimPhone:'8309450336', setName:'Kadavergu Jyothi', setGp:'Peddapahad', setMandal:'Jangaon', resetPin:true},
  {why:'Issue 3: and if no row reads Peddapahad at all, she is registered on it',
   addRow:{phone:'8309450336', name:'Kadavergu Jyothi', role:'PS', mandal:'Jangaon', gp:'Peddapahad'}},

  {why:'Issue 4: Donthi Praveen Kumar (PS Pedda Thanda (M), Jangaon) — "wrong PIN". His number is released from every other row and re-keyed. A plain reset can miss: the folded login takes its PIN from the FIRST row holding one, which need not be the row anybody reset',
   find:{role:'PS', gp:'Pedda Thanda (M)'}, orFind:{phone:'9848188052'},
   claimPhone:'9848188052', setName:'Donthi Praveen Kumar', setGp:'Pedda Thanda (M)', setMandal:'Jangaon', resetPin:true},

  {why:'Issue 5: Gouraipally Kavitha (PS Venkriyala) told "this number is not registered" — the Venkriyala row takes 9398525190 and a fresh PIN',
   find:{role:'PS', gp:'Venkriyala'}, orFind:{phone:'9398525190'},
   claimPhone:'9398525190', setName:'Gouraipally Kavitha', resetPin:true},
  {why:'Issue 5: and if no row reads Venkriyala, she is registered on it',
   addRow:{phone:'9398525190', name:'Gouraipally Kavitha', role:'PS', mandal:'Jangaon', gp:'Venkriyala'}},

  /* 6 & 7 — the Cheeturu / Ramachandragudem swap, both directions, third
     time of asking. Each also gets a PIN this time: the tracker asks for one. */
  {why:'Issue 6: L. Mahesh Kumar deputed to Cheeturu from Ramachandragudem (Lingala Ghanpur)',
   find:{role:'PS', gp:'Cheeturu'}, orFind:{phone:'7680966701'},
   claimPhone:'7680966701', setName:'L. Mahesh Kumar', setGp:'Cheeturu', setMandal:'Lingala Ghanpur', resetPin:true},
  {why:'Issue 6: and if 7680966701 is not on the roll, he is registered on Cheeturu',
   addRow:{phone:'7680966701', name:'L. Mahesh Kumar', role:'PS', mandal:'Lingala Ghanpur', gp:'Cheeturu'}},
  {why:'Issue 7: V. Srinivas Reddy deputed to Ramachandragudem from Cheeturu (Lingala Ghanpur)',
   find:{role:'PS', gp:'Ramachandragudem'}, orFind:{phone:'8008756396'},
   claimPhone:'8008756396', setName:'V. Srinivas Reddy', setGp:'Ramachandragudem', setMandal:'Lingala Ghanpur', resetPin:true},
  {why:'Issue 7: and if 8008756396 is not on the roll, he is registered on Ramachandragudem',
   addRow:{phone:'8008756396', name:'V. Srinivas Reddy', role:'PS', mandal:'Lingala Ghanpur', gp:'Ramachandragudem'}},

  /* 8 — the officer says where she works; the register follows her, not the
     other way about. This empties Dharavath Thanda — see CONTESTED_3. */
  {why:'Issue 8: N. Santhoshini works Dharmagadda Thanda; her row reads Dharavath Thanda. Mapped to Dharmagadda Thanda — NOTE this leaves Dharavath Thanda unheld',
   find:{role:'PS', gp:'Dharavath'}, orFind:{phone:'9398535516'},
   claimPhone:'9398535516', setName:'N. Santhoshini', setGp:'Dharmagadda Thanda', setMandal:'Devaruppula', pinIfNone:true},

  {why:'Issue 9: Kota Bayyanna (PS Rangarai Gudem, Ghanpur (Stn)) — "wrong PIN", released from any other row and re-keyed',
   find:{role:'PS', gp:'Rangarai'}, orFind:{phone:'9866775245'},
   claimPhone:'9866775245', setName:'Kota Bayyanna', setGp:'Rangarai Gudem', setMandal:'Ghanpur (Stn)', resetPin:true},
  {why:'Issue 9: and if 9866775245 is not on the roll at all, he is registered',
   addRow:{phone:'9866775245', name:'Kota Bayyanna', role:'PS', mandal:'Ghanpur (Stn)', gp:'Rangarai Gudem'}},

  {why:'Issue 10: Shaik Irfan (PS Pedda Thanda (Y), Jangaon) — "wrong PIN", released from any other row and re-keyed',
   find:{role:'PS', gp:'Pedda Thanda (Y)'}, orFind:{phone:'7794936639'},
   claimPhone:'7794936639', setName:'Shaik Irfan', setGp:'Pedda Thanda (Y)', setMandal:'Jangaon', resetPin:true},
  {why:'Issue 10: and if 7794936639 is not on the roll at all, he is registered',
   addRow:{phone:'7794936639', name:'Shaik Irfan', role:'PS', mandal:'Jangaon', gp:'Pedda Thanda (Y)'}},

  /* --- 11: the fold again, and the plainest example of it ---------------- */
  {why:'Issue 11: Thandra Swapna (PS Kothapally) is shown "Evaluation details · MPDO Lingala Ghanpur" — 9133467909 sits on that MPDO row too and the senior rank wins the login. Her PS row claims the number; the MPDO row is left blank and NEEDS A REAL NUMBER from the office',
   find:{role:'PS', gp:'Kothapal'}, orFind:{phone:'9133467909'},
   claimPhone:'9133467909', setName:'Thandra Swapna', setMandal:'Ghanpur (Stn)', pinIfNone:true},

  /* --- 12 & 13 are not roster faults. Nothing is written for them here.
     12 (Erram Ramesh, ±2000 m, filed unverified) is the evaluation screen
     taking one snap reading of the location where the attendance screen
     listens on for a better one — corrected in app.js on this same date.
     13 (Golusula Kavitha, "location problem error") has no message recorded,
     so it is in CONTESTED_3 until the office says what the screen said. --- */

  /* --- deputations: "Mapped To New GP from Old GP" ---------------------- */

  /* Each is anchored on the village the officer is LEAVING — that row is his
     own, so the name guard passes — and falls back to his number on a second
     run, when the old village no longer reads on any row.
     ISSUE 18 IS LISTED BEFORE ISSUE 14 ON PURPOSE: Sampath must leave
     Vepalagadda Thanda before Kranthi can be found holding it, or both lines
     land on the same row. */

  {why:'Issue 18: B. Sampath deputed from Vepalagadda Thanda (Raghunathpalle) to Rameshwaram (Kodakandla) — his old charge goes to Gadepaka Kranthi under issue 14',
   find:{role:'PS', gp:'Vepalagadda'}, orFind:{phone:'7093155480'},
   claimPhone:'7093155480', setName:'B. Sampath', setGp:'Rameshwaram', setMandal:'Kodakandla', pinIfNone:true},

  {why:'Issue 14: Gadepaka Kranthi mapped to Vepalagadda Thanda (Raghunathpalle) — the charge B. Sampath leaves under issue 18. The tracker does not name her old village, so this one is anchored on her number',
   find:{phone:'9666461661'},
   claimPhone:'9666461661', setName:'Gadepaka Kranthi', setGp:'Vepalagadda Thanda', setMandal:'Raghunathpalle', pinIfNone:true},
  {why:'Issue 14: and if 9666461661 is not on the roll at all, she is registered on Vepalagadda Thanda',
   addRow:{phone:'9666461661', name:'Gadepaka Kranthi', role:'PS', mandal:'Raghunathpalle', gp:'Vepalagadda Thanda'}},

  {why:'Issue 15: Rondla Srinivas Reddy deputed from Shivaji Nagar (Raghunathpalle) to Palakurthy GP (Palakurthy) — leaves Shivaji Nagar unheld',
   find:{role:'PS', gp:'Shivaji'}, orFind:{phone:'8106032343'},
   claimPhone:'8106032343', setName:'Rondla Srinivas Reddy', setGp:'Palakurthy', setMandal:'Palakurthy', pinIfNone:true},

  {why:'Issue 16: Anumula Narmada deputed from Dharmapuram (Devaruppula) to Fatheshapur (Raghunathpalle) — leaves Dharmapuram unheld. This REVERSES the stale TO_REMAP line struck at the head of this file',
   find:{role:'PS', gp:'Dharmapuram'}, orFind:{phone:'8978394484'},
   claimPhone:'8978394484', setName:'Anumula Narmada', setGp:'Fatheshapur', setMandal:'Raghunathpalle', pinIfNone:true},

  {why:'Issue 17: Pogaku Ramajyothi deputed from Appireddypally (Devaruppula) to Mallampally (Raghunathpalle) — leaves Appireddypally unheld',
   find:{role:'PS', gp:'Appireddypally'}, orFind:{phone:'9550923619'},
   claimPhone:'9550923619', setName:'Pogaku Ramajyothi', setGp:'Mallampally', setMandal:'Raghunathpalle', pinIfNone:true},

  {why:'Issue 19: Gummadi Rajula Manjula deputed from Theegaram (Zaffergadh) to Iravennu (Palakurthy) — leaves Theegaram unheld. The tracker leaves this row’s Action column blank; it is read as the deputation the Remarks describe',
   /* THE RUN OF 22.08 FOUND THEEGARAM HELD BY BAKKA MAHENDER, not by her, so
      the name guard stopped the line and nothing was written — which is what
      it is for. Either she had already left Theegaram or the tracker names
      the wrong village, so her own number is the surer key and the village is
      only the fallback. The guard still stands: if 9959972132 turns out to
      sit on somebody else's row, this reports again rather than writing. */
   find:{phone:'9959972132'}, orFind:{role:'PS', gp:'Theegaram'},
   claimPhone:'9959972132', setName:'Gummadi Rajula Manjula', setGp:'Iravennu', setMandal:'Palakurthy', pinIfNone:true}
];

/* What this batch will NOT decide for the district. Nothing here is written.
   Settle each with the office, put the answer into FIELD_FIXES_3, and delete
   the entry. */
var CONTESTED_3 = [
  {issue:13, name:'Golusula Kavitha, PS Chowdur (9553648717)',
   q:'"Location problem error" — but not which error. The screen says one of four things: permission refused, no fix, taking too long, or a coarse fix beyond 250 m. Ask her which line she saw. If it is the fourth, the app.js change of 22.08 answers it; the first three are the handset, not the register.'},

  {issue:'8 / vacancy', name:'Dharavath Thanda',
   q:'Once Santhoshini is mapped to Dharmagadda Thanda nobody holds Dharavath Thanda. Standing since 17.08 and still open. Who holds it? (17.08 also put 7675827928 on a Dharmagadda Thanda row — that village may now be held twice; run gpSpellCheck().)'},

  {issue:'15 / vacancy', name:'Shivaji Nagar, Raghunathpalle', q:'Rondla Srinivas Reddy leaves it for Palakurthy. Who holds Shivaji Nagar now?'},
  {issue:'16 / vacancy', name:'Dharmapuram, Devaruppula',    q:'Anumula Narmada leaves it for Fatheshapur. Who holds Dharmapuram now?'},
  {issue:'17 / vacancy', name:'Appireddypally, Devaruppula', q:'Pogaku Ramajyothi leaves it for Mallampally. Who holds Appireddypally now?'},
  {issue:'19 / vacancy', name:'Theegaram, Zaffergadh',       q:'Gummadi Rajula Manjula leaves it for Iravennu. Who holds Theegaram now?'},

  {issue:11, name:'MPDO Lingala Ghanpur',
   q:'That row is left without a number once Thandra Swapna claims 9133467909. It needs the MPDO’s own number, or the MPDO cannot sign in. Standing since 17.08.'},

  {issue:'roll', name:'MSO names',
   q:'Rows named "MSO Lingalaghanpur", "MSO Tharigoppula" and "MSO Zaffergadh" carry a designation where the officer’s name belongs. Standing since 17.08. Which officers hold these posts?'}
];

function showFieldFixes3(){ return fieldFixes3_(false); }
function applyFieldFixes3(){ return fieldFixes3_(true); }
function fieldFixes3_(commit){
  return fieldBatch_(FIX3_BATCH, FIELD_FIXES_3, CONTESTED_3, commit, 'applyFieldFixes3',
    'Now run rosterAudit() and gpSpellCheck(): between them they show every shared number, every village held twice, ' +
    'and every village left unheld by the six deputations above. Anything logged CONFLICT was NOT applied and needs the office.',
    true);   /* the name guard stands on this batch */
}

/* ============================================================================
 * 13. TWO DIAGNOSTICS FOR THE OFFICE
 * ----------------------------------------------------------------------------
 * Both read only. Neither writes a thing. They exist because "showing wrong
 * PIN" and "wrong gp name" came back a second and a third time, and the
 * office had no way to see WHY without reading the Users tab by eye.
 * ========================================================================== */

/* An officer telephones and says he cannot sign in. Run this against his
   number and the log says exactly what the server will do with it — before
   anybody resets anything. */
function whyCannotSignIn(phone){
  const p = phone10_(phone || '');
  const out = ['Number as read: "' + p + '"'];
  if(p.length !== 10){ out.push('✗ That is not ten digits. The app sends ten; a number stored with +91 or a leading zero is normalised by phone10_, so this one is genuinely malformed.'); Logger.log(out.join('\n')); return; }

  const t = uidx_(), v = t.sh.getDataRange().getValues(), rows = [];
  for(let i = 1; i < v.length; i++) if(phone10_(v[i][t.ix.phone]) === p) rows.push(i);
  if(!rows.length){
    out.push('✗ NOT ON THE ROLL. The app tells him "This number is not registered. Contact the District Panchayat Office." — register him with a line in FIELD_FIXES_3.');
    return admSay_(out);
  }

  out.push(rows.length === 1 ? '✓ One row carries it — row ' + (rows[0] + 1) : '✗ ' + rows.length + ' ROWS carry it: ' + rows.map(i => i + 1).join(', '));
  rows.forEach(i => out.push('    row ' + (i + 1) + ': ' + (cell_(v[i], t.ix.name) || '(no name)') + ' · ' + cell_(v[i], t.ix.role) +
    ' · ' + cell_(v[i], t.ix.mandal) + ' / ' + cell_(v[i], t.ix.gp) +
    ' · ' + (v[i][t.ix.hash] ? 'PIN set' : 'NO PIN') +
    ' · ' + (String(v[i][t.ix.active]).toUpperCase() === 'FALSE' ? 'INACTIVE' : 'active')));

  /* the fold, said out loud — this is the whole answer to issues 3 and 11 */
  const u = findByPhone_(p);
  if(!u){ out.push('✗ findByPhone_ refuses it, which should not happen when rows exist. Read the Phone column of those rows by eye.'); return admSay_(out); }
  out.push('', 'What the app will show him when he signs in:');
  out.push('    name    ' + (u.name || '(blank)'));
  out.push('    role    ' + u.role);
  out.push('    village ' + (u.gps ? u.gps.join(', ') : ''));
  if(rows.length > 1){
    out.push('  ↑ these come from the SENIOR row of the ' + rows.length + ', not from the row you may have meant.');
    let pinRow = -1;
    for(let k = 0; k < rows.length; k++) if(v[rows[k]][t.ix.hash]){ pinRow = rows[k]; break; }
    out.push('  ↑ and the PIN he must type is the one on row ' + (pinRow + 1) + ' — the FIRST row holding a PIN, whatever order you fixed them in.');
    out.push('  → cure: a claimPhone line on the row he should really be, which releases the number from the others.');
  }
  if(!u.active) out.push('✗ Every row on this number is INACTIVE — the app tells him the number is not registered.');
  if(!u.hash)   out.push('✗ No PIN is set on any of these rows — the app tells him "No PIN set for this number yet."');
  /* the same key doPost counts wrong PINs against — an officer locked out by
     his own retries reads as "wrong PIN" to the mandal, and no reset cures it */
  const n = Number(cache_().get('pl_' + u.phone) || 0);
  if(n >= MAX_PIN_TRIES) out.push('✗ ' + n + ' wrong-PIN attempts stand against this number within the hour — the app is refusing him with "Too many wrong attempts" whatever his PIN is. It clears itself; a reset does not hurry it.');
  else if(n > 0) out.push('· ' + n + ' wrong-PIN attempt(s) counted within the hour (' + MAX_PIN_TRIES + ' locks him out).');
  return admSay_(out);
}

/* "Wrong gp name show" — usually the Users tab and the GPs tab spelling the
   same village two ways. A village whose spelling does not match the roll is
   invisible to the coverage count (the roll is matched case-blind, but not
   spelling-blind), so this is not cosmetic: it is why filed-plus-pending can
   fail to add up. */
function gpSpellCheck(){
  const roll = gpRoll_(), byName = {}, out = [];
  roll.forEach(r => { byName[r.gp.trim().toLowerCase()] = r; });

  const t = uidx_(), v = t.sh.getDataRange().getValues(), held = {};
  for(let i = 1; i < v.length; i++){
    if(String(v[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    const role = cell_(v[i], t.ix.role).toUpperCase(); if(role !== 'PS') continue;
    const nm = cell_(v[i], t.ix.name) || '(unnamed)';
    String(v[i][t.ix.gp] || '').split(',').map(g => g.trim()).filter(String).forEach(g => {
      const k = g.toLowerCase();
      (held[k] = held[k] || []).push(nm + ' (row ' + (i + 1) + ')');
      if(!byName[k]) out.push('NOT ON THE GPs TAB: "' + g + '" held by ' + nm + ' (row ' + (i + 1) + ') — the coverage count cannot see this village');
    });
  }
  Object.keys(held).forEach(k => { if(held[k].length > 1)
    out.push('HELD TWICE: "' + k + '" — ' + held[k].join(' | ')); });

  const unheld = roll.filter(r => !held[r.gp.trim().toLowerCase()]);
  if(unheld.length){
    out.push('', 'VILLAGES ON THE ROLL THAT NO ACTIVE SECRETARY HOLDS (' + unheld.length + '):');
    unheld.forEach(r => out.push('    ' + r.mandal + ' / ' + r.gp));
  }
  return admSay_(out.length ? out
    : ['Every village a Secretary holds is on the GPs tab, once, and every village on the tab is held.']);
}

/* ============================================================================
 * 14. CHASING THE TWO DOCUMENTS · the advisory and the plan
 * ----------------------------------------------------------------------------
 * The one channel that reaches an officer whose app is shut. A true push needs
 * a VAPID key signed ES256 and Apps Script signs RSA and HMAC only, so there is
 * no push sender behind this app; the circular and the plan are put in front of
 * the officer when he opens it, and this mails the ones who have not yet acted.
 *
 * IT CHASES, IT DOES NOT ACCUSE. No reminder row, no notice, no debit, no lock
 * — a document is not a default until the Collector says so in writing. The
 * mail says what is outstanding and how to send it, and stops.
 *
 * Read first with showDocumentChase(), then press sendDocumentChase().
 * ========================================================================== */
function showDocumentChase(){ return documentChase_(false); }
function sendDocumentChase(){ return documentChase_(true); }

function documentChase_(send){
  const year = gpdpYear_();
  const adv = activeAdvisory_();

  /* who owes what — read from the two registers, never guessed */
  const gp = JSON.parse(gpdpRegister_({ role:'COLLECTOR', phone:'', name:'', gps:[] }, year).getContent());
  const ad = JSON.parse(advisoryRegister_({ role:'COLLECTOR', phone:'', name:'', gps:[] }, '').getContent());
  const planPending = {};
  (gp.roll || []).forEach(r => { if(!r.uploaded) planPending[r.phone] = true; });
  const advPending = {};
  (ad.roll || []).forEach(r => { if(!r.acknowledged) advPending[r.phone] = true; });

  /* the roll, with the addresses the mail needs */
  const t = uidx_(), uv = t.sh.getDataRange().getValues(), seen = {}, out = [], noMail = [];
  for(let i = 1; i < uv.length; i++){
    const ph = phone10_(uv[i][t.ix.phone]); if(!ph || seen[ph]) continue; seen[ph] = true;
    if(String(uv[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    const role = cell_(uv[i], t.ix.role).toUpperCase();
    if(role === 'COLLECTOR') continue;
    const owesPlan = !!planPending[ph];
    const owesAdv  = !!advPending[ph] && !!adv;
    if(!owesPlan && !owesAdv) continue;
    const rec = { phone:ph, name:cell_(uv[i], t.ix.name), role:role,
                  mandal:cell_(uv[i], t.ix.mandal), gp:cell_(uv[i], t.ix.gp),
                  email:String(uv[i][t.ix.email] || '').trim(), plan:owesPlan, adv:owesAdv };
    if(rec.email) out.push(rec); else noMail.push(rec);
  }

  const L = [];
  L.push('CHASING THE TWO DOCUMENTS · ' + dmy_(today_()));
  L.push('Plan year ' + year + (adv ? ' · advisory "' + adv.title + '"' : ' · no advisory standing'));
  L.push('');
  L.push('Plans outstanding      : ' + Object.keys(planPending).length + ' of ' + ((gp.totals || {}).due || 0));
  L.push('Advisory unacknowledged: ' + (adv ? Object.keys(advPending).length + ' of ' + ((ad.totals || {}).due || 0) : 'n/a'));
  L.push('Officers to be mailed  : ' + out.length);
  if(noMail.length){
    L.push('');
    L.push('NO EMAIL ON THE ROLL — these officers cannot be reached this way (' + noMail.length + '):');
    noMail.slice(0, 40).forEach(r => L.push('  ' + r.name + ' · ' + r.role + ' · ' + (r.mandal || '—') +
      ' · ' + r.phone + '  [' + (r.plan ? 'plan' : '') + (r.plan && r.adv ? ' + ' : '') + (r.adv ? 'advisory' : '') + ']'));
    if(noMail.length > 40) L.push('  … and ' + (noMail.length - 40) + ' more');
    L.push('  → they still see both the moment they open the app.');
  }

  if(!send){
    L.push('');
    L.push('NOTHING HAS BEEN SENT. Run sendDocumentChase() to mail the ' + out.length + ' above.');
    Logger.log(L.join('\n'));
    return L.join('\n');
  }

  /* one mail an officer, naming only what HE owes */
  let sent = 0, failed = 0;
  out.forEach(r => {
    const owes = [];
    if(r.adv)  owes.push('read the Collector’s advisory and acknowledge it');
    if(r.plan) owes.push('send the Gram Panchayat Development Plan for ' + year);
    const subject = 'SJGP · ' + (r.adv && r.plan ? 'advisory and development plan' :
                     r.adv ? 'advisory to be acknowledged' : 'development plan for ' + year) +
                    ' · ' + dmy_(today_());
    const body =
      'Sir/Madam,\n\n' +
      r.name + ' (' + r.role + (r.mandal ? ', ' + r.mandal : '') + (r.gp ? ' / ' + r.gp : '') + ')\n\n' +
      'The district is waiting on the following from you:\n\n' +
      owes.map((x, i) => '  ' + (i + 1) + '. ' + x).join('\n') + '\n\n' +
      (r.adv && adv ? 'ADVISORY: ' + adv.title + '\n' + adv.message + '\n' +
        (adv.url ? adv.url + '\n' : '') + '\n' : '') +
      (r.plan ? 'THE PLAN: one document for ' + year + ' — PDF, Word or Excel, up to ' +
        Math.round(GPDP_MAX_KB / 1024) + ' MB. Send it where there is signal; it goes to the district as you send it.\n\n' : '') +
      'Open the SJGP app on your phone. Both appear on the home screen, and the app shows what is still outstanding.\n\n' +
      'Acknowledging an advisory records only that you have seen it. It is not a report that the work is done, ' +
      'and nothing in this message is a notice under the Conduct Rules.\n\n' +
      '— District Panchayat Office, Jangaon';
    try{ MailApp.sendEmail(r.email, subject, body); sent++; }
    catch(err){ failed++; L.push('  ✗ ' + r.name + ' <' + r.email + '>: ' + err); }
  });

  admLog_('DOCUMENT CHASE', dmy_(today_()),
    sent + ' mailed · ' + Object.keys(planPending).length + ' plans outstanding · ' +
    (adv ? Object.keys(advPending).length + ' advisory pending' : 'no advisory'));
  L.push('');
  L.push(sent + ' officer(s) mailed' + (failed ? ', ' + failed + ' failed' : '') + '.');
  L.push('Nothing was written against anybody: no reminder, no notice, no debit.');
  Logger.log(L.join('\n'));
  return L.join('\n');
}

/* ============================================================================
 * THE APPLICATION THAT WAS SANCTIONED AND WAITING AT THE SAME TIME
 *
 * Reported from the district on 25.08.2026: three applications standing in
 * "Awaiting your orders" on the console for days, whose leave the Collector
 * had already sanctioned.
 *
 * Before saveLeave_ took the script lock, a retry racing its original could
 * append the SAME application id twice. The Collector's order then found the
 * first of the two rows, sanctioned it, and left the twin PENDING — and the
 * twin could never be settled afterwards, because every further order looked
 * the id up, found the first row already APPROVED, and answered "orders have
 * already been passed on this application". It sat there for ever.
 *
 * Code.gs now passes an order on the APPLICATION and writes it to every row
 * carrying its id, and both the console and the app fold twins on the way out,
 * so nothing stale can stand in the waiting list again. This pair is for the
 * rows already on the register: showLeaveTwins() reads, settleLeaveTwins()
 * writes the decision that was actually passed onto the row that missed it.
 *
 * NOTHING IS DESTROYED. No row is deleted and no status is invented: a twin is
 * settled only where another row of the same application already carries the
 * Collector's order, and it is given that order, that hand and that date. An
 * application with no decision on any of its rows is left exactly as it is —
 * it is genuinely waiting, and the Collector decides it, not this job.
 * Run it twice and the second run writes nothing.
 * ------------------------------------------------------------------------- */

/* the register folded by id: every application, and the rows that carry it */
function admLeaveById_(){
  const sh = sheet_('Leave', L_HEAD), m = headMap_(sh, L_HEAD);
  const v = sh.getDataRange().getValues();
  const by = {}, order = [], blanks = [];
  for(let i = 1; i < v.length; i++){
    const id = cell_(v[i], m.ix.id);
    if(!id){ blanks.push(i + 1); continue; }
    if(!by[id]){ by[id] = []; order.push(id); }
    by[id].push({ at: i + 1, row: v[i] });
  }
  return { sh: sh, m: m, by: by, order: order, blanks: blanks };
}

function showLeaveTwins(){
  const t = admLeaveById_(), L = ['THE LEAVE REGISTER — applications appearing more than once', ''];
  let dup = 0, settleable = 0;
  t.order.forEach(id => {
    const rows = t.by[id];
    if(rows.length < 2) return;
    dup++;
    const sts = rows.map(r => String(r.row[t.m.ix.status] || 'PENDING'));
    const decided = sts.filter(s => s !== 'PENDING');
    const waiting = sts.filter(s => s === 'PENDING').length;
    if(decided.length && waiting) settleable++;
    L.push(cell_(rows[0].row, t.m.ix.name) + ' (' + cell_(rows[0].row, t.m.ix.role) + ', ' +
           cell_(rows[0].row, t.m.ix.mandal) + ') · ' + cell_(rows[0].row, t.m.ix.type) + ' · ' +
           dmy_(dateText_(rows[0].row[t.m.ix.fromDate])) + ' · id ' + id);
    rows.forEach((r, k) => L.push('    row ' + r.at + ': ' + sts[k] +
      (String(r.row[t.m.ix.decidedAt] || '') ? ' on ' + String(r.row[t.m.ix.decidedAt]).slice(0, 10) : '') +
      (String(r.row[t.m.ix.decidedBy] || '') ? ' by ' + String(r.row[t.m.ix.decidedBy]) : '')));
    if(decided.length && waiting) L.push('    → settleLeaveTwins() would write ' + decided[0] + ' onto the waiting row(s).');
    else if(!decided.length) L.push('    → genuinely waiting on your orders. Nothing to settle; sanction or refuse it in the app.');
    else L.push('    → already agreed. Nothing to do.');
    L.push('');
  });
  if(!dup) L.push('No application appears twice. Nothing to settle.');
  else L.push(dup + ' application(s) appear more than once · ' + settleable + ' can be settled.');
  if(t.blanks.length){
    L.push('');
    L.push('Rows with no application id (row ' + t.blanks.join(', ') + '). These are not applications — ' +
           'they cannot be decided, because every order is passed by id. The console and the app now ' +
           'leave them out. Clear them by hand if they are stray.');
  }
  L.push('');
  L.push('This was read only. Nothing was written.');
  Logger.log(L.join('\n'));
  return L.join('\n');
}

function settleLeaveTwins(){
  const t = admLeaveById_(), L = ['SETTLING THE DUPLICATED APPLICATIONS', ''];
  let done = 0, rowsWritten = 0;
  t.order.forEach(id => {
    const rows = t.by[id];
    if(rows.length < 2) return;
    /* the order actually passed on this application, and the hand that passed
       it — taken from a row that carries one, never invented */
    const lead = rows.filter(r => String(r.row[t.m.ix.status] || 'PENDING') !== 'PENDING')
                     .sort((a, b) => String(b.row[t.m.ix.decidedAt] || '')
                       .localeCompare(String(a.row[t.m.ix.decidedAt] || '')))[0];
    if(!lead) return;                                   /* genuinely waiting */
    const want = String(lead.row[t.m.ix.status]);
    const by   = String(lead.row[t.m.ix.decidedBy] || '');
    const when = String(lead.row[t.m.ix.decidedAt] || '');
    const rem  = String(lead.row[t.m.ix.remarks] || '');
    let touched = 0;
    rows.forEach(r => {
      if(String(r.row[t.m.ix.status] || 'PENDING') !== 'PENDING') return;
      t.sh.getRange(r.at, t.m.ix.status + 1).setValue(want);
      t.sh.getRange(r.at, t.m.ix.decidedBy + 1).setValue(by);
      t.sh.getRange(r.at, t.m.ix.decidedAt + 1).setValue(when);
      t.sh.getRange(r.at, t.m.ix.remarks + 1).setValue(rem);
      touched++;
    });
    if(!touched) return;                                /* already agreed */
    done++; rowsWritten += touched;
    const who = cell_(rows[0].row, t.m.ix.name) + ' (' + cell_(rows[0].row, t.m.ix.role) + ', ' +
                cell_(rows[0].row, t.m.ix.mandal) + ')';
    L.push(who + ' · ' + cell_(rows[0].row, t.m.ix.type) + ' · ' +
           dmy_(dateText_(rows[0].row[t.m.ix.fromDate])) + ' → ' + want + ' on ' + touched + ' row(s)');
    admLog_('LEAVE TWIN SETTLED', id, who + ' · ' + want + ' · ' + touched +
            ' duplicate row(s) brought into line with the order already passed');
  });
  L.push('');
  L.push(done ? (done + ' application(s) settled, ' + rowsWritten + ' row(s) written.')
              : 'Nothing to settle — every duplicated application already agrees.');
  L.push('No row was deleted and no order was invented: each waiting twin was given the');
  L.push('order another row of the same application already carried. Run it again and it');
  L.push('writes nothing.');
  Logger.log(L.join('\n'));
  return L.join('\n');
}

/* ============================================================================
 * ONE OFFICER'S PIN, RESET ON THE TELEPHONE
 *
 * Until now a reset meant a line in a FIELD_FIXES batch — a code edit and a
 * deploy to give one Secretary his PIN back. This is the same act for one
 * number, asked for from the menu.
 *
 * THREE THINGS THIS DOES THAT A PLAIN RESET DOES NOT:
 *
 *  1. It writes the new PIN to EVERY row carrying the number. When a number
 *     sits on more than one row, findByPhone_ takes the PIN from the FIRST row
 *     holding one — which is not necessarily the row anybody meant to fix. A
 *     reset written to one row hands the officer a PIN that does not open the
 *     app, and he telephones again saying it still shows wrong PIN. That is
 *     issue 4 of the 22.08 register, and it came back three times. The rows
 *     carry the same number, so they are the same man: giving them all the
 *     same PIN makes the login work whichever row the fold reads. The stale
 *     rows themselves are a separate matter, for a claimPhone line.
 *
 *  2. It tells the truth about the lock-out. Ten wrong attempts within the
 *     hour and the server refuses him whatever his PIN is, so a reset cures
 *     nothing and the mandal reports it as "still wrong PIN". The counter is
 *     cleared with the reset, and the log says it was — a man whose PIN the
 *     Collector has just changed should not be serving out a sentence for
 *     guessing the old one.
 *
 *  3. The PIN is seeded from the number and TODAY'S DATE, so a nervous second
 *     run within the day yields the SAME PIN and changes nothing. The 28.07
 *     batch seeded from the day it ran, and a re-run the following week would
 *     have re-scrambled PINs already circulated. A reset tomorrow is a new
 *     reset and gives a new PIN, which is right.
 *
 * The PIN is printed ONCE, in the log, and nowhere else — not on the Audit
 * tab, which records only that a reset was passed and by whom. Copy it before
 * closing the dialog.
 * ------------------------------------------------------------------------- */

function admPinRows_(phone){
  const p = phone10_(phone || '');
  const t = uidx_(), v = t.sh.getDataRange().getValues(), rows = [];
  for(let i = 1; i < v.length; i++) if(phone10_(v[i][t.ix.phone]) === p) rows.push(i);
  return { p: p, t: t, v: v, rows: rows };
}

/* READ ONLY. What a reset would do to this number, and whether it would help
   at all — run it before pressing anything. It does not print the PIN. */
function showPinReset(phone){
  const q = admPinRows_(phone);
  const L = ['PIN RESET — what it would do to "' + q.p + '"', ''];
  if(q.p.length !== 10) return admSay_(L.concat('✗ That is not ten digits. Nothing would be written.'));
  if(!q.rows.length) return admSay_(L.concat(
    '✗ NOT ON THE ROLL. There is no PIN to reset — the app tells him the number is not registered.',
    '  → register him with a line in FIELD_FIXES_3 first.'));

  q.rows.forEach(i => L.push('  row ' + (i + 1) + ': ' + (cell_(q.v[i], q.t.ix.name) || '(no name)') +
    ' · ' + cell_(q.v[i], q.t.ix.role) + ' · ' + cell_(q.v[i], q.t.ix.mandal) + ' / ' + cell_(q.v[i], q.t.ix.gp) +
    ' · ' + (q.v[i][q.t.ix.hash] ? 'PIN set' : 'NO PIN') +
    ' · ' + (String(q.v[i][q.t.ix.active]).toUpperCase() === 'FALSE' ? 'INACTIVE' : 'active')));
  L.push('');
  L.push('A reset would write the SAME new PIN to ' + q.rows.length + ' row(s), so the login works');
  L.push('whichever row the fold reads.');

  if(q.rows.length > 1)
    L.push('· NOTE: this number is on ' + q.rows.length + ' rows. The reset cures the PIN, not the ' +
           'duplication — the app will still greet him off the SENIOR row. Run "Why can an officer ' +
           'not sign in?" and cure the rows with a claimPhone line.');

  const inactive = q.rows.every(i => String(q.v[i][q.t.ix.active]).toUpperCase() === 'FALSE');
  if(inactive) L.push('✗ EVERY row on this number is INACTIVE. A PIN will not let him in — the app ' +
                      'tells him the number is not registered. Reactivate the row first.');

  const n = Number(cache_().get('pl_' + q.p) || 0);
  if(n >= MAX_PIN_TRIES) L.push('✗ ' + n + ' wrong-PIN attempts stand against this number within the hour. ' +
    'The server is refusing him whatever his PIN is. The reset clears that counter as well.');
  else if(n > 0) L.push('· ' + n + ' wrong-PIN attempt(s) counted within the hour (' + MAX_PIN_TRIES + ' locks him out).');

  L.push('');
  L.push('This was read only. Nothing was written, and no PIN was generated.');
  return admSay_(L);
}

function resetOnePin(phone){
  const q = admPinRows_(phone);
  const L = ['PIN RESET — "' + q.p + '"', ''];
  if(q.p.length !== 10) return admSay_(L.concat('✗ That is not ten digits. Nothing was written.'));
  if(!q.rows.length) return admSay_(L.concat(
    '✗ NOT ON THE ROLL. Nothing was written. Register him with a line in FIELD_FIXES_3 first.'));

  const pin = batchPin_(q.p, today_());        /* same PIN all day; new tomorrow */
  const h = hash_(q.p, pin);
  let already = 0;
  q.rows.forEach(i => {
    if(q.v[i][q.t.ix.hash] === h){ already++; return; }
    q.t.sh.getRange(i + 1, q.t.ix.hash + 1).setValue(h);
    if(q.t.ix.initpin >= 0) q.t.sh.getRange(i + 1, q.t.ix.initpin + 1).setValue('');
  });

  const who = q.rows.map(i => cell_(q.v[i], q.t.ix.name)).filter(String)[0] || '(unnamed)';
  const cleared = Number(cache_().get('pl_' + q.p) || 0);
  if(cleared) try{ cache_().remove('pl_' + q.p); }catch(err){}

  L.push(who + ' · ' + q.rows.length + ' row(s) carry this number');
  L.push('');
  L.push('    NEW PIN:  ' + pin);
  L.push('');
  L.push('Copy it now — it is printed here and nowhere else, and it is not on the Audit tab.');
  if(already === q.rows.length) L.push('(Every row already held this PIN: nothing was written. A second run ' +
                                       'on the same day is the same reset.)');
  else if(already) L.push('(' + already + ' row(s) already held it; ' + (q.rows.length - already) + ' written.)');
  if(cleared) L.push('· ' + cleared + ' wrong-PIN attempt(s) against this number were cleared, so he is not ' +
                     'refused for guessing the PIN you have just replaced.');
  if(q.rows.every(i => String(q.v[i][q.t.ix.active]).toUpperCase() === 'FALSE'))
    L.push('✗ WARNING: every row on this number is INACTIVE. The PIN is set, but the app will still tell ' +
           'him the number is not registered until a row is made active.');

  admLog_('PIN RESET', q.p, who + ' · ' + q.rows.length + ' row(s) · PIN not recorded here');
  return admSay_(L);
}

function menuShowPinReset(){
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('Which number?', 'The officer’s mobile number. Nothing will be written.', ui.ButtonSet.OK_CANCEL);
  if(res.getSelectedButton() !== ui.Button.OK) return;
  admShow_('What a PIN reset would do — nothing written', showPinReset(res.getResponseText()));
}
function menuResetOnePin(){
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('Reset the PIN for which number?', 'The officer’s mobile number.', ui.ButtonSet.OK_CANCEL);
  if(res.getSelectedButton() !== ui.Button.OK) return;
  const p = phone10_(res.getResponseText() || '');
  const ok = ui.alert('Reset the PIN for ' + p + '?',
    'The PIN he is using today stops working at once. The new one is shown once, in the log, and ' +
    'nowhere else — copy it and give it to him. Read "What a PIN reset would do" first if you have not.',
    ui.ButtonSet.YES_NO);
  if(ok !== ui.Button.YES){ ui.alert('Nothing was written.'); return; }
  admShow_('PIN reset — copy it now, it is shown once', resetOnePin(p));
}

/* The two resets asked for on 25.08.2026 — 9949364872, and 7981236941
   (Ravi Kumar, PS, Ramboji Gudem, Devaruppula), who had forgotten his.
   Select go in the editor, press Run, then Ctrl+Enter: both PINs are in the
   log, printed once and nowhere else. Run it twice on the same day and it
   prints the same two PINs and writes nothing the second time. */
function go(){
  Logger.log(resetOnePin('9949364872'));
  Logger.log(resetOnePin('7981236941'));
}

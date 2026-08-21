/**********************************************************************
 * SJGP — Swachh Jangaon Gram Panchayat — district backend v6.8.4
 * Collectorate, Jangaon • Rc.No.788/DPO/26/34
 *
 * NEW IN v6.9 — the deployment stops being a ritual
 *  • The SALT moved to Script Properties. It was the one line that had to be
 *    hand-restored on every upgrade, and the one most able to lock out the
 *    whole district if mistyped. Run migrateSalt() ONCE on the current code.
 *  • The server address moved to config.js in the repository, which upgrade
 *    packs never contain. It was never a secret — it ships to every phone —
 *    so blanking it bought nothing and cost a hand-edit every publish.
 *  • With no secret left in the source, .github/workflows/deploy.yml can
 *    publish the site AND push and deploy the backend on a commit. See
 *    DEPLOY.md. The Admin.gs jobs stay manual, on purpose.
 *
 * NEW IN v6.8.6 — one application per spell
 *  • Every submission from the field carried a fresh random id, so an
 *    officer who tapped Apply twice, or applied again because a weak line
 *    gave him no confirmation, raised two independent applications for the
 *    same days. The Collector sanctioned one and its twin sat in Waiting
 *    for ever. A new application overlapping a spell already applied for or
 *    already sanctioned is now refused, and told which one it collides with.
 *  • Admin.gs: findDuplicateLeave() / closeDuplicateLeave(true) close the
 *    twins already on the register — WITHDRAWN, never refused, since the
 *    officer did nothing wrong.
 *
 * NEW IN v6.8.4 — holidays are read in the Sheet's own timezone
 *  • A date typed into the Sheet is stored as a real Date, interpreted in
 *    the SHEET's timezone. The engine was formatting it in the SCRIPT's.
 *    Where the two differ every holiday shifted a day, which is how
 *    15 August could sit on the tab and still be read as a working day.
 *  • Holiday dates are now read in the Sheet's timezone, and text dates in
 *    any of 2026-08-15 / 15-08-2026 / 15/08/2026 are understood too.
 *  • Admin.gs: holidayCheck() prints what the engine reads from every row
 *    and states whether today is off; holidayRewrite() writes the dates
 *    back as plain text so no timezone can ever move them again.
 *
 * NEW IN v6.8.1 — the handset clock is no longer taken on trust
 *  • markedAt is the phone's own clock. A handset eleven minutes fast was
 *    recording marks in the future, and — far worse — could push an
 *    officer past the 11:00 cutoff and draw a late-marking reminder he had
 *    not earned. The effective time is now the EARLIER of the phone's
 *    claim and the district's receipt, so a mark can never post-date its
 *    own arrival. An honest offline mark is untouched.
 *  • The drift is measured, stored on the Attendance row as 'skew',
 *    returned to the handset so the officer is told to fix his clock, and
 *    listed on the console so the district can see whose phones are wrong.
 *
 * NEW IN v6.8 — the ladder: remind twice, then serve
 *  • A missed day is no longer met with an instrument on the first
 *    occasion. Misses 1 and 2 of a calendar month draw a REMINDER —
 *    pushed at once, unnumbered, off the register, no lock, no debit.
 *    The 3rd miss (SCN_FROM_MISS) proposes the show-cause notice, and
 *    from that miss each further unmarked working day costs one day of CL.
 *  • Reminders also go out for a mark made after the 11:00 cutoff, or made
 *    in time but received after it — read from markedAt against receivedAt,
 *    so "you were late" and "your signal was late" are told apart and only
 *    the first is the officer's doing. Neither is ever counted as a miss.
 *  • Misses are counted from the ATTENDANCE RECORD, not from reminders
 *    sent, and only over days the district was demonstrably running, so a
 *    mid-month start cannot manufacture a fortnight of misses and a late
 *    sync lowers the count by itself.
 *
 * NEW IN v6.7.1 — the sync-lag defect, fixed
 *  • The day is read at 18:00, not 11:15. A mark is written on the phone
 *    first and reaches the Sheet only when the upload gets through, so on
 *    weak signal officers who HAD marked were read as absent and served.
 *  • Attendance is now read THREE times before a rupee moves: at 18:00,
 *    again at approval (a late arrival marks the proposal CURED and it is
 *    never served or numbered), and again at settlement.
 *  • Settlement runs the NEXT morning and judges the CLOSED day, so an
 *    overnight sync still cancels the debit. settleAbsenceDebits(date)
 *    settles a chosen day by hand.
 *  • Admin.gs: auditWrongNotices() / withdrawWrongNotices() find notices
 *    served against officers who have attendance on record, withdraw them
 *    and reverse any leave debited.
 *
 * NEW IN v6.7
 *  • Nothing is served without the Collector's word: the morning trigger
 *    only PROPOSES notices (unnumbered, unmailed); kind:'noticeDecide'
 *    on the console serves (numbers + emails) or drops them. Only served
 *    notices count toward the grace band, lock the app, or debit CL.
 *  • Off days end to end: offInfo_/holidays ride the payload and the
 *    op:'notices' reply, the app waives the attendance gate on Sundays
 *    and Holidays-tab dates (marking stays voluntary), and the console
 *    shows the day as a holiday instead of 281 absentees.
 *
 * NEW IN v6.6
 *  • Show-cause notice engine for unmarked attendance. Two daily triggers
 *    (installNoticeTriggers to set both): issueAbsenceNotices ~11:15 writes
 *    the notice to the Notices tab in the signed /SJSP-SCN/ series and
 *    emails the officer; settleAbsenceDebits ~19:00 debits one CL (LOP once
 *    CL is exhausted) when the month's notice count is past NOTICE_GRACE=3
 *    and the day closed unmarked. Sundays and the Holidays tab are skipped.
 *  • kind:'noticeAck' — the app is locked until pending notices are
 *    acknowledged; op:'notices' serves each officer's file and the
 *    Collector's register; the dashboard payload carries the summary.
 *
 * NEW IN v6.5
 *  • dashboard now carries attm — an officer × day fortnight matrix — for
 *    the console's comparative attendance export (CSV / Excel).
 *  • kind:'ask' — the Collector's briefing desk answers questions in
 *    conversation, grounded strictly in the figures the console sends.
 *    Uses the same ANTHROPIC_API_KEY; nothing new to authorise if the
 *    briefing already works.
 *
 * SIGN-IN: mobile number + PIN.  A number may hold more than one Gram
 * Panchayat (full additional charge) — every GP against that number is
 * available to the officer, and any one of them can be filed.
 *
 * NEW IN v5
 *  • Attendance tab. Every officer marks in once a day with a geo-stamped
 *    photograph before the app will open. Rows carry Verified = FALSE when
 *    the phone could not obtain a fix, so the gap is visible, not hidden.
 *  • The Panchayat Secretary cannot write. Any inspection or photograph
 *    posted from a PS login is refused here as well as in the app, so a
 *    tampered client changes nothing.
 *  • Photographs arrive in small batches instead of one large POST, which
 *    is what used to time out on a weak signal.
 *
 * SHEET TABS
 *  GPs         Mandal | GP                                    (master list)
 *  Users       Phone | Name | Role | Mandal | GP | Email | InitPin | Hash | Active
 *              (column order does not matter — matched by header name;
 *               one row per GP, so a Secretary holding two GPs has two rows)
 *  Inspections written automatically, one row per GP per month
 *  Attendance  written automatically, one row per officer per day
 *  Tokens      written automatically
 *
 * ROLES  PS (read only) · MPDO / MSO / MPO (own mandal) · DLPO / DPO / COLLECTOR (district)
 *
 * UPGRADING FROM v4
 *  Paste this over the old code and deploy a
 *  new version. Do NOT run setupPins again — PINs are untouched. The new
 *  columns and the Attendance tab are created on the first request.
 **********************************************************************/
/* THE SALT LIVES IN SCRIPT PROPERTIES, NOT HERE.
   Every PIN in the district is hashed with it, so it must never change and
   must never reach a public repository. Keeping it in this file meant this
   file could not be pushed by any tool, and meant hand-editing one line on
   every single upgrade — the step most likely to lock out 280 officers.
   It now lives in Project Settings > Script Properties under SALT.
   Run migrateSalt() once from Admin.gs to move it there; until then the
   fallback below is used, so nothing breaks in the meantime. */
const SALT_FALLBACK = 'CHANGE-THIS-LONG-RANDOM-SALT';
let SALT_CACHE = null;
function salt_(){
  if(SALT_CACHE !== null) return SALT_CACHE;
  let v = '';
  try{ v = String(PropertiesService.getScriptProperties().getProperty('SALT') || ''); }catch(e){}
  SALT_CACHE = v || SALT_FALLBACK;
  return SALT_CACHE;
}
const SESSION_DAYS = 30;
const MAX_PIN_TRIES = 10;
const PHOTO_FOLDER = 'SJ-SCORE Photos';
const ATT_FOLDER   = 'SJ-SCORE Attendance';

const HEADERS = ['id','ym','mandal','gp','date','score','grade','rf','psScore','wkAvg','bcScore',
                 'status','officer','role','lat','lng','album','photoCount','photoFolder',
                 'evidence','attId','updatedAt','payload'];
const A_HEAD = ['id','date','phone','name','role','mandal','markedAt','lat','lng','accuracy',
                'verified','photo','timezone','receivedAt','status','leaveId','leaveType',
                'markCount','firstMarkAt','skew'];
const L_HEAD = ['id','appliedAt','phone','name','role','mandal','type','fromDate','toDate','days',
                'reason','address','leaveHq','certificate','status','decidedBy','decidedAt','remarks','receivedAt'];
/* Show-cause notices for unmarked attendance. The register continues the
   signed series (54 issued on paper on 07.08.2026), so the running number
   opens at 55 unless NOTICE_SEQ_NEXT says otherwise in Script Properties.
   THE LIFECYCLE (6.7): on a working day — not a Sunday, not a date on the
   Holidays tab — the morning trigger only PROPOSES a notice for each
   officer with no attendance row and no sanctioned leave. Nothing is
   numbered, served or emailed until the Collector approves it on the
   console (kind:'noticeDecide'); dropped proposals die unnumbered. Once
   served: the first NOTICE_GRACE served notices in a calendar month are
   warnings; beyond them, the evening settlement debits one day of CL —
   LOP once the year's CL is exhausted — if the day closed still unmarked.
   Acknowledgement in the app is receipt, not excuse: it lifts the app's
   lock, never the debit. Status: PROPOSED → PENDING → ACK, or DROPPED. */
const N_HEAD = ['id','no','date','phone','name','role','mandal','seq','issuedAt','emailedAt',
                'status','ackAt','ackNote','ackReceivedAt','clDebited','leaveId','debitAt','decidedBy','decidedAt'];
const H_HEAD = ['Date','Occasion'];
/* THE LADDER. A missed day is not met with an instrument on the first
   occasion. The first two misses of a calendar month draw a REMINDER —
   pushed, but informal: no number, no lock, no debit, and it never enters
   the notice register. The THIRD miss draws the SHOW CAUSE NOTICE, and
   from that miss onward each day of continued default costs one day of CL.
   A miss is counted from the attendance record itself, not from how many
   reminders were sent, so a late sync that lands next week lowers the count
   by itself. Reminders also go out for a mark made after the cutoff, or made
   in time but received late — those are advisory only and are never misses. */
const SCN_FROM_MISS   = 3;   /* misses 1 and 2 remind; the 3rd serves notice */
const DEBIT_FROM_MISS = 3;   /* and the 3rd is where the leave account starts to pay.
                                Set to 4 to make the first notice a pure warning. */
const CUTOFF_HOUR     = 11;  /* attendance is due by 11:00 from the place of duty */
const R_HEAD = ['id','date','phone','name','role','mandal','miss','kind','reason','sentAt','emailedAt'];
/* Seen pings: an officer who OPENED the app on a working day without having
   marked. The app says so on its screen — nothing here is collected quietly —
   and a ping is never a mark: it neither cures a miss nor counts attendance.
   One row per officer per day, the latest ping winning. */
const SEEN_HEAD = ['date','phone','name','role','mandal','at','lat','lng','accuracy','receivedAt'];
const NOTICE_GRACE = SCN_FROM_MISS;  /* kept: older code and the console read this name */
const NOTICE_SERIES_START = 55;  /* the signed pack closed at 54 */
/* THE CUTOFF. 6.7 proposed at 11:15 and that was wrong: a mark is written on
   the phone first and reaches the Sheet only when the upload succeeds, so on
   weak rural signal an officer could mark at 10:46, see a green banner, and
   still be missing from the Sheet at 11:15. Officers with attendance were
   served notices. From 6.7.1 the day is read at 18:00 — after duty hours,
   with the whole day for the phone to reach the district — and attendance is
   read AGAIN at approval and AGAIN at settlement, so a late sync withdraws
   the notice by itself. See CURED in the register. */
const NOTICE_HOUR = 18;          /* the day is read at 18:00, not mid-morning */
const SETTLE_HOUR = 9;           /* and settled the NEXT morning, for the day before */
/* CL 15 a year, EL 30 a year, HQ a permission and ML on certificate — neither
   of the last two is counted against a yearly figure. 2026 opens in August,
   so casual leave that year is five months' worth: 15 x 5/12, taken as 6. */
/* OH — the G.O.'s Optional Holidays: FIVE a calendar year, each a single
   notified date, sanctioned like any leave. Not prorated: the G.O. grants
   five for the year, whichever months the register covers. */
const LEAVE_ENTITLEMENT = {CL:15, EL:30, HQ:0, ML:0, OH:5};
/* Annexure-II of G.O.Rt.No.1715 dt. 06.12.2025 — the only dates an OH
   application may name. Next year's G.O. replaces this map (and the app's
   copy of it) together. */
const TS_OPTIONAL_2026 = {
  '2026-01-01':'New Year Day', '2026-01-03':'Birthday of Hazrath Ali (R.A)', '2026-01-16':'Kanumu',
  '2026-01-17':'Shab-e-Meraj', '2026-01-23':'Sri Panchami', '2026-02-04':'Shab-e-Barat',
  '2026-03-10':'Shahadat Hzt Ali (R.A.)', '2026-03-13':'Jumuatul Wada', '2026-03-17':'Shab-e-Qader',
  '2026-03-31':'Mahaveer Jayanthi', '2026-04-14':'Tamil New Year’s Day', '2026-04-20':'Basava Jayanthi',
  '2026-05-01':'Buddha Purnima', '2026-06-04':'Eid-e-Ghadeer', '2026-06-25':'9th Moharram',
  '2026-07-16':'Ratha Yathra', '2026-08-04':'Arbayeen', '2026-08-15':'Parsi New Year’s Day',
  '2026-08-21':'Varalakshmi Vratham', '2026-08-28':'Sravana Purnima / Rakhi Purnima',
  '2026-09-23':'Yaz Dahum Shareef', '2026-10-19':'Maharnavami',
  '2026-10-26':'Birthday of Hzt. Syed Mohammed Juvanpuri Mahdi Ma’ud (A.S.)',
  '2026-11-08':'Naraka Chaturdhi', '2026-12-24':'Christmas Eve', '2026-12-26':'Birthday of Hazrath Ali'
};
const LEAVE_OPENING_YEAR = 2026;
const CL_OPENING_BALANCE = 6;
function entitlement_(type, year){
  if(type === 'CL' && Number(year) === LEAVE_OPENING_YEAR) return CL_OPENING_BALANCE;
  return LEAVE_ENTITLEMENT[type] || 0;
}
/* Leave is applied for by these three, and sanctioned by the Collector alone. */
const LEAVE_APPLY   = ['MPO','PS','MPDO'];
const canApplyLeave_   = r => LEAVE_APPLY.indexOf(r) >= 0;
const canApproveLeave_ = r => r === 'COLLECTOR';
/* Not asked to mark in, so never counted as a gap: the Collector — and,
   by the Collector's order of 19.08.2026, the MSOs, whose attendance is
   VOLUNTARY. An MSO's mark is welcome and recorded; an MSO's silence
   draws nothing — no reminder, no notice, no debit, no seen ping. */
const attExempt_ = r => r === 'COLLECTOR' || r === 'MSO';
const U_HEAD = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'];
const RANK = {PS:1, MPO:2, MSO:3, MPDO:4, DLPO:5, DPO:6, COLLECTOR:7};

/* ---------------- plumbing ---------------- */
function sheet_(name, headers){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if(!sh){ sh = ss.insertSheet(name); if(headers) sh.appendRow(headers); }
  if(headers && sh.getLastRow() === 0) sh.appendRow(headers);
  if(headers) ensureHeaders_(sh, headers);
  return sh;
}
/* v4 sheets are missing the columns added in v5 — put them on the end,
   in order, without disturbing a single existing cell. */
function ensureHeaders_(sh, want){
  const width = Math.max(sh.getLastColumn(), 1);
  const have = sh.getRange(1, 1, 1, width).getValues()[0].map(String);
  const add = want.filter(h => have.indexOf(h) < 0);
  if(!add.length) return;
  sh.getRange(1, have.length + 1, 1, add.length).setValues([add]);
}
function headMap_(sh, want){
  const width = Math.max(sh.getLastColumn(), 1);
  const have = sh.getRange(1, 1, 1, width).getValues()[0].map(String);
  const ix = {};
  want.forEach(h => { ix[h] = have.indexOf(h); });
  return { ix: ix, width: have.length };
}
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function hash_(a, b){
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt_() + ':' + String(a) + ':' + String(b)));
}
function phone10_(p){ const d = String(p == null ? '' : p).replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; }
function cache_(){ return CacheService.getScriptCache(); }
function clean_(s){ return String(s == null ? '' : s).replace(/[^A-Za-z0-9 _.\-]/g, '').trim().slice(0, 60) || 'Unnamed'; }

function uidx_(){
  const sh = sheet_('Users', U_HEAD);
  const head = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0]
    .map(h => String(h).toLowerCase().replace(/[^a-z]/g, ''));
  const ix = {};
  ['phone','name','role','mandal','gp','email','hash','active'].forEach(k => { ix[k] = head.indexOf(k); });
  ix.initpin = head.indexOf('initpin') >= 0 ? head.indexOf('initpin') : head.indexOf('initpassword');
  return { sh: sh, ix: ix };
}
function cell_(row, i){ return i >= 0 ? String(row[i] == null ? '' : row[i]).trim() : ''; }

/* Google Sheets turns the text "2026-07" into a date. Everything that reads or
   writes a month must pass through these two, or the dashboard finds nothing. */
function ymText_(v){
  if(v instanceof Date) return v.getFullYear() + '-' + ('0' + (v.getMonth() + 1)).slice(-2);
  return String(v == null ? '' : v).trim().replace(/^'/, '');
}
function dateText_(v){
  if(v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v == null ? '' : v).trim().replace(/^'/, '');
}
function today_(){ return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }

/* all rows for a phone, folded into one login */
function findByPhone_(phone){
  const p = phone10_(phone);
  if(p.length !== 10) return null;
  const t = uidx_(), v = t.sh.getDataRange().getValues();
  const rows = [];
  for(let i = 1; i < v.length; i++){
    if(phone10_(t.ix.phone >= 0 ? v[i][t.ix.phone] : '') === p) rows.push({ r: i + 1, v: v[i] });
  }
  if(!rows.length) return null;

  let best = rows[0], hash = '', active = false;
  rows.forEach(x => {
    const role = cell_(x.v, t.ix.role).toUpperCase();
    if((RANK[role] || 0) > (RANK[cell_(best.v, t.ix.role).toUpperCase()] || 0)) best = x;
    if(!hash) hash = cell_(x.v, t.ix.hash);
    const a = t.ix.active < 0 ? true : x.v[t.ix.active];
    if(!(a === false || String(a).toUpperCase() === 'FALSE' || a === '')) active = true;
  });

  const gps = [], mandals = [];
  rows.forEach(x => {
    const g = cell_(x.v, t.ix.gp), m = cell_(x.v, t.ix.mandal);
    if(g && gps.indexOf(g) < 0) gps.push(g);
    if(m && mandals.indexOf(m) < 0) mandals.push(m);
  });

  return {
    rows: rows.map(x => x.r),
    phone: p,
    name: cell_(best.v, t.ix.name),
    role: cell_(best.v, t.ix.role).toUpperCase(),
    mandal: cell_(best.v, t.ix.mandal),
    mandals: mandals,
    gp: gps[0] || '',
    gps: gps,
    email: cell_(best.v, t.ix.email),
    hash: hash,
    active: active
  };
}
const pub_ = u => ({ name:u.name, role:u.role, phone:u.phone, mandal:u.mandal, mandals:u.mandals, gp:u.gp, gps:u.gps });
const districtRole_ = r => r === 'DPO' || r === 'COLLECTOR' || r === 'DLPO';
const mandalRole_   = r => r === 'MPDO' || r === 'MSO' || r === 'MPO';
/* The Secretary is the officer being evaluated, so the Secretary never writes. */
const viewerRole_   = r => r === 'PS';

/* ---------------- sessions ---------------- */
function issueToken_(u){
  const tok = Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'');
  sheet_('Tokens', ['Token','Name','Phone','Created','Expires'])
    .appendRow([tok, u.name, "'" + u.phone, new Date(), new Date(Date.now() + SESSION_DAYS*24*3600*1000)]);
  cache_().put('tk_' + tok, JSON.stringify(pub_(u)), 21600);
  return tok;
}
function auth_(token){
  if(!token) return null;
  const c = cache_().get('tk_' + token);
  if(c) return JSON.parse(c);
  const v = sheet_('Tokens', ['Token','Name','Phone','Created','Expires']).getDataRange().getValues();
  for(let i = v.length - 1; i >= 1; i--){
    if(String(v[i][0]) === String(token)){
      if(new Date(v[i][4]) < new Date()) return null;
      const u = findByPhone_(v[i][2]);
      if(!u || !u.active) return null;
      cache_().put('tk_' + token, JSON.stringify(pub_(u)), 21600);
      return pub_(u);
    }
  }
  return null;
}

/* ---------------- run from the editor ---------------- */
function setupPins(){
  const t = uidx_(), rng = t.sh.getDataRange(), v = rng.getValues();
  if(t.ix.hash < 0 || t.ix.initpin < 0){ Logger.log('The Users tab needs InitPin and Hash columns.'); return; }
  let n = 0;
  for(let i = 1; i < v.length; i++){
    const ph = phone10_(t.ix.phone >= 0 ? v[i][t.ix.phone] : '');
    const init = String(v[i][t.ix.initpin] == null ? '' : v[i][t.ix.initpin]).trim();
    if(ph.length === 10 && init){ v[i][t.ix.hash] = hash_(ph, init); v[i][t.ix.initpin] = ''; n++; }
  }
  rng.setValues(v);
  Logger.log('PIN set on ' + n + ' row(s).');
}
/* Optional: run once to see who has not marked attendance today. */
function attendanceGaps(){
  const marked = {};
  sheet_('Attendance', A_HEAD).getDataRange().getValues().slice(1).forEach(r => {
    if(dateText_(r[1]) === today_()) marked[phone10_(r[2])] = true;
  });
  const t = uidx_(), v = t.sh.getDataRange().getValues(), seen = {}, out = [];
  for(let i = 1; i < v.length; i++){
    const p = phone10_(v[i][t.ix.phone]);
    if(!p || seen[p]) continue;
    seen[p] = true;
    const role = cell_(v[i], t.ix.role);
    if(attExempt_(role)) continue;
    if(!marked[p]) out.push(cell_(v[i], t.ix.name) + ' (' + p + ') — ' + role);
  }
  Logger.log(out.length + ' officer(s) have not marked attendance today:\n' + out.join('\n'));
}

/* ================== SHOW-CAUSE NOTICES · unmarked attendance ==================
   Two time-driven triggers run this (installNoticeTriggers puts them in):
     issueAbsenceNotices  ~11:15  — writes the notice, mails it, counts it
     settleAbsenceDebits  ~19:00  — debits CL only if the WHOLE working day
                                    passed with attendance still unmarked
   Both are idempotent and locked: run either twice and the second run
   changes nothing. Sundays and dates on the Holidays tab are never worked. */
/* The spreadsheet's own timezone. A Sheet interprets a typed date in ITS
   timezone; the script formats it in the SCRIPT's. Where the two differ —
   and an Apps Script project does not always inherit the Sheet's — every
   holiday silently moves a day, which is how 15 August could sit on the tab
   and still be read as a working day. */
function sheetTz_(){
  try{ return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone() || Session.getScriptTimeZone(); }
  catch(e){ return Session.getScriptTimeZone(); }
}
/* Turn whatever is in a date cell into yyyy-mm-dd: a real Date (read in the
   Sheet's own timezone), or text as the officer typed it — 2026-08-15,
   15-08-2026, 15/08/2026, with or without a leading apostrophe. `shown` is
   the cell's displayed text, which is the tie-breaker a Date cannot lose. */
function holidayKey_(v, shown){
  const p2 = n => (Number(n) < 10 ? '0' : '') + Number(n);
  if(v instanceof Date && !isNaN(v.getTime()))
    return Utilities.formatDate(v, sheetTz_(), 'yyyy-MM-dd');
  const s = String(shown != null && String(shown).trim() ? shown : (v == null ? '' : v)).trim().replace(/^'/, '');
  if(!s) return '';
  let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);      /* yyyy-mm-dd */
  if(m) return m[1] + '-' + p2(m[2]) + '-' + p2(m[3]);
  m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);          /* dd-mm-yyyy */
  if(m) return m[3] + '-' + p2(m[2]) + '-' + p2(m[1]);
  return '';
}
function holidaySet_(){
  const sh = sheet_('Holidays', H_HEAD);
  const last = sh.getLastRow(); if(last < 2) return {};
  const rng = sh.getRange(1, 1, last, 2);
  const v = rng.getValues();
  let disp = [];
  try{ disp = rng.getDisplayValues(); }catch(e){ disp = []; }
  const set = {};
  for(let i = 1; i < v.length; i++){
    const d = holidayKey_(v[i][0], disp[i] ? disp[i][0] : '');
    if(d) set[d] = String(v[i][1] || (disp[i] ? disp[i][1] : '') || 'Holiday');
  }
  return set;
}
function isWorkingDay_(dStr){
  const d = new Date(dStr + 'T00:00:00');
  if(d.getDay() === 0) return false;              /* Sunday */
  return !holidaySet_()[dStr];                    /* declared holidays */
}
/* the last working day before a date — skips Sundays and the Holidays tab */
function prevWorkingDay_(dStr){
  const d = new Date(String(dStr) + 'T00:00:00');
  for(let k = 0; k < 14; k++){
    d.setDate(d.getDate() - 1);
    const p = n => String(n).length < 2 ? '0' + n : String(n);
    const key = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    if(isWorkingDay_(key)) return key;
  }
  return String(dStr);
}
/* is the date off, and why — Sunday, or the Holidays tab's word for it */
function offInfo_(dStr){
  const d = new Date(dStr + 'T00:00:00');
  if(d.getDay() === 0) return { today:true, why:'Sunday' };
  const h = holidaySet_()[dStr];
  return h ? { today:true, why:h } : { today:false, why:'' };
}
/* phones with any Attendance row on the date — a LEAVE row counts as marked */
function markedSet_(dStr){
  const sh = sheet_('Attendance', A_HEAD), m = headMap_(sh, A_HEAD);
  const last = sh.getLastRow(); if(last < 2) return {};
  const start = Math.max(2, last - 4000);
  const v = sh.getRange(start, 1, last - start + 1, sh.getLastColumn()).getValues();
  const set = {};
  v.forEach(r => { if(dateText_(r[m.ix.date]) === dStr){ const p = phone10_(r[m.ix.phone]); if(p) set[p] = true; } });
  return set;
}
/* phones whose APPROVED leave covers the date — no row needed to be exempt */
function sanctionedSet_(dStr){
  const sh = sheet_('Leave', L_HEAD), m = headMap_(sh, L_HEAD);
  const v = sh.getDataRange().getValues(), set = {};
  for(let i = 1; i < v.length; i++){
    if(String(v[i][m.ix.status]) !== 'APPROVED') continue;
    const f = dateText_(v[i][m.ix.fromDate]), t = dateText_(v[i][m.ix.toDate]);
    if(f && t && f <= dStr && dStr <= t){ const p = phone10_(v[i][m.ix.phone]); if(p) set[p] = true; }
  }
  return set;
}
/* THE CLOCK. markedAt is the phone's own clock and is not evidence: handsets
   drift, and a phone eleven minutes fast was recording marks in the future.
   receivedAt is the district's clock and is authoritative. A mark cannot have
   been made after it was received, so the effective time is the earlier of
   the two. That kills future timestamps and, more importantly, stops a fast
   handset from pushing an officer past the 11:00 cutoff. (A slow handset
   cannot hide a late mark either: the receipt would then be late as well and
   the day reads as a late arrival.) */
function effMarkAt_(markedAt, receivedAt){
  const a = String(markedAt || ''), b = String(receivedAt || '');
  if(!a) return b;
  if(!b) return a;
  const ta = new Date(a).getTime(), tb = new Date(b).getTime();
  if(isNaN(ta) || isNaN(tb)) return a;
  return ta > tb ? b : a;                 /* never later than receipt */
}
/* how far a handset's clock is out, in seconds; positive means running fast */
function clockSkew_(markedAt, receivedAt){
  const ta = new Date(String(markedAt || '')).getTime();
  const tb = new Date(String(receivedAt || '')).getTime();
  if(isNaN(ta) || isNaN(tb)) return 0;
  return Math.round((ta - tb) / 1000);
}

/* Every attendance row of a month, keyed phone|date, carrying both clocks.
   One pass; the daily engine needs the month whole to count misses. */
function monthMarks_(ym){
  const sh = sheet_('Attendance', A_HEAD), m = headMap_(sh, A_HEAD);
  const last = sh.getLastRow(); if(last < 2) return {};
  const start = Math.max(2, last - 12000);
  const v = sh.getRange(start, 1, last - start + 1, sh.getLastColumn()).getValues();
  const out = {};
  v.forEach(r => {
    const d = dateText_(r[m.ix.date]); if(!d || d.slice(0, 7) !== String(ym)) return;
    const p = phone10_(r[m.ix.phone]); if(!p) return;
    const k = p + '|' + d;
    const got = String(r[m.ix.receivedAt] || '');
    const at = effMarkAt_(String(r[m.ix.firstMarkAt] || r[m.ix.markedAt] || ''), got);
    if(!out[k] || (at && out[k].at && at < out[k].at)) out[k] = { at: at, got: got };
  });
  return out;
}
/* The working days of a month, up to a date, ON WHICH THE DISTRICT WAS
   ACTUALLY RUNNING. A day on which not one officer in the district marked
   is a day the system was not operating — a deployment day, an outage, a
   holiday nobody entered — and it is counted against nobody. Without this,
   switching the ladder on mid-month would hand every officer a fortnight of
   manufactured misses and take them straight past the third. Today always
   counts, since the pass is running now. A floor can also be pinned with
   the LADDER_START script property (yyyy-mm-dd). */
function activeDaysUpto_(dStr, marks){
  const ym = String(dStr).slice(0, 7), hs = holidaySet_(), out = [];
  const dayN = Number(String(dStr).slice(8, 10));
  const live = {};
  Object.keys(marks || {}).forEach(k => { live[k.split('|')[1]] = true; });
  let floor = '';
  try{ floor = String(PropertiesService.getScriptProperties().getProperty('LADDER_START') || ''); }catch(e){}
  for(let i = 1; i <= dayN; i++){
    const key = ym + '-' + (i < 10 ? '0' + i : String(i));
    if(new Date(key + 'T00:00:00').getDay() === 0) continue;
    if(hs[key]) continue;
    if(floor && key < floor) continue;
    if(key !== dStr && !live[key]) continue;      /* the district was not running that day */
    out.push(key);
  }
  return out;
}
/* the working days of a month up to and including a date */
function workingDaysUpto_(dStr){
  const ym = String(dStr).slice(0, 7), hs = holidaySet_(), out = [];
  const dayN = Number(String(dStr).slice(8, 10));
  for(let i = 1; i <= dayN; i++){
    const key = ym + '-' + (i < 10 ? '0' + i : String(i));
    if(new Date(key + 'T00:00:00').getDay() === 0) continue;
    if(hs[key]) continue;
    out.push(key);
  }
  return out;
}
/* Was the mark late, and by whose clock? markedAt is the phone's,
   receivedAt the district's — so a mark made in time that reached us after
   the cutoff is visible as exactly that, and is not the officer's fault. */
function lateness_(mark, dStr){
  if(!mark) return '';
  const hh = (CUTOFF_HOUR < 10 ? '0' : '') + CUTOFF_HOUR;
  const due = new Date(dStr + 'T' + hh + ':00:00+05:30').getTime();
  const at  = mark.at  ? new Date(mark.at).getTime()  : 0;
  const got = mark.got ? new Date(mark.got).getTime() : 0;
  if(at && at > due) return 'LATE_MARK';
  if(at && got && got > due) return 'LATE_SYNC';
  return '';
}
/* the short reason an officer is told — a phrase, not a case history */
function reasonText_(kind, miss){
  if(kind === 'LATE_MARK') return 'Attendance marked after ' + CUTOFF_HOUR + ':00 AM';
  if(kind === 'LATE_SYNC') return 'Marked in time, but it reached the district after ' + CUTOFF_HOUR + ':00 AM \u2014 check your signal before leaving the field';
  return 'Attendance not marked' + (miss ? ' \u2014 ' + (miss === 1 ? 'first' : 'second') + ' occasion this month' : '');
}
function noticeGaps_(dStr){
  const marked = markedSet_(dStr), onLeave = sanctionedSet_(dStr);
  const t = uidx_(), v = t.sh.getDataRange().getValues(), seen = {}, out = [];
  for(let i = 1; i < v.length; i++){
    const ph = phone10_(v[i][t.ix.phone]); if(!ph || seen[ph]) continue; seen[ph] = true;
    if(String(v[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    const role = cell_(v[i], t.ix.role);
    if(attExempt_(role) || marked[ph] || onLeave[ph]) continue;
    out.push({phone:ph, name:cell_(v[i], t.ix.name), role:role,
              mandal:cell_(v[i], t.ix.mandal), email:String(v[i][t.ix.email] || '').trim()});
  }
  return out;
}
/* the signed series reads 07.08.2026, not 2026-08-07 — the register keeps
   the sortable form, every served copy carries the district's */
function dmy_(dStr){
  const p = String(dStr || '').split('-');
  return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : String(dStr || '');
}
function noticeEmail_(g, no, dStr, seq){
  const dt = dmy_(dStr);
  const caution = '\n\nCAUTION: This is your ' + seq + ' unmarked working day of the calendar month. The first ' +
      (SCN_FROM_MISS - 1) + ' were met with reminders in the App; this notice issues on the ' + SCN_FROM_MISS +
      'rd. From this day, every further working day on which attendance is not marked costs one day of Casual Leave, debited after the day has closed, and loss of pay once the year\u2019s CL is exhausted.';
  return 'GOVERNMENT OF TELANGANA\nOFFICE OF THE COLLECTOR & DISTRICT MAGISTRATE :: JANGAON DISTRICT\n' +
    'Notice No. ' + no + '            Dated: ' + dt + '\n\nSHOW CAUSE NOTICE\n\n' +
    'Sub: Swachh Jangaon Sanitation Programme (SJSP) \u2013 Daily attendance in the SJSP App \u2013 Failure to mark attendance on ' + dt +
    ' \u2013 Explanation called for within 48 hours \u2013 Show Cause Notice \u2013 Issued \u2013 Regarding.\n\n' +
    'Ref: 1) Standing instructions of the undersigned mandating daily attendance marking in the SJSP App; 2) SJSP App attendance report dt. ' + dt + '.\n\nTo\n' +
    g.name + ',\n' + g.role + ', ' + (g.mandal || '\u2014') + ' Mandal, Jangaon District.\n\n' +
    '1. Under the SJSP, every functionary is required to mark daily attendance in the SJSP App without fail, in terms of the standing instructions of the undersigned. Attendance in the App is the primary record of daily field presence.\n' +
    '2. On verification of the SJSP App attendance report for ' + dt + ', it is noticed that you failed to mark your attendance in the App on that date, attendance being due by ' + CUTOFF_HOUR + ':00 AM from the place of duty. Reminders were issued to you in the App on the earlier unmarked days of this month.\n' +
    '3. Non-marking of attendance as mandated amounts to unauthorised absence from assigned duty and prima facie constitutes dereliction of duty in violation of Rule 3 of the Telangana Civil Services (Conduct) Rules, 1964.\n' +
    '4. You are directed to acknowledge this notice in the SJSP App and to submit your written explanation within 48 (forty-eight) hours as to why disciplinary action should not be initiated under the Telangana Civil Services (CC&A) Rules, 1991. If sanctioned leave, prior permission, or a verifiable technical difficulty is claimed, documentary proof shall be enclosed.\n' +
    '5. If no explanation is received within the time stipulated, further action shall be taken ex parte on the material available on record.\n' +
    '6. You shall mark daily attendance in the SJSP App henceforth without fail. The App remains locked until this notice is acknowledged in it.' +
    caution + '\n\nJangaon,\nDated: ' + dt + '.\n\nSANDEEP KUMAR JHA, I.A.S.,\nCollector & District Magistrate, Jangaon District.\n(Issued through the SJSP system; the register copy is on the district Sheet.)';
}
/* THE DAILY PASS. Reads the closed day at 18:00 and sorts every officer into
   one of four outcomes: nothing (marked in time), a reminder (marked late, or
   received late), a reminder (first or second miss of the month), or a
   PROPOSED show-cause notice (third miss onward). Only the last waits on the
   Collector; reminders go out at once, because a reminder costs nothing and
   its whole value is being quick. */
function issueAbsenceNotices(){
  const today = today_();
  if(!isWorkingDay_(today)){ Logger.log('Not a working day (' + today + ') — nothing to do.'); return; }
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try{
    const ym = today.slice(0, 7);
    const marks = monthMarks_(ym);
    const days  = activeDaysUpto_(today, marks);
    const onLeave = sanctionedSet_(today);

    /* who already has something for today, so a re-run adds nothing */
    const nsh = sheet_('Notices', N_HEAD), nm = headMap_(nsh, N_HEAD);
    const nv = nsh.getDataRange().getValues();
    const hasNotice = {};
    for(let i = 1; i < nv.length; i++)
      if(dateText_(nv[i][nm.ix.date]) === today) hasNotice[phone10_(nv[i][nm.ix.phone])] = true;
    const rsh = sheet_('Reminders', R_HEAD), rm = headMap_(rsh, R_HEAD);
    const rv = rsh.getDataRange().getValues();
    const hasRem = {};
    for(let i = 1; i < rv.length; i++)
      if(dateText_(rv[i][rm.ix.date]) === today) hasRem[phone10_(rv[i][rm.ix.phone])] = true;

    /* the roll, folded one row per officer */
    const t = uidx_(), uv = t.sh.getDataRange().getValues(), seen = {}, roll = [];
    for(let i = 1; i < uv.length; i++){
      const ph = phone10_(uv[i][t.ix.phone]); if(!ph || seen[ph]) continue; seen[ph] = true;
      if(String(uv[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
      const role = cell_(uv[i], t.ix.role);
      if(attExempt_(role)) continue;
      roll.push({ phone:ph, name:cell_(uv[i], t.ix.name), role:role,
                  mandal:cell_(uv[i], t.ix.mandal), email:String(uv[i][t.ix.email] || '').trim() });
    }

    const reminders = [], proposals = [];
    roll.forEach(g => {
      if(onLeave[g.phone]) return;                       /* sanctioned leave answers for the day */
      const mine = marks[g.phone + '|' + today];
      if(mine){
        const how = lateness_(mine, today);
        if(how && !hasRem[g.phone]) reminders.push({ g:g, kind:how, miss:0, why:reasonText_(how, 0) });
        return;                                          /* marked: never a miss, never a notice */
      }
      /* a miss. count the month's misses from the record itself, today included */
      let miss = 0;
      days.forEach(d => { if(!marks[g.phone + '|' + d]) miss++; });
      if(miss < SCN_FROM_MISS){
        if(!hasRem[g.phone]) reminders.push({ g:g, kind:'MISS', miss:miss, why:reasonText_('MISS', miss) });
      } else if(!hasNotice[g.phone]){
        proposals.push({ g:g, miss:miss });
      }
    });

    /* reminders go out now — informal, unnumbered, and they lock nothing */
    reminders.forEach(r => {
      const row = new Array(rm.width).fill('');
      const put = (k, val) => { if(rm.ix[k] >= 0) row[rm.ix[k]] = val; };
      put('id', 'REM-' + today + '-' + r.g.phone);
      put('date', "'" + today); put('phone', "'" + r.g.phone);
      put('name', r.g.name); put('role', r.g.role); put('mandal', r.g.mandal);
      put('miss', r.miss); put('kind', r.kind); put('reason', r.why);
      put('sentAt', new Date().toISOString());
      if(r.g.email && r.g.email.indexOf('@') > 0){
        try{
          MailApp.sendEmail(r.g.email, 'SJSP reminder \u2014 ' + dmy_(today) + ' \u2014 ' + r.why,
            'SWACHH JANGAON SANITATION PROGRAMME\n\n' + r.g.name + ', ' + r.g.role +
            (r.g.mandal ? ', ' + r.g.mandal : '') + '\n\nDate: ' + dmy_(today) + '\nReason: ' + r.why + '\n\n' +
            (r.kind === 'MISS'
              ? 'This is a reminder, not a notice. Attendance is due in the SJSP App by ' + CUTOFF_HOUR +
                ':00 AM every working day, from the place of duty.\n\nThis is your ' +
                (r.miss === 1 ? 'first' : 'second') + ' unmarked day this month. On the ' + SCN_FROM_MISS +
                'rd unmarked day of a calendar month a SHOW CAUSE NOTICE is issued, and from that day each further day of default costs one day of Casual Leave.'
              : 'This is a reminder, not a notice. Please see that attendance is marked, and received by the district, before ' +
                CUTOFF_HOUR + ':00 AM. Where the App shows a red banner, press "Send it to the district now" on returning to signal.') +
            '\n\nOffice of the Collector & District Magistrate, Jangaon.');
          put('emailedAt', new Date().toISOString());
        }catch(err){}
      }
      rsh.appendRow(row);
    });

    /* the third miss and beyond: proposed only, never served without the word */
    proposals.forEach(p => {
      const row = new Array(nm.width).fill('');
      const put = (k, val) => { if(nm.ix[k] >= 0) row[nm.ix[k]] = val; };
      put('id', 'NTC-' + today + '-' + p.g.phone);
      put('date', "'" + today); put('phone', "'" + p.g.phone);
      put('name', p.g.name); put('role', p.g.role); put('mandal', p.g.mandal);
      put('seq', p.miss); put('issuedAt', new Date().toISOString()); put('status', 'PROPOSED');
      nsh.appendRow(row);
    });

    try{
      const me = Session.getEffectiveUser().getEmail();
      if(me) MailApp.sendEmail(me, 'SJSP ' + dmy_(today) + ' \u2014 ' + proposals.length +
        ' notice(s) for your approval, ' + reminders.length + ' reminder(s) sent',
        (proposals.length
          ? 'AWAITING YOUR APPROVAL (3rd unmarked day of the month or beyond):\n' +
            proposals.map(p => '  ' + p.g.name + ' (' + p.g.role + ', ' + p.g.mandal + ') \u2014 ' +
              p.miss + ' unmarked day(s) this month').join('\n') +
            '\n\nNOTHING HAS BEEN SERVED. Console \u2192 Notices \u2192 Send. Attendance is read again when you approve, so anyone whose phone reaches the district meanwhile drops out by himself.\n\n'
          : 'No notice is due for approval.\n\n') +
        (reminders.length
          ? 'REMINDERS ALREADY SENT (no approval needed, nothing on the register):\n' +
            reminders.map(r => '  ' + r.g.name + ' \u2014 ' + r.why).join('\n')
          : 'No reminders were due.'));
    }catch(err){}
    Logger.log(reminders.length + ' reminder(s) sent; ' + proposals.length + ' notice(s) proposed.');
  }finally{ lock.releaseLock(); }
}
/* The Collector's word: approve serves and numbers; drop kills unnumbered. */
function decideNotices_(b, u){
  if(u.role !== 'COLLECTOR') return json_({ ok:false, error:'Notices are served by the Collector alone.' });
  const approve = Array.isArray(b.approve) ? b.approve.slice(0, 400) : [];
  const drop    = Array.isArray(b.drop)    ? b.drop.slice(0, 400)    : [];
  if(!approve.length && !drop.length) return json_({ ok:false, error:'Nothing to decide.' });
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try{
    const sh = sheet_('Notices', N_HEAD), m = headMap_(sh, N_HEAD);
    const v = sh.getDataRange().getValues();
    const byId = {};
    for(let i = 1; i < v.length; i++) byId[cell_(v[i], m.ix.id)] = i + 1;
    /* served notices per officer per month, for the seq an approval takes */
    const servedCount = {};
    for(let i = 1; i < v.length; i++){
      const st = String(v[i][m.ix.status] || '');
      if(st !== 'PENDING' && st !== 'ACK') continue;
      const key = phone10_(v[i][m.ix.phone]) + '|' + String(dateText_(v[i][m.ix.date])).slice(0, 7);
      servedCount[key] = (servedCount[key] || 0) + 1;
    }
    /* officer emails off the roll, once */
    const t = uidx_(), uv = t.sh.getDataRange().getValues(), mail = {};
    for(let i = 1; i < uv.length; i++){
      const p = phone10_(uv[i][t.ix.phone]);
      if(p && !mail[p]) mail[p] = String(uv[i][t.ix.email] || '').trim();
    }
    const props = PropertiesService.getScriptProperties();
    let next = Number(props.getProperty('NOTICE_SEQ_NEXT')) || NOTICE_SERIES_START;
    const now = new Date().toISOString(), by = u.name + ' (' + u.role + ')';
    let served = 0, dropped = 0, mailed = 0, cured = 0;
    /* THE SECOND LOOK. Between the 18:00 reading and this moment the officer's
       phone may have reached the district at last — a mark held on a weak line
       is not absence. Any proposal whose officer now has attendance, or leave
       since sanctioned, is withdrawn as CURED and never served, whatever the
       Collector ticked. Attendance is read here fresh, per date. */
    const markedOn = {}, leaveOn = {};
    const dayOf = id => { const at = byId[String(id || '')]; if(!at) return '';
      return dateText_(sh.getRange(at, m.ix.date + 1).getValue()); };
    approve.forEach(id => {
      const d = dayOf(id); if(!d || markedOn[d]) return;
      markedOn[d] = markedSet_(d); leaveOn[d] = sanctionedSet_(d);
    });
    approve.forEach(id => {
      const at = byId[String(id || '')]; if(!at) return;
      const row = sh.getRange(at, 1, 1, m.width).getValues()[0];
      if(String(row[m.ix.status]) !== 'PROPOSED') return;      /* only a proposal can be served */
      const ph = phone10_(row[m.ix.phone]), dStr = dateText_(row[m.ix.date]);
      if((markedOn[dStr] && markedOn[dStr][ph]) || (leaveOn[dStr] && leaveOn[dStr][ph])){
        sh.getRange(at, m.ix.status + 1).setValue('CURED');
        sh.getRange(at, m.ix.decidedBy + 1).setValue('SYSTEM \u00b7 attendance found on a second reading');
        sh.getRange(at, m.ix.decidedAt + 1).setValue(now);
        cured++; return;                                       /* never served, never numbered */
      }
      /* the standing is the miss number the daily pass recorded — the count
         of unmarked working days that month. It is not re-derived here, so a
         dropped or cured notice can never shift another officer's standing. */
      const seq = Number(row[m.ix.seq]) || SCN_FROM_MISS;
      const no = (next < 100 ? ('0' + next).slice(-2) : String(next)) + '/SJSP-SCN/' + String(dStr).slice(0, 4);
      next++;
      const g = { name:cell_(row, m.ix.name), role:cell_(row, m.ix.role), mandal:cell_(row, m.ix.mandal) };
      sh.getRange(at, m.ix.no + 1).setValue(no);
      sh.getRange(at, m.ix.seq + 1).setValue(seq);
      sh.getRange(at, m.ix.status + 1).setValue('PENDING');
      sh.getRange(at, m.ix.decidedBy + 1).setValue(by);
      sh.getRange(at, m.ix.decidedAt + 1).setValue(now);
      const em = mail[ph] || '';
      if(em && em.indexOf('@') > 0){
        try{ MailApp.sendEmail(em, 'SHOW CAUSE NOTICE ' + no + ' \u2014 attendance not marked ' + dmy_(dStr),
                               noticeEmail_(g, no, dStr, seq));
             sh.getRange(at, m.ix.emailedAt + 1).setValue(new Date().toISOString()); mailed++; }catch(err){}
      }
      served++;
    });
    drop.forEach(id => {
      const at = byId[String(id || '')]; if(!at) return;
      const row = sh.getRange(at, 1, 1, m.width).getValues()[0];
      if(String(row[m.ix.status]) !== 'PROPOSED') return;      /* a served notice cannot be un-served here */
      sh.getRange(at, m.ix.status + 1).setValue('DROPPED');
      sh.getRange(at, m.ix.decidedBy + 1).setValue(by);
      sh.getRange(at, m.ix.decidedAt + 1).setValue(now);
      dropped++;
    });
    props.setProperty('NOTICE_SEQ_NEXT', String(next));
    let proposed = 0;
    const v2 = sh.getDataRange().getValues();
    for(let i = 1; i < v2.length; i++) if(String(v2[i][m.ix.status]) === 'PROPOSED') proposed++;
    return json_({ ok:true, served:served, dropped:dropped, mailed:mailed, cured:cured, proposed:proposed });
  }finally{ lock.releaseLock(); }
}
/* CL used this year by an officer, APPROVED rows only */
function clUsed_(phone, yr){
  const sh = sheet_('Leave', L_HEAD), m = headMap_(sh, L_HEAD);
  const v = sh.getDataRange().getValues(); let used = 0;
  for(let i = 1; i < v.length; i++){
    if(phone10_(v[i][m.ix.phone]) !== phone) continue;
    if(String(v[i][m.ix.type]) !== 'CL') continue;
    if(String(v[i][m.ix.status]) !== 'APPROVED') continue;
    if(Number(String(dateText_(v[i][m.ix.fromDate])).slice(0,4)) !== yr) continue;
    used += Number(v[i][m.ix.days]) || 0;
  }
  return used;
}
/* The settlement. It runs the NEXT morning and judges the day that has
   CLOSED — never the running one — so every late sync, every phone that
   found signal at nine at night, is counted before a rupee moves. Pass a
   date to settle a particular day by hand. */
function settleAbsenceDebits(dateOpt){
  const today = String(dateOpt || '').trim() || prevWorkingDay_(today_());
  if(!isWorkingDay_(today)){ Logger.log(today + ' was not a working day — nothing to settle.'); return; }
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try{
    const marked = markedSet_(today), onLeave = sanctionedSet_(today);
    const nsh = sheet_('Notices', N_HEAD), nm = headMap_(nsh, N_HEAD);
    const lsh = sheet_('Leave', L_HEAD), lm = headMap_(lsh, L_HEAD);
    const nv = nsh.getDataRange().getValues();
    const yr = Number(today.slice(0, 4));
    let debits = 0;
    for(let i = 1; i < nv.length; i++){
      if(dateText_(nv[i][nm.ix.date]) !== today) continue;
      const st = String(nv[i][nm.ix.status] || '');
      if(st !== 'PENDING' && st !== 'ACK') continue;           /* only a SERVED notice can debit */
      if(String(nv[i][nm.ix.clDebited]).toUpperCase() === 'TRUE') continue;
      const seq = Number(nv[i][nm.ix.seq]) || 1;
      if(seq < DEBIT_FROM_MISS) continue;   /* the first misses were met with reminders */
      const ph = phone10_(nv[i][nm.ix.phone]);
      if(!ph || marked[ph] || onLeave[ph]) continue;          /* mended, or sanctioned meanwhile */
      const used = clUsed_(ph, yr), ent = entitlement_('CL', yr);
      const type = used >= ent ? 'LOP' : 'CL';
      const lid = 'SYSCL-' + today + '-' + ph;
      if(!leaveRow_(lsh, lm, lid)){                           /* idempotent */
        const row = new Array(lm.width).fill('');
        const put = (k, val) => { if(lm.ix[k] >= 0) row[lm.ix[k]] = val; };
        const when = new Date().toISOString();
        put('id', lid); put('appliedAt', when); put('phone', "'" + ph);
        put('name', cell_(nv[i], nm.ix.name)); put('role', cell_(nv[i], nm.ix.role)); put('mandal', cell_(nv[i], nm.ix.mandal));
        put('type', type); put('fromDate', "'" + today); put('toDate', "'" + today); put('days', 1);
        put('reason', 'Attendance not marked on ' + dmy_(today) + ' \u2014 auto-debit under the SJSP attendance rule (' +
          seq + ' unmarked working day(s) this month; the first ' + (SCN_FROM_MISS - 1) +
          ' drew reminders and a show-cause notice was served on the ' + SCN_FROM_MISS + 'rd' +
          (type === 'LOP' ? '; CL for ' + yr + ' exhausted, recorded as loss of pay' : '') + ').');
        put('leaveHq', 'false'); put('status', 'APPROVED');
        put('decidedBy', 'SYSTEM \u00b7 SJSP attendance rule'); put('decidedAt', when); put('receivedAt', when);
        lsh.appendRow(row);
      }
      nsh.getRange(i + 1, nm.ix.clDebited + 1).setValue('TRUE');
      nsh.getRange(i + 1, nm.ix.leaveId + 1).setValue(lid);
      nsh.getRange(i + 1, nm.ix.debitAt + 1).setValue(new Date().toISOString());
      debits++;
    }
    try{
      const me = Session.getEffectiveUser().getEmail();
      if(me && debits) MailApp.sendEmail(me, 'SJSP \u2014 ' + debits + ' leave debit(s) under the attendance rule, ' + today,
        'One day each, entered on the Leave register as APPROVED by SYSTEM \u00b7 SJSP attendance rule. The notice register carries the cross-reference.');
    }catch(err){}
    Logger.log(debits + ' debit(s) settled for ' + today + '.');
  }finally{ lock.releaseLock(); }
}
/* Run ONCE from the editor. Installs both daily triggers and removes any
   older copies of them first, so running it again cannot double them. */
function installNoticeTriggers(){
  ScriptApp.getProjectTriggers().forEach(t => {
    const f = t.getHandlerFunction();
    if(f === 'issueAbsenceNotices' || f === 'settleAbsenceDebits' || f === 'notifyAttendanceGaps') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('issueAbsenceNotices').timeBased().everyDays(1).atHour(NOTICE_HOUR).create();
  ScriptApp.newTrigger('settleAbsenceDebits').timeBased().everyDays(1).atHour(SETTLE_HOUR).create();
  Logger.log('Triggers installed (Asia/Calcutta):\n' +
    '  issueAbsenceNotices ~' + NOTICE_HOUR + ':00 \u2014 reads the day AFTER duty hours and proposes; nothing is served.\n' +
    '  settleAbsenceDebits ~' + SETTLE_HOUR + ':00 \u2014 settles the PREVIOUS working day, re-reading attendance first.\n' +
    'Any older copy of these, and the old notifyAttendanceGaps trigger, was removed.');
}

/* ================== REPORTS & FILING REMINDERS · 21.08.2026 ==================
   Two daily jobs, installed once by installReportTriggers():
     villageFilingReminders ~10:00 — from the 16th of the month, and every
       third day after it, each officer whose village stands unevaluated is
       told: the MSO and the MPDO for ACTION, the Panchayat Secretary for
       INFORMATION (the Secretary cannot file). One consolidated message per
       officer — in the app as a reminder row, and by mail. Never a notice,
       never a debit: filing discipline is the mandal chain's to manage.
     dailyCollectorReport   ~19:00 — one structured mail to the Collector
       with the day whole: attendance, filing progress and the forecast at
       the current rate, grades, notices and leave. Guarded so a re-fired
       trigger cannot send it twice.
   Every mail wears the same shell: header, layered sections, footer. */
function emailShell_(title, subtitle, sectionsHtml){
  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F0F2F7;font-family:Segoe UI,Arial,Helvetica,sans-serif">' +
    '<div style="max-width:640px;margin:0 auto;padding:18px 12px">' +
    '<div style="background:#4A40CE;background:linear-gradient(135deg,#4A40CE,#0F766E);border-radius:10px 10px 0 0;padding:16px 22px">' +
    '<div style="color:#DDD9F6;font-size:11px;letter-spacing:.12em;text-transform:uppercase">Government of Telangana &middot; Collectorate Jangaon &middot; SJSP</div>' +
    '<div style="color:#ffffff;font-size:19px;font-weight:700;margin-top:4px">' + title + '</div>' +
    (subtitle ? '<div style="color:#CFEAE6;font-size:12.5px;margin-top:3px">' + subtitle + '</div>' : '') +
    '</div>' +
    '<div style="background:#ffffff;border:1px solid #DFE3EE;border-top:0;border-radius:0 0 10px 10px;padding:6px 22px 18px">' + sectionsHtml + '</div>' +
    '<div style="color:#8A93A6;font-size:11px;padding:12px 8px;line-height:1.6">Swachh Jangaon Sanitation Programme &middot; issued through the SJSP system.<br>' +
    'Office of the Collector &amp; District Magistrate, Jangaon. Automated message; the register copy is on the district Sheet.</div>' +
    '</div></body></html>';
}
function emailSec_(head, bodyHtml){
  return '<div style="margin-top:16px"><div style="font-size:11px;font-weight:700;letter-spacing:.09em;color:#57647D;text-transform:uppercase;border-bottom:2px solid #E7E5F9;padding-bottom:5px">' + head + '</div>' +
    '<div style="font-size:13.5px;color:#1A2437;line-height:1.65;margin-top:8px">' + bodyHtml + '</div></div>';
}
function emailTable_(heads, rows){
  return '<table style="border-collapse:collapse;width:100%;font-size:12.5px;margin-top:4px">' +
    '<tr>' + heads.map(h => '<th style="text-align:left;padding:6px 8px;background:#F3F5FA;border:1px solid #E7EAF2;color:#46536B;font-size:11px;text-transform:uppercase;letter-spacing:.05em">' + h + '</th>').join('') + '</tr>' +
    rows.map(r => '<tr>' + r.map(c => '<td style="padding:6px 8px;border:1px solid #EDF0F6">' + c + '</td>').join('') + '</tr>').join('') + '</table>';
}
/* The dashboard panel, in a mail. Everything below is built of tables and
   inline styles only — mail clients run no script, load no sheet, and the
   Word engine in Outlook ignores widths on a div, so the bars are tables.
   The palette is the one every monitoring screen has taught officials to
   read at a glance: dark panel, big number, green/amber/red by threshold. */
function emailPanel_(title, inner){
  return '<div style="background:#111217;border:1px solid #23262B;border-radius:8px;padding:12px 12px 10px;margin-top:14px">' +
    (title ? '<div style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#9DA5B8;padding:0 2px 8px">' + title + '</div>' : '') +
    inner + '</div>';
}
function emailStats_(tiles){
  const cell = t =>
    '<td style="background:#181B1F;border:1px solid #23262B;border-radius:6px;padding:12px 6px 10px;text-align:center;width:33%">' +
      '<div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#9DA5B8">' + t.label + '</div>' +
      '<div style="font-size:30px;font-weight:800;line-height:1.2;color:' + t.color + '">' + t.value + '</div>' +
      (t.sub ? '<div style="font-size:11px;color:#7B8493">' + t.sub + '</div>' : '') +
    '</td>';
  let h = '<table cellspacing="5" cellpadding="0" style="width:100%;border-collapse:separate">';
  for(let i = 0; i < tiles.length; i += 3) h += '<tr>' + tiles.slice(i, i + 3).map(cell).join('') + '</tr>';
  return h + '</table>';
}
function emailBar_(pct, color){
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return '<table cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse"><tr>' +
    (p > 0 ? '<td width="' + p + '%" bgcolor="' + color + '" style="height:13px;font-size:1px;line-height:1px;border-radius:3px">&nbsp;</td>' : '') +
    (p < 100 ? '<td width="' + (100 - p) + '%" bgcolor="#26292E" style="height:13px;font-size:1px;line-height:1px">&nbsp;</td>' : '') +
    '</tr></table>';
}
/* one bar per mandal against the day marker: a mandal level with the grey
   TODAY bar is on pace, behind it is behind */
function emailGantt_(rows, wdGone, wdAll){
  const todayPct = wdAll ? 100 * wdGone / wdAll : 0;
  const line = (label, bar, right, labelColor) =>
    '<tr><td style="width:104px;font-size:11.5px;color:' + (labelColor || '#C7CCD6') + ';padding:3px 8px 3px 2px;white-space:nowrap">' + label + '</td>' +
    '<td style="padding:3px 0">' + bar + '</td>' +
    '<td style="width:74px;font-size:11px;color:#9DA5B8;padding:3px 2px 3px 8px;text-align:right;white-space:nowrap">' + right + '</td></tr>';
  let h = '<table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse">';
  h += line('TODAY', emailBar_(todayPct, '#6E7683'), 'wd ' + wdGone + ' of ' + wdAll, '#9DA5B8');
  rows.forEach(r => {
    const pct = r.total ? 100 * r.done / r.total : 0;
    const color = pct >= 100 || pct >= todayPct ? '#73BF69' : pct >= todayPct - 12 ? '#FF9830' : '#F2495C';
    h += line(r.label, emailBar_(pct, color), r.done + ' / ' + r.total);
  });
  return h + '</table>' +
    '<div style="font-size:10.5px;color:#7B8493;padding:7px 2px 0">A mandal level with the grey bar is on pace; ' +
    '<span style="color:#FF9830">amber</span> is slipping, <span style="color:#F2495C">red</span> is well behind.</div>';
}
/* the GPs master, read by its own headers — the tab has been created with
   the columns both ways round over the versions, so the header decides */
function gpRoll_(){
  const sh = sheet_('GPs', ['Mandal','GP']);
  const v = sh.getDataRange().getValues();
  if(v.length < 2) return [];
  const head = v[0].map(h => String(h).toLowerCase().trim());
  let mi = -1, gi = -1;
  head.forEach((h, i) => { if(h.indexOf('mandal') >= 0) mi = i; else if(h === 'gp' || h.indexOf('village') >= 0 || h.indexOf('panchayat') >= 0) gi = i; });
  if(mi < 0 || gi < 0){ mi = 0; gi = 1; }
  /* one village, one row — the tab has carried duplicate rows, and every
     count downstream (the console, the workbook, the reminders) inflated
     with them: 102 filed plus 275 pending against a district of fewer
     villages. The roll collapses them here, keeping the first spelling. */
  const out = [], had = {};
  for(let i = 1; i < v.length; i++){
    const m2 = String(v[i][mi] || '').trim(), g = String(v[i][gi] || '').trim();
    if(!m2 || !g) continue;
    const k = m2.toLowerCase() + '|' + g.toLowerCase();
    if(had[k]) continue;
    had[k] = true;
    out.push({ mandal: m2, gp: g });
  }
  return out;
}
function unfiledVillages_(ym){
  const filed = {};
  const ish = sheet_('Inspections', HEADERS), im = headMap_(ish, HEADERS);
  const iv = ish.getDataRange().getValues();
  for(let i = 1; i < iv.length; i++){
    if(ymText_(iv[i][im.ix.ym]) !== ym) continue;
    filed[String(iv[i][im.ix.mandal]).trim().toLowerCase() + '|' + String(iv[i][im.ix.gp]).trim().toLowerCase()] = true;
  }
  return gpRoll_().filter(r => !filed[r.mandal.toLowerCase() + '|' + r.gp.toLowerCase()]);
}
/* working days of the month around a date — Sundays and the Holidays tab out */
function monthWd_(dStr){
  const ym = String(dStr).slice(0, 7), hs = holidaySet_(), day = Number(String(dStr).slice(8, 10));
  const last = new Date(Number(ym.slice(0,4)), Number(ym.slice(5,7)), 0).getDate();
  let gone = 0, left = 0;
  for(let i = 1; i <= last; i++){
    const key = ym + '-' + (i < 10 ? '0' + i : String(i));
    if(new Date(key + 'T00:00:00').getDay() === 0 || hs[key]) continue;
    if(i <= day) gone++; else left++;
  }
  return { gone: Math.max(1, gone), left: left, total: gone + left };
}
function villageFilingReminders(){
  const today = today_();
  const d = Number(today.slice(8, 10));
  if(d <= 15){ Logger.log('Before the 16th — the mandals have the month to themselves.'); return; }
  if((d - 16) % 3 !== 0){ Logger.log('Not a reminder day (the 16th, then every third day).'); return; }
  if(!isWorkingDay_(today)){ Logger.log('Off day — no reminders.'); return; }
  const ym = today.slice(0, 7);
  const unfiled = unfiledVillages_(ym);
  if(!unfiled.length){ Logger.log('Every village is filed for ' + ym + '. Nothing to remind.'); return; }
  const wd = monthWd_(today);
  const totalGps = gpRoll_().length;
  const need = Math.ceil(unfiled.length / Math.max(1, wd.left));

  /* the chain for each village: PS by village (information), the mandal's
     MSO and MPDO (action). The MPO already files; he is not chased twice. */
  const t = uidx_(), uv = t.sh.getDataRange().getValues();
  const psByGp = {}, roleByMandal = {};
  const seenPh = {};
  for(let i = 1; i < uv.length; i++){
    const ph = phone10_(uv[i][t.ix.phone]); if(!ph || seenPh[ph]) continue; seenPh[ph] = true;
    if(String(uv[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    const role = cell_(uv[i], t.ix.role).toUpperCase();
    const off = { phone: ph, name: cell_(uv[i], t.ix.name), role: role,
                  mandal: cell_(uv[i], t.ix.mandal), email: String(uv[i][t.ix.email] || '').trim() };
    if(role === 'PS')
      String(uv[i][t.ix.gp] || '').split(',').map(s => s.trim().toLowerCase()).filter(String)
        .forEach(g => { (psByGp[g] = psByGp[g] || []).push(off); });
    if(role === 'MSO' || role === 'MPDO')
      roleByMandal[off.mandal.trim().toLowerCase() + '|' + role] = off;
  }
  const recip = {};   /* phone -> {off, action, villages[]} */
  const addTo = (off, action, village) => {
    if(!off) return;
    const r = recip[off.phone] = recip[off.phone] || { off: off, action: action, villages: [] };
    if(r.villages.indexOf(village) < 0) r.villages.push(village);
  };
  unfiled.forEach(vg => {
    const mk = vg.mandal.trim().toLowerCase();
    addTo(roleByMandal[mk + '|MSO'],  true,  vg.gp + ' (' + vg.mandal + ')');
    addTo(roleByMandal[mk + '|MPDO'], true,  vg.gp + ' (' + vg.mandal + ')');
    (psByGp[vg.gp.trim().toLowerCase()] || []).forEach(ps => addTo(ps, false, vg.gp + ' (' + vg.mandal + ')'));
  });

  const rsh = sheet_('Reminders', R_HEAD), rm = headMap_(rsh, R_HEAD);
  const rv = rsh.getDataRange().getValues();
  const already = {};
  for(let i = 1; i < rv.length; i++)
    if(dateText_(rv[i][rm.ix.date]) === today && String(rv[i][rm.ix.kind]) === 'FILING')
      already[phone10_(rv[i][rm.ix.phone])] = true;

  let sent = 0, mailed = 0;
  Object.keys(recip).forEach(ph => {
    if(already[ph]) return;
    const r = recip[ph], n = r.villages.length;
    const why = 'Village evaluation pending — ' + n + ' village' + (n > 1 ? 's' : '') +
      (r.action ? ' awaiting your task force' : ' (for your information)');
    const row = new Array(rm.width).fill('');
    const put = (k, val) => { if(rm.ix[k] >= 0) row[rm.ix[k]] = val; };
    put('id', 'REM-F-' + today + '-' + ph);
    put('date', "'" + today); put('phone', "'" + ph);
    put('name', r.off.name); put('role', r.off.role); put('mandal', r.off.mandal);
    put('miss', n); put('kind', 'FILING'); put('reason', why);
    put('sentAt', new Date().toISOString());
    if(r.off.email && r.off.email.indexOf('@') > 0){
      try{
        const list = r.villages.slice(0, 60);
        const secs =
          emailSec_(r.action ? 'Villages awaiting your task force' : 'Your villages, for your information',
            '<ul style="margin:4px 0 0 18px;padding:0">' + list.map(v2 => '<li style="margin-top:3px">' + v2 + '</li>').join('') + '</ul>' +
            (r.villages.length > 60 ? '<div style="margin-top:6px;color:#57647D">…and ' + (r.villages.length - 60) + ' more.</div>' : '')) +
          emailSec_('The month’s clock',
            'District: <b>' + (totalGps - unfiled.length) + ' of ' + totalGps + '</b> villages evaluated for ' + ym + '.<br>' +
            '<b>' + wd.left + '</b> working day' + (wd.left === 1 ? '' : 's') + ' remain; the month closes only if about <b>' + need + '</b> evaluation' + (need === 1 ? ' is' : 's are') + ' filed each remaining day.') +
          emailSec_('What is asked', r.action
            ? 'See that the 100-mark evaluation is filed in the SJSP App for each village above before month-end. The Mandal Sanitation Task Force files; the register reads only what is filed.'
            : 'No action is required of you. The evaluation of your village is filed by the Mandal Sanitation Task Force; this is to keep you informed of its pendency.');
        MailApp.sendEmail(r.off.email,
          'SJSP · ' + n + ' village' + (n > 1 ? 's' : '') + ' pending evaluation · ' + dmy_(today) + (r.action ? '' : ' (information)'),
          'Villages pending evaluation for ' + ym + ': ' + r.villages.join('; '),
          { htmlBody: emailShell_(r.action ? 'Village evaluations pending — action' : 'Village evaluations pending — information',
              r.off.name + ' · ' + r.off.role + (r.off.mandal ? ' · ' + r.off.mandal : ''), secs) });
        put('emailedAt', new Date().toISOString()); mailed++;
      }catch(err){}
    }
    rsh.appendRow(row); sent++;
  });
  try{
    const me = Session.getEffectiveUser().getEmail();
    const byMandal = {};
    unfiled.forEach(v2 => { byMandal[v2.mandal] = (byMandal[v2.mandal] || 0) + 1; });
    if(me) MailApp.sendEmail(me, 'SJSP · filing reminders sent · ' + dmy_(today),
      unfiled.length + ' village(s) unevaluated; ' + sent + ' officer(s) reminded.',
      { htmlBody: emailShell_('Filing reminders — dispatched', dmy_(today) + ' · ' + ym,
          emailSec_('Standing', '<b>' + unfiled.length + '</b> of ' + totalGps + ' villages unevaluated · <b>' + sent + '</b> officer(s) reminded (' + mailed + ' by mail).') +
          emailSec_('Unevaluated, mandal by mandal', emailTable_(['Mandal', 'Villages pending'],
            Object.keys(byMandal).sort().map(m2 => [m2, String(byMandal[m2])])))) });
  }catch(err){}
  Logger.log(unfiled.length + ' village(s) unevaluated; ' + sent + ' officer(s) reminded, ' + mailed + ' mailed.');
}
function dailyCollectorReport(){
  const today = today_();
  const props = PropertiesService.getScriptProperties();
  if(props.getProperty('LAST_DAILY_REPORT') === today){ Logger.log('The ' + today + ' report has already gone.'); return; }
  const ym = today.slice(0, 7), wd = monthWd_(today);

  /* the roll, and the day's attendance against it */
  const t = uidx_(), uv = t.sh.getDataRange().getValues();
  const roll = [], seenPh = {};
  let collectorEmail = '';
  for(let i = 1; i < uv.length; i++){
    const ph = phone10_(uv[i][t.ix.phone]); if(!ph || seenPh[ph]) continue; seenPh[ph] = true;
    if(String(uv[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    const role = cell_(uv[i], t.ix.role).toUpperCase();
    if(role === 'COLLECTOR'){ collectorEmail = String(uv[i][t.ix.email] || '').trim(); continue; }
    if(attExempt_(role)) continue;
    roll.push({ phone: ph, name: cell_(uv[i], t.ix.name), role: role, mandal: cell_(uv[i], t.ix.mandal) });
  }
  const marked = markedSet_(today), onLeave = sanctionedSet_(today);
  const absent = roll.filter(o => !marked[o.phone] && !onLeave[o.phone]);
  const present = roll.length - absent.length - roll.filter(o => !marked[o.phone] && onLeave[o.phone]).length;
  const leaveN = roll.filter(o => !marked[o.phone] && onLeave[o.phone]).length;
  const gapByMandal = {};
  absent.forEach(o => { gapByMandal[o.mandal || '—'] = (gapByMandal[o.mandal || '—'] || 0) + 1; });

  /* the month's filings, and the forecast at the present rate */
  const ish = sheet_('Inspections', HEADERS), im = headMap_(ish, HEADERS);
  const iv = ish.getDataRange().getValues();
  let filed = 0, filedToday = 0, scoreSum = 0, rfN = 0;
  const grades = { A:0, B:0, C:0, D:0 }, doneKeys = {};
  const nrm = s => String(s || '').trim().toLowerCase();
  for(let i = 1; i < iv.length; i++){
    if(ymText_(iv[i][im.ix.ym]) !== ym) continue;
    filed++;
    doneKeys[nrm(iv[i][im.ix.mandal]) + '|' + nrm(iv[i][im.ix.gp])] = true;
    scoreSum += Number(iv[i][im.ix.score]) || 0;
    const g = cell_(iv[i], im.ix.grade); if(grades[g] != null) grades[g]++;
    if(cell_(iv[i], im.ix.rf).trim()) rfN++;
    if(dateText_(iv[i][im.ix.date]) === today) filedToday++;
  }
  /* the pace is measured in VILLAGES evaluated, never in filings — a
     village inspected twice is still one village done */
  const gRoll = gpRoll_(), covM = {};
  gRoll.forEach(r => { covM[r.mandal] = covM[r.mandal] || { total: 0, done: 0 };
    covM[r.mandal].total++;
    if(doneKeys[nrm(r.mandal) + '|' + nrm(r.gp)]) covM[r.mandal].done++; });
  const totalGps = gRoll.length;
  const dDone = Object.keys(covM).reduce((s, m2) => s + covM[m2].done, 0);
  const rate = dDone / wd.gone;
  const remaining = Math.max(0, totalGps - dDone);
  const needPerDay = wd.left ? Math.ceil(remaining / wd.left) : remaining;
  const wdToFinish = rate > 0 ? Math.ceil(remaining / rate) : null;
  const forecast = remaining === 0 ? 'complete'
    : wdToFinish == null ? 'no rate yet'
    : wdToFinish <= wd.left ? ('on pace — about ' + wdToFinish + ' working day' + (wdToFinish === 1 ? '' : 's') + ' to finish')
    : ('BEHIND — at the present rate the month ends ' + (wdToFinish - wd.left) + ' working day' + (wdToFinish - wd.left === 1 ? '' : 's') + ' short');

  /* notices and leave standing */
  const nsh = sheet_('Notices', N_HEAD), nm = headMap_(nsh, N_HEAD);
  const nv = nsh.getDataRange().getValues();
  let nProp = 0, nServedToday = 0;
  for(let i = 1; i < nv.length; i++){
    const st = String(nv[i][nm.ix.status] || '');
    if(st === 'PROPOSED') nProp++;
    if((st === 'PENDING' || st === 'ACK') && String(nv[i][nm.ix.decidedAt] || '').slice(0, 10) === today) nServedToday++;
  }
  const lsh = sheet_('Leave', L_HEAD), lm = headMap_(lsh, L_HEAD);
  const lv = lsh.getDataRange().getValues();
  let lvPend = 0;
  for(let i = 1; i < lv.length; i++) if(String(lv[i][lm.ix.status] || 'PENDING') === 'PENDING') lvPend++;

  const gapRows = Object.keys(gapByMandal).sort((a, b) => gapByMandal[b] - gapByMandal[a])
    .map(m2 => [m2, String(gapByMandal[m2])]);

  /* the day at a glance, before a single sentence: six numbers coloured by
     threshold, and the month's Gantt under them */
  const attPct = roll.length ? 100 * (present + leaveN) / roll.length : 100;
  const behindBy = wdToFinish != null && wdToFinish > wd.left ? wdToFinish - wd.left : 0;
  const tiles = emailStats_([
    { label: 'Present', value: present, sub: 'of ' + roll.length + ' due',
      color: attPct >= 90 ? '#73BF69' : attPct >= 75 ? '#FF9830' : '#F2495C' },
    { label: 'On leave', value: leaveN, sub: 'sanctioned', color: '#5794F2' },
    { label: 'Not marked', value: absent.length, sub: 'today', color: absent.length ? '#F2495C' : '#73BF69' },
    { label: 'Villages done', value: dDone, sub: 'of ' + totalGps + ' · ' + ym,
      color: remaining === 0 || behindBy === 0 ? '#73BF69' : behindBy <= 3 ? '#FF9830' : '#F2495C' },
    { label: 'Filed today', value: filedToday, sub: 'evaluations', color: '#B877D9' },
    { label: 'Red flags', value: rfN, sub: 'this month', color: rfN ? '#FF9830' : '#73BF69' }
  ]);
  const ganttRows = Object.keys(covM)
    .map(m2 => ({ label: m2, done: covM[m2].done, total: covM[m2].total }))
    .sort((a, b) => (b.done / Math.max(1, b.total)) - (a.done / Math.max(1, a.total)));
  ganttRows.push({ label: 'DISTRICT', done: dDone, total: totalGps });
  const secs =
    emailPanel_('The district at ' + dmy_(today), tiles) +
    emailPanel_('Filing progress · ' + ym, emailGantt_(ganttRows, wd.gone, wd.gone + wd.left)) +
    emailSec_('Attendance · ' + dmy_(today),
      '<b>' + present + '</b> marked · <b>' + leaveN + '</b> on sanctioned leave · <b style="color:' + (absent.length ? '#B91C1C' : '#15803D') + '">' + absent.length + '</b> not marked, of ' + roll.length + ' due.' +
      (gapRows.length ? emailTable_(['Mandal', 'Not marked'], gapRows.slice(0, 12)) : '') +
      (absent.length ? '<div style="margin-top:8px;color:#57647D;font-size:12px">' +
        absent.slice(0, 40).map(o => o.name + ' (' + o.role + ', ' + (o.mandal || '—') + ')').join(' · ') +
        (absent.length > 40 ? ' · and ' + (absent.length - 40) + ' more' : '') + '</div>' : '')) +
    emailSec_('Village evaluations · ' + ym,
      '<b>' + dDone + ' of ' + totalGps + '</b> villages evaluated (' + filed + ' filing' + (filed === 1 ? '' : 's') + ', ' + filedToday + ' today) · average score <b>' + (filed ? Math.round(scoreSum / filed) : '—') + '</b> · red flags <b>' + rfN + '</b>.<br>' +
      'Grades — A ' + grades.A + ' · B ' + grades.B + ' · C ' + grades.C + ' · D ' + grades.D + '.<br>' +
      'Rate <b>' + rate.toFixed(1) + '/working day</b> over ' + wd.gone + ' gone · ' + wd.left + ' left · needed <b>' + needPerDay + '/day</b>.<br>' +
      'Forecast at the present rate: <b>' + forecast + '</b>.') +
    emailSec_('Awaiting your orders',
      '<b>' + nProp + '</b> notice proposal' + (nProp === 1 ? '' : 's') + ' (Console ▸ Notices)' +
      (nServedToday ? ' · ' + nServedToday + ' served today' : '') +
      ' · <b>' + lvPend + '</b> leave application' + (lvPend === 1 ? '' : 's') + ' waiting.');
  const to = collectorEmail || Session.getEffectiveUser().getEmail();
  if(to){
    MailApp.sendEmail(to, 'SJSP daily report · ' + dmy_(today) + ' · ' + present + ' marked · ' + dDone + '/' + totalGps + ' villages',
      'Attendance ' + present + ' marked, ' + absent.length + ' not; villages ' + dDone + '/' + totalGps + '; ' + forecast + '.',
      { htmlBody: emailShell_('The district, end of day', dmy_(today) + ' · Jangaon', secs) });
    props.setProperty('LAST_DAILY_REPORT', today);
    Logger.log('Daily report sent to ' + to + '.');
  } else Logger.log('No address to send the daily report to.');
}
/* Run ONCE from the editor. Installs both daily report triggers, removing
   any older copies first, so running it again cannot double them. */
/* A test copy on demand, from the editor. The report proper is guarded to
   once a day; a plain manual run would spend that guard and swallow the
   evening's mail. This clears the guard, sends, and clears it again — the
   19:00 trigger still fires, and the copy is marked as a check. */
function sendDailyReportNow(){
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('LAST_DAILY_REPORT');
  dailyCollectorReport();
  props.deleteProperty('LAST_DAILY_REPORT');
  Logger.log('That was a check copy — the guard is clear again, so the 19:00 report will still go.');
}

function installReportTriggers(){
  ScriptApp.getProjectTriggers().forEach(t => {
    const f = t.getHandlerFunction();
    if(f === 'villageFilingReminders' || f === 'dailyCollectorReport') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('villageFilingReminders').timeBased().everyDays(1).atHour(10).create();
  ScriptApp.newTrigger('dailyCollectorReport').timeBased().everyDays(1).atHour(19).create();
  Logger.log('Report triggers installed (Asia/Calcutta):\n' +
    '  villageFilingReminders ~10:00 — from the 16th, every third day, on working days.\n' +
    '  dailyCollectorReport   ~19:00 — one structured mail, once a day, guarded against double sends.');
}

/* ---------------- GET ---------------- */
function doGet(e){
  const p = e.parameter || {};

  /* Identity check for the LIVE deployment — deliberately BEFORE the sign-in
     gate, because its whole purpose is to answer when nothing else works.
     Reveals nothing sensitive: a code stamp, whether a briefing key is
     visible to THIS deployment, and the key's last six characters. */
  if(p.op === 'diag'){
    var dk = '';
    try{ dk = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY') || ''; }catch(err){}
    return json_({ ok:true, stamp:'SJGP-6.9-diag12', tzScript:Session.getScriptTimeZone(), tzSheet:sheetTz_(), today:today_(), offToday:offInfo_(today_()), briefKeyStored: !!dk,
      keyEnds: dk ? dk.slice(-6) : '', at:new Date().toISOString() });
  }

  const u = auth_(p.token);
  if(!u) return json_({ ok:false, error:'auth' });
  if(p.op === 'me') return json_({ ok:true, user:u });

  if(p.op === 'gps'){
    let rows = sheet_('GPs', ['Mandal','GP']).getDataRange().getValues().slice(1)
      .filter(r => r[0] && r[1]).map(r => ({ mandal:String(r[0]).trim(), gp:String(r[1]).trim() }));
    if(viewerRole_(u.role)) rows = rows.filter(r => u.gps.indexOf(r.gp) >= 0);
    else if(mandalRole_(u.role)) rows = rows.filter(r => r.mandal === u.mandal);
    return json_({ ok:true, gps:rows });
  }

  /* the notice register: an officer sees his own SERVED file — a proposal
     the Collector has not passed does not exist for him. The Collector,
     with all=1, sees everything. The year's holidays travel with the reply
     so the phone can treat off days as off, signal or no signal later. */
  if(p.op === 'notices'){
    const sh = sheet_('Notices', N_HEAD), m = headMap_(sh, N_HEAD);
    const v = sh.getDataRange().getValues();
    const all = p.all === '1' && u.role === 'COLLECTOR';
    const rows = [];
    for(let i = v.length - 1; i >= 1 && rows.length < (all ? 600 : 120); i--){
      const ph = phone10_(v[i][m.ix.phone]);
      const st = String(v[i][m.ix.status] || 'PENDING');
      if(!all && (ph !== u.phone || (st !== 'PENDING' && st !== 'ACK'))) continue;
      rows.push({ id:cell_(v[i], m.ix.id), no:cell_(v[i], m.ix.no), date:dateText_(v[i][m.ix.date]),
        name:cell_(v[i], m.ix.name), role:cell_(v[i], m.ix.role), mandal:cell_(v[i], m.ix.mandal),
        seq:Number(v[i][m.ix.seq]) || 1, status:st,
        ackAt:String(v[i][m.ix.ackAt] || ''), ackNote:String(v[i][m.ix.ackNote] || ''),
        clDebited:String(v[i][m.ix.clDebited]).toUpperCase() === 'TRUE',
        issuedAt:String(v[i][m.ix.issuedAt] || ''),
        decidedBy: all ? cell_(v[i], m.ix.decidedBy) : '' });
    }
    /* reminders travel with the file: informal, unnumbered, never a lock */
    const rsh = sheet_('Reminders', R_HEAD), rmm = headMap_(rsh, R_HEAD);
    const rvv = rsh.getDataRange().getValues();
    const rems = [];
    for(let i = rvv.length - 1; i >= 1 && rems.length < (all ? 400 : 60); i--){
      const rp = phone10_(rvv[i][rmm.ix.phone]);
      if(!all && rp !== u.phone) continue;
      rems.push({ id:cell_(rvv[i], rmm.ix.id), date:dateText_(rvv[i][rmm.ix.date]),
        name:cell_(rvv[i], rmm.ix.name), role:cell_(rvv[i], rmm.ix.role), mandal:cell_(rvv[i], rmm.ix.mandal),
        miss:Number(rvv[i][rmm.ix.miss]) || 0, kind:cell_(rvv[i], rmm.ix.kind),
        reason:cell_(rvv[i], rmm.ix.reason), sentAt:String(rvv[i][rmm.ix.sentAt] || '') });
    }
    return json_({ ok:true, rows:rows,
                   pending:rows.filter(r => r.status === 'PENDING').length,
                   reminders:rems, scnFrom:SCN_FROM_MISS, cutoff:CUTOFF_HOUR,
                   grace:NOTICE_GRACE, holidays:holidaySet_() });
  }

  /* ---------------- the Collector's monitoring console ----------------
     One call assembles the whole picture server-side: attendance today and
     the fortnight, the month's inspections, the six-month trend, mandal
     coverage and the leave register. Collector only — the token's role is
     the gate, so the page cannot be reached by knowing its address. */
  /* the whole filed record, for the Collector's drill-down */
  if(p.op === 'record'){
    if(u.role !== 'COLLECTOR') return json_({ ok:false, error:'Collector only.' });
    const sh = sheet_('Inspections', HEADERS), m = headMap_(sh, HEADERS);
    const v = sh.getDataRange().getValues();
    for(let i = 1; i < v.length; i++){
      if(String(v[i][m.ix.gp]) === String(p.gp || '') && String(v[i][m.ix.ym]) === String(p.ym || '')){
        const o = {}; HEADERS.forEach(h => { if(m.ix[h] != null) o[h] = v[i][m.ix[h]]; });
        return json_({ ok:true, row:o });
      }
    }
    return json_({ ok:false, error:'No record for that village this month.' });
  }

  if(p.op === 'dashboard'){
    if(u.role !== 'COLLECTOR')
      return json_({ ok:false, error:'The monitoring console is available to the Collector alone.' });
    /* If anything in the builder throws, the console must receive the fault
       as JSON it can display — never Google's HTML error page, which reads
       as "JSON.parse: unexpected character" and says nothing. */
    try{

    /* Every poll used to re-read five whole sheets. Twenty polls a minute of
       an append-only ledger is the same answer twenty times, so the whole
       payload is held for 25 seconds. */
    /* the month under review — current unless a past month is asked for */
    const ymReq = /^\d{4}-\d{2}$/.test(String(p.ym || '')) ? String(p.ym) : '';
    const cache = CacheService.getScriptCache();
    const ck = 'dash_' + today_() + '_' + (ymReq || 'cur');
    const hit = cache.get(ck);
    if(hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);

    const today = today_();
    const ymN = ymReq || today.slice(0,7);

    /* officers */
    const t = uidx_(), uv = t.sh.getDataRange().getValues();
    const officers = [], seenPh = {};
    for(let i = 1; i < uv.length; i++){
      const ph = phone10_(uv[i][t.ix.phone]); if(!ph || seenPh[ph]) continue; seenPh[ph] = true;
      if(String(uv[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
      officers.push({phone:ph, name:cell_(uv[i], t.ix.name), role:cell_(uv[i], t.ix.role), mandal:cell_(uv[i], t.ix.mandal)});
    }

    /* attendance: today in full, a fortnight in counts. The sheet is
       append-only and grows ~280 rows a working day, so only the tail is
       read — 9,000 rows is over a month at district volume, and the cost
       stays constant as the ledger ages. */
    const ash = sheet_('Attendance', A_HEAD), am = headMap_(ash, A_HEAD);
    const lastRow = ash.getLastRow();
    const start = Math.max(2, lastRow - 9000);
    const av = lastRow < 2 ? [[]] :
      [ash.getRange(1,1,1,ash.getLastColumn()).getValues()[0]]
        .concat(ash.getRange(start, 1, lastRow - start + 1, ash.getLastColumn()).getValues());
    /* every count is of OFFICERS, never of rows — historical duplicate rows
       collapse here, and repeated marking is carried as a count, not a copy */
    const todayByPh = {}, dailyPh = {}, lastFix = {};
    for(let i = 1; i < av.length; i++){
      const d = dateText_(av[i][am.ix.date]); if(!d) continue;
      const ph = phone10_(av[i][am.ix.phone]); if(!ph) continue;
      const st = String(av[i][am.ix.status] || 'PRESENT');
      dailyPh[d] = dailyPh[d] || {};
      dailyPh[d][ph] = st;
      /* the officer's LAST located mark — rows arrive in order, so the last
         one seen wins. An officer missing today can then be shown on the
         map at the place he last marked, said as exactly that. */
      const fl = Number(av[i][am.ix.lat]), fg = Number(av[i][am.ix.lng]);
      if(fl && fg) lastFix[ph] = { lat: fl, lng: fg, d: d };
      if(d === today){
        const rowMarks = Number(av[i][am.ix.markCount]) || 1;
        const prev = todayByPh[ph];
        const marks = (prev ? prev.marks : 0) + rowMarks;   /* old duplicate rows add up */
        todayByPh[ph] = {
          phone:ph, name:cell_(av[i], am.ix.name), role:cell_(av[i], am.ix.role),
          mandal:cell_(av[i], am.ix.mandal),
          /* the district's reading of when it was marked, never the phone's
             unchecked claim — a handset running fast was showing marks in
             the future on this very screen */
          at:effMarkAt_(String(av[i][am.ix.markedAt]||''), String(av[i][am.ix.receivedAt]||'')),
          claimedAt:String(av[i][am.ix.markedAt]||''),
          skew:Number(av[i][am.ix.skew])||0,
          verified:String(av[i][am.ix.verified])==='true' || av[i][am.ix.verified]===true,
          lat:Number(av[i][am.ix.lat])||null, lng:Number(av[i][am.ix.lng])||null,
          acc:Number(av[i][am.ix.accuracy])||null, tz:String(av[i][am.ix.timezone]||''),
          status:st, leaveType:cell_(av[i], am.ix.leaveType),
          marks:marks, firstAt:String(av[i][am.ix.firstMarkAt]||'') || (prev?prev.firstAt:'')};
      }
    }
    const todayRows = Object.keys(todayByPh).map(k => todayByPh[k]);

    /* SANCTIONED LEAVE STANDS IN FOR THE MISSING ROW. An officer whose
       leave the Collector approved rightly stays home and writes nothing —
       and this screen used to read that silence as absence. On Varalakshmi
       Vratham 2026 it showed ninety sanctioned officers as not marked.
       The notice engine always consulted the Leave register; the console
       now does the same. */
    const lsh = sheet_('Leave', L_HEAD), lm = headMap_(lsh, L_HEAD);
    const lv = lsh.getDataRange().getValues();
    const d14 = [];
    for(let k = 13; k >= 0; k--){
      const d = new Date(); d.setDate(d.getDate() - k);
      d14.push(Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'));
    }
    const leaveCover = {};   /* 'date|phone' -> leave type, APPROVED spells only */
    for(let i = 1; i < lv.length; i++){
      if(String(lv[i][lm.ix.status]) !== 'APPROVED') continue;
      const f = dateText_(lv[i][lm.ix.fromDate]), t = dateText_(lv[i][lm.ix.toDate]);
      const p = phone10_(lv[i][lm.ix.phone]);
      if(!f || !t || !p) continue;
      d14.forEach(d2 => { if(f <= d2 && d2 <= t) leaveCover[d2 + '|' + p] = String(lv[i][lm.ix.type] || 'CL'); });
    }

    const daily = {};
    Object.keys(dailyPh).forEach(d => {
      daily[d] = {present:0, leave:0};
      Object.keys(dailyPh[d]).forEach(ph => daily[d][dailyPh[d][ph]==='LEAVE'?'leave':'present']++);
    });
    /* an officer covered by sanctioned leave who wrote no row still counts
       as on leave that day, not as nothing */
    Object.keys(leaveCover).forEach(k => {
      const d2 = k.slice(0, 10), p = k.slice(11);
      if((dailyPh[d2] || {})[p]) return;
      daily[d2] = daily[d2] || {present:0, leave:0};
      daily[d2].leave++;
    });
    const att14 = d14.map(key => ({date:key, present:(daily[key]||{}).present||0, leave:(daily[key]||{}).leave||0}));
    const markedPh = {}; todayRows.forEach(r => markedPh[r.phone] = true);
    officers.forEach(o => {
      if(attExempt_(o.role) || markedPh[o.phone]) return;
      const tp = leaveCover[today + '|' + o.phone]; if(!tp) return;
      todayRows.push({phone:o.phone, name:o.name, role:o.role, mandal:o.mandal,
        at:'', claimedAt:'', skew:0, verified:false, lat:null, lng:null, acc:null, tz:'',
        status:'LEAVE', leaveType:tp, marks:0, firstAt:'', sanctioned:true});
      markedPh[o.phone] = true;
    });
    /* today's seen pings, for the unmarked: fresher than any old mark */
    const ssh = sheet_('Seen', SEEN_HEAD), sm = headMap_(ssh, SEEN_HEAD);
    const sLast = ssh.getLastRow(), seenToday = {};
    if(sLast >= 2){
      const sv = ssh.getRange(Math.max(2, sLast - 1500), 1, sLast - Math.max(2, sLast - 1500) + 1, ssh.getLastColumn()).getValues();
      sv.forEach(r => {
        if(dateText_(r[sm.ix.date]) !== today) return;
        const ph = phone10_(r[sm.ix.phone]); if(!ph) return;
        const la = Number(r[sm.ix.lat]), ln = Number(r[sm.ix.lng]); if(!la || !ln) return;
        seenToday[ph] = { lat: la, lng: ln, at: effMarkAt_(String(r[sm.ix.at] || ''), String(r[sm.ix.receivedAt] || '')) };
      });
    }
    const absent = officers.filter(o => !attExempt_(o.role) && !markedPh[o.phone])
      .map(o => {
        const sp = seenToday[o.phone];
        if(sp) return Object.assign({}, o, { lat: sp.lat, lng: sp.lng, seenAt: sp.at, lastDate: today });
        const lf = lastFix[o.phone];
        return lf ? Object.assign({}, o, { lat: lf.lat, lng: lf.lng, lastDate: lf.d }) : o; });

    /* officer × day over the same fortnight — the comparative record the
       console exports. P present, L on leave, '-' no row that day; the
       console reads Sundays for itself from the date. Compact arrays keep
       ~280 officers × 14 days inside the cache ceiling. */
    const mDates = att14.map(a => a.date);
    const attMatrix = officers.filter(o => !attExempt_(o.role)).map(o => {
      const days = mDates.map(d => { const st = (dailyPh[d] || {})[o.phone];
        return st ? (st === 'LEAVE' ? 'L' : 'P') : (leaveCover[d + '|' + o.phone] ? 'L' : '-'); }).join('');
      return [o.name, o.role, o.mandal, days];
    });

    /* inspections: this month in full, six months in trend */
    const ish = sheet_('Inspections', HEADERS), im = headMap_(ish, HEADERS);
    const iv = ish.getDataRange().getValues();
    const monthRows = [], trend = {};
    for(let i = 1; i < iv.length; i++){
      const ym = String(iv[i][im.ix.ym] || ''); if(!ym) continue;
      const sc = Number(iv[i][im.ix.score]) || 0;
      trend[ym] = trend[ym] || {sum:0, n:0};
      trend[ym].sum += sc; trend[ym].n++;
      if(ym === ymN) monthRows.push({
        gp:cell_(iv[i], im.ix.gp), mandal:cell_(iv[i], im.ix.mandal), score:sc,
        album:cell_(iv[i], im.ix.album), folder:cell_(iv[i], im.ix.photoFolder),
        photos:Number(iv[i][im.ix.photoCount])||0, lat:Number(iv[i][im.ix.lat])||null, lng:Number(iv[i][im.ix.lng])||null,
        grade:cell_(iv[i], im.ix.grade), rf:cell_(iv[i], im.ix.redFlags),
        officer:cell_(iv[i], im.ix.officer), date:dateText_(iv[i][im.ix.date])});
    }
    const months = Object.keys(trend).sort().slice(-6)
      .map(k => ({ym:k, avg:Math.round(trend[k].sum/trend[k].n), n:trend[k].n}));

    /* coverage: reported against the roll, mandal by mandal. The roll comes
       from gpRoll_ — columns found by header, duplicates collapsed — and the
       match is case-blind and trimmed, because an officer's filing spells the
       village as he types it, not as the tab does. This block once read the
       tab by position and matched by exact string; the same village then
       counted as both filed and pending, and filed-plus-pending overshot the
       district. */
    const gRoll = gpRoll_();
    const nrm = s => String(s || '').trim().toLowerCase();
    const roll = {};
    gRoll.forEach(r => { roll[r.mandal] = roll[r.mandal] || {total:0, done:0}; roll[r.mandal].total++; });
    const doneSet = {}; monthRows.forEach(r => doneSet[nrm(r.mandal) + '|' + nrm(r.gp)] = true);
    /* pending village names ride along, so a mandal can be opened in full */
    const pendByM = {};
    gRoll.forEach(r => {
      if(doneSet[nrm(r.mandal) + '|' + nrm(r.gp)]) roll[r.mandal].done++;
      else { pendByM[r.mandal] = pendByM[r.mandal] || []; if(pendByM[r.mandal].length < 80) pendByM[r.mandal].push(r.gp); }
    });
    const coverage = Object.keys(roll).sort().map(m => ({mandal:m, total:roll[m].total, done:roll[m].done, pending:pendByM[m] || []}));

    /* leave — the sheet was already read above for the cover map */
    const lp = [], lr = [];
    for(let i = 1; i < lv.length; i++){
      const row = {name:cell_(lv[i], lm.ix.name), role:cell_(lv[i], lm.ix.role), mandal:cell_(lv[i], lm.ix.mandal),
        type:cell_(lv[i], lm.ix.type), from:dateText_(lv[i][lm.ix.fromDate]), to:dateText_(lv[i][lm.ix.toDate]),
        days:Number(lv[i][lm.ix.days])||0, status:String(lv[i][lm.ix.status]||'PENDING'),
        appliedAt:String(lv[i][lm.ix.appliedAt]||'')};
      (row.status === 'PENDING' ? lp : lr).push(row);
    }
    lr.sort((a,b)=>String(b.appliedAt).localeCompare(String(a.appliedAt)));

    const gradeCount = {A:0,B:0,C:0,D:0};
    monthRows.forEach(r => { if(gradeCount[r.grade] != null) gradeCount[r.grade]++; });

    /* notices: the approval queue, the served register, the month's debits */
    const nsh = sheet_('Notices', N_HEAD), nmm = headMap_(nsh, N_HEAD);
    const nLast = nsh.getLastRow();
    const nStart = Math.max(2, nLast - 2500);
    const nv = nLast < 2 ? [] : nsh.getRange(nStart, 1, nLast - nStart + 1, nsh.getLastColumn()).getValues();
    const nRows = [], nProp = []; let nToday = 0, nPend = 0, nDebM = 0, nMonth = 0;
    for(let i = nv.length - 1; i >= 0; i--){
      const d = dateText_(nv[i][nmm.ix.date]); if(!d) continue;
      const st = String(nv[i][nmm.ix.status] || 'PENDING');
      const deb = String(nv[i][nmm.ix.clDebited]).toUpperCase() === 'TRUE';
      const served = st === 'PENDING' || st === 'ACK';
      if(st === 'PROPOSED' && nProp.length < 320)
        nProp.push({ id:cell_(nv[i], nmm.ix.id), date:d, name:cell_(nv[i], nmm.ix.name),
                     role:cell_(nv[i], nmm.ix.role), mandal:cell_(nv[i], nmm.ix.mandal) });
      if(served && d === today) nToday++;
      if(st === 'PENDING') nPend++;
      if(served && d.slice(0,7) === today.slice(0,7)){ nMonth++; if(deb) nDebM++; }
      if(nRows.length < 80) nRows.push({ no:cell_(nv[i], nmm.ix.no), date:d,
        name:cell_(nv[i], nmm.ix.name), role:cell_(nv[i], nmm.ix.role), mandal:cell_(nv[i], nmm.ix.mandal),
        seq:Number(nv[i][nmm.ix.seq]) || 0, status:st, ackAt:String(nv[i][nmm.ix.ackAt] || ''),
        ackNote:String(nv[i][nmm.ix.ackNote] || ''), clDebited:deb,
        decidedBy:cell_(nv[i], nmm.ix.decidedBy) });
    }

    /* reminders: today's and the month's, by kind */
    const rsh2 = sheet_('Reminders', R_HEAD), rm2 = headMap_(rsh2, R_HEAD);
    const rl2 = rsh2.getLastRow();
    const rv2 = rl2 < 2 ? [] : rsh2.getRange(Math.max(2, rl2 - 3000), 1, Math.min(rl2 - 1, 3000), rsh2.getLastColumn()).getValues();
    let remToday = 0, remMonth = 0, remLate = 0; const remRows = [];
    for(let i = rv2.length - 1; i >= 0; i--){
      const d = dateText_(rv2[i][rm2.ix.date]); if(!d) continue;
      const kind = cell_(rv2[i], rm2.ix.kind);
      if(d === today){ remToday++; if(kind !== 'MISS') remLate++; }
      if(d.slice(0,7) === today.slice(0,7)) remMonth++;
      if(remRows.length < 60) remRows.push({ date:d, name:cell_(rv2[i], rm2.ix.name),
        role:cell_(rv2[i], rm2.ix.role), mandal:cell_(rv2[i], rm2.ix.mandal),
        miss:Number(rv2[i][rm2.ix.miss]) || 0, kind:kind, reason:cell_(rv2[i], rm2.ix.reason) });
    }

    const out = { ok:true, at:new Date().toISOString(), today:today, tz:Session.getScriptTimeZone(), ym:ymN,
      totals:{officers:officers.length, gps:gRoll.length},
      today:{present:todayRows.filter(r=>r.status!=='LEAVE'), onLeave:todayRows.filter(r=>r.status==='LEAVE'), absent:absent},
      att14:att14, month:{rows:monthRows, grades:gradeCount,
        avg: monthRows.length ? Math.round(monthRows.reduce((s,r)=>s+r.score,0)/monthRows.length) : null,
        rfCount: monthRows.filter(r=>String(r.rf||'').trim()).length},
      trend:months, coverage:coverage,
      off:offInfo_(today),
      attm:{dates:mDates, rows:attMatrix, off:(function(){ const hs=holidaySet_(); return mDates.filter(d => !!hs[d]); })()},
      notices:{today:nToday, pending:nPend, debitsMonth:nDebM, month:nMonth, grace:NOTICE_GRACE,
               scnFrom:SCN_FROM_MISS, cutoff:CUTOFF_HOUR, proposed:nProp, rows:nRows,
               reminders:{today:remToday, month:remMonth, lateToday:remLate, rows:remRows}},
      leave:{pending:lp, recent:lr.slice(0,40)} };
    const body = JSON.stringify(out);
    /* 50 seconds: a console polling every minute then almost always reads
       the cache, so however many consoles are open, the sheets are rebuilt
       at most about once a minute — gentler on the quota when Google's own
       weather is rough, at a freshness cost nobody can perceive */
    if(body.length < 95000) try{ cache.put(ck, body, 50); }catch(err){}
    return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
    }catch(err){
      return json_({ ok:false, error:'console builder failed: ' + String((err && err.message) || err) +
        ' \u00b7 ' + String((err && err.stack) || '').split('\n').slice(0, 2).join(' | ').slice(0, 300) });
    }
  }

  if(p.op === 'leave'){
    if(!canApplyLeave_(u.role) && !canApproveLeave_(u.role)) return json_({ ok:true, rows:[] });
    const sh = sheet_('Leave', L_HEAD);
    const data = sh.getDataRange().getValues();
    if(data.length < 2) return json_({ ok:true, rows:[] });
    const head = data[0].map(String);
    let rows = data.slice(1).map(r => { const o = {}; head.forEach((h,i)=>o[h]=r[i]); return o; });
    /* an applicant sees his own file and nobody else's */
    if(!canApproveLeave_(u.role)) rows = rows.filter(o => phone10_(o.phone) === u.phone);
    rows = rows.map(o => ({
      id:String(o.id||''), appliedAt:String(o.appliedAt||''),
      phone:String(o.phone||'').replace(/^'/,''),
      name:String(o.name||''), role:String(o.role||''), mandal:String(o.mandal||''),
      type:String(o.type||''), from:dateText_(o.fromDate), to:dateText_(o.toDate),
      days:Number(o.days||0), reason:String(o.reason||''), address:String(o.address||''),
      hq:String(o.leaveHq) === 'true' || o.leaveHq === true,
      cert:String(o.certificate||''),
      status:String(o.status||'PENDING'), decidedBy:String(o.decidedBy||''),
      decidedAt:String(o.decidedAt||''), remarks:String(o.remarks||'')
    }));
    rows.sort((a,b) => String(b.appliedAt).localeCompare(String(a.appliedAt)));
    return json_({ ok:true, rows:rows.slice(0, 400) });
  }

  if(p.op === 'attendance'){
    const want = p.date ? dateText_(p.date) : today_();
    const sh = sheet_('Attendance', A_HEAD);
    const data = sh.getDataRange().getValues();
    if(data.length < 2) return json_({ ok:true, rows:[], date:want });
    const head = data[0].map(String);
    let rows = data.slice(1).map(r => { const o = {}; head.forEach((h,i)=>o[h]=r[i]); return o; })
      .filter(o => dateText_(o.date) === want)
      .map(o => ({ id:o.id, date:dateText_(o.date), name:o.name, role:o.role, mandal:o.mandal,
                   markedAt:String(o.markedAt||''), lat:o.lat, lng:o.lng, accuracy:o.accuracy,
                   verified:o.verified, photo:o.photo, status:String(o.status||'PRESENT'),
                   leaveType:String(o.leaveType||''), phone:String(o.phone||'').replace(/^'/,'') }));
    if(viewerRole_(u.role)) rows = rows.filter(o => phone10_(o.phone) === u.phone);
    else if(mandalRole_(u.role)) rows = rows.filter(o => !o.mandal || o.mandal === u.mandal);
    rows.forEach(o => { delete o.phone; });
    return json_({ ok:true, rows:rows, date:want });
  }

  const sh = sheet_('Inspections', HEADERS);
  const data = sh.getDataRange().getValues();
  const head = data[0];
  let rows = data.slice(1).map(r => {
      const o = {}; head.forEach((h,i)=>o[h]=r[i]);
      o.ym = ymText_(o.ym); o.date = dateText_(o.date);
      o.mandal = String(o.mandal == null ? '' : o.mandal).trim();
      o.gp = String(o.gp == null ? '' : o.gp).trim();
      o.rf = String(o.rf == null ? '' : o.rf).trim();
      if(!p.full) delete o.payload; return o;
    })
    .filter(o => o.id && (!p.ym || o.ym === ymText_(p.ym)));
  if(viewerRole_(u.role)) rows = rows.filter(o => u.gps.indexOf(String(o.gp)) >= 0);
  else if(mandalRole_(u.role)) rows = rows.filter(o => o.mandal === u.mandal);
  return json_({ ok:true, rows:rows, user:u });
}

/* ---------------- POST ---------------- */
function doPost(e){
  let b;
  try{ b = JSON.parse(e.postData.contents); }catch(err){ return json_({ ok:false, error:'bad request' }); }

  if(b.kind === 'login'){
    const u = findByPhone_(b.u || '');
    if(!u || !u.active) return json_({ ok:false, error:'This number is not registered. Contact the District Panchayat Office.' });
    if(!u.hash) return json_({ ok:false, error:'No PIN set for this number yet. Contact the District Panchayat Office.' });
    const rk = 'pl_' + u.phone, n = Number(cache_().get(rk) || 0);
    if(n >= MAX_PIN_TRIES) return json_({ ok:false, error:'Too many wrong attempts. Try again after an hour.' });
    if(u.hash !== hash_(u.phone, b.p || '')){ cache_().put(rk, String(n + 1), 3600); return json_({ ok:false, error:'Wrong PIN.' }); }
    cache_().remove(rk);
    return json_({ ok:true, token: issueToken_(u), user: pub_(u) });
  }

  const u = auth_(b.token);
  if(!u) return json_({ ok:false, error:'auth' });

  if(b.kind === 'chpass'){
    const full = findByPhone_(u.phone);
    if(!full || !full.hash || full.hash !== hash_(full.phone, b.old || '')) return json_({ ok:false, error:'The current PIN is wrong.' });
    if(!b.newp || String(b.newp).length < 4) return json_({ ok:false, error:'The new PIN must be at least four digits.' });
    const t = uidx_(), nh = hash_(full.phone, b.newp);
    full.rows.forEach(r => t.sh.getRange(r, t.ix.hash + 1).setValue(nh));   // every row for this number
    return json_({ ok:true });
  }

  /* attendance is required of every role, including the Secretary */
  if(b.kind === 'attendance') return saveAttendance_(b, u);

  /* the seen ping — where an officer who opened the app without marking
     stood at that moment. Receipt only; never attendance. */
  if(b.kind === 'seen') return saveSeen_(b, u);

  /* Acknowledging a show-cause notice. Receipt, not excuse: it lifts the
     app's lock and carries the officer's explanation to the register, but
     the day's debit stands or falls on attendance alone. Every role may
     acknowledge its own notices — a Secretary's read-only login included. */
  if(b.kind === 'noticeDecide') return decideNotices_(b, u);

  if(b.kind === 'noticeAck'){
    const acks = Array.isArray(b.acks) ? b.acks.slice(0, 40) : [];
    if(!acks.length) return json_({ ok:false, error:'Nothing to acknowledge.' });
    const sh = sheet_('Notices', N_HEAD), m = headMap_(sh, N_HEAD);
    const v = sh.getDataRange().getValues();
    const byId = {};
    for(let i = 1; i < v.length; i++) byId[cell_(v[i], m.ix.id)] = i + 1;
    let done = 0;
    const now = new Date().toISOString();
    acks.forEach(a => {
      const at = byId[String((a && a.id) || '')]; if(!at) return;
      const row = sh.getRange(at, 1, 1, m.width).getValues()[0];
      if(phone10_(row[m.ix.phone]) !== u.phone) return;        /* one's own alone */
      if(String(row[m.ix.status]) === 'ACK'){ done++; return; } /* idempotent */
      if(String(row[m.ix.status]) !== 'PENDING') return;       /* only a SERVED notice can be acknowledged */
      sh.getRange(at, m.ix.status + 1).setValue('ACK');
      sh.getRange(at, m.ix.ackAt + 1).setValue(String((a && a.ackAt) || now));
      sh.getRange(at, m.ix.ackNote + 1).setValue(String((a && a.note) || '').slice(0, 1000));
      sh.getRange(at, m.ix.ackReceivedAt + 1).setValue(now);
      done++;
    });
    /* what still stands against this officer, so the app can lift or hold */
    let pending = 0;
    const v2 = sh.getDataRange().getValues();
    for(let i = 1; i < v2.length; i++)
      if(phone10_(v2[i][m.ix.phone]) === u.phone && String(v2[i][m.ix.status] || 'PENDING') === 'PENDING') pending++;
    return json_({ ok:true, done:done, pending:pending });
  }

  /* The Collector's briefing. The API key lives in Script Properties on this
     Sheet — never in the page, which is public. Without a key the console
     simply says so and the rest of it carries on working. */
  if(b.kind === 'brief'){
    if(u.role !== 'COLLECTOR')
      return json_({ ok:false, error:'The briefing is available to the Collector alone.' });
    const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
    if(!key) return json_({ ok:false, error:'No briefing key is configured. Apps Script ▸ Project Settings ▸ Script Properties ▸ add ANTHROPIC_API_KEY.' });
    const facts = String(b.facts || '').slice(0, 12000);
    try{
      const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
        method:'post', contentType:'application/json', muteHttpExceptions:true,
        headers:{ 'x-api-key':key, 'anthropic-version':'2023-06-01' },
        payload: JSON.stringify({
          model:'claude-sonnet-4-6', max_tokens:1200,
          system:'You brief the District Collector of Jangaon, Telangana on village sanitation. Plain Indian administrative English; no adjectives of praise; ground every line in the figures given and never invent a village, officer or number. Use EXACTLY these section headings, each on its own line, in this order:\nTHE DAY IN ONE LINE\nTHE TREND\nDOING WELL\nNEEDS FOCUS\nORDERS TO PASS\nWATCH\nUnder THE DAY IN ONE LINE: one sentence with the day\u2019s headline numbers. Under THE TREND: two sentences comparing this month against last (average, coverage pace, flags); say \u201cno prior month to compare\u201d if so. Under DOING WELL: up to three bullets, each \u2022 naming a mandal, village or officer with its figure. Under NEEDS FOCUS: up to four bullets, worst first, each with the figure that puts it there. Under ORDERS TO PASS: numbered 1., 2., \u2026 at most five, each naming who, what figure, and the specific order. Under WATCH: two bullets. If a section has nothing, write \u201cNothing today.\u201d under it rather than padding.',
          messages:[{ role:'user', content:'Today\u2019s district figures:\n\n' + facts }]
        })
      });
      const j = JSON.parse(res.getContentText());
      if(j.error) return json_({ ok:false, error:String(j.error.message || 'briefing refused') });
      const text = (j.content || []).filter(x => x.type === 'text').map(x => x.text).join('\n');
      return json_({ ok:true, text:text, at:new Date().toISOString() });
    }catch(err){ return json_({ ok:false, error:String(err) }); }
  }

  /* The Collector's questions. Same key, same gate as the briefing, but a
     conversation: the console sends the live figures once and the thread of
     questions after them. Nothing is read from the Sheet here — the figures
     travel with the request, so the answer can only be as fresh, and as
     honest, as the screen the Collector is looking at. */
  if(b.kind === 'ask'){
    if(u.role !== 'COLLECTOR')
      return json_({ ok:false, error:'The briefing desk answers the Collector alone.' });
    const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
    if(!key) return json_({ ok:false, error:'No briefing key is configured. Apps Script \u25b8 Project Settings \u25b8 Script Properties \u25b8 add ANTHROPIC_API_KEY.' });
    const facts = String(b.facts || '').slice(0, 30000);
    let hist = Array.isArray(b.messages) ? b.messages : [];
    hist = hist.slice(-10)
      .map(m => ({ role: m && m.role === 'assistant' ? 'assistant' : 'user',
                   content: String((m && m.content) || '').slice(0, 2000) }))
      .filter(m => m.content);
    if(!hist.length || hist[hist.length - 1].role !== 'user')
      return json_({ ok:false, error:'Ask a question first.' });
    /* the API insists on strict user/assistant alternation — a dropped error
       turn on the console can leave two questions abreast, so runs of the
       same role fold into one, and the thread must open with the Collector */
    const folded = [];
    hist.forEach(m => { const last = folded[folded.length - 1];
      if(last && last.role === m.role) last.content += '\n' + m.content; else folded.push({role:m.role, content:m.content}); });
    while(folded.length && folded[0].role !== 'user') folded.shift();
    hist = folded;
    if(!hist.length) return json_({ ok:false, error:'Ask a question first.' });
    const msgs = [
      { role:'user', content:'District figures as of this moment:\n\n' + facts +
        '\n\nAnswer my questions from these figures alone.' },
      { role:'assistant', content:'Noted. I will answer from these figures alone, and say so where the record is silent.' }
    ].concat(hist);
    try{
      const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
        method:'post', contentType:'application/json', muteHttpExceptions:true,
        headers:{ 'x-api-key':key, 'anthropic-version':'2023-06-01' },
        payload: JSON.stringify({
          model:'claude-sonnet-4-6', max_tokens:900,
          system:'You are the briefing desk of the District Collector of Jangaon, Telangana, answering questions on village sanitation, officer attendance, inspections, coverage and leave. Answer ONLY from the district figures supplied in the first message of this conversation. Plain Indian administrative English; no adjectives of praise. Be direct and brief \u2014 a few sentences, or a short list when names or villages are asked for; give every name, score, date and number exactly as it stands in the figures and never invent, estimate or round beyond them. If the figures do not carry the answer, say plainly what is not on the record and stop \u2014 do not guess. When asked to draft an order, memo or message, draft it from the figures and head it DRAFT \u2014 for the Collector\u2019s consideration; it is not an order until the Collector passes it. Counts of officers are of officers, never of rows.',
          messages: msgs
        })
      });
      const j = JSON.parse(res.getContentText());
      if(j.error) return json_({ ok:false, error:String(j.error.message || 'the desk refused') });
      const text = (j.content || []).filter(x => x.type === 'text').map(x => x.text).join('\n');
      return json_({ ok:true, text:text, at:new Date().toISOString() });
    }catch(err){ return json_({ ok:false, error:String(err) }); }
  }

  /* leave — an applicant may only write his own, and only the Collector may decide */
  if(b.kind === 'leave'){
    if(!canApplyLeave_(u.role))
      return json_({ ok:false, error:'Leave is applied for through this app by the MPO, the Panchayat Secretary and the MPDO.' });
    return saveLeave_(b, u);
  }
  if(b.kind === 'leaveDecision'){
    if(!canApproveLeave_(u.role))
      return json_({ ok:false, error:'Leave is sanctioned by the Collector alone.' });
    return decideLeave_(b, u);
  }
  /* withdrawal is not a decision — the applicant takes back his own
     application, and only while it is still awaiting orders */
  if(b.kind === 'leaveWithdraw'){
    const sh = sheet_('Leave', L_HEAD);
    const m = headMap_(sh, L_HEAD);
    const found = leaveRow_(sh, m, String(b.id || ''));
    if(!found) return json_({ ok:true, id:String(b.id||''), status:'CANCELLED', local:true });
    if(phone10_(found.row[m.ix.phone]) !== u.phone)
      return json_({ ok:false, error:'Only the officer who applied can withdraw an application.' });
    const st = String(found.row[m.ix.status] || 'PENDING');
    /* A sanctioned spell may be given back — but only WHOLE and only BEFORE
       it begins: the officer simply reports for duty and the days return to
       the account by themselves (CANCELLED never counts). Once it has
       begun, what was availed is a fact, and only the Collector's office
       can rule on it. */
    let by = 'Withdrawn by the applicant';
    if(st === 'APPROVED'){
      const from = dateText_(found.row[m.ix.fromDate]);
      if(!(from > today_()))
        return json_({ ok:false, error:'This leave has already begun (' + dmy_(from) + '). Ask the Collector’s office to rule on what was not availed.' });
      by = 'Sanctioned leave cancelled by the applicant before it began';
    } else if(st !== 'PENDING'){
      return json_({ ok:false, error:'Orders have already been passed (' + st + '). It can no longer be withdrawn.' });
    }
    const when = new Date().toISOString();
    sh.getRange(found.at, m.ix.status + 1).setValue('CANCELLED');
    sh.getRange(found.at, m.ix.decidedBy + 1).setValue(by);
    sh.getRange(found.at, m.ix.decidedAt + 1).setValue(when);
    return json_({ ok:true, id:String(b.id||''), status:'CANCELLED', decidedAt:when });
  }

  /* everything below writes an evaluation, which a Secretary may not do */
  if(viewerRole_(u.role))
    return json_({ ok:false, error:'Your login has view access only. Evaluations are filed by the Mandal Sanitation Task Force.' });

  if(b.kind === 'inspection') return saveInspection_(b, u);
  if(b.kind === 'photos')     return savePhotos_(b, u);
  return json_({ ok:false, error:'unknown request' });
}

/* ---------------- attendance ---------------- */
function saveAttendance_(b, u){
  const a = b.att || {};
  const date = dateText_(a.date) || today_();
  const sh = sheet_('Attendance', A_HEAD);
  const m = headMap_(sh, A_HEAD);

  /* THE PHOTOGRAPH GOES TO DRIVE BEFORE THE LOCK IS TAKEN. It touches no
     sheet, so it never belonged inside — and during the Drive outage of
     19.08.2026 one hung upload held the global lock for minutes, every
     other officer's mark queued behind it, and the whole district's
     endpoint starved. Drive may be slow; the register must not wait on it. */
  let url = '';
  if(b.photo && b.photo.b64){
    try{
      const root = getFolder_(DriveApp.getRootFolder(), ATT_FOLDER);
      const f = getFolder_(getFolder_(getFolder_(root, date.slice(0,7)), clean_(u.mandal) || 'Unassigned'), date);
      const file = f.createFile(Utilities.newBlob(Utilities.base64Decode(b.photo.b64), 'image/jpeg', b.photo.name || (u.phone + '.jpg')));
      url = file.getUrl();
      try{ file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(err){}
    }catch(err){ url = ''; }
  }

  /* One row per officer per day. The scan-then-append below is a race when
     two syncs land together — which is exactly how the duplicate rows got
     in — so the read-decide-write alone is held under the script lock. */
  const lock = LockService.getScriptLock();
  try{ lock.waitLock(20000); }catch(err){ return json_({ ok:false, error:'busy — try again' }); }
  const data = sh.getDataRange().getValues();
  let at = 0, prevCount = 0, firstAt = '', prevId = '';
  for(let i = 1; i < data.length; i++){
    if(phone10_(data[i][m.ix.phone]) === u.phone && dateText_(data[i][m.ix.date]) === date){
      if(!at){ at = i + 1;
        prevCount = Number(data[i][m.ix.markCount]) || 1;
        firstAt = String(data[i][m.ix.firstMarkAt] || data[i][m.ix.markedAt] || '');
        prevId = String(data[i][m.ix.id] || '');
      }
    }
  }
  /* THE SAME MARK ARRIVING TWICE IS NOT THE OFFICER MARKING TWICE.
     On a weak signal the phone can deliver a mark, lose the reply, and send
     it again — every attempt carries the same client-side id and the same
     markedAt. Only a genuinely new mark-in (a fresh id) raises the count. */
  const sameMark = !!at && !!prevId && String(a.id || '') === prevId;

  const row = new Array(m.width).fill('');
  const put = (k, v) => { if(m.ix[k] >= 0) row[m.ix[k]] = v; };
  put('id', a.id || Utilities.getUuid());
  put('date', "'" + date);
  put('phone', "'" + u.phone);
  put('name', u.name);
  put('role', u.role);
  put('mandal', u.mandal || '');
  put('markedAt', String(a.ts || new Date().toISOString()));
  put('lat', a.lat == null ? '' : a.lat);
  put('lng', a.lng == null ? '' : a.lng);
  put('accuracy', a.acc == null ? '' : Math.round(Number(a.acc)));
  put('verified', a.verified === false ? 'FALSE' : 'TRUE');
  put('photo', url);
  put('timezone', a.tz || '');
  put('status', String(a.status || 'PRESENT'));
  put('leaveId', String(a.leaveId || ''));
  put('leaveType', String(a.leaveType || ''));
  put('receivedAt', new Date().toISOString());
  put('skew', clockSkew_(String(a.ts || ''), new Date().toISOString()));
  put('markCount', at ? (sameMark ? Math.max(1, prevCount) : prevCount + 1) : 1);
  put('firstMarkAt', at ? firstAt : String(a.ts || new Date().toISOString()));

  if(at) sh.getRange(at, 1, 1, m.width).setValues([row]);
  else sh.appendRow(row);
  lock.releaseLock();
  /* the handset is told how far its clock is out, so the officer can fix it */
  const skewNow = clockSkew_(String(a.ts || ''), new Date().toISOString());
  if(at) return json_({ ok:true, url:url, duplicate:!sameMark, resent:sameMark, skew:skewNow,
                        firstAt:firstAt, marks:sameMark ? Math.max(1, prevCount) : prevCount + 1 });
  return json_({ ok:true, url:url, skew:skewNow });
}

/* ---------------- the seen ping ---------------- */
function saveSeen_(b, u){
  if(attExempt_(u.role)) return json_({ ok:true, noted:false });
  const p = b.ping || {};
  const lat = Number(p.lat), lng = Number(p.lng);
  if(!lat || !lng) return json_({ ok:false, error:'no location in the ping' });
  const sh = sheet_('Seen', SEEN_HEAD), m = headMap_(sh, SEEN_HEAD);
  const date = today_();                        /* the server's day, not the phone's */
  const last = sh.getLastRow(), start = Math.max(2, last - 1500);
  let at = 0;
  if(last >= 2){
    const v = sh.getRange(start, 1, last - start + 1, sh.getLastColumn()).getValues();
    for(let i = 0; i < v.length; i++)
      if(phone10_(v[i][m.ix.phone]) === u.phone && dateText_(v[i][m.ix.date]) === date) at = start + i;
  }
  const row = new Array(m.width).fill('');
  const put = (k, val) => { if(m.ix[k] >= 0) row[m.ix[k]] = val; };
  put('date', "'" + date); put('phone', "'" + u.phone);
  put('name', u.name); put('role', u.role); put('mandal', u.mandal || '');
  put('at', String(p.ts || new Date().toISOString()));
  put('lat', lat); put('lng', lng);
  put('accuracy', p.acc == null ? '' : Math.round(Number(p.acc)));
  put('receivedAt', new Date().toISOString());
  if(at) sh.getRange(at, 1, 1, m.width).setValues([row]);
  else sh.appendRow(row);
  return json_({ ok:true, noted:true });
}

/* ---------------- inspection ---------------- */
function saveInspection_(b, u){
  const r = b.record || {};
  if(!r.id || !r.gp) return json_({ ok:false, error:'The record is incomplete.' });
  if(mandalRole_(u.role) && r.mandal !== u.mandal) return json_({ ok:false, error:'That Gram Panchayat is outside your mandal.' });

  const sh = sheet_('Inspections', HEADERS);
  const m = headMap_(sh, HEADERS);
  const ids = sh.getRange(1, m.ix.id + 1, Math.max(sh.getLastRow(), 1), 1).getValues().flat().map(String);
  const at = ids.indexOf(String(r.id));

  const existingFolder = at > 0 && m.ix.photoFolder >= 0 ? String(sh.getRange(at + 1, m.ix.photoFolder + 1).getValue() || '') : '';

  const row = new Array(m.width).fill('');
  HEADERS.forEach(h => {
    if(m.ix[h] < 0) return;
    let v;
    if(h === 'ym')               v = "'" + ymText_(r.ym);      // leading quote keeps it text
    else if(h === 'officer')     v = u.name + ' (' + u.phone + ')';
    else if(h === 'role')        v = u.role;
    else if(h === 'photoCount')  v = Number(r.photoCount) || 0;
    else if(h === 'photoFolder') v = r.photoFolder || existingFolder || '';
    else if(h === 'evidence')    v = Number(r.evidence) || 0;
    else if(h === 'attId')       v = r.attId || '';
    else if(h === 'updatedAt')   v = new Date().toISOString();
    else if(h === 'payload')     v = String(r.payload || '').slice(0, 49000);
    else                         v = r[h] != null ? r[h] : '';
    row[m.ix[h]] = v;
  });

  if(at > 0) sh.getRange(at + 1, 1, 1, m.width).setValues([row]);
  else sh.appendRow(row);
  return json_({ ok:true, photoFolder: r.photoFolder || existingFolder || '' });
}

/* ---------------- photographs, a few at a time ---------------- */
function savePhotos_(b, u){
  const photos = b.photos || [];
  if(!photos.length) return json_({ ok:true, saved:0 });
  if(mandalRole_(u.role) && b.mandal !== u.mandal) return json_({ ok:false, error:'That Gram Panchayat is outside your mandal.' });

  const root = getFolder_(DriveApp.getRootFolder(), PHOTO_FOLDER);
  const gpF = getFolder_(getFolder_(getFolder_(root, ymText_(b.ym)), clean_(b.mandal) || 'Unassigned'), clean_(b.gp));
  let evF = null;
  let saved = 0;
  photos.forEach(p => {
    try{
      const into = (p.kind === 'evidence') ? (evF || (evF = getFolder_(gpF, 'Evidence'))) : gpF;
      into.createFile(Utilities.newBlob(Utilities.base64Decode(p.b64), 'image/jpeg', p.name || (Utilities.getUuid() + '.jpg')));
      saved++;
    }catch(err){}
  });
  const url = gpF.getUrl();
  try{ gpF.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(err){}

  /* keep the row's folder link and photograph count current */
  try{
    const sh = sheet_('Inspections', HEADERS);
    const m = headMap_(sh, HEADERS);
    const ids = sh.getRange(1, m.ix.id + 1, Math.max(sh.getLastRow(), 1), 1).getValues().flat().map(String);
    const at = ids.indexOf(String(b.id));
    if(at > 0){
      if(m.ix.photoFolder >= 0) sh.getRange(at + 1, m.ix.photoFolder + 1).setValue(url);
      if(m.ix.updatedAt >= 0)   sh.getRange(at + 1, m.ix.updatedAt + 1).setValue(new Date().toISOString());
    }
  }catch(err){}

  return json_({ ok:true, saved:saved, photoFolder:url });
}

/* ---------------- leave ---------------- */
function leaveRow_(sh, m, id){
  const data = sh.getDataRange().getValues();
  for(let i = 1; i < data.length; i++) if(String(data[i][m.ix.id]) === String(id)) return { at: i + 1, row: data[i] };
  return null;
}

function saveLeave_(b, u){
  const l = b.leave || {};
  if(!l.id) return json_({ ok:false, error:'bad request' });
  const from = dateText_(l.from), to = dateText_(l.to);
  if(!from || !to) return json_({ ok:false, error:'The dates are not readable.' });
  if(to < from) return json_({ ok:false, error:'The last day falls before the first.' });

  /* an Optional Holiday is one NOTIFIED day — the G.O.'s list, nothing else */
  const isOH = String(l.type || '') === 'OH';
  if(isOH){
    if(from !== to) return json_({ ok:false, error:'An optional holiday is a single day — apply for each occasion separately.' });
    if(!TS_OPTIONAL_2026[from]) return json_({ ok:false, error:'That date is not on the notified optional-holiday list. Pick one of the G.O.’s dates.' });
  }

  /* THE REGISTER IS WRITTEN UNDER LOCK. Two copies of the same application
     arriving seconds apart — a retry racing its original — each scanned the
     sheet, each found nothing, and both appended: the same id twice, one row
     decided and its twin PENDING for ever. The scan and the write are one
     act now, as attendance learned before it. */
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
  const sh = sheet_('Leave', L_HEAD);
  const m = headMap_(sh, L_HEAD);
  const found = leaveRow_(sh, m, l.id);

  /* an application already decided is closed — it cannot be edited from the
     field. RETURNED is the one exception: the Collector sent it back for
     correction, and the corrected copy comes in under the SAME id. */
  let resubmit = false;
  if(found){
    const st = String(found.row[m.ix.status] || 'PENDING');
    if(st === 'RETURNED') resubmit = true;
    else if(st !== 'PENDING') return json_({ ok:true, id:l.id, status:st, closed:true });
    if(phone10_(found.row[m.ix.phone]) !== u.phone) return json_({ ok:false, error:'auth' });
  }

  /* ONE APPLICATION PER SPELL. Every submission from the field carries a
     fresh random id, so an officer who taps Apply twice — or applies again
     because a weak line gave him no confirmation — used to raise two
     independent applications for the same days. The Collector would sanction
     one and its twin would sit in Waiting for ever. A new application that
     overlaps a spell already applied for, or already sanctioned, is refused
     here and told which one it collides with. */
  if(!found){
    const all = sh.getDataRange().getValues();
    for(let i = 1; i < all.length; i++){
      if(phone10_(all[i][m.ix.phone]) !== u.phone) continue;
      const st = String(all[i][m.ix.status] || '');
      if(st !== 'PENDING' && st !== 'APPROVED') continue;
      const f2 = dateText_(all[i][m.ix.fromDate]), t2 = dateText_(all[i][m.ix.toDate]);
      if(!f2 || !t2 || from > t2 || to < f2) continue;              /* no overlap */
      return json_({ ok:false, duplicate:true, existingId:cell_(all[i], m.ix.id),
        error: (st === 'APPROVED' ? 'Leave is already sanctioned' : 'An application is already with the Collector') +
               ' for ' + dmy_(f2) + (f2 === t2 ? '' : ' to ' + dmy_(t2)) +
               '. Open it under Leave rather than applying again.' });
    }
  }

  const row = found ? found.row.slice() : new Array(m.width).fill('');
  const put = (k, v) => { if(m.ix[k] >= 0) row[m.ix[k]] = v; };
  put('id', l.id);
  put('appliedAt', String(l.appliedAt || new Date().toISOString()));
  put('phone', "'" + u.phone);
  put('name', u.name);
  put('role', u.role);
  put('mandal', u.mandal || '');
  put('type', String(l.type || 'CL').slice(0, 8));
  put('fromDate', "'" + from);
  put('toDate', "'" + to);
  put('days', isOH ? 1 : Number(l.days || 0));
  put('reason', String(l.reason || (isOH ? 'Optional holiday: ' + TS_OPTIONAL_2026[from] : '')).slice(0, 1000));
  put('address', String(l.address || '').slice(0, 300));
  put('leaveHq', l.hq === true || String(l.hq) === 'true' ? 'true' : 'false');
  put('certificate', String(l.cert || '').slice(0, 300));
  if(!found || resubmit){ put('status', 'PENDING'); put('decidedBy', ''); put('decidedAt', ''); put('remarks', ''); }
  put('receivedAt', new Date().toISOString());

  if(found) sh.getRange(found.at, 1, 1, m.width).setValues([row]);
  else sh.appendRow(row);
  return json_({ ok:true, id:l.id, status:'PENDING' });
  } finally { lock.releaseLock(); }
}

function decideLeave_(b, u){
  const want = String(b.status || '').toUpperCase();
  if(['APPROVED','REJECTED','CANCELLED','RETURNED'].indexOf(want) < 0) return json_({ ok:false, error:'bad request' });
  /* sent back for correction: neither refused nor sanctioned — the remarks
     ARE the instruction, so they cannot be empty */
  if(want === 'RETURNED' && !String(b.remarks || '').trim())
    return json_({ ok:false, error:'Say what needs correcting — the remarks travel back to the officer.' });

  /* THE WHOLE WAITING LIST IN ONE ORDER — sanction alone: a refusal or a
     return carries its own words per case and is never passed in bulk.
     Every application still answers its own checks in turn, so the fifth
     CL of a batch is counted against the four sanctioned just before it,
     and anything that cannot be sanctioned is refused BY NAME, never
     silently — it stays waiting for the Collector's single-order look. */
  if(Array.isArray(b.ids)){
    if(want !== 'APPROVED')
      return json_({ ok:false, error:'Only sanction is passed in bulk — refusals and returns carry their own words.' });
    const ids = b.ids.slice(0, 200);
    let done = 0; const refused = [];
    ids.forEach(id => {
      const r = decideOneLeave_(String(id || ''), 'APPROVED', '', u);
      if(r.ok) done++; else refused.push({ id: String(id || ''), error: r.error || 'refused' });
    });
    return json_({ ok:true, done:done, refused:refused });
  }

  const id = String(b.id || '');
  if(!id) return json_({ ok:false, error:'bad request' });
  const r = decideOneLeave_(id, want, String(b.remarks || ''), u);
  return json_(r.ok ? { ok:true, id:id, status:want, decidedBy:r.decidedBy, decidedAt:r.decidedAt }
                    : { ok:false, error:r.error });
}
/* one application, one order — the checks live here so a bulk sanction
   obeys exactly the same law as a single one */
function decideOneLeave_(id, want, remarks, u){
  const sh = sheet_('Leave', L_HEAD);
  const m = headMap_(sh, L_HEAD);
  const found = leaveRow_(sh, m, id);
  if(!found) return { ok:false, error:'That application is not on the district record yet.' };

  const st = String(found.row[m.ix.status] || 'PENDING');
  if(st !== 'PENDING') return { ok:false, error:'Orders have already been passed on this application (' + st + ').' };

  if(want === 'APPROVED'){
    const type = String(found.row[m.ix.type] || '');
    const yr = Number(String(dateText_(found.row[m.ix.fromDate])).slice(0,4));
    const ent = entitlement_(type, yr);
    if(ent > 0){
      const ph = phone10_(found.row[m.ix.phone]);
      const all = sh.getDataRange().getValues();
      let used = 0;
      for(let i = 1; i < all.length; i++){
        if(String(all[i][m.ix.id]) === id) continue;
        if(phone10_(all[i][m.ix.phone]) !== ph) continue;
        if(String(all[i][m.ix.type]) !== type) continue;
        if(String(all[i][m.ix.status]) !== 'APPROVED') continue;
        if(Number(String(dateText_(all[i][m.ix.fromDate])).slice(0,4)) !== yr) continue;
        used += Number(all[i][m.ix.days]) || 0;
      }
      const want_ = Number(found.row[m.ix.days]) || 0;
      if(used + want_ > ent)
        return { ok:false, error:'That would exceed the year\'s ' + type + ': ' + ent +
          ' for ' + yr + ', ' + used + ' already sanctioned, ' + want_ + ' now sought.' };
    }
  }
  const when = new Date().toISOString();
  sh.getRange(found.at, m.ix.status + 1).setValue(want);
  sh.getRange(found.at, m.ix.decidedBy + 1).setValue(u.name + ' (' + u.role + ')');
  sh.getRange(found.at, m.ix.decidedAt + 1).setValue(when);
  sh.getRange(found.at, m.ix.remarks + 1).setValue(String(remarks || '').slice(0, 1000));
  return { ok:true, decidedBy:u.name + ' (' + u.role + ')', decidedAt:when };
}

/* ================== FIELD ISSUE REGISTER · 28.07.2026 ==================
   Every correction from the mandal-wise verification, encoded so it can be
   applied in one Run and audited afterwards. applyFieldFixes() is
   IDEMPOTENT — run it twice and the second run changes nothing.

   HOW IT WORKS
   - find: locates the officer's row (role+mandal for MPDO/MPO/MSO;
     the current village text for a PS).
   - setPhone: writes the correct number AND re-keys the PIN, because the
     PIN hash is bound to the phone. The fresh PIN is printed in the log —
     circulate it to that officer alone; the app forces a change on first use.
   - addRow: registers an officer who was never on the roll.
   - setGp: rewrites the village list (in-charge and split cases).
   - resetPin: fresh PIN for "wrong PIN" complaints, number unchanged.

   CONFLICTS IT WILL NOT GUESS AT (see rosterAudit): two officers reported
   the SAME phone number — 9989129501 (DPO / MSO Devaruppula) and
   9848188052 (D. Praveen Kumar / M. Srinivasa Chary). One row per number
   is the law of the app; those need a distinct number from the office. */
var FIELD_FIXES = [
  {why:'MSO Bachannapeta not registered',            find:{role:'MSO',mandal:'Bachannapeta'},                       setPhone:'9494311689'},
  {why:'MPDO Chilpur wrong number on roll',          find:{role:'MPDO',mandal:'Chilpur'},                           setPhone:'9281481681'},
  {why:'MPO Chilpur not registered',                 find:{role:'MPO',mandal:'Chilpur'},                            setPhone:'9704250523'},
  {why:'MPO Devaruppula wrong PIN',                  find:{role:'MPO',mandal:'Devaruppula'},                        setPhone:'9121983864', resetPin:true},
  {why:'MSO Devaruppula: same number and name as the DPO — one number can hold one sign-in, and his DPO sign-in already works. Row set inactive; if a separate MSO charge is truly needed, give it a distinct number and re-activate.',
                                                     find:{role:'MSO',mandal:'Devaruppula'},                        deactivate:true},
  {why:'MSO Ghanpur (Stn) not registered',           find:{role:'MSO',mandal:'Ghanpur'},                            setPhone:'9640090756'},
  {why:'MSO Jangaon not registered',                 find:{role:'MSO',mandal:'Jangaon'},                            setPhone:'9281481664'},
  {why:'MSO Raghunathpalle not registered',          find:{role:'MSO',mandal:'Raghunathpalle'},                     setPhone:'9392666444'},
  {why:'MPDO Tharigoppula wrong PIN',                find:{role:'MPDO',mandal:'Tharigoppula'},                      resetPin:true},
  {why:'PS Dharmagadda Thanda wrong number',         find:{role:'PS',gp:'Dharmagadda'},                             setPhone:'7675827928'},
  {why:'PS Dharamapuram wrong number',               find:{role:'PS',gp:'Dharamapuram'},                            setPhone:'8978394484'},
  {why:'PS Dharavath Thanda wrong number',           find:{role:'PS',gp:'Dharavath Thanda'},                        setPhone:'9398535516'},
  {why:'PS Vadlakonda not registered',               find:{role:'PS',gp:'Vadlakonda'},                              setPhone:'9391434440'},
  {why:'PS Cheetakoduru not registered',             find:{role:'PS',gp:'Cheetakoduru'},                            setPhone:'9177996299'},
  {why:'PS Venkriyala wrong PIN',                    find:{role:'PS',gp:'Venkriyala'},                              resetPin:true},
  {why:'PS Nidigonda wrong number',                  find:{role:'PS',gp:'Nidigonda'},                               setPhone:'9949406007'},
  {why:'PS Pedda Thanda (M)/Peddapahad: the office confirms 9848188052 is HIS; the roll also carries it on the Kothapalle row, which blocks his sign-in. His row claims the number; the other row is blanked and flagged for a real number.',
                                                     find:{role:'PS',gp:'Peddapahad'},                              claimPhone:'9848188052'},
  {why:'PS Samudrala never on the roll',             addRow:{phone:'9618383008',name:'K. Someshwar',role:'PS',mandal:'Ghanpur (Stn)',gp:'Samudrala'}},
  {why:'Split: Shaik Irfan keeps Pedda Thanda (Y)',  find:{role:'PS',gp:'Pedda Thanda (Y)'},                        setGp:'Pedda Thanda (Y)', claimPhone:'7794936639'},
  {why:'Split: Peddaramancherla to V. Mallesh',      addRow:{phone:'9505099032',name:'Vanguri Mallesh',role:'PS',mandal:'Jangaon',gp:'Peddaramancherla'}},
  {why:'Split: R. Pravalika keeps Akkarajupalle',    find:{role:'PS',gp:'Akkarajupalle'},                           setGp:'Akkarajupalle', setPhone:'7981397105'},
  {why:'Split: Potharam to M. Thirumal Reddy',       addRow:{phone:'9849761023',name:'M. Thirumal Reddy',role:'PS',mandal:'Tharigoppula',gp:'Potharam'}},
  {why:'In-charge: Bhagya Raju adds Lingampalli',    find:{role:'PS',gp:'Konne'},                                   setGp:'Konne, Lingampalli'},
  {why:'In-charge: A. Mahendar adds Lingampalle',    find:{role:'PS',gp:'Lingampalle',mandal:'Chilpur'},            setGp:'Malkapur, Lingampalle'},
  {why:'In-charge: B. Bhagyalaxmi holds Chilpur',    find:{role:'PS',gp:'Chilpur',mandal:'Chilpur'},                setGp:'Venkatadripeta, Chilpur', setPhone:'7780240689'},
  {why:'PS Cheeturu deputation: L. Mahesh confirmed on 7680966701', find:{role:'PS',gp:'Cheeturu'},                 setPhone:'7680966701'},
  {why:'In-charge: G. Ratna holds Chinnapendyala',   find:{role:'PS',gp:'Chinnapendyala'},                          setGp:'Sreepathipalle, Chinnapendyala'},
  {why:'In-charge: J. Rajashekar holds Ramrajupalle',find:{role:'PS',gp:'Ramrajupalle'},                            setGp:'Neermala, Ramrajupalle'},
  {why:'In-charge: D. Rambabu holds R.C. Gudem',     find:{role:'PS',gp:'Ramachandragudem',mandal:'Lingalaghanpur'},setGp:'Jeedikal, Ramachandragudem'}
];

function applyFieldFixes(){
  const t = uidx_(), sh = t.sh, v = sh.getDataRange().getValues();
  const byPhone = {}, out = [];
  for(let i = 1; i < v.length; i++){ const ph = phone10_(v[i][t.ix.phone]); if(ph && byPhone[ph] == null) byPhone[ph] = i; }
  const freshPin = ph => String(1000 + (parseInt(hash_(ph, 'seed').replace(/\D/g, '').slice(0, 6) || '0', 10) % 9000));
  const findRow = f => {
    for(let i = 1; i < v.length; i++){
      if(f.role && String(v[i][t.ix.role]).trim().toUpperCase() !== f.role) continue;
      if(f.mandal && String(v[i][t.ix.mandal]).trim().toLowerCase().indexOf(f.mandal.toLowerCase()) < 0) continue;
      if(f.gp && String(v[i][t.ix.gp]).toLowerCase().indexOf(f.gp.toLowerCase()) < 0) continue;
      return i;
    } return -1;
  };
  FIELD_FIXES.forEach(fx => {
    try{
      if(fx.addRow){
        const a = fx.addRow, ph = phone10_(a.phone);
        if(byPhone[ph] != null){ out.push('SKIP (already on the roll): ' + fx.why); return; }
        const pin = freshPin(ph), row = [];
        U_HEAD.forEach(h => {
          row.push(h === 'Phone' ? ph : h === 'Name' ? a.name : h === 'Role' ? a.role : h === 'Mandal' ? a.mandal :
                   h === 'GP' ? a.gp : h === 'Hash' ? hash_(ph, pin) : h === 'Active' ? 'TRUE' : '');
        });
        sh.appendRow(row); byPhone[ph] = v.length;
        out.push('ADDED: ' + a.name + ' (' + a.role + ', ' + a.gp + ') ' + ph + ' — PIN ' + pin + ' (change forced on first sign-in)');
        return;
      }
      const i = findRow(fx.find);
      if(i < 0){ out.push('NOT FOUND (fix by hand): ' + fx.why); return; }
      let changed = [];
      if(fx.deactivate){
        if(String(v[i][t.ix.active]).toUpperCase() !== 'FALSE'){
          v[i][t.ix.active] = 'FALSE';
          sh.getRange(i + 1, 1, 1, U_HEAD.length).setValues([v[i].slice(0, U_HEAD.length)]);
          out.push('DEACTIVATED: ' + fx.why);
        } else out.push('OK ALREADY: ' + fx.why);
        return;
      }
      if(fx.claimPhone){
        const np = phone10_(fx.claimPhone);
        const other = byPhone[np];
        if(other != null && other !== i){
          v[other][t.ix.phone] = ''; v[other][t.ix.hash] = '';
          sh.getRange(other + 1, 1, 1, U_HEAD.length).setValues([v[other].slice(0, U_HEAD.length)]);
          out.push('  released ' + np + ' from row ' + (other + 1) + ' (' + cell_(v[other], t.ix.name) + ') — that officer needs a real number before they can sign in');
        }
        const pin = freshPin(np);
        v[i][t.ix.phone] = np; v[i][t.ix.hash] = hash_(np, pin); v[i][t.ix.initpin] = '';
        byPhone[np] = i; changed.push('claimed ' + np + ', PIN ' + pin);
      }
      if(fx.setPhone){
        const np = phone10_(fx.setPhone), old = phone10_(v[i][t.ix.phone]);
        if(old === np && v[i][t.ix.hash]){ /* already right */ }
        else if(byPhone[np] != null && byPhone[np] !== i){ out.push('CONFLICT (number already used by row ' + (byPhone[np]+1) + '): ' + fx.why); return; }
        else{
          const pin = freshPin(np);
          v[i][t.ix.phone] = np; v[i][t.ix.hash] = hash_(np, pin); v[i][t.ix.initpin] = '';
          byPhone[np] = i; changed.push('phone ' + (old || '(blank)') + ' → ' + np + ', PIN ' + pin);
        }
      }
      if(fx.setGp && String(v[i][t.ix.gp]).trim() !== fx.setGp){ changed.push('villages "' + v[i][t.ix.gp] + '" → "' + fx.setGp + '"'); v[i][t.ix.gp] = fx.setGp; }
      if(fx.resetPin){
        const ph = phone10_(v[i][t.ix.phone]), pin = freshPin(ph + ':' + new Date().toDateString());
        v[i][t.ix.hash] = hash_(ph, pin); v[i][t.ix.initpin] = ''; changed.push('PIN reset → ' + pin);
      }
      if(changed.length){ sh.getRange(i + 1, 1, 1, U_HEAD.length).setValues([v[i].slice(0, U_HEAD.length)]); out.push('FIXED: ' + fx.why + ' — ' + changed.join('; ')); }
      else out.push('OK ALREADY: ' + fx.why);
    }catch(err){ out.push('ERROR on "' + fx.why + '": ' + err); }
  });
  out.push('', 'Now run rosterAudit() — two shared-number conflicts need a distinct number from the office.');
  Logger.log(out.join('\n'));
}

/* THE GHOST-ABSENT CURE. Attendance in SJGP is per OFFICER, but a roll that
   carries one officer as one-row-per-village creates a ghost: the second row
   can never mark, so its village reads absent forever. This folds every set
   of rows sharing a phone number into ONE row holding ALL the villages, and
   deactivates the rest. Run once; running again changes nothing. */
function mergeDuplicateOfficers(){
  const t = uidx_(), sh = t.sh, v = sh.getDataRange().getValues();
  const first = {}, out = [];
  for(let i = 1; i < v.length; i++){
    if(String(v[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    const ph = phone10_(v[i][t.ix.phone]); if(!ph) continue;
    if(first[ph] == null){ first[ph] = i; continue; }
    const k = first[ph];
    const gps = {};
    String(v[k][t.ix.gp] || '').split(',').concat(String(v[i][t.ix.gp] || '').split(','))
      .map(function(g){ return g.trim(); }).filter(String)
      .forEach(function(g){ gps[g] = true; });
    v[k][t.ix.gp] = Object.keys(gps).join(', ');
    if(!v[k][t.ix.hash] && v[i][t.ix.hash]) v[k][t.ix.hash] = v[i][t.ix.hash];
    v[i][t.ix.active] = 'FALSE';
    sh.getRange(k + 1, 1, 1, U_HEAD.length).setValues([v[k].slice(0, U_HEAD.length)]);
    sh.getRange(i + 1, 1, 1, U_HEAD.length).setValues([v[i].slice(0, U_HEAD.length)]);
    out.push('MERGED: ' + cell_(v[k], t.ix.name) + ' (' + ph + ') now holds "' + v[k][t.ix.gp] + '"; duplicate row ' + (i + 1) + ' deactivated.');
  }
  Logger.log(out.length ? out.join('\n') + '\n\nOne mark a day now covers every village the officer holds.' : 'No officer appears twice. Nothing to merge.');
}

/* The lint: everything on the roll that will misbehave, in one report. */
function rosterAudit(){
  const t = uidx_(), v = t.sh.getDataRange().getValues();
  const byPhone = {}, byGp = {}, out = [];
  for(let i = 1; i < v.length; i++){
    const ph = phone10_(v[i][t.ix.phone]), nm = cell_(v[i], t.ix.name), rl = cell_(v[i], t.ix.role);
    if(String(v[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    if(!ph){ out.push('BLANK PHONE row ' + (i+1) + ': ' + nm); continue; }
    if(ph.length !== 10) out.push('BAD PHONE row ' + (i+1) + ': ' + nm + ' "' + ph + '"');
    (byPhone[ph] = byPhone[ph] || []).push(nm + ' (' + rl + ', row ' + (i+1) + ')');
    if(!v[i][t.ix.hash]) out.push('NO PIN SET row ' + (i+1) + ': ' + nm + ' — this officer cannot sign in');
    String(v[i][t.ix.gp] || '').split(',').map(function(g){return g.trim();}).filter(String)
      .forEach(function(g){ (byGp[g.toLowerCase()] = byGp[g.toLowerCase()] || []).push(nm + ' (row ' + (i+1) + ')'); });
  }
  Object.keys(byPhone).forEach(function(ph){ if(byPhone[ph].length > 1)
    out.push('SHARED NUMBER ' + ph + ' — only the FIRST can ever sign in: ' + byPhone[ph].join(' | ')); });
  Object.keys(byGp).forEach(function(g){ if(byGp[g].length > 1)
    out.push('VILLAGE HELD TWICE "' + g + '": ' + byGp[g].join(' | ')); });
  Logger.log(out.length ? out.join('\n') : 'The roll is clean.');
}

/* Editor utility — THE EASY WAY TO SET THE BRIEFING KEY.
   Paste your key between the quotes, press Run once, then DELETE the key
   from this line and save. It is stored in the Sheet's own properties,
   which are private to you and never reach the public web page. */
function setBriefKey(){
  const KEY = 'PASTE-YOUR-ANTHROPIC-KEY-HERE';
  if(KEY.indexOf('PASTE') === 0){ Logger.log('Put your key in the KEY line first, then Run again.'); return; }
  PropertiesService.getScriptProperties().setProperty('ANTHROPIC_API_KEY', KEY);
  Logger.log('Briefing key stored. Now remove the key from the line above and save.');
}
/* RUN THIS ONCE to grant the script permission to reach the internet.
   Apps Script only asks for a permission when it first sees code that needs
   it, and this project was authorised before the briefing existed — hence
   "You do not have permission to call UrlFetchApp.fetch". Running this from
   the editor raises the consent screen; press Review permissions ▸ Allow.
   It then sends one real request, so the log tells you the key works too. */
function authoriseBriefing(){
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if(!key){ Logger.log('No key stored yet. Run setBriefKey() first, then run this.'); return; }
  try{
    const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method:'post', contentType:'application/json', muteHttpExceptions:true,
      headers:{ 'x-api-key':key, 'anthropic-version':'2023-06-01' },
      payload: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:20,
        messages:[{ role:'user', content:'Reply with the single word: ready' }] })
    });
    const j = JSON.parse(res.getContentText());
    if(j.error){ Logger.log('The internet permission is granted, but the key was refused: ' + j.error.message); return; }
    Logger.log('Working. The API replied: ' + (j.content||[]).map(function(x){return x.text;}).join(' ') +
               '\n\nNOW REDEPLOY: Deploy ▸ Manage deployments ▸ pencil ▸ Version: New version ▸ Deploy.');
  }catch(err){
    Logger.log('Still refused: ' + err + '\n\nOpen Project Settings ▸ tick "Show appsscript.json manifest file in editor", ' +
               'add the external_request scope shown in WHAT_TO_DO.txt, save, and run this again.');
  }
}

/* Removes whatever key is stored. Run this first if replacing the key. */
function clearBriefKey(){
  PropertiesService.getScriptProperties().deleteProperty('ANTHROPIC_API_KEY');
  Logger.log('The stored briefing key has been deleted. Run setBriefKey() to store the new one.');
}

function checkBriefKey(){
  const k = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  Logger.log(k ? ('A key is stored, ending ' + k.slice(-6) + '. The briefing button will work.')
               : 'No key stored. Run setBriefKey() after pasting your key into it.');
}

/* Editor utility: run once after this update. Counts recorded before the
   idempotency fix included network re-sends, so a row whose markedAt equals
   its firstMarkAt was only ever marked once. This resets those to 1 and
   leaves genuine re-marks alone. */
function resetRetryCounts(){
  const sh = sheet_('Attendance', A_HEAD), m = headMap_(sh, A_HEAD);
  const v = sh.getDataRange().getValues();
  let fixed = 0;
  for(let i = 1; i < v.length; i++){
    const n = Number(v[i][m.ix.markCount]) || 1;
    if(n <= 1) continue;
    const marked = String(v[i][m.ix.markedAt] || ''), first = String(v[i][m.ix.firstMarkAt] || '');
    if(marked && first && marked === first){
      sh.getRange(i + 1, m.ix.markCount + 1).setValue(1); fixed++;
    }
  }
  Logger.log(fixed + ' row(s) had a count raised only by re-sends; reset to 1.');
}

/* Editor utility: collapse duplicate attendance rows already on the sheet —
   one row per officer per day survives, carrying the count of marks. */
function dedupeAttendance(){
  const sh = sheet_('Attendance', A_HEAD), m = headMap_(sh, A_HEAD);
  const v = sh.getDataRange().getValues();
  const keep = {}, drop = [];
  for(let i = 1; i < v.length; i++){
    const k = phone10_(v[i][m.ix.phone]) + '|' + dateText_(v[i][m.ix.date]);
    if(keep[k] == null){ keep[k] = i; if(!(Number(v[i][m.ix.markCount]) >= 1)) v[i][m.ix.markCount] = 1; }
    else{
      const j = keep[k];
      v[j][m.ix.markCount] = (Number(v[j][m.ix.markCount]) || 1) + (Number(v[i][m.ix.markCount]) || 1);
      if(!v[j][m.ix.firstMarkAt]) v[j][m.ix.firstMarkAt] = v[j][m.ix.markedAt];
      if(String(v[i][m.ix.markedAt]) > String(v[j][m.ix.markedAt])){
        ['markedAt','lat','lng','accuracy','verified','photo','status','leaveId','leaveType']
          .forEach(f => { v[j][m.ix[f]] = v[i][m.ix[f]]; });
      }
      drop.push(i + 1);
    }
  }
  Object.keys(keep).forEach(k => { const i = keep[k];
    sh.getRange(i + 1, 1, 1, m.width).setValues([v[i]]); });
  drop.sort((a,b) => b - a).forEach(r => sh.deleteRow(r));
  Logger.log('Removed ' + drop.length + ' duplicate row(s); counts preserved in markCount.');
}

/* Time-driven reminder: run daily at 11:00 (Triggers ▸ Add ▸ notifyAttendanceGaps,
   time-driven, day timer, 10am–11am). Emails every defaulter who has an address on
   the roster, and sends the Collector one summary. */
function notifyAttendanceGaps(){
  const today = today_();
  const marked = {};
  const ash = sheet_('Attendance', A_HEAD), am = headMap_(ash, A_HEAD);
  ash.getDataRange().getValues().slice(1).forEach(r => {
    if(dateText_(r[am.ix.date]) === today) marked[phone10_(r[am.ix.phone])] = true; });
  const t = uidx_(), v = t.sh.getDataRange().getValues(), seen = {};
  const gaps = [];
  for(let i = 1; i < v.length; i++){
    const ph = phone10_(v[i][t.ix.phone]); if(!ph || seen[ph]) continue; seen[ph] = true;
    if(String(v[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    const role = cell_(v[i], t.ix.role);
    if(attExempt_(role) || marked[ph]) continue;
    gaps.push({name:cell_(v[i], t.ix.name), role:role, mandal:cell_(v[i], t.ix.mandal),
               phone:ph, email:String(v[i][t.ix.email] || '').trim()});
  }
  let mailed = 0;
  gaps.forEach(g => {
    if(!g.email || g.email.indexOf('@') < 0) return;
    try{
      MailApp.sendEmail(g.email, 'SJGP — attendance not marked today',
        g.name + ',\n\nYour attendance for ' + today + ' has not reached the district. ' +
        'Open the SJGP app, allow the location, take the photograph and press Mark attendance. ' +
        'If you are on sanctioned leave, the app records the day without a photograph.\n\n' +
        '— District Panchayat Office, Jangaon (automated reminder)');
      mailed++;
    }catch(err){}
  });
  const summary = gaps.map(g => g.name + ' (' + g.role + ', ' + g.mandal + ') ' + g.phone).join('\n');
  try{
    const me = Session.getEffectiveUser().getEmail();
    if(me) MailApp.sendEmail(me, 'SJGP — ' + gaps.length + ' officer(s) not marked, ' + today,
      (gaps.length ? summary : 'Every officer is accounted for.') + '\n\nReminders emailed: ' + mailed);
  }catch(err){}
  Logger.log(gaps.length + ' gap(s); ' + mailed + ' reminder email(s) sent.\n' + summary);
}

/* Editor utility: the leave account of every officer for a given year. */
function leaveLedger(year){
  const yr = Number(year) || new Date().getFullYear();
  const sh = sheet_('Leave', L_HEAD);
  const m = headMap_(sh, L_HEAD);
  const data = sh.getDataRange().getValues();
  const by = {};
  for(let i = 1; i < data.length; i++){
    const st = String(data[i][m.ix.status] || '');
    if(st !== 'APPROVED' && st !== 'PENDING') continue;
    if(Number(String(dateText_(data[i][m.ix.fromDate])).slice(0,4)) !== yr) continue;
    const who = data[i][m.ix.name] + ' (' + data[i][m.ix.role] + ', ' + data[i][m.ix.mandal] + ')';
    const type = String(data[i][m.ix.type] || '');
    by[who] = by[who] || {};
    by[who][type] = by[who][type] || {taken:0, held:0};
    by[who][type][st === 'APPROVED' ? 'taken' : 'held'] += Number(data[i][m.ix.days]) || 0;
  }
  const out = [];
  Object.keys(by).sort().forEach(who => {
    const bits = [];
    ['CL','EL','OH','ML','HQ'].forEach(t => {
      const r = by[who][t]; if(!r) return;
      const ent = entitlement_(t, yr);
      bits.push(t + ' ' + r.taken + (ent ? '/' + ent : '') + (r.held ? ' (+' + r.held + ' awaiting)' : ''));
    });
    out.push(who + ' — ' + bits.join(', '));
  });
  Logger.log(out.length ? ('Leave account ' + yr + '\n' + out.join('\n')) : 'No leave recorded for ' + yr + '.');
  return out;
}

/* Editor utility: what is waiting on the Collector. */
function leavePending(){
  const sh = sheet_('Leave', L_HEAD);
  const m = headMap_(sh, L_HEAD);
  const data = sh.getDataRange().getValues();
  const out = [];
  for(let i = 1; i < data.length; i++){
    if(String(data[i][m.ix.status] || 'PENDING') !== 'PENDING') continue;
    out.push(data[i][m.ix.name] + ' (' + data[i][m.ix.role] + ', ' + data[i][m.ix.mandal] + ') — ' +
             data[i][m.ix.type] + ' ' + dateText_(data[i][m.ix.fromDate]) + ' to ' + dateText_(data[i][m.ix.toDate]) +
             ', ' + data[i][m.ix.days] + ' day(s)');
  }
  Logger.log(out.length ? out.join('\n') : 'Nothing is waiting.');
  return out;
}

function getFolder_(parent, name){
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

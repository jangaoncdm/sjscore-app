/**********************************************************************
 * SJGP — Swachh Jangaon Gram Panchayat — district backend v6.8.4
 * Collectorate, Jangaon
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
  /* A NEW REGISTER MAKES ITS OWN, ONCE, AND NEVER AGAIN.
     Asking a person to invent one and paste it into a browser is the step most
     likely to be skipped, mistyped, or — worst — copied from the other
     register, which would make the same PIN hash identically on both. What
     Utilities generates beats anything typed, and a register that does this
     for itself can be stood up by a pipeline instead of by an evening.

     IT NEVER TOUCHES A REGISTER THAT ALREADY HAS ONE. The property is read
     first and a value found there is returned untouched, so the sanitation
     register is not affected by this in any way.

     The lock is not ceremony: two officers may sign in in the same second on
     the first morning, and two values would mean the second silently
     invalidated the first one's PIN. It is written to Script Properties and
     nowhere else — not to the Sheet, so the nightly backup still carries only
     a fingerprint of it, exactly as rule 7 of the backup requires. */
  if(!v){
    const lock = LockService.getScriptLock();
    let held = false;
    try{ lock.waitLock(20000); held = true; }catch(e){}
    try{
      const props = PropertiesService.getScriptProperties();
      v = String(props.getProperty('SALT') || '');        /* another request may have won the lock */
      if(!v){
        v = Utilities.base64Encode(Utilities.getUuid() + '|' + Utilities.getUuid() + '|' + new Date().getTime());
        props.setProperty('SALT', v);
        try{ props.setProperty('SALT_MADE_AT', new Date().toISOString()); }catch(e){}
      }
    }catch(e){ v = ''; }
    finally{ if(held) try{ lock.releaseLock(); }catch(e){} }
  }
  SALT_CACHE = v || SALT_FALLBACK;
  return SALT_CACHE;
}
const SESSION_DAYS = 30;
const MAX_PIN_TRIES = 10;
const PHOTO_FOLDER = 'SJ-SCORE Photos';
const ATT_FOLDER   = 'SJ-SCORE Attendance';

/* ---------------------------------------------------------------------------
 * GPDP — the Gram Panchayat Development Plan, called for from every officer.
 *
 * ONE AREA IN DRIVE: SJ-SCORE GPDP / <plan year> / <mandal> / the file. The
 * Collector is given the folder's own link, so the whole year can be taken
 * down in one go from Drive itself.
 *
 * A GPDP IS A DOCUMENT, NOT A DEFAULT. Nothing here feeds the reminder or
 * notice ladder, debits a day of leave, or locks an officer's app. The
 * register records who has filed and who has not, and that is all it does —
 * an obligation of this weight is created by the Collector's written order,
 * not by a developer adding a table. Say the word and it is wired in.
 * ------------------------------------------------------------------------- */
const GPDP_FOLDER = 'SJ-SCORE GPDP';
const GPDP_HEAD = ['id','year','phone','name','role','mandal','gp','fileName','mime',
                   'sizeKB','fileId','url','uploadedAt','receivedAt','status','note'];
/* Apps Script carries the whole upload in one request body, base64 inflates a
   file by a third, and these go up over rural signal. Eight megabytes is the
   line at which a Secretary can actually get one through. */
const GPDP_MAX_KB = 8 * 1024;
/* what a plan may be filed as — the district asked for PDF, Word or Excel */
const GPDP_EXT = {
  pdf:'application/pdf',
  doc:'application/msword',
  docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:'application/vnd.ms-excel',
  xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

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
/* The village filing reminder opens on this day of the REPORTING month —
   which opens on the 10th, so day 16 is the 25th of the calendar — and goes
   EVERY working day until the month closes — the Collector's direction of
   29.08.2026, asked in those words: the reminder was not going out that day.
   It had been the 16th and every third day after, so four days in six sent
   nothing and the pendency looked unwatched from the district. The first
   half of the month is still the mandals' own: move this to 1 and the
   reminder runs the whole month, and nothing else has to change. Make it a
   day of the CALENDAR again only by deciding that, never by accident. */
const FILING_REMIND_FROM = 16;
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
/* OH — the G.O.'s Optional Holidays: five a calendar year under Annexure-II,
   each a single notified date, sanctioned like any leave. Not prorated: the
   G.O. grants them for the year, whichever months the register covers. */
const LEAVE_ENTITLEMENT = {CL:15, EL:30, HQ:0, ML:0, OH:5};
/* MEDICAL LEAVE ANSWERS TO NO YEARLY FIGURE — an illness does not keep to an
   allowance, and ML is 0 above for exactly that reason, not because it is
   free. What it answers to is the spell: the Collector's order is that no
   officer takes more than fifteen days of medical leave AT A TIME. The cap is
   therefore on the spell and not on the application — fifteen days applied for
   today and fifteen more beginning the next morning is thirty days at a time,
   whatever the two rows say — so mlRun_ measures the unbroken run either side
   of the dates asked for. A longer absence is not forbidden; it is simply not
   a thing this register grants, and the officer is told to take it to the
   Collector under the leave rules. */
const ML_MAX_SPELL = 15;
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
/* THE COLLECTOR'S ORDER FOR 2026: three optional holidays, not the five of
   Annexure-II. Scoped to the year on purpose — 2027 takes the G.O.'s figure
   again by itself, and next year's order edits this pair, nothing else.
   IT REACHES FORWARD ONLY. An officer who already holds four sanctioned in
   2026 keeps all four: the check below counts what is already APPROVED and
   refuses the NEXT one. Nothing is reversed, no debit is raised and no
   sanction already passed is disturbed — an order reduces what remains, it
   does not undo what the Collector has already granted. */
const OH_REDUCED_YEAR = 2026;
const OH_REDUCED_BALANCE = 3;
/* A YEAR'S LEAVE IS THE YEAR'S. A register that opens in September does not
   grant a full year of casual leave for the three months it covers, so the
   opening year is PRO-RATED to the months the register actually runs for —
   the same arithmetic the sanitation register was opened on (adopted
   20.07.2026, counted from August, 15 x 5/12 taken as 6).
   The Gram Palana register opened on 19.09.2026, so it counts from October:
     CL  15 x 3/12 = 3.75, taken as 4
     EL  30 x 3/12 = 7.5,  taken as 8
   OPTIONAL HOLIDAYS ARE NOT PRO-RATED, on either register. The G.O. grants
   them for the year whichever months the register covers, and the Collector's
   order of 2026 reduces them to three — that order is the district's and
   applies to both. Medical leave answers to no yearly figure at all.
   The opening figures live on the tenant, so neither register can move the
   other's by accident, and 2027 takes the full year by itself on both. */
function entitlement_(type, year){
  const t = tenant_();
  const open = (t.leaveOpening && t.leaveOpening[String(year)]) || null;
  if(open && open[type] != null) return open[type];
  if(type === 'OH' && Number(year) === OH_REDUCED_YEAR) return OH_REDUCED_BALANCE;
  return (t.entitlement || LEAVE_ENTITLEMENT)[type] || 0;
}
/* ============================================================================
 * THE TENANT · ordered 18.09.2026
 * ----------------------------------------------------------------------------
 * This same file serves two registers. SJGP is the sanitation register the
 * district has run since July: 280 Panchayat Secretaries, MPOs, MSOs and
 * MPDOs, the 100-mark village evaluation, and the show-cause ladder. GP is the
 * Gram Palana register ordered on 18.09.2026: 115 Gram Palana Officers
 * across 180 revenue villages, and 19 Revenue Inspectors.
 *
 * THEY DO NOT SHARE A SPREADSHEET, AND THAT IS THE WHOLE OF THE ISOLATION.
 * Each runs as its own Apps Script project bound to its own Sheet, behind its
 * own /exec. There is no Tenant column anywhere and there must not be one: a
 * logical filter is the wrong boundary for a register that issues notices
 * under the Conduct Rules, because every read in four thousand lines would
 * have to carry it and ONE missed filter puts a Gram Palana Officer's
 * absence into a Panchayat Secretary's show-cause notice. Two spreadsheets
 * cannot leak into one another, because there is nothing between them to leak
 * through. Neither register can read the other's data even in principle — not
 * because a role check says no, but because the data is not there.
 *
 * WHICH REGISTER THIS IS, IS A SCRIPT PROPERTY, not a line in this file. The
 * same bytes deploy to both projects, so there is no build to get wrong and no
 * way for the GP file to reach the SJGP project. Set TENANT=GP once, in the
 * browser, on the GP project; anything else, including nothing at all, is
 * SJGP. That default is deliberate: a property that fails to read must land on
 * the register that already exists, never on the new one.
 * ========================================================================== */
const TENANTS = {
  SJGP: {
    key:'SJGP', name:'Swachh Jangaon Gram Panchayat', short:'SJGP',
    /* seniority, for folding a number that sits on more than one row */
    rank:{PS:1, MPO:2, MSO:3, MPDO:4, DLPO:5, DPO:6, COLLECTOR:7},
    district:['DPO','DLPO','COLLECTOR'],
    mandal:['MPDO','MSO','MPO'],
    /* the Secretary is the officer being evaluated, so he never writes */
    viewer:['PS'],
    /* not asked to mark in, so never counted as a gap: the Collector, and by
       the order of 19.08.2026 the MSOs, whose attendance is voluntary */
    attExempt:['COLLECTOR','MSO'],
    leaveApply:['MPO','PS','MPDO'],
    /* the show-cause ladder, the village evaluation and the filing schedule
       are this register's and have always run */
    sanction:true, evaluation:true, schedule:true,
    /* THE GPs TAB HAS NO COORDINATES (rule 10), so this register has nothing
       to measure a mark against and says so rather than guessing */
    placeOfDuty:false,
    /* CL 15 a year, EL 30, HQ a permission and ML on certificate. 2026 opened
       in August, so casual leave that year is five months' worth: 15 x 5/12,
       taken as 6 — the figure this register has run on since adoption. */
    entitlement:{CL:15, EL:30, HQ:0, ML:0, OH:5},
    leaveOpening:{ '2026':{ CL:6 } },
    /* the Gram Panchayat Development Plan, called for from every officer */
    gpdp:true,
    roles:['PS','MPO','MSO','MPDO','DLPO','DPO','COLLECTOR']
  },
  GP: {
    key:'GP', name:'Gram Palana Register · Jangaon', short:'GP',
    /* GPO holds the village and marks in; the Revenue Inspectors supervise a
       mandal, ARI under MRI. No role here is a viewer: a GPO is not an officer
       being evaluated, he is the officer keeping the register. */
    rank:{GPO:1, ARI:2, MRI:3, COLLECTOR:7},
    district:['COLLECTOR'],
    mandal:['MRI','ARI'],
    viewer:[],
    attExempt:['COLLECTOR'],
    leaveApply:['GPO','ARI','MRI'],
    /* THE LADDER IS BUILT AND SWITCHED OFF, by the Collector's direction of
       18.09.2026. Attendance, leave, the geo-tagged mark, the map and the
       daily report are what was asked for; no show-cause notice is proposed,
       no casual leave is debited and no app is locked. Turning this to true
       serves numbered notices to Gram Palana Officers, and that is the
       Collector's written order and not a code edit — suite 26 holds it off
       and is where the change is made first, deliberately. */
    sanction:false,
    /* the 100-mark evaluation and its filing schedule are the sanitation
       register's work and are not asked of this one */
    evaluation:false, schedule:false,
    /* AND THIS REGISTER CAN DO WHAT THE OTHER CANNOT. Every revenue village
       carries its village office on the roll, so a mark has a place of duty to be
       measured against for the first time. It MEASURES AND IT ACCUSES NOBODY
       (rule 10): the distance is printed and the mark stands. */
    placeOfDuty:true,
    /* THE SAME YEARLY FIGURES, PRO-RATED TO WHAT IS LEFT OF THE YEAR. This
       register opened on 19.09.2026 and so counts from October — three months
       of twelve. CL 15 x 3/12 = 3.75 taken as 4; EL 30 x 3/12 = 7.5 taken as
       8. Optional holidays are not pro-rated on either register: the G.O.
       grants them for the year, and the Collector's order reduces 2026 to
       three. 2027 takes the full year by itself. */
    entitlement:{CL:15, EL:30, HQ:0, ML:0, OH:5},
    leaveOpening:{ '2026':{ CL:4, EL:8 } },
    /* NO DEVELOPMENT PLAN. It was not asked of this register, and a register
       that calls for a document nobody wants teaches its officers to ignore
       what it asks for. */
    gpdp:false,
    roles:['GPO','ARI','MRI','COLLECTOR']
  }
};
let TENANT_CACHE = null;
function tenant_(){
  if(TENANT_CACHE) return TENANT_CACHE;
  let v = '';
  try{ v = String(PropertiesService.getScriptProperties().getProperty('TENANT') || '').toUpperCase().trim(); }catch(e){}
  /* OR THE REGISTER'S OWN SPREADSHEET SAYS SO.
     A Script Property must be typed in by a person, in a browser, on the day
     the register is created — and a register that cannot be stood up without
     somebody typing one word cannot be stood up by a pipeline at all. The
     bound spreadsheet IS the register: a Config tab carries what it is, it
     travels with the data it describes, and it cannot reach the other project
     because it is not in the other project's spreadsheet.

     THE PROPERTY STILL WINS wherever it is set, so nothing already standing
     moves. And a tab that cannot be read, or that names something which is not
     a register, is still SJGP — the default a failure has to land on. */
  /* OR A FILE THAT EXISTS ONLY IN THAT PROJECT.
     The provisioning pipeline writes one line into the project it creates:
     `var TENANT_OVERLAY = 'GP';`. It is generated into a build directory, not
     into backend/, and the sanitation register's deploy job pushes backend/
     and nothing else — so it CANNOT reach the other project. That is the whole
     of why this is safe to read here. It is checked before the Sheet only
     because it is cheaper; the property still outranks both. */
  let fromOverlay = false;
  if(!TENANTS[v]){
    try{
      if(typeof TENANT_OVERLAY !== 'undefined'){
        v = String(TENANT_OVERLAY || '').toUpperCase().trim();
        fromOverlay = !!TENANTS[v];
      }
    }catch(e){}
  }
  if(!TENANTS[v]){
    try{
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sh = ss && ss.getSheetByName('Config');
      if(sh && sh.getLastRow() > 0){
        const rows = sh.getRange(1, 1, sh.getLastRow(), Math.max(2, sh.getLastColumn())).getValues();
        for(let i = 0; i < rows.length; i++){
          if(String(rows[i][0] || '').trim().toUpperCase() !== 'TENANT') continue;
          v = String(rows[i][1] || '').trim().toUpperCase();
          break;
        }
      }
    }catch(e){}
  }
  /* ANYTHING UNREADABLE IS THE REGISTER THAT ALREADY EXISTS. A property that
     cannot be read must not silently turn the sanitation register into
     something else. */
  TENANT_CACHE = TENANTS[v] || TENANTS.SJGP;
  /* AND A REGISTER WRITES DOWN WHAT IT IS, THE FIRST TIME IT IS TOLD.
     The overlay is a FILE, and `clasp push --force` deletes remote files that
     are not present locally — so one routine deploy that forgot to assemble it
     took the Gram Palana register's identity away and it reverted to
     reporting itself as the sanitation one, which would have switched the
     show-cause ladder on for officers who are expressly not under it.

     A file can be pushed away; the spreadsheet is the register. So the moment
     the overlay tells this project what it is, it is recorded on the bound
     Sheet's Config tab, where every later deploy will find it whatever happens
     to the code. Written once and never again — if a Config row already says
     something, that row is what was read above and nothing is touched here.

     Best effort, and silent if it cannot: this runs on the read path of every
     request, and a register that refuses to answer because it could not write
     a note to itself would be a far worse failure than the one it prevents. */
  if(fromOverlay){
    try{
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      if(ss && !ss.getSheetByName('Config')){
        const sh = ss.insertSheet('Config');
        sh.appendRow(['Key', 'Value']);
        sh.appendRow(['TENANT', TENANT_CACHE.key]);
        sh.appendRow(['RECORDED_AT', new Date().toISOString()]);
      }
    }catch(e){}
  }
  return TENANT_CACHE;
}
const isGP_ = () => tenant_().key === 'GP';
/* seniority, for folding a number that sits on more than one row, and for the
   roll the console offers. Was a const; it is the register's now. */
const rank_ = () => tenant_().rank;
/* THE VILLAGE ROLL, AND WHAT IT CARRIES.
   SJGP's GPs tab is Mandal, GP and nothing else — that is the whole reason
   rule 10 exists: the register had nothing to measure a mark against, so it
   measured nothing and said so. The GP register's roll carries the village office
   of every revenue village, so it CAN measure. The two extra columns are
   written only on the register that has them; SJGP's tab is not touched. */
const GPS_HEAD = () => tenant_().placeOfDuty ? ['Mandal','GP','Lat','Lng'] : ['Mandal','GP'];

/* Leave is applied for by these, and sanctioned by the Collector alone. */
const canApplyLeave_   = r => tenant_().leaveApply.indexOf(String(r || '').toUpperCase()) >= 0;
const canApproveLeave_ = r => r === 'COLLECTOR';
const attExempt_ = r => tenant_().attExempt.indexOf(String(r || '').toUpperCase()) >= 0;
const U_HEAD = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'];
/* Kept as a name because thirty rules and both Admin files read it; the values
   now come from whichever register this is. */
const LEAVE_APPLY = TENANTS.SJGP.leaveApply;

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

/* Two helpers that do arithmetic on a DATE and never on a moment. Both parse
   as UTC on purpose: these strings are calendar days, and letting the script's
   timezone near one is how nine of thirty holidays landed on the wrong date.
   Both ends of a span are counted, because leave is taken in whole days. */
function spanDays_(from, to){
  const a = Date.parse(String(from) + 'T00:00:00Z'), b = Date.parse(String(to) + 'T00:00:00Z');
  if(isNaN(a) || isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}
function dayAfter_(d){
  const t = Date.parse(String(d) + 'T00:00:00Z');
  return isNaN(t) ? String(d) : new Date(t + 86400000).toISOString().slice(0, 10);
}

/* ---- THE REPORTING MONTH ------------------------------------------------
   The month a village evaluation is filed FOR is not the calendar month. A
   month's returns cannot be complete before the month itself is over — the
   last week's inspections are still being written when the 1st comes round —
   so by the Collector's direction the reporting month runs from the 10th to
   the 9th and carries the name of the month it OPENS in. August 2026 is
   10.08.2026 to 09.09.2026, and a village evaluated on 3 September is filed
   against August.

   The first one is short at the top and not at the bottom: the district
   adopted the register on 20.07.2026, so July 2026 opens on the 20th,
   because there was nothing to file into before that date.

   THIS IS THE FILING MONTH AND NOTHING ELSE. Attendance, its misses, its
   reminders and the show-cause ladder are counted over the CALENDAR month
   and stay there — a served notice recites the officer's third unmarked
   working day "of the calendar month" under Rule 3 of the Conduct Rules, and
   a register does not re-cut a rule it did not make. Nothing below is read
   by monthMarks_, activeDaysUpto_, workingDaysUpto_ or the notice engine. */
const CYCLE_DAY   = 10;            /* the reporting month opens on the 10th */
const CYCLE_FIRST = '2026-07-20';  /* adopted mid-month; July 2026 opens here */

/* The reporting month a date falls in. '' for a date before the register
   existed, because a filing dated before adoption is a mistyped date and not
   a month — the caller says what to do about it rather than being handed a
   month that never opened. */
function cycleYm_(dStr){
  const s = dateText_(dStr);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s) || s < CYCLE_FIRST) return '';
  let y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7));
  if(Number(s.slice(8, 10)) < CYCLE_DAY){ m--; if(m < 1){ m = 12; y--; } }
  return y + '-' + ('0' + m).slice(-2);
}
/* the first and the last day of a reporting month, both inclusive */
function cycleFrom_(ym){
  const y = ymText_(ym);
  return y === CYCLE_FIRST.slice(0, 7) ? CYCLE_FIRST : y + '-' + ('0' + CYCLE_DAY).slice(-2);
}
function cycleTo_(ym){
  const y = ymText_(ym);
  let yy = Number(y.slice(0, 4)), mm = Number(y.slice(5, 7)) + 1;
  if(mm > 12){ mm = 1; yy++; }
  const nxt = yy + '-' + ('0' + mm).slice(-2) + '-' + ('0' + CYCLE_DAY).slice(-2);
  const t = Date.parse(nxt + 'T00:00:00Z');
  return isNaN(t) ? y : new Date(t - 86400000).toISOString().slice(0, 10);
}
/* WHICH MONTH A FILING BELONGS TO IS THE DISTRICT'S TO DECIDE, NOT THE
   HANDSET'S (rule 6), AND IT IS DECIDED THE SAME WAY ON THE WAY IN AND ON THE
   WAY OUT. The month is derived from the DATE OF THE VISIT, which is the fact
   on the record and the officer's own entry; what the phone sent stands only
   when there is no readable date, because a blank month is a row no view finds.

   THIS IS READ AS WELL AS WRITTEN, and the first cut of this change was wrong
   for exactly that reason. Only the write path derived the month, so a village
   evaluated on 3 September still carried the label "2026-09" that the old rule
   had stamped on it, every count still matched on that stored label, and the
   August figure on the console did not move by a single village — the month
   had been widened to 10 Aug – 9 Sept and the console went on reporting the
   calendar month's worth. Reported from the district in those words: the
   villages evaluated for August should have gone UP. A stored label is a
   record of what some handset once believed; the date of the visit is the
   fact, and the fact is what the register counts. The Admin re-stamp now
   tidies the labels away rather than being the thing that makes them true. */
function fileYm_(r){
  return cycleYm_(r && r.date) || ymText_(r && r.ym);
}
/* the same, off a raw Inspections row and its header map */
function rowYm_(row, ix){
  return fileYm_({ date: row[ix.date], ym: row[ix.ym] });
}
/* Which day of its OWN reporting month a date is — 1 on the day it opens.
   The filing reminder counts in these and no longer in days of the calendar:
   the 16th of a calendar month is day 7 of a month that opened on the 10th,
   and the first half the mandals are left to themselves would have been cut
   to six days without anybody deciding it. */
function cycleDay_(dStr){
  const ym = cycleYm_(dStr);
  return ym ? spanDays_(cycleFrom_(ym), dateText_(dStr)) : 0;
}

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
    if((rank_()[role] || 0) > (rank_()[cell_(best.v, t.ix.role).toUpperCase()] || 0)) best = x;
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
/* WHAT A ROLE MAY DO IS THE REGISTER'S TO SAY, not this file's. In SJGP the
   district is the DPO, the DLPO and the Collector and the Secretary is a
   viewer; in GP the Revenue Inspectors hold the mandal and nobody is a viewer,
   because a Gram Palana Officer is not an officer being evaluated — he is
   the officer keeping the register. */
const districtRole_ = r => tenant_().district.indexOf(String(r || '').toUpperCase()) >= 0;
const mandalRole_   = r => tenant_().mandal.indexOf(String(r || '').toUpperCase()) >= 0;
const viewerRole_   = r => tenant_().viewer.indexOf(String(r || '').toUpperCase()) >= 0;

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
/* WHERE A MARK CANNOT BE TRUSTED AS PROOF OF PRESENCE. One rule, stated once,
   so the evening mail and the console cannot quote different figures for the
   same day — which they did: the console counted the twelve MSOs among the
   officers due while the mail, correctly, did not, and the same morning read
   "91 of 114" on screen and "91 of 102" on paper.
   A reading fails if it falls outside the district's box, if it is an area
   rather than a place, or if the handset says it is in another timezone. */
const FIX_BOX_ = { latMin:16.4, latMax:19.2, lngMin:77.6, lngMax:80.9 };
const FIX_ACC_LIMIT_ = 250;
/* WHETHER A MARK CARRIES A LOCATION AT ALL — and note what this does NOT say:
   it says the handset returned a fix precise to within FIX_ACC_LIMIT_ metres,
   never that the officer was at his place of duty. saveAttendance_ writes the
   WORD 'TRUE'; the Sheet coerces it to a boolean, so the console's read matched
   by luck. A text-formatted column would have left it a string and shown every
   mark in the district as unverified. Read either spelling, in one place. */
function markVerified_(v){
  return v === true || String(v).trim().toUpperCase() === 'TRUE';
}
function suspectMark_(lat, lng, acc, tz){
  if(lat != null && lat !== '' && (Number(lat) < FIX_BOX_.latMin || Number(lat) > FIX_BOX_.latMax ||
     Number(lng) < FIX_BOX_.lngMin || Number(lng) > FIX_BOX_.lngMax)) return true;
  if(acc && Number(acc) > FIX_ACC_LIMIT_) return true;
  if(tz && !/Calcutta|Kolkata/i.test(String(tz))) return true;
  return false;
}
/* HOW FAR A MARK WAS MADE FROM THE OFFICER'S OWN MANDAL.
   `verified` on a mark has never meant "he was at his place of duty". It means
   only that the handset returned a fix and that the fix was precise — accurate
   to within FIX_ACC_LIMIT_ metres. A phone standing 70 km away with a clear
   view of the sky returns a BETTER reading than one inside the panchayat
   office, and the console printed the word "verified" against it. Asked from
   the district in those words: how is the app taking attendance for people who
   are 50 or 70 km away.

   It was not checking, because there was nothing to check against — the GPs
   tab carries `Mandal` and `GP` and no coordinates, so the register does not
   know where Devaruppula is. The district's own marks do. The MEDIAN of a
   mandal's located marks is a point inside that mandal, and a median is used
   rather than a mean on purpose: a mean is dragged towards the very marks this
   is meant to find, so a fortnight of marking from the city would quietly move
   the mandal to the city and the distance would read as nothing.

   THIS ACCUSES NOBODY. The figure is shown to the Collector and goes no
   further: it raises no reminder, no notice, no debit and no lock, and a
   distant mark is still a mark. An officer may be at a mandal meeting, at the
   Collectorate, on tour, or escorting a case — the register cannot know which,
   and a table must not decide it. Whether a distance is a default is read by
   the Collector on the facts, under the Conduct Rules, as it always was. */
const FAR_MARK_KM_ = 15;   /* no mandal in the district is anywhere near this wide */
function median_(xs){
  const a = xs.slice().sort((x, y) => x - y), n = a.length;
  if(!n) return null;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}
/* the distance between two readings, on a sphere. Good to a few metres over
   the tens of kilometres this is ever asked about. */
function distKm_(aLat, aLng, bLat, bLng){
  if(!aLat || !aLng || !bLat || !bLng) return null;
  const R = 6371, rad = Math.PI / 180;
  const dLa = (bLat - aLat) * rad, dLn = (bLng - aLng) * rad;
  const h = Math.sin(dLa / 2) * Math.sin(dLa / 2) +
            Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLn / 2) * Math.sin(dLn / 2);
  return +(2 * R * Math.asin(Math.min(1, Math.sqrt(h)))).toFixed(1);
}
/* where each mandal sits, by the median of its own marks. Marks outside the
   district's box are left out — a handset reporting itself in another state
   must not move a mandal, the same rule the weather map is drawn under. */
function mandalCentres_(rows){
  const agg = {};
  (rows || []).forEach(r => {
    const md = String(r.mandal || '').trim(); if(!md) return;
    const la = Number(r.lat), ln = Number(r.lng);
    if(!la || !ln) return;
    if(la < FIX_BOX_.latMin || la > FIX_BOX_.latMax ||
       ln < FIX_BOX_.lngMin || ln > FIX_BOX_.lngMax) return;
    agg[md] = agg[md] || { la:[], ln:[] };
    agg[md].la.push(la); agg[md].ln.push(ln);
  });
  const out = {};
  Object.keys(agg).forEach(k => {
    /* ONE MARK IS NOT A MANDAL. A single reading cannot say where a mandal is,
       and measuring a mark against itself always reads nought. */
    if(agg[k].la.length < 3) return;
    out[k] = { lat: median_(agg[k].la), lng: median_(agg[k].ln), n: agg[k].la.length };
  });
  return out;
}

/* the day's marks with enough detail to judge them — the district's reading of
   when each was made (rule 1), never the handset's unchecked claim */
function markedDetail_(dStr){
  const sh = sheet_('Attendance', A_HEAD), m = headMap_(sh, A_HEAD);
  const last = sh.getLastRow(); if(last < 2) return {};
  const start = Math.max(2, last - 4000);
  const v = sh.getRange(start, 1, last - start + 1, sh.getLastColumn()).getValues();
  const out = {};
  v.forEach(r => {
    if(dateText_(r[m.ix.date]) !== dStr) return;
    const p = phone10_(r[m.ix.phone]); if(!p) return;
    if(String(r[m.ix.status] || 'PRESENT') === 'LEAVE') return;
    out[p] = {
      at: effMarkAt_(String(r[m.ix.markedAt] || ''), String(r[m.ix.receivedAt] || '')),
      suspect: suspectMark_(r[m.ix.lat], r[m.ix.lng], r[m.ix.accuracy], r[m.ix.timezone])
    };
  });
  return out;
}
/* How many of the day's marks were in before the 10:00 cutoff.
   ONLY the officers passed in are counted. An MSO may mark and his mark is
   recorded, but he is not among the officers due, and letting his mark into
   this figure made a district of two look like a district of three. */
function markedBy10_(detail, phones){
  return (phones || Object.keys(detail)).filter(p => {
    const at = detail[p] && detail[p].at; if(!at) return false;
    const d = new Date(at); if(isNaN(d)) return false;
    /* HH, not H: the hour is read in the DISTRICT's timezone, never the
       runtime's, and the two-digit pattern is the one both Apps Script and
       the suites' clock agree on. */
    return Number(Utilities.formatDate(d, Session.getScriptTimeZone(), 'HH')) < 10;
  }).length;
}
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
    /* the value is the leave TYPE — still truthy for every caller that
       only asks "is he covered?", and the daily report can name it */
    if(f && t && f <= dStr && dStr <= t){ const p = phone10_(v[i][m.ix.phone]); if(p) set[p] = String(v[i][m.ix.type] || 'CL'); }
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
  /* A REMINDER SAYS WHAT IS MISSING AND NOTHING ELSE. By the Collector's
     direction (28.08.2026) it no longer counts his misses at him, names the
     show-cause notice, or mentions casual leave. Those belong to the NOTICE,
     which is signed, numbered and served under the Collector's own hand — a
     reminder is not the place to rehearse a sanction that has not arisen and
     may never arise. The occasion is still kept: the Reminders tab carries it
     in its own column, and the ladder still counts from the attendance record.
     It is simply no longer read out to the officer. */
  return 'Attendance not marked';
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
  /* A REGISTER WITHOUT SANCTION PROPOSES NOTHING. The GP register records
     attendance, leave and the geo-tagged mark and reports them; by the
     Collector's direction of 18.09.2026 it raises no show-cause notice and
     debits no casual leave. The trigger may be installed and may fire; it
     stops here, so turning the register on later is one constant and not a
     re-wiring. Suite 26 holds it off. */
  if(!tenant_().sanction){ Logger.log('This register carries no sanction — no notice is proposed.'); return; }
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
                ':00 AM every working day, from the place of duty. Please mark it.'
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
  const counted = {};
  for(let i = 1; i < v.length; i++){
    if(phone10_(v[i][m.ix.phone]) !== phone) continue;
    if(String(v[i][m.ix.type]) !== 'CL') continue;
    if(String(v[i][m.ix.status]) !== 'APPROVED') continue;
    if(Number(String(dateText_(v[i][m.ix.fromDate])).slice(0,4)) !== yr) continue;
    /* ONE SPELL, ONE DEBIT. A duplicated row is not a second absence, and
       this figure is what exhausts a year's casual leave and turns the next
       debit into loss of pay. It must not be paid twice. */
    const id = String(v[i][m.ix.id] || '').trim();
    if(id && counted[id]) continue;
    if(id) counted[id] = true;
    used += Number(v[i][m.ix.days]) || 0;
  }
  return used;
}
/* The settlement. It runs the NEXT morning and judges the day that has
   CLOSED — never the running one — so every late sync, every phone that
   found signal at nine at night, is counted before a rupee moves. Pass a
   date to settle a particular day by hand. */
function settleAbsenceDebits(dateOpt){
  if(!tenant_().sanction){ Logger.log('This register carries no sanction — nothing is settled.'); return; }
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
     villageFilingReminders ~10:00 — from FILING_REMIND_FROM (the 16th) and
       then EVERY working day of the month, each officer whose village stands
       unevaluated is told: the MSO and the MPDO for ACTION, the Panchayat
       Secretary for INFORMATION (the Secretary cannot file). One consolidated
       message per officer — in the app as a reminder row, and by mail. Never
       a notice, never a debit: filing discipline is the mandal chain's to
       manage. One reminder per officer per day: the day's rows are read
       first, so a re-fired trigger reminds nobody twice.
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
/* the mail wears the console's palette: cool paper, one mild accent per
   section — indigo, teal, violet, amber, rose — never loud, never dark */
function emailSec_(head, bodyHtml, fg, tint){
  fg = fg || '#57647D'; tint = tint || '#E7E5F9';
  return '<div style="margin-top:16px"><div style="font-size:11px;font-weight:700;letter-spacing:.09em;color:' + fg + ';text-transform:uppercase;border-bottom:2px solid ' + tint + ';padding-bottom:5px">' + head + '</div>' +
    '<div style="font-size:13.5px;color:#1A2437;line-height:1.65;margin-top:8px">' + bodyHtml + '</div></div>';
}
function emailTable_(heads, rows, tint){
  return '<table style="border-collapse:collapse;width:100%;font-size:12.5px;margin-top:4px">' +
    '<tr>' + heads.map(h => '<th style="text-align:left;padding:6px 8px;background:' + (tint || '#F3F5FA') + ';border:1px solid #E7EAF2;color:#46536B;font-size:11px;text-transform:uppercase;letter-spacing:.05em">' + h + '</th>').join('') + '</tr>' +
    rows.map(r => '<tr>' + r.map(c => '<td style="padding:6px 8px;border:1px solid #EDF0F6">' + c + '</td>').join('') + '</tr>').join('') + '</table>';
}
/* The dashboard panel, in a mail. Everything below is built of tables and
   inline styles only — mail clients run no script, load no sheet, and the
   Word engine in Outlook ignores widths on a div, so the bars are tables.
   Big number, green/amber/red by threshold — but on cool paper with mild
   tints, the console's own light multi-accent idiom, by order of 22.08. */
var EMAIL_TONES_ = {
  good:  { fg: '#15803D', bg: '#EAF7EF', bd: '#CDE9D8' },
  warn:  { fg: '#B45309', bg: '#FFF7E8', bd: '#F1E2C2' },
  bad:   { fg: '#B91C1C', bg: '#FDF0EF', bd: '#F4D6D3' },
  info:  { fg: '#1D4ED8', bg: '#EEF4FE', bd: '#D6E3F8' },
  accent:{ fg: '#6D28D9', bg: '#F4F1FD', bd: '#E2DAF6' }
};
function emailPanel_(title, inner, accent){
  return '<div style="background:#FAFBFE;border:1px solid #E4E8F2;border-radius:8px;padding:12px 12px 10px;margin-top:14px">' +
    (title ? '<div style="font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:' + (accent || '#4A40CE') + ';padding:0 2px 8px">' + title + '</div>' : '') +
    inner + '</div>';
}
function emailStats_(tiles){
  const cell = t => {
    const tone = EMAIL_TONES_[t.tone] || EMAIL_TONES_.info;
    return '<td style="background:' + tone.bg + ';border:1px solid ' + tone.bd + ';border-radius:6px;padding:12px 6px 10px;text-align:center;width:33%">' +
      '<div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#57647D">' + t.label + '</div>' +
      '<div style="font-size:30px;font-weight:800;line-height:1.2;color:' + tone.fg + '">' + t.value + '</div>' +
      (t.sub ? '<div style="font-size:11px;color:#7A8496">' + t.sub + '</div>' : '') +
    '</td>'; };
  let h = '<table cellspacing="5" cellpadding="0" style="width:100%;border-collapse:separate">';
  for(let i = 0; i < tiles.length; i += 3) h += '<tr>' + tiles.slice(i, i + 3).map(cell).join('') + '</tr>';
  return h + '</table>';
}
function emailBar_(pct, color){
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return '<table cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse"><tr>' +
    (p > 0 ? '<td width="' + p + '%" bgcolor="' + color + '" style="height:13px;font-size:1px;line-height:1px;border-radius:3px">&nbsp;</td>' : '') +
    (p < 100 ? '<td width="' + (100 - p) + '%" bgcolor="#E8EBF3" style="height:13px;font-size:1px;line-height:1px">&nbsp;</td>' : '') +
    '</tr></table>';
}
/* one bar per mandal against the day marker: a mandal level with the grey
   TODAY bar is on pace, behind it is behind */
function emailGantt_(rows, wdGone, wdAll){
  const todayPct = wdAll ? 100 * wdGone / wdAll : 0;
  const line = (label, bar, right, labelColor) =>
    '<tr><td style="width:104px;font-size:11.5px;color:' + (labelColor || '#33415C') + ';padding:3px 8px 3px 2px;white-space:nowrap">' + label + '</td>' +
    '<td style="padding:3px 0">' + bar + '</td>' +
    '<td style="width:74px;font-size:11px;color:#7A8496;padding:3px 2px 3px 8px;text-align:right;white-space:nowrap">' + right + '</td></tr>';
  let h = '<table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse">';
  h += line('TODAY', emailBar_(todayPct, '#9AA4B8'), 'wd ' + wdGone + ' of ' + wdAll, '#7A8496');
  rows.forEach(r => {
    const pct = r.total ? 100 * r.done / r.total : 0;
    const color = pct >= 100 || pct >= todayPct ? '#2F9E68' : pct >= todayPct - 12 ? '#E39A2D' : '#DE5A5A';
    h += line(r.label, emailBar_(pct, color), r.done + ' / ' + r.total);
  });
  return h + '</table>' +
    '<div style="font-size:10.5px;color:#7A8496;padding:7px 2px 0">A mandal level with the grey bar is on pace; ' +
    '<span style="color:#E39A2D">amber</span> is slipping, <span style="color:#DE5A5A">red</span> is well behind.</div>';
}
/* the GPs master, read by its own headers — the tab has been created with
   the columns both ways round over the versions, so the header decides */
function gpRoll_(){
  const sh = sheet_('GPs', GPS_HEAD());
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
/* ----------------------------------------------------------------------------
 * THE PLACE OF DUTY.
 *
 * Every revenue village on the GP register carries its village office on the roll,
 * so for the first time a mark has something to be measured against. Read by
 * header, like every other column on this register, and empty where the roll
 * has nothing — a village with no coordinate yields no distance rather than a
 * distance from nowhere.
 *
 * A COORDINATE THAT CANNOT BE BELIEVED IS NOT A COORDINATE. Two of the 180
 * rows the district supplied on 18.09.2026 were plainly wrong — one longitude
 * of 7852556, one with the latitude copied into the longitude column — and a
 * distance computed off either would have been a five-hundred-kilometre
 * accusation against an officer sitting in his own office. Anything outside
 * the district's box is dropped here and reported by the Admin audit instead.
 * ------------------------------------------------------------------------- */
function gpPlaces_(){
  const sh = sheet_('GPs', GPS_HEAD());
  const v = sh.getDataRange().getValues();
  if(v.length < 2) return {};
  const head = v[0].map(h => String(h).toLowerCase().trim());
  let mi = -1, gi = -1, la = -1, ln = -1;
  head.forEach((h, i) => {
    if(h.indexOf('mandal') >= 0) mi = i;
    else if(h === 'gp' || h.indexOf('village') >= 0 || h.indexOf('panchayat') >= 0) gi = i;
    else if(h.indexOf('lat') >= 0) la = i;
    else if(h.indexOf('lng') >= 0 || h.indexOf('lon') >= 0) ln = i;
  });
  if(mi < 0 || gi < 0){ mi = 0; gi = 1; }
  const out = {};
  if(la < 0 || ln < 0) return out;
  for(let i = 1; i < v.length; i++){
    const m2 = String(v[i][mi] || '').trim(), g = String(v[i][gi] || '').trim();
    if(!m2 || !g) continue;
    const y = Number(v[i][la]), x = Number(v[i][ln]);
    if(!isFinite(y) || !isFinite(x)) continue;
    if(!(y > 16.4 && y < 19.2 && x > 77.6 && x < 80.9)) continue;   /* not believable */
    const k = m2.toLowerCase() + '|' + g.toLowerCase();
    if(!out[k]) out[k] = { lat:y, lng:x, mandal:m2, gp:g };
  }
  return out;
}

/* HOW FAR A MARK WAS MADE FROM THE OFFICER'S OWN OFFICE.
   An officer may hold four villages — 54 of the 115 hold more than one — and
   he is at his place of duty at ANY of them, so the distance is to the NEAREST
   of his own offices. Anything else would call a man absent for standing in
   the second village he is in charge of.

   IT ACCUSES NOBODY (rule 10). No reminder, no notice, no debit, no lock, and
   the mark stands. He may be at a mandal meeting, at the Collectorate or on
   tour; the register cannot know which and a table must not decide it. */
function dutyDistance_(places, gpsOfOfficer, lat, lng){
  if(!places || !gpsOfOfficer || !gpsOfOfficer.length) return null;
  if(!(lat && lng)) return null;
  let best = null;
  gpsOfOfficer.forEach(g => {
    const pt = places[g];
    if(!pt) return;
    const d = distKm_(lat, lng, pt.lat, pt.lng);
    if(best === null || d < best.km) best = { km:d, gp:pt.gp, mandal:pt.mandal };
  });
  return best;
}

function unfiledVillages_(ym){
  const filed = {};
  const ish = sheet_('Inspections', HEADERS), im = headMap_(ish, HEADERS);
  const iv = ish.getDataRange().getValues();
  for(let i = 1; i < iv.length; i++){
    if(rowYm_(iv[i], im.ix) !== ym) continue;
    filed[String(iv[i][im.ix.mandal]).trim().toLowerCase() + '|' + String(iv[i][im.ix.gp]).trim().toLowerCase()] = true;
  }
  return gpRoll_().filter(r => !filed[r.mandal.toLowerCase() + '|' + r.gp.toLowerCase()]);
}
/* Working days of the REPORTING month around a date — Sundays and the
   Holidays tab out, as everywhere else on this register. The window is the
   10th to the 9th, so this walks the dates between two ends and no longer
   the days 1..last of a calendar month: a reporting month straddles two of
   those, and the old loop would have counted the wrong half of each and told
   the district it had a fortnight left when the month closed on Tuesday. */
function monthWd_(dStr){
  const today = dateText_(dStr), ym = cycleYm_(today);
  if(!ym) return { gone: 1, left: 0, total: 1 };
  const hs = holidaySet_(), to = cycleTo_(ym);
  let gone = 0, left = 0;
  for(let k = cycleFrom_(ym); k <= to; k = dayAfter_(k)){
    if(new Date(k + 'T00:00:00').getDay() === 0 || hs[k]) continue;
    if(k <= today) gone++; else left++;
  }
  return { gone: Math.max(1, gone), left: left, total: gone + left };
}
function villageFilingReminders(){
  const today = today_();
  const d = cycleDay_(today);
  if(!d){ Logger.log('Before the register opened on ' + CYCLE_FIRST + ' — there is no month to file into.'); return; }
  if(d < FILING_REMIND_FROM){ Logger.log('Day ' + d + ' of the reporting month — the mandals have the first half to themselves.'); return; }
  /* EVERY working day from here, by the Collector's direction of 29.08.2026.
     Working days only: Sundays and the Holidays tab are off for this as for
     everything else on the register, and a filing reminder on a declared
     holiday asks for work the district is not sitting for. */
  if(!isWorkingDay_(today)){ Logger.log('Off day — no reminders.'); return; }
  const ym = cycleYm_(today);
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
  /* WHO IS ALREADY BEING CHASED BY NAME. From 17.09.2026 an officer under the
     filing schedule gets his own mail, listing his own villages against his
     own days, an hour before this one runs. He is left out here: two mails a
     morning about the same villages is how a district learns to read neither.
     The MSO and the Panchayat Secretary are not on the schedule by the order
     and keep the reminder they have always had. */
  const onSchedule = schScheduled_(ym);

  const recip = {};   /* phone -> {off, action, villages[]} */
  const addTo = (off, action, village) => {
    if(!off || onSchedule[off.phone]) return;
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
/* ============================================================================
 * THE FILING SCHEDULE · ordered 17.09.2026
 * ----------------------------------------------------------------------------
 * Asked for from the district in these words: there is huge delay in filing
 * the village, so schedule the pending villages over the days that remain and
 * put each officer's own list in front of him when he opens the app.
 *
 * THE ORDER, AS PASSED (19.09.2026). The pendency of a mandal is split inside
 * that mandal, by share: MPDO 40 · MPO 40 · MSO 10 · the district officer 10.
 * And which district officer is a question of SUBDIVISION and not of who has
 * room left — the DLPO takes his ten per cent in the five mandals of the
 * Station Ghanpur subdivision (Chilpur, Ghanpur (Stn), Zaffergadh, Palakurthy,
 * Kodakandla) and the DPO takes his in the other seven.
 *
 * NOTHING TO THE PANCHAYAT SECRETARY — he holds the village but he may not
 * file its evaluation, and a schedule that called him for one would be asking
 * for work the server refuses at the door (see the viewer guard in doPost). He
 * is left out here rather than listed and then turned away. The MSO is in this
 * order, having been left out of the last one; he is not a viewer, so the
 * server takes his filing.
 *
 * ONE VILLAGE, ONE OFFICER. This is what the shares changed besides the
 * arithmetic. Under the order of 17.09.2026 the MPO and the MPDO were both
 * named against every village and either could file it, so one village raised
 * two rows and every district figure had to count villages rather than rows.
 * Forty per cent to one man and forty to another is not that: each village now
 * has ONE officer answerable for it. The rule that district figures count
 * villages stands anyway (rule 9) — it costs nothing and it is what stopped
 * filed-plus-pending overshooting the district once already.
 *
 * THE SHARES ALWAYS ADD UP. Forty per cent of 23 villages is 9.2, and four
 * shares rounded on their own come to 22 or 24 — a village lost, or one dealt
 * twice. schApportion_ takes the whole numbers first and gives what is left to
 * the largest remainders, so the parts sum to exactly the pendency. Ties break
 * by the order the shares are named in, so the same roll always deals the same
 * way and a re-publish is never a reshuffle.
 *
 * A SHARE WITH NOBODY TO TAKE IT DOES NOT VANISH. A mandal with no MSO, or
 * with no district officer active on the roll, spreads that share over the
 * officers who ARE there, in the proportion the order set between them — and
 * the publish says so in as many words rather than letting a tenth of a mandal
 * disappear into whoever happened to be first.
 *
 * IT ACCUSES NOBODY. A schedule is a plan of work, not a charge. Falling
 * behind it draws a reminder — by mail and on the officer's home screen — and
 * nothing else: no show-cause notice, no casual-leave debit, no lock on the
 * app, no entry in the notice register. The ladder in this file exists for
 * unmarked ATTENDANCE and a served notice recites Rule 3 of the Conduct Rules;
 * filing default is not that, and a table must not make it that. If the
 * district ever means to sanction on filing, that is the Collector's written
 * order and it is changed in suite 25 first, deliberately.
 *
 * WHETHER A VILLAGE IS FILED IS NEVER STORED HERE. It is read back off the
 * Inspections register every single time, by the date of the visit through
 * rowYm_, exactly as the console and the pendency read it. A status column
 * kept in step by a trigger is how the reporting month went wrong once
 * already: the stored label said one thing, the record said another, and every
 * count believed the label. The Schedule tab records the ASSIGNMENT — who was
 * asked, for which village, by which day — and that is all it records.
 *
 * IT RUNS TWICE WITHOUT DOUBLING (rule 8). Every row carries an id derived
 * from the month, the officer and the village, so a second publish finds its
 * own work already done. Publishing again never moves an assignment already
 * made or a date already given to an officer — it only takes in villages that
 * have become pending since. Re-spreading the dates is a separate, explicit
 * act of the Collector's, because an officer told on Tuesday that Konne is his
 * for Thursday must not find on Wednesday that it has moved.
 *
 * NOTHING IS DESTROYED (rule 7). A village that leaves the roll has its row
 * marked DROPPED where it stands; the row remains, and so does every reminder
 * and message ever sent against it.
 * ========================================================================== */
const SCH_HEAD = ['id','ym','mandal','gp','phone','name','role','dueDate','assignedAt','assignedBy','status','note'];
/* One receipt per officer per reporting month — not one per village. He is
   acknowledging the schedule, which is one document however many lines it has. */
const SCH_ACK_HEAD = ['ym','phone','name','role','mandal','ackAt','receivedAt'];
/* What the Collector sends by hand from the console: a reminder against the
   schedule, or a message in his own words. Both reach the officer's app the
   next time he opens it, and both carry the time they were seen back, so the
   console can say whether it landed rather than only that it was sent. */
const NUDGE_HEAD = ['id','ym','date','phone','name','role','mandal','kind','text',
                    'sentBy','sentAt','emailedAt','seenAt','receivedAt'];
/* THE COLLECTOR'S ORDER OF 19.09.2026, which replaces the sixty-each of
   17.09.2026. The pendency is no longer dealt out in whole mandals to a
   district office until a figure is filled; it is split INSIDE EVERY MANDAL,
   by share:

       MPDO 40 · MPO 40 · MSO 10 · the district officer 10

   and the district officer is decided by SUBDIVISION and not by who has room
   left: the DLPO takes his ten per cent in the five mandals of the Station
   Ghanpur subdivision, and the DPO takes his in the other seven.

   WHAT THIS CHANGES BESIDES THE ARITHMETIC. Under the old order the MPO and
   the MPDO were BOTH named against every village and either could file it, so
   one village raised two rows. A share is not that: forty per cent to one man
   and forty to another means each village now has ONE officer answerable for
   it, and rows and villages are the same count again. The MSO is named for
   the first time — he was left out of the last order and is in this one, and
   he is not a viewer, so the server will take his filing.

   An order reaches forward. Assignments already made stand; only villages
   still unspoken-for are dealt under the new shares. */
const SCH_SHARE = { MPDO: 40, MPO: 40, MSO: 10, DISTRICT: 10 };

/* THE SUBDIVISION, SPELT AS THE ROLL SPELLS IT AND MATCHED AS THE ROLL IS
   MATCHED. "Ghanpur (Stn)" appears three ways on this register, so these are
   compared through mkey_/mkey2_ like every other mandal name — a subdivision
   must not lose a mandal over a bracket. Any mandal not named here is the
   DPO's. */
const SCH_SUBDIVISION = {
  DLPO: ['Chilpur', 'Ghanpur (Stn)', 'Zaffergadh', 'Palakurthy', 'Kodakandla']
};
/* Who may be given villages. The Secretary alone is absent, by the order and
   because he may not file an evaluation at all — a schedule that called him
   for one would ask for work the server refuses at the door. */
const SCH_DISTRICT_ROLES = ['DPO','DLPO'];
const SCH_MANDAL_ROLES   = ['MPDO','MPO','MSO'];

/* Which district officer answers for a mandal. */
function schDistrictRole_(mandal){
  const k1 = mkey_(mandal), k2 = mkey2_(mandal);
  let found = '';
  Object.keys(SCH_SUBDIVISION).forEach(function(role){
    SCH_SUBDIVISION[role].forEach(function(m){
      if(mkey_(m) === k1 || mkey2_(m) === k2) found = role;
    });
  });
  return found || 'DPO';
}

/* HAMILTON, NOT ROUNDING. Forty per cent of 23 villages is 9.2, and four
   shares rounded on their own come to 22 or 24 — a village lost or a village
   dealt twice, and the pendency no longer adds up. The whole numbers are
   taken first and what is left over goes to the largest remainders, so the
   parts always sum to exactly what there was. Ties break by the order the
   shares are named in, so the same roll always deals the same way and a
   re-publish is never a reshuffle. */
function schApportion_(total, weights){
  const keys = Object.keys(weights).filter(function(k){ return weights[k] > 0; });
  const sum = keys.reduce(function(a, k){ return a + weights[k]; }, 0);
  const out = {}; let given = 0;
  if(!keys.length || !sum || total <= 0){ keys.forEach(function(k){ out[k] = 0; }); return out; }
  const rem = [];
  keys.forEach(function(k){
    const exact = total * weights[k] / sum;
    out[k] = Math.floor(exact);
    given += out[k];
    rem.push({ k:k, r:exact - Math.floor(exact) });
  });
  rem.sort(function(a, b){ return (b.r - a.r) || (keys.indexOf(a.k) - keys.indexOf(b.k)); });
  for(let i = 0; given < total; i++, given++) out[rem[i % rem.length].k]++;
  return out;
}

/* A mandal name as a key. Case-blind and trimmed, as everywhere on this
   register — and then, only if that finds nothing, with the punctuation taken
   out as well, because the roll spells "Ghanpur (Stn)" three ways and a
   schedule must not lose a mandal's whole pendency over a bracket. It is never
   loosened further than that: "Ghanpur (Stn)" and "Lingala Ghanpur" are two
   different mandals, and a prefix match would quietly merge them. */
function mkey_(s){ return String(s == null ? '' : s).trim().toLowerCase(); }
function mkey2_(s){ return mkey_(s).replace(/[^a-z0-9]/g, ''); }
function vkey_(mandal, gp){ return mkey_(mandal) + '|' + mkey_(gp); }

/* WHAT HAS ACTUALLY BEEN FILED, read off the record and not off a label.
   Keyed by mandal|gp, case-blind, and the month derived from the date of the
   visit through rowYm_ — the same reading the console, the pendency and the
   daily mail take. */
function schFiled_(ym){
  const sh = sheet_('Inspections', HEADERS), m = headMap_(sh, HEADERS);
  const v = sh.getDataRange().getValues();
  const out = {};
  for(let i = 1; i < v.length; i++){
    if(rowYm_(v[i], m.ix) !== ym) continue;
    const k = vkey_(v[i][m.ix.mandal], v[i][m.ix.gp]);
    const d = dateText_(v[i][m.ix.date]);
    /* the FIRST filing closes the village; a later re-file does not re-open it */
    if(!out[k] || (d && d < out[k].date))
      out[k] = { date:d, officer:cell_(v[i], m.ix.officer), score:Number(v[i][m.ix.score]) || 0 };
  }
  return out;
}

/* The working days of a reporting month from a date onward, inclusive —
   Sundays and the Holidays tab out, as everywhere else on this register. A
   second Saturday is a fixed date on that tab and is skipped by its own date,
   whichever window holds it. The list is empty when the month has closed: the
   caller decides what that means rather than being handed a day that is past. */
function schDays_(ym, fromDate){
  const from = dateText_(fromDate), to = cycleTo_(ym), hs = holidaySet_();
  const open = cycleFrom_(ym);
  let k = from && from > open ? from : open;
  const out = [];
  for(; k <= to; k = dayAfter_(k)){
    if(new Date(k + 'T00:00:00').getDay() === 0 || hs[k]) continue;
    out.push(k);
  }
  return out;
}

/* the active roll, one officer per number, as every other reader takes it */
function schOfficers_(){
  const t = uidx_(), v = t.sh.getDataRange().getValues();
  const out = [], seen = {};
  for(let i = 1; i < v.length; i++){
    const ph = phone10_(v[i][t.ix.phone]); if(!ph || seen[ph]) continue; seen[ph] = true;
    if(String(v[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    out.push({ phone:ph, name:cell_(v[i], t.ix.name), role:cell_(v[i], t.ix.role).toUpperCase(),
               mandal:cell_(v[i], t.ix.mandal), email:String(v[i][t.ix.email] || '').trim() });
  }
  return out;
}

/* every schedule row of a month, as written */
function schRows_(ym){
  const sh = sheet_('Schedule', SCH_HEAD), m = headMap_(sh, SCH_HEAD);
  const v = sh.getDataRange().getValues();
  const out = [];
  for(let i = 1; i < v.length; i++){
    if(ymText_(v[i][m.ix.ym]) !== ym) continue;
    out.push({ at:i + 1, id:cell_(v[i], m.ix.id), ym:ym,
      mandal:cell_(v[i], m.ix.mandal), gp:cell_(v[i], m.ix.gp),
      phone:phone10_(v[i][m.ix.phone]), name:cell_(v[i], m.ix.name),
      role:cell_(v[i], m.ix.role).toUpperCase(),
      dueDate:dateText_(v[i][m.ix.dueDate]), assignedAt:String(v[i][m.ix.assignedAt] || ''),
      assignedBy:cell_(v[i], m.ix.assignedBy),
      status:String(v[i][m.ix.status] || 'ACTIVE').toUpperCase(), note:cell_(v[i], m.ix.note) });
  }
  return out;
}

/* Deterministic, so a second publish finds its own work already done (rule 8). */
function schId_(ym, phone, mandal, gp){
  return 'SCH-' + ym + '-' + phone10_(phone) + '-' + mkey2_(mandal) + '-' + mkey2_(gp);
}

/* ----------------------------------------------------------------------------
 * THE ALLOCATION.
 *
 * Only villages with no row yet are allocated, so a publish can be run again
 * without disturbing a single assignment already made. A mandal that already
 * belongs to a district office keeps going to that office — otherwise the
 * second publish of a month would split one mandal between two officers and
 * both would drive to it.
 *
 * Mandals are taken largest-pendency-first and given to whichever district
 * office has the most room left. Largest first is what keeps the overshoot
 * small: the largest pendency is dealt first, so by the end only small mandals
 * to push it over.
 * ------------------------------------------------------------------------- */
function schAllocate_(ym, existing, sharesOpt){
  const share = sharesOpt || SCH_SHARE;
  const pending = unfiledVillages_(ym);
  const officers = schOfficers_();
  const notes = [];

  /* who holds each mandal chair, and who holds each district office */
  const office = {}, byMandalRole = {};
  SCH_DISTRICT_ROLES.forEach(r => { office[r] = { role:r, cap:0, got:0, men:[], mandals:[] }; });
  officers.forEach(o => {
    if(office[o.role]) office[o.role].men.push(o);
    if(SCH_MANDAL_ROLES.indexOf(o.role) >= 0){
      const k1 = mkey_(o.mandal) + '|' + o.role, k2 = mkey2_(o.mandal) + '|' + o.role;
      (byMandalRole[k1] = byMandalRole[k1] || []).push(o);
      if(k2 !== k1) (byMandalRole[k2] = byMandalRole[k2] || []).push(o);
    }
  });
  SCH_DISTRICT_ROLES.forEach(r => {
    if(!office[r].men.length)
      notes.push('No active ' + r + ' on the roll — the ' + share.DISTRICT +
        '% that office would have taken has gone to the mandal’s own officers, in their own proportion.');
    else if(office[r].men.length > 1)
      notes.push(office[r].men.length + ' officers hold the ' + r + ' charge; its share is dealt between them, mandal by mandal.');
  });

  /* what is already spoken for. An order reaches forward: a village already
     assigned stays where it was put, whatever the new shares would say. */
  const held = {};
  (existing || []).forEach(r => { if(r.status === 'ACTIVE') held[vkey_(r.mandal, r.gp)] = true; });

  const fresh = pending.filter(v => !held[vkey_(v.mandal, v.gp)]);
  const byMandal = {};
  fresh.forEach(v => { (byMandal[v.mandal] = byMandal[v.mandal] || []).push(v.gp); });
  const mandals = Object.keys(byMandal).sort((a, b) =>
    (byMandal[b].length - byMandal[a].length) || (a < b ? -1 : a > b ? 1 : 0));

  const plan = [], unassigned = [];
  mandals.forEach(mandal => {
    const gps = byMandal[mandal].slice().sort();
    const mk = mkey_(mandal), mk2 = mkey2_(mandal);

    /* who is actually there to be given villages in this mandal */
    const man = {};
    SCH_MANDAL_ROLES.forEach(r => {
      const hit = byMandalRole[mk + '|' + r] || byMandalRole[mk2 + '|' + r] || [];
      if(hit.length) man[r] = hit[0];
    });
    const dRole = schDistrictRole_(mandal);
    const dOff = office[dRole];
    /* one office may be held by more than one officer; the MANDALS are dealt
       between them rather than the villages, for the road reason */
    let dMan = null;
    if(dOff && dOff.men.length){
      dOff.mandals.push(mandal);
      dMan = dOff.men[(dOff.mandals.length - 1) % dOff.men.length];
    }

    const weights = {};
    SCH_MANDAL_ROLES.forEach(r => { if(man[r]) weights[r] = share[r] || 0; });
    if(dMan) weights.DISTRICT = share.DISTRICT || 0;

    if(!Object.keys(weights).length){
      /* NAMED, NOT SWALLOWED. A mandal with nobody to file is a fault on the
         roll, and the Collector is told what it costs rather than finding the
         villages missing from every total. */
      unassigned.push({ mandal:mandal, villages:gps.length });
      notes.push(mandal + ': no active MPDO, MPO, MSO or district officer on the roll — its ' +
        gps.length + ' pending village(s) could not be assigned to anybody.');
      return;
    }
    /* A SHARE WITH NOBODY TO TAKE IT DOES NOT VANISH, and it is not given to
       whoever happens to be first: it is spread over those who ARE there, in
       the proportion the order set between them. The publish says so. */
    const absent = SCH_MANDAL_ROLES.filter(r => !man[r]);
    if(absent.length || !dMan)
      notes.push(mandal + ': no active ' + absent.concat(dMan ? [] : [dRole]).join(' or ') +
        ' — that share was spread over the officers who are there.');

    const cut = schApportion_(gps.length, weights);
    let i = 0;
    Object.keys(cut).forEach(r => {
      const who = r === 'DISTRICT' ? dMan : man[r];
      if(!who) return;
      for(let n = 0; n < cut[r]; n++, i++)
        plan.push({ mandal:mandal, gp:gps[i], phone:who.phone, name:who.name, role:who.role });
      if(r === 'DISTRICT' && dOff) dOff.got += cut[r];
    });
  });

  return { plan:plan, notes:notes, office:office, unassigned:unassigned,
           pending:pending.length, fresh:fresh.length };
}

/* Give every officer's villages a day. His list is spread evenly over the
   working days that remain in the reporting month, mandal by mandal and
   village by village, so a day's work is in one place. A month already closed
   leaves no day to give: everything falls due on its last working day, and the
   answer says so rather than inventing a date in the past. */
function schDate_(days, i, n){
  if(!days.length) return '';
  const per = Math.max(1, Math.ceil(n / days.length));
  return days[Math.min(days.length - 1, Math.floor(i / per))];
}

/* ---- the Collector publishes it ---- */
function schPublish_(b, u){
  if(u.role !== 'COLLECTOR')
    return json_({ ok:false, error:'The filing schedule is published by the Collector alone.' });
  const ym = /^\d{4}-\d{2}$/.test(String(b.ym || '')) ? String(b.ym) : cycleYm_(today_());
  if(!ym) return json_({ ok:false, error:'There is no reporting month open yet.' });
  const respread = !!b.respread;

  const lock = LockService.getScriptLock();
  try{ lock.waitLock(30000); }catch(err){ return json_({ ok:false, error:'busy — try again' }); }
  try{
    const sh = sheet_('Schedule', SCH_HEAD), m = headMap_(sh, SCH_HEAD);
    const existing = schRows_(ym);
    /* the shares are the order's; there is nothing here for the console to
       set, which is the point of an order */
    const alloc = schAllocate_(ym, existing, SCH_SHARE);

    const now = new Date().toISOString();
    const by = u.name + ' (' + u.phone + ')';
    const byId = {}; existing.forEach(r => { byId[r.id] = r; });

    /* NOTHING IS DESTROYED. A village that has left the roll since the
       schedule was published is marked DROPPED where it stands; the row, and
       every reminder sent against it, remain readable. */
    const onRoll = {}; gpRoll_().forEach(r => { onRoll[vkey_(r.mandal, r.gp)] = true; });
    let dropped = 0;
    existing.forEach(r => {
      if(r.status !== 'ACTIVE' || onRoll[vkey_(r.mandal, r.gp)]) return;
      if(m.ix.status >= 0) sh.getRange(r.at, m.ix.status + 1).setValue('DROPPED');
      if(m.ix.note >= 0) sh.getRange(r.at, m.ix.note + 1).setValue('Off the village roll on ' + today_());
      r.status = 'DROPPED'; dropped++;
    });

    /* the new lines */
    const add = [];
    alloc.plan.forEach(p => {
      const id = schId_(ym, p.phone, p.mandal, p.gp);
      if(byId[id]) return;                       /* already his — untouched (rule 8) */
      byId[id] = true;
      add.push({ id:id, mandal:p.mandal, gp:p.gp, phone:p.phone, name:p.name, role:p.role, dueDate:'' });
    });

    /* THE DATES. Every officer's outstanding villages — the ones just added,
       and on a re-spread the ones he already holds and has not yet filed — are
       laid out over the working days that remain. A date already given to an
       officer is his: only an explicit re-spread moves it. */
    const filed = schFiled_(ym);
    /* THE DAY THE WORK IS TO BEGIN IS THE COLLECTOR'S, NOT THE CALENDAR'S.
       A schedule published on a Friday afternoon and starting that afternoon
       asks for village visits nobody was given notice of; the district's order
       of 18.09.2026 was to plan from the 21st. `from` names that day. It can
       only move the start LATER — a date already gone cannot be worked, and a
       blank one means begin today, which is the old behaviour exactly. */
    const asked = dateText_(b.from || '');
    const start = (asked && asked > today_()) ? asked : today_();
    /* A MONTH ALREADY CLOSED HAS NO DAY LEFT TO GIVE, and a blank due date
       would read on every screen as "not scheduled" — which is the opposite of
       the truth. Everything then falls due on the month's own last working
       day, where it reads correctly as overdue. */
    let days = schDays_(ym, start);
    if(!days.length) days = schDays_(ym, cycleFrom_(ym)).slice(-1);
    const mine = {};
    existing.forEach(r => { if(r.status === 'ACTIVE') (mine[r.phone] = mine[r.phone] || []).push(r); });
    add.forEach(r => (mine[r.phone] = mine[r.phone] || []).push(r));

    const dates = {};
    Object.keys(mine).forEach(ph => {
      const open = mine[ph].filter(r => !filed[vkey_(r.mandal, r.gp)])
        .sort((a, b) => (a.mandal < b.mandal ? -1 : a.mandal > b.mandal ? 1
                       : (a.gp < b.gp ? -1 : a.gp > b.gp ? 1 : 0)));
      open.forEach((r, i) => {
        if(r.dueDate && !respread) return;
        dates[r.id] = schDate_(days, i, open.length);
      });
    });

    let moved = 0;
    existing.forEach(r => {
      if(r.status !== 'ACTIVE' || dates[r.id] === undefined || dates[r.id] === r.dueDate) return;
      if(m.ix.dueDate >= 0) sh.getRange(r.at, m.ix.dueDate + 1).setValue("'" + dates[r.id]);
      r.dueDate = dates[r.id]; moved++;
    });
    add.forEach(r => {
      const row = new Array(m.width).fill('');
      const put = (k, val) => { if(m.ix[k] >= 0) row[m.ix[k]] = val; };
      put('id', r.id); put('ym', "'" + ym); put('mandal', r.mandal); put('gp', r.gp);
      put('phone', "'" + r.phone); put('name', r.name); put('role', r.role);
      put('dueDate', "'" + (dates[r.id] || ''));
      put('assignedAt', now); put('assignedBy', by); put('status', 'ACTIVE'); put('note', '');
      sh.appendRow(row);
    });

    /* WHAT WAS ACTUALLY DONE, office by office. A share is a proportion that whole
       mandals cannot hit exactly, so the figure is reported and the Collector
       reads the arithmetic rather than being told the order was carried out. */
    const after = schRows_(ym).filter(r => r.status === 'ACTIVE');
    const villagesOf = rows => { const s = {}; rows.forEach(r => { s[vkey_(r.mandal, r.gp)] = true; }); return Object.keys(s).length; };
    const byRole = {};
    after.forEach(r => { (byRole[r.role] = byRole[r.role] || []).push(r); });
    const offices = Object.keys(byRole).sort().map(r => {
      const men = {}, mand = {};
      byRole[r].forEach(x => { men[x.phone] = x.name; mand[x.mandal] = 1; });
      return { role:r, officers:Object.keys(men).length, villages:villagesOf(byRole[r]),
               mandals:Object.keys(mand).sort(),
               share:SCH_SHARE[r] != null ? SCH_SHARE[r]
                     : (r === 'DPO' || r === 'DLPO' ? SCH_SHARE.DISTRICT : null) };
    });

    schBust_('');
    admAudit_('SCHEDULE_PUBLISH', ym,
      add.length + ' line(s) added, ' + moved + ' date(s) ' + (respread ? 're-spread' : 'set') +
      ' from ' + (days[0] || '—') + ', ' + dropped + ' dropped; ' +
      villagesOf(after) + ' village(s) under schedule');

    return json_({ ok:true, ym:ym, from:cycleFrom_(ym), to:cycleTo_(ym),
      added:add.length, moved:moved, dropped:dropped, respread:respread,
      /* the working days the plan actually runs over, so the console can say
         "21 Sept – 9 Oct, 15 working days" rather than the month's own edges */
      startFrom:days[0] || '', startTo:days[days.length - 1] || '',
      pending:alloc.pending, villages:villagesOf(after), rows:after.length,
      workingDaysLeft:days.length, offices:offices, notes:alloc.notes,
      unassigned:alloc.unassigned, shares:SCH_SHARE, subdivision:SCH_SUBDIVISION, at:now });
  } finally { lock.releaseLock(); }
}

/* ----------------------------------------------------------------------------
 * THE STANDING — what each officer owes, and how he is going.
 *
 * BEHIND is measured against what he has filed IN ALL, not against the
 * villages whose day has passed: an officer who did Thursday's village on
 * Tuesday is ahead, and a burn-down that could not see that would chase a man
 * who is in front of his own schedule.
 * ------------------------------------------------------------------------- */
/* EVERY POLL WOULD OTHERWISE RE-READ TWO WHOLE SHEETS. Two hundred and eighty
   handsets ask for this every few minutes and the Collector's console asks for
   it every minute; the Schedule tab and the whole Inspections register behind
   it are the same answer each time. Held for thirty seconds, the way the
   dashboard payload is held for fifty and for the same reason — the sheets are
   rebuilt about twice a minute however many people are looking, at a freshness
   cost nobody can perceive in a register measured in days. */
function schPace_(ym, today){
  const t0 = dateText_(today || today_());
  const ck = 'pace_' + ym + '_' + t0;
  try{
    const hit = cache_().get(ck);
    if(hit) return JSON.parse(hit);
  }catch(err){}
  const out = schPaceBuild_(ym, t0);
  try{
    const body = JSON.stringify(out);
    if(body.length < 95000) cache_().put(ck, body, 30);
  }catch(err){}
  return out;
}
/* AND IT IS DROPPED THE MOMENT IT COULD BE WRONG. An officer who files a
   village expects his own list to tick over on the next screen, not in half a
   minute — a cache that outlives the thing it describes is how a register
   tells a man his work is outstanding after he has done it. Called from
   saveInspection_ and from a publish; both months are cleared, because a
   filing made on the 3rd of September belongs to August's window. */
function schBust_(dStr){
  const t = today_();
  const yms = {};
  yms[cycleYm_(t)] = true;
  if(dStr) yms[cycleYm_(dStr)] = true;
  Object.keys(yms).forEach(ym => { if(ym) try{ cache_().remove('pace_' + ym + '_' + t); }catch(err){} });
}
function schPaceBuild_(ym, today){
  const rows = schRows_(ym).filter(r => r.status === 'ACTIVE');
  const filed = schFiled_(ym);
  const t = dateText_(today || today_());
  const byPhone = {}, villages = {}, done = {};
  rows.forEach(r => {
    const k = vkey_(r.mandal, r.gp);
    const f = filed[k] || null;
    villages[k] = true; if(f) done[k] = true;
    const o = byPhone[r.phone] = byPhone[r.phone] || { phone:r.phone, name:r.name, role:r.role,
      assigned:0, filed:0, dueByToday:0, dueToday:0, mandals:{}, rows:[] };
    o.assigned++; o.mandals[r.mandal] = true;
    if(f) o.filed++;
    if(r.dueDate && r.dueDate <= t) o.dueByToday++;
    if(r.dueDate === t) o.dueToday++;
    o.rows.push({ id:r.id, mandal:r.mandal, gp:r.gp, dueDate:r.dueDate,
                  filed:!!f, filedOn:f ? f.date : '', score:f ? f.score : null,
                  filedBy:f ? String(f.officer || '').replace(/\s*\(\d+\)$/, '') : '' });
  });
  const list = Object.keys(byPhone).map(ph => {
    const o = byPhone[ph];
    o.mandals = Object.keys(o.mandals).sort();
    o.behind = Math.max(0, o.dueByToday - o.filed);
    o.left = o.assigned - o.filed;
    o.rows.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)) ||
                          (a.mandal < b.mandal ? -1 : a.mandal > b.mandal ? 1
                         : (a.gp < b.gp ? -1 : a.gp > b.gp ? 1 : 0)));
    return o;
  }).sort((a, b) => (b.behind - a.behind) || (b.left - a.left) || (a.name < b.name ? -1 : 1));

  /* THE DISTRICT COUNTS VILLAGES, NEVER ROWS. The MPO and the MPDO are named
     against the same village and it is one village (rule 9) — adding the
     officers' lines together would report a mandal's pendency twice over. */
  const dueByToday = {}, dueTodayV = {};
  rows.forEach(r => { const k = vkey_(r.mandal, r.gp);
    if(r.dueDate && r.dueDate <= t) dueByToday[k] = true;
    if(r.dueDate === t) dueTodayV[k] = true; });
  const nV = Object.keys(villages).length, nD = Object.keys(done).length;
  const days = schDays_(ym, t);

  /* mandal by mandal, for the Gantt */
  const byM = {};
  rows.forEach(r => { const k = vkey_(r.mandal, r.gp);
    const o = byM[r.mandal] = byM[r.mandal] || { mandal:r.mandal, seen:{}, total:0, done:0, officers:{} };
    o.officers[r.phone] = r.name + ' (' + r.role + ')';
    if(o.seen[k]) return; o.seen[k] = true; o.total++; if(done[k]) o.done++; });
  const mandals = Object.keys(byM).sort().map(k => ({ mandal:k, total:byM[k].total, done:byM[k].done,
    officers:Object.keys(byM[k].officers).map(p => byM[k].officers[p]).sort() }));

  /* the day plan: how many villages fall due on each day of the month */
  const perDay = {};
  rows.forEach(r => { if(!r.dueDate) return;
    const k = vkey_(r.mandal, r.gp);
    perDay[r.dueDate] = perDay[r.dueDate] || {}; perDay[r.dueDate][k] = !!done[k]; });
  const plan = Object.keys(perDay).sort().map(d => ({ date:d,
    due:Object.keys(perDay[d]).length,
    filed:Object.keys(perDay[d]).filter(k => perDay[d][k]).length }));

  return { ym:ym, today:t, from:cycleFrom_(ym), to:cycleTo_(ym),
    villages:nV, filed:nD, left:nV - nD,
    dueByToday:Object.keys(dueByToday).length, dueToday:Object.keys(dueTodayV).length,
    behind:Math.max(0, Object.keys(dueByToday).length - nD),
    workingDaysLeft:days.length,
    needPerDay:days.length ? Math.ceil((nV - nD) / days.length) : (nV - nD),
    officers:list, mandals:mandals, plan:plan, rows:rows.length };
}

/* the receipts, by month */
function schAcks_(ym){
  const sh = sheet_('SchedAck', SCH_ACK_HEAD), m = headMap_(sh, SCH_ACK_HEAD);
  const v = sh.getDataRange().getValues();
  const out = {};
  for(let i = 1; i < v.length; i++)
    if(ymText_(v[i][m.ix.ym]) === ym) out[phone10_(v[i][m.ix.phone])] = String(v[i][m.ix.ackAt] || '');
  return out;
}

/* what the Collector has sent by hand, newest first */
function schNudges_(ym, phone){
  const sh = sheet_('Nudges', NUDGE_HEAD), m = headMap_(sh, NUDGE_HEAD);
  const v = sh.getDataRange().getValues();
  const out = [];
  for(let i = v.length - 1; i >= 1 && out.length < 400; i--){
    if(ymText_(v[i][m.ix.ym]) !== ym) continue;
    const ph = phone10_(v[i][m.ix.phone]);
    if(phone && ph !== phone10_(phone)) continue;
    out.push({ at:i + 1, id:cell_(v[i], m.ix.id), date:dateText_(v[i][m.ix.date]), phone:ph,
      name:cell_(v[i], m.ix.name), role:cell_(v[i], m.ix.role), mandal:cell_(v[i], m.ix.mandal),
      kind:cell_(v[i], m.ix.kind), text:cell_(v[i], m.ix.text), sentBy:cell_(v[i], m.ix.sentBy),
      sentAt:String(v[i][m.ix.sentAt] || ''), emailedAt:String(v[i][m.ix.emailedAt] || ''),
      seenAt:String(v[i][m.ix.seenAt] || '') });
  }
  return out;
}

/* ---- the register, read ----
   An officer is given his own lines and nothing else. The Collector, with
   all=1, is given the whole picture. A Panchayat Secretary has no lines by the
   order, so `mine` comes back null and the app simply shows him nothing —
   there is no empty table to explain. */
function schRegister_(u, p){
  const ym = /^\d{4}-\d{2}$/.test(String((p && p.ym) || '')) ? String(p.ym) : cycleYm_(today_());
  if(!ym) return json_({ ok:true, ym:'', mine:null, note:'No reporting month is open yet.' });
  const all = (p && p.all === '1') && u.role === 'COLLECTOR';
  const pace = schPace_(ym, today_());

  if(all){
    const acks = schAcks_(ym);
    pace.officers.forEach(o => { o.ackAt = acks[o.phone] || ''; });
    return json_({ ok:true, ym:ym, district:pace, nudges:schNudges_(ym, ''),
      shares:SCH_SHARE, subdivision:SCH_SUBDIVISION, acknowledged:Object.keys(acks).length,
      cycle:{ from:cycleFrom_(ym), to:cycleTo_(ym) } });
  }

  const mineRow = pace.officers.filter(o => o.phone === u.phone)[0] || null;
  const acks = schAcks_(ym);
  const nudges = schNudges_(ym, u.phone).filter(n => !n.seenAt)
    .map(n => ({ id:n.id, kind:n.kind, text:n.text, sentAt:n.sentAt, sentBy:n.sentBy }));
  /* THE PHONE'S CLOCK IS NOT EVIDENCE (rule 1), and a schedule is read in
     days. A handset eleven minutes fast once recorded marks in the future; a
     handset a day out would tell an honest officer that today's village was
     due yesterday and paint his whole list red. The district's own day travels
     with the schedule and the app judges by that. */
  return json_({ ok:true, ym:ym, today:pace.today, from:cycleFrom_(ym), to:cycleTo_(ym),
    mine: mineRow ? { assigned:mineRow.assigned, filed:mineRow.filed, left:mineRow.left,
      dueByToday:mineRow.dueByToday, dueToday:mineRow.dueToday, behind:mineRow.behind,
      mandals:mineRow.mandals, rows:mineRow.rows } : null,
    acknowledged: !!acks[u.phone], ackAt:acks[u.phone] || '',
    workingDaysLeft:pace.workingDaysLeft,
    district:{ villages:pace.villages, filed:pace.filed, needPerDay:pace.needPerDay },
    nudges:nudges,
    /* THIS IS A PLAN OF WORK, NOT A CHARGE. The flag travels with the schedule
       so the app can say so in the officer's own screen, and so that the day
       the district decides otherwise it is decided here and in suite 25 rather
       than by a word changing quietly in a template. */
    sanction:false });
}

/* ---- the officer's receipt ----
   Idempotent, one to a month. The handset's claim is kept, and the district's
   own clock is what the register is read by — the phone's clock is not
   evidence (rule 1). */
function schAck_(b, u){
  const ym = /^\d{4}-\d{2}$/.test(String(b.ym || '')) ? String(b.ym) : cycleYm_(today_());
  if(!ym) return json_({ ok:false, error:'There is no reporting month open.' });
  /* A RECEIPT FOR NOTHING IS NOT A RECEIPT. An officer with no villages on the
     schedule — a Panchayat Secretary, an MSO, anybody the order did not name —
     has nothing to acknowledge, and a row against his number would read on the
     console as one more officer who had seen a schedule he was never given. */
  if(!schRows_(ym).some(r => r.status === 'ACTIVE' && r.phone === u.phone))
    return json_({ ok:false, error:'You hold no villages on this month’s filing schedule.' });
  const sh = sheet_('SchedAck', SCH_ACK_HEAD), m = headMap_(sh, SCH_ACK_HEAD);
  const lock = LockService.getScriptLock();
  try{ lock.waitLock(20000); }catch(err){ return json_({ ok:false, error:'busy — try again' }); }
  try{
    const v = sh.getDataRange().getValues();
    for(let i = 1; i < v.length; i++)
      if(ymText_(v[i][m.ix.ym]) === ym && phone10_(v[i][m.ix.phone]) === u.phone)
        return json_({ ok:true, already:true, ym:ym, ackAt:String(v[i][m.ix.ackAt] || '') });
    const row = new Array(m.width).fill('');
    const put = (k, val) => { if(m.ix[k] >= 0) row[m.ix[k]] = val; };
    put('ym', "'" + ym); put('phone', "'" + u.phone); put('name', u.name);
    put('role', u.role); put('mandal', u.mandal || '');
    put('ackAt', String(b.at || new Date().toISOString()));
    put('receivedAt', new Date().toISOString());
    sh.appendRow(row);
  } finally { lock.releaseLock(); }
  return json_({ ok:true, ym:ym, ackAt:new Date().toISOString() });
}

/* ---- the officer tells the district he has read a message ---- */
function schSeen_(b, u){
  const ids = Array.isArray(b.ids) ? b.ids.slice(0, 40).map(String) : [];
  if(!ids.length) return json_({ ok:true, done:0 });
  const sh = sheet_('Nudges', NUDGE_HEAD), m = headMap_(sh, NUDGE_HEAD);
  const v = sh.getDataRange().getValues();
  const now = new Date().toISOString();
  let done = 0;
  for(let i = 1; i < v.length; i++){
    if(ids.indexOf(cell_(v[i], m.ix.id)) < 0) continue;
    if(phone10_(v[i][m.ix.phone]) !== u.phone) continue;        /* one's own alone */
    if(String(v[i][m.ix.seenAt] || '')){ done++; continue; }    /* idempotent */
    if(m.ix.seenAt >= 0) sh.getRange(i + 1, m.ix.seenAt + 1).setValue(now);
    done++;
  }
  return json_({ ok:true, done:done });
}

/* ----------------------------------------------------------------------------
 * THE COLLECTOR'S OWN HAND — a reminder, or a message in his own words.
 *
 * ON THE WORD "PUSH". A true push — one that lights a handset with the app
 * shut — needs a VAPID key signed ES256, and Apps Script signs RSA and HMAC
 * only. There is no push sender behind this register and this does not pretend
 * to be one: what it does is send the mail at once and put the message in the
 * officer's app, where he sees it the next time he opens it and where the
 * district can read back the moment he saw it. The service worker already
 * carries a push handler for the day a sender exists, and nothing here will
 * need changing then.
 *
 * IT IS NOT AN INSTRUMENT. A reminder here is the same informal thing the
 * attendance ladder's first two misses draw: unnumbered, off the notice
 * register, no lock and no debit.
 * ------------------------------------------------------------------------- */
function schNudge_(b, u){
  if(u.role !== 'COLLECTOR')
    return json_({ ok:false, error:'A reminder against the filing schedule is sent by the Collector alone.' });
  const ym = /^\d{4}-\d{2}$/.test(String(b.ym || '')) ? String(b.ym) : cycleYm_(today_());
  if(!ym) return json_({ ok:false, error:'There is no reporting month open.' });
  const kind = String(b.nudge || 'REMINDER').toUpperCase() === 'MESSAGE' ? 'MESSAGE' : 'REMINDER';
  const text = String(b.text || '').trim().slice(0, 1200);
  if(kind === 'MESSAGE' && !text)
    return json_({ ok:false, error:'A message needs something in it — that is the whole of what he reads.' });

  const pace = schPace_(ym, today_());
  const want = String(b.to || '').trim();
  let targets;
  if(want === 'behind')    targets = pace.officers.filter(o => o.behind > 0);
  else if(want === 'all')  targets = pace.officers.slice();
  else if(want === 'left') targets = pace.officers.filter(o => o.left > 0);
  else                     targets = pace.officers.filter(o => o.phone === phone10_(want));
  if(!targets.length) return json_({ ok:false, error:'Nobody on the schedule answers to that — nothing was sent.' });

  const emails = {}; schOfficers_().forEach(o => { emails[o.phone] = o.email; });
  const sh = sheet_('Nudges', NUDGE_HEAD), m = headMap_(sh, NUDGE_HEAD);
  const today = today_(), now = new Date().toISOString();
  const by = u.name + ' (' + u.phone + ')';
  let sent = 0, mailed = 0;

  targets.forEach(o => {
    const id = 'NDG-' + today + '-' + o.phone + '-' + kind.charAt(0) + '-' + Utilities.getUuid().slice(0, 6);
    const body = text || schReasonText_(o, pace);
    const row = new Array(m.width).fill('');
    const put = (k, val) => { if(m.ix[k] >= 0) row[m.ix[k]] = val; };
    put('id', id); put('ym', "'" + ym); put('date', "'" + today); put('phone', "'" + o.phone);
    put('name', o.name); put('role', o.role); put('mandal', (o.mandals || []).join(', '));
    put('kind', kind); put('text', body); put('sentBy', by); put('sentAt', now);
    put('receivedAt', now);
    const to = emails[o.phone] || '';
    if(to && to.indexOf('@') > 0){
      try{
        MailApp.sendEmail(to,
          'SJSP · ' + (kind === 'MESSAGE' ? 'a message from the Collector' : 'your filing schedule') +
            ' · ' + dmy_(today),
          body, { htmlBody: schMailBody_(o, pace, body, kind, by) });
        put('emailedAt', now); mailed++;
      }catch(err){}
    }
    sh.appendRow(row); sent++;
  });
  admAudit_('SCHEDULE_' + kind, ym, sent + ' sent to ' + (want || 'one officer') + ' (' + mailed + ' by mail)');
  return json_({ ok:true, sent:sent, mailed:mailed, kind:kind,
                 to:targets.map(o => ({ phone:o.phone, name:o.name, role:o.role, behind:o.behind })) });
}

/* What a reminder says when the Collector has not written one himself. It
   names the work and the pace, and it NAMES NO SANCTION — the same cut the
   attendance reminder was given on 28.08.2026, and for the same reason: a
   reminder is not the place to rehearse a sanction that has not arisen and,
   here, cannot arise at all. */
function schReasonText_(o, pace){
  return 'Village evaluation schedule: ' + o.assigned + ' village(s) assigned, ' +
    o.filed + ' filed, ' + o.left + ' still to file. ' +
    (o.behind ? o.behind + ' village(s) are past the day they were scheduled for. '
              : 'You are on pace. ') +
    pace.workingDaysLeft + ' working day(s) remain in the month.';
}

function schMailBody_(o, pace, body, kind, by){
  const rowsLeft = o.rows.filter(r => !r.filed).slice(0, 60);
  const secs =
    emailSec_(kind === 'MESSAGE' ? 'From the Collector' : 'Where you stand',
      '<b>' + body + '</b>', kind === 'MESSAGE' ? '#6D28D9' : '#57647D') +
    emailSec_('Your schedule', emailStats_([
      { label:'Assigned', value:o.assigned, tone:'info' },
      { label:'Filed', value:o.filed, tone:o.filed >= o.dueByToday ? 'good' : 'warn' },
      { label:'Behind the day', value:o.behind, tone:o.behind ? 'bad' : 'good',
        sub:pace.workingDaysLeft + ' working days left' }])) +
    (rowsLeft.length ? emailSec_('Still to file',
      emailTable_(['Scheduled for', 'Village', 'Mandal'],
        rowsLeft.map(r => [r.dueDate ? dmy_(r.dueDate) : '—', r.gp, r.mandal])) +
      (o.left > rowsLeft.length ? '<div style="margin-top:6px;color:#57647D">…and ' +
        (o.left - rowsLeft.length) + ' more.</div>' : '')) : '') +
    /* A REMINDER NAMES NO SANCTION. The same cut the attendance reminder was
       given on 28.08.2026: it says what is asked and it does not rehearse an
       instrument — not even to say that one does not arise, because an officer
       reading the words "show-cause notice" in a reminder has been made to
       think about a show-cause notice. What this is, is said plainly; what it
       is not is left unsaid, and suite 25 asserts the words are absent. */
    emailSec_('What is asked', 'This is the district’s plan of work for the month. ' +
      'File the 100-mark evaluation for each village above in the SJSP app; the register reads only ' +
      'what is filed. Where a village cannot be reached on its day, file it on the next.');
  return emailShell_(kind === 'MESSAGE' ? 'A message from the Collector' : 'Your village filing schedule',
    o.name + ' · ' + o.role + ' · ' + pace.ym + ' (' + dmy_(pace.from) + ' – ' + dmy_(pace.to) + ')' +
    (kind === 'MESSAGE' && by ? ' · ' + by : ''), secs);
}

/* ----------------------------------------------------------------------------
 * THE DAILY REMINDER.
 *
 * One mail a morning to an officer who is behind his schedule or has villages
 * falling due today. Working days only, and one to an officer to a day — the
 * Reminders tab is what makes the second run of a nervous morning cost nothing
 * (rule 8). An officer whose own list is finished is left alone entirely.
 *
 * It REPLACES the mandal-wide filing reminder for the officers it reaches, by
 * the direction of 17.09.2026: two mails a morning about the same villages is
 * how a district learns to read neither. villageFilingReminders reads
 * schScheduled_ and stands down for them; the MSO and the Panchayat Secretary,
 * whom this schedule does not reach, keep the reminder they always had.
 * ------------------------------------------------------------------------- */
function scheduleReminders(){
  const today = today_();
  const ym = cycleYm_(today);
  if(!ym){ Logger.log('Before the register opened — there is no month to schedule into.'); return; }
  if(!isWorkingDay_(today)){ Logger.log('Off day — no schedule reminders.'); return; }
  const pace = schPace_(ym, today);
  if(!pace.officers.length){ Logger.log('No schedule published for ' + ym + '.'); return; }

  const rsh = sheet_('Reminders', R_HEAD), rm = headMap_(rsh, R_HEAD);
  const rv = rsh.getDataRange().getValues();
  const already = {};
  for(let i = 1; i < rv.length; i++)
    if(dateText_(rv[i][rm.ix.date]) === today && String(rv[i][rm.ix.kind]) === 'SCHEDULE')
      already[phone10_(rv[i][rm.ix.phone])] = true;

  const emails = {}; schOfficers_().forEach(o => { emails[o.phone] = o.email; });
  let sent = 0, mailed = 0;
  pace.officers.forEach(o => {
    if(already[o.phone]) return;
    if(!o.left) return;                       /* his list is done — he is left alone */
    if(!o.behind && !o.dueToday) return;      /* on pace with nothing due — no mail */
    const why = schReasonText_(o, pace);
    const row = new Array(rm.width).fill('');
    const put = (k, val) => { if(rm.ix[k] >= 0) row[rm.ix[k]] = val; };
    put('id', 'REM-S-' + today + '-' + o.phone); put('date', "'" + today); put('phone', "'" + o.phone);
    put('name', o.name); put('role', o.role); put('mandal', (o.mandals || []).join(', '));
    put('miss', o.behind); put('kind', 'SCHEDULE'); put('reason', why);
    put('sentAt', new Date().toISOString());
    const to = emails[o.phone] || '';
    if(to && to.indexOf('@') > 0){
      try{
        MailApp.sendEmail(to, 'SJSP · your filing schedule · ' + o.filed + ' of ' + o.assigned +
          ' filed' + (o.behind ? ' · ' + o.behind + ' behind' : '') + ' · ' + dmy_(today),
          why, { htmlBody: schMailBody_(o, pace, why, 'REMINDER', '') });
        put('emailedAt', new Date().toISOString()); mailed++;
      }catch(err){}
    }
    rsh.appendRow(row); sent++;
  });
  Logger.log(pace.left + ' village(s) still to file for ' + ym + '; ' +
             sent + ' officer(s) reminded, ' + mailed + ' mailed.');
}

/* Who is under a schedule this month. The mandal-wide filing reminder reads
   this and stands down for them, so nobody is chased twice in one morning for
   the same villages. */
function schScheduled_(ym){
  const out = {};
  schRows_(ym).forEach(r => { if(r.status === 'ACTIVE') out[r.phone] = true; });
  return out;
}

function installScheduleTrigger(){
  ScriptApp.getProjectTriggers().forEach(t => {
    if(t.getHandlerFunction() === 'scheduleReminders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('scheduleReminders').timeBased().everyDays(1).atHour(9).create();
  Logger.log('scheduleReminders installed ~09:00 (Asia/Calcutta) — every working day, one mail ' +
             'to an officer who is behind his schedule or has a village due today.');
}

function dailyCollectorReport(){
  const today = today_();
  const props = PropertiesService.getScriptProperties();
  if(props.getProperty('LAST_DAILY_REPORT') === today){ Logger.log('The ' + today + ' report has already gone.'); return; }
  const ym = cycleYm_(today), wd = monthWd_(today);

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
  const markDetail = markedDetail_(today);
  const marked = markedSet_(today), onLeave = sanctionedSet_(today);
  const absent = roll.filter(o => !marked[o.phone] && !onLeave[o.phone]);
  const present = roll.length - absent.length - roll.filter(o => !marked[o.phone] && onLeave[o.phone]).length;
  /* the same two readings the console puts on its attendance screen, so the
     mail and the screen never disagree about the same morning */
  const rollPh = {}; roll.forEach(o => rollPh[o.phone] = true);
  const onRoll = Object.keys(markDetail).filter(p => rollPh[p]);
  const by10 = markedBy10_(markDetail, onRoll);
  const notTrust = onRoll.filter(p => markDetail[p].suspect).length;
  const leaveN = roll.filter(o => !marked[o.phone] && onLeave[o.phone]).length;
  const gapByMandal = {};
  absent.forEach(o => { gapByMandal[o.mandal || '—'] = (gapByMandal[o.mandal || '—'] || 0) + 1; });

  /* the month's filings, and the forecast at the present rate */
  const ish = sheet_('Inspections', HEADERS), im = headMap_(ish, HEADERS);
  const iv = ish.getDataRange().getValues();
  let filed = 0, filedToday = 0, scoreSum = 0, rfN = 0;
  const grades = { A:0, B:0, C:0, D:0 }, doneKeys = {}, mAgg = {}, vDone = [];
  const nrm = s => String(s || '').trim().toLowerCase();
  for(let i = 1; i < iv.length; i++){
    if(rowYm_(iv[i], im.ix) !== ym) continue;
    filed++;
    doneKeys[nrm(iv[i][im.ix.mandal]) + '|' + nrm(iv[i][im.ix.gp])] = true;
    const sc = Number(iv[i][im.ix.score]) || 0;
    scoreSum += sc;
    const mk = nrm(iv[i][im.ix.mandal]);
    mAgg[mk] = mAgg[mk] || { n: 0, score: 0, rf: 0 };
    mAgg[mk].n++; mAgg[mk].score += sc;
    const g = cell_(iv[i], im.ix.grade); if(grades[g] != null) grades[g]++;
    if(cell_(iv[i], im.ix.rf).trim()){ rfN++; mAgg[mk].rf++; }
    if(dateText_(iv[i][im.ix.date]) === today) filedToday++;
    vDone.push([cell_(iv[i], im.ix.mandal), cell_(iv[i], im.ix.gp), sc, cell_(iv[i], im.ix.grade),
      cell_(iv[i], im.ix.rf), cell_(iv[i], im.ix.officer).replace(/\s*\(\d+\)$/, ''), dateText_(iv[i][im.ix.date])]);
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
  /* THE SAME SUMMARY THE CONSOLE SHOWS, IN THE SAME ORDER. The mail used to
     carry six figures and the console nine, computed apart; the Collector had
     to hold two versions of one morning in his head. Every number below is
     read the way the console reads it, from the same rules. */
  const avgScore = filed ? Math.round(scoreSum / filed) : null;
  const tiles = emailStats_([
    { label: 'Present', value: present, sub: 'of ' + roll.length + ' due',
      tone: attPct >= 90 ? 'good' : attPct >= 75 ? 'warn' : 'bad' },
    { label: 'On leave', value: leaveN, sub: 'sanctioned', tone: 'info' },
    { label: 'Not marked', value: absent.length, sub: 'today', tone: absent.length ? 'bad' : 'good' },
    { label: 'Marked by 10:00', value: present ? Math.round(by10 * 100 / present) + '%' : '—',
      sub: by10 + ' of ' + present, tone: present && by10 * 100 / present >= 75 ? 'good' : 'warn' },
    { label: 'Not trustworthy', value: notTrust, sub: 'of ' + present + ' marks',
      tone: notTrust ? 'bad' : 'good' },
    { label: 'Villages done', value: dDone, sub: 'of ' + totalGps + ' · ' + ym,
      tone: remaining === 0 || behindBy === 0 ? 'good' : behindBy <= 3 ? 'warn' : 'bad' },
    { label: 'Filed today', value: filedToday, sub: 'evaluations', tone: 'accent' },
    { label: 'District average', value: avgScore == null ? '—' : avgScore,
      sub: filed + ' filed · ' + ym,
      tone: avgScore == null ? 'info' : avgScore >= 70 ? 'good' : avgScore >= 55 ? 'warn' : 'bad' },
    { label: 'Red flags', value: rfN, sub: 'this month', tone: rfN ? 'warn' : 'good' }
  ]);
  const ganttRows = Object.keys(covM)
    .map(m2 => ({ label: m2, done: covM[m2].done, total: covM[m2].total }))
    .sort((a, b) => (b.done / Math.max(1, b.total)) - (a.done / Math.max(1, a.total)));
  ganttRows.push({ label: 'DISTRICT', done: dDone, total: totalGps });
  /* the evaluations, mandal by mandal, in a table — pace judged against the
     month each mandal has actually had */
  const wdAll = wd.gone + wd.left;
  const paceOf = (done, total) => {
    if(total - done <= 0) return 'complete';
    if(done === 0) return 'nothing yet';
    const need = total / (done / wd.gone);
    if(need <= wdAll) return 'on pace';
    const short = Math.ceil(need - wdAll);
    /* past a point the number stops meaning anything — say so instead */
    return short > 45 ? 'far behind' : short + ' wd short';
  };
  const mandalRows = Object.keys(covM).sort().map(m2 => {
    const a = mAgg[nrm(m2)] || { n: 0, score: 0, rf: 0 }, cM = covM[m2];
    return [m2, cM.done + ' / ' + cM.total, String(cM.total - cM.done),
      a.n ? String(Math.round(a.score / a.n)) : '—', String(a.rf), paceOf(cM.done, cM.total)];
  });
  mandalRows.push(['<b>DISTRICT</b>', '<b>' + dDone + ' / ' + totalGps + '</b>', '<b>' + remaining + '</b>',
    '<b>' + (filed ? Math.round(scoreSum / filed) : '—') + '</b>', '<b>' + rfN + '</b>', '<b>' + paceOf(dDone, totalGps) + '</b>']);

  /* the officer-by-officer register travels as an attachment, never as a
     wall of names in the body — the unmarked first, then the sanctioned,
     then the marked */
  const csvCell = s => { s = String(s == null ? '' : s); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const attRows = [['Status', 'Mandal', 'Name', 'Role', 'Phone', 'Leave type']];
  const stOf = o => marked[o.phone] ? 2 : onLeave[o.phone] ? 1 : 0;
  roll.slice().sort((a, b) => stOf(a) - stOf(b) || String(a.mandal).localeCompare(String(b.mandal)) || String(a.name).localeCompare(String(b.name)))
    .forEach(o => attRows.push([
      marked[o.phone] ? 'Present' : onLeave[o.phone] ? 'On sanctioned leave' : 'NOT MARKED',
      o.mandal || '', o.name, o.role, o.phone,
      !marked[o.phone] && onLeave[o.phone] ? String(onLeave[o.phone]) : '']));
  const attCsv = attRows.map(r => r.map(csvCell).join(',')).join('\r\n');

  /* the village register rides beside it — the pending first, then every
     filing of the month with its score and officer */
  const vRows = [['Status', 'Mandal', 'Village', 'Score', 'Grade', 'Red flags', 'Filed by', 'Date']];
  gRoll.filter(r => !doneKeys[nrm(r.mandal) + '|' + nrm(r.gp)])
    .sort((a, b) => String(a.mandal).localeCompare(String(b.mandal)) || String(a.gp).localeCompare(String(b.gp)))
    .forEach(r => vRows.push(['PENDING', r.mandal, r.gp, '', '', '', '', '']));
  vDone.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[1]).localeCompare(String(b[1])))
    .forEach(r => vRows.push(['Evaluated', r[0], r[1], r[2], r[3], r[4], r[5], r[6]]));
  const vCsv = vRows.map(r => r.map(csvCell).join(',')).join('\r\n');

  /* ---- THE FILING SCHEDULE, in the evening mail (ordered 18.09.2026) ----
     Where the month's plan of work stands, officer by officer. It says who is
     behind and by how much, and it says NOTHING about what that costs, because
     it costs nothing: the schedule raises no notice, no debit and no lock. The
     section is left out entirely when no schedule has been published, rather
     than printing a row of noughts that reads as a district doing nothing. */
  const schP = schPace_(ym, today);
  const schBehind = (schP.officers || []).filter(o => o.behind > 0);
  const schRowsCsv = [['Officer', 'Charge', 'Mandals', 'Assigned', 'Filed', 'Due by today', 'Behind', 'Acknowledged']];
  const schAck = schAcks_(ym);
  (schP.officers || []).forEach(o => schRowsCsv.push([o.name, o.role, (o.mandals || []).join('; '),
    o.assigned, o.filed, o.dueByToday, o.behind, schAck[o.phone] ? 'yes' : 'no']));
  const schCsv = schRowsCsv.map(r => r.map(csvCell).join(',')).join('\r\n');
  const schSec = !schP.officers.length ? '' :
    emailSec_('Filing schedule · ' + ym,
      '<b>' + schP.filed + ' of ' + schP.villages + '</b> scheduled villages filed · <b style="color:' +
      (schP.behind ? '#B91C1C' : '#15803D') + '">' + schP.behind + '</b> past the day set for them · ' +
      schP.workingDaysLeft + ' working day' + (schP.workingDaysLeft === 1 ? '' : 's') + ' left, ' +
      '<b>' + schP.needPerDay + '/day</b> needed · ' +
      Object.keys(schAck).length + ' of ' + schP.officers.length + ' officers have acknowledged it.' +
      (schBehind.length
        ? emailTable_(['Officer', 'Charge', 'Assigned', 'Filed', 'Behind'],
            schBehind.slice(0, 15).map(o => [o.name, o.role, String(o.assigned), String(o.filed),
              '<b style="color:#B91C1C">' + o.behind + '</b>']), '#FDF0EF') +
          (schBehind.length > 15 ? '<div style="margin-top:6px;color:#57647D">…and ' +
            (schBehind.length - 15) + ' more.</div>' : '')
        : '<div style="margin-top:8px;color:#15803D">Every officer is level with his own days.</div>') +
      '<div style="margin-top:8px;color:#57647D;font-size:12px">A schedule is a plan of work. Falling behind it ' +
      'draws a reminder and nothing else — no notice, no debit, no lock. The full schedule, officer by ' +
      'officer, is attached.</div>',
      '#0F766E', '#D8EEEB');

  const secs =
    emailPanel_('The district at ' + dmy_(today), tiles, '#4A40CE') +
    emailPanel_('Filing progress · ' + ym, emailGantt_(ganttRows, wd.gone, wdAll), '#0F766E') +
    emailSec_('Village evaluations · ' + ym,
      '<b>' + dDone + ' of ' + totalGps + '</b> villages evaluated (' + filed + ' filing' + (filed === 1 ? '' : 's') + ', ' + filedToday + ' today) · grades A ' + grades.A + ' · B ' + grades.B + ' · C ' + grades.C + ' · D ' + grades.D + '.' +
      emailTable_(['Mandal', 'Evaluated', 'Pending', 'Avg score', 'Red flags', 'Pace'], mandalRows, '#F4F1FD') +
      '<div style="margin-top:8px">Rate <b>' + rate.toFixed(1) + '/working day</b> over ' + wd.gone + ' gone · ' + wd.left + ' left · needed <b>' + needPerDay + '/day</b>.<br>' +
      'Forecast at the present rate: <b>' + forecast + '</b>.<br>' +
      '<span style="color:#57647D;font-size:12px">The village-by-village register — pending first, then every filing — is attached and opens in Excel.</span></div>',
      '#6D28D9', '#E9E2F8') +
    emailSec_('Attendance · ' + dmy_(today),
      '<b>' + present + '</b> marked · <b>' + leaveN + '</b> on sanctioned leave · <b style="color:' + (absent.length ? '#B91C1C' : '#15803D') + '">' + absent.length + '</b> not marked, of ' + roll.length + ' due.' +
      (gapRows.length ? emailTable_(['Mandal', 'Not marked'], gapRows.slice(0, 12), '#FFF7E8') : '') +
      '<div style="margin-top:8px;color:#57647D;font-size:12px">The officer-by-officer register — every name with its status — is attached and opens in Excel.</div>',
      '#B45309', '#F1E2C2') +
    schSec +
    emailSec_('Awaiting your orders',
      '<b>' + nProp + '</b> notice proposal' + (nProp === 1 ? '' : 's') + ' (Console ▸ Notices)' +
      (nServedToday ? ' · ' + nServedToday + ' served today' : '') +
      ' · <b>' + lvPend + '</b> leave application' + (lvPend === 1 ? '' : 's') + ' waiting.',
      '#BE123C', '#F6D3DB');
  const to = collectorEmail || Session.getEffectiveUser().getEmail();
  if(to){
    MailApp.sendEmail(to, 'SJSP daily report · ' + dmy_(today) + ' · ' + present + ' marked · ' + dDone + '/' + totalGps + ' villages',
      'Attendance ' + present + ' marked, ' + absent.length + ' not; villages ' + dDone + '/' + totalGps + '; ' + forecast + '.',
      { htmlBody: emailShell_('The district, end of day', dmy_(today) + ' · Jangaon', secs),
        /* the BOM keeps Telugu names readable when Excel opens the files */
        attachments: [
          Utilities.newBlob('﻿' + attCsv, 'text/csv', 'SJGP_attendance_' + today + '.csv'),
          Utilities.newBlob('﻿' + vCsv, 'text/csv', 'SJGP_villages_' + ym + '.csv')]
          .concat(schP.officers.length
            ? [Utilities.newBlob('﻿' + schCsv, 'text/csv', 'SJGP_schedule_' + ym + '.csv')] : []) });
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
  /* the schedule reminder goes an hour BEFORE the mandal-wide one, because it
     is the one that stands the other down for the officers it reaches */
  installScheduleTrigger();
  Logger.log('Report triggers installed (Asia/Calcutta):\n' +
    '  scheduleReminders      ~09:00 — every working day, to an officer behind his own schedule.\n' +
    '  villageFilingReminders ~10:00 — from the ' + FILING_REMIND_FROM + 'th, every working day.\n' +
    '  dailyCollectorReport   ~19:00 — one structured mail, once a day, guarded against double sends.');
}

/* ================== THE BACKUP · 29.08.2026 ==================================
   Asked for from the district in these words: "backup entire system and run
   daily backup for all sheet, app script, code and all things."

   WHAT A BACKUP OF THIS SYSTEM ACTUALLY IS. Six things, and they live in six
   different places, which is why nothing until now backed up "the system":
     1. the register — the Google Sheet, fifteen tabs, the government record;
     2. the server — Code.gs and Admin.gs, deployed on Apps Script;
     3. the field app and the console — published as static files;
     4. the documents — the plans, the circulars and the attendance photos,
        which are in Drive already and are the bulk of the whole thing;
     5. the salt in Script Properties, without which not one PIN verifies;
     6. the knowledge of what a good backup even looked like on a given day.
   Copying (1) alone and calling it a backup is how a district discovers, on
   the day it matters, that it holds a spreadsheet and no way to run it.

   WHAT THIS TAKES, AND WHAT IT DELIBERATELY DOES NOT.
   The register is copied twice — a native Sheets copy, which restores in one
   click, and an .xlsx, which opens on a machine that has never heard of
   Google. The server and the app are fetched from the published sources, so
   what is stored is the code that was actually running that morning. The
   documents are INVENTORIED, not copied: seventy thousand attendance photos
   cannot be duplicated nightly, and a manifest naming every file, its id and
   its size is what tells you whether one has gone missing — which is the
   thing a copy of Drive inside Drive was never going to protect you from
   anyway. The salt is NEVER written: only a fingerprint of it, so a salt
   restored by hand can be PROVED to be the right one. A backup that carries
   the district's secret is a second place to lose it from.

   NOTHING IS DESTROYED (rule 7). Retention trashes; it does not delete, so a
   wrong call is recoverable for a further thirty days in Drive's own bin. The
   first of every month is kept for good. Only files this job made, only
   inside the backup folder, only ones whose name carries a date, are ever
   touched — the live register is not in that folder and cannot be reached
   from it.

   IT RUNS TWICE WITHOUT DOUBLING (rule 8). Every step asks whether its own
   output is already there for today, so a nervous second run costs nothing
   and — more usefully — a run that failed halfway is completed by the next
   one instead of starting over.

   AND IT SAYS SO WHEN IT FAILS. Each step is caught on its own: one broken
   step never costs the other six, and the morning mail carries the failure in
   its subject line. A backup that fails quietly is not a backup, it is a
   belief. */
const BACKUP_FOLDER    = 'SJ-SCORE Backups';
const BACKUP_KEEP_DAYS = 30;   /* dailies; set to 0 to keep every one for ever */
const BACKUP_MARK      = 'SJGP-BACKUP';
/* The published app — the exact bytes an officer's handset loads. */
const APP_BASE_URL = 'https://jangaoncdm.github.io/sjscore-app/';
const APP_FILES    = ['index.html','app.js','dashboard.html','sw.js','config.js',
                      'manifest.webmanifest','privacy.html'];
/* The server, read from the repository the deploy pipeline pushes FROM, so no
   new OAuth scope is needed and the live web app is never sent back for
   re-authorisation — on a district system in daily use that is not a small
   thing. Set the script property SCRIPT_API to 1 to take the live project
   through the Apps Script API instead, once that API has been switched on. */
const CODE_BASE_URL = 'https://raw.githubusercontent.com/jangaoncdm/sjscore-app/main/backend/';
const CODE_FILES    = ['Code.gs','Admin.gs','appsscript.json'];

function backupRoot_(){ return getFolder_(DriveApp.getRootFolder(), BACKUP_FOLDER); }
function fileIn_(folder, name){
  const it = folder.getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}
/* first twelve hex of the SHA-256 — enough to prove two values are the same,
   nowhere near enough to be one of them */
function fingerprint_(s){
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s));
  let h = '';
  for(let i = 0; i < 6; i++) h += ('0' + (b[i] & 0xFF).toString(16)).slice(-2);
  return h;
}
function collectorEmail_(){
  const t = uidx_(), v = t.sh.getDataRange().getValues();
  for(let i = 1; i < v.length; i++)
    if(cell_(v[i], t.ix.role).toUpperCase() === 'COLLECTOR')
      return String(v[i][t.ix.email] || '').trim();
  return '';
}

/* ---- the register: the copy that restores, and the copy that travels ---- */
function backupRegister_(root, today){
  const dir = getFolder_(getFolder_(root, 'register'), today.slice(0, 7));
  const name = 'SJGP-register-' + today;
  if(fileIn_(dir, name)) return 'already taken today';
  const copy = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).makeCopy(name, dir);
  try{ copy.setDescription(BACKUP_MARK + ' ' + today); }catch(err){}
  return 'Sheets copy taken';
}
function backupRegisterXlsx_(root, today){
  const dir = getFolder_(getFolder_(root, 'register'), today.slice(0, 7));
  const name = 'SJGP-register-' + today + '.xlsx';
  if(fileIn_(dir, name)) return 'already taken today';
  const id = SpreadsheetApp.getActiveSpreadsheet().getId();
  const res = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + id + '/export?format=xlsx',
    { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if(res.getResponseCode() !== 200) throw new Error('the export answered ' + res.getResponseCode());
  const f = dir.createFile(res.getBlob().setName(name));
  try{ f.setDescription(BACKUP_MARK + ' ' + today); }catch(err){}
  return 'workbook exported';
}

/* ---- the server, and the app the handsets actually load ---- */
function backupCode_(root, today){
  const dir = getFolder_(getFolder_(root, 'code'), today);
  if(fileIn_(dir, 'Code.gs')) return 'already taken today';
  if(PropertiesService.getScriptProperties().getProperty('SCRIPT_API') === '1'){
    const res = UrlFetchApp.fetch('https://script.googleapis.com/v1/projects/' + ScriptApp.getScriptId() + '/content',
      { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if(res.getResponseCode() !== 200)
      throw new Error('the Apps Script API answered ' + res.getResponseCode() +
        ' - switch it on once at script.google.com/home/usersettings, or clear the SCRIPT_API property to read the repository instead');
    const files = JSON.parse(res.getContentText()).files || [];
    files.forEach(f => {
      const ext = f.type === 'JSON' ? '.json' : (f.type === 'HTML' ? '.html' : '.gs');
      dir.createFile(Utilities.newBlob(String(f.source || ''), 'text/plain', f.name + ext));
    });
    return files.length + ' file(s), live from the project';
  }
  let n = 0;
  CODE_FILES.forEach(f => {
    const res = UrlFetchApp.fetch(CODE_BASE_URL + f, { muteHttpExceptions: true });
    if(res.getResponseCode() !== 200) return;
    dir.createFile(Utilities.newBlob(res.getContentText(), 'text/plain', f)); n++;
  });
  if(!n) throw new Error('the repository answered for none of ' + CODE_FILES.join(', '));
  return n + ' file(s), from the repository';
}
function backupApp_(root, today){
  const dir = getFolder_(getFolder_(root, 'app'), today);
  if(fileIn_(dir, 'index.html')) return 'already taken today';
  let n = 0; const missed = [];
  APP_FILES.forEach(f => {
    const res = UrlFetchApp.fetch(APP_BASE_URL + f, { muteHttpExceptions: true });
    if(res.getResponseCode() !== 200){ missed.push(f); return; }
    dir.createFile(Utilities.newBlob(res.getContentText(), 'text/plain', f)); n++;
  });
  if(!n) throw new Error('the published site answered for nothing at ' + APP_BASE_URL);
  return n + ' file(s)' + (missed.length ? ' · not published: ' + missed.join(', ') : '');
}

/* ---- the documents: named one by one where they are few, counted where they
        are many. A manifest is what proves a file was there. ---- */
function backupDriveManifest_(root, today){
  const dir = getFolder_(root, 'manifest');
  const name = 'drive-' + today + '.csv';
  if(fileIn_(dir, name)) return 'already taken today';
  const t0 = Date.now(), BUDGET = 120000;   /* the six-minute wall is real */
  const rows = [['area','path','name','id','mime','bytes','created','url']];
  let listed = 0, counted = 0, bytes = 0, partial = false;
  const q = s => '"' + String(s === null || s === undefined ? '' : s).replace(/"/g, '""') + '"';

  const walk = (folder, areaName, path, listFiles) => {
    if(Date.now() - t0 > BUDGET){ partial = true; return; }
    const fit = folder.getFiles();
    while(fit.hasNext()){
      if(Date.now() - t0 > BUDGET){ partial = true; return; }
      const f = fit.next();
      let sz = 0; try{ sz = Number(f.getSize()) || 0; }catch(err){}
      counted++; bytes += sz;
      if(listFiles){
        let made = ''; try{ made = dateText_(f.getDateCreated()); }catch(err){}
        let mime = ''; try{ mime = f.getMimeType(); }catch(err){}
        rows.push([areaName, path, f.getName(), f.getId(), mime, sz, made, f.getUrl()]); listed++;
      }
    }
    const dit = folder.getFolders();
    while(dit.hasNext()){
      const sub = dit.next();
      walk(sub, areaName, path + '/' + sub.getName(), listFiles);
    }
  };
  const area = (folderName, listFiles) => {
    const it = DriveApp.getRootFolder().getFoldersByName(folderName);
    if(!it.hasNext()) return;
    const before = counted;
    walk(it.next(), folderName, folderName, listFiles);
    if(!listFiles) rows.push([folderName, folderName, '(counted, not listed)', '', '', '', '', (counted - before) + ' file(s)']);
  };
  /* the plans and the circulars are hundreds and are named; the attendance
     photos are tens of thousands and are counted — a nightly copy of those is
     not a backup, it is a second bill */
  area(GPDP_FOLDER, true);
  area(ADV_FOLDER,  true);
  area(ATT_FOLDER,  false);
  area(PHOTO_FOLDER, false);

  dir.createFile(Utilities.newBlob(rows.map(r => r.map(q).join(',')).join('\n'), 'text/csv', name));
  return counted + ' file(s) seen, ' + listed + ' named, ' +
    Math.round(bytes / 1048576) + ' MB' + (partial ? ' - PARTIAL, the walk ran out of time' : '');
}

/* ---- the properties: the names, and proof of the values. Never a value.
        Lose the salt and not one PIN on the register verifies; every officer
        needs a fresh one. The fingerprint is what lets a salt typed back in
        by hand be checked before 280 people are locked out over a typo. ---- */
function backupProps_(root, today){
  const dir = getFolder_(root, 'manifest');
  const name = 'properties-' + today + '.json';
  if(fileIn_(dir, name)) return 'already taken today';
  const all = PropertiesService.getScriptProperties().getProperties() || {};
  const out = {};
  Object.keys(all).sort().forEach(k => {
    const v = String(all[k] === null || all[k] === undefined ? '' : all[k]);
    out[k] = { chars: v.length, fingerprint: fingerprint_(v) };
  });
  dir.createFile(Utilities.newBlob(JSON.stringify({
    note: 'Names and fingerprints only. No value of any property is stored here, and none should ever be. ' +
          'To verify a restored value, fingerprint it the same way: the first 12 hex of its SHA-256.',
    taken: today, properties: out }, null, 2), 'application/json', name));
  return Object.keys(out).length + ' property name(s), no values';
}

/* ---- retention: trashed, never destroyed; the 1st of the month for ever ---- */
function pruneBackups_(root, today){
  if(!BACKUP_KEEP_DAYS) return 'retention off - every backup is kept';
  /* pure UTC arithmetic on the date string. A Date built from a local string
     and shifted is exactly the day-out-by-one this register has been bitten
     by before (rule 3) - and here it would bin a copy a day early. */
  const cut = new Date(Date.UTC(Number(today.slice(0,4)), Number(today.slice(5,7)) - 1,
                                Number(today.slice(8,10))) - BACKUP_KEEP_DAYS * 86400000)
                .toISOString().slice(0, 10);
  const RX = /(\d{4}-\d{2}-\d{2})/;
  let gone = 0, kept = 0;
  const consider = (nm, trash) => {
    const m = RX.exec(String(nm));
    if(!m) return;                                      /* no date: not ours, not touched */
    if(m[1].slice(8, 10) === '01'){ kept++; return; }   /* the month's own copy stands */
    if(m[1] >= cut){ kept++; return; }
    try{ trash(); gone++; }catch(err){}
  };
  const scan = (folder, depth) => {
    const fit = folder.getFiles();
    while(fit.hasNext()){ const f = fit.next(); consider(f.getName(), () => f.setTrashed(true)); }
    if(depth >= 3) return;
    const dit = folder.getFolders();
    while(dit.hasNext()){
      const sub = dit.next();
      if(RX.test(String(sub.getName()))) consider(sub.getName(), () => sub.setTrashed(true));
      else scan(sub, depth + 1);
    }
  };
  scan(root, 0);
  return gone + ' put in the bin (recoverable), ' + kept + ' kept';
}

/* ---- the job itself ---- */
function dailyBackup(){
  const today = today_();
  const root = backupRoot_();
  const done = [], failed = [];
  const step = (what, fn) => {
    try{ done.push({ what: what, note: String(fn() || 'done') }); }
    catch(err){ failed.push({ what: what, why: String((err && err.message) || err) }); }
  };
  /* order matters: the register, the code and the app are what a district
     cannot rebuild, so they are taken first. The Drive walk is last because
     it is the only step that can run out of time, and when it does it must
     cost nothing but itself. */
  step('The register · Sheets copy', () => backupRegister_(root, today));
  step('The register · workbook',    () => backupRegisterXlsx_(root, today));
  step('The server code',            () => backupCode_(root, today));
  step('The app and the console',    () => backupApp_(root, today));
  step('Script properties',          () => backupProps_(root, today));
  step('Retention',                  () => pruneBackups_(root, today));
  step('Drive inventory',            () => backupDriveManifest_(root, today));

  const summary = { taken: today, at: new Date().toISOString(), ok: done, failed: failed };
  try{
    const nm = 'MANIFEST-' + today + '.json';
    const old = fileIn_(root, nm); if(old) old.setTrashed(true);
    root.createFile(Utilities.newBlob(JSON.stringify(summary, null, 2), 'application/json', nm));
  }catch(err){}

  try{
    const to = collectorEmail_() || Session.getEffectiveUser().getEmail();
    if(to){
      const secs =
        emailSec_('Taken', emailTable_(['What', 'Result'], done.map(d => [d.what, d.note]), '#EAF7EF')) +
        (failed.length
          ? emailSec_('NOT taken - this needs attention',
              emailTable_(['What', 'Why'], failed.map(f => [f.what, f.why]), '#FDF0EF'), '#B91C1C', '#F4D6D3')
          : emailSec_('Nothing failed', 'Every part of the system was backed up this morning.')) +
        emailSec_('Where it is',
          'Drive &#9656; <b>' + BACKUP_FOLDER + '</b> &mdash; <code>register/</code> the record, <code>code/</code> the server, ' +
          '<code>app/</code> what the handsets load, <code>manifest/</code> the Drive inventory and the property fingerprints.<br>' +
          'Daily copies are kept ' + BACKUP_KEEP_DAYS + ' days; the 1st of each month is kept permanently. ' +
          'Nothing is deleted &mdash; what falls out of the window goes to Drive&rsquo;s bin.');
      MailApp.sendEmail(to,
        'SJSP · ' + (failed.length ? 'BACKUP INCOMPLETE' : 'backup taken') + ' · ' + dmy_(today),
        (failed.length ? failed.length + ' part(s) of the backup failed: ' + failed.map(f => f.what).join(', ')
                       : 'The whole system was backed up.'),
        { htmlBody: emailShell_(failed.length ? 'Backup incomplete' : 'Backup taken',
            dmy_(today) + ' · ' + BACKUP_FOLDER, secs) });
    }
  }catch(err){}

  PropertiesService.getScriptProperties().setProperty('LAST_BACKUP', today);
  Logger.log('Backup ' + today + ': ' + done.length + ' step(s) done, ' + failed.length + ' failed.\n' +
    done.map(d => '  [ok] ' + d.what + ' - ' + d.note).join('\n') +
    (failed.length ? '\n' + failed.map(f => '  [FAILED] ' + f.what + ' - ' + f.why).join('\n') : ''));
  return summary;
}
/* The one to press by hand for the first full backup. It is the same job:
   idempotent, so pressing it twice on the same day costs nothing, and a run
   that failed halfway is finished rather than restarted. */
function backupNow(){ return dailyBackup(); }
function installBackupTrigger(){
  ScriptApp.getProjectTriggers().forEach(t => {
    if(t.getHandlerFunction() === 'dailyBackup') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyBackup').timeBased().everyDays(1).atHour(1).create();
  Logger.log('Backup trigger installed (Asia/Calcutta):\n' +
    '  dailyBackup ~01:00 - the register, the server, the app, the Drive inventory and the property fingerprints.\n' +
    '  Kept ' + BACKUP_KEEP_DAYS + ' days; the 1st of each month for ever; nothing is ever deleted, only binned.\n' +
    '  Any older copy of this trigger was removed.');
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
    /* WHICH REGISTER THIS ADDRESS SERVES. Both projects run the same bytes, so
       an ok:true proves only that SOMETHING answered — it would say exactly the
       same from a GP address whose TENANT property was never set, and the first
       Gram Palana Officer to sign in would land in the sanitation register.
       The deploy checks this by name. It reveals nothing: the name of the
       register is on the sign-in page. */
    /* AND WHAT THIS BUILD CAN ACTUALLY DO.
       "Is the code I think is live actually live" is a question that came up
       the moment there were two projects: the console offered a button whose
       endpoint the register answered as an unknown request, and nothing short
       of a valid Collector token could tell which of the two was behind. A
       deployment that lags the repository looks exactly like a bug in the
       page. The register now lists the POSTs this build answers, so the
       question is settled by reading, not by reasoning. It reveals nothing:
       these are endpoint names, every one of which re-checks the caller. */
    return json_({ ok:true, stamp:'SJGP-6.9-diag13', tenant:tenant_().key, tenantName:tenant_().name,
      /* READ OFF THE RUNNING CODE, NOT TYPED HERE. A list written by hand
         says what the author believed; it proved exactly nothing when the
         question was whether the deployed build carried an endpoint, because
         the list and the endpoint came from different commits. doPost is
         asked for its own source and the dispatch is read out of it, so this
         cannot say yes to a kind the running build does not answer. */
      kinds:(function(){
        try{
          var src = String(doPost);
          var out = [], m, re = /b\.kind\s*===\s*'([A-Za-z]+)'/g;
          while((m = re.exec(src))){ if(out.indexOf(m[1]) < 0) out.push(m[1]); }
          return out.sort();
        }catch(err){ return ['(could not read: ' + err + ')']; }
      })(),
      /* AND THE ORDER IT WILL ACTUALLY APPLY. A publish assigns a month's
         work to 280 officers and mails it, so the shares it will deal by
         are readable before it is pressed rather than taken on trust. */
      schedule:tenant_().schedule ? { shares:SCH_SHARE, subdivision:SCH_SUBDIVISION } : null,
      can:{ sanction:!!tenant_().sanction, evaluation:!!tenant_().evaluation,
            schedule:!!tenant_().schedule, gpdp:!!tenant_().gpdp,
            placeOfDuty:!!tenant_().placeOfDuty },
      holidays:(function(){ try{ var y=today_().slice(0,4);
        return { year:Number(y), count:Object.keys(holidaySet_()).filter(function(k){
          return String(k).slice(0,4)===y; }).length }; }catch(err){ return null; } })(),
      sanction:tenant_().sanction, placeOfDuty:tenant_().placeOfDuty,
      tzScript:Session.getScriptTimeZone(), tzSheet:sheetTz_(), today:today_(), offToday:offInfo_(today_()), briefKeyStored: !!dk,
      keyEnds: dk ? dk.slice(-6) : '', at:new Date().toISOString() });
  }

  const u = auth_(p.token);
  if(!u) return json_({ ok:false, error:'auth' });
  if(p.op === 'me') return json_({ ok:true, user:u });

  if(p.op === 'gps'){
    let rows = sheet_('GPs', GPS_HEAD()).getDataRange().getValues().slice(1)
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
      if(String(v[i][m.ix.gp]) === String(p.gp || '') && rowYm_(v[i], m.ix) === ymText_(p.ym || '')){
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
    const ymN = ymReq || cycleYm_(today);

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
    /* every located mark in the window, to say where each mandal sits */
    const histFix = [];
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
      if(fl && fg){
        lastFix[ph] = { lat: fl, lng: fg, d: d };
        histFix.push({ mandal: cell_(av[i], am.ix.mandal), lat: fl, lng: fg });
      }
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
          verified:markVerified_(av[i][am.ix.verified]),
          lat:Number(av[i][am.ix.lat])||null, lng:Number(av[i][am.ix.lng])||null,
          acc:Number(av[i][am.ix.accuracy])||null, tz:String(av[i][am.ix.timezone]||''),
          status:st, leaveType:cell_(av[i], am.ix.leaveType),
          marks:marks, firstAt:String(av[i][am.ix.firstMarkAt]||'') || (prev?prev.firstAt:'')};
      }
    }
    const todayRows = Object.keys(todayByPh).map(k => todayByPh[k]);

    /* HOW FAR EACH MARK WAS MADE FROM ITS OWN MANDAL. Read by the Collector,
       and by nobody else: it raises no reminder, no notice, no debit and no
       lock. A distant mark is still a mark. */
    const centres = mandalCentres_(histFix);
    /* the village offices, and which of them each officer holds — empty on a
       register whose roll carries no coordinates, which is SJGP's */
    const places = tenant_().placeOfDuty ? gpPlaces_() : null;
    const dutyGps = {};
    if(places){
      const dt = uidx_(), dv = dt.sh.getDataRange().getValues();
      for(let i = 1; i < dv.length; i++){
        const ph2 = phone10_(dv[i][dt.ix.phone]); if(!ph2) continue;
        const mn = cell_(dv[i], dt.ix.mandal).toLowerCase();
        String(dv[i][dt.ix.gp] || '').split(',').map(x => x.trim()).filter(String)
          .forEach(g => { (dutyGps[ph2] = dutyGps[ph2] || []).push(mn + '|' + g.toLowerCase()); });
      }
    }
    todayRows.forEach(r => {
      /* A DISTANCE OFF AN UNTRUSTWORTHY READING IS NOT A DISTANCE. A network
         guess of ±2 km, or a fix that lands outside the district altogether,
         is a broken reading — not an officer in another state. Those marks are
         already called not trustworthy on their own account, and measuring
         them as well put "509 km from the mandal" against a phone that simply
         never got a fix. */
      const c = centres[String(r.mandal || '').trim()];
      const usable = c && r.lat && r.lng && !suspectMark_(r.lat, r.lng, r.acc, r.tz);
      r.km = usable ? distKm_(r.lat, r.lng, c.lat, c.lng) : null;
      r.far = r.km != null && r.km > FAR_MARK_KM_;
      /* AND, WHERE THE ROLL KNOWS THE OFFICE, the distance from his own place
         of duty — which is a fact the sanitation register has never had. The
         same restraint applies to it: measured off a trustworthy reading only,
         printed, and accusing nobody. */
      if(places && r.lat && r.lng && !suspectMark_(r.lat, r.lng, r.acc, r.tz)){
        const dd = dutyDistance_(places, dutyGps[r.phone] || [], r.lat, r.lng);
        if(dd){ r.dutyKm = dd.km; r.dutyGp = dd.gp; }
      }
    });

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
      const ym = rowYm_(iv[i], im.ix); if(!ym) continue;
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
    /* ONE LINE PER APPLICATION. Twins are folded and the decided row kept —
       otherwise a leftover PENDING row stands in Awaiting your orders asking
       for an order the Collector passed days ago, and no order can clear it,
       because the order is refused as already passed. Reported from the
       district in those words: leave already sanctioned but still showing in
       waiting. Nothing is dropped from the Sheet; this is the reading. */
    const lp = [], lr = [];
    const lAll = [];
    for(let i = 1; i < lv.length; i++){
      lAll.push({id:cell_(lv[i], lm.ix.id),
        name:cell_(lv[i], lm.ix.name), role:cell_(lv[i], lm.ix.role), mandal:cell_(lv[i], lm.ix.mandal),
        type:cell_(lv[i], lm.ix.type), from:dateText_(lv[i][lm.ix.fromDate]), to:dateText_(lv[i][lm.ix.toDate]),
        days:Number(lv[i][lm.ix.days])||0, status:String(lv[i][lm.ix.status]||'PENDING'),
        decidedAt:String(lv[i][lm.ix.decidedAt]||''),
        appliedAt:String(lv[i][lm.ix.appliedAt]||'')});
    }
    leaveFold_(lAll).forEach(row => { (row.status === 'PENDING' ? lp : lr).push(row); });
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
      ymCur:cycleYm_(today), ymFrom:cycleFrom_(ymN), ymTo:cycleTo_(ymN),
      /* officers = every active row. due = those the register actually expects
         a mark from: not the Collector, and not a role whose attendance is
         voluntary. The console divided by officers-1 and so counted the MSOs
         among the due, understating the district against the Collector's own
         order of 19.08.2026. */
      totals:{officers:officers.length, gps:gRoll.length,
              due:officers.filter(o => String(o.role).toUpperCase() !== 'COLLECTOR' &&
                                       !attExempt_(o.role)).length},
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
    /* one line per application here too — a twin on the register must not
       raise a second card on the phone, nor a second entry in the Collector's
       waiting list, nor be sanctioned twice against the year */
    rows = leaveFold_(rows);
    rows.sort((a,b) => String(b.appliedAt).localeCompare(String(a.appliedAt)));
    return json_({ ok:true, rows:rows.slice(0, 400) });
  }

  /* the plan register: an officer sees his own line, the district sees the roll.
     A REGISTER THAT KEEPS NO PLAN ANSWERS NO QUESTIONS ABOUT ONE. The upload
     was refused and gpdpDue_ answered false, but the read was still served,
     so a stale handset could go on drawing a plan screen off it. The server
     is the authority (rule 6): it says plainly that this register does not
     keep one, rather than returning an empty roll that reads as "nobody has
     filed". */
  if(p.op === 'gpdp'){
    if(!tenant_().gpdp) return json_({ ok:false, error:'This register does not call for a development plan.' });
    return gpdpRegister_(u, p.year);
  }
  /* the filing schedule: an officer sees his own villages and his own pace,
     the Collector with all=1 sees the district's */
  if(p.op === 'schedule') return schRegister_(u, p);
  if(p.op === 'advisory') return advisoryRegister_(u, p.id);
  /* the officer roll, for the console's Admin view */
  if(p.op === 'roll') return rollRegister_(u);
  /* the sky over the district — one call an hour, cached, keyless */
  if(p.op === 'weather') return weatherRead_(u, p.draft === '1');

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
      o.date = dateText_(o.date); o.ym = fileYm_(o);   /* the date decides, not
                                                          the label some handset
                                                          left on the row */
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


/* ============================================================================
 * GPDP · THE PLAN REGISTER
 * ----------------------------------------------------------------------------
 * Every active officer but the Collector is called for a plan. An MSO's
 * ATTENDANCE is voluntary by the order of 19.08.2026; that order is about
 * attendance and nothing else, so it does not excuse him a document.
 * ========================================================================== */

/* The plan year runs with the financial year: a plan filed in March 2027
   belongs to 2026-27, not to 2027-28. Reading it off the calendar year would
   split one year of filings across two folders every April. */
function gpdpYear_(d){
  const dt = d || new Date();
  const y = Number(Utilities.formatDate(dt, Session.getScriptTimeZone(), 'yyyy'));
  const m = Number(Utilities.formatDate(dt, Session.getScriptTimeZone(), 'MM'));
  const start = m >= 4 ? y : y - 1;
  return start + '-' + ('0' + ((start + 1) % 100)).slice(-2);
}
function gpdpExt_(name){
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}
/* Who the register expects a plan from. The Collector calls for it; he is not
   called upon by it. */
function gpdpDue_(role){
  /* AND NOT AT ALL ON A REGISTER THAT WAS NEVER ASKED FOR ONE. */
  if(!tenant_().gpdp) return false;
  const r = String(role || '').toUpperCase();
  return !!r && r !== 'COLLECTOR';
}

/* ---- the officer files one ---- */
function saveGpdp_(b, u){
  const f = b.file || {};
  const name = String(f.name || '').trim();
  const ext = gpdpExt_(name);
  if(!name || !GPDP_EXT[ext])
    return json_({ ok:false, error:'A plan must be a PDF, a Word document or an Excel workbook. This one is ' +
      (ext ? ('a .' + ext) : 'without a file type') + '.' });
  if(!f.b64) return json_({ ok:false, error:'The file did not arrive. Try again where the signal is better.' });
  const sizeKB = Math.round((String(f.b64).length * 3 / 4) / 1024);
  if(sizeKB > GPDP_MAX_KB)
    return json_({ ok:false, error:'That file is about ' + Math.round(sizeKB / 1024) + ' MB. The limit is ' +
      Math.round(GPDP_MAX_KB / 1024) + ' MB — please send a smaller copy.' });

  const year = gpdpYear_();
  const gp = (u.gps && u.gps.length) ? u.gps.join(', ') : '';

  /* DRIVE FIRST, AND OUTSIDE THE LOCK. The photograph path learned this on
     19.08.2026: one slow upload holding the script lock starved the whole
     district's endpoint. Drive may be slow; the register must not wait on it. */
  let url = '', fileId = '';
  try{
    const root = getFolder_(DriveApp.getRootFolder(), GPDP_FOLDER);
    const into = getFolder_(getFolder_(root, year), clean_(u.mandal) || 'District');
    const safe = 'GPDP_' + year + '_' + (clean_(u.mandal) || 'District') + '_' +
      (clean_(gp) || String(u.role || '')) + '_' + clean_(u.name) + '_' + u.phone + '.' + ext;
    const file = into.createFile(Utilities.newBlob(Utilities.base64Decode(f.b64), GPDP_EXT[ext], safe));
    fileId = file.getId();
    url = file.getUrl();
    try{ file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(err){}
  }catch(err){
    return json_({ ok:false, error:'The district could not store the file (' + err + '). Nothing was recorded — try again.' });
  }

  const sh = sheet_('GPDP', GPDP_HEAD), m = headMap_(sh, GPDP_HEAD);
  const lock = LockService.getScriptLock();
  try{ lock.waitLock(20000); }catch(err){ return json_({ ok:false, error:'busy — try again' }); }
  try{
    /* NOTHING IS DESTROYED. A second filing does not overwrite the first: the
       earlier row is marked REPLACED and stays, so the district can always
       produce what was filed and when. */
    const v = sh.getDataRange().getValues();
    for(let i = 1; i < v.length; i++){
      if(phone10_(v[i][m.ix.phone]) !== u.phone) continue;
      if(String(v[i][m.ix.year]).replace(/^'/, '') !== year) continue;
      if(String(v[i][m.ix.status] || 'ACTIVE') !== 'ACTIVE') continue;
      sh.getRange(i + 1, m.ix.status + 1).setValue('REPLACED');
    }
    const row = new Array(m.width).fill('');
    const put = (k, val) => { if(m.ix[k] >= 0) row[m.ix[k]] = val; };
    put('id', 'GPDP-' + Utilities.getUuid().slice(0, 8));
    put('year', "'" + year); put('phone', "'" + u.phone); put('name', u.name);
    put('role', u.role); put('mandal', u.mandal || ''); put('gp', gp);
    put('fileName', name); put('mime', GPDP_EXT[ext]); put('sizeKB', sizeKB);
    put('fileId', fileId); put('url', url);
    put('uploadedAt', String(b.at || new Date().toISOString()));
    put('receivedAt', new Date().toISOString());
    put('status', 'ACTIVE'); put('note', String(b.note || '').slice(0, 300));
    sh.appendRow(row);
  } finally { lock.releaseLock(); }
  return json_({ ok:true, url:url, fileName:name, year:year, sizeKB:sizeKB,
                 uploadedAt:new Date().toISOString() });
}

/* ---- the register, read ----
   An officer gets his own line. The Collector and the district roles get the
   whole roll, every officer on it, with a plan against his name or the plain
   fact that there is none. */
function gpdpRegister_(u, yearReq){
  const year = String(yearReq || gpdpYear_()).replace(/^'/, '');
  const sh = sheet_('GPDP', GPDP_HEAD), m = headMap_(sh, GPDP_HEAD);
  const v = sh.getDataRange().getValues();
  const mine = {}, count = {};
  for(let i = 1; i < v.length; i++){
    const ph = phone10_(v[i][m.ix.phone]); if(!ph) continue;
    if(String(v[i][m.ix.year]).replace(/^'/, '') !== year) continue;
    count[ph] = (count[ph] || 0) + 1;
    if(String(v[i][m.ix.status] || 'ACTIVE') !== 'ACTIVE') continue;
    mine[ph] = {
      id: cell_(v[i], m.ix.id), fileName: cell_(v[i], m.ix.fileName),
      url: cell_(v[i], m.ix.url), sizeKB: Number(v[i][m.ix.sizeKB]) || 0,
      uploadedAt: String(v[i][m.ix.uploadedAt] || ''),
      receivedAt: String(v[i][m.ix.receivedAt] || ''),
      note: cell_(v[i], m.ix.note)
    };
  }

  /* the officer's own line */
  if(!districtRole_(u.role)){
    return json_({ ok:true, year:year, mine: mine[u.phone] || null,
                   due: gpdpDue_(u.role), maxMB: Math.round(GPDP_MAX_KB / 1024),
                   accepts: Object.keys(GPDP_EXT) });
  }

  const t = uidx_(), uv = t.sh.getDataRange().getValues(), seen = {}, roll = [];
  for(let i = 1; i < uv.length; i++){
    const ph = phone10_(uv[i][t.ix.phone]); if(!ph || seen[ph]) continue; seen[ph] = true;
    if(String(uv[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    const role = cell_(uv[i], t.ix.role).toUpperCase();
    if(!gpdpDue_(role)) continue;
    const f = mine[ph] || null;
    roll.push({ phone: ph, name: cell_(uv[i], t.ix.name), role: role,
                mandal: cell_(uv[i], t.ix.mandal), gp: cell_(uv[i], t.ix.gp),
                uploaded: !!f, fileName: f ? f.fileName : '', url: f ? f.url : '',
                sizeKB: f ? f.sizeKB : 0,
                uploadedAt: f ? (f.receivedAt || f.uploadedAt) : '',
                filings: count[ph] || 0 });
  }
  roll.sort(function(a, b2){
    return String(a.mandal || '').localeCompare(String(b2.mandal || '')) ||
           String(a.name || '').localeCompare(String(b2.name || ''));
  });
  const up = roll.filter(r => r.uploaded).length;
  const byMandal = {};
  roll.forEach(r => {
    const k = r.mandal || 'Unassigned';
    byMandal[k] = byMandal[k] || { mandal: k, due: 0, uploaded: 0 };
    byMandal[k].due++; if(r.uploaded) byMandal[k].uploaded++;
  });
  let folderUrl = '';
  try{
    folderUrl = getFolder_(getFolder_(DriveApp.getRootFolder(), GPDP_FOLDER), year).getUrl();
  }catch(err){ folderUrl = ''; }
  return json_({ ok:true, year:year, roll:roll, folderUrl:folderUrl,
                 totals:{ due: roll.length, uploaded: up, pending: roll.length - up },
                 coverage: Object.keys(byMandal).sort().map(k => byMandal[k]),
                 maxMB: Math.round(GPDP_MAX_KB / 1024), accepts: Object.keys(GPDP_EXT) });
}


/* ============================================================================
 * ADVISORIES · a circular the district puts in front of every officer
 * ----------------------------------------------------------------------------
 * The Collector publishes one document with one line of instruction. It opens
 * on every officer's home screen the next time the app is opened, and stays
 * there until he acknowledges it. The district can then say, by name, who has
 * read it and who has not.
 *
 * AN ACKNOWLEDGEMENT IS RECEIPT, NOT COMPLIANCE. It records that the officer
 * saw the circular. It is not evidence that he acted on it, and nothing here
 * may be quoted as though it were — the notice ladder already says the same
 * thing about an acknowledged show-cause notice.
 *
 * NOTHING IS DESTROYED. Publishing a new advisory retires the standing one to
 * SUPERSEDED; it does not delete it, and the acknowledgements against it stay
 * exactly where they are.
 * ========================================================================== */
const ADV_FOLDER = 'SJ-SCORE Advisories';
/* 'audience' is the ROLE the circular addresses (ALL, or PS/MPDO/MPO/MSO) and
   'mandals' narrows it to a list of mandals (empty means every mandal). The two
   compose: PS + Chilpur,Jangaon addresses the Secretaries of those two mandals
   and nobody else. Adding a column to a *_HEAD array is safe — ensureHeaders_
   appends it and no migration is needed. */
const ADV_HEAD = ['id','title','message','fileName','mime','sizeKB','fileId','url',
                  'publishedAt','publishedBy','audience','mandals','status'];
const ADV_ACK_HEAD = ['advId','phone','name','role','mandal','ackAt','receivedAt'];
const ADV_MAX_KB = 12 * 1024;
/* a circular may be a PDF, a Word file or an image of the signed page */
const ADV_EXT = {
  pdf:'application/pdf',
  doc:'application/msword',
  docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png'
};

/* ---- the Collector publishes one ---- */
function publishAdvisory_(b, u){
  if(!districtRole_(u.role)) return json_({ ok:false, error:'Only the district may publish an advisory.' });
  const title = String(b.title || '').trim();
  const message = String(b.message || '').trim();
  if(!title) return json_({ ok:false, error:'An advisory needs a title.' });
  if(!message) return json_({ ok:false, error:'An advisory needs a line of instruction — that is what the officer reads first.' });

  let url = String(b.url || '').trim(), fileId = '', fileName = '', mime = '', sizeKB = 0;
  const f = b.file || {};
  if(f.b64 && f.name){
    const ext = gpdpExt_(f.name);
    if(!ADV_EXT[ext]) return json_({ ok:false, error:'An advisory may be a PDF, a Word document or an image.' });
    sizeKB = Math.round((String(f.b64).length * 3 / 4) / 1024);
    if(sizeKB > ADV_MAX_KB) return json_({ ok:false, error:'That file is about ' +
      Math.round(sizeKB / 1024) + ' MB. The limit is ' + Math.round(ADV_MAX_KB / 1024) + ' MB.' });
    try{
      const root = getFolder_(DriveApp.getRootFolder(), ADV_FOLDER);
      const into = getFolder_(root, gpdpYear_());
      const file = into.createFile(Utilities.newBlob(Utilities.base64Decode(f.b64), ADV_EXT[ext],
        'ADV_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd') + '_' + clean_(title) + '.' + ext));
      fileId = file.getId(); url = file.getUrl(); fileName = String(f.name); mime = ADV_EXT[ext];
      try{ file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(err){}
    }catch(err){
      return json_({ ok:false, error:'The district could not store the file (' + err + '). Nothing was published.' });
    }
  }

  const sh = sheet_('Advisories', ADV_HEAD), m = headMap_(sh, ADV_HEAD);
  const lock = LockService.getScriptLock();
  try{ lock.waitLock(20000); }catch(err){ return json_({ ok:false, error:'busy — try again' }); }
  let id = '';
  try{
    /* the standing circular steps down; it is not deleted, and the
       acknowledgements already given against it stand */
    const v = sh.getDataRange().getValues();
    for(let i = 1; i < v.length; i++)
      if(String(v[i][m.ix.status] || 'ACTIVE') === 'ACTIVE')
        sh.getRange(i + 1, m.ix.status + 1).setValue('SUPERSEDED');
    id = 'ADV-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') +
         '-' + Utilities.getUuid().slice(0, 4);
    const row = new Array(m.width).fill('');
    const put = (k, val) => { if(m.ix[k] >= 0) row[m.ix[k]] = val; };
    put('id', id); put('title', title); put('message', message);
    put('fileName', fileName); put('mime', mime); put('sizeKB', sizeKB);
    put('fileId', fileId); put('url', url);
    put('publishedAt', new Date().toISOString());
    put('publishedBy', u.name + ' (' + u.role + ')');
    put('audience', String(b.audience || 'ALL').toUpperCase());
    put('mandals', advMandalList_(b.mandals).join(', '));
    put('status', 'ACTIVE');
    sh.appendRow(row);
  } finally { lock.releaseLock(); }
  admAudit_('ADVISORY PUBLISHED', title, id + ' · to ' + String(b.audience || 'ALL'));
  return json_({ ok:true, id:id, url:url, title:title });
}

/* EVERY CIRCULAR THE DISTRICT HAS ISSUED, newest first. A superseded one is
   retired, never deleted — and the acknowledgements given against it stand
   exactly where they were. The console reads this so the Collector can look
   back at what he issued in June and see who read it, which he could not do
   before: publishing a new circular took the old register off his screen and
   it looked as though the tracking had been thrown away. */
function advAll_(){
  const sh = sheet_('Advisories', ADV_HEAD), m = headMap_(sh, ADV_HEAD);
  const v = sh.getDataRange().getValues(), out = [];
  for(let i = v.length - 1; i >= 1; i--){
    const id = cell_(v[i], m.ix.id); if(!id) continue;
    out.push({ id: id, title: cell_(v[i], m.ix.title), message: cell_(v[i], m.ix.message),
               fileName: cell_(v[i], m.ix.fileName), url: cell_(v[i], m.ix.url),
               audience: cell_(v[i], m.ix.audience) || 'ALL',
               mandals: advMandalList_(cell_(v[i], m.ix.mandals)),
               publishedAt: String(v[i][m.ix.publishedAt] || ''),
               publishedBy: cell_(v[i], m.ix.publishedBy),
               status: String(v[i][m.ix.status] || 'ACTIVE') });
  }
  return out;
}
/* the active circular, whatever else is on the tab */
function activeAdvisory_(){
  const sh = sheet_('Advisories', ADV_HEAD), m = headMap_(sh, ADV_HEAD);
  const v = sh.getDataRange().getValues();
  for(let i = v.length - 1; i >= 1; i--){
    /* A BLANK ROW IS NOT A CIRCULAR. An empty status reads as ACTIVE, so one
       stray blank row at the foot of the tab became "the standing advisory" —
       an id-less circular that every phone would open and none could ever
       dismiss, because the handset remembers what it acknowledged by id. */
    if(!cell_(v[i], m.ix.id)) continue;
    if(String(v[i][m.ix.status] || 'ACTIVE') !== 'ACTIVE') continue;
    return { id: cell_(v[i], m.ix.id), title: cell_(v[i], m.ix.title),
             message: cell_(v[i], m.ix.message), fileName: cell_(v[i], m.ix.fileName),
             url: cell_(v[i], m.ix.url), audience: cell_(v[i], m.ix.audience) || 'ALL',
             mandals: advMandalList_(cell_(v[i], m.ix.mandals)),
             publishedAt: String(v[i][m.ix.publishedAt] || ''),
             publishedBy: cell_(v[i], m.ix.publishedBy) };
  }
  return null;
}
/* a mandal list, however it was written: an array, a comma string, or nothing */
function advMandalList_(v){
  if(v == null || v === '') return [];
  const arr = Array.isArray(v) ? v : String(v).split(',');
  const out = [], seen = {};
  arr.forEach(x => {
    const t = String(x || '').trim();
    if(!t) return;
    const k = t.toLowerCase();
    if(seen[k]) return;
    seen[k] = true; out.push(t);
  });
  return out;
}
/* WHO A CIRCULAR IS ADDRESSED TO — a role and a place, and they compose.
   audience: ALL, or one of PS / MPDO / MPO / MSO.
   mandals : empty for the whole district, or the mandals it is confined to.
   The Collector is never addressed by one; he issues them. Mandal names are
   matched case-blind and trimmed, because the roll spells "Ghanpur (Stn)"
   three ways and a circular must not miss a mandal over a capital letter. */
function advApplies_(adv, role, mandal){
  const r = String(role || '').toUpperCase();
  if(r === 'COLLECTOR') return false;
  const a = String((adv && adv.audience) || 'ALL').toUpperCase();
  if(a !== 'ALL' && a !== r) return false;
  const ms = advMandalList_(adv && adv.mandals);
  if(!ms.length) return true;
  const mine = String(mandal || '').trim().toLowerCase();
  if(!mine) return false;          /* an officer with no mandal is not in one */
  return ms.some(x => String(x).trim().toLowerCase() === mine);
}

/* ---- an officer acknowledges ---- */
function ackAdvisory_(b, u){
  const adv = activeAdvisory_();
  const id = String(b.id || (adv && adv.id) || '');
  if(!id) return json_({ ok:false, error:'There is no advisory standing.' });
  const sh = sheet_('AdvAck', ADV_ACK_HEAD), m = headMap_(sh, ADV_ACK_HEAD);
  const lock = LockService.getScriptLock();
  try{ lock.waitLock(20000); }catch(err){ return json_({ ok:false, error:'busy — try again' }); }
  try{
    /* IDEMPOTENT. A double tap, or a re-send after the signal returned, must
       not write a second receipt against the same officer. */
    const v = sh.getDataRange().getValues();
    for(let i = 1; i < v.length; i++)
      if(String(v[i][m.ix.advId]) === id && phone10_(v[i][m.ix.phone]) === u.phone)
        return json_({ ok:true, already:true, ackAt:String(v[i][m.ix.ackAt] || '') });
    const row = new Array(m.width).fill('');
    const put = (k, val) => { if(m.ix[k] >= 0) row[m.ix[k]] = val; };
    put('advId', id); put('phone', "'" + u.phone); put('name', u.name);
    put('role', u.role); put('mandal', u.mandal || '');
    /* the handset's claim is kept, but the district's own clock is what the
       register is read by — the phone's clock is not evidence */
    put('ackAt', String(b.at || new Date().toISOString()));
    put('receivedAt', new Date().toISOString());
    sh.appendRow(row);
  } finally { lock.releaseLock(); }
  return json_({ ok:true, ackAt:new Date().toISOString() });
}

/* ---- the register, read ---- */
function advisoryRegister_(u, idReq){
  /* THE WHOLE HISTORY, READ ONCE — the circular that stands, the one asked
     for, and the tally against every one of them all come out of this.
     An OFFICER is only ever shown the circular that stands: a retired one is
     history, not an instruction. The DISTRICT may open any of them. */
  const all = advAll_();
  const standing = all.filter(x => x.status === 'ACTIVE')[0] || null;
  const want = String(idReq || '');
  const adv = (districtRole_(u.role) && want)
            ? (all.filter(x => x.id === want)[0] || standing)
            : standing;
  /* WITH NOTHING STANDING, THE DISTRICT STILL GETS ITS ROLL. Returning a bare
     "no advisory" left the console showing an empty section, and it reads as
     though the tracking is missing rather than as though nothing has been
     issued. The Collector is shown who WOULD be addressed, so the section is
     alive before the first circular as well as after it. */
  const id = String((adv && adv.id) || idReq || '');
  const sh = sheet_('AdvAck', ADV_ACK_HEAD), m = headMap_(sh, ADV_ACK_HEAD);
  const v = sh.getDataRange().getValues();
  const ack = {}, mine = {};
  for(let i = 1; i < v.length; i++){
    const aid = String(v[i][m.ix.advId] || ''); if(!aid) continue;
    const ph = phone10_(v[i][m.ix.phone]); if(!ph) continue;
    const at = String(v[i][m.ix.receivedAt] || v[i][m.ix.ackAt] || '');
    if(id && aid === id) ack[ph] = at;
    /* AND EVERY CIRCULAR THIS OFFICER HAS ALREADY SIGNED FOR. The list under
       More ▸ Advisories took its receipts from the standing circular alone,
       so an officer who had acknowledged June's circular was shown it as unread
       again the moment July's was issued — his own record of what he had read
       disappeared behind the newest one. */
    if(ph === u.phone) mine[aid] = at;
  }

  if(!districtRole_(u.role) && !standing) return json_({ ok:true, advisory:null, recent:[] });

  if(!districtRole_(u.role)){
    /* THE CIRCULARS STAY IN THE APP. An officer must be able to go back and
       read what the district has issued — a message he can only see once is a
       message he cannot act on a week later. The standing one comes with its
       acknowledgement; the ones it replaced come as a list he can reopen. */
    const shA = sheet_('Advisories', ADV_HEAD), mA = headMap_(shA, ADV_HEAD);
    const vA = shA.getDataRange().getValues(), recent = [];
    for(let i = vA.length - 1; i >= 1 && recent.length < 8; i--){
      const role = String(u.role || '').toUpperCase();
      const one = { id: cell_(vA[i], mA.ix.id), title: cell_(vA[i], mA.ix.title),
                    message: cell_(vA[i], mA.ix.message), url: cell_(vA[i], mA.ix.url),
                    audience: cell_(vA[i], mA.ix.audience) || 'ALL',
                    publishedAt: String(vA[i][mA.ix.publishedAt] || ''),
                    publishedBy: cell_(vA[i], mA.ix.publishedBy),
                    standing: String(vA[i][mA.ix.status] || 'ACTIVE') === 'ACTIVE' };
      if(!advApplies_(one, role, u.mandal)) continue;
      one.acknowledged = !!mine[one.id];
      one.ackAt = mine[one.id] || '';
      recent.push(one);
    }
    return json_({ ok:true, advisory: advApplies_(adv, u.role, u.mandal) ? adv : null,
                   acknowledged: !!ack[u.phone], ackAt: ack[u.phone] || '',
                   recent: recent });
  }

  const t = uidx_(), uv = t.sh.getDataRange().getValues(), seen = {}, roll = [];
  for(let i = 1; i < uv.length; i++){
    const ph = phone10_(uv[i][t.ix.phone]); if(!ph || seen[ph]) continue; seen[ph] = true;
    if(String(uv[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    const role = cell_(uv[i], t.ix.role).toUpperCase();
    if(!advApplies_(adv || { audience:'ALL' }, role, cell_(uv[i], t.ix.mandal))) continue;
    roll.push({ phone: ph, name: cell_(uv[i], t.ix.name), role: role,
                mandal: cell_(uv[i], t.ix.mandal), gp: cell_(uv[i], t.ix.gp),
                acknowledged: !!ack[ph], ackAt: ack[ph] || '' });
  }
  roll.sort(function(a, b2){
    return String(a.mandal || '').localeCompare(String(b2.mandal || '')) ||
           String(a.name || '').localeCompare(String(b2.name || ''));
  });
  const done = roll.filter(r => r.acknowledged).length;
  const byMandal = {};
  roll.forEach(r => {
    const k = r.mandal || 'Unassigned';
    byMandal[k] = byMandal[k] || { mandal: k, due: 0, acknowledged: 0 };
    byMandal[k].due++; if(r.acknowledged) byMandal[k].acknowledged++;
  });
  /* THE COMPOSER MUST BE ABLE TO SAY WHO IT WILL REACH, BEFORE IT REACHES
     THEM. Counts of the whole roll by role, by mandal, and by the two
     together — a few dozen numbers rather than 280 rows, and enough for the
     console to say "this reaches 23 officers" while the Collector is still
     choosing. */
  const counts = { byRole:{}, byMandal:{}, byRoleMandal:{}, mandals:[], total:0 };
  const seen2 = {}, seenM = {};
  for(let i = 1; i < uv.length; i++){
    const ph = phone10_(uv[i][t.ix.phone]); if(!ph || seen2[ph]) continue; seen2[ph] = true;
    if(String(uv[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    const role = cell_(uv[i], t.ix.role).toUpperCase();
    if(role === 'COLLECTOR') continue;
    const md = cell_(uv[i], t.ix.mandal) || 'Unassigned';
    counts.total++;
    counts.byRole[role] = (counts.byRole[role] || 0) + 1;
    counts.byMandal[md] = (counts.byMandal[md] || 0) + 1;
    const k = role + '|' + md;
    counts.byRoleMandal[k] = (counts.byRoleMandal[k] || 0) + 1;
    if(!seenM[md]){ seenM[md] = true; counts.mandals.push(md); }
  }
  counts.mandals.sort();

  /* EVERY CIRCULAR, WITH ITS OWN TALLY. Read in one pass: the receipts are
     grouped by circular, and each circular's roll is counted by applying its
     own audience to the officers already gathered above. A few hundred
     comparisons, and the Collector never loses sight of what he issued. */
  const ackBy = {};
  for(let i = 1; i < v.length; i++){
    const aid = String(v[i][m.ix.advId] || ''); if(!aid) continue;
    const ph2 = phone10_(v[i][m.ix.phone]); if(!ph2) continue;
    (ackBy[aid] = ackBy[aid] || {})[ph2] = true;
  }
  const everyone = [];
  const seen3 = {};
  for(let i = 1; i < uv.length; i++){
    const ph = phone10_(uv[i][t.ix.phone]); if(!ph || seen3[ph]) continue; seen3[ph] = true;
    if(String(uv[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    const role = cell_(uv[i], t.ix.role).toUpperCase();
    if(role === 'COLLECTOR') continue;
    everyone.push({ phone: ph, role: role, mandal: cell_(uv[i], t.ix.mandal) });
  }
  const list = all.map(a2 => {
    const got = ackBy[a2.id] || {};
    let due = 0, done2 = 0;
    everyone.forEach(o => {
      if(!advApplies_(a2, o.role, o.mandal)) return;
      due++; if(got[o.phone]) done2++;
    });
    return { id:a2.id, title:a2.title, publishedAt:a2.publishedAt, status:a2.status,
             audience:a2.audience, mandals:a2.mandals, url:a2.url,
             due:due, acknowledged:done2, pending:due - done2 };
  });

  return json_({ ok:true, advisory:adv, roll:roll, list:list,
                 viewing: adv ? adv.id : '', standing: standing ? standing.id : '',
                 totals:{ due: roll.length, acknowledged: done, pending: roll.length - done },
                 coverage: Object.keys(byMandal).sort().map(k => byMandal[k]),
                 roll_counts: counts });
}

/* Admin.gs owns the Audit tab, but Code.gs publishes an advisory, so it needs
   its own way in. Same tab, same shape, signed as the console. */
function admAudit_(action, subject, detail){
  try{
    const sh = sheet_('Audit', ['at','action','subject','detail','by']);
    sh.appendRow([new Date().toISOString(), action, subject, detail, 'District Operations Center (console)']);
  }catch(err){}
}



/* ============================================================================
 * THE OFFICER ROLL, FROM THE CONSOLE
 * ----------------------------------------------------------------------------
 * Registering an officer, giving him his PIN back and taking him off the roll
 * used to mean the Apps Script editor: a line in a FIELD_FIXES batch, a deploy,
 * and the Collector reading a log. Asked for on 25.08.2026 to be on the console
 * where the rest of the district's work is done.
 *
 * THE COLLECTOR ALONE. Every one of these re-checks the role on the server
 * against his own token — the console is a web page and its convenience is
 * never the authority (rule 6). A DPO or an MPDO gets the same refusal a
 * Secretary would.
 *
 * NOTHING IS DESTROYED. There is no delete here and there will not be one.
 * Taking an officer off the roll writes Active = FALSE on his rows; the rows
 * stay, and so does everything that points at them — his attendance, his
 * notices, his leave, his plan. Deleting the row would orphan all of it and a
 * file could no longer be produced from the register, which is the whole of
 * rule 7. It is reversible: putting him back on the roll writes TRUE again.
 *
 * A PIN IS SHOWN ONCE. It is returned in the answer to the call that made it,
 * printed on the console, and written nowhere — not to the Audit tab, which
 * records only that a PIN was set, on which number and by whom.
 * ========================================================================== */

/* The PIN for a number TODAY. Seeded from the number and the date, so pressing
   the button twice in one morning yields the same PIN and the second press
   changes nothing — the lesson of the 28.07 batch, which seeded from the day
   it ran and would have re-scrambled PINs already circulated on a later
   re-run. Admin.gs's resetOnePin reads the same function, so the console and
   the editor cannot hand out two different PINs for the same officer. */
function dayPin_(phone){
  return String(1000 + (parseInt(hash_(phone10_(phone) + '|' + today_(), 'fix2')
    .replace(/\D/g, '').slice(0, 6) || '0', 10) % 9000));
}

/* every row carrying a number, folded into one line for the console */
function rollRows_(t, v, p){
  const out = [];
  for(let i = 1; i < v.length; i++) if(phone10_(v[i][t.ix.phone]) === p) out.push(i);
  return out;
}

/* op=roll — the officer roll as the console shows it. Collector only: it
   carries every officer's mobile number, which is not a thing to hand to a
   mandal login. */
function rollRegister_(u){
  if(u.role !== 'COLLECTOR') return json_({ ok:false, error:'The roll is the Collector’s.' });
  const t = uidx_(), v = t.sh.getDataRange().getValues();
  const by = {}, order = [];
  for(let i = 1; i < v.length; i++){
    const p = phone10_(v[i][t.ix.phone]);
    const key = p || ('(row ' + (i + 1) + ')');
    if(!by[key]){
      by[key] = { phone:p, rows:0, name:'', role:'', mandal:'', gp:'', email:'',
                  hasPin:false, active:false, at:i + 1 };
      order.push(key);
    }
    const r = by[key];
    r.rows++;
    /* the SENIOR row is the one the app greets him from, so it is the one the
       console shows — anything else and the roll disagrees with his phone */
    const role = cell_(v[i], t.ix.role).toUpperCase();
    if(!r.role || (rank_()[role] || 0) > (rank_()[r.role] || 0)){
      r.role = role; r.name = cell_(v[i], t.ix.name); r.mandal = cell_(v[i], t.ix.mandal);
      r.gp = cell_(v[i], t.ix.gp); r.email = cell_(v[i], t.ix.email);
    }
    if(v[i][t.ix.hash]) r.hasPin = true;
    const a = t.ix.active < 0 ? true : v[i][t.ix.active];
    if(!(a === false || String(a).toUpperCase() === 'FALSE' || a === '')) r.active = true;
  }
  const rows = order.map(k => by[k]);
  rows.sort((a, b) => (a.mandal || '').localeCompare(b.mandal || '') ||
                      (rank_()[b.role] || 0) - (rank_()[a.role] || 0) ||
                      (a.name || '').localeCompare(b.name || ''));
  /* WHAT THE REGISTER KNOWS OF THE YEAR. A register whose Holidays tab is
     empty counts Dasara, Diwali and every second Saturday as working days,
     and nothing on the console says so — the figures simply come out wrong
     and look like figures. It is counted here, for THIS calendar year, and
     the Admin panel says it plainly with the button to put it right. */
  let hol = 0, holYear = 0, holExtra = [], holMissing = [];
  try{
    const yr = Number(today_().slice(0, 4));
    holYear = yr;
    const all = holidaySet_();
    const mine = Object.keys(all).filter(k => String(k).slice(0, 4) === String(yr));
    hol = mine.length;
    /* AND WHETHER THEY ARE THE G.O.'s. tsHolidays_ only ever ADDS what is
       missing — it removes nothing, by design — so a date put on the tab by
       any other hand stays for ever and is silently counted as an off day.
       The two registers were loaded from the same order and disagreed by
       nine, which is the number of holidays the US-locale day/month swap once
       put on the wrong date (rule 3). A spurious off day accuses nobody, but
       it takes a working day out of the count that the pace forecast, the
       filing chase and the leave arithmetic all read.
       IT IS REPORTED AND NEVER TOUCHED. Whether a date the Collector's office
       put there belongs on the register is his word, not a table's. */
    const canon = {};
    try{
      TS_HOLIDAYS_2026.forEach(function(h){ canon[h[0]] = h[1]; });
      TS_SECOND_SATURDAYS_2026.forEach(function(d){ canon[d] = 'Second Saturday'; });
    }catch(err){}
    if(Object.keys(canon).length){
      mine.forEach(function(d){ if(!canon[d]) holExtra.push({ date:d, occasion:String(all[d] || '') }); });
      Object.keys(canon).forEach(function(d){
        if(String(d).slice(0, 4) === String(yr) && !all[d]) holMissing.push({ date:d, occasion:canon[d] }); });
      holExtra.sort(function(a, b){ return a.date < b.date ? -1 : 1; });
      holMissing.sort(function(a, b){ return a.date < b.date ? -1 : 1; });
    }
  }catch(e){}
  return json_({ ok:true, rows:rows, roles:Object.keys(rank_()),
                 tenant:tenant_().key, tenantName:tenant_().name,
                 holidays:{ year:holYear, count:hol, onOrder:hol - holExtra.length,
                            extra:holExtra.slice(0, 60), missing:holMissing.slice(0, 60) },
                 mandals:gpRoll_().map(r => r.mandal).filter((m, i, A) => m && A.indexOf(m) === i).sort() });
}

/* register an officer */
function createUser_(b, u){
  if(u.role !== 'COLLECTOR') return json_({ ok:false, error:'Officers are registered by the Collector alone.' });
  const p = phone10_(b.phone || '');
  if(p.length !== 10) return json_({ ok:false, error:'A mobile number is ten digits. Nothing was written.' });
  const name = String(b.name || '').trim();
  if(!name) return json_({ ok:false, error:'A name is needed — the roll is read by people.' });
  const role = String(b.role || '').trim().toUpperCase();
  if(!rank_()[role]) return json_({ ok:false, error:'That is not a role on the register: ' + Object.keys(rank_()).join(', ') + '.' });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const t = uidx_(), v = t.sh.getDataRange().getValues();
    /* ONE NUMBER, ONE OFFICER. A number already on the roll is the very thing
       that makes the app greet a man with somebody else's name and village, so
       it is refused here and the holder is named rather than quietly doubled. */
    const held = rollRows_(t, v, p);
    if(held.length)
      return json_({ ok:false, error:'That number is already on the roll — ' +
        (cell_(v[held[0]], t.ix.name) || '(unnamed)') + ', ' + cell_(v[held[0]], t.ix.role) +
        (cell_(v[held[0]], t.ix.mandal) ? ', ' + cell_(v[held[0]], t.ix.mandal) : '') +
        '. Correct that row rather than adding a second.' });

    const pin = dayPin_(p);
    const width = Math.max(t.sh.getLastColumn(), U_HEAD.length);
    const row = new Array(width).fill('');
    const put = (k, val) => { if(t.ix[k] >= 0) row[t.ix[k]] = val; };
    put('phone', "'" + p);
    put('name', name);
    put('role', role);
    put('mandal', String(b.mandal || '').trim());
    put('gp', String(b.gp || '').trim());
    put('email', String(b.email || '').trim());
    put('hash', hash_(p, pin));
    put('initpin', '');
    put('active', 'TRUE');
    t.sh.appendRow(row);
    admAudit_('OFFICER REGISTERED', p, name + ' · ' + role +
      (b.mandal ? ' · ' + String(b.mandal).trim() : '') + ' · PIN set, not recorded here');
    return json_({ ok:true, phone:p, name:name, role:role, pin:pin });
  } finally { lock.releaseLock(); }
}

/* give an officer his PIN back */
function resetUserPin_(b, u){
  if(u.role !== 'COLLECTOR') return json_({ ok:false, error:'A PIN is reset by the Collector alone.' });
  const p = phone10_(b.phone || '');
  if(p.length !== 10) return json_({ ok:false, error:'A mobile number is ten digits.' });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const t = uidx_(), v = t.sh.getDataRange().getValues();
    const rows = rollRows_(t, v, p);
    if(!rows.length) return json_({ ok:false, error:'That number is not on the roll. Register it first.' });

    const pin = dayPin_(p), h = hash_(p, pin);
    /* EVERY ROW CARRYING THE NUMBER. findByPhone_ takes the PIN from the FIRST
       row holding one, which is not necessarily the row anybody meant to fix —
       a reset written to one row hands the officer a PIN that does not open
       the app, and he telephones again saying it still shows wrong PIN. That
       is issue 4 of the 22.08 register and it came back three times. */
    let wrote = 0;
    rows.forEach(i => {
      if(v[i][t.ix.hash] === h) return;
      t.sh.getRange(i + 1, t.ix.hash + 1).setValue(h);
      if(t.ix.initpin >= 0) t.sh.getRange(i + 1, t.ix.initpin + 1).setValue('');
      wrote++;
    });
    /* and the lock-out with it: ten wrong attempts within the hour and the
       server refuses him whatever his PIN is, so a reset alone cures nothing */
    const locked = Number(cache_().get('pl_' + p) || 0);
    if(locked) try{ cache_().remove('pl_' + p); }catch(err){}

    const name = rows.map(i => cell_(v[i], t.ix.name)).filter(String)[0] || '(unnamed)';
    const dead = rows.every(i => String(v[i][t.ix.active]).toUpperCase() === 'FALSE');
    admAudit_('PIN RESET', p, name + ' · ' + rows.length + ' row(s) · PIN not recorded here');
    return json_({ ok:true, phone:p, name:name, pin:pin, rows:rows.length,
                   written:wrote, unlocked:locked, inactive:dead });
  } finally { lock.releaseLock(); }
}

/* take an officer off the roll, or put him back on it */
function setUserActive_(b, u){
  if(u.role !== 'COLLECTOR') return json_({ ok:false, error:'The roll is the Collector’s.' });
  const p = phone10_(b.phone || '');
  if(p.length !== 10) return json_({ ok:false, error:'A mobile number is ten digits.' });
  const on = b.active === true || String(b.active) === 'true';
  /* the Collector cannot take himself off the roll — there is nobody else who
     could put him back, and the console would be shut behind him */
  if(!on && p === u.phone) return json_({ ok:false, error:'You cannot take yourself off the roll.' });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const t = uidx_(), v = t.sh.getDataRange().getValues();
    const rows = rollRows_(t, v, p);
    if(!rows.length) return json_({ ok:false, error:'That number is not on the roll.' });
    if(t.ix.active < 0) return json_({ ok:false, error:'The Users tab has no Active column.' });

    const want = on ? 'TRUE' : 'FALSE';
    let wrote = 0;
    rows.forEach(i => {
      if(String(v[i][t.ix.active]).toUpperCase() === want) return;
      t.sh.getRange(i + 1, t.ix.active + 1).setValue(want);
      wrote++;
    });
    const name = rows.map(i => cell_(v[i], t.ix.name)).filter(String)[0] || '(unnamed)';
    admAudit_(on ? 'OFFICER RESTORED TO THE ROLL' : 'OFFICER TAKEN OFF THE ROLL', p,
      name + ' · ' + rows.length + ' row(s) · the row stands, nothing was deleted');
    return json_({ ok:true, phone:p, name:name, active:on, rows:rows.length, written:wrote });
  } finally { lock.releaseLock(); }
}

/* ============================================================================
 * WEATHER · what the sky is doing over each mandal
 * ----------------------------------------------------------------------------
 * WHY OPEN-METEO. It needs no key and no account. Every other forecast service
 * wants a credential, and a credential in a government repository is the one
 * mistake this project has already written a rule about. There is nothing here
 * to leak and nothing to bill.
 *
 * ONE CALL FOR THE DISTRICT, NOT 280. The district's server asks once and
 * caches; the handsets ask the district. Open-Meteo takes every mandal in a
 * single request, so twelve mandals cost one call an hour.
 *
 * THE THRESHOLDS ARE THE IMD'S, NOT MINE. Rainfall is classed the way the
 * India Meteorological Department classes it — light 2.5–15.5 mm, moderate
 * 15.6–64.4, heavy 64.5–115.5, very heavy 115.6–204.4, extremely heavy above
 * that. A district officer already reads those words in that sense, and a
 * scale invented here would mean something different to him than to everyone
 * else in the state.
 *
 * IT FORECASTS; IT DOES NOT WARN. Nothing here is an IMD warning and nothing
 * here is an order. The console drafts a message from these figures and the
 * Collector decides whether it goes out — the same rule as every other thing
 * this app says to 280 officers at once.
 * ========================================================================== */
const WX_URL   = 'https://api.open-meteo.com/v1/forecast';
const WX_CACHE = 1800;                 /* half an hour; the sky is not a ledger */
const WX_HOME  = { lat: 17.7231, lng: 79.1526 };   /* Jangaon town */

/* WMO weather codes, in the words an officer would use */
function wxText_(c){
  const n = Number(c);
  if(n === 0) return 'Clear';
  if(n === 1) return 'Mostly clear';
  if(n === 2) return 'Partly cloudy';
  if(n === 3) return 'Overcast';
  if(n === 45 || n === 48) return 'Fog';
  if(n >= 51 && n <= 57) return 'Drizzle';
  if(n >= 61 && n <= 65) return 'Rain';
  if(n === 66 || n === 67) return 'Freezing rain';
  if(n >= 71 && n <= 77) return 'Snow';
  if(n >= 80 && n <= 82) return 'Rain showers';
  if(n === 85 || n === 86) return 'Snow showers';
  if(n === 95) return 'Thunderstorm';
  if(n === 96 || n === 99) return 'Thunderstorm with hail';
  return 'Unsettled';
}
/* the IMD's rainfall classes, by the day's total in millimetres */
function wxRainClass_(mm){
  const v = Number(mm) || 0;
  if(v < 2.5) return '';
  if(v <= 15.5) return 'light rain';
  if(v <= 64.4) return 'moderate rain';
  if(v <= 115.5) return 'heavy rain';
  if(v <= 204.4) return 'very heavy rain';
  return 'extremely heavy rain';
}
/* SEVERE is what the Collector would want to act on before the day starts.
   WATCH is what he would want to know about. Everything else is weather. */
function wxLevel_(d){
  const code = Number(d.code) || 0, mm = Number(d.rain) || 0;
  const wind = Number(d.wind) || 0, tmax = Number(d.tmax);
  if(code === 96 || code === 99 || mm > 64.4 || wind >= 50 || (isFinite(tmax) && tmax >= 43)) return 'SEVERE';
  if(code === 95 || mm > 15.5 || wind >= 35 || (isFinite(tmax) && tmax >= 40)) return 'WATCH';
  return 'CALM';
}
const WX_RANK = { CALM:0, WATCH:1, SEVERE:2 };

/* Where each mandal is. The district's own attendance marks say it better than
   any gazetteer would: the average of the located marks in a mandal is a point
   inside that mandal. Marks outside the district's box are ignored — a handset
   that reported itself in another state must not move a mandal onto the map. */
function wxMandalPoints_(){
  const sh = sheet_('Attendance', A_HEAD), m = headMap_(sh, A_HEAD);
  const last = sh.getLastRow(), agg = {};
  if(last >= 2){
    const start = Math.max(2, last - 3000);
    const v = sh.getRange(start, 1, last - start + 1, sh.getLastColumn()).getValues();
    v.forEach(r => {
      const mm = String(r[m.ix.mandal] || '').trim(); if(!mm) return;
      const la = Number(r[m.ix.lat]), ln = Number(r[m.ix.lng]);
      if(!la || !ln) return;
      if(la < FIX_BOX_.latMin || la > FIX_BOX_.latMax || ln < FIX_BOX_.lngMin || ln > FIX_BOX_.lngMax) return;
      agg[mm] = agg[mm] || { la:0, ln:0, n:0 };
      agg[mm].la += la; agg[mm].ln += ln; agg[mm].n++;
    });
  }
  /* every mandal on the village roll gets a row, located or not */
  const roll = {};
  gpRoll_().forEach(r => { if(r.mandal) roll[r.mandal] = true; });
  Object.keys(agg).forEach(k => { roll[k] = true; });
  return Object.keys(roll).sort().map(k => {
    const a = agg[k];
    return a && a.n
      ? { mandal:k, lat: +(a.la / a.n).toFixed(4), lng: +(a.ln / a.n).toFixed(4), located:true }
      : { mandal:k, lat: WX_HOME.lat, lng: WX_HOME.lng, located:false };
  });
}

/* one request, every point */
function wxFetch_(points){
  const url = WX_URL +
    '?latitude=' + points.map(p => p.lat).join(',') +
    '&longitude=' + points.map(p => p.lng).join(',') +
    '&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max' +
    '&timezone=Asia%2FKolkata&forecast_days=3';
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions:true });
  const body = res.getContentText();
  let j;
  try{ j = JSON.parse(body); }
  catch(err){ throw new Error('the forecast service did not answer with figures'); }
  /* one coordinate returns an object, several return an array — Open-Meteo
     does both, and reading only one shape breaks the day a mandal is added */
  return Array.isArray(j) ? j : [j];
}

function wxRead_(){
  const key = 'wx_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd-HH');
  const cache = cache_();
  const hit = cache.get(key);
  if(hit){ try{ return JSON.parse(hit); }catch(err){} }

  const points = wxMandalPoints_();
  if(!points.length) points.push({ mandal:'Jangaon', lat:WX_HOME.lat, lng:WX_HOME.lng, located:false });
  const raw = wxFetch_(points);

  const rows = points.map((p, i) => {
    const w = raw[i] || raw[0] || {};
    const cur = w.current || {}, day = w.daily || {};
    const at = a => (Array.isArray(a) ? a[0] : undefined);
    const d = {
      mandal: p.mandal, lat: p.lat, lng: p.lng, located: p.located,
      temp: cur.temperature_2m, humidity: cur.relative_humidity_2m,
      code: cur.weather_code, now: wxText_(cur.weather_code),
      windNow: cur.wind_speed_10m,
      tmax: at(day.temperature_2m_max), tmin: at(day.temperature_2m_min),
      rain: at(day.precipitation_sum), rainChance: at(day.precipitation_probability_max),
      wind: at(day.wind_speed_10m_max), dayCode: at(day.weather_code)
    };
    d.rainClass = wxRainClass_(d.rain);
    d.level = wxLevel_({ code: d.dayCode != null ? d.dayCode : d.code, rain: d.rain, wind: d.wind, tmax: d.tmax });
    d.today = wxText_(d.dayCode);
    return d;
  });

  rows.sort((a, b) => (WX_RANK[b.level] - WX_RANK[a.level]) || String(a.mandal).localeCompare(String(b.mandal)));
  const worst = rows.reduce((s, r) => WX_RANK[r.level] > WX_RANK[s] ? r.level : s, 'CALM');
  const out = {
    at: new Date().toISOString(),
    date: today_(),
    level: worst,
    rows: rows,
    counts: {
      severe: rows.filter(r => r.level === 'SEVERE').length,
      watch:  rows.filter(r => r.level === 'WATCH').length,
      calm:   rows.filter(r => r.level === 'CALM').length
    },
    source: 'Open-Meteo · thresholds after the India Meteorological Department'
  };
  try{ cache.put(key, JSON.stringify(out), WX_CACHE); }catch(err){}
  return out;
}

/* The message the console offers the Collector. It is DRAFTED from the
   figures, never sent by itself — a line that reaches 280 officers is passed
   by the Collector, not by a forecast. */
function wxDraft_(w){
  const bad = w.rows.filter(r => r.level !== 'CALM');
  if(!bad.length){
    return 'Weather over the district is settled today. No action is called for on this account.';
  }
  const sev = w.rows.filter(r => r.level === 'SEVERE').map(r => r.mandal);
  const wat = w.rows.filter(r => r.level === 'WATCH').map(r => r.mandal);
  const worst = w.rows[0];
  const bits = [];
  bits.push(worst.rainClass ? (worst.rainClass.charAt(0).toUpperCase() + worst.rainClass.slice(1)) : worst.today);
  const line = [];
  line.push(bits[0] + ' expected today' +
    (worst.rain != null ? ' — up to ' + Math.round(worst.rain) + ' mm' : '') +
    (worst.wind != null ? ', wind to ' + Math.round(worst.wind) + ' km/h' : '') + '.');
  if(sev.length) line.push('Worst in ' + sev.slice(0, 6).join(', ') + (sev.length > 6 ? ' and others' : '') + '.');
  else if(wat.length) line.push('Watch ' + wat.slice(0, 6).join(', ') + (wat.length > 6 ? ' and others' : '') + '.');
  line.push('Secretaries to check drains, tank bunds and the chlorination of drinking water sources, ' +
    'and to report any breach or waterlogging to the MPDO the same day.');
  return line.join(' ');
}

/* ---- what the app and the console ask for ---- */
function weatherRead_(u, forDraft){
  let w;
  try{ w = wxRead_(); }
  catch(err){ return json_({ ok:false, error:String(err.message || err) }); }

  /* An officer is shown his own mandal first — the sky over Zaffergadh is no
     use to a Secretary in Chilpur. The district sees all of it. */
  if(!districtRole_(u.role)){
    const mine = w.rows.filter(r => !u.mandal || r.mandal === u.mandal);
    return json_({ ok:true, at:w.at, date:w.date, source:w.source,
                   mine: mine[0] || null, level: (mine[0] || {}).level || 'CALM' });
  }
  const out = { ok:true, at:w.at, date:w.date, level:w.level, counts:w.counts,
                rows:w.rows, source:w.source };
  if(forDraft) out.draft = wxDraft_(w);
  return json_(out);
}

/* ---------------- POST ---------------- */
/* THE YEAR ONTO THE REGISTER, BY WHICHEVER DOOR.
   G.O.Rt.No.1715 (dt. 06.12.2025): the 27 General Holidays and every second
   Saturday. The same dates on both registers, because it is the same state
   and the same order.

   NOTE, PLAINLY, THAT THIS REACHES INTO Admin.gs, which nothing else here
   does. applyTsHolidays is an Admin.gs job and the rule is that the Collector
   presses that button and not a robot. That rule is kept and not bent: there
   is no trigger on this, no schedule and no automatic call anywhere — it runs
   only when a person asks for it, either during provisioning or from the
   console under the Collector's own token, which is the same hand pressing
   the same button through a screen he is already looking at. It writes to
   one tab, it writes only dates the G.O. published, it names no officer, and
   running it twice changes nothing.

   The alternative was worse: the Gram Palana register stood with an empty
   Holidays tab, counting Dasara, Diwali and every second Saturday as working
   days, and every leave figure and working-day count on it wrong by thirty
   days. */
function holidayLoad_(who){
  let before = 0, after = 0;
  try{ before = Object.keys(holidaySet_()).length; }catch(e){}
  try{ applyTsHolidays(); }catch(err){ return json_({ ok:false, error:'could not load them: ' + err }); }
  try{ after = Object.keys(holidaySet_()).length; }catch(e){}
  admAudit_('SEED_HOLIDAYS', tenant_().key, before + ' before, ' + after + ' after, by ' + who + '.');
  return json_({ ok:true, tenant:tenant_().key, before:before, after:after, added:Math.max(0, after - before) });
}


/* ============================================================================
 * THE ROLL, CORRECTED FROM A LIST THE DISTRICT ALREADY KEEPS
 * ----------------------------------------------------------------------------
 * The office holds its roster in a table — mandal, name, mobile, official
 * email, the office and its coordinates — and that table is the truth the
 * register is meant to agree with. Until now agreeing with it meant a line in
 * a FIELD_FIXES batch, a code edit and a deploy for one officer.
 *
 * THE LIST NEVER ENTERS THE REPOSITORY. It is 12 officers' personal mobile
 * numbers; this repository is public, because that is how handsets install the
 * app. So the table goes from the Collector's own screen to his own register
 * over HTTPS and nowhere else, exactly as the Gram Palana roster did.
 *
 * IT PROPOSES BEFORE IT WRITES. `dry` returns what WOULD change, row by row,
 * old against new, and writes nothing. That is not a courtesy: the office's
 * table and the register can disagree in four quite different ways, and three
 * of them must not be settled by a robot.
 *
 * AND A NEW OFFICER NEVER OVERWRITES THE LAST ONE. This is the whole of it.
 * If the MPO of Bachannapet is a different person from the one on the row,
 * writing the new name and number over that row would hand HER attendance,
 * HER notices and HER leave to him — the register would show a man present on
 * days he had not joined, and a show-cause notice served on one officer
 * standing against another. So a changed NUMBER against the SAME name is a
 * correction and is written in place; a changed PERSON is a succession: the
 * outgoing row is marked inactive, it keeps everything pointing at it (rule
 * 7), and the incoming officer is a new row of his own.
 *
 * Nothing here deletes, nothing is written twice (rule 8), every change is on
 * the Audit tab with what it was before, and the Collector's own role is
 * re-checked on the server (rule 6).
 * ========================================================================== */
const MANDAL_HEAD = ['Mandal', 'Office', 'Lat', 'Lng'];

/* the mandal offices, as the district's own table gives them */
function mandalOffices_(){
  const sh = sheet_('Mandals', MANDAL_HEAD);
  const v = sh.getDataRange().getValues();
  const out = {};
  if(v.length < 2) return out;
  const mo = headMap_(sh, MANDAL_HEAD);
  for(let i = 1; i < v.length; i++){
    const name = String(v[i][mo.ix.Mandal] || '').trim();
    if(!name) continue;
    const y = Number(v[i][mo.ix.Lat]), x = Number(v[i][mo.ix.Lng]);
    /* A COORDINATE THAT CANNOT BE BELIEVED IS NOT A COORDINATE. Two of the
       Gram Palana roll's 180 were wrong — a longitude of 7852556, and one with
       the latitude copied into the longitude — and a distance off either would
       have been a five-hundred-kilometre figure printed against a man sitting
       in his own office. Anything outside the district's box is dropped. */
    if(!isFinite(y) || !isFinite(x)) continue;
    if(!(y > 16.4 && y < 19.2 && x > 77.6 && x < 80.9)) continue;
    out[name.toLowerCase()] = { mandal:name, office:String(v[i][mo.ix.Office] || '').trim(), lat:y, lng:x };
  }
  return out;
}

/* one officer's line of the district's table, read against the register */
/* TWO NAMES, ONE OFFICER. The registers spell a man "L Mahesh Kumar",
   "L. Mahesh Kumar" and "Mahesh Kumar L", and the office abbreviates a
   surname to an initial — and appends a designation, so the table's
   "G. Praveen Kumar, PS, Gr-I(FAC)" is the man the roll calls G. Praveen
   Kumar. Two names are the same officer when they share a word of real
   length; initials, honorifics and designations do not count, because
   "A. Narmada" and "A. Ramesh" share only the A. */
function sameName_(a, b){
  const words = function(s){
    return String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ')
      .split(/\s+/).filter(function(w){
        return w.length > 2 &&
          ['smt','shri','sri','mrs','fac','supdt','gr','sec'].indexOf(w) < 0; });
  };
  const A = words(a), B = words(b);
  if(!A.length || !B.length) return true;      /* a blank name blocks nothing */
  return A.some(function(w){ return B.indexOf(w) >= 0; });
}

function rollPlan_(t, v, r){
  const mandal = String(r.mandal || '').trim();
  const role   = String(r.role || '').trim().toUpperCase();
  const name   = String(r.name || '').trim();
  const phone  = phone10_(r.phone || '');
  const email  = String(r.email || '').trim();
  const out = { mandal:mandal, role:role, name:name, phone:phone, email:email, changes:[] };

  if(!mandal || !role){ out.verdict = 'refused'; out.why = 'a mandal and a role are needed'; return out; }
  if(phone.length !== 10){ out.verdict = 'refused'; out.why = 'a mobile number is ten digits'; return out; }
  if(!name){ out.verdict = 'refused'; out.why = 'a name is needed — the roll is read by people'; return out; }
  if(!rank_()[role]){ out.verdict = 'refused'; out.why = 'no such role on this register'; return out; }

  /* who holds that chair on the register today */
  const seat = [];
  for(let i = 1; i < v.length; i++){
    if(String(v[i][t.ix.role] || '').trim().toUpperCase() !== role) continue;
    if(String(v[i][t.ix.mandal] || '').trim().toLowerCase() !== mandal.toLowerCase()) continue;
    const act = t.ix.active < 0 ? true : !(v[i][t.ix.active] === false ||
      String(v[i][t.ix.active]).toUpperCase() === 'FALSE');
    if(act) seat.push(i);
  }
  /* and whether that number is already somebody's */
  const held = rollRows_(t, v, phone).filter(function(i){
    const act = t.ix.active < 0 ? true : !(v[i][t.ix.active] === false ||
      String(v[i][t.ix.active]).toUpperCase() === 'FALSE');
    return act;
  });

  if(seat.length > 1){
    out.verdict = 'ambiguous';
    out.why = seat.length + ' active officers hold this chair on the register: ' +
      seat.map(function(i){ return cell_(v[i], t.ix.name) + ' (' + phone10_(v[i][t.ix.phone]) + ')'; }).join(', ') +
      '. Which of them is right is yours to settle, not this page’s.';
    return out;
  }

  if(!seat.length){
    /* nobody holds it. If the number is on the roll elsewhere, that is a man
       being MOVED, and moving a man between mandals is not a thing this does
       quietly — his notices and his filings are counted by mandal. */
    if(held.length){
      out.verdict = 'refused';
      out.why = 'that number is already on the roll as ' + cell_(v[held[0]], t.ix.name) + ', ' +
        cell_(v[held[0]], t.ix.role) + (cell_(v[held[0]], t.ix.mandal) ? ' of ' + cell_(v[held[0]], t.ix.mandal) : '') +
        '. One number is one officer; correct that row rather than adding a second.';
      return out;
    }
    out.verdict = 'register';
    out.why = 'nobody holds this chair on the register';
    out.changes.push('registered as ' + role + ' of ' + mandal);
    out.needsPin = true;
    return out;
  }

  const i = seat[0];
  out.row = i + 1;
  out.was = { name:cell_(v[i], t.ix.name), phone:phone10_(v[i][t.ix.phone]),
              email:cell_(v[i], t.ix.email) };

  /* IS THIS THE SAME PERSON? The registers spell a man "L Mahesh Kumar",
     "L. Mahesh Kumar" and "Mahesh Kumar L", and the office abbreviates a
     surname to an initial, so two names are the same officer when they share
     a word of real length: initials and honorifics do not count, because
     "A. Narmada" and "A. Ramesh" share only the A.
     Admin.gs has this rule too and the app does NOT call it: Admin.gs is the
     Collector’s own, never the app’s, and a missing function there would fall
     to “different person” — which is the dangerous way to be wrong here,
     because it retires a serving officer. */
  let same = sameName_(out.was.name, name);
  if(!same && out.was.phone === phone) same = true;   /* same number, spelt anew */

  if(!same){
    out.verdict = 'succession';
    out.why = cell_(v[i], t.ix.name) + ' holds this chair on the register and ' + name + ' is a different person.';
    out.changes.push(out.was.name + ' is taken off the roll — the row stays, and so does everything pointing at it');
    out.changes.push(name + ' is registered as a new row of his own');
    out.needsPin = true;
    if(held.length && phone10_(v[held[0]][t.ix.phone]) === phone && held[0] !== i){
      out.verdict = 'refused';
      out.why = 'that number is already on the roll as ' + cell_(v[held[0]], t.ix.name) + '.';
    }
    return out;
  }

  /* the same officer: correct what differs */
  if(out.was.phone !== phone){
    if(held.length && held[0] !== i){
      out.verdict = 'refused';
      out.why = 'that number is already on the roll as ' + cell_(v[held[0]], t.ix.name) + '.';
      return out;
    }
    out.changes.push('mobile ' + (out.was.phone || '(blank)') + ' → ' + phone);
    out.newPhone = true;
  }
  if(name && out.was.name !== name) out.changes.push('name "' + out.was.name + '" → "' + name + '"');
  if(email && String(out.was.email).toLowerCase() !== email.toLowerCase())
    out.changes.push('email ' + (out.was.email || '(blank)') + ' → ' + email);

  out.verdict = out.changes.length ? 'correct' : 'unchanged';
  return out;
}

function rollUpdate_(b, u){
  if(u.role !== 'COLLECTOR') return json_({ ok:false, error:'The roll is the Collector’s alone.' });
  const rows = (b.rows && b.rows.length) ? b.rows : [];
  if(!rows.length) return json_({ ok:false, error:'Nothing was sent.' });
  if(rows.length > 400) return json_({ ok:false, error:'That is more than one roll.' });
  const dry = b.dry !== false;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try{
    const t = uidx_();
    let v = t.sh.getDataRange().getValues();
    const plans = rows.map(function(r){ return rollPlan_(t, v, r); });

    /* the offices, which are data about a place and not about a person */
    let offices = 0, officeRows = [];
    rows.forEach(function(r){
      const y = Number(r.lat), x = Number(r.lng);
      if(!r.mandal || !isFinite(y) || !isFinite(x)) return;
      if(!(y > 16.4 && y < 19.2 && x > 77.6 && x < 80.9)) return;
      officeRows.push({ mandal:String(r.mandal).trim(), office:String(r.office || '').trim(), lat:y, lng:x });
    });

    if(dry){
      const have = mandalOffices_();
      officeRows.forEach(function(o){
        const cur = have[o.mandal.toLowerCase()];
        if(!cur || cur.lat !== o.lat || cur.lng !== o.lng) offices++;
      });
      return json_({ ok:true, dry:true, plans:plans, offices:offices, officeTotal:officeRows.length });
    }

    /* ---- and now the writing ---- */
    let wrote = 0, made = 0, retired = 0;
    const pins = [];
    plans.forEach(function(p){
      if(p.verdict === 'unchanged' || p.verdict === 'refused' || p.verdict === 'ambiguous') return;

      if(p.verdict === 'correct'){
        const i = p.row - 1;
        if(p.was.phone !== p.phone) t.sh.getRange(p.row, t.ix.phone + 1).setValue("'" + p.phone);
        if(p.name)  t.sh.getRange(p.row, t.ix.name + 1).setValue(p.name);
        if(p.email && t.ix.email >= 0) t.sh.getRange(p.row, t.ix.email + 1).setValue(p.email);
        admAudit_('ROLL CORRECTED', p.phone, p.role + ' of ' + p.mandal + ' · ' + p.changes.join('; '));
        wrote++;
        return;
      }

      if(p.verdict === 'succession'){
        /* HE IS NOT DELETED AND HE IS NOT OVERWRITTEN (rule 7). The row stays,
           marked inactive, and his attendance, his notices, his leave and his
           plan stay with it — a file can still be produced, and the man who
           earned that record keeps it. */
        if(t.ix.active >= 0) t.sh.getRange(p.row, t.ix.active + 1).setValue('FALSE');
        admAudit_('OFFICER TAKEN OFF THE ROLL', p.was.phone,
          p.was.name + ', ' + p.role + ' of ' + p.mandal + ' — succeeded by ' + p.name);
        retired++;
      }

      /* register the incoming officer as a row of his own */
      const width = Math.max(t.sh.getLastColumn(), U_HEAD.length);
      const row = new Array(width).fill('');
      row[t.ix.phone] = "'" + p.phone;
      row[t.ix.name] = p.name;
      row[t.ix.role] = p.role;
      row[t.ix.mandal] = p.mandal;
      if(t.ix.email >= 0) row[t.ix.email] = p.email;
      if(t.ix.active >= 0) row[t.ix.active] = 'TRUE';
      t.sh.appendRow(row);
      admAudit_('OFFICER REGISTERED', p.phone, p.name + ', ' + p.role + ' of ' + p.mandal);
      made++;
      pins.push({ phone:p.phone, name:p.name, mandal:p.mandal });
    });

    /* the offices. A tab of places, written by mandal, and idempotent. */
    let officeWrote = 0;
    if(officeRows.length){
      const osh = sheet_('Mandals', MANDAL_HEAD);
      const om = headMap_(osh, MANDAL_HEAD);
      const ov = osh.getDataRange().getValues();
      const at = {};
      for(let i = 1; i < ov.length; i++){
        const nm = String(ov[i][om.ix.Mandal] || '').trim().toLowerCase();
        if(nm) at[nm] = i + 1;
      }
      officeRows.forEach(function(o){
        const k = o.mandal.toLowerCase();
        if(at[k]){
          const r = at[k];
          if(String(ov[r - 1][om.ix.Lat]) === String(o.lat) &&
             String(ov[r - 1][om.ix.Lng]) === String(o.lng) &&
             String(ov[r - 1][om.ix.Office] || '') === o.office) return;
          osh.getRange(r, om.ix.Office + 1).setValue(o.office);
          osh.getRange(r, om.ix.Lat + 1).setValue(o.lat);
          osh.getRange(r, om.ix.Lng + 1).setValue(o.lng);
        } else {
          const w = Math.max(osh.getLastColumn(), MANDAL_HEAD.length);
          const rr = new Array(w).fill('');
          rr[om.ix.Mandal] = o.mandal; rr[om.ix.Office] = o.office;
          rr[om.ix.Lat] = o.lat; rr[om.ix.Lng] = o.lng;
          osh.appendRow(rr);
        }
        officeWrote++;
      });
      if(officeWrote) admAudit_('MANDAL OFFICES WRITTEN', String(officeWrote), 'from the district’s own table');
    }

    return json_({ ok:true, dry:false, corrected:wrote, registered:made, retired:retired,
                   offices:officeWrote, pins:pins, plans:plans });
  } finally { lock.releaseLock(); }
}

function doPost(e){
  let b;
  try{ b = JSON.parse(e.postData.contents); }catch(err){ return json_({ ok:false, error:'bad request' }); }

  /* ==========================================================================
   * THE ONE-TIME SEEDING OF A NEW REGISTER.
   *
   * A register is no use until its roll is in it, and a roll is 134 officers'
   * personal mobile numbers. Those must not travel through a public
   * repository — not as a file, and not as a secret either, because a secret
   * is readable by anybody who can push a workflow. So they are posted
   * straight to this register, once, from the district's own machine, and the
   * only thing that ever goes near GitHub is a random key that carries no
   * personal data at all.
   *
   * IT CANNOT BE USED TWICE, AND IT CANNOT BE USED ON A LIVE REGISTER. Four
   * guards, and every one of them has to hold:
   *
   *   1. A key must be baked into THIS project. It is generated per
   *      provisioning and lives in the one file that exists only here.
   *      No key, no endpoint — which is the sanitation register's position,
   *      permanently, because nothing ever writes one into it.
   *   2. The key posted must match it.
   *   3. The Users tab must be EMPTY. A register with one officer on it can
   *      never be seeded again, so there is no window in which this could
   *      overwrite a roll that people are signing in against.
   *   4. It writes the roll and the village list and nothing else — no
   *      attendance, no leave, no notices, nothing that could be back-dated.
   *
   * It is written to the Audit tab, with the count and not the roll.
   * ======================================================================== */
  if(b.kind === 'bootstrap'){
    let key = '';
    try{ if(typeof BOOTSTRAP_KEY !== 'undefined') key = String(BOOTSTRAP_KEY || ''); }catch(e){}
    if(!key) return json_({ ok:false, error:'This register has no bootstrap key. It is seeded by hand.' });
    if(String(b.key || '') !== key) return json_({ ok:false, error:'auth' });

    const t0 = uidx_();
    if(t0.sh.getLastRow() > 1)
      return json_({ ok:false, error:'This register already has officers on its roll. It cannot be seeded again.' });

    const users = Array.isArray(b.users) ? b.users : [];
    const gps   = Array.isArray(b.gps)   ? b.gps   : [];
    if(!users.length) return json_({ ok:false, error:'No officers were sent.' });

    const lock = LockService.getScriptLock();
    try{ lock.waitLock(30000); }catch(e){ return json_({ ok:false, error:'busy — try again' }); }
    try{
      if(t0.sh.getLastRow() > 1) return json_({ ok:false, error:'already seeded' });
      const ush = sheet_('Users', U_HEAD), um = headMap_(ush, U_HEAD);
      users.slice(0, 2000).forEach(r => {
        const row = new Array(um.width).fill('');
        const put = (k, v) => { if(um.ix[k] >= 0) row[um.ix[k]] = v; };
        /* the leading quote keeps a mobile number text, as everywhere else */
        put('Phone', "'" + phone10_(r[0])); put('Name', String(r[1] || ''));
        put('Role', String(r[2] || '').toUpperCase()); put('Mandal', String(r[3] || ''));
        put('GP', String(r[4] || '')); put('Email', String(r[5] || ''));
        put('Active', 'TRUE');
        ush.appendRow(row);
      });
      if(gps.length){
        const gsh = sheet_('GPs', ['Mandal','GP','Lat','Lng']);
        gps.slice(0, 4000).forEach(r => gsh.appendRow([String(r[0] || ''), String(r[1] || ''),
          r[2] === '' || r[2] == null ? '' : Number(r[2]),
          r[3] === '' || r[3] == null ? '' : Number(r[3])]));
      }
    } finally { lock.releaseLock(); }

    admAudit_('BOOTSTRAP', tenant_().key, users.length + ' officer(s) and ' + gps.length +
      ' village(s) seeded. The roll itself is not recorded here.');
    return json_({ ok:true, tenant:tenant_().key, officers:users.length, villages:gps.length });
  }

  /* ==========================================================================
   * ISSUING THE FIRST PINS, ONCE.
   *
   * A seeded register is still a register nobody can open: the roll has names
   * and numbers but no PIN against any of them, so not one officer — and not
   * the Collector — can sign in. That is a chicken and an egg, because the
   * console action that resets a PIN is itself behind a sign-in.
   *
   * IT CAN ONLY EVER RUN ON A REGISTER NOBODY CAN SIGN IN TO. Three guards:
   *
   *   1. the key baked into this project alone, as the seeding uses;
   *   2. NOT ONE row may already carry a PIN. The moment a single officer can
   *      sign in, this is dead for good — so it cannot be used to re-issue
   *      PINs on a working register, which would lock 134 people out at once;
   *   3. it adds a Collector only if that number is not already on the roll,
   *      because one number on two rows is what makes the app greet a man with
   *      somebody else's name.
   *
   * The PINs it issues are the day-derived ones every other part of this
   * register uses, so a second run on the same day would be the same answer
   * anyway. The Collector's is returned in the answer to the call that made
   * it, shown once, and written nowhere — the Audit tab records that PINs were
   * issued and to how many, never the PINs.
   * ======================================================================== */
  if(b.kind === 'issuePins'){
    let key = '';
    try{ if(typeof BOOTSTRAP_KEY !== 'undefined') key = String(BOOTSTRAP_KEY || ''); }catch(e){}
    if(!key) return json_({ ok:false, error:'This register issues its PINs by hand.' });
    if(String(b.key || '') !== key) return json_({ ok:false, error:'auth' });

    const t = uidx_();
    if(t.ix.hash < 0) return json_({ ok:false, error:'The Users tab has no Hash column.' });
    let already = 0;
    {
      const v0 = t.sh.getDataRange().getValues();
      for(let i = 1; i < v0.length; i++) if(String(v0[i][t.ix.hash] || '').trim()) already++;
    }
    if(already) return json_({ ok:false, error:'This register already has ' + already +
      ' officer(s) who can sign in. PINs are reset one at a time, from the console.' });

    const lock = LockService.getScriptLock();
    try{ lock.waitLock(30000); }catch(e){ return json_({ ok:false, error:'busy — try again' }); }
    let made = 0, collectorPin = '', collectorAdded = false;
    try{
      /* the Collector, if he is not on the roll already */
      const want = phone10_((b.collector && b.collector.phone) || '');
      if(want){
        const vv = t.sh.getDataRange().getValues();
        let seen = false;
        for(let i = 1; i < vv.length; i++) if(phone10_(vv[i][t.ix.phone]) === want) seen = true;
        if(!seen){
          const ush = sheet_('Users', U_HEAD), um = headMap_(ush, U_HEAD);
          const row = new Array(um.width).fill('');
          const put = (k, val) => { if(um.ix[k] >= 0) row[um.ix[k]] = val; };
          put('Phone', "'" + want); put('Name', String((b.collector && b.collector.name) || 'Collector'));
          put('Role', 'COLLECTOR'); put('Mandal', ''); put('GP', '');
          put('Email', String((b.collector && b.collector.email) || '')); put('Active', 'TRUE');
          ush.appendRow(row);
          collectorAdded = true;
        }
      }
      /* and a PIN against every row that has none */
      const t2 = uidx_(), rng = t2.sh.getDataRange(), v = rng.getValues();
      for(let i = 1; i < v.length; i++){
        const ph = phone10_(v[i][t2.ix.phone]);
        if(ph.length !== 10) continue;
        if(String(v[i][t2.ix.hash] || '').trim()) continue;
        const pin = dayPin_(ph);
        v[i][t2.ix.hash] = hash_(ph, pin);
        if(t2.ix.initpin >= 0) v[i][t2.ix.initpin] = '';
        if(want && ph === want) collectorPin = pin;
        made++;
      }
      rng.setValues(v);
    } finally { lock.releaseLock(); }

    admAudit_('ISSUE_PINS', tenant_().key, made + ' PIN(s) issued' +
      (collectorAdded ? ', and a Collector added to the roll' : '') + '. No PIN is recorded here.');
    return json_({ ok:true, tenant:tenant_().key, issued:made,
      collectorAdded:collectorAdded, collectorPin:collectorPin,
      note:'Every officer’s PIN is the one this register derives for his number today. ' +
           'This endpoint is now closed for good.' });
  }

  /* ==========================================================================
   * THE WAY BACK IN, WHEN THE COLLECTOR CANNOT SIGN IN.
   *
   * A register whose Collector has no working PIN has no way back: every
   * console action that could reset one is itself behind his sign-in. That is
   * not a hypothetical — it happened here, on the day this register was stood
   * up, because the PIN issued at seeding was lost between the call and the
   * screen it should have been printed on.
   *
   * IT RESETS THE COLLECTOR'S PIN AND NOBODY ELSE'S. Three guards:
   *
   *   1. the key baked into this project alone, which every routine deploy
   *      strips out again — so this is not a standing door, it is one that
   *      exists only in the minutes after a provisioning run;
   *   2. the row must be a COLLECTOR. It can never be pointed at an officer,
   *      so it cannot be used to take over a Gram Palana Officer's account
   *      and mark attendance in his name;
   *   3. it resets one row and touches nothing else.
   *
   * The PIN is returned in the answer to the call that made it and written
   * nowhere. Audit records that a Collector PIN was reset, never the PIN.
   * ======================================================================== */
  if(b.kind === 'collectorPin'){
    let key = '';
    try{ if(typeof BOOTSTRAP_KEY !== 'undefined') key = String(BOOTSTRAP_KEY || ''); }catch(e){}
    if(!key) return json_({ ok:false, error:'This register has no recovery key.' });
    if(String(b.key || '') !== key) return json_({ ok:false, error:'auth' });

    const want = phone10_(b.phone || '');
    if(want.length !== 10) return json_({ ok:false, error:'A mobile number is ten digits.' });

    const t = uidx_(), rng = t.sh.getDataRange(), v = rng.getValues();
    let at = -1;
    for(let i = 1; i < v.length; i++) if(phone10_(v[i][t.ix.phone]) === want){ at = i; break; }
    if(at < 0) return json_({ ok:false, error:'That number is not on the roll.' });
    if(cell_(v[at], t.ix.role).toUpperCase() !== 'COLLECTOR')
      return json_({ ok:false, error:'This resets the Collector’s PIN alone. An officer’s is reset from the console.' });

    const pin = dayPin_(want);
    const lock = LockService.getScriptLock();
    try{ lock.waitLock(20000); }catch(e){ return json_({ ok:false, error:'busy — try again' }); }
    try{
      /* every row carrying the number, because findByPhone_ takes the PIN from
         the first row holding one — a reset written to only one of them hands
         him a PIN that does not open the app */
      for(let i = 1; i < v.length; i++)
        if(phone10_(v[i][t.ix.phone]) === want) v[i][t.ix.hash] = hash_(want, pin);
      rng.setValues(v);
      try{ cache_().remove('pl_' + want); }catch(e){}   /* and the wrong-PIN counter with it */
    } finally { lock.releaseLock(); }

    admAudit_('COLLECTOR_PIN_RESET', want, 'The Collector’s PIN was reset through the recovery key. The PIN is not recorded.');
    return json_({ ok:true, phone:want, name:cell_(v[at], t.ix.name), pin:pin });
  }

  /* ==========================================================================
   * THE ISSUE LIST, FOR HANDING OUT — once, and only what is still unchanged.
   *
   * A hundred and thirty-four officers have to be told their PIN, and there is
   * no way to do that one console reset at a time. So the district may take
   * the list ONCE, at rollout, to print and distribute mandal by mandal.
   *
   * IT CANNOT REVEAL A PIN AN OFFICER HAS CHOSEN. Every row is checked against
   * the PIN this register would derive for that number today: if the stored
   * hash matches, the PIN is still the one that was issued and has never been
   * changed, so printing it tells nobody anything they were not already going
   * to be handed. The moment an officer changes his PIN his row drops out of
   * this list for good — so it can never be used to read a working account.
   *
   * And it is guarded by the key, which every routine deploy strips out. This
   * exists in the minutes after a provisioning run and at no other time.
   *
   * Audit records that the list was taken, by how many rows — never a PIN.
   * ======================================================================== */
  if(b.kind === 'pinList'){
    let key = '';
    try{ if(typeof BOOTSTRAP_KEY !== 'undefined') key = String(BOOTSTRAP_KEY || ''); }catch(e){}
    if(!key) return json_({ ok:false, error:'This register does not hand out a list.' });
    if(String(b.key || '') !== key) return json_({ ok:false, error:'auth' });

    const t = uidx_(), v = t.sh.getDataRange().getValues();
    const rows = [], changed = [];
    const seen = {};
    for(let i = 1; i < v.length; i++){
      const ph = phone10_(v[i][t.ix.phone]);
      if(!ph || seen[ph]) continue; seen[ph] = true;
      if(String(v[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
      const role = cell_(v[i], t.ix.role).toUpperCase();
      if(role === 'COLLECTOR') continue;                 /* his is not handed out */
      const held = String(v[i][t.ix.hash] || '').trim();
      const pin = dayPin_(ph);
      if(!held || held !== hash_(ph, pin)){
        /* he has set his own, or has none at all — either way not ours to say */
        changed.push(ph);
        continue;
      }
      rows.push({ phone:ph, name:cell_(v[i], t.ix.name), role:role,
                  mandal:cell_(v[i], t.ix.mandal), gp:cell_(v[i], t.ix.gp), pin:pin });
    }
    admAudit_('PIN_LIST', tenant_().key, rows.length + ' PIN(s) listed for distribution, ' +
      changed.length + ' withheld as already changed or unset. No PIN is recorded here.');
    return json_({ ok:true, tenant:tenant_().key, rows:rows, withheld:changed.length });
  }

  /* THE YEAR'S HOLIDAYS, ONTO A REGISTER THAT HAS NONE.
     A register with an empty Holidays tab counts Dasara and Diwali and every
     second Saturday as working days — it would chase officers for attendance
     on days the office is shut. The dates are the G.O.'s and are the same for
     both registers, because it is the same state and the same order. Guarded
     by the key, and idempotent: it adds what is missing and nothing else, so a
     second call changes nothing. */
  if(b.kind === 'seedHolidays'){
    let key = '';
    try{ if(typeof BOOTSTRAP_KEY !== 'undefined') key = String(BOOTSTRAP_KEY || ''); }catch(e){}
    /* NOT AN ERROR AND NOT A DEAD END. The key lives in the Gram Palana
       project only while it is being stood up — the first routine deploy
       re-assembles Tenant.gs and strips it, by design. Afterwards the door is
       the Collector's own, from the console, and the message says so rather
       than reading as a fault. */
    if(!key) return json_({ ok:false,
      error:'This register has no bootstrap key. The Collector loads the year from the console, under Admin.' });
    if(String(b.key || '') !== key) return json_({ ok:false, error:'auth' });
    return holidayLoad_('bootstrap key');
  }

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
    /* NAME THE ROLES OF THIS REGISTER, not the other one's. Hardcoded, this
       told a Gram Palana Officer that leave is applied for by the MPO, the
       Panchayat Secretary and the MPDO — three roles that do not exist on his
       register at all. */
    if(!canApplyLeave_(u.role))
      return json_({ ok:false, error:'Leave is applied for through this app by the ' +
        tenant_().leaveApply.join(', ') + '.' });
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
    /* the whole application, twins and all — see leaveRows_ */
    const hits = leaveRows_(sh, m, String(b.id || ''));
    if(!hits.length) return json_({ ok:true, id:String(b.id||''), status:'CANCELLED', local:true });
    const found = hits[0];
    if(phone10_(found.row[m.ix.phone]) !== u.phone)
      return json_({ ok:false, error:'Only the officer who applied can withdraw an application.' });
    /* it still stands if ANY row of it still stands: a twin left PENDING
       behind a sanctioned row is the same application, not a second one */
    const sts = hits.map(h => String(h.row[m.ix.status] || 'PENDING'));
    const st = sts.indexOf('PENDING') >= 0 ? 'PENDING'
             : sts.indexOf('APPROVED') >= 0 ? 'APPROVED' : sts[0];
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
    hits.forEach(h => {
      sh.getRange(h.at, m.ix.status + 1).setValue('CANCELLED');
      sh.getRange(h.at, m.ix.decidedBy + 1).setValue(by);
      sh.getRange(h.at, m.ix.decidedAt + 1).setValue(when);
    });
    return json_({ ok:true, id:String(b.id||''), status:'CANCELLED', decidedAt:when, rows:hits.length });
  }

  /* THE PLAN IS THE SECRETARY'S OWN WORK, and so it stands ABOVE the guard
     below. A Gram Panchayat Development Plan is filed by the officer who
     holds the Gram Panchayat — the very role that may not file an
     evaluation. Put this line one place lower and the district calls every
     Secretary for a plan and then refuses to take it. */
  if(b.kind === 'gpdp'){
    if(!tenant_().gpdp) return json_({ ok:false, error:'This register does not call for a development plan.' });
    return saveGpdp_(b, u);
  }

  /* a circular the district puts in front of everyone, and the receipt for it.
     Both stand above the evaluation guard: an advisory is addressed TO the
     Secretary, so the role that may not file an evaluation must still be able
     to acknowledge one. */
  if(b.kind === 'advAck') return ackAdvisory_(b, u);
  if(b.kind === 'advPublish') return publishAdvisory_(b, u);

  /* THE FILING SCHEDULE. The two receipts stand above the evaluation guard for
     the same reason the advisory's does — a receipt is not an evaluation. The
     two that WRITE a schedule re-check the Collector's own role on the server,
     because the console is a web page and its convenience is never the
     authority (rule 6). */
  if(b.kind === 'schedAck')      return schAck_(b, u);
  if(b.kind === 'schedSeen')     return schSeen_(b, u);
  if(b.kind === 'schedulePublish'){
    if(!tenant_().schedule) return json_({ ok:false, error:'This register carries no filing schedule.' });
    return schPublish_(b, u);
  }
  if(b.kind === 'schedNudge')    return schNudge_(b, u);

  /* the officer roll from the console. Each re-checks the Collector's own
     role on the server; none of them deletes anything. */
  /* THE YEAR'S HOLIDAYS, from the console, by the Collector alone. The
     bootstrap key is gone from a register the moment it is deployed
     normally, and a register that cannot be given its holidays afterwards is
     a register that counts festivals as working days for ever. */
  if(b.kind === 'holidaysLoad'){
    if(u.role !== 'COLLECTOR') return json_({ ok:false, error:'The year is loaded by the Collector alone.' });
    return holidayLoad_('COLLECTOR ' + u.phone);
  }
  if(b.kind === 'rollUpdate') return rollUpdate_(b, u);
  if(b.kind === 'userCreate') return createUser_(b, u);
  if(b.kind === 'userPin')    return resetUserPin_(b, u);
  if(b.kind === 'userActive') return setUserActive_(b, u);

  /* everything below writes an evaluation, which a Secretary may not do */
  if(viewerRole_(u.role))
    return json_({ ok:false, error:'Your login has view access only. Evaluations are filed by the Mandal Sanitation Task Force.' });

  /* THE 100-MARK EVALUATION IS THE SANITATION REGISTER'S WORK. A register
     that was never asked for it refuses at the door rather than growing a
     half-filled Inspections tab nobody reads. */
  if(!tenant_().evaluation)
    return json_({ ok:false, error:'This register does not take village evaluations.' });
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
    if(h === 'ym')               v = "'" + fileYm_(r);         // leading quote keeps it text
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
  /* his filing schedule now reads differently — drop the held reading so the
     next screen he opens shows the village closed rather than still owed */
  schBust_(r.date);
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
/* EVERY ROW CARRYING THIS ID, not the first of them. An application is one
   thing; before saveLeave_ took the lock, a retry racing its original could
   put the same id on the register twice. The Collector then sanctioned the
   first row and its twin stayed PENDING — and stayed PENDING for ever, because
   every further order looked the id up, found the row already APPROVED and
   answered 'orders have already been passed'. Three applications sat in
   Awaiting your orders on the console for eight days that way, sanctioned and
   waiting at the same time. An order is passed on the APPLICATION, so it is
   written to every row that bears its id. */
function leaveRows_(sh, m, id){
  const data = sh.getDataRange().getValues();
  const out = [];
  for(let i = 1; i < data.length; i++)
    if(String(data[i][m.ix.id]) === String(id)) out.push({ at: i + 1, row: data[i] });
  return out;
}
function leaveRow_(sh, m, id){ return leaveRows_(sh, m, id)[0] || null; }

/* ONE LINE PER APPLICATION, whatever the register holds. Twins are folded on
   the way out and the DECIDED one is kept, so a leftover PENDING row can no
   longer stand in the console asking for an order that was passed a week ago,
   and cannot be counted twice against an officer's year. Nothing is deleted:
   both rows stay on the Sheet, and Admin.gs settles them under the
   Collector's hand. A row with no id is not an application at all — it cannot
   be decided, because every order is passed by id — so it is left out rather
   than shown as one more officer awaiting orders. */
function leaveFold_(rows){
  const by = {}, order = [];
  rows.forEach(r => {
    const id = String(r.id || '').trim();
    if(!id) return;
    const held = by[id];
    if(!held){ by[id] = r; order.push(id); return; }
    const heldPending = String(held.status || 'PENDING') === 'PENDING';
    const thisPending = String(r.status || 'PENDING') === 'PENDING';
    /* a decision beats no decision; between two decisions, the later one */
    if(heldPending && !thisPending) by[id] = r;
    else if(heldPending === thisPending && String(r.decidedAt || '') > String(held.decidedAt || '')) by[id] = r;
  });
  return order.map(id => by[id]);
}

/* THE UNBROKEN RUN OF MEDICAL LEAVE these dates belong to — the spell asked
   for, together with every medical leave already applied for or sanctioned
   that touches it, directly or through another. Spells that merely adjoin are
   one spell: an officer away from the 1st to the 15th and again from the 16th
   to the 30th has been away thirty days at a time, and two rows in a register
   do not make that two absences. A refused or withdrawn application is not
   part of any run; a resubmission under the same id is the application itself
   and is left out so that correcting one does not count it twice. */
function mlRun_(sh, m, phone, from, to, skipId){
  const spans = [{ f: from, t: to }];
  const all = sh.getDataRange().getValues();
  for(let i = 1; i < all.length; i++){
    if(cell_(all[i], m.ix.id) === String(skipId || '')) continue;
    if(phone10_(all[i][m.ix.phone]) !== phone) continue;
    if(cell_(all[i], m.ix.type) !== 'ML') continue;
    const st = cell_(all[i], m.ix.status);
    if(st !== 'PENDING' && st !== 'APPROVED') continue;
    const f2 = dateText_(all[i][m.ix.fromDate]), t2 = dateText_(all[i][m.ix.toDate]);
    if(f2 && t2 && t2 >= f2) spans.push({ f: f2, t: t2 });
  }
  spans.sort(function(a, b){ return a.f < b.f ? -1 : a.f > b.f ? 1 : 0; });
  const runs = [];
  spans.forEach(function(sp){
    const last = runs[runs.length - 1];
    if(last && sp.f <= dayAfter_(last.t)){ if(sp.t > last.t) last.t = sp.t; }
    else runs.push({ f: sp.f, t: sp.t });
  });
  for(let j = 0; j < runs.length; j++)
    if(runs[j].f <= from && runs[j].t >= from) return spanDays_(runs[j].f, runs[j].t);
  return spanDays_(from, to);
}

function saveLeave_(b, u){
  const l = b.leave || {};
  if(!l.id) return json_({ ok:false, error:'bad request' });
  const from = dateText_(l.from), to = dateText_(l.to);
  if(!from || !to) return json_({ ok:false, error:'The dates are not readable.' });
  if(to < from) return json_({ ok:false, error:'The last day falls before the first.' });

  /* an Optional Holiday is one NOTIFIED day — the G.O.'s list, nothing else */
  const isOH = String(l.type || '') === 'OH';
  const isML = String(l.type || '') === 'ML';
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

  /* NOT MORE THAN FIFTEEN DAYS OF MEDICAL LEAVE AT A TIME. Measured from the
     DATES and never from the day count the phone sends — the client only
     asks — and measured over the whole run, so a second spell that begins the
     morning the first one ends is refused with the two counted together. The
     officer is told what the register makes it come to, and told where a
     longer absence is decided: by the Collector, under the leave rules, and
     not by this table. */
  if(isML){
    const run = mlRun_(sh, m, u.phone, from, to, l.id);
    if(run > ML_MAX_SPELL){
      const own = spanDays_(from, to);
      return json_({ ok:false, error:'Medical leave cannot be taken for more than ' + ML_MAX_SPELL + ' days at a time. ' +
        (run === own ? 'These dates come to ' + own + ' days.'
                     : 'These dates run on from medical leave already on the register, and come to ' + run + ' days in one spell.') +
        ' Apply for ' + ML_MAX_SPELL + ' days or fewer. A longer absence is for the Collector to consider under the leave rules.' });
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
  return json_(r.ok ? { ok:true, id:id, status:want, decidedBy:r.decidedBy, decidedAt:r.decidedAt, rows:r.rows }
                    : { ok:false, error:r.error });
}
/* one application, one order — the checks live here so a bulk sanction
   obeys exactly the same law as a single one */
function decideOneLeave_(id, want, remarks, u){
  const sh = sheet_('Leave', L_HEAD);
  const m = headMap_(sh, L_HEAD);
  /* the APPLICATION, which may be more than one row — see leaveRows_ */
  const hits = leaveRows_(sh, m, id);
  if(!hits.length) return { ok:false, error:'That application is not on the district record yet.' };
  const found = hits[0];

  /* IT IS WAITING IF ANY ROW OF IT IS WAITING. Reading only the first row is
     what left a sanctioned application sitting in the console for ever: the
     first row said APPROVED, so the order was refused, so the twin stayed
     PENDING, so it was still waiting the next morning. */
  const open = hits.filter(h => String(h.row[m.ix.status] || 'PENDING') === 'PENDING');
  if(!open.length){
    const st = String(found.row[m.ix.status] || 'PENDING');
    return { ok:false, error:'Orders have already been passed on this application (' + st + ').' };
  }

  if(want === 'APPROVED'){
    const type = String(found.row[m.ix.type] || '');
    const yr = Number(String(dateText_(found.row[m.ix.fromDate])).slice(0,4));
    const ent = entitlement_(type, yr);
    if(ent > 0){
      const ph = phone10_(found.row[m.ix.phone]);
      const all = sh.getDataRange().getValues();
      let used = 0;
      const counted = {};
      for(let i = 1; i < all.length; i++){
        if(String(all[i][m.ix.id]) === id) continue;
        if(phone10_(all[i][m.ix.phone]) !== ph) continue;
        if(String(all[i][m.ix.type]) !== type) continue;
        if(String(all[i][m.ix.status]) !== 'APPROVED') continue;
        if(Number(String(dateText_(all[i][m.ix.fromDate])).slice(0,4)) !== yr) continue;
        /* ONE SPELL, ONE DEBIT TO THE YEAR. A duplicated row is not a second
           absence, and counting it twice refuses an officer leave he still
           holds — the same arithmetic that decides loss of pay. */
        const seenId = String(all[i][m.ix.id] || '').trim();
        if(seenId && counted[seenId]) continue;
        if(seenId) counted[seenId] = true;
        used += Number(all[i][m.ix.days]) || 0;
      }
      const want_ = Number(found.row[m.ix.days]) || 0;
      if(used + want_ > ent)
        return { ok:false, error:'That would exceed the year\'s ' + type + ': ' + ent +
          ' for ' + yr + ', ' + used + ' already sanctioned, ' + want_ + ' now sought.' };
    }
  }
  const when = new Date().toISOString();
  /* every row of the application, so no twin is left behind still waiting */
  hits.forEach(h => {
    sh.getRange(h.at, m.ix.status + 1).setValue(want);
    sh.getRange(h.at, m.ix.decidedBy + 1).setValue(u.name + ' (' + u.role + ')');
    sh.getRange(h.at, m.ix.decidedAt + 1).setValue(when);
    sh.getRange(h.at, m.ix.remarks + 1).setValue(String(remarks || '').slice(0, 1000));
  });
  return { ok:true, decidedBy:u.name + ' (' + u.role + ')', decidedAt:when, rows:hits.length };
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
  /* returned as well as logged, so the Sheet's District maintenance menu can
     put it in a dialog — a finding nobody reads is a finding nobody acts on */
  const text = out.length ? out.join('\n') : 'The roll is clean.';
  Logger.log(text);
  return text;
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

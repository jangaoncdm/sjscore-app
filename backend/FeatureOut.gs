/* ============================================================================
 * FEATURE · OUT — the other end of the day
 * ----------------------------------------------------------------------------
 * Ordered 02.10.2026. An officer marks IN as he always has; seven and a half
 * hours later he may mark OUT, and the register records of that mark exactly
 * what it records of the first: the photograph, the coordinates, how precise
 * they were, the time his handset claims and the time the district actually
 * received it.
 *
 * WHAT IT DOES NOT DO, and this is the half that matters on a register that
 * issues show-cause notices under the Conduct Rules:
 *
 *   · a missing OUT raises a REMINDER AND NOTHING ELSE (the Collector's
 *     direction). No show-cause notice, no casual-leave debit, no lock on the
 *     app, and no entry anywhere the absence ladder can read. The ladder
 *     counts unmarked ATTENDANCE — that is what a served notice recites under
 *     Rule 3 — and a man who came to work and forgot to close his day has not
 *     been absent. The reminder is kept on this module's OWN tab, never on
 *     `Reminders`, so there is no table through which the two could ever meet;
 *
 *   · it computes no hours worked. Seven and a half hours is the gate on the
 *     button, not a figure the register publishes about a man. An hours total
 *     is a payroll claim and this register does not make one;
 *
 *   · and it never gates the app. The IN stands between sign-in and everything
 *     else because marking it is the whole point of the morning; an OUT that
 *     did the same would shut an officer out of his own records all evening
 *     for forgetting.
 *
 * THE DISTRICT'S CLOCK, NOT THE HANDSET'S (rule 1). The hour at which OUT
 * opens is worked out here, from the register's own reading of when he came
 * in — effMarkAt_, the earlier of his claim and our receipt, which is the
 * same reading every other judgement about his morning is made on. The app is
 * TOLD that hour and counts down to it; it does no arithmetic of its own,
 * because a phone eleven minutes fast would open the button eleven minutes
 * early and that is the fault rule 1 exists for. The server checks it again
 * when the mark arrives, because the server decides (rule 6).
 *
 * SEVEN AND A HALF HOURS THAT RUN PAST THE DAY ARE NOT SERVED. An officer who
 * marks in at four in the afternoon cannot complete them, so the register
 * records his IN with no OUT and says so. Nothing is invented for him, and
 * nothing is held against him.
 *
 * ONE DAY, ONE ROW. The OUT is written onto the officer's own attendance row
 * for that date — ensureHeaders_ appends the columns and no migration is
 * needed. A separate tab would mean the evening reader, the daily report, the
 * console and every export joining two sources for one officer's day, and a
 * join is exactly where "ninety sanctioned officers shown as unmarked" came
 * from. This module is the only thing that reads or writes those columns.
 * ========================================================================== */

/* The Collector's order of 02.10.2026. Changing it is an order, not an edit. */
var OUT_AFTER_MINUTES = 450;          /* seven and a half hours */

/* AND THE END OF THE WORKING DAY, which the order needs and the calendar does
   not give. The direction was that an officer who marks in at four in the
   afternoon cannot serve the seven and a half hours and so has no marking out;
   midnight alone would have let him close his day at half past eleven at
   night, which is the outcome the direction ruled out. Nine in the evening is
   the figure taken, and it is the Collector's to set. */
var OUT_DAY_ENDS = '21:00';

/* What the OUT adds to the officer's own attendance row. */
var A_OUT_HEAD = ['outAt','outLat','outLng','outAccuracy','outVerified','outPhoto',
                  'outReceivedAt','outSkew','outId'];

/* This module's own record of the mornings it reminded somebody. It is NOT the
   Reminders tab, deliberately: the absence ladder has nothing to do with this
   and must have no table in common with it. */
var OUTREM_HEAD = ['date','phone','name','role','mandal','inAt','sentAt','emailedAt'];

function feature_out(){
  return {
    title: 'Marking out — seven and a half hours after marking in',
    tenants: ['SJGP'],

    get: {
      /* WHAT THE OFFICER'S OWN PHONE NEEDS TO KNOW, and nothing else: whether
         he has marked in today, the exact moment his OUT opens, and whether he
         has already closed the day. The app draws its card from this and does
         no arithmetic of its own. */
      /* WHAT THE CONSOLE READS, and it is this module that serves it rather
         than the dashboard payload in Code.gs. A feature is a file (02.10),
         and cutting a column into the district's main payload for it would
         be the incision the arrangement exists to avoid — the payload is also
         cached for fifty seconds, and this is the one figure a Collector
         watching the evening would refresh. One call, keyed by phone, merged
         on the page. */
      outday: function(p, u){
        if(u.role !== 'COLLECTOR')
          return json_({ ok:false, error:'The marking-out register is the Collector' + String.fromCharCode(8217) + 's.' });
        const date = p.date ? dateText_(p.date) : today_();
        const sh = sheet_('Attendance', A_HEAD.concat(A_OUT_HEAD));
        const m = headMap_(sh, A_HEAD.concat(A_OUT_HEAD));
        const v = sh.getDataRange().getValues();
        const rows = [], seen = {};
        let closed = 0, open = 0, cannot = 0;
        for(let i = 1; i < v.length; i++){
          if(dateText_(v[i][m.ix.date]) !== date) continue;
          const ph = phone10_(v[i][m.ix.phone]); if(!ph || seen[ph]) continue;
          seen[ph] = true;
          const role = String(v[i][m.ix.role] || '').toUpperCase();
          /* an MSO need not mark in at all, so he is never counted as owing
             a marking out either (order of 19.08.2026) */
          if(attExempt_(role)) continue;
          const eff = effMarkAt_(String(v[i][m.ix.markedAt] || ''), String(v[i][m.ix.receivedAt] || ''));
          const outAt = String(v[i][m.ix.outAt] || '');
          const from = outOpensAt_(eff, date);
          if(outAt) closed++; else if(!from) cannot++; else open++;
          rows.push({ phone:ph, name:String(v[i][m.ix.name] || ''), role:role,
            mandal:String(v[i][m.ix.mandal] || ''), inAt:eff, outAt:outAt,
            outFrom:from, outVerified:!!v[i][m.ix.outVerified],
            outAccuracy:Number(v[i][m.ix.outAccuracy] || 0) || null,
            outPhoto:String(v[i][m.ix.outPhoto] || '') });
        }
        /* IT ACCUSES NOBODY, and the answer says so in the words the app and
           the mail use, so the console cannot quietly grow a sanction this
           register does not have. */
        return json_({ ok:true, date:date, rows:rows,
          closed:closed, open:open, cannot:cannot, marked:rows.length,
          sanction:false,
          note:'A day left unclosed draws a reminder by mail the next working morning and nothing else — no notice, no debit and no lock.' });
      },

      out: function(p, u){
        const date = today_();
        const row = outRow_(u.phone, date);
        if(!row) return json_({ ok:true, date:date, markedIn:false, markedOut:false,
                                canOut:false, why:'no mark in today' });
        const from = outOpensAt_(row.eff, date);
        return json_({ ok:true, date:date, today:date,
          markedIn:true, inAt:row.eff,
          markedOut:!!row.outAt, outAt:row.outAt || '',
          /* '' when seven and a half hours run past the end of the day */
          outFrom:from,
          canOut: !!from && !row.outAt && Date.now() >= new Date(from).getTime(),
          why: row.outAt ? 'already marked out'
             : (!from ? 'seven and a half hours would run past the end of the day'
                      : '') });
      }
    },

    post: {
      /* The mark itself. Everything IN does, done once more. */
      attendanceOut: function(b, u){
        const a = b.att || {};
        const date = today_();
        const row = outRow_(u.phone, date);
        if(!row) return json_({ ok:false, error:'There is no mark in for today to close.' });

        /* A RETRY IS NOT A SECOND MARK (rule 5). The phone carries the same id
           when the signal swallowed our answer; that is the same mark arriving
           twice and it is accepted and written once. */
        if(row.outAt){
          if(row.outId && String(a.id || '') === row.outId)
            return json_({ ok:true, already:true, outAt:row.outAt });
          return json_({ ok:false, error:'You marked out at ' + hhmm_(row.outAt) + ' today.' });
        }

        const from = outOpensAt_(row.eff, date);
        if(!from) return json_({ ok:false,
          error:'Seven and a half hours from your mark in would run past the end of today, so there is no marking out to do.' });

        /* THE SAME FIELD THE MARK IN USES. saveAttendance_ reads the handset's
           claim from `ts`, so this reads `ts` too; an OUT that read `markedAt`
           was silently stamping the moment of ARRIVAL as the claim, and every
           suite that set the clock to the same minute agreed with it.

           THE SERVER DECIDES (rule 6). The app hides the button until the hour,
           but a mark queued on a village road and sent later still carries the
           moment it was pressed, and that is what is judged. */
        const claim = String(a.ts || '') || new Date().toISOString();
        const recv = new Date().toISOString();
        const eff = effMarkAt_(claim, recv);
        /* COMPARED AS INSTANTS, NEVER AS STRINGS. effMarkAt_ hands back
           whichever of the two readings is earlier, and the phone's carries a
           +05:30 offset while ours carries a Z — so '...T17:29+05:30' reads as
           LATER than '...T12:00Z' to a string comparison, and every early mark
           was being accepted. Caught by suite 30 before it ever ran. */
        if(new Date(eff).getTime() < new Date(from).getTime())
          return json_({ ok:false, early:true, outFrom:from,
            error: 'Marking out opens at ' + hhmm_(from) + ', seven and a half hours after you marked in.' });

        /* the photograph goes to Drive BEFORE the lock, exactly as the IN's
           does — that rule was paid for during the Drive outage of 19.08.2026,
           when one hung upload held the global lock and starved the district */
        let url = '';
        if(b.photo && b.photo.b64){
          try{
            const root = getFolder_(DriveApp.getRootFolder(), ATT_FOLDER);
            const f = getFolder_(getFolder_(getFolder_(root, date.slice(0, 7)),
                        clean_(u.mandal) || 'Unassigned'), date);
            const file = f.createFile(Utilities.newBlob(Utilities.base64Decode(b.photo.b64),
                        'image/jpeg', b.photo.name || (u.phone + '-out.jpg')));
            url = file.getUrl();
            try{ file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(err){}
          }catch(err){ url = ''; }
        }

        const lock = LockService.getScriptLock();
        try{ lock.waitLock(20000); }catch(err){ return json_({ ok:false, error:'busy — try again' }); }
        try{
          const sh = sheet_('Attendance', A_HEAD.concat(A_OUT_HEAD));
          const m = headMap_(sh, A_HEAD.concat(A_OUT_HEAD));
          const v = sh.getDataRange().getValues();
          let at = 0;
          for(let i = 1; i < v.length; i++){
            if(phone10_(v[i][m.ix.phone]) === u.phone && dateText_(v[i][m.ix.date]) === date){ at = i + 1; break; }
          }
          if(!at) return json_({ ok:false, error:'There is no mark in for today to close.' });
          /* read once more under the lock: two syncs landing together is how
             the duplicate rows got in the first time */
          if(String(v[at - 1][m.ix.outAt] || '')) return json_({ ok:true, already:true,
            outAt:String(v[at - 1][m.ix.outAt]) });

          const set = (k, val) => { if(m.ix[k] >= 0) sh.getRange(at, m.ix[k] + 1).setValue(val); };
          const acc = a.acc == null ? '' : Math.round(Number(a.acc));
          set('outAt', claim);
          set('outLat', a.lat == null ? '' : a.lat);
          set('outLng', a.lng == null ? '' : a.lng);
          set('outAccuracy', acc);
          set('outVerified', !!a.verified);
          set('outPhoto', url);
          set('outReceivedAt', recv);
          set('outSkew', clockSkew_(claim, recv));
          set('outId', a.id || Utilities.getUuid());
          return json_({ ok:true, outAt:claim, receivedAt:recv, photo:!!url });
        } finally { lock.releaseLock(); }
      }
    },

    /* ---- the morning after ----
       A REMINDER AND NOTHING ELSE. Read after the day has closed, never on the
       running one (rule 2): a mark sent from a village road at eight in the
       evening is still a mark, and judging the day while it runs is how an
       honest officer gets chased. */
    daily: function(){
      const day = prevWorkingDay_(today_());
      if(!day) return 'no previous working day';
      if(!isWorkingDay_(day)) return day + ' was not a working day';

      const sh = sheet_('Attendance', A_HEAD.concat(A_OUT_HEAD));
      const m = headMap_(sh, A_HEAD.concat(A_OUT_HEAD));
      const v = sh.getDataRange().getValues();

      const done = outRemindedOn_(day);
      const owed = [];
      for(let i = 1; i < v.length; i++){
        if(dateText_(v[i][m.ix.date]) !== day) continue;
        if(String(v[i][m.ix.outAt] || '')) continue;              /* he closed it */
        const role = String(v[i][m.ix.role] || '').toUpperCase();
        /* AN MSO'S ATTENDANCE IS VOLUNTARY (order of 19.08.2026). A man who
           need not mark in at all is not chased for not marking out. */
        if(attExempt_(role)) continue;
        const phone = phone10_(v[i][m.ix.phone]);
        if(!phone || done[phone]) continue;
        const eff = effMarkAt_(String(v[i][m.ix.markedAt] || ''), String(v[i][m.ix.receivedAt] || ''));
        /* and nobody is reminded for a day on which the seven and a half hours
           could never have been served */
        if(!outOpensAt_(eff, day)) continue;
        owed.push({ row:i, phone:phone, name:String(v[i][m.ix.name] || ''),
                    role:role, mandal:String(v[i][m.ix.mandal] || ''), inAt:eff });
      }
      if(!owed.length) return day + ': every officer who marked in closed his day';

      const rsh = sheet_('OutReminders', OUTREM_HEAD);
      const rm = headMap_(rsh, OUTREM_HEAD);
      let mailed = 0;
      owed.forEach(function(o){
        let sent = '';
        try{
          const u = findByPhone_(o.phone);
          if(u && u.email){
            /* A REMINDER NAMES NO SANCTION (the direction of 28.08.2026). It
               says the one thing it is for and stops. */
            MailApp.sendEmail(u.email,
              'Attendance out not marked — ' + dmy_(day),
              'Attendance out was not marked on ' + dmy_(day) + '.\n\n' +
              'Please mark out in the SJGP app at the end of your working day.\n\n' +
              'Office of the Collector & District Magistrate, Jangaon.');
            sent = new Date().toISOString(); mailed++;
          }
        }catch(err){}
        const row = new Array(rm.width).fill('');
        const put = (k, val) => { if(rm.ix[k] >= 0) row[rm.ix[k]] = val; };
        put('date', "'" + day); put('phone', "'" + o.phone); put('name', o.name);
        put('role', o.role); put('mandal', o.mandal); put('inAt', o.inAt);
        put('sentAt', new Date().toISOString()); put('emailedAt', sent);
        rsh.appendRow(row);
      });
      return day + ': ' + owed.length + ' officer(s) did not close the day, ' + mailed + ' reminded by mail';
    }
  };
}

/* ---------------------------------------------------------------- helpers */
/* one officer's row for a date, with the reading every judgement is made on */
function outRow_(phone, date){
  const sh = sheet_('Attendance', A_HEAD.concat(A_OUT_HEAD));
  const m = headMap_(sh, A_HEAD.concat(A_OUT_HEAD));
  const v = sh.getDataRange().getValues();
  for(let i = 1; i < v.length; i++){
    if(phone10_(v[i][m.ix.phone]) !== phone10_(phone)) continue;
    if(dateText_(v[i][m.ix.date]) !== date) continue;
    return {
      at:i + 1,
      eff: effMarkAt_(String(v[i][m.ix.markedAt] || ''), String(v[i][m.ix.receivedAt] || '')),
      outAt: String(v[i][m.ix.outAt] || ''),
      outId: String(v[i][m.ix.outId] || '')
    };
  }
  return null;
}

/* WHEN MARKING OUT OPENS, or '' if the seven and a half hours would run past
   the end of that day. The day ends at midnight of the district's own date;
   an officer who marked in at four in the afternoon cannot serve them, and
   the register says so rather than inventing a figure for him. */
function outOpensAt_(inAt, date){
  const t = new Date(String(inAt || '')).getTime();
  if(isNaN(t)) return '';
  const opens = new Date(t + OUT_AFTER_MINUTES * 60000);
  /* WHICH DISTRICT DAY THAT INSTANT FALLS ON. dateText_ reads a SHEET CELL;
     handed an ISO timestamp it hands it straight back, so comparing with it
     said 'past the end of the day' for every officer in the district. The
     day of an instant is the script timezone's, exactly as today_ takes it. */
  if(outDay_(opens) !== date) return '';
  /* and it must open while the working day is still running */
  if(outClock_(opens) > OUT_DAY_ENDS) return '';
  return opens.toISOString();
}

/* the clock face of an instant in the district's own timezone, HH:mm */
function outClock_(d){
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'HH:mm');
}

/* the district's day for an instant — the same reading today_ takes */
function outDay_(d){
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/* who has already been reminded for a day, so a second run of the daily job
   writes nothing and sends nothing (rule 8) */
function outRemindedOn_(day){
  const out = {};
  try{
    const sh = sheet_('OutReminders', OUTREM_HEAD);
    const m = headMap_(sh, OUTREM_HEAD);
    const v = sh.getDataRange().getValues();
    for(let i = 1; i < v.length; i++)
      if(dateText_(v[i][m.ix.date]) === day) out[phone10_(v[i][m.ix.phone])] = true;
  }catch(err){}
  return out;
}

/* 5:30 pm, as an officer reads it.
   TURNED BY HAND from a 24-hour reading rather than asked for with 'h:mm a'.
   This string is shown to 280 officers and quoted back in a refusal, and a
   format pattern the suites cannot reproduce is a string nothing checks. */
function hhmm_(iso){
  try{
    const s = Utilities.formatDate(new Date(String(iso)), Session.getScriptTimeZone(), 'HH:mm');
    const h = Number(s.slice(0, 2)), m = s.slice(3, 5);
    if(isNaN(h)) return String(iso || '');
    return ((h % 12) === 0 ? 12 : (h % 12)) + ':' + m + ' ' + (h < 12 ? 'am' : 'pm');
  }catch(err){ return String(iso || ''); }
}

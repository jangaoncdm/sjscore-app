/* MARKING OUT — the other end of the day.

   Ordered 02.10.2026. An officer marks IN as he always has; seven and a half
   hours later he may mark OUT, and the register records of that mark exactly
   what it records of the first.

   What this suite is really guarding is the half that could hurt somebody:

     · the hour is worked out by the DISTRICT, from its own reading of when he
       came in, and checked again when the mark arrives. A phone eleven
       minutes fast must not open the button eleven minutes early (rule 1),
       and a mark queued on a village road is judged on when it was pressed;
     · a missing OUT raises a REMINDER AND NOTHING ELSE, by the Collector's
       direction. No notice, no debit, no lock, and nothing written anywhere
       the absence ladder can read. A man who came to work and forgot to close
       his day has not been absent;
     · an MSO, whose attendance is voluntary, is never chased for it;
     · a day on which the seven and a half hours could not be served raises
       nothing at all;
     · a retry is not a second mark (rule 5), a second run of the morning job
       sends nothing twice (rule 8), and it is Swachh Jangaon's alone.
*/
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'marking out (seven and a half hours, and it accuses nobody)',
  run(t){

    /* A GENUINELY WORKING DAY, and checked rather than assumed. The first cut
       of this suite took 02.10.2026 for a working Friday; it is Gandhi Jayanti,
       a General Holiday on the G.O., so the morning-after sections looked back
       past it to 1 October, found nobody who had marked in, and reported that
       every officer had closed his day. */
    const DAY = '2026-10-06';                                    /* a Tuesday */
    const NEXT = '2026-10-07T07:00:00+05:30';           /* the morning after */
    const at = (hhmm) => DAY + 'T' + hhmm + ':00+05:30';
    const start = env => {
      env.seedUsers();
      env.mkSheet('Audit', ['At','Action','Subject','Detail','By'], []);
      return env;
    };
    const tok = (env, p) => env.ctx.issueToken_(env.ctx.findByPhone_(p));
    /* `ts` IS WHAT THE APP SENDS, and what saveAttendance_ reads. Sending
       `markedAt` means the core falls back to its own clock, so the claim and
       the receipt were the same instant and nothing about rule 1 was tested.
       The id carries the phone: two officers sharing one mark id is a
       duplicate to the register, not two marks. */
    let seq = 0;
    const markIn = (env, token, hhmm, phone) => env.post({ kind:'attendance', token:token,
      att:{ id:'IN-' + (phone || ++seq) + '-' + hhmm, date:DAY, ts:at(hhmm),
            lat:17.72, lng:79.14, acc:11, verified:true } });

    /* ---- 1. SEVEN AND A HALF HOURS, AND THE DISTRICT SAYS WHEN ---- */
    {
      const e = start(mock.load({ now:at('10:00') }));
      const ps = tok(e, '9000000014');

      const before = e.get('out', { token:ps });
      t.eq(before.markedIn, false, 'with no mark in there is nothing to close');
      t.eq(before.canOut, false, 'and no marking out');

      markIn(e, ps, '10:00');
      const st = e.get('out', { token:ps });
      t.eq(st.markedIn, true, 'he has marked in');
      t.eq(e.ctx.hhmm_(st.outFrom), '5:30 pm', 'AND MARKING OUT OPENS AT 5:30 pm — 10:00 plus seven and a half hours');
      t.eq(st.canOut, false, 'not yet, at ten in the morning');

      /* the app is TOLD the hour; it does no arithmetic of its own */
      t.ok(!!st.outFrom, 'the register hands the phone the exact moment, rather than a rule to apply');
    }

    /* ---- 2. BEFORE THE HOUR IT IS REFUSED, AND THE REFUSAL IS READABLE ---- */
    {
      const e = start(mock.load({ now:at('10:00') }));
      const ps = tok(e, '9000000014');
      markIn(e, ps, '10:00');

      e.setNow(at('17:29'));
      const early = e.post({ kind:'attendanceOut', token:ps,
        att:{ id:'O1', ts:at('17:29'), lat:17.72, lng:79.14, acc:11, verified:true } });
      t.eq(early.ok, false, 'a minute before the hour is refused');
      t.contains(early.error, '5:30 pm', 'and the officer is told the hour in his own words');
      t.eq(early.early, true, 'the app is told why, so it can show a countdown rather than an error');

      e.setNow(at('17:30'));
      const onTime = e.post({ kind:'attendanceOut', token:ps,
        att:{ id:'O2', ts:at('17:30'), lat:17.72, lng:79.14, acc:11, verified:true } });
      t.eq(onTime.ok, true, 'and on the hour exactly, it is taken');
    }

    /* ---- 3. IT RECORDS WHAT THE MARK IN RECORDS ---- */
    {
      const e = start(mock.load({ now:at('10:00') }));
      const ps = tok(e, '9000000014');
      markIn(e, ps, '10:00');
      e.setNow(at('17:40'));
      const r = e.post({ kind:'attendanceOut', token:ps,
        att:{ id:'O1', ts:at('17:40'), lat:17.73, lng:79.15, acc:9, verified:true },
        photo:{ b64:'eHh4', name:'out.jpg' } });
      t.eq(r.ok, true, 'the mark is taken');
      t.eq(r.photo, true, 'with its photograph');

      const sh = e.sheets['Attendance'], head = sh.rows[0].map(String);
      const row = sh.rows.slice(1).find(x => String(x[head.indexOf('phone')]).indexOf('9000000014') >= 0);
      const col = k => String(row[head.indexOf(k)]);
      t.ok(!!row, 'ON HIS OWN ROW — one day is one row');
      t.contains(col('outAt'), '17:40', 'the time he claims');
      t.ok(!!col('outReceivedAt'), 'the time the district received it');
      t.eq(col('outLat'), '17.73', 'where he was');
      t.eq(col('outAccuracy'), '9', 'how precise the reading was');
      t.eq(col('outVerified').toUpperCase(), 'TRUE', 'whether it was trustworthy');
      t.ok(!!col('outPhoto'), 'and the photograph');
      t.ok(col('markedAt').indexOf('10:00') >= 0, 'while the mark IN is untouched beside it');

      /* and the state the phone reads back */
      const st = e.get('out', { token:ps });
      t.eq(st.markedOut, true, 'the app is told the day is closed');
      t.eq(st.canOut, false, 'and offers nothing further');
    }

    /* ---- 4. ONE MARK OUT, AND A RETRY IS NOT A SECOND ONE ---- */
    {
      const e = start(mock.load({ now:at('10:00') }));
      const ps = tok(e, '9000000014');
      markIn(e, ps, '10:00');
      e.setNow(at('17:40'));
      e.post({ kind:'attendanceOut', token:ps, att:{ id:'O1', ts:at('17:40'), lat:17.7, lng:79.1, acc:9 } });

      /* the same id again is the signal having swallowed our answer (rule 5) */
      const retry = e.post({ kind:'attendanceOut', token:ps, att:{ id:'O1', ts:at('17:40') } });
      t.eq(retry.ok, true, 'the same mark arriving twice is accepted');
      t.eq(retry.already, true, 'and written once');

      e.setNow(at('18:30'));
      const second = e.post({ kind:'attendanceOut', token:ps, att:{ id:'O2', ts:at('18:30') } });
      t.eq(second.ok, false, 'a genuinely second marking out is refused');
      t.contains(second.error, '5:40 pm', 'naming the one that stands');

      const sh = e.sheets['Attendance'], head = sh.rows[0].map(String);
      const mine = sh.rows.slice(1).filter(x => String(x[head.indexOf('phone')]).indexOf('9000000014') >= 0);
      t.eq(mine.length, 1, 'and he still has exactly one row for the day');
      t.contains(String(mine[0][head.indexOf('outAt')]), '17:40', 'carrying the first mark');
    }

    /* ---- 5. SEVEN AND A HALF HOURS THAT RUN PAST THE DAY ARE NOT SERVED ---- */
    {
      const e = start(mock.load({ now:at('16:00') }));
      const ps = tok(e, '9000000014');
      markIn(e, ps, '16:00');
      const st = e.get('out', { token:ps });
      t.eq(st.outFrom, '', 'a mark in at four in the afternoon opens no marking out');
      t.contains(st.why, 'past the end of the day', 'and it says why, plainly');
      e.setNow(at('23:35'));
      const r = e.post({ kind:'attendanceOut', token:ps, att:{ id:'O1', ts:at('23:35') } });
      t.eq(r.ok, false, 'nor is one accepted at half past eleven at night');
      t.contains(r.error, 'past the end of today', 'with the same reason');
    }

    /* ---- 6. THE MORNING AFTER: A REMINDER, AND NOTHING ELSE ----
       The Collector's direction. A man who came to work and forgot to close
       his day has not been absent, and nothing here may suggest he was. */
    {
      const e = start(mock.load({ now:at('10:00') }));
      /* the MSO is 9000000010 on the standing roll — 13 is an MPO, and an
         earlier cut of this suite called him the MSO, so the assertion that
         the voluntary officer is spared was passing on a man it does not
         apply to */
      const ps = tok(e, '9000000014'), mso = tok(e, '9000000010');
      markIn(e, ps, '10:00', '14');
      markIn(e, mso, '10:00', '10');
      /* the Secretary closes nothing; the MSO closes nothing either */

      /* read the NEXT morning, never the running day (rule 2) */
      e.setNow(NEXT);
      const said = e.ctx.featureDaily();
      t.contains(said, 'out:', 'the feature’s daily round ran');

      const rem = e.sheets['OutReminders'];
      t.ok(!!rem, 'the module keeps its own record');
      const rows = rem.rows.slice(1);
      const phones = rows.map(r => String(r[0 + rem.rows[0].map(String).indexOf('phone')]));
      t.eq(rows.length, 1, 'ONE officer is reminded, not two');
      t.contains(JSON.stringify(rows), '9000000014', 'the Secretary, who was expected to mark');
      t.ok(JSON.stringify(rows).indexOf('9000000010') < 0,
        'AND NOT THE MSO — his attendance is voluntary, so his marking out cannot be chased');
      t.ok(e.outbox.some(x => /out not marked/i.test(x.subject)), 'he is reminded by mail');

      /* A REMINDER NAMES NO SANCTION (the direction of 28.08.2026) */
      const mail = e.outbox.filter(x => /out not marked/i.test(x.subject))[0];
      t.ok(!/show.cause|notice|casual leave|debit|loss of pay/i.test(mail.body),
        'and the mail names no sanction of any kind');

      /* NOTHING THE LADDER CAN READ */
      t.ok(!e.sheets['Reminders'] || JSON.stringify(e.sheets['Reminders'].rows).indexOf('9000000014') < 0,
        'nothing is written to the Reminders tab the absence ladder belongs to');
      t.ok(!e.sheets['Notices'] || e.sheets['Notices'].rows.length <= 1, 'no notice is raised');

      /* RULE 8: a nervous second run sends nothing and writes nothing */
      const before = rem.rows.length, mails = e.outbox.length;
      e.ctx.featureDaily();
      t.eq(rem.rows.length, before, 'a second run of the morning job writes no second row');
      t.eq(e.outbox.length, mails, 'and sends no second mail');
    }

    /* ---- 7. AND A DAY THAT COULD NOT BE SERVED RAISES NOTHING ---- */
    {
      const e = start(mock.load({ now:at('16:00') }));
      const ps = tok(e, '9000000014');
      markIn(e, ps, '16:00');
      e.setNow(NEXT);
      e.ctx.featureDaily();
      const rem = e.sheets['OutReminders'];
      t.ok(!rem || rem.rows.length <= 1,
        'an officer who could never have served the hours is not reminded');
    }

    /* ---- 7b. WHAT THE CONSOLE READS, AND WHO MAY READ IT ---- */
    {
      const e = start(mock.load({ now:at('10:00') }));
      const ps = tok(e, '9000000014'), mso = tok(e, '9000000010'),
            late = tok(e, '9000000011'), cdm = tok(e, '9000000001');
      markIn(e, ps, '10:00', '14');        /* closes his day */
      markIn(e, mso, '10:00', '10');       /* voluntary: not counted at all */
      /* AND THE CLOCK IS MOVED BEFORE HE MARKS, because effMarkAt_ takes the
         EARLIER of his claim and our receipt (rule 1): a claim of four in the
         afternoon arriving at ten in the morning is read as ten, and he could
         serve the hours after all. The first cut of this section sent the
         claim without moving the clock and was measuring nothing. */
      e.setNow(at('16:00'));
      markIn(e, late, '16:00', '11');      /* cannot serve the hours */
      e.setNow(at('17:40'));
      e.post({ kind:'attendanceOut', token:ps, att:{ id:'O1', ts:at('17:40'), lat:17.7, lng:79.1, acc:9, verified:true } });

      const r = e.get('outday', { token:cdm });
      t.eq(r.ok, true, 'the Collector may read the day');
      t.eq(r.closed, 1, 'one officer closed his day');
      t.eq(r.cannot, 1, 'and one could never have served the hours');
      t.eq(r.marked, 2, 'TWO officers are counted, not three');
      t.ok(JSON.stringify(r.rows).indexOf('9000000010') < 0,
        'THE MSO IS NOT ON IT — attendance is voluntary for him, so marking out cannot be owed');
      const mine = r.rows.filter(x => x.phone === '9000000014')[0];
      t.ok(!!mine && mine.outAt.indexOf('17:40') >= 0, 'the time he marked out');
      t.eq(!!mine.outVerified, true, 'and whether the reading was trustworthy');

      /* IT ACCUSES NOBODY, and says so in the payload so the console cannot
         quietly grow a sanction this register does not have */
      t.eq(r.sanction, false, 'the answer carries sanction:false, as the schedule’s does');
      /* THE ROWS, NOT THE NOTE. The note's whole job is to say that none of
         those things arises, so banning the words from it bans the sentence
         that gives the officer the assurance. */
      t.ok(!/show.cause|debit|casual leave|loss of pay/i.test(JSON.stringify(r.rows)),
        'and no row carries a sanction of any kind');
      t.contains(r.note, 'no notice, no debit and no lock',
        'while the note says in as many words that nothing arises from it');

      /* THE SERVER DECIDES WHO MAY SEE IT (rule 6) — the console is the
         Collector's, but hiding a panel is a courtesy, not a rule */
      t.eq(e.get('outday', { token:ps }).ok, false,
        'and a Panchayat Secretary may not read the district’s marking out');
    }

    /* ---- 8. IT IS SWACHH JANGAON'S ALONE ---- */
    {
      const g = mock.load({ now:at('10:00') });
      g.props.TENANT = 'GP';
      g.seedUsers();
      const rep = g.ctx.featureReport_();
      t.ok(!rep.live.some(f => f.name === 'out'), 'the Gram Palana register does not carry it');
      t.ok(rep.skipped.some(f => f.name === 'out' && /not for this register/.test(f.why)),
        'and says so');
      t.eq(g.get('out', { token: g.ctx.issueToken_(g.ctx.findByPhone_('9000000001')) }).ok, false,
        'its endpoint is simply not there');
    }

    /* ---- 9. AND IT COMES OUT OF THE ROAD IN A MINUTE ---- */
    {
      const e = start(mock.load({ now:at('10:00') }));
      const ps = tok(e, '9000000014');
      markIn(e, ps, '10:00');
      e.props.FEATURE_OFF = 'out';
      t.eq(e.get('out', { token:ps }).ok, false, 'FEATURE_OFF takes the whole feature out');
      e.setNow(at('17:40'));
      t.eq(e.post({ kind:'attendanceOut', token:ps, att:{ id:'O1', ts:at('17:40') } }).ok, false,
        'including the mark itself');
      /* AND THE MARK IN IS UNDISTURBED, which is the point of the arrangement */
      const sh = e.sheets['Attendance'], head = sh.rows[0].map(String);
      const row = sh.rows.slice(1).find(x => String(x[head.indexOf('phone')]).indexOf('9000000014') >= 0);
      t.ok(!!row && String(row[head.indexOf('markedAt')]).indexOf('10:00') >= 0,
        'his attendance is exactly as it was');
    }
  }
};

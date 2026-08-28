/* Rule 1 — the phone's clock is not evidence. A handset eleven minutes fast
   was recording marks in the future and could push an honest officer past
   the 11:00 cutoff. These are the exact cases that reached production. */
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'the clock (effMarkAt_, clockSkew_, lateness_)',
  run(t){
    const c = mock.load({}).ctx;

    /* the effective time is the EARLIER of claim and receipt */
    t.eq(c.effMarkAt_('2026-08-14T10:46:00+05:30', '2026-08-14T10:50:00+05:30'),
         '2026-08-14T10:46:00+05:30', 'an honest offline mark is untouched');
    t.eq(c.effMarkAt_('2026-08-14T11:11:00+05:30', '2026-08-14T11:00:00+05:30'),
         '2026-08-14T11:00:00+05:30', 'a mark can never post-date its own arrival');
    t.eq(c.effMarkAt_('', '2026-08-14T10:50:00+05:30'), '2026-08-14T10:50:00+05:30', 'no claim: receipt stands');
    t.eq(c.effMarkAt_('2026-08-14T10:46:00+05:30', ''), '2026-08-14T10:46:00+05:30', 'no receipt: claim stands');
    t.eq(c.effMarkAt_('garbage', '2026-08-14T10:50:00+05:30'), 'garbage', 'an unreadable claim is passed through, not judged');

    /* the fast handset that started all this: claims 11:07, arrived 10:56 —
       the officer was NOT past the cutoff */
    const eff = c.effMarkAt_('2026-08-14T11:07:00+05:30', '2026-08-14T10:56:00+05:30');
    t.eq(eff, '2026-08-14T10:56:00+05:30', 'the fast phone cannot push him past 11:00');

    /* skew is measured in seconds, positive means running fast */
    t.eq(c.clockSkew_('2026-08-14T10:11:00+05:30', '2026-08-14T10:00:00+05:30'), 660, 'eleven minutes fast reads +660s');
    t.eq(c.clockSkew_('2026-08-14T09:58:00+05:30', '2026-08-14T10:00:00+05:30'), -120, 'a slow phone reads negative');
    t.eq(c.clockSkew_('', '2026-08-14T10:00:00+05:30'), 0, 'no claim, no skew');
    t.eq(c.clockSkew_('garbage', '2026-08-14T10:00:00+05:30'), 0, 'unreadable, no skew');

    /* lateness_ tells "you were late" apart from "your signal was late" */
    const day = '2026-08-14';
    t.eq(c.lateness_({ at: '2026-08-14T10:30:00+05:30', got: '2026-08-14T10:31:00+05:30' }, day), '',
         'in time, received in time: nothing');
    t.eq(c.lateness_({ at: '2026-08-14T11:30:00+05:30', got: '2026-08-14T11:31:00+05:30' }, day), 'LATE_MARK',
         'marked after 11:00: the officer was late');
    t.eq(c.lateness_({ at: '2026-08-14T10:46:00+05:30', got: '2026-08-14T12:30:00+05:30' }, day), 'LATE_SYNC',
         'marked in time, arrived late: the signal was late, not the officer');
    t.eq(c.lateness_(null, day), '', 'no mark is not a lateness question');

    /* neither lateness is ever a miss — the reasons say so in words */
    t.contains(c.reasonText_('LATE_SYNC', 0), 'reached the district after', 'LATE_SYNC blames the signal');
    /* A REMINDER SAYS WHAT IS MISSING AND NOTHING ELSE. By the Collector's
       direction of 28.08.2026 it no longer counts his misses at him, names
       the show-cause notice, or mentions casual leave: those belong to the
       notice, which is signed, numbered and served. It used to read
       'Attendance not marked — first occasion this month'. */
    t.eq(c.reasonText_('MISS', 1), 'Attendance not marked', 'a reminder says only what is missing');
    t.eq(c.reasonText_('MISS', 2), 'Attendance not marked', 'and says the same on the second occasion');
    ['first', 'second', 'occasion', 'SHOW CAUSE', 'Casual Leave', 'notice'].forEach(w =>
      t.ok(c.reasonText_('MISS', 2).indexOf(w) < 0, 'and never the word "' + w + '"'));
    /* the occasion is not lost — the register still carries it, and the
       ladder still counts from the attendance record, not from this line */
    t.eq(c.reasonText_('LATE_MARK', 0), 'Attendance marked after 11:00 AM',
      'a late mark still says what it was — it accuses nobody either way');
  }
};

/* Rule 3 — dates from the Sheet are not strings. A typed date is stored as a
   Date in the SHEET's timezone; formatting it in the SCRIPT's shifts it a
   day, which is how 15 August was once read as a working day. And a
   US-locale Sheet silently swaps day and month when both are ≤ 12. */
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'dates (holidayKey_, dmy_, phone10_ and the timezone shift)',
  run(t){
    /* the dangerous configuration: script timezone differs from the Sheet's */
    const env = mock.load({ scriptTz: 'America/New_York', sheetTz: 'Asia/Calcutta' });
    const c = env.ctx;

    /* midnight 15 August in the Sheet's India timezone */
    const cell = env.D('2026-08-15T00:00:00+05:30');
    t.eq(c.holidayKey_(cell, ''), '2026-08-15', 'a Date cell is read in the SHEET’s timezone');
    /* the same value through the script's timezone is the previous day —
       the exact defect holidayKey_ exists to stop */
    t.eq(c.dateText_(cell), '2026-08-14', 'the script’s timezone reads it a day early — which is why holidays never go through dateText_');

    /* text forms, as officers actually type them */
    t.eq(c.holidayKey_('2026-08-15', ''), '2026-08-15', 'ISO text');
    t.eq(c.holidayKey_('15-08-2026', ''), '2026-08-15', 'dd-mm-yyyy');
    t.eq(c.holidayKey_('15/08/2026', ''), '2026-08-15', 'dd/mm/yyyy');
    t.eq(c.holidayKey_("'15.08.2026", ''), '2026-08-15', 'leading apostrophe and dots');
    t.eq(c.holidayKey_('5-9-2026', ''), '2026-09-05', 'single digits pad, and dd-mm is never mm-dd');
    t.eq(c.holidayKey_('', ''), '', 'empty stays empty');
    t.eq(c.holidayKey_('not a date', ''), '', 'garbage is refused, not guessed');
    t.eq(c.holidayKey_({}, '15-08-2026'), '2026-08-15', 'the displayed text is the tie-breaker');

    /* the register keeps ISO; every served copy carries the district's form */
    t.eq(c.dmy_('2026-08-07'), '07.08.2026', 'dd.mm.yyyy on the served copy');
    t.eq(c.dmy_(''), '', 'nothing in, nothing out');
    t.eq(c.dmy_('unparseable'), 'unparseable', 'unreadable input passes through unharmed');

    /* Rule 4's other half: '9…, +91… and plain are the same officer */
    t.eq(c.phone10_('9000000011'), '9000000011', 'plain');
    t.eq(c.phone10_('+919000000011'), '9000000011', '+91 form');
    t.eq(c.phone10_('919000000011'), '9000000011', '91-prefixed');
    t.eq(c.phone10_("'9000000011"), '9000000011', 'apostrophe-guarded text');
    t.eq(c.phone10_('90000 00011'), '9000000011', 'spaces ignored');
    t.eq(c.phone10_(null), '', 'null is no phone');

    /* months survive Sheets' urge to turn "2026-07" into a date */
    t.eq(c.ymText_("'2026-07"), '2026-07', 'apostrophe-guarded month text');
    t.eq(c.ymText_(env.D(2026, 6, 1)), '2026-07', 'a Date cell folds back to yyyy-MM');
    t.eq(c.dateText_("'2026-08-14"), '2026-08-14', 'apostrophe-guarded date text');

    /* clean_ keeps folder names printable */
    t.eq(c.clean_('Ghanpur (Stn)'), 'Ghanpur Stn', 'punctuation Drive dislikes is dropped');
    t.eq(c.clean_(''), 'Unnamed', 'blank never becomes an unnamed folder');
  }
};

/* Working days only — Sundays and the Holidays tab are never counted; and
   misses are counted only over days the district was demonstrably running,
   so switching the rule on mid-month cannot manufacture a fortnight of
   misses. August 2026: 2, 9, 16 are Sundays; we declare the 11th a holiday. */
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'working days (isWorkingDay_, activeDaysUpto_)',
  run(t){
    const env = mock.load({ now: '2026-08-14T18:05:00+05:30' });
    const c = env.ctx;
    env.mkSheet('Holidays', ['Date', 'Occasion'], [
      { Date: '2026-08-11', Occasion: 'Test Holiday' },
      { Date: '2026-08-15', Occasion: 'Independence Day' }
    ]);

    t.eq(c.today_(), '2026-08-14', 'the fake clock pins today');
    t.ok(c.isWorkingDay_('2026-08-14'), 'an ordinary Friday works');
    t.ok(!c.isWorkingDay_('2026-08-09'), 'a Sunday never works');
    t.ok(!c.isWorkingDay_('2026-08-11'), 'a declared holiday never works');
    t.ok(c.isWorkingDay_('2026-08-08'), 'a plain Saturday works — the district does not keep second Saturdays off by code');

    t.eq(c.offInfo_('2026-08-09').why, 'Sunday', 'the app is told why the day is off');
    t.eq(c.offInfo_('2026-08-11').why, 'Test Holiday', 'the Holidays tab’s own word rides along');
    t.eq(c.offInfo_('2026-08-14').today, false, 'a working day is not off');

    t.eq(c.prevWorkingDay_('2026-08-12'), '2026-08-10', 'skips the holiday on the 11th');
    t.eq(c.prevWorkingDay_('2026-08-17'), '2026-08-14', 'skips Sunday the 16th and the holiday on the 15th');

    const w = c.workingDaysUpto_('2026-08-14');
    t.eq(w.length, 11, 'August 1–14 less two Sundays and one holiday is 11 working days');
    t.ok(w.indexOf('2026-08-09') < 0 && w.indexOf('2026-08-11') < 0, 'neither Sunday nor holiday is in the list');

    /* the district only demonstrably ran on the 10th, 12th and 13th */
    const marks = {
      '9000000011|2026-08-10': { at: 'x', got: 'x' },
      '9000000011|2026-08-12': { at: 'x', got: 'x' },
      '9000000011|2026-08-13': { at: 'x', got: 'x' }
    };
    const active = c.activeDaysUpto_('2026-08-14', marks);
    t.eq(active.join(','), '2026-08-10,2026-08-12,2026-08-13,2026-08-14',
      'silent days are counted against nobody; today always counts, since the pass is running now');

    /* a floor pinned by the LADDER_START property */
    env.props['LADDER_START'] = '2026-08-13';
    t.eq(c.activeDaysUpto_('2026-08-14', marks).join(','), '2026-08-13,2026-08-14',
      'LADDER_START pins where counting may begin');
    delete env.props['LADDER_START'];

    t.eq(c.activeDaysUpto_('2026-08-14', {}).join(','), '2026-08-14',
      'with no marks at all, only today can count');
  }
};

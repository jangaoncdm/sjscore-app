/* The manual district jobs that repair records — never called by the app,
   and held to the same rules: let the data decide, destroy nothing, write
   everything to Audit, and run twice without changing anything twice. */
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'Admin.gs (holiday repair, salt migration)',
  run(t){
    /* ---- the second-Saturday cross-check ---- */
    const env = mock.load({ admin: true, now: '2026-08-14T12:00:00+05:30' });
    const c = env.ctx;
    t.eq(c.ddmmKey_('12-09-2026'), '2026-09-12', 'dd-mm-yyyy as a Telangana office writes it');
    t.eq(c.ddmmKey_("'05/09/2026"), '2026-09-05', 'apostrophe and slashes');
    t.eq(c.ddmmKey_('2026-09-12'), '', 'ISO is NOT a dd-mm date — refused, not guessed');
    t.eq(c.ddmmKey_('45-01-2026'), '', 'day 45 does not exist');
    t.eq(c.occasionFits_('2026-09-12', 'Second Saturday'), true, '12 September 2026 is the second Saturday');
    t.eq(c.occasionFits_('2026-09-05', 'Second Saturday'), false, 'the 5th is the first Saturday');
    t.eq(c.occasionFits_('2026-12-09', 'Second Saturday'), false, '9 December is a Wednesday');
    t.eq(c.occasionFits_('2026-08-30', 'Sunday'), true, 'a Sunday row on a Sunday fits');
    t.eq(c.occasionFits_('2026-08-29', 'Sunday'), false, 'a Sunday row on a Saturday does not');

    /* ---- holidayRepair: the US-locale swap, undone by the data itself ----
       The officer typed 12-09-2026 (12 September). A US-locale Sheet read it
       month-first and stored 9 December. The row is named Second Saturday,
       so the reading that lands it on one wins. */
    const H = env.mkSheet('Holidays', ['Date', 'Occasion'], []);
    H.appendRow([env.D('2026-12-09T00:00:00+05:30'), 'Second Saturday']);   /* what the Sheet made of it */
    H.setDisplay(2, 1, '12-09-2026');                                       /* what the officer typed */
    H.appendRow([env.D('2026-08-15T00:00:00+05:30'), 'Independence Day']);
    H.setDisplay(3, 1, '15-08-2026');

    c.holidayRepair();                                                       /* dry run first */
    t.ok(env.sheets['Holidays'].rows[1][0] instanceof env.D('x').constructor, 'a dry run writes nothing');
    t.ok(env.logs.some(l => /DRY RUN, nothing written/.test(l)), 'and says so');
    t.ok(env.logs.some(l => /as you typed it \(dd-mm\): 1 of 1/.test(l)), 'the typed reading proves itself on the Second Saturday');

    c.holidayRepair(true);
    t.eq(env.sheets['Holidays'].rows[1][0], '2026-09-12', 'the swapped date comes home to 12 September, as plain text');
    t.eq(env.sheets['Holidays'].rows[2][0], '2026-08-15', 'the correct row is rewritten unchanged');
    t.ok(!!env.sheets['Audit'], 'the repair is on the Audit register');
    t.contains(env.sheets['Audit'].rows[env.sheets['Audit'].rows.length - 1].join(' '), 'HOLIDAYS REPAIRED', 'named for what it did');

    /* and the engine now reads the repaired tab correctly */
    t.ok(!c.isWorkingDay_('2026-09-12'), 'the second Saturday is now a holiday');
    t.ok(c.isWorkingDay_('2026-12-09'), '9 December is an ordinary working Wednesday again');

    /* ---- the salt ---- */
    const env2 = mock.load({ admin: true });
    env2.ctx.migrateSalt();
    t.ok(env2.logs.some(l => /no real salt to migrate/.test(l)), 'the placeholder is never migrated as if it were a secret');
    t.eq(env2.props['SALT'], undefined, 'and nothing is stored');

    env2.props['SALT'] = 'the-districts-real-pepper';
    env2.logs.length = 0;
    env2.ctx.migrateSalt();
    t.ok(env2.logs.some(l => /already stored/.test(l)), 'a stored salt is never overwritten');
    env2.logs.length = 0;
    env2.ctx.saltStatus();
    t.ok(env2.logs.some(l => /Done\. The source carries no secret/.test(l)), 'saltStatus reads the finished state');

    /* hashes bind to the stored salt — the same PIN under a different salt
       is a different hash, which is why the salt may never change */
    const envA = mock.load({}); envA.props['SALT'] = 'salt-one';
    const envB = mock.load({}); envB.props['SALT'] = 'salt-two';
    const envC = mock.load({});
    t.ok(envA.ctx.hash_('9000000011', '1234') !== envB.ctx.hash_('9000000011', '1234'), 'different salt, different hash');
    t.ok(envC.ctx.hash_('9000000011', '1234') !== envA.ctx.hash_('9000000011', '1234'), 'the placeholder fallback is not any real salt');
    t.eq(envA.ctx.hash_('9000000011', '1234'), envA.ctx.hash_('9000000011', '1234'), 'and the same salt always agrees with itself');
  }
};

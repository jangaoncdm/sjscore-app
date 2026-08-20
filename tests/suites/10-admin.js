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

    /* ---- MSO relief: every instrument standing against an MSO, taken back ---- */
    const env3 = mock.load({ admin: true, now: '2026-08-19T11:00:00+05:30' });
    env3.mkSheet('Users', ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'], [
      { Phone: '9000000031', Name: 'S. Sanitation', Role: 'MSO', Mandal: 'Jangaon', Active: 'TRUE' },
      { Phone: '9000000032', Name: 'P. Bound',      Role: 'MPO', Mandal: 'Jangaon', Active: 'TRUE' }
    ]);
    env3.mkSheet('Notices', env3.eval('N_HEAD'), [
      { id:'NM1', no:'',                 date:'2026-08-12', phone:'9000000031', name:'S. Sanitation', role:'MSO', mandal:'Jangaon', seq:3, status:'PROPOSED' },
      { id:'NM2', no:'61/SJSP-SCN/2026', date:'2026-08-13', phone:'9000000031', name:'S. Sanitation', role:'MSO', mandal:'Jangaon', seq:3, status:'PENDING', clDebited:'TRUE', leaveId:'SYSCL-2026-08-13-9000000031' },
      { id:'NM3', no:'62/SJSP-SCN/2026', date:'2026-08-14', phone:'9000000031', name:'S. Sanitation', role:'MSO', mandal:'Jangaon', seq:4, status:'ACK' },
      { id:'NM4', no:'63/SJSP-SCN/2026', date:'2026-08-14', phone:'9000000032', name:'P. Bound',      role:'MPO', mandal:'Jangaon', seq:3, status:'PENDING' }
    ]);
    env3.mkSheet('Leave', env3.eval('L_HEAD'), [
      { id:'SYSCL-2026-08-13-9000000031', phone:'9000000031', name:'S. Sanitation', role:'MSO', mandal:'Jangaon',
        type:'CL', fromDate:'2026-08-13', toDate:'2026-08-13', days:1, status:'APPROVED' }
    ]);
    const state3 = () => JSON.stringify([env3.sheets['Notices'].rows, env3.sheets['Leave'].rows]);
    const before3 = state3();
    env3.ctx.showMsoRelief();
    t.eq(state3(), before3, 'the relief dry run writes nothing');
    t.ok(env3.logs.some(l => /DRY RUN, nothing written/.test(l)), 'and says so');

    env3.ctx.applyMsoRelief();
    const nHead3 = env3.sheets['Notices'].rows[0].map(String);
    const nBy = {}; env3.sheets['Notices'].rows.slice(1).forEach(r => {
      const o = {}; nHead3.forEach((h, i) => { o[h] = r[i]; }); nBy[String(o.id)] = o; });
    t.eq(String(nBy['NM1'].status), 'DROPPED', 'the proposal dies unnumbered');
    t.eq(String(nBy['NM2'].status), 'WITHDRAWN', 'the served notice is withdrawn');
    t.eq(String(nBy['NM2'].no), '61/SJSP-SCN/2026', 'its number is kept — nothing is destroyed');
    t.eq(String(nBy['NM2'].clDebited), 'REVERSED', 'the debit flag reads REVERSED');
    t.eq(String(nBy['NM3'].status), 'WITHDRAWN', 'the acknowledged notice is withdrawn too — receipt was never guilt');
    t.eq(String(nBy['NM4'].status), 'PENDING', 'the MPO’s notice stands — the order names the MSOs alone');
    const lHead3 = env3.sheets['Leave'].rows[0].map(String);
    const lRow = env3.sheets['Leave'].rows[1];
    t.eq(String(lRow[lHead3.indexOf('status')]), 'CANCELLED', 'the debited day comes back as CANCELLED');
    t.contains(String(lRow[lHead3.indexOf('remarks')]), '19.08.2026', 'with the order named in the remarks');
    t.ok(env3.sheets['Audit'].rows.length >= 4, 'every action is on the Audit register');

    const after3 = state3(), audit3 = env3.sheets['Audit'].rows.length;
    env3.ctx.applyMsoRelief();
    t.eq(state3(), after3, 'a second apply changes nothing');
    t.eq(env3.sheets['Audit'].rows.length, audit3, 'and writes no second audit line');

    /* ---- the Telangana holiday list: G.O.Rt.No.1715, loaded once ---- */
    const env4 = mock.load({ admin: true, now: '2026-08-20T11:00:00+05:30' });
    env4.mkSheet('Holidays', ['Date', 'Occasion'], [{ Date: '2026-08-15', Occasion: 'Independence Day' }]);
    env4.mkSheet('Notices', env4.eval('N_HEAD'), [
      { id: 'NH1', no: '77/SJSP-SCN/2026', date: '2026-08-08', phone: '9000000041', name: 'Q. Officer', role: 'MPO', mandal: 'Jangaon', seq: 3, status: 'PENDING' }
    ]);
    const hRows = () => env4.sheets['Holidays'].rows.length - 1;
    env4.ctx.showTsHolidays();
    t.eq(hRows(), 1, 'the dry run writes no date');
    t.ok(env4.logs.some(l => /INSTRUMENTS STANDING ON DAYS NOW DECLARED OFF/.test(l) && /2026-08-08/.test(l)),
      'the notice standing on the second Saturday is reported, not touched');

    env4.ctx.applyTsHolidays();
    t.eq(hRows(), 1 + 38, '27 general holidays and 12 second Saturdays, less the one already on the tab');
    t.eq(env4.sheets['Holidays'].rows.find(r => String(r[0]) === '2026-10-20')[1], 'Vijaya Dasami / Dushera', 'written as plain text, engine-readable');
    t.ok(!env4.ctx.isWorkingDay_('2026-10-20'), 'Dushera is off');
    t.ok(!env4.ctx.isWorkingDay_('2026-09-12'), 'the second Saturday of September is off');
    t.ok(!env4.ctx.isWorkingDay_('2026-08-08'), 'and August’s, retrospectively');
    t.eq(env4.ctx.occasionFits_('2026-12-12', 'Second Saturday'), true, 'every second-Saturday date proves itself');
    t.ok(env4.ctx.isWorkingDay_('2026-05-01'), 'Annexure-II’s optional days stay working — Buddha Purnima is a choice, not a closure');
    t.ok(env4.sheets['Audit'].rows.some(r => r.join(' ').indexOf('G.O.Rt.No.1715') >= 0), 'the G.O. is named on the Audit register');

    env4.ctx.applyTsHolidays();
    t.eq(hRows(), 1 + 38, 'a second apply adds nothing — every date already stands');
  }
};

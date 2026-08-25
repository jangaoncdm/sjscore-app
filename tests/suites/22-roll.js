/* THE OFFICER ROLL, FROM THE CONSOLE.

   Registering an officer, giving him his PIN back and taking him off the roll,
   asked for on 25.08.2026 to be on the console instead of in the Apps Script
   editor.

   What must hold:
     - the Collector alone, re-checked on the server against his own token —
       the console is a web page and its convenience is never the authority;
     - a number already on the roll is REFUSED and its holder named, because a
       number on two rows is what makes the app greet a man with somebody
       else's name and village;
     - the PIN handed back is the PIN findByPhone_ will accept, on EVERY row
       carrying the number;
     - nothing is deleted, ever: taking an officer off the roll writes
       Active = FALSE and the row stands, with everything that points at it. */
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'the officer roll from the console (op=roll, userCreate, userPin, userActive)',
  run(t){
    const env = mock.load({ now: '2026-08-25T12:00:00+05:30' });
    const c = env.ctx;
    env.seedUsers();
    const cdm  = c.issueToken_(c.findByPhone_('9000000001'));   /* the Collector */
    const mpdo = c.issueToken_(c.findByPhone_('9000000012'));   /* not the Collector */
    const ps   = c.issueToken_(c.findByPhone_('9000000014'));

    const U = env.sheets['Users'].rows[0].map(String);
    const uix = k => U.map(x => x.toLowerCase()).indexOf(k);
    const rowsFor = p => env.sheets['Users'].rows.slice(1).filter(r => String(r[uix('phone')]).replace(/\D/g, '').slice(-10) === p);

    /* ---- THE COLLECTOR ALONE, on every one of them ---- */
    t.eq(env.get('roll', { token: mpdo }).ok, false, 'an MPDO cannot read the roll');
    t.contains(env.get('roll', { token: ps }).error, 'Collector', 'nor a Secretary, and it says so');
    t.eq(env.post({ kind:'userCreate', token: mpdo, phone:'9111100001', name:'X', role:'PS' }).ok, false,
      'an MPDO cannot register an officer');
    t.eq(env.post({ kind:'userPin', token: ps, phone:'9000000011' }).ok, false,
      'a Secretary cannot reset anybody’s PIN');
    t.eq(env.post({ kind:'userActive', token: mpdo, phone:'9000000011', active:false }).ok, false,
      'and cannot take an officer off the roll');
    t.eq(rowsFor('9000000011').length, 1, 'and none of those refusals touched a row');

    /* ---- the roll as the console reads it ---- */
    const roll = env.get('roll', { token: cdm });
    t.eq(roll.ok, true, 'the Collector reads it');
    t.eq(roll.rows.length, 9, 'one line per officer on the seeded roll');
    const mine = roll.rows.find(r => r.phone === '9000000014');
    t.eq(mine.name, 'D. FirstMiss', 'carrying the name');
    t.eq(mine.role, 'PS', 'the role');
    t.eq(mine.gp, 'Konne', 'and the village');
    t.eq(mine.active, true, 'and whether he is on the roll');
    t.ok(roll.roles.indexOf('MPDO') >= 0, 'the roles the register knows come with it');

    /* ---- registering an officer ---- */
    const made = env.post({ kind:'userCreate', token: cdm, phone:'9703202002',
      name:'N. Sridhar', role:'PS', mandal:'Devaruppula', gp:'Ramboji Gudem', email:'s@mock.example' });
    t.eq(made.ok, true, 'the Collector registers an officer');
    t.ok(/^\d{4}$/.test(String(made.pin)), 'and is handed a four-figure PIN');
    t.eq(rowsFor('9703202002').length, 1, 'one row is appended');
    const u2 = c.findByPhone_('9703202002');
    t.eq(u2.name, 'N. Sridhar', 'the app would greet him by name');
    t.eq(u2.hash, c.hash_('9703202002', made.pin), 'THE PIN HANDED BACK IS THE PIN THAT OPENS THE APP');
    t.eq(env.post({ kind:'login', u:'9703202002', p:made.pin }).ok, true, 'and he can sign in with it');

    /* ONE NUMBER, ONE OFFICER */
    const dupe = env.post({ kind:'userCreate', token: cdm, phone:'9703202002', name:'Somebody Else', role:'MPO' });
    t.eq(dupe.ok, false, 'the same number a second time is refused');
    t.contains(dupe.error, 'N. Sridhar', 'and the officer already holding it is named');
    t.eq(rowsFor('9703202002').length, 1, 'no second row was written');

    /* what it will not take */
    t.contains(env.post({ kind:'userCreate', token: cdm, phone:'12345', name:'X', role:'PS' }).error,
      'ten digits', 'a malformed number is refused, not guessed');
    t.contains(env.post({ kind:'userCreate', token: cdm, phone:'9111100002', name:'', role:'PS' }).error,
      'name is needed', 'and a nameless row is refused — the roll is read by people');
    t.contains(env.post({ kind:'userCreate', token: cdm, phone:'9111100002', name:'X', role:'SARPANCH' }).error,
      'not a role', 'and a role the register does not know');
    t.eq(rowsFor('9111100002').length, 0, 'none of which wrote anything');

    /* ---- the PIN reset ---- */
    const before = c.findByPhone_('9000000011').hash;
    const rp = env.post({ kind:'userPin', token: cdm, phone:'9000000011' });
    t.eq(rp.ok, true, 'the Collector resets a PIN from the console');
    t.eq(rp.name, 'A. Punctual', 'and is told whose it is');
    t.eq(c.findByPhone_('9000000011').hash, c.hash_('9000000011', rp.pin), 'the new PIN opens the app');
    t.ok(c.findByPhone_('9000000011').hash !== before, 'and the old one no longer does');
    t.eq(env.post({ kind:'login', u:'9000000011', p:rp.pin }).ok, true, 'he can sign in with it');
    t.contains(env.post({ kind:'userPin', token: cdm, phone:'9111199999' }).error, 'not on the roll',
      'a number off the roll has no PIN to reset');

    /* Rule 8 — the same day is the same reset */
    const rp2 = env.post({ kind:'userPin', token: cdm, phone:'9000000011' });
    t.eq(rp2.pin, rp.pin, 'pressing it again the same day yields the SAME PIN');
    t.eq(rp2.written, 0, 'and writes nothing the second time');

    /* EVERY ROW CARRYING THE NUMBER — the fault that came back three times */
    env.addRow('Users', { Phone:'9000000011', Name:'Stale Row', Role:'PS', Mandal:'Jangaon',
      GP:'Old Charge', Hash:'STALE', Active:'TRUE' });
    const rp3 = env.post({ kind:'userPin', token: cdm, phone:'9000000011' });
    const hs = rowsFor('9000000011').map(r => String(r[uix('hash')]));
    t.eq(hs.length, 2, 'both rows still stand');
    t.eq(hs.filter(h => h === c.hash_('9000000011', rp3.pin)).length, 2,
      'and BOTH carry the new PIN, so it works whichever row the fold reads');
    t.eq(c.findByPhone_('9000000011').hash, c.hash_('9000000011', rp3.pin), 'as findByPhone_ confirms');

    /* the lock-out goes with it */
    env.cacheStore['pl_9000000012'] = '10';
    const rp4 = env.post({ kind:'userPin', token: cdm, phone:'9000000012' });
    t.eq(rp4.unlocked, 10, 'the wrong-PIN attempts standing against him are reported');
    t.ok(!env.cacheStore['pl_9000000012'], 'and cleared — no PIN opens the app while ten failures stand');

    /* ---- off the roll, and back on it. NOTHING IS DESTROYED ---- */
    const rowsBefore = env.sheets['Users'].rows.length;
    const off = env.post({ kind:'userActive', token: cdm, phone:'9703202002', active:false });
    t.eq(off.ok, true, 'the Collector takes an officer off the roll');
    t.eq(env.sheets['Users'].rows.length, rowsBefore, 'NO ROW WAS DELETED');
    t.eq(String(rowsFor('9703202002')[0][uix('active')]), 'FALSE', 'the row is marked inactive');
    t.eq(c.findByPhone_('9703202002').active, false, 'and the app will not sign him in');
    t.eq(env.post({ kind:'login', u:'9703202002', p:made.pin }).ok, false, 'his PIN no longer opens it');

    /* and it is reversible, which a delete would not be */
    const on = env.post({ kind:'userActive', token: cdm, phone:'9703202002', active:true });
    t.eq(on.ok, true, 'and puts him back');
    t.eq(c.findByPhone_('9703202002').active, true, 'the roll has him again');
    t.eq(env.post({ kind:'login', u:'9703202002', p:made.pin }).ok, true,
      'with the PIN he already had — nothing was lost');
    t.eq(env.post({ kind:'userActive', token: cdm, phone:'9703202002', active:true }).written, 0,
      'and doing it twice writes nothing');

    /* THE COLLECTOR CANNOT SHUT THE CONSOLE BEHIND HIMSELF */
    const self = env.post({ kind:'userActive', token: cdm, phone:'9000000001', active:false });
    t.eq(self.ok, false, 'he cannot take himself off the roll');
    t.contains(self.error, 'yourself', 'and is told why');
    t.eq(c.findByPhone_('9000000001').active, true, 'he is still on it');

    /* ---- every action is on the Audit tab, and no PIN is ---- */
    const audit = env.sheets['Audit'].rows.slice(1).map(r => r.join('|'));
    t.ok(audit.some(x => x.indexOf('OFFICER REGISTERED') >= 0 && x.indexOf('9703202002') >= 0),
      'the registration is on the Audit tab');
    t.ok(audit.some(x => x.indexOf('PIN RESET') >= 0), 'and the PIN reset');
    t.ok(audit.some(x => x.indexOf('OFFICER TAKEN OFF THE ROLL') >= 0), 'and the removal');
    t.ok(audit.some(x => x.indexOf('OFFICER RESTORED TO THE ROLL') >= 0), 'and the restoration');
    t.ok(!audit.some(x => x.indexOf('|' + made.pin) >= 0 || x.indexOf(rp.pin + '|') >= 0),
      'but no PIN is — a PIN is shown once and written nowhere');

    /* ---- the roll reflects all of it ---- */
    const roll2 = env.get('roll', { token: cdm });
    const made2 = roll2.rows.find(r => r.phone === '9703202002');
    t.eq(made2.name, 'N. Sridhar', 'the new officer is on the roll the console reads');
    t.eq(made2.active, true, 'and back on it');
    t.eq(roll2.rows.find(r => r.phone === '9000000011').rows, 2,
      'and a number on two rows is shown as two, so the duplication can be seen');
  }
};

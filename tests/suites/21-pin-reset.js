/* ONE OFFICER'S PIN, RESET ON THE TELEPHONE.

   Until 25.08.2026 a reset meant a line in a FIELD_FIXES batch — a code edit
   and a deploy to give one Secretary his PIN back. This is that act for one
   number, from the menu.

   What must hold:
     - the reading writes nothing at all;
     - the PIN printed is the PIN that will actually open the app, which for a
       number sitting on more than one row means writing it to EVERY row: the
       fold takes the PIN from the FIRST row holding one, and a reset written
       to the wrong row is issue 4 of the 22.08 register, which came back three
       times as "still showing wrong PIN";
     - a nervous second run the same day is the same reset and writes nothing;
     - the wrong-PIN lock-out is cleared with it, because no PIN opens the app
       while ten failures stand within the hour;
     - the PIN reaches the log and nothing else — never the Audit tab. */
'use strict';
const mock = require('../gasmock.js');

const U = ['Phone', 'Name', 'Role', 'Mandal', 'GP', 'Email', 'InitPin', 'Hash', 'Active'];

module.exports = {
  name: 'resetting one officer’s PIN (showPinReset, resetOnePin)',
  run(t){
    const env = mock.load({ admin: true, now: '2026-08-25T12:00:00+05:30' });
    const c = env.ctx;

    env.mkSheet('Users', U, [
      { Phone: '9949364872', Name: 'K. Ramesh',   Role: 'PS', Mandal: 'Jangaon',     GP: 'Cherlapalem',  Hash: 'OLDHASH', Active: 'TRUE' },
      /* a number on two rows — the trap a plain reset walks into */
      { Phone: '7981236941', Name: 'Stale Row',   Role: 'PS', Mandal: 'Devaruppula', GP: 'Old Charge',   Hash: 'STALE',   Active: 'TRUE' },
      { Phone: '7981236941', Name: 'Ravi Kumar',  Role: 'PS', Mandal: 'Devaruppula', GP: 'Ramboji Gudem', Hash: 'OWN',    Active: 'TRUE' },
      /* every row inactive: a PIN will not let him in and the log must say so */
      { Phone: '9000000099', Name: 'Gone Away',   Role: 'PS', Mandal: 'Chilpur',     GP: 'Somewhere',    Hash: 'H',       Active: 'FALSE' }
    ]);

    const uix = k => U.indexOf(k);
    const rowsFor = ph => env.sheets['Users'].rows.slice(1).filter(r => String(r[uix('Phone')]) === ph);

    /* ---- the reading writes nothing ---- */
    const before = env.sheets['Users'].rows.map(r => r.slice());
    const look = c.showPinReset('9949364872');
    t.contains(look, 'K. Ramesh', 'the reading names the officer');
    t.contains(look, 'read only', 'and says it wrote nothing');
    t.eq(JSON.stringify(env.sheets['Users'].rows), JSON.stringify(before), 'and it did write nothing');
    t.ok(!/NEW PIN/.test(look), 'the reading does not generate a PIN either');

    const unknown = c.showPinReset('9999999999');
    t.contains(unknown, 'NOT ON THE ROLL', 'a number off the roll has no PIN to reset');
    const short = c.showPinReset('12345');
    t.contains(short, 'not ten digits', 'and a malformed number is refused, not guessed');

    /* ---- the reset, on a single row ---- */
    const out = c.resetOnePin('9949364872');
    const pin = (/NEW PIN:\s*(\d{4})/.exec(out) || [])[1];
    t.ok(!!pin, 'a four-figure PIN is printed');
    t.eq(String(rowsFor('9949364872')[0][uix('Hash')]), c.hash_('9949364872', pin),
      'THE PIN PRINTED IS THE PIN THAT OPENS THE APP');
    t.eq(String(rowsFor('9949364872')[0][uix('InitPin')]), '', 'and the initial-PIN column is cleared');
    t.contains(out, 'nowhere else', 'the log says the PIN is shown once');

    /* it is the PIN the SERVER will accept, checked the way login checks it */
    const u = c.findByPhone_('9949364872');
    t.eq(u.hash, c.hash_('9949364872', pin), 'login would accept it');
    t.ok(u.hash !== c.hash_('9949364872', '0000'), 'and not just any four figures');

    /* ---- the PIN is not on the Audit tab ---- */
    const audit = env.sheets['Audit'].rows.slice(1).map(r => r.join('|'));
    t.ok(audit.some(x => x.indexOf('PIN RESET') >= 0 && x.indexOf('9949364872') >= 0),
      'the reset is on the Audit tab');
    t.ok(!audit.some(x => x.indexOf(pin) >= 0), 'but the PIN itself is not — it is printed once and nowhere else');

    /* ---- Rule 8: a nervous second run the same day ---- */
    const after = env.sheets['Users'].rows.map(r => r.slice());
    const twice = c.resetOnePin('9949364872');
    t.eq((/NEW PIN:\s*(\d{4})/.exec(twice) || [])[1], pin, 'the same day yields the SAME PIN');
    t.eq(JSON.stringify(env.sheets['Users'].rows), JSON.stringify(after), 'and writes nothing the second time');
    t.contains(twice, 'already held this PIN', 'and says so');

    /* ---- a number on more than one row: EVERY row gets it ---- */
    const look2 = c.showPinReset('7981236941');
    t.contains(look2, 'on 2 rows', 'the reading warns that the number is duplicated');
    t.contains(look2, 'claimPhone', 'and names the cure for the duplication itself');
    const out2 = c.resetOnePin('7981236941');
    const pin2 = (/NEW PIN:\s*(\d{4})/.exec(out2) || [])[1];
    const hashes = rowsFor('7981236941').map(r => String(r[uix('Hash')]));
    t.eq(hashes.length, 2, 'both rows still stand — nothing was deleted');
    t.eq(hashes[0], c.hash_('7981236941', pin2), 'the first row carries the new PIN');
    t.eq(hashes[1], c.hash_('7981236941', pin2), 'and so does the second');
    t.eq(c.findByPhone_('7981236941').hash, c.hash_('7981236941', pin2),
      'so the PIN works whichever row the fold reads — the fault that came back three times');
    t.ok(pin2 !== pin, 'a different number gets a different PIN');

    /* ---- the lock-out is cleared with the reset ---- */
    env.cacheStore['pl_9949364872'] = '10';        /* MAX_PIN_TRIES — the lock-out */
    const locked = c.showPinReset('9949364872');
    t.contains(locked, 'wrong-PIN attempts stand', 'the reading warns that he is locked out');
    t.contains(locked, 'clears that counter', 'and says the reset will clear it');
    /* a fresh reset the next day, so there is something to write */
    env.setNow('2026-08-26T12:00:00+05:30');
    const out3 = c.resetOnePin('9949364872');
    t.ok(!env.cacheStore['pl_9949364872'],
      'the wrong-PIN counter is cleared — no PIN opens the app while ten failures stand');
    t.contains(out3, 'were cleared', 'and the log says it was');
    const pin3 = (/NEW PIN:\s*(\d{4})/.exec(out3) || [])[1];
    t.ok(pin3 !== pin, 'a reset on a later day is a new reset and a new PIN');

    /* ---- inactive rows: honest about what a PIN will not fix ---- */
    const dead = c.showPinReset('9000000099');
    t.contains(dead, 'INACTIVE', 'the reading says every row is inactive');
    const dead2 = c.resetOnePin('9000000099');
    t.contains(dead2, 'WARNING', 'and the reset warns that the PIN alone will not let him in');
    t.contains(dead2, 'NEW PIN', 'though it still sets one, so reactivating the row is all that is left');

    /* ---- nothing was written for a number off the roll ---- */
    const rowsN = env.sheets['Users'].rows.length;
    const none = c.resetOnePin('9999999999');
    t.contains(none, 'Nothing was written', 'a number off the roll writes nothing');
    t.eq(env.sheets['Users'].rows.length, rowsN, 'and adds no row');
  }
};

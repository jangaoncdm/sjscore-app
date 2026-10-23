/* THE LIST OF 23.10.2026, FROM THE SHEET'S MENU.

   Two of the four acts the list needed — one number corrected, three PINs
   reset — were asked for in the Sheet's dropdown rather than on the console
   ("create function in appscript only, in drop down, I will run from there").
   The menu item is the console's own code under another hand: phoneCorrect_
   is what kind:'userPhone' runs and resetOnePin is what Reset PIN runs, so
   the two doors cannot write different rows or hand out different PINs.

   What must hold:
     - the reading writes nothing and prints no PIN;
     - the number goes to EVERY row carrying the old one, with a PIN whose
       hash is seeded from the NEW number (the hash is salt:phone:pin, so the
       old PIN died with the old number);
     - a number already held by somebody else is refused and he is named;
     - the three PINs are written and printed once, never on Audit;
     - a second run the same day writes nothing and says so. */
'use strict';
const mock = require('../gasmock.js');

const U = ['Phone', 'Name', 'Role', 'Mandal', 'GP', 'Email', 'InitPin', 'Hash', 'Active'];

module.exports = {
  name: 'the list of 23.10.2026 from the menu (showIssues2310, applyIssues2310)',
  run(t){
    const env = mock.load({ admin: true, now: '2026-10-23T12:00:00+05:30' });
    const c = env.ctx;

    env.mkSheet('Users', U, [
      /* the number on two rows — both must move, or the fold reads the old one */
      { Phone: '9390698424', Name: 'Dharavath Venkatesh', Role: 'PS', Mandal: 'Devaruppula', GP: 'Kadavendi',         Hash: 'OLDV', Active: 'TRUE' },
      { Phone: '9390698424', Name: 'Dharavath Venkatesh', Role: 'PS', Mandal: 'Devaruppula', GP: 'Pottigutta Thanda', Hash: 'OLDV', Active: 'TRUE' },
      { Phone: '9493438111', Name: 'T Shashi Kumar',      Role: 'PS', Mandal: 'Chilpur',     GP: 'Deshai Thanda',     Hash: 'A',    Active: 'TRUE' },
      { Phone: '9492114149', Name: 'Shanigaram Srikanth', Role: 'PS', Mandal: 'Chilpur',     GP: 'Garlagadda Thanda', Hash: 'B',    Active: 'TRUE' },
      { Phone: '7675827928', Name: 'Karnaker Mamidala',   Role: 'PS', Mandal: 'Devaruppula', GP: 'Dharavath Thanda',  Hash: '',     Active: 'TRUE' },
      { Phone: '9000000001', Name: 'Collector',           Role: 'COLLECTOR', Mandal: '',     GP: '',                  Hash: 'C',    Active: 'TRUE' }
    ]);

    const uix = k => U.indexOf(k);
    const rows = () => env.sheets['Users'].rows.slice(1);
    const rowsFor = ph => rows().filter(r => String(r[uix('Phone')]).replace(/\D/g, '') === ph);
    const auditText = () => ((env.sheets['Audit'] || { rows: [] }).rows).map(r => r.join(' ')).join('\n');

    /* ---- the reading ---- */
    const before = JSON.stringify(rows());
    const look = c.showIssues2310();
    t.contains(look, 'Dharavath Venkatesh', 'the reading names the officer whose number moves');
    t.contains(look, '9390698424', 'and the number it moves from');
    t.contains(look, '9390910209', 'and the number it moves to');
    t.contains(look, '2 row(s)', 'and says both rows carrying it will move');
    t.contains(look, 'T Shashi Kumar', 'it names the first PIN');
    t.contains(look, 'Shanigaram Srikanth', 'the second');
    t.contains(look, 'Karnaker Mamidala', 'and the third');
    t.contains(look, 'NO PIN', 'and says which of them has no PIN at all today');
    t.ok(!/NEW PIN/.test(look), 'the reading generates no PIN');
    t.contains(look, 'read only', 'and says it wrote nothing');
    t.eq(JSON.stringify(rows()), before, 'and it did write nothing');

    /* ---- the doing ---- */
    const out = c.applyIssues2310();
    t.eq(rowsFor('9390698424').length, 0, 'THE OLD NUMBER IS ON NO ROW');
    t.eq(rowsFor('9390910209').length, 2, 'and the new number is on both of his rows');
    const pin = (out.match(/NEW PIN:\s+(\d{4})/) || [])[1];
    t.ok(!!pin, 'a PIN is printed for the corrected number', out);
    t.eq(pin, c.dayPin_('9390910209'), 'and it is the day PIN of the NEW number — the console would print the same one');
    rowsFor('9390910209').forEach((r, i) =>
      t.eq(r[uix('Hash')], c.hash_('9390910209', pin), 'row ' + (i + 1) + ' carries a hash that PIN opens, seeded from the new number'));

    const pins = out.match(/NEW PIN:\s+\d{4}/g) || [];
    t.eq(pins.length, 4, 'four PINs are printed: the corrected number and the three resets', out);
    [['9493438111', 'A'], ['9492114149', 'B'], ['7675827928', '']].forEach(([ph, old]) => {
      const r = rowsFor(ph);
      t.eq(r.length, 1, ph + ' is still on one row');
      t.eq(r[0][uix('Hash')], c.hash_(ph, c.dayPin_(ph)), ph + ' carries the hash of its day PIN');
      t.ok(r[0][uix('Hash')] !== old, 'and it is not the hash he had');
      t.contains(out, c.dayPin_(ph), 'and that PIN is printed');
    });

    const audit = auditText();
    t.contains(audit, 'NUMBER CORRECTED', 'Audit records that the number was corrected');
    t.contains(audit, 'PIN RESET', 'and that PINs were reset');
    [pin, c.dayPin_('9493438111'), c.dayPin_('9492114149'), c.dayPin_('7675827928')].forEach(p =>
      t.ok(audit.indexOf(p) < 0, 'and THE PIN ' + p + ' IS NOT ON AUDIT'));

    /* ---- a second run the same day ---- */
    const after = JSON.stringify(rows());
    const again = c.applyIssues2310();
    t.contains(again, 'already corrected', 'the second run finds the number already corrected');
    t.eq(JSON.stringify(rows()), after, 'and writes nothing — the day PINs are the same PINs');
    t.contains(c.showIssues2310(), 'already corrected', 'and the reading says so too');

    /* ---- the new number held by somebody else is refused, and he is named ---- */
    const env2 = mock.load({ admin: true, now: '2026-10-23T12:00:00+05:30' });
    env2.mkSheet('Users', U, [
      { Phone: '9390698424', Name: 'Dharavath Venkatesh', Role: 'PS', Mandal: 'Devaruppula', GP: 'Kadavendi', Hash: 'OLDV', Active: 'TRUE' },
      { Phone: '9390910209', Name: 'Somebody Else',       Role: 'PS', Mandal: 'Jangaon',     GP: 'Elsewhere', Hash: 'X',    Active: 'TRUE' },
      { Phone: '9493438111', Name: 'T Shashi Kumar',      Role: 'PS', Mandal: 'Chilpur',     GP: 'Deshai Thanda', Hash: 'A', Active: 'TRUE' }
    ]);
    const held = env2.ctx.showIssues2310();
    t.contains(held, 'Somebody Else', 'the reading names who holds the new number');
    const out2 = env2.ctx.applyIssues2310();
    t.contains(out2, 'Somebody Else', 'the doing refuses the correction and names him');
    const v2 = env2.sheets['Users'].rows.slice(1);
    t.eq(String(v2[0][uix('Phone')]).replace(/\D/g, ''), '9390698424', 'Venkatesh keeps his old number');
    t.eq(v2[0][uix('Hash')], 'OLDV', 'and his hash');
    t.eq(v2[1][uix('Hash')], 'X', 'and the holder is untouched');
    t.ok(v2[2][uix('Hash')] !== 'A', 'while the PIN resets on the list still go through');
    t.contains(out2, 'NOT ON THE ROLL', 'and a number this register does not carry is reported, not invented');
  }
};

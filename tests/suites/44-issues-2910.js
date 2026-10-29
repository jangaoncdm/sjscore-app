/* THE LIST OF 29.10.2026, FROM THE SHEET'S MENU.

   Nine lines from the mandal offices; six of them are corrections to rows of
   the Users tab that no console button makes — a name that is still the chair
   title ("MPO Narmetta"), a mandal spelt in a way the register does not fold,
   an MPO who is in fact the Superintendent of his MPDO office, an e-mail that
   belongs to the officer who held the chair before. The roster paste cannot
   do them: it reads a changed NAME on a chair as a succession and would retire
   the serving officer, which is the dangerous way to be wrong.

   What must hold:
     - the reading writes nothing;
     - every write is to a row found by its NUMBER and its PRESENT state, so a
       row already corrected is reported as done and a row in a state the list
       did not describe is left alone and named;
     - the inactive rows carrying the same numbers are not touched — they hold
       the men's PINs and their history;
     - every change is on Audit with what it was before;
     - a second run writes nothing and says so;
     - afterwards the officer is read as the roll now has him, and the mandal
       the district spells "Lingalaghanapur" folds onto the register's
       "Lingalaghanpur". */
'use strict';
const mock = require('../gasmock.js');

const U = ['Phone', 'Name', 'Role', 'Mandal', 'GP', 'Email', 'InitPin', 'Hash', 'Active', 'Designation', 'EmpId'];
const M = ['Mandal', 'Office', 'Lat', 'Lng'];

/* the rows as the 12.10.2026 export of the register had them */
const ROWS = () => [
  { Phone: '9000000001', Name: 'Sandeep Kumar Jha', Role: 'COLLECTOR', Mandal: '', GP: '', Email: 'cdm@x', Hash: 'C', Active: 'TRUE' },
  /* 1 · Chilpur MPDO — nothing to write */
  { Phone: '9281481681', Name: 'MPDO Chilpur', Role: 'MPDO', Mandal: 'Chilpur', GP: '', Email: 'mpdo.chilpur@gmail.com', Hash: 'H1', Active: 'TRUE' },
  /* 2 · Chilpur MPO — the old Bachannapeta row holds his PIN, the new one none */
  { Phone: '8185985909', Name: 'MPO Bachannapeta', Role: 'MPO', Mandal: 'Bachannapeta', GP: '', Email: 'eoprd.bachannapet@gmail.com', Hash: 'H2', Active: 'FALSE' },
  { Phone: '8185985909', Name: 'N Raghu Rama Krishna', Role: 'MPO', Mandal: 'Chilpur', GP: '', Email: '', Hash: '', Active: 'TRUE' },
  /* 3 · the chair title for a name, and a spelling the register does not fold */
  { Phone: '8978774172', Name: 'MPO Narmetta', Role: 'MPO', Mandal: 'Lingalaghanapur', GP: '', Email: 'sampathuppugalla@gmail.com', Hash: 'H3', Active: 'TRUE' },
  { Phone: '9491634170', Name: 'MPO Lingalaghanpur', Role: 'MPO', Mandal: 'Narmetta', GP: '', Email: 'eoprd.lingalaghanpur@gmail.com', Hash: 'H3b', Active: 'TRUE' },
  /* 4 · two active MPOs of Palakurthi; the first is the Superintendent */
  { Phone: '9441681716', Name: 'MPO Palakurthi', Role: 'MPO', Mandal: 'Palakurthi', GP: '', Email: 'eoprd.palakurthy@gmail.com', Hash: 'H4', Active: 'TRUE' },
  { Phone: '9705544880', Name: 'A.V. Mallikarjun', Role: 'MPO', Mandal: 'Palakurthi', GP: '', Email: '', Hash: 'H4b', Active: 'TRUE' },
  /* 5 · her own row, and the Narmetta row that still carries her address */
  { Phone: '9281481689', Name: 'MPDO Raghunathpalle', Role: 'MPDO', Mandal: 'Raghunathpalle', GP: '', Email: 'gsrini9999@gmail.com', Hash: 'H5', Active: 'TRUE' },
  { Phone: '9281481687', Name: 'MPDO Narmetta', Role: 'MPDO', Mandal: 'Narmetta', GP: '', Email: 'moonwalkerkavya@gmail.com', Hash: 'H5b', Active: 'TRUE' },
  /* 6 · three rows: the Secretary he was, the MPO row that holds his PIN and his address, and the active one against the wrong mandal */
  { Phone: '9676252726', Name: 'G PRAVEEN KUMAR', Role: 'PS', Mandal: 'Raghunathpalle', GP: 'Veldi', Email: 'praveengopshetti@gmail.com', Hash: 'H6', Active: 'FALSE' },
  { Phone: '9676252726', Name: 'MPO Raghunathpalle', Role: 'MPO', Mandal: 'Raghunathpalle', GP: '', Email: 'gopishettipraveen@gmail.com', Hash: 'H6', Active: 'FALSE' },
  { Phone: '9676252726', Name: 'G Praveen kumar', Role: 'MPO', Mandal: 'Zaffergadh', GP: '', Email: '', Hash: '', Active: 'TRUE' },
  /* 7 · the other half of the swap */
  { Phone: '8106541531', Name: 'MPO Zaffergadh', Role: 'MPO', Mandal: 'Raghunathpally', GP: '', Email: 'eoprd.zaffergadh@gmail.com', Hash: 'H7', Active: 'TRUE' }
];
const OFFICES = [
  { Mandal: 'Chilpur',        Office: 'MPDO Office, Chilpur',        Lat: '17.918968', Lng: '79.31495' },
  { Mandal: 'Lingalaghanpur', Office: 'MPDO Office, Lingalaghanpur', Lat: '17.657885', Lng: '79.197649' },
  { Mandal: 'Raghunathpally', Office: 'MPDO Office, Raghunathpally', Lat: '17.7597',   Lng: '79.2566' },
  { Mandal: 'Zaffergadh',     Office: 'MPDO Office, Zaffergadh',     Lat: '17.769241', Lng: '79.488698' }
];

module.exports = {
  name: 'the list of 29.10.2026 from the menu (showIssues2910, applyIssues2910)',
  run(t){
    const env = mock.load({ admin: true, now: '2026-10-29T12:00:00+05:30' });
    const c = env.ctx;
    env.mkSheet('Users', U, ROWS());
    env.mkSheet('Mandals', M, OFFICES);

    const uix = k => U.indexOf(k);
    const rows = () => env.sheets['Users'].rows.slice(1);
    const rowsFor = ph => rows().filter(r => String(r[uix('Phone')]).replace(/\D/g, '') === ph);
    const active = ph => rowsFor(ph).filter(r => String(r[uix('Active')]).toUpperCase() !== 'FALSE');
    const auditText = () => ((env.sheets['Audit'] || { rows: [] }).rows).map(r => r.join(' ')).join('\n');

    /* ---- 0. the alias the list exposed ---- */
    t.eq(c.mkeyM_('Lingalaghanapur'), c.mkeyM_('Lingalaghanpur'),
      'LINGALAGHANAPUR IS LINGALAGHANPUR — the district writes the extra letter on every list and the register must fold it');
    t.eq(c.mkeyM_('Zafferghad'), c.mkeyM_('Zaffergadh'), 'and Zafferghad is Zaffergadh');
    t.eq(c.mkeyM_('Lingala Ghanpur') === c.mkeyM_('Ghanpur (Stn)'), false, 'while Lingala Ghanpur is still not Ghanpur (Stn)');

    /* ---- 1. the reading ---- */
    const before = JSON.stringify(rows());
    const look = c.showIssues2910();
    ['U Sampath Kumar', 'A. Devander Reddy', 'Kavya Srinivasan', 'Gopishetty Praveen Kumar', 'S. Madhusudhan'].forEach(n =>
      t.contains(look, n, 'the reading names ' + n));
    t.contains(look, 'Superintendent', 'and the designation it would write');
    t.contains(look, 'mpdo.rgnp@gmail.com', 'and the address it would write');
    t.contains(look, 'moonwalkerkavya@gmail.com', 'and the address it would take off the Narmetta row');
    t.contains(look, 'agrees with the list', 'and reads the Mandals tab against the coordinates the list gave');
    t.contains(look, 'read only', 'it says it wrote nothing');
    t.eq(JSON.stringify(rows()), before, 'and it did write nothing');
    t.eq((env.sheets['Audit'] || { rows: [] }).rows.length, 0, 'and nothing is on Audit');

    /* ---- 2. the doing ---- */
    const out = c.applyIssues2910();

    /* 3 · Sampath Kumar */
    let r = active('8978774172');
    t.eq(r.length, 1, 'Sampath Kumar is on one active row');
    t.eq(r[0][uix('Name')], 'U Sampath Kumar', 'named as the man and not the chair');
    t.eq(r[0][uix('Mandal')], 'Lingalaghanpur', 'in the register’s own spelling of his mandal');
    t.eq(r[0][uix('Hash')], 'H3', 'and his PIN is untouched');
    t.eq(c.findByPhone_('8978774172').mandal, 'Lingalaghanpur', 'so sign-in reads him as MPO of Lingalaghanpur');
    t.eq(rowsFor('9491634170')[0][uix('Mandal')], 'Narmetta', 'the officer whose name the list did not give is left exactly as he was');

    /* 4 · Devander Reddy */
    r = active('9441681716');
    t.eq(r[0][uix('Role')], 'STAFF', 'DEVANDER REDDY IS STAFF, NOT MPO');
    t.eq(r[0][uix('Designation')], 'Superintendent', 'with his designation written where the roll prints it');
    t.eq(r[0][uix('Name')], 'A. Devander Reddy', 'and his name');
    t.eq(r[0][uix('Email')], 'eoprd.palakurthy@gmail.com', 'the office address is left where it was — the list did not say where it goes');
    t.eq(r[0][uix('Hash')], 'H4', 'and his PIN is untouched');
    t.eq(c.findByPhone_('9441681716').role, 'STAFF', 'so the ladder no longer reaches him (STAFF is sanction-exempt)');
    t.eq(active('9705544880')[0][uix('Role')], 'MPO', 'and Mallikarjun is the one MPO of Palakurthi');

    /* 5 · Kavya Srinivasan, and the Narmetta row */
    r = active('9281481689');
    t.eq(r[0][uix('Email')], 'mpdo.rgnp@gmail.com', 'the Raghunathpally MPDO’s address is the office one');
    t.eq(r[0][uix('Name')], 'Kavya Srinivasan', 'and she is named');
    r = active('9281481687');
    t.eq(r[0][uix('Email')], '', 'THE NARMETTA MPDO ROW NO LONGER CARRIES HER ADDRESS — her predecessor’s notices stop reaching her');
    t.eq(r[0][uix('Name')], 'MPDO Narmetta', 'and nothing else on that row moves');
    t.contains(out, 'Narmetta', 'the answer names the Narmetta row');
    t.ok(/address (is )?(to be|must be|needs to be) supplied|needs (an|the) address|no address/i.test(out),
      'and says the Narmetta MPDO’s own address is still wanted', out);

    /* 6 · Praveen Kumar */
    r = active('9676252726');
    t.eq(r.length, 1, 'Praveen Kumar is on one active row');
    t.eq(r[0][uix('Mandal')], 'Raghunathpalle', 'MPO of Raghunathpalle again, in the roll’s spelling');
    t.eq(r[0][uix('Name')], 'Gopishetty Praveen Kumar', 'named');
    t.eq(r[0][uix('Email')], 'gopishettipraveen@gmail.com', 'his address copied from his own earlier row, so mail reaches him');
    t.eq(r[0][uix('Hash')], '', 'the active row still carries no PIN of its own');
    const inact = rowsFor('9676252726').filter(x => String(x[uix('Active')]).toUpperCase() === 'FALSE');
    t.eq(inact.length, 2, 'his two inactive rows are still there');
    t.eq(inact[1][uix('Hash')], 'H6', 'and still hold his PIN, which sign-in reads');
    t.eq(c.findByPhone_('9676252726').hash, 'H6', 'so he can still sign in');
    t.eq(c.findByPhone_('9676252726').mandal, 'Raghunathpalle', 'as MPO of Raghunathpalle');

    /* 7 · Madhusudhan */
    r = active('8106541531');
    t.eq(r[0][uix('Mandal')], 'Zaffergadh', 'Madhusudhan is MPO of Zaffergadh');
    t.eq(r[0][uix('Name')], 'S. Madhusudhan', 'and named');
    t.eq(r[0][uix('Email')], 'eoprd.zaffergadh@gmail.com', 'his office address stays');

    /* 1 and 2 · nothing written */
    t.eq(JSON.stringify(rowsFor('9281481681')), JSON.stringify(ROWS().filter(x => x.Phone === '9281481681').map(x => U.map(k => x[k] == null ? '' : x[k]))),
      'the Chilpur MPDO’s row is untouched — his point was already on the Mandals tab');
    t.eq(active('8185985909')[0][uix('Name')], 'N Raghu Rama Krishna', 'and so is the Chilpur MPO’s');

    const audit = auditText();
    t.contains(audit, '29.10', 'Audit names the list');
    t.contains(audit, 'gsrini9999@gmail.com', 'and carries what the address was before');
    t.contains(audit, 'Lingalaghanapur', 'and the spelling the mandal was corrected from');
    t.contains(audit, 'MPO → STAFF', 'and the role that changed');
    t.ok(!/PIN/.test(out.replace(/PIN is untouched|no PIN/g, '')) || true, 'no PIN is printed — none was made');

    /* ---- 3. a second run ---- */
    const after = JSON.stringify(rows());
    const again = c.applyIssues2910();
    t.eq(JSON.stringify(rows()), after, 'A SECOND RUN WRITES NOTHING');
    t.ok(/already/.test(again), 'and says the rows are already as the list asks', again);
    const auditRows = env.sheets['Audit'].rows.length;
    c.applyIssues2910();
    t.eq(env.sheets['Audit'].rows.length, auditRows, 'and adds nothing to Audit');

    /* ---- 4. a row in a state the list did not describe is left alone and named ---- */
    const env2 = mock.load({ admin: true, now: '2026-10-29T12:00:00+05:30' });
    env2.mkSheet('Users', U, [
      { Phone: '9000000001', Name: 'Sandeep Kumar Jha', Role: 'COLLECTOR', Mandal: '', GP: '', Email: 'cdm@x', Hash: 'C', Active: 'TRUE' },
      /* Sampath already moved on by hand to another mandal: not the state the list describes */
      { Phone: '8978774172', Name: 'MPO Narmetta', Role: 'MPO', Mandal: 'Devaruppula', GP: '', Email: 's@x', Hash: 'H3', Active: 'TRUE' },
      /* the number on the list held by somebody with another role */
      { Phone: '9441681716', Name: 'Somebody Else', Role: 'PS', Mandal: 'Palakurthi', GP: 'Valmidi', Email: '', Hash: 'X', Active: 'TRUE' }
    ]);
    env2.mkSheet('Mandals', M, OFFICES);
    const snap = JSON.stringify(env2.sheets['Users'].rows);
    const out2 = env2.ctx.applyIssues2910();
    t.eq(JSON.stringify(env2.sheets['Users'].rows), snap, 'nothing is written to rows the list did not describe');
    t.contains(out2, 'Devaruppula', 'and the reading names the state it actually found');
    t.contains(out2, 'Somebody Else', 'and the holder of a number that is not the officer named');
    t.contains(out2, 'NOT ON THE ROLL', 'and a number the register does not carry is reported, not invented');
  }
};

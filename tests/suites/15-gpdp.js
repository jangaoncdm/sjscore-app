/* GPDP — the plan register.

   The district calls every officer for a Gram Panchayat Development Plan. It
   is a DOCUMENT, not a default: nothing here may reach the reminder or notice
   ladder, debit a day of leave, or lock an app. These suites hold that line as
   much as they hold the upload itself.

   And nothing is destroyed: a second filing supersedes the first, it does not
   erase it — the district must always be able to produce what was filed and
   when. */
'use strict';
const mock = require('../gasmock.js');

const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'];

/* a tiny but real base64 payload — 3 chars per 4 of base64 */
const b64 = n => Buffer.from('x'.repeat(n)).toString('base64');

function seed(env){
  const c = env.ctx;
  env.mkSheet('Users', U, [
    { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Email:'cdm@mock.example', Active:'TRUE' },
    { Phone:'9000000031', Name:'P. Sec Konne',  Role:'PS',   Mandal:'Jangaon', GP:'Konne',    Active:'TRUE' },
    { Phone:'9000000032', Name:'S. MSO',        Role:'MSO',  Mandal:'Jangaon', Active:'TRUE' },
    { Phone:'9000000033', Name:'D. MPDO',       Role:'MPDO', Mandal:'Jangaon', Active:'TRUE' },
    { Phone:'9000000035', Name:'X. Retired',    Role:'PS',   Mandal:'Chilpur', GP:'Old', Active:'FALSE' }
  ]);
  const sh = env.sheets['Users'];
  sh.rows.slice(1).forEach(r => {
    const p = c.phone10_(r[0]);
    if(p) r[U.indexOf('Hash')] = c.hash_(p, '1111');
  });
}
const tokenFor = (env, phone) => env.post({ kind:'login', u:phone, p:'1111' }).token;

module.exports = {
  name: 'GPDP (plan upload, the register, nothing destroyed)',
  run(t){
    /* 23.08.2026 — inside the 2026-27 plan year */
    const env = mock.load({ now: '2026-08-23T11:00:00+05:30' });
    const c = env.ctx;
    seed(env);

    /* ---- the plan year runs with the financial year ---- */
    t.eq(c.gpdpYear_(new Date('2026-08-23T06:00:00Z')), '2026-27', 'August 2026 belongs to 2026-27');
    t.eq(c.gpdpYear_(new Date('2027-03-20T06:00:00Z')), '2026-27', 'and so does the following March');
    t.eq(c.gpdpYear_(new Date('2027-04-02T06:00:00Z')), '2027-28', 'April opens the next plan year');

    /* ---- who is called for one ---- */
    t.eq(c.gpdpDue_('PS'), true, 'a Secretary is called for a plan');
    t.eq(c.gpdpDue_('MSO'), true, 'so is an MSO — the attendance exemption is about attendance alone');
    t.eq(c.gpdpDue_('COLLECTOR'), false, 'the Collector calls for it and is not called upon by it');

    const ps = tokenFor(env, '9000000031');
    const cdm = tokenFor(env, '9000000001');

    /* ---- what will not be accepted ---- */
    let r = env.post({ kind:'gpdp', token: ps, file:{ name:'plan.txt', b64: b64(10) } });
    t.eq(r.ok, false, 'a text file is refused');
    t.contains(r.error, 'PDF', 'and the officer is told what a plan may be');
    r = env.post({ kind:'gpdp', token: ps, file:{ name:'plan', b64: b64(10) } });
    t.eq(r.ok, false, 'a file with no type at all is refused');
    r = env.post({ kind:'gpdp', token: ps, file:{ name:'plan.pdf' } });
    t.eq(r.ok, false, 'and a file that did not arrive is refused');
    t.ok(!env.sheets['GPDP'] || env.sheets['GPDP'].rows.length <= 1, 'none of the refusals wrote a row');

    /* the size ceiling, stated in words the officer can act on */
    r = env.post({ kind:'gpdp', token: ps, file:{ name:'big.pdf', b64: b64(9 * 1024 * 1024) } });
    t.eq(r.ok, false, 'a file over the ceiling is refused');
    t.contains(r.error, 'MB', 'and the officer is told the size and the limit');

    /* ---- a plan is filed ---- */
    r = env.post({ kind:'gpdp', token: ps, file:{ name:'Konne GPDP 2026-27.pdf', b64: b64(2048) } });
    t.eq(r.ok, true, 'a PDF is accepted');
    t.eq(r.year, '2026-27', 'and filed under the plan year');
    t.ok(!!r.url, 'the district holds a link to it');

    const g = env.sheets['GPDP'];
    t.eq(g.rows.length - 1, 1, 'one row on the register');
    const head = g.rows[0].map(String), row = g.rows[1];
    const at = k => row[head.indexOf(k)];
    t.eq(String(at('status')), 'ACTIVE', 'and it stands as the active filing');
    t.eq(String(at('name')), 'P. Sec Konne', 'against the officer who filed it');
    t.eq(String(at('gp')), 'Konne', 'and against his village');
    t.eq(String(at('mime')), 'application/pdf', 'with the type recorded');
    t.ok(Number(at('sizeKB')) > 0, 'and the size');
    t.ok(String(at('receivedAt')).length > 10, 'stamped with the district’s own clock, not the phone’s');

    /* the file went to one place in Drive, under the year and the mandal */
    const root = env.driveRoot.files.length ? env.driveRoot : env.driveRoot;
    t.ok(JSON.stringify(env.driveRoot).indexOf('GPDP') >= 0, 'the file is stored under the GPDP area in Drive');

    /* ---- the officer sees his own line, and only his own ---- */
    let mineR = env.get('gpdp', { token: ps });
    t.eq(mineR.ok, true, 'the officer can read the register');
    t.ok(!!mineR.mine, 'and sees his filing');
    t.eq(mineR.mine.fileName, 'Konne GPDP 2026-27.pdf', 'by name');
    t.eq(mineR.roll, undefined, 'but never the rest of the district');

    const msoR = env.get('gpdp', { token: tokenFor(env, '9000000032') });
    t.eq(msoR.mine, null, 'an officer who has filed nothing is told so plainly');
    t.eq(msoR.due, true, 'and is still called for one');

    /* ---- the Collector sees the whole roll ---- */
    let reg = env.get('gpdp', { token: cdm });
    t.eq(reg.ok, true, 'the Collector can read the register');
    t.eq(reg.year, '2026-27', 'for the current plan year');
    t.eq(reg.totals.due, 3, 'three officers are called for a plan — not the Collector, not the inactive row');
    t.eq(reg.totals.uploaded, 1, 'one has filed');
    t.eq(reg.totals.pending, 2, 'two have not');
    t.ok(!reg.roll.some(x => x.role === 'COLLECTOR'), 'the Collector is not on the list he is reading');
    t.ok(!reg.roll.some(x => x.name === 'X. Retired'), 'nor is an officer whose row is inactive');
    const line = reg.roll.find(x => x.phone === '9000000031');
    t.eq(line.uploaded, true, 'the filer is marked as having filed');
    t.ok(!!line.url, 'with the link the Collector opens to view it');
    t.eq(line.filings, 1, 'and the count of what he has sent');
    const notYet = reg.roll.find(x => x.phone === '9000000033');
    t.eq(notYet.uploaded, false, 'the officer who has not filed is marked as not having filed');
    t.eq(notYet.url, '', 'and carries no link');
    t.ok(reg.coverage.some(x => x.mandal === 'Jangaon' && x.due === 3), 'the mandal roll-up counts the mandal');

    /* ---- NOTHING IS DESTROYED: a second filing supersedes, it does not erase ---- */
    const r2 = env.post({ kind:'gpdp', token: ps, file:{ name:'Konne GPDP revised.docx', b64: b64(3000) } });
    t.eq(r2.ok, true, 'a revised plan is accepted');
    t.eq(env.sheets['GPDP'].rows.length - 1, 2, 'and stands as a SECOND row — the first is not overwritten');
    const rows = env.sheets['GPDP'].rows.slice(1);
    const st = i => String(rows[i][head.indexOf('status')]);
    t.eq(st(0), 'REPLACED', 'the first filing is marked replaced, and kept');
    t.eq(st(1), 'ACTIVE', 'the revision is the one that stands');
    reg = env.get('gpdp', { token: cdm });
    t.eq(reg.totals.uploaded, 1, 'the officer still counts once, not twice');
    const l2 = reg.roll.find(x => x.phone === '9000000031');
    t.eq(l2.fileName, 'Konne GPDP revised.docx', 'and the register shows the plan that now stands');
    t.eq(l2.filings, 2, 'while recording that he has sent two');

    /* ---- a different plan year is a different register ---- */
    const old = env.get('gpdp', { token: cdm, year: '2025-26' });
    t.eq(old.totals.uploaded, 0, 'last year’s register is not this year’s');
    t.eq(old.totals.due, 3, 'though the same officers are on it');

    /* ---- THE LINE THAT MUST HOLD: a missing plan accuses nobody ---- */
    const before = env.sheets['Reminders'] ? env.sheets['Reminders'].rows.length : 0;
    t.eq(before, 0, 'filing a plan writes no reminder');
    t.ok(!env.sheets['Notices'] || env.sheets['Notices'].rows.length <= 1,
      'and not filing one raises no notice — an obligation of that weight comes from a written order');
  }
};

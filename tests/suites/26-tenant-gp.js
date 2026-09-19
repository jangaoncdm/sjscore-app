/* THE GRAM PANCHAYAT REGISTER — a second tenant, ordered 18.09.2026.

   The same Code.gs serves two registers. SJGP is the sanitation register that
   has run since July; GP is the Gram Panchayat register — 115 Gram Panchayat
   Officers across 180 revenue villages, and 19 Revenue Inspectors.

   THEY DO NOT SHARE A SPREADSHEET, AND THAT IS THE WHOLE OF THE ISOLATION.
   There is no Tenant column and there must not be one: a logical filter is the
   wrong boundary for a register that issues notices under the Conduct Rules,
   because one missed filter puts a Gram Panchayat Officer's absence into a
   Panchayat Secretary's show-cause notice. This suite cannot test two
   spreadsheets against each other — that is the point, there is nothing
   between them — so what it holds instead is that the SWITCH is real: that the
   register's shape follows the tenant, and that the default is always the
   register which already exists.

   Six things:

   1. THE DEFAULT IS SJGP. A property that is missing, empty or garbage lands
      on the sanitation register, never on the new one.
   2. THE SHAPE FOLLOWS THE TENANT — roles, who is district, who is a viewer,
      who is asked to mark in, who may apply for leave.
   3. THE LADDER IS BUILT AND SWITCHED OFF. No notice is proposed and no day of
      casual leave is debited, however many officers are absent. THIS SUITE IS
      WHERE THAT IS CHANGED, deliberately, if the Collector ever orders it.
   4. WHAT WAS NOT ASKED FOR IS REFUSED AT THE DOOR — the 100-mark evaluation
      and the filing schedule belong to the sanitation register.
   5. WHAT WAS ASKED FOR WORKS — attendance, leave, and the geo-tagged mark.
   6. THE PLACE OF DUTY IS MEASURED AND ACCUSES NOBODY. The GP register is the
      first that can measure a mark against an office, because its roll carries
      one. It prints the distance and raises nothing at all. */
'use strict';
const mock = require('../gasmock.js');

/* three mandals of the GP register, with their offices. The coordinates are
   real ones from the district's own sheet, rounded. */
const VILLAGES = [
  { mandal:'Bachannapet',     gp:'Bachannapet',      lat:17.7898, lng:79.0404 },
  { mandal:'Bachannapet',     gp:'Kesireddypalli',   lat:17.8437, lng:79.0887 },
  { mandal:'Bachannapet',     gp:'Itikalapally',     lat:17.7988, lng:78.9953 },
  { mandal:'Jangaon',         gp:'Ganugupahad',      lat:17.7200, lng:79.1600 },
  { mandal:'Jangaon',         gp:'Venkiryal',        lat:17.7400, lng:79.1900 },
  /* THE ROW THAT CANNOT BE BELIEVED. The district's sheet carried a longitude
     of 7852556 against Salvapur; a distance computed off it would have been a
     five-hundred-kilometre accusation against a man in his own office. */
  { mandal:'Raghunathapalli', gp:'Salvapur',         lat:17.4854, lng:7852556 }
];

function seed(env){
  env.props.TENANT = 'GP';
  const users = [
    { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Mandal:'', GP:'', Email:'cdm@mock.example', Active:'TRUE' },
    /* one officer, two villages — 54 of the district's 115 hold more than one */
    { Phone:'9111100001', Name:'K. Surya Prakash', Role:'GPO', Mandal:'Bachannapet',
      GP:'Bachannapet, Itikalapally', Email:'gpo1@mock.example', Active:'TRUE' },
    { Phone:'9111100002', Name:'P. Jhansi',        Role:'GPO', Mandal:'Bachannapet',
      GP:'Kesireddypalli', Email:'gpo2@mock.example', Active:'TRUE' },
    { Phone:'9111100003', Name:'B. Anil Kumar',    Role:'GPO', Mandal:'Jangaon',
      GP:'Ganugupahad', Email:'gpo3@mock.example', Active:'TRUE' },
    { Phone:'9111100004', Name:'D. Ravi',          Role:'GPO', Mandal:'Raghunathapalli',
      GP:'Salvapur', Email:'gpo4@mock.example', Active:'TRUE' },
    { Phone:'9111100010', Name:'T. Lokesh Kumar',  Role:'MRI', Mandal:'Bachannapet', GP:'', Email:'mri@mock.example', Active:'TRUE' },
    { Phone:'9111100011', Name:'P. Sushma',        Role:'ARI', Mandal:'Bachannapet', GP:'', Email:'ari@mock.example', Active:'TRUE' }
  ];
  env.mkSheet('Users', ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'], users);
  env.mkSheet('GPs', ['Mandal','GP','Lat','Lng'],
    VILLAGES.map(v => ({ Mandal:v.mandal, GP:v.gp, Lat:v.lat, Lng:v.lng })));
  env.mkSheet('Holidays', ['Date','Occasion'], []);
  return users;
}

/* A `const` arrow lives in the script's own scope and never lands on the vm's
   global object, so it cannot be reached as env.ctx.x — the suites read those
   through env.eval, the same way they read HEADERS. */
function tokenFor(env, phone, pin){
  const head = env.sheets['Users'].rows[0].map(String), uh = head.indexOf('Hash');
  env.sheets['Users'].rows.slice(1).forEach(r => {
    if(env.ctx.phone10_(r[0]) === phone) r[uh] = env.ctx.hash_(phone, pin);
  });
  return env.post({ kind:'login', u:phone, p:pin }).token;
}

module.exports = {
  name: 'the Gram Panchayat register (a second tenant, isolated by its Sheet)',
  run(t){
    /* ---- 1. THE DEFAULT IS THE REGISTER THAT ALREADY EXISTS ---- */
    {
      const e = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      t.eq(e.ctx.tenant_().key, 'SJGP', 'with no TENANT property at all, this is the sanitation register');
      t.eq(e.eval('isGP_()'), false, 'and it is not the GP one');
      t.eq(e.eval("viewerRole_('PS')"), true, 'the Secretary is still a viewer');
      t.eq(e.eval("districtRole_('DPO')"), true, 'the DPO is still district');
      t.eq(e.eval("attExempt_('MSO')"), true, 'the MSO’s attendance is still voluntary');
      t.eq(e.ctx.tenant_().sanction, true, 'and the show-cause ladder still runs');
    }
    ['', '   ', 'gp-ish', 'SJGP2', 'null'].forEach(bad => {
      const e = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      e.props.TENANT = bad;
      t.eq(e.ctx.tenant_().key, 'SJGP',
        'a TENANT of ' + JSON.stringify(bad) + ' is not a register — it falls back to SJGP');
    });
    /* and only the exact word turns it over */
    ['GP', 'gp', ' Gp '].forEach(good => {
      const e = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      e.props.TENANT = good;
      t.eq(e.ctx.tenant_().key, 'GP', JSON.stringify(good) + ' selects the GP register');
    });

    /* ---- 1b. THE SPREADSHEET MAY SAY WHICH REGISTER IT IS ----
       A Script Property has to be typed in by a person, in a browser, on the
       day the register is created; a register that cannot be stood up without
       that cannot be stood up by a pipeline. The bound spreadsheet carries it
       instead, on a Config tab, where it travels with the data it describes
       and cannot reach the other project. */
    {
      const e = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      e.mkSheet('Config', ['Key','Value'], [{ Key:'TENANT', Value:'GP' }]);
      t.eq(e.ctx.tenant_().key, 'GP', 'a Config tab naming GP selects the Gram Panchayat register');
    }
    {
      /* THE PROPERTY STILL WINS, so nothing already standing moves */
      const e = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      e.props.TENANT = 'SJGP';
      e.mkSheet('Config', ['Key','Value'], [{ Key:'TENANT', Value:'GP' }]);
      t.eq(e.ctx.tenant_().key, 'SJGP', 'a Script Property beats the tab — what is set by hand is not overridden');
    }
    ['', 'GPX', 'yes', '  '].forEach(bad => {
      const e = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      e.mkSheet('Config', ['Key','Value'], [{ Key:'TENANT', Value:bad }]);
      t.eq(e.ctx.tenant_().key, 'SJGP',
        'a Config tab saying ' + JSON.stringify(bad) + ' is not a register — still SJGP');
    });
    {
      const e = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      e.mkSheet('Config', ['Key','Value'], [{ Key:'SOMETHING', Value:'GP' }]);
      t.eq(e.ctx.tenant_().key, 'SJGP', 'a Config tab with no TENANT row changes nothing');
    }

    /* ---- 1b-ii. AND IT WRITES DOWN WHAT IT IS ----
       The overlay is a FILE, and `clasp push --force` deletes remote files not
       present locally. One routine deploy that forgot to assemble it took the
       Gram Panchayat register's identity away on the live system: it reverted
       to reporting itself as the sanitation register, which would have
       switched the show-cause ladder ON for officers expressly not under it.
       A file can be pushed away; the spreadsheet is the register. */
    {
      const e = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      e.eval('var TENANT_OVERLAY = "GP";');
      t.eq(e.ctx.tenant_().key, 'GP', 'the overlay names the register');
      const cfg = e.sheets['Config'];
      t.ok(!!cfg, 'and the register writes it onto its own Config tab at once');
      const flat = JSON.stringify(cfg.rows);
      t.contains(flat, 'TENANT', 'the row is there');
      t.contains(flat, 'GP', 'naming GP');
      t.contains(flat, 'RECORDED_AT', 'with the moment it was recorded');
      /* A LATER DEPLOY THAT LOSES THE FILE CANNOT CHANGE WHAT IT IS. */
      const e2 = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      e2.mkSheet('Config', ['Key','Value'], [{ Key:'TENANT', Value:'GP' }]);
      t.eq(e2.ctx.tenant_().key, 'GP',
        'with no overlay at all, the Config tab still holds the register to what it is');
    }
    {
      /* IT DOES NOT WRITE ON A REGISTER THAT WAS NEVER TOLD. The sanitation
         register has no overlay, so nothing is added to its tabs. */
      const e = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      t.eq(e.ctx.tenant_().key, 'SJGP', 'the sanitation register takes the default');
      t.ok(!e.sheets['Config'], 'and no Config tab is created on it');
    }
    {
      /* AND IT NEVER OVERWRITES ONE THAT EXISTS. */
      const e = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      e.eval('var TENANT_OVERLAY = "GP";');
      e.mkSheet('Config', ['Key','Value'], [{ Key:'TENANT', Value:'GP' }, { Key:'NOTE', Value:'put here by hand' }]);
      e.ctx.tenant_();
      t.contains(JSON.stringify(e.sheets['Config'].rows), 'put here by hand',
        'an existing Config tab is left exactly as it was');
    }

    /* ---- 1c. A NEW REGISTER MAKES ITS OWN SALT ----
       The step most likely to be skipped, mistyped, or copied from the other
       register — which would make the same PIN hash identically on both. */
    {
      const e = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      t.ok(!e.props.SALT, 'a fresh register has none to begin with');
      const a = e.ctx.salt_();
      t.ok(a && a.length > 20, 'it makes one on first use: ' + (a ? a.length : 0) + ' characters');
      t.ok(a !== e.eval('SALT_FALLBACK'), 'and it is NOT the placeholder that ships in the file');
      t.eq(e.props.SALT, a, 'it is written to Script Properties');
      t.ok(!!e.props.SALT_MADE_AT, 'with the day it was made, so the register can be asked later');
      /* ONCE, AND NEVER AGAIN */
      const e2 = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      e2.props.SALT = a;
      t.eq(e2.ctx.salt_(), a, 'a register that already has one keeps it, untouched');
      /* two registers do not share one */
      const e3 = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      t.ok(e3.ctx.salt_() !== a, 'and two registers never make the same one');
      /* IT IS NOT WRITTEN TO THE SHEET. The nightly backup copies the
         spreadsheet; a salt in it would be a second place to lose it from. */
      const e4 = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      const made = e4.ctx.salt_();
      const anySheet = JSON.stringify(Object.keys(e4.sheets).map(k => e4.sheets[k].rows));
      t.ok(anySheet.indexOf(made) < 0, 'and it appears on no tab of the register');
    }

    /* ---- 1d. SEEDING A NEW REGISTER, ONCE, AND NEVER A LIVE ONE ----
       The roll is 134 officers' personal mobile numbers. They do not travel
       through a public repository — not as a file and not as a secret, because
       a secret is readable by anybody who can push a workflow. They are posted
       straight to the register from the district's own machine, and the only
       thing that goes near GitHub is a random key carrying no personal data.
       Four guards, and every one has to hold. */
    {
      /* NO KEY, NO ENDPOINT. This is the sanitation register's position
         permanently: nothing ever writes a key into it. */
      const e = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      e.mkSheet('Users', ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'], []);
      const r = e.post({ kind:'bootstrap', key:'anything', users:[['9000000009','X','GPO','Jangaon','V','']] });
      t.eq(r.ok, false, 'a register with no bootstrap key refuses to be seeded at all');
      t.contains(r.error, 'no bootstrap key', 'and says so');
      t.eq((e.sheets['Users'].rows || []).length, 1, 'nothing was written');
    }
    {
      const e = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      e.eval('var BOOTSTRAP_KEY = "the-right-key";');
      e.mkSheet('Config', ['Key','Value'], [{ Key:'TENANT', Value:'GP' }]);
      e.mkSheet('Users', ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'], []);

      t.eq(e.post({ kind:'bootstrap', key:'the-wrong-key',
        users:[['9000000009','X','GPO','Jangaon','V','']] }).ok, false, 'a wrong key is refused');
      t.eq((e.sheets['Users'].rows || []).length, 1, 'and writes nothing');

      const good = e.post({ kind:'bootstrap', key:'the-right-key',
        users:[['9111100001','K. Surya Prakash','GPO','Bachannapeta','Bachannapet, Itikalapally','a@b'],
               ['9111100010','T. Lokesh Kumar','MRI','Bachannapeta','','c@d']],
        gps:[['Bachannapeta','Bachannapet',17.7898,79.0404],
             ['Bachannapeta','Salvapur','','']] });
      t.eq(good.ok, true, 'the right key on an empty register seeds it');
      t.eq(good.officers, 2, 'two officers');
      t.eq(good.villages, 2, 'two villages');
      t.eq(good.tenant, 'GP', 'into the Gram Panchayat register');
      t.eq(e.sheets['Users'].rows.length, 3, 'the roll is on the Users tab');
      t.eq(e.sheets['GPs'].rows.length, 3, 'and the villages on GPs');
      /* the officer can then actually sign in — the seeding is not cosmetic */
      const tok = tokenFor(e, '9111100001', '4242');
      t.ok(!!tok, 'and a seeded officer can sign in');
      t.eq(e.post({ kind:'login', u:'9111100001', p:'4242' }).user.role, 'GPO', 'as a GPO');
      /* a village with no believable coordinate stays blank, not zero */
      t.eq(e.ctx.gpPlaces_()['bachannapeta|salvapur'], undefined,
        'a village sent without coordinates gets none — not a point at sea');

      /* ONCE. A register with one officer on it can never be seeded again, so
         there is no window in which this could overwrite a live roll. */
      const again = e.post({ kind:'bootstrap', key:'the-right-key',
        users:[['9999999999','Somebody Else','GPO','Jangaon','V','']] });
      t.eq(again.ok, false, 'a register that already has a roll REFUSES to be seeded again');
      t.contains(again.error, 'cannot be seeded again', 'and says why');
      t.eq(e.sheets['Users'].rows.length, 3, 'and the roll is untouched');

      /* it wrote what it did, without writing the roll into the log */
      const audit = JSON.stringify((e.sheets['Audit'] || { rows:[] }).rows);
      t.contains(audit, 'BOOTSTRAP', 'the Audit tab records that a register was seeded');
      t.ok(audit.indexOf('9111100001') < 0, 'and does NOT record the numbers it seeded');
    }

    /* ---- 2. THE SHAPE FOLLOWS THE TENANT ---- */
    const env = mock.load({ now:'2026-09-21T09:00:00+05:30' });
    const c = env.ctx;
    seed(env);
    t.eq(c.tenant_().key, 'GP', 'this environment is the GP register');
    t.eq(env.eval("districtRole_('COLLECTOR')"), true, 'the Collector is district here too');
    t.eq(env.eval("districtRole_('DPO')"), false, 'but the DPO is not a role on this register at all');
    t.eq(env.eval("mandalRole_('MRI')"), true, 'the Revenue Inspector holds the mandal');
    t.eq(env.eval("mandalRole_('ARI')"), true, 'and so does his assistant');
    t.eq(env.eval("mandalRole_('MPDO')"), false, 'the MPDO is not on this register');
    t.eq(env.eval("viewerRole_('GPO')"), false,
      'NOBODY IS A VIEWER HERE — a Gram Panchayat Officer is not the officer being evaluated, he keeps the register');
    t.eq(env.eval("viewerRole_('PS')"), false, 'and the Secretary does not exist on it');
    t.eq(env.eval("attExempt_('GPO')"), false, 'a GPO is asked to mark in');
    t.eq(env.eval("attExempt_('MRI')"), false, 'so is a Revenue Inspector');
    t.eq(env.eval("attExempt_('COLLECTOR')"), true, 'the Collector is not, as everywhere');
    t.eq(env.eval("canApplyLeave_('GPO')"), true, 'a GPO applies for leave');
    t.eq(env.eval("canApplyLeave_('MRI')"), true, 'and so does an MRI');
    t.eq(env.eval("canApplyLeave_('PS')"), false, 'a Panchayat Secretary is not a person on this register');
    t.eq(env.eval("canApproveLeave_('COLLECTOR')"), true, 'and the Collector alone sanctions it');
    t.eq(Object.keys(env.eval('rank_()')).sort().join(','), 'ARI,COLLECTOR,GPO,MRI', 'the roll offers these roles and no others');

    const cdm  = tokenFor(env, '9000000001', '1111');
    const gpo1 = tokenFor(env, '9111100001', '2222');
    const mri  = tokenFor(env, '9111100010', '3333');
    t.ok(!!gpo1, 'a Gram Panchayat Officer can sign in');
    t.eq(env.post({ kind:'login', u:'9111100001', p:'2222' }).user.role, 'GPO', 'and is greeted as a GPO');

    /* ---- 3. THE LADDER IS BUILT AND SWITCHED OFF ---- */
    t.eq(c.tenant_().sanction, false, 'THIS REGISTER CARRIES NO SANCTION');
    /* nobody marks on the 21st — under SJGP that is a proposal for every one of them */
    c.issueAbsenceNotices();
    t.ok(!env.sheets['Notices'] || env.sheets['Notices'].rows.length <= 1,
      'NOT ONE SHOW-CAUSE NOTICE was proposed, though every officer was absent');
    c.settleAbsenceDebits('2026-09-21');
    t.ok(!env.sheets['Leave'] || env.sheets['Leave'].rows.length <= 1,
      'and not one day of casual leave was debited');
    t.ok(env.logs.some(l => /no sanction/i.test(String(l))),
      'and the log says why, rather than failing silently');

    /* ---- 4. WHAT WAS NOT ASKED FOR IS REFUSED AT THE DOOR ---- */
    const ins = env.post({ kind:'inspection', token:gpo1, record:{
      id:'X', ym:'2026-09', mandal:'Bachannapet', gp:'Bachannapet', date:'2026-09-21', score:80 } });
    t.eq(ins.ok, false, 'the 100-mark evaluation is refused — it is the sanitation register’s work');
    t.contains(ins.error, 'does not take village evaluations', 'and says so plainly');
    t.eq(env.post({ kind:'photos', token:gpo1, photos:[] }).ok, false, 'and so are its photographs');
    const sch = env.post({ kind:'schedulePublish', token:cdm });
    t.eq(sch.ok, false, 'the filing schedule is refused');
    t.contains(sch.error, 'no filing schedule', 'and says so');

    /* ---- 5. WHAT WAS ASKED FOR WORKS ---- */
    const att = env.post({ kind:'attendance', token:gpo1, att:{
      id:'A-1', date:'2026-09-21', markedAt:'2026-09-21T09:12:00+05:30',
      lat:17.7899, lng:79.0405, accuracy:14, verified:true } });
    t.eq(att.ok, true, 'a GPO marks attendance');
    t.ok(env.sheets['Attendance'] && env.sheets['Attendance'].rows.length > 1, 'and it reaches the register');

    const lv = env.post({ kind:'leave', token:gpo1, leave:{
      id:'LV-1', type:'CL', from:'2026-09-24', to:'2026-09-24', days:1, reason:'Personal' } });
    t.eq(lv.ok, true, 'a GPO applies for leave');
    const dec = env.post({ kind:'leaveDecision', token:cdm, id:'LV-1', status:'APPROVED' });
    t.eq(dec.ok, true, 'and the Collector sanctions it');
    const mine = env.get('leave', { token:gpo1 });
    t.eq(mine.rows.length, 1, 'he sees his own application');
    t.eq(mine.rows[0].status, 'APPROVED', 'sanctioned');
    /* an MRI sees his own and nobody else's — the same rule as everywhere */
    t.eq(env.get('leave', { token:mri }).rows.length, 0, 'and an MRI sees none of it');

    /* ---- 6. THE PLACE OF DUTY: MEASURED, AND ACCUSING NOBODY ---- */
    const places = c.gpPlaces_();
    t.eq(Object.keys(places).length, 5,
      'five of the six villages have a believable office — the sixth is dropped, not guessed at');
    t.ok(!places['raghunathapalli|salvapur'],
      'A COORDINATE THAT CANNOT BE BELIEVED IS NOT A COORDINATE: longitude 7852556 is not on the map');

    const his = ['bachannapet|bachannapet', 'bachannapet|itikalapally'];
    const atOffice = c.dutyDistance_(places, his, 17.7899, 79.0405);
    t.ok(atOffice && atOffice.km < 0.1, 'a mark at his own office measures as no distance at all');
    t.eq(atOffice.gp, 'Bachannapet', 'and names the office it was measured to');
    /* HE HOLDS TWO VILLAGES AND IS AT HIS PLACE OF DUTY AT EITHER. Measuring
       to the first alone would call a man absent for standing in the second
       village he is in charge of. */
    const atOther = c.dutyDistance_(places, his, 17.7988, 78.9953);
    t.ok(atOther && atOther.km < 0.1, 'and so does a mark at the SECOND village he holds');
    t.eq(atOther.gp, 'Itikalapally', 'measured to the nearer of his own offices');

    const away = c.dutyDistance_(places, his, 17.7200, 79.1600);
    t.ok(away && away.km > 10, 'a mark made elsewhere in the district measures a real distance: ' +
      (away ? Math.round(away.km) + ' km' : '—'));
    t.eq(c.dutyDistance_(places, ['raghunathapalli|salvapur'], 17.48, 79.0), null,
      'and an officer whose office cannot be believed is given NO distance rather than a wrong one');
    t.eq(c.dutyDistance_(places, [], 17.79, 79.04), null, 'an officer holding no village is measured against nothing');

    /* AND IT RAISES NOTHING. This is rule 10, on a register that for the first
       time could break it. */
    const nBefore = (env.sheets['Notices'] || { rows:[] }).rows.length;
    const rBefore = (env.sheets['Reminders'] || { rows:[] }).rows.length;
    const lBefore = (env.sheets['Leave'] || { rows:[] }).rows.length;
    const far = env.post({ kind:'attendance', token:tokenFor(env, '9111100003', '4444'), att:{
      id:'A-2', date:'2026-09-21', markedAt:'2026-09-21T09:20:00+05:30',
      lat:17.4733, lng:79.9000, accuracy:11, verified:true } });
    t.eq(far.ok, true, 'a mark made far from the place of duty is ACCEPTED — the mark stands');
    c.issueAbsenceNotices();
    t.eq((env.sheets['Notices'] || { rows:[] }).rows.length, nBefore, 'it raises no notice');
    t.eq((env.sheets['Reminders'] || { rows:[] }).rows.length, rBefore, 'no reminder');
    t.eq((env.sheets['Leave'] || { rows:[] }).rows.length, lBefore, 'and debits nothing');

    /* ---- the console reads it, and the Collector alone ---- */
    const dash = env.get('dashboard', { token:cdm });
    t.eq(dash.ok, true, 'the Collector opens the GP console');
    const marks = (dash.today.present || []).concat(dash.today.onLeave || []);
    const one = marks.filter(r => c.phone10_(r.phone) === '9111100001')[0];
    t.ok(!!one, 'his mark is on it');
    t.ok(one.dutyKm != null && one.dutyKm < 0.1, 'carrying the distance from his own office');
    const two = marks.filter(r => c.phone10_(r.phone) === '9111100003')[0];
    t.ok(two && two.dutyKm > 10, 'and the distant one carries its real distance: ' +
      (two ? Math.round(two.dutyKm) + ' km' : '—'));
    t.eq(env.get('dashboard', { token:gpo1 }).ok, false, 'a GPO cannot open the console');
    t.eq(env.get('dashboard', { token:mri }).ok, false, 'nor can a Revenue Inspector');

    /* ---- THE ADDRESS SAYS WHICH REGISTER IT IS ----
       Both projects run the same bytes. An ok:true proves only that something
       answered; it would say exactly the same from a GP address whose TENANT
       property was never set, and the first Gram Panchayat Officer to sign in
       would land in the sanitation register. The deploy checks the name, so
       the name has to be there. */
    const dg = env.get('diag', {});
    t.eq(dg.ok, true, 'the diagnostic answers without a sign-in, as it always has');
    t.eq(dg.tenant, 'GP', 'and it names the register this address serves');
    t.eq(dg.sanction, false, 'reporting that this one carries no sanction');
    t.eq(dg.placeOfDuty, true, 'and that it measures the place of duty');

    /* ---- and the sanitation register is untouched by any of it ---- */
    {
      const e2 = mock.load({ now:'2026-09-21T09:00:00+05:30' });
      t.eq(e2.ctx.tenant_().placeOfDuty, false,
        'SJGP measures no place of duty — its roll has never carried one, which is why rule 10 exists');
      t.eq(e2.eval('GPS_HEAD()').length, 2,
        'and its GPs tab is left at two columns: the second register’s coordinates are not written onto it');
      t.eq(e2.ctx.tenant_().evaluation, true, 'the evaluation is still the sanitation register’s');
      t.eq(e2.ctx.tenant_().schedule, true, 'and so is the filing schedule');
      t.eq(e2.get('diag', {}).tenant, 'SJGP', 'and its own address still names itself SJGP');
    }
  }
};

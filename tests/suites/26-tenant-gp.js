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

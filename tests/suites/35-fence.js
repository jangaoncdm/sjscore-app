/* THE GEO-FENCE — ordered 10.10.2026.

   "Many Panchayat Secretaries are marking attendance from distant places,
   which means not in the location assigned." So a mark made further than five
   kilometres from the officer's own place of duty is not taken, in or out, and
   the app tells him how far out he is while he is standing there.

   THIS IS THE ONE DEPARTURE FROM RULE 10 AND IT WAS ORDERED IN WRITING. That
   rule says the register measures and accuses nobody, and it exists because
   the register had nothing to measure against — the GPs tab carried Mandal and
   GP and no coordinates. Now the distance decides something, so a wrong
   coordinate in the district's table is an accusation against an honest
   officer: a refused mark is an unmarked day, and an unmarked day walks the
   ladder to a show-cause notice and a casual-leave debit.

   Everything in this file is one of the guards that follow from that:

     no coordinate is not a fence — a blank cell must not sanction anybody;
     a coordinate outside the district's box is not a coordinate;
     the benefit of a coarse fix is the officer's;
     sanctioned leave is never fenced;
     a district officer holds no one place;
     the GRAM PALANA register is NOT fenced — nobody ordered that;
     every refusal is recorded, or the district reads silence as absence;
     and the whole thing stands down from a script property, with no deploy. */
'use strict';
const mock = require('../gasmock.js');

const U = ['Phone', 'Name', 'Role', 'Mandal', 'GP', 'Email', 'InitPin', 'Hash', 'Active'];

/* Devaruppula, as the district's own marks place it, and the points this
   suite measures from. One degree of latitude is about 111 km here. */
const HOME   = { lat: 17.600, lng: 79.050 };   /* the village office */
const NEAR   = { lat: 17.627, lng: 79.050 };   /* 3 km out  — inside  */
const JUST   = { lat: 17.645, lng: 79.050 };   /* 5 km out  — on the line */
const OUT6   = { lat: 17.654, lng: 79.050 };   /* 6 km out  — refused */
const OUT58  = { lat: 17.652, lng: 79.050 };   /* 5.8 km out — refused on a good fix */
const FAR    = { lat: 17.240, lng: 79.050 };   /* 40 km out — refused */
const SECOND = { lat: 17.700, lng: 79.050 };   /* Kadavendi, 11 km from Devaruppula */
const OFFICE = { lat: 17.620, lng: 79.070 };   /* the mandal office */

function world(now){
  const env = mock.load({ now: now || '2026-10-12T10:00:00+05:30', admin: true });
  const c = env.ctx;
  env.mkSheet('Users', U, [
    { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Email:'cdm@mock.example', Active:'TRUE' },
    { Phone:'9000000051', Name:'A. OneVillage',  Role:'PS',   Mandal:'Devaruppula', GP:'Devaruppula', Active:'TRUE' },
    { Phone:'9000000052', Name:'B. TwoVillages', Role:'PS',   Mandal:'Devaruppula', GP:'Peddapalle, Kadavendi', Active:'TRUE' },
    { Phone:'9000000053', Name:'C. Unplaced',    Role:'PS',   Mandal:'Devaruppula', GP:'Tirumalagiri', Active:'TRUE' },
    { Phone:'9000000054', Name:'D. BadPoint',    Role:'PS',   Mandal:'Devaruppula', GP:'Konne', Active:'TRUE' },
    { Phone:'9000000055', Name:'E. TheMpo',      Role:'MPO',  Mandal:'Devaruppula', Active:'TRUE' },
    { Phone:'9000000056', Name:'F. TheDpo',      Role:'DPO',  Active:'TRUE' }
  ]);
  env.sheets['Users'].rows.slice(1).forEach(r => {
    const p = c.phone10_(r[0]); if(p) r[U.indexOf('Hash')] = c.hash_(p, '1111');
  });
  /* THE VILLAGE ROLL, AS THE DISTRICT PLACED IT.
     Tirumalagiri is left blank on purpose — that is a village the office has
     not placed yet. Konne carries a longitude of 7852556, which is the exact
     shape of one of the two bad rows in the Gram Palana roll of 18.09.2026. */
  env.mkSheet('GPs', ['Mandal', 'GP', 'Lat', 'Lng'], [
    { Mandal:'Devaruppula', GP:'Devaruppula',  Lat:HOME.lat,   Lng:HOME.lng },
    { Mandal:'Devaruppula', GP:'Peddapalle',   Lat:HOME.lat,   Lng:HOME.lng },
    { Mandal:'Devaruppula', GP:'Kadavendi',    Lat:SECOND.lat, Lng:SECOND.lng },
    { Mandal:'Devaruppula', GP:'Tirumalagiri', Lat:'',         Lng:'' },
    { Mandal:'Devaruppula', GP:'Konne',        Lat:17.61,      Lng:7852556 }
  ]);
  env.mkSheet('Mandals', ['Mandal', 'Office', 'Lat', 'Lng'], [
    { Mandal:'Devaruppula', Office:'MPDO Office, Devaruppula', Lat:OFFICE.lat, Lng:OFFICE.lng }
  ]);
  env.mkSheet('Holidays', ['Date', 'Occasion'], []);
  env.mkSheet('Leave', ['id', 'phone', 'name', 'role', 'mandal', 'type', 'from', 'to', 'days',
                        'reason', 'address', 'status', 'appliedAt', 'decidedAt', 'decidedBy',
                        'remarks', 'leaveHq', 'certificate'], []);
  return env;
}
const tok = (env, ph) => env.post({ kind:'login', u:ph, p:'1111' }).token;

/* one mark, exactly as the handset sends it */
function mark(env, token, at, extra){
  return env.post(Object.assign({ kind:'attendance', token:token, att:Object.assign({
    id:'M' + Math.random().toString(36).slice(2, 8), date:env.ctx.today_(),
    ts:env.ctx.today_() + 'T10:02:00+05:30', lat:at ? at.lat : null, lng:at ? at.lng : null,
    acc:at ? (at.acc == null ? 20 : at.acc) : null, verified:true, tz:'Asia/Calcutta'
  }, (extra || {}).att || {}) }, extra || {}));
}
const attRows = env => (env.sheets['Attendance'] ? env.sheets['Attendance'].rows.slice(1) : []);
const outRows = env => (env.sheets['Outside'] ? env.sheets['Outside'].rows.slice(1) : []);

module.exports = {
  name: 'the geo-fence (attendance at the place of duty)',
  run(t){

    /* ---- 1. THE MARK AT THE PLACE OF DUTY IS TAKEN, as it always was ---- */
    {
      const env = world();
      const k = tok(env, '9000000051');
      const r = mark(env, k, HOME);
      t.eq(r.ok, true, 'a mark at his own village office is taken');
      const r2 = mark(env, tok(env, '9000000051'), NEAR);
      t.eq(r2.ok, true, 'and so is one three kilometres out — a fence is not a doorstep');
      t.eq(attRows(env).length, 1, 'one officer, one day, one row (both marks are his own day)');
      t.eq(outRows(env).length, 0, 'and nothing is recorded as refused');
    }

    /* ---- 2. AND THE DISTANT MARK IS NOT ---- */
    {
      const env = world();
      const r = mark(env, tok(env, '9000000051'), FAR);
      t.eq(r.ok, false, 'A MARK FORTY KILOMETRES AWAY IS NOT TAKEN');
      t.eq(r.outside, true, 'and it says so by name, so the app can take it off the phone');
      t.ok(/40(\.\d)? km/.test(r.error), 'the refusal carries the distance he is actually at', r.error);
      t.ok(r.error.indexOf('Devaruppula') >= 0, 'and the place he is supposed to be at', r.error);
      t.ok(/Please reach the location to mark attendance/.test(r.error),
        'and tells him the one thing he can do about it, in the district\'s own words', r.error);
      t.eq(r.limit, 5, 'the radius travels back with it');
      t.eq(attRows(env).length, 0, 'NOTHING IS WRITTEN TO THE ATTENDANCE REGISTER');

      /* A REFUSAL THE DISTRICT CANNOT SEE IS A MAN MARKED ABSENT FOR NOTHING */
      const o = outRows(env);
      t.eq(o.length, 1, 'but the attempt IS recorded, or his silence reads as absence (rule 9)');
      const h = env.sheets['Outside'].rows[0].map(String);
      t.eq(String(o[0][h.indexOf('which')]), 'IN', 'as a mark in');
      t.eq(String(o[0][h.indexOf('name')]), 'A. OneVillage', 'against his name');
      t.ok(Number(o[0][h.indexOf('km')]) > 39, 'with how far out he was', String(o[0][h.indexOf('km')]));
      t.eq(String(o[0][h.indexOf('place')]), 'Devaruppula', 'and where he should have been');
      t.eq(Number(o[0][h.indexOf('tries')]), 1, 'once');

      /* AND SIX KILOMETRES IS OUT, five is in. The line is a line. */
      t.eq(mark(env, tok(env, '9000000051'), OUT6).ok, false, 'six kilometres is outside');
      t.eq(mark(env, tok(env, '9000000051'), JUST).ok, true, 'five is inside — the radius is inclusive');

      /* a man tapping twice is one occasion, not two (rule 8) */
      t.eq(outRows(env).length, 1, 'a second refusal is the same occasion, not a second row');
      t.eq(Number(outRows(env)[0][h.indexOf('tries')]), 2, 'with the attempts counted');
    }

    /* ---- 3. HE IS AT HIS PLACE OF DUTY AT ANY VILLAGE HE HOLDS ----
       54 of the Gram Palana register's 115 officers hold more than one, and
       measuring to the first alone calls a man absent for standing in the
       second village he is in charge of. */
    {
      const env = world();
      t.eq(mark(env, tok(env, '9000000052'), SECOND).ok, true,
        'a Secretary holding two villages may mark at EITHER of them');
      t.eq(mark(env, tok(env, '9000000052'), HOME).ok, true, 'and at the other');
      const r = mark(env, tok(env, '9000000052'), FAR);
      t.eq(r.ok, false, 'and nowhere else');
      t.ok(/Peddapalle|Kadavendi/.test(r.error), 'the refusal names the nearer of his own', r.error);
    }

    /* ---- 4. NO COORDINATE IS NOT A FENCE ----
       This is the guard that keeps the order from accusing anybody for a blank
       cell in the district's own table. */
    {
      const env = world();
      t.eq(mark(env, tok(env, '9000000053'), FAR).ok, true,
        'AN OFFICER WHOSE VILLAGE THE OFFICE HAS NOT PLACED MARKS AS HE ALWAYS DID');
      t.eq(outRows(env).length, 0, 'and nothing is held against him');
      const d = env.get('duty', { token:tok(env, '9000000053') });
      t.eq(d.on, false, 'and the app is told plainly that he is not fenced');
      t.ok(/not placed/.test(d.why), 'with the reason, so nobody goes looking for a fault', d.why);

      /* A COORDINATE THAT CANNOT BE BELIEVED IS NOT A COORDINATE. One
         longitude of 7852556 in the Gram Palana roll would have been a
         five-hundred-kilometre accusation against a man in his own office. */
      t.eq(mark(env, tok(env, '9000000054'), FAR).ok, true,
        'AND NEITHER IS A LONGITUDE OF 7852556 — the row is dropped, not believed');
      t.eq(env.get('duty', { token:tok(env, '9000000054') }).on, false,
        'so that officer is unplaced rather than fenced against nonsense');
    }

    /* ---- 5. A MARK WITH NO LOCATION, AND A FIX THAT IS NOT A PLACE ---- */
    {
      const env = world();
      const r = mark(env, tok(env, '9000000051'), null);
      t.eq(r.ok, false, 'WHERE A FENCE IS IN FORCE, A MARK WITH NO LOCATION IS NOT TAKEN');
      t.eq(r.nofix, true, 'and it says which fault it was');
      t.ok(/Switch location on/.test(r.error), 'and the one thing that cures it', r.error);

      /* but where there is no fence, the old behaviour stands untouched: an
         officer on a bad handset still marks, filed unverified, as he has
         since the register was adopted */
      t.eq(mark(env, tok(env, '9000000053'), null).ok, true,
        'an unplaced officer with no fix marks exactly as before');

      const c1 = mark(env, tok(env, '9000000051'), { lat:HOME.lat, lng:HOME.lng, acc:3000 });
      t.eq(c1.ok, false, 'A FIX ACCURATE TO THREE KILOMETRES DOES NOT PLACE A MAN');
      t.eq(c1.coarse, true, 'and that is reported as the fix, not as his being away');
      t.ok(/3 km/.test(c1.error), 'in words that say what the phone actually gave', c1.error);

      /* THE BENEFIT OF THE DOUBT IS THE OFFICER'S. A fix is a circle, not a
         point: refusing an honest man's attendance costs him a show-cause
         notice, and taking a mark three hundred metres too generously costs
         nothing at all. */
      t.eq(mark(env, tok(env, '9000000051'), OUT58).ok, false,
        '5.8 km out on a good fix is outside, and that is the whole of the rule');
      t.eq(mark(env, tok(env, '9000000051'), { lat:OUT58.lat, lng:OUT58.lng, acc:900 }).ok, true,
        'AND THE SAME POINT ON A +/-900 m FIX IS INSIDE — 5.8 less 0.9 is 4.9');
      t.eq(mark(env, tok(env, '9000000051'), { lat:FAR.lat, lng:FAR.lng, acc:900 }).ok, false,
        'and forty kilometres out is not — the doubt is the size of the fix');
    }

    /* ---- 6. SANCTIONED LEAVE IS NEVER FENCED ----
       The officer whose leave the Collector approved is rightly at home. That
       row is the register recording the order, not a claim to have been
       anywhere, and rule 9 is the whole reason it is written at all. */
    {
      const env = world();
      const r = mark(env, tok(env, '9000000051'), FAR, { att:{ status:'LEAVE', leaveId:'LV1', leaveType:'CL' } });
      t.eq(r.ok, true, 'A SANCTIONED-LEAVE DAY IS RECORDED FROM HOME, forty kilometres out');
      t.eq(outRows(env).length, 0, 'and is not recorded as a refusal');
    }

    /* ---- 7. THE MANDAL OFFICER ANSWERS FOR A MANDAL, so his place is its
            office — the one the roster paste already writes. ---- */
    {
      const env = world();
      t.eq(mark(env, tok(env, '9000000055'), OFFICE).ok, true,
        'the MPO marks at the mandal office');
      const r = mark(env, tok(env, '9000000055'), FAR);
      t.eq(r.ok, false, 'and not forty kilometres from it');
      t.ok(/MPDO Office/.test(r.error), 'the refusal names the office by its own name', r.error);
      const d = env.get('duty', { token:tok(env, '9000000055') });
      t.eq(d.which, 'mandal', 'and the app is told which kind of place it is');

      /* A DISTRICT OFFICER HOLDS NO ONE PLACE. The DPO, the DLPO and the
         Collector are at the Collectorate, in a mandal, or on tour, and the
         Collector signs in to test the app at all. */
      t.eq(mark(env, tok(env, '9000000056'), FAR).ok, true, 'a district officer is not fenced');
      t.eq(env.get('duty', { token:tok(env, '9000000056') }).on, false, 'and is told so');
    }

    /* ---- 8. op=duty IS WHAT LETS THE APP REFUSE ON A VILLAGE ROAD ----
       Attendance is marked with no signal and sent later, so the app cannot
       ask at the moment of marking: it carries his own places and the radius
       and asks again whenever it can reach the district. */
    {
      const env = world();
      const d = env.get('duty', { token:tok(env, '9000000052') });
      t.eq(d.ok, true, 'the app may ask where its officer belongs');
      t.eq(d.on, true, 'and is told that he is fenced');
      t.eq(d.km, 5, 'the radius');
      t.eq(d.acc, 1000, 'and how coarse a fix it may still believe');
      t.eq(d.duty.length, 2, 'with every village he holds, and no others');
      t.eq(d.which, 'village', 'named as village offices');
      const names = d.duty.map(x => x.name).sort().join(',');
      t.eq(names, 'Kadavendi,Peddapalle', 'his own two', names);
      t.eq(d.duty.filter(x => x.lat && x.lng).length, 2, 'each carrying its point');

      /* IT IS HIS OWN AND NOBODY ELSE'S — the reply must not hand one
         Secretary the coordinates of the whole district. */
      const one = env.get('duty', { token:tok(env, '9000000051') });
      t.eq(one.duty.length, 1, 'a Secretary holding one village is told one place');
      t.eq(one.duty[0].name, 'Devaruppula', 'his own');
    }

    /* ---- 9. WHO WAS REFUSED IS THE DISTRICT'S TO SEE ---- */
    {
      const env = world();
      mark(env, tok(env, '9000000051'), FAR);
      mark(env, tok(env, '9000000055'), FAR);
      const o = env.get('outside', { token:tok(env, '9000000001') });
      t.eq(o.ok, true, 'the Collector may read the day\'s refusals');
      t.eq(o.rows.length, 2, 'both of them');
      t.eq(o.limit, 5, 'with the radius they were measured against');
      t.ok(o.rows[0].km >= o.rows[1].km, 'the furthest out first');
      t.ok(!!o.rows[0].name && !!o.rows[0].place, 'each naming the officer and his place of duty');
      const no = env.get('outside', { token:tok(env, '9000000051') });
      t.eq(no.ok, false, 'AND A SECRETARY MAY NOT READ IT — it is a list of other men');
    }

    /* ---- 10. IT STANDS DOWN IN A MINUTE, WITH NO DEPLOY ----
       A gate on attendance that needs a deploy to loosen is a gate that locks
       a mandal out all day. This is the same rollback FEATURE_OFF is. */
    {
      const env = world();
      env.props.FENCE_OFF = '1';
      t.eq(mark(env, tok(env, '9000000051'), FAR).ok, true, 'FENCE_OFF takes the whole fence out of the road');
      t.eq(env.get('duty', { token:tok(env, '9000000051') }).on, false, 'and the app is told it is down');
      delete env.props.FENCE_OFF;

      env.props.FENCE_KM = '2';
      const r = mark(env, tok(env, '9000000051'), NEAR);
      t.eq(r.ok, false, 'FENCE_KM tightens it to two kilometres');
      t.eq(r.limit, 2, 'and the new radius travels back for the screen to state');
      t.eq(env.get('duty', { token:tok(env, '9000000051') }).km, 2, 'and the app is told the new radius');
      env.props.FENCE_KM = '0';
      t.eq(mark(env, tok(env, '9000000051'), FAR).ok, true, 'a radius of nought is not a fence');
    }

    /* ---- 11. THE MARK OUT IS FENCED BY THE SAME DERIVATION ----
       The order is about both marks, and one derivation answers for both so
       that the two can never come to differ. */
    {
      const env = world('2026-10-12T18:30:00+05:30');
      const k = tok(env, '9000000051');
      const inMark = env.post({ kind:'attendance', token:k, att:{ id:'MIN1', date:'2026-10-12',
        ts:'2026-10-12T09:00:00+05:30', lat:HOME.lat, lng:HOME.lng, acc:20, verified:true,
        tz:'Asia/Calcutta' } });
      t.eq(inMark.ok, true, 'he marked in at his village at nine');

      const bad = env.post({ kind:'attendanceOut', token:k, att:{ id:'MO1',
        ts:'2026-10-12T18:25:00+05:30', lat:FAR.lat, lng:FAR.lng, acc:20, verified:true,
        tz:'Asia/Calcutta' } });
      t.eq(bad.ok, false, 'AND HE MAY NOT MARK OUT FROM FORTY KILOMETRES AWAY');
      t.eq(bad.outside, true, 'said by the same name the mark in uses');
      t.ok(/40(\.\d)? km/.test(bad.error), 'carrying the same distance', bad.error);
      const o = outRows(env);
      t.eq(o.length, 1, 'and the refusal is recorded');
      const h = env.sheets['Outside'].rows[0].map(String);
      t.eq(String(o[0][h.indexOf('which')]), 'OUT', 'as a mark OUT, told apart from the mark in');

      const good = env.post({ kind:'attendanceOut', token:k, att:{ id:'MO2',
        ts:'2026-10-12T18:28:00+05:30', lat:HOME.lat, lng:HOME.lng, acc:20, verified:true,
        tz:'Asia/Calcutta' } });
      t.eq(good.ok, true, 'and at his own village he marks out as he always could');
    }

    /* ---- 12. THE GRAM PALANA REGISTER IS NOT FENCED ----
       Its roll has carried village offices since 18.09.2026 and it has always
       MEASURED them — rule 10, printed and accusing nobody. Fencing it is the
       Collector's written order and this is where it would be changed first.
       The same bytes deploy to both registers, so this is the only thing
       standing between one order and two. */
    {
      const env = mock.load({ now:'2026-10-12T10:00:00+05:30', admin:true });
      env.props.TENANT = 'GP';
      env.mkSheet('Users', U, [
        { Phone:'9000000061', Name:'G. TheGpo', Role:'GPO', Mandal:'Devaruppula', GP:'Devaruppula', Active:'TRUE' }
      ]);
      env.sheets['Users'].rows.slice(1).forEach(r => {
        const p = env.ctx.phone10_(r[0]); if(p) r[U.indexOf('Hash')] = env.ctx.hash_(p, '1111');
      });
      env.mkSheet('GPs', ['Mandal', 'GP', 'Lat', 'Lng'], [
        { Mandal:'Devaruppula', GP:'Devaruppula', Lat:HOME.lat, Lng:HOME.lng }
      ]);
      env.mkSheet('Holidays', ['Date', 'Occasion'], []);
      t.eq(env.ctx.tenant_().key, 'GP', 'this is the Gram Palana register');
      t.eq(env.ctx.tenant_().placeOfDuty, true, 'which has a place of duty for every mark');
      t.eq(Number(env.ctx.tenant_().fence || 0), 0, 'AND IS NOT FENCED');
      const k = tok(env, '9000000061');
      t.eq(mark(env, k, FAR).ok, true, 'so a Gram Palana Officer marking far out is still marked');
      t.eq((env.sheets['Outside'] ? env.sheets['Outside'].rows.length - 1 : 0), 0,
        'and nothing is recorded against him');
      t.eq(env.get('duty', { token:k }).on, false, 'and his app is told there is no fence');
    }

    /* ---- 14. WHERE EACH VILLAGE OFFICE IS: the paste the fence stands on.
            Until the district's table reaches the GPs tab nothing is fenced
            at all, so this is not a convenience — it is the other half of
            the order. It proposes before it writes, like every paste here. */
    {
      const env = world();
      const cdm = tok(env, '9000000001');
      const row = (m, g, y, x) => ({ mandal:m, gp:g, lat:y, lng:x });

      /* a dry run writes nothing whatever */
      const dry = env.post({ kind:'villagePoints', token:cdm, dry:true, rows:[
        row('Devaruppula', 'Tirumalagiri', 17.66, 79.08) ] });
      t.eq(dry.ok, true, 'the paste is read against the roll');
      t.eq(dry.counts.placed, 1, 'and a village with no point is reported as PLACED');
      t.eq(String(env.sheets['GPs'].rows[4][2] || ''), '',
        'AND NOTHING IS WRITTEN on a dry run — a proposal that writes is not one');

      /* and then it writes */
      const w = env.post({ kind:'villagePoints', token:cdm, dry:false, rows:[
        row('Devaruppula', 'Tirumalagiri', 17.66, 79.08) ] });
      t.eq(w.ok, true, 'applied');
      t.eq(w.wrote, 1, 'one village placed');
      t.eq(Number(env.sheets['GPs'].rows[4][2]), 17.66, 'the latitude is on the roll');
      t.eq(Number(env.sheets['GPs'].rows[4][3]), 79.08, 'and the longitude');

      /* AND THE OFFICER IS FENCED FROM THAT MOMENT, which is the whole point:
         he was unplaced two sections ago and marked from anywhere. */
      t.eq(mark(env, tok(env, '9000000053'), FAR).ok, false,
        'THE OFFICER WHOSE VILLAGE WAS JUST PLACED IS NOW FENCED');
      t.eq(mark(env, tok(env, '9000000053'), { lat:17.66, lng:79.08 }).ok, true,
        'and marks at his own office');

      /* RULE 8: a second paste finds its own work done */
      const again = env.post({ kind:'villagePoints', token:cdm, dry:false, rows:[
        row('Devaruppula', 'Tirumalagiri', 17.66, 79.08) ] });
      t.eq(again.wrote, 0, 'a second paste writes nothing');
      t.eq(again.counts.unchanged, 1, 'and says so');

      /* A COORDINATE THAT CANNOT BE BELIEVED IS REFUSED, NOT WRITTEN. Three
         of the district's own 280 rows were like this on 09.10.2026 — a
         longitude of 7979.1198397, one of 70.256598, and one with the
         latitude copied into the longitude column. Under a fence a wrong
         point does not print a wrong figure on a console: it refuses an
         honest officer's attendance every morning. */
      const bad = env.post({ kind:'villagePoints', token:cdm, dry:true, rows:[
        row('Devaruppula', 'Devaruppula', 17.7415325, 7979.1198397),
        row('Devaruppula', 'Kadavendi',   17.684296,  17.475855),
        row('Devaruppula', 'Peddapalle',  17.784822,  70.256598) ] });
      t.eq(bad.counts.refused, 3, 'ALL THREE SHAPES ARE REFUSED');
      t.ok(/not in this district/.test(bad.plans[0].why), 'and told apart from a village that is missing',
        bad.plans[0].why);
      t.eq(Number(env.sheets['GPs'].rows[1][2]), HOME.lat, 'and the good point that was there is untouched');

      /* NOTHING IS CREATED FROM A PASTE */
      const no = env.post({ kind:'villagePoints', token:cdm, dry:true, rows:[
        row('Devaruppula', 'Nowhere At All', 17.6, 79.05) ] });
      t.eq(no.counts.refused, 1, 'a village not on the roll is refused');
      t.ok(/nothing is created/.test(no.plans[0].why), 'rather than invented', no.plans[0].why);

      /* THE BRACKET THAT WOULD HAVE COST FIFTEEN VILLAGES THEIR OFFICE.
         The roll spells it "Ghanpur (Stn)" and the district's table spells
         it "Ghanpur(Stn)". Lingala Ghanpur is still a different mandal. */
      env.sheets['GPs'].rows.push(['Ghanpur (Stn)', 'Pembarthy', '', '']);
      const br = env.post({ kind:'villagePoints', token:cdm, dry:true, rows:[
        row('Ghanpur(Stn)', 'Pembarthy', 17.70, 79.20) ] });
      t.eq(br.counts.placed, 1, 'THE BRACKET DOES NOT COST A VILLAGE ITS OFFICE');
      t.eq(br.plans[0].mandal, 'Ghanpur (Stn)', 'and the roll\'s own spelling is what is recorded');

      /* a moved point says how far it moved, because that is the question */
      const mv = env.post({ kind:'villagePoints', token:cdm, dry:true, rows:[
        row('Devaruppula', 'Devaruppula', 17.61, 79.06) ] });
      t.eq(mv.counts.moved, 1, 'a village already placed is reported as MOVED');
      t.ok(/moved [\d.]+ km/.test(mv.plans[0].why), 'with how far, so a typo shows itself',
        mv.plans[0].why);

      /* AND A POINT INSIDE THE DISTRICT CAN STILL BE IN THE WRONG MANDAL.
         The box catches 7979.1198397. It does not catch a 78 typed for a 79,
         which lands a village a hundred kilometres west and inside the box —
         two of the district's own 280 rows were exactly that on 09.10.2026,
         and nothing automatic would have stopped either of them refusing its
         Secretary every morning for ever. */
      const far = env.post({ kind:'villagePoints', token:cdm, dry:true, rows:[
        row('Devaruppula', 'Devaruppula',  17.60, 79.05),
        row('Devaruppula', 'Peddapalle',   17.61, 79.06),
        row('Devaruppula', 'Kadavendi',    17.70, 79.05),
        row('Devaruppula', 'Tirumalagiri', 17.78, 78.23) ] });
      t.eq(far.counts.ambiguous, 1, 'THE ONE IN THE WRONG MANDAL IS CAUGHT');
      const amb = far.plans.filter(p => p.verdict === 'ambiguous')[0];
      t.eq(amb.gp, 'Tirumalagiri', 'by name', amb && amb.gp);
      t.ok(/km from the middle of/.test(amb.why), 'with how far out of its mandal it is', amb.why);
      t.eq(far.counts.placed + far.counts.moved + far.counts.unchanged, 3,
        'and the three good ones are untouched by it');
      t.eq(far.plans.filter(p => p.verdict === 'ambiguous' && p.row).length, 1,
        'it is held back, not written');

      /* ONE VILLAGE IS NOT A MANDAL. With fewer than three points there is
         nothing to be far from, and a lone correction must not be refused
         for having no neighbours — the same rule mandalCentres_ keeps. */
      const lone = env.post({ kind:'villagePoints', token:cdm, dry:true, rows:[
        row('Ghanpur (Stn)', 'Pembarthy', 17.70, 79.20) ] });
      t.eq(lone.counts.ambiguous, 0, 'a lone village with no mandal around it is not second-guessed');

      /* and it is the Collector's alone */
      const ps = env.post({ kind:'villagePoints', token:tok(env, '9000000051'), dry:true,
        rows:[row('Devaruppula', 'Devaruppula', 17.60, 79.05)] });
      t.eq(ps.ok, false, 'A SECRETARY MAY NOT PLACE HIS OWN OFFICE — it is the fence around him');
    }

    /* ---- 15. AND A TABLE THAT NAMES THE MAN, NOT THE PLACE ----
       Both shapes arrived in the Gram Palana rolls. The point is stored
       against the VILLAGE either way: an officer transferred tomorrow takes
       nothing with him and the next man inherits the same office. */
    {
      const env = world();
      const cdm = tok(env, '9000000001');
      const one = env.post({ kind:'villagePoints', token:cdm, dry:true,
        rows:[{ phone:'9000000051', lat:17.61, lng:79.06 }] });
      t.eq(one.counts.moved, 1, 'a line naming only the officer is resolved to his village');
      t.eq(one.plans[0].gp, 'Devaruppula', 'by the register, which is the authority');

      const two = env.post({ kind:'villagePoints', token:cdm, dry:true,
        rows:[{ phone:'9000000052', lat:17.61, lng:79.06 }] });
      t.eq(two.counts.ambiguous, 1,
        'AND AN OFFICER HOLDING TWO VILLAGES IS AMBIGUOUS, not guessed at');
      t.ok(/which of them/.test(two.plans[0].why), 'and the district is asked which', two.plans[0].why);
      t.contains(two.plans[0].why, 'B. TwoVillages', 'named, so the line can be found in the sheet');
      t.contains(two.plans[0].why, 'Peddapalle', 'with the villages he holds — the first');
      t.contains(two.plans[0].why, 'Kadavendi', 'and the second');
    }

    /* ---- 16. WHAT THE FENCE IS DOING — the console's monitoring screen.
            Three questions that are not the same question: how much of the
            order is in force, whether it refuses anybody, and which of the
            refusals are the register's OWN fault. The third is the one the
            screen exists for. ---- */
    {
      const env = world();
      const cdm = tok(env, '9000000001');

      /* HOW MUCH OF THE ORDER IS IN FORCE. Of the five villages on this roll,
         Tirumalagiri has no point and Konne's is a longitude of 7852556 —
         and the second must be counted with the unplaced, not the placed,
         because gpPlaces_ drops it too and it therefore fences nobody. A
         coverage figure that counts an unbelievable point as covered is a
         lie about how much of the district the Collector's order reaches. */
      const r0 = env.ctx.fenceReport_();
      t.eq(r0.on, true, 'the report says the fence is in force');
      t.eq(r0.km, 5, 'at five kilometres');
      t.eq(r0.villages.total, 5, 'five villages on the roll');
      t.eq(r0.villages.placed, 3, 'three of them placed');
      t.eq(r0.villages.unplaced, 2,
        'AND THE UNBELIEVABLE POINT COUNTS AS UNPLACED — it fences nobody, so it covers nobody');
      t.eq(r0.unplaced.filter(u => u.gp === 'Konne').length, 1, 'Konne is named among them');
      t.eq(r0.unplaced.filter(u => u.gp === 'Tirumalagiri').length, 1, 'and so is Tirumalagiri');
      t.eq((r0.byMandal[0] || {}).mandal, 'Devaruppula', 'and it is broken down by mandal');

      /* WHETHER IT IS REFUSING ANYBODY, day by day */
      mark(env, tok(env, '9000000051'), FAR);
      const r1 = env.ctx.fenceReport_();
      t.eq(r1.days.length, 14, 'the fortnight is always fourteen days long');
      t.eq(r1.days[13].n, 1, 'today carries the refusal');
      t.eq(r1.days[0].n, 0,
        'AND A DAY WITH NONE IS A NOUGHT, not a gap — a chart with days missing reads as a quiet week');
      t.eq(r1.today.length, 1, 'and today is listed by name');

      /* AND WHICH REFUSALS ARE THE REGISTER'S OWN FAULT.
         One refusal is a man who was somewhere else. The same distance every
         morning is a village office recorded in the wrong place — and that
         officer is walking up the notice ladder for the register's mistake. */
      const FH = ['date','phone','name','role','mandal','which','tries','at',
                  'lat','lng','accuracy','place','km','receivedAt'];
      const sh = env.sheets['Outside'];
      const back = n => new Date(Date.parse('2026-10-12T12:00:00+05:30') - n * 86400000)
        .toISOString().slice(0, 10);
      const put = o => { const row = new Array(sh.rows[0].length).fill('');
        Object.keys(o).forEach(k => { const i = sh.rows[0].indexOf(k); if(i >= 0) row[i] = o[k]; });
        sh.rows.push(row); };
      [1, 2, 3, 4].forEach(n => put({ date:back(n), phone:'9000000052', name:'B. TwoVillages',
        role:'PS', mandal:'Devaruppula', which:'IN', tries:1, at:back(n) + 'T09:10:00+05:30',
        lat:17.4, lng:79.05, accuracy:15, place:'Peddapalle', km:21.8 + (n % 2) * 0.3,
        receivedAt:back(n) + 'T09:20:00+05:30' }));
      [1, 3, 6].forEach((n, i) => put({ date:back(n), phone:'9000000055', name:'E. TheMpo',
        role:'MPO', mandal:'Devaruppula', which:'IN', tries:1, at:back(n) + 'T09:40:00+05:30',
        lat:17.4, lng:79.05, accuracy:15, place:'MPDO Office, Devaruppula',
        km:[6.1, 24.0, 44.5][i], receivedAt:back(n) + 'T09:50:00+05:30' }));

      const r2 = env.ctx.fenceReport_();
      const steady = r2.repeat.filter(x => x.phone === '9000000052')[0];
      const roam   = r2.repeat.filter(x => x.phone === '9000000055')[0];
      t.ok(!!steady && !!roam, 'both repeat cases are reported');
      t.eq(steady.days, 4, 'the steady one was refused on four days');
      t.eq(steady.steady, true,
        'AND IS CALLED OUT AS THE POINT, because the distance never varies');
      t.ok(steady.spread <= 0.5, 'the spread is what says so', String(steady.spread));
      t.eq(roam.steady, false,
        'while a man refused from six, twenty-four and forty-four kilometres is NOT the point');
      t.ok(roam.spread > 30, 'and his spread says that too', String(roam.spread));
      t.eq(r2.repeat.filter(x => x.phone === '9000000051').length, 0,
        'AND A MAN REFUSED ONCE IS NOT ON THIS LIST AT ALL — he was somewhere else that morning');

      /* THE DISTANCE IS THE MEDIAN, not the mean, for the reason
         mandalCentres_ takes one: a mean is dragged by the very outlier that
         would hide the pattern it is meant to find. */
      t.ok(steady.km >= 21.8 && steady.km <= 22.1, 'the distance reported is the median of his refusals',
        String(steady.km));

      /* AND WITH THE FENCE DOWN THE SCREEN SAYS SO rather than showing a
         wall of noughts, which reads as a fence doing nothing. */
      env.props.FENCE_OFF = '1';
      t.eq(env.ctx.fenceReport_().on, false, 'with the fence stood down the report says so');
      t.eq(env.ctx.fenceReport_().km, 0, 'and reports no radius');
    }

    /* ---- 17. THE ROLL AND THE DISTRICT'S TABLE SPELL THREE MANDALS
            DIFFERENTLY, AND THAT COST SIXTY-SIX VILLAGES THEIR OFFICE.
            On the first dry run of the district's own table of 09.10.2026,
            66 of 280 rows came back "the roll has that village under
            Bachannapeta, not under Bachannapet" — a quarter of the order
            held out of force by three vowels. mkey2_ strips punctuation and
            nothing else, so it carried "Ghanpur(Stn)" and could not carry
            this. MANDAL_ALIAS_ names the twelve mandals instead. */
    {
      const env = world();
      const cdm = tok(env, '9000000001');
      const row = (m, g, y, x) => ({ mandal:m, gp:g, lat:y, lng:x });
      /* the roll's own spellings, against which the district's table is read */
      env.sheets['GPs'].rows.push(['Bachannapeta',   'Salvapur',    '', '']);
      env.sheets['GPs'].rows.push(['Palakurthi',     'Visnoor',     '', '']);
      env.sheets['GPs'].rows.push(['Raghunathpalle', 'Komalla',     '', '']);
      env.sheets['GPs'].rows.push(['Raghunathpalle', 'Ibrahimpur',  '', '']);

      const d = env.post({ kind:'villagePoints', token:cdm, dry:true, rows:[
        row('Bachannapet',     'Salvapur',   17.815, 78.882),
        row('Palakurthy',      'Visnoor',    17.630, 79.407),
        row('Raghunathapally', 'Komalla',    17.774, 79.303),
        row('Raghunathpally',  'Ibrahimpur', 17.760, 79.226) ] });
      t.eq(d.counts.placed, 4,
        'THE DISTRICT MAY SPELL A MANDAL ITS OWN WAY — all four are placed');
      t.eq(d.plans[0].mandal, 'Bachannapeta',
        'and the roll’s own spelling is what the plan carries back');

      /* AND THE ALIAS IS A TABLE OF TWELVE NAMED MANDALS, NEVER A
         RESEMBLANCE. Lingala Ghanpur and Ghanpur (Stn) are two edits apart
         and are two different mandals seventy kilometres from one another;
         merging them would put a man's place of duty in the wrong half of
         the district. */
      t.eq(env.ctx.mkeyM_('Lingala Ghanpur') === env.ctx.mkeyM_('Ghanpur (Stn)'), false,
        'LINGALA GHANPUR IS STILL NOT GHANPUR (Stn)');
      t.eq(env.ctx.mkeyM_('Ghanpur(Stn)'), env.ctx.mkeyM_('Ghanpur (Stn)'),
        'while a bracket is still only a bracket');
      t.eq(env.ctx.mkeyM_('Bachannapet'), env.ctx.mkeyM_('Bachannapeta'), 'the three aliases hold');
      t.eq(env.ctx.mkeyM_('Palakurthy'), env.ctx.mkeyM_('Palakurthi'), 'the second');
      t.eq(env.ctx.mkeyM_('Raghunathapally'), env.ctx.mkeyM_('Raghunathpalle'), 'and the third');

      /* AND THE TWO TABS NEED NOT AGREE EITHER. Users carries the mandal
         against the officer and GPs carries it against the village. Where
         they differ the exact key misses, the fallback by village name alone
         finds two Lingampallys and gives up, and the Secretary is quietly
         UNPLACED — safe, and still an officer the order does not reach. */
      env.post({ kind:'villagePoints', token:cdm, dry:false, rows:[
        row('Bachannapet', 'Salvapur', 17.815, 78.882) ] });
      const pts = env.ctx.dutyPoints_({ role:'PS', mandal:'Bachannapet',
        mandals:['Bachannapet'], gps:['Salvapur'] });
      t.eq(pts.length, 1, 'HE IS PLACED THOUGH THE TWO TABS SPELL HIS MANDAL DIFFERENTLY');
      t.eq(pts[0].name, 'Salvapur', 'at his own village office');
      t.eq(pts[0].which, 'village', 'and it is the village and not the mandal office');
      /* the village name itself is still matched exactly — that is what keeps
         one village's office off another */
      t.eq(env.ctx.dutyPoints_({ role:'PS', mandal:'Bachannapet',
        mandals:['Bachannapet'], gps:['Salvapuram'] }).length, 0,
        'while a village name a letter out is NOT quietly matched');
    }

    /* ---- 18. AND A REFUSAL NAMES WHAT IT NEARLY MATCHED.
            "No village of that name is on the roll" was answered to
            ninety-six of the 280, and it is true of two different things: a
            village the roll has never carried, and one it carries under
            another spelling. From that sentence the Collector cannot tell
            which, and ninety-six villages is a third of the order. */
    {
      const env = world();
      const cdm = tok(env, '9000000001');
      const row = (m, g, y, x) => ({ mandal:m, gp:g, lat:y, lng:x });
      env.sheets['GPs'].rows.push(['Devaruppula', 'Peddamaddur',       '', '']);
      env.sheets['GPs'].rows.push(['Devaruppula', 'Thammadapally (G)', '', '']);
      env.sheets['GPs'].rows.push(['Devaruppula', 'Thammadapally (I)', '', '']);

      const d = env.post({ kind:'villagePoints', token:cdm, dry:true, rows:[
        row('Devaruppula', 'Peddamadduru',  17.598, 79.301),
        row('Devaruppula', 'Thammadapally', 17.772, 79.074),
        row('Devaruppula', 'Zahirabad',     17.600, 79.050) ] });

      t.eq(d.plans[0].verdict, 'ambiguous',
        'a village the roll spells differently is AMBIGUOUS and not refused');
      t.contains(d.plans[0].why, 'Peddamaddur',
        'and the refusal names the spelling the roll actually carries');
      t.eq(d.counts.placed, 0,
        'AND NOTHING IS PAIRED ON A RESEMBLANCE — placing one village’s office '
        + 'against another refuses an honest Secretary every morning');

      /* WHERE MORE THAN ONE IS THAT CLOSE, ALL OF THEM ARE NAMED. The roll
         carries Thammadapally (G) and Thammadapally (I) a letter apart, and
         the register saying honestly that it cannot tell is the whole of what
         AMBIGUOUS means here. */
      t.eq(d.plans[1].verdict, 'ambiguous', 'two close names are ambiguous too');
      t.contains(d.plans[1].why, '(G)', 'and both are named — the first');
      t.contains(d.plans[1].why, '(I)', 'and the second');

      /* AND A VILLAGE THE ROLL HAS NEVER CARRIED IS STILL REFUSED, which is
         the distinction this section exists to draw. */
      t.eq(d.plans[2].verdict, 'refused', 'a name nothing on the roll is near is refused');
      t.contains(d.plans[2].why, 'nothing on the roll is near it',
        'and says that is what it is');

      /* RULE 8 AND THE WRITE PATH: ambiguous is not written. */
      const w = env.post({ kind:'villagePoints', token:cdm, dry:false, rows:[
        row('Devaruppula', 'Peddamadduru', 17.598, 79.301) ] });
      t.eq(w.wrote, 0, 'and an ambiguous row is not written when Apply is pressed');
    }

    /* ---- 19. THE OFFICER IS THE KEY, AND THAT IS THE WHOLE OF IT.
            The district's table names the Secretary on every one of its 280
            lines and the register knows which village he holds, so the two
            never have to agree about a spelling. Read the other way round —
            by the name of the village — the first paste refused 162 of 280:
            66 over three mandal spellings and 96 over a village name the roll
            writes differently. Not one of those lines was wrong about who the
            officer was. */
    {
      const env = world();
      const cdm = tok(env, '9000000001');
      /* the roll's own spellings, and the district's table's are different in
         BOTH columns — the mandal and the village */
      env.sheets['GPs'].rows.push(['Bachannapeta', 'Salvapur', '', '']);
      env.sheets['Users'].rows.push(['9000000061', 'Boyana Bhagyaraju', 'PS',
        'Bachannapeta', 'Salvapur', '', '', env.ctx.hash_('9000000061', '1111'), 'TRUE']);

      const d = env.post({ kind:'villagePoints', token:cdm, dry:true, rows:[
        { mandal:'Bachannapet', gp:'Salvapuram', phone:'9000000061',
          words:['Bachannapet', 'Salvapuram', 'Boyana Bhagyaraju', 'Panchayat Secretary'],
          lat:17.815, lng:78.882 } ] });
      t.eq(d.counts.placed, 1,
        'THE MANDAL AND THE VILLAGE ARE BOTH SPELT DIFFERENTLY AND IT IS STILL PLACED');
      t.eq(d.plans[0].gp, 'Salvapur', 'against the village the ROLL names, never the paste’s spelling');
      t.eq(d.plans[0].mandal, 'Bachannapeta', 'under the mandal the roll names');
      t.contains(d.plans[0].why, 'Boyana Bhagyaraju',
        'AND IT SAYS HOW IT FOUND THE ROW — the Collector reads this before he presses Apply');

      /* A MOBILE OUT OF A SPREADSHEET IS OFTEN NOT TEN DIGITS ON THE SCREEN:
         a column narrower than the number renders it 8.33299E+09, and that is
         what the clipboard carries. The parser expands it; here the register
         is handed the name alone, which is the other half of the same cure. */
      const byName = env.post({ kind:'villagePoints', token:cdm, dry:true, rows:[
        { mandal:'Bachannapet', gp:'Salvapuram',
          words:['Bachannapet', 'Salvapuram', 'Boyana Bhagyaraju', 'Regular'],
          lat:17.815, lng:78.882 } ] });
      t.eq(byName.counts.placed, 1, 'A LINE WITH NO READABLE NUMBER IS MATCHED BY THE NAME');
      t.eq(byName.plans[0].gp, 'Salvapur', 'to the village the register says he holds');

      /* AND ONE SURNAME IS NOT A MAN. Half this district is somebody Kumar,
         and the wrong answer here writes one village's office against
         another and refuses an honest Secretary every morning. */
      env.sheets['GPs'].rows.push(['Bachannapeta', 'Laxmapur', '', '']);
      env.sheets['Users'].rows.push(['9000000062', 'G. Praveen Kumar', 'PS',
        'Bachannapeta', 'Laxmapur', '', '', env.ctx.hash_('9000000062', '1111'), 'TRUE']);
      const loose = env.post({ kind:'villagePoints', token:cdm, dry:true, rows:[
        { mandal:'Bachannapet', gp:'Nowhere',
          words:['Bachannapet', 'Nowhere', 'D. Kumar'], lat:17.82, lng:78.89 } ] });
      t.eq(loose.counts.placed, 0,
        'A SINGLE SHORT SURNAME MATCHES NOBODY — it is not written on a guess');

      /* nor is a line that reads as two men */
      env.sheets['Users'].rows.push(['9000000063', 'Boyana Bhagyaraju', 'PS',
        'Bachannapeta', 'Laxmapur', '', '', env.ctx.hash_('9000000063', '1111'), 'TRUE']);
      const twoMen = env.post({ kind:'villagePoints', token:cdm, dry:true, rows:[
        { mandal:'Bachannapet', gp:'Nowhere',
          words:['Bachannapet', 'Nowhere', 'Boyana Bhagyaraju'], lat:17.82, lng:78.89 } ] });
      t.eq(twoMen.counts.ambiguous, 1,
        'AND A LINE THAT READS AS TWO OFFICERS IS AMBIGUOUS, not resolved to the first');
      t.contains(twoMen.plans[0].why, 'either', 'and both are named for him to settle');
    }

    /* ---- 13. AND THE SANITATION REGISTER IS, which is the order ---- */
    {
      const env = world();
      t.eq(env.ctx.tenant_().key, 'SJGP', 'this is the sanitation register');
      t.eq(Number(env.ctx.tenant_().fence), 5, 'and it is fenced at five kilometres');
      t.eq(env.ctx.tenant_().placeOfDuty, true,
        'and it has a place of duty at last — the premise rule 10 was written without');
    }
  }
};

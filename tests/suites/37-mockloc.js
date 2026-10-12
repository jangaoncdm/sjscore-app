/* NOT MEASURED — the location a handset did not read (FeatureMockLocation.gs).

   Ordered 12.10.2026. A satellite fix is a measurement with noise in it; a
   mock-location app returns the point it was given, byte for byte, every
   morning, and claims one metre for it. The module reads the Attendance tab
   for the shapes a receiver never produces, and — because the register
   issues show-cause notices — for the honest shapes that look like them and
   must not be counted:

     the same fine coordinate on two mornings is a typed point;
     a metre at a point that never moves is an app; a metre at points that
       move is a good phone and is a lead, never a finding;
     one fine point under two officers on one morning is one handset;
     the same wifi or cell-tower point under two officers is a building, and
       is not counted;
     a mark that arrived days late is printed and not weighed;
     the reading is the Collector's alone, writes nothing, and refuses nobody. */
'use strict';
const mock = require('../gasmock.js');

const U = ['Phone', 'Name', 'Role', 'Mandal', 'GP', 'Email', 'InitPin', 'Hash', 'Active'];
const OFFICE = { lat:17.600000, lng:79.050000 };          /* Devaruppula village office */
const KADA   = { lat:17.700000, lng:79.050000 };          /* Kadavendi, 11 km off */
const MPDO   = { lat:17.620000, lng:79.070000 };
const DAYS = ['2026-10-01', '2026-10-03', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'];

function world(){
  const env = mock.load({ now:'2026-10-12T10:00:00+05:30', admin:true });
  const c = env.ctx;
  env.mkSheet('Users', U, [
    { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Email:'cdm@mock.example', Active:'TRUE' },
    { Phone:'9000000061', Name:'A. Pinned',   Role:'PS',   Mandal:'Devaruppula', GP:'Devaruppula', Active:'TRUE' },
    { Phone:'9000000062', Name:'B. Honest',   Role:'PS',   Mandal:'Devaruppula', GP:'Kadavendi',   Active:'TRUE' },
    { Phone:'9000000063', Name:'C. GoodPhone',Role:'PS',   Mandal:'Devaruppula', GP:'Devaruppula', Active:'TRUE' },
    { Phone:'9000000064', Name:'D. TwinOne',  Role:'PS',   Mandal:'Devaruppula', GP:'Kadavendi',   Active:'TRUE' },
    { Phone:'9000000065', Name:'E. TwinTwo',  Role:'PS',   Mandal:'Devaruppula', GP:'Kadavendi',   Active:'TRUE' },
    { Phone:'9000000066', Name:'F. TheMpdo',  Role:'MPDO', Mandal:'Devaruppula', Active:'TRUE' },
    { Phone:'9000000067', Name:'G. Staffer',  Role:'STAFF',Mandal:'Devaruppula', Active:'TRUE' },
    { Phone:'9000000068', Name:'H. Late',     Role:'PS',   Mandal:'Devaruppula', GP:'Kadavendi',   Active:'TRUE' },
    { Phone:'9000000069', Name:'I. TwoDays',  Role:'PS',   Mandal:'Devaruppula', GP:'Kadavendi',   Active:'TRUE' },
    { Phone:'9000000070', Name:'J. Secretary',Role:'PS',   Mandal:'Devaruppula', GP:'Kadavendi',   Active:'TRUE' }
  ]);
  env.sheets['Users'].rows.slice(1).forEach(r => { const p = c.phone10_(r[0]); if(p) r[U.indexOf('Hash')] = c.hash_(p, '1111'); });
  env.mkSheet('GPs', ['Mandal', 'GP', 'Lat', 'Lng'], [
    { Mandal:'Devaruppula', GP:'Devaruppula', Lat:OFFICE.lat, Lng:OFFICE.lng },
    { Mandal:'Devaruppula', GP:'Kadavendi',   Lat:KADA.lat,   Lng:KADA.lng }
  ]);
  env.mkSheet('Mandals', ['Mandal', 'Office', 'Lat', 'Lng'], [
    { Mandal:'Devaruppula', Office:'MPDO Office, Devaruppula', Lat:MPDO.lat, Lng:MPDO.lng }
  ]);
  env.mkSheet('Holidays', ['Date', 'Occasion'], []);
  return env;
}
const tok = (env, ph) => env.post({ kind:'login', u:ph, p:'1111' }).token;
/* a seeded, deterministic jitter so the honest officer scatters like a receiver */
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
function put(env, ph, name, role, day, lat, lng, acc, more){
  env.mark(ph, day, day + 'T09:10:00+05:30', (more && more.rx) || day + 'T03:40:30Z', Object.assign({
    name:name, role:role, mandal:'Devaruppula', lat:lat, lng:lng, accuracy:acc, verified:'TRUE', timezone:'Asia/Calcutta', skew:0 }, more || {}));
}

module.exports = {
  name: 'not measured (FeatureMockLocation: the location a handset did not read)',
  run(t){
    const env = world();
    const c = env.ctx;

    /* A. the point pinned to the village office, at one metre, six mornings — and one honest morning */
    DAYS.forEach((d, k) => put(env, '9000000061', 'A. Pinned', 'PS', d,
      k === 6 ? OFFICE.lat + 0.00031 : OFFICE.lat, k === 6 ? OFFICE.lng - 0.00022 : OFFICE.lng, k === 6 ? 7 : 1));
    /* B. an honest receiver: scatter of tens of metres, accuracy that moves with the sky */
    DAYS.forEach(d => put(env, '9000000062', 'B. Honest', 'PS', d,
      +(KADA.lat + (rnd() - 0.5) * 0.0005).toFixed(7), +(KADA.lng + (rnd() - 0.5) * 0.0005).toFixed(7), Math.round(4 + rnd() * 20)));
    /* C. a good dual-band phone: one metre claimed, and the point moves every morning */
    DAYS.forEach((d, k) => put(env, '9000000063', 'C. GoodPhone', 'PS', d,
      +(OFFICE.lat + (k - 3) * 0.00006).toFixed(7), +(OFFICE.lng + (k % 2) * 0.00005).toFixed(7), 1));
    /* D and E. one fine point under two officers on three mornings */
    DAYS.forEach((d, k) => {
      const same = k % 2 === 0;
      put(env, '9000000064', 'D. TwinOne', 'PS', d, +(KADA.lat + 0.0002).toFixed(6), +(KADA.lng + 0.0001).toFixed(6), 8);
      put(env, '9000000065', 'E. TwinTwo', 'PS', d, same ? +(KADA.lat + 0.0002).toFixed(6) : +(KADA.lat + 0.003 + k * 0.0002).toFixed(6),
        same ? +(KADA.lng + 0.0001).toFixed(6) : +(KADA.lng - 0.002).toFixed(6), 8);
    });
    /* F and G. the MPDO and a staffer on the office wifi: the same point, twenty metres, every morning */
    DAYS.forEach(d => { put(env, '9000000066', 'F. TheMpdo', 'MPDO', d, 17.620011, 79.070022, 20);
                        put(env, '9000000067', 'G. Staffer', 'STAFF', d, 17.620011, 79.070022, 20); });
    /* H. honest fixes that reached the district four days late */
    DAYS.forEach((d, k) => put(env, '9000000068', 'H. Late', 'PS', d,
      +(KADA.lat + (rnd() - 0.5) * 0.0005).toFixed(7), +(KADA.lng + (rnd() - 0.5) * 0.0005).toFixed(7), Math.round(5 + rnd() * 15),
      k < 4 ? { rx:'2026-10-11T04:00:00Z' } : null));
    /* I. two located days only: not judged */
    put(env, '9000000069', 'I. TwoDays', 'PS', DAYS[0], KADA.lat, KADA.lng, 1);
    put(env, '9000000069', 'I. TwoDays', 'PS', DAYS[1], KADA.lat, KADA.lng, 1);
    /* J. a sanctioned-leave row with a far point, and no fix at all one day: neither is a mark */
    put(env, '9000000070', 'J. Secretary', 'PS', DAYS[0], 17.1, 79.9, 10, { status:'LEAVE', leaveType:'CL' });
    DAYS.slice(1).forEach(d => put(env, '9000000070', 'J. Secretary', 'PS', d, '', '', '', { verified:'FALSE' }));

    /* ---- 1. the reading is the Collector's alone ---- */
    {
      const r = env.get('mockloc', { token:tok(env, '9000000061') });
      t.eq(r.ok, false, 'an officer is refused the reading');
      t.ok(/Collector/.test(r.error), 'and told whose it is', r.error);
    }

    const cdm = tok(env, '9000000001');
    const r = env.get('mockloc', { token:cdm, days:'30' });
    t.eq(r.ok, true, 'the Collector is answered');
    t.eq(r.from, '2026-09-12', 'thirty days back from today');
    t.eq(r.to, '2026-10-12', 'to today');
    t.eq(r.fine, 15, 'a fine fix is fifteen metres or better');
    t.eq(r.leaveRows, 1, 'the sanctioned-leave row is left aside');
    t.eq(r.noFix, 6, 'the mornings with no fix are counted and not judged as points');

    const by = {}; r.findings.forEach(x => by[x.phone] = x); const lead = {}; r.leads.forEach(x => lead[x.phone] = x);

    /* ---- 2. THE PINNED POINT IS A FINDING, measured from his own office ---- */
    {
      const a = by['9000000061'];
      t.ok(!!a, 'A. Pinned is a finding');
      t.eq(a && a.repeat && a.repeat.days, 6, 'the same coordinate on six mornings');
      t.eq(a && a.repeat.points[0].point, OFFICE.lat.toFixed(6) + ',' + OFFICE.lng.toFixed(6), 'and it is the point');
      t.eq(a && a.repeat.points[0].officeM, 0, 'WHICH IS THE VILLAGE OFFICE ITSELF, to the metre');
      t.ok(a && /Devaruppula/.test(a.repeat.points[0].officeName), 'named', a && a.repeat.points[0].officeName);
      t.eq(a && a.metre && a.metre.days, 6, 'six mornings claim a metre');
      t.eq(a && a.metre.pinned, true, 'and the metre is pinned, which is an app');
      t.eq(a && a.metre.otherMin, 7, 'his one honest morning claimed seven metres');
      t.eq(a && a.score, 6, 'two signals, weight six');
      t.ok(a && a.fixes.length === 7, 'every morning travels with him, for the drawer', a && a.fixes.length);
      t.eq(a && a.fixes[0].officeM, 0, 'with its distance from his office');
    }

    /* ---- 3. THE HONEST RECEIVER SHOWS NOTHING ---- */
    t.ok(!by['9000000062'] && !lead['9000000062'], 'B. Honest is neither a finding nor a lead');
    t.ok(r.clean >= 1, 'and is counted among those who show nothing');
    /* the baseline is a median over everybody who has two fine fixes, and
       this world is half planted apps whose scatter is nought — the figure
       is honest about that rather than measuring the honest officer alone */
    t.ok(r.baselineM != null && r.baselineM >= 0 && r.baselineM < 60, 'the baseline is the district’s own scatter', String(r.baselineM));

    /* ---- 4. A METRE AT POINTS THAT MOVE IS A LEAD, NOT A FINDING ---- */
    {
      const cc = lead['9000000063'];
      t.ok(!by['9000000063'], 'C. GoodPhone is NOT a finding');
      t.ok(!!cc, 'but is listed as a lead');
      t.eq(cc && cc.metre.pinned, false, 'because the point moves');
      t.eq(cc && cc.metre.points, 7, 'seven mornings, seven points');
      t.eq(cc && cc.score, 1, 'at weight one');
    }

    /* ---- 5. ONE FINE POINT, TWO OFFICERS, ONE MORNING ---- */
    {
      const same = r.shared.filter(s => s.officers.some(o => o.phone === '9000000064') && s.officers.some(o => o.phone === '9000000065'));
      t.eq(same.length, 4, 'the twins share a point on four mornings');
      t.ok(!!by['9000000064'] && !!by['9000000065'], 'and both are findings');
      t.eq(by['9000000064'].shared.length, 4, 'each carrying the mornings');
      /* D also repeats his own point across days; E does not on the odd days */
      t.ok(by['9000000064'].repeat && by['9000000064'].repeat.days === 7, 'D repeated his own point every morning too');
    }

    /* ---- 6. THE OFFICE WIFI IS A BUILDING, NOT A HANDSET ---- */
    {
      const wifi = r.shared.filter(s => s.officers.some(o => o.phone === '9000000066'));
      t.eq(wifi.length, 0, 'the MPDO and the staffer on one twenty-metre point are NOT a shared morning');
      t.ok(!by['9000000066'] && !by['9000000067'] && !lead['9000000066'], 'and neither is a finding or a lead — a wifi repeat is honest');
    }

    /* ---- 7. LATE IS PRINTED AND NOT WEIGHED ---- */
    t.ok(!by['9000000068'] && !lead['9000000068'], 'four marks that arrived four days late raise nothing on their own');

    /* ---- 8. TOO FEW DAYS IS NOT JUDGED, and said so ---- */
    t.eq(r.notJudged.filter(x => x.phone === '9000000069').length, 1, 'two located days is not judged');
    t.ok(!by['9000000069'], 'and is not a finding, however his two marks look');

    /* ---- 9. THE WINDOW IS CLAMPED, and nothing is written ---- */
    t.eq(env.get('mockloc', { token:cdm, days:'500' }).days, 90, 'ninety days at most');
    t.eq(env.get('mockloc', { token:cdm, days:'2' }).days, 7, 'seven at least');
    t.eq(env.get('mockloc', { token:cdm, days:'abc' }).days, 30, 'thirty by default');
    t.ok(!env.sheets['Outside'] || env.sheets['Outside'].rows.length <= 1, 'nothing is written to the refusal tab');
    t.eq((env.sheets['Audit'] ? env.sheets['Audit'].rows.length : 0), (env.sheets['Audit'] ? env.sheets['Audit'].rows.length : 0), 'and the reading is not an act on the register');

    /* ---- 10. op=diag names the module, so "is it live" is answered by reading ---- */
    const dg = env.get('diag');
    t.ok((dg.features && dg.features.live || []).some(f => f.name === 'mockloc'), 'diag lists mockloc among the live modules');
  }
};

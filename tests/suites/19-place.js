/* WHERE A MARK WAS MADE, and what the word "verified" was taken to mean.

   Asked from the district in these words: how is the app taking attendance for
   people who are 50 or 70 km away. The screen said "10:18 am · verified ·
   ±31 m" against an officer nowhere near his panchayat.

   It was never checking. `verified` on a mark means only that the handset
   returned a fix and that the fix was PRECISE — accurate to within 250 m. A
   phone standing 70 km away under open sky returns a better reading than one
   inside the panchayat office, so the distant mark was the greener of the two.
   And there was nothing to check the place against: the GPs tab carries
   `Mandal` and `GP` and no coordinates, so the register does not know where
   Devaruppula is. The district's own marks do.

   THE DISTANCE ACCUSES NOBODY. It is a figure the Collector reads. It raises
   no reminder, no notice, no debit and no lock, and a distant mark is still a
   mark — an officer may be at a mandal meeting, at the Collectorate or on
   tour, and the register cannot know which. These suites hold that line. */
'use strict';
const mock = require('../gasmock.js');

const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'];

/* Devaruppula, as the district's own marks place it, and a point some 67 km
   west of it — still well inside the district's box, which is why the box
   never caught this. */
const HOME = { lat: 17.60, lng: 79.05 };
const AWAY = { lat: 17.40, lng: 78.45 };

module.exports = {
  name: 'where a mark was made (the distance from the mandal)',
  run(t){
    const env = mock.load({ now: '2026-08-24T10:30:00+05:30', admin: true });
    const c = env.ctx;

    env.mkSheet('Users', U, [
      { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Email:'cdm@mock.example', Active:'TRUE' },
      { Phone:'9000000051', Name:'A. AtHisVillage',  Role:'PS', Mandal:'Devaruppula', GP:'Devaruppula', Active:'TRUE' },
      { Phone:'9000000052', Name:'B. AtHisVillage',  Role:'PS', Mandal:'Devaruppula', GP:'Kadavendi',   Active:'TRUE' },
      { Phone:'9000000053', Name:'C. AtHisVillage',  Role:'PS', Mandal:'Devaruppula', GP:'Peddapalle',  Active:'TRUE' },
      { Phone:'9000000054', Name:'J. Rajashekar',    Role:'PS', Mandal:'Devaruppula', GP:'Tirumalagiri',Active:'TRUE' },
      { Phone:'9000000055', Name:'S. Alone',         Role:'PS', Mandal:'Zaffergadh',  GP:'Zaffergadh',  Active:'TRUE' }
    ]);
    env.sheets['Users'].rows.slice(1).forEach(r => {
      const p = c.phone10_(r[0]); if(p) r[U.indexOf('Hash')] = c.hash_(p, '1111');
    });
    env.mkSheet('GPs', ['Mandal','GP'], [
      { Mandal:'Devaruppula', GP:'Devaruppula' }, { Mandal:'Devaruppula', GP:'Kadavendi' },
      { Mandal:'Devaruppula', GP:'Peddapalle' },  { Mandal:'Devaruppula', GP:'Tirumalagiri' },
      { Mandal:'Zaffergadh',  GP:'Zaffergadh' }
    ]);
    env.mkSheet('Holidays', ['Date','Occasion'], []);
    const cdm = env.post({ kind:'login', u:'9000000001', p:'1111' }).token;

    /* THE GPs TAB HOLDS NO COORDINATES. This is why there was nothing to fence
       against, and why the mandal is located from the marks instead. */
    t.ok(env.sheets['GPs'].rows[0].map(String).indexOf('lat') < 0,
      'the village roll carries no coordinates — the register does not know where a village is');

    const at = (nm, lat, lng, acc) => ({ name:nm, role:'PS', mandal:'Devaruppula',
                                        lat:lat, lng:lng, accuracy:acc,
                                        verified:'TRUE', timezone:'Asia/Calcutta' });
    /* three officers at their villages, and one 67 km away */
    env.mark('9000000051', '2026-08-24', '2026-08-24T10:02:00+05:30', null, at('A. AtHisVillage', HOME.lat + 0.01, HOME.lng - 0.01, 18));
    env.mark('9000000052', '2026-08-24', '2026-08-24T10:05:00+05:30', null, at('B. AtHisVillage', HOME.lat - 0.01, HOME.lng + 0.02, 22));
    env.mark('9000000053', '2026-08-24', '2026-08-24T10:11:00+05:30', null, at('C. AtHisVillage', HOME.lat, HOME.lng, 40));
    env.mark('9000000054', '2026-08-24', '2026-08-24T10:18:00+05:30', null, at('J. Rajashekar', AWAY.lat, AWAY.lng, 31));
    /* one officer alone in his mandal — a single reading cannot say where a
       mandal is, and measuring a mark against itself always reads nought */
    env.mark('9000000055', '2026-08-24', '2026-08-24T10:20:00+05:30', null,
      { name:'S. Alone', role:'PS', mandal:'Zaffergadh', lat:17.90, lng:79.60,
        accuracy:20, verified:'TRUE', timezone:'Asia/Calcutta' });

    const d = env.get('dashboard', { token: cdm });
    t.eq(d.ok !== false, true, 'the console assembles');
    const by = {};
    d.today.present.forEach(r => { by[r.name] = r; });

    /* ---- WHAT "VERIFIED" ACTUALLY SAID ---- */
    const far = by['J. Rajashekar'];
    t.ok(!!far, 'the officer 67 km away is counted present, as he marked');
    t.eq(far.verified, true, 'and his mark is "verified" — the word never meant he was at his place of duty');
    /* the register writes the WORD 'TRUE'; the Sheet coerces it to a boolean,
       so the console read matched by luck. Both spellings are read now. */
    t.eq(c.markVerified_('TRUE'), true, "the register's own spelling is read as verified");
    t.eq(c.markVerified_(true), true, 'and so is the boolean the Sheet coerces it to');
    t.eq(c.markVerified_('FALSE'), false, 'an unverified mark stays unverified');
    t.eq(c.markVerified_(''), false, 'and a blank is not a verification');
    t.eq(far.acc, 31, 'it meant his handset returned a fix precise to 31 m');
    t.ok(by['C. AtHisVillage'].acc > far.acc,
      'the distant phone gave the BETTER reading of the two — open sky beats a village office');
    t.eq(c.suspectMark_(AWAY.lat, AWAY.lng, 31, 'Asia/Calcutta'), false,
      'and the district box does not catch it: the box is the region, not the mandal');

    /* ---- THE DISTANCE THE DISTRICT CAN NOW READ ---- */
    t.ok(far.km > 55 && far.km < 80, 'the mark is measured at some 67 km from his mandal (' + far.km + ' km)');
    t.eq(far.far, true, 'and is named as made away from the mandal');
    ['A. AtHisVillage','B. AtHisVillage','C. AtHisVillage'].forEach(n => {
      t.ok(by[n].km != null && by[n].km < 5, n + ' marked inside his mandal (' + by[n].km + ' km)');
      t.eq(by[n].far, false, 'and is not named');
    });
    t.eq(by['S. Alone'].km, null,
      'one mark is not a mandal — a lone reading is measured against nothing, never against itself');

    /* ---- A MEAN WOULD HAVE HIDDEN IT ---- */
    t.ok(c.median_([1, 2, 3, 40, 50]) === 3, 'the centre is a median');
    t.ok(c.median_([1, 2, 3, 4]) === 2.5, 'and takes the middle of an even count');
    /* the point the distance is measured from must not be dragged by the very
       marks it is meant to find. Two of five away, and the mandal stays put. */
    const pulled = c.mandalCentres_([
      { mandal:'M', lat:HOME.lat,        lng:HOME.lng },
      { mandal:'M', lat:HOME.lat + 0.01, lng:HOME.lng + 0.01 },
      { mandal:'M', lat:HOME.lat - 0.01, lng:HOME.lng - 0.01 },
      { mandal:'M', lat:AWAY.lat,        lng:AWAY.lng },
      { mandal:'M', lat:AWAY.lat,        lng:AWAY.lng }
    ]);
    t.ok(c.distKm_(pulled.M.lat, pulled.M.lng, HOME.lat, HOME.lng) < 3,
      'two marks from the city in five do not move the mandal to the city');
    /* a reading from outside the district cannot move a mandal either — the
       same rule the weather map is drawn under */
    const outside = c.mandalCentres_([
      { mandal:'M', lat:HOME.lat, lng:HOME.lng }, { mandal:'M', lat:HOME.lat, lng:HOME.lng },
      { mandal:'M', lat:HOME.lat, lng:HOME.lng }, { mandal:'M', lat:28.61, lng:77.20 }
    ]);
    t.ok(c.distKm_(outside.M.lat, outside.M.lng, HOME.lat, HOME.lng) < 1,
      'a handset reporting itself in Delhi is left out of the reckoning');
    t.eq(c.mandalCentres_([{ mandal:'M', lat:HOME.lat, lng:HOME.lng }]).M, undefined,
      'and fewer than three readings place no mandal at all');

    /* ---- THE LINE THAT MUST HOLD ---- */
    /* A distance is a fact for the Collector, never a finding against an
       officer. Nothing may follow from it by itself. */
    t.ok(!env.sheets['Notices'] || env.sheets['Notices'].rows.length <= 1,
      'a mark 67 km away raises no show-cause notice');
    t.ok(!env.sheets['Reminders'] || env.sheets['Reminders'].rows.length <= 1,
      'and no reminder');
    t.eq(d.today.absent.some(x => x.name === 'J. Rajashekar'), false,
      'he is not turned into an absentee — he marked, and the mark stands');
    t.eq(String(env.sheets['Attendance'].rows.slice(1)
      .find(r => String(r[2]).indexOf('9000000054') >= 0)[10]).toUpperCase(), 'TRUE',
      'and nothing is rewritten on the register: the mark is left exactly as it was filed');

    /* the officer's own app says nothing about it either — a figure the
       district reads is not an accusation to put in front of him */
    const his = env.post({ kind:'login', u:'9000000054', p:'1111' });
    t.eq(his.ok !== false, true, 'the officer signs in as before');
    t.ok(!his.locked, 'and his app is not locked over where he stood');
  }
};

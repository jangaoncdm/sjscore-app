/* Sign-in, sessions, role gates, and the attendance write itself.
   Rule 6 — the server decides; the client only asks. */
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'auth & attendance (login, gates, saveAttendance_)',
  run(t){
    const env = mock.load({ now: '2026-08-14T10:00:00+05:30' });
    const c = env.ctx;
    const U = ['Phone', 'Name', 'Role', 'Mandal', 'GP', 'Email', 'InitPin', 'Hash', 'Active'];
    env.mkSheet('Users', U, [
      { Phone: '9000000001', Name: 'Sandeep Kumar Jha', Role: 'COLLECTOR', Email: 'cdm@mock.example', Active: 'TRUE', Hash: '' },
      { Phone: '9000000011', Name: 'A. Punctual', Role: 'MPO', Mandal: 'Jangaon', Active: 'TRUE', Hash: '' },
      /* one number, two villages, and one row outranking the other */
      { Phone: '9000000014', Name: 'D. TwoCharges', Role: 'PS', Mandal: 'Jangaon', GP: 'Konne', Active: 'TRUE', Hash: '' },
      { Phone: '9000000014', Name: 'D. TwoCharges', Role: 'MPDO', Mandal: 'Jangaon', GP: 'Lingampalli', Active: 'TRUE', Hash: '' },
      { Phone: '9000000019', Name: 'X. Departed', Role: 'MPO', Mandal: 'Chilpur', Active: 'FALSE', Hash: '' }
    ]);
    /* PINs, hashed exactly as setupPins would */
    const setPin = (phone, pin) => {
      const sh = env.sheets['Users'], hi = U.indexOf('Hash'), pi = U.indexOf('Phone');
      sh.rows.slice(1).forEach(r => { if(c.phone10_(r[pi]) === phone) r[hi] = c.hash_(phone, pin); });
    };
    setPin('9000000011', '4321');
    setPin('9000000014', '1111');
    setPin('9000000019', '2222');

    /* one number folds into one login; the higher rank speaks for it */
    const d = c.findByPhone_('+91 9000000014');
    t.eq(d.role, 'MPDO', 'the senior charge wins the role');
    t.eq(d.gps.join(','), 'Konne,Lingampalli', 'every village against the number is available');
    t.eq(c.findByPhone_('12345'), null, 'a number that is not ten digits is nobody');

    /* wrong PIN, ten times, then the door closes for the hour */
    for(let i = 0; i < 10; i++){
      const w = env.post({ kind: 'login', u: '9000000011', p: '0000' });
      t.eq(w.ok, false, 'wrong PIN attempt ' + (i + 1) + ' is refused');
    }
    const locked = env.post({ kind: 'login', u: '9000000011', p: '4321' });
    t.eq(locked.ok, false, 'the right PIN after ten wrong ones must wait');
    t.contains(locked.error, 'Too many', 'and is told why');
    delete env.cacheStore['pl_9000000011'];                        /* the hour passes */

    const login = env.post({ kind: 'login', u: '9000000011', p: '4321' });
    t.eq(login.ok, true, 'the counter resets and the PIN works');
    t.eq(login.user.role, 'MPO', 'the session carries the role');
    const tok = login.token;
    t.eq(env.get('me', { token: tok }).user.phone, '9000000011', 'the token answers for its officer');
    t.eq(env.get('me', { token: 'forged-token' }).ok, false, 'a forged token answers for nobody');

    const gone = env.post({ kind: 'login', u: '9000000019', p: '2222' });
    t.eq(gone.ok, false, 'a deactivated officer cannot sign in');

    /* changing the PIN needs the old one, and re-keys every row of the number */
    const badOld = env.post({ kind: 'chpass', token: tok, old: '9999', newp: '5678' });
    t.eq(badOld.ok, false, 'the current PIN is required to change it');
    const chg = env.post({ kind: 'chpass', token: tok, old: '4321', newp: '5678' });
    t.eq(chg.ok, true, 'changed');
    t.eq(env.post({ kind: 'login', u: '9000000011', p: '5678' }).ok, true, 'the new PIN signs in');

    /* the Secretary reads; the Secretary never writes */
    env.mkSheet('GPs', ['Mandal', 'GP'], [{ Mandal: 'Jangaon', GP: 'Konne' }, { Mandal: 'Chilpur', GP: 'Malkapur' }]);
    const psRow = { Phone: '9000000021', Name: 'P. Secretary', Role: 'PS', Mandal: 'Jangaon', GP: 'Konne', Active: 'TRUE' };
    env.addRow('Users', psRow); setPin('9000000021', '3333');
    const ps = env.post({ kind: 'login', u: '9000000021', p: '3333' }).token;
    const psWrite = env.post({ kind: 'inspection', token: ps, record: { id: 'I9', gp: 'Konne', mandal: 'Jangaon', ym: '2026-08', score: 90 } });
    t.eq(psWrite.ok, false, 'an inspection from a PS login is refused server-side');
    t.contains(psWrite.error, 'view access', 'whatever a tampered client shows');
    t.eq(env.get('gps', { token: ps }).gps.length, 1, 'and the PS reads only his own villages');

    /* a mandal officer writes inside his mandal alone */
    const outside = env.post({ kind: 'inspection', token: tok, record: { id: 'I1', gp: 'Malkapur', mandal: 'Chilpur', ym: '2026-08', score: 80 } });
    t.eq(outside.ok, false, 'another mandal’s village is out of reach');
    const inside = env.post({ kind: 'inspection', token: tok, record: { id: 'I2', gp: 'Konne', mandal: 'Jangaon', ym: '2026-08', score: 80, date: '2026-08-14' } });
    t.eq(inside.ok, true, 'his own mandal files');
    const officerCol = env.col('Inspections', 'officer');
    t.contains(officerCol[0], 'A. Punctual (9000000011)', 'the row is stamped with who filed it, from the session, not the payload');
    env.post({ kind: 'inspection', token: tok, record: { id: 'I2', gp: 'Konne', mandal: 'Jangaon', ym: '2026-08', score: 85, date: '2026-08-14' } });
    t.eq(env.sheets['Inspections'].rows.length - 1, 1, 'the same id updates the row, never doubles it');

    /* the console is the Collector's alone */
    t.eq(env.get('dashboard', { token: tok }).ok, false, 'an MPO cannot open the console');
    setPin('9000000001', '9999');
    const cdm = env.post({ kind: 'login', u: '9000000001', p: '9999' }).token;
    const dash = env.get('dashboard', { token: cdm });
    t.eq(dash.ok, true, 'the Collector’s console assembles');
    t.ok(dash.totals && dash.totals.officers >= 4, 'and counts officers, never rows');

    /* ---- the attendance write ---- */
    env.setNow('2026-08-14T10:52:00+05:30');
    const claim = '2026-08-14T11:03:00+05:30';                     /* his clock runs 11 minutes fast */
    const m1 = env.post({ kind: 'attendance', token: tok, att: { id: 'MK1', date: '2026-08-14', ts: claim, lat: 17.72, lng: 79.15, acc: 12, verified: true, tz: 'Asia/Calcutta' } });
    t.eq(m1.ok, true, 'the mark is taken');
    t.eq(m1.skew, 660, 'and the handset is told its clock runs 660 seconds fast');

    const aHead = env.sheets['Attendance'].rows[0].map(String);
    const row1 = env.sheets['Attendance'].rows[1];
    const cell = h => row1[aHead.indexOf(h)];
    t.eq(String(cell('markedAt')), claim, 'the phone’s claim is recorded as the claim it is');
    t.eq(String(cell('receivedAt')), '2026-08-14T05:22:00.000Z', 'receivedAt is the district’s clock');
    t.eq(Number(cell('markCount')), 1, 'first mark of the day');
    t.eq(c.effMarkAt_(String(cell('markedAt')), String(cell('receivedAt'))), String(cell('receivedAt')),
      'judged, the mark reads at receipt — before the cutoff, as the officer deserves');

    /* the same mark arriving twice is not the officer marking twice */
    const m2 = env.post({ kind: 'attendance', token: tok, att: { id: 'MK1', date: '2026-08-14', ts: claim } });
    t.eq(m2.resent, true, 'a re-send is recognised');
    t.eq(m2.marks, 1, 'and the count does not move');
    /* a genuinely new mark-in raises it */
    const m3 = env.post({ kind: 'attendance', token: tok, att: { id: 'MK2', date: '2026-08-14', ts: '2026-08-14T16:00:00+05:30' } });
    t.eq(m3.duplicate, true, 'a fresh id the same day is a re-mark');
    t.eq(m3.marks, 2, 'counted');
    t.eq(env.sheets['Attendance'].rows.length - 1, 1, 'one row per officer per day, always');
    t.eq(String(env.sheets['Attendance'].rows[1][aHead.indexOf('firstMarkAt')]), claim, 'firstMarkAt keeps the morning’s claim');

    /* a photo rides to Drive and the row keeps the link */
    const withPhoto = env.post({ kind: 'attendance', token: ps, att: { id: 'MK3', date: '2026-08-14', ts: '2026-08-14T10:00:00+05:30' },
      photo: { b64: Buffer.from('jpeg-bytes').toString('base64'), name: 'mark.jpg' } });
    t.eq(withPhoto.ok, true, 'a PS marks attendance like everyone — attendance is required of every role');
    t.contains(withPhoto.url, 'drive.mock', 'the photograph landed in the attendance folder');

    /* the unmarked on the map: tagged at their LAST located mark, said as
       history — and an officer who never marked with a location is never
       given one the register does not hold */
    env.mark('9000000014', '2026-08-13', '2026-08-13T09:00:00+05:30', null, { lat: 17.71, lng: 79.12 });
    env.addRow('Users', { Phone: '9000000022', Name: 'Y. NeverMarked', Role: 'MPO', Mandal: 'Chilpur', Active: 'TRUE' });
    Object.keys(env.cacheStore).filter(k => k.indexOf('dash_') === 0).forEach(k => { delete env.cacheStore[k]; });
    const d2 = env.get('dashboard', { token: cdm });
    const dAbs = d2.today.absent.find(r => r.name === 'D. TwoCharges');
    t.ok(!!dAbs, 'D, silent today, stands on the absent list');
    t.eq(dAbs.lat, 17.71, 'tagged at the place he last marked');
    t.eq(dAbs.lastDate, '2026-08-13', 'with the date the register actually holds');
    const yAbs = d2.today.absent.find(r => r.name === 'Y. NeverMarked');
    t.ok(!!yAbs && yAbs.lat === undefined, 'no located mark on record, no location invented');

    /* the seen ping: D opens the app today without marking, and the district
       may know where — fresher than any old mark, and never attendance */
    const dTok = env.post({ kind: 'login', u: '9000000014', p: '1111' }).token;
    t.eq(env.post({ kind: 'seen', token: dTok, ping: {} }).ok, false, 'a ping without a location says nothing and is refused');
    t.eq(env.post({ kind: 'seen', token: dTok, ping: { ts: '2026-08-14T10:20:00+05:30', lat: 17.80, lng: 79.20, acc: 35 } }).noted, true, 'the ping is noted');
    env.post({ kind: 'seen', token: dTok, ping: { ts: '2026-08-14T10:40:00+05:30', lat: 17.81, lng: 79.21, acc: 20 } });
    t.eq(env.sheets['Seen'].rows.length - 1, 1, 'one row per officer per day — a second ping updates, never doubles');
    t.eq(env.post({ kind: 'seen', token: cdm, ping: { lat: 17.7, lng: 79.1 } }).noted, false, 'the Collector, not asked to mark, is not tracked either');
    t.eq(env.sheets['Seen'].rows.length - 1, 1, 'and no row was written for him');
    Object.keys(env.cacheStore).filter(k => k.indexOf('dash_') === 0).forEach(k => { delete env.cacheStore[k]; });
    const d3 = env.get('dashboard', { token: cdm });
    const dSeen = d3.today.absent.find(r => r.name === 'D. TwoCharges');
    t.eq(dSeen.lat, 17.81, 'the map takes today’s ping over last week’s mark');
    t.ok(!!dSeen.seenAt, 'and says it is a fresh sighting, not history');
    t.eq(dSeen.lastDate, '2026-08-14', 'dated today');
    t.ok(!d3.today.present.some(r => r.name === 'D. TwoCharges'), 'a ping never turns into attendance — D is still absent');
  }
};

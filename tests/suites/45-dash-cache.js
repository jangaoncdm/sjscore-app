/* THE CONSOLE'S ANSWER IS KEPT, HOWEVER LARGE THE MORNING (30.10.2026).

   The dashboard payload is held for fifty seconds so that every console
   polling every minute reads one build of the register, not one each. It was
   held only while it was under 95,000 characters, because Google keeps at
   most 100 KB under a key — and by the end of October a full morning's marks
   made it a quarter of a megabyte, so it was never held at all. Every poll
   rebuilt the register for half a minute, the polls queued, and the console
   gave up at 45 seconds and said LINK LOST, on both registers at once.

   What must hold:
     - an answer larger than one cache entry is kept, in pieces each under
       Google's limit (the mock now refuses anything over it, as Google does);
     - the second read inside the window is that answer, not a rebuild;
     - a piece missing is a miss and a rebuild, never half an answer. */
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'the console answer is cached in pieces (cacheBigPut_, cacheBigGet_)',
  run(t){
    const env = mock.load({ now: '2026-10-30T11:30:00+05:30' });
    const c = env.ctx;

    /* ---- the helpers on their own ---- */
    const cache = c.cache_();
    const big = 'x'.repeat(250000) + '—'.repeat(20000);
    t.ok((() => { try{ cache.put('probe', big); return false; }catch(e){ return true; } })(),
      'the mock refuses a value over 100 KB, as Google does');
    c.cacheBigPut_(cache, 'k1', big, 50);
    t.eq(c.cacheBigGet_(cache, 'k1'), big, 'a quarter of a megabyte comes back whole, three-byte characters and all');
    const pieces = Object.keys(env.cacheStore).filter(k => k.indexOf('k1~') === 0);
    t.ok(pieces.length >= 9, 'kept in pieces (' + pieces.length + ')');
    t.ok(pieces.every(k => Buffer.byteLength(env.cacheStore[k]) <= 100 * 1024), 'every piece under the limit');
    delete env.cacheStore[pieces[3]];
    t.eq(c.cacheBigGet_(cache, 'k1'), null, 'a piece gone is a miss, never half an answer');
    cache.put('k2', '{"ok":true}');
    t.eq(c.cacheBigGet_(cache, 'k2'), '{"ok":true}', 'an answer kept whole still reads');
    t.eq(c.cacheBigGet_(cache, 'nothing'), null, 'and nothing kept is a miss');

    /* ---- a full district morning on the console ---- */
    const extra = [];
    for(let i = 0; i < 460; i++){
      const ph = String(9100000000 + i);
      extra.push({ Phone: ph, Name: 'Officer With A Long Enough Name ' + i, Role: 'PS', Mandal: ['Jangaon', 'Chilpur', 'Narmetta'][i % 3], GP: 'Village ' + i, Email: '', Active: 'TRUE' });
    }
    env.seedUsers(extra);
    const ph1 = '9000000001', hi = 7;
    env.sheets['Users'].rows.slice(1).forEach(r => { if(c.phone10_(r[0]) === ph1) r[hi] = c.hash_(ph1, '9999'); });
    const cdm = env.post({ kind: 'login', u: ph1, p: '9999' }).token;
    for(let i = 0; i < 430; i++){
      const ph = String(9100000000 + i);
      env.mark(ph, '2026-10-30', '2026-10-30T09:' + String(10 + i % 50) + ':00+05:30', null,
        { name: 'Officer With A Long Enough Name ' + i, role: 'PS', mandal: ['Jangaon', 'Chilpur', 'Narmetta'][i % 3],
          lat: 17.7 + i / 10000, lng: 79.1 + i / 10000, accuracy: 12, verified: 'TRUE', timezone: 'Asia/Kolkata' });
    }
    const raw1 = c.doGet({ parameter: { op: 'dashboard', token: cdm } }).getContent();
    const d1 = JSON.parse(raw1);
    t.eq(d1.ok, true, 'the console answers a full morning');
    t.ok(raw1.length > 100 * 1024, 'and the answer is larger than one cache entry (' + Math.round(raw1.length / 1024) + ' KB)');
    t.ok(Object.keys(env.cacheStore).some(k => /^dash_.*~\d+~\d+$/.test(k)), 'IT IS KEPT — in pieces, where it used to be thrown away');

    env.mark('9000000011', '2026-10-30', '2026-10-30T11:20:00+05:30', null, { name: 'A. Punctual', role: 'MPO', mandal: 'Jangaon' });
    const raw2 = c.doGet({ parameter: { op: 'dashboard', token: cdm } }).getContent();
    t.eq(raw2, raw1, 'the second read inside the window is the kept answer, not a rebuild of the register');

    Object.keys(env.cacheStore).filter(k => k.indexOf('dash_') === 0).forEach(k => { delete env.cacheStore[k]; });
    const d3 = JSON.parse(c.doGet({ parameter: { op: 'dashboard', token: cdm } }).getContent());
    t.ok(d3.today.present.some(r => r.name === 'A. Punctual'), 'and once the window has passed, the new mark is read');
  }
};

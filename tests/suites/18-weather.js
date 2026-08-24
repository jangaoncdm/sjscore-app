/* Weather over the district.

   It forecasts; it does not warn. Nothing here is an IMD warning and nothing
   goes to 280 officers without the Collector passing it. What the suite holds:
   the mandals are located from the district's OWN marks, the rainfall classes
   are the IMD's, the officer sees his own mandal and not the district's, and a
   forecast service that is down must fail loudly rather than invent a sky. */
'use strict';
const mock = require('../gasmock.js');

const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'];

/* one Open-Meteo answer per point, in the shape the service really returns */
function wx(list){
  return JSON.stringify(list.map(d => ({
    current: { temperature_2m:d.t, relative_humidity_2m:60, precipitation:0,
               weather_code:d.code, wind_speed_10m:d.w || 8 },
    daily: { weather_code:[d.code], temperature_2m_max:[d.tmax != null ? d.tmax : d.t],
             temperature_2m_min:[24], precipitation_sum:[d.mm],
             precipitation_probability_max:[d.p || 40], wind_speed_10m_max:[d.wmax || d.w || 10] }
  })));
}

module.exports = {
  name: 'weather (mandal points, IMD classes, the draft the Collector passes)',
  run(t){
    const env = mock.load({ now: '2026-08-24T07:00:00+05:30' });
    const c = env.ctx;
    env.mkSheet('Users', U, [
      { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Email:'cdm@mock.example', Active:'TRUE' },
      { Phone:'9000000031', Name:'P. Sec Konne', Role:'PS', Mandal:'Jangaon', GP:'Konne', Active:'TRUE' },
      { Phone:'9000000032', Name:'Q. Sec Chil',  Role:'PS', Mandal:'Chilpur', GP:'Venkatadripeta', Active:'TRUE' }
    ]);
    env.sheets['Users'].rows.slice(1).forEach(r => {
      const p = c.phone10_(r[0]); if(p) r[U.indexOf('Hash')] = c.hash_(p, '1111');
    });
    env.mkSheet('GPs', ['Mandal','GP'], [
      { Mandal:'Jangaon', GP:'Konne' }, { Mandal:'Chilpur', GP:'Venkatadripeta' }
    ]);
    /* the district's own marks locate the mandals — including one from
       outside the district, which must not drag a mandal onto the map */
    env.mark('9000000031', '2026-08-24', '2026-08-24T09:00:00+05:30', null,
      { mandal:'Jangaon', lat:17.72, lng:79.15 });
    env.mark('9000000031', '2026-08-23', '2026-08-23T09:00:00+05:30', null,
      { mandal:'Jangaon', lat:17.74, lng:79.17 });
    env.mark('9000000032', '2026-08-24', '2026-08-24T09:05:00+05:30', null,
      { mandal:'Chilpur', lat:12.90, lng:77.60 });      /* Bengaluru — ignored */
    env.mark('9000000032', '2026-08-23', '2026-08-23T09:05:00+05:30', null,
      { mandal:'Chilpur', lat:17.60, lng:79.30 });

    /* ---- the mandals are located from the marks ---- */
    const pts = c.wxMandalPoints_();
    t.eq(pts.length, 2, 'every mandal on the roll gets a point');
    const jg = pts.find(p => p.mandal === 'Jangaon');
    t.eq(jg.located, true, 'a mandal with marks is located from them');
    t.eq(jg.lat, 17.73, 'at the average of its marks');
    const ch = pts.find(p => p.mandal === 'Chilpur');
    t.eq(ch.lat, 17.6, 'a mark from outside the district is ignored, not averaged in');

    /* ---- the IMD's rainfall classes, not invented ones ---- */
    t.eq(c.wxRainClass_(1), '', 'a trace is not rain');
    t.eq(c.wxRainClass_(10), 'light rain', '2.5 to 15.5 mm is light');
    t.eq(c.wxRainClass_(40), 'moderate rain', '15.6 to 64.4 is moderate');
    t.eq(c.wxRainClass_(90), 'heavy rain', '64.5 to 115.5 is heavy');
    t.eq(c.wxRainClass_(150), 'very heavy rain', '115.6 to 204.4 is very heavy');
    t.eq(c.wxRainClass_(260), 'extremely heavy rain', 'and above that, extremely heavy');

    /* ---- the levels ---- */
    t.eq(c.wxLevel_({ code:1, rain:0, wind:9, tmax:31 }), 'CALM', 'a fine day is calm');
    t.eq(c.wxLevel_({ code:63, rain:30, wind:12, tmax:31 }), 'WATCH', 'moderate rain is a watch');
    t.eq(c.wxLevel_({ code:65, rain:80, wind:12, tmax:31 }), 'SEVERE', 'heavy rain is severe');
    t.eq(c.wxLevel_({ code:99, rain:1, wind:10, tmax:30 }), 'SEVERE', 'so is a hailstorm');
    t.eq(c.wxLevel_({ code:1, rain:0, wind:55, tmax:30 }), 'SEVERE', 'and a 55 km/h wind');
    t.eq(c.wxLevel_({ code:1, rain:0, wind:5, tmax:44 }), 'SEVERE', 'and 44 degrees');

    /* ---- the district reads it ---- */
    const cdm = env.post({ kind:'login', u:'9000000001', p:'1111' }).token;
    const ps  = env.post({ kind:'login', u:'9000000031', p:'1111' }).token;
    /* the points go up in the order wxMandalPoints_ sorts them — Chilpur,
       then Jangaon — and the service answers one object per point in that same
       order. The replies are lined up accordingly, which is the whole contract
       between the request and the response. */
    env.fetchReply = url => /open-meteo/.test(url)
      ? wx([{ t:31, code:2,  mm:0,  w:8,  wmax:12, tmax:33 },     /* Chilpur: fine */
            { t:27, code:65, mm:80, w:14, wmax:22, tmax:30 }])    /* Jangaon: heavy */
      : '{}';

    let r = env.get('weather', { token: cdm, draft: '1' });
    t.eq(r.ok, true, 'the district gets the forecast');
    t.eq(env.fetches.length, 1, 'and it costs ONE call for the whole district');
    t.contains(env.fetches[0].url, 'latitude=17.6,17.73', 'both mandals ride in the one request, in a fixed order');
    t.contains(env.fetches[0].url, 'timezone=Asia%2FKolkata', 'read in the district’s own timezone');
    t.eq(r.rows.length, 2, 'a row a mandal');
    t.eq(r.rows[0].mandal, 'Jangaon', 'the worst mandal is first');
    t.eq(r.rows[0].level, 'SEVERE', 'and is marked severe');
    t.eq(r.rows[0].rainClass, 'heavy rain', 'in the IMD’s words');
    t.eq(r.rows[1].level, 'CALM', 'the settled mandal is calm');
    t.eq(r.level, 'SEVERE', 'and the district takes the worst of them');
    t.eq(r.counts.severe, 1, 'the counts add up');
    t.eq(r.counts.calm, 1, 'both ways');
    t.contains(r.source, 'Open-Meteo', 'the source is named');
    t.contains(r.source, 'Meteorological', 'and so is whose thresholds these are');

    /* the draft is a draft */
    t.ok(!!r.draft, 'a message is drafted from the figures');
    t.contains(r.draft, 'Heavy rain', 'naming what is coming');
    t.contains(r.draft, 'Jangaon', 'and where');
    t.contains(r.draft, '80 mm', 'with the figure itself');
    t.contains(r.draft, 'chlorination', 'and what a Secretary is to do about it');

    /* ---- the officer sees HIS mandal, not the district's ---- */
    const mine = env.get('weather', { token: ps });
    t.eq(mine.ok, true, 'the Secretary gets a forecast');
    t.eq(mine.rows, undefined, 'but not the whole district');
    t.eq(mine.mine.mandal, 'Jangaon', 'only his own mandal');
    t.eq(mine.level, 'SEVERE', 'with its level against it');

    /* ---- one call an hour, then the cache ---- */
    const n = env.fetches.length;
    env.get('weather', { token: cdm });
    t.eq(env.fetches.length, n, 'a second reading inside the hour costs no call at all');

    /* ---- a settled day says so, and calls for nothing ---- */
    const env2 = mock.load({ now: '2026-08-24T07:00:00+05:30' });
    const c2 = env2.ctx;
    t.contains(c2.wxDraft_({ rows:[{ mandal:'Jangaon', level:'CALM' }] }), 'settled',
      'a quiet day drafts a quiet line');
    t.contains(c2.wxDraft_({ rows:[{ mandal:'Jangaon', level:'CALM' }] }), 'No action',
      'and says plainly that nothing is called for');

    /* ---- a service that is down must not invent a sky ---- */
    const env3 = mock.load({ now: '2026-08-24T07:00:00+05:30' });
    const c3 = env3.ctx;
    env3.mkSheet('Users', U, [
      { Phone:'9000000001', Name:'S K Jha', Role:'COLLECTOR', Email:'cdm@mock.example', Active:'TRUE' }
    ]);
    env3.sheets['Users'].rows.slice(1).forEach(r2 => { r2[U.indexOf('Hash')] = c3.hash_('9000000001','1111'); });
    env3.mkSheet('GPs', ['Mandal','GP'], [{ Mandal:'Jangaon', GP:'Konne' }]);
    const cdm3 = env3.post({ kind:'login', u:'9000000001', p:'1111' }).token;
    env3.fetchReply = () => '<html>503 Service Unavailable</html>';
    const bad = env3.get('weather', { token: cdm3 });
    t.eq(bad.ok, false, 'a forecast service that answers with a page is refused');
    t.contains(bad.error, 'did not answer with figures', 'and the district is told why');
  }
};

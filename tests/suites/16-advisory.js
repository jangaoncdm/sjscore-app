/* Advisories — a circular the district puts in front of every officer, and the
   register of who has read it.

   An acknowledgement is RECEIPT, not compliance. It records that the officer
   saw the circular; it is not evidence that he acted on it. And publishing a
   new circular retires the standing one — it never deletes it, and never
   touches the receipts already given. */
'use strict';
const mock = require('../gasmock.js');

const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'];
const b64 = n => Buffer.from('x'.repeat(n)).toString('base64');

function seed(env){
  const c = env.ctx;
  env.mkSheet('Users', U, [
    { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Email:'cdm@mock.example', Active:'TRUE' },
    { Phone:'9000000031', Name:'P. Sec Konne', Role:'PS',   Mandal:'Jangaon', GP:'Konne', Active:'TRUE' },
    { Phone:'9000000033', Name:'D. MPDO',      Role:'MPDO', Mandal:'Jangaon', Active:'TRUE' },
    { Phone:'9000000034', Name:'M. MPO',       Role:'MPO',  Mandal:'Chilpur', Active:'TRUE' },
    { Phone:'9000000035', Name:'X. Retired',   Role:'PS',   Mandal:'Chilpur', GP:'Old', Active:'FALSE' }
  ]);
  env.sheets['Users'].rows.slice(1).forEach(r => {
    const p = c.phone10_(r[0]); if(p) r[U.indexOf('Hash')] = c.hash_(p, '1111');
  });
}
const tok = (env, ph) => env.post({ kind:'login', u:ph, p:'1111' }).token;

module.exports = {
  name: 'advisories (publish, the pop-up, the acknowledgement register)',
  run(t){
    const env = mock.load({ now: '2026-08-23T09:00:00+05:30' });
    const c = env.ctx;
    seed(env);
    const cdm = tok(env, '9000000001');
    const ps  = tok(env, '9000000031');
    const mpdo = tok(env, '9000000033');

    /* ---- nothing standing yet ---- */
    let r = env.get('advisory', { token: ps });
    t.eq(r.ok, true, 'the register answers when nothing is standing');
    t.eq(r.advisory, null, 'and says there is no circular');

    /* ---- only the district may publish ---- */
    r = env.post({ kind:'advPublish', token: ps, title:'Mine', message:'x' });
    t.eq(r.ok, false, 'a Secretary may not publish an advisory');

    /* ---- and a circular must actually say something ---- */
    r = env.post({ kind:'advPublish', token: cdm, title:'', message:'x' });
    t.eq(r.ok, false, 'an advisory without a title is refused');
    r = env.post({ kind:'advPublish', token: cdm, title:'Health advisory', message:'' });
    t.eq(r.ok, false, 'and one without a line of instruction is refused');
    t.contains(r.error, 'reads first', 'because that line is what the officer reads first');

    /* ---- the district publishes ---- */
    const MSG = 'Kindly go through the to do list in the monsoon season and act accordingly';
    r = env.post({ kind:'advPublish', token: cdm, title:'PS MPDO MPO Health Advisory',
                   message: MSG, audience:'ALL',
                   file:{ name:'PS MPDO MPO HEALTH ADVISORY.pdf', b64: b64(4096) } });
    t.eq(r.ok, true, 'the Collector publishes it');
    t.ok(!!r.url, 'and the district holds a link to the document');
    const advId = r.id;
    t.ok(/^ADV-/.test(advId), 'the circular carries an id of its own');
    t.ok(JSON.stringify(env.driveRoot).indexOf('Advisories') >= 0, 'the file is stored under the advisories area in Drive');
    t.ok(env.sheets['Audit'].rows.slice(1).some(x => /ADVISORY PUBLISHED/.test(String(x[1]))),
      'and publishing is on the audit record');

    /* ---- it stands in front of every officer ---- */
    r = env.get('advisory', { token: ps });
    t.ok(!!r.advisory, 'the Secretary is shown the circular');
    t.eq(r.advisory.message, MSG, 'with the district’s own line of instruction');
    t.eq(r.advisory.title, 'PS MPDO MPO Health Advisory', 'and its title');
    t.eq(r.acknowledged, false, 'and he has not acknowledged it yet');
    t.ok(!!r.advisory.url, 'the document is there to open');

    const cdmSees = env.get('advisory', { token: cdm });
    t.eq(cdmSees.totals.due, 3, 'three officers are addressed — not the Collector, not the inactive row');
    t.eq(cdmSees.totals.acknowledged, 0, 'none has acknowledged yet');
    t.eq(cdmSees.totals.pending, 3, 'so three are pending');
    t.ok(!cdmSees.roll.some(x => x.role === 'COLLECTOR'), 'the Collector is not on the list he is reading');
    t.ok(!cdmSees.roll.some(x => x.name === 'X. Retired'), 'nor is an officer whose row is inactive');

    /* ---- an officer acknowledges ---- */
    let a = env.post({ kind:'advAck', token: ps, at:'2026-08-23T09:05:00+05:30' });
    t.eq(a.ok, true, 'the Secretary acknowledges it');
    r = env.get('advisory', { token: ps });
    t.eq(r.acknowledged, true, 'and the app stops putting it in front of him');
    t.ok(String(r.ackAt).length > 10, 'with the moment recorded');

    /* the double tap, and the re-send after the signal returned */
    const n = env.sheets['AdvAck'].rows.length;
    a = env.post({ kind:'advAck', token: ps });
    t.eq(a.ok, true, 'a second acknowledgement is accepted');
    t.eq(a.already, true, 'as a repeat');
    t.eq(env.sheets['AdvAck'].rows.length, n, 'and writes no second receipt against the same officer');

    let reg = env.get('advisory', { token: cdm });
    t.eq(reg.totals.acknowledged, 1, 'the register counts one acknowledgement');
    t.eq(reg.totals.pending, 2, 'and two still pending');
    const line = reg.roll.find(x => x.phone === '9000000031');
    t.eq(line.acknowledged, true, 'the officer who read it is named as having read it');
    t.ok(String(line.ackAt).length > 10, 'with the time against him');
    const waiting = reg.roll.find(x => x.phone === '9000000033');
    t.eq(waiting.acknowledged, false, 'and the officer who has not is named as pending');
    t.ok(reg.coverage.some(x => x.mandal === 'Jangaon' && x.due === 2 && x.acknowledged === 1),
      'the mandal roll-up counts both');

    /* ---- a circular addressed to one role reaches that role alone ---- */
    env.post({ kind:'advAck', token: mpdo });
    r = env.post({ kind:'advPublish', token: cdm, title:'For the MPDOs',
                   message:'Verify the monsoon to-do list mandal by mandal.', audience:'MPDO' });
    t.eq(r.ok, true, 'a second circular is published');
    const advs = env.sheets['Advisories'].rows.slice(1);
    const stIx = env.sheets['Advisories'].rows[0].map(String).indexOf('status');
    t.eq(String(advs[0][stIx]), 'SUPERSEDED', 'the first circular steps down');
    t.eq(String(advs[1][stIx]), 'ACTIVE', 'and the new one stands');
    t.eq(env.sheets['AdvAck'].rows.length, n + 1,
      'the receipts already given are untouched — nothing is destroyed');

    r = env.get('advisory', { token: ps });
    t.eq(r.advisory, null, 'a Secretary is not shown a circular addressed to the MPDOs');
    r = env.get('advisory', { token: mpdo });
    t.ok(!!r.advisory, 'the MPDO is');
    t.eq(r.acknowledged, false, 'and his receipt for the earlier circular does not carry over to this one');
    reg = env.get('advisory', { token: cdm });
    t.eq(reg.totals.due, 1, 'the register counts only the officers this circular addresses');

    /* ---- THE LINE THAT MUST HOLD ---- */
    t.ok(!env.sheets['Notices'] || env.sheets['Notices'].rows.length <= 1,
      'not acknowledging a circular raises no notice');
    t.ok(!env.sheets['Reminders'] || env.sheets['Reminders'].rows.length <= 1,
      'and writes no reminder — an acknowledgement is receipt, never compliance');
  }
};

/* THE LEAVE REGISTER (FeatureLeaveRegister.gs) — ordered 16.10.2026.

   One read, one arithmetic: the allowance is entitlement_'s (the tenant's
   opening figures, 2026's optional holidays cut to three) and the days taken
   are counted as clUsed_ counts them — APPROVED only, an application once
   however many rows carry its id. An application awaiting orders is carried
   as awaiting and never as taken; a refused one is counted and never
   debited. Medical leave answers to no yearly figure, so its balance is null
   and the spell cap travels beside it; the headquarters permission is
   occasions, not days. A spell is split across the months it falls in, and
   the twelve cells add up to the year. The register is the Collector's
   alone, writes nothing, and names an officer no longer on the roll rather
   than dropping his leave. */
'use strict';
const mock = require('../gasmock.js');

const U = ['Phone', 'Name', 'Role', 'Mandal', 'GP', 'Email', 'InitPin', 'Hash', 'Active'];

function world(){
  const env = mock.load({ now:'2026-10-16T10:00:00+05:30', admin:true });
  const c = env.ctx;
  env.mkSheet('Users', U, [
    { Phone:'9000000001', Name:'Sandeep Kumar Jha', Role:'COLLECTOR', Email:'cdm@mock.example', Active:'TRUE' },
    { Phone:'9000000002', Name:'D. P. Officer',    Role:'DPO',  Email:'dpo@mock.example', Active:'TRUE' },
    { Phone:'9000000071', Name:'A. Casual',   Role:'PS',   Mandal:'Devaruppula', GP:'Devaruppula', Active:'TRUE' },
    { Phone:'9000000072', Name:'B. Twin',     Role:'PS',   Mandal:'Devaruppula', GP:'Kadavendi',   Active:'TRUE' },
    { Phone:'9000000073', Name:'C. Medical',  Role:'MPO',  Mandal:'Devaruppula', Active:'TRUE' },
    { Phone:'9000000074', Name:'D. Nothing',  Role:'PS',   Mandal:'Devaruppula', GP:'Kadavendi',   Active:'TRUE' },
    { Phone:'9000000075', Name:'E. Retired',  Role:'PS',   Mandal:'Devaruppula', GP:'Kadavendi',   Active:'FALSE' },
    { Phone:'9000000076', Name:'F. Gone',     Role:'PS',   Mandal:'Devaruppula', GP:'Kadavendi',   Active:'FALSE' },
    { Phone:'9000000071', Name:'A. Casual',   Role:'PS',   Mandal:'Devaruppula', GP:'Second GP',   Active:'TRUE' }
  ]);
  env.sheets['Users'].rows.slice(1).forEach(r => { const p = c.phone10_(r[0]); if(p) r[U.indexOf('Hash')] = c.hash_(p, '1111'); });
  const L = env.eval('L_HEAD');
  const lv = (id, phone, name, role, type, from, to, days, status, more) => Object.assign(
    { id, phone, name, role, mandal:'Devaruppula', type, fromDate:from, toDate:to, days, status, appliedAt:'2026-' + from.slice(5, 7) + '-01T04:00:00.000Z', reason:'Personal' }, more || {});
  env.mkSheet('Leave', L, [
    /* A: two casual spells sanctioned, one awaiting, one refused; one spell crosses a month */
    lv('A1', '9000000071', 'A. Casual', 'PS', 'CL', '2026-08-03', '2026-08-04', 2, 'APPROVED', { decidedAt:'2026-08-02T05:00:00Z' }),
    lv('A2', '9000000071', 'A. Casual', 'PS', 'CL', '2026-08-31', '2026-09-02', 3, 'APPROVED', { decidedAt:'2026-08-30T05:00:00Z' }),
    lv('A3', '9000000071', 'A. Casual', 'PS', 'CL', '2026-10-20', '2026-10-21', 2, 'PENDING'),
    lv('A4', '9000000071', 'A. Casual', 'PS', 'EL', '2026-09-14', '2026-09-18', 5, 'REJECTED', { decidedAt:'2026-09-10T05:00:00Z' }),
    lv('A5', '9000000071', 'A. Casual', 'PS', 'OH', '2026-10-01', '2026-10-01', 1, 'APPROVED', { decidedAt:'2026-09-28T05:00:00Z' }),
    /* B: one application, written twice — a retry racing its original; the Collector's order settled the first */
    lv('B1', '9000000072', 'B. Twin', 'PS', 'CL', '2026-09-07', '2026-09-09', 3, 'APPROVED', { decidedAt:'2026-09-06T05:00:00Z' }),
    lv('B1', '9000000072', 'B. Twin', 'PS', 'CL', '2026-09-07', '2026-09-09', 3, 'PENDING'),
    /* C: medical leave — no yearly figure — and a headquarters permission, which is not leave */
    lv('C1', '9000000073', 'C. Medical', 'MPO', 'ML', '2026-07-01', '2026-07-12', 12, 'APPROVED', { decidedAt:'2026-06-30T05:00:00Z' }),
    lv('C2', '9000000073', 'C. Medical', 'MPO', 'HQ', '2026-08-15', '2026-08-16', 2, 'APPROVED', { decidedAt:'2026-08-14T05:00:00Z' }),
    /* E: retired, but her leave of this year stands on the register */
    lv('E1', '9000000075', 'E. Retired', 'PS', 'CL', '2026-05-04', '2026-05-05', 2, 'APPROVED', { decidedAt:'2026-05-03T05:00:00Z' }),
    /* a row with no id is not an application */
    lv('',   '9000000074', 'D. Nothing', 'PS', 'CL', '2026-06-01', '2026-06-02', 2, 'APPROVED'),
    /* last year is last year */
    lv('A0', '9000000071', 'A. Casual', 'PS', 'CL', '2025-12-29', '2025-12-30', 2, 'APPROVED', { decidedAt:'2025-12-28T05:00:00Z' })
  ]);
  env.mkSheet('Holidays', ['Date', 'Occasion'], []);
  return env;
}
const tok = (env, ph) => env.post({ kind:'login', u:ph, p:'1111' }).token;

module.exports = {
  name: 'the leave register (FeatureLeaveRegister: every officer’s year, the way the sanction reads it)',
  run(t){
    const env = world();
    const cdm = tok(env, '9000000001'), dpo = tok(env, '9000000002');

    /* ---- 1. THE COLLECTOR'S ALONE, and the year is the register's ---- */
    const no = env.get('leaveRegister', { token:dpo, year:'2026' });
    t.eq(no.ok, false, 'a district officer is refused');
    t.ok(/Collector/.test(no.error), 'and told whose it is');
    const r = env.get('leaveRegister', { token:cdm, year:'2026' });
    t.eq(r.ok, true, 'the Collector is answered');
    t.eq(r.year, 2026, 'for the year asked');
    t.eq(env.get('leaveRegister', { token:cdm, year:'abc' }).year, 2026, 'a year that cannot be read is this one');
    t.eq(JSON.stringify(r.years), '[2025,2026]', 'the years the register holds are listed');
    const by = {}; r.officers.forEach(o => by[o.phone] = o);

    /* ---- 2. THE ALLOWANCE IS THE SANCTION'S OWN ---- */
    t.eq(r.entitlement.CL, env.ctx.entitlement_('CL', 2026), 'casual leave allowance is entitlement_ (the pro-rated opening year)');
    t.eq(r.entitlement.OH, 3, 'optional holidays: three for 2026, by the Collector’s order');
    t.eq(r.entitlement.ML, 0, 'medical leave carries no yearly figure');
    t.eq(r.mlSpell, 15, 'and the spell cap travels with the answer');

    /* ---- 3. TAKEN IS APPROVED ONLY; AWAITING IS AWAITING; REFUSED IS NEVER DEBITED ---- */
    const a = by['9000000071'];
    t.ok(!!a, 'A is on the register');
    t.eq(a.types.CL.taken, 5, 'two sanctioned casual spells: 2 + 3');
    t.eq(a.types.CL.awaiting, 2, 'the one awaiting orders is awaiting');
    t.eq(a.types.CL.left, r.entitlement.CL - 5, 'and the balance is allowance less taken, not less awaiting');
    t.eq(a.types.EL.taken, 0, 'the refused earned leave is not taken');
    t.eq(a.refused, 1, 'but it is counted as refused');
    t.eq(a.types.OH.taken, 1, 'the optional holiday is one');
    t.eq(a.types.OH.left, 2, 'two of three left');
    t.eq(a.taken, 6, 'six days taken in all');
    t.ok(!a.clExhausted, 'casual leave not exhausted');
    t.eq(a.spells.filter(s => s.from === '2025-12-29').length, 0, 'last December is not this year');

    /* ---- 4. THE MONTHS: a spell crossing August into September is split, and the row sums to the year ---- */
    t.eq(a.months[7], 3, 'August: 2 days of the first spell and 1 of the second (31 Aug)');
    t.eq(a.months[8], 2, 'September: 1 and 2 Sept of the second spell');
    t.eq(a.months[9], 1, 'October: the optional holiday');
    t.eq(Math.round(a.months.reduce((s, x) => s + x, 0) * 10) / 10, 6, 'the twelve cells add up to the days taken');
    t.eq(a.awaitingMonths[9], 2, 'the awaiting spell sits in its month, apart');

    /* ---- 5. ONE APPLICATION, ONE DEBIT: the twin row is folded to the decided one ---- */
    const b = by['9000000072'];
    t.eq(b.types.CL.taken, 3, 'the twin is counted once');
    t.eq(b.types.CL.awaiting, 0, 'and the leftover PENDING row is not one more awaiting');
    t.eq(b.spells.length, 1, 'one spell on the line');

    /* ---- 6. MEDICAL LEAVE AND THE HEADQUARTERS PERMISSION ---- */
    const c = by['9000000073'];
    t.eq(c.types.ML.taken, 12, 'medical days are counted');
    t.eq(c.types.ML.left, null, 'and have no balance to print');
    t.eq(c.types.HQ.taken, 0, 'the headquarters permission is not days');
    t.eq(c.types.HQ.occasions, 1, 'it is an occasion');
    t.eq(c.months[6], 12, 'twelve days of July on the map');
    t.eq(c.taken, 12, 'and the HQ permission adds nothing to the days taken');

    /* ---- 7. THE ROLL: no leave is a line with a full balance; a retired officer's leave stands; a row with no id is not an application ---- */
    const d = by['9000000074'];
    t.ok(!!d, 'an officer with nothing taken is still on the register');
    t.eq(d.types.CL.taken, 0, 'with nothing taken — the id-less row is not an application');
    t.eq(d.types.CL.left, r.entitlement.CL, 'and the whole allowance left');
    const e = by['9000000075'];
    t.ok(!!e && e.active === false, 'the retired officer is listed, marked inactive');
    t.eq(e.types.CL.taken, 2, 'with the leave she took this year');
    t.ok(!by['9000000076'], 'an inactive officer with no leave this year is not a line');
    t.ok(!by['9000000001'], 'the Collector is not on his own register');
    t.ok(!!by['9000000002'], 'the DPO is');
    t.eq(r.officers.filter(o => o.phone === '9000000071').length, 1, 'a second row of the same number is the same officer, not a second line');
    t.eq(a.role, 'PS', 'and his line carries his first row’s role');

    /* ---- 8. THE TOTALS, and nothing written ---- */
    t.eq(r.totals.officers, r.officers.length, 'totals count the lines');
    t.eq(r.totals.byType.CL.taken, 10, 'district casual leave: 5 + 3 + 2');
    t.eq(r.totals.awaiting, 2, 'two days awaiting in all');
    t.eq(r.totals.refused, 1, 'one refused');
    t.eq(r.truncated, false, 'the whole register fits');
    t.eq(env.sheets['Leave'].rows.length, 13, 'the Leave tab is untouched (the 13 rows planted)');
    t.ok(!env.sheets['Audit'] || env.sheets['Audit'].rows.length <= 1, 'and the reading is not an act on the register');

    /* ---- 9. THE GRAM PALANA REGISTER answers too, on its own figures ---- */
    {
      const g = mock.load({ now:'2026-10-16T10:00:00+05:30', admin:true });
      g.props.TENANT = 'GP';
      g.mkSheet('Users', U, [{ Phone:'9000000001', Name:'Collector', Role:'COLLECTOR', Email:'cdm@mock.example', Active:'TRUE' },
                              { Phone:'9000000081', Name:'G. Palana', Role:'GPO', Mandal:'Devaruppula', GP:'V1', Active:'TRUE' }]);
      g.sheets['Users'].rows.slice(1).forEach(r => { const p = g.ctx.phone10_(r[0]); if(p) r[U.indexOf('Hash')] = g.ctx.hash_(p, '1111'); });
      g.mkSheet('Leave', env.eval('L_HEAD'), []);
      g.mkSheet('Holidays', ['Date', 'Occasion'], []);
      const gr = g.get('leaveRegister', { token:tok(g, '9000000001'), year:'2026' });
      t.eq(gr.ok, true, 'the Gram Palana register answers');
      t.eq(gr.entitlement.CL, 4, 'with its own opening figure (15 x 3/12, taken as 4)');
      t.eq(gr.entitlement.EL, 8, 'and earned leave likewise');
      t.eq(gr.officers.length, 1, 'one officer, nothing taken');
    }

    /* ---- 10. op=diag names the module ---- */
    const dg = env.get('diag', { token:cdm });
    t.ok((dg.features && dg.features.live || []).some(f => f.name === 'leavereg'), 'diag lists leavereg among the live modules');
  }
};

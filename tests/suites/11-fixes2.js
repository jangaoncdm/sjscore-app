/* The 17.08.2026 field-issue register, run against a roll seeded to model
   the Sheet as the 28.07 batch left it. The dry run must write nothing, the
   apply must cure every encoded issue — including the shared number that
   showed a Secretary as "MPDO Lingala Ghanpur" — and a second apply must
   change nothing, PINs included. */
'use strict';
const mock = require('../gasmock.js');

const U = ['Phone', 'Name', 'Role', 'Mandal', 'GP', 'Email', 'InitPin', 'Hash', 'Active'];

function seedRoll(env){
  env.mkSheet('Users', U, [
    { Phone: '9111111101', Name: 'G. Ratna',           Role: 'PS',   Mandal: 'Chilpur',         GP: 'Sreepathipalle, Chinnapendyala', Hash: 'H1',  Active: 'TRUE' },
    /* the roll spells it apart — the 17.08 run's find by village came back NOT FOUND */
    { Phone: '9111111102', Name: 'Old Desai Holder',   Role: 'PS',   Mandal: 'Chilpur',         GP: 'Desai Thanda',                   Hash: 'H2',  Active: 'TRUE' },
    /* 28.07 claimed 9848188052 onto the Peddapahad row without fixing its name */
    { Phone: '9848188052', Name: 'M. Srinivasa Chary', Role: 'PS',   Mandal: 'Jangaon',         GP: 'Peddapahad',                     Hash: 'H3',  Active: 'TRUE' },
    { Phone: '8309450336', Name: 'Wrong Name',         Role: 'PS',   Mandal: 'Jangaon',         GP: 'Pedda Thanda (M)',               Hash: 'H4',  Active: 'TRUE' },
    { Phone: '9777777705', Name: 'Old Venkriyala',     Role: 'PS',   Mandal: 'Devaruppula',     GP: 'Venkriyala',                     Hash: 'H5',  Active: 'TRUE' },
    { Phone: '7680966701', Name: 'L. Mahesh Kumar',    Role: 'PS',   Mandal: 'Lingala Ghanpur', GP: 'Cheeturu',                       Hash: 'H6',  Active: 'TRUE' },
    { Phone: '9111111107', Name: 'D. Rambabu',         Role: 'PS',   Mandal: 'Lingala Ghanpur', GP: 'Jeedikal, Ramachandragudem',     Hash: 'H7',  Active: 'TRUE' },
    { Phone: '9391744487', Name: 'B. Mounika',         Role: 'PS',   Mandal: 'Devaruppula',     GP: 'Ramrajupalle',                   Hash: 'H8',  Active: 'TRUE' },
    { Phone: '9398535516', Name: 'N. Santhoshini',     Role: 'PS',   Mandal: 'Devaruppula',     GP: 'Dharavath Thanda',               Hash: 'H9',  Active: 'TRUE' },
    { Phone: '9866775245', Name: 'Kota Bayyanna',      Role: 'PS',   Mandal: 'Ghanpur (Stn)',   GP: 'Rangarai Gudem',                 Hash: 'H10', Active: 'TRUE' },
    { Phone: '7794936639', Name: 'Shaik Irfan',        Role: 'PS',   Mandal: 'Jangaon',         GP: 'Pedda Thanda (Y)',               Hash: 'H11', Active: 'TRUE' },
    /* the shared number, as the 17.08 run actually found it: on BOTH rows —
       her own sign-in works, but the senior rank wins the folded login */
    { Phone: '9133467909', Name: 'MPDO L. Ghanpur',    Role: 'MPDO', Mandal: 'Lingala Ghanpur', GP: '',                               Hash: 'H12', Active: 'TRUE' },
    { Phone: '9133467909', Name: 'Thandra Swapna',     Role: 'PS',   Mandal: 'Ghanpur (Stn)',   GP: 'Kothapalle',                     Hash: 'H13', Active: 'TRUE' },
    /* the roll's greeting defect: a designation where the name belongs */
    { Phone: '9111111199', Name: 'Collector & District Magistrate', Role: 'COLLECTOR', Mandal: '', GP: '',                            Hash: 'H14', Active: 'TRUE' }
  ]);
}
const rowOf = (env, phone) => {
  const sh = env.sheets['Users'];
  const o = {};
  const hit = sh.rows.slice(1).find(r => env.ctx.phone10_(r[0]) === phone);
  if(hit) U.forEach((h, i) => { o[h] = hit[i] === undefined ? '' : hit[i]; });
  return hit ? o : null;
};
const rowByName = (env, name) => {
  const sh = env.sheets['Users'];
  const hit = sh.rows.slice(1).find(r => String(r[1]) === name);
  const o = {};
  if(hit) U.forEach((h, i) => { o[h] = hit[i] === undefined ? '' : hit[i]; });
  return hit ? o : null;
};

module.exports = {
  name: 'field fixes 17.08 (showFieldFixes2, applyFieldFixes2)',
  run(t){
    const env = mock.load({ admin: true });
    const c = env.ctx;
    seedRoll(env);
    const before = JSON.stringify(env.sheets['Users'].rows);

    /* the dry run writes nothing — not a cell, not an audit line */
    c.showFieldFixes2();
    t.eq(JSON.stringify(env.sheets['Users'].rows), before, 'a dry run changes no cell');
    t.ok(!env.sheets['Audit'], 'and writes nothing to Audit');
    t.ok(env.logs.some(l => /DRY RUN — nothing was written/.test(l)), 'and says so');
    t.ok(env.logs.some(l => /NOT TOUCHED/.test(l) && /9912383087/.test(l)), 'the contested Ramrajupalle number is flagged, not applied');
    t.ok(env.logs.some(l => /Dharavath Thanda/.test(l) && /held twice/.test(l)), 'the Dharavath Thanda contradiction is spelt out');

    /* before the cure, the folded login answers as the MPDO — the defect itself */
    t.eq(c.findByPhone_('9133467909').role, 'MPDO', 'the shared number reads MPDO before the fix');

    c.applyFieldFixes2();
    const rows = env.sheets['Users'].rows;
    t.eq(rows.length - 1, 17, 'three officers registered: Madhavi, Shashi Kumar and Srinivas Reddy — and nobody else');

    /* the Collector's row: name set, nothing else touched */
    const cdm = rowOf(env, '9111111199');
    t.eq(cdm.Name, 'Sandeep Kumar Jha', 'the Collector’s row reads his name, not his designation');
    t.eq(cdm.Hash, 'H14', 'his PIN was never touched');

    /* issue 1 — Madhavi registered, the in-charge released */
    const madhavi = rowOf(env, '9553399695');
    t.ok(!!madhavi, 'Madhavi is on the roll');
    t.eq(madhavi.GP, 'Chinnapendyala', 'holding her own village');
    t.eq(madhavi.Hash, c.hash_('9553399695', c.fix2Pin_('9553399695')), 'with a PIN this batch can reproduce');
    t.eq(rowOf(env, '9111111101').GP, 'Sreepathipalle', 'G. Ratna keeps Sreepathipalle alone');

    /* issue 2 — no village on the roll reads "Desaithanda", so he is
       registered fresh; the row that spells it apart is left alone */
    const desai = rowOf(env, '9493438111');
    t.ok(!!desai && desai.GP === 'Desaithanda', 'Desaithanda answers to 9493438111');
    t.eq(desai.Name, 'Thouti Reddy Shashi Kumar', 'under his own name');
    t.eq(desai.Hash, c.hash_('9493438111', c.fix2Pin_('9493438111')), 'with a PIN this batch can reproduce');
    t.eq(rowOf(env, '9111111102').GP, 'Desai Thanda', 'the differently-spelt row is not touched — it was never proved to be his');

    /* issues 3 & 4 — the Peddapahad tangle undone */
    const praveen = rowOf(env, '9848188052');
    t.eq(praveen.Name, 'Donthi Praveen Kumar', 'Praveen’s row reads his name at last');
    t.eq(praveen.GP, 'Pedda Thanda (M)', 'and his own village');
    t.eq(praveen.Hash, c.hash_('9848188052', c.fix2Pin_('9848188052')), 'his "wrong PIN" is cured with a fresh one');
    const jyothi = rowOf(env, '8309450336');
    t.eq(jyothi.Name, 'Kadavergu Jyothi', 'Jyothi’s row reads her name');
    t.eq(jyothi.GP, 'Peddapahad', 'and her village');
    t.eq(jyothi.Hash, 'H4', 'her PIN was never touched — she never complained of it');

    /* issue 5 — Venkriyala */
    const kavitha = rowOf(env, '9398525190');
    t.ok(!!kavitha && kavitha.GP === 'Venkriyala', 'Venkriyala answers to 9398525190');

    /* issues 6 & 7 */
    t.eq(rowOf(env, '7680966701').Hash, 'H6', 'Mahesh, already correct, is untouched');
    const srinivas = rowOf(env, '8008756396');
    t.ok(!!srinivas && srinivas.GP === 'Ramachandragudem', 'Srinivas Reddy registered on Ramachandragudem');
    t.eq(rowOf(env, '9111111107').GP, 'Jeedikal', 'Rambabu keeps Jeedikal alone');

    /* issue 8 — no absence can be counted against an officer on child-care leave */
    t.eq(String(rowOf(env, '9391744487').Active), 'FALSE', 'Mounika’s row stops counting');

    /* issue 9 */
    t.eq(rowOf(env, '9398535516').GP, 'Dharmagadda Thanda', 'Santhoshini’s register follows where she works');

    /* issues 10 & 11 — wrong PINs, re-keyed */
    t.eq(rowOf(env, '9866775245').Hash, c.hash_('9866775245', c.fix2Pin_('9866775245')), 'Bayyanna’s PIN is fresh');
    t.eq(rowOf(env, '7794936639').Hash, c.hash_('7794936639', c.fix2Pin_('7794936639')), 'Irfan’s PIN is fresh');

    /* issue 12 — the defect the officer actually saw, cured at the login.
       Her number sat on BOTH rows; the senior row is released even though
       her own row already held it, and her working PIN is not touched. */
    const swapna = rowByName(env, 'Thandra Swapna');
    t.eq(c.phone10_(swapna.Phone), '9133467909', 'her PS row keeps the number');
    t.eq(swapna.Hash, 'H13', 'her PIN, which already worked, is not re-keyed');
    const mpdo = rowByName(env, 'MPDO L. Ghanpur');
    t.eq(String(mpdo.Phone), '', 'the MPDO row is released');
    t.eq(String(mpdo.Hash), '', 'and cannot sign in until the office gives it a real number');
    const login = c.findByPhone_('9133467909');
    t.eq(login.role, 'PS', 'signing in on her number is now the Secretary');
    t.eq(login.name, 'Thandra Swapna', 'under her own name');
    t.eq(login.gp, 'Kothapalle', 'on her own village');

    /* Rule 7 — every applied change is on the Audit register, PINs excepted */
    t.ok(!!env.sheets['Audit'], 'the Audit register exists');
    const audit = env.sheets['Audit'].rows.map(r => r.join(' | ')).join('\n');
    t.ok(env.sheets['Audit'].rows.length >= 10, 'every change wrote a line');
    t.ok(audit.indexOf('FIELD FIX 17.08.2026') >= 0, 'under the batch’s own name');
    [c.fix2Pin_('9848188052'), c.fix2Pin_('9866775245'), c.fix2Pin_('9133467909')].forEach(pin =>
      t.ok(audit.indexOf(pin) < 0, 'no PIN value ever reaches the Audit register'));

    /* Rule 8 — the batch run twice changes nothing, PINs included */
    const after = JSON.stringify(env.sheets['Users'].rows);
    const auditCount = env.sheets['Audit'].rows.length;
    c.applyFieldFixes2();
    t.eq(JSON.stringify(env.sheets['Users'].rows), after, 'a second apply changes no cell — the batch-dated PINs hold still');
    t.eq(env.sheets['Audit'].rows.length, auditCount, 'and writes no second audit line');
    t.ok(env.logs.some(l => /OK ALREADY: Issue 4/.test(l)), 'the second run reads OK ALREADY');
  }
};

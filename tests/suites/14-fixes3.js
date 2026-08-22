/* The 22.08.2026 field-issue register.

   The roll is seeded to model what the nineteen reports describe: numbers
   sitting on two rows (which is what "showing wrong PIN" and "wrong ps name
   after attendance" actually are), villages held in charge by a neighbour,
   and six officers still on the village they are being deputed away from.

   What must hold:
     - the dry run writes nothing;
     - the PIN the log prints is the PIN that will actually open the app —
       the whole point of claimPhone, and the thing a plain resetPin misses;
     - a row belonging to another officer is REPORTED, never rewritten;
     - a second apply changes nothing, PINs included. */
'use strict';
const mock = require('../gasmock.js');

const U = ['Phone', 'Name', 'Role', 'Mandal', 'GP', 'Email', 'InitPin', 'Hash', 'Active'];

function seedRoll(env){
  env.mkSheet('Users', U, [
    /* 1 — Chinnapendyala is held IN CHARGE by G. Ratna while Madhavi is away.
       Madhavi's own number is not on the roll at all. */
    { Phone: '9111111101', Name: 'G. Ratna',            Role: 'PS',   Mandal: 'Chilpur',         GP: 'Sreepathipalle, Chinnapendyala', Hash: 'H1',  Active: 'TRUE' },

    /* 3 — her number sits on a SENIOR row, which is why the app greets her
       with somebody else's name and village after she marks. */
    { Phone: '8309450336', Name: 'MPO Jangaon',         Role: 'MPO',  Mandal: 'Jangaon',         GP: '',                               Hash: 'HM',  Active: 'TRUE' },
    { Phone: '',           Name: 'Kadavergu Jyothi',    Role: 'PS',   Mandal: 'Jangaon',         GP: 'Peddapahad',                     Hash: '',    Active: 'TRUE' },

    /* 4 — the "wrong PIN" that a plain reset does not cure: his number is on
       a stale row ABOVE his own, and the fold takes its PIN from the first
       row holding one. */
    { Phone: '9848188052', Name: 'D. Praveen Kumar',    Role: 'PS',   Mandal: 'Jangaon',         GP: 'Old Charge',                     Hash: 'STALE', Active: 'TRUE' },
    { Phone: '9848188052', Name: 'Donthi Praveen Kumar',Role: 'PS',   Mandal: 'Jangaon',         GP: 'Pedda Thanda (M)',               Hash: 'H4',  Active: 'TRUE' },

    /* 5 — Venkriyala carries an old number */
    { Phone: '9777777705', Name: 'Gouraipally Kavitha', Role: 'PS',   Mandal: 'Jangaon',         GP: 'Venkriyala',                     Hash: 'H5',  Active: 'TRUE' },

    /* 6 & 7 — the swap, both officers still on their old villages */
    { Phone: '7680966701', Name: 'L Mahesh Kumar',      Role: 'PS',   Mandal: 'Lingala Ghanpur', GP: 'Cheeturu',                       Hash: 'H6',  Active: 'TRUE' },
    { Phone: '8008756396', Name: 'V Srinivas Reddy',    Role: 'PS',   Mandal: 'Lingala Ghanpur', GP: 'Ramachandragudem',               Hash: 'H7',  Active: 'TRUE' },

    /* 8, 9, 10 */
    { Phone: '9398535516', Name: 'N santhoshini',       Role: 'PS',   Mandal: 'Devaruppula',     GP: 'Dharavath Thanda',               Hash: 'H8',  Active: 'TRUE' },
    { Phone: '9866775245', Name: 'Kota Bayyanna',       Role: 'PS',   Mandal: 'Ghanpur (Stn)',   GP: 'Rangarai Gudem',                 Hash: 'H9',  Active: 'TRUE' },
    { Phone: '7794936639', Name: 'Shaik Irfan',         Role: 'PS',   Mandal: 'Jangaon',         GP: 'Pedda Thanda (Y)',               Hash: 'H10', Active: 'TRUE' },

    /* 11 — the fold, exactly as reported: senior row first */
    { Phone: '9133467909', Name: 'MPDO L. Ghanpur',     Role: 'MPDO', Mandal: 'Lingala Ghanpur', GP: '',                               Hash: 'H11', Active: 'TRUE' },
    { Phone: '9133467909', Name: 'Thandra Swapna',      Role: 'PS',   Mandal: 'Ghanpur (Stn)',   GP: 'Kothapalle',                     Hash: 'H12', Active: 'TRUE' },

    /* 14–19 — each still on the village he is being deputed away from */
    { Phone: '7093155480', Name: 'B Sampath',           Role: 'PS',   Mandal: 'Raghunathpalle',  GP: 'Vepalagadda Thanda',             Hash: 'H13', Active: 'TRUE' },
    { Phone: '9666461661', Name: 'Gadepaka Kranthi',    Role: 'PS',   Mandal: 'Raghunathpalle',  GP: 'Some Old Village',               Hash: 'H14', Active: 'TRUE' },
    { Phone: '8106032343', Name: 'Rondla Srinivas Reddy',Role:'PS',   Mandal: 'Raghunathpalle',  GP: 'Shivaji Nagar',                  Hash: 'H15', Active: 'TRUE' },
    { Phone: '8978394484', Name: 'Anumula Narmada',     Role: 'PS',   Mandal: 'Devaruppula',     GP: 'Dharmapuram',                    Hash: 'H16', Active: 'TRUE' },
    { Phone: '9550923619', Name: 'Pogaku Ramajyothi',   Role: 'PS',   Mandal: 'Devaruppula',     GP: 'Appireddypally',                 Hash: 'H17', Active: 'TRUE' },
    { Phone: '9959972132', Name: 'Gummadi Rajula Manjula', Role:'PS', Mandal: 'Zaffergadh',      GP: 'Theegaram',                      Hash: 'H18', Active: 'TRUE' }
  ]);
  env.mkSheet('GPs', ['Mandal', 'GP'], [
    { Mandal: 'Chilpur',        GP: 'Chinnapendyala' },
    { Mandal: 'Jangaon',        GP: 'Peddapahad' },
    { Mandal: 'Jangaon',        GP: 'Pedda Thanda (M)' },
    { Mandal: 'Raghunathpalle', GP: 'Vepalagadda Thanda' },
    { Mandal: 'Raghunathpalle', GP: 'Shivaji Nagar' },
    { Mandal: 'Devaruppula',    GP: 'Dharmapuram' }
  ]);
}

const rowsFor = (env, phone) => env.sheets['Users'].rows.slice(1)
  .filter(r => env.ctx.phone10_(r[0]) === phone);
const byName = (env, name) => {
  const hit = env.sheets['Users'].rows.slice(1).find(r => String(r[1]) === name);
  if(!hit) return null;
  const o = {}; U.forEach((h, i) => { o[h] = hit[i] === undefined ? '' : hit[i]; });
  return o;
};

module.exports = {
  name: 'field fixes 22.08 (showFieldFixes3, applyFieldFixes3)',
  run(t){
    const env = mock.load({ admin: true });
    const c = env.ctx;
    seedRoll(env);
    const before = JSON.stringify(env.sheets['Users'].rows);

    /* ---- the dry run ---- */
    c.showFieldFixes3();
    t.eq(JSON.stringify(env.sheets['Users'].rows), before, 'a dry run changes no cell');
    t.ok(!env.sheets['Audit'], 'and writes nothing to Audit');
    t.ok(env.logs.some(l => /DRY RUN — nothing was written/.test(l)), 'and says so plainly');
    t.ok(env.logs.some(l => /applyFieldFixes3\(\)/.test(l)), 'and names the doer to run next');
    t.ok(env.logs.some(l => /Shivaji Nagar/.test(l) && /Who holds/.test(l)),
      'the vacancy each deputation leaves is raised, not filled by guesswork');

    /* the two defects, before the cure — the fold answering as the senior */
    t.eq(c.findByPhone_('9133467909').role, 'MPDO', 'Swapna’s number reads MPDO before the fix');
    t.eq(c.findByPhone_('8309450336').name, 'MPO Jangaon', 'Jyothi’s number reads the MPO before the fix');
    t.eq(c.findByPhone_('9848188052').hash, 'STALE',
      'and Praveen’s login takes its PIN from the stale row above his own — which is why a plain reset never cured it');

    /* ---- the apply ---- */
    env.logs.length = 0;
    c.applyFieldFixes3();

    /* 1 — the village is held in charge by another officer. Her row must be
       left alone and the office told; Madhavi is registered on her own number. */
    const ratna = byName(env, 'G. Ratna');
    t.ok(ratna && ratna.Hash === 'H1', 'the officer holding Chinnapendyala in charge is not touched');
    t.eq(ratna.Phone, '9111111101', 'and keeps her own number');
    t.ok(env.logs.some(l => /CONFLICT/.test(l) && /G\. Ratna/.test(l)),
      'the in-charge row is REPORTED instead of being rewritten into somebody else');
    t.eq(rowsFor(env, '9553399695').length, 1, 'Penthala Madhavi is registered on her own number');

    /* 3 — the fold cured: her PS row holds the number, the MPO row is released */
    t.eq(rowsFor(env, '8309450336').length, 1, 'Jyothi’s number now sits on ONE row');
    const jyothi = c.findByPhone_('8309450336');
    t.eq(jyothi.name, 'Kadavergu Jyothi', 'and the app will greet her by her own name');
    t.eq(jyothi.role, 'PS', 'as a Secretary, not as the MPO');
    t.eq(jyothi.gp, 'Peddapahad', 'holding her own village');
    const mpo = byName(env, 'MPO Jangaon');
    t.eq(mpo.Phone, '', 'the MPO row is left blank — it needs a real number from the office');
    t.eq(mpo.Hash, '', 'and its PIN is released with it');
    t.ok(env.logs.some(l => /released 8309450336/.test(l)), 'and the release is stated in the log');

    /* 4 — THE ASSERTION THIS BATCH EXISTS FOR: the PIN printed is the PIN
       that opens the app. A resetPin alone would have left STALE in charge. */
    t.eq(rowsFor(env, '9848188052').length, 1, 'Praveen’s number is on one row only');
    const praveenPin = c.batchPin_('9848188052', c.FIX3_BATCH);
    t.eq(c.findByPhone_('9848188052').hash, c.hash_('9848188052', praveenPin),
      'and the PIN the log printed is the one the server will accept');
    t.eq(c.findByPhone_('9848188052').gp, 'Pedda Thanda (M)', 'on his own village');
    t.ok(env.logs.some(l => new RegExp(praveenPin).test(l)), 'the PIN is printed once, in the log');

    /* 5 — the number that was "not registered" */
    t.eq(c.findByPhone_('9398525190').gp, 'Venkriyala', 'Kavitha’s number now opens Venkriyala');
    t.eq(rowsFor(env, '9777777705').length, 0, 'and the old number is gone from that row');

    /* 6 & 7 — the swap */
    t.eq(c.findByPhone_('7680966701').gp, 'Cheeturu', 'Mahesh Kumar holds Cheeturu');
    t.eq(c.findByPhone_('8008756396').gp, 'Ramachandragudem', 'Srinivas Reddy holds Ramachandragudem');

    /* 8 — the officer says where she works; the register follows */
    t.eq(c.findByPhone_('9398535516').gp, 'Dharmagadda Thanda', 'Santhoshini is mapped to the village she works');

    /* 11 — the fold that started it all */
    const swapna = c.findByPhone_('9133467909');
    t.eq(swapna.role, 'PS', 'Swapna signs in as a Secretary now');
    t.eq(swapna.name, 'Thandra Swapna', 'under her own name');
    t.eq(byName(env, 'MPDO L. Ghanpur').Phone, '', 'and the MPDO row is left needing a number');

    /* 14 & 18 — the paired deputation, in the order that keeps them apart */
    t.eq(c.findByPhone_('7093155480').gp, 'Rameshwaram', 'Sampath moves to Rameshwaram');
    t.eq(c.findByPhone_('7093155480').mandal, 'Kodakandla', 'and to Kodakandla mandal');
    t.eq(c.findByPhone_('9666461661').gp, 'Vepalagadda Thanda', 'Kranthi takes the charge he left');
    t.eq(rowsFor(env, '9666461661').length, 1, 'and the two of them are not folded onto one row');

    /* A DEPUTATION MUST NOT COST A MAN HIS LOGIN. Rows 14–19 asked to be
       re-mapped, not re-keyed; every one of them signs in today. Their PINs
       must be exactly as they were, or the district locks out six working
       officers and waits on a circular to let them back in. */
    t.eq(byName(env, 'B. Sampath').Hash, 'H13', 'Sampath keeps the PIN he signs in with');
    t.eq(byName(env, 'Rondla Srinivas Reddy').Hash, 'H15', 'and so does Rondla Srinivas Reddy');
    t.eq(byName(env, 'Anumula Narmada').Hash, 'H16', 'and Narmada');
    t.eq(byName(env, 'Gummadi Rajula Manjula').Hash, 'H18', 'and Manjula');
    t.eq(byName(env, 'Thandra Swapna').Hash, 'H12',
      'and Swapna, whose complaint was the folded login and never her PIN');
    t.eq(byName(env, 'N. Santhoshini').Hash, 'H8', 'and Santhoshini, who asked only to be re-mapped');

    /* 15–17, 19 — the remaining deputations */
    t.eq(c.findByPhone_('8106032343').gp, 'Palakurthy', 'Rondla Srinivas Reddy moves to Palakurthy');
    t.eq(c.findByPhone_('8978394484').gp, 'Fatheshapur', 'Narmada moves to Fatheshapur, not back to Dharmapuram');
    t.eq(c.findByPhone_('8978394484').mandal, 'Raghunathpalle', 'and into Raghunathpalle');
    t.eq(c.findByPhone_('9550923619').gp, 'Mallampally', 'Ramajyothi moves to Mallampally');
    t.eq(c.findByPhone_('9959972132').gp, 'Iravennu', 'Manjula moves to Iravennu');

    /* every change is on the record */
    t.ok(env.sheets['Audit'], 'the apply writes to Audit');
    t.ok(env.sheets['Audit'].rows.slice(1).some(r => /FIELD FIX 22\.08\.2026/.test(String(r[1]))),
      'under this batch’s own name');
    t.ok(!env.sheets['Audit'].rows.slice(1).some(r => new RegExp(praveenPin).test(String(r[3]))),
      'and no PIN is ever written to Audit');

    /* ---- idempotence: the nervous second press ---- */
    const after = JSON.stringify(env.sheets['Users'].rows);
    const auditLen = env.sheets['Audit'].rows.length;
    env.logs.length = 0;
    c.applyFieldFixes3();
    t.eq(JSON.stringify(env.sheets['Users'].rows), after, 'a second apply changes not one cell');
    t.eq(env.sheets['Audit'].rows.length, auditLen, 'and writes no second audit line');
    t.eq(c.findByPhone_('9848188052').hash, c.hash_('9848188052', praveenPin),
      'the PIN already circulated still stands after the re-run');
    t.ok(env.logs.some(l => /OK ALREADY/.test(l)), 'and it says everything was already so');

    /* ---- the diagnostics ---- */
    env.logs.length = 0;
    c.whyCannotSignIn('9848188052');
    t.ok(env.logs.some(l => /One row carries it/.test(l)), 'whyCannotSignIn reports a healthy number as healthy');
    env.logs.length = 0;
    c.whyCannotSignIn('9000000000');
    t.ok(env.logs.some(l => /NOT ON THE ROLL/.test(l)), 'and an unregistered one as unregistered');

    env.logs.length = 0;
    c.gpSpellCheck();
    t.ok(env.logs.some(l => /NOT ON THE GPs TAB/.test(l) && /Rameshwaram/.test(l)),
      'gpSpellCheck names a village a Secretary holds that the GPs tab has never heard of');
    t.ok(env.logs.some(l => /Shivaji Nagar/.test(l)),
      'and names the village left unheld by the deputation');

    /* THE STALE LINE, PROVED GONE. TO_REMAP carried Narmada the other way —
       into Dharmapuram — from an older register. Pressing the older job must
       no longer be able to undo the deputation of 22.08. */
    env.logs.length = 0;
    c.remapSecretaries();
    t.eq(c.findByPhone_('8978394484').gp, 'Fatheshapur',
      'running the older remap job cannot pull Narmada back to Dharmapuram');
  }
};

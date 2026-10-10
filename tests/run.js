/* ============================================================================
   npm test — the whole suite, against the real backend files.

   Order of business:
   1. backend/Code.gs and backend/Admin.gs must PARSE. A file that will not
      parse deploys as a server that answers nothing, so this check comes
      before any behaviour is judged.
   2. Every suite in tests/suites/ runs, each against a fresh mocked world
      that loads the backend from disk (see gasmock.js).

   Exit code 0 only when every assertion in every suite held. The GitHub
   Action gates the deploy on exactly this command; nothing untested ships.
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BACKEND = path.join(__dirname, '..', 'backend');
const SUITES = path.join(__dirname, 'suites');

/* ---- 1. the backend must parse ---- */
/* EVERY .gs FILE, not a list of two. The gate named Code.gs and Admin.gs
   while the project had grown three more, so a feature module with a syntax
   error in it got past the one check whose whole job is to catch that — and
   a project with one file that does not parse deploys as a server that
   answers nothing at all. */
for(const f of fs.readdirSync(BACKEND).filter(f => /\.gs$/.test(f)).sort()){
  const src = fs.readFileSync(path.join(BACKEND, f), 'utf8');
  try{ new vm.Script(src, { filename: f }); }
  catch(err){
    console.error('✗ ' + f + ' DOES NOT PARSE — nothing else was run.\n  ' + err.message);
    process.exit(1);
  }
  console.log('✓ ' + f + ' parses');
}

/* ---- 1b. and no top-level code may rely on another file being parsed ---- */
/* Parsing is not the whole of it: the files share one global scope but are
   parsed in turn, so a top-level initialiser reading another file's const is
   a ReferenceError decided by the order the project happens to list its
   files. Static, so the mock cannot hide it. */
const scope = require('./scope.js').audit();
if(scope.faults.length){
  console.error('✗ FILE SCOPE — nothing else was run.');
  scope.faults.forEach(x => console.error('  ' + x.file + ':' + x.line + '  ' + x.name +
    ' is a top-level const/let in ' + x.from));
  process.exit(1);
}
console.log('✓ file scope: nothing read before its file is parsed');

/* ---- 2. the suites ---- */
function makeT(suiteName){
  const t = { count: 0, failures: [] };
  const fail = msg => { t.failures.push(suiteName + ': ' + msg); };
  t.ok = (cond, msg) => { t.count++; if(!cond) fail(msg || 'expected truthy'); };
  t.eq = (got, want, msg) => {
    t.count++;
    if(got !== want) fail((msg || 'values differ') + ' — got ' + JSON.stringify(got) + ', wanted ' + JSON.stringify(want));
  };
  t.contains = (hay, needle, msg) => {
    t.count++;
    if(String(hay).indexOf(needle) < 0) fail((msg || 'missing substring') + ' — ' + JSON.stringify(needle) + ' not in ' + JSON.stringify(String(hay).slice(0, 160)));
  };
  /* A PIN IS A FOUR-DIGIT NUMBER AND AN AUDIT ROW IS FULL OF TEN-DIGIT ONES.
     Six assertions in these suites proved that a PIN never reaches the Audit
     register by searching for it as a plain substring — and the salt is
     MINTED on a register that has none, so every one of those PINs is random
     per run. Fourteen phone numbers carry seventy-five distinct four-digit
     windows, so one run in forty found the PIN sitting inside somebody's
     mobile number and reported that the register had leaked it. It had not.
     A pre-flight that cries wolf is the one check a district stops reading,
     and a suite is no different.

     So the needle must be a TOKEN and not a substring: delimited by a
     non-digit at each end, which is how a leak would ever actually be
     written ('PIN reset to 1738', 'pin:1738'). Nothing can hide inside a
     longer run of digits, so the assertion is strictly stronger about what
     it was always trying to say. */
  t.noToken = (hay, needle, msg) => {
    t.count++;
    /* AND THE TIMESTAMP THE REGISTER WRITES ITSELF IS NOT A PLACE A PIN CAN
       BE LEAKED. Every Audit row opens with an ISO instant, and the year in
       it is a four-digit token with a hyphen after it — so a minted PIN of
       exactly 2026 would be reported as a leak, which is the same false
       accusation one order of magnitude rarer. Only the instant is blanked,
       never the cells around it, so a PIN of 2026 leaked into a detail cell
       is still caught. The district's own dd.mm.yyyy goes with it, because
       the batch's name IS a date — 'FIELD FIX 17.08.2026' — and its year is
       a token by the same arithmetic. */
    const s = String(hay)
      .replace(/\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?/g, '<at>')
      .replace(/\d{2}\.\d{2}\.\d{4}/g, '<dmy>');
    const d = String(needle);
    /* the needle is a PIN — digits only — so there is nothing to escape, and
       a regex metacharacter in it is a bug in the caller rather than a thing
       to quietly swallow */
    if(!/^[0-9]+$/.test(d)) { fail((msg || 'noToken') + ' — the needle is not a number: ' + JSON.stringify(d)); return; }
    const re = new RegExp('(^|[^0-9])' + d + '([^0-9]|$)');
    const hit = re.exec(s);
    if(hit) fail((msg || 'the value is there') + ' — ' + JSON.stringify(d) + ' appears in ' +
      JSON.stringify(s.slice(Math.max(0, hit.index - 60), hit.index + 60)));
  };
  return t;
}

const files = fs.readdirSync(SUITES).filter(f => f.endsWith('.js')).sort();
let total = 0;
const allFailures = [];

for(const f of files){
  const suite = require(path.join(SUITES, f));
  const t = makeT(suite.name || f);
  try{ suite.run(t, () => {}); }
  catch(err){ t.failures.push((suite.name || f) + ' THREW: ' + (err && err.stack || err)); }
  total += t.count;
  allFailures.push(...t.failures);
  const mark = t.failures.length ? '✗' : '✓';
  console.log(mark + ' ' + (suite.name || f).padEnd(46) + t.count + ' assertion(s)' +
    (t.failures.length ? ' — ' + t.failures.length + ' FAILED' : ''));
}

console.log('\n' + files.length + ' suite(s), ' + total + ' assertion(s), ' + allFailures.length + ' failure(s).');
if(allFailures.length){
  console.error('\nWhat failed:');
  allFailures.forEach(m => console.error('  ✗ ' + m));
  process.exit(1);
}

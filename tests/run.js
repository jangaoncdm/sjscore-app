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
for(const f of ['Code.gs', 'Admin.gs']){
  const src = fs.readFileSync(path.join(BACKEND, f), 'utf8');
  try{ new vm.Script(src, { filename: f }); }
  catch(err){
    console.error('✗ ' + f + ' DOES NOT PARSE — nothing else was run.\n  ' + err.message);
    process.exit(1);
  }
  console.log('✓ ' + f + ' parses');
}

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

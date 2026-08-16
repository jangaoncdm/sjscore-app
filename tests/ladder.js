/* node tests/ladder — the notice-ladder suite alone, with its detail.
   Same assertions as npm test runs; this entry just narrates each step,
   because the ladder is the part of the register that accuses people and
   deserves to be read, not only counted. */
'use strict';

const path = require('path');
const suite = require(path.join(__dirname, 'suites', '05-ladder.js'));

const t = { count: 0, failures: [] };
t.ok = (cond, msg) => { t.count++; if(!cond) t.failures.push(msg || 'expected truthy'); };
t.eq = (got, want, msg) => { t.count++; if(got !== want) t.failures.push((msg || 'values differ') + ' — got ' + JSON.stringify(got) + ', wanted ' + JSON.stringify(want)); };
t.contains = (hay, needle, msg) => { t.count++; if(String(hay).indexOf(needle) < 0) t.failures.push((msg || 'missing substring') + ': ' + JSON.stringify(needle)); };

suite.run(t, line => console.log('  ' + line));

console.log('\n' + suite.name + ': ' + t.count + ' assertion(s), ' + t.failures.length + ' failure(s).');
if(t.failures.length){
  t.failures.forEach(m => console.error('  ✗ ' + m));
  process.exit(1);
}

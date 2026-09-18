/* EVERY CHECK THIS PROJECT HAS, IN ONE RUN, WITH WHAT IT PRODUCED.

   `npm test` proves the backend. It does not prove that the console lays out,
   that the phone is still the phone, that the document registers drive, that
   the Admin buttons press, or that the QR on a printed card scans. Those are
   five more passes, each with its own harness and its own screenshots, and
   until now the only way to know they were all green was to remember to run
   five commands.

   This runs all of them, in order, and writes Info/TEST-REPORT.md: what was
   run, what it asserted, how long it took, and every screenshot it left
   behind. A pass that is skipped is reported as SKIPPED with the reason — a
   report that quietly omits what it could not run is worse than no report.

   Playwright and jsQR are not dependencies of this project (the render passes
   have always said so). Without them the browser passes are skipped and named,
   and the backend suites still run:
       npm i playwright jsqr qrcode --no-save

   Usage: node tests/report.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'Info');

const have = m => { try{ require.resolve(m); return true; }catch(e){ return false; } };
const BROWSER = have('playwright');
const DECODER = have('jsqr');

const PASSES = [
  { name: 'The backend suites',
    what: 'Every rule the register runs on, against backend/Code.gs and backend/Admin.gs loaded from disk. ' +
          'The suites hold no copy of the logic, so a test cannot pass against a stale duplicate.',
    cmd: ['tests/run.js'], needs: null, shots: null },
  { name: 'The notice ladder, in detail',
    what: 'One suite printed with its reasoning: who is reminded, who is served, who is debited, and who is left alone.',
    cmd: ['tests/ladder.js'], needs: null, shots: null },
  { name: 'The QR codes',
    what: 'Every square this project prints, decoded by jsQR — an independent decoder — at three print sizes and ' +
          'turned a quarter round, and compared module for module against an independent encoder.',
    cmd: ['tests/qr-check.js'], needs: DECODER ? null : 'jsqr is not installed', shots: null },
  { name: 'The field app, rendered',
    what: 'Both registers driven in a real browser at 2560, 1500 and 390 px, on every screen an officer reaches. ' +
          'Fails on sideways scroll, on a script error, on a desktop rule leaking onto the phone, and on a monitor ' +
          'carrying margin instead of content.',
    cmd: ['tests/render-app.js'], needs: BROWSER ? null : 'playwright is not installed', shots: 'app-render' },
  { name: 'The console, rendered',
    what: 'Seven views at three widths in both themes, plus a live switch between the two registers and back. ' +
          'Fails on sideways scroll, on cards in one row differing in height, and on a hardcoded colour in a chart.',
    cmd: ['tests/render-console.js'], needs: BROWSER ? null : 'playwright is not installed', shots: 'console-render' },
  { name: 'The document registers, driven',
    what: 'The real field app and the real console driven against payloads the real backend produced: the circular, ' +
          'the plan, the filing schedule, the receipts, and what each of them refuses.',
    cmd: ['tests/render-docs.js'], needs: BROWSER ? null : 'playwright is not installed', shots: 'docs-render' },
  { name: 'The Admin view, pressed',
    what: 'The console’s Admin screen with its buttons actually pressed, and the gate that keeps everyone but the ' +
          'Collector out of it.',
    cmd: ['tests/render-admin.js'], needs: BROWSER ? null : 'playwright is not installed', shots: null }
];

/* the fixtures the browser passes read, rebuilt from the real backend first */
const FIXTURES = [
  { name: 'dashboard and schedule payloads', cmd: ['tests/fixture-dashboard.js'] },
  { name: 'the document payloads',           cmd: ['tests/fixture-docs.js'] }
];

function run(cmd){
  const t0 = Date.now();
  try{
    const out = execFileSync(process.execPath, cmd, { cwd: ROOT, encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, out: out, ms: Date.now() - t0 };
  }catch(e){
    return { ok: false, out: String(e.stdout || '') + String(e.stderr || ''), ms: Date.now() - t0 };
  }
}

/* what a pass actually asserted, pulled from its own output rather than
   retyped here — a count in this file could drift from the truth */
function tally(out){
  const m = [];
  let x;
  if((x = out.match(/(\d+)\s+suite\(s\),\s+([\d,]+)\s+assertion\(s\),\s+(\d+)\s+failure/)))
    m.push(x[1] + ' suites, ' + x[2] + ' assertions, ' + x[3] + ' failures');
  if((x = out.match(/(\d+)\/(\d+)\s+checks passed/))) m.push(x[1] + ' of ' + x[2] + ' checks passed');
  if((x = out.match(/(\d+)\s+passed,\s+(\d+)\s+failed/))) m.push(x[1] + ' passed, ' + x[2] + ' failed');
  if((x = out.match(/(\d+)\s+assertion\(s\),\s+(\d+)\s+failure\(s\)/)) && !m.length)
    m.push(x[1] + ' assertions, ' + x[2] + ' failures');
  if(/No overflow, no layout or script problems/.test(out)) m.push('no layout or script problems');
  if(/No layout, overflow, colour or script problems found/.test(out)) m.push('no layout, overflow or colour problems');
  return m.join(' · ');
}

(function main(){
  fs.mkdirSync(OUT, { recursive: true });
  console.log('Rebuilding the fixtures from the real backend\n');
  const fixLines = [];
  FIXTURES.forEach(f => {
    const r = run(f.cmd);
    console.log((r.ok ? '  ok    ' : '  FAIL  ') + f.name);
    fixLines.push('| ' + f.name + ' | ' + (r.ok ? 'built' : '**failed**') + ' |');
    if(!r.ok) console.log(r.out.split('\n').slice(-6).join('\n'));
  });

  console.log('\nRunning every pass\n');
  const results = [];
  PASSES.forEach(p => {
    if(p.needs){
      console.log('  SKIP  ' + p.name + '  (' + p.needs + ')');
      results.push(Object.assign({}, p, { skipped: true, ms: 0, out: '' }));
      return;
    }
    const r = run(p.cmd);
    console.log((r.ok ? '  PASS  ' : '  FAIL  ') + p.name.padEnd(34) +
      (tally(r.out) || '') + '  (' + (r.ms / 1000).toFixed(1) + 's)');
    if(!r.ok) console.log(r.out.split('\n').filter(l => /✗|FAIL|Error/.test(l)).slice(0, 8).map(l => '        ' + l).join('\n'));
    results.push(Object.assign({}, p, { skipped: false, ok: r.ok, out: r.out, ms: r.ms }));
  });

  /* ---- the report ---- */
  const L = [];
  const ran = results.filter(r => !r.skipped);
  const failed = ran.filter(r => !r.ok);
  L.push('# Every check, one run');
  L.push('');
  L.push('Run ' + new Date().toISOString().slice(0, 16).replace('T', ' ') +
         ' · ' + ran.length + ' of ' + results.length + ' passes executed' +
         (failed.length ? ', **' + failed.length + ' failed**' : ', all green') + '.');
  L.push('');
  L.push('Produced by `node tests/report.js`. Nothing below is retyped: every figure is read back');
  L.push('out of the pass that produced it, so this file cannot drift from what actually ran.');
  L.push('');
  L.push('## Fixtures');
  L.push('');
  L.push('The browser passes read payloads the **real backend** produced under the Apps Script mock,');
  L.push('so what is screenshotted is each page reading the district’s own response shape — not a stub');
  L.push('written to agree with it.');
  L.push('');
  L.push('| | |');
  L.push('|---|---|');
  fixLines.forEach(l => L.push(l));
  L.push('');
  L.push('## The passes');
  L.push('');
  L.push('| | Pass | What it asserted | Took |');
  L.push('|---|---|---|---|');
  results.forEach(r => {
    const mark = r.skipped ? '–' : (r.ok ? '✓' : '✗');
    const said = r.skipped ? '_skipped: ' + r.needs + '_' : (tally(r.out) || 'ran');
    L.push('| ' + mark + ' | ' + r.name + ' | ' + said + ' | ' + (r.skipped ? '' : (r.ms / 1000).toFixed(1) + 's') + ' |');
  });
  L.push('');
  results.forEach(r => {
    L.push('### ' + r.name);
    L.push('');
    L.push(r.what);
    L.push('');
    if(r.skipped){ L.push('**Skipped** — ' + r.needs + '.'); L.push(''); return; }
    L.push('```');
    const lines = r.out.split('\n').filter(l => l.trim());
    L.push(lines.slice(-Math.min(lines.length, 28)).join('\n'));
    L.push('```');
    L.push('');
    if(r.shots){
      const dir = path.join(OUT, r.shots);
      let files = [];
      try{ files = fs.readdirSync(dir).filter(f => /\.png$/.test(f)).sort(); }catch(e){}
      if(files.length){
        L.push('**' + files.length + ' screenshots** in `Info/' + r.shots + '/`:');
        L.push('');
        files.forEach(f => L.push('- [' + f + '](' + r.shots + '/' + f + ')'));
        L.push('');
      }
    }
  });
  /* the install cards are an output, not a pass — list them so the report is
     the whole of what a run produces */
  try{
    const inst = fs.readdirSync(path.join(OUT, 'install')).sort();
    if(inst.length){
      L.push('### The install cards');
      L.push('');
      L.push('Written by `node tests/install-cards.js`. Every square on them is decoded by the QR pass above');
      L.push('before it is printed.');
      L.push('');
      inst.forEach(f => L.push('- [' + f + '](install/' + f + ')'));
      L.push('');
    }
  }catch(e){}

  fs.writeFileSync(path.join(OUT, 'TEST-REPORT.md'), L.join('\n'));
  console.log('\nreport: ' + path.join(OUT, 'TEST-REPORT.md'));
  if(failed.length) process.exitCode = 1;
})();

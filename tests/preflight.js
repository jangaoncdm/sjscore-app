/* PRE-FLIGHT — may this register be changed today?

   Run it before starting a series of features, and again before the first
   deploy of that series. It answers one question, GO or NO-GO, from eleven
   checks that have each cost a day at some point:

     · do the backend files parse, and does the whole suite pass;
     · is there a real salt or an API key anywhere in a PUBLIC repository;
     · is the working tree what you think it is, and is it pushed;
     · is there a restore point to come back to;
     · did the last deploy actually go green;
     · are both registers answering, and on which build;
     · is the published site serving the app, the console and the config of
       each register;
     · and do the two registers agree about what day it is.

   WHAT IT DELIBERATELY DOES NOT DO is write anything, anywhere. A pre-flight
   that changes the thing it is inspecting is not a pre-flight.

   The register's OWN health — triggers, backup, mail allowance — is behind
   the Collector's token and is read from the console's Admin screen, or by
   op=health. This is the half that can be checked from a machine.

   Usage: node tests/preflight.js
          node tests/preflight.js --quick   (skip the suite and the network)
*/
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const QUICK = process.argv.indexOf('--quick') >= 0;
const SITE = 'https://jangaoncdm.github.io/sjscore-app';
const REG = {
  'Swachh Jangaon': 'https://script.google.com/macros/s/AKfycbz8Ye9LqGB3bLWkTWcdw6JvU__U9K4VRaG-IFFpwc67G__1vdpMryV6NEfz5FJrnezS/exec',
  'Gram Palana':    'https://script.google.com/macros/s/AKfycbxM98E242Mel_LuTaL0ZfD3VNRPQqat2HZujGS6ghVPeJhdUlLVpwSd9pToqVn6sNlp/exec'
};

/* A REGISTER NOT YET STOOD UP IS SKIPPED WITH ITS REASON, NOT FAILED.
   The District HRMS has its own Sheet, its own project and its own /exec, and
   until the Collector has made them there is no address to ask. Its address is
   read off the published hrms/config.js rather than typed here, so the
   pre-flight learns it on the day it exists and nothing has to be edited —
   the same rule the console follows: the address the district PUBLISHES beats
   any address a page remembered. A pass that cannot be run is reported as
   skipped, with the reason; a report that quietly omits what it could not run
   is worse than no report. */
const LEARN = { 'District HRMS': '/hrms/config.js' };

let stop = 0, warn = 0;
const PAD = 34;
/* padEnd does nothing to a label already past the column, so a long one ran
   straight into its own detail — 'answered on the second askHTTP 404'. */
const col  = what => what.length < PAD ? what.padEnd(PAD) : what + '  ';
const ok   = (what, detail) => console.log('  ✓  ' + col(what) + (detail || ''));
const note = (what, detail) => { warn++; console.log('  !  ' + col(what) + (detail || '')); };
const bad  = (what, detail) => { stop++; console.log('  ✗  ' + col(what) + (detail || '')); };
const sh = c => execSync(c, { cwd: ROOT, stdio:['ignore','pipe','ignore'] }).toString().trim();

function fetch(url, ms){
  return new Promise(res => {
    let done = false;
    const t = setTimeout(() => { if(!done){ done = true; res(null); } }, ms || 20000);
    const go = u => {
      let U; try{ U = new URL(u); }catch(e){ if(!done){ done = true; clearTimeout(t); res(null); } return; }
      https.get({ hostname:U.hostname, path:U.pathname + U.search,
                  headers:{ 'Cache-Control':'no-cache' } }, r => {
        if(r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return go(r.headers.location);
        let s = ''; r.on('data', d => s += d);
        r.on('end', () => { if(!done){ done = true; clearTimeout(t); res({ code:r.statusCode, body:s }); } });
      }).on('error', () => { if(!done){ done = true; clearTimeout(t); res(null); } });
    };
    go(url);
  });
}

(async () => {
  console.log('\nPRE-FLIGHT · ' + new Date().toLocaleString('en-IN') + (QUICK ? '  (quick)' : '') + '\n');

  /* ---------------- the code ---------------- */
  console.log('The code');
  for(const f of fs.readdirSync(path.join(ROOT, 'backend')).filter(f => /\.gs$/.test(f))){
    try{
      new (require('vm').Script)(fs.readFileSync(path.join(ROOT, 'backend', f), 'utf8'));
      ok('backend/' + f, 'parses');
    }catch(e){ bad('backend/' + f, String(e.message).slice(0, 70)); }
  }

  /* A REAL SALT IN A PUBLIC REPOSITORY is the one mistake with no undo: the
     repository is public so that handsets can install the app. */
  try{
    const hits = [];
    const walk = d => fs.readdirSync(d, { withFileTypes:true }).forEach(e => {
      if(e.name === '.git' || e.name === 'node_modules' || e.name === 'Domain' || e.name === 'Info') return;
      const p = path.join(d, e.name);
      if(e.isDirectory()) return walk(p);
      if(!/\.(gs|js|html|json|yml|md)$/.test(e.name)) return;
      const t = fs.readFileSync(p, 'utf8');
      if(/SALT_FALLBACK\s*=\s*'(?!CHANGE-THIS-LONG-RANDOM-SALT)/.test(t)) hits.push(p + ' (salt)');
      if(/ANTHROPIC_API_KEY\s*=\s*'sk-/.test(t)) hits.push(p + ' (api key)');
    });
    walk(ROOT);
    if(hits.length) bad('no secret in the repository', hits.join(', '));
    else ok('no secret in the repository', 'salt placeholder intact');
  }catch(e){ note('secret scan', String(e.message).slice(0, 60)); }

  if(!QUICK){
    try{
      const out = execSync('node tests/run.js', { cwd:ROOT, stdio:['ignore','pipe','pipe'] }).toString();
      const m = out.match(/(\d+)\s+suite\(s\),\s+([\d,]+)\s+assertion\(s\),\s+(\d+)\s+failure/);
      if(m && m[3] === '0') ok('the whole suite', m[1] + ' suites, ' + m[2] + ' assertions');
      else bad('the whole suite', m ? (m[3] + ' failure(s)') : 'did not report');
    }catch(e){
      /* 'FAILED TO RUN OR FAILED OUTRIGHT' IS TRUE OF A THOUSAND FAULTS —
         the same uselessness as a decoder that says only 'no code found'.
         It read that way once for a file still locked by Windows moments
         after a rebase rewrote it, and the suite itself was green; with the
         exit status and the tail of what the run actually said, the next one
         is evidence instead of a puzzle. */
      /* AND THE LINE IT QUOTES IS THE TELLING ONE, not simply the last.
         A suite that fails says so at the end; a runner that crashes says so
         at the TOP of a stack whose last two lines are a blank and the node
         version — quoting those put 'Node.js v24.19.0' in place of 'Cannot
         find module', which is the useless message over again. */
      const lines = (String(e.stderr || '') + '\n' + String(e.stdout || ''))
        .split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      /* The code test is deliberately NOT case-blind: under /i, E[A-Z]{3,}
         is 'e' and three more letters, which matches 'ernal' inside
         node:internal/modules/cjs/loader and quoted a stack frame in place
         of the 'Cannot find module' two lines below it. */
      const said = lines.filter(x => /error|cannot|unexpected|failure|✗/i.test(x) ||
                                     /\bE[A-Z]{3,}\b/.test(x))[0] ||
                   lines[lines.length - 1] || String(e.message).split(/\r?\n/)[0];
      bad('the whole suite', 'did not complete · exit ' + (e.status === undefined ? '?' : e.status) +
        (e.signal ? ' · ' + e.signal : '') + ' · ' + String(said).slice(0, 110));
    }
  } else note('the whole suite', 'skipped (--quick)');

  /* ---------------- the repository ---------------- */
  console.log('\nThe repository');
  try{
    const dirty = sh('git status --porcelain');
    if(dirty) note('working tree', dirty.split('\n').length + ' file(s) uncommitted — they are not deployed');
    else ok('working tree', 'clean');
  }catch(e){ note('working tree', 'could not be read'); }
  try{
    const counts = sh('git rev-list --left-right --count origin/main...main').split(/\s+/);
    if(counts[1] !== '0') note('pushed', counts[1] + ' commit(s) not pushed — not deployed either');
    else if(counts[0] !== '0') note('pushed', counts[0] + ' commit(s) on the remote you do not have');
    else ok('pushed', 'in step with the remote');
  }catch(e){ note('pushed', 'no remote comparison'); }

  /* A RESTORE POINT IS NOT A BACKUP OF THE DATA — that is dailyBackup's job.
     It is a point in the CODE to come back to, and it is what makes a bad
     series of features a ten-minute problem instead of an afternoon's. */
  try{
    const tags = sh('git tag --sort=-creatordate').split('\n').filter(Boolean);
    if(!tags.length) bad('a restore point exists', 'no tag to come back to');
    else {
      const t = tags[0];
      const when = sh('git log -1 --date=short --pretty=format:%ad ' + t);
      const behind = sh('git rev-list --count ' + t + '..HEAD');
      ok('a restore point exists', t + '  (' + when + ', ' + behind + ' commit(s) since)');
      if(Number(behind) > 40) note('that restore point', 'is ' + behind + ' commits back — take a fresh one');
    }
  }catch(e){ bad('a restore point exists', String(e.message).slice(0, 60)); }

  if(!QUICK){
    try{
      const j = JSON.parse(sh('gh run list --limit 1 --workflow "Deploy SJGP" --json headSha,conclusion,status'));
      const r = j[0];
      if(!r) note('the last deploy', 'none found');
      else if(r.status !== 'completed') note('the last deploy', 'still running');
      else if(r.conclusion === 'success') ok('the last deploy', 'green on ' + r.headSha.slice(0, 7));
      else bad('the last deploy', r.conclusion + ' on ' + r.headSha.slice(0, 7));
    }catch(e){ note('the last deploy', 'gh not available'); }
  }

  /* ---------------- what is actually live ---------------- */
  if(!QUICK){
    console.log('\nWhat is live');
    /* a register's address is learnt off the config the district publishes
       beside its app, so a third one needs no edit here on the day it exists */
    for(const name of Object.keys(LEARN)){
      const c = await fetch(SITE + LEARN[name] + '?t=' + Date.now(), 15000);
      const m = c && c.code === 200 && c.body.match(/SJGP_SERVER\s*=\s*['"]([^'"]+)['"]/);
      if(m && !/PUT-THE/.test(m[1])) REG[name] = m[1];
      else note(name, 'not stood up yet — no ' + LEARN[name] + ' published. See DEPLOY-HRMS.md.');
    }
    const days = {};
    for(const name of Object.keys(REG)){
      /* ONE SLOW ANSWER IS NOT A DEAD REGISTER, AND IT MUST SAY WHICH IT WAS.
         An Apps Script web app cold starts, and a register that answered in
         4s was measured the same hour at 22s and 35s, and twice handed back
         Google's own 302 and 404 pages while an execution was still running
         behind it. Called dead on the first miss, that is a blocking NO-GO
         for nothing — and a pre-flight that cries wolf is the one check a
         district stops reading. So it is asked twice, what the first attempt
         actually said is carried into the answer rather than thrown away,
         and a register answering only on the second ask is reported as slow
         rather than as down: the two need different acts from the reader. */
      let r = null, j = null, t0 = Date.now(), says = '', tries = 0;
      while(tries < 2 && !j){
        tries++;
        t0 = Date.now();
        r = await fetch(REG[name] + '?op=diag&t=' + Date.now(), 45000);
        try{ j = JSON.parse(r && r.body); }catch(e){ j = null; }
        if(j && !j.ok) j = null;
        if(!j) says = (r ? 'HTTP ' + r.code : 'no answer in 45s') + ' after ' + (Date.now() - t0) + 'ms';
      }
      if(!j){ bad(name, 'not answering, asked twice · ' + says); continue; }
      if(tries > 1) note(name + ' answered on the second ask', says + ' the first time — slow, not down');
      days[name] = j.today;
      const feat = (j.features && j.features.live || []).map(f => f.name).join(', ') || 'none';
      ok(name, (Date.now() - t0) + 'ms · ' + j.today +
         ' · calendar ' + ((j.holidays||{}).count) + ' · modules: ' + feat);
      const skipped = (j.features && j.features.skipped) || [];
      if(skipped.length) note('  modules not loaded', skipped.map(s => s.name + ' (' + s.why + ')').join('; '));
    }
    /* THE TWO REGISTERS MUST AGREE ABOUT THE DAY. They are separate projects;
       a timezone set wrong on one of them would count a different working day
       from the other, and nothing would say so. */
    const ds = Object.keys(days).map(k => days[k]);
    const one = ds.filter((d, i) => ds.indexOf(d) === i);
    if(ds.length > 1 && one.length > 1)
      bad('every register agrees on the day', Object.keys(days).map(k => k + ' ' + days[k]).join(' vs '));
    else if(ds.length > 1) ok('every register agrees on the day', ds[0] + ' \u00b7 ' + ds.length + ' registers');

    for(const p of ['/', '/gp/', '/dashboard.html', '/config.js', '/gp/config.js', '/install.html', '/release.html']){
      const r = await fetch(SITE + p + '?t=' + Date.now(), 15000);
      if(r && r.code === 200) ok('site ' + p, r.body.length + ' bytes');
      else bad('site ' + p, r ? ('HTTP ' + r.code) : 'no answer');
    }
    /* THE HRMS APP IS PUBLISHED ONLY ONCE ITS CONFIG EXISTS, by the deploy
       Action's own rule, so its absence is a register not yet stood up and not
       a broken site. */
    {
      const r = await fetch(SITE + '/hrms/?t=' + Date.now(), 15000);
      if(r && r.code === 200) ok('site /hrms/', r.body.length + ' bytes');
      else note('site /hrms/', 'not published yet \u2014 the register is not stood up');
    }
    /* the console says which build it is; a stale one has cost a day twice */
    const d = await fetch(SITE + '/dashboard.html?t=' + Date.now(), 15000);
    const m = d && d.body.match(/const BUILD_STAMP = '([^']+)'/);
    if(m && !/^__/.test(m[1])) ok('the console names its build', m[1]);
    else note('the console names its build', 'unstamped');
  }

  console.log('\n' + (stop ? '  NO-GO — ' + stop + ' blocking, ' + warn + ' to note'
                           : (warn ? '  GO, with ' + warn + ' to note' : '  GO — everything clear')) + '\n');
  if(stop) process.exitCode = 1;
})();

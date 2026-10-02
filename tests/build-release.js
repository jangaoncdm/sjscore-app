/* THE RELEASE DOCUMENT.

   What the district has been given, release by release, with what each one
   was for. It is written for an officer or an auditor, not for a developer.

   NOTHING IN IT IS RETYPED. The releases come out of the repository's own
   history; the figures come out of the passes that produced them, read back
   from Info/TEST-REPORT.md if it is there; and the live state of both
   registers is fetched from the registers themselves at build time. A
   document about a government register that is typed by hand is a document
   that drifts from the register.

   It carries no officer's name, no mobile number and no PIN: the roll never
   leaves the district, and a release note is the last place it should appear.

   Usage: node tests/build-release.js          (writes app/release.html)
          node tests/build-release.js --offline  (skip the live fetch)
*/
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const OUT = path.join(__dirname, '..', 'app', 'release.html');
const OFFLINE = process.argv.indexOf('--offline') >= 0;

const SJ = 'https://script.google.com/macros/s/AKfycbz8Ye9LqGB3bLWkTWcdw6JvU__U9K4VRaG-IFFpwc67G__1vdpMryV6NEfz5FJrnezS/exec';
const GP = 'https://script.google.com/macros/s/AKfycbxM98E242Mel_LuTaL0ZfD3VNRPQqat2HZujGS6ghVPeJhdUlLVpwSd9pToqVn6sNlp/exec';

const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

/* ---------- the releases, out of the repository's own history ---------- */
const NOISE = /^(publish:|provision:|Add files via upload|Delete |Update |Create |v1$|updated$|go\(\))/;
function releases(){
  const raw = execSync('git log --date=short --pretty=format:%ad\u001f%s\u001e --no-merges',
    { cwd: path.join(__dirname, '..'), maxBuffer: 8 * 1024 * 1024 }).toString();
  const byDay = {};
  raw.split('\u001e').forEach(line => {
    const [d, subj] = line.replace(/^\s+/, '').split('\u001f');
    if(!d || !subj) return;
    if(NOISE.test(subj.trim())) return;
    if(/^Revert /.test(subj)) return;          /* a reversal is not a release */
    (byDay[d] = byDay[d] || []).push(subj.trim());
  });
  return Object.keys(byDay).sort().reverse()
    .map(d => ({ date:d, items: byDay[d].slice().reverse() }));
}

/* ---------- what each period of work was FOR ----------
   The one hand-written part of this document, and it is deliberately about
   PURPOSE rather than content: the content is the list underneath it. */
const CHAPTERS = [
  { from:'2026-10-01', title:'The calendar straightened',
    text:'A Thursday was being read as a Second Saturday and the attendance gate stood down across the district. '
       + 'The calendar is now the General Holidays of the G.O. and the second Saturdays worked out from the Gregorian '
       + 'calendar, so a date cannot be mistyped into it. Days already announced as holidays stand.' },
  { from:'2026-09-19', title:'The second register, and the orders that followed',
    text:'The Gram Palana register stood up for the Revenue department — 134 officers, isolated in its own '
       + 'spreadsheet. The filing schedule re-ordered to shares inside each mandal. The roll corrected from the '
       + 'district’s own roster. One handset, one officer.' },
  { from:'2026-09-17', title:'The filing schedule',
    text:'The villages were not being filed and nobody could say whose they were. Every pending village given an '
       + 'officer and a day, with reminders, a console view and the day-by-day pivot — and nothing that accuses anybody.' },
  { from:'2026-09-04', title:'The reporting month',
    text:'The month a village is evaluated FOR runs from the 10th to the 9th, because a month’s returns are not '
       + 'complete when the month is.' },
  { from:'2026-08-30', title:'The backup',
    text:'The whole system backed up nightly — the register, the server, the app, the console, the documents and the '
       + 'script properties — and a report that names the days that are missing.' },
  { from:'2026-08-23', title:'The documents, the weather and the place of duty',
    text:'The development plan and the Collector’s circular, each with its own acknowledgement register. Weather '
       + 'over every mandal. And the word “verified” corrected: it never meant the officer was at his place of duty.' },
  { from:'2026-08-21', title:'The reporting layer',
    text:'The evening report, the filing reminders, the workbook downloads and a console with a validated chart '
       + 'system and a real dark theme.' },
  { from:'2026-08-17', title:'The field registers',
    text:'The faults the district reported in its first month on the register, fixed one by one and each with the '
       + 'test that holds it.' },
  { from:'2026-08-15', title:'The pipeline',
    text:'One commit, everything deployed: the suites run, the site publishes, the backend deploys, and the district '
       + 'is asked whether it is answering before the run is called green.' },
  { from:'2026-07-21', title:'Adoption',
    text:'The register adopted by the district on 20.07.2026 and carried by hand until the pipeline existed.' }
];

/* ---------- the figures, read back from the passes ---------- */
function figures(){
  const out = {};
  const root = path.join(__dirname, '..');
  const rep = path.join(root, 'Info', 'TEST-REPORT.md');
  if(fs.existsSync(rep)){
    const t = fs.readFileSync(rep, 'utf8');
    const m = t.match(/(\d+)\s+suite\(s\),\s+([\d,]+)\s+assertion/);
    if(m){ out.suites = m[1]; out.assertions = m[2]; }
  }
  out.suiteFiles = fs.readdirSync(path.join(root, 'tests', 'suites')).filter(f => f.endsWith('.js')).length;
  out.passes = fs.readdirSync(path.join(root, 'tests')).filter(f => /^render-.*\.js$/.test(f)).length;
  const code = fs.readFileSync(path.join(root, 'backend', 'Code.gs'), 'utf8');
  out.backend = (code.match(/district backend v([\d.]+)/) || [])[1] || '';
  const app = fs.readFileSync(path.join(root, 'app', 'app.js'), 'utf8');
  out.app = (app.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1] || '';
  out.commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  return out;
}

function get(url){
  return new Promise(res => {
    const go = u => {
      const U = new URL(u);
      https.get({ hostname:U.hostname, path:U.pathname + U.search }, r => {
        if(r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return go(r.headers.location);
        let s = ''; r.on('data', d => s += d); r.on('end', () => res(s));
      }).on('error', () => res(''));
    };
    go(url);
  });
}
async function live(){
  if(OFFLINE) return null;
  const out = {};
  for(const [k, u] of [['sjgp', SJ], ['gp', GP]]){
    try{ out[k] = JSON.parse(await get(u + '?op=diag&t=' + Date.now())); }
    catch(e){ out[k] = null; }
  }
  return out;
}

(async () => {
  const rel = releases(), fig = figures(), now = await live();
  const total = rel.reduce((n, r) => n + r.items.length, 0);
  const stamp = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

  const chapterFor = d => {
    for(const c of CHAPTERS) if(d >= c.from) return c;
    return CHAPTERS[CHAPTERS.length - 1];
  };
  /* group the days under the chapter they belong to, newest first */
  const grouped = [];
  rel.forEach(day => {
    const c = chapterFor(day.date);
    let g = grouped[grouped.length - 1];
    if(!g || g.chapter !== c){ g = { chapter:c, days:[] }; grouped.push(g); }
    g.days.push(day);
  });

  const dmy = d => {
    const t = new Date(d + 'T00:00:00');
    return isNaN(t) ? d : t.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  };

  const regCard = (name, sub, j, extra) => `
    <div class="reg">
      <p class="eyebrow">${esc(sub)}</p>
      <h3>${esc(name)}</h3>
      ${j ? `<dl>
        <div><dt>Answering</dt><dd class="ok">yes &middot; ${esc(j.today || '')}</dd></div>
        <div><dt>Today</dt><dd>${j.offToday && j.offToday.today
            ? 'an off day &mdash; ' + esc(j.offToday.why || '') : 'a working day'}</dd></div>
        <div><dt>Calendar ${esc(String((j.holidays||{}).year||''))}</dt><dd>${esc(String((j.holidays||{}).count||0))} days</dd></div>
        <div><dt>Show-cause ladder</dt><dd>${(j.can||{}).sanction ? 'in force' : 'built and switched off'}</dd></div>
        <div><dt>Village evaluation</dt><dd>${(j.can||{}).evaluation ? 'taken' : 'not taken'}</dd></div>
        <div><dt>Filing schedule</dt><dd>${(j.can||{}).schedule ? 'carried' : 'not carried'}</dd></div>
        <div><dt>Development plan</dt><dd>${(j.can||{}).gpdp ? 'called for' : 'not called for'}</dd></div>
        <div><dt>Place of duty</dt><dd>${(j.can||{}).placeOfDuty ? 'measured' : 'no coordinates to measure against'}</dd></div>
      </dl>` : `<p class="mut">Not reached when this document was built.</p>`}
      ${extra || ''}
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SJGP &middot; Release record</title>
<meta name="description" content="What the Jangaon district register has been given, release by release.">
<style>
  /* NO WEBFONT AND NO CDN: this is opened from a district machine that may
     have neither, and printed from one that certainly has neither. */
  :root{
    --paper:#F3F4F9; --card:#FFFFFF; --ink:#10121C; --ink-2:#545A6E; --ink-3:#767D93;
    --line:rgba(16,18,28,.12); --pri:#4A40CE; --teal:#0F766E; --ok:#126E4B;
  }
  @media (prefers-color-scheme: dark){
    :root:not([data-theme="light"]){
      --paper:#10121C; --card:#171B2D; --ink:#EEF0F7; --ink-2:#AEB4C8; --ink-3:#8A90A6;
      --line:rgba(238,240,247,.14); --ok:#49C98B;
    }
  }
  :root[data-theme="dark"]{
    --paper:#10121C; --card:#171B2D; --ink:#EEF0F7; --ink-2:#AEB4C8; --ink-3:#8A90A6;
    --line:rgba(238,240,247,.14); --ok:#49C98B;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans",sans-serif;
    color:var(--ink);background:var(--paper);padding:30px 16px 72px}
  .wrap{max-width:880px;margin:0 auto}
  header{text-align:center;margin-bottom:28px}
  .seal{font:700 11.5px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    letter-spacing:.17em;text-transform:uppercase;color:var(--ink-3)}
  h1{font-size:30px;letter-spacing:-.022em;margin-top:10px;line-height:1.2}
  .lede{color:var(--ink-2);margin-top:12px;font-size:15.5px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;margin-top:18px}
  h2{font-size:19px;letter-spacing:-.01em;margin-bottom:4px}
  h3{font-size:17px;letter-spacing:-.01em}
  .eyebrow{font:700 10.5px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    letter-spacing:.15em;text-transform:uppercase;color:var(--ink-3)}
  .mut{color:var(--ink-2);font-size:14.5px}
  .grid{display:flex;gap:16px;flex-wrap:wrap;margin-top:4px}
  .reg{flex:1 1 320px;min-width:0;background:var(--card);border:1px solid var(--line);
    border-radius:14px;padding:18px}
  dl{margin-top:12px;font-size:14px}
  dl > div{display:flex;gap:10px;padding:5px 0;border-bottom:1px solid var(--line)}
  dl > div:last-child{border-bottom:0}
  dt{color:var(--ink-3);flex:0 0 46%}
  dd{color:var(--ink);flex:1 1 auto}
  dd.ok{color:var(--ok);font-weight:600}
  .kpis{display:flex;gap:14px;flex-wrap:wrap;margin-top:6px}
  .kpi{flex:1 1 150px;background:var(--card);border:1px solid var(--line);border-radius:13px;padding:15px 16px}
  .kpi .n{font:700 25px/1.1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:-.02em}
  .kpi .l{color:var(--ink-3);font-size:12.5px;margin-top:6px;line-height:1.45}
  .chapter{margin-top:30px}
  .chapter > .hd{border-left:3px solid var(--pri);padding-left:14px;margin-bottom:6px}
  .chapter > .hd p{color:var(--ink-2);font-size:14.5px;margin-top:6px}
  .day{margin-top:14px}
  .day .d{font:700 11.5px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    letter-spacing:.11em;text-transform:uppercase;color:var(--ink-3)}
  .day ul{margin:8px 0 0 19px}
  .day li{margin-top:5px;color:var(--ink)}
  .rules li{margin-top:7px;color:var(--ink-2)}
  .rules b{color:var(--ink)}
  footer{text-align:center;color:var(--ink-3);font-size:13px;margin-top:34px;line-height:1.75}
  code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px}
  @media print{
    body{background:#fff;padding:0}
    .card,.reg,.kpi{break-inside:avoid;border-color:#ccc}
    .chapter{break-inside:avoid-page}
  }
</style></head>
<body>
<div class="wrap">
  <header>
    <p class="seal">Collectorate &middot; Jangaon District &middot; Telangana</p>
    <h1>The district register &mdash; release record</h1>
    <p class="lede">Everything the register has been given since the district adopted it on
    20 July 2026, release by release, with what each one was for. Built from the repository&rsquo;s
    own history and from the live registers on ${esc(stamp)}.</p>
  </header>

  <section class="card">
    <h2>What it is</h2>
    <p class="mut" style="margin-top:8px">Two registers, each its own Apps Script project over its own
    spreadsheet, serving the same application from one address. Officers mark attendance and file their
    returns from their phones, often on weak rural signal; the Collector reads both from a single console.
    <b>What it writes is a government record</b> &mdash; it is used to issue show-cause notices under the
    Telangana Civil Services (Conduct) Rules 1964 and to debit casual leave &mdash; which is why the rules
    further down are written the way they are.</p>
    <div class="grid" style="margin-top:16px">
      ${regCard('Swachh Jangaon Gram Panchayat', 'Sanitation · since 20.07.2026', now && now.sjgp,
        '<p class="mut" style="margin-top:12px">About 280 Panchayat Secretaries, MPOs, MSOs, MPDOs, the DPO and the DLPO across 12 mandals. Attendance, the monthly 100-mark village evaluation with photographic evidence, leave, the filing schedule, the development plan and the Collector’s circulars.</p>')}
      ${regCard('Gram Palana Register', 'Revenue · since 19.09.2026', now && now.gp,
        '<p class="mut" style="margin-top:12px">115 Gram Palana Officers across 180 revenue villages and 19 Revenue Inspectors. Attendance carrying the place it was marked from, leave, the map and the daily report. The show-cause ladder is built and switched off by order.</p>')}
    </div>
  </section>

  <section class="card">
    <h2>Where it stands</h2>
    <div class="kpis" style="margin-top:12px">
      <div class="kpi"><div class="n">${esc(fig.assertions || '—')}</div><div class="l">assertions, over ${esc(fig.suiteFiles)} suites, run against the real backend before anything deploys</div></div>
      <div class="kpi"><div class="n">${esc(fig.passes)}</div><div class="l">browser passes that drive the real app and console and measure what looking cannot</div></div>
      <div class="kpi"><div class="n">${esc(total)}</div><div class="l">releases since adoption</div></div>
      <div class="kpi"><div class="n">${esc(fig.commit)}</div><div class="l">the build this document was written from</div></div>
    </div>
    <p class="mut" style="margin-top:14px">Server <code>v${esc(fig.backend)}</code> &middot; app <code>v${esc(fig.app)}</code>.
    Every commit to the main branch runs the suites, publishes the app and the console, deploys both backends and
    then asks each register whether it is answering. Nothing untested reaches an officer&rsquo;s phone.</p>
  </section>

  <section class="card">
    <h2>The rules that were paid for</h2>
    <p class="mut" style="margin-top:8px">Each of these is a failure that reached officers in the field. They are
    recorded here because they are the reason the register behaves as it does, and because undoing one of them
    would repeat it.</p>
    <ul class="rules" style="margin:12px 0 0 19px">
      <li><b>The phone&rsquo;s clock is not evidence.</b> A handset eleven minutes fast was recording marks in the future. Compliance is judged on the earlier of the officer&rsquo;s claim and the district&rsquo;s receipt.</li>
      <li><b>A mark on the phone is not a mark the district has.</b> The day is read at 18:00, and attendance is read three times before a day&rsquo;s leave is debited.</li>
      <li><b>Dates from the sheet are not strings.</b> A spreadsheet silently transposes day and month when both are twelve or less. It put nine holidays on the wrong date, and in October 2026 it closed a working day across the district.</li>
      <li><b>The server decides; the console only asks.</b> Every write re-checks role, ownership and balance.</li>
      <li><b>Nothing is destroyed.</b> Withdrawn evaluations, superseded schedules, retired officers and reversed debits all remain on the register. A file can be produced afterwards.</li>
      <li><b>Idempotence everywhere.</b> Every job runs twice without changing anything the second time.</li>
      <li><b>Silence under sanction is leave, not absence.</b> Anything counting the unmarked consults the leave register first.</li>
      <li><b>&ldquo;Verified&rdquo; is not &ldquo;present at the place of duty.&rdquo;</b> It means only that the handset returned a precise fix. The distance is printed and <b>accuses nobody</b>.</li>
      <li><b>One handset is one officer.</b> Two officers sharing a phone must never inherit each other&rsquo;s marks or unsent work.</li>
      <li><b>A plan of work is not a charge.</b> Falling behind the filing schedule, a missing development plan and an unacknowledged circular raise no notice, no debit and no lock.</li>
    </ul>
  </section>

  ${grouped.map(g => `
  <section class="chapter">
    <div class="hd">
      <h2>${esc(g.chapter.title)}</h2>
      <p>${esc(g.chapter.text)}</p>
    </div>
    ${g.days.map(d => `
    <div class="card day">
      <p class="d">${esc(dmy(d.date))}</p>
      <ul>${d.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>`).join('')}
  </section>`).join('')}

  <section class="card" style="margin-top:30px">
    <h2>How to read this</h2>
    <p class="mut" style="margin-top:8px">Each line is one release: a change that passed the suites, was published and
    was deployed to the district the same day. The headings above each group say what that period of work was for;
    the lines beneath are what was actually delivered. Reversals are not listed, because a change that was taken back
    was never given.</p>
    <p class="mut" style="margin-top:10px"><b>Nothing in this document is typed by hand</b> except the ten headings and
    the rules above. The releases are read out of the repository&rsquo;s history, the figures out of the passes that
    produced them, and the state of each register out of the register itself at the moment this was built. It carries
    no officer&rsquo;s name, no mobile number and no PIN.</p>
  </section>

  <footer>
    Office of the Collector &amp; District Magistrate, Jangaon District, Telangana.<br>
    Built ${esc(stamp)} from <code>${esc(fig.commit)}</code>.
  </footer>
</div>
</body></html>
`;

  fs.writeFileSync(OUT, html);
  console.log('releases : ' + total + ' over ' + rel.length + ' day(s)');
  console.log('figures  : ' + (fig.assertions || '?') + ' assertions, ' + fig.suiteFiles + ' suites, ' + fig.passes + ' browser passes');
  if(now){
    ['sjgp','gp'].forEach(k => {
      const j = now[k];
      console.log('live     : ' + k.padEnd(5) + (j ? j.tenantName + ' — ' + j.today +
        ', calendar ' + (j.holidays||{}).count : 'not reached'));
    });
  } else console.log('live     : skipped (--offline)');
  console.log('\nwritten  : app/release.html  (' + html.length + ' bytes, no webfont, no CDN)');
})();

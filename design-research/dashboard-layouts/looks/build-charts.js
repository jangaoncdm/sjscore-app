/* ============================================================================
   Writes looks/charts.html - the graph types, question by question.

   WHY THIS IS A SEPARATE PAGE AND NOT A GALLERY OF CHARTS. A chart is not
   good or bad on its own; it is good or bad at answering a question. So the
   page is organised by the QUESTION the Collector is actually asking, and
   each question carries two or three forms that could answer it, drawn from
   the same figures, with a verdict and the reason.

   The house rule is in prompt/dashboard-charts-prompt.md and CLAUDE.md: the
   form follows the data's job. A ratio against a limit is a meter, never a
   two-slice ring. An ordered scale is one hue light to dark, never a rainbow.
   Magnitude charts are laid out at exact pixel sizes, never in a scaled
   viewBox. Every verdict below is that rule applied, not a preference.

     node looks/build-charts.js
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const DIR = __dirname, ROOT = path.dirname(DIR);
const read = p => fs.readFileSync(p, 'utf8');
const TOKENS = read(path.join(ROOT, '_shared', 'tokens.css'));
const CHROME = read(path.join(ROOT, '_shared', 'chrome.css'));
const DATA   = read(path.join(ROOT, '_shared', 'data.js'));
const CHARTS = read(path.join(ROOT, '_shared', 'charts.js'));
/* drawn in the look the study recommends, so the page reads as the console */
const LOOK = read(path.join(DIR, '1-tinted-canvas.css')).replace(/^\/\*@META[\s\S]*?\*\//, '');

const QS = [
  { n:1, q:'How did the fortnight go?',
    sub:'The single most-read chart on the console. Fourteen days of a register that does not open on a Sunday.',
    opts:[
      { id:'q1a', t:'Area over fourteen calendar days', tag:'what is live now', v:'no',
        why:'backend/Code.gs:4402 counts back fourteen days and app/dashboard.html:2093 draws every one of them the same, so the line dives to nothing twice and reads as a collapse. The nought is true. Drawing it like a working day is not.' },
      { id:'q1b', t:'The same line, with the shut days banded and the line broken', tag:'recommended', v:'ok',
        why:'The band says the office was shut; the break refuses to invent a reading between two days nobody worked. This is the same reasoning that took the spline out of the console already.' },
      { id:'q1c', t:'Stacked columns: present, on leave, not marked', tag:'use as well, not instead', v:'alt',
        why:'Present, on leave and not marked are parts of one roll. A column shows the whole roll and the shape of the part that matters; a line of "present" alone cannot tell a quiet day from a sanctioned one.' }
    ]},
  { n:2, q:'Who is behind, and by how much?',
    sub:'Twelve mandals, one figure each, read in order and acted on the same morning.',
    opts:[
      { id:'q2a', t:'Filled bars against the whole mandal', tag:'what is live now', v:'no',
        why:'Reading 3 of 6 against 6 says a mandal is halfway through the month. It is the 9th; halfway is not the question. And twelve full bars put a great deal of ink between each name and its figure.' },
      { id:'q2b', t:'Lollipop, ranked worst first', tag:'better', v:'alt',
        why:'Same length, a tenth of the ink, and ranking puts the mandal that needs the call at the top instead of leaving it alphabetical. Still measured against the wrong thing.' },
      { id:'q2c', t:'Bullet: filed, against what is DUE by today', tag:'recommended', v:'ok',
        why:'The bar is filed, the tick is what the schedule says should be filed by today, the pale track is the whole mandal. Now 3 of 6 reads as one behind, which is the fact an order is passed on. A ratio against a limit is a meter; this is that meter with the limit drawn on it.' }
    ]},
  { n:3, q:'Is the district better than it was?',
    sub:'A fortnight says what is happening. Only a run of months says whether it is improving.',
    opts:[
      { id:'q3a', t:'Six reporting months, one line', tag:'recommended for the district', v:'ok',
        why:'One hue, one series, every point labelled because there are only six. July is short - the register opened on the 20th - and the card says so rather than letting a short month read as a bad one.' },
      { id:'q3b', t:'Dumbbell: last month and this month, per mandal', tag:'recommended for the mandals', v:'ok',
        why:'A district average hides twelve different stories. The length of the connector is the movement, and sorting by movement rather than by name is what stops a list of changes hiding the changes.' }
    ]},
  { n:4, q:'How did the evaluations come out?',
    sub:'Grades A to D over the villages filed this month.',
    opts:[
      { id:'q4a', t:'Donut with the total in the hole', tag:'what is live now', v:'alt',
        why:'It works, and it is the one form on this page I would not change for its own sake. Comparing two arcs is harder than comparing two lengths, but the total in the hole earns its place and the four parts are few enough.' },
      { id:'q4b', t:'One stacked bar, ordered A to D', tag:'better for comparing', v:'ok',
        why:'Grades are an ORDERED scale, not four identities, and lengths on a common baseline are read faster than arcs. The status colours stay: a grade D is a finding and not merely the last bin, which is the one place the ordered-scale rule gives way.' }
    ]},
  { n:5, q:'Which mandal is the exception?',
    sub:'Twelve units, one fortnight each. The question is not what the average is; it is which one is not like the others.',
    opts:[
      { id:'q5a', t:'Twelve series on one axis', tag:'no', v:'no',
        why:'Twelve lines on one pair of axes is a plate of spaghetti, and the eight-slot categorical palette does not stretch to twelve without cycling, which the house rule forbids outright.' },
      { id:'q5b', t:'Small multiples, one identical scale', tag:'recommended', v:'ok',
        why:'Twelve small charts on a SHARED scale is the comparison, and the eye finds the odd one out without reading a figure. Shared deliberately: a sparkline normalised to its own range makes a flat mandal look as dramatic as a collapsing one.' }
    ]},
  { n:6, q:'When does the district mark in?',
    sub:'Thirteen hours of one morning.',
    opts:[
      { id:'q6a', t:'One hue, light to dark', tag:'what is live now, and it is right', v:'ok',
        why:'Hours are an ordered scale. The console already draws this correctly and the comment in app/dashboard.html says why: the ramp it used to wear coloured a single series by its own height and said nothing twice.' }
    ]}
];

const sections = QS.map(Q => `
<section class="q">
  <div class="qh">
    <span class="eyebrow">Question ${Q.n}</span>
    <h2>${Q.q}</h2>
    <p>${Q.sub}</p>
  </div>
  <div class="opts o${Q.opts.length}">${Q.opts.map(o => `
    <figure class="opt">
      <figcaption><b>${o.t}</b><span class="pill ${o.v === 'ok' ? 'ok' : o.v === 'no' ? 'bad' : 'mut'}">${o.tag}</span></figcaption>
      <div class="plot" id="${o.id}"></div>
      <p class="why">${o.why}</p>
    </figure>`).join('')}</div>
</section>`).join('');

const JS = `
const S = window.SJ, C = window.CH;
const SH = r => r.sun;

/* 1 - the fortnight */
C.fit('q1a', w => C.area(S.days, 'present', 'var(--cs1)', w, 190));
C.fit('q1b', w => C.line(S.days, [{k:'present', n:'Marked', c:'var(--cs1)', area:true}], w, 190));
C.fit('q1c', w => C.stack(S.days, [
  {k:'present', n:'Present',    c:'var(--st-ok)'},
  {k:'leave',   n:'On leave',   c:'var(--st-warn)'},
  {k:'missing', n:'Not marked', c:'var(--st-bad)'}], w, 190));

/* 2 - who is behind */
document.getElementById('q2a').innerHTML = S.coverage.map(c =>
  '<div class="hbar"><b>' + c.mandal + '</b><div class="bar"><i style="width:' + c.pct +
  '%;background:' + (c.pct >= 60 ? 'var(--st-ok)' : c.pct >= 35 ? 'var(--st-warn)' : 'var(--st-bad)') +
  '"></i></div><span class="n">' + c.done + '/' + c.total + '</span></div>').join('');
C.fit('q2b', w => C.lollipop(S.coverage.slice().sort((a, b) => a.pct - b.pct)
  .map(c => ({label:c.mandal, v:c.pct, right:c.done + '/' + c.total,
    c: c.pct >= 60 ? 'var(--st-ok)' : c.pct >= 35 ? 'var(--st-warn)' : 'var(--st-bad)'})),
  w, null, {max:100, unit:'%'}));
C.fit('q2c', w => C.bullet(S.coverage.map(c =>
  ({label:c.mandal, v:c.done, due:c.due, total:c.total})), w));

/* 3 - better than it was */
C.fit('q3a', w => C.line(S.months.map(m => ({d:m.ym.slice(0, 3), avg:m.avg})),
  [{k:'avg', n:'District average', c:'var(--cs1)', area:true}],
  w, 200, {min:40, max:100, shut: () => false}));
C.fit('q3b', w => C.dumbbell(S.coverage.slice()
  .sort((a, b) => (a.pct - a.prevPct) - (b.pct - b.prevPct))
  .map(c => ({label:c.mandal, a:c.prevPct, b:c.pct})),
  w, null, {max:100, aName:'September', bName:'October'}));

/* 4 - the grades */
document.getElementById('q4a').innerHTML = C.donut([
  {k:'Grade A', v:S.grades.A, c:'var(--st-ok)'},  {k:'Grade B', v:S.grades.B, c:'var(--grade-b)'},
  {k:'Grade C', v:S.grades.C, c:'var(--st-warn)'},{k:'Grade D', v:S.grades.D, c:'var(--st-bad)'}
], S.totals.filedN, 'filed', 150);
C.fit('q4b', w => C.stackbar([
  {k:'Grade A', v:S.grades.A, c:'var(--st-ok)'},  {k:'Grade B', v:S.grades.B, c:'var(--grade-b)'},
  {k:'Grade C', v:S.grades.C, c:'var(--st-warn)'},{k:'Grade D', v:S.grades.D, c:'var(--st-bad)'}
], w, {label:'grades over the villages filed in October 2026'}));

/* 5 - the exception */
C.fit('q5a', w => C.line(S.days, S.coverage.map((c, i) => ({
  k:'m' + i, n:c.mandal, c:'var(--cs' + ((i % 8) + 1) + ')'
})), w, 210, {min:60, max:100, legend:true}));
C.fit('q5b', w => C.sparkgrid(S.coverage.map(c => ({label:c.mandal, vals:c.series})), w));

/* 6 - the morning */
C.fit('q6a', w => C.columns(S.hours.map(r => ({label:String(r.h) + ':00', n:r.n})),
  [{k:'n', n:'marks', c:'var(--co3)'}], w, 210));

/* THE TWELVE-SERIES CHART NEEDS TWELVE KEYS ON EACH ROW. Built here rather
   than in data.js: it exists only to be shown as the wrong answer. */
window.onThemeChange = C.redraw;
`;

/* the twelve-series row shape has to exist before the charts draw */
const PRE = `
(function(){ var S = window.SJ;
  S.days.forEach(function(d, di){
    S.coverage.forEach(function(c, i){ d['m' + i] = c.series[di]; });
  });
})();`;

fs.writeFileSync(path.join(DIR, 'charts.html'), `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="description" content="Graph types for the SJGP console, organised by the question each one answers, with a verdict against the house chart rule.">
<title>SJGP console &middot; the graph types</title>
<style>
${TOKENS}
${CHROME}
${LOOK}
.wrap{max-width:1500px;margin:0 auto;padding:0 var(--s3) var(--s6)}
.head{padding:var(--s4) 0 var(--s2)}
.head h1{font-size:30px;letter-spacing:-.02em;line-height:1.15}
.head p{max-width:76ch;font-size:var(--f-body);color:var(--tx-2);line-height:var(--lh-prose);margin-top:11px}
.head .headbar{display:flex;gap:var(--s1);flex-wrap:wrap;margin-top:var(--s3);align-items:center}
.q{margin-top:var(--s5);padding-top:var(--s3);border-top:2px solid var(--line)}
.qh h2{font-size:23px;letter-spacing:-.015em;margin-top:6px}
.qh p{font-size:var(--f-body);color:var(--tx-2);max-width:72ch;margin-top:5px;line-height:var(--lh-prose)}
.opts{display:grid;gap:var(--s3);margin-top:var(--s3)}
.opts.o3{grid-template-columns:repeat(3,minmax(0,1fr))}
.opts.o2{grid-template-columns:repeat(2,minmax(0,1fr))}
.opts.o1{grid-template-columns:minmax(0,1fr)}
@media(max-width:1180px){.opts.o3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:880px){.opts.o3,.opts.o2{grid-template-columns:minmax(0,1fr)}}
.opt{background:var(--panel);border-radius:var(--r);box-shadow:var(--nm-out);
  padding:var(--s2);display:flex;flex-direction:column;min-width:0}
.opt figcaption{display:flex;gap:var(--s1);align-items:flex-start;flex-wrap:wrap;
  margin-bottom:var(--s2)}
.opt figcaption b{font-size:var(--f-body);flex:1;min-width:140px;line-height:1.35}
.why{font-size:var(--f-small);color:var(--tx-2);line-height:var(--lh-prose);
  margin-top:var(--s2);padding-top:var(--s2);border-top:1px solid var(--line-2)}
.foot{margin-top:var(--s5);padding:var(--s3);border-radius:var(--r);background:var(--well);
  box-shadow:var(--nm-in-sm);font-size:var(--f-small);color:var(--tx-2);
  line-height:var(--lh-prose);max-width:88ch}
.foot b{color:var(--tx)}
@media(max-width:760px){.wrap{padding:0 var(--s2) var(--s5)}.head h1{font-size:23px}}
</style>
</head>
<body>
<div class="wrap">
  <div class="head">
    <div class="eyebrow">SJGP &middot; district monitoring console &middot; graph types</div>
    <h1>The graph types, question by question</h1>
    <p>A chart is not good or bad on its own, it is good or bad at answering a question. So this is
      organised by what the Collector is actually asking, and each question carries the forms that
      could answer it, drawn from the same figures. Every verdict is the house rule applied, not a
      preference: the form follows the data's job, a ratio against a limit is a meter, an ordered
      scale is one hue light to dark, and no chart is drawn in a scaled viewBox. All figures are
      invented.</p>
    <div class="headbar">
      <a class="btn" href="index.html">The eight looks</a>
      <a class="btn" href="../index.html">The ten layouts</a>
      <a class="btn" href="../REPORT.md">The written report</a>
      <button class="btn" id="theme">Dark</button>
    </div>
  </div>
  ${sections}
  <div class="foot"><b>What is not on this page.</b> The eight series colours, the five-step
    ordinal ramp and the four status colours. They were computed and validated against card
    surfaces #FFFFFF and #171B2D - the record, including the palette built from the house accents
    that failed on three counts, is in <code>prompt/palette-validation.txt</code> - and the
    validator script is not installed in this working copy. So every chart above is drawn in the
    colours the console already holds. Changing a series colour is a separate act that starts by
    re-running the validator.</div>
</div>
<script>
${DATA}
</script>
<script>${PRE}
</script>
<script>
${CHARTS}
</script>
<script>
${JS}
</script>
<script>
var t = document.getElementById('theme');
t.onclick = function(){
  document.body.classList.toggle('dark');
  t.textContent = document.body.classList.contains('dark') ? 'Light' : 'Dark';
  if(window.onThemeChange) window.onThemeChange();
};
</script>
</body>
</html>
`);
console.log('wrote looks/charts.html with ' + QS.length + ' questions and ' +
  QS.reduce((a, q) => a + q.opts.length, 0) + ' forms');

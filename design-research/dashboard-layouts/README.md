# Layout study: SJGP monitoring console

Ten industry-standard dashboard layouts, built as working mockups against the
console's own entities and metrics, then scored and ranked.

**Read [REPORT.md](REPORT.md).** Open [index.html](index.html) for the gallery
and the side-by-side bench.

Then open **[looks/index.html](looks/index.html)**: the recommended layout
rendered in eight different grounds and chrome languages, with the layout held
still so the comparison is about look and feel alone.

And **[looks/charts.html](looks/charts.html)**: the graph types, organised by
the question each one answers, with a verdict against the house chart rule.

**No application code is changed by anything in this folder.**

## Regenerating

```bash
npm i playwright --no-save      # not a dependency of this project, deliberately
node build.js                   # src/ + _shared/ -> ten self-contained HTML files
node shoot.js                   # renders each at 1440 and 390, writes shots/
node gallery.js                 # writes index.html from _shared/patterns.json

node looks/build-looks.js       # the recommended layout in eight looks
node looks/build-charts.js      # the graph types, question by question
node shoot.js --dir=looks --match='^(look-\d.*|charts|index)\.html$' --themes
node looks/gallery-looks.js     # writes looks/index.html from looks/looks.json
```

`--themes` adds a second **measured** frame in the opposite theme at 1440: a
look that only holds together in the theme it was drawn in is not a look, and
a hardcoded colour on a dark card is a defect `CLAUDE.md` already has a rule
about.

Run them in that order: `gallery.js` uses the screenshots as thumbnails, so
`shoot.js` must have run. Re-run `shoot.js` afterwards if you want the gallery's
own screenshot refreshed.

`shoot.js` is a check as well as a camera. It fails on a script error, on a
sideways page scroll, on an element overflowing the viewport (excluding
deliberate scroll containers and off-canvas panels) and on two cards in a grid
row differing in height by more than 2px. Current result: **22 passed, 0 failed.**

## What is in here

| Path | What it is |
|---|---|
| `REPORT.md` | the audit, the research catalog with sources, the scoring matrix and the recommendation |
| `index.html` | gallery: ten thumbnails, plus a bench holding any two side by side at a chosen width |
| `01-*.html` to `10-*.html` | the mockups, self-contained, no build and no network needed to open one |
| `src/` | the per-pattern fragments: meta, CSS, markup, JS, split by marker comments |
| `_shared/tokens.css` | the console's own tokens, lifted from `app/dashboard.html:680-776` |
| `_shared/chrome.css` | the shared primitives: card, KPI, pill, table, states. Components, never layout |
| `_shared/data.js` | the sample district |
| `_shared/charts.js` | SVG chart helpers, drawn at measured pixel widths |
| `shots/` | the screenshots and `report.json` |
| `build.js`, `shoot.js`, `gallery.js` | the three steps above |
| `looks/` | one layout, eight looks: `N-slug.css` is a look, the rest is built from it |
| `looks/index.html` | the eight side by side, with the same bench |
| `looks/charts.html` | six questions, thirteen graph forms, a verdict on each |

## Two rules this folder keeps

**Nothing real is in these files.** Every officer name, village name,
coordinate and figure is generated from a fixed seed in `_shared/data.js`. This
repository is public and the district's roster is not in it: `Domain/`, `Add/`,
`hms/`, `Loc/` and `Info/` are gitignored, and a `git add -A` published 192
personal mobile numbers once already. The twelve mandal names are public
administrative fact and are used as they are.

**The tokens are shared so the comparison is about layout.** `build.js` inlines
one token set, one set of primitives and one set of chart helpers into all ten
files. A difference you can see between any two mockups is a difference of
layout, not of styling. Charts are inline SVG at exact pixel sizes rather than
Chart.js from a CDN, because `CLAUDE.md` forbids CDN assets and because a
mockup that needs the network cannot be judged on the low-bandwidth criterion
it is being scored against.

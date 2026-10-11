# SJGP monitoring console: layout study

Ten industry-standard dashboard layouts, built as working mockups against the
console's own entities, scored and ranked.

| | |
|---|---|
| Subject | `app/dashboard.html`, the Collector's monitoring console |
| Date | 11 October 2026 |
| Mockups | `design-research/dashboard-layouts/index.html` (gallery), `01-*.html` to `10-*.html` |
| Screenshots | `shots/`, two per pattern (1440 and 390), plus the open-drawer frame for pattern 06 |
| Application code changed | None |

---

## 0. Assumptions, and five questions answered with defaults

The brief asked for assumptions and up to five clarifying questions, then for
work to proceed on stated defaults. Here they are. Nothing below waited on an
answer.

| # | Question | Default taken | Why |
|---|---|---|---|
| 1 | May real officer names, mobile numbers and village coordinates appear in the mockups? | No. Every officer name, village name, coordinate and figure in `_shared/data.js` is generated from a fixed seed. | This repository is public. `CLAUDE.md` records that `Domain/`, `Add/`, `hms/`, `Loc/` and `Info/` are gitignored for this reason, and that a `git add -A` published 192 personal mobile numbers on 04.10.2026. The twelve mandal names are public administrative fact and are used as they are. |
| 2 | Chart.js from a CDN, as the brief suggests? | No. Charts are inline SVG drawn at measured pixel widths by `_shared/charts.js`. | `CLAUDE.md` forbids CDN assets ("No webfonts, ever, the app must open with no signal") and requires charts laid out in HTML at exact pixel sizes rather than a scaled `viewBox`. A mockup that needs a CDN also cannot be judged on the low-bandwidth criterion it is being scored against. |
| 3 | Invent a token set, or reuse the console's? | Reuse. `_shared/tokens.css` is lifted from `app/dashboard.html:680-776`. | The comparison has to be about layout. The chart series were computed and validated (`prompt/palette-validation.txt`) and an invented set would discard that work and the record of the palette that failed. |
| 4 | Who are the console's users? | Discovered from code: Collector (the only authenticated user today), with MPDO, MPO, MSO and Panchayat Secretary as the roles the register knows. | `TENANTS` in `backend/Code.gs` carries the roles; the console is Collector-only at the door. Pattern 03 tests whether that should change. |
| 5 | Are the scoring weights mine to set? | Yes, and they are stated in section 4.1 so they can be re-weighted. | Changing a weight re-ranks the board and nothing underneath it moves. |

One further note, stated plainly because the brief's premise depends on it:
**the console is not unstructured.** See section 1.2. It already has an 8pt
spacing scale, a 12 column grid, a validated two-theme chart palette, visible
focus rings, reduced-motion support and a render pass that fails the build on
sideways scroll and on mismatched card heights. The real defects are different
from the ones the brief names, and they are listed with evidence in section 1.3.

---

## 1. Phase 1: audit of the current console

### 1.1 What it is

| Property | Finding | Evidence |
|---|---|---|
| File | One self-contained HTML file, 6,172 lines | `app/dashboard.html` |
| Framework | None. Vanilla JS, template literals, no build step | whole file |
| Routing | `show(view)` over thirteen render functions, no URL routing | `dashboard.html:2328` onward |
| CSS approach | Single inline `<style>`, custom properties, BEM-free utility and component classes | `dashboard.html:680-1180` |
| Chart library | None. Hand-built SVG helpers (`area`, `donut`, `donutHealth`, `dayTable`, `Charts.*`) | `dashboard.html:1849` onward |
| Map | Leaflet 1.9.4, inlined, not from a CDN | `dashboard.html:9` |
| Data source | One `doGet` payload from Apps Script, cached 50 seconds server-side | `backend/Code.gs` |
| Tokens | 8pt spacing, named ink with contrast ratios, accent family, chart series | `dashboard.html:680-776` |
| Dark theme | A second validated palette, not an inversion | `dashboard.html:758-776` |
| Grid | 12 columns, `gap: 24px`, span classes `c3` to `c12` | `dashboard.html:1030-1031` |
| Breakpoints | Two: 1180px and 760px | `dashboard.html:1041-1042` |
| Render test | 7 views x 3 widths x 2 themes, fails on sideways scroll, mismatched card heights in a row, and hardcoded colours inside a chart | `tests/render-console.js` |

Thirteen views: `vOverview` (2328), `vTables` (2907), `vAnalytics` (2962),
`vAttendance` (3073), `vVillages` (3283), `vLeave` (3323), `vAdmin` (3925),
`vSchedule` (4744), `vNotices` (5086), `vMap` (5143), `vGpdp` (5356),
`vDuty` (5435), `vAdvisory` (5538).

### 1.2 What is already right, and should not be rebuilt

This matters as much as the defect list, because three of the top-ranked
patterns in section 4 are cheap precisely because these exist.

| Strength | Evidence |
|---|---|
| An 8pt spacing scale, used throughout | `--s1` to `--s6`, `dashboard.html:682` |
| A real 12 column grid whose rows sum to twelve | `.grid`, `.c3`-`.c12`, `dashboard.html:1030` |
| Chart colours as tokens, never literals, so the theme switch recolours without a re-render | `--cs1`-`--cs8`, `--co1`-`--co5`, `--st-*`, `dashboard.html:740-747` |
| A palette that was computed and validated, with the failure recorded | `prompt/palette-validation.txt`, comment at `dashboard.html:726-739` |
| Ink contrast measured and annotated (13.9:1, 6.9:1, 5.0:1) | `dashboard.html:694-697` |
| One focus language, never removed | `:focus-visible`, `dashboard.html:783` |
| Reduced-motion honoured | `dashboard.html:785` |
| Empty states that say what absence means | `.empty`, `dashboard.html:1005` |
| Sticky first two columns on the wide pivot | `.piv .pivh`, `dashboard.html:941` |
| A render pass that fails the build on layout faults | `tests/render-console.js` |

**The brief's premise that there is "no layout standard, inconsistent widget
sizes and spacing" is not supported by the code.** The spacing is on a scale,
the grid is twelve columns, and the cards in a row are already height-matched
by a test that fails the build otherwise.

### 1.3 Defects, with evidence

Ordered by harm.

| # | Defect | Evidence | Severity |
|---|---|---|---|
| D1 | **Below 760px the navigation rail becomes thirteen stacked full-width buttons above the content.** A supervisor on a handset scrolls roughly 840px of menu before the first figure. There is no drawer, no bottom bar and no collapse. | `.rail{position:static;height:auto}` at `dashboard.html:1042`; see `Info/console-render/390-light-overview.png`, in which the entire first screen is menu | High |
| D2 | **Overview is 3,218px tall at 1500px wide, about 2.1 screens.** It carries ten widgets of five different jobs: a changelog bar, five KPIs, a live roster, a map, a trend chart, a donut, a health meter, an exception list, an LLM chat desk and a 14-day table, then appends two more tables from `vTables`. | `vOverview` 2328-2422, `h+=vTables(j,A,true)` at 2421; `Info/console-render/1500-light-overview.png` | High |
| D3 | **The same figure is printed five times on one screen.** Villages filed (39) appears as a KPI, as the donut centre, as a tab in District activity, as a map filter chip, and as the mandal league total. The grade donut is rendered by two different views. | KPI 2357, donut 2382, tab 2367, league in `vTables` 2907, and the identical donut again in `vVillages` at 3293 | High |
| D4 | **Four different fixed scroll heights, three of them off the 8pt scale.** 262px, 340px, 352px, 372px. | 2398 (inline style, not a class), 999, 934, 898 | Medium |
| D5 | **A list clipped mid-sentence with no affordance.** The fifth item of "Needs your attention" is cut through the middle of a line by `max-height:262px`, which reads as broken rather than as scrollable. | `dashboard.html:2398`; visible at the foot of the card in `1500-light-overview.png` | Medium |
| D6 | **Thirteen flat destinations in a navigation rail.** Material 3 and SAP's Fiori guidance both put the collapsed rail at three to seven, and direct an expanded rail above that. | `dashboard.html:816-824`; [SAP Fiori for Android, navigation rail usage](https://www.sap.com/design-system/fiori-design-android/v26-4/components/m3-standard-components/navigation-rail/usage) | Medium |
| D7 | **A component means a different thing on each screen.** `.panel`'s top border and the rail item's background are recoloured per view (teal on attendance, violet on villages, amber on leave, red on notices). A reader cannot learn one colour language, and the status palette has to compete with it. | `dashboard.html:816-824` and `866-874` | Medium |
| D8 | **The page header wraps and runs on.** "Good morning, Sandeep Kumar" wraps to two lines at 1500px and the subtitle is four facts in one three-line paragraph, in the position that should carry the most important information. | `1500-light-overview.png`, top left | Low |
| D9 | **Two breakpoints only.** The 760 to 1180 band gets three-up KPIs but keeps the full-width 232px rail, and there is no tablet navigation treatment. | `dashboard.html:1041-1042` | Low |
| D10 | **A conversational tool sits in the middle of a monitoring screen.** The briefing desk and "Ask the figures" occupy a full-width card between the exception list and the fortnight table. | `dashboard.html:2403-2420` | Low |

Not found, and worth saying: no overlapping elements at any tested width, no
mixed chart conventions beyond what the data justifies, no missing empty
states, and no obvious contrast failure. D1 is the one that reaches a user
outside the Collectorate.

### 1.4 Entities and metrics every mockup must use

Read out of `app/dashboard.html` and `backend/Code.gs`. Nothing here is invented.

**Entities.** District (Jangaon), mandal (12), Gram Panchayat / village,
officer (Panchayat Secretary, MPO, MPDO, MSO, Collector), attendance mark,
mark-out, leave application, show-cause notice, reminder, 100-mark evaluation
(inspection), red flag, GPDP plan, advisory circular, schedule assignment,
place of duty (village office with coordinates), refusal (the `Outside` tab).

**Metrics.**

| Metric | Source | Note |
|---|---|---|
| Officers on the roll, present, on leave, not marked | `A.officersDue`, `A.present`, `A.onLeave`, `A.absent` | the unmarked are counted against the Leave register first |
| Marked before 10:00 | `A.by10` | |
| Accuracy of the fix | `r.acc`, printed as `±31 m` | `verified` means precise, never present |
| Distance from the place of duty | `r.dutyKm`, `FAR_DUTY_KM` = 3 km | measured to the nearest village the officer holds |
| Refused by the geo-fence | `fenceCheck_`, radius 5 km, `TENANTS[k].fence` | SJGP only |
| Refusal median and spread per officer | `fenceReport_` | a steady distance is a wrong office, not a wandering officer |
| Villages placed / unplaced | `gpPlaces_` | a point that cannot be believed counts with the unplaced |
| Villages evaluated, of total | `A.filed`, `A.cov.t` | counts villages, never rows |
| District average score, previous month | `A.avg`, `A.prevAvg` | |
| Grades A/B/C/D | `j.month.grades` | |
| Red flags | `j.month.rfCount` | |
| District health, five weighted parts | `A.health`, `A.parts` | Attendance, Coverage, Scores, Red flags, Leave desk |
| Mandal coverage | `j.coverage[]` with `done`/`total` | |
| Misses this month, notice stage | `monthMarks_`, `activeDaysUpto_`, `SCN_FROM_MISS`, `DEBIT_FROM_MISS` | calendar month, not the reporting month |
| Leave awaiting orders, and its age | `j.leave.pending` | an application counts once, twins folded |
| Schedule: set, filed, acknowledged, behind | `op=schedule`, `SCH_SHARE` | a plan, not a charge |
| Reporting month and its window | `cycleYm_`, `cycleFrom_`, `cycleTo_`, `CYCLE_DAY` = 10 | always offered with its window |

**Proposed, and marked as proposals.** Three figures appear in the mockups
that the register does not compute today. They are labelled in the files:

| Proposed metric | Where | What it would need |
|---|---|---|
| A per-mandal composite score and its month-on-month delta | pattern 09 | a weighting decision by the Collector, then arithmetic over figures that already exist |
| "Settled inside 48 hours" as a leave-desk measure | pattern 09, the composite | timestamps already on the Leave tab |
| Alert age in minutes on the queue | pattern 05 | the proposal timestamps already written |

---

## 2. Phase 2: ten layout patterns

Ten distinct families, not ten variations of one. A note on two candidates from
the brief that are not separate entries here: the **command-centre split
screen** is covered by pattern 05, which is the same family with a docked alert
queue, and the **report-dense table dashboard** is the leaf level of pattern 07
and the whole of pattern 06, so it is scored there rather than counted twice.

### 2.0 The catalog at a glance

| # | Pattern | Family | Origin | Best for | Fails when |
|---|---|---|---|---|---|
| 01 | KPI strip + chart grid | Analytical | Few; Power BI; Grafana | A known set of measures reviewed on a schedule | The reader's question is about one record |
| 02 | Navigation rail + content canvas | Admin console | Material 3; IBM Carbon; Ant Design Pro | Many sections, one authenticated operator | More than seven destinations, or a phone |
| 03 | Persona workspaces with top tabs | Role-scoped | Atlassian; Salesforce console; Fluent 2 | Several roles with different questions | Only one person ever signs in |
| 04 | Map-first geographic split | Geographic | Swachh Bharat; Jal Jeevan Mission; Esri ArcGIS Dashboards | Place is the index | Geography is not the question, or the network blocks tiles |
| 05 | Operations status wall | Operational | Grafana; Datadog; NOC walls | "What is wrong right now", read across a room | Anything about a month |
| 06 | Index table + detail drawer | Record-centric | Shopify Polaris resource index; Carbon data table; Salesforce | Finding and acting on records, in bulk | Summarising a district |
| 07 | Drill-down hierarchy with breadcrumb | Hierarchical | Power BI drillthrough; eGramSwaraj; Jal Jeevan Mission | Data that is literally a tree | Comparing across branches |
| 08 | Work queue and activity feed | Task-centric | Atlassian; priority inbox; ServiceNow | The screen's traffic is decisions | Reporting a position |
| 09 | Scorecard and delta ranking | Comparative | NITI Aayog Champions of Change; Swachh Survekshan Grameen | Comparing peer units over time | Fewer than two periods of data |
| 10 | Mobile-first card stack | Field-first | GOV.UK; Material 3 navigation bar; PWA | Readers on handsets | A 2560px monitor used for dense analysis |

### 2.1 Sources

Design systems and authorities:

- Material 3 navigation rail, three to seven destinations, expanded rail above that: [SAP Fiori for Android, navigation rail usage](https://www.sap.com/design-system/fiori-design-android/v26-4/components/m3-standard-components/navigation-rail/usage); navigation bar, two to five destinations: [SAP Fiori for Android, navigation bar usage](https://www.sap.com/design-system/fiori-design-android/v26-1/components/m3-standard-components/navigation-bar/usage); [Flutter NavigationRail](https://api.flutter.dev/flutter/material/NavigationRail-class.html)
- Nielsen Norman Group, charts on dashboards: use length and 2D position; avoid pie, donut, gauge and radar; colour does not encode magnitude: [Dashboards: Making Charts and Graphs Easier to Understand](https://www.nngroup.com/articles/dashboards-preattentive/)
- Nielsen Norman Group, operational versus analytical dashboards, and staged disclosure: [8 Design Guidelines for Complex Applications](https://www.nngroup.com/articles/complex-application-design/), [10 Usability Heuristics Applied to Complex Applications](https://www.nngroup.com/articles/usability-heuristics-complex-applications/)
- Nielsen Norman Group, tables are space-efficient and suited to comparing records: [Data Tables: Four Major User Tasks](https://www.nngroup.com/articles/data-tables/)
- Stephen Few, a dashboard is consolidated on a single screen and monitored at a glance; exceeding one screen is on his list of common mistakes: [Why Most Dashboards Fail](https://blogs.ischool.berkeley.edu/i247s13/files/2013/02/WhyMostDashboardsFail.pdf), [book review, UXmatters](https://uxmatters.com/mt/archives/2007/04/book-review-information-dashboard-design.php)
- IBM Carbon, data table as a compact layout for large quantities of data, and a dashboard page template: [Carbon component index](https://v10.carbondesignsystem.com/community/component-index/)
- Shopify, the resource index pattern: filter tabs, search, sortable columns, bulk selection and actions, and a documented requirement that the reader can return without the browser's back button: [Shopify resource index pattern](https://shopify.dev/docs/api/app-home/patterns/templates/resource-index), [Polaris IndexTable](https://polaris-react.shopify.com/components/tables/index-table)
- Ant Design Pro templates (Analysis, Monitor, Workspace, Standard Table, Card List): [Ant Design Pro getting started](https://v4-pro.ant.design/docs/getting-started)
- GOV.UK, design for small screens first starting with one column; two-thirds and two-thirds-plus-one-third; line length no more than about 75 characters; default maximum page width 1020px: [GOV.UK Design System, layout](https://design-system.service.gov.uk/styles/layout)
- UK Analysis Function, all dashboards must meet WCAG 2.2 A and AA, must zoom to 400% without text spilling, and must be keyboard navigable: [Testing dashboards for design and accessibility](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-testing-dashboards-for-design-and-accessibility); [GOV.UK Design System, WCAG 2.2 changes](https://design-system.service.gov.uk/accessibility/WCAG-2.2)

Operations consoles:

- Grafana rows as collapsible containers grouping related panels under a shared heading, nested up to three levels: [Grafana dashboard groupings](https://grafana.com/docs/grafana/v13.1/visualizations/dashboards/build-dashboards/create-dashboard/dashboard-groupings/)
- Grafana layout practice: most important metrics at the top, consistent panel sizes within a row, Z-pattern reading order: [MetricFire, 7 best practices for Grafana dashboard design](https://www.metricfire.com/blog/7-best-practices-for-grafana-dashboard-design), [Percona, tips for designing Grafana dashboards](https://www.percona.com/blog/designing-grafana-dashboards)
- Splunk: start with the user and not the data; be succinct; grid layout groups components naturally where absolute layout needs extra alignment work: [Dashboard design, getting started with best practices](https://www.splunk.com/en_us/blog/tips-and-tricks/dashboard-design-getting-started-with-best-practices-part-1.html), [Splunk Observability dashboard best practices](https://docs.splunk.com/Observability/data-visualization/dashboards/dashboards-best-practices.html)
- Datadog's own collection of dashboard practice: [DataDog/effective-dashboards](https://github.com/DataDog/effective-dashboards)

Indian government monitoring in this domain:

- NITI Aayog Champions of Change: a real-time dashboard that District Collectors enter data into, with a monthly delta ranking that rewards incremental progress rather than absolute level, over 49 indicators in five weighted themes: [Delta ranking of the Aspirational Districts](https://www.drishtiias.com/daily-updates/daily-news-analysis/delta-ranking-of-the-aspirational-districts/print_manually), [Champion of Change delta ranking](https://www.drishtiias.com/state-pcs-current-affairs/champion-of-change-delta-ranking), [NITI Aayog baseline ranking, March 2018](https://niti.gov.in/sites/default/files/2018-12/AspirationalDistrictsBaselineRankingMarch2018.pdf)
- Swachh Survekshan Grameen ranks States and Districts on quantitative and qualitative SBM-G parameters, weighting direct observation, citizen feedback and service-level progress: [PIB, SSG documents](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2021/sep/doc20219911.pdf), [SSG 2022](https://indiaenvironmentportal.org.in/reports-and-documents/swachh-survekshan-grameen-2022)
- Jal Jeevan Mission publishes State, district and village-wise coverage; the state district dashboards use a fixed template of a hierarchy header followed by summary fields: [JJM brochure](https://jaljeevanmission.gov.in/sites/default/files/publication_and_reports/jjm-brochure.pdf), [JJM Uttar Pradesh district dashboard, Rampur](https://www.jjm.up.gov.in/Dashboard/District/Rampur)

Power BI layout practice (community rather than Microsoft Learn, and labelled
as such): align every visual to an imagined 12 column grid; two to four primary
KPIs in larger tiles at the top left; eight to ten visuals per page:
[Developing effective Power BI reports](https://analytx.substack.com/p/developing-effective-power-bi-reports),
[Power BI report design best practices](https://awesome-copilot.github.com/instruction/power-bi-report-design-best-practices/).

### 2.2 The patterns in detail

Each entry gives the zones, the SJGP mapping, and ASCII wireframes at desktop
and phone. The standards checklist is identical for all ten and is stated once
at section 2.3, because all ten were built from one token set and one set of
primitives.

---

#### 01. KPI strip + chart grid

**Structure.** A sticky filter bar, a strip of five KPIs, a 12 column chart
grid whose rows each sum to twelve, a detail table at the foot. Filters sit
above everything and apply to everything. Drill-down is by tapping a KPI or a
table row.

**Best for.** A known set of measures reviewed on a schedule, by a reader who
already knows what the measures mean. **Fails when** the question is about one
record, or when the measure set grows past about ten.

**SJGP mapping.**

| Zone | Carries |
|---|---|
| Filter bar | register, reporting month with its window, mandal, role, search |
| KPI strip | marked attendance, not marked, villages evaluated, district average, refused by the fence |
| Grid row 1 | 14-day attendance trend (c8), evaluation outcomes donut (c4) |
| Grid row 2 | coverage by mandal, grouped columns (c12) |
| Grid row 3 | district health and its five parts (c5), needs your orders (c7) |
| Foot | mandal detail table with a sparkline per row |

```
DESKTOP 1440                                   PHONE 390
+--------------------------------------------+ +---------------+
| title                        [CSV][brief]  | | title         |
| filters: register month mandal role search | | filters (wrap)|
+------+------+------+------+----------------+ +---------------+
| KPI  | KPI  | KPI  | KPI  | KPI            | | KPI   | KPI   |
+------+------+------+------+----------------+ +-------+-------+
|  trend  (c8)         |  donut      (c4)    | | KPI   | KPI   |
+----------------------+---------------------+ +---------------+
|  coverage by mandal, columns        (c12)  | | trend         |
+-----------------+--------------------------+ +---------------+
| health   (c5)   | needs your orders  (c7)  | | donut         |
+-----------------+--------------------------+ +---------------+
|  mandal detail table                 (c12) | | columns  >>>  |
+--------------------------------------------+ +---------------+
```

---

#### 02. Navigation rail + content canvas

**Structure.** A persistent rail of destinations, an app bar, a content canvas
on the same 12 column grid. The pattern the console already uses, rebuilt to
Material's own guidance: destinations are **grouped** (Monitor, The month,
Orders), the rail collapses to 76px icons on a tablet, and below 760px it
becomes a bottom navigation bar of five with the rest behind More.

**Best for.** Many sections and one authenticated operator. **Fails when** the
destination count passes seven without grouping, which is the console's
position today, or on a phone with no bottom-bar treatment.

**SJGP mapping.**

| Zone | Carries |
|---|---|
| Rail, Monitor | Overview, Attendance, Place of duty, Map |
| Rail, The month | Villages, Analytics, Schedule, GPDP |
| Rail, Orders | Leave (badge), Notices (badge), Advisory, Admin |
| App bar | view title, date, register picker, primary action |
| Canvas | four KPIs, trend, donut, exceptions, coverage, today's marks table |

```
DESKTOP 1440                                   PHONE 390
+--------+-----------------------------------+ +---------------+
| SJGP   | Overview            [reg][brief]  | | Overview      |
|        | filters                           | | filters       |
| MONITOR+-----------------------------------+ +---------------+
| o Over | KPI | KPI | KPI | KPI             | | KPI  | KPI    |
| o Att  +-----+-----+-----+-----------------+ +------+--------+
| o Duty | trend         (c8) | donut   (c4) | | KPI  | KPI    |
| o Map  +--------------------+--------------+ +---------------+
| MONTH  | orders   (c6)  | coverage   (c6)  | | trend         |
| o Vill +----------------+------------------+ +---------------+
| o Anly | today's marks table         (c12) | | donut         |
| ...    |                                   | +---------------+
| ORDERS |                                   | | orders        |
| o Leav |                                   | +---------------+
| ...    |                                   | |[Tdy][Off][Vil]|
+--------+-----------------------------------+ +--[Ord][More]--+
```

---

#### 03. Persona workspaces with top tabs

**Structure.** The top-level axis is **who is reading**, not what is being
read. Four tabs, four genuinely different card sets, a visible scope bar naming
the reader and the scope, and a note stating that the server re-checks the
scope on every read.

**Best for.** Several roles with materially different questions. **Fails when**
only one person ever signs in, which is the console's position today, so this
pattern is a bet on opening the console to MPDOs.

**SJGP mapping.**

| Tab | Carries |
|---|---|
| Collector | the district: five KPIs, trend, exceptions, a mandal table that opens an MPDO's workspace |
| MPDO | one mandal: marked, not marked, filed, refused; his officers; his villages |
| MPO | the 40 per cent of the mandal's pendency set against him; his days; what is due |
| Panchayat Secretary | his own attendance, his villages, his leave balance, what is standing. No plan is offered: the register does not ask him for one |

```
DESKTOP 1440                                   PHONE 390
+--------------------------------------------+ +---------------+
| Swachh Jangaon                    [register]| | Swachh Jangaon|
+--------------------------------------------+ +---------------+
|[Collector][MPDO][MPO][Panchayat Secretary] | |[Coll][MPDO]>>>|
+--------------------------------------------+ +---------------+
| (avatar) S K Jha, Collector | All 12 | All | | (avatar) scope|
+--------------------------------------------+ +---------------+
| KPI | KPI | KPI | KPI (scoped to the tab)  | | KPI    | KPI  |
+-----+-----+-----+--------------------------+ +--------+------+
| trend                (c8) | orders   (c4)  | | trend         |
+---------------------------+----------------+ +---------------+
| the table this reader needs         (c12)  | | orders        |
+--------------------------------------------+ +---------------+
```

---

#### 04. Map-first geographic split

**Structure.** Geography is the index. A measure picker, twelve mandal cells
shaded by that measure, a docked side panel that answers for whichever cell is
chosen, a strip of district totals beneath.

It is a **tile map and not a choropleth**, deliberately. A true choropleth needs
a boundary file this repository does not carry and a tile server the district's
network blocks: the console's live map already prints "the map background is
blocked on this network" in the field. Twelve cells say the same thing about
rank and magnitude, read at any bandwidth, and cannot put a pin in the wrong
place.

**Best for.** When place is the question. **Fails when** it is not, and on a
phone, where a twelve-cell grid plus a side panel is two screens.

**SJGP mapping.**

| Zone | Carries |
|---|---|
| Measure picker | coverage, attendance, average score, refusals |
| Tiles | one per mandal, ordinal shading on one hue, full mandal name never abbreviated |
| Side panel | the chosen mandal: marked, filed, average, refused, its villages |
| Second panel | villages with no office, which fence nobody |
| Strip | district totals, including how much of the roll the order reaches |

```
DESKTOP 1440                                   PHONE 390
+--------------------------------------------+ +---------------+
| Where the district stands        [export]  | | Where it stands|
| filters: month | measure | find | unplaced | | filters       |
+-----------------------------+--------------+ +---------------+
| [cov][att][avg][refused]    | Jangaon      | | [cov][att]>>> |
| +-----+-----+-----+-----+   | marked 19/28 | +---------------+
| | Jan | Chi | Dev | Gha |   | filed   6/8  | | tile  | tile  |
| +-----+-----+-----+-----+   | avg    77    | +-------+-------+
| | Kod | Lin | Nar | Pal |   | refused  3   | | tile  | tile  |
| +-----+-----+-----+-----+   +--------------+ +---------------+
| | Rag | Tha | Bac | Zaf |   | its villages | | chosen mandal |
| +-----+-----+-----+-----+   | (table)      | +---------------+
|  legend 0% ---------- 100%  +--------------+ | its villages  |
+-----------------------------| no office    | +---------------+
| tot | tot | tot | tot       | (list)       | | tot   | tot   |
+--------------------------------------------+ +---------------+
```

---

#### 05. Operations status wall

**Structure.** A banner that states the district in one sentence, twelve mandal
tiles as traffic lights **sorted worst first**, a docked alert queue with ages,
three SLA clocks, and a live feed of marks as they arrive. Everything is
today; nothing is about the month.

The colour rule is strict: only `--st-ok`, `--st-warn`, `--st-bad`. A status
wall that uses eight series colours cannot be triaged.

**Best for.** "What is wrong right now", read quickly or from a distance.
**Fails when** the question is about a month, and it fails worse when the
thresholds are set so that most tiles are red: a wall that cries wolf is the one
screen a district stops reading. The first build of this mockup had eight of
twelve red and the thresholds were corrected.

**SJGP mapping.**

| Zone | Carries |
|---|---|
| Banner | per cent marked, the count unmarked and refused, and the one sentence that says which refusals are the register's own fault |
| Tiles | per mandal: marked of due, or refusals, or villages filed |
| SLA clocks | the 11:00 cut-off, leave past 48 hours, notices awaiting approval |
| Alert queue | the five P1-P3 exceptions with their ages and the act each needs |
| Feed | marks as they arrive, with accuracy and distance from duty |

```
DESKTOP 1440                                   PHONE 390
+--------------------------------------------+ +---------------+
|| 87%  39 not marked, 17 refused   18:00 175| || 87%  39 / 17 |
+--------------------------------------------+ +---------------+
| filters                  | [11:00][1][2]   | | filters       |
+--------------------------+-----------------+ +---------------+
| +----+ +----+ +----+     | ALERT QUEUE     | |[11:00][1] [2] |
| |ACT | |ACT | |ACT |     | P1 ...... 6m    | +---------------+
| +----+ +----+ +----+     | P1 ...... 18m   | | tile  | tile  |
| +----+ +----+ +----+     | P2 ...... 41m   | +-------+-------+
| |WTCH| |WTCH| |WTCH|     | P2 ...... 51m   | | tile  | tile  |
| +----+ +----+ +----+     | P3 ...... 96m   | +---------------+
+--------------------------+-----------------+ | alert queue   |
| marks as they arrive     | trend           | +---------------+
+--------------------------+-----------------+ | feed          |
```

---

#### 06. Index table + detail drawer

**Structure.** Saved views as tabs, a filter and search toolbar, the index
table, a bulk action bar that appears on selection, and a detail drawer that
opens over the list without leaving it. Below 760px each row becomes a card
with labelled lines, because a ten column index at 390px is a sideways scroll
nobody performs.

**Best for.** Finding and acting on records, especially in bulk. **Fails when**
the task is to summarise a district.

**SJGP mapping.**

| Zone | Carries |
|---|---|
| Saved views | All officers, Not marked today, Refused by the fence, On the notice ladder, On sanctioned leave |
| Columns | officer, role, mandal, village held, marked, accuracy, distance from duty, misses, status |
| Bulk actions | send a message, reset the PIN, export the selection |
| Drawer | today, this month, the ladder position, casual leave left, a 14-day chart, and where a refusal is steady, the sentence saying the office is wrong rather than the man |

```
DESKTOP 1440                                   PHONE 390
+--------------------------------------------+ +---------------+
| Officers                    [CSV][add]     | | Officers      |
+--------------------------------------------+ +---------------+
|[All][Not marked][Refused][Ladder][Leave]   | |[All][Not m]>>>|
+--------------------------------------------+ +---------------+
| search | mandal | role |      sort columns | | search        |
+--------------------------------------------+ +---------------+
| 3 officers selected    [msg][PIN][export]  | | +-----------+ |
+--------------------------------------------+ | | Name      | |
|[ ] Name  Role Mandal GP Mark Acc Km Miss St| | | Role:  PS | |
|[x] ....  .... ...... .. .... ... .. .... ..| | | Mandal: . | |
|[ ] ....  .... ...... .. .... ... .. .... ..| | | Status: . | |
|           (row click opens the drawer ->)  | | +-----------+ |
+--------------------------------------------+ | (drawer = a  |
|                     | DRAWER                | |  full screen)|
+---------------------+----------------------+ +---------------+
```

---

#### 07. Drill-down hierarchy with breadcrumb

**Structure.** The same four zones redrawn at every level: breadcrumb, a
summary of the level you are on, the children of that level as the table, and
one chart scoped to the level. District, then mandal, then village. The
breadcrumb is the whole of the back button.

At the leaf the table **is** the content, which is where the report-dense
government reporting family lives.

**Best for.** Data that is literally a tree, which this register's is.
**Fails when** the question compares across branches, which is pattern 09's job.

**SJGP mapping.**

| Level | Summary | Table | Chart | Side |
|---|---|---|---|---|
| District | marked, not marked, evaluated, average, refused | the twelve mandals | district attendance, 14 days | mandals ranked by coverage |
| Mandal | the same five, scoped | its villages, with office placed or not | mandal attendance | its officers |
| Village | filed, score, grade, red flags, office placed | the five parts of the 100 marks | score by month | who answers for it, and the note that the Secretary holds it but does not file it |

```
DESKTOP 1440                                   PHONE 390
+--------------------------------------------+ +---------------+
| Jangaon district > Palakurthy > Mustyala 2 | | District > >> |
+--------------------------------------------+ +---------------+
| Mustyala 2                     [up a level]| | Mustyala 2    |
| filters                                    | | filters       |
+------+------+------+------+----------------+ +---------------+
| sum  | sum  | sum  | sum  | sum            | | sum   | sum   |
+------+------+------+------+----------------+ +-------+-------+
| chart scoped to this level | who answers   | | sum   | sum   |
+----------------------------+---------------+ +---------------+
| the children of this level, as a table     | | chart         |
| (at the leaf: the five parts of 100 marks) | +---------------+
+--------------------------------------------+ | table    >>>  |
```

---

#### 08. Work queue and activity feed

**Structure.** Not a dashboard. A counted header of what is owed, the queue
grouped **by the act required** rather than by the module the item came from, a
narrow context column with the day in one line and a live stream, and an action
on every row that settles it in place.

**Best for.** A screen whose real traffic is decisions, which this console's
is: leave orders, show-cause approvals, a circular to retire. **Fails when** the
reader wants a position rather than a task list.

**SJGP mapping.**

| Group | Carries |
|---|---|
| Orders to pass | leave applications with their age, show-cause notices proposed, each with Sanction / Refuse with reasons / Approve and serve |
| The register is wrong and it is accusing somebody | steady-distance refusals, untrustworthy marks, villages with no office |
| Falling behind, a plan not a charge | villages still to evaluate, unacknowledged circulars, each labelled as raising no sanction |

```
DESKTOP 1440                                   PHONE 390
+--------------------------------------------+ +---------------+
| Your desk                         [register]| | Your desk     |
+--------------------------------------------+ +---------------+
|[12 all][4 first][7 leave][2 notices][4 pts]| |[12 ][4 ]      |
| filters                                    | |[7  ][2 ]      |
+-----------------------------+--------------+ +---------------+
| ORDERS TO PASS              | the day in   | | ORDERS TO PASS|
| P1 ........ [Sanction][...] | one line     | | P1 ..........|
| P1 ........ [Sanction][...] | 77 / 100     | | [Sanction]    |
| THE REGISTER IS WRONG       +--------------+ | P1 ..........|
| P1 ........ [Open the pts]  | as it happens| | [Sanction]    |
| FALLING BEHIND              | 09:44 ...    | +---------------+
| P3 ........ [Open sched]    | 09:37 ...    | | one line      |
+-----------------------------+--------------+ +---------------+
```

---

#### 09. Scorecard and delta ranking board

**Structure.** The composite and its published weights on the left, a podium of
three, the board itself, a comparison chart and a watch list. The board is
ordered by **movement** by default and by level on a switch, with both columns
always shown.

Why delta matters: a mandal with few villages and good roads tops an absolute
board every month whatever it does, and the board stops being read. Champions of
Change ranks month-on-month change for that reason.

**Best for.** Comparing peer units over time, in a vocabulary this district's
officers already read. **Fails when** there are fewer than two periods of data,
which the mockup's empty state says in as many words.

**SJGP mapping.**

| Zone | Carries |
|---|---|
| Composite | the console's own five-part health index, weights published and labelled as the Collector's, not the register's |
| Board | rank, mandal, composite, last month, movement, coverage, average, attendance, absolute rank |
| Chart | composite this month against last, per mandal |
| Watch list | mandals that fell two places or more, with the note that a fall is a question and not a finding |

```
DESKTOP 1440                                   PHONE 390
+--------------------------------------------+ +---------------+
| Where each mandal stands  [publish][CSV]   | | Where each ...|
| filters: month | rank by | show the parts  | | filters       |
+-------------+------------------------------+ +---------------+
| THE COMPOSITE| TOP THREE BY MOVEMENT       | | composite 77  |
| 77 / 100     | +--------+--------+-------+ | | weights       |
| Coverage 30% | | first  | second | third | | +---------------+
| Scores   25% | +--------+--------+-------+ | | first         |
| Attend   25% |  a board is a comparison,   | | second        |
| Flags    10% |  not a charge               | | third         |
| Leave    10% |                             | +---------------+
+-------------+------------------------------+ | +-----------+ |
| # Mandal Comp Last Move Cov Avg Att AbsRank| | | 1 Mandal  | |
| 1 ...... .... .... +5   ... ... ... ...    | | | Comp:  78 | |
+--------------------------------------------+ | | Move:  +5 | |
| composite chart     (c7) | watch list (c5) | | +-----------+ |
+--------------------------------------------+ +---------------+
```

---

#### 10. Mobile-first card stack with bottom navigation

**Structure.** Designed at 390 and widened. A compact app bar, a scrolling
filter row, one column of cards in **priority order**, a bottom navigation bar
of five. At 980px the same column lays across two tracks and at 1500px across
three. There is no separate desktop screen.

On one column there is no top-left, only a first card, so the order is the
hierarchy: where the district stands, then what needs the reader, then detail.

**Best for.** Readers on handsets, which is every officer in this district and,
on tour, the Collector. **Fails when** a 2560px monitor is used for dense
analysis: three tracks of cards is not a pivot table.

**SJGP mapping.**

| Zone | Carries |
|---|---|
| Hero | per cent marked, with a single stacked bar of marked / leave / refused / not marked |
| Four minis | villages evaluated, district average, refused by the fence, leave waiting |
| Cards | needs your orders, 14-day trend, mandals behind, quick actions, today's marks |
| Bottom bar | Today, Officers (badge), Villages, Orders (badge), More |

```
PHONE 390 (the design width)                   DESKTOP 1440
+---------------+                              +----------------------------+
| SJ Swachh ... |                              | SJ Swachh Jangaon          |
| [Today][Mon]>>|                              | [Today][Month][Mandals]    |
+---------------+                              +----------------------------+
| MARKED        |                              | 87%  | bar + key           |
| 87%           |                              +------+------+------+-------+
| ||||||||||||  |                              | mini | mini | mini | mini  |
+---------------+                              +-------------+--------------+
| mini  | mini  |                              | needs your orders   (wide) |
+-------+-------+                              +-------------+--------------+
| mini  | mini  |                              | trend       | mandals      |
+---------------+                              +-------------+--------------+
| needs orders  |                              | quick acts  | today's marks|
+---------------+                              +----------------------------+
| trend         |
+---------------+
| mandals behind|
+---------------+
|[Tdy][Off][Vil]|
|[Ord][More]    |
+---------------+
```

### 2.3 Standards checklist, applied identically to all ten

| Standard | How it is met | Verified by |
|---|---|---|
| 8pt spacing | `--s1` to `--s6` only; no arbitrary margins | `_shared/tokens.css` |
| 12 column grid | `repeat(12, minmax(0,1fr))`, rows sum to twelve | per-pattern CSS |
| One type scale | `--f-eyebrow` to `--f-metric-lg`, named once | `_shared/tokens.css` |
| Colour semantics | `--st-ok` / `--st-warn` / `--st-bad` reserved for status and never used as series 4; series are `--cs1`-`--cs8` in fixed order; ordered scales use the one-hue ramp `--co1`-`--co5` | `_shared/charts.js` |
| No hardcoded chart colour | every fill and stroke is a token through `style=""` | `_shared/charts.js` |
| Breakpoints | 1500, 1180, 980, 760, 620 as each pattern needs | per-pattern CSS |
| No sideways page scroll | asserted at 1440 and 390 | `shoot.js` |
| No element overflowing the viewport | asserted, excluding deliberate scroll containers and off-canvas panels | `shoot.js` |
| Cards in a row share a height | asserted to within 2px | `shoot.js` |
| No script errors | asserted | `shoot.js` |
| Touch targets | 44px minimum on every control | `_shared/chrome.css` |
| Focus visible | 3px ring, never removed | `_shared/chrome.css` |
| Reduced motion | honoured | `_shared/chrome.css` |
| Empty, loading, error | every pattern carries all three on one widget, switchable from the black bar | per-pattern JS |
| Dark theme | a second validated palette, switchable on every page | `_shared/tokens.css` |

Two accessibility items are **not** verified here and are listed as open in
section 4.5: a full keyboard traversal of each pattern, and the 400 per cent
zoom test the UK Analysis Function requires of government dashboards.

---

## 3. Phase 3: the mockups

Built, rendered and checked. `build.js` inlines the shared token set into each
file so all ten are self-contained; `shoot.js` renders each at 1440 and 390 and
**fails** on a script error, a sideways page scroll, an element overflowing the
viewport or two cards in a row differing in height by more than 2px;
`gallery.js` writes `index.html`.

```bash
npm i playwright --no-save                        # not a dependency, deliberately
node design-research/dashboard-layouts/build.js   # 10 self-contained files
node design-research/dashboard-layouts/shoot.js   # 22 checks, writes shots/
node design-research/dashboard-layouts/gallery.js # writes index.html
```

Current result: **22 passed, 0 failed.**

Seven defects were found by that pass and by looking at what it produced, and
all seven were fixed rather than accepted:

| Found | Fix |
|---|---|
| A 660px chart pushed the 390px page sideways by 302px | `CH.fit()` measures the container and draws at that exact pixel width, redrawing on resize and on the theme switch |
| A four-column tile map overflowed by 19px at 390 | the tile grid is 4 / 3 / 2 columns by width |
| Rotated mandal labels clipped at the foot of the SVG ("Devaruppula" read "-avaruppula") | bottom margin raised from 44 to 64 |
| "9 Oct" and "8 Oct" printed over each other at the right edge | the last tick anchors to the end, and a tick within 46px of it is dropped |
| Sample "today" was a Sunday, on which the attendance gate does not open, so every figure contradicted the doctrine | the sample day is Friday 9 October 2026 |
| 24 per cent of the roll unmarked turned eight of twelve status tiles red | the sample roll is 88 per cent marked, and the tile thresholds were set so the wall separates |
| The gallery header used `class="bar"`, which `chrome.css` defines as the 7px progress bar, clipping its own buttons to a sliver | renamed `.headbar`; a shared primitive set is a shared namespace |

Two things the check reported that turned out **not** to be defects, and were
left alone after measuring: a wide chart inside its own scroll container (which
is what the console's own pivot does on purpose), and a drawer parked at
`translateX(100%)`. The check was narrowed to tell those from real overflow
rather than the mockups being changed to satisfy it.

One deviation from the brief, stated: the gallery's thumbnails are the captured
screenshots, not live iframes. Ten iframes on one page is past what Chromium
paints at once; frames seven to ten came back blank and stayed blank after
scrolling, which is a gallery that lies about four of its ten. The live view is
one click away and the side-by-side bench is live.

---

## 4. Phase 4: comparison and recommendation

### 4.1 Weights

Mine, and arguable. Re-weighting re-ranks the board and moves nothing underneath it.

| Criterion | Weight | Why this weight |
|---|---|---|
| Fit for district > mandal > GP > village monitoring | 15 | the register's data is a tree and the Collector's questions follow it |
| Clarity for a non-technical official | 15 | the reader is a District Magistrate, not an analyst, and what the screen says can end in a show-cause notice |
| Mobile usability for field supervisors | 12 | the audit's worst defect is a phone defect, and 280 officers hold phones |
| Implementation effort on the current stack | 12 | one 6,172-line file, no framework, and a live register serving 414 officers |
| Information density without overlap | 10 | |
| Drill-down and filtering | 10 | |
| Geography support | 8 | the fence made place decide something on 10.10.2026 |
| Low-bandwidth on rural networks | 8 | the console's own map already reports blocked tiles in the field |
| Maintainability and consistency | 6 | |
| Accessibility, WCAG 2.2 AA | 4 | weighted low only because all ten inherit the same compliant primitives, so it does not separate them |

### 4.2 Scores

Each criterion scored 1 to 5. Weighted total out of 100.

| # | Pattern | Fit 15 | Clarity 15 | Mobile 12 | Effort 12 | Density 10 | Drill 10 | Geo 8 | Bandwidth 8 | Maint 6 | A11y 4 | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 07 | Drill-down hierarchy | 5 | 4 | 4 | 4 | 4 | 5 | 3 | 5 | 4 | 4 | **85.0** |
| 09 | Scorecard and delta ranking | 4 | 5 | 4 | 4 | 4 | 3 | 3 | 5 | 4 | 4 | **81.0** |
| 02 | Navigation rail + canvas | 4 | 4 | 4 | 5 | 4 | 3 | 3 | 4 | 5 | 4 | **80.0** |
| 08 | Work queue and activity feed | 3 | 5 | 5 | 4 | 4 | 3 | 1 | 5 | 4 | 4 | **77.2** |
| 06 | Index table + detail drawer | 4 | 3 | 4 | 4 | 5 | 5 | 2 | 4 | 4 | 3 | **77.0** |
| 04 | Map-first geographic split | 5 | 4 | 3 | 3 | 4 | 4 | 5 | 3 | 3 | 3 | **76.2** |
| 05 | Operations status wall | 3 | 5 | 3 | 4 | 5 | 2 | 3 | 5 | 4 | 4 | **75.6** |
| 03 | Persona workspaces | 4 | 5 | 4 | 3 | 4 | 3 | 2 | 4 | 3 | 4 | **74.2** |
| 10 | Mobile-first card stack | 3 | 4 | 5 | 3 | 3 | 3 | 2 | 5 | 4 | 5 | **72.2** |
| 01 | KPI strip + chart grid | 3 | 4 | 3 | 5 | 3 | 2 | 2 | 4 | 5 | 4 | **69.0** |

### 4.3 One line of justification per score that drives the ranking

| Pattern | Criterion | Score | Justification |
|---|---|---|---|
| 07 | Fit | 5 | district / mandal / village is literally the register's shape, and the same four zones serve all three levels |
| 07 | Drill-down | 5 | drill-down is the entire pattern, not a feature bolted to it |
| 07 | Bandwidth | 5 | one level is loaded at a time, so the payload is a fraction of today's whole-district read |
| 07 | Geography | 3 | it names places but does not show their relation; pattern 04 is needed beside it |
| 09 | Clarity | 5 | a ranked board with a movement column is a form this district's officers already read in Swachh Survekshan and Champions of Change |
| 09 | Drill-down | 3 | it compares twelve units well and goes no deeper |
| 02 | Effort | 5 | the console already is this pattern; grouping the rail and adding a bottom bar is CSS and a small markup change |
| 02 | Maintainability | 5 | nothing about the view functions changes |
| 08 | Mobile | 5 | a one-column queue of actions is the easiest of the ten to use on a handset |
| 08 | Geography | 1 | there is no place in it at all |
| 06 | Density | 5 | the index table carries more records per screen than anything else here |
| 06 | Clarity | 3 | a ten-column table is the least immediately legible of the ten to a non-technical reader |
| 04 | Geography | 5 | the only pattern in which place is the index |
| 04 | Effort | 3 | the tile map, the measure switch and the docked panel are all new code |
| 05 | Drill-down | 2 | a wall points, it does not explain; every answer is on another screen |
| 03 | Effort | 3 | four card sets and a scope model, and the server-side scoping is the real cost, not the layout |
| 10 | Effort | 3 | a genuine rewrite of the shell, even though the view bodies survive |
| 01 | Drill-down | 2 | filters at the top and nothing below them; the current Overview's actual weakness |

### 4.4 Ranked shortlist

#### First: 07, drill-down hierarchy with breadcrumb (85.0)

| | |
|---|---|
| What changes | Overview stops being a 3,218px scroll of ten widgets. It becomes the **district level** of one screen that also serves mandal and village. The twelve-mandal table, the per-mandal pages and the village page replace `vVillages`, most of `vTables` and the drill-down modals. |
| Reusable as-is | every chart helper, the whole token set, `gpRoll_`, `j.coverage`, `rowYm_`, the `.twrap` sticky-header table, the KPI card, the pill and grade classes |
| New code | a level/breadcrumb state machine (about 120 lines), three level definitions, URL routing so a level can be linked and the browser back button works |
| Effort | **0.6 FTE for 3 weeks**, including the render pass and suite changes |
| Risks | the payload is built for one whole-district read; levels want scoped reads or the saving is theoretical. The 50-second server cache helps and `fenceReport_`-style bounded reads are the precedent. Second risk: a breadcrumb with no URL routing is a back button that does not work, and the console has no routing today. |

#### Second: 02, navigation rail + content canvas (80.0)

| | |
|---|---|
| What changes | the rail groups into Monitor / The month / Orders, collapses to icons on a tablet, and **becomes a bottom bar of five below 760px**. This is the direct cure for D1 and D6. |
| Reusable as-is | everything. No view function is touched. |
| New code | rail markup and CSS, a bottom navigation component, a More sheet |
| Effort | **0.25 FTE for 1 week** |
| Risks | almost none. The one real risk is choosing which five destinations go in the bottom bar, which is a question for the Collector and not for the code. |

#### Third: 09, scorecard and delta ranking board (81.0 but third by judgement)

It scores above 02 and I am ranking it below, which needs saying rather than
hiding. It is the most *valuable* new screen of the ten: it answers "which
mandal is improving" in a form the district already reads, and nothing on the
console answers that today. But it depends on a weighting decision only the
Collector can make, and on at least two months of comparable data. 02 is a week
and removes a live defect. 09 should follow it, not precede it.

| | |
|---|---|
| What changes | a new rail destination. Nothing existing moves. |
| Reusable as-is | `A.parts` and `A.health` are already a five-part weighted composite; the arithmetic exists |
| New code | per-mandal composite, stored monthly so a delta exists, the board, the watch list |
| Effort | **0.4 FTE for 2 weeks**, plus one written decision on the weights |
| Risks | a published rank between mandals is read as a charge however it is labelled. The mockup says in as many words that it accuses nobody; that wording is load-bearing, not decoration. Second risk: the first month has no delta, which the empty state has to state rather than show zeros. |

### 4.5 Recommendation

**Do 02 first, then 07, then 09, and treat 04 and 06 as destinations inside 07
rather than as alternatives to it.**

The reasoning, in order:

1. **02 is a week and it closes the worst defect in the audit.** D1 is the only
   finding that reaches someone outside the Collectorate, and it is pure CSS and
   markup. Nothing else on this list should go before it.
2. **07 is the right spine for this register** because the register's data is a
   tree and the Collector's questions walk it. It also fixes D2, D3 and D10 as a
   side effect: when each level answers for itself, there is no reason to print
   the same figure five times or to put a chat desk between two monitoring
   widgets.
3. **09 is the best new thing on the list**, and it is third only because it
   needs a decision from the Collector that 02 and 07 do not.
4. **04 and 06 are not competitors.** 04 is what the Place of duty and Map
   screens should become; 06 is what the officer roll should become. Both are
   better as views inside 07's shell than as a layout for the whole console.
5. **05, 08 and 10 should not be adopted as the console's layout, and two of
   them are worth building anyway.** 08 is what the Collector's phone should
   show him; 10 is how that phone view should be laid out. Together they are a
   different product, a Collector's handset app, and they score as low as they
   do here only because the criterion is "layout for the monitoring console".
6. **01 ranks last and that is the finding, not a dismissal.** It is closest to
   what exists today. It scores lowest because filters at the top and a grid
   below is exactly the structure that produced a 2.1-screen Overview printing
   one number five times.

What I would not do: adopt 03. It is a bet on opening the console to MPDOs, and
the cost is not the layout, it is scoping every server read by mandal. That is a
decision about who may see what in a register that issues notices under the
Conduct Rules, and it should be taken on its own and not as a side effect of a
layout change.

Open items before any of this is built:

- a full keyboard traversal of the chosen pattern
- the 400 per cent zoom test the UK Analysis Function requires of government dashboards
- URL routing, which 07 needs and the console does not have
- whether scoped per-level reads are wanted, or whether the existing whole-district payload is sliced on the client

---

## 5. Executive summary

| # | Pattern | Fit score | Effort | Mockup | Screenshots |
|---|---|---|---|---|---|
| 07 | Drill-down hierarchy with breadcrumb | **85.0** | 0.6 FTE x 3 wk | [07-drilldown.html](07-drilldown.html) | [1440](shots/07-drilldown-desk.png) · [390](shots/07-drilldown-phone.png) |
| 09 | Scorecard and delta ranking board | **81.0** | 0.4 FTE x 2 wk | [09-scorecard.html](09-scorecard.html) | [1440](shots/09-scorecard-desk.png) · [390](shots/09-scorecard-phone.png) |
| 02 | Navigation rail + content canvas | **80.0** | 0.25 FTE x 1 wk | [02-nav-rail.html](02-nav-rail.html) | [1440](shots/02-nav-rail-desk.png) · [390](shots/02-nav-rail-phone.png) |
| 08 | Work queue and activity feed | 77.2 | 0.5 FTE x 2 wk | [08-feed.html](08-feed.html) | [1440](shots/08-feed-desk.png) · [390](shots/08-feed-phone.png) |
| 06 | Index table + detail drawer | 77.0 | 0.5 FTE x 2 wk | [06-master-detail.html](06-master-detail.html) | [1440](shots/06-master-detail-desk.png) · [390](shots/06-master-detail-phone.png) · [drawer](shots/06-master-detail-desk-open.png) |
| 04 | Map-first geographic split | 76.2 | 0.6 FTE x 2 wk | [04-geo-split.html](04-geo-split.html) | [1440](shots/04-geo-split-desk.png) · [390](shots/04-geo-split-phone.png) |
| 05 | Operations status wall | 75.6 | 0.4 FTE x 2 wk | [05-status-wall.html](05-status-wall.html) | [1440](shots/05-status-wall-desk.png) · [390](shots/05-status-wall-phone.png) |
| 03 | Persona workspaces with top tabs | 74.2 | 1.0 FTE x 4 wk | [03-persona-tabs.html](03-persona-tabs.html) | [1440](shots/03-persona-tabs-desk.png) · [390](shots/03-persona-tabs-phone.png) |
| 10 | Mobile-first card stack | 72.2 | 0.8 FTE x 3 wk | [10-mobile-first.html](10-mobile-first.html) | [1440](shots/10-mobile-first-desk.png) · [390](shots/10-mobile-first-phone.png) |
| 01 | KPI strip + chart grid | 69.0 | 0.2 FTE x 1 wk | [01-kpi-grid.html](01-kpi-grid.html) | [1440](shots/01-kpi-grid-desk.png) · [390](shots/01-kpi-grid-phone.png) |

Gallery, with side-by-side comparison of any two at 1440, 1280, 768 or 390:
[index.html](index.html).

**Recommended sequence: 02 (one week, closes the worst defect), then 07 (the
spine), then 09 (the best new screen). 04 and 06 become views inside 07.**

Effort figures are for one developer familiar with this codebase, and include
the render pass and the suite changes each would need. They do not include the
Collector's own review time, which for 09 includes a written decision on the
weights.

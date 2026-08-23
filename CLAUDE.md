# SJGP — Swachh Jangaon Gram Panchayat

A district sanitation register for Jangaon, Telangana. About 280 Panchayat
Secretaries, MPOs, MSOs and MPDOs across 12 mandals mark attendance and file a
monthly 100-mark village evaluation from their phones, often on weak rural
signal. The Collector & District Magistrate monitors it from a console.

**This is a government record, not an app.** What it writes is used to issue
show-cause notices under the Telangana Civil Services (Conduct) Rules 1964 and
to debit officers' casual leave. A defect here does not "cause a bad user
experience"; it accuses a person of a default they did not commit. Several of
the rules below exist because exactly that happened in production.

---

## Run this before you finish anything

```bash
npm test              # 646 assertions, 16 suites, against the real backend files
node tests/ladder     # one suite, with its detail
```

`tests/run.js` first checks that `backend/Code.gs` and `backend/Admin.gs`
parse, then runs every suite. The suites load the backend **from disk** — they
never hold their own copy of the logic, so a test cannot pass against a stale
duplicate. The same command gates the GitHub Action; nothing untested deploys.

Frontend has no automated tests. **Render it and look**, with Playwright, at
2560, 1500 and 390 px. Do not ship CSS you have not seen.

---

## The shape of it

| Path | What it is |
|---|---|
| `backend/Code.gs` | The whole server: `doGet`/`doPost` on Apps Script, over a Google Sheet |
| `backend/Admin.gs` | Manual district jobs — migrations, audits, repairs. Never called by the app |
| `app/index.html` | PWA shell: all CSS, all markup, the gates |
| `app/app.js` | The field app for officers |
| `app/dashboard.html` | The Collector's console, self-contained |
| `app/config.js` | **Not in the pack.** Holds the `/exec` address. Never overwrite it |
| `tests/` | The suites and the Apps Script mock |
| `.github/workflows/deploy.yml` | Tests → publish site → push and deploy backend → verify |

Sheet tabs: `Users` `GPs` `Inspections` `Attendance` `Leave` `Notices`
`Reminders` `Holidays` `Tokens` `Audit` `Voided` `Seen` `GPDP` `Advisories`
`AdvAck`.

Drive holds three areas, each made on first use: `SJ-SCORE Attendance`,
`SJ-SCORE GPDP` (by plan year, then mandal) and `SJ-SCORE Advisories`.

Columns are matched **by header name** (`headMap_`), never by position, and
`ensureHeaders_` appends new ones automatically. Adding a field to a `*_HEAD`
array is safe and needs no migration.

---

## Rules that were paid for

Each of these is a real failure that reached 280 officers. Do not undo them.

**1 — The phone's clock is not evidence.**
`markedAt` comes from the handset and drifts. A phone eleven minutes fast was
recording marks in the future and could push an honest officer past the 11:00
cutoff. Anything judging compliance uses `effMarkAt_()`, the earlier of the
claim and the district's `receivedAt`. A mark can never post-date its arrival.

**2 — A mark on the phone is not a mark the district has.**
Attendance is written locally and uploaded later; photo uploads fail for hours
on weak signal. The day is read at **18:00**, not mid-morning, and attendance
is read **three times** before leave is debited: at proposal, again at approval
(a late arrival marks the notice `CURED`), and again at settlement the next
morning. Never judge a running day.

**3 — Dates from the Sheet are not strings.**
Sheets stores typed dates as `Date` objects in the *spreadsheet's* timezone;
formatting them in the *script's* shifts them by a day. Worse, a US-locale
Sheet silently swaps day and month when both are ≤ 12 — nine of thirty
holidays were on the wrong date. Read via `holidayKey_()`/`dmy_()`. Where a
reading is ambiguous, let the data decide (a row named "Second Saturday" must
land on the second Saturday) rather than assuming.

**4 — `DB.leave` on the Collector's device holds the whole district.**
Anything per-officer must filter by phone. `leaveBalance` did not, and showed
"91 taken · 0 left" against every applicant. Normalise numbers — `'9…`,
`+91…` and plain forms are the same officer.

**5 — Every submission carries a fresh random id.**
So a double tap raises two independent applications. Overlap is refused
server-side in `saveLeave_`. Re-sending the *same* id is a retry and must keep
working.

**6 — The server decides; the client only asks.**
Every `doPost` re-checks role, ownership and balance. Never trust a client
figure, and never let the console's convenience become the authority.

**7 — Nothing is destroyed.**
Withdrawn evaluations go to `Voided`, closed duplicates become `WITHDRAWN`
rather than refused, reversed debits become `CANCELLED`. Every Admin.gs action
writes to `Audit`. A file must be producible afterwards.

**8 — Idempotence everywhere.**
Triggers, settlements, migrations and repairs all run twice without changing
anything the second time. Assume every job will be re-run by a nervous
official.

**9 — Silence under sanction is leave, not absence.**
An officer whose leave the Collector approved rightly writes no attendance
row. The console once read that silence as absence and showed ninety
sanctioned officers as unmarked on a festival day. Anything that counts the
unmarked consults the Leave register first, as the notice engine always did.
And the village roll counts **villages, never rows** — duplicate GPs rows and
exact-string matching once showed filed-plus-pending overshooting the
district. Read the roll through `gpRoll_`, match names case-blind.

---

## Doctrine of the notice ladder

Working days only — Sundays and the `Holidays` tab are never counted. The
2026 tab carries G.O.Rt.No.1715 (dt. 06.12.2025): the 27 General Holidays and
every second Saturday, loaded by `applyTsHolidays()`; Annexure-II's optional
holidays are an individual's choice of five and are deliberately not on it.

- Misses **1 and 2** of a calendar month → a **reminder**. Pushed at once,
  unnumbered, off the register, no lock, no debit.
- Miss **3** (`SCN_FROM_MISS`) → a show-cause notice is **proposed**.
- **Nothing is served without the Collector's approval.** The trigger only
  proposes. Approval assigns the `/SJSP-SCN/` number, locks the officer's app
  and sends the email.
- From `DEBIT_FROM_MISS`, one day of CL per further unmarked day; LOP once the
  year's CL is exhausted.
- Acknowledgement is receipt, not excuse. Only attendance cures.
- A late mark, or one received late, draws an advisory reminder and is **never
  a miss** — the officer did his part.
- **MSO attendance is voluntary** (Collector's order, 19.08.2026). An MSO may
  mark and the mark is recorded; an MSO's silence draws nothing — no reminder,
  no notice, no debit, no seen ping. `attExempt_` carries the rule;
  `applyMsoRelief()` in Admin.gs took back what stood against MSOs before it.

Misses are counted from the **attendance record**, over days the district was
demonstrably running (`activeDaysUpto_`), not from reminders sent. So a late
sync lowers the count by itself, and switching the rule on mid-month cannot
manufacture a fortnight of misses.

---

## Documents: the plan and the circular

Two registers collect and distribute documents. Neither is part of the notice
ladder, and that is deliberate.

**GPDP** — every active officer but the Collector is called for one Gram
Panchayat Development Plan a year (April–March, so a plan filed in March 2027
is 2026-27). PDF, Word or Excel, up to 8 MB; the file goes to Drive before any
lock is taken, and a second filing marks the first `REPLACED` rather than
overwriting it. `op=gpdp` returns the officer his own line and the district the
whole roll. **The plan endpoint sits ABOVE the viewer guard in `doPost`** — a
GPDP is filed by the officer who holds the Gram Panchayat, which is the very
role that may not file an evaluation. Move that line down and the district
calls every Secretary for a plan and then refuses to take it.

**Advisories** — the Collector publishes one circular with one line of
instruction from the console. It opens by itself on every officer's home screen
until acknowledged, and stays in the app afterwards under More ▸ Advisories, so
a circular is never read once and lost. Publishing a new one marks the standing
one `SUPERSEDED`; the receipts already given stand. `advAck` is idempotent — a
double tap or a re-send writes no second receipt.

**Neither accuses anyone.** A missing plan and an unacknowledged circular raise
no reminder, no notice, no debit and no lock. An acknowledgement is **receipt,
not compliance** — it records that the officer saw the circular, never that he
acted on it, and the app says so on the button. An obligation of that weight is
created by the Collector's written order, not by a table. The suites assert
this; if it is ever to change, change it there first.

## House style

The prose in this project is plain, unhurried, and written for an officer
reading it under pressure, not for a developer. Comments explain **why**,
usually naming the failure that forced the design. Match it — the codebase
reads as one voice and should stay that way.

Notices follow the signed `/SJSP-SCN/` series: dates as `dd.mm.yyyy`, the
Government of Telangana heading, Rule 3 of the Conduct Rules, 48 hours, and
the Collector's signature block. The register keeps ISO dates; every served
copy carries the district's format.

Palette: cool paper `#F3F4F9`, indigo `#4A40CE`, a single indigo→teal gradient
used **once** per screen. Mono uppercase eyebrows. No webfonts, ever — the app
must open with no signal.

**Charts are a separate, validated palette — do not pick chart colours by eye.**
The console's series live in `--cs1…--cs8` (categorical, fixed order, never
cycled), `--co1…--co5` (ordinal, one hue) and `--st-*` (reserved status). They
are *not* the house accents: building the series from `--pri`/`--teal` was
tried and failed the validator — the house teal falls under the chroma floor
and renders grey, and house red against house amber measures ΔE 9.1 for
**normal** vision against a floor of 15. The record, including that failure, is
`prompt/palette-validation.txt`. Re-run it before changing any series colour:

```bash
node <dataviz-skill>/scripts/validate_palette.js "<hex,…>" --mode light --surface "#FFFFFF"
node <dataviz-skill>/scripts/validate_palette.js "<hex,…>" --mode dark  --surface "#171B2D"
```

The console has a **dark theme** — a second validated palette, not an
inversion — remembered per device and defaulting to light. Every colour the
charts draw is a custom property, so the switch recolours them with no
re-render. A hardcoded hex in a chart is a defect: it is invisible on the dark
card and nobody notices until the console is opened in front of the district.

Chart forms follow the data's job, not habit: a ratio against a limit is a
**meter**, never a two-slice ring; an ordered scale (hours, ten-mark bands) is
**one hue light→dark**, never a rainbow; magnitude charts are laid out in
**HTML at exact pixel sizes**, never in a scaled `viewBox`, so a ten-row chart
and a three-row chart line up side by side. `prompt/dashboard-charts-prompt.md`
carries the full method.

Before shipping a console change, run the render pass — it measures what
looking cannot:

```bash
node tests/fixture-dashboard.js     # a real payload from the real backend
node tests/render-console.js        # 6 views × 3 widths × both themes
```

It fails on sideways scroll, on cards in one row that differ in height, on a
hardcoded colour inside a chart, and on any script error, and leaves the
screenshots in `Info/console-render/`.

The document registers have a browser test of their own, which drives the real
field app and the real console and writes a report with snapshots:

```bash
node tests/fixture-docs.js          # payloads from the real backend
node tests/render-docs.js           # 35 checks; Info/docs-render/REPORT.md
```

It signs the app in by writing the session on the origin **without loading
index.html first** — the app builds an empty store on load and its own
debounced save puts `session:null` straight back over anything written after.

Playwright is deliberately **not** a
dependency — install it with `npm i playwright --no-save` when you need it, so
the deploy Action stays light.

---

## Never

- Put a real `SALT` or API key in the repository. The salt lives in Script
  Properties; `SALT_FALLBACK` stays as the placeholder. The Action blocks it.
- Overwrite `app/config.js` or the published root copies. Edit `app/` and
  `backend/` only; the Action publishes to root.
- Use `localStorage` in an artifact, or add a CDN font.
- Automate anything in `Admin.gs`. Those change the district's records and the
  Collector presses that button, not a robot.
- Reduce a safeguard to make a test pass. If a test fails, the code is wrong
  until proven otherwise — and if the test itself is wrong, say so out loud.

---

## Working with Sandy

Sandeep Kumar Jha, IAS — Collector & District Magistrate, Jangaon. Terse and
directive. Wants an honest expert assessment, not agreement. Say plainly when
something cannot be done, when a design is a guess, and when a fault is yours.

He works in the browser. Prefer solutions that do not need a terminal, and
when one does, say so up front rather than after twenty minutes.

Before claiming something works: run it. Before claiming a screen looks right:
render it. A green tick that was never executed is worse than no tick at all —
one of these suites once passed for the wrong reason, and that near-miss is
why the tests load the backend from disk.

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
npm test              # 1038 assertions, 23 suites, against the real backend files
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

Drive holds four areas, each made on first use: `SJ-SCORE Attendance`,
`SJ-SCORE GPDP` (by plan year, then mandal), `SJ-SCORE Advisories` and
`SJ-SCORE Backups`.

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

**10 — "Verified" is not "present at the place of duty."**
`verified` on a mark means only that the handset returned a fix precise to
within 250 m. It says nothing about *where*. A phone 70 km away under open sky
returns a **better** reading than one inside the panchayat office, and the
console printed the word "verified" against it — asked from the district in
those words: *how is the app taking attendance for people who are 50 or 70 km
away.* Nothing was checking the place, because the register has nothing to
check against: the `GPs` tab is `Mandal, GP` and carries no coordinates, and
`suspectMark_`'s box is the whole region, some 300 km across. The console now
says `±31 m` — what it actually measured — and carries the **distance from the
officer's own mandal**, located by the **median** of that mandal's own marks
(a mean is dragged towards the very marks it is meant to find; three readings
minimum, because one mark is not a mandal, and a distance off an untrustworthy
reading is not a distance). **It accuses nobody**: no reminder, no notice, no
debit, no lock, and the mark stands. An officer may be at a mandal meeting, at
the Collectorate or on tour — the register cannot know which, and a table must
not decide it. Whether a distance is a default is read by the Collector on the
facts, under the Conduct Rules.

---

## Doctrine of the notice ladder

Working days only — Sundays and the `Holidays` tab are never counted. The
2026 tab carries G.O.Rt.No.1715 (dt. 06.12.2025): the 27 General Holidays and
every second Saturday, loaded by `applyTsHolidays()`; Annexure-II's optional
holidays are an individual's choice and are deliberately not on it — the G.O.
grants five a calendar year, and **the Collector's order reduces 2026 to
three** (`OH_REDUCED_YEAR` / `OH_REDUCED_BALANCE`, mirrored in the app, scoped
to the year so 2027 takes the five back by itself). An order of this kind
**reaches forward only**: the cap is checked at sanction against what is
already APPROVED, so an officer who already holds four for 2026 keeps all four
and is refused the next one. Nothing is reversed, no debit arises, and no
sanction already passed is disturbed.

**Medical leave answers to no yearly figure, but a spell is capped.** An
illness does not keep to an allowance, so `ML` is 0 in `LEAVE_ENTITLEMENT`
for that reason and not because it is free. The Collector's order is that no
officer takes more than **fifteen days of medical leave at a time**
(`ML_MAX_SPELL`, mirrored in the app). **The cap is on the spell, not on the
application** — fifteen days applied for today and fifteen more beginning the
next morning is thirty days at a time, whatever the two rows say — so
`mlRun_` measures the unbroken run of medical leave already applied for or
sanctioned on either side of the dates asked for, and a clear day between two
spells makes them two. It is measured off the **dates**, never off the day
count the phone sends. A longer absence is not forbidden here; it is simply
not a thing this register grants, and the officer is told to take it to the
Collector under the leave rules.

**The leave account card names the kinds of leave; it does not price them.**
By the Collector's direction (25.08.2026) it carries no allowance, no "taken"
and no balance chip — only the names, with a line against medical leave
because a rule is not an allowance, and one against the headquarters
permission because it is not leave at all. What an application would leave him
is still worked out live, against the dates he has actually picked, in the
note under the apply form, and the district still refuses at sanction anything
that would breach the year. The prose note explaining the 2026 casual-leave
opening balance went with the figures: it existed to explain a number the
screen no longer shows.

**An order is passed on the APPLICATION, not on a row.** Before `saveLeave_`
took the script lock, a retry racing its original could append the same
application id twice. The Collector's order then settled the **first** of the
two rows and left the twin PENDING — and that twin could never be settled
afterwards, because every further order looked the id up, found the first row
already APPROVED and answered *orders have already been passed*. It stood in
the console's **Awaiting your orders** for as long as the register lasted:
reported from the district on 25.08.2026 as *leave already sanctioned but
still showing in waiting*. `leaveRows_` now returns every row carrying an id;
a decision or a withdrawal is written to all of them, and an application counts
as waiting if **any** row of it is waiting. `leaveFold_` folds twins on the way
out of the console payload and `op=leave`, keeping the decided row, so one
application is one line everywhere. **A leave row with no id is not an
application** — it cannot be decided, because every order is passed by id — so
it is left out rather than shown as one more officer awaiting orders, exactly
as a blank row once became "the standing advisory". And a duplicated row is not
a second absence: `clUsed_` and the sanction-time balance count an application
once, or a twin would exhaust a year's casual leave and turn the next debit
into loss of pay. The rows already on the register are settled by
`showLeaveTwins` / `settleLeaveTwins` in Admin.gs, under the Collector's hand
— copying the order that was actually passed, never inventing one, and leaving
any application with no decision on it for his orders.

Note while debugging the console: **the dashboard payload is cached for 50
seconds** server-side, so two reads in quick succession are the same read.

**A PIN reset goes to every row carrying the number.** A reset used to mean a
line in a `FIELD_FIXES` batch — a code edit and a deploy for one Secretary.
`showPinReset` / `resetOnePin` in Admin.gs do it for one number from the menu,
and they write the new PIN to **every** row that carries it: `findByPhone_`
takes the PIN from the *first* row holding one, so a reset written to the row
somebody meant to fix hands the officer a PIN that does not open the app — that
is issue 4 of the 22.08 register, and it came back three times as "still
showing wrong PIN". The rows carry the same number, so they are the same man;
the duplication itself is a separate cure, a `claimPhone` line. The reset also
clears the wrong-PIN counter, because **no PIN opens the app while ten failures
stand within the hour** and a reset without it reads to the mandal as another
failure. The PIN is seeded from the number and **today's date**, so a nervous
second run the same day is the same reset and writes nothing, while a reset
tomorrow is properly a new one. It is printed **once**, in the log: the Audit
tab records that a reset was passed and by whom, never the PIN.

**The officer roll lives on the console, under Admin.** `op=roll`,
`userCreate`, `userPin` and `userActive` are the Collector's alone, re-checked
on the server against his own token — the rail item is hidden from anybody
else and the console has always been Collector-only at the door, but hiding a
button is a courtesy, not a rule. **There is no delete and there will not be
one**: taking an officer off the roll writes `Active = FALSE`, and the row
stays along with everything pointing at it — his attendance, his notices, his
leave, his plan. It is reversible, and his own PIN still works when he is put
back. Deleting the row would orphan all of it and no file could be produced
afterwards, which is the whole of rule 7. Registering refuses a number already
on the roll and names its holder, because one number on two rows is what makes
the app greet a man with somebody else's name. A PIN is returned in the answer
to the call that made it, shown once on the console, and written nowhere —
`Audit` records that a PIN was set, on which number and by whom, never the PIN.
`dayPin_` in Code.gs is the single derivation the console and Admin.gs both
read, so the two can never hand out different PINs for the same officer.

- Misses **1 and 2** of a calendar month → a **reminder**. Pushed at once,
  unnumbered, off the register, no lock, no debit. **A reminder names no
  sanction.** By the Collector's direction (28.08.2026) it says only
  *Attendance not marked* — it does not count his misses at him, does not
  name the show-cause notice and does not mention casual leave. Those belong
  to the notice, which is signed, numbered and served; a reminder is not the
  place to rehearse a sanction that has not arisen and may never arise. The
  occasion is still kept on the `Reminders` tab, and the ladder still counts
  from the attendance record — only the wording changed. `reasonText_` and
  the reminder mail carry the rule; the suites assert the words are absent.
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
instruction from the console. It is addressed by **role and by mandal, and the
two compose**: `audience` is ALL or a role (PS/MPDO/MPO/MSO), `mandals` is
empty for the whole district or the mandals it is confined to — so *the
Secretaries of Chilpur and Jangaon* is one circular, not three. Mandal names
match case-blind and trimmed, because the roll spells `Ghanpur (Stn)` three
ways and a circular must not miss a mandal over a capital letter. The composer
says how many officers a choice reaches **before** it reaches them, from counts
the server sends, and holds the typed title and line across a re-render — they
used to be wiped by choosing a role, and the Collector would have written the
circular twice. It opens by itself on every officer's home screen
until acknowledged, and stays in the app afterwards under More ▸ Advisories, so
a circular is never read once and lost. Publishing a new one marks the standing
one `SUPERSEDED`; the receipts already given stand. `advAck` is idempotent — a
double tap or a re-send writes no second receipt.

**Nothing goes off the console either.** `op=advisory` carries `list` — every
circular the district has issued, newest first, each with the roll it addressed
and the receipts it collected — and the Collector may open any of them by
passing `id`, which rebuilds the register officer by officer against that
circular. It had always been SUPERSEDED rather than deleted, but the console
could read only the circular in force, so publishing a new one took the
previous circular and its whole read/unread register off the screen and it
looked as though the tracking had been thrown away. An officer is never handed
a retired circular by asking for one: history is not an instruction.

**A receipt is written on the phone before the wire is tried.** An officer who
presses *I have read this* is never shown that circular again on that handset —
the acknowledgement is recorded locally, the sheet closes at once, and the
receipt is queued and retried if the district could not be reached. It used to
be recorded only when the server answered, so a dropped signal on a village
road meant the circular opened again the next morning, and the morning after
that. Reported from the field in those words: *"even once I acknowledged the
advisory it keeps coming to my screen, which is annoying."* **The receipt the
phone holds beats the district's answer, everywhere and not only in the modal.**
`refreshAdvisory` overwrote `DB.adv` wholesale, so a receipt still queued came
back as `acknowledged:false` and the pinned card, the badge and the plan prompt
all went back to chasing him — the modal stayed shut, but to the officer that
is the circular coming back, and it was reported a second time in the same
words. `advPending()` and the refresh both read `advDone` now. And a circular
with **no id** is never shown at all: the handset remembers by id, so an id-less
one could be neither recorded nor matched and would open every single time —
`activeAdvisory_` skips blank rows, whose empty status column otherwise reads
as ACTIVE. The plan prompt is
shown **once a day**, not once an opening, for the same reason — the card is
pinned to the top of the home screen the whole time it is outstanding, and a
modal every time an officer opens the app is how he learns to dismiss things
unread.

**Neither accuses anyone.** A missing plan and an unacknowledged circular raise
no reminder, no notice, no debit and no lock. An acknowledgement is **receipt,
not compliance** — it records that the officer saw the circular, never that he
acted on it, and the app says so on the button. An obligation of that weight is
created by the Collector's written order, not by a table. The suites assert
this; if it is ever to change, change it there first.

## Weather

Open-Meteo, because it needs **no key and no account** — a credential in a
government repository is the one mistake this project already has a rule about.
One request an hour carries every mandal, cached in the script cache; the
handsets ask the district, never the service. Mandals are located from the
district's **own attendance marks** — the average of the located marks in a
mandal is a point inside it — and a mark outside the district's box is ignored
rather than averaged in.

Rainfall is classed the way the **India Meteorological Department** classes it
(light 2.5–15.5 mm, moderate 15.6–64.4, heavy 64.5–115.5, very heavy
115.6–204.4, extremely heavy above that). A district officer already reads
those words in that sense; a scale invented here would mean something different
to him than to everyone else in the state.

**It forecasts; it does not warn.** Nothing here is an IMD warning and nothing
goes out by itself. The console *drafts* a message from the figures and the
Collector passes it — and it is published through the **advisory** pipeline, so
a weather warning opens on every home screen and the district can see who has
read it. One pipeline, one acknowledgement register.

## The backup

Ordered on 29.08.2026: *backup entire system and run daily backup for all
sheet, app script, code and all things.* `dailyBackup()` at ~01:00 takes the
six things that are the system, and they live in six places — which is why
nothing before it backed up "the system":

- the **register**, twice: a native Sheets copy that restores in one click,
  and an `.xlsx` that opens on a machine that has never heard of Google;
- the **server**, fetched from the repository the deploy pipeline pushes
  *from*, so no new OAuth scope is needed and the live web app is never sent
  back for re-authorisation. Set the script property `SCRIPT_API=1` to read
  the live project through the Apps Script API instead, once that API is on;
- the **app and the console**, fetched from the published site — the exact
  bytes a handset loaded that morning, not what the repository says they were;
- the **documents**, *inventoried and not copied*. Seventy thousand attendance
  photos cannot be duplicated nightly, and a manifest naming every file, its
  id and its size is what tells you one has gone missing — which a copy of
  Drive inside Drive was never going to protect you from. Plans and circulars
  are named one by one; the photo areas are counted;
- the **script properties**, as names and **fingerprints only**. The salt is
  never written. Lose it and not one PIN verifies and 280 officers need a
  reset; the fingerprint is what lets a salt typed back by hand be *proved*
  right before anybody is locked out. A backup carrying the district's secret
  is a second place to lose it from.

**Nothing is destroyed** (rule 7). Retention bins; it does not delete, so it
is recoverable for a further thirty days in Drive's own bin. Dailies are kept
`BACKUP_KEEP_DAYS` (30); the **1st of every month is kept for good**. Only
files this job made, only inside `SJ-SCORE Backups`, only ones whose name
carries a date, are ever touched — the live register is not in that folder.

**It runs twice without doubling** (rule 8), and each step asks whether its
own output is already there, so a run that failed halfway is *completed* by
the next one rather than restarted. **Each step is caught on its own**: one
broken step never costs the other six, and the morning mail carries the
failure in its subject line. A backup that fails quietly is a belief, not a
backup — and for the same reason `showBackups()` in Admin.gs reads the folder
and names the days that are **missing**, walking the calendar rather than the
folder. A job that has been failing for three weeks looks exactly like one
that is working.

Restoring is deliberately not a menu item. Putting a backup back over a live
government register is the Collector's own act, done by hand.

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
node tests/render-docs.js           # 71 checks; Info/docs-render/REPORT.md
node tests/render-admin.js          # 19 checks; presses the Admin view's buttons
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

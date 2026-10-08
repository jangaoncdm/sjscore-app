# Standing up the District HRMS

The third register: the district's leave management, for the whole
establishment. It is a **third Apps Script project bound to a third
spreadsheet**, exactly as the Gram Palana register is — there is no Tenant
column and there must not be one. Two spreadsheets cannot leak into one
another because there is nothing between them to leak through, and that is
the whole of the isolation.

## What it is, and what it is not

It takes **leave and nothing else**. No attendance is asked of anybody, so no
reminder, no show-cause notice, no casual-leave debit and no lock on the app
can reach an employee. The 100-mark evaluation, the filing schedule and the
development plan are all off. `TENANTS.HRMS` in `backend/Code.gs` carries it
and suite 34 holds it there.

## 1 — The spreadsheet

Make a new Google Sheet. Name it so nobody confuses it with the other two:
**`District HRMS · Jangaon`**.

Add a tab called `Config` with two columns and one row:

| Key | Value |
|---|---|
| TENANT | HRMS |

That tab is what tells the register what it is. A Script Property named
`TENANT` set to `HRMS` outranks it and does the same job; the tab is preferred
because it travels with the data it describes and cannot be pushed away by a
deploy.

## 2 — The project

Create an Apps Script project **bound to that sheet** (Extensions ▸ Apps
Script). Copy in every file from `backend/` — `Code.gs`, `Admin.gs` and every
`Feature*.gs`. Deploy it as a **web app**, executing as you, accessible to
anyone with the link.

Confirm it knows what it is before going further:

    <the new /exec>?op=diag

It must answer `"tenant":"HRMS"`. If it says `SJGP`, the Config tab was not
read — a register that fails to identify itself lands on the one that already
exists, deliberately, and that is the wrong register for this data.

## 3 — The salt

Set the script property `SALT` to a long random string, **different from the
other two registers'**. It is what PINs are hashed with. It is never in this
repository and never in a backup; lose it and every employee needs a reset.

## 4 — The app

Write `hrms/config.js` (copy `hrms/config.example.js`) with the new `/exec`
address, and commit it. The deploy Action publishes `hrms/` only once that
file exists, and never overwrites it.

## 5 — Your own row, by hand

**A new register is one nobody can sign in to, including you.** The Users tab
is empty, the console is Collector-only at its door, and the one action that
puts an officer on the roll is itself behind a sign-in. Step 6 cannot be
reached until this is done, and nothing else can do it.

So open the new spreadsheet, go to the **`Users`** tab, and type **one row**:

| Phone | Name | Role | Active | EmpId |
|---|---|---|---|---|
| `9625701988` | Sandeep Kumar Jha | `COLLECTOR` | `TRUE` | `ADMIN1` |

Leave `Hash` and `InitPin` **empty** — a row with no PIN is precisely what the
app offers the claim to. `EmpId` is the second factor and it is yours to
choose; it is used once and never again. Type the number with a leading
apostrophe (`'9625701988`) so the sheet keeps it as text, as every other
mobile number on these registers is kept.

Then open **`/hrms/`** on your own phone, sign in with that number, and the app
will ask for the employee id and let you **choose your own PIN**. Nobody issues
it to you and the register stores no copy of it; `Audit` records that a PIN was
set and never the PIN.

There is no bootstrap key to plant and no `Admin.gs` job to run. You write the
row and you claim it — both halves yourself, which is the rule rather than a
way around it. Section 7a of suite 34 drives this exact row through the real
backend: the claim is offered, a wrong id is refused, the right one returns you
as `COLLECTOR`, the PIN you chose signs you in, and the row cannot be claimed
twice.

Add a second row the same way for anyone else who must have the register before
the establishment is pasted. Everybody else arrives in step 6.

## 6 — The establishment

Switch the console to **District HRMS** (the register picker, top left), then
Admin ▸ **The district establishment**, and paste the office's own list in
the shape it keeps it in:

    Sl.No · Section · Designation · Name of the Officer · Mobile No

**The section is the office**, because leave is sanctioned through one and a
department guessed out of a designation ("Forest Department" from "District
Forest Officer") would be a fact the page does not have.

It **proposes before it writes**: *Compare with the register* prints what
would change row by row and writes nothing — not even a column. Only *Apply*
writes.

Three things it does to the list on the way in:

- **Two posts held by one man are folded into one row** with both
  designations. One officer is one employee and one leave account; sent as two
  rows he would be one row written twice, the designation flipping between the
  two on every paste. Four of the district's seventy-three numbers are like
  this.
- **One number against two different names is sent unfolded, on purpose.**
  Which of the two holds it is the district's to settle and not a parser's to
  guess, so the register registers the first, **refuses the second and names
  the holder**. A number pasted twice is refused rather than written twice —
  one number on two rows is what makes an app greet a man with somebody else's
  name.
- **A line it cannot read is named, never guessed at** — a row with no mobile
  number, or with no Section column to take the office from.

### The enrolment code

The claim asks for something only the employee knows, because **a mobile
number is not a secret** — it is written in every office register in the
district. The employee id was that something, and the district's own list of
officers carries **none**: Section, Designation, Name, Mobile and nothing
else.

So where a row has no employee id the register **mints one itself**: a
six-character **enrolment code**, issued per row, printed once on the console
with a CSV to take it away in, and **spent the moment it is used**. The
alphabet leaves out O/0, I/1, S/5 and B/8, because it is read off a printed
sheet and typed on a phone by a man who did not write it.

It is a one-time token and is not pretended to be more: it is a secret an
office can distribute on paper, which is what an office actually has. **The
employee still chooses his own PIN** — the code only proves the row is his,
and is spent doing it. A standing code stays readable from *Has the register
reached them?* for as long as the row is unclaimed, because an office loses
the sheet it was printed on and re-minting would invalidate the one already
given out. A second paste mints nothing (rule 8).

`Audit` records that codes were issued and to how many — **never a code**,
exactly as it records that a PIN was set and never the PIN.

## 7 — The employees

Send them the address and the code their office holds for them. Each signs in
with his own mobile number, is shown the claim screen, enters his **employee
id or his enrolment code**, and **chooses his own PIN**. No PIN is issued by
the district and none is printed anywhere.

Console ▸ Admin ▸ **Has the register reached them?** shows how many have
claimed, names those who have not, and gives the standing code against each —
with a CSV, so an office can be sent only its own.

## 8 — Passing orders

**In the app, as on both other registers.** Sign in to `/hrms/` with your own
number and PIN; **Applications awaiting your orders** is on the home screen and
nobody else is offered it (the server re-checks that anyway). Sanction one,
refuse one with your own words — which travel back to the employee and stand on
the register — or sanction the lot. Each still answers its own checks in turn,
so one that cannot be sanctioned is refused **by name** and stays waiting for
your own look. Refusals are never passed over a list.

The console's **Leave** view shows the same waiting list and the recent orders,
and is where to read the register; the orders themselves are passed in the app.

**Only the Collector orders, by his order of 08.10.2026** — *all leave go to
collector for sanction*. The head of an office cannot sanction his own staff's
leave, and that is a direction now and not merely a seam left shut. Should it
ever be delegated, `canApproveLeave_` is the one place it would go and suite 34
is changed first, deliberately.

Because every application in the district lands on one desk, **Sanction all**
goes up in **batches of twenty-five**: the server passes at most 200 ids in one
request however many are sent, and each application is re-read and written on
its own, so the whole desk in a single request was both silently truncated and
minutes of waiting. The count moves as the batches go, and a batch that fails
costs only itself. The heading says how many are waiting **in all**, not merely
how many are shown — the screen shows the oldest 300 and more come up as you
pass them.

And if the line drops, the screen does **not** tell you no order was passed: it
cannot know, because the order may have been written and only the answer lost.
It says so, and re-reads the register — whatever is still on the list has had no
order passed on it.

## What to watch

- **One mail allowance.** All three registers run as the same deploying user
  and share it — 100 a day on a consumer account. At 284 + 134 + several
  thousand, that arithmetic fails on all three. Workspace, or the evening
  report and every reminder stop.
- **The claim is the only unauthenticated write on any of these registers.**
  It asks for the employee id — or the enrolment code, where the office had no
  id to give — as a second factor, is rate-limited like a sign-in, answers
  identically whether the number is absent or the factor wrong, and a row is
  claimed once. Every claim is on `Audit`. A wrong claim is
  visible and the Collector can reset it.

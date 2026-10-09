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

## 1 — Press the button

Everything up to the app's address is done by the pipeline. In GitHub, open
**Actions ▸ Provision the District HRMS register ▸ Run workflow**, leave the
name of the sheet as it is, type `CREATE` in the confirm box, and run it.

It creates the spreadsheet and the Apps Script project bound to it, under the
same account that owns the other two registers; tells that project it is the
HRMS register; pushes **every** `backend/*.gs` into it — `FeatureHrms.gs` is
the whole of this register, so a list of names here would stand up a register
that answers and cannot enrol one employee — and deploys it as a web app; asks
the new address what register it is and will not go on unless it answers
`"tenant":"HRMS"`; and then writes `hrms/config.js`, which is what makes the
app appear at `/hrms/`.

**It cannot make a second register.** The project is recorded in
`hrms/project.json` and committed in the same step that creates it, before
anything that can fail — so a run that stops is **continued** by the next one
rather than started again. That matters because creation is the one act here
that repeating does not undo: a second spreadsheet would orphan the first with
the establishment in it.

**A first run usually stops once, at Google's consent screen.** A newly created
web app answers 403 until its OAuth scopes are approved by a person in a
browser, and there is no API for granting consent — that is a security
boundary, not a gap. The run says so in a warning and prints the link: open the
script, Run any function, accept. Then run the workflow again.

**Nothing is published at `/hrms/` until the address answers as HRMS.** All
three projects run identical files, so `ok:true` proves only that *something*
answered; an app pointed at a server reporting itself as SJGP would file the
district's leave into the sanitation register, which is the one mistake the
whole isolation exists to prevent.

### What it does not do, deliberately

- **It puts nobody on the roll.** The establishment goes from your screen to
  your register over HTTPS in step 6 and through nothing else: those are
  personal mobile numbers and this repository is public.
- **It plants no bootstrap key.** The Gram Palana pipeline had to, so that 134
  mobile numbers could reach an empty register without passing through here.
  This one has the console and your own token, so there is nothing for a key to
  carry — and a key never planted cannot be left behind in a live project.
- **It sets no salt.** The register mints its own on the first request that
  needs one, under a lock, into Script Properties and nowhere else. Inventing
  one by hand is the step most likely to be skipped, mistyped, or — worst —
  copied from another register, which would make the same PIN hash identically
  on both.
- **It runs no `Admin.gs` job.** Those change the district's records, and you
  press that button, not a robot.

## 2 — By hand, if the pipeline cannot be used

The credential the pipeline deploys with can expire, and then this is the way
through. It is the same four acts the button performs.

Make a new Google Sheet, named so nobody confuses it with the other two:
**`District HRMS · Jangaon`**. Add a tab called `Config` with two columns and
one row:

| Key | Value |
|---|---|
| TENANT | HRMS |

That tab is what tells the register what it is. A Script Property named
`TENANT` set to `HRMS` outranks it and does the same job; the tab is preferred
because it travels with the data it describes and cannot be pushed away by a
deploy.

Create an Apps Script project **bound to that sheet** (Extensions ▸ Apps
Script). Copy in every file from `backend/` — `Code.gs`, `Admin.gs` and every
`Feature*.gs`. Deploy it as a **web app**, executing as you, accessible to
anyone with the link. Then confirm it knows what it is before going further:

    <the new /exec>?op=diag

It must answer `"tenant":"HRMS"`. If it says `SJGP`, the Config tab was not
read — a register that fails to identify itself lands on the one that already
exists, deliberately, and that is the wrong register for this data.

Finally write `hrms/config.js` (copy `hrms/config.example.js`) with the new
`/exec` address, and commit it. The deploy Action publishes `hrms/` only once
that file exists, and never overwrites it.

**Then write `hrms/project.json` too**, or the register will never receive
another line of code:

```json
{ "scriptId": "…", "deploymentId": "AKfyc…", "execUrl": "https://script.google.com/macros/s/AKfyc…/exec" }
```

## 3 — What keeps it up to date, and why that file matters

Nothing to do here; this is so you know it happens. Once `hrms/project.json`
exists, **every ordinary deploy pushes `backend/` into the HRMS project as
well** and re-checks that the address still answers as HRMS.

That file is both the record and the switch, and it is a file rather than a
repository variable because `GITHUB_TOKEN` cannot manage variables — that needs
a personal token with repository scope, and putting one here to save a step is
a worse trade than the step. No file means no register and the job stands down
in one second.

Before any of this existed, `hrms/` was being published from its own sources
the moment `config.js` appeared and **no job anywhere pushed the backend into
the HRMS project**. The app would have gone on being republished against a
server frozen on the day it was provisioned: every fix to leave, to the claim,
to the Collector's orders reaching the other two registers and not the one
whose whole purpose is leave.

## 4 — The app

Check it with your own eyes before telling anybody the address:

    https://jangaoncdm.github.io/sjscore-app/hrms/

Until the register is stood up that address serves the app and says, plainly,
that it has no district address yet and that this is not the employee's signal.
It used to blame his network instead, and he would have gone looking for a
better one for ever.

## 5 — Your own row, by hand

**A new register is one nobody can sign in to, including you.** The Users tab
is empty, the console is Collector-only at its door, and the one action that
puts an officer on the roll is itself behind a sign-in. Step 6 cannot be
reached until this is done, and nothing else can do it.

**FIRST MAKE THE TAB EXIST, and do not make it yourself.** A brand-new
spreadsheet has no `Users` tab, and one typed by hand with headers invented
from memory is a register that reads every column one place to the left —
columns are matched by header NAME here, never by position, so a header
spelt wrongly is a column that silently does not exist.

So let the register make it. Open **`/hrms/`** and try to sign in with your
number. It will tell you the number is not on the roll, which is true — and in
answering it will have created the `Users` tab with the eleven headers in their
proper order and spelling:

    Phone | Name | Role | Mandal | GP | Email | InitPin | Hash | Active | Designation | EmpId

**Now type one row under them**, filling five of the eleven cells and leaving
the other six alone:

| Cell | What goes in it |
|---|---|
| `Phone` | `'9625701988` — with the leading apostrophe, so the sheet keeps it as text |
| `Name` | Sandeep Kumar Jha |
| `Role` | `COLLECTOR` |
| `Active` | `TRUE` |
| `EmpId` | `ADMIN1` |

Leave `Mandal`, `GP`, `Email`, `Designation` and — this is the one that
matters — **`InitPin` and `Hash` empty**. A row with no PIN on it is precisely
what the app offers the claim to; a row with one is a row that is already
somebody's, and the claim is refused. `EmpId` is the second factor and it is
yours to choose: it is used once, spent, and never asked for again.

Then go back to **`/hrms/`** and sign in with that number again. This time the
app finds the row, asks for the employee id, and lets you **choose your own
PIN**. Nobody issues it to you and the register stores no copy of it; `Audit`
records that a PIN was set, on which number and by whom, and never the PIN.

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

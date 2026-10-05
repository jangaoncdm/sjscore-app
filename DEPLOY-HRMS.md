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

## 5 — The establishment

Console ▸ Admin ▸ **District HRMS** ▸ paste the establishment list:

    Name · Office · Designation · Employee ID · Mobile

It proposes before it writes. **An employee id is required on every row** —
it is what the employee claims his own row with, and a row seeded without one
can never be claimed and will need a PIN issued by hand.

## 6 — The employees

Send them the address. Each signs in with his own mobile number, is shown the
claim screen, enters the **employee id his office holds** and chooses his own
PIN. No PIN is issued by the district and none is printed anywhere.

Console ▸ Admin shows how many have claimed and names those who have not.

## What to watch

- **One mail allowance.** All three registers run as the same deploying user
  and share it — 100 a day on a consumer account. At 284 + 134 + several
  thousand, that arithmetic fails on all three. Workspace, or the evening
  report and every reminder stop.
- **The claim is the only unauthenticated write on any of these registers.**
  It asks for the employee id as a second factor, is rate-limited like a
  sign-in, answers identically whether the number is absent or the id wrong,
  and a row is claimed once. Every claim is on `Audit`. A wrong claim is
  visible and the Collector can reset it.

# The Gram Panchayat register — putting it up

Ordered 18.09.2026. A second register for the **134 officers of the Gram
Panchayat domain** — 115 Gram Panchayat Officers across 180 revenue villages,
and 19 Revenue Inspectors — carrying attendance, leave, the geo-tagged mark,
the map and the daily report.

**It is a second deployment, not a second table.** Its own Google Sheet, its
own Apps Script project, its own address, its own app. The two registers share
their code and nothing else. Nobody on the sanitation register can read this
one and nobody here can read that one — not because a role check says no, but
because the data is in a different spreadsheet. You are the only person with
both.

Everything below is done in a browser. About forty minutes.

---

## Before you start — three things to know

**1. The show-cause ladder is built and switched off.** By your direction, a
Gram Panchayat Officer who does not mark draws no notice, no debit and no lock.
The machinery is in place; `TENANTS.GP.sanction` in `Code.gs` turns it on, and
that is your written order, not a code edit. Suite 26 holds it off.

**2. Two of the 180 GP office coordinates are wrong** and are written blank
rather than guessed at — **Salvapur** (longitude `7852556`) and **Kalvalally**
(the latitude copied into the longitude). Those two villages will show no
distance until the district corrects them. Everything else measures.

**3. The mail quota is shared, and I do not know which account you are on.**
Both projects run as the deploying user, so 280 + 134 = **414 officers draw on
one daily allowance**. Google gives 100 mails a day on a consumer account and
1,500 on Workspace. If it is a consumer account this will break *both*
registers, not just the new one. **Check this first** — run `checkMailQuota`
from the Admin menu after step 4 and it will tell you what is left today.

---

## 1. Make the Sheet

Drive ▸ New ▸ Google Sheets. Name it **SJGP — Gram Panchayat register**.
Leave it empty; the tabs make themselves.

## 2. Put the roster in it

On this machine, in the project folder:

```bash
node tests/gp-seed.js
```

It reads `Domain/GP/…xlsx` and writes three files **into `Domain/GP/`, which is
gitignored and must stay that way** — it carries 134 personal mobile numbers
and this repository is public:

| file | what it is |
|---|---|
| `seed-Users.csv` | 134 officers, one row each, villages joined in the GP column |
| `seed-GPs.csv` | 180 revenue villages with their GP office coordinates |
| `seed-report.txt` | **read this** — every row it could not read, and every spelling it changed |

In the new Sheet: File ▸ Import ▸ Upload ▸ `seed-Users.csv` ▸ *Insert new
sheet*, then rename the tab to exactly **`Users`**. Same again for
`seed-GPs.csv`, renamed to exactly **`GPs`**.

> The seed folds 54 officers who hold more than one village onto one row each,
> brings the district's three spellings of each mandal to one, and leaves a
> coordinate it cannot believe blank. It invents nothing.

## 3. Make the Apps Script project

In that Sheet: Extensions ▸ Apps Script. It opens a project bound to it.

- Project Settings ▸ **Show "appsscript.json"** ▸ on.
- Paste in `backend/Code.gs`, `backend/Admin.gs` and `backend/appsscript.json`
  from this repository. (After step 6 the Action does this for you for ever.)
- Project Settings ▸ Script Properties ▸ **Add**:

| property | value |
|---|---|
| `TENANT` | `GP` |
| `SALT` | a long random string — **a different one from the sanitation register** |

**`TENANT=GP` is the whole switch.** Anything else, including a missing or
misspelt value, is the sanitation register — that default is deliberate, so a
property that fails to read can never turn SJGP into something else.

**A different salt.** Two registers that share one salt share the hash of every
PIN. There is no reason for the same PIN on both to look alike.

## 4. Set the PINs

In the editor, run **`setupPins`** once. Then the Admin menu ▸ *Show a PIN
reset* for any one officer, to check a PIN comes out.

Also add yourself: your own mobile, role `COLLECTOR`, on the `Users` tab. You
need a login here as well as on the sanitation register — they are separate
registers and a token from one means nothing to the other.

## 5. Deploy it

Deploy ▸ New deployment ▸ **Web app**, execute as **Me**, access **Anyone**.
Copy the `/exec` address. Check it:

```
<that address>?op=diag
```

It must answer `"ok":true`. Keep the address and the **deployment ID**.

## 6. Tell the pipeline about it

GitHub ▸ the repository ▸ Settings ▸ Secrets and variables ▸ Actions ▸
**Variables** ▸ New, three of them:

| name | value |
|---|---|
| `GP_SCRIPT_ID` | the GP project's script ID (Project Settings) |
| `GP_DEPLOYMENT_ID` | the deployment ID from step 5 |
| `GP_EXEC_URL` | the `/exec` address |

The credential (`CLASPRC_JSON`) is the same one — the same Google account owns
both projects.

## 7. Publish the app

Copy `gp/config.example.js` to `gp/config.js` and paste the GP `/exec` address
into it. It is two lines:

```js
window.SJGP_SERVER = 'https://script.google.com/macros/s/…/exec';   // the GP /exec
window.SJGP_TENANT = 'GP';
```

`SJGP_TENANT` does two things that matter: it tells the app which register it
is, and it changes the key the app keeps its store under. **Both apps are on
one domain and browser storage is per domain, not per folder** — without it the
GP app would open on top of an officer's sanitation session, write its own over
it, and the two would sign each other out on the same handset all day.

The Action publishes `app/` to `gp/` alongside the root, leaving `gp/config.js`
alone exactly as it leaves the root one.

## 8. Install, and the QR

The GP app lives at:

```
https://jangaoncdm.github.io/sjscore-app/gp/
```

**The card is already made, and its square has been decoded.**

```bash
node tests/install-cards.js     # Info/install/install-gp.html  — open, Ctrl+P
```

It is an A5 card: the QR, the address in type large enough to key in when a
camera will not focus, the three steps, and a line saying plainly that the
square is not a credential — anyone who photographs it reaches the sign-in
page and gets no further without a number on the roll and its PIN. It may go
on a notice board.

**Nothing on it is printed on trust.** `tests/qr-check.js` decodes every
square this project produces with jsQR — an independent decoder — at three
print sizes and turned a quarter round, and compares it module for module
against an independent *encoder*. That cross-check is what found the one real
bug: eight modules out of 441, the format information written with rows and
columns swapped, while every data module was already correct. A decoder alone
had said only "no code found", which is true of a thousand different faults.

Scan it with your own phone once before printing 134 copies anyway. It costs
five seconds and it is the only test done on the paper itself.

---

## What each register does, side by side

| | sanitation (SJGP) | Gram Panchayat (GP) |
|---|---|---|
| officers | ~280 PS / MPO / MSO / MPDO / DPO / DLPO | 134 GPO / MRI / ARI |
| attendance, geo-tagged | yes | yes |
| leave | yes | yes |
| map, daily report | yes | yes |
| **distance from the place of duty** | **no — the roll has no coordinates** | **yes — every village carries its GP office** |
| 100-mark village evaluation | yes | **refused at the door** |
| filing schedule | yes | **refused at the door** |
| show-cause ladder, CL debit | yes | **built, switched off** |
| who sees it | its own officers | its own officers |
| who sees both | **you** | **you** |

## Rolling it back

The GP register is a separate Sheet and a separate project. Taking it down is
deleting its deployment; nothing on the sanitation register is touched, because
nothing on the sanitation register ever knew about it.

To put the *code* back to before any of this:

```
git checkout pre-desktop-2026-09-18 -- app/ backend/
```

…but note that tag predates the tenant work. The sanitation register is
unaffected by it either way: with no `TENANT` property it reads exactly as it
always has, and suite 26 asserts that for a missing, empty and misspelt value.

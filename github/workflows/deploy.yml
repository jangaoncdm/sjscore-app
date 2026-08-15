# Deploying SJGP without the ritual

Until now every upgrade meant: copy the SALT into Notepad, paste Code.gs,
put the SALT back, deploy a new version, upload four files to GitHub, then
open app.js and paste the server address back. Seven manual steps, two of
them able to take the district down if mistyped.

Two of those steps existed for no good reason, and they are gone.

**The server address never had to be blanked.** It ships inside app.js to
every phone; any browser can read it. It now lives in `config.js`, which
stays in the repository and is never included in an upgrade pack.

**The salt never had to be in the source.** It now lives in Script
Properties. Code.gs holds no secret, so a machine can push it.

---

## ONE TIME — 20 minutes, all in the browser

### 1. Move the salt (do this FIRST, on the code that is running now)
In the Apps Script editor, with the CURRENT Code.gs still in place:
run `migrateSalt` from Admin.gs. It copies the live value into Script
Properties and refuses to overwrite one already there.
Then **sign in on the app with a known PIN**. If sign-in works, the salt
carried across. If it does not, nothing is lost — the old constant is still
in the file.
Check any time with `saltStatus`.

### 2. Create config.js in the repository
GitHub ▸ Add file ▸ Create new file ▸ name it `config.js`:

```js
window.SJGP_SERVER = 'https://script.google.com/macros/s/AKfy…/exec';
```

Use the address currently on line 15 of the published app.js. Commit.
No upgrade pack will ever contain this file, so it cannot be blanked again.

### 3. Get a clasp credential — in the browser, no install
Open **Google Cloud Shell**: https://shell.cloud.google.com (free, opens a
terminal in a browser tab), then:

```
npm install -g @google/clasp
clasp login --no-localhost
```

Follow the link it prints, approve, paste the code back. Then:

```
cat ~/.clasprc.json
```

Copy the whole line of JSON.

Also turn on the Apps Script API once, at:
https://script.google.com/home/usersettings

### 4. Store four things in GitHub
Repository ▸ Settings ▸ Secrets and variables ▸ Actions

Under **Secrets** ▸ New repository secret:
- `CLASPRC_JSON` — the JSON from step 3

Under **Variables** ▸ New repository variable:
- `SJGP_SCRIPT_ID` — from the Apps Script URL, the long id between
  `/projects/` and `/edit`
- `SJGP_DEPLOYMENT_ID` — Deploy ▸ Manage deployments ▸ the active one ▸
  the id shown under it (starts `AKfy`)
- `SJGP_EXEC_URL` — the same /exec address as config.js

---

## FROM THEN ON — every change, one step

Upload the changed files to GitHub (the web interface is fine, as now) and
commit. That is the whole procedure.

The Action then, by itself:
- refuses the run if a salt or an API key has crept into the repository;
- checks that Code.gs and Admin.gs actually parse, before they reach the
  district;
- publishes the app and console to Pages, leaving config.js alone;
- pushes the backend and creates a NEW DEPLOYMENT VERSION;
- calls `?op=diag` and fails loudly if the district does not answer.

Watch it under the **Actions** tab. Green means the district is live on the
new code — including the deployment version step, which is the one most
often forgotten by hand.

---

## What this does NOT do

- **It does not run the Admin.gs jobs.** `withdrawWrongNotices`,
  `holidayRepair`, `closeDuplicateLeave`, `registerOfficers` and the rest
  are deliberately manual. They change the district's records, and the
  Collector should press that button, not a robot.
- **It does not install triggers.** Run `installNoticeTriggers` by hand when
  the timings change; it is not something that should happen on every push.
- **It does not test the district's data.** The Action checks that the code
  parses and that the server answers. `sanityAudit` still has to be read by
  a person.

## If the Action goes red
Open it under Actions and read the failing step.
- *"config.js is missing"* — step 2 was not done.
- *"A real salt is present"* — a Code.gs with the constant still filled in
  was committed. Blank it back to the placeholder; the live value is in
  Script Properties.
- *"The district did not answer"* — the push landed but the deployment did
  not. Check `SJGP_DEPLOYMENT_ID`, or deploy once by hand.

Nothing here is irreversible: the Sheet is untouched by any of it, and
Apps Script keeps every previous version under Deploy ▸ Manage deployments.

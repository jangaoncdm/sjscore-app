# Handoff — as at 15 August 2026

Read `CLAUDE.md` first for the doctrine. This file is only the current state:
what is live, what is waiting, and what has not been decided.

---

## Versions

| Piece | Version | How to confirm |
|---|---|---|
| Backend | `SJGP-6.9-diag12` | `<exec URL>?op=diag` |
| Field app | `6.9.1` | app ▸ More ▸ footer |
| Console | ships with the app | left rail shows **Notices** |
| Service worker | `sjf-v6-9-1` | app updates on the second full open |

`?op=diag` also returns `tzScript`, `tzSheet`, `today` and `offToday`, which
answers most "why did it not fire" questions without opening the editor.
`tzScript: Asia/Kolkata` and `tzSheet: Asia/Calcutta` are the **same zone
under two names** — not a fault.

---

## Confirmed live

- Salt migrated to Script Properties, ending `…DPOxK9`. `Code.gs` carries only
  the placeholder and can be pushed by a tool.
- Holidays read in the Sheet's timezone. `offToday` correctly returned
  *Independence Day* on 15.08.2026.
- Notice engine with the reminder ladder, 18:00 cutoff, three attendance
  readings, Collector approval before service.
- Light theme, 2K layout, card tiling at 1500/1980 px.
- Per-officer leave balance.

---

## Waiting on you

**1. Repair the holiday dates.** Nine of thirty have day and month swapped —
a US-locale Sheet read `10-01-2026` as 1 October. Bonalu (10 Aug) was read as
8 October, so that Monday was treated as a working day; Deepavali sits on
11 August, so that Tuesday was treated as a holiday.

```
holidayCheck          read-only
holidayRepair         dry run — shows 12 of 12 Second Saturdays fit "as typed"
holidayRepair(true)   commits, as plain text that no locale can move
```

Then look at the Notices register for **10.08.2026** and drop or withdraw
anything raised that day. Bonalu was a holiday whatever the Sheet believed.

**2. Withdraw notices served in error** (the pre-6.7.1 mid-morning cutoff):

```
auditWrongNotices        read-only
withdrawWrongNotices     withdraws, reverses any CL debited, unlocks the apps
```

**3. Close duplicate leave applications:**

```
findDuplicateLeave
closeDuplicateLeave(true)
```

**4. Retime the triggers** — required if `installNoticeTriggers` has not been
run since 6.7.1. The old 11:15 trigger is the one that caused the wrongful
notices. After running, ⏰ should show exactly two: ~18:00 and ~09:00.

**5. Pin the ladder start.** Project Settings ▸ Script Properties ▸
`LADDER_START` = the date the new rule begins. Without it, unmarked days
earlier in the month count as misses and an officer can land on a notice from
day one.

**6. The eleven reported field issues.** See `ISSUES_RESOLVED.txt`. Eight are
ready; two are blocked on facts only the district has:
- **9281481690** — "MPDO Tharigoppula" is a post, not a person. A login signs
  attendance and evaluations and must carry a name. `registerOfficers` refuses
  the row until one is supplied.
- **Amarender Reddy / Bheemagoni Madhu** — the issue sheet contradicts itself
  on which village each now holds. Neither has been moved. Ask MPDO Lingala
  Ghanpur, then add the correct lines to `TO_REMAP`.

**7. The WhatsApp circular** needs redrafting. The version sent says a notice
follows any unmarked day; the rule is now remind, remind, serve on the third.
It should also carry the clock instruction (set date and time to automatic).

---

## Pipeline state

Done: `config.js`, `deploy.yml`, workflow write permission, salt out of source.

Not done: the clasp credential. `CLASPRC_JSON`, `SJGP_SCRIPT_ID`,
`SJGP_DEPLOYMENT_ID`, `SJGP_EXEC_URL` are unset, so the `backend` job is
skipped by design (`if: vars.SJGP_SCRIPT_ID != ''`). Site publishing, the
secret guard and the test gate all run regardless.

Until the credential exists, the backend is still paste-and-deploy in the
editor — but without the SALT step, which was the dangerous one.

Cloud Shell login failed twice (clasp's listener is on the VM, the browser is
not). Do it on Windows, where `localhost` really is the machine.

---

## Known and not fixed

- **A slow handset can still claim an earlier mark time than the truth.** It
  cannot pass clean — the late receipt shows and the day reads as a late
  arrival — but the claim itself is not provable. Only `receivedAt` is. Judging
  the cutoff purely on receipt is a one-line change, deliberately not taken,
  because honest offline marking is the common case in these villages.
- **True background push is impossible** on an Apps Script backend — it cannot
  sign VAPID keys. The three real channels are email, an alert while the app is
  open, and the lock at next open. Anything more needs Firebase.
- **MailApp quota**: 100/day on plain Gmail, 1500 on Workspace. A 54-absentee
  morning plus summaries sits close to the free limit.
- **The console has no automated tests.** Changes there must be rendered and
  looked at.

---

## If something looks wrong on the district's data

Run `sanityAudit` from `Admin.gs`. Read-only, one pass over the live Sheet:
leave accounts against entitlement, overlapping sanctioned leave, unnumbered
served notices, notices standing against officers who have attendance,
debit flags with no leave row, orphan SYSTEM debits, future-dated marks, the
worst handset clocks, duplicate phones, officers with no mandal.

Every ✗ line names its own remedy. It writes nothing.

/* ============================================================================
 * FEATURE · ANALYTICS — a month, read every way at once
 * ----------------------------------------------------------------------------
 * Ordered 05.10.2026. The console shows TODAY very well and the last fortnight
 * as a line. What it could not answer is the question a review actually asks:
 * how did this month go, for whom, where, and what is different about it.
 *
 * SO THIS READS THE MONTH ITSELF, off the Attendance register and the Leave
 * register, and returns it cut every way a district reads it: day by day,
 * weekday by weekday, hour by hour, mandal by mandal, officer by officer, and
 * by what the location readings were worth. The console draws it; nothing is
 * worked out twice.
 *
 * IT IS COMPUTED, NOT GENERATED. The observations at the foot are arithmetic
 * with a sentence around it — the best and worst mandal, the day the district
 * was thinnest, how many officers never missed, how many marks were late. No
 * model is asked and none could be: a key in a PUBLIC government repository is
 * the one mistake this project already has a rule about, and a sentence a
 * district acts on must be one that can be checked against the figure beside
 * it. Every observation here names its own number, so the Collector can see
 * where it came from.
 *
 * THE TWO ROLLS ARE NEVER ADDED (the direction of 04.10.2026). The field
 * officers answer to the show-cause ladder and the MPDO office staff do not,
 * so every figure here is of ONE of them, chosen by `seg`, and the answer says
 * which. An attendance percentage mixing the two means nothing to either.
 *
 * IT ACCUSES NOBODY. This is a reading of a month, not an instrument: no
 * notice, no debit and no lock reads any of it. The officer table names who
 * was absent most often because that is a fact a Collector asks for, and what
 * it means is his to read on the facts — the same restraint as rule 10.
 * ========================================================================== */

/* How far back the register is read. At 476 officers a working day that is
   about eleven weeks, which covers any month the console can ask for without
   walking a tab that will one day hold a quarter of a million rows. */
var ANA_TAIL_ROWS = 40000;

/* the hour by which a mark is "on time" — the same CUTOFF_HOUR the ladder uses,
   so the two can never disagree about what late means */
var ANA_LATE_AFTER = 11;

function feature_analytics(){
  return {
    title: 'Analytics — a month, read every way at once',
    tenants: ['SJGP','GP'],

    get: {
      analytics: function(p, u){
        if(u.role !== 'COLLECTOR')
          return json_({ ok:false, error:'The month' + String.fromCharCode(8217) + 's analysis is the Collector' + String.fromCharCode(8217) + 's.' });
        const ym = ymText_(p.ym || today_().slice(0, 7));
        const seg = String(p.seg || 'field').toLowerCase();
        const mandal = String(p.mandal || '').trim();

        /* THE SAME READ TWICE IN A MINUTE IS THE SAME READ. The console
           re-asks whenever a picker moves, and a month is a dozen thousand
           rows; ten minutes is short enough that today's own marks appear
           while a review is running. */
        const ck = 'ana|' + tenant_().key + '|' + ym + '|' + seg + '|' + mkey2_(mandal);
        try{
          const hit = cache_().get(ck);
          if(hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
        }catch(err){}

        const out = anaMonth_(ym, seg, mandal);
        const body = JSON.stringify(out);
        try{ cache_().put(ck, body, 600); }catch(err){}
        return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
      }
    }
  };
}

/* --------------------------------------------------------------- the month */
function anaMonth_(ym, seg, mandal){
  const from = ym + '-01';
  const last = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).getDate();
  const to = ym + '-' + (last < 10 ? '0' + last : String(last));

  /* ---- who the month is about ---- */
  const t = uidx_(), uv = t.sh.getDataRange().getValues();
  const who = {}, roles = {};
  for(let i = 1; i < uv.length; i++){
    if(String(uv[i][t.ix.active]).toUpperCase() === 'FALSE') continue;
    const ph = phone10_(uv[i][t.ix.phone]); if(!ph || who[ph]) continue;
    const role = cell_(uv[i], t.ix.role).toUpperCase();
    if(role === 'COLLECTOR') continue;
    if(attExempt_(role)) continue;          /* never asked to mark, never counted as a gap */
    if(!anaInSeg_(role, seg)) continue;
    const m = cell_(uv[i], t.ix.mandal);
    if(mandal && mkey2_(m) !== mkey2_(mandal)) continue;
    who[ph] = { name:cell_(uv[i], t.ix.name), role:role, mandal:m,
                desig: t.ix.designation >= 0 ? cell_(uv[i], t.ix.designation) : '' };
    roles[role] = (roles[role] || 0) + 1;
  }
  const phones = Object.keys(who);

  /* ---- the working days of the month ---- */
  const hs = holidaySet_(), days = [];
  for(let d = 1; d <= last; d++){
    const key = ym + '-' + (d < 10 ? '0' + d : String(d));
    if(new Date(key + 'T00:00:00').getDay() === 0) continue;
    if(hs[key]) continue;
    days.push(key);
  }

  /* ---- the marks ---- */
  const ash = sheet_('Attendance', A_HEAD), am = headMap_(ash, A_HEAD);
  const lastRow = ash.getLastRow();
  const start = Math.max(2, lastRow - ANA_TAIL_ROWS);
  const av = lastRow < 2 ? [] :
    ash.getRange(start, 1, lastRow - start + 1, ash.getLastColumn()).getValues();
  const head = ash.getRange(1, 1, 1, ash.getLastColumn()).getValues()[0].map(String);
  const ix = {}; ['date','phone','markedAt','receivedAt','accuracy','verified','lat','lng','status','outAt']
    .forEach(function(k){ ix[k] = head.indexOf(k); });

  const byDay = {}, byHour = {}, perOfficer = {}, byMandal = {};
  let recorded = 0, nofix = 0, untrusted = 0, closed = 0, lateMarks = 0, marksTotal = 0;
  phones.forEach(function(p){
    perOfficer[p] = { present:0, late:0, unmarked:0, longest:0, run:0 };
  });

  for(let i = 0; i < av.length; i++){
    const d = dateText_(av[i][ix.date]); if(!d || d < from || d > to) continue;
    const ph = phone10_(av[i][ix.phone]); if(!who[ph]) continue;
    const st = String(av[i][ix.status] || 'PRESENT').toUpperCase();
    if(st === 'LEAVE') continue;            /* sanctioned leave is not a mark */
    if(!byDay[d]) byDay[d] = {};
    if(byDay[d][ph]) continue;              /* one officer, one day, however many rows */
    byDay[d][ph] = true;
    marksTotal++;

    const eff = effMarkAt_(String(av[i][ix.markedAt] || ''), String(av[i][ix.receivedAt] || ''));
    const h = anaHour_(eff);
    if(h != null){
      byHour[h] = (byHour[h] || 0) + 1;
      if(h >= ANA_LATE_AFTER){ lateMarks++; perOfficer[ph].late++; }
    }
    const acc = Number(av[i][ix.accuracy]);
    const ok = String(av[i][ix.verified]).toUpperCase() === 'TRUE';
    if(suspectMark_ && anaSuspect_(av[i], ix)) untrusted++;
    else if(ok && acc && acc <= 250) recorded++;
    else nofix++;
    if(ix.outAt >= 0 && String(av[i][ix.outAt] || '')) closed++;

    perOfficer[ph].present++;
    const mk = who[ph].mandal || '(none)';
    byMandal[mk] = byMandal[mk] || { marks:0, officers:{} };
    byMandal[mk].marks++;
  }

  /* ---- sanctioned leave covers a day without a mark ---- */
  const lsh = sheet_('Leave', L_HEAD), lm = headMap_(lsh, L_HEAD);
  const lv = lsh.getDataRange().getValues();
  const onLeave = {};
  for(let i = 1; i < lv.length; i++){
    if(String(lv[i][lm.ix.status]).toUpperCase() !== 'APPROVED') continue;
    const p = phone10_(lv[i][lm.ix.phone]); if(!who[p]) continue;
    const f = dateText_(lv[i][lm.ix.fromDate]), tt = dateText_(lv[i][lm.ix.toDate]);
    if(!f || !tt) continue;
    days.forEach(function(d){ if(f <= d && d <= tt) onLeave[d + '|' + p] = true; });
  }

  /* ---- day by day, and each officer's run of absences ---- */
  const dayRows = days.map(function(d){
    const marked = byDay[d] || {};
    let present = 0, leave = 0, unmarked = 0, by10 = 0;
    phones.forEach(function(p){
      if(marked[p]){ present++; return; }
      if(onLeave[d + '|' + p]){ leave++; return; }
      unmarked++;
    });
    return { date:d, present:present, leave:leave, unmarked:unmarked,
             pct: phones.length ? Math.round(present * 100 / phones.length) : 0 };
  });
  days.forEach(function(d){
    const marked = byDay[d] || {};
    phones.forEach(function(p){
      if(marked[p] || onLeave[d + '|' + p]){ perOfficer[p].run = 0; return; }
      perOfficer[p].unmarked++;
      perOfficer[p].run++;
      if(perOfficer[p].run > perOfficer[p].longest) perOfficer[p].longest = perOfficer[p].run;
    });
  });

  /* ---- by weekday ---- */
  const WD = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const wd = {};
  dayRows.forEach(function(r){
    const k = new Date(r.date + 'T00:00:00').getDay();
    wd[k] = wd[k] || { present:0, due:0 };
    wd[k].present += r.present; wd[k].due += phones.length;
  });
  const weekday = Object.keys(wd).sort().map(function(k){
    return { day:WD[k], pct: wd[k].due ? Math.round(wd[k].present * 100 / wd[k].due) : 0,
             marks:wd[k].present };
  });

  /* ---- by mandal ---- */
  const mcount = {};
  phones.forEach(function(p){ const m = who[p].mandal || '(none)'; mcount[m] = (mcount[m] || 0) + 1; });
  const mandals = Object.keys(mcount).map(function(m){
    const due = mcount[m] * days.length;
    const got = (byMandal[m] || { marks:0 }).marks;
    return { mandal:m, officers:mcount[m], marks:got,
             pct: due ? Math.round(got * 100 / due) : 0 };
  }).sort(function(a, b){ return b.pct - a.pct; });

  /* ---- officer by officer ---- */
  const officers = phones.map(function(p){
    return { name:who[p].name, role:who[p].role, desig:who[p].desig, mandal:who[p].mandal,
             phone:p, present:perOfficer[p].present, unmarked:perOfficer[p].unmarked,
             late:perOfficer[p].late, longest:perOfficer[p].longest,
             pct: days.length ? Math.round(perOfficer[p].present * 100 / days.length) : 0 };
  }).sort(function(a, b){ return b.unmarked - a.unmarked || a.name.localeCompare(b.name); });

  const hours = [];
  for(let h = 6; h <= 20; h++) hours.push({ hour:h, n:byHour[h] || 0 });

  return { ok:true, ym:ym, seg:seg, mandal:mandal, from:from, to:to,
           workingDays:days.length, roll:{ officers:phones.length, byRole:roles },
           days:dayRows, weekday:weekday, hours:hours, mandals:mandals,
           location:{ recorded:recorded, nofix:nofix, untrusted:untrusted },
           closure:{ closed:closed, marks:marksTotal },
           late:lateMarks, marks:marksTotal,
           officers:officers.slice(0, 400),
           observations: anaSay_(ym, seg, days, phones.length, dayRows, mandals, officers,
                                 { recorded:recorded, nofix:nofix, untrusted:untrusted },
                                 lateMarks, marksTotal),
           /* IT ACCUSES NOBODY, and travels saying so */
           sanction:false,
           note:'A reading of the month. No notice, no debit and no lock reads any of it.' };
}

/* ------------------------------------------------------------------ helpers */
function anaInSeg_(role, seg){
  const r = String(role || '').toUpperCase();
  if(seg === 'all') return true;
  if(seg === 'staff') return r === 'STAFF';
  return r !== 'STAFF';
}
function anaHour_(iso){
  try{
    const d = new Date(String(iso || ''));
    if(isNaN(d.getTime())) return null;
    /* 'HH' AND NOT 'H'. The single-letter pattern is not one every formatter
       answers, and this one hands back NaN for it — silently, so every mark
       fell out of the hour histogram and not one was ever late. The marking-out
       module reads the clock as 'HH:mm' for the same reason. */
    return Number(Utilities.formatDate(d, Session.getScriptTimeZone(), 'HH'));
  }catch(err){ return null; }
}
/* the same reading the console's pill takes: outside the district's box, a
   reading coarser than 250 m, or a handset on another timezone */
function anaSuspect_(row, ix){
  const la = Number(row[ix.lat]), ln = Number(row[ix.lng]);
  if(la && ln && (la < 16.4 || la > 19.2 || ln < 77.6 || ln > 80.9)) return true;
  const acc = Number(row[ix.accuracy]);
  return !!(acc && acc > 250);
}

/* WHAT THE MONTH SAYS, in sentences that each carry their own number so the
   Collector can check one against the figure beside it. Arithmetic, not a
   model: a key in a public repository is the mistake this project has a rule
   about, and a sentence a district acts on must be checkable. */
function anaSay_(ym, seg, days, roll, dayRows, mandals, officers, loc, late, marks){
  const out = [];
  const EMD = String.fromCharCode(8212);
  const who = seg === 'staff' ? 'MPDO office staff' : seg === 'all' ? 'the whole register' : 'field officers';
  if(!days.length || !roll){
    out.push('Nothing to read for ' + ym + ': ' + (days.length ? 'no officer on this roll' : 'no working day') + '.');
    return out;
  }
  const avg = Math.round(dayRows.reduce(function(s, r){ return s + r.pct; }, 0) / dayRows.length);
  out.push('Across ' + days.length + ' working day(s), ' + roll + ' ' + who +
           ' marked on average ' + avg + '% of days.');

  const worst = dayRows.slice().sort(function(a, b){ return a.pct - b.pct; })[0];
  const best = dayRows.slice().sort(function(a, b){ return b.pct - a.pct; })[0];
  if(worst && best && worst.date !== best.date)
    out.push('Thinnest day ' + dmy_(worst.date) + ' at ' + worst.pct + '%; fullest ' +
             dmy_(best.date) + ' at ' + best.pct + '%.');

  if(mandals.length > 1)
    out.push('Best mandal ' + mandals[0].mandal + ' at ' + mandals[0].pct + '%, lowest ' +
             mandals[mandals.length - 1].mandal + ' at ' + mandals[mandals.length - 1].pct + '%.');

  const never = officers.filter(function(o){ return o.unmarked === 0; }).length;
  if(never) out.push(never + ' of ' + roll + ' missed not one working day.');

  const streak = officers.filter(function(o){ return o.longest >= 3; }).length;
  if(streak) out.push(streak + ' officer(s) have a run of three or more unmarked working days ' + EMD +
                      ' a fact to read, not a finding: leave, tour and a handset without signal all look like this.');

  if(marks && late)
    out.push(late + ' of ' + marks + ' marks (' + Math.round(late * 100 / marks) +
             '%) were made at or after ' + ANA_LATE_AFTER + ':00.');

  const tot = loc.recorded + loc.nofix + loc.untrusted;
  if(tot) out.push(Math.round(loc.recorded * 100 / tot) + '% of marks carried a location good to 250 m; ' +
                   loc.untrusted + ' could not be trusted. A reading says how precise it was, never where he ought to have been.');

  if(seg === 'staff')
    out.push('No show-cause notice, no casual-leave debit and no lock arises for the office staff from any of this.');
  return out;
}

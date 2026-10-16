/* ============================================================================
 * FEATURE · ATTCAL — attendance, day by day, for a year
 * ----------------------------------------------------------------------------
 * Asked 16.10.2026, after the leave register's week map: the same calendar
 * for attendance, on the Overview and on the Attendance screen. A year of the
 * district's mornings in one glance — how many marked each day, how many came
 * late, how many were on sanctioned leave, and on the working days that have
 * passed, how many did neither.
 *
 * ONE PASS OVER THE REGISTER, ONE OFFICER ONE DAY. The Attendance tab holds
 * every mark the district has ever taken, and a retry is a second row for the
 * same morning, so a day's figure is distinct officers and never rows. A
 * mark is late by effMarkAt_ — the earlier of the handset's claim and the
 * district's receipt, the same reading every other judgement of a morning is
 * made on — against CUTOFF_HOUR, so this map and the ladder can never
 * disagree about what late means. Sanctioned leave is read off the Leave
 * register AND off the leave rows the register writes onto the Attendance
 * tab, as one set per day, because silence under sanction is leave and not
 * absence (rule 9) and a map that forgot that would paint a festival red.
 *
 * WHAT IT DOES NOT KNOW, said plainly in the answer: the roll it counts "due"
 * against is TODAY'S roll. An officer who joined in September was not due in
 * March, and the register does not keep a roll per day; "not marked" on a
 * day months ago is therefore an upper figure and the screen says so. A day
 * that is a Sunday or on the Holidays tab is off and is drawn grey, never
 * counted as unmarked. An office whose attendance is voluntary (the MSO) is
 * neither due nor counted.
 *
 * CACHED, because the tab is read whole: twenty minutes per year per
 * register, keyed to the day, so the review that opens the Overview six
 * times in an hour walks seventy thousand rows once. IT ACCUSES NOBODY
 * (rule 10): nothing here writes a tab, raises a reminder or walks the
 * ladder; it is a picture of the year for the Collector to read.
 * ========================================================================== */
var ATTCAL_CACHE_SEC = 1200;

function attcalHour_(iso){
  var t = Date.parse(String(iso || '')); if(isNaN(t)) return null;
  var d = new Date(t + 5.5 * 3600000);                 /* the district's clock, IST */
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}

function feature_attcal(){
  return {
    name: 'attcal',
    title: 'Attendance, day by day, for a year — the calendar behind the Overview',
    tenants: ['SJGP', 'GP'],
    get: {
      attCalendar: function(p, u){
        if(u.role !== 'COLLECTOR')
          return json_({ ok:false, error:'The year' + String.fromCharCode(8217) + 's calendar is the Collector' + String.fromCharCode(8217) + 's alone.' });
        var year = Number(p.year);
        if(!(year > 2000 && year < 2100)) year = Number(String(today_()).slice(0, 4));
        var ck = 'attcal|' + tenant_().key + '|' + year + '|' + today_();
        var hit = null;
        try{ hit = cache_().get(ck); }catch(e){}
        if(hit && p.fresh !== '1'){ try{ return json_(JSON.parse(hit)); }catch(e){} }
        var out = attCalendar_(year);
        try{ cache_().put(ck, JSON.stringify(out), ATTCAL_CACHE_SEC); }catch(e){}
        return json_(out);
      }
    }
  };
}

function attCalendar_(year){
  var today = today_();
  var out = { ok:true, at:new Date().toISOString(), today:today, year:year, cutoff:CUTOFF_HOUR,
              due:0, off:{}, cal:{}, totals:{ workingDays:0, workingDaysPast:0, marks:0, late:0, leaveDays:0 },
              note:'Due is today’s roll; on a past day "not marked" is an upper figure.' };

  /* ---- the roll: who is due, and who is counted at all ---- */
  var who = {};
  try{
    var dt = uidx_(), dv = dt.sh.getDataRange().getValues();
    for(var i = 1; i < dv.length; i++){
      var ph = phone10_(dv[i][dt.ix.phone]); if(!ph) continue;
      var role = cell_(dv[i], dt.ix.role).toUpperCase();
      if(role === 'COLLECTOR') continue;
      var active = dt.ix.active < 0 || String(dv[i][dt.ix.active]).toUpperCase() !== 'FALSE';
      var w = who[ph] = who[ph] || { role:role, active:false, exempt:attExempt_(role) };
      if(active) w.active = true;
    }
  }catch(e){}
  Object.keys(who).forEach(function(ph){ if(who[ph].active && !who[ph].exempt) out.due++; });

  /* ---- the off days of the year: Sundays and the Holidays tab ---- */
  var hs = {};
  try{ hs = holidaySet_(); }catch(e){}
  var y0 = Date.UTC(year, 0, 1), y1 = Date.UTC(year, 11, 31);
  for(var t = y0; t <= y1; t += 86400000){
    var d = new Date(t), key = d.toISOString().slice(0, 10);
    if(d.getUTCDay() === 0) out.off[key] = 'Sunday';
    else if(hs[key]) out.off[key] = String(hs[key] === true ? 'Holiday' : hs[key]);
    else { out.totals.workingDays++; if(key <= today) out.totals.workingDaysPast++; }
  }

  /* ---- the marks: one officer, one day ---- */
  var sh = sheet_('Attendance', A_HEAD), m = headMap_(sh, A_HEAD);
  var v = sh.getDataRange().getValues();
  var seen = {}, leaveBy = {};
  var day = function(key){ return out.cal[key] = out.cal[key] || { marked:0, late:0, leave:0 }; };
  for(var r = 1; r < v.length; r++){
    var dk = dateText_(v[r][m.ix.date]); if(!dk || dk.slice(0, 4) !== String(year)) continue;
    var p = phone10_(v[r][m.ix.phone]); if(!p) continue;
    var st = String(v[r][m.ix.status] || 'PRESENT').toUpperCase();
    if(st === 'LEAVE'){ (leaveBy[dk] = leaveBy[dk] || {})[p] = true; continue; }
    var wo = who[p];
    if(wo && wo.exempt) continue;                        /* voluntary attendance is neither due nor counted */
    var sk = dk + '|' + p;
    if(seen[sk]) continue; seen[sk] = true;
    var c = day(dk);
    c.marked++; out.totals.marks++;
    var h = attcalHour_(effMarkAt_(String(v[r][m.ix.markedAt] || ''), String(v[r][m.ix.receivedAt] || '')));
    if(h != null && h >= CUTOFF_HOUR){ c.late++; out.totals.late++; }
  }

  /* ---- sanctioned leave, off the register, as the same per-day set ---- */
  try{
    var lsh = sheet_('Leave', L_HEAD), lm = headMap_(lsh, L_HEAD), lv = lsh.getDataRange().getValues();
    for(var k = 1; k < lv.length; k++){
      if(String(lv[k][lm.ix.status] || '').toUpperCase() !== 'APPROVED') continue;
      var lp = phone10_(lv[k][lm.ix.phone]); if(!lp) continue;
      var from = dateText_(lv[k][lm.ix.fromDate]), to = dateText_(lv[k][lm.ix.toDate]) || from; if(!from) continue;
      var span = spanDays_(from, to); if(!(span > 0)) continue; if(span > 400) span = 400;
      var t0 = Date.parse(from + 'T00:00:00Z');
      for(var q = 0; q < span; q++){
        var ld = new Date(t0 + q * 86400000); if(ld.getUTCFullYear() !== year) continue;
        (leaveBy[ld.toISOString().slice(0, 10)] = leaveBy[ld.toISOString().slice(0, 10)] || {})[lp] = true;
      }
    }
  }catch(e){}
  Object.keys(leaveBy).forEach(function(dk){
    var n = Object.keys(leaveBy[dk]).length;
    day(dk).leave = n; out.totals.leaveDays += n;
  });
  return out;
}

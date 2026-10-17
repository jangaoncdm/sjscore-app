/* ============================================================================
 * FEATURE · MYDAYS — an officer's own last fortnight, for his own phone
 * ----------------------------------------------------------------------------
 * Asked 16.10.2026, after the console's calendars: the same for each officer
 * in his app — the last fourteen days of his attendance, with his leave, on
 * the home screen. Fourteen cells, one a day: marked, marked late, on
 * sanctioned leave, a Sunday or a holiday, or not marked.
 *
 * IT IS HIS OWN RECORD AND NOBODY ELSE'S. The answer is for the officer the
 * token names; there is no phone parameter and a Collector reading it reads
 * his own fortnight. The phone may already hold a mark the district has not
 * received — a village road — and the app draws that day from its own store
 * as "held on this phone", never from this answer, because the receipt is the
 * phone's (the advisory lesson, learnt twice).
 *
 * THE DISTRICT'S READING OF EVERY DAY (rules 1 and 2). A mark is late by
 * effMarkAt_ against CUTOFF_HOUR — the same reading the ladder makes — so the
 * card and a reminder can never disagree about a morning. One officer one
 * day however many rows (a retry is not a second mark). Sanctioned leave is
 * read off the Leave register and off the leave rows on the Attendance tab
 * as one set, because silence under sanction is leave (rule 9). A Sunday or
 * a holiday is off, never unmarked. TODAY IS NEVER COUNTED AS UNMARKED: the
 * day is read at 18:00 and a card that painted the morning red at nine would
 * be judging a running day. An office whose attendance is voluntary gets its
 * marks drawn and nothing counted against the blanks.
 *
 * IT ACCUSES NOBODY. Nothing here writes a tab, raises a reminder or walks
 * the ladder; a day shown as not marked is the fact the register already
 * holds, drawn for the man it concerns. The answer carries sanction:false and
 * the card names no sanction.
 *
 * BOUNDED AND CACHED. Two hundred and eighty phones open this screen several
 * times a day, so the Attendance tab is read from its TAIL — the fortnight's
 * rows are the last rows, because the register appends by receipt — never
 * whole, and the answer is cached ten minutes per officer per day. A mark
 * that lands in between is drawn off the phone's own store until the next
 * read, which the app asks for fresh the moment a mark is received.
 * ========================================================================== */
var MYDAYS_SPAN       = 14;
var MYDAYS_TAIL_ROWS  = 12000;      /* ~300 officers × 14 days, with room for retries */
var MYDAYS_CACHE_SEC  = 600;

function mydaysHour_(iso){
  var t = Date.parse(String(iso || '')); if(isNaN(t)) return null;
  var d = new Date(t + 5.5 * 3600000);                 /* the district's clock, IST */
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}
function mydaysKey_(t){ return new Date(t).toISOString().slice(0, 10); }

function feature_mydays(){
  return {
    name: 'mydays',
    title: 'An officer’s own last fortnight — the attendance calendar on his home screen',
    tenants: ['SJGP', 'GP'],
    get: {
      myDays: function(p, u){
        var phone = phone10_(u.phone);
        if(!phone) return json_({ ok:false, error:'No officer on this token.' });
        var today = today_();
        var ck = 'mydays|' + tenant_().key + '|' + phone + '|' + today;
        var hit = null;
        try{ hit = cache_().get(ck); }catch(e){}
        if(hit && p.fresh !== '1'){ try{ return json_(JSON.parse(hit)); }catch(e){} }
        var out = myDays_(phone, u.role, today);
        try{ cache_().put(ck, JSON.stringify(out), MYDAYS_CACHE_SEC); }catch(e){}
        return json_(out);
      }
    }
  };
}

function myDays_(phone, role, today){
  var t1 = Date.parse(today + 'T00:00:00Z'), t0 = t1 - (MYDAYS_SPAN - 1) * 86400000;
  var from = mydaysKey_(t0);
  /* the Collector is not on the roll that is due, so his fortnight is read the way a voluntary office's is */
  var exempt = !!attExempt_(String(role || '').toUpperCase()) || String(role || '').toUpperCase() === 'COLLECTOR';

  /* ---- off days ---- */
  var hs = {};
  try{ hs = holidaySet_(); }catch(e){}

  /* ---- the officer's marks, off the tail of the register ---- */
  var marks = {}, leave = {}, outs = {}, fix = {};
  try{
    var sh = sheet_('Attendance', A_HEAD), m = headMap_(sh, A_HEAD);
    var last = sh.getLastRow(), cols = sh.getLastColumn();
    if(last >= 2){
      var head = sh.getRange(1, 1, 1, cols).getValues()[0].map(String);
      var ixOut = head.indexOf('outAt');
      var start = Math.max(2, last - MYDAYS_TAIL_ROWS);
      var v = sh.getRange(start, 1, last - start + 1, cols).getValues();
      for(var i = 0; i < v.length; i++){
        if(phone10_(v[i][m.ix.phone]) !== phone) continue;
        var dk = dateText_(v[i][m.ix.date]); if(!dk || dk < from || dk > today) continue;
        var st = String(v[i][m.ix.status] || 'PRESENT').toUpperCase();
        if(st === 'LEAVE'){ leave[dk] = String(v[i][m.ix.leaveType] || '') || 'leave'; continue; }
        var eff = effMarkAt_(String(v[i][m.ix.markedAt] || ''), String(v[i][m.ix.receivedAt] || ''));
        /* one officer one day: the EARLIEST reading is the mark that counts */
        if(!marks[dk] || (eff && eff < marks[dk])){
          marks[dk] = eff || marks[dk] || '';
          /* the fix that came with the mark that counts: where, and how precise */
          fix[dk] = { lat:Number(v[i][m.ix.lat]) || 0, lng:Number(v[i][m.ix.lng]) || 0, acc:Number(v[i][m.ix.accuracy]) || 0 };
        }
        if(ixOut >= 0 && String(v[i][ixOut] || '')) outs[dk] = true;
      }
    }
  }catch(e){}

  /* ---- sanctioned leave off the register, the same per-day set ---- */
  try{
    var lsh = sheet_('Leave', L_HEAD), lm = headMap_(lsh, L_HEAD), lv = lsh.getDataRange().getValues();
    for(var k = 1; k < lv.length; k++){
      if(phone10_(lv[k][lm.ix.phone]) !== phone) continue;
      if(String(lv[k][lm.ix.status] || '').toUpperCase() !== 'APPROVED') continue;
      var f = dateText_(lv[k][lm.ix.fromDate]), to = dateText_(lv[k][lm.ix.toDate]) || f; if(!f) continue;
      if(to < from || f > today) continue;
      var span = spanDays_(f, to); if(!(span > 0)) continue; if(span > 400) span = 400;
      var s0 = Date.parse(f + 'T00:00:00Z');
      for(var q = 0; q < span; q++){
        var key = mydaysKey_(s0 + q * 86400000);
        if(key >= from && key <= today) leave[key] = String(lv[k][lm.ix.type] || '') || 'leave';
      }
    }
  }catch(e){}

  /* ---- his place of duty, to measure each mark against (asked 17.10.2026:
     a location row under the fortnight). The same points the fence reads,
     through dutyPoints_ — alias, transliteration, mandal office and all —
     and the nearest of his own offices, as fenceCheck_ measures. A district
     officer holds no one place and gets the fix's precision alone. Nothing
     here decides anything: the figure is shown to the man it concerns. ---- */
  var pts = [], fenceKm = 0;
  try{
    var uo = findByPhone_(phone);
    if(uo && !districtRole_(uo.role)) pts = dutyPoints_(uo) || [];
  }catch(e){ pts = []; }
  try{ var fr = fenceRule_(); fenceKm = fr.off ? 0 : (Number(fr.km) || 0); }catch(e){}

  /* ---- the fortnight, oldest first ---- */
  var days = [], T = { working:0, marked:0, late:0, leaveDays:0, notMarked:0 };
  for(var t = t0; t <= t1; t += 86400000){
    var d = new Date(t), dk2 = mydaysKey_(t);
    var off = d.getUTCDay() === 0 ? 'Sunday' : (hs[dk2] ? String(hs[dk2] === true ? 'Holiday' : hs[dk2]) : '');
    var at = marks[dk2] || '';
    var h = at ? mydaysHour_(at) : null;
    var late = !!(at && h != null && h >= CUTOFF_HOUR);
    var day = { date:dk2, off:off, marked:!!at, at:at, late:late, out:!!outs[dk2], leave:leave[dk2] || '' };
    var fx = fix[dk2];
    if(fx){
      if(fx.acc > 0) day.acc = Math.round(fx.acc);
      if(fx.lat && fx.lng && pts.length){
        var best = null;
        pts.forEach(function(p){
          var dd = distKm_(fx.lat, fx.lng, p.lat, p.lng);
          if(dd != null && (best === null || dd < best.km)) best = { km:dd, place:p.name };
        });
        if(best){ day.km = best.km; day.place = best.place; }
      }
    }
    days.push(day);
    if(day.leave){ T.leaveDays++; continue; }
    if(off) continue;
    if(!exempt) T.working++;
    if(at){ T.marked++; if(late) T.late++; }
    /* today is a running day and is never counted as unmarked */
    else if(!exempt && dk2 < today) T.notMarked++;
  }
  return { ok:true, today:today, from:from, to:today, cutoff:CUTOFF_HOUR, exempt:exempt, fenceKm:fenceKm, placed:pts.length > 0,
           days:days, totals:T, at:new Date().toISOString(), sanction:false,
           note:'What the district holds for you, day by day. A day on sanctioned leave is leave, not absence; a late mark is never a miss; today is still running.' };
}

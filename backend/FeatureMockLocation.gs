/* ============================================================================
 * FEATURE · MOCKLOC — marks that were never measured
 * ----------------------------------------------------------------------------
 * Ordered 12.10.2026, off the register's own thirty days: thirty-four
 * Secretaries whose morning coordinate was typed into a mock-location app
 * rather than read from the sky — and typed, for most of them, as the
 * surveyed coordinate of their own village office, so the five-kilometre
 * fence looks straight at them and sees a man at his desk.
 *
 * WHAT A RECEIVER DOES AND AN APP DOES NOT. A satellite fix is a measurement
 * with noise in it: the district's honest officers scatter by a median of
 * twenty-five metres from one morning to the next, and the last decimal of
 * a latitude is as good as random. A mock-location app returns the point it
 * was given, byte for byte, every morning, and claims one metre for it
 * because that is its default. So the reading is three questions, asked of
 * every officer over the window:
 *
 *   · the same coordinate to six decimals on two or more different mornings,
 *     from a fix that claimed MOCK_FINE_M or better. This is the hard one:
 *     nothing a handset measures repeats to eleven centimetres across days;
 *   · a claimed accuracy of 0 or 1 m. A LEAD AND NOT A VERDICT: a new
 *     dual-band handset under open sky claims a metre honestly, and its
 *     points move from day to day. A metre at a point that never moves is
 *     an app; a metre at points that wander is a good phone, and is listed
 *     apart as a lead;
 *   · one fine coordinate under two officers on one morning — one handset,
 *     or one typed point, marking for two.
 *
 * WHAT IS HONEST AND IS NOT COUNTED. Google's network positioning hands every
 * phone in the same building the same point — the centroid of the wifi
 * access points in view, claiming twenty metres, or of the cell tower,
 * claiming two kilometres — and the MPDO offices of the district produce
 * identical coordinates for half their staff every morning. MOCK_FINE_M sits
 * at fifteen metres because a network fix does not claim that and a
 * satellite in the open does; nothing coarser is ever held against anyone.
 * A mark that reached the district days after the date it claims is printed
 * and not weighed: the app sends when it has a line.
 *
 * IT ACCUSES NOBODY (rule 10). Nothing here refuses a mark, writes a tab,
 * raises a reminder or walks the ladder. It is the reading the Collector
 * takes before he asks a mandal to open a phone's Developer options, where
 * the mock-location setting settles the question in a minute. The one rule
 * that would have caught the apps automatically — refuse any fix better than
 * two metres — would have refused twenty-four honest officers for owning a
 * good phone, and was considered and rejected on the day.
 *
 * READ-ONLY and the Collector's alone. One file; Code.gs gained nothing.
 * ========================================================================== */
var MOCK_FINE_M   = 15;   /* a satellite claim; a network fix does not claim this */
var MOCK_METRE_M  = 1;    /* what the apps claim by default */
var MOCK_MIN_DAYS = 3;    /* fewer located days than this and he is not judged */
var MOCK_MAX_DAYS = 90;   /* the window the console may ask for */
var MOCK_FIX_CAP  = 60;   /* officer-days carried per officer in the answer */

function mockMetres_(aLat, aLng, bLat, bLng){
  var R = 6371000, rad = Math.PI / 180;
  var dLa = (bLat - aLat) * rad, dLn = (bLng - aLng) * rad;
  var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) +
          Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLn / 2) * Math.sin(dLn / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function mockMedian_(xs){
  var a = xs.slice().sort(function(x, y){ return x - y; }), n = a.length;
  if(!n) return null;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}
function mockDayBack_(d, n){
  var t = Date.parse(String(d) + 'T00:00:00Z');
  return isNaN(t) ? String(d) : new Date(t - n * 86400000).toISOString().slice(0, 10);
}
function mockSay_(m){ return m == null ? '' : (m < 1000 ? Math.round(m) + ' m' : (Math.round(m / 100) / 10) + ' km'); }

function feature_mockloc(){
  return {
    name: 'mockloc',
    title: 'Marks that were never measured — the location a handset did not read',
    tenants: ['SJGP', 'GP'],
    get: {
      mockloc: function(p, u){
        if(u.role !== 'COLLECTOR')
          return json_({ ok:false, error:'This reading is the Collector' + String.fromCharCode(8217) + 's alone.' });
        var days = Number(p.days);
        if(!(days > 0)) days = 30;
        days = Math.min(MOCK_MAX_DAYS, Math.max(7, Math.round(days)));
        return json_(mockReading_(days));
      }
    }
  };
}

/* THE READING. One pass over the Attendance tab, one mark per officer per
   day (the first row of the date — a retry is not a second morning), the
   officer's own office points read through dutyPoints_ so the pinned point
   can be measured from where he is supposed to be. */
function mockReading_(days){
  var today = today_(), from = mockDayBack_(today, days);
  var out = { ok:true, at:new Date().toISOString(), today:today, from:from, to:today, days:days,
              fine:MOCK_FINE_M, metre:MOCK_METRE_M, minDays:MOCK_MIN_DAYS,
              marks:0, leaveRows:0, officers:0, located:0, noFix:0, judged:0, clean:0,
              baselineM:null, metreDays:0, metreOfficers:0,
              findings:[], leads:[], shared:[], notJudged:[] };

  /* the roll, for the office points */
  var places = {}, offs = {}, dutyU = {};
  try{ places = gpPlaces_(); }catch(e){}
  try{ offs = mandalOffices_(); }catch(e){}
  try{
    var dt = uidx_(), dv = dt.sh.getDataRange().getValues();
    for(var i = 1; i < dv.length; i++){
      var ph2 = phone10_(dv[i][dt.ix.phone]); if(!ph2) continue;
      if(dt.ix.active >= 0 && String(dv[i][dt.ix.active]).toUpperCase() === 'FALSE') continue;
      var mn = cell_(dv[i], dt.ix.mandal);
      var uo = dutyU[ph2] = dutyU[ph2] || { role:cell_(dv[i], dt.ix.role), mandal:mn, mandals:[], gps:[] };
      if(mn && uo.mandals.indexOf(mn) < 0) uo.mandals.push(mn);
      String(dv[i][dt.ix.gp] || '').split(',').map(function(x){ return x.trim(); }).filter(String)
        .forEach(function(g){ if(uo.gps.indexOf(g) < 0) uo.gps.push(g); });
    }
  }catch(e){}
  var ptsCache = {};
  var officeOf = function(ph){
    if(!(ph in ptsCache)){
      var uo = dutyU[ph], pts = [];
      try{ pts = (uo && !districtRole_(uo.role)) ? dutyPoints_(uo, { places:places, offs:offs }) : []; }catch(e){ pts = []; }
      ptsCache[ph] = pts;
    }
    return ptsCache[ph];
  };
  var fromOffice = function(ph, lat, lng){
    var best = null;
    officeOf(ph).forEach(function(o){
      var d = mockMetres_(lat, lng, o.lat, o.lng);
      if(best === null || d < best.m) best = { m:d, name:o.name };
    });
    return best;
  };

  /* ---- gather ---- */
  var sh = sheet_('Attendance', A_HEAD), m = headMap_(sh, A_HEAD);
  var v = sh.getDataRange().getValues();
  var who = {}, byDayPt = {};
  for(var r = 1; r < v.length; r++){
    var d = dateText_(v[r][m.ix.date]);
    if(!d || d < from || d > today) continue;
    var ph = phone10_(v[r][m.ix.phone]); if(!ph) continue;
    if(/LEAVE/i.test(String(v[r][m.ix.status] || ''))){ out.leaveRows++; continue; }
    out.marks++;
    var o = who[ph] = who[ph] || { phone:ph, name:String(v[r][m.ix.name] || ''), role:String(v[r][m.ix.role] || ''),
                                   mandal:String(v[r][m.ix.mandal] || ''), days:{}, fixes:[] };
    if(o.days[d]) continue;
    o.days[d] = 1;
    var lat = Number(v[r][m.ix.lat]), lng = Number(v[r][m.ix.lng]);
    var accRaw = v[r][m.ix.accuracy], acc = (accRaw === '' || accRaw == null) ? null : Number(accRaw);
    if(!(isFinite(lat) && isFinite(lng) && lat && lng)){ out.noFix++; continue; }
    out.located++;
    var fx = { d:d, lat:lat, lng:lng, acc:acc, at:String(v[r][m.ix.markedAt] || ''), rx:String(v[r][m.ix.receivedAt] || ''),
               ver:String(v[r][m.ix.verified] || '') };
    o.fixes.push(fx);
    if(acc != null && acc <= MOCK_FINE_M){
      var key = d + '|' + lat.toFixed(6) + ',' + lng.toFixed(6);
      (byDayPt[key] = byDayPt[key] || []).push({ phone:ph, name:o.name, role:o.role, mandal:o.mandal, at:fx.at, acc:acc });
    }
  }
  out.officers = Object.keys(who).length;

  /* ---- the district's own baseline: how far an honest fine fix moves ---- */
  var scatter = [];
  Object.keys(who).forEach(function(ph){
    var fine = who[ph].fixes.filter(function(f){ return f.acc != null && f.acc <= MOCK_FINE_M; });
    if(fine.length < 2) return;
    var c = { lat:mockMedian_(fine.map(function(f){ return f.lat; })), lng:mockMedian_(fine.map(function(f){ return f.lng; })) };
    scatter.push(mockMedian_(fine.map(function(f){ return mockMetres_(f.lat, f.lng, c.lat, c.lng); })));
  });
  out.baselineM = scatter.length ? Math.round(mockMedian_(scatter)) : null;

  /* ---- one point, two officers, one morning (fine fixes only) ---- */
  var sharedBy = {};
  Object.keys(byDayPt).forEach(function(k){
    var phs = {}; byDayPt[k].forEach(function(x){ phs[x.phone] = 1; });
    if(Object.keys(phs).length < 2) return;
    var occ = { date:k.split('|')[0], point:k.split('|')[1], officers:byDayPt[k].map(function(x){
      return { phone:x.phone, name:x.name, role:x.role, mandal:x.mandal, at:x.at, acc:x.acc }; }) };
    out.shared.push(occ);
    Object.keys(phs).forEach(function(ph){ (sharedBy[ph] = sharedBy[ph] || []).push(occ); });
  });
  out.shared.sort(function(a, b){ return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });

  /* ---- officer by officer ---- */
  Object.keys(who).forEach(function(ph){
    var o = who[ph], n = Object.keys(o.days).length, loc = o.fixes.length;
    if(loc < MOCK_MIN_DAYS){ out.notJudged.push({ phone:ph, name:o.name, role:o.role, mandal:o.mandal, days:n, located:loc }); return; }
    out.judged++;
    var fine = o.fixes.filter(function(f){ return f.acc != null && f.acc <= MOCK_FINE_M; });
    var ev = [], score = 0;
    var row = { phone:ph, name:o.name, role:o.role, mandal:o.mandal, days:n, located:loc, fine:fine.length,
                score:0, repeat:null, metre:null, shared:[], late:0, office:null, fixes:[] };

    /* the same coordinate on different mornings */
    var seen = {};
    fine.forEach(function(f){ var k = f.lat.toFixed(6) + ',' + f.lng.toFixed(6); (seen[k] = seen[k] || []).push(f); });
    var reps = Object.keys(seen).filter(function(k){
      var ds = {}; seen[k].forEach(function(f){ ds[f.d] = 1; }); return Object.keys(ds).length >= 2; })
      .map(function(k){
        var ds = {}; seen[k].forEach(function(f){ ds[f.d] = 1; });
        var la = Number(k.split(',')[0]), lo = Number(k.split(',')[1]), off = fromOffice(ph, la, lo);
        var accs = {}; seen[k].forEach(function(f){ accs[f.acc] = 1; });
        return { point:k, dates:Object.keys(ds).sort(), accs:Object.keys(accs).map(Number).sort(function(a, b){ return a - b; }),
                 officeM:off ? Math.round(off.m) : null, officeName:off ? off.name : '' };
      }).sort(function(a, b){ return b.dates.length - a.dates.length; });
    if(reps.length){
      var repDays = {}; reps.forEach(function(x){ x.dates.forEach(function(d){ repDays[d] = 1; }); });
      row.repeat = { days:Object.keys(repDays).length, fine:fine.length, points:reps };
      score += 3; ev.push('repeat');
    }

    /* the accuracy an app claims by default */
    var low = o.fixes.filter(function(f){ return f.acc != null && f.acc <= MOCK_METRE_M; });
    if(low.length >= 2){
      var lowPts = {}; low.forEach(function(f){ lowPts[f.lat.toFixed(6) + ',' + f.lng.toFixed(6)] = 1; });
      var pinned = Object.keys(lowPts).length < low.length;
      var others = o.fixes.filter(function(f){ return f.acc != null && f.acc > MOCK_METRE_M; }).map(function(f){ return f.acc; });
      var offDs = low.map(function(f){ return fromOffice(ph, f.lat, f.lng); }).filter(Boolean);
      var accs2 = {}; low.forEach(function(f){ accs2[f.acc] = 1; });
      row.metre = { days:low.length, located:loc, points:Object.keys(lowPts).length, pinned:pinned,
                    accs:Object.keys(accs2).map(Number), dates:low.map(function(f){ return f.d; }).sort(),
                    otherMin:others.length ? Math.min.apply(null, others) : null,
                    otherMax:others.length ? Math.max.apply(null, others) : null,
                    officeM:offDs.length ? Math.round(mockMedian_(offDs.map(function(x){ return x.m; }))) : null,
                    officeName:offDs.length ? offDs[0].name : '' };
      out.metreDays += low.length; out.metreOfficers++;
      /* a metre at a point that never moves is an app; a metre at points
         that wander is a good phone, and is a lead and not a finding */
      score += (low.length >= MOCK_MIN_DAYS && pinned) ? 3 : 1; ev.push('metre');
    }

    if(sharedBy[ph]){ row.shared = sharedBy[ph]; score += 3; ev.push('shared'); }

    row.late = o.fixes.filter(function(f){
      var t = Date.parse(f.rx), d0 = Date.parse(f.d + 'T00:00:00+05:30');
      return isFinite(t) && isFinite(d0) && t - d0 >= 2 * 86400000; }).length;

    /* where the evidence points sit, from his own office */
    var offPts = [];
    if(row.repeat) row.repeat.points.forEach(function(x){ if(x.officeM != null) offPts.push(x.officeM); });
    if(!offPts.length && row.metre && row.metre.officeM != null) offPts.push(row.metre.officeM);
    if(offPts.length){ var offName = row.repeat && row.repeat.points[0].officeName || (row.metre && row.metre.officeName) || '';
      row.office = { m:Math.round(mockMedian_(offPts)), name:offName }; }

    row.score = score; row.signals = ev;
    if(!ev.length){ out.clean++; return; }
    row.fixes = o.fixes.slice().sort(function(a, b){ return a.d < b.d ? -1 : 1; }).slice(0, MOCK_FIX_CAP)
      .map(function(f){ var off = fromOffice(ph, f.lat, f.lng);
        return { d:f.d, lat:f.lat, lng:f.lng, acc:f.acc, at:f.at, rx:f.rx, ver:f.ver, officeM:off ? Math.round(off.m) : null }; });
    if(score >= 3) out.findings.push(row); else out.leads.push(row);
  });
  var evDays = function(r){ return (r.repeat ? r.repeat.days : 0) + (r.metre ? r.metre.days : 0); };
  out.findings.sort(function(a, b){ return (b.score - a.score) || (evDays(b) - evDays(a)); });
  out.leads.sort(function(a, b){ return evDays(b) - evDays(a); });
  out.notJudged.sort(function(a, b){ return String(a.name).localeCompare(String(b.name)); });
  return out;
}

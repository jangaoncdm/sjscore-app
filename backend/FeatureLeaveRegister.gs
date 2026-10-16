/* ============================================================================
 * FEATURE · LEAVEREG — the leave register, officer by officer, for a year
 * ----------------------------------------------------------------------------
 * Ordered 16.10.2026: the leave register on the console, with a heat map and
 * every officer's balance and days taken — the complete register, not the
 * forty most recent orders the Leave screen had carried until now.
 *
 * ONE READ, ONE ARITHMETIC. The figures here are the ones the sanction is
 * refused on, and no others: the allowance comes from entitlement_ (the
 * tenant's own opening figures, the pro-rated first year, the Collector's
 * order cutting 2026's optional holidays to three) and the days taken are
 * counted exactly as clUsed_ counts them — APPROVED rows only, the days the
 * register debited, and AN APPLICATION COUNTED ONCE however many rows carry
 * its id, because a twin row is not a second absence and this is the figure
 * that would otherwise turn a man's next debit into loss of pay. A screen
 * that said one thing while the order refused on another would be the
 * register arguing with itself in front of the Collector.
 *
 * MEDICAL LEAVE ANSWERS TO NO YEARLY FIGURE, and the register says so rather
 * than printing a balance of nought: its days are counted and the spell cap
 * is carried beside them. The headquarters permission is not leave and is
 * counted as occasions, not days. An application still awaiting orders is
 * carried as AWAITING, never as taken: nothing is debited until the
 * Collector's hand has passed on it.
 *
 * THE HEAT MAP SPLITS A SPELL ACROSS THE MONTHS IT ACTUALLY FALLS IN. A spell
 * from 29 January to 2 February is three days of January and two of
 * February, in proportion to the calendar days of the span and scaled to the
 * days the register debited, so the twelve cells of a row add up to the
 * officer's year.
 *
 * IT ACCUSES NOBODY AND WRITES NOTHING. The Collector's alone (rule 6), read-
 * only, bounded: the Leave tab is read whole, which is right at 284 officers
 * and is read once per opening of the screen and not on every poll. On the
 * District HRMS the roll runs to thousands; the answer carries at most
 * LVREG_MAX_OFFICERS rows and says when it has left some out, rather than
 * silently showing a register that is not the whole register.
 * ========================================================================== */
var LVREG_TYPES = ['CL', 'EL', 'OH', 'ML', 'HQ'];
var LVREG_MAX_OFFICERS = 3000;

function lvregMonthSplit_(from, to, days){
  /* the twelve cells of a spell: calendar days of the span in each month,
     scaled so they sum to the days the register debited */
  var out = [0,0,0,0,0,0,0,0,0,0,0,0];
  var span = spanDays_(from, to);
  if(!(span > 0) || !(days > 0)) return out;
  var a = Date.parse(String(from) + 'T00:00:00Z');
  var yr = Number(String(from).slice(0, 4));
  for(var i = 0; i < span; i++){
    var d = new Date(a + i * 86400000);
    if(d.getUTCFullYear() !== yr) continue;       /* a spell that runs into the next year stops at its edge */
    out[d.getUTCMonth()] += days / span;
  }
  return out.map(function(x){ return Math.round(x * 10) / 10; });
}

function feature_leavereg(){
  return {
    name: 'leavereg',
    title: 'The leave register — every officer’s account for the year, with the months it fell in',
    tenants: ['SJGP', 'GP', 'HRMS'],
    get: {
      leaveRegister: function(p, u){
        if(u.role !== 'COLLECTOR')
          return json_({ ok:false, error:'The leave register is the Collector' + String.fromCharCode(8217) + 's alone.' });
        var year = Number(p.year);
        if(!(year > 2000 && year < 2100)) year = Number(String(today_()).slice(0, 4));
        return json_(leaveRegister_(year));
      }
    }
  };
}

function leaveRegister_(year){
  var out = { ok:true, at:new Date().toISOString(), today:today_(), year:year,
              entitlement:{}, mlSpell:ML_MAX_SPELL, years:[], officers:[], totals:{}, truncated:false };
  LVREG_TYPES.forEach(function(t){ out.entitlement[t] = entitlement_(t, year); });

  /* ---- the roll: one line per officer, the union of his rows ---- */
  var who = {}, order = [];
  try{
    var dt = uidx_(), dv = dt.sh.getDataRange().getValues();
    for(var i = 1; i < dv.length; i++){
      var ph = phone10_(dv[i][dt.ix.phone]); if(!ph) continue;
      var role = cell_(dv[i], dt.ix.role).toUpperCase();
      if(role === 'COLLECTOR') continue;                       /* he passes the orders; he does not apply here */
      var active = dt.ix.active < 0 || String(dv[i][dt.ix.active]).toUpperCase() !== 'FALSE';
      var o = who[ph];
      if(!o){
        o = who[ph] = { phone:ph, name:cell_(dv[i], dt.ix.name), role:role, mandal:cell_(dv[i], dt.ix.mandal),
                        active:active, onRoll:true };
        order.push(ph);
      } else if(!o.active && active){ o.active = true; o.name = o.name || cell_(dv[i], dt.ix.name); }
      if(!o.mandal) o.mandal = cell_(dv[i], dt.ix.mandal);
    }
  }catch(e){}

  /* ---- the register: every application carrying an id, folded to one line ---- */
  var sh = sheet_('Leave', L_HEAD), m = headMap_(sh, L_HEAD);
  var v = sh.getDataRange().getValues();
  var rows = [], yearsSeen = {};
  for(var r = 1; r < v.length; r++){
    var from = dateText_(v[r][m.ix.fromDate]), to = dateText_(v[r][m.ix.toDate]) || from;
    if(!from) continue;
    var y = Number(from.slice(0, 4)); yearsSeen[y] = true;
    if(y !== year) continue;
    rows.push({ id:cell_(v[r], m.ix.id), phone:phone10_(v[r][m.ix.phone]), name:cell_(v[r], m.ix.name),
                role:cell_(v[r], m.ix.role).toUpperCase(), mandal:cell_(v[r], m.ix.mandal),
                type:cell_(v[r], m.ix.type).toUpperCase(), from:from, to:to,
                days:Number(v[r][m.ix.days]) || 0, status:String(v[r][m.ix.status] || 'PENDING').toUpperCase(),
                decidedAt:String(v[r][m.ix.decidedAt] || '') });
  }
  out.years = Object.keys(yearsSeen).map(Number).sort();
  if(out.years.indexOf(year) < 0) out.years.push(year), out.years.sort();
  /* a row with no id is not an application (it cannot be decided); twins fold to the decided row */
  var apps = leaveFold_(rows);

  var blank = function(){
    var t = {};
    LVREG_TYPES.forEach(function(k){ t[k] = { taken:0, awaiting:0, occasions:0, allowed:out.entitlement[k] || 0, left:null }; });
    return { months:[0,0,0,0,0,0,0,0,0,0,0,0], awaitingMonths:[0,0,0,0,0,0,0,0,0,0,0,0],
             types:t, taken:0, awaiting:0, refused:0, spells:[] };
  };
  var acct = {};
  apps.forEach(function(a){
    if(!a.phone) return;
    if(!who[a.phone]){
      /* leave on the register from a number no longer on the roll: shown, and said so */
      who[a.phone] = { phone:a.phone, name:a.name, role:a.role, mandal:a.mandal, active:false, onRoll:false };
      order.push(a.phone);
    }
    var ac = acct[a.phone] = acct[a.phone] || blank();
    var t = ac.types[a.type]; if(!t) return;                /* a kind this register does not know is not counted */
    if(a.status === 'APPROVED'){
      var days = a.type === 'HQ' ? 0 : a.days;
      t.taken += days; t.occasions += 1; ac.taken += days;
      lvregMonthSplit_(a.from, a.to, a.type === 'HQ' ? 1 : a.days).forEach(function(x, i){ ac.months[i] = Math.round((ac.months[i] + x) * 10) / 10; });
      if(ac.spells.length < 40) ac.spells.push({ id:a.id, type:a.type, from:a.from, to:a.to, days:a.days, status:'APPROVED' });
    } else if(a.status === 'PENDING'){
      var pd = a.type === 'HQ' ? 0 : a.days;
      t.awaiting += pd; ac.awaiting += pd;
      lvregMonthSplit_(a.from, a.to, a.type === 'HQ' ? 1 : a.days).forEach(function(x, i){ ac.awaitingMonths[i] = Math.round((ac.awaitingMonths[i] + x) * 10) / 10; });
      if(ac.spells.length < 40) ac.spells.push({ id:a.id, type:a.type, from:a.from, to:a.to, days:a.days, status:'PENDING' });
    } else {
      ac.refused += 1;                                       /* refused, withdrawn, sent back: on the register, never debited */
    }
  });

  /* ---- balances, the way the sanction reads them ---- */
  var totals = { officers:0, withLeave:0, taken:0, awaiting:0, refused:0, exhausted:0, byType:{} };
  LVREG_TYPES.forEach(function(k){ totals.byType[k] = { taken:0, awaiting:0, occasions:0 }; });
  order.forEach(function(ph){
    var o = who[ph];
    if(!o.active && !acct[ph]) return;                       /* an inactive officer with no leave this year is not a line */
    var ac = acct[ph] || blank();
    LVREG_TYPES.forEach(function(k){
      var t = ac.types[k];
      /* a yearly figure exists for CL, EL and OH; medical leave answers to a
         spell cap and the headquarters permission is not leave at all */
      t.left = (k === 'ML' || k === 'HQ') ? null : Math.max(0, t.allowed - t.taken);
      totals.byType[k].taken += t.taken; totals.byType[k].awaiting += t.awaiting; totals.byType[k].occasions += t.occasions;
    });
    var line = { phone:ph, name:o.name, role:o.role, mandal:o.mandal, active:o.active, onRoll:o.onRoll,
                 months:ac.months, awaitingMonths:ac.awaitingMonths, types:ac.types,
                 taken:Math.round(ac.taken * 10) / 10, awaiting:ac.awaiting, refused:ac.refused, spells:ac.spells,
                 clExhausted: ac.types.CL.allowed > 0 && ac.types.CL.taken >= ac.types.CL.allowed };
    totals.officers++;
    if(ac.taken > 0) totals.withLeave++;
    totals.taken += ac.taken; totals.awaiting += ac.awaiting; totals.refused += ac.refused;
    if(line.clExhausted) totals.exhausted++;
    if(out.officers.length < LVREG_MAX_OFFICERS) out.officers.push(line); else out.truncated = true;
  });
  totals.taken = Math.round(totals.taken * 10) / 10;
  out.totals = totals;
  return out;
}

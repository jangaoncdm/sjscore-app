/* ============================================================================
 * FEATURE · THE MPDO OFFICE STAFF
 * ----------------------------------------------------------------------------
 * Ordered 04.10.2026: the staff of the twelve MPDO offices are added to this
 * register "for attendance and leave management, nothing else", in the
 * district's own words. 192 men and women — AEEs, APOs, Senior and Junior
 * Assistants, Data Entry Operators, Tech Assistants, Typists, Office
 * Subordinates, one Driver — carrying a name, a designation, an employee id,
 * a mobile and the coordinates of the office they sit in.
 *
 * THEY ARE ONE ROLE, `STAFF`, AND THEIR DESIGNATION IS INFORMATION. Eleven
 * designations would be eleven roles, and every rule in four thousand lines
 * that asks what a role may do would have to answer for each of them. The
 * code reads STAFF; the roll prints "AEE (PR)" because that is what a person
 * reading it needs to see.
 *
 * WHAT THEY ARE KEPT OUT OF, each of which would otherwise have swept them in:
 *
 *   · the show-cause ladder — BUILT AND SWITCHED OFF, exactly as the whole
 *     Gram Palana register is. `sanctionExempt` in TENANTS carries it and
 *     noticeGaps_ is the one gate it passes through, so the reminder, the
 *     notice, the casual-leave debit and the lock on the app all stand down
 *     together. An Office Subordinate who misses three days is NOT served a
 *     numbered notice reciting Rule 3 of the Conduct Rules;
 *   · the Gram Panchayat Development Plan — gpdpDue_ answers yes to every
 *     role but the Collector, so without `planExempt` all 192 would be called
 *     for a plan about a village they do not hold;
 *   · the 100-mark evaluation and the filing schedule — free, because STAFF
 *     is neither a viewer nor on SCH_SHARE, but suite 32 asserts it anyway.
 *
 * AND THEY BRING SOMETHING THIS REGISTER NEVER HAD: the office they sit in,
 * with its coordinates, one point per mandal. The sanitation roll is Mandal +
 * GP and carries none (rule 10), which is why a mark here is measured against
 * the median of a mandal's own marks. For the staff there is a real place of
 * duty, so the distance is measured from it — and, as everywhere, it MEASURES
 * AND ACCUSES NOBODY. The distance is printed; the mark stands.
 *
 * It proposes before it writes, like every other paste on this console.
 * ========================================================================== */

/* the office writes a designation in words; this is not a role and is not
   read as one — it is kept so the roll can be read by a person */
var STAFF_ROLE = 'STAFF';

/* `Mandals` is written from this table too: Mandal, Office, Lat, Lng. It is
   data about a PLACE and not about a person, so it is the one part of this
   paste that is not somebody's personal detail. */
var STAFF_MANDAL_HEAD = ['Mandal','Office','Lat','Lng'];

/* the district's box — a coordinate outside it is not a coordinate (two of
   the Gram Palana roll's 180 were wrong, and a distance off a bad reading is
   a five-hundred-kilometre figure printed against a man in his own office) */
var STAFF_BOX = { latMin:17.0, latMax:18.6, lngMin:78.5, lngMax:80.2 };

function feature_staff(){
  return {
    title: 'MPDO office staff — attendance and leave, and nothing else',
    tenants: ['SJGP'],

    post: {
      staffUpdate: function(b, u){
        if(u.role !== 'COLLECTOR')
          return json_({ ok:false, error:'The office roll is written by the Collector alone.' });
        const rows = Array.isArray(b.rows) ? b.rows : [];
        if(!rows.length)
          return json_({ ok:false, error:'Nothing was pasted. An empty table is not an instruction to clear the roll.' });
        if(rows.length > 1000)
          return json_({ ok:false, error:'That is more rows than a district has staff. Nothing was read.' });

        const lock = LockService.getScriptLock();
        try{ lock.waitLock(30000); }
        catch(err){ return json_({ ok:false, error:'busy — try again' }); }
        try{
          const t = uidx_(), v = t.sh.getDataRange().getValues();
          /* ONE NUMBER APPEARING TWICE IN THE PASTE ITSELF is settled before
             anything is compared with the register: the district's list of
             04.10.2026 carried five, four of them one person under two
             mandals and one of them two different names sharing a mobile. */
          const byPhone = {};
          rows.forEach(function(r, i){
            const p = phone10_(r.phone || '');
            (byPhone[p] = byPhone[p] || []).push(i);
          });
          const plans = rows.map(function(r, i){ return staffPlan_(t, v, r, byPhone, i); });
          if(b.dry) return json_({ ok:true, dry:true, plans:plans, counts:staffCounts_(plans) });
          const done = staffWrite_(t, plans, u);
          return json_({ ok:true, dry:false, plans:plans, counts:staffCounts_(plans),
                         added:done.added, corrected:done.corrected, offices:done.offices,
                         pins:done.pins });
        } finally { lock.releaseLock(); }
      }
    }
  };
}

/* ------------------------------------------------------------------ planning */
function staffPlan_(t, v, r, byPhone, idx){
  const mandal = String(r.mandal || '').trim();
  const name   = String(r.name || '').trim();
  const desig  = String(r.desig || '').trim();
  const emp    = String(r.emp || '').trim();
  const phone  = phone10_(r.phone || '');
  const lat = Number(r.lat), lng = Number(r.lng);

  const out = { mandal:mandal, name:name, desig:desig, emp:emp, phone:phone, changes:[] };

  if(phone.length !== 10){ out.verdict = 'refused'; out.why = 'a mobile number is ten digits'; return out; }
  if(!mandal){ out.verdict = 'refused'; out.why = 'a mandal is needed — every member of staff sits in one'; return out; }
  if(!name){ out.verdict = 'refused'; out.why = 'a name is needed — the roll is read by people'; return out; }

  /* ONE NUMBER, ONE OFFICER — and the paste must answer for itself before the
     register is asked anything. Where the same mobile carries two DIFFERENT
     people it is refused and both are named; where it carries the same person
     twice it is a second mandal, which is additional charge and is allowed. */
  const mates = (byPhone[phone] || []).filter(function(i){ return i !== idx; });
  const other = mates.map(function(i){ return null; });
  if(mates.length){
    out.alsoInPaste = mates.length;
  }

  const mine = rollRows_(t, v, phone);
  const act = mine.filter(function(i){
    return !(String(v[i][t.ix.active]).toUpperCase() === 'FALSE');
  });

  if(act.length){
    const was = { name:cell_(v[act[0]], t.ix.name), role:cell_(v[act[0]], t.ix.role).toUpperCase(),
                  mandal:cell_(v[act[0]], t.ix.mandal) };
    out.was = was;
    /* HE IS ALREADY ON THE REGISTER AS SOMEBODY ELSE. One mobile greeting a
       man with another man's name is the fault the roll has a rule about, and
       a Secretary is not quietly turned into office staff. */
    if(!postSameMan_(was.name, name)){
      out.verdict = 'refused';
      out.why = 'that number is on the roll as "' + was.name + '", ' + was.role +
                (was.mandal ? ' of ' + was.mandal : '') +
                '. One number is one officer: settle which of the two holds it before this is written.';
      return out;
    }
    /* THE SAME MAN, ALREADY AN OFFICER OF THIS REGISTER. A Panchayat Secretary
       or an MPO who also appears on the office list is NOT demoted to STAFF:
       his role carries his villages, his filings and his place in the ladder,
       and overwriting it would take all of that away. His designation and his
       employee id are written and nothing else is touched. */
    if(was.role !== STAFF_ROLE){
      out.verdict = 'correct';
      out.why = 'he is already on the roll as ' + was.role + ' — his role is left exactly as it is';
      if(desig) out.changes.push('designation "' + desig + '" noted');
      if(emp) out.changes.push('employee id ' + emp + ' noted');
      out.row = act[0] + 1;
      out.keepRole = true;
      if(!out.changes.length){ out.verdict = 'unchanged'; out.why = 'already on the roll as ' + was.role; }
      return out;
    }
    /* already staff: correct what differs, and a second mandal is additional
       charge and gets a row of its own */
    const holds = act.filter(function(i){ return pkey_(cell_(v[i], t.ix.mandal)) === pkey_(mandal); });
    if(holds.length){
      out.row = holds[0] + 1;
      if(cell_(v[holds[0]], t.ix.name) !== name) out.changes.push('name "' + cell_(v[holds[0]], t.ix.name) + '" → "' + name + '"');
      if(t.ix.designation >= 0 && cell_(v[holds[0]], t.ix.designation) !== desig && desig)
        out.changes.push('designation → ' + desig);
      if(t.ix.empid >= 0 && cell_(v[holds[0]], t.ix.empid) !== emp && emp)
        out.changes.push('employee id → ' + emp);
      out.verdict = out.changes.length ? 'correct' : 'unchanged';
      if(!out.changes.length) out.why = 'already on the roll, and nothing differs';
      return out;
    }
    out.verdict = 'add';
    out.why = 'he is on the roll in ' + act.map(function(i){ return cell_(v[i], t.ix.mandal); }).join(', ') +
              ' — this is a second office, taken as additional charge';
    out.changes.push('a row of his own for ' + mandal);
    return out;
  }

  out.verdict = 'register';
  out.why = 'that number is not on the roll';
  out.changes.push('registered as office staff of ' + mandal + (desig ? ' · ' + desig : ''));
  out.needsPin = true;

  /* THE OFFICE IS A PLACE AND NOT A PERSON, so it is written to `Mandals`
     whatever happens to the row — but a coordinate outside the district is
     dropped rather than believed. */
  if(isFinite(lat) && isFinite(lng) &&
     lat >= STAFF_BOX.latMin && lat <= STAFF_BOX.latMax &&
     lng >= STAFF_BOX.lngMin && lng <= STAFF_BOX.lngMax){
    out.office = { lat:lat, lng:lng };
  } else if(isFinite(lat) || isFinite(lng)){
    out.officeDropped = true;
  }
  return out;
}

function staffCounts_(plans){
  const c = { register:0, add:0, correct:0, unchanged:0, refused:0 };
  plans.forEach(function(p){ if(c[p.verdict] != null) c[p.verdict]++; });
  return c;
}

/* ------------------------------------------------------------------ writing */
function staffWrite_(t, plans, u){
  const sh = t.sh;
  let added = 0, corrected = 0;
  const pins = [], offices = {};

  plans.forEach(function(p){
    if(p.verdict === 'refused' || p.verdict === 'unchanged') return;
    if(p.office) offices[pkey_(p.mandal)] = { mandal:p.mandal, lat:p.office.lat, lng:p.office.lng };

    const put = function(row, k, val){ if(t.ix[k] >= 0) row[t.ix[k]] = val; };

    if(p.verdict === 'register' || p.verdict === 'add'){
      const pin = dayPin_(p.phone);
      const width = Math.max(sh.getLastColumn(), U_HEAD.length);
      const row = new Array(width).fill('');
      put(row, 'phone', "'" + p.phone); put(row, 'name', p.name);
      put(row, 'role', STAFF_ROLE); put(row, 'mandal', p.mandal); put(row, 'gp', '');
      put(row, 'designation', p.desig); put(row, 'empid', p.emp);
      /* A SECOND ROW CARRIES NO PIN OF ITS OWN. findByPhone_ takes the PIN
         from the first row that has one, so a second row holding a different
         one hands the man a PIN that does not open the app. */
      put(row, 'hash', p.verdict === 'register' ? hash_(p.phone, pin) : '');
      put(row, 'initpin', ''); put(row, 'active', 'TRUE');
      sh.appendRow(row);
      added++;
      if(p.verdict === 'register') pins.push({ phone:p.phone, name:p.name, pin:pin });
      admAudit_(p.verdict === 'register' ? 'STAFF REGISTERED' : 'STAFF SECOND OFFICE', p.phone,
        p.name + ' · ' + (p.desig || 'staff') + ' · ' + p.mandal + ' · by ' + u.name +
        (p.verdict === 'register' ? ' · PIN set, not recorded here' : ''));
      return;
    }

    /* correct: only the fields this paste is the authority for */
    if(p.row){
      const i = p.row - 1;
      if(!p.keepRole && t.ix.name >= 0 && p.name) sh.getRange(i + 1, t.ix.name + 1).setValue(p.name);
      if(t.ix.designation >= 0 && p.desig) sh.getRange(i + 1, t.ix.designation + 1).setValue(p.desig);
      if(t.ix.empid >= 0 && p.emp) sh.getRange(i + 1, t.ix.empid + 1).setValue(p.emp);
      corrected++;
      admAudit_('STAFF CORRECTED', p.phone, p.name + ' · ' + (p.changes || []).join('; ') + ' · by ' + u.name);
    }
  });

  /* the offices, one row per mandal, written last so a refused person never
     costs the district the coordinates of his office */
  const n = staffOffices_(offices, u);
  return { added:added, corrected:corrected, offices:n, pins:pins };
}

/* THE MANDAL OFFICE, written to `Mandals`. Data about a place, not a person:
   it is the one thing in this paste that could be committed anywhere, and it
   is what gives the staff a place of duty to be measured against. */
function staffOffices_(offices, u){
  const keys = Object.keys(offices);
  if(!keys.length) return 0;
  const sh = sheet_('Mandals', STAFF_MANDAL_HEAD);
  const m = headMap_(sh, STAFF_MANDAL_HEAD);
  const v = sh.getDataRange().getValues();
  /* headMap_ KEYS BY THE EXACT HEADER STRING, not by a lower-cased one: the
     Mandals tab is written 'Mandal','Office','Lat','Lng' and m.ix.mandal is
     undefined, which reads as -1 and writes a row of empty cells without a
     word of complaint. Caught by suite 32 on its first run. */
  const at = {};
  for(let i = 1; i < v.length; i++) at[pkey_(v[i][m.ix.Mandal])] = i + 1;
  let n = 0;
  keys.forEach(function(k){
    const o = offices[k];
    if(at[k]){
      const r = at[k];
      if(Number(v[r - 1][m.ix.Lat]) === o.lat && Number(v[r - 1][m.ix.Lng]) === o.lng) return;
      if(m.ix.Lat >= 0) sh.getRange(r, m.ix.Lat + 1).setValue(o.lat);
      if(m.ix.Lng >= 0) sh.getRange(r, m.ix.Lng + 1).setValue(o.lng);
    } else {
      const row = new Array(m.width).fill('');
      if(m.ix.Mandal >= 0) row[m.ix.Mandal] = o.mandal;
      if(m.ix.Office >= 0) row[m.ix.Office] = 'MPDO Office, ' + o.mandal;
      if(m.ix.Lat >= 0) row[m.ix.Lat] = o.lat;
      if(m.ix.Lng >= 0) row[m.ix.Lng] = o.lng;
      sh.appendRow(row);
    }
    n++;
    admAudit_('MANDAL OFFICE WRITTEN', o.mandal, o.lat + ', ' + o.lng + ' · by ' + u.name);
  });
  return n;
}

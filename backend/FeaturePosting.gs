/* ============================================================================
 * FEATURE · POSTINGS — which officer holds which place
 * ----------------------------------------------------------------------------
 * Ordered 04.10.2026, off the district's own issue list of 02.10.2026: of 48
 * reports, 40 were one thing said forty ways — the register had an officer
 * against the wrong place. A Secretary deputed in August was still shown
 * against the village he left; a Secretary given a second village in charge
 * could not see it; six Mandal Panchayat Officers had moved mandal and the
 * register did not know.
 *
 * AND THERE WAS NOWHERE TO PRESS. `rollUpdate_` writes a name, a mobile and an
 * email and never touches the village; `userCreate` sets one only at
 * registration and refuses a number already on the roll. For the mandal it was
 * refused ON PURPOSE, in rollPlan_'s own words — "moving a man between mandals
 * is not a thing this does quietly, his notices and his filings are counted by
 * mandal" — which is a good rule and left the Collector with a sheet to edit by
 * hand, forty rows, each needing the OLD posting released as well. The half
 * that is forgotten by hand is the half that leaves a man holding two villages.
 *
 * THE UNIT IS THE POSTING: one officer, one place, one row of `Users`. An
 * officer who holds three villages has three rows, and findByPhone_ reads the
 * union. So there are only three acts, and both the village and the mandal
 * take the same three:
 *
 *   MOVE     he now holds this instead  — the row that held the old place is
 *            written to the new one, so his history stays on his own row
 *   ADD      he holds this AS WELL      — in charge, or FAC: a row of his own
 *   DROP     he no longer holds this    — the row stays (rule 7)
 *
 * THE COLLECTOR'S GLOSSARY, which is the whole of how a remark is read:
 *   "deputed" — he is transferred and no longer looks after the old place
 *   "incharge", "FAC" — he takes this in ADDITION to what he already holds
 *
 * A RELEASE IS NEVER GUESSED AT. The remark is free text written by eleven
 * different offices — "deputed from valmidi to nasingapuram thanda",
 * "From Gp Manikyapuram deputed To Gp Nagaram", "Kanneboinagudem to
 * Edunuthula" — and no parser should be trusted to pull a place name out of
 * that and then take it off a man. So the place to release is found the other
 * way round: every place the officer ALREADY HOLDS on the register is looked
 * for inside his remark, and only one that is found there is proposed for
 * release. A remark naming nothing he holds releases nothing, and says so.
 * The register is the authority; the remark only points at it.
 *
 * IT PROPOSES BEFORE IT WRITES, exactly as the roster paste does. `dry`
 * returns what WOULD change, row by row, with the sentence each release was
 * read from, and writes nothing at all.
 *
 * NOTHING IS DESTROYED (rule 7). Releasing a place marks that row inactive and
 * leaves it where it is, with his attendance, his notices and his leave still
 * pointing at it — unless it is his only row, in which case the place is
 * cleared and the row stays, because he is still an officer with no village
 * rather than a man off the roll.
 *
 * It accuses nobody and it is not part of any ladder: a posting is a fact
 * about where a man works.
 * ========================================================================== */

/* the office writes the designation in words; the register keeps a code */
var POST_ROLE = {
  'panchayat secretary': 'PS',
  'mandal panchayat officer': 'MPO',
  'mandal parishad development officer': 'MPDO',
  'mandal sanitation officer': 'MSO',
  'mpo': 'MPO', 'mpdo': 'MPDO', 'mso': 'MSO', 'ps': 'PS'
};

function feature_posting(){
  return {
    title: 'Postings — which officer holds which place',
    tenants: ['SJGP'],

    post: {
      /* `dry` proposes and writes nothing; without it, the plan is applied.
         The plan is computed the same way both times, from the same rows, so
         what the Collector read is what is written. */
      postingUpdate: function(b, u){
        if(u.role !== 'COLLECTOR')
          return json_({ ok:false, error:'Postings are changed by the Collector alone.' });
        const rows = Array.isArray(b.rows) ? b.rows : [];
        if(!rows.length)
          return json_({ ok:false, error:'Nothing was pasted. An empty table is not an instruction to clear the roll.' });
        if(rows.length > 500)
          return json_({ ok:false, error:'That is more rows than a district has postings. Nothing was read.' });

        const lock = LockService.getScriptLock();
        try{ lock.waitLock(30000); }
        catch(err){ return json_({ ok:false, error:'busy — try again' }); }
        try{
          const t = uidx_(), v = t.sh.getDataRange().getValues();
          const roll = gpRoll_();
          const plans = rows.map(function(r){ return postPlan_(t, v, roll, r); });

          /* EVERY RELEASE IS THE COLLECTOR’S OWN TICK. Eight of the forty-eight
             remarks on the district’s list of 02.10.2026 speak of neither a
             deputation nor a charge — "App not showing for Marigadi (Showing
             Incharge village Peddathanda)" is a complaint, and the village it
             names is one the officer means to KEEP. No reading of free text
             is going to tell those apart reliably, and all-or-nothing is the
             wrong instrument for taking a village off a man. So the proposal
             carries an id for each release and the console sends back the
             ones that were left ticked; anything not ticked is not written.

             The server still decides (rule 6): it re-plans from the sheet and
             only ever honours a release it proposed itself, so `keep` can
             narrow what happens and can never widen it. */
          if(Array.isArray(b.keep)){
            const want = {};
            b.keep.forEach(function(k){ want[String(k)] = true; });
            plans.forEach(function(p){
              p.releases = (p.releases || []).filter(function(x){ return want[relId_(p, x)]; });
              if(p.verdict === 'release' && !p.releases.length) p.verdict = 'unchanged';
              /* AND UNTICKING THE RELEASE MAKES A MOVE AN ADDITION. A move
                 writes the new place over the row that held the old one, so
                 leaving the release unticked and the move alone would take
                 the village away anyway, by the back door — the opposite of
                 what the Collector just said. He keeps what he has and gains
                 the new one. */
              if(p.verdict === 'move' && !p.releases.some(function(x){ return !x.from; })){
                p.verdict = 'add';
                p.writeRow = null;
                p.changes = p.changes.map(function(c){
                  return c.indexOf('now holds ') === 0 ? 'also holds ' + c.slice(10) : c; });
              }
            });
          }
          if(b.dry) return json_({ ok:true, dry:true, plans:plans, counts:postCounts_(plans) });
          const done = postWrite_(t, plans, u);
          return json_({ ok:true, dry:false, plans:plans, counts:postCounts_(plans),
                         moved:done.moved, added:done.added, released:done.released,
                         registered:done.registered, pins:done.pins });
        } finally { lock.releaseLock(); }
      }
    }
  };
}

/* ------------------------------------------------------------------ reading */
/* mandal and village names are matched case-blind and trimmed, because the
   roll spells "Ghanpur (Stn)" three ways and a posting must not be lost over a
   bracket (the rule mkey_ already carries for the schedule) */
function pkey_(s){ return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, ''); }

/* THE PLACES AN OFFICER HOLDS TODAY, as rows, so a release can name the row it
   would write. Active rows only: an inactive row is a posting already given up
   and proposing to release it again would make every second run do work. */
function postHolds_(t, v, phone){
  const out = [];
  for(let i = 1; i < v.length; i++){
    if(phone10_(v[i][t.ix.phone]) !== phone) continue;
    const act = t.ix.active < 0 ? true : !(v[i][t.ix.active] === false ||
      String(v[i][t.ix.active]).toUpperCase() === 'FALSE');
    if(!act) continue;
    String(cell_(v[i], t.ix.gp) || '').split(',').map(function(g){ return g.trim(); })
      .filter(String).forEach(function(g){
        out.push({ row:i, gp:g, mandal:cell_(v[i], t.ix.mandal) });
      });
    if(!String(cell_(v[i], t.ix.gp) || '').trim())
      out.push({ row:i, gp:'', mandal:cell_(v[i], t.ix.mandal) });
  }
  return out;
}

/* who else holds a village today — one village has one Secretary, and a man
   deputed in must not leave the last one still holding it */
function postHolder_(t, v, mandal, gp){
  if(!gp) return [];
  const out = [];
  for(let i = 1; i < v.length; i++){
    const act = t.ix.active < 0 ? true : !(v[i][t.ix.active] === false ||
      String(v[i][t.ix.active]).toUpperCase() === 'FALSE');
    if(!act) continue;
    const has = String(cell_(v[i], t.ix.gp) || '').split(',')
      .map(function(g){ return pkey_(g); }).indexOf(pkey_(gp)) >= 0;
    if(has) out.push({ row:i, phone:phone10_(v[i][t.ix.phone]), name:cell_(v[i], t.ix.name) });
  }
  return out;
}

/* ------------------------------------------------------------------ planning */
function postPlan_(t, v, roll, r){
  const mandal = String(r.mandal || '').trim();
  const gp     = String(r.gp || '').trim();
  const name   = String(r.name || '').trim();
  const phone  = phone10_(r.phone || '');
  const remark = String(r.remark || '').replace(/\s+/g, ' ').trim();
  const role   = POST_ROLE[String(r.role || '').trim().toLowerCase()] ||
                 String(r.role || '').trim().toUpperCase();

  const out = { mandal:mandal, gp:gp, name:name, phone:phone, role:role, remark:remark,
                changes:[], releases:[] };

  if(phone.length !== 10){ out.verdict = 'refused'; out.why = 'a mobile number is ten digits'; return out; }
  if(!mandal){ out.verdict = 'refused'; out.why = 'a mandal is needed — every posting is in one'; return out; }
  if(!name){ out.verdict = 'refused'; out.why = 'a name is needed — the roll is read by people'; return out; }
  if(!rank_()[role]){ out.verdict = 'refused'; out.why = 'no such role on this register: ' + (r.role || '(blank)'); return out; }

  /* A MANDAL-LEVEL OFFICER HOLDS NO VILLAGE, and that is not missing data.
     The MPO, the MPDO and the MSO answer for a mandal; only the Secretary
     holds a Gram Panchayat. A village against one of them would be read by
     every view as a posting he does not have. */
  const mandalOnly = !viewerRole_(role);
  if(mandalOnly && gp){
    out.verdict = 'refused';
    out.why = role + ' is a mandal-level officer and holds no village; "' + gp + '" was not written';
    return out;
  }

  /* A VILLAGE IS NEVER INVENTED. If the GPs tab does not carry it, the roll is
     what is wrong, and a posting written against a name no view can find is a
     posting nobody will ever see. */
  /* THE VILLAGE DECIDES THE MANDAL, and a near miss is NAMED rather than
     merely refused.

     The mandals spell their own names differently in the same file — the
     district's list of 02.10.2026 carries Lingalaghanpur and Lingalaghanapur,
     Zafferghad and Zaffergadh, and the GPs tab says Bachannapeta where the
     list says Bachannapet. Matching on the mandal refused an entire mandal
     over a trailing letter. A VILLAGE NAME IS FAR MORE DISTINCTIVE than a
     mandal name, so the village is looked up on its own and the mandal it
     sits in on the roll is the mandal, whatever the paste called it; where
     the two differ it is reported as a difference and not as a fault.

     Matching the mandals LOOSELY instead was the alternative and was
     rejected: Lingala Ghanpur is not Ghanpur (Stn), and a loose match would
     quietly merge them — the rule the filing schedule already carries.

     AND A REFUSAL THAT NAMES NOTHING IS NO USE TO THE MANDAL that has to
     correct it. "Basireddypalli is not on the GPs tab" sends an officer
     looking for a village he knows exists; "the roll spells it
     Basireddypally" is a thing he can act on. */
  if(gp){
    const on = roll.filter(function(x){ return pkey_(x.gp) === pkey_(gp); });
    if(!on.length){
      const near = postNear_(roll, gp, mandal);
      out.near = near;
      out.verdict = 'refused';
      out.why = '"' + gp + '" is not on the GPs tab' +
        (near.length ? '. The roll has ' + near.map(function(x){ return '"' + x.gp + '" (' + x.mandal + ')'; }).join(' or ') +
                       ' — confirm which is right and the village will be taken.'
                    : '. Put the village on the roll first — nothing is invented here.');
      return out;
    }
    /* the village named in more than one mandal is the Collector's to settle */
    if(on.length > 1){
      const inM = on.filter(function(x){ return pkey_(x.mandal) === pkey_(mandal); });
      if(inM.length !== 1){
        out.verdict = 'ambiguous';
        out.why = '"' + gp + '" is on the roll in ' + on.map(function(x){ return x.mandal; }).join(' and ') +
                  '. Which one is meant is yours to settle, not this page’s.';
        return out;
      }
      out.gp = inM[0].gp; out.mandal = inM[0].mandal;
    } else {
      /* A SPELLING IS NOT A DIFFERENT MANDAL, AND A DIFFERENT MANDAL IS NOT A
         SPELLING. Bachannapet against Bachannapeta is one letter and one
         place; Palakurthi against Bachannapet is two places, and accepting
         the roll's word for it would move a village between mandals on the
         strength of a typo. Lingala Ghanpur is not Ghanpur (Stn) — the rule
         the filing schedule already carries — and the distance keeps them
         apart. */
      if(pkey_(mandal) !== pkey_(on[0].mandal)){
        const mk = pkey_(mandal), rk = pkey_(on[0].mandal);
        if(postDist_(mk, rk) > Math.max(2, Math.floor(rk.length / 5))){
          out.verdict = 'refused';
          out.why = '"' + gp + '" is on the roll under ' + on[0].mandal + ', not under ' + mandal +
                    '. Those are two different mandals: one of the two is wrong and it is not this page’s to choose.';
          return out;
        }
        out.note = 'the roll spells the mandal "' + on[0].mandal + '", the list says "' + mandal + '"';
      }
      out.gp = on[0].gp;           /* the roll's own spelling, not the paste's */
      out.mandal = on[0].mandal;
    }
  }

  const held = postHolds_(t, v, phone);
  const mine = phone ? rollRows_(t, v, phone) : [];

  /* ONE NUMBER, ONE OFFICER (rule 4 and the roll's own rule). Two names on one
     number is what makes the app greet a man with somebody else's name, and
     which of them is right is the Collector's to settle. */
  const names = {};
  mine.forEach(function(i){ const n = cell_(v[i], t.ix.name); if(n) names[n] = true; });
  const spellings = Object.keys(names);
  if(spellings.length > 1 && !spellings.some(function(n){ return sameName_(n, name); })){
    out.verdict = 'ambiguous';
    out.why = 'that number carries more than one name on the roll: ' + spellings.join(' / ') +
              '. Which is right is yours to settle, not this page’s.';
    return out;
  }

  /* NOT ON THE ROLL AT ALL — a new officer, registered with this posting. */
  if(!mine.length){
    out.verdict = 'register';
    out.why = 'that number is not on the roll';
    out.changes.push('registered as ' + role + ' of ' + (gp ? out.gp + ', ' + out.mandal : out.mandal));
    out.needsPin = true;
    return out;
  }

  /* DOES HE ALREADY HOLD IT? Then there is nothing to do, and a second run of
     the whole paste writes nothing (rule 8). */
  const already = mandalOnly
    ? held.some(function(h){ return pkey_(h.mandal) === pkey_(out.mandal); })
    : held.some(function(h){ return pkey_(h.gp) === pkey_(out.gp); });

  /* WHAT THE REMARK ASKS FOR. "incharge" and "FAC" mean he takes this as well;
     anything else that speaks of a deputation means he has moved. */
  const g = remark.toLowerCase();
  const saysDeputed = /deput|dupt/.test(g);
  /* “PREVIOUSLY I HAD INCHARGE SALVAPUR GP” IS NOT A CHARGE BEING TAKEN ON.
     It carries the word incharge and means the opposite of it: he HELD that
     village and wants it off him. Issues 4 and 5 of the district’s list of
     02.10.2026 are both written that way — issue 5 spells it out, “now it
     shifted to badanagaram Secretary prashanth” — and reading them as
     additions proposed nothing at all and left both officers holding the very
     village they had written in to complain about.

     This is the one place a remark is read for its SENSE rather than for a
     name, and all it decides is whether to LOOK for a release. What may then
     be released is still only a place the register shows against him, and the
     Collector still ticks it before anything is written. Being too willing to
     propose costs him a glance; not proposing costs the officer his
     complaint. */
  const saysPast    = /previously|no longer|used to|shifted|not working in/.test(g);
  const saysExtra   = /incharge|in charge|\bfac\b/.test(g) && !saysDeputed && !saysPast;

  /* THE PLACE TO RELEASE IS FOUND IN THE REGISTER AND POINTED AT BY THE
     REMARK, never read out of the remark on its own. Only somewhere he
     actually holds, and never the place he is being posted to. */
  if(!saysExtra){
    held.forEach(function(h){
      const place = mandalOnly ? h.mandal : h.gp;
      if(!place) return;
      const samePlace = mandalOnly ? pkey_(h.mandal) === pkey_(out.mandal)
                                   : pkey_(h.gp) === pkey_(out.gp);
      if(samePlace) return;                       /* that is where he is going */
      if(!postNamed_(remark, place)) return;
      out.releases.push({ row:h.row + 1, place:place, mandal:h.mandal,
                          why:'the remark names it: "' + remark + '"' });
    });
  }

  if(already && !out.releases.length){
    out.verdict = 'unchanged';
    out.why = 'he already holds ' + (gp ? out.gp : out.mandal) + ' and the remark asks for nothing else';
    return out;
  }

  /* SOMEBODY ELSE MAY BE HOLDING IT. One village has one Secretary, so a man
     deputed in leaves the last one to be released — named, never guessed. */
  if(!mandalOnly && out.gp){
    postHolder_(t, v, out.mandal, out.gp).forEach(function(h){
      if(h.phone === phone) return;
      out.releases.push({ row:h.row + 1, place:out.gp, mandal:out.mandal, from:h.name, fromPhone:h.phone,
                          why:h.name + ' holds ' + out.gp + ' on the register today' });
    });
  }

  out.releases.forEach(function(x){ x.id = relId_(out, x); });
  if(out.note) out.changes.push(out.note);
  out.verdict = already ? 'release' : (saysExtra ? 'add' : 'move');
  if(!already)
    out.changes.push((saysExtra ? 'also holds ' : 'now holds ') + (gp ? out.gp + ', ' + out.mandal : out.mandal));
  out.releases.forEach(function(x){
    out.changes.push('released: ' + (x.place || '(no village)') +
      (x.from ? ' — from ' + x.from : '') );
  });
  /* the row he is already on that will be written, for a move */
  if(out.verdict === 'move'){
    const own = out.releases.filter(function(x){ return !x.from; })[0];
    if(own) out.writeRow = own.row;
  }
  return out;
}

/* IS THIS PLACE NAMED IN THE REMARK? Not quite the same question as whether
   its letters appear in it.

   The mandals write the village as THEY spell it and the roll carries its own
   spelling — Basireddypalli against Basireddypalle, Mansanpally against
   Mansanpalle, Marigadi against Marigidi, all of them real on the district’s
   list of 02.10.2026. An exact substring therefore reads “previously I had
   incharge Salvapur gp” as naming nothing when the roll spells it Salvapure,
   no release is proposed, and the officer goes on holding the very village he
   wrote in to complain about. That is issues 4 and 5, and they are two of the
   four reports this whole module exists for.

   So the remark is cut into words and each run of one or two is compared with
   the place, allowing the same small distance the suggestions allow. IT IS
   STILL ONLY EVER A PLACE HE ACTUALLY HOLDS — the register names the
   candidates and the remark only points at them — and the Collector still
   ticks it before anything is written. */
function postNamed_(remark, place){
  const p = pkey_(place);
  if(!p) return false;
  const r = pkey_(remark);
  if(r.indexOf(p) >= 0) return true;
  const lim = Math.max(1, Math.floor(p.length / 5));
  const w = String(remark || '').split(/[^A-Za-z0-9]+/).filter(String);
  for(let i = 0; i < w.length; i++){
    if(postDist_(p, pkey_(w[i])) <= lim) return true;
    if(i + 1 < w.length && postDist_(p, pkey_(w[i] + w[i + 1])) <= lim) return true;
  }
  return false;
}

/* WHAT THE ROLL PROBABLY CALLS IT. Three candidates at most, nearest first, by
   plain edit distance on the squashed name — enough to turn "Basireddypalli"
   into "Basireddypally" and "Deshaithanda" into "Deshai Thanda" without
   pretending to be clever. It SUGGESTS and never substitutes: the village
   written is still refused, and the Collector or the mandal says which is
   right. A register that guesses at a village name writes a man's attendance
   against the wrong place. */
function postDist_(a, b){
  const m = a.length, n = b.length;
  if(!m) return n; if(!n) return m;
  let prev = [], cur = [];
  for(let j = 0; j <= n; j++) prev[j] = j;
  for(let i = 1; i <= m; i++){
    cur[0] = i;
    for(let j = 1; j <= n; j++){
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = cur.slice();
  }
  return prev[n];
}
function postNear_(roll, gp, mandal){
  const k = pkey_(gp);
  if(!k) return [];
  const lim = Math.max(2, Math.floor(k.length / 4));
  return roll.map(function(x){
      let d = postDist_(k, pkey_(x.gp));
      /* a village in the mandal the list named is the likelier reading */
      if(pkey_(x.mandal) === pkey_(mandal)) d -= 0.5;
      return { gp:x.gp, mandal:x.mandal, d:d };
    })
    .filter(function(x){ return x.d <= lim; })
    .sort(function(p, q){ return p.d - q.d; })
    .slice(0, 3);
}

/* A RELEASE NAMES ITS ROW, so the console can hand back exactly the ones the
   Collector left ticked and the server can match them without trusting a
   position in a list. */
function relId_(p, x){
  return String(p.phone || '') + '|' + String(x.row || '') + '|' + pkey_(x.place || '');
}

function postCounts_(plans){
  const c = { move:0, add:0, release:0, register:0, unchanged:0, refused:0, ambiguous:0 };
  plans.forEach(function(p){ if(c[p.verdict] != null) c[p.verdict]++; });
  return c;
}

/* ------------------------------------------------------------------ writing */
function postWrite_(t, plans, u){
  const sh = t.sh;
  let moved = 0, added = 0, released = 0, registered = 0;
  const pins = [];

  plans.forEach(function(p){
    if(p.verdict === 'refused' || p.verdict === 'ambiguous' || p.verdict === 'unchanged') return;

    /* RELEASES FIRST, so a village handed from one officer to another is never
       held by both, not even between two lines of this loop. */
    p.releases.forEach(function(x){
      const i = x.row - 1;
      const v2 = sh.getDataRange().getValues();
      if(i < 1 || i >= v2.length) return;
      const ph = phone10_(v2[i][t.ix.phone]);
      const others = rollRows_(t, v2, ph).filter(function(j){
        if(j === i) return false;
        return !(String(v2[j][t.ix.active]).toUpperCase() === 'FALSE');
      });
      /* NOTHING IS DESTROYED (rule 7). The row stays either way: marked
         inactive where he has other rows, so his attendance and his notices go
         on pointing at it; and where it is his ONLY row the place is cleared
         instead, because he is still an officer, with no village. */
      if(others.length && t.ix.active >= 0) sh.getRange(i + 1, t.ix.active + 1).setValue('FALSE');
      else if(t.ix.gp >= 0) sh.getRange(i + 1, t.ix.gp + 1).setValue('');
      released++;
      admAudit_('POSTING RELEASED', ph,
        (x.from || cell_(v2[i], t.ix.name)) + ' · ' + (x.place || '(no village)') + ', ' + (x.mandal || '') +
        ' · ' + (others.length ? 'row marked inactive' : 'village cleared, row kept') +
        ' · by ' + u.name);
    });

    if(p.verdict === 'release') return;            /* only a release was asked */

    if(p.verdict === 'register'){
      const pin = dayPin_(p.phone);
      const width = Math.max(sh.getLastColumn(), U_HEAD.length);
      const row = new Array(width).fill('');
      const put = function(k, val){ if(t.ix[k] >= 0) row[t.ix[k]] = val; };
      put('phone', "'" + p.phone); put('name', p.name); put('role', p.role);
      put('mandal', p.mandal); put('gp', p.gp || ''); put('hash', hash_(p.phone, pin));
      put('initpin', ''); put('active', 'TRUE');
      sh.appendRow(row);
      registered++; pins.push({ phone:p.phone, name:p.name, pin:pin });
      admAudit_('OFFICER REGISTERED', p.phone, p.name + ' · ' + p.role + ' · ' +
        (p.gp ? p.gp + ', ' : '') + p.mandal + ' · by ' + u.name + ' · PIN set, not recorded here');
      return;
    }

    if(p.verdict === 'move' && p.writeRow){
      /* HIS OWN ROW IS WRITTEN TO THE NEW PLACE rather than retired and a new
         one made: it is the same man, and the row carries his PIN. */
      const i = p.writeRow - 1;
      if(t.ix.gp >= 0) sh.getRange(i + 1, t.ix.gp + 1).setValue(p.gp || '');
      if(t.ix.mandal >= 0) sh.getRange(i + 1, t.ix.mandal + 1).setValue(p.mandal);
      if(t.ix.active >= 0) sh.getRange(i + 1, t.ix.active + 1).setValue('TRUE');
      moved++;
      admAudit_('POSTING MOVED', p.phone, p.name + ' · now ' +
        (p.gp ? p.gp + ', ' : '') + p.mandal + ' · by ' + u.name);
      return;
    }

    /* ADD, and a MOVE with no row of his own to write (a mandal officer whose
       old mandal the remark did not name) — a row of his own for the place. */
    const v3 = sh.getDataRange().getValues();
    const mine = rollRows_(t, v3, p.phone);
    const blank = mine.filter(function(i){
      const act = !(String(v3[i][t.ix.active]).toUpperCase() === 'FALSE');
      return act && !String(cell_(v3[i], t.ix.gp) || '').trim() && !p.gp ? false
           : act && !String(cell_(v3[i], t.ix.gp) || '').trim();
    })[0];
    if(blank != null && p.gp){
      if(t.ix.gp >= 0) sh.getRange(blank + 1, t.ix.gp + 1).setValue(p.gp);
      if(t.ix.mandal >= 0) sh.getRange(blank + 1, t.ix.mandal + 1).setValue(p.mandal);
    } else {
      const width = Math.max(sh.getLastColumn(), U_HEAD.length);
      const row = new Array(width).fill('');
      const put = function(k, val){ if(t.ix[k] >= 0) row[t.ix[k]] = val; };
      put('phone', "'" + p.phone); put('name', p.name); put('role', p.role);
      put('mandal', p.mandal); put('gp', p.gp || '');
      /* NO PIN OF ITS OWN. findByPhone_ takes the PIN from the first row that
         carries one, so a second row for the same officer must not carry a
         different one — that is how a reset written to one row hands a man a
         PIN that does not open the app. */
      put('hash', ''); put('initpin', ''); put('active', 'TRUE');
      sh.appendRow(row);
    }
    added++;
    admAudit_('POSTING ADDED', p.phone, p.name + ' · also holds ' +
      (p.gp ? p.gp + ', ' : '') + p.mandal + ' · by ' + u.name);
  });

  return { moved:moved, added:added, released:released, registered:registered, pins:pins };
}

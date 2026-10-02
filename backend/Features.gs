/* ============================================================================
 * SJGP — FEATURE MODULES
 * ----------------------------------------------------------------------------
 * How a new feature is added to a live government register without touching
 * the four thousand lines that already work.
 *
 * THE PROBLEM THIS SOLVES. Every feature so far has been cut into Code.gs: a
 * new kind in doPost, a new op in doGet, a new block in the payload. That file
 * is now six thousand lines and it serves two registers that issue show-cause
 * notices. Each new incision is a chance to break something that had nothing
 * to do with the feature being added — and the thing it breaks is somebody's
 * attendance record.
 *
 * SO A FEATURE IS A FILE, AND THE MAIN CODE CALLS IT. A module declares what
 * it answers and nothing else reaches into it; Code.gs gains one line per
 * feature, in FEATURE_MODULES below, and nothing else at all.
 *
 * WHAT THE REGISTER GUARANTEES A MODULE CANNOT DO:
 *
 *   · it cannot run before the token is checked. Modules are dispatched inside
 *     doPost AFTER auth_, and are handed the authenticated officer. There is
 *     no path by which a module sees an unauthenticated call;
 *
 *   · it cannot take over something the core already answers. Registration
 *     reads the core's own dispatch out of doPost/doGet and REFUSES a module
 *     that claims a kind or an op already in it. A feature cannot quietly
 *     change what attendance or leave does;
 *
 *   · it cannot take the register down. Every module is loaded, validated and
 *     called inside its own try/catch, exactly as each backup step is. A
 *     module that throws is recorded and skipped, and the request carries on
 *     to the core as though the module were not there. One broken feature
 *     never costs an officer his attendance;
 *
 *   · it cannot appear on a register it was not meant for. A module names the
 *     tenants it serves;
 *
 *   · and it can be switched off without a deploy. The script property
 *     FEATURE_OFF is a comma-separated list of module names; anything on it is
 *     not loaded. That is the rollback when a feature misbehaves at four in
 *     the afternoon and the district cannot wait for a pipeline.
 *
 * WHAT A MODULE LOOKS LIKE. One file, one function, named for the module:
 *
 *     function feature_example(){
 *       return {
 *         name:  'example',
 *         title: 'What it is, in the Collector’s words',
 *         tenants: ['SJGP','GP'],          // or omit for both
 *         post: {                          // doPost kinds it answers
 *           exampleSave: function(b, u){ return json_({ ok:true }); }
 *         },
 *         get: {                           // doGet ops it answers
 *           example: function(p, u){ return json_({ ok:true, rows:[] }); }
 *         }
 *       };
 *     }
 *
 * and one line added to FEATURE_MODULES. Everything a module needs from the
 * register — json_, sheet_, headMap_, today_, tenant_, admAudit_ — is already
 * in scope, because Apps Script loads every file into one.
 *
 * `op=diag` lists what is loaded, what was refused and why, so "is my feature
 * live" is answered by reading rather than by guessing. That lesson cost a day.
 * ========================================================================== */

/* The modules this register carries, in the order they are offered a request.
   ADD A FEATURE BY ADDING ITS FILE AND ITS NAME HERE, and change nothing else. */
/* var, NOT const. Apps Script gives every .gs file its own lexical scope,
   so a top-level const is invisible to the other files — only function
   declarations and var reach across. That is also why TS_HOLIDAYS_2026 is a
   var, and why reading this wrong would make a module silently absent. */
var FEATURE_MODULES = ['health'];

/* ---------------------------------------------------------------- the core's own dispatch */
/* READ OFF THE RUNNING CODE, never a list typed here. A list would say what
   its author believed; this says what the register actually answers, which is
   the only thing that can tell us a module is about to shadow something. */
function coreKinds_(){
  const out = {};
  try{
    const re = /b\.kind\s*===\s*'([A-Za-z0-9_]+)'/g;
    const src = String(doPost);
    let m; while((m = re.exec(src))) out[m[1]] = true;
  }catch(err){}
  return out;
}
function coreOps_(){
  const out = {};
  try{
    const re = /p\.op\s*===\s*'([A-Za-z0-9_]+)'/g;
    const src = String(doGet);
    let m; while((m = re.exec(src))) out[m[1]] = true;
  }catch(err){}
  return out;
}

/* ---------------------------------------------------------------- loading */
/* Names the district has switched off by hand, without waiting for a deploy. */
function featuresOff_(){
  const out = {};
  try{
    String(PropertiesService.getScriptProperties().getProperty('FEATURE_OFF') || '')
      .split(/[,\s]+/).forEach(function(n){ if(n) out[n.trim()] = true; });
  }catch(err){}
  return out;
}

/* Every module this register should carry, with the reason for each one that
   is not carried. Nothing here throws: a module that cannot be loaded is a
   module that is skipped and reported, never an outage. */
function featureLoad_(){
  const off = featuresOff_(), kinds = coreKinds_(), ops = coreOps_();
  const tenantKey = (function(){ try{ return tenant_().key; }catch(e){ return 'SJGP'; } })();
  const live = [], skipped = [];
  const seenKind = {}, seenOp = {};

  FEATURE_MODULES.forEach(function(name){
    if(off[name]){ skipped.push({ name:name, why:'switched off by FEATURE_OFF' }); return; }

    let def = null;
    try{
      /* globalThis under the V8 runtime; `this` is the global object in a
         plain Apps Script file, which is the fallback if it is ever not. */
      const g = (typeof globalThis !== 'undefined') ? globalThis : this;
      const fn = g ? g['feature_' + name] : null;
      if(typeof fn !== 'function'){ skipped.push({ name:name, why:'no function feature_' + name }); return; }
      def = fn();
    }catch(err){ skipped.push({ name:name, why:'threw while loading: ' + err }); return; }
    if(!def || typeof def !== 'object'){ skipped.push({ name:name, why:'returned nothing' }); return; }

    if(def.tenants && def.tenants.indexOf(tenantKey) < 0){
      skipped.push({ name:name, why:'not for this register' }); return;
    }

    /* IT MAY NOT TAKE OVER THE CORE, OR ANOTHER MODULE */
    let clash = '';
    Object.keys(def.post || {}).forEach(function(k){
      if(kinds[k]) clash = clash || ('the register already answers kind "' + k + '"');
      if(seenKind[k]) clash = clash || ('module "' + seenKind[k] + '" already answers kind "' + k + '"');
    });
    Object.keys(def.get || {}).forEach(function(o){
      if(ops[o]) clash = clash || ('the register already answers op "' + o + '"');
      if(seenOp[o]) clash = clash || ('module "' + seenOp[o] + '" already answers op "' + o + '"');
    });
    if(clash){ skipped.push({ name:name, why:'refused — ' + clash }); return; }

    Object.keys(def.post || {}).forEach(function(k){ seenKind[k] = name; });
    Object.keys(def.get || {}).forEach(function(o){ seenOp[o] = name; });
    def.name = name;
    live.push(def);
  });
  return { live:live, skipped:skipped };
}

/* ---------------------------------------------------------------- dispatch */
/* A module is offered the request only after the core has declined it, and
   only after the officer has been authenticated. It is called inside its own
   try/catch: a module that throws answers the caller plainly and leaves every
   other part of the register untouched. */
function featurePost_(b, u){
  const kind = String((b && b.kind) || '');
  if(!kind) return null;
  let loaded;
  try{ loaded = featureLoad_(); }catch(err){ return null; }
  for(let i = 0; i < loaded.live.length; i++){
    const f = loaded.live[i];
    const fn = (f.post || {})[kind];
    if(typeof fn !== 'function') continue;
    try{ return fn(b, u); }
    catch(err){
      try{ admAudit_('FEATURE FAILED', f.name, kind + ' — ' + err); }catch(e){}
      return json_({ ok:false, error:'That part of the register could not answer: ' + err,
                     feature:f.name });
    }
  }
  return null;
}
function featureGet_(p, u){
  const op = String((p && p.op) || '');
  if(!op) return null;
  let loaded;
  try{ loaded = featureLoad_(); }catch(err){ return null; }
  for(let i = 0; i < loaded.live.length; i++){
    const f = loaded.live[i];
    const fn = (f.get || {})[op];
    if(typeof fn !== 'function') continue;
    try{ return fn(p, u); }
    catch(err){
      try{ admAudit_('FEATURE FAILED', f.name, 'op=' + op + ' — ' + err); }catch(e){}
      return json_({ ok:false, error:'That part of the register could not answer: ' + err,
                     feature:f.name });
    }
  }
  return null;
}

/* what diag reports, so a feature's presence is read rather than assumed */
function featureReport_(){
  try{
    const l = featureLoad_();
    return {
      live: l.live.map(function(f){
        return { name:f.name, title:f.title || '',
                 post:Object.keys(f.post || {}), get:Object.keys(f.get || {}) };
      }),
      skipped: l.skipped
    };
  }catch(err){ return { error:String(err) }; }
}

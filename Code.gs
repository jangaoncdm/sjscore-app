/**********************************************************************
 * SJ-SCORE Field — district backend v4
 * Collectorate, Jangaon • Rc.No.788/DPO/26/34
 *
 * SIGN-IN: mobile number + PIN.  A number may hold more than one Gram
 * Panchayat (full additional charge) — every GP against that number is
 * available to the officer, and any one of them can be filed.
 *
 * SHEET TABS
 *  GPs         Mandal | GP                                    (master list)
 *  Users       Phone | Name | Role | Mandal | GP | Email | InitPin | Hash | Active
 *              (column order does not matter — matched by header name;
 *               one row per GP, so a Secretary holding two GPs has two rows)
 *  Inspections written automatically, one row per GP per month
 *  Tokens      written automatically
 *
 * ROLES  PS (own GPs) · MPDO / MSO / MPO (own mandal) · DLPO / DPO / COLLECTOR (district)
 *
 * SETUP
 *  1. Set SALT below to a long private string. Once — never change it.
 *  2. Fill the Users tab, with a starting PIN in InitPin.
 *  3. Toolbar function list → setupPins → Run.  Every PIN becomes a hash
 *     and the readable column is wiped. Re-run after adding users or
 *     resetting a PIN.
 *  4. Deploy ▸ Manage deployments ▸ ✏️ ▸ New version ▸ Deploy.
 **********************************************************************/
const SALT = 'CHANGE-THIS-LONG-RANDOM-SALT';
const SESSION_DAYS = 30;
const MAX_PIN_TRIES = 10;
const PHOTO_FOLDER = 'SJ-SCORE Photos';

const HEADERS = ['id','ym','mandal','gp','date','score','grade','rf','psScore','wkAvg','bcScore',
                 'status','officer','role','lat','lng','album','photoCount','photoFolder','updatedAt','payload'];
const U_HEAD = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'];
const RANK = {PS:1, MPO:2, MSO:3, MPDO:4, DLPO:5, DPO:6, COLLECTOR:7};

/* ---------------- plumbing ---------------- */
function sheet_(name, headers){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if(!sh){ sh = ss.insertSheet(name); if(headers) sh.appendRow(headers); }
  if(headers && sh.getLastRow() === 0) sh.appendRow(headers);
  return sh;
}
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function hash_(a, b){
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SALT + ':' + String(a) + ':' + String(b)));
}
function phone10_(p){ const d = String(p == null ? '' : p).replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; }
function cache_(){ return CacheService.getScriptCache(); }

function uidx_(){
  const sh = sheet_('Users', U_HEAD);
  const head = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0]
    .map(h => String(h).toLowerCase().replace(/[^a-z]/g, ''));
  const ix = {};
  ['phone','name','role','mandal','gp','email','hash','active'].forEach(k => { ix[k] = head.indexOf(k); });
  ix.initpin = head.indexOf('initpin') >= 0 ? head.indexOf('initpin') : head.indexOf('initpassword');
  return { sh: sh, ix: ix };
}
function cell_(row, i){ return i >= 0 ? String(row[i] == null ? '' : row[i]).trim() : ''; }

/* Google Sheets turns the text "2026-07" into a date. Everything that reads or
   writes a month must pass through these two, or the dashboard finds nothing. */
function ymText_(v){
  if(v instanceof Date) return v.getFullYear() + '-' + ('0' + (v.getMonth() + 1)).slice(-2);
  return String(v == null ? '' : v).trim().replace(/^'/, '');
}
function dateText_(v){
  if(v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v == null ? '' : v).trim().replace(/^'/, '');
}

/* all rows for a phone, folded into one login */
function findByPhone_(phone){
  const p = phone10_(phone);
  if(p.length !== 10) return null;
  const t = uidx_(), v = t.sh.getDataRange().getValues();
  const rows = [];
  for(let i = 1; i < v.length; i++){
    if(phone10_(t.ix.phone >= 0 ? v[i][t.ix.phone] : '') === p) rows.push({ r: i + 1, v: v[i] });
  }
  if(!rows.length) return null;

  let best = rows[0], hash = '', active = false;
  rows.forEach(x => {
    const role = cell_(x.v, t.ix.role).toUpperCase();
    if((RANK[role] || 0) > (RANK[cell_(best.v, t.ix.role).toUpperCase()] || 0)) best = x;
    if(!hash) hash = cell_(x.v, t.ix.hash);
    const a = t.ix.active < 0 ? true : x.v[t.ix.active];
    if(!(a === false || String(a).toUpperCase() === 'FALSE' || a === '')) active = true;
  });

  const gps = [], mandals = [];
  rows.forEach(x => {
    const g = cell_(x.v, t.ix.gp), m = cell_(x.v, t.ix.mandal);
    if(g && gps.indexOf(g) < 0) gps.push(g);
    if(m && mandals.indexOf(m) < 0) mandals.push(m);
  });

  return {
    rows: rows.map(x => x.r),
    phone: p,
    name: cell_(best.v, t.ix.name),
    role: cell_(best.v, t.ix.role).toUpperCase(),
    mandal: cell_(best.v, t.ix.mandal),
    mandals: mandals,
    gp: gps[0] || '',
    gps: gps,
    email: cell_(best.v, t.ix.email),
    hash: hash,
    active: active
  };
}
const pub_ = u => ({ name:u.name, role:u.role, phone:u.phone, mandal:u.mandal, mandals:u.mandals, gp:u.gp, gps:u.gps });
const districtRole_ = r => r === 'DPO' || r === 'COLLECTOR' || r === 'DLPO';
const mandalRole_   = r => r === 'MPDO' || r === 'MSO' || r === 'MPO';

/* ---------------- sessions ---------------- */
function issueToken_(u){
  const tok = Utilities.getUuid().replace(/-/g,'') + Utilities.getUuid().replace(/-/g,'');
  sheet_('Tokens', ['Token','Name','Phone','Created','Expires'])
    .appendRow([tok, u.name, "'" + u.phone, new Date(), new Date(Date.now() + SESSION_DAYS*24*3600*1000)]);
  cache_().put('tk_' + tok, JSON.stringify(pub_(u)), 21600);
  return tok;
}
function auth_(token){
  if(!token) return null;
  const c = cache_().get('tk_' + token);
  if(c) return JSON.parse(c);
  const v = sheet_('Tokens', ['Token','Name','Phone','Created','Expires']).getDataRange().getValues();
  for(let i = v.length - 1; i >= 1; i--){
    if(String(v[i][0]) === String(token)){
      if(new Date(v[i][4]) < new Date()) return null;
      const u = findByPhone_(v[i][2]);
      if(!u || !u.active) return null;
      cache_().put('tk_' + token, JSON.stringify(pub_(u)), 21600);
      return pub_(u);
    }
  }
  return null;
}

/* ---------------- run from the editor ---------------- */
function setupPins(){
  const t = uidx_(), rng = t.sh.getDataRange(), v = rng.getValues();
  if(t.ix.hash < 0 || t.ix.initpin < 0){ Logger.log('The Users tab needs InitPin and Hash columns.'); return; }
  let n = 0;
  for(let i = 1; i < v.length; i++){
    const ph = phone10_(t.ix.phone >= 0 ? v[i][t.ix.phone] : '');
    const init = String(v[i][t.ix.initpin] == null ? '' : v[i][t.ix.initpin]).trim();
    if(ph.length === 10 && init){ v[i][t.ix.hash] = hash_(ph, init); v[i][t.ix.initpin] = ''; n++; }
  }
  rng.setValues(v);
  Logger.log('PIN set on ' + n + ' row(s).');
}

/* ---------------- GET ---------------- */
function doGet(e){
  const p = e.parameter || {};
  const u = auth_(p.token);
  if(!u) return json_({ ok:false, error:'auth' });
  if(p.op === 'me') return json_({ ok:true, user:u });

  if(p.op === 'gps'){
    let rows = sheet_('GPs', ['Mandal','GP']).getDataRange().getValues().slice(1)
      .filter(r => r[0] && r[1]).map(r => ({ mandal:String(r[0]).trim(), gp:String(r[1]).trim() }));
    if(u.role === 'PS') rows = rows.filter(r => u.gps.indexOf(r.gp) >= 0);
    else if(mandalRole_(u.role)) rows = rows.filter(r => r.mandal === u.mandal);
    return json_({ ok:true, gps:rows });
  }

  const data = sheet_('Inspections', HEADERS).getDataRange().getValues();
  const head = data[0];
  let rows = data.slice(1).map(r => {
      const o = {}; head.forEach((h,i)=>o[h]=r[i]);
      o.ym = ymText_(o.ym); o.date = dateText_(o.date);
      o.mandal = String(o.mandal == null ? '' : o.mandal).trim();
      o.gp = String(o.gp == null ? '' : o.gp).trim();
      o.rf = String(o.rf == null ? '' : o.rf).trim();
      if(!p.full) delete o.payload; return o;
    })
    .filter(o => o.id && (!p.ym || o.ym === ymText_(p.ym)));
  if(u.role === 'PS') rows = rows.filter(o => u.gps.indexOf(String(o.gp)) >= 0);
  else if(mandalRole_(u.role)) rows = rows.filter(o => o.mandal === u.mandal);
  return json_({ ok:true, rows:rows, user:u });
}

/* ---------------- POST ---------------- */
function doPost(e){
  let b;
  try{ b = JSON.parse(e.postData.contents); }catch(err){ return json_({ ok:false, error:'bad request' }); }

  if(b.kind === 'login'){
    const u = findByPhone_(b.u || '');
    if(!u || !u.active) return json_({ ok:false, error:'This number is not registered. Contact the District Panchayat Office.' });
    if(!u.hash) return json_({ ok:false, error:'No PIN set for this number yet. Contact the District Panchayat Office.' });
    const rk = 'pl_' + u.phone, n = Number(cache_().get(rk) || 0);
    if(n >= MAX_PIN_TRIES) return json_({ ok:false, error:'Too many wrong attempts. Try again after an hour.' });
    if(u.hash !== hash_(u.phone, b.p || '')){ cache_().put(rk, String(n + 1), 3600); return json_({ ok:false, error:'Wrong PIN.' }); }
    cache_().remove(rk);
    return json_({ ok:true, token: issueToken_(u), user: pub_(u) });
  }

  const u = auth_(b.token);
  if(!u) return json_({ ok:false, error:'auth' });

  if(b.kind === 'chpass'){
    const full = findByPhone_(u.phone);
    if(!full || !full.hash || full.hash !== hash_(full.phone, b.old || '')) return json_({ ok:false, error:'The current PIN is wrong.' });
    if(!b.newp || String(b.newp).length < 4) return json_({ ok:false, error:'The new PIN must be at least four digits.' });
    const t = uidx_(), nh = hash_(full.phone, b.newp);
    full.rows.forEach(r => t.sh.getRange(r, t.ix.hash + 1).setValue(nh));   // every row for this number
    return json_({ ok:true });
  }

  if(b.kind === 'inspection') return saveInspection_(b, u);
  return json_({ ok:false, error:'unknown request' });
}

function saveInspection_(b, u){
  const r = b.record, photos = b.photos || [];
  if(u.role === 'PS' && u.gps.indexOf(String(r.gp)) < 0) return json_({ ok:false, error:'That Gram Panchayat is not on your charge.' });
  if(mandalRole_(u.role) && r.mandal !== u.mandal) return json_({ ok:false, error:'That Gram Panchayat is outside your mandal.' });

  let folderUrl = '', saved = 0;
  if(photos.length){
    const root = getFolder_(DriveApp.getRootFolder(), PHOTO_FOLDER);
    const f = getFolder_(getFolder_(getFolder_(root, r.ym), r.mandal || 'Unassigned'), r.gp);
    photos.forEach(p => { try{ f.createFile(Utilities.newBlob(Utilities.base64Decode(p.b64), 'image/jpeg', p.name)); saved++; }catch(err){} });
    folderUrl = f.getUrl();
    try{ f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(err){}
  }

  const sh = sheet_('Inspections', HEADERS);
  const ids = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues().flat();
  const vals = HEADERS.map(h => {
    if(h === 'ym')          return "'" + ymText_(r.ym);      // leading quote keeps it text
    if(h === 'officer')     return u.name + ' (' + u.phone + ')';
    if(h === 'role')        return u.role;
    if(h === 'photoCount')  return Number(r.photoCount) || 0;
    if(h === 'photoFolder') return folderUrl || r.photoFolder || '';
    if(h === 'updatedAt')   return new Date().toISOString();
    if(h === 'payload')     return String(r.payload || '').slice(0, 49000);
    return r[h] != null ? r[h] : '';
  });
  const at = ids.indexOf(r.id);
  if(at > 0) sh.getRange(at + 1, 1, 1, HEADERS.length).setValues([vals]);
  else sh.appendRow(vals);
  return json_({ ok:true, photosSaved:saved, photoFolder:folderUrl });
}
function getFolder_(parent, name){
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

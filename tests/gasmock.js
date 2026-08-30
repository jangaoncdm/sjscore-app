/* ============================================================================
   The Apps Script mock. The suites never copy backend logic — they load
   backend/Code.gs (and Admin.gs) FROM DISK into a Node vm whose globals
   imitate Apps Script, so a test cannot pass against a stale duplicate.

   Two imitations matter enough to note:
   • The clock is fake and settable. Everything that judges a day asks
     "new Date()", so a suite pins the moment and the verdict is repeatable.
   • A leading apostrophe on a written string is stripped, exactly as a real
     Sheet stores '2026-08-14 as text. The backend leans on that.
   ============================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const BACKEND = path.join(__dirname, '..', 'backend');

/* what a Sheet does to a written value: the apostrophe is a marker, not data */
function cellify(v){
  if(typeof v === 'string' && v.charAt(0) === "'") return v.slice(1);
  return v === undefined ? '' : v;
}

function fmtInTz(d, tz, fmt){
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(d);
  const g = {};
  parts.forEach(p => { g[p.type] = p.value; });
  if(g.hour === '24') g.hour = '00';
  return String(fmt)
    .replace(/yyyy/g, g.year).replace(/MM/g, g.month).replace(/dd/g, g.day)
    .replace(/HH/g, g.hour).replace(/mm/g, g.minute).replace(/ss/g, g.second);
}

class MockRange {
  constructor(sh, r, c, nr, nc){ this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  getValues(){
    const out = [];
    for(let i = 0; i < this.nr; i++){
      const row = this.sh.rows[this.r - 1 + i] || [];
      const o = [];
      for(let j = 0; j < this.nc; j++){
        const v = row[this.c - 1 + j];
        o.push(v === undefined ? '' : v);
      }
      out.push(o);
    }
    return out;
  }
  setValues(vals){
    for(let i = 0; i < vals.length; i++){
      if(!this.sh.rows[this.r - 1 + i]) this.sh.rows[this.r - 1 + i] = [];
      const row = this.sh.rows[this.r - 1 + i];
      for(let j = 0; j < vals[i].length; j++) row[this.c - 1 + j] = cellify(vals[i][j]);
    }
    return this;
  }
  getValue(){ return this.getValues()[0][0]; }
  setValue(v){ return this.setValues([[v]]); }
  getDisplayValues(){
    const out = [];
    for(let i = 0; i < this.nr; i++){
      const o = [];
      for(let j = 0; j < this.nc; j++){
        const key = (this.r + i) + ':' + (this.c + j);
        if(this.sh.display[key] !== undefined){ o.push(this.sh.display[key]); continue; }
        const row = this.sh.rows[this.r - 1 + i] || [];
        const v = row[this.c - 1 + j];
        if(v instanceof Date) o.push(fmtInTz(v, this.sh.env.sheetTz, 'yyyy-MM-dd'));
        else o.push(v === undefined ? '' : String(v));
      }
      out.push(o);
    }
    return out;
  }
  setNumberFormat(){ return this; }
}

class MockSheet {
  constructor(name, env){ this.name = name; this.env = env; this.rows = []; this.display = {}; }
  getLastRow(){ return this.rows.length; }
  getLastColumn(){ return this.rows.reduce((m, r) => Math.max(m, r.length), 0); }
  appendRow(arr){ this.rows.push(arr.map(cellify)); return this; }
  getRange(r, c, nr, nc){ return new MockRange(this, r, c, nr === undefined ? 1 : nr, nc === undefined ? 1 : nc); }
  getDataRange(){ return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  deleteRow(r){ this.rows.splice(r - 1, 1); }
  /* test helper: what the cell SHOWS, as distinct from what it stores */
  setDisplay(r, c, text){ this.display[r + ':' + c] = String(text); }
}

/* A Drive iterator. Everything DriveApp hands back is one of these, and the
   backup walks Drive rather than being handed one file, so the mock has to
   answer getFiles/getFolders and not only getFoldersByName. */
function mockIter(arr){ let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; }

class MockFile {
  /* the PARENT IS KEPT BY NAME, never by reference: two suites assert against
     JSON.stringify(env.driveRoot), and a child pointing back at its folder
     makes that throw on a circular structure */
  constructor(name, blob, parentName){
    this.name = name; this.blob = blob; this.parentName = parentName;
    /* Drive hands back a stable id as well as a link, and the GPDP register
       keeps it: a link can be re-issued, the id is what finds the document
       again years later when a plan has to be produced. */
    this.id = 'mockfile-' + (++MockFolder.seq);
    this.trashed = false; this.description = '';
    this.created = new Date();
    this.mime = (blob && blob.type) || 'application/octet-stream';
  }
  getId(){ return this.id; }
  getName(){ return this.name; }
  getBlob(){ return this.blob; }
  getUrl(){ return 'https://drive.mock/' + this.parentName + '/' + this.name; }
  getSize(){ const d = this.blob && this.blob.data; return d === undefined || d === null ? 0 : String(d).length; }
  getMimeType(){ return this.mime; }
  getDateCreated(){ return this.created; }
  setDescription(d){ this.description = String(d); return this; }
  getDescription(){ return this.description; }
  setSharing(){ return this; }
  /* trashing is not deleting: the file stays in the mock's world, exactly as
     it stays in Drive's bin, and simply stops being listed */
  setTrashed(t){ this.trashed = !!t; return this; }
  isTrashed(){ return this.trashed; }
  makeCopy(name, folder){ return folder.createFile(mockBlob('copy-of-' + this.name, this.mime, name)); }
}

class MockFolder {
  constructor(name){ this.name = name; this.folders = {}; this.files = []; this.trashed = false; }
  getName(){ return this.name; }
  live(){ return this.files.filter(f => !f.trashed); }
  getFoldersByName(name){
    const hit = this.folders[name] && !this.folders[name].trashed ? this.folders[name] : null;
    let used = false;
    return { hasNext: () => !!hit && !used, next: () => { used = true; return hit; } };
  }
  getFilesByName(name){ return mockIter(this.live().filter(f => f.getName() === name)); }
  getFiles(){ return mockIter(this.live()); }
  getFolders(){ return mockIter(Object.keys(this.folders).map(k => this.folders[k]).filter(f => !f.trashed)); }
  createFolder(name){ const f = new MockFolder(name); this.folders[name] = f; return f; }
  createFile(blob){
    const nm = (blob && (blob.name || (blob.getName && blob.getName()))) || 'file';
    const file = new MockFile(nm, blob, this.name);
    this.files.push(file);
    return file;
  }
  getUrl(){ return 'https://drive.mock/' + this.name; }
  setSharing(){}
  setTrashed(t){ this.trashed = !!t; return this; }
  isTrashed(){ return this.trashed; }
}
MockFolder.seq = 0;

/* A blob carries a name as a field (the GPDP path reads blob.name) AND as a
   getter/setter pair (the workbook export renames what the fetch returned). */
function mockBlob(data, type, name){
  return {
    data: data, type: type, name: name,
    getName(){ return this.name; },
    setName(n){ this.name = n; return this; },
    getBytes(){ return Buffer.isBuffer(this.data) ? this.data : Buffer.from(String(this.data)); },
    getDataAsString(){ return Buffer.isBuffer(this.data) ? this.data.toString('utf8') : String(this.data); }
  };
}

/* Loads the backend from disk into a fresh mocked world and returns it.
   opts: now (ISO), scriptTz, sheetTz, admin (also load Admin.gs). */
function load(opts){
  opts = opts || {};
  const env = {
    sheets: {}, outbox: [], logs: [], triggers: [], fetches: [],
    props: {}, cacheStore: {},
    scriptTz: opts.scriptTz || 'Asia/Calcutta',
    sheetTz: opts.sheetTz || opts.scriptTz || 'Asia/Calcutta',
    adminEmail: 'collector.jangaon@mock.example',
    driveRoot: new MockFolder('root'),
    installed: [],
    ssId: 'mock-spreadsheet-id'
  };
  /* the register as Drive sees it — what makeCopy is called on */
  env.ssFile = new MockFile('SJGP register', mockBlob('register', 'application/vnd.google-apps.spreadsheet', 'SJGP register'), 'root');
  const clock = { now: Date.parse(opts.now || '2026-08-14T18:05:00+05:30') };
  env.setNow = iso => { clock.now = Date.parse(iso); };

  class FakeDate extends Date {
    constructor(...a){ if(a.length === 0) super(clock.now); else super(...a); }
    static now(){ return clock.now; }
  }
  env.D = (...a) => new FakeDate(...a);

  const ss = {
    getSheetByName: n => env.sheets[n] || null,
    insertSheet: n => { env.sheets[n] = new MockSheet(n, env); return env.sheets[n]; },
    getSpreadsheetTimeZone: () => env.sheetTz,
    getId: () => env.ssId,
    getName: () => 'SJGP register'
  };

  const sandbox = {
    Date: FakeDate,
    console: console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => (env.props[k] === undefined ? null : env.props[k]),
        setProperty: (k, v) => { env.props[k] = String(v); },
        deleteProperty: k => { delete env.props[k]; },
        getProperties: () => Object.assign({}, env.props)
      })
    },
    CacheService: {
      getScriptCache: () => ({
        get: k => (env.cacheStore[k] === undefined ? null : env.cacheStore[k]),
        put: (k, v) => { env.cacheStore[k] = String(v); },
        remove: k => { delete env.cacheStore[k]; }
      })
    },
    Utilities: {
      formatDate: (d, tz, fmt) => fmtInTz(d, tz, fmt),
      getUuid: () => crypto.randomUUID(),
      base64Encode: x => Buffer.isBuffer(x) ? x.toString('base64') : Buffer.from(x).toString('base64'),
      base64Decode: s => Buffer.from(String(s), 'base64'),
      computeDigest: (alg, s) => crypto.createHash('sha256').update(String(s)).digest(),
      newBlob: (data, type, name) => mockBlob(data, type, name),
      DigestAlgorithm: { SHA_256: 'SHA_256' }
    },
    Session: {
      getScriptTimeZone: () => env.scriptTz,
      getEffectiveUser: () => ({ getEmail: () => env.adminEmail })
    },
    ContentService: {
      createTextOutput: s => ({ _c: s, setMimeType(){ return this; }, getContent(){ return this._c; } }),
      MimeType: { JSON: 'application/json' }
    },
    LockService: { getScriptLock: () => ({ waitLock(){}, releaseLock(){}, tryLock(){ return true; } }) },
    MailApp: { sendEmail: (to, subject, body, options) => { env.outbox.push({ to: to, subject: subject, body: body, htmlBody: options && options.htmlBody, attachments: (options && options.attachments) || [] }); } },
    GmailApp: { sendEmail: (to, subject, body, options) => { env.outbox.push({ to: to, subject: subject, body: body, htmlBody: options && options.htmlBody, attachments: (options && options.attachments) || [] }); } },
    DriveApp: {
      getRootFolder: () => env.driveRoot,
      /* the live register itself is a Drive file: the backup copies it by id */
      getFileById: id => {
        if(id !== env.ssId) throw new Error('no such file: ' + id);
        return env.ssFile;
      },
      Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
      Permission: { VIEW: 'VIEW' }
    },
    ScriptApp: {
      getProjectTriggers: () => env.installed.map(name => ({ getHandlerFunction: () => name })),
      deleteTrigger: t => { env.installed = env.installed.filter(n => n !== t.getHandlerFunction()); },
      newTrigger: name => ({
        timeBased(){ return this; }, everyDays(){ return this; },
        atHour(){ return this; },
        create(){ env.triggers.push(name); env.installed.push(name); }
      }),
      getScriptId: () => 'mock-script-id',
      getOAuthToken: () => 'mock-oauth-token'
    },
    UrlFetchApp: {
      fetch: (url, o) => {
        env.fetches.push({ url: url, opts: o });
        /* env.fetchReply may be a string, or a function of (url, opts) — the
           weather suite answers one endpoint and the briefing another, and a
           single canned reply cannot serve both. */
        const r = (typeof env.fetchReply === 'function') ? env.fetchReply(url, o) : env.fetchReply;
        const body = r === undefined || r === null ? '{"content":[{"type":"text","text":"mock"}]}' : r;
        /* env.fetchCodeFor may answer per-URL: the backup asks the published
           site for seven files and the repository for three, and one of them
           being absent must not read as all of them failing */
        const code = (typeof env.fetchCodeFor === 'function' && env.fetchCodeFor(url) != null)
          ? env.fetchCodeFor(url) : (env.fetchCode || 200);
        return {
          getContentText: () => body,
          getResponseCode: () => code,
          getBlob: () => mockBlob(body, 'application/octet-stream', 'download')
        };
      }
    },
    Logger: { log: s => { env.logs.push(String(s)); } }
  };

  const ctx = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(BACKEND, 'Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });
  if(opts.admin)
    vm.runInContext(fs.readFileSync(path.join(BACKEND, 'Admin.gs'), 'utf8'), ctx, { filename: 'Admin.gs' });
  env.ctx = ctx;
  /* top-level const/let in a vm script live in the context's lexical scope,
     not on the global — reach them (and only them) through here */
  env.eval = code => vm.runInContext(code, ctx);

  /* ---- conveniences the suites share ---- */
  env.mkSheet = (name, headers, rowObjs) => {
    const sh = new MockSheet(name, env);
    sh.rows.push(headers.slice());
    (rowObjs || []).forEach(o => sh.appendRow(headers.map(h => (o[h] === undefined ? '' : o[h]))));
    env.sheets[name] = sh;
    return sh;
  };
  env.addRow = (name, obj) => {
    const sh = env.sheets[name];
    const head = sh.rows[0].map(String);
    sh.appendRow(head.map(h => (obj[h] === undefined ? '' : obj[h])));
  };
  env.col = (name, header) => {
    const sh = env.sheets[name];
    const i = sh.rows[0].map(String).indexOf(header);
    return sh.rows.slice(1).map(r => (r[i] === undefined ? '' : r[i]));
  };
  env.get = (op, params) => JSON.parse(ctx.doGet({ parameter: Object.assign({ op: op }, params || {}) }).getContent());
  env.post = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());

  /* the standing roll most suites start from */
  env.seedUsers = extra => {
    const U = ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'];
    env.mkSheet('Users', U, [
      { Phone: '9000000001', Name: 'Sandeep Kumar Jha', Role: 'COLLECTOR', Mandal: '', GP: '', Email: 'cdm@mock.example', Active: 'TRUE' },
      { Phone: '9000000011', Name: 'A. Punctual',  Role: 'MPO',  Mandal: 'Jangaon', GP: '', Email: 'a@mock.example', Active: 'TRUE' },
      { Phone: '9000000012', Name: 'B. LateMark',  Role: 'MPDO', Mandal: 'Jangaon', GP: '', Email: 'b@mock.example', Active: 'TRUE' },
      { Phone: '9000000013', Name: 'C. LateSync',  Role: 'MPO',  Mandal: 'Chilpur', GP: '', Email: 'c@mock.example', Active: 'TRUE' },
      { Phone: '9000000014', Name: 'D. FirstMiss', Role: 'PS',   Mandal: 'Jangaon', GP: 'Konne', Email: 'd@mock.example', Active: 'TRUE' },
      { Phone: '9000000015', Name: 'E. ThirdMiss', Role: 'MPO',  Mandal: 'Chilpur', GP: '', Email: 'e@mock.example', Active: 'TRUE' },
      { Phone: '9000000016', Name: 'F. OnLeave',   Role: 'MPDO', Mandal: 'Chilpur', GP: '', Email: 'f@mock.example', Active: 'TRUE' },
      { Phone: '9000000017', Name: 'G. SecondMiss',Role: 'MPDO', Mandal: 'Jangaon', GP: '', Email: 'g@mock.example', Active: 'TRUE' },
      /* attendance is voluntary for the MSO — order of 19.08.2026 */
      { Phone: '9000000010', Name: 'M. Voluntary', Role: 'MSO',  Mandal: 'Jangaon', GP: '', Email: 'm@mock.example', Active: 'TRUE' }
    ].concat(extra || []));
  };
  env.mark = (phone, date, markedAt, receivedAt, more) => {
    if(!env.sheets['Attendance'])
      env.mkSheet('Attendance', ['id','date','phone','name','role','mandal','markedAt','lat','lng','accuracy',
        'verified','photo','timezone','receivedAt','status','leaveId','leaveType','markCount','firstMarkAt','skew'], []);
    env.addRow('Attendance', Object.assign({
      id: 'ATT-' + date + '-' + phone, date: date, phone: phone,
      markedAt: markedAt || '', receivedAt: receivedAt || markedAt || '',
      status: 'PRESENT', markCount: 1, firstMarkAt: markedAt || ''
    }, more || {}));
  };

  return env;
}

module.exports = { load: load, fmtInTz: fmtInTz };

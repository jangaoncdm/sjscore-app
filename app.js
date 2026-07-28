'use strict';
/* ============================================================
   SJGP — Swachh Jangaon Gram Panchayat 5.1
   Collectorate, Jangaon · Rc.No.788/DPO/26/34
   Paste the Apps Script /exec URL below before publishing.

   New in 5.0
   • Attendance, with a geo-stamped photograph, before anything else — for
     every officer, every day, whatever the role.
   • The Panchayat Secretary sees but does not write. The evaluation is
     recorded by the Task Force; the Secretary reads what was filed.
   • Every clause carries its own evidence — a note and photographs of its
     own, not one common album at the end.
   ============================================================ */
const SERVER_URL = 'https://script.google.com/macros/s/AKfycbz8Ye9LqGB3bLWkTWcdw6JvU__U9K4VRaG-IFFpwc67G__1vdpMryV6NEfz5FJrnezS/exec';
const APP_VERSION = '6.0';

/* ---------------- rubric (identical to the printed framework) ---------------- */
const PC = {A:'#166534',B:'#0B6478',C:'#8A4F06',D:'#1D4ED8',E:'#5B21B6',F:'#A8201A',G:'#334155'};
const GP_RUBRIC = [
 {p:'A', name:'Solid Waste Management', law:'SWM Rules, 2026', max:30, items:[
  ['A1','Door-to-door collection working — 5 random households, 1 mark each (one in an SC/ST colony)',5],
  ['A2','Four-stream segregation at those same 5 households — wet, dry, sanitary, special-care',4],
  ['A3','Segregated transport: partitioned vehicle, no re-mixing (2); trip logbook current (1)',3],
  ['A4','MRF: four bays in use (2); special-care secured (1); waste confined (1); no burn marks (1)',5],
  ['A5','Compost pits charged and turned (2); output register with quantities (2)',4],
  ['A6','Dry waste baled (1); recycler receipts (1); no plastic burning anywhere (1)',3],
  ['A7','Sanitary and special-care disposal tie-up (1); none in the compost stream (1)',2],
  ['A8','No open dumping — village entry point (1) and water-body margin (1) clean',2],
  ['A9','Bye-laws adopted and user fee notified (1); spot-fine register with challans (1)',2]]},
 {p:'B', name:'Drains & Liquid Waste', law:'Section 43, TSPR Act', max:18, items:[
  ['B1','Free flow at 3 random points chosen by the team — 2 marks each',6],
  ['B2','Desilting as per the weekly plan (2); silt lifted the same day (2)',4],
  ['B3','No sullage standing — 3 streets and 1 vacant plot, 1 mark each',4],
  ['B4','Soak pits at stand posts and institutions, percolating',2],
  ['B5','Outfall never into a drinking source (1); terminal soakage (1)',2]]},
 {p:'C', name:'Roads, Public Places & Infrastructure', law:'Section 43, TSPR Act', max:12, items:[
  ['C1','Sweeping today — 3 stretches (bazaar, interior, SC/ST street): all three = 4; two = 2; one = 1',4],
  ['C2','Market, shandy and bus stand clean; bins placed and not overflowing',1],
  ['C3','School (1), anganwadi (1), GP office and PHC surroundings (1)',3],
  ['C4','Vacant plots: notices served; cleared at owner\u2019s cost and posted to the DCB',1],
  ['C5','Road shoulders clear of bush and jungle across the whole GP — traverse clear (1); rotation programme covering every road (1)',2],
  ['C6','No street light glowing in daytime — any light burning by day scores nil; record the pole number',1]]},
 {p:'D', name:'Drinking Water Safety', law:'IS 10500', max:10, items:[
  ['D1','Residual chlorine at least 0.2 mg/L before the team — tail-end (2), mid-line (2)',4],
  ['D2','Chlorination log countersigned (2); bleaching stock tallies and usable (1)',3],
  ['D3','OHSR cleaned within six months, date painted (2); no drain within 15 m (1)',3]]},
 {p:'E', name:'ODF Sustainability', law:'SBM-G Phase II', max:10, items:[
  ['E1','Two historical OD spots verified clean — 2 marks each',4],
  ['E2','Three random households: toilet present, working and in use',3],
  ['E3','School (1), anganwadi (1) and public toilet (1) working with water',3]]},
 {p:'F', name:'Vector Control & Public Health', law:'Section 43(v)', max:10, items:[
  ['F1','Larval check at 5 water-holding points: none positive = 4; one = 3; two = 2; three or more = 0',4],
  ['F2','Weekly dry day and anti-larval work, with dated locality-wise record',2],
  ['F3','Fogging on schedule June–October, or machine drill-ready off season',2],
  ['F4','Fever and diarrhoea line-list reviewed with action-taken notes',2]]},
 {p:'G', name:'Governance, Funds & Community', law:'Section 6, TSPR Act', max:10, items:[
  ['G1','Last month\u2019s deficiencies rectified — 4 \u00d7 rectified \u00f7 pointed out',4],
  ['G2','Sanitation reviewed in the GP meeting (1) and the Gram Sabha (1)',2],
  ['G3','XV FC tied grant spent per plan; SWM user-fee ledger maintained',2],
  ['G4','Five random residents: four or more satisfied = 2; three = 1',2]]}];

const RF_LIST = [
 [1,'Open burning or burying of waste','Environmental compensation; proposal to TGPCB'],
 [2,'Sewage entering a drinking-water source',''],
 [3,'Manual entry into a septic tank or sewer','FIR under the 2013 Act; report in 24 hours'],
 [4,'Sanitation wages pending beyond 30 days',''],
 [5,'No chlorination for 7 straight days',''],
 [6,'Carcass not removed within 24 hours',''],
 [7,'Fresh open defecation at two or more spots',''],
 [8,'Programme leaked, records fabricated, or team obstructed',''],
 [9,'Larvae in three or more of five points','June to October'],
 [10,'Sanitary or special-care waste in compost, or handled bare-handed','']];

const PS_RUBRIC = [
 {part:'Daily supervision and SWM enforcement', max:40, items:[
  ['pA1','Early-morning rounds: 24+ days = 5; 18–23 = 3; 12–17 = 2',5,0],
  ['pA2','Attendance taken personally; work allotted in writing',5,0],
  ['pA3','Weekly plan including the jungle-clearance rotation: 4 plans = 5; 3 = 3',5,0],
  ['pA4','Desilting — carried from Pillar B',4,1],
  ['pA5','Four-stream chain — carried from Pillar A',5,1],
  ['pA6','Bleaching and lime spread to standard',4,0],
  ['pA7','Lights: 18 of 20 working = 4; any burning by day = 0',4,0],
  ['pA8','Complaints closed within 48 hours: 90% or more = 4',4,0],
  ['pA9','Spot fines (2); awareness round (1); no burning found (1)',4,0]]},
 {part:'Statutory duties and records', max:30, items:[
  ['pB1','Six mandatory registers current: all six = 5; five = 4; four = 3',5,0],
  ['pB2','GP meeting and Gram Sabha held with sanitation on the agenda',4,0],
  ['pB3','XV FC spending per plan; user-fee account maintained',4,0],
  ['pB4','Audit paragraphs replied within time',4,0],
  ['pB5','e-Panchayat current; SWM portal and annual-return data furnished',4,0],
  ['pB6','Births and deaths: nothing pending beyond 21 days',4,0],
  ['pB7','Last month\u2019s directions: 5 \u00d7 complied \u00f7 issued',5,0]]},
 {part:'Revenue facilitation', max:15, items:[
  ['pC1','Weekly DCB review with the Bill Collector: 4 = 6; 3 = 4; 2 = 2',6,0],
  ['pC2','Collection against target: 90%+ = 5; 75% = 4; 60% = 3; 45% = 1',5,0],
  ['pC3','New or escaped assessments: 5+ = 4; certified nil-gap = 4',4,0]]},
 {part:'Public health coordination', max:15, items:[
  ['pD1','Chlorination supervised — carried from Pillar D',5,1],
  ['pD2','Line-list reviewed with action taken',5,0],
  ['pD3','Vector drives personally led, with dated records',5,0]]}];

const WK_RUBRIC = [
 ['w1','Attendance: 95%+ = 10; 85–94% = 7; 75–84% = 4',10],
 ['w2','Beat swept — 3 stretches, 5 marks each',15],
 ['w3','Drains cleaned — 3 points, 5 marks each, silt lifted',15],
 ['w4','Collection trips as per logbook (10); four streams kept separate (5)',15],
 ['w5','MRF and compost duty — bay discipline, pits turned',10],
 ['w6','Bleaching and chlorination visible at 3 points',10],
 ['w7','Protective gear worn, gloves for sanitary and special-care waste',5],
 ['w8','Tools serviceable and accounted',5],
 ['w9','Citizen feedback — 5 respondents, 2 marks each',10],
 ['w10','Took part in drives and pre-monsoon work',5]];

const BC_RUBRIC = [
 ['b1','Current demand against target — computed from the DCB',30,1],
 ['b2','Arrear demand against target — computed from the DCB',15,1],
 ['b3','Remittance within 48 hours: 10 receipts traced = 15; −3 each default; beyond 7 days = 0',15,0],
 ['b4','Demand notices with acknowledgment: 90%+ = 10; 70–89% = 6',10,0],
 ['b5','New or escaped assessments: 5+ = 10; 3–4 = 6; certified nil-gap = 10',10,0],
 ['b6','DCB, receipt books and counterfoils accounted',10,0],
 ['b7','SWM user fee: separate DCB current; spot-fine challans accounted',5,0],
 ['b8','Field assistance — notices, enumeration, Gram Sabha, drives',5,0]];

const PHOTO_POINTS = ['MRF — four bays','Compost & special-care store','Main drain','Terminal outfall',
 'SC/ST colony street','Bazaar stretch','School toilet','Anganwadi surroundings','OHSR with chloroscope',
 'Worst spot found','Best-kept spot','Last month\u2019s deficiency','Road-shoulder clearance','Daytime light check'];

/* ---------------- helpers ---------------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad2 = n => String(n).padStart(2,'0');
const todayStr = () => { const d=new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,9);

/* ---------------- store ----------------
   Text lives in localStorage — small, synchronous, survives everything.
   Photographs live in IndexedDB, which is measured in hundreds of megabytes
   instead of five. Before 5.0 a long day of photographs could fill the phone
   store and a record would refuse to save. */
let DB;
function load(){
  try{ DB = JSON.parse(localStorage.getItem('sjf5') || 'null'); }catch(e){ DB = null; }
  if(!DB){
    let old = null;
    try{ old = JSON.parse(localStorage.getItem('sjf4') || 'null'); }catch(e){}
    DB = {url:(old&&old.url)||'', session:(old&&old.session)||null, master:(old&&old.master)||[],
          records:{}, cache:[], cacheAt:'', att:{}, leave:[], prefs:{sun:0,big:0}, iosTipSeen:!!(old&&old.iosTipSeen)};
  }
  DB.att = DB.att || {}; DB.prefs = DB.prefs || {sun:0,big:0};
  DB.records = DB.records || {}; DB.cache = DB.cache || []; DB.master = DB.master || []; DB.leave = DB.leave || [];
  Object.values(DB.records).forEach(r => { if(r.filed === undefined) r.filed = (r.sync === 'synced'); });
}
let st;
function save(){ clearTimeout(st); st = setTimeout(saveNow, 200); }
function saveNow(){
  clearTimeout(st);
  try{ localStorage.setItem('sjf5', JSON.stringify(DB)); }
  catch(e){ toast('Phone storage is full. Sync now to clear space.', 5000); }
}

/* photographs — IndexedDB, with a memory fallback for private browsing */
const BLOBS = (function(){
  const MEM = new Map(); let dbp = null, broken = false;
  function open(){
    if(broken) return Promise.reject(new Error('no idb'));
    if(dbp) return dbp;
    dbp = new Promise((res, rej) => {
      let rq; try{ rq = indexedDB.open('sjscore', 1); }catch(e){ broken = true; return rej(e); }
      rq.onupgradeneeded = () => { const d = rq.result; if(!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs'); };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => { broken = true; rej(rq.error); };
    });
    return dbp;
  }
  function store(mode){ return open().then(d => d.transaction('blobs', mode).objectStore('blobs')); }
  return {
    put(k, v){ MEM.set(k, v);
      return store('readwrite').then(s => new Promise(res => { const r = s.put(v, k); r.onsuccess = () => res(k); r.onerror = () => res(k); }))
        .catch(() => k); },
    get(k){ if(MEM.has(k)) return Promise.resolve(MEM.get(k));
      return store('readonly').then(s => new Promise(res => { const r = s.get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }))
        .catch(() => null); },
    del(k){ MEM.delete(k);
      return store('readwrite').then(s => new Promise(res => { const r = s.delete(k); r.onsuccess = () => res(); r.onerror = () => res(); }))
        .catch(() => {}); },
    async estimate(){ try{ const e = await navigator.storage.estimate(); return e; }catch(err){ return null; } }
  };
})();

const ymNow = () => { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth()+1); };
function prevYm(ym,n){ let [y,m]=ym.split('-').map(Number); m-=n; while(m<1){m+=12;y--;} return y+'-'+pad2(m); }
const fyMonths = ym => { const m = +ym.split('-')[1]; return m>=4 ? m-3 : m+9; };
const monthName = ym => new Date(+ym.split('-')[0], +ym.split('-')[1]-1, 1).toLocaleString('en-IN',{month:'long',year:'numeric'});
const dayName = d => new Date(d+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long', day:'numeric', month:'long', year:'numeric'});
const niceDate = d => { if(!d) return ''; const t=new Date(String(d).length>10?d:d+'T00:00:00');
  return isNaN(t) ? String(d) : t.toLocaleDateString('en-IN',{day:'numeric', month:'long', year:'numeric'}); };
const rid = (gp,ym) => gp + '|' + ym;
const user = () => (DB.session && DB.session.user) || null;
const myGps = () => { const u = user(); if(!u) return []; return (u.gps && u.gps.length) ? u.gps : (u.gp ? [u.gp] : []); };
const isDistrict = r => r==='DPO' || r==='COLLECTOR' || r==='DLPO';
const isMandal = r => r==='MPDO' || r==='MSO' || r==='MPO';
/* The Secretary is the officer being evaluated. Read access only, everywhere. */
const isViewer = r => r === 'PS';
const canEdit = () => { const u = user(); return !!u && !isViewer(u.role); };

/* ---------------- scoring (unchanged from 4.x — the marks must not move) ---------------- */
const clamp = (v,mx) => Math.max(0, Math.min(mx, Math.round(Number(v)||0)));
const g1Auto = r => r.prevPointed>0 ? Math.min(4, Math.floor(4*r.prevRectified/r.prevPointed)) : 4;
const pillarScore = (r,p) => p.items.reduce((s,[id,,mx]) => s + (id==='G1' ? g1Auto(r) : clamp(r.s[id],mx)), 0);
const gpTotal = r => GP_RUBRIC.reduce((s,p)=>s+pillarScore(r,p), 0);
const gradeOf = (sc,rf) => (rf && rf.length) ? 'D' : sc>=85?'A' : sc>=70?'B' : sc>=55?'C' : 'D';
function psAuto(r,id){ const g=r.s;
  if(id==='pA4'){ const t=clamp(g.B1,6)+clamp(g.B2,4); return t>=8?4:t>=6?2:0; }
  if(id==='pA5'){ const t=clamp(g.A2,4)+clamp(g.A3,3)+clamp(g.A4,5); return t>=9?5:t>=6?3:0; }
  if(id==='pD1'){ const d=clamp(g.D1,4); return d>=3?5:d===2?3:0; } return 0; }
const psTotal = r => PS_RUBRIC.reduce((s,pt)=>s+pt.items.reduce((a,[id,,mx,au])=>a+(au?psAuto(r,id):clamp(r.ps.s[id],mx)),0),0);
const slab = (p,t) => { for(const [th,m] of t) if(p>=th) return m; return 0; };
function bcAuto(r,id){ const d=r.bc.dcb, mo=fyMonths(r.ym), pt=a=>a*mo/12;
  if(id==='b1'){ const p = pt(d.ca)>0 ? 100*d.cc/pt(d.ca) : 0; return slab(p,[[90,30],[80,25],[70,20],[60,15],[45,8],[0,0]]); }
  if(id==='b2'){ const p = pt(d.aa)>0 ? 100*d.ac/pt(d.aa) : 0; return slab(p,[[90,15],[80,12],[70,10],[60,7],[45,4],[0,0]]); } return 0; }
const bcTotal = r => BC_RUBRIC.reduce((s,[id,,mx,au])=>s+(au?bcAuto(r,id):clamp(r.bc.s[id],mx)),0);
const wkTotal = w => WK_RUBRIC.reduce((s,[id,,mx])=>s+clamp(w.s[id],mx),0);
const wkAvg = r => { const ws=(r.workers||[]).filter(w=>w.name.trim()||Object.keys(w.s).length);
  return ws.length ? Math.round(ws.reduce((s,w)=>s+wkTotal(w),0)/ws.length) : 0; };
/* A record filed by the officer goes to the district by itself. One that has
   never been filed is a draft and is never sent — the readiness check exists
   precisely so that half-finished evaluations do not reach the district. */
const outbox = () => Object.values(DB.records).filter(r => r.filed && (r.sync !== 'synced' || photoQueue(r).length));
const draftCount = () => Object.values(DB.records).filter(r => !r.filed).length;
const pendingCount = () => outbox().length;
const BACKOFF = [60e3, 5*60e3, 15*60e3, 30*60e3, 60*60e3];
const dueNow = () => outbox().filter(r => !r.nextTry || r.nextTry <= Date.now());
const pendingAtt = () => Object.values(DB.att).filter(a=>a.sync!=='synced').length;

const MAXOF = id => {
  for(const p of GP_RUBRIC){ const it=p.items.find(x=>x[0]===id); if(it) return it[2]; }
  for(const pt of PS_RUBRIC){ const it=pt.items.find(x=>x[0]===id); if(it) return it[2]; }
  const b=BC_RUBRIC.find(x=>x[0]===id); if(b) return b[2];
  const w=WK_RUBRIC.find(x=>x[0]===id); if(w) return w[2];
  return 0;
};
const CLAUSE_TEXT = (() => {
  const m = {};
  GP_RUBRIC.forEach(p => p.items.forEach(([id,q]) => m[id]=q));
  PS_RUBRIC.forEach(p => p.items.forEach(([id,q]) => m[id]=q));
  BC_RUBRIC.forEach(([id,q]) => m[id]=q);
  WK_RUBRIC.forEach(([id,q]) => m[id]=q);
  return m;
})();

/* ---------------- platform and preferences ---------------- */
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = window.navigator.standalone === true ||
                   window.matchMedia('(display-mode: standalone)').matches;

function applyPrefs(){
  document.documentElement.setAttribute('data-sun', DB.prefs.sun ? '1' : '0');
  document.documentElement.setAttribute('data-big', DB.prefs.big ? '1' : '0');
}

let kbTimer = null;
function setKb(on){ clearTimeout(kbTimer); kbTimer = setTimeout(()=>document.body.classList.toggle('kb', on), on ? 0 : 90); }
document.addEventListener('focusin', e => { if(e.target.matches('input,textarea,select')) setKb(true); });
document.addEventListener('focusout', () => setKb(false));
if(window.visualViewport){
  const vv = window.visualViewport;
  vv.addEventListener('resize', () => { if(window.innerHeight - vv.height > 120) setKb(true); });
}
function netBar(){ $('#offbar').classList.toggle('on', !navigator.onLine); }
window.addEventListener('online', () => { netBar(); autoSync(); });
window.addEventListener('offline', netBar);

/* ---------------- chrome ---------------- */
function toast(msg, ms){ const t=$('#toast'); t.textContent=msg; t.classList.add('on');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('on'), ms||2600); }
function showSheet(html){ $('#sheetBody').innerHTML=html; $('#sheet').classList.add('on'); }
function hideSheet(){ $('#sheet').classList.remove('on'); }
$('#sheet').addEventListener('click', e => { if(e.target.classList.contains('scrim')) hideSheet(); });

function confirmSheet(title, body, danger, onYes){
  showSheet(`<div style="padding:6px 20px 4px"><h2>${esc(title)}</h2>
    <p style="font-size:15px;color:var(--ink-2);margin-top:9px;line-height:1.5">${esc(body)}</p></div>
    <div style="padding:16px 20px 4px">
      <button class="btn ${danger?'danger':''}" id="cfYes">${danger?'Delete':'Continue'}</button>
      <button class="btn quiet" id="cfNo">Keep it</button></div>`);
  $('#cfYes').addEventListener('click', ()=>{ hideSheet(); onYes(); });
  $('#cfNo').addEventListener('click', hideSheet);
}

const TAB_DEFS = {
  home:    ['Home',    '<svg viewBox="0 0 24 24"><path d="M12 3.2 3.6 10v10.3h6.1v-6h4.6v6h6.1V10z"/></svg>'],
  inspect: ['Inspect', '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 2.4a7.6 7.6 0 1 1 0 15.2 7.6 7.6 0 0 1 0-15.2m1.1 2.3-1.1 5.1-3.6 2.6 1.3 1.9 4.5-3.2z"/></svg>'],
  records: ['Records', '<svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6zm8 1.8V8h4.2zM8.5 11h7v1.8h-7zm0 3.6h7v1.8h-7zm0 3.6h4.6V20H8.5z"/></svg>'],
  more:    ['More',    '<svg viewBox="0 0 24 24"><path d="M6 10.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6m6 0a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6m6 0a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6"/></svg>']
};
function buildTabs(){
  const keys = canEdit() ? ['home','inspect','records','more'] : ['home','records','more'];
  $('#tabs').innerHTML = keys.map(k => {
    const [label, svg] = TAB_DEFS[k];
    return `<button role="tab" data-s="${k}" aria-selected="${k===TAB?'true':'false'}" aria-label="${label}">
      ${svg}<span>${label}</span>${k==='records'?'<i class="dot" id="pendDot" hidden></i>':''}</button>`;
  }).join('');
}

let TAB='home';
function go(tab){
  if(tab==='inspect' && !canEdit()) tab='home';
  TAB=tab;
  $$('#tabs button').forEach(b=>b.setAttribute('aria-selected', b.dataset.s===tab?'true':'false'));
  $$('.screen').forEach(s=>s.classList.toggle('on', s.id==='s-'+tab));
  window.scrollTo(0,0);
  if(tab==='home') renderHome();
  if(tab==='inspect') renderInspect();
  if(tab==='records') renderRecords();
  if(tab==='more') renderMore();
}
$('#tabs').addEventListener('click', e => { const b=e.target.closest('button'); if(b) go(b.dataset.s); });
window.addEventListener('scroll', () => {
  const on = window.scrollY > 6;
  $$('.nav').forEach(n => n.classList.toggle('scrolled', on));
}, {passive:true});

/* ---------------- api ---------------- */
async function post(body, url){
  const u = url || DB.url || SERVER_URL;
  if(!u) throw new Error('No server address set');
  const res = await fetch(u, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(body)});
  const out = await res.json();
  if(out && out.ok===false && out.error==='auth'){ endSession(); throw new Error('Session ended — sign in again'); }
  return out;
}
async function get(params){
  const u = DB.url || SERVER_URL;
  if(!u) throw new Error('No server address set');
  const q = new URLSearchParams({token:(DB.session&&DB.session.token)||'', ...params});
  const res = await fetch(u + '?' + q.toString());
  const out = await res.json();
  if(out && out.ok===false && out.error==='auth'){ endSession(); throw new Error('Session ended — sign in again'); }
  return out;
}
function endSession(){ DB.session=null; saveNow(); gate(); }

/* ============================================================
   PHOTOGRAPHS
   Every picture the app takes is stamped on the picture itself with the
   place, the coordinates and the time. A photograph downloaded from Drive
   months later still carries its own proof, which a bare JPEG does not.
   ============================================================ */
function geoMsg(err){
  if(!err) return 'Location could not be read.';
  if(err.code === 1) return 'Location permission is off for this app. Switch it on in the phone settings, then try again.';
  if(err.code === 2) return 'No fix yet. Step into the open, away from walls, and try again.';
  if(err.code === 3) return 'Location is taking too long. Step into the open and try again.';
  return 'Location could not be read.';
}
function getFix(opts){
  return new Promise((res, rej) => {
    if(!navigator.geolocation) return rej(new Error('This phone cannot provide a location fix.'));
    navigator.geolocation.getCurrentPosition(
      p => res({lat:p.coords.latitude, lng:p.coords.longitude, acc:p.coords.accuracy, at:new Date().toISOString()}),
      e => rej(new Error(geoMsg(e))),
      Object.assign({enableHighAccuracy:true, timeout:18000, maximumAge:0}, opts||{}));
  });
}
/* one high-accuracy attempt, then a coarse one — a network fix beats no fix */
async function getFixTwice(){
  try{ return await getFix(); }
  catch(e){ return await getFix({enableHighAccuracy:false, timeout:15000, maximumAge:120000}); }
}
const fixText = f => f ? `${f.lat.toFixed(5)}, ${f.lng.toFixed(5)} · \u00b1${Math.round(f.acc)} m` : 'Not captured';
const stampTime = ts => new Date(ts).toLocaleString('en-IN',
  {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true});

function drawStamp(c, lines){
  const ctx = c.getContext('2d'), w = c.width, h = c.height;
  const fs = Math.max(11, Math.round(w * 0.031)), lh = Math.round(fs * 1.36), padx = Math.round(w * 0.03);
  const bar = lh * lines.length + Math.round(fs * 1.15);
  ctx.fillStyle = 'rgba(8,14,10,.68)'; ctx.fillRect(0, h - bar, w, bar);
  ctx.fillStyle = '#B8860B'; ctx.fillRect(0, h - bar, w, Math.max(2, Math.round(fs * 0.15)));
  ctx.textBaseline = 'alphabetic';
  lines.forEach((raw, i) => {
    const first = i === 0;
    ctx.font = (first ? '700 ' : '400 ') + Math.round(first ? fs : fs * 0.92) + 'px -apple-system,"Segoe UI",Roboto,sans-serif';
    ctx.fillStyle = first ? '#FFFFFF' : 'rgba(255,255,255,.93)';
    let t = String(raw || ''), room = w - padx * 2;
    while(t.length > 4 && ctx.measureText(t).width > room) t = t.slice(0, -2);
    ctx.fillText(t, padx, h - bar + Math.round(fs * 0.95) + i * lh);
  });
}
/* file  ->  { b64, id }  — resized, stamped, stored in IndexedDB */
function grabPhoto(file, opts){
  const o = Object.assign({max:1000, quality:0.6, lines:[]}, opts || {});
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That picture could not be read. Take it again.')); };
    img.onload = () => {
      try{
        const sc = Math.min(1, o.max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * sc));
        c.height = Math.max(1, Math.round(img.height * sc));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        if(o.lines.length) drawStamp(c, o.lines);
        const b64 = c.toDataURL('image/jpeg', o.quality).split(',')[1];
        URL.revokeObjectURL(url);
        res(b64);
      }catch(e){ URL.revokeObjectURL(url); rej(new Error('That picture could not be prepared. Take it again.')); }
    };
    img.src = url;
  });
}
/* fills every <img data-blob="id"> that has not been filled yet */
function paintBlobs(root){
  (root || document).querySelectorAll('img[data-blob]:not([data-painted])').forEach(async el => {
    el.setAttribute('data-painted', '1');
    const b64 = await BLOBS.get(el.getAttribute('data-blob'));
    if(b64) el.src = 'data:image/jpeg;base64,' + b64;
  });
}

/* ============================================================
   SIGN IN
   ============================================================ */
function gate(){
  const signed = !!(DB.session && DB.session.token);
  $('#signin').style.display = signed ? 'none' : 'flex';
  if(!signed){
    $('#attend').classList.remove('on'); $('#app').hidden = true;
    return;
  }
  /* Attendance stands between sign-in and the rest of the app, for everyone. */
  if(!attExempt(user().role) && !DB.att[todayStr()]){ $('#app').hidden = true; openAttendance(); return; }
  $('#attend').classList.remove('on');
  $('#app').hidden = false;
  buildTabs(); go(canEdit() ? TAB : (TAB === 'inspect' ? 'home' : TAB)); updateDot();
  if(IOS && !STANDALONE && !DB.iosTipSeen) setTimeout(()=>$('#iosTip').classList.add('on'), 1400);
  autoSync();
}
$('#iosTip').addEventListener('click', e => {
  if(e.target.classList.contains('scrim') || e.target.id === 'iosTipClose'){
    $('#iosTip').classList.remove('on'); DB.iosTipSeen = true; save();
  }
});
$('#btnSignin').addEventListener('click', signIn);
$('#lPin').addEventListener('keydown', e => { if(e.key==='Enter') signIn(); });
async function signIn(){
  const url = (SERVER_URL || DB.url || '').trim();
  const phone = $('#lPhone').value.replace(/\D/g,'');
  const pin = $('#lPin').value;
  const m = $('#lMsg');
  if(!url){ m.className='msg'; m.textContent='This copy of the app has no district server set. Please reinstall from the address circulated by the DPO office.'; return; }
  if(phone.length!==10){ m.className='msg'; m.textContent='Enter your 10-digit mobile number.'; return; }
  if(!pin){ m.className='msg'; m.textContent='Enter your PIN.'; return; }
  const btn = $('#btnSignin'); btn.disabled=true; btn.innerHTML='<span class="spin"></span>Signing in';
  m.className='msg info'; m.textContent='';
  try{
    const r = await post({kind:'login', u:phone, p:pin}, url);
    if(r.ok){
      DB.url=url; DB.session={token:r.token, user:r.user}; saveNow();
      $('#lPin').value=''; m.textContent='';
      try{ const g = await get({op:'gps'}); if(g.ok){ DB.master=g.gps; saveNow(); } }catch(e){}
      gate(); toast('Signed in — ' + (r.user.name||''));
    } else { m.className='msg'; m.textContent = r.error || 'Sign-in failed.'; }
  }catch(e){ m.className='msg'; m.textContent='Cannot reach the server. Check the network and try again.'; }
  btn.disabled=false; btn.textContent='Sign in';
}

/* ============================================================
   ATTENDANCE — mandatory, once a day, before any other screen
   ============================================================ */
let ATT = null;     /* work in progress for today */
let attTries = 0;

/* the two steps, held as a template so the sanctioned-leave panel can take their place */
const ATT_STEPS = `
  <div class="step" id="stepGeo">
    <span class="n" id="geoN">1</span>
    <span class="t"><b>Location</b><span id="geoTxt">Starting&hellip;</span></span>
  </div>
  <div class="step" id="stepCam">
    <span class="n" id="camN">2</span>
    <span class="t"><b>Photograph</b><span id="camTxt">Take one photograph of yourself at the place of duty. The date, time and coordinates are printed onto the picture.</span></span>
  </div>`;
function openAttendance(){
  const u = user(); if(!u) return;
  ATT = {id:uid(), date:todayStr(), fix:null, photoId:null, b64:null, geoFailed:false};
  attTries = 0;
  $('#attDate').textContent = dayName(todayStr());
  $('#attWho').innerHTML = `${esc(u.name)} · ${esc(roleName(u.role))}${u.mandal?' · '+esc(u.mandal)+' mandal':''}`;
  $('#attMsg').textContent = ''; $('#attShot').hidden = true;
  $('#attend').classList.add('on');

  /* Sanctioned leave is not absence. Nobody is asked for a photograph and a
     location on a day the Collector has already granted them. */
  const lv = approvedLeaveToday();
  if(lv){
    $('#attSteps').innerHTML = `<div class="step done"><span class="n">${ICON.tick}</span>
      <span class="t"><b>On sanctioned leave today</b>
      <span>${esc(leaveName(lv.type))} · ${esc(lvSpan(lv))}${lv.decidedBy?' · ordered by '+esc(lv.decidedBy):''}</span></span></div>`;
    $('#attActions').innerHTML = `<button class="btn" id="attLeave">Record the day and continue</button>`;
    $('#attLeave').addEventListener('click', markLeaveDay);
    return;
  }
  $('#attSteps').innerHTML = ATT_STEPS;
  wireAttSteps();
  drawAttendance();
  startAttFix();

  /* the orders may have been passed since this phone last spoke to the district,
     so ask once — and if leave has been sanctioned, put the gate up again as leave */
  if(canApplyLeave(u.role) && navigator.onLine){
    refreshLeave().then(() => {
      if(approvedLeaveToday() && !DB.att[todayStr()] && $('#attend').classList.contains('on')) openAttendance();
    }).catch(()=>{});
  }
}
async function startAttFix(){
  const step = $('#stepGeo');
  step.className = 'step busy'; $('#geoN').textContent = '1';
  $('#geoTxt').textContent = 'Reading the location. Keep the phone still, in the open.';
  drawAttendance();
  try{
    ATT.fix = await getFixTwice(); ATT.geoFailed = false;
    step.className = 'step done'; $('#geoN').innerHTML = ICON.tick;
    $('#geoTxt').innerHTML = `<span class="num">${esc(fixText(ATT.fix))}</span>` +
      (ATT.fix.acc > 100 ? '<br>The fix is coarse. Step into the open and tap to read it again.' : '');
  }catch(e){
    attTries++;
    step.className = 'step'; $('#geoN').textContent = '1';
    $('#geoTxt').textContent = e.message + (attTries >= 2 ? ' Tap here to try once more.' : ' Tap here to try again.');
  }
  drawAttendance();
}
function wireAttSteps(){
  const g = $('#stepGeo'); if(g) g.addEventListener('click', () => { if(!ATT) return; startAttFix(); });
}

function drawAttendance(){
  const box = $('#attActions');
  const camStep = $('#stepCam'), fix = ATT && ATT.fix;
  const canShoot = !!fix || (attTries >= 2);
  camStep.className = 'step' + (ATT && ATT.b64 ? ' done' : (canShoot ? ' busy' : ''));
  $('#camN').innerHTML = (ATT && ATT.b64) ? ICON.tick : '2';
  if(ATT && ATT.b64){
    $('#camTxt').textContent = 'Taken at ' + stampTime(ATT.ts) + '.';
  } else if(canShoot && !fix){
    $('#camTxt').textContent = 'No location fix is available here. You may still mark attendance — it will be filed as unverified and the DPO office will see it as such.';
  } else if(canShoot){
    $('#camTxt').textContent = 'Take one photograph of yourself at the place of duty. The date, time and coordinates are printed onto the picture.';
  } else {
    $('#camTxt').textContent = 'Available once the location is read.';
  }
  if(!ATT || !ATT.b64){
    box.innerHTML = `<button class="btn" id="attShoot"${canShoot?'':' disabled'}>${ICON.cam2}Take photograph</button>`;
    const b = $('#attShoot'); if(b) b.addEventListener('click', () => $('#camAtt').click());
  } else {
    box.innerHTML = `<button class="btn" id="attMark">Mark attendance</button>
      <button class="btn quiet" id="attRetake">Take it again</button>`;
    $('#attRetake').addEventListener('click', () => { ATT.b64=null; ATT.photoId=null; $('#attShot').hidden=true; drawAttendance(); });
    $('#attMark').addEventListener('click', markAttendance);
  }
  if(attExempt((user()||{}).role)){
    box.insertAdjacentHTML('beforeend', `<button class="btn quiet" id="attSkip" style="margin-top:9px">Not now</button>`);
    $('#attSkip').addEventListener('click', () => { ATT = null; $('#attend').classList.remove('on'); $('#app').hidden = false; buildTabs(); go(TAB); });
  }
}
$('#camAtt').addEventListener('change', async ev => {
  const f = ev.target.files[0]; ev.target.value = ''; if(!f || !ATT) return;
  const u = user(); const ts = new Date().toISOString();
  $('#attMsg').className = 'msg info'; $('#attMsg').textContent = 'Preparing the photograph…';
  try{
    const b64 = await grabPhoto(f, {max:900, quality:0.62, lines:[
      'SJGP ATTENDANCE · JANGAON',
      (u.name || '') + ' · ' + roleName(u.role),
      stampTime(ts),
      ATT.fix ? `${ATT.fix.lat.toFixed(5)}, ${ATT.fix.lng.toFixed(5)}  \u00b1${Math.round(ATT.fix.acc)} m`
              : 'No location fix available'
    ]});
    ATT.b64 = b64; ATT.ts = ts;
    $('#attImg').src = 'data:image/jpeg;base64,' + b64;
    $('#attShot').hidden = false;
    $('#attMsg').textContent = '';
    drawAttendance();
    setTimeout(()=>{ const a=$('#attActions'); if(a) a.scrollIntoView({behavior:'smooth', block:'end'}); }, 120);
  }catch(e){ $('#attMsg').className='msg'; $('#attMsg').textContent = e.message; }
});
async function markAttendance(){
  if(!ATT || !ATT.b64) return;
  const btn = $('#attMark'); btn.disabled = true; btn.innerHTML = '<span class="spin"></span>Marking';
  const u = user(), key = todayStr();
  const pid = 'att_' + ATT.id;
  await BLOBS.put(pid, ATT.b64);
  DB.att[key] = {
    id: ATT.id, date: key, ts: ATT.ts || new Date().toISOString(),
    lat: ATT.fix ? ATT.fix.lat : null, lng: ATT.fix ? ATT.fix.lng : null,
    acc: ATT.fix ? ATT.fix.acc : null, verified: !!ATT.fix,
    photoId: pid, status: 'PRESENT', phone: u.phone, name: u.name, role: u.role, mandal: u.mandal || '',
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '', sync: 'local'
  };
  saveNow();
  ATT = null;
  gate();
  toast('Attendance marked for ' + dayName(key).split(',')[0]);
  syncAttendance().catch(()=>{});
}
$('#attSignOut').addEventListener('click', () => {
  confirmSheet('Sign out?', 'Records already on this phone stay where they are. You will sign in again with your number and PIN.', false, () => {
    DB.session = null; saveNow(); gate();
  });
});
async function syncAttendance(){
  const list = Object.values(DB.att).filter(a => a.sync !== 'synced');
  if(!list.length || !navigator.onLine) return 0;
  let done = 0;
  for(const a of list){
    try{
      const b64 = await BLOBS.get(a.photoId);
      const r = await post({kind:'attendance', token:DB.session.token, att:{
        id:a.id, date:a.date, ts:a.ts, lat:a.lat, lng:a.lng, acc:a.acc, verified:a.verified, tz:a.tz,
        status:a.status || 'PRESENT', leaveId:a.leaveId || '', leaveType:a.leaveType || ''
      }, photo: b64 ? {name:`ATT_${a.phone}_${a.date}.jpg`, b64} : null});
      if(r && r.ok){ a.sync='synced'; a.url=r.url||''; if(a.photoId) BLOBS.del(a.photoId); done++; saveNow(); }
    }catch(e){ break; }
  }
  return done;
}

/* ============================================================
   HOME
   ============================================================ */
const roleName = r => ({PS:'Panchayat Secretary', MPDO:'MPDO', MSO:'Mandal Special Officer', MPO:'MPO',
  DPO:'District Panchayat Officer', DLPO:'Divisional Panchayat Officer', COLLECTOR:'Collector & District Magistrate'}[r] || r);
function emptyState(t,p){ return `<div class="empty">${ICON.empty}<b>${esc(t)}</b><p>${esc(p)}</p></div>`; }
function showScreen(id){ $$('.screen').forEach(s=>s.classList.toggle('on', s.id==='s-'+id)); window.scrollTo(0,0); }

let lastPull = 0;
function renderHome(){
  const u=user(); if(!u) return;
  if(navigator.onLine && Date.now()-lastPull > 4*60*1000){
    lastPull = Date.now();
    const q = isViewer(u.role) ? {op:'list', full:'1'} : {op:'list', ym:ymNow()};
    get(q).then(r=>{
      if(r && r.ok){ DB.cache=r.rows; DB.cacheAt=new Date().toISOString(); save();
        if(TAB==='home') renderHome(); }
    }).catch(()=>{});
    if(!isViewer(u.role)) get({op:'attendance'}).then(r=>{ if(r&&r.ok){ DB.attToday=r.rows; if(TAB==='home') renderHome(); } }).catch(()=>{});
  }
  const h=new Date().getHours();
  const greet = (h<12?'Good morning':h<17?'Good afternoon':'Good evening');
  const first = String(u.name||'').replace(/,.*$/,'').split(' ').slice(0,2).join(' ');
  $('#homeHi').textContent = greet + (first ? ', ' + first : '');
  $('#homeSub').textContent = roleName(u.role) + (u.mandal ? ' · ' + u.mandal + ' mandal' : ' · Jangaon District');
  const ym=ymNow(), body=$('#homeBody');
  let h2 = attendanceStrip();

  if(!isViewer(u.role)){
    const pend=pendingCount();
    if(pend) h2 += banner('warn', ICON.cloud, `${pend} filed record${pend>1?'s are':' is'} waiting for signal. ${pend>1?'They go':'It goes'} to the district automatically — nothing more to do.`);
    const drafts = draftCount();
    if(drafts) h2 += banner('info', ICON.file, `${drafts} inspection${drafts>1?'s':''} not yet filed. A draft stays on this phone until you open it and press File.`);
    if(IOS && !STANDALONE && pend)
      h2 += banner('warn', ICON.warn, 'You are running in the browser, not the installed app. On iPhone, records held in a browser tab can be cleared by the phone. Add SJGP to the Home Screen, or sync today.');
    const stale = Object.values(DB.records).filter(r => r.sync!=='synced' && r.updatedAt &&
      (Date.now() - new Date(r.updatedAt).getTime()) > 5*24*3600*1000).length;
    if(stale) h2 += banner('bad', ICON.warn, `${stale} record${stale>1?'s have':' has'} been unsynced for more than five days. Unsynced work is held only on this phone.`);
  }

  h2 += isViewer(u.role) ? viewerHome(u, ym) : (u.role==='MPDO'||u.role==='MSO'||u.role==='MPO'||isDistrict(u.role) ? districtHome(u, ym) : districtHome(u, ym));

  body.innerHTML = h2;
  const b=$('#homeStart'); if(b) b.addEventListener('click', ()=>openPicker());
  body.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click',()=>openRecord(el.dataset.open, el.dataset.ym||ymNow())));
  body.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>openView(el.dataset.view)));
  body.querySelectorAll('[data-refresh]').forEach(el=>el.addEventListener('click', refreshDistrict));
  body.querySelectorAll('[data-attlist]').forEach(el=>el.addEventListener('click', showAttendanceList));
  body.querySelectorAll('[data-leave]').forEach(el=>el.addEventListener('click', openLeave));
}
function banner(kind, icon, text){
  return `<div class="banner ${kind}">${icon}<span>${esc(text)}</span></div>`;
}
function attendanceStrip(){
  const a = DB.att[todayStr()];
  if(!a) return '';
  const t = new Date(a.ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});
  const bits = ['Attendance marked at ' + t];
  if(a.verified) bits.push('location recorded'); else bits.push('no location fix — filed as unverified');
  if(a.sync !== 'synced') bits.push('on this phone');
  return `<div class="banner ${a.verified ? 'ok' : 'warn'}">${a.verified?ICON.tickC:ICON.warn}<span>${esc(bits.join(' · '))}</span></div>`;
}

/* ---- the Secretary's home: what was filed against this village ---- */
function viewerHome(u, ym){
  const gps = myGps();
  let h = banner('info', ICON.eye, 'You have view access. The evaluation is recorded by the Mandal Sanitation Task Force; what they file appears here.');
  h += `<div class="group"><div class="hdr">${esc(monthName(ym))}</div><div class="card">`;
  gps.forEach(gp => {
    const rows = viewerRows(gp), cur = rows.find(r => r.ym === ym);
    if(cur){
      h += `<div class="row tap" data-view="${esc(cur.id)}">
        <span class="grade g${esc(cur.grade)}" style="font-size:15px;padding:4px 11px;min-width:50px;text-align:center">${esc(cur.score)}</span>
        <span class="lbl"><b>${esc(gp)}</b><span>Grade ${esc(cur.grade)} · evaluated ${esc(niceDate(cur.date))}${cur.officer?' · '+esc(String(cur.officer).replace(/\s*\(\d+\)$/,'')):''}</span></span>
        <span class="chev"></span></div>`;
    } else {
      h += `<div class="row"><span class="ico" style="background:var(--ink-4)">${ICON.pin}</span>
        <span class="lbl"><b>${esc(gp)}</b><span>Not evaluated yet this month</span></span>
        <span class="pill p-mut">Awaited</span></div>`;
    }
  });
  h += `</div></div>`;

  /* what the Secretary has to put right */
  const defs = [];
  gps.forEach(gp => {
    const rows = viewerRows(gp);
    const last = rows[0];
    if(!last) return;
    const p = parsePayload(last);
    (p && p.defs ? p.defs : []).filter(d => String(d).trim()).forEach(d => defs.push([gp, d, last.ym]));
  });
  if(defs.length){
    h += `<div class="group"><div class="hdr">To be put right before the next visit</div><div class="card">` +
      defs.map(([gp,d,m]) => `<div class="row"><span class="ico" style="background:var(--gold)">${ICON.flag}</span>
        <span class="lbl"><b>${esc(d)}</b><span>${esc(gp)} · pointed out in ${esc(monthName(m))}</span></span></div>`).join('') +
      `</div></div>`;
  }
  const rfRows = gps.flatMap(gp => viewerRows(gp)).filter(r => r.ym===ym && String(r.rf||'').trim());
  if(rfRows.length){
    h += `<div class="group"><div class="hdr">Red flags recorded this month</div><div class="card">` +
      rfRows.map(r => `<div class="row"><span class="ico" style="background:var(--flag)">${ICON.flag}</span>
        <span class="lbl"><b>${esc(r.gp)}</b><span>Grade capped at D</span></span>
        <span>${String(r.rf).split(' ').filter(Boolean).map(n=>`<i class="rfchip">RF-${esc(n)}</i>`).join('')}</span></div>`).join('') +
      `</div></div>`;
  }
  h += `<div class="group"><button class="btn quiet" data-refresh="1">Refresh from district</button>
    <p style="font-size:12px;color:var(--ink-3);text-align:center;padding-top:9px">${DB.cacheAt?('Updated '+new Date(DB.cacheAt).toLocaleString('en-IN')):'Not loaded yet — tap Refresh'}</p></div>`;
  h += viewerTrend(gps[0]);
  return h;
}
function viewerRows(gp){
  return (DB.cache||[]).filter(r => r.gp === gp).sort((a,b) => String(b.ym).localeCompare(String(a.ym)));
}
function parsePayload(row){
  if(!row) return null;
  if(row._p) return row._p;
  try{ row._p = JSON.parse(row.payload || 'null'); }catch(e){ row._p = null; }
  return row._p;
}
function viewerTrend(gp){
  if(!gp) return '';
  const ms=[5,4,3,2,1,0].map(n=>prevYm(ymNow(),n));
  const byM={}; viewerRows(gp).forEach(r=>byM[r.ym]=+r.score||0);
  const vals=ms.map(m=> (m in byM) ? byM[m] : null);
  if(!vals.some(v=>v!==null)) return '';
  return `<div class="group"><div class="hdr">Six months</div><div class="card" style="padding:16px">
    <div class="trend">${vals.map((v,i)=>`<div class="col">
      <div class="bar" style="height:${v==null?3:Math.max(5,v/100*70)}px;background:${v==null?'var(--hair)':'var(--seal)'}"></div>
      <div style="font-size:10.5px;color:var(--ink-3)">${ms[i].split('-')[1]}</div>
      <div style="font-size:12.5px;font-weight:700" class="num">${v==null?'—':v}</div></div>`).join('')}</div></div></div>`;
}

/* ---- mandal and district home ---- */
function districtHome(u, ym){
  const rows=(DB.cache||[]).filter(r=>r.ym===ym);
  const scope = isDistrict(u.role) ? 'the district' : (u.mandal || 'your mandal');
  const grades={A:0,B:0,C:0,D:0}; rows.forEach(r=>grades[r.grade]=(grades[r.grade]||0)+1);
  const avg = rows.length ? Math.round(rows.reduce((s,r)=>s+(+r.score||0),0)/rows.length) : null;
  const rf = rows.filter(r=>String(r.rf||'').trim());
  const totalGps = (DB.master||[]).length;
  let h='';

  const startBtn = `<div class="group" style="margin-top:16px"><button class="btn${isDistrict(u.role)?' quiet':''}" id="homeStart">${ICON.plus}Start an inspection</button></div>`;
  if(isMandal(u.role)) h += startBtn;
  h += `<div class="kpis" style="margin-top:18px">
    <div class="kpi"><div class="n num">${rows.length}${totalGps?`<span style="font-size:16px;color:var(--ink-3)"> / ${totalGps}</span>`:''}</div><div class="l">Gram Panchayats reported<br>${esc(monthName(ym))}</div></div>
    <div class="kpi"><div class="n num" style="color:var(--gold-ink)">${avg==null?'—':avg}</div><div class="l">Average SJ-SCORE<br>across ${esc(scope)}</div></div>
    <div class="kpi"><div class="n num" style="color:var(--ok)">${grades.A||0}</div><div class="l">Grade A</div></div>
    <div class="kpi"><div class="n num" style="color:var(--flag)">${grades.D||0}</div><div class="l">Grade D, including red-flag caps</div></div></div>`;

  if(isDistrict(u.role) && rows.length){
    const byM={};
    rows.forEach(r=>{ const m=r.mandal||'Unassigned'; (byM[m]=byM[m]||[]).push(r); });
    h += `<div class="group"><div class="hdr">Mandal by mandal</div><div class="card">` +
      Object.keys(byM).sort().map(m=>{
        const list=byM[m];
        const a=Math.round(list.reduce((s,r)=>s+(+r.score||0),0)/list.length);
        const g={A:0,B:0,C:0,D:0}; list.forEach(r=>g[r.grade]=(g[r.grade]||0)+1);
        const gr=a>=85?'A':a>=70?'B':a>=55?'C':'D';
        return `<div class="row"><span class="lbl"><b>${esc(m)}</b>
          <span>${list.length} reported · A ${g.A||0} · B ${g.B||0} · C ${g.C||0} · D ${g.D||0}</span></span>
          <span class="grade g${gr} num" style="font-size:13px;padding:3px 10px">${a}</span></div>`;
      }).join('') + `</div></div>`;
  }
  if(rf.length){
    h += `<div class="group"><div class="hdr">Red flags this month</div><div class="card">` +
      rf.map(r=>`<div class="row"><span class="ico" style="background:var(--flag)">${ICON.flag}</span>
        <span class="lbl"><b>${esc(r.gp)}</b><span>${esc(r.mandal)}</span></span>
        <span>${String(r.rf).split(' ').filter(Boolean).map(n=>`<i class="rfchip">RF-${esc(n)}</i>`).join('')}</span></div>`).join('') +
      `</div></div>`;
  }
  if(rows.length){
    const sorted=[...rows].sort((a,b)=>(+b.score)-(+a.score));
    h += `<div class="group"><div class="hdr">Ranking</div><div class="card">` +
      sorted.slice(0,60).map((r,i)=>`<div class="row">
        <span style="width:24px;font-size:13px;color:var(--ink-3);font-weight:700" class="num">${i+1}</span>
        <span class="lbl"><b>${esc(r.gp)}</b><span>${esc(r.mandal)} · ${esc(String(r.officer||'').replace(/\s*\(\d+\)$/,''))}</span></span>
        <span class="grade g${esc(r.grade)}" style="font-size:13px;padding:3px 10px">${esc(r.score)}</span></div>`).join('') +
      `</div></div>`;
  } else {
    h += emptyState('Nothing reported yet this month',
      DB.cacheAt ? 'No inspection has been synced for ' + monthName(ym) + ' so far. Villages appear here the moment an officer presses Sync in the field.'
                 : 'Tap Refresh from district above to load. If it still shows nothing, no inspection has been synced yet this month.');
  }

  /* the operational rows sit under the district picture, not on top of it */
  const att = DB.attToday || null;
  if(att){
    const unver = att.filter(a => String(a.verified) === 'false' || a.verified === false).length;
    h += `<div class="group"><div class="hdr">Attendance today</div><div class="card">
      <div class="row tap" data-attlist="1"><span class="ico" style="background:var(--seal)">${ICON.user}</span>
        <span class="lbl"><b>${att.length} officer${att.length===1?'':'s'} marked present</b>
        <span>${unver?unver+' without a location fix · ':''}${esc(dayName(todayStr()))}</span></span>
        <span class="chev"></span></div></div></div>`;
  }

  if(canApproveLeave(u.role)){
    const pend = pendingLeave().length;
    h += `<div class="group"><div class="hdr">Leave</div><div class="card">
      <div class="row tap" data-leave="1"><span class="ico" style="background:${pend?'var(--warn)':'var(--ink-4)'}">${ICON.cal}</span>
        <span class="lbl"><b>${pend ? pend + (pend===1?' application waiting':' applications waiting') : 'No application waiting'}</b>
        <span>Sanctioned or refused by you alone</span></span><span class="chev"></span></div></div></div>`;
    h += `<div class="group"><div class="hdr">Monitoring</div><div class="card">
      <a class="row tap" href="dashboard.html" style="text-decoration:none;color:inherit">
        <span class="ico" style="background:var(--seal-deep)">${ICON.eye}</span>
        <span class="lbl"><b>District monitoring console</b>
        <span>Attendance, scores and leave, live on one screen. Yours alone.</span></span><span class="chev"></span></a>
    </div></div>`;
  }
  h += `<div class="group"><button class="btn quiet" data-refresh="1">Refresh from district</button>
        <p style="font-size:12px;color:var(--ink-3);text-align:center;padding-top:9px">${DB.cacheAt?('Updated '+new Date(DB.cacheAt).toLocaleString('en-IN')):'Not loaded yet — tap Refresh'}</p></div>`;

  if(isDistrict(u.role)) h += startBtn;
  return h;
}
function showAttendanceList(){
  const att = DB.attToday || [];
  showSheet(`<div style="padding:6px 20px 10px"><h2>Attendance today</h2>
    <p style="font-size:14px;color:var(--ink-2);margin-top:4px">${esc(dayName(todayStr()))}</p></div>
    <div class="group" style="margin-top:2px"><div class="card">` +
    (att.length ? att.map(a=>`<div class="row">
      <span class="ico" style="background:${(a.verified===false||String(a.verified)==='false')?'var(--warn)':'var(--ok)'}">${ICON.user}</span>
      <span class="lbl"><b>${esc(a.name)}</b><span>${esc(a.role)}${a.mandal?' · '+esc(a.mandal):''} · ${esc(String(a.markedAt||'').slice(11,16))}${(a.verified===false||String(a.verified)==='false')?' · no location fix':''}</span></span>
      ${a.photo?`<a href="${esc(a.photo)}" target="_blank" rel="noopener" class="pill p-info">Photo</a>`:''}</div>`).join('')
    : `<div class="row"><span class="lbl"><b>Nobody has marked attendance yet</b><span>Officers appear here as they mark in.</span></span></div>`) +
    `</div></div>`);
}
async function refreshDistrict(){
  toast('Loading from the district…');
  try{
    const u=user();
    const r = await get(isViewer(u.role) ? {op:'list', full:'1'} : {op:'list', ym:ymNow()});
    if(!r.ok){ toast(r.error||'Could not load'); return; }
    DB.cache=r.rows; DB.cacheAt=new Date().toISOString();
    if(!(DB.master||[]).length){ try{ const g=await get({op:'gps'}); if(g.ok) DB.master=g.gps; }catch(e){} }
    if(!isViewer(u.role)){ try{ const a=await get({op:'attendance'}); if(a.ok) DB.attToday=a.rows; }catch(e){} }
    lastPull = Date.now(); saveNow(); renderHome();
    toast(r.rows.length ? (r.rows.length + ' record' + (r.rows.length>1?'s':'') + ' loaded') : 'Nothing synced yet this month');
  }catch(e){ toast(e.message); }
}

/* ---------------- GP picker ---------------- */
function openPicker(){
  const u=user(); if(!canEdit()){ toast('You have view access only'); return; }
  const ym=ymNow();
  let list = (DB.master||[]).filter(g=>isDistrict(u.role)||g.mandal===u.mandal).map(g=>g.gp);
  if(!list.length) list = myGps();
  if(!list.length){ toast('No Gram Panchayat is loaded. Open More ▸ Refresh village list.'); return; }
  if(list.length===1){ openRecord(list[0], ym); return; }
  showSheet(`<div style="padding:6px 20px 10px"><h2>Choose a Gram Panchayat</h2>
    <p style="font-size:14px;color:var(--ink-2);margin-top:4px">${esc(monthName(ym))}</p></div>
    <div class="field" style="margin:0 20px;border-radius:12px;box-shadow:var(--shadow)">
      <label for="gpq">Search</label><input type="search" id="gpq" placeholder="Type a village name" autocomplete="off"></div>
    <div class="group" style="margin-top:12px"><div class="card" id="gpList">${pickRows(list, ym)}</div></div>`);
  const wire = () => $('#gpList').querySelectorAll('[data-pick]').forEach(el =>
    el.addEventListener('click', () => { hideSheet(); openRecord(el.dataset.pick, ym); }));
  wire();
  $('#gpq').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    $('#gpList').innerHTML = pickRows(list.filter(g => g.toLowerCase().includes(q)), ym);
    wire();
  });
}
function pickRows(list, ym){
  if(!list.length) return `<div class="row"><span class="lbl"><b>No village matches</b><span>Check the spelling, or refresh the village list from More.</span></span></div>`;
  return list.map(gp=>{ const r=DB.records[rid(gp,ym)];
    return `<div class="row tap" data-pick="${esc(gp)}"><span class="lbl"><b>${esc(gp)}</b>
      <span>${r?('Started · '+gpTotal(r)+'/100 so far'):'Not started'}</span></span><span class="chev"></span></div>`;}).join('');
}

/* ---------------- record ---------------- */
let CUR=null, VIEWROW=null;
function newRecord(gp, ym){
  const u=user();
  const g=(DB.master||[]).find(x=>x.gp===gp) || {mandal:u.mandal||'', gp};
  const prev=DB.records[rid(gp, prevYm(ym,1))];
  return {id:rid(gp,ym), ym, mandal:g.mandal||u.mandal||'', gp,
    date:todayStr(), tIn:'', tOut:'',
    present:{mso:false,dpo:false,mpdo:u.role==='MPDO'}, gpsFix:null,
    s:{}, ev:{}, evp:{}, rf:[], rfReported:false, rfNote:'',
    ps:{name:'', s:{}}, workers:[{name:'', s:{}}],
    bc:{name:'', dcb:{ca:0,cc:0,aa:0,ac:0,ua:0,uc:0}, s:{}},
    defs:['','',''], prevPointed: prev ? prev.defs.filter(d=>String(d).trim()).length : 0, prevRectified:0,
    photos:[], sync:'local', filed:false, filedAt:'', tries:0, nextTry:0,
    photoFolder:'', updatedAt:'', attId:(DB.att[todayStr()]||{}).id||''};
}
function openRecord(gp, ym){
  if(!canEdit()) return openView(rid(gp, ym));
  const id=rid(gp,ym);
  if(!DB.records[id]){ DB.records[id]=newRecord(gp,ym); saveNow(); }
  CUR=DB.records[id]; CUR.evp = CUR.evp || {}; CUR.ev = CUR.ev || {};
  VIEWROW=null;
  TAB='inspect'; buildTabs(); go('inspect');
}

/* ============================================================
   INSPECTION — the working screen
   ============================================================ */
function ringSVG(rec){
  const R=92, C=2*Math.PI*R, GAPD=2.2;
  let angle=0, out='';
  GP_RUBRIC.forEach(p=>{
    const seg=C*(p.max/100), gap=C*(GAPD/360);
    const got=pillarScore(rec,p)/p.max;
    out += `<circle cx="110" cy="110" r="${R}" fill="none" stroke="rgba(11,20,16,.08)" stroke-width="13"
            stroke-dasharray="${(seg-gap).toFixed(2)} ${(C-seg+gap).toFixed(2)}" stroke-dashoffset="${(-angle).toFixed(2)}" stroke-linecap="round"/>`;
    out += `<circle class="fill" data-arc="${p.p}" data-seg="${(seg-gap).toFixed(2)}" data-c="${C.toFixed(2)}"
            cx="110" cy="110" r="${R}" fill="none" stroke="${PC[p.p]}" stroke-width="13"
            stroke-dasharray="${Math.max(0,(seg-gap)*got).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-angle).toFixed(2)}" stroke-linecap="round"/>`;
    angle += seg;
  });
  return `<svg viewBox="0 0 220 220" aria-hidden="true">${out}</svg>`;
}
function renderRing(rec, readonly){
  const sc=gpTotal(rec), gr=gradeOf(sc,rec.rf);
  return `<div class="ringwrap">
    <div class="ring">${ringSVG(rec)}
      <div class="core">
        <div class="score num">${sc}</div><div class="of">OF 100</div>
        <div class="grade g${gr}">Grade ${gr}</div>
        <div class="capped"${rec.rf.length?'':' hidden'}>Capped at D by red flag</div>
      </div>
    </div>
    <p class="vh" aria-live="polite" id="scoreSay">Total ${sc} of 100, grade ${gr}</p>
    <div class="legend">${GP_RUBRIC.map(p=>`<button data-jump="${p.p}" aria-label="Pillar ${p.p}, ${esc(p.name)}"><i style="background:${PC[p.p]}"></i>${p.p}<b class="num">${pillarScore(rec,p)}/${p.max}</b></button>`).join('')}</div>
  </div>`;
}
function stripHTML(r){
  const sc=gpTotal(r), gr=gradeOf(sc,r.rf);
  const att = DB.att[todayStr()];
  const shots = r.photos.length, evn = countEvidence(r);
  const quorum = ['mso','dpo','mpdo'].filter(k=>r.present[k]).length;
  const qok = r.present.mpdo && quorum>=2;
  const cls = (ok,part) => ok ? 'ok' : (part ? 'part' : 'no');
  return `
    <span class="stat"><span class="num" style="font-size:14px;color:var(--ink)">${sc}</span><span class="g g${gr}">${gr}</span></span>
    <span class="stat ${att?'ok':'no'}"><i></i>Attendance</span>
    <span class="stat ${cls(!!r.gpsFix)}" data-goto="gpsRow"><i></i>Location</span>
    <span class="stat ${cls(qok, quorum>0)}" data-goto="quorumRow"><i></i>Quorum ${quorum}/3</span>
    <span class="stat ${cls(shots>=14, shots>0)}" data-goto="pil-PH"><i></i>Photos ${shots}/14</span>
    <span class="stat ${evn?'ok':'part'}"><i></i>Evidence ${evn}</span>
    ${r.rf.length?`<span class="stat no"><i></i>${r.rf.length} red flag${r.rf.length>1?'s':''}</span>`:''}`;
}
function countEvidence(r){
  let n=0;
  Object.keys(r.ev||{}).forEach(k=>{ if(String(r.ev[k]||'').trim()) n++; });
  Object.keys(r.evp||{}).forEach(k=>{ n += (r.evp[k]||[]).length; });
  return n;
}
const hasNote  = (r,id) => !!String((r.ev||{})[id]||'').trim();
const shotsOf  = (r,id) => ((r.evp||{})[id]||[]);

function renderInspect(){
  const body=$('#inspBody');
  if(!canEdit()){ go('home'); return; }
  if(!CUR){
    $('#inspTitle').textContent='Inspect'; $('#inspBack').innerHTML=''; $('#inspRight').innerHTML=''; $('#inspStrip').innerHTML='';
    body.innerHTML = `<div class="bigtitle"><h2>Inspect</h2><p>Record a monthly evaluation</p></div>` +
      emptyState('No inspection open','Choose a Gram Panchayat to begin. Everything you enter is saved on this phone as you go, with or without a network.') +
      `<div class="group"><button class="btn" id="ipStart">Choose a Gram Panchayat</button></div>`;
    $('#ipStart').addEventListener('click', openPicker);
    return;
  }
  const r=CUR, sc=gpTotal(r), gr=gradeOf(sc,r.rf);
  $('#inspTitle').textContent = r.gp;
  $('#inspBack').innerHTML = '<button id="ipClose">Close</button>';
  $('#inspRight').innerHTML = `<button id="ipFile">File</button>`;
  $('#inspStrip').innerHTML = stripHTML(r);

  let h = renderRing(r);

  h += `<div class="group"><div class="hdr">Visit</div><div class="card">
    <div class="field"><label for="fDate">Date of the visit</label><input id="fDate" type="date" data-f="date" value="${esc(r.date)}"></div>
    <div class="field split"><div><label for="fIn">Entered</label><input id="fIn" type="time" data-f="tIn" value="${esc(r.tIn)}"></div>
      <div><label for="fOut">Left</label><input id="fOut" type="time" data-f="tOut" value="${esc(r.tOut)}"></div></div>
    <div class="row tap" id="gpsRow"><span class="ico" style="background:${r.gpsFix?'var(--ok)':'var(--ink-4)'}">${ICON.pin}</span>
      <span class="lbl"><b>Location of the village</b><span id="gpsTxt" class="num">${esc(fixText(r.gpsFix))}</span></span>
      <span class="val">${r.gpsFix?'Redo':'Capture'}</span></div>
    <div class="row" id="quorumRow"><span class="lbl"><b>Members present</b><span id="quorum"></span></span></div>
    <div class="row" style="padding-top:0">
      <div class="seg" style="flex:1">
        <button data-p="mso" aria-pressed="${!!r.present.mso}">MSO</button>
        <button data-p="dpo" aria-pressed="${!!r.present.dpo}">DPO</button>
        <button data-p="mpdo" aria-pressed="${!!r.present.mpdo}">MPDO</button>
      </div></div>
  </div></div>`;

  h += `<div class="group" style="margin-bottom:-6px"><div class="hdr">Gram Panchayat scorecard · 100 marks</div></div>`;
  GP_RUBRIC.forEach(p=>{
    const got=pillarScore(r,p), pct=Math.round(got/p.max*100);
    h += `<details class="pillar" id="pil-${p.p}"><summary>
      <span class="tag" style="background:${PC[p.p]}">${p.p}</span>
      <span class="pname"><b>${esc(p.name)}</b><span>${esc(p.law)}</span></span>
      <span class="bar"><i style="width:${pct}%;background:${PC[p.p]}"></i></span>
      <span class="pscore" data-sub="${p.p}">${got}<em>/${p.max}</em></span></summary><div>`;
    p.items.forEach(([id,q,mx])=>{
      const auto=id==='G1';
      h += clauseHTML(r, id, q, mx, {auto, autoVal:auto?g1Auto(r):null, autoWhy:'From last month\u2019s deficiencies'});
    });
    if(p.p==='G'){
      h += `<div class="clause"><div class="gut"><span class="cno">G1</span></div><div class="bod">
        <p class="qtext">Deficiencies of last month, as counted for the G1 ratchet</p>
        <div style="display:flex;gap:12px;margin-top:10px">
          <div style="flex:1"><label style="display:block;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px" for="fPP">Pointed out</label>
            <input id="fPP" type="number" inputmode="numeric" min="0" max="9" data-f="prevPointed" value="${r.prevPointed}" style="width:100%;border:1.5px solid var(--hair);border-radius:11px;padding:10px 12px;font-size:17px"></div>
          <div style="flex:1"><label style="display:block;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px" for="fPR">Rectified</label>
            <input id="fPR" type="number" inputmode="numeric" min="0" max="9" data-f="prevRectified" value="${r.prevRectified}" style="width:100%;border:1.5px solid var(--hair);border-radius:11px;padding:10px 12px;font-size:17px"></div>
        </div></div></div>`;
    }
    h += `</div></details>`;
  });

  /* red flags */
  const rfn=r.rf.length;
  h += `<details class="pillar" id="pil-RF"><summary>
    <span class="tag" style="background:var(--flag)">${ICON.flag}</span>
    <span class="pname"><b>Red flags</b><span>Any one caps the grade at D</span></span>
    <span class="pscore" style="color:${rfn?'var(--flag)':'var(--ink-3)'}">${rfn||'None'}</span></summary><div>`;
  RF_LIST.forEach(([n,t,note])=>{
    const on=r.rf.includes(n);
    h += `<div class="rf ${on?'on':''}" data-rfrow="${n}"><span class="t"><b>RF-${n}</b><span>${esc(t)}${note?' · '+esc(note):''}</span></span>
      <span class="sw" role="switch" tabindex="0" aria-checked="${on}" aria-label="Red flag ${n}, ${esc(t)}" data-rf="${n}"></span></div>`;
  });
  h += `<div class="field"><label for="fRfNote">Responsibility fixed by name</label>
      <input id="fRfNote" type="text" data-f="rfNote" value="${esc(r.rfNote)}" placeholder="Name and designation"></div>
    <div class="rf"><span class="t"><b style="color:var(--ink)">Reported to the Collector within 24 hours</b></span>
      <span class="sw g" role="switch" tabindex="0" aria-checked="${!!r.rfReported}" aria-label="Reported to the Collector" data-fchk="rfReported"></span></div></div></details>`;

  /* Panchayat Secretary */
  h += `<details class="pillar"><summary><span class="tag" style="background:var(--pG)">PS</span>
    <span class="pname"><b>Panchayat Secretary</b><span>Section 43, clause by clause</span></span>
    <span class="pscore" id="psT">${psTotal(r)}<em>/100</em></span></summary><div>
    <div class="field"><label for="fPsName">Name</label><input id="fPsName" type="text" data-psname value="${esc(r.ps.name)}" placeholder="Name of the Secretary"></div>`;
  PS_RUBRIC.forEach(pt=>{
    h += `<div class="subhead">${esc(pt.part)} · ${pt.max}</div>`;
    pt.items.forEach(([id,q,mx,au])=> h += clauseHTML(r, id, q, mx,
      {auto:!!au, autoVal:au?psAuto(r,id):null, autoWhy:'Carried from the pillar above', store:'ps'}));
  });
  h += `</div></details>`;

  /* sanitation workers */
  h += `<details class="pillar" id="pil-WK"><summary><span class="tag" style="background:var(--pB)">W</span>
    <span class="pname"><b>Sanitation workers</b><span>One sheet per worker</span></span>
    <span class="pscore" id="wkT">${wkAvg(r)}<em>/100</em></span></summary><div id="wkBody">${workersHTML(r)}</div></details>`;

  /* bill collector */
  h += `<details class="pillar"><summary><span class="tag" style="background:${PC.C}">BC</span>
    <span class="pname"><b>Bill Collector</b><span>Driven by the DCB</span></span>
    <span class="pscore" id="bcT">${bcTotal(r)}<em>/100</em></span></summary><div>
    <div class="field"><label for="fBcName">Name</label><input id="fBcName" type="text" data-bcname value="${esc(r.bc.name)}" placeholder="Name of the Bill Collector"></div>
    <div class="subhead">DCB in rupees · target for ${fyMonths(r.ym)} month(s) of the year</div>`;
  [['ca','Current demand'],['cc','Current collected'],['aa','Arrear demand'],['ac','Arrear collected'],['ua','User-fee demand'],['uc','User-fee collected']]
    .forEach(([k,l])=> h += `<div class="field"><label for="dcb_${k}">${l}</label>
      <input id="dcb_${k}" type="number" inputmode="numeric" data-dcb="${k}" value="${r.bc.dcb[k]||''}" placeholder="0"></div>`);
  BC_RUBRIC.forEach(([id,q,mx,au])=> h += clauseHTML(r, id, q, mx,
    {auto:!!au, autoVal:au?bcAuto(r,id):null, autoWhy:'Computed from the DCB above', store:'bc'}));
  h += `</div></details>`;

  /* the fourteen points */
  h += `<details class="pillar" id="pil-PH" open><summary><span class="tag" style="background:var(--seal)">${ICON.cam}</span>
    <span class="pname"><b>The fourteen points</b><span>Each one geo-stamped where it stands</span></span>
    <span class="pscore">${r.photos.length}<em>/14</em></span></summary><div>
    <div class="photos" id="phGrid">${photosHTML(r)}</div>
    <p class="hint">Tap any empty square to photograph that point. The village, the coordinates and the time are printed onto every picture. Photographs leave the phone when the record syncs.</p>
  </div></details>`;

  h += `<div class="group"><div class="hdr">Deficiencies carried to next month</div><div class="card">
    ${r.defs.map((d,i)=>`<div class="field"><label for="def${i}">Deficiency ${i+1}</label>
      <input id="def${i}" type="text" data-def="${i}" value="${esc(d)}" placeholder="What must be put right before the next visit"></div>`).join('')}
  </div></div>
  <div class="group" style="margin-bottom:28px">
    <button class="btn" id="btnFile">${ICON.cloud}File this inspection</button>
    <button class="btn quiet" id="btnDone">Save and close</button>
  </div>`;

  body.innerHTML=h;
  paintBlobs(body);
  wireInspect();
}

/* ---- one clause: register margin, the mark, then its own evidence ---- */
function clauseHTML(r, id, q, mx, o){
  o = o || {};
  const store = o.store || 'gp';
  const val = o.auto ? o.autoVal : markOf(r, id, store);
  const dot = val==null ? '' : (val>=mx ? 'full' : (val<=0 ? 'nil' : 'part'));
  const note = hasNote(r,id), shots = shotsOf(r,id).length;
  const need = !o.auto && val!=null && val < mx && !note && !shots;
  let marks;
  if(o.auto){
    marks = `<div class="locked"><span class="v num">${val==null?0:val}</span>
      <span class="why">of ${mx} · ${esc(o.autoWhy||'computed for you')}</span></div>`;
  } else {
    let chips='';
    for(let i=0;i<=mx;i++){
      const sel = val===i;
      chips += `<button class="mk${i===0?' zero':''}${i===mx?' top':''}" role="radio" aria-checked="${sel}"
        data-mark="${i}" data-clause="${esc(id)}" data-store="${store}" aria-label="${i} of ${mx}">${i}</button>`;
    }
    marks = `<div class="marks" role="radiogroup" aria-label="Marks for ${esc(id)} out of ${mx}">${chips}<span class="ofmax">of ${mx}</span></div>`;
  }
  return `<div class="clause" data-item="${esc(id)}">
    <div class="gut"><span class="cno">${esc(id.replace(/^p/,'').toUpperCase())}</span><i class="dotm ${dot}" data-dot="${esc(id)}"></i></div>
    <div class="bod">
      <p class="qtext">${esc(q)}</p>
      ${marks}
      ${evrailHTML(r, id, note, shots, need)}
      <div class="evpanel" data-evpanel="${esc(id)}" hidden>
        <textarea data-evnote="${esc(id)}" placeholder="What was seen, which register, which page — in your own words">${esc((r.ev||{})[id]||'')}</textarea>
        <div class="evshots" data-evshots="${esc(id)}">${evShotsHTML(r,id)}</div>
        <div class="evfoot">
          <button class="btn sec sm" data-evcam="${esc(id)}">${ICON.cam2}Add photograph</button>
          <button class="btn quiet sm" data-evdone="${esc(id)}">Done</button>
        </div>
      </div>
    </div></div>`;
}
function evrailHTML(r, id, note, shots, need){
  const any = note || shots;
  const sum = any ? [note?'1 note':'', shots?(shots+' photo'+(shots>1?'s':'')):''].filter(Boolean).join(' · ')
                  : (need ? 'Evidence recommended — marks below the maximum' : '');
  return `<div class="evrail" data-evrail="${esc(id)}">
    <button class="evbtn ${any?'has':(need?'need':'')}" data-evopen="${esc(id)}">${ICON.note}${any?'Evidence':'Add evidence'}</button>
    <button class="evbtn ${shots?'has':''}" data-evshot="${esc(id)}">${ICON.cam2}${shots?('Photos · '+shots):'Add photo'}</button>
    <span class="evsum ${(!any&&need)?'need':''}">${esc(sum)}</span></div>`;
}
function evShotsHTML(r,id){
  const list = shotsOf(r,id);
  if(!list.length) return `<p style="font-size:12.5px;color:var(--ink-3);grid-column:1/-1">No photograph against this clause yet.</p>`;
  return list.map((p,i)=> p.sent
    ? `<div class="ph gone">${ICON.tickC}<span>Sent to the district</span></div>`
    : `<div class="ph"><img data-blob="${esc(p.id)}" alt="Evidence ${i+1} for ${esc(id)}">
    <button class="x" data-evdel="${esc(id)}" data-i="${i}" aria-label="Remove this photograph">&#10005;</button>
    <span class="cap">${p.lat?esc(p.lat.toFixed(3)+', '+p.lng.toFixed(3)):'no fix'}</span></div>`).join('');
}
function photosHTML(r){
  let h='';
  for(let i=0;i<14;i++){
    const p = r.photos.find(x=>x.idx===i);
    if(p && p.sent) h += `<div class="ph gone">${ICON.tickC}<span>${esc(PHOTO_POINTS[i])}</span></div>`;
    else if(p) h += `<div class="ph"><img data-blob="${esc(p.id)}" alt="${esc(PHOTO_POINTS[i])}">
      <button class="x" data-delp="${i}" aria-label="Remove the photograph of ${esc(PHOTO_POINTS[i])}">&#10005;</button>
      <span class="cap">${esc(PHOTO_POINTS[i])}</span></div>`;
    else h += `<button class="ph miss" data-shoot="${i}">${esc(PHOTO_POINTS[i])}</button>`;
  }
  return h;
}
function workersHTML(r){
  return r.workers.map((w,i)=>`<div>
    <div class="subhead" style="display:flex;align-items:center;gap:10px">
      <span style="flex:1">Worker ${i+1}${w.name.trim()?' · '+esc(w.name):''} · ${wkTotal(w)}/100</span>
      <button class="btn danger sm" data-delw="${i}" style="min-height:36px;font-size:13px">Remove</button></div>
    <div class="field"><label for="wn${i}">Name</label><input id="wn${i}" type="text" data-wname="${i}" value="${esc(w.name)}" placeholder="Name of the worker"></div>
    ${WK_RUBRIC.map(([id,q,mx])=> clauseHTML(r, i+':'+id, q, mx, {store:'wk'})).join('')}
    </div>`).join('') + `<div style="padding:14px 16px"><button class="btn sec" id="btnAddW">${ICON.plus}Add another worker</button></div>`;
}

/* ---- reading and writing one mark ---- */
function markOf(r, id, store){
  if(store==='ps') return r.ps.s[id]==null?null:r.ps.s[id];
  if(store==='bc') return r.bc.s[id]==null?null:r.bc.s[id];
  if(store==='wk'){ const [wi,k]=id.split(':'); const w=r.workers[wi]; return (w&&w.s[k]!=null)?w.s[k]:null; }
  return r.s[id]==null?null:r.s[id];
}
function setMarkAt(r, id, store, v){
  if(store==='ps') r.ps.s[id]=v;
  else if(store==='bc') r.bc.s[id]=v;
  else if(store==='wk'){ const [wi,k]=id.split(':'); if(r.workers[wi]) r.workers[wi].s[k]=v; }
  else r.s[id]=v;
}

/* ---- wiring ---- */
let PENDING = null;   /* which camera tap we are waiting on */
function wireInspect(){
  /* #inspBody and the nav buttons outlive every re-render, so their handlers
     are ASSIGNED, never added: a second render must replace the wiring, not
     stack a second copy of it. Stacked copies made every tap fire twice —
     set the mark, then toggle it straight back to nought. */
  const body=$('#inspBody');
  $('#ipClose').onclick = ()=>{ saveNow(); CUR=null; go('home'); };
  $('#ipFile').onclick = openFileSheet;
  $('#inspStrip').querySelectorAll('[data-goto]').forEach(el => el.addEventListener('click', () => {
    const t=document.getElementById(el.dataset.goto); if(!t) return;
    if(t.tagName==='DETAILS') t.open=true;
    t.scrollIntoView({behavior:'smooth', block:'center'});
  }));
  quorum();

  body.onclick = e=>{
    const r=CUR; if(!r) return;
    const mk=e.target.closest('[data-mark]');
    if(mk){
      const id=mk.dataset.clause, store=mk.dataset.store, v=+mk.dataset.mark;
      const cur=markOf(r,id,store);
      setMarkAt(r, id, store, cur===v ? 0 : v);
      const nv=markOf(r,id,store);
      const wrap=mk.closest('.marks');
      wrap.querySelectorAll('[data-mark]').forEach(b=>b.setAttribute('aria-checked', (+b.dataset.mark)===nv));
      const mx = wrap.querySelectorAll('[data-mark]').length-1;
      const dot=body.querySelector(`[data-dot="${id}"]`);
      if(dot) dot.className='dotm ' + (nv>=mx?'full':(nv<=0?'nil':'part'));
      refreshRail(r,id);
      live(); return;
    }
    const sw=e.target.closest('[data-rf]');
    if(sw){ toggleRf(sw); return; }
    const fc=e.target.closest('[data-fchk]');
    if(fc){ const on=fc.getAttribute('aria-checked')!=='true'; fc.setAttribute('aria-checked',on); r[fc.dataset.fchk]=on; touch(); return; }
    const seg=e.target.closest('[data-p]');
    if(seg){ const k=seg.dataset.p, on=seg.getAttribute('aria-pressed')!=='true';
      seg.setAttribute('aria-pressed',on); r.present[k]=on; quorum(); touch(); refreshStrip(); return; }
    const jump=e.target.closest('[data-jump]');
    if(jump){ const d=$('#pil-'+jump.dataset.jump); if(d){ d.open=true; d.scrollIntoView({behavior:'smooth',block:'start'}); } return; }

    /* evidence */
    const eo=e.target.closest('[data-evopen]');
    if(eo){ openEv(eo.dataset.evopen); return; }
    const es=e.target.closest('[data-evshot]');
    if(es){ openEv(es.dataset.evshot); shootEvidence(es.dataset.evshot); return; }
    const ec=e.target.closest('[data-evcam]');
    if(ec){ shootEvidence(ec.dataset.evcam); return; }
    const ed=e.target.closest('[data-evdone]');
    if(ed){ const p=body.querySelector(`[data-evpanel="${ed.dataset.evdone}"]`); if(p) p.hidden=true; return; }
    const edel=e.target.closest('[data-evdel]');
    if(edel){
      const id=edel.dataset.evdel, i=+edel.dataset.i, list=shotsOf(r,id);
      confirmSheet('Remove this photograph?', 'It is deleted from the phone and cannot be recovered.', true, ()=>{
        const gone=list.splice(i,1)[0]; if(gone) BLOBS.del(gone.id);
        saveNow(); redrawEv(id); refreshRail(r,id); refreshStrip();
      });
      return;
    }

    /* workers */
    const dw=e.target.closest('[data-delw]');
    if(dw){ const i=+dw.dataset.delw;
      confirmSheet('Remove this worker sheet?', 'The marks recorded against this worker are deleted.', true, ()=>{
        r.workers.splice(i,1); if(!r.workers.length) r.workers.push({name:'',s:{}}); saveNow(); renderInspect(); });
      return; }
    if(e.target.closest('#btnAddW')){ r.workers.push({name:'',s:{}}); saveNow(); renderInspect();
      setTimeout(()=>{ const d=$('#pil-WK'); if(d) d.open=true; }, 10); return; }

    /* photographs of the fourteen points */
    const sh=e.target.closest('[data-shoot]');
    if(sh){ PENDING={kind:'point', idx:+sh.dataset.shoot}; $('#camPoint').click(); return; }
    const dp=e.target.closest('[data-delp]');
    if(dp){ const idx=+dp.dataset.delp;
      confirmSheet('Remove this photograph?', PHOTO_POINTS[idx] + ' will have to be photographed again.', true, ()=>{
        const at=r.photos.findIndex(x=>x.idx===idx);
        if(at>=0){ const gone=r.photos.splice(at,1)[0]; if(gone) BLOBS.del(gone.id); }
        saveNow(); $('#phGrid').innerHTML=photosHTML(r); paintBlobs($('#phGrid')); refreshStrip();
      });
      return; }

    if(e.target.closest('#gpsRow')) return captureFix();
    if(e.target.closest('#btnDone')){ saveNow(); CUR=null; go('home'); toast('Saved on this phone'); return; }
    if(e.target.closest('#btnFile')){ openFileSheet(); return; }
  };

  body.onkeydown = e=>{
    if(!CUR) return;
    if((e.key===' '||e.key==='Enter') && e.target.matches('[data-rf],[data-fchk]')){
      e.preventDefault();
      if(e.target.hasAttribute('data-rf')) toggleRf(e.target);
      else { const on=e.target.getAttribute('aria-checked')!=='true'; e.target.setAttribute('aria-checked',on); CUR[e.target.dataset.fchk]=on; touch(); }
    }
  };

  body.oninput = e=>{
    const r=CUR; if(!r) return;
    const t=e.target;
    if(t.dataset.evnote!==undefined){ r.ev[t.dataset.evnote]=t.value; touch(); return; }
    if(t.dataset.f){ r[t.dataset.f] = t.type==='number' ? (+t.value||0) : t.value; live(); return; }
    if(t.hasAttribute('data-psname')){ r.ps.name=t.value; touch(); return; }
    if(t.hasAttribute('data-bcname')){ r.bc.name=t.value; touch(); return; }
    if(t.dataset.wname!==undefined && t.dataset.wname!==''){ r.workers[t.dataset.wname].name=t.value; touch(); return; }
    if(t.dataset.dcb){ r.bc.dcb[t.dataset.dcb]=+t.value||0; live(); return; }
    if(t.dataset.def!==undefined && t.dataset.def!==''){ r.defs[t.dataset.def]=t.value; touch(); return; }
  };
  body.onchange = e=>{ if(CUR && e.target.dataset.evnote!==undefined) refreshRail(CUR, e.target.dataset.evnote); };
}
function toggleRf(sw){
  const r=CUR, n=+sw.dataset.rf, on=sw.getAttribute('aria-checked')!=='true';
  sw.setAttribute('aria-checked', on);
  r.rf = on ? [...new Set([...r.rf,n])].sort((a,b)=>a-b) : r.rf.filter(x=>x!==n);
  const row=$('#inspBody').querySelector(`[data-rfrow="${n}"]`); if(row) row.classList.toggle('on', on);
  const head=$('#pil-RF'); if(head){ const s=head.querySelector('.pscore');
    s.textContent=r.rf.length||'None'; s.style.color=r.rf.length?'var(--flag)':'var(--ink-3)'; }
  live();
}
function openEv(id){
  const p=$('#inspBody').querySelector(`[data-evpanel="${id}"]`);
  if(!p) return;
  p.hidden=!p.hidden;
  if(!p.hidden){ paintBlobs(p); const ta=p.querySelector('textarea'); if(ta) setTimeout(()=>ta.focus(),60); }
}
function redrawEv(id){
  const box=$('#inspBody').querySelector(`[data-evshots="${id}"]`);
  if(box){ box.innerHTML=evShotsHTML(CUR,id); paintBlobs(box); }
}
function refreshRail(r,id){
  const rail=$('#inspBody').querySelector(`[data-evrail="${id}"]`);
  if(!rail) return;
  const mx = (function(){ const c=rail.closest('.clause'); const n=c?c.querySelectorAll('[data-mark]').length:0; return n?n-1:0; })();
  const store = (function(){ const b=rail.closest('.clause').querySelector('[data-mark]'); return b?b.dataset.store:'gp'; })();
  const val = markOf(r,id,store);
  const need = val!=null && mx>0 && val<mx && !hasNote(r,id) && !shotsOf(r,id).length;
  rail.outerHTML = evrailHTML(r, id, hasNote(r,id), shotsOf(r,id).length, need);
}
function shootEvidence(id){ PENDING={kind:'item', clause:id}; $('#camItem').click(); }

async function shoot(file, kind, meta){
  const r=CUR; if(!r) return;
  toast('Preparing the photograph…', 4000);
  let fix=null;
  try{ fix = await getFix({timeout:9000, maximumAge:45000}); }catch(e){ fix = r.gpsFix || null; }
  const ts=new Date().toISOString();
  const label = kind==='point' ? PHOTO_POINTS[meta.idx]
                               : (meta.clause.replace(/^\d+:/,'').replace(/^p/,'').toUpperCase() + ' — ' + (CLAUSE_TEXT[meta.clause.replace(/^\d+:/,'')]||'').slice(0,54));
  try{
    const b64 = await grabPhoto(file, {max:1050, quality:0.58, lines:[
      r.gp.toUpperCase() + ' · ' + (r.mandal||'').toUpperCase(),
      label,
      stampTime(ts) + (fix ? `  ·  ${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}` : '  ·  no location fix')
    ]});
    const pid = 'ph_' + uid();
    await BLOBS.put(pid, b64);
    const rec = {id:pid, ts, lat:fix?fix.lat:null, lng:fix?fix.lng:null, acc:fix?fix.acc:null};
    if(kind==='point'){
      const at=r.photos.findIndex(x=>x.idx===meta.idx);
      const row=Object.assign(rec, {idx:meta.idx, point:PHOTO_POINTS[meta.idx]});
      if(at>=0){ BLOBS.del(r.photos[at].id); r.photos[at]=row; } else r.photos.push(row);
      $('#phGrid').innerHTML=photosHTML(r); paintBlobs($('#phGrid'));
    } else {
      (r.evp[meta.clause] = r.evp[meta.clause] || []).push(Object.assign(rec, {clause:meta.clause}));
      redrawEv(meta.clause); refreshRail(r, meta.clause);
    }
    touch(); refreshStrip();
    toast('Photograph added' + (fix?'':' — without a location fix'));
  }catch(e){ toast(e.message); }
}
$('#camPoint').addEventListener('change', ev=>{ const f=ev.target.files[0]; ev.target.value='';
  if(f && PENDING && PENDING.kind==='point') shoot(f, 'point', PENDING); PENDING=null; });
$('#camItem').addEventListener('change', ev=>{ const f=ev.target.files[0]; ev.target.value='';
  if(f && PENDING && PENDING.kind==='item') shoot(f, 'item', PENDING); PENDING=null; });

function captureFix(){
  const t=$('#gpsTxt'); t.textContent='Reading the location…';
  getFixTwice().then(f=>{
    CUR.gpsFix=f; t.innerHTML=esc(fixText(f));
    const ico=$('#gpsRow .ico'); if(ico) ico.style.background='var(--ok)';
    touch(); refreshStrip(); toast('Location recorded');
  }).catch(e=>{ t.textContent=e.message; });
}
function quorum(){
  const r=CUR, el=$('#quorum'); if(!r||!el) return;
  const n=['mso','dpo','mpdo'].filter(k=>r.present[k]).length;
  el.textContent = !r.present.mpdo ? 'The MPDO must be present at every inspection'
    : (n<2 ? 'At least two members are needed for a valid evaluation' : 'Valid — ' + n + ' members present');
  el.style.color = (!r.present.mpdo || n<2) ? 'var(--flag)' : 'var(--ok)';
}
function touch(){ const r=CUR; if(!r) return; r.updatedAt=new Date().toISOString(); if(r.sync==='synced') r.sync='local'; updateDot(); save(); }
function refreshStrip(){ if(CUR) $('#inspStrip').innerHTML=stripHTML(CUR);
  $('#inspStrip').querySelectorAll('[data-goto]').forEach(el=>el.addEventListener('click',()=>{
    const t=document.getElementById(el.dataset.goto); if(!t) return;
    if(t.tagName==='DETAILS') t.open=true; t.scrollIntoView({behavior:'smooth',block:'center'}); })); }
function live(){
  const r=CUR; if(!r) return;
  GP_RUBRIC.forEach(p=>{
    const got=pillarScore(r,p);
    const el=document.querySelector(`[data-sub="${p.p}"]`); if(el) el.innerHTML=`${got}<em>/${p.max}</em>`;
    const bar=document.querySelector(`#pil-${p.p} .bar i`); if(bar) bar.style.width=Math.round(got/p.max*100)+'%';
  });
  const g1=document.querySelector('[data-item="G1"] .locked .v'); if(g1) g1.textContent=g1Auto(r);
  ['pA4','pA5','pD1'].forEach(id=>{ const el=document.querySelector(`[data-item="${id}"] .locked .v`); if(el) el.textContent=psAuto(r,id); });
  ['b1','b2'].forEach(id=>{ const el=document.querySelector(`[data-item="${id}"] .locked .v`); if(el) el.textContent=bcAuto(r,id); });
  const ps=$('#psT'); if(ps) ps.innerHTML=`${psTotal(r)}<em>/100</em>`;
  const bc=$('#bcT'); if(bc) bc.innerHTML=`${bcTotal(r)}<em>/100</em>`;
  const wk=$('#wkT'); if(wk) wk.innerHTML=`${wkAvg(r)}<em>/100</em>`;
  const sc=gpTotal(r), gr=gradeOf(sc,r.rf);
  document.querySelectorAll('.ring circle.fill').forEach(c=>{
    const p=GP_RUBRIC.find(x=>x.p===c.dataset.arc); if(!p) return;
    c.setAttribute('stroke-dasharray', `${Math.max(0,(+c.dataset.seg)*(pillarScore(r,p)/p.max)).toFixed(2)} ${c.dataset.c}`);
  });
  const core=document.querySelector('.ring .core');
  if(core){ core.querySelector('.score').textContent=sc;
    const g=core.querySelector('.grade'); g.textContent='Grade '+gr; g.className='grade g'+gr;
    const cap=core.querySelector('.capped'); if(cap) cap.hidden = !r.rf.length; }
  document.querySelectorAll('.legend button').forEach(btn=>{
    const p=GP_RUBRIC.find(x=>x.p===btn.dataset.jump); if(p) btn.querySelector('b').textContent=`${pillarScore(r,p)}/${p.max}`;
  });
  const say=$('#scoreSay'); if(say) say.textContent = `Total ${sc} of 100, grade ${gr}`;
  refreshStrip(); touch();
}

/* ---- readiness, then filing ---- */
function readiness(r){
  const blockers=[], advice=[];
  if(!attExempt(user().role) && !DB.att[todayStr()])
    blockers.push(['Attendance for today', 'Mark attendance before filing.']);
  if(!r.gpsFix) blockers.push(['Location of the village', 'Open Visit and tap Capture.']);
  const n=['mso','dpo','mpdo'].filter(k=>r.present[k]).length;
  if(!r.present.mpdo) blockers.push(['MPDO present', 'The MPDO must be present at every inspection.']);
  else if(n<2) blockers.push(['Two members present', 'One more member of the Task Force is needed.']);
  const shots=r.photos.length;
  if(shots<14) blockers.push([`All fourteen points photographed`, `${14-shots} still to take.`]);
  if(r.rf.length){
    if(!String(r.rfNote||'').trim()) blockers.push(['Responsibility fixed by name', 'A red flag is ticked; name the officer responsible.']);
    if(!r.rfReported) blockers.push(['Reported to the Collector', 'Red flags must be reported within 24 hours.']);
  }
  let bare=0;
  GP_RUBRIC.forEach(p=>p.items.forEach(([id,,mx])=>{
    if(id==='G1') return;
    const v=r.s[id];
    if(v!=null && v<mx && !hasNote(r,id) && !shotsOf(r,id).length) bare++;
  }));
  if(bare) advice.push([`${bare} clause${bare>1?'s carry':' carries'} marks below the maximum with no evidence`,
    'A note or a photograph against each makes the mark hold up on appeal.']);
  if(!r.defs.filter(d=>String(d).trim()).length) advice.push(['No deficiency carried forward', 'Next month\u2019s G1 ratchet is computed from these.']);
  if(!String(r.ps.name||'').trim()) advice.push(['Secretary not named', 'Open the Panchayat Secretary section.']);
  if(!r.tIn || !r.tOut) advice.push(['Times of entry and exit blank', 'Open Visit and fill both.']);
  return {blockers, advice};
}
function openFileSheet(){
  const r=CUR; if(!r) return;
  const {blockers, advice}=readiness(r);
  const sc=gpTotal(r), gr=gradeOf(sc,r.rf);
  showSheet(`<div style="padding:6px 20px 6px"><h2>File ${esc(r.gp)}</h2>
    <p style="font-size:14px;color:var(--ink-2);margin-top:5px">${esc(monthName(r.ym))} · ${sc}/100 · Grade ${gr}${r.rf.length?' · capped by red flag':''}</p></div>
    ${blockers.length ? `<div class="group" style="margin-top:10px"><div class="hdr">Still needed</div><div class="card checklist">` +
      blockers.map(([t,s])=>`<div class="chk n"><span class="m">!</span><span class="tx">${esc(t)}<span>${esc(s)}</span></span></div>`).join('') +
      `</div></div>` : `<div class="banner ok" style="margin-top:12px">${ICON.tickC}<span>Everything required is in place.</span></div>`}
    ${advice.length ? `<div class="group"><div class="hdr">Worth doing before you file</div><div class="card checklist">` +
      advice.map(([t,s])=>`<div class="chk"><span class="m" style="background:var(--gold);color:#20160A">i</span><span class="tx">${esc(t)}<span>${esc(s)}</span></span></div>`).join('') +
      `</div></div>` : ''}
    <div class="group" style="margin-bottom:8px">
      <button class="btn" id="fileGo"${blockers.length?' disabled':''}>${ICON.cloud}File and sync now</button>
      <button class="btn quiet" id="fileLater">Keep working</button>
    </div>
    <p style="font-size:12.5px;color:var(--ink-3);padding:0 20px 6px;line-height:1.5">Filing sends the marks, the evidence and every photograph to the district. Without signal it stays on this phone and goes out at the next sync.</p>`);
  $('#fileLater').addEventListener('click', hideSheet);
  const g=$('#fileGo'); if(g) g.addEventListener('click', ()=>{
    r.filed = true; r.filedAt = new Date().toISOString(); r.tries = 0; r.nextTry = 0; saveNow();
    hideSheet(); syncOne(r);
  });
}

/* ============================================================
   READ-ONLY VIEW — what the Panchayat Secretary sees
   ============================================================ */
function openView(id){
  const row=(DB.cache||[]).find(r=>String(r.id)===String(id));
  if(!row){ toast('That record is not loaded. Tap Refresh from district.'); return; }
  VIEWROW=row; CUR=null; renderView(); showScreen('inspect');
}
function renderView(){
  const row=VIEWROW; if(!row) return;
  const p=parsePayload(row);
  const rec = p || {s:{}, ev:{}, evp:{}, rf:[], ps:{name:'',s:{}}, bc:{name:'',dcb:{},s:{}}, workers:[], defs:[], prevPointed:0, prevRectified:0, photos:[], ym:row.ym};
  rec.s=rec.s||{}; rec.ev=rec.ev||{}; rec.evp=rec.evp||{}; rec.rf=rec.rf||[]; rec.photos=rec.photos||[];
  rec.ps=rec.ps||{name:'',s:{}}; rec.bc=rec.bc||{name:'',dcb:{},s:{}}; rec.workers=rec.workers||[]; rec.defs=rec.defs||[];

  $('#inspTitle').textContent=row.gp;
  $('#inspBack').innerHTML='<button id="ipClose">Back</button>';
  $('#inspRight').innerHTML='';
  $('#inspStrip').innerHTML='';

  const sc=+row.score||gpTotal(rec), gr=row.grade||gradeOf(sc,rec.rf);
  let h = renderRing(rec, true);
  h += `<div class="banner info" style="margin-top:14px">${ICON.eye}<span>Filed by ${esc(String(row.officer||'the Task Force').replace(/\s*\(\d+\)$/,''))} on ${esc(niceDate(row.date))}. This is a read-only copy.</span></div>`;

  h += `<div class="group"><div class="hdr">The record</div><div class="card">
    <div class="row"><span class="lbl"><b>Month</b></span><span class="val">${esc(monthName(row.ym))}</span></div>
    <div class="row"><span class="lbl"><b>Mandal</b></span><span class="val">${esc(row.mandal||'')}</span></div>
    <div class="row"><span class="lbl"><b>Total</b></span><span class="val"><span class="grade g${esc(gr)}" style="padding:3px 11px">${sc} · Grade ${esc(gr)}</span></span></div>
    <div class="row"><span class="lbl"><b>Secretary&rsquo;s own score</b><span>Section 43, out of 100</span></span><span class="val num">${psTotal(rec)}</span></div>
    <div class="row"><span class="lbl"><b>Photographs</b></span><span class="val num">${(rec.photos||[]).length} of 14</span></div>
    ${row.photoFolder?`<a class="row tap" href="${esc(row.photoFolder)}" target="_blank" rel="noopener"><span class="ico" style="background:var(--pB)">${ICON.cam}</span><span class="lbl"><b>Open the photograph folder</b><span>Opens Google Drive</span></span><span class="chev"></span></a>`:''}
  </div></div>`;

  if(rec.rf.length){
    h += `<div class="group"><div class="hdr">Red flags — grade capped at D</div><div class="card">` +
      rec.rf.map(n=>{ const f=RF_LIST.find(x=>x[0]===n)||[n,'',''];
        return `<div class="rf on"><span class="t"><b>RF-${n}</b><span>${esc(f[1])}</span></span></div>`; }).join('') +
      (rec.rfNote?`<div class="row"><span class="lbl"><b>Responsibility fixed on</b><span>${esc(rec.rfNote)}</span></span></div>`:'') +
      `</div></div>`;
  }
  const defs=(rec.defs||[]).filter(d=>String(d).trim());
  if(defs.length){
    h += `<div class="group"><div class="hdr">To be put right before the next visit</div><div class="card">` +
      defs.map(d=>`<div class="row"><span class="ico" style="background:var(--gold)">${ICON.flag}</span><span class="lbl"><b>${esc(d)}</b></span></div>`).join('') +
      `</div></div>`;
  }

  h += `<div class="group" style="margin-bottom:-6px"><div class="hdr">Clause by clause</div></div>`;
  GP_RUBRIC.forEach(pl=>{
    const got=pillarScore(rec,pl);
    h += `<details class="pillar"><summary>
      <span class="tag" style="background:${PC[pl.p]}">${pl.p}</span>
      <span class="pname"><b>${esc(pl.name)}</b><span>${esc(pl.law)}</span></span>
      <span class="bar"><i style="width:${Math.round(got/pl.max*100)}%;background:${PC[pl.p]}"></i></span>
      <span class="pscore">${got}<em>/${pl.max}</em></span></summary><div>` +
      pl.items.map(([id,q,mx])=>readClause(rec,id,q,mx,id==='G1'?g1Auto(rec):rec.s[id])).join('') +
      `</div></details>`;
  });
  h += `<details class="pillar"><summary><span class="tag" style="background:var(--pG)">PS</span>
    <span class="pname"><b>Your own assessment</b><span>Section 43, clause by clause</span></span>
    <span class="pscore">${psTotal(rec)}<em>/100</em></span></summary><div>` +
    PS_RUBRIC.map(pt=>`<div class="subhead">${esc(pt.part)} · ${pt.max}</div>` +
      pt.items.map(([id,q,mx,au])=>readClause(rec,id,q,mx,au?psAuto(rec,id):(rec.ps.s||{})[id])).join('')).join('') +
    `</div></details>`;
  h += `<div style="height:30px"></div>`;

  $('#inspBody').innerHTML=h;
  $('#ipClose').addEventListener('click', ()=>{ VIEWROW=null; go(TAB==='inspect'?'home':TAB); });
  $('#inspBody').querySelectorAll('[data-jump]').forEach(el=>el.addEventListener('click',()=>{
    const d=$('#inspBody').querySelectorAll('details')[GP_RUBRIC.findIndex(x=>x.p===el.dataset.jump)];
    if(d){ d.open=true; d.scrollIntoView({behavior:'smooth',block:'start'}); }}));
}
function readClause(rec,id,q,mx,val){
  const v = val==null?0:val;
  const note=String((rec.ev||{})[id]||'').trim(), shots=((rec.evp||{})[id]||[]).length;
  const dot = v>=mx?'full':(v<=0?'nil':'part');
  return `<div class="clause"><div class="gut"><span class="cno">${esc(id.replace(/^p/,'').toUpperCase())}</span><i class="dotm ${dot}"></i></div>
    <div class="bod"><p class="qtext">${esc(q)}</p>
      <div class="readmark"><b class="num">${v}</b><span>of ${mx}</span></div>
      ${note?`<p style="font-size:13px;color:var(--ink-2);margin-top:9px;line-height:1.45;padding-left:11px;border-left:2.5px solid var(--seal-line)">${esc(note)}</p>`:''}
      ${shots?`<p style="font-size:12px;color:var(--ink-3);margin-top:7px;font-weight:600">${shots} photograph${shots>1?'s':''} filed against this clause</p>`:''}
    </div></div>`;
}

/* ============================================================
   RECORDS AND SYNC
   ============================================================ */
function renderRecords(){
  const u=user(); const b=$('#recBody');
  if(isViewer(u.role)){
    const rows=(DB.cache||[]).sort((a,b2)=>String(b2.ym).localeCompare(String(a.ym))||String(a.gp).localeCompare(String(b2.gp)));
    $('#recSub').textContent = rows.length ? `${rows.length} evaluation${rows.length>1?'s':''} on file` : 'Nothing on file yet';
    $('#recSync').innerHTML = '<button id="btnPull">Refresh</button>';
    $('#btnPull').addEventListener('click', refreshDistrict);
    if(!rows.length){ b.innerHTML=emptyState('Nothing on file yet','Evaluations filed by the Mandal Sanitation Task Force appear here. Tap Refresh when you have signal.'); return; }
    b.innerHTML = `<div class="group"><div class="card">` + rows.map(r=>`
      <div class="row tap" data-view="${esc(r.id)}">
        <span class="grade g${esc(r.grade)}" style="font-size:14px;padding:4px 11px;min-width:48px;text-align:center">${esc(r.score)}</span>
        <span class="lbl"><b>${esc(r.gp)}</b><span>${esc(monthName(r.ym))}${r.rf?' · red flag':''}</span></span>
        <span class="chev"></span></div>`).join('') + `</div></div><div style="height:24px"></div>`;
    b.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>openView(el.dataset.view)));
    return;
  }
  const rows=Object.values(DB.records).sort((a,b2)=> b2.ym.localeCompare(a.ym) || a.gp.localeCompare(b2.gp));
  const pend=pendingCount(), pa=pendingAtt();
  $('#recSub').textContent = rows.length
    ? `${rows.length} on this phone${pend?' · '+pend+' waiting for signal':''}${draftCount()?' · '+draftCount()+' draft'+(draftCount()>1?'s':''):''}`
    : 'Nothing recorded yet';
  $('#recSync').innerHTML = (pend||pa) ? '<button id="btnSyncAll">Sync all</button>' : '';
  if(!rows.length){ b.innerHTML=emptyState('No records yet','Inspections you record appear here, and stay on this phone until you sync them.'); return; }
  b.innerHTML = `<div class="group"><div class="card">` + rows.map(r=>{
    const sc=gpTotal(r), gr=gradeOf(sc,r.rf);
    const un=r.photos.filter(p=>!p.sent).length + Object.values(r.evp||{}).flat().filter(p=>!p.sent).length;
    const badge = (r.sync==='synced' && !photoQueue(r).length) ? '<span class="pill p-ok">Filed</span>'
                : r.filed ? '<span class="pill p-warn">Waiting for signal</span>'
                : '<span class="pill p-mut">Draft</span>';
    return `<div class="row tap" data-open="${esc(r.gp)}" data-ym="${r.ym}">
      <span class="grade g${gr}" style="font-size:14px;padding:4px 11px;min-width:48px;text-align:center">${sc}</span>
      <span class="lbl"><b>${esc(r.gp)}</b><span>${esc(monthName(r.ym))} · ${esc(r.mandal)}${un?' · '+un+' photo'+(un>1?'s':'')+' to send':''}</span></span>
      ${badge}<span class="chev"></span></div>`;
  }).join('') + `</div></div>
  <p class="hint" style="padding:16px 20px 28px">Photographs leave the phone once a record is filed, which frees storage. File the same day wherever there is signal.</p>`;
  b.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click',()=>openRecord(el.dataset.open, el.dataset.ym)));
  const sa=$('#btnSyncAll'); if(sa) sa.addEventListener('click', syncAll);
}
function updateDot(){ const d=$('#pendDot'); if(d) d.hidden = !(pendingCount()+pendingAtt()); }

const safe = s => String(s||'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,28);
function photoQueue(r){
  const out=[];
  r.photos.filter(p=>!p.sent).forEach(p=>out.push({ref:p, kind:'point',
    name:`${safe(r.gp)}_${r.ym}_P${pad2((p.idx||0)+1)}_${safe(p.point)}.jpg`}));
  Object.keys(r.evp||{}).forEach(cl => (r.evp[cl]||[]).filter(p=>!p.sent).forEach((p,i)=>out.push({ref:p, kind:'evidence',
    name:`${safe(r.gp)}_${r.ym}_${safe(cl.replace(':','_'))}_${i+1}.jpg`})));
  return out;
}
async function pushRecord(r, onStep){
  if(!canEdit()) return 'View access only — inspections are filed by the Task Force.';
  const sc=gpTotal(r);
  const payload={...r};
  const summary={id:r.id, ym:r.ym, mandal:r.mandal, gp:r.gp, date:r.date, score:sc, grade:gradeOf(sc,r.rf),
    rf:r.rf.join(' '), psScore:psTotal(r), wkAvg:wkAvg(r), bcScore:bcTotal(r), status:'submitted',
    lat:r.gpsFix?r.gpsFix.lat:'', lng:r.gpsFix?r.gpsFix.lng:'', album:'',
    evidence:countEvidence(r), attId:r.attId||'',
    photoCount:r.photos.length, photoFolder:r.photoFolder, payload:JSON.stringify(payload)};

  if(onStep) onStep('Sending the marks…');
  const head=await post({kind:'inspection', token:DB.session.token, record:summary});
  if(!head || !head.ok) return (head && head.error) || 'The server refused the record.';
  r.sync='synced'; r.photoFolder=head.photoFolder||r.photoFolder; saveNow();

  const q=photoQueue(r);
  for(let i=0;i<q.length;i+=3){
    const batch=q.slice(i,i+3);
    const withData=[];
    for(const item of batch){
      const b64=await BLOBS.get(item.ref.id);
      if(b64) withData.push({name:item.name, b64, kind:item.kind}); else item.ref.sent=true;
    }
    if(!withData.length) continue;
    if(onStep) onStep(`Sending photographs ${Math.min(i+withData.length,q.length)} of ${q.length}…`);
    const res=await post({kind:'photos', token:DB.session.token,
      id:r.id, ym:r.ym, mandal:r.mandal, gp:r.gp, photos:withData});
    if(!res || !res.ok) return (res && res.error) || 'Photographs could not be sent. The marks are safely filed; try again for the pictures.';
    batch.forEach(item=>{ item.ref.sent=true; BLOBS.del(item.ref.id); });
    if(res.photoFolder) r.photoFolder=res.photoFolder;
    saveNow();
  }
  updateDot();
  return true;
}
let SYNCING=false;
async function syncOne(r){
  if(SYNCING) return; SYNCING=true;
  toast('Filing ' + r.gp + '…', 8000);
  try{
    await syncAttendance();
    const ok=await pushRecord(r, m=>toast(m, 8000));
    if(ok===true){ toast(r.gp + ' filed with the district'); if(CUR) refreshStrip(); renderRecords(); }
    else { holdBack(r); toast(ok, 5000); }
  }catch(e){ holdBack(r); toast(e.message||'Filing failed — it stays on this phone and goes out by itself when there is signal', 5000); }
  SYNCING=false; updateDot();
}
async function syncAll(){
  if(SYNCING) return; SYNCING=true;
  try{
    const a=await syncAttendance();
    const pend=outbox();
    if(!pend.length){ toast(a?'Attendance sent':'Nothing to sync'); SYNCING=false; return; }
    let ok=0;
    for(const r of pend){
      try{
        const res=await pushRecord(r, m=>toast(`${r.gp} — ${m}`, 8000));
        if(res===true) ok++; else { toast('Stopped at ' + r.gp + ' — ' + res, 5000); break; }
      }catch(e){ toast('Stopped at ' + r.gp + ' — ' + (e.message||'network'), 5000); break; }
    }
    renderRecords(); updateDot();
    if(ok) toast(`${ok} record${ok>1?'s':''} sent to the district`);
  } finally { SYNCING=false; }
}
async function autoSync(){
  if(!navigator.onLine || !DB.session || SYNCING) return;
  SYNCING = true;
  try{
    try{ await syncAttendance(); }catch(e){}
    try{ await syncLeave(); }catch(e){}
    try{ if(leaveVisible((user()||{}).role)) await refreshLeave(); }catch(e){}

    /* filed records go out on their own, quietly, oldest first */
    if(canEdit()){
      const due = dueNow().sort((a,b) => String(a.filedAt||'').localeCompare(String(b.filedAt||'')));
      let sent = 0, lastName = '';
      for(const r of due){
        try{
          const res = await pushRecord(r);
          if(res === true){ r.tries = 0; r.nextTry = 0; sent++; lastName = r.gp; saveNow(); }
          else { holdBack(r); break; }                 // the district said no — stop, do not hammer
        }catch(e){ holdBack(r); break; }               // no signal — stop and wait
      }
      if(sent){
        if($('#s-records').classList.contains('on')) renderRecords();
        if($('#s-home').classList.contains('on')) renderHome();
        if(CUR) refreshStrip();
        if(document.visibilityState === 'visible')
          toast(sent === 1 ? lastName + ' sent to the district' : sent + ' records sent to the district');
      }
    }
  } finally { SYNCING = false; updateDot(); }
}
function holdBack(r){
  r.tries = (r.tries || 0) + 1;
  r.nextTry = Date.now() + BACKOFF[Math.min(r.tries - 1, BACKOFF.length - 1)];
  saveNow();
}

/* ============================================================
   MORE
   ============================================================ */
async function renderMore(){
  const u=user(); if(!u) return;
  $('#moreSub').textContent = u.name;
  const a=DB.att[todayStr()];
  const marked=Object.keys(DB.att).length;
  $('#moreBody').innerHTML = `
  <div class="group"><div class="hdr">Account</div><div class="card">
    <div class="row"><span class="ico" style="background:var(--seal)">${ICON.user}</span>
      <span class="lbl"><b>${esc(u.name)}</b><span>${esc(roleName(u.role))}${u.mandal?' · '+esc(u.mandal):''}</span></span>
      ${isViewer(u.role)?'<span class="pill p-info">View access</span>':''}</div>
    <div class="row"><span class="lbl"><b>Mobile</b></span><span class="val num">+91 ${esc(u.phone||'')}</span></div>
    ${myGps().length?`<div class="row"><span class="lbl"><b>Gram Panchayat${myGps().length>1?'s':''}</b><span>${esc(myGps().join(', '))}</span></span></div>`:''}
    <div class="row"><span class="lbl"><b>Session</b></span><span class="val">30 days</span></div>
  </div></div>

  <div class="group"><div class="hdr">Attendance</div><div class="card">
    <div class="row"><span class="ico" style="background:${a?(a.verified?'var(--ok)':'var(--warn)'):'var(--ink-4)'}">${ICON.tickC}</span>
      <span class="lbl"><b>${a?'Marked today':(attExempt(u.role)?'Not required for your office':'Not marked today')}</b>
      <span>${a?esc(new Date(a.ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})+' · '+(a.verified?'location recorded':'no location fix')+' · '+(a.sync==='synced'?'sent to the district':'on this phone'))
        :(attExempt(u.role)?'The Collector is not asked to mark in. A day may still be marked below, which is useful as proof of a field visit.'
                           :'Attendance is asked for once a day, when the app opens.')}</span></span></div>
    ${(attExempt(u.role) && !a) ? `<div class="row tap" id="mAttNow"><span class="ico" style="background:var(--seal-2)">${ICON.cam}</span>
      <span class="lbl"><b>Mark today anyway</b><span>Photograph and location, the same as any officer</span></span><span class="chev"></span></div>` : ''}
    <div class="row"><span class="lbl"><b>Days marked on this phone</b></span><span class="val num">${marked}</span></div>
  </div></div>

  ${leaveVisible(u.role) ? `<div class="group"><div class="hdr">Leave</div><div class="card">
    <div class="row tap" id="mLeave"><span class="ico" style="background:var(--seal-2)">${ICON.cal}</span>
      <span class="lbl"><b>${canApproveLeave(u.role)?'Leave applications':'Apply for leave'}</b>
      <span>${canApproveLeave(u.role)
        ? 'Applications from the MPO, the Panchayat Secretary and the MPDO'
        : 'Applications go to the Collector for orders'}</span></span>
      ${canApproveLeave(u.role) && pendingLeave().length ? `<span class="pill p-warn">${pendingLeave().length} waiting</span>` : ''}
      <span class="chev"></span></div>
  </div></div>` : ''}

  <div class="group"><div class="hdr">Reading the screen</div><div class="card">
    <div class="row"><span class="ico" style="background:var(--gold)">${ICON.sun}</span>
      <span class="lbl"><b>Sunlight</b><span>Flat white, black text, heavy rules — for working outdoors</span></span>
      <span class="sw g" role="switch" tabindex="0" aria-checked="${!!DB.prefs.sun}" id="prefSun" aria-label="Sunlight mode"></span></div>
    <div class="row"><span class="ico" style="background:var(--pG)">${ICON.text}</span>
      <span class="lbl"><b>Larger text</b><span>One step up, everywhere</span></span>
      <span class="sw g" role="switch" tabindex="0" aria-checked="${!!DB.prefs.big}" id="prefBig" aria-label="Larger text"></span></div>
  </div></div>

  ${(IOS && !STANDALONE) ? `<div class="group"><div class="hdr">Install</div><div class="card">
    <div class="row tap" id="mIos"><span class="ico" style="background:var(--gold)">${ICON.down}</span>
      <span class="lbl"><b>Add to Home Screen</b><span>Run full screen and keep records safely</span></span><span class="chev"></span></div>
  </div></div>` : ''}

  <div class="group"><div class="hdr">Data</div><div class="card">
    <div class="row tap" id="mPull"><span class="ico" style="background:var(--pB)">${ICON.down}</span>
      <span class="lbl"><b>Refresh village list</b><span>${(DB.master||[]).length} loaded</span></span><span class="chev"></span></div>
    ${canEdit()?`<div class="row tap" id="mSync"><span class="ico" style="background:var(--seal-2)">${ICON.cloud}</span>
      <span class="lbl"><b>Sync everything now</b><span>${pendingCount()} record(s), ${pendingAtt()} attendance mark(s) waiting</span></span><span class="chev"></span></div>`:''}
    <div class="row tap" id="mBackup"><span class="ico" style="background:var(--pG)">${ICON.file}</span>
      <span class="lbl"><b>Download a backup</b><span>Everything on this phone, as a file</span></span><span class="chev"></span></div>
    <div class="row"><span class="lbl"><b>Storage used</b><span id="stoTxt">Checking…</span></span></div>
  </div></div>

  <div class="group"><div class="hdr">Security</div><div class="card">
    <div class="row tap" id="mPin"><span class="ico" style="background:var(--gold)">${ICON.key}</span>
      <span class="lbl"><b>Change my PIN</b></span><span class="chev"></span></div>
    <div class="row tap" id="mOut"><span class="ico" style="background:var(--flag)">${ICON.out}</span>
      <span class="lbl"><b>Sign out</b><span>Unsynced records stay on the phone</span></span><span class="chev"></span></div>
  </div></div>

  <p style="font-size:12.5px;color:var(--ink-3);text-align:center;padding:22px 24px 34px;line-height:1.6">
    SJGP · version ${APP_VERSION}<br>Collectorate, Jangaon · Rc.No.788/DPO/26/34<br>
    <a href="privacy.html">How this app handles your data</a></p>`;

  const sun=$('#prefSun'), big=$('#prefBig');
  const flip=(el,key)=>{ const on=el.getAttribute('aria-checked')!=='true'; el.setAttribute('aria-checked',on);
    DB.prefs[key]=on?1:0; saveNow(); applyPrefs(); };
  sun.addEventListener('click',()=>flip(sun,'sun'));
  big.addEventListener('click',()=>flip(big,'big'));
  [sun,big].forEach(el=>el.addEventListener('keydown',e=>{ if(e.key===' '||e.key==='Enter'){e.preventDefault(); el.click();} }));

  const iosRow=$('#mIos'); if(iosRow) iosRow.addEventListener('click', ()=>$('#iosTip').classList.add('on'));
  const lvRow=$('#mLeave'); if(lvRow) lvRow.addEventListener('click', openLeave);
  const attNow=$('#mAttNow'); if(attNow) attNow.addEventListener('click', () => { $('#app').hidden = true; openAttendance(); });
  const syncRow=$('#mSync'); if(syncRow) syncRow.addEventListener('click', syncAll);
  $('#mPull').addEventListener('click', async ()=>{
    toast('Refreshing…');
    try{ const g=await get({op:'gps'}); if(g.ok){ DB.master=g.gps; saveNow(); renderMore(); toast(g.gps.length + ' villages loaded'); } else toast(g.error||'Failed'); }
    catch(e){ toast(e.message); }
  });
  $('#mBackup').addEventListener('click', ()=>{
    const copy=JSON.parse(JSON.stringify(DB)); delete copy.session;
    const a2=document.createElement('a');
    a2.href=URL.createObjectURL(new Blob([JSON.stringify(copy,null,1)],{type:'application/json'}));
    a2.download='SJGP_backup_'+todayStr()+'.json'; a2.click(); toast('Backup saved to the phone');
  });
  $('#mPin').addEventListener('click', changePin);
  $('#mOut').addEventListener('click', ()=>{
    const n=pendingCount()+pendingAtt();
    confirmSheet('Sign out?', n ? n+' item(s) are not yet synced. They stay on this phone and can be sent after you sign in again.'
                               : 'You will sign in again with your number and PIN.', false,
      ()=>{ DB.session=null; saveNow(); gate(); toast('Signed out'); });
  });
  const est=await BLOBS.estimate();
  const t=$('#stoTxt');
  if(t) t.textContent = est && est.usage ? (Math.round(est.usage/1048576) + ' MB used' + (est.quota?(' of about '+Math.round(est.quota/1048576)+' MB available'):'')) : 'Not reported by this phone';
}
function changePin(){
  showSheet(`<div style="padding:6px 20px 6px"><h2>Change my PIN</h2>
    <p style="font-size:14px;color:var(--ink-2);margin-top:5px">At least four digits. It changes on every Gram Panchayat held against your number.</p></div>
    <div class="group" style="margin-top:10px"><div class="card">
      <div class="field"><label for="cpOld">Current PIN</label><input type="password" inputmode="numeric" id="cpOld"></div>
      <div class="field"><label for="cpNew">New PIN</label><input type="password" inputmode="numeric" id="cpNew"></div>
    </div><div class="msg" id="cpMsg"></div>
    <button class="btn" id="cpGo">Change PIN</button></div>`);
  $('#cpGo').addEventListener('click', async ()=>{
    const m=$('#cpMsg'); m.className='msg info'; m.textContent='Changing…';
    try{ const r=await post({kind:'chpass', token:DB.session.token, old:$('#cpOld').value, newp:$('#cpNew').value});
      if(r.ok){ hideSheet(); toast('PIN changed'); } else { m.className='msg'; m.textContent=r.error||'Failed'; }
    }catch(e){ m.className='msg'; m.textContent='Cannot reach the server'; }
  });
}

/* ---------------- icons ---------------- */
const ICON={
  cal:'<svg viewBox="0 0 24 24"><path d="M7 2v2H5.5A2.5 2.5 0 0 0 3 6.5v13A2.5 2.5 0 0 0 5.5 22h13a2.5 2.5 0 0 0 2.5-2.5v-13A2.5 2.5 0 0 0 18.5 4H17V2h-2v2H9V2H7Zm12 8v9.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5V10h14Zm-9.3 2.3-3 3 1.4 1.4 1.6-1.6V18h2v-5.7h-2Zm5.6 0h-3v1.9h1.6l-1.8 3.8h2.2l1.9-4.1v-1.6h-.9Z"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="M9.6 16.2 5.4 12l-1.4 1.4 5.6 5.6 12-12-1.4-1.4z"/></svg>',
  tick:'<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor"><path d="M9.6 16.2 5.4 12l-1.4 1.4 5.6 5.6 12-12-1.4-1.4z"/></svg>',
  tickC:'<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m-1.3 14.6-4-4L8.1 11l2.6 2.6L15.9 8.4l1.4 1.4z"/></svg>',
  pin:'<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5"/></svg>',
  flag:'<svg viewBox="0 0 24 24"><path d="M6 3v18h2v-7h9l-1.6-3.5L17 7H8V3z"/></svg>',
  cam:'<svg viewBox="0 0 24 24"><path d="M9.4 4 8 6H4.5A1.5 1.5 0 0 0 3 7.5v11A1.5 1.5 0 0 0 4.5 20h15a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 19.5 6H16l-1.4-2zm2.6 4.8a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4m0 2a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4"/></svg>',
  cam2:'<svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:currentColor"><path d="M9.4 4 8 6H4.5A1.5 1.5 0 0 0 3 7.5v11A1.5 1.5 0 0 0 4.5 20h15a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 19.5 6H16l-1.4-2zm2.6 4.8a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4m0 2a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4"/></svg>',
  note:'<svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:currentColor"><path d="M4 4h16v2.4H4zm0 5.3h16v2.4H4zm0 5.3h11v2.4H4z"/></svg>',
  plus:'<svg viewBox="0 0 24 24" style="width:17px;height:17px;fill:currentColor"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
  eye:'<svg viewBox="0 0 24 24"><path d="M12 5C6.5 5 2.4 9.1 1 12c1.4 2.9 5.5 7 11 7s9.6-4.1 11-7c-1.4-2.9-5.5-7-11-7m0 2.4a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2m0 2a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2"/></svg>',
  cloud:'<svg viewBox="0 0 24 24"><path d="M18.4 9.4A6.5 6.5 0 0 0 6.1 8 5 5 0 0 0 7 18h11a4.3 4.3 0 0 0 .4-8.6M13 12v4h-2v-4H8l4-4.2L16 12z"/></svg>',
  warn:'<svg viewBox="0 0 24 24"><path d="M12 2 1.5 21h21zm-1 6h2v7h-2zm0 9h2v2h-2z"/></svg>',
  user:'<svg viewBox="0 0 24 24"><path d="M12 12a4.2 4.2 0 1 0 0-8.4A4.2 4.2 0 0 0 12 12m0 2c-3.6 0-7 1.8-7 4v2h14v-2c0-2.2-3.4-4-7-4"/></svg>',
  down:'<svg viewBox="0 0 24 24"><path d="M11 3v9.2L7.8 9 6.4 10.4 12 16l5.6-5.6L16.2 9 13 12.2V3zM5 18v2h14v-2z"/></svg>',
  file:'<svg viewBox="0 0 24 24"><path d="M6 2h8l5 5v15H6zm7 1.8V8h4.2z"/></svg>',
  key:'<svg viewBox="0 0 24 24"><path d="M14 3a6 6 0 0 0-5.7 7.9L3 16.2V21h4.8l1.4-1.4v-2h2v-2h2l1.1-1.1A6 6 0 1 0 14 3m1.6 2.6a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2"/></svg>',
  out:'<svg viewBox="0 0 24 24"><path d="M10 3H4v18h6v-2H6V5h4zm5.6 3.8L14.2 8.2 17 11H9v2h8l-2.8 2.8 1.4 1.4L21 12z"/></svg>',
  sun:'<svg viewBox="0 0 24 24"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10m0-5h.001V5H12zm0 17h.001v3H12zM2 11.5h3v1H2zm17 0h3v1h-3zM4.6 4.6l2.1 2.1-.7.7-2.1-2.1zm12.7 12.7 2.1 2.1-.7.7-2.1-2.1zM19.4 4.6l.7.7-2.1 2.1-.7-.7zM6.7 17.3l.7.7-2.1 2.1-.7-.7z"/></svg>',
  text:'<svg viewBox="0 0 24 24"><path d="M3 4h18v3h-7v13h-4V7H3z"/></svg>',
  empty:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zm2 2v10h12V7z"/></svg>'
};


/* ============================================================
   LEAVE
   Applied for by the MPO, the Panchayat Secretary and the MPDO.
   Sanctioned or refused by the Collector, and by nobody else —
   the decision is written on the server against the Collector's
   own token, so the app cannot be talked into approving anything.
   ============================================================ */
const LEAVE_TYPES = [
  ['CL', 'Casual Leave',                     {year:15, counts:true }],
  ['EL', 'Earned Leave',                     {year:30, counts:true }],
  ['HQ', 'Permission to leave Headquarters', {year:0,  counts:false}],
  ['ML', 'Medical Leave',                    {year:0,  counts:false, cert:true}]
];
const leaveMeta = t => (LEAVE_TYPES.find(x => x[0] === t) || [t, t, {year:0, counts:false}])[2];
const leaveName = t => (LEAVE_TYPES.find(x => x[0] === t) || [t, t])[1];

/* The register opens in August 2026, so the calendar year has five months left
   in it, not twelve. Casual leave for 2026 is therefore 15 x 5/12 = 6.25, taken
   as 6. From 2027 the full 15 applies by itself — change nothing.
   Earned leave is not pro-rated: it is credited for the year. */
const LEAVE_OPENING_YEAR = 2026;
const CL_OPENING_BALANCE = 6;

function entitlement(type, year){
  if(type === 'CL' && Number(year) === LEAVE_OPENING_YEAR) return CL_OPENING_BALANCE;
  return leaveMeta(type).year || 0;
}
/* Sanctioned leave is spent; an application awaiting orders is committed and
   cannot be spent twice. Both come off what is left. */
function leaveBalance(type, year){
  const y = Number(year) || new Date().getFullYear();
  const ent = entitlement(type, y);
  const mine = (DB.leave || []).filter(l => l.type === type && String(l.from || '').slice(0,4) === String(y));
  const used = mine.filter(l => l.status === 'APPROVED').reduce((s,l) => s + (Number(l.days) || 0), 0);
  const held = mine.filter(l => l.status === 'PENDING').reduce((s,l) => s + (Number(l.days) || 0), 0);
  return {ent, used, held, left: Math.max(0, ent - used - held)};
}
const canApplyLeave   = r => ['MPO','PS','MPDO'].includes(r);
/* The Collector is not asked to mark in. The office is not one that reports
   its own presence to itself — though it may still mark a day voluntarily
   from More, which is useful as proof of a field visit. */
const attExempt = r => r === 'COLLECTOR';
const canApproveLeave = r => r === 'COLLECTOR';
const leaveVisible    = r => canApplyLeave(r) || canApproveLeave(r);

function leaveDays(from, to){
  const a = new Date(from + 'T00:00:00'), b = new Date(to + 'T00:00:00');
  if(isNaN(a) || isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}
function approvedLeaveToday(){
  const t = todayStr();
  return (DB.leave || []).find(l => l.status === 'APPROVED' && l.from <= t && l.to >= t) || null;
}
function pendingLeave(){ return (DB.leave || []).filter(l => l.status === 'PENDING'); }
const LV_PILL = {PENDING:['p-warn','Pending'], APPROVED:['p-ok','Sanctioned'],
                 REJECTED:['p-bad','Refused'], CANCELLED:['p-mut','Withdrawn']};
function lvPill(st){ const [c,l] = LV_PILL[st] || ['p-mut', st]; return `<span class="pill ${c}">${esc(l)}</span>`; }
function lvSpan(l){
  return l.from === l.to ? niceDate(l.from) : niceDate(l.from) + ' to ' + niceDate(l.to);
}

/* ---------------- the screen ---------------- */
let LVFILTER = 'PENDING';
function openLeave(){
  showScreen('leave');
  renderLeave();
  refreshLeave().catch(()=>{});
}
$('#lvBack').innerHTML = '<button id="lvBackBtn">Back</button>';
$('#lvBack').addEventListener('click', e => { if(e.target.closest('#lvBackBtn')) go('more'); });

function renderLeave(){
  const u = user(); if(!u) return;
  const mine = canApplyLeave(u.role), boss = canApproveLeave(u.role);
  let list = (DB.leave || []).slice();

  if(boss){
    $('#lvBig').textContent = 'Leave applications';
    const pend = pendingLeave().length;
    $('#lvSub').textContent = pend ? pend + (pend === 1 ? ' waiting on you' : ' waiting on you') : 'Nothing waiting on you';
    $('#lvRight').innerHTML = '';
    if(LVFILTER !== 'ALL') list = list.filter(l => l.status === LVFILTER);
    list.sort((a,b) => String(b.appliedAt||'').localeCompare(String(a.appliedAt||'')));
  } else {
    $('#lvBig').textContent = 'Leave';
    $('#lvSub').textContent = u.name;
    $('#lvRight').innerHTML = '';
    list.sort((a,b) => String(b.appliedAt||'').localeCompare(String(a.appliedAt||'')));
  }

  let h = '';
  if(boss){
    h += `<div class="lvhead">
      <button data-lvf="PENDING"  aria-pressed="${LVFILTER==='PENDING'}">Waiting</button>
      <button data-lvf="APPROVED" aria-pressed="${LVFILTER==='APPROVED'}">Sanctioned</button>
      <button data-lvf="REJECTED" aria-pressed="${LVFILTER==='REJECTED'}">Refused</button>
      <button data-lvf="ALL"      aria-pressed="${LVFILTER==='ALL'}">All</button></div>`;
  }
  if(mine){
    const yr = new Date().getFullYear();
    h += `<div class="group" style="margin-top:14px"><div class="hdr">Leave account · ${yr}</div><div class="card">` +
      LEAVE_TYPES.filter(([,,m]) => m.counts).map(([k,n]) => {
        const b = leaveBalance(k, yr);
        return `<div class="row"><span class="tag" style="width:44px;flex:none;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--seal);background:var(--seal-tint);border-radius:8px;min-height:34px;display:grid;place-items:center">${k}</span>
          <span class="lbl"><b>${esc(n)}</b><span>${b.ent} for the year · ${b.used} taken${b.held?' · '+b.held+' awaiting orders':''}</span></span>
          <span class="lvdays" style="color:${b.left?'var(--ok)':'var(--flag)'}">${b.left}<small>left</small></span></div>`;
      }).join('') +
      `<div class="row"><span class="lbl"><b>Medical Leave</b><span>On a certificate from a Government doctor or hospital. Not counted against a yearly figure.</span></span></div>
       <div class="row"><span class="lbl"><b>Permission to leave Headquarters</b><span>A permission, not leave. Nothing is deducted.</span></span></div>
      </div></div>`;
    if(yr === LEAVE_OPENING_YEAR)
      h += `<p class="lvnote">Casual leave for ${yr} is ${CL_OPENING_BALANCE} days, being the five months from August. The full 15 applies from January ${yr+1}.</p>`;
    h += `<div class="group" style="margin-top:14px"><button class="btn" id="lvNew">${ICON.plus}Apply for leave</button></div>`;
    const lv = approvedLeaveToday();
    if(lv) h += `<div class="group"><div class="card"><div class="row">
      <span class="ico" style="background:var(--ok)">${ICON.tickC}</span>
      <span class="lbl"><b>You are on sanctioned leave today</b><span>${esc(leaveName(lv.type))} · ${esc(lvSpan(lv))}</span></span></div></div></div>`;
  }

  if(!list.length){
    h += emptyState(boss ? 'Nothing here' : 'No application yet',
      boss ? 'Applications from the MPO, the Panchayat Secretary and the MPDO appear here for your orders.'
           : 'Leave is applied for here and goes to the Collector for orders. Apply before you leave station wherever it is possible to do so.');
  } else {
    h += `<div class="group" style="margin-top:14px"><div class="card">` + list.map(l => {
      const who = boss ? `<em>${esc(String(l.name||''))}</em> · ${esc(roleName(l.role))}${l.mandal?' · '+esc(l.mandal):''}<br>` : '';
      return `<button class="lvrow" data-lv="${esc(l.id)}">
        <span class="tag">${esc(l.type)}</span>
        <span class="mid"><b>${esc(leaveName(l.type))}</b>
          <span>${who}${esc(lvSpan(l))}${l.sync!=='synced'?' · on this phone':''}</span></span>
        <span class="lvdays">${l.days}<small>${l.days===1?'day':'days'}</small></span>
        </button>`;
    }).join('') + `</div></div>`;
    h += `<div class="group"><div class="card">` + list.map(l =>
      `<div class="row" style="padding-top:6px;padding-bottom:6px"><span class="lbl"><b style="font-size:13px">${esc(leaveName(l.type))} · ${esc(lvSpan(l))}</b></span>${lvPill(l.status)}</div>`
    ).join('') + `</div></div>`;
  }
  $('#lvBody').innerHTML = h;
  wireLeave();
}

function wireLeave(){
  const nb = $('#lvNew'); if(nb) nb.addEventListener('click', openLeaveForm);
  $$('#lvBody [data-lvf]').forEach(b => b.addEventListener('click', () => { LVFILTER = b.dataset.lvf; renderLeave(); }));
  $$('#lvBody [data-lv]').forEach(b => b.addEventListener('click', () => openLeaveOne(b.dataset.lv)));
}

/* ---------------- applying ---------------- */
function openLeaveForm(){
  const t = todayStr();
  showSheet(`<div style="padding:6px 20px 4px"><h2>Apply for leave</h2>
    <p style="font-size:13.5px;color:var(--ink-2);margin-top:4px">The application goes to the Collector. You will see the orders here.</p></div>
    <div class="group" style="margin-top:8px"><div class="card">
      <div class="field"><label for="lvType">Kind of leave</label>
        <select id="lvType">${LEAVE_TYPES.map(([k,n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select></div>
      <div class="field split">
        <div><label for="lvFrom">From</label><input type="date" id="lvFrom" value="${t}"></div>
        <div><label for="lvTo">To</label><input type="date" id="lvTo" value="${t}"></div></div>
      <div class="field"><label for="lvReason">Reason</label>
        <textarea id="lvReason" rows="3" placeholder="Briefly, in your own words"></textarea></div>
      <div class="field" id="lvCertBox" hidden><label for="lvCert">Medical certificate</label>
        <input type="text" id="lvCert" placeholder="Government doctor or hospital, and the date of the certificate">
        <p style="font-size:12px;color:var(--ink-3);margin-top:5px;line-height:1.45">Medical leave is sanctioned only on a certificate from a Government doctor or a Government hospital. Carry the original for the office record.</p></div>
      <div class="field"><label for="lvAddr">Address during leave</label>
        <input type="text" id="lvAddr" placeholder="Where you can be reached"></div>
      <div class="row" id="lvHqRow"><span class="lbl"><b>Permission to leave headquarters</b>
        <span>Tick if you will be away from the mandal headquarters</span></span>
        <span class="sw g" role="switch" tabindex="0" aria-checked="false" id="lvHq" aria-label="Permission to leave headquarters"></span></div>
    </div></div>
    <p class="lvnote" id="lvCount">1 day</p>
    <div class="group" style="margin-top:14px"><button class="btn" id="lvSend">Send to the Collector</button>
      <button class="btn quiet" id="lvCancelForm" style="margin-top:9px">Not now</button></div>`);

  const count = () => {
    const d = leaveDays($('#lvFrom').value, $('#lvTo').value);
    const k = $('#lvType').value, meta = leaveMeta(k);
    $('#lvCertBox').hidden = !meta.cert;
    $('#lvHqRow').hidden = (k === 'HQ');            // the whole application is that permission
    const box = $('#lvCount');
    if(!d){ box.textContent = 'The last day cannot fall before the first.'; box.style.color=''; return; }
    const word = d + (d === 1 ? ' day' : ' days');
    if(!meta.counts){ box.textContent = word; box.style.color=''; return; }
    const b = leaveBalance(k, Number(String($('#lvFrom').value).slice(0,4)) || new Date().getFullYear());
    if(d > b.left){
      box.innerHTML = `<b>${word} — more than you have.</b> ${esc(leaveName(k))}: ${b.left} left of ${b.ent}${b.held?', '+b.held+' already awaiting orders':''}.`;
      box.style.color = 'var(--flag)';
    } else {
      box.textContent = `${word} · ${b.left - d} of ${b.ent} would be left`;
      box.style.color = '';
    }
  };
  $('#lvType').addEventListener('change', count);
  $('#lvFrom').addEventListener('change', () => {
    if($('#lvTo').value < $('#lvFrom').value) $('#lvTo').value = $('#lvFrom').value;
    count();
  });
  $('#lvTo').addEventListener('change', count);
  const hq = $('#lvHq');
  const flip = () => hq.setAttribute('aria-checked', hq.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
  hq.addEventListener('click', flip);
  hq.addEventListener('keydown', e => { if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); flip(); } });
  $('#lvCancelForm').addEventListener('click', hideSheet);
  $('#lvSend').addEventListener('click', submitLeave);
  count();
}

async function submitLeave(){
  const u = user();
  const from = $('#lvFrom').value, to = $('#lvTo').value;
  const days = leaveDays(from, to);
  const reason = $('#lvReason').value.trim();
  const type = $('#lvType').value, meta = leaveMeta(type);
  const cert = ($('#lvCert').value || '').trim();
  if(!days){ toast('Check the dates — the last day falls before the first.'); return; }
  if(!reason){ toast('A reason is needed.'); $('#lvReason').focus(); return; }
  if(meta.cert && !cert){
    toast('Medical leave needs the certificate of a Government doctor or hospital.', 5000);
    $('#lvCert').focus(); return;
  }
  if(meta.counts){
    const b = leaveBalance(type, Number(String(from).slice(0,4)) || new Date().getFullYear());
    if(days > b.left){
      toast(`Only ${b.left} day${b.left===1?'':'s'} of ${leaveName(type)} left${b.held?' ('+b.held+' awaiting orders)':''}.`, 5500);
      return;
    }
  }
  const btn = $('#lvSend'); btn.disabled = true; btn.innerHTML = '<span class="spin"></span>Sending';
  const l = {
    id: 'LV' + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    appliedAt: new Date().toISOString(),
    phone: u.phone, name: u.name, role: u.role, mandal: u.mandal || '',
    type, from, to, days, reason, cert,
    address: $('#lvAddr').value.trim(),
    hq: type === 'HQ' || $('#lvHq').getAttribute('aria-checked') === 'true',
    status: 'PENDING', decidedBy: '', decidedAt: '', remarks: '', sync: 'local'
  };
  DB.leave = DB.leave || []; DB.leave.unshift(l); saveNow();
  hideSheet(); renderLeave();
  const sent = await syncLeave();
  toast(sent ? 'Sent to the Collector' : 'Saved on this phone — it goes when there is signal');
  renderLeave();
}

/* ---------------- one application ---------------- */
function openLeaveOne(id){
  const l = (DB.leave || []).find(x => x.id === id); if(!l) return;
  const u = user(), boss = canApproveLeave(u.role);
  const mine = l.phone === u.phone;
  showSheet(`<div style="padding:6px 20px 4px"><h2>${esc(leaveName(l.type))}</h2>
    <p style="font-size:13.5px;color:var(--ink-2);margin-top:4px">${esc(lvSpan(l))} · ${l.days} ${l.days===1?'day':'days'}</p></div>
    <div class="group" style="margin-top:8px"><div class="card">
      <div class="row"><span class="lbl"><b>Applicant</b><span>${esc(l.name)} · ${esc(roleName(l.role))}${l.mandal?' · '+esc(l.mandal):''}</span></span></div>
      <div class="row"><span class="lbl"><b>Applied</b></span><span class="val">${esc(niceDate(String(l.appliedAt||'').slice(0,10)))}</span></div>
      <div class="row"><span class="lbl"><b>Reason</b><span>${esc(l.reason||'—')}</span></span></div>
      ${l.address?`<div class="row"><span class="lbl"><b>Address during leave</b><span>${esc(l.address)}</span></span></div>`:''}
      ${l.cert?`<div class="row"><span class="lbl"><b>Medical certificate</b><span>${esc(l.cert)}</span></span></div>`:''}
      <div class="row"><span class="lbl"><b>Leaving headquarters</b></span><span class="val">${l.hq?'Yes':'No'}</span></div>
      ${leaveMeta(l.type).counts ? (()=>{ const b=leaveBalance(l.type, Number(String(l.from).slice(0,4)));
        return `<div class="row"><span class="lbl"><b>${esc(leaveName(l.type))} account</b>
          <span>${b.ent} for the year · ${b.used} taken · ${b.left} left</span></span></div>`; })() : ''}
      <div class="row"><span class="lbl"><b>Status</b></span>${lvPill(l.status)}</div>
      ${l.decidedBy?`<div class="row"><span class="lbl"><b>Orders by</b><span>${esc(l.decidedBy)}${l.decidedAt?' · '+esc(niceDate(String(l.decidedAt).slice(0,10))):''}</span></span></div>`:''}
      ${l.remarks?`<div class="row"><span class="lbl"><b>Remarks</b><span>${esc(l.remarks)}</span></span></div>`:''}
    </div></div>
    ${boss && l.status === 'PENDING' ? `
      <div class="group"><div class="card"><div class="field">
        <label for="lvRem">Remarks (optional)</label>
        <textarea id="lvRem" rows="2" placeholder="Anything to record with the orders"></textarea></div></div></div>
      <div class="group" style="margin-top:12px">
        <button class="btn" id="lvOk">Sanction</button>
        <button class="btn danger" id="lvNo" style="margin-top:9px">Refuse</button>
        <button class="btn quiet" id="lvShut" style="margin-top:9px">Close</button></div>` : `
      ${mine && l.status === 'PENDING' ? `<div class="group" style="margin-top:12px">
        <button class="btn danger" id="lvWithdraw">Withdraw the application</button>
        <button class="btn quiet" id="lvShut" style="margin-top:9px">Close</button></div>`
      : `<div class="group" style="margin-top:12px"><button class="btn quiet" id="lvShut">Close</button></div>`}`}`);

  const shut = $('#lvShut'); if(shut) shut.addEventListener('click', hideSheet);
  const ok = $('#lvOk'), no = $('#lvNo'), wd = $('#lvWithdraw');
  if(ok) ok.addEventListener('click', () => decideLeave(l.id, 'APPROVED', ($('#lvRem').value || '').trim()));
  if(no) no.addEventListener('click', () => decideLeave(l.id, 'REJECTED', ($('#lvRem').value || '').trim()));
  if(wd) wd.addEventListener('click', () => withdrawLeave(l.id));
}

async function withdrawLeave(id){
  const l = (DB.leave || []).find(x => x.id === id); if(!l) return;
  confirmSheet('Withdraw this application?',
    leaveName(l.type) + ' · ' + lvSpan(l) + '. The days come back to your account at once.', true, async () => {
    try{
      if(l.sync === 'synced'){
        const r = await post({kind:'leaveWithdraw', token: DB.session.token, id});
        if(!r || !r.ok){ toast((r && r.error) || 'Could not withdraw'); return; }
      }
      l.status = 'CANCELLED'; l.decidedBy = ''; l.decidedAt = new Date().toISOString();
      saveNow(); hideSheet(); renderLeave(); toast('Withdrawn — the days are back in your account');
    }catch(e){ toast('No signal — try again when the phone is online'); }
  });
}

async function decideLeave(id, status, remarks){
  const l = (DB.leave || []).find(x => x.id === id); if(!l) return;
  const word = status === 'APPROVED' ? 'Sanctioned' : status === 'REJECTED' ? 'Refused' : 'Withdrawn';
  try{
    const r = await post({kind:'leaveDecision', token: DB.session.token, id, status, remarks: remarks || ''});
    if(!r || !r.ok){ toast((r && r.error) || 'Could not send the orders'); return; }
    l.status = status; l.remarks = remarks || ''; l.decidedBy = r.decidedBy || user().name; l.decidedAt = r.decidedAt || new Date().toISOString();
    saveNow(); hideSheet(); renderLeave(); renderHome(); toast(word);
  }catch(e){ toast('No signal — orders are passed when the phone is back online'); }
}

/* ---------------- moving it about ---------------- */
async function syncLeave(){
  const list = (DB.leave || []).filter(l => l.sync !== 'synced');
  if(!list.length || !navigator.onLine) return 0;
  let done = 0;
  for(const l of list){
    try{
      const r = await post({kind:'leave', token: DB.session.token, leave:{
        id:l.id, appliedAt:l.appliedAt, type:l.type, from:l.from, to:l.to, days:l.days,
        reason:l.reason, address:l.address, hq:l.hq, cert:l.cert||'', status:l.status
      }});
      if(r && r.ok){ l.sync = 'synced'; done++; saveNow(); }
      else break;
    }catch(e){ break; }
  }
  return done;
}
async function refreshLeave(){
  const u = user(); if(!u || !leaveVisible(u.role) || !navigator.onLine) return;
  const r = await get({op:'leave'});
  if(!r || !r.ok) return;
  const keep = (DB.leave || []).filter(l => l.sync !== 'synced');           // not yet on the server
  const rows = (r.rows || []).map(x => ({...x, sync:'synced'}));
  const seen = new Set(rows.map(x => x.id));
  DB.leave = rows.concat(keep.filter(l => !seen.has(l.id)));
  saveNow();
  /* whatever the officer happens to be looking at should now be right */
  if($('#app').hidden) return;
  if($('#s-leave').classList.contains('on')) renderLeave();
  else if($('#s-home').classList.contains('on')) renderHome();
  else if($('#s-more').classList.contains('on')) renderMore();
}

/* ---------------- the day itself ---------------- */
function markLeaveDay(){
  const lv = approvedLeaveToday(); if(!lv) return;
  const u = user(), key = todayStr();
  DB.att[key] = {
    id: 'ATT' + Date.now().toString(36), date: key, ts: new Date().toISOString(),
    lat:null, lng:null, acc:null, verified:false, photoId:'',
    status:'LEAVE', leaveId: lv.id, leaveType: lv.type,
    phone:u.phone, name:u.name, role:u.role, mandal:u.mandal || '',
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '', sync:'local'
  };
  saveNow(); gate();
  toast('Recorded as sanctioned leave');
  syncAttendance().catch(()=>{});
}


/* ---------------- boot ----------------
   This must stay at the very end of the file. It runs immediately, and
   anything it touches has to be initialised first — a const declared
   further down is still in its dead zone when boot reaches it. */
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
load();
applyPrefs();
netBar();
if(SERVER_URL) DB.url=SERVER_URL;
gate();
/* the three moments worth retrying on: signal returns, the app comes back to
   the front, and every few minutes while it is open */
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') autoSync(); });
setInterval(() => { if(document.visibilityState === 'visible') autoSync(); }, 3*60*1000);
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') saveNow(); });
setInterval(()=>{ if(DB.session && navigator.onLine) autoSync(); }, 5*60*1000);

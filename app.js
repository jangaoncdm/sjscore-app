'use strict';
/* ============================================================
   SJ-SCORE Field — Collectorate, Jangaon · Rc.No.788/DPO/26/34
   Paste the Apps Script /exec URL below before publishing.
   ============================================================ */
const SERVER_URL = 'https://script.google.com/macros/s/AKfycbz8Ye9LqGB3bLWkTWcdw6JvU__U9K4VRaG-IFFpwc67G__1vdpMryV6NEfz5FJrnezS/exec';

/* ---------------- rubric (identical to the printed framework) ---------------- */
const PC = {A:'#166534',B:'#0E7490',C:'#B45309',D:'#1D4ED8',E:'#6D28D9',F:'#B91C1C',G:'#334155'};
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

/* ---------------- store ---------------- */
const $ = s => document.querySelector(s);
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let DB;
function load(){
  try{ DB = JSON.parse(localStorage.getItem('sjf4') || 'null'); }catch(e){ DB = null; }
  if(!DB) DB = {url:'', session:null, master:[], records:{}, cache:[], cacheAt:''};
}
let st;
function save(){ clearTimeout(st); st = setTimeout(()=>{ try{ localStorage.setItem('sjf4', JSON.stringify(DB)); }
  catch(e){ toast('Phone storage is full — sync now to free space'); } }, 200); }
const ymNow = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); };
function prevYm(ym,n){ let [y,m]=ym.split('-').map(Number); m-=n; while(m<1){m+=12;y--;} return y+'-'+String(m).padStart(2,'0'); }
const fyMonths = ym => { const m = +ym.split('-')[1]; return m>=4 ? m-3 : m+9; };
const monthName = ym => new Date(+ym.split('-')[0], +ym.split('-')[1]-1, 1).toLocaleString('en-IN',{month:'long',year:'numeric'});
const rid = (gp,ym) => gp + '|' + ym;
const user = () => (DB.session && DB.session.user) || null;
const myGps = () => { const u = user(); if(!u) return []; return (u.gps && u.gps.length) ? u.gps : (u.gp ? [u.gp] : []); };
const isDistrict = r => r==='DPO' || r==='COLLECTOR' || r==='DLPO';
const isMandal = r => r==='MPDO' || r==='MSO' || r==='MPO';

/* ---------------- scoring ---------------- */
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
const wkAvg = r => { const ws=r.workers.filter(w=>w.name.trim()||Object.keys(w.s).length);
  return ws.length ? Math.round(ws.reduce((s,w)=>s+wkTotal(w),0)/ws.length) : 0; };
const pendingCount = () => Object.values(DB.records).filter(r=>r.sync!=='synced').length;

/* ---------------- platform ---------------- */
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = window.navigator.standalone === true ||
                   window.matchMedia('(display-mode: standalone)').matches;

/* iOS moves fixed elements when the keyboard opens — park them while typing */
let kbTimer = null;
function setKb(on){ clearTimeout(kbTimer); kbTimer = setTimeout(()=>document.body.classList.toggle('kb', on), on ? 0 : 90); }
document.addEventListener('focusin', e => { if(e.target.matches('input,textarea,select')) setKb(true); });
document.addEventListener('focusout', () => setKb(false));
if(window.visualViewport){
  const vv = window.visualViewport;
  const onVV = () => { if(window.innerHeight - vv.height > 120) setKb(true); };
  vv.addEventListener('resize', onVV);
}

/* ---------------- chrome ---------------- */
function toast(msg, ms){ const t=$('#toast'); t.textContent=msg; t.classList.add('on');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('on'), ms||2400); }
function showSheet(html){ $('#sheetBody').innerHTML=html; $('#sheet').classList.add('on'); }
function hideSheet(){ $('#sheet').classList.remove('on'); }
$('#sheet').addEventListener('click', e => { if(e.target.classList.contains('scrim')) hideSheet(); });

let TAB='home';
function go(tab){
  TAB=tab;
  document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected', b.dataset.s===tab?'true':'false'));
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on', s.id==='s-'+tab));
  window.scrollTo(0,0);
  if(tab==='home') renderHome();
  if(tab==='inspect') renderInspect();
  if(tab==='records') renderRecords();
  if(tab==='more') renderMore();
}
$('#tabs').addEventListener('click', e => { const b=e.target.closest('button'); if(b) go(b.dataset.s); });
window.addEventListener('scroll', () => {
  const on = window.scrollY > 6;
  document.querySelectorAll('.nav').forEach(n => n.classList.toggle('scrolled', on));
}, {passive:true});

/* ---------------- api ---------------- */
async function post(body, url){
  const u = url || DB.url || SERVER_URL;
  if(!u) throw new Error('No server address set');
  const res = await fetch(u, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(body)});
  return res.json();
}
async function get(params){
  const u = DB.url || SERVER_URL;
  const q = new URLSearchParams({token:(DB.session&&DB.session.token)||'', ...params});
  const res = await fetch(u + '?' + q.toString());
  const out = await res.json();
  if(out && out.ok===false && out.error==='auth'){ DB.session=null; save(); gate(); throw new Error('Session ended — sign in again'); }
  return out;
}

/* ---------------- sign in ---------------- */
function gate(){
  const signed = !!(DB.session && DB.session.token);
  $('#signin').style.display = signed ? 'none' : 'flex';
  $('#app').hidden = !signed;
  if(!signed){ if(!SERVER_URL && !DB.url) $('#urlField').hidden = false; $('#lUrl').value = DB.url || ''; return; }
  go('home'); updateDot();
  if(IOS && !STANDALONE && !DB.iosTipSeen){
    setTimeout(()=>{ $('#iosTip').classList.add('on'); }, 1400);
  }
}
$('#iosTip').addEventListener('click', e => {
  if(e.target.classList.contains('scrim') || e.target.id === 'iosTipClose'){
    $('#iosTip').classList.remove('on'); DB.iosTipSeen = true; save();
  }
});
$('#btnSignin').addEventListener('click', signIn);
$('#lPin').addEventListener('keydown', e => { if(e.key==='Enter') signIn(); });
async function signIn(){
  const url = (SERVER_URL || $('#lUrl').value.trim() || DB.url || '').trim();
  const phone = $('#lPhone').value.replace(/\D/g,'');
  const pin = $('#lPin').value;
  const m = $('#lMsg');
  if(!url){ m.textContent='Enter the server address given by the DPO office.'; return; }
  if(phone.length!==10){ m.textContent='Enter your 10-digit mobile number.'; return; }
  if(!pin){ m.textContent='Enter your PIN.'; return; }
  const btn = $('#btnSignin'); btn.disabled=true; btn.innerHTML='<span class="spin"></span>Signing in';
  m.className='msg info'; m.textContent='';
  try{
    const r = await post({kind:'login', u:phone, p:pin}, url);
    if(r.ok){
      DB.url=url; DB.session={token:r.token, user:r.user}; save();
      $('#lPin').value=''; m.textContent='';
      try{ const g = await get({op:'gps'}); if(g.ok){ DB.master=g.gps; save(); } }catch(e){}
      gate(); toast('Signed in — ' + (r.user.name||''));
    } else { m.className='msg'; m.textContent = r.error || 'Sign-in failed.'; }
  }catch(e){ m.className='msg'; m.textContent='Cannot reach the server. Check the network and try again.'; }
  btn.disabled=false; btn.textContent='Sign in';
}

/* ---------------- score ring ---------------- */
function ringSVG(rec){
  const R=92, C=2*Math.PI*R, GAPD=2.2;      // gap in degrees between segments
  let angle=-0.0, out='';
  const total=100;
  GP_RUBRIC.forEach(p=>{
    const share=p.max/total, seg=C*share, gap=C*(GAPD/360);
    const got=pillarScore(rec,p)/p.max;
    out += `<circle cx="110" cy="110" r="${R}" fill="none" stroke="rgba(10,15,12,.07)" stroke-width="13"
            stroke-dasharray="${(seg-gap).toFixed(2)} ${(C-seg+gap).toFixed(2)}" stroke-dashoffset="${(-angle).toFixed(2)}" stroke-linecap="round"/>`;
    out += `<circle class="fill" data-arc="${p.p}" data-seg="${(seg-gap).toFixed(2)}" data-c="${C.toFixed(2)}"
            cx="110" cy="110" r="${R}" fill="none" stroke="${PC[p.p]}" stroke-width="13"
            stroke-dasharray="${Math.max(0,(seg-gap)*got).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-angle).toFixed(2)}" stroke-linecap="round"/>`;
    angle += seg;
  });
  return `<svg viewBox="0 0 220 220">${out}</svg>`;
}
function renderRing(rec){
  const sc=gpTotal(rec), gr=gradeOf(sc,rec.rf);
  return `<div class="ringwrap">
    <div class="ring">${ringSVG(rec)}
      <div class="core">
        <div class="score num">${sc}</div><div class="of">OF 100</div>
        <div class="grade g${gr}">Grade ${gr}</div>
        <div class="capped"${rec.rf.length?'':' hidden'}>Capped at D by red flag</div>
      </div>
    </div>
    <div class="legend">${GP_RUBRIC.map(p=>`<button data-jump="${p.p}"><i style="background:${PC[p.p]}"></i>${p.p}<b>${pillarScore(rec,p)}/${p.max}</b></button>`).join('')}</div>
  </div>`;
}

/* ---------------- HOME ---------------- */
let lastPull = 0;
function renderHome(){
  const u=user(); if(!u) return;
  if(u.role!=='PS' && navigator.onLine && Date.now()-lastPull > 5*60*1000){
    lastPull = Date.now();
    get({op:'list', ym:ymNow()}).then(r=>{
      if(r && r.ok){ DB.cache=r.rows; DB.cacheAt=new Date().toISOString(); save();
        if(TAB==='home') renderHome(); }
    }).catch(()=>{});
  }
  const h=new Date().getHours();
  $('#homeHi').textContent = (h<12?'Good morning':h<17?'Good afternoon':'Good evening');
  $('#homeSub').textContent = u.name + ' · ' + roleName(u.role);
  $('#homeNavTitle').textContent = 'Home';
  const ym=ymNow(), body=$('#homeBody');
  let h2='';

  const pend=pendingCount();
  if(pend) h2 += `<div class="banner warn">${pend} record${pend>1?'s':''} waiting to sync. Open Records and press Sync when you have signal.</div>`;
  if(IOS && !STANDALONE && pend)
    h2 += `<div class="banner warn">You are running in the browser, not the installed app. On iPhone, records held in a browser tab can be cleared by the phone. Add SJ-SCORE to the Home Screen, or sync today.</div>`;
  const stale = Object.values(DB.records).filter(r => r.sync!=='synced' && r.updatedAt &&
    (Date.now() - new Date(r.updatedAt).getTime()) > 5*24*3600*1000).length;
  if(stale) h2 += `<div class="banner warn">${stale} record${stale>1?'s have':' has'} been unsynced for more than five days. Sync as soon as you have signal — unsynced work is held only on this phone.</div>`;

  if(u.role==='PS'){
    const gps=myGps();
    h2 += `<div class="group"><div class="hdr">${monthName(ym)}</div><div class="card">`;
    gps.forEach(gp=>{
      const r=DB.records[rid(gp,ym)];
      const done=!!r, sc=done?gpTotal(r):0, gr=done?gradeOf(sc,r.rf):null;
      h2 += `<div class="row tap" data-open="${esc(gp)}">
        <span class="ico" style="background:${done?'var(--ok)':'var(--ink3)'}">${done?ICON.check:ICON.pin}</span>
        <span class="lbl"><b>${esc(gp)}</b><span>${done?('Recorded · '+(r.sync==='synced'?'synced':'not yet synced')):'Not recorded this month'}</span></span>
        ${done?`<span class="grade g${gr}" style="font-size:14px;padding:2px 10px">${sc}</span>`:'<span class="pill p-warn">Due</span>'}
        <span class="chev"></span></div>`;
    });
    h2 += `</div></div>
    <div class="group"><button class="btn" id="homeStart">${gps.length>1?'Start an inspection':'Start this month\u2019s inspection'}</button></div>`;
    h2 += sixMonth(gps[0]);
  } else {
    h2 += districtHome(u, ym);
  }
  body.innerHTML = h2;
  const b=$('#homeStart'); if(b) b.addEventListener('click', ()=>{ openPicker(); });
  body.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click',()=>openRecord(el.dataset.open, ymNow())));
  body.querySelectorAll('[data-refresh]').forEach(el=>el.addEventListener('click', refreshDistrict));
}
function sixMonth(gp){
  if(!gp) return '';
  const ms=[5,4,3,2,1,0].map(n=>prevYm(ymNow(),n));
  const vals=ms.map(m=>{ const r=DB.records[rid(gp,m)]; return r?gpTotal(r):null; });
  if(!vals.some(v=>v!==null)) return '';
  const mx=100;
  return `<div class="group"><div class="hdr">Trend</div><div class="card" style="padding:16px">
    <div style="display:flex;align-items:flex-end;gap:9px;height:82px">
    ${vals.map((v,i)=>`<div style="flex:1;text-align:center">
      <div style="height:${v==null?2:Math.max(4,v/mx*70)}px;border-radius:4px;background:${v==null?'var(--hair)':'var(--brand)'};margin-bottom:6px"></div>
      <div style="font-size:10.5px;color:var(--ink3)">${ms[i].split('-')[1]}</div>
      <div style="font-size:12px;font-weight:700">${v==null?'—':v}</div></div>`).join('')}
    </div></div></div>`;
}
function districtHome(u, ym){
  const rows=(DB.cache||[]).filter(r=>r.ym===ym);
  const scope = isDistrict(u.role) ? 'the district' : u.mandal;
  const grades={A:0,B:0,C:0,D:0}; rows.forEach(r=>grades[r.grade]=(grades[r.grade]||0)+1);
  const avg = rows.length ? Math.round(rows.reduce((s,r)=>s+(+r.score||0),0)/rows.length) : null;
  const rf = rows.filter(r=>String(r.rf||'').trim());
  const totalGps = (DB.master||[]).length;
  let h='';
  h += `<div class="kpis">
    <div class="kpi"><div class="n">${rows.length}${totalGps?`<span style="font-size:16px;color:var(--ink3)"> / ${totalGps}</span>`:''}</div><div class="l">Gram Panchayats reported<br>${esc(monthName(ym))}</div></div>
    <div class="kpi"><div class="n" style="color:var(--gold)">${avg==null?'—':avg}</div><div class="l">Average SJ-SCORE<br>across ${esc(scope)}</div></div>
    <div class="kpi"><div class="n" style="color:var(--ok)">${grades.A||0}</div><div class="l">Grade A</div></div>
    <div class="kpi"><div class="n" style="color:var(--danger)">${grades.D||0}</div><div class="l">Grade D, incl. red-flag caps</div></div></div>`;
  h += `<div class="group"><button class="btn quiet" data-refresh="1">Refresh from district</button>
        <p style="font-size:12px;color:var(--ink3);text-align:center;padding-top:8px">${DB.cacheAt?('Updated '+new Date(DB.cacheAt).toLocaleString('en-IN')):'Not loaded yet — tap Refresh'}</p></div>`;

  /* mandal-wise, for district officers only */
  if(isDistrict(u.role) && rows.length){
    const byM={};
    rows.forEach(r=>{ const m=r.mandal||'Unassigned'; (byM[m]=byM[m]||[]).push(r); });
    const mandals=Object.keys(byM).sort();
    h += `<div class="group"><div class="hdr">Mandal by mandal</div><div class="card">` +
      mandals.map(m=>{
        const list=byM[m];
        const a=Math.round(list.reduce((s,r)=>s+(+r.score||0),0)/list.length);
        const g={A:0,B:0,C:0,D:0}; list.forEach(r=>g[r.grade]=(g[r.grade]||0)+1);
        const gr=a>=85?'A':a>=70?'B':a>=55?'C':'D';
        return `<div class="row"><span class="lbl"><b>${esc(m)}</b>
          <span>${list.length} reported · A ${g.A||0} · B ${g.B||0} · C ${g.C||0} · D ${g.D||0}</span></span>
          <span class="grade g${gr}" style="font-size:13px;padding:2px 9px">${a}</span></div>`;
      }).join('') + `</div></div>`;
  }
  if(rf.length){
    h += `<div class="group"><div class="hdr">Red flags this month</div><div class="card">` +
      rf.map(r=>`<div class="row"><span class="ico" style="background:var(--danger)">${ICON.flag}</span>
        <span class="lbl"><b>${esc(r.gp)}</b><span>${esc(r.mandal)}</span></span>
        <span>${String(r.rf).split(' ').filter(Boolean).map(n=>`<i class="rfchip">RF-${esc(n)}</i>`).join('')}</span></div>`).join('') +
      `</div></div>`;
  }
  if(rows.length){
    const sorted=[...rows].sort((a,b)=>(+b.score)-(+a.score));
    h += `<div class="group"><div class="hdr">Ranking</div><div class="card">` +
      sorted.slice(0,50).map((r,i)=>`<div class="row">
        <span style="width:22px;font-size:13px;color:var(--ink3);font-weight:600" class="num">${i+1}</span>
        <span class="lbl"><b>${esc(r.gp)}</b><span>${esc(r.mandal)} · ${esc(r.officer||'')}</span></span>
        <span class="grade g${esc(r.grade)}" style="font-size:13px;padding:2px 9px">${esc(r.score)}</span></div>`).join('') +
      `</div></div>`;
  } else {
    h += emptyState('Nothing reported yet this month',
      DB.cacheAt
        ? 'No inspection has been synced for ' + monthName(ym) + ' so far. Villages appear here the moment an officer presses Sync in the field.'
        : 'Tap Refresh from district above to load. If it still shows nothing, no inspection has been synced yet this month.');
  }
  return h;
}
async function refreshDistrict(){
  toast('Loading district data…');
  try{
    const r = await get({op:'list', ym:ymNow()});
    if(!r.ok){ toast(r.error||'Could not load'); return; }
    DB.cache=r.rows; DB.cacheAt=new Date().toISOString();
    if(!(DB.master||[]).length){ try{ const g=await get({op:'gps'}); if(g.ok) DB.master=g.gps; }catch(e){} }
    lastPull = Date.now(); save(); renderHome();
    toast(r.rows.length ? (r.rows.length + ' village' + (r.rows.length>1?'s':'') + ' reported') : 'Nothing synced yet this month');
  }catch(e){ toast(e.message); }
}
const roleName = r => ({PS:'Panchayat Secretary', MPDO:'MPDO', MSO:'Mandal Special Officer', MPO:'MPO',
  DPO:'District Panchayat Officer', DLPO:'Divisional Panchayat Officer', COLLECTOR:'Collector & District Magistrate'}[r] || r);
function emptyState(t,p){ return `<div class="empty">${ICON.empty}<b>${esc(t)}</b><p>${esc(p)}</p></div>`; }

/* ---------------- GP picker ---------------- */
function openPicker(){
  const u=user(); const ym=ymNow();
  let list = u.role==='PS' ? myGps() : (DB.master||[]).filter(g=>isDistrict(u.role)||g.mandal===u.mandal).map(g=>g.gp);
  if(!list.length){ toast('No Gram Panchayat assigned to this account'); return; }
  if(list.length===1){ openRecord(list[0], ym); return; }
  showSheet(`<div style="padding:6px 16px 12px"><h2 style="font-size:21px;font-weight:700;letter-spacing:-.02em">Choose a Gram Panchayat</h2>
    <p style="font-size:14px;color:var(--ink2);margin-top:3px">${esc(monthName(ym))}</p></div>
    <div class="group" style="margin-top:4px"><div class="card">
    ${list.map(gp=>{ const r=DB.records[rid(gp,ym)];
      return `<div class="row tap" data-pick="${esc(gp)}"><span class="lbl"><b>${esc(gp)}</b>
        <span>${r?('Recorded · '+gpTotal(r)+'/100'):'Not recorded'}</span></span><span class="chev"></span></div>`;}).join('')}
    </div></div>`);
  $('#sheetBody').querySelectorAll('[data-pick]').forEach(el=>el.addEventListener('click',()=>{ hideSheet(); openRecord(el.dataset.pick, ym); }));
}

/* ---------------- record open ---------------- */
let CUR=null;
function newRecord(gp, ym){
  const u=user();
  const g=(DB.master||[]).find(x=>x.gp===gp) || {mandal:u.mandal||'', gp};
  const prev=DB.records[rid(gp, prevYm(ym,1))];
  return {id:rid(gp,ym), ym, mandal:g.mandal||u.mandal||'', gp,
    date:new Date().toISOString().slice(0,10), tIn:'', tOut:'',
    present:{mso:false,dpo:false,mpdo:u.role==='MPDO'}, gpsFix:null,
    s:{}, ev:{}, rf:[], rfReported:false, rfNote:'',
    ps:{name:'', s:{}}, workers:[{name:'', s:{}}],
    bc:{name:'', dcb:{ca:0,cc:0,aa:0,ac:0,ua:0,uc:0}, s:{}},
    defs:['','',''], prevPointed: prev ? prev.defs.filter(d=>d.trim()).length : 0, prevRectified:0,
    photos:[], sync:'local', photoFolder:'', updatedAt:''};
}
function openRecord(gp, ym){
  const id=rid(gp,ym);
  if(!DB.records[id]){ DB.records[id]=newRecord(gp,ym); save(); }
  CUR=DB.records[id];
  go('inspect');
}

/* ---------------- INSPECT ---------------- */
function renderInspect(){
  const body=$('#inspBody');
  if(!CUR){
    $('#inspTitle').textContent='Inspect'; $('#inspBack').innerHTML=''; $('#inspRight').innerHTML='';
    body.innerHTML = `<div class="bigtitle"><h2>Inspect</h2><p>Record a monthly evaluation</p></div>` +
      emptyState('No inspection open','Choose a Gram Panchayat to begin. Everything you enter is saved on the phone as you go, with or without a network.') +
      `<div class="group"><button class="btn" id="ipStart">Choose a Gram Panchayat</button></div>`;
    $('#ipStart').addEventListener('click', openPicker);
    return;
  }
  const r=CUR, sc=gpTotal(r), gr=gradeOf(sc,r.rf);
  $('#inspTitle').textContent = r.gp;
  $('#inspBack').innerHTML = '<button id="ipClose">Close</button>';
  $('#inspRight').innerHTML = `<span class="navscore"><span class="num">${sc}</span><span class="g g${gr}">${gr}</span></span>`;

  let h = renderRing(r);

  /* visit card */
  h += `<div class="group"><div class="hdr">Visit</div><div class="card">
    <div class="field split"><div style="flex:1"><label>Date</label><input type="date" data-f="date" value="${esc(r.date)}"></div>
      <div style="flex:1"><label>Entered</label><input type="time" data-f="tIn" value="${esc(r.tIn)}"></div>
      <div style="flex:1"><label>Left</label><input type="time" data-f="tOut" value="${esc(r.tOut)}"></div></div>
    <div class="row tap" id="gpsRow"><span class="ico" style="background:var(--brand)">${ICON.pin}</span>
      <span class="lbl"><b>Location fix</b><span id="gpsTxt">${r.gpsFix?`${r.gpsFix.lat.toFixed(5)}, ${r.gpsFix.lng.toFixed(5)} · ±${Math.round(r.gpsFix.acc)} m`:'Not captured'}</span></span>
      <span class="val">${r.gpsFix?'Redo':'Capture'}</span></div>
    <div class="row"><span class="lbl"><b>Members present</b><span id="quorum"></span></span></div>
    <div class="row" style="gap:8px;padding-top:0">
      <div class="seg" style="flex:1">
        <button data-p="mso" aria-selected="${!!r.present.mso}">MSO</button>
        <button data-p="dpo" aria-selected="${!!r.present.dpo}">DPO</button>
        <button data-p="mpdo" aria-selected="${!!r.present.mpdo}">MPDO</button>
      </div></div>
  </div></div>`;

  /* pillars */
  h += `<div class="group"><div class="hdr">Gram Panchayat scorecard · 100 marks</div></div>`;
  GP_RUBRIC.forEach(p=>{
    const got=pillarScore(r,p), pct=Math.round(got/p.max*100);
    h += `<details class="pillar" id="pil-${p.p}"><summary>
      <span class="tag" style="background:${PC[p.p]}">${p.p}</span>
      <span class="pname"><b>${esc(p.name)}</b><span>${esc(p.law)}</span></span>
      <span class="bar"><i style="width:${pct}%;background:${PC[p.p]}"></i></span>
      <span class="pscore" data-sub="${p.p}">${got}<em>/${p.max}</em></span></summary><div>`;
    p.items.forEach(([id,q,mx])=>{
      const auto=id==='G1', v=auto?g1Auto(r):r.s[id];
      h += itemHTML(id,q,mx,v,auto,r.ev[id]);
    });
    if(p.p==='G'){
      h += `<div class="item"><div class="q"><span class="c">G1</span>Deficiencies from last month</div>
        <div class="ctrl"><div class="field" style="flex:1;padding:0"><label>Pointed out</label>
          <input type="number" inputmode="numeric" min="0" max="9" data-f="prevPointed" value="${r.prevPointed}"></div>
        <div class="field" style="flex:1;padding:0"><label>Rectified</label>
          <input type="number" inputmode="numeric" min="0" max="9" data-f="prevRectified" value="${r.prevRectified}"></div></div></div>`;
    }
    h += `</div></details>`;
  });

  /* red flags */
  const rfn=r.rf.length;
  h += `<details class="pillar" id="pil-RF"><summary>
    <span class="tag" style="background:var(--danger)">!</span>
    <span class="pname"><b>Red flags</b><span>Any one caps the grade at D</span></span>
    <span class="pscore" style="color:${rfn?'var(--danger)':'var(--ink3)'}">${rfn||'None'}</span></summary><div>`;
  RF_LIST.forEach(([n,t,note])=>{
    const on=r.rf.includes(n);
    h += `<div class="rf ${on?'on':''}" data-rfrow="${n}"><span class="t"><b>RF-${n}</b><span>${esc(t)}${note?' · '+esc(note):''}</span></span>
      <span class="sw" role="switch" aria-checked="${on}" data-rf="${n}"></span></div>`;
  });
  h += `<div class="field"><label>Responsibility fixed by name</label><input type="text" data-f="rfNote" value="${esc(r.rfNote)}" placeholder="Name and designation"></div>
    <div class="rf"><span class="t"><b style="color:var(--ink)">Reported to the Collector within 24 hours</b></span>
      <span class="sw g" role="switch" aria-checked="${!!r.rfReported}" data-fchk="rfReported"></span></div></div></details>`;

  /* PS */
  h += `<details class="pillar"><summary><span class="tag" style="background:var(--pG)">PS</span>
    <span class="pname"><b>Panchayat Secretary</b><span>Section 43 clause-wise</span></span>
    <span class="pscore" id="psT">${psTotal(r)}<em>/100</em></span></summary><div>
    <div class="field"><label>Name</label><input type="text" data-psname value="${esc(r.ps.name)}" placeholder="Name of the Secretary"></div>`;
  PS_RUBRIC.forEach(pt=>{
    h += `<div style="padding:11px 16px 3px;font-size:12px;font-weight:650;letter-spacing:.04em;text-transform:uppercase;color:var(--ink3);background:var(--surface2)">${esc(pt.part)} · ${pt.max}</div>`;
    pt.items.forEach(([id,q,mx,au])=> h += itemHTML(id,q,mx, au?psAuto(r,id):r.ps.s[id], au, null, true));
  });
  h += `</div></details>`;

  /* workers */
  h += `<details class="pillar"><summary><span class="tag" style="background:var(--pB)">W</span>
    <span class="pname"><b>Sanitation workers</b><span>One sheet per worker</span></span>
    <span class="pscore" id="wkT">${wkAvg(r)}<em>/100</em></span></summary><div id="wkBody">${workersHTML(r)}</div></details>`;

  /* bill collector */
  h += `<details class="pillar"><summary><span class="tag" style="background:${PC.C}">BC</span>
    <span class="pname"><b>Bill Collector</b><span>Driven by the DCB</span></span>
    <span class="pscore" id="bcT">${bcTotal(r)}<em>/100</em></span></summary><div>
    <div class="field"><label>Name</label><input type="text" data-bcname value="${esc(r.bc.name)}" placeholder="Name of the Bill Collector"></div>
    <div style="padding:11px 16px 3px;font-size:12px;font-weight:650;letter-spacing:.04em;text-transform:uppercase;color:var(--ink3);background:var(--surface2)">DCB in rupees · target for ${fyMonths(r.ym)} month(s) of the year</div>`;
  [['ca','Current demand'],['cc','Current collected'],['aa','Arrear demand'],['ac','Arrear collected'],['ua','User-fee demand'],['uc','User-fee collected']]
    .forEach(([k,l])=> h += `<div class="field"><label>${l}</label><input type="number" inputmode="numeric" data-dcb="${k}" value="${r.bc.dcb[k]||''}" placeholder="0"></div>`);
  BC_RUBRIC.forEach(([id,q,mx,au])=> h += itemHTML(id,q,mx, au?bcAuto(r,id):r.bc.s[id], au, null, true));
  h += `</div></details>`;

  /* photos */
  h += `<details class="pillar" open><summary><span class="tag" style="background:var(--brand)">${ICON.cam}</span>
    <span class="pname"><b>Photographs</b><span>14 points, each geo-stamped</span></span>
    <span class="pscore">${r.photos.length}<em>/14</em></span></summary><div>
    <div class="photos" id="phGrid">${photosHTML(r)}</div>
    <p style="font-size:12.5px;color:var(--ink3);padding:0 16px 14px;line-height:1.45">Next: ${esc(PHOTO_POINTS[Math.min(r.photos.length,13)])}. Photos upload to the district drive when you sync, then clear from the phone.</p>
  </div></details>`;

  /* deficiencies + actions */
  h += `<div class="group"><div class="hdr">Deficiencies carried to next month</div><div class="card">
    ${r.defs.map((d,i)=>`<div class="field"><label>Deficiency ${i+1}</label><input type="text" data-def="${i}" value="${esc(d)}" placeholder="What must be put right before the next visit"></div>`).join('')}
  </div></div>
  <div class="group" style="margin-bottom:26px">
    <button class="btn" id="btnDone">Save and close</button>
    <button class="btn quiet" id="btnSyncOne" style="margin-top:10px">Sync this inspection now</button>
  </div>`;

  body.innerHTML=h;
  wireInspect();
}
function itemHTML(id,q,mx,val,auto,ev,noEv){
  return `<div class="item"><div class="q"><span class="c">${esc(id.replace(/^p/,''))}</span>${esc(q)}</div>
    <div class="ctrl">
      <div class="stepper">${auto?'':`<button data-st="-1" data-for="${id}" aria-label="less">−</button>`}
        <span class="v num ${(val||0)===0?'zero':''}" data-v="${id}">${val==null?0:val}</span>
        ${auto?'':`<button data-st="1" data-for="${id}" aria-label="more">+</button>`}</div>
      <span class="mx">of ${mx}</span>
      ${auto?'<span class="auto">computed for you</span>':''}
    </div>
    ${(auto||noEv)?'':`<div class="evrow evi"><input type="text" data-ev="${id}" value="${esc(ev||'')}" placeholder="Evidence — photo, register or log reference"></div>`}</div>`;
}
function workersHTML(r){
  return r.workers.map((w,i)=>`<div>
    <div class="field split" style="align-items:flex-end"><div style="flex:1"><label>Worker ${i+1}</label>
      <input type="text" data-wname="${i}" value="${esc(w.name)}" placeholder="Name"></div>
      <span class="pill p-mut" style="margin-bottom:4px">${wkTotal(w)}/100</span>
      <button class="btn sm danger" data-delw="${i}" style="margin-bottom:2px">Remove</button></div>
    ${WK_RUBRIC.map(([id,q,mx])=>`<div class="item"><div class="q"><span class="c">${id.slice(1)}</span>${esc(q)}</div>
      <div class="ctrl"><div class="stepper"><button data-st="-1" data-for="${i}:${id}">−</button>
      <span class="v num ${(w.s[id]||0)===0?'zero':''}" data-v="${i}:${id}">${w.s[id]||0}</span>
      <button data-st="1" data-for="${i}:${id}">+</button></div><span class="mx">of ${mx}</span></div></div>`).join('')}
    </div>`).join('') + `<div style="padding:14px 16px"><button class="btn sec sm" id="btnAddW">Add another worker</button></div>`;
}
function photosHTML(r){
  return r.photos.map((p,i)=>`<div class="ph"><img src="data:image/jpeg;base64,${p.b64}" alt="">
    <button class="x" data-delp="${i}">✕</button><span class="geo">${p.lat?p.lat.toFixed(3)+','+p.lng.toFixed(3):'no fix'}</span></div>`).join('')
    + `<button class="addph" id="btnPhoto">${ICON.cam}</button>`;
}
const MAXOF = id => {
  for(const p of GP_RUBRIC){ const it=p.items.find(x=>x[0]===id); if(it) return it[2]; }
  for(const pt of PS_RUBRIC){ const it=pt.items.find(x=>x[0]===id); if(it) return it[2]; }
  const b=BC_RUBRIC.find(x=>x[0]===id); if(b) return b[2];
  const w=WK_RUBRIC.find(x=>x[0]===id); if(w) return w[2];
  return 0;
};
function setMark(id, val){
  const r=CUR;
  if(/^[A-G]\d/.test(id)) r.s[id]=val;
  else if(/^p/.test(id)) r.ps.s[id]=val;
  else if(/^b\d/.test(id)) r.bc.s[id]=val;
  else if(id.includes(':')){ const [wi,k]=id.split(':'); r.workers[wi].s[k]=val; }
}
function getMark(id){
  const r=CUR;
  if(/^[A-G]\d/.test(id)) return r.s[id]||0;
  if(/^p/.test(id)) return r.ps.s[id]||0;
  if(/^b\d/.test(id)) return r.bc.s[id]||0;
  if(id.includes(':')){ const [wi,k]=id.split(':'); return r.workers[wi].s[k]||0; }
  return 0;
}
function wireInspect(){
  const r=CUR, body=$('#inspBody');
  $('#ipClose').addEventListener('click', ()=>{ CUR=null; go('home'); });
  quorum();

  body.addEventListener('click', e=>{
    const st=e.target.closest('[data-st]');
    if(st){
      const id=st.dataset.for, mx=id.includes(':')?MAXOF(id.split(':')[1]):MAXOF(id);
      const v=clamp(getMark(id)+(+st.dataset.st), mx);
      setMark(id, v);
      const el=body.querySelector(`[data-v="${CSS.escape(id)}"]`);
      if(el){ el.textContent=v; el.classList.toggle('zero', v===0); }
      live(); return;
    }
    const sw=e.target.closest('[data-rf]');
    if(sw){
      const n=+sw.dataset.rf, on=sw.getAttribute('aria-checked')!=='true';
      sw.setAttribute('aria-checked', on);
      r.rf = on ? [...new Set([...r.rf,n])].sort((a,b)=>a-b) : r.rf.filter(x=>x!==n);
      body.querySelector(`[data-rfrow="${n}"]`).classList.toggle('on', on);
      live(); return;
    }
    const fc=e.target.closest('[data-fchk]');
    if(fc){ const on=fc.getAttribute('aria-checked')!=='true'; fc.setAttribute('aria-checked',on); r[fc.dataset.fchk]=on; save(); return; }
    const seg=e.target.closest('[data-p]');
    if(seg){ const k=seg.dataset.p, on=seg.getAttribute('aria-selected')!=='true';
      seg.setAttribute('aria-selected',on); r.present[k]=on; quorum(); save(); return; }
    const jump=e.target.closest('[data-jump]');
    if(jump){ const d=$('#pil-'+jump.dataset.jump); if(d){ d.open=true; d.scrollIntoView({behavior:'smooth',block:'start'}); } return; }
    const dw=e.target.closest('[data-delw]');
    if(dw){ r.workers.splice(+dw.dataset.delw,1); if(!r.workers.length) r.workers.push({name:'',s:{}}); save(); renderInspect(); return; }
    const dp=e.target.closest('[data-delp]');
    if(dp){ r.photos.splice(+dp.dataset.delp,1); save(); $('#phGrid').innerHTML=photosHTML(r); wirePhoto(); return; }
    if(e.target.closest('#btnAddW')){ r.workers.push({name:'',s:{}}); save(); renderInspect(); return; }
    if(e.target.closest('#gpsRow')) return captureFix();
    if(e.target.closest('#btnDone')){ save(); CUR=null; go('home'); toast('Saved on this phone'); return; }
    if(e.target.closest('#btnSyncOne')){ syncOne(r); return; }
  });

  body.addEventListener('input', e=>{
    const t=e.target;
    if(t.dataset.ev){ r.ev[t.dataset.ev]=t.value; save(); return; }
    if(t.dataset.f){ r[t.dataset.f] = t.type==='number' ? (+t.value||0) : t.value; live(); return; }
    if(t.hasAttribute('data-psname')){ r.ps.name=t.value; save(); return; }
    if(t.hasAttribute('data-bcname')){ r.bc.name=t.value; save(); return; }
    if(t.dataset.wname!==undefined && t.dataset.wname!==''){ r.workers[t.dataset.wname].name=t.value; save(); return; }
    if(t.dataset.dcb){ r.bc.dcb[t.dataset.dcb]=+t.value||0; live(); return; }
    if(t.dataset.def!==undefined && t.dataset.def!==''){ r.defs[t.dataset.def]=t.value; save(); return; }
  });
  wirePhoto();
}
function wirePhoto(){
  const b=$('#btnPhoto'); if(b) b.addEventListener('click', ()=>$('#camIn').click());
  document.querySelectorAll('[data-delp]').forEach(x=>x.addEventListener('click', e=>e.stopPropagation()));
}
function quorum(){
  const r=CUR, el=$('#quorum'); if(!r||!el) return;
  const n=['mso','dpo','mpdo'].filter(k=>r.present[k]).length;
  el.textContent = !r.present.mpdo ? 'The MPDO must be present at every inspection'
    : (n<2 ? 'At least two members are needed for a valid evaluation' : 'Valid — ' + n + ' members');
  el.style.color = (!r.present.mpdo || n<2) ? 'var(--danger)' : 'var(--ok)';
}
function live(){
  const r=CUR; if(!r) return;
  GP_RUBRIC.forEach(p=>{
    const got=pillarScore(r,p);
    const el=document.querySelector(`[data-sub="${p.p}"]`); if(el) el.innerHTML=`${got}<em>/${p.max}</em>`;
    const bar=document.querySelector(`#pil-${p.p} .bar i`); if(bar) bar.style.width=Math.round(got/p.max*100)+'%';
  });
  const g1=document.querySelector('[data-v="G1"]'); if(g1){ const v=g1Auto(r); g1.textContent=v; g1.classList.toggle('zero',v===0); }
  ['pA4','pA5','pD1'].forEach(id=>{ const el=document.querySelector(`[data-v="${id}"]`); if(el){ const v=psAuto(r,id); el.textContent=v; el.classList.toggle('zero',v===0);} });
  ['b1','b2'].forEach(id=>{ const el=document.querySelector(`[data-v="${id}"]`); if(el){ const v=bcAuto(r,id); el.textContent=v; el.classList.toggle('zero',v===0);} });
  const ps=$('#psT'); if(ps) ps.innerHTML=`${psTotal(r)}<em>/100</em>`;
  const bc=$('#bcT'); if(bc) bc.innerHTML=`${bcTotal(r)}<em>/100</em>`;
  const wk=$('#wkT'); if(wk) wk.innerHTML=`${wkAvg(r)}<em>/100</em>`;
  const sc=gpTotal(r), gr=gradeOf(sc,r.rf);
  document.querySelectorAll('.ring circle.fill').forEach(c=>{
    const p=GP_RUBRIC.find(x=>x.p===c.dataset.arc); if(!p) return;
    const seg=+c.dataset.seg, got=pillarScore(r,p)/p.max;
    c.setAttribute('stroke-dasharray', `${Math.max(0,seg*got).toFixed(2)} ${c.dataset.c}`);
  });
  const core=document.querySelector('.ring .core');
  if(core){ core.querySelector('.score').textContent=sc;
    const g=core.querySelector('.grade'); g.textContent='Grade '+gr; g.className='grade g'+gr;
    const cap=core.querySelector('.capped'); if(cap) cap.hidden = !r.rf.length; }
  document.querySelectorAll('.legend button').forEach(btn=>{
    const p=GP_RUBRIC.find(x=>x.p===btn.dataset.jump); if(p) btn.querySelector('b').textContent=`${pillarScore(r,p)}/${p.max}`;
  });
  $('#inspRight').innerHTML=`<span class="navscore"><span class="num">${sc}</span><span class="g g${gr}">${gr}</span></span>`;
  r.updatedAt=new Date().toISOString(); if(r.sync==='synced') r.sync='local';
  updateDot(); save();
}
function captureFix(){
  if(!navigator.geolocation){ toast('This phone cannot provide a location fix'); return; }
  $('#gpsTxt').textContent='Getting a fix…';
  navigator.geolocation.getCurrentPosition(pos=>{
    CUR.gpsFix={lat:pos.coords.latitude, lng:pos.coords.longitude, acc:pos.coords.accuracy, at:new Date().toISOString()};
    $('#gpsTxt').textContent=`${CUR.gpsFix.lat.toFixed(5)}, ${CUR.gpsFix.lng.toFixed(5)} · ±${Math.round(CUR.gpsFix.acc)} m`;
    save(); toast('Location recorded');
  }, err=>{ $('#gpsTxt').textContent='Could not get a fix — ' + err.message; }, {enableHighAccuracy:true, timeout:15000, maximumAge:30000});
}
$('#camIn').addEventListener('change', ev=>{
  const f=ev.target.files[0]; ev.target.value=''; if(!f||!CUR) return;
  if(CUR.photos.length>=14){ toast('All 14 photo points are covered'); return; }
  const img=new Image(), url=URL.createObjectURL(f);
  img.onload=()=>{
    const mx=900, sc=Math.min(1, mx/Math.max(img.width,img.height));
    const c=document.createElement('canvas'); c.width=Math.round(img.width*sc); c.height=Math.round(img.height*sc);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    const b64=c.toDataURL('image/jpeg',.6).split(',')[1];
    URL.revokeObjectURL(url);
    const push=(lat,lng)=>{ CUR.photos.push({ts:new Date().toISOString(), lat, lng, b64, point:PHOTO_POINTS[CUR.photos.length]||''});
      save(); if($('#phGrid')){ $('#phGrid').innerHTML=photosHTML(CUR); wirePhoto(); } toast('Photo added'); };
    if(navigator.geolocation) navigator.geolocation.getCurrentPosition(p=>push(p.coords.latitude,p.coords.longitude), ()=>push(null,null),
      {enableHighAccuracy:true, timeout:8000, maximumAge:60000});
    else push(null,null);
  };
  img.src=url;
});

/* ---------------- RECORDS ---------------- */
function renderRecords(){
  const rows=Object.values(DB.records).sort((a,b)=> b.ym.localeCompare(a.ym) || a.gp.localeCompare(b.gp));
  const pend=pendingCount();
  $('#recSub').textContent = rows.length ? `${rows.length} on this phone · ${pend} to sync` : 'Nothing recorded yet';
  $('#recSync').innerHTML = pend ? '<button id="btnSyncAll">Sync all</button>' : '';
  const b=$('#recBody');
  if(!rows.length){ b.innerHTML=emptyState('No records yet','Inspections you record appear here, and stay on the phone until you sync them.'); return; }
  b.innerHTML = `<div class="group"><div class="card">` + rows.map(r=>{
    const sc=gpTotal(r), gr=gradeOf(sc,r.rf);
    const badge = r.sync==='synced' ? '<span class="pill p-ok">Synced</span>' : '<span class="pill p-warn">On phone</span>';
    return `<div class="row tap" data-open="${esc(r.gp)}" data-ym="${r.ym}">
      <span class="grade g${gr}" style="font-size:14px;padding:3px 10px;min-width:44px;text-align:center">${sc}</span>
      <span class="lbl"><b>${esc(r.gp)}</b><span>${esc(monthName(r.ym))} · ${esc(r.mandal)}${r.photos.length?' · '+r.photos.length+' photos':''}</span></span>
      ${badge}<span class="chev"></span></div>`;
  }).join('') + `</div></div>
  <p style="font-size:12.5px;color:var(--ink3);padding:14px 20px 26px;line-height:1.5">Photos leave the phone once a record syncs, which frees storage. Sync the same day wherever there is signal.</p>`;
  b.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click',()=>openRecord(el.dataset.open, el.dataset.ym)));
  const sa=$('#btnSyncAll'); if(sa) sa.addEventListener('click', syncAll);
}
function updateDot(){ const n=pendingCount(); const d=$('#pendDot'); if(d) d.hidden=!n; }
async function syncOne(r){
  toast('Syncing ' + r.gp + '…', 6000);
  try{
    const ok=await pushRecord(r);
    if(ok===true){ toast('Synced'); renderRecords(); }
    else toast(ok);
  }catch(e){ toast(e.message||'Sync failed'); }
}
async function syncAll(){
  const pend=Object.values(DB.records).filter(r=>r.sync!=='synced');
  if(!pend.length){ toast('Nothing to sync'); return; }
  let ok=0;
  for(const r of pend){
    toast(`Syncing ${r.gp} (${ok+1} of ${pend.length})…`, 8000);
    try{ const res=await pushRecord(r); if(res===true) ok++; else { toast('Stopped at ' + r.gp + ' — ' + res, 4000); break; } }
    catch(e){ toast('Stopped at ' + r.gp + ' — ' + (e.message||'network'), 4000); break; }
  }
  renderRecords(); updateDot();
  if(ok) toast(`${ok} record${ok>1?'s':''} sent to the district`);
}
async function pushRecord(r){
  const sc=gpTotal(r);
  const payload={...r}; delete payload.photos;
  const summary={id:r.id, ym:r.ym, mandal:r.mandal, gp:r.gp, date:r.date, score:sc, grade:gradeOf(sc,r.rf),
    rf:r.rf.join(' '), psScore:psTotal(r), wkAvg:wkAvg(r), bcScore:bcTotal(r), status:'submitted',
    lat:r.gpsFix?r.gpsFix.lat:'', lng:r.gpsFix?r.gpsFix.lng:'', album:'',
    photoCount:r.photos.length, photoFolder:r.photoFolder, payload:JSON.stringify(payload)};
  const photos=r.photos.map((p,i)=>({name:`${r.gp}_${r.ym}_${String(i+1).padStart(2,'0')}.jpg`, b64:p.b64}));
  const resp=await post({kind:'inspection', token:DB.session.token, record:summary, photos});
  if(resp && resp.ok){ r.sync='synced'; r.photoFolder=resp.photoFolder||r.photoFolder; r.photos=[]; save(); updateDot(); return true; }
  return (resp && resp.error) || 'server refused';
}

/* ---------------- MORE ---------------- */
function renderMore(){
  const u=user();
  $('#moreSub').textContent = u.name;
  $('#moreBody').innerHTML = `
  <div class="group"><div class="hdr">Account</div><div class="card">
    <div class="row"><span class="ico" style="background:var(--brand)">${ICON.user}</span>
      <span class="lbl"><b>${esc(u.name)}</b><span>${esc(roleName(u.role))}${u.mandal?' · '+esc(u.mandal):''}</span></span></div>
    <div class="row"><span class="lbl"><b>Mobile</b></span><span class="val num">+91 ${esc(u.phone||'')}</span></div>
    ${myGps().length?`<div class="row"><span class="lbl"><b>Gram Panchayat${myGps().length>1?'s':''}</b><span>${esc(myGps().join(', '))}</span></span></div>`:''}
    <div class="row"><span class="lbl"><b>Session</b></span><span class="val">30 days</span></div>
  </div></div>

  ${(IOS && !STANDALONE) ? `<div class="group"><div class="hdr">Install</div><div class="card">
    <div class="row tap" id="mIos"><span class="ico" style="background:var(--gold)">${ICON.down}</span>
      <span class="lbl"><b>Add to Home Screen</b><span>Run full screen and keep records safely</span></span><span class="chev"></span></div>
  </div></div>` : ''}
  <div class="group"><div class="hdr">Data</div><div class="card">
    <div class="row tap" id="mPull"><span class="ico" style="background:var(--pB)">${ICON.down}</span>
      <span class="lbl"><b>Refresh village list</b><span>${(DB.master||[]).length} loaded</span></span><span class="chev"></span></div>
    <div class="row tap" id="mBackup"><span class="ico" style="background:var(--pG)">${ICON.file}</span>
      <span class="lbl"><b>Download a backup</b><span>Everything on this phone, as a file</span></span><span class="chev"></span></div>
  </div></div>

  <div class="group"><div class="hdr">Security</div><div class="card">
    <div class="row tap" id="mPin"><span class="ico" style="background:var(--gold)">${ICON.key}</span>
      <span class="lbl"><b>Change my PIN</b></span><span class="chev"></span></div>
    <div class="row tap" id="mOut"><span class="ico" style="background:var(--danger)">${ICON.out}</span>
      <span class="lbl"><b>Sign out</b><span>Unsynced records stay on the phone</span></span><span class="chev"></span></div>
  </div></div>

  <p style="font-size:12.5px;color:var(--ink3);text-align:center;padding:20px 24px 30px;line-height:1.55">
    SJ-SCORE Field · version 4.0<br>Collectorate, Jangaon · Rc.No.788/DPO/26/34</p>`;

  const iosRow = $('#mIos');
  if(iosRow) iosRow.addEventListener('click', ()=> $('#iosTip').classList.add('on'));
  $('#mPull').addEventListener('click', async ()=>{
    toast('Refreshing…');
    try{ const g=await get({op:'gps'}); if(g.ok){ DB.master=g.gps; save(); renderMore(); toast(g.gps.length + ' villages loaded'); } else toast(g.error||'Failed'); }
    catch(e){ toast(e.message); }
  });
  $('#mBackup').addEventListener('click', ()=>{
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(DB,null,1)],{type:'application/json'}));
    a.download='SJSCORE_backup_'+new Date().toISOString().slice(0,10)+'.json'; a.click(); toast('Backup saved');
  });
  $('#mPin').addEventListener('click', ()=>{
    showSheet(`<div style="padding:6px 16px 12px"><h2 style="font-size:21px;font-weight:700;letter-spacing:-.02em">Change my PIN</h2></div>
      <div class="group" style="margin-top:0"><div class="card">
        <div class="field"><label>Current PIN</label><input type="password" inputmode="numeric" id="cpOld"></div>
        <div class="field"><label>New PIN — at least four digits</label><input type="password" inputmode="numeric" id="cpNew"></div>
      </div><div class="msg" id="cpMsg"></div>
      <button class="btn" id="cpGo">Change PIN</button></div>`);
    $('#cpGo').addEventListener('click', async ()=>{
      $('#cpMsg').className='msg info'; $('#cpMsg').textContent='Changing…';
      try{ const r=await post({kind:'chpass', token:DB.session.token, old:$('#cpOld').value, newp:$('#cpNew').value});
        if(r.ok){ hideSheet(); toast('PIN changed'); } else { $('#cpMsg').className='msg'; $('#cpMsg').textContent=r.error||'Failed'; }
      }catch(e){ $('#cpMsg').className='msg'; $('#cpMsg').textContent='Cannot reach the server'; }
    });
  });
  $('#mOut').addEventListener('click', ()=>{
    const n=pendingCount();
    if(n && !confirm(n + ' record(s) are not yet synced. Sign out anyway?')) return;
    DB.session=null; save(); gate(); toast('Signed out');
  });
}

/* ---------------- icons ---------------- */
const ICON={
  check:'<svg viewBox="0 0 24 24"><path d="M9.6 16.2 5.4 12l-1.4 1.4 5.6 5.6 12-12-1.4-1.4z"/></svg>',
  pin:'<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5"/></svg>',
  flag:'<svg viewBox="0 0 24 24"><path d="M6 3v18h2v-7h9l-1.6-3.5L17 7H8V3z"/></svg>',
  cam:'<svg viewBox="0 0 24 24"><path d="M9.4 4 8 6H4.5A1.5 1.5 0 0 0 3 7.5v11A1.5 1.5 0 0 0 4.5 20h15a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 19.5 6H16l-1.4-2zm2.6 4.8a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4m0 2a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4"/></svg>',
  user:'<svg viewBox="0 0 24 24"><path d="M12 12a4.2 4.2 0 1 0 0-8.4A4.2 4.2 0 0 0 12 12m0 2c-3.6 0-7 1.8-7 4v2h14v-2c0-2.2-3.4-4-7-4"/></svg>',
  down:'<svg viewBox="0 0 24 24"><path d="M11 3v9.2L7.8 9 6.4 10.4 12 16l5.6-5.6L16.2 9 13 12.2V3zM5 18v2h14v-2z"/></svg>',
  file:'<svg viewBox="0 0 24 24"><path d="M6 2h8l5 5v15H6zm7 1.8V8h4.2z"/></svg>',
  key:'<svg viewBox="0 0 24 24"><path d="M14 3a6 6 0 0 0-5.7 7.9L3 16.2V21h4.8l1.4-1.4v-2h2v-2h2l1.1-1.1A6 6 0 1 0 14 3m1.6 2.6a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2"/></svg>',
  out:'<svg viewBox="0 0 24 24"><path d="M10 3H4v18h6v-2H6V5h4zm5.6 3.8L14.2 8.2 17 11H9v2h8l-2.8 2.8 1.4 1.4L21 12z"/></svg>',
  empty:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zm2 2v10h12V7z"/></svg>'
};

/* ---------------- boot ---------------- */
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
load();
if(SERVER_URL) DB.url=SERVER_URL;
gate();

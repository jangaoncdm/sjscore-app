/* DISTRICT HRMS — the employee's own app. Leave, and nothing else.
 *
 * Ordered 05.10.2026. It is its OWN page and not a third copy of the field
 * app: that app carries nineteen tenant branches and an attendance gate that
 * four hundred and eighteen serving officers depend on every morning, and
 * adding a third register to it would put their register at risk to give this
 * one a screen it does not need. Everything here is leave.
 *
 * THE PIN IS THE EMPLOYEE'S. The district seeds the establishment and he
 * claims his own row the first time, with the employee id his office holds.
 * The server decides all of it (rule 6); this page only asks.
 *
 * AND IT IS HONEST ABOUT THE NETWORK. The field app marks attendance offline
 * because a mark is a fact the handset can hold until there is a line. An
 * application for leave is not: it is a request for orders, and queueing one
 * silently would have an employee believe he had applied when the district
 * had never heard of it. So this says plainly when it cannot reach the
 * register, and nothing is ever shown as sent that was not.
 */
'use strict';

var SERVER = (typeof window !== 'undefined' && window.SJGP_SERVER) || '';
var STORE = 'sjgp-hrms1';          /* browser storage is per DOMAIN, not per
                                      folder: three apps on one origin need
                                      three keys or they sign each other out */

var $ = function(id){ return document.getElementById(id); };
var DB = { url:SERVER, session:null, me:null, rows:[], ent:null, at:'' };

/* ------------------------------------------------------------------ store */
function load(){
  try{ DB = JSON.parse(localStorage.getItem(STORE) || 'null') || DB; }catch(e){}
  /* THE ADDRESS THE DISTRICT PUBLISHES BEATS THE ONE A PHONE REMEMBERED.
     The field app learned this the hard way: an address stored once lived on
     for ever, and a button pressed today called a deployment made weeks ago. */
  if(SERVER) DB.url = SERVER;
  DB.rows = DB.rows || [];
}
function save(){ try{ localStorage.setItem(STORE, JSON.stringify(DB)); }catch(e){} }

/* ------------------------------------------------------------------- wire */
function post(body){
  return fetch(DB.url, { method:'POST',
    headers:{ 'Content-Type':'text/plain;charset=utf-8' },
    body:JSON.stringify(body) }).then(function(r){ return r.json(); });
}
function get(params){
  var q = Object.keys(params).map(function(k){
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
  return fetch(DB.url + '?' + q + '&t=' + Date.now(), { cache:'no-store' })
    .then(function(r){ return r.json(); });
}
function say(el, kind, text){
  var m = $(el);
  m.className = 'msg on ' + kind;
  m.textContent = text;
}
function clear(el){ var m = $(el); m.className = 'msg'; m.textContent = ''; }
function busy(b, on, word){
  b.disabled = on;
  if(on){ b.dataset.was = b.textContent; b.textContent = word || 'Working…'; }
  else if(b.dataset.was) b.textContent = b.dataset.was;
}

function show(v){
  ['vSignin','vClaim','vHome','vApply'].forEach(function(x){
    $(x).classList.toggle('hide', x !== v); });
  window.scrollTo(0, 0);
}

/* ---------------------------------------------------------------- sign in */
function signIn(){
  var b = $('bSignin'), ph = $('iPhone').value.replace(/\D/g, '').slice(-10), pin = $('iPin').value.trim();
  clear('mSignin');
  if(ph.length !== 10) return say('mSignin', 'bad', 'A mobile number is ten digits.');
  busy(b, true, 'Signing in…');
  post({ kind:'login', u:ph, p:pin })
    .then(function(r){
      busy(b, false);
      /* HIS ROW IS HIS TO CLAIM, and the register says so rather than sending
         five thousand people to telephone an office on the first morning. */
      if(r && r.needPin){
        $('claimName').textContent = r.name ? 'Welcome, ' + r.name : 'Choose your PIN';
        $('cEmp').value = ''; $('cPin').value = ''; $('cPin2').value = '';
        clear('mClaim');
        show('vClaim');
        return;
      }
      if(!r || !r.ok) return say('mSignin', 'bad', (r && r.error) || 'The district did not answer.');
      DB.session = { token:r.token, user:r.user };
      save();
      $('iPin').value = '';
      home(true);
    })
    .catch(function(){ busy(b, false);
      say('mSignin', 'bad', 'The district could not be reached. Try again where there is a line.'); });
}

function claim(){
  var b = $('bClaim');
  var ph = $('iPhone').value.replace(/\D/g, '').slice(-10);
  var emp = $('cEmp').value.trim(), p1 = $('cPin').value.trim(), p2 = $('cPin2').value.trim();
  clear('mClaim');
  if(!emp) return say('mClaim', 'bad', 'Your employee id, or the enrolment code your office was given for you, is needed — it is how the register knows the number is yours.');
  if(!/^\d{4,8}$/.test(p1)) return say('mClaim', 'bad', 'A PIN is four to eight digits.');
  if(p1 !== p2) return say('mClaim', 'bad', 'The two PINs are not the same.');
  busy(b, true, 'Setting…');
  post({ kind:'claimPin', u:ph, emp:emp, pin:p1 })
    .then(function(r){
      busy(b, false);
      if(!r || !r.ok) return say('mClaim', 'bad', (r && r.error) || 'The district did not answer.');
      DB.session = { token:r.token, user:r.user };
      save();
      home(true);
    })
    .catch(function(){ busy(b, false);
      say('mClaim', 'bad', 'The district could not be reached. Try again where there is a line.'); });
}

/* ------------------------------------------------------------------- home */
function home(pull){
  if(!DB.session) return show('vSignin');
  var u = DB.session.user || {};
  $('hName').textContent = String(u.name || '').replace(/,.*$/, '');
  $('hWho').textContent = [u.desig || roleName(u.role), u.mandal].filter(Boolean).join(' · ');
  show('vHome');
  draw();
  if(pull !== false) refresh();
}
function roleName(r){
  return r === 'HOD' ? 'Head of office' : r === 'COLLECTOR' ? 'Collector' : 'Employee';
}
function refresh(){
  if(!DB.session) return;
  get({ op:'hrms', token:DB.session.token })
    .then(function(r){
      if(!r || !r.ok) return;
      DB.rows = r.rows || []; DB.ent = r.entitlement || null;
      DB.me = r.me || null; DB.at = new Date().toISOString();
      save(); draw();
    })
    .catch(function(){});
}

var LEAVE_NAME = { CL:'Casual leave', EL:'Earned leave', ML:'Medical leave',
                   HQ:'Permission to leave headquarters', OH:'Optional holiday' };

function used(type, year){
  /* ONE APPLICATION IS ONE LINE, and a withdrawn or refused one is not leave
     taken. The twin-row rule of 25.08.2026 is folded by the register before
     these rows ever reach this page. */
  var n = 0;
  (DB.rows || []).forEach(function(r){
    if(String(r.type).toUpperCase() !== type) return;
    if(String(r.status).toUpperCase() !== 'APPROVED') return;
    if(String(r.fromDate || '').slice(0, 4) !== String(year)) return;
    n += Number(r.days) || 0;
  });
  return n;
}
function draw(){
  var year = new Date().getFullYear();
  var ent = DB.ent || {};
  var bal = $('hBal');
  var keys = Object.keys(ent).filter(function(k){ return k !== 'HQ'; });
  bal.innerHTML = keys.length ? keys.map(function(k){
    var cap = Number(ent[k]) || 0, u = used(k, year);
    /* MEDICAL LEAVE ANSWERS TO NO YEARLY FIGURE, so it is never shown as a
       balance — a nought there reads as "none left", which is the opposite of
       what the rule says. */
    var right = cap ? (Math.max(0, cap - u) + ' left of ' + cap) : (u + ' taken · no yearly limit');
    return '<div><b>' + (cap ? Math.max(0, cap - u) : u) + '</b><span>' +
           esc(LEAVE_NAME[k] || k) + '<br>' + esc(right) + '</span></div>';
  }).join('') : '<div class="empty" style="grid-column:1/-1">Not read from the district yet.</div>';

  var list = $('hList'), rows = (DB.rows || []).slice().sort(function(a, b){
    return String(b.fromDate).localeCompare(String(a.fromDate)); });
  list.innerHTML = rows.length ? rows.map(function(r){
    var st = String(r.status || 'PENDING').toUpperCase();
    var pill = st === 'APPROVED' ? 'ok' : st === 'REJECTED' ? 'bad'
             : st === 'WITHDRAWN' ? 'mut' : 'warn';
    var word = st === 'PENDING' ? 'awaiting orders' : st.toLowerCase();
    return '<div class="app"><div class="t"><b>' + esc(LEAVE_NAME[String(r.type).toUpperCase()] || r.type) +
      '</b><span class="pill ' + pill + '">' + esc(word) + '</span></div>' +
      '<div class="d">' + esc(dmy(r.fromDate)) + ' to ' + esc(dmy(r.toDate)) +
      ' · ' + (Number(r.days) || 0) + ' day(s)' +
      (r.reason ? '<br>' + esc(r.reason) : '') +
      (st === 'REJECTED' && r.remarks ? '<br><b>' + esc(r.remarks) + '</b>' : '') +
      '</div></div>';
  }).join('') : '<div class="empty">Nothing yet.</div>';
}
function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; });
}
function dmy(d){
  var p = String(d || '').split('-');
  return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : String(d || '');
}

/* ------------------------------------------------------------------ apply */
function openApply(){
  var sel = $('aType'), ent = DB.ent || { CL:15, EL:30, ML:0, HQ:0 };
  sel.innerHTML = Object.keys(ent).map(function(k){
    return '<option value="' + k + '">' + esc(LEAVE_NAME[k] || k) + '</option>'; }).join('');
  $('aFrom').value = ''; $('aTo').value = ''; $('aReason').value = ''; $('aAddr').value = '';
  clear('mApply');
  note();
  show('vApply');
}
/* WHAT THIS APPLICATION WOULD LEAVE HIM, against the dates he has actually
   picked — the rule the leave card carries on the other registers. The
   district still refuses at sanction anything that would breach the year;
   this is so he knows before he asks. */
function note(){
  var t = $('aType').value, f = $('aFrom').value, to = $('aTo').value;
  var ent = DB.ent || {}, cap = Number(ent[t]) || 0;
  var year = (f || '').slice(0, 4) || String(new Date().getFullYear());
  var n = days(f, to);
  var bits = [];
  if(n) bits.push(n + ' day(s)');
  if(cap){
    var left = Math.max(0, cap - used(t, year));
    bits.push(n ? (n <= left ? 'this would leave you ' + (left - n) + ' of ' + cap
                             : 'you have ' + left + ' left of ' + cap + ' — this asks for more')
                : left + ' left of ' + cap + ' this year');
  } else if(t === 'ML'){
    bits.push('medical leave answers to no yearly figure, but a spell of it is capped');
  } else if(t === 'HQ'){
    bits.push('a permission, not leave — nothing is debited');
  }
  $('aNote').textContent = bits.join(' · ') || 'Pick the dates.';
}
function days(f, t){
  if(!f || !t) return 0;
  var a = new Date(f + 'T00:00:00'), b = new Date(t + 'T00:00:00');
  if(isNaN(a) || isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}
function send(){
  var b = $('bSend');
  var t = $('aType').value, f = $('aFrom').value, to = $('aTo').value;
  clear('mApply');
  if(!f || !to) return say('mApply', 'bad', 'Both dates are needed.');
  if(days(f, to) < 1) return say('mApply', 'bad', 'The last day falls before the first.');
  if(!$('aReason').value.trim()) return say('mApply', 'bad', 'A reason is needed — the orders are passed on it.');
  busy(b, true, 'Sending…');
  /* EVERY SUBMISSION CARRIES A FRESH ID (rule 5), so a double tap raises two
     independent applications and the SERVER refuses the overlap — and a
     re-send of the SAME id is a retry and is written once. */
  post({ kind:'leave', token:DB.session.token, leave:{
    id:'HR-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    type:t, from:f, to:to, days:days(f, to),
    reason:$('aReason').value.trim(), address:$('aAddr').value.trim() } })
    .then(function(r){
      busy(b, false);
      if(!r || !r.ok) return say('mApply', 'bad', (r && r.error) || 'The district did not answer.');
      say('mApply', 'ok', 'Sent for orders.');
      refresh();
      setTimeout(function(){ home(false); refresh(); }, 700);
    })
    .catch(function(){ busy(b, false);
      /* NOTHING IS SHOWN AS SENT THAT WAS NOT. An application is a request for
         orders, not a fact a handset can hold. */
      say('mApply', 'bad', 'It did not reach the district, so nothing has been applied for. ' +
        'Try again where there is a line.'); });
}

/* ------------------------------------------------------------------- boot */
load();
$('bSignin').addEventListener('click', signIn);
$('iPin').addEventListener('keydown', function(e){ if(e.key === 'Enter') signIn(); });
$('bClaim').addEventListener('click', claim);
$('bClaimBack').addEventListener('click', function(){ show('vSignin'); });
$('bApply').addEventListener('click', openApply);
$('bCancel').addEventListener('click', function(){ home(false); });
$('bSend').addEventListener('click', send);
$('bRefresh').addEventListener('click', refresh);
['aType','aFrom','aTo'].forEach(function(id){ $(id).addEventListener('change', note); });
$('bOut').addEventListener('click', function(){
  DB.session = null; DB.rows = []; DB.me = null; save();
  $('iPhone').value = ''; $('iPin').value = '';
  show('vSignin');
});

if(!DB.url){
  show('vSignin');
  say('mSignin', 'bad', 'This app has no district address. config.js has not been written — see DEPLOY-HRMS.md.');
} else if(DB.session && DB.session.token){
  home(true);
} else {
  show('vSignin');
}

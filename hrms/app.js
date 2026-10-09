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
var DB = { url:SERVER, session:null, me:null, rows:[], ent:null, at:'', pend:[], pendAll:0 };

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

/* NOBODY IS EVER SHOWN THE WORD 'auth'.
   It is the register's internal word for "this token is not one of mine", and
   it was being printed to the screen exactly as it arrived — reported from the
   district on 09.10.2026 as "i am getting auth error", which is the whole of
   what the app told him. It says nothing about what happened and nothing about
   what to do, and it is the same uselessness as a decoder that says only "no
   code found".

   AND A REJECTED TOKEN IS TAKEN OFF THE HANDSET. A session the district will
   not accept is not a session; leaving it in the store means every screen goes
   on sending it and every screen goes on failing, and the man has no way back
   to the sign-in he needs. He loses nothing — the token is all that is
   dropped, never his unsent work. */
var AUTH_GONE = 'This device is no longer signed in to the register — the sign-in had '
              + 'expired, or it was made before the register was stood up. Sign in again '
              + 'below; nothing of yours is lost.';

/* A TOKEN THE REGISTER WILL NOT TAKE IS NOT A MESSAGE, IT IS A STATE.
   Printing the word was only half the fault. refresh() swallowed a refusal
   whole — `if(!r || !r.ok) return;` — so a handset carrying a dead session sat
   on a home screen that never updated, never explained itself, and offered no
   way back to the sign-in it needed, because home() shows the sign-in screen
   only when there is no session at all. Every screen went on sending the same
   token and every screen went on failing in silence.

   So the session comes off the handset and he is put back where he can do
   something. He loses the token and nothing else. */
function tokenRefused(r){
  if(!r || String(r.error || '') !== 'auth') return false;
  DB.session = null; DB.me = null; DB.pend = []; DB.pendAll = 0;
  save();
  show('vSignin');
  say('mSignin', 'bad', AUTH_GONE);
  return true;
}
/* and nobody is ever shown the register's own word for it */
function errText(r){
  var e = String((r && r.error) || '');
  if(e === 'auth') return AUTH_GONE;
  return e || 'The district did not answer.';
}

/* ------------------------------------------------------------------- wire */
/* AN APP WITH NO ADDRESS MUST NOT BLAME THE OFFICER'S SIGNAL.
   The boot guard says plainly that config.js has not been written — and then
   the employee presses the only button on the screen, the POST goes to the
   page itself, the browser answers 405, and the catch replaces that honest
   sentence with 'Try again where there is a line.' He is then told the fault
   is his network, on a register that was never stood up, and he will try
   again at a better signal for ever. Rendered against the live /hrms/ with
   no config published, which is exactly the state the printed install card
   sends him to today.

   It RESOLVES rather than rejects, with the shape every caller here already
   reads — `if(!r || !r.ok) … r.error` — so sign-in, the claim, the refresh,
   the application and the Collector's orders all say the true thing without
   one of them being touched. */
var NO_ADDR = 'This app has no district address yet, so there is nothing to sign in to. ' +
              'It is not your signal — the register has not been stood up.';
function post(body){
  if(!DB.url) return Promise.resolve({ ok:false, error:NO_ADDR });
  return fetch(DB.url, { method:'POST',
    headers:{ 'Content-Type':'text/plain;charset=utf-8' },
    body:JSON.stringify(body) }).then(function(r){ return r.json(); });
}
function get(params){
  if(!DB.url) return Promise.resolve({ ok:false, error:NO_ADDR });
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
  /* EVERY SCREEN, OR THE ONE LEFT OUT NEVER OPENS. vOrders was added and not
     listed here: its contents rendered, its buttons were in the DOM and
     bound, and the section stayed hidden — the same shape of silence as a
     parser declared inside the function that draws its panel. */
  ['vSignin','vClaim','vHome','vOrders','vApply'].forEach(function(x){
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
      if(!r || !r.ok) return say('mSignin', 'bad', errText(r));
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
      if(!r || !r.ok){ if(tokenRefused(r)) return; return say('mClaim', 'bad', errText(r)); }
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
  /* THE ORDERS ARE THE COLLECTOR'S. The button is hidden from everyone else
     as a courtesy; op=hrmsPending and leaveDecision both re-check the role on
     the server, because hiding a button is not a rule (rule 6). */
  $('bOrders').className = canOrder() ? 'btn' : 'btn hide';
  show('vHome');
  draw();
  if(pull !== false) refresh();
}
function canOrder(){
  return String(((DB.session || {}).user || {}).role || '').toUpperCase() === 'COLLECTOR';
}
function roleName(r){
  return r === 'HOD' ? 'Head of office' : r === 'COLLECTOR' ? 'Collector' : 'Employee';
}
function refresh(){
  if(!DB.session) return;
  get({ op:'hrms', token:DB.session.token })
    .then(function(r){
      if(!r || !r.ok){ tokenRefused(r); return; }
      DB.rows = r.rows || []; DB.ent = r.entitlement || null;
      DB.me = r.me || null; DB.at = new Date().toISOString();
      save(); draw();
    })
    .catch(function(){});
  if(canOrder()) pending();
}

/* ---------------------------------------------------- the Collector's orders
   Every order on every one of these registers is passed in the app —
   leaveDecision has always been the field app's, and the console only shows
   the waiting list. This app had none, so there was no way on earth to
   sanction a single application on the register whose whole purpose is leave.

   THE LIST IS BOUNDED (op=hrmsPending walks the tail), because the console's
   own payload reads the Leave tab whole, which is right at 284 officers and is
   not at five thousand. */
function pending(){
  if(!DB.session || !canOrder()) return;
  get({ op:'hrmsPending', token:DB.session.token })
    .then(function(r){
      if(!r || !r.ok) return;
      /* HOW MANY ARE WAITING IN ALL, not merely how many fit. The server
         sends the oldest 300 and counts the rest, and the screen threw that
         count away — so a desk 450 deep read as 300, and by the order of
         08.10.2026 the Collector is the only person who may sanction any of
         them, so he would have believed he had seen his whole desk. */
      DB.pend = r.rows || []; DB.pendAll = Number(r.total) || DB.pend.length;
      save(); drawOrders();
    })
    .catch(function(){});
}
function drawOrders(){
  var n = (DB.pend || []).length;
  var b = $('bOrdersN'); if(b) b.textContent = n ? '  ·  ' + n : '';
  var c = $('oCount');
  var tot = Math.max(Number(DB.pendAll) || 0, n);
  if(c) c.textContent = !n ? 'Nothing is waiting.'
      : tot > n ? tot + ' waiting in all · the oldest ' + n + ' are shown, and more come up as you pass them'
                : n + ' application' + (n === 1 ? '' : 's') + ' on your desk';
  var all = $('bAll'); if(all) all.className = n > 1 ? 'btn' : 'btn hide';
  var list = $('oList'); if(!list) return;
  list.innerHTML = n ? DB.pend.map(function(r){
    var waited = Math.round((Date.now() - new Date(r.appliedAt).getTime()) / 36e5);
    return '<div class="app"><div class="t"><b>' + esc(r.name || r.phone) + '</b>' +
      '<span class="pill warn">' + (isFinite(waited) ? waited + 'h' : 'waiting') + '</span></div>' +
      '<div class="d">' + esc([r.desig, r.office].filter(Boolean).join(' · ')) +
      (r.desig || r.office ? '<br>' : '') +
      esc(LEAVE_NAME[String(r.type).toUpperCase()] || r.type) + ' · ' +
      esc(dmy(r.fromDate)) + ' to ' + esc(dmy(r.toDate)) + ' · ' + (Number(r.days) || 0) + ' day(s)' +
      (r.reason ? '<br>' + esc(r.reason) : '') + '</div>' +
      '<div class="row2" style="margin-top:9px">' +
      '<button class="btn" data-ok="' + esc(r.id) + '">Sanction</button>' +
      '<button class="btn ghost" data-no="' + esc(r.id) + '">Refuse</button>' +
      '</div></div>';
  }).join('') : '<div class="empty">Nothing waiting.</div>';

  list.querySelectorAll('[data-ok]').forEach(function(el){
    el.addEventListener('click', function(){ order(el.getAttribute('data-ok'), 'APPROVED', ''); }); });
  list.querySelectorAll('[data-no]').forEach(function(el){
    el.addEventListener('click', function(){
      /* A REFUSAL CARRIES ITS OWN WORDS. They travel back to the employee and
         stand on the register, so they cannot be empty. */
      var why = window.prompt('Why is it refused? These words go to the employee and onto the register.');
      if(why == null) return;
      if(!String(why).trim()) return say('mOrders', 'bad', 'A refusal needs its reason — it is what the employee is told.');
      order(el.getAttribute('data-no'), 'REJECTED', String(why).trim());
    }); });
}
function order(id, status, remarks){
  clear('mOrders');
  post({ kind:'leaveDecision', token:DB.session.token, id:id, status:status, remarks:remarks })
    .then(function(r){
      if(!r || !r.ok){ if(tokenRefused(r)) return; return say('mOrders', 'bad', errText(r)); }
      say('mOrders', 'ok', status === 'APPROVED' ? 'Sanctioned.' : 'Refused, and the employee is told why.');
      pending();
    })
    /* A LOST LINE IS NOT PROOF THAT NO ORDER WAS PASSED, and a single order
       is no different from a batch: the write may have gone through and only
       the answer been lost on the way back, and on a register that debits a
       man's casual leave an assurance of that kind must not be invented. The
       register is re-read, which is the only thing that knows. */
    .catch(function(){
      say('mOrders', 'bad', 'The line dropped before the district answered, so it is NOT KNOWN ' +
        'whether this order was passed. The list is re-read below; if the application is still ' +
        'on it, no order has been passed on it.');
      pending();
    });
}
/* SANCTION ALL IS SENT IN BATCHES, and that is not an optimisation.

   By the Collector's order of 08.10.2026 every application in the district
   comes to him, so this is the ordinary path and not the rare one.
   decideOneLeave_ re-reads the Leave tab and writes four cells for each
   application in turn, so two hundred in one request is minutes of Apps
   Script time on a register carrying thousands of leave rows — and
   leaveDecision slices b.ids to 200 regardless, so 'Sanction all 300' passed
   two hundred and said nothing whatever about the other hundred. Batches of
   twenty-five keep every request well inside the limits, move the count while
   he waits, and cost only their own batch when one fails.

   AND A FAILED BATCH IS NEVER REPORTED AS 'NOTHING WAS PASSED'. The old
   message asserted exactly that, which on a timeout is a false assurance
   about casual leave already debited: the orders may well have been written
   and only the answer lost on the way back. It now says what is certain, says
   plainly what is not, and re-reads the register — which is the only thing
   that actually knows. */
var ORDER_BATCH = 25;
function orderAll(){
  var ids = (DB.pend || []).map(function(r){ return r.id; })
            .filter(function(x){ return !!String(x || '').trim(); });
  if(!ids.length) return;
  var tot = Math.max(Number(DB.pendAll) || 0, ids.length);
  if(!window.confirm('Sanction ' + ids.length + ' of them?\n\n' +
    (tot > ids.length ? tot + ' are waiting in all; these are the oldest ' + ids.length +
      '. The rest come up when you refresh.\n\n' : '') +
    'Each still answers its own checks in turn, so one that cannot be sanctioned is refused BY NAME ' +
    'and stays waiting for your own look. Refusals are never passed this way.')) return;
  clear('mOrders');
  var b = $('bAll'); busy(b, true, 'Passing\u2026');

  var done = 0, refused = [], sent = 0;
  function finish(lost){
    busy(b, false);
    var bits = [];
    if(done) bits.push(done + ' sanctioned');
    if(refused.length) bits.push(refused.length + ' could not be and are still waiting (' +
      refused.slice(0, 3).map(function(x){ return x.error; }).join('; ') +
      (refused.length > 3 ? '; \u2026' : '') + ')');
    /* NEVER 'NO ORDER HAS BEEN PASSED' when we cannot know it */
    if(lost) bits.push('AND ' + lost + ' COULD NOT BE CONFIRMED \u2014 the district may or may not ' +
      'have passed them before the line dropped. The list below is re-read from the register, ' +
      'which is the only thing that knows; whatever is still on it was not sanctioned.');
    say('mOrders', lost ? 'bad' : refused.length ? 'info' : 'ok',
        bits.join(' · ') || 'Nothing was passed.');
    pending();
  }
  function step(){
    if(sent >= ids.length) return finish(0);
    var part = ids.slice(sent, sent + ORDER_BATCH);
    sent += part.length;
    say('mOrders', 'info', 'Passing orders\u2026 ' + sent + ' of ' + ids.length + '.');
    return post({ kind:'leaveDecision', token:DB.session.token, ids:part, status:'APPROVED' })
      .then(function(r){
        if(!r || !r.ok){
          /* the district ANSWERED and refused the batch, so nothing of it was
             written — that is certain, and not the same as a lost line */
          refused.push({ error:errText(r) });
          return finish(0);
        }
        done += Number(r.done) || 0;
        refused = refused.concat(r.refused || []);
        return step();
      })
      .catch(function(){ return finish(part.length); });
  }
  step();
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
  $('aHq').checked = false; $('aCert').value = '';
  certBox();
  clear('mApply');
  note();
  show('vApply');
}
/* THE CERTIFICATE IS ASKED FOR ONLY WHERE IT IS WANTED. A form that asks
   everybody for a medical certificate is a form that teaches people to leave
   boxes empty, and an empty box on an application that NEEDED one is worse
   than no box at all. */
function certBox(){
  var ml = $('aType').value === 'ML';
  $('aCertWrap').className = ml ? '' : 'hide';
  if(!ml) $('aCert').value = '';
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
    reason:$('aReason').value.trim(), address:$('aAddr').value.trim(),
    hq:$('aHq').checked === true, cert:$('aCert').value.trim() } })
    .then(function(r){
      busy(b, false);
      if(!r || !r.ok){ if(tokenRefused(r)) return; return say('mApply', 'bad', errText(r)); }
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
$('bOrders').addEventListener('click', function(){ show('vOrders'); drawOrders(); pending(); });
$('bOrdersBack').addEventListener('click', function(){ home(false); });
$('bAll').addEventListener('click', orderAll);
$('bCancel').addEventListener('click', function(){ home(false); });
$('bSend').addEventListener('click', send);
$('bRefresh').addEventListener('click', refresh);
['aType','aFrom','aTo'].forEach(function(id){ $(id).addEventListener('change', note); });
$('aType').addEventListener('change', certBox);
$('bOut').addEventListener('click', function(){
  DB.session = null; DB.rows = []; DB.me = null; DB.pend = []; DB.pendAll = 0; save();
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

/* DISTRICT HRMS — the employee's own app. Leave, and since 19.10.2026 a
 * voluntary attendance mark.
 *
 * Ordered 05.10.2026; rebuilt 18.10.2026 on the draft the Collector passed
 * that morning: "move forward with that, use motion animation as stated in
 * welcome page and create entire app", and the same hour, "heatmap to each
 * head of office related to their officers in leave and also to collector on
 * homescreen".
 *
 * It is its OWN page and not a third copy of the field app: that app carries
 * nineteen tenant branches and an attendance gate that four hundred serving
 * officers depend on every morning. Everything here is leave.
 *
 * THE SERVER DECIDES (rule 6). Every figure on the rail is the register's —
 * op=hrms answers his account from the same leaveOpening_ the sanction is
 * measured against — and this page only asks. Where it works something out
 * for itself (the days between two dates, what a request would leave him) it
 * is so he knows before he asks; the district still refuses at sanction.
 *
 * AND IT IS HONEST ABOUT THE NETWORK. An application for leave is a request
 * for orders, not a fact a handset can hold, so nothing is queued and nothing
 * is ever shown as sent that the district did not take.
 */
'use strict';

var APP_VERSION = '2.1.0';
var SERVER = (typeof window !== 'undefined' && window.SJGP_SERVER) || '';
var STORE = 'sjgp-hrms1';          /* browser storage is per DOMAIN, not per
                                      folder: three apps on one origin need
                                      three keys or they sign each other out.
                                      The console reads this key for the
                                      Collector's HRMS sign-in, so it stays. */

var $ = function(id){ return document.getElementById(id); };
var DB = { url:SERVER, session:null, me:null, rows:[], account:null, record:null, holidays:{}, today:'',
           at:'', pend:[], pendAll:0, cal:null, calAt:'', att:{}, attD:null };
/* what the screen is doing — never saved, never the register's */
var S = { screen:'signin', tab:'home', req:null, calM:0, calY:0, hmM:0, hmY:0, hmScope:'office', detail:null, myM:null, busy:false };

/* INSTALLING IT BESIDE THE OTHER TWO. Chrome offers to install a page only
   when no installed app already claims its address: the sanitation app at
   the root of this site claimed everything beneath it, so a phone carrying
   SJGP was offered "open in SJGP" here and never "install". Its scope is its
   one page now (manifest.webmanifest at the root, 18.10.2026). The prompt
   Chrome then fires is kept and offered as a row of this app's own, and an
   iPhone, which fires none, is told the two taps. */
var STANDALONE = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
var IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
var INSTALL_EVT = null;
window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); INSTALL_EVT = e; if(/^(home|me)$/.test(S.screen)) render(); });
window.addEventListener('appinstalled', function(){ INSTALL_EVT = null; if(/^(home|me)$/.test(S.screen)) render(); });
function canInstall(){ return !STANDALONE && (!!INSTALL_EVT || IOS); }
function installRow(){
  if(!canInstall()) return '';
  return '<button class="row" data-act="install"><span class="lead pri">' + I.plus + '</span><span class="txt"><b>Add to Home Screen</b><span>Opens like an app, with no address bar</span></span><span class="chev"></span></button>';
}
function install(){
  if(INSTALL_EVT){ var ev = INSTALL_EVT; INSTALL_EVT = null; ev.prompt(); ev.userChoice.then(function(){ render(); }).catch(function(){}); return; }
  if(IOS) sheet('<h2>Add to Home Screen</h2><p>In Safari, tap the Share button at the foot of the screen, then <b>Add to Home Screen</b>, then <b>Add</b>. The app opens from your home screen like any other.</p><button class="btn text" data-close="1">Close</button>');
}

/* ------------------------------------------------------------------ store */
function load(){
  try{ DB = Object.assign(DB, JSON.parse(localStorage.getItem(STORE) || 'null') || {}); }catch(e){}
  /* THE ADDRESS THE DISTRICT PUBLISHES BEATS THE ONE A PHONE REMEMBERED. */
  if(SERVER) DB.url = SERVER;
  DB.rows = DB.rows || []; DB.pend = DB.pend || []; DB.holidays = DB.holidays || {}; DB.att = DB.att || {};
}
function save(){ try{ localStorage.setItem(STORE, JSON.stringify(DB)); }catch(e){} }

/* NOBODY IS EVER SHOWN THE WORD 'auth', and A REJECTED TOKEN IS TAKEN OFF THE
   HANDSET — a session the district will not accept is not a session, and
   leaving it in the store means every screen goes on failing with no way back
   to the sign-in he needs. He loses the token and nothing else. */
var AUTH_GONE = 'This device is no longer signed in to the register — the sign-in had '
              + 'expired, or it was made before the register was stood up. Sign in again '
              + 'below; nothing of yours is lost.';
function tokenRefused(r){
  if(!r || String(r.error || '') !== 'auth') return false;
  DB.session = null; DB.me = null; DB.pend = []; DB.pendAll = 0; DB.cal = null;
  save();
  go('signin');
  say('mSignin', 'bad', AUTH_GONE);
  return true;
}
function errText(r){
  var e = String((r && r.error) || '');
  if(e === 'auth') return AUTH_GONE;
  return e || 'The district did not answer.';
}

/* ------------------------------------------------------------------- wire */
/* AN APP WITH NO ADDRESS MUST NOT BLAME THE OFFICER'S SIGNAL: it resolves
   rather than rejects, with the shape every caller reads. */
var NO_ADDR = 'This app has no district address yet, so there is nothing to sign in to. ' +
              'It is not your signal — the register has not been stood up.';
function post(body){
  if(!DB.url) return Promise.resolve({ ok:false, error:NO_ADDR });
  return fetch(DB.url, { method:'POST', headers:{ 'Content-Type':'text/plain;charset=utf-8' },
    body:JSON.stringify(body) }).then(function(r){ return r.json(); });
}
function get(params){
  if(!DB.url) return Promise.resolve({ ok:false, error:NO_ADDR });
  var q = Object.keys(params).map(function(k){
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
  return fetch(DB.url + '?' + q + '&t=' + Date.now(), { cache:'no-store' }).then(function(r){ return r.json(); });
}
function say(el, kind, text){ var m = $(el); if(!m) return; m.className = 'msg on ' + kind; m.textContent = text; }
function clear(el){ var m = $(el); if(!m) return; m.className = 'msg'; m.textContent = ''; }
function busy(b, on, word){
  if(!b) return;
  b.disabled = on;
  if(on){ b.dataset.was = b.textContent; b.textContent = word || 'Working…'; }
  else if(b.dataset.was) b.textContent = b.dataset.was;
}
function toast(t){ var e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function(){ e.classList.remove('on'); }, 2600); }

/* ------------------------------------------------------------- the words */
var KIND_NAME = { CL:'Casual leave', EL:'Earned leave', HPL:'Half pay leave', OH:'Optional holiday',
                  CCL:'Child care leave', ML:'Medical leave', HQ:'Permission to leave headquarters' };
var KIND_ORDER = ['CL','EL','HPL','OH','CCL','ML','HQ'];
var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var MONL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
/* Annexure-II of G.O.Rt.No.1715 dt. 06.12.2025 — the only dates an optional
   holiday may name; the register's copy of the same list refuses any other */
var TS_OPTIONAL_2026 = {
  '2026-01-01':'New Year Day', '2026-01-03':'Birthday of Hazrath Ali (R.A)', '2026-01-16':'Kanumu',
  '2026-01-17':'Shab-e-Meraj', '2026-01-23':'Sri Panchami', '2026-02-04':'Shab-e-Barat',
  '2026-03-10':'Shahadat Hzt Ali (R.A.)', '2026-03-13':'Jumuatul Wada', '2026-03-17':'Shab-e-Qader',
  '2026-03-31':'Mahaveer Jayanthi', '2026-04-14':'Tamil New Year’s Day', '2026-04-20':'Basava Jayanthi',
  '2026-05-01':'Buddha Purnima', '2026-06-04':'Eid-e-Ghadeer', '2026-06-25':'9th Moharram',
  '2026-07-16':'Ratha Yathra', '2026-08-04':'Arbayeen', '2026-08-15':'Parsi New Year’s Day',
  '2026-08-21':'Varalakshmi Vratham', '2026-08-28':'Sravana Purnima / Rakhi Purnima',
  '2026-09-23':'Yaz Dahum Shareef', '2026-10-19':'Maharnavami',
  '2026-10-26':'Birthday of Hzt. Syed Mohammed Juvanpuri Mahdi Ma’ud (A.S.)',
  '2026-11-08':'Naraka Chaturdhi', '2026-12-24':'Christmas Eve', '2026-12-26':'Birthday of Hazrath Ali'
};

function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
function iso(v){ return String(v || '').slice(0, 10); }
/* THE DISTRICT'S DAY, NOT THE HANDSET'S (rule 1): op=hrms carries today */
function today(){ return DB.today || new Date().toISOString().slice(0, 10); }
function yearNow(){ return Number(today().slice(0, 4)); }
function dmy(d){ var p = iso(d).split('-'); return p.length === 3 ? Number(p[2]) + ' ' + MON[Number(p[1]) - 1] + (p[0] !== String(yearNow()) ? ' ' + p[0] : '') : ''; }
function dmyFull(d){ var p = iso(d).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : String(d || ''); }
function span(a, b){ return iso(a) === iso(b) ? dmy(a) : dmy(a) + ' – ' + dmy(b); }
function daysBetween(a, b){ if(!a || !b) return 0; var x = Date.parse(iso(a) + 'T00:00:00Z'), y = Date.parse(iso(b) + 'T00:00:00Z'); return isNaN(x) || isNaN(y) || y < x ? 0 : Math.round((y - x) / 864e5) + 1; }
function hhmm(t){ var m = String(t || '').match(/T(\d{2}):(\d{2})/); if(!m) return ''; var h = Number(m[1]); /* the register keeps UTC; the district reads IST */
  if(/Z$/.test(String(t))){ var mm = Number(m[2]) + 30; h = (h + 5 + Math.floor(mm / 60)) % 24; return ('0' + h).slice(-2) + ':' + ('0' + (mm % 60)).slice(-2); } return m[1] + ':' + m[2]; }
function ini(name){ var w = String(name || '').replace(/[^A-Za-z .]/g, ' ').trim().split(/[\s.]+/).filter(Boolean); return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); }
function first(name){ var s = String(name || '').replace(/,.*$/, '').replace(/\(.*?\)/g, '').trim(); var w = s.split(/\s+/); return w.length > 2 ? w.slice(-2).join(' ') : s; }
function statusOf(r){ return String(r.status || 'PENDING').toUpperCase(); }
function role(){ return String(((DB.session || {}).user || {}).role || '').toUpperCase(); }
function canOrder(){ return role() === 'COLLECTOR'; }
function isHead(){ return role() === 'HOD'; }
function sees(){ return canOrder() || isHead(); }                       /* who gets the office calendar */
function roleWord(){ var u = (DB.session || {}).user || {}; return u.desig || (role() === 'COLLECTOR' ? 'District Magistrate' : role() === 'HOD' ? 'Head of office' : 'Employee'); }
function cancelledWord(r){ return /set aside|cancelled/i.test(String(r.decidedBy || '')) ? 'Cancelled by the District Magistrate' : 'Withdrawn'; }

/* ------------------------------------------------------------------ icons */
var I = {
  home:'<svg class="i" viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  leaf:'<svg class="i" viewBox="0 0 24 24"><path d="M4 20c0-9 5-14 16-16-1 11-6 16-16 16z"/><path d="M4 20c3-5 7-9 12-12"/></svg>',
  cal:'<svg class="i" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  inbox:'<svg class="i" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M4 14h5l1.5 2h3L15 14h5"/></svg>',
  me:'<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  plus:'<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  back:'<svg class="i" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  close:'<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chevL:'<svg class="i s" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  chevR:'<svg class="i s" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  check:'<svg class="i s" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
  clock:'<svg class="i s" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  x:'<svg class="i s" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  sun:'<svg class="i s" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  key:'<svg class="i s" viewBox="0 0 24 24"><circle cx="8" cy="14" r="4"/><path d="M11 11l9-9M16 6l2 2M18 4l2 2"/></svg>',
  out:'<svg class="i s" viewBox="0 0 24 24"><path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/></svg>',
  refresh:'<svg class="i s" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/></svg>'
};

/* ------------------------------------------------------------- the shell */
function tabs(){
  var nav = $('nav');
  var on = !!(DB.session && DB.session.token) && ['home','leave','calendar','inbox','me'].indexOf(S.screen) >= 0;
  nav.classList.toggle('hide', !on);
  if(!on) return;
  var t = [ ['home','Home',I.home], ['leave','Leave',I.leaf], ['calendar','Calendar',I.cal] ];
  if(canOrder()) t.push(['inbox','Inbox',I.inbox]);
  t.push(['me','Me',I.me]);
  var n = (DB.pend || []).length;
  nav.innerHTML = t.map(function(x){
    return '<button data-tab="' + x[0] + '"' + (S.tab === x[0] ? ' aria-current="page"' : '') + '>' +
      '<span class="pill">' + x[2] + '</span><span>' + x[1] + '</span>' +
      (x[0] === 'inbox' && n ? '<span class="cnt">' + n + '</span>' : '') + '</button>';
  }).join('');
}
function bar(title, left, right){ return '<div class="bar">' + (left || '') + '<h1>' + esc(title) + '</h1>' + (right || '') + '</div>'; }
function avatarBtn(){ var u = (DB.session || {}).user || {}; return '<button class="ic" data-go="me" aria-label="Me"><span class="avatar">' + esc(ini(u.name)) + '</span></button>'; }
function backBtn(to){ return '<button class="ic" data-go="' + to + '" aria-label="Back">' + I.back + '</button>'; }

function go(s){
  if(s !== 'inbox') S.inboxMsg = null;
  S.screen = s;
  if(['home','leave','calendar','inbox','me'].indexOf(s) >= 0) S.tab = s;
  if(s === 'inbox' && !canOrder()) S.screen = 'home';
  render();
}
function render(){
  var v = S.screen, h = '';
  if(!(DB.session && DB.session.token) && v !== 'claim') v = S.screen = 'signin';
  if(v === 'signin') h = vSignin();
  else if(v === 'claim') h = vClaim();
  else if(v === 'home') h = vHome();
  else if(v === 'leave') h = vLeave();
  else if(v === 'calendar') h = vCalendar();
  else if(v === 'inbox') h = vInbox();
  else if(v === 'order') h = vOrder();
  else if(v === 'me') h = vMe();
  else if(v === 'request') h = vRequest();
  else if(v === 'request2') h = vRequest2();
  else if(v === 'detail') h = vDetail();
  $('screen').innerHTML = h;
  tabs();
  window.scrollTo(0, 0);
  var f = $('screen').querySelector('[data-focus]'); if(f) try{ f.focus(); }catch(e){}
}

/* ---------------------------------------------------------------- sign in */
/* THE ENTRY: a hero on the brand canvas, and a sheet that rises from the
   foot carrying the form. Every field is a filled pill with a leading mark
   and a label that floats when the field is in use. */
var MK = {
  phone:'<svg class="mk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10 18.5h4"/></svg>',
  lock:'<svg class="mk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10" width="15" height="11" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/></svg>',
  id:'<svg class="mk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="12" r="2.2"/><path d="M14 10h4M14 14h4"/></svg>',
  eye:'<svg class="i s" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff:'<svg class="i s" viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6A3 3 0 0 0 13.4 13.4M9.9 5.1A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.2 6.2C3.6 8 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4-.8"/></svg>',
  arr:'<svg class="i s arr" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
};
function fld(id, label, mk, attrs, eye){
  return '<div class="fld">' + MK[mk] + '<div class="in"><input id="' + id + '" placeholder=" " ' + attrs + '><label for="' + id + '">' + esc(label) + '</label></div>' +
    (eye ? '<button class="eye" type="button" data-eye="' + id + '" aria-label="Show">' + MK.eye + '</button>' : '') + '</div>';
}
function hero(title, sub, small){
  return '<div class="canvas hero' + (small ? ' sm' : '') + '"><i class="orb a"></i><i class="orb b"></i><i class="orb c"></i><i class="grain"></i>' +
    '<div class="seal"><img src="icons/icon-192.png" alt="Government of Telangana emblem"></div>' +
    '<p class="gov">Government of Telangana</p><h1>' + title + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>';
}
function vSignin(){
  return '<div class="entry">' + hero('District<br>HRMS', 'Leave, and the service record it is sanctioned against.') +
    '<div class="sheetin"><div class="grab"></div>' +
    '<h2>Sign in</h2><p>With the mobile number your office has on the establishment.</p>' +
    fld('iPhone', 'Mobile number', 'phone', 'type="tel" inputmode="numeric" autocomplete="username" maxlength="13"') +
    fld('iPin', 'PIN', 'lock', 'type="password" inputmode="numeric" autocomplete="current-password" maxlength="8"', true) +
    '<button class="btn filled" id="bSignin" data-act="signin">Sign in ' + MK.arr + '</button>' +
    '<div class="msg" id="mSignin" role="alert"></div>' +
    '<div class="or">first time here</div>' +
    '<button class="first" data-act="firsttime"><span class="lead pri" style="width:38px;height:38px">' + MK.id + '</span><span><b>Set up your own PIN</b><span>Enter your number and press Sign in \u2014 you will be asked for the code your office gave you.</span></span><span class="chev"></span></button>' +
    '<p class="foot">Your office holds the establishment. If your number is not recognised, ask it to check the number and the employee id it has against your name.</p>' +
    '</div></div>';
}
function vClaim(){
  return '<div class="entry">' + hero('<span id="claimName">' + esc(S.claimName || 'Choose your PIN') + '</span>', 'Your number is on the district roll and has no PIN yet. Set one now \u2014 it is yours and the office never sees it.', true) +
    '<div class="sheetin"><div class="grab"></div>' +
    '<h2>First sign-in</h2><p>The register needs one thing only you were given, then a PIN of your choosing.</p>' +
    fld('cEmp', 'Employee ID or enrolment code', 'id', 'autocomplete="off" data-focus') +
    '<p class="small" style="margin-top:-6px">Your employee id, or the <b>six-character code</b> your office was given for you. It is used once and then it is finished with.</p>' +
    '<div class="two">' + fld('cPin', 'Choose a PIN', 'lock', 'type="password" inputmode="numeric" maxlength="8"') + fld('cPin2', 'Type it again', 'lock', 'type="password" inputmode="numeric" maxlength="8"') + '</div>' +
    '<button class="btn filled" id="bClaim" data-act="claim">Set my PIN and sign in ' + MK.arr + '</button>' +
    '<button class="btn text" id="bClaimBack" data-go="signin">Back</button>' +
    '<div class="msg" id="mClaim" role="alert"></div>' +
    '<p class="foot">A row is claimed once. If a PIN has already been set on your number and it was not you, your office can have it reset.</p>' +
    '</div></div>';
}
function signIn(){
  var b = $('bSignin'), ph = ($('iPhone').value || '').replace(/\D/g, '').slice(-10), pin = ($('iPin').value || '').trim();
  clear('mSignin');
  if(ph.length !== 10) return say('mSignin', 'bad', 'A mobile number is ten digits.');
  S.phone = ph;
  busy(b, true, 'Signing in…');
  post({ kind:'login', u:ph, p:pin })
    .then(function(r){
      busy(b, false);
      /* HIS ROW IS HIS TO CLAIM, and the register says so rather than sending
         five thousand people to telephone an office on the first morning. */
      if(r && r.needPin){ S.claimName = r.name ? 'Welcome, ' + r.name : 'Choose your PIN'; go('claim'); return; }
      if(!r || !r.ok) return say('mSignin', 'bad', errText(r));
      DB.session = { token:r.token, user:r.user };
      save();
      go('home'); refresh();
    })
    .catch(function(){ busy(b, false);
      say('mSignin', 'bad', 'The district could not be reached. Try again where there is a line.'); });
}
function claim(){
  var b = $('bClaim');
  var emp = ($('cEmp').value || '').trim(), p1 = ($('cPin').value || '').trim(), p2 = ($('cPin2').value || '').trim();
  clear('mClaim');
  if(!emp) return say('mClaim', 'bad', 'Your employee id, or the enrolment code your office was given for you, is needed — it is how the register knows the number is yours.');
  if(!/^\d{4,8}$/.test(p1)) return say('mClaim', 'bad', 'A PIN is four to eight digits.');
  if(p1 !== p2) return say('mClaim', 'bad', 'The two PINs are not the same.');
  busy(b, true, 'Setting…');
  post({ kind:'claimPin', u:S.phone, emp:emp, pin:p1 })
    .then(function(r){
      busy(b, false);
      if(!r || !r.ok){ if(tokenRefused(r)) return; return say('mClaim', 'bad', errText(r)); }
      DB.session = { token:r.token, user:r.user };
      save();
      go('home'); refresh();
    })
    .catch(function(){ busy(b, false);
      say('mClaim', 'bad', 'The district could not be reached. Try again where there is a line.'); });
}

/* ---------------------------------------------------------------- reading */
function refresh(){
  if(!DB.session) return;
  get({ op:'hrms', token:DB.session.token })
    .then(function(r){
      if(!r || !r.ok){ tokenRefused(r); return; }
      DB.rows = r.rows || []; DB.account = r.account || null; DB.record = r.record || null;
      DB.holidays = r.holidays || {}; DB.today = r.today || ''; DB.me = r.me || null;
      DB.attD = (r.attendance && r.attendance.today) || null;
      if(r.me && DB.session && DB.session.user){ DB.session.user.desig = r.me.desig || DB.session.user.desig; }
      DB.at = new Date().toISOString();
      save(); if(/^(home|leave|calendar|detail)$/.test(S.screen)) render();
      syncAtt();
    })
    .catch(function(){});
  if(canOrder()) pending();
  if(sees()) calendar();
}
function pending(){
  if(!DB.session || !canOrder()) return;
  get({ op:'hrmsPending', token:DB.session.token })
    .then(function(r){
      if(!r || !r.ok) return;
      /* how many are waiting IN ALL, not merely how many fit */
      DB.pend = r.rows || []; DB.pendAll = Number(r.total) || DB.pend.length;
      save(); if(/^(home|inbox)$/.test(S.screen)) render(); else tabs();
    })
    .catch(function(){});
}
function calendar(){
  if(!DB.session || !sees()) return;
  get({ op:'hrmsCalendar', token:DB.session.token, year:String(S.hmY || yearNow()) })
    .then(function(r){
      if(!r || !r.ok) return;
      DB.cal = r; DB.calAt = new Date().toISOString();
      save(); if(/^(home|calendar)$/.test(S.screen)) render();
    })
    .catch(function(){});
}

/* ---------------------------------------------------------------- account */
function acct(){ return (DB.account && DB.account.types) || {}; }
function balCard(k, selectable){
  var a = acct()[k]; if(!a || k === 'HQ') return '';
  var v, s, m = '';
  if(k === 'ML'){ v = '<span class="v">' + a.used + '<small>taken</small></span>'; s = 'no yearly limit · ' + (a.spell || 15) + ' a spell'; }
  else if(a.credit){ v = '<span class="v">' + a.left + '<small>days</small></span>'; s = 'at credit' + (a.used ? ' · ' + a.used + ' taken since ' + dmyFull(a.asOn) : (a.asOn ? ' as on ' + dmyFull(a.asOn) : '')); m = '<div class="m"><i style="width:' + Math.round(Math.min(1, a.left / 300) * 100) + '%"></i></div>'; }
  else { var pct = a.cap ? a.left / a.cap : 0; v = '<span class="v">' + a.left + '<small>of ' + a.cap + '</small></span>'; s = a.used + ' ' + (k === 'CCL' ? 'taken in service' : 'taken this year'); m = '<div class="m"><i class="' + (pct <= .2 ? (a.left ? 'lo' : 'out') : '') + '" style="width:' + Math.round(pct * 100) + '%"></i></div>'; }
  if(a.awaiting) s += ' · ' + a.awaiting + ' awaiting';
  var tag = selectable ? 'button' : 'div';
  return '<' + tag + ' class="bal' + (selectable && S.req && S.req.type === k ? ' sel' : '') + '"' + (selectable ? ' data-kind="' + k + '"' : '') + '><span class="k">' + esc(KIND_NAME[k] || k) + '</span>' + v + m + '<span class="s">' + esc(s) + '</span></' + tag + '>';
}
function rail(selectable){
  var keys = KIND_ORDER.filter(function(k){ return acct()[k] && k !== 'HQ'; });
  if(!keys.length) return '<div class="card"><p class="small">' + (DB.at ? 'The district has not sent your account yet.' : 'Reading your account from the district…') + '</p></div>';
  return '<div class="rail">' + keys.map(function(k){ return balCard(k, selectable); }).join('') + '</div>';
}
function statusBadge(r){
  var st = statusOf(r);
  return st === 'APPROVED' ? '<span class="badge ok">Sanctioned</span>' : st === 'REJECTED' ? '<span class="badge err">Refused</span>'
       : st === 'WITHDRAWN' ? '<span class="badge neu">Withdrawn</span>' : st === 'CANCELLED' ? '<span class="badge neu">' + esc(cancelledWord(r)) + '</span>'
       : st === 'RETURNED' ? '<span class="badge warn">Returned to you</span>' : '<span class="badge warn">Awaiting orders</span>';
}
function reqRow(r){
  var st = statusOf(r), k = String(r.type || '').toUpperCase();
  var lead = st === 'APPROVED' ? 'ok' : st === 'REJECTED' ? 'err' : (st === 'PENDING' || st === 'RETURNED') ? 'warn' : '';
  var ic = st === 'APPROVED' ? I.check : st === 'REJECTED' ? I.x : st === 'PENDING' || st === 'RETURNED' ? I.clock : I.x;
  var d = Number(r.days) || daysBetween(r.fromDate, r.toDate);
  return '<button class="row" data-detail="' + esc(r.id) + '"><span class="lead ' + lead + '">' + ic + '</span><span class="txt"><b>' + esc(KIND_NAME[k] || k) + '</b><span>' + esc(span(r.fromDate, r.toDate)) + (k === 'HQ' ? '' : ' · ' + d + (d === 1 ? ' day' : ' days')) + '</span></span><span class="trail">' + statusBadge(r) + '<span class="chev"></span></span></button>';
}
function sortedRows(){ return (DB.rows || []).slice().sort(function(a, b){ return String(b.fromDate).localeCompare(String(a.fromDate)) || String(b.appliedAt).localeCompare(String(a.appliedAt)); }); }

/* ---------------------------------------------------------------- home */
function vHome(){
  var u = (DB.session || {}).user || {};
  var t = today(), d = new Date(t + 'T00:00:00'), hour = new Date().getHours();
  var greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  var rows = sortedRows();
  var next = rows.filter(function(r){ return statusOf(r) === 'APPROVED' && iso(r.toDate) >= t; }).sort(function(a, b){ return String(a.fromDate).localeCompare(String(b.fromDate)); })[0];
  var pend = rows.filter(function(r){ var s = statusOf(r); return s === 'PENDING' || s === 'RETURNED'; });
  var h = bar('Home', '', '<button class="ic" data-act="refresh" aria-label="Refresh">' + I.refresh + '</button>' + avatarBtn());
  h += '<div class="scroll tabbed">';
  h += '<div><p class="eyebrow">' + greet + '</p><h2 class="title-l" style="margin-top:2px">' + esc(String(u.name || '').replace(/,.*$/, '')) + '</h2><p class="small" style="margin-top:2px">' + esc(roleWord()) + ' · ' + DOW[d.getDay()] + ', ' + dmy(t) + '</p></div>';

  /* ATTENDANCE (19.10.2026): the card offers the mark and says whether the
     district holds today's. It is voluntary and the app does not say so — by
     the Collector's direction the same afternoon the word is not shown; not
     one word on the card names a sanction either */
  h += todayCard();
  if(canOrder()){
    var n = Math.max(Number(DB.pendAll) || 0, (DB.pend || []).length);
    h += '<button class="card tonal" data-go="inbox" style="display:flex;align-items:center;gap:14px;text-align:left;width:100%"><span class="lead pri" style="background:rgba(255,255,255,.35)">' + I.inbox + '</span><span style="flex:1;min-width:0"><b style="display:block;font-size:16px">' + (n ? n + ' application' + (n === 1 ? '' : 's') + ' for your orders' : 'Nothing awaiting your orders') + '</b><span style="font-size:13px;opacity:.85">' + (n ? 'Open the inbox to pass them.' : 'The desk is clear.') + '</span></span><span class="chev" style="border-color:currentColor"></span></button>';
  }
  /* THE HEAT MAP ON THE HOME SCREEN (asked 18.10.2026): the head of an
     office sees his own people on leave this month; the Collector the
     district. The figures are the register's sanctioned leave and nothing
     awaiting orders. */
  if(sees()) h += heatCard(true);

  if(acct().CL || acct().EL || acct().ML){
    h += '<div class="hdr"><span class="eyebrow">Your leave · ' + yearNow() + '</span><button data-go="leave">Account</button></div>' + rail(false);
  }
  h += '<button class="btn filled" data-act="newreq">' + I.plus + ' Request leave</button>';
  if(next || pend.length){
    h += '<div class="hdr"><span class="eyebrow">Coming up</span></div><div class="card bright tight">';
    if(next) h += reqRow(next);
    pend.forEach(function(r){ if(r !== next) h += reqRow(r); });
    h += '</div>';
  }
  var recent = rows.filter(function(r){ var s = statusOf(r); return s !== 'PENDING' && s !== 'RETURNED' && r !== next; }).slice(0, 3);
  if(recent.length){
    h += '<div class="hdr"><span class="eyebrow">Recent</span><button data-go="leave">All requests</button></div><div class="card bright tight">' + recent.map(reqRow).join('') + '</div>';
  } else if(!rows.length){
    h += '<div class="card"><p class="body">No application yet. Your leave, when you apply for it, is listed here and under Leave.</p></div>';
  }
  if(canInstall()) h += '<div class="card bright tight">' + installRow() + '</div>';
  h += '</div>';
  return h;
}

/* ------------------------------------------------- attendance, voluntary */
/* ORDERED 19.10.2026: "also add to this attendance which is optional for
   now". The mark is the sanitation app's mark — the photograph, the
   coordinates and their precision, the handset's time and the district's
   receipt, the four readings that tell a receiver from an app — sent to the
   same saveAttendance_ and written to this register's own Attendance tab.

   WHAT IS NOT HERE IS THE LADDER. Every role on this register stays
   attExempt, so a mark is recorded and silence draws nothing — no reminder,
   no notice, no debit, no lock — and not one word on the card names a
   sanction. There is no fence (an office employee has no place of duty on
   this register), so no mark is refused for where it was made; one whose
   location was not measured still is, by the register (rule 6). The mark is
   written on the phone first and sent after, and a mark the district refuses
   is taken off the phone and he is told, as the field app learnt to. */
var ATT = null;                                       /* the mark in hand */
var STILL_FINE = 15, STILL_N = 4, ACC_LIMIT = 250;
var STILL_GAP = (typeof window !== 'undefined' && window.HRMS_STILL_GAP) || 1800;
function attLocal(){ return (DB.att || {})[today()] || null; }
/* the phone's own record beats the district's answer; the district's answer
   beats an empty store */
function attHeld(){ var a = attLocal(); if(a) return a; var d = DB.attD; return d && iso(d.date) === today() ? { ts:d.markedAt, sync:'district' } : null; }
function attId(){ return 'HA-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
function getFix(opts){
  return new Promise(function(res, rej){
    if(!navigator.geolocation) return rej(new Error('This phone cannot provide a location.'));
    navigator.geolocation.getCurrentPosition(
      function(p){ res({ lat:p.coords.latitude, lng:p.coords.longitude, acc:p.coords.accuracy }); },
      function(e){ rej(new Error(e && e.code === 1 ? 'Location is switched off for this app. Allow it in the phone\u2019s settings and try again.' : 'No location yet. Step into the open and try again.')); },
      Object.assign({ enableHighAccuracy:true, timeout:12000, maximumAge:0 }, opts || {}));
  });
}
function accWord(a){ return a == null ? '' : a < 1000 ? '\u00b1' + Math.round(a) + ' m' : '\u00b1' + (a / 1000).toFixed(1) + ' km'; }
/* THE READINGS: four fixes a couple of seconds apart. The best stands as the
   mark's own and all four travel with it, because a receiver's readings
   always differ and an app's never do. */
function readRound(n){
  if(!ATT || ATT.sampling) return;
  var key = n === 2 ? 'reads2' : 'reads1', token = ATT.id, i = 0;
  ATT[key] = []; ATT.sampling = key; ATT.err = ''; attSheet();
  (function step(){
    if(!ATT || ATT.id !== token) return;
    getFix().then(function(f){
      if(!ATT || ATT.id !== token) return;
      ATT[key].push([f.lat, f.lng, f.acc, Date.now()]);
      if(!ATT.fix || f.acc < ATT.fix.acc) ATT.fix = f;
    }).catch(function(e){ if(ATT && ATT.id === token && !ATT.fix) ATT.err = e.message; })
    .then(function(){
      if(!ATT || ATT.id !== token) return;
      i++;
      if(i < STILL_N){ attSheet(); setTimeout(step, STILL_GAP); }
      else { ATT.sampling = ''; attSheet(); }
    });
  })();
}
function roundStill(r){
  if(!r || r.length < 3) return null;
  var k0 = r[0][0].toFixed(7) + ',' + r[0][1].toFixed(7), a0 = r[0][2];
  var same = r.every(function(x){ return x[0].toFixed(7) + ',' + x[1].toFixed(7) === k0 && x[2] === a0; });
  return same && a0 != null && a0 <= STILL_FINE;
}
function stillBlock(){
  if(!ATT) return false;
  var r1 = ATT.reads1 || [], r2 = ATT.reads2 || [];
  if(r2.length >= 3) return !!roundStill(r2);
  return !!roundStill(r1);
}
/* file -> JPEG, resized and stamped with who, when and where */
function grabPhoto(file){
  return new Promise(function(res, rej){
    var url = URL.createObjectURL(file), img = new Image();
    img.onerror = function(){ URL.revokeObjectURL(url); rej(new Error('That picture could not be read. Take it again.')); };
    img.onload = function(){
      try{
        var sc = Math.min(1, 1000 / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc));
        var g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
        var u = (DB.session || {}).user || {}, f = ATT && ATT.fix;
        var lines = [String(u.name || ''),
          dmyFull(today()) + ' ' + new Date().toTimeString().slice(0, 5) + (f ? ' \u00b7 ' + f.lat.toFixed(5) + ', ' + f.lng.toFixed(5) + ' ' + accWord(f.acc) : ''),
          'District HRMS \u00b7 Jangaon'];
        var w = c.width, hh = c.height, fs = Math.max(11, Math.round(w * 0.031)), lh = Math.round(fs * 1.36), bar = lh * lines.length + Math.round(fs * 1.15);
        g.fillStyle = 'rgba(8,14,10,.68)'; g.fillRect(0, hh - bar, w, bar);
        lines.forEach(function(t, i){
          g.font = (i ? '400 ' : '700 ') + Math.round(i ? fs * 0.92 : fs) + 'px -apple-system,"Segoe UI",Roboto,sans-serif'; g.fillStyle = '#fff';
          g.fillText(t, Math.round(w * 0.03), hh - bar + Math.round(fs * 0.95) + i * lh);
        });
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', 0.6).split(',')[1]);
      }catch(e){ URL.revokeObjectURL(url); rej(new Error('That picture could not be prepared. Take it again.')); }
    };
    img.src = url;
  });
}
function startMark(){
  if(attHeld()) return;
  ATT = { id:attId(), reads1:[], reads2:[], fix:null, b64:'', sampling:'', err:'', busy:false };
  attSheet();
  readRound(1);
}
function readAgain(){ if(!ATT || ATT.sampling) return; ATT.fix = null; ATT.reads2 = []; readRound((ATT.reads1 || []).length ? 2 : 1); }
function onPhoto(file){
  if(!ATT || !file) return;
  grabPhoto(file).then(function(b64){ if(ATT){ ATT.b64 = b64; ATT.err = ''; attSheet(); } })
    .catch(function(e){ if(ATT){ ATT.err = e.message; attSheet(); } });
}
function attSheet(){
  if(!ATT) return;
  var f = ATT.fix, n = (ATT[ATT.sampling] || []).length;
  var loc = ATT.sampling ? ('Reading your location' + (f ? ' \u00b7 ' + accWord(f.acc) : '') + ' \u2026 ' + n + ' of ' + STILL_N)
          : f ? ('Location ' + accWord(f.acc) + (f.acc > ACC_LIMIT ? ' \u2014 a wide fix; step into the open and read again' : ''))
          : (ATT.err || 'No location yet.');
  var can = !!ATT.b64 && !ATT.sampling && !ATT.busy && !!f;
  sheet('<h2>Mark attendance</h2>' +
    '<div class="row"><span class="lead ' + (f ? (ATT.sampling ? 'warn' : 'ok') : '') + '">' + I.sun + '</span><span class="txt"><b>' + esc(loc) + '</b><span>' + (f ? f.lat.toFixed(5) + ', ' + f.lng.toFixed(5) : '') + '</span></span>' +
      (ATT.sampling ? '' : '<button class="btn text" style="width:auto;padding:0 10px" data-act="attagain">Read again</button>') + '</div>' +
    (ATT.b64 ? '<img class="shot" alt="" src="data:image/jpeg;base64,' + ATT.b64 + '">' : '') +
    '<label class="btn ' + (ATT.b64 ? 'outl' : 'tonal') + '" for="attFile" style="margin-top:10px">' + (ATT.b64 ? 'Take it again' : 'Take the photograph') + '</label>' +
    '<input id="attFile" class="hid" type="file" accept="image/*" capture="user">' +
    (ATT.err && (ATT.b64 || f) ? '<p class="msg on bad">' + esc(ATT.err) + '</p>' : '') +
    '<button class="btn filled" id="attMark" data-act="attmark" style="margin-top:10px"' + (can ? '' : ' disabled') + '>' + (ATT.busy ? 'Marking\u2026' : 'Mark') + '</button>' +
    '<button class="btn text" data-act="attcancel">Not now</button>');
}
function markNow(){
  if(!ATT || !ATT.b64 || !ATT.fix || ATT.busy) return;
  var token = ATT.id, tries = 0;
  (function wait(){                  /* the round in hand finishes, briefly */
    if(!ATT || ATT.id !== token) return;
    if(ATT.sampling && tries++ < 36) return setTimeout(wait, 250);
    if(stillBlock()){
      ATT.err = 'The phone reported exactly the same point ' + STILL_N + ' times in a row, which a receiver never does. Walk ten or twenty metres into the open and read again.';
      attSheet(); return;
    }
    ATT.busy = true; attSheet();
    var u = (DB.session || {}).user || {}, key = today();
    DB.att = DB.att || {};
    DB.att[key] = { id:ATT.id, date:key, ts:new Date().toISOString(), lat:ATT.fix.lat, lng:ATT.fix.lng, acc:ATT.fix.acc,
      verified:Number(ATT.fix.acc) <= ACC_LIMIT, reads:{ r1:ATT.reads1 || [], r2:ATT.reads2 || [] },
      tz:(Intl.DateTimeFormat().resolvedOptions().timeZone || ''), b64:ATT.b64, phone:u.phone, sync:'local' };
    save(); ATT = null; closeSheet(); render();
    toast('Attendance marked');
    syncAtt();
  })();
}
var ATT_SYNCING = false;
function syncAtt(loud){
  var list = Object.keys(DB.att || {}).map(function(k){ return DB.att[k]; }).filter(function(a){ return a && a.sync !== 'synced'; });
  if(!list.length || !DB.session || ATT_SYNCING) return;
  ATT_SYNCING = true;
  var a = list[0], u = (DB.session || {}).user || {};
  post({ kind:'attendance', token:DB.session.token,
         att:{ id:a.id, date:a.date, ts:a.ts, lat:a.lat, lng:a.lng, acc:a.acc, verified:a.verified, tz:a.tz, status:'PRESENT', reads:a.reads || null },
         photo:a.b64 ? { name:'ATT_' + (u.phone || '') + '_' + a.date + '.jpg', b64:a.b64 } : null })
    .then(function(r){
      if(r && r.ok){ a.sync = 'synced'; a.url = r.url || ''; delete a.b64; save(); if(S.screen === 'home') render(); }
      else if(r && r.ok === false && r.outside){
        /* A MARK THE DISTRICT REFUSED IS NOT A MARK and must not sit on the
           phone saying it is */
        delete DB.att[a.date]; save(); if(S.screen === 'home') render();
        toast(r.error || 'The district did not take that mark.');
      }
      else if(tokenRefused(r)){ }
      else if(loud) toast('Not sent yet \u2014 it goes up when there is a line.');
    })
    .catch(function(){ if(loud) toast('Not sent yet \u2014 it goes up when there is a line.'); })
    .then(function(){ ATT_SYNCING = false; });
}
function todayCard(){
  var t = today(), a = attHeld(), hol = DB.holidays[t], dow = new Date(t + 'T00:00:00').getDay();
  var h = '<div class="card bright tight" id="todayCard">';
  if(!a){
    h += '<div class="row"><span class="lead">' + I.sun + '</span><span class="txt"><b>Attendance</b><span>' +
         esc(DOW[dow] + ', ' + dmy(t) + (hol ? ' \u00b7 ' + hol : '') + ' \u00b7 not marked') + '</span></span>' +
         '<button class="btn filled" style="width:auto;min-height:40px;padding:0 16px;font-size:14px" data-act="mark">Mark</button></div>';
  } else {
    var held = a.sync === 'synced' || a.sync === 'district';
    h += '<div class="row"><span class="lead ' + (held ? 'ok' : 'warn') + '">' + (held ? I.check : I.clock) + '</span><span class="txt"><b>Marked at ' + esc(hhmm(a.ts)) + '</b><span>' +
         (held ? 'Received by the district' : 'On this phone \u00b7 <b style="font-weight:700">not yet received by the district</b>') + '</span></span>' +
         (held ? '' : '<button class="btn tonal" style="width:auto;min-height:40px;padding:0 14px;font-size:14px" data-act="attsend">Send</button>') + '</div>';
  }
  return h + '</div>';
}

/* ---------------------------------------------------------------- leave */
function myMonths(y){
  var m = [0,0,0,0,0,0,0,0,0,0,0,0], w = [0,0,0,0,0,0,0,0,0,0,0,0];
  (DB.rows || []).forEach(function(r){
    var st = statusOf(r); if(st !== 'APPROVED' && st !== 'PENDING') return;
    if(String(r.type).toUpperCase() === 'HQ') return;
    var a = Date.parse(iso(r.fromDate) + 'T00:00:00Z'), n = daysBetween(r.fromDate, r.toDate); if(!n) return;
    var days = Number(r.days) || n;
    for(var i = 0; i < n; i++){ var d = new Date(a + i * 864e5); if(d.getUTCFullYear() !== y) continue; (st === 'APPROVED' ? m : w)[d.getUTCMonth()] += days / n; }
  });
  var rd = function(x){ return Math.round(x * 10) / 10; };
  return { taken:m.map(rd), awaiting:w.map(rd) };
}
var binDays = function(v){ return v <= 0 ? 'k0' : v < 2 ? 'k1' : v < 4 ? 'k2' : v < 6 ? 'k3' : v < 10 ? 'k4' : 'k5'; };
function monthStrip(taken, awaiting, cur, attr){
  return '<div class="months">' + taken.map(function(v, i){
    var a = awaiting[i] || 0, cls = 'm ' + binDays(v) + (a > 0 && v <= 0 ? ' w' : '') + (i === cur ? ' cur' : '');
    return '<button class="' + cls + '" ' + attr + '="' + i + '" aria-label="' + MONL[i] + '"><span>' + MON[i].charAt(0) + '</span><b>' + (v > 0 ? v : (a > 0 ? '?' : '')) + '</b></button>';
  }).join('') + '</div>';
}
function vLeave(){
  var y = yearNow(), mm = myMonths(y), tot = Math.round(mm.taken.reduce(function(a, b){ return a + b; }, 0) * 10) / 10;
  var A = DB.account || {};
  var h = bar('Leave', '', avatarBtn());
  h += '<div class="scroll tabbed">';
  h += '<div class="hdr"><span class="eyebrow">Account · ' + y + '</span>' + (A.asOn ? '<span class="small">as on ' + dmyFull(A.asOn) + '</span>' : '') + '</div>' + rail(false);
  h += '<div class="card bright"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3 class="title-m">Your year, month by month</h3><span class="small num">' + tot + ' days</span></div>' +
       '<div style="margin-top:12px">' + monthStrip(mm.taken, mm.awaiting, S.myM, 'data-mym') + '</div>' +
       (S.myM != null ? '<p class="body" style="margin-top:10px;font-size:14px">' + esc(MONL[S.myM]) + ': ' + (mm.taken[S.myM] ? '<b>' + mm.taken[S.myM] + ' day' + (mm.taken[S.myM] === 1 ? '' : 's') + '</b> sanctioned' : 'nothing sanctioned') + (mm.awaiting[S.myM] ? ', ' + mm.awaiting[S.myM] + ' awaiting orders' : '') + '.</p>' : '') +
       '<div class="leg" style="margin-top:10px"><span><i style="background:var(--hm0)"></i>none</span><span><i style="background:var(--hm1)"></i>1</span><span><i style="background:var(--hm2)"></i>2–3</span><span><i style="background:var(--hm3)"></i>4–5</span><span><i style="background:var(--hm4)"></i>6–9</span><span><i style="background:var(--hm5)"></i>10+</span><span><i style="box-shadow:inset 0 0 0 2px var(--warn);background:var(--hm0)"></i>awaiting</span></div></div>';
  h += '<button class="btn filled" data-act="newreq">' + I.plus + ' Request leave</button>';
  var rows = sortedRows();
  h += '<div class="hdr"><span class="eyebrow">Requests</span><span class="small num">' + rows.length + '</span></div><div class="card bright tight">' + (rows.length ? rows.map(reqRow).join('') : '<div class="empty">Nothing yet.</div>') + '</div>';
  if(A.asOn){
    var R = DB.record || {}, kv = [];
    if(acct().EL && acct().EL.credit) kv.push(['Earned leave at credit', (R.el != null && R.el !== '' ? R.el : acct().EL.cap) + ' days']);
    if(acct().HPL) kv.push(['Half pay leave at credit', (R.hpl != null && R.hpl !== '' ? R.hpl : acct().HPL.cap) + ' days']);
    if(acct().CL) kv.push(['Casual leave availed up to ' + dmyFull(A.asOn), acct().CL.opening + ' days']);
    if(acct().OH) kv.push(['Optional holidays availed', String(acct().OH.opening)]);
    if(acct().CCL) kv.push(['Child care leave availed in service', acct().CCL.opening + ' days']);
    kv.push(['From the Service Register as on', dmyFull(A.asOn)]);
    if(A.verifiedBy) kv.push(['Verified by', A.verifiedBy + (A.verifiedOn ? ', ' + dmyFull(A.verifiedOn) : '')]);
    h += '<div class="card"><h3 class="title-m">Opening balances</h3><div class="kv" style="margin-top:6px">' + kv.map(function(x){ return '<div><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div></div>';
  }
  h += '</div>';
  return h;
}

/* ------------------------------------------------------------- calendar */
function monthGrid(y, m, cellFn){
  var firstD = new Date(Date.UTC(y, m, 1)), dow = (firstD.getUTCDay() + 6) % 7, days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  var h = '<div class="g">' + ['M','T','W','T','F','S','S'].map(function(d){ return '<span class="dw">' + d + '</span>'; }).join('');
  for(var i = 0; i < dow; i++) h += '<span class="d o"></span>';
  for(var d = 1; d <= days; d++){
    var k = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var sun = new Date(Date.UTC(y, m, d)).getUTCDay() === 0;
    h += cellFn(k, d, sun, DB.holidays[k]);
  }
  return h + '</div>';
}
/* THE OFFICE CALENDAR BINS AGAINST ITS OWN BUSIEST DAY, as the console's
   fortnight tints a figure by its share of its own column's high: a cell is
   one of five steps of the year's peak, and the legend prints the thresholds
   it used. An office of twenty and a district of a thousand cannot share
   fixed thresholds — on the console's 284-officer bins the district was one
   colour from end to end. */
function calBins(days){
  var mx = 0; Object.keys(days || {}).forEach(function(k){ if(!DB.holidays[k] && new Date(k + 'T00:00:00Z').getUTCDay() !== 0) mx = Math.max(mx, days[k]); });
  /* an office whose busiest day is five or fewer is read in whole people */
  var t = mx <= 5 ? [1, 2, 3, 4] : [.2, .4, .6, .8].map(function(q){ return Math.max(1, Math.ceil(mx * q)); });
  return { mx:mx, t:t,
    bin:function(v){ return v <= 0 ? 'k0' : v <= t[0] ? 'k1' : v <= t[1] ? 'k2' : v <= t[2] ? 'k3' : v <= t[3] ? 'k4' : 'k5'; },
    label:function(i){ var lo = i === 0 ? 1 : t[i - 1] + 1; return i === 4 ? (t[3] + 1) + '+' : lo >= t[i] ? String(t[i]) : lo + '–' + t[i]; } };
}
function mine(){
  var out = {};
  (DB.rows || []).forEach(function(r){ var st = statusOf(r); if(st !== 'APPROVED' && st !== 'PENDING') return;
    var a = Date.parse(iso(r.fromDate) + 'T00:00:00Z'), n = daysBetween(r.fromDate, r.toDate);
    for(var i = 0; i < n; i++) out[new Date(a + i * 864e5).toISOString().slice(0, 10)] = st; });
  return out;
}
function heatCard(compact){
  var C = DB.cal, y = S.hmY || yearNow(), m = compact ? Number(today().slice(5, 7)) - 1 : S.hmM;
  var scopeWord = isHead() ? 'Your office' : 'The district';
  if(!C) return '<div class="card bright"><p class="eyebrow">' + esc(scopeWord) + ' on leave</p><p class="small" style="margin-top:6px">Reading the calendar from the district…</p></div>';
  var B = calBins(C.days), monthTot = 0, peak = { n:0 };
  var grid = monthGrid(y, m, function(k, d, sun, hol){
    var n = C.days[k] || 0; if(!sun && !hol){ monthTot += n; if(n > peak.n) peak = { n:n, k:k }; }
    var cls = 'd ' + (sun || hol ? 'off' : B.bin(n)) + (hol ? ' hol' : '') + (k === today() ? ' today' : '');
    return '<button class="' + cls + '" data-day="' + k + '" aria-label="' + dmy(k) + (hol ? ', ' + esc(hol) : '') + '">' + d + (n && !sun && !hol ? '<small>' + n + '</small>' : '') + '</button>';
  });
  var h = '<div class="card bright cal' + (compact ? ' mini' : '') + '">';
  if(compact) h += '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><div><p class="eyebrow">' + esc(scopeWord) + ' on leave · ' + MONL[m] + '</p><p class="small">' + (C.away || []).length + ' away today of ' + C.roll + (C.pending ? ' · ' + C.pending + ' awaiting orders' : '') + '</p></div><button class="btn text" style="width:auto;padding:0 8px" data-go="calendar">Open</button></div>';
  else h += '<div class="mh"><button data-hm="-1" aria-label="Previous month">' + I.chevL + '</button><b>' + MONL[m] + ' ' + y + '</b><button data-hm="1" aria-label="Next month">' + I.chevR + '</button></div>';
  h += grid;
  h += '<div class="leg" style="margin-top:8px"><span>Away:</span><span><i style="background:var(--hm0)"></i>0</span>' + [1,2,3,4,5].map(function(i){ return '<span><i style="background:var(--hm' + i + ')"></i>' + B.label(i - 1) + '</span>'; }).join('') + '</div>';
  if(!compact) h += '<p class="small" style="margin-top:8px"><b class="num">' + monthTot.toLocaleString('en-IN') + ' officer-days</b> of sanctioned leave in ' + MONL[m] + (peak.n ? '; the busiest day is <b>' + dmy(peak.k) + '</b> with ' + peak.n + ' away' : '') + '. A cell counts the people whose sanctioned leave covers that day, of ' + Number(C.roll || 0).toLocaleString('en-IN') + ' on the roll. Nothing awaiting orders is on it.</p>';
  h += '</div>';
  return h;
}
function vCalendar(){
  var own = !sees() || S.hmScope === 'mine';
  var y = S.hmY || yearNow(), t = today();
  var h = bar(own ? 'Calendar' : 'Who is away', '', avatarBtn());
  h += '<div class="scroll tabbed">';
  if(sees()) h += '<div class="chips"><button class="chip' + (!own ? ' on' : '') + '" data-scope="office">' + (isHead() ? 'My office' : 'The district') + '</button><button class="chip' + (own ? ' on' : '') + '" data-scope="mine">My own</button></div>';
  if(own){
    var M = mine();
    h += '<div class="card bright cal"><div class="mh"><button data-hm="-1" aria-label="Previous month">' + I.chevL + '</button><b>' + MONL[S.hmM] + ' ' + y + '</b><button data-hm="1" aria-label="Next month">' + I.chevR + '</button></div>';
    h += monthGrid(y, S.hmM, function(k, d, sun, hol){
      var cls = 'd' + (sun ? ' off' : '') + (hol ? ' off hol' : '') + (k === t ? ' today' : '') + (M[k] === 'APPROVED' ? ' in' : M[k] === 'PENDING' ? ' mine' : '');
      return '<span class="' + cls + '" title="' + esc(hol || '') + '">' + d + '</span>';
    });
    h += '<div class="leg" style="margin-top:8px"><span><i style="background:var(--primary-container)"></i>your sanctioned leave</span><span><i style="box-shadow:inset 0 0 0 2px var(--primary);background:var(--surface-bright)"></i>awaiting orders</span><span><i style="background:var(--surface-low)"></i>holiday · Sunday</span><span><i style="box-shadow:inset 0 0 0 2px var(--warn);background:var(--surface-bright)"></i>today</span></div></div>';
    var hol = Object.keys(DB.holidays).filter(function(k){ return k.slice(0, 4) === String(y) && Number(k.slice(5, 7)) - 1 === S.hmM; }).sort();
    h += '<div class="hdr"><span class="eyebrow">Holidays this month</span></div><div class="card bright tight">' + (hol.length ? hol.map(function(k){ return '<div class="row" style="min-height:48px"><span class="lead" style="width:36px;height:36px">' + I.sun + '</span><span class="txt"><b>' + esc(DB.holidays[k]) + '</b><span>' + dmy(k) + '</span></span></div>'; }).join('') : '<div class="empty">None declared.</div>') + '</div>';
  } else {
    h += heatCard(false);
    var C = DB.cal;
    if(C){
      var mt = [0,0,0,0,0,0,0,0,0,0,0,0];
      Object.keys(C.days || {}).forEach(function(k){ if(k.slice(0, 4) !== String(y)) return; if(DB.holidays[k] || new Date(k + 'T00:00:00Z').getUTCDay() === 0) return; mt[Number(k.slice(5, 7)) - 1] += C.days[k]; });
      var mx = Math.max.apply(null, mt.concat([0]));
      h += '<div class="card bright"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3 class="title-m">The year, month by month</h3><span class="small">officer-days</span></div><div class="months" style="margin-top:12px">' +
        mt.map(function(v, i){ var q = mx ? v / mx : 0, cls = 'm ' + (v <= 0 ? 'k0' : q < .25 ? 'k1' : q < .45 ? 'k2' : q < .65 ? 'k3' : q < .85 ? 'k4' : 'k5') + (i === S.hmM ? ' cur' : ''); return '<button class="' + cls + '" data-hmgo="' + i + '" aria-label="' + MONL[i] + '"><span>' + MON[i].charAt(0) + '</span><b>' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v) + '</b></button>'; }).join('') + '</div></div>';
      var away = C.away || [];
      h += '<div class="hdr"><span class="eyebrow">Away today · ' + dmy(t) + '</span><span class="small num">' + away.length + '</span></div><div class="card bright tight">' +
        (away.length ? away.map(function(p){ return '<div class="row"><span class="lead">' + esc(ini(p.name)) + '</span><span class="txt"><b>' + esc(p.name) + '</b><span>' + esc((KIND_NAME[String(p.type).toUpperCase()] || p.type) + ' to ' + dmy(p.to) + (isHead() || !p.office ? '' : ' · ' + p.office)) + '</span></span></div>'; }).join('') : '<div class="empty">Nobody on sanctioned leave today.</div>') + '</div>';
    }
  }
  h += '</div>';
  return h;
}

/* ------------------------------------------------------------- request */
function newReq(){ S.req = { type:'CL', from:'', to:'', reason:'', addr:'', hq:false, cert:'' }; var t = today(); S.calY = Number(t.slice(0, 4)); S.calM = Number(t.slice(5, 7)) - 1; go('request'); }
function vRequest(){
  var q = S.req || (S.req = { type:'CL', from:'', to:'', reason:'', addr:'', hq:false, cert:'' });
  var a = acct()[q.type] || {}, t = today();
  var h = bar('Request leave', '', '<button class="ic" data-go="' + S.tab + '" aria-label="Close">' + I.close + '</button>');
  h += '<div class="scroll">';
  h += '<p class="eyebrow">1 of 2 · Kind and dates</p>' + rail(true);
  if(acct().HQ) h += '<div class="chips"><button class="chip' + (q.type === 'HQ' ? ' on' : '') + '" data-kind="HQ">Permission to leave headquarters only</button></div>';
  var n = daysBetween(q.from, q.to);
  var line = !q.from ? (q.type === 'OH' ? 'Tap the notified day' : 'Tap the first day') : !q.to ? 'Now the last day' : n + (n === 1 ? ' day' : ' days');
  var sub = '', warn = false;
  if(q.type === 'OH') sub = n ? (a.left ? 'leaves you ' + (a.left - 1) + ' of ' + a.cap : 'none left this year') : 'one notified day at a time';
  else if(q.type === 'ML') sub = n ? (n <= (a.spell || 15) ? 'inside a spell of ' + (a.spell || 15) : 'over ' + (a.spell || 15) + ' at a time — for the District Magistrate under the leave rules') : 'no yearly figure · ' + (a.spell || 15) + ' a spell';
  else if(q.type === 'HQ') sub = 'a permission, not leave · nothing is debited';
  else if(a.credit) sub = n ? 'leaves ' + (a.left - n) + ' at credit' : a.left + ' at credit';
  else if(a.cap) { if(n && n > a.left){ sub = 'you have ' + a.left + ' left · this asks for ' + (n - a.left) + ' more'; warn = true; } else sub = n ? 'leaves you ' + (a.left - n) + ' of ' + a.cap : a.left + ' left of ' + a.cap; }
  if(n && a.credit && n > a.left){ warn = true; sub = a.left + ' at credit · this asks for ' + (n - a.left) + ' more'; }
  h += '<div class="card ' + (warn ? 'warn' : 'tonal') + '" style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><b style="font-size:20px;font-weight:800;letter-spacing:-.3px">' + esc(line) + '</b><span style="font-size:13px;opacity:.9;text-align:right">' + esc(sub) + '</span></div>';
  h += '<div class="card bright cal"><div class="mh"><button data-cm="-1" aria-label="Previous month">' + I.chevL + '</button><b>' + MONL[S.calM] + ' ' + S.calY + '</b><button data-cm="1" aria-label="Next month">' + I.chevR + '</button></div>';
  var M = mine();
  h += monthGrid(S.calY, S.calM, function(k, d, sun, hol){
    var cls = 'd' + (sun ? ' off' : '') + (hol ? ' hol' : '') + (k === t ? ' today' : '');
    if(q.from && q.to && k > q.from && k < q.to) cls += ' in';
    if(k === q.from) cls += ' a'; if(k === q.to) cls += ' b';
    if(k < t) cls += ' gone';
    if(q.type === 'OH' && TS_OPTIONAL_2026[k]) cls += ' oh';
    if(M[k] && k !== q.from && k !== q.to) cls += ' mine';
    return '<button class="' + cls + '" data-pick="' + k + '" aria-label="' + dmy(k) + (hol ? ', ' + esc(hol) : '') + (TS_OPTIONAL_2026[k] ? ', ' + esc(TS_OPTIONAL_2026[k]) : '') + '">' + d + '</button>';
  });
  h += '<div class="leg" style="margin-top:6px"><span><i style="background:var(--surface-low)"></i>holiday · Sunday</span><span><i style="box-shadow:inset 0 0 0 2px var(--warn);background:var(--surface-bright)"></i>today</span><span><i style="box-shadow:inset 0 0 0 2px var(--primary);background:var(--surface-bright)"></i>your leave</span>' + (q.type === 'OH' ? '<span><i style="box-shadow:inset 0 0 0 1.5px var(--secondary);background:var(--surface-bright)"></i>notified optional holiday</span>' : '') + '</div>';
  if(q.type === 'OH' && q.from) h += '<p class="small" style="margin-top:4px">' + esc(TS_OPTIONAL_2026[q.from] || '') + '</p>';
  h += '</div>';
  h += '<button class="btn filled" data-act="next"' + (n ? '' : ' disabled') + '>Continue</button>';
  h += '</div>';
  return h;
}
function pick(k){
  var q = S.req, t = today();
  if(k < t) return toast('A day already gone cannot be applied for.');
  if(q.type === 'OH'){
    if(!TS_OPTIONAL_2026[k]) return toast('An optional holiday is one of the notified days. They are outlined.');
    q.from = q.to = k; render(); return;
  }
  if(!q.from || (q.from && q.to)){ q.from = k; q.to = ''; }
  else if(k < q.from){ q.to = q.from; q.from = k; }
  else q.to = k;
  render();
}
function vRequest2(){
  var q = S.req, n = daysBetween(q.from, q.to), k = q.type;
  var h = bar('Request leave', backBtn('request'), '<button class="ic" data-go="' + S.tab + '" aria-label="Close">' + I.close + '</button>');
  h += '<div class="scroll">';
  h += '<p class="eyebrow">2 of 2 · Details and send</p>';
  h += '<div class="card tonal"><p class="eyebrow">' + esc(KIND_NAME[k] || k) + '</p><h2 class="title-l" style="margin-top:4px">' + esc(span(q.from, q.to)) + '</h2><p class="body" style="color:inherit;opacity:.85;margin-top:2px">' + (k === 'HQ' ? 'permission sought' : n + (n === 1 ? ' day' : ' days')) + '</p></div>';
  h += '<div class="field"><label for="rReason">Reason</label><textarea id="rReason" rows="2" placeholder="Briefly, in your own words" data-focus>' + esc(q.reason) + '</textarea></div>';
  h += '<div class="field"><label for="rAddr">Address while on leave</label><input id="rAddr" value="' + esc(q.addr) + '" placeholder="Where you may be reached"></div>';
  /* the certificate is asked for only where it is wanted */
  if(k === 'ML') h += '<div class="field"><label for="rCert">Medical certificate</label><input id="rCert" value="' + esc(q.cert) + '" placeholder="Who issued it, and the date"></div>';
  if(k !== 'HQ') h += '<div class="card bright"><div class="sw"><span class="txt"><b>I will be away from headquarters</b><span>Permission to leave headquarters is sought with this leave</span></span><button class="tog" role="switch" aria-checked="' + (q.hq ? 'true' : 'false') + '" data-act="hq" aria-label="Away from headquarters"></button></div></div>';
  h += '<div class="card"><p class="eyebrow">Goes to</p><div class="steps" style="margin-top:4px"><div class="step"><span class="n">1</span><div><b>The District Magistrate</b><span>For orders, as every application in the district does</span></div></div></div></div>';
  h += '<button class="btn filled" id="bSend" data-act="send">Send</button>';
  h += '<div class="msg" id="mApply" role="alert"></div>';
  h += '<p class="foot">Nothing is taken from you until it is sanctioned. You can withdraw it while it waits.</p>';
  h += '</div>';
  return h;
}
function send(){
  var q = S.req, b = $('bSend');
  q.reason = ($('rReason') || {}).value || q.reason; q.addr = ($('rAddr') || {}).value || q.addr; q.cert = ($('rCert') || {}).value || q.cert;
  clear('mApply');
  var n = daysBetween(q.from, q.to);
  if(!q.from || !q.to || n < 1) return say('mApply', 'bad', 'Both dates are needed.');
  if(!String(q.reason).trim()){ say('mApply', 'bad', 'A reason is needed — the orders are passed on it.'); var t = $('rReason'); if(t) t.focus(); return; }
  busy(b, true, 'Sending…');
  /* EVERY SUBMISSION CARRIES A FRESH ID (rule 5), so a double tap raises two
     independent applications and the SERVER refuses the overlap — and a
     re-send of the SAME id is a retry and is written once. */
  post({ kind:'leave', token:DB.session.token, leave:{
    id:'HR-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    type:q.type, from:q.from, to:q.to, days:q.type === 'HQ' ? 1 : n,
    reason:String(q.reason).trim(), address:String(q.addr || '').trim(),
    hq:q.type === 'HQ' || q.hq === true, cert:String(q.cert || '').trim() } })
    .then(function(r){
      busy(b, false);
      if(!r || !r.ok){ if(tokenRefused(r)) return; return say('mApply', 'bad', errText(r)); }
      S.req = null;
      go(S.tab === 'leave' ? 'leave' : 'home');
      toast('Sent to the District Magistrate.');
      refresh();
    })
    .catch(function(){ busy(b, false);
      /* NOTHING IS SHOWN AS SENT THAT WAS NOT */
      say('mApply', 'bad', 'It did not reach the district, so nothing has been applied for. Try again where there is a line.'); });
}

/* -------------------------------------------------------------- detail */
function findRow(id){ return (DB.rows || []).filter(function(r){ return String(r.id) === String(id); })[0] || null; }
function vDetail(){
  var r = S.detail && findRow(S.detail.id) || S.detail; if(!r) return vLeave();
  var st = statusOf(r), k = String(r.type || '').toUpperCase(), n = Number(r.days) || daysBetween(r.fromDate, r.toDate);
  var h = bar('Request', backBtn(S.tab), '');
  h += '<div class="scroll">';
  h += '<div class="card ' + (st === 'PENDING' || st === 'RETURNED' ? 'tonal' : 'bright') + '"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div><p class="eyebrow">' + esc(KIND_NAME[k] || k) + '</p><h2 class="title-l" style="margin-top:4px">' + esc(span(r.fromDate, r.toDate)) + '</h2><p class="body" style="margin-top:2px;color:inherit;opacity:.8">' + (k === 'HQ' ? 'permission' : n + (n === 1 ? ' day' : ' days')) + (String(r.leaveHq) === 'true' && k !== 'HQ' ? ' · leaving headquarters' : '') + '</p></div>' + statusBadge(r) + '</div></div>';
  var steps = [{ cls:'done', t:'Sent', s:'By you, ' + dmy(r.appliedAt) + (hhmm(r.appliedAt) ? ' at ' + hhmm(r.appliedAt) : '') }];
  var by = String(r.decidedBy || '').replace(/\s*\(.*$/, '').replace(/\s*·.*$/, '');
  if(st === 'PENDING') steps.push({ cls:'busy', t:'With the District Magistrate', s:'Awaiting orders' });
  else if(st === 'RETURNED') steps.push({ cls:'busy', t:'Returned to you for correction', s:'Apply again with the correction' });
  else if(st === 'APPROVED') steps.push({ cls:'done', t:'Sanctioned', s:'By the District Magistrate' + (r.decidedAt ? ', ' + dmy(r.decidedAt) : '') });
  else if(st === 'REJECTED') steps.push({ cls:'bad', t:'Refused', s:'By the District Magistrate' + (r.decidedAt ? ', ' + dmy(r.decidedAt) : '') });
  else if(st === 'CANCELLED') steps.push({ cls:'neu', t:cancelledWord(r), s:(r.decidedAt ? dmy(r.decidedAt) : '') });
  else if(st === 'WITHDRAWN') steps.push({ cls:'neu', t:'Withdrawn', s:'By you' + (r.decidedAt ? ', ' + dmy(r.decidedAt) : '') });
  h += '<div class="card bright"><p class="eyebrow" style="margin-bottom:4px">Journey</p><div class="steps">' + steps.map(function(s){ return '<div class="step ' + s.cls + '"><span class="n">' + (s.cls === 'done' ? I.check : s.cls === 'bad' ? I.x : '') + '</span><div><b>' + esc(s.t) + '</b><span>' + esc(s.s) + '</span></div></div>'; }).join('') + '</div></div>';
  if(r.remarks && (st === 'REJECTED' || st === 'CANCELLED' || st === 'RETURNED')) h += '<div class="card flag"><p class="eyebrow">Remarks</p><p class="body" style="color:inherit;margin-top:4px">' + esc(r.remarks) + '</p></div>';
  h += '<div class="card"><div class="kv"><div><span>Reason</span><b style="font-weight:500;text-align:left;max-width:60%">' + esc(r.reason || '—') + '</b></div>' + (r.address ? '<div><span>Address while on leave</span><b style="font-weight:500">' + esc(r.address) + '</b></div>' : '') + (r.certificate ? '<div><span>Medical certificate</span><b style="font-weight:500">' + esc(r.certificate) + '</b></div>' : '') + '<div><span>Application</span><b class="num">' + esc(r.id) + '</b></div></div></div>';
  if(st === 'PENDING' || st === 'RETURNED') h += '<button class="btn outl" data-act="withdraw">Withdraw this request</button>';
  h += '<div class="msg" id="mDetail" role="alert"></div>';
  h += '</div>';
  return h;
}
function withdraw(){
  var r = S.detail; if(!r) return;
  sheet('<h2>Withdraw this request?</h2><p>It comes off the District Magistrate’s desk. Nothing was debited, so nothing is returned.</p><div class="two"><button class="btn outl" data-close="1">Keep it</button><button class="btn filled" data-yes="1">Withdraw</button></div>');
  $('sheet').querySelector('[data-yes]').addEventListener('click', function(){
    closeSheet();
    post({ kind:'leaveWithdraw', token:DB.session.token, id:r.id })
      .then(function(x){
        if(!x || !x.ok){ if(tokenRefused(x)) return; return say('mDetail', 'bad', errText(x)); }
        var row = findRow(r.id); if(row){ row.status = 'WITHDRAWN'; row.decidedAt = new Date().toISOString(); }
        save(); toast('Withdrawn.'); go(S.tab); refresh();
      })
      .catch(function(){ say('mDetail', 'bad', 'The line dropped before the district answered. Refresh to see whether it was withdrawn.'); });
  });
}

/* --------------------------------------------------------------- inbox */
function waitedWord(at){ var h = (Date.now() - Date.parse(at)) / 36e5; if(!isFinite(h)) return 'waiting'; return h < 1 ? 'just now' : h < 24 ? Math.round(h) + ' h' : Math.round(h / 24) + ' d'; }
function inboxRow(r){
  var k = String(r.type || '').toUpperCase(), d = Number(r.days) || daysBetween(r.fromDate, r.toDate);
  return '<button class="row" data-order="' + esc(r.id) + '"><span class="lead">' + esc(ini(r.name)) + '</span><span class="txt"><b>' + esc(r.name || r.phone) + '</b><span>' + esc((KIND_NAME[k] || k) + ' · ' + (k === 'HQ' ? 'permission' : d + (d === 1 ? ' day' : ' days')) + ' · ' + span(r.fromDate, r.toDate)) + '</span><span style="color:var(--on-surface-3)">' + esc([r.desig, String(r.office || '').replace(/^Office of the /, '')].filter(Boolean).join(' · ')) + '</span></span><span class="trail"><span class="badge neu">' + esc(waitedWord(r.appliedAt)) + '</span><span class="chev"></span></span></button>';
}
function vInbox(){
  var rows = DB.pend || [], tot = Math.max(Number(DB.pendAll) || 0, rows.length);
  var h = bar('Inbox', '', '<button class="ic" data-act="refresh" aria-label="Refresh">' + I.refresh + '</button>' + avatarBtn());
  h += '<div class="scroll tabbed">';
  h += '<div class="hdr"><span class="eyebrow">Awaiting your orders</span><span class="small num" id="oCount">' + (!rows.length ? '' : tot > rows.length ? tot + ' in all · the oldest ' + rows.length + ' shown' : tot) + '</span></div>';
  if(rows.length){
    h += '<div class="card bright tight">' + rows.map(inboxRow).join('') + '</div>';
    if(rows.length > 1) h += '<button class="btn tonal" id="bAll" data-act="all">Sanction all ' + rows.length + '</button>';
    h += '<p class="small" style="padding:0 6px">Each still answers its own checks: one that cannot be sanctioned is refused by name and stays here. Refusals are never passed over a list.</p>';
  } else h += '<div class="card" style="text-align:center;padding:28px 16px"><p class="body">Nothing is waiting.</p></div>';
  h += '<div class="msg' + (S.inboxMsg ? ' on ' + S.inboxMsg.kind : '') + '" id="mOrders" role="alert">' + esc(S.inboxMsg ? S.inboxMsg.text : '') + '</div>';
  h += '<p class="foot">An order is passed on the application, not on a row. Nothing is destroyed: a refusal keeps the application and its words on the register.</p>';
  h += '</div>';
  return h;
}
function vOrder(){
  var r = S.detail; if(!r) return vInbox();
  var k = String(r.type || '').toUpperCase(), d = Number(r.days) || daysBetween(r.fromDate, r.toDate);
  var h = bar('Application', backBtn('inbox'), '');
  h += '<div class="scroll">';
  h += '<div class="card bright" style="display:flex;gap:14px;align-items:center"><span class="lead" style="width:52px;height:52px;font-size:17px">' + esc(ini(r.name)) + '</span><div style="min-width:0"><h2 class="title-m">' + esc(r.name || r.phone) + '</h2><p class="small">' + esc(r.desig || '') + (r.desig && r.office ? '<br>' : '') + esc(r.office || '') + '</p></div></div>';
  h += '<div class="card bright"><p class="eyebrow">Asks for</p><h2 class="title-l" style="margin-top:4px">' + esc(KIND_NAME[k] || k) + '</h2><p class="body" style="margin-top:2px">' + esc(span(r.fromDate, r.toDate)) + (k === 'HQ' ? '' : ' · <b>' + d + (d === 1 ? ' day' : ' days') + '</b>') + '</p>' +
       '<div class="kv" style="margin-top:10px"><div><span>Reason</span><b style="font-weight:500;text-align:left;max-width:60%">' + esc(r.reason || '—') + '</b></div>' + (r.address ? '<div><span>Address while on leave</span><b style="font-weight:500">' + esc(r.address) + '</b></div>' : '') + (r.certificate ? '<div><span>Certificate</span><b style="font-weight:500">' + esc(r.certificate) + '</b></div>' : '') + '<div><span>Leaving headquarters</span><b>' + (String(r.leaveHq) === 'true' ? 'Yes, permission sought' : 'No') + '</b></div><div><span>Applied</span><b>' + esc(dmy(r.appliedAt)) + (hhmm(r.appliedAt) ? ' at ' + hhmm(r.appliedAt) : '') + '</b></div></div></div>';
  h += '<div class="card"><p class="small">The register checks the balance, the overlap and the medical spell when the order is passed, and refuses by name anything that fails.</p></div>';
  h += '<div class="field"><label for="oRem">Remarks (needed to refuse; they go to the employee)</label><textarea id="oRem" rows="2" placeholder="In your own words"></textarea></div>';
  h += '<div class="two"><button class="btn err" data-act="refuse">Refuse</button><button class="btn filled" data-act="sanction">Sanction</button></div>';
  h += '<div class="msg" id="mOrder" role="alert"></div>';
  h += '<p class="foot">An order is passed on the application, not on a row. Nothing is destroyed.</p>';
  h += '</div>';
  return h;
}
function order(id, status, remarks){
  clear('mOrder');
  post({ kind:'leaveDecision', token:DB.session.token, id:id, status:status, remarks:remarks })
    .then(function(r){
      if(!r || !r.ok){ if(tokenRefused(r)) return; return say('mOrder', 'bad', errText(r)); }
      DB.pend = (DB.pend || []).filter(function(x){ return String(x.id) !== String(id); }); save();
      go('inbox'); toast(status === 'APPROVED' ? 'Sanctioned.' : 'Refused, and the employee is told why.');
      pending(); if(sees()) calendar();
    })
    /* A LOST LINE IS NOT PROOF THAT NO ORDER WAS PASSED */
    .catch(function(){
      say('mOrder', 'bad', 'The line dropped before the district answered, so it is NOT KNOWN whether this order was passed. ' +
        'Go back to the inbox, which is re-read from the register; if the application is still on it, no order has been passed on it.');
      pending();
    });
}
var ORDER_BATCH = 25;
function orderAll(){
  var ids = (DB.pend || []).map(function(r){ return r.id; }).filter(function(x){ return !!String(x || '').trim(); });
  if(!ids.length) return;
  var tot = Math.max(Number(DB.pendAll) || 0, ids.length);
  sheet('<h2>Sanction ' + ids.length + ' of them?</h2><p>' + (tot > ids.length ? tot + ' are waiting in all; these are the oldest ' + ids.length + '. The rest come up when you refresh. ' : '') +
    'Each still answers its own checks in turn, so one that cannot be sanctioned is refused by name and stays waiting for your own look. Refusals are never passed this way.</p>' +
    '<div class="two"><button class="btn outl" data-close="1">Not now</button><button class="btn filled" data-yes="1">Sanction all</button></div>');
  $('sheet').querySelector('[data-yes]').addEventListener('click', function(){
    closeSheet();
    var b = $('bAll'); busy(b, true, 'Passing…');
    var done = 0, refused = [], sent = 0;
    function finish(lost){
      busy(b, false);
      var bits = [];
      if(done) bits.push(done + ' sanctioned');
      if(refused.length) bits.push(refused.length + ' could not be and are still waiting (' + refused.slice(0, 3).map(function(x){ return x.error; }).join('; ') + (refused.length > 3 ? '; …' : '') + ')');
      if(lost) bits.push('AND ' + lost + ' COULD NOT BE CONFIRMED — the district may or may not have passed them before the line dropped. The list is re-read from the register, which is the only thing that knows; whatever is still on it was not sanctioned.');
      /* kept on the screen's state, because the re-read below redraws the
         inbox and a message written straight into the page would go with it */
      S.inboxMsg = { kind: lost ? 'bad' : refused.length ? 'info' : 'ok', text: bits.join(' · ') || 'Nothing was passed.' };
      say('mOrders', S.inboxMsg.kind, S.inboxMsg.text);
      pending(); if(sees()) calendar();
    }
    function step(){
      if(sent >= ids.length) return finish(0);
      var part = ids.slice(sent, sent + ORDER_BATCH); sent += part.length;
      say('mOrders', 'info', 'Passing orders… ' + sent + ' of ' + ids.length + '.');
      return post({ kind:'leaveDecision', token:DB.session.token, ids:part, status:'APPROVED' })
        .then(function(r){
          if(!r || !r.ok){ refused.push({ error:errText(r) }); return finish(0); }
          done += Number(r.done) || 0; refused = refused.concat(r.refused || []);
          return step();
        })
        .catch(function(){ return finish(part.length); });
    }
    step();
  });
}

/* ------------------------------------------------------------------ me */
function yearsBetween(a, b){ var x = new Date(a + 'T00:00:00Z'), y = new Date(b + 'T00:00:00Z'); if(isNaN(x) || isNaN(y)) return ''; var m = (y.getUTCFullYear() - x.getUTCFullYear()) * 12 + y.getUTCMonth() - x.getUTCMonth(); if(y.getUTCDate() < x.getUTCDate()) m--; if(m < 0) return ''; return Math.floor(m / 12) + ' years ' + (m % 12) + ' months'; }
function vMe(){
  var u = (DB.session || {}).user || {}, R = DB.record || {}, t = today();
  var h = bar('Me', '', '');
  h += '<div class="scroll tabbed">';
  h += '<div class="card bright" style="display:flex;gap:14px;align-items:center"><span class="avatar" style="width:56px;height:56px;font-size:18px">' + esc(ini(u.name)) + '</span><div style="min-width:0"><h2 class="title-m">' + esc(u.name) + '</h2><p class="small">' + esc(roleWord()) + (u.mandal ? '<br>' + esc(u.mandal) : '') + '</p></div></div>';
  var kv = [];
  if(R.empId) kv.push(['Employee ID', R.empId]);
  if(R.dept) kv.push(['Department', R.dept]);
  if(R.cat || R.gaz) kv.push(['Category', [R.cat, R.gaz].filter(Boolean).join(' · ')]);
  if(R.place) kv.push(['Place of working', R.place]);
  if(R.entered) kv.push(['Entered Government service', dmyFull(R.entered) + (yearsBetween(R.entered, t) ? ' · ' + yearsBetween(R.entered, t) : '')]);
  if(R.post) kv.push(['Joined the present post', dmyFull(R.post)]);
  if(R.dob) kv.push(['Date of birth', dmyFull(R.dob)]);
  if(R.retire) kv.push(['Superannuation', dmyFull(R.retire) + (yearsBetween(t, R.retire) ? ' · in ' + yearsBetween(t, R.retire) : '')]);
  if(R.status) kv.push(['Present status', R.status]);
  if(kv.length) h += '<div class="hdr"><span class="eyebrow">Service record</span><span class="small">as your office recorded it</span></div><div class="card bright"><div class="kv">' + kv.map(function(x){ return '<div><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div></div>';
  else if(role() !== 'COLLECTOR') h += '<div class="card"><p class="small">Your office has not yet returned your service record in the Base Format. When it does, it appears here.</p></div>';
  if(R.ctl || R.authCL || R.authOther) h += '<div class="hdr"><span class="eyebrow">As recorded by your office</span></div><div class="card bright"><div class="kv">' + (R.ctl ? '<div><span>Controlling officer</span><b>' + esc(R.ctl) + '</b></div>' : '') + (R.authCL ? '<div><span>Casual leave authority</span><b>' + esc(R.authCL) + '</b></div>' : '') + (R.authOther ? '<div><span>Other leave authority</span><b>' + esc(R.authOther) + '</b></div>' : '') + '</div><p class="small" style="margin-top:8px">On this register every application comes to the District Magistrate for orders.</p></div>';
  h += '<div class="card bright tight">' + installRow() +
    '<button class="row" data-act="chpin"><span class="lead">' + I.key + '</span><span class="txt"><b>Change PIN</b></span><span class="chev"></span></button>' +
    '<button class="row" data-act="refresh"><span class="lead">' + I.refresh + '</span><span class="txt"><b>Refresh from the district</b>' + (DB.at ? '<span>last read ' + esc(dmy(DB.at)) + (hhmm(DB.at) ? ' at ' + hhmm(DB.at) : '') + '</span>' : '') + '</span></button>' +
    '<button class="row" data-act="signout"><span class="lead">' + I.out + '</span><span class="txt"><b>Sign out</b></span></button></div>';
  h += '<p class="foot">District HRMS · Jangaon · version ' + APP_VERSION + '</p>';
  h += '</div>';
  return h;
}
function chpin(){
  sheet('<h2>Change PIN</h2><div class="field"><label for="pOld">Current PIN</label><input id="pOld" type="password" inputmode="numeric" maxlength="8"></div>' +
    '<div class="two" style="margin-top:10px"><div class="field"><label for="pNew">New PIN</label><input id="pNew" type="password" inputmode="numeric" maxlength="8" placeholder="4 to 8 digits"></div><div class="field"><label for="pNew2">Again</label><input id="pNew2" type="password" inputmode="numeric" maxlength="8"></div></div>' +
    '<div class="msg" id="mPin" role="alert" style="margin-top:10px"></div>' +
    '<div class="two" style="margin-top:12px"><button class="btn outl" data-close="1">Not now</button><button class="btn filled" data-yes="1">Change</button></div>');
  $('sheet').querySelector('[data-yes]').addEventListener('click', function(){
    var o = $('pOld').value.trim(), a = $('pNew').value.trim(), b = $('pNew2').value.trim();
    clear('mPin');
    if(!/^\d{4,8}$/.test(a)) return say('mPin', 'bad', 'A PIN is four to eight digits.');
    if(a !== b) return say('mPin', 'bad', 'The two PINs are not the same.');
    post({ kind:'chpass', token:DB.session.token, old:o, newp:a })
      .then(function(r){ if(!r || !r.ok){ if(tokenRefused(r)) return; return say('mPin', 'bad', errText(r)); } closeSheet(); toast('PIN changed.'); })
      .catch(function(){ say('mPin', 'bad', 'The district could not be reached. Try again where there is a line.'); });
  });
}

/* -------------------------------------------------------- sheet and wiring */
function sheet(html){ $('sheet').innerHTML = '<div class="handle"></div>' + html; $('sheet').classList.add('on'); $('scrim').classList.add('on');
  $('sheet').querySelectorAll('[data-close]').forEach(function(b){ b.addEventListener('click', closeSheet); }); }
function closeSheet(){ $('sheet').classList.remove('on'); $('scrim').classList.remove('on'); }
function daySheet(k){
  var C = DB.cal || { days:{}, away:[] }, n = C.days[k] || 0, t = today();
  var who = k === t ? (C.away || []) : [];
  sheet('<h2>' + esc(dmy(k)) + '</h2><p>' + (n ? '<b>' + n + '</b> on sanctioned leave that day.' : 'Nobody on sanctioned leave.') + (DB.holidays[k] ? ' ' + esc(DB.holidays[k]) + '.' : '') + '</p>' +
    (who.length ? '<div class="card bright tight" style="margin-bottom:10px">' + who.slice(0, 12).map(function(p){ return '<div class="row"><span class="lead">' + esc(ini(p.name)) + '</span><span class="txt"><b>' + esc(p.name) + '</b><span>' + esc((KIND_NAME[String(p.type).toUpperCase()] || p.type) + ' to ' + dmy(p.to)) + '</span></span></div>'; }).join('') + (who.length > 12 ? '<div class="row" style="min-height:40px"><span class="txt"><span>and ' + (who.length - 12) + ' more</span></span></div>' : '') + '</div>' : '') +
    '<button class="btn text" data-close="1">Close</button>');
}
function act(k, b){
  if(k === 'signin') return signIn();
  if(k === 'firsttime'){ var p = $('iPhone'); if(p && p.value.replace(/\D/g, '').length === 10) return signIn(); if(p) p.focus(); return say('mSignin', 'info', 'Enter your mobile number above and press Sign in. If the row is yours to claim, the register asks for your code next.'); }
  if(k === 'claim') return claim();
  if(k === 'refresh'){ refresh(); toast('Reading from the district…'); return; }
  if(k === 'signout'){ DB.session = null; DB.rows = []; DB.me = null; DB.pend = []; DB.pendAll = 0; DB.cal = null; DB.account = null; DB.record = null; DB.att = {}; DB.attD = null; ATT = null; save(); go('signin'); return; }
  if(k === 'newreq') return newReq();
  if(k === 'next'){ if(S.req && S.req.to) go('request2'); return; }
  if(k === 'hq'){ S.req.hq = !S.req.hq; b.setAttribute('aria-checked', S.req.hq ? 'true' : 'false'); return; }
  if(k === 'send') return send();
  if(k === 'withdraw') return withdraw();
  if(k === 'sanction' || k === 'refuse'){
    var rem = (($('oRem') || {}).value || '').trim();
    if(k === 'refuse' && !rem){ say('mOrder', 'bad', 'Remarks are needed to refuse. They go to the employee.'); $('oRem').focus(); return; }
    return order(S.detail.id, k === 'sanction' ? 'APPROVED' : 'REJECTED', rem);
  }
  if(k === 'all') return orderAll();
  if(k === 'chpin') return chpin();
  if(k === 'install') return install();
  if(k === 'mark') return startMark();
  if(k === 'attmark') return markNow();
  if(k === 'attagain') return readAgain();
  if(k === 'attsend'){ syncAtt(true); return; }
  if(k === 'attcancel'){ ATT = null; closeSheet(); return; }
}
$('screen').addEventListener('click', function(e){
  var b;
  if((b = e.target.closest('[data-eye]'))){ var inp = $(b.getAttribute('data-eye')); var show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; b.innerHTML = show ? MK.eyeOff : MK.eye; b.setAttribute('aria-label', show ? 'Hide' : 'Show'); inp.focus(); return; }
  if((b = e.target.closest('[data-go]'))) return go(b.getAttribute('data-go'));
  if((b = e.target.closest('[data-detail]'))){ S.detail = findRow(b.getAttribute('data-detail')); return go('detail'); }
  if((b = e.target.closest('[data-order]'))){ S.detail = (DB.pend || []).filter(function(r){ return String(r.id) === b.getAttribute('data-order'); })[0]; return go('order'); }
  if((b = e.target.closest('[data-kind]'))){ if(S.req){ S.req.type = b.getAttribute('data-kind'); S.req.from = S.req.to = ''; render(); } return; }
  if((b = e.target.closest('[data-pick]'))) return pick(b.getAttribute('data-pick'));
  if((b = e.target.closest('[data-cm]'))){ S.calM += Number(b.getAttribute('data-cm')); if(S.calM < 0){ S.calM = 11; S.calY--; } if(S.calM > 11){ S.calM = 0; S.calY++; } return render(); }
  if((b = e.target.closest('[data-hm]'))){ S.hmM += Number(b.getAttribute('data-hm')); if(S.hmM < 0){ S.hmM = 11; S.hmY = (S.hmY || yearNow()) - 1; calendar(); } if(S.hmM > 11){ S.hmM = 0; S.hmY = (S.hmY || yearNow()) + 1; calendar(); } return render(); }
  if((b = e.target.closest('[data-hmgo]'))){ S.hmM = Number(b.getAttribute('data-hmgo')); return render(); }
  if((b = e.target.closest('[data-mym]'))){ var m = Number(b.getAttribute('data-mym')); S.myM = S.myM === m ? null : m; return render(); }
  if((b = e.target.closest('[data-scope]'))){ S.hmScope = b.getAttribute('data-scope'); return render(); }
  if((b = e.target.closest('[data-day]'))) return daySheet(b.getAttribute('data-day'));
  if((b = e.target.closest('[data-act]'))) return act(b.getAttribute('data-act'), b);
});
$('screen').addEventListener('keydown', function(e){
  if(e.key !== 'Enter') return;
  if(e.target.id === 'iPin') signIn();
  if(e.target.id === 'cPin2') claim();
});
$('screen').addEventListener('input', function(e){
  if(!S.req) return;
  if(e.target.id === 'rReason') S.req.reason = e.target.value;
  if(e.target.id === 'rAddr') S.req.addr = e.target.value;
  if(e.target.id === 'rCert') S.req.cert = e.target.value;
});
$('nav').addEventListener('click', function(e){ var b = e.target.closest('[data-tab]'); if(b) go(b.getAttribute('data-tab')); });
$('scrim').addEventListener('click', closeSheet);
/* the mark sheet's own buttons and its camera input live in #sheet, outside #screen */
$('sheet').addEventListener('click', function(e){ var b = e.target.closest('[data-act]'); if(b) act(b.getAttribute('data-act'), b); });
$('sheet').addEventListener('change', function(e){ if(e.target && e.target.id === 'attFile' && e.target.files && e.target.files[0]) onPhoto(e.target.files[0]); });

/* ------------------------------------------------------------------- boot */
/* THE WELCOME. In front of sign-in on every opening, 2.6 s and gone, or gone
   on a tap. It is for people: a driven browser (the render passes) is never
   shown it, so a pass sees the app and not a splash. It is removed from the
   document, not hidden, so nothing can sit under it afterwards. */
(function welcome(){
  var w = $('welcome'); if(!w) return;
  var driven = !!navigator.webdriver && !/[?&]welcome=1/.test(location.search);
  if(driven){ w.remove(); return; }
  w.hidden = false; w.setAttribute('aria-hidden', 'false');
  var gone = false;
  var off = function(){ if(gone) return; gone = true; w.classList.add('off'); setTimeout(function(){ w.remove(); }, 400); };
  w.addEventListener('click', off);
  setTimeout(off, 2800);
})();

load();
var t0 = today(); S.hmY = Number(t0.slice(0, 4)); S.hmM = Number(t0.slice(5, 7)) - 1; S.calY = S.hmY; S.calM = S.hmM;
S.hmScope = 'office';
if(!DB.url){
  S.screen = 'signin'; render();
  say('mSignin', 'bad', 'This app has no district address. config.js has not been written — see DEPLOY-HRMS.md.');
} else if(DB.session && DB.session.token){
  S.screen = 'home'; S.tab = 'home'; render(); refresh();
} else {
  S.screen = 'signin'; render();
}
/* every few minutes while the app is open, so an order passed on the desk
   reaches the phone without a tap */
setInterval(function(){ if(document.visibilityState === 'visible' && DB.session) refresh(); }, 180000);
document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'visible' && DB.session && DB.at && Date.now() - Date.parse(DB.at) > 60000) refresh(); });
if('serviceWorker' in navigator && location.protocol !== 'file:' && !navigator.webdriver){
  try{ navigator.serviceWorker.register('sw.js'); }catch(e){}
}

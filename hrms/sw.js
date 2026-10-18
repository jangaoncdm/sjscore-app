/* DISTRICT HRMS — offline shell.
   The app shell is cached so the app opens with no network and the employee
   sees his own last-read account; every call to the register carries a query
   string and is never cached and never served from cache, because a leave
   application is a request for orders and not a fact a handset can hold.
   ONE ORIGIN, THREE APPS, THREE CACHES: caches are keyed by name and shared
   across an origin, so this one is the HRMS app's own. */
const CACHE = 'hrms-v2-0-0';
const SHELL = [
  './', './index.html', './app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon-180.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(SHELL.map(a => c.add(a).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(e.request.method !== 'GET') return;
  if(url.search || url.origin !== self.location.origin) return;     /* the register, never cached */
  /* code newest-first: the network wins when there is one, the shell when there is not */
  e.respondWith(fetch(e.request).then(r => {
    if(r && r.ok){ const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => null); }
    return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});

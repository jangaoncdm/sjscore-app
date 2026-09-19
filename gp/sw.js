/* SJ-SCORE Field — offline shell
   Rules: the app shell is cached so the app opens with no network.
   Anything carrying a query string — every API call — is never cached
   and never served from cache.
   5.0 drops the Chart.js CDN. It was loaded on every start and never used,
   which cost bandwidth on a weak signal and put a third-party origin in a
   government app for no reason. */
/* ONE ORIGIN, TWO APPS, TWO CACHES. Caches are keyed by NAME and shared
   across an origin, so the GP app published at /gp/ would otherwise serve the
   sanitation app's shell to a Gram Palana Officer. A worker cannot read
   config.js, so it takes the tenant from its own address — which is the one
   thing about it that is already different. */
const TENANT = /\/gp\//.test(self.location.pathname) ? 'gp' : 'sjf';
/* BUMPED so a handset that started offline cannot go on serving a shell
   from before one officer's mark stopped showing against another's name.
   Code is fetched newest-first, so an online phone was never stale; this
   is for the one that opened the app on a village road with no signal. */
const CACHE = TENANT + '-v6-14-0';
const SHELL = [
  './', './index.html', './app.js', './manifest.webmanifest', './privacy.html',
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

/* NOTIFICATIONS.
   Android will not show a notification raised with `new Notification()` from a
   page — it has to come from the service worker registration, which is why the
   app calls reg.showNotification(). Tapping one must land the officer back in
   the app rather than opening a second copy of it.

   The push handler below has no sender behind it yet: a real push needs a
   VAPID key signed ES256, and the district's Apps Script backend can sign RSA
   and HMAC only. It is here so that the day a sender is put in place, no
   handset needs updating — and it refuses to invent a message, so nothing can
   ever tell an officer something the district did not say. */
self.addEventListener('push', e => {
  let d = {};
  try{ d = e.data ? e.data.json() : {}; }catch(err){ d = { body: e.data ? e.data.text() : '' }; }
  if(!d.title && !d.body) return;
  e.waitUntil(self.registration.showNotification(d.title || 'SJGP', {
    body: d.body || '', tag: d.tag || 'sjgp', icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png', data: { open: d.open || './' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const want = (e.notification.data && e.notification.data.open) || './';
  e.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => {
    for(const c of list){
      if(c.url.indexOf(self.registration.scope) === 0 && 'focus' in c) return c.focus();
    }
    return clients.openWindow(want);
  }));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  // Every API call carries a query string. Leave those to the browser
  // entirely — no cache read, no cache write.
  if (url.search) return;
  if (url.origin !== self.location.origin) return;

  // The page itself and the code: newest wins, cache is the fallback.
  const isCode = req.mode === 'navigate' ||
                 /\.(html|js|webmanifest)$/.test(url.pathname) ||
                 url.pathname.endsWith('/');
  if (isCode) {
    e.respondWith(
    /* STRAIGHT PAST THE BROWSER OWN CACHE. Newest-first was already the rule
       here, but fetch(req) is itself served from the HTTP cache, and GitHub
       Pages sends a ten-minute one - so an officer online, with this worker
       doing exactly what it was told, could still be handed the console and
       the app as they were ten minutes ago. Reported three times as "I cannot
       see the update", and answered three times with "hard reload", which is
       not an answer you can give 414 people. no-store goes to the network
       itself; the cache below is still the fallback the moment there is no
       network. */
      fetch(req, { cache: 'no-store' }).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Icons and images: cache first, they never change within a version.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }))
  );
});

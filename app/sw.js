/* SJ-SCORE Field — offline shell
   Rules: the app shell is cached so the app opens with no network.
   Anything carrying a query string — every API call — is never cached
   and never served from cache.
   5.0 drops the Chart.js CDN. It was loaded on every start and never used,
   which cost bandwidth on a weak signal and put a third-party origin in a
   government app for no reason. */
const CACHE = 'sjf-v5-2';
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
      fetch(req).then(res => {
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

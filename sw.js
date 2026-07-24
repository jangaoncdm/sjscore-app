/* SJ-SCORE Field — offline shell */
const CACHE='sjf-v4-0';
const ASSETS=['./','./index.html','./app.js','./manifest.webmanifest',
 './icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png',
 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(ASSETS.map(a=>c.add(a).catch(()=>null)))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  if(e.request.url.includes('script.google')){ e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))); return; }
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>hit||fetch(e.request).then(res=>{
    const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{}); return res;
  }).catch(()=> e.request.mode==='navigate' ? caches.match('./index.html') : Response.error())));
});

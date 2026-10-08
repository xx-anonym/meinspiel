// Besetzung – Service Worker: erst das Netz, bei Funkstille der Cache.
const CACHE = 'besetzung-v1';
const SHELL = ['./', 'index.html', 'style.css', 'icon.svg', 'manifest.webmanifest',
  'js/main.js', 'js/spiel.js', 'js/daten.js', 'js/audio.js', 'js/speicher.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const schrift = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !schrift) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const k = res.clone(); caches.open(CACHE).then((c) => c.put(req, k)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('index.html'))),
  );
});

// Poker Coach service worker: stores the app on the device so it runs offline.
// To publish an update: replace index.html and change VERSION below.
const VERSION = 'poker-coach-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Fonts: keep a copy the first time they load, then always use the stored copy.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => new Response('', { status: 503 })))));
    return;
  }
  if (url.origin !== location.origin) return;
  // App files: answer instantly from the device, refresh the stored copy in the background.
  e.respondWith(caches.open(VERSION).then(c =>
    c.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return net.then(res => res || (req.mode === 'navigate' ? c.match('./index.html') : new Response('', { status: 504 })));
    })));
});

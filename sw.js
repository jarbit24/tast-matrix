const CACHE = 'task-matrix-v2';
const SHELL = ['./index.html', './'];

// These hosts must NEVER be intercepted — Firebase/Firestore use long-lived
// streaming connections that break if a service worker touches them
const PASSTHROUGH_HOSTS = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'www.googleapis.com',
  'firebaseapp.com',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Let Firebase/Firestore requests pass straight through — don't intercept
  try {
    const url = new URL(e.request.url);
    if (PASSTHROUGH_HOSTS.some(h => url.hostname.endsWith(h))) return;
  } catch(_) { return; }

  // Network-first for app shell: always try live, fall back to cache when offline
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

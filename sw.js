/* ══════════════════════════════════════════
   sw.js — ইমরান ক্লথ স্টোর Service Worker
   PWA অফলাইন সাপোর্টের জন্য
══════════════════════════════════════════ */

const CACHE_NAME = 'imran-cloth-store-v16;

/* যেসব ফাইল ইনস্টলেশনের সময়ই ক্যাশ হবে */
const PRECACHE_URLS = [
  './index.html',
  './manifest.json'
];

/* ── Install: প্রয়োজনীয় ফাইল ক্যাশ করো ── */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      /* নতুন SW সাথে সাথে activate হবে, পুরনোটার জন্য অপেক্ষা করবে না */
      return self.skipWaiting();
    })
  );
});

/* ── Activate: পুরনো ক্যাশ মুছে দাও ── */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      /* সব ক্লায়েন্ট এখনই নতুন SW-এর আওতায় আসবে */
      return self.clients.claim();
    })
  );
});

/* ── Fetch: Cache First, তারপর Network ── */
self.addEventListener('fetch', function(event) {
  /* শুধু GET রিকোয়েস্ট হ্যান্ডেল করো */
  if (event.request.method !== 'GET') return;

  /* Firebase, Google Fonts, CDN — নেটওয়ার্ক থেকেই আনো */
  var url = event.request.url;
  var isExternal = (
    url.includes('firebaseio.com') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('googleapis.com') ||
    url.includes('cdnjs.cloudflare.com')
  );

  if (isExternal) {
    /* External: নেটওয়ার্ক ফার্স্ট, ব্যর্থ হলে ক্যাশ */
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  /* Local ফাইল: ক্যাশ ফার্স্ট, না থাকলে নেটওয়ার্ক থেকে আনো ও ক্যাশ করো */
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;

      return fetch(event.request).then(function(response) {
        /* শুধু সফল রেসপন্স ক্যাশ করো */
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        var toCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, toCache);
        });
        return response;
      });
    })
  );
});

/* ── Background Sync (ভবিষ্যতের জন্য) ── */
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-data') {
    console.log('[SW] Background sync triggered');
  }
});

// Groupware service worker: app-shell precache + network-first navigations +
// cache-first static assets for offline support and installability.
const CACHE = 'ogw-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // 一つでも欠けていても全体が失敗しないよう個別に追加
      await Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // クロスオリジンとAPIはキャッシュしない
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) {
    return;
  }

  // ナビゲーション: ネットワーク優先(オフライン時はキャッシュ/"/"にフォールバック)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          // エラーや認証リダイレクトの結果をキャッシュしない
          if (res.ok && res.type === 'basic') {
            const cache = await caches.open(CACHE);
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          const cached = await caches.match(req);
          return cached || (await caches.match('/')) || Response.error();
        }
      })()
    );
    return;
  }

  // 静的アセット: キャッシュ優先(stale-while-revalidate)
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const cache = caches.open(CACHE);
            cache.then((c) => c.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => undefined);
      return cached || (await network) || Response.error();
    })()
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        ASSETS.map(async (path) => {
          const response = await fetch(new Request(path, { cache: 'reload', redirect: 'error' }));
          const mime = response.headers.get('content-type') || '';
          const expected = /\.js$/.test(path)
            ? /javascript/
            : /\.css$/.test(path)
              ? /text\/css/
              : /\.(svg|png)$/.test(path)
                ? /image\//
                : /\.webmanifest$/.test(path)
                  ? /json|manifest/
                  : /text\/html/;
          if (!response.ok || response.redirected || !expected.test(mime))
            throw new Error('Invalid app asset: ' + path);
          if (
            (path === '/' || path === '/index.html') &&
            !(await response.clone().text()).includes('id="world"')
          )
            throw new Error('Authentication or invalid app shell');
          await cache.put(path, response);
        }),
      );
    })(),
  );
});
self.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith('study-arcana-action-') && name !== CACHE) await caches.delete(name);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin)
    return;
  event.respondWith(
    (async () => {
      // This cache contains only our verified, immutable shell/assets. Module
      // requests have an Origin header, unlike same-origin install fetches; Vite
      // sends Vary: Origin. Normalize that difference for offline cache lookup.
      const cache = await caches.open(CACHE);
      const cached = await cache.match(event.request, { ignoreVary: true });
      if (cached) return cached;
      if (event.request.mode === 'navigate')
        return (await cache.match('/index.html', { ignoreVary: true })) || fetch(event.request);
      return fetch(event.request);
    })(),
  );
});

/* Static app cache. All URLs resolve within the GitHub Pages project directory. */
const VERSION = "2026.10.08-r26";
const PREFIX = "tg-pilot-planner:" + self.registration.scope + ":";
const CACHE = PREFIX + VERSION;
const assetURL = (path) => new URL(path, self.registration.scope).href;
const INDEX = assetURL("index.html");
const ASSETS = [
  INDEX,
  assetURL("vendor/pdfjs/pdf.min.mjs"),
  assetURL("vendor/pdfjs/pdf.worker.min.mjs"),
  assetURL("vendor/html2canvas/html2canvas.min.js"),
  assetURL("vendor/fonts/NotoSansThai-400.ttf"),
  assetURL("vendor/fonts/NotoSansThai-600.ttf"),
  assetURL("vendor/fonts/NotoSansThai-700.ttf"),
  assetURL("vendor/fonts/RobotoMono-600.ttf"),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        await cache.addAll(
          ASSETS.map((url) => new Request(url, { cache: "reload" })),
        );
        if (!self.registration.active) await self.skipWaiting();
      } catch (error) {
        await caches.delete(CACHE);
        throw error;
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isAppPage =
    event.request.mode === "navigate" &&
    (url.pathname === new URL(self.registration.scope).pathname ||
      url.pathname === new URL(INDEX).pathname);
  const asset = new URL(url);
  if (asset.pathname === new URL(ASSETS[1]).pathname)
    asset.searchParams.delete("pdf-retry");
  if (!isAppPage && !ASSETS.includes(asset.href)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      return (
        (await cache.match(isAppPage ? INDEX : asset.href)) ||
        fetch(event.request)
      );
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") {
    event.waitUntil(self.skipWaiting());
  }
  if (event.data?.type === "CACHE_STATUS") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE);
        const responses = await Promise.all(
          ASSETS.map((url) => cache.match(url)),
        );
        event.ports[0]?.postMessage({
          ready: responses.every(Boolean),
          version: VERSION,
        });
      })(),
    );
  }
});

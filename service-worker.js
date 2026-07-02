const CACHE_NAME = "astrochat-cache-v66";
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    activateLatestWorker()
  );
});

async function activateLatestWorker() {
  const keys = await caches.keys();
  const oldKeys = keys.filter((key) => key.startsWith("astrochat-cache-") && key !== CACHE_NAME);

  await Promise.all(oldKeys.map((key) => caches.delete(key)));
  await self.clients.claim();

  if (!oldKeys.length) return;

  const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  await Promise.all(
    clientList
      .filter((client) => client.url && new URL(client.url).origin === self.location.origin)
      .map((client) => client.navigate(client.url))
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (isAppShellRequest(event.request)) {
    event.respondWith(fetchAndRefreshCache(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((response) => {
          const shouldCache =
            event.request.url.startsWith(self.location.origin) ||
            event.request.url.includes("cdnjs.cloudflare.com/ajax/libs/font-awesome");

          if (shouldCache) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }

          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isAppShellRequest(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;

  return url.pathname.endsWith("/") ||
    ["/index.html", "/app.js", "/style.css", "/manifest.json", "/service-worker.js"].some((path) => url.pathname.endsWith(path));
}

async function fetchAndRefreshCache(request) {
  const response = await fetch(request, { cache: "reload" });
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const sameOriginClient = clientList.find((client) => new URL(client.url).origin === self.location.origin);

      if (sameOriginClient) {
        sameOriginClient.focus();
        return;
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const title = payload.title || "AstroChat";
  const options = {
    body: payload.body || "Nova atividade no AstroChat.",
    icon: payload.icon || "icons/icon-192.png",
    badge: payload.badge || "icons/icon-192.png",
    tag: payload.tag || "astrochat-background",
    renotify: true,
    data: {
      url: payload.url || "./",
      ...payload.data
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

function readPushPayload(event) {
  if (!event.data) return {};

  try {
    return event.data.json();
  } catch (error) {
    return { body: event.data.text() };
  }
}

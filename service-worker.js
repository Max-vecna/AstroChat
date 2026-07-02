const CACHE_NAME = "astrochat-cache-v46";
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
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

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

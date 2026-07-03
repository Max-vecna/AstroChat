const CACHE_NAME = "astrochat-cache-v71";
const FIREBASE_MESSAGING_SDK_VERSION = "10.12.2";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC0eXt2QukMgcAJRzgflenD46JvRBfmczg",
  authDomain: "astro-chat-7d044.firebaseapp.com",
  projectId: "astro-chat-7d044",
  storageBucket: "astro-chat-7d044.firebasestorage.app",
  messagingSenderId: "64273019284",
  appId: "1:64273019284:web:c4a9ade561d5270b9edf81",
  measurementId: "G-HTNLE1C4P4"
};
let firebaseMessagingReady = false;
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

  const roomId = event.notification.data?.roomId || "";
  const targetUrl = event.notification.data?.url || (roomId ? `./index.html#room=${encodeURIComponent(roomId)}` : "./");
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const sameOriginClient = clientList.find((client) => new URL(client.url).origin === self.location.origin);

      if (sameOriginClient) {
        if (roomId) {
          sameOriginClient.postMessage({ type: "OPEN_ROOM_FROM_NOTIFICATION", roomId });
        }
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
  const { title, options } = createNotificationFromPushPayload(payload);
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

function isAstroChatFcmPayload(payload = {}) {
  const data = payload.data || {};
  return data.fcmSource === "astrochat" || data.type === "chat-message";
}

function createNotificationFromPushPayload(payload = {}) {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const roomId = data.roomId || payload.roomId || "";
  const messageId = data.messageId || payload.messageId || "";
  const title = data.title || notification.title || payload.title || "AstroChat";
  const body = data.body || notification.body || payload.body || "Nova atividade no AstroChat.";
  const url = data.url || payload.url || (roomId ? `./index.html#room=${encodeURIComponent(roomId)}` : "./");

  return {
    title,
    options: {
      body,
      icon: data.icon || notification.icon || payload.icon || "icons/icon-192.png",
      badge: data.badge || payload.badge || "icons/icon-192.png",
      tag: data.tag || payload.tag || (roomId && messageId ? `chat:${roomId}:${messageId}` : "astrochat-background"),
      renotify: true,
      data: {
        url,
        roomId,
        messageId,
        ...data
      }
    }
  };
}

function initializeFirebaseMessaging() {
  try {
    importScripts(`https://www.gstatic.com/firebasejs/${FIREBASE_MESSAGING_SDK_VERSION}/firebase-app-compat.js`);
    importScripts(`https://www.gstatic.com/firebasejs/${FIREBASE_MESSAGING_SDK_VERSION}/firebase-messaging-compat.js`);

    firebase.initializeApp(FIREBASE_CONFIG);
    const messaging = firebase.messaging();
    firebaseMessagingReady = true;

    messaging.onBackgroundMessage((payload) => {
      console.log("AstroChat FCM background payload recebido.", payload);
    });
  } catch (error) {
    firebaseMessagingReady = false;
    console.warn("Firebase Messaging indisponivel no service worker.", error);
  }
}

initializeFirebaseMessaging();

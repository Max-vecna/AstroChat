const CACHE_NAME = "astrochat-cache-v80";
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
const RECENT_NOTIFICATION_KEYS = new Map();
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
  event.waitUntil(installAppShell());
  self.skipWaiting();
});

async function installAppShell() {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(APP_FILES.map(async (file) => {
    try {
      const response = await fetch(file, { cache: "reload" });
      if (response && response.ok) {
        await cache.put(file, response);
      }
    } catch (error) {
      console.warn("Nao foi possivel salvar arquivo no cache do app.", file, error);
    }
  }));
}

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

function isAstroChatFcmPayload(payload = {}) {
  const data = payload.data || {};
  return data.fcmSource === "astrochat" || data.type === "chat-message";
}

function createNotificationFromPushPayload(payload = {}) {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const roomId = data.roomId || payload.roomId || "";
  const messageId = data.messageId || data.message_id || payload.messageId || "";
  const timestamp = getPayloadTimestamp(data);
  const title = data.title || notification.title || payload.title || "AstroChat";
  const body = data.body || notification.body || payload.body || "Nova atividade no AstroChat.";
  const url = data.url || payload.url || (roomId ? `./index.html#room=${encodeURIComponent(roomId)}` : "./");
  const isChatMessage = data.type === "chat-message" || Boolean(roomId);
  const uniqueMessagePart = messageId || timestamp || Math.random().toString(36).slice(2, 10);
  const tag = isChatMessage ? `chat:${roomId || "room"}:${uniqueMessagePart}` : (data.tag || payload.tag || createUniqueNotificationTag());
  const notificationKey = isChatMessage
    ? `chat:${roomId || "room"}:${uniqueMessagePart}:${data.authorUid || "user"}`
    : tag;

  return {
    title,
    notificationKey,
    payloadData: {
      ...data,
      type: data.type || (roomId ? "chat-message" : ""),
      roomId,
      messageId,
      timestamp: String(timestamp),
      title,
      body,
      url
    },
    options: {
      body,
      icon: data.icon || notification.icon || payload.icon || "icons/icon-192.png",
      badge: data.badge || payload.badge || "icons/icon-192.png",
      tag,
      renotify: true,
      timestamp,
      vibrate: [120, 80, 120],
      data: {
        url,
        roomId,
        messageId,
        timestamp,
        ...data
      }
    }
  };
}

function getPayloadTimestamp(data = {}) {
  const candidates = [data.timestamp, data.time, data.sentAt, data.createdAt, Date.now()];
  const value = candidates.find((candidate) => Number.isFinite(Number(candidate)) && Number(candidate) > 0);
  return Number(value || Date.now());
}

async function showAstroChatNotification(payload = {}, source = "push") {
  const { title, options, notificationKey, payloadData } = createNotificationFromPushPayload(payload);

  if (wasNotificationRecentlyShown(notificationKey)) {
    return;
  }

  markNotificationRecentlyShown(notificationKey);
  notifyOpenClientsAboutPush(payloadData);

  try {
    await self.registration.showNotification(title, options);
  } catch (error) {
    console.warn("Nao foi possivel mostrar notificacao push.", source, error);
  }
}

async function notifyOpenClientsAboutPush(payloadData = {}) {
  try {
    const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    await Promise.all(
      clientList
        .filter((client) => client.url && new URL(client.url).origin === self.location.origin)
        .map((client) => client.postMessage({ type: "ASTROCHAT_PUSH_RECEIVED", payloadData }))
    );
  } catch (error) {
    console.warn("Nao foi possivel avisar clientes abertos sobre o push.", error);
  }
}

async function syncOpenClientsFromPushPayload(payload = {}) {
  try {
    const { payloadData, notificationKey } = createNotificationFromPushPayload(payload);
    if (wasNotificationRecentlyShown(notificationKey)) return;
    markNotificationRecentlyShown(notificationKey);
    await notifyOpenClientsAboutPush(payloadData);
  } catch (error) {
    console.warn("Nao foi possivel sincronizar clientes abertos com o push.", error);
  }
}

function createUniqueNotificationTag() {
  return `astrochat:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function wasNotificationRecentlyShown(key) {
  clearOldNotificationKeys();
  return RECENT_NOTIFICATION_KEYS.has(key);
}

function markNotificationRecentlyShown(key) {
  clearOldNotificationKeys();
  RECENT_NOTIFICATION_KEYS.set(key, Date.now());
}

function clearOldNotificationKeys() {
  const now = Date.now();
  RECENT_NOTIFICATION_KEYS.forEach((createdAt, key) => {
    if (now - createdAt > 8000) {
      RECENT_NOTIFICATION_KEYS.delete(key);
    }
  });
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
      return showAstroChatNotification(payload, "fcm");
    });
  } catch (error) {
    firebaseMessagingReady = false;
    console.warn("Firebase Messaging indisponivel no service worker.", error);
  }
}


self.addEventListener("push", (event) => {
  const payload = getPayloadFromPushEvent(event);
  if (!payload || !isAstroChatFcmPayload(payload)) return;

  event.waitUntil(showAstroChatNotification(payload, "push"));
});

function getPayloadFromPushEvent(event) {
  if (!event?.data) return null;

  try {
    const rawPayload = event.data.json();
    if (rawPayload?.data || rawPayload?.notification) return rawPayload;
    return { data: rawPayload };
  } catch (error) {
    try {
      const text = event.data.text();
      const rawPayload = JSON.parse(text);
      if (rawPayload?.data || rawPayload?.notification) return rawPayload;
      return { data: rawPayload };
    } catch (innerError) {
      return null;
    }
  }
}

initializeFirebaseMessaging();

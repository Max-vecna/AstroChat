const CACHE_NAME = "astrochat-cache-v153";
const SERVICE_WORKER_VERSION = "v151";
const PUSH_SETTINGS_CACHE = "astrochat-push-settings-v1";
const PUSH_SETTINGS_REQUEST = "./__astrochat-system-push-settings";
const FCM_TOKEN_REFRESH_REQUEST = "./__astrochat-fcm-token-refresh-request";
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
let systemPushNotificationsEnabled = true;
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
  console.info(`[AstroChat Push] Instalando Service Worker ${SERVICE_WORKER_VERSION}.`);
  self.skipWaiting();
  event.waitUntil(installAppShell());
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
  console.info(`[AstroChat Push] Service Worker ${SERVICE_WORKER_VERSION} ativo.`);
  const keys = await caches.keys();
  const oldKeys = keys.filter((key) => key.startsWith("astrochat-cache-") && key !== CACHE_NAME);

  await Promise.all(oldKeys.map((key) => caches.delete(key)));
  await self.clients.claim();
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
    return;
  }

  if (event.data?.type === "SET_SYSTEM_PUSH_ENABLED") {
    event.waitUntil(setSystemPushNotificationsEnabled(event.data.enabled));
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

async function setSystemPushNotificationsEnabled(enabled) {
  systemPushNotificationsEnabled = Boolean(enabled);

  try {
    const cache = await caches.open(PUSH_SETTINGS_CACHE);
    const response = new Response(
      JSON.stringify({ systemPushNotificationsEnabled }),
      { headers: { "Content-Type": "application/json" } }
    );
    await cache.put(PUSH_SETTINGS_REQUEST, response);
  } catch (error) {
    console.warn("Nao foi possivel salvar preferencia de push do sistema.", error);
  }
}

async function areSystemPushNotificationsAllowed() {
  try {
    const cache = await caches.open(PUSH_SETTINGS_CACHE);
    const response = await cache.match(PUSH_SETTINGS_REQUEST);
    if (!response) return systemPushNotificationsEnabled !== false;

    const settings = await response.json();
    systemPushNotificationsEnabled = settings?.systemPushNotificationsEnabled !== false;
  } catch (error) {
    console.warn("Nao foi possivel ler preferencia de push do sistema.", error);
  }

  return systemPushNotificationsEnabled !== false;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const fcmMessage = notificationData.FCM_MSG || {};
  const fcmData = fcmMessage.data || {};
  const type = notificationData.type || fcmData.type || "";
  const roomId = type === "chat-message"
    ? (notificationData.roomId || fcmData.roomId || "")
    : "";
  const targetUrl =
    notificationData.url ||
    fcmData.url ||
    fcmMessage.fcmOptions?.link ||
    (roomId ? `./index.html#room=${encodeURIComponent(roomId)}` : "./index.html#notifications");

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const sameOriginClient = clientList.find((client) => new URL(client.url).origin === self.location.origin);

      if (sameOriginClient) {
        if (roomId) {
          sameOriginClient.postMessage({ type: "OPEN_ROOM_FROM_NOTIFICATION", roomId });
        } else {
          sameOriginClient.postMessage({ type: "OPEN_NOTIFICATIONS_FROM_NOTIFICATION" });
        }
        return sameOriginClient.focus();
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(requestFcmTokenRefreshFromClients("pushsubscriptionchange"));
});

async function requestFcmTokenRefreshFromClients(reason = "push") {
  try {
    const cache = await caches.open(PUSH_SETTINGS_CACHE);
    const response = new Response(
      JSON.stringify({ reason, requestedAt: Date.now() }),
      { headers: { "Content-Type": "application/json" } }
    );
    await cache.put(FCM_TOKEN_REFRESH_REQUEST, response);
  } catch (error) {
    console.warn("Nao foi possivel salvar pedido de refresh do token FCM.", error);
  }

  try {
    const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    await Promise.all(
      clientList
        .filter((client) => client.url && new URL(client.url).origin === self.location.origin)
        .map((client) => client.postMessage({ type: "REFRESH_FCM_TOKEN", reason }))
    );
  } catch (error) {
    console.warn("Nao foi possivel avisar clientes para renovar o token FCM.", error);
  }
}

function isAstroChatFcmPayload(payload = {}) {
  const data = payload.data || payload.notification?.data || {};
  const supportedTypes = new Set(["chat-message", "friend-request", "room-invite"]);
  return String(data.fcmSource || "").startsWith("astrochat") || supportedTypes.has(String(data.type || ""));
}

function createNotificationFromPushPayload(payload = {}) {
  const notification = payload.notification || {};
  const data = {
    ...(notification.data || {}),
    ...(payload.data || {})
  };
  const type = String(data.type || "");
  const isChatMessage = type === "chat-message";
  const roomId = isChatMessage ? (data.roomId || payload.roomId || "") : "";
  const messageId = data.messageId || data.message_id || payload.messageId || "";
  const inviteId = data.inviteId || "";
  const timestamp = getPayloadTimestamp(data);
  const title = data.title || notification.title || payload.title || "AstroChat";
  const body = data.body || notification.body || payload.body || "Nova atividade no AstroChat.";
  const url = data.url || payload.url || (roomId
    ? `./index.html#room=${encodeURIComponent(roomId)}`
    : "./index.html#notifications");
  const uniquePart = messageId || inviteId || timestamp || Math.random().toString(36).slice(2, 10);
  const tag = isChatMessage
    ? `chat:${roomId || "room"}:${uniquePart}`
    : `invite:${inviteId || uniquePart}`;
  const notificationKey = isChatMessage
    ? `chat:${roomId || "room"}:${uniquePart}:${data.authorUid || "user"}`
    : `${type || "activity"}:${inviteId || uniquePart}:${data.fromUid || "user"}`;

  return {
    title,
    notificationKey,
    payloadData: {
      ...data,
      type,
      roomId,
      messageId,
      inviteId,
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
      silent: false,
      timestamp,
      requireInteraction: data.mentioned === "1",
      vibrate: data.mentioned === "1" ? [120, 60, 120, 60, 180] : [120, 80, 120],
      data: {
        url,
        type,
        roomId,
        messageId,
        inviteId,
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
  let systemNotificationShown = false;

  if (await areSystemPushNotificationsAllowed()) {
    try {
      await self.registration.showNotification(title, options);
      systemNotificationShown = true;
    } catch (error) {
      console.warn("Nao foi possivel mostrar notificacao push.", source, error);
      await requestFcmTokenRefreshFromClients("show-notification-failed");
    }
  }

  await notifyOpenClientsAboutPush({ ...payloadData, systemNotificationShown });
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

async function syncOpenClientsFromPushPayload(payload = {}, options = {}) {
  try {
    const { payloadData, notificationKey } = createNotificationFromPushPayload(payload);
    if (wasNotificationRecentlyShown(notificationKey)) return;
    markNotificationRecentlyShown(notificationKey);
    await notifyOpenClientsAboutPush({
      ...payloadData,
      systemNotificationShown: options.systemNotificationShown === true
    });
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
      if (payload?.notification?.title) {
        console.log("[AstroChat Push] Notificação visível será exibida automaticamente pelo FCM/navegador.");
        return syncOpenClientsFromPushPayload(payload, { systemNotificationShown: true });
      }
      return showAstroChatNotification(payload, "fcm-data");
    });
  } catch (error) {
    firebaseMessagingReady = false;
    console.warn("Firebase Messaging indisponivel no service worker.", error);
  }
}


self.addEventListener("push", (event) => {
  const payload = getPayloadFromPushEvent(event);
  if (!payload || !isAstroChatFcmPayload(payload)) return;
  if (payload?.notification?.title) {
    event.waitUntil(syncOpenClientsFromPushPayload(payload, { systemNotificationShown: true }));
    return;
  }

  event.waitUntil(showAstroChatNotification(payload, "push-data"));
});

function getPayloadFromPushEvent(event) {
  if (!event?.data) return null;

  try {
    const rawPayload = event.data.json();
    if (rawPayload?.data || rawPayload?.notification) return normalizePushPayload(rawPayload);
    return { data: rawPayload };
  } catch (error) {
    try {
      const text = event.data.text();
      const rawPayload = JSON.parse(text);
      if (rawPayload?.data || rawPayload?.notification) return normalizePushPayload(rawPayload);
      return { data: rawPayload };
    } catch (innerError) {
      return null;
    }
  }
}

function normalizePushPayload(payload = {}) {
  const notification = payload.notification || {};
  const notificationData = notification.data && typeof notification.data === "object" ? notification.data : {};
  const data = payload.data && typeof payload.data === "object" ? payload.data : {};

  return {
    ...payload,
    notification,
    data: {
      ...notificationData,
      ...data
    }
  };
}

areSystemPushNotificationsAllowed();
initializeFirebaseMessaging();

const { onValueCreated } = require("firebase-functions/database");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const webPush = require("web-push");

admin.initializeApp();

const DATABASE_INSTANCE = "astro-chat-7d044-default-rtdb";
const FUNCTION_REGION = "us-central1";
const MAX_MULTICAST_TOKENS = 500;
const WEB_PUSH_PUBLIC_VAPID_KEY = "BLE7nXv1JR25D7PSPJgHRXcAIQUhe1R0XOhFPGheglqfIpNIo9G95_lSTDtFUNx4GjWZHFaRkdlMylcItINrvAs";
const WEB_PUSH_PRIVATE_VAPID_KEY = String(process.env.WEB_PUSH_PRIVATE_VAPID_KEY || "").trim();
const WEB_PUSH_SUBJECT = String(process.env.WEB_PUSH_SUBJECT || "mailto:astrochat@example.com").trim();

if (WEB_PUSH_PRIVATE_VAPID_KEY) {
  webPush.setVapidDetails(WEB_PUSH_SUBJECT, WEB_PUSH_PUBLIC_VAPID_KEY, WEB_PUSH_PRIVATE_VAPID_KEY);
}

exports.sendChatMessageNotification = onValueCreated(
  {
    ref: "/rooms/{roomId}/messages/{messageId}",
    instance: DATABASE_INSTANCE,
    region: FUNCTION_REGION
  },
  async (event) => {
    const message = event.data.val() || {};
    const roomId = event.params.roomId;
    const messageId = event.params.messageId;
    const authorUid = String(message.authorUid || "");

    if (!roomId || !messageId || !authorUid) return;

    const rootRef = event.data.ref.root;
    const roomSnapshot = await rootRef.child(`rooms/${roomId}`).get();
    const room = roomSnapshot.val() || {};
    const recipientUids = Object.keys(room.memberUids || {}).filter((uid) => uid && uid !== authorUid);

    if (!recipientUids.length) return;

    const [tokenRecords, webPushRecords] = await Promise.all([
      collectRecipientTokenRecords(rootRef, recipientUids),
      collectRecipientWebPushSubscriptionRecords(rootRef, recipientUids)
    ]);

    if (!tokenRecords.length && !webPushRecords.length) {
      logger.info("No push registrations for chat notification recipients.", { roomId, messageId });
      return;
    }

    const authorNick = truncateForPush(message.authorNick || "Alguem", 48);
    const roomName = truncateForPush(room.name || "AstroChat", 64);
    const text = truncateForPush(message.text || message.translatedText || "Nova mensagem", 120);
    const title = `Nova mensagem de ${authorNick}`;
    const body = `${roomName}: ${text}`;
    const now = Date.now();

    const data = stringifyData({
      type: "chat-message",
      fcmSource: "astrochat",
      roomId,
      messageId,
      authorUid,
      authorNick,
      roomName,
      title,
      body,
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      tag: `chat:${roomId}:${messageId}`,
      timestamp: now,
      url: `./index.html#room=${encodeURIComponent(roomId)}`
    });
    const webpush = {
      headers: {
        Urgency: "high",
        TTL: "86400"
      },
      notification: {
        title,
        body,
        icon: "icons/icon-192.png",
        badge: "icons/icon-192.png",
        tag: `chat:${roomId}:${messageId}`,
        renotify: true,
        timestamp: now,
        data
      }
    };
    const link = getWebpushLink(roomId);

    if (link) {
      webpush.fcmOptions = { link };
    }

    const staleTokenUpdates = {};
    let successCount = 0;
    let failureCount = 0;

    if (tokenRecords.length) {
      for (const chunk of chunkArray(tokenRecords, MAX_MULTICAST_TOKENS)) {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: chunk.map((record) => record.token),
          notification: {
            title,
            body
          },
          data,
          webpush
        });

        successCount += response.successCount;
        failureCount += response.failureCount;

        response.responses.forEach((result, index) => {
          if (result.success) return;

          const record = chunk[index];
          logger.warn("FCM notification failed.", {
            roomId,
            messageId,
            uid: record.uid,
            deviceId: record.deviceId,
            code: result.error?.code,
            message: result.error?.message
          });

          if (isInvalidFcmTokenError(result.error)) {
            staleTokenUpdates[`fcmTokens/${record.uid}/${record.deviceId}`] = null;
          }
        });
      }
    }

    const standardPushResult = await sendStandardWebPushNotifications(rootRef, webPushRecords, {
      data,
      notification: webpush.notification
    });

    if (Object.keys(staleTokenUpdates).length) {
      await rootRef.update(staleTokenUpdates);
    }

    logger.info("Chat notification sent.", {
      roomId,
      messageId,
      recipients: recipientUids.length,
      tokens: tokenRecords.length,
      successCount,
      failureCount,
      webPushSubscriptions: webPushRecords.length,
      webPushSuccessCount: standardPushResult.successCount,
      webPushFailureCount: standardPushResult.failureCount,
      staleTokensRemoved: Object.keys(staleTokenUpdates).length
    });
  }
);

exports.sendInviteNotification = onValueCreated(
  {
    ref: "/invites/{inviteId}",
    instance: DATABASE_INSTANCE,
    region: FUNCTION_REGION
  },
  async (event) => {
    const invite = event.data.val() || {};
    const inviteId = event.params.inviteId;
    const toUid = String(invite.toUid || "");
    const fromUid = String(invite.fromUid || "");

    if (!inviteId || !toUid || !fromUid || invite.status !== "pendente") return;
    if (toUid === fromUid) return;

    const rootRef = event.data.ref.root;
    const [tokenRecords, webPushRecords] = await Promise.all([
      collectRecipientTokenRecords(rootRef, [toUid]),
      collectRecipientWebPushSubscriptionRecords(rootRef, [toUid])
    ]);

    if (!tokenRecords.length && !webPushRecords.length) {
      logger.info("No push registrations for invite notification recipient.", { inviteId, toUid });
      return;
    }

    const isFriendRequest = invite.type === "friend-request" || invite.kind === "friend-request";
    const fromNick = truncateForPush(invite.fromNick || "Alguem", 48);
    const roomName = truncateForPush(invite.roomName || "AstroChat", 64);
    const title = isFriendRequest ? "Novo pedido de amizade" : "Novo convite recebido";
    const body = isFriendRequest
      ? `${fromNick} quer adicionar voce como amigo.`
      : `${fromNick} convidou voce para ${roomName}.`;
    const now = Date.now();
    const type = isFriendRequest ? "friend-request" : "invite";
    const data = stringifyData({
      type,
      fcmSource: "astrochat",
      inviteId,
      roomId: invite.roomId || "",
      fromUid,
      fromNick,
      roomName,
      title,
      body,
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      tag: `${type}:${inviteId}`,
      timestamp: now,
      url: "./index.html#notifications"
    });
    const webpush = {
      headers: {
        Urgency: "high",
        TTL: "86400"
      },
      notification: {
        title,
        body,
        icon: "icons/icon-192.png",
        badge: "icons/icon-192.png",
        tag: `${type}:${inviteId}`,
        renotify: true,
        timestamp: now,
        data
      }
    };
    const link = getWebpushLink(invite.roomId || "");

    if (link) {
      webpush.fcmOptions = { link };
    }

    const staleTokenUpdates = {};
    let successCount = 0;
    let failureCount = 0;

    if (tokenRecords.length) {
      for (const chunk of chunkArray(tokenRecords, MAX_MULTICAST_TOKENS)) {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: chunk.map((record) => record.token),
          notification: {
            title,
            body
          },
          data,
          webpush
        });

        successCount += response.successCount;
        failureCount += response.failureCount;

        response.responses.forEach((result, index) => {
          if (result.success) return;

          const record = chunk[index];
          logger.warn("FCM invite notification failed.", {
            inviteId,
            uid: record.uid,
            deviceId: record.deviceId,
            code: result.error?.code,
            message: result.error?.message
          });

          if (isInvalidFcmTokenError(result.error)) {
            staleTokenUpdates[`fcmTokens/${record.uid}/${record.deviceId}`] = null;
          }
        });
      }
    }

    const standardPushResult = await sendStandardWebPushNotifications(rootRef, webPushRecords, {
      data,
      notification: webpush.notification
    });

    if (Object.keys(staleTokenUpdates).length) {
      await rootRef.update(staleTokenUpdates);
    }

    logger.info("Invite notification sent.", {
      inviteId,
      toUid,
      tokens: tokenRecords.length,
      successCount,
      failureCount,
      webPushSubscriptions: webPushRecords.length,
      webPushSuccessCount: standardPushResult.successCount,
      webPushFailureCount: standardPushResult.failureCount,
      staleTokensRemoved: Object.keys(staleTokenUpdates).length
    });
  }
);

function getWebpushLink(roomId) {
  const baseUrl = String(process.env.APP_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  if (!baseUrl || !/^https:\/\//i.test(baseUrl)) return "";
  if (!roomId) return `${baseUrl}/index.html`;
  return `${baseUrl}/index.html#room=${encodeURIComponent(roomId)}`;
}

async function collectRecipientTokenRecords(rootRef, recipientUids) {
  const snapshots = await Promise.all(
    recipientUids.map(async (uid) => ({
      uid,
      snapshot: await rootRef.child(`fcmTokens/${uid}`).get()
    }))
  );

  const seenTokens = new Set();

  return snapshots.flatMap(({ uid, snapshot }) => {
    const devices = snapshot.val() || {};
    return Object.entries(devices)
      .map(([deviceId, record]) => ({
        uid,
        deviceId,
        token: typeof record === "string" ? record : record?.token
      }))
      .filter((record) => {
        if (typeof record.token !== "string" || record.token.length <= 20) return false;
        if (seenTokens.has(record.token)) return false;
        seenTokens.add(record.token);
        return true;
      });
  });
}

async function collectRecipientWebPushSubscriptionRecords(rootRef, recipientUids) {
  const snapshots = await Promise.all(
    recipientUids.map(async (uid) => ({
      uid,
      subscriptionSnapshot: await rootRef.child(`webPushSubscriptions/${uid}`).get(),
      tokenSnapshot: await rootRef.child(`fcmTokens/${uid}`).get()
    }))
  );

  const seenEndpoints = new Set();

  return snapshots.flatMap(({ uid, subscriptionSnapshot, tokenSnapshot }) => {
    const devices = {
      ...(extractWebPushSubscriptionsFromTokenRecords(tokenSnapshot.val() || {})),
      ...(subscriptionSnapshot.val() || {})
    };

    return Object.entries(devices)
      .map(([deviceId, record]) => ({
        uid,
        deviceId,
        subscription: normalizeWebPushSubscription(record)
      }))
      .filter((record) => {
        const endpoint = record.subscription?.endpoint || "";
        if (!endpoint || !record.subscription?.keys?.p256dh || !record.subscription?.keys?.auth) return false;
        if (seenEndpoints.has(endpoint)) return false;
        seenEndpoints.add(endpoint);
        return true;
      });
  });
}

function extractWebPushSubscriptionsFromTokenRecords(tokenRecords = {}) {
  return Object.fromEntries(
    Object.entries(tokenRecords)
      .map(([deviceId, record]) => [deviceId, record?.webPushSubscription])
      .filter(([, subscription]) => subscription?.endpoint)
  );
}

function normalizeWebPushSubscription(record = {}) {
  if (!record || typeof record !== "object") return null;

  return {
    endpoint: String(record.endpoint || ""),
    expirationTime: record.expirationTime || null,
    keys: {
      p256dh: String(record.keys?.p256dh || ""),
      auth: String(record.keys?.auth || "")
    }
  };
}

async function sendStandardWebPushNotifications(rootRef, records, payload) {
  const result = {
    successCount: 0,
    failureCount: 0
  };

  if (!records.length) return result;

  if (!WEB_PUSH_PRIVATE_VAPID_KEY) {
    logger.warn("Standard Web Push skipped: WEB_PUSH_PRIVATE_VAPID_KEY is not configured.", {
      subscriptions: records.length
    });
    result.failureCount = records.length;
    return result;
  }

  const staleSubscriptionUpdates = {};
  const body = JSON.stringify(payload);

  await Promise.all(records.map(async (record) => {
    try {
      await webPush.sendNotification(record.subscription, body, {
        TTL: 86400,
        urgency: "high"
      });
      result.successCount += 1;
    } catch (error) {
      result.failureCount += 1;
      logger.warn("Standard Web Push notification failed.", {
        uid: record.uid,
        deviceId: record.deviceId,
        statusCode: error?.statusCode,
        message: error?.message
      });

      if (isInvalidWebPushSubscriptionError(error)) {
        staleSubscriptionUpdates[`webPushSubscriptions/${record.uid}/${record.deviceId}`] = null;
        staleSubscriptionUpdates[`fcmTokens/${record.uid}/${record.deviceId}/webPushSubscription`] = null;
      }
    }
  }));

  if (Object.keys(staleSubscriptionUpdates).length) {
    await rootRef.update(staleSubscriptionUpdates);
  }

  return result;
}

function stringifyData(value) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, String(item ?? "")])
  );
}

function truncateForPush(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}...`;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function isInvalidFcmTokenError(error) {
  return [
    "messaging/invalid-registration-token",
    "messaging/registration-token-not-registered"
  ].includes(error?.code);
}

function isInvalidWebPushSubscriptionError(error) {
  return [404, 410].includes(Number(error?.statusCode || 0));
}

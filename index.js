const { onValueCreated } = require("firebase-functions/database");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const DATABASE_INSTANCE = "astro-chat-7d044-default-rtdb";
const FUNCTION_REGION = "us-central1";
const MAX_MULTICAST_TOKENS = 500;

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

    const tokenRecords = await collectRecipientTokenRecords(rootRef, recipientUids);
    if (!tokenRecords.length) {
      logger.info("No FCM tokens for chat notification recipients.", { roomId, messageId });
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
      staleTokensRemoved: Object.keys(staleTokenUpdates).length
    });
  }
);

function getWebpushLink(roomId) {
  const baseUrl = String(process.env.APP_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  if (!baseUrl || !/^https:\/\//i.test(baseUrl)) return "";
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

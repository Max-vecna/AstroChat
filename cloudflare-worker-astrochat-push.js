const DEFAULT_PROJECT_ID = "astro-chat-7d044";
const DEFAULT_DATABASE_URL = "https://astro-chat-7d044-default-rtdb.firebaseio.com";
const DEFAULT_WEB_API_KEY = "AIzaSyC0eXt2QukMgcAJRzgflenD46JvRBfmczg";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ID_TOKEN_LOOKUP_URL = "https://identitytoolkit.googleapis.com/v1/accounts:lookup";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const DATABASE_SCOPE = "https://www.googleapis.com/auth/firebase.database";
const USERINFO_SCOPE = "https://www.googleapis.com/auth/userinfo.email";
const MAX_BODY_SIZE = 4096;
const ACCESS_TOKEN_CACHE = {
  token: "",
  expiresAt: 0
};

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/notify" && url.pathname !== "/") {
      return jsonResponse({ ok: false, error: "Endpoint não encontrado." }, 404, corsHeaders);
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Use POST." }, 405, corsHeaders);
    }

    try {
      const body = await readJsonBody(request);
      const roomId = sanitizeFirebaseKey(body.roomId, 160);
      const messageId = sanitizeFirebaseKey(body.messageId, 160);
      const idToken = String(body.idToken || "").trim();

      if (!roomId || !messageId || !idToken) {
        return jsonResponse({ ok: false, error: "Envie roomId, messageId e idToken." }, 400, corsHeaders);
      }

      const user = await verifyFirebaseIdToken(idToken, env);
      const uid = String(user.localId || "").trim();
      if (!uid) {
        return jsonResponse({ ok: false, error: "Token de usuário inválido." }, 401, corsHeaders);
      }

      const accessToken = await getGoogleAccessToken(env);
      const [room, message] = await Promise.all([
        readRealtimeDatabaseJson(env, accessToken, `rooms/${roomId}`),
        readRealtimeDatabaseJson(env, accessToken, `rooms/${roomId}/messages/${messageId}`)
      ]);

      if (!room || !message) {
        return jsonResponse({ ok: false, error: "Sala ou mensagem não encontrada." }, 404, corsHeaders);
      }

      const authorUid = String(message.authorUid || "").trim();
      if (!authorUid || authorUid !== uid) {
        return jsonResponse({ ok: false, error: "Usuário não é autor desta mensagem." }, 403, corsHeaders);
      }

      const recipientUids = Object.keys(room.memberUids || {})
        .filter((recipientUid) => recipientUid && recipientUid !== authorUid);

      if (!recipientUids.length) {
        return jsonResponse({ ok: true, sent: 0, skipped: "Sem destinatários." }, 200, corsHeaders);
      }

      const tokenRecords = await collectRecipientFcmTokens(env, accessToken, recipientUids);
      if (!tokenRecords.length) {
        return jsonResponse({ ok: true, sent: 0, skipped: "Destinatários sem FCM token." }, 200, corsHeaders);
      }

      const notificationPayload = buildNotificationPayload(roomId, messageId, room, message);
      const result = await sendFcmNotifications(env, accessToken, tokenRecords, notificationPayload);

      if (result.staleTokenUpdates.length) {
        await removeStaleTokens(env, accessToken, result.staleTokenUpdates);
      }

      return jsonResponse({
        ok: true,
        recipients: recipientUids.length,
        tokens: tokenRecords.length,
        sent: result.successCount,
        failed: result.failureCount,
        staleRemoved: result.staleTokenUpdates.length
      }, 200, corsHeaders);
    } catch (error) {
      console.error("Erro ao enviar push AstroChat:", error);
      return jsonResponse({
        ok: false,
        error: "Erro interno no Worker de push.",
        details: String(error?.message || error)
      }, 500, corsHeaders);
    }
  }
};

function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = String(env.ALLOWED_ORIGIN || "*").trim() || "*";
  const responseOrigin = allowedOrigin === "*" ? "*" : (origin === allowedOrigin ? origin : allowedOrigin);

  return {
    "Access-Control-Allow-Origin": responseOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_SIZE) {
    throw new Error("Corpo da requisição muito grande.");
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new Error("JSON inválido.");
  }
  return body;
}

async function verifyFirebaseIdToken(idToken, env) {
  const apiKey = String(env.FIREBASE_WEB_API_KEY || DEFAULT_WEB_API_KEY).trim();
  const response = await fetch(`${ID_TOKEN_LOOKUP_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data.users) || !data.users[0]?.localId) {
    throw new Error(data.error?.message || "Não foi possível validar o idToken.");
  }
  return data.users[0];
}

async function getGoogleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (ACCESS_TOKEN_CACHE.token && ACCESS_TOKEN_CACHE.expiresAt - 60 > now) {
    return ACCESS_TOKEN_CACHE.token;
  }

  const clientEmail = String(env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);
  if (!clientEmail || !privateKey) {
    throw new Error("Configure FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY nos secrets do Worker.");
  }

  const jwt = await createServiceAccountJwt(clientEmail, privateKey, now);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Não foi possível gerar access token do Google.");
  }

  ACCESS_TOKEN_CACHE.token = data.access_token;
  ACCESS_TOKEN_CACHE.expiresAt = now + Number(data.expires_in || 3500);
  return ACCESS_TOKEN_CACHE.token;
}

function normalizePrivateKey(value) {
  return String(value || "")
    .replace(/^['\"]|['\"]$/g, "")
    .replace(/\\n/g, "\n")
    .trim();
}

async function createServiceAccountJwt(clientEmail, privateKey, now) {
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: `${FCM_SCOPE} ${DATABASE_SCOPE} ${USERINFO_SCOPE}`,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claim));
  const unsignedJwt = `${encodedHeader}.${encodedClaim}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedJwt)
  );

  return `${unsignedJwt}.${arrayBufferToBase64Url(signature)}`;
}

function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64UrlEncode(value) {
  return arrayBufferToBase64Url(new TextEncoder().encode(value));
}

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function readRealtimeDatabaseJson(env, accessToken, path) {
  const databaseUrl = getDatabaseUrl(env);
  const response = await fetch(`${databaseUrl}/${path}.json`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Erro ao ler ${path}: ${response.status} ${details}`);
  }

  return response.json();
}

function getDatabaseUrl(env) {
  return String(env.FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL).trim().replace(/\/+$/g, "");
}

async function collectRecipientFcmTokens(env, accessToken, recipientUids) {
  const allRecords = [];
  const seenTokens = new Set();

  await Promise.all(recipientUids.map(async (uid) => {
    const tokenMap = await readRealtimeDatabaseJson(env, accessToken, `fcmTokens/${uid}`).catch(() => null);
    if (!tokenMap || typeof tokenMap !== "object") return;

    Object.entries(tokenMap).forEach(([deviceId, record]) => {
      const token = String(record?.token || "").trim();
      if (!token || seenTokens.has(token)) return;
      seenTokens.add(token);
      allRecords.push({ uid, deviceId, token });
    });
  }));

  return allRecords;
}

function buildNotificationPayload(roomId, messageId, room, message) {
  const authorNick = truncateForPush(message.authorNick || "Alguém", 48);
  const roomName = truncateForPush(room.name || "AstroChat", 64);
  const text = truncateForPush(
    message.text || message.translatedText || message.originalText || "Nova mensagem",
    120
  );
  const title = `Nova mensagem de ${authorNick}`;
  const body = `${roomName}: ${text}`;
  const timestamp = Date.now();
  const tag = `chat:${roomId}:${messageId}`;
  const url = `./index.html#room=${encodeURIComponent(roomId)}`;

  const data = stringifyData({
    type: "chat-message",
    fcmSource: "astrochat-worker",
    roomId,
    messageId,
    authorUid: message.authorUid || "",
    authorNick,
    roomName,
    title,
    body,
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag,
    timestamp,
    url
  });

  return { title, body, data, tag, timestamp, url };
}

async function sendFcmNotifications(env, accessToken, tokenRecords, payload) {
  const projectId = String(env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID).trim();
  const endpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`;
  const result = {
    successCount: 0,
    failureCount: 0,
    staleTokenUpdates: []
  };

  await Promise.all(tokenRecords.map(async (record) => {
    const message = {
      message: {
        token: record.token,
        notification: {
          title: payload.title,
          body: payload.body
        },
        data: payload.data,
        webpush: {
          headers: {
            Urgency: "high",
            TTL: "86400"
          },
          notification: {
            title: payload.title,
            body: payload.body,
            icon: "icons/icon-192.png",
            badge: "icons/icon-192.png",
            tag: payload.tag,
            renotify: true,
            timestamp: payload.timestamp,
            data: payload.data
          },
          fcm_options: {
            link: payload.url
          }
        }
      }
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message)
    });

    if (response.ok) {
      result.successCount += 1;
      return;
    }

    result.failureCount += 1;
    const errorText = await response.text().catch(() => "");
    console.warn("Falha FCM", record.uid, record.deviceId, response.status, errorText);

    if (isInvalidFcmTokenResponse(response.status, errorText)) {
      result.staleTokenUpdates.push(record);
    }
  }));

  return result;
}

async function removeStaleTokens(env, accessToken, records) {
  const databaseUrl = getDatabaseUrl(env);
  const updates = {};
  records.forEach((record) => {
    updates[`fcmTokens/${record.uid}/${record.deviceId}`] = null;
  });

  await fetch(`${databaseUrl}/.json`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(updates)
  }).catch((error) => {
    console.warn("Não foi possível limpar tokens inválidos.", error);
  });
}

function isInvalidFcmTokenResponse(status, errorText) {
  const text = String(errorText || "").toLowerCase();
  return status === 404 ||
    text.includes("registration-token-not-registered") ||
    text.includes("invalid-registration-token") ||
    text.includes("not found");
}

function stringifyData(value) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, String(item ?? "")])
  );
}

function truncateForPush(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function sanitizeFirebaseKey(value, maxLength = 160) {
  return String(value || "")
    .trim()
    .replace(/[.#$\[\]\/]/g, "")
    .slice(0, maxLength);
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

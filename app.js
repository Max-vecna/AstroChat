import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  deleteUser,
  onAuthStateChanged,
  signInAnonymously,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  equalTo,
  endAt,
  get,
  getDatabase,
  limitToFirst,
  limitToLast,
  onValue,
  orderByChild,
  orderByKey,
  push,
  query,
  ref,
  runTransaction,
  serverTimestamp,
  startAt,
  update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported as isFirebaseMessagingSupported,
  onMessage
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

// Configurações e Constantes
const firebaseConfig = {
  apiKey: "AIzaSyC0eXt2QukMgcAJRzgflenD46JvRBfmczg",
  authDomain: "astro-chat-7d044.firebaseapp.com",
  projectId: "astro-chat-7d044",
  storageBucket: "astro-chat-7d044.firebasestorage.app",
  messagingSenderId: "64273019284",
  appId: "1:64273019284:web:c4a9ade561d5270b9edf81",
  measurementId: "G-HTNLE1C4P4"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
// Se o console do Firebase mostrar outra URL do Realtime Database, troque este valor.
const DATABASE_URL = "https://astro-chat-7d044-default-rtdb.firebaseio.com";
const db = getDatabase(firebaseApp, DATABASE_URL);
// Cole aqui a chave publica VAPID em Firebase Console > Cloud Messaging > Web push certificates.
const FCM_WEB_PUSH_PUBLIC_VAPID_KEY = "BBXwpIabnuvNvPJKgXbHWhJMjrMXewHEYR6W1WkVvNVyOOO7NNRLqI8_Gm5uWX8T_TXH7GNTUvPGUndsdv9Da_w";
const STANDARD_WEB_PUSH_PUBLIC_VAPID_KEY = "BLE7nXv1JR25D7PSPJgHRXcAIQUhe1R0XOhFPGheglqfIpNIo9G95_lSTDtFUNx4GjWZHFaRkdlMylcItINrvAs";
const CHAT_VERSION = "v145";
// Backend externo opcional para enviar push com o site fechado.
// Depois de publicar o Cloudflare Worker, cole aqui a URL dele.
// Exemplo: https://astrochat-push.seu-usuario.workers.dev/notify
const PUSH_WORKER_ENDPOINT = "https://patient-pond-0cd9.maxsuelsoarescustodio.workers.dev/notify";
const PUSH_WORKER_TIMEOUT_MS = 7000;
const PUSH_WORKER_HEALTH_TIMEOUT_MS = 5000;
const GEMINI_TRANSLATE_ENDPOINT = PUSH_WORKER_ENDPOINT.replace(/\/notify\/?$/, "/translate");
const GEMINI_TRANSLATE_TIMEOUT_MS = 23000;
const GEMINI_AI_ENDPOINT = PUSH_WORKER_ENDPOINT.replace(/\/notify\/?$/, "/ai");
const GEMINI_AI_TIMEOUT_MS = 23000;
const GEMINI_TTS_ENDPOINT = PUSH_WORKER_ENDPOINT.replace(/\/notify\/?$/, "/tts");
const GEMINI_TTS_TIMEOUT_MS = 32000;
const GEMINI_TTS_CACHE_NAME = "astrochat-gemini-tts-v1";
const GEMINI_TTS_MAX_TEXT_LENGTH = 1200;

const ROOMS_STORAGE_KEY = "chat-pwa-salas-v3-ai-local";
const FRIENDS_STORAGE_KEY = "chat-pwa-amigos-v2-firebase";
const USER_STORAGE_KEY = "chat-pwa-user-v1";
const NOTIFICATIONS_STORAGE_KEY = "chat-pwa-notificacoes-v1";
const INTERNAL_PUSH_STORAGE_KEY = "astrochat-internal-push-enabled-v1";
const SYSTEM_PUSH_STORAGE_KEY = "astrochat-system-push-enabled-v1";
const FCM_DEVICE_ID_STORAGE_KEY = "astrochat-fcm-device-id-v1";
const FCM_TOKEN_STORAGE_KEY = "astrochat-fcm-token-v1";
const WEB_PUSH_SUBSCRIPTION_STORAGE_KEY = "astrochat-web-push-subscription-v1";
const FCM_TOKEN_REFRESHED_AT_STORAGE_KEY = "astrochat-fcm-token-refreshed-at-v1";
const FCM_VAPID_KEY_STORAGE_KEY = "astrochat-fcm-vapid-key-v1";
const FCM_REGISTRATION_SCHEMA_STORAGE_KEY = "astrochat-fcm-registration-schema-v1";
const FCM_REGISTRATION_SCHEMA = "fcm-first-v2";
const PUSH_SETTINGS_CACHE = "astrochat-push-settings-v1";
const FCM_TOKEN_REFRESH_REQUEST = "./__astrochat-fcm-token-refresh-request";
const SPEECH_RATE_STORAGE_KEY = "astrochat-speech-rate-v1";
const SPEECH_PLAYBACK_STORAGE_KEY = "astrochat-speech-playback-v1";
const ROOM_VOICE_SETTINGS_STORAGE_KEY = "astrochat-room-voice-settings-v1";
const LIVE_TYPING_STORAGE_KEY = "astrochat-live-typing-v1";
const LEARNING_TEST_STORAGE_KEY = "astrochat-learning-test-v1";
const PROCESSED_FRIEND_REQUESTS_STORAGE_KEY = "astrochat-friend-requests-processados-v1";
const PINNED_CONVERSATIONS_STORAGE_KEY = "astrochat-pinned-conversations-v1";
const OFFLINE_MESSAGE_QUEUE_STORAGE_KEY = "astrochat-offline-message-queue-v1";
const PENDING_TRANSLATION_JOBS_STORAGE_KEY = "astrochat-pending-translation-jobs-v1";
const REMOTE_CONVERSATION_CACHE_STORAGE_KEY = "astrochat-remote-conversation-cache-v1";
const CHAT_THEME_STORAGE_KEY = "astrochat-chat-theme-v1";
const DEFAULT_CHAT_THEME = "padrao";
const GALACTIC_CHAT_THEME = "galatico";
const CHAT_THEME_OPTIONS = [
  { value: DEFAULT_CHAT_THEME, label: "Padrão", themeColor: "#0b8f6f" },
  { value: GALACTIC_CHAT_THEME, label: "Galatico", themeColor: "#11135a" },
  { value: "nebulosa", label: "Nebulosa", themeColor: "#5b2cff" },
  { value: "aurora", label: "Aurora", themeColor: "#12c7a5" },
  { value: "solar", label: "Solar", themeColor: "#f59e0b" },
  { value: "oceano", label: "Oceano", themeColor: "#0ea5e9" },
  { value: "rubi", label: "Rubi", themeColor: "#be123c" }
];
const CHAT_THEME_OPTION_MAP = CHAT_THEME_OPTIONS.reduce((map, option) => {
  map[option.value] = option;
  return map;
}, {});

const AI_ROOM_TYPE = "language-ai";
const AI_TEACHER_MODE = "teacher";
const AI_FRIEND_MODE = "friend";
const USER_ROOM_TYPE = "user-room";
const PRIVATE_ROOM_TYPE = "private-room";
const FRIEND_REQUEST_TYPE = "friend-request";
const NICK_TAKEN_ERROR_CODE = "nick-taken";
const MISSING_FIREBASE_USER_DATA_ERROR_CODE = "missing-firebase-user-data";
const BACKGROUND_REFRESH_INTERVAL_MS = 45000;
const CONNECTIVITY_BACKGROUND_SYNC_DELAY_MS = 800;
const FCM_TOKEN_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const FCM_RESUME_REFRESH_MIN_INTERVAL_MS = 5 * 60 * 1000;
const NOTIFICATION_SOUND_AFTER_SYSTEM_DELAY_MS = 180;
const ROOM_LAST_MESSAGE_LISTEN_LIMIT = 1;
const AI_TEACHER_NAME = "Professor IA";
const AI_DIFFICULTY_ACTIVE = "active";
const AI_DIFFICULTY_DONE = "done";
const DEFAULT_AI_FRIEND_PERSONA = "amigo virtual leve, curioso, acolhedor e natural, sem agir como professor a menos que o usuario peca ajuda para estudar";
const MESSAGE_PROCESSING_TRANSLATION = "translation";
const MESSAGE_PROCESSING_LEARNING_TEST = "learning-test";
const PUBLIC_TRANSLATION_PENDING_TEXT = "O texto está sendo traduzido...";
const PUBLIC_TRANSLATION_ERROR_TEXT = "Não foi possível traduzir este texto.";
const PUBLIC_LEARNING_TEST_PENDING_TEXT = "Verificando aprendizado em segundo plano...";
const POLLINATIONS_CHAT_ENDPOINT = "https://text.pollinations.ai/openai";
const POLLINATIONS_TEXT_ENDPOINT = "https://text.pollinations.ai/";
const MYMEMORY_TRANSLATE_ENDPOINT = "https://api.mymemory.translated.net/get";
const LANGUAGE_OPTIONS = [
  { code: "", name: "Sem tradução automática", label: "Sem tradução automática" },
  { code: "en", name: "inglês", label: "Inglês" },
  { code: "es", name: "espanhol", label: "Espanhol" },
  { code: "fr", name: "francês", label: "Francês" },
  { code: "it", name: "italiano", label: "Italiano" },
  { code: "de", name: "alemão", label: "Alemão" },
  { code: "ja", name: "japonês", label: "Japonês" },
  { code: "ko", name: "coreano", label: "Coreano" },
  { code: "zh", name: "chinês", label: "Chinês" }
];
const NATIVE_LANGUAGE_OPTIONS = [
  { code: "pt", name: "português do Brasil", label: "Português" },
  { code: "en", name: "inglês", label: "Inglês" },
  { code: "es", name: "espanhol", label: "Espanhol" },
  { code: "fr", name: "francês", label: "Francês" },
  { code: "it", name: "italiano", label: "Italiano" },
  { code: "de", name: "alemão", label: "Alemão" },
  { code: "ja", name: "japonês", label: "Japonês" },
  { code: "ko", name: "coreano", label: "Coreano" },
  { code: "zh", name: "chinês", label: "Chinês" }
];


const LETTER_TURBO_MULTIPLIER = 0.5;
const LETTER_TURBO_SPEED_MULTIPLIER = 2;
const LETTER_MIN_DURATION_MS = 5000;
const LETTER_MAX_DURATION_MS = 365 * 24 * 60 * 60 * 1000;
const LETTER_DEFAULT_TRANSPORT_ID = "droid";
const LETTER_ROUTE_ENDPOINT = "https://router.project-osrm.org/route/v1/driving";
const LETTER_ROUTE_TIMEOUT_MS = 15000;
const LETTER_ROUTE_MAX_POINTS = 220;
const LETTER_OPEN_SECRET_STORAGE_KEY = "astrochat-letter-open-secrets-v1";
const LETTER_TRANSPORT_OPTIONS = Object.freeze({
  postal: {
    id: "postal",
    name: "Correio Lunar",
    icon: "fa-person-walking",
    speedKmh: 5,
    speedLabel: "Caminhada · 5 km/h",
    trajectoryMode: "ground",
    trajectoryLabel: "Percurso pelas vias em velocidade de caminhada",
    fallbackDurationMs: 75000,
    requiresChallenge: false
  },
  rover: {
    id: "rover",
    name: "Rover Postal",
    icon: "fa-truck",
    speedKmh: 45,
    speedLabel: "Terrestre · 45 km/h",
    trajectoryMode: "ground",
    trajectoryLabel: "Rota terrestre pelas ruas e vias disponíveis",
    fallbackDurationMs: 55000,
    requiresChallenge: false
  },
  droid: {
    id: "droid",
    name: "Droid-X",
    icon: "fa-robot",
    speedKmh: 18,
    speedLabel: "Seguro · 18 km/h",
    trajectoryMode: "ground",
    trajectoryLabel: "Rota terrestre segura pelas vias do mapa",
    fallbackDurationMs: 35000,
    requiresChallenge: false
  },
  drone: {
    id: "drone",
    name: "Sky-Drone",
    icon: "fa-helicopter",
    speedKmh: 90,
    speedLabel: "Aéreo · 90 km/h",
    trajectoryMode: "air",
    trajectoryLabel: "Trajeto aéreo direto entre origem e destino",
    fallbackDurationMs: 20000,
    requiresChallenge: true
  },
  shuttle: {
    id: "shuttle",
    name: "Nave Courier",
    icon: "fa-shuttle-space",
    speedKmh: 250,
    speedLabel: "Orbital · 250 km/h",
    trajectoryMode: "orbital",
    trajectoryLabel: "Arco orbital acima da rota terrestre",
    fallbackDurationMs: 14000,
    requiresChallenge: true
  },
  rocket: {
    id: "rocket",
    name: "Astro-Rocket",
    icon: "fa-rocket",
    speedKmh: 500,
    speedLabel: "Expresso · 500 km/h",
    trajectoryMode: "express",
    trajectoryLabel: "Corredor expresso em arco de alta altitude",
    fallbackDurationMs: 9000,
    requiresChallenge: true
  }
});
const LETTER_BASE_UNLOCKED_TRANSPORT_IDS = Object.freeze(
  Object.values(LETTER_TRANSPORT_OPTIONS)
    .filter((transport) => !transport.requiresChallenge)
    .map((transport) => transport.id)
);
const LETTER_CHALLENGE_PHRASES = Object.freeze([
  {
    pt: "A carta está a caminho.",
    en: "The letter is on its way.",
    es: "La carta está en camino.",
    fr: "La lettre est en route.",
    it: "La lettera è in viaggio.",
    de: "Der Brief ist unterwegs.",
    ja: "手紙は配送中です。",
    ko: "편지가 배송 중입니다.",
    zh: "信件正在路上。"
  },
  {
    pt: "O mapa mostra a rota.",
    en: "The map shows the route.",
    es: "El mapa muestra la ruta.",
    fr: "La carte montre l’itinéraire.",
    it: "La mappa mostra il percorso.",
    de: "Die Karte zeigt die Route.",
    ja: "地図にルートが表示されます。",
    ko: "지도에 경로가 표시됩니다.",
    zh: "地图显示路线。"
  },
  {
    pt: "A entrega chegará em breve.",
    en: "The delivery will arrive soon.",
    es: "La entrega llegará pronto.",
    fr: "La livraison arrivera bientôt.",
    it: "La consegna arriverà presto.",
    de: "Die Lieferung kommt bald an.",
    ja: "配達はまもなく到着します。",
    ko: "배송이 곧 도착합니다.",
    zh: "快递很快就会到达。"
  },
  {
    pt: "Ative a turbina para acelerar.",
    en: "Activate the turbine to speed up.",
    es: "Activa la turbina para acelerar.",
    fr: "Activez la turbine pour accélérer.",
    it: "Attiva la turbina per accelerare.",
    de: "Aktiviere die Turbine, um zu beschleunigen.",
    ja: "加速するためにタービンを起動してください。",
    ko: "속도를 높이려면 터빈을 활성화하세요.",
    zh: "启动涡轮以加速。"
  },
  {
    pt: "O destino foi confirmado.",
    en: "The destination has been confirmed.",
    es: "El destino ha sido confirmado.",
    fr: "La destination a été confirmée.",
    it: "La destinazione è stata confermata.",
    de: "Das Ziel wurde bestätigt.",
    ja: "目的地が確認されました。",
    ko: "목적지가 확인되었습니다.",
    zh: "目的地已确认。"
  },
  {
    pt: "A mensagem viaja com segurança.",
    en: "The message travels safely.",
    es: "El mensaje viaja de forma segura.",
    fr: "Le message voyage en toute sécurité.",
    it: "Il messaggio viaggia in sicurezza.",
    de: "Die Nachricht reist sicher.",
    ja: "メッセージは安全に運ばれます。",
    ko: "메시지가 안전하게 전달됩니다.",
    zh: "消息正在安全传送。"
  }
]);

const SPACE_AVATAR_OPTIONS = [
  "fa-solid fa-user-astronaut",
  "fa-solid fa-rocket",
  "fa-solid fa-moon",
  "fa-solid fa-star",
  "fa-solid fa-satellite",
  "fa-solid fa-earth-americas",
  "fa-solid fa-meteor",
  "fa-solid fa-sun",
  "fa-solid fa-cloud-moon",
  "fa-solid fa-shuttle-space",
  "fa-solid fa-satellite-dish",
  "fa-solid fa-robot",
  "fa-solid fa-user-secret",
  "fa-solid fa-wand-magic-sparkles",
  "fa-solid fa-hat-wizard",
  "fa-solid fa-gem",
  "fa-solid fa-bolt",
  "fa-solid fa-compass",
  "fa-solid fa-user-ninja",
  "fa-solid fa-dragon",
  "fa-solid fa-dice-d20",
  "fa-solid fa-crown",
  "fa-solid fa-shield-halved",
  "fa-solid fa-feather",
  "fa-solid fa-fire",
  "fa-solid fa-water",
  "fa-solid fa-snowflake",
  "fa-solid fa-leaf",
  "fa-solid fa-music",
  "fa-solid fa-gamepad",
  "fa-solid fa-puzzle-piece",
  "fa-solid fa-book-open",
  "fa-solid fa-map",
  "fa-solid fa-camera-retro",
  "fa-solid fa-headphones",
  "fa-solid fa-microchip",
  "fa-solid fa-atom",
  "fa-solid fa-flask"
];
const DEFAULT_SPACE_AVATAR_ICON = SPACE_AVATAR_OPTIONS[0];
const AI_SYSTEM_PROMPT = `Você é um professor de idiomas paciente, prático e motivador dentro de um app de bate-papo.
Seu objetivo é ensinar idiomas para o usuário, principalmente por conversa.
Responda em português do Brasil por padrão, a menos que o usuário peça outro idioma.
Sempre adapte a resposta ao nível do aluno.
Quando o usuário escrever em outro idioma, corrija de forma gentil, explique os erros principais e dê 2 ou 3 exemplos curtos.
Quando fizer sentido, proponha exercícios rápidos, traduções, diálogos, vocabulário, pronúncia aproximada e revisão.
Evite respostas longas demais. Seja claro, didático e amigável.`;

let rooms = loadFromStorage(ROOMS_STORAGE_KEY, []).filter((room) => room?.type === AI_ROOM_TYPE).map(normalizeLocalAiRoom);
let remoteRooms = [];
let friends = loadFromStorage(FRIENDS_STORAGE_KEY, []);
let pendingRoomInviteFriendIds = new Set();
let invites = [];
let notificationState = normalizeNotificationState(loadFromStorage(NOTIFICATIONS_STORAGE_KEY, {}));
let internalPushNotificationsEnabled = loadFromStorage(INTERNAL_PUSH_STORAGE_KEY, true) !== false;
let systemPushNotificationsEnabled = loadFromStorage(SYSTEM_PUSH_STORAGE_KEY, true) !== false;
let liveTypingByRoom = loadFromStorage(LIVE_TYPING_STORAGE_KEY, {});
let learningTestByRoom = loadFromStorage(LEARNING_TEST_STORAGE_KEY, {});
let processedFriendRequestIds = loadFromStorage(PROCESSED_FRIEND_REQUESTS_STORAGE_KEY, {});
let pinnedConversationIds = new Set(loadFromStorage(PINNED_CONVERSATIONS_STORAGE_KEY, []));
let offlineMessageQueue = normalizeOfflineMessageQueue(loadFromStorage(OFFLINE_MESSAGE_QUEUE_STORAGE_KEY, []));
let pendingTranslationJobs = normalizePendingTranslationJobs(loadFromStorage(PENDING_TRANSLATION_JOBS_STORAGE_KEY, []));
let chatTheme = getSafeChatTheme(loadFromStorage(CHAT_THEME_STORAGE_KEY, DEFAULT_CHAT_THEME));
let activeTypingUsers = [];
let replyTarget = null;
let messageSearchState = createEmptyMessageSearchState();
let currentUser = loadUser();
let currentFirebaseUser = null;
let currentFirebaseUid = null;
let activeRoomId = null;
let pendingNotificationRoomId = getInitialNotificationRoomId();
let pendingNotificationsModalOpen = getInitialNotificationsModalRequested();
let suppressAutoRoomSelection = false;
let activeView = "rooms";
let deferredInstallPrompt = null;
let aiReplyInProgress = false;
let activeSpeechUtterance = null;
let activeSpeechAudio = null;
let activeSpeechAudioUrl = "";
let activeSpeechRequestController = null;
let activeSpeechMessage = null;
let activeSpeechMessageKey = "";
let activeSpeechAnimationTimer = 0;
let activeSpeechProgressClearTimer = 0;
let speechPlaybackRate = normalizeSpeechPlaybackRate(loadFromStorage(SPEECH_RATE_STORAGE_KEY, 1));
let speechPlaybackByRoom = loadFromStorage(SPEECH_PLAYBACK_STORAGE_KEY, {});
let roomVoiceSettings = loadFromStorage(ROOM_VOICE_SETTINGS_STORAGE_KEY, {});
let firebaseReady = false;
let firebaseInitPromise = null;
let logoutInProgress = false;
let unsubscribeRooms = null;
let unsubscribeReceivedInvites = null;
let unsubscribeSentInvites = null;
let unsubscribeMessages = null;
let unsubscribeTyping = null;
let activeMessagesRoomId = null;
let activeTypingRoomId = null;
let typingInputTimer = null;
let typingIdleTimer = null;
let typingStaleRenderTimer = null;
let lastTypingStatusPublishAt = 0;
let pendingMessagesScrollFrame = null;
let internetOnline = navigator.onLine !== false;
let notificationAudioContext = null;
let notificationSoundUnlocked = false;
let notificationSoundPrimed = false;
let pendingNotificationSound = false;
let pendingNotificationSoundKind = "default";
let activeToastElement = null;
let activeToastTimer = null;
let messageSelectionMode = false;
let messageEditTarget = null;
let roomListContextMenuRoomId = "";
let roomListLongPressTimer = null;
const selectedMessageIds = new Set();
const selectedForwardRoomIds = new Set();
const roomMetadataSignatures = new Map();
let backgroundRefreshTimer = null;
let backgroundRefreshInProgress = false;
let connectivityBackgroundSyncTimer = null;
let connectivityBackgroundSyncInProgress = false;
let roomLastMessageRefreshTimer = null;
let roomLastMessageRefreshInProgress = false;
let offlineQueueFlushInProgress = false;
let firebaseMessaging = null;
let firebaseMessagingSupportedPromise = null;
let firebaseMessagingForegroundUnsubscribe = null;
let fcmTokenRegistrationPromise = null;
const roomMessagesById = new Map();
const renderedMessageIdsByRoom = new Map();
const revealedOriginalMessageIds = new Set();
const hydratingMessageIds = new Set();
const dehydratingMessageIds = new Set();
const hydratedTranslationCache = new Map();
const pendingLearningAnalysisKeys = new Set();
const remoteRoomMap = new Map();
const roomMetadataUnsubscribers = new Map();
const roomLastMessageUnsubscribers = new Map();
const inviteUnsubscribers = {
  received: new Map(),
  sent: new Map()
};
const inviteSnapshotSignatures = {
  received: new Map(),
  sent: new Map()
};
const inviteSnapshotBuckets = {
  received: [],
  sent: []
};
const receiptUpdateRooms = new Set();
const pendingTranslationResumeKeys = new Set();

const splashScreen = document.querySelector("#splashScreen");
const splashStatus = document.querySelector("#splashStatus");
const appShell = document.querySelector("#appShell");
const loginScreen = document.querySelector("#loginScreen");
const loginForm = document.querySelector("#loginForm");
const nickInput = document.querySelector("#nickInput");
const nativeLanguageSelect = document.querySelector("#nativeLanguageSelect");
const avatarInputs = Array.from(document.querySelectorAll('input[name="spaceAvatar"]'));
const spaceAvatarSelect = document.querySelector("#spaceAvatarSelect");
const spaceAvatarPreview = document.querySelector("#spaceAvatarPreview");
const chatList = document.querySelector("#chatList");
const messages = document.querySelector("#messages");
const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#messageInput");
const sendButton = messageForm.querySelector(".send-button");
const replyPreview = document.querySelector("#replyPreview");
const replyPreviewAuthor = document.querySelector("#replyPreviewAuthor");
const replyPreviewText = document.querySelector("#replyPreviewText");
const cancelReplyButton = document.querySelector("#cancelReplyButton");
const searchInput = document.querySelector("#searchInput");
const searchBox = document.querySelector("#searchBox");
const chatHeader = document.querySelector("#chatHeader");
const chatPanel = document.querySelector("#chatPanel");
const emptyChatPanel = document.querySelector("#emptyChatPanel");
const activeAvatar = document.querySelector("#activeAvatar");
const activeName = document.querySelector("#activeName");
const activeStatus = document.querySelector("#activeStatus");
const clearChatButton = document.querySelector("#clearChatButton");
const roomMenuButton = document.querySelector("#roomMenuButton");
const conversationSearchButton = document.querySelector("#conversationSearchButton");
const liveTypingButton = document.querySelector("#liveTypingButton");
const typingPreviewPanel = document.querySelector("#typingPreviewPanel");
const messageSearchPanel = document.querySelector("#messageSearchPanel");
const messageSearchInput = document.querySelector("#messageSearchInput");
const messageSearchUserInput = document.querySelector("#messageSearchUserInput");
const messageSearchDateInput = document.querySelector("#messageSearchDateInput");
const messageSearchResult = document.querySelector("#messageSearchResult");
const messageSearchPrevButton = document.querySelector("#messageSearchPrevButton");
const messageSearchNextButton = document.querySelector("#messageSearchNextButton");
const closeMessageSearchButton = document.querySelector("#closeMessageSearchButton");
const backButton = document.querySelector("#backButton");
const installButton = document.querySelector("#installButton");
const logoutButton = document.querySelector("#logoutButton");
const notificationsButton = document.querySelector("#notificationsButton");
const notificationBadge = document.querySelector("#notificationBadge");
const mobileNotificationsButton = document.querySelector("#mobileNotificationsButton");
const mobileNotificationBadge = document.querySelector("#mobileNotificationBadge");
const notificationsModal = document.querySelector("#notificationsModal");
const closeNotificationsButton = document.querySelector("#closeNotificationsButton");
const userAvatar = document.querySelector("#userAvatar");
const userNick = document.querySelector("#userNick");
const userSubtitle = document.querySelector("#userSubtitle");
const profileSettingsButton = document.querySelector("#profileSettingsButton");
const profileSettingsModal = document.querySelector("#profileSettingsModal");
const profileSettingsForm = document.querySelector("#profileSettingsForm");
const profileNickInput = document.querySelector("#profileNickInput");
const profilePreviewAvatar = document.querySelector("#profilePreviewAvatar");
const profilePreviewNick = document.querySelector("#profilePreviewNick");
const profilePreviewLanguage = document.querySelector("#profilePreviewLanguage");
const profileNativeLanguageSelect = document.querySelector("#profileNativeLanguageSelect");
const profileThemeSelect = document.querySelector("#profileThemeSelect");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const profileAvatarInputs = Array.from(document.querySelectorAll('input[name="profileSpaceAvatar"]'));
const profileAvatarSelect = document.querySelector("#profileAvatarSelect");
const profileAvatarSelectPreview = document.querySelector("#profileAvatarSelectPreview");
const closeProfileSettingsButton = document.querySelector("#closeProfileSettingsButton");
const cancelProfileSettingsButton = document.querySelector("#cancelProfileSettingsButton");
const resetLocalProfileButton = document.querySelector("#resetLocalProfileButton");
const profileNotificationsButton = document.querySelector("#profileNotificationsButton");
const profileNotificationsStatus = document.querySelector("#profileNotificationsStatus");
const internalPushToggleButton = document.querySelector("#internalPushToggleButton");
const internalPushToggleStatus = document.querySelector("#internalPushToggleStatus");
const profileStorageStatus = document.querySelector("#profileStorageStatus");
const profileStorageBar = document.querySelector("#profileStorageBar");
const clearSavedAudioButton = document.querySelector("#clearSavedAudioButton");
const clearLocalConversationsButton = document.querySelector("#clearLocalConversationsButton");
const clearAppStorageButton = document.querySelector("#clearAppStorageButton");
const profileVersionLabel = document.querySelector("#profileVersionLabel");
const roomItemTemplate = document.querySelector("#roomItemTemplate");

const createRoomButton = document.querySelector("#createRoomButton");
const createAiFriendButton = document.querySelector("#createAiFriendButton");
const emptyCreateRoomButton = document.querySelector("#emptyCreateRoomButton");
const roomModal = document.querySelector("#roomModal");
const roomForm = document.querySelector("#roomForm");
const roomNameInput = document.querySelector("#roomNameInput");
const roomDescriptionInput = document.querySelector("#roomDescriptionInput");
const roomLanguageSelect = document.querySelector("#roomLanguageSelect");
const roomFriendsList = document.querySelector("#roomFriendsList");
const roomFriendFilterInput = document.querySelector("#roomFriendFilterInput");
const roomFriendsCounter = document.querySelector("#roomFriendsCounter");
const closeRoomModalButton = document.querySelector("#closeRoomModalButton");
const cancelRoomButton = document.querySelector("#cancelRoomButton");
const aiFriendModal = document.querySelector("#aiFriendModal");
const aiFriendForm = document.querySelector("#aiFriendForm");
const aiFriendNameInput = document.querySelector("#aiFriendNameInput");
const aiFriendPersonaInput = document.querySelector("#aiFriendPersonaInput");
const aiFriendLanguageSelect = document.querySelector("#aiFriendLanguageSelect");
const aiFriendAvatarSelect = document.querySelector("#aiFriendAvatarSelect");
const aiFriendAvatarPreview = document.querySelector("#aiFriendAvatarPreview");
const closeAiFriendModalButton = document.querySelector("#closeAiFriendModalButton");
const cancelAiFriendButton = document.querySelector("#cancelAiFriendButton");

const inviteButton = document.querySelector("#inviteButton");
const letterButton = document.querySelector("#letterButton");
const letterModal = document.querySelector("#letterModal");
const letterForm = document.querySelector("#letterForm");
const closeLetterButton = document.querySelector("#closeLetterButton");
const letterTitleInput = document.querySelector("#letterTitleInput");
const letterMessageInput = document.querySelector("#letterMessageInput");
const requestLetterLocationButton = document.querySelector("#requestLetterLocationButton");
const letterLocationStatus = document.querySelector("#letterLocationStatus");
const letterMap = document.querySelector("#letterMap");
const letterRouteNote = document.querySelector("#letterRouteNote");
const letterRoutePreview = document.querySelector("#letterRoutePreview");
const letterRoutePreviewTransport = document.querySelector("#letterRoutePreviewTransport");
const letterRoutePreviewTrajectory = document.querySelector("#letterRoutePreviewTrajectory");
const letterRoutePreviewDistance = document.querySelector("#letterRoutePreviewDistance");
const letterRoutePreviewSpeed = document.querySelector("#letterRoutePreviewSpeed");
const letterRoutePreviewEta = document.querySelector("#letterRoutePreviewEta");
const letterRoutePreviewStatus = document.querySelector("#letterRoutePreviewStatus");
const letterTransportPicker = document.querySelector("#letterTransportPicker");
const letterDeliverySummary = document.querySelector("#letterDeliverySummary");
const letterChallengePanel = document.querySelector("#letterChallengePanel");
const letterChallengeEyebrow = document.querySelector("#letterChallengeEyebrow");
const letterChallengeDirection = document.querySelector("#letterChallengeDirection");
const letterChallengePrompt = document.querySelector("#letterChallengePrompt");
const letterChallengeInput = document.querySelector("#letterChallengeInput");
const letterChallengeSubmitButton = document.querySelector("#letterChallengeSubmitButton");
const letterChallengeRefreshButton = document.querySelector("#letterChallengeRefreshButton");
const letterChallengeFeedback = document.querySelector("#letterChallengeFeedback");
const letterTurboButton = document.querySelector("#letterTurboButton");
const letterTurboStatus = document.querySelector("#letterTurboStatus");
const letterRequireTranslationCheckbox = document.querySelector("#letterRequireTranslationCheckbox");
const letterOpenChallengeDirectionSelect = document.querySelector("#letterOpenChallengeDirectionSelect");
const letterProtectionStatus = document.querySelector("#letterProtectionStatus");
const letterViewerModal = document.querySelector("#letterViewerModal");
const closeLetterViewerButton = document.querySelector("#closeLetterViewerButton");
const letterViewerIcon = document.querySelector("#letterViewerIcon");
const letterViewerHeading = document.querySelector("#letterViewerHeading");
const letterViewerStatus = document.querySelector("#letterViewerStatus");
const letterViewerLockPanel = document.querySelector("#letterViewerLockPanel");
const letterViewerChallengeDirection = document.querySelector("#letterViewerChallengeDirection");
const letterViewerChallengePrompt = document.querySelector("#letterViewerChallengePrompt");
const letterViewerChallengeInput = document.querySelector("#letterViewerChallengeInput");
const letterViewerChallengeButton = document.querySelector("#letterViewerChallengeButton");
const letterViewerChallengeFeedback = document.querySelector("#letterViewerChallengeFeedback");
const letterViewerContentPanel = document.querySelector("#letterViewerContentPanel");
const letterViewerTitle = document.querySelector("#letterViewerTitle");
const letterViewerContent = document.querySelector("#letterViewerContent");
const letterViewerDistance = document.querySelector("#letterViewerDistance");
const letterViewerSpeed = document.querySelector("#letterViewerSpeed");
const letterViewerEta = document.querySelector("#letterViewerEta");
const letterViewerProgress = document.querySelector("#letterViewerProgress");
const letterViewerProgressFill = document.querySelector("#letterViewerProgressFill");
const letterViewerProgressLabel = document.querySelector("#letterViewerProgressLabel");
const letterViewerMap = document.querySelector("#letterViewerMap");
const letterViewerMapCaption = document.querySelector("#letterViewerMapCaption");
let activeLetterMap = null;
let activeLetterMapRouteLayer = null;
let activeLetterMapEndpointLayer = null;
let letterComposerRouteState = {
  requestId: 0,
  destinationKey: "",
  destination: null,
  originResult: null,
  groundRoute: null,
  activeRoute: null,
  activeTransportId: "",
  loading: false,
  error: ""
};
let activeLetterViewerMap = null;
let activeLetterViewerTimer = 0;
let activeLetterViewerState = null;
let letterChallengeState = null;
let letterRecipientNativeLanguage = null;
let letterUnlockedTransportIds = new Set(LETTER_BASE_UNLOCKED_TRANSPORT_IDS);
let letterTurboUnlocked = false;
let letterTurboEnabled = false;
const inviteModal = document.querySelector("#inviteModal");
const inviteForm = document.querySelector("#inviteForm");
const inviteFriendsList = document.querySelector("#inviteFriendsList");
const inviteModalSubtitle = document.querySelector("#inviteModalSubtitle");
const closeInviteModalButton = document.querySelector("#closeInviteModalButton");
const cancelInviteButton = document.querySelector("#cancelInviteButton");
const inviteUserSearchForm = document.querySelector("#inviteUserSearchForm");
const inviteNickInput = document.querySelector("#inviteNickInput");
const inviteSearchResult = document.querySelector("#inviteSearchResult");

const addFriendForm = document.querySelector("#addFriendForm");
const friendNickInput = document.querySelector("#friendNickInput");
const friendSearchResult = document.querySelector("#friendSearchResult");
const friendsPanel = document.querySelector("#friendsPanel");
const friendsList = document.querySelector("#friendsList");
const invitesPanel = document.querySelector("#invitesPanel");
const invitesList = document.querySelector("#invitesList");
const unreadList = document.querySelector("#unreadList");
const roomsTab = document.querySelector("#roomsTab");
const friendsTab = document.querySelector("#friendsTab");
const invitesTab = document.querySelector("#invitesTab");
const roomsBadge = document.querySelector("#roomsBadge");
const friendsBadge = document.querySelector("#friendsBadge");
const invitesBadge = document.querySelector("#invitesBadge");
const privateChatButton = document.querySelector("#privateChatButton");
const privateModal = document.querySelector("#privateModal");
const closePrivateModalButton = document.querySelector("#closePrivateModalButton");
const privateSearchForm = document.querySelector("#privateSearchForm");
const privateNickInput = document.querySelector("#privateNickInput");
const privateSearchResult = document.querySelector("#privateSearchResult");
const privateFriendsList = document.querySelector("#privateFriendsList");
const privateLanguageSelect = document.querySelector("#privateLanguageSelect");
const roomSettingsModal = document.querySelector("#roomSettingsModal");
const closeRoomSettingsButton = document.querySelector("#closeRoomSettingsButton");
const roomSettingsSubtitle = document.querySelector("#roomSettingsSubtitle");
const roomSettingsLanguageSelect = document.querySelector("#roomSettingsLanguageSelect");
const saveRoomLanguageButton = document.querySelector("#saveRoomLanguageButton");
const roomMembersList = document.querySelector("#roomMembersList");
const deleteRoomButton = document.querySelector("#deleteRoomButton");
const roomDeleteHint = document.querySelector("#roomDeleteHint");
const roomSettingsLiveTypingButton = document.querySelector("#roomSettingsLiveTypingButton");
const roomSettingsLiveTypingCheckbox = document.querySelector("#roomSettingsLiveTypingCheckbox");
const roomSettingsSpeechPlaybackButton = document.querySelector("#roomSettingsSpeechPlaybackButton");
const roomSettingsSpeechPlaybackCheckbox = document.querySelector("#roomSettingsSpeechPlaybackCheckbox");
const roomSettingsVoiceSelect = document.querySelector("#roomSettingsVoiceSelect");
const roomSettingsVoiceRateSelect = document.querySelector("#roomSettingsVoiceRateSelect");
const saveRoomVoiceSettingsButton = document.querySelector("#saveRoomVoiceSettingsButton");
const roomSettingsClearChatButton = document.querySelector("#roomSettingsClearChatButton");
const roomSettingsPinButton = document.querySelector("#roomSettingsPinButton");
const roomSettingsSelectMessagesButton = document.querySelector("#roomSettingsSelectMessagesButton");
const roomLanguageSettingsSection = document.querySelector("#roomLanguageSettingsSection");
const roomMembersSettingsSection = document.querySelector("#roomMembersSettingsSection");
const roomDangerSettingsSection = document.querySelector("#roomDangerSettingsSection");
const teacherDifficultySettingsSection = document.querySelector("#teacherDifficultySettingsSection");
const teacherDifficultyForm = document.querySelector("#teacherDifficultyForm");
const teacherDifficultyInput = document.querySelector("#teacherDifficultyInput");
const teacherDifficultyList = document.querySelector("#teacherDifficultyList");
const teacherDifficultyCounter = document.querySelector("#teacherDifficultyCounter");
const toastRegion = document.querySelector("#toastRegion");
const suggestTextButton = document.querySelector("#suggestTextButton");
const spellcheckButton = document.querySelector("#spellcheckButton");
const learningTestButton = document.querySelector("#learningTestButton");
const aiAssistModal = document.querySelector("#aiAssistModal");
const closeAiAssistButton = document.querySelector("#closeAiAssistButton");
const messageAiTranslationModal = document.querySelector("#messageAiTranslationModal");
const closeMessageAiTranslationButton = document.querySelector("#closeMessageAiTranslationButton");
const messageAiTranslationSubtitle = document.querySelector("#messageAiTranslationSubtitle");
const messageAiTranslationSource = document.querySelector("#messageAiTranslationSource");
const messageAiTranslationTargetLabel = document.querySelector("#messageAiTranslationTargetLabel");
const messageAiTranslationResult = document.querySelector("#messageAiTranslationResult");
const aiAssistTitle = document.querySelector("#aiAssistTitle");
const aiAssistSubtitle = document.querySelector("#aiAssistSubtitle");
const aiAssistOriginalText = document.querySelector("#aiAssistOriginalText");
const aiAssistContent = document.querySelector("#aiAssistContent");

if (profileVersionLabel) {
  profileVersionLabel.textContent = `AstroChat ${CHAT_VERSION}`;
}

async function consumePendingFcmTokenRefreshRequest() {
  if (!("caches" in window)) return;
  if (!currentUser?.nick) return;

  try {
    const cache = await caches.open(PUSH_SETTINGS_CACHE);
    const response = await cache.match(FCM_TOKEN_REFRESH_REQUEST);
    if (!response) return;

    await cache.delete(FCM_TOKEN_REFRESH_REQUEST);
    refreshFcmTokenRegistrationIfNeeded({ force: true });
  } catch (error) {
    console.warn("Nao foi possivel ler pedido de refresh do token FCM.", error);
  }
}

applyChatTheme(chatTheme);
updateToastRegionVisibility();

setupConnectivityDetection();
setupBackgroundRuntime();
setupNotificationSoundUnlock();
setupServiceWorkerMessageHandling();
bootApp().catch((error) => {
  console.error("Falha ao iniciar o app.", error);
  showLogin();
});
registerServiceWorker();
checkPushWorkerHealth();
window.testAstroChatPushWorker = checkPushWorkerHealth;

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  unlockNotificationSound();

  const nick = sanitizeText(nickInput.value, 24);
  if (!nick) {
    return;
  }

  if (!requireInternet("validar este nick")) return;

  const nativeLanguage = getSelectedNativeLanguage(nativeLanguageSelect?.value || "pt");
  setFormBusy(loginForm, true);

  try {
    await ensureFirebaseIdentity();
    await reserveNickForCurrentFirebaseUser(nick);

    currentUser = {
      nick,
      avatar: getInitials(nick),
      avatarIcon: getSelectedSpaceAvatarIcon(),
      nativeLanguageCode: nativeLanguage.code,
      nativeLanguageName: nativeLanguage.name,
      nativeLanguageLabel: nativeLanguage.label,
      createdAt: Date.now()
    };

    saveUser(currentUser);
    activeRoomId = null;
    suppressAutoRoomSelection = false;
    await enterApp();
  } catch (error) {
    currentUser = null;
    localStorage.removeItem(USER_STORAGE_KEY);
    firebaseInitPromise = null;

    if (isNickTakenError(error)) {
      showToast("Nick em uso", "Escolha outro nick. Esse ja esta sendo usado por outro usuario.");
    } else {
      const notice = getFirebaseConnectionErrorNotice(error);
      console.warn("Nao foi possivel validar o nick.", error);
      showToast(notice.title, notice.message);
    }
  } finally {
    setFormBusy(loginForm, false);
  }
});

notificationsButton.addEventListener("click", async () => {
  unlockNotificationSound();
  openNotificationsModal();

  const totalNotifications = getPendingReceivedInvites().length + getTotalUnreadCount();
  if (!totalNotifications) {
    showToast("Sem notificações", "Convites e mensagens não lidas aparecem neste painel.");
  }
});

mobileNotificationsButton?.addEventListener("click", async () => {
  unlockNotificationSound();
  openNotificationsModal();

  const totalNotifications = getPendingReceivedInvites().length + getTotalUnreadCount();
  if (!totalNotifications) {
    showToast("Sem notificacoes", "Convites e mensagens nao lidas aparecem neste painel.");
  }
});

closeNotificationsButton?.addEventListener("click", closeNotificationsModal);
notificationsModal?.addEventListener("click", (event) => {
  if (event.target === notificationsModal) closeNotificationsModal();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".reaction-picker") && !event.target.closest(".reaction-message-button")) {
    closeReactionPickers();
  }

  if (!event.target.closest(".message-menu") && !event.target.closest(".bubble")) {
    closeMessageMenus();
  }

  if (!event.target.closest(".room-list-context-menu") && !event.target.closest(".chat-item")) {
    closeRoomListContextMenu();
  }
});

window.addEventListener("resize", () => {
  closeMessageMenus();
  closeRoomListContextMenu();
});
messages?.addEventListener("scroll", closeMessageMenus, { passive: true });

profileSettingsButton?.addEventListener("click", openProfileSettingsModal);
profileSettingsButton?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openProfileSettingsModal();
  }
});
closeProfileSettingsButton?.addEventListener("click", closeProfileSettingsModal);
cancelProfileSettingsButton?.addEventListener("click", closeProfileSettingsModal);
profileSettingsModal?.addEventListener("click", (event) => {
  if (event.target === profileSettingsModal) closeProfileSettingsModal();
});
profileSettingsForm?.addEventListener("submit", saveProfileSettings);
resetLocalProfileButton?.addEventListener("click", () => {
  closeProfileSettingsModal();
  handleEraseUserAndLogout();
});
profileNotificationsButton?.addEventListener("click", handleProfileNotificationsButtonClickWithFcm);
internalPushToggleButton?.addEventListener("click", toggleInternalPushNotifications);
clearSavedAudioButton?.addEventListener("click", clearSavedGeminiAudio);
clearLocalConversationsButton?.addEventListener("click", clearLocalConversationData);
clearAppStorageButton?.addEventListener("click", clearTemporaryAppStorage);

profileNickInput?.addEventListener("input", updateProfileSettingsPreview);
profileNativeLanguageSelect?.addEventListener("change", updateProfileSettingsPreview);
profileThemeSelect?.addEventListener("change", handleProfileThemeSelectChange);
profileAvatarInputs.forEach((input) => input.addEventListener("change", updateProfileSettingsPreview));
profileAvatarSelect?.addEventListener("change", () => {
  updateProfileAvatarSelectPreview();
  updateProfileSettingsPreview();
});
spaceAvatarSelect?.addEventListener("change", updateLoginAvatarPreview);

logoutButton.addEventListener("click", handleSessionLogout);

createRoomButton.addEventListener("click", openRoomModal);
createAiFriendButton?.addEventListener("click", openAiFriendModal);
emptyCreateRoomButton.addEventListener("click", openRoomModal);
closeRoomModalButton.addEventListener("click", closeRoomModal);
cancelRoomButton.addEventListener("click", closeRoomModal);
roomFriendFilterInput?.addEventListener("input", renderRoomFriendPicker);
closeAiFriendModalButton?.addEventListener("click", closeAiFriendModal);
cancelAiFriendButton?.addEventListener("click", closeAiFriendModal);
aiFriendAvatarSelect?.addEventListener("change", updateAiFriendAvatarPreview);
aiFriendForm?.addEventListener("submit", handleAiFriendFormSubmit);

roomModal.addEventListener("click", (event) => {
  if (event.target === roomModal) closeRoomModal();
});

aiFriendModal?.addEventListener("click", (event) => {
  if (event.target === aiFriendModal) closeAiFriendModal();
});

roomForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!requireFirebaseConnection("criar sala")) return;

  const roomName = sanitizeText(roomNameInput.value, 32);
  const description = sanitizeText(roomDescriptionInput.value, 80);
  const languageCode = roomLanguageSelect?.value || "";
  const language = getLanguageOption(languageCode);

  if (!roomName) {
    return;
  }

  const selectedFriendIds = Array.from(pendingRoomInviteFriendIds);
  const selectedFriends = friends.filter((friend) => selectedFriendIds.includes(friend.uid) && friend.uid);

  try {
    setFormBusy(roomForm, true);
    const newRoom = await createFirebaseRoom(roomName, description, selectedFriends, language);
    remoteRooms = [newRoom, ...remoteRooms.filter((room) => room.id !== newRoom.id)];
    activeRoomId = newRoom.id;
    suppressAutoRoomSelection = false;
    subscribeToActiveRoomMessages();
    closeRoomModal();
    setActiveView("rooms");
    renderAll(true);
    appShell.classList.add("chat-open");
  } catch (error) {
    console.error("Erro ao criar sala no Firebase.", error);
    window.alert("Não foi possível criar a sala agora. Verifique sua conexão e tente novamente.");
  } finally {
    setFormBusy(roomForm, false);
  }
});

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  const activeRoom = getActiveRoom();

  if (!text || !activeRoom) return;

  if (messageEditTarget) {
    await submitMessageEdit(text);
    return;
  }

  if (isAiRoom(activeRoom)) {
    if (aiReplyInProgress) return;
    if (!requireInternet(getAiInternetActionLabel(activeRoom))) return;
    await clearCurrentTypingStatus();
    messageInput.value = "";
    await handleAiRoomMessage(text);
    return;
  }

  const learningTestEnabled = isLearningTestEnabledForRoom(activeRoom);
  const roomLanguage = getRoomLanguage(activeRoom);
  const needsTranslationBeforePublishing = Boolean(roomLanguage?.code && !learningTestEnabled);
  const canSendOnline = firebaseReady && currentFirebaseUid && isInternetAvailable();

  await clearCurrentTypingStatus();
  messageInput.value = "";

  if (learningTestEnabled) {
    if (canSendOnline) {
      try {
        const sentMessage = await sendFirebaseMessage(activeRoom, text, {
          skipTranslation: true,
          translationDisabled: true,
          learningTest: true,
          learningFeedbackStatus: "pending",
          deliveryStatus: "sent",
          processingType: MESSAGE_PROCESSING_LEARNING_TEST
        });

        startLearningFeedbackJob(activeRoom, sentMessage, text);
        showToast("Verificando em segundo plano", "A mensagem já apareceu no chat. A análise será anexada ao balão quando terminar.");
      } catch (error) {
        console.error("Erro ao publicar mensagem de aprendizado.", error);
        queueMessageForBackgroundProcessing(activeRoom, text, MESSAGE_PROCESSING_LEARNING_TEST, {
          skipTranslation: true,
          learningTest: true,
          pendingOffline: !isInternetAvailable()
        });
        flushOfflineMessageQueue();
        showToast("Mensagem pendente", "Não consegui publicar agora. Ela será enviada e analisada quando a conexão voltar.");
      }
    } else {
      queueMessageForBackgroundProcessing(activeRoom, text, MESSAGE_PROCESSING_LEARNING_TEST, {
        skipTranslation: true,
        learningTest: true,
        pendingOffline: true
      });
      flushOfflineMessageQueue();
      showToast("Aguardando conexão", "Sua frase ficou salva e será enviada com análise quando a internet voltar.");
    }
    return;
  }

  if (needsTranslationBeforePublishing) {
    if (canSendOnline) {
      sendFirebaseMessage(activeRoom, text, {
        publicText: PUBLIC_TRANSLATION_PENDING_TEXT,
        translationSourceText: text,
        deferOriginalUntilTranslated: true,
        skipTranslation: false,
        translationStatus: "pending",
        deliveryStatus: "processing",
        processingType: MESSAGE_PROCESSING_TRANSLATION,
        targetLanguageCode: roomLanguage.code || "",
        targetLanguageName: roomLanguage.name || ""
      }).catch((error) => {
        console.error("Erro ao publicar mensagem para traducao.", error);
        queueMessageForBackgroundProcessing(activeRoom, text, MESSAGE_PROCESSING_TRANSLATION, {
          skipTranslation: false,
          pendingOffline: !isInternetAvailable(),
          targetLanguage: roomLanguage
        });
        showToast("Mensagem pendente", "Nao consegui publicar o aviso de traducao agora. Tentarei novamente quando a conexao voltar.");
      });
    } else {
      queueMessageForBackgroundProcessing(activeRoom, text, MESSAGE_PROCESSING_TRANSLATION, {
        skipTranslation: false,
        pendingOffline: true,
        targetLanguage: roomLanguage
      });
      flushOfflineMessageQueue();
    }

    showToast(
      canSendOnline ? "Traduzindo em segundo plano" : "Aguardando conexão",
      canSendOnline
        ? "Todos verão o balão de tradução enquanto o texto é preparado."
        : "A mensagem ficou salva e será publicada como tradução pendente quando a internet voltar."
    );
    return;
  }

  if (!canSendOnline) {
    queueOfflineMessage(activeRoom, text, {
      learningTest: false,
      skipTranslation: false
    });
    showToast("Aguardando conexão", "Mensagem salva. Ela será enviada automaticamente quando a internet voltar.");
    return;
  }

  sendFirebaseMessage(activeRoom, text).catch((error) => {
    console.error("Erro ao enviar mensagem.", error);
    markLocalMessageSendFailure(activeRoom.id, error?.message || "Falha no envio");
    showToast("Mensagem pendente", "Nao consegui confirmar o envio agora. Tentarei novamente quando a conexao voltar.");
  });
});

cancelReplyButton?.addEventListener("click", clearReplyTarget);

messageInput.addEventListener("input", handleMessageInputTyping);
messageInput.addEventListener("blur", () => scheduleTypingClear());
messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && messageEditTarget) {
    event.preventDefault();
    cancelMessageEdit();
  }
});
suggestTextButton?.addEventListener("click", openTextSuggestionAssistant);
spellcheckButton?.addEventListener("click", openSpellcheckAssistant);
learningTestButton?.addEventListener("click", toggleLearningTestMode);
closeAiAssistButton?.addEventListener("click", closeAiAssistModal);
aiAssistModal?.addEventListener("click", (event) => {
  if (event.target === aiAssistModal) closeAiAssistModal();
});
closeMessageAiTranslationButton?.addEventListener("click", closeMessageAiTranslationModal);
messageAiTranslationModal?.addEventListener("click", (event) => {
  if (event.target === messageAiTranslationModal) closeMessageAiTranslationModal();
});
window.addEventListener("beforeunload", clearCurrentTypingStatus);
document.addEventListener("visibilitychange", markVisibleActiveRoomAsRead);
window.addEventListener("focus", markVisibleActiveRoomAsRead);

liveTypingButton?.addEventListener("click", toggleLiveTypingForActiveRoom);
roomMenuButton?.addEventListener("click", openRoomSettingsModal);
conversationSearchButton?.addEventListener("click", openMessageSearchPanel);
closeRoomSettingsButton?.addEventListener("click", closeRoomSettingsModal);
roomSettingsModal?.addEventListener("click", (event) => {
  if (event.target === roomSettingsModal) closeRoomSettingsModal();
});
saveRoomLanguageButton?.addEventListener("click", saveActiveRoomLanguageFromSettings);
deleteRoomButton?.addEventListener("click", handleDeleteOrLeaveRoomFromSettings);
roomSettingsLiveTypingCheckbox?.addEventListener("change", () => toggleLiveTypingForActiveRoom());
roomSettingsSpeechPlaybackCheckbox?.addEventListener("change", () => setSpeechPlaybackForActiveRoom(Boolean(roomSettingsSpeechPlaybackCheckbox.checked)));
saveRoomVoiceSettingsButton?.addEventListener("click", saveActiveRoomVoiceSettings);
roomSettingsClearChatButton?.addEventListener("click", handleClearActiveChat);
roomSettingsPinButton?.addEventListener("click", toggleActiveRoomPin);
roomSettingsSelectMessagesButton?.addEventListener("click", () => {
  closeRoomSettingsModal();
  setMessageSelectionMode(true);
});
teacherDifficultyForm?.addEventListener("submit", handleTeacherDifficultySubmit);
messageSearchInput?.addEventListener("input", updateMessageSearchFromControls);
messageSearchUserInput?.addEventListener("input", updateMessageSearchFromControls);
messageSearchDateInput?.addEventListener("input", updateMessageSearchFromControls);
messageSearchPrevButton?.addEventListener("click", () => jumpToMessageSearchMatch(-1));
messageSearchNextButton?.addEventListener("click", () => jumpToMessageSearchMatch(1));
closeMessageSearchButton?.addEventListener("click", closeMessageSearchPanel);

searchInput.addEventListener("input", () => {
  renderRoomList(searchInput.value);
});

backButton.addEventListener("click", closeMobileConversationToMenu);

clearChatButton?.addEventListener("click", handleClearActiveChat);

async function handleClearActiveChat() {
  const activeRoom = getActiveRoom();
  if (!activeRoom) return;

  if (isAiRoom(activeRoom)) {
    const confirmClear = window.confirm(`Reiniciar a conversa com ${getRoomDisplayName(activeRoom)}?`);
    if (!confirmClear) return;

    activeRoom.messages = [createAiWelcomeMessage(activeRoom)];
    activeRoom.updatedAt = Date.now();
    saveRooms();
    forceMessageRerender(activeRoom.id);
    renderRoomList(searchInput.value);
    renderActiveRoom(true);
    closeRoomSettingsModal();
    return;
  }

  if (!requireFirebaseConnection("limpar conversa")) return;

  const confirmClear = window.confirm(`Limpar todas as mensagens da sala ${getRoomDisplayName(activeRoom)}?`);
  if (!confirmClear) return;

  try {
    await clearFirebaseRoomMessages(activeRoom.id);
    closeRoomSettingsModal();
    showToast("Conversa limpa", "As mensagens desta sala foram removidas.");
  } catch (error) {
    console.error("Erro ao limpar mensagens.", error);
    window.alert("Não foi possível limpar as mensagens agora. Verifique sua conexão e tente novamente.");
  }
}

inviteButton.addEventListener("click", openInviteModal);
letterButton?.addEventListener("click", openLetterModal);
closeLetterButton?.addEventListener("click", closeLetterModal);
letterModal?.addEventListener("click", (event) => { if (event.target === letterModal) closeLetterModal(); });
letterForm?.addEventListener("submit", sendPrivateLetter);
letterTransportPicker?.addEventListener("change", handleLetterTransportChange);
letterChallengeSubmitButton?.addEventListener("click", verifyLetterTranslationChallenge);
letterChallengeRefreshButton?.addEventListener("click", refreshLetterTranslationChallenge);
letterTurboButton?.addEventListener("click", handleLetterTurboButtonClick);
letterRequireTranslationCheckbox?.addEventListener("change", syncLetterProtectionComposerState);
letterOpenChallengeDirectionSelect?.addEventListener("change", syncLetterProtectionComposerState);
letterChallengeInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  verifyLetterTranslationChallenge();
});
closeLetterViewerButton?.addEventListener("click", closeLetterViewer);
letterViewerModal?.addEventListener("click", (event) => { if (event.target === letterViewerModal) closeLetterViewer(); });
letterViewerChallengeButton?.addEventListener("click", verifyLetterViewerChallenge);
letterViewerChallengeInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  verifyLetterViewerChallenge();
});
requestLetterLocationButton?.addEventListener("click", requestPrivateLetterLocation);
closeInviteModalButton.addEventListener("click", closeInviteModal);
cancelInviteButton.addEventListener("click", closeInviteModal);

inviteModal.addEventListener("click", (event) => {
  if (event.target === inviteModal) closeInviteModal();
});

privateChatButton.addEventListener("click", openPrivateModal);
closePrivateModalButton.addEventListener("click", closePrivateModal);
privateModal.addEventListener("click", (event) => {
  if (event.target === privateModal) closePrivateModal();
});

privateSearchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await searchUserForPrivateConversation();
});
setupAutomaticUserSearch({
  input: privateNickInput,
  resultContainer: privateSearchResult,
  searchAction: searchUserForPrivateConversation,
  minLength: 1,
  waitingText: "Digite pelo menos 2 letras para buscar o usuÃ¡rio."
});

inviteUserSearchForm.querySelector("button").addEventListener("click", async () => {
  await searchUserForInvite();
});
setupAutomaticUserSearch({
  input: inviteNickInput,
  resultContainer: inviteSearchResult,
  searchAction: searchUserForInvite,
  minLength: 1,
  waitingText: "Digite pelo menos 2 letras para buscar o usuÃ¡rio."
});

inviteNickInput.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  await searchUserForInvite();
});

inviteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const activeRoom = getActiveRoom();
  if (!activeRoom || isAiRoom(activeRoom)) return;
  if (!requireFirebaseConnection("enviar convites")) return;

  const selectedFriendIds = getCheckedFriendIds(inviteFriendsList);
  const selectedFriends = friends.filter((friend) => selectedFriendIds.includes(friend.uid) && friend.uid);

  if (!selectedFriends.length) {
    window.alert("Selecione pelo menos um amigo ou busque um usuário pelo nick para convidar.");
    return;
  }

  try {
    setFormBusy(inviteForm, true);
    await Promise.all(selectedFriends.map((friend) => inviteFriendToRoom(activeRoom, friend)));
    closeInviteModal();
    openNotificationsModal();
    renderAll();
  } catch (error) {
    console.error("Erro ao enviar convites.", error);
    window.alert("Não foi possível enviar os convites agora. Verifique sua conexão e tente novamente.");
  } finally {
    setFormBusy(inviteForm, false);
  }
});

addFriendForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nick = sanitizeText(friendNickInput.value, 24);
  if (!nick) {
    return;
  }

  const normalizedNick = normalize(nick);
  const userNick = normalize(currentUser?.nick || "");

  if (normalizedNick === userNick) {
    window.alert("Esse nick é o seu. Adicione o nick de outro usuário.");
    return;
  }

  if (!requireFirebaseConnection("adicionar amigos")) return;

  if (!firebaseReady || !currentFirebaseUid) {
    window.alert("A conexão ainda está sendo preparada. Tente novamente em alguns segundos.");
    return;
  }

  try {
    setFormBusy(addFriendForm, true);
    const foundUsers = await findFirebaseUsersByNick(nick);

    if (!foundUsers.length) {
      window.alert("Não encontrei esse nick. Peça para a pessoa entrar no app pelo menos uma vez usando esse nick.");
      return;
    }

    const friendUser = foundUsers[0];

    if (isFriendWithUid(friendUser.uid)) {
      window.alert("Esse amigo já está na sua lista.");
      return;
    }

    const result = await sendFriendRequest(friendUser, { wantsPrivateChat: false });
    if (result === "offline") return;
    friendNickInput.value = "";
    renderAll();

    if (result === "accepted-existing") {
      showToast("Amizade aceita", `${friendUser.nick} entrou na sua lista de amigos.`);
    } else if (result === "pending-existing") {
      showToast("Pedido já pendente", `Aguarde ${friendUser.nick} aceitar seu pedido de amizade.`);
    } else if (result === "sent") {
      showToast("Pedido enviado", `${friendUser.nick} precisa aceitar antes de virar amigo.`);
    }
  } catch (error) {
    console.error("Erro ao buscar usuário no Firebase.", error);
    window.alert("Não foi possível buscar esse usuário agora. Verifique sua conexão e tente novamente.");
  } finally {
    setFormBusy(addFriendForm, false);
  }
});
setupAutomaticUserSearch({
  input: friendNickInput,
  resultContainer: friendSearchResult,
  searchAction: searchUserForAddFriend,
  minLength: 1,
  waitingText: "Digite pelo menos 2 letras para buscar um amigo."
});

[roomsTab, friendsTab, invitesTab].filter(Boolean).forEach((tab) => {
  tab.addEventListener("click", () => setActiveView(tab.dataset.view));
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

async function handleSessionLogout() {
  if (logoutInProgress) return;

  const shouldLogout = window.confirm("Sair do AstroChat e voltar para a tela de login?\n\nSuas salas e amigos não serão apagados.");
  if (!shouldLogout) return;

  logoutInProgress = true;
  setLogoutButtonsBusy(true);
  showToast("Saindo...", "Nenhuma conversa, sala ou amigo sera apagado.");

  try {
    await clearCurrentTypingStatus();
    await unregisterFcmTokenForCurrentUser();
    finishSessionLogout();
    showToast("Voce saiu", "Seus dados foram preservados. Entre novamente para continuar.");
  } catch (error) {
    console.error("Erro ao sair.", error);
    showToast("Nao consegui sair", "Tente novamente em alguns segundos.");
  } finally {
    logoutInProgress = false;
    setLogoutButtonsBusy(false);
  }
}

function finishFullLogout() {
  detachFirebaseListeners();
  stopSpeaking();
  closeUserSessionModals();
  clearStoredAstroChatData();
  resetRuntimeSessionState();
  showLogin();
}

async function handleEraseUserAndLogout() {
  if (logoutInProgress) return;
  if (!requireFirebaseConnection("apagar este usuario")) return;

  const shouldErase = window.confirm(
    "Apagar este usuario e sair do AstroChat?\n\n" +
    "Isso remove o perfil, nick, convites, conversas privadas para todos e tira voce dos grupos. " +
    "Nos grupos criados por voce, outro membro vira criador; se nao houver outro membro, a sala e apagada."
  );
  if (!shouldErase) return;

  logoutInProgress = true;
  setLogoutButtonsBusy(true);
  showToast("Apagando usuario...", "Removendo seu perfil e vínculos do app.");

  try {
    await clearCurrentTypingStatus();
    await unregisterFcmTokenForCurrentUser({ deleteBrowserToken: true });
    await eraseCurrentUserFromFirebaseSystem();
    await deleteCurrentFirebaseAuthUserOrSignOut();
    finishFullLogout();
    showToast("Usuario apagado", "Seu perfil, convites e vínculos foram removidos.");
  } catch (error) {
    console.error("Erro ao apagar usuario.", error);
    const leaveOnly = window.confirm(
      "Nao consegui apagar tudo agora.\n\n" +
      "Deseja apenas sair sem apagar os dados?"
    );

    if (leaveOnly) {
      finishSessionLogout();
      showToast("Voce saiu", "Nada foi apagado. Tente apagar o usuario novamente quando a conexao estiver estavel.");
    } else {
      showToast("Exclusao cancelada", "Nenhum dado local foi removido.");
    }
  } finally {
    logoutInProgress = false;
    setLogoutButtonsBusy(false);
  }
}

function setLogoutButtonsBusy(isBusy) {
  if (logoutButton) logoutButton.disabled = isBusy;
  if (resetLocalProfileButton) resetLocalProfileButton.disabled = isBusy;
}

function finishSessionLogout() {
  detachFirebaseListeners();
  stopSpeaking();
  closeUserSessionModals();
  localStorage.removeItem(USER_STORAGE_KEY);
  resetRuntimeSessionState();
  showLogin();
}

function resetRuntimeSessionState() {
  stopBackgroundRefresh();
  currentUser = null;
  currentFirebaseUser = null;
  currentFirebaseUid = null;
  activeRoomId = null;
  suppressAutoRoomSelection = false;
  activeView = "rooms";
  remoteRooms = [];
  friends = [];
  invites = [];
  rooms = [];
  activeTypingUsers = [];
  replyTarget = null;
  messageSelectionMode = false;
  messageEditTarget = null;
  roomListContextMenuRoomId = "";
  selectedMessageIds.clear();
  roomMetadataSignatures.clear();
  notificationState = normalizeNotificationState({});
  liveTypingByRoom = {};
  learningTestByRoom = {};
  processedFriendRequestIds = {};
  pinnedConversationIds = new Set();
  offlineMessageQueue = [];
  messageSearchState = createEmptyMessageSearchState();
  firebaseReady = false;
  firebaseInitPromise = null;
  aiReplyInProgress = false;
  pendingNotificationRoomId = "";
  pendingNotificationsModalOpen = false;
  fcmTokenRegistrationPromise = null;
  if (firebaseMessagingForegroundUnsubscribe) {
    firebaseMessagingForegroundUnsubscribe();
    firebaseMessagingForegroundUnsubscribe = null;
  }
  pendingRoomInviteFriendIds.clear();
  roomMessagesById.clear();
  renderedMessageIdsByRoom.clear();
  revealedOriginalMessageIds.clear();
  hydratingMessageIds.clear();
  dehydratingMessageIds.clear();
  hydratedTranslationCache.clear();
  remoteRoomMap.clear();
  inviteSnapshotBuckets.received = [];
  inviteSnapshotBuckets.sent = [];
  appShell.classList.remove("chat-open");
  if (messageInput) messageInput.disabled = false;
  if (sendButton) sendButton.disabled = false;
}

function closeUserSessionModals() {
  closeNotificationsModal();
  closeProfileSettingsModal();
  closeRoomSettingsModal();
  closeAiFriendModal();
  closePrivateModal();
  closeRoomModal();
  closeInviteModal();
  closeAiAssistModal();
  closeMessageAiTranslationModal();
  closeLetterModal();
}

function clearStoredAstroChatData() {
  [
    USER_STORAGE_KEY,
    FRIENDS_STORAGE_KEY,
    ROOMS_STORAGE_KEY,
    NOTIFICATIONS_STORAGE_KEY,
    INTERNAL_PUSH_STORAGE_KEY,
    SYSTEM_PUSH_STORAGE_KEY,
    FCM_DEVICE_ID_STORAGE_KEY,
    FCM_TOKEN_STORAGE_KEY,
    FCM_TOKEN_REFRESHED_AT_STORAGE_KEY,
    SPEECH_RATE_STORAGE_KEY,
    SPEECH_PLAYBACK_STORAGE_KEY,
    ROOM_VOICE_SETTINGS_STORAGE_KEY,
    LIVE_TYPING_STORAGE_KEY,
    LEARNING_TEST_STORAGE_KEY,
    PROCESSED_FRIEND_REQUESTS_STORAGE_KEY,
    PINNED_CONVERSATIONS_STORAGE_KEY,
    OFFLINE_MESSAGE_QUEUE_STORAGE_KEY,
    PENDING_TRANSLATION_JOBS_STORAGE_KEY,
    REMOTE_CONVERSATION_CACHE_STORAGE_KEY
  ].forEach((key) => localStorage.removeItem(key));
}

function loadLocalSessionData() {
  rooms = loadFromStorage(ROOMS_STORAGE_KEY, []).filter((room) => room?.type === AI_ROOM_TYPE).map(normalizeLocalAiRoom);
  friends = loadFromStorage(FRIENDS_STORAGE_KEY, []);
  notificationState = normalizeNotificationState(loadFromStorage(NOTIFICATIONS_STORAGE_KEY, {}));
  internalPushNotificationsEnabled = loadFromStorage(INTERNAL_PUSH_STORAGE_KEY, true) !== false;
  systemPushNotificationsEnabled = loadFromStorage(SYSTEM_PUSH_STORAGE_KEY, true) !== false;
  syncSystemPushPreferenceToServiceWorker();
  liveTypingByRoom = loadFromStorage(LIVE_TYPING_STORAGE_KEY, {});
  speechPlaybackByRoom = loadFromStorage(SPEECH_PLAYBACK_STORAGE_KEY, {});
  roomVoiceSettings = loadFromStorage(ROOM_VOICE_SETTINGS_STORAGE_KEY, {});
  learningTestByRoom = loadFromStorage(LEARNING_TEST_STORAGE_KEY, {});
  processedFriendRequestIds = loadFromStorage(PROCESSED_FRIEND_REQUESTS_STORAGE_KEY, {});
  pinnedConversationIds = new Set(loadFromStorage(PINNED_CONVERSATIONS_STORAGE_KEY, []));
  offlineMessageQueue = normalizeOfflineMessageQueue(loadFromStorage(OFFLINE_MESSAGE_QUEUE_STORAGE_KEY, []));
  pendingTranslationJobs = normalizePendingTranslationJobs(loadFromStorage(PENDING_TRANSLATION_JOBS_STORAGE_KEY, []));
  loadRemoteConversationCache();
  restorePendingLocalMessagesAfterReload();
}

async function safeSignOutFirebase() {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn("Não foi possível encerrar a sessão anônima do Firebase.", error);
  }
}

async function deleteCurrentFirebaseAuthUserOrSignOut() {
  const authUser = auth.currentUser;

  if (!authUser) {
    await safeSignOutFirebase();
    return;
  }

  try {
    await deleteUser(authUser);
  } catch (error) {
    console.warn("Nao foi possivel apagar o usuario anonimo do Firebase Auth. Encerrando a sessao.", error);
    await safeSignOutFirebase();
  }
}

async function eraseCurrentUserFromFirebaseSystem() {
  if (!firebaseReady || !currentFirebaseUid) return;

  const uid = currentFirebaseUid;
  const updates = {};
  const roomIds = await collectCurrentUserRoomIds(uid);
  const roomSnapshots = await Promise.all(
    roomIds.map(async (roomId) => ({ roomId, snapshot: await get(ref(db, `rooms/${roomId}`)).catch(() => null) }))
  );

  roomSnapshots.forEach(({ roomId, snapshot }) => {
    if (!snapshot?.exists()) {
      updates[`userRooms/${uid}/${roomId}`] = null;
      return;
    }

    addRoomCleanupUpdates(updates, roomId, snapshot.val() || {}, uid);
  });

  await addInviteCleanupUpdates(updates, uid);
  await addProfileCleanupUpdates(updates, uid);

  const compactUpdates = compactFirebaseUpdates(updates);
  if (Object.keys(compactUpdates).length) {
    await update(ref(db), compactUpdates);
  }
}

function compactFirebaseUpdates(updates) {
  const compactEntries = [];

  Object.entries(updates)
    .sort(([pathA], [pathB]) => pathA.split("/").length - pathB.split("/").length)
    .forEach(([path, value]) => {
      const hasAncestor = compactEntries.some(([ancestorPath]) => isFirebaseAncestorPath(ancestorPath, path));
      if (!hasAncestor) compactEntries.push([path, value]);
    });

  return Object.fromEntries(compactEntries);
}

function isFirebaseAncestorPath(parentPath, childPath) {
  return childPath !== parentPath && childPath.startsWith(`${parentPath}/`);
}

async function collectCurrentUserRoomIds(uid) {
  const ids = new Set();

  remoteRooms.forEach((room) => {
    if (room?.id && !isAiRoom(room)) ids.add(room.id);
  });

  friends.forEach((friend) => {
    if (friend?.uid) ids.add(getPrivateRoomId(uid, friend.uid));
  });

  try {
    const userRoomsSnapshot = await get(ref(db, `userRooms/${uid}`));
    Object.keys(userRoomsSnapshot.val() || {}).forEach((roomId) => ids.add(roomId));
  } catch (error) {
    console.warn("Não foi possível carregar todos os vínculos de sala do usuário.", error);
  }

  return Array.from(ids);
}

function addRoomCleanupUpdates(updates, roomId, roomData, uid) {
  const memberUids = Object.keys(roomData.memberUids || {});
  const invitedUids = Object.keys(roomData.invitedUids || {});
  const linkedUids = unique([...memberUids, ...invitedUids, uid].filter(Boolean));
  const privateRoom = Boolean(roomData.private || roomData.type === PRIVATE_ROOM_TYPE);

  if (privateRoom) {
    updates[`rooms/${roomId}`] = null;
    linkedUids.forEach((memberUid) => {
      updates[`userRooms/${memberUid}/${roomId}`] = null;
    });
    return;
  }

  const otherMembers = memberUids.filter((memberUid) => memberUid && memberUid !== uid);

  if (!otherMembers.length) {
    updates[`rooms/${roomId}`] = null;
    linkedUids.forEach((memberUid) => {
      updates[`userRooms/${memberUid}/${roomId}`] = null;
    });
    return;
  }

  updates[`userRooms/${uid}/${roomId}`] = null;
  updates[`rooms/${roomId}/memberUids/${uid}`] = null;
  updates[`rooms/${roomId}/memberNicks/${uid}`] = null;
  updates[`rooms/${roomId}/memberAvatarIcons/${uid}`] = null;
  updates[`rooms/${roomId}/invitedUids/${uid}`] = null;
  updates[`rooms/${roomId}/invitedNicks/${uid}`] = null;
  updates[`rooms/${roomId}/invitedAvatarIcons/${uid}`] = null;
  updates[`rooms/${roomId}/typing/${uid}`] = null;
  updates[`rooms/${roomId}/updatedAt`] = serverTimestamp();
  updates[`rooms/${roomId}/updatedAtMillis`] = Date.now();

  if (roomData.ownerUid === uid) {
    const nextOwnerUid = otherMembers[0];
    updates[`rooms/${roomId}/ownerUid`] = nextOwnerUid;
    updates[`rooms/${roomId}/ownerNick`] = roomData.memberNicks?.[nextOwnerUid] || "Criador";
    updates[`rooms/${roomId}/ownerAvatarIcon`] = getSafeSpaceAvatarIcon(roomData.memberAvatarIcons?.[nextOwnerUid]);
  }
}

async function addInviteCleanupUpdates(updates, uid) {
  const inviteIds = new Set(invites.filter((invite) => invite.fromUid === uid || invite.toUid === uid).map((invite) => invite.id));

  try {
    const sentSnapshot = await get(ref(db, `userInvites/${uid}/sent`));
    Object.keys(sentSnapshot.val() || {}).forEach((inviteId) => inviteIds.add(inviteId));
  } catch (error) {
    console.warn("Não foi possível carregar convites enviados para limpeza.", error);
  }

  try {
    const receivedSnapshot = await get(ref(db, `userInvites/${uid}/received`));
    Object.keys(receivedSnapshot.val() || {}).forEach((inviteId) => inviteIds.add(inviteId));
  } catch (error) {
    console.warn("Não foi possível carregar convites recebidos para limpeza.", error);
  }

  await Promise.all(Array.from(inviteIds).map(async (inviteId) => {
    let inviteData = invites.find((invite) => invite.id === inviteId) || null;

    if (!inviteData) {
      try {
        const snapshot = await get(ref(db, `invites/${inviteId}`));
        inviteData = snapshot.exists() ? snapshot.val() : null;
      } catch (error) {
        console.warn("Não foi possível carregar convite para limpeza.", inviteId, error);
      }
    }

    updates[`invites/${inviteId}`] = null;
    updates[`userInvites/${uid}/sent/${inviteId}`] = null;
    updates[`userInvites/${uid}/received/${inviteId}`] = null;

    if (inviteData?.fromUid) updates[`userInvites/${inviteData.fromUid}/sent/${inviteId}`] = null;
    if (inviteData?.toUid) updates[`userInvites/${inviteData.toUid}/received/${inviteId}`] = null;

    if (inviteData?.roomId && inviteData?.toUid) {
      updates[`rooms/${inviteData.roomId}/invitedUids/${inviteData.toUid}`] = null;
      updates[`rooms/${inviteData.roomId}/invitedNicks/${inviteData.toUid}`] = null;
      updates[`rooms/${inviteData.roomId}/invitedAvatarIcons/${inviteData.toUid}`] = null;
    }
  }));

}

async function addProfileCleanupUpdates(updates, uid) {
  const nickKeys = new Set();
  const currentNickKey = normalize(currentUser?.nick || "");

  if (currentNickKey) nickKeys.add(currentNickKey);

  try {
    const profileSnapshot = await get(ref(db, `users/${uid}`));
    const profile = profileSnapshot.val() || {};

    if (profile.nick) nickKeys.add(normalize(profile.nick));
    if (profile.nickKey) nickKeys.add(normalize(profile.nickKey));
    if (profile.nickPathKey) nickKeys.add(normalize(profile.nickPathKey));
  } catch (error) {
    console.warn("Não foi possível carregar o perfil para limpar todos os índices de nick.", error);
  }

  const knownProfile = currentFirebaseUser || {};
  if (knownProfile?.displayName) nickKeys.add(normalize(knownProfile.displayName));

  nickKeys.forEach((nickKey) => {
    if (!nickKey) return;

    const nickPathKey = toDatabaseKey(nickKey);
    updates[`nickIndex/${nickPathKey}/${uid}`] = null;
    updates[`nickOwners/${nickPathKey}`] = null;
  });

  updates[`users/${uid}`] = null;
  updates[`fcmTokens/${uid}`] = null;
  updates[`webPushSubscriptions/${uid}`] = null;
}

function setupConnectivityDetection() {
  internetOnline = navigator.onLine !== false;
  document.body.classList.toggle("is-offline", !internetOnline);

  window.addEventListener("online", () => {
    internetOnline = true;
    document.body.classList.remove("is-offline");
    if (currentUser?.nick) updateUserHeader(firebaseReady ? "Online" : "Reconectando...");
    showToast("Internet conectada", offlineMessageQueue.length ? "Enviando mensagens pendentes..." : "Acoes online foram liberadas novamente.");
    refreshFcmTokenRegistrationIfNeeded({ force: true, minIntervalMs: FCM_RESUME_REFRESH_MIN_INTERVAL_MS });
    scheduleConnectivityBackgroundSync();
  });

  window.addEventListener("offline", () => {
    internetOnline = false;
    document.body.classList.add("is-offline");
    if (!currentFirebaseUid) {
      firebaseReady = false;
      firebaseInitPromise = null;
    }
    updateUserHeader("Offline");
    showToast("Sem internet", "Voce pode ler mensagens carregadas e escrever. Novas mensagens ficam aguardando conexao.");
  });
}

function scheduleConnectivityBackgroundSync() {
  if (connectivityBackgroundSyncTimer) {
    window.clearTimeout(connectivityBackgroundSyncTimer);
  }

  connectivityBackgroundSyncTimer = window.setTimeout(() => {
    connectivityBackgroundSyncTimer = null;
    runConnectivityBackgroundSync();
  }, CONNECTIVITY_BACKGROUND_SYNC_DELAY_MS);
}

async function runConnectivityBackgroundSync() {
  if (connectivityBackgroundSyncInProgress || !currentUser?.nick || logoutInProgress || !isInternetAvailable()) return;

  connectivityBackgroundSyncInProgress = true;

  try {
    if (!firebaseReady || !currentFirebaseUid) {
      await initFirebaseSession({ preserveUi: true });
    }

    await flushOfflineMessageQueue();
    await runBackgroundRefresh({ preserveUi: true });
  } catch (error) {
    firebaseInitPromise = null;
    console.warn("Nao foi possivel sincronizar a reconexao em segundo plano.", error);
  } finally {
    connectivityBackgroundSyncInProgress = false;
  }
}

function setupBackgroundRuntime() {
  document.addEventListener("visibilitychange", handleBackgroundVisibilityChange);
  window.addEventListener("pagehide", startBackgroundRefresh);
  window.addEventListener("pageshow", handleForegroundResume);
  window.addEventListener("focus", handleForegroundResume);
}

function handleBackgroundVisibilityChange() {
  if (document.hidden) {
    refreshFcmTokenRegistrationIfNeeded({ force: true, minIntervalMs: FCM_RESUME_REFRESH_MIN_INTERVAL_MS });
    startBackgroundRefresh();
    if (currentUser?.nick && firebaseReady) updateUserHeader("Em segundo plano");
    return;
  }

  handleForegroundResume();
}

function startBackgroundRefresh() {
  if (backgroundRefreshTimer || !currentUser?.nick || logoutInProgress) return;

  backgroundRefreshTimer = window.setInterval(runBackgroundRefresh, BACKGROUND_REFRESH_INTERVAL_MS);
  window.setTimeout(runBackgroundRefresh, 1200);
}

function stopBackgroundRefresh() {
  if (!backgroundRefreshTimer) return;

  window.clearInterval(backgroundRefreshTimer);
  backgroundRefreshTimer = null;
}

function handleForegroundResume() {
  stopBackgroundRefresh();
  if (!currentUser?.nick || logoutInProgress) return;

  updateForegroundUserHeader();
  refreshFcmTokenRegistrationIfNeeded({ force: true, minIntervalMs: FCM_RESUME_REFRESH_MIN_INTERVAL_MS });
  runBackgroundRefresh({ foreground: true });
  markVisibleActiveRoomAsRead();
}

function updateForegroundUserHeader() {
  if (!currentUser?.nick) return;

  if (!isInternetAvailable()) {
    updateUserHeader("Offline");
    return;
  }

  updateUserHeader(firebaseReady && currentFirebaseUid ? "Online" : "Reconectando...");
}

async function runBackgroundRefresh(options = {}) {
  if (backgroundRefreshInProgress || !currentUser?.nick || logoutInProgress || !isInternetAvailable()) return;

  backgroundRefreshInProgress = true;

  try {
    if (!firebaseReady || !currentFirebaseUid) {
      await initFirebaseSession({
        preserveUi: options.preserveUi === true || options.foreground === true || !document.hidden
      });
    }

    if (!currentFirebaseUid) return;

    await flushOfflineMessageQueue();

    const [roomIndexSnapshot, receivedIndexSnapshot, sentIndexSnapshot] = await Promise.all([
      get(ref(db, `userRooms/${currentFirebaseUid}`)),
      get(ref(db, `userInvites/${currentFirebaseUid}/received`)),
      get(ref(db, `userInvites/${currentFirebaseUid}/sent`))
    ]);

    const roomIds = Object.keys(roomIndexSnapshot.val() || {});
    syncRoomSubscriptions(roomIds);
    scheduleRoomLastMessagesRefresh(roomIds, options.foreground ? 0 : 500);
    syncInviteSubscriptions("received", Object.keys(receivedIndexSnapshot.val() || {}));
    syncInviteSubscriptions("sent", Object.keys(sentIndexSnapshot.val() || {}));
    refreshFcmTokenRegistrationIfNeeded();

    if (options.foreground && options.preserveUi !== true) {
      updateUserHeader("Online");
      renderAll();
    } else if (!document.hidden) {
      updateUserHeader("Online");
    } else if (document.hidden) {
      updateUserHeader("Em segundo plano");
    }
  } catch (error) {
    firebaseInitPromise = null;
    if (!document.hidden) updateForegroundUserHeader();
    console.warn("Nao foi possivel atualizar em segundo plano.", error);
  } finally {
    backgroundRefreshInProgress = false;
  }
}

function isInternetAvailable() {
  return internetOnline && navigator.onLine !== false;
}

function requireInternet(actionText = "fazer esta acao") {
  if (isInternetAvailable()) return true;

  updateUserHeader("Offline");
  showToast("Sem internet", `Conecte-se a internet para ${actionText}.`);
  return false;
}

function requireFirebaseConnection(actionText = "usar recursos online") {
  if (!requireInternet(actionText)) return false;

  if (firebaseReady && currentFirebaseUid) return true;

  showToast("Conectando...", "Aguarde alguns segundos e tente novamente.");
  return false;
}

function getFirebaseConnectionErrorNotice(error = {}) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  const hostname = location.hostname || "este dominio";

  if (code === "auth/unauthorized-domain") {
    return {
      title: "Dominio nao autorizado",
      message: `Adicione ${hostname} em Firebase Console > Authentication > Settings > Authorized domains.`,
      status: "Firebase bloqueado"
    };
  }

  if (code === "auth/admin-restricted-operation" || code === "auth/operation-not-allowed") {
    return {
      title: "Login anonimo desativado",
      message: "Ative Anonymous em Firebase Console > Authentication > Sign-in method.",
      status: "Firebase bloqueado"
    };
  }

  if (code.includes("permission-denied") || message.toLowerCase().includes("permission denied")) {
    return {
      title: "Sem permissao no Firebase",
      message: "Confira as regras do Realtime Database para users, rooms, userRooms, userInvites e fcmTokens.",
      status: "Sem permissao"
    };
  }

  return {
    title: "Firebase nao conectou",
    message: `No site publicado (${hostname}), confira HTTPS, dominio autorizado no Auth e regras do Realtime Database.`,
    status: "Offline - sala IA local"
  };
}

function getFcmRegistrationErrorNotice(error = {}) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  const lowerMessage = message.toLowerCase();

  if (code.includes("failed-service-worker-registration") || lowerMessage.includes("service worker")) {
    return {
      title: "Service worker falhou",
      message: "No celular, feche o PWA, abra a pagina publicada de novo e atualize para instalar a versao nova."
    };
  }

  if (code.includes("unsupported") || lowerMessage.includes("not supported")) {
    return {
      title: "FCM indisponivel",
      message: "Este navegador nao suporta Firebase Cloud Messaging para Web Push."
    };
  }

  if (code.includes("permission") || lowerMessage.includes("permission")) {
    return {
      title: "Notificacao sem permissao",
      message: "Libere notificacoes nas configuracoes do navegador para este site e tente registrar de novo."
    };
  }

  if (code.includes("token") || lowerMessage.includes("token")) {
    return {
      title: "Token FCM nao gerado",
      message: "Confira a chave VAPID publica e se fcmTokens pode ser gravado no Realtime Database."
    };
  }

  return {
    title: "FCM nao registrou",
    message: "Confira HTTPS, permissao de notificacao, chave VAPID, service worker e regras de fcmTokens."
  };
}

async function bootApp() {
  showSplash("Verificando login salvo...");

  if (!currentUser?.nick) {
    showLogin();
    return;
  }

  await enterApp();
}

function showSplash(statusText = "Carregando conversas e dados...") {
  document.body.classList.add("auth-loading");
  document.body.classList.remove("is-authenticated");
  appShell.setAttribute("aria-hidden", "true");
  loginScreen.setAttribute("aria-hidden", "true");
  splashScreen?.removeAttribute("aria-hidden");
  if (splashStatus) splashStatus.textContent = statusText;
}

function showLogin() {
  detachFirebaseListeners();
  document.body.classList.remove("is-authenticated");
  document.body.classList.remove("auth-loading");
  appShell.setAttribute("aria-hidden", "true");
  splashScreen?.setAttribute("aria-hidden", "true");
  loginScreen.removeAttribute("aria-hidden");
  nickInput.value = currentUser?.nick || "";
  if (nativeLanguageSelect) nativeLanguageSelect.value = getCurrentNativeLanguage().code;
  selectSpaceAvatar(currentUser?.avatarIcon || DEFAULT_SPACE_AVATAR_ICON);
  updateLoginAvatarPreview();
}

async function enterApp() {
  showSplash("Carregando conversas e dados...");
  loadLocalSessionData();
  ensureUserAiRoom();
  updateUserHeader("Conectando...");
  renderAll(true);
  let startupNotice = null;

  try {
    await initFirebaseSession();
  } catch (error) {
    if (isMissingFirebaseUserDataError(error)) {
      const attemptedNick = currentUser?.nick || "";
      console.warn("Dados do usuario nao encontrados. Limpando navegador.", error);
      await clearBrowserDataForMissingFirebaseUser(attemptedNick);
      return;
    }

    if (isNickTakenError(error)) {
      const attemptedNick = currentUser?.nick || "";
      console.warn("Nick ja esta em uso.", error);
      localStorage.removeItem(USER_STORAGE_KEY);
      currentUser = null;
      firebaseReady = false;
      firebaseInitPromise = null;
      showLogin();
      nickInput.value = attemptedNick;
      showToast("Nick em uso", "Escolha outro nick. Esse ja esta sendo usado por outro usuario.");
      return;
    }

    console.error("Falha ao iniciar sessao online.", error);
    startupNotice = getFirebaseConnectionErrorNotice(error);
    firebaseReady = false;
    firebaseInitPromise = null;
    updateUserHeader(startupNotice.status);
  }

  renderAll(true);
  document.body.classList.add("is-authenticated");
  document.body.classList.remove("auth-loading");
  appShell.removeAttribute("aria-hidden");
  loginScreen.setAttribute("aria-hidden", "true");
  splashScreen?.setAttribute("aria-hidden", "true");

  if (activeRoomId) {
    subscribeToActiveRoomMessages();
  }
  tryOpenPendingNotificationsModal();

  if (startupNotice) {
    showToast(startupNotice.title, startupNotice.message);
  }
}

async function initFirebaseSession(options = {}) {
  if (!currentUser?.nick) return;
  if (!isInternetAvailable()) {
    updateUserHeader("Offline");
    return;
  }
  if (firebaseInitPromise) return firebaseInitPromise;

  firebaseInitPromise = (async () => {
    let user = await waitForAuthState();

    if (!user) {
      const credential = await signInAnonymously(auth);
      user = credential.user;
    }

    currentFirebaseUser = user;
    currentFirebaseUid = user.uid;
    firebaseReady = true;

    await ensureCurrentFirebaseUserHasStoredData();
    await saveFirebaseUserProfile();
    await preloadFirebaseInitialData({
      render: options.preserveUi !== true,
      showSplash: options.preserveUi !== true
    });
    attachFirebaseListeners({ preserveCachedData: true });
    setupFirebaseMessagingForegroundListener().catch((error) => {
      console.warn("Nao foi possivel preparar mensagens FCM em primeiro plano.", error);
    });
    registerFcmTokenIfNotificationGranted();
    updateUserHeader("Online");
    flushOfflineMessageQueue();
  })();

  return firebaseInitPromise;
}

async function preloadFirebaseInitialData(options = {}) {
  if (!currentFirebaseUid) return;

  if (options.showSplash !== false) {
    showSplash("Carregando salas e convites...");
  }

  const [roomIndexSnapshot, receivedIndexSnapshot, sentIndexSnapshot] = await Promise.all([
    get(ref(db, `userRooms/${currentFirebaseUid}`)),
    get(ref(db, `userInvites/${currentFirebaseUid}/received`)),
    get(ref(db, `userInvites/${currentFirebaseUid}/sent`))
  ]);

  const roomIds = Object.keys(roomIndexSnapshot.val() || {});
  const receivedInviteIds = Object.keys(receivedIndexSnapshot.val() || {});
  const sentInviteIds = Object.keys(sentIndexSnapshot.val() || {});

  const [roomSnapshots, receivedInviteSnapshots, sentInviteSnapshots] = await Promise.all([
    Promise.all(roomIds.map((roomId) => get(ref(db, `rooms/${roomId}`)).catch((error) => {
      console.warn("Nao foi possivel pre-carregar a sala.", roomId, error);
      return null;
    }))),
    Promise.all(receivedInviteIds.map((inviteId) => get(ref(db, `invites/${inviteId}`)).catch((error) => {
      console.warn("Nao foi possivel pre-carregar o convite recebido.", inviteId, error);
      return null;
    }))),
    Promise.all(sentInviteIds.map((inviteId) => get(ref(db, `invites/${inviteId}`)).catch((error) => {
      console.warn("Nao foi possivel pre-carregar o convite enviado.", inviteId, error);
      return null;
    })))
  ]);

  remoteRoomMap.clear();
  roomMetadataSignatures.clear();
  roomSnapshots
    .filter((snapshot) => snapshot?.exists())
    .forEach((snapshot) => {
      remoteRoomMap.set(snapshot.key, mapRoomSnapshot(snapshot));
      roomMetadataSignatures.set(snapshot.key, getRoomMetadataSignature(snapshot.key, snapshot.val() || {}));
    });

  remoteRooms = Array.from(remoteRoomMap.values());
  saveRemoteConversationCache();
  inviteSnapshotBuckets.received = receivedInviteSnapshots
    .filter((snapshot) => snapshot?.exists())
    .map(mapInviteSnapshot);
  inviteSnapshotBuckets.sent = sentInviteSnapshots
    .filter((snapshot) => snapshot?.exists())
    .map(mapInviteSnapshot);
  rememberInviteSnapshotSignatures("received");
  rememberInviteSnapshotSignatures("sent");

  mergeInviteBuckets();
  validateActiveRoom();
  if (options.render !== false) {
    renderAll(true);
  }
  tryOpenPendingNotificationRoom();
  tryOpenPendingNotificationsModal();
}

function rememberInviteSnapshotSignatures(bucket) {
  inviteSnapshotSignatures[bucket].clear();
  inviteSnapshotBuckets[bucket].forEach((invite) => {
    if (invite?.id) {
      inviteSnapshotSignatures[bucket].set(invite.id, JSON.stringify(invite));
    }
  });
}

function waitForAuthState() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function ensureFirebaseIdentity() {
  if (!isInternetAvailable()) {
    throw new Error("Sem internet para validar nick.");
  }

  let user = currentFirebaseUser || auth.currentUser || await waitForAuthState();

  if (!user) {
    const credential = await signInAnonymously(auth);
    user = credential.user;
  }

  currentFirebaseUser = user;
  currentFirebaseUid = user.uid;
  firebaseReady = true;
  return user;
}

function createNickTakenError(nick, owner = null) {
  const error = new Error(`Nick em uso: ${nick}`);
  error.code = NICK_TAKEN_ERROR_CODE;
  error.nick = nick;
  error.owner = owner;
  return error;
}

function isNickTakenError(error) {
  return error?.code === NICK_TAKEN_ERROR_CODE;
}

function createMissingFirebaseUserDataError(uid, nick) {
  const error = new Error(`Usuario sem dados no Firebase: ${uid || nick || "desconhecido"}`);
  error.code = MISSING_FIREBASE_USER_DATA_ERROR_CODE;
  error.uid = uid;
  error.nick = nick;
  return error;
}

function isMissingFirebaseUserDataError(error) {
  return error?.code === MISSING_FIREBASE_USER_DATA_ERROR_CODE;
}

async function ensureCurrentFirebaseUserHasStoredData() {
  if (!currentFirebaseUid || !currentUser?.nick) return;

  showSplash("Verificando seus dados...");

  const nickPathKey = toDatabaseKey(normalize(currentUser.nick));
  const [
    profileSnapshot,
    nickOwnerSnapshot,
    nickIndexSnapshot,
    roomIndexSnapshot,
    inviteIndexSnapshot
  ] = await Promise.all([
    get(ref(db, `users/${currentFirebaseUid}`)),
    get(ref(db, `nickOwners/${nickPathKey}`)),
    get(ref(db, `nickIndex/${nickPathKey}/${currentFirebaseUid}`)),
    get(ref(db, `userRooms/${currentFirebaseUid}`)),
    get(ref(db, `userInvites/${currentFirebaseUid}`))
  ]);

  const nickOwner = nickOwnerSnapshot.val() || null;
  const hasFirebaseData = profileSnapshot.exists()
    || nickOwner?.uid === currentFirebaseUid
    || nickIndexSnapshot.exists()
    || roomIndexSnapshot.exists()
    || inviteIndexSnapshot.exists();

  if (!hasFirebaseData) {
    throw createMissingFirebaseUserDataError(currentFirebaseUid, currentUser.nick);
  }
}

async function clearBrowserDataForMissingFirebaseUser(attemptedNick = "") {
  detachFirebaseListeners();
  stopSpeaking();
  closeUserSessionModals();

  await safeSignOutFirebase();
  clearStoredAstroChatData();
  clearSiteLocalStorage();
  clearSiteSessionStorage();
  await clearSiteCaches();
  resetRuntimeSessionState();
  showLogin();

  if (nickInput) nickInput.value = attemptedNick;
  showToast("Sessao removida", "Não encontrei dados desse usuário. O navegador foi limpo para este site.");
}

function clearSiteLocalStorage() {
  try {
    localStorage.clear();
  } catch (error) {
    console.warn("Nao foi possivel limpar localStorage.", error);
  }
}

function clearSiteSessionStorage() {
  try {
    sessionStorage.clear();
  } catch (error) {
    console.warn("Nao foi possivel limpar sessionStorage.", error);
  }
}

async function clearSiteCaches() {
  if (!("caches" in window)) return;

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  } catch (error) {
    console.warn("Nao foi possivel limpar caches do site.", error);
  }
}

async function reserveNickForCurrentFirebaseUser(nick) {
  if (!currentFirebaseUid) {
    throw new Error("Sem usuario Firebase para reservar nick.");
  }

  const nickKey = normalize(nick);
  if (!nickKey) return;

  const nickPathKey = toDatabaseKey(nickKey);
  const now = Date.now();
  let existingOwner = null;

  const result = await runTransaction(
    ref(db, `nickOwners/${nickPathKey}`),
    (currentOwner) => {
      if (!currentOwner || currentOwner.uid === currentFirebaseUid) {
        return {
          uid: currentFirebaseUid,
          nick,
          nickKey,
          nickPathKey,
          updatedAtMillis: now
        };
      }

      existingOwner = currentOwner;
      return;
    },
    { applyLocally: false }
  );

  if (!result.committed) {
    throw createNickTakenError(nick, existingOwner || result.snapshot?.val() || null);
  }
}

async function releaseNickOwnerIfCurrent(nickPathKey) {
  if (!nickPathKey || !currentFirebaseUid) return;

  try {
    await runTransaction(
      ref(db, `nickOwners/${nickPathKey}`),
      (currentOwner) => {
        if (!currentOwner || currentOwner.uid === currentFirebaseUid) return null;
        return currentOwner;
      },
      { applyLocally: false }
    );
  } catch (error) {
    console.warn("Nao foi possivel liberar o nick antigo.", error);
  }
}

async function saveFirebaseUserProfile() {
  if (!currentFirebaseUid || !currentUser?.nick) return;

  const now = Date.now();
  const nickKey = normalize(currentUser.nick);
  const nickPathKey = toDatabaseKey(nickKey);
  const snapshot = await get(ref(db, `users/${currentFirebaseUid}`));
  const previousProfile = snapshot.val() || {};
  const previousNickSource = previousProfile.nickPathKey || previousProfile.nickKey || previousProfile.nick || "";
  const previousNickPathKey = previousNickSource ? toDatabaseKey(previousNickSource) : "";

  await reserveNickForCurrentFirebaseUser(currentUser.nick);

  const profile = {
    uid: currentFirebaseUid,
    nick: currentUser.nick,
    nickKey,
    nickPathKey,
    avatar: currentUser.avatar || getInitials(currentUser.nick),
    avatarIcon: getSafeSpaceAvatarIcon(currentUser.avatarIcon),
    nativeLanguageCode: getCurrentNativeLanguage().code,
    nativeLanguageName: getCurrentNativeLanguage().name,
    nativeLanguageLabel: getCurrentNativeLanguage().label,
    updatedAt: serverTimestamp(),
    updatedAtMillis: now,
    lastSeenAt: serverTimestamp(),
    lastSeenAtMillis: now
  };

  if (!snapshot.exists()) {
    profile.createdAt = serverTimestamp();
    profile.createdAtMillis = now;
  }

  const updates = {
    [`users/${currentFirebaseUid}`]: profile,
    [`nickIndex/${nickPathKey}/${currentFirebaseUid}`]: {
      uid: currentFirebaseUid,
      nick: profile.nick,
      nickKey: profile.nickKey,
      nickPathKey: profile.nickPathKey,
      avatar: profile.avatar,
      avatarIcon: profile.avatarIcon,
      nativeLanguageCode: profile.nativeLanguageCode,
      nativeLanguageName: profile.nativeLanguageName,
      nativeLanguageLabel: profile.nativeLanguageLabel,
      updatedAtMillis: now
    }
  };

  if (previousNickPathKey && previousNickPathKey !== nickPathKey) {
    updates[`nickIndex/${previousNickPathKey}/${currentFirebaseUid}`] = null;
  }

  await update(ref(db), updates);

  if (previousNickPathKey && previousNickPathKey !== nickPathKey) {
    await releaseNickOwnerIfCurrent(previousNickPathKey);
  }
}

function attachFirebaseListeners(options = {}) {
  if (!currentFirebaseUid) return;
  detachFirebaseListeners({ preserveCachedData: options.preserveCachedData === true });

  unsubscribeRooms = onValue(
    ref(db, `userRooms/${currentFirebaseUid}`),
    (snapshot) => {
      const roomIds = snapshot.exists() ? Object.keys(snapshot.val() || {}) : [];
      syncRoomSubscriptions(roomIds);
    },
    (error) => {
      console.error("Erro ao escutar salas no Realtime Database.", error);
      updateUserHeader("Sem permissão para carregar salas");
    }
  );

  unsubscribeReceivedInvites = onValue(
    ref(db, `userInvites/${currentFirebaseUid}/received`),
    (snapshot) => {
      const inviteIds = snapshot.exists() ? Object.keys(snapshot.val() || {}) : [];
      syncInviteSubscriptions("received", inviteIds);
    },
    (error) => {
      console.error("Erro ao escutar convites recebidos no Realtime Database.", error);
    }
  );

  unsubscribeSentInvites = onValue(
    ref(db, `userInvites/${currentFirebaseUid}/sent`),
    (snapshot) => {
      const inviteIds = snapshot.exists() ? Object.keys(snapshot.val() || {}) : [];
      syncInviteSubscriptions("sent", inviteIds);
    },
    (error) => {
      console.error("Erro ao escutar convites enviados no Realtime Database.", error);
    }
  );
}

function detachFirebaseListeners(options = {}) {
  if (unsubscribeRooms) unsubscribeRooms();
  if (unsubscribeReceivedInvites) unsubscribeReceivedInvites();
  if (unsubscribeSentInvites) unsubscribeSentInvites();
  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribeTyping) unsubscribeTyping();
  if (roomLastMessageRefreshTimer) window.clearTimeout(roomLastMessageRefreshTimer);

  roomMetadataUnsubscribers.forEach((unsubscribe) => unsubscribe());
  roomLastMessageUnsubscribers.forEach((unsubscribe) => unsubscribe());
  inviteUnsubscribers.received.forEach((unsubscribe) => unsubscribe());
  inviteUnsubscribers.sent.forEach((unsubscribe) => unsubscribe());

  unsubscribeRooms = null;
  unsubscribeReceivedInvites = null;
  unsubscribeSentInvites = null;
  unsubscribeMessages = null;
  unsubscribeTyping = null;
  roomLastMessageRefreshTimer = null;
  roomLastMessageRefreshInProgress = false;
  scheduleRoomLastMessagesRefresh.pendingIds?.clear();
  activeMessagesRoomId = null;
  activeTypingRoomId = null;
  activeTypingUsers = [];
  roomMetadataUnsubscribers.clear();
  roomLastMessageUnsubscribers.clear();
  inviteUnsubscribers.received.clear();
  inviteUnsubscribers.sent.clear();
  if (!options.preserveCachedData) {
    remoteRoomMap.clear();
    inviteSnapshotBuckets.received = [];
    inviteSnapshotBuckets.sent = [];
    roomMetadataSignatures.clear();
    inviteSnapshotSignatures.received.clear();
    inviteSnapshotSignatures.sent.clear();
  }
}

function syncRoomSubscriptions(roomIds) {
  const nextIds = new Set(roomIds);
  let didChangeSubscriptions = false;

  Array.from(remoteRoomMap.keys()).forEach((roomId) => {
    if (!nextIds.has(roomId)) {
      didChangeSubscriptions = true;
      remoteRoomMap.delete(roomId);
      roomMetadataSignatures.delete(roomId);
      roomMessagesById.delete(roomId);
      renderedMessageIdsByRoom.delete(roomId);
      const unsubscribeLastMessage = roomLastMessageUnsubscribers.get(roomId);
      if (unsubscribeLastMessage) unsubscribeLastMessage();
      roomLastMessageUnsubscribers.delete(roomId);
    }
  });

  roomMetadataUnsubscribers.forEach((unsubscribe, roomId) => {
    if (!nextIds.has(roomId)) {
      didChangeSubscriptions = true;
      unsubscribe();
      roomMetadataUnsubscribers.delete(roomId);
      const unsubscribeLastMessage = roomLastMessageUnsubscribers.get(roomId);
      if (unsubscribeLastMessage) unsubscribeLastMessage();
      roomLastMessageUnsubscribers.delete(roomId);
      remoteRoomMap.delete(roomId);
      roomMetadataSignatures.delete(roomId);
      roomMessagesById.delete(roomId);
      renderedMessageIdsByRoom.delete(roomId);
    }
  });

  roomIds.forEach((roomId) => {
    ensureRoomLastMessageSubscription(roomId);

    if (roomMetadataUnsubscribers.has(roomId)) return;
    didChangeSubscriptions = true;

    const unsubscribe = onValue(
      ref(db, `rooms/${roomId}`),
      (snapshot) => {
        if (snapshot.exists()) {
          const rawRoomData = snapshot.val() || {};
          const metadataSignature = getRoomMetadataSignature(roomId, rawRoomData);
          const previousSignature = roomMetadataSignatures.get(roomId) || "";
          const initialSnapshot = !remoteRoomMap.has(roomId);

          if (!initialSnapshot && previousSignature === metadataSignature) {
            return;
          }

          roomMetadataSignatures.set(roomId, metadataSignature);
          const mappedRoom = mapRoomSnapshot(snapshot);
          remoteRoomMap.set(roomId, mappedRoom);
          handleRoomMessageNotification(mappedRoom, { initialSnapshot });
        } else {
          remoteRoomMap.delete(roomId);
          roomMetadataSignatures.delete(roomId);
        }

        remoteRooms = Array.from(remoteRoomMap.values());
        saveRemoteConversationCache();
        validateActiveRoom();
        renderAll();
        subscribeToActiveRoomMessages();
        tryOpenPendingNotificationRoom();
      },
      (error) => {
        console.error("Erro ao escutar uma sala no Realtime Database.", error);
      }
    );

    roomMetadataUnsubscribers.set(roomId, unsubscribe);
  });

  if (didChangeSubscriptions) {
    remoteRooms = Array.from(remoteRoomMap.values());
    saveRemoteConversationCache();
    validateActiveRoom();
    renderAll();
  }
  scheduleRoomLastMessagesRefresh(roomIds, 500);
  tryOpenPendingNotificationRoom();
}

function syncInviteSubscriptions(bucket, inviteIds) {
  const nextIds = new Set(inviteIds);
  const bucketMap = inviteUnsubscribers[bucket];
  let didChangeSubscriptions = false;

  const previousBucketLength = inviteSnapshotBuckets[bucket].length;
  inviteSnapshotBuckets[bucket] = inviteSnapshotBuckets[bucket].filter((invite) => nextIds.has(invite.id));
  if (inviteSnapshotBuckets[bucket].length !== previousBucketLength) {
    didChangeSubscriptions = true;
  }

  bucketMap.forEach((unsubscribe, inviteId) => {
    if (!nextIds.has(inviteId)) {
      didChangeSubscriptions = true;
      unsubscribe();
      bucketMap.delete(inviteId);
      inviteSnapshotSignatures[bucket].delete(inviteId);
      inviteSnapshotBuckets[bucket] = inviteSnapshotBuckets[bucket].filter((invite) => invite.id !== inviteId);
    }
  });

  inviteIds.forEach((inviteId) => {
    if (bucketMap.has(inviteId)) return;
    didChangeSubscriptions = true;

    const unsubscribe = onValue(
      ref(db, `invites/${inviteId}`),
      (snapshot) => {
        const previousSignature = inviteSnapshotSignatures[bucket].get(inviteId) || "";

        let mappedInvite = null;
        if (snapshot.exists()) {
          mappedInvite = mapInviteSnapshot(snapshot);
        }

        const nextSignature = mappedInvite ? JSON.stringify(mappedInvite) : "";
        if (previousSignature === nextSignature) return;

        if (nextSignature) {
          inviteSnapshotSignatures[bucket].set(inviteId, nextSignature);
        } else {
          inviteSnapshotSignatures[bucket].delete(inviteId);
        }

        inviteSnapshotBuckets[bucket] = inviteSnapshotBuckets[bucket].filter((invite) => invite.id !== inviteId);
        if (mappedInvite) {
          inviteSnapshotBuckets[bucket].push(mappedInvite);
        }

        mergeInviteBuckets();
        renderAll();
      },
      (error) => {
        console.error("Erro ao escutar convite no Realtime Database.", error);
      }
    );

    bucketMap.set(inviteId, unsubscribe);
  });

  if (didChangeSubscriptions) {
    mergeInviteBuckets();
    renderAll();
  }
}

function mergeInviteBuckets() {
  const map = new Map();
  [...inviteSnapshotBuckets.received, ...inviteSnapshotBuckets.sent].forEach((invite) => {
    map.set(invite.id, invite);
  });
  invites = Array.from(map.values());
  handleAcceptedFriendRequests();
  handleRemovedFriendRequests();
  handleInviteNotifications();
}

function subscribeToActiveRoomMessages() {
  const activeRoom = getActiveRoom();
  const isRemoteRoom = activeRoom && !isAiRoom(activeRoom);

  if (!isRemoteRoom) {
    if (unsubscribeMessages) unsubscribeMessages();
    unsubscribeMessages = null;
    activeMessagesRoomId = null;
    subscribeToActiveRoomTyping();
    return;
  }

  if (activeMessagesRoomId === activeRoom.id && unsubscribeMessages) return;

  if (unsubscribeMessages) unsubscribeMessages();
  activeMessagesRoomId = activeRoom.id;

  unsubscribeMessages = onValue(
    ref(db, `rooms/${activeRoom.id}/messages`),
    (snapshot) => {
      const nextMessages = [];
      snapshot.forEach((childSnapshot) => {
        nextMessages.push(mapMessageSnapshot(childSnapshot));
      });
      nextMessages.sort(compareMessagesBySendOrder);
      const mergedMessages = attachLocalTranslationJobsToMessages(
        activeRoom.id,
        mergeQueuedMessagesForRoom(activeRoom.id, nextMessages)
      );
      roomMessagesById.set(activeRoom.id, mergedMessages);
      saveRemoteConversationCache();

      if (activeRoomId === activeRoom.id) {
        const updatedRoom = getActiveRoom();
        if (isRoomCurrentlyVisible(activeRoom.id)) {
          markRoomAsRead(updatedRoom);
        }
        renderRoomMessages(updatedRoom);
        renderRoomList(searchInput.value);
      }
    },
    (error) => {
      console.error("Erro ao escutar mensagens no Realtime Database.", error);
      window.alert("Não foi possível carregar as mensagens desta sala agora.");
    }
  );
}


function subscribeToActiveRoomTyping() {
  const activeRoom = getActiveRoom();
  const isRemoteRoom = activeRoom && !isAiRoom(activeRoom);

  if (!isRemoteRoom) {
    if (unsubscribeTyping) unsubscribeTyping();
    unsubscribeTyping = null;
    activeTypingRoomId = null;
    activeTypingUsers = [];
    if (typingStaleRenderTimer) clearTimeout(typingStaleRenderTimer);
    typingStaleRenderTimer = null;
    renderTypingPreviewPanel();
    return;
  }

  if (activeTypingRoomId === activeRoom.id && unsubscribeTyping) return;

  if (unsubscribeTyping) unsubscribeTyping();
  activeTypingRoomId = activeRoom.id;
  activeTypingUsers = [];

  unsubscribeTyping = onValue(
    ref(db, `rooms/${activeRoom.id}/typing`),
    (snapshot) => {
      const now = Date.now();
      const nextUsers = [];
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val() || {};
        const uid = childSnapshot.key;
        if (!uid || uid === currentFirebaseUid) return;
        const updatedAtMillis = Number(data.updatedAtMillis || data.updatedAt || 0) || now;
        if (now - updatedAtMillis > 12000) return;
        nextUsers.push({
          uid,
          nick: data.nick || "Usuário",
          isLive: Boolean(data.isLive),
          text: String(data.text || "").slice(0, 240),
          updatedAtMillis
        });
      });
      activeTypingUsers = nextUsers.sort((a, b) => b.updatedAtMillis - a.updatedAtMillis);
      renderTypingPreviewPanel();
      scheduleTypingPreviewStaleCleanup();
    },
    (error) => {
      console.error("Erro ao escutar digitação em tempo real.", error);
    }
  );
}

function handleMessageInputTyping() {
  updateLiveTypingButtonState();

  const activeRoom = getActiveRoom();
  if (!isInternetAvailable() || !activeRoom || isAiRoom(activeRoom) || !firebaseReady || !currentFirebaseUid) return;

  const cleanText = cleanMessageText(messageInput.value).slice(0, 240);
  if (!cleanText) {
    scheduleTypingClear(250);
    return;
  }

  if (typingInputTimer) clearTimeout(typingInputTimer);

  const now = Date.now();
  if (!lastTypingStatusPublishAt || now - lastTypingStatusPublishAt > 1400) {
    lastTypingStatusPublishAt = now;
    publishTypingStatus(activeRoom, cleanText);
  } else {
    typingInputTimer = setTimeout(() => {
      lastTypingStatusPublishAt = Date.now();
      publishTypingStatus(activeRoom, cleanText);
    }, 160);
  }

  scheduleTypingClear(3600);
}

function scheduleTypingClear(delay = 1200) {
  if (typingIdleTimer) clearTimeout(typingIdleTimer);
  typingIdleTimer = setTimeout(() => {
    clearCurrentTypingStatus();
  }, delay);
}

async function publishTypingStatus(room, text) {
  if (!isInternetAvailable() || !room?.id || isAiRoom(room) || !currentFirebaseUid || !firebaseReady) return;

  const liveEnabled = isLiveTypingEnabledForRoom(room.id);
  try {
    await update(ref(db), {
      [`rooms/${room.id}/typing/${currentFirebaseUid}`]: {
        uid: currentFirebaseUid,
        nick: currentUser?.nick || "Usuário",
        isLive: liveEnabled,
        text: liveEnabled ? text : "",
        updatedAt: serverTimestamp(),
        updatedAtMillis: Date.now()
      }
    });
  } catch (error) {
    console.warn("Não foi possível publicar estado de digitação.", error);
  }
}

async function clearCurrentTypingStatus() {
  if (typingInputTimer) clearTimeout(typingInputTimer);
  if (typingIdleTimer) clearTimeout(typingIdleTimer);
  typingInputTimer = null;
  typingIdleTimer = null;
  lastTypingStatusPublishAt = 0;

  const activeRoom = getActiveRoom();
  if (!isInternetAvailable() || !activeRoom?.id || isAiRoom(activeRoom) || !currentFirebaseUid || !firebaseReady) return;

  try {
    await update(ref(db), {
      [`rooms/${activeRoom.id}/typing/${currentFirebaseUid}`]: null
    });
  } catch (error) {
    console.warn("Não foi possível limpar estado de digitação.", error);
  }
}

function renderTypingPreviewPanel() {
  if (typingPreviewPanel) {
    typingPreviewPanel.hidden = true;
    typingPreviewPanel.innerHTML = "";
  }

  removeLiveTypingRows();

  const activeRoom = getActiveRoom();
  if (!activeRoom || isAiRoom(activeRoom) || !activeTypingUsers.length || messages.hidden) {
    if (activeRoom && !isAiRoom(activeRoom) && !(activeRoom.messages || []).length && !messages.querySelector(".empty-state")) {
      renderEmptyConversation();
    }
    return;
  }

  const emptyState = messages.querySelector(".empty-state");
  if (emptyState) emptyState.remove();

  const wasNearBottom = isMessagesNearBottom();
  const fragment = document.createDocumentFragment();
  const roomMessages = activeRoom.messages || [];
  let previousMessage = roomMessages.at(-1) || null;

  activeTypingUsers.forEach((user) => {
    const groupedWithPrevious = shouldGroupTypingWithPrevious(previousMessage, user);
    const element = createLiveTypingMessageElement(user, { groupedWithPrevious });
    fragment.appendChild(element);
    previousMessage = { authorUid: user.uid, time: user.updatedAtMillis, isTypingPreview: true };
  });

  messages.appendChild(fragment);

  if (wasNearBottom) {
    scheduleMessagesScrollToBottom();
  }
}

function scheduleTypingPreviewStaleCleanup() {
  if (typingStaleRenderTimer) clearTimeout(typingStaleRenderTimer);
  typingStaleRenderTimer = null;

  if (!activeTypingUsers.length) return;

  const now = Date.now();
  const nextExpiry = Math.min(...activeTypingUsers.map((user) => Number(user.updatedAtMillis || now) + 12100));
  const delay = Math.max(600, nextExpiry - now);

  typingStaleRenderTimer = window.setTimeout(() => {
    const freshNow = Date.now();
    activeTypingUsers = activeTypingUsers.filter((user) => freshNow - Number(user.updatedAtMillis || 0) <= 12000);
    renderTypingPreviewPanel();
    scheduleTypingPreviewStaleCleanup();
  }, delay);
}

function removeLiveTypingRows() {
  messages?.querySelectorAll(".live-typing-preview-row").forEach((row) => row.remove());
}

function createLiveTypingMessageElement(user, options = {}) {
  const row = document.createElement("div");
  const stack = document.createElement("div");
  const bubble = document.createElement("div");
  const showAuthor = !options.groupedWithPrevious;
  const liveText = String(user?.text || "").trim();

  row.className = `message-row received live-typing-preview-row${options.groupedWithPrevious ? " is-grouped" : ""}`;
  row.dataset.typingUid = user?.uid || "";
  stack.className = "message-stack";
  bubble.className = `bubble typing-live-bubble${liveText ? " has-live-text" : ""}`;

  if (showAuthor) {
    const topBar = document.createElement("div");
    const authorWrap = document.createElement("div");
    const author = document.createElement("span");
    const tools = document.createElement("div");
    topBar.className = "message-bubble-top";
    authorWrap.className = "message-bubble-author";
    tools.className = "message-bubble-tools";
    author.className = "author-label";
    author.textContent = user?.nick || "Usuário";
    authorWrap.appendChild(author);
    topBar.append(authorWrap, tools);
    bubble.appendChild(topBar);
  }

  if (liveText) {
    const text = document.createElement("p");
    text.className = "message-text typing-live-message-text";
    text.textContent = liveText;
    bubble.appendChild(text);
  } else {
    const dots = document.createElement("div");
    dots.className = "typing-dots typing-dots-in-bubble";
    dots.setAttribute("aria-label", `${user?.nick || "Usuário"} está digitando`);
    dots.innerHTML = "<span></span><span></span><span></span>";
    bubble.appendChild(dots);
  }

  const footer = document.createElement("div");
  const status = document.createElement("span");
  footer.className = "message-footer typing-live-footer";
  status.textContent = liveText ? "digitando ao vivo" : "digitando";
  footer.appendChild(status);
  bubble.appendChild(footer);

  stack.appendChild(bubble);
  row.appendChild(stack);
  return row;
}

function shouldGroupMessageWithPrevious(previousMessage, message) {
  if (!previousMessage || !message) return false;
  if (!previousMessage.authorUid || !message.authorUid) return false;
  if (previousMessage.authorUid !== message.authorUid) return false;
  if (message.replyTo || previousMessage.replyTo) return false;

  const previousTime = Number(previousMessage.time || previousMessage.createdAt || 0);
  const currentTime = Number(message.time || message.createdAt || 0);
  if (!previousTime || !currentTime) return true;

  return Math.abs(currentTime - previousTime) <= 5 * 60 * 1000;
}

function shouldGroupTypingWithPrevious(previousMessage, user) {
  if (!previousMessage || !user?.uid) return false;
  if (previousMessage.authorUid !== user.uid) return false;

  const previousTime = Number(previousMessage.time || previousMessage.createdAt || 0);
  const currentTime = Number(user.updatedAtMillis || Date.now());
  if (!previousTime || !currentTime) return true;

  return Math.abs(currentTime - previousTime) <= 5 * 60 * 1000;
}

function toggleLiveTypingForActiveRoom() {
  const activeRoom = getActiveRoom();
  if (!activeRoom || isAiRoom(activeRoom)) return;

  liveTypingByRoom[activeRoom.id] = !isLiveTypingEnabledForRoom(activeRoom.id);
  saveLiveTypingSettings();
  updateLiveTypingButtonState();
  handleMessageInputTyping();

  showToast(
    liveTypingByRoom[activeRoom.id] ? "Digitação ao vivo ativada" : "Digitação ao vivo desativada",
    liveTypingByRoom[activeRoom.id]
      ? "Outros usuários verão o texto enquanto você digita neste chat."
      : "Outros usuários verão apenas o aviso de Digitando..."
  );
}

function updateLiveTypingButtonState() {
  const activeRoom = getActiveRoom();
  const enabled = activeRoom && !isAiRoom(activeRoom) && isLiveTypingEnabledForRoom(activeRoom.id);

  if (liveTypingButton) {
    liveTypingButton.hidden = !activeRoom || isAiRoom(activeRoom);
    liveTypingButton.classList.toggle("is-active", Boolean(enabled));
    liveTypingButton.title = enabled
      ? "Digitação ao vivo ativada neste chat"
      : "Compartilhar texto digitado em tempo real";
    liveTypingButton.setAttribute("aria-label", liveTypingButton.title);
  }

  if (roomSettingsLiveTypingButton) {
    const unavailable = !activeRoom || isAiRoom(activeRoom);
    roomSettingsLiveTypingButton.hidden = unavailable;
    roomSettingsLiveTypingButton.classList.toggle("is-active", Boolean(enabled));
    roomSettingsLiveTypingButton.setAttribute("aria-pressed", String(Boolean(enabled)));
    const status = roomSettingsLiveTypingButton.querySelector(".room-menu-toggle-status") || roomSettingsLiveTypingButton.querySelector("small");
    if (status) status.textContent = enabled ? "Ativado" : "Desativado";
    roomSettingsLiveTypingButton.title = enabled
      ? "Desativar digitação ao vivo neste chat"
      : "Ativar digitação ao vivo neste chat";
  }

  if (roomSettingsLiveTypingCheckbox) {
    roomSettingsLiveTypingCheckbox.checked = Boolean(enabled);
    roomSettingsLiveTypingCheckbox.disabled = !activeRoom || isAiRoom(activeRoom);
  }

  updateSpeechPlaybackToggleState(activeRoom);

  if (roomSettingsClearChatButton) {
    roomSettingsClearChatButton.hidden = !activeRoom;
    const span = roomSettingsClearChatButton.querySelector("span");
    const small = roomSettingsClearChatButton.querySelector("small");
    const icon = roomSettingsClearChatButton.querySelector("i");
    if (span) span.textContent = activeRoom && isAiRoom(activeRoom) ? "Reiniciar IA" : "Limpar conversa";
    if (small) small.textContent = activeRoom && isAiRoom(activeRoom) ? "Recomeça o professor" : "Remove mensagens";
    if (small && activeRoom && isAiRoom(activeRoom)) small.textContent = "Recomeca este chat";
    if (icon) icon.className = activeRoom && isAiRoom(activeRoom) ? "fa-solid fa-rotate-right" : "fa-solid fa-broom";
  }

  updateRoomPinButtonState(activeRoom);
}

function setSpeechPlaybackForActiveRoom(enabled) {
  const activeRoom = getActiveRoom();
  if (!activeRoom) return;

  if (enabled) {
    speechPlaybackByRoom[activeRoom.id] = true;
  } else {
    delete speechPlaybackByRoom[activeRoom.id];
  }

  if (activeSpeechMessageKey?.startsWith(`${activeRoom.id}:`)) {
    stopSpeaking();
  }

  saveSpeechPlaybackSettings();
  updateSpeechPlaybackToggleState(activeRoom);

  showToast(
    enabled ? "Voz abaixo do texto" : "Voz no lugar do texto",
    enabled
      ? "Ao clicar em Gerar voz, as barras aparecem embaixo da mensagem sem esconder o texto."
      : "Ao clicar em Gerar voz, as barras aparecem no lugar do texto da mensagem."
  );
}

function isSpeechPlaybackEnabledForRoom(roomId) {
  return Boolean(roomId && speechPlaybackByRoom?.[roomId]);
}

function saveSpeechPlaybackSettings() {
  localStorage.setItem(SPEECH_PLAYBACK_STORAGE_KEY, JSON.stringify(speechPlaybackByRoom || {}));
}

function getRoomVoiceSettings(roomId) {
  const saved = roomVoiceSettings?.[roomId] || {};
  return { voice: sanitizeText(saved.voice || "Kore", 32), rate: Math.min(1.4, Math.max(0.8, Number(saved.rate) || 1)) };
}

function getActiveRoomVoiceSettings() {
  return getRoomVoiceSettings(getActiveRoom()?.id || "");
}

function saveActiveRoomVoiceSettings() {
  const room = getActiveRoom();
  if (!room?.id) return;
  roomVoiceSettings[room.id] = {
    voice: sanitizeText(roomSettingsVoiceSelect?.value || "Kore", 32),
    rate: Math.min(1.4, Math.max(0.8, Number(roomSettingsVoiceRateSelect?.value) || 1))
  };
  localStorage.setItem(ROOM_VOICE_SETTINGS_STORAGE_KEY, JSON.stringify(roomVoiceSettings));
  stopSpeaking();
  showToast("Voz salva", `Esta sala usará ${roomVoiceSettings[room.id].voice} em ${roomVoiceSettings[room.id].rate}×.`);
}

function renderRoomVoiceSettings(room) {
  const settings = getRoomVoiceSettings(room?.id || "");
  if (roomSettingsVoiceSelect) roomSettingsVoiceSelect.value = settings.voice;
  if (roomSettingsVoiceRateSelect) roomSettingsVoiceRateSelect.value = String(settings.rate);
}

function updateSpeechPlaybackToggleState(activeRoom = getActiveRoom()) {
  const enabled = Boolean(activeRoom?.id && isSpeechPlaybackEnabledForRoom(activeRoom.id));
  const unavailable = !activeRoom;

  if (roomSettingsSpeechPlaybackButton) {
    roomSettingsSpeechPlaybackButton.hidden = unavailable;
    roomSettingsSpeechPlaybackButton.classList.toggle("is-active", enabled);
    roomSettingsSpeechPlaybackButton.setAttribute("aria-pressed", String(enabled));
    const status = roomSettingsSpeechPlaybackButton.querySelector(".room-menu-toggle-status") || roomSettingsSpeechPlaybackButton.querySelector("small");
    if (status) status.textContent = enabled ? "Aparece abaixo do texto" : "Aparece no lugar do texto";
    roomSettingsSpeechPlaybackButton.title = enabled
      ? "As barras de voz aparecem abaixo do texto quando você clicar em Gerar voz"
      : "As barras de voz substituem o texto quando você clicar em Gerar voz";
  }

  if (roomSettingsSpeechPlaybackCheckbox) {
    roomSettingsSpeechPlaybackCheckbox.checked = enabled;
    roomSettingsSpeechPlaybackCheckbox.disabled = unavailable;
  }
}

function isLiveTypingEnabledForRoom(roomId) {
  return Boolean(roomId && liveTypingByRoom?.[roomId]);
}

function saveLiveTypingSettings() {
  localStorage.setItem(LIVE_TYPING_STORAGE_KEY, JSON.stringify(liveTypingByRoom || {}));
}

function toggleLearningTestMode() {
  const activeRoom = getActiveRoom();
  const language = getRoomLanguage(activeRoom);

  if (!isLearningTestAvailableForRoom(activeRoom)) {
    showToast("Modo indisponivel", "Defina um idioma na sala para testar seu aprendizado.");
    updateLearningTestButtonState(activeRoom);
    return;
  }

  learningTestByRoom[activeRoom.id] = !isLearningTestEnabledForRoom(activeRoom);
  if (!learningTestByRoom[activeRoom.id]) delete learningTestByRoom[activeRoom.id];

  saveLearningTestSettings();
  updateLearningTestButtonState(activeRoom);
  updateMessageInputPlaceholder(activeRoom);

  const enabled = isLearningTestEnabledForRoom(activeRoom);
  showToast(
    enabled ? "Teste ativado" : "Teste desativado",
    enabled
      ? `Escreva em ${language.label}. Eu envio como voce digitou e mostro a correcao no balao.`
      : "As proximas mensagens voltam ao envio normal."
  );
}

function isLearningTestAvailableForRoom(room = getActiveRoom()) {
  return Boolean(room && !isAiRoom(room) && getRoomLanguage(room)?.code);
}

function isLearningTestEnabledForRoom(room = getActiveRoom()) {
  return Boolean(room?.id && learningTestByRoom?.[room.id] && isLearningTestAvailableForRoom(room));
}

function updateLearningTestButtonState(room = getActiveRoom()) {
  if (!learningTestButton) return;

  const available = isLearningTestAvailableForRoom(room);
  const enabled = isLearningTestEnabledForRoom(room);
  const language = getRoomLanguage(room);
  const title = !room
    ? "Testar meu aprendizado"
    : !available
      ? "Defina um idioma na sala para testar seu aprendizado"
      : enabled
        ? `Desativar teste em ${language.label}`
        : `Testar meu aprendizado em ${language.label}`;

  learningTestButton.disabled = !available;
  learningTestButton.classList.toggle("is-active", enabled);
  learningTestButton.setAttribute("aria-pressed", String(enabled));
  learningTestButton.title = title;
  learningTestButton.setAttribute("aria-label", title);
}

function updateMessageInputPlaceholder(room = getActiveRoom()) {
  if (!messageInput || !room) return;

  if (messageEditTarget) {
    messageInput.placeholder = "Editando mensagem...";
    return;
  }

  const language = getRoomLanguage(room);
  if (isAiTeacherRoom(room)) {
    const focus = getActiveAiDifficulties(room)[0]?.text || "";
    messageInput.placeholder = focus
      ? `Treine comigo: ${focus}`
      : "Pergunte sobre ingles, espanhol, vocabulario, pronuncia...";
    return;
  }

  if (isAiFriendRoom(room)) {
    messageInput.placeholder = `Mensagem para ${getRoomDisplayName(room)}`;
    return;
  }

  if (isAiRoom(room)) {
    messageInput.placeholder = "Pergunte sobre ingles, espanhol, vocabulario, pronuncia...";
    return;
  }

  messageInput.placeholder = isLearningTestEnabledForRoom(room) && language?.code
    ? `Teste em ${language.label}: escreva uma frase`
    : "Digite uma mensagem";
}

function saveLearningTestSettings() {
  localStorage.setItem(LEARNING_TEST_STORAGE_KEY, JSON.stringify(learningTestByRoom || {}));
}


function getSafeChatTheme(value) {
  const theme = String(value || "").trim().toLowerCase();
  return CHAT_THEME_OPTION_MAP[theme] ? theme : DEFAULT_CHAT_THEME;
}

function getChatThemeOption(value) {
  return CHAT_THEME_OPTION_MAP[getSafeChatTheme(value)] || CHAT_THEME_OPTION_MAP[DEFAULT_CHAT_THEME];
}

function getChatThemeLabel(value) {
  return getChatThemeOption(value).label;
}

function saveChatTheme() {
  localStorage.setItem(CHAT_THEME_STORAGE_KEY, JSON.stringify(chatTheme));
}

function applyChatTheme(theme = chatTheme) {
  chatTheme = getSafeChatTheme(theme);
  const themeOption = getChatThemeOption(chatTheme);
  document.documentElement.dataset.chatTheme = chatTheme;
  document.body.dataset.chatTheme = chatTheme;

  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", themeOption.themeColor || "#0b8f6f");
  }
}

function handleProfileThemeSelectChange() {
  chatTheme = getSafeChatTheme(profileThemeSelect?.value || DEFAULT_CHAT_THEME);
  applyChatTheme(chatTheme);
  saveChatTheme();
  updateProfileSettingsPreview();
}

function openProfileSettingsModal() {
  if (!profileSettingsModal || !currentUser?.nick) return;

  profileNickInput.value = currentUser.nick || "";
  if (profileNativeLanguageSelect) profileNativeLanguageSelect.value = getCurrentNativeLanguage().code;
  if (profileThemeSelect) profileThemeSelect.value = getSafeChatTheme(chatTheme);
  selectProfileSpaceAvatar(currentUser.avatarIcon || DEFAULT_SPACE_AVATAR_ICON);
  updateProfileSettingsPreview();
  updateProfileNotificationsButtonState();
  updateInternalPushToggleState();
  updateProfileStorageUsage();
  profileSettingsModal.hidden = false;
  profileSettingsModal.setAttribute("aria-hidden", "false");
}

function closeProfileSettingsModal() {
  if (!profileSettingsModal) return;
  profileSettingsModal.hidden = true;
  profileSettingsModal.setAttribute("aria-hidden", "true");
}

async function handleProfileNotificationsButtonClick() {
  unlockNotificationSound();

  if (!profileNotificationsButton) return;

  const status = getBrowserNotificationStatus();
  if (status === "unsupported") {
    showToast("Notificações indisponíveis", "Este navegador não oferece notificações do sistema para este app.");
    updateProfileNotificationsButtonState();
    return;
  }

  if (status === "insecure") {
    showToast("Ambiente sem permissão", "Abra o app em HTTPS ou localhost para habilitar notificações.");
    updateProfileNotificationsButtonState();
    return;
  }

  if (status === "granted") {
    showToast("Notificações já ativadas", "O AstroChat já pode mostrar avisos deste navegador.");
    updateProfileNotificationsButtonState();
    return;
  }

  if (status === "denied") {
    showToast("Notificações bloqueadas", "Libere as notificações nas configurações do navegador para este site.");
    updateProfileNotificationsButtonState();
    return;
  }

  profileNotificationsButton.disabled = true;
  updateProfileNotificationsButtonState("Solicitando permissão...");

  const permission = await requestBrowserNotificationPermission();
  updateProfileNotificationsButtonState();

  if (permission === "granted") {
    showToast("Notificações ativadas", "Você receberá avisos de mensagens, convites e pedidos.");
  } else if (permission === "denied") {
    showToast("Permissão negada", "As notificações ficaram bloqueadas neste navegador.");
  } else {
    showToast("Permissão pendente", "Você pode habilitar as notificações por este botão quando quiser.");
  }
}

function getBrowserNotificationStatus() {
  if (!("Notification" in window)) return "unsupported";
  if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return "insecure";
  return Notification.permission;
}

async function handleProfileNotificationsButtonClickWithFcm() {
  unlockNotificationSound();

  if (!profileNotificationsButton) return;

  const status = getBrowserNotificationStatus();
  if (status === "unsupported") {
    showToast("Notificacoes indisponiveis", "Este navegador nao oferece notificacoes do sistema para este app.");
    updateProfileNotificationsButtonState();
    return;
  }

  if (status === "insecure") {
    showToast("Ambiente sem permissao", "Abra o app em HTTPS ou localhost para habilitar notificacoes.");
    updateProfileNotificationsButtonState();
    return;
  }

  if (status === "denied") {
    showToast("Notificacoes bloqueadas", "Libere as notificacoes nas configuracoes do navegador para este site.");
    updateProfileNotificationsButtonState();
    return;
  }

  if (status === "granted" && areSystemPushNotificationsEnabled() && hasSavedPrimarySystemPushRegistration()) {
    profileNotificationsButton.disabled = true;
    updateProfileNotificationsButtonState("Desativando push do sistema...");
    setSystemPushNotificationsEnabled(false, { updateUi: false });

    try {
      await unregisterFcmTokenForCurrentUser({ deleteBrowserToken: true });
      showToast("Push do sistema desativado", "Avisos internos, badges e lista de nao lidas continuam funcionando no app.");
    } catch (error) {
      console.warn("Nao foi possivel desativar o push do sistema.", error);
      showToast("Push desativado neste aparelho", "Nao consegui remover tudo do Firebase agora, mas este app ja esta silenciando o push do sistema.");
    } finally {
      updateProfileNotificationsButtonState();
    }
    return;
  }

  if (status === "granted") {
    profileNotificationsButton.disabled = true;
    updateProfileNotificationsButtonState("Registrando este navegador...");
    setSystemPushNotificationsEnabled(true);

    try {
      const registrationId = await ensureFcmTokenRegistration({ force: true, showErrors: true });
      showToast(
        registrationId ? "Push do sistema ativado" : "Permissao ativada",
        registrationId
          ? "Este navegador ja pode receber avisos mesmo com o app em segundo plano."
          : "O navegador permitiu notificacoes, mas ainda nao retornou um registro de push."
      );
    } catch (error) {
      const notice = getFcmRegistrationErrorNotice(error);
      console.warn("Nao foi possivel registrar FCM.", error);
      showToast(notice.title, notice.message);
    } finally {
      updateProfileNotificationsButtonState();
    }
    return;
  }

  profileNotificationsButton.disabled = true;
  updateProfileNotificationsButtonState("Solicitando permissao...");
  setSystemPushNotificationsEnabled(true);

  try {
    const permission = await requestBrowserNotificationPermission();

    if (permission === "granted") {
      updateProfileNotificationsButtonState("Registrando este navegador...");
      const registrationId = await ensureFcmTokenRegistration({ force: true, showErrors: true });
      showToast(
        registrationId ? "Push do sistema ativado" : "Permissao ativada",
        registrationId
          ? "Voce recebera avisos de mensagens mesmo com o app em segundo plano."
          : "O navegador permitiu notificacoes, mas ainda nao retornou um registro de push."
      );
    } else if (permission === "denied") {
      showToast("Permissao negada", "As notificacoes ficaram bloqueadas neste navegador.");
    } else {
      showToast("Permissao pendente", "Voce pode habilitar as notificacoes por este botao quando quiser.");
    }
  } catch (error) {
    const notice = getFcmRegistrationErrorNotice(error);
    console.warn("Nao foi possivel habilitar notificacoes FCM.", error);
    showToast(notice.title, notice.message);
  } finally {
    updateProfileNotificationsButtonState();
  }
}

function updateProfileNotificationsButtonState(statusOverride = "") {
  if (!profileNotificationsButton || !profileNotificationsStatus) return;

  const status = getBrowserNotificationStatus();
  const systemPushEnabled = areSystemPushNotificationsEnabled();
  const hasPushRegistration = hasSavedPrimarySystemPushRegistration();
  const labels = {
    unsupported: {
      title: "Notificações indisponíveis",
      detail: "Este navegador não oferece notificações do sistema.",
      icon: "fa-solid fa-bell-slash",
      disabled: true
    },
    insecure: {
      title: "Notificações indisponíveis",
      detail: "Use HTTPS ou localhost para pedir permissão.",
      icon: "fa-solid fa-lock",
      disabled: true
    },
    granted: {
      title: "Notificações ativadas",
      detail: "Mensagens, convites e pedidos podem gerar avisos.",
      icon: "fa-solid fa-bell",
      disabled: false
    },
    denied: {
      title: "Notificações bloqueadas",
      detail: "Libere nas configurações do navegador para este site.",
      icon: "fa-solid fa-bell-slash",
      disabled: false
    },
    default: {
      title: "Habilitar notificações",
      detail: "Clique para permitir avisos do AstroChat.",
      icon: "fa-solid fa-bell",
      disabled: false
    }
  };

  const config = { ...(labels[status] || labels.default) };
  const vapidKeyValidation = getStandardWebPushVapidKeyValidation();
  if (status === "granted" && !systemPushEnabled) {
    config.title = "Push do sistema desativado";
    config.detail = "Clique para ativar os avisos do navegador. Os avisos internos continuam no app.";
    config.icon = "fa-solid fa-bell-slash";
  } else if (status === "granted" && !vapidKeyValidation.valid) {
    config.title = "Web Push pendente";
    config.detail = vapidKeyValidation.message;
    config.icon = "fa-solid fa-bell";
  } else if (status === "granted" && hasPushRegistration) {
    config.title = "Push do sistema ativado";
    config.detail = "Este navegador esta registrado para Web Push.";
  } else if (status === "granted") {
    config.title = "Ativar push do sistema";
    config.detail = "Permissao concedida. Clique para registrar este navegador no Web Push.";
  }
  const icon = profileNotificationsButton.querySelector("i");
  const title = profileNotificationsButton.querySelector("strong");

  if (icon) icon.className = config.icon;
  if (title) title.textContent = config.title;
  profileNotificationsStatus.textContent = statusOverride || config.detail;
  profileNotificationsButton.disabled = Boolean(statusOverride) ? true : config.disabled;
  profileNotificationsButton.classList.toggle("is-enabled", status === "granted" && systemPushEnabled && hasPushRegistration);
  profileNotificationsButton.classList.toggle("is-blocked", status === "denied" || status === "unsupported" || status === "insecure" || (status === "granted" && !systemPushEnabled));
}

function areInternalPushNotificationsEnabled() {
  return internalPushNotificationsEnabled !== false;
}

function areSystemPushNotificationsEnabled() {
  return systemPushNotificationsEnabled !== false;
}

function toggleInternalPushNotifications() {
  const enabled = !areInternalPushNotificationsEnabled();
  setInternalPushNotificationsEnabled(enabled);

  if (!enabled) {
    dismissToast();
    return;
  }

  showToast(
    "Avisos internos ativados",
    "Mensagens e pedidos voltam a mostrar pop-ups dentro do app. O som do navegador continua separado."
  );
}

function setInternalPushNotificationsEnabled(enabled) {
  internalPushNotificationsEnabled = Boolean(enabled);
  localStorage.setItem(INTERNAL_PUSH_STORAGE_KEY, JSON.stringify(internalPushNotificationsEnabled));
  updateInternalPushToggleState();
  updateToastRegionVisibility();
}

function setSystemPushNotificationsEnabled(enabled, options = {}) {
  systemPushNotificationsEnabled = Boolean(enabled);
  localStorage.setItem(SYSTEM_PUSH_STORAGE_KEY, JSON.stringify(systemPushNotificationsEnabled));
  if (options.updateUi !== false) updateProfileNotificationsButtonState();
  syncSystemPushPreferenceToServiceWorker();
}

function syncSystemPushPreferenceToServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const message = {
    type: "SET_SYSTEM_PUSH_ENABLED",
    enabled: areSystemPushNotificationsEnabled()
  };

  try {
    navigator.serviceWorker.controller?.postMessage(message);
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.active?.postMessage(message);
        registration.waiting?.postMessage(message);
        registration.installing?.postMessage(message);
      })
      .catch((error) => {
        console.warn("Nao foi possivel sincronizar preferencia de push com o service worker.", error);
      });
  } catch (error) {
    console.warn("Nao foi possivel avisar o service worker sobre a preferencia de push.", error);
  }
}

function updateInternalPushToggleState() {
  updateToastRegionVisibility();
  if (!internalPushToggleButton || !internalPushToggleStatus) return;

  const enabled = areInternalPushNotificationsEnabled();
  const icon = internalPushToggleButton.querySelector("i");
  const title = internalPushToggleButton.querySelector("strong");

  internalPushToggleButton.setAttribute("aria-pressed", String(enabled));
  internalPushToggleButton.classList.toggle("is-enabled", enabled);
  internalPushToggleButton.classList.toggle("is-blocked", !enabled);

  if (icon) icon.className = enabled ? "fa-solid fa-toggle-on" : "fa-solid fa-toggle-off";
  if (title) title.textContent = enabled ? "Avisos internos ativados" : "Avisos internos desativados";
  internalPushToggleStatus.textContent = enabled
    ? "Mostra pop-ups dentro do app. O som do navegador continua ativo quando permitido."
    : "Oculta pop-ups internos, mas mantém badges, lista de não lidas e som do navegador.";
}

function updateToastRegionVisibility() {
  if (!toastRegion) return;

  const enabled = areInternalPushNotificationsEnabled();
  toastRegion.hidden = !enabled;
  toastRegion.setAttribute("aria-hidden", String(!enabled));
  toastRegion.classList.toggle("is-disabled", !enabled);

  if (!enabled) dismissToast();
}

async function saveProfileSettings(event) {
  event.preventDefault();
  if (!currentUser) return;

  const nextNick = sanitizeText(profileNickInput.value, 24);
  const nextAvatarIcon = getSelectedProfileSpaceAvatarIcon();
  const nextNativeLanguage = getSelectedNativeLanguage(profileNativeLanguageSelect?.value || getCurrentNativeLanguage().code);
  const nextTheme = getSafeChatTheme(profileThemeSelect?.value || chatTheme);

  if (!nextNick) {
    return;
  }

  const previousUser = { ...currentUser };
  const previousNick = currentUser.nick;
  const nickChanged = normalize(nextNick) !== normalize(previousNick);

  if (nickChanged) {
    if (!requireInternet("validar este nick")) return;

    try {
      await ensureFirebaseIdentity();
      await reserveNickForCurrentFirebaseUser(nextNick);
    } catch (error) {
      if (isNickTakenError(error)) {
        showToast("Nick em uso", "Escolha outro nick. Esse ja esta sendo usado por outro usuario.");
      } else {
        console.warn("Nao foi possivel validar o nick.", error);
        showToast("Nao consegui validar", "Verifique sua conexao e tente salvar novamente.");
      }
      return;
    }
  }

  currentUser = {
    ...currentUser,
    nick: nextNick,
    avatar: getInitials(nextNick),
    avatarIcon: nextAvatarIcon,
    nativeLanguageCode: nextNativeLanguage.code,
    nativeLanguageName: nextNativeLanguage.name,
    nativeLanguageLabel: nextNativeLanguage.label,
    updatedAt: Date.now()
  };

  chatTheme = nextTheme;
  applyChatTheme(chatTheme);
  saveChatTheme();

  saveUser(currentUser);
  updateUserHeader();
  ensureUserAiRoom();
  saveRemoteConversationCache();
  renderAll(true);

  try {
    if (firebaseReady && currentFirebaseUid && requireInternet("sincronizar perfil")) {
      await saveFirebaseUserProfile();
      await syncCurrentUserNameIntoLoadedRooms();
      registerFcmTokenIfNotificationGranted({ force: true });
    }
    showToast("Perfil atualizado", "Seu nick, ícone espacial e idioma nativo foram salvos.");
    closeProfileSettingsModal();
  } catch (error) {
    if (isNickTakenError(error)) {
      currentUser = previousUser;
      saveUser(currentUser);
      updateUserHeader();
      renderAll(true);
      showToast("Nick em uso", "Escolha outro nick. Esse ja esta sendo usado por outro usuario.");
      return;
    }

    console.warn("Não foi possível sincronizar perfil no Firebase.", error);
    showToast("Perfil salvo localmente", "Não consegui sincronizar agora, mas o perfil ficou salvo neste navegador.");
    closeProfileSettingsModal();
  }
}

async function syncCurrentUserNameIntoLoadedRooms() {
  if (!currentFirebaseUid || !currentUser?.nick || !remoteRooms.length) return;

  const updates = {};
  remoteRooms.forEach((room) => {
    if (room.memberUids?.includes(currentFirebaseUid) || room.memberNickMap?.[currentFirebaseUid]) {
      updates[`rooms/${room.id}/memberNicks/${currentFirebaseUid}`] = currentUser.nick;
      updates[`rooms/${room.id}/memberAvatarIcons/${currentFirebaseUid}`] = getSafeSpaceAvatarIcon(currentUser.avatarIcon);
    }
    if (room.ownerUid === currentFirebaseUid) {
      updates[`rooms/${room.id}/ownerNick`] = currentUser.nick;
      updates[`rooms/${room.id}/ownerAvatarIcon`] = getSafeSpaceAvatarIcon(currentUser.avatarIcon);
    }
  });

  if (Object.keys(updates).length) {
    await update(ref(db), updates);
  }
}

function updateProfileSettingsPreview() {
  if (!profilePreviewAvatar || !profilePreviewNick) return;

  const nick = sanitizeText(profileNickInput?.value || currentUser?.nick || "Astro", 24) || "Astro";
  const avatarIcon = getSelectedProfileSpaceAvatarIcon();

  const nativeLanguage = getSelectedNativeLanguage(profileNativeLanguageSelect?.value || getCurrentNativeLanguage().code);
  profilePreviewNick.textContent = nick;
  if (profilePreviewLanguage) profilePreviewLanguage.textContent = `Idioma nativo: ${nativeLanguage.label} • Tema: ${getChatThemeLabel(profileThemeSelect?.value || chatTheme)}`;
  profilePreviewAvatar.innerHTML = `<i class="${escapeHtml(avatarIcon)}" aria-hidden="true"></i>`;
  profilePreviewAvatar.style.background = getGradientByText(nick);
}

function getSelectedProfileSpaceAvatarIcon() {
  const selected = profileAvatarSelect?.value || profileAvatarInputs.find((input) => input.checked)?.value || DEFAULT_SPACE_AVATAR_ICON;
  return getSafeSpaceAvatarIcon(selected);
}

function selectProfileSpaceAvatar(iconClass) {
  const safeIcon = getSafeSpaceAvatarIcon(iconClass);
  if (profileAvatarSelect) profileAvatarSelect.value = safeIcon;
  profileAvatarInputs.forEach((input) => {
    input.checked = input.value === safeIcon;
  });
  updateProfileAvatarSelectPreview();
}

function updateProfileAvatarSelectPreview() {
  if (!profileAvatarSelectPreview) return;
  const icon = getSelectedProfileSpaceAvatarIcon();
  profileAvatarSelectPreview.innerHTML = `<i class="${escapeHtml(icon)}" aria-hidden="true"></i>`;
}

function loadUser() {
  try {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn("Não foi possível carregar o usuário salvo.", error);
    return null;
  }
}

function saveUser(user) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.warn(`Não foi possível carregar ${key}.`, error);
    return fallback;
  }
}

function saveRooms() {
  localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms.filter((room) => room.type === AI_ROOM_TYPE)));
}

function saveFriends() {
  localStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(friends));
}

function saveProcessedFriendRequests() {
  localStorage.setItem(PROCESSED_FRIEND_REQUESTS_STORAGE_KEY, JSON.stringify(processedFriendRequestIds));
}

function updateUserHeader(statusText = null) {
  if (!currentUser?.nick) return;

  paintAvatar(userAvatar, currentUser, currentUser.nick);
  userNick.textContent = currentUser.nick;
  userSubtitle.textContent = statusText || (!isInternetAvailable() ? "Offline" : firebaseReady ? "Online" : "Conectando...");
}

function renderAll(forceMessages = false) {
  ensureUserAiRoom();
  validateActiveRoom();
  updateBadges();
  renderCurrentView();
  renderActiveRoom(forceMessages);
}

function ensureUserAiRoom() {
  if (!currentUser?.nick) return null;

  const aiRoomId = getAiRoomId(currentUser.nick);
  let aiRoom = rooms.find((room) => room.id === aiRoomId);
  let changed = false;

  if (!aiRoom) {
    aiRoom = {
      id: aiRoomId,
      type: AI_ROOM_TYPE,
      aiMode: AI_TEACHER_MODE,
      name: AI_TEACHER_NAME,
      avatar: "IA",
      description: "Treine inglês, espanhol e outros idiomas com uma IA professora.",
      status: "Professor de idiomas · Pollinations.ai",
      color: "linear-gradient(135deg, #6d5dfc, #10b486)",
      ownerNick: currentUser.nick,
      members: [currentUser.nick, AI_TEACHER_NAME],
      aiDifficulties: [],
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    aiRoom.messages = [createAiWelcomeMessage(aiRoom)];
    rooms.push(aiRoom);
    changed = true;
  }

  const previousAiMode = aiRoom.aiMode;
  const previousDifficultiesSignature = JSON.stringify(aiRoom.aiDifficulties || []);
  aiRoom.aiMode = AI_TEACHER_MODE;
  aiRoom.aiDifficulties = normalizeAiDifficulties(aiRoom.aiDifficulties);
  if (previousAiMode !== AI_TEACHER_MODE || previousDifficultiesSignature !== JSON.stringify(aiRoom.aiDifficulties || [])) {
    changed = true;
  }

  if (!aiRoom.messages?.length) {
    aiRoom.messages = [createAiWelcomeMessage(aiRoom)];
    changed = true;
  }

  aiRoom.type = AI_ROOM_TYPE;
  aiRoom.name = AI_TEACHER_NAME;
  aiRoom.avatar = "IA";
  aiRoom.ownerNick = currentUser.nick;
  aiRoom.status = "Professor de idiomas · Pollinations.ai";
  aiRoom.color = "linear-gradient(135deg, #6d5dfc, #10b486)";

  if (!suppressAutoRoomSelection && (!activeRoomId || !getVisibleRooms().some((room) => room.id === activeRoomId))) {
    activeRoomId = aiRoom.id;
  }

  if (changed) saveRooms();
  return aiRoom;
}

function validateActiveRoom() {
  const visibleRooms = getVisibleRooms();
  if (activeRoomId && visibleRooms.some((room) => room.id === activeRoomId)) return;
  if (suppressAutoRoomSelection) {
    activeRoomId = null;
    return;
  }
  activeRoomId = ensureUserAiRoom()?.id || visibleRooms[0]?.id || null;
}

function updateBadges() {
  const pendingInvites = getPendingReceivedInvites().length;
  const unreadMessages = getTotalUnreadCount();
  const totalNotifications = pendingInvites + unreadMessages;

  if (roomsBadge) roomsBadge.textContent = getVisibleRooms().length;
  if (friendsBadge) friendsBadge.textContent = friends.length;
  if (invitesBadge) invitesBadge.textContent = pendingInvites;
  if (notificationBadge) {
    notificationBadge.textContent = totalNotifications > 99 ? "99+" : String(totalNotifications);
    notificationBadge.hidden = totalNotifications === 0;
  }
  if (notificationsButton) {
    notificationsButton.classList.toggle("has-pending", totalNotifications > 0);
    notificationsButton.title = totalNotifications
      ? `${totalNotifications} notificação${totalNotifications > 1 ? "es" : ""}: ${pendingInvites} convite${pendingInvites !== 1 ? "s" : ""}, ${unreadMessages} mensagem${unreadMessages !== 1 ? "s" : ""} não lida${unreadMessages !== 1 ? "s" : ""}`
      : "Pedidos e convites";
  }
  if (mobileNotificationBadge) {
    mobileNotificationBadge.textContent = totalNotifications > 99 ? "99+" : String(totalNotifications);
    mobileNotificationBadge.hidden = totalNotifications === 0;
  }
  if (mobileNotificationsButton) {
    mobileNotificationsButton.classList.toggle("has-pending", totalNotifications > 0);
    mobileNotificationsButton.title = notificationsButton?.title || "Notificacoes";
  }
  refreshNotificationsModalIfOpen();
}

function setActiveView(view) {
  if (view === "invites") {
    openNotificationsModal();
    return;
  }

  activeView = "rooms";
  renderCurrentView();
}

function renderCurrentView() {
  roomsTab?.classList.toggle("active", true);
  friendsTab?.classList.toggle("active", false);
  invitesTab?.classList.toggle("active", false);

  searchBox.hidden = false;
  chatList.hidden = false;
  if (friendsPanel) friendsPanel.hidden = true;
  if (invitesPanel) invitesPanel.hidden = true;

  renderRoomList(searchInput.value);
}

function openNotificationsModal() {
  renderUnreadNotificationsList();
  renderInvitesList();
  if (!notificationsModal) return;
  notificationsModal.hidden = false;
  notificationsModal.setAttribute("aria-hidden", "false");
}

function closeNotificationsModal() {
  if (!notificationsModal) return;
  notificationsModal.hidden = true;
  notificationsModal.setAttribute("aria-hidden", "true");
}

function refreshNotificationsModalIfOpen() {
  if (!notificationsModal || notificationsModal.hidden) return;

  renderUnreadNotificationsList();
  renderInvitesList();
}

function getVisibleRooms() {
  const currentNick = normalize(currentUser?.nick || "");
  const aiRooms = rooms.filter((room) => isAiRoom(room) && normalize(room.ownerNick) === currentNick);
  return [...aiRooms, ...remoteRooms];
}

function getActiveRoom() {
  const aiRoom = rooms.find((item) => item.id === activeRoomId) || null;
  if (aiRoom) {
    if (isAiRoom(aiRoom) && normalize(aiRoom.ownerNick) !== normalize(currentUser?.nick || "")) return null;
    return aiRoom;
  }

  const remoteRoom = remoteRooms.find((item) => item.id === activeRoomId) || null;
  if (!remoteRoom) return null;

  return {
    ...remoteRoom,
    messages: roomMessagesById.get(remoteRoom.id) || []
  };
}

function renderRoomList(filter = "") {
  chatList.innerHTML = "";

  const normalizedFilter = normalize(filter);
  const visibleRooms = getVisibleRooms();
  const filteredRooms = visibleRooms.filter((room) => matchesRoomSearch(room, normalizedFilter));

  if (!visibleRooms.length) {
    chatList.appendChild(createEmptyState(
      "fa-solid fa-door-open",
      "Nenhuma sala criada",
      "Use o botão Criar Sala para iniciar uma nova conversa."
    ));
    return;
  }

  if (!filteredRooms.length) {
    chatList.appendChild(createEmptyState(
      "fa-solid fa-magnifying-glass",
      "Nenhuma sala encontrada",
      "Tente pesquisar outro nome."
    ));
    return;
  }

  getRoomListGroups(filteredRooms).forEach((group) => {
    chatList.appendChild(createRoomListSection(group));
  });
}

function matchesRoomSearch(room, normalizedFilter) {
  if (!normalizedFilter) return true;
  return getRoomSearchText(room).includes(normalizedFilter);
}

function getRoomSearchText(room) {
  return normalize([
    getRoomDisplayName(room),
    room?.name,
    getRoomDescription(room),
    room?.description,
    room?.ownerNick,
    room?.lastMessage,
    room?.lastOriginalMessage,
    room?.lastMessageAuthorNick,
    ...(room?.memberNicks || []),
    ...(room?.members || []),
    ...Object.values(room?.memberNickMap || {}),
    ...(room?.invitedNicks || [])
  ].filter(Boolean).join(" "));
}

function getRoomListGroups(roomList) {
  const sortedRooms = roomList.slice().sort(sortRoomsForList);
  const pinnedRooms = sortedRooms.filter((room) => isConversationPinned(room.id));
  const unpinnedRooms = sortedRooms.filter((room) => !isConversationPinned(room.id));
  return [
    {
      key: "pinned",
      title: "Fixadas",
      icon: "fa-solid fa-thumbtack",
      rooms: pinnedRooms
    },
    {
      key: "assistant",
      title: "Professor IA",
      icon: "fa-solid fa-language",
      rooms: unpinnedRooms.filter((room) => isAiTeacherRoom(room))
    },
    {
      key: "ai-friends",
      title: "Amigos IA",
      icon: "fa-solid fa-robot",
      rooms: unpinnedRooms.filter((room) => isAiFriendRoom(room))
    },
    {
      key: "private",
      title: "Conversas privadas",
      icon: "fa-solid fa-comment",
      rooms: unpinnedRooms.filter((room) => !isAiRoom(room) && isPrivateRoom(room))
    },
    {
      key: "rooms",
      title: "Salas",
      icon: "fa-solid fa-door-open",
      rooms: unpinnedRooms.filter((room) => !isAiRoom(room) && !isPrivateRoom(room))
    }
  ].filter((group) => group.rooms.length);
}

function sortRoomsForList(a, b) {
  const pinnedDifference = Number(isConversationPinned(b?.id)) - Number(isConversationPinned(a?.id));
  if (pinnedDifference) return pinnedDifference;

  const timeDifference = getLastTime(b) - getLastTime(a);
  if (timeDifference) return timeDifference;

  return getRoomDisplayName(a).localeCompare(getRoomDisplayName(b), "pt-BR", { sensitivity: "base" });
}

function createRoomListSection(group) {
  const section = document.createElement("section");
  const header = document.createElement("div");
  const list = document.createElement("div");

  section.className = `chat-list-section ${group.key}-section`;
  header.className = "chat-list-section-header";
  header.innerHTML = `
    <span><i class="${group.icon}" aria-hidden="true"></i>${escapeHtml(group.title)}</span>
    <small>${group.rooms.length}</small>
  `;
  list.className = "chat-list-section-items";

  group.rooms.forEach((room) => {
    list.appendChild(createRoomListItem(room));
  });

  section.append(header, list);
  return section;
}

function createRoomListItem(room) {
  const item = roomItemTemplate.content.firstElementChild.cloneNode(true);
  const avatar = item.querySelector(".avatar");
  const name = item.querySelector(".chat-name");

  item.dataset.roomId = room.id;
  item.classList.toggle("active", room.id === activeRoomId);
  item.classList.toggle("ai-room", isAiRoom(room));
  item.classList.toggle("ai-friend-room", isAiFriendRoom(room));
  item.classList.toggle("private-room", isPrivateRoom(room));
  item.classList.toggle("group-room", !isAiRoom(room) && !isPrivateRoom(room));
  item.classList.toggle("is-pinned", isConversationPinned(room.id));
  paintRoomAvatar(avatar, room);
  name.textContent = getRoomDisplayName(room);
  updateRoomItemContent(item, room);

  item.addEventListener("click", () => {
    if (roomListContextMenuRoomId === room.id) return;
    openRoom(room);
  });

  setupRoomListLongPress(item, room);

  return item;
}

function openRoom(room) {
  if (!room?.id) return;
  closeRoomListContextMenu();
  setMessageSelectionMode(false, { keepRender: true });
  cancelMessageEdit();
  clearCurrentTypingStatus();
  activeRoomId = room.id;
  suppressAutoRoomSelection = false;
  markRoomAsRead(room);
  clearReplyTarget();
  forceMessageRerender(room.id);
  subscribeToActiveRoomMessages();
  renderRoomList(searchInput.value);
  renderActiveRoom(true);
  appShell.classList.add("chat-open");
}

function setupRoomListLongPress(item, room) {
  if (!item || !room?.id) return;

  const start = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (roomListLongPressTimer) window.clearTimeout(roomListLongPressTimer);
    roomListLongPressTimer = window.setTimeout(() => {
      roomListLongPressTimer = null;
      openRoomListContextMenu(room, item);
    }, 520);
  };

  const cancel = () => {
    if (roomListLongPressTimer) {
      window.clearTimeout(roomListLongPressTimer);
      roomListLongPressTimer = null;
    }
  };

  item.addEventListener("pointerdown", start);
  item.addEventListener("pointerup", cancel);
  item.addEventListener("pointerleave", cancel);
  item.addEventListener("pointercancel", cancel);
  item.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    openRoomListContextMenu(room, item);
  });
}

function openRoomListContextMenu(room, item) {
  if (!room?.id) return;

  closeRoomListContextMenu();
  roomListContextMenuRoomId = room.id;
  item?.classList.add("context-selected");

  const menu = document.createElement("div");
  menu.className = "room-list-context-menu";
  menu.setAttribute("role", "menu");
  menu.dataset.roomId = room.id;

  const pinLabel = isConversationPinned(room.id) ? "Desafixar" : "Fixar";
  const buttons = [
    createRoomListContextButton(isConversationPinned(room.id) ? "fa-solid fa-thumbtack-slash" : "fa-solid fa-thumbtack", pinLabel, () => toggleRoomPin(room))
  ];

  if (!isAiTeacherRoom(room)) {
    const deleteLabel = isAiFriendRoom(room) ? "Excluir amigo IA" : isRoomOwner(room) ? "Excluir sala" : "Remover da lista";
    buttons.push(createRoomListContextButton("fa-solid fa-trash-can", deleteLabel, () => deleteOrLeaveRoomFromList(room), "danger"));
  }

  menu.append(...buttons);

  document.body.appendChild(menu);
  positionFloatingMenu(menu, item);
}

function createRoomListContextButton(iconClass, label, onClick, tone = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "menuitem");
  if (tone) button.classList.add(tone);
  button.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i><span>${escapeHtml(label)}</span>`;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    closeRoomListContextMenu();
    onClick();
  });
  return button;
}

function closeRoomListContextMenu() {
  document.querySelectorAll(".room-list-context-menu").forEach((menu) => menu.remove());
  document.querySelectorAll(".chat-item.context-selected").forEach((item) => item.classList.remove("context-selected"));
  roomListContextMenuRoomId = "";
}

function toggleRoomPin(room) {
  if (!room?.id) return;

  if (isConversationPinned(room.id)) {
    pinnedConversationIds.delete(room.id);
    showToast("Conversa desafixada", `${getRoomDisplayName(room)} saiu do topo.`);
  } else {
    pinnedConversationIds.add(room.id);
    showToast("Conversa fixada", `${getRoomDisplayName(room)} ficou no topo da lista.`);
  }

  savePinnedConversations();
  if (activeRoomId === room.id) updateRoomPinButtonState(room);
  renderRoomList(searchInput.value);
}

async function deleteOrLeaveRoomFromList(room) {
  if (!room) return;

  if (isAiFriendRoom(room)) {
    deleteAiFriendRoom(room);
    return;
  }

  if (isAiRoom(room)) return;

  if (isRoomOwner(room)) {
    await deleteActiveRoomForEveryone(room);
  } else {
    await leaveActiveRoom(room);
  }
}


function renderActiveRoom(forceMessages = false) {
  const activeRoom = getActiveRoom();

  const hasRoom = Boolean(activeRoom);
  chatHeader.hidden = !hasRoom;
  messages.hidden = !hasRoom;
  messageForm.hidden = !hasRoom;
  if (typingPreviewPanel && !hasRoom) typingPreviewPanel.hidden = true;
  emptyChatPanel.hidden = hasRoom;

  if (!activeRoom) {
    messages.innerHTML = "";
    messages.dataset.roomId = "";
    updateConversationSearchButton(null);
    closeMessageSearchPanel();
    updateLearningTestButtonState(null);
    setMessageSelectionMode(false, { keepRender: true });
    cancelMessageEdit();
    return;
  }

  const isAi = isAiRoom(activeRoom);
  activeRoomId = activeRoom.id;
  paintRoomAvatar(activeAvatar, activeRoom);
  activeName.textContent = getRoomDisplayName(activeRoom);
  activeStatus.textContent = getRoomStatus(activeRoom);
  updateConversationSearchButton(activeRoom);
  syncMessageSearchRoom(activeRoom.id);
  if (isRoomCurrentlyVisible(activeRoom.id)) {
    markRoomAsRead(activeRoom);
  }
  renderReplyPreview();
  const isPrivate = isPrivateRoom(activeRoom);
  inviteButton.hidden = isAi || isPrivate;
  if (letterButton) letterButton.hidden = !isPrivate;
  roomMenuButton.hidden = false;
  updateLiveTypingButtonState();
  subscribeToActiveRoomTyping();
  if (clearChatButton) {
    clearChatButton.hidden = true;
    clearChatButton.title = isAi ? "Reiniciar conversa" : "Limpar conversa deste chat";
    clearChatButton.setAttribute("aria-label", isAi ? "Reiniciar conversa" : "Limpar conversa deste chat");
  }
  updateMessageInputPlaceholder(activeRoom);
  updateLearningTestButtonState(activeRoom);
  updateMessageSelectionToolbar();

  if (forceMessages || messages.dataset.roomId !== activeRoom.id) {
    messages.innerHTML = "";
    messages.dataset.roomId = activeRoom.id;
    renderedMessageIdsByRoom.set(activeRoom.id, new Set());
  }

  renderRoomMessages(activeRoom);
  scheduleReceiptSyncForActiveRoom();
}

async function closeMobileConversationToMenu() {
  appShell.classList.remove("chat-open");

  if (!isMobileLayout()) return;

  await clearCurrentTypingStatus();
  activeRoomId = null;
  suppressAutoRoomSelection = true;
  clearReplyTarget();
  cancelMessageEdit();
  setMessageSelectionMode(false, { keepRender: true });
  subscribeToActiveRoomMessages();
  renderRoomList(searchInput.value);
  renderActiveRoom(true);
}

function renderRoomMessages(room) {
  if (!room) return;

  const roomMessages = (room.messages || []).slice().sort(compareMessagesBySendOrder);
  let renderedIds = renderedMessageIdsByRoom.get(room.id);

  if (!renderedIds) {
    renderedIds = new Set();
    renderedMessageIdsByRoom.set(room.id, renderedIds);
  }

  removeLiveTypingRows();

  if (!roomMessages.length) {
    messages.innerHTML = "";
    renderedIds.clear();
    renderEmptyConversation();
    renderTypingPreviewPanel();
    updateMessageSearchResults();
    scheduleReceiptSyncForActiveRoom();
    return;
  }

  const emptyState = messages.querySelector(".empty-state");
  if (emptyState) emptyState.remove();

  const wasNearBottom = isMessagesNearBottom();
  const previousOrder = Array.from(messages.querySelectorAll(".message-row[data-message-id]"))
    .map((row) => row.dataset.messageId || "")
    .join("|");
  const desiredIds = new Set();
  const desiredOrder = [];

  roomMessages.forEach((message) => {
    message.id = message.id || createId("msg");
    desiredIds.add(message.id);
    desiredOrder.push(message.id);
  });

  Array.from(messages.querySelectorAll(".message-row[data-message-id]")).forEach((row) => {
    const messageId = row.dataset.messageId || "";
    if (!desiredIds.has(messageId)) {
      row.remove();
      renderedIds.delete(messageId);
    }
  });

  const isFirstBatch = renderedIds.size === 0;
  const fragment = document.createDocumentFragment();
  let changedCount = 0;

  roomMessages.forEach((message, index) => {
    const messageId = message.id;
    const previousMessage = roomMessages[index - 1] || null;
    const groupedWithPrevious = shouldGroupMessageWithPrevious(previousMessage, message);
    const signature = `${getMessageSignature(message)}|group:${groupedWithPrevious ? "1" : "0"}`;
    let element = messages.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);

    if (!element || element.dataset.signature !== signature) {
      if (element) element.remove();
      element = createMessageElement(message, !renderedIds.has(messageId), { groupedWithPrevious, roomId: room.id });
      element.dataset.signature = signature;
      changedCount += 1;
    }

    fragment.appendChild(element);
    renderedIds.add(messageId);
  });

  messages.appendChild(fragment);

  renderTypingPreviewPanel();
  updateMessageSearchResults();
  scheduleReceiptSyncForActiveRoom();
  schedulePendingTranslationResumeForRoom(room);
  schedulePendingLearningAnalysisForRoom(room);

  const nextOrder = desiredOrder.join("|");
  if ((changedCount || previousOrder !== nextOrder) && (isFirstBatch || wasNearBottom)) {
    scheduleMessagesScrollToBottom();
  }
}

function addMessage(roomId, message) {
  const room = rooms.find((item) => item.id === roomId);
  if (!room) return;

  message.id = message.id || createId("msg");
  room.messages.push(message);
  room.updatedAt = message.time;
  saveRooms();

  if (room.id === activeRoomId) {
    renderRoomMessages(room);
    updateRoomItemAfterNewMessage(room);
    return;
  }

  renderRoomList(searchInput.value);
}

function addLocalAiMessage(room, options = {}) {
  if (!room?.id) return null;

  const sourceText = cleanMessageText(options.text || "");
  if (!sourceText) return null;

  const language = getRoomLanguage(room);
  const presetOriginalText = cleanMessageText(options.originalText || sourceText, 2000);
  const presetTranslatedText = cleanMessageText(options.translatedText || "", 1000);
  const hasPresetTranslation = Boolean(
    isAiFriendRoom(room) &&
    language?.code &&
    presetOriginalText &&
    presetTranslatedText
  );
  const shouldTranslate = Boolean(isAiFriendRoom(room) && language?.code && !options.skipTranslation && !hasPresetTranslation);
  const now = Number(options.time || 0) || Date.now();
  const message = {
    id: options.id || createId("msg"),
    from: options.from || "ai",
    author: options.author || getAiAuthorName(room),
    text: hasPresetTranslation ? presetTranslatedText : shouldTranslate ? PUBLIC_TRANSLATION_PENDING_TEXT : sourceText,
    originalText: hasPresetTranslation ? presetOriginalText : "",
    translatedText: hasPresetTranslation ? presetTranslatedText : "",
    translationProvider: hasPresetTranslation ? "Pollinations.AI" : "",
    aiProvider: sanitizeText(options.aiProvider || "", 32),
    translationSourceText: shouldTranslate ? sourceText : "",
    targetLanguageCode: shouldTranslate || hasPresetTranslation ? language.code || "" : "",
    targetLanguageName: shouldTranslate || hasPresetTranslation ? language.name || "" : "",
    translationDisabled: false,
    translationStatus: hasPresetTranslation ? "done" : shouldTranslate ? "pending" : "none",
    translationError: false,
    deliveryStatus: shouldTranslate ? "processing" : "sent",
    pendingOffline: false,
    localPending: false,
    localOnly: true,
    processingType: shouldTranslate ? MESSAGE_PROCESSING_TRANSLATION : "",
    replyTo: options.replyTo || null,
    time: now,
    createdAtMillis: now
  };

  addMessage(room.id, message);

  if (shouldTranslate) {
    translateLocalAiMessage(room.id, message.id, sourceText, language);
  }

  return message;
}

async function translateLocalAiMessage(roomId, messageId, sourceText, language) {
  const cleanSourceText = cleanMessageText(sourceText, 2000);
  if (!roomId || !messageId || !cleanSourceText || !language?.code) return;

  try {
    const translationResult = await translateMessageTextResult(cleanSourceText, language, {
      onProgress: (partialText) => updateLocalAiMessage(roomId, messageId, { text: partialText })
    });
    const translated = cleanMessageText(translationResult.text, 1000);
    if (!translated) throw new Error("Traducao vazia.");

    const hasTranslation = translated !== cleanSourceText;
    updateLocalAiMessage(roomId, messageId, {
      text: hasTranslation ? translated : cleanSourceText,
      originalText: hasTranslation ? cleanSourceText : "",
      translatedText: hasTranslation ? translated : "",
      translationProvider: hasTranslation ? translationResult.provider : "",
      translationSourceText: "",
      translationStatus: "done",
      translationError: false,
      deliveryStatus: "sent",
      processingType: ""
    });
  } catch (error) {
    console.warn("Nao foi possivel traduzir mensagem local de IA.", error);
    updateLocalAiMessage(roomId, messageId, {
      text: PUBLIC_TRANSLATION_ERROR_TEXT,
      originalText: "",
      translatedText: "",
      translationSourceText: cleanSourceText,
      translationStatus: "error",
      translationError: true,
      deliveryStatus: "sent",
      processingType: ""
    });
  }
}

function updateLocalAiMessage(roomId, messageId, patch = {}) {
  const room = rooms.find((item) => item.id === roomId);
  if (!room?.messages?.length || !messageId) return;

  let changed = false;
  room.messages = room.messages.map((message) => {
    if (message.id !== messageId) return message;
    changed = true;
    return { ...message, ...patch };
  });

  if (!changed) return;

  room.updatedAt = Date.now();
  saveRooms();
  if (room.id === activeRoomId) {
    renderRoomMessages(room);
    updateRoomItemAfterNewMessage(room);
  } else {
    renderRoomList(searchInput.value);
  }
}

function applyBundledLocalAiTranslation(room, messageId, originalText, translatedText, language = getRoomLanguage(room)) {
  const cleanOriginal = cleanMessageText(originalText, 2000);
  const cleanTranslated = cleanMessageText(translatedText, 1000);
  if (!room?.id || !messageId || !language?.code || !cleanOriginal || !cleanTranslated || cleanOriginal === cleanTranslated) return false;

  updateLocalAiMessage(room.id, messageId, {
    text: cleanTranslated,
    originalText: cleanOriginal,
    translatedText: cleanTranslated,
    translationProvider: "Pollinations.AI",
    translationSourceText: "",
    targetLanguageCode: language.code || "",
    targetLanguageName: language.name || "",
    translationDisabled: false,
    translationStatus: "done",
    translationError: false,
    deliveryStatus: "sent",
    pendingOffline: false,
    processingType: ""
  });
  return true;
}

function markLocalAiTranslationUnavailable(room, messageId, sourceText, language = getRoomLanguage(room)) {
  const cleanSourceText = cleanMessageText(sourceText, 2000);
  if (!room?.id || !messageId || !language?.code || !cleanSourceText) return false;

  updateLocalAiMessage(room.id, messageId, {
    translationSourceText: cleanSourceText,
    targetLanguageCode: language.code || "",
    targetLanguageName: language.name || "",
    translationDisabled: false,
    translationStatus: "error",
    translationError: true,
    deliveryStatus: "sent",
    pendingOffline: false,
    processingType: ""
  });
  return true;
}

async function sendFirebaseMessage(room, text, options = {}) {
  if (!requireFirebaseConnection("enviar mensagem")) {
    throw new Error("Sem internet ou Firebase desconectado.");
  }

  if (!firebaseReady || !currentFirebaseUid) {
    throw new Error("Firebase ainda não conectado.");
  }

  const now = Date.now();
  const createdAtMillis = Number(options.createdAtMillis || 0) || now;
  const cleanText = cleanMessageText(text);
  const publicText = cleanMessageText(options.publicText || "");
  const translationSourceText = cleanMessageText(options.translationSourceText || cleanText);
  const language = getRoomLanguage(room);
  const skipTranslation = Boolean(options.skipTranslation);
  const learningTest = Boolean(options.learningTest);
  const learningFeedback = normalizeLearningFeedback(options.learningFeedback);
  const shouldDeferOriginalText = Boolean(options.deferOriginalUntilTranslated);
  const presetOriginalText = shouldDeferOriginalText ? "" : cleanMessageText(options.originalText || "");
  const presetTranslatedText = cleanMessageText(options.translatedText || "");
  const hasPresetTranslation = Boolean(presetOriginalText && presetTranslatedText && presetOriginalText !== presetTranslatedText);
  const shouldTranslateInBackground = Boolean(language?.code && !skipTranslation && !hasPresetTranslation);
  const translationStatus = options.translationStatus || (hasPresetTranslation ? "done" : shouldTranslateInBackground ? "pending" : "none");
  const translationDisabled = options.translationDisabled !== undefined ? Boolean(options.translationDisabled) : skipTranslation;
  const processingType = getSafeMessageProcessingType(options.processingType);
  const learningFeedbackStatus = sanitizeText(
    options.learningFeedbackStatus || (learningFeedback ? "done" : (learningTest && processingType === MESSAGE_PROCESSING_LEARNING_TEST ? "pending" : "")),
    24
  );
  const displayText = publicText || cleanText;
  const deliveryStatus = sanitizeText(options.deliveryStatus || "sent", 24) || "sent";
  const mentionPayload = options.mentionPayload || extractMessageMentions(cleanText, room);
  const replyPayload = options.replyPayload !== undefined ? options.replyPayload : getReplyPayloadForMessage();
  const messageId = options.messageId || push(ref(db, `rooms/${room.id}/messages`)).key;
  const message = {
    id: messageId,
    text: displayText,
    originalText: presetOriginalText,
    translatedText: presetTranslatedText,
    translationProvider: sanitizeText(options.translationProvider || (hasPresetTranslation ? "Pollinations.AI" : ""), 32),
    aiProvider: sanitizeText(options.aiProvider || "", 32),
    targetLanguageCode: options.targetLanguageCode || language?.code || "",
    targetLanguageName: options.targetLanguageName || language?.name || "",
    learningTest,
    learningFeedbackStatus,
    translationDisabled,
    translationError: Boolean(options.translationError),
    translationStatus,
    deliveryStatus,
    pendingOffline: false,
    localPending: false,
    localOnly: false,
    processingType,
    mentionedUids: mentionPayload.mentionedUids,
    mentionedNicks: mentionPayload.mentionedNicks,
    mentions: mentionPayload.mentions,
    authorUid: currentFirebaseUid,
    authorNick: currentUser?.nick || "Você",
    authorAvatar: currentUser?.avatar || getInitials(currentUser?.nick || "Você"),
    authorAvatarIcon: getSafeSpaceAvatarIcon(currentUser?.avatarIcon),
    time: createdAtMillis,
    createdAt: serverTimestamp(),
    createdAtMillis
  };

  const letter = normalizeLetterPayload(options.letter);
  if (letter) message.letter = letter;
  const letterLocationRequest = normalizeLetterLocationRequest(options.letterLocationRequest);
  if (letterLocationRequest) message.letterLocationRequest = letterLocationRequest;

  if (options.forwarded) {
    message.forwarded = true;
    message.forwardedAt = serverTimestamp();
    message.forwardedAtMillis = createdAtMillis;
    message.forwardedByUid = currentFirebaseUid;
    message.forwardedByNick = currentUser?.nick || "VocÃª";
    message.forwardedFromRoomId = sanitizeNotificationRoomId(options.forwardedFromRoomId || "");
    message.forwardedFromRoomName = sanitizeText(options.forwardedFromRoomName || "", 80);
    message.forwardedOriginalMessageId = sanitizeMessageLocalId(options.forwardedOriginalMessageId || "");
    message.forwardedOriginalAuthorNick = sanitizeText(options.forwardedOriginalAuthorNick || "", 48);
  }

  if (learningFeedback) {
    message.learningFeedback = learningFeedback;
  }

  if (replyPayload) {
    message.replyTo = replyPayload;
  }

  const localMessage = {
    ...message,
    deliveryStatus: deliveryStatus === "processing" ? "processing" : "sending",
    pendingOffline: false,
    localPending: true,
    localOnly: true
  };

  if (shouldTranslateInBackground) {
    localMessage.translationSourceText = translationSourceText;
    upsertPendingTranslationJob(room, localMessage, translationSourceText, language);
  }
  syncLocalSentFirebaseMessage(room, localMessage, {
    displayText,
    originalText: presetOriginalText,
    sentAt: createdAtMillis
  });
  clearReplyTarget();
  markRoomAsRead(room);

  const updates = {
    [`rooms/${room.id}/messages/${messageId}`]: message,
    [`rooms/${room.id}/lastMessage`]: displayText,
    [`rooms/${room.id}/lastMessageId`]: messageId,
    [`rooms/${room.id}/lastOriginalMessage`]: presetOriginalText,
    [`rooms/${room.id}/lastMessageAuthorUid`]: currentFirebaseUid,
    [`rooms/${room.id}/lastMessageAuthorNick`]: message.authorNick,
    [`rooms/${room.id}/lastMessageMentionedUids`]: mentionPayload.mentionedUids,
    [`rooms/${room.id}/lastMessageMentionedNicks`]: mentionPayload.mentionedNicks,
    [`rooms/${room.id}/lastMessageAt`]: serverTimestamp(),
    [`rooms/${room.id}/lastMessageAtMillis`]: createdAtMillis,
    [`rooms/${room.id}/updatedAt`]: serverTimestamp(),
    [`rooms/${room.id}/updatedAtMillis`]: createdAtMillis
  };

  try {
    await update(ref(db), updates);
    notifyPushWorkerAboutMessage(room, message);
  } catch (error) {
    queueOfflineMessageFromMessage(room, message, {
      replyPayload,
      skipTranslation,
      learningTest,
      learningFeedback,
      mentionPayload
    });
    throw error;
  }

  syncLocalSentFirebaseMessage(room, message, {
    displayText,
    originalText: presetOriginalText,
    sentAt: createdAtMillis
  });

  if (shouldTranslateInBackground) {
    startTranslationResumeJob(room, {
      ...message,
      text: translationSourceText,
      originalText: translationSourceText,
      translationSourceText
    }, language, translationSourceText);
  }

  return message;
}

async function notifyPushWorker(payload = {}, eventLabel = "evento") {
  const endpoint = String(PUSH_WORKER_ENDPOINT || "").trim();
  if (!endpoint || !payload || typeof payload !== "object") return null;
  if (!currentFirebaseUser?.getIdToken) return null;

  try {
    const idToken = await currentFirebaseUser.getIdToken(false);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), PUSH_WORKER_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ ...payload, idToken }),
        signal: controller.signal
      });

      const result = await response.json().catch(async () => ({
        ok: false,
        details: await response.text().catch(() => "")
      }));

      if (!response.ok || result?.ok === false) {
        console.warn(`[AstroChat Push] Worker recusou ${eventLabel}.`, {
          status: response.status,
          eventType: payload.type || payload.eventType || "",
          result
        });
        updatePushWorkerConsoleStatus("error", { status: response.status, result });
        return result;
      }

      const sent = Number(result?.sent || 0);
      const failed = Number(result?.failed || 0);
      const skipped = String(result?.skipped || "");
      const eventType = String(result?.eventType || payload.type || payload.eventType || "");

      if (sent > 0) {
        console.info(
          `%c[AstroChat Push] ${eventLabel} enviado pelo Cloudflare Worker.`,
          "color:#10b486;font-weight:800",
          { eventType, sent, failed, result }
        );
        updatePushWorkerConsoleStatus("online", { status: response.status, result });
      } else if (failed > 0) {
        console.error(
          `[AstroChat Push] Worker online, mas o FCM rejeitou ${eventLabel}.`,
          { eventType, sent, failed, errors: result?.errors || [], result }
        );
        updatePushWorkerConsoleStatus("delivery-error", { status: response.status, result });
      } else {
        console.info(
          `%c[AstroChat Push] Worker processou ${eventLabel}; nenhum push precisou ser enviado.`,
          "color:#0ea5e9;font-weight:800",
          { eventType, sent, failed, skipped, result }
        );
        updatePushWorkerConsoleStatus("online", { status: response.status, result });
      }

      return result;
    } finally {
      window.clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      console.warn(`[AstroChat Push] Worker demorou para processar ${eventLabel}.`);
      updatePushWorkerConsoleStatus("timeout", { error: String(error?.message || error) });
      return null;
    }

    console.warn(`[AstroChat Push] Nao foi possivel enviar ${eventLabel} ao Worker.`, error);
    updatePushWorkerConsoleStatus("offline", { error: String(error?.message || error) });
    return null;
  }
}

function notifyPushWorkerAboutMessage(room, message) {
  if (!room?.id || !message?.id) return Promise.resolve(null);
  return notifyPushWorker({
    type: "chat-message",
    roomId: room.id,
    messageId: message.id
  }, "push de mensagem");
}

function notifyPushWorkerAboutInvite(invite = {}) {
  if (!invite?.id) return Promise.resolve(null);
  const type = isFriendRequestInvite(invite) ? "friend-request" : "room-invite";
  const label = type === "friend-request"
    ? "push de pedido de amizade"
    : "push de convite para sala";

  return notifyPushWorker({
    type,
    inviteId: invite.id
  }, label);
}

function getPushWorkerHealthEndpoint() {
  const endpoint = String(PUSH_WORKER_ENDPOINT || "").trim();
  if (!endpoint) return "";

  try {
    const url = new URL(endpoint, window.location.href);
    url.pathname = url.pathname.replace(/\/notify\/?$/i, "/health");
    if (!url.pathname.endsWith("/health")) {
      url.pathname = `${url.pathname.replace(/\/+$/g, "")}/health`;
    }
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch (error) {
    return "";
  }
}

function updatePushWorkerConsoleStatus(status, details = {}) {
  window.__ASTROCHAT_PUSH_WORKER_STATUS__ = {
    status,
    checkedAt: new Date().toISOString(),
    endpoint: PUSH_WORKER_ENDPOINT,
    ...details
  };
}

async function checkPushWorkerHealth() {
  const healthEndpoint = getPushWorkerHealthEndpoint();
  if (!healthEndpoint) {
    console.warn("[AstroChat Push] PUSH_WORKER_ENDPOINT nao foi configurado.");
    updatePushWorkerConsoleStatus("not-configured");
    return false;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), PUSH_WORKER_HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(healthEndpoint, {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store",
      signal: controller.signal
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result?.ok !== true) {
      console.warn("[AstroChat Push] Worker respondeu, mas o health check falhou.", {
        status: response.status,
        result
      });
      updatePushWorkerConsoleStatus("error", { status: response.status, result });
      return false;
    }

    if (result.ready === false) {
      console.warn(
        "[AstroChat Push] Cloudflare Worker esta online, mas faltam configuracoes/secrets.",
        result
      );
      updatePushWorkerConsoleStatus("online-not-ready", { status: response.status, result });
      return false;
    }

    const requiredEvents = ["chat-message", "friend-request", "room-invite"];
    const supportedEvents = Array.isArray(result.supportedEvents) ? result.supportedEvents : [];
    const missingEvents = requiredEvents.filter((eventType) => !supportedEvents.includes(eventType));
    if (missingEvents.length) {
      console.warn(
        "[AstroChat Push] Worker online, mas esta desatualizado para alguns tipos de notificacao.",
        { missingEvents, result }
      );
      updatePushWorkerConsoleStatus("online-outdated", { status: response.status, result, missingEvents });
      return false;
    }

    console.info(
      "%c[AstroChat Push] Cloudflare Worker online e configurado.",
      "color:#10b486;font-weight:800",
      result
    );
    updatePushWorkerConsoleStatus("online", { status: response.status, result });
    return true;
  } catch (error) {
    const reason = error?.name === "AbortError" ? "timeout" : "offline";
    console.warn(
      `[AstroChat Push] Health check do Worker falhou (${reason}). Confira URL, deploy e ALLOWED_ORIGIN.`,
      error
    );
    updatePushWorkerConsoleStatus(reason, { error: String(error?.message || error) });
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function syncLocalSentFirebaseMessage(room, message, { displayText = "", originalText = "", sentAt = Date.now() } = {}) {
  if (!room?.id || !message?.id) return;

  const messagesForRoom = upsertRoomMessage(room.id, message);
  const currentRoom = remoteRoomMap.get(room.id) || room;
  const updatedRoom = {
    ...currentRoom,
    lastMessage: displayText || message.text || message.translatedText || "",
    lastMessageId: message.id,
    lastOriginalMessage: originalText,
    lastMessageAuthorUid: message.authorUid || currentFirebaseUid || "",
    lastMessageAuthorNick: message.authorNick || currentUser?.nick || "Voce",
    lastMessageMentionedUids: normalizeMentionUidMap(message.mentionedUids),
    lastMessageMentionedNicks: normalizeMentionNickList(message.mentionedNicks),
    lastMessageAt: sentAt,
    updatedAt: sentAt,
    messages: messagesForRoom
  };

  remoteRoomMap.set(room.id, updatedRoom);
  remoteRooms = Array.from(remoteRoomMap.values());
  saveRemoteConversationCache();

  if (activeRoomId === room.id) {
    renderRoomMessages(updatedRoom);
  }

  renderRoomList(searchInput.value);
}

function upsertRoomMessage(roomId, message) {
  const currentMessages = roomMessagesById.get(roomId) || [];
  const existingIndex = currentMessages.findIndex((item) => item.id === message.id);
  const nextMessages = existingIndex >= 0
    ? currentMessages.map((item, index) => index === existingIndex ? { ...item, ...message } : item)
    : [...currentMessages, message];

  nextMessages.sort(compareMessagesBySendOrder);
  roomMessagesById.set(roomId, nextMessages);
  return nextMessages;
}

function mergeQueuedMessagesForRoom(roomId, remoteMessages = []) {
  const queuedIds = new Set(offlineMessageQueue.filter((item) => item.roomId === roomId).map((item) => item.localId));
  const remoteIds = new Set(remoteMessages.map((message) => message.id));
  const localPendingMessages = (roomMessagesById.get(roomId) || [])
    .filter((message) => !remoteIds.has(message.id) && shouldKeepLocalPendingMessage(roomId, message, queuedIds));
  const mergedMessages = localPendingMessages.length
    ? [...remoteMessages, ...localPendingMessages].sort(compareMessagesBySendOrder)
    : remoteMessages;

  return attachLocalTranslationJobsToMessages(roomId, mergedMessages);
}

function shouldKeepLocalPendingMessage(roomId, message, queuedIds = null) {
  if (!roomId || !message?.id) return false;
  const queueIds = queuedIds || new Set(offlineMessageQueue.filter((item) => item.roomId === roomId).map((item) => item.localId));
  if (queueIds.has(message.id)) return true;
  if (!isMessageMine(message)) return false;
  if (message.localPending || message.localOnly || message.pendingOffline) return true;

  const status = String(message.deliveryStatus || "");
  if (["queued", "sending", "processing", "failed"].includes(status)) return true;
  if (getSafeMessageProcessingType(message.processingType)) return true;

  return false;
}

function isConversationPinned(roomId) {
  return Boolean(roomId && pinnedConversationIds.has(roomId));
}

function savePinnedConversations() {
  localStorage.setItem(PINNED_CONVERSATIONS_STORAGE_KEY, JSON.stringify(Array.from(pinnedConversationIds)));
}

function toggleActiveRoomPin() {
  const activeRoom = getActiveRoom();
  if (!activeRoom) return;

  if (isConversationPinned(activeRoom.id)) {
    pinnedConversationIds.delete(activeRoom.id);
    showToast("Conversa desafixada", `${getRoomDisplayName(activeRoom)} saiu do topo.`);
  } else {
    pinnedConversationIds.add(activeRoom.id);
    showToast("Conversa fixada", `${getRoomDisplayName(activeRoom)} ficou no topo da lista.`);
  }

  savePinnedConversations();
  updateRoomPinButtonState(activeRoom);
  renderRoomList(searchInput.value);
}

function updateRoomPinButtonState(room = getActiveRoom()) {
  if (!roomSettingsPinButton) return;

  const available = Boolean(room);
  const pinned = available && isConversationPinned(room.id);
  roomSettingsPinButton.hidden = !available;
  roomSettingsPinButton.classList.toggle("is-active", Boolean(pinned));
  roomSettingsPinButton.setAttribute("aria-pressed", String(Boolean(pinned)));

  const span = roomSettingsPinButton.querySelector("span");
  const small = roomSettingsPinButton.querySelector("small");
  const icon = roomSettingsPinButton.querySelector("i");
  if (span) span.textContent = pinned ? "Desafixar" : "Fixar";
  if (small) small.textContent = "Conversa";
  if (icon) icon.className = pinned ? "fa-solid fa-thumbtack-slash" : "fa-solid fa-thumbtack";
  roomSettingsPinButton.title = pinned ? "Desafixar conversa" : "Fixar conversa no topo";
}


function getSafeMessageProcessingType(value) {
  const type = String(value || "").trim();
  if (type === MESSAGE_PROCESSING_TRANSLATION || type === MESSAGE_PROCESSING_LEARNING_TEST) return type;
  return "";
}

function getQueuedMessageProcessingType(item, room) {
  const explicitType = getSafeMessageProcessingType(item?.processingType);
  if (explicitType) return explicitType;
  if (item?.learningTest && !item?.learningFeedback) return MESSAGE_PROCESSING_LEARNING_TEST;
  if (!item?.skipTranslation && getQueuedTargetLanguage(item, room)?.code) return MESSAGE_PROCESSING_TRANSLATION;
  return "";
}

function getQueuedTargetLanguage(item, room) {
  const queuedCode = sanitizeText(item?.targetLanguageCode || "", 16);
  const roomLanguage = getRoomLanguage(room);
  if (queuedCode) return getLanguageOption(queuedCode) || roomLanguage;
  return roomLanguage;
}

function queueMessageForBackgroundProcessing(room, text, processingType, options = {}) {
  if (!room?.id || isAiRoom(room)) return null;

  const safeProcessingType = getSafeMessageProcessingType(processingType);
  const cleanText = cleanMessageText(text);
  if (!safeProcessingType || !cleanText) return null;

  const createdAtMillis = Number(options.createdAtMillis || 0) || Date.now();
  const localId = sanitizeMessageLocalId(options.messageId || options.localId || createId("queued-msg"));
  const targetLanguage = options.targetLanguage || getRoomLanguage(room);
  const mentionPayload = options.mentionPayload || extractMessageMentions(cleanText, room);
  const replyPayload = options.replyPayload !== undefined ? options.replyPayload : getReplyPayloadForMessage();
  const isLearningProcessing = safeProcessingType === MESSAGE_PROCESSING_LEARNING_TEST;
  const isTranslationProcessing = safeProcessingType === MESSAGE_PROCESSING_TRANSLATION;
  const message = {
    id: localId,
    text: isTranslationProcessing ? PUBLIC_TRANSLATION_PENDING_TEXT : cleanText,
    originalText: isTranslationProcessing ? cleanText : "",
    translatedText: "",
    targetLanguageCode: targetLanguage?.code || "",
    targetLanguageName: targetLanguage?.name || "",
    learningTest: isLearningProcessing || Boolean(options.learningTest),
    learningFeedbackStatus: isLearningProcessing ? "pending" : "",
    translationDisabled: isLearningProcessing || Boolean(options.skipTranslation),
    translationStatus: safeProcessingType === MESSAGE_PROCESSING_TRANSLATION ? "pending" : "none",
    translationError: false,
    deliveryStatus: "processing",
    pendingOffline: Boolean(options.pendingOffline),
    localPending: true,
    localOnly: true,
    processingType: safeProcessingType,
    mentionedUids: mentionPayload.mentionedUids,
    mentionedNicks: mentionPayload.mentionedNicks,
    mentions: mentionPayload.mentions,
    replyTo: replyPayload,
    authorUid: currentFirebaseUid || getCachedCurrentUserUidForRoom(room) || "",
    authorNick: currentUser?.nick || "Você",
    authorAvatar: currentUser?.avatar || getInitials(currentUser?.nick || "Você"),
    authorAvatarIcon: getSafeSpaceAvatarIcon(currentUser?.avatarIcon),
    from: "me",
    time: createdAtMillis,
    createdAtMillis
  };

  queueOfflineMessageFromMessage(room, message, {
    replyPayload,
    skipTranslation: Boolean(options.skipTranslation),
    learningTest: message.learningTest,
    processingType: safeProcessingType,
    deliveryStatus: "processing",
    pendingOffline: Boolean(options.pendingOffline),
    mentionPayload,
    targetLanguage
  });
  clearReplyTarget();
  return message;
}

function normalizeOfflineMessageQueue(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && item.roomId && item.text)
    .map((item) => ({
      localId: sanitizeMessageLocalId(item.localId || createId("offline-msg")),
      roomId: sanitizeNotificationRoomId(item.roomId),
      text: cleanMessageText(item.text),
      createdAtMillis: Number(item.createdAtMillis || item.time || Date.now()),
      replyTo: item.replyTo || null,
      skipTranslation: Boolean(item.skipTranslation),
      learningTest: Boolean(item.learningTest),
      learningFeedback: normalizeLearningFeedback(item.learningFeedback),
      processingType: getSafeMessageProcessingType(item.processingType),
      targetLanguageCode: sanitizeText(item.targetLanguageCode || "", 16),
      targetLanguageName: sanitizeText(item.targetLanguageName || "", 48),
      targetLanguageLabel: sanitizeText(item.targetLanguageLabel || "", 48),
      mentionPayload: {
        mentionedUids: normalizeMentionUidMap(item.mentionPayload?.mentionedUids || item.mentionedUids),
        mentionedNicks: normalizeMentionNickList(item.mentionPayload?.mentionedNicks || item.mentionedNicks),
        mentions: normalizeMentions(item.mentionPayload?.mentions || item.mentions)
      }
    }))
    .filter((item, index, list) => list.findIndex((candidate) => candidate.localId === item.localId) === index)
    .slice(-100);
}

function sanitizeMessageLocalId(value) {
  return String(value || createId("offline-msg")).replace(/[.#$\[\]/]/g, "-").slice(0, 160);
}

function saveOfflineMessageQueue() {
  offlineMessageQueue = normalizeOfflineMessageQueue(offlineMessageQueue);
  localStorage.setItem(OFFLINE_MESSAGE_QUEUE_STORAGE_KEY, JSON.stringify(offlineMessageQueue));
  updateUserHeader();
  renderRoomList(searchInput?.value || "");
  renderActiveRoom(false);
}

function getOfflineQueueCountForRoom(roomId) {
  if (!roomId) return 0;
  return offlineMessageQueue.filter((item) => item.roomId === roomId).length;
}

function queueOfflineMessage(room, text, options = {}) {
  if (!room?.id || isAiRoom(room)) return null;

  const cleanText = cleanMessageText(text);
  if (!cleanText) return null;

  const createdAtMillis = Number(options.createdAtMillis || 0) || Date.now();
  const localId = sanitizeMessageLocalId(options.messageId || options.localId || createId("offline-msg"));
  const processingType = getSafeMessageProcessingType(options.processingType);
  const isTranslationProcessing = processingType === MESSAGE_PROCESSING_TRANSLATION;
  const mentionPayload = options.mentionPayload || extractMessageMentions(cleanText, room);
  const replyPayload = options.replyPayload !== undefined ? options.replyPayload : getReplyPayloadForMessage();
  const message = {
    id: localId,
    text: isTranslationProcessing ? PUBLIC_TRANSLATION_PENDING_TEXT : cleanText,
    originalText: isTranslationProcessing ? cleanText : "",
    translatedText: "",
    targetLanguageCode: getRoomLanguage(room)?.code || "",
    targetLanguageName: getRoomLanguage(room)?.name || "",
    learningTest: Boolean(options.learningTest),
    translationDisabled: Boolean(options.skipTranslation),
    translationStatus: processingType === MESSAGE_PROCESSING_TRANSLATION || (getRoomLanguage(room)?.code && !options.skipTranslation) ? "pending" : "none",
    deliveryStatus: processingType ? "processing" : "queued",
    pendingOffline: options.pendingOffline !== undefined ? Boolean(options.pendingOffline) : true,
    localPending: true,
    localOnly: true,
    processingType,
    mentionedUids: mentionPayload.mentionedUids,
    mentionedNicks: mentionPayload.mentionedNicks,
    mentions: mentionPayload.mentions,
    replyTo: replyPayload,
    authorUid: currentFirebaseUid || getCachedCurrentUserUidForRoom(room) || "",
    authorNick: currentUser?.nick || "Você",
    authorAvatar: currentUser?.avatar || getInitials(currentUser?.nick || "Você"),
    authorAvatarIcon: getSafeSpaceAvatarIcon(currentUser?.avatarIcon),
    from: "me",
    time: createdAtMillis,
    createdAtMillis
  };

  queueOfflineMessageFromMessage(room, message, {
    replyPayload,
    skipTranslation: Boolean(options.skipTranslation),
    learningTest: Boolean(options.learningTest),
    learningFeedback: normalizeLearningFeedback(options.learningFeedback),
    processingType,
    deliveryStatus: processingType ? "processing" : "queued",
    pendingOffline: options.pendingOffline !== undefined ? Boolean(options.pendingOffline) : true,
    targetLanguage: getRoomLanguage(room),
    mentionPayload
  });
  clearReplyTarget();
  return message;
}

function queueOfflineMessageFromMessage(room, message, options = {}) {
  if (!room?.id || !message?.id) return;

  const processingType = getSafeMessageProcessingType(options.processingType || message.processingType);
  const queuedMessage = {
    ...message,
    deliveryStatus: options.deliveryStatus || (processingType ? "processing" : "queued"),
    pendingOffline: options.pendingOffline !== undefined ? Boolean(options.pendingOffline) : true,
    localPending: true,
    localOnly: true,
    processingType,
    from: "me"
  };

  syncLocalSentFirebaseMessage(room, queuedMessage, {
    displayText: queuedMessage.text || queuedMessage.originalText || "",
    originalText: queuedMessage.originalText || "",
    sentAt: Number(queuedMessage.createdAtMillis || queuedMessage.time || Date.now())
  });

  const queueItem = createOfflineQueueItemFromMessage(room, queuedMessage, options);

  offlineMessageQueue = [
    ...offlineMessageQueue.filter((item) => item.localId !== queueItem.localId),
    queueItem
  ];
  saveOfflineMessageQueue();
}

function createOfflineQueueItemFromMessage(room, message, options = {}) {
  const processingType = getSafeMessageProcessingType(options.processingType || message.processingType);
  const targetLanguage = options.targetLanguage || getRoomLanguage(room);

  return {
    localId: sanitizeMessageLocalId(message.id),
    roomId: room.id,
    text: cleanMessageText(message.originalText || message.text || ""),
    createdAtMillis: Number(message.createdAtMillis || message.time || Date.now()),
    replyTo: options.replyPayload !== undefined ? options.replyPayload : message.replyTo || null,
    skipTranslation: Boolean(options.skipTranslation || message.translationDisabled),
    learningTest: Boolean(options.learningTest || message.learningTest),
    learningFeedback: normalizeLearningFeedback(options.learningFeedback || message.learningFeedback),
    processingType,
    targetLanguageCode: targetLanguage?.code || message.targetLanguageCode || "",
    targetLanguageName: targetLanguage?.name || message.targetLanguageName || "",
    targetLanguageLabel: targetLanguage?.label || message.targetLanguageLabel || "",
    mentionPayload: options.mentionPayload || {
      mentionedUids: normalizeMentionUidMap(message.mentionedUids),
      mentionedNicks: normalizeMentionNickList(message.mentionedNicks),
      mentions: normalizeMentions(message.mentions)
    }
  };
}

async function flushOfflineMessageQueue() {
  if (offlineQueueFlushInProgress || !offlineMessageQueue.length) return;
  if (!firebaseReady || !currentFirebaseUid || !isInternetAvailable()) return;

  offlineQueueFlushInProgress = true;
  const queuedItems = [...offlineMessageQueue];

  try {
    for (const item of queuedItems) {
      if (!offlineMessageQueue.some((queued) => queued.localId === item.localId)) continue;

      const room = getVisibleRooms().find((candidate) => candidate.id === item.roomId) || remoteRoomMap.get(item.roomId);
      if (!room) continue;

      const processingType = getQueuedMessageProcessingType(item, room);
      const isProcessingBeforePublish = Boolean(processingType);

      updateQueuedLocalMessage(item.roomId, item.localId, {
        deliveryStatus: isProcessingBeforePublish ? "processing" : "sending",
        pendingOffline: false,
        localPending: true,
        localOnly: true,
        processingType,
        learningFeedbackStatus: processingType === MESSAGE_PROCESSING_LEARNING_TEST ? "pending" : "",
        translationStatus: processingType === MESSAGE_PROCESSING_TRANSLATION ? "pending" : undefined
      });

      try {
        if (isProcessingBeforePublish) {
          await processQueuedMessageBeforePublishing(room, item, processingType);
        } else {
          await sendFirebaseMessage(room, item.text, {
            messageId: item.localId,
            createdAtMillis: item.createdAtMillis,
            replyPayload: item.replyTo || null,
            skipTranslation: Boolean(item.skipTranslation),
            translationDisabled: Boolean(item.learningTest),
            learningTest: item.learningTest,
            learningFeedback: item.learningFeedback,
            mentionPayload: item.mentionPayload,
            fromOfflineQueue: true
          });
        }

        offlineMessageQueue = offlineMessageQueue.filter((queued) => queued.localId !== item.localId);
        localStorage.setItem(OFFLINE_MESSAGE_QUEUE_STORAGE_KEY, JSON.stringify(offlineMessageQueue));
      } catch (error) {
        console.warn("Mensagem pendente ainda nao foi concluida.", item.localId, error);
        updateQueuedLocalMessage(item.roomId, item.localId, {
          deliveryStatus: isProcessingBeforePublish ? "processing" : "queued",
          pendingOffline: !isInternetAvailable(),
          localPending: true,
          localOnly: true,
          processingType,
          learningFeedbackStatus: processingType === MESSAGE_PROCESSING_LEARNING_TEST ? "pending" : "",
          translationStatus: processingType === MESSAGE_PROCESSING_TRANSLATION ? "pending" : undefined
        });
        break;
      }
    }
  } finally {
    offlineQueueFlushInProgress = false;
    saveOfflineMessageQueue();
  }
}

function getLearningAnalysisJobKey(roomId, messageId) {
  return `${sanitizeNotificationRoomId(roomId)}:${sanitizeMessageLocalId(messageId)}`;
}

function getLearningAnalysisSourceText(message) {
  return cleanMessageText(message?.originalText || message?.text || message?.translatedText || getMessageAudioText(message), 2000);
}

async function analyzeMessageWriting(message) {
  const activeRoom = getActiveRoom();
  if (!activeRoom || isAiRoom(activeRoom) || !message?.id) return;
  if (!wasMessageSentWithLearningTest(message)) {
    showToast("Análise indisponível", "A opção Analisar só aparece em mensagens enviadas com Testar meu aprendizado ativo.");
    return;
  }
  if (isLearningAnalysisPending(message)) return;
  if (!requireFirebaseConnection("analisar esta mensagem")) return;

  const sourceText = getLearningAnalysisSourceText(message);
  if (!sourceText) {
    showToast("Sem texto", "Não encontrei texto para analisar nesse balão.");
    return;
  }

  const pendingMessage = {
    ...message,
    text: message.text || sourceText,
    learningTest: true,
    learningFeedback: null,
    learningFeedbackStatus: "pending",
    translationDisabled: true,
    deliveryStatus: "sent",
    pendingOffline: false,
    processingType: MESSAGE_PROCESSING_LEARNING_TEST
  };

  try {
    await update(ref(db), {
      [`rooms/${activeRoom.id}/messages/${message.id}/learningTest`]: true,
      [`rooms/${activeRoom.id}/messages/${message.id}/learningFeedback`]: null,
      [`rooms/${activeRoom.id}/messages/${message.id}/learningFeedbackStatus`]: "pending",
      [`rooms/${activeRoom.id}/messages/${message.id}/translationDisabled`]: true,
      [`rooms/${activeRoom.id}/messages/${message.id}/deliveryStatus`]: "sent",
      [`rooms/${activeRoom.id}/messages/${message.id}/pendingOffline`]: false,
      [`rooms/${activeRoom.id}/messages/${message.id}/processingType`]: MESSAGE_PROCESSING_LEARNING_TEST
    });

    updateQueuedLocalMessage(activeRoom.id, message.id, pendingMessage);

    startLearningFeedbackJob(activeRoom, pendingMessage, sourceText);
    showToast("Analisando texto", "A IA vai verificar ortografia, gramática e uso natural.");
  } catch (error) {
    console.error("Nao foi possivel iniciar a analise da mensagem.", error);
    showToast("Falha ao analisar", "Verifique sua conexão e tente novamente.");
  }
}

function startLearningFeedbackJob(room, message, sourceText = "") {
  if (!room?.id || !message?.id) return;
  const cleanSourceText = cleanMessageText(sourceText || getLearningAnalysisSourceText(message), 2000);
  if (!cleanSourceText) return;

  const key = getLearningAnalysisJobKey(room.id, message.id);
  if (pendingLearningAnalysisKeys.has(key)) return;

  pendingLearningAnalysisKeys.add(key);
  analyzeFirebaseMessageLearning(room, {
    ...message,
    text: message.text || cleanSourceText,
    learningTest: true,
    learningFeedbackStatus: "pending",
    translationDisabled: true,
    deliveryStatus: "sent",
    processingType: MESSAGE_PROCESSING_LEARNING_TEST
  }, cleanSourceText).finally(() => {
    pendingLearningAnalysisKeys.delete(key);
  });
}

async function analyzeFirebaseMessageLearning(room, message, sourceText = "") {
  const cleanSourceText = cleanMessageText(sourceText || getLearningAnalysisSourceText(message), 2000);
  if (!room?.id || !message?.id || !cleanSourceText) return;

  try {
    if (!isInternetAvailable()) throw new Error("Sem internet para analisar.");

    const feedbackResult = await checkLearningTestWriting(cleanSourceText, room);
    const learningFeedback = await createLearningFeedbackFromResult(cleanSourceText, feedbackResult, room);
    const updatedMessage = {
      ...message,
      text: message.text || cleanSourceText,
      learningTest: true,
      learningFeedback: learningFeedback || null,
      learningFeedbackStatus: "done",
      aiProvider: feedbackResult.provider || "",
      translationDisabled: true,
      deliveryStatus: "sent",
      pendingOffline: false,
      processingType: ""
    };

    await update(ref(db), {
      [`rooms/${room.id}/messages/${message.id}/learningTest`]: true,
      [`rooms/${room.id}/messages/${message.id}/learningFeedback`]: learningFeedback || null,
      [`rooms/${room.id}/messages/${message.id}/learningFeedbackStatus`]: "done",
      [`rooms/${room.id}/messages/${message.id}/aiProvider`]: updatedMessage.aiProvider,
      [`rooms/${room.id}/messages/${message.id}/translationDisabled`]: true,
      [`rooms/${room.id}/messages/${message.id}/deliveryStatus`]: "sent",
      [`rooms/${room.id}/messages/${message.id}/pendingOffline`]: false,
      [`rooms/${room.id}/messages/${message.id}/processingType`]: null
    });

    updateQueuedLocalMessage(room.id, message.id, updatedMessage);
  } catch (error) {
    console.warn("Nao foi possivel concluir a analise de aprendizado.", error);
    const failedMessage = {
      ...message,
      learningTest: true,
      learningFeedbackStatus: "error",
      translationDisabled: true,
      deliveryStatus: "sent",
      pendingOffline: !isInternetAvailable(),
      processingType: ""
    };

    updateQueuedLocalMessage(room.id, message.id, failedMessage);

    if (firebaseReady && isInternetAvailable()) {
      try {
        await update(ref(db), {
          [`rooms/${room.id}/messages/${message.id}/learningTest`]: true,
          [`rooms/${room.id}/messages/${message.id}/learningFeedbackStatus`]: "error",
          [`rooms/${room.id}/messages/${message.id}/translationDisabled`]: true,
          [`rooms/${room.id}/messages/${message.id}/deliveryStatus`]: "sent",
          [`rooms/${room.id}/messages/${message.id}/pendingOffline`]: false,
          [`rooms/${room.id}/messages/${message.id}/processingType`]: null
        });
      } catch (updateError) {
        console.warn("Nao foi possivel marcar erro de analise no Firebase.", updateError);
      }
    }
  }
}

async function processQueuedMessageBeforePublishing(room, item, processingType) {
  if (!room?.id || !item?.localId) return;

  if (!isInternetAvailable()) throw new Error("Sem internet para concluir processamento.");

  if (processingType === MESSAGE_PROCESSING_LEARNING_TEST) {
    const sentMessage = await sendFirebaseMessage(room, item.text, {
      messageId: item.localId,
      createdAtMillis: item.createdAtMillis,
      replyPayload: item.replyTo || null,
      skipTranslation: true,
      translationDisabled: true,
      learningTest: true,
      learningFeedbackStatus: "pending",
      deliveryStatus: "sent",
      processingType: MESSAGE_PROCESSING_LEARNING_TEST,
      mentionPayload: item.mentionPayload,
      fromOfflineQueue: true
    });

    startLearningFeedbackJob(room, sentMessage, item.text);
    return;
  }

  if (processingType === MESSAGE_PROCESSING_TRANSLATION) {
    const language = getQueuedTargetLanguage(item, room);
    const originalText = cleanMessageText(item.text);

    if (!language?.code) {
      await sendFirebaseMessage(room, originalText, {
        messageId: item.localId,
        createdAtMillis: item.createdAtMillis,
        replyPayload: item.replyTo || null,
        skipTranslation: true,
        translationDisabled: false,
        mentionPayload: item.mentionPayload,
        fromOfflineQueue: true
      });
      return;
    }

    const existingMessageSnapshot = await get(ref(db, `rooms/${room.id}/messages/${item.localId}`));
    if (existingMessageSnapshot.exists()) {
      const existingMessage = mapMessageData(item.localId, existingMessageSnapshot.val());
      if (isPendingTranslationMessage(existingMessage)) {
        startTranslationResumeJob(room, {
          ...existingMessage,
          text: originalText,
          originalText,
          translationSourceText: originalText
        }, language, originalText);
        return;
      }
    }

    await sendFirebaseMessage(room, originalText, {
      messageId: item.localId,
      createdAtMillis: item.createdAtMillis,
      replyPayload: item.replyTo || null,
      publicText: PUBLIC_TRANSLATION_PENDING_TEXT,
      translationSourceText: originalText,
      deferOriginalUntilTranslated: true,
      skipTranslation: false,
      translationDisabled: false,
      translationStatus: "pending",
      translationError: false,
      deliveryStatus: "processing",
      processingType: MESSAGE_PROCESSING_TRANSLATION,
      targetLanguageCode: language.code || "",
      targetLanguageName: language.name || "",
      mentionPayload: item.mentionPayload,
      fromOfflineQueue: true
    });
  }
}

function updateQueuedLocalMessage(roomId, messageId, patch) {
  if (!roomId || !messageId) return;
  const currentMessages = roomMessagesById.get(roomId) || [];
  const currentMessage = currentMessages.find((message) => message.id === messageId);
  if (!currentMessage) return;

  const cleanPatch = Object.fromEntries(Object.entries(patch || {}).filter(([, value]) => value !== undefined));
  upsertRoomMessage(roomId, { ...currentMessage, ...cleanPatch });
  const room = remoteRoomMap.get(roomId);
  if (room) {
    remoteRoomMap.set(roomId, {
      ...room,
      messages: roomMessagesById.get(roomId) || []
    });
    remoteRooms = Array.from(remoteRoomMap.values());
  }

  if (activeRoomId === roomId) {
    forceMessageRerender(roomId);
    renderActiveRoom(true);
  }

  saveRemoteConversationCache();
}

function markLocalMessageSendFailure(roomId, reason = "") {
  const queuedIds = new Set(offlineMessageQueue.filter((item) => item.roomId === roomId).map((item) => item.localId));
  const messagesForRoom = roomMessagesById.get(roomId) || [];
  const sendingMessages = messagesForRoom.filter((message) => message.deliveryStatus === "sending" && !queuedIds.has(message.id));

  sendingMessages.forEach((message) => {
    upsertRoomMessage(roomId, {
      ...message,
      deliveryStatus: "failed",
      deliveryError: reason || "Falha no envio"
    });
  });

  if (sendingMessages.length && activeRoomId === roomId) {
    forceMessageRerender(roomId);
    renderActiveRoom(true);
  }
}

function getCachedCurrentUserUidForRoom(room) {
  if (!room || !currentUser?.nick) return "";
  const normalizedNick = normalize(currentUser.nick);
  return Object.entries(room.memberNickMap || {}).find(([, nick]) => normalize(nick) === normalizedNick)?.[0] || "";
}


function normalizePendingTranslationJobs(value) {
  const rawJobs = Array.isArray(value) ? value : Object.values(value || {});

  return rawJobs
    .filter((job) => job && job.roomId && job.messageId)
    .map((job) => {
      const roomId = sanitizeNotificationRoomId(job.roomId);
      const messageId = sanitizeMessageLocalId(job.messageId);
      const sourceText = cleanMessageText(job.sourceText || job.text || job.translationSourceText || "", 2000);
      return {
        key: getPendingTranslationJobKey(roomId, messageId),
        roomId,
        messageId,
        sourceText,
        targetLanguageCode: sanitizeText(job.targetLanguageCode || "", 16),
        targetLanguageName: sanitizeText(job.targetLanguageName || "", 48),
        targetLanguageLabel: sanitizeText(job.targetLanguageLabel || "", 48),
        authorUid: sanitizeText(job.authorUid || "", 160),
        createdAtMillis: Number(job.createdAtMillis || job.time || Date.now()),
        savedAt: Number(job.savedAt || Date.now())
      };
    })
    .filter((job) => job.roomId && job.messageId && job.sourceText && job.sourceText !== PUBLIC_TRANSLATION_PENDING_TEXT)
    .filter((job, index, list) => list.findIndex((candidate) => candidate.key === job.key) === index)
    .slice(-120);
}

function getPendingTranslationJobKey(roomId, messageId) {
  return `${sanitizeNotificationRoomId(roomId)}:${sanitizeMessageLocalId(messageId)}`;
}

function savePendingTranslationJobs() {
  pendingTranslationJobs = normalizePendingTranslationJobs(pendingTranslationJobs);
  localStorage.setItem(PENDING_TRANSLATION_JOBS_STORAGE_KEY, JSON.stringify(pendingTranslationJobs));
}

function getPendingTranslationJob(roomId, messageId) {
  const key = getPendingTranslationJobKey(roomId, messageId);
  return pendingTranslationJobs.find((job) => job.key === key) || null;
}

function upsertPendingTranslationJob(room, message, sourceText, language = null) {
  if (!room?.id || !message?.id || !isMessageMine(message)) return null;

  const cleanSourceText = cleanMessageText(sourceText || message.translationSourceText || message.originalText || "", 2000);
  if (!cleanSourceText || cleanSourceText === PUBLIC_TRANSLATION_PENDING_TEXT) return null;

  const targetLanguage = language || getRoomLanguage(room) || getLanguageOption(message.targetLanguageCode || "");
  const job = {
    key: getPendingTranslationJobKey(room.id, message.id),
    roomId: room.id,
    messageId: message.id,
    sourceText: cleanSourceText,
    targetLanguageCode: targetLanguage?.code || message.targetLanguageCode || "",
    targetLanguageName: targetLanguage?.name || message.targetLanguageName || "",
    targetLanguageLabel: targetLanguage?.label || "",
    authorUid: message.authorUid || currentFirebaseUid || "",
    createdAtMillis: Number(message.createdAtMillis || message.time || Date.now()),
    savedAt: Date.now()
  };

  pendingTranslationJobs = [
    ...pendingTranslationJobs.filter((item) => item.key !== job.key),
    job
  ];
  savePendingTranslationJobs();
  return job;
}

function removePendingTranslationJob(roomId, messageId) {
  const key = getPendingTranslationJobKey(roomId, messageId);
  const previousLength = pendingTranslationJobs.length;
  pendingTranslationJobs = pendingTranslationJobs.filter((job) => job.key !== key);
  pendingTranslationResumeKeys.delete(key);
  if (pendingTranslationJobs.length !== previousLength) {
    savePendingTranslationJobs();
  }
}

function isPendingTranslationMessage(message) {
  if (!message?.id) return false;
  if (message.translationStatus === "pending") return true;
  if (message.processingType === MESSAGE_PROCESSING_TRANSLATION) return true;
  return message.deliveryStatus === "processing" && Boolean(message.targetLanguageCode);
}

function getStoredTranslationSourceText(roomId, message) {
  if (!roomId || !message?.id) return "";

  const room = getRoomById(roomId);
  if (!isAiFriendRoom(room) && !isMessageMine(message)) return "";

  const job = getPendingTranslationJob(roomId, message.id);
  const fallbackOriginal = isPendingTranslationMessage(message) ? message.originalText : "";
  return cleanMessageText(job?.sourceText || message.translationSourceText || fallbackOriginal || "", 2000);
}

function getPendingTranslationSourceText(roomId, message) {
  if (!roomId || !message?.id || !isMessageMine(message) || !isPendingTranslationMessage(message)) return "";
  return getStoredTranslationSourceText(roomId, message);
}

function attachLocalTranslationJobToMessage(roomId, message) {
  if (!message?.id || !isPendingTranslationMessage(message) || !isMessageMine(message)) return message;

  const sourceText = getPendingTranslationSourceText(roomId, message);
  if (!sourceText) return message;

  return {
    ...message,
    translationSourceText: sourceText
  };
}

function attachLocalTranslationJobsToMessages(roomId, messagesForRoom = []) {
  return messagesForRoom.map((message) => attachLocalTranslationJobToMessage(roomId, message));
}

function schedulePendingLearningAnalysisForRoom(room) {
  if (!room?.id || isAiRoom(room)) return;
  if (!firebaseReady || !currentFirebaseUid || !isInternetAvailable()) return;

  window.setTimeout(() => {
    const messagesForRoom = roomMessagesById.get(room.id) || room.messages || [];
    messagesForRoom
      .filter((message) => isMessageMine(message) && isLearningAnalysisPending(message))
      .forEach((message) => startLearningFeedbackJob(room, message, getLearningAnalysisSourceText(message)));
  }, 0);
}

function schedulePendingTranslationResumeForRoom(room) {
  if (!room?.id || isAiRoom(room)) return;
  if (!firebaseReady || !currentFirebaseUid || !isInternetAvailable()) return;

  window.setTimeout(() => resumePendingTranslationsFromRenderedBubbles(room), 0);
}

function resumePendingTranslationsFromRenderedBubbles(room) {
  if (!room?.id || isAiRoom(room)) return;
  if (!firebaseReady || !currentFirebaseUid || !isInternetAvailable()) return;
  if (activeRoomId !== room.id || messages.dataset.roomId !== room.id) return;

  const messagesForRoom = roomMessagesById.get(room.id) || room.messages || [];
  const messageMap = new Map(messagesForRoom.map((message) => [message.id, message]));

  messages
    .querySelectorAll('.message-row[data-message-id] .bubble.is-translation-processing[data-translation-source-text]')
    .forEach((bubble) => {
      const row = bubble.closest('.message-row[data-message-id]');
      const messageId = row?.dataset.messageId || bubble.dataset.translationMessageId || "";
      const message = messageMap.get(messageId);
      const sourceText = cleanMessageText(bubble.dataset.translationSourceText || "", 2000);
      if (!message || !sourceText || !isPendingTranslationMessage(message) || !isMessageMine(message)) return;

      const language = getLanguageOption(message.targetLanguageCode || bubble.dataset.translationTargetLanguageCode || "") || getRoomLanguage(room);
      if (!language?.code) return;

      startTranslationResumeJob(room, {
        ...message,
        text: sourceText,
        originalText: sourceText,
        translationSourceText: sourceText
      }, language, sourceText);
    });
}

function startTranslationResumeJob(room, message, language, sourceText = "") {
  if (!room?.id || !message?.id || !language?.code) return;
  const cleanSourceText = cleanMessageText(sourceText || message.translationSourceText || message.originalText || message.text || "", 2000);
  if (!cleanSourceText || cleanSourceText === PUBLIC_TRANSLATION_PENDING_TEXT) return;

  upsertPendingTranslationJob(room, message, cleanSourceText, language);
  const key = getPendingTranslationJobKey(room.id, message.id);
  if (pendingTranslationResumeKeys.has(key)) return;

  pendingTranslationResumeKeys.add(key);
  translateFirebaseMessageInBackground(room, {
    ...message,
    text: cleanSourceText,
    originalText: cleanSourceText,
    translationSourceText: cleanSourceText
  }, language).finally(() => {
    pendingTranslationResumeKeys.delete(key);
  });
}

async function translateFirebaseMessageInBackground(room, message, language) {
  if (!room?.id || !message?.id || !language?.code || message.translationDisabled) return;

  try {
    if (!isInternetAvailable()) throw new Error("Sem internet para traduzir.");

    const originalText = cleanMessageText(
      message.translationSourceText || getPendingTranslationSourceText(room.id, message) || message.originalText || message.text || "",
      2000
    );
    if (!originalText || originalText === PUBLIC_TRANSLATION_PENDING_TEXT) {
      throw new Error("Texto original da tradução não encontrado.");
    }

    const translationResult = await translateMessageTextResult(originalText, language);
    const translated = cleanMessageText(translationResult.text, 1000);
    if (!translated) throw new Error("Tradução vazia.");

    const hasDeliveredTranslation = translated && translated !== originalText;
    const translatedMessage = {
      ...message,
      text: hasDeliveredTranslation ? translated : originalText,
      originalText: hasDeliveredTranslation ? originalText : "",
      translatedText: hasDeliveredTranslation ? translated : "",
      translationProvider: hasDeliveredTranslation ? translationResult.provider : "",
      translationSourceText: "",
      translationStatus: "done",
      translationError: false,
      deliveryStatus: "sent",
      pendingOffline: false,
      processingType: ""
    };

    const updates = {
      [`rooms/${room.id}/messages/${message.id}/text`]: translatedMessage.text,
      [`rooms/${room.id}/messages/${message.id}/originalText`]: translatedMessage.originalText,
      [`rooms/${room.id}/messages/${message.id}/translatedText`]: translatedMessage.translatedText,
      [`rooms/${room.id}/messages/${message.id}/translationProvider`]: translatedMessage.translationProvider,
      [`rooms/${room.id}/messages/${message.id}/translationStatus`]: "done",
      [`rooms/${room.id}/messages/${message.id}/translationError`]: false,
      [`rooms/${room.id}/messages/${message.id}/deliveryStatus`]: "sent",
      [`rooms/${room.id}/messages/${message.id}/pendingOffline`]: false,
      [`rooms/${room.id}/messages/${message.id}/processingType`]: null
    };

    try {
      const lastMessageSnapshot = await get(ref(db, `rooms/${room.id}/lastMessageId`));
      if (lastMessageSnapshot.val() === message.id) {
        updates[`rooms/${room.id}/lastMessage`] = translatedMessage.text;
        updates[`rooms/${room.id}/lastOriginalMessage`] = translatedMessage.originalText;
      }
    } catch (error) {
      console.warn("Nao foi possivel conferir a ultima mensagem antes de salvar traducao.", error);
    }

    await update(ref(db), updates);
    removePendingTranslationJob(room.id, message.id);
    syncLocalSentFirebaseMessage(room, translatedMessage, {
      displayText: translatedMessage.text,
      originalText: translatedMessage.originalText,
      sentAt: Number(message.createdAtMillis || message.time || Date.now())
    });
  } catch (error) {
    console.warn("Nao foi possivel traduzir a mensagem em segundo plano.", error);
    const sourceText = cleanMessageText(
      message.translationSourceText || getPendingTranslationSourceText(room.id, message) || message.originalText || "",
      2000
    );
    if (sourceText) {
      upsertPendingTranslationJob(room, message, sourceText, language);
    }

    const failedMessage = {
      ...message,
      text: PUBLIC_TRANSLATION_ERROR_TEXT,
      originalText: "",
      translatedText: "",
      translationSourceText: sourceText,
      translationStatus: "error",
      translationError: true,
      deliveryStatus: "sent",
      pendingOffline: false,
      processingType: ""
    };

    syncLocalSentFirebaseMessage(room, failedMessage, {
      displayText: failedMessage.text || failedMessage.originalText || "",
      originalText: failedMessage.originalText || "",
      sentAt: Number(message.createdAtMillis || message.time || Date.now())
    });

    if (firebaseReady && isInternetAvailable()) {
      try {
        await update(ref(db), {
          [`rooms/${room.id}/messages/${message.id}/text`]: failedMessage.text,
          [`rooms/${room.id}/messages/${message.id}/originalText`]: "",
          [`rooms/${room.id}/messages/${message.id}/translatedText`]: "",
          [`rooms/${room.id}/messages/${message.id}/translationStatus`]: "error",
          [`rooms/${room.id}/messages/${message.id}/translationError`]: true,
          [`rooms/${room.id}/messages/${message.id}/deliveryStatus`]: "sent",
          [`rooms/${room.id}/messages/${message.id}/pendingOffline`]: false,
          [`rooms/${room.id}/messages/${message.id}/processingType`]: null
        });
      } catch (updateError) {
        console.warn("Nao foi possivel marcar erro de traducao no Firebase.", updateError);
      }
    }
  }
}

function saveRemoteConversationCache() {
  if (!currentUser?.nick) return;

  const roomsForCache = remoteRooms
    .filter((room) => room?.id && !isAiRoom(room))
    .slice(0, 80)
    .map((room) => ({
      ...room,
      messages: undefined
    }));
  const messagesByRoom = {};

  roomsForCache.forEach((room) => {
    messagesByRoom[room.id] = (roomMessagesById.get(room.id) || [])
      .slice(-180)
      .map(stripMessageForCache);
  });

  try {
    localStorage.setItem(REMOTE_CONVERSATION_CACHE_STORAGE_KEY, JSON.stringify({
      savedAt: Date.now(),
      ownerNick: currentUser?.nick || "",
      currentUid: currentFirebaseUid || "",
      rooms: roomsForCache,
      messagesByRoom
    }));
  } catch (error) {
    console.warn("Nao foi possivel salvar cache local de conversas.", error);
  }
}

function loadRemoteConversationCache() {
  const cache = loadFromStorage(REMOTE_CONVERSATION_CACHE_STORAGE_KEY, null);
  if (!cache?.rooms || !Array.isArray(cache.rooms)) return;
  if (cache.ownerNick && normalize(cache.ownerNick) !== normalize(currentUser?.nick || "")) return;

  cache.rooms.forEach((room) => {
    if (!room?.id) return;
    const cachedMessages = Array.isArray(cache.messagesByRoom?.[room.id])
      ? cache.messagesByRoom[room.id].map((message) => mapMessageData(message.id || createId("cached-msg"), message))
      : [];

    cachedMessages.sort(compareMessagesBySendOrder);
    roomMessagesById.set(room.id, cachedMessages);
    remoteRoomMap.set(room.id, {
      ...room,
      messages: cachedMessages
    });
  });

  remoteRooms = Array.from(remoteRoomMap.values());
}

function restorePendingLocalMessagesAfterReload() {
  let changedQueue = false;
  let changedMessages = false;
  const queuedIdsByRoom = new Map();

  offlineMessageQueue.forEach((item) => {
    if (!queuedIdsByRoom.has(item.roomId)) queuedIdsByRoom.set(item.roomId, new Set());
    queuedIdsByRoom.get(item.roomId).add(item.localId);
  });

  offlineMessageQueue.forEach((item) => {
    const room = remoteRoomMap.get(item.roomId);
    if (!room) return;

    const hasMessage = (roomMessagesById.get(item.roomId) || []).some((message) => message.id === item.localId);
    if (hasMessage) return;

    const restoredMessage = createLocalMessageFromOfflineQueueItem(room, item);
    upsertRoomMessage(item.roomId, restoredMessage);
    remoteRoomMap.set(item.roomId, {
      ...room,
      lastMessage: restoredMessage.text || room.lastMessage || "",
      lastMessageId: restoredMessage.id,
      lastOriginalMessage: restoredMessage.originalText || room.lastOriginalMessage || "",
      lastMessageAuthorUid: restoredMessage.authorUid || room.lastMessageAuthorUid || "",
      lastMessageAuthorNick: restoredMessage.authorNick || room.lastMessageAuthorNick || "",
      lastMessageAt: Number(restoredMessage.createdAtMillis || restoredMessage.time || Date.now()),
      updatedAt: Math.max(Number(room.updatedAt || 0), Number(restoredMessage.createdAtMillis || restoredMessage.time || Date.now())),
      messages: roomMessagesById.get(item.roomId) || []
    });
    changedMessages = true;
  });

  roomMessagesById.forEach((messagesForRoom, roomId) => {
    const room = remoteRoomMap.get(roomId);
    if (!room) return;

    const queuedIds = queuedIdsByRoom.get(roomId) || new Set();
    messagesForRoom.forEach((message) => {
      if (!shouldKeepLocalPendingMessage(roomId, message, queuedIds)) return;
      if (queuedIds.has(message.id)) return;

      const queueItem = createOfflineQueueItemFromMessage(room, {
        ...message,
        localPending: true,
        localOnly: true,
        pendingOffline: message.pendingOffline || !isInternetAvailable()
      }, {
        processingType: message.processingType,
        replyPayload: message.replyTo || null,
        skipTranslation: Boolean(message.translationDisabled),
        learningTest: Boolean(message.learningTest),
        learningFeedback: message.learningFeedback,
        mentionPayload: {
          mentionedUids: normalizeMentionUidMap(message.mentionedUids),
          mentionedNicks: normalizeMentionNickList(message.mentionedNicks),
          mentions: normalizeMentions(message.mentions)
        }
      });

      upsertRoomMessage(roomId, {
        ...message,
        deliveryStatus: getSafeMessageProcessingType(message.processingType) ? "processing" : "queued",
        pendingOffline: message.pendingOffline || !isInternetAvailable(),
        localPending: true,
        localOnly: true
      });
      offlineMessageQueue.push(queueItem);
      queuedIds.add(queueItem.localId);
      changedQueue = true;
      changedMessages = true;
    });
  });

  if (changedQueue) {
    offlineMessageQueue = normalizeOfflineMessageQueue(offlineMessageQueue);
    localStorage.setItem(OFFLINE_MESSAGE_QUEUE_STORAGE_KEY, JSON.stringify(offlineMessageQueue));
  }

  if (changedMessages || changedQueue) {
    remoteRooms = Array.from(remoteRoomMap.values());
    saveRemoteConversationCache();
  }
}

function createLocalMessageFromOfflineQueueItem(room, item) {
  const processingType = getQueuedMessageProcessingType(item, room);
  const language = getQueuedTargetLanguage(item, room);
  const isLearningProcessing = processingType === MESSAGE_PROCESSING_LEARNING_TEST;
  const isTranslationProcessing = processingType === MESSAGE_PROCESSING_TRANSLATION;
  const createdAtMillis = Number(item.createdAtMillis || Date.now());

  return {
    id: item.localId,
    text: isTranslationProcessing ? PUBLIC_TRANSLATION_PENDING_TEXT : cleanMessageText(item.text),
    originalText: isTranslationProcessing ? cleanMessageText(item.text) : "",
    translatedText: "",
    translationSourceText: isTranslationProcessing ? cleanMessageText(item.text) : "",
    targetLanguageCode: language?.code || item.targetLanguageCode || "",
    targetLanguageName: language?.name || item.targetLanguageName || "",
    learningTest: Boolean(item.learningTest || isLearningProcessing),
    learningFeedback: normalizeLearningFeedback(item.learningFeedback),
    learningFeedbackStatus: isLearningProcessing && !item.learningFeedback ? "pending" : "",
    processingType,
    translationDisabled: Boolean(item.skipTranslation || isLearningProcessing),
    translationStatus: isTranslationProcessing || (language?.code && !item.skipTranslation) ? "pending" : "none",
    translationError: false,
    deliveryStatus: processingType ? "processing" : "queued",
    pendingOffline: !isInternetAvailable(),
    localPending: true,
    localOnly: true,
    mentionedUids: normalizeMentionUidMap(item.mentionPayload?.mentionedUids),
    mentionedNicks: normalizeMentionNickList(item.mentionPayload?.mentionedNicks),
    mentions: normalizeMentions(item.mentionPayload?.mentions),
    replyTo: item.replyTo || null,
    authorUid: currentFirebaseUid || getCachedCurrentUserUidForRoom(room) || "",
    authorNick: currentUser?.nick || "Voce",
    authorAvatar: currentUser?.avatar || getInitials(currentUser?.nick || "Voce"),
    authorAvatarIcon: getSafeSpaceAvatarIcon(currentUser?.avatarIcon),
    from: "me",
    time: createdAtMillis,
    createdAtMillis
  };
}

function stripMessageForCache(message) {
  return {
    id: message.id || "",
    letter: normalizeLetterPayload(message.letter),
    letterLocationRequest: normalizeLetterLocationRequest(message.letterLocationRequest),
    text: message.text || "",
    originalText: message.originalText || "",
    translatedText: message.translatedText || "",
    translationSourceText: isPendingTranslationMessage(message) ? message.translationSourceText || "" : "",
    targetLanguageCode: message.targetLanguageCode || "",
    targetLanguageName: message.targetLanguageName || "",
    learningTest: Boolean(message.learningTest),
    learningFeedbackStatus: message.learningFeedbackStatus || "",
    processingType: getSafeMessageProcessingType(message.processingType),
    translationDisabled: Boolean(message.translationDisabled),
    translationStatus: message.translationStatus || "",
    translationError: Boolean(message.translationError),
    deliveryStatus: message.deliveryStatus || "",
    deliveryError: message.deliveryError || "",
    pendingOffline: Boolean(message.pendingOffline),
    localPending: Boolean(message.localPending),
    localOnly: Boolean(message.localOnly),
    forwarded: Boolean(message.forwarded),
    forwardedFromRoomId: message.forwardedFromRoomId || "",
    forwardedFromRoomName: message.forwardedFromRoomName || "",
    forwardedOriginalMessageId: message.forwardedOriginalMessageId || "",
    forwardedOriginalAuthorNick: message.forwardedOriginalAuthorNick || "",
    edited: Boolean(message.edited),
    editedAtMillis: Number(message.editedAtMillis || 0),
    editedByNick: message.editedByNick || "",
    deliveredBy: message.deliveredBy || {},
    readBy: message.readBy || {},
    mentionedUids: message.mentionedUids || {},
    mentionedNicks: message.mentionedNicks || [],
    mentions: message.mentions || {},
    replyTo: message.replyTo || null,
    reactions: message.reactions || {},
    hydration: message.hydration || null,
    hydrations: message.hydrations || {},
    authorUid: message.authorUid || "",
    authorNick: message.authorNick || message.author || "",
    authorAvatar: message.authorAvatar || "",
    authorAvatarIcon: message.authorAvatarIcon || "",
    from: message.from || "",
    time: Number(message.time || message.createdAtMillis || Date.now()),
    clientTime: Number(message.clientTime || message.createdAtMillis || message.time || Date.now()),
    serverTime: Number(message.serverTime || 0),
    createdAtMillis: Number(message.createdAtMillis || message.time || Date.now())
  };
}

function createEmptyMessageSearchState() {
  return {
    roomId: "",
    open: false,
    query: "",
    user: "",
    date: "",
    matches: [],
    activeIndex: -1
  };
}

function updateConversationSearchButton(room = getActiveRoom()) {
  if (!conversationSearchButton) return;
  conversationSearchButton.hidden = !room;
  conversationSearchButton.classList.toggle("is-active", Boolean(room && messageSearchState.open));
}

function syncMessageSearchRoom(roomId) {
  if (!roomId || messageSearchState.roomId === roomId) return;

  if (messageSearchState.open) {
    closeMessageSearchPanel({ keepInputs: false });
  }

  messageSearchState.roomId = roomId;
}

function openMessageSearchPanel() {
  const activeRoom = getActiveRoom();
  if (!activeRoom || !messageSearchPanel) return;

  messageSearchState.open = true;
  messageSearchState.roomId = activeRoom.id;
  messageSearchPanel.hidden = false;
  updateConversationSearchButton(activeRoom);
  updateMessageSearchFromControls();
  window.setTimeout(() => messageSearchInput?.focus(), 0);
}

function closeMessageSearchPanel(options = {}) {
  if (messageSearchPanel) messageSearchPanel.hidden = true;
  messageSearchState = {
    ...createEmptyMessageSearchState(),
    roomId: options.keepRoomId ? messageSearchState.roomId : activeRoomId || ""
  };

  if (!options.keepInputs) {
    if (messageSearchInput) messageSearchInput.value = "";
    if (messageSearchUserInput) messageSearchUserInput.value = "";
    if (messageSearchDateInput) messageSearchDateInput.value = "";
  }

  updateConversationSearchButton(getActiveRoom());
  applyMessageSearchHighlights();
}

function updateMessageSearchFromControls() {
  if (!messageSearchState.open && messageSearchPanel?.hidden) return;

  const activeRoom = getActiveRoom();
  if (!activeRoom) return;

  messageSearchState.open = true;
  messageSearchState.roomId = activeRoom.id;
  messageSearchState.query = messageSearchInput?.value || "";
  messageSearchState.user = messageSearchUserInput?.value || "";
  messageSearchState.date = messageSearchDateInput?.value || "";
  updateMessageSearchResults();
}

function updateMessageSearchResults() {
  if (!messageSearchState.open) {
    applyMessageSearchHighlights();
    return;
  }

  const activeRoom = getActiveRoom();
  if (!activeRoom || activeRoom.id !== messageSearchState.roomId) {
    applyMessageSearchHighlights();
    return;
  }

  const query = normalize(messageSearchState.query);
  const user = normalize(messageSearchState.user);
  const date = messageSearchState.date;
  const hasFilters = Boolean(query || user || date);
  const roomMessages = activeRoom.messages || [];

  if (!hasFilters) {
    messageSearchState.matches = [];
    messageSearchState.activeIndex = -1;
    if (messageSearchResult) messageSearchResult.textContent = "Digite termo, usuário ou data";
    applyMessageSearchHighlights();
    return;
  }

  messageSearchState.matches = roomMessages
    .filter((message) => {
      const textMatches = !query || getMessageSearchText(message).includes(query);
      const userMatches = !user || normalize(message.authorNick || message.author || "").includes(user);
      const dateMatches = !date || getLocalDateInputValue(message.time || message.createdAtMillis) === date;
      return textMatches && userMatches && dateMatches;
    })
    .map((message) => message.id)
    .filter(Boolean);

  if (!messageSearchState.matches.length) {
    messageSearchState.activeIndex = -1;
    if (messageSearchResult) messageSearchResult.textContent = "0 resultados";
    applyMessageSearchHighlights();
    return;
  }

  if (messageSearchState.activeIndex < 0 || messageSearchState.activeIndex >= messageSearchState.matches.length) {
    messageSearchState.activeIndex = 0;
  }

  if (messageSearchResult) {
    messageSearchResult.textContent = `${messageSearchState.activeIndex + 1}/${messageSearchState.matches.length}`;
  }
  applyMessageSearchHighlights();
}

function getMessageSearchText(message) {
  return normalize([
    message?.text,
    message?.originalText,
    message?.translatedText,
    message?.authorNick,
    message?.author,
    message?.replyTo?.text,
    message?.replyTo?.authorNick
  ].filter(Boolean).join(" "));
}

function getLocalDateInputValue(timestamp) {
  const date = new Date(Number(timestamp || Date.now()));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function applyMessageSearchHighlights() {
  if (!messages) return;

  const matchIds = new Set(messageSearchState.matches || []);
  const activeId = messageSearchState.activeIndex >= 0 ? messageSearchState.matches[messageSearchState.activeIndex] : "";

  messages.querySelectorAll(".message-row[data-message-id]").forEach((row) => {
    const isMatch = matchIds.has(row.dataset.messageId);
    const isActive = isMatch && row.dataset.messageId === activeId;
    row.classList.toggle("is-search-match", isMatch);
    row.classList.toggle("is-search-active", isActive);
  });
}

function jumpToMessageSearchMatch(direction = 1) {
  if (!messageSearchState.matches.length) return;

  const total = messageSearchState.matches.length;
  messageSearchState.activeIndex = (messageSearchState.activeIndex + direction + total) % total;
  if (messageSearchResult) {
    messageSearchResult.textContent = `${messageSearchState.activeIndex + 1}/${total}`;
  }
  applyMessageSearchHighlights();

  const activeId = messageSearchState.matches[messageSearchState.activeIndex];
  const row = messages?.querySelector(`[data-message-id="${CSS.escape(activeId)}"]`);
  row?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function extractMessageMentions(text, room) {
  const tokens = new Set();
  const mentionRegex = /(^|[\s([{"'])@([A-Za-zÀ-ÿ0-9._-]{1,32})/g;
  let match = mentionRegex.exec(text);

  while (match) {
    tokens.add(normalizeMentionToken(match[2]));
    match = mentionRegex.exec(text);
  }

  const mentions = {};
  const mentionedUids = {};
  const mentionedNicks = [];

  getRoomMembers(room).forEach((member) => {
    if (!member.uid || member.uid === currentFirebaseUid) return;
    const aliases = getMentionAliases(member.nick);
    if (!aliases.some((alias) => tokens.has(alias))) return;

    mentionedUids[member.uid] = true;
    mentionedNicks.push(member.nick);
    mentions[member.uid] = {
      uid: member.uid,
      nick: member.nick
    };
  });

  return {
    mentionedUids,
    mentionedNicks: unique(mentionedNicks),
    mentions
  };
}

function getMentionAliases(nick) {
  const normalizedNick = normalizeMentionToken(nick);
  const firstName = normalizeMentionToken(String(nick || "").split(/\s+/)[0] || "");
  const pathKey = normalizeMentionToken(toDatabaseKey(nick));
  return unique([normalizedNick, firstName, pathKey].filter(Boolean));
}

function normalizeMentionToken(value) {
  return normalize(value).replace(/^@+/, "").replace(/[^a-z0-9_-]/g, "");
}

function renderMentionedText(element, text, message = {}) {
  const rawText = String(text || "");
  element.textContent = "";

  if (!rawText) return;

  const aliases = new Set(
    [
      ...normalizeMentionNickList(message.mentionedNicks).flatMap(getMentionAliases),
      ...Object.values(normalizeMentions(message.mentions)).flatMap((mention) => getMentionAliases(mention.nick))
    ].filter(Boolean)
  );

  if (!aliases.size) {
    element.textContent = rawText;
    return;
  }

  const mentionRegex = /@([A-Za-zÀ-ÿ0-9._-]{1,32})/g;
  let cursor = 0;
  let match = mentionRegex.exec(rawText);

  while (match) {
    if (match.index > cursor) {
      element.appendChild(document.createTextNode(rawText.slice(cursor, match.index)));
    }

    const mentionText = match[0];
    const token = normalizeMentionToken(match[1]);
    if (aliases.has(token)) {
      const mention = document.createElement("span");
      mention.className = "message-mention";
      mention.textContent = mentionText;
      element.appendChild(mention);
    } else {
      element.appendChild(document.createTextNode(mentionText));
    }

    cursor = match.index + mentionText.length;
    match = mentionRegex.exec(rawText);
  }

  if (cursor < rawText.length) {
    element.appendChild(document.createTextNode(rawText.slice(cursor)));
  }
}

function isCurrentUserMentionedInRoomLastMessage(room) {
  if (!currentFirebaseUid) return false;
  return Boolean(normalizeMentionUidMap(room?.lastMessageMentionedUids)[currentFirebaseUid]);
}

function isCurrentUserMentionedInNotificationData(data = {}) {
  if (!currentFirebaseUid) return false;
  if (String(data.mentioned || data.mention || "") === "1") return true;
  return Boolean(parseMentionedUids(data.mentionedUids || data.mentions)[currentFirebaseUid]);
}

function parseMentionedUids(value) {
  if (!value) return {};
  if (typeof value === "object") return normalizeMentionUidMap(value);

  const text = String(value || "").trim();
  if (!text) return {};

  try {
    return normalizeMentionUidMap(JSON.parse(text));
  } catch (error) {
    return text.split(",").reduce((map, uid) => {
      const cleanUid = String(uid || "").trim();
      if (cleanUid) map[cleanUid] = true;
      return map;
    }, {});
  }
}

function createMessageDeliveryStatusElement(message) {
  const activeRoom = getActiveRoom();
  if (!activeRoom || isAiRoom(activeRoom) || !isMessageMine(message)) return null;

  const status = getMessageDeliveryInfo(message, activeRoom);
  const wrap = document.createElement("span");
  const checks = document.createElement("span");

  wrap.className = `message-delivery-status ${status.className}`;
  wrap.title = status.label;
  wrap.setAttribute("aria-label", status.label);
  checks.className = "checks";
  if (status.iconClass) {
    checks.innerHTML = `<i class="${status.iconClass}" aria-hidden="true"></i>`;
  } else {
    checks.textContent = status.checks;
  }
  wrap.appendChild(checks);
  return wrap;
}

function getMessageDeliveryInfo(message, room) {
  if (message.deliveryStatus === "failed") {
    return { checks: "!", label: "Falha no envio", className: "is-failed" };
  }

  if (message.pendingOffline || message.deliveryStatus === "queued") {
    return { iconClass: "fa-regular fa-clock", checks: "", label: "Aguardando conexao", className: "is-waiting" };
  }

  if (message.deliveryStatus === "processing") {
    return { iconClass: "fa-regular fa-clock", checks: "", label: message.processingType === MESSAGE_PROCESSING_TRANSLATION ? "Traduzindo antes de enviar" : "Verificando antes de enviar", className: "is-waiting" };
  }

  if (message.deliveryStatus === "sending") {
    return { iconClass: "fa-regular fa-clock", checks: "", label: "Enviando", className: "is-waiting" };
  }

  const recipientUids = getReceiptRecipientUids(room, message);
  const readBy = normalizeMessageReceipts(message.readBy);
  const deliveredBy = normalizeMessageReceipts(message.deliveredBy);
  const hasRecipients = recipientUids.length > 0;
  const allRead = hasRecipients && recipientUids.every((uid) => readBy[uid]);
  const allDelivered = hasRecipients && recipientUids.every((uid) => deliveredBy[uid] || readBy[uid]);
  const anyDelivered = hasRecipients && recipientUids.some((uid) => deliveredBy[uid] || readBy[uid]);

  if (allRead) {
    return { checks: "\u2713\u2713", label: "Lida", className: "is-read" };
  }

  if (allDelivered || anyDelivered) {
    return { checks: "\u2713", label: "Entregue", className: "is-delivered" };
  }

  return { checks: "\u2713", label: "Enviada", className: "is-sent" };
}

function getReceiptRecipientUids(room, message) {
  const authorUid = message?.authorUid || currentFirebaseUid || "";
  return unique((room?.memberUids || Object.keys(room?.memberNickMap || {}))
    .filter((uid) => uid && uid !== authorUid));
}

function scheduleReceiptSyncForActiveRoom() {
  const room = getActiveRoom();
  if (!room || isAiRoom(room) || !room.id) return;
  if (!firebaseReady || !currentFirebaseUid || !isInternetAvailable()) return;
  if (receiptUpdateRooms.has(room.id)) return;

  receiptUpdateRooms.add(room.id);
  window.setTimeout(async () => {
    try {
      await syncReceiptsForRoom(room.id);
    } catch (error) {
      console.warn("Nao foi possivel sincronizar recibos da conversa.", error);
    } finally {
      receiptUpdateRooms.delete(room.id);
    }
  }, 200);
}

async function syncReceiptsForRoom(roomId) {
  const room = getVisibleRooms().find((item) => item.id === roomId) || remoteRoomMap.get(roomId);
  if (!room || isAiRoom(room) || !currentFirebaseUid) return;

  const now = Date.now();
  const visible = isRoomCurrentlyVisible(roomId);
  const updates = {};
  const receipt = {
    uid: currentFirebaseUid,
    nick: currentUser?.nick || "Você",
    at: serverTimestamp(),
    atMillis: now
  };

  (roomMessagesById.get(roomId) || [])
    .filter((message) => message?.id && message.authorUid !== currentFirebaseUid)
    .slice(-120)
    .forEach((message) => {
      if (!normalizeMessageReceipts(message.deliveredBy)[currentFirebaseUid]) {
        updates[`rooms/${roomId}/messages/${message.id}/deliveredBy/${currentFirebaseUid}`] = receipt;
      }
      if (visible && !normalizeMessageReceipts(message.readBy)[currentFirebaseUid]) {
        updates[`rooms/${roomId}/messages/${message.id}/readBy/${currentFirebaseUid}`] = receipt;
      }
    });

  if (Object.keys(updates).length) {
    await update(ref(db), updates);
  }
}

function ensureRoomLastMessageSubscription(roomId) {
  if (!roomId || roomLastMessageUnsubscribers.has(roomId)) return;

  const lastMessageQuery = query(
    ref(db, `rooms/${roomId}/messages`),
    orderByChild("createdAt"),
    limitToLast(ROOM_LAST_MESSAGE_LISTEN_LIMIT)
  );

  let receivedInitialSnapshot = false;
  const unsubscribe = onValue(
    lastMessageQuery,
    (snapshot) => {
      let lastMessage = null;
      snapshot.forEach((childSnapshot) => {
        lastMessage = mapMessageSnapshot(childSnapshot);
      });

      const initialSnapshot = !receivedInitialSnapshot;
      receivedInitialSnapshot = true;

      if (!lastMessage) return;
      syncRemoteRoomLastMessage(roomId, lastMessage, { initialSnapshot });
    },
    (error) => {
      console.error("Erro ao escutar ultima mensagem da sala no Realtime Database.", error);
    }
  );

  roomLastMessageUnsubscribers.set(roomId, unsubscribe);
}

function scheduleRoomLastMessagesRefresh(roomIds = [], delay = 400) {
  if (!Array.isArray(roomIds) || !roomIds.length) return;
  if (!firebaseReady || !currentFirebaseUid || !isInternetAvailable()) return;

  if (!scheduleRoomLastMessagesRefresh.pendingIds) {
    scheduleRoomLastMessagesRefresh.pendingIds = new Set();
  }

  roomIds.filter(Boolean).forEach((roomId) => scheduleRoomLastMessagesRefresh.pendingIds.add(roomId));

  if (roomLastMessageRefreshTimer) {
    window.clearTimeout(roomLastMessageRefreshTimer);
  }

  roomLastMessageRefreshTimer = window.setTimeout(() => {
    const pendingIds = Array.from(scheduleRoomLastMessagesRefresh.pendingIds || []);
    scheduleRoomLastMessagesRefresh.pendingIds?.clear();
    roomLastMessageRefreshTimer = null;
    refreshRoomLastMessages(pendingIds).catch((error) => {
      console.warn("Nao foi possivel atualizar ultimas mensagens das salas.", error);
    });
  }, Math.max(0, delay));
}

async function refreshRoomLastMessages(roomIds = []) {
  if (roomLastMessageRefreshInProgress) {
    scheduleRoomLastMessagesRefresh(roomIds, 1000);
    return;
  }

  const uniqueRoomIds = unique(roomIds).filter(Boolean);
  if (!uniqueRoomIds.length || !firebaseReady || !currentFirebaseUid || !isInternetAvailable()) return;

  roomLastMessageRefreshInProgress = true;

  try {
    await Promise.all(uniqueRoomIds.map((roomId) => refreshRoomLastMessage(roomId)));
  } finally {
    roomLastMessageRefreshInProgress = false;
  }
}

async function refreshRoomLastMessage(roomId) {
  const lastMessageQuery = query(
    ref(db, `rooms/${roomId}/messages`),
    orderByChild("createdAt"),
    limitToLast(1)
  );

  try {
    const snapshot = await get(lastMessageQuery);
    let lastMessage = null;
    snapshot.forEach((childSnapshot) => {
      lastMessage = mapMessageSnapshot(childSnapshot);
    });

    if (lastMessage) {
      const hadRoom = remoteRoomMap.has(roomId);
      syncRemoteRoomLastMessage(roomId, lastMessage, { initialSnapshot: !hadRoom });
      return;
    }

    const roomSnapshot = await get(ref(db, `rooms/${roomId}`));
    if (!roomSnapshot.exists()) return;

    const initialSnapshot = !remoteRoomMap.has(roomId);
    const mappedRoom = mapRoomSnapshot(roomSnapshot);
    remoteRoomMap.set(roomId, mappedRoom);
    remoteRooms = Array.from(remoteRoomMap.values());
    handleRoomMessageNotification(mappedRoom, { initialSnapshot });
    renderRoomList(searchInput.value);
    refreshNotificationsModalIfOpen();
  } catch (error) {
    console.warn("Nao foi possivel buscar ultima mensagem da sala.", roomId, error);
  }
}

function syncRemoteRoomLastMessage(roomId, message, options = {}) {
  if (!roomId || !message?.id) return;

  const messagesForRoom = upsertRoomMessage(roomId, message);
  const currentRoom = remoteRoomMap.get(roomId);
  const lastMessageAt = getMessageSortTime(message) || Date.now();
  const displayText = getMessageDisplayText(message, 300) || "Nova mensagem";

  if (currentRoom) {
    const updatedRoom = {
      ...currentRoom,
      lastMessage: displayText,
      lastMessageId: message.id,
      lastOriginalMessage: message.originalText || currentRoom.lastOriginalMessage || "",
      lastMessageAuthorUid: message.authorUid || currentRoom.lastMessageAuthorUid || "",
      lastMessageAuthorNick: message.authorNick || message.author || currentRoom.lastMessageAuthorNick || "Usuario",
      lastMessageMentionedUids: normalizeMentionUidMap(message.mentionedUids),
      lastMessageMentionedNicks: normalizeMentionNickList(message.mentionedNicks),
      lastMessageAt,
      updatedAt: Math.max(Number(currentRoom.updatedAt || 0), lastMessageAt),
      messages: messagesForRoom
    };

    remoteRoomMap.set(roomId, updatedRoom);
    remoteRooms = Array.from(remoteRoomMap.values());

    handleRoomMessageNotification(updatedRoom, { initialSnapshot: options.initialSnapshot === true });
  } else {
    handleRoomMessageNotification({
      id: roomId,
      lastMessage: displayText,
      lastMessageId: message.id,
      lastOriginalMessage: message.originalText || "",
      lastMessageAuthorUid: message.authorUid || "",
      lastMessageAuthorNick: message.authorNick || message.author || "Usuario",
      lastMessageMentionedUids: normalizeMentionUidMap(message.mentionedUids),
      lastMessageMentionedNicks: normalizeMentionNickList(message.mentionedNicks),
      lastMessageAt,
      messages: messagesForRoom
    }, { initialSnapshot: options.initialSnapshot === true });
  }

  if (activeRoomId === roomId) {
    const activeRoom = getActiveRoom();
    if (activeRoom) {
      if (isRoomCurrentlyVisible(roomId)) markRoomAsRead(activeRoom);
      renderRoomMessages(activeRoom);
    }
  }

  renderRoomList(searchInput.value);
  refreshNotificationsModalIfOpen();
}

function getRoomById(roomId) {
  if (!roomId) return null;
  if (activeRoomId === roomId) return getActiveRoom();
  return getVisibleRooms().find((room) => room.id === roomId) || remoteRoomMap.get(roomId) || null;
}

function createTranslationRetryButton(message, roomId = activeRoomId) {
  const room = getRoomById(roomId);
  if (!message?.translationError || (!isAiFriendRoom(room) && !isMessageMine(message))) return null;

  const sourceText = getStoredTranslationSourceText(roomId, message);
  if (!sourceText || sourceText === PUBLIC_TRANSLATION_PENDING_TEXT || sourceText === PUBLIC_TRANSLATION_ERROR_TEXT) return null;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "translation-retry-button";
  button.innerHTML = `<i class="fa-solid fa-rotate-right" aria-hidden="true"></i><span>Tentar traduzir novamente</span>`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    retryTranslationMessage(roomId, message.id, button);
  });
  return button;
}

async function retryTranslationMessage(roomId, messageId, button = null) {
  const room = getRoomById(roomId);
  if (!room?.id || !messageId) return;

  if (isAiFriendRoom(room)) {
    await retryLocalAiTranslationMessage(room, messageId, button);
    return;
  }

  if (!firebaseReady || !currentFirebaseUid || !isInternetAvailable()) {
    showToast("Sem internet", "Conecte-se para tentar traduzir novamente.");
    return;
  }

  const messagesForRoom = roomMessagesById.get(room.id) || room.messages || [];
  const message = messagesForRoom.find((item) => item.id === messageId);
  if (!message || !isMessageMine(message)) return;

  const sourceText = getStoredTranslationSourceText(room.id, message);
  if (!sourceText || sourceText === PUBLIC_TRANSLATION_PENDING_TEXT || sourceText === PUBLIC_TRANSLATION_ERROR_TEXT) {
    showToast("Texto original não encontrado", "Não foi possível recuperar o texto salvo para repetir a tradução.");
    return;
  }

  const savedJob = getPendingTranslationJob(room.id, message.id);
  const messageLanguage = getLanguageOption(message.targetLanguageCode || savedJob?.targetLanguageCode || "");
  const language = messageLanguage?.code ? messageLanguage : getRoomLanguage(room);
  if (!language?.code) {
    showToast("Idioma não definido", "Escolha um idioma para esta conversa antes de tentar novamente.");
    return;
  }

  if (button) {
    button.disabled = true;
    button.classList.add("is-loading");
  }

  const retryMessage = {
    ...message,
    text: PUBLIC_TRANSLATION_PENDING_TEXT,
    originalText: "",
    translatedText: "",
    translationSourceText: sourceText,
    translationStatus: "pending",
    translationError: false,
    deliveryStatus: "processing",
    pendingOffline: false,
    processingType: MESSAGE_PROCESSING_TRANSLATION,
    targetLanguageCode: language.code || "",
    targetLanguageName: language.name || ""
  };

  upsertPendingTranslationJob(room, retryMessage, sourceText, language);
  upsertRoomMessage(room.id, retryMessage);
  if (activeRoomId === room.id) {
    forceMessageRerender(room.id);
    renderRoomMessages(getActiveRoom() || { ...room, messages: roomMessagesById.get(room.id) || [] });
  }

  try {
    await update(ref(db), {
      [`rooms/${room.id}/messages/${message.id}/text`]: PUBLIC_TRANSLATION_PENDING_TEXT,
      [`rooms/${room.id}/messages/${message.id}/originalText`]: "",
      [`rooms/${room.id}/messages/${message.id}/translatedText`]: "",
      [`rooms/${room.id}/messages/${message.id}/translationStatus`]: "pending",
      [`rooms/${room.id}/messages/${message.id}/translationError`]: false,
      [`rooms/${room.id}/messages/${message.id}/deliveryStatus`]: "processing",
      [`rooms/${room.id}/messages/${message.id}/pendingOffline`]: false,
      [`rooms/${room.id}/messages/${message.id}/processingType`]: MESSAGE_PROCESSING_TRANSLATION,
      [`rooms/${room.id}/messages/${message.id}/targetLanguageCode`]: language.code || "",
      [`rooms/${room.id}/messages/${message.id}/targetLanguageName`]: language.name || ""
    });

    startTranslationResumeJob(room, retryMessage, language, sourceText);
  } catch (error) {
    console.warn("Nao foi possivel reiniciar a traducao.", error);
    showToast("Não foi possível tentar novamente", "Verifique sua conexão e tente de novo.");
    if (button) {
      button.disabled = false;
      button.classList.remove("is-loading");
    }
  }
}

async function retryLocalAiTranslationMessage(room, messageId, button = null) {
  if (!room?.id || !messageId) return;

  if (!requireInternet("traduzir novamente")) return;

  const message = (room.messages || []).find((item) => item.id === messageId);
  if (!message?.translationError) return;

  const sourceText = getStoredTranslationSourceText(room.id, message);
  if (!sourceText || sourceText === PUBLIC_TRANSLATION_PENDING_TEXT || sourceText === PUBLIC_TRANSLATION_ERROR_TEXT) {
    showToast("Texto original nÃ£o encontrado", "NÃ£o foi possÃ­vel recuperar o texto salvo para repetir a traduÃ§Ã£o.");
    return;
  }

  const messageLanguage = getLanguageOption(message.targetLanguageCode || "");
  const language = messageLanguage?.code ? messageLanguage : getRoomLanguage(room);
  if (!language?.code) {
    showToast("Idioma nÃ£o definido", "Escolha um idioma para esta conversa antes de tentar novamente.");
    return;
  }

  if (button) {
    button.disabled = true;
    button.classList.add("is-loading");
  }

  updateLocalAiMessage(room.id, message.id, {
    text: PUBLIC_TRANSLATION_PENDING_TEXT,
    originalText: "",
    translatedText: "",
    translationSourceText: sourceText,
    translationStatus: "pending",
    translationError: false,
    deliveryStatus: "processing",
    pendingOffline: false,
    processingType: MESSAGE_PROCESSING_TRANSLATION,
    targetLanguageCode: language.code || "",
    targetLanguageName: language.name || ""
  });

  await translateLocalAiMessage(room.id, message.id, sourceText, language);
}

function getLetterTransportOption(transportId) {
  return LETTER_TRANSPORT_OPTIONS[transportId] || LETTER_TRANSPORT_OPTIONS[LETTER_DEFAULT_TRANSPORT_ID];
}

function normalizeLetterRouteCoordinates(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, LETTER_ROUTE_MAX_POINTS).map((point) => {
    if (!Array.isArray(point) || point.length < 2) return null;
    const latitude = Number(point[0]);
    const longitude = Number(point[1]);
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : null;
  }).filter(Boolean);
}

function normalizeLetterProtection(value) {
  if (!value || typeof value !== "object" || value.enabled !== true) return null;
  const challenge = value.challenge && typeof value.challenge === "object" ? value.challenge : {};
  const answerHash = sanitizeText(challenge.answerHash || "", 128);
  const sourceText = cleanMessageText(challenge.sourceText || "", 260);
  if (!answerHash || !sourceText) return null;
  return {
    enabled: true,
    challenge: {
      sourceText,
      sourceLanguageCode: sanitizeText(challenge.sourceLanguageCode || "", 16),
      sourceLanguageLabel: sanitizeText(challenge.sourceLanguageLabel || "Idioma de origem", 48),
      targetLanguageCode: sanitizeText(challenge.targetLanguageCode || "", 16),
      targetLanguageLabel: sanitizeText(challenge.targetLanguageLabel || "Idioma de destino", 48),
      direction: sanitizeText(challenge.direction || "", 32),
      answerHash
    }
  };
}

function normalizeLetterEncryptedPayload(value) {
  if (!value || typeof value !== "object") return null;
  const salt = sanitizeText(value.salt || "", 128);
  const iv = sanitizeText(value.iv || "", 128);
  const ciphertext = String(value.ciphertext || "").slice(0, 12000);
  if (!salt || !iv || !ciphertext) return null;
  return { version: 1, salt, iv, ciphertext };
}

function normalizeLetterPayload(value) {
  if (!value || typeof value !== "object") return null;
  const protection = normalizeLetterProtection(value.protection);
  const encryptedPayload = normalizeLetterEncryptedPayload(value.encryptedPayload);
  const title = sanitizeText(value.title || "", 60);
  const content = cleanMessageText(value.content || "", 1500);
  if (!protection && (!title || !content)) return null;
  if (protection && !encryptedPayload && (!title || !content)) return null;

  const transport = getLetterTransportOption(value.transport).id;
  const transportInfo = getLetterTransportOption(transport);
  const latitude = Number(value.latitude);
  const longitude = Number(value.longitude);
  const originLatitude = Number(value.originLatitude);
  const originLongitude = Number(value.originLongitude);
  const sentAtMillis = Number(value.sentAtMillis || Date.now());
  const requestedDuration = Number(value.durationMs || 0);
  const fallbackDuration = Number(transportInfo.fallbackDurationMs || 35000);
  const durationMs = Math.max(
    LETTER_MIN_DURATION_MS,
    Math.min(LETTER_MAX_DURATION_MS, Number.isFinite(requestedDuration) && requestedDuration > 0 ? requestedDuration : fallbackDuration)
  );
  const arrivalAtMillis = Number(value.arrivalAtMillis || sentAtMillis + durationMs);
  const routeMode = ["gps", "direct", "location", "approximate", "simulated"].includes(value.routeMode) ? value.routeMode : "simulated";
  const trajectoryMode = ["ground", "air", "orbital", "express"].includes(value.trajectoryMode)
    ? value.trajectoryMode
    : (transportInfo.trajectoryMode || "ground");
  const routeCoordinates = normalizeLetterRouteCoordinates(value.routeCoordinates);
  const routeDistanceMeters = Math.max(0, Number(value.routeDistanceMeters || 0) || 0);
  const speedKmh = Math.max(1, Number(value.speedKmh || transportInfo.speedKmh || 1));

  return {
    title: title || "Carta protegida",
    content,
    originalContent: cleanMessageText(value.originalContent || "", 1500),
    transport,
    turbo: Boolean(value.turbo),
    status: value.status === "delivered" ? "delivered" : "transit",
    sentAtMillis,
    durationMs,
    arrivalAtMillis: Number.isFinite(arrivalAtMillis) ? arrivalAtMillis : sentAtMillis + durationMs,
    routeMode,
    trajectoryMode,
    routeProvider: sanitizeText(value.routeProvider || "", 32),
    routeDistanceMeters,
    speedKmh,
    routeCoordinates,
    originMode: sanitizeText(value.originMode || "", 24),
    protection,
    encryptedPayload,
    ...(Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : {}),
    ...(Number.isFinite(originLatitude) && Number.isFinite(originLongitude) ? { originLatitude, originLongitude } : {})
  };
}

function normalizeLetterLocationRequest(value) {
  if (!value || typeof value !== "object") return null;
  const latitude = Number(value.latitude);
  const longitude = Number(value.longitude);
  return {
    requesterUid: sanitizeText(value.requesterUid || "", 180),
    status: Number.isFinite(latitude) && Number.isFinite(longitude) ? "shared" : "requested",
    ...(Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : {})
  };
}

function getLetterDeliveryTiming(letter, now = Date.now()) {
  const sentAtMillis = Number(letter?.sentAtMillis || now);
  const fallbackDuration = Number(getLetterTransportOption(letter?.transport).fallbackDurationMs || 35000);
  const durationMs = Math.max(LETTER_MIN_DURATION_MS, Number(letter?.durationMs || 0) || fallbackDuration);
  const elapsedMs = Math.max(0, now - sentAtMillis);
  const forcedDelivered = letter?.status === "delivered";
  const progress = forcedDelivered ? 1 : Math.max(0, Math.min(1, elapsedMs / durationMs));
  const remainingMs = forcedDelivered ? 0 : Math.max(0, durationMs - elapsedMs);
  return { sentAtMillis, durationMs, elapsedMs, progress, remainingMs, delivered: progress >= 1 };
}

function formatLetterDuration(durationMs, options = {}) {
  const totalSeconds = Math.max(0, Math.ceil(Number(durationMs || 0) / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days) return `${days}d${hours ? ` ${hours}h` : ""}`;
  if (hours) return `${hours}h${minutes ? ` ${minutes}min` : ""}`;
  if (!seconds || options.compact) return `${minutes} min`;
  return `${minutes} min ${seconds}s`;
}

function formatLetterDistance(distanceMeters) {
  const meters = Math.max(0, Number(distanceMeters || 0));
  if (meters < 1000) return `${Math.round(meters)} m`;
  const kilometers = meters / 1000;
  return `${kilometers < 10 ? kilometers.toFixed(1) : kilometers.toFixed(0)} km`;
}

function getLetterMapRoute(letter) {
  const storedCoordinates = normalizeLetterRouteCoordinates(letter?.routeCoordinates);
  if (storedCoordinates.length >= 2) {
    return {
      origin: storedCoordinates[0],
      destination: storedCoordinates.at(-1),
      coordinates: storedCoordinates,
      mode: letter.routeMode === "gps" ? "gps" : "direct"
    };
  }

  const destinationLatitude = Number(letter?.latitude);
  const destinationLongitude = Number(letter?.longitude);
  const originLatitude = Number(letter?.originLatitude);
  const originLongitude = Number(letter?.originLongitude);

  if (
    Number.isFinite(destinationLatitude) && Number.isFinite(destinationLongitude) &&
    Number.isFinite(originLatitude) && Number.isFinite(originLongitude)
  ) {
    const coordinates = [[originLatitude, originLongitude], [destinationLatitude, destinationLongitude]];
    return { origin: coordinates[0], destination: coordinates[1], coordinates, mode: "direct" };
  }

  if (Number.isFinite(destinationLatitude) && Number.isFinite(destinationLongitude)) {
    const approximateOrigin = createApproximateLetterOrigin(
      { latitude: destinationLatitude, longitude: destinationLongitude },
      Number(letter?.sentAtMillis || Date.now())
    );
    const coordinates = [[approximateOrigin.latitude, approximateOrigin.longitude], [destinationLatitude, destinationLongitude]];
    return { origin: coordinates[0], destination: coordinates[1], coordinates, mode: "approximate" };
  }

  const seed = Number(letter?.sentAtMillis || Date.now());
  const latitude = ((seed % 18) - 9) * 0.7;
  const longitudeOffset = 24 + (seed % 12);
  const coordinates = [[latitude - 5, -longitudeOffset], [latitude + 5, longitudeOffset]];
  return { origin: coordinates[0], destination: coordinates[1], coordinates, mode: "simulated" };
}

function calculateLetterPointDistanceMeters(pointA, pointB) {
  if (!pointA || !pointB) return 0;
  const earthRadius = 6371000;
  const lat1 = Number(pointA[0]) * Math.PI / 180;
  const lat2 = Number(pointB[0]) * Math.PI / 180;
  const deltaLat = (Number(pointB[0]) - Number(pointA[0])) * Math.PI / 180;
  const deltaLng = (Number(pointB[1]) - Number(pointA[1])) * Math.PI / 180;
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function getLetterRouteProgressSlices(coordinates, progress) {
  const points = normalizeLetterRouteCoordinates(coordinates);
  if (points.length < 2) {
    const point = points[0] || [0, 0];
    return { position: point, traveled: [point], remaining: [point] };
  }
  const segments = [];
  let totalDistance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const distance = calculateLetterPointDistanceMeters(points[index - 1], points[index]);
    segments.push(distance);
    totalDistance += distance;
  }
  const targetDistance = totalDistance * Math.max(0, Math.min(1, Number(progress || 0)));
  const traveled = [points[0]];
  let accumulated = 0;
  let position = points[0];
  let splitIndex = 1;
  for (let index = 1; index < points.length; index += 1) {
    const segmentDistance = segments[index - 1];
    if (accumulated + segmentDistance >= targetDistance) {
      const ratio = segmentDistance > 0 ? (targetDistance - accumulated) / segmentDistance : 0;
      position = [
        points[index - 1][0] + (points[index][0] - points[index - 1][0]) * ratio,
        points[index - 1][1] + (points[index][1] - points[index - 1][1]) * ratio
      ];
      traveled.push(position);
      splitIndex = index;
      break;
    }
    traveled.push(points[index]);
    accumulated += segmentDistance;
    position = points[index];
    splitIndex = index + 1;
  }
  if (targetDistance >= totalDistance) {
    position = points.at(-1);
    return { position, traveled: points, remaining: [position] };
  }
  return { position, traveled, remaining: [position, ...points.slice(splitIndex)] };
}

function getLetterRouteCaption(letter, mapRoute) {
  const transport = getLetterTransportOption(letter?.transport);
  const trajectoryMode = letter?.trajectoryMode || transport.trajectoryMode || "ground";
  if (trajectoryMode === "air") return "Trajeto aéreo direto entre a origem e o destino.";
  if (trajectoryMode === "orbital") return "Trajetória em arco orbital calculada para a Nave Courier.";
  if (trajectoryMode === "express") return "Corredor expresso em arco de alta altitude para o Astro-Rocket.";
  if (mapRoute.mode === "gps") return "Rota GPS calculada pelas vias entre a origem e o destino.";
  if (mapRoute.mode === "direct") return "Rota terrestre direta usada porque o serviço de navegação não respondeu.";
  if (mapRoute.mode === "approximate") return "Origem aproximada; o destino compartilhado permanece exato.";
  return "Rota simulada porque ainda não há duas localizações disponíveis.";
}

function createLetterMessageElement(letterValue, message = {}) {
  const letter = normalizeLetterPayload(letterValue);
  const card = document.createElement("article");
  const transportInfo = getLetterTransportOption(letter?.transport);
  const timing = getLetterDeliveryTiming(letter);
  const progressPercent = Math.round(timing.progress * 100);
  const protectedLabel = letter?.protection ? " · protegida por tradução" : "";
  const turboLabel = letter?.turbo ? " · turbina ativa" : "";
  const distanceLabel = letter?.routeDistanceMeters
    ? formatLetterDistance(letter.routeDistanceMeters)
    : "Calculando rota";

  card.className = "message-letter message-letter-compact message-letter-with-map";
  card.dataset.messageId = message?.id || "";
  card.innerHTML = `
    <header class="message-letter-head">
      <span class="message-letter-transport-icon"><i class="fa-solid ${escapeHtml(transportInfo.icon)}" aria-hidden="true"></i></span>
      <span class="message-letter-title-wrap">
        <strong>${letter?.protection ? "Carta protegida" : "Carta rastreável"}</strong>
        <small class="message-letter-status">${escapeHtml(transportInfo.name)}${escapeHtml(turboLabel)}${escapeHtml(protectedLabel)} · ${timing.delivered ? "entregue" : `${formatLetterDuration(timing.remainingMs)} restantes`}</small>
      </span>
      <span class="message-letter-percent">${progressPercent}%</span>
    </header>
    <section class="message-letter-tracking" aria-label="Rastreamento da carta">
      <div class="message-letter-tracking-meta">
        <span class="message-letter-distance"><i class="fa-solid fa-route" aria-hidden="true"></i>${escapeHtml(distanceLabel)}</span>
        <strong class="message-letter-eta">${timing.delivered ? "Chegou ao destino" : `Chegada em ${formatLetterDuration(timing.remainingMs)}`}</strong>
      </div>
      <div class="message-letter-map" aria-label="Mapa com a rota e a posição atual da carta"></div>
      <small class="message-letter-map-caption"></small>
      <div class="message-letter-route" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPercent}"><span style="width:${progressPercent}%"></span></div>
    </section>
    <button class="message-letter-open-button" type="button"><i class="fa-solid fa-envelope-open-text" aria-hidden="true"></i><span>Abrir carta</span></button>
  `;

  const button = card.querySelector(".message-letter-open-button");
  button?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openLetterViewer(letter, message);
  });

  const mapElement = card.querySelector(".message-letter-map");
  ["click", "pointerdown", "pointermove", "pointerup", "touchstart", "touchmove", "touchend", "wheel", "dblclick"].forEach((eventName) => {
    mapElement?.addEventListener(eventName, (event) => event.stopPropagation(), { passive: eventName.startsWith("touch") });
  });

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => initializeLetterTrackingCard(card, letter, transportInfo));
  });

  return card;
}

function initializeLetterTrackingCard(card, letter, transportInfo) {
  if (!card?.isConnected) return;

  const statusElement = card.querySelector(".message-letter-status");
  const percentageElement = card.querySelector(".message-letter-percent");
  const etaElement = card.querySelector(".message-letter-eta");
  const distanceElement = card.querySelector(".message-letter-distance");
  const routeElement = card.querySelector(".message-letter-route");
  const routeFill = routeElement?.querySelector("span");
  const mapElement = card.querySelector(".message-letter-map");
  const captionElement = card.querySelector(".message-letter-map-caption");
  const mapRoute = getLetterMapRoute(letter);
  let map = null;
  let vehicleMarker = null;
  let traveledLine = null;
  let remainingLine = null;
  let timer = 0;

  if (distanceElement) {
    const calculatedDistance = Number(letter?.routeDistanceMeters || 0) || mapRoute.coordinates.reduce((total, point, index) => {
      if (!index) return total;
      return total + calculateLetterPointDistanceMeters(mapRoute.coordinates[index - 1], point);
    }, 0);
    distanceElement.innerHTML = `<i class="fa-solid fa-route" aria-hidden="true"></i>${escapeHtml(formatLetterDistance(calculatedDistance))}`;
  }

  if (captionElement) {
    captionElement.textContent = getLetterRouteCaption(letter, mapRoute);
  }

  if (mapElement && window.L) {
    try {
      map = window.L.map(mapElement, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
        preferCanvas: true
      });
      window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        crossOrigin: true
      }).addTo(map);
      window.L.circleMarker(mapRoute.origin, {
        radius: 4,
        color: "#8aa7b1",
        weight: 2,
        fillColor: "#101b20",
        fillOpacity: 1,
        interactive: false
      }).addTo(map);
      window.L.circleMarker(mapRoute.destination, {
        radius: 5,
        color: "#9dffe0",
        weight: 2,
        fillColor: "#0b8f6f",
        fillOpacity: 1,
        interactive: false
      }).addTo(map);
      traveledLine = window.L.polyline([mapRoute.origin], {
        color: "#10b486",
        weight: 5,
        opacity: 0.96,
        lineCap: "round",
        lineJoin: "round",
        interactive: false
      }).addTo(map);
      remainingLine = window.L.polyline(mapRoute.coordinates, {
        color: "#72c5ff",
        weight: 4,
        opacity: 0.72,
        dashArray: "9 8",
        lineCap: "round",
        lineJoin: "round",
        interactive: false
      }).addTo(map);
      vehicleMarker = window.L.marker(mapRoute.origin, {
        icon: window.L.divIcon({
          className: "letter-map-vehicle-marker",
          html: `<span><i class="fa-solid ${escapeHtml(transportInfo.icon)}" aria-hidden="true"></i></span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        }),
        keyboard: false,
        interactive: false,
        zIndexOffset: 100
      }).addTo(map);
      map.fitBounds(window.L.latLngBounds(mapRoute.coordinates), {
        padding: [22, 22],
        maxZoom: mapRoute.mode === "simulated" ? 3 : 15,
        animate: false
      });
      window.setTimeout(() => map?.invalidateSize({ animate: false }), 100);
    } catch (error) {
      console.warn("Não foi possível montar o mapa de rastreamento na bolha da carta.", error);
      if (map) map.remove();
      map = null;
      mapElement.innerHTML = '<span class="letter-map-unavailable"><i class="fa-solid fa-map"></i> Mapa indisponível</span>';
    }
  } else if (mapElement) {
    mapElement.innerHTML = '<span class="letter-map-unavailable"><i class="fa-solid fa-map"></i> Mapa indisponível</span>';
  }

  const dispose = () => {
    if (timer) window.clearInterval(timer);
    timer = 0;
    if (map) map.remove();
    map = null;
  };

  const updateTracking = () => {
    if (!card.isConnected) {
      dispose();
      return false;
    }

    const timing = getLetterDeliveryTiming(letter);
    const progressPercent = Math.round(timing.progress * 100);
    const slices = getLetterRouteProgressSlices(mapRoute.coordinates, timing.progress);
    const protectedLabel = letter?.protection ? " · protegida por tradução" : "";
    const turboLabel = letter?.turbo ? " · turbina ativa" : "";

    if (statusElement) {
      statusElement.textContent = `${transportInfo.name}${turboLabel}${protectedLabel} · ${timing.delivered ? "entregue" : `${formatLetterDuration(timing.remainingMs)} restantes`}`;
    }
    if (percentageElement) percentageElement.textContent = `${progressPercent}%`;
    if (etaElement) etaElement.textContent = timing.delivered ? "Chegou ao destino" : `Chegada em ${formatLetterDuration(timing.remainingMs)}`;
    if (routeFill) routeFill.style.width = `${progressPercent}%`;
    if (routeElement) routeElement.setAttribute("aria-valuenow", String(progressPercent));
    card.classList.toggle("is-delivered", timing.delivered);

    if (vehicleMarker) vehicleMarker.setLatLng(slices.position);
    if (traveledLine) traveledLine.setLatLngs(slices.traveled);
    if (remainingLine) remainingLine.setLatLngs(slices.remaining);
    return !timing.delivered;
  };

  if (updateTracking()) {
    timer = window.setInterval(() => {
      if (!updateTracking()) {
        window.clearInterval(timer);
        timer = 0;
      }
    }, 1000);
  }
}

function getLetterSecretStore() {
  try { return JSON.parse(localStorage.getItem(LETTER_OPEN_SECRET_STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function getLetterSecretKey(roomId, messageId) {
  return `${sanitizeText(roomId || "", 180)}:${sanitizeText(messageId || "", 180)}`;
}

function rememberLetterOpenSecret(roomId, messageId, secret) {
  if (!roomId || !messageId || !secret) return;
  const store = getLetterSecretStore();
  store[getLetterSecretKey(roomId, messageId)] = secret;
  try { localStorage.setItem(LETTER_OPEN_SECRET_STORAGE_KEY, JSON.stringify(store)); } catch {}
}

function getRememberedLetterOpenSecret(roomId, messageId) {
  return getLetterSecretStore()[getLetterSecretKey(roomId, messageId)] || "";
}

function bytesToLetterBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function letterBase64ToBytes(value) {
  const binary = atob(String(value || ""));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hashLetterSecret(secret) {
  const normalizedSecret = normalizeLetterChallengeAnswer(secret);
  if (!normalizedSecret || !window.crypto?.subtle) return normalizedSecret;
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalizedSecret));
  return bytesToLetterBase64(new Uint8Array(digest));
}

async function deriveLetterEncryptionKey(secret, salt) {
  const material = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(normalizeLetterChallengeAnswer(secret)),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptLetterContent(payload, secret) {
  if (!window.crypto?.subtle) return null;
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveLetterEncryptionKey(secret, salt);
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(payload))
  );
  return { version: 1, salt: bytesToLetterBase64(salt), iv: bytesToLetterBase64(iv), ciphertext: bytesToLetterBase64(new Uint8Array(ciphertext)) };
}

async function decryptLetterContent(encryptedPayload, secret) {
  const encrypted = normalizeLetterEncryptedPayload(encryptedPayload);
  if (!encrypted || !window.crypto?.subtle) return null;
  const salt = letterBase64ToBytes(encrypted.salt);
  const iv = letterBase64ToBytes(encrypted.iv);
  const key = await deriveLetterEncryptionKey(secret, salt);
  const plaintext = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    letterBase64ToBytes(encrypted.ciphertext)
  );
  const value = JSON.parse(new TextDecoder().decode(plaintext));
  return {
    title: sanitizeText(value?.title || "Carta", 60),
    content: cleanMessageText(value?.content || "", 1500),
    originalContent: cleanMessageText(value?.originalContent || "", 1500)
  };
}

function closeLetterViewer() {
  if (letterViewerModal) {
    letterViewerModal.hidden = true;
    letterViewerModal.setAttribute("aria-hidden", "true");
  }
  if (activeLetterViewerTimer) window.clearInterval(activeLetterViewerTimer);
  activeLetterViewerTimer = 0;
  if (activeLetterViewerMap) activeLetterViewerMap.remove();
  activeLetterViewerMap = null;
  activeLetterViewerState = null;
}

async function openLetterViewer(letterValue, message = {}) {
  const letter = normalizeLetterPayload(letterValue);
  if (!letter || !letterViewerModal) return;
  closeLetterViewer();
  activeLetterViewerState = { letter, message, roomId: activeRoomId, unlockedContent: null };
  letterViewerModal.hidden = false;
  letterViewerModal.setAttribute("aria-hidden", "false");
  const transport = getLetterTransportOption(letter.transport);
  if (letterViewerIcon) letterViewerIcon.innerHTML = `<i class="fa-solid ${escapeHtml(transport.icon)}" aria-hidden="true"></i>`;
  if (letterViewerHeading) letterViewerHeading.textContent = letter.protection ? "Carta protegida" : "Carta rastreável";
  if (letterViewerStatus) letterViewerStatus.textContent = `${transport.name}${letter.turbo ? " · turbina ativa" : ""}`;
  if (letterViewerDistance) letterViewerDistance.textContent = letter.routeDistanceMeters ? formatLetterDistance(letter.routeDistanceMeters) : "Rota simulada";
  if (letterViewerSpeed) letterViewerSpeed.textContent = `${Math.round(letter.speedKmh || transport.speedKmh)} km/h`;
  if (letterViewerChallengeFeedback) {
    letterViewerChallengeFeedback.textContent = "";
    letterViewerChallengeFeedback.className = "letter-viewer-challenge-feedback";
  }
  if (letterViewerChallengeInput) letterViewerChallengeInput.value = "";
  initializeLetterViewerTracking(letter, transport);

  if (!letter.protection) {
    showLetterViewerContent({ title: letter.title, content: letter.content, originalContent: letter.originalContent });
    return;
  }

  const storedSecret = getRememberedLetterOpenSecret(activeLetterViewerState.roomId, message?.id || "");
  if (storedSecret) {
    try {
      const decrypted = await decryptLetterContent(letter.encryptedPayload, storedSecret);
      if (decrypted) {
        showLetterViewerContent(decrypted);
        return;
      }
    } catch {}
  }
  showLetterViewerChallenge(letter.protection.challenge);
}

function showLetterViewerChallenge(challenge) {
  if (letterViewerLockPanel) letterViewerLockPanel.hidden = false;
  if (letterViewerContentPanel) letterViewerContentPanel.hidden = true;
  if (letterViewerChallengeDirection) letterViewerChallengeDirection.textContent = `Traduza de ${challenge.sourceLanguageLabel} para ${challenge.targetLanguageLabel}`;
  if (letterViewerChallengePrompt) letterViewerChallengePrompt.textContent = challenge.sourceText;
  if (letterViewerChallengeInput) {
    letterViewerChallengeInput.placeholder = `Digite em ${challenge.targetLanguageLabel}`;
    window.setTimeout(() => letterViewerChallengeInput?.focus(), 80);
  }
}

function showLetterViewerContent(content) {
  if (!activeLetterViewerState) return;
  activeLetterViewerState.unlockedContent = content;
  if (letterViewerLockPanel) letterViewerLockPanel.hidden = true;
  if (letterViewerContentPanel) letterViewerContentPanel.hidden = false;
  if (letterViewerHeading) letterViewerHeading.textContent = content.title || "Carta";
  if (letterViewerTitle) letterViewerTitle.textContent = content.title || "Carta";
  if (letterViewerContent) letterViewerContent.textContent = content.content || "";
}

async function verifyLetterViewerChallenge() {
  const state = activeLetterViewerState;
  const answer = normalizeLetterChallengeAnswer(letterViewerChallengeInput?.value || "");
  const challenge = state?.letter?.protection?.challenge;
  if (!state || !answer || !challenge) return;
  if (letterViewerChallengeButton) setButtonBusy(letterViewerChallengeButton, true, "Verificando...");
  try {
    const answerHash = await hashLetterSecret(answer);
    if (answerHash !== challenge.answerHash) {
      if (letterViewerChallengeFeedback) {
        letterViewerChallengeFeedback.textContent = "Tradução incorreta. Revise a frase e tente novamente.";
        letterViewerChallengeFeedback.className = "letter-viewer-challenge-feedback is-error";
      }
      letterViewerChallengeInput?.classList.add("is-error");
      window.setTimeout(() => letterViewerChallengeInput?.classList.remove("is-error"), 420);
      return;
    }
    let decrypted = null;
    if (state.letter.encryptedPayload) decrypted = await decryptLetterContent(state.letter.encryptedPayload, answer);
    if (!decrypted) decrypted = { title: state.letter.title, content: state.letter.content, originalContent: state.letter.originalContent };
    rememberLetterOpenSecret(state.roomId, state.message?.id || "", answer);
    showLetterViewerContent(decrypted);
    showToast("Carta liberada", "A tradução está correta. A carta foi aberta.");
  } catch (error) {
    console.warn("Não foi possível abrir a carta protegida.", error);
    if (letterViewerChallengeFeedback) {
      letterViewerChallengeFeedback.textContent = "Não foi possível abrir a carta. Confira a tradução e tente novamente.";
      letterViewerChallengeFeedback.className = "letter-viewer-challenge-feedback is-error";
    }
  } finally {
    if (letterViewerChallengeButton) setButtonBusy(letterViewerChallengeButton, false);
  }
}

function initializeLetterViewerTracking(letter, transportInfo) {
  const mapRoute = getLetterMapRoute(letter);
  let vehicleMarker = null;
  let traveledLine = null;
  let remainingLine = null;
  if (activeLetterViewerMap) activeLetterViewerMap.remove();
  activeLetterViewerMap = null;
  if (letterViewerMap) letterViewerMap.replaceChildren();

  if (letterViewerMapCaption) {
    letterViewerMapCaption.textContent = getLetterRouteCaption(letter, mapRoute);
  }

  if (letterViewerMap && window.L) {
    try {
      activeLetterViewerMap = window.L.map(letterViewerMap, {
        zoomControl: true,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false
      });
      window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(activeLetterViewerMap);
      window.L.circleMarker(mapRoute.origin, { radius: 5, color: "#8aa7b1", weight: 2, fillColor: "#101b20", fillOpacity: 1 }).addTo(activeLetterViewerMap).bindTooltip("Origem");
      window.L.circleMarker(mapRoute.destination, { radius: 6, color: "#9dffe0", weight: 2, fillColor: "#0b8f6f", fillOpacity: 1 }).addTo(activeLetterViewerMap).bindTooltip("Destino");
      traveledLine = window.L.polyline([mapRoute.origin], { color: "#10b486", weight: 5, opacity: 0.95 }).addTo(activeLetterViewerMap);
      remainingLine = window.L.polyline(mapRoute.coordinates, { color: "#72c5ff", weight: 4, opacity: 0.72, dashArray: "9 8" }).addTo(activeLetterViewerMap);
      vehicleMarker = window.L.marker(mapRoute.origin, {
        icon: window.L.divIcon({
          className: "letter-map-vehicle-marker",
          html: `<span><i class="fa-solid ${escapeHtml(transportInfo.icon)}" aria-hidden="true"></i></span>`,
          iconSize: [38, 38], iconAnchor: [19, 19]
        }), keyboard: false
      }).addTo(activeLetterViewerMap);
      activeLetterViewerMap.fitBounds(window.L.latLngBounds(mapRoute.coordinates), { padding: [28, 28], maxZoom: mapRoute.mode === "simulated" ? 3 : 15 });
      window.setTimeout(() => activeLetterViewerMap?.invalidateSize(), 100);
    } catch (error) {
      console.warn("Não foi possível montar o mapa da carta.", error);
      if (letterViewerMap) letterViewerMap.innerHTML = '<span class="letter-map-unavailable"><i class="fa-solid fa-map"></i> Mapa indisponível</span>';
    }
  }

  const update = () => {
    if (!activeLetterViewerState || activeLetterViewerState.letter !== letter) return false;
    const timing = getLetterDeliveryTiming(letter);
    const percent = Math.round(timing.progress * 100);
    const slices = getLetterRouteProgressSlices(mapRoute.coordinates, timing.progress);
    if (letterViewerEta) letterViewerEta.textContent = timing.delivered ? "Entregue" : formatLetterDuration(timing.remainingMs);
    if (letterViewerProgressLabel) letterViewerProgressLabel.textContent = `${percent}%`;
    if (letterViewerProgressFill) letterViewerProgressFill.style.width = `${percent}%`;
    if (letterViewerProgress) letterViewerProgress.setAttribute("aria-valuenow", String(percent));
    if (letterViewerStatus) letterViewerStatus.textContent = `${transportInfo.name}${letter.turbo ? " · turbina ativa" : ""} · ${timing.delivered ? "entregue" : "em trânsito"}`;
    if (vehicleMarker) vehicleMarker.setLatLng(slices.position);
    if (traveledLine) traveledLine.setLatLngs(slices.traveled);
    if (remainingLine) remainingLine.setLatLngs(slices.remaining);
    return !timing.delivered;
  };
  if (activeLetterViewerTimer) window.clearInterval(activeLetterViewerTimer);
  activeLetterViewerTimer = 0;
  if (update()) activeLetterViewerTimer = window.setInterval(() => { if (!update()) { window.clearInterval(activeLetterViewerTimer); activeLetterViewerTimer = 0; } }, 1000);
}

function createLetterLocationRequestElement(message) {
  const request = normalizeLetterLocationRequest(message.letterLocationRequest);
  const card = document.createElement("section");
  card.className = "letter-location-request";
  const isRequester = request?.requesterUid === currentFirebaseUid;
  const shared = request?.status === "shared";
  card.innerHTML = `<strong><i class="fa-solid fa-location-dot"></i> Localização para entrega</strong><span>${shared ? "Localização compartilhada com segurança nesta conversa." : isRequester ? "Aguardando o destinatário compartilhar a localização." : "O remetente pediu sua localização para entregar uma carta."}</span>`;
  if (!shared && !isRequester) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "small-action";
    button.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i><span>Compartilhar minha localização</span>';
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      shareLocationForLetter(message, button);
    });
    card.appendChild(button);
  }
  return card;
}

async function shareLocationForLetter(message, button) {
  const room = getActiveRoom();
  if (!room?.id || !message?.id || !navigator.geolocation) {
    showToast("Localização indisponível", "Este aparelho não oferece acesso à localização.");
    return;
  }
  setButtonBusy(button, true, "Obtendo local...");
  try {
    const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }));
    await update(ref(db), {
      [`rooms/${room.id}/messages/${message.id}/letterLocationRequest/status`]: "shared",
      [`rooms/${room.id}/messages/${message.id}/letterLocationRequest/latitude`]: Number(position.coords.latitude),
      [`rooms/${room.id}/messages/${message.id}/letterLocationRequest/longitude`]: Number(position.coords.longitude),
      [`rooms/${room.id}/messages/${message.id}/letterLocationRequest/sharedAtMillis`]: Date.now()
    });
    showToast("Localização compartilhada", "Agora o remetente pode visualizar o destino no mapa.");
  } catch (error) {
    console.warn("Localização não compartilhada.", error);
    showToast("Permissão necessária", "Autorize a localização para compartilhar o destino da carta.");
    setButtonBusy(button, false);
  }
}

function createMessageElement(message, animated = false, options = {}) {
  message = getMessageWithLiveAuthorProfile(message);

  const row = document.createElement("div");
  const stack = document.createElement("div");
  const bubble = document.createElement("div");
  const time = document.createElement("time");
  const footer = document.createElement("div");

  const isMine = isMessageMine(message);
  const groupedWithPrevious = Boolean(options.groupedWithPrevious);
  const hasTranslation = Boolean(message.translatedText && message.originalText && message.translatedText !== message.originalText);
  row.className = `message-row ${isMine ? "sent" : "received"}${groupedWithPrevious ? " is-grouped" : ""}`;
  row.classList.toggle("pending-offline", Boolean(message.pendingOffline || message.deliveryStatus === "queued" || message.deliveryStatus === "processing"));
  row.classList.toggle("delivery-failed", message.deliveryStatus === "failed");
  row.dataset.messageId = message.id || "";
  row.dataset.signature = getMessageSignature(message);
  row.classList.toggle("message-selectable", messageSelectionMode);
  row.classList.toggle("message-selected", messageSelectionMode && selectedMessageIds.has(message.id));
  stack.className = "message-stack";
  bubble.className = `bubble${animated ? " is-new" : ""}`;
  const messageRoomId = options.roomId || activeRoomId;
  const localTranslationSourceText = getStoredTranslationSourceText(messageRoomId, message);
  if (localTranslationSourceText && isMine && (message.translationStatus === "pending" || message.translationError)) {
    bubble.dataset.translationSourceText = localTranslationSourceText;
    bubble.dataset.translationTargetLanguageCode = message.targetLanguageCode || "";
    bubble.dataset.translationMessageId = message.id || "";
    row.dataset.translationSourceAvailable = "1";
  }
  time.textContent = formatTime(message.time);

  const hydration = getCurrentUserHydration(message);
  const hasHydration = Boolean(hydration?.text);
  const learningFeedback = getVisibleLearningFeedback(message);
  let translatedBlock = null;

  if (message.learningTest) {
    row.classList.add("is-learning-test-row");
    bubble.classList.add("is-learning-test-message");
  }

  if (isLearningAnalysisPending(message)) {
    bubble.classList.add("is-learning-analysis-pending");
  }

  if (learningFeedback) {
    bubble.classList.add("has-learning-feedback");
  }

  const topBar = createMessageTopBar(message, isMine, !groupedWithPrevious);
  if (topBar) bubble.appendChild(topBar);

  if (message.learningTest) {
    bubble.appendChild(createLearningModeBadge(message));
  }

  if (message.replyTo) {
    bubble.appendChild(createReplyQuoteElement(message.replyTo));
  }

  if (message.letterLocationRequest) {
    bubble.appendChild(createLetterLocationRequestElement(message));
  } else if (message.letter) {
    bubble.classList.add("has-letter-message");
    bubble.appendChild(createLetterMessageElement(message.letter, message));
  } else if (hasHydration) {
    bubble.classList.add("is-hydrated-message");
    const hydrationActionKey = messageRoomId && message?.id ? `${messageRoomId}:${message.id}` : "";
    const shouldShowHydrationEffect = Boolean(hydrationActionKey && hydratingMessageIds.has(hydrationActionKey));

    if (shouldShowHydrationEffect) {
      bubble.classList.add("is-hydrating-message");
      const gooeyEffect = createHydratedGooeyDropsEffectElement();
      bubble.appendChild(gooeyEffect);
      scheduleHydratedGooeyDropsPopulation(gooeyEffect);
      window.setTimeout(() => {
        gooeyEffect.remove();
        bubble.classList.remove("is-hydrating-message");
      }, HYDRATION_EFFECT_DURATION_MS + 450);
    }

    translatedBlock = createHydratedMessageBlock(message, hydration);
    bubble.appendChild(translatedBlock.wrapper);
  } else if (hasTranslation) {
    translatedBlock = createTranslatedMessageBlock(message, isMine);
    bubble.appendChild(translatedBlock.wrapper);
  } else {
    const text = document.createElement("p");
    text.className = "message-text";
    renderMentionedText(text, message.text || message.originalText || "", message);
    bubble.appendChild(text);
  }

  if (learningFeedback) {
    bubble.appendChild(createLearningFeedbackElement(learningFeedback));
  }

  if (isLearningAnalysisPending(message) && !learningFeedback) {
    const warning = document.createElement("span");
    warning.className = "translation-warning is-pending learning-analysis-warning";
    warning.textContent = message.pendingOffline ? "Verificação aguardando internet..." : PUBLIC_LEARNING_TEST_PENDING_TEXT;
    bubble.appendChild(warning);
  } else if (message.learningFeedbackStatus === "error") {
    const warning = document.createElement("span");
    warning.className = "translation-warning learning-analysis-warning";
    warning.textContent = "Não foi possível analisar este texto agora.";
    bubble.appendChild(warning);
  } else if (message.translationError) {
    const warning = document.createElement("span");
    warning.className = "translation-warning";
    warning.textContent = "Tradução indisponível no envio";
    bubble.appendChild(warning);

    const retryButton = createTranslationRetryButton(message, messageRoomId);
    if (retryButton) bubble.appendChild(retryButton);
  } else if (message.translationStatus === "pending") {
    bubble.classList.add("is-translation-processing");
  }

  footer.className = "message-footer";
  const messageTools = translatedBlock
    ? createMessageFooterTools(message, translatedBlock)
    : isLearningTestMessage(message)
      ? createLearningTestMessageFooterTools(message)
      : null;

  const deliveryStatus = createMessageDeliveryStatusElement(message);
  const metaBadges = createMessageMetaBadgesElement(message);
  const translationProviderIcon = createTranslationProviderIcon(message.translationProvider);
  const aiProviderIcon = createAiProviderIcon(message.aiProvider);

  if (messageTools) {
    footer.classList.add("has-message-tools");
    footer.append(messageTools);
  }

  if (metaBadges.childElementCount) {
    footer.appendChild(metaBadges);
  }

  if (translationProviderIcon) footer.appendChild(translationProviderIcon);
  if (aiProviderIcon) footer.appendChild(aiProviderIcon);
  footer.appendChild(time);

  if (deliveryStatus) {
    footer.appendChild(deliveryStatus);
  }

  bubble.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input, textarea, select, .reaction-picker, .message-menu")) return;
    if (row.dataset.swipedRecently === "1" || row.dataset.longPressedRecently === "1") {
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
    if (messageSelectionMode) {
      toggleMessageSelection(message);
      return;
    }
    openMessageMenu(message, row, bubble);
  });

  bubble.appendChild(footer);
  stack.appendChild(bubble);

  const reactionSummary = createReactionSummaryElement(message);
  if (reactionSummary) {
    stack.appendChild(reactionSummary);
  }

  if (messageSelectionMode) {
   // row.appendChild(createMessageSelectionButton(message));
  }
  row.appendChild(stack);
  setupSwipeReply(row, bubble, message);
  return row;
}

function createMessageSelectionButton(message) {
  const button = document.createElement("button");
  const selected = Boolean(message?.id && selectedMessageIds.has(message.id));
  button.type = "button";
  button.className = `message-select-button${selected ? " is-selected" : ""}`;
  button.title = selected ? "Desmarcar mensagem" : "Selecionar mensagem";
  button.setAttribute("aria-label", button.title);
  button.innerHTML = `<i class="fa-solid ${selected ? "fa-check" : "fa-circle"}" aria-hidden="true"></i>`;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMessageSelection(message);
  });
  return button;
}

function createHydratedGooeyDropsEffectElement() {
  const effect = document.createElement("div");
  effect.className = "hydrated-water-effect";
  effect.dataset.hydratedGooey = "1";
  effect.setAttribute("aria-hidden", "true");
  effect.innerHTML = `
    <div class="hydrated-water-zone">
      <div class="hydrated-gooey-layer">
        <div class="hydrated-pool hydrated-pool-top"></div>
        <div class="hydrated-drops-layer hydrated-drops-down"></div>
        <div class="hydrated-drops-layer hydrated-drops-up"></div>
        <div class="hydrated-pool hydrated-pool-bottom"></div>
      </div>
    </div>
    <div class="hydrated-gooey-gloss"></div>
  `;
  return effect;
}

const HYDRATION_EFFECT_DURATION_MS = 1800;

const HYDRATED_GOOEY_DROP_SETTINGS = Object.freeze({
  downCount: 12,
  upCount: 12,
  minSize: 12,
  maxSize: 22,
  minDuration: 2.5,
  maxDuration: 4.1,
  maxDelay: 3.5
});

function scheduleHydratedGooeyDropsPopulation(effect, attempt = 0) {
  if (populateHydratedGooeyDrops(effect)) return;
  if (attempt >= 10) return;
  requestAnimationFrame(() => scheduleHydratedGooeyDropsPopulation(effect, attempt + 1));
}

function populateHydratedGooeyDrops(effect) {
  if (!effect?.isConnected) return false;

  const bubble = effect.closest(".bubble");
  const topPool = effect.querySelector(".hydrated-pool-top");
  const bottomPool = effect.querySelector(".hydrated-pool-bottom");
  const downLayer = effect.querySelector(".hydrated-drops-down");
  const upLayer = effect.querySelector(".hydrated-drops-up");
  if (!bubble || !topPool || !bottomPool || !downLayer || !upLayer) return false;

  const bubbleHeight = bubble.clientHeight;
  const topPoolHeight = topPool.offsetHeight;
  const bottomPoolHeight = bottomPool.offsetHeight;
  if (!bubbleHeight || !topPoolHeight || !bottomPoolHeight) return false;

  const downStart = topPoolHeight - 10;
  const upStart = bubbleHeight - bottomPoolHeight - 10;
  const downTravel = bubbleHeight - bottomPoolHeight - downStart;
  const upTravel = upStart - topPoolHeight;
  if (downTravel <= 0 || upTravel <= 0) return false;

  effect.style.setProperty("--start-down", `${downStart}px`);
  effect.style.setProperty("--start-up", `${upStart}px`);

  downLayer.innerHTML = "";
  upLayer.innerHTML = "";

  for (let index = 0; index < HYDRATED_GOOEY_DROP_SETTINGS.downCount; index += 1) {
    downLayer.appendChild(createHydratedGooeyDrop("down", downTravel));
  }

  for (let index = 0; index < HYDRATED_GOOEY_DROP_SETTINGS.upCount; index += 1) {
    upLayer.appendChild(createHydratedGooeyDrop("up", upTravel));
  }

  return true;
}

function createHydratedGooeyDrop(direction, travel) {
  const drop = document.createElement("span");
  const size =
    HYDRATED_GOOEY_DROP_SETTINGS.minSize +
    Math.random() * (HYDRATED_GOOEY_DROP_SETTINGS.maxSize - HYDRATED_GOOEY_DROP_SETTINGS.minSize);
  const left = 10 + Math.random() * 80;
  const duration =
    HYDRATED_GOOEY_DROP_SETTINGS.minDuration +
    Math.random() * (HYDRATED_GOOEY_DROP_SETTINGS.maxDuration - HYDRATED_GOOEY_DROP_SETTINGS.minDuration);
  const delay = Math.random() * HYDRATED_GOOEY_DROP_SETTINGS.maxDelay;
  const opacity = 0.72 + Math.random() * 0.18;
  const drift = -6 + Math.random() * 12;

  drop.className = `hydrated-gooey-drop is-${direction}`;
  drop.style.setProperty("--size", `${size}px`);
  drop.style.setProperty("--left", `${left}%`);
  drop.style.setProperty("--duration", `${duration}s`);
  drop.style.setProperty("--delay", `${delay}s`);
  drop.style.setProperty("--opacity", opacity.toFixed(3));
  drop.style.setProperty("--drift", `${drift.toFixed(2)}px`);
  drop.style.setProperty("--travel", `${travel}px`);
  drop.style.setProperty("--travel-up", `${(travel * -1).toFixed(2)}px`);
  drop.style.setProperty("--travel-up-squash", `${(travel * -1 - 6).toFixed(2)}px`);
  drop.style.setProperty("--travel-up-end", `${(travel * -1 - 12).toFixed(2)}px`);
  drop.style.setProperty("--dehydrate-shrink", `${(travel * 0.12).toFixed(2)}px`);
  drop.style.setProperty("--dehydrate-lift", `${(travel * -0.08).toFixed(2)}px`);
  return drop;
}

const DEHYDRATE_EFFECT_DURATION_MS = 2600;
const DEHYDRATED_STEAM_SETTINGS = Object.freeze([
  { left: 16, size: 10, duration: 2.1, delay: 0, x1: -8, x2: -28, x3: -60 },
  { left: 28, size: 8, duration: 1.9, delay: 0.25, x1: 10, x2: -10, x3: -30 },
  { left: 40, size: 12, duration: 2, delay: 0.5, x1: -6, x2: 16, x3: 40 },
  { left: 52, size: 9, duration: 1.8, delay: 0.7, x1: 14, x2: 28, x3: 58 },
  { left: 65, size: 11, duration: 2.15, delay: 0.95, x1: -10, x2: -24, x3: -55 },
  { left: 76, size: 8, duration: 1.85, delay: 1.2, x1: 12, x2: 34, x3: 65 },
  { left: 22, size: 7, duration: 1.75, delay: 1.45, x1: 14, x2: 40, x3: 85 },
  { left: 46, size: 9, duration: 2.05, delay: 1.7, x1: -15, x2: -44, x3: -88 },
  { left: 60, size: 8, duration: 1.95, delay: 1.95, x1: 8, x2: -8, x3: -28 },
  { left: 72, size: 10, duration: 2.1, delay: 2.2, x1: -16, x2: -38, x3: -78 }
]);

function startMessageDehydrateEffect(message) {
  const bubble = getRenderedMessageBubble(message);
  if (!bubble) {
    return {
      ready: Promise.resolve(),
      cancel() {},
      complete() {}
    };
  }

  bubble.classList.add("is-dehydrating-message");
  bubble.querySelector(".dehydrated-dust-effect")?.remove();
  bubble.querySelector(".dehydrated-solar-effect")?.remove();

  const solarEffect = createDehydratedSolarEffectElement();
  bubble.appendChild(solarEffect);
  populateDehydratedSteam(solarEffect);

  let cleanupTimer = window.setTimeout(cleanup, DEHYDRATE_EFFECT_DURATION_MS + 2600);
  const ready = new Promise((resolve) => window.setTimeout(resolve, DEHYDRATE_EFFECT_DURATION_MS));

  function cleanup() {
    if (cleanupTimer) {
      window.clearTimeout(cleanupTimer);
      cleanupTimer = 0;
    }
    solarEffect.remove();
    bubble.classList.remove("is-dehydrating-message");
  }

  return {
    ready,
    cancel: cleanup,
    complete() {
      if (cleanupTimer) window.clearTimeout(cleanupTimer);
      cleanupTimer = window.setTimeout(cleanup, 650);
    }
  };
}

function getRenderedMessageBubble(message) {
  const messageId = message?.id || "";
  if (!messageId || !messages) return null;

  return messages.querySelector(`.message-row[data-message-id="${CSS.escape(messageId)}"] .bubble`);
}

function createDehydratedSolarEffectElement() {
  const effect = document.createElement("div");
  effect.className = "dehydrated-solar-effect";
  effect.setAttribute("aria-hidden", "true");
  effect.innerHTML = `
    <div class="dehydrated-sun-light"></div>
    <div class="dehydrated-sun-wrap">
      <div class="dehydrated-sun-glow"></div>
      <div class="dehydrated-sun-rays"></div>
      <div class="dehydrated-sun-core"></div>
    </div>
    <div class="dehydrated-steam-layer"></div>
  `;
  return effect;
}

function populateDehydratedSteam(effect) {
  const layer = effect?.querySelector(".dehydrated-steam-layer");
  if (!layer) return;

  layer.innerHTML = "";

  DEHYDRATED_STEAM_SETTINGS.forEach((steamSettings) => {
    const steam = document.createElement("span");
    steam.className = "dehydrated-steam";
    steam.style.setProperty("--left", `${steamSettings.left}%`);
    steam.style.setProperty("--size", `${steamSettings.size}px`);
    steam.style.setProperty("--duration", `${steamSettings.duration}s`);
    steam.style.setProperty("--delay", `${steamSettings.delay}s`);
    steam.style.setProperty("--x1", `${steamSettings.x1}px`);
    steam.style.setProperty("--x2", `${steamSettings.x2}px`);
    steam.style.setProperty("--x3", `${steamSettings.x3}px`);
    layer.appendChild(steam);
  });
}

let hydratedGooeyResizeFrame = 0;
window.addEventListener("resize", () => {
  if (hydratedGooeyResizeFrame) cancelAnimationFrame(hydratedGooeyResizeFrame);
  hydratedGooeyResizeFrame = requestAnimationFrame(() => {
    document
      .querySelectorAll('.hydrated-water-effect[data-hydrated-gooey="1"]')
      .forEach((effect) => populateHydratedGooeyDrops(effect));
  });
});

function createMessageTopBar(message, isMine, showAuthor = true) {
  const hasAuthor = showAuthor && !isMine && (message.authorNick || message.author);
  if (!hasAuthor) return null;

  const topBar = document.createElement("div");
  const left = document.createElement("div");
  const author = document.createElement("span");

  topBar.className = "message-bubble-top";
  left.className = "message-bubble-author";
  author.className = "author-label";
  author.textContent = message.authorNick || message.author;

  left.appendChild(author);
  topBar.appendChild(left);
  return topBar;
}

function createMessageMetaBadgesElement(message) {
  const wrap = document.createElement("span");
  wrap.className = "message-meta-badges";

  if (message?.forwarded) {
    const badge = document.createElement("span");
    badge.className = "message-meta-badge forwarded";
    badge.title = message.forwardedFromRoomName
      ? `Encaminhada de ${message.forwardedFromRoomName}`
      : "Mensagem encaminhada";
    badge.innerHTML = `<i class="fa-solid fa-share" aria-hidden="true"></i>`;
    badge.appendChild(document.createTextNode("Encaminhada"));
    wrap.appendChild(badge);
  }

  if (message?.edited) {
    const badge = document.createElement("span");
    badge.className = "message-meta-badge edited";
    badge.title = message.editedAtMillis
      ? `Editada em ${formatDateTime(message.editedAtMillis)}`
      : "Mensagem editada";
    badge.innerHTML = `<i class="fa-solid fa-pen" aria-hidden="true"></i>`;
    badge.appendChild(document.createTextNode("Editada"));
    wrap.appendChild(badge);
  }

  return wrap;
}

function createMessageFooterTools(message, blockInfo) {
  return null;
}

function createLearningTestMessageFooterTools(message) {
  return null;
}

function isLearningAnalysisPending(message) {
  return Boolean(
    message?.learningFeedbackStatus === "pending" ||
    (message?.processingType === MESSAGE_PROCESSING_LEARNING_TEST && message?.deliveryStatus === "processing")
  );
}

function createLearningModeBadge(message) {
  const badge = document.createElement("span");
  const pending = isLearningAnalysisPending(message);
  const hasFeedback = Boolean(getVisibleLearningFeedback(message));
  const isDone = message?.learningFeedbackStatus === "done" || hasFeedback;

  badge.className = "learning-mode-badge";
  badge.innerHTML = `
    <i class="fa-solid ${pending ? "fa-spinner fa-spin" : isDone ? "fa-circle-check" : "fa-graduation-cap"}" aria-hidden="true"></i>
    <span>${pending ? "Teste de aprendizado" : isDone ? "Aprendizado analisado" : "Modo aprendizado"}</span>
  `;
  return badge;
}

function getVisibleLearningFeedback(message) {
  if (!isLearningTestMessage(message)) return null;
  return normalizeLearningFeedback(message?.learningFeedback);
}

function createLearningFeedbackElement(feedback) {
  const box = document.createElement("article");
  const corrected = cleanMessageText(feedback?.correctedText || "", 800);
  const nativeTranslation = cleanMessageText(feedback?.nativeTranslationText || "", 800);
  const targetLabel = feedback?.targetLanguageLabel || feedback?.targetLanguageName || "idioma da sala";
  const nativeLabel = feedback?.nativeLanguageLabel || feedback?.nativeLanguageName || "seu idioma";
  const errors = Array.isArray(feedback?.errors) ? feedback.errors : [];

  box.className = "learning-feedback-card";

  const head = document.createElement("div");
  head.className = "learning-feedback-head";
  head.innerHTML = `<i class="fa-solid fa-graduation-cap" aria-hidden="true"></i><span>Correção para aprender</span>`;
  box.appendChild(head);

  if (corrected) {
    box.appendChild(createLearningFeedbackTextBlock(`Correção em ${targetLabel}`, corrected, "learning-feedback-corrected"));
  }

  if (nativeTranslation) {
    box.appendChild(createLearningFeedbackTextBlock(`Tradução em ${nativeLabel}`, nativeTranslation, "learning-feedback-native"));
  } else if (feedback?.nativeTranslationError) {
    const unavailable = document.createElement("small");
    unavailable.className = "learning-feedback-native-unavailable";
    unavailable.textContent = `Nao consegui traduzir a correcao para ${nativeLabel} agora.`;
    box.appendChild(unavailable);
  }

  if (errors.length) {
    const list = document.createElement("div");
    list.className = "learning-feedback-errors";
    errors.forEach((error) => {
      const item = document.createElement("div");
      const explanationEnglish = error.explanationEnglish || error.explanation || "";
      const explanationTranslation = error.explanationTranslation || "";
      item.className = "learning-feedback-error";
      item.innerHTML = `
        <strong>${escapeHtml(error.original || "Trecho")}</strong>
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        <span>${escapeHtml(error.correction || "Correção sugerida")}</span>
        ${explanationEnglish ? `<small class="learning-error-explanation-en">${escapeHtml(explanationEnglish)}</small>` : ""}
        ${explanationTranslation ? `<small class="learning-error-explanation-native">${escapeHtml(explanationTranslation)}</small>` : ""}
        ${!explanationTranslation && error.explanationTranslationError ? `<small class="learning-error-explanation-native">Nao consegui traduzir esta explicacao agora.</small>` : ""}
      `;
      list.appendChild(item);
    });
    box.appendChild(list);
  }

  return box;
}

function createLearningFeedbackTextBlock(label, text, className) {
  const wrap = document.createElement("div");
  const title = document.createElement("small");
  const value = document.createElement("p");

  wrap.className = `learning-feedback-text-block ${className}`;
  title.textContent = label;
  value.textContent = text;
  wrap.append(title, value);
  return wrap;
}

function createTranslatedMessageBlock(message, isMine) {
  const wrapper = document.createElement("div");
  const translated = document.createElement("p");
  const originalWrap = document.createElement("div");
  const divider = document.createElement("div");
  const original = document.createElement("p");
  const revealKey = getMessageRevealKey(message);
  const shouldHideOriginal = !revealedOriginalMessageIds.has(revealKey);

  wrapper.className = "translated-block";
  translated.className = "message-translated";
  renderMentionedText(translated, message.translatedText, message);

  divider.className = "message-divider";
  originalWrap.className = "message-original-wrap";
  originalWrap.dataset.revealKey = revealKey;
  original.className = "message-original";
  renderMentionedText(original, message.originalText, message);

  originalWrap.append(divider, original);
  originalWrap.hidden = shouldHideOriginal;

  wrapper.append(translated, originalWrap);
  return { wrapper, originalWrap };
}

function createTranslationProviderIcon(provider) {
  const safeProvider = sanitizeText(provider || "", 32);
  if (!safeProvider) return null;

  const icon = document.createElement("span");
  icon.className = "translation-provider-icon";
  icon.title = `Traduzido com ${safeProvider}`;
  icon.setAttribute("aria-label", icon.title);

  if (safeProvider === "Gemini") {
    icon.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>';
  } else if (safeProvider === "MyMemory") {
    icon.innerHTML = '<i class="fa-solid fa-brain" aria-hidden="true"></i>';
  } else if (safeProvider === "Pollinations.AI") {
    icon.textContent = "🌸";
  } else {
    return null;
  }

  return icon;
}

function createAiProviderIcon(provider) {
  const safeProvider = sanitizeText(provider || "", 32);
  if (!safeProvider) return null;

  const icon = document.createElement("span");
  icon.className = "ai-provider-icon";
  icon.title = `IA usada: ${safeProvider}`;
  icon.setAttribute("aria-label", icon.title);

  if (safeProvider === "Gemini") {
    icon.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>';
  } else if (safeProvider === "Pollinations.AI") {
    icon.textContent = "🌸";
  } else {
    icon.innerHTML = '<i class="fa-solid fa-robot" aria-hidden="true"></i>';
  }

  return icon;
}

function createHydratedMessageBlock(message, hydration) {
  const wrapper = document.createElement("div");
  const badge = document.createElement("span");
  const hydrated = document.createElement("p");
  const originalWrap = document.createElement("div");
  const originalDivider = document.createElement("div");
  const original = document.createElement("p");
  const translationWrap = document.createElement("div");
  const translationDivider = document.createElement("div");
  const translation = document.createElement("p");
  const originalText = getHydratedMessageOriginalText(message, hydration);
  const originalRevealKey = getMessageRevealKey({ ...message, id: `${message.id || "msg"}:hydrated:original` });
  const translationRevealKey = getMessageRevealKey({ ...message, id: `${message.id || "msg"}:hydrated:native:${getCurrentNativeLanguage().code}` });
  const shouldHideOriginal = !revealedOriginalMessageIds.has(originalRevealKey);
  const shouldHideTranslation = !revealedOriginalMessageIds.has(translationRevealKey);

  wrapper.className = "translated-block hydrated-block";
  badge.className = "hydrated-badge";
  badge.innerHTML = `<i class="fa-solid fa-droplet" aria-hidden="true"></i><span>hidratada</span>`;

  hydrated.className = "message-translated hydrated-text";
  hydrated.textContent = hydration.text;

  originalDivider.className = "message-divider";
  originalWrap.className = "message-original-wrap hydration-source-wrap";
  originalWrap.dataset.revealKey = originalRevealKey;
  original.className = "message-original hydration-source-text";
  original.textContent = originalText;
  originalWrap.append(originalDivider, original);
  originalWrap.hidden = shouldHideOriginal;

  translationDivider.className = "message-divider";
  translationWrap.className = "message-original-wrap hydration-translation-wrap";
  translationWrap.dataset.revealKey = translationRevealKey;
  translationWrap.dataset.hydrationText = hydration.text || "";
  translationWrap.dataset.translationReady = "0";
  translation.className = "message-original hydration-translation-text";
  translation.textContent = "";
  translationWrap.append(translationDivider, translation);
  translationWrap.hidden = shouldHideTranslation;

  if (!shouldHideTranslation) {
    const cached = getCachedHydratedNativeTranslation(message, hydration);
    translation.textContent = cached || `Traduzindo para ${getCurrentNativeLanguage().label}...`;
    if (cached) translationWrap.dataset.translationReady = "1";
    else requestAnimationFrame(() => ensureHydratedNativeTranslation(message, hydration, translationWrap));
  }

  wrapper.append(badge, hydrated, originalWrap, translationWrap);
  return { wrapper, originalWrap, translationWrap };
}

function shouldShowInlineSpeechPlaybackButton(message, roomId = activeRoomId) {
  if (!isSpeechPlaybackEnabledForRoom(roomId)) return false;
  if (message?.translationStatus === "pending" && message?.deliveryStatus === "processing") return false;
  return Boolean(getMessageAudioText(message));
}

function createInlineSpeechPlaybackElement(message) {
  const wrap = document.createElement("div");
  const geminiButton = document.createElement("button");
  const browserButton = document.createElement("button");

  wrap.className = "message-inline-audio";
  geminiButton.className = "message-inline-audio-button gemini-voice-button";
  geminiButton.type = "button";
  geminiButton.title = "Gerar voz com Gemini";
  geminiButton.setAttribute("aria-label", geminiButton.title);
  geminiButton.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i><span>Gerar voz</span>`;
  geminiButton.addEventListener("click", (event) => {
    event.stopPropagation();
    speakMessage(message);
  });

  browserButton.className = "message-inline-audio-button browser-voice-button";
  browserButton.type = "button";
  browserButton.title = "Ouvir com o sintetizador do navegador";
  browserButton.setAttribute("aria-label", browserButton.title);
  browserButton.innerHTML = `<i class="fa-solid fa-volume-high" aria-hidden="true"></i><span>Ouvir</span>`;
  browserButton.addEventListener("click", (event) => {
    event.stopPropagation();
    speakMessageWithBrowserVoice(message);
  });

  wrap.append(geminiButton, browserButton);
  return wrap;
}

function createListenMessageButton(message) {
  const button = document.createElement("button");
  button.className = "listen-message-button translated-tool-button";
  button.type = "button";
  button.title = "Gerar voz natural com Gemini";
  button.setAttribute("aria-label", "Gerar voz natural para a mensagem");
  button.innerHTML = `<i class="fa-solid fa-volume-high" aria-hidden="true"></i>`;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    speakMessage(message);
  });
  return button;
}

function updateOriginalToggleButton(button, isHidden) {
  if (!button) return;
  button.title = isHidden ? "Mostrar original" : "Ocultar original";
  button.setAttribute("aria-label", isHidden ? "Mostrar mensagem original" : "Ocultar mensagem original");
  button.innerHTML = `<i class="fa-${isHidden ? "regular" : "solid"} fa-eye" aria-hidden="true"></i>`;
}

function updateTranslationToggleButton(button, isHidden) {
  if (!button) return;
  button.title = isHidden ? "Mostrar tradução" : "Ocultar tradução";
  button.setAttribute("aria-label", isHidden ? "Mostrar tradução da mensagem" : "Ocultar tradução da mensagem");
  button.innerHTML = `<i class="fa-solid fa-language" aria-hidden="true"></i>`;
}

function toggleOriginalTextVisibility(message, originalWrap, toggleOriginal) {
  toggleMessageExtraVisibility(message, originalWrap, toggleOriginal, updateOriginalToggleButton);
}

async function toggleTranslationTextVisibility(message, translationWrap, toggleTranslation) {
  const hydration = getCurrentUserHydration(message);
  const isHydratedTranslation = Boolean(hydration?.text && translationWrap?.classList?.contains("hydration-translation-wrap"));

  if (isHydratedTranslation && translationWrap?.hidden) {
    translationWrap.hidden = false;
    revealedOriginalMessageIds.add(translationWrap.dataset.revealKey || getMessageRevealKey(message));
    updateTranslationToggleButton(toggleTranslation, false);
    await ensureHydratedNativeTranslation(message, hydration, translationWrap);
    return;
  }

  toggleMessageExtraVisibility(message, translationWrap, toggleTranslation, updateTranslationToggleButton);
}

function toggleMessageExtraVisibility(message, wrap, button, updateButton) {
  if (!message || !wrap) return;

  const revealKey = wrap.dataset.revealKey || getMessageRevealKey(message);
  const isHidden = wrap.hidden;
  wrap.hidden = !isHidden;

  if (isHidden) {
    revealedOriginalMessageIds.add(revealKey);
  } else {
    revealedOriginalMessageIds.delete(revealKey);
  }

  if (button && updateButton) {
    updateButton(button, wrap.hidden);
  }
}

function wasMessageSentWithLearningTest(message) {
  return Boolean(message?.learningTest || message?.processingType === MESSAGE_PROCESSING_LEARNING_TEST || message?.learningFeedback || message?.learningFeedbackStatus);
}

function createLearningAnalysisMenuButton(message) {
  const activeRoom = getActiveRoom();
  if (!activeRoom || isAiRoom(activeRoom) || !message?.id) return null;
  if (!wasMessageSentWithLearningTest(message)) return null;

  const isPending = isLearningAnalysisPending(message) || pendingLearningAnalysisKeys.has(getLearningAnalysisJobKey(activeRoom.id, message.id));
  const hasText = Boolean(getLearningAnalysisSourceText(message));
  const hasFeedback = Boolean(getVisibleLearningFeedback(message));
  const label = isPending ? "Analisando..." : hasFeedback ? "Reanalisar" : "Analisar";
  const button = createMenuButton(
    isPending ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-magnifying-glass-chart",
    label,
    () => analyzeMessageWriting(message)
  );

  button.disabled = isPending || !hasText;
  button.title = isPending
    ? "Aguarde a IA terminar a análise"
    : hasText
      ? "Pedir análise ortográfica para a IA"
      : "Sem texto para analisar";
  return button;
}

function getMessageEnglishAiText(message) {
  const feedback = normalizeLearningFeedback(message?.learningFeedback);
  if (feedback?.correctedText && String(getRoomLanguage(getActiveRoom())?.code || "").toLowerCase() === "en") {
    return cleanMessageText(feedback.correctedText, 2000);
  }
  const explanations = (feedback?.errors || []).map((error) => error?.explanationEnglish || "").filter(Boolean);
  if (explanations.length) return cleanMessageText(explanations.join("\n\n"), 2000);
  if (String(message?.targetLanguageCode || "").toLowerCase() === "en") {
    return cleanMessageText(message?.translatedText || message?.text || "", 2000);
  }
  return "";
}

function closeMessageAiTranslationModal() {
  if (!messageAiTranslationModal) return;
  messageAiTranslationModal.hidden = true;
  messageAiTranslationModal.setAttribute("aria-hidden", "true");
}

async function openMessageAiTranslationModal(message) {
  const sourceText = getMessageEnglishAiText(message);
  if (!sourceText || !messageAiTranslationModal) return;
  const nativeLanguage = getCurrentNativeLanguage();
  messageAiTranslationSource.textContent = sourceText;
  messageAiTranslationTargetLabel.textContent = `Tradução para ${nativeLanguage.label}`;
  messageAiTranslationSubtitle.textContent = `Do inglês para ${nativeLanguage.label}, usando IA.`;
  messageAiTranslationResult.textContent = "Traduzindo...";
  messageAiTranslationModal.hidden = false;
  messageAiTranslationModal.setAttribute("aria-hidden", "false");

  try {
    const result = await translateMessageTextResult(sourceText, nativeLanguage, {
      onProgress: (partialText) => {
        if (!messageAiTranslationModal.hidden) messageAiTranslationResult.textContent = partialText;
      }
    });
    if (!messageAiTranslationModal.hidden) messageAiTranslationResult.textContent = result.text || "Tradução indisponível.";
  } catch (error) {
    console.warn("Não foi possível traduzir o conteúdo inglês do balão.", error);
    if (!messageAiTranslationModal.hidden) messageAiTranslationResult.textContent = "Não foi possível traduzir este conteúdo agora.";
  }
}

function openMessageMenu(message, row, bubble) {
  closeReactionPickers();
  closeMessageMenus();

  const menu = document.createElement("div");
  const hasOriginal = Boolean(message?.originalText || message?.hydration?.sourceText);
  const originalWrap = bubble.querySelector(".hydration-source-wrap, .message-original-wrap");
  const originalButton = bubble.querySelector(".show-original-button");
  const translationWrap = bubble.querySelector(".hydration-translation-wrap");
  const translationButton = bubble.querySelector(".show-translation-button");

  menu.className = "message-menu";
  menu.setAttribute("role", "menu");
  menu.dataset.messageId = message?.id || "";

  const geminiVoiceAction = createMenuButton("fa-solid fa-wand-magic-sparkles", "Gerar voz (Gemini)", () => {
    closeMessageMenus();
    speakMessage(message);
  });
  const browserVoiceAction = createMenuButton("fa-solid fa-volume-high", "Ouvir (navegador)", () => {
    closeMessageMenus();
    speakMessageWithBrowserVoice(message);
  });

  menu.append(geminiVoiceAction, browserVoiceAction);

  if (getMessageEnglishAiText(message)) {
    menu.appendChild(createMenuButton("fa-solid fa-language", "Traduzir pela IA", () => {
      closeMessageMenus();
      openMessageAiTranslationModal(message);
    }));
  }

  const analyzeAction = createLearningAnalysisMenuButton(message);
  if (analyzeAction) menu.appendChild(analyzeAction);

  if (translationWrap) {
    const label = translationWrap.hidden ? "Ver tradução" : "Ocultar tradução";
    menu.appendChild(createMenuButton("fa-solid fa-language", label, () => {
      closeMessageMenus();
      toggleTranslationTextVisibility(message, translationWrap, translationButton);
    }));
  }

  const activeRoom = getActiveRoom();
  const hasGlobalHydration = !isLearningTestMessage(message) && Boolean(message?.hydration?.text || getCurrentUserHydration(message)?.text);
  const canHydrate = !isLearningTestMessage(message) && !isMessageMine(message) && activeRoom && !isAiRoom(activeRoom) && Boolean(message?.id);
  const hydrateActionKey = activeRoom && message?.id ? `${activeRoom.id}:${message.id}` : "";

  if (hasGlobalHydration && activeRoom && !isAiRoom(activeRoom) && Boolean(message?.id)) {
    const isDehydrating = hydrateActionKey && dehydratingMessageIds.has(hydrateActionKey);
    const dehydrateAction = createMenuButton(
      isDehydrating ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-droplet-slash",
      isDehydrating ? "Desidratando..." : "Desidratar",
      () => dehydrateMessage(message)
    );
    dehydrateAction.disabled = isDehydrating;
    menu.appendChild(dehydrateAction);
  } else if (canHydrate) {
    const isHydrating = hydratingMessageIds.has(hydrateActionKey);
    const hydrateAction = createMenuButton(
      isHydrating ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-droplet",
      isHydrating ? "Hidratando..." : "Hidratar",
      () => hydrateReceivedMessage(message)
    );
    hydrateAction.disabled = isHydrating;
    menu.appendChild(hydrateAction);
  }

  if (hasOriginal && originalWrap) {
    const label = originalWrap.hidden ? "Ver original" : "Ocultar original";
    const icon = originalWrap.hidden ? "fa-regular fa-eye" : "fa-solid fa-eye";
    menu.appendChild(createMenuButton(icon, label, () => {
      closeMessageMenus();
      toggleOriginalTextVisibility(message, originalWrap, originalButton);
    }));
  }

  const selectAction = createSelectMessageMenuButton(message);
  if (selectAction) menu.appendChild(selectAction);

  const editAction = createEditMessageMenuButton(message);
  if (editAction) menu.appendChild(editAction);

  const deleteAction = createDeleteMessageMenuButton(message);
  if (deleteAction) menu.appendChild(deleteAction);

  document.body.appendChild(menu);
  positionFloatingMenu(menu, bubble);
}

function createEditMessageMenuButton(message) {
  if (!canEditMessageForEveryone(message, getActiveRoom())) return null;
  return createMenuButton("fa-solid fa-pen", "Editar", () => {
    closeMessageMenus();
    startMessageEdit(message);
  });
}

function createDeleteMessageMenuButton(message) {
  if (!canDeleteMessageForEveryone(message, getActiveRoom())) return null;
  return createMenuButton("fa-solid fa-trash-can", "Apagar para todos", () => {
    closeMessageMenus();
    deleteMessagesForEveryone([message.id]);
  });
}

function createSelectMessageMenuButton(message) {
  const activeRoom = getActiveRoom();
  if (!activeRoom?.id || isAiRoom(activeRoom) || !message?.id) return null;
  return createMenuButton("fa-solid fa-check-double", "Selecionar", () => {
    closeMessageMenus();
    beginMessageSelection(message);
  });
}

function createMenuButton(iconClass, label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "menuitem");
  button.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i><span>${escapeHtml(label)}</span>`;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

function positionFloatingMenu(menu, anchor) {
  const rect = anchor.getBoundingClientRect();
  const padding = 10;
  const menuWidth = menu.offsetWidth || 190;
  const menuHeight = menu.offsetHeight || 160;
  const preferRight = rect.left + rect.width / 2 < window.innerWidth / 2;

  let left = preferRight ? rect.right + 8 : rect.left - menuWidth - 8;
  let top = rect.top + Math.min(26, rect.height / 2);

  left = Math.max(padding, Math.min(left, window.innerWidth - menuWidth - padding));
  top = Math.max(padding, Math.min(top, window.innerHeight - menuHeight - padding));

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function closeMessageMenus() {
  document.querySelectorAll(".message-menu").forEach((menu) => menu.remove());
}

function setMessageSelectionMode(enabled, options = {}) {
  const activeRoom = getActiveRoom();
  messageSelectionMode = Boolean(enabled && activeRoom && !isAiRoom(activeRoom));

  if (!messageSelectionMode) {
    selectedMessageIds.clear();
  } else {
    cancelMessageEdit();
  }

  document.body.classList.toggle("message-selection-active", messageSelectionMode);
  updateMessageSelectionToolbar();

  if (!options.keepRender && activeRoom?.id) {
    forceMessageRerender(activeRoom.id);
    renderRoomMessages(activeRoom);
  }
}

function beginMessageSelection(message) {
  if (!message?.id) return;

  setMessageSelectionMode(true);
  selectedMessageIds.add(message.id);
  syncMessageSelectionRow(message.id);
  updateMessageSelectionToolbar();
}

function toggleMessageSelection(message) {
  if (!messageSelectionMode || !message?.id) return;

  if (selectedMessageIds.has(message.id)) {
    selectedMessageIds.delete(message.id);
  } else {
    selectedMessageIds.add(message.id);
  }

  syncMessageSelectionRow(message.id);
  updateMessageSelectionToolbar();
}

function syncMessageSelectionRow(messageId) {
  if (!messageId) return;

  const row = messages?.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
  const isSelected = selectedMessageIds.has(messageId);
  row?.classList.toggle("message-selected", isSelected);

  const check = row?.querySelector(".message-select-button");
  if (check) {
    check.classList.toggle("is-selected", isSelected);
    check.title = isSelected ? "Desmarcar mensagem" : "Selecionar mensagem";
    check.setAttribute("aria-label", check.title);
    check.innerHTML = `<i class="fa-solid ${isSelected ? "fa-check" : "fa-circle"}" aria-hidden="true"></i>`;
  }
}

function ensureMessageSelectionToolbar() {
  let toolbar = document.querySelector("#messageSelectionToolbar");
  if (toolbar) return toolbar;

  toolbar = document.createElement("section");
  toolbar.id = "messageSelectionToolbar";
  toolbar.className = "message-selection-toolbar";
  toolbar.hidden = true;
  toolbar.innerHTML = `
    <strong id="messageSelectionCount">0 selecionadas</strong>
    <div class="message-selection-actions">
      <button class="message-selection-action" id="messageSelectionEditButton" type="button" title="Editar mensagem selecionada">
        <i class="fa-solid fa-pen" aria-hidden="true"></i><span>Editar</span>
      </button>
      <button class="message-selection-action" id="messageSelectionForwardButton" type="button" title="Encaminhar mensagens para outras salas">
        <i class="fa-solid fa-share" aria-hidden="true"></i><span>Encaminhar</span>
      </button>
      <button class="message-selection-action danger" id="messageSelectionDeleteButton" type="button" title="Apagar mensagens para todos">
        <i class="fa-solid fa-trash-can" aria-hidden="true"></i><span>Apagar para todos</span>
      </button>
      <button class="message-selection-action ghost" id="messageSelectionCancelButton" type="button" title="Cancelar seleção">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i><span>Cancelar</span>
      </button>
    </div>
  `;

  const anchor = messageForm || typingPreviewPanel || null;
  if (anchor?.parentNode) {
    anchor.parentNode.insertBefore(toolbar, anchor);
  } else {
    chatPanel?.appendChild(toolbar);
  }

  toolbar.querySelector("#messageSelectionCancelButton")?.addEventListener("click", () => setMessageSelectionMode(false));
  toolbar.querySelector("#messageSelectionDeleteButton")?.addEventListener("click", () => deleteSelectedMessagesForEveryone());
  toolbar.querySelector("#messageSelectionEditButton")?.addEventListener("click", () => editSelectedMessage());
  toolbar.querySelector("#messageSelectionForwardButton")?.addEventListener("click", () => openMessageForwardModal());
  return toolbar;
}

function updateMessageSelectionToolbar() {
  const toolbar = ensureMessageSelectionToolbar();
  if (!toolbar) return;

  const count = selectedMessageIds.size;
  toolbar.hidden = !messageSelectionMode;

  const countElement = toolbar.querySelector("#messageSelectionCount");
  if (countElement) {
    countElement.textContent = count === 1 ? "1 mensagem selecionada" : `${count} mensagens selecionadas`;
  }

  const selectedMessages = getSelectedMessages();
  const editButton = toolbar.querySelector("#messageSelectionEditButton");
  const deleteButton = toolbar.querySelector("#messageSelectionDeleteButton");
  const forwardButton = toolbar.querySelector("#messageSelectionForwardButton");

  if (editButton) {
    editButton.disabled = !(selectedMessages.length === 1 && canEditMessageForEveryone(selectedMessages[0], getActiveRoom()));
  }

  if (forwardButton) {
    forwardButton.disabled = !selectedMessages.some(canForwardMessage);
  }

  if (deleteButton) {
    deleteButton.disabled = !selectedMessages.some((message) => canDeleteMessageForEveryone(message, getActiveRoom()));
  }
}

function getSelectedMessages() {
  const activeRoom = getActiveRoom();
  if (!activeRoom?.id) return [];
  const selectedIds = new Set(selectedMessageIds);
  return (roomMessagesById.get(activeRoom.id) || activeRoom.messages || []).filter((message) => selectedIds.has(message.id));
}

function canForwardMessage(message) {
  return Boolean(message?.id && getForwardMessageText(message));
}

function getForwardMessageText(message) {
  return cleanMessageText(
    message?.hydration?.text ||
    getCurrentUserHydration(message)?.text ||
    message?.translatedText ||
    message?.originalText ||
    getStoredTranslationSourceText(getActiveRoom()?.id || activeRoomId, message) ||
    message?.translationSourceText ||
    message?.text ||
    getMessageAudioText(message) ||
    "",
    2000
  );
}

function getForwardTargetRooms() {
  const currentRoomId = getActiveRoom()?.id || "";
  return getVisibleRooms()
    .filter((room) => room?.id && room.id !== currentRoomId && !isAiRoom(room))
    .sort(sortRoomsForList);
}

function ensureMessageForwardModal() {
  let modal = document.querySelector("#messageForwardModal");
  if (modal) return modal;

  modal = document.createElement("section");
  modal.id = "messageForwardModal";
  modal.className = "modal-backdrop";
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="modal-card message-forward-card">
      <header class="modal-header">
        <div>
          <strong>Encaminhar mensagens</strong>
          <span id="messageForwardSubtitle">Escolha as salas de destino.</span>
        </div>
        <button class="icon-button" id="closeMessageForwardButton" type="button" aria-label="Fechar">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </header>
      <div class="select-list message-forward-list" id="messageForwardRooms"></div>
      <footer class="modal-actions">
        <button class="ghost-button" id="cancelMessageForwardButton" type="button">Cancelar</button>
        <button class="login-button compact" id="confirmMessageForwardButton" type="button">
          <span>Encaminhar</span>
          <i class="fa-solid fa-share" aria-hidden="true"></i>
        </button>
      </footer>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeMessageForwardModal();
  });
  modal.querySelector("#closeMessageForwardButton")?.addEventListener("click", closeMessageForwardModal);
  modal.querySelector("#cancelMessageForwardButton")?.addEventListener("click", closeMessageForwardModal);
  modal.querySelector("#confirmMessageForwardButton")?.addEventListener("click", forwardSelectedMessagesToRooms);
  return modal;
}

function openMessageForwardModal() {
  const selectedMessages = getSelectedMessages().filter(canForwardMessage);
  if (!selectedMessages.length) {
    showToast("Nada para encaminhar", "Selecione pelo menos uma mensagem com texto.");
    return;
  }

  const targetRooms = getForwardTargetRooms();
  if (!targetRooms.length) {
    showToast("Sem salas de destino", "Crie ou entre em outra sala antes de encaminhar mensagens.");
    return;
  }

  selectedForwardRoomIds.clear();
  const modal = ensureMessageForwardModal();
  const subtitle = modal.querySelector("#messageForwardSubtitle");
  if (subtitle) {
    subtitle.textContent = selectedMessages.length === 1
      ? "1 mensagem selecionada."
      : `${selectedMessages.length} mensagens selecionadas.`;
  }
  renderForwardRoomPicker(targetRooms);
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
}

function closeMessageForwardModal() {
  const modal = document.querySelector("#messageForwardModal");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  selectedForwardRoomIds.clear();
}

function renderForwardRoomPicker(targetRooms = getForwardTargetRooms()) {
  const modal = ensureMessageForwardModal();
  const container = modal.querySelector("#messageForwardRooms");
  if (!container) return;

  container.innerHTML = "";

  if (!targetRooms.length) {
    container.appendChild(createEmptyState(
      "fa-solid fa-door-open",
      "Nenhuma sala disponivel",
      "Crie ou entre em outra sala para encaminhar mensagens."
    ));
    return;
  }

  const header = document.createElement("div");
  header.className = "select-list-toolbar";
  header.innerHTML = `
    <div>
      <strong>${targetRooms.length} sala${targetRooms.length === 1 ? "" : "s"}</strong>
      <span>Toque em uma ou mais salas de destino</span>
    </div>
    <button type="button" class="select-all-button" title="Selecionar todas" aria-label="Selecionar todas">
      <i class="fa-solid fa-check-double" aria-hidden="true"></i>
    </button>
  `;
  header.querySelector("button")?.addEventListener("click", () => {
    const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
    const shouldSelectAll = checkboxes.some((input) => !input.checked);
    checkboxes.forEach((input) => {
      input.checked = shouldSelectAll;
      input.closest(".check-row")?.classList.toggle("is-selected", input.checked);
      if (shouldSelectAll) {
        selectedForwardRoomIds.add(input.value);
      } else {
        selectedForwardRoomIds.delete(input.value);
      }
    });
  });
  container.appendChild(header);

  targetRooms.forEach((room) => {
    const label = document.createElement("label");
    label.className = "check-row friend-check-row forward-room-row flex-friend-check-row";
    label.innerHTML = `
      <input type="checkbox" value="${escapeHtml(room.id)}" />
      <div style="display: flex;">
        <div class="avatar forward-room-avatar" style="margin-right: 12px;"></div>
        <span class="friend-check-info">
          <strong>${escapeHtml(getRoomDisplayName(room))}</strong>
          <small>${escapeHtml(getRoomStatus(room))}</small>
        </span>
      </div>
      <i class="fa-solid fa-circle-check friend-check-icon" aria-hidden="true"></i>
    `;

    const avatar = label.querySelector(".avatar");
    paintRoomAvatar(avatar, room);

    const checkbox = label.querySelector('input[type="checkbox"]');
    checkbox.addEventListener("change", () => {
      label.classList.toggle("is-selected", checkbox.checked);
      if (checkbox.checked) {
        selectedForwardRoomIds.add(room.id);
      } else {
        selectedForwardRoomIds.delete(room.id);
      }
    });

    container.appendChild(label);
  });
}

async function forwardSelectedMessagesToRooms() {
  const sourceRoom = getActiveRoom();
  const selectedMessages = getSelectedMessages().filter(canForwardMessage);
  const targetRoomIds = Array.from(selectedForwardRoomIds);
  const targetRooms = getForwardTargetRooms().filter((room) => targetRoomIds.includes(room.id));

  if (!sourceRoom?.id || !selectedMessages.length) {
    showToast("Nada selecionado", "Escolha pelo menos uma mensagem para encaminhar.");
    return;
  }

  if (!targetRooms.length) {
    showToast("Escolha o destino", "Selecione uma ou mais salas para encaminhar.");
    return;
  }

  if (!requireFirebaseConnection("encaminhar mensagens")) return;

  const modal = ensureMessageForwardModal();
  const confirmButton = modal.querySelector("#confirmMessageForwardButton");
  setButtonBusy(confirmButton, true, "Encaminhando...");

  try {
    await forwardMessagesToRooms(selectedMessages, targetRooms);
    closeMessageForwardModal();
    selectedMessageIds.clear();
    setMessageSelectionMode(false, { keepRender: true });
    forceMessageRerender(sourceRoom.id);
    renderActiveRoom(true);
    renderRoomList(searchInput.value);
    showToast(
      "Mensagens encaminhadas",
      `${selectedMessages.length} mensagem${selectedMessages.length === 1 ? "" : "s"} para ${targetRooms.length} sala${targetRooms.length === 1 ? "" : "s"}.`
    );
  } catch (error) {
    console.error("Nao foi possivel encaminhar mensagens.", error);
    showToast("Falha ao encaminhar", "Verifique a conexao e tente novamente.");
  } finally {
    setButtonBusy(confirmButton, false);
  }
}

async function forwardMessagesToRooms(selectedMessages, targetRooms) {
  const orderedMessages = selectedMessages.slice().sort(compareMessagesBySendOrder);
  const sourceRoom = getActiveRoom();
  let offset = 0;

  for (const room of targetRooms) {
    for (const message of orderedMessages) {
      const text = getForwardMessageText(message);
      if (!text) continue;
      await sendFirebaseMessage(room, text, {
        ...getForwardSendOptions(room, text),
        createdAtMillis: Date.now() + offset,
        replyPayload: null,
        forwarded: true,
        forwardedFromRoomId: sourceRoom?.id || "",
        forwardedFromRoomName: sourceRoom ? getRoomDisplayName(sourceRoom) : "",
        forwardedOriginalMessageId: message.id || "",
        forwardedOriginalAuthorNick: message.authorNick || message.author || ""
      });
      offset += 1;
    }
  }
}

function getForwardSendOptions(room, text) {
  const language = getRoomLanguage(room);
  if (!language?.code) {
    return {
      skipTranslation: false,
      translationDisabled: false
    };
  }

  return {
    publicText: PUBLIC_TRANSLATION_PENDING_TEXT,
    translationSourceText: text,
    deferOriginalUntilTranslated: true,
    skipTranslation: false,
    translationStatus: "pending",
    deliveryStatus: "processing",
    processingType: MESSAGE_PROCESSING_TRANSLATION,
    targetLanguageCode: language.code || "",
    targetLanguageName: language.name || ""
  };
}

function editSelectedMessage() {
  const selectedMessages = getSelectedMessages();
  if (selectedMessages.length !== 1) {
    showToast("Selecione uma mensagem", "Para editar, escolha apenas uma mensagem sua.");
    return;
  }

  startMessageEdit(selectedMessages[0]);
}

function startMessageEdit(message) {
  const activeRoom = getActiveRoom();
  if (!canEditMessageForEveryone(message, activeRoom)) {
    showToast("Edição indisponível", "Você só pode editar mensagens suas que ainda existem nesta conversa.");
    return;
  }

  setMessageSelectionMode(false);
  messageEditTarget = {
    roomId: activeRoom.id,
    messageId: message.id,
    originalText: getEditableMessageText(message)
  };

  clearReplyTarget();
  messageInput.value = messageEditTarget.originalText;
  messageInput.focus();
  messageForm?.classList.add("is-editing-message");
  updateMessageInputPlaceholder(activeRoom);
  showToast("Editando mensagem", "Altere o texto e envie para salvar. Pressione Esc para cancelar.");
}

function cancelMessageEdit(options = {}) {
  if (!messageEditTarget) return;
  messageEditTarget = null;
  messageForm?.classList.remove("is-editing-message");
  if (!options.keepInput && messageInput) messageInput.value = "";
  updateMessageInputPlaceholder(getActiveRoom());
}

async function submitMessageEdit(text) {
  const activeRoom = getActiveRoom();
  if (!messageEditTarget || !activeRoom || activeRoom.id !== messageEditTarget.roomId) {
    cancelMessageEdit();
    return;
  }

  const cleanText = cleanMessageText(text);
  if (!cleanText) return;

  const message = (roomMessagesById.get(activeRoom.id) || activeRoom.messages || []).find((item) => item.id === messageEditTarget.messageId);
  if (!canEditMessageForEveryone(message, activeRoom)) {
    showToast("Edição indisponível", "Essa mensagem não pode mais ser editada.");
    cancelMessageEdit();
    return;
  }

  try {
    await updateFirebaseMessageTextForEveryone(activeRoom, message, cleanText);
    messageInput.value = "";
    cancelMessageEdit();
    showToast("Mensagem editada", "A alteração foi salva para todos.");
  } catch (error) {
    console.error("Nao foi possivel editar a mensagem.", error);
    showToast("Falha ao editar", "Verifique a conexão e tente novamente.");
  }
}

function getEditableMessageText(message) {
  return cleanMessageText(message?.translationSourceText || message?.originalText || message?.text || message?.translatedText || "");
}

function canEditMessageForEveryone(message, room = getActiveRoom()) {
  if (!room?.id || !message?.id || isAiRoom(room)) return false;
  if (!isMessageMine(message)) return false;
  if (message.localOnly || message.localPending || message.pendingOffline) return false;
  if (["queued", "sending", "processing", "failed"].includes(String(message.deliveryStatus || ""))) return false;
  return Boolean(getEditableMessageText(message));
}

function canDeleteMessageForEveryone(message, room = getActiveRoom()) {
  if (!room?.id || !message?.id || isAiRoom(room)) return false;
  if (message.localOnly || message.localPending) return false;
  return isMessageMine(message) || isRoomOwner(room);
}

async function updateFirebaseMessageTextForEveryone(room, message, cleanText) {
  if (!room?.id || !message?.id || !cleanText) return;
  if (!requireFirebaseConnection("editar mensagem")) throw new Error("Sem Firebase");

  const now = Date.now();
  const language = getRoomLanguage(room);
  const wasLearningMessage = wasMessageSentWithLearningTest(message);
  const shouldTranslateAgain = Boolean(language?.code && !wasLearningMessage && message.translationDisabled !== true);
  const mentionPayload = extractMessageMentions(cleanText, room);
  const displayText = shouldTranslateAgain ? PUBLIC_TRANSLATION_PENDING_TEXT : cleanText;
  const patch = {
    text: displayText,
    originalText: shouldTranslateAgain ? "" : "",
    translatedText: "",
    mentionedUids: mentionPayload.mentionedUids,
    mentionedNicks: mentionPayload.mentionedNicks,
    mentions: mentionPayload.mentions,
    translationError: false,
    translationStatus: shouldTranslateAgain ? "pending" : "none",
    targetLanguageCode: shouldTranslateAgain ? language.code || "" : message.targetLanguageCode || "",
    targetLanguageName: shouldTranslateAgain ? language.name || "" : message.targetLanguageName || "",
    learningTest: Boolean(wasLearningMessage),
    learningFeedback: wasLearningMessage ? null : (message.learningFeedback || null),
    learningFeedbackStatus: wasLearningMessage ? "pending" : "",
    translationDisabled: wasLearningMessage ? true : Boolean(message.translationDisabled),
    deliveryStatus: shouldTranslateAgain ? "processing" : "sent",
    pendingOffline: false,
    processingType: wasLearningMessage ? MESSAGE_PROCESSING_LEARNING_TEST : shouldTranslateAgain ? MESSAGE_PROCESSING_TRANSLATION : "",
    edited: true,
    editedAt: serverTimestamp(),
    editedAtMillis: now,
    editedByUid: currentFirebaseUid,
    editedByNick: currentUser?.nick || "Você"
  };

  const updates = {};
  Object.entries(patch).forEach(([key, value]) => {
    updates[`rooms/${room.id}/messages/${message.id}/${key}`] = value;
  });

  if (room.lastMessageId === message.id) {
    updates[`rooms/${room.id}/lastMessage`] = displayText;
    updates[`rooms/${room.id}/lastOriginalMessage`] = shouldTranslateAgain ? "" : "";
    updates[`rooms/${room.id}/lastMessageMentionedUids`] = mentionPayload.mentionedUids;
    updates[`rooms/${room.id}/lastMessageMentionedNicks`] = mentionPayload.mentionedNicks;
    updates[`rooms/${room.id}/updatedAt`] = serverTimestamp();
    updates[`rooms/${room.id}/updatedAtMillis`] = now;
  }

  const updatedMessage = {
    ...message,
    ...patch,
    translationSourceText: shouldTranslateAgain ? cleanText : "",
    time: message.time || message.createdAtMillis || now
  };

  if (shouldTranslateAgain) {
    upsertPendingTranslationJob(room, updatedMessage, cleanText, language);
  } else {
    removePendingTranslationJob(room.id, message.id);
  }

  upsertRoomMessage(room.id, updatedMessage);
  forceMessageRerender(room.id);
  renderRoomMessages({ ...room, messages: roomMessagesById.get(room.id) || [] });
  renderRoomList(searchInput.value);

  await update(ref(db), updates);

  if (wasLearningMessage) {
    startLearningFeedbackJob(room, updatedMessage, cleanText);
  } else if (shouldTranslateAgain) {
    startTranslationResumeJob(room, {
      ...updatedMessage,
      text: cleanText,
      originalText: cleanText,
      translationSourceText: cleanText
    }, language, cleanText);
  }
}

async function deleteSelectedMessagesForEveryone() {
  const selectedMessages = getSelectedMessages();
  if (!selectedMessages.length) {
    showToast("Nada selecionado", "Escolha pelo menos uma mensagem para apagar.");
    return;
  }

  await deleteMessagesForEveryone(selectedMessages.map((message) => message.id));
}

async function deleteMessagesForEveryone(messageIds = []) {
  const activeRoom = getActiveRoom();
  if (!activeRoom?.id || isAiRoom(activeRoom)) return;

  const ids = unique(messageIds.filter(Boolean));
  if (!ids.length) return;

  const messagesForRoom = roomMessagesById.get(activeRoom.id) || activeRoom.messages || [];
  const idSet = new Set(ids);
  const deletableIds = messagesForRoom
    .filter((message) => idSet.has(message.id) && canDeleteMessageForEveryone(message, activeRoom))
    .map((message) => message.id);

  if (!deletableIds.length) {
    showToast("Sem permissão", "Você só pode apagar mensagens suas, ou mensagens da sala que você criou.");
    return;
  }

  const ok = window.confirm(deletableIds.length === 1
    ? "Apagar esta mensagem para todos?"
    : `Apagar ${deletableIds.length} mensagens para todos?`);
  if (!ok) return;

  if (!requireFirebaseConnection("apagar mensagens")) return;

  const now = Date.now();
  const deleteSet = new Set(deletableIds);
  const remainingMessages = messagesForRoom.filter((message) => !deleteSet.has(message.id));
  const lastRemainingMessage = remainingMessages.slice().sort(compareMessagesBySendOrder).at(-1) || null;
  const updates = {};

  deletableIds.forEach((messageId) => {
    updates[`rooms/${activeRoom.id}/messages/${messageId}`] = null;
    removePendingTranslationJob(activeRoom.id, messageId);
  });

  if (!lastRemainingMessage) {
    updates[`rooms/${activeRoom.id}/lastMessage`] = "";
    updates[`rooms/${activeRoom.id}/lastMessageId`] = "";
    updates[`rooms/${activeRoom.id}/lastOriginalMessage`] = "";
    updates[`rooms/${activeRoom.id}/lastMessageAuthorUid`] = "";
    updates[`rooms/${activeRoom.id}/lastMessageAuthorNick`] = "";
    updates[`rooms/${activeRoom.id}/lastMessageMentionedUids`] = null;
    updates[`rooms/${activeRoom.id}/lastMessageMentionedNicks`] = null;
    updates[`rooms/${activeRoom.id}/lastMessageAt`] = now;
    updates[`rooms/${activeRoom.id}/lastMessageAtMillis`] = now;
  } else if (deleteSet.has(activeRoom.lastMessageId || messagesForRoom.at(-1)?.id || "")) {
    updates[`rooms/${activeRoom.id}/lastMessage`] = getMessageDisplayText(lastRemainingMessage, 300);
    updates[`rooms/${activeRoom.id}/lastMessageId`] = lastRemainingMessage.id || "";
    updates[`rooms/${activeRoom.id}/lastOriginalMessage`] = lastRemainingMessage.originalText || "";
    updates[`rooms/${activeRoom.id}/lastMessageAuthorUid`] = lastRemainingMessage.authorUid || "";
    updates[`rooms/${activeRoom.id}/lastMessageAuthorNick`] = lastRemainingMessage.authorNick || lastRemainingMessage.author || "";
    updates[`rooms/${activeRoom.id}/lastMessageMentionedUids`] = normalizeMentionUidMap(lastRemainingMessage.mentionedUids);
    updates[`rooms/${activeRoom.id}/lastMessageMentionedNicks`] = normalizeMentionNickList(lastRemainingMessage.mentionedNicks);
    updates[`rooms/${activeRoom.id}/lastMessageAt`] = lastRemainingMessage.createdAt || lastRemainingMessage.time || now;
    updates[`rooms/${activeRoom.id}/lastMessageAtMillis`] = Number(lastRemainingMessage.createdAtMillis || lastRemainingMessage.time || now);
  }

  updates[`rooms/${activeRoom.id}/updatedAt`] = serverTimestamp();
  updates[`rooms/${activeRoom.id}/updatedAtMillis`] = now;

  try {
    await update(ref(db), updates);
    roomMessagesById.set(activeRoom.id, remainingMessages);
    selectedMessageIds.clear();
    setMessageSelectionMode(false, { keepRender: true });
    forceMessageRerender(activeRoom.id);
    renderActiveRoom(true);
    renderRoomList(searchInput.value);
    showToast("Mensagens apagadas", deletableIds.length === 1 ? "A mensagem foi removida para todos." : "As mensagens foram removidas para todos.");
  } catch (error) {
    console.error("Nao foi possivel apagar mensagens.", error);
    showToast("Falha ao apagar", "Verifique a conexão e tente novamente.");
  }
}

function normalizeSpeechPlaybackRate(value) {
  const numericValue = Number(value);
  const allowedRates = getSpeechPlaybackRateOptions();
  if (!Number.isFinite(numericValue)) return 1;

  return allowedRates.reduce((closest, rate) => (
    Math.abs(rate - numericValue) < Math.abs(closest - numericValue) ? rate : closest
  ), 1);
}

function getSpeechPlaybackRateOptions() {
  return [0.75, 1, 1.25, 1.5, 2];
}

function formatSpeechPlaybackRate(rate) {
  const normalized = normalizeSpeechPlaybackRate(rate);
  return `${Number.isInteger(normalized) ? normalized.toFixed(0) : String(normalized)}x`;
}

function cycleSpeechPlaybackRate() {
  const rates = getSpeechPlaybackRateOptions();
  const currentIndex = Math.max(0, rates.indexOf(normalizeSpeechPlaybackRate(speechPlaybackRate)));
  const nextRate = rates[(currentIndex + 1) % rates.length];
  const messageToRestart = isSpeechPlaybackActive() ? activeSpeechMessage : null;

  setSpeechPlaybackRate(nextRate);

  if (messageToRestart) {
    speakMessage(messageToRestart);
    showToast("Velocidade alterada", `Reproduzindo em ${formatSpeechPlaybackRate(nextRate)}.`);
    return;
  }

  showToast("Velocidade alterada", `Próximos áudios serão reproduzidos em ${formatSpeechPlaybackRate(nextRate)}.`);
}

function setSpeechPlaybackRate(rate) {
  speechPlaybackRate = normalizeSpeechPlaybackRate(rate);
  localStorage.setItem(SPEECH_RATE_STORAGE_KEY, JSON.stringify(speechPlaybackRate));
  refreshSpeechPlaybackRateLabels();
}

function refreshSpeechPlaybackRateLabels() {
  document.querySelectorAll(".message-audio-speed-value").forEach((speedLabel) => {
    speedLabel.textContent = formatSpeechPlaybackRate(speechPlaybackRate);
  });
}

function createSpeechSpeedButton() {
  const speedButton = document.createElement("button");
  speedButton.className = "message-audio-control speed-audio-control";
  speedButton.type = "button";
  speedButton.title = "Mudar velocidade";
  speedButton.setAttribute("aria-label", "Mudar velocidade do audio");
  speedButton.innerHTML = `<i class="fa-solid fa-gauge-high" aria-hidden="true"></i><span class="message-audio-speed-value">${escapeHtml(formatSpeechPlaybackRate(speechPlaybackRate))}</span>`;
  speedButton.addEventListener("click", (event) => {
    event.stopPropagation();
    cycleSpeechPlaybackRate();
  });
  return speedButton;
}

function hasActiveSpeechSession() {
  return Boolean(activeSpeechUtterance || activeSpeechAudio || activeSpeechRequestController);
}

function isSpeechPlaybackActive() {
  return hasActiveSpeechSession() || Boolean(window.speechSynthesis?.speaking || window.speechSynthesis?.pending);
}

function getSpeechMessageKey(message) {
  const roomId = getActiveRoom()?.id || activeRoomId || "room";
  return `${roomId}:${message?.id || message?.time || message?.createdAtMillis || getMessageAudioText(message)}`;
}

function isMessageCurrentlySpeaking(message) {
  return Boolean(hasActiveSpeechSession() && activeSpeechMessageKey && activeSpeechMessageKey === getSpeechMessageKey(message));
}

function startSpeechProgress(message) {
  clearSpeechProgress();
  updateSpeechProgressElement(message);

  activeSpeechAnimationTimer = window.setInterval(() => {
    if (!hasActiveSpeechSession() || !activeSpeechMessage) {
      window.clearInterval(activeSpeechAnimationTimer);
      activeSpeechAnimationTimer = 0;
      return;
    }

    updateSpeechProgressElement(activeSpeechMessage);
  }, 38);
}

function updateSpeechProgressElement(message) {
  const bubble = getRenderedMessageBubble(message);
  if (!bubble) return;

  let progress = bubble.querySelector(".message-audio-progress");

  if (!progress) {
    progress = createSpeechProgressElement(message);
  }

  applySpeechProgressPlacement(bubble, progress, message);

  const speed = progress.querySelector(".message-audio-speed-value");

  updateSpeechWaveBars(progress);
  if (speed) speed.textContent = formatSpeechPlaybackRate(speechPlaybackRate);
}

function createSpeechProgressElement(message) {
  const progress = document.createElement("div");
  const stopButton = document.createElement("button");
  const waveWrap = document.createElement("div");
  const wave = document.createElement("div");
  const speedButton = createSpeechSpeedButton();

  progress.className = "message-audio-progress";
  progress.dataset.messageId = message?.id || "";
  progress.setAttribute("role", "group");
  progress.setAttribute("aria-label", "Voz da mensagem em reprodução");

  stopButton.className = "message-audio-control stop-audio-control";
  stopButton.type = "button";
  stopButton.title = "Parar voz";
  stopButton.setAttribute("aria-label", "Parar voz da mensagem");
  stopButton.innerHTML = `<i class="fa-solid fa-stop" aria-hidden="true"></i>`;
  stopButton.addEventListener("click", (event) => {
    event.stopPropagation();
    stopSpeaking();
  });

  waveWrap.className = "message-audio-wave-wrap";
  waveWrap.setAttribute("role", "img");
  waveWrap.setAttribute("aria-label", "Barras de voz em reprodução");
  wave.className = "message-audio-wave";
  wave.setAttribute("aria-hidden", "true");
  for (let index = 0; index < 30; index += 1) {
    const bar = document.createElement("span");
    bar.className = "message-audio-wave-bar";
    bar.dataset.index = String(index);
    bar.dataset.voiceSeed = (Math.random() * Math.PI * 2).toFixed(4);
    bar.dataset.voiceRate = (0.75 + Math.random() * 1.35).toFixed(4);
    bar.dataset.voiceBias = (0.68 + Math.random() * 0.42).toFixed(4);
    bar.dataset.currentHeight = "4";
    bar.style.height = "4px";
    wave.appendChild(bar);
  }

  waveWrap.appendChild(wave);

  progress.append(stopButton, waveWrap, speedButton);
  return progress;
}

function shouldShowSpeechProgressBelowText(message = activeSpeechMessage) {
  const roomId = getActiveRoom()?.id || activeRoomId || "";
  return Boolean(roomId && isSpeechPlaybackEnabledForRoom(roomId));
}

function applySpeechProgressPlacement(bubble, progress, message) {
  if (!bubble || !progress) return;

  const belowText = shouldShowSpeechProgressBelowText(message);
  const footer = bubble.querySelector(".message-footer");
  const row = bubble.closest(".message-row");

  progress.classList.toggle("is-below-text", belowText);
  progress.classList.toggle("is-in-place-of-text", !belowText);

  if (footer) {
    bubble.insertBefore(progress, footer);
  } else if (progress.parentElement !== bubble) {
    bubble.appendChild(progress);
  }

  if (row) {
    row.classList.add("is-speaking-message");
    row.classList.toggle("is-audio-below-text", belowText);
    row.classList.toggle("is-audio-in-place", !belowText);
  }
}

function updateSpeechWaveBars(progress) {
  const bars = Array.from(progress.querySelectorAll(".message-audio-wave-bar"));
  const count = bars.length || 1;
  const now = performance.now() / 1000;
  const freeWaveEnergy = 0.58 + Math.random() * 0.62;

  bars.forEach((bar, index) => {
    const position = count === 1 ? 0 : index / (count - 1);
    const seed = Number(bar.dataset.voiceSeed || index);
    const rate = Number(bar.dataset.voiceRate || 1);
    const bias = Number(bar.dataset.voiceBias || 1);
    const waveShape = 0.18 + Math.pow(Math.sin(position * Math.PI), 0.85) * 0.82;
    const fastPulse = (Math.sin(now * (7.2 + rate * 2.4) + seed) + 1) / 2;
    const slowPulse = (Math.sin(now * (1.35 + rate * 0.25) + seed * 0.37) + 1) / 2;
    const randomSpark = Math.random() > 0.72 ? Math.random() * 0.38 : 0;
    const microPause = Math.random() > 0.93 ? 0.24 + Math.random() * 0.18 : 1;
    const energy = 0.24 + fastPulse * 0.58 + slowPulse * 0.18 + randomSpark;
    const targetHeight = 4 + (50 * waveShape * freeWaveEnergy * microPause * energy * bias);
    const previousHeight = Number(bar.dataset.currentHeight || 4);
    const smoothing = targetHeight > previousHeight ? 0.82 : 0.58;
    const height = previousHeight + (targetHeight - previousHeight) * smoothing;
    const clampedHeight = Math.max(4, Math.min(54, height));
    const opacity = Math.max(0.5, Math.min(1, 0.52 + clampedHeight / 58));

    bar.dataset.currentHeight = clampedHeight.toFixed(3);
    bar.style.height = `${clampedHeight.toFixed(1)}px`;
    bar.style.opacity = opacity.toFixed(2);
  });
}

function finishSpeechProgress(message = activeSpeechMessage) {
  if (activeSpeechAnimationTimer) {
    window.clearInterval(activeSpeechAnimationTimer);
    activeSpeechAnimationTimer = 0;
  }
  window.clearTimeout(activeSpeechProgressClearTimer);
  activeSpeechProgressClearTimer = 0;
  showSpeechFinishedControls(message);
}

function showSpeechFinishedControls(message) {
  const bubble = getRenderedMessageBubble(message);
  if (!bubble) {
    clearSpeechProgress();
    return;
  }

  let progress = bubble.querySelector(".message-audio-progress");
  if (!progress) {
    progress = createSpeechProgressElement(message);
  }

  applySpeechProgressPlacement(bubble, progress, message);

  const repeatButton = document.createElement("button");
  const label = document.createElement("div");
  const speedButton = createSpeechSpeedButton();
  const backButton = document.createElement("button");

  progress.className = "message-audio-progress is-finished";
  progress.dataset.messageId = message?.id || "";
  progress.setAttribute("role", "group");
  progress.setAttribute("aria-label", "Voz da mensagem finalizada");
  progress.innerHTML = "";

  repeatButton.className = "message-audio-control repeat-audio-control";
  repeatButton.type = "button";
  repeatButton.title = "Repetir voz";
  repeatButton.setAttribute("aria-label", "Repetir voz da mensagem");
  repeatButton.innerHTML = `<i class="fa-solid fa-rotate-right" aria-hidden="true"></i>`;
  repeatButton.addEventListener("click", (event) => {
    event.stopPropagation();
    speakMessage(message);
  });

  label.className = "message-audio-finished-label";
  label.innerHTML = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>Voz concluída</span>`;

  backButton.className = "message-audio-control back-to-text-audio-control";
  backButton.type = "button";
  backButton.title = "Voltar para o texto";
  backButton.setAttribute("aria-label", "Voltar para o texto da mensagem");
  backButton.innerHTML = `<i class="fa-solid fa-align-left" aria-hidden="true"></i>`;
  backButton.addEventListener("click", (event) => {
    event.stopPropagation();
    clearSpeechProgress();
  });

  progress.append(repeatButton, label, speedButton, backButton);
  applySpeechProgressPlacement(bubble, progress, message);
}

function clearSpeechProgress() {
  if (activeSpeechAnimationTimer) {
    window.clearInterval(activeSpeechAnimationTimer);
    activeSpeechAnimationTimer = 0;
  }
  window.clearTimeout(activeSpeechProgressClearTimer);
  activeSpeechProgressClearTimer = 0;

  document.querySelectorAll(".message-audio-progress").forEach((progress) => {
    const row = progress.closest(".message-row");
    row?.classList.remove("is-speaking-message", "is-audio-below-text", "is-audio-in-place");
    progress.remove();
  });
}

function releaseActiveSpeechAudio() {
  if (activeSpeechAudio) {
    activeSpeechAudio.onended = null;
    activeSpeechAudio.onerror = null;
    activeSpeechAudio.pause();
    activeSpeechAudio.src = "";
  }
  activeSpeechAudio = null;
  if (activeSpeechAudioUrl) URL.revokeObjectURL(activeSpeechAudioUrl);
  activeSpeechAudioUrl = "";
}

function stopSpeaking() {
  activeSpeechRequestController?.abort();
  activeSpeechRequestController = null;
  releaseActiveSpeechAudio();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  activeSpeechUtterance = null;
  activeSpeechMessage = null;
  activeSpeechMessageKey = "";
  clearSpeechProgress();
}

async function speakMessage(message) {
  const text = getMessageAudioText(message);
  if (!text) return;

  stopSpeaking();
  activeSpeechMessage = message;
  activeSpeechMessageKey = getSpeechMessageKey(message);
  activeSpeechRequestController = new AbortController();
  startSpeechProgress(message);

  try {
    const audioBlob = await requestGeminiSpeechBlob(text, getSpeechLanguageForMessage(message), activeSpeechRequestController.signal);
    if (!activeSpeechMessage || activeSpeechMessageKey !== getSpeechMessageKey(message)) return;

    activeSpeechRequestController = null;
    activeSpeechAudioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(activeSpeechAudioUrl);
    activeSpeechAudio = audio;
    audio.playbackRate = getActiveRoomVoiceSettings().rate;
    audio.preservesPitch = true;
    audio.onended = () => {
      if (activeSpeechAudio !== audio) return;
      const finishedMessage = activeSpeechMessage;
      releaseActiveSpeechAudio();
      finishSpeechProgress(finishedMessage);
      activeSpeechMessage = null;
      activeSpeechMessageKey = "";
    };
    audio.onerror = () => {
      if (activeSpeechAudio !== audio) return;
      releaseActiveSpeechAudio();
      void speakMessageWithBrowserVoice(message, true);
    };
    await audio.play();
  } catch (error) {
    if (error?.name === "AbortError" && !activeSpeechMessage) return;
    console.warn("Gemini TTS indisponível.", error);
    activeSpeechRequestController = null;
    releaseActiveSpeechAudio();
    await speakMessageWithBrowserVoice(message, true);
  }
}

async function requestGeminiSpeechBlob(text, languageCode, signal) {
  const endpoint = String(GEMINI_TTS_ENDPOINT || "").trim();
  const cleanText = cleanMessageText(text, GEMINI_TTS_MAX_TEXT_LENGTH);
  if (!endpoint || !cleanText) throw new Error("Gemini TTS não está configurado.");
  if (!currentFirebaseUser?.getIdToken) throw new Error("Usuário Firebase indisponível para gerar voz.");

  const voiceSettings = getActiveRoomVoiceSettings();
  const cacheKey = await getGeminiSpeechCacheKey(cleanText, languageCode, voiceSettings);
  const cached = await readGeminiSpeechCache(cacheKey);
  if (cached) return cached;

  const idToken = await currentFirebaseUser.getIdToken(false);
  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => timeoutController.abort(), GEMINI_TTS_TIMEOUT_MS);
  const abort = () => timeoutController.abort();
  signal?.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "audio/wav, application/json"
      },
      body: JSON.stringify({ idToken, text: cleanText, languageCode, voice: voiceSettings.voice }),
      signal: timeoutController.signal
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error([data?.error, data?.details].filter(Boolean).join(" — ") || `Gemini TTS respondeu HTTP ${response.status}`);
    }

    const blob = await response.blob();
    if (!blob.size || !String(blob.type || "").includes("audio")) {
      throw new Error("Gemini TTS retornou áudio inválido.");
    }
    await writeGeminiSpeechCache(cacheKey, blob);
    return blob;
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abort);
  }
}

async function getGeminiSpeechCacheKey(text, languageCode, settings = {}) {
  const source = `${languageCode || "auto"}|${settings.voice || "Kore"}|${settings.rate || 1}|${text}`;
  if (crypto?.subtle && typeof TextEncoder !== "undefined") {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function getGeminiSpeechCacheRequest(cacheKey) {
  return new Request(`${location.origin}/__astrochat-gemini-tts/${encodeURIComponent(cacheKey)}.wav`);
}

async function readGeminiSpeechCache(cacheKey) {
  if (!("caches" in window)) return null;
  try {
    const cache = await caches.open(GEMINI_TTS_CACHE_NAME);
    const response = await cache.match(getGeminiSpeechCacheRequest(cacheKey));
    return response?.ok ? await response.blob() : null;
  } catch (error) {
    console.warn("Não foi possível ler o cache de voz Gemini.", error);
    return null;
  }
}

async function writeGeminiSpeechCache(cacheKey, blob) {
  if (!("caches" in window)) return;
  try {
    const cache = await caches.open(GEMINI_TTS_CACHE_NAME);
    await cache.put(getGeminiSpeechCacheRequest(cacheKey), new Response(blob, {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=604800" }
    }));
    const keys = await cache.keys();
    if (keys.length > 30) {
      await Promise.all(keys.slice(0, keys.length - 30).map((request) => cache.delete(request)));
    }
  } catch (error) {
    console.warn("Não foi possível salvar a voz Gemini no cache.", error);
  }
}

function formatStorageBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1048576) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1048576).toFixed(1)} MB`;
}

async function updateProfileStorageUsage() {
  if (!profileStorageStatus) return;
  try {
    const estimate = await navigator.storage?.estimate?.();
    const usage = Number(estimate?.usage || 0);
    const quota = Number(estimate?.quota || 0);
    const percent = quota ? Math.min(100, usage / quota * 100) : 0;
    profileStorageStatus.textContent = quota ? `${formatStorageBytes(usage)} usados de ${formatStorageBytes(quota)}` : `${formatStorageBytes(usage)} usados`;
    if (profileStorageBar) profileStorageBar.style.width = `${percent ? Math.max(1, percent) : 0}%`;
  } catch {
    profileStorageStatus.textContent = "Uso indisponível neste navegador";
  }
}

async function clearSavedGeminiAudio() {
  if (!window.confirm("Apagar todos os áudios Gemini salvos neste aparelho?")) return;
  stopSpeaking();
  if ("caches" in window) await caches.delete(GEMINI_TTS_CACHE_NAME);
  await updateProfileStorageUsage();
  showToast("Áudios removidos", "As vozes salvas foram apagadas deste aparelho.");
}

function clearLocalConversationData() {
  if (!window.confirm("Apagar as conversas locais com IA e os caches de conversa deste aparelho? As salas compartilhadas não serão excluídas.")) return;
  rooms = rooms.filter((room) => room.type !== AI_ROOM_TYPE);
  localStorage.removeItem(ROOMS_STORAGE_KEY);
  localStorage.removeItem(REMOTE_CONVERSATION_CACHE_STORAGE_KEY);
  closeProfileSettingsModal();
  renderRoomList(searchInput.value);
  showToast("Conversas locais apagadas", "Os chats locais e caches foram removidos.");
}

async function clearTemporaryAppStorage() {
  if (!window.confirm("Limpar áudios, caches e filas temporárias do AstroChat neste aparelho?")) return;
  stopSpeaking();
  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== PUSH_SETTINGS_CACHE).map((name) => caches.delete(name)));
  }
  localStorage.removeItem(OFFLINE_MESSAGE_QUEUE_STORAGE_KEY);
  localStorage.removeItem(PENDING_TRANSLATION_JOBS_STORAGE_KEY);
  localStorage.removeItem(REMOTE_CONVERSATION_CACHE_STORAGE_KEY);
  offlineMessageQueue = [];
  pendingTranslationJobs = [];
  await updateProfileStorageUsage();
  showToast("Temporários limpos", "Áudios, caches e filas temporárias foram removidos.");
}

async function speakMessageWithBrowserVoice(message, isGeminiFallback = false) {
  const text = getMessageAudioText(message);
  stopSpeaking();
  if (!("speechSynthesis" in window)) {
    activeSpeechUtterance = null;
    activeSpeechMessage = null;
    activeSpeechMessageKey = "";
    clearSpeechProgress();
    showToast("Sintetizador indisponível", "Este navegador não oferece voz local.");
    return;
  }

  if (isGeminiFallback) {
    showToast("Usando voz local", "O Gemini não retornou áudio; reproduzindo com o sintetizador do navegador.");
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getSpeechLanguageForMessage(message);
  utterance.rate = getActiveRoomVoiceSettings().rate;
  utterance.pitch = 1;
  activeSpeechUtterance = utterance;
  activeSpeechMessage = message;
  activeSpeechMessageKey = getSpeechMessageKey(message);
  if (!activeSpeechAnimationTimer) startSpeechProgress(message);
  utterance.onend = () => {
    if (activeSpeechUtterance === utterance) {
      const finishedMessage = activeSpeechMessage;
      finishSpeechProgress(finishedMessage);
      activeSpeechUtterance = null;
      activeSpeechMessage = null;
      activeSpeechMessageKey = "";
    }
  };
  utterance.onerror = () => {
    if (activeSpeechUtterance === utterance) {
      activeSpeechUtterance = null;
      activeSpeechMessage = null;
      activeSpeechMessageKey = "";
      clearSpeechProgress();
    }
  };
  window.speechSynthesis.speak(utterance);
}

function getMessageAudioText(message) {
  const hydration = getCurrentUserHydration(message);
  return (hydration?.text || message?.translatedText || message?.text || message?.originalText || "").trim();
}

function getSpeechLanguageForMessage(message) {
  const code = message?.targetLanguageCode || getRoomLanguage(getActiveRoom())?.code || "pt";
  const languages = {
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    it: "it-IT",
    de: "de-DE",
    ja: "ja-JP",
    ko: "ko-KR",
    zh: "zh-CN",
    pt: "pt-BR"
  };
  return languages[code] || "pt-BR";
}

function getMessageRevealKey(message) {
  const roomId = getActiveRoom()?.id || activeRoomId || "room";
  return `${roomId}:${message.id || message.time || message.text || "msg"}`;
}

function createReactionSummaryElement(message) {
  const groups = groupMessageReactions(message.reactions);
  if (!groups.length) return null;

  const summary = document.createElement("div");
  summary.className = "reaction-summary";

  groups.forEach(({ emoji, count, reactedByMe }) => {
    const chip = document.createElement("button");
    chip.className = `reaction-chip${reactedByMe ? " mine" : ""}`;
    chip.type = "button";
    chip.title = reactedByMe ? "Remover minha reação" : `Reagir com ${emoji}`;
    chip.innerHTML = `<span>${escapeHtml(emoji)}</span><strong>${count}</strong>`;
    chip.addEventListener("click", () => reactToMessage(message, emoji));
    summary.appendChild(chip);
  });

  return summary;
}

function groupMessageReactions(reactions = {}) {
  const grouped = new Map();

  Object.entries(reactions || {}).forEach(([uid, reaction]) => {
    const emoji = typeof reaction === "string" ? reaction : reaction?.emoji;
    if (!emoji) return;
    const current = grouped.get(emoji) || { emoji, count: 0, reactedByMe: false };
    current.count += 1;
    if (uid === currentFirebaseUid) current.reactedByMe = true;
    grouped.set(emoji, current);
  });

  return Array.from(grouped.values()).sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
}

function toggleReactionPicker(message, bubble, anchorButton) {
  const existing = document.querySelector(`.reaction-picker[data-message-id="${CSS.escape(message?.id || "")}"]`);
  closeReactionPickers();
  if (existing) return;

  const picker = document.createElement("div");
  picker.className = "reaction-picker";
  picker.setAttribute("role", "menu");
  picker.dataset.messageId = message?.id || "";

  ["👍", "❤️", "😂", "😮", "😢", "🙏"].forEach((emoji) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = emoji;
    button.setAttribute("aria-label", `Reagir com ${emoji}`);
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      closeReactionPickers();
      await reactToMessage(message, emoji);
    });
    picker.appendChild(button);
  });

  document.body.appendChild(picker);
  positionFloatingReactionPicker(picker, anchorButton || bubble);
}

function positionFloatingReactionPicker(picker, anchor) {
  const rect = anchor.getBoundingClientRect();
  const padding = 10;
  const width = picker.offsetWidth || 238;
  const height = picker.offsetHeight || 46;

  let left = rect.left + rect.width / 2 - width / 2;
  let top = rect.top - height - 8;

  if (top < padding) top = rect.bottom + 8;
  left = Math.max(padding, Math.min(left, window.innerWidth - width - padding));
  top = Math.max(padding, Math.min(top, window.innerHeight - height - padding));

  picker.style.left = `${left}px`;
  picker.style.top = `${top}px`;
}

function closeReactionPickers() {
  document.querySelectorAll(".reaction-picker").forEach((picker) => picker.remove());
}

async function reactToMessage(message, emoji) {
  const activeRoom = getActiveRoom();
  if (!activeRoom || !message?.id || !currentFirebaseUid) return;

  const currentReaction = message.reactions?.[currentFirebaseUid];
  const currentEmoji = typeof currentReaction === "string" ? currentReaction : currentReaction?.emoji;
  const shouldRemove = currentEmoji === emoji;

  if (isAiRoom(activeRoom)) {
    const localMessage = activeRoom.messages?.find((item) => item.id === message.id);
    if (!localMessage) return;
    localMessage.reactions = localMessage.reactions || {};
    if (shouldRemove) {
      delete localMessage.reactions[currentFirebaseUid];
    } else {
      localMessage.reactions[currentFirebaseUid] = {
        emoji,
        nick: currentUser?.nick || "Você",
        time: Date.now()
      };
    }
    activeRoom.updatedAt = Date.now();
    saveRooms();
    forceMessageRerender(activeRoom.id);
    renderActiveRoom(true);
    return;
  }

  if (!requireFirebaseConnection("reagir a mensagem")) return;

  try {
    const reactionPath = `rooms/${activeRoom.id}/messages/${message.id}/reactions/${currentFirebaseUid}`;
    await update(ref(db), {
      [reactionPath]: shouldRemove ? null : {
        emoji,
        nick: currentUser?.nick || "Você",
        time: Date.now(),
        createdAt: serverTimestamp()
      }
    });
  } catch (error) {
    console.error("Erro ao reagir à mensagem.", error);
    showToast("Não foi possível reagir", "Verifique sua conexão e tente novamente.");
  }
}

function getCurrentUserHydration(message) {
  if (isLearningTestMessage(message)) return null;

  if (message?.hydration?.text) return message.hydration;

  // Compatibilidade com versões antigas: se existir hidratação salva por usuário,
  // exibe a mais recente para todos após atualizar o app.
  const hydrations = message?.hydrations || {};
  const latestHydration = Object.values(hydrations)
    .filter((hydration) => hydration?.text)
    .sort((a, b) => (b.time || 0) - (a.time || 0))[0];

  return latestHydration || null;
}

function getHydrationSourceText(message) {
  return (message?.translatedText || message?.text || message?.originalText || "").trim();
}

function getHydratedMessageOriginalText(message, hydration) {
  return (message?.originalText || hydration?.sourceText || message?.text || message?.translatedText || "").trim();
}

function getHydratedMessageTranslationText(message, hydration) {
  return getCachedHydratedNativeTranslation(message, hydration) || "";
}

function getHydratedTranslationCacheKey(message, hydration) {
  const roomId = getActiveRoom()?.id || activeRoomId || "room";
  const messageId = message?.id || message?.time || "msg";
  const language = getCurrentNativeLanguage();
  const hydrationStamp = hydration?.createdAtMillis || hydration?.time || hydration?.text || "hydrated";
  return `${roomId}:${messageId}:${language.code}:${hydrationStamp}`;
}

function getCachedHydratedNativeTranslation(message, hydration) {
  const key = getHydratedTranslationCacheKey(message, hydration);
  return hydratedTranslationCache.get(key) || "";
}

async function ensureHydratedNativeTranslation(message, hydration, translationWrap) {
  if (!translationWrap || !hydration?.text) return;
  const textElement = translationWrap.querySelector(".hydration-translation-text");
  const language = getCurrentNativeLanguage();
  const cacheKey = getHydratedTranslationCacheKey(message, hydration);
  const cached = hydratedTranslationCache.get(cacheKey);

  if (cached) {
    if (textElement) textElement.textContent = cached;
    translationWrap.dataset.translationReady = "1";
    return;
  }

  if (translationWrap.dataset.translating === "1") return;
  translationWrap.dataset.translating = "1";
  if (textElement) textElement.textContent = `Traduzindo para ${language.label}...`;

  try {
    const translated = await translateMessageText(hydration.text, language);
    const cleanTranslated = cleanMessageText(translated, 1000) || hydration.text;
    hydratedTranslationCache.set(cacheKey, cleanTranslated);
    if (textElement) textElement.textContent = cleanTranslated;
    translationWrap.dataset.translationReady = "1";
  } catch (error) {
    console.warn("Não foi possível traduzir a mensagem hidratada.", error);
    if (textElement) textElement.textContent = "Não foi possível traduzir agora.";
  } finally {
    translationWrap.dataset.translating = "0";
  }
}

async function hydrateReceivedMessage(message) {
  const activeRoom = getActiveRoom();
  if (!activeRoom || isAiRoom(activeRoom) || isMessageMine(message) || isLearningTestMessage(message) || !message?.id) return;

  if (!requireFirebaseConnection("hidratar mensagem")) return;

  if (!firebaseReady || !currentFirebaseUid) {
    showToast("Conexão indisponível", "Não foi possível hidratar a mensagem agora.");
    return;
  }

  const sourceText = getHydrationSourceText(message);
  if (!sourceText) {
    showToast("Mensagem vazia", "Não há texto para hidratar.");
    return;
  }

  const hydrateKey = `${activeRoom.id}:${message.id}`;
  if (hydratingMessageIds.has(hydrateKey)) return;

  hydratingMessageIds.add(hydrateKey);
  closeMessageMenus();
  showToast("Hidratando mensagem...", "A IA vai deixar o texto mais natural e atualizar para todos na conversa.");

  try {
    const hydratedText = await hydrateMessageText(sourceText, message, activeRoom);
    const cleanHydratedText = cleanMessageText(hydratedText, 1000);

    if (!cleanHydratedText) {
      throw new Error("A IA retornou uma mensagem vazia.");
    }

    const now = Date.now();
    await update(ref(db), {
      [`rooms/${activeRoom.id}/messages/${message.id}/hydration`]: {
        text: cleanHydratedText,
        sourceText,
        hydratedByUid: currentFirebaseUid,
        hydratedByNick: currentUser?.nick || "Você",
        createdAt: serverTimestamp(),
        createdAtMillis: now
      }
    });

    showToast("Mensagem hidratada", "A versão mais completa apareceu para todos nesta conversa.");
  } catch (error) {
    console.error("Erro ao hidratar mensagem.", error);
    showToast("Não foi possível hidratar", "Verifique sua conexão e tente novamente.");
  } finally {
    hydratingMessageIds.delete(hydrateKey);
  }
}

async function dehydrateMessage(message) {
  const activeRoom = getActiveRoom();
  if (!activeRoom || isAiRoom(activeRoom) || !message?.id) return;

  if (!requireFirebaseConnection("desidratar mensagem")) return;

  if (!firebaseReady || !currentFirebaseUid) {
    showToast("Conexão indisponível", "Não foi possível desidratar a mensagem agora.");
    return;
  }

  const dehydrateKey = `${activeRoom.id}:${message.id}`;
  if (dehydratingMessageIds.has(dehydrateKey)) return;

  dehydratingMessageIds.add(dehydrateKey);
  closeMessageMenus();
  const dehydrateEffect = startMessageDehydrateEffect(message);

  try {
    await dehydrateEffect.ready;
    await update(ref(db), {
      [`rooms/${activeRoom.id}/messages/${message.id}/hydration`]: null
    });
    dehydrateEffect.complete();
    showToast("Mensagem desidratada", "A mensagem voltou ao formato original para todos nesta conversa.");
  } catch (error) {
    dehydrateEffect.cancel();
    console.error("Erro ao desidratar mensagem.", error);
    showToast("Não foi possível desidratar", "Verifique sua conexão e tente novamente.");
  } finally {
    dehydratingMessageIds.delete(dehydrateKey);
  }
}

async function hydrateMessageText(text, message, room) {
  if (!requireInternet("hidratar mensagem")) {
    throw new Error("Sem internet para hidratar mensagem.");
  }

  const clean = cleanMessageText(text, 1000);
  if (!clean) return clean;

  const language = getRoomLanguage(room);
  const roomLanguage = language?.code ? language.name : "o mesmo idioma da mensagem";
  const senderName = message?.authorNick || message?.author || "a outra pessoa";
  const receiverName = currentUser?.nick || "usuário";
  const roomName = room?.name || "conversa";
  const roomKind = isPrivateRoom(room) ? "conversa privada" : "sala em grupo";

  const systemPrompt = `Você hidrata mensagens curtas, secas ou rasas em um app de conversa.
Transforme a mensagem em uma versão mais natural, completa e gentil, preservando a intenção original.
Não invente fatos, promessas ou sentimentos fortes que não estejam no contexto.
Se o contexto indicar casal ou intimidade, pode deixar carinhoso; se não houver contexto, mantenha amigável e adequado.
Se a mensagem for confirmação curta, deixe mais clara. Exemplo: "tá" pode virar "Está bem, gostei da ideia."
Se a mensagem for saudação curta, deixe mais acolhedora. Exemplo: "oi" pode virar "Oi, tudo bem?"
Responda em ${roomLanguage}. Responda somente com a mensagem hidratada, sem aspas e sem explicações.`;

  const userPrompt = `Contexto:
- Tipo: ${roomKind}
- Sala: ${roomName}
- Quem enviou: ${senderName}
- Quem vai ler: ${receiverName}

Mensagem original para hidratar:
${clean}`;

  const payload = {
    model: "openai",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.65,
    max_tokens: 220,
    stream: false
  };

  try {
    const response = await fetch(POLLINATIONS_CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Resposta HTTP ${response.status}`);

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || data?.response || "";
    const hydrated = cleanAiText(content).replace(/^['"]|['"]$/g, "");
    if (hydrated) return hydrated;
  } catch (error) {
    console.warn("Endpoint de hidratação por chat indisponível, tentando endpoint simples.", error);
  }

  const params = new URLSearchParams({
    model: "openai",
    temperature: "0.65",
    system: systemPrompt
  });
  const response = await fetch(`${POLLINATIONS_TEXT_ENDPOINT}${encodeURIComponent(userPrompt)}?${params.toString()}`);

  if (!response.ok) throw new Error(`Resposta HTTP ${response.status}`);

  const hydrated = cleanAiText(await response.text()).replace(/^['"]|['"]$/g, "");
  if (!hydrated) throw new Error("Hidratação vazia.");
  return hydrated;
}

function setupSwipeReply(row, bubble, message) {
  let startX = 0;
  let startY = 0;
  let deltaX = 0;
  let dragging = false;
  let pointerId = null;
  let longPressTimer = 0;

  const cancelLongPress = () => {
    window.clearTimeout(longPressTimer);
    longPressTimer = 0;
  };

  bubble.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, a, input, textarea, select")) return;
    closeMessageMenus();
    startX = event.clientX;
    startY = event.clientY;
    deltaX = 0;
    dragging = false;
    pointerId = event.pointerId;
    cancelLongPress();
    longPressTimer = window.setTimeout(() => {
      if (dragging || pointerId !== event.pointerId) return;
      row.dataset.longPressedRecently = "1";
      closeMessageMenus();
      toggleReactionPicker(message, bubble, null);
      if (navigator.vibrate) navigator.vibrate(25);
    }, 550);
    if (bubble.setPointerCapture) bubble.setPointerCapture(event.pointerId);
  });

  bubble.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;
    const moveX = event.clientX - startX;
    const moveY = event.clientY - startY;
    if (Math.abs(moveX) > 10 || Math.abs(moveY) > 10) cancelLongPress();
    if (Math.abs(moveY) > 32 && Math.abs(moveY) > Math.abs(moveX)) return;
    if (Math.abs(moveX) < 8) return;

    dragging = true;
    const direction = row.classList.contains("sent") ? -1 : 1;
    deltaX = Math.max(-74, Math.min(74, moveX));
    const visualDelta = direction * Math.abs(deltaX) * 0.55;
    bubble.classList.add("swiping");
    bubble.style.transform = `translateX(${visualDelta}px)`;
    row.classList.toggle("swipe-ready", Math.abs(deltaX) > 58);
  });

  bubble.addEventListener("pointerup", finishSwipe);
  bubble.addEventListener("pointercancel", finishSwipe);
  bubble.addEventListener("lostpointercapture", finishSwipe);
  bubble.addEventListener("contextmenu", (event) => {
    if (event.target.closest("button, a, input, textarea, select") || messageSelectionMode) return;
    event.preventDefault();
    if (row.dataset.longPressedRecently === "1") return;
    row.dataset.longPressedRecently = "1";
    closeMessageMenus();
    toggleReactionPicker(message, bubble, null);
  });

  function finishSwipe() {
    cancelLongPress();
    if (row.dataset.longPressedRecently === "1") {
      window.setTimeout(() => delete row.dataset.longPressedRecently, 400);
    }
    if (dragging && Math.abs(deltaX) > 58) {
      row.dataset.swipedRecently = "1";
      selectReplyTarget(message);
      row.classList.add("reply-selected-pulse");
      setTimeout(() => row.classList.remove("reply-selected-pulse"), 260);
      setTimeout(() => {
        if (row.dataset.swipedRecently === "1") delete row.dataset.swipedRecently;
      }, 320);
    }

    bubble.classList.remove("swiping");
    row.classList.remove("swipe-ready");
    bubble.style.transform = "";
    startX = 0;
    startY = 0;
    deltaX = 0;
    dragging = false;
    pointerId = null;
  }
}

function getLiveAuthorProfile(message) {
  const uid = message?.authorUid || "";
  if (!uid) return null;

  if (currentFirebaseUid && uid === currentFirebaseUid) {
    return {
      nick: currentUser?.nick || message.authorNick || message.author || "Você",
      avatar: currentUser?.avatar || getInitials(currentUser?.nick || "Você"),
      avatarIcon: getSafeSpaceAvatarIcon(currentUser?.avatarIcon || message.authorAvatarIcon)
    };
  }

  const room = getActiveRoom();
  const nick = room?.memberNickMap?.[uid] || message.authorNick || message.author || "Usuário";
  const avatarIcon = room?.memberAvatarIconMap?.[uid] || message.authorAvatarIcon || "";
  return {
    nick,
    avatar: getInitials(nick),
    avatarIcon: getSafeSpaceAvatarIcon(avatarIcon)
  };
}

function getMessageWithLiveAuthorProfile(message) {
  const profile = getLiveAuthorProfile(message);
  if (!profile) return message;

  return {
    ...message,
    authorNick: profile.nick,
    author: profile.nick,
    authorAvatar: profile.avatar,
    authorAvatarIcon: profile.avatarIcon
  };
}

function getMessageSignature(message) {
  const profile = getLiveAuthorProfile(message);
  return JSON.stringify({
    id: message.id || "",
    letter: message.letter || null,
    letterLocationRequest: message.letterLocationRequest || null,
    text: message.text || "",
    originalText: message.originalText || "",
    translatedText: message.translatedText || "",
    aiProvider: message.aiProvider || "",
    translationSourceText: isPendingTranslationMessage(message) ? message.translationSourceText || "" : "",
    targetLanguageCode: message.targetLanguageCode || "",
    learningTest: Boolean(message.learningTest),
    learningFeedbackStatus: message.learningFeedbackStatus || "",
    processingType: message.processingType || "",
    translationDisabled: Boolean(message.translationDisabled),
    learningFeedback: message.learningFeedback || {},
    translationError: Boolean(message.translationError),
    translationStatus: message.translationStatus || "",
    deliveryStatus: message.deliveryStatus || "",
    deliveryError: message.deliveryError || "",
    pendingOffline: Boolean(message.pendingOffline),
    localPending: Boolean(message.localPending),
    localOnly: Boolean(message.localOnly),
    deliveredBy: message.deliveredBy || {},
    readBy: message.readBy || {},
    mentionedUids: message.mentionedUids || {},
    mentionedNicks: message.mentionedNicks || [],
    replyTo: message.replyTo || null,
    reactions: message.reactions || {},
    hydration: message.hydration || {},
    hydrations: message.hydrations || {},
    authorUid: message.authorUid || "",
    authorNick: profile?.nick || message.authorNick || message.author || "",
    authorAvatarIcon: profile?.avatarIcon || message.authorAvatarIcon || "",
    time: message.time || 0
  });
}

function isMessageMine(message) {
  if (message.authorUid && currentFirebaseUid) return message.authorUid === currentFirebaseUid;
  return message.from === "me";
}

function createReplyQuoteElement(replyTo) {
  const quote = document.createElement("div");
  const author = document.createElement("strong");
  const text = document.createElement("span");

  quote.className = "reply-quote";
  author.textContent = replyTo.authorNick || replyTo.author || "Mensagem";
  text.textContent = getMessageDisplayText(replyTo, 120);
  quote.append(author, text);
  return quote;
}

function selectReplyTarget(message) {
  const activeRoom = getActiveRoom();
  if (!activeRoom || !message) return;

  replyTarget = {
    roomId: activeRoom.id,
    id: message.id || "",
    authorUid: message.authorUid || "",
    authorNick: message.authorNick || message.author || (isMessageMine(message) ? currentUser?.nick || "Você" : "Usuário"),
    text: getMessageDisplayText(message, 160),
    originalText: message.originalText || "",
    translatedText: message.translatedText || ""
  };

  renderReplyPreview();
}

function renderReplyPreview() {
  if (!replyPreview) return;

  const activeRoom = getActiveRoom();
  if (!replyTarget || !activeRoom || replyTarget.roomId !== activeRoom.id) {
    replyPreview.hidden = true;
    return;
  }

  replyPreviewAuthor.textContent = `Respondendo ${replyTarget.authorNick}`;
  replyPreviewText.textContent = replyTarget.text;
  replyPreview.hidden = false;
}

function clearReplyTarget() {
  replyTarget = null;
  renderReplyPreview();
}

function getReplyPayloadForMessage() {
  const activeRoom = getActiveRoom();
  if (!replyTarget || !activeRoom || replyTarget.roomId !== activeRoom.id) return null;

  return {
    id: replyTarget.id || "",
    authorUid: replyTarget.authorUid || "",
    authorNick: replyTarget.authorNick || "Usuário",
    text: replyTarget.text || "",
    originalText: replyTarget.originalText || "",
    translatedText: replyTarget.translatedText || ""
  };
}

function getMessageDisplayText(message, maxLength = 300) {
  const text = message?.translatedText || message?.text || message?.originalText || "";
  return truncateText(text, maxLength);
}

function appendMessage(message) {
  const activeRoom = getActiveRoom();
  if (!activeRoom) return;

  const emptyState = messages.querySelector(".empty-state");
  if (emptyState) emptyState.remove();

  message.id = message.id || createId("msg");
  const renderedIds = renderedMessageIdsByRoom.get(activeRoom.id) || new Set();
  renderedIds.add(message.id);
  renderedMessageIdsByRoom.set(activeRoom.id, renderedIds);

  removeLiveTypingRows();
  const previousMessage = (activeRoom.messages || []).at(-2) || null;
  const groupedWithPrevious = shouldGroupMessageWithPrevious(previousMessage, message);
  const element = createMessageElement(message, true, { groupedWithPrevious });
  element.dataset.signature = `${getMessageSignature(message)}|group:${groupedWithPrevious ? "1" : "0"}`;
  messages.appendChild(element);
  renderTypingPreviewPanel();
  scheduleMessagesScrollToBottom();
}

function renderEmptyConversation() {
  const activeRoom = getActiveRoom();
  const empty = isAiTeacherRoom(activeRoom)
    ? createEmptyState(
      "fa-solid fa-language",
      "Professor IA pronto",
      "Pergunte algo como: Quero treinar inglês básico, corrija minha frase ou crie um diálogo em espanhol."
    )
    : isAiFriendRoom(activeRoom)
      ? createEmptyState(
        "fa-solid fa-robot",
        `${getRoomDisplayName(activeRoom)} pronto`,
        "Envie uma mensagem como em uma conversa privada normal."
      )
    : createEmptyState(
      "fa-regular fa-comments",
      "Sala vazia",
      "Envie a primeira mensagem para começar."
    );
  messages.appendChild(empty);
}

function isMessagesNearBottom() {
  return messages.scrollHeight - messages.scrollTop - messages.clientHeight < 160;
}

function scheduleMessagesScrollToBottom() {
  if (pendingMessagesScrollFrame) cancelAnimationFrame(pendingMessagesScrollFrame);

  pendingMessagesScrollFrame = requestAnimationFrame(() => {
    messages.scrollTop = messages.scrollHeight;
    pendingMessagesScrollFrame = null;
  });
}

function scrollMessagesToBottom() {
  scheduleMessagesScrollToBottom();
}

function updateRoomItemContent(item, room) {
  const preview = item.querySelector(".chat-preview");
  const time = item.querySelector(".chat-time");
  const lastMessage = room.messages?.at(-1);
  const lastMessageText = lastMessage?.translatedText || lastMessage?.text || room.lastMessage || "";
  const originalPreview = lastMessage?.originalText || room.lastOriginalMessage || "";
  const lastMessageTime = lastMessage?.time || room.lastMessageAt || 0;
  const lastAuthorUid = lastMessage?.authorUid || room.lastMessageAuthorUid;
  const lastAuthorNick = lastMessage?.author || lastMessage?.authorNick || room.lastMessageAuthorNick || "Amigo";
  const minePrefix = currentFirebaseUid && lastAuthorUid === currentFirebaseUid ? `${currentUser?.nick || "Você"}: ` : `${lastAuthorNick}: `;
  const prefix = isAiRoom(room) || lastAuthorNick === AI_TEACHER_NAME ? `${lastAuthorNick}: ` : minePrefix;
  const unreadCount = getUnreadCount(room.id);

  preview.textContent = lastMessageText
    ? `${prefix}${lastMessageText}`
    : getRoomDescription(room) || "Sala vazia";

  time.textContent = lastMessageTime ? formatTime(lastMessageTime) : "";
  item.classList.toggle("has-unread", unreadCount > 0);
  renderRoomPinnedIndicator(item, isConversationPinned(room.id));
  renderRoomUnreadBadge(item, unreadCount);
}

function renderRoomPinnedIndicator(item, isPinned) {
  let indicator = item.querySelector(".chat-pin-indicator");
  const meta = item.querySelector(".chat-item-meta") || item.querySelector(".chat-item-top");

  if (!isPinned) {
    if (indicator) indicator.remove();
    return;
  }

  if (!indicator) {
    indicator = document.createElement("span");
    indicator.className = "chat-pin-indicator";
    indicator.title = "Conversa fixada";
    indicator.setAttribute("aria-label", "Conversa fixada");
    indicator.innerHTML = `<i class="fa-solid fa-thumbtack" aria-hidden="true"></i>`;
    meta.appendChild(indicator);
  }
}

function renderRoomUnreadBadge(item, count) {
  let badge = item.querySelector(".room-unread-badge");
  const meta = item.querySelector(".chat-item-meta") || item.querySelector(".chat-item-top");

  if (!count) {
    if (badge) badge.remove();
    return;
  }

  if (!badge) {
    badge = document.createElement("span");
    badge.className = "room-unread-badge";
    meta.appendChild(badge);
  }

  badge.textContent = count > 99 ? "99+" : String(count);
}

function updateRoomItemAfterNewMessage(room) {
  const item = chatList.querySelector(`[data-room-id="${room.id}"]`);

  if (!item) {
    renderRoomList(searchInput.value);
    return;
  }

  updateRoomItemContent(item, room);
  item.classList.add("active");

  renderRoomList(searchInput.value);
}

function renderFriendsList() {
  if (!friendsList) return;
  friendsList.innerHTML = "";

  if (!friends.length) {
    friendsList.appendChild(createEmptyState(
      "fa-solid fa-user-group",
      "Nenhum amigo adicionado",
      "Adicione amigos pelo nick. O amigo precisa ter entrado no app pelo menos uma vez."
    ));
    return;
  }

  friends
    .slice()
    .sort((a, b) => a.nick.localeCompare(b.nick, "pt-BR"))
    .forEach((friend) => {
      const item = document.createElement("article");
      const activeRoom = getActiveRoom();
      const canInvite = Boolean(friend.uid && activeRoom && !isAiRoom(activeRoom) && !isFriendAlreadyLinkedToActiveRoom(friend.uid));
      const label = friend.uid ? "Usuário encontrado" : "Amigo antigo · adicione novamente pelo nick";

      item.className = "friend-item";
      item.innerHTML = `
        <div class="avatar"></div>
        <div class="friend-info">
          <strong>${escapeHtml(friend.nick)}</strong>
          <span>${escapeHtml(label)}</span>
        </div>
        <div class="friend-actions compact-friend-actions">
          <button class="small-action invite-friend-action" type="button" ${canInvite ? "" : "disabled"}>
            <i class="fa-solid fa-paper-plane" aria-hidden="true"></i>
            <span>Convidar</span>
          </button>
          <button class="danger-action remove-friend-action" type="button">
            <i class="fa-solid fa-user-minus" aria-hidden="true"></i>
            <span>Remover</span>
          </button>
        </div>
      `;

      const avatar = item.querySelector(".avatar");
      avatar.style.background = getGradientByText(friend.nick);
      paintAvatar(avatar, friend, friend.nick);

      const inviteAction = item.querySelector(".invite-friend-action");
      inviteAction.addEventListener("click", () => inviteFriendToActiveRoom(friend));
      item.querySelector(".remove-friend-action").addEventListener("click", () => removeFriend(friend));

      friendsList.appendChild(item);
    });
}

function renderInvitesList() {
  if (!invitesList) return;
  invitesList.innerHTML = "";

  if (!invites.length) {
    invitesList.appendChild(createEmptyState(
      "fa-solid fa-envelope-open-text",
      "Nenhum convite",
      "Convites recebidos e enviados aparecerão aqui."
    ));
    return;
  }

  const sortedInvites = invites.slice().sort((a, b) => b.createdAt - a.createdAt);
  const groups = [
    {
      key: "receivedPending",
      title: "Pedidos para você",
      icon: "fa-solid fa-inbox",
      items: sortedInvites.filter((invite) => invite.toUid === currentFirebaseUid && invite.status === "pendente")
    },
    {
      key: "sentPending",
      title: "Convites enviados",
      icon: "fa-solid fa-paper-plane",
      items: sortedInvites.filter((invite) => invite.fromUid === currentFirebaseUid && invite.status === "pendente")
    },
    {
      key: "history",
      title: "Histórico",
      icon: "fa-solid fa-clock-rotate-left",
      items: sortedInvites.filter((invite) => invite.status !== "pendente")
    }
  ].filter((group) => group.items.length);

  groups.forEach((group) => {
    const groupEl = document.createElement("section");
    groupEl.className = "invite-notification-group";
    groupEl.innerHTML = `
      <div class="invite-group-title">
        <i class="${group.icon}" aria-hidden="true"></i>
        <strong>${escapeHtml(group.title)}</strong>
        <span>${group.items.length}</span>
      </div>
    `;

    group.items.forEach((invite) => {
      groupEl.appendChild(createInviteNotificationCard(invite));
    });

    invitesList.appendChild(groupEl);
  });
}

function createInviteNotificationCard(invite) {
  const card = document.createElement("article");
  const receivedByMe = invite.toUid === currentFirebaseUid;
  const sentByMe = invite.fromUid === currentFirebaseUid;
  const isFriendRequest = isFriendRequestInvite(invite);
  const otherNick = receivedByMe ? invite.fromNick : invite.toNick;
  const otherAvatarIcon = receivedByMe ? invite.fromAvatarIcon : invite.toAvatarIcon;
  const directionText = receivedByMe
    ? `${invite.fromNick || "Usuário"}`
    : `${invite.toNick || "Usuário"}`;
  const directionIcon = isFriendRequest
    ? "fa-solid fa-user-plus"
    : (receivedByMe ? "fa-solid fa-inbox" : "fa-solid fa-paper-plane");
  const directionLabel = receivedByMe ? "De" : "Para";
  const title = isFriendRequest ? "Pedido de amizade" : (invite.roomName || "Sala");

  card.className = `invite-card invite-notification-card compact-invite-row ${isFriendRequest ? "friend-request-row" : ""} ${invite.status || "pendente"}`;
  card.innerHTML = `
    <div class="avatar invite-avatar"></div>
    <div class="invite-card-main compact-invite-main">
      <strong class="compact-invite-room">${escapeHtml(title)}</strong>
      <span class="compact-invite-person">
        <i class="${directionIcon}" aria-hidden="true"></i>
        <span>${escapeHtml(directionLabel)} ${escapeHtml(directionText)}</span>
      </span>
      <time>${escapeHtml(formatDateTime(invite.createdAt))}</time>
    </div>
    <span class="status-pill compact-status-pill ${escapeHtml(invite.status || "pendente")}">${formatStatus(invite.status || "pendente")}</span>
    <div class="invite-actions icon-only-actions"></div>
  `;

  const avatar = card.querySelector(".invite-avatar");
  avatar.style.background = getGradientByText(otherNick || title || "Convite");
  paintAvatar(avatar, { nick: otherNick, avatarIcon: otherAvatarIcon }, otherNick || "U");

  const actions = card.querySelector(".invite-actions");

  if (invite.status === "pendente" && receivedByMe) {
    const acceptButton = createActionButton("small-action icon-only-action", "fa-solid fa-check", "Aceitar");
    acceptButton.addEventListener("click", () => acceptInvite(invite.id));
    actions.appendChild(acceptButton);

    const cancelButton = createActionButton("danger-action icon-only-action", "fa-solid fa-xmark", "Recusar");
    cancelButton.addEventListener("click", () => cancelInvite(invite.id));
    actions.appendChild(cancelButton);
  } else if (invite.status === "pendente" && sentByMe) {
    const cancelButton = createActionButton("danger-action icon-only-action", "fa-solid fa-ban", "Cancelar convite");
    cancelButton.addEventListener("click", () => cancelInvite(invite.id));
    actions.appendChild(cancelButton);
  } else {
    const deleteButton = createActionButton("danger-action icon-only-action", "fa-solid fa-trash-can", "Remover notificação");
    deleteButton.addEventListener("click", () => deleteInvite(invite.id));
    actions.appendChild(deleteButton);
  }

  return card;
}

function renderUnreadNotificationsList() {
  if (!unreadList) return;
  unreadList.innerHTML = "";

  const unreadRooms = getUnreadRoomsForNotifications();

  if (!unreadRooms.length) {
    unreadList.appendChild(createEmptyState(
      "fa-regular fa-comment-dots",
      "Nenhuma mensagem não lida",
      "Quando uma sala receber mensagens novas, elas aparecem aqui e no sino."
    ));
    return;
  }

  unreadRooms.forEach((room) => {
    const card = document.createElement("article");
    const count = getUnreadCount(room.id);
    card.className = "unread-card";
    card.innerHTML = `
      <div class="avatar">${escapeHtml(getRoomAvatar(room))}</div>
      <div class="friend-info">
        <strong>${escapeHtml(getRoomDisplayName(room))}</strong>
        <span>${escapeHtml(room.lastMessage || "Nova mensagem")}</span>
      </div>
      <span class="room-unread-badge">${count > 99 ? "99+" : count}</span>
    `;
    paintRoomAvatar(card.querySelector(".avatar"), room);
    card.addEventListener("click", () => openRoomFromNotification(room.id));
    unreadList.appendChild(card);
  });
}

function getUnreadRoomsForNotifications() {
  const visibleRooms = getVisibleRooms();
  const visibleRoomIds = new Set(visibleRooms.map((room) => room.id));
  const fallbackRooms = Object.entries(notificationState.unreadByRoom || {})
    .filter(([roomId, count]) => roomId && Number(count || 0) > 0 && !visibleRoomIds.has(roomId))
    .filter(([roomId]) => roomLastMessageUnsubscribers.has(roomId) || roomMessagesById.has(roomId) || remoteRoomMap.has(roomId))
    .map(([roomId]) => createUnreadFallbackRoom(roomId));

  return [...visibleRooms, ...fallbackRooms]
    .filter((room) => getUnreadCount(room.id) > 0)
    .sort((a, b) => getLastTime(b) - getLastTime(a));
}

function createUnreadFallbackRoom(roomId) {
  const lastMessage = roomMessagesById.get(roomId)?.at(-1) || null;
  const authorNick = lastMessage?.authorNick || lastMessage?.author || "Usuário";
  const lastMessageText = getMessageDisplayText(lastMessage, 300) || "Nova mensagem";

  return {
    id: roomId,
    type: USER_ROOM_TYPE,
    name: "Conversa",
    avatar: "C",
    color: getGradientByText(roomId),
    lastMessage: `${authorNick}: ${lastMessageText}`,
    lastMessageId: lastMessage?.id || "",
    lastMessageAuthorUid: lastMessage?.authorUid || "",
    lastMessageAuthorNick: authorNick,
    lastMessageAt: Number(lastMessage?.time || lastMessage?.createdAt || Date.now()),
    messages: lastMessage ? [lastMessage] : []
  };
}

async function createFirebaseRoom(name, description, selectedFriends, language = getLanguageOption("")) {
  if (!requireFirebaseConnection("criar sala")) {
    throw new Error("Sem internet ou Firebase desconectado.");
  }

  if (!firebaseReady || !currentFirebaseUid) {
    throw new Error("Firebase ainda não conectado.");
  }

  const invitedUids = unique(selectedFriends.map((friend) => friend.uid).filter(Boolean));
  const invitedNickMap = selectedFriends.reduce((map, friend) => {
    if (friend.uid) map[friend.uid] = friend.nick;
    return map;
  }, {});
  const now = Date.now();
  const roomRef = push(ref(db, "rooms"));
  const roomId = roomRef.key;

  const roomPayload = {
    type: USER_ROOM_TYPE,
    name,
    avatar: getInitials(name),
    description,
    languageCode: language?.code || "",
    languageName: language?.name || "",
    translationEnabled: Boolean(language?.code),
    color: getGradientByText(name),
    ownerUid: currentFirebaseUid,
    ownerNick: currentUser?.nick || "Você",
    ownerAvatarIcon: getSafeSpaceAvatarIcon(currentUser?.avatarIcon),
    memberUids: { [currentFirebaseUid]: true },
    memberNicks: { [currentFirebaseUid]: currentUser?.nick || "Você" },
    memberAvatarIcons: { [currentFirebaseUid]: getSafeSpaceAvatarIcon(currentUser?.avatarIcon) },
    invitedUids: invitedUids.reduce((map, uid) => ({ ...map, [uid]: true }), {}),
    invitedNicks: invitedNickMap,
    lastMessage: "",
    lastMessageId: "",
    lastMessageAuthorUid: "",
    lastMessageAuthorNick: "",
    lastMessageAt: now,
    createdAt: serverTimestamp(),
    createdAtMillis: now,
    updatedAt: serverTimestamp(),
    updatedAtMillis: now
  };

  await update(ref(db), {
    [`rooms/${roomId}`]: roomPayload,
    [`userRooms/${currentFirebaseUid}/${roomId}`]: true
  });

  const room = {
    id: roomId,
    ...roomPayload,
    memberUids: [currentFirebaseUid],
    memberNicks: [currentUser?.nick || "Você"],
    memberNickMap: { [currentFirebaseUid]: currentUser?.nick || "Você" },
    memberAvatarIconMap: { [currentFirebaseUid]: getSafeSpaceAvatarIcon(currentUser?.avatarIcon) },
    invitedUids,
    invitedNicks: Object.values(invitedNickMap),
    languageCode: language?.code || "",
    languageName: language?.name || "",
    translationEnabled: Boolean(language?.code),
    messages: [],
    createdAt: now,
    updatedAt: now
  };

  await Promise.all(selectedFriends.map((friend) => createFirebaseInvite(room, friend)));
  return room;
}

async function createFirebaseInvite(room, friend) {
  if (!requireFirebaseConnection("enviar convite")) return;

  if (!room || isPrivateRoom(room) || !friend?.uid || !currentFirebaseUid) return;

  const inviteId = `${room.id}_${friend.uid}`;
  const inviteSnapshot = await get(ref(db, `invites/${inviteId}`));

  if (inviteSnapshot.exists() && inviteSnapshot.val()?.status === "pendente") return;

  const now = Date.now();
  const invitePayload = {
    id: inviteId,
    roomId: room.id,
    roomName: room.name,
    fromUid: currentFirebaseUid,
    fromNick: currentUser?.nick || "Você",
    toUid: friend.uid,
    toNick: friend.nick,
    status: "pendente",
    createdAt: serverTimestamp(),
    createdAtMillis: now,
    updatedAt: serverTimestamp(),
    updatedAtMillis: now
  };

  await update(ref(db), {
    [`invites/${inviteId}`]: invitePayload,
    [`userInvites/${currentFirebaseUid}/sent/${inviteId}`]: true,
    [`userInvites/${friend.uid}/received/${inviteId}`]: true,
    [`rooms/${room.id}/invitedUids/${friend.uid}`]: true,
    [`rooms/${room.id}/invitedNicks/${friend.uid}`]: friend.nick,
    [`rooms/${room.id}/invitedAvatarIcons/${friend.uid}`]: getSafeSpaceAvatarIcon(friend.avatarIcon),
    [`rooms/${room.id}/updatedAt`]: serverTimestamp(),
    [`rooms/${room.id}/updatedAtMillis`]: now
  });

  void notifyPushWorkerAboutInvite(invitePayload);
}

async function inviteFriendToRoom(room, friend) {
  if (!room || isAiRoom(room) || !friend?.uid) return;
  await createFirebaseInvite(room, friend);
}

async function inviteFriendToActiveRoom(friend) {
  const activeRoom = getActiveRoom();
  if (!activeRoom) {
    window.alert("Crie ou abra uma sala antes de convidar amigos.");
    return;
  }

  if (isAiRoom(activeRoom)) {
    window.alert("Salas IA sao exclusivas do usuario e nao aceitam convites.");
    return;
    window.alert("A sala do Professor IA é exclusiva do usuário e não aceita convites.");
    return;
  }

  if (!friend.uid) {
    window.alert("Esse amigo é antigo. Adicione o nick novamente para atualizar o cadastro.");
    return;
  }

  if (isFriendAlreadyLinkedToActiveRoom(friend.uid)) {
    window.alert("Esse amigo já foi convidado ou já entrou na sala.");
    return;
  }

  try {
    await inviteFriendToRoom(activeRoom, friend);
    setActiveView("invites");
    renderAll();
  } catch (error) {
    console.error("Erro ao convidar amigo.", error);
    window.alert("Não foi possível enviar o convite agora.");
  }
}

async function acceptInvite(inviteId) {
  const invite = invites.find((item) => item.id === inviteId);
  if (!invite || !currentFirebaseUid) return;
  if (!requireFirebaseConnection("aceitar convite")) return;

  if (isFriendRequestInvite(invite)) {
    try {
      await acceptFriendRequest(invite);
    } catch (error) {
      console.error("Erro ao aceitar pedido de amizade.", error);
      window.alert("Não foi possível aceitar o pedido de amizade agora.");
    }
    return;
  }

  try {
    const invitedRoomSnapshot = await get(ref(db, `rooms/${invite.roomId}`));
    const invitedRoomData = invitedRoomSnapshot.val() || {};
    if (isPrivateRoom(invitedRoomData)) {
      const privateMembers = Object.keys(invitedRoomData.memberUids || {}).filter((uid) => invitedRoomData.memberUids?.[uid]);
      if (!privateMembers.includes(currentFirebaseUid) && privateMembers.length >= 2) {
        window.alert("Esta conversa privada já possui os dois participantes permitidos.");
        return;
      }
    }
    const now = Date.now();
    await update(ref(db), {
      [`invites/${invite.id}/status`]: "aceito",
      [`invites/${invite.id}/acceptedAt`]: serverTimestamp(),
      [`invites/${invite.id}/acceptedAtMillis`]: now,
      [`invites/${invite.id}/updatedAt`]: serverTimestamp(),
      [`invites/${invite.id}/updatedAtMillis`]: now,
      [`rooms/${invite.roomId}/memberUids/${currentFirebaseUid}`]: true,
      [`rooms/${invite.roomId}/memberNicks/${currentFirebaseUid}`]: currentUser?.nick || invite.toNick,
      [`rooms/${invite.roomId}/memberAvatarIcons/${currentFirebaseUid}`]: getSafeSpaceAvatarIcon(currentUser?.avatarIcon),
      [`rooms/${invite.roomId}/invitedUids/${currentFirebaseUid}`]: null,
      [`rooms/${invite.roomId}/invitedNicks/${currentFirebaseUid}`]: null,
      [`rooms/${invite.roomId}/invitedAvatarIcons/${currentFirebaseUid}`]: null,
      [`rooms/${invite.roomId}/updatedAt`]: serverTimestamp(),
      [`rooms/${invite.roomId}/updatedAtMillis`]: now,
      [`userRooms/${currentFirebaseUid}/${invite.roomId}`]: true
    });

    activeRoomId = invite.roomId;
    suppressAutoRoomSelection = false;
    setActiveView("rooms");
    subscribeToActiveRoomMessages();
  } catch (error) {
    console.error("Erro ao aceitar convite.", error);
    window.alert("Não foi possível aceitar o convite agora.");
  }
}

async function cancelInvite(inviteId) {
  const invite = invites.find((item) => item.id === inviteId);
  if (!invite) return;
  if (!requireFirebaseConnection("cancelar convite")) return;

  try {
    const now = Date.now();
    const updates = {
      [`invites/${invite.id}/status`]: "cancelado",
      [`invites/${invite.id}/cancelledAt`]: serverTimestamp(),
      [`invites/${invite.id}/cancelledAtMillis`]: now,
      [`invites/${invite.id}/updatedAt`]: serverTimestamp(),
      [`invites/${invite.id}/updatedAtMillis`]: now
    };

    if (invite.roomId && invite.toUid) {
      updates[`rooms/${invite.roomId}/invitedUids/${invite.toUid}`] = null;
      updates[`rooms/${invite.roomId}/invitedNicks/${invite.toUid}`] = null;
      updates[`rooms/${invite.roomId}/updatedAt`] = serverTimestamp();
      updates[`rooms/${invite.roomId}/updatedAtMillis`] = now;
    }

    await update(ref(db), updates);
  } catch (error) {
    console.error("Erro ao cancelar convite.", error);
    window.alert("Não foi possível atualizar o convite.");
  }
}

async function deleteInvite(inviteId) {
  const invite = invites.find((item) => item.id === inviteId);
  if (!requireFirebaseConnection("remover convite")) return;

  try {
    const updates = {
      [`invites/${inviteId}`]: null
    };

    if (invite?.fromUid) updates[`userInvites/${invite.fromUid}/sent/${inviteId}`] = null;
    if (invite?.toUid) updates[`userInvites/${invite.toUid}/received/${inviteId}`] = null;

    await update(ref(db), updates);
  } catch (error) {
    console.error("Erro ao remover convite.", error);
    window.alert("Não foi possível remover o convite.");
  }
}

async function clearFirebaseRoomMessages(roomId) {
  if (!requireFirebaseConnection("limpar conversa")) {
    throw new Error("Sem internet ou Firebase desconectado.");
  }

  const now = Date.now();
  await update(ref(db), {
    [`rooms/${roomId}/messages`]: null,
    [`rooms/${roomId}/lastMessage`]: "",
    [`rooms/${roomId}/lastMessageId`]: "",
    [`rooms/${roomId}/lastMessageAuthorUid`]: "",
    [`rooms/${roomId}/lastMessageAuthorNick`]: "",
    [`rooms/${roomId}/lastMessageMentionedUids`]: null,
    [`rooms/${roomId}/lastMessageMentionedNicks`]: null,
    [`rooms/${roomId}/lastMessageAt`]: now,
    [`rooms/${roomId}/updatedAt`]: serverTimestamp(),
    [`rooms/${roomId}/updatedAtMillis`]: now
  });

  roomMessagesById.set(roomId, []);
  forceMessageRerender(roomId);
  renderActiveRoom(true);
  renderRoomList(searchInput.value);
}

async function findFirebaseUsersByNick(nick) {
  if (!requireFirebaseConnection("buscar usuarios")) return [];

  const nickKey = normalize(nick);
  const nickPathKey = toDatabaseKey(nickKey);
  if (!nickKey || !nickPathKey) return [];

  const indexQuery = query(
    ref(db, "nickIndex"),
    orderByKey(),
    startAt(nickPathKey),
    endAt(`${nickPathKey}\uf8ff`),
    limitToFirst(12)
  );
  const indexSnapshot = await get(indexQuery);
  let users = [];

  if (indexSnapshot.exists()) {
    users = Object.values(indexSnapshot.val() || {}).flatMap((entry) => Object.values(entry || {}));
  } else {
    const usersQuery = query(ref(db, "users"), orderByChild("nickKey"), equalTo(nickKey));
    const usersSnapshot = await get(usersQuery);
    users = usersSnapshot.exists() ? Object.values(usersSnapshot.val() || {}) : [];
  }

  return users
    .filter((user) => user.uid !== currentFirebaseUid)
    .filter((user) => normalize(user.nick || user.nickKey || "").includes(nickKey))
    .filter((user, index, list) => list.findIndex((item) => item.uid === user.uid) === index)
    .sort((a, b) => normalize(a.nick || "").localeCompare(normalize(b.nick || ""), "pt-BR"))
    .map((user) => ({
      uid: user.uid,
      nick: user.nick || nick,
      nickKey: user.nickKey || nickKey,
      avatar: user.avatar || getInitials(user.nick || nick),
      avatarIcon: getSafeSpaceAvatarIcon(user.avatarIcon)
    }));
}



function openRoomSettingsModal() {
  const activeRoom = getActiveRoom();
  if (!activeRoom) return;

  renderRoomSettings(activeRoom);
  roomSettingsModal.hidden = false;
  roomSettingsModal.setAttribute("aria-hidden", "false");
}

function closeRoomSettingsModal() {
  if (!roomSettingsModal) return;
  roomSettingsModal.hidden = true;
  roomSettingsModal.setAttribute("aria-hidden", "true");
}

function renderRoomSettings(room = getActiveRoom()) {
  if (!room) return;
  renderRoomVoiceSettings(room);

  if (isAiRoom(room)) {
    const isTeacher = isAiTeacherRoom(room);
    const isFriend = isAiFriendRoom(room);
    const language = getRoomLanguage(room);
    roomSettingsSubtitle.textContent = isTeacher
      ? `${getRoomDisplayName(room)} · foco de estudo e conversa local`
      : `${getRoomDisplayName(room)} · amigo IA local`;
    if (roomLanguageSettingsSection) roomLanguageSettingsSection.hidden = !isFriend;
    if (roomSettingsLanguageSelect) roomSettingsLanguageSelect.value = language?.code || "";
    if (saveRoomLanguageButton) saveRoomLanguageButton.disabled = false;
    if (roomMembersSettingsSection) roomMembersSettingsSection.hidden = true;
    if (teacherDifficultySettingsSection) teacherDifficultySettingsSection.hidden = !isTeacher;
    if (roomSettingsSelectMessagesButton) roomSettingsSelectMessagesButton.hidden = true;
    if (deleteRoomButton) {
      deleteRoomButton.hidden = isTeacher;
      deleteRoomButton.querySelector("span").textContent = "Excluir amigo IA";
      deleteRoomButton.querySelector("i").className = "fa-solid fa-trash-can";
    }
    updateLiveTypingButtonState();
    updateRoomPinButtonState(room);
    renderTeacherDifficultySettings(room);
    return;
  }

  const isOwner = isRoomOwner(room);
  const language = getRoomLanguage(room);
  if (roomLanguageSettingsSection) roomLanguageSettingsSection.hidden = false;
  if (roomMembersSettingsSection) roomMembersSettingsSection.hidden = false;
  if (teacherDifficultySettingsSection) teacherDifficultySettingsSection.hidden = true;
  if (roomSettingsSelectMessagesButton) roomSettingsSelectMessagesButton.hidden = false;
  if (deleteRoomButton) deleteRoomButton.hidden = false;
  roomSettingsSubtitle.textContent = `${getRoomDisplayName(room)} · ${isOwner ? "você criou esta sala" : "participante"}`;
  roomSettingsLanguageSelect.value = language?.code || "";
  saveRoomLanguageButton.disabled = !firebaseReady;
  updateLiveTypingButtonState();
  updateRoomPinButtonState(room);
  // roomDeleteHint.textContent = isOwner
  //   ? "Você criou esta sala. Excluir remove a sala para todos."
  //   : "Você não criou esta sala. Você pode sair/remover esta sala da sua lista.";
  deleteRoomButton.querySelector("span").textContent = isOwner ? "Excluir sala para todos" : "Sair da sala";
  deleteRoomButton.querySelector("i").className = isOwner ? "fa-solid fa-trash-can" : "fa-solid fa-right-from-bracket";

  renderRoomMembers(room);
}

function renderTeacherDifficultySettings(room = getActiveRoom()) {
  if (!teacherDifficultyList || !teacherDifficultyCounter) return;

  teacherDifficultyList.innerHTML = "";
  if (!isAiTeacherRoom(room)) {
    teacherDifficultyCounter.textContent = "Nenhuma ativa";
    return;
  }

  room.aiDifficulties = normalizeAiDifficulties(room.aiDifficulties);
  const activeDifficulties = getActiveAiDifficulties(room);
  const doneDifficulties = getDoneAiDifficulties(room);
  teacherDifficultyCounter.textContent = activeDifficulties.length
    ? `${activeDifficulties.length} ativa${activeDifficulties.length === 1 ? "" : "s"}`
    : "Nenhuma ativa";

  if (!activeDifficulties.length && !doneDifficulties.length) {
    teacherDifficultyList.appendChild(createEmptyState(
      "fa-solid fa-graduation-cap",
      "Sem dificuldades cadastradas",
      "Adicione um ponto para o Professor IA focar nas proximas respostas."
    ));
    return;
  }

  [...activeDifficulties, ...doneDifficulties].forEach((difficulty) => {
    const isDone = difficulty.status === AI_DIFFICULTY_DONE;
    const item = document.createElement("article");
    item.className = `teacher-difficulty-item${isDone ? " is-done" : ""}`;
    item.innerHTML = `
      <div class="teacher-difficulty-main">
        <strong>${escapeHtml(difficulty.text)}</strong>
        <span>${isDone ? "Concluida" : "Foco ativo"}</span>
      </div>
      <div class="teacher-difficulty-actions"></div>
    `;

    const actions = item.querySelector(".teacher-difficulty-actions");
    if (!isDone) {
      const doneButton = createActionButton("small-action icon-only-action", "fa-solid fa-check", "Marcar como concluida");
      doneButton.addEventListener("click", () => setTeacherDifficultyStatus(difficulty.id, AI_DIFFICULTY_DONE));
      actions.appendChild(doneButton);
    }

    const removeButton = createActionButton("danger-action icon-only-action", "fa-solid fa-trash-can", "Remover dificuldade");
    removeButton.addEventListener("click", () => removeTeacherDifficulty(difficulty.id));
    actions.appendChild(removeButton);
    teacherDifficultyList.appendChild(item);
  });
}

function handleTeacherDifficultySubmit(event) {
  event.preventDefault();

  const room = getActiveRoom();
  if (!isAiTeacherRoom(room)) return;

  const text = sanitizeText(teacherDifficultyInput?.value || "", 120);
  if (!text) return;

  room.aiDifficulties = normalizeAiDifficulties(room.aiDifficulties);
  const alreadyActive = getActiveAiDifficulties(room).some((difficulty) => normalize(difficulty.text) === normalize(text));
  if (alreadyActive) {
    showToast("Dificuldade repetida", "Esse foco ja esta ativo no Professor IA.");
    return;
  }

  room.aiDifficulties.unshift({
    id: createId("diff"),
    text,
    status: AI_DIFFICULTY_ACTIVE,
    createdAt: Date.now(),
    completedAt: 0
  });
  if (teacherDifficultyInput) teacherDifficultyInput.value = "";
  persistTeacherDifficultyChange(room, "Dificuldade adicionada", "O Professor IA vai focar nesse ponto nas proximas respostas.");
}

function setTeacherDifficultyStatus(difficultyId, status) {
  const room = getActiveRoom();
  if (!isAiTeacherRoom(room) || !difficultyId) return;

  room.aiDifficulties = normalizeAiDifficulties(room.aiDifficulties).map((difficulty) => (
    difficulty.id === difficultyId
      ? {
        ...difficulty,
        status: status === AI_DIFFICULTY_DONE ? AI_DIFFICULTY_DONE : AI_DIFFICULTY_ACTIVE,
        completedAt: status === AI_DIFFICULTY_DONE ? Date.now() : 0
      }
      : difficulty
  ));

  persistTeacherDifficultyChange(room, "Dificuldade concluida", "O Professor IA nao vai mais priorizar esse ponto.");
}

function removeTeacherDifficulty(difficultyId) {
  const room = getActiveRoom();
  if (!isAiTeacherRoom(room) || !difficultyId) return;

  room.aiDifficulties = normalizeAiDifficulties(room.aiDifficulties).filter((difficulty) => difficulty.id !== difficultyId);
  persistTeacherDifficultyChange(room, "Dificuldade removida", "Esse foco saiu da sala do Professor IA.");
}

function persistTeacherDifficultyChange(room, title, message) {
  room.updatedAt = Date.now();
  saveRooms();
  renderTeacherDifficultySettings(room);
  renderActiveRoom(false);
  renderRoomList(searchInput.value);
  showToast(title, message);
}

function renderRoomMembers(room = getActiveRoom()) {
  if (!roomMembersList) return;
  roomMembersList.innerHTML = "";

  const members = getRoomMembers(room);
  if (!members.length) {
    roomMembersList.appendChild(createEmptyState("fa-solid fa-user-group", "Sem usuários", "Nenhum participante encontrado nesta sala."));
    return;
  }

  const isOwner = isRoomOwner(room);
  members.forEach((member) => {
    const isMe = member.uid === currentFirebaseUid;
    const isFriend = friends.some((friend) => friend.uid === member.uid);
    const item = document.createElement("article");
    item.className = `room-member-item${member.uid === room.ownerUid ? " is-owner" : ""}${isMe ? " is-me" : ""}`;
    item.innerHTML = `
      <div style="display: flex;">
        <div class="avatar" style="margin-right: 8px;"></div>
        <div class="friend-info room-member-info">
          <div class="room-member-name-line">
            <strong>${escapeHtml(member.nick)}</strong>
            ${isMe ? `<span class="status-pill self-pill">Você</span>` : ""}
          </div>
          <span>${member.uid === room.ownerUid ? "Criador da sala" : "Participante"}</span>
        </div>
      </div>
      <div class="friend-actions room-member-actions"></div>
    `;

    const avatar = item.querySelector(".avatar");
    avatar.style.background = getGradientByText(member.nick);
    paintAvatar(avatar, member, member.nick);

    const actions = item.querySelector(".room-member-actions");

    if (!isMe) {
      const friendButton = createActionButton(isFriend ? "ghost-mini-action" : "small-action", isFriend ? "fa-solid fa-user-check" : "fa-solid fa-user-plus", isFriend ? "Amigo" : "Amizade");
      friendButton.disabled = isFriend;
      friendButton.title = isFriend ? "Este usuário já está na sua lista" : "Adicionar este usuário à sua lista de amigos";
      friendButton.addEventListener("click", () => addMemberAsFriend(member));
      actions.appendChild(friendButton);
    }

    if (isOwner && !isMe && !isPrivateRoom(room)) {
      const removeButton = createActionButton("danger-action", "fa-solid fa-user-xmark", "Remover");
      removeButton.title = "Remover usuário da sala";
      removeButton.addEventListener("click", () => removeMemberFromActiveRoom(member));
      actions.appendChild(removeButton);
    }

    if (!actions.children.length) {
      const pill = document.createElement("span");
      pill.className = "status-pill muted";
      pill.textContent = isMe ? "Você" : "Sem ações";
      actions.appendChild(pill);
    }

    roomMembersList.appendChild(item);
  });
}

function getRoomMembers(room) {
  if (!room) return [];
  const nickMap = room.memberNickMap || {};
  const iconMap = room.memberAvatarIconMap || {};
  const members = Object.entries(nickMap).map(([uid, nick]) => ({
    uid,
    nick: nick || "Usuário",
    avatar: getInitials(nick || "Usuário"),
    avatarIcon: uid === currentFirebaseUid
      ? getSafeSpaceAvatarIcon(currentUser?.avatarIcon)
      : getSafeSpaceAvatarIcon(iconMap[uid] || "")
  }));

  if (!members.some((member) => member.uid === currentFirebaseUid) && currentFirebaseUid) {
    members.unshift({ uid: currentFirebaseUid, nick: currentUser?.nick || "Você", avatar: currentUser?.avatar, avatarIcon: currentUser?.avatarIcon });
  }

  return members.sort((a, b) => {
    if (a.uid === room.ownerUid) return -1;
    if (b.uid === room.ownerUid) return 1;
    if (a.uid === currentFirebaseUid) return -1;
    if (b.uid === currentFirebaseUid) return 1;
    return a.nick.localeCompare(b.nick, "pt-BR");
  });
}

function isRoomOwner(room) {
  return Boolean(room?.ownerUid && currentFirebaseUid && room.ownerUid === currentFirebaseUid);
}

async function addMemberAsFriend(member) {
  if (!member?.uid || member.uid === currentFirebaseUid) return;

  try {
    const result = await sendFriendRequest({
      uid: member.uid,
      nick: member.nick,
      avatar: member.avatar || getInitials(member.nick),
      avatarIcon: member.avatarIcon || ""
    }, { wantsPrivateChat: false });

    renderRoomSettings(getActiveRoom());
    renderPrivateFriendsList();

    if (result === "accepted-existing") {
      showToast("Amizade aceita", `${member.nick} entrou na sua lista de amigos.`);
    } else if (result === "pending-existing") {
      showToast("Pedido já pendente", `Aguarde ${member.nick} aceitar seu pedido de amizade.`);
    } else if (result === "sent") {
      showToast("Pedido enviado", `${member.nick} precisa aceitar seu pedido de amizade.`);
    }
  } catch (error) {
    console.error("Erro ao enviar pedido de amizade.", error);
    window.alert("Não foi possível enviar o pedido de amizade agora.");
  }
}

async function removeMemberFromActiveRoom(member) {
  const room = getActiveRoom();
  if (!room || !member?.uid || !isRoomOwner(room) || member.uid === currentFirebaseUid) return;
  if (!requireFirebaseConnection("remover membro")) return;

  const ok = window.confirm(`Remover ${member.nick} da sala ${getRoomDisplayName(room)}?`);
  if (!ok) return;

  try {
    const now = Date.now();
    await update(ref(db), {
      [`rooms/${room.id}/memberUids/${member.uid}`]: null,
      [`rooms/${room.id}/memberNicks/${member.uid}`]: null,
      [`rooms/${room.id}/memberAvatarIcons/${member.uid}`]: null,
      [`rooms/${room.id}/typing/${member.uid}`]: null,
      [`userRooms/${member.uid}/${room.id}`]: null,
      [`rooms/${room.id}/updatedAt`]: serverTimestamp(),
      [`rooms/${room.id}/updatedAtMillis`]: now
    });
    showToast("Usuário removido", `${member.nick} saiu da sala.`);
    renderRoomSettings(getActiveRoom());
  } catch (error) {
    console.error("Erro ao remover usuário da sala.", error);
    window.alert("Não foi possível remover este usuário agora.");
  }
}

async function saveActiveRoomLanguageFromSettings() {
  const room = getActiveRoom();
  if (!room) return;

  if (isAiFriendRoom(room)) {
    const language = getLanguageOption(roomSettingsLanguageSelect?.value || "");
    room.languageCode = language?.code || "";
    room.languageName = language?.name || "";
    room.translationEnabled = Boolean(language?.code);
    room.updatedAt = Date.now();
    saveRooms();
    showToast("Idioma atualizado", language?.code ? `Novas mensagens serao traduzidas para ${language.label}.` : "A traducao automatica foi desativada neste amigo IA.");
    renderRoomSettings(room);
    renderActiveRoom(false);
    renderRoomList(searchInput.value);
    return;
  }

  if (isAiRoom(room)) return;
  if (!requireFirebaseConnection("salvar idioma da sala")) return;

  const language = getLanguageOption(roomSettingsLanguageSelect?.value || "");
  try {
    const now = Date.now();
    await update(ref(db), {
      [`rooms/${room.id}/languageCode`]: language?.code || "",
      [`rooms/${room.id}/languageName`]: language?.name || "",
      [`rooms/${room.id}/translationEnabled`]: Boolean(language?.code),
      [`rooms/${room.id}/updatedAt`]: serverTimestamp(),
      [`rooms/${room.id}/updatedAtMillis`]: now
    });
    showToast("Idioma atualizado", language?.code ? `Novas mensagens serão traduzidas para ${language.label}.` : "A tradução automática foi desativada nesta sala.");
    renderRoomSettings(getActiveRoom());
    renderActiveRoom(false);
  } catch (error) {
    console.error("Erro ao atualizar idioma da sala.", error);
    window.alert("Não foi possível trocar o idioma da sala agora.");
  }
}

async function handleDeleteOrLeaveRoomFromSettings() {
  const room = getActiveRoom();
  if (!room) return;

  if (isAiFriendRoom(room)) {
    deleteAiFriendRoom(room);
    return;
  }

  if (isAiRoom(room)) return;

  if (isRoomOwner(room)) {
    await deleteActiveRoomForEveryone(room);
  } else {
    await leaveActiveRoom(room);
  }
}

function deleteAiFriendRoom(room) {
  if (!isAiFriendRoom(room)) return;

  const ok = window.confirm(`Excluir o amigo IA ${getRoomDisplayName(room)} e apagar esta conversa?`);
  if (!ok) return;

  rooms = rooms.filter((item) => item.id !== room.id);
  renderedMessageIdsByRoom.delete(room.id);
  if (activeRoomId === room.id) {
    activeRoomId = ensureUserAiRoom()?.id || null;
  }
  saveRooms();
  closeRoomSettingsModal();
  renderAll(true);
  showToast("Amigo IA excluido", `${getRoomDisplayName(room)} foi removido deste navegador.`);
}

async function deleteActiveRoomForEveryone(room) {
  if (!requireFirebaseConnection("excluir sala")) return;

  const ok = window.confirm(`Excluir a sala ${getRoomDisplayName(room)} para todos?\n\nEssa ação remove a sala, mensagens e vínculos dos participantes.`);
  if (!ok) return;

  try {
    const updates = {
      [`rooms/${room.id}`]: null
    };

    unique([...(room.memberUids || []), ...(room.invitedUids || []), currentFirebaseUid].filter(Boolean)).forEach((uid) => {
      updates[`userRooms/${uid}/${room.id}`] = null;
    });

    invites.filter((invite) => invite.roomId === room.id).forEach((invite) => {
      updates[`invites/${invite.id}`] = null;
      if (invite.fromUid) updates[`userInvites/${invite.fromUid}/sent/${invite.id}`] = null;
      if (invite.toUid) updates[`userInvites/${invite.toUid}/received/${invite.id}`] = null;
    });

    await update(ref(db), updates);
    closeRoomSettingsModal();
    if (activeRoomId === room.id) {
      activeRoomId = null;
      clearReplyTarget();
      subscribeToActiveRoomMessages();
    }
    showToast("Sala excluída", "A sala foi removida para os participantes conhecidos.");
    renderAll(true);
  } catch (error) {
    console.error("Erro ao excluir sala.", error);
    window.alert("Não foi possível excluir a sala agora.");
  }
}

async function leaveActiveRoom(room) {
  if (!requireFirebaseConnection("sair da sala")) return;

  const label = isPrivateRoom(room) ? "remover esta conversa da sua lista" : `sair da sala ${getRoomDisplayName(room)}`;
  const ok = window.confirm(`Deseja ${label}?`);
  if (!ok) return;

  try {
    const updates = {
      [`userRooms/${currentFirebaseUid}/${room.id}`]: null,
      [`rooms/${room.id}/typing/${currentFirebaseUid}`]: null
    };

    if (!isPrivateRoom(room)) {
      updates[`rooms/${room.id}/memberUids/${currentFirebaseUid}`] = null;
      updates[`rooms/${room.id}/memberNicks/${currentFirebaseUid}`] = null;
      updates[`rooms/${room.id}/memberAvatarIcons/${currentFirebaseUid}`] = null;
      updates[`rooms/${room.id}/updatedAt`] = serverTimestamp();
      updates[`rooms/${room.id}/updatedAtMillis`] = Date.now();
    }

    await update(ref(db), updates);
    closeRoomSettingsModal();
    activeRoomId = null;
    clearReplyTarget();
    subscribeToActiveRoomMessages();
    renderAll(true);
    showToast("Sala removida", "Ela não aparece mais na sua lista.");
  } catch (error) {
    console.error("Erro ao sair/remover sala.", error);
    window.alert("Não foi possível concluir esta ação agora.");
  }
}

function openPrivateModal() {
  if (!requireFirebaseConnection("criar conversas privadas")) return;

  if (!firebaseReady) {
    window.alert("Aguarde a conexão ficar pronta antes de criar conversas privadas.");
    return;
  }

  privateNickInput.value = "";
  privateSearchResult.innerHTML = "";
  if (privateLanguageSelect) privateLanguageSelect.value = "en";
  renderPrivateFriendsList();
  privateModal.hidden = false;
  privateModal.setAttribute("aria-hidden", "false");
}

function closePrivateModal() {
  privateModal.hidden = true;
  privateModal.setAttribute("aria-hidden", "true");
}

function renderPrivateFriendsList() {
  privateFriendsList.innerHTML = "";

  const firebaseFriends = friends.filter((friend) => friend.uid);

  if (!firebaseFriends.length) {
    privateFriendsList.appendChild(createEmptyState(
      "fa-solid fa-user-group",
      "Nenhum amigo ainda",
      "Busque um usuário pelo nick acima e envie um pedido de amizade. A pessoa só aparece aqui depois de aceitar."
    ));
    return;
  }

  firebaseFriends
    .slice()
    .sort((a, b) => a.nick.localeCompare(b.nick, "pt-BR"))
    .forEach((friend) => {
      const item = document.createElement("article");
      const roomId = getPrivateRoomId(currentFirebaseUid, friend.uid);
      const hasPrivateRoom = remoteRooms.some((room) => room.id === roomId);
      item.className = "friend-item private-friend-item enhanced-friend-item";
      item.innerHTML = `
        <div class="avatar"></div>
        <div class="friend-info">
          <strong>${escapeHtml(friend.nick)}</strong>
          <span>${hasPrivateRoom ? "Conversa privada existente" : "Amigo salvo"}</span>
        </div>
        <div class="friend-actions icon-only-actions">
          <button class="small-action start-private-action icon-only-action" type="button" title="Conversar" aria-label="Conversar">
            <i class="fa-solid fa-comment" aria-hidden="true"></i>
          </button>
          <button class="ghost-mini-action delete-conversation-action icon-only-action" type="button" ${hasPrivateRoom ? "" : "disabled"} title="Excluir conversa só da sua lista" aria-label="Excluir conversa só da sua lista">
            <i class="fa-solid fa-comment-slash" aria-hidden="true"></i>
          </button>
          <button class="danger-action remove-friend-action icon-only-action" type="button" title="Remover amigo dos dois usuários" aria-label="Remover amigo dos dois usuários">
            <i class="fa-solid fa-user-minus" aria-hidden="true"></i>
          </button>
        </div>
      `;

      const avatar = item.querySelector(".avatar");
      avatar.style.background = getGradientByText(friend.nick);
      paintAvatar(avatar, friend, friend.nick);
      item.querySelector(".start-private-action").addEventListener("click", () => startPrivateConversation(friend));
      item.querySelector(".delete-conversation-action").addEventListener("click", () => deletePrivateConversation(friend));
      item.querySelector(".remove-friend-action").addEventListener("click", () => removeFriend(friend));
      privateFriendsList.appendChild(item);
    });
}

async function removeFriend(friend) {
  if (!friend?.uid || !currentFirebaseUid) return;
  if (!requireFirebaseConnection("remover amigo")) return;

  const shouldRemove = window.confirm(
    `Remover ${friend.nick} dos seus amigos?

Isso remove a amizade para os dois usuários e apaga a conversa privada inteira.`
  );
  if (!shouldRemove) return;

  try {
    await removeFriendForBothUsers(friend);
    applyFriendRemovalLocally(friend.uid, { clearPrivateRoom: true });
    renderPrivateFriendsList();
    renderFriendsList();
    renderAll(true);
    showToast("Amigo removido", `${friend.nick} foi removido dos dois usuários e a conversa privada foi apagada.`);
  } catch (error) {
    console.error("Erro ao remover amigo para os dois usuários.", error);
    window.alert("Não foi possível remover o amigo agora. Verifique sua conexão e tente novamente.");
  }
}

async function deletePrivateConversation(friend) {
  if (!friend?.uid || !currentFirebaseUid) return;
  if (!requireFirebaseConnection("excluir conversa privada")) return;
  const roomId = getPrivateRoomId(currentFirebaseUid, friend.uid);
  const shouldDelete = window.confirm(`Excluir a conversa privada com ${friend.nick} da sua lista?\n\nIsso não apaga a conversa para o outro usuário.`);
  if (!shouldDelete) return;

  try {
    await update(ref(db), {
      [`userRooms/${currentFirebaseUid}/${roomId}`]: null
    });

    delete notificationState.unreadByRoom[roomId];
    delete notificationState.lastSeenByRoom[roomId];
    delete notificationState.lastSeenMessageIdByRoom[roomId];
    saveNotificationState();

    if (activeRoomId === roomId) {
      activeRoomId = null;
      clearReplyTarget();
      renderActiveRoom(true);
    }

    renderPrivateFriendsList();
    renderRoomList(searchInput.value);
    showToast("Conversa excluída", `A conversa com ${friend.nick} foi removida da sua lista.`);
  } catch (error) {
    console.error("Erro ao excluir conversa privada.", error);
    window.alert("Não foi possível excluir a conversa agora.");
  }
}

async function searchUserForAddFriend(options = {}) {
  if (!friendSearchResult) return;

  const nick = sanitizeText(friendNickInput?.value, 24);
  if (!nick) {
    return;
  }

  const normalizedNick = normalize(nick);
  const userNick = normalize(currentUser?.nick || "");

  if (normalizedNick === userNick) {
    showInlineResult(friendSearchResult, "Esse nick e o seu. Busque outro usuario.");
    return;
  }

  await searchFirebaseUserAndRender({
    nick,
    resultContainer: friendSearchResult,
    actionLabel: "Adicionar",
    emptyText: "Nao encontrei esse nick. A pessoa precisa entrar no app pelo menos uma vez.",
    isStale: options.isStale,
    onSelect: async (user) => {
      if (isFriendWithUid(user.uid)) {
        showInlineResult(friendSearchResult, "Esse amigo ja esta na sua lista.", "success");
        return;
      }

      const result = await sendFriendRequest(user, { wantsPrivateChat: false });
      if (result === "offline") {
        showInlineResult(friendSearchResult, "Sem internet para enviar o pedido agora.");
        return;
      }
      friendNickInput.value = "";
      renderAll();

      const message = result === "accepted-existing"
        ? `${user.nick} ja tinha enviado um pedido. Amizade aceita.`
        : result === "pending-existing"
          ? `Ja existe um pedido pendente com ${user.nick}.`
          : `Pedido de amizade enviado para ${user.nick}.`;

      showInlineResult(friendSearchResult, message, "success");
      showToast("Pedido de amizade", message);
    }
  });
}

async function searchUserForPrivateConversation(options = {}) {
  const nick = sanitizeText(privateNickInput.value, 24);
  if (!nick) {
    return;
  }

  await searchFirebaseUserAndRender({
    nick,
    resultContainer: privateSearchResult,
    actionLabel: "Pedir amizade",
    emptyText: "Não encontrei esse nick. Peça para a pessoa entrar no app pelo menos uma vez.",
    isStale: options.isStale,
    onSelect: async (user) => {
      if (isFriendWithUid(user.uid)) {
        const friend = friends.find((item) => item.uid === user.uid) || addOrUpdateFriendFromFirebaseUser(user);
        saveFriends();
        renderFriendsList();
        renderPrivateFriendsList();
        await startPrivateConversation(friend);
        return;
      }

      const result = await sendFriendRequest(user, { wantsPrivateChat: true });
      if (result === "offline") {
        showInlineResult(privateSearchResult, "Sem internet para enviar o pedido agora.");
        return;
      }
      if (result === "accepted-existing") {
        const friend = addOrUpdateFriendFromFirebaseUser(user);
        saveFriends();
        renderFriendsList();
        renderPrivateFriendsList();
        await startPrivateConversation(friend);
        showInlineResult(privateSearchResult, `${user.nick} já tinha enviado um pedido. Amizade aceita e conversa iniciada.`, "success");
        return;
      }

      const message = result === "pending-existing"
        ? `Já existe um pedido de amizade pendente com ${user.nick}. A conversa será liberada quando o pedido for aceito.`
        : `Pedido de amizade enviado para ${user.nick}. A conversa privada aparece quando o pedido for aceito.`;
      showInlineResult(privateSearchResult, message, "success");
      renderInvitesList();
      updateBadges();
    }
  });
}

async function searchUserForInvite(options = {}) {
  const nick = sanitizeText(inviteNickInput.value, 24);
  if (!nick) {
    return;
  }

  await searchFirebaseUserAndRender({
    nick,
    resultContainer: inviteSearchResult,
    actionLabel: "Convidar",
    emptyText: "Não encontrei esse nick. O usuário precisa entrar no app pelo menos uma vez.",
    isStale: options.isStale,
    onSelect: async (user) => {
      const activeRoom = getActiveRoom();
      if (!activeRoom || isAiRoom(activeRoom)) return;

      const friend = addOrUpdateFriendFromFirebaseUser(user);
      saveFriends();
      renderFriendsList();

      if (isFriendLinkedToRoom(friend.uid, activeRoom)) {
        showInlineResult(inviteSearchResult, "Esse usuário já está na sala ou já recebeu convite.");
        return;
      }

      await inviteFriendToRoom(activeRoom, friend);
      showInlineResult(inviteSearchResult, `Convite enviado para ${friend.nick}.`, "success");
      renderFriendCheckboxes(
        inviteFriendsList,
        friends.filter((item) => item.uid && !isFriendLinkedToRoom(item.uid, getActiveRoom())),
        "Nenhum amigo disponível. Busque outro usuário pelo nick acima para convidar."
      );
      renderAll();
    }
  });
}

function setupAutomaticUserSearch({ input, resultContainer, searchAction, delay = 520, minLength = 2, waitingText = "Digite pelo menos 2 letras para buscar." }) {
  if (!input || !resultContainer || !searchAction) return;

  let timer = null;
  let searchRunId = 0;

  input.addEventListener("input", () => {
    searchRunId += 1;
    const runId = searchRunId;
    const nick = sanitizeText(input.value, 24);

    if (timer) clearTimeout(timer);

    if (!nick) {
      resultContainer.innerHTML = "";
      return;
    }

    if (nick.length < minLength) {
      showInlineResult(resultContainer, waitingText);
      return;
    }

    showInlineResult(resultContainer, "Pesquisando automaticamente...");

    timer = window.setTimeout(async () => {
      if (runId !== searchRunId) return;
      await searchAction({
        automatic: true,
        isStale: () => runId !== searchRunId
      });
    }, delay);
  });
}

async function searchFirebaseUserAndRender({ nick, resultContainer, actionLabel, emptyText, onSelect, isStale = null }) {
  if (isStale?.()) return;

  if (!isInternetAvailable()) {
    updateUserHeader("Offline");
    showInlineResult(resultContainer, "Sem conexao para buscar usuarios agora.");
    return;
  }

  if (!firebaseReady || !currentFirebaseUid) {
    showInlineResult(resultContainer, "A conexão ainda está sendo preparada.");
    return;
  }

  showInlineResult(resultContainer, "Buscando usuário...");

  try {
    const foundUsers = await findFirebaseUsersByNick(nick);
    if (isStale?.()) return;

    if (!foundUsers.length) {
      showInlineResult(resultContainer, emptyText);
      return;
    }

    renderUserSearchResults(resultContainer, foundUsers, actionLabel, onSelect);
  } catch (error) {
    console.error("Erro ao buscar usuário.", error);
    showInlineResult(resultContainer, "Não foi possível buscar esse usuário agora.");
  }
}

function renderUserSearchResults(container, users, actionLabel, onSelect) {
  container.innerHTML = "";

  const list = document.createElement("div");
  list.className = "inline-user-results";

  users.slice(0, 8).forEach((user) => {
    list.appendChild(createUserSearchResultCard(container, user, actionLabel, onSelect));
  });

  container.appendChild(list);
}

function renderUserSearchResult(container, user, actionLabel, onSelect) {
  container.innerHTML = "";
  container.appendChild(createUserSearchResultCard(container, user, actionLabel, onSelect));
}

function createUserSearchResultCard(container, user, actionLabel, onSelect) {
  const isAlreadyFriend = isFriendWithUid(user.uid);
  const actionText = isAlreadyFriend && actionLabel === "Pedir amizade" ? "Conversar" : actionLabel;
  const actionIcon = isAlreadyFriend && actionLabel === "Pedir amizade" ? "fa-solid fa-comment" : "fa-solid fa-user-plus";

  const card = document.createElement("article");
  card.className = "inline-user-card";
  card.innerHTML = `
    <div class="inline-user-info">
      <div class="avatar" style="margin-right: 12px;">${escapeHtml(user.avatar || getInitials(user.nick))}</div>
      <div class="friend-info">
        <strong>${escapeHtml(user.nick)}</strong>
        <span>${isAlreadyFriend ? "Amigo salvo" : "Usuário encontrado"}</span>
      </div>
    </div>
    <button class="small-action icon-only-action" type="button" title="${escapeHtml(actionText)}" aria-label="${escapeHtml(actionText)}">
      <i class="${actionIcon}" aria-hidden="true"></i>
    </button>
  `;

  const avatar = card.querySelector(".avatar");
  avatar.style.background = getGradientByText(user.nick);
  paintAvatar(avatar, user, user.nick);
  card.querySelector("button").addEventListener("click", async () => {
    try {
      await onSelect(user);
    } catch (error) {
      console.error("Erro na ação do usuário encontrado.", error);
      showInlineResult(container, "Não foi possível concluir a ação.");
    }
  });

  return card;
}

function showInlineResult(container, message, type = "muted") {
  container.innerHTML = `<div class="inline-message ${escapeHtml(type)}">${escapeHtml(message)}</div>`;
}

function addOrUpdateFriendFromFirebaseUser(user) {
  const existing = friends.find((friend) => friend.uid === user.uid || normalize(friend.nick) === normalize(user.nick));
  const payload = {
    id: user.uid,
    uid: user.uid,
    nick: user.nick,
    avatar: user.avatar || getInitials(user.nick),
    avatarIcon: getSafeSpaceAvatarIcon(user.avatarIcon),
    nickKey: user.nickKey || normalize(user.nick),
    source: "firebase",
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  if (existing) {
    Object.assign(existing, payload);
    return existing;
  }

  friends.push(payload);
  return payload;
}


function isFriendWithUid(uid) {
  return Boolean(uid && friends.some((friend) => friend.uid === uid));
}

function applyFriendRemovalLocally(friendUid, options = {}) {
  if (!friendUid || !currentFirebaseUid) return false;

  const beforeCount = friends.length;
  friends = friends.filter((item) => item.uid !== friendUid);
  const changed = friends.length !== beforeCount;
  const privateRoomId = getPrivateRoomId(currentFirebaseUid, friendUid);

  if (options.clearPrivateRoom !== false) {
    delete notificationState.unreadByRoom[privateRoomId];
    delete notificationState.lastSeenByRoom[privateRoomId];
    delete notificationState.lastSeenMessageIdByRoom[privateRoomId];
    roomMessagesById.delete(privateRoomId);
    renderedMessageIdsByRoom.delete(privateRoomId);
    remoteRoomMap.delete(privateRoomId);
    remoteRooms = remoteRooms.filter((room) => room.id !== privateRoomId);

    if (activeRoomId === privateRoomId) {
      activeRoomId = null;
      clearReplyTarget();
      subscribeToActiveRoomMessages();
    }
  }

  if (changed) saveFriends();
  saveNotificationState();
  return changed;
}

async function removeFriendForBothUsers(friend) {
  if (!friend?.uid || !currentFirebaseUid) return;
  if (!requireFirebaseConnection("remover amigo")) return;

  const now = Date.now();
  const privateRoomId = getPrivateRoomId(currentFirebaseUid, friend.uid);
  const requestId = getFriendRequestId(currentFirebaseUid, friend.uid);
  const currentNick = currentUser?.nick || "Você";
  const updates = {
    [`rooms/${privateRoomId}`]: null,
    [`userRooms/${currentFirebaseUid}/${privateRoomId}`]: null,
    [`userRooms/${friend.uid}/${privateRoomId}`]: null,
    [`invites/${requestId}/status`]: "removido",
    [`invites/${requestId}/removedAt`]: serverTimestamp(),
    [`invites/${requestId}/removedAtMillis`]: now,
    [`invites/${requestId}/removedByUid`]: currentFirebaseUid,
    [`invites/${requestId}/removedByNick`]: currentNick,
    [`invites/${requestId}/updatedAt`]: serverTimestamp(),
    [`invites/${requestId}/updatedAtMillis`]: now,
    [`userInvites/${currentFirebaseUid}/sent/${requestId}`]: true,
    [`userInvites/${currentFirebaseUid}/received/${requestId}`]: true,
    [`userInvites/${friend.uid}/sent/${requestId}`]: true,
    [`userInvites/${friend.uid}/received/${requestId}`]: true
  };

  await update(ref(db), updates);
}


function getFriendRequestId(uidA, uidB) {
  return `friend_${getPrivatePairKey(uidA, uidB)}`;
}

function isFriendRequestInvite(invite) {
  return invite?.type === FRIEND_REQUEST_TYPE || invite?.kind === FRIEND_REQUEST_TYPE;
}

function getFriendFromRequestInvite(invite) {
  if (!invite || !currentFirebaseUid) return null;
  const isSender = invite.fromUid === currentFirebaseUid;
  const uid = isSender ? invite.toUid : invite.fromUid;
  const nick = isSender ? invite.toNick : invite.fromNick;
  const avatarIcon = isSender ? invite.toAvatarIcon : invite.fromAvatarIcon;
  if (!uid || uid === currentFirebaseUid) return null;
  return {
    id: uid,
    uid,
    nick: nick || "Usuário",
    avatar: getInitials(nick || "Usuário"),
    avatarIcon: getSafeSpaceAvatarIcon(avatarIcon),
    nickKey: normalize(nick || "Usuário"),
    source: "friend-request",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function handleAcceptedFriendRequests() {
  if (!currentFirebaseUid) return;

  let changed = false;
  let processedChanged = false;

  invites
    .filter((invite) => isFriendRequestInvite(invite) && invite.status === "aceito")
    .forEach((invite) => {
      if (processedFriendRequestIds[invite.id]) return;
      const friend = getFriendFromRequestInvite(invite);
      if (!friend) return;

      if (!isFriendWithUid(friend.uid)) {
        addOrUpdateFriendFromFirebaseUser(friend);
        changed = true;
        if (invite.fromUid !== currentFirebaseUid) {
          showToast("Amizade aceita", `${friend.nick} entrou na sua lista de amigos.`);
        }
      }

      processedFriendRequestIds[invite.id] = Date.now();
      processedChanged = true;
    });

  if (changed) {
    saveFriends();
    renderPrivateFriendsList();
    renderFriendsList();
  }

  if (processedChanged) saveProcessedFriendRequests();
}

function handleRemovedFriendRequests() {
  if (!currentFirebaseUid) return;

  let changed = false;
  let removedNick = "";

  invites
    .filter((invite) => isFriendRequestInvite(invite) && invite.status === "removido")
    .forEach((invite) => {
      if (invite.fromUid !== currentFirebaseUid && invite.toUid !== currentFirebaseUid) return;

      const friend = getFriendFromRequestInvite(invite);
      if (!friend?.uid) return;

      const wasFriend = isFriendWithUid(friend.uid);
      const localChanged = applyFriendRemovalLocally(friend.uid, { clearPrivateRoom: true });
      changed = changed || localChanged || wasFriend;
      removedNick = removedNick || friend.nick;
    });

  if (changed) {
    renderPrivateFriendsList();
    renderFriendsList();
    renderRoomList(searchInput?.value || "");
    renderActiveRoom(true);
    updateBadges();

    if (removedNick) {
      showToast("Amizade removida", `A amizade com ${removedNick} foi encerrada e a conversa privada foi apagada.`);
    }
  }
}

async function sendFriendRequest(user, options = {}) {
  if (!requireFirebaseConnection("enviar pedido de amizade")) return "offline";

  if (!user?.uid || !currentFirebaseUid) return "invalid";
  if (user.uid === currentFirebaseUid) {
    window.alert("Você não pode mandar pedido de amizade para si mesmo.");
    return "invalid";
  }

  if (isFriendWithUid(user.uid)) return "already-friend";

  const requestId = getFriendRequestId(currentFirebaseUid, user.uid);
  const requestRef = ref(db, `invites/${requestId}`);
  const snapshot = await get(requestRef);
  const currentNick = currentUser?.nick || "Você";
  const now = Date.now();
  const language = getLanguageOption(options.languageCode ?? privateLanguageSelect?.value ?? "");

  if (snapshot.exists()) {
    const existing = { id: requestId, ...snapshot.val() };

    if (existing.status === "pendente") {
      if (existing.toUid === currentFirebaseUid) {
        await acceptFriendRequest(mapInviteLike(existing));
        return "accepted-existing";
      }
      return "pending-existing";
    }

    if (existing.status === "aceito") {
      addOrUpdateFriendFromFirebaseUser(user);
      processedFriendRequestIds[requestId] = Date.now();
      saveProcessedFriendRequests();
      saveFriends();
      return "accepted-existing";
    }
  }

  const payload = {
    id: requestId,
    type: FRIEND_REQUEST_TYPE,
    kind: FRIEND_REQUEST_TYPE,
    roomId: "",
    roomName: "Pedido de amizade",
    fromUid: currentFirebaseUid,
    fromNick: currentNick,
    fromAvatarIcon: getSafeSpaceAvatarIcon(currentUser?.avatarIcon),
    toUid: user.uid,
    toNick: user.nick,
    toAvatarIcon: getSafeSpaceAvatarIcon(user.avatarIcon),
    status: "pendente",
    wantsPrivateChat: options.wantsPrivateChat !== false,
    privateLanguageCode: language?.code || "",
    privateLanguageName: language?.name || "",
    createdAt: serverTimestamp(),
    createdAtMillis: now,
    updatedAt: serverTimestamp(),
    updatedAtMillis: now
  };

  await update(ref(db), {
    [`invites/${requestId}`]: payload,
    [`userInvites/${currentFirebaseUid}/sent/${requestId}`]: true,
    [`userInvites/${user.uid}/received/${requestId}`]: true
  });

  void notifyPushWorkerAboutInvite(payload);
  return "sent";
}

function mapInviteLike(data = {}) {
  return {
    id: data.id || "",
    type: data.type || data.kind || "",
    kind: data.kind || data.type || "",
    roomId: data.roomId || "",
    roomName: data.roomName || "Pedido de amizade",
    fromUid: data.fromUid || "",
    fromNick: data.fromNick || "Usuário",
    fromAvatarIcon: getSafeSpaceAvatarIcon(data.fromAvatarIcon),
    toUid: data.toUid || "",
    toNick: data.toNick || "Usuário",
    toAvatarIcon: getSafeSpaceAvatarIcon(data.toAvatarIcon),
    status: data.status || "pendente",
    wantsPrivateChat: data.wantsPrivateChat !== false,
    privateLanguageCode: data.privateLanguageCode || "",
    privateLanguageName: data.privateLanguageName || "",
    createdAt: getRealtimeMillis(data.createdAt, data.createdAtMillis || Date.now()),
    updatedAt: getRealtimeMillis(data.updatedAt, data.updatedAtMillis || Date.now())
  };
}

async function acceptFriendRequest(invite) {
  if (!invite || !currentFirebaseUid || !isFriendRequestInvite(invite)) return;
  if (!requireFirebaseConnection("aceitar pedido de amizade")) return;

  const friend = getFriendFromRequestInvite(invite);
  if (!friend) return;

  const now = Date.now();
  await update(ref(db), {
    [`invites/${invite.id}/status`]: "aceito",
    [`invites/${invite.id}/acceptedAt`]: serverTimestamp(),
    [`invites/${invite.id}/acceptedAtMillis`]: now,
    [`invites/${invite.id}/updatedAt`]: serverTimestamp(),
    [`invites/${invite.id}/updatedAtMillis`]: now
  });

  addOrUpdateFriendFromFirebaseUser(friend);
  processedFriendRequestIds[invite.id] = Date.now();
  saveProcessedFriendRequests();
  saveFriends();
  renderFriendsList();
  renderPrivateFriendsList();

  if (invite.wantsPrivateChat !== false) {
    await startPrivateConversation(friend, {
      languageCode: invite.privateLanguageCode || "",
      openAfterCreate: true
    });
    closeNotificationsModal();
    showToast("Amizade aceita", `Conversa privada com ${friend.nick} criada.`);
  } else {
    showToast("Amizade aceita", `${friend.nick} entrou na sua lista de amigos.`);
    renderAll();
  }
}

async function startPrivateConversation(friend, options = {}) {
  if (!requireFirebaseConnection("iniciar conversa privada")) return;

  if (!friend?.uid || !currentFirebaseUid) return;
  if (friend.uid === currentFirebaseUid) {
    window.alert("Você não pode abrir conversa privada com seu próprio usuário.");
    return;
  }

  const now = Date.now();
  const roomId = getPrivateRoomId(currentFirebaseUid, friend.uid);
  const currentNick = currentUser?.nick || "Você";
  const language = getLanguageOption(options.languageCode ?? privateLanguageSelect?.value ?? "");
  const snapshot = await get(ref(db, `rooms/${roomId}`));
  const updates = {
    [`userRooms/${currentFirebaseUid}/${roomId}`]: true,
    [`userRooms/${friend.uid}/${roomId}`]: true
  };

  if (!snapshot.exists()) {
    updates[`rooms/${roomId}`] = {
      type: PRIVATE_ROOM_TYPE,
      private: true,
      name: `Privado: ${currentNick} e ${friend.nick}`,
      avatar: getInitials(friend.nick),
      description: `Conversa privada com ${friend.nick}`,
      languageCode: language?.code || "",
      languageName: language?.name || "",
      translationEnabled: Boolean(language?.code),
      color: getGradientByText(friend.nick),
      ownerUid: currentFirebaseUid,
      ownerNick: currentNick,
      ownerAvatarIcon: getSafeSpaceAvatarIcon(currentUser?.avatarIcon),
      memberUids: {
        [currentFirebaseUid]: true,
        [friend.uid]: true
      },
      memberNicks: {
        [currentFirebaseUid]: currentNick,
        [friend.uid]: friend.nick
      },
      memberAvatarIcons: {
        [currentFirebaseUid]: getSafeSpaceAvatarIcon(currentUser?.avatarIcon),
        [friend.uid]: getSafeSpaceAvatarIcon(friend.avatarIcon)
      },
      privatePair: getPrivatePairKey(currentFirebaseUid, friend.uid),
      lastMessage: "",
      lastMessageId: "",
      lastMessageAuthorUid: "",
      lastMessageAuthorNick: "",
      lastMessageAt: now,
      createdAt: serverTimestamp(),
      createdAtMillis: now,
      updatedAt: serverTimestamp(),
      updatedAtMillis: now
    };
  } else {
    const privateRoomData = snapshot.val() || {};
    const allowedPrivateUids = new Set([currentFirebaseUid, friend.uid]);
    Object.keys(privateRoomData.memberUids || {}).forEach((uid) => {
      if (!allowedPrivateUids.has(uid)) {
        updates[`rooms/${roomId}/memberUids/${uid}`] = null;
        updates[`rooms/${roomId}/memberNicks/${uid}`] = null;
        updates[`rooms/${roomId}/memberAvatarIcons/${uid}`] = null;
        updates[`userRooms/${uid}/${roomId}`] = null;
      }
    });
    Object.keys(privateRoomData.invitedUids || {}).forEach((uid) => {
      updates[`rooms/${roomId}/invitedUids/${uid}`] = null;
      updates[`rooms/${roomId}/invitedNicks/${uid}`] = null;
      updates[`rooms/${roomId}/invitedAvatarIcons/${uid}`] = null;
    });
    updates[`rooms/${roomId}/languageCode`] = language?.code || "";
    updates[`rooms/${roomId}/languageName`] = language?.name || "";
    updates[`rooms/${roomId}/translationEnabled`] = Boolean(language?.code);
    updates[`rooms/${roomId}/memberUids/${currentFirebaseUid}`] = true;
    updates[`rooms/${roomId}/memberUids/${friend.uid}`] = true;
    updates[`rooms/${roomId}/memberNicks/${currentFirebaseUid}`] = currentNick;
    updates[`rooms/${roomId}/memberNicks/${friend.uid}`] = friend.nick;
    updates[`rooms/${roomId}/memberAvatarIcons/${currentFirebaseUid}`] = getSafeSpaceAvatarIcon(currentUser?.avatarIcon);
    updates[`rooms/${roomId}/memberAvatarIcons/${friend.uid}`] = getSafeSpaceAvatarIcon(friend.avatarIcon);
    updates[`rooms/${roomId}/updatedAt`] = serverTimestamp();
    updates[`rooms/${roomId}/updatedAtMillis`] = now;
  }

  await update(ref(db), updates);
  activeRoomId = roomId;
  suppressAutoRoomSelection = false;
  closePrivateModal();
  setActiveView("rooms");
  subscribeToActiveRoomMessages();
  renderAll(true);
  appShell.classList.add("chat-open");
}

function openRoomModal() {
  if (!requireFirebaseConnection("criar salas")) return;

  if (!firebaseReady) {
    window.alert("Aguarde a conexão ficar pronta antes de criar salas entre usuários.");
    return;
  }

  roomForm.reset();
  pendingRoomInviteFriendIds = new Set();
  if (roomFriendFilterInput) roomFriendFilterInput.value = "";
  renderRoomFriendPicker();
  roomModal.hidden = false;
  roomModal.setAttribute("aria-hidden", "false");
}

function closeRoomModal() {
  roomModal.hidden = true;
  roomModal.setAttribute("aria-hidden", "true");
}

function openAiFriendModal() {
  if (!currentUser?.nick) return;

  aiFriendForm?.reset();
  if (aiFriendLanguageSelect) aiFriendLanguageSelect.value = "en";
  if (aiFriendAvatarSelect) aiFriendAvatarSelect.value = "fa-solid fa-robot";
  updateAiFriendAvatarPreview();
  if (!aiFriendModal) return;
  aiFriendModal.hidden = false;
  aiFriendModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => aiFriendNameInput?.focus(), 0);
}

function closeAiFriendModal() {
  if (!aiFriendModal) return;
  aiFriendModal.hidden = true;
  aiFriendModal.setAttribute("aria-hidden", "true");
}

function updateAiFriendAvatarPreview() {
  if (!aiFriendAvatarPreview) return;
  const icon = getSafeSpaceAvatarIcon(aiFriendAvatarSelect?.value || "fa-solid fa-robot");
  aiFriendAvatarPreview.innerHTML = `<i class="${escapeHtml(icon)}" aria-hidden="true"></i>`;
}

function handleAiFriendFormSubmit(event) {
  event.preventDefault();

  const name = sanitizeText(aiFriendNameInput?.value || "", 32);
  const persona = sanitizeText(aiFriendPersonaInput?.value || "", 220) || DEFAULT_AI_FRIEND_PERSONA;
  const avatarIcon = getSafeSpaceAvatarIcon(aiFriendAvatarSelect?.value || "fa-solid fa-robot");
  const language = getLanguageOption(aiFriendLanguageSelect?.value || "");

  if (!name) return;

  const newRoom = createAiFriendRoom(name, persona, avatarIcon, language);
  activeRoomId = newRoom.id;
  suppressAutoRoomSelection = false;
  closeAiFriendModal();
  setActiveView("rooms");
  forceMessageRerender(newRoom.id);
  renderAll(true);
  appShell.classList.add("chat-open");
  showToast("Amigo IA criado", `${name} ja esta pronto para conversar.`);
}

function createAiFriendRoom(name, persona, avatarIcon, language = getLanguageOption("")) {
  const now = Date.now();
  const room = {
    id: getAiFriendRoomId(currentUser?.nick || "usuario", name),
    type: AI_ROOM_TYPE,
    aiMode: AI_FRIEND_MODE,
    name,
    avatar: getInitials(name),
    avatarIcon,
    description: persona,
    persona,
    languageCode: language?.code || "",
    languageName: language?.name || "",
    translationEnabled: Boolean(language?.code),
    status: "Amigo IA · conversa privada local",
    color: getGradientByText(`${name}-${persona}`),
    ownerNick: currentUser?.nick || "",
    members: [currentUser?.nick || "Voce", name],
    messages: [],
    createdAt: now,
    updatedAt: now
  };

  const welcomeMessage = createAiWelcomeMessage(room);
  if (language?.code) {
    const sourceText = welcomeMessage.text;
    Object.assign(welcomeMessage, {
      text: PUBLIC_TRANSLATION_PENDING_TEXT,
      originalText: "",
      translatedText: "",
      translationSourceText: sourceText,
      targetLanguageCode: language.code || "",
      targetLanguageName: language.name || "",
      translationDisabled: false,
      translationStatus: "pending",
      translationError: false,
      deliveryStatus: "processing",
      localOnly: true,
      processingType: MESSAGE_PROCESSING_TRANSLATION
    });
  }
  room.messages = [welcomeMessage];
  rooms.unshift(room);
  saveRooms();
  if (language?.code) {
    translateLocalAiMessage(room.id, welcomeMessage.id, welcomeMessage.translationSourceText, language);
  }
  return room;
}

function openInviteModal() {
  const activeRoom = getActiveRoom();
  if (!activeRoom || isAiRoom(activeRoom) || isPrivateRoom(activeRoom)) return;
  if (!requireFirebaseConnection("convidar usuarios")) return;

  const availableFriends = friends.filter((friend) => friend.uid && !isFriendLinkedToRoom(friend.uid, activeRoom));
  inviteNickInput.value = "";
  inviteSearchResult.innerHTML = "";
  inviteModalSubtitle.textContent = `Sala: ${getRoomDisplayName(activeRoom)}`;
  renderFriendCheckboxes(inviteFriendsList, availableFriends, "Nenhum amigo disponível. Busque um usuário pelo nick acima para convidar.");
  inviteModal.hidden = false;
  inviteModal.setAttribute("aria-hidden", "false");
}

function resetLetterUnlockState() {
  // Transportes rápidos e turbina são liberados somente para a carta atual.
  // Ao fechar ou reabrir o modal, um novo desafio de tradução será obrigatório.
  letterUnlockedTransportIds = new Set(LETTER_BASE_UNLOCKED_TRANSPORT_IDS);
  letterTurboUnlocked = false;
  letterTurboEnabled = false;
}

function openLetterModal() {
  const room = getActiveRoom();
  if (!room || !isPrivateRoom(room) || !letterModal) return;
  letterForm?.reset();
  resetLetterUnlockState();
  letterChallengeState = null;
  letterRecipientNativeLanguage = null;
  const defaultTransport = letterForm?.querySelector(`input[name="letterTransport"][value="${LETTER_DEFAULT_TRANSPORT_ID}"]`);
  if (defaultTransport) defaultTransport.checked = true;
  if (letterChallengePanel) letterChallengePanel.hidden = true;
  if (letterChallengeInput) letterChallengeInput.value = "";
  if (letterChallengeFeedback) {
    letterChallengeFeedback.textContent = "";
    letterChallengeFeedback.className = "letter-challenge-feedback";
  }
  if (letterRequireTranslationCheckbox) letterRequireTranslationCheckbox.checked = false;
  if (letterOpenChallengeDirectionSelect) letterOpenChallengeDirectionSelect.value = "random";
  letterModal.hidden = false;
  letterModal.setAttribute("aria-hidden", "false");
  syncLetterComposerState();
  syncLetterProtectionComposerState();
  renderLatestLetterDestination(room);
  prepareLetterRecipientNativeLanguage(room);
  window.setTimeout(() => letterTitleInput?.focus(), 50);
}

function closeLetterModal() {
  if (!letterModal) return;
  letterModal.hidden = true;
  letterModal.setAttribute("aria-hidden", "true");
  letterChallengeState = null;
  letterRecipientNativeLanguage = null;
  resetLetterUnlockState();
  resetLetterComposerRouteState();
  if (activeLetterMap) {
    activeLetterMap.remove();
    activeLetterMap = null;
  }
  activeLetterMapRouteLayer = null;
  activeLetterMapEndpointLayer = null;
}

async function prepareLetterRecipientNativeLanguage(room) {
  const otherMember = getPrivateOtherMember(room);
  if (!otherMember?.uid) {
    syncLetterProtectionComposerState();
    return null;
  }
  try {
    const snapshot = await get(ref(db, `users/${otherMember.uid}`));
    const profile = snapshot.val() || {};
    letterRecipientNativeLanguage = getSelectedNativeLanguage(profile.nativeLanguageCode || "pt");
  } catch (error) {
    console.warn("Não foi possível consultar o idioma nativo do destinatário.", error);
    letterRecipientNativeLanguage = null;
  }
  syncLetterProtectionComposerState();
  return letterRecipientNativeLanguage;
}

function syncLetterProtectionComposerState() {
  const room = getActiveRoom();
  const roomLanguage = getRoomLanguage(room);
  const nativeLanguage = letterRecipientNativeLanguage;
  const available = Boolean(roomLanguage?.code && nativeLanguage?.code && roomLanguage.code !== nativeLanguage.code);
  const enabled = Boolean(letterRequireTranslationCheckbox?.checked && available);
  if (letterRequireTranslationCheckbox) letterRequireTranslationCheckbox.disabled = !available;
  if (letterOpenChallengeDirectionSelect) letterOpenChallengeDirectionSelect.disabled = !enabled;
  if (letterProtectionStatus) {
    letterProtectionStatus.textContent = !nativeLanguage
      ? "Consultando o idioma nativo do destinatário..."
      : !available
        ? "A proteção exige que o idioma da sala seja diferente do idioma nativo do destinatário."
        : enabled
          ? `O destinatário terá que traduzir entre ${roomLanguage.label} e ${nativeLanguage.label} para abrir.`
          : `Opcional: proteja a abertura com tradução entre ${roomLanguage.label} e ${nativeLanguage.label}.`;
  }
}

function getLetterLocationMessages(room) {
  return roomMessagesById.get(room?.id) || room?.messages || [];
}

function getLatestLetterLocationRequest(room, status = "") {
  return [...getLetterLocationMessages(room)]
    .reverse()
    .map((message) => message?.letterLocationRequest)
    .find((request) => request && (!status || request.status === status)) || null;
}

function getLatestSharedLetterLocation(room) {
  return [...getLetterLocationMessages(room)]
    .reverse()
    .map((message) => message?.letterLocationRequest)
    .find((request) => request?.status === "shared" && Number.isFinite(Number(request.latitude)) && Number.isFinite(Number(request.longitude))) || null;
}

function resetLetterComposerRouteState() {
  const nextRequestId = Number(letterComposerRouteState?.requestId || 0) + 1;
  letterComposerRouteState = {
    requestId: nextRequestId,
    destinationKey: "",
    destination: null,
    originResult: null,
    groundRoute: null,
    activeRoute: null,
    activeTransportId: "",
    loading: false,
    error: ""
  };
  if (letterRoutePreview) letterRoutePreview.hidden = true;
  if (letterMap) letterMap.hidden = true;
}

function getLetterDestinationKey(destination) {
  if (!destination) return "";
  return `${Number(destination.latitude).toFixed(6)}:${Number(destination.longitude).toFixed(6)}`;
}

function getLetterTrajectoryLabel(transport) {
  return sanitizeText(
    transport?.trajectoryLabel || "Rota calculada entre origem e destino",
    120
  );
}

function createCurvedLetterRoute(origin, destination, mode = "air") {
  if (!origin || !destination) return null;
  const originLatitude = Number(origin.latitude);
  const originLongitude = Number(origin.longitude);
  const destinationLatitude = Number(destination.latitude);
  const destinationLongitude = Number(destination.longitude);
  if (![originLatitude, originLongitude, destinationLatitude, destinationLongitude].every(Number.isFinite)) return null;

  const deltaLatitude = destinationLatitude - originLatitude;
  const deltaLongitude = destinationLongitude - originLongitude;
  const linearMagnitude = Math.hypot(deltaLatitude, deltaLongitude) || 1;
  const curveFactor = mode === "orbital" ? 0.20 : mode === "express" ? -0.28 : 0.015;
  const pointCount = mode === "air" ? 32 : 56;
  const curveMagnitude = linearMagnitude * curveFactor;
  const perpendicularLatitude = -deltaLongitude / linearMagnitude;
  const perpendicularLongitude = deltaLatitude / linearMagnitude;
  const routeCoordinates = [];

  for (let index = 0; index < pointCount; index += 1) {
    const progress = index / (pointCount - 1);
    const curve = Math.sin(Math.PI * progress) * curveMagnitude;
    routeCoordinates.push([
      originLatitude + deltaLatitude * progress + perpendicularLatitude * curve,
      originLongitude + deltaLongitude * progress + perpendicularLongitude * curve
    ]);
  }

  const distanceMeters = routeCoordinates.reduce((total, point, index) => {
    if (!index) return total;
    return total + calculateLetterPointDistanceMeters(routeCoordinates[index - 1], point);
  }, 0);

  return {
    routeCoordinates,
    distanceMeters: Math.max(1, distanceMeters),
    mode: "direct",
    provider: mode === "air" ? "AstroChat Air" : mode === "orbital" ? "AstroChat Orbital" : "AstroChat Express",
    trajectoryMode: mode
  };
}

function getPreparedLetterRouteForTransport(transport) {
  const state = letterComposerRouteState;
  if (!state?.originResult?.origin || !state?.destination) return null;
  const mode = transport?.trajectoryMode || "ground";
  if (mode === "ground") {
    return state.groundRoute ? { ...state.groundRoute, trajectoryMode: "ground" } : null;
  }
  return createCurvedLetterRoute(state.originResult.origin, state.destination, mode);
}

async function resolveLetterRouteForTransport(originResult, destination, transport, groundRoute = null) {
  const mode = transport?.trajectoryMode || "ground";
  if (mode === "ground") {
    const route = groundRoute || await buildLetterRoute(originResult, destination);
    return route ? { ...route, trajectoryMode: "ground" } : null;
  }
  return createCurvedLetterRoute(originResult?.origin, destination, mode);
}

function getLetterRouteLineStyle(transport) {
  const mode = transport?.trajectoryMode || "ground";
  if (mode === "air") return { color: "#72c5ff", weight: 4, opacity: 0.9, dashArray: "9 8" };
  if (mode === "orbital") return { color: "#c084fc", weight: 4, opacity: 0.92, dashArray: "13 7" };
  if (mode === "express") return { color: "#fbbf24", weight: 5, opacity: 0.95, dashArray: "18 7" };
  return { color: "#10b486", weight: 5, opacity: 0.92 };
}

function ensureLetterComposerMap(route) {
  if (!letterMap || !window.L || !route?.routeCoordinates?.length) return null;
  letterMap.hidden = false;
  if (!activeLetterMap) {
    activeLetterMap = window.L.map(letterMap, {
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false
    });
    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(activeLetterMap);
  }
  return activeLetterMap;
}

function renderLetterComposerRouteMap(route, transport) {
  const map = ensureLetterComposerMap(route);
  if (!map) return;
  if (activeLetterMapRouteLayer) map.removeLayer(activeLetterMapRouteLayer);
  if (activeLetterMapEndpointLayer) map.removeLayer(activeLetterMapEndpointLayer);

  const coordinates = normalizeLetterRouteCoordinates(route.routeCoordinates);
  if (coordinates.length < 2) return;
  const routeLine = window.L.polyline(coordinates, getLetterRouteLineStyle(transport));
  const origin = coordinates[0];
  const destination = coordinates.at(-1);
  const vehicleIcon = window.L.divIcon({
    className: "letter-composer-vehicle-icon",
    html: `<span><i class="fa-solid ${escapeHtml(transport.icon)}" aria-hidden="true"></i></span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });
  const vehicleMarker = window.L.marker(origin, { icon: vehicleIcon, interactive: false });
  activeLetterMapRouteLayer = window.L.layerGroup([routeLine, vehicleMarker]).addTo(map);
  activeLetterMapEndpointLayer = window.L.layerGroup([
    window.L.circleMarker(origin, { radius: 5, color: "#d7fff1", weight: 2, fillColor: "#0b8f6f", fillOpacity: 1 }).bindTooltip("Origem"),
    window.L.circleMarker(destination, { radius: 7, color: "#ffffff", weight: 2, fillColor: "#ef6b73", fillOpacity: 1 }).bindTooltip("Destino")
  ]).addTo(map);
  map.fitBounds(routeLine.getBounds(), { padding: [26, 26], maxZoom: 15 });
  window.setTimeout(() => map.invalidateSize(), 80);
}

function refreshLetterComposerRoutePreview() {
  const transport = getSelectedLetterTransport();
  const selectedLocked = transport.requiresChallenge && !letterUnlockedTransportIds.has(transport.id);
  const state = letterComposerRouteState;
  const route = getPreparedLetterRouteForTransport(transport);
  const speedKmh = getEffectiveLetterSpeed(transport);
  const distanceMeters = Number(route?.distanceMeters || 0);
  const durationMs = getEffectiveLetterDuration(transport, letterTurboEnabled, distanceMeters);

  if (letterRoutePreviewTransport) letterRoutePreviewTransport.textContent = `${transport.name}${letterTurboEnabled ? " + turbina" : ""}`;
  if (letterRoutePreviewTrajectory) letterRoutePreviewTrajectory.textContent = getLetterTrajectoryLabel(transport);
  if (letterRoutePreviewSpeed) letterRoutePreviewSpeed.textContent = `${speedKmh} km/h`;
  if (letterRoutePreviewDistance) {
    letterRoutePreviewDistance.textContent = state.loading
      ? "Calculando..."
      : distanceMeters
        ? formatLetterDistance(distanceMeters)
        : "Aguardando destino";
  }
  if (letterRoutePreviewEta) {
    letterRoutePreviewEta.textContent = state.loading
      ? "Calculando..."
      : distanceMeters
        ? formatLetterDuration(durationMs)
        : "Aguardando rota";
  }
  if (letterRoutePreviewStatus) {
    letterRoutePreviewStatus.textContent = state.loading
      ? "Calculando a trajetória e a distância no mapa..."
      : state.error
        ? state.error
        : route
          ? `${getLetterTrajectoryLabel(transport)}. Previsão calculada pela distância e pela velocidade selecionada.`
          : "Compartilhe o destino para visualizar a trajetória antes do envio.";
  }

  if (route && letterRoutePreview) {
    letterRoutePreview.hidden = false;
    state.activeRoute = route;
    state.activeTransportId = transport.id;
    renderLetterComposerRouteMap(route, transport);
  }

  if (letterDeliverySummary) {
    const routeSummary = distanceMeters
      ? `${formatLetterDistance(distanceMeters)} · ${formatLetterDuration(durationMs)}`
      : state.loading
        ? "Calculando trajetória e tempo..."
        : "Aguardando destino";
    letterDeliverySummary.innerHTML = `
      <span><i class="fa-solid ${escapeHtml(transport.icon)}" aria-hidden="true"></i> ${escapeHtml(transport.name)}</span>
      <strong>${selectedLocked ? `Bloqueado · ${routeSummary}` : `${speedKmh} km/h · ${routeSummary}`}</strong>
    `;
  }

  const submit = letterForm?.querySelector('button[type="submit"]');
  if (submit && !submit.dataset.busy) {
    submit.disabled = selectedLocked || Boolean(state.destination && state.loading);
  }
}

async function prepareLetterComposerRoutePreview(destination) {
  if (!destination) return;
  const destinationKey = getLetterDestinationKey(destination);
  if (
    letterComposerRouteState.destinationKey === destinationKey &&
    (letterComposerRouteState.loading || letterComposerRouteState.originResult)
  ) {
    refreshLetterComposerRoutePreview();
    return;
  }

  const requestId = Number(letterComposerRouteState.requestId || 0) + 1;
  letterComposerRouteState = {
    requestId,
    destinationKey,
    destination,
    originResult: null,
    groundRoute: null,
    activeRoute: null,
    activeTransportId: "",
    loading: true,
    error: ""
  };
  if (letterRoutePreview) letterRoutePreview.hidden = false;
  if (letterMap) letterMap.hidden = false;
  refreshLetterComposerRoutePreview();

  try {
    const originResult = await getLetterRouteOrigin(destination);
    if (letterComposerRouteState.requestId !== requestId) return;
    letterComposerRouteState.originResult = originResult;
    letterComposerRouteState.groundRoute = await buildLetterRoute(originResult, destination);
    if (letterComposerRouteState.requestId !== requestId) return;
  } catch (error) {
    console.warn("Não foi possível preparar a prévia da trajetória.", error);
    if (letterComposerRouteState.requestId !== requestId) return;
    letterComposerRouteState.error = "Não foi possível calcular a rota GPS agora. O envio tentará novamente.";
  } finally {
    if (letterComposerRouteState.requestId === requestId) {
      letterComposerRouteState.loading = false;
      refreshLetterComposerRoutePreview();
    }
  }
}

function renderLatestLetterDestination(room) {
  const destination = getLatestSharedLetterLocation(room);
  const pendingRequest = destination ? null : getLatestLetterLocationRequest(room, "requested");
  const locationPanel = requestLetterLocationButton?.closest?.(".letter-location-panel");

  locationPanel?.classList.toggle("has-location", Boolean(destination));
  locationPanel?.classList.toggle("is-pending", Boolean(pendingRequest));

  if (letterLocationStatus) {
    letterLocationStatus.textContent = destination
      ? "Destino já autorizado. A trajetória e o tempo serão mostrados abaixo."
      : pendingRequest
        ? "Solicitação já enviada. Aguardando o destinatário compartilhar a localização."
        : "Sem localização compartilhada: a carta usará uma rota simulada no mapa.";
  }

  if (requestLetterLocationButton) {
    requestLetterLocationButton.hidden = Boolean(destination);
    requestLetterLocationButton.disabled = Boolean(pendingRequest);
    requestLetterLocationButton.innerHTML = pendingRequest
      ? '<i class="fa-solid fa-clock"></i><span>Aguardando</span>'
      : '<i class="fa-solid fa-location-dot"></i><span>Solicitar</span>';
  }

  if (letterRouteNote) {
    letterRouteNote.hidden = Boolean(destination);
    const noteText = letterRouteNote.querySelector("span");
    if (noteText) {
      noteText.textContent = pendingRequest
        ? "Enquanto a localização não for compartilhada, a carta poderá usar uma rota simulada."
        : "Sem um destino compartilhado, a carta continua funcionando com uma rota simulada.";
    }
  }

  if (!destination) {
    resetLetterComposerRouteState();
    refreshLetterComposerRoutePreview();
    return;
  }

  if (letterMap) letterMap.hidden = false;
  if (letterRoutePreview) letterRoutePreview.hidden = false;
  prepareLetterComposerRoutePreview(destination);
}

function handleLetterTransportChange(event) {
  const input = event.target?.closest?.('input[name="letterTransport"]');
  if (!input) return;
  const transport = getLetterTransportOption(input.value);
  if (transport.requiresChallenge && !letterUnlockedTransportIds.has(transport.id)) {
    startLetterTranslationChallenge("transport", transport.id);
  }
  syncLetterComposerState();
}

function handleLetterTurboButtonClick() {
  if (!letterTurboUnlocked) {
    startLetterTranslationChallenge("turbo", "turbo");
    return;
  }
  letterTurboEnabled = !letterTurboEnabled;
  syncLetterComposerState();
}

function canCreateLetterTranslationChallenge(room) {
  const nativeLanguage = getCurrentNativeLanguage();
  const roomLanguage = getRoomLanguage(room);
  return Boolean(roomLanguage?.code && nativeLanguage?.code && roomLanguage.code !== nativeLanguage.code);
}

function startLetterTranslationChallenge(kind, targetId, options = {}) {
  const room = getActiveRoom();
  if (!room || !letterChallengePanel) return;

  const nativeLanguage = getCurrentNativeLanguage();
  const roomLanguage = getRoomLanguage(room);
  if (!canCreateLetterTranslationChallenge(room)) {
    letterChallengeState = null;
    letterChallengePanel.hidden = false;
    if (letterChallengeEyebrow) letterChallengeEyebrow.textContent = "Desafio indisponível";
    if (letterChallengeDirection) letterChallengeDirection.textContent = "Defina na conversa um idioma diferente do seu idioma nativo.";
    if (letterChallengePrompt) letterChallengePrompt.textContent = "Os transportes rápidos e a turbina exigem tradução entre dois idiomas diferentes.";
    if (letterChallengeInput) {
      letterChallengeInput.value = "";
      letterChallengeInput.disabled = true;
    }
    if (letterChallengeSubmitButton) letterChallengeSubmitButton.disabled = true;
    if (letterChallengeFeedback) {
      letterChallengeFeedback.textContent = "Abra o menu da conversa e escolha o idioma da sala.";
      letterChallengeFeedback.className = "letter-challenge-feedback is-error";
    }
    syncLetterComposerState();
    return;
  }

  const previousIndex = Number(letterChallengeState?.phraseIndex ?? -1);
  let phraseIndex = Math.floor(Math.random() * LETTER_CHALLENGE_PHRASES.length);
  if (LETTER_CHALLENGE_PHRASES.length > 1 && phraseIndex === previousIndex) {
    phraseIndex = (phraseIndex + 1) % LETTER_CHALLENGE_PHRASES.length;
  }
  const phrase = LETTER_CHALLENGE_PHRASES[phraseIndex];
  letterChallengeState = {
    kind,
    targetId,
    phraseIndex,
    sourceText: phrase[nativeLanguage.code] || phrase.pt,
    expectedText: phrase[roomLanguage.code] || phrase.en,
    attempts: options.keepAttempts ? Number(letterChallengeState?.attempts || 0) : 0
  };

  letterChallengePanel.hidden = false;
  if (letterChallengeEyebrow) {
    letterChallengeEyebrow.textContent = kind === "turbo" ? "Desafio da turbina" : `Desbloquear ${getLetterTransportOption(targetId).name}`;
  }
  if (letterChallengeDirection) {
    letterChallengeDirection.textContent = `Traduza de ${nativeLanguage.label} para ${roomLanguage.label}`;
  }
  if (letterChallengePrompt) letterChallengePrompt.textContent = letterChallengeState.sourceText;
  if (letterChallengeInput) {
    letterChallengeInput.disabled = false;
    letterChallengeInput.value = "";
    letterChallengeInput.placeholder = `Digite em ${roomLanguage.label}`;
  }
  if (letterChallengeSubmitButton) letterChallengeSubmitButton.disabled = false;
  if (letterChallengeFeedback) {
    letterChallengeFeedback.textContent = "A pontuação e as maiúsculas não interferem na validação.";
    letterChallengeFeedback.className = "letter-challenge-feedback";
  }
  syncLetterComposerState();
  letterChallengePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  window.setTimeout(() => letterChallengeInput?.focus(), 80);
}

function refreshLetterTranslationChallenge() {
  if (!letterChallengeState) return;
  startLetterTranslationChallenge(letterChallengeState.kind, letterChallengeState.targetId, { keepAttempts: true });
}

function normalizeLetterChallengeAnswer(value) {
  return normalize(value)
    .replace(/[’'`´]/g, "")
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]+/g, "")
    .trim();
}

function getLetterAnswerSimilarity(answer, expected) {
  if (!answer || !expected) return 0;
  if (answer === expected) return 1;
  const rows = expected.length + 1;
  const columns = answer.length + 1;
  const matrix = Array.from({ length: rows }, (_, row) => {
    const values = new Array(columns).fill(0);
    values[0] = row;
    return values;
  });
  for (let column = 0; column < columns; column += 1) matrix[0][column] = column;
  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = expected[row - 1] === answer[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost
      );
    }
  }
  const distance = matrix[rows - 1][columns - 1];
  return 1 - distance / Math.max(answer.length, expected.length, 1);
}

function verifyLetterTranslationChallenge() {
  if (!letterChallengeState || !letterChallengeInput) return;
  const answer = normalizeLetterChallengeAnswer(letterChallengeInput.value);
  const expected = normalizeLetterChallengeAnswer(letterChallengeState.expectedText);
  const similarity = getLetterAnswerSimilarity(answer, expected);
  const isCorrect = answer === expected || (expected.length >= 18 && similarity >= 0.92);

  letterChallengeState.attempts += 1;
  if (!isCorrect) {
    if (letterChallengeFeedback) {
      letterChallengeFeedback.textContent = letterChallengeState.attempts >= 2
        ? "Ainda não está correto. Confira o verbo, a ordem das palavras e tente novamente."
        : "Quase! Revise a tradução e tente outra vez.";
      letterChallengeFeedback.className = "letter-challenge-feedback is-error";
    }
    letterChallengeInput.classList.remove("is-correct");
    letterChallengeInput.classList.add("is-error");
    window.setTimeout(() => letterChallengeInput?.classList.remove("is-error"), 420);
    return;
  }

  if (letterChallengeState.kind === "transport") {
    letterUnlockedTransportIds.add(letterChallengeState.targetId);
    const input = letterForm?.querySelector(`input[name="letterTransport"][value="${CSS.escape(letterChallengeState.targetId)}"]`);
    if (input) input.checked = true;
  } else {
    letterTurboUnlocked = true;
    letterTurboEnabled = true;
  }
  if (letterChallengeFeedback) {
    letterChallengeFeedback.textContent = letterChallengeState.kind === "turbo"
      ? "Correto! Turbina desbloqueada e ativada."
      : `Correto! ${getLetterTransportOption(letterChallengeState.targetId).name} foi desbloqueado.`;
    letterChallengeFeedback.className = "letter-challenge-feedback is-success";
  }
  letterChallengeInput.classList.remove("is-error");
  letterChallengeInput.classList.add("is-correct");
  syncLetterComposerState();
  window.setTimeout(() => {
    if (letterChallengePanel) letterChallengePanel.hidden = true;
    letterChallengeState = null;
    letterChallengeInput?.classList.remove("is-correct");
    syncLetterComposerState();
  }, 1000);
}

function getSelectedLetterTransport() {
  const selectedId = letterForm?.querySelector('input[name="letterTransport"]:checked')?.value || LETTER_DEFAULT_TRANSPORT_ID;
  return getLetterTransportOption(selectedId);
}

function getEffectiveLetterSpeed(transport, turboEnabled = letterTurboEnabled) {
  const baseSpeed = Math.max(1, Number(transport?.speedKmh || LETTER_TRANSPORT_OPTIONS[LETTER_DEFAULT_TRANSPORT_ID].speedKmh));
  return Math.round(baseSpeed * (turboEnabled ? LETTER_TURBO_SPEED_MULTIPLIER : 1));
}

function getEffectiveLetterDuration(transport, turboEnabled = letterTurboEnabled, distanceMeters = 0) {
  const distance = Math.max(0, Number(distanceMeters || 0));
  if (!distance) {
    const fallback = Number(transport?.fallbackDurationMs || LETTER_TRANSPORT_OPTIONS[LETTER_DEFAULT_TRANSPORT_ID].fallbackDurationMs);
    return Math.max(LETTER_MIN_DURATION_MS, Math.round(fallback * (turboEnabled ? LETTER_TURBO_MULTIPLIER : 1)));
  }
  const speedKmh = getEffectiveLetterSpeed(transport, turboEnabled);
  const duration = (distance / 1000) / speedKmh * 60 * 60 * 1000;
  return Math.max(LETTER_MIN_DURATION_MS, Math.min(LETTER_MAX_DURATION_MS, Math.round(duration)));
}

function syncLetterComposerState() {
  const selectedTransport = getSelectedLetterTransport();
  const selectedLocked = selectedTransport.requiresChallenge && !letterUnlockedTransportIds.has(selectedTransport.id);

  letterTransportPicker?.querySelectorAll("label[data-transport-id]").forEach((label) => {
    const transportId = label.dataset.transportId || "";
    const transport = getLetterTransportOption(transportId);
    const locked = transport.requiresChallenge && !letterUnlockedTransportIds.has(transport.id);
    label.classList.toggle("is-locked", locked);
    label.classList.toggle("is-unlocked", transport.requiresChallenge && !locked);
    const badge = label.querySelector(".letter-transport-badge");
    if (badge) {
      badge.innerHTML = locked
        ? '<i class="fa-solid fa-lock"></i> Traduzir'
        : transport.requiresChallenge
          ? '<i class="fa-solid fa-lock-open"></i> Nesta carta'
          : '<i class="fa-solid fa-circle-check"></i> Livre';
    }
  });

  if (letterTurboButton) {
    letterTurboButton.classList.toggle("is-locked", !letterTurboUnlocked);
    letterTurboButton.classList.toggle("is-active", letterTurboEnabled);
    letterTurboButton.setAttribute("aria-pressed", String(letterTurboEnabled));
  }
  if (letterTurboStatus) {
    letterTurboStatus.textContent = !letterTurboUnlocked
      ? "Exige uma nova tradução em cada carta"
      : letterTurboEnabled
        ? "Ativa nesta carta · velocidade duplicada"
        : "Liberada nesta carta · toque para ativar";
  }

  refreshLetterComposerRoutePreview();

  const submit = letterForm?.querySelector('button[type="submit"]');
  if (submit && !submit.dataset.busy) {
    submit.disabled = selectedLocked || Boolean(letterComposerRouteState.destination && letterComposerRouteState.loading);
  }
}

function createApproximateLetterOrigin(destination, seed = Date.now()) {
  const angle = ((Number(seed || 0) % 360) * Math.PI) / 180;
  const distance = 0.09 + (Number(seed || 0) % 5) * 0.012;
  return {
    latitude: Number(destination.latitude) + Math.sin(angle) * distance,
    longitude: Number(destination.longitude) + Math.cos(angle) * distance
  };
}

async function getLetterRouteOrigin(destination) {
  if (!destination) return { origin: null, mode: "simulated" };
  try {
    if (navigator.geolocation) {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 300000
        });
      });
      return {
        origin: { latitude: Number(position.coords.latitude), longitude: Number(position.coords.longitude) },
        mode: "location"
      };
    }
  } catch (error) {
    console.warn("Não foi possível obter a origem exata da carta; usando ponto aproximado.", error);
  }
  return { origin: createApproximateLetterOrigin(destination, Date.now()), mode: "approximate" };
}

function simplifyLetterRouteCoordinates(coordinates, maxPoints = LETTER_ROUTE_MAX_POINTS) {
  if (!Array.isArray(coordinates) || coordinates.length <= maxPoints) return normalizeLetterRouteCoordinates(coordinates);
  const simplified = [];
  for (let index = 0; index < maxPoints; index += 1) {
    const sourceIndex = Math.round(index * (coordinates.length - 1) / (maxPoints - 1));
    simplified.push(coordinates[sourceIndex]);
  }
  return normalizeLetterRouteCoordinates(simplified);
}

async function calculateLetterGpsRoute(origin, destination) {
  if (!origin || !destination) return null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), LETTER_ROUTE_TIMEOUT_MS);
  try {
    const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const response = await fetch(`${LETTER_ROUTE_ENDPOINT}/${coordinates}?overview=full&geometries=geojson&steps=false`, {
      headers: { Accept: "application/json" }, signal: controller.signal
    });
    if (!response.ok) throw new Error(`Rota indisponível (${response.status})`);
    const data = await response.json();
    const route = data?.routes?.[0];
    const rawCoordinates = route?.geometry?.coordinates;
    if (!Array.isArray(rawCoordinates) || rawCoordinates.length < 2) throw new Error("Rota sem geometria");
    const routeCoordinates = simplifyLetterRouteCoordinates(rawCoordinates.map(([longitude, latitude]) => [Number(latitude), Number(longitude)]));
    return {
      routeCoordinates,
      distanceMeters: Math.max(1, Number(route.distance || 0)),
      mode: "gps",
      provider: "OSRM"
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

function createDirectLetterRoute(origin, destination, mode = "direct") {
  if (!origin || !destination) return null;
  const routeCoordinates = [[origin.latitude, origin.longitude], [destination.latitude, destination.longitude]];
  return {
    routeCoordinates,
    distanceMeters: calculateLetterPointDistanceMeters(routeCoordinates[0], routeCoordinates[1]),
    mode,
    provider: "direct"
  };
}

async function buildLetterRoute(originResult, destination) {
  if (!originResult?.origin || !destination) return null;
  try {
    return await calculateLetterGpsRoute(originResult.origin, destination);
  } catch (error) {
    console.warn("O serviço de rota GPS não respondeu; usando linha direta.", error);
    return createDirectLetterRoute(originResult.origin, destination, "direct");
  }
}

async function getLetterRecipientNativeLanguage(room) {
  if (letterRecipientNativeLanguage) return letterRecipientNativeLanguage;
  return prepareLetterRecipientNativeLanguage(room);
}

async function createLetterOpenProtection(room, directionMode, deliveredPayload) {
  const roomLanguage = getRoomLanguage(room);
  const nativeLanguage = await getLetterRecipientNativeLanguage(room);
  if (!roomLanguage?.code || !nativeLanguage?.code || roomLanguage.code === nativeLanguage.code) {
    throw new Error("O idioma nativo do destinatário precisa ser diferente do idioma da sala.");
  }
  let direction = directionMode;
  if (!direction || direction === "random") direction = Math.random() < 0.5 ? "room-to-native" : "native-to-room";
  const sourceLanguage = direction === "room-to-native" ? roomLanguage : nativeLanguage;
  const targetLanguage = direction === "room-to-native" ? nativeLanguage : roomLanguage;
  const phraseIndex = Math.floor(Math.random() * LETTER_CHALLENGE_PHRASES.length);
  const phrase = LETTER_CHALLENGE_PHRASES[phraseIndex];
  const sourceText = phrase[sourceLanguage.code] || phrase.pt;
  const expectedText = phrase[targetLanguage.code] || phrase.en;
  const secret = normalizeLetterChallengeAnswer(expectedText);
  const answerHash = await hashLetterSecret(secret);
  const encryptedPayload = await encryptLetterContent(deliveredPayload, secret);
  return {
    secret,
    protection: {
      enabled: true,
      challenge: {
        sourceText,
        sourceLanguageCode: sourceLanguage.code,
        sourceLanguageLabel: sourceLanguage.label,
        targetLanguageCode: targetLanguage.code,
        targetLanguageLabel: targetLanguage.label,
        direction,
        answerHash
      }
    },
    encryptedPayload
  };
}

async function requestPrivateLetterLocation() {
  const room = getActiveRoom();
  if (!room || !isPrivateRoom(room)) return;

  if (getLatestSharedLetterLocation(room)) {
    renderLatestLetterDestination(room);
    showToast("Localização já disponível", "O destino já foi compartilhado nesta conversa. Não é necessário solicitar novamente.");
    return;
  }

  if (getLatestLetterLocationRequest(room, "requested")) {
    renderLatestLetterDestination(room);
    showToast("Solicitação em andamento", "A localização já foi solicitada. Aguarde o destinatário responder.");
    return;
  }

  setButtonBusy(requestLetterLocationButton, true, "Solicitando...");
  try {
    await sendFirebaseMessage(room, "Solicitação de localização para entrega de carta", {
      skipTranslation: true,
      translationDisabled: true,
      letterLocationRequest: { requesterUid: currentFirebaseUid, status: "requested" }
    });
    showToast("Solicitação enviada", "O destinatário poderá escolher se deseja compartilhar a localização.");
    closeLetterModal();
  } catch (error) {
    console.error("Não foi possível solicitar a localização.", error);
    showToast("Falha", "Não foi possível solicitar a localização agora.");
  } finally {
    setButtonBusy(requestLetterLocationButton, false);
  }
}

async function sendPrivateLetter(event) {
  event?.preventDefault();
  const room = getActiveRoom();
  if (!room || !isPrivateRoom(room)) return;
  const title = sanitizeText(letterTitleInput?.value || "", 60);
  const content = cleanMessageText(letterMessageInput?.value || "", 1500);
  const transport = getSelectedLetterTransport();
  if (!title || !content) return;

  if (transport.requiresChallenge && !letterUnlockedTransportIds.has(transport.id)) {
    startLetterTranslationChallenge("transport", transport.id);
    showToast("Transporte bloqueado", "Conclua a tradução para liberar esta opção de entrega.");
    return;
  }
  if (letterTurboEnabled && !letterTurboUnlocked) {
    startLetterTranslationChallenge("turbo", "turbo");
    showToast("Turbina bloqueada", "Conclua a tradução para acelerar a carta.");
    return;
  }

  const submit = letterForm?.querySelector('button[type="submit"]');
  if (submit) submit.dataset.busy = "1";
  setButtonBusy(submit, true, "Calculando rota GPS...");
  try {
    const language = getRoomLanguage(room);
    let deliveredTitle = title;
    let deliveredContent = content;
    if (language?.code) {
      [deliveredTitle, deliveredContent] = await Promise.all([
        translateMessageText(title, language),
        translateMessageText(content, language)
      ]);
    }

    const destination = getLatestSharedLetterLocation(room);
    const destinationKey = getLetterDestinationKey(destination);
    let routeOrigin = null;
    let route = null;
    if (
      destination &&
      letterComposerRouteState.destinationKey === destinationKey &&
      letterComposerRouteState.originResult
    ) {
      routeOrigin = letterComposerRouteState.originResult;
      route = await resolveLetterRouteForTransport(
        routeOrigin,
        destination,
        transport,
        letterComposerRouteState.groundRoute
      );
    } else {
      routeOrigin = await getLetterRouteOrigin(destination);
      const groundRoute = transport.trajectoryMode === "ground"
        ? await buildLetterRoute(routeOrigin, destination)
        : null;
      route = await resolveLetterRouteForTransport(routeOrigin, destination, transport, groundRoute);
    }
    const distanceMeters = Number(route?.distanceMeters || 0);
    const speedKmh = getEffectiveLetterSpeed(transport, letterTurboEnabled);
    const durationMs = getEffectiveLetterDuration(transport, letterTurboEnabled, distanceMeters);
    const sentAtMillis = Date.now();
    const requireTranslation = Boolean(letterRequireTranslationCheckbox?.checked);
    let protection = null;
    let encryptedPayload = null;
    let openingSecret = "";
    if (requireTranslation) {
      const protectionResult = await createLetterOpenProtection(
        room,
        letterOpenChallengeDirectionSelect?.value || "random",
        { title: deliveredTitle, content: deliveredContent, originalContent: content }
      );
      protection = protectionResult.protection;
      encryptedPayload = protectionResult.encryptedPayload;
      openingSecret = protectionResult.secret;
    }

    const sentMessage = await sendFirebaseMessage(room, requireTranslation ? "Carta protegida" : "Carta rastreável", {
      skipTranslation: true,
      translationDisabled: true,
      letter: {
        title: requireTranslation && encryptedPayload ? "Carta protegida" : deliveredTitle,
        content: requireTranslation && encryptedPayload ? "" : deliveredContent,
        originalContent: requireTranslation && encryptedPayload ? "" : content,
        protection,
        encryptedPayload,
        transport: transport.id,
        turbo: letterTurboEnabled,
        status: "transit",
        sentAtMillis,
        durationMs,
        arrivalAtMillis: sentAtMillis + durationMs,
        routeMode: route?.mode || routeOrigin?.mode || "simulated",
        routeProvider: route?.provider || "",
        trajectoryMode: transport.trajectoryMode || "ground",
        routeDistanceMeters: distanceMeters,
        routeCoordinates: route?.routeCoordinates || [],
        speedKmh,
        originMode: routeOrigin.mode,
        latitude: destination?.latitude,
        longitude: destination?.longitude,
        originLatitude: routeOrigin.origin?.latitude,
        originLongitude: routeOrigin.origin?.longitude
      }
    });
    if (openingSecret && sentMessage?.id) rememberLetterOpenSecret(room.id, sentMessage.id, openingSecret);
    closeLetterModal();
    showToast(
      "Carta enviada",
      `${transport.name}${letterTurboEnabled ? " com turbina" : ""} iniciou a rota. ${distanceMeters ? `${formatLetterDistance(distanceMeters)} · ` : ""}previsão ${formatLetterDuration(durationMs)}.`
    );
  } catch (error) {
    console.error("Não foi possível enviar a carta.", error);
    showToast("Falha no envio", error?.message || "Não foi possível enviar a carta agora.");
  } finally {
    if (submit) delete submit.dataset.busy;
    setButtonBusy(submit, false);
    syncLetterComposerState();
  }
}

function closeInviteModal() {
  inviteModal.hidden = true;
  inviteModal.setAttribute("aria-hidden", "true");
}

function renderRoomFriendPicker() {
  if (!roomFriendsList) return;

  const query = normalizeNick(roomFriendFilterInput?.value || "");
  const availableFriends = friends
    .filter((friend) => friend?.uid)
    .filter((friend) => {
      if (!query) return true;
      return normalizeNick(friend.nick).includes(query);
    });

  renderFriendCheckboxes(
    roomFriendsList,
    availableFriends,
    query ? "Nenhum amigo encontrado com esse nick." : "Adicione amigos pelo botão + para poder convidar alguém para a sala.",
    {
      selectedIds: pendingRoomInviteFriendIds,
      toolbarSubtitle: query ? "Resultado da busca" : "Toque em um amigo para incluir no convite",
      onSelectionChange: (friendId, checked) => {
        if (checked) {
          pendingRoomInviteFriendIds.add(friendId);
        } else {
          pendingRoomInviteFriendIds.delete(friendId);
        }
        updateRoomFriendsCounter();
      },
      onBulkSelection: (ids, checked) => {
        ids.forEach((friendId) => {
          if (checked) {
            pendingRoomInviteFriendIds.add(friendId);
          } else {
            pendingRoomInviteFriendIds.delete(friendId);
          }
        });
        updateRoomFriendsCounter();
      },
    }
  );

  updateRoomFriendsCounter();
}

function updateRoomFriendsCounter() {
  if (!roomFriendsCounter) return;
  const count = pendingRoomInviteFriendIds.size;
  roomFriendsCounter.textContent = count ? `${count} selecionado${count === 1 ? "" : "s"}` : "Opcional";
}

function renderFriendCheckboxes(container, sourceFriends, emptyText = "Adicione amigos antes de criar convites.", options = {}) {
  if (!container) return;
  container.innerHTML = "";

  const friendsToShow = sourceFriends
    .filter((friend) => friend?.uid)
    .slice()
    .sort((a, b) => a.nick.localeCompare(b.nick, "pt-BR"));

  const selectedIds = options.selectedIds || new Set();
  const toolbarSubtitle = options.toolbarSubtitle || "Escolha quem receberá o convite";

  if (!friendsToShow.length) {
    const empty = createEmptyState(
      "fa-solid fa-user-astronaut",
      "Nenhum amigo disponível",
      emptyText
    );
    container.appendChild(empty);
    return;
  }

  const header = document.createElement("div");
  header.className = "select-list-toolbar";
  header.innerHTML = `
    <div>
      <strong>${friendsToShow.length} amigo${friendsToShow.length === 1 ? "" : "s"}</strong>
      <span>${escapeHtml(toolbarSubtitle)}</span>
    </div>
    <button type="button" class="select-all-button" title="Selecionar todos" aria-label="Selecionar todos">
      <i class="fa-solid fa-check-double" aria-hidden="true"></i>
    </button>
  `;
  const selectAllButton = header.querySelector("button");
  selectAllButton.addEventListener("click", () => {
    const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]'));
    const shouldSelectAll = checkboxes.some((input) => !input.checked);
    const affectedIds = [];
    checkboxes.forEach((input) => {
      input.checked = shouldSelectAll;
      input.closest(".check-row")?.classList.toggle("is-selected", input.checked);
      affectedIds.push(input.value);
    });
    options.onBulkSelection?.(affectedIds, shouldSelectAll);
  });
  container.appendChild(header);

  friendsToShow.forEach((friend) => {
    const label = document.createElement("label");
    label.className = "check-row friend-check-row";
    const isSelected = selectedIds.has(friend.uid);
    label.classList.toggle("is-selected", isSelected);
    label.innerHTML = `
      <input type="checkbox" value="${escapeHtml(friend.uid)}" ${isSelected ? "checked" : ""} />
      <div class="avatar friend-check-avatar"></div>
      <span class="friend-check-info">
        <strong>${escapeHtml(friend.nick)}</strong>
        <small>Amigo salvo</small>
      </span>
      <span class="friend-check-status">Selecionado</span>
      <i class="fa-solid fa-circle-check friend-check-icon" aria-hidden="true"></i>
    `;

    const avatar = label.querySelector(".avatar");
    avatar.style.background = getGradientByText(friend.nick);
    paintAvatar(avatar, friend, friend.nick);

    const checkbox = label.querySelector('input[type="checkbox"]');
    checkbox.addEventListener("change", () => {
      label.classList.toggle("is-selected", checkbox.checked);
      options.onSelectionChange?.(friend.uid, checkbox.checked);
    });

    container.appendChild(label);
  });
}

function getCheckedFriendIds(container) {
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
    .map((input) => input.value);
}

function isFriendAlreadyLinkedToActiveRoom(friendUid) {
  const activeRoom = getActiveRoom();
  return activeRoom ? isFriendLinkedToRoom(friendUid, activeRoom) : true;
}

function isFriendLinkedToRoom(friendUid, room) {
  if (isAiRoom(room)) return true;
  if (!friendUid) return true;

  const alreadyInvited = room.invitedUids?.includes(friendUid);
  const alreadyMember = room.memberUids?.includes(friendUid);
  return Boolean(alreadyInvited || alreadyMember);
}


function isPrivateRoom(room) {
  return room?.type === PRIVATE_ROOM_TYPE || room?.private === true;
}

function getRoomDisplayName(room) {
  if (!room) return "Sala";
  if (isAiRoom(room)) return room.name;
  if (!isPrivateRoom(room)) return room.name;
  return getPrivateOtherNick(room) || room.name;
}

function getRoomDescription(room) {
  if (!room) return "";
  if (isAiFriendRoom(room)) return room.description || room.persona || "Amigo IA";
  if (isAiTeacherRoom(room)) return room.description || "Professor de idiomas";
  if (isPrivateRoom(room)) return "Conversa privada";
  return room.description || "";
}

function getRoomAvatar(room) {
  if (!room) return "S";
  if (isAiRoom(room)) return room.avatar || "IA";
  if (isPrivateRoom(room)) return getInitials(getPrivateOtherNick(room) || room.name);
  return room.avatar || getInitials(room.name || "Sala");
}

function getRoomAvatarSource(room) {
  if (!room) return { avatar: "S" };
  if (isAiRoom(room)) return { avatar: room.avatar || "IA", avatarIcon: room.avatarIcon || "" };
  if (isPrivateRoom(room)) {
    const other = getPrivateOtherMember(room);
    return {
      avatar: other?.avatar || getInitials(other?.nick || getPrivateOtherNick(room) || room.name),
      avatarIcon: getSafeSpaceAvatarIcon(other?.avatarIcon || "")
    };
  }

  return {
    avatar: room.avatar || getInitials(room.name || "Sala"),
    avatarIcon: getSafeSpaceAvatarIcon(room.avatarIcon || "")
  };
}

function paintRoomAvatar(element, room) {
  if (!element || !room) return;
  const source = getRoomAvatarSource(room);
  const label = getRoomDisplayName(room);
  element.style.background = isPrivateRoom(room)
    ? getGradientByText(label)
    : room.color || getGradientByText(label);
  paintAvatar(element, source, label);
}

function getPrivateOtherMember(room) {
  if (!room) return null;
  const map = room.memberNickMap || {};
  const iconMap = room.memberAvatarIconMap || {};
  const uid = Object.keys(map).find((memberUid) => memberUid !== currentFirebaseUid);
  if (uid) {
    return {
      uid,
      nick: map[uid] || "Usuário",
      avatar: getInitials(map[uid] || "Usuário"),
      avatarIcon: getSafeSpaceAvatarIcon(iconMap[uid] || "")
    };
  }
  return null;
}

function getPrivateOtherNick(room) {
  if (!room) return "";
  const map = room.memberNickMap || {};
  const entry = Object.entries(map).find(([uid]) => uid !== currentFirebaseUid);
  if (entry?.[1]) return entry[1];

  const nick = (room.memberNicks || room.members || []).find((value) => normalize(value) !== normalize(currentUser?.nick || ""));
  return nick || room.name;
}

function getPrivatePairKey(uidA, uidB) {
  return [uidA, uidB].sort().map((uid) => toDatabaseKey(uid)).join("__");
}

function getPrivateRoomId(uidA, uidB) {
  return `private_${getPrivatePairKey(uidA, uidB)}`;
}

function getRoomStatus(room) {
  const pendingOfflineCount = getOfflineQueueCountForRoom(room?.id);
  if (pendingOfflineCount) {
    return `Aguardando conexão · ${pendingOfflineCount} mensagem${pendingOfflineCount > 1 ? "s" : ""} pendente${pendingOfflineCount > 1 ? "s" : ""}`;
  }

  if (!isInternetAvailable() && !isAiRoom(room)) {
    return "Offline · mensagens carregadas continuam disponíveis";
  }

  if (isAiTeacherRoom(room)) {
    const activeCount = getActiveAiDifficulties(room).length;
    return activeCount
      ? `Professor de idiomas · ${activeCount} dificuldade${activeCount === 1 ? "" : "s"} ativa${activeCount === 1 ? "" : "s"}`
      : "Professor de idiomas · Pollinations.ai";
  }

  if (isAiFriendRoom(room)) {
    const language = getRoomLanguage(room);
    return language?.code
      ? `Amigo IA · traducao para ${language.label}`
      : "Amigo IA · sem traducao automatica";
    return "Amigo IA · conversa privada local";
  }

  if (isAiRoom(room)) {
    return "Professor de idiomas · Pollinations.ai";
  }

  const language = getRoomLanguage(room);

  if (isPrivateRoom(room)) {
    const languagePart = language?.code ? ` · tradução para ${language.label}` : "";
    return `Conversa privada${languagePart}`;
  }

  const languagePart = language?.code ? ` · tradução para ${language.label}` : "";
  const memberCount = room.memberUids?.length || room.members?.length || 1;
  const pendingCount = invites.filter((invite) => invite.roomId === room.id && invite.status === "pendente").length;

  if (pendingCount > 0) {
    return `Sala online${languagePart} · ${memberCount} participante${memberCount > 1 ? "s" : ""} · ${pendingCount} convite${pendingCount > 1 ? "s" : ""} pendente${pendingCount > 1 ? "s" : ""}`;
  }

  return `Sala online${languagePart} · ${memberCount} participante${memberCount > 1 ? "s" : ""}`;
}

function getLastTime(room) {
  const lastMessage = room.messages?.at(-1);
  return getMessageSortTime(lastMessage) || room.lastMessageAt || room.updatedAt || room.createdAt || 0;
}

function getLanguageOption(code) {
  return LANGUAGE_OPTIONS.find((language) => language.code === code) || LANGUAGE_OPTIONS[0];
}

function getRoomLanguage(room) {
  if (!room?.languageCode) return getLanguageOption("");
  const option = getLanguageOption(room.languageCode);
  return {
    ...option,
    name: room.languageName || option.name,
    label: option.label || room.languageName || option.name
  };
}

function getNativeLanguageOption(code) {
  return NATIVE_LANGUAGE_OPTIONS.find((language) => language.code === code) || NATIVE_LANGUAGE_OPTIONS[0];
}

function getSelectedNativeLanguage(code) {
  const option = getNativeLanguageOption(code || "pt");
  return { ...option };
}

function getCurrentNativeLanguage() {
  return getSelectedNativeLanguage(currentUser?.nativeLanguageCode || "pt");
}



function setComposerAiButtonsDisabled(isDisabled) {
  [suggestTextButton, spellcheckButton, learningTestButton].forEach((button) => {
    if (!button) return;
    button.disabled = Boolean(isDisabled);
  });

  if (!isDisabled) updateLearningTestButtonState();
}

function getComposerTextForAiTool() {
  return cleanMessageText(messageInput?.value || "");
}

function getComposerLanguageHint(room = getActiveRoom()) {
  const language = getRoomLanguage(room);
  if (language?.code) return `idioma-alvo da conversa: ${language.name}`;
  if (isAiFriendRoom(room)) return `contexto: conversa privada com ${getRoomDisplayName(room)}`;
  if (isAiRoom(room)) return "contexto: conversa com professor de idiomas";
  return "sem idioma-alvo definido; preserve o idioma original do texto";
}

async function createLearningFeedbackFromResult(originalText, result, room) {
  if (!hasLearningTestWritingIssues(originalText, result)) return null;

  const correctedText = cleanMessageText(result?.correctedText || originalText, 800) || originalText;
  const roomLanguage = getRoomLanguage(room);
  const nativeLanguage = getCurrentNativeLanguage();
  const errors = await translateLearningErrorExplanations(result?.errors || [], nativeLanguage);
  let nativeTranslationText = "";
  let nativeTranslationError = false;

  if (correctedText) {
    try {
      nativeTranslationText = roomLanguage?.code && nativeLanguage?.code === roomLanguage.code
        ? correctedText
        : await translateMessageText(correctedText, nativeLanguage);
    } catch (error) {
      console.warn("Nao foi possivel traduzir a correcao para o idioma nativo.", error);
      nativeTranslationError = true;
    }
  }

  return normalizeLearningFeedback({
    correctedText,
    nativeTranslationText,
    nativeTranslationError,
    targetLanguageCode: roomLanguage?.code || "",
    targetLanguageName: roomLanguage?.name || "",
    targetLanguageLabel: roomLanguage?.label || "",
    nativeLanguageCode: nativeLanguage?.code || "",
    nativeLanguageName: nativeLanguage?.name || "",
    nativeLanguageLabel: nativeLanguage?.label || "",
    errors
  });
}

async function translateLearningErrorExplanations(errors, nativeLanguage) {
  const normalizedErrors = Array.isArray(errors) ? errors : [];
  const shouldTranslate = nativeLanguage?.code && nativeLanguage.code !== "en";

  return Promise.all(normalizedErrors.map(async (error) => {
    const explanationEnglish = sanitizeText(error?.explanationEnglish || error?.explanation || error?.reason || "", 240);
    let explanationTranslation = sanitizeText(error?.explanationTranslation || error?.explanationNativeTranslation || "", 240);
    let explanationTranslationError = false;

    if (explanationEnglish && shouldTranslate && !explanationTranslation) {
      try {
        explanationTranslation = sanitizeText(await translateMessageText(explanationEnglish, nativeLanguage), 240);
      } catch (translationError) {
        console.warn("Nao foi possivel traduzir a explicacao da correcao.", translationError);
        explanationTranslationError = true;
      }
    } else if (explanationEnglish && !shouldTranslate) {
      explanationTranslation = explanationEnglish;
    }

    return {
      ...error,
      explanationEnglish,
      explanationTranslation,
      explanationTranslationError
    };
  }));
}

function hasLearningTestWritingIssues(originalText, result) {
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  if (errors.length) return true;

  const corrected = normalizeTextForLearningComparison(result?.correctedText || "");
  const original = normalizeTextForLearningComparison(originalText);
  return Boolean(corrected && original && corrected !== original);
}

function normalizeTextForLearningComparison(value) {
  return cleanMessageText(value)
    .replace(/\s+/g, " ")
    .trim();
}

async function checkLearningTestWriting(text, room) {
  const language = getRoomLanguage(room);
  const languageName = language?.name || "o idioma-alvo da sala";
  const systemPrompt = `Voce e um avaliador de escrita para um app de aprendizado de idiomas chamado AstroChat.
O usuario deve escrever em ${languageName}.
Verifique se a frase esta no idioma-alvo, com ortografia, gramatica e uso natural suficientes para chat.
Se houver erro, retorne a frase corrigida em ${languageName}; nao traduza para o idioma nativo do usuario.
Explique cada erro em ingles simples no campo explanationEnglish.
Se estiver correta, retorne correctedText igual ao texto original e errors como lista vazia.
Responda em JSON valido no formato: {"correctedText":"...","errors":[{"original":"...","correction":"...","explanationEnglish":"..."}]}`;
  const aiResult = await askAiForJson("learning-test", systemPrompt, text, 0.15, 700);
  const content = aiResult.content;
  const parsed = parseJsonFromAi(content);
  const correctedText = cleanMessageText(parsed?.correctedText || parsed?.corrected || "", 800) || text;
  const errors = Array.isArray(parsed?.errors)
    ? parsed.errors.map((item) => ({
      original: sanitizeText(item?.original || item?.word || item?.erro || "", 80),
      correction: sanitizeText(item?.correction || item?.correct || item?.correcao || "", 100),
      explanationEnglish: sanitizeText(item?.explanationEnglish || item?.explanation || item?.reason || item?.explicacao || "", 240)
    })).filter((item) => item.original || item.correction || item.explanationEnglish).slice(0, 8)
    : [];

  return { correctedText, errors, raw: content, provider: aiResult.provider };
}

function normalizeLearningFeedback(feedback) {
  if (!feedback || typeof feedback !== "object") return null;

  const correctedText = cleanMessageText(feedback.correctedText || feedback.corrected || "", 800);
  const nativeTranslationText = cleanMessageText(feedback.nativeTranslationText || feedback.translationText || "", 800);
  const errors = Array.isArray(feedback.errors)
    ? feedback.errors.map((item) => ({
      original: sanitizeText(item?.original || item?.word || item?.erro || "", 80),
      correction: sanitizeText(item?.correction || item?.correct || item?.correcao || "", 100),
      explanationEnglish: sanitizeText(item?.explanationEnglish || item?.explanation || item?.reason || item?.explicacao || "", 240),
      explanationTranslation: sanitizeText(item?.explanationTranslation || item?.explanationNativeTranslation || "", 240),
      explanationTranslationError: Boolean(item?.explanationTranslationError)
    })).filter((item) => item.original || item.correction || item.explanationEnglish || item.explanationTranslation).slice(0, 8)
    : [];

  if (!correctedText && !nativeTranslationText && !errors.length) return null;
  return {
    correctedText,
    nativeTranslationText,
    nativeTranslationError: Boolean(feedback.nativeTranslationError),
    targetLanguageCode: sanitizeText(feedback.targetLanguageCode || "", 16),
    targetLanguageName: sanitizeText(feedback.targetLanguageName || "", 48),
    targetLanguageLabel: sanitizeText(feedback.targetLanguageLabel || "", 48),
    nativeLanguageCode: sanitizeText(feedback.nativeLanguageCode || "", 16),
    nativeLanguageName: sanitizeText(feedback.nativeLanguageName || "", 48),
    nativeLanguageLabel: sanitizeText(feedback.nativeLanguageLabel || "", 48),
    errors
  };
}

function openAiAssistModal(mode, originalText) {
  if (!aiAssistModal) return;
  const isSuggestion = mode === "suggestions";
  aiAssistTitle.textContent = isSuggestion ? "Sugestões de mensagem" : "Verificação ortográfica";
  aiAssistSubtitle.textContent = isSuggestion
    ? "A IA vai gerar três versões melhores para o texto que está no campo."
    : "A IA vai encontrar erros de ortografia, gramática e clareza no texto atual.";
  aiAssistOriginalText.textContent = originalText;
  aiAssistContent.innerHTML = "";
  aiAssistContent.appendChild(createAiAssistLoadingState(isSuggestion ? "Gerando sugestões..." : "Verificando texto..."));
  aiAssistModal.hidden = false;
  aiAssistModal.setAttribute("aria-hidden", "false");
}

function closeAiAssistModal() {
  if (!aiAssistModal) return;
  aiAssistModal.hidden = true;
  aiAssistModal.setAttribute("aria-hidden", "true");
}

function createAiAssistLoadingState(text) {
  const box = document.createElement("div");
  box.className = "ai-assist-loading";
  box.innerHTML = `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>${escapeHtml(text)}</span>`;
  return box;
}

async function openTextSuggestionAssistant() {
  const originalText = getComposerTextForAiTool();
  if (!originalText) {
    showToast("Texto vazio", "Digite uma mensagem antes de pedir sugestões.");
    return;
  }

  if (!requireInternet("gerar sugestoes de texto")) return;

  openAiAssistModal("suggestions", originalText);
  setComposerAiButtonsDisabled(true);

  try {
    const suggestions = await generateTextSuggestions(originalText, getActiveRoom());
    renderTextSuggestions(originalText, suggestions);
  } catch (error) {
    console.error("Erro ao gerar sugestões.", error);
    renderAiAssistError("Não consegui gerar sugestões agora. Verifique sua conexão e tente novamente.");
  } finally {
    setComposerAiButtonsDisabled(false);
  }
}

async function openSpellcheckAssistant() {
  const originalText = getComposerTextForAiTool();
  if (!originalText) {
    showToast("Texto vazio", "Digite uma mensagem antes de verificar a ortografia.");
    return;
  }

  if (!requireInternet("verificar ortografia")) return;

  openAiAssistModal("spellcheck", originalText);
  setComposerAiButtonsDisabled(true);

  try {
    const result = await checkMessageOrthography(originalText, getActiveRoom());
    renderSpellcheckResult(originalText, result);
  } catch (error) {
    console.error("Erro ao verificar ortografia.", error);
    renderAiAssistError("Não consegui verificar o texto agora. Verifique sua conexão e tente novamente.");
  } finally {
    setComposerAiButtonsDisabled(false);
  }
}

async function generateTextSuggestions(text, room) {
  const languageHint = getComposerLanguageHint(room);
  const systemPrompt = `Você é um assistente de escrita para um app de chat chamado AstroChat.
Gere exatamente 3 sugestões melhores para a mensagem do usuário.
Preserve a intenção, não invente fatos e mantenha o texto natural para conversa.
Use ${languageHint}.
Responda em JSON válido no formato: {"suggestions":[{"text":"...","tone":"...","reason":"..."}]}`;
  const { content } = await askAiForJson("suggestions", systemPrompt, text, 0.55, 600);
  const parsed = parseJsonFromAi(content);
  const rawSuggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
  const suggestions = rawSuggestions
    .map((item, index) => ({
      text: cleanMessageText(typeof item === "string" ? item : item?.text || "", 500),
      tone: sanitizeText(item?.tone || ["Natural", "Mais clara", "Mais amigável"][index] || "Sugestão", 32),
      reason: sanitizeText(item?.reason || "Versão alternativa para enviar.", 120)
    }))
    .filter((item) => item.text)
    .slice(0, 3);

  if (suggestions.length) return suggestions;

  return fallbackSuggestionLines(content).map((line, index) => ({
    text: line,
    tone: ["Natural", "Mais clara", "Mais amigável"][index] || "Sugestão",
    reason: "Versão alternativa para enviar."
  })).slice(0, 3);
}

async function checkMessageOrthography(text, room) {
  const languageHint = getComposerLanguageHint(room);
  const systemPrompt = `Você é um corretor de ortografia, gramática e clareza para um app de chat chamado AstroChat.
Analise a mensagem do usuário e mostre problemas reais, sem exagerar.
Use ${languageHint}.
Responda em JSON válido no formato: {"correctedText":"...","errors":[{"original":"...","correction":"...","explanation":"..."}]}
Se não houver erro, retorne errors como lista vazia e correctedText igual ao texto original.`;
  const { content } = await askAiForJson("spellcheck", systemPrompt, text, 0.2, 700);
  const parsed = parseJsonFromAi(content);
  const correctedText = cleanMessageText(parsed?.correctedText || parsed?.corrected || "", 800) || text;
  const errors = Array.isArray(parsed?.errors)
    ? parsed.errors.map((item) => ({
      original: sanitizeText(item?.original || item?.word || item?.erro || "", 80),
      correction: sanitizeText(item?.correction || item?.correct || item?.correcao || "", 100),
      explanation: sanitizeText(item?.explanation || item?.reason || item?.explicacao || "", 180)
    })).filter((item) => item.original || item.correction || item.explanation).slice(0, 8)
    : [];

  return { correctedText, errors, raw: content };
}

async function askAiForJson(task, systemPrompt, userText, temperature = 0.3, maxTokens = 700) {
  try {
    const content = await askGeminiForJson(task, systemPrompt, userText, temperature, maxTokens);
    if (!parseJsonFromAi(content)) {
      throw new Error("Gemini retornou JSON inválido para este recurso.");
    }
    return { content, provider: "Gemini" };
  } catch (error) {
    console.warn(`Gemini indisponível para ${task}; tentando Pollinations.AI.`, error);
    return { content: await askPollinationsForJson(systemPrompt, userText, temperature, maxTokens), provider: "Pollinations.AI" };
  }
}

async function askGeminiForJson(task, systemPrompt, userText, temperature = 0.3, maxTokens = 700) {
  if (!requireInternet("usar a IA")) {
    throw new Error("Sem internet para usar a IA.");
  }

  const endpoint = String(GEMINI_AI_ENDPOINT || "").trim();
  const cleanTask = sanitizeText(task || "", 40).toLowerCase();
  const cleanSystemPrompt = cleanMessageText(systemPrompt, 3500);
  const cleanUserText = cleanMessageText(userText, 2000);

  if (!endpoint || !cleanTask || !cleanSystemPrompt || !cleanUserText) {
    throw new Error("Gemini não está configurado para este recurso de IA.");
  }
  if (!currentFirebaseUser?.getIdToken) {
    throw new Error("Usuário Firebase indisponível para usar o Gemini.");
  }

  const idToken = await currentFirebaseUser.getIdToken(false);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), GEMINI_AI_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream, application/json"
      },
      body: JSON.stringify({
        idToken,
        task: cleanTask,
        systemPrompt: cleanSystemPrompt,
        userText: cleanUserText,
        temperature: Number(temperature),
        maxTokens: Number(maxTokens),
        stream: true
      }),
      signal: controller.signal
    });

    if (response.ok && String(response.headers.get("Content-Type") || "").includes("text/event-stream")) {
      const content = cleanAiText(await readGeminiEventStream(response));
      if (!content) throw new Error("Gemini retornou uma resposta vazia.");
      return content;
    }

    const rawBody = await response.text();
    let data = {};
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      data = { ok: false, error: rawBody };
    }

    if (!response.ok || data?.ok === false) {
      const errorParts = [data?.error, data?.details].filter(Boolean);
      const errorMessage = errorParts.join(" — ") || `Gemini respondeu HTTP ${response.status}`;
      console.warn("Gemini não concluiu o recurso de IA; usando Pollinations como fallback.", {
        task: cleanTask,
        status: response.status,
        code: data?.code || "",
        upstreamStatus: data?.upstreamStatus || 0,
        modelsTried: data?.modelsTried || [],
        details: data?.details || ""
      });
      throw new Error(errorMessage);
    }

    const content = cleanAiText(data?.content || data?.text || "");
    if (!content) throw new Error("Gemini retornou uma resposta vazia.");
    return content;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function askPollinationsForJson(systemPrompt, userText, temperature = 0.3, maxTokens = 700) {
  if (!requireInternet("usar a IA")) {
    throw new Error("Sem internet para usar a IA.");
  }

  const payload = {
    model: "openai",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText }
    ],
    temperature,
    max_tokens: maxTokens,
    stream: false
  };

  try {
    const response = await fetch(POLLINATIONS_CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Resposta HTTP ${response.status}`);
    const data = await response.json();
    return cleanAiText(data?.choices?.[0]?.message?.content || data?.response || "");
  } catch (error) {
    console.warn("Endpoint de assistência por chat indisponível, tentando endpoint simples.", error);
  }

  const params = new URLSearchParams({
    model: "openai",
    temperature: String(temperature),
    system: systemPrompt
  });
  const response = await fetch(`${POLLINATIONS_TEXT_ENDPOINT}${encodeURIComponent(userText)}?${params.toString()}`);
  if (!response.ok) throw new Error(`Resposta HTTP ${response.status}`);
  return cleanAiText(await response.text());
}

function parseJsonFromAi(content) {
  const text = cleanAiText(content);
  if (!text) return null;

  const candidates = [
    text,
    text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim(),
    (text.match(/\{[\s\S]*\}/) || [""])[0]
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      // tenta o próximo formato
    }
  }

  return null;
}

function fallbackSuggestionLines(content) {
  return cleanAiText(content)
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").replace(/^['"]|['"]$/g, "").trim())
    .filter((line) => line && line.length <= 500)
    .slice(0, 3);
}

function renderTextSuggestions(originalText, suggestions) {
  if (!aiAssistContent) return;
  aiAssistContent.innerHTML = "";

  if (!suggestions.length) {
    renderAiAssistError("A IA não retornou sugestões úteis para este texto.");
    return;
  }

  suggestions.forEach((suggestion, index) => {
    const card = document.createElement("article");
    card.className = "ai-suggestion-card";
    card.innerHTML = `
      <div class="ai-suggestion-head">
        <span>${escapeHtml(suggestion.tone || `Sugestão ${index + 1}`)}</span>
        <small>${escapeHtml(suggestion.reason || "")}</small>
      </div>
      <p>${escapeHtml(suggestion.text)}</p>
      <button class="small-action use-suggestion-action" type="button">
        <i class="fa-solid fa-arrow-turn-down" aria-hidden="true"></i>
        <span>Usar este texto</span>
      </button>
    `;
    card.querySelector(".use-suggestion-action").addEventListener("click", () => {
      messageInput.value = suggestion.text;
      handleMessageInputTyping();
      closeAiAssistModal();
    });
    aiAssistContent.appendChild(card);
  });
}

function renderSpellcheckResult(originalText, result) {
  if (!aiAssistContent) return;
  aiAssistContent.innerHTML = "";

  const corrected = result?.correctedText || originalText;
  const summary = document.createElement("article");
  summary.className = "ai-spell-summary";
  summary.innerHTML = `
    <div>
      <small>Texto corrigido</small>
      <p>${escapeHtml(corrected)}</p>
    </div>
    <button class="small-action" type="button">
      <i class="fa-solid fa-check" aria-hidden="true"></i>
      <span>Aplicar correção</span>
    </button>
  `;
  summary.querySelector("button").addEventListener("click", () => {
    messageInput.value = corrected;
    handleMessageInputTyping();
    closeAiAssistModal();
  });
  aiAssistContent.appendChild(summary);

  const errors = Array.isArray(result?.errors) ? result.errors : [];
  if (!errors.length) {
    const ok = document.createElement("div");
    ok.className = "ai-assist-ok";
    ok.innerHTML = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>Nenhum erro importante encontrado.</span>`;
    aiAssistContent.appendChild(ok);
    return;
  }

  const list = document.createElement("div");
  list.className = "ai-error-list";
  errors.forEach((error) => {
    const item = document.createElement("article");
    item.className = "ai-error-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(error.original || "Trecho")}</strong>
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        <span>${escapeHtml(error.correction || "Correção sugerida")}</span>
      </div>
      <p>${escapeHtml(error.explanation || "Ajuste sugerido pela IA.")}</p>
    `;
    list.appendChild(item);
  });
  aiAssistContent.appendChild(list);
}

function renderAiAssistError(message) {
  if (!aiAssistContent) return;
  aiAssistContent.innerHTML = `
    <div class="ai-assist-error">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

async function translateMessageText(text, language) {
  const result = await translateMessageTextResult(text, language);
  return result.text;
}

async function translateMessageTextResult(text, language, options = {}) {
  const clean = cleanMessageText(text);
  if (!clean || !language?.code) return { text: clean, provider: "" };
  if (!requireInternet("traduzir mensagens")) {
    throw new Error("Sem internet para traduzir.");
  }

  try {
    return {
      text: await translateMessageTextWithGemini(clean, language, options.onProgress),
      provider: "Gemini"
    };
  } catch (error) {
    console.warn("Gemini indisponível para tradução, tentando Pollinations.AI.", error);
  }

  const payload = {
    model: "openai",
    messages: [
      {
        role: "system",
        content: `Você é um tradutor de bate-papo. Traduza a mensagem do usuário para ${language.name}. Responda somente com a tradução, sem aspas, sem explicações e sem texto extra.`
      },
      {
        role: "user",
        content: clean
      }
    ],
    temperature: 0.1,
    max_tokens: 500,
    stream: false
  };

  try {
    const response = await fetch(POLLINATIONS_CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Resposta HTTP ${response.status}`);

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || data?.response || "";
    const translated = cleanAiText(content).replace(/^['"]|['"]$/g, "");
    if (translated) return { text: translated, provider: "Pollinations.AI" };
  } catch (error) {
    console.warn("Endpoint de tradução por chat indisponível, tentando endpoint simples.", error);
  }

  const params = new URLSearchParams({
    model: "openai",
    temperature: "0.1",
    system: `Traduza para ${language.name}. Responda somente com a tradução.`
  });
  const prompt = `Traduza a mensagem abaixo para ${language.name}. Responda somente com a tradução:\n\n${clean}`;
  try {
    const response = await fetch(`${POLLINATIONS_TEXT_ENDPOINT}${encodeURIComponent(prompt)}?${params.toString()}`);

    if (!response.ok) throw new Error(`Resposta HTTP ${response.status}`);

    const translated = cleanAiText(await response.text()).replace(/^['"]|['"]$/g, "");
    if (translated) return { text: translated, provider: "Pollinations.AI" };
    throw new Error("Tradução vazia.");
  } catch (error) {
    console.warn("Pollinations.AI indisponível para tradução.", error);
  }

  // MyMemory pode responder HTTP 200 mesmo quando entrega uma traducao
  // excessivamente literal. Use-o apenas como contingencia.
  try {
    return {
      text: await translateMessageTextWithMyMemory(clean, language),
      provider: "MyMemory"
    };
  } catch (error) {
    console.warn("MyMemory indisponível para tradução.", error);
  }

  throw new Error("Nenhum serviço de tradução está disponível no momento.");
}

async function translateMessageTextWithGemini(text, language, onProgress = null) {
  const endpoint = String(GEMINI_TRANSLATE_ENDPOINT || "").trim();
  const targetLanguageCode = sanitizeText(language?.code || "", 12).toLowerCase();
  const cleanText = cleanMessageText(text, 2000);

  if (!endpoint || !cleanText || !targetLanguageCode) {
    throw new Error("Gemini não está configurado para tradução.");
  }
  if (!currentFirebaseUser?.getIdToken) {
    throw new Error("Usuário Firebase indisponível para usar o Gemini.");
  }

  const idToken = await currentFirebaseUser.getIdToken(false);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), GEMINI_TRANSLATE_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream, application/json"
      },
      body: JSON.stringify({
        idToken,
        text: cleanText,
        targetLanguageCode,
        stream: true
      }),
      signal: controller.signal
    });

    if (response.ok && String(response.headers.get("Content-Type") || "").includes("text/event-stream")) {
      const translated = cleanAiText(await readGeminiEventStream(response, onProgress)).replace(/^['"]|['"]$/g, "");
      if (!translated) throw new Error("Gemini retornou uma tradução vazia.");
      return translated;
    }

    const data = await response.json().catch(() => ({ ok: false, error: "Resposta inválida do Gemini." }));

    if (!response.ok || data?.ok === false) {
      const errorParts = [data?.error, data?.details].filter(Boolean);
      const errorMessage = errorParts.join(" — ") || `Gemini respondeu HTTP ${response.status}`;
      console.warn("Gemini não traduziu; o AstroChat usará o próximo provedor.", {
        status: response.status,
        code: data?.code || "",
        upstreamStatus: data?.upstreamStatus || 0,
        modelsTried: data?.modelsTried || [],
        details: data?.details || ""
      });
      throw new Error(errorMessage);
    }

    const translated = cleanAiText(data?.text || "").replace(/^['"]|['"]$/g, "");
    if (!translated) throw new Error("Gemini retornou uma tradução vazia.");
    return translated;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function readGeminiEventStream(response, onProgress = null) {
  if (!response?.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = "";

  const consumeLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    try {
      const data = JSON.parse(payload);
      const chunk = (data?.candidates?.[0]?.content?.parts || []).map((part) => part?.text || "").join("");
      if (!chunk) return;
      result += chunk;
      if (typeof onProgress === "function") onProgress(result, chunk);
    } catch (error) {
      console.warn("Bloco SSE inválido recebido do Gemini.", error);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    lines.forEach(consumeLine);
    if (done) break;
  }
  if (buffer.trim()) consumeLine(buffer);
  return result;
}

async function translateMessageTextWithMyMemory(text, language) {
  const targetLanguageCode = sanitizeText(language?.code || "", 12).toLowerCase();
  const nativeLanguageCode = sanitizeText(getCurrentNativeLanguage()?.code || "pt", 12).toLowerCase();
  const sourceLanguageCode = nativeLanguageCode === targetLanguageCode ? "en" : nativeLanguageCode;
  const queryText = truncateUtf8Text(text, 500);

  if (!queryText || !targetLanguageCode) throw new Error("Texto ou idioma inválido para tradução.");

  const params = new URLSearchParams({
    q: queryText,
    langpair: `${sourceLanguageCode}|${targetLanguageCode}`,
    mt: "1"
  });
  const response = await fetch(`${MYMEMORY_TRANSLATE_ENDPOINT}?${params.toString()}`);
  if (!response.ok) throw new Error(`MyMemory respondeu HTTP ${response.status}`);

  const data = await response.json();
  const responseStatus = Number(data?.responseStatus || response.status);
  const translated = cleanAiText(data?.responseData?.translatedText || "").replace(/^['"]|['"]$/g, "");
  if (responseStatus !== 200 || !translated) {
    throw new Error(data?.responseDetails || "MyMemory retornou uma tradução vazia.");
  }
  return translated;
}

function truncateUtf8Text(text, maxBytes) {
  const value = String(text || "");
  if (new TextEncoder().encode(value).length <= maxBytes) return value;

  let result = "";
  for (const character of value) {
    if (new TextEncoder().encode(result + character).length > maxBytes) break;
    result += character;
  }
  return result.trim();
}

function getAiSystemPrompt(room) {
  if (isAiFriendRoom(room)) {
    const name = getAiAuthorName(room);
    const persona = sanitizeText(room.persona || room.description || DEFAULT_AI_FRIEND_PERSONA, 220);
    const nativeLanguage = getCurrentNativeLanguage();
    const roomLanguage = getRoomLanguage(room);
    return `Voce interpreta ${name}, a outra pessoa desta conversa privada.
Converse de forma natural, leve e presente, como uma conversa privada normal entre pessoas.
Personalidade definida pelo usuario: ${persona}.
Nao aja como professor, assistente generico ou bot de suporte, a menos que o usuario peca ajuda para estudar.
Responda sempre em ${nativeLanguage.name}, o idioma nativo do usuario.
Nao responda diretamente em ${roomLanguage?.name || "outro idioma"} so porque a sala usa traducao; o app vai traduzir sua mensagem depois.
Acompanhe o tom do usuario e evite respostas longas demais.`;
  }

  const activeDifficulties = getActiveAiDifficulties(room);
  const difficultyPrompt = activeDifficulties.length
    ? `\nDificuldades ativas do aluno:\n${activeDifficulties.map((difficulty, index) => `${index + 1}. ${difficulty.text}`).join("\n")}\nFoque nessas dificuldades ate o usuario marcar como concluida ou remover. Sempre que fizer sentido, conecte explicacoes, exemplos e correcoes a esses pontos.`
    : "";

  return `${AI_SYSTEM_PROMPT}${difficultyPrompt}`;
}

function createAiWelcomeMessage(room = null) {
  if (room) {
    const author = getAiAuthorName(room);
    return {
      id: createId("ai-welcome"),
      from: "ai",
      author,
      text: isAiFriendRoom(room)
        ? `Oi! Eu sou ${author}. Pode falar comigo como em uma conversa privada normal.`
        : "Ola! Eu sou seu professor de idiomas. Posso focar nas suas dificuldades e te ajudar com conversacao, correcao, vocabulario e pronuncia. Por onde comecamos?",
      time: Date.now()
    };
  }

  return {
    id: createId("ai-welcome"),
    from: "ai",
    author: AI_TEACHER_NAME,
    text: "Olá! Eu sou seu professor de idiomas. Posso te ajudar com inglês, espanhol, francês e outros idiomas. Você pode pedir: ‘corrija minha frase’, ‘crie um diálogo básico’, ‘me ensine vocabulário de viagem’ ou ‘vamos treinar conversação’. Por qual idioma começamos?",
    time: Date.now()
  };
}

async function handleAiRoomMessage(text) {
  const room = getActiveRoom();
  if (!room || !isAiRoom(room)) return;
  if (!requireInternet(getAiInternetActionLabel(room))) return;

  if (isAiFriendRoom(room)) {
    await handleAiFriendRoomMessage(room, text);
    return;
  }

  const replyPayload = getReplyPayloadForMessage();
  const aiAuthor = getAiAuthorName(room);
  addMessage(room.id, {
    from: "me",
    author: currentUser?.nick || "Você",
    text,
    replyTo: replyPayload,
    time: Date.now()
  });
  clearReplyTarget();

  setAiLoading(true);
  appendAiTypingIndicator(room.id);

  try {
    const reply = await requestLanguageAiReply(room);
    removeAiTypingIndicator(room.id);
    addMessage(room.id, {
      from: "ai",
      author: aiAuthor,
      text: reply,
      aiProvider: "Pollinations.AI",
      time: Date.now()
    });
  } catch (error) {
    console.warn("Erro ao consultar Pollinations.ai", error);
    removeAiTypingIndicator(room.id);
    const fallbackText = isAiTeacherRoom(room)
      ? "Nao consegui acessar a Pollinations.ai agora. Verifique sua conexao e tente novamente. Enquanto isso, uma boa pratica e escrever uma frase simples no idioma que voce quer estudar e depois pedir correcao quando a conexao voltar."
      : "Nao consegui acessar a Pollinations.ai agora. Verifique sua conexao e tente novamente em instantes.";
    addMessage(room.id, {
      from: "ai",
      author: aiAuthor,
      text: fallbackText,
      time: Date.now()
    });
    return;
    addMessage(room.id, {
      from: "ai",
      author: aiAuthor,
      text: "Não consegui acessar a Pollinations.ai agora. Verifique sua conexão e tente novamente. Enquanto isso, uma boa prática é escrever uma frase simples no idioma que você quer estudar e depois pedir correção quando a conexão voltar.",
      time: Date.now()
    });
  } finally {
    setAiLoading(false);
  }
}

async function handleAiFriendRoomMessage(room, text) {
  const replyPayload = getReplyPayloadForMessage();
  const aiAuthor = getAiAuthorName(room);
  const language = getRoomLanguage(room);
  const shouldTranslate = Boolean(language?.code);

  // Mantém o texto original disponível para o contexto da IA. A tradução é
  // iniciada somente depois que o Pollinations termina de criar a resposta.
  const userMessage = addLocalAiMessage(room, {
    from: "me",
    author: currentUser?.nick || "Voce",
    text,
    replyTo: replyPayload,
    skipTranslation: shouldTranslate
  });
  clearReplyTarget();

  setAiLoading(true);
  appendAiTypingIndicator(room.id);

  try {
    const reply = cleanMessageText(await requestLanguageAiReply(room));
    removeAiTypingIndicator(room.id);

    if (shouldTranslate && userMessage?.id) {
      startLocalAiMessageTranslation(room, userMessage, text, language);
    }

    addLocalAiMessage(room, {
      from: "ai",
      author: aiAuthor,
      text: reply || "Nao consegui montar uma resposta agora.",
      aiProvider: "Pollinations.AI"
    });
  } catch (error) {
    console.warn("Erro ao consultar amigo IA.", error);
    removeAiTypingIndicator(room.id);
    addLocalAiMessage(room, {
      from: "ai",
      author: aiAuthor,
      text: "Nao consegui responder agora. Verifique sua conexao e tente novamente em instantes.",
      skipTranslation: shouldTranslate
    });
  } finally {
    setAiLoading(false);
  }
}

function startLocalAiMessageTranslation(room, message, sourceText, language = getRoomLanguage(room)) {
  const cleanSourceText = cleanMessageText(sourceText, 2000);
  if (!room?.id || !message?.id || !language?.code || !cleanSourceText) return;

  updateLocalAiMessage(room.id, message.id, {
    text: PUBLIC_TRANSLATION_PENDING_TEXT,
    originalText: "",
    translatedText: "",
    translationProvider: "",
    translationSourceText: cleanSourceText,
    targetLanguageCode: language.code || "",
    targetLanguageName: language.name || "",
    translationDisabled: false,
    translationStatus: "pending",
    translationError: false,
    deliveryStatus: "processing",
    processingType: MESSAGE_PROCESSING_TRANSLATION
  });

  translateLocalAiMessage(room.id, message.id, cleanSourceText, language);
}

async function requestAiFriendReplyBundle(room, latestUserText, language) {
  if (!language?.code) {
    return { replyText: await requestLanguageAiReply(room) };
  }

  const nativeLanguage = getCurrentNativeLanguage();
  const messages = buildAiMessages(room);
  const bundleInstruction = `Retorne somente JSON valido, sem markdown, neste formato:
{"replyText":"resposta natural em ${nativeLanguage.name}","replyTranslatedText":"traducao da resposta para ${language.name}","userTranslatedText":"traducao desta ultima mensagem do usuario para ${language.name}"}
Ultima mensagem do usuario: ${cleanMessageText(latestUserText, 1000)}`;

  if (messages[0]?.role === "system") {
    messages[0] = {
      ...messages[0],
      content: `${messages[0].content}\n\n${bundleInstruction}`
    };
  } else {
    messages.unshift({ role: "system", content: bundleInstruction });
  }

  try {
    const response = await fetch(POLLINATIONS_CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai",
        messages,
        temperature: 0.7,
        max_tokens: 850,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Resposta HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || data?.response || "";
    const parsed = parseJsonFromAi(content);
    const bundle = normalizeAiFriendReplyBundle(parsed);
    if (bundle.replyText) return bundle;
  } catch (error) {
    console.warn("Resposta traduzida do amigo IA indisponivel, tentando resposta simples.", error);
  }

  return {
    replyText: await requestLanguageAiReply(room),
    replyTranslatedText: "",
    userTranslatedText: ""
  };
}

function normalizeAiFriendReplyBundle(value = {}) {
  const replyText = cleanMessageText(
    value?.replyText ||
    value?.reply ||
    value?.message ||
    value?.resposta ||
    "",
    1000
  );
  const replyTranslatedText = cleanMessageText(
    value?.replyTranslatedText ||
    value?.translatedReply ||
    value?.replyTranslation ||
    value?.translatedText ||
    value?.traducaoResposta ||
    value?.respostaTraduzida ||
    "",
    1000
  );
  const userTranslatedText = cleanMessageText(
    value?.userTranslatedText ||
    value?.latestUserTranslation ||
    value?.userTranslation ||
    value?.translatedUserText ||
    value?.traducaoUsuario ||
    value?.mensagemUsuarioTraduzida ||
    "",
    1000
  );

  return {
    replyText,
    replyTranslatedText,
    userTranslatedText
  };
}

async function requestLanguageAiReply(room) {
  if (!requireInternet(getAiInternetActionLabel(room))) {
    throw new Error("Sem internet para usar a IA.");
  }

  const payload = {
    model: "openai",
    messages: buildAiMessages(room),
    temperature: 0.7,
    max_tokens: 650,
    stream: false
  };

  try {
    const response = await fetch(POLLINATIONS_CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Resposta HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || data?.response || "";
    const cleaned = cleanAiText(content);
    if (cleaned) return cleaned;
  } catch (error) {
    console.warn("Endpoint de chat indisponível, tentando endpoint simples.", error);
  }

  return requestLanguageAiReplyFallback(room);
}

async function requestLanguageAiReplyFallback(room) {
  if (!requireInternet(getAiInternetActionLabel(room))) {
    throw new Error("Sem internet para usar a IA.");
  }

  const params = new URLSearchParams({
    model: "openai",
    temperature: "0.7",
    system: getAiSystemPrompt(room)
  });
  const prompt = buildPlainAiPrompt(room);
  const response = await fetch(`${POLLINATIONS_TEXT_ENDPOINT}${encodeURIComponent(prompt)}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Resposta HTTP ${response.status}`);
  }

  const text = await response.text();
  const cleaned = cleanAiText(text);
  if (!cleaned) throw new Error("Resposta vazia da IA.");
  return cleaned;
}

function buildAiMessages(room) {
  const studentName = currentUser?.nick || "aluno";
  const recentMessages = room.messages
    .filter((message) => message.from === "me" || message.from === "ai")
    .slice(-12)
    .map((message) => ({
      role: message.from === "me" ? "user" : "assistant",
      content: getAiPromptMessageText(message, room)
    }));

  return [
    {
      role: "system",
      content: `${getAiSystemPrompt(room)}\nNome do usuario: ${studentName}.`
    },
    ...recentMessages
  ];
}

function getAiPromptMessageText(message, room) {
  if (!isAiFriendRoom(room)) return message?.text || "";

  return cleanMessageText(
    message?.translationSourceText ||
    message?.originalText ||
    message?.text ||
    message?.translatedText ||
    ""
  );
}

function buildPlainAiPrompt(room) {
  const studentName = currentUser?.nick || "aluno";
  const aiName = getAiAuthorName(room);
  const history = room.messages
    .filter((message) => message.from === "me" || message.from === "ai")
    .slice(-10)
    .map((message) => `${message.from === "me" ? studentName : aiName}: ${getAiPromptMessageText(message, room)}`)
    .join("\n");

  return `${getAiSystemPrompt(room)}\nNome do usuario: ${studentName}\nHistorico recente:\n${history}\n\nResponda a ultima mensagem do usuario mantendo as instrucoes do sistema.`;

  return `Nome do aluno: ${studentName}\nHistórico recente:\n${history}\n\nResponda como professor de idiomas à última mensagem do aluno.`;
}

function setMessageSending(isSending, label = "Enviando") {
  if (isAiRoom(getActiveRoom())) return;

  messageInput.disabled = isSending;
  sendButton.disabled = isSending;
  setComposerAiButtonsDisabled(isSending);
  sendButton.classList.toggle("is-loading", isSending);
  sendButton.innerHTML = isSending
    ? `<span>${escapeHtml(label)}</span><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>`
    : `<span>Enviar</span><i class="fa-solid fa-paper-plane" aria-hidden="true"></i>`;
}

function setAiLoading(isLoading) {
  aiReplyInProgress = isLoading;
  const activeRoom = getActiveRoom();
  if (!isAiRoom(activeRoom)) return;

  messageInput.disabled = isLoading;
  sendButton.disabled = isLoading;
  setComposerAiButtonsDisabled(isLoading);
  sendButton.classList.toggle("is-loading", isLoading);
  sendButton.innerHTML = isLoading
    ? `<span>Enviando</span><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>`
    : `<span>Enviar</span><i class="fa-solid fa-paper-plane" aria-hidden="true"></i>`;
}

function appendAiTypingIndicator(roomId = activeRoomId) {
  removeAiTypingIndicator(roomId);

  const row = document.createElement("div");
  const bubble = document.createElement("div");
  const author = document.createElement("span");
  const dots = document.createElement("div");

  row.id = "typingIndicator";
  row.className = "message-row received typing-row";
  row.dataset.roomId = roomId || "";
  bubble.className = "bubble typing-bubble";
  author.className = "author-label";
  author.textContent = getAiAuthorName(getRoomById(roomId) || getActiveRoom());
  dots.className = "typing-dots";
  dots.innerHTML = "<span></span><span></span><span></span>";

  bubble.append(author, dots);
  row.appendChild(bubble);
  messages.appendChild(row);
  scrollMessagesToBottom();
}

function removeAiTypingIndicator(roomId = "") {
  const typingIndicator = document.querySelector("#typingIndicator");
  if (!typingIndicator) return;
  if (roomId && typingIndicator.dataset.roomId !== roomId) return;
  typingIndicator.remove();
}

function getRoomMetadataSignature(roomId, data = {}) {
  const memberNicks = data.memberNicks || {};
  const memberUids = data.memberUids || {};
  const invitedUids = data.invitedUids || {};
  const invitedNicks = data.invitedNicks || {};
  return JSON.stringify({
    id: roomId || "",
    type: data.type || "",
    name: data.name || "",
    description: data.description || "",
    languageCode: data.languageCode || "",
    languageName: data.languageName || "",
    translationEnabled: Boolean(data.translationEnabled),
    private: Boolean(data.private),
    ownerUid: data.ownerUid || "",
    ownerNick: data.ownerNick || "",
    ownerAvatarIcon: data.ownerAvatarIcon || "",
    memberUids,
    memberNicks,
    memberAvatarIcons: data.memberAvatarIcons || {},
    invitedUids,
    invitedNicks,
    lastMessage: data.lastMessage || "",
    lastMessageId: data.lastMessageId || "",
    lastOriginalMessage: data.lastOriginalMessage || "",
    lastMessageAuthorUid: data.lastMessageAuthorUid || "",
    lastMessageAuthorNick: data.lastMessageAuthorNick || "",
    lastMessageMentionedUids: data.lastMessageMentionedUids || {},
    lastMessageMentionedNicks: data.lastMessageMentionedNicks || [],
    lastMessageAtMillis: Number(data.lastMessageAtMillis || 0),
    updatedAtMillis: Number(data.updatedAtMillis || 0),
    createdAtMillis: Number(data.createdAtMillis || 0)
  });
}

function mapRoomSnapshot(roomSnapshot) {
  const data = roomSnapshot.val() || {};
  const roomId = roomSnapshot.key;
  let messagesForRoom = roomMessagesById.get(roomId) || [];
  const snapshotMessages = mapRoomMessagesFromData(data.messages);

  if (snapshotMessages.length) {
    const currentLastId = messagesForRoom.at(-1)?.id || "";
    const snapshotLastId = snapshotMessages.at(-1)?.id || "";
    const mergedSnapshotMessages = mergeQueuedMessagesForRoom(roomId, snapshotMessages);

    if (!messagesForRoom.length || currentLastId !== snapshotLastId || mergedSnapshotMessages.length > messagesForRoom.length) {
      messagesForRoom = mergedSnapshotMessages;
      roomMessagesById.set(roomId, messagesForRoom);
    }
  }

  return {
    id: roomId,
    type: data.type || USER_ROOM_TYPE,
    name: data.name || "Sala sem nome",
    avatar: data.avatar || getInitials(data.name || "Sala"),
    description: data.description || "",
    languageCode: data.languageCode || "",
    languageName: data.languageName || "",
    translationEnabled: Boolean(data.translationEnabled),
    color: data.color || getGradientByText(data.name || roomId),
    ownerUid: data.ownerUid || "",
    ownerNick: data.ownerNick || "",
    ownerAvatarIcon: getSafeSpaceAvatarIcon(data.ownerAvatarIcon),
    memberUids: objectKeys(data.memberUids),
    memberNicks: objectValues(data.memberNicks),
    memberNickMap: data.memberNicks || {},
    memberAvatarIconMap: data.memberAvatarIcons || {},
    members: objectValues(data.memberNicks),
    private: Boolean(data.private || data.type === PRIVATE_ROOM_TYPE),
    invitedUids: objectKeys(data.invitedUids),
    invitedNicks: objectValues(data.invitedNicks),
    lastMessage: data.lastMessage || "",
    lastMessageId: data.lastMessageId || "",
    lastOriginalMessage: data.lastOriginalMessage || "",
    lastMessageAuthorUid: data.lastMessageAuthorUid || "",
    lastMessageAuthorNick: data.lastMessageAuthorNick || "",
    lastMessageMentionedUids: normalizeMentionUidMap(data.lastMessageMentionedUids),
    lastMessageMentionedNicks: normalizeMentionNickList(data.lastMessageMentionedNicks),
    lastMessageAt: getRealtimeMillis(data.lastMessageAt, data.lastMessageAtMillis || data.createdAtMillis || Date.now()),
    createdAt: getRealtimeMillis(data.createdAt, data.createdAtMillis || Date.now()),
    updatedAt: getRealtimeMillis(data.updatedAt, data.updatedAtMillis || data.createdAtMillis || Date.now()),
    messages: messagesForRoom
  };
}

function mapRoomMessagesFromData(messagesData) {
  if (!messagesData || typeof messagesData !== "object") return [];

  return Object.entries(messagesData)
    .map(([messageId, data]) => mapMessageData(messageId, data || {}))
    .sort(compareMessagesBySendOrder);
}

function mapInviteSnapshot(inviteSnapshot) {
  const data = inviteSnapshot.val() || {};
  return {
    id: inviteSnapshot.key,
    type: data.type || data.kind || "room-invite",
    kind: data.kind || data.type || "room-invite",
    roomId: data.roomId || "",
    roomName: data.roomName || (data.type === FRIEND_REQUEST_TYPE || data.kind === FRIEND_REQUEST_TYPE ? "Pedido de amizade" : "Sala"),
    fromUid: data.fromUid || "",
    fromNick: data.fromNick || "Usuário",
    fromAvatarIcon: getSafeSpaceAvatarIcon(data.fromAvatarIcon),
    toUid: data.toUid || "",
    toNick: data.toNick || "Usuário",
    toAvatarIcon: getSafeSpaceAvatarIcon(data.toAvatarIcon),
    status: data.status || "pendente",
    wantsPrivateChat: data.wantsPrivateChat !== false,
    privateLanguageCode: data.privateLanguageCode || "",
    privateLanguageName: data.privateLanguageName || "",
    createdAt: getRealtimeMillis(data.createdAt, data.createdAtMillis || Date.now()),
    updatedAt: getRealtimeMillis(data.updatedAt, data.updatedAtMillis || Date.now())
  };
}

function mapMessageSnapshot(messageSnapshot) {
  const data = messageSnapshot.val() || {};
  return mapMessageData(messageSnapshot.key, data);
}

function mapMessageData(messageId, data = {}) {
  const clientTime = Number(data.createdAtMillis || data.time || 0);
  const serverTime = getRealtimeMillis(data.createdAt, Number(data.serverTime || 0));
  const displayTime = serverTime || clientTime || Date.now();

  return {
    id: messageId,
    letter: normalizeLetterPayload(data.letter),
    letterLocationRequest: normalizeLetterLocationRequest(data.letterLocationRequest),
    text: normalizeStoredMessageText(data.text || ""),
    originalText: normalizeStoredMessageText(data.originalText || ""),
    translatedText: normalizeStoredMessageText(data.translatedText || ""),
    translationProvider: sanitizeText(data.translationProvider || "", 32),
    aiProvider: sanitizeText(data.aiProvider || "", 32),
    translationSourceText: data.translationSourceText || "",
    targetLanguageCode: data.targetLanguageCode || "",
    targetLanguageName: data.targetLanguageName || "",
    learningTest: Boolean(data.learningTest),
    learningFeedbackStatus: data.learningFeedbackStatus || "",
    processingType: getSafeMessageProcessingType(data.processingType),
    translationDisabled: Boolean(data.translationDisabled),
    learningFeedback: normalizeLearningFeedback(data.learningFeedback),
    translationError: Boolean(data.translationError),
    translationStatus: data.translationStatus || "",
    deliveryStatus: data.deliveryStatus || "",
    deliveryError: data.deliveryError || "",
    pendingOffline: Boolean(data.pendingOffline),
    localPending: Boolean(data.localPending),
    localOnly: Boolean(data.localOnly),
    forwarded: Boolean(data.forwarded),
    forwardedAt: getRealtimeMillis(data.forwardedAt, data.forwardedAtMillis || 0),
    forwardedAtMillis: Number(data.forwardedAtMillis || 0),
    forwardedByUid: data.forwardedByUid || "",
    forwardedByNick: data.forwardedByNick || "",
    forwardedFromRoomId: data.forwardedFromRoomId || "",
    forwardedFromRoomName: data.forwardedFromRoomName || "",
    forwardedOriginalMessageId: data.forwardedOriginalMessageId || "",
    forwardedOriginalAuthorNick: data.forwardedOriginalAuthorNick || "",
    edited: Boolean(data.edited),
    editedAt: getRealtimeMillis(data.editedAt, data.editedAtMillis || 0),
    editedAtMillis: Number(data.editedAtMillis || 0),
    editedByUid: data.editedByUid || "",
    editedByNick: data.editedByNick || "",
    deliveredBy: normalizeMessageReceipts(data.deliveredBy),
    readBy: normalizeMessageReceipts(data.readBy),
    mentionedUids: normalizeMentionUidMap(data.mentionedUids),
    mentionedNicks: normalizeMentionNickList(data.mentionedNicks),
    mentions: normalizeMentions(data.mentions),
    replyTo: data.replyTo || null,
    reactions: normalizeMessageReactions(data.reactions),
    hydration: normalizeMessageHydration(data.hydration),
    hydrations: normalizeMessageHydrations(data.hydrations),
    authorUid: data.authorUid || "",
    authorNick: data.authorNick || data.author || "Usuário",
    author: data.authorNick || data.author || "Usuário",
    authorAvatar: data.authorAvatar || getInitials(data.authorNick || "Usuário"),
    authorAvatarIcon: getSafeSpaceAvatarIcon(data.authorAvatarIcon),
    time: displayTime,
    clientTime: clientTime || displayTime,
    serverTime,
    createdAt: displayTime,
    createdAtMillis: clientTime || displayTime
  };
}

function normalizeStoredMessageText(value) {
  const text = String(value || "");
  if (!/<\/?[a-z][^>]*>/i.test(text) && !/&(?:lt|gt|amp|quot|#39);/i.test(text)) return text;
  const template = document.createElement("template");
  template.innerHTML = text;
  return (template.content.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

function compareMessagesBySendOrder(a, b) {
  const idA = String(a?.id || "");
  const idB = String(b?.id || "");
  const serverTimeA = getMessageServerSortTime(a);
  const serverTimeB = getMessageServerSortTime(b);
  if (serverTimeA && serverTimeB && serverTimeA !== serverTimeB) {
    return serverTimeA - serverTimeB;
  }
  if (isFirebasePushMessageId(idA) && isFirebasePushMessageId(idB) && idA !== idB) {
    return idA.localeCompare(idB);
  }
  const timeDifference = getMessageSortTime(a) - getMessageSortTime(b);
  if (timeDifference) return timeDifference;
  return idA.localeCompare(idB);
}

function getMessageServerSortTime(message) {
  const directServerTime = Number(message?.serverTime || 0);
  if (Number.isFinite(directServerTime) && directServerTime > 0) return directServerTime;
  const realtimeServerTime = getRealtimeMillis(message?.createdAt, 0);
  return Number.isFinite(realtimeServerTime) && realtimeServerTime > 0 ? realtimeServerTime : 0;
}

function isFirebasePushMessageId(value) {
  return /^-[A-Za-z0-9_-]{19}$/.test(String(value || ""));
}

function getMessageSortTime(message) {
  if (!message) return 0;

  const clientOrderTime = Number(message.createdAtMillis || message.clientTime || message.time || 0);
  if (Number.isFinite(clientOrderTime) && clientOrderTime > 0) return clientOrderTime;

  const serverTime = Number(message.serverTime || 0);
  if (Number.isFinite(serverTime) && serverTime > 0) return serverTime;

  const createdAt = getRealtimeMillis(message.createdAt, 0);
  if (createdAt) return createdAt;

  return 0;
}


function normalizeMessageReactions(reactions) {
  if (!reactions || typeof reactions !== "object") return {};

  return Object.fromEntries(
    Object.entries(reactions)
      .filter(([, reaction]) => reaction)
      .map(([uid, reaction]) => [
        uid,
        typeof reaction === "string"
          ? { emoji: reaction, nick: "", time: 0 }
          : {
            emoji: reaction.emoji || "",
            nick: reaction.nick || "",
            time: getRealtimeMillis(reaction.createdAt, reaction.time || 0)
          }
      ])
      .filter(([, reaction]) => reaction.emoji)
  );
}

function normalizeMessageReceipts(receipts) {
  if (!receipts || typeof receipts !== "object") return {};

  return Object.fromEntries(
    Object.entries(receipts)
      .filter(([uid, receipt]) => uid && receipt)
      .map(([uid, receipt]) => [
        uid,
        typeof receipt === "number"
          ? { uid, atMillis: receipt }
          : {
            uid: receipt.uid || uid,
            nick: receipt.nick || "",
            atMillis: Number(receipt.atMillis || receipt.time || 0)
          }
      ])
  );
}

function normalizeMentionUidMap(value) {
  if (!value) return {};
  if (Array.isArray(value)) {
    return value.reduce((map, uid) => {
      const key = String(uid || "").trim();
      if (key) map[key] = true;
      return map;
    }, {});
  }
  if (typeof value !== "object") return parseMentionedUids(value);

  return Object.entries(value).reduce((map, [uid, enabled]) => {
    if (uid && enabled) map[uid] = true;
    return map;
  }, {});
}

function normalizeMentionNickList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return unique(value.map((nick) => sanitizeText(nick, 32)).filter(Boolean));
  if (typeof value === "object") return unique(Object.values(value).map((nick) => sanitizeText(nick, 32)).filter(Boolean));
  return unique(String(value).split(",").map((nick) => sanitizeText(nick, 32)).filter(Boolean));
}

function normalizeMentions(value) {
  if (!value || typeof value !== "object") return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([uid, mention]) => uid && mention)
      .map(([uid, mention]) => [
        uid,
        typeof mention === "string"
          ? { uid, nick: sanitizeText(mention, 32) }
          : {
            uid: mention.uid || uid,
            nick: sanitizeText(mention.nick || mention.name || "", 32)
          }
      ])
      .filter(([, mention]) => mention.nick)
  );
}


function normalizeMessageHydration(hydration) {
  if (!hydration || typeof hydration !== "object" || !hydration.text) return null;

  return {
    text: cleanMessageText(hydration.text, 1000),
    sourceText: cleanMessageText(hydration.sourceText || "", 1000),
    hydratedByUid: hydration.hydratedByUid || "",
    hydratedByNick: hydration.hydratedByNick || "",
    time: getRealtimeMillis(hydration.createdAt, hydration.createdAtMillis || hydration.time || 0)
  };
}

function normalizeMessageHydrations(hydrations) {
  if (!hydrations || typeof hydrations !== "object") return {};

  return Object.fromEntries(
    Object.entries(hydrations)
      .filter(([, hydration]) => hydration && typeof hydration === "object" && hydration.text)
      .map(([uid, hydration]) => [
        uid,
        {
          text: cleanMessageText(hydration.text, 1000),
          sourceText: cleanMessageText(hydration.sourceText || "", 1000),
          hydratedByUid: hydration.hydratedByUid || uid,
          hydratedByNick: hydration.hydratedByNick || "",
          time: getRealtimeMillis(hydration.createdAt, hydration.createdAtMillis || hydration.time || 0)
        }
      ])
  );
}

function getRealtimeMillis(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback !== undefined ? fallback : Date.now();
  }
  if (typeof value === "number") return value;
  if (value.seconds) return value.seconds * 1000;
  return fallback !== undefined ? fallback : Date.now();
}

function objectKeys(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return Object.keys(value).filter((key) => value[key]);
}

function objectValues(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return Object.values(value).filter(Boolean);
}

function createEmptyState(iconClass, title, description) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.innerHTML = `
    <i class="${iconClass}" aria-hidden="true"></i>
    <strong>${escapeHtml(title)}</strong>
    <span>${escapeHtml(description)}</span>
  `;
  return empty;
}

function createActionButton(className, iconClass, label) {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i><span>${escapeHtml(label)}</span>`;
  return button;
}

function isAiRoom(room) {
  return room?.type === AI_ROOM_TYPE;
}

function getAiMode(room) {
  if (!isAiRoom(room)) return "";
  return room.aiMode === AI_FRIEND_MODE ? AI_FRIEND_MODE : AI_TEACHER_MODE;
}

function isAiTeacherRoom(room) {
  return isAiRoom(room) && getAiMode(room) === AI_TEACHER_MODE;
}

function isAiFriendRoom(room) {
  return isAiRoom(room) && getAiMode(room) === AI_FRIEND_MODE;
}

function getAiAuthorName(room) {
  return isAiFriendRoom(room) ? getRoomDisplayName(room) : AI_TEACHER_NAME;
}

function getAiInternetActionLabel(room) {
  return `conversar com ${getRoomDisplayName(room) || "a IA"}`;
}

function normalizeLocalAiRoom(room) {
  if (!room || room.type !== AI_ROOM_TYPE) return room;

  const mode = room.aiMode === AI_FRIEND_MODE ? AI_FRIEND_MODE : AI_TEACHER_MODE;
  const name = sanitizeText(room.name || (mode === AI_FRIEND_MODE ? "Amigo IA" : AI_TEACHER_NAME), 32);
  const normalizedRoom = {
    ...room,
    type: AI_ROOM_TYPE,
    aiMode: mode,
    name,
    ownerNick: room.ownerNick || "",
    messages: Array.isArray(room.messages) ? room.messages : []
  };

  if (mode === AI_TEACHER_MODE) {
    normalizedRoom.name = AI_TEACHER_NAME;
    normalizedRoom.avatar = "IA";
    normalizedRoom.aiDifficulties = normalizeAiDifficulties(room.aiDifficulties);
  } else {
    normalizedRoom.avatar = room.avatar || getInitials(name);
    normalizedRoom.avatarIcon = getSafeSpaceAvatarIcon(room.avatarIcon || "fa-solid fa-robot");
    normalizedRoom.persona = sanitizeText(room.persona || room.description || DEFAULT_AI_FRIEND_PERSONA, 220) || DEFAULT_AI_FRIEND_PERSONA;
    normalizedRoom.description = normalizedRoom.persona;
    normalizedRoom.translationEnabled = Boolean(normalizedRoom.languageCode);
  }

  return normalizedRoom;
}

function normalizeAiDifficulties(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const text = sanitizeText(typeof item === "string" ? item : item?.text, 120);
      if (!text) return null;
      const status = item?.status === AI_DIFFICULTY_DONE ? AI_DIFFICULTY_DONE : AI_DIFFICULTY_ACTIVE;
      return {
        id: sanitizeText(item?.id || createId("diff"), 80),
        text,
        status,
        createdAt: Number(item?.createdAt || Date.now()),
        completedAt: status === AI_DIFFICULTY_DONE ? Number(item?.completedAt || Date.now()) : 0
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function getActiveAiDifficulties(room) {
  return normalizeAiDifficulties(room?.aiDifficulties || []).filter((difficulty) => difficulty.status !== AI_DIFFICULTY_DONE);
}

function getDoneAiDifficulties(room) {
  return normalizeAiDifficulties(room?.aiDifficulties || []).filter((difficulty) => difficulty.status === AI_DIFFICULTY_DONE);
}

function isLearningTestMessage(message) {
  return Boolean(message?.learningTest || message?.translationDisabled);
}

function getAiRoomId(nick) {
  const slug = normalize(nick).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "usuario";
  return `ai-room-${slug}`;
}

function getAiFriendRoomId(ownerNick, friendName) {
  const ownerSlug = normalize(ownerNick).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "usuario";
  const friendSlug = normalize(friendName).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "amigo";
  return `ai-friend-${ownerSlug}-${friendSlug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function cleanMessageText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 2000);
}

function cleanAiText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 4000);
}

function truncateText(value, maxLength = 120) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text;
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}


function getPendingReceivedInvites() {
  return invites.filter((invite) => invite.status === "pendente" && invite.toUid === currentFirebaseUid);
}

function normalizeNotificationState(value = {}) {
  return {
    seenInviteIds: Array.isArray(value.seenInviteIds) ? value.seenInviteIds : [],
    countedMessageKeys: Array.isArray(value.countedMessageKeys) ? value.countedMessageKeys : [],
    notifiedMessageKeys: Array.isArray(value.notifiedMessageKeys) ? value.notifiedMessageKeys : [],
    lastSeenByRoom: value.lastSeenByRoom && typeof value.lastSeenByRoom === "object" ? value.lastSeenByRoom : {},
    lastSeenMessageIdByRoom: value.lastSeenMessageIdByRoom && typeof value.lastSeenMessageIdByRoom === "object" ? value.lastSeenMessageIdByRoom : {},
    unreadByRoom: value.unreadByRoom && typeof value.unreadByRoom === "object" ? value.unreadByRoom : {}
  };
}

function handleInviteNotifications() {
  if (!currentFirebaseUid) return;

  const pending = getPendingReceivedInvites();
  const seen = new Set(notificationState.seenInviteIds || []);
  const fresh = pending.filter((invite) => !seen.has(invite.id));

  if (!fresh.length) {
    updateBadges();
    return;
  }

  fresh.forEach((invite) => {
    const isFriendRequest = isFriendRequestInvite(invite);
    const title = isFriendRequest ? "Novo pedido de amizade" : "Novo convite recebido";
    const body = isFriendRequest
      ? `${invite.fromNick} quer adicionar você como amigo.`
      : `${invite.fromNick} convidou você para ${invite.roomName}.`;
    if (areInternalPushNotificationsEnabled()) {
      showToast(
        title,
        body,
        "Ver pedidos",
        () => {
          openNotificationsModal();
        }
      );
    }
    const systemNotificationPromise = showBrowserNotification(title, body, { tag: `invite:${invite.id}` });
    playNotificationSoundAfterSystemNotification(systemNotificationPromise);
    seen.add(invite.id);
  });

  notificationState.seenInviteIds = Array.from(seen).slice(-100);
  saveNotificationState();
  updateBadges();
}

function handleRoomMessageNotification(room, options = {}) {
  if (!room || isAiRoom(room) || !currentFirebaseUid) return;

  const lastMessageAt = Number(room.lastMessageAt || 0);
  if (!lastMessageAt) return;

  if (isRoomCurrentlyVisible(room.id)) {
    markRoomAsRead(room);
    return;
  }

  if (room.lastMessageAuthorUid === currentFirebaseUid) {
    markRoomAsRead(room);
    return;
  }

  if (isRoomMessageAlreadyRead(room, lastMessageAt)) return;

  const key = getMessageNotificationKey({
    roomId: room.id,
    messageId: room.lastMessageId,
    lastMessageAt,
    authorUid: room.lastMessageAuthorUid
  });
  markMessageAsUnreadOnce(room.id, key);
  const wasAlreadyNotified = wasMessageNotificationShown(key);
  const isInitialSnapshot = options.initialSnapshot === true;
  const isRecentInitialSnapshot = isInitialSnapshot && Date.now() - lastMessageAt < 10 * 60 * 1000;

  if (!wasAlreadyNotified && (!isInitialSnapshot || isRecentInitialSnapshot)) {
    const author = room.lastMessageAuthorNick || "Alguém";
    const text = truncateText(room.lastMessage || "Nova mensagem", 120);
    const wasMentioned = isCurrentUserMentionedInRoomLastMessage(room);
    const title = wasMentioned
      ? `${author} mencionou você em ${getRoomDisplayName(room)}`
      : `Nova mensagem de ${author}`;
    const body = wasMentioned
      ? text
      : `${getRoomDisplayName(room)}: ${text}`;
    if (areInternalPushNotificationsEnabled()) {
      showToast(
        title,
        body,
        "Abrir",
        () => openRoomFromNotification(room.id)
      );
    }
    const systemNotificationPromise = showBrowserNotification(title, body, {
      tag: key,
      roomId: room.id,
      mentioned: wasMentioned
    });
    playNotificationSoundAfterSystemNotification(systemNotificationPromise, wasMentioned ? "mention" : "default");
    markMessageNotificationShown(key);
  }

  refreshNotificationUi();
}

function getMessageNotificationKey({ roomId, messageId = "", lastMessageAt = "", authorUid = "" } = {}) {
  return `${roomId || "room"}:${messageId || lastMessageAt || "message"}:${authorUid || "user"}`;
}

function isRoomMessageAlreadyRead(room, lastMessageAt = 0) {
  if (!room?.id) return true;

  const lastMessageId = room.lastMessageId || room.messages?.at(-1)?.id || "";
  if (lastMessageId) {
    const lastSeenMessageId = notificationState.lastSeenMessageIdByRoom?.[room.id] || "";
    if (lastSeenMessageId) return lastSeenMessageId === lastMessageId;
  }

  const lastSeen = Number(notificationState.lastSeenByRoom?.[room.id] || 0);
  return Number(lastMessageAt || 0) <= lastSeen;
}

function markMessageAsUnreadOnce(roomId, key) {
  if (!roomId || !key) return false;

  const counted = new Set(notificationState.countedMessageKeys || []);
  if (counted.has(key)) return false;

  notificationState.unreadByRoom[roomId] = Math.max(1, Number(notificationState.unreadByRoom?.[roomId] || 0) + 1);
  counted.add(key);
  notificationState.countedMessageKeys = Array.from(counted).slice(-300);
  return true;
}

function wasMessageNotificationShown(key) {
  return Boolean(key && new Set(notificationState.notifiedMessageKeys || []).has(key));
}

function markMessageNotificationShown(key) {
  if (!key) return;

  const notified = new Set(notificationState.notifiedMessageKeys || []);
  notified.add(key);
  notificationState.notifiedMessageKeys = Array.from(notified).slice(-300);
}

function refreshNotificationUi() {
  saveNotificationState();
  updateBadges();
  renderRoomList(searchInput.value);
  refreshNotificationsModalIfOpen();
}

function handleForegroundFcmNotification(payload = {}, options = {}) {
  const data = payload?.data || {};
  const type = String(data.type || "").trim();

  if (type === "chat-message") {
    handleForegroundFcmChatMessage(payload, options);
    return;
  }

  if (type !== "friend-request" && type !== "room-invite") return;
  if (data.fromUid === currentFirebaseUid) return;
  if (data.toUid && data.toUid !== currentFirebaseUid) return;

  const inviteId = sanitizeText(data.inviteId || "", 180);
  const isFriendRequest = type === "friend-request";
  const title = data.title || (isFriendRequest ? "Novo pedido de amizade" : "Novo convite para sala");
  const body = data.body || (isFriendRequest
    ? `${data.fromNick || "Alguem"} quer adicionar voce como amigo.`
    : `${data.fromNick || "Alguem"} convidou voce para ${data.roomName || "uma sala"}.`);

  if (inviteId) {
    const seen = new Set(notificationState.seenInviteIds || []);
    seen.add(inviteId);
    notificationState.seenInviteIds = Array.from(seen).slice(-100);
    saveNotificationState();
  }

  if (areInternalPushNotificationsEnabled()) {
    showToast(title, body, "Ver pedidos", () => openNotificationsModal());
  }

  const systemNotificationPromise = options.silentSystemNotification
    ? Promise.resolve(true)
    : showBrowserNotification(title, body, {
      tag: `invite:${inviteId || Date.now()}`
    });
  playNotificationSoundAfterSystemNotification(systemNotificationPromise);

  updateBadges();
  refreshNotificationsModalIfOpen();
}

function handleForegroundFcmChatMessage(payload = {}, options = {}) {
  const data = payload?.data || {};
  if (data.type !== "chat-message" || data.authorUid === currentFirebaseUid) return;

  const roomId = sanitizeNotificationRoomId(data.roomId || "");
  if (!roomId) return;

  const timestamp = getNotificationTimestamp(data);
  const key = getMessageNotificationKey({
    roomId,
    messageId: data.messageId || "",
    lastMessageAt: timestamp,
    authorUid: data.authorUid || ""
  });
  const wasAlreadyNotified = wasMessageNotificationShown(key);
  const room = getVisibleRooms().find((item) => item.id === roomId) || null;

  if (isRoomCurrentlyVisible(roomId)) {
    markRoomAsRead({ ...(room || { id: roomId }), lastMessageAt: timestamp, lastMessageId: data.messageId || room?.lastMessageId || "" });
    return;
  }

  markMessageAsUnreadOnce(roomId, key);
  refreshNotificationUi();

  if (!wasAlreadyNotified) {
    const wasMentioned = isCurrentUserMentionedInNotificationData(data);
    const title = wasMentioned
      ? `${data.authorNick || "Alguem"} mencionou você em ${data.roomName || getRoomDisplayName(room) || "AstroChat"}`
      : data.title || `Nova mensagem de ${data.authorNick || "Alguem"}`;
    const body = wasMentioned
      ? data.body || "Toque para abrir a conversa."
      : data.body || `${data.roomName || getRoomDisplayName(room) || "AstroChat"}: Nova mensagem`;
    if (areInternalPushNotificationsEnabled()) {
      showToast(title, body, "Abrir", () => openRoomFromNotification(roomId));
    }
    const systemNotificationPromise = options.silentSystemNotification
      ? Promise.resolve(true)
      : showBrowserNotification(title, body, {
        tag: key,
        roomId,
        messageId: data.messageId || "",
        timestamp,
        mentioned: wasMentioned
      });
    playNotificationSoundAfterSystemNotification(systemNotificationPromise, wasMentioned ? "mention" : "default");
    markMessageNotificationShown(key);
    refreshNotificationUi();
    return;
  }
}

function getNotificationTimestamp(data = {}) {
  const candidates = [data.timestamp, data.time, data.sentAt, data.createdAt, Date.now()];
  const value = candidates.find((candidate) => Number.isFinite(Number(candidate)) && Number(candidate) > 0);
  return Number(value || Date.now());
}

function openRoomFromNotification(roomId) {
  const room = getVisibleRooms().find((item) => item.id === roomId);
  if (!room) {
    pendingNotificationRoomId = roomId || "";
    return;
  }

  clearCurrentTypingStatus();
  activeRoomId = room.id;
  suppressAutoRoomSelection = false;
  markRoomAsRead(room);
  clearReplyTarget();
  forceMessageRerender(room.id);
  subscribeToActiveRoomMessages();
  closeNotificationsModal();
  renderAll(true);
  appShell.classList.add("chat-open");
}

function setupServiceWorkerMessageHandling() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("message", (event) => {
    const data = event.data || {};

    if (data.type === "OPEN_ROOM_FROM_NOTIFICATION") {
      queueOpenRoomFromNotification(data.roomId || "");
      return;
    }

    if (data.type === "OPEN_NOTIFICATIONS_FROM_NOTIFICATION") {
      queueOpenNotificationsFromNotification();
      return;
    }

    if (data.type === "ASTROCHAT_PUSH_RECEIVED") {
      const payloadData = data.payloadData || {};
      handleForegroundFcmNotification(
        { data: payloadData },
        { silentSystemNotification: payloadData.systemNotificationShown === true }
      );
      return;
    }

    if (data.type === "REFRESH_FCM_TOKEN") {
      refreshFcmTokenRegistrationIfNeeded({ force: true, minIntervalMs: FCM_RESUME_REFRESH_MIN_INTERVAL_MS });
    }
  });
}

function getInitialNotificationRoomId() {
  if (!location.hash) return "";

  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  const params = new URLSearchParams(hash);
  return sanitizeNotificationRoomId(params.get("room") || "");
}

function getInitialNotificationsModalRequested() {
  if (!location.hash) return false;

  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  return hash === "notifications" || new URLSearchParams(hash).get("view") === "notifications";
}

function sanitizeNotificationRoomId(roomId) {
  return String(roomId || "").replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 180);
}

function queueOpenRoomFromNotification(roomId) {
  const safeRoomId = sanitizeNotificationRoomId(roomId);
  if (!safeRoomId) return;

  pendingNotificationRoomId = safeRoomId;
  tryOpenPendingNotificationRoom();
}

function queueOpenNotificationsFromNotification() {
  pendingNotificationsModalOpen = true;
  tryOpenPendingNotificationsModal();
}

function tryOpenPendingNotificationRoom() {
  if (!pendingNotificationRoomId || !currentUser?.nick) return;

  const roomId = pendingNotificationRoomId;
  if (!getVisibleRooms().some((room) => room.id === roomId)) return;

  pendingNotificationRoomId = "";
  openRoomFromNotification(roomId);

  if (location.hash.includes(`room=${encodeURIComponent(roomId)}`)) {
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }
}

function tryOpenPendingNotificationsModal() {
  if (!pendingNotificationsModalOpen || !currentUser?.nick) return;

  pendingNotificationsModalOpen = false;
  openNotificationsModal();

  if (location.hash === "#notifications" || location.hash.includes("view=notifications")) {
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }
}

function getRoomNotificationUrl(roomId) {
  const url = new URL(window.location.href);
  url.hash = `room=${encodeURIComponent(roomId)}`;
  return url.href;
}

function markRoomAsRead(room) {
  if (!room?.id || isAiRoom(room)) return;

  const lastMessageAt = Number(room.lastMessageAt || room.updatedAt || 0);
  const lastMessageId = room.lastMessageId || room.messages?.at(-1)?.id || "";
  notificationState.lastSeenByRoom[room.id] = Math.max(Number(notificationState.lastSeenByRoom?.[room.id] || 0), lastMessageAt);
  if (lastMessageId) {
    notificationState.lastSeenMessageIdByRoom[room.id] = lastMessageId;
  }
  notificationState.unreadByRoom[room.id] = 0;
  saveNotificationState();
  updateBadges();
  scheduleReceiptSyncForActiveRoom();
}

function markVisibleActiveRoomAsRead() {
  const activeRoom = getActiveRoom();
  if (!activeRoom || !isRoomCurrentlyVisible(activeRoom.id)) return;

  markRoomAsRead(activeRoom);
  renderRoomList(searchInput.value);
}

function isRoomCurrentlyVisible(roomId) {
  if (!roomId || roomId !== activeRoomId) return false;
  if (document.hidden || document.visibilityState !== "visible") return false;
  if (typeof document.hasFocus === "function" && !document.hasFocus()) return false;
  if (!messages || messages.hidden || messages.dataset.roomId !== roomId) return false;
  if (!messageForm || messageForm.hidden) return false;

  return !isMobileLayout() || appShell.classList.contains("chat-open");
}

function isMobileLayout() {
  return window.matchMedia("(max-width: 820px)").matches;
}

function getUnreadCount(roomId) {
  return Number(notificationState.unreadByRoom?.[roomId] || 0);
}

function getTotalUnreadCount() {
  return Object.values(notificationState.unreadByRoom || {}).reduce((total, value) => total + Number(value || 0), 0);
}

function saveNotificationState() {
  notificationState = normalizeNotificationState(notificationState);
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notificationState));
}

function setupNotificationSoundUnlock() {
  window.addEventListener("pointerdown", unlockNotificationSound, { passive: true });
  window.addEventListener("touchstart", unlockNotificationSound, { passive: true });
  window.addEventListener("keydown", unlockNotificationSound);
}

async function unlockNotificationSound() {
  try {
    const context = getNotificationAudioContext();
    if (context.state === "suspended") {
      await context.resume();
    }

    notificationSoundUnlocked = context.state === "running";

    if (notificationSoundUnlocked) {
      primeNotificationSound(context);
    }

    if (notificationSoundUnlocked && pendingNotificationSound) {
      const pendingKind = pendingNotificationSoundKind;
      pendingNotificationSound = false;
      pendingNotificationSoundKind = "default";
      window.setTimeout(() => playNotificationSound(pendingKind), 0);
    }
  } catch (error) {
    console.warn("Nao foi possivel destravar o som de notificacao.", error);
  }
}

function getNotificationAudioContext() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    throw new Error("AudioContext indisponivel.");
  }

  if (!notificationAudioContext) {
    notificationAudioContext = new AudioContextConstructor();
  }

  return notificationAudioContext;
}

function primeNotificationSound(context) {
  if (notificationSoundPrimed) return;

  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.02);
    notificationSoundPrimed = true;
  } catch (error) {
    console.warn("Nao foi possivel preparar o som de notificacao.", error);
  }
}

function playNotificationSound(kind = "default") {
  if (!areInternalPushNotificationsEnabled()) return;

  if ("vibrate" in navigator && areInternalPushNotificationsEnabled()) {
    navigator.vibrate(kind === "mention" ? [120, 60, 120, 60, 180] : [45, 35, 45]);
  }

  let context;
  try {
    context = getNotificationAudioContext();
  } catch (error) {
    return;
  }

  if (context.state !== "running") {
    pendingNotificationSound = true;
    pendingNotificationSoundKind = kind;
    unlockNotificationSound();
    return;
  }

  try {
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(kind === "mention" ? 990 : 880, now);
    oscillator.frequency.setValueAtTime(kind === "mention" ? 1320 : 1175, now + 0.11);
    if (kind === "mention") oscillator.frequency.setValueAtTime(1568, now + 0.22);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.13, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (kind === "mention" ? 0.42 : 0.28));

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + (kind === "mention" ? 0.44 : 0.3));
  } catch (error) {
    console.warn("Nao foi possivel tocar o som de notificacao.", error);
  }
}

function canShowSystemBrowserNotification() {
  return areSystemPushNotificationsEnabled() &&
    "Notification" in window &&
    Notification.permission === "granted";
}

function playNotificationSoundAfterSystemNotification(systemNotificationPromise, kind = "default") {
  if (!areInternalPushNotificationsEnabled()) return;

  if (!canShowSystemBrowserNotification()) {
    playNotificationSound(kind);
    return;
  }

  let soundPlayed = false;
  const playOnce = () => {
    if (soundPlayed) return;
    soundPlayed = true;
    playNotificationSound(kind);
  };
  const fallbackTimer = window.setTimeout(playOnce, NOTIFICATION_SOUND_AFTER_SYSTEM_DELAY_MS + 600);

  Promise.resolve(systemNotificationPromise)
    .catch((error) => {
      console.warn("Nao foi possivel aguardar a notificacao do sistema antes do som.", error);
    })
    .then(() => {
      window.clearTimeout(fallbackTimer);
      window.setTimeout(playOnce, NOTIFICATION_SOUND_AFTER_SYSTEM_DELAY_MS);
    });
}

async function requestBrowserNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return "insecure";
  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch (error) {
      console.warn("Permissão de notificação não concedida.", error);
    }
  }
  return Notification.permission;
}

async function showBrowserNotification(title, body, data = {}) {
  if (!areSystemPushNotificationsEnabled()) return false;
  if (!("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  const options = {
    body,
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: data.tag || title,
    renotify: true,
    silent: false,
    requireInteraction: Boolean(data.mentioned),
    vibrate: data.mentioned ? [120, 60, 120, 60, 180] : [45, 35, 45],
    data: {
      url: data.roomId ? getRoomNotificationUrl(data.roomId) : window.location.href,
      ...data
    }
  };

  const showWindowNotification = () => {
    try {
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      return true;
    } catch (error) {
      console.warn("Nao foi possivel mostrar notificacao do navegador.", error);
      return false;
    }
  };

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration?.showNotification) {
        await registration.showNotification(title, options);
        return true;
      }

      return showWindowNotification();
    } catch (error) {
      console.warn("Service worker indisponivel para notificacao.", error);
      return showWindowNotification();
    }
  }

  return showWindowNotification();
}

function isFcmVapidKeyConfigured() {
  return getFcmVapidKeyValidation().valid;
}

function getNormalizedFcmVapidKey() {
  return String(FCM_WEB_PUSH_PUBLIC_VAPID_KEY || "").replace(/\s+/g, "").trim();
}

function getNormalizedStandardWebPushVapidKey() {
  return String(STANDARD_WEB_PUSH_PUBLIC_VAPID_KEY || "").replace(/\s+/g, "").trim();
}

function getFcmVapidKeyValidation() {
  const key = getNormalizedFcmVapidKey();

  if (!key || key.includes("COLE") || key.includes("SUA_CHAVE")) {
    return {
      valid: false,
      message: "Cole a chave publica Web Push do Firebase em FCM_WEB_PUSH_PUBLIC_VAPID_KEY."
    };
  }

  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(key)) {
    return {
      valid: false,
      message: "A chave VAPID deve ser base64url. Copie a chave publica de Web push certificates."
    };
  }

  try {
    const bytes = base64UrlToUint8Array(key);
    if (bytes.length !== 65 || bytes[0] !== 4) {
      return {
        valid: false,
        message: "A chave VAPID atual nao parece ser a chave publica Web Push completa do Firebase."
      };
    }
  } catch (error) {
    return {
      valid: false,
      message: "A chave VAPID atual nao pode ser decodificada. Copie novamente a chave publica Web Push."
    };
  }

  return {
    valid: true,
    message: ""
  };
}

function getStandardWebPushVapidKeyValidation() {
  const key = getNormalizedStandardWebPushVapidKey();

  if (!key || key.includes("COLE") || key.includes("SUA_CHAVE")) {
    return {
      valid: false,
      message: "Configure STANDARD_WEB_PUSH_PUBLIC_VAPID_KEY para o Web Push padrao."
    };
  }

  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(key)) {
    return {
      valid: false,
      message: "A chave publica Web Push padrao deve ser base64url."
    };
  }

  try {
    const bytes = base64UrlToUint8Array(key);
    if (bytes.length !== 65 || bytes[0] !== 4) {
      return {
        valid: false,
        message: "A chave publica Web Push padrao nao parece ser uma chave VAPID completa."
      };
    }
  } catch (error) {
    return {
      valid: false,
      message: "A chave publica Web Push padrao nao pode ser decodificada."
    };
  }

  return {
    valid: true,
    message: ""
  };
}

function base64UrlToUint8Array(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output;
}

async function getFirebaseMessagingIfSupported() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;
  if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return null;

  if (!firebaseMessagingSupportedPromise) {
    firebaseMessagingSupportedPromise = isFirebaseMessagingSupported().catch((error) => {
      console.warn("Firebase Cloud Messaging indisponivel neste navegador.", error);
      return false;
    });
  }

  const supported = await firebaseMessagingSupportedPromise;
  if (!supported) return null;

  if (!firebaseMessaging) {
    firebaseMessaging = getMessaging(firebaseApp);
  }

  return firebaseMessaging;
}

function getFcmDeviceId() {
  const existing = localStorage.getItem(FCM_DEVICE_ID_STORAGE_KEY);
  if (existing) return existing;

  const nextId = window.crypto?.randomUUID?.() || createId("web-fcm");
  localStorage.setItem(FCM_DEVICE_ID_STORAGE_KEY, nextId);
  return nextId;
}

function hasSavedSystemPushRegistration() {
  return Boolean(
    localStorage.getItem(FCM_TOKEN_STORAGE_KEY) ||
    localStorage.getItem(WEB_PUSH_SUBSCRIPTION_STORAGE_KEY)
  );
}

function hasSavedPrimarySystemPushRegistration() {
  return Boolean(
    localStorage.getItem(FCM_TOKEN_STORAGE_KEY) ||
    localStorage.getItem(WEB_PUSH_SUBSCRIPTION_STORAGE_KEY)
  );
}

function registerFcmTokenIfNotificationGranted(options = {}) {
  if (!areSystemPushNotificationsEnabled()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  ensureFcmTokenRegistration(options).catch((error) => {
    console.warn("Nao foi possivel registrar o token FCM.", error);
  });
}

function refreshFcmTokenRegistrationIfNeeded(options = {}) {
  if (!shouldRefreshFcmTokenRegistration(options)) return;

  registerFcmTokenIfNotificationGranted({ force: true });
}

function shouldRefreshFcmTokenRegistration(options = {}) {
  const lastRefresh = Number(localStorage.getItem(FCM_TOKEN_REFRESHED_AT_STORAGE_KEY) || 0);
  const registrationSchema = localStorage.getItem(FCM_REGISTRATION_SCHEMA_STORAGE_KEY) || "";

  if (registrationSchema !== FCM_REGISTRATION_SCHEMA) return true;

  if (options.force) {
    if (!hasSavedPrimarySystemPushRegistration()) return true;
    const minIntervalMs = Math.max(0, Number(options.minIntervalMs || 0));
    if (minIntervalMs && lastRefresh && Date.now() - lastRefresh < minIntervalMs) return false;
    return true;
  }

  if (!currentFirebaseUid || !currentUser?.nick || !firebaseReady) return false;
  if (!areSystemPushNotificationsEnabled()) return false;
  if (!("Notification" in window) || Notification.permission !== "granted") return false;

  return !hasSavedPrimarySystemPushRegistration() || !lastRefresh || Date.now() - lastRefresh > FCM_TOKEN_REFRESH_INTERVAL_MS;
}

async function ensureFcmTokenRegistration(options = {}) {
  if (fcmTokenRegistrationPromise && !options.force) return fcmTokenRegistrationPromise;

  fcmTokenRegistrationPromise = (async () => {
    if (!currentFirebaseUid || !currentUser?.nick || !firebaseReady) return null;
    if (!areSystemPushNotificationsEnabled()) return null;
    if (!("Notification" in window) || Notification.permission !== "granted") return null;

    const vapidKeyValidation = getFcmVapidKeyValidation();
    let fcmRegistrationError = null;

    if (vapidKeyValidation.valid) {
      const messaging = await getFirebaseMessagingIfSupported();

      if (messaging) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await preparePushSubscriptionForFcm(registration);

          const token = await getToken(messaging, {
            vapidKey: getNormalizedFcmVapidKey(),
            serviceWorkerRegistration: registration
          });

          if (!token) {
            throw new Error("O Firebase não retornou um token FCM.");
          }

          await saveFcmTokenForCurrentUser(token);
          setupFirebaseMessagingForegroundListener().catch((error) => {
            console.warn("Nao foi possivel preparar mensagens FCM em primeiro plano.", error);
          });

          console.log("[AstroChat Push] Token FCM registrado com a chave VAPID do Firebase.", {
            deviceId: getFcmDeviceId(),
            tokenLength: token.length
          });
          return token;
        } catch (error) {
          fcmRegistrationError = error;
          console.warn("[AstroChat Push] Registro FCM falhou; tentando Web Push padrão.", error);
        }
      }
    } else if (options.showErrors) {
      showToast("FCM sem chave VAPID válida", vapidKeyValidation.message);
    }

    // Fallback: só cria a assinatura Web Push com a segunda chave quando o FCM
    // realmente não pôde ser registrado. Isso evita duas chaves VAPID disputando
    // a única PushSubscription permitida para o mesmo Service Worker.
    try {
      const standardVapidKeyValidation = getStandardWebPushVapidKeyValidation();
      if (!standardVapidKeyValidation.valid) {
        if (options.showErrors) {
          showToast("Web Push sem chave VAPID válida", standardVapidKeyValidation.message);
        }
        return null;
      }

      const standardSubscription = await ensureStandardWebPushSubscription(options);
      if (standardSubscription) {
        console.warn("[AstroChat Push] Usando apenas Web Push padrão neste aparelho; não há token FCM utilizável.");
        return standardSubscription.endpoint || null;
      }
    } catch (error) {
      console.warn("Nao foi possivel registrar Web Push padrao.", error);
    }

    if (options.showErrors && fcmRegistrationError) {
      showToast("Não foi possível ativar o push", String(fcmRegistrationError?.message || fcmRegistrationError));
    }
    return null;
  })();

  try {
    return await fcmTokenRegistrationPromise;
  } finally {
    fcmTokenRegistrationPromise = null;
  }
}

async function preparePushSubscriptionForFcm(registration) {
  if (!registration?.pushManager) return;

  const expectedVapidKey = getNormalizedFcmVapidKey();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const savedFcmToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY) || "";
  const savedFcmVapidKey = localStorage.getItem(FCM_VAPID_KEY_STORAGE_KEY) || "";
  const isKnownFcmSubscription = Boolean(savedFcmToken && savedFcmVapidKey === expectedVapidKey);
  const browserReportsMatchingKey = doesPushSubscriptionUseVapidKey(subscription, expectedVapidKey);

  if (isKnownFcmSubscription || browserReportsMatchingKey) return;

  console.warn("[AstroChat Push] Removendo assinatura Push criada com outra chave VAPID antes de registrar o FCM.");
  await subscription.unsubscribe();
  localStorage.removeItem(WEB_PUSH_SUBSCRIPTION_STORAGE_KEY);
  localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
  localStorage.removeItem(FCM_VAPID_KEY_STORAGE_KEY);
  localStorage.removeItem(FCM_REGISTRATION_SCHEMA_STORAGE_KEY);
  localStorage.removeItem(FCM_TOKEN_REFRESHED_AT_STORAGE_KEY);
}

async function saveFcmTokenForCurrentUser(token) {
  if (!token || !currentFirebaseUid) return;

  const deviceId = getFcmDeviceId();
  const now = Date.now();

  await update(ref(db), {
    [`fcmTokens/${currentFirebaseUid}/${deviceId}`]: {
      uid: currentFirebaseUid,
      deviceId,
      token,
      platform: "web",
      nick: currentUser?.nick || "",
      userAgent: String(navigator.userAgent || "").slice(0, 180),
      updatedAt: serverTimestamp(),
      updatedAtMillis: now,
      lastRegisteredAtMillis: now
    }
  });

  localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
  localStorage.setItem(FCM_VAPID_KEY_STORAGE_KEY, getNormalizedFcmVapidKey());
  localStorage.setItem(FCM_REGISTRATION_SCHEMA_STORAGE_KEY, FCM_REGISTRATION_SCHEMA);
  localStorage.setItem(FCM_TOKEN_REFRESHED_AT_STORAGE_KEY, String(now));
}

async function ensureStandardWebPushSubscription(options = {}) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    if (options.showErrors) {
      showToast("Web Push indisponivel", "Este navegador nao oferece PushManager para avisos em segundo plano.");
    }
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  if (!registration?.pushManager) return null;

  let subscription = await registration.pushManager.getSubscription();
  const savedSubscription = getSavedWebPushSubscriptionSummary();
  const standardVapidKey = getNormalizedStandardWebPushVapidKey();

  if (
    subscription &&
    savedSubscription?.vapidPublicKey !== standardVapidKey &&
    !doesPushSubscriptionUseVapidKey(subscription, standardVapidKey)
  ) {
    try {
      await subscription.unsubscribe();
      subscription = null;
    } catch (error) {
      console.warn("Nao foi possivel trocar assinatura Web Push antiga.", error);
    }
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(standardVapidKey)
    });
  }

  await saveWebPushSubscriptionForCurrentUser(subscription);
  return subscription;
}

async function saveWebPushSubscriptionForCurrentUser(subscription) {
  if (!subscription || !currentFirebaseUid) return;

  const payload = serializeWebPushSubscription(subscription);
  if (!payload?.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) return;

  const deviceId = getFcmDeviceId();
  const now = Date.now();
  const subscriptionRecord = {
    uid: currentFirebaseUid,
    deviceId,
    platform: "web",
    nick: currentUser?.nick || "",
    userAgent: String(navigator.userAgent || "").slice(0, 180),
    endpoint: payload.endpoint,
    expirationTime: payload.expirationTime || null,
    keys: payload.keys,
    vapidPublicKey: getNormalizedStandardWebPushVapidKey(),
    updatedAt: serverTimestamp(),
    updatedAtMillis: now,
    lastRegisteredAtMillis: now
  };

  try {
    await update(ref(db), {
      [`webPushSubscriptions/${currentFirebaseUid}/${deviceId}`]: subscriptionRecord
    });
  } catch (error) {
    console.warn("Nao foi possivel salvar assinatura em webPushSubscriptions; tentando fcmTokens.", error);
    await update(ref(db), {
      [`fcmTokens/${currentFirebaseUid}/${deviceId}/webPushSubscription`]: subscriptionRecord,
      [`fcmTokens/${currentFirebaseUid}/${deviceId}/updatedAt`]: serverTimestamp(),
      [`fcmTokens/${currentFirebaseUid}/${deviceId}/updatedAtMillis`]: now
    });
  }

  localStorage.setItem(WEB_PUSH_SUBSCRIPTION_STORAGE_KEY, JSON.stringify({
    endpoint: payload.endpoint,
    vapidPublicKey: getNormalizedStandardWebPushVapidKey(),
    updatedAtMillis: now
  }));
  localStorage.setItem(FCM_REGISTRATION_SCHEMA_STORAGE_KEY, FCM_REGISTRATION_SCHEMA);
  localStorage.setItem(FCM_TOKEN_REFRESHED_AT_STORAGE_KEY, String(now));
}

function getSavedWebPushSubscriptionSummary() {
  try {
    return JSON.parse(localStorage.getItem(WEB_PUSH_SUBSCRIPTION_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function doesPushSubscriptionUseVapidKey(subscription, vapidKey) {
  const applicationServerKey = subscription?.options?.applicationServerKey;
  if (!applicationServerKey) return false;

  return arrayBufferToBase64Url(applicationServerKey) === vapidKey;
}

function serializeWebPushSubscription(subscription) {
  if (!subscription) return null;

  if (typeof subscription.toJSON === "function") {
    const payload = subscription.toJSON();
    if (payload?.endpoint && payload?.keys?.p256dh && payload?.keys?.auth) {
      return payload;
    }
  }

  const p256dh = arrayBufferToBase64Url(subscription.getKey?.("p256dh"));
  const auth = arrayBufferToBase64Url(subscription.getKey?.("auth"));

  return {
    endpoint: subscription.endpoint || "",
    expirationTime: subscription.expirationTime || null,
    keys: { p256dh, auth }
  };
}

function arrayBufferToBase64Url(buffer) {
  if (!buffer) return "";

  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function unregisterFcmTokenForCurrentUser(options = {}) {
  const uid = currentFirebaseUid;
  const deviceId = localStorage.getItem(FCM_DEVICE_ID_STORAGE_KEY);

  if (uid && deviceId && firebaseReady && isInternetAvailable()) {
    try {
      await update(ref(db), {
        [`fcmTokens/${uid}/${deviceId}`]: null,
        [`webPushSubscriptions/${uid}/${deviceId}`]: null
      });
    } catch (error) {
      console.warn("Nao foi possivel remover registros de push do Firebase.", error);
    }
  }

  if (options.deleteBrowserToken) {
    try {
      const messaging = await getFirebaseMessagingIfSupported();
      if (messaging) await deleteToken(messaging);
    } catch (error) {
      console.warn("Nao foi possivel apagar o token FCM local.", error);
    }

    try {
      const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.ready : null;
      const subscription = await registration?.pushManager?.getSubscription?.();
      if (subscription) await subscription.unsubscribe();
    } catch (error) {
      console.warn("Nao foi possivel cancelar a assinatura Web Push local.", error);
    }
  }

  localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
  localStorage.removeItem(FCM_VAPID_KEY_STORAGE_KEY);
  localStorage.removeItem(FCM_REGISTRATION_SCHEMA_STORAGE_KEY);
  localStorage.removeItem(WEB_PUSH_SUBSCRIPTION_STORAGE_KEY);
  localStorage.removeItem(FCM_TOKEN_REFRESHED_AT_STORAGE_KEY);
}

async function setupFirebaseMessagingForegroundListener() {
  if (firebaseMessagingForegroundUnsubscribe) return;

  try {
    const messaging = await getFirebaseMessagingIfSupported();
    if (!messaging) return;

    firebaseMessagingForegroundUnsubscribe = onMessage(messaging, (payload) => {
      const data = payload?.data || {};
      if (data.authorUid === currentFirebaseUid || data.fromUid === currentFirebaseUid) return;
      handleForegroundFcmNotification(payload);
    });
  } catch (error) {
    console.warn("Nao foi possivel iniciar listener FCM em primeiro plano.", error);
  }
}

function dismissToast(toast = activeToastElement) {
  if (toast && toast !== activeToastElement) {
    toast.remove();
    return;
  }

  if (activeToastTimer) {
    window.clearTimeout(activeToastTimer);
    activeToastTimer = null;
  }

  activeToastElement?.remove();
  activeToastElement = null;
}

function showToast(title, message, actionLabel = "", action = null) {
  if (!toastRegion || !areInternalPushNotificationsEnabled()) return;

  dismissToast();

  const toast = document.createElement("article");
  toast.className = "toast-card";
  toast.innerHTML = `
    <div>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(message)}</span>
    </div>
    <button class="icon-button" type="button" aria-label="Fechar aviso">
      <i class="fa-solid fa-xmark" aria-hidden="true"></i>
    </button>
  `;

  if (actionLabel && action) {
    const actionButton = document.createElement("button");
    actionButton.className = "small-action toast-action";
    actionButton.type = "button";
    actionButton.innerHTML = `<span>${escapeHtml(actionLabel)}</span>`;
    actionButton.addEventListener("click", () => {
      try {
        action();
      } finally {
        dismissToast(toast);
      }
    });
    toast.appendChild(actionButton);
  }

  toast.querySelector(".icon-button").addEventListener("click", () => dismissToast(toast));
  activeToastElement = toast;
  toastRegion.replaceChildren(toast);
  activeToastTimer = window.setTimeout(() => dismissToast(toast), 7000);
}

function formatStatus(status) {
  const labels = {
    pendente: "Pendente",
    aceito: "Aceito",
    cancelado: "Cancelado"
  };

  return labels[status] || status;
}

function sanitizeText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function getInitials(value) {
  const words = sanitizeText(value, 32).split(" ").filter(Boolean);
  const initials = words.length > 1
    ? `${words[0][0]}${words[1][0]}`
    : words[0]?.slice(0, 2) || "U";

  return initials.toUpperCase();
}


function getSelectedSpaceAvatarIcon() {
  const selected = spaceAvatarSelect?.value || avatarInputs.find((input) => input.checked)?.value || DEFAULT_SPACE_AVATAR_ICON;
  return getSafeSpaceAvatarIcon(selected);
}

function selectSpaceAvatar(iconClass) {
  const safeIcon = getSafeSpaceAvatarIcon(iconClass);
  if (spaceAvatarSelect) spaceAvatarSelect.value = safeIcon;
  avatarInputs.forEach((input) => {
    input.checked = input.value === safeIcon;
  });
  updateLoginAvatarPreview();
}

function updateLoginAvatarPreview() {
  if (!spaceAvatarPreview) return;
  const icon = getSelectedSpaceAvatarIcon();
  spaceAvatarPreview.innerHTML = `<i class="${escapeHtml(icon)}" aria-hidden="true"></i>`;
}

function getSafeSpaceAvatarIcon(iconClass) {
  return SPACE_AVATAR_OPTIONS.includes(iconClass) ? iconClass : DEFAULT_SPACE_AVATAR_ICON;
}

function paintAvatar(element, source = {}, fallbackText = "U") {
  if (!element) return;
  const iconClass = getSafeSpaceAvatarIcon(source?.avatarIcon || "");
  const hasIcon = Boolean(source?.avatarIcon && SPACE_AVATAR_OPTIONS.includes(source.avatarIcon));

  element.classList.toggle("has-space-icon", hasIcon);
  if (hasIcon) {
    element.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i>`;
    return;
  }

  element.textContent = source?.avatar || getInitials(fallbackText || source?.nick || "Usuário");
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeNick(value) {
  return normalize(value);
}

function toDatabaseKey(value) {
  return normalize(value)
    .replace(/[.#$\[\]/]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "usuario";
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getGradientByText(value) {
  const gradients = [
    "linear-gradient(135deg, #0b8f6f, #0e486e)",
    "linear-gradient(135deg, #6d5dfc, #12c2e9)",
    "linear-gradient(135deg, #ff8a00, #e52e71)",
    "linear-gradient(135deg, #11998e, #38ef7d)",
    "linear-gradient(135deg, #4776e6, #8e54e9)",
    "linear-gradient(135deg, #ee0979, #ff6a00)"
  ];

  const hash = String(value || "").split("").reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

function unique(values) {
  return Array.from(new Set(values));
}

function forceMessageRerender(roomId) {
  renderedMessageIdsByRoom.delete(roomId);
  if (messages.dataset.roomId === roomId) {
    messages.innerHTML = "";
  }
}

function setFormBusy(form, isBusy) {
  Array.from(form.querySelectorAll("button, input, textarea, select")).forEach((element) => {
    element.disabled = isBusy;
  });
}

function setButtonBusy(button, isBusy, busyText = "") {
  if (!button) return;

  if (isBusy) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span>${escapeHtml(busyText || "Aguarde...")}</span><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>`;
    return;
  }

  button.disabled = false;
  if (button.dataset.originalHtml) {
    button.innerHTML = button.dataset.originalHtml;
    delete button.dataset.originalHtml;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      syncSystemPushPreferenceToServiceWorker();
    });

    const registration = await navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" });
    syncSystemPushPreferenceToServiceWorker();
    await registration.update();
    const readyRegistration = await navigator.serviceWorker.ready;
    console.info(
      "%c[AstroChat Push] Service Worker registrado e ativo.",
      "color:#10b486;font-weight:800",
      { scope: readyRegistration.scope, state: readyRegistration.active?.state || "unknown" }
    );
    await consumePendingFcmTokenRefreshRequest();
  } catch (error) {
    console.warn("Service worker não registrado.", error);
  }
}

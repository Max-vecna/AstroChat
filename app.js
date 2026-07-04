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
const CHAT_VERSION = "v76";

const ROOMS_STORAGE_KEY = "chat-pwa-salas-v3-ai-local";
const FRIENDS_STORAGE_KEY = "chat-pwa-amigos-v2-firebase";
const USER_STORAGE_KEY = "chat-pwa-user-v1";
const NOTIFICATIONS_STORAGE_KEY = "chat-pwa-notificacoes-v1";
const FCM_DEVICE_ID_STORAGE_KEY = "astrochat-fcm-device-id-v1";
const FCM_TOKEN_STORAGE_KEY = "astrochat-fcm-token-v1";
const LIVE_TYPING_STORAGE_KEY = "astrochat-live-typing-v1";
const LEARNING_TEST_STORAGE_KEY = "astrochat-learning-test-v1";
const PROCESSED_FRIEND_REQUESTS_STORAGE_KEY = "astrochat-friend-requests-processados-v1";

const AI_ROOM_TYPE = "language-ai";
const USER_ROOM_TYPE = "user-room";
const PRIVATE_ROOM_TYPE = "private-room";
const FRIEND_REQUEST_TYPE = "friend-request";
const NICK_TAKEN_ERROR_CODE = "nick-taken";
const MISSING_FIREBASE_USER_DATA_ERROR_CODE = "missing-firebase-user-data";
const BACKGROUND_REFRESH_INTERVAL_MS = 45000;
const AI_TEACHER_NAME = "Professor IA";
const POLLINATIONS_CHAT_ENDPOINT = "https://text.pollinations.ai/openai";
const POLLINATIONS_TEXT_ENDPOINT = "https://text.pollinations.ai/";
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
const SPACE_AVATAR_OPTIONS = [
  "fa-solid fa-user-astronaut",
  "fa-solid fa-rocket",
  "fa-solid fa-moon",
  "fa-solid fa-star",
  "fa-solid fa-satellite",
  "fa-solid fa-earth-americas"
];
const DEFAULT_SPACE_AVATAR_ICON = SPACE_AVATAR_OPTIONS[0];
const AI_SYSTEM_PROMPT = `Você é um professor de idiomas paciente, prático e motivador dentro de um app de bate-papo.
Seu objetivo é ensinar idiomas para o usuário, principalmente por conversa.
Responda em português do Brasil por padrão, a menos que o usuário peça outro idioma.
Sempre adapte a resposta ao nível do aluno.
Quando o usuário escrever em outro idioma, corrija de forma gentil, explique os erros principais e dê 2 ou 3 exemplos curtos.
Quando fizer sentido, proponha exercícios rápidos, traduções, diálogos, vocabulário, pronúncia aproximada e revisão.
Evite respostas longas demais. Seja claro, didático e amigável.`;

let rooms = loadFromStorage(ROOMS_STORAGE_KEY, []).filter((room) => room?.type === AI_ROOM_TYPE);
let remoteRooms = [];
let friends = loadFromStorage(FRIENDS_STORAGE_KEY, []);
let pendingRoomInviteFriendIds = new Set();
let invites = [];
let notificationState = normalizeNotificationState(loadFromStorage(NOTIFICATIONS_STORAGE_KEY, {}));
let liveTypingByRoom = loadFromStorage(LIVE_TYPING_STORAGE_KEY, {});
let learningTestByRoom = loadFromStorage(LEARNING_TEST_STORAGE_KEY, {});
let processedFriendRequestIds = loadFromStorage(PROCESSED_FRIEND_REQUESTS_STORAGE_KEY, {});
let activeTypingUsers = [];
let replyTarget = null;
let currentUser = loadUser();
let currentFirebaseUser = null;
let currentFirebaseUid = null;
let activeRoomId = null;
let pendingNotificationRoomId = getInitialNotificationRoomId();
let suppressAutoRoomSelection = false;
let activeView = "rooms";
let deferredInstallPrompt = null;
let aiReplyInProgress = false;
let activeSpeechUtterance = null;
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
let pendingMessagesScrollFrame = null;
let internetOnline = navigator.onLine !== false;
let notificationAudioContext = null;
let notificationSoundUnlocked = false;
let notificationSoundPrimed = false;
let pendingNotificationSound = false;
let activeToastElement = null;
let activeToastTimer = null;
let backgroundRefreshTimer = null;
let backgroundRefreshInProgress = false;
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
const remoteRoomMap = new Map();
const roomMetadataUnsubscribers = new Map();
const inviteUnsubscribers = {
  received: new Map(),
  sent: new Map()
};
const inviteSnapshotBuckets = {
  received: [],
  sent: []
};

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
const emptyChatPanel = document.querySelector("#emptyChatPanel");
const activeAvatar = document.querySelector("#activeAvatar");
const activeName = document.querySelector("#activeName");
const activeStatus = document.querySelector("#activeStatus");
const clearChatButton = document.querySelector("#clearChatButton");
const roomMenuButton = document.querySelector("#roomMenuButton");
const liveTypingButton = document.querySelector("#liveTypingButton");
const typingPreviewPanel = document.querySelector("#typingPreviewPanel");
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
const profileAvatarInputs = Array.from(document.querySelectorAll('input[name="profileSpaceAvatar"]'));
const profileAvatarSelect = document.querySelector("#profileAvatarSelect");
const profileAvatarSelectPreview = document.querySelector("#profileAvatarSelectPreview");
const closeProfileSettingsButton = document.querySelector("#closeProfileSettingsButton");
const cancelProfileSettingsButton = document.querySelector("#cancelProfileSettingsButton");
const resetLocalProfileButton = document.querySelector("#resetLocalProfileButton");
const profileNotificationsButton = document.querySelector("#profileNotificationsButton");
const profileNotificationsStatus = document.querySelector("#profileNotificationsStatus");
const profileVersionLabel = document.querySelector("#profileVersionLabel");
const roomItemTemplate = document.querySelector("#roomItemTemplate");

const createRoomButton = document.querySelector("#createRoomButton");
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

const inviteButton = document.querySelector("#inviteButton");
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
const roomSettingsClearChatButton = document.querySelector("#roomSettingsClearChatButton");
const toastRegion = document.querySelector("#toastRegion");
const suggestTextButton = document.querySelector("#suggestTextButton");
const spellcheckButton = document.querySelector("#spellcheckButton");
const learningTestButton = document.querySelector("#learningTestButton");
const aiAssistModal = document.querySelector("#aiAssistModal");
const closeAiAssistButton = document.querySelector("#closeAiAssistButton");
const aiAssistTitle = document.querySelector("#aiAssistTitle");
const aiAssistSubtitle = document.querySelector("#aiAssistSubtitle");
const aiAssistOriginalText = document.querySelector("#aiAssistOriginalText");
const aiAssistContent = document.querySelector("#aiAssistContent");

if (profileVersionLabel) {
  profileVersionLabel.textContent = `AstroChat ${CHAT_VERSION}`;
}

setupConnectivityDetection();
setupBackgroundRuntime();
setupNotificationSoundUnlock();
setupServiceWorkerMessageHandling();
bootApp().catch((error) => {
  console.error("Falha ao iniciar o app.", error);
  showLogin();
});
registerServiceWorker();

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
});

window.addEventListener("resize", closeMessageMenus);
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

profileNickInput?.addEventListener("input", updateProfileSettingsPreview);
profileNativeLanguageSelect?.addEventListener("change", updateProfileSettingsPreview);
profileAvatarInputs.forEach((input) => input.addEventListener("change", updateProfileSettingsPreview));
profileAvatarSelect?.addEventListener("change", () => {
  updateProfileAvatarSelectPreview();
  updateProfileSettingsPreview();
});
spaceAvatarSelect?.addEventListener("change", updateLoginAvatarPreview);

logoutButton.addEventListener("click", handleSessionLogout);

createRoomButton.addEventListener("click", openRoomModal);
emptyCreateRoomButton.addEventListener("click", openRoomModal);
closeRoomModalButton.addEventListener("click", closeRoomModal);
cancelRoomButton.addEventListener("click", closeRoomModal);
roomFriendFilterInput?.addEventListener("input", renderRoomFriendPicker);

roomModal.addEventListener("click", (event) => {
  if (event.target === roomModal) closeRoomModal();
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

  if (isAiRoom(activeRoom)) {
    if (aiReplyInProgress) return;
    if (!requireInternet("conversar com o Professor IA")) return;
    await clearCurrentTypingStatus();
    messageInput.value = "";
    await handleAiRoomMessage(text);
    return;
  }

  if (!requireFirebaseConnection("enviar mensagem")) return;

  const learningTestEnabled = isLearningTestEnabledForRoom(activeRoom);

  try {
    await clearCurrentTypingStatus();
    messageInput.value = "";
    setMessageSending(true, learningTestEnabled ? "Verificando" : getRoomLanguage(activeRoom)?.code ? "Traduzindo" : "Enviando");

    if (learningTestEnabled) {
      const feedbackResult = await checkLearningTestWriting(text, activeRoom);
      await sendFirebaseMessage(activeRoom, text, {
        skipTranslation: true,
        learningTest: true,
        learningFeedback: await createLearningFeedbackFromResult(text, feedbackResult, activeRoom)
      });
    } else {
      await sendFirebaseMessage(activeRoom, text);
    }
  } catch (error) {
    console.error("Erro ao enviar mensagem.", error);
    messageInput.value = text;
    if (learningTestEnabled) {
      window.alert("Nao foi possivel verificar sua frase agora. Verifique sua conexao e tente novamente.");
      return;
    }
    window.alert("Não foi possível enviar a mensagem. Verifique sua conexão e tente novamente.");
  } finally {
    setMessageSending(false);
  }
});

cancelReplyButton?.addEventListener("click", clearReplyTarget);

messageInput.addEventListener("input", handleMessageInputTyping);
messageInput.addEventListener("blur", () => scheduleTypingClear());
suggestTextButton?.addEventListener("click", openTextSuggestionAssistant);
spellcheckButton?.addEventListener("click", openSpellcheckAssistant);
learningTestButton?.addEventListener("click", toggleLearningTestMode);
closeAiAssistButton?.addEventListener("click", closeAiAssistModal);
aiAssistModal?.addEventListener("click", (event) => {
  if (event.target === aiAssistModal) closeAiAssistModal();
});
window.addEventListener("beforeunload", clearCurrentTypingStatus);
document.addEventListener("visibilitychange", markVisibleActiveRoomAsRead);
window.addEventListener("focus", markVisibleActiveRoomAsRead);

liveTypingButton?.addEventListener("click", toggleLiveTypingForActiveRoom);
roomMenuButton?.addEventListener("click", openRoomSettingsModal);
closeRoomSettingsButton?.addEventListener("click", closeRoomSettingsModal);
roomSettingsModal?.addEventListener("click", (event) => {
  if (event.target === roomSettingsModal) closeRoomSettingsModal();
});
saveRoomLanguageButton?.addEventListener("click", saveActiveRoomLanguageFromSettings);
deleteRoomButton?.addEventListener("click", handleDeleteOrLeaveRoomFromSettings);
roomSettingsLiveTypingButton?.addEventListener("click", toggleLiveTypingForActiveRoom);
roomSettingsClearChatButton?.addEventListener("click", handleClearActiveChat);

searchInput.addEventListener("input", () => {
  renderRoomList(searchInput.value);
});

backButton.addEventListener("click", closeMobileConversationToMenu);

clearChatButton?.addEventListener("click", handleClearActiveChat);

async function handleClearActiveChat() {
  const activeRoom = getActiveRoom();
  if (!activeRoom) return;

  if (isAiRoom(activeRoom)) {
    const confirmClear = window.confirm("Reiniciar a conversa com o Professor IA?");
    if (!confirmClear) return;

    activeRoom.messages = [createAiWelcomeMessage()];
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
  notificationState = normalizeNotificationState({});
  liveTypingByRoom = {};
  learningTestByRoom = {};
  processedFriendRequestIds = {};
  firebaseReady = false;
  firebaseInitPromise = null;
  aiReplyInProgress = false;
  pendingNotificationRoomId = "";
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
  closePrivateModal();
  closeRoomModal();
  closeInviteModal();
  closeAiAssistModal();
}

function clearStoredAstroChatData() {
  [
    USER_STORAGE_KEY,
    FRIENDS_STORAGE_KEY,
    ROOMS_STORAGE_KEY,
    NOTIFICATIONS_STORAGE_KEY,
    FCM_DEVICE_ID_STORAGE_KEY,
    FCM_TOKEN_STORAGE_KEY,
    LIVE_TYPING_STORAGE_KEY,
    LEARNING_TEST_STORAGE_KEY,
    PROCESSED_FRIEND_REQUESTS_STORAGE_KEY
  ].forEach((key) => localStorage.removeItem(key));
}

function loadLocalSessionData() {
  rooms = loadFromStorage(ROOMS_STORAGE_KEY, []).filter((room) => room?.type === AI_ROOM_TYPE);
  friends = loadFromStorage(FRIENDS_STORAGE_KEY, []);
  notificationState = normalizeNotificationState(loadFromStorage(NOTIFICATIONS_STORAGE_KEY, {}));
  liveTypingByRoom = loadFromStorage(LIVE_TYPING_STORAGE_KEY, {});
  learningTestByRoom = loadFromStorage(LEARNING_TEST_STORAGE_KEY, {});
  processedFriendRequestIds = loadFromStorage(PROCESSED_FRIEND_REQUESTS_STORAGE_KEY, {});
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
}

function setupConnectivityDetection() {
  internetOnline = navigator.onLine !== false;
  document.body.classList.toggle("is-offline", !internetOnline);

  window.addEventListener("online", () => {
    internetOnline = true;
    document.body.classList.remove("is-offline");
    if (currentUser?.nick) updateUserHeader(firebaseReady ? "Online" : "Reconectando...");
    showToast("Internet conectada", "Acoes online foram liberadas novamente.");
    if (currentUser?.nick && !firebaseReady) {
      initFirebaseSession().catch((error) => console.warn("Nao foi possivel reconectar ao Firebase.", error));
    }
  });

  window.addEventListener("offline", () => {
    internetOnline = false;
    document.body.classList.add("is-offline");
    firebaseReady = false;
    firebaseInitPromise = null;
    updateUserHeader("Offline");
    showToast("Sem internet", "Ações online, tradução e IA ficam pausadas até a conexão voltar.");
  });
}

function setupBackgroundRuntime() {
  document.addEventListener("visibilitychange", handleBackgroundVisibilityChange);
  window.addEventListener("pagehide", startBackgroundRefresh);
  window.addEventListener("pageshow", handleForegroundResume);
  window.addEventListener("focus", handleForegroundResume);
}

function handleBackgroundVisibilityChange() {
  if (document.hidden) {
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

  runBackgroundRefresh({ foreground: true });
  markVisibleActiveRoomAsRead();
}

async function runBackgroundRefresh(options = {}) {
  if (backgroundRefreshInProgress || !currentUser?.nick || logoutInProgress || !isInternetAvailable()) return;

  backgroundRefreshInProgress = true;

  try {
    if (!firebaseReady || !currentFirebaseUid) {
      await initFirebaseSession();
    }

    if (!currentFirebaseUid) return;

    const [roomIndexSnapshot, receivedIndexSnapshot, sentIndexSnapshot] = await Promise.all([
      get(ref(db, `userRooms/${currentFirebaseUid}`)),
      get(ref(db, `userInvites/${currentFirebaseUid}/received`)),
      get(ref(db, `userInvites/${currentFirebaseUid}/sent`))
    ]);

    syncRoomSubscriptions(Object.keys(roomIndexSnapshot.val() || {}));
    syncInviteSubscriptions("received", Object.keys(receivedIndexSnapshot.val() || {}));
    syncInviteSubscriptions("sent", Object.keys(sentIndexSnapshot.val() || {}));

    if (options.foreground) {
      updateUserHeader("Online");
      renderAll();
    } else if (document.hidden) {
      updateUserHeader("Em segundo plano");
    }
  } catch (error) {
    firebaseInitPromise = null;
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

  if (startupNotice) {
    showToast(startupNotice.title, startupNotice.message);
  }
}

async function initFirebaseSession() {
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
    await preloadFirebaseInitialData();
    attachFirebaseListeners({ preserveCachedData: true });
    setupFirebaseMessagingForegroundListener().catch((error) => {
      console.warn("Nao foi possivel preparar mensagens FCM em primeiro plano.", error);
    });
    registerFcmTokenIfNotificationGranted();
    updateUserHeader("Online");
  })();

  return firebaseInitPromise;
}

async function preloadFirebaseInitialData() {
  if (!currentFirebaseUid) return;

  showSplash("Carregando salas e convites...");

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
  roomSnapshots
    .filter((snapshot) => snapshot?.exists())
    .forEach((snapshot) => {
      remoteRoomMap.set(snapshot.key, mapRoomSnapshot(snapshot));
    });

  remoteRooms = Array.from(remoteRoomMap.values());
  inviteSnapshotBuckets.received = receivedInviteSnapshots
    .filter((snapshot) => snapshot?.exists())
    .map(mapInviteSnapshot);
  inviteSnapshotBuckets.sent = sentInviteSnapshots
    .filter((snapshot) => snapshot?.exists())
    .map(mapInviteSnapshot);

  mergeInviteBuckets();
  validateActiveRoom();
  renderAll(true);
  tryOpenPendingNotificationRoom();
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

  roomMetadataUnsubscribers.forEach((unsubscribe) => unsubscribe());
  inviteUnsubscribers.received.forEach((unsubscribe) => unsubscribe());
  inviteUnsubscribers.sent.forEach((unsubscribe) => unsubscribe());

  unsubscribeRooms = null;
  unsubscribeReceivedInvites = null;
  unsubscribeSentInvites = null;
  unsubscribeMessages = null;
  unsubscribeTyping = null;
  activeMessagesRoomId = null;
  activeTypingRoomId = null;
  activeTypingUsers = [];
  roomMetadataUnsubscribers.clear();
  inviteUnsubscribers.received.clear();
  inviteUnsubscribers.sent.clear();
  if (!options.preserveCachedData) {
    remoteRoomMap.clear();
    inviteSnapshotBuckets.received = [];
    inviteSnapshotBuckets.sent = [];
  }
}

function syncRoomSubscriptions(roomIds) {
  const nextIds = new Set(roomIds);

  Array.from(remoteRoomMap.keys()).forEach((roomId) => {
    if (!nextIds.has(roomId)) {
      remoteRoomMap.delete(roomId);
      roomMessagesById.delete(roomId);
      renderedMessageIdsByRoom.delete(roomId);
    }
  });

  roomMetadataUnsubscribers.forEach((unsubscribe, roomId) => {
    if (!nextIds.has(roomId)) {
      unsubscribe();
      roomMetadataUnsubscribers.delete(roomId);
      remoteRoomMap.delete(roomId);
      roomMessagesById.delete(roomId);
      renderedMessageIdsByRoom.delete(roomId);
    }
  });

  roomIds.forEach((roomId) => {
    if (roomMetadataUnsubscribers.has(roomId)) return;

    const unsubscribe = onValue(
      ref(db, `rooms/${roomId}`),
      (snapshot) => {
        if (snapshot.exists()) {
          const initialSnapshot = !remoteRoomMap.has(roomId);
          const mappedRoom = mapRoomSnapshot(snapshot);
          remoteRoomMap.set(roomId, mappedRoom);
          handleRoomMessageNotification(mappedRoom, { initialSnapshot });
        } else {
          remoteRoomMap.delete(roomId);
        }

        remoteRooms = Array.from(remoteRoomMap.values());
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

  remoteRooms = Array.from(remoteRoomMap.values());
  validateActiveRoom();
  renderAll();
  tryOpenPendingNotificationRoom();
}

function syncInviteSubscriptions(bucket, inviteIds) {
  const nextIds = new Set(inviteIds);
  const bucketMap = inviteUnsubscribers[bucket];

  inviteSnapshotBuckets[bucket] = inviteSnapshotBuckets[bucket].filter((invite) => nextIds.has(invite.id));

  bucketMap.forEach((unsubscribe, inviteId) => {
    if (!nextIds.has(inviteId)) {
      unsubscribe();
      bucketMap.delete(inviteId);
      inviteSnapshotBuckets[bucket] = inviteSnapshotBuckets[bucket].filter((invite) => invite.id !== inviteId);
    }
  });

  inviteIds.forEach((inviteId) => {
    if (bucketMap.has(inviteId)) return;

    const unsubscribe = onValue(
      ref(db, `invites/${inviteId}`),
      (snapshot) => {
        inviteSnapshotBuckets[bucket] = inviteSnapshotBuckets[bucket].filter((invite) => invite.id !== inviteId);

        if (snapshot.exists()) {
          inviteSnapshotBuckets[bucket].push(mapInviteSnapshot(snapshot));
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

  mergeInviteBuckets();
  renderAll();
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
      nextMessages.sort((a, b) => a.time - b.time);
      roomMessagesById.set(activeRoom.id, nextMessages);

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
        const updatedAtMillis = Number(data.updatedAtMillis || 0);
        if (!updatedAtMillis || now - updatedAtMillis > 12000) return;
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
  typingInputTimer = setTimeout(() => {
    publishTypingStatus(activeRoom, cleanText);
  }, 180);

  scheduleTypingClear(3200);
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
    liveTypingButton.hidden = true;
    liveTypingButton.classList.toggle("is-active", Boolean(enabled));
    liveTypingButton.title = enabled
      ? "Digitação ao vivo ativada neste chat"
      : "Compartilhar texto digitado em tempo real";
    liveTypingButton.setAttribute("aria-label", liveTypingButton.title);
  }

  if (roomSettingsLiveTypingButton) {
    roomSettingsLiveTypingButton.hidden = !activeRoom || isAiRoom(activeRoom);
    roomSettingsLiveTypingButton.classList.toggle("is-active", Boolean(enabled));
    roomSettingsLiveTypingButton.setAttribute("aria-pressed", String(Boolean(enabled)));
    const span = roomSettingsLiveTypingButton.querySelector("span");
    const small = roomSettingsLiveTypingButton.querySelector("small");
    if (span) span.textContent = enabled ? "Ativado" : "Desativado";
    if (small) small.textContent = "Digitação ao vivo";
    roomSettingsLiveTypingButton.title = enabled
      ? "Desativar digitação ao vivo neste chat"
      : "Ativar digitação ao vivo neste chat";
  }

  if (roomSettingsClearChatButton) {
    roomSettingsClearChatButton.hidden = !activeRoom;
    const span = roomSettingsClearChatButton.querySelector("span");
    const small = roomSettingsClearChatButton.querySelector("small");
    const icon = roomSettingsClearChatButton.querySelector("i");
    if (span) span.textContent = activeRoom && isAiRoom(activeRoom) ? "Reiniciar IA" : "Limpar conversa";
    if (small) small.textContent = activeRoom && isAiRoom(activeRoom) ? "Recomeça o professor" : "Remove mensagens";
    if (icon) icon.className = activeRoom && isAiRoom(activeRoom) ? "fa-solid fa-rotate-right" : "fa-solid fa-broom";
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

  const language = getRoomLanguage(room);
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

function openProfileSettingsModal() {
  if (!profileSettingsModal || !currentUser?.nick) return;

  profileNickInput.value = currentUser.nick || "";
  if (profileNativeLanguageSelect) profileNativeLanguageSelect.value = getCurrentNativeLanguage().code;
  selectProfileSpaceAvatar(currentUser.avatarIcon || DEFAULT_SPACE_AVATAR_ICON);
  updateProfileSettingsPreview();
  updateProfileNotificationsButtonState();
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

  if (status === "granted") {
    profileNotificationsButton.disabled = true;
    updateProfileNotificationsButtonState("Registrando este navegador...");
    try {
      const token = await ensureFcmTokenRegistration({ force: true, showErrors: true });
      showToast(
        token ? "Notificacoes ja ativadas" : "Permissao ativada",
        token
          ? "Este navegador ja pode receber avisos pelo Firebase Cloud Messaging."
          : "O navegador permitiu notificacoes, mas o FCM ainda nao retornou token."
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

  try {
    const permission = await requestBrowserNotificationPermission();

    if (permission === "granted") {
      updateProfileNotificationsButtonState("Registrando este navegador...");
      const token = await ensureFcmTokenRegistration({ force: true, showErrors: true });
      showToast(
        token ? "Notificacoes ativadas" : "Permissao ativada",
        token
          ? "Voce recebera avisos de mensagens pelo Firebase Cloud Messaging."
          : "O navegador permitiu notificacoes, mas o FCM ainda nao retornou token."
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
  const vapidKeyValidation = getFcmVapidKeyValidation();
  if (status === "granted" && !vapidKeyValidation.valid) {
    config.title = "FCM pendente";
    config.detail = vapidKeyValidation.message;
    config.icon = "fa-solid fa-bell";
  } else if (status === "granted" && localStorage.getItem(FCM_TOKEN_STORAGE_KEY)) {
    config.detail = "Este navegador esta registrado no Firebase Cloud Messaging.";
  }
  const icon = profileNotificationsButton.querySelector("i");
  const title = profileNotificationsButton.querySelector("strong");

  if (icon) icon.className = config.icon;
  if (title) title.textContent = config.title;
  profileNotificationsStatus.textContent = statusOverride || config.detail;
  profileNotificationsButton.disabled = Boolean(statusOverride) ? true : config.disabled;
  profileNotificationsButton.classList.toggle("is-enabled", status === "granted");
  profileNotificationsButton.classList.toggle("is-blocked", status === "denied" || status === "unsupported" || status === "insecure");
}

async function saveProfileSettings(event) {
  event.preventDefault();
  if (!currentUser) return;

  const nextNick = sanitizeText(profileNickInput.value, 24);
  const nextAvatarIcon = getSelectedProfileSpaceAvatarIcon();
  const nextNativeLanguage = getSelectedNativeLanguage(profileNativeLanguageSelect?.value || getCurrentNativeLanguage().code);

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

  saveUser(currentUser);
  updateUserHeader();
  ensureUserAiRoom();
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
  if (profilePreviewLanguage) profilePreviewLanguage.textContent = `Idioma nativo: ${nativeLanguage.label}`;
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
      name: AI_TEACHER_NAME,
      avatar: "IA",
      description: "Treine inglês, espanhol e outros idiomas com uma IA professora.",
      status: "Professor de idiomas · Pollinations.ai",
      color: "linear-gradient(135deg, #6d5dfc, #10b486)",
      ownerNick: currentUser.nick,
      members: [currentUser.nick, AI_TEACHER_NAME],
      messages: [createAiWelcomeMessage()],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    rooms.push(aiRoom);
    changed = true;
  }

  if (!aiRoom.messages?.length) {
    aiRoom.messages = [createAiWelcomeMessage()];
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
  notificationBadge.textContent = totalNotifications > 99 ? "99+" : String(totalNotifications);
  notificationBadge.hidden = totalNotifications === 0;
  notificationsButton.classList.toggle("has-pending", totalNotifications > 0);
  notificationsButton.title = totalNotifications
    ? `${totalNotifications} notificação${totalNotifications > 1 ? "es" : ""}: ${pendingInvites} convite${pendingInvites !== 1 ? "s" : ""}, ${unreadMessages} mensagem${unreadMessages !== 1 ? "s" : ""} não lida${unreadMessages !== 1 ? "s" : ""}`
    : "Pedidos e convites";
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
  return [
    {
      key: "assistant",
      title: "Professor IA",
      icon: "fa-solid fa-language",
      rooms: sortedRooms.filter((room) => isAiRoom(room))
    },
    {
      key: "private",
      title: "Conversas privadas",
      icon: "fa-solid fa-comment",
      rooms: sortedRooms.filter((room) => !isAiRoom(room) && isPrivateRoom(room))
    },
    {
      key: "rooms",
      title: "Salas",
      icon: "fa-solid fa-door-open",
      rooms: sortedRooms.filter((room) => !isAiRoom(room) && !isPrivateRoom(room))
    }
  ].filter((group) => group.rooms.length);
}

function sortRoomsForList(a, b) {
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
  item.classList.toggle("private-room", isPrivateRoom(room));
  item.classList.toggle("group-room", !isAiRoom(room) && !isPrivateRoom(room));
  paintRoomAvatar(avatar, room);
  name.textContent = getRoomDisplayName(room);
  updateRoomItemContent(item, room);

  item.addEventListener("click", () => {
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
  });

  return item;
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
    updateLearningTestButtonState(null);
    return;
  }

  const isAi = isAiRoom(activeRoom);
  activeRoomId = activeRoom.id;
  paintRoomAvatar(activeAvatar, activeRoom);
  activeName.textContent = getRoomDisplayName(activeRoom);
  activeStatus.textContent = getRoomStatus(activeRoom);
  if (isRoomCurrentlyVisible(activeRoom.id)) {
    markRoomAsRead(activeRoom);
  }
  renderReplyPreview();
  inviteButton.hidden = isAi;
  roomMenuButton.hidden = isAi;
  updateLiveTypingButtonState();
  subscribeToActiveRoomTyping();
  if (clearChatButton) {
    clearChatButton.hidden = true;
    clearChatButton.title = isAi ? "Reiniciar conversa" : "Limpar conversa deste chat";
    clearChatButton.setAttribute("aria-label", isAi ? "Reiniciar conversa" : "Limpar conversa deste chat");
  }
  updateMessageInputPlaceholder(activeRoom);
  updateLearningTestButtonState(activeRoom);

  if (forceMessages || messages.dataset.roomId !== activeRoom.id) {
    messages.innerHTML = "";
    messages.dataset.roomId = activeRoom.id;
    renderedMessageIdsByRoom.set(activeRoom.id, new Set());
  }

  renderRoomMessages(activeRoom);
}

async function closeMobileConversationToMenu() {
  appShell.classList.remove("chat-open");

  if (!isMobileLayout()) return;

  await clearCurrentTypingStatus();
  activeRoomId = null;
  suppressAutoRoomSelection = true;
  clearReplyTarget();
  subscribeToActiveRoomMessages();
  renderRoomList(searchInput.value);
  renderActiveRoom(true);
}

function renderRoomMessages(room) {
  if (!room) return;

  const roomMessages = room.messages || [];
  let renderedIds = renderedMessageIdsByRoom.get(room.id);

  if (!renderedIds) {
    renderedIds = new Set();
    renderedMessageIdsByRoom.set(room.id, renderedIds);
  }

  if (roomMessages.length < renderedIds.size) {
    messages.innerHTML = "";
    renderedIds.clear();
  }

  if (!roomMessages.length) {
    if (!renderedIds.size && !messages.querySelector(".empty-state")) {
      renderEmptyConversation();
    }
    renderTypingPreviewPanel();
    return;
  }

  const emptyState = messages.querySelector(".empty-state");
  if (emptyState) emptyState.remove();

  const wasNearBottom = isMessagesNearBottom();
  const isFirstBatch = renderedIds.size === 0;
  const fragment = document.createDocumentFragment();
  let appended = 0;

  removeLiveTypingRows();

  roomMessages.forEach((message, index) => {
    const messageId = message.id || createId("msg");
    message.id = messageId;
    const previousMessage = roomMessages[index - 1] || null;
    const groupedWithPrevious = shouldGroupMessageWithPrevious(previousMessage, message);
    const signature = `${getMessageSignature(message)}|group:${groupedWithPrevious ? "1" : "0"}`;

    if (renderedIds.has(messageId)) {
      const currentElement = messages.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
      if (currentElement && currentElement.dataset.signature !== signature) {
        const replacement = createMessageElement(message, false, { groupedWithPrevious });
        replacement.dataset.signature = signature;
        currentElement.replaceWith(replacement);
      }
      return;
    }

    const element = createMessageElement(message, !isFirstBatch, { groupedWithPrevious });
    element.dataset.signature = signature;
    fragment.appendChild(element);
    renderedIds.add(messageId);
    appended += 1;
  });

  if (appended) {
    messages.appendChild(fragment);
  }

  renderTypingPreviewPanel();

  if (appended && (isFirstBatch || wasNearBottom)) {
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

async function sendFirebaseMessage(room, text, options = {}) {
  if (!requireFirebaseConnection("enviar mensagem")) {
    throw new Error("Sem internet ou Firebase desconectado.");
  }

  if (!firebaseReady || !currentFirebaseUid) {
    throw new Error("Firebase ainda não conectado.");
  }

  const now = Date.now();
  const cleanText = cleanMessageText(text);
  const language = getRoomLanguage(room);
  const skipTranslation = Boolean(options.skipTranslation);
  const learningTest = Boolean(options.learningTest);
  const learningFeedback = normalizeLearningFeedback(options.learningFeedback);
  let translatedText = "";
  let translationError = false;

  if (language?.code && !skipTranslation) {
    try {
      translatedText = await translateMessageText(cleanText, language);
    } catch (error) {
      console.warn("Não foi possível traduzir a mensagem antes de salvar.", error);
      translatedText = "";
      translationError = false;
    }
  }

  const displayText = translatedText || cleanText;
  const hasDeliveredTranslation = Boolean(language?.code && !skipTranslation && translatedText && translatedText !== cleanText);
  const replyPayload = getReplyPayloadForMessage();
  const messageRef = push(ref(db, `rooms/${room.id}/messages`));
  const message = {
    id: messageRef.key,
    text: displayText,
    originalText: hasDeliveredTranslation ? cleanText : "",
    translatedText: hasDeliveredTranslation ? displayText : "",
    targetLanguageCode: language?.code || "",
    targetLanguageName: language?.name || "",
    learningTest,
    translationDisabled: skipTranslation,
    translationError,
    authorUid: currentFirebaseUid,
    authorNick: currentUser?.nick || "Você",
    authorAvatar: currentUser?.avatar || getInitials(currentUser?.nick || "Você"),
    authorAvatarIcon: getSafeSpaceAvatarIcon(currentUser?.avatarIcon),
    time: now,
    createdAt: serverTimestamp(),
    createdAtMillis: now
  };

  if (learningFeedback) {
    message.learningFeedback = learningFeedback;
  }

  if (replyPayload) {
    message.replyTo = replyPayload;
  }

  await update(ref(db), {
    [`rooms/${room.id}/messages/${messageRef.key}`]: message,
    [`rooms/${room.id}/lastMessage`]: displayText,
    [`rooms/${room.id}/lastMessageId`]: messageRef.key,
    [`rooms/${room.id}/lastOriginalMessage`]: hasDeliveredTranslation ? cleanText : "",
    [`rooms/${room.id}/lastMessageAuthorUid`]: currentFirebaseUid,
    [`rooms/${room.id}/lastMessageAuthorNick`]: message.authorNick,
    [`rooms/${room.id}/lastMessageAt`]: now,
    [`rooms/${room.id}/updatedAt`]: serverTimestamp(),
    [`rooms/${room.id}/updatedAtMillis`]: now
  });

  syncLocalSentFirebaseMessage(room, message, {
    displayText,
    originalText: hasDeliveredTranslation ? cleanText : "",
    sentAt: now
  });
  clearReplyTarget();
  markRoomAsRead(room);
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
    lastMessageAt: sentAt,
    updatedAt: sentAt,
    messages: messagesForRoom
  };

  remoteRoomMap.set(room.id, updatedRoom);
  remoteRooms = Array.from(remoteRoomMap.values());

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

  nextMessages.sort((a, b) => a.time - b.time);
  roomMessagesById.set(roomId, nextMessages);
  return nextMessages;
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
  row.dataset.messageId = message.id || "";
  row.dataset.signature = getMessageSignature(message);
  stack.className = "message-stack";
  bubble.className = `bubble${animated ? " is-new" : ""}`;
  time.textContent = formatTime(message.time);

  const hydration = getCurrentUserHydration(message);
  const hasHydration = Boolean(hydration?.text);
  const learningFeedback = getVisibleLearningFeedback(message);
  let translatedBlock = null;

  if (learningFeedback) {
    bubble.classList.add("has-learning-feedback");
  }

  const topBar = createMessageTopBar(message, isMine, !groupedWithPrevious);
  if (topBar) bubble.appendChild(topBar);

  if (message.replyTo) {
    bubble.appendChild(createReplyQuoteElement(message.replyTo));
  }

  if (hasHydration) {
    bubble.classList.add("is-hydrated-message");
    const gooeyEffect = createHydratedGooeyDropsEffectElement();
    bubble.appendChild(gooeyEffect);
    scheduleHydratedGooeyDropsPopulation(gooeyEffect);
    translatedBlock = createHydratedMessageBlock(message, hydration);
    bubble.appendChild(translatedBlock.wrapper);
  } else if (hasTranslation) {
    translatedBlock = createTranslatedMessageBlock(message, isMine);
    bubble.appendChild(translatedBlock.wrapper);
  } else {
    const text = document.createElement("p");
    text.className = "message-text";
    text.textContent = message.text || message.originalText || "";
    bubble.appendChild(text);
  }

  if (learningFeedback) {
    bubble.appendChild(createLearningFeedbackElement(learningFeedback));
  }

  if (message.translationError) {
    const warning = document.createElement("span");
    warning.className = "translation-warning";
    warning.textContent = "Tradução indisponível no envio";
    bubble.appendChild(warning);
  }

  footer.className = "message-footer";
  const messageTools = translatedBlock
    ? createMessageFooterTools(message, translatedBlock)
    : isLearningTestMessage(message)
      ? createLearningTestMessageFooterTools(message)
      : null;

  if (messageTools) {
    footer.classList.add("has-message-tools");
    footer.append(messageTools, time);
  } else {
    footer.appendChild(time);
  }

  bubble.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input, textarea, select, .reaction-picker, .message-menu")) return;
    if (row.dataset.swipedRecently === "1") return;
    event.stopPropagation();
    openMessageMenu(message, row, bubble);
  });

  bubble.appendChild(footer);
  stack.appendChild(bubble);

  const reactionSummary = createReactionSummaryElement(message);
  if (reactionSummary) {
    stack.appendChild(reactionSummary);
  }

  row.appendChild(stack);
  setupSwipeReply(row, bubble, message);
  return row;
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

const DEHYDRATE_EFFECT_DURATION_MS = 980;
const DEHYDRATED_DUST_SETTINGS = Object.freeze({
  count: 20,
  minSize: 5,
  maxSize: 12,
  maxDelay: 0.28,
  minRise: 12,
  maxRise: 34,
  maxDrift: 30,
  minBlur: 4,
  maxBlur: 11,
  minScale: 0.12,
  maxScale: 0.38
});

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

  const dustEffect = createDehydratedDustEffectElement();
  bubble.appendChild(dustEffect);
  populateDehydratedDust(dustEffect);

  let cleanupTimer = window.setTimeout(cleanup, DEHYDRATE_EFFECT_DURATION_MS + 6000);
  const ready = new Promise((resolve) => window.setTimeout(resolve, DEHYDRATE_EFFECT_DURATION_MS));

  function cleanup() {
    if (cleanupTimer) {
      window.clearTimeout(cleanupTimer);
      cleanupTimer = 0;
    }
    dustEffect.remove();
    bubble.classList.remove("is-dehydrating-message");
  }

  return {
    ready,
    cancel: cleanup,
    complete() {
      if (cleanupTimer) window.clearTimeout(cleanupTimer);
      cleanupTimer = window.setTimeout(cleanup, 1200);
    }
  };
}

function getRenderedMessageBubble(message) {
  const messageId = message?.id || "";
  if (!messageId || !messages) return null;

  return messages.querySelector(`.message-row[data-message-id="${CSS.escape(messageId)}"] .bubble`);
}

function createDehydratedDustEffectElement() {
  const effect = document.createElement("div");
  const sun = document.createElement("div");
  const heat = document.createElement("div");
  const layer = document.createElement("div");

  effect.className = "dehydrated-dust-effect";
  effect.setAttribute("aria-hidden", "true");
  sun.className = "dehydrated-sun";
  heat.className = "dehydrated-heat-haze";
  layer.className = "dehydrated-dust-layer";
  effect.appendChild(sun);
  effect.appendChild(heat);
  effect.appendChild(layer);
  return effect;
}

function populateDehydratedDust(effect) {
  const layer = effect?.querySelector(".dehydrated-dust-layer");
  if (!layer) return;

  layer.innerHTML = "";

  for (let index = 0; index < DEHYDRATED_DUST_SETTINGS.count; index += 1) {
    layer.appendChild(createDehydratedDustGrain());
  }
}

function createDehydratedDustGrain() {
  const grain = document.createElement("span");
  const size =
    DEHYDRATED_DUST_SETTINGS.minSize +
    Math.random() * (DEHYDRATED_DUST_SETTINGS.maxSize - DEHYDRATED_DUST_SETTINGS.minSize);
  const left = 8 + Math.random() * 84;
  const top = 16 + Math.random() * 68;
  const delay = Math.random() * DEHYDRATED_DUST_SETTINGS.maxDelay;
  const driftX = (Math.random() - 0.5) * DEHYDRATED_DUST_SETTINGS.maxDrift;
  const rise =
    DEHYDRATED_DUST_SETTINGS.minRise +
    Math.random() * (DEHYDRATED_DUST_SETTINGS.maxRise - DEHYDRATED_DUST_SETTINGS.minRise);
  const blur =
    DEHYDRATED_DUST_SETTINGS.minBlur +
    Math.random() * (DEHYDRATED_DUST_SETTINGS.maxBlur - DEHYDRATED_DUST_SETTINGS.minBlur);
  const scale =
    DEHYDRATED_DUST_SETTINGS.minScale +
    Math.random() * (DEHYDRATED_DUST_SETTINGS.maxScale - DEHYDRATED_DUST_SETTINGS.minScale);

  grain.className = "dehydrated-dust-grain dehydrated-dry-drop";
  grain.style.setProperty("--size", `${size.toFixed(2)}px`);
  grain.style.setProperty("--drop-height", `${(size * 1.32).toFixed(2)}px`);
  grain.style.setProperty("--left", `${left.toFixed(2)}%`);
  grain.style.setProperty("--top", `${top.toFixed(2)}%`);
  grain.style.setProperty("--delay", `${delay.toFixed(3)}s`);
  grain.style.setProperty("--drift-x", `${driftX.toFixed(2)}px`);
  grain.style.setProperty("--drift-mid", `${(driftX * 0.45).toFixed(2)}px`);
  grain.style.setProperty("--rise", `${rise.toFixed(2)}px`);
  grain.style.setProperty("--rise-mid", `${(rise * 0.45).toFixed(2)}px`);
  grain.style.setProperty("--blur-end", `${blur.toFixed(2)}px`);
  grain.style.setProperty("--scale-end", scale.toFixed(2));
  return grain;
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

function createMessageFooterTools(message, blockInfo) {
  const originalWrap = blockInfo?.originalWrap || blockInfo;
  const translationWrap = blockInfo?.translationWrap || null;
  if (!originalWrap && !translationWrap) return null;

  const tools = document.createElement("div");
  tools.className = "message-footer-tools";

  if (originalWrap) {
    const toggleOriginal = document.createElement("button");
    toggleOriginal.className = "show-original-button translated-tool-button subtle-message-tool";
    toggleOriginal.type = "button";
    updateOriginalToggleButton(toggleOriginal, originalWrap.hidden);
    toggleOriginal.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleOriginalTextVisibility(message, originalWrap, toggleOriginal);
    });
    tools.appendChild(toggleOriginal);
  }

  if (translationWrap) {
    const toggleTranslation = document.createElement("button");
    toggleTranslation.className = "show-translation-button translated-tool-button subtle-message-tool";
    toggleTranslation.type = "button";
    updateTranslationToggleButton(toggleTranslation, translationWrap.hidden);
    toggleTranslation.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleTranslationTextVisibility(message, translationWrap, toggleTranslation);
    });
    tools.appendChild(toggleTranslation);
  }

  tools.appendChild(createListenMessageButton(message));
  return tools;
}

function createLearningTestMessageFooterTools(message) {
  const tools = document.createElement("div");
  tools.className = "message-footer-tools";
  tools.appendChild(createListenMessageButton(message));
  return tools;
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
  translated.textContent = message.translatedText;

  divider.className = "message-divider";
  originalWrap.className = "message-original-wrap";
  originalWrap.dataset.revealKey = revealKey;
  original.className = "message-original";
  original.textContent = message.originalText;

  originalWrap.append(divider, original);
  originalWrap.hidden = shouldHideOriginal;

  wrapper.append(translated, originalWrap);
  return { wrapper, originalWrap };
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

function createListenMessageButton(message) {
  const button = document.createElement("button");
  button.className = "listen-message-button translated-tool-button";
  button.type = "button";
  button.title = "Reproduzir mensagem em áudio";
  button.setAttribute("aria-label", "Reproduzir mensagem em áudio");
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

  const reactionAnchor = createMenuButton("fa-regular fa-face-smile", "Reagir", () => {
    closeMessageMenus();
    toggleReactionPicker(message, bubble, null);
  });

  const replyAction = createMenuButton("fa-solid fa-reply", "Responder", () => {
    closeMessageMenus();
    selectReplyTarget(message);
  });

  const listenAction = createMenuButton("fa-solid fa-volume-high", "Ouvir", () => {
    closeMessageMenus();
    speakMessage(message);
  });

  menu.append(reactionAnchor, replyAction, listenAction);

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

  document.body.appendChild(menu);
  positionFloatingMenu(menu, bubble);
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

function stopSpeaking() {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  activeSpeechUtterance = null;
}

function speakMessage(message) {
  const text = getMessageAudioText(message);
  if (!text) return;

  if (!("speechSynthesis" in window)) {
    showToast("Áudio indisponível", "Este navegador não tem suporte ao sistema de voz.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getSpeechLanguageForMessage(message);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  activeSpeechUtterance = utterance;
  utterance.onend = () => {
    if (activeSpeechUtterance === utterance) activeSpeechUtterance = null;
  };
  utterance.onerror = () => {
    if (activeSpeechUtterance === utterance) activeSpeechUtterance = null;
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
      await reactToMessage(message, emoji);
      closeReactionPickers();
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

  bubble.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, a, input, textarea, select")) return;
    closeMessageMenus();
    startX = event.clientX;
    startY = event.clientY;
    deltaX = 0;
    dragging = false;
    pointerId = event.pointerId;
    if (bubble.setPointerCapture) bubble.setPointerCapture(event.pointerId);
  });

  bubble.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;
    const moveX = event.clientX - startX;
    const moveY = event.clientY - startY;
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

  function finishSwipe() {
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
    text: message.text || "",
    originalText: message.originalText || "",
    translatedText: message.translatedText || "",
    targetLanguageCode: message.targetLanguageCode || "",
    learningTest: Boolean(message.learningTest),
    translationDisabled: Boolean(message.translationDisabled),
    learningFeedback: message.learningFeedback || {},
    translationError: Boolean(message.translationError),
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
  const empty = isAiRoom(activeRoom)
    ? createEmptyState(
      "fa-solid fa-language",
      "Professor IA pronto",
      "Pergunte algo como: Quero treinar inglês básico, corrija minha frase ou crie um diálogo em espanhol."
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
  renderRoomUnreadBadge(item, unreadCount);
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

  const unreadRooms = getVisibleRooms()
    .filter((room) => getUnreadCount(room.id) > 0)
    .sort((a, b) => getLastTime(b) - getLastTime(a));

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

  if (!friend?.uid || !currentFirebaseUid) return;

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
  if (!activeRoom || isAiRoom(activeRoom)) return;

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
  if (!room || isAiRoom(room)) return;

  const isOwner = isRoomOwner(room);
  const language = getRoomLanguage(room);
  roomSettingsSubtitle.textContent = `${getRoomDisplayName(room)} · ${isOwner ? "você criou esta sala" : "participante"}`;
  roomSettingsLanguageSelect.value = language?.code || "";
  saveRoomLanguageButton.disabled = !firebaseReady;
  updateLiveTypingButtonState();
  // roomDeleteHint.textContent = isOwner
  //   ? "Você criou esta sala. Excluir remove a sala para todos."
  //   : "Você não criou esta sala. Você pode sair/remover esta sala da sua lista.";
  deleteRoomButton.querySelector("span").textContent = isOwner ? "Excluir sala para todos" : "Sair da sala";
  deleteRoomButton.querySelector("i").className = isOwner ? "fa-solid fa-trash-can" : "fa-solid fa-right-from-bracket";

  renderRoomMembers(room);
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
  if (!room || isAiRoom(room)) return;
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
  if (!room || isAiRoom(room)) return;

  if (isRoomOwner(room)) {
    await deleteActiveRoomForEveryone(room);
  } else {
    await leaveActiveRoom(room);
  }
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

function openInviteModal() {
  const activeRoom = getActiveRoom();
  if (!activeRoom || isAiRoom(activeRoom)) return;
  if (!requireFirebaseConnection("convidar usuarios")) return;

  const availableFriends = friends.filter((friend) => friend.uid && !isFriendLinkedToRoom(friend.uid, activeRoom));
  inviteNickInput.value = "";
  inviteSearchResult.innerHTML = "";
  inviteModalSubtitle.textContent = `Sala: ${getRoomDisplayName(activeRoom)}`;
  renderFriendCheckboxes(inviteFriendsList, availableFriends, "Nenhum amigo disponível. Busque um usuário pelo nick acima para convidar.");
  inviteModal.hidden = false;
  inviteModal.setAttribute("aria-hidden", "false");
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
  return lastMessage?.time || room.lastMessageAt || room.updatedAt || room.createdAt || 0;
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
  const content = await askPollinationsForJson(systemPrompt, text, 0.15, 700);
  const parsed = parseJsonFromAi(content);
  const correctedText = cleanMessageText(parsed?.correctedText || parsed?.corrected || "", 800) || text;
  const errors = Array.isArray(parsed?.errors)
    ? parsed.errors.map((item) => ({
      original: sanitizeText(item?.original || item?.word || item?.erro || "", 80),
      correction: sanitizeText(item?.correction || item?.correct || item?.correcao || "", 100),
      explanationEnglish: sanitizeText(item?.explanationEnglish || item?.explanation || item?.reason || item?.explicacao || "", 240)
    })).filter((item) => item.original || item.correction || item.explanationEnglish).slice(0, 8)
    : [];

  return { correctedText, errors, raw: content };
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
  const content = await askPollinationsForJson(systemPrompt, text, 0.55, 600);
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
  const content = await askPollinationsForJson(systemPrompt, text, 0.2, 700);
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
  const clean = cleanMessageText(text);
  if (!clean || !language?.code) return clean;
  if (!requireInternet("traduzir mensagens")) {
    throw new Error("Sem internet para traduzir.");
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
    if (translated) return translated;
  } catch (error) {
    console.warn("Endpoint de tradução por chat indisponível, tentando endpoint simples.", error);
  }

  const params = new URLSearchParams({
    model: "openai",
    temperature: "0.1",
    system: `Traduza para ${language.name}. Responda somente com a tradução.`
  });
  const prompt = `Traduza a mensagem abaixo para ${language.name}. Responda somente com a tradução:\n\n${clean}`;
  const response = await fetch(`${POLLINATIONS_TEXT_ENDPOINT}${encodeURIComponent(prompt)}?${params.toString()}`);

  if (!response.ok) throw new Error(`Resposta HTTP ${response.status}`);

  const translated = cleanAiText(await response.text()).replace(/^['"]|['"]$/g, "");
  if (!translated) throw new Error("Tradução vazia.");
  return translated;
}

function createAiWelcomeMessage() {
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
  if (!requireInternet("conversar com o Professor IA")) return;

  const replyPayload = getReplyPayloadForMessage();
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
      author: AI_TEACHER_NAME,
      text: reply,
      time: Date.now()
    });
  } catch (error) {
    console.warn("Erro ao consultar Pollinations.ai", error);
    removeAiTypingIndicator(room.id);
    addMessage(room.id, {
      from: "ai",
      author: AI_TEACHER_NAME,
      text: "Não consegui acessar a Pollinations.ai agora. Verifique sua conexão e tente novamente. Enquanto isso, uma boa prática é escrever uma frase simples no idioma que você quer estudar e depois pedir correção quando a conexão voltar.",
      time: Date.now()
    });
  } finally {
    setAiLoading(false);
  }
}

async function requestLanguageAiReply(room) {
  if (!requireInternet("conversar com o Professor IA")) {
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
  if (!requireInternet("conversar com o Professor IA")) {
    throw new Error("Sem internet para usar a IA.");
  }

  const params = new URLSearchParams({
    model: "openai",
    temperature: "0.7",
    system: AI_SYSTEM_PROMPT
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
      content: message.text
    }));

  return [
    {
      role: "system",
      content: `${AI_SYSTEM_PROMPT}\nNome do aluno: ${studentName}.`
    },
    ...recentMessages
  ];
}

function buildPlainAiPrompt(room) {
  const studentName = currentUser?.nick || "aluno";
  const history = room.messages
    .filter((message) => message.from === "me" || message.from === "ai")
    .slice(-10)
    .map((message) => `${message.from === "me" ? studentName : AI_TEACHER_NAME}: ${message.text}`)
    .join("\n");

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
  author.textContent = AI_TEACHER_NAME;
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

function mapRoomSnapshot(roomSnapshot) {
  const data = roomSnapshot.val() || {};
  const roomId = roomSnapshot.key;
  let messagesForRoom = roomMessagesById.get(roomId) || [];
  const snapshotMessages = mapRoomMessagesFromData(data.messages);

  if (snapshotMessages.length) {
    const currentLastId = messagesForRoom.at(-1)?.id || "";
    const snapshotLastId = snapshotMessages.at(-1)?.id || "";

    if (!messagesForRoom.length || currentLastId !== snapshotLastId || snapshotMessages.length > messagesForRoom.length) {
      messagesForRoom = snapshotMessages;
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
    lastMessageAt: getRealtimeMillis(data.lastMessageAt, data.createdAtMillis || Date.now()),
    createdAt: getRealtimeMillis(data.createdAt, data.createdAtMillis || Date.now()),
    updatedAt: getRealtimeMillis(data.updatedAt, data.updatedAtMillis || data.createdAtMillis || Date.now()),
    messages: messagesForRoom
  };
}

function mapRoomMessagesFromData(messagesData) {
  if (!messagesData || typeof messagesData !== "object") return [];

  return Object.entries(messagesData)
    .map(([messageId, data]) => mapMessageData(messageId, data || {}))
    .sort((a, b) => a.time - b.time);
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
  return {
    id: messageId,
    text: data.text || "",
    originalText: data.originalText || "",
    translatedText: data.translatedText || "",
    targetLanguageCode: data.targetLanguageCode || "",
    targetLanguageName: data.targetLanguageName || "",
    learningTest: Boolean(data.learningTest),
    translationDisabled: Boolean(data.translationDisabled),
    learningFeedback: normalizeLearningFeedback(data.learningFeedback),
    translationError: Boolean(data.translationError),
    replyTo: data.replyTo || null,
    reactions: normalizeMessageReactions(data.reactions),
    hydration: normalizeMessageHydration(data.hydration),
    hydrations: normalizeMessageHydrations(data.hydrations),
    authorUid: data.authorUid || "",
    authorNick: data.authorNick || data.author || "Usuário",
    author: data.authorNick || data.author || "Usuário",
    authorAvatar: data.authorAvatar || getInitials(data.authorNick || "Usuário"),
    authorAvatarIcon: getSafeSpaceAvatarIcon(data.authorAvatarIcon),
    time: data.time || getRealtimeMillis(data.createdAt, data.createdAtMillis || Date.now()),
    createdAt: getRealtimeMillis(data.createdAt, data.createdAtMillis || data.time || Date.now())
  };
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
  if (!value) return fallback || Date.now();
  if (typeof value === "number") return value;
  if (value.seconds) return value.seconds * 1000;
  return fallback || Date.now();
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

function isLearningTestMessage(message) {
  return Boolean(message?.learningTest || message?.translationDisabled);
}

function getAiRoomId(nick) {
  const slug = normalize(nick).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "usuario";
  return `ai-room-${slug}`;
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
    notifiedMessageKeys: Array.isArray(value.notifiedMessageKeys) ? value.notifiedMessageKeys : [],
    lastSeenByRoom: value.lastSeenByRoom && typeof value.lastSeenByRoom === "object" ? value.lastSeenByRoom : {},
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
    showToast(
      title,
      body,
      "Ver pedidos",
      () => {
        openNotificationsModal();
      }
    );
    showBrowserNotification(title, body, { tag: `invite:${invite.id}` });
    playNotificationSound();
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

  const lastSeen = Number(notificationState.lastSeenByRoom?.[room.id] || 0);

  if (lastMessageAt <= lastSeen) return;

  const key = getMessageNotificationKey({
    roomId: room.id,
    messageId: room.lastMessageId,
    lastMessageAt,
    authorUid: room.lastMessageAuthorUid
  });
  const notified = new Set(notificationState.notifiedMessageKeys || []);
  const wasAlreadyNotified = notified.has(key);
  const isInitialSnapshot = options.initialSnapshot === true;
  const isRecentInitialSnapshot = isInitialSnapshot && Date.now() - lastMessageAt < 10 * 60 * 1000;

  notificationState.unreadByRoom[room.id] = Math.max(1, Number(notificationState.unreadByRoom?.[room.id] || 0) + (wasAlreadyNotified ? 0 : 1));

  if (!wasAlreadyNotified && (!isInitialSnapshot || isRecentInitialSnapshot)) {
    const author = room.lastMessageAuthorNick || "Alguém";
    const text = truncateText(room.lastMessage || "Nova mensagem", 120);
    showToast(
      `Nova mensagem de ${author}`,
      `${getRoomDisplayName(room)}: ${text}`,
      "Abrir",
      () => openRoomFromNotification(room.id)
    );
    showBrowserNotification(`Nova mensagem de ${author}`, `${getRoomDisplayName(room)}: ${text}`, {
      tag: key,
      roomId: room.id
    });
    playNotificationSound();
  }

  if (!wasAlreadyNotified) notified.add(key);

  notificationState.notifiedMessageKeys = Array.from(notified).slice(-200);
  saveNotificationState();
  updateBadges();
}

function getMessageNotificationKey({ roomId, messageId = "", lastMessageAt = "", authorUid = "" } = {}) {
  return `${roomId || "room"}:${messageId || lastMessageAt || "message"}:${authorUid || "user"}`;
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
  const notified = new Set(notificationState.notifiedMessageKeys || []);
  const wasAlreadyNotified = notified.has(key);
  const room = getVisibleRooms().find((item) => item.id === roomId) || null;

  if (isRoomCurrentlyVisible(roomId)) {
    markRoomAsRead({ ...(room || { id: roomId }), lastMessageAt: timestamp });
    return;
  }

  if (!wasAlreadyNotified) {
    notificationState.unreadByRoom[roomId] = Math.max(1, Number(notificationState.unreadByRoom?.[roomId] || 0) + 1);
    notified.add(key);
    notificationState.notifiedMessageKeys = Array.from(notified).slice(-200);
    saveNotificationState();
    updateBadges();
    renderRoomList(searchInput.value);
    refreshNotificationsModalIfOpen();

    if (!options.silentSystemNotification) {
      const title = data.title || `Nova mensagem de ${data.authorNick || "Alguem"}`;
      const body = data.body || `${data.roomName || getRoomDisplayName(room) || "AstroChat"}: Nova mensagem`;
      showToast(title, body, "Abrir", () => openRoomFromNotification(roomId));
      showBrowserNotification(title, body, {
        tag: key,
        roomId,
        messageId: data.messageId || "",
        timestamp
      });
      playNotificationSound();
    }
    return;
  }

  saveNotificationState();
  updateBadges();
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

    if (data.type === "ASTROCHAT_PUSH_RECEIVED") {
      handleForegroundFcmChatMessage({ data: data.payloadData || {} }, { silentSystemNotification: true });
    }
  });
}

function getInitialNotificationRoomId() {
  if (!location.hash) return "";

  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  const params = new URLSearchParams(hash);
  return sanitizeNotificationRoomId(params.get("room") || "");
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

function getRoomNotificationUrl(roomId) {
  const url = new URL(window.location.href);
  url.hash = `room=${encodeURIComponent(roomId)}`;
  return url.href;
}

function markRoomAsRead(room) {
  if (!room?.id || isAiRoom(room)) return;

  const lastMessageAt = Number(room.lastMessageAt || room.updatedAt || 0);
  notificationState.lastSeenByRoom[room.id] = Math.max(Number(notificationState.lastSeenByRoom?.[room.id] || 0), lastMessageAt);
  notificationState.unreadByRoom[room.id] = 0;
  saveNotificationState();
  updateBadges();
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
  window.addEventListener("pointerdown", unlockNotificationSound, { once: true, passive: true });
  window.addEventListener("touchstart", unlockNotificationSound, { once: true, passive: true });
  window.addEventListener("keydown", unlockNotificationSound, { once: true });
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
      pendingNotificationSound = false;
      window.setTimeout(playNotificationSound, 0);
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

function playNotificationSound() {
  if ("vibrate" in navigator) {
    navigator.vibrate([45, 35, 45]);
  }

  let context;
  try {
    context = getNotificationAudioContext();
  } catch (error) {
    return;
  }

  if (context.state !== "running") {
    pendingNotificationSound = true;
    unlockNotificationSound();
    return;
  }

  try {
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.setValueAtTime(1175, now + 0.11);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.13, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  } catch (error) {
    console.warn("Nao foi possivel tocar o som de notificacao.", error);
  }
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

function showBrowserNotification(title, body, data = {}) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const options = {
    body,
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: data.tag || title,
    renotify: true,
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
    } catch (error) {
      console.warn("Nao foi possivel mostrar notificacao do navegador.", error);
    }
  };

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        if (registration?.showNotification) {
          return registration.showNotification(title, options);
        }

        showWindowNotification();
        return null;
      })
      .catch((error) => {
        console.warn("Service worker indisponivel para notificacao.", error);
        showWindowNotification();
      });
    return;
  }

  showWindowNotification();
}

function isFcmVapidKeyConfigured() {
  return getFcmVapidKeyValidation().valid;
}

function getNormalizedFcmVapidKey() {
  return String(FCM_WEB_PUSH_PUBLIC_VAPID_KEY || "").replace(/\s+/g, "").trim();
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

function registerFcmTokenIfNotificationGranted(options = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  ensureFcmTokenRegistration(options).catch((error) => {
    console.warn("Nao foi possivel registrar o token FCM.", error);
  });
}

async function ensureFcmTokenRegistration(options = {}) {
  if (fcmTokenRegistrationPromise && !options.force) return fcmTokenRegistrationPromise;

  fcmTokenRegistrationPromise = (async () => {
    if (!currentFirebaseUid || !currentUser?.nick || !firebaseReady) return null;
    if (!("Notification" in window) || Notification.permission !== "granted") return null;

    const vapidKeyValidation = getFcmVapidKeyValidation();
    if (!vapidKeyValidation.valid) {
      if (options.showErrors) {
        showToast("FCM sem chave VAPID valida", vapidKeyValidation.message);
      }
      return null;
    }

    const messaging = await getFirebaseMessagingIfSupported();
    if (!messaging) {
      if (options.showErrors) {
        showToast("FCM indisponivel", "Este navegador nao suporta Firebase Cloud Messaging para Web Push.");
      }
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey: getNormalizedFcmVapidKey(),
      serviceWorkerRegistration: registration
    });

    if (!token) {
      if (options.showErrors) {
        showToast("Token FCM ausente", "O Firebase nao retornou um token para este navegador.");
      }
      return null;
    }

    await saveFcmTokenForCurrentUser(token);
    setupFirebaseMessagingForegroundListener().catch((error) => {
      console.warn("Nao foi possivel preparar mensagens FCM em primeiro plano.", error);
    });
    return token;
  })();

  try {
    return await fcmTokenRegistrationPromise;
  } finally {
    fcmTokenRegistrationPromise = null;
  }
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
}

async function unregisterFcmTokenForCurrentUser(options = {}) {
  const uid = currentFirebaseUid;
  const deviceId = localStorage.getItem(FCM_DEVICE_ID_STORAGE_KEY);

  if (uid && deviceId && firebaseReady && isInternetAvailable()) {
    try {
      await update(ref(db), {
        [`fcmTokens/${uid}/${deviceId}`]: null
      });
    } catch (error) {
      console.warn("Nao foi possivel remover o token FCM do Firebase.", error);
    }
  }

  if (options.deleteBrowserToken) {
    try {
      const messaging = await getFirebaseMessagingIfSupported();
      if (messaging) await deleteToken(messaging);
    } catch (error) {
      console.warn("Nao foi possivel apagar o token FCM local.", error);
    }
  }

  localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
}

async function setupFirebaseMessagingForegroundListener() {
  if (firebaseMessagingForegroundUnsubscribe) return;

  try {
    const messaging = await getFirebaseMessagingIfSupported();
    if (!messaging) return;

    firebaseMessagingForegroundUnsubscribe = onMessage(messaging, (payload) => {
      const data = payload?.data || {};
      if (data.type !== "chat-message" || data.authorUid === currentFirebaseUid) return;
      handleForegroundFcmChatMessage(payload);
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
  if (!toastRegion) return;

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
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshingForUpdate = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) return;
      if (refreshingForUpdate) return;
      refreshingForUpdate = true;
      window.location.reload();
    });

    const registration = await navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" });
    registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    await registration.update();
  } catch (error) {
    console.warn("Service worker não registrado.", error);
  }
}

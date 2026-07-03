# AstroChat + Firebase Cloud Messaging

Esta implementacao envia push quando uma nova mensagem aparece em:

```text
rooms/{roomId}/messages/{messageId}
```

## 1. Criar chave VAPID

1. Abra Firebase Console > Project settings > Cloud Messaging.
2. Em **Web push certificates**, gere ou importe uma chave.
3. Copie a chave publica para `app.js`:

```js
const FCM_WEB_PUSH_PUBLIC_VAPID_KEY = "SUA_CHAVE_PUBLICA_AQUI";
```

Sem essa chave, o navegador pode permitir notificacoes, mas o app nao registra o token FCM.

Se aparecer `InvalidAccessError: Failed to execute 'subscribe' on 'PushManager': The provided applicationServerKey is not valid`, a chave colada nao e a chave publica Web Push completa. Nao use:

- Web API key do Firebase;
- Sender ID;
- Server key;
- chave privada VAPID;
- uma chave publica copiada parcialmente.

A chave correta fica em **Firebase Console > Project settings > Cloud Messaging > Web Push certificates** e normalmente e uma string longa em base64url.

## 2. Regras do Realtime Database

Adicione uma regra para tokens. O Admin SDK usado pela Cloud Function ignora regras, mas o cliente precisa gravar o proprio token.

```json
{
  "rules": {
    "fcmTokens": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        "$deviceId": {
          ".write": "auth != null && auth.uid === $uid",
          ".validate": "newData.val() === null || (newData.child('uid').val() === $uid && newData.child('token').isString() && newData.child('platform').val() === 'web')"
        }
      }
    }
  }
}
```

Mantenha as regras existentes de `users`, `rooms`, `userRooms` e `userInvites`; este bloco deve ser mesclado com elas.

## 3. Deploy da Cloud Function

Na raiz do projeto:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

A funcao `sendChatMessageNotification` escuta o Realtime Database no instance `astro-chat-7d044-default-rtdb` e regiao `us-central1`. Se o seu Realtime Database estiver em outra regiao, ajuste `FUNCTION_REGION` em `functions/index.js` antes do deploy.

## 4. Fluxo no app

- O usuario clica em **Habilitar notificacoes** no perfil.
- O app pede permissao do navegador.
- Com permissao concedida, o app chama FCM `getToken()` usando `service-worker.js`.
- O token fica salvo em `fcmTokens/{uid}/{deviceId}`.
- Quando uma mensagem nova e criada, a Cloud Function envia push para os tokens dos outros membros da sala.
- Ao sair ou apagar usuario, o token desse navegador e removido.

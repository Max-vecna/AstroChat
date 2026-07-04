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

## 5. Se registrou mas nao notificou

Confira estes pontos:

- `fcmTokens/{uid}/{deviceId}` existe no Realtime Database e tem `lastRegisteredAtMillis` recente.
- A Cloud Function foi implantada com `firebase deploy --only functions`.
- A mensagem de teste foi enviada por outro usuario/UID; o remetente nao recebe push da propria mensagem.
- O navegador receptor esta com permissao de notificacao concedida para o dominio atual.
- Depois de alterar `service-worker.js`, recarregue a pagina para instalar a versao nova do service worker.
- A funcao envia `notification` + `webpush.notification`; depois de mudar `functions/index.js`, o deploy da Function e obrigatorio para o celular receber a correcao.

## 6. Quando funciona no PC, mas quebra no celular publicado

Se o app funciona em `localhost` e para quando sobe para GitHub Pages ou outro dominio, verifique:

- Em Firebase Console > Authentication > Settings > Authorized domains, adicione o dominio publicado, por exemplo `seu-usuario.github.io`.
- Git push para GitHub Pages nao implanta Cloud Functions. Para push em segundo plano, rode `firebase deploy --only functions`.
- O site publicado precisa abrir em HTTPS.
- No celular, remova o PWA antigo da tela inicial, feche o navegador e abra a URL publicada novamente para pegar o service worker/cache novo.
- Em iPhone/iOS, teste instalado na tela inicial; alguns navegadores nao entregam Web Push/FCM como o Chrome Android.
- Se aparecer "Sem permissao no Firebase", mescle as regras de `fcmTokens` acima com as regras existentes do Realtime Database.

## 7. Arquivos da Cloud Function incluídos

Esta pasta corrigida agora inclui também:

```text
functions/index.js
functions/package.json
```

Depois de publicar os arquivos do site, entre na raiz do projeto e rode:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

O `functions/index.js` usa uma `tag` única por mensagem (`chat:{roomId}:{messageId}`), para o Android não substituir uma notificação pela outra. Se mesmo assim o celular abrir a notificação no lugar errado, configure a variável `APP_PUBLIC_URL` com a URL HTTPS pública do app.

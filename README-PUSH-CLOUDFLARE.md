# AstroChat v115 - Push com backend externo gratuito

Esta versão mantém seu Firebase Realtime Database no frontend, mas move o disparo das notificações para um Cloudflare Worker.

## Arquivos principais

- `app.js`: versão atualizada do app. Agora ele chama um Worker depois que uma mensagem é salva.
- `service-worker.js`: versão v115 do service worker, mantendo o recebimento de push e atualizando o cache.
- `cloudflare-worker-astrochat-push.js`: backend externo para publicar no Cloudflare Workers.
- `firebase-functions-index.js` e `functions-package.json`: mantidos apenas como referência da sua Cloud Function antiga.

## Passo 1: publicar o Worker

No  Workers, crie um Worker novo e cole o conteúdo de:

```txt
cloudflare-worker-astrochat-push.js
```

O endpoint final será parecido com:

```txt
https://astrochat-push.seu-usuario.workers.dev/notify
```

## Passo 2: configurar secrets no Worker

No painel do Worker, adicione estas variáveis/secrets:

```txt
FIREBASE_PROJECT_ID=astro-chat-7d044
FIREBASE_DATABASE_URL=https://astro-chat-7d044-default-rtdb.firebaseio.com
FIREBASE_WEB_API_KEY=sua_api_key_web_do_firebase
FIREBASE_CLIENT_EMAIL=email_da_service_account
FIREBASE_PRIVATE_KEY=chave_privada_da_service_account
ALLOWED_ORIGIN=https://seu-site.web.app
```

`ALLOWED_ORIGIN` pode ser `*` durante testes, mas em produção use a URL real do seu site.

## Passo 3: criar a Service Account

No Firebase/Google Cloud:

1. Abra Google Cloud Console.
2. Vá em IAM e Admin > Service Accounts.
3. Crie ou use uma service account do projeto.
4. Gere uma chave JSON.
5. Copie:
   - `client_email` para `FIREBASE_CLIENT_EMAIL`
   - `private_key` para `FIREBASE_PRIVATE_KEY`

A chave privada pode ser colada com `\n` mesmo. O Worker já converte para quebras de linha reais.

## Passo 4: ligar o app ao Worker

Abra `app.js` e troque:

```js
const PUSH_WORKER_ENDPOINT = "";
```

por:

```js
const PUSH_WORKER_ENDPOINT = "https://astrochat-push.seu-usuario.workers.dev/notify";
```

## Passo 5: subir os arquivos do site

Envie para sua hospedagem:

```txt
index.html
app.js
style.css
manifest.json
service-worker.js
icons/icon-192.png
icons/icon-512.png
```

## O que mudou no app.js

- Versão atualizada para `v115`.
- Adicionado `PUSH_WORKER_ENDPOINT`.
- Adicionada função `notifyPushWorkerAboutMessage`.
- Após salvar uma mensagem em `/rooms/{roomId}/messages/{messageId}`, o app chama o Worker.
- O registro de notificação agora tenta manter tanto Web Push padrão quanto token FCM, para o Worker conseguir enviar via FCM HTTP v1.

## Teste rápido

1. Publique o Worker.
2. Cole a URL do Worker em `PUSH_WORKER_ENDPOINT`.
3. Publique o site.
4. Abra em dois navegadores/celulares com usuários diferentes.
5. Ative as notificações no perfil.
6. Feche o site no celular destinatário.
7. Envie uma mensagem pelo outro usuário.

Se o destinatário tiver token FCM salvo em `fcmTokens/{uid}/{deviceId}`, o Worker enviará a notificação.

## Observação importante

Notificação com site fechado não é `setInterval` nem código rodando para sempre no navegador. O que funciona é:

```txt
mensagem salva no Firebase -> Worker envia FCM -> service-worker.js mostra a notificação
```

# Correção mobile: mensagens não lidas e notificações

Arquivos alterados:

- `app.js`
- `service-worker.js`
- `functions/index.js`

## O que foi corrigido

1. O app agora escuta a última mensagem de cada sala diretamente em `rooms/{roomId}/messages`, além do metadado da sala. Isso deixa a listagem de mensagens não lidas mais confiável no mobile.
2. O sino de notificações no mobile foi reforçado para atualizar quando chega nova mensagem.
3. O painel de notificações agora consegue listar mensagem não lida mesmo quando o metadado da sala demora a chegar.
4. O `service-worker.js` foi atualizado para cache `v77`, forçando o celular a baixar a versão nova.
5. A Cloud Function foi ajustada para mandar push de mensagem como `data message`, deixando o service worker responsável por exibir a notificação. Isso evita falhas/duplicidade em alguns celulares.

## Como instalar

1. Substitua o `app.js` da raiz pelo arquivo corrigido.
2. Substitua o `service-worker.js` da raiz pelo arquivo corrigido.
3. Substitua `functions/index.js` pelo arquivo corrigido.
4. Rode:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

5. Publique o site/hosting novamente.
6. No celular, feche o app/site e abra novamente. Se ainda aparecer versão antiga, limpe os dados do site no navegador ou reinstale o PWA.

## Importante sobre Firebase

Notificação com o site totalmente fechado depende de Cloud Functions + FCM. Para fazer deploy de Functions, o projeto Firebase precisa estar no plano Blaze. Sem deploy da Function, o app pode mostrar pedidos/avisos quando estiver aberto, mas mensagem recebida com o site fechado não terá push real.

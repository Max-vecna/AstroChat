# AstroChat + Firebase Realtime Database

Esta versão usa Firebase Anonymous Auth + Realtime Database para sincronizar usuários, salas, convites, mensagens, reações, hidratações globais, tradução enviada pelo remetente, tradução temporária de mensagens hidratadas e estado de digitação.

## Antes de testar

> Se o app publicado roda em GitHub Pages ou outro dominio, adicione esse dominio em **Firebase Console > Authentication > Settings > Authorized domains**. `localhost` funcionar nao garante que `seu-usuario.github.io` esteja liberado.

1. No Firebase Console, ative **Authentication > Sign-in method > Anonymous**.
2. Ative o **Realtime Database**.
3. Confira se a URL do banco no `app.js` está igual à URL do seu Realtime Database:

```js
const DATABASE_URL = "https://astro-chat-7d044-default-rtdb.firebaseio.com";
```

4. Copie o conteúdo de `firebase-rules-dev.txt` para **Realtime Database > Rules**.
5. Rode o app com Live Server, localhost ou HTTPS.

## Caminhos usados no Realtime Database

```text
users/{uid}
nickIndex/{nickKey}/{uid}
rooms/{roomId}
rooms/{roomId}/messages/{messageId}
rooms/{roomId}/messages/{messageId}/reactions/{uid}
rooms/{roomId}/messages/{messageId}/hydration
rooms/{roomId}/messages/{messageId}/hydrations/{uid}  # legado
rooms/{roomId}/typing/{uid}
userRooms/{uid}/{roomId}
invites/{inviteId}
userInvites/{uid}/received/{inviteId}
userInvites/{uid}/sent/{inviteId}
```

## Digitação em tempo real

- Quando alguém digita, o app grava `rooms/{roomId}/typing/{uid}`.
- Por padrão, os outros usuários veem apenas **Digitando...**.
- Se o usuário ativar o botão de teclado no chat, o texto digitado também é compartilhado em tempo real naquele chat.
- Ao enviar, apagar o campo ou sair do chat, o estado de digitação é limpo.

## Tradução

- O remetente traduz a mensagem antes de salvar no Firebase.
- O receptor apenas escuta a mensagem já traduzida.
- Salva em cada mensagem:
  - `translatedText`
  - `originalText`
  - `targetLanguageCode`
  - `targetLanguageName`

## Hidratar mensagem

- O botão **Hidratar** aparece no menu suspenso de mensagens recebidas.
- A IA reescreve uma mensagem curta/seca em uma versão mais natural e completa.
- A hidratação atual é salva em `rooms/{roomId}/messages/{messageId}/hydration`.
- A versão hidratada aparece para todos os participantes da conversa.
- Mensagens antigas em `hydrations/{uid}` ainda são lidas como compatibilidade.
- Em mensagens hidratadas, o ícone de olho revela o texto original e o ícone de idioma mostra a tradução já existente, sem salvar uma nova tradução.

## Original oculto

- Em mensagens traduzidas, o texto original fica oculto para quem enviou e para quem recebeu.
- O original só aparece quando o usuário clica no ícone de olho.

## Menu da sala

O botão de três pontos no topo do chat abre o menu da sala:

- listar participantes;
- adicionar participante como amigo local;
- remover participante da sala, apenas para quem criou a sala;
- alterar idioma padrão da sala;
- excluir sala para todos, apenas para quem criou;
- sair/remover sala da própria lista para participantes comuns.

As regras incluídas são para desenvolvimento. Antes de publicar, revise permissões para garantir que só o criador possa excluir salas e remover usuários.

## Remoção de amizade

Ao remover um amigo, o app agora marca o pedido de amizade como `removido`, remove a amizade dos dois usuários localmente quando cada cliente sincroniza, apaga a sala privada `rooms/{roomId}` e remove `userRooms/{uid}/{roomId}` dos dois participantes.

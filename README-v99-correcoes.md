# AstroChat v99 - Retomar tradução após atualização da página

## Arquivos alterados

- `app.js`
- `service-worker.js`

## O que foi corrigido

1. Tradução pendente continua após atualizar a página.
   - Quando o usuário envia uma mensagem para tradução, o texto original fica salvo localmente em `localStorage` como trabalho pendente de tradução.
   - O balão de tradução recebe o texto original em `data-translation-source-text`, apenas no navegador de quem enviou.
   - Ao recarregar o app, o sistema procura balões com `data-translation-source-text` e status de tradução pendente para continuar a tradução automaticamente.

2. O outro usuário continua vendo apenas o aviso público.
   - O Firebase mantém o balão com `O texto está sendo traduzido...`.
   - O texto original não é exibido no balão público enquanto a tradução não termina.

3. Evita reiniciar errado mensagens já publicadas.
   - Se uma mensagem pendente já existe no Firebase, a fila local não republica o balão: ela apenas retoma a tradução daquele mesmo balão.

4. Cache atualizado.
   - `CHAT_VERSION` atualizado para `v99`.
   - `service-worker.js` atualizado para `astrochat-cache-v99`.

## Como instalar

1. Substitua os arquivos da raiz do site por:
   - `app.js`
   - `style.css`
   - `service-worker.js`
   - `index.html`
   - `manifest.json`
   - `firebase.json`

2. Publique o hosting novamente.

3. No celular, feche e abra o PWA. Se ainda carregar versão antiga, limpe os dados do site ou reinstale o PWA.

# AstroChat v98 - Ordem das mensagens e áudio

## Arquivos alterados

- `app.js`
- `style.css`
- `service-worker.js`

## O que foi corrigido

1. Ordem dos balões no chat
   - O renderizador agora reorganiza os balões conforme a ordem real da lista de mensagens.
   - Se o Firebase devolver mensagens fora de ordem ou atualizar uma mensagem pendente, o DOM é reposicionado sem precisar atualizar a página.
   - A ordenação passou a priorizar `createdAtMillis`, `clientTime` e `time`, mantendo a ordem em que a mensagem foi criada/enviada pelo app.

2. Página não precisa mais ser atualizada para ver mensagens corrigidas
   - Mensagens já renderizadas agora podem ser movidas, substituídas ou removidas quando o estado muda.
   - Isso ajuda principalmente mensagens pendentes de tradução, mensagens rápidas e atualizações recebidas em tempo real.

3. Controle de velocidade depois que o áudio termina
   - O painel final do áudio agora mantém o botão de velocidade.
   - O usuário pode mudar a velocidade antes de clicar em repetir.
   - A velocidade exibida é atualizada em todos os controles visíveis.

4. Balão de tradução pendente mais limpo
   - Removido o ponto animado extra do balão de tradução pendente.
   - O balão fica somente com o texto: `O texto está sendo traduzido...`.

5. Cache atualizado
   - `CHAT_VERSION` atualizado para `v98`.
   - `service-worker.js` atualizado para `astrochat-cache-v98`.

## Como instalar

1. Substitua os arquivos do site por estes arquivos:
   - `app.js`
   - `style.css`
   - `service-worker.js`
   - `index.html`
   - `manifest.json`
   - `firebase.json`

2. Publique o hosting novamente.

3. No celular, feche e abra o PWA. Se ainda aparecer a versão antiga, limpe os dados do site ou reinstale o PWA.

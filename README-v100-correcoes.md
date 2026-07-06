# AstroChat v100 - Digitação e repetir tradução

## Arquivos alterados

- `app.js`
- `style.css`
- `service-worker.js`

## O que foi corrigido

1. Balão de `digitando`
   - O estado de digitação agora é publicado mais rápido.
   - O app volta a exibir o botão de digitação ao vivo quando a conversa permite.
   - O listener de digitação aceita `updatedAtMillis` e também `updatedAt`, evitando falhas quando o tempo vem do servidor.
   - O balão de digitando é removido automaticamente quando fica antigo.

2. Botão `Tentar traduzir novamente`
   - Quando uma tradução falhar, o remetente vê um botão no próprio balão para tentar traduzir novamente.
   - O botão reaproveita o texto original salvo localmente, sem reenviar outra mensagem.
   - O balão volta para `O texto está sendo traduzido...` enquanto tenta de novo.

3. Proteção do texto original
   - Se a tradução falhar, o Firebase não troca mais o balão pelo texto original sem traduzir.
   - Os outros usuários veem apenas `Não foi possível traduzir este texto.` até o remetente tentar novamente.

4. Cache do PWA
   - `CHAT_VERSION` atualizado para `v100`.
   - `service-worker.js` atualizado para `astrochat-cache-v100`.

## Como instalar

1. Substitua os arquivos da raiz do site por estes arquivos atualizados.
2. Publique o hosting novamente.
3. No celular, feche e abra o PWA.
4. Se ainda aparecer a versão antiga, limpe os dados do site ou reinstale o PWA.

# AstroChat v97 - tema Galáctico e tradução pendente pública

## Arquivos alterados

- `app.js`
- `style.css`
- `service-worker.js`

## O que foi corrigido

1. Tema Galáctico:
   - removidos os três pontos coloridos que apareciam no fundo/campo do tema;
   - o menu suspenso de mensagem agora segue a cor do tema;
   - o seletor de reação também segue a cor do tema;
   - as barras e controles de áudio agora usam a paleta do tema escolhido;
   - o menu do usuário/perfil agora usa a paleta do tema escolhido.

2. Tradução pendente:
   - quando uma mensagem precisa ser traduzida, o balão pendente agora é publicado no Firebase para todos os usuários da sala verem;
   - enquanto traduz, o balão mostra apenas: `O texto está sendo traduzido...`;
   - o texto original não é exibido no balão enquanto a tradução ainda está pendente;
   - depois que a tradução termina, o mesmo balão é atualizado com o texto traduzido.

3. Cache do PWA atualizado:
   - `CHAT_VERSION` atualizado para `v97`;
   - `service-worker.js` atualizado para `astrochat-cache-v97`.

## Como instalar

1. Substitua os arquivos da raiz do site por estes arquivos.
2. Publique novamente o Firebase Hosting ou o local onde seu site está hospedado.
3. No celular, feche e abra o PWA. Se continuar carregando a versão antiga, limpe os dados do site ou reinstale o PWA.

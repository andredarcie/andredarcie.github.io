# Instruções para o Claude Code — tiny-creatures

## Estrutura (uma responsabilidade por arquivo)
- `index.html` — só marcação. Sem `<style>` nem `<script>` inline (exceto os
  `onclick=` dos botões e os `<script src>` no fim do body).
- `styles.css` — todo o CSS.
- `sprites.js` — sprite, `CREATURE_NAMES`, `CREATURE_COLORS` e helpers do GA.
  Módulo UMD que expõe `window.TinyCreaturesSprites`. Não tem dependência de DOM.
- `main.js` — loop, algoritmo genético, render e controles.

## Convenções
- **Os nomes dos amigos** ficam em `CREATURE_NAMES` (em `sprites.js`). É lá que
  se adiciona/edita/remove alguém. A paleta paralela `CREATURE_COLORS` deve ter
  pelo menos tantas cores quanto `POP` para as cores não repetirem.
- `main.js` é **script clássico, não `type="module"`**. As funções de controle
  (`setSpeed`, `togglePause`, `reset`) precisam ser globais porque os botões do
  HTML as chamam via `onclick=`. Não converter para módulo sem reescrever esses
  handlers (ex.: `addEventListener`).
- A ordem dos `<script>` importa: `sprites.js` antes de `main.js` (o segundo lê
  `window.TinyCreaturesSprites`).
- Editar arquivos sempre com a ferramenta Edit (nunca reescrever via PowerShell —
  o projeto tem muitos acentos e emojis UTF-8 que já corromperam uma vez).

## Publicação
- GitHub Pages tem cache de ~10 min. A URL pública é `/tiny-creatures/`.

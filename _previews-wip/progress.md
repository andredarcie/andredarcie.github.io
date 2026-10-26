# Previews nos cards da home: progresso

Pedido: cada card de **Projects** e **Games** (não Tests & prototypes) ganha uma imagem
pequena mostrando o projeto **rodando de fato**, nunca a tela inicial ou de título.

## Já feito (2026-10-26)
- Home redesenhada em `index.html`: hero com mapa topográfico vivo (canvas, simplex +
  marching squares), fontes Bricolage Grotesque + Source Serif 4, tema musgo claro/escuro.
  Nada commitado ainda.
- Script de captura em `_previews-wip/`:
  - `shoot.mjs`: servidor estático na raiz + Chromium **headless** e mudo (Playwright global).
    Uso: `node _previews-wip/shoot.mjs <receita> [...]`, que grava em `_previews-wip/shots/`.
  - `recipes.mjs`: uma receita por projeto (o que clicar/apertar para entrar no jogo).
- Capturas aprovadas (1280×800) em `_previews-wip/shots/`:

| Card | Arquivo | O que mostra |
|---|---|---|
| Tiny RPG Studio | rpg-play.png | jogo "Tiden" (Explore) rodando |
| OpenVideoGameData | ovgd.png | lista "Best Games of All Time" |
| My Life Data | lifedata.png | página Jogos com gráficos |
| My Code Codex | codex2.png | página Arquitetura N-Camadas |
| Blog | blog.png | post do Clair Obscure |
| My Skills | skills.png | skill dotnet-backend |
| Curso Dev do André | curso.png | slide "Encapsulamento" (OO) |
| Um ano subindo o litoral | journey3.png | fotos de Pernambuco |
| Brian's Mansion | brians2.png | salão da mansão, em jogo |
| Zero The Hero | zerohero.png | em jogo, à noite |
| Divino City | gta3.png | Praça/igreja matriz, em jogo |
| Zero To One | zero.png | rua na chuva (`__zero.go('rua', 1)`) |
| My House | house3.png | entrada da casa (toolbar de dev escondida via CSS) |

## Concluído (2026-10-27)
Canudos capturado (`?missao=canudos`, receita `rts4`). As 14 WebP (640×400, 8–36 KB) estão
em `img/previews/` (gerar de novo com `node _previews-wip/convert.mjs`) e entraram nos cards
como `.card-shot`. Itens 1, 3 e 4 abaixo resolvidos; falta só decidir o 5.

## Falta (lista original)
1. **Canudos**: o `rts/` agora abre numa tela "Eras do Brasil" (BUILD 63) com escolha de
   missão. A receita precisa clicar em CANUDOS, depois Normal e Jogar, e esperar a onda.
   Rascunho da receita `rts4` (não chegou a rodar): clicar no botão com texto /CANUDOS/,
   esperar ~12 s, clicar em `button.level` "Normal" + `#start-play` via `evaluate`,
   depois `#wave-call` e esperar ~40 s.
2. (Opcional) My House: entrar mais na casa. W/↑ quase não andou no headless.
3. Converter as 14 PNG para WebP ~640×400 em `img/previews/<slug>.webp` (dá para usar o
   próprio Chromium: carregar a PNG num canvas e `toDataURL('image/webp', 0.8)`).
4. `index.html`: pôr `<img class="card-shot" src="img/previews/…webp" alt="…"
   width="640" height="400" loading="lazy" decoding="async">` no topo de cada card de
   Projects/Games, com CSS (aspect-ratio 16/10, object-fit cover, cantos de cima arredondados).
5. Apagar `_previews-wip/` quando terminar (não commitar as PNG grandes).

## Achado no caminho
- `journey/` em produção: o mapa da CARTO mostra marca d'água **"API KEY REQUIRED"** nos
  tiles. O mapa base precisa de outro provedor ou de chave.

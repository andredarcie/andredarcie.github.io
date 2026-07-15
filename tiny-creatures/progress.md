Original prompt: mude totalmente o visual do jogo, baixe e use esses assets aqui: https://pixelfrog-assets.itch.io/tiny-swords

## Como o pacote Tiny Swords realmente funciona (estudo)
Tudo no pacote é modulado em **64 px**. Os números abaixo foram medidos nos PNGs,
não chutados:

- **Unidades**: frame de **192×192** (Lancer: 320×320) com o personagem pequeno e
  CENTRADO (o peão ocupa só ~52×71 px do frame). O frame é feito para ser
  desenhado centrado sobre o tile de 64 px, transbordando. Contagem de frames =
  largura/192 (Pawn_Idle 1536 = 8, Pawn_Run 1152 = 6, Warrior_Idle = 8...).
- **Shadow.png**: 192×192, a mesma moldura do frame da unidade — desenha-se no
  mesmo retângulo, por baixo.
- **Tilemap_color1.png**: 576×384 = 9×6 tiles. O autotile da praia é o bloco 4×4,
  e ele é um **nine-slice nas colunas/linhas 0-2** (0 = borda inicial, 1 = miolo,
  2 = borda final) MAIS uma quarta faixa de variantes "ilha de 1 tile de largura",
  que trazem o contorno escuro dos DOIS lados. Só o tile (1,1) é 100% opaco — as
  bordas têm a aresta translúcida de propósito (é a espuma). Fechar a ilha com o
  índice **3** (era o que o código fazia) desenha a tira isolada e sobra um
  contorno para dentro do gramado na última coluna e na última linha.
- **UI (papel, botão, barra, fita)**: são N-slice espalhados num grid de 64 px com
  **gutters transparentes de 64 px** entre as peças (anti-bleed). `border-image`
  exige as peças contíguas — daí o `tools/build-assets.py`, que as remonta.
- O canto do **botão grande** tem raio grande (a arte começa em x=19,y=17): cortá-lo
  em 32 px decepa a curvatura e o botão vira uma pílula chata. A fatia vai cheia
  (64) e é desenhada a 32 px (redução exata 2:1).
- **Water Foam** é um anel de 1 tile (para rochas na água), não serve de linha
  costeira — a costa já vem nos tiles da praia.

## Estado atual
- `tools/build-assets.py` gera `assets/tiny-swords/{game,ui}/` com nomes limpos a
  partir do pacote original (que fica intacto como fonte). Some das URLs o
  `%20%28Free%20Pack%29`.
- **Tela cheia (build 12)**: o cenário é a janela inteira. A célula é
  `min(100vw,100dvh)/12` — sem teto de 64 px — e a água do `<body>` preenche o que
  sobra na dimensão maior. Não há mais "chrome" reservado no topo/rodapé.
- Tabuleiro = **ilha 12×12**; o campo jogável **10×10** fica no miolo, com 1 célula
  de margem que dá a praia e o espaço para as construções transbordarem sem corte.
  `N` (main.js) e `--n`/`--tn` (styles.css) têm de andar juntos.
- Painel = **janela flutuante** (`.hud`): a fita do pacote é a barra de título,
  arrasta-se por ela, o botão minimiza (tecla **H** também). Minimizada, sobra só a
  fita e o cenário fica limpo.
- **Escala**: terreno e unidades a 1:1 (célula = tile de 64 px; frame de 192 px
  centrado na célula, com sombra e flip por direção). Construções e árvores a 1/2 —
  uma torre nativa tem 2×4 células e, com 30 defesas no orçamento, a 1:1 elas
  cobririam o tabuleiro.
- Facções coerentes: defensor AZUL (castelo, torres, sentinelas-guerreiro) x
  invasor VERMELHO (quartel + peões que evoluem).
- UI reconstruída: painéis de papel 9-slice, botões 9-slice com estado :active,
  fita no título e no toast, BigBar na barra de geração, ícones e cursor do pacote
  no lugar dos emojis. `border-width` controla o layout e `border-image-width` a
  escala da arte (a borda pinta abaixo do conteúdo, então pode avançar sobre ele).
- `styles.css` reescrita: as 4 camadas de correção empilhadas em `!important`
  viraram uma folha única (o único `!important` que restou é o de
  prefers-reduced-motion).
- Removido código morto: `spriteBoxShadow()` montava uma box-shadow gigante por
  frame para 40 agentes e a CSS a anulava com `box-shadow:none!important`;
  `installSprites()` injetava variáveis `--spr-*` que nenhuma regra usava mais.
- Sangue/gotas viraram poeira (Dust_01) — o respingo vermelho destoava do traço
  cartunesco do pacote. A flecha da torre agora gira com o `atan2` do trajeto.

## TODO
- `sprites.js` ainda carrega `BOARD_SPRITES`, `spriteToDataURL` e
  `getResponsiveRenderMetrics`, agora sem uso (o arquivo segue sendo a casa de
  `CREATURE_NAMES`/`CREATURE_COLORS`). Dá para podar.
- Não publicar o pacote baixado como arquivo avulso; ele fica dentro do projeto.

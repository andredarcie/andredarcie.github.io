# Tiny Tribes — mini RTS

Mini RTS feito em HTML, CSS e JavaScript puro, desenhado em three.js (r160 vendorado) na ilha isométrica do Life Lab. O jogador comanda a Tribo Azul contra a Tribo Vermelha (IA): colhe comida e madeira, ergue casas e acampamentos de guerra, treina tropas e vence ao destruir todas as construções inimigas. Pensado primeiro para o celular.

Todo texto que o jogador vê é em inglês; comentários e nomes internos ficam em português.

## Como se joga

- **Recursos:** comida (moitas de frutinhas, 60 por moita, 10 por viagem) e madeira (árvore cortada cai e vira 4 toras de 10). O trabalhador leva a carga até a sede (Lodge) mais perto.
- **Construções:** Lodge (sede: treina trabalhador, recebe carga, +8 de população), House (+6 de população), War Camp (fogueira: treina Clubman, Spearman e Axe Brute). Obra sobe com trabalhador batendo machado nela.
- **Unidades:** Worker, Clubman (porrete), Spearman (lança, alcance longo), Axe Brute (machado, lento, forte contra construção). Teto de 40.
- **IA:** três níveis (Easy, Normal, Hard). Mantém a economia, ergue casa antes de travar, levanta o acampamento, ataca em ondas que crescem e volta para defender a base.

## Controles (toque e mouse)

- Tocar numa unidade seleciona; **dois toques** selecionam todas do mesmo tipo na tela; **segurar e arrastar** faz o laço de grupo.
- Com trabalhadores: tocar em árvore ou moita colhe, no chão anda, na obra própria constrói. Botões de construção no painel de baixo; depois de escolher, tocar no mapa posiciona.
- Com tropas: tocar no inimigo ataca; no chão avança atacando o que achar (**Retreat** volta para a base sem brigar).
- Com uma construção: botões de treino; tocar no mapa marca o ponto de encontro (em árvore ou moita, o trabalhador novo já sai colhendo).
- Arrastar passeia a câmera, pinça dá zoom, mapinha leva a câmera para onde tocar. No PC: roda do mouse, WASD/setas, Esc ou P pausa.

## Como abrir

Os módulos ES (`import`) não rodam em `file://`. Sirva a pasta com um servidor estático (`npx serve .`, `python -m http.server`) e abra pelo `http://`. `?level=easy|normal|hard&play=1` começa direto.

**Visor de modelos (só em localhost):** a tecla **M** abre `src/dev/ModelViewer.js`, com cada unidade, prédio e a trincheira e todas as animações numa linha do tempo (tocar, pausar, quadro a quadro, parar num instante exato, girar a câmera). Por script: `__visor.list()`, `__visor.show({ model: 'unit:rifleman', anim: 'cycle', phase: .6, playing: false })`, `__visor.snapshot()` (PNG). As armas de fogo seguem o rig de `CharacterModel` (`#aimRig`/`#poseReload`: a arma no referencial do corpo e os braços por cinemática inversa de dois ossos até o punho e o guarda-mão).

## Estrutura

| Pasta | Função |
| --- | --- |
| `index.html` | Marcação, estilos da HUD e o import map (cache-busting `?v=N` + `BUILD N`). |
| `src/main.js` | Raiz de composição: monta mundo, bases, regras, interface e o laço. |
| `src/config/rts.js` | Times, unidades, construções, economia e níveis da IA. |
| `src/rts/` | Regras do jogo: caixa dos times (`TeamLedger`), ordens (`Commands`), comportamento das unidades (`UnitSystem`), IA (`AiPlayer`), seleção. |
| `src/entities/` | `Unit`, `Building` e o que o mundo já tinha (árvore, tora, moita, poça, corpo). |
| `src/input/` | Câmera (arrasto, pinça, laço por toque longo) e `PlayerInput` (toque → ordem). |
| `src/ui/` | HUD (`RtsHud`), mapinha, menus. |
| `src/overlay/` | Desenho 2D por cima da cena: seleção, marcas de ordem, barras de vida, chuva, poeira. |
| `src/render/` | Cena three.js herdada do Life Lab (bonecos, cabanas, fogueiras, árvores, céu, terreno). |
| `src/world/` | Biomas, capim, lagos, chuva, floresta, sangue, ocupação do chão. |

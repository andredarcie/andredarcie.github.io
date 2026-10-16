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

**Visor (só em localhost):** a tecla **F9** abre `src/dev/ModelViewer.js`, com duas abas. *Modelos*: galeria de tudo o que aparece no jogo (personagens, itens de cenário, construções), em cartões com miniatura; clicar abre o modelo grande, girando. *Animações*: cada animação rodando, com tocar/pausar/velocidade/quadro a quadro e os blocos de **estado** embaixo (sem estado escolhido ela passa por todos e acende o bloco em execução; clicando num bloco, repete só aquele estado). Os estados e as durações moram na tabela `ANIMS` do visor, tirados das próprias poses do `CharacterModel` — animação nova ou mudada, atualizar lá. Por script (para a IA revisar): `__visor.lista()`, `__visor.animacao({ id: 'recargaFerrolho', personagem: 'private', estado: 'Abrir o ferrolho', fase: .3, tocando: false })`, `__visor.estado()`, `__visor.foto()` (PNG com o estado escrito na tela). As armas ficam em `src/render/WeaponModels.js`, réplicas peça por peça das reais (fuzil Mannlicher M1888 com ferrolho de puxar reto e depósito do pente, baioneta-faca M1888, bacamarte de pederneira com cano de latão em sino, facão de cabo de chifre, sabre com guarda de arco, chuço, porrete, machado), fundidas numa malha por material e compartilhadas por bonecos e trincheira. As armas de fogo seguem o rig de `CharacterModel` (`#aimRig`/`#poseReload`: a arma no referencial do corpo e os braços por cinemática inversa de dois ossos até o punho e o guarda-mão).

## Estrutura

| Pasta | Função |
| --- | --- |
| `index.html` | Marcação, estilos da HUD e o import map (cache-busting `?v=N` + `BUILD N`). A HUD segue a Hallmark (carimbo no topo do `<style>`): couro escuro sobre o mapa, papel de despacho nos menus, toda cor por token `--hud-*`/`--paper-*`. |
| `src/main.js` | Raiz de composição: monta mundo, bases, regras, interface e o laço. |
| `src/config/rts.js` | Times, unidades, construções, economia e níveis da IA. |
| `src/rts/` | Regras do jogo: caixa dos times (`TeamLedger`), ordens (`Commands`), comportamento das unidades (`UnitSystem`), IA (`AiPlayer`), seleção. |
| `src/entities/` | `Unit`, `Building` e o que o mundo já tinha (árvore, tora, moita, poça, corpo). |
| `src/input/` | Câmera (arrasto, pinça, laço por toque longo) e `PlayerInput` (toque → ordem). |
| `src/ui/` | HUD (`RtsHud`), mapinha, menus. |
| `src/overlay/` | Desenho 2D por cima da cena: seleção, marcas de ordem, barras de vida, chuva, poeira. |
| `src/render/` | Cena three.js herdada do Life Lab (bonecos, cabanas, fogueiras, árvores, céu, terreno). |
| `src/world/` | Biomas, capim, lagos, chuva, floresta, sangue, ocupação do chão. |

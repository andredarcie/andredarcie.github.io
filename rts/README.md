# Eras do Brasil

A história do Brasil em jogos de defesa, uma era por vez. Abre no menu das eras (`#eras-dialog`, GameMenu); cada era é uma missão (ver *Missões*). Hoje: Tupinambás (antes de 1500) e Canudos (1896–1897).

## Origem: Tiny Tribes — mini RTS

Mini RTS feito em HTML, CSS e JavaScript puro, desenhado em three.js (r160 vendorado) na ilha isométrica do Life Lab. O jogador comanda a Tribo Azul contra a Tribo Vermelha (IA): colhe comida e madeira, ergue casas e acampamentos de guerra, treina tropas e vence ao destruir todas as construções inimigas. Pensado primeiro para o celular.

Todo texto que o jogador vê é em inglês; comentários e nomes internos ficam em português.

## Missões

O menu das eras escolhe a missão (sem `?missao=` na URL ele aparece primeiro; com ela, vai direto à abertura da era, que tem "Escolher outra era"); a página inteira é montada para uma só, então trocar é recarregar com `?missao=` (`canudos`, o padrão, ou `tupinamba`). As duas têm a mesma estrutura (o prédio central que não pode cair, ataques em ondas pelas estradas, torres na beira delas, pregador que cura, aliados que chegam, livro de história) e diferem só no que é de cada lugar e época.

- `src/config/mission.js` lê a URL; `src/config/rts.js` reexporta as regras de `src/config/missions/canudos.js` ou `tupinamba.js` (esta começa com `export * from './canudos.js'` e só redefine o que muda). Os textos da interface ficam em `TEXT` de cada missão (o `index.html` vem escrito para Canudos; `TEXT.page` troca os textos fixos marcados com `data-text`, `data-html`, `data-title`, `data-label` e `data-icon-text`). O livro de história e as citações de abertura e fim: `src/config/story.js`, que escolhe entre `missions/canudos-story.js` e `missions/tupinamba-story.js`.
- **Tupinambás (litoral do RJ/SP, antes de 1500):** a casa do principal no meio do terreiro quadrado, mata atlântica, rio a leste e a enseada ao sul (`src/world/Coast.js`: ninguém anda no mar, só as igaras). Inimigo: aldeias tupiniquins, pelas trilhas e pelo mar, em canoas que desembarcam na praia (`UnitSystem.spawnBoat`, `WaveDirector`). Terceiro recurso: flechas (no código continua `rifles`) — feitas no fogo do conselho ou apanhadas do chão, das que o contrário erra. Quem mata toma nome (`NAMES`); a "rede de madeira" da cerca embaraça quem passa (`SNARE`). Ocas, tejupar e moquém em `src/render/TupiBuildingModel.js`; a cerca de seteiras em `src/render/PalisadeRenderer.js`; corpo pintado, penas, arco e igara no `CharacterModel` (`#equipTupi`, `#poseBow`, `syncCanoe`). Nada que veio depois de 1500 (ferro, roda, gado, coqueiro, banana).
- Fontes da missão tupinambá, todas copiadas do texto integral, nunca de memória: Gabriel Soares de Sousa, *Tratado descritivo do Brasil em 1587* (Biblioteca Básica Brasileira, 2014); Pero de Magalhães Gândavo, *Tractado da terra do Brasil* (Projeto Gutenberg nº 28122, grafia original); carta de Pero Vaz de Caminha (Wikisource, ortografia atualizada). Os comentários do código citam o capítulo de onde vem cada coisa.

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

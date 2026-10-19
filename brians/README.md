# Brian's Mansion na web

Jogo de 2014 feito em **RPG Maker VX (RGSS2)**, recuperado do instalador e
rodando no navegador **100% em JavaScript**, sem RPG Maker e sem Ruby.
Jogar: `brians/web/index.html` (o site linka por `brians-mansion.html`).

A história da recuperação e da migração Ruby → JS (o `.exe`, o ruby.wasm, o
tradutor, a comparação quadro a quadro com o Ruby) está em
`C:\repos\brians-legado.zip`, junto com o instalador original, o projeto do
VX (`Game.exe`, `Scripts.rvdata`) e os 105 scripts `.rb`. Nada disso é
necessário para rodar o jogo.

## Estrutura

| Pasta | O que é |
|---|---|
| `web/index.html` | a página; import map com `?v=N` e o selo `BUILD N` |
| `web/main.js` | a página (botão Jogar, avisos) e a partida |
| `web/src/boot.js` | o boot: arquivos, fonte, motor, fachada, ajustes, scripts |
| `web/jogo/` | **os scripts do jogo** (Game_*, Scene_*, Window_*, Fog, Partículas, Checkpoint…), na ordem de `_ordem.json` |
| `web/src/rb/` | o runtime que dá aos scripts a semântica do Ruby 1.8 (`rb.*`: números, String em bytes, Hash, `rand` com semente) e o **Marshal 4.8** dos `.rvdata` e dos saves |
| `web/src/rgss2/` | a fachada RGSS2 (Bitmap, Sprite, Window, Tilemap, Graphics, Input, Audio, RPG::*) |
| `web/src/rgss/` | o motor: renderizador WebGL2, tilemap com autotiles e sombras, entrada (teclado e controle de toque), áudio WebAudio |
| `web/src/ajustes.js`, `tutoriais.js`, `dano.js` | as mudanças de jogabilidade (abaixo) |
| `web/src/dispositivo.js` | teclado ou toque: decide se os textos mostram Enter/Shift/setas ou A/Correr/direcional |
| `web/src/rastro.js`, `rastro-js.js`, `seletor-niveis.js`, `perfil.js` | replay, rastro, seletor de fases e profiler |
| `projeto/` | os recursos do jogo, **só os que ele usa** (163 arquivos, 4,2 MB; o tiro e o teletransporte são gerados por código em `web/src/musica/efeitos-sonoros.js`): `Graphics/`, `Audio/SE` (efeitos sonoros), `Fonts/` (Open Sans latina, 48 KB, OFL: interface e reserva da Verdana), `Data/*.rvdata` (mapas, eventos, banco de dados) e o `ks_checkpoint` do instalador. `node ferramentas/arquivos-sem-uso.mjs` lista o que nada chama; o resto do RTP do VX e as sobras de 2014 estão no `brians-legado.zip` |
| `web/src/musica/` | **a trilha sonora, gerada por código** (síntese própria em JS, uma composição por faixa em `faixas/`); `web/musica.html` toca as 10 |
| `musica-fichas/` | os números medidos das músicas de 2014 (andamento, tom, timbre…), alvos para afinar as faixas |
| `ferramentas/` | ferramentas de desenvolvimento em Node (abaixo) |
| `replays/` | replays de teste (roteiro `.txt` + `.json`) |

Os nomes de arquivo seguem o RGSS (sem maiúsculas, sem extensão);
`web/arquivos.json` resolve o nome → arquivo real.

## Convenções do código do jogo (`web/jogo/`)

- `@x` → `this._x` (é o que o Marshal grava nos saves); estado da fachada
  em campos `$x`, que não vão para o save.
- `K.new(…)` cria e chama `initialize`; reabrir classe com `rb.reabrir`,
  `alias` com `rb.alias`; `metodo?` → `metodo_p`.
- Tudo o que espera quadro é `async` (a raiz é `Graphics.update`).
- Float × Integer: ivars que guardam Float sem parte fracionária são
  anotados (`FLOATS`) para o save gravar Float como o jogo original.

## Mudanças de jogabilidade (`web/src/ajustes.js`)

Por cima dos scripts, que continuam como o jogo de 2014. Desligadas em
`?gravar`/`?replay` (os replays seguem o jogo original) e com `&original`.

- **Cutscenes 2×**: com um evento no controle, um quadro em cada dois não é
  desenhado; tudo que conta quadros anda no dobro, a música não muda.
- **Teclado × celular**: todo texto que cita botão segue o modo atual
  (`dispositivo.js`: começa pelo `pointer: coarse`, muda com o uso). No
  toque é o controle da tela: **A** (ação, = Enter), **Correr** (= Shift),
  **B** (pausa), direcional. No celular o cartão de tutorial fica no topo
  (os botões A/B/Correr cobrem o canto de baixo em paisagem).
- **Pular qualquer cutscene**: em evento automático ou comum aparece, pequeno
  e no topo, "Segure Enter para pular" (no celular, "Segure A para pular");
  segurar ~0,7 s avança a cena até o fim (a lógica
  roda quadro a quadro, 1 em 40 é desenhado, mensagens passam sozinhas, SE
  mudo). Para no fim da cena, em escolhas e nos tutoriais. O estado final é
  idêntico a assistir.
- **Tutoriais** (`tutoriais.js`): as imagens `Ajuda_1…5` viraram cartões
  desenhados por código, com ícones animados feitos dos gráficos do jogo;
  Enter pula. O evento original continua mandando no tempo.
- **Dano** (`dano.js`): parada de impacto, tremor e clarão, Brian piscando,
  "−1", coração da HUD estourando e o inimigo se extinguindo. **Fantasma
  derrotado não volta** (a página escondida não desliga mais o interruptor
  local A; vai no save; morrer recarrega o checkpoint).

## Desenvolvimento

- **Cache**: a cada mudança em `.js`, trocar todos os `?v=N` do
  `index.html` e o `BUILD N` (mesmo número). Módulo novo entra no import map.
- **Seletor de fases** (só localhost): tecla **I**; lista em
  `web/niveis.json` (`node ferramentas/montar-niveis.mjs`). **Tab** segurado
  acelera.
- **Replay**: `?gravar` grava a entrada; `?replay=<url>` toca e monta o
  rastro (hash do estado do jogo, da cena e do áudio por quadro).
- **Profiler**: `?perfil` (painel na tecla P; `__perfil.relatorio()`).
  Relatório: `RELATORIO-DESEMPENHO.md`.
- Depuração pelo console: `__brians` (motor), `__ajustes` (ajustes).

### Ferramentas (`node ferramentas/X.mjs`, a partir de `brians/`)

| Ferramenta | Para quê |
|---|---|
| `testar-rb`, `testar-biblioteca`, `testar-marshal` | testes do runtime e do Marshal (todos os `.rvdata` voltam byte a byte) |
| `carregar-jogo` | carrega os 57 scripts no Node (sem o Main) |
| `fumaca` | roda o jogo no Node com um motor de mentira e a entrada de um replay |
| `criar-replay` | replay a partir de um roteiro de texto |
| `tocar-replay`, `comparar-rastros`, `comparar-capturas` | toca um replay num Chromium headless e compara rastros ou capturas |
| `jogar` | controle remoto do jogo por HTTP |
| `mapas-inteiros` | captura os 37 mapas inteiros |
| `perfilar` | profiler com CPU do Chrome (`--gpu`, `--cpu N`, `--tempo-real`) |
| `montar-web`, `montar-niveis` | geram `web/arquivos.json` e `web/niveis.json` |
| `arquivos-sem-uso` | lista os arquivos de `projeto/` que nenhum dado nem código chama (antes de adicionar ou remover recursos) |
| `ver-estado`, `marshal` | leitura de saves e do Marshal |

As que abrem o navegador precisam do Playwright (`npm i -g playwright`).

**Referência de regressão**: os replays `curto` (2.764 quadros), `eventos`
(3.803), `fim` (5.828) e `passeio` (18.973, os 37 mapas) rodam até o fim. O
rastro do `curto` é idêntico ao da versão Ruby original (conferido no build
20, antes de remover o Ruby). Antes de mexer no motor ou nos scripts, gerar
o rastro, mexer e comparar.

## Planos

- `PLANO-MUSICA.md`: a troca das 10 músicas (MP3/OGG de terceiros) por
  trilha própria gerada por código. Feita no build 27: os arquivos de música
  saíram do projeto (backup no `brians-legado.zip`).

## Achados do jogo de 2014 (mantidos como eram)

- Fonte: o RGSS200E desenha em **Verdana**; `font.size` é a altura da célula
  do GDI (Verdana 20 → em de 16,5 px). Sem Verdana, DejaVu Sans.
- Sombras automáticas do VX no tilemap; o tom do viewport afeta o que já foi
  desenhado na região; pausa e setas da janela ignoram a opacidade da moldura.
- O KS Checkpoint pede `Graphics/System/Gameover_load`, que não existe; a
  morte passa pelo evento comum "Vida", que chama `load_ksch` direto.
- MIDI não é usado (só os padrões de batalha e veículos, fora do jogo).
- Batalha, loja, nome, menu do VX e debug não existem nesta versão: o jogo
  não os usa (o menu é desligado pelo evento comum "Vida" antes de o jogador
  ter controle). Chamá-los dá erro "fora do escopo".
- Há BGMs de terceiros (Nintendo), como no jogo de 2014.

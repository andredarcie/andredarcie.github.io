# Insônia

Remake no navegador do *Insônia* (2014, RPG Maker VX Ace), reconstruído a partir do trailer de gameplay de 17 minutos e das capturas originais em `games/insomnia/img/`. Para jogar, abra `insonia/index.html`.

## Controles

| Tecla | Ação |
|---|---|
| Setas (ou WASD) | andar |
| Enter, Espaço ou Z | ação |
| Esc ou X | cancelar |
| I | inventário |

No celular aparecem controles na tela:

- **Direcional:** é um controle só. Dá para arrastar o dedo para mudar de direção sem soltar.
- **Botões:** OK, Esc e I.
- **Tocar na tela:** avança falas e escolhas, como o OK, mas só quando há texto aberto.
- **Posição da tela:** em pé, o jogo fica em cima e os controles embaixo; deitado, o jogo ocupa a altura toda e os controles ficam dos lados.
- **Tela cheia:** onde o navegador deixa (Android), há um botão de tela cheia.

O jogo salva sozinho a cada troca de mapa. Os mapas que só existem dentro de uma cena (os flashbacks) não viram ponto de "Continuar".

## Como foi refeito

- **Resolução e motor**: o jogo roda em 544×416 com tiles de 32 px, como o VX Ace. O trailer é essa tela reduzida para 474×360, o que permitiu levar cada quadro de volta para a grade de tiles. Os corredores longos foram montados a partir de panoramas do vídeo.
- **Gráficos**: todos convertidos para cinza, como o tom de tela do jogo original.
  - *Tiles*: Mack (REFMAP, `fsmvx_map.zip` de refmap-l.blog.jp) para paredes, pisos e móveis, e o RTP do VX Ace (Inside e Dungeon) para camas, grades e rachaduras.
  - *Personagens*: do Mack, com dois tiles de altura.
    - Protagonista: ficha キャラ03, personagem 2.
    - Menino: 03b #6.
    - Pai: 04a #2.
    - Médico: 03d #4.
    - Sombra: 06a #7.
  - *Recortes próprios*: o que não existe em nenhum pacote foi recortado das capturas de 2014 ou desenhado em `tools/extras.py`. Isso inclui os canos, o biombo, os números do banheiro, os nichos iluminados e a porta arredondada.
- **Luz**: cada mapa tem tom (escurece tudo), luz ambiente, lâmpadas com halo e lanterna em volta do herói. Os valores foram calibrados comparando com as capturas.
- **Texto**: as falas foram transcritas do vídeo por OCR e conferidas quadro a quadro, mantendo a grafia original ("Mais" por "mas" etc.). Em vermelho ficam as vozes, a carta e os avisos.
- **Som**: o trailer não tem áudio. O som foi feito num clima de terror em primeira pessoa no espírito de Amnesia: silêncio pesado, coisas acontecendo longe.
  - `gravados.js` + `assets/sfx/`: os efeitos usam gravações reais em CC0 (domínio público). Origem de cada arquivo em `assets/sfx/CREDITOS.md`.
    - Passos por piso, porta, maçaneta trancada, fechadura, grade de metal, pancadas na porta, gritos, pé arrastando, trovão, lâmina.
    - O jogo sorteia a variação sem repetir a anterior e varia um pouco a altura.
    - Cada gravação passou por limitador, para o trinco não estalar.
  - `motor.js`: cadeia mestre (passa-alta, compressor e limitador), reverberação gerada para cada tipo de sala (cela, corredor, salão, banheiro de ladrilho, duto) e ruídos branco, rosa e marrom.
  - `efeitos.js`: a versão sintetizada de cada efeito, tocada se a gravação ainda não carregou, e os sons da interface.
    - Dobradiça e madeira rangendo: atrito "gruda-escorrega".
    - Metal, fechadura e grade: modos de barra.
    - Passos que mudam com o piso: madeira, pedra, ladrilho, metal, tapete.
    - Também trovão, susto, sala girando e armadilha.
  - `ambiente.js`: um perfil por mapa.
    - Camadas contínuas: ar do porão, zumbido grave de pavor, vento, chuva no flashback, lâmpada fluorescente no hospital, chama dos lampiões.
    - Eventos distantes sorteados: gota, viga rangendo, baque, corrente, cano gemendo, gemido e passos longe.
    - Coração que acelera com a tensão (cena do monstro, a voz das celas, o fim).
  - Os níveis foram medidos renderizando tudo offline. O ambiente fica abaixo dos passos, e o grave vai para harmônicos que o alto-falante do celular consegue tocar.

## Gráficos da era VX

Vêm do próprio repo, em `brians/projeto/Graphics/Characters`, e são os mesmos que o Brian's Mansion (2011) usava. As capturas de 2014 mostram que o Insônia também os usava. `tools/assets.py` converte para cinza:

- **`Other3`:** o lampião pendurado (animado), o ursinho e a mesa de toalha.
- **`!Door3`:** a porta arredondada de 2 tiles. A janelinha escura é desenhada por cima, porque nenhuma folha a tem.

## O que é reconstrução e o que é dedução

- **Batem tile a tile com o vídeo**: cela, duto, quarto 2, corredor principal, quarto da caixa,
  sala 14, banheiro, sala das lâmpadas, salão, corredor dos pilares, celas, quarto da rachadura,
  sala do enigma, sala de descanso, quarto do urso e corredor final. Os corredores foram montados
  a partir de panoramas do vídeo. O corredor final é um único corredor de 55 linhas; o vídeo só
  parece cortar para outros mapas porque a luz apaga enquanto ele anda.
- **Deduzidos do vídeo** (o trailer não mostra a regra):
  - a solução do tabuleiro;
  - quantos giros abrem a sala que gira.
- **Tirados do rastreio do trailer**: o herói foi localizado tile a tile em cada segundo do vídeo.
  - As armadilhas são os tiles fora do zigue-zague que o jogador do trailer percorreu sem nunca cair. Os rabiscos no chão ficam todos em cima delas.
  - A posição inicial na cela é (9,7).
  - A chave final fica em (8,6), logo antes da porta.
  - As pausas e os passos das cenas roteirizadas seguem o trailer: a cela, a escuridão do monstro (uns 44 s) e o flashback.
- **Acrescentados para dar para jogar**:
  - as dicas "Perdido" (papéis) e "0011" (jarro);
  - as frases "Uma grade no chão." e "Não posso usar isso aqui.";
  - no duto, a grade solta desenhada no chão;
  - OK na grade com o cano já oferece quebrá-la;
  - nas pontas do túnel o herói diz que não tem saída e lembra da grade.
- **Desenhados** por não existirem em nenhum pacote:
  - a moldura das janelas;
  - os canos, os números do banheiro, os nichos, a porta arredondada;
  - o ícone do cano.

## Estrutura

| Caminho | O que é |
|---|---|
| `index.html` | página, import map com `?v=N` e selo `BUILD N` |
| `main.js` | carregamento e tela de título |
| `src/jogo.js` | mapa atual, eventos, câmera, luz, salvamento automático |
| `src/mapa.js`, `src/tiles.js` | tilemap (autotiles do VX Ace) e registro dos tiles |
| `src/mapas/` | os 20 mapas |
| `src/historia.js` | roteiro: eventos, falas, quebra-cabeças, cenas |
| `src/mensagem.js`, `src/menus.js`, `src/janela.js` | mensagem com fundo escuro, escolhas, números, inventário, teclado de nome |
| `src/som.js`, `src/audio/` | fachada do som; motor, efeitos e ambiente sintetizados |
| `tools/assets.py` | gera `assets/` a partir do RTP e do pacote do Mack (que não ficam no repo) |
| `tools/extras.py` | gera `assets/tiles/xA.png` (recortes e desenhos próprios) |
| `tools/build.py` | reescreve o import map e sobe o BUILD (rodar a cada mudança de `.js`) |

## Atalho de desenvolvimento

`index.html?mapa=corredor&x=8&y=7&semsalvar&flags=intro&itens=cano` abre direto num mapa, sem salvar.

Acrescentando `&gravar`, o jogo entra em modo de gravação de vídeo:

- o relógio para e anda quadro a quadro por `window.__passo(n)`;
- as teclas entram por `window.__entrada`;
- nenhum som toca; cada um é anotado em `window.__sons` com o quadro, para o áudio ser renderizado depois, offline.

Foi assim que o vídeo de gameplay imitando o trailer foi gravado.

## Soluções (spoiler)

1. A caixa abre com `Perdido` e depois `0011`.
2. A escada da sala das lâmpadas abre com `1264`, os números riscados nas cabines do banheiro.
3. O tabuleiro se resolve acendendo o triângulo de cima, o hexágono e o triângulo da esquerda e o quadrado do canto.
4. Na sala que gira, um giro para a esquerda (ou três para a direita, como no trailer) abre a saída de baixo.
5. Na sala das armadilhas, o caminho seguro foge dos rabiscos:
   - desce pela direita até a fileira de baixo e atravessa para a esquerda;
   - sobe colado na parede esquerda;
   - corta pelo meio até a chave de bronze.

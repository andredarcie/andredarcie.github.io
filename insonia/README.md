# Insônia

Remake no navegador do *Insônia* (2014, RPG Maker VX Ace), reconstruído a partir do trailer de gameplay de 17 minutos e das capturas originais em `games/insomnia/img/`. Para jogar, abra `insonia/index.html`.

## Controles

| Tecla | Ação |
|---|---|
| Setas (ou WASD) | andar |
| Shift (segurado) | correr |
| Enter, Espaço ou Z | ação |
| Esc ou X | cancelar |
| I | inventário |
| M | liga/desliga o som (fica lembrado) |
| Clique do mouse | avança falas e escolhas, como o OK |

Na senha da caixa dá para digitar a palavra direto no teclado (Enter confirma), e no código de números dá para digitar os dígitos.

No celular aparecem controles na tela:

- **Direcional:** é um controle só. Dá para arrastar o dedo para mudar de direção sem soltar.
- **Botões:** OK, Esc e I.
- **Tocar na tela:** avança falas e escolhas, como o OK, mas só quando há texto aberto.
- **Posição da tela:** em pé, o jogo fica em cima e os controles embaixo; deitado, o jogo ocupa a tela toda e os controles ficam por cima, dos lados (os textos e menus desviam deles).
- **Tela cheia:** onde o navegador deixa (Android), há um botão de tela cheia.

## Tela e texto (depois do remake fiel)

Com o jogo pronto, a tela deixou de ser presa ao 544×416 do VX Ace:

- **Tela inteira, na resolução do aparelho** (até 2× de densidade). O mundo mostra no mínimo a área do jogo original (17×13 tiles); o que sobra da tela mostra mais mapa, na penumbra da vinheta, em vez de faixas pretas. O pixel art é ampliado sem borrar: primeiro por um inteiro acima, sem suavização, depois reduzido com suavização até o tamanho certo (`Jogo.mostrarCena`).
- **Texto na resolução real**, em Courier New negrito, com tamanho que acompanha a tela (`TELA.f`: 18 px no celular, até 28 px no computador) e quebra de linha automática. Os `\n` do roteiro viram espaço, exceto antes de aspas (avisos e bilhetes).
- **Menus e tabuleiro** continuam desenhados no quadro de 544×416, que é escalado e centralizado na tela (`caixaDesign` em `janela.js`), com o texto dentro deles no tamanho legível.
- **Máquina de escrever**: as falas aparecem letra a letra no ritmo de fala (~30 letras/s; o VX Ace fazia 60), com pausa curta depois de vírgula e maior no fim de cada frase. OK (ou toque/clique) durante a digitação mostra o texto inteiro; o próximo OK fecha. Ajuste em `LETRAS_POR_QUADRO` e `PAUSA` (`mensagem.js`).
- **Hospital do flashback** revisto contra o trailer: janelas em arco inteiras (antes só o arco aparecia), porta de almofadas, abajur de pé e lixeira branca desenhados em `tools/extras.py`, vaso de folhas, soleira embaixo da porta, recuo da direita com a parede mais alta e névoa que engrossa para as bordas (`nevoa.borda`).

**Fim do capítulo 1**: depois da sombra e do título "Insônia", aparece uma tela de encerramento com "The End", "Fim do primeiro capítulo" e "A história continua..." (`telaFimCapitulo` em `historia.js`). OK ou toque mostra tudo, e o próximo OK volta ao título.

O jogo salva sozinho a cada troca de mapa. Os mapas que só existem dentro de uma cena (os flashbacks) não viram ponto de "Continuar".

## Como foi refeito

- **Resolução e motor**: o jogo foi refeito em 544×416 com tiles de 32 px, como o VX Ace (hoje essa é a área mínima; ver "Tela e texto"). O trailer é essa tela reduzida para 474×360, o que permitiu levar cada quadro de volta para a grade de tiles. Os corredores longos foram montados a partir de panoramas do vídeo.
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
- **Texto**: as falas foram transcritas do vídeo por OCR e conferidas quadro a quadro. Depois a ortografia foi revisada: acentos ("está", "armário"), "mas" no lugar de "mais", "o que" no lugar de "oque", "por que", "há", vírgulas e pontuação. O menu do inventário diz "Analisar". Em vermelho ficam as vozes, a carta e os avisos.
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

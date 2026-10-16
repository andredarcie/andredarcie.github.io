# Zero To One

Walking sim em primeira pessoa (three.js r160) sobre Zero, um programador preso numa rotina
sem sentido que, em cinco dias, larga tudo e vai embora. Nasceu como um jogo de Bitsy
(`roteiro.md`, telas em `quarto.png`, `metro.png`, `empresa.png`) e virou 3D sem deixar de
ser aquele jogo.

---

## Direção de arte

**A regra-mãe: o 3D é o Bitsy de pé.** Cada cena tem que parecer uma das telas 2D originais
vista por dentro: poucas cores chapadas, formas geométricas simples, gente azul. Se um
elemento novo ficaria estranho ao lado de `quarto.png`, ele está errado — por mais bonito
que seja sozinho.

O jogo é **minimalista e simples**, não realista. Detalhe é bem-vindo; realismo não.
A diferença:

| Detalhe (sim) | Realismo (não) |
|---|---|
| mais objetos, cada um com poucas peças | superfícies que imitam material de verdade |
| um livro na espreguiçadeira, o rabo do gato mexendo | reflexo, brilho especular, cintilância |
| composição, silhueta, objetos que contam a história | textura de foto, normal map, ruído fino |
| animação simples e legível (seno, vai-e-volta) | simulação física, partículas em massa |

### 1. Paleta fechada

Tudo sai destas cores (`src/config.js`). São as três cores do Bitsy, com variações:

| Nome | Hex | Papel |
|---|---|---|
| `DARK`  | `#2e4358` | fundo, portas, detalhes escuros (o azul-escuro do Bitsy) |
| `DARK2` | `#263848` | sombra, rodapés, teto, frestas |
| `NAVY`  | `#3a5066` | vidros e telas |
| `LIGHT` | `#a6b6b8` | paredes (o cinza-claro do Bitsy) |
| `LIGHT2`| `#8da2a5` | mobília clara, areia |
| `FLOOR` | `#7e9498` | chão |
| `BLUE`  | `#3aa2ea` | **pessoas e coisas vivas** (o azul do Bitsy) |
| `GLOW`  | `#dde8e9` | luz, lâmpadas, espuma, nuvem |

- Cor nova só como **mistura entre cores da paleta** (`mix(BLUE, NAVY, .3)`), nunca um hex
  inventado do nada.
- **Azul = vivo.** Gente, gato, plantas, folhas de coqueiro, caranguejo, estrela-do-mar.
  Não pintar de azul o que não é vivo só porque ficou bonito (exceções que já existem:
  sinalização acesa, luzes de "ocupado", o winglet da companhia).
- Único acento fora da paleta: o **sol quente** `#ffe6b8` (avião e praia), usado só no sol,
  no halo e no céu em volta dele. É o "Paraíso"; não espalhar.
- Céu e névoa usam a paleta clareada (`GLOW` puxado para `LIGHT`) no horizonte e `BLUE`
  no alto. A névoa tem a cor do horizonte para não haver emenda.

### 2. Formas

- **Primitivas:** caixas (`box`, `lite`), esferas low-poly achatadas (`blob`, 10×7 segmentos),
  cilindros e cones de poucos lados. Pessoas são caixas (`person`). Nada de modelos importados.
- **Silhueta antes de detalhe.** Um objeto tem que ser reconhecível pela forma de longe.
- Curvas viram **facetas** (`flatShading: true`, poucos segmentos). Facetado é o estilo,
  não um defeito a suavizar.
- Escala humana e proporções de verdade (porta, mesa, poltrona) — o *formato* é simples,
  o *tamanho* é certo.

### 3. Materiais e luz

- Só `MeshLambertMaterial` (cor chapada que recebe luz) e `MeshBasicMaterial` (coisas que
  emitem: lâmpadas, telas, letreiros, sol). **Nada de** `MeshStandard`/`Physical`, PBR,
  metalness, roughness, environment map.
- **Sem efeitos de superfície:** reflexo, fresnel, brilho especular, glitter, normal map,
  bump, refração, transparência "física". Uma superfície é uma cor (ou um degradê suave
  entre cores da paleta).
- Texturas só quando **desenham informação**, em canvas, no mesmo estilo chapado: texto de
  terminal, mapa de voo, placa EXIT, arte 2D emoldurada. Ruído/grão só se imperceptível.
- Luz por cena: hemisférica + direcional (vêm do `freshScene`) e poucas `PointLight`.
  **Não acrescentar uma segunda hemisférica** — lava o contraste.
- Sem sombras reais (shadow map). Sombra de contato, quando precisar, é uma mancha
  escura macia no chão.
- Sem pós-processamento (bloom, SSAO, DOF, grão de filme, vinheta realista).

### 4. Natureza estilizada

Água, céu, nuvem, fogo, vegetação são onde o realismo mais tenta entrar. Regra:
**representar, não simular.**

- **Água:** malha facetada com ondas suaves (senos), cor chapada da paleta indo do raso
  (`BLUE`+`LIGHT`) ao fundo (`NAVY`). Espuma = faixas/formas sólidas `GLOW`. O brilho do
  sol, se houver, é forma desenhada (faixas, losangos), não reflexo calculado.
- **Céu:** degradê simples + sol em disco com halo em camadas.
- **Nuvem:** cacho de bolhas `blob` com `emissive` (uma bolha só lê como disco voador).
- **Chuva:** riscos finos instanciados, não partículas volumosas.
- **Plantas:** poucas peças azuis; folha = `blob` achatado.

### 5. Movimento

- Animação legível e lenta: senos, vai-e-volta, pausas. O mundo respira, não treme.
- Vida pequena em todo lugar (rabo do gato, fluorescente piscando, passageiro olhando a
  janela) vale mais que um efeito grande.

### 6. Interface e som

- Fonte **VT323**, caixas de texto com a borda azul do `index.html`, nada de ícones novos
  fora desse estilo.
- Som todo sintetizado (Web Audio) e **suave**: ataque lento, ganho baixo, sem agudos de
  repente (melodia com teto ~620 Hz).

### Antes de juntar algo novo, pergunte

1. Está nas cores da paleta (ou numa mistura delas)?
2. É feito de primitivas simples, facetadas?
3. O material é Lambert ou Basic, sem efeito de superfície?
4. Ficaria natural ao lado de `quarto.png`?
5. O detalhe vem de *mais objetos/composição* ou de *superfície mais realista*? Só o
   primeiro serve.

### Erros que já cometemos (não repetir)

- **Mar realista (build 45):** shader com fresnel, reflexo do céu, especular do sol em
  normal map (glitter), contraluz turquesa e espuma rendada por textura de ruído. Ficou
  bonito e fora do jogo. O mar tem que ser facetado e chapado como o resto.
  Referência certa (build 47, `SEA_FS` em `src/scenes/praia.js`): normal da própria
  faceta, três faixas de cor (raso/meio/fundo), crista clareando num degrau, espuma em
  faixas sólidas `GLOW` e o sol como tracinhos horizontais `#ffe6b8`.
- **NAVY puro contra céu claro:** vira um buraco preto. Puxar um pouco da cor do céu.
- **Espuma em muitas faixas largas:** em ângulo rasante vira zebrado. No máximo três,
  finas, na largura da areia.
- **Objeto enterrado:** o chão da praia é `sandH()`; tudo que apoia nele fica acima.

---

## Código

- `main.js` — fluxo de cenas, interação, entrada, câmera e loop.
- `src/` — `config` (conteúdo e paleta), `state` (`day`), `renderer`, `ui`, `audio`,
  `terminal`, `dialog`, `story`, `kit` (peças de construção e instancing), `input`, `debug`.
- `src/scenes/` — uma cena por arquivo; cada builder monta a cena e devolve
  `{ spawn, caption, auto, wake?, sway?, seated?, elevFn? }`.
- Corpo do jogador: `src/body.js` — caixas azuis sem cabeça, braços e pernas por IK de dois
  ossos (diz-se onde ficam mãos e pés). Em pé/andando e sentado (avião, `bodySeat`) quem posiciona
  é o `main.js`; na canoa e nas ações, a cena. `makeAction(frame, passos)` anima o corpo inteiro
  por passos (raiz, giro, quadril, tronco, mãos, pés, câmera), com alvos que podem seguir algo
  que se mexe.
- Corpo nunca visto por dentro (as três camadas dos jogos com corpo inteiro): animação com zona
  de conforto em volta da cabeça (o remo é empurrado para fora a 30 cm, `afastaDoRosto`), câmera
  que acompanha só metade da inclinação do tronco (`STEADY`) e `fadeNearCamera` como rede de
  segurança (pontilhado some o que chega a menos de ~20 cm da câmera). Material novo que possa
  encostar no rosto: passar por `fadeNearCamera`.
- Interação além do E: `tag(o, nome, { act })` roda uma ação de corpo inteiro (embarcar, subir a
  escada) que termina num veículo (`ride`) ou a pé; `whileRiding`/`reach` controlam o que dá para
  mirar de dentro da canoa. `triggerOf(test, opts)` dispara sozinho quando o jogador chega/olha;
  `look: {x,y,z}` vira a câmera para o ponto antes (cutscene). Contratos descritos em `main.js`.
- A água não entra na canoa: uma tampa invisível na boca marca o stencil e o mar/espuma usam
  `foraDaCanoa` (só pintam fora da marca). Perto da escada o mar é manso (`calmAt`, igual em JS e GLSL).
- Cenas fisicamente ligadas (dias 1 e 2): quarto ⇄ corredor ⇄ elevador ⇄ recepção ⇄ rua ⇄ estação
  CENTRAL ⇄ metrô ⇄ estação VIADUTO ⇄ rua do viaduto ⇄ portinha ⇄ recepção do trabalho ⇄ elevador
  ⇄ escritório. Cada builder recebe `nav = { entry, rel }` e nasce do lado certo da porta por onde
  se entrou (`tagGo(o, chave, cena, entrada)`). Depois do PC o dia vira noite (`night` em `state`;
  as cenas se montam escuras e esvaziam) e a volta é a pé até a cama, que vira o dia (`sleep`).
- **Mundo contínuo: sem tela escura e sem espera entre cenas ligadas.** Cada cena montada é um
  *mundo* (`kit.js`: `freshScene` cria, `usarMundo` aponta o kit, `descartarMundo` libera). As cenas
  ligadas à atual (as `saida`s que as peças-ponte registram) são montadas em segundo plano, uma por
  vez, logo depois que você chega, e aquecidas na GPU (`aquecer`: shaders e malhas com o stencil
  zerado). Vizinha montada em segundo plano fica muda (`silenciar`), e o que só pode acontecer com
  você lá vai em `aoAtivar` (o som do trem chegando). Mudou dia/noite, ou a vizinha é a cena de onde
  você acabou de sair: ela é remontada assim que a porta dela fecha.
  Toda ligação física tem uma peça-ponte montada pela MESMA função nas duas cenas:
  `vestibulo` (`src/vestibulo.js`: cômodo de duas portas automáticas). A cena do outro lado aparece de
  verdade pela porta aberta (portal em `main.js`: o vão marca o stencil, a vizinha é desenhada ali com a
  câmera levada para o referencial dela e um plano de corte no vão; as animações dela rodam com o
  jogador e a câmera mapeados). Passou do meio do cômodo, `game.atravessar` troca de mundo; a cena que
  ficou para trás vira a vizinha vista pela porta de trás. As duas cópias do cômodo compartilham o
  estado das portas (`ponte`) e o sol da vizinha é girado como o cômodo. Fica nas portas do
  quarto/corredor, recepção/rua, rua/estação (fim da
  escada), rua do viaduto/recepção do trabalho e rua/loja. Elevador e vagão trocam com as portas
  fechadas (`game.travel`, levando a posição na peça; `chegada(rel)` da cena de lá põe o jogador e gira
  o sol por `fy`), usando a cena já pré-montada; `vagao` (`src/vagao.js`: o trem da
  plataforma carrega o interior real do vagão; embarcou, as portas fecham, troca; chega de portas
  fechadas e elas abrem na plataforma); o elevador. O fim do expediente não troca de cena: ainda
  sentado no PC, a sequência `sentado` roda as falas e o passo `anoitecer` (a cena baixa as luzes e as
  pessoas somem pelas costas). Fade só nos cortes de tempo/lugar: dormir, avião, praia.
- Todas as cenas têm `N_LUZES` luzes pontuais (`completarLuzes` completa com apagadas): o three.js
  reaproveita os shaders e a troca não engasga compilando. Cena nova com mais luzes: subir o número.
- Elevador (`src/elevator.js`): a mesma cabine nas duas pontas do poço. Com as portas fechadas a
  cena troca sem fade (`game.travel`), levando a posição do jogador na cabine; a viagem termina do
  lado de lá. Paredes com o vão: `wall: {w, H}` ou `room(..., holeW)`.
- Vida das ruas (`src/cidade.js`): `frota` (carros instanciados; a cor de cada um tinge a lataria
  branca do molde), `pedestre` (vai e volta, para diante do jogador, guarda-chuva com chuva; tem
  corpo sólido), `letreiro` (texto em canvas para lojas e placas) e `quarteiraoLonge` (a cidade
  continuando pelas transversais).
- As duas estações são a mesma planta (`ESTACOES` em `plataforma.js`) com outra cara; a linha corre
  para -x de manhã e para +x de noite. Entrada `trem` = desceu do vagão (o trem vai embora).
- Final: praia → canoa → ilha do farol → pensamento ao olhar o farol → `finishGame` → "UM.".
- `game-context.json` — todo o texto, as sequências do roteiro e a trilha por dia.
- **Cache-busting:** o import map do `index.html` mapeia cada módulo para `?v=N`. A cada
  mudança de `.js`, trocar **todos** os `?v=N` pelo número novo; módulo novo ganha entrada
  no import map. Imports dentro dos `.js` ficam sem query string.
- Dev: em `localhost`, a tecla **I** abre o seletor de cenas por dia.
- Precisa de servidor local (o `game-context.json` é carregado por `fetch`).

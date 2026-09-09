# tiny life

Simulação de uma colônia de formigas em 3D: pontinhos pretos forrageando num
pedaço de chão batido cercado de grama. Sem pathfinding — as trilhas surgem
sozinhas de dois campos de feromônio.

## Como rodar

Precisa de **http://**, não `file://` (módulos ES não carregam de arquivo local):

```
npx serve .        # ou a extensão Live Server, ou python -m http.server
```

Arrastar gira a câmara, roda do mouse / pinça aproxima, tocar solta comida.

## A simulação é 2D; a apresentação é que é 3D

Formiga anda no chão, então o modelo continua em duas dimensões — `world`,
`ant`, `colony`, `terrain-shape` e `pheromone-field` não sabem que existe
three.js. A troca do renderizador 2D pelo 3D não encostou em nenhum deles.

## Mapa dos módulos

| arquivo | responsabilidade |
|---|---|
| `src/main.js` | monta as peças, toca o laço, escuta teclado e toque |
| `src/world.js` | junta terreno, feromônios, comida e colônia; responde ao que a formiga pergunta ao ambiente |
| `src/colony.js` | população: quem nasce, quem morre, quanto entrou de comida |
| `src/queen.js` | a rainha: fica na câmara e decide o ritmo da postura |
| `src/brood.js` | uma cria amadurecendo: ovo → larva → pupa |
| `src/ant.js` | uma formiga: andar, cheirar, reagir |
| `src/terrain-shape.js` | geometria do terreiro e máscara de onde dá pra pisar |
| `src/ground.js` | textura do chão (terra + colchão de grama), assada uma vez |
| `src/pheromone-field.js` | um campo de feromônio: depositar, evaporar, difundir |
| `src/food-source.js` | um monte de comida e seus grãos |
| `src/spatial-hash.js` | grade uniforme pra achar vizinhos sem comparar todos com todos |
| `src/renderer3d.js` | a cena three.js: chão, ninho, formigas, cria, mancha |
| `src/grass-field.js` | o gramado como geometria instanciada |
| `src/camera-rig.js` | órbita da câmara e a distinção entre toque e arrasto |
| `src/telemetry.js` | lê o mundo e produz o retrato do painel |
| `src/hud.js` | a única peça que toca o DOM fora do canvas |
| `src/config.js` | números de comportamento |
| `src/palette.js` | cores |
| `src/math.js` | utilidades numéricas |

Direção das dependências: `main → world → {terrain, campos, colônia} → ant`.
A formiga recebe o mundo por parâmetro e não conhece nem DOM nem canvas; o
renderizador só lê o mundo; a simulação roda inteira sem HUD.

## Reprodução

Comida entregue vira estoque; a cada 5 grãos a rainha põe um ovo na câmara ao
lado da entrada. A cria amadurece sozinha (ovo 7s → larva 9s → pupa 11s, com
±20% de variação) e a pupa vira operária ali mesmo. O ritmo da postura é da
rainha; o recurso é da colônia — ela pergunta `canLay()` antes de pôr.

## Cache-busting

O `?v=N` fica **só** no import map do `index.html` — os `import` dentro dos `.js`
vão sem query string. A cada alteração em qualquer `.js`: trocar todas as
ocorrências de `?v=N` no `index.html` e atualizar o `build N` do cabeçalho para o
mesmo número. O three.js vendorado (`lib/three.module.min.js`, r160) entra pelo
mesmo mapa, com o specifier `three`.

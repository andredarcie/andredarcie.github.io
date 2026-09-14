# tiny life

Simulação de uma colônia de formigas: pontinhos pretos forrageando num pedaço de
chão batido cercado de grama, vistos de cima. Sem pathfinding — as trilhas
surgem sozinhas de dois campos de feromônio.

## Como rodar

Precisa de **http://**, não `file://` (módulos ES não carregam de arquivo local):

```
npx serve .        # ou a extensão Live Server, ou python -m http.server
```

Tocar solta comida. `T` liga/desliga as trilhas, `R` recomeça.

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
| `src/ground.js` | o retrato do terreno (terra + grama), assado uma vez |
| `src/pheromone-field.js` | um campo de feromônio: depositar, evaporar, difundir |
| `src/food-source.js` | um monte de comida e seus grãos |
| `src/spatial-hash.js` | grade uniforme pra achar vizinhos sem comparar todos com todos |
| `src/renderer.js` | desenha em canvas 2D, e só desenha |
| `src/telemetry.js` | lê o mundo e produz o retrato do painel |
| `src/hud.js` | a única peça que toca o DOM fora do canvas |
| `src/config.js` | números de comportamento |
| `src/palette.js` | cores |
| `src/math.js` | utilidades numéricas |

Direção das dependências: `main → world → {terrain, campos, colônia} → ant`.
A formiga recebe o mundo por parâmetro e não conhece nem DOM nem canvas; o
renderizador só lê o mundo; a simulação roda inteira sem HUD.

O renderizador é a única peça acoplada a como a coisa aparece — houve uma versão
em three.js que trocava só este arquivo, sem encostar em nenhum outro. Ficou em
2D por decisão, não por limitação.

## Genética

Cada formiga carrega um `Genome`: sete alelos em 0..1, expressos uma única vez
no nascimento em passo, tempo de vida, faro, inquietude, força do rastro, ritmo
de trabalho e tamanho do corpo.

A rainha faz um voo nupcial no início (`Queen.found`), guarda **6 patrilinhas**
na espermateca e cruza com uma delas a cada ovo — segregação mendeliana por
locus, mais mutação. É por isso que o cruzamento sorteia o alelo de um dos pais
em vez de tirar a média: média convergiria tudo pro meio-termo em duas gerações
e as sub-famílias sumiriam.

Isso produz **variação e sub-famílias**, não evolução: as patrilinhas são fixas
enquanto a rainha viver, exatamente como num formigueiro real. Para haver
seleção seria preciso um passo a mais — colônia nova herdando de quem produziu
mais —, que não existe aqui.

## Reprodução

Comida entregue vira estoque; a cada 5 grãos a rainha põe um ovo na câmara ao
lado da entrada. A cria amadurece sozinha (ovo 7s → larva 9s → pupa 11s, com
±20% de variação) e a pupa vira operária ali mesmo. O ritmo da postura é da
rainha; o recurso é da colônia — ela pergunta `canLay()` antes de pôr.

## Cache-busting

O `?v=N` fica **só** no import map do `index.html` — os `import` dentro dos `.js`
vão sem query string. A cada alteração em qualquer `.js`: trocar todas as
ocorrências de `?v=N` no `index.html` e atualizar o `build N` do cabeçalho para o
mesmo número.

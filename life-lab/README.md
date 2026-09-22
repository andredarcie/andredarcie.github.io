# Life Lab

Life Lab é uma arena de vida artificial feita com HTML, CSS e JavaScript puro, desenhada em three.js como uma ilha isométrica flutuante. Pequenos organismos geométricos exploram o ambiente, enxergam de acordo com seu cone de visão, procuram comida e água, formam alianças e reproduzem com cortejo, gestação e nascimento.

## O que existe na simulação

- Organismos com genes de visão, velocidade, metabolismo, eficiência, maturidade, longevidade e fertilidade.
- Genoma diploide e poligênico: três locos por gene, duas cópias por loco (uma do pai, outra da mãe), meiose com recombinação livre, mutação rara por alelo e dominância na cor.
- Necessidades de fome e sede com consumo influenciado pelo metabolismo, pela visão e pelo esforço de movimento.
- Visão direcional realista: comida, água e parceiros precisam estar dentro do alcance e da abertura visual do organismo.
- Exploração inteligente em regiões da arena quando nenhum recurso está visível.
- Três biomas equilibrados: deserto/xerófita, taiga e campos/savana, pintados na textura da ilha a partir da mesma fronteira que a simulação usa.
- Chuva, poças de água, vegetação e regeneração de recursos.
- Reprodução com aproximação, cortejo, acasalamento, gravidez e animação de nascimento.
- Tribos: convivência cria afinidade e vira vínculo. Todo mundo ligado por amizade, direta ou por tabela, forma uma tribo que anda junta, colabora na busca por recursos e se mantém por perto mesmo fora do campo de visão — até o alcance do chamado, depois disso se perde de vez.
- Os bichos nascem pelados, na cor do próprio gene de pigmento. Ao entrar numa tribo, ela inteira passa a vestir um uniforme de cor sorteada; cabeça e braços continuam à mostra, então a cor genética nunca some.
- HUD compacta com genes, evolução populacional e slider de velocidade de `0,25×` a `4×`.

## Como abrir

Não há passo de build, mas a página usa módulos ES (`import`), que o navegador bloqueia em `file://`. Sirva a pasta com qualquer servidor estático local — por exemplo `npx serve .` ou `python -m http.server` — e abra pelo `http://`.

Para uma hospedagem simples, publique estes arquivos mantendo a mesma estrutura:

```text
index.html
scene.js
tokens.css
lib/three.module.min.js
scripts/
```

## Controles

- Mova a câmera com as **setas** ou **WASD**, como num jogo de estratégia; os botões no canto dão zoom e devolvem o enquadramento inicial.
- Clique na arena para criar um novo organismo.
- Use **Ver genes** e clique em um organismo para abrir sua ficha: cada gene mostra um medidor com a faixa possível, a cópia herdada do pai (quadrado), a da mãe (círculo) e o valor expresso.
- Use **Ver evolução** para acompanhar as médias, a faixa da população e a variação genética preservada.
- Ajuste o slider **velocidade** na HUD para desacelerar ou acelerar a simulação.

## Estrutura

| Arquivo | Função |
| --- | --- |
| `index.html` | Interface, sobreposição 2D e regras da simulação. |
| `scene.js` | Cena three.js: ilha, árvores, bichos voxel, câmera isométrica e luz. |
| `lib/three.module.min.js` | three.js r160 vendorado, sem CDN. |
| `tokens.css` | Tokens visuais, cores, tipografia e tema da interface. |
| `progress.md` | Histórico das decisões e funcionalidades implementadas. |
| `scripts/profile-simulation.cjs` | Profiler determinístico para análises locais da simulação. |

## Integração e análise

A página expõe duas funções úteis no objeto `window`:

```js
window.render_game_to_text(); // estado atual em JSON
window.advanceTime(1000);     // avança a simulação em milissegundos
```

O estado textual inclui organismos, genes, necessidades, exploração, alianças, reprodução, biomas, chuva e contadores da população.

## Direção do projeto

O objetivo é melhorar a profundidade e a qualidade do que já existe sem transformar a arena em um jogo com menus complexos. A prioridade é manter comportamentos legíveis, regras de visão coerentes, interações emergentes e uma apresentação visual discreta.

## Observação

Life Lab é uma simulação experimental. Os resultados variam porque movimento, recursos, mutações, encontros sociais e eventos ambientais possuem componentes aleatórios.

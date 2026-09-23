# Life Lab

Life Lab é uma arena de vida artificial feita com HTML, CSS e JavaScript puro, desenhada em three.js em vista isométrica. O chão ocupa a tela inteira: o terreno continua além da área dos bichos, com os mesmos biomas, e uma faixa de mata mais fechada marca onde o mundo acaba. Pequenos organismos geométricos exploram o ambiente, enxergam de acordo com seu cone de visão, procuram comida e água, formam alianças e reproduzem com cortejo, gestação e nascimento.

## O que existe na simulação

- Organismos com genes de visão, velocidade, metabolismo, eficiência, maturidade, longevidade e fertilidade.
- Idade em dias do céu: amadurece em ~1 dia, envelhece perto do 5º e a velhice consome a vida em ~0,6 dia, então cada bicho atravessa várias noites.
- Genoma diploide e poligênico: três locos por gene, duas cópias por loco (uma do pai, outra da mãe), meiose com recombinação livre, mutação rara por alelo e dominância na cor.
- Necessidades de fome e sede com consumo influenciado pelo metabolismo, pela visão e pelo esforço de movimento.
- Visão direcional realista: comida, água e parceiros precisam estar dentro do alcance e da abertura visual do organismo.
- Exploração inteligente em regiões da arena quando nenhum recurso está visível.
- Três biomas equilibrados: deserto/xerófita, taiga e campos/savana, pintados na textura da ilha a partir da mesma fronteira que a simulação usa.
- Chuva, poças de água, vegetação e regeneração de recursos.
- Dia e noite com posição solar real (latitude do Trópico de Capricórnio, hora angular e declinação): o sol nasce a leste, passa ao norte e se põe a oeste, as sombras giram e esticam, a luz avermelha perto do horizonte e o céu passa pelos crepúsculos civil, náutico e astronômico até a noite estrelada. O relógio do céu anda 1× de dia e 3× de noite (acelera aos poucos no crepúsculo): uma hora de dia leva 6 s, uma de noite 2 s. O ano curto (16 dias) muda a duração do dia e a altura do sol, e a lua tem fases (10 dias), nasce e se põe e ilumina a noite conforme está cheia. Chuva fecha o céu.
- No escuro os bichos enxergam menos (sem lua, menos da metade do alcance; o leque de visão encolhe junto).
- Cada bicho tem nome de cientista famoso (macho com nome de cientista homem, fêmea de cientista mulher), sorteado sem repetir: 220 nomes masculinos e 107 femininos, e só depois de esgotar a lista um nome volta com numeral ("Curie II"). O nome fica escrito sobre a cabeça; vida, fome, sede e energia aparecem na ficha do bicho, junto com os nomes do pai e da mãe.
- Sono: cada bicho tem energia. Ela só é gasta com esforço — andar, correr (mais que o dobro) e acasalar (cortejo e cópula drenam; abaixo de 35 ninguém acasala) — e só volta dormindo. Ao escurecer, quem está bem alimentado vai até a tribo e deita de costas, com "z" subindo e o peito respirando; cada um tem sua hora de deitar e de acordar. Fisiologia do sono: com sono, fome e sede moderadas deixam de ser urgência e o bicho vai para a cama em vez de procurar comida no escuro; dormindo, a fome quase para (30% do ritmo) mas a sede continua (55%), porque a água sai pela respiração, e por isso quem acorda no meio da noite geralmente acorda de boca seca. Só fome extrema ou sede forte acordam, o parto acorda, e quem zera a energia apaga onde estiver, até de dia. Cansado (energia baixa) anda mais devagar.
- Madeira e cabanas: as árvores da taiga e da savana são recurso. De dia, sem fome nem sede, quem não tem teto (nem a tribo dele) vai até uma árvore e corta com machado — golpe lateral com preparo lento, descida rápida e tranco no impacto, a árvore treme e solta lascas. Depois de 5 golpes ela tomba para longe de quem cortou, com física de tronco rígido girando na base (demora a pegar embalo e desaba no fim), quica, levanta poeira e vira 4 toras e um toco; o toco rebrota como muda em 2 dias e vira árvore em mais 1. As toras vão uma a uma no ombro até a obra, que sobe as paredes a cada entrega; com 4 toras (uma árvore) ganha telhado de duas águas. Cada tribo tem uma cabana, e ela cresce junto com a tribo para todos caberem sempre (mínimo de 4 vagas; sobra vira lugar de visita). A cabana tem alicerce de pedra, fiadas em dois tons com as pontas cruzadas nos cantos, porta entreaberta com batente e degrau, janelas nas laterais que acendem à noite quando tem gente dentro, telhado de telhas com beiral, cumeeira e chaminé de pedra, e uma bandeira na cor do uniforme da tribo balançando ao vento; uma plaquinha sobre o telhado mostra quantos estão dentro. Cabana largada por um grupo que acabou vira da turma que estiver por perto. Quem dorme dentro recupera energia 2,2× mais rápido e gasta 35% menos comida e água que dormindo no chão, e acorda saindo pela porta.
- Fogueira: tribo com 4 ou mais membros acende uma ao anoitecer, no meio do bando e longe das poças (até 4 fogueiras na ilha). Perto da hora de deitar cada um vai para o seu lugar na roda, espera de frente para o fogo e dorme com os pés virados para ele. O fogo ilumina a roda (luz pontual laranja com tremor, brilho no chão) e, na sua claridade, a visão quase volta à do dia; o calor acelera a recuperação da energia e reduz o metabolismo do sono. Chuva apaga (e a tribo reacende depois); de manhã a chama morre em brasa e some.
- Reprodução com aproximação, cortejo, acasalamento, gravidez e animação de nascimento.
- Tribos: convivência cria afinidade e vira vínculo. Todo mundo ligado por amizade, direta ou por tabela, forma uma tribo que anda junta, colabora na busca por recursos e se mantém por perto mesmo fora do campo de visão — até o alcance do chamado, depois disso se perde de vez.
- Toda tribo nova ganha um nome de ciência sorteado sem repetir ("Clã dos Quarks", "Irmandade da Entropia", "Povo da Fotossíntese"…) e uma cor de uniforme que nenhuma tribo viva está usando. Ao juntar duas tribos, fica o nome e a cor da maioria. A HUD mostra, abaixo do painel de estado, a lista das tribos existentes com cor, nome e número de membros, em tempo real.
- Os bichos nascem pelados, na cor do próprio gene de pigmento. Ao entrar numa tribo, ela inteira passa a vestir um uniforme de cor sorteada; cabeça e braços continuam à mostra, então a cor genética nunca some.
- Morte: o corpo tomba de lado e cai no chão; ao longo de quase meio dia apodrece — esverdeia, escurece, murcha, atrai moscas — e a carne some até sobrar o esqueleto completo (crânio com órbitas e mandíbula, coluna, costelas, esterno, clavícula, bacia, braços, mãos, pernas e pés). O esqueleto fica 2 dias e desbota até sumir. Se o morto tinha tribo, quem estiver acordado vem na hora, faz uma roda em volta do corpo e chora (cabeça baixa, mãos no rosto, soluço, lágrimas) e depois se despede e vai embora; fome ou sede apertada interrompem o luto.
- Câmera de acontecimentos: nascimento, morte e cabana pronta aparecem numa janelinha no canto superior esquerdo, com zoom sobre o lugar (a mesma cena 3D, num segundo enquadramento). O nascimento acompanha o filhote andando. Um acontecimento por vez: se outro acontecer enquanto um está no ar, vale o primeiro.
- HUD compacta com genes, evolução populacional e slider de velocidade de `0,25×` a `4×`. O `1×` já é o ritmo base do jogo, que roda a simulação no dobro do tempo real (`BASE_SIMULATION_SPEED`).

## Como abrir

Não há passo de build, mas a página usa módulos ES (`import`), que o navegador bloqueia em `file://`. Sirva a pasta com qualquer servidor estático local — por exemplo `npx serve .` ou `python -m http.server` — e abra pelo `http://`.

Para uma hospedagem simples, publique estes arquivos mantendo a mesma estrutura:

```text
index.html
tokens.css
src/
lib/three.module.min.js
scripts/
```

## Controles

- Mova a câmera **arrastando** (mouse ou dedo), com as **setas** ou com **WASD**; a **roda do mouse** e os botões no canto dão zoom, e ⟲ devolve o enquadramento inicial.
- Clique na arena para criar um novo organismo.
- Use **Ver genes** e clique em um organismo para abrir sua ficha: cada gene mostra um medidor com a faixa possível, a cópia herdada do pai (quadrado), a da mãe (círculo) e o valor expresso.
- Use **Ver evolução** para acompanhar as médias, a faixa da população e a variação genética preservada.
- Ajuste o slider **velocidade** na HUD para desacelerar ou acelerar a simulação.

## Estrutura

| Arquivo | Função |
| --- | --- |
| `index.html` | Marcação, estilos e o import map (cache-busting `?v=N` de cada módulo). |
| `src/main.js` | Raiz de composição: cria cada peça, injeta as dependências e liga o laço. |
| `src/config/` | Constantes por domínio (mundo, bichos, reprodução, tribos, morte, ambiente, genética, assentamento, interface). |
| `src/core/` | Matemática pura, barramento de eventos e fila embaralhada. |
| `src/sky/` | Astronomia (sol, lua, fases, estações) e o relógio do céu da simulação. |
| `src/names/` | Nomes de cientistas e de tribos, sorteados sem repetir. |
| `src/entities/` | Os dados do mundo: bicho, árvore, tora, cabana, fogueira, poça, capim, corpo, casal, bando. |
| `src/world/` | Estado do mundo, biomas, capim, poças, chuva, floresta e plano do cenário. |
| `src/genetics/` | Herança diploide: fundador, gameta, zigoto e expressão. |
| `src/organisms/` | Fábrica, percepção, locomoção, metabolismo, busca de recurso, sono, passeio e o "cérebro" que ordena as prioridades. |
| `src/social/` | Bandos, tribos, reprodução, luto e morte. |
| `src/settlement/` | Fogueiras, cabanas e o trabalho da madeira. |
| `src/stats/` | Amostras genéticas da população e a leitura de seleção × deriva. |
| `src/simulation/` | O passo do mundo: céu, um tique por bicho e as fases na ordem registrada. |
| `src/render/` | Cena three.js: fachada `WorldView`, câmera, céu, chão, e um renderizador por tipo de coisa. |
| `src/overlay/` | Sobreposição 2D: uma camada por desenho (nomes, balões, chuva, moscas, placas…). |
| `src/ui/` | Painéis, diálogos, câmera de acontecimentos, tema e formatação. |
| `src/input/` | Passeio da câmera e clique no mundo. |
| `src/app/` | Quadro, laço, tamanho da tela, estado em JSON e ganchos de depuração. |
| `lib/three.module.min.js` | three.js r160 vendorado, sem CDN. |
| `tokens.css` | Tokens visuais, cores, tipografia e tema da interface. |
| `progress.md` | Histórico das decisões e funcionalidades implementadas. |
| `scripts/profile-simulation.cjs` | Profiler antigo; lê variáveis que hoje são internas aos módulos, então não roda mais. |

Cada classe tem uma responsabilidade e recebe as dependências pelo construtor; só `src/main.js` conhece todas. A simulação não conhece a interface: avisa o que aconteceu (nascimento, morte, cabana pronta, amostra de genes) por um barramento de eventos. Fases da simulação, camadas da sobreposição e painéis são listas de objetos com a mesma interface (`update`, `draw`, `render`), então uma peça nova entra na lista sem mexer em quem percorre.

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

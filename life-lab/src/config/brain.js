// Rede neural de cada bicho, evoluída por NEAT (NeuroEvolution of Augmenting
// Topologies): pesos e topologia viajam no genoma e mudam de geração em geração.

// O que a rede sente, nesta ordem. Tudo chega entre -1 e 1 (ou 0 e 1).
export const BRAIN_INPUTS = Object.freeze([
  { key: 'hunger', label: 'saciedade' },
  { key: 'thirst', label: 'hidratação' },
  { key: 'energy', label: 'energia' },
  { key: 'life', label: 'vida' },
  { key: 'light', label: 'luz' },
  { key: 'foodNear', label: 'comida perto' },
  { key: 'foodSide', label: 'lado da comida' },
  { key: 'waterNear', label: 'água perto' },
  { key: 'waterSide', label: 'lado da água' },
  { key: 'mateNear', label: 'vizinho perto' },
  { key: 'mateSide', label: 'lado do vizinho' },
  { key: 'age', label: 'idade' },
  // A Chama Primordial à vista (no chão ou na mão de alguém; a própria não conta).
  { key: 'flameNear', label: 'chama perto' },
  { key: 'flameSide', label: 'lado da chama' },
  { key: 'flameRival', label: 'chama com rival' }
]);

// O que a rede decide. Cada saída é um tanh (-1 a 1) que os comportamentos leem.
export const BRAIN_OUTPUTS = Object.freeze([
  // Abaixo de quanto de fome/sede o bicho sai atrás de recurso.
  { key: 'appetite', label: 'apetite' },
  // Com fome e sede ao mesmo tempo, qual vem primeiro (+ comida, - água).
  { key: 'priority', label: 'comida × água' },
  // Puxa o rumo para um lado quando explora ou passeia.
  { key: 'turn', label: 'virar' },
  // Pressa ao explorar e passear: mais rápido acha antes, mas cansa e gasta mais.
  { key: 'haste', label: 'pressa' },
  // Quanto a puxada do bando pesa.
  { key: 'bond', label: 'apego ao bando' },
  // Acima de zero, vai atrás da Chama Primordial: pega do chão e ataca quem a carrega.
  { key: 'greed', label: 'cobiça' },
  // Atacado: acima de zero revida e defende a tribo; abaixo, foge.
  { key: 'courage', label: 'coragem' }
]);

export const BRAIN_INPUT_COUNT = BRAIN_INPUTS.length;
export const BRAIN_OUTPUT_COUNT = BRAIN_OUTPUTS.length;
// Ids de nó: entradas 0..n-1, depois o bias (sempre 1), depois as saídas, e os
// ocultos nascem do HIDDEN_START em diante.
export const BIAS_NODE = BRAIN_INPUT_COUNT;
export const FIRST_OUTPUT_NODE = BRAIN_INPUT_COUNT + 1;
export const HIDDEN_START = FIRST_OUTPUT_NODE + BRAIN_OUTPUT_COUNT;

// A rede pensa de tempos em tempos, não a cada passo da física.
export const THINK_INTERVAL = .2;

// Fundadores: rede mínima (toda entrada ligada a toda saída) com pesos pequenos,
// para o comportamento nascer perto do padrão e variar em volta dele.
export const FOUNDER_WEIGHT = .6;

// Mutação na concepção. As taxas são mais altas que no NEAT de laboratório porque
// aqui uma geração leva dias e a população é pequena.
export const WEIGHT_MUTATION_RATE = .8;
export const WEIGHT_PERTURB_CHANCE = .9;
export const WEIGHT_PERTURB_STEP = .35;
export const WEIGHT_RESET_RANGE = 2;
export const WEIGHT_LIMIT = 6;
export const ADD_CONNECTION_RATE = .18;
export const ADD_NODE_RATE = .07;
export const TOGGLE_RATE = .03;
// Gene ligado num pai e desligado no outro: chance de o filhote herdar desligado.
export const INHERIT_DISABLED_CHANCE = .75;
// Como no artigo, um quarto dos filhotes não mistura as redes: herda a do pai mais
// apto inteira (com mutação). Explora em volta de uma rede que já funciona. Se esse
// pai é o campeão de uma espécie com pelo menos CULL_MIN_SPECIES membros, a rede
// passa intacta, sem mutação: o elitismo do NEAT, que copia o campeão de cada
// espécie grande para a geração seguinte.
export const NO_CROSSOVER_RATE = .25;
// Cruzamento entre espécies: raro, mas existe (o artigo usa .001 por filhote; aqui
// a população é pequena e a chance é por vida — quem a tira aceita parceiro de
// outra espécie).
export const INTERSPECIES_MATE_RATE = .02;

// Distância de compatibilidade do NEAT: genes disjuntos/excedentes e diferença
// média dos pesos. Acima do limiar, dois bichos são de espécies diferentes e não
// cruzam (isolamento reprodutivo).
export const COMPAT_DISJOINT = 1;
// Peso 3, o valor do artigo do NEAT para redes grandes: com ~120 genes a fração
// de disjuntos é minúscula e, com .5, a distância ficava em 0,2–0,5 — nenhuma
// espécie nova surgia nunca (medido na simulação sem tela). Com 3, as primeiras
// espécies se separam por volta do dia 12.
export const COMPAT_WEIGHT = 3;
export const COMPAT_THRESHOLD = 3;
// De quanto em quanto tempo a população é reagrupada em espécies.
export const SPECIATION_INTERVAL = 2;

// Aptidão (Fitness): quanto vale cada filho, cada mordida e cada tantos segundos da
// tribo com a Chama, divididos pelos dias vividos (no mínimo FITNESS_MIN_DAYS, para
// o recém-nascido não disparar com uma mordida só).
export const FITNESS_OFFSPRING = 3;
export const FITNESS_BITE = .25;
export const FITNESS_FLAME_SECONDS = 20;
export const FITNESS_MIN_DAYS = .5;

// Seleção no estilo rtNEAT, mas sem matar ninguém: quem decide é quem pode ocupar
// as vagas do teto de população. Só vale com vaga escassa (até SCARCE_ROOM); com
// a população baixa, todo mundo pode reproduzir, senão ela não se recupera.
export const SCARCE_ROOM = 12;
// As últimas vagas são da tribo que guarda a Chama Primordial.
export const FLAME_RESERVED_ROOM = 3;
// Cada espécie tem uma cota do teto proporcional à aptidão média dela (a divisão de
// aptidão do NEAT: a média é a soma das aptidões ajustadas, f / tamanho). Passou da
// cota (mais esta folga), a espécie espera.
export const SPECIES_QUOTA_SLACK = 2;
// Espécie com pelo menos este tanto de membros só reproduz pela metade de cima em
// aptidão (o corte do NEAT, SURVIVAL = .5).
export const CULL_MIN_SPECIES = 6;
// Carência de espécie nova (em dias): ela ainda não teve tempo de provar nada, então
// fica fora da cota e do corte. É a proteção à inovação que dá sentido à especiação.
export const SPECIES_GRACE_DAYS = 1.5;
// Estagnação: espécie cuja melhor aptidão não sobe há este tanto de dias perde a
// cota (o artigo usa 15 gerações). A espécie mais apta nunca é cortada.
export const STAGNATION_DAYS = 8;
// Melhora menor que esta não zera o relógio da estagnação.
export const STAGNATION_EPSILON = .05;

// Como as saídas viram comportamento.
export const APPETITE_SPAN = 18;
export const PRIORITY_SPAN = 30;
export const TURN_EXPLORE = Math.PI / 3;
export const TURN_STROLL_RATE = 1.4;
export const HASTE_EXPLORE = [.8, 1.5];
export const HASTE_STROLL = [.6, 1.4];
export const BOND_MAX = 2;

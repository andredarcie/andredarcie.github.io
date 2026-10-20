// Abertura sem texto (ligada por src/ajustes.js). No jogo de 2014 a
// Apresentação (mapa 14) mostrava a imagem "Introdução", um bloco de texto
// contando que o Brian jogava bola e chutou a bola até a mansão. Aqui a
// história é encenada na Floresta (mapa 5), antes da cena original:
//   1. o Brian entra pela direita conduzindo a bola;
//   2. chuta para a esquerda, vai atrás e dá a volta por baixo;
//   3. chuta para a direita e para de frente para a bola;
//   4. embaixadinhas (a bola pula no lugar, com um toquinho a cada pulo);
//   5. chuta forte para cima sem querer: "!" de susto, a bola voa até a
//      mansão, e daí segue a cena original (vidro quebrando, a câmera sobe e
//      volta, suor, "…", ele corre até a porta).
// O jogo novo começa direto na Floresta: a Apresentação (um mapa preto com o
// Brian e a janela de variável, que piscava antes do fade) fica de fora, e o
// evento dela vira só o fade para a Floresta (para quem chegar lá por outro
// caminho). Tudo é feito nos dados quando o jogo os carrega (load_data:
// System, mapas 14 e 5), com comandos de evento comuns;
// os arquivos .rvdata não mudam, e sem os ajustes (&original, replays) a
// abertura é a de 2014. Coordenadas só em tiles livres da Floresta:
// linha 17 de x 8 a 16, linha 18 de x 8 a 13; a porta da mansão em (8, 10).
import * as rb from 'rb';

const BRIAN = -1, BOLA = 3;
const CENA = 4;                    // o evento automático da Floresta
const INICIO = { x: 16, y: 17 };   // o Brian chega aqui, olhando para a esquerda
const BOLA_INICIO = { x: 15, y: 17 };
const MANSAO_Y = 7;                // onde a bola some (o vidro), como em 2014

const se = (nome, volume, tom) => RPG.SE.new(nome, volume, tom);
const TOQUE = () => se('Blow3', 40, 150);
const CHUTE = () => se('Blow3', 70, 120);
const EMBAIXADA = () => se('Blow3', 35, 165);
const CHUTAO = () => se('Blow3', 95, 80);

const cmd = (code, parameters = []) => RPG.EventCommand.new(code, 0, parameters);
// rota de movimento: [código, parâmetros] por passo
function rota(quem, passos, esperar = true) {
  const r = RPG.MoveRoute.new();
  r._repeat = false; r._skippable = false; r._wait = esperar;
  r._list = [...passos.map(([c, p = []]) => RPG.MoveCommand.new(c, p)), RPG.MoveCommand.new(0, [])];
  return cmd(205, [quem, r]);
}
const espera = (n) => cmd(230, [n]);
// códigos de rota
const BAIXO = [1], ESQ = [2], DIR = [3], CIMA = [4], PULO = [14, [0, 0]];
const OLHA_ESQ = [17], OLHA_DIR = [18], OLHA_CIMA = [19], PASSO_ON = [33], PASSO_OFF = [34];
const vel = (n) => [29, [n]], pausa = (n) => [15, [n]], som = (s) => [44, [s]];
const vezes = (n, passo) => Array(n).fill(passo);

// Apresentação: sem a imagem de texto nem as esperas; o fade leva direto à
// Floresta, com o Brian já com a bola
function apresentacao(mapa) {
  const pagina = rb.idx(mapa.events, 1).pages[0];
  pagina._list = pagina.list
    .filter((c) => ![231, 230, 235].includes(c.code))
    .map((c) => (c.code === 201 ? cmd(201, [0, 5, INICIO.x, INICIO.y, 4]) : c));
}

function floresta(mapa) {
  const bola = rb.idx(mapa.events, BOLA);
  bola._x = BOLA_INICIO.x; bola._y = BOLA_INICIO.y;
  const pagina = rb.idx(mapa.events, CENA).pages[0];
  const original = pagina.list;
  const jogada = [
    original[0],                                   // faixas de cinema (Filme)
    rota(BRIAN, [OLHA_ESQ]),                       // o jogo novo começa olhando para baixo
    espera(30),
    // 1. conduzindo a bola para a esquerda: (15,17) → (12,17), Brian atrás
    rota(BOLA, [vel(4), ...vezes(3, null).flatMap(() => [som(TOQUE()), ESQ])], false),
    rota(BRIAN, vezes(3, ESQ)),
    espera(12),
    // 2. chute para a esquerda: a bola vai a (9,17), o Brian vai atrás
    rota(BOLA, [vel(5), som(CHUTE()), ...vezes(3, ESQ)], false),
    rota(BRIAN, [pausa(8), ...vezes(3, ESQ)]),
    //    e dá a volta por baixo para ficar à esquerda da bola
    rota(BRIAN, [BAIXO, ESQ, ESQ, CIMA, OLHA_DIR]),
    espera(12),
    // 3. chute para a direita: a bola vai a (12,17), o Brian para ao lado
    rota(BOLA, [vel(5), som(CHUTE()), ...vezes(3, DIR)], false),
    rota(BRIAN, [pausa(8), ...vezes(3, DIR)]),
    //    e se põe de frente para ela, por baixo
    rota(BRIAN, [BAIXO, DIR, OLHA_CIMA]),
    espera(15),
    // 4. embaixadinhas
    rota(BRIAN, [PASSO_ON], false),
    rota(BOLA, [vel(3), ...vezes(4, null).flatMap(() => [som(EMBAIXADA()), PULO, pausa(6)])]),
    rota(BRIAN, [PASSO_OFF]),
    espera(8),
    // 5. o chutão sem querer: "!" de susto e a bola voa até a mansão
    cmd(250, [CHUTAO()]),
    original[1],                                   // Jump2, o som do voo
    cmd(213, [BRIAN, 1]),
    rota(BOLA, [vel(5), ...vezes(17 - MANSAO_Y, CIMA)]),
  ];
  // daí em diante a cena original, do vidro quebrando em diante; a primeira
  // rota do Brian (de (10,19) até (8,14)) sai de onde ele está agora, (12,18)
  const resto = [];
  let trocou = false, pulando = false;
  for (const c of original.slice(original.findIndex((c) => c.code === 250 && rb.str(rb.idx(c.parameters, 0).name) === 'Crash'))) {
    if (pulando && c.code === 505) continue;
    pulando = false;
    if (!trocou && c.code === 205 && rb.idx(c.parameters, 0) === BRIAN) {
      trocou = pulando = true;
      resto.push(rota(BRIAN, [OLHA_CIMA, CIMA, ...vezes(4, ESQ), ...vezes(3, CIMA)]));
      continue;
    }
    resto.push(c);
  }
  pagina._list = [...jogada, ...resto];
}

export function prepararAbertura() {
  const carregar = globalThis.load_data;
  globalThis.load_data = (nome) => {
    const dados = carregar(nome);
    const arquivo = rb.str(nome);
    if (arquivo === 'Data/System.rvdata') {
      dados._start_map_id = 5; dados._start_x = INICIO.x; dados._start_y = INICIO.y;
    } else if (arquivo === 'Data/Map014.rvdata') apresentacao(dados);
    else if (arquivo === 'Data/Map005.rvdata') floresta(dados);
    return dados;
  };
}

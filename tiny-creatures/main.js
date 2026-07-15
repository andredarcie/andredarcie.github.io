'use strict';

// Tiny Creatures — tower-defense com IA atacante.
// FASE 1 (construção): o jogador posiciona torres, armadilhas e inimigos para
// proteger a espada (topo). FASE 2 (assistir): um algoritmo genético evolui por
// gerações tentando atravessar a defesa e alcançar a espada.
//   • IA vence  → alguma criatura toca a espada.
//   • Sem limite de gerações: evolui até alguém chegar (ou o jogador reiniciar).
// As funções globais (setSpeed/togglePause/reset/setTool/startDefense/
// clearDefenses/backToBuild) são chamadas pelos onclick do index.html, por isso
// este arquivo é um script clássico (não module).

// ══ CONFIG ══════════════════════════════════════
const POP    = 40;   // população maior → busca mais ampla (resolve mapas difíceis)
const GLEN   = 80;   // máximo de passos por geração (orçamento de tempo)
const SPRITES = window.TinyCreaturesSprites;
const NEAT    = window.TinyCreaturesNEAT;
const ICONS   = window.TinyCreaturesIcons;   // ícones vetoriais do inspetor (icons.js)
// Visão em cone, à frente da direção que a criatura encara.
// Em coordenadas "de quem olha": f = passos à frente, l = lateral.
const CONE = [ {f:1, l:0}, {f:2, l:-1}, {f:2, l:0}, {f:2, l:1} ]; // 4 blocos
// Vetores frente (f*) e lateral (p*) por direção encarada.
const DIRVEC = {
  U: { fx: 0, fy: -1, px: 1, py: 0 },
  D: { fx: 0, fy: 1,  px: 1, py: 0 },
  L: { fx: -1, fy: 0, px: 0, py: 1 },
  R: { fx: 1, fy: 0,  px: 0, py: 1 },
};
// Giros relativos ao rosto (a visão acompanha o facing).
const TURN_L = { U: 'L', L: 'D', D: 'R', R: 'U' };
const TURN_R = { U: 'R', R: 'D', D: 'L', L: 'U' };
const TURN_B = { U: 'D', D: 'U', L: 'R', R: 'L' };
// Entradas: visão (cone à frente, 4) + faro DIRECIONAL até o castelo (frente/esq/
// dir/trás, relativo ao rosto, 4) + 1 aleatório = 9. O faro precisa ser direcional:
// com um único escalar (só a frente) a rede não distingue esquerda de direita e
// trava girando no lugar sem nunca virar para o castelo.
const NUM_INPUTS  = CONE.length + 4 + 1; // 9
const NUM_OUTPUTS = 4;     // saídas: U / D / L / R
const N       = 10;          // tabuleiro N×N
const MAXI    = N - 1;       // índice máximo (0..MAXI)
const CENTER  = (N - 1) >> 1;// coluna central
const MAXDIST = CENTER + MAXI; // maior distância possível até o objetivo
const GOAL   = {x:CENTER, y:0};    // topo central — espada (objetivo)
const START  = {x:CENTER, y:MAXI}; // base central — partida
const DIRS   = ['U','D','L','R'];
const SPEEDS = [220, 120, 70, 35, 12, 2]; // ms por passo
const GEN_PAUSE   = 650; // ms entre gerações (pra dar pra acompanhar)
const BUDGET      = 14;  // total de peças na construção (~14% do tabuleiro, como no 15×15)
const TOWER_RANGE = 2;   // alcance (Manhattan) da torre
const ENEMY_MAX_KILLS = 2; // o inimigo (monstro) mata só isso e morre
const TOWER_HP = 2;        // batidas de criatura até a torre ser destruída (1ª racha)
const DEAD_PENALTY = 100; // penalidade de fitness para quem morre
const LAG_MARGIN   = 8;   // morre se ficar mais que isso atrás do líder (no caminho)
const EXPLORE_BONUS = 0.12; // bônus de fitness por célula nova visitada (incentiva explorar)
const GOAL_VISION_BONUS = 14;    // passos extras concedidos enquanto o objetivo está no cone de visão
const STEP_LIMIT_MAX = GLEN * 3; // teto da extensão de passos por geração

const createCreatureColor = SPRITES.createCreatureColor;
const createCreatureName = SPRITES.createCreatureName;

// A ilha (terreno) é maior que o campo jogável: 1 célula de margem em volta.
// Ela dá a praia do autotile e o espaço para as construções transbordarem para
// cima sem serem cortadas pela borda do tabuleiro.
const TERRAIN = N + 2;

function key(x, y) { return x + '_' + y; }

// Enfeites decorativos (arbusto, árvore) — só visual, sem efeito no jogo.
// Posição determinística por célula (estável entre renders, não usa random).
function decorHash(x, y) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return h >>> 0;
}
function decorAt(x, y) {
  const h = decorHash(x, y);
  if (h % 100 >= 24) return null;               // ~24% das células ganham um enfeite
  const bush = { kind: 'bush', variant: 1 + ((h >>> 16) % 4) };
  if ((h >>> 8) % 10 < 7) return bush;          // arbusto (mais comum, cabe num tile)
  if (y === 0) return bush;                     // linha do castelo fica limpa
  return { kind: 'tree', variant: 1 + ((h >>> 20) % 2) };
}

// Autotile da praia: o bloco 4×4 do Tilemap é um nine-slice nas colunas/linhas
// 0..2 (0 = borda inicial, 1 = miolo, 2 = borda final) MAIS uma quarta faixa de
// variantes "ilha de 1 tile de largura", que trazem o contorno escuro dos DOIS
// lados. Fechar a ilha com o índice 3 desenhava justamente essa tira isolada e
// deixava um contorno sobrando para dentro do gramado na última coluna/linha.
// O índice 2 é a borda de verdade: contorno só no lado de fora.
function tileIndex(a, max) {
  if (a === 0) return 0;
  if (a === max) return 2;
  return 1;
}

function getCellSize() {
  const sampleCell = gridEl.querySelector('.cell');
  return sampleCell ? sampleCell.getBoundingClientRect().width : 40;
}

// Espalha as POP criaturas dentro da célula para elas não empilharem exatamente
// no mesmo pixel quando estão todas no mesmo bloco.
let subCache = { size: -1, list: [] };
function subPositions(cellSize) {
  if (subCache.size === cellSize) return subCache.list;
  const cols = 5, rows = Math.ceil(POP / cols);
  const step = Math.max(1, Math.round(cellSize * 0.085));
  const list = [];
  for (let i = 0; i < POP; i++) {
    list.push({
      x: ((i % cols) - (cols - 1) / 2) * step,
      y: (Math.floor(i / cols) - (rows - 1) / 2) * step,
    });
  }
  subCache = { size: cellSize, list };
  return list;
}

function getRenderMetrics() {
  const cellSize = getCellSize();
  return { cellSize, subPositions: subPositions(cellSize) };
}

// ══ STATE ════════════════════════════════════════
let pop      = [];
let gen      = 1;
let stepN    = 0;
let stepLimit = GLEN;  // limite de passos da geração atual (cresce se o objetivo entra na visão)
let handle   = null;
let delay    = SPEEDS[0];
let paused   = false;
let trail    = [];
let genEndTimer = null;
let neat     = null;

let phase    = 'build';        // 'build' | 'watch'
let tool     = 'tower';        // ferramenta de construção atual
let towers   = new Set();      // "x_y" impassáveis que atiram
let traps    = new Set();      // "x_y" que matam quem pisa
let liveTraps = new Set();     // armadilhas ainda intactas na geração atual (quebram ao matar)
let spentTowers = new Set();   // torres que já deram seu único tiro nesta geração
let liveTowers = new Set();    // torres ainda de pé na geração atual (caem com TOWER_HP batidas)
let towerHp    = new Map();    // "x_y" -> vida restante da torre
let enemyStarts = [];          // [{x,y}] posições iniciais dos inimigos
let enemies  = [];             // inimigos vivos durante a fase de assistir
let painting = false;          // arrastar para pintar defesas
let bfsField = null;           // distância BFS de cada célula até a espada (contornando torres)
let bfsMax   = 1;              // maior distância BFS alcançável

// ══ DOM REFS ════════════════════════════════════
const gridEl   = document.getElementById('grid');
const agEl     = document.getElementById('agents');
const enemyEl  = document.getElementById('enemies');
const fxEl     = document.getElementById('fx');
const visionEl = document.getElementById('vision');
const brainLiveEl = document.getElementById('brain-live');
const brainSubEl  = document.getElementById('brain-sub');
const genEl    = document.getElementById('gen-val');
const distEl   = document.getElementById('dist-val');
const stepEl   = document.getElementById('step-val');
const statusEl = document.getElementById('status');
const phaseEl  = document.getElementById('phase');
const listEl   = document.getElementById('pop-list');
const overlayEl= document.getElementById('overlay');
const pauseBtn = document.getElementById('pause-btn');
const toastEl  = document.getElementById('gen-toast');

// ══ BUILD DOM ════════════════════════════════════
// A ilha inteira (TERRAIN×TERRAIN): praia nas bordas, grama no miolo. Fica atrás
// do campo jogável, que é um N×N deslocado de 1 célula (ver .play no CSS).
function buildTerrain() {
  const t = document.getElementById('terrain');
  if (!t) return;
  t.innerHTML = '';
  const max = TERRAIN - 1;
  for (let ty = 0; ty < TERRAIN; ty++) {
    for (let tx = 0; tx < TERRAIN; tx++) {
      const d = document.createElement('div');
      d.className = 'tile';
      const col = tileIndex(tx, max);
      const row = tileIndex(ty, max);
      // Sheet de 9×6 tiles: em background-position percentual, o índice i da
      // coluna vira i/(9-1) e o da linha, i/(6-1).
      d.style.backgroundPosition = `${(col / 8) * 100}% ${(row / 5) * 100}%`;
      t.appendChild(d);
    }
  }
  // Ovelhas pastando na praia — o anel de margem da ilha, fora do campo jogável.
  // As coordenadas seguem TERRAIN: fixá-las quebraria a cada mudança de N.
  const edge = TERRAIN - 1;
  [[0, 3], [edge, edge - 4], [2, edge], [edge - 3, 0]].forEach(([tx, ty]) => {
    const s = document.createElement('div');
    s.className = 'sheep';
    s.style.left = `calc(var(--cell) * ${tx + 0.5})`;
    s.style.top  = `calc(var(--cell) * ${ty + 0.5})`;
    t.appendChild(s);
  });
}

function buildGrid() {
  buildTerrain();
  gridEl.innerHTML = '';
  for (let y=0; y<N; y++) {
    for (let x=0; x<N; x++) {
      const c = document.createElement('div');
      c.className = 'cell';
      c.id = 'c' + key(x, y);
      if (x===GOAL.x && y===GOAL.y) {
        c.classList.add('goal-cell');
        c.innerHTML = '<span class="goal-mark" aria-label="Castelo — objetivo a defender"></span>';
      } else if (x===START.x && y===START.y) {
        c.innerHTML = '<span class="start-mark" aria-label="Quartel dos invasores"></span>';
      } else {
        const d = decorAt(x, y);
        if (d) c.innerHTML = `<span class="decor decor-${d.kind} v${d.variant}" aria-hidden="true"></span>`;
      }
      gridEl.appendChild(c);
    }
  }
}

function buildDots() {
  agEl.innerHTML = '';
  for (let i=0; i<POP; i++) {
    const agent = document.createElement('div');
    agent.className = 'agent';
    agent.id = `a${i}`;

    const label = document.createElement('div');
    label.className = 'dot-label';
    label.id = `n${i}`;

    // O tamanho do sprite vem do CSS (caixa de 3×3 células centrada na célula,
    // que é a moldura de 192 px do pacote). Nada de dimensão inline aqui.
    const d = document.createElement('div');
    d.className = 'dot';
    d.id = `d${i}`;

    agent.appendChild(label);
    agent.appendChild(d);
    agEl.appendChild(agent);
  }
}

// ══ GA PRIMITIVES ════════════════════════════════
function mv(pos, dir) {
  let {x,y} = pos;
  if (dir==='U') y = Math.max(0, y-1);
  if (dir==='D') y = Math.min(MAXI, y+1);
  if (dir==='L') x = Math.max(0, x-1);
  if (dir==='R') x = Math.min(MAXI, x+1);
  return {x,y};
}

function dist(pos) {
  return Math.abs(pos.x - GOAL.x) + Math.abs(pos.y - GOAL.y);
}

// Campo de "custo até a espada" (faro), contornando torres E evitando o alcance
// delas: Dijkstra onde entrar numa célula exposta a torre custa muito mais. Assim
// o gradiente aponta por caminhos seguros, não colando na parede (onde leva tiro).
const DANGER_COST = 8;
function computeBFS() {
  // células no alcance de alguma torre = expostas (caras de atravessar)
  const exposed = new Set();
  towers.forEach(tk => {
    const i = tk.indexOf('_'), tx = +tk.slice(0, i), ty = +tk.slice(i + 1);
    for (let dy = -TOWER_RANGE; dy <= TOWER_RANGE; dy++)
      for (let dx = -TOWER_RANGE; dx <= TOWER_RANGE; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > TOWER_RANGE) continue;
        const x = tx + dx, y = ty + dy;
        if (x < 0 || y < 0 || x > MAXI || y > MAXI) continue;
        exposed.add(key(x, y));
      }
  });

  bfsField = new Map();
  const cost = new Map();
  cost.set(key(GOAL.x, GOAL.y), 0);
  const done = new Set();
  const nb = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  bfsMax = 0;
  while (true) {
    let bk = null, bc = Infinity;                 // extrai menor custo pendente
    cost.forEach((c, k) => { if (!done.has(k) && c < bc) { bc = c; bk = k; } });
    if (bk === null) break;
    done.add(bk);
    bfsField.set(bk, bc);
    if (bc > bfsMax) bfsMax = bc;
    const i = bk.indexOf('_'), x = +bk.slice(0, i), y = +bk.slice(i + 1);
    for (let j = 0; j < 4; j++) {
      const nx = x + nb[j][0], ny = y + nb[j][1];
      if (nx < 0 || ny < 0 || nx > MAXI || ny > MAXI) continue;
      const k = key(nx, ny);
      if (towers.has(k) || traps.has(k) || done.has(k)) continue; // armadilha também é intransponível no caminho seguro
      const nc = bc + 1 + (exposed.has(k) ? DANGER_COST : 0);
      if (nc < (cost.has(k) ? cost.get(k) : Infinity)) cost.set(k, nc);
    }
  }
  if (bfsMax < 1) bfsMax = 1;
}
function bfsDistOf(x, y) {
  if (!bfsField) return MAXDIST;
  const v = bfsField.get(key(x, y));
  return v === undefined ? bfsMax + 5 : v;   // inalcançável = pior que tudo
}

// Ranking/líder (menor = melhor): distância pelo caminho real + penalidade de morte.
function fitness(a) {
  return bfsDistOf(a.pos.x, a.pos.y) + (a.dead ? DEAD_PENALTY : 0);
}

// Aptidão p/ o NEAT (maior = melhor): menor distância-BFS já alcançada no trajeto.
function neatFitness(a) {
  let f = bfsMax - a.bestBfs + EXPLORE_BONUS * a.seen.size; // + bônus por explorar células novas
  if (a.reached) f += 100;
  if (a.dead)    f *= 0.4;
  return Math.max(0.05, f);
}

// O que a criatura "vê" num bloco: positivo = bom, negativo = perigo.
function cellSense(cx, cy) {
  if (cx<0 || cy<0 || cx>MAXI || cy>MAXI) return -1;        // fora da grade (parede)
  if (liveTowers.has(key(cx,cy))) return -1;                // torre (parede; some quando destruída)
  if (enemies.some(e => e.x===cx && e.y===cy)) return -0.8; // inimigo
  if (liveTraps.has(key(cx,cy))) return -0.6;               // armadilha (só as intactas)
  if (cx===GOAL.x && cy===GOAL.y) return 1;                 // espada (objetivo)
  return 0;                                                 // grama livre
}

// Sensores EGOCÊNTRICOS (tudo relativo ao rosto): cone à frente +
// faro DIRECIONAL (frente/esquerda/direita/trás).
function sensors(a) {
  const x = a.pos.x, y = a.pos.y, f = a.facing;
  const v = DIRVEC[f] || DIRVEC.U;
  const s = [];
  for (const c of CONE) {                                  // cone (olhar à frente, 2 de alcance)
    s.push(cellSense(x + v.fx*c.f + v.px*c.l, y + v.fy*c.f + v.py*c.l));
  }
  // Faro DIRECIONAL: a proximidade do castelo em CADA vizinha relativa ao rosto
  // (frente, esquerda, direita, trás). 1 = castelo ali; ~0 = longe. O campo-custo
  // já contorna torres/barricadas e foge da linha de tiro, então o gradiente entre
  // as quatro direções diz PARA QUE LADO virar — é o que a rede aprende a seguir.
  // Parede/fora da grade não têm cheiro: 0.
  const rel = [f, TURN_L[f], TURN_R[f], TURN_B[f]];         // frente, esquerda, direita, trás
  const scent = (cx, cy) =>
    (cx < 0 || cy < 0 || cx > MAXI || cy > MAXI || towers.has(key(cx, cy)))
      ? 0 : (bfsMax - bfsDistOf(cx, cy)) / bfsMax;
  rel.forEach(d => s.push(scent(x + DIRVEC[d].fx, y + DIRVEC[d].fy)));
  s.push(a.brain.seed || 0);                                // traço "aleatório" fixo por criatura (sim. determinística)
  return s;
}

function makeAgent(brain, name, color) {
  return { brain, name, color, facing: 'U', pos: {...START}, reached: false, dead: false, hidden: false, bestBfs: Infinity, seen: new Set([key(START.x, START.y)]), path: [{...START}] };
}

// ══ EVOLVE ═══════════════════════════════════════
function buildPopFromGenomes() {
  const usedColors = [];
  pop = neat.genomes.map(g => {
    const color = createCreatureColor({ usedColors });
    usedColors.push(color);
    return makeAgent(g, createCreatureName(), color);
  });
}

function evolve() {
  // melhor caminho (menor distância-BFS) vira o rastro mostrado
  let best = pop[0];
  pop.forEach(a => { if (bfsDistOf(a.pos.x, a.pos.y) < bfsDistOf(best.pos.x, best.pos.y)) best = a; });
  trail = best.path.slice();

  // NEAT evolui pesos + topologia a partir da aptidão de cada rede
  const fits = pop.map(a => neatFitness(a));
  neat.evolve(fits);              // fits alinhado a neat.genomes (== ordem de pop)
  buildPopFromGenomes();
}

function initPop() {
  neat = NEAT.createPopulation(NUM_INPUTS, NUM_OUTPUTS, POP);
  buildPopFromGenomes();
}

// ══ FASE 1 · CONSTRUÇÃO ══════════════════════════
function budgetUsed() {
  return towers.size + traps.size + enemyStarts.length;
}

function setTool(t) {
  tool = t;
  ['tower','trap','enemy','erase'].forEach(k => {
    const b = document.getElementById('tool-' + k);
    if (b) {
      const on = k === t;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }
  });
}

function updateBudget() {
  const left = BUDGET - budgetUsed();
  const el = document.getElementById('budget-left');
  if (el) el.textContent = left;
  const total = document.getElementById('budget-total');
  if (total) total.textContent = BUDGET;   // o total sai do BUDGET, não do HTML
  const wrap = document.getElementById('budget');
  if (wrap) wrap.classList.toggle('empty', left <= 0);
}

function placeAt(x, y) {
  if (phase !== 'build') return;
  if (x===GOAL.x && y===GOAL.y) return;
  if (x===START.x && y===START.y) return;

  const k = key(x, y);
  const eIdx = enemyStarts.findIndex(e => e.x===x && e.y===y);
  const occupied = towers.has(k) || traps.has(k) || eIdx >= 0;

  if (tool === 'erase') {
    towers.delete(k);
    traps.delete(k);
    if (eIdx >= 0) enemyStarts.splice(eIdx, 1);
  } else {
    if (occupied) return;
    if (budgetUsed() >= BUDGET) return;
    if (tool === 'tower') towers.add(k);
    else if (tool === 'trap') traps.add(k);
    else if (tool === 'enemy') enemyStarts.push({x, y});
  }

  renderDefenses();
  renderEnemies(enemyStarts);
  updateBudget();
}

function clearDefenses() {
  if (phase !== 'build') return;
  towers.clear();
  traps.clear();
  enemyStarts = [];
  renderDefenses();
  renderEnemies(enemyStarts);
  updateBudget();
}

// ══ EXPORTAR CENÁRIO (copiar matriz) ════════════
function buildScenarioText() {
  const rows = [];
  for (let y = 0; y < N; y++) {
    const r = [];
    for (let x = 0; x < N; x++) {
      let ch = '.';
      if (x === GOAL.x && y === GOAL.y) ch = '*';
      else if (x === START.x && y === START.y) ch = 'S';
      else if (towers.has(key(x, y))) ch = 'T';
      else if (traps.has(key(x, y))) ch = 'A';
      else if (enemyStarts.some(e => e.x === x && e.y === y)) ch = 'E';
      r.push(ch);
    }
    rows.push(r.join(' '));
  }
  const coords = (set) => [...set].map(k => { const i = k.indexOf('_'); return '(' + k.slice(0, i) + ',' + k.slice(i + 1) + ')'; });
  const t = coords(towers), a = coords(traps), e = enemyStarts.map(p => '(' + p.x + ',' + p.y + ')');
  return [
    'Tiny Creatures - cenario ' + N + 'x' + N + ' (y=0 topo/espada, y=' + MAXI + ' base)',
    '',
    ...rows,
    '',
    'Legenda: *=espada  S=base  T=torre  A=armadilha  E=inimigo  .=livre',
    'Torres (' + t.length + '): ' + (t.join(' ') || '-'),
    'Armadilhas (' + a.length + '): ' + (a.join(' ') || '-'),
    'Inimigos (' + e.length + '): ' + (e.join(' ') || '-'),
  ].join('\n');
}

// Guarda/repõe o innerHTML: o botão carrega um <span class="ico">, e mexer em
// textContent apagaria o ícone de vez.
function flashCopy() {
  const b = document.getElementById('copy-btn');
  if (!b) return;
  if (!b.dataset.html) b.dataset.html = b.innerHTML;
  b.innerHTML = '<span class="ico ico-play" aria-hidden="true"></span>COPIADO!';
  clearTimeout(flashCopy._t);
  flashCopy._t = setTimeout(() => { b.innerHTML = b.dataset.html; }, 1300);
}

function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    flashCopy();
  } catch (err) {
    window.prompt('Copie o cenário (Ctrl+C, Enter):', text);
  }
}

function copyMap() {
  const text = buildScenarioText();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(flashCopy, () => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function onGridPointer(e) {
  if (phase !== 'build') return;
  if (e.type === 'pointerdown') painting = true;
  if (!painting) return;
  const cell = e.target.closest('.cell');
  if (!cell || !cell.id) return;
  const m = /^c(\d+)_(\d+)$/.exec(cell.id);
  if (!m) return;
  placeAt(+m[1], +m[2]);
}

function startBuild() {
  if (handle) clearInterval(handle);
  if (genEndTimer) { clearTimeout(genEndTimer); genEndTimer = null; }
  phase = 'build';
  paused = false;
  document.body.classList.remove('phase-watch');
  document.body.classList.add('phase-build');
  overlayEl.style.display = 'none';
  if (toastEl) toastEl.classList.remove('show');
  pauseBtn.textContent = 'PAUSAR';
  pauseBtn.classList.remove('active');

  pop = [];
  enemies = [];
  agEl.innerHTML = '';
  gen = 1;
  genEl.textContent = '001';
  distEl.textContent = '—';
  stepEl.textContent = '0 / ' + GLEN;
  phaseEl.style.width = '0%';

  document.querySelectorAll('.cell.trail').forEach(c => c.classList.remove('trail'));
  if (visionEl) visionEl.style.display = 'none';
  updateBrainLive(null);
  renderDefenses();
  renderEnemies(enemyStarts);
  updateBudget();
  setStatus('CONSTRUÇÃO · POSICIONE AS DEFESAS', 'building');
}

// ══ FASE 2 · ASSISTIR ════════════════════════════
function startDefense() {
  phase = 'watch';
  document.body.classList.remove('phase-build');
  document.body.classList.add('phase-watch');
  computeBFS();          // campo do caminho real (faro) com as defesas atuais
  liveTraps = new Set(traps);
  liveTowers = new Set(towers);
  towerHp = new Map();
  towers.forEach(k => towerHp.set(k, TOWER_HP));
  buildDots();
  initPop();                        // cérebros 100% aleatórios — sem treino escondido
  gen = 1;
  genEl.textContent = '001';
  trail = [];
  renderDefenses();
  render();
  // Começa direto na GERAÇÃO 1 com cérebros aleatórios: o jogador assiste a IA
  // aprender do zero, geração após geração, pela seleção natural.
  showGenToast(gen);
  setStatus('GERAÇÃO 1 · CÉREBROS ALEATÓRIOS', 'running');
  startGen();
}

function startGen() {
  if (genEndTimer) { clearTimeout(genEndTimer); genEndTimer = null; }
  if (fxEl) fxEl.innerHTML = '';
  resetPositions();
  render();
  if (handle) clearInterval(handle);
  handle = setInterval(tick, delay);
}

function stepEnemies() {
  enemies.forEach(e => {
    let target = null, best = 1e9;
    pop.forEach(a => {
      if (a.reached || a.dead) return;
      const d = Math.abs(a.pos.x - e.x) + Math.abs(a.pos.y - e.y);
      if (d < best) { best = d; target = a; }
    });
    if (!target) return;

    const dx = target.pos.x - e.x, dy = target.pos.y - e.y;
    let nx = e.x, ny = e.y;
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) nx += Math.sign(dx);
    else if (dy !== 0) ny += Math.sign(dy);

    // desvia de torres: tenta o outro eixo
    if (towers.has(key(nx, ny))) {
      nx = e.x; ny = e.y;
      if (dy !== 0) ny += Math.sign(dy);
      else if (dx !== 0) nx += Math.sign(dx);
    }
    nx = Math.max(0, Math.min(MAXI, nx));
    ny = Math.max(0, Math.min(MAXI, ny));
    if (!towers.has(key(nx, ny))) {
      if (nx !== e.x) e.face = Math.sign(nx - e.x); // sprite do pacote encara a direita
      e.x = nx; e.y = ny;
    }
  });
}

// Criatura bateu numa torre: tira 1 de vida. Na primeira batida ela racha; ao
// zerar a vida é destruída (some e deixa passar). Reseta a cada geração.
function damageTower(k) {
  const hp = (towerHp.get(k) || 0) - 1;
  towerHp.set(k, Math.max(0, hp));
  if (hp <= 0) {
    liveTowers.delete(k);
    const m = getRenderMetrics();
    const i = k.indexOf('_'), tx = +k.slice(0, i), ty = +k.slice(i + 1);
    const c = fxCenter(tx, ty, m);
    spawnImpact(c.x, c.y);
  }
}

// Move todas as criaturas um passo (decisão da rede + giro/avanço).
function moveAgents() {
  pop.forEach(a => {
    if (a.reached || a.dead || stepN >= stepLimit) return;

    // Espada logo ao lado? Pega — só basta chegar.
    const dgoal = Math.abs(a.pos.x - GOAL.x) + Math.abs(a.pos.y - GOAL.y);
    if (dgoal === 1) {
      a.facing = a.pos.y > GOAL.y ? 'U' : a.pos.y < GOAL.y ? 'D' : a.pos.x > GOAL.x ? 'L' : 'R';
      a.pos = { x: GOAL.x, y: GOAL.y };
      a.reached = true;
      a.bestBfs = 0;
      a.path.push({ ...a.pos });
      return;
    }

    // Decisão RELATIVA ao rosto: 0=andar  1=virar esq  2=virar dir  3=meia-volta.
    const out = neat.activate(a.brain, sensors(a));
    const order = [0, 1, 2, 3].sort((i, j) => out[j] - out[i]);
    let act = order[0];
    if (act === 0) {                                    // quer andar: só se a frente estiver livre
      const n = mv(a.pos, a.facing);
      const nk = key(n.x, n.y);
      if (n.x === a.pos.x && n.y === a.pos.y) {
        act = order[1];                                 // parede da borda → vira
      } else if (liveTowers.has(nk)) {
        damageTower(nk);                                // bateu na torre → dana e vira
        act = order[1];
      }
    }
    if (act === 0)      a.pos = mv(a.pos, a.facing);    // anda à frente
    else if (act === 1) a.facing = TURN_L[a.facing];   // vira à esquerda
    else if (act === 2) a.facing = TURN_R[a.facing];   // vira à direita
    else                a.facing = TURN_B[a.facing];   // meia-volta
    a.bestBfs = Math.min(a.bestBfs, bfsDistOf(a.pos.x, a.pos.y));
    a.seen.add(key(a.pos.x, a.pos.y));
    a.path.push({ ...a.pos });
    if (a.pos.x === GOAL.x && a.pos.y === GOAL.y) a.reached = true;
  });
}

// O objetivo (espada) está no cone de visão de alguma criatura viva?
function goalInVision() {
  for (const a of pop) {
    if (a.dead || a.reached) continue;
    const v = DIRVEC[a.facing] || DIRVEC.U;
    for (const c of CONE) {
      if (a.pos.x + v.fx * c.f + v.px * c.l === GOAL.x &&
          a.pos.y + v.fy * c.f + v.py * c.l === GOAL.y) return true;
    }
  }
  return false;
}

// Avança a simulação 1 passo. Retorna 'won' (chegou), 'over' (sem vivos) ou
// 'on'. headless=true pula efeitos visuais e a extensão de passos.
function advance(headless) {
  moveAgents();
  if (pop.some(a => a.reached)) return 'won';

  // inimigos perseguem
  stepEnemies();

  // mortes por armadilha / inimigo
  pop.forEach(a => {
    if (a.reached || a.dead) return;
    const k = key(a.pos.x, a.pos.y);
    if (liveTraps.has(k)) {                  // armadilha mata 1 e quebra: ambos somem do tabuleiro
      a.dead = true;
      a.hidden = true;
      liveTraps.delete(k);
      if (!headless) spawnDust(a.pos.x, a.pos.y);
      return;
    }
    const mob = enemies.find(e => e.x === a.pos.x && e.y === a.pos.y && e.kills < ENEMY_MAX_KILLS);
    if (mob) { a.dead = true; mob.kills++; } // o monstro contabiliza a morte
  });
  // monstro que atingiu o limite de mortes também morre (some do tabuleiro)
  if (!headless) enemies.forEach(e => { if (e.kills >= ENEMY_MAX_KILLS) spawnDust(e.x, e.y); });
  enemies = enemies.filter(e => e.kills < ENEMY_MAX_KILLS);

  // torres atiram (1 tiro por torre na geração inteira; só as que ainda estão de pé)
  liveTowers.forEach(tk => {
    if (spentTowers.has(tk)) return;          // já deu seu único tiro nesta geração
    const i = tk.indexOf('_');
    const tx = +tk.slice(0, i), ty = +tk.slice(i + 1);
    let target = null, best = 1e9;
    pop.forEach(a => {
      if (a.reached || a.dead) return;
      const d = Math.abs(a.pos.x - tx) + Math.abs(a.pos.y - ty);
      if (d <= TOWER_RANGE && d < best) { best = d; target = a; }
    });
    if (target) { if (!headless) spawnShot(tx, ty, target.pos.x, target.pos.y); target.dead = true; spentTowers.add(tk); }
  });

  // punição: quem fica muito atrás do líder (no caminho até a espada) é eliminado
  if (stepN >= 4) {
    let lead = Infinity;
    pop.forEach(a => { if (!a.dead && !a.reached) { const d = bfsDistOf(a.pos.x, a.pos.y); if (d < lead) lead = d; } });
    if (lead < Infinity) {
      pop.forEach(a => {
        if (!a.dead && !a.reached && bfsDistOf(a.pos.x, a.pos.y) > lead + LAG_MARGIN) a.dead = true;
      });
    }
  }

  // Objetivo à vista? A IA ganha mais passos pra finalizar (só no jogo visível).
  if (!headless && goalInVision() && stepLimit < STEP_LIMIT_MAX) {
    stepLimit = Math.min(STEP_LIMIT_MAX, Math.max(stepLimit, stepN + GOAL_VISION_BONUS));
  }

  return pop.some(a => !a.dead && !a.reached) ? 'on' : 'over';
}

function tick() {
  if (paused) return;
  const r = advance(false);
  if (r === 'won') { stepN++; render(); finishWatch(); return; }

  stepN++;
  phaseEl.style.width = (stepN / stepLimit * 100) + '%';
  stepEl.textContent  = `${stepN} / ${stepLimit}`;
  render();

  if (stepN >= stepLimit || r === 'over') { clearInterval(handle); onGenEnd(); }
}

// Reposiciona todas as criaturas na base (início de geração), sem desenhar.
function resetPositions() {
  stepN = 0;
  stepLimit = GLEN;
  pop.forEach(a => {
    a.pos = {...START};
    a.facing = 'U';
    a.reached = false;
    a.dead = false;
    a.hidden = false;
    a.bestBfs = bfsDistOf(START.x, START.y);
    a.seen = new Set([key(START.x, START.y)]);
    a.path = [{...START}];
  });
  liveTraps = new Set(traps);                 // armadilhas voltam intactas a cada geração
  spentTowers = new Set();                     // torres recarregam (1 tiro por geração)
  liveTowers = new Set(towers);                // torres voltam de pé a cada geração
  towerHp = new Map();
  towers.forEach(k => towerHp.set(k, TOWER_HP));
  enemies = enemyStarts.map((s, i) => ({...s, kills: 0, eid: i}));
}

function onGenEnd() {
  const bestD = Math.min(...pop.map(a => dist(a.pos)));
  const survivors = pop.filter(a => !a.dead).length;
  setStatus(`GEN ${gen} · MELHOR ${bestD} · VIVAS ${survivors}`, 'evolving');
  // Sem limite de gerações: evolui pra sempre até a IA alcançar a espada.
  genEndTimer = setTimeout(() => {
    evolve();
    continueToNextGeneration();
  }, GEN_PAUSE);
}

function continueToNextGeneration() {
  gen++;
  genEl.textContent = String(gen).padStart(3,'0');
  showGenToast(gen);
  setStatus(`GERAÇÃO ${gen}`, 'running');
  startGen();
}

function finishWatch() {
  if (handle) clearInterval(handle);
  if (genEndTimer) { clearTimeout(genEndTimer); genEndTimer = null; }
  render();
  setStatus(`IA VENCEU · ESPADA TOMADA NA GEN ${gen}`, 'success');
  // Em vez do cartaz genérico, mostra o CÉREBRO da criatura que venceu; o botão
  // "PRÓXIMA PARTIDA" dentro do inspetor é que devolve à construção.
  const wi = pop.findIndex(a => a.reached);
  setTimeout(() => showNetwork(wi >= 0 ? wi : 0, true), 500);
}

function showEnd(title, desc) {
  const t = document.getElementById('ov-title');
  const d = document.getElementById('ov-desc');
  if (t) t.innerHTML = title;
  if (d) d.innerHTML = desc;
  setTimeout(() => { overlayEl.style.display = 'flex'; }, 500);
}

// ══ INSPETOR DE REDE NEURAL ══════════════════════
const OUT_LABELS = ['andar', 'virar esq', 'virar dir', 'meia-volta'];

function fmtVal(v) { return (v >= 0 ? '+' : '') + v.toFixed(2); }

// Desenha um ícone do icons.js centrado em (cx,cy), escalado da grade 24×24 para
// `size`, tingido de `color` (via currentColor). Cada neurônio do inspetor usa um.
function iconSVG(name, cx, cy, size, color) {
  const inner = ICONS && ICONS[name];
  if (!inner) return '';
  const s = size / 24, x = cx - size / 2, y = cy - size / 2;
  return `<g transform="translate(${x} ${y}) scale(${s})" color="${color}" ` +
    `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ` +
    `stroke-linejoin="round">${inner}</g>`;
}

// Acha a criatura mais próxima do clique na grade e abre o inspetor.
function onGridClick(e) {
  if (phase !== 'watch') return;
  if (overlayEl.style.display === 'flex') return;
  const rect = gridEl.getBoundingClientRect();
  const m = getRenderMetrics();
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  let bi = -1, best = 1e9;
  pop.forEach((a, i) => {
    const sub = m.subPositions[i];
    const cx = a.pos.x * m.cellSize + sub.x + m.cellSize / 2;
    const cy = a.pos.y * m.cellSize + sub.y + m.cellSize / 2;
    const d = (cx - px) * (cx - px) + (cy - py) * (cy - py);
    if (d < best) { best = d; bi = i; }
  });
  const limit = (m.cellSize * 1.3) * (m.cellSize * 1.3);
  if (bi >= 0 && best <= limit) showNetwork(bi);
}

let netVictory = false;   // true quando o inspetor é o cérebro vencedor no fim da partida
function showNetwork(i, victory) {
  const a = pop[i];
  if (!a || !a.brain || !neat) return;
  netVictory = !!victory;

  // pausa a simulação para inspecionar
  paused = true;
  pauseBtn.textContent = 'CONTINUAR';
  pauseBtn.classList.add('active');
  pauseBtn.setAttribute('aria-pressed', 'true');

  const g = a.brain;
  const inputs = sensors(a);
  const outVals = neat.activate(g, inputs);
  const hidden = g.nodes.filter(n => n.type === 'hidden').length;
  const activeC = g.conns.filter(c => c.enabled).length;
  const st = a.reached ? 'chegou à espada' : (a.dead ? 'eliminada' : 'viva');

  document.getElementById('net-title').textContent =
    (victory ? 'Cérebro vencedor · ' : 'Rede neural · ') + a.name;
  document.getElementById('net-sub').innerHTML = victory
    ? `<span>${a.name}</span> tomou a espada na geração <span>${gen}</span> · ` +
      `${g.nodes.length} neurônios, ${activeC} conexões`
    : `${g.nodes.length} neurônios (${hidden} ocultos) · ${activeC} conexões ativas · ` +
      `distância ${dist(a.pos)} · <span>${st}</span>`;
  document.getElementById('net-diagram').innerHTML = buildNetSVG(g, inputs, outVals, a.facing);

  // no fim de partida o rodapé oferece "próxima partida"; na inspeção manual, só "fechar"
  const nextBtn = document.getElementById('net-next');
  const closeBtn = document.getElementById('net-close');
  if (nextBtn)  nextBtn.style.display  = victory ? '' : 'none';
  if (closeBtn) closeBtn.style.display = victory ? 'none' : '';

  document.getElementById('net-overlay').style.display = 'flex';
}

function closeNetwork() {
  document.getElementById('net-overlay').style.display = 'none';
  // fechar o cérebro vencedor = seguir para a próxima partida (volta à construção)
  if (netVictory) { netVictory = false; backToBuild(); }
}
function nextMatch() { closeNetwork(); }

function buildNetSVG(g, inputs, outVals, facing) {
  const firstOut = NUM_INPUTS + 1;
  const v = DIRVEC[facing] || DIRVEC.U;

  // profundidade dos nós (para as colunas da direita)
  const inc = {};
  g.conns.forEach(c => { if (c.enabled) (inc[c.to] = inc[c.to] || []).push(c.from); });
  const memo = {};
  function depth(id) {
    if (id in memo) return memo[id];
    memo[id] = 0;
    const ins = inc[id];
    if (ins && ins.length) { let mx = 0; for (const f of ins) mx = Math.max(mx, depth(f) + 1); memo[id] = mx; }
    return memo[id];
  }
  g.nodes.forEach(n => depth(n.id));

  // ── cone de visão (entradas 0..CONE.length-1) + "ela" no centro ──
  const coneOff = CONE.map(c => ({ ox: v.fx*c.f + v.px*c.l, oy: v.fy*c.f + v.py*c.l }));
  let minx = 0, maxx = 0, miny = 0, maxy = 0;
  coneOff.forEach(o => { minx = Math.min(minx, o.ox); maxx = Math.max(maxx, o.ox); miny = Math.min(miny, o.oy); maxy = Math.max(maxy, o.oy); });
  const gs = 30, sq = 24, ox0 = 66, oy0 = 70;
  const cellXY = (ox, oy) => ({ x: ox0 + (ox - minx) * gs, y: oy0 + (oy - miny) * gs });

  const pos = {};
  coneOff.forEach((o, i) => { pos[i] = cellXY(o.ox, o.oy); }); // entradas de visão = ids 0..3
  const selfP = cellXY(0, 0);

  const gridBottom = oy0 + (maxy - miny) * gs;
  const belowY = gridBottom + 48;
  // bias + faro (4 direções) + aleatorio (1) em uma linha abaixo do cone
  const belowNodes = g.nodes
    .filter(n => n.type === 'bias' || (n.type === 'in' && n.id >= CONE.length))
    .sort((p, q) => (p.type === 'bias' ? -1 : p.id) - (q.type === 'bias' ? -1 : q.id));
  belowNodes.forEach((n, i) => { pos[n.id] = { x: ox0 + i * gs * 1.1, y: belowY }; });

  // ── colunas da direita: ocultos por profundidade + saídas ──
  const hiddenNodes = g.nodes.filter(n => n.type === 'hidden');
  const outputs = g.nodes.filter(n => n.type === 'out').sort((a, b) => a.id - b.id);
  const depthsSet = {};
  hiddenNodes.forEach(n => { depthsSet[depth(n.id)] = 1; });
  const hiddenDepths = Object.keys(depthsSet).map(Number).sort((a, b) => a - b);
  const rightCols = hiddenDepths.map(d => hiddenNodes.filter(n => depth(n.id) === d)).concat([outputs]);

  const rightX0 = ox0 + (maxx - minx) * gs + 150;
  const colGap = 130, vgap = 36, top = 44;
  const maxRightRows = Math.max(1, ...rightCols.map(a => a.length));
  const height = Math.max(belowY + 40, top * 2 + (maxRightRows - 1) * vgap);
  const width = rightX0 + (rightCols.length - 1) * colGap + 190;

  rightCols.forEach((arr, ci) => {
    const n = arr.length, startY = (height - (n - 1) * vgap) / 2;
    arr.forEach((node, i) => { pos[node.id] = { x: rightX0 + ci * colGap, y: startY + i * vgap }; });
  });

  // ── conexões (atrás dos nós) ──
  let lines = '';
  g.conns.forEach(c => {
    const a = pos[c.from], b = pos[c.to];
    if (!a || !b) return;
    if (!c.enabled) {
      lines += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#5F574F" stroke-width="1" stroke-dasharray="3 3" opacity="0.3"/>`;
      return;
    }
    const col = c.w >= 0 ? '#00E436' : '#FF004D';
    const sw = Math.max(0.5, Math.min(5, Math.abs(c.w) * 1.4));
    lines += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${col}" stroke-width="${sw.toFixed(2)}" opacity="0.6"/>`;
  });

  // ── nós ──
  let nodes = '';

  // "ela" no centro + seta da direção que encara
  nodes += `<rect x="${selfP.x - sq/2}" y="${selfP.y - sq/2}" width="${sq}" height="${sq}" fill="#1D2B53" stroke="#FFA300" stroke-width="2"/>`;
  nodes += `<line x1="${selfP.x - v.fx*2}" y1="${selfP.y - v.fy*2}" x2="${selfP.x + v.fx*(sq/2-1)}" y2="${selfP.y + v.fy*(sq/2-1)}" stroke="#FFA300" stroke-width="3"/>`;

  // blocos do cone: cada célula vira o ÍCONE do que ela enxerga ali (castelo,
  // torre, sentinela, barricada ou grama), tingido pela cor da categoria.
  const coneMeta = (val) =>
    val > 0.5   ? { ic: 'crown',  c: '#f4c856' } :  // castelo (objetivo)
    val <= -1   ? { ic: 'wall',   c: '#8fb7cf' } :  // torre/parede
    val <= -0.7 ? { ic: 'swords', c: '#e0637a' } :  // sentinela
    val < -0.3  ? { ic: 'alert',  c: '#d68a3f' } :  // barricada
                  { ic: 'leaf',   c: '#7cc85f' };   // livre
  coneOff.forEach((o, i) => {
    const p = pos[i], m = coneMeta(inputs[i]);
    nodes += `<rect x="${p.x - sq/2}" y="${p.y - sq/2}" width="${sq}" height="${sq}" rx="4" fill="#16233f" stroke="#000" stroke-width="1"/>`;
    nodes += iconSVG(m.ic, p.x, p.y, sq * 0.72, m.c);
  });

  // viés + entradas não-espaciais: cada uma é um QUADRADO com um ícone vetorial
  // dentro (o cone acima já é a "visão"). Faro = alvo (proximidade do objetivo),
  // aleatório = dado, viés = "+". O número embaixo é o valor atual da entrada.
  const IN_META = [
    { lbl: 'faro fr',   ic: 'target', c: '#5cc8ff' },  // proximidade do castelo à frente
    { lbl: 'faro esq',  ic: 'target', c: '#5cc8ff' },  // à esquerda
    { lbl: 'faro dir',  ic: 'target', c: '#5cc8ff' },  // à direita
    { lbl: 'faro trás', ic: 'target', c: '#5cc8ff' },  // atrás
    { lbl: 'aleatório', ic: 'dice',   c: '#5cc8ff' },  // traço fixo por criatura (quebra empates)
  ];
  const nodeSquare = (p, icName, icColor, icScale, label, strokeCol) => {
    let out = `<rect x="${p.x - sq/2}" y="${p.y - sq/2}" width="${sq}" height="${sq}" rx="4" fill="#16233f" stroke="${strokeCol || '#000'}" stroke-width="1.5"/>`;
    out += iconSVG(icName, p.x, p.y, sq * icScale, icColor);
    if (label) out += `<text x="${p.x}" y="${p.y + sq/2 + 13}" text-anchor="middle" class="nl">${label}</text>`;
    return out;
  };
  g.nodes.forEach(n => {
    const p = pos[n.id];
    if (!p) return;
    if (n.type === 'bias') {
      nodes += nodeSquare(p, 'plus', '#c7bca4', 0.6, 'viés');
    } else if (n.type === 'in' && n.id >= CONE.length) {
      const m = IN_META[n.id - CONE.length] || { lbl: 'in', ic: 'plus', c: '#5cc8ff' };
      nodes += nodeSquare(p, m.ic, m.c, 0.72, `${m.lbl} <tspan class="nv">${fmtVal(inputs[n.id])}</tspan>`);
    }
  });

  // ocultos
  hiddenNodes.forEach(n => {
    const p = pos[n.id];
    if (p) nodes += `<circle cx="${p.x}" cy="${p.y}" r="6" fill="#FFA300" stroke="#000" stroke-width="1.5"/>`;
  });

  // saídas: cada ação é um QUADRADO com ícone direcional. A escolhida (maior
  // ativação) ganha moldura laranja e o marcador ◀.
  const OUT_ICONS = ['walk', 'turnLeft', 'turnRight', 'uturn']; // andar/esq/dir/meia-volta
  const chosen = outVals.indexOf(Math.max.apply(null, outVals));
  outputs.forEach(n => {
    const p = pos[n.id];
    if (!p) return;
    const o = n.id - firstOut, pick = (o === chosen);
    nodes += `<rect x="${p.x - sq/2}" y="${p.y - sq/2}" width="${sq}" height="${sq}" rx="5" fill="#123a1c" stroke="${pick ? '#FFA300' : '#000'}" stroke-width="${pick ? 2.5 : 1.5}"/>`;
    nodes += iconSVG(OUT_ICONS[o] || 'walk', p.x, p.y, sq * 0.72, pick ? '#9dff7e' : '#00E436');
    nodes += `<text x="${p.x + sq/2 + 7}" y="${p.y + 4}" text-anchor="start" class="nl${pick ? ' pick' : ''}">${OUT_LABELS[o] || ('s' + o)} <tspan class="nv">${fmtVal(outVals[o])}</tspan>${pick ? ' ◀' : ''}</text>`;
  });

  // legendas de seção (com o ícone de olho vetorial antes do rótulo da visão)
  const capX = ox0 - sq/2, capY = oy0 - sq/2 - 12;
  const caps =
    iconSVG('eye', capX + 7, capY - 5, 15, '#b9d2c6') +
    `<text x="${capX + 18}" y="${capY}" class="cap">VISÃO EM CONE (segue o olhar)</text>` +
    `<text x="${rightX0}" y="${top - 18}" text-anchor="middle" class="cap">decisão</text>`;

  return `<svg viewBox="0 0 ${width} ${height}" class="net-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Visão em cone e rede neural da criatura">${lines}${nodes}${caps}</svg>`;
}

// ══ RENDER ═══════════════════════════════════════
function renderDefenses() {
  document.querySelectorAll('.cell.tower, .cell.trap').forEach(c => c.classList.remove('tower','trap','cracked'));
  const towerSet = phase === 'watch' ? liveTowers : towers; // assistindo: torres destruídas somem
  towerSet.forEach(k => {
    const c = document.getElementById('c' + k);
    if (!c) return;
    c.classList.add('tower');
    if (phase === 'watch' && towerHp.get(k) < TOWER_HP) c.classList.add('cracked'); // levou batida → rachada
  });
  const trapSet = phase === 'watch' ? liveTraps : traps; // assistindo: mostra só as armadilhas intactas
  trapSet.forEach(k =>  { const c = document.getElementById('c' + k); if (c) c.classList.add('trap'); });
}

function renderEnemies(list) {
  const m = getRenderMetrics();
  // Cada inimigo tem um nó FIXO (chave por eid na fase de assistir; índice na
  // construção). Assim nascer/morrer não recria a camada inteira — sem o nó
  // novo "voar" do canto (0,0) até a célula por causa da transição CSS.
  // O nó tem o tamanho de UMA célula; o sprite de 192 px é centrado nela via CSS.
  const wanted = new Map();
  list.forEach((e, i) => wanted.set(e.eid != null ? 'e' + e.eid : 'i' + i, e));
  Array.from(enemyEl.children).forEach(d => { if (!wanted.has(d.dataset.eid)) d.remove(); });
  wanted.forEach((e, k) => {
    const left = (e.x * m.cellSize) + 'px';
    const top  = (e.y * m.cellSize) + 'px';
    let d = enemyEl.querySelector('[data-eid="' + k + '"]');
    if (!d) {
      d = document.createElement('div');
      d.className = 'mob';   // 'enemy' colidia com .tool-ico.enemy e .sw.enemy
      d.dataset.eid = k;
      d.style.left = left;   // nasce já posicionado (não anima a partir do canto)
      d.style.top  = top;
      enemyEl.appendChild(d);
    }
    d.classList.toggle('flip', e.face === -1);
    d.classList.toggle('running', phase === 'watch');
    d.style.left = left;
    d.style.top  = top;
  });
}

// ══ EFEITOS (tiro da torre + bolha de sangue na armadilha) ════════
function fxCenter(cx, cy, m) {
  return { x: cx * m.cellSize + m.cellSize / 2, y: cy * m.cellSize + m.cellSize / 2 };
}

// Flecha que sai da torre e voa até o alvo, terminando numa explosão.
// O sprite Arrow.png do pacote aponta para +X, então o ângulo é o atan2 direto.
function spawnShot(fromX, fromY, toX, toY) {
  if (!fxEl) return;
  const m = getRenderMetrics();
  const a = fxCenter(fromX, fromY, m), b = fxCenter(toX, toY, m);
  const s = document.createElement('div');
  s.className = 'shot';
  s.style.left = a.x + 'px';
  s.style.top  = a.y + 'px';
  s.style.setProperty('--dx', (b.x - a.x) + 'px');
  s.style.setProperty('--dy', (b.y - a.y) + 'px');
  s.style.setProperty('--ang', (Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI).toFixed(1) + 'deg');
  fxEl.appendChild(s);
  s.addEventListener('animationend', () => { s.remove(); spawnImpact(b.x, b.y); });
}

function spawnImpact(px, py) {
  if (!fxEl) return;
  const d = document.createElement('div');
  d.className = 'impact';
  d.style.left = px + 'px';
  d.style.top  = py + 'px';
  fxEl.appendChild(d);
  d.addEventListener('animationend', () => d.remove());
}

// Quem cai vira uma nuvem de poeira (Dust_01 do pacote). O respingo de sangue
// da versão anterior destoava do traço cartunesco do Tiny Swords.
function spawnDust(cx, cy) {
  if (!fxEl) return;
  const m = getRenderMetrics();
  const c = fxCenter(cx, cy, m);
  const d = document.createElement('div');
  d.className = 'dust';
  d.style.left = c.x + 'px';
  d.style.top  = c.y + 'px';
  fxEl.appendChild(d);
  d.addEventListener('animationend', () => d.remove());
}

// Cérebro do líder (quem está mais perto da espada) em tempo real.
let lastBrain = 0;
function updateBrainLive(a) {
  if (!brainLiveEl) return;
  if (!a || !a.brain || !neat) { brainLiveEl.innerHTML = '<div class="brain-empty">Inicie a defesa para ver o cérebro do líder em tempo real.</div>'; if (brainSubEl) brainSubEl.textContent = '—'; return; }
  const inputs = sensors(a);
  const outVals = neat.activate(a.brain, inputs);
  brainLiveEl.innerHTML = buildNetSVG(a.brain, inputs, outVals, a.facing);
  if (brainSubEl) {
    const hidden = a.brain.nodes.filter(n => n.type === 'hidden').length;
    const st = a.reached ? 'chegou' : (a.dead ? 'morta' : 'viva');
    brainSubEl.innerHTML = `<span>${a.name}</span> · dist ${dist(a.pos)} · ${hidden} ocultos · ${st}`;
  }
}

let visionPool = [];
// Desenha o cone de visão de cada criatura viva como tiles translúcidos.
function renderVision() {
  if (!visionEl) return;
  if (phase !== 'watch') { visionEl.style.display = 'none'; return; }
  visionEl.style.display = '';
  const m = getRenderMetrics();
  const seen = {};
  pop.forEach(a => {
    if (a.dead || a.reached) return;
    const v = DIRVEC[a.facing] || DIRVEC.U;
    for (const c of CONE) {
      const cx = a.pos.x + v.fx*c.f + v.px*c.l;
      const cy = a.pos.y + v.fy*c.f + v.py*c.l;
      if (cx<0 || cy<0 || cx>MAXI || cy>MAXI) continue;
      const k = cx + '_' + cy;
      seen[k] = (seen[k] || 0) + 1;
    }
  });
  const keys = Object.keys(seen);
  while (visionPool.length < keys.length) {
    const d = document.createElement('div');
    d.className = 'vision-cell';
    visionEl.appendChild(d);
    visionPool.push(d);
  }
  keys.forEach((k, i) => {
    const us = k.indexOf('_');
    const cx = +k.slice(0, us), cy = +k.slice(us + 1);
    const d = visionPool[i];
    d.style.display = '';
    d.style.width = m.cellSize + 'px';
    d.style.height = m.cellSize + 'px';
    d.style.left = (cx * m.cellSize) + 'px';
    d.style.top  = (cy * m.cellSize) + 'px';
    // mais criaturas olhando o mesmo bloco → levemente mais visível (cap suave)
    d.style.opacity = Math.min(0.22, 0.08 + seen[k] * 0.03).toFixed(2);
  });
  for (let i = keys.length; i < visionPool.length; i++) visionPool[i].style.display = 'none';
}

function render() {
  const metrics = getRenderMetrics();

  renderDefenses();   // armadilhas quebradas somem, monstros mortos já saíram da lista
  document.querySelectorAll('.cell.trail').forEach(c => c.classList.remove('trail'));
  trail.forEach(({x,y}) => {
    const c = document.getElementById('c' + key(x, y));
    if (c && !(x===GOAL.x&&y===GOAL.y) && !(x===START.x&&y===START.y)) c.classList.add('trail');
  });

  const ranked = pop
    .map((a,i) => ({a, i, d: dist(a.pos), f: fitness(a)}))
    .sort((x,y) => x.f - y.f);

  ranked.forEach(({a,i}, rank) => {
    const sub   = metrics.subPositions[i];
    const agent = document.getElementById(`a${i}`);
    const dot   = document.getElementById(`d${i}`);
    const label = document.getElementById(`n${i}`);
    if (!agent || !dot) return;

    agent.style.display = a.hidden ? 'none' : '';   // pego por armadilha → some do tabuleiro
    agent.style.left    = (a.pos.x * metrics.cellSize + sub.x) + 'px';
    agent.style.top     = (a.pos.y * metrics.cellSize + sub.y) + 'px';
    agent.classList.toggle('dead', a.dead);
    if (label) label.textContent = a.name;
    dot.classList.toggle('best',    rank === 0 && !a.reached && !a.dead);
    dot.classList.toggle('reached', a.reached);
    dot.classList.toggle('dead',    a.dead);
    dot.classList.toggle('running', phase === 'watch' && !a.dead && !a.reached);
    dot.classList.toggle('flip',    a.facing === 'L');  // o peão do pacote encara a direita
  });

  distEl.textContent = Math.min(...pop.map(a => dist(a.pos)));
  renderEnemies(enemies);
  renderVision();
  const nowB = Date.now();
  if (nowB - lastBrain > 100) { lastBrain = nowB; updateBrainLive(ranked[0] && ranked[0].a); }
  renderList(ranked);
}

function renderList(ranked) {
  listEl.innerHTML = '<div class="list-hdr">Companhia invasora</div>';
  ranked.forEach(({a,d}) => {
    const color = a.color;
    const pct   = Math.round(Math.max(0, (MAXDIST-d)/MAXDIST*100));
    const row   = document.createElement('div');
    row.className = 'list-row' + (a.dead ? ' dead-row' : '') + (a.reached ? ' reached-row' : '');
    row.innerHTML = `
      <div class="list-dot" style="background:${color}"></div>
      <div class="list-name">${a.name}</div>
      <div class="list-bar-bg">
        <div class="list-bar" style="width:${pct}%;background:${color}"></div>
      </div>
      <div class="list-dist">${a.reached ? '✓' : (a.dead ? '☠' : d)}</div>`;
    listEl.appendChild(row);
  });
}

// ══ CONTROLES ════════════════════════════════════
function setStatus(msg, cls) {
  statusEl.textContent = msg;
  statusEl.className   = 'status-line ' + cls;
}

let toastTimer = null;
function showGenToast(n) {
  if (!toastEl) return;
  toastEl.textContent = `GERAÇÃO ${n}`;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1200);
}

function togglePause() {
  if (phase !== 'watch') return;
  paused = !paused;
  pauseBtn.textContent = paused ? 'CONTINUAR' : 'PAUSAR';
  pauseBtn.classList.toggle('active', paused);
  pauseBtn.setAttribute('aria-pressed', String(paused));
}

function setSpeed(level) {
  delay = SPEEDS[level];
  if (handle) { clearInterval(handle); handle = setInterval(tick, delay); }
  for (let i=0; i<SPEEDS.length; i++) {
    const btn = document.getElementById(`s${i}`);
    if (!btn) continue;
    const on = i <= level;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
  }
}

// "Reiniciar" volta à construção mantendo as defesas montadas.
function reset() { startBuild(); }

// Botão do modal de fim de partida.
function backToBuild() { startBuild(); }

// ══ JANELA FLUTUANTE (HUD) ═══════════════════════
// O tabuleiro ocupa a tela inteira; o painel é uma janela por cima dele, que se
// minimiza (só a fita do título) e se arrasta pela fita. Enquanto ela estiver
// fechada o cenário aparece sem nada na frente.
const hudEl    = document.getElementById('hud');
const hudBarEl = document.getElementById('hud-bar');
const hudMinEl = document.getElementById('hud-min');

function toggleHud() {
  const min = hudEl.classList.toggle('min');
  hudMinEl.setAttribute('aria-expanded', String(!min));
  hudMinEl.setAttribute('aria-label', min ? 'Abrir painel de comando' : 'Minimizar painel de comando');
  hudMinEl.textContent = min ? '▴' : '▾';
}

// Arrastar: a janela nasce ancorada à direita (right/top). No primeiro arrasto ela
// passa a viver em left/top, presa aos limites da tela.
let hudDrag = null;
function hudClamp(x, y) {
  const w = hudEl.offsetWidth, h = hudBarEl.offsetHeight; // basta a fita continuar visível
  return {
    x: Math.min(Math.max(x, 8 - w + 60), window.innerWidth - 60),
    y: Math.min(Math.max(y, 0), window.innerHeight - h),
  };
}
hudBarEl.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.hud-min')) return;   // o botão de minimizar não arrasta
  const r = hudEl.getBoundingClientRect();
  hudDrag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
  hudEl.classList.add('dragging');
  hudBarEl.setPointerCapture(e.pointerId);
});
hudBarEl.addEventListener('pointermove', (e) => {
  if (!hudDrag) return;
  const p = hudClamp(e.clientX - hudDrag.dx, e.clientY - hudDrag.dy);
  hudEl.style.right = 'auto';
  hudEl.style.left = p.x + 'px';
  hudEl.style.top  = p.y + 'px';
});
hudBarEl.addEventListener('pointerup', () => { hudDrag = null; hudEl.classList.remove('dragging'); });

// H fecha/abre o painel — o jeito rápido de ver o mapa inteiro.
window.addEventListener('keydown', (e) => {
  if (e.key === 'h' || e.key === 'H') {
    if (e.target.closest('input,textarea')) return;
    toggleHud();
  }
});

// ══ BOOT ═════════════════════════════════════════
// O tabuleiro é desenhado com os sprites do Tiny Swords (ver styles.css); os
// BOARD_SPRITES em matriz de sprites.js não são mais usados.
buildGrid();
gridEl.addEventListener('pointerdown', onGridPointer);
gridEl.addEventListener('pointermove', onGridPointer);
window.addEventListener('pointerup', () => { painting = false; });
gridEl.addEventListener('pointerleave', () => { painting = false; });
gridEl.addEventListener('click', onGridClick);
const netOverlay = document.getElementById('net-overlay');
if (netOverlay) netOverlay.addEventListener('click', (e) => { if (e.target === netOverlay) closeNetwork(); });
setTool('tower');
setSpeed(2);   // default mais rápido: sem pré-treino, as primeiras gerações passam ligeiro
startBuild();

// Interfaces de observação determinística para a automação e depuração.
window.render_game_to_text = () => JSON.stringify({
  coordinateSystem: 'origem no canto superior esquerdo; x cresce para a direita, y para baixo',
  phase,
  generation: gen,
  step: stepN,
  stepLimit,
  playerObjective: { goal: GOAL, start: START },
  defenses: { towers: [...towers], traps: [...traps], sentinels: enemyStarts },
  agents: pop.filter(a => !a.hidden).map(a => ({ x: a.pos.x, y: a.pos.y, dead: a.dead, reached: a.reached })),
  enemies: enemies.map(e => ({ x: e.x, y: e.y, kills: e.kills })),
});
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / Math.max(16, delay)));
  for (let i = 0; i < steps && phase === 'watch' && !paused; i++) tick();
};

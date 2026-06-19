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
// Entradas: visão (cone à frente, 4) + faro até a bandeira (relativo, 4) + 1 aleatório = 9.
const NUM_INPUTS  = CONE.length + 4 + 1; // 9
const NUM_OUTPUTS = 4;     // saídas: U / D / L / R
const N       = 15;          // tabuleiro N×N
const MAXI    = N - 1;       // índice máximo (0..MAXI)
const CENTER  = (N - 1) >> 1;// coluna central
const MAXDIST = CENTER + MAXI; // maior distância possível até o objetivo
const GOAL   = {x:CENTER, y:0};    // topo central — espada (objetivo)
const START  = {x:CENTER, y:MAXI}; // base central — partida
const DIRS   = ['U','D','L','R'];
const SPEEDS = [220, 120, 70, 35, 12, 2]; // ms por passo
const GEN_PAUSE   = 650; // ms entre gerações (pra dar pra acompanhar)
const BUDGET      = 30;  // total de peças na construção
const TOWER_RANGE = 2;   // alcance (Manhattan) da torre
const ENEMY_MAX_KILLS = 2; // o inimigo (monstro) mata só isso e morre
const TOWER_HP = 2;        // batidas de criatura até a torre ser destruída (1ª racha)
const DEAD_PENALTY = 100; // penalidade de fitness para quem morre
const LAG_MARGIN   = 8;   // morre se ficar mais que isso atrás do líder (no caminho)
const EXPLORE_BONUS = 0.12; // bônus de fitness por célula nova visitada (incentiva explorar)
const GOAL_VISION_BONUS = 14;    // passos extras concedidos enquanto o objetivo está no cone de visão
const STEP_LIMIT_MAX = GLEN * 3; // teto da extensão de passos por geração
const PRETRAIN_GENS = 50;        // gerações pré-treinadas (ocultas) antes da "geração 1" visível

const SPRITES_DIR = SPRITES.getCreatureSprites();
const createCreatureColor = SPRITES.createCreatureColor;
const createCreatureName = SPRITES.createCreatureName;
const getResponsiveRenderMetrics = SPRITES.getResponsiveRenderMetrics;

function key(x, y) { return x + '_' + y; }

// Enfeites decorativos (grama, arbusto, árvore) — só visual, sem efeito no jogo.
// Posição determinística por célula (estável entre renders, não usa random).
function decorHash(x, y) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return h >>> 0;
}
function decorAt(x, y) {
  const h = decorHash(x, y);
  if (h % 100 >= 32) return null;          // ~32% das gramas ganham um enfeite
  const r = (h >>> 8) % 10;
  if (r < 5) return 'grass';               // graminha (mais comum)
  if (r < 8) return 'bush';                // arbusto
  return 'tree';                           // arvorezinha
}

function darkenHex(hex, f) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, Math.round(((n>>16)&0xff)*f));
  const g = Math.min(255, Math.round(((n>>8)&0xff)*f));
  const b = Math.min(255, Math.round((n&0xff)*f));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function spriteBoxShadow(bodyCol, facing) {
  const scale = getRenderMetrics().spriteScale;
  const darkCol = darkenHex(bodyCol, 0.55); // contorno/sombra
  const liteCol = darkenHex(bodyCol, 1.45); // brilho (fator > 1 clareia)
  const cm = { 1: bodyCol, 2: darkCol, 3: '#FFF1E8', 4: '#000000', 5: liteCol };
  const sprite = SPRITES_DIR[facing] || SPRITES_DIR.U;
  const parts = [];
  sprite.forEach((row, y) => row.forEach((px, x) => {
    if (px && cm[px]) parts.push(`${x * scale}px ${y * scale}px 0 ${cm[px]}`);
  }));
  return parts.join(',');
}

function getCellSize() {
  const sampleCell = gridEl.querySelector('.cell');
  return sampleCell ? sampleCell.getBoundingClientRect().width : 40;
}

function getRenderMetrics() {
  const cellSize = getCellSize();
  const metrics = getResponsiveRenderMetrics({ cellSize, population: POP });
  return {
    cellSize,
    spriteScale: metrics.spriteScale,
    spriteInset: metrics.spriteInset,
    subPositions: metrics.subPositions,
  };
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
let silentSim = false;         // true durante o pré-treino oculto (não desenha efeitos)

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
function buildGrid() {
  const colsEl = document.getElementById('coord-cols');
  const rowsEl = document.getElementById('coord-rows');
  if (colsEl) {
    colsEl.innerHTML = '';
    for (let x=0; x<N; x++) {
      const n = document.createElement('div');
      n.className = 'coord-num';
      n.textContent = x+1;
      colsEl.appendChild(n);
    }
  }
  if (rowsEl) {
    rowsEl.innerHTML = '';
    for (let y=0; y<N; y++) {
      const n = document.createElement('div');
      n.className = 'coord-num';
      n.textContent = y+1;
      rowsEl.appendChild(n);
    }
  }

  gridEl.innerHTML = '';
  for (let y=0; y<N; y++) {
    for (let x=0; x<N; x++) {
      const c = document.createElement('div');
      c.className = 'cell ' + ((x+y)%2===0 ? 'cell-a' : 'cell-b');
      c.id = 'c' + key(x, y);
      if (x===GOAL.x && y===GOAL.y) {
        c.classList.add('goal-cell');
        c.innerHTML = '<span class="sword-mark" aria-label="Espada — objetivo a defender">⚔</span>';
      } else if (x===START.x && y===START.y) {
        c.innerHTML = '<span class="start-mark" aria-label="Base das criaturas">▼</span>';
      } else {
        const d = decorAt(x, y);
        if (d) c.innerHTML = `<span class="decor decor-${d}" aria-hidden="true"></span>`;
      }
      gridEl.appendChild(c);
    }
  }
}

function buildDots() {
  agEl.innerHTML = '';
  const metrics = getRenderMetrics();
  for (let i=0; i<POP; i++) {
    const agent = document.createElement('div');
    agent.className = 'agent';
    agent.id = `a${i}`;

    const label = document.createElement('div');
    label.className = 'dot-label';
    label.id = `n${i}`;

    const d = document.createElement('div');
    d.className = 'dot';
    d.id = `d${i}`;
    d.style.width = metrics.spriteScale + 'px';
    d.style.height = metrics.spriteScale + 'px';

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
// faro (frente/esq/dir/trás) + o que ela vê em cada direção relativa.
function sensors(a) {
  const x = a.pos.x, y = a.pos.y, f = a.facing;
  const v = DIRVEC[f] || DIRVEC.U;
  const s = [];
  for (const c of CONE) {                                  // cone (olhar à frente, 2 de alcance)
    s.push(cellSense(x + v.fx*c.f + v.px*c.l, y + v.fy*c.f + v.py*c.l));
  }
  const rel = [f, TURN_L[f], TURN_R[f], TURN_B[f]];        // frente, esquerda, direita, trás
  const scent = (cx, cy) =>
    (cx < 0 || cy < 0 || cx > MAXI || cy > MAXI || towers.has(key(cx, cy)))
      ? 0 : (bfsMax - bfsDistOf(cx, cy)) / bfsMax;
  rel.forEach(d => s.push(scent(x + DIRVEC[d].fx, y + DIRVEC[d].fy)));       // faro até a bandeira (relativo)
  s.push(a.brain.seed || 0);                                                // traço "aleatório" fixo por criatura (sim. determinística)
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

function flashCopy() {
  const b = document.getElementById('copy-btn');
  if (!b) return;
  if (!b.dataset.label) b.dataset.label = b.textContent;
  b.textContent = '✓ COPIADO!';
  clearTimeout(flashCopy._t);
  flashCopy._t = setTimeout(() => { b.textContent = b.dataset.label; }, 1300);
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
  pauseBtn.textContent = '⏸ PAUSAR';
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
  initPop();
  gen = 1;
  genEl.textContent = '001';
  trail = [];
  renderDefenses();
  render();
  setStatus('TREINANDO IA...', 'evolving');
  // Pré-treino OCULTO: roda PRETRAIN_GENS gerações sem desenhar pra já começar
  // com cérebros bons. O setTimeout deixa o status pintar antes do trabalho síncrono.
  setTimeout(() => {
    if (phase !== 'watch') return;   // jogador voltou pra construção nesse meio tempo
    pretrain(PRETRAIN_GENS);
    trail = [];
    gen = 1;                       // mostra "Geração 1" (mas os cérebros são da 50ª)
    genEl.textContent = '001';
    showGenToast(gen);
    setStatus('GERAÇÃO 1', 'running');
    startGen();
  }, 30);
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
    if (!towers.has(key(nx, ny))) { e.x = nx; e.y = ny; }
  });
}

// Criatura bateu numa torre: tira 1 de vida. Na primeira batida ela racha; ao
// zerar a vida é destruída (some e deixa passar). Reseta a cada geração.
function damageTower(k) {
  const hp = (towerHp.get(k) || 0) - 1;
  towerHp.set(k, Math.max(0, hp));
  if (hp <= 0) {
    liveTowers.delete(k);
    if (!silentSim) {
      const m = getRenderMetrics();
      const i = k.indexOf('_'), tx = +k.slice(0, i), ty = +k.slice(i + 1);
      const c = fxCenter(tx, ty, m);
      spawnImpact(c.x, c.y);
    }
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
      if (!headless) spawnBlood(a.pos.x, a.pos.y);
      return;
    }
    const mob = enemies.find(e => e.x === a.pos.x && e.y === a.pos.y && e.kills < ENEMY_MAX_KILLS);
    if (mob) { a.dead = true; mob.kills++; } // o monstro contabiliza a morte
  });
  // monstro que atingiu o limite de mortes também morre (some do tabuleiro)
  if (!headless) enemies.forEach(e => { if (e.kills >= ENEMY_MAX_KILLS) spawnBlood(e.x, e.y); });
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

// Simula uma geração inteira sem render nem efeitos (usado no pré-treino).
function runHeadlessGen() {
  silentSim = true;
  resetPositions();
  while (stepN < stepLimit) {
    const r = advance(true);
    stepN++;
    if (r === 'won' || r === 'over') break;
  }
  silentSim = false;
}

// Pré-treino OCULTO: roda N gerações (simula + evolui) pra começar com cérebros
// já decentes. O jogador não vê e não precisa esperar as primeiras gerações.
function pretrain(gens) {
  for (let g = 0; g < gens; g++) {
    runHeadlessGen();
    evolve();
  }
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
  showEnd('<span class="ico" aria-hidden="true">⚔</span><br>IA VENCEU!',
          `A defesa caiu na geração <span>${gen}</span>.`);
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
    const cx = a.pos.x * m.cellSize + sub.x + m.spriteScale / 2;
    const cy = a.pos.y * m.cellSize + sub.y + m.spriteScale / 2;
    const d = (cx - px) * (cx - px) + (cy - py) * (cy - py);
    if (d < best) { best = d; bi = i; }
  });
  const limit = (m.cellSize * 1.3) * (m.cellSize * 1.3);
  if (bi >= 0 && best <= limit) showNetwork(bi);
}

function showNetwork(i) {
  const a = pop[i];
  if (!a || !a.brain || !neat) return;

  // pausa a simulação para inspecionar
  paused = true;
  pauseBtn.textContent = '▶ CONTINUAR';
  pauseBtn.classList.add('active');
  pauseBtn.setAttribute('aria-pressed', 'true');

  const g = a.brain;
  const inputs = sensors(a);
  const outVals = neat.activate(g, inputs);
  const hidden = g.nodes.filter(n => n.type === 'hidden').length;
  const activeC = g.conns.filter(c => c.enabled).length;
  const st = a.reached ? 'chegou à espada' : (a.dead ? 'eliminada' : 'viva');

  document.getElementById('net-title').textContent = 'Rede neural · ' + a.name;
  document.getElementById('net-sub').innerHTML =
    `${g.nodes.length} neurônios (${hidden} ocultos) · ${activeC} conexões ativas · ` +
    `distância ${dist(a.pos)} · <span>${st}</span>`;
  document.getElementById('net-diagram').innerHTML = buildNetSVG(g, inputs, outVals, a.facing);
  document.getElementById('net-overlay').style.display = 'flex';
}

function closeNetwork() {
  document.getElementById('net-overlay').style.display = 'none';
}

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
  // bias + faro (4 entradas) em uma linha abaixo do cone
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
  const colGap = 130, vgap = 30, top = 44;
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
  const visColor = (val) => {
    if (val > 0.5) return '#00E436';   // espada
    if (val <= -1) return '#C2C3C7';   // parede/torre
    if (val <= -0.7) return '#7E2553'; // inimigo
    if (val < -0.3) return '#FF004D';  // armadilha
    return '#1D2B53';                  // livre
  };
  let nodes = '';

  // "ela" no centro + seta da direção que encara
  nodes += `<rect x="${selfP.x - sq/2}" y="${selfP.y - sq/2}" width="${sq}" height="${sq}" fill="#1D2B53" stroke="#FFA300" stroke-width="2"/>`;
  nodes += `<line x1="${selfP.x - v.fx*2}" y1="${selfP.y - v.fy*2}" x2="${selfP.x + v.fx*(sq/2-1)}" y2="${selfP.y + v.fy*(sq/2-1)}" stroke="#FFA300" stroke-width="3"/>`;

  // blocos do cone (o que ela enxerga à frente)
  coneOff.forEach((o, i) => {
    const p = pos[i];
    nodes += `<rect x="${p.x - sq/2}" y="${p.y - sq/2}" width="${sq}" height="${sq}" fill="${visColor(inputs[i])}" stroke="#000" stroke-width="1"/>`;
  });

  // bias + bússola
  g.nodes.forEach(n => {
    const p = pos[n.id];
    if (!p) return;
    if (n.type === 'bias') {
      nodes += `<circle cx="${p.x}" cy="${p.y}" r="7" fill="#5F574F" stroke="#000" stroke-width="1.5"/>`;
      nodes += `<text x="${p.x}" y="${p.y + 19}" text-anchor="middle" class="nl">viés</text>`;
    } else if (n.type === 'in' && n.id >= CONE.length) {
      const ci = n.id - CONE.length;
      const lbl = ['faro frente', 'faro esq', 'faro dir', 'faro tras', 'aleatorio'][ci] || ('in' + ci);
      nodes += `<circle cx="${p.x}" cy="${p.y}" r="7" fill="#29ADFF" stroke="#000" stroke-width="1.5"/>`;
      nodes += `<text x="${p.x}" y="${p.y + 19}" text-anchor="middle" class="nl">${lbl} <tspan class="nv">${fmtVal(inputs[n.id])}</tspan></text>`;
    }
  });

  // ocultos
  hiddenNodes.forEach(n => {
    const p = pos[n.id];
    if (p) nodes += `<circle cx="${p.x}" cy="${p.y}" r="6" fill="#FFA300" stroke="#000" stroke-width="1.5"/>`;
  });

  // saídas
  const chosen = outVals.indexOf(Math.max.apply(null, outVals));
  outputs.forEach(n => {
    const p = pos[n.id];
    if (!p) return;
    const o = n.id - firstOut, pick = (o === chosen);
    nodes += `<circle cx="${p.x}" cy="${p.y}" r="8" fill="#00E436" stroke="${pick ? '#FFA300' : '#000'}" stroke-width="${pick ? 2.5 : 1.5}"/>`;
    nodes += `<text x="${p.x + 13}" y="${p.y + 3}" text-anchor="start" class="nl${pick ? ' pick' : ''}">${OUT_LABELS[o] || ('s' + o)} <tspan class="nv">${fmtVal(outVals[o])}</tspan>${pick ? ' ◀' : ''}</text>`;
  });

  // legendas de seção
  const caps =
    `<text x="${ox0 - sq/2}" y="${oy0 - sq/2 - 12}" class="cap">VISÃO EM CONE (segue o olhar)</text>` +
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
  const sz = Math.max(6, Math.round(m.cellSize * 0.62));
  // Cada inimigo tem um nó FIXO (chave por eid na fase de assistir; índice na
  // construção). Assim nascer/morrer não recria a camada inteira — sem o nó
  // novo "voar" do canto (0,0) até a célula por causa da transição CSS.
  const off = (m.cellSize - sz) / 2;       // canto já centralizado (sem depender de transform)
  const wanted = new Map();
  list.forEach((e, i) => wanted.set(e.eid != null ? 'e' + e.eid : 'i' + i, e));
  Array.from(enemyEl.children).forEach(d => { if (!wanted.has(d.dataset.eid)) d.remove(); });
  wanted.forEach((e, k) => {
    const left = (e.x * m.cellSize + off) + 'px';
    const top  = (e.y * m.cellSize + off) + 'px';
    let d = enemyEl.querySelector('[data-eid="' + k + '"]');
    if (!d) {
      d = document.createElement('div');
      d.className = 'enemy';
      d.dataset.eid = k;
      d.style.left = left;   // nasce já posicionado (não anima a partir do canto)
      d.style.top  = top;
      enemyEl.appendChild(d);
    }
    d.style.width  = sz + 'px';
    d.style.height = sz + 'px';
    d.style.left = left;
    d.style.top  = top;
  });
}

// ══ EFEITOS (tiro da torre + bolha de sangue na armadilha) ════════
function fxCenter(cx, cy, m) {
  return { x: cx * m.cellSize + m.cellSize / 2, y: cy * m.cellSize + m.cellSize / 2 };
}

// Projétil que sai da torre e voa até o alvo, terminando num clarão.
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

// A criatura vira uma bolha de sangue que incha, estoura e espalha gotas.
function spawnBlood(cx, cy) {
  if (!fxEl) return;
  const m = getRenderMetrics();
  const c = fxCenter(cx, cy, m);
  const sz = Math.max(10, Math.round(m.cellSize * 0.7));
  const b = document.createElement('div');
  b.className = 'blood';
  b.style.left = c.x + 'px';
  b.style.top  = c.y + 'px';
  b.style.width = sz + 'px';
  b.style.height = sz + 'px';
  fxEl.appendChild(b);
  b.addEventListener('animationend', () => b.remove());
  const n = 6;
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.7;
    const dd  = m.cellSize * (0.5 + Math.random() * 0.6);
    const drop = document.createElement('div');
    drop.className = 'droplet';
    drop.style.left = c.x + 'px';
    drop.style.top  = c.y + 'px';
    drop.style.setProperty('--dx', Math.cos(ang) * dd + 'px');
    drop.style.setProperty('--dy', Math.sin(ang) * dd + 'px');
    fxEl.appendChild(drop);
    drop.addEventListener('animationend', () => drop.remove());
  }
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
    const color = a.color;
    const sub   = metrics.subPositions[i];
    const agent = document.getElementById(`a${i}`);
    const dot   = document.getElementById(`d${i}`);
    const label = document.getElementById(`n${i}`);
    if (!agent || !dot) return;

    agent.style.display = a.hidden ? 'none' : '';   // pego por armadilha → some do tabuleiro
    dot.style.width     = metrics.spriteScale + 'px';
    dot.style.height    = metrics.spriteScale + 'px';
    agent.style.left    = (a.pos.x * metrics.cellSize + sub.x + metrics.spriteScale / 2) + 'px';
    agent.style.top     = (a.pos.y * metrics.cellSize + sub.y) + 'px';
    dot.style.boxShadow = spriteBoxShadow(color, a.facing);
    if (label) label.textContent = a.name;
    dot.classList.toggle('best',    rank === 0 && !a.reached && !a.dead);
    dot.classList.toggle('reached', a.reached);
    dot.classList.toggle('dead',    a.dead);
  });

  distEl.textContent = Math.min(...pop.map(a => dist(a.pos)));
  renderEnemies(enemies);
  renderVision();
  const nowB = Date.now();
  if (nowB - lastBrain > 100) { lastBrain = nowB; updateBrainLive(ranked[0] && ranked[0].a); }
  renderList(ranked);
}

function renderList(ranked) {
  listEl.innerHTML = '<div class="list-hdr">Criaturas</div>';
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
  pauseBtn.textContent = paused ? '▶ CONTINUAR' : '⏸ PAUSAR';
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

// Gera os sprites do tabuleiro a partir das matrizes (BOARD_SPRITES em
// sprites.js) e injeta como variáveis CSS (--spr-*) que os backgrounds usam.
function installSprites() {
  const root = document.documentElement.style;
  const B = SPRITES.BOARD_SPRITES;
  root.setProperty('--spr-sword', SPRITES.spriteToDataURL(B.sword));
  root.setProperty('--spr-base',  SPRITES.spriteToDataURL(B.base));
  root.setProperty('--spr-tower', SPRITES.spriteToDataURL(B.tower));
  root.setProperty('--spr-trap',  SPRITES.spriteToDataURL(B.trap));
  root.setProperty('--spr-enemy', SPRITES.spriteToDataURL(B.enemy));
  root.setProperty('--spr-grass', SPRITES.spriteToDataURL(B.grass));
  root.setProperty('--spr-bush',  SPRITES.spriteToDataURL(B.bush));
  root.setProperty('--spr-tree',  SPRITES.spriteToDataURL(B.tree));
}

// ══ BOOT ═════════════════════════════════════════
installSprites();
buildGrid();
gridEl.addEventListener('pointerdown', onGridPointer);
gridEl.addEventListener('pointermove', onGridPointer);
window.addEventListener('pointerup', () => { painting = false; });
gridEl.addEventListener('pointerleave', () => { painting = false; });
gridEl.addEventListener('click', onGridClick);
const netOverlay = document.getElementById('net-overlay');
if (netOverlay) netOverlay.addEventListener('click', (e) => { if (e.target === netOverlay) closeNetwork(); });
setTool('tower');
setSpeed(0);
startBuild();

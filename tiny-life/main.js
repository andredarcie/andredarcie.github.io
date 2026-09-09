/* tiny life — colônia de formigas minimalista.
 *
 * Como funciona: cada formiga é um ponto de ~1.4px com um estado só (procurando
 * ou carregando). Não há caminho calculado — elas seguem dois campos de feromônio
 * desenhados numa grade de baixa resolução:
 *   pHome  : deixado por quem está procurando  -> serve de trilha de volta ao ninho
 *   pFood  : deixado por quem está carregando  -> serve de trilha até a comida
 * Os campos evaporam e são borrados a cada quadro; a imagem borrada é o que dá o
 * visual de rastro suave. A colônia cresce com o que entra e encolhe por idade.
 *
 * O cenário é um pedaço de chão batido cercado de grama, assado uma vez num
 * canvas à parte (textura de terra + lâminas de grama) e só copiado a cada
 * quadro. A grama também é parede: a formiga não pisa nela.
 */

(() => {
  'use strict';

  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d', { alpha: false });

  // Canvas auxiliar em baixa resolução: os feromônios são pintados aqui e
  // esticados (com suavização) para a tela toda.
  const fieldCanvas = document.createElement('canvas');
  const fieldCtx = fieldCanvas.getContext('2d');

  // --- constantes de comportamento -----------------------------------------
  // O andar é run-and-tumble: corrida curta -> parada seca ou virada brusca ->
  // corrida de novo. Nada de velocidade constante, que é o que dá aspecto de
  // plâncton à deriva.
  const RUN = 0, PAUSE = 1, PIVOT = 2;

  const CRUISE = 46;         // px/s de referência (cada formiga varia em volta disso)
  const TURN = 5.5;          // rad/s ao corrigir o rumo pelo feromônio
  const HOME_TURN = 1.2;     // rad/s de "senso de direção" do ninho
  const DRIFT_DECAY = 2.6;   // 1/s — memória do ruído de rumo (Ornstein-Uhlenbeck)
  const DRIFT_NOISE = 5.2;
  const SENSE_DIST = 11;     // px até cada sensor
  const SENSE_ANGLE = 0.62;  // rad entre sensor central e laterais
  const TOUCH_DIST = 4;      // px — distância de antenação entre duas formigas
  const H_CELL = 12;         // px — célula da grade usada pra achar os encontros
  const TRAIL_LIFE = 42;     // s até o rastro de uma formiga virar nada
  const TAU_HOME = 17;       // s — constante de evaporação
  const TAU_FOOD = 11;
  const NEST_R = 13;
  const FOOD_COST = 5;       // unidades guardadas para nascer uma formiga
  const MIN_FOODS = 3;
  const MAX_FOODS = 6;

  // Paleta realista: terra batida sob luz de dia, cercada de grama. Em chão
  // claro trilha não brilha — ela escurece o solo, que é o que acontece mesmo
  // num caminho pisado.
  const SOIL = '#7e6349';
  const SOIL_LIGHT = [166, 138, 101];  // areia seca
  const SOIL_DARK = [74, 55, 38];      // terra úmida
  const GRASS_BED = '#33481f';
  const GRASS_TONE = [[86, 112, 52], [40, 58, 26]];
  const BLADES = ['#3f5a26', '#4a6a2c', '#587a33', '#65883b', '#2f451c', '#77974c'];
  const SEEDS = ['#cbb083', '#dcc79a', '#b9986a', '#e2d2ab'];
  const HOME_STAIN = [72, 58, 42];     // trilha de ida: terra pisada
  const FOOD_STAIN = [92, 54, 28];     // trilha da comida: barro mais escuro
  const ANT = 'rgba(22, 17, 13, 0.95)';
  const LOAD = 'rgba(228, 210, 168, 0.95)';

  // --- estado ---------------------------------------------------------------
  let W = 0, H = 0, dpr = 1;
  let cell = 6, cols = 0, rows = 0;
  let pHome = null, pFood = null, blurTmp = null, img = null;
  let dirt = null;      // > 0 onde é terra, < 0 onde é grama
  let dirtArea = 0;     // px² pisáveis — é daqui que sai o teto de população

  // O terreno é caro de desenhar e não muda: fica assado num canvas próprio e
  // cada quadro só copia ele de uma vez.
  const gnd = document.createElement('canvas');
  const gctx = gnd.getContext('2d');

  let hCols = 0, hRows = 0, hHead = null, hNext = null;

  let ants = [];
  let foods = [];
  let nest = { x: 0, y: 0 };
  let popCap = 200;
  let store = 0;
  let delivered = 0;
  let foodTimer = 0;
  let seedTimer = 0;
  let showTrails = true;
  let running = true;
  let crashed = false;
  let last = 0;
  let statTimer = 0;

  const elAnts = document.getElementById('stat-ants');
  const elFood = document.getElementById('stat-food');
  const elHint = document.getElementById('hint');
  const btnTrails = document.getElementById('btn-trails');
  const btnReset = document.getElementById('btn-reset');

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // --- dimensionamento ------------------------------------------------------

  function resize() {
    W = Math.max(320, window.innerWidth);
    H = Math.max(320, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Telas enormes ganham células maiores para o borrão não pesar.
    cell = W * H > 2600000 ? 8 : 6;
    cols = Math.ceil(W / cell);
    rows = Math.ceil(H / cell);

    fieldCanvas.width = cols;
    fieldCanvas.height = rows;
    pHome = new Float32Array(cols * rows);
    pFood = new Float32Array(cols * rows);
    blurTmp = new Float32Array(cols * rows);
    img = fieldCtx.createImageData(cols, rows);

    hCols = Math.ceil(W / H_CELL);
    hRows = Math.ceil(H / H_CELL);
    hHead = new Int32Array(hCols * hRows);
    hNext = null;

    nest.x = W / 2;
    nest.y = H / 2;

    // Faixa de grama proporcional à tela: no celular ela não pode comer metade
    // do terreiro.
    const margin = clamp(Math.min(W, H) * 0.11, 34, 130);
    shape.cx = nest.x;
    shape.cy = nest.y;
    shape.rx = W / 2 - margin;
    shape.ry = H / 2 - margin;
    for (let i = 0; i < shape.ph.length; i++) shape.ph[i] = Math.random() * Math.PI * 2;

    bakeDirt();
    bakeGround();
    popCap = Math.round(clamp(dirtArea / 4200, 110, 700));

    // Quem sobrou embaixo da grama depois do redimensionamento volta pro ninho.
    for (const a of ants) {
      if (dirtAt(a.x, a.y) <= 0) {
        a.x = nest.x + rand(-8, 8);
        a.y = nest.y + rand(-8, 8);
      }
    }
    for (let i = foods.length - 1; i >= 0; i--) {
      if (dirtAt(foods[i].x, foods[i].y) <= 0.05) foods.splice(i, 1);
    }
  }

  // --- terreno --------------------------------------------------------------
  // A borda do terreiro é uma superelipse com uma ondulação por cima (soma de
  // senos). Nada de retângulo nem de círculo perfeito: os dois entregam na hora
  // que aquilo é desenho. A mesma função serve pra pintar a grama e pra saber
  // onde a formiga pode pisar.

  const SHAPE_N = 2.6;
  const shape = { cx: 0, cy: 0, rx: 1, ry: 1, ph: [0, 0, 0, 0] };
  let windAng = 0;

  function wobble(th) {
    const p = shape.ph;
    return 0.030 * Math.sin(3 * th + p[0])
         + 0.022 * Math.sin(5 * th + p[1])
         + 0.014 * Math.sin(8 * th + p[2])
         + 0.009 * Math.sin(13 * th + p[3]);
  }

  function boundaryR(th) {
    const c = Math.abs(Math.cos(th) / shape.rx);
    const s = Math.abs(Math.sin(th) / shape.ry);
    return (1 + wobble(th)) / Math.pow(Math.pow(c, SHAPE_N) + Math.pow(s, SHAPE_N), 1 / SHAPE_N);
  }

  function shapePath() {
    const path = new Path2D();
    const steps = 260;
    for (let i = 0; i <= steps; i++) {
      const th = (i / steps) * Math.PI * 2;
      const r = boundaryR(th);
      const x = shape.cx + Math.cos(th) * r;
      const y = shape.cy + Math.sin(th) * r;
      if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
    }
    path.closePath();
    return path;
  }

  // Máscara do chão, na mesma grade dos feromônios: positivo é terra, e o valor
  // cresce conforme se afasta da grama.
  function bakeDirt() {
    dirt = new Float32Array(cols * rows);
    let inside = 0;
    for (let y = 0; y < rows; y++) {
      const py = y * cell + cell / 2 - shape.cy;
      for (let x = 0; x < cols; x++) {
        const px = x * cell + cell / 2 - shape.cx;
        const d = Math.sqrt(px * px + py * py);
        const v = 1 - d / boundaryR(Math.atan2(py, px));
        dirt[y * cols + x] = v;
        if (v > 0) inside++;
      }
    }
    dirtArea = inside * cell * cell;
  }

  function dirtAt(x, y) {
    const cx = (x / cell) | 0;
    const cy = (y / cell) | 0;
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return -1;
    return dirt[cy * cols + cx];
  }

  // Granulado de areia. Um azulejo de ruído puro não deixa ver a emenda quando
  // repetido, e sai muito mais barato que sortear pixel a pixel a tela inteira.
  function grainTile() {
    const t = document.createElement('canvas');
    t.width = t.height = 128;
    const tc = t.getContext('2d');
    const im = tc.createImageData(128, 128);
    const d = im.data;
    for (let i = 0, q = 0; i < 128 * 128; i++, q += 4) {
      const tone = Math.random() < 0.5 ? SOIL_LIGHT : SOIL_DARK;
      d[q] = tone[0]; d[q + 1] = tone[1]; d[q + 2] = tone[2];
      d[q + 3] = 24 + Math.random() * 50;
    }
    tc.putImageData(im, 0, 0);
    return t;
  }

  function blade(path, x, y, ang, len, curve) {
    const hx = Math.cos(ang), hy = Math.sin(ang);
    const px = -hy, py = hx;
    path.moveTo(x, y);
    path.quadraticCurveTo(
      x + hx * len * 0.55 + px * curve,
      y + hy * len * 0.55 + py * curve,
      x + hx * len + px * curve * 1.7,
      y + hy * len + py * curve * 1.7
    );
  }

  // Grama vista de cima: um monte de lâminas curtas e curvas, em ângulos
  // parecidos (o vento) mas nunca iguais. Agrupadas por cor pra sair em 6
  // traçados em vez de dezenas de milhares.
  function drawGrass(fringe) {
    const g = gctx;
    const paths = BLADES.map(() => new Path2D());

    if (fringe) {
      // Pontas invadindo a terra, senão a borda fica com cara de recorte.
      const n = Math.round((shape.rx + shape.ry) * 0.9);
      for (let i = 0; i < n; i++) {
        const th = Math.random() * Math.PI * 2;
        const r = boundaryR(th) * rand(0.985, 1.02);
        const x = shape.cx + Math.cos(th) * r;
        const y = shape.cy + Math.sin(th) * r;
        const inward = Math.atan2(shape.cy - y, shape.cx - x) + rand(-0.8, 0.8);
        blade(paths[(Math.random() * BLADES.length) | 0], x, y, inward, rand(4, 13), rand(-2.5, 2.5));
      }
    } else {
      g.fillStyle = GRASS_BED;
      g.fillRect(0, 0, W, H);

      // Manchas de sol e de sombra no gramado.
      const blobs = Math.round((W * H) / 16000);
      for (let i = 0; i < blobs; i++) {
        const x = Math.random() * W, y = Math.random() * H;
        const r = rand(40, 220);
        const tone = GRASS_TONE[Math.random() < 0.5 ? 0 : 1];
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(' + tone[0] + ',' + tone[1] + ',' + tone[2] + ',0.34)');
        grd.addColorStop(1, 'rgba(' + tone[0] + ',' + tone[1] + ',' + tone[2] + ',0)');
        g.fillStyle = grd;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }

      // Densidade contida de propósito: cada lâmina é uma curva traçada, e
      // dezenas de milhares delas debaixo de um recorte complexo custam caro
      // demais no celular.
      const want = Math.min(16000, Math.round((W * H - dirtArea) / 46));
      let placed = 0, tries = 0;
      while (placed < want && tries < want * 6) {
        tries++;
        const x = Math.random() * W, y = Math.random() * H;
        if (dirtAt(x, y) > 0.004) continue;   // aqui é terra, não planta
        placed++;
        blade(
          paths[(Math.random() * BLADES.length) | 0],
          x, y,
          windAng + rand(-1.15, 1.15),
          rand(6, 19),
          rand(-3.5, 3.5)
        );
      }
    }

    g.lineCap = 'round';
    for (let i = 0; i < paths.length; i++) {
      g.strokeStyle = BLADES[i];
      g.lineWidth = 1.1 + (i % 3) * 0.4;
      g.stroke(paths[i]);
    }
  }

  function bakeGround() {
    const t0 = performance.now();
    gnd.width = W;
    gnd.height = H;
    const g = gctx;
    windAng = Math.random() * Math.PI * 2;

    // 1) terra batida
    g.fillStyle = SOIL;
    g.fillRect(0, 0, W, H);

    // 2) manchas largas de areia seca e de terra úmida
    const blobs = Math.round((W * H) / 9000);
    for (let i = 0; i < blobs; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      const r = rand(28, 190);
      const tone = Math.random() < 0.5 ? SOIL_LIGHT : SOIL_DARK;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(' + tone[0] + ',' + tone[1] + ',' + tone[2] + ',0.3)');
      grd.addColorStop(1, 'rgba(' + tone[0] + ',' + tone[1] + ',' + tone[2] + ',0)');
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // 3) granulado
    g.fillStyle = g.createPattern(grainTile(), 'repeat');
    g.fillRect(0, 0, W, H);

    // 4) cascalho e gravetinho seco
    const grit = Math.round(dirtArea / 1300);
    for (let i = 0; i < grit; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      if (dirtAt(x, y) < 0.01) continue;
      const k = Math.random();
      g.fillStyle = k < 0.45 ? 'rgba(172, 147, 110, 0.55)'
        : k < 0.8 ? 'rgba(64, 47, 31, 0.5)'
          : 'rgba(103, 79, 47, 0.6)';
      const r = rand(0.5, 2);
      g.beginPath();
      g.ellipse(x, y, r, r * rand(0.55, 1), Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }

    // 5) terra fofa que a colônia cavou, empilhada em volta da entrada
    const rim = NEST_R + 15;
    for (let i = 0; i < 260; i++) {
      const th = Math.random() * Math.PI * 2;
      const d = NEST_R * 0.7 + Math.sqrt(Math.random()) * rim * 0.8;
      g.fillStyle = Math.random() < 0.65 ? 'rgba(178, 152, 114, 0.5)' : 'rgba(88, 66, 44, 0.45)';
      g.beginPath();
      g.arc(nest.x + Math.cos(th) * d, nest.y + Math.sin(th) * d, rand(0.5, 1.7), 0, Math.PI * 2);
      g.fill();
    }

    const outline = shapePath();

    // 6) sombra do capim caindo na terra — várias passadas fingem o degradê,
    //    que é mais confiável entre navegadores do que ctx.filter.
    g.save();
    g.clip(outline);
    for (let i = 0; i < 7; i++) {
      g.strokeStyle = 'rgba(26, 32, 15, ' + (0.035 + i * 0.017).toFixed(3) + ')';
      g.lineWidth = 27 - i * 3.5;
      g.stroke(outline);
    }
    g.restore();

    // 7) a grama só existe fora do terreiro (recorte par-ímpar: tela menos forma)
    g.save();
    const outside = new Path2D();
    outside.rect(0, 0, W, H);
    outside.addPath(outline);
    g.clip(outside, 'evenodd');
    drawGrass(false);
    g.restore();

    // 8) e as pontas passam por cima da linha
    drawGrass(true);

    console.info('[tiny life] terreno assado em', Math.round(performance.now() - t0), 'ms');
  }

  // --- povoamento -----------------------------------------------------------

  function makeAnt() {
    const ang = Math.random() * Math.PI * 2;
    const d = rand(0, NEST_R);
    return {
      x: nest.x + Math.cos(ang) * d,
      y: nest.y + Math.sin(ang) * d,
      course: ang,               // rumo pretendido
      head: ang,                 // rumo + balanço do corpo: é por onde ela anda e cheira
      sway: rand(0, Math.PI * 2),
      drift: 0,                  // ruído de rumo com memória (não é sorteio por quadro)
      bias: rand(-0.9, 0.9),     // tendência de curvar sempre pro mesmo lado enquanto busca
      biasT: rand(1, 4),
      cruise: rand(37, 58) * (CRUISE / 46), // cada formiga tem seu passo
      speed: 0,
      gait: RUN,
      gaitT: rand(0.2, 0.9),
      turnRate: 0,               // rad/s durante uma virada
      conf: 0,                   // o quanto ela sente a trilha agora (suavizado)
      touchCd: rand(0, 1.5),     // espera até poder antenar de novo
      carrying: false,
      since: 0,                  // s desde que saiu do ninho / pegou comida
      age: 0,
      life: rand(130, 280)
    };
  }

  function spawnFood(x, y, amount) {
    if (x === undefined) {
      const min = Math.min(W, H);
      for (let t = 0; t < 30 && x === undefined; t++) {
        const ang = Math.random() * Math.PI * 2;
        const d = rand(min * 0.18, min * 0.46);
        const px = nest.x + Math.cos(ang) * d;
        const py = nest.y + Math.sin(ang) * d;
        if (dirtAt(px, py) > 0.12) { x = px; y = py; }
      }
      if (x === undefined) { x = nest.x + rand(-40, 40); y = nest.y + rand(-40, 40); }
      amount = rand(120, 260);
    }

    // O monte é um punhado de grãos sorteados uma vez; conforme as formigas
    // levam, some um grão por vez.
    const spread = 3 + Math.sqrt(amount) * 0.55;
    const grains = [];
    const n = Math.min(48, Math.round(amount / 6));
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * spread;
      grains.push({
        dx: Math.cos(th) * rr,
        dy: Math.sin(th) * rr,
        r: rand(0.9, 2.1),
        squash: rand(0.55, 1),
        rot: Math.random() * Math.PI,
        c: SEEDS[(Math.random() * SEEDS.length) | 0]
      });
    }
    foods.push({ x, y, amount, max: amount, grains });
    if (foods.length > MAX_FOODS + 4) foods.shift();
  }

  // Empurra um ponto pra dentro do terreiro puxando ele na direção do ninho.
  function pullIntoDirt(x, y) {
    for (let i = 0; i < 80 && dirtAt(x, y) < 0.06; i++) {
      x += (nest.x - x) * 0.06;
      y += (nest.y - y) * 0.06;
    }
    return [x, y];
  }

  function reset() {
    pHome.fill(0);
    pFood.fill(0);
    ants = [];
    foods = [];
    store = 0;
    delivered = 0;
    foodTimer = 0;
    seedTimer = 0;
    const n = Math.round(popCap * 0.5);
    for (let i = 0; i < n; i++) ants.push(makeAnt());
    for (let i = 0; i < 4; i++) spawnFood();
  }

  // --- campos de feromônio --------------------------------------------------

  function sample(field, x, y) {
    const cx = (x / cell) | 0;
    const cy = (y / cell) | 0;
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return -1; // empurra pra dentro
    return field[cy * cols + cx];
  }

  function deposit(field, x, y, amount) {
    const cx = (x / cell) | 0;
    const cy = (y / cell) | 0;
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
    const i = cy * cols + cx;
    const v = field[i] + amount;
    field[i] = v > 1.6 ? 1.6 : v;
  }

  // Borrão separável 1-2-1 com evaporação embutida; escreve de volta em field.
  function diffuse(field, decay) {
    const t = blurTmp;
    for (let y = 0; y < rows; y++) {
      const o = y * cols;
      let prev = field[o];
      for (let x = 0; x < cols; x++) {
        const i = o + x;
        const c = field[i];
        const next = x + 1 < cols ? field[i + 1] : c;
        t[i] = (prev * 0.25 + c * 0.5 + next * 0.25) * decay;
        prev = c;
      }
    }
    for (let x = 0; x < cols; x++) {
      let prev = t[x];
      for (let y = 0; y < rows; y++) {
        const i = y * cols + x;
        const c = t[i];
        const next = y + 1 < rows ? t[i + cols] : c;
        const v = prev * 0.25 + c * 0.5 + next * 0.25;
        field[i] = v < 0.0008 ? 0 : v;
        prev = c;
      }
    }
  }

  // --- simulação ------------------------------------------------------------

  function angDiff(d) {
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function steer(a, target, rate, dt) {
    const max = rate * dt;
    a.course += clamp(angDiff(target - a.course), -max, max);
  }

  // Alterna corrida <-> (parada curta | virada seca). Quem carrega comida corre
  // mais tempo seguido e vira menos: está com pressa e sabe pra onde vai.
  function pickGait(a) {
    if (a.gait === RUN) {
      if (Math.random() < (a.carrying ? 0.2 : 0.45)) {
        a.gait = PAUSE;
        a.gaitT = rand(0.05, a.carrying ? 0.2 : 0.4);
      } else {
        a.gait = PIVOT;
        a.gaitT = rand(0.08, 0.2);
        const spread = a.carrying ? 0.55 : 1.3;
        a.turnRate = rand(-spread, spread) / a.gaitT;
      }
    } else {
      a.gait = RUN;
      a.gaitT = a.carrying ? rand(0.5, 1.8) : rand(0.2, 1.1);
    }
  }

  // A grama é parede. Ela sente o mato à frente e vira antes de encostar, o que
  // a faz correr rente à borda em vez de quicar nela.
  function avoidGrass(a, dt) {
    const look = 16;
    if (dirtAt(a.x + Math.cos(a.course) * look, a.y + Math.sin(a.course) * look) > 0.03) return;
    const l = a.course - 1.15, r = a.course + 1.15;
    const dl = dirtAt(a.x + Math.cos(l) * look, a.y + Math.sin(l) * look);
    const dr = dirtAt(a.x + Math.cos(r) * look, a.y + Math.sin(r) * look);
    steer(a, dl > dr ? l : r, 6, dt);
  }

  // Encontro de duas formigas: as duas travam um instante, se tocam e seguem.
  // É o que dá o vai-e-vem engarrafado numa trilha cheia. Grade uniforme pra não
  // comparar todas com todas.
  function meetings() {
    const n = ants.length;
    if (!hNext || hNext.length < n) hNext = new Int32Array(n + 64);
    hHead.fill(-1);
    for (let i = 0; i < n; i++) {
      const a = ants[i];
      const cx = clamp((a.x / H_CELL) | 0, 0, hCols - 1);
      const cy = clamp((a.y / H_CELL) | 0, 0, hRows - 1);
      const b = cy * hCols + cx;
      hNext[i] = hHead[b];
      hHead[b] = i;
    }
    for (let b = 0; b < hHead.length; b++) {
      for (let i = hHead[b]; i !== -1; i = hNext[i]) {
        const a = ants[i];
        if (a.touchCd > 0) continue;
        for (let j = hNext[i]; j !== -1; j = hNext[j]) {
          const o = ants[j];
          if (o.touchCd > 0) continue;
          const dx = a.x - o.x, dy = a.y - o.y;
          if (dx * dx + dy * dy > TOUCH_DIST * TOUCH_DIST) continue;
          a.gait = PAUSE; a.gaitT = rand(0.05, 0.16); a.touchCd = rand(0.6, 2.2);
          o.gait = PAUSE; o.gaitT = rand(0.05, 0.16); o.touchCd = rand(0.6, 2.2);
          break;
        }
      }
    }
  }

  function updateAnts(dt) {
    for (let i = ants.length - 1; i >= 0; i--) {
      const a = ants[i];
      a.age += dt;
      a.since += dt;
      a.touchCd -= dt;
      a.gaitT -= dt;
      a.biasT -= dt;

      if (a.age > a.life) {
        ants[i] = ants[ants.length - 1];
        ants.pop();
        continue;
      }

      if (a.gaitT <= 0) pickGait(a);
      if (a.biasT <= 0) { a.bias = rand(-0.9, 0.9); a.biasT = rand(1.5, 5); }

      // Sensores no campo oposto ao que ela marca. Ficam presos à cabeça, que
      // balança: é a varredura das antenas, e é o que faz a formiga costurar a
      // borda da trilha em vez de correr colada no centro dela.
      const guide = a.carrying ? pHome : pFood;
      const la = a.head - SENSE_ANGLE, ra = a.head + SENSE_ANGLE;
      const sc = sample(guide, a.x + Math.cos(a.head) * SENSE_DIST, a.y + Math.sin(a.head) * SENSE_DIST);
      const sl = sample(guide, a.x + Math.cos(la) * SENSE_DIST, a.y + Math.sin(la) * SENSE_DIST);
      const sr = sample(guide, a.x + Math.cos(ra) * SENSE_DIST, a.y + Math.sin(ra) * SENSE_DIST);
      const raw = Math.max(0, sc, sl, sr);

      // Perdeu a trilha de repente: meia-volta rápida procurando o rastro,
      // igual formiga de verdade quando o caminho some.
      if (a.conf > 0.22 && raw < 0.05 && a.gait !== PIVOT && Math.random() < 0.6) {
        a.gait = PIVOT;
        a.gaitT = 0.18;
        a.turnRate = (Math.random() < 0.5 ? -1 : 1) * rand(2, 3) / a.gaitT;
      }
      a.conf += (Math.min(1, raw) - a.conf) * Math.min(1, dt * 5);

      if (a.gait === PIVOT) {
        a.course += a.turnRate * dt;
      } else {
        // Ruído de rumo com memória: gera curvas inteiras em vez do tremor de
        // um sorteio novo a cada quadro.
        a.drift += -a.drift * DRIFT_DECAY * dt + (Math.random() - 0.5) * DRIFT_NOISE * Math.sqrt(dt);
        a.course += a.drift * dt * (a.carrying ? 0.45 : 1);

        if (sc < sl || sc < sr) {
          const diff = sr - sl;
          a.course += Math.sign(diff) * Math.min(1, Math.abs(diff) * 5) * TURN * dt;
        }

        // Sem trilha nenhuma, ela varre a área em arcos largos para o mesmo lado.
        if (!a.carrying && a.conf < 0.12) a.course += a.bias * dt;

        if (a.carrying) {
          const dx = nest.x - a.x, dy = nest.y - a.y;
          const near = dx * dx + dy * dy < 8100;
          steer(a, Math.atan2(dy, dx), HOME_TURN * (near ? 2.2 : 1), dt);
        }
      }

      avoidGrass(a, dt);

      // Balanço do corpo a cada passo; some conforme ela confia na trilha.
      const amp = (a.carrying ? 0.2 : 0.46) * (1 - 0.45 * a.conf);
      a.sway += (3 + a.speed * 0.16) * dt;
      a.head = a.course + Math.sin(a.sway) * amp;

      // Velocidade com inércia: parada, virada e corrida têm passos diferentes,
      // e ninguém sai do zero pro máximo num quadro.
      let want;
      if (a.gait === PAUSE) want = 0;
      else if (a.gait === PIVOT) want = a.cruise * 0.3;
      else want = a.cruise * (0.72 + 0.4 * a.conf);
      if (a.carrying) want *= 0.86;
      a.speed += (want - a.speed) * Math.min(1, dt * 10);

      // Rastro proporcional ao quanto ela andou (parada não empoça feromônio).
      const strength = Math.max(0, 1 - a.since / TRAIL_LIFE) * Math.min(1, a.speed / 28) * dt * 3.2;
      if (strength > 0) deposit(a.carrying ? pFood : pHome, a.x, a.y, strength);

      // Só anda se o passo cair na terra; senão trava e desvia, como quem
      // esbarrou num tufo de capim.
      const nx = a.x + Math.cos(a.head) * a.speed * dt;
      const ny = a.y + Math.sin(a.head) * a.speed * dt;
      if (dirtAt(nx, ny) > 0) {
        a.x = nx;
        a.y = ny;
      } else {
        a.speed *= 0.35;
        a.course += (Math.random() < 0.5 ? -1 : 1) * rand(0.7, 1.7);
      }

      if (a.carrying) {
        const dx = a.x - nest.x, dy = a.y - nest.y;
        if (dx * dx + dy * dy < NEST_R * NEST_R) {
          a.carrying = false;
          a.since = 0;
          a.conf = 0;
          a.course += Math.PI + rand(-0.6, 0.6);
          a.gait = PAUSE;
          a.gaitT = rand(0.15, 0.45);   // descarrega antes de sair de novo
          a.speed *= 0.3;
          a.age = Math.max(0, a.age - 12); // comer no ninho rejuvenesce um pouco
          delivered++;
          store++;
        }
      } else {
        for (let f = 0; f < foods.length; f++) {
          const src = foods[f];
          const r = 4 + Math.sqrt(src.amount) * 0.62;
          const dx = a.x - src.x, dy = a.y - src.y;
          if (dx * dx + dy * dy < r * r) {
            a.carrying = true;
            a.since = 0;
            a.conf = 0;
            a.course += Math.PI + rand(-0.6, 0.6);
            a.gait = PAUSE;
            a.gaitT = rand(0.25, 0.6);   // para pra recortar o pedaço
            a.speed *= 0.2;
            src.amount -= 1;
            if (src.amount <= 0) foods.splice(f, 1);
            break;
          }
        }
      }
    }
  }

  function updateColony(dt) {
    // Comida entregue vira formiga nova, até o teto da tela.
    while (store >= FOOD_COST && ants.length < popCap) {
      store -= FOOD_COST;
      ants.push(makeAnt());
    }

    // Colônia nunca chega a zero: um punhado de sobreviventes sempre volta.
    seedTimer -= dt;
    if (ants.length < 14 && seedTimer <= 0) {
      ants.push(makeAnt());
      seedTimer = 1.5;
    }

    foodTimer -= dt;
    if (foods.length < MIN_FOODS && foodTimer <= 0) {
      spawnFood();
      foodTimer = rand(2, 6);
    }
  }

  // --- desenho --------------------------------------------------------------

  function drawField() {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(gnd, 0, 0, W, H);
    if (!showTrails) return;

    // Em chão claro a trilha é uma mancha: escurece a terra onde passou muita
    // formiga. A cor sai da mistura das duas trilhas, a opacidade da soma.
    const data = img.data;
    const n = cols * rows;
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      if (dirt[i] <= 0) { data[p + 3] = 0; continue; }  // mancha não sobe na grama
      let h = pHome[i]; if (h > 1) h = 1;
      let f = pFood[i]; if (f > 1) f = 1;
      h = h > 0 ? Math.sqrt(h) : 0;   // curva perceptual: rastro fraco ainda aparece
      f = f > 0 ? Math.sqrt(f) : 0;
      const t = h + f;
      if (t <= 0) { data[p + 3] = 0; continue; }
      const wh = h / t, wf = f / t;
      data[p] = HOME_STAIN[0] * wh + FOOD_STAIN[0] * wf;
      data[p + 1] = HOME_STAIN[1] * wh + FOOD_STAIN[1] * wf;
      data[p + 2] = HOME_STAIN[2] * wh + FOOD_STAIN[2] * wf;
      data[p + 3] = (t > 1 ? 1 : t) * 116;
    }
    fieldCtx.putImageData(img, 0, 0);
    ctx.drawImage(fieldCanvas, 0, 0, cols, rows, 0, 0, W, H);
  }

  function draw() {
    drawField();

    // Comida: um punhado de grãos espalhados, que vai rareando.
    for (const f of foods) {
      const vis = Math.min(f.grains.length, Math.ceil(f.amount / 6));
      for (let i = 0; i < vis; i++) {
        const g = f.grains[i];
        ctx.fillStyle = g.c;
        ctx.beginPath();
        ctx.ellipse(f.x + g.dx, f.y + g.dy, g.r, g.r * g.squash, g.rot, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Ninho: cratera de terra fofa com o buraco no meio. A borda de terra
    // cavada já está assada no solo; aqui vai só o vão escuro.
    let grd = ctx.createRadialGradient(nest.x, nest.y, 0, nest.x, nest.y, NEST_R);
    grd.addColorStop(0, 'rgba(18, 13, 9, 0.95)');
    grd.addColorStop(0.5, 'rgba(34, 24, 16, 0.78)');
    grd.addColorStop(1, 'rgba(60, 45, 30, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(nest.x, nest.y, NEST_R, 0, Math.PI * 2);
    ctx.fill();

    // Formigas: todas pretas, num lote só.
    ctx.fillStyle = ANT;
    for (const a of ants) ctx.fillRect(a.x - 0.7, a.y - 0.7, 1.4, 1.4);

    // Quem está carregando aparece pelo grão claro na frente da cabeça.
    ctx.fillStyle = LOAD;
    for (const a of ants) {
      if (!a.carrying) continue;
      ctx.fillRect(a.x + Math.cos(a.head) * 1.5 - 0.55, a.y + Math.sin(a.head) * 1.5 - 0.55, 1.1, 1.1);
    }
  }

  // --- laço -----------------------------------------------------------------

  // Sem isso, qualquer exceção deixa a tela parada sem dizer nada: o canvas fica
  // no que já tinha e o rAF morre em silêncio.
  function fail(err) {
    console.error('[tiny life]', err);
    running = false;
    crashed = true;
    if (elHint) {
      elHint.classList.remove('gone');
      elHint.style.textTransform = 'none';
      elHint.style.letterSpacing = '0.02em';
      elHint.style.color = '#ffd7cc';
      elHint.style.maxWidth = '86vw';
      elHint.textContent = 'error: ' + ((err && err.message) || err);
    }
  }

  function frame(now) {
    if (!running) return;
    try {
      step(now);
    } catch (err) {
      fail(err);
      return;
    }
    requestAnimationFrame(frame);
  }

  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;

    diffuse(pHome, Math.exp(-dt / TAU_HOME));
    diffuse(pFood, Math.exp(-dt / TAU_FOOD));
    meetings();
    updateAnts(dt);
    updateColony(dt);
    draw();

    statTimer -= dt;
    if (statTimer <= 0) {
      statTimer = 0.25;
      elAnts.textContent = ants.length;
      elFood.textContent = delivered;
    }
  }

  // --- entrada --------------------------------------------------------------

  let hintGone = false;
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const [fx, fy] = pullIntoDirt(e.clientX - r.left, e.clientY - r.top);
    spawnFood(fx, fy, rand(150, 300));
    if (!hintGone) {
      hintGone = true;
      elHint.classList.add('gone');
    }
  });

  btnTrails.addEventListener('click', () => {
    showTrails = !showTrails;
    btnTrails.setAttribute('aria-pressed', String(showTrails));
  });

  btnReset.addEventListener('click', reset);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') reset();
    if (e.key === 't' || e.key === 'T') btnTrails.click();
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const hadAnts = ants.length;
      resize();
      if (!hadAnts) reset();
    }, 150);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
    } else if (!running && !crashed) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }
  });

  try {
    resize();
    reset();
    last = performance.now();
    requestAnimationFrame(frame);
  } catch (err) {
    fail(err);
  }
})();

import * as THREE from 'three';

/* ===================== paleta (3 cores das referências) ===================== */
const DARK  = 0x2e4358;  // fundo / portas / detalhes escuros
const DARK2 = 0x263848;  // sombra / rodapés / teto
const NAVY  = 0x3a5066;  // vidros e telas (variação do escuro)
const LIGHT = 0xa6b6b8;  // paredes
const LIGHT2= 0x8da2a5;  // mobília clara
const FLOOR = 0x7e9498;  // chão
const BLUE  = 0x3aa2ea;  // pessoas e objetos vivos
const GLOW  = 0xdde8e9;  // luz

/* ===================== roteiro.md — textos verbatim ===================== */
const ROTEIRO = {
  acorde: ['"Acorde, Zero!"'],
  janela: [
    'Janela do meu apartamento',
    'Consigo ver mil outras janelas de outros predios, exatamente como a minha',
    'Mas não consigo ver daqui o sol',
    'O transito hoje esta parado, logo pela manhã',
    'Deve ser algum operario que morreu na contramão, atrapalhando o tráfego',
  ],
  fotografia: [
    'São meus pais e eu quando criança',
    'Sinto falta da minha familia e dos meus amigos de infancia',
  ],
  pcQuarto1: [
    'Iniciando...',
    '0 Mensagens de 352 amigos',
  ],
  guardaRoupa: [
    'Esses são os meus livros',
    '1984 do George Orwell',
    "Alice's Adventures in Wonderland - Lewis Carroll",
    'Assim Falou Zaratustra de Friedrich Nietzsche',
    'Eu tenho que lê-los novamente um dia',
    'Esses livros parecem descrever tão bem a minha vida',
  ],
  metro1: [
    'Vivo a muito tempo nessa rotina monotona',
    'De certa forma eu acabei me acostumando',
  ],
  chefe1a: ['Você chegou atrasado hoje Zero, na proxima é rua!'],
  colega1: [
    'Eae Zero!',
    'Tenho uma noticia muito boa',
    'Acho que mes que vem consigo sair desse buraco',
  ],
  pcTrabalho1: [
    'Iniciando...',
    '15 tarefas atrasadas',
    'Primeira tarefa: Cadastro de empresa está com bugs',
    'Parece que é um problema de Javascript',
    '-consertando-',
    "git commit -m 'fix cadastro de empresas'",
    'Segunda tarefa: Erro ao adicionar funcionario',
    'É só colocar uma verificação se a empresa existe já cadastrada',
    '-consertando-',
    "git commit -m 'Fix adicinar funcionario'",
    'Acabou meu tempo, é isso por hoje',
  ],
  pensamento1: ['Sinto que passo a maior parte do meu dia aqui'],
  chefe1b: ['Espero que você vire a noite para cobrir esses atrasos'],
  sonho2: [
    'Tive um sonho horrivel, que eu era um inseto gigante',
    'Mal saia do quarto, não era mais capaz de trabalhar',
    'Me tornei um inutil ao olhar de todos a minha volta',
    'Sentiam nojo de mim, desprezado, por fim morri de solidão',
  ],
  morador2a: ['Não tenho casa, nem trabalho, mas pelo menos sou livre'],
  morador2b: ['As pessoas dizem que sou louco, mas acho que somos personagens de um jogo'],
  chefe2a: ['Atrasado novamente? Você já foi melhor'],
  pcTrabalho2: [
    'Mensagem automatica: Parabens Zero, você completou 10 anos de empresa',
    '10 anos? Eu era jovem, e a vida era longa e cheia de possibilidades',
    'Correndo e correndo para alcançar o sol',
    'Cada dia com menos folego',
    'Em um exercicio sem fim, auto-destrutivo ou inutil, correndo em uma labirinto sem esperança',
  ],
  chefe2b: ['Estou fora, nunca mais quero voltar aqui'],
  pensamento3: [
    'Eu preciso escapar da realidade, cair diretamente na toca do coelho',
    'Eu sinto uma necessidade de me expressar, de me conectar',
    'Isso é a forma ultima de me expressar',
    'A música, teatro, dança, pintura, escultura, arquitetura, literatura, cinema, fotografia e historia em quadrinhos são a forma final de expressão dos sentimentos humanos',
    'Em meio a tantas artes, a combinação de todas elas, faz a decima arte, os video games',
  ],
  pcQuarto3: [
    'Eu vou criar um game é isso, um game em Bitsy',
    'Para contar minha historia, minha vida',
    'Vai se chamar Zero To One',
  ],
  final: ['Zero finalmente se tornou Um'],
};

/* ===================== renderer ===================== */
const PIX = 1; // resolução nativa: imagem 100% nítida
let curPix = PIX;
const renderer = new THREE.WebGLRenderer({ antialias: true });
function setPix(p) {
  curPix = p;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setSize(Math.floor(innerWidth * dpr), Math.floor(innerHeight * dpr), false);
}
setPix(PIX);
document.body.prepend(renderer.domElement);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .05, 80);
camera.rotation.order = 'YXZ';

addEventListener('resize', () => {
  setPix(curPix);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

/* ===================== UI ===================== */
const $ = id => document.getElementById(id);
const dotEl = $('dot'), promptEl = $('prompt'), prName = $('pr-name');
const tbEl = $('textbox'), tbName = $('tb-name'), tbText = $('tb-text'), tbHint = $('tb-hint');
const capEl = $('caption'), fadeEl = $('fade');
const titleEl = $('title'), pauseEl = $('pause'), endEl = $('end');
const btnE = $('btn-e');

/* ===================== estado ===================== */
let scene = null;
let day = 1;                            // 1 Inferno · 2 Purgatorio · 3 Paraiso
let walks = [], blocks = [], anims = [], inters = [];
let sway = false;
let px = 0, pz = 0, yaw = 0, pitch = 0;
let started = false, ended = false, transit = false, textOpen = false;
let target = null;
const keys = {};
let capTimer = 0, autoTimer = 0;

/* ===================== terminal: tela preta, letras azuis ===================== */
const termCanvas = document.createElement('canvas');
termCanvas.width = 640; termCanvas.height = 400;
const termCtx = termCanvas.getContext('2d');
const termTex = new THREE.CanvasTexture(termCanvas);
termTex.magFilter = THREE.LinearFilter;
const termMat = new THREE.MeshBasicMaterial({ map: termTex });
if (document.fonts && document.fonts.load) document.fonts.load('26px VT323');

let term = null;     // sessão de terminal ativa
let camAnim = null;  // animação de câmera (sentar / levantar)

function wrapInto(c, text, maxW, out) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (c.measureText(t).width > maxW && line) { out.push(line); line = w; }
    else line = t;
  }
  out.push(line);
}
const TFONT = '42px VT323, monospace', TLINE = 48;
function drawIdle() {
  termCtx.fillStyle = '#000';
  termCtx.fillRect(0, 0, 640, 400);
  termCtx.fillStyle = '#3aa2ea';
  termCtx.font = TFONT;
  termCtx.textBaseline = 'top';
  termCtx.fillText('█', 20, 20);
  termTex.needsUpdate = true;
}
function drawTerm() {
  const c = termCtx, W = 640, H = 400, maxW = W - 40;
  c.fillStyle = '#000';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#3aa2ea';
  c.font = TFONT;
  c.textBaseline = 'top';
  const rows = [];
  for (let i = 0; i <= term.idx; i++) {
    const full = term.lines[i];
    wrapInto(c, '> ' + (i < term.idx ? full : full.slice(0, Math.floor(term.chars))), maxW, rows);
  }
  const maxRows = Math.floor((H - 64) / TLINE);
  const vis = rows.slice(-maxRows);
  vis.forEach((r, i) => c.fillText(r, 20, 20 + i * TLINE));
  if (!term.waiting || term.blink) {
    const lw = c.measureText(vis[vis.length - 1] || '').width;
    c.fillText('█', 20 + lw + 5, 20 + (vis.length - 1) * TLINE);
  }
  if (term.waiting && term.blink) c.fillText('E', W - 56, H - 52);
  termTex.needsUpdate = true;
}
function startTerm(it) {
  const s = it.seat, L = it.look;
  const dx = L.x - s.x, dy = L.y - s.y, dz = L.z - s.z;
  term = {
    lines: it.terminal, idx: 0, chars: 0,
    typing: false, waiting: false, blink: 1, cb: it.cb || null,
    pose: { x: s.x, y: s.y, z: s.z, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) },
  };
  camAnim = {
    t: 0, dur: .9,
    from: { x: px, y: 1.6, z: pz, yaw, pitch },
    to: term.pose,
    then: () => { term.typing = true; drawTerm(); },
  };
}
function exitTerm() {
  const cb = term.cb;
  term.typing = false;
  camAnim = {
    t: 0, dur: .9,
    from: { ...term.pose },
    to: { x: px, y: 1.6, z: pz, yaw, pitch },
    then: () => { term = null; if (cb) cb(); },
  };
}
function termE() {
  if (!term || camAnim || !term.typing) return;
  const cur = term.lines[term.idx];
  if (term.chars < cur.length) { term.chars = cur.length; term.waiting = true; drawTerm(); return; }
  if (term.idx < term.lines.length - 1) {
    term.idx++; term.chars = 0; term.waiting = false;
    drawTerm();
  } else exitTerm();
}

/* ===================== diálogo em páginas (E avança) ===================== */
let queue = [], after = null;
function say(name, lines, cb) {
  queue = lines.map(l => ({ name, l }));
  after = cb || null;
  nextPage();
}
function nextPage() {
  if (!queue.length) {
    tbEl.classList.remove('on');
    textOpen = false;
    const f = after; after = null;
    if (f) f();
    return;
  }
  const p = queue.shift();
  tbName.textContent = p.name;
  tbName.style.display = p.name ? '' : 'none';
  tbText.textContent = p.l;
  tbHint.textContent = queue.length ? 'E para continuar' : 'E para fechar';
  tbEl.classList.add('on');
  textOpen = true;
}
function closeText() {
  queue = []; after = null;
  tbEl.classList.remove('on');
  textOpen = false;
}

/* ===================== helpers de construção ===================== */
function box(w, h, d, c, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c }));
  m.position.set(x, y, z);
  (parent || scene).add(m);
  return m;
}
function lite(w, h, d, c, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: c }));
  m.position.set(x, y, z);
  (parent || scene).add(m);
  return m;
}
function grp(x = 0, y = 0, z = 0, parent) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  (parent || scene).add(g);
  return g;
}
// objeto interativo: lines abre diálogo; go troca de cena; cb roda ao fim do diálogo
function tag(o, name, opts) { o.userData.inter = { name, ...opts }; inters.push(o); }
function walkOf(x1, z1, x2, z2) { walks.push({ x1, z1, x2, z2 }); }
function blockOf(x1, z1, x2, z2) { blocks.push({ x1, z1, x2, z2 }); }

function freshScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(DARK);
  scene.fog = new THREE.Fog(DARK, 9, 34);
  walks = []; blocks = []; anims = []; inters = [];
  sway = false; target = null;
  scene.add(new THREE.HemisphereLight(0xc9d5d7, 0x3a4f63, 1.05));
  const d = new THREE.DirectionalLight(0xe9f1f1, .5);
  d.position.set(3, 7, 2);
  scene.add(d);
  drawIdle();
}

function room(W, D, H, hole) {
  box(W + .4, .2, D + .4, FLOOR, 0, -.1, 0);
  box(W + .4, .2, D + .4, DARK2, 0, H + .1, 0);
  const zN = -D / 2 - .09;
  if (!hole) {
    box(W + .4, H, .18, LIGHT, 0, H / 2, zN);
  } else {
    // parede norte em 4 segmentos, deixando o vão da janela aberto de verdade
    const X0 = -W / 2 - .2, X1 = W / 2 + .2;
    box(hole.x0 - X0, H, .18, LIGHT, (X0 + hole.x0) / 2, H / 2, zN);
    box(X1 - hole.x1, H, .18, LIGHT, (hole.x1 + X1) / 2, H / 2, zN);
    box(hole.x1 - hole.x0, hole.y0, .18, LIGHT, (hole.x0 + hole.x1) / 2, hole.y0 / 2, zN);
    box(hole.x1 - hole.x0, H - hole.y1, .18, LIGHT, (hole.x0 + hole.x1) / 2, (hole.y1 + H) / 2, zN);
  }
  box(W + .4, H, .18, LIGHT, 0, H / 2, D / 2 + .09);
  box(.18, H, D + .4, LIGHT, -W / 2 - .09, H / 2, 0);
  box(.18, H, D + .4, LIGHT, W / 2 + .09, H / 2, 0);
  for (const s of [-1, 1]) {
    box(W, .12, .06, DARK2, 0, .06, s * (D / 2 - .03));
    box(W, .1, .06, DARK2, 0, H - .05, s * (D / 2 - .03));
    box(.06, .12, D, DARK2, s * (W / 2 - .03), .06, 0);
    box(.06, .1, D, DARK2, s * (W / 2 - .03), H - .05, 0);
  }
}

function person(sit, c = BLUE, parent) {
  const g = grp(0, 0, 0, parent);
  if (sit) {
    box(.13, .5, .14, c, -.1, .25, .38, g);  box(.13, .5, .14, c, .1, .25, .38, g);
    box(.13, .18, .42, c, -.1, .56, .18, g); box(.13, .18, .42, c, .1, .56, .18, g);
    box(.4, .55, .22, c, 0, .92, 0, g);
    box(.1, .42, .15, c, -.25, .95, .02, g); box(.1, .42, .15, c, .25, .95, .02, g);
    box(.26, .26, .24, c, 0, 1.33, 0, g);
  } else {
    box(.13, .52, .16, c, -.1, .26, 0, g);   box(.13, .52, .16, c, .1, .26, 0, g);
    box(.4, .55, .22, c, 0, .79, 0, g);
    box(.1, .45, .15, c, -.25, .83, 0, g);   box(.1, .45, .15, c, .25, .83, 0, g);
    box(.26, .26, .24, c, 0, 1.22, 0, g);
    g.scale.setScalar(1.2);
  }
  return g;
}

function cat(x, z, rot) {
  const g = grp(x, 0, z);
  g.rotation.y = rot;
  const c = DARK2;
  box(.42, .2, .17, c, 0, .26, 0, g);
  for (const [lx, lz] of [[-.15, -.05], [.15, -.05], [-.15, .05], [.15, .05]])
    box(.05, .16, .05, c, lx, .08, lz, g);
  box(.2, .18, .18, c, .27, .42, 0, g);
  box(.05, .07, .04, c, .22, .54, -.05, g);
  box(.05, .07, .04, c, .22, .54, .05, g);
  const tail = box(.05, .34, .05, c, 0, 0, 0, g);
  tail.geometry.translate(0, .17, 0);
  tail.position.set(-.23, .3, 0);
  anims.push(t => { tail.rotation.z = .5 + Math.sin(t * 2.4) * .3; });
  return g;
}

function blob(rx, ry, rz, c, x, y, z, parent) { // esfera low-poly achatada, forma orgânica
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(1, 10, 7),
    new THREE.MeshLambertMaterial({ color: c, flatShading: true })
  );
  m.scale.set(rx, ry, rz);
  m.position.set(x, y, z);
  (parent || scene).add(m);
  return m;
}

/* ===================== a cidade lá fora ===================== */
function cidade() {
  const g = grp(0, 0, 0);
  // torres gigantes em duas fileiras, sufocando o céu
  const defs = [
    [-13, -9, 7, 46], [-5.5, -8, 5, 40], [1.5, -9.5, 6, 52], [8, -8, 5, 38], [15, -9, 7, 48],
    [-18, -17, 9, 60], [-8, -18, 8, 66], [2, -19, 9, 58], [12, -17, 8, 64], [20, -18, 9, 56],
  ];
  const slots = [];
  for (const [x, z, w, h] of defs) {
    const yBase = -18;
    box(w, h, 4, DARK2, x, yBase + h / 2, z, g);
    const faceZ = z + 2.06;
    for (let wy = yBase + 1.2; wy < yBase + h - 1; wy += 1.5)
      for (let wx = -w / 2 + .8; wx < w / 2 - .5; wx += 1.1)
        slots.push({ x: x + wx, y: wy, z: faceZ });
  }
  // antenas em algumas torres
  box(.1, 3, .1, DARK2, 1.5, 34.5, -9.5, g);
  box(.1, 2.4, .1, DARK2, -8, 49.2, -18, g);
  box(.1, 2.6, .1, DARK2, 15, 31.3, -9, g);
  // mil outras janelas, exatamente como a minha
  const im = new THREE.InstancedMesh(
    new THREE.BoxGeometry(.5, .75, .12),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    slots.length
  );
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  slots.forEach((s, i) => {
    m4.setPosition(s.x, s.y, s.z);
    im.setMatrixAt(i, m4);
    const r = Math.random();
    c.setHex(r < .1 ? GLOW : r < .13 ? BLUE : NAVY);
    im.setColorAt(i, c);
  });
  g.add(im);
}

/* ===================== CENA: O QUARTO ===================== */
function buildQuarto() {
  freshScene();
  scene.fog = new THREE.Fog(DARK, 9, 42);
  const W = 9, D = 4.6, H = 2.8;
  room(W, D, H, { x0: .34, x1: 1.46, y0: 1.32, y1: 2.18 });
  cidade();
  walkOf(-4.2, -2.0, 4.2, 2.0);

  // pia + espelho (cenário, coluna esquerda da arte)
  const pia = grp(-4.05, 0, -1.3);
  box(.6, .85, .95, LIGHT2, 0, .43, 0, pia);
  box(.64, .07, .99, DARK2, 0, .885, 0, pia);
  box(.1, .2, .08, DARK2, -.18, 1.0, 0, pia);
  const esp = grp(-4.38, 1.6, -1.3);
  box(.07, .78, .6, DARK2, 0, 0, 0, esp);
  box(.05, .66, .48, NAVY, .03, 0, 0, esp);
  blockOf(-4.6, -1.85, -3.6, -.75);

  // guarda roupa na parede norte
  const gr = grp(-2.9, 0, -1.95);
  box(1.2, 2.05, .55, LIGHT2, 0, 1.025, 0, gr);
  box(1.26, .08, .6, DARK2, 0, 2.09, 0, gr);
  box(.55, 1.85, .06, LIGHT, -.295, 1.0, .28, gr);
  box(.55, 1.85, .06, LIGHT, .295, 1.0, .28, gr);
  box(.05, .2, .05, DARK2, -.07, 1.0, .33, gr);
  box(.05, .2, .05, DARK2, .07, 1.0, .33, gr);
  if (day === 1) tag(gr, 'Guarda roupa', { lines: ROTEIRO.guardaRoupa });
  blockOf(-3.55, -2.3, -2.25, -1.6);

  // mesa com computador
  const pc = grp(-1.2, 0, -1.85);
  box(1.25, .07, .62, LIGHT2, 0, .78, 0, pc);
  for (const [lx, lz] of [[-.55, -.24], [.55, -.24], [-.55, .24], [.55, .24]])
    box(.07, .78, .07, DARK2, lx, .39, lz, pc);
  box(.4, .05, .3, DARK2, 0, .84, -.08, pc);
  box(.09, .22, .09, DARK2, 0, .97, -.12, pc);
  box(1.04, .68, .08, DARK2, 0, 1.42, -.14, pc); // monitor grande
  const tela1 = new THREE.Mesh(new THREE.PlaneGeometry(.92, .56), termMat);
  tela1.position.set(0, 1.42, -.095);
  pc.add(tela1);
  box(.4, .04, .16, DARK2, 0, .83, .16, pc);
  const sentado1 = { seat: { x: -1.2, y: 1.15, z: -1.0 }, look: { x: -1.2, y: 1.42, z: -1.99 } };
  if (day === 1) tag(pc, 'Computador', { terminal: ROTEIRO.pcQuarto1, ...sentado1 });
  if (day === 3) tag(pc, 'Computador', {
    terminal: ROTEIRO.pcQuarto3, ...sentado1,
    cb: () => say('Final', ROTEIRO.final, () => go('end')),
  });
  blockOf(-1.9, -2.3, -.5, -1.4);

  // janela de verdade: vão aberto na parede, a cidade lá fora
  const jan = grp(.9, 1.75, -2.39);
  box(1.34, .1, .22, LIGHT2, 0, .48, 0, jan);
  box(1.34, .1, .22, LIGHT2, 0, -.48, 0, jan);
  box(.1, 1.06, .22, LIGHT2, -.62, 0, 0, jan);
  box(.1, 1.06, .22, LIGHT2, .62, 0, 0, jan);
  box(.07, .86, .12, LIGHT2, 0, 0, 0, jan);   // cruzeta vertical
  box(1.14, .07, .12, LIGHT2, 0, 0, 0, jan);  // cruzeta horizontal
  box(1.34, .07, .34, LIGHT2, 0, -.55, .08, jan); // peitoril
  const vidro = new THREE.Mesh(
    new THREE.BoxGeometry(1.14, .86, .02),
    new THREE.MeshBasicMaterial({ color: NAVY, transparent: true, opacity: .18 })
  );
  jan.add(vidro);
  if (day === 1) tag(jan, 'Janela', { lines: ROTEIRO.janela });

  // fotografia na parede
  const qs = grp(2.35, 1.55, -2.2);
  for (const [qx, qy] of [[-.23, .21], [.23, .21], [-.23, -.21], [.23, -.21]]) {
    box(.3, .3, .06, DARK2, qx, qy, 0, qs);
    box(.22, .22, .02, NAVY, qx, qy, .04, qs);
  }
  if (day === 1) tag(qs, 'Fotografia na parede', { lines: ROTEIRO.fotografia });

  // porta de saída
  const door = grp(3.75, 0, -2.18);
  box(1.14, 2.3, .1, LIGHT2, 0, 1.15, 0, door);
  box(.96, 2.16, .09, DARK2, 0, 1.08, .03, door);
  box(.07, .07, .07, BLUE, -.36, 1.08, .07, door);
  if (day < 3) tag(door, 'Porta', { go: 'rua' });

  // cama com cobertor azul
  const cama = grp(1.7, 0, 1.72);
  box(2.15, .32, 1.05, LIGHT2, 0, .16, 0, cama);
  box(2.1, .16, 1.0, LIGHT, 0, .4, 0, cama);
  box(1.25, .18, 1.02, BLUE, -.4, .42, 0, cama);
  box(.5, .14, .6, 0xc7d4d5, .72, .51, 0, cama);
  blockOf(.5, 1.1, 2.85, 2.3);

  // tapete e luminária
  box(1.9, .05, 1.25, DARK2, 0, .025, .6);
  box(.04, .5, .04, DARK2, 0, H - .25, 0);
  box(.34, .16, .34, DARK2, 0, H - .55, 0);
  lite(.14, .07, .14, GLOW, 0, H - .66, 0);
  const pl = new THREE.PointLight(0xeaf2f2, .55, 9);
  pl.position.set(0, 2, 0);
  scene.add(pl);

  const caps = { 1: 'INICIO — INFERNO', 2: 'MEIO — PURGATORIO', 3: 'FIM — PARAISO' };
  const autos = {
    1: { name: '', lines: ROTEIRO.acorde },
    2: { name: 'Pensamento', lines: ROTEIRO.sonho2 },
    3: { name: 'Pensamento', lines: ROTEIRO.pensamento3 },
  };
  return { spawn: { x: 0, z: 1.1, yaw: 0 }, caption: caps[day], auto: autos[day] };
}

/* ===================== CENA: A PRAÇA ===================== */
function buildRua() {
  freshScene();
  scene.fog = new THREE.Fog(DARK, 14, 90);

  // arena aberta: praça cercada de prédios
  box(46, .2, 46, NAVY, 0, -.1, 0);
  box(4, .16, 46, FLOOR, 0, 0, 0); // caminho central
  walkOf(-19, -19.7, 19, 19);

  // anel de prédios em volta
  const slotsZ = [], slotsX = [];
  const hs = [24, 30, 22, 34, 26];
  for (let i = 0; i < 5; i++) {
    const c = -19.2 + i * 9.6;
    const h1 = hs[i], h2 = hs[(i + 2) % 5], h3 = hs[(i + 3) % 5], h4 = hs[(i + 1) % 5];
    box(9.4, h1, 6, DARK2, c, h1 / 2 - 1, -24);
    box(9.4, h2, 6, DARK2, c, h2 / 2 - 1, 24);
    box(6, h3, 9.4, DARK2, -24, h3 / 2 - 1, c);
    box(6, h4, 9.4, DARK2, 24, h4 / 2 - 1, c);
    for (let wy = 1.6; wy < Math.max(h1, h2, h3, h4) - 2; wy += 1.5)
      for (let k = -3.85; k <= 3.85; k += 1.1) {
        if (wy < h1 - 2) slotsZ.push({ x: c + k, y: wy, z: -20.94 });
        if (wy < h2 - 2) slotsZ.push({ x: c + k, y: wy, z: 20.94 });
        if (wy < h3 - 2) slotsX.push({ x: -20.94, y: wy, z: c + k });
        if (wy < h4 - 2) slotsX.push({ x: 20.94, y: wy, z: c + k });
      }
  }
  for (const [cx, cz] of [[-24, -24], [24, -24], [-24, 24], [24, 24]])
    box(9, 42, 9, DARK2, cx, 20, cz); // torres dos cantos
  function instWin(slots, geo) {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), slots.length);
    const m4 = new THREE.Matrix4(), cc = new THREE.Color();
    slots.forEach((sl, i) => {
      m4.setPosition(sl.x, sl.y, sl.z);
      m.setMatrixAt(i, m4);
      const r = Math.random();
      cc.setHex(r < .1 ? GLOW : r < .13 ? BLUE : NAVY);
      m.setColorAt(i, cc);
    });
    scene.add(m);
  }
  instWin(slotsZ, new THREE.BoxGeometry(.5, .75, .12));
  instWin(slotsX, new THREE.BoxGeometry(.12, .75, .5));

  // porta do seu prédio (lado sul, atrás de você)
  const ap = grp(0, 0, -20.82);
  box(1.3, 2.4, .14, LIGHT2, 0, 1.2, 0, ap);
  box(1.05, 2.25, .12, DARK2, 0, 1.12, .04, ap);
  box(.07, .07, .07, BLUE, .4, 1.1, .1, ap);

  // entrada do metro do outro lado da praça
  const em = grp(0, 0, 20.82);
  em.rotation.y = Math.PI;
  box(2.6, 2.9, .2, LIGHT2, 0, 1.45, 0, em);
  box(1.05, 2.6, .16, DARK2, -.55, 1.3, .06, em);
  box(1.05, 2.6, .16, DARK2, .55, 1.3, .06, em);
  box(1.7, .58, .1, DARK2, 0, 3.3, -.02, em);
  lite(1.6, .5, .12, BLUE, 0, 3.3, .05, em);
  tag(em, 'Entrada do metro', { go: 'metro' });

  // postes ladeando o caminho
  for (const pz_ of [-12, 0, 12]) for (const s of [-1, 1]) {
    box(.12, 3.6, .12, DARK2, s * 3.2, 1.8, pz_);
    box(.8, .1, .1, DARK2, s * 2.8, 3.55, pz_);
    lite(.3, .12, .2, GLOW, s * 2.5, 3.45, pz_);
    const pl = new THREE.PointLight(0xeaf2f2, .5, 10);
    pl.position.set(s * 2.5, 3.3, pz_);
    scene.add(pl);
    blockOf(s * 3.2 - .2, pz_ - .2, s * 3.2 + .2, pz_ + .2);
  }

  // floreiras com arbustos azuis
  for (const [fx, fz] of [[-9, -8], [9, -8], [-9, 8], [9, 8]]) {
    box(1.1, .5, 1.1, DARK2, fx, .25, fz);
    blob(.6, .45, .6, BLUE, fx, .75, fz);
    blockOf(fx - .6, fz - .6, fx + .6, fz + .6);
  }

  // a baleia: gigante, flutuando como se estivesse no mar
  const w = grp(0, 30, 0);
  const corpo = grp(0, 0, 0, w);
  blob(5.8, 2.1, 2.4, BLUE, 0, 0, 0, corpo);            // corpo fusiforme
  blob(4.6, 1.5, 2.1, LIGHT, .9, -.85, 0, corpo);       // barriga clara
  blob(2.6, 1.25, 1.7, LIGHT, 3.6, -.75, 0, corpo);     // mandíbula
  blob(.3, .12, .2, DARK2, 2.2, 2.0, 0, corpo);         // respiradouro
  blob(.16, .16, .16, DARK2, 4.55, .25, 1.78, corpo);   // olhos
  blob(.16, .16, .16, DARK2, 4.55, .25, -1.78, corpo);
  const dorsal = blob(.85, .5, .14, BLUE, -2.6, 2.0, 0, corpo);
  dorsal.rotation.z = .5;
  for (const s of [-1, 1]) {                            // nadadeiras peitorais
    const nad = blob(1.6, .16, .6, BLUE, 1.4, -1.5, s * 2.3, corpo);
    nad.rotation.x = s * .55;
    nad.rotation.y = s * -.35;
  }
  const cauda = grp(-4.6, .2, 0, w);
  blob(2.2, .8, .9, BLUE, -1.1, .15, 0, cauda);         // pedúnculo
  for (const s of [-1, 1]) {                            // nadadeira da cauda
    const f = blob(1.05, .14, 1.9, BLUE, -2.9, .35, s * 1.35, cauda);
    f.rotation.y = s * .45;
  }
  w.scale.setScalar(2.1);
  w.visible = false;
  // cruza a praça lateralmente, da direita para a esquerda do jogador
  let t0 = null;
  anims.push(t => {
    if (t0 === null) t0 = t;
    const e = t - t0 - 3, dur = 26;
    if (e < 0 || e > dur) { w.visible = false; return; }
    w.visible = true;
    const k = e / dur;
    w.position.set(
      -70 + 140 * k,
      19 + Math.sin(t * .75) * 1.4 + k * 4,
      8 - Math.sin(k * Math.PI) * 3
    );
    w.rotation.x = Math.sin(t * .5) * .07;
    cauda.rotation.z = Math.sin(t * 1.7) * .3;
    corpo.rotation.z = Math.sin(t * 1.7 + 1.1) * .04;
  });

  return { spawn: { x: 0, z: -19, yaw: Math.PI }, caption: 'A PRAÇA', auto: null };
}

/* ===================== CENA: O METRO ===================== */
function buildMetro() {
  freshScene();
  scene.fog = new THREE.Fog(DARK, 8, 30);
  sway = true;
  const L = 16, Wz = 2.7, H = 2.35;

  box(L + .4, .2, Wz + .4, FLOOR, 0, -.1, 0);
  box(L + .4, .2, Wz + .4, DARK2, 0, H + .1, 0);
  for (const s of [-1, 1]) {
    box(L + .4, H, .16, LIGHT, 0, H / 2, s * (Wz / 2 + .08));
    box(L + .4, .26, .1, DARK2, 0, 2.18, s * (Wz / 2 - .02));
    box(L + .4, .14, .1, DARK2, 0, .07, s * (Wz / 2 - .02));
  }
  box(.16, H, Wz + .4, LIGHT, -L / 2 - .08, H / 2, 0);
  box(.16, H, Wz + .4, LIGHT, L / 2 + .08, H / 2, 0);
  walkOf(-7.5, -.85, 7.5, .85);

  // janelas com luzes do túnel passando (cenário)
  function janela(x, s) {
    const g = grp(x, 1.5, s * (Wz / 2 - .06));
    box(1.3, 1.0, .07, LIGHT2, 0, 0, 0, g);
    box(1.12, .84, .05, DARK2, 0, 0, -s * .02, g);
    const st = lite(.24, .06, .02, BLUE, 0, .1, -s * .055, g);
    const ph = Math.random() * 9, spd = 2.2 + Math.random();
    anims.push(t => {
      const k = ((t * spd + ph) % 1.6) - .8;
      st.position.x = k;
      st.visible = Math.abs(k) < .44;
    });
  }
  for (const x of [-6, -3, 0, 3]) { janela(x, 1); janela(x, -1); }
  janela(6, 1);

  // bancos corridos
  function banco(x1, x2, s) {
    const len = x2 - x1, cx = (x1 + x2) / 2;
    box(len, .46, .4, LIGHT2, cx, .23, s * (Wz / 2 - .31));
    box(len, .07, .48, LIGHT, cx, .5, s * (Wz / 2 - .33));
    box(len, .5, .06, LIGHT, cx, .78, s * (Wz / 2 - .12));
  }
  banco(-7.3, 7.3, 1);
  banco(-7.3, 4.2, -1);
  banco(6.3, 7.3, -1);

  // pegadores pendurados (cenário)
  box(12.5, .06, .06, DARK2, 0, 2.08, 0);
  for (let x = -5.6; x <= 5.7; x += 1.15) {
    box(.04, .2, .04, DARK2, x, 1.96, 0);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(.09, .028, 6, 10),
      new THREE.MeshLambertMaterial({ color: DARK2 })
    );
    ring.position.set(x, 1.8, 0);
    scene.add(ring);
  }

  // luzes pontilhadas do teto
  for (let x = -7; x <= 7; x += .9) lite(.22, .04, .22, GLOW, x, 2.32, 0);
  for (const lx of [-4, 4]) {
    const pl = new THREE.PointLight(0xeaf2f2, .4, 10);
    pl.position.set(lx, 2, 0);
    scene.add(pl);
  }

  // letreiro azul pendurado (cenário)
  const let_ = grp(1.2, 1.92, 0);
  box(.06, .3, .06, DARK2, -.4, .3, 0, let_);
  box(.06, .3, .06, DARK2, .4, .3, 0, let_);
  box(1.0, .38, .1, DARK2, 0, 0, 0, let_);
  lite(.9, .28, .02, BLUE, 0, 0, .06, let_);
  lite(.9, .28, .02, BLUE, 0, 0, -.06, let_);

  if (day === 1) {
    // passageiro comum (cenário)
    const pas = person(true);
    pas.position.set(-2.5, .04, 1.0);
    pas.rotation.y = Math.PI;
  } else {
    // dia 2: os moradores de rua
    const m1 = person(true);
    m1.position.set(-1.0, .04, 1.0);
    m1.rotation.y = Math.PI;
    tag(m1, 'Morador de rua', { lines: ROTEIRO.morador2a });
    const m2 = person(true);
    m2.position.set(2.5, .04, -1.0);
    tag(m2, 'Outro morador de rua', { lines: ROTEIRO.morador2b });
  }

  // porta do vagão
  const pdoor = grp(5.25, 0, -(Wz / 2 - .07));
  box(2.0, 2.2, .12, LIGHT2, 0, 1.1, 0, pdoor);
  box(.85, 2.05, .1, DARK2, -.46, 1.02, .05, pdoor);
  box(.85, 2.05, .1, DARK2, .46, 1.02, .05, pdoor);
  lite(.5, .09, .02, BLUE, 0, 2.0, .12, pdoor);
  tag(pdoor, 'Porta do vagão', { go: 'empresa' });

  return {
    spawn: { x: -6.3, z: 0, yaw: -Math.PI / 2 },
    caption: 'METRO',
    auto: day === 1 ? { name: '', lines: ROTEIRO.metro1 } : null,
  };
}

/* ===================== CENA: O TRABALHO ===================== */
function buildEmpresa() {
  freshScene();
  scene.fog = new THREE.Fog(DARK, 10, 40);
  const H = 3;

  box(3.4, .2, 8.6, FLOOR, 5.5, -.1, -3.9);
  box(15.6, .2, 4.4, FLOOR, -.5, -.1, 2);
  box(3.4, .2, 8.6, DARK2, 5.5, H + .1, -3.9);
  box(15.6, .2, 4.4, DARK2, -.5, H + .1, 2);
  box(3.4, H, .18, LIGHT, 5.5, H / 2, -8.09);
  box(.18, H, 12.6, LIGHT, 7.09, H / 2, -2.05);
  box(.18, H, 8.2, LIGHT, 3.91, H / 2, -4.05);
  box(12.2, H, .18, LIGHT, -2.05, H / 2, -.09);
  box(.18, H, 4.4, LIGHT, -8.09, H / 2, 2);
  box(15.6, H, .18, LIGHT, -.5, H / 2, 4.09);
  walkOf(4.3, -7.55, 6.7, 1.0);
  walkOf(-7.6, .4, 6.7, 3.65);

  for (const [lx, lz] of [[5.5, -5], [5.5, -1], [0, 2], [-5, 2], [4, 2]]) {
    const pl = new THREE.PointLight(0xeaf2f2, .35, 11);
    pl.position.set(lx, 2.6, lz);
    scene.add(pl);
  }

  // porta da rua (cenário, atrás de você)
  const ed = grp(5.5, 0, -7.96);
  box(1.2, 2.3, .1, LIGHT2, 0, 1.15, 0, ed);
  box(1.0, 2.16, .09, DARK2, 0, 1.08, .04, ed);
  box(.07, .07, .06, BLUE, .38, 1.05, .09, ed);

  // relógio de ponto (cenário)
  const pt = grp(6.96, 1.45, -6.3);
  box(.1, .5, .62, DARK2, 0, 0, 0, pt);
  lite(.03, .07, .07, GLOW, -.06, .1, -.12, pt);
  lite(.03, .07, .07, GLOW, -.06, .1, .12, pt);

  // o chefe: escuro, maior, bloqueando o corredor
  const chefe = person(false, DARK2);
  chefe.position.set(5.9, 0, -1.2);
  chefe.rotation.y = Math.PI;
  chefe.scale.setScalar(1.34);
  tag(chefe, 'Chefe', { lines: day === 1 ? ROTEIRO.chefe1a : ROTEIRO.chefe2a });
  blockOf(5.55, -1.55, 6.25, -.85);

  // copa: balcão, cafeteira, micro-ondas (cenário)
  const copa = grp(-5.5, 0, .55);
  box(3.1, .95, .75, LIGHT2, 0, .475, 0, copa);
  box(3.2, .07, .85, LIGHT, 0, .99, 0, copa);
  const cafe = grp(-.9, 1.03, 0, copa);
  box(.32, .5, .32, DARK2, 0, .25, 0, cafe);
  box(.2, .2, .2, BLUE, 0, .1, .2, cafe);
  lite(.05, .05, .02, BLUE, .1, .42, .17, cafe);
  const micro = grp(.9, 1.21, 0, copa);
  box(.55, .36, .42, DARK2, 0, 0, 0, micro);
  box(.32, .26, .02, NAVY, -.06, 0, .22, micro);
  blockOf(-7.15, 0, -3.85, 1.05);

  // mural de avisos (cenário)
  const mural = grp(-7.94, 1.7, 2);
  box(.07, .7, .95, DARK2, 0, 0, 0, mural);
  box(.05, .6, .85, LIGHT2, .02, 0, 0, mural);
  lite(.02, .2, .16, GLOW, .06, .12, -.2, mural);
  lite(.02, .16, .13, GLOW, .06, -.1, .12, mural);
  box(.02, .12, .1, BLUE, .06, .14, .28, mural);

  // relógio de parede (cenário)
  const rel = grp(0, 2.25, .02);
  box(.36, .36, .07, DARK2, 0, 0, 0, rel);
  box(.28, .28, .02, 0xc7d4d5, 0, 0, .04, rel);
  box(.03, .1, .015, DARK2, 0, .04, .055, rel);
  box(.08, .03, .015, DARK2, .04, 0, .055, rel);

  // mesa do colega
  const mesaC = grp(-1.5, 0, 1.7);
  box(1.7, .07, .75, LIGHT2, 0, .76, 0, mesaC);
  for (const [lx, lz] of [[-.78, -.3], [.78, -.3], [-.78, .3], [.78, .3]])
    box(.07, .76, .07, DARK2, lx, .38, lz, mesaC);
  for (const dx of [-.38, .38]) {
    box(.22, .04, .18, DARK2, dx, .8, -.15, mesaC);
    box(.06, .14, .06, DARK2, dx, .88, -.18, mesaC);
    box(.5, .38, .06, DARK2, dx, 1.16, -.2, mesaC);
    box(.44, .32, .02, NAVY, dx, 1.16, -.16, mesaC);
  }
  box(.4, .04, .15, DARK2, 0, .81, .18, mesaC);
  box(.5, .07, .5, DARK2, 0, .5, .85, mesaC);
  box(.5, .55, .07, DARK2, 0, .85, 1.12, mesaC);
  const col = person(true, BLUE, mesaC);
  col.position.set(0, .04, .85);
  col.rotation.y = Math.PI;
  if (day === 1) tag(mesaC, 'Colega', { lines: ROTEIRO.colega1 });
  blockOf(-2.5, 1.2, -.5, 2.95);

  // funcionário parado (cenário)
  const func = person(false);
  func.position.set(2.3, 0, 2.45);
  func.rotation.y = -.7;
  blockOf(2.0, 2.15, 2.6, 2.75);

  // gato do escritório (cenário)
  cat(3.6, 3.45, 2.6);

  // placa de piso molhado (cenário)
  const placa = grp(-4.2, 0, 3.1);
  const a = box(.34, .52, .05, BLUE, 0, .26, .11, placa); a.rotation.x = -.35;
  const b = box(.34, .52, .05, BLUE, 0, .26, -.11, placa); b.rotation.x = .35;
  blockOf(-4.45, 2.85, -3.95, 3.35);

  // quadro (cenário)
  const quadro = grp(1.0, 2.0, 3.97);
  box(.95, .6, .07, DARK2, 0, 0, 0, quadro);
  box(.85, .5, .02, LIGHT2, 0, 0, -.045, quadro);

  // sua mesa: o computador do trabalho, fecha o dia
  const minha = grp(-7.3, 0, 2.6);
  box(.8, .07, 1.5, LIGHT2, 0, .76, 0, minha);
  for (const [lx, lz] of [[-.32, -.68], [.32, -.68], [-.32, .68], [.32, .68]])
    box(.07, .76, .07, DARK2, lx, .38, lz, minha);
  box(.3, .05, .42, DARK2, -.1, .81, 0, minha);
  box(.09, .22, .09, DARK2, -.14, .93, 0, minha);
  box(.08, .68, 1.04, DARK2, -.22, 1.42, 0, minha); // monitor grande
  const tela2 = new THREE.Mesh(new THREE.PlaneGeometry(.92, .56), termMat);
  tela2.rotation.y = Math.PI / 2;
  tela2.position.set(-.175, 1.42, 0);
  minha.add(tela2);
  box(.15, .04, .4, DARK2, .15, .81, 0, minha);
  box(.5, .07, .5, DARK2, .85, .5, 0, minha);
  box(.07, .55, .5, DARK2, 1.13, .85, 0, minha);
  box(.3, .42, .22, BLUE, .3, .21, 1.05, minha);
  const sentado2 = { seat: { x: -6.5, y: 1.15, z: 2.6 }, look: { x: -7.52, y: 1.42, z: 2.6 } };
  if (day === 1) tag(minha, 'Computador', {
    terminal: ROTEIRO.pcTrabalho1, ...sentado2,
    cb: () => say('Pensamento', ROTEIRO.pensamento1,
      () => say('Chefe', ROTEIRO.chefe1b,
        () => { day = 2; go('quarto'); })),
  });
  if (day === 2) tag(minha, 'Computador', {
    terminal: ROTEIRO.pcTrabalho2, ...sentado2,
    cb: () => say('Chefe', ROTEIRO.chefe2b,
      () => { day = 3; go('quarto'); }),
  });
  blockOf(-7.75, 1.7, -6.4, 3.5);

  return { spawn: { x: 5.5, z: -7.1, yaw: Math.PI }, caption: 'TRABALHO', auto: null };
}

const builders = { quarto: buildQuarto, rua: buildRua, metro: buildMetro, empresa: buildEmpresa };

/* ===================== colisão ===================== */
const R = .3;
function inWalk(x, z) {
  for (const w of walks) if (x >= w.x1 && x <= w.x2 && z >= w.z1 && z <= w.z2) return true;
  return false;
}
function free(x, z) {
  for (const [dx, dz] of [[R, 0], [-R, 0], [0, R], [0, -R], [.21, .21], [-.21, .21], [.21, -.21], [-.21, -.21]])
    if (!inWalk(x + dx, z + dz)) return false;
  for (const b of blocks)
    if (x > b.x1 - R && x < b.x2 + R && z > b.z1 - R && z < b.z2 + R) return false;
  return true;
}

/* ===================== fluxo de cenas ===================== */
function showCaption(txt) {
  capEl.textContent = txt;
  capEl.style.opacity = 1;
  clearTimeout(capTimer);
  capTimer = setTimeout(() => { capEl.style.opacity = 0; }, 2800);
}
function build(name) {
  const def = builders[name]();
  px = def.spawn.x; pz = def.spawn.z; yaw = def.spawn.yaw; pitch = 0;
  showCaption(def.caption);
  clearTimeout(autoTimer);
  if (def.auto) autoTimer = setTimeout(() => {
    if (!ended && !transit) say(def.auto.name, def.auto.lines);
  }, 1100);
}
function go(name) {
  transit = true;
  closeText();
  fadeEl.classList.add('on');
  setTimeout(() => {
    if (name === 'end') {
      ended = true;
      document.exitPointerLock();
      endEl.classList.remove('hidden');
      fadeEl.classList.remove('on');
      return;
    }
    build(name);
    fadeEl.classList.remove('on');
    setTimeout(() => { transit = false; }, 450);
  }, 750);
}

/* ===================== interação ===================== */
function useTarget() {
  const it = target.userData.inter;
  if (it.terminal) startTerm(it);
  else if (it.lines) say(it.name, it.lines, it.go ? () => go(it.go) : (it.cb || null));
  else if (it.go) go(it.go);
}

const ray = new THREE.Raycaster();
ray.far = 2.8;
const V0 = new THREE.Vector2(0, 0);

function setGlow(root, on) {
  if (!root) return;
  root.traverse(o => {
    if (o.isMesh && o.material.emissive) o.material.emissive.setHex(on ? 0x1c3850 : 0x000000);
  });
}
function updateTarget() {
  let tgt = null;
  dotEl.classList.toggle('hidden', !!term);
  if (started && !ended && !transit && !term) {
    ray.setFromCamera(V0, camera);
    const hits = ray.intersectObjects(inters, true);
    if (hits.length) {
      let o = hits[0].object;
      while (o && !o.userData.inter) o = o.parent;
      tgt = o || null;
    }
  }
  if (tgt !== target) {
    setGlow(target, false);
    setGlow(tgt, true);
    target = tgt;
    if (target) prName.textContent = target.userData.inter.name;
  }
  dotEl.classList.toggle('hot', !!target);
  promptEl.classList.toggle('on', !!target && !textOpen);
  if (isMobile) btnE.classList.toggle('hot', !!target || textOpen || !!(term && term.typing));
}

/* ===================== mobile: dois analógicos + botão E ===================== */
const isMobile = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const joyL = { x: 0, y: 0 }; // esquerdo: move o personagem
const joyR = { x: 0, y: 0 }; // direito: gira a câmera

function bindStick(el, vec) {
  const nub = el.firstElementChild, RAD = 44;
  let id = null;
  function move(e) {
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > RAD) { dx *= RAD / d; dy *= RAD / d; }
    vec.x = dx / RAD; vec.y = dy / RAD;
    nub.style.transform = `translate(${dx}px,${dy}px)`;
  }
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    id = e.pointerId;
    el.setPointerCapture(id);
    move(e);
  });
  el.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
  const end = e => {
    if (e.pointerId !== id) return;
    id = null;
    vec.x = 0; vec.y = 0;
    nub.style.transform = '';
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

function actionE() {
  if (!started || ended || transit) return;
  if (term) termE();
  else if (textOpen) nextPage();
  else if (target) useTarget();
}

if (isMobile) {
  document.body.classList.add('mobile');
  titleEl.querySelector('.keys').textContent = 'analógico esquerdo move · direito olha · E interage';
  bindStick($('stick-l'), joyL);
  bindStick($('stick-r'), joyR);
  btnE.addEventListener('pointerdown', e => { e.preventDefault(); actionE(); });
}

/* ===================== input ===================== */
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyE' && document.pointerLockElement) actionE();
});
addEventListener('keyup', e => { keys[e.code] = false; });

document.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== renderer.domElement || term) return;
  yaw -= e.movementX * .0023;
  pitch = Math.max(-1.45, Math.min(1.45, pitch - e.movementY * .0023));
});

function startPlay() {
  if (isMobile) {
    // no touch não há pointer lock: entra em tela cheia e trava na horizontal
    const de = document.documentElement;
    if (de.requestFullscreen) de.requestFullscreen().catch(() => {});
    try {
      if (screen.orientation && screen.orientation.lock)
        screen.orientation.lock('landscape').catch(() => {});
    } catch (e) {}
    if (!started) {
      started = true;
      titleEl.classList.add('hidden');
      build('quarto');
    }
    pauseEl.classList.add('hidden');
  } else {
    renderer.domElement.requestPointerLock();
  }
}
titleEl.addEventListener('click', startPlay);
pauseEl.addEventListener('click', startPlay);
endEl.addEventListener('click', () => location.reload());

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (locked) {
    if (!started) {
      started = true;
      titleEl.classList.add('hidden');
      build('quarto');
    }
    pauseEl.classList.add('hidden');
  } else if (started && !ended) {
    pauseEl.classList.remove('hidden');
  }
});

/* ===================== loop ===================== */
let last = performance.now(), bobT = 0;
function tick(now) {
  requestAnimationFrame(tick);
  if (!scene) { renderer.clear(); return; }
  const t = now / 1000, dt = Math.min((now - last) / 1000, .05);
  last = now;

  let mv = false;
  if (started && !ended && !transit && !term && (document.pointerLockElement || isMobile)) {
    // analógico direito gira a câmera
    if (joyR.x || joyR.y) {
      yaw -= joyR.x * 2.4 * dt;
      pitch = Math.max(-1.45, Math.min(1.45, pitch - joyR.y * 1.8 * dt));
    }
    const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joyL.y;
    const st = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joyL.x;
    const mag = Math.hypot(f, st);
    if (mag > .15) {
      mv = true;
      const sp = 3.1 * dt * Math.min(mag, 1) / mag;
      const dx = (-Math.sin(yaw) * f + Math.cos(yaw) * st) * sp;
      const dz = (-Math.cos(yaw) * f - Math.sin(yaw) * st) * sp;
      if (free(px + dx, pz + dz)) { px += dx; pz += dz; }
      else if (free(px + dx, pz)) { px += dx; }
      else if (free(px, pz + dz)) { pz += dz; }
    }
  }
  if (mv) bobT += dt * 8.5;

  if (camAnim) {
    // sentar / levantar da cadeira
    camAnim.t += dt;
    let k = Math.min(camAnim.t / camAnim.dur, 1);
    k = k * k * (3 - 2 * k);
    const f = camAnim.from, o = camAnim.to;
    let dyaw = o.yaw - f.yaw;
    dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    camera.position.set(f.x + (o.x - f.x) * k, f.y + (o.y - f.y) * k, f.z + (o.z - f.z) * k);
    camera.rotation.set(f.pitch + (o.pitch - f.pitch) * k, f.yaw + dyaw * k, 0);
    if (k >= 1) { const fn = camAnim.then; camAnim = null; fn(); }
  } else if (term) {
    camera.position.set(term.pose.x, term.pose.y, term.pose.z);
    camera.rotation.set(term.pose.pitch, term.pose.yaw, 0);
  } else {
    camera.position.set(
      px,
      1.6 + (mv ? Math.sin(bobT) * .03 : 0) + (sway ? Math.sin(t * 2.2) * .015 + Math.sin(t * 7.1) * .005 : 0),
      pz
    );
    camera.rotation.set(pitch, yaw, 0);
  }

  // datilografia do terminal
  if (term && term.typing && !term.waiting) {
    const cur = term.lines[term.idx];
    const prev = Math.floor(term.chars);
    term.chars = Math.min(term.chars + dt * 30, cur.length);
    if (term.chars >= cur.length) { term.waiting = true; drawTerm(); }
    else if (Math.floor(term.chars) !== prev) drawTerm();
  }
  if (term && term.waiting) {
    const b = Math.floor(t * 2) % 2;
    if (b !== term.blink) { term.blink = b; drawTerm(); }
  }

  for (const a of anims) a(t);
  updateTarget();
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);

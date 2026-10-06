// House Walkthrough — walking sim 3D em primeira pessoa.
// Reconstrução fiel da planta de house.md / house.jpeg (Pav. Térreo). Todo texto de tela em inglês.
// Comentários/variáveis em português DE PROPÓSITO.
import * as THREE from 'three';

const BUILD = 20;

// ============================================================
//  DADOS DA PLANTA  (metros de MUNDO, medidos direto na house.jpeg)
//  X: 0 = divisa oeste  ->  10 = divisa leste
//  Z: 0 = alinhamento da rua (face externa do muro da frente) -> 20 = divisa dos fundos
//  Y: altura. Olho do jogador 1.60.
//
//  BUILD 17 — refit 100% pela planta (faces de parede lidas em pixels, 64,68 px/m:
//  x = (px-28)/64.68 · z = (1357-py)/64.68). Paredes de 0,20.
//  BUILD 18 — salto visual: texturas PBR procedurais (cor + relevo + rugosidade)
//  em escala real, quinas arredondadas, AO de contato, sondas de reflexo/luz
//  rebatida por cômodo, telhado de duas águas, grama e folhagem instanciadas,
//  adaptação de exposição e luminárias dinâmicas. Geometria estática fundida
//  por material (centenas de draw calls a menos).
// ============================================================
const H    = 2.70;   // pé-direito interno
const MURO = 2.20;   // altura dos muros de divisa
const CEIL = H;
const ZMAX = 20.00;  // fundo do lote (planta: 10,00 × 20,00)
// BUILD 19: a SALA tem pé-direito mais alto que o resto da casa (correção do André).
// Toda parede cujo pedaço cai dentro do bloco da sala (incluindo as próprias paredes)
// sobe até H_SALA, e o telhado da sala é uma água mais alta.
const H_SALA = 3.20;
const SALA_BLOCK = { x0:6.50, x1:10.01, z0:1.98, z1:5.99 };
const inSala = (x,z)=> x >= SALA_BLOCK.x0 && x <= SALA_BLOCK.x1 && z >= SALA_BLOCK.z0 && z <= SALA_BLOCK.z1;

// Ambientes = retângulos internos (face a face das paredes).
// f = acabamento de piso · fy = cota do piso · indoor = tem forro.
const ROOMS = [
  { k:'ramp',     name:'Garage',           x0:0.20, z0:0.00,  x1:4.30, z1:1.39,  fy:-0.02, f:'concrete', indoor:false, slope:[-0.30,-0.02] },
  { k:'garage',   name:'Garage',           x0:0.20, z0:1.39,  x1:4.30, z1:5.80,  fy:-0.02, f:'concrete', indoor:false },
  { k:'yard',     name:'Front Yard',       x0:4.30, z0:0.00,  x1:9.80, z1:1.99,  fy:-0.02, f:'concrete', indoor:false },
  { k:'dorm1',    name:'Home Office',      x0:4.50, z0:2.20,  x1:6.51, z1:5.80,  fy:0.00,  f:'wood',     indoor:true  },
  { k:'sestar',   name:'Living Room',      x0:6.69, z0:2.20,  x1:9.80, z1:5.80,  fy:0.00,  f:'wood',     indoor:true, ch:H_SALA },
  // Jantar/Coz. é o HUB: Dorm.1, Dorm.02, WC social, suíte, sala e serviço abrem nela.
  { k:'jantar',   name:'Dining / Kitchen', x0:5.06, z0:5.98,  x1:9.80, z1:10.14, fy:0.00,  f:'tileBig',  indoor:true  },
  { k:'dorm2',    name:'Kids Room',        x0:1.70, z0:5.98,  x1:4.85, z1:8.55,  fy:0.00,  f:'wood',     indoor:true  },
  { k:'wcsocial', name:'Guest Bathroom',   x0:2.35, z0:8.74,  x1:4.85, z1:10.14, fy:0.00,  f:'tile',     indoor:true  },
  { k:'suite',    name:'Master Suite',     x0:2.35, z0:10.34, x1:6.15, z1:13.14, fy:0.00,  f:'wood',     indoor:true  },
  { k:'nicho',    name:'Master Suite',     x0:4.76, z0:13.14, x1:6.15, z1:15.74, fy:0.00,  f:'wood',     indoor:true  },
  { k:'wcsuite',  name:'Ensuite Bathroom', x0:2.35, z0:13.34, x1:4.55, z1:15.74, fy:0.00,  f:'tile',     indoor:true  },
  { k:'servico',  name:'Laundry Yard',     x0:6.35, z0:10.34, x1:9.80, z1:15.94, fy:-0.02, f:'concrete', indoor:false },
  { k:'corr1',    name:'Side Corridor',    x0:0.20, z0:5.98,  x1:1.50, z1:8.74,  fy:-0.04, f:'concrete', indoor:false },
  { k:'corr2',    name:'Side Corridor',    x0:0.20, z0:8.74,  x1:2.15, z1:15.94, fy:-0.04, f:'grass',    indoor:false },
  { k:'backyard', name:'Backyard',         x0:0.20, z0:15.94, x1:9.80, z1:19.79, fy:-0.04, f:'grass',    indoor:false },
];
const INDOOR = ROOMS.filter(r=>r.indoor);
// cômodos que compartilham a mesma sonda de luz (o nicho é parte da suíte)
const PROBE = { dorm1:'dorm1', sestar:'sestar', jantar:'jantar', dorm2:'dorm2',
                wcsocial:'wcsocial', suite:'suite', nicho:'suite', wcsuite:'wcsuite' };

// Vãos — "at" = centro do vão no eixo comprido da parede (coordenada de mundo)
const door = (at, w, h=2.10) => ({ at, w, y0:0.00, y1:h });                  // porta (passável)
const opening = (at, w, h=2.30) => ({ at, w, y0:0.00, y1:h });               // vão livre (passável)
const win  = (at,w,s,h)       => ({ at, w, y0:s, y1:s+h, glass:true });      // janela (bloqueia)
const glassdoor = (at,w,h=2.10) => ({ at, w, y0:0.00, y1:h, glass:true });   // porta-janela (bloqueia)
const arch = (at, w, h, r)    => ({ at, w, y0:0.00, y1:h, arch:r });         // vão livre com cantos redondos

// Paredes = RETÂNGULO real da alvenaria: [x0,z0, x1,z1, altura, vãos, base?]
const WALLS = [
  // ---- Muros de divisa ----
  [0.00,0.19, 0.20,19.79, MURO, []],                         // oeste
  [0.00,19.79, 10.00,20.00, MURO, []],                       // fundos
  [9.80,0.19, 10.00,1.99, MURO, []],                         // leste: jardim da frente
  [9.80,10.34, 10.00,19.79, MURO, []],                       // leste: serviço + quintal
  // muro da frente: basculante 3,60 · gradil 1,50 · portão social 1,00 (alinhado à porta da sala)
  // (base em -1,31: o terreno da calçada cai até -1,10 no canto leste)
  [0.00,0.00, 10.00,0.19, MURO, [opening(2.165,3.61), opening(5.50,1.50), opening(7.38,1.00)], -1.31],

  // ---- Casa: parede leste colada na divisa (sala + cozinha) ----
  [9.80,1.99, 10.00,10.34, H, []],

  // ---- Fachada da frente (Dorm.1 + Sala) ----
  [4.30,1.99, 9.80,2.20, H, [win(5.50,1.00,1.00,1.50), door(7.40,1.00,2.20), win(9.01,1.00,1.00,1.50)]],
  [4.30,2.20, 4.50,5.80, H, []],                             // oeste do Dorm.1 (= leste da garagem)
  [6.51,2.20, 6.69,5.80, H, []],                             // Dorm.1 | Sala

  // ---- Linha z 5,80–5,98: garagem→corredor · Dorm.02 · Dorm.1 · Sala↔cozinha ----
  // (o vão da sala tem os cantos de cima arredondados — raio 0,30)
  [0.20,5.80, 9.80,5.98, H, [door(0.865,0.80), door(6.00,0.80), arch(7.97,2.22,2.30,0.30)]],

  // ---- Faixa oeste ----
  [1.50,5.98, 1.70,8.55, H, [win(7.29,1.50,1.10,1.00)]],                       // oeste Dorm.02
  [1.50,8.55, 4.85,8.74, H, []],                                               // Dorm.02 | WC social
  [2.15,8.74, 2.35,15.74, H, [win(9.44,1.00,1.50,0.60), glassdoor(11.735,1.80)]], // fachada oeste WC social + suíte

  // ---- Oeste da cozinha: porta Dorm.02 (0,80, ponta sul) + porta WC social (0,70, ponta norte) ----
  [4.85,5.98, 5.06,10.14, H, [door(6.495,0.80), door(9.685,0.70)]],

  // ---- Linha z 10,14–10,34: suíte/WC social ↔ cozinha ↔ serviço ----
  [2.35,10.14, 9.80,10.34, H, [door(5.655,0.80), opening(8.01,2.20,2.10)]],

  // ---- Suíte ----
  [6.15,10.34, 6.35,15.74, H, []],                                              // leste = parede do serviço
  [2.35,13.14, 4.76,13.34, H, []],                                              // sul do WC suíte
  [4.55,13.34, 4.76,15.74, H, [door(14.37,0.80)]],                              // WC suíte -> nicho
  [2.15,15.74, 6.35,15.94, H, [win(3.48,2.20,1.10,1.00), win(5.51,0.80,0.30,1.80)]], // fundos
];

// ============================================================
//  RENDERER
// ============================================================
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const HQ = !isTouch;                       // celular: texturas e sombras menores
const TB = HQ ? 1024 : 512;                // textura "grande" (pisos, paredes)
const TS = HQ ? 512  : 256;                // textura "pequena" (móveis, detalhes)

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;          // resposta fotográfica (não satura o amarelo das lâmpadas)
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Cena 100% estática: o shadow map é calculado UMA vez (setar needsUpdate ao mexer).
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc9d9e6, 45, 150);           // névoa de distância (a vizinhança some suave no fim da rua)

// FOV pela proporção da tela: ~90° na horizontal, como o olho enxerga um cômodo.
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.05, 300);
function fitFov(){
  const a = window.innerWidth / window.innerHeight;
  camera.fov = Math.max(50, Math.min(75, THREE.MathUtils.radToDeg(2*Math.atan(1/a))));
  camera.aspect = a;
  camera.updateProjectionMatrix();
}
fitFov();

// ============================================================
//  TEXTURAS PBR PROCEDURAIS (canvas 2D — nada externo)
//  Cada conjunto = cor + normal (derivada de um mapa de altura) + rugosidade.
//  "tile" = quantos METROS a textura cobre; a geometria usa UV em metros,
//  então tudo fica na escala real (régua de 20 cm, porcelanato 60×60, tijolo...).
// ============================================================
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const rnd = (a,b)=> a + Math.random()*(b-a);
const rgb = (r,g,b,a)=> 'rgba('+(r|0)+','+(g|0)+','+(b|0)+','+(a===undefined?1:a)+')';
const gray = (v,a)=> rgb(v,v,v,a);
function cnv(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
function tex(c, srgb, tile){
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if(tile) t.repeat.set(1/tile, 1/tile);
  return t;
}
// normal map a partir do canal R de um mapa de altura (Sobel com wrap -> continua tileável)
function heightToNormal(hc, k){
  const s = hc.width, src = hc.getContext('2d').getImageData(0,0,s,s).data;
  const out = cnv(s), g = out.getContext('2d'), img = g.createImageData(s,s), d = img.data;
  const h = new Float32Array(s*s);
  for(let i=0;i<s*s;i++) h[i] = src[i*4]/255;
  for(let y=0;y<s;y++){
    const ym = ((y-1+s)%s)*s, yp = ((y+1)%s)*s, yr = y*s;
    for(let x=0;x<s;x++){
      const xm = (x-1+s)%s, xp = (x+1)%s;
      const nx = -(h[yr+xp]-h[yr+xm])*k, ny = (h[yp+x]-h[ym+x])*k;
      const l = Math.sqrt(nx*nx + ny*ny + 1), i = (yr+x)*4;
      d[i] = (nx/l*0.5+0.5)*255; d[i+1] = (ny/l*0.5+0.5)*255; d[i+2] = (1/l*0.5+0.5)*255; d[i+3] = 255;
    }
  }
  g.putImageData(img,0,0);
  return out;
}
// draw(g = cor, gh = altura, gr = rugosidade|null, s)
function pbr(size, tile, draw, nk, withRough){
  const c = cnv(size), hc = cnv(size), rc = withRough ? cnv(size) : null;
  const g = c.getContext('2d'), gh = hc.getContext('2d'), gr = rc ? rc.getContext('2d') : null;
  gh.fillStyle = '#808080'; gh.fillRect(0,0,size,size);
  if(gr){ gr.fillStyle = '#808080'; gr.fillRect(0,0,size,size); }
  draw(g, gh, gr, size);
  return { map: tex(c, true, tile),
           normalMap: nk ? tex(heightToNormal(hc, nk), false, tile) : null,
           roughnessMap: rc ? tex(rc, false, tile) : null };
}
// desenha um retângulo repetindo nas bordas (p/ manter a textura sem emenda)
function wrapRect(s, x, y, w, h, fn){
  for(const ox of [-s, 0, s]) for(const oy of [-s, 0, s]){
    if(x+ox+w < 0 || x+ox > s || y+oy+h < 0 || y+oy > s) continue;
    fn(x+ox, y+oy, w, h);
  }
}
function blotches(g, s, n, rmin, rmax, colFn){
  for(let i=0;i<n;i++){
    const x = Math.random()*s, y = Math.random()*s, r = rnd(rmin, rmax)*s;
    const grd = g.createRadialGradient(x,y,0,x,y,r);
    grd.addColorStop(0, colFn()); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(x-r, y-r, r*2, r*2);
  }
}
function specks(g, s, n, rmin, rmax, colFn){
  for(let i=0;i<n;i++){
    g.fillStyle = colFn();
    g.beginPath(); g.arc(Math.random()*s, Math.random()*s, rnd(rmin,rmax), 0, 7); g.fill();
  }
}
const px = s => s/1024;   // 1 px numa textura de 1024 (as espessuras escalam com o tamanho)

// ---- piso de madeira: réguas de 20 cm × 0,55–1,10 m, emendas desencontradas ----
const T_WOOD = pbr(TB, 1.2, (g, gh, gr, s)=>{
  const rows = 6, rh = s/rows, gap = Math.max(1.2, 2*px(s));
  for(let r=0;r<rows;r++){
    let x = -rnd(0, s*0.7);
    while(x < s){
      const w = rnd(0.46, 0.92)*s, t = rnd(0.82, 1.08), y = r*rh;
      const base = [178*t, 126*t, 80*t];
      wrapRect(s, x, y, w, rh, (X,Y,W,Hh)=>{
        g.fillStyle = rgb(...base); g.fillRect(X,Y,W,Hh);
        g.save(); g.beginPath(); g.rect(X,Y,W,Hh); g.clip();
        for(let k=0;k<34;k++){                                   // veio
          const yy = Y + Math.random()*Hh, a = rnd(0.04, 0.16);
          g.strokeStyle = k%5 ? rgb(92,56,28,a) : rgb(230,182,130,a*0.6);
          g.lineWidth = rnd(0.6, 2.4)*px(s);
          g.beginPath(); g.moveTo(X-4, yy);
          g.bezierCurveTo(X+W*0.3, yy+rnd(-6,6)*px(s), X+W*0.7, yy+rnd(-6,6)*px(s), X+W+4, yy+rnd(-3,3)*px(s));
          g.stroke();
        }
        if(Math.random() < 0.25){                                 // nó
          const kx = X+rnd(0.1,0.9)*W, ky = Y+rnd(0.3,0.7)*Hh, kr = rnd(5,11)*px(s);
          const grd = g.createRadialGradient(kx,ky,0,kx,ky,kr*2.2);
          grd.addColorStop(0, rgb(70,40,18,0.75)); grd.addColorStop(1, rgb(70,40,18,0));
          g.fillStyle = grd; g.beginPath(); g.ellipse(kx,ky,kr*2.2,kr,0,0,7); g.fill();
        }
        g.restore();
        g.strokeStyle = rgb(48,28,14,0.7); g.lineWidth = gap; g.strokeRect(X,Y,W,Hh);
        gh.fillStyle = gray(150 + rnd(-10,10)); gh.fillRect(X,Y,W,Hh);
        gh.strokeStyle = gray(30); gh.lineWidth = gap*1.6; gh.strokeRect(X,Y,W,Hh);
        gr.fillStyle = gray(rnd(100,135)); gr.fillRect(X,Y,W,Hh);
        gr.strokeStyle = gray(235); gr.lineWidth = gap*1.6; gr.strokeRect(X,Y,W,Hh);
      });
      x += w;
    }
  }
}, 3.0, true);

// ---- porcelanato 60×60 com veio suave, rejunte de 3 mm ----
function tileSet(size, tile, cols, rows, base, grout, opts){
  opts = opts || {};
  return pbr(size, tile, (g, gh, gr, s)=>{
    const cw = s/cols, ch = s/rows, gw = Math.max(1.5, (opts.grout || 3.2)*px(s));
    g.fillStyle = grout; g.fillRect(0,0,s,s);
    gh.fillStyle = gray(40); gh.fillRect(0,0,s,s);
    gr.fillStyle = gray(225); gr.fillRect(0,0,s,s);
    for(let j=0;j<rows;j++) for(let i=-1;i<=cols;i++){
      const off = opts.stagger && j%2 ? cw/2 : 0;
      const x = i*cw + off + gw/2, y = j*ch + gw/2, w = cw-gw, h = ch-gw;
      if(x > s || x+w < 0) continue;
      const t = rnd(0.965, 1.025);
      g.fillStyle = rgb(base[0]*t, base[1]*t, base[2]*t); g.fillRect(x,y,w,h);
      g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip();
      if(opts.veins) for(let k=0;k<opts.veins;k++){               // veio de mármore
        g.strokeStyle = rgb(base[0]*0.72, base[1]*0.70, base[2]*0.68, rnd(0.05,0.13));
        g.lineWidth = rnd(1, 5)*px(s);
        g.beginPath(); g.moveTo(x+rnd(-0.2,0.4)*w, y-4);
        g.bezierCurveTo(x+rnd(0,1)*w, y+h*0.3, x+rnd(0,1)*w, y+h*0.7, x+rnd(0.4,1.2)*w, y+h+4);
        g.stroke();
      }
      g.restore();
      gh.fillStyle = gray(205); gh.fillRect(x,y,w,h);
      gh.strokeStyle = gray(165); gh.lineWidth = gw*1.2; gh.strokeRect(x+gw*0.6, y+gw*0.6, w-gw*1.2, h-gw*1.2); // bisotê
      gr.fillStyle = gray(opts.rough || 40); gr.fillRect(x,y,w,h);
    }
    if(opts.speck) specks(g, s, opts.speck, 0.5*px(s), 1.6*px(s), ()=> gray(rnd(90,170), 0.25));
  }, opts.nk || 3.2, true);
}
const T_PORC   = tileSet(TB, 1.2, 2, 2, [222,216,205], '#a29b90', { veins:6, rough:38 });
const T_BATHFL = tileSet(TB, 1.2, 4, 4, [178,182,180], '#8a8f8c', { speck:9000, rough:70 });
const T_BATHWL = tileSet(TB, 1.2, 4, 2, [240,241,238], '#c9ccc9', { grout:2.4, rough:22 });
const T_SUBWAY = tileSet(TS, 0.6, 4, 8, [244,242,236], '#cfcac0', { grout:3, rough:20, stagger:true, nk:4 });

// ---- reboco pintado (casca de laranja do rolo) ----
const T_PLASTER = pbr(TS, 1.5, (g, gh, gr, s)=>{
  g.fillStyle = '#efe9df'; g.fillRect(0,0,s,s);
  blotches(g, s, 40, 0.05, 0.22, ()=> rgb(205,195,178,0.05));
  blotches(g, s, 30, 0.05, 0.18, ()=> rgb(255,255,255,0.05));
  specks(gh, s, 9000, 0.6, 1.8*px(s)*2, ()=> gray(rnd(90,170), 0.35));
}, 0.9, false);
// ---- fachada: textura "grafiato" (riscos verticais) ----
const T_EXT = pbr(TS, 1.0, (g, gh, gr, s)=>{
  g.fillStyle = '#d9cfbd'; g.fillRect(0,0,s,s);
  blotches(g, s, 30, 0.05, 0.25, ()=> rgb(180,168,148,0.06));
  for(let i=0;i<5000;i++){
    const x = Math.random()*s, y = Math.random()*s, l = rnd(4,16)*px(s)*2, v = rnd(50,210);
    gh.strokeStyle = gray(v, 0.5); gh.lineWidth = rnd(1,2.2)*px(s)*2;
    gh.beginPath(); gh.moveTo(x,y); gh.lineTo(x+rnd(-1,1), y+l); gh.stroke();
    if(i%4 === 0){ g.strokeStyle = gray(v > 130 ? 245 : 150, 0.06); g.lineWidth = gh.lineWidth;
      g.beginPath(); g.moveTo(x,y); g.lineTo(x, y+l); g.stroke(); }
  }
}, 2.2, false);
// ---- muro: reboco grosso com manchas ----
const T_MURO = pbr(TS, 1.5, (g, gh, gr, s)=>{
  g.fillStyle = '#c5bdae'; g.fillRect(0,0,s,s);
  blotches(g, s, 60, 0.04, 0.2, ()=> rgb(120,112,98,rnd(0.04,0.10)));
  blotches(g, s, 30, 0.04, 0.2, ()=> rgb(235,228,214,0.08));
  specks(gh, s, 7000, 0.8, 3*px(s)*2, ()=> gray(rnd(60,200), 0.45));
}, 2.0, false);
// ---- concreto (garagem, serviço, calçada): mosqueado, poros, marcas de desempenadeira ----
const T_CONC = pbr(TB, 2.0, (g, gh, gr, s)=>{
  g.fillStyle = '#a9a7a1'; g.fillRect(0,0,s,s);
  blotches(g, s, 110, 0.02, 0.12, ()=> gray(rnd(90,170), rnd(0.04,0.09)));
  specks(g, s, 4000, 0.5*px(s), 1.8*px(s), ()=> gray(rnd(50,90), 0.35));
  specks(gh, s, 4000, 0.5*px(s), 1.8*px(s), ()=> gray(20, 0.5));
  for(let i=0;i<50;i++){                                  // desempenadeira
    gh.strokeStyle = gray(170, 0.12); gh.lineWidth = rnd(10,30)*px(s);
    gh.beginPath(); gh.arc(Math.random()*s, Math.random()*s, rnd(40,160)*px(s), rnd(0,6), rnd(0,6)+1.2); gh.stroke();
  }
  blotches(gr, s, 80, 0.03, 0.14, ()=> gray(rnd(170,230), 0.25));
}, 1.4, true);
// ---- terra com grama rente (por baixo das lâminas instanciadas) ----
const T_GROUND = pbr(TS, 2.0, (g, gh, gr, s)=>{
  g.fillStyle = '#4f6e35'; g.fillRect(0,0,s,s);
  blotches(g, s, 60, 0.03, 0.12, ()=> rgb(110,92,58,rnd(0.10,0.25)));
  for(let i=0;i<16000;i++){
    const v = rnd(0.65,1.3), x = Math.random()*s, y = Math.random()*s;
    g.strokeStyle = rgb(70*v, 118*v, 48*v, 0.7); g.lineWidth = rnd(0.6,1.6)*px(s)*2;
    g.beginPath(); g.moveTo(x,y); g.lineTo(x+rnd(-2,2), y-rnd(3,8)*px(s)*2); g.stroke();
  }
  specks(gh, s, 6000, 0.5, 2*px(s)*2, ()=> gray(rnd(60,200), 0.5));
}, 1.5, false);
// ---- telha portuguesa: capas abauladas com sombra de sobreposição ----
const T_ROOF = pbr(TS, 1.0, (g, gh, gr, s)=>{
  const cols = 5, rows = 3, w = s/cols, h = s/rows;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
    const x = c*w, y = r*h, t = rnd(0.82, 1.10);
    const gc = g.createLinearGradient(x,0,x+w,0);
    gc.addColorStop(0, rgb(120*t,58*t,36*t)); gc.addColorStop(0.5, rgb(186*t,96*t,62*t)); gc.addColorStop(1, rgb(120*t,58*t,36*t));
    g.fillStyle = gc; g.fillRect(x,y,w,h);
    const gg = gh.createLinearGradient(x,0,x+w,0);
    gg.addColorStop(0, gray(50)); gg.addColorStop(0.5, gray(215)); gg.addColorStop(1, gray(50));
    gh.fillStyle = gg; gh.fillRect(x,y,w,h);
    g.fillStyle = rgb(40,16,8,0.40); g.fillRect(x, y+h*0.86, w, h*0.14);       // sombra da fiada de cima
    gh.fillStyle = gray(25); gh.fillRect(x, y+h*0.90, w, h*0.10);
  }
  blotches(g, s, 40, 0.02, 0.08, ()=> rgb(60,64,40,rnd(0.08,0.18)));          // limo / sujeira
}, 3.2, false);
// ---- veio de madeira p/ móveis (claro = carvalho, escuro = nogueira) ----
function woodGrain(base){
  return pbr(TS, 1.0, (g, gh, gr, s)=>{
    g.fillStyle = rgb(...base); g.fillRect(0,0,s,s);
    for(let k=0;k<90;k++){
      const y = Math.random()*s, a = rnd(0.05, 0.18), dark = k%6;
      g.strokeStyle = dark ? rgb(base[0]*0.6, base[1]*0.55, base[2]*0.5, a) : rgb(255,230,200,a*0.5);
      g.lineWidth = rnd(0.6, 3)*px(s)*2;
      g.beginPath(); g.moveTo(-10, y);
      g.bezierCurveTo(s*0.33, y+rnd(-10,10)*px(s), s*0.66, y+rnd(-10,10)*px(s), s+10, y); g.stroke();
      gh.strokeStyle = gray(dark ? 90 : 170, 0.4); gh.lineWidth = g.lineWidth;
      gh.beginPath(); gh.moveTo(-10, y); gh.lineTo(s+10, y); gh.stroke();
    }
  }, 0.8, false);
}
const T_OAK    = woodGrain([186,142,96]);
const T_WALNUT = woodGrain([104,72,50]);
// ---- tecido (trama) — cinza claro, a cor vem do material ----
const T_FABRIC = pbr(TS, 0.20, (g, gh, gr, s)=>{
  const c = Math.max(2, s/96);
  for(let y=0;y<s;y+=c) for(let x=0;x<s;x+=c){
    const on = ((x/c|0) + (y/c|0)) % 2;
    g.fillStyle = gray(on ? 238 : 214); g.fillRect(x,y,c,c);
    gh.fillStyle = gray(on ? 175 : 85); gh.fillRect(x,y,c,c);
  }
  specks(g, s, 3000, 0.5, 1.4, ()=> gray(rnd(180,255), 0.25));
}, 1.1, false);
// ---- tapete de pelo ----
const T_RUG = pbr(TS, 0.5, (g, gh, gr, s)=>{
  g.fillStyle = gray(228); g.fillRect(0,0,s,s);
  specks(g, s, 14000, 0.5, 1.5*px(s)*2, ()=> gray(rnd(185,255), 0.6));
  specks(gh, s, 14000, 0.5, 1.5*px(s)*2, ()=> gray(rnd(40,220), 0.6));
}, 1.4, false);
// ---- tijolinho aparente (churrasqueira) ----
const T_BRICK = pbr(TS, 1.0, (g, gh, gr, s)=>{
  const rows = 16, cols = 5, h = s/rows, w = s/cols, m = Math.max(1.5, 7*px(s));
  g.fillStyle = '#cfc6b8'; g.fillRect(0,0,s,s);
  gh.fillStyle = gray(60); gh.fillRect(0,0,s,s);
  for(let r=0;r<rows;r++) for(let c=-1;c<=cols;c++){
    const x = c*w + (r%2 ? w/2 : 0) + m/2, y = r*h + m/2, t = rnd(0.8, 1.1);
    g.fillStyle = rgb(172*t, 86*t, 58*t); g.fillRect(x, y, w-m, h-m);
    gh.fillStyle = gray(rnd(180,215)); gh.fillRect(x, y, w-m, h-m);
  }
  specks(g, s, 3000, 0.5, 1.5, ()=> rgb(60,30,20,0.25));
  specks(gh, s, 3000, 0.5, 1.5, ()=> gray(rnd(80,200), 0.5));
}, 2.4, false);
// ---- granito preto com cristais ----
const T_GRANITE = pbr(TS, 0.6, (g, gh, gr, s)=>{
  g.fillStyle = '#2b2d31'; g.fillRect(0,0,s,s);
  const cols = ['#9c9a96','#5c5e63','#141518','#cfccc4','#3f4146'];
  specks(g, s, 12000, 0.5*px(s)*2, 1.8*px(s)*2, ()=> cols[(Math.random()*cols.length)|0]);
}, 0, false);
// ---- inox escovado ----
const T_BRUSH = pbr(TS, 0.5, (g, gh, gr, s)=>{
  g.fillStyle = gray(200); g.fillRect(0,0,s,s);
  gr.fillStyle = gray(95); gr.fillRect(0,0,s,s);
  for(let i=0;i<2200;i++){
    const y = Math.random()*s, v = rnd(165,240);
    g.fillStyle = gray(v, 0.35); g.fillRect(0, y, s, rnd(0.5,1.5));
    gr.fillStyle = gray(rnd(55,140), 0.4); gr.fillRect(0, y, s, rnd(0.5,1.5));
  }
}, 0, true);
// ---- pedra (pisantes) — o asfalto da rua é o T_ROAD, na seção da rua ----
const T_STONE = pbr(TS, 0.6, (g, gh, gr, s)=>{
  g.fillStyle = '#bcb5a5'; g.fillRect(0,0,s,s);
  blotches(g, s, 30, 0.05, 0.2, ()=> rgb(150,140,120,0.10));
  specks(g, s, 6000, 0.5, 1.6*px(s)*2, ()=> gray(rnd(90,220), 0.35));
  specks(gh, s, 6000, 0.5, 1.6*px(s)*2, ()=> gray(rnd(40,220), 0.5));
}, 1.4, false);
// ---- papel de parede infantil (nuvens + estrelas) ----
const T_KIDS = (()=>{
  const s = TS, c = cnv(s), g = c.getContext('2d');
  const grd = g.createLinearGradient(0,0,0,s);
  grd.addColorStop(0,'#bcdcf5'); grd.addColorStop(1,'#e6f2fb');
  g.fillStyle = grd; g.fillRect(0,0,s,s);
  const k = s/512;
  for(let i=0;i<9;i++){
    const x = Math.random()*s, y = rnd(s*0.05, s*0.85);
    g.fillStyle = 'rgba(255,255,255,.9)';
    [[-26,4,15],[-8,-6,20],[12,-4,18],[30,5,14]].forEach(([dx,dy,r])=>{
      g.beginPath(); g.arc(x+dx*k, y+dy*k, r*k, 0, 7); g.fill(); });
  }
  for(let i=0;i<44;i++){
    const x = Math.random()*s, y = Math.random()*s, r = rnd(3.5,7.5)*k;
    g.fillStyle = i%3 ? '#f6cf52' : '#f19aa8';
    g.beginPath();
    for(let j=0;j<10;j++){ const a = j*Math.PI/5 - Math.PI/2, rr = j%2 ? r*0.44 : r;
      g.lineTo(x+Math.cos(a)*rr, y+Math.sin(a)*rr); }
    g.closePath(); g.fill();
  }
  return tex(c, true, 1.2);
})();
// ---- tapete redondo colorido (UV 0..1 do disco) ----
const T_KIDRUG = (()=>{
  const c = cnv(256), g = c.getContext('2d');
  const cols = ['#4f93d6','#f2c14e','#e0543f','#5fb37a','#e78bab','#f6f1e4'];
  for(let i=6;i>=1;i--){ g.fillStyle = cols[(6-i) % cols.length];
    g.beginPath(); g.arc(128,128,128*(i/6),0,7); g.fill(); }
  return tex(c, true);
})();
// ---- quadros abstratos ----
function artTex(pal){
  const c = cnv(256), g = c.getContext('2d');
  g.fillStyle = pal[0]; g.fillRect(0,0,256,256);
  for(let i=0;i<7;i++){
    g.fillStyle = pal[1 + (i % (pal.length-1))]; g.globalAlpha = rnd(0.55, 0.95);
    if(i%2){ g.beginPath(); g.arc(rnd(30,226), rnd(30,226), rnd(18,70), 0, 7); g.fill(); }
    else g.fillRect(rnd(0,180), rnd(0,180), rnd(30,120), rnd(20,110));
  }
  g.globalAlpha = 1;
  const t = tex(c, true); t.repeat.set(1.4, 1.4);
  return t;
}
const T_ART = [
  artTex(['#efe6d6','#c8734f','#33475a','#d9b26a','#8a9a7b']),
  artTex(['#1f2a33','#e0c08b','#9a4b3a','#5d7a8a']),
  artTex(['#f4f1ea','#2f5d7c','#e3a24a','#b9c7c9','#1d1f22']),
  artTex(['#d8dfe0','#6b8f71','#2e3b30','#e8d6a8']),
];
// ---- folha (recorte por alpha) e lâmina de grama ----
const T_LEAF = (()=>{
  const c = cnv(128), g = c.getContext('2d');
  g.clearRect(0,0,128,128);
  const grd = g.createLinearGradient(0,0,128,0);
  grd.addColorStop(0, '#d8e6c8'); grd.addColorStop(0.5, '#ffffff'); grd.addColorStop(1, '#cfdcbf');
  g.fillStyle = grd;
  g.beginPath(); g.moveTo(64, 4);
  g.bezierCurveTo(118, 34, 106, 98, 64, 124);
  g.bezierCurveTo(22, 98, 10, 34, 64, 4); g.fill();
  g.strokeStyle = 'rgba(90,110,60,.6)'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(64,10); g.lineTo(64,120); g.stroke();
  g.lineWidth = 1.2;
  for(let i=0;i<5;i++){ const y = 30 + i*18;
    g.beginPath(); g.moveTo(64,y); g.lineTo(40,y-12); g.moveTo(64,y); g.lineTo(88,y-12); g.stroke(); }
  const t = tex(c, true); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
})();

// ------------------------------------------------------------
//  AO "assada": gradientes verticais (rodapé/teto) via uv1 = altura do mundo
//  e mapas por cômodo no piso/forro (cantos + pegada dos móveis).
//  aoMap só atenua a luz INDIRETA — sol e lâmpadas continuam diretos.
// ------------------------------------------------------------
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t*t*(3-2*t); };
function verticalAO(fn){
  const c = cnv(4, 512), g = c.getContext('2d');
  for(let py=0;py<512;py++){
    const y = (1 - py/511)*4 - 1;                // uv1.y = (y+1)/4  (flipY: topo do canvas = v 1)
    g.fillStyle = gray(fn(y)*255); g.fillRect(0, py, 4, 1);
  }
  const t = tex(c, false); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.channel = 1;
  return t;
}
const AO_WALL = verticalAO(y=> y < 0 ? 1 : y < 0.45 ? 0.58 + 0.42*smooth(y/0.45)
                         : y < 2.38 ? 1 : y <= H ? 1 - 0.30*smooth((y-2.38)/(H-2.38)) : 1);
const AO_SALA = verticalAO(y=> y < 0 ? 1 : y < 0.45 ? 0.58 + 0.42*smooth(y/0.45)
                         : y < H_SALA-0.32 ? 1 : y <= H_SALA ? 1 - 0.30*smooth((y-H_SALA+0.32)/0.32) : 1);
const AO_EXT  = verticalAO(y=> y < 0 ? 1 : y < 0.45 ? 0.62 + 0.38*smooth(y/0.45) : 1);   // fachada: só o pé
const AO_OBJ  = verticalAO(y=> y < -0.05 ? 1 : y < 0.32 ? 0.68 + 0.32*smooth((y+0.05)/0.37) : 1);

// ============================================================
//  CÉU (equiretangular com sol) + IBL
// ============================================================
const SUN_DIR = new THREE.Vector3(-16, 19, -17).normalize();
const skyTex = (()=>{
  const W = HQ ? 2048 : 1024, Hh = W/2, c = cnv(W, Hh), g = c.getContext('2d');
  const grd = g.createLinearGradient(0,0,0,Hh);
  grd.addColorStop(0.00, '#2c66ad'); grd.addColorStop(0.28, '#5e95cf');
  grd.addColorStop(0.46, '#b9d2e6'); grd.addColorStop(0.500,'#e6ecee');
  grd.addColorStop(0.505,'#a69b86'); grd.addColorStop(0.62, '#867b66'); grd.addColorStop(1, '#5a5245');
  g.fillStyle = grd; g.fillRect(0,0,W,Hh);
  for(let i=0;i<60;i++){                                   // cúmulos achatados perto do horizonte
    const y = rnd(0.10, 0.47)*Hh, x = Math.random()*W, f = 1 - y/(Hh*0.5);
    const rx = rnd(30,140)*(W/2048)*(1.4-f*0.6), ry = rx*rnd(0.18,0.35)*(0.4+f);
    const cg = g.createRadialGradient(x,y,0,x,y,rx);
    cg.addColorStop(0, 'rgba(255,255,255,'+rnd(0.25,0.55).toFixed(2)+')'); cg.addColorStop(1, 'rgba(255,255,255,0)');
    g.save(); g.translate(x,y); g.scale(1, ry/rx); g.translate(-x,-y);
    g.fillStyle = cg; g.beginPath(); g.arc(x,y,rx,0,7); g.fill(); g.restore();
  }
  const u = Math.atan2(SUN_DIR.z, SUN_DIR.x)/(2*Math.PI) + 0.5, v = Math.asin(SUN_DIR.y)/Math.PI + 0.5;
  const sx = u*W, sy = (1-v)*Hh;
  for(const ox of [-W, 0, W]){
    const sg = g.createRadialGradient(sx+ox,sy,0,sx+ox,sy,W*0.09);
    sg.addColorStop(0, 'rgba(255,248,226,.95)'); sg.addColorStop(0.08, 'rgba(255,240,205,.55)');
    sg.addColorStop(1, 'rgba(255,240,205,0)');
    g.fillStyle = sg; g.fillRect(sx+ox-W*0.09, sy-W*0.09, W*0.18, W*0.18);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
})();
scene.background = skyTex;
let hasIBL = false;
try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(skyTex).texture;
  pmrem.dispose();
  hasIBL = true;
} catch(e){ /* sem IBL, as luzes diretas compensam */ }

// ------------------------------------------------------------
//  LUZES — sol com sombra + hemisfério baixo (o grosso do difuso vem do IBL/sondas)
// ------------------------------------------------------------
const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x7a6c58, hasIBL ? 0.22 : 1.1);
scene.add(hemi);
scene.add(new THREE.AmbientLight(0xffffff, hasIBL ? 0.03 : 0.35));
const sun = new THREE.DirectionalLight(0xfff0d8, 2.7);
sun.target.position.set(5, 0, 5);           // centro entre a casa e a rua
sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 30);
scene.add(sun); scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(HQ ? 4096 : 2048, HQ ? 4096 : 2048);
// cobre o lote, a rua e os vizinhos imediatos (sombra das casas vizinhas na rua)
sun.shadow.camera.left = -24; sun.shadow.camera.right = 24;
sun.shadow.camera.top  =  27; sun.shadow.camera.bottom = -27;
sun.shadow.camera.near = 5;   sun.shadow.camera.far = 60;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 3;

// ------------------------------------------------------------
//  MATERIAIS (PBR)
// ------------------------------------------------------------
const std = o => new THREE.MeshStandardMaterial(o);
const withSet = (set, o) => Object.assign({ map:set.map, normalMap:set.normalMap || null,
  roughnessMap:set.roughnessMap || null }, o);

const matWall    = std(withSet(T_PLASTER, { roughness:0.92, normalScale:new THREE.Vector2(0.5,0.5), aoMap:AO_WALL }));
const matWallSala= matWall.clone(); matWallSala.aoMap = AO_SALA;                           // sombra do teto a 3,20
const matExt     = std(withSet(T_EXT,     { roughness:0.95, aoMap:AO_EXT }));
const matTileWall= std(withSet(T_BATHWL,  { roughness:1.0,  aoMap:AO_WALL }));
const matKids    = std({ map:T_KIDS, roughness:0.85, aoMap:AO_WALL });
const matMuro    = std(withSet(T_MURO,    { roughness:0.97, aoMap:AO_WALL }));
const matGable   = std(withSet(T_EXT,     { roughness:0.95, side:THREE.DoubleSide }));
const matTrim    = std({ color:0xf6f3ec, roughness:0.40, metalness:0.0, aoMap:AO_OBJ });   // rodapé/batente/caixilho
const matGlass   = std({ color:0xd6eef8, roughness:0.03, metalness:0.0, transparent:true, opacity:0.16,
                         envMapIntensity:1.6, side:THREE.DoubleSide, depthWrite:false });
const matRoof    = std(withSet(T_ROOF,    { roughness:0.78 }));
const matRidge   = std({ color:0x9a4f31, roughness:0.75 });
const matSoffit  = std({ color:0xeee8dc, roughness:0.8 });
const matWood    = std(withSet(T_OAK,     { roughness:0.55, aoMap:AO_OBJ }));
const matWoodDk  = std(withSet(T_WALNUT,  { roughness:0.50, aoMap:AO_OBJ }));
const matDoor    = std(withSet(T_OAK,     { color:0xf2e6d4, roughness:0.45, aoMap:AO_OBJ }));
const matCabinet = std({ color:0xf1eee8, roughness:0.32, metalness:0.0, aoMap:AO_OBJ });   // laca branca
const matWhite   = std({ color:0xf7f7f4, roughness:0.08, metalness:0.0, aoMap:AO_OBJ });  // louça vitrificada
const matMetal   = std({ color:0xdfe3e8, roughness:0.12, metalness:1.0 });                 // cromado
const matSteel   = std(withSet(T_BRUSH,   { roughness:1.0, metalness:0.9, aoMap:AO_OBJ })); // inox escovado
const matDark    = std({ color:0x26292d, roughness:0.45, metalness:0.1, aoMap:AO_OBJ });
const matBlack   = std({ color:0x08090b, roughness:0.08, metalness:0.0 });                 // tela desligada
const matScreen  = std({ color:0x0c1520, roughness:0.15, emissive:0x6fa6d6, emissiveIntensity:0.55 });
const matCar     = new THREE.MeshPhysicalMaterial({ color:0x8c1d22, metalness:0.55, roughness:0.32,
                                                    clearcoat:1.0, clearcoatRoughness:0.04 });
const fabric = (c, o)=> std(withSet(T_FABRIC, Object.assign({ color:c, roughness:0.95, aoMap:AO_OBJ }, o)));
const matSofa    = fabric(0x485b6d);
const matCush    = fabric(0x3c4f61);
const matThrow   = fabric(0xc8734f);
const matBed     = fabric(0xf2f1ec);
const matSheet   = fabric(0xc6d1dd);
const matHead    = fabric(0x5d5249);
const matChairF  = fabric(0x8a8378);
const matCurtain = fabric(0xe8e0d0, { side:THREE.DoubleSide });
const matBlackout= fabric(0x7c8288, { side:THREE.DoubleSide });
const matKidCurt = fabric(0xa9cbe8, { side:THREE.DoubleSide });
const matGranite = std(withSet(T_GRANITE, { roughness:0.14, metalness:0.0, aoMap:AO_OBJ }));
const matSill    = std(withSet(T_GRANITE, { color:0xd8d2c8, roughness:0.25 }));            // soleira cinza-andorinha
const matMirror  = std({ color:0xffffff, roughness:0.02, metalness:1.0 });
const matStone   = std(withSet(T_STONE,   { roughness:0.9 }));
const matConcBox = std(withSet(T_CONC,    { roughness:1.0, aoMap:AO_OBJ }));
const matBrick   = std(withSet(T_BRICK,   { roughness:0.92, aoMap:AO_OBJ }));
const matSubway  = std(withSet(T_SUBWAY,  { roughness:1.0 }));
const matLamp    = std({ color:0xfff6e2, emissive:0xffe2b0, emissiveIntensity:2.2, roughness:0.4 });
const matTrunk   = std({ color:0x5d4330, roughness:0.95, aoMap:AO_OBJ });
const matPot     = std({ color:0xb8653d, roughness:0.85, aoMap:AO_OBJ });
const matSoil    = std({ color:0x3e3024, roughness:1.0 });
const matTire    = std({ color:0x18191b, roughness:0.9 });
const matRope    = std({ color:0xdad4c6, roughness:0.9 });
const matArt     = T_ART.map(t=> std({ map:t, roughness:0.6 }));
const BOOKS = [0x8a3b32, 0x2f5d7c, 0xc9a24a, 0x3f6b46, 0x6b4d7a, 0xd8d0c0, 0x2b2f36]
  .map(c=> std({ color:c, roughness:0.7, aoMap:AO_OBJ }));

// ============================================================
//  GEOMETRIA — caixas com UV em METROS e quinas arredondadas
// ============================================================
// BoxGeometry: faces px,nx (prof × alt), py,ny (larg × prof), pz,nz (larg × alt)
function meterUV(g, sx, sy, sz){
  const p = g.parameters, uv = g.attributes.uv;
  const faces = [[sz,sy,p.depthSegments,p.heightSegments],[sz,sy,p.depthSegments,p.heightSegments],
                 [sx,sz,p.widthSegments,p.depthSegments],[sx,sz,p.widthSegments,p.depthSegments],
                 [sx,sy,p.widthSegments,p.heightSegments],[sx,sy,p.widthSegments,p.heightSegments]];
  let o = 0;
  for(const [U,V,a,b] of faces){
    const n = (a+1)*(b+1);
    for(let i=0;i<n;i++) uv.setXY(o+i, uv.getX(o+i)*U, uv.getY(o+i)*V);
    o += n;
  }
  uv.needsUpdate = true;
  return g;
}
// caixa arredondada (mesmo algoritmo do RoundedBoxGeometry dos exemplos do three)
function roundedBox(sx, sy, sz, r, seg){
  const n = seg*2 + 1;
  const g = new THREE.BoxGeometry(1, 1, 1, n, n, n);
  const pos = g.attributes.position, nor = g.attributes.normal;
  const bx = sx/2 - r, by = sy/2 - r, bz = sz/2 - r, half = 0.5/n;
  const v = new THREE.Vector3();
  for(let i=0;i<pos.count;i++){
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    v.set(x - Math.sign(x)*half, y - Math.sign(y)*half, z - Math.sign(z)*half).normalize();
    pos.setXYZ(i, bx*Math.sign(x) + v.x*r, by*Math.sign(y) + v.y*r, bz*Math.sign(z) + v.z*r);
    nor.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = nor.needsUpdate = true;
  return meterUV(g, sx, sy, sz);
}
const _geo = {};
function boxGeo(sx, sy, sz, r, seg){
  r = Math.min(r || 0, sx/2, sy/2, sz/2) - 0.0002;
  if(r < 0.0015){ r = 0; seg = 0; }
  seg = seg || 1;
  const k = sx.toFixed(3)+'|'+sy.toFixed(3)+'|'+sz.toFixed(3)+'|'+r.toFixed(4)+'|'+seg;
  return _geo[k] || (_geo[k] = r ? roundedBox(sx, sy, sz, r, seg) : meterUV(new THREE.BoxGeometry(sx,sy,sz), sx, sy, sz));
}

const world = new THREE.Group();
scene.add(world);

// colisores AABB no plano XZ
const colliders = [];
function addCollider(minx,maxx,minz,maxz){ colliders.push({minx,maxx,minz,maxz}); }
// pegadas no chão (alimentam a AO de contato dos pisos)
const footprints = [];
function addFoot(x0,x1,z0,z1,h){ if(h > 0.04 && (x1-x0) > 0.012 && (z1-z0) > 0.012) footprints.push({x0,x1,z0,z1,h}); }

function box(cx,cy,cz,sx,sy,sz,mat,collide,r,seg){
  const m = new THREE.Mesh(boxGeo(sx,sy,sz,r,seg), mat);
  m.position.set(cx,cy,cz);
  m.castShadow = true; m.receiveShadow = true;
  world.add(m);
  if(collide) addCollider(cx-sx/2, cx+sx/2, cz-sz/2, cz+sz/2);
  if(cy - sy/2 < 0.12 && cy + sy/2 > 0.02) addFoot(cx-sx/2, cx+sx/2, cz-sz/2, cz+sz/2, cy+sy/2);
  return m;
}

// cômodo (chave da sonda) que contém o ponto, com tolerância "margin"
function roomKeyAt(x, z, margin){
  let best = null, bd = 1e9;
  for(const r of INDOOR){
    const d = Math.max(r.x0-x, 0, x-r.x1, r.z0-z, z-r.z1);
    if(d <= margin && d < bd){ bd = d; best = r.k; }
  }
  return best ? PROBE[best] : null;
}

// ============================================================
//  PAREDES — cada face é uma meia-parede com o material do lado em que está
//  (reboco, azulejo, papel infantil ou fachada), cortada nos limites de cômodo
//  pra cada pedaço pegar a sonda de luz certa. Rodapé, batente, caixilho,
//  peitoril e soleira saem sozinhos.
// ============================================================
const WALL_Y0 = -0.12;
const BB_H = 0.10, BB_P = 0.014;   // rodapé: altura e saliência
const FR_P = 0.025, FR_W = 0.06;   // batente/caixilho: saliência e largura

function buildWall(x0,z0,x1,z1,h,ops,yb){
  const Y0 = yb === undefined ? WALL_Y0 : yb;
  const horiz = (x1-x0) >= (z1-z0);
  const len  = horiz ? x1-x0 : z1-z0;
  const base = horiz ? x0 : z0;
  const T    = horiz ? z1-z0 : x1-x0;
  const mid  = horiz ? (z0+z1)/2 : (x0+x1)/2;
  const house = h > 2.5;
  const cuts = house ? [...new Set(INDOOR.flatMap(r=> horiz ? [r.x0, r.x1] : [r.z0, r.z1]))]
    .map(v=> v-base).filter(v=> v > 0.01 && v < len-0.01).sort((a,b)=>a-b) : [];

  function piece(s,e,y0,y1,mat,collide,thick,off,room,shadow){
    if(e-s <= 0.002 || y1-y0 <= 0.002) return;
    const c = (s+e)/2, L = e-s, cy = (y0+y1)/2, sy = y1-y0, th = thick === undefined ? T : thick;
    const cross = mid + (off || 0);
    let cx,cz,sx,sz;
    if(horiz){ cx=base+c; cz=cross; sx=L; sz=th; } else { cz=base+c; cx=cross; sz=L; sx=th; }
    const m = new THREE.Mesh(boxGeo(sx,sy,sz), mat);
    m.position.set(cx,cy,cz);
    m.castShadow = shadow !== false; m.receiveShadow = true;
    if(room !== undefined) m.userData.room = room;
    world.add(m);
    if(collide && y0 < 1.7 && y1 > 0.15) addCollider(cx-sx/2,cx+sx/2,cz-sz/2,cz+sz/2);
  }
  const sideRoom = (sc, side)=>{
    const a = base + sc, b = mid + side*T/4;
    return horiz ? roomKeyAt(a, b, 0.12) : roomKeyAt(b, a, 0.12);
  };
  const matFor = room => room === null ? matExt
    : (room === 'wcsocial' || room === 'wcsuite') ? matTileWall
    : room === 'dorm2' ? matKids : room === 'sestar' ? matWallSala : matWall;
  // pedaço de parede dentro do bloco da sala -> sobe até H_SALA
  const tallAt = sc => house && (horiz ? inSala(base+sc, mid) : inSala(mid, base+sc));
  // alvenaria: duas meias-paredes (uma por face), cortadas nos limites de cômodo.
  // y1 === 'top' = até o topo da parede (H ou H_SALA, conforme o pedaço).
  function slab(s, e, y0, y1, collide, skirt){
    if(!house){ piece(s, e, y0, y1 === 'top' ? h : y1, matMuro, collide, T, 0, null); return; }
    const pts = [s, ...cuts.filter(c=> c > s+0.005 && c < e-0.005), e];
    for(let i=0;i<pts.length-1;i++){
      const a = pts[i], b = pts[i+1];
      const top = y1 === 'top' ? (tallAt((a+b)/2) ? H_SALA : h) : y1;
      for(const side of [-1, 1]){
        const room = sideRoom((a+b)/2, side);
        if(top > h + 0.01 && room !== 'sestar'){
          // lado de fora da sala: até o forro do cômodo vizinho é parede dele,
          // acima disso fica exposto por cima do telhado vizinho -> acabamento de fachada
          piece(a, b, y0, h, matFor(room), collide, T/2, side*T/4, room);
          piece(a, b, Math.max(y0, h), top, matExt, false, T/2, side*T/4, null);
        } else piece(a, b, y0, top, matFor(room), collide, T/2, side*T/4, room);
        if(skirt && room && room !== 'wcsocial' && room !== 'wcsuite')
          piece(a, b, 0.004, BB_H, matTrim, false, BB_P, side*(T/2+BB_P/2), room, false);
      }
    }
  }
  // canto arredondado de um vão (quarto de círculo vazado), uma peça por face da parede
  function archCorner(o, left){
    if(!horiz) return;                        // só usado em parede paralela a x
    const r = o.arch, yT = o.y1;
    const u = base + (left ? o.s : o.e);      // face do vão, em x de mundo
    const sh = new THREE.Shape();
    if(left){
      sh.moveTo(u, yT - r); sh.lineTo(u, yT + 0.002); sh.lineTo(u + r, yT + 0.002);
      sh.absarc(u + r, yT - r, r, Math.PI/2, Math.PI, false);
    } else {
      sh.moveTo(u, yT - r); sh.lineTo(u, yT + 0.002); sh.lineTo(u - r, yT + 0.002);
      sh.absarc(u - r, yT - r, r, Math.PI/2, 0, true);
    }
    for(const side of [-1, 1]){
      const room = sideRoom(left ? o.s + 0.05 : o.e - 0.05, side);
      const g = new THREE.ExtrudeGeometry(sh, { depth:T/2, bevelEnabled:false, curveSegments:16 });
      const m = new THREE.Mesh(g, matFor(room));
      m.position.z = mid + (side < 0 ? -T/2 : 0);
      m.castShadow = m.receiveShadow = true;
      m.userData.room = room;
      world.add(m);
    }
  }

  const norm = (ops||[]).map(o=>{
    const c = o.at - base;
    return { s:Math.max(0,c-o.w/2), e:Math.min(len,c+o.w/2), y0:o.y0, y1:o.y1, glass:!!o.glass, arch:o.arch||0 };
  }).sort((a,b)=>a.s-b.s);

  // Anti-z-fighting (BUILD 19): batente/caixilho avançam 3 mm pra dentro do vão e
  // descem 3 mm abaixo da verga, cobrindo a face da alvenaria em vez de dividir o
  // mesmo plano com ela; soleira fica 7 mm acima do piso (antes era 1 mm = piscava).
  const IN = 0.003, SOL = 0.012;
  let cur = 0;
  for(const o of norm){
    slab(cur, o.s, Y0, 'top', true, true);
    if(o.y0 > 0.002) slab(o.s, o.e, Y0, o.y0, true, false);         // peitoril
    slab(o.s, o.e, o.y1, 'top', false, false);                      // verga

    if(o.glass && o.y0 > 0.002){
      // JANELA de correr: duas folhas com caixilho, marco, peitoril de granito
      const mx = (o.s+o.e)/2;
      piece(o.s, o.e, o.y0, o.y1, matGlass, true, 0.008, -0.025);
      piece(o.s, o.e, o.y0, o.y1, matGlass, false, 0.008, 0.025);
      piece(o.s-FR_W, o.s+IN, o.y0-0.03, o.y1+0.03, matTrim, false, T+2*FR_P, 0, undefined, false);
      piece(o.e-IN, o.e+FR_W, o.y0-0.03, o.y1+0.03, matTrim, false, T+2*FR_P, 0, undefined, false);
      piece(o.s-FR_W, o.e+FR_W, o.y1-IN, o.y1+0.05, matTrim, false, T+2*FR_P, 0, undefined, false);
      piece(o.s-0.06, o.e+0.06, o.y0-0.03, o.y0+0.004, matSill, false, T+0.08, 0, undefined, false);
      piece(o.s+IN, o.e-IN, o.y0+0.004, o.y0+0.035, matTrim, false, 0.09, 0, undefined, false); // trilho
      piece(mx-0.025, mx+0.025, o.y0+0.035, o.y1-0.035, matTrim, false, 0.075, 0, undefined, false);
      piece(o.s+IN, o.e-IN, o.y1-0.035, o.y1-IN, matTrim, false, 0.09, 0, undefined, false);
    } else if(o.glass){
      // porta-janela de correr
      const mx = (o.s+o.e)/2;
      piece(o.s, o.e, SOL, o.y1, matGlass, true, 0.008, -0.025);
      piece(o.s, o.e, SOL, o.y1, matGlass, false, 0.008, 0.025);
      piece(o.s-FR_W, o.s+IN, 0, o.y1+0.03, matTrim, false, T+2*FR_P, 0, undefined, false);
      piece(o.e-IN, o.e+FR_W, 0, o.y1+0.03, matTrim, false, T+2*FR_P, 0, undefined, false);
      piece(o.s-FR_W, o.e+FR_W, o.y1-IN, o.y1+0.05, matTrim, false, T+2*FR_P, 0, undefined, false);
      piece(mx-0.03, mx+0.03, 0.04, o.y1-IN, matTrim, false, 0.075, 0, undefined, false);
      piece(o.s+IN, o.e-IN, SOL, 0.04, matTrim, false, 0.09, 0, undefined, false);
      piece(o.s, o.e, WALL_Y0, SOL, matSill, false, T, 0, undefined, false);
    } else if(house){
      piece(o.s, o.e, WALL_Y0, SOL, matSill, false, T, 0, undefined, false);             // soleira
      if(o.arch){
        archCorner(o, true); archCorner(o, false);
      } else if(o.e-o.s < 2.6){
        piece(o.s-FR_W, o.s+IN, 0, o.y1+FR_W, matTrim, false, T+2*FR_P, 0, undefined, false);
        piece(o.e-IN, o.e+FR_W, 0, o.y1+FR_W, matTrim, false, T+2*FR_P, 0, undefined, false);
        piece(o.s-FR_W, o.e+FR_W, o.y1-IN, o.y1+FR_W, matTrim, false, T+2*FR_P, 0, undefined, false);
      }
    }
    cur = o.e;
  }
  slab(cur, len, Y0, 'top', true, true);
}

for(const w of WALLS) buildWall(w[0],w[1],w[2],w[3],w[4],w[5],w[6]);

// ============================================================
//  PISOS / FORROS / TERRENO
// ============================================================
// laje-base do lote, bem abaixo de todos os pisos (a rampa começa em -0.30)
box(5, -0.65, 10, 10, 0.50, 20, matConcBox, false);

// quadrilátero com 4 alturas (rampa, calçada inclinada, rua). UV em metros.
function quad(x0,z0,x1,z1, y00,y10,y01,y11, mat){
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    x0,y00,z0,  x1,y10,z0,  x0,y01,z1,  x1,y11,z1 ], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([ x0,z0, x1,z0, x0,z1, x1,z1 ], 2));
  g.setIndex([0,2,1, 1,2,3]);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true; world.add(mesh);
  return mesh;
}
// Calçada: -0,02 no canto oeste, -0,30 no portão da garagem, -0,75 no portão social,
// -1,10 no canto leste -> rampa quase linear ao longo de x.
const sideY = x => -0.02 - 0.108*x;
const CALC = 2.00;
const matCalc = std(withSet(T_CONC, { color:0xe4dfd4, roughness:1.0 }));

// ============================================================
//  RUA (BUILD 20): leito de 7 m em asfalto gasto (remendos, trincas, manchas
//  de óleo), sarjetas, guias de 15 cm, calçadas de concreto com juntas nos
//  dois lados, faixa amarela tracejada. Tudo acompanha o declive (sideY).
// ============================================================
const roadY = x => sideY(x) - 0.15;
const ST_Z0 = -9.0, OPP_Z = -11.0;           // borda do leito do outro lado · alinhamento dos lotes da frente
const RX0 = -130, RX1 = 140;                 // extensão modelada da rua (a névoa engole o resto)
const T_ROAD = pbr(TB, 12, (g, gh, gr, s)=>{
  g.fillStyle = '#46494d'; g.fillRect(0,0,s,s);
  gr.fillStyle = gray(220); gr.fillRect(0,0,s,s);
  blotches(g, s, 60, 0.02, 0.10, ()=> gray(rnd(40,95), rnd(0.10,0.25)));
  for(let i=0;i<12;i++){                                     // remendos
    const x = Math.random()*s, y = Math.random()*s, w = rnd(0.03,0.12)*s, h = rnd(0.03,0.09)*s, v = Math.random() < 0.5 ? 50 : 84;
    wrapRect(s, x, y, w, h, (X,Y,W,Hh)=>{
      g.fillStyle = gray(v, 0.9); g.fillRect(X,Y,W,Hh);
      gh.strokeStyle = gray(50); gh.lineWidth = 2*px(s); gh.strokeRect(X,Y,W,Hh);
    });
  }
  specks(g, s, 30000, 0.4*px(s)*2, 1.6*px(s)*2, ()=> gray(rnd(40,150), 0.55));     // agregado
  specks(gh, s, 30000, 0.4*px(s)*2, 1.6*px(s)*2, ()=> gray(rnd(40,230), 0.6));
  for(let i=0;i<30;i++){                                     // trincas
    let x = Math.random()*s, y = Math.random()*s;
    g.strokeStyle = 'rgba(20,20,22,.7)'; gh.strokeStyle = gray(10);
    g.lineWidth = gh.lineWidth = rnd(1, 2.5)*px(s);
    g.beginPath(); gh.beginPath(); g.moveTo(x,y); gh.moveTo(x,y);
    for(let k=0;k<8;k++){ x += rnd(-30,30)*px(s); y += rnd(-30,30)*px(s); g.lineTo(x,y); gh.lineTo(x,y); }
    g.stroke(); gh.stroke();
  }
  blotches(g, s, 14, 0.008, 0.03, ()=> 'rgba(12,12,15,.40)');   // manchas de óleo
  blotches(gr, s, 40, 0.02, 0.10, ()=> gray(rnd(150,240), 0.3));
}, 1.6, true);
const T_SIDE = pbr(TS, 1.5, (g, gh, gr, s)=>{
  g.fillStyle = '#cdc7bb'; g.fillRect(0,0,s,s);
  blotches(g, s, 40, 0.04, 0.2, ()=> gray(rnd(150,215), 0.08));
  specks(g, s, 5000, 0.5, 1.4*px(s)*2, ()=> gray(rnd(100,190), 0.35));
  specks(gh, s, 5000, 0.5, 1.4*px(s)*2, ()=> gray(rnd(40,220), 0.5));
  const j = Math.max(2, 5*px(s)*2);                          // junta de dilatação a cada 1,50
  g.fillStyle = 'rgba(70,66,60,.75)'; g.fillRect(0,0,s,j); g.fillRect(0,0,j,s);
  gh.fillStyle = gray(20); gh.fillRect(0,0,s,j); gh.fillRect(0,0,j,s);
  blotches(g, s, 8, 0.03, 0.1, ()=> 'rgba(60,55,45,.12)');
}, 2.0, false);
// chapa/lambri vertical de portão (cinza claro: a cor vem do material)
const T_GATE = pbr(TS, 1.0, (g, gh, gr, s)=>{
  const n = 10, w = s/n;
  for(let i=0;i<n;i++){
    const gg = g.createLinearGradient(i*w,0,(i+1)*w,0);
    gg.addColorStop(0, gray(150)); gg.addColorStop(0.5, gray(228)); gg.addColorStop(1, gray(165));
    g.fillStyle = gg; g.fillRect(i*w, 0, w, s);
    const hh = gh.createLinearGradient(i*w,0,(i+1)*w,0);
    hh.addColorStop(0, gray(40)); hh.addColorStop(0.15, gray(200)); hh.addColorStop(0.85, gray(200)); hh.addColorStop(1, gray(40));
    gh.fillStyle = hh; gh.fillRect(i*w, 0, w, s);
  }
}, 2.5, false);
const decal = m => Object.assign(m, { polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 });
const matSide   = std(withSet(T_SIDE, { roughness:0.95 }));
const matCurb   = std(withSet(T_CONC, { color:0xdcd7cd, roughness:1.0, side:THREE.DoubleSide }));
const matRoad   = std(withSet(T_ROAD, { roughness:1.0 }));
const matGutter = decal(std(withSet(T_CONC, { color:0xc2bdb2, roughness:1.0 })));
const matPaint  = decal(std({ color:0xd5ae3a, roughness:0.75 }));
const flat = (x0,z0,x1,z1,yf,mat)=> quad(x0,z0,x1,z1, yf(x0),yf(x1),yf(x0),yf(x1), mat);
flat(RX0,-CALC, RX1,0, sideY, matSide);                                        // nossa calçada
flat(RX0,OPP_Z, RX1,ST_Z0, sideY, matSide);                                    // calçada da frente
quad(RX0,-CALC-0.001, RX1,-CALC-0.001, sideY(RX0),sideY(RX1),roadY(RX0),roadY(RX1), matCurb);   // guias
quad(RX0,ST_Z0+0.001, RX1,ST_Z0+0.001, sideY(RX0),sideY(RX1),roadY(RX0),roadY(RX1), matCurb);
flat(RX0,ST_Z0, RX1,-CALC, roadY, matRoad);                                    // asfalto
flat(RX0,-CALC-0.30, RX1,-CALC, x=> roadY(x)+0.002, matGutter);                // sarjetas
flat(RX0,ST_Z0, RX1,ST_Z0+0.30, x=> roadY(x)+0.002, matGutter);
for(let x = RX0; x < RX1; x += 6) flat(x, -5.56, x+3, -5.44, x=> roadY(x)+0.003, matPaint);
// terreno além da área modelada (fica por baixo de tudo)
flat(-500,-500, 500,500, x=> sideY(x)-0.45, std(withSet(T_GROUND, { roughness:1.0 })));

// pisos por cômodo — material definitivo (com AO) é montado depois dos móveis
const FLOORSET = {
  wood    : { set:T_WOOD,  rough:1.0 },
  tile    : { set:T_BATHFL,rough:1.0 },
  tileBig : { set:T_PORC,  rough:1.0 },
  concrete: { set:T_CONC,  rough:1.0, color:0xd6d2c8 },
  grass   : { set:T_GROUND,rough:1.0 },
};
function floorGeo(w, d){
  const g = new THREE.PlaneGeometry(w, d), uv = g.attributes.uv;
  g.setAttribute('uv1', uv.clone());                       // 0..1 -> mapa de AO do cômodo
  for(let i=0;i<uv.count;i++) uv.setXY(i, uv.getX(i)*w, uv.getY(i)*d);   // metros
  return g;
}
const floorMeshes = [], ceilMeshes = [], lampSpots = [];
for(const r of ROOMS){
  const w = r.x1-r.x0, d = r.z1-r.z0, f = FLOORSET[r.f];
  if(r.slope){
    const [ya, yb] = r.slope;
    const m = quad(r.x0,r.z0, r.x1,r.z1, ya+0.005,ya+0.005, yb+0.005,yb+0.005,
      std(withSet(f.set, { color:f.color || 0xffffff, roughness:f.rough })));
    m.userData.noMerge = true;
    continue;
  }
  const floor = new THREE.Mesh(floorGeo(w, d), matCalc);
  floor.rotation.x = -Math.PI/2;
  floor.position.set((r.x0+r.x1)/2, r.fy + 0.005, (r.z0+r.z1)/2);
  floor.receiveShadow = true; floor.userData.noMerge = true;
  world.add(floor); floorMeshes.push({ mesh:floor, r });
  if(r.indoor){
    const ch = r.ch || CEIL;                 // pé-direito do cômodo (sala = 3,20)
    const ceil = new THREE.Mesh(floorGeo(w, d), matCalc);
    ceil.rotation.x = Math.PI/2;
    ceil.position.set((r.x0+r.x1)/2, ch-0.01, (r.z0+r.z1)/2);
    ceil.receiveShadow = true; ceil.userData.noMerge = true;
    world.add(ceil); ceilMeshes.push({ mesh:ceil, r });
    // plafon: aro + difusor leitoso
    const cx = (r.x0+r.x1)/2, cz = (r.z0+r.z1)/2;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,0.035,28), matTrim);
    ring.position.set(cx, ch-0.028, cz); world.add(ring);
    const dif = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.012,28), matLamp);
    dif.position.set(cx, ch-0.05, cz); world.add(dif);
    lampSpots.push(new THREE.Vector3(cx, ch-0.22, cz));
  }
}

// ============================================================
//  TELHADO DE DUAS ÁGUAS (telha cerâmica, 35%), cumeeira paralela à rua.
//  Beiral baixo de 0,80: a telha encosta no topo da parede (2,70) e desce até
//  2,42 na ponta — exatamente as "projeções de beiral" da planta.
//  Oitões (empenas) fecham as pontas sobre as paredes.
// ============================================================
const PITCH = 0.35, ROOF_T = 0.05;
// Cada água é definida pela CUMEEIRA (zc, yR); as pontas z0/z1 saem dela pela inclinação.
// Assim vários pedaços do mesmo telhado (cortados em x) mantêm a cumeeira contínua.
// BUILD 20: cada água = placa de telha + forro do beiral (2 malhas de material único,
// entram na fusão — antes era 1 malha multi-material = 6 draw calls por água).
function pitchedRoof(x0, x1, z0, z1, zc, yR, gables, gBase, gMat){
  const th = Math.atan(PITCH), c = Math.cos(th), s = Math.sin(th);
  const yS = yR - PITCH*(zc - z0), yN = yR - PITCH*(z1 - zc);
  const GB = gBase === undefined ? H : gBase;
  const xm = (x0+x1)/2, sx = x1-x0;
  const slope = (za, ya, zb, yb, sign)=>{
    const L = Math.hypot(zb-za, yb-ya), n = sign < 0 ? -s : s;
    for(const [mat, t, off] of [[matRoof, ROOF_T, ROOF_T/2], [matSoffit, 0.008, -0.006]]){
      const m = new THREE.Mesh(boxGeo(sx, t, L), mat);
      // normal da água: (0, cos, -sin) na água sul / (0, cos, +sin) na norte
      m.position.set(xm, (ya+yb)/2 + c*off, (za+zb)/2 + n*off);
      m.rotation.x = sign < 0 ? -th : th;
      m.castShadow = m.receiveShadow = true; m.userData.room = null;
      world.add(m);
    }
  };
  slope(z0, yS, zc, yR, -1);
  slope(zc, yR, z1, yN, +1);
  const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, sx, 12, 1, false, 0, Math.PI), matRidge);
  ridge.rotation.z = Math.PI/2; ridge.position.set(xm, yR + ROOF_T*0.6, zc);
  ridge.userData.room = null;
  world.add(ridge);
  // oitões: polígono convexo do topo da parede (H) até a face de baixo da telha
  const yAt = z => z <= zc ? yS + PITCH*(z - z0) : yN + PITCH*(z1 - z);
  for(const gb of gables){
    const pts = [[gb.za, GB], [gb.za, yAt(gb.za)]];
    if(gb.za < zc && zc < gb.zb) pts.push([zc, yR]);
    pts.push([gb.zb, yAt(gb.zb)], [gb.zb, GB]);
    const P = [], U = [], I = [];
    for(const [z,y] of pts){ P.push(gb.x, y, z); U.push(z, y); }
    for(let i=1;i<pts.length-1;i++) I.push(0, i, i+1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.setIndex(I); g.computeVertexNormals();
    const m = new THREE.Mesh(g, gMat || matGable); m.castShadow = m.receiveShadow = true;
    m.userData.room = null;
    world.add(m);
  }
}
// BUILD 19: o beiral só existe onde o lado de fora é área aberta. Onde o telhado
// encontra outro bloco da casa, a água termina na linha da parede (antes o beiral
// do miolo entrava dentro da sala, do escritório e da suíte, abaixo do forro).
// frente (Dorm.1): beiral de 0,80 sobre o jardim; ao norte termina na parede z 5,98 (a 2,70)
pitchedRoof(3.50, 6.51, 1.19, 5.98, 3.985, 3.398,
  [{x:4.30, za:1.99, zb:5.98}]);
// SALA: mesma geometria, 0,50 mais alta (pé-direito 3,20)
pitchedRoof(6.51, 10.00, 1.19, 5.98, 3.985, 3.898,
  [{x:10.00, za:1.99, zb:5.98}, {x:6.50, za:1.99, zb:5.98}], H_SALA);
// miolo (Dorm.02, WC social, cozinha): cumeeira contínua em z 8,07; beiral só sobre área aberta
const MZ = 8.07, MY = 3.4945;
pitchedRoof(0.70, 2.15, 5.00, 11.14, MZ, MY, [{x:1.50, za:5.80, zb:8.74}, {x:2.15, za:8.74, zb:10.34}]); // corredor
pitchedRoof(2.15, 4.30, 5.00, 10.34, MZ, MY, []);                                    // garagem ao sul, suíte ao norte
pitchedRoof(4.30, 6.35, 5.98, 10.34, MZ, MY, []);                                    // Dorm.1 ao sul, suíte ao norte
pitchedRoof(6.35, 10.00, 5.98, 11.14, MZ, MY, [{x:10.00, za:5.98, zb:10.34}]);       // sala ao sul, serviço ao norte
// fundos (suíte): ao sul encosta no miolo (z 10,34 a 2,70), beiral de 0,80 no quintal
pitchedRoof(1.35, 7.15, 10.34, 16.74, 13.14, 3.68,
  [{x:2.15, za:10.34, zb:15.94}, {x:6.35, za:10.34, zb:15.94}]);

// ============================================================
//  MOBÍLIA — TUDO EM TAMANHO REAL (medidas de catálogo)
// ============================================================
const BEV = 0.006;                     // chanfro padrão: pega luz na quina, como móvel de verdade
function furn(cx,cz,w,d,h,baseY,mat,collide,r,seg){
  return box(cx, baseY + h/2, cz, w, h, d, mat, collide, r === undefined ? BEV : r, seg);
}
// Peça "orientada": (nx,nz) = normal da FRENTE. u = ao longo da frente · v = profundidade (+ = frente)
function orient(cx, cz, nx, nz){
  return (u, v, su, sv, h, y, mat, col, r, seg)=> nz
    ? furn(cx+u, cz+v*nz, su, sv, h, y, mat, col, r, seg)
    : furn(cx+v*nx, cz+u, sv, su, h, y, mat, col, r, seg);
}

// ------------------------------------------------------------
//  HELPERS DE MODELAGEM — todos com Z em metros de MUNDO.
// ------------------------------------------------------------
function cyl(rt, rb, h, seg, mat, x, y, z, sx, sz){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  if(sx) m.scale.set(sx, 1, sz === undefined ? sx : sz);
  m.castShadow = true; m.receiveShadow = true; world.add(m);
  const r = Math.max(rt, rb) * (sx || 1);
  if(y - h/2 < 0.10 && r > 0.02) addFoot(x-r, x+r, z-r, z+r, y+h/2);
  return m;
}
function sph(r, mat, x, y, z, sy){
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat);
  m.position.set(x, y, z); if(sy) m.scale.y = sy;
  m.castShadow = true; m.receiveShadow = true; world.add(m); return m;
}

// ---- folhagem instanciada: folhas recortadas, cor variando por folha ----
const LEAVES = [];
function leaves(cx, cy, cz, rx, ry, rz, n, size, hue, light){
  hue = hue === undefined ? 0.27 : hue; light = light || 0.30;
  for(let i=0;i<n;i++){
    let x, y, z;
    do { x = rnd(-1,1); y = rnd(-1,1); z = rnd(-1,1); } while(x*x + y*y + z*z > 1);
    const shell = Math.pow(Math.hypot(x,y,z), 0.35);       // mais folhas perto da casca
    LEAVES.push({ x:cx + x*rx/shell*0.98, y:cy + y*ry/shell*0.98, z:cz + z*rz/shell*0.98,
      s: size*rnd(0.7, 1.3),
      c: new THREE.Color().setHSL(hue + rnd(-0.03,0.03), rnd(0.40,0.60), light*rnd(0.70,1.25)) });
  }
}
// ---- vaso com planta (s=1 -> ~0,85 de altura) ----
function plant(cx, mz, s){
  s = s || 1;
  cyl(0.14*s, 0.10*s, 0.30*s, 20, matPot, cx, 0.15*s, mz);
  cyl(0.13*s, 0.13*s, 0.012, 20, matSoil, cx, 0.29*s, mz);
  for(let i=0;i<5;i++){                                       // hastes
    const a = i*1.26, st = cyl(0.006, 0.008, 0.40*s, 5, matTrunk, cx + Math.cos(a)*0.04*s, 0.48*s, mz + Math.sin(a)*0.04*s);
    st.rotation.set(Math.sin(a)*0.25, 0, Math.cos(a)*0.25);
  }
  leaves(cx, 0.62*s, mz, 0.22*s, 0.22*s, 0.22*s, Math.round(110*s), 0.10*s, 0.29, 0.30);
}
// ---- arbusto e árvore ----
// (gy = cota do chão onde a planta nasce; padrão = quintal da casa)
function shrub(x, z, r, gy, dens){
  gy = gy === undefined ? -0.04 : gy;
  leaves(x, gy + r*0.75, z, r, r*0.75, r, Math.round(260*r/0.3*(dens || 1)), 0.075, 0.26, 0.28);
}
function tree(x, z, hgt, gy, dens){
  gy = gy === undefined ? -0.04 : gy;
  const s = hgt/3.2, N = (HQ ? 1 : 0.5) * (dens || 1);
  cyl(0.06*s, 0.09*s, hgt*0.55, 12, matTrunk, x, gy + hgt*0.275, z);
  [[0.5,0.6,0.2],[-0.45,0.65,-0.1],[0.1,0.7,-0.45]].forEach(([dx,dy,dz])=>{
    const b = cyl(0.025*s, 0.04*s, 0.75*s, 8, matTrunk, x+dx*0.35*s, gy + hgt*0.55+0.2*s, z+dz*0.35*s);
    b.rotation.set(dz*0.9, 0, -dx*0.9);
  });
  leaves(x, gy + hgt*0.76, z, 0.95*s, 0.70*s, 0.95*s, Math.round(1600*N*s), 0.11, 0.27, 0.27);
  leaves(x+0.45*s, gy + hgt*0.66, z+0.25*s, 0.55*s, 0.45*s, 0.55*s, Math.round(500*N*s), 0.11, 0.25, 0.30);
  leaves(x-0.40*s, gy + hgt*0.70, z+0.30*s, 0.50*s, 0.45*s, 0.50*s, Math.round(450*N*s), 0.11, 0.28, 0.25);
}

// cadeira de jantar estofada (assento 44×44 a 45, encosto até 90). (bx,bz) = lado do encosto
function chair(cx, mz, mat, bx, bz){
  const s = 0.44, sh = 0.45;
  furn(cx, mz, s, s, 0.06, sh-0.06, mat, false, 0.02, 2);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>
    furn(cx+a*0.19, mz+b*0.19, 0.035, 0.035, sh-0.06, 0, matWoodDk, false, 0.008));
  const ex = bx ? 0.04 : s, ez = bz ? 0.04 : s;
  furn(cx+bx*0.20, mz+bz*0.20, ex, ez, 0.45, sh, matWoodDk, false, 0.012);
  furn(cx+bx*0.175, mz+bz*0.175, bx?0.025:s-0.06, bz?0.025:s-0.06, 0.28, sh+0.12, mat, false, 0.01, 2);
}
// cadeira de escritório (assento a 47, encosto até 1,10). (bx,bz) = lado do encosto
function officeChair(cx, cz, bx, bz){
  for(let i=0;i<5;i++){ const a = i*Math.PI*2/5;
    const leg = furn(cx+Math.cos(a)*0.15, cz+Math.sin(a)*0.15, 0.30, 0.04, 0.03, 0.06, matDark, false, 0.01);
    leg.rotation.y = -a;
    cyl(0.025, 0.025, 0.05, 10, matDark, cx+Math.cos(a)*0.29, 0.025, cz+Math.sin(a)*0.29);
  }
  cyl(0.024, 0.024, 0.34, 12, matMetal, cx, 0.25, cz);
  furn(cx, cz, 0.48, 0.48, 0.08, 0.42, matCush, false, 0.035, 2);
  const ex = bx ? 0.07 : 0.46, ez = bz ? 0.07 : 0.46;
  furn(cx+bx*0.23, cz+bz*0.23, ex, ez, 0.56, 0.56, matCush, false, 0.03, 2);
  [-1,1].forEach(k=>{
    const ax = bz ? cx+k*0.25 : cx, az = bz ? cz : cz+k*0.25;
    furn(ax, az, bz?0.05:0.28, bz?0.28:0.05, 0.03, 0.66, matDark, false, 0.012);
    furn(ax, az, 0.03, 0.03, 0.18, 0.48, matDark, false, 0.008);
  });
}
// quadro na parede com passe-partout. (cx,mz) na face da parede; (nx,nz) = pra onde olha
function picture(cx, mz, w, h, y, nx, nz, art){
  furn(cx+nx*0.015, mz+nz*0.015, nz?w+0.06:0.03, nz?0.03:w+0.06, h+0.06, y, matWoodDk, false, 0.004);
  furn(cx+nx*0.031, mz+nz*0.031, nz?w:0.003, nz?0.003:w, h, y+0.03, matCabinet, false, 0);
  furn(cx+nx*0.034, mz+nz*0.034, nz?w-0.10:0.003, nz?0.003:w-0.10, h-0.10, y+0.08, art, false, 0);
}
// torneira (bica apontando pra (nx,nz))
function faucet(cx, mz, y, nx, nz){
  cyl(0.022, 0.026, 0.05, 16, matMetal, cx, y+0.025, mz);
  cyl(0.014, 0.014, 0.22, 14, matMetal, cx, y+0.13, mz);
  const sp = cyl(0.011, 0.011, 0.16, 12, matMetal, cx+nx*0.075, y+0.235, mz+nz*0.075);
  sp.rotation.set(nz*Math.PI/2, 0, -nx*Math.PI/2);
  cyl(0.011, 0.011, 0.05, 12, matMetal, cx+nx*0.15, y+0.215, mz+nz*0.15);
  furn(cx-nx*0.03, mz-nz*0.03, nz?0.012:0.08, nz?0.08:0.012, 0.012, y+0.20, matMetal, false, 0.004);
}
// Frente de armário: n portas + puxadores. (cx,mz) = FACE FRONTAL do móvel.
function cabDoors(cx, mz, w, h, y, n, nx, nz, mat){
  const dw = w/n;
  for(let i=0;i<n;i++){
    const off = -w/2 + dw*(i+0.5);
    const px_ = nz ? cx+off : cx, pz = nz ? mz : mz+off;
    furn(px_+nx*0.009, pz+nz*0.009, nz?dw-0.004:0.018, nz?0.018:dw-0.004, h-0.006, y+0.003, mat, false, 0.004);
    const hoff = (i < n/2 ? 1 : -1) * (dw/2 - 0.045);
    furn((nz?px_+hoff:px_)+nx*0.028, (nz?pz:pz+hoff)+nz*0.028, 0.014, 0.014, Math.min(0.18, h*0.4), y+h*0.40, matMetal, false, 0.004);
  }
}
// Gavetas empilhadas. (cx,mz) = FACE FRONTAL.
function drawers(cx, mz, w, h, y, n, nx, nz, mat){
  const dh = h/n;
  for(let i=0;i<n;i++){
    furn(cx+nx*0.009, mz+nz*0.009, nz?w-0.006:0.018, nz?0.018:w-0.006, dh-0.006, y+i*dh+0.003, mat, false, 0.004);
    furn(cx+nx*0.028, mz+nz*0.028, nz?Math.min(0.16,w*0.4):0.014, nz?0.014:Math.min(0.16,w*0.4), 0.014, y+i*dh+dh*0.62, matMetal, false, 0.004);
  }
}
// toalha dobrada numa barra
function towel(cx, mz, y, w, nx, nz, mat){
  furn(cx+nx*0.04, mz+nz*0.04, nz?w:0.018, nz?0.018:w, 0.018, y, matMetal, false, 0.006);
  [-1,1].forEach(k=> furn(cx+(nz?k*w/2:nx*0.02), mz+(nz?nz*0.02:k*w/2), 0.02, 0.02, 0.02, y, matMetal, false, 0.006));
  furn(cx+nx*0.045, mz+nz*0.045, nz?w*0.78:0.035, nz?0.035:w*0.78, 0.50, y-0.49, mat, false, 0.012, 2);
}
// estante aberta com livros. (cx,cz) = centro da carcaça; (nx,nz) = frente.
function bookcase(cx, cz, w, d, h, shelves, nx, nz){
  const P = orient(cx, cz, nx, nz);
  P(0, -d/2+0.008, w, 0.016, h, 0, matWood, true);
  P(-w/2+0.009, 0, 0.018, d, h, 0, matWood, false);
  P( w/2-0.009, 0, 0.018, d, h, 0, matWood, false);
  const gap = (h-0.018)/shelves;
  for(let i=0;i<=shelves;i++) P(0, 0, w-0.036, d-0.016, 0.018, i*gap, matWood, false);
  for(let i=0;i<shelves;i++){
    let u = -w/2 + 0.03, k = i*7 + 3;
    while(u < w/2 - 0.08){
      const bw = 0.022 + ((k*37)%5)*0.007, bh = Math.min(gap-0.04, 0.19 + ((k*13)%4)*0.03);
      P(u+bw/2, -0.015, bw, d*0.72, bh, i*gap+0.018, BOOKS[k%BOOKS.length], false, 0.003);
      u += bw + 0.002; k++;
      if(k % 11 === 0) u += 0.14;
    }
  }
}
// folha de porta aberta a 90°: dobradiça em (hx,hz), folha corre na direção (dx,dz)
function doorLeaf(hx, hz, dx, dz, w, h){
  const cx = hx + dx*w/2, cz = hz + dz*w/2;
  furn(cx, cz, dx ? w : 0.035, dz ? w : 0.035, h-0.01, 0.005, matDoor, false, 0.004);
  const kx = hx + dx*(w-0.075), kz = hz + dz*(w-0.075);
  [-1,1].forEach(side=>{
    const ox = dz ? side*0.045 : 0, oz = dx ? side*0.045 : 0;
    furn(kx+ox+dx*0.04, kz+oz+dz*0.04, dx?0.12:0.016, dz?0.12:0.016, 0.016, 1.04, matMetal, false, 0.006);
    furn(kx+ox*0.7, kz+oz*0.7, dx?0.05:0.012, dz?0.05:0.012, 0.05, 1.025, matMetal, false, 0.004);
  });
  [0.25, 1.85].forEach(y=> furn(hx+dx*0.005, hz+dz*0.005, 0.03, 0.03, 0.10, y, matMetal, false, 0.004)); // dobradiças
}
// cortina com pregas (seno), presa num varão. Paralela a x (axis 'x') ou a z.
const _curtGeo = {};
function curtain(a0, a1, c, axis, top, bottom, mat){
  const w = a1-a0, h = top-bottom, folds = Math.max(3, Math.round(w/0.09));
  const k = w.toFixed(2)+'|'+h.toFixed(2);
  let g = _curtGeo[k];
  if(!g){
    g = new THREE.PlaneGeometry(w, h, folds*6, 1);
    const p = g.attributes.position;
    for(let i=0;i<p.count;i++){ const x = p.getX(i);
      p.setZ(i, Math.sin((x/w + 0.5)*folds*Math.PI*2) * 0.032); }
    g.computeVertexNormals(); _curtGeo[k] = g;
  }
  const m = new THREE.Mesh(g, mat);
  if(axis === 'x') m.position.set((a0+a1)/2, (top+bottom)/2, c);
  else { m.position.set(c, (top+bottom)/2, (a0+a1)/2); m.rotation.y = Math.PI/2; }
  m.castShadow = true; m.receiveShadow = true; world.add(m);
  return m;
}
function curtainRod(a0, a1, c, axis, y){
  const r = cyl(0.012, 0.012, a1-a0, 12, matDark, axis==='x' ? (a0+a1)/2 : c, y, axis==='x' ? c : (a0+a1)/2);
  if(axis === 'x') r.rotation.z = Math.PI/2; else r.rotation.x = Math.PI/2;
}
// interruptor / tomada (placa 4×2"): (nx,nz) = pra onde a placa olha
function plate(x, z, y, nx, nz, outlet){
  furn(x+nx*0.006, z+nz*0.006, nz?0.075:0.012, nz?0.012:0.075, 0.12, y-0.06, matTrim, false, 0.003);
  if(outlet) cyl(0.018, 0.018, 0.004, 14, matDark, x+nx*0.013, y, z+nz*0.013).rotation.set(nz?Math.PI/2:0, 0, nx?Math.PI/2:0);
  else furn(x+nx*0.013, z+nz*0.013, nz?0.025:0.004, nz?0.004:0.025, 0.04, y-0.02, matCabinet, false, 0.002);
}

// ---- louças (Z em metros de MUNDO). (wx,wz) = direção da parede onde a caixa encosta ----
// bacia 37×50, caixa acoplada 38×17, assento a 42 cm, topo da caixa a 79 cm
function toilet(cx, mz, wx, wz){
  wx = wx || 0; wz = (wx === 0 && !wz) ? -1 : (wz || 0);
  const lx = wz ? 1.0 : 1.34, lz = wz ? 1.34 : 1.0;
  cyl(0.115, 0.145, 0.24, 24, matWhite, cx - wx*0.03, 0.12, mz - wz*0.03, lx*0.78, lz*0.78);
  cyl(0.185, 0.155, 0.17, 32, matWhite, cx, 0.315, mz, lx, lz);
  cyl(0.195, 0.195, 0.03, 32, matWhite, cx, 0.415, mz, lx, lz);
  cyl(0.185, 0.185, 0.02, 32, matWhite, cx + wx*0.10, 0.44, mz + wz*0.10, lx*0.98, lz*0.98);
  furn(cx + wx*0.28, mz + wz*0.28, wz?0.38:0.17, wz?0.17:0.38, 0.40, 0.36, matWhite, false, 0.03, 2);
  furn(cx + wx*0.28, mz + wz*0.28, wz?0.40:0.19, wz?0.19:0.40, 0.03, 0.76, matWhite, false, 0.012, 2);
  cyl(0.03, 0.03, 0.012, 18, matMetal, cx + wx*0.28, 0.795, mz + wz*0.28);
}
// lavatório de coluna 52×42, borda a 82 cm. (nx,nz) = pra onde a cuba olha
function sink(cx, mz, nx, nz){
  nx = nx || 0; nz = (nx === 0 && !nz) ? 1 : (nz || 0);
  cyl(0.095, 0.14, 0.67, 24, matWhite, cx, 0.335, mz);
  furn(cx, mz, nz?0.52:0.42, nz?0.42:0.52, 0.15, 0.67, matWhite, false, 0.04, 3);
  cyl(0.16, 0.12, 0.005, 28, matGranite, cx + nx*0.03, 0.818, mz + nz*0.03, nz?1.1:0.8, nz?0.8:1.1);
  faucet(cx - nx*0.16, mz - nz*0.16, 0.82, nx, nz);
}

// ============================================================
//  PORTAS — folhas abertas a 90°, do jeito que a planta desenha o giro
// ============================================================
doorLeaf(6.03, 10.34,  0,  1, 0.80, 2.10);    // suíte
doorLeaf(4.53, 14.73, -1,  0, 0.80, 2.10);    // WC suíte
doorLeaf(4.83, 10.01, -1,  0, 0.70, 2.10);    // WC social
doorLeaf(4.83,  6.11, -1,  0, 0.80, 2.10);    // Dorm.02
doorLeaf(6.37,  5.80,  0, -1, 0.80, 2.10);    // Dorm.1
doorLeaf(6.93,  2.22,  0,  1, 1.00, 2.20);    // porta social da sala
doorLeaf(0.50,  6.00,  0,  1, 0.80, 2.10);    // garagem -> corredor
// cozinha -> serviço: porta de correr de vidro com as folhas recolhidas nas pontas
[[7.215],[8.805]].forEach(([x])=>{
  furn(x, 10.24, 0.54, 0.012, 2.04, 0.03, matGlass, false, 0);
  furn(x, 10.24, 0.58, 0.04, 0.04, 2.06, matTrim, false);
  furn(x, 10.24, 0.58, 0.04, 0.03, 0.00, matTrim, false);
  [-0.27, 0.27].forEach(d=> furn(x+d, 10.24, 0.04, 0.04, 2.04, 0.03, matTrim, false));
});

// ---- interruptores e tomadas (ao lado do batente, no lado da maçaneta) ----
[[5.47,5.794,1.10,0,-1],[5.47,5.986,1.10,0,1],[8.05,2.206,1.10,0,1],[5.12,10.346,1.10,0,1],
 [4.844,7.03,1.10,-1,0],[4.844,9.21,1.10,-1,0],[4.544,13.88,1.10,-1,0],[6.72,5.986,1.10,0,1]]
  .forEach(([x,z,y,nx,nz])=> plate(x,z,y,nx,nz,false));
[[6.696,3.75,0.30,1,0],[5.90,2.206,0.30,0,1],[4.506,3.70,0.30,1,0],[9.794,7.95,1.10,-1,0],
 [9.794,9.10,1.10,-1,0],[2.95,13.136,0.30,0,-1],[4.30,13.136,0.30,0,-1],[9.794,4.80,0.30,-1,0]]
  .forEach(([x,z,y,nx,nz])=> plate(x,z,y,nx,nz,true));

// ============================================================
//  GARAGEM (x 0,20–4,30 · z 0,19–5,80) — rampa de 1,20 a 25% na entrada
// ============================================================
// ---- carro (sedã compacto 4,34 × 1,73 × 1,46, entre-eixos 2,60, roda 62 cm) ----
// Montado num Group local (comprimento no eixo z local) -> dá pra girar (yaw) e
// inclinar (pitch, rua em declive). A fusão usa matrixWorld, então funciona igual.
const matGlassCar = std({ color:0x1b242c, roughness:0.05, metalness:0.2, envMapIntensity:1.4 });
const matTail  = std({ color:0xb3261e, roughness:0.2, emissive:0x400000 });
const matHeadL = std({ color:0xf2f4f5, roughness:0.05, metalness:0.3 });
const carPaint = c => new THREE.MeshPhysicalMaterial({ color:c, metalness:0.55, roughness:0.32, clearcoat:1.0, clearcoatRoughness:0.05 });
function car(cx, y, cz, yaw, pitch, paint){
  const g = new THREE.Group();
  g.position.set(cx, y, cz); g.rotation.set(pitch || 0, yaw || 0, 0, 'YXZ');
  world.add(g);
  const P = (x,z,w,d,h,y0,mat,r,seg)=>{
    const m = new THREE.Mesh(boxGeo(w,h,d,r,seg), mat);
    m.position.set(x, y0+h/2, z); m.castShadow = m.receiveShadow = true; g.add(m);
  };
  P(0, 0,      1.73, 4.20, 0.42, 0.28, paint, 0.12, 3);       // carroceria
  P(0,-1.45,   1.68, 1.25, 0.10, 0.64, paint, 0.06, 2);       // capô
  P(0, 1.62,   1.66, 0.95, 0.10, 0.64, paint, 0.06, 2);       // tampa traseira
  P(0, 0.12,   1.58, 2.15, 0.56, 0.68, matGlassCar, 0.10, 3); // estufa (vidros)
  P(0, 0.12,   1.40, 1.75, 0.08, 1.24, paint, 0.05, 2);       // teto
  P(0,-2.12,   1.70, 0.10, 0.22, 0.26, matDark, 0.04, 2);     // para-choques
  P(0, 2.12,   1.70, 0.10, 0.22, 0.26, matDark, 0.04, 2);
  [-1,1].forEach(k=>{
    P(k*0.58,-2.13, 0.36, 0.05, 0.10, 0.56, matHeadL, 0.02);
    P(k*0.62, 2.14, 0.30, 0.04, 0.09, 0.58, matTail, 0.015);
    P(k*0.90,-0.85, 0.12, 0.08, 0.08, 0.98, paint, 0.03);     // retrovisores
  });
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{
    for(const [r, h, mat, sg] of [[0.31, 0.20, matTire, 28], [0.20, 0.21, matSteel, 24]]){
      const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, sg), mat);
      w.position.set(a*0.78, 0.31, b*1.30); w.rotation.z = Math.PI/2;
      w.castShadow = w.receiveShadow = true; g.add(w);
    }
  });
  return g;
}

(function(){
  const CX = 2.25, CZ = 3.62;
  addFoot(CX-0.86, CX+0.86, CZ-2.12, CZ+2.12, 0.45);                       // sombra de contato sob o carro
  addCollider(CX-0.87, CX+0.87, CZ-2.17, CZ+2.17);
  car(CX, -0.02, CZ, 0, 0, matCar);                                         // frente pra rua
  // pilares de 3,00 do portão basculante + folha aberta (horizontal) + motor
  box(0.28, 1.50, 0.095, 0.16, 3.00, 0.21, matMuro, false);
  box(4.36, 1.50, 0.095, 0.78, 3.00, 0.21, matMuro, false);
  box(2.165, 2.80, 0.30, 3.58, 0.05, 2.80, matSteel, false);
  for(let i=0;i<9;i++) box(2.165, 2.77, -1.00 + i*0.32, 3.58, 0.02, 0.03, matDark, false);   // nervuras
  furn(4.20, 0.36, 0.30, 0.22, 0.24, 2.55, matDark, false, 0.02);
  // bancada de ferramentas na parede leste: 1,20 × 0,55, tampo a 0,90
  const P = orient(4.025, 4.20, -1, 0);
  P(0, 0, 1.20, 0.55, 0.04, 0.86, matWood, true);
  [-1,1].forEach(k=> P(k*0.57, 0, 0.05, 0.50, 0.86, 0, matSteel, false));
  P(0, -0.12, 1.10, 0.30, 0.02, 0.20, matWood, false);
  P(0, -0.13, 1.20, 0.30, 0.02, 1.50, matWood, false);
  P(0, -0.26, 1.20, 0.012, 0.60, 0.92, matDark, false, 0);           // painel perfurado
  [[-0.40,BOOKS[0]],[-0.05,BOOKS[1]],[0.30,BOOKS[3]]].forEach(([u,m])=>
    P(u, -0.13, 0.30, 0.24, 0.22, 1.52, m, false, 0.01));
})();

// ============================================================
//  JARDIM DA FRENTE (x 4,30–9,80 · z 0,19–1,99)
// ============================================================
(function(){
  [[7.40,0.34,1.44,0.30],[7.515,0.815,0.81,0.43],[7.515,1.29,1.17,0.42],[7.51,1.795,1.66,0.35]]
    .forEach(([x,z,w,d])=> furn(x, z, w, d, 0.03, -0.02, matStone, false, 0.01));
  // portão social 1,00×2,15 aberto pra dentro (dobradiça leste)
  const P = (x,z,w,d,h,y)=> furn(x,z,w,d,h,y,matDark,false,0.004);
  P(7.865, 0.69, 0.04, 1.00, 0.04, 0.05); P(7.865, 0.69, 0.04, 1.00, 0.04, 2.08);
  for(let i=0;i<=8;i++) P(7.865, 0.21+i*0.12, 0.02, 0.02, 2.07, 0.05);
  // gradil fixo de 1,50 no muro
  furn(5.50, 0.095, 1.50, 0.19, 1.51, -1.31, matMuro, false, 0);
  for(let i=0;i<13;i++) P(4.81+i*0.115, 0.095, 0.02, 0.02, 2.00, 0.20);
  P(5.50, 0.095, 1.50, 0.04, 0.04, 2.16);
  // fundação sob os vãos do muro
  furn(2.165, 0.095, 3.61, 0.19, 1.01, -1.31, matMuro, false, 0);
  furn(7.38, 0.095, 1.00, 0.19, 1.28, -1.31, matMuro, false, 0);
  // padrão de energia + hidrômetro
  furn(9.58, 0.32, 0.40, 0.26, 1.60, 0, matMuro, false, 0.01);
  furn(9.58, 0.46, 0.30, 0.02, 0.40, 1.00, matDark, false, 0.004);
  furn(8.84, 0.33, 0.40, 0.25, 0.40, 0.25, matMuro, false, 0.01);
  furn(8.84, 0.46, 0.30, 0.02, 0.24, 0.32, matDark, false, 0.004);
  // arandela ao lado da porta social
  furn(8.10, 2.17, 0.10, 0.06, 0.18, 2.00, matDark, false, 0.01);
  furn(8.10, 2.14, 0.07, 0.03, 0.12, 2.03, matLamp, false, 0.01);
  shrub(9.30, 1.40, 0.32); shrub(4.80, 1.55, 0.28);
})();

// ============================================================
//  HOME OFFICE — Dorm.1 (x 4,50–6,51 · z 2,20–5,80)
// ============================================================
(function(){
  // --- ESTAÇÃO 1: sob a janela da frente ---
  furn(5.50, 2.50, 1.20, 0.60, 0.025, 0.725, matWood, true, 0.004);
  furn(4.915, 2.50, 0.03, 0.58, 0.725, 0, matWood, false);
  furn(6.085, 2.50, 0.03, 0.58, 0.725, 0, matWood, false);
  furn(5.85, 2.48, 0.40, 0.50, 0.60, 0.02, matCabinet, false);
  drawers(5.85, 2.73, 0.40, 0.60, 0.02, 3, 0, 1, matCabinet);
  furn(5.50, 2.33, 0.22, 0.16, 0.015, 0.75, matDark, false, 0.005);       // monitor 24"
  furn(5.50, 2.31, 0.035, 0.03, 0.16, 0.765, matDark, false, 0.005);
  furn(5.50, 2.33, 0.545, 0.025, 0.325, 0.90, matDark, false, 0.006);
  furn(5.50, 2.344, 0.525, 0.004, 0.305, 0.91, matScreen, false, 0);
  furn(5.50, 2.62, 0.44, 0.14, 0.02, 0.75, matDark, false, 0.006);        // teclado
  furn(5.86, 2.62, 0.06, 0.10, 0.03, 0.75, matDark, false, 0.012);        // mouse
  cyl(0.06, 0.07, 0.015, 18, matDark, 5.05, 0.757, 2.36);                 // luminária articulada
  cyl(0.008, 0.008, 0.40, 8, matMetal, 5.05, 0.96, 2.36);
  cyl(0.05, 0.07, 0.10, 18, matDark, 5.10, 1.15, 2.42);
  furn(5.25, 2.66, 0.20, 0.27, 0.02, 0.75, matCabinet, false, 0.004);     // caderno
  cyl(0.04, 0.035, 0.10, 18, matWhite, 6.00, 0.80, 2.32);                 // caneca
  officeChair(5.50, 3.12, 0, 1);
  // --- ESTAÇÃO 2: parede oeste ---
  furn(4.80, 4.00, 0.60, 1.20, 0.025, 0.725, matWood, true, 0.004);
  furn(4.80, 3.415, 0.58, 0.03, 0.725, 0, matWood, false);
  furn(4.80, 4.585, 0.58, 0.03, 0.725, 0, matWood, false);
  furn(4.64, 4.00, 0.16, 0.22, 0.015, 0.75, matDark, false, 0.005);
  furn(4.62, 4.00, 0.03, 0.035, 0.16, 0.765, matDark, false, 0.005);
  furn(4.64, 4.00, 0.025, 0.545, 0.325, 0.90, matDark, false, 0.006);
  furn(4.654, 4.00, 0.004, 0.525, 0.305, 0.91, matScreen, false, 0);
  furn(4.92, 4.00, 0.14, 0.44, 0.02, 0.75, matDark, false, 0.006);
  furn(4.92, 4.36, 0.10, 0.06, 0.03, 0.75, matDark, false, 0.012);
  furn(4.75, 4.42, 0.45, 0.20, 0.45, 0, matDark, true, 0.01);             // gabinete
  officeChair(5.45, 4.00, 1, 0);
  // --- estante, planta, quadro ---
  bookcase(4.65, 5.25, 0.80, 0.30, 1.80, 5, 1, 0);
  plant(6.20, 2.55, 0.85);
  picture(6.51, 4.20, 0.50, 0.40, 1.40, -1, 0, matArt[1]);
  // persiana de rolo meio baixada na janela
  furn(5.50, 2.29, 1.08, 0.08, 0.08, 2.52, matCabinet, false, 0.02);
  furn(5.50, 2.30, 1.04, 0.006, 0.75, 1.78, matCurtain, false, 0);
})();

// ============================================================
//  SALA DE ESTAR (x 6,69–9,80 · z 2,20–5,80)
// ============================================================
(function(){
  // --- SOFÁ 3 lugares 2,10 × 0,90, assento a 44, encosto a 82, braço a 60 (parede leste) ---
  const S = orient(9.35, 4.15, -1, 0);
  S(0, 0, 2.10, 0.90, 0.20, 0.10, matSofa, true, 0.03, 2);                 // base
  [-1,0,1].forEach(k=> S(k*0.605, 0.07, 0.60, 0.64, 0.15, 0.29, matCush, false, 0.05, 3)); // assentos
  S(0, -0.34, 2.10, 0.22, 0.52, 0.30, matSofa, false, 0.05, 3);             // encosto
  [-1,0,1].forEach(k=> S(k*0.605, -0.18, 0.58, 0.16, 0.38, 0.43, matCush, false, 0.06, 3));
  [-1,1].forEach(k=> S(k*0.98, 0.02, 0.15, 0.86, 0.32, 0.28, matSofa, false, 0.06, 3));
  [-1,1].forEach(k=> S(k*0.68, -0.07, 0.42, 0.13, 0.42, 0.45, matThrow, false, 0.06, 3));
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=> S(a*0.98, b*0.38, 0.05, 0.05, 0.10, 0, matWoodDk, false, 0.01));
  // --- RACK 1,60 × 0,40 + TV 55" na parede ---
  const R = orient(6.89, 4.15, 1, 0);
  R(0, 0, 1.60, 0.40, 0.38, 0.12, matWoodDk, true);
  [-1,1].forEach(k=> R(k*0.74, 0, 0.04, 0.36, 0.12, 0, matDark, false, 0.008));
  cabDoors(7.09, 4.15, 1.60, 0.38, 0.12, 2, 1, 0, matCabinet);
  furn(6.72, 4.15, 0.045, 1.23, 0.71, 0.80, matDark, false, 0.008);
  furn(6.744, 4.15, 0.004, 1.20, 0.68, 0.815, matBlack, false, 0);
  furn(6.95, 4.15, 0.09, 0.90, 0.065, 0.50, matDark, false, 0.02);        // soundbar
  // --- MESA DE CENTRO + tapete ---
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.40, 2.00),
    std({ map:T_RUG.map, normalMap:T_RUG.normalMap, color:0x8a7f6e, roughness:1.0 }));
  rug.rotation.x = -Math.PI/2; rug.position.set(8.15, 0.012, 4.15); rug.receiveShadow = true; world.add(rug);
  rug.geometry.attributes.uv.array.forEach((v,i,a)=> a[i] = v*(i%2 ? 2.0 : 1.4));
  furn(8.25, 4.15, 0.50, 1.00, 0.03, 0.37, matWoodDk, true, 0.01);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>
    furn(8.25+a*0.21, 4.15+b*0.46, 0.035, 0.035, 0.37, 0, matWoodDk, false, 0.008));
  furn(8.25, 3.90, 0.22, 0.28, 0.035, 0.40, BOOKS[1], false, 0.004);
  furn(8.24, 3.91, 0.20, 0.25, 0.03, 0.435, BOOKS[0], false, 0.004);
  cyl(0.10, 0.06, 0.07, 24, matWhite, 8.25, 0.435, 4.45);
  // --- luminária de piso, quadro, planta ---
  cyl(0.15, 0.15, 0.025, 24, matDark, 9.55, 0.012, 2.50);
  cyl(0.012, 0.012, 1.45, 10, matMetal, 9.55, 0.75, 2.50);
  cyl(0.14, 0.19, 0.26, 24, matLamp, 9.55, 1.50, 2.50);
  picture(9.80, 4.15, 0.90, 0.60, 1.10, -1, 0, matArt[0]);
  plant(9.45, 5.48, 1.0);
  // --- cortinas na janela da frente ---
  curtainRod(8.28, 9.74, 2.28, 'x', 2.55);
  curtain(8.30, 8.78, 2.30, 'x', 2.52, 0.02, matCurtain);
  curtain(9.26, 9.74, 2.30, 'x', 2.52, 0.02, matCurtain);
})();

// ============================================================
//  JANTAR / COZINHA (x 5,06–9,80 · z 5,98–10,14)
// ============================================================
(function(){
  // --- BANCADA 0,60, tampo a 0,90 (z 7,41–9,48) ---
  furn(9.51, 8.445, 0.58, 2.07, 0.86, 0, matCabinet, true, 0);
  furn(9.51, 8.445, 0.50, 2.07, 0.08, 0, matDark, false, 0);
  cabDoors(9.22, 8.445, 2.07, 0.76, 0.09, 4, -1, 0, matCabinet);
  furn(9.49, 8.455, 0.62, 2.09, 0.03, 0.86, matGranite, false, 0.004);
  furn(9.795, 8.775, 0.01, 2.73, 0.62, 0.89, matSubway, false, 0);        // azulejo metrô
  furn(9.48, 8.50, 0.40, 0.58, 0.004, 0.890, matSteel, false, 0);         // cuba inox
  furn(9.48, 8.50, 0.34, 0.50, 0.006, 0.891, matDark, false, 0);
  faucet(9.74, 8.50, 0.89, -1, 0);
  // --- FOGÃO 4 bocas 0,52 × 0,58 × 0,85 ---
  furn(9.51, 9.76, 0.58, 0.52, 0.85, 0, matSteel, true, 0.006);
  furn(9.51, 9.76, 0.58, 0.52, 0.012, 0.85, matBlack, false, 0.004);
  [[-0.12,-0.12],[0.12,-0.12],[-0.12,0.12],[0.12,0.12]].forEach(([a,b])=>{
    cyl(0.05, 0.055, 0.02, 20, matDark, 9.51+a, 0.872, 9.76+b);
    cyl(0.035, 0.035, 0.012, 16, matMetal, 9.51+a, 0.886, 9.76+b);
    [0,1,2,3].forEach(i=> furn(9.51+a, 9.76+b, i%2?0.008:0.16, i%2?0.16:0.008, 0.012, 0.895, matDark, false, 0)); // trempe
  });
  furn(9.218, 9.76, 0.006, 0.44, 0.38, 0.20, matBlack, false, 0);
  furn(9.20, 9.76, 0.02, 0.36, 0.02, 0.62, matMetal, false, 0.006);
  [-0.16,-0.08,0,0.08,0.16].forEach(b=> cyl(0.016, 0.016, 0.02, 12, matDark, 9.21, 0.74, 9.76+b).rotation.z = Math.PI/2);
  furn(9.51, 10.08, 0.58, 0.12, 0.86, 0, matCabinet, false, 0);
  furn(9.49, 10.08, 0.62, 0.12, 0.03, 0.86, matGranite, false, 0.004);
  furn(9.55, 9.76, 0.50, 0.60, 0.10, 1.60, matSteel, false, 0.01);        // depurador
  // --- ARMÁRIOS AÉREOS 0,35 × 0,70 ---
  furn(9.625, 8.405, 0.35, 1.99, 0.70, 1.50, matCabinet, false, 0);
  cabDoors(9.45, 8.405, 1.99, 0.70, 1.50, 4, -1, 0, matCabinet);
  furn(9.62, 8.405, 0.30, 1.95, 0.02, 1.48, matLamp, false, 0);           // fita de LED sob o aéreo
  // --- GELADEIRA duplex inox 0,68 × 0,72 × 1,85 ---
  furn(9.44, 7.06, 0.72, 0.68, 1.85, 0, matSteel, true, 0.02, 2);
  furn(9.078, 7.06, 0.004, 0.66, 0.008, 1.24, matDark, false, 0);
  furn(9.06, 6.79, 0.025, 0.025, 0.55, 0.62, matMetal, false, 0.008);
  furn(9.06, 6.79, 0.025, 0.025, 0.30, 1.40, matMetal, false, 0.008);
  // --- TORRE QUENTE: forno + micro-ondas ---
  furn(9.50, 6.34, 0.60, 0.70, 2.10, 0, matCabinet, true, 0);
  furn(9.196, 6.34, 0.006, 0.58, 0.48, 0.54, matBlack, false, 0.004);
  furn(9.196, 6.34, 0.006, 0.52, 0.30, 1.10, matBlack, false, 0.004);
  furn(9.19, 6.34, 0.012, 0.50, 0.02, 0.98, matMetal, false, 0.004);
  drawers(9.20, 6.34, 0.70, 0.48, 0.05, 2, -1, 0, matCabinet);
  cabDoors(9.20, 6.34, 0.70, 0.62, 1.46, 2, -1, 0, matCabinet);
  // --- MESA DE JANTAR 4 lugares 1,20 × 0,80 ---
  const tx = 7.20, tz = 8.05;
  furn(tx, tz, 1.20, 0.80, 0.03, 0.72, matWood, true, 0.008);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>
    furn(tx+a*0.54, tz+b*0.34, 0.05, 0.05, 0.72, 0, matWood, false, 0.008));
  chair(tx-0.30, tz-0.60, matChairF, 0, -1);
  chair(tx+0.30, tz-0.60, matChairF, 0, -1);
  chair(tx-0.30, tz+0.60, matChairF, 0,  1);
  chair(tx+0.30, tz+0.60, matChairF, 0,  1);
  cyl(0.14, 0.08, 0.07, 28, matWhite, tx, 0.785, tz);
  [[0.045,BOOKS[0]],[0.04,BOOKS[3]],[0.04,BOOKS[2]]].forEach(([r,m],i)=> sph(r, m, tx-0.05+i*0.05, 0.835, tz+(i%2)*0.04));
  [-0.30, 0.30].forEach(d=>{                                               // pendentes a 1,70
    box(tx+d, 2.20, tz, 0.006, 0.98, 0.006, matDark, false);
    cyl(0.05, 0.14, 0.17, 28, matDark, tx+d, 1.79, tz);
    cyl(0.12, 0.12, 0.01, 24, matLamp, tx+d, 1.705, tz);
  });
  plant(5.30, 7.80, 0.85);
  picture(5.06, 8.05, 0.70, 0.50, 1.35, 1, 0, matArt[2]);
})();

// ============================================================
//  KIDS ROOM — Dorm.02 (x 1,70–4,85 · z 5,98–8,55)
// ============================================================
(function(){
  const kBlue = std({ color:0x4f93d6, roughness:0.55, aoMap:AO_OBJ });
  const kRed  = std({ color:0xe0543f, roughness:0.55, aoMap:AO_OBJ });
  const kYel  = std({ color:0xf2c14e, roughness:0.55, aoMap:AO_OBJ });
  const kGrn  = std({ color:0x5fb37a, roughness:0.55, aoMap:AO_OBJ });
  const kFur  = fabric(0xb98a5e);
  const kQuiltB = fabric(0x4f93d6), kQuiltR = fabric(0xe0543f);
  // --- BELICHE 2,00 × 1,00 × 1,60 (x 2,82–4,82, z 7,55–8,53) ---
  const bx = 3.82, bz = 8.04;
  [[2.855,7.585],[2.855,8.495],[4.785,7.585],[4.785,8.495]].forEach(([x,z])=>
    furn(x, z, 0.07, 0.07, 1.60, 0, matWood, false, 0.01));
  [[0.22, kQuiltB],[1.10, kQuiltR]].forEach(([y, quilt])=>{
    furn(bx, bz, 1.93, 0.91, 0.03, y, matWood, true);
    furn(bx, 7.585, 1.93, 0.03, 0.12, y, matWood, false);
    furn(bx, 8.495, 1.93, 0.03, 0.12, y, matWood, false);
    furn(bx, bz, 1.88, 0.88, 0.14, y+0.03, matBed, false, 0.04, 3);
    furn(bx+0.15, bz, 1.56, 0.91, 0.04, y+0.15, quilt, false, 0.02, 2);
    furn(bx-0.72, bz, 0.40, 0.58, 0.10, y+0.16, matBed, false, 0.045, 3);
  });
  furn(4.10, 7.585, 1.40, 0.03, 0.10, 1.48, matWood, false);
  [3.40, 4.10].forEach(x=> furn(x, 7.585, 0.04, 0.03, 0.30, 1.22, matWood, false));
  [2.95, 3.33].forEach(x=> furn(x, 7.555, 0.04, 0.04, 1.40, 0.0, matWood, false, 0.008));
  [0.32, 0.60, 0.88, 1.16].forEach(y=> furn(3.14, 7.555, 0.38, 0.035, 0.03, y, matWood, false, 0.006));
  // --- ESCRIVANINHA infantil 0,90 × 0,50, tampo a 0,62 ---
  const D = orient(1.95, 7.30, 1, 0);
  D(0, 0, 0.90, 0.50, 0.025, 0.60, matCabinet, true, 0.006);
  D(-0.435, 0, 0.03, 0.48, 0.60, 0, matCabinet, false);
  D( 0.435, 0, 0.03, 0.48, 0.60, 0, matCabinet, false);
  D(0.25, -0.02, 0.36, 0.44, 0.22, 0.36, kYel, false, 0.01);
  furn(2.00, 7.10, 0.30, 0.22, 0.012, 0.625, matCabinet, false, 0.003);
  [[0.12,kRed],[0.14,kBlue],[0.16,kGrn]].forEach(([h,m],i)=>
    cyl(0.005, 0.005, h, 6, m, 1.80, 0.625+h/2, 7.55+i*0.025));
  furn(2.48, 7.30, 0.34, 0.34, 0.03, 0.29, kGrn, false, 0.01);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=> furn(2.48+a*0.14, 7.30+b*0.14, 0.03, 0.03, 0.29, 0, kGrn, false, 0.008));
  furn(2.64, 7.30, 0.03, 0.34, 0.30, 0.32, kGrn, false, 0.01);
  // --- GUARDA-ROUPA 1,20 × 0,55 × 1,90 ---
  furn(2.70, 6.255, 1.20, 0.55, 1.90, 0, matCabinet, true);
  cabDoors(2.70, 6.53, 1.20, 1.84, 0.04, 2, 0, 1, kBlue);
  // --- BAÚ de brinquedos ---
  furn(3.69, 6.18, 0.62, 0.40, 0.40, 0, kRed, true, 0.02);
  furn(3.69, 6.18, 0.64, 0.42, 0.05, 0.40, kYel, false, 0.02);
  // --- TAPETE redondo + brinquedos ---
  const rug = new THREE.Mesh(new THREE.CircleGeometry(0.60, 48), std({ map:T_KIDRUG, normalMap:T_RUG.normalMap, roughness:1.0 }));
  rug.rotation.x = -Math.PI/2; rug.position.set(3.30, 0.012, 7.00); rug.receiveShadow = true; world.add(rug);
  [[3.10,6.85,kRed],[3.18,6.82,kBlue],[3.14,6.84,kYel]].forEach(([x,z,m],i)=> furn(x, z, 0.06, 0.06, 0.06, 0.012+i*0.06, m, false, 0.006));
  sph(0.11, kGrn, 3.65, 0.122, 7.20);
  const tx = 3.05, tz = 7.20;
  sph(0.08, kFur, tx, 0.092, tz); sph(0.06, kFur, tx, 0.21, tz);
  sph(0.022, kFur, tx-0.045, 0.265, tz); sph(0.022, kFur, tx+0.045, 0.265, tz);
  sph(0.03, kFur, tx-0.09, 0.11, tz); sph(0.03, kFur, tx+0.09, 0.11, tz);
  picture(4.85, 7.22, 0.30, 0.40, 1.30, -1, 0, matArt[3]);
  // --- MÓBILE + estrelas ---
  [[3.10,7.00,kRed],[3.30,6.90,kYel],[3.50,7.05,kBlue]].forEach(([x,z,m],i)=>{
    box(x, 2.45-i*0.04, z, 0.004, 0.30, 0.004, matDark, false);
    sph(0.05, m, x, 2.28-i*0.04, z);
  });
  [[2.25,6.40],[3.60,6.60],[2.55,7.80],[4.30,7.20],[2.05,7.00]].forEach(([x,z])=>
    cyl(0.04, 0.04, 0.006, 6, matLamp, x, CEIL-0.016, z));
  // --- cortinas na janela oeste ---
  curtainRod(6.30, 8.28, 1.77, 'z', 2.40);
  curtain(6.32, 6.72, 1.79, 'z', 2.37, 0.95, matKidCurt);
  curtain(7.86, 8.26, 1.79, 'z', 2.37, 0.95, matKidCurt);
})();

// ============================================================
//  SUÍTE MASTER — quarto 3,80 × 2,80 + nicho/closet 1,40 × 2,60
// ============================================================
(function(){
  // --- CAMA QUEEN: colchão 1,58 × 1,98 × 0,25, topo a 0,60 ---
  const cx = 3.60, cz = 12.12;
  furn(cx, cz, 1.64, 2.04, 0.30, 0.05, matHead, true, 0.03, 2);              // base box estofada
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=> furn(cx+a*0.78, cz+b*0.98, 0.05, 0.05, 0.05, 0, matDark, false, 0.01));
  furn(cx, cz, 1.58, 1.98, 0.25, 0.35, matBed, false, 0.07, 3);              // colchão
  furn(cx, cz-0.28, 1.68, 1.46, 0.05, 0.585, matSheet, false, 0.03, 3);      // edredom
  furn(cx, cz-0.92, 1.70, 0.30, 0.06, 0.62, matThrow, false, 0.03, 3);       // peseira
  [-0.40, 0.40].forEach(d=> furn(cx+d, 12.84, 0.70, 0.45, 0.15, 0.60, matBed, false, 0.07, 3));
  [-0.40, 0.40].forEach(d=> furn(cx+d*0.95, 12.66, 0.50, 0.12, 0.32, 0.60, matSheet, false, 0.05, 3)); // almofadas
  furn(cx, 13.10, 1.80, 0.08, 1.20, 0, matHead, false, 0.03, 2);              // cabeceira
  [-0.60,0,0.60].forEach(k=> furn(cx+k, 13.05, 0.57, 0.04, 0.50, 0.65, matHead, false, 0.02, 2));
  // --- criados-mudos + abajures ---
  [2.56, 4.64].forEach(x=>{
    furn(x, 12.92, 0.40, 0.40, 0.47, 0.08, matWoodDk, true);
    drawers(x, 12.72, 0.40, 0.45, 0.09, 2, 0, -1, matWoodDk);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=> furn(x+a*0.17, 12.92+b*0.17, 0.03, 0.03, 0.08, 0, matDark, false, 0.006));
    cyl(0.06, 0.07, 0.04, 20, matWhite, x, 0.57, 12.95);
    cyl(0.012, 0.012, 0.22, 8, matMetal, x, 0.70, 12.95);
    cyl(0.10, 0.14, 0.18, 28, matLamp, x, 0.88, 12.95);
  });
  // --- TV 50" na parede sul ---
  furn(3.60, 10.365, 1.12, 0.04, 0.65, 0.88, matDark, false, 0.008);
  furn(3.60, 10.387, 1.09, 0.004, 0.62, 0.895, matBlack, false, 0);
  // --- CÔMODA + espelho ---
  furn(5.925, 12.00, 0.45, 1.00, 0.80, 0.05, matWoodDk, true);
  drawers(5.70, 12.00, 1.00, 0.75, 0.07, 3, -1, 0, matWoodDk);
  furn(5.92, 12.00, 0.47, 1.02, 0.03, 0.85, matWoodDk, false);
  furn(6.143, 12.00, 0.012, 0.70, 0.90, 1.10, matMirror, false, 0.004);
  [[11.75, 0.18],[12.25, 0.10]].forEach(([z,h])=> cyl(0.04, 0.05, h, 18, matWhite, 5.90, 0.88+h/2, z));
  // --- tapete aos pés da cama ---
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.20, 1.40),
    std({ map:T_RUG.map, normalMap:T_RUG.normalMap, color:0x9a8b76, roughness:1.0 }));
  rug.rotation.x = -Math.PI/2; rug.position.set(3.60, 0.012, 11.30); rug.receiveShadow = true; world.add(rug);
  rug.geometry.attributes.uv.array.forEach((v,i,a)=> a[i] = v*(i%2 ? 1.4 : 2.2));
  // --- ROUPEIRO no nicho ---
  furn(5.85, 14.30, 0.60, 2.00, 2.30, 0, matCabinet, true, 0);
  cabDoors(5.55, 14.30, 2.00, 2.26, 0.02, 4, -1, 0, matWood);
  plant(5.00, 15.45, 0.80);
  picture(3.60, 13.14, 0.90, 0.50, 1.45, 0, -1, matArt[2]);
  // --- cortinas blackout na porta-janela ---
  curtainRod(10.52, 12.74, 2.42, 'z', 2.45);
  curtain(10.55, 11.10, 2.44, 'z', 2.42, 0.02, matBlackout);
  curtain(12.36, 12.70, 2.44, 'z', 2.42, 0.02, matBlackout);
})();

// ============================================================
//  WC SUÍTE (x 2,35–4,55 · z 13,34–15,74)
// ============================================================
(function(){
  furn(3.45, 15.29, 2.20, 0.90, 0.02, 0, matGranite, false, 0);           // piso do box
  furn(3.10, 14.84, 1.50, 0.008, 1.90, 0.02, matGlass, true, 0);          // vidro fixo
  furn(3.10, 14.84, 1.50, 0.025, 0.025, 1.92, matMetal, false, 0.006);
  furn(2.36, 14.84, 0.02, 0.025, 1.90, 0.02, matMetal, false, 0.006);
  cyl(0.012, 0.012, 0.40, 10, matMetal, 2.38, 2.00, 15.30);               // chuveiro
  const arm = cyl(0.01, 0.01, 0.18, 10, matMetal, 2.47, 2.19, 15.30); arm.rotation.z = Math.PI/2;
  cyl(0.10, 0.10, 0.02, 32, matMetal, 2.58, 2.17, 15.30);
  cyl(0.035, 0.035, 0.05, 16, matMetal, 2.37, 1.20, 15.30).rotation.z = Math.PI/2;
  furn(4.53, 15.30, 0.03, 0.30, 0.10, 1.30, matCabinet, false, 0.004);    // nicho de shampoo (prateleira)
  toilet(2.72, 14.33, -1, 0);
  furn(2.37, 13.95, 0.02, 0.12, 0.10, 0.65, matMetal, false, 0.004);
  // --- BANCADA 1,50 × 0,50 suspensa, duas cubas ---
  furn(3.70, 13.57, 1.50, 0.46, 0.60, 0.22, matWoodDk, true);
  cabDoors(3.70, 13.80, 1.50, 0.60, 0.22, 2, 0, 1, matWoodDk);
  furn(3.70, 13.59, 1.52, 0.50, 0.03, 0.82, matGranite, false, 0.004);
  [3.35, 4.05].forEach(x=>{
    cyl(0.17, 0.13, 0.005, 32, matWhite, x, 0.853, 13.62, 1.1, 0.85);
    cyl(0.15, 0.11, 0.006, 32, matDark, x, 0.854, 13.62, 1.1, 0.85);
    faucet(x, 13.42, 0.85, 0, 1);
  });
  furn(3.70, 13.352, 1.40, 0.004, 0.80, 1.10, matMirror, false, 0);
  furn(3.70, 13.35, 1.44, 0.006, 0.84, 1.08, matDark, false, 0);
  towel(2.37, 13.66, 1.30, 0.45, 1, 0, matSheet);
})();

// ============================================================
//  WC SOCIAL (x 2,35–4,85 · z 8,74–10,14)
// ============================================================
(function(){
  furn(2.775, 9.44, 0.85, 1.40, 0.02, 0, matGranite, false, 0);
  furn(3.20, 9.17, 0.008, 0.86, 1.90, 0.02, matGlass, true, 0);
  furn(3.20, 9.17, 0.025, 0.86, 0.025, 1.92, matMetal, false, 0.006);
  cyl(0.012, 0.012, 0.40, 10, matMetal, 2.78, 2.00, 8.76);
  const arm = cyl(0.01, 0.01, 0.18, 10, matMetal, 2.78, 2.19, 8.85); arm.rotation.x = Math.PI/2;
  cyl(0.10, 0.10, 0.02, 32, matMetal, 2.78, 2.17, 8.96);
  toilet(3.77, 9.11, 0, -1);
  sink(4.45, 8.97, 0, 1);
  furn(4.45, 8.746, 0.50, 0.004, 0.70, 1.05, matMirror, false, 0);
  furn(4.45, 8.744, 0.54, 0.006, 0.74, 1.03, matDark, false, 0);
  furn(3.40, 8.76, 0.12, 0.02, 0.10, 0.65, matMetal, false, 0.004);
  towel(3.60, 10.14, 1.30, 0.45, 0, -1, matThrow);
})();

// ============================================================
//  ÁREA DE SERVIÇO (pátio aberto x 6,35–9,80 · z 10,34–15,94)
// ============================================================
(function(){
  const T = orient(6.65, 10.85, 1, 0);
  T(0, 0, 0.55, 0.58, 0.80, 0, matCabinet, true, 0);
  cabDoors(6.94, 10.85, 0.55, 0.76, 0.02, 1, 1, 0, matCabinet);
  T(0, 0, 0.60, 0.62, 0.06, 0.80, matWhite, false, 0.015);
  T(0, 0.04, 0.46, 0.40, 0.005, 0.861, matDark, false, 0);
  T(0, -0.21, 0.52, 0.14, 0.08, 0.86, matWhite, false, 0.01);
  faucet(6.38, 10.85, 1.00, 1, 0);
  // máquina de lavar frontal 0,60 × 0,60 × 0,85
  furn(6.65, 11.70, 0.60, 0.60, 0.85, 0.02, matWhite, true, 0.02, 2);
  const port = cyl(0.20, 0.20, 0.03, 36, matSteel, 6.96, 0.42, 11.70); port.rotation.z = Math.PI/2;
  const glass = cyl(0.15, 0.15, 0.035, 36, matBlack, 6.965, 0.42, 11.70); glass.rotation.z = Math.PI/2;
  furn(6.953, 11.70, 0.008, 0.56, 0.10, 0.74, matDark, false, 0.004);
  furn(6.96, 11.85, 0.01, 0.06, 0.04, 0.77, matScreen, false, 0);
  furn(6.50, 11.30, 0.30, 1.40, 0.025, 1.55, matWood, false);
  [[10.75,BOOKS[1],0.24],[11.00,BOOKS[3],0.20],[11.35,BOOKS[0],0.26],[11.70,BOOKS[5],0.18],[11.90,BOOKS[4],0.22]]
    .forEach(([z,m,h])=> furn(6.50, z, 0.12, 0.12, h, 1.575, m, false, 0.02, 2));
  cyl(0.22, 0.18, 0.50, 28, matCabinet, 7.35, 0.25, 12.40);
  // varal de chão sanfonado 1,30 × 0,55 × 1,00
  [[7.45,14.60],[7.45,15.15],[8.75,14.60],[8.75,15.15]].forEach(([x,z])=> furn(x, z, 0.02, 0.02, 1.00, 0, matMetal, false, 0));
  [14.65, 14.80, 14.95, 15.10].forEach(z=> box(8.10, 1.00, z, 1.30, 0.006, 0.006, matRope, false));
  furn(7.80, 14.80, 0.40, 0.012, 0.45, 0.55, matSheet, false, 0.004);
  furn(8.40, 15.10, 0.30, 0.012, 0.60, 0.40, matThrow, false, 0.004);
  plant(9.40, 15.55, 1.1);
})();

// -- Churrasqueira de tijolinho no muro leste do pátio (porte de fogão 0,66 × 0,95)
(function(){
  const CX = 9.47, CZ = 13.475;
  const matEmber = std({ color:0x401008, emissive:0xff5a1e, emissiveIntensity:2.5, roughness:0.9 });
  furn(CX, CZ,        0.66, 0.95, 0.86, 0.00, matBrick, true, 0.004);
  furn(CX, CZ,        0.72, 1.01, 0.04, 0.86, matGranite, false, 0.006);
  furn(CX, CZ-0.42,   0.66, 0.11, 0.62, 0.90, matBrick, false, 0.004);
  furn(CX, CZ+0.42,   0.66, 0.11, 0.62, 0.90, matBrick, false, 0.004);
  furn(CX+0.28, CZ,   0.11, 0.95, 0.62, 0.90, matBrick, false, 0.004);
  furn(CX-0.05, CZ,   0.50, 0.70, 0.06, 0.90, matDark,  false, 0);
  furn(CX-0.05, CZ,   0.46, 0.64, 0.02, 0.96, matEmber, false, 0);
  for(let i=0;i<12;i++) furn(CX-0.05, CZ-0.33+i*0.06, 0.52, 0.006, 0.006, 1.03, matMetal, false, 0); // grelha
  furn(CX, CZ,        0.72, 1.01, 0.26, 1.52, matBrick, false, 0.004);
  furn(CX, CZ,        0.34, 0.36, 0.62, 1.78, matBrick, false, 0.004);
  furn(CX, CZ,        0.46, 0.48, 0.08, 2.40, matBrick, false, 0.004);
  [-0.25, 0, 0.25].forEach((d,i)=> box(CX-0.02 - i*0.03, 1.26, CZ+d, 0.55, 0.008, 0.008, matMetal, false));
  furn(CX, 14.45, 0.66, 0.90, 0.86, 0.0, matBrick, true, 0.004);
  furn(CX, 14.45, 0.72, 0.96, 0.04, 0.86, matGranite, false, 0.006);
})();

// ============================================================
//  VIZINHANÇA (BUILD 20) — casas dos dois lados, da frente e de trás.
//  Lote padrão de bairro 10 × 20, recuo frontal de 2 m, térrea (2,85–3,15)
//  ou sobrado (5,75), muro de 1,90–2,30 com portão de garagem 3,60 e social
//  1,00. Cada lote é um platô no nível da rua em declive (lotY), com arrimo.
//  Gerado com semente fixa: a rua é sempre a mesma.
// ============================================================
const lotY = xc => sideY(xc) + 0.56;            // o nosso lote (centro x 5) dá 0
(function(){
  let seed = 20261006;
  const R = ()=>{ seed = (seed*16807) % 2147483647; return (seed-1)/2147483646; };
  const pick = a => a[(R()*a.length)|0];
  const range = (a,b)=> a + R()*(b-a);
  const EXT = [0xf3ead9, 0xdcc9a6, 0xbfd3d9, 0xeacba2, 0xc9d3b9, 0xe9e4dc, 0xd8b9a8, 0xb8c4cf, 0xf0d9c4]
    .map(c=>{ const m = matExt.clone(); m.color.setHex(c); m.aoMap = null; return m; });
  const EXTG = EXT.map(m=>{ const g = m.clone(); g.side = THREE.DoubleSide; return g; });
  const MUROS = [0xd9d2c4, 0xc9c1b2, 0xe6e0d4, 0xbdb4a3]
    .map(c=>{ const m = matMuro.clone(); m.color.setHex(c); m.aoMap = null; return m; });
  const GATES = [0x3a3d42, 0x5a4636, 0xe8e6e0, 0x2f4a3a, 0x6d7278]
    .map(c=> std({ map:T_GATE.map, normalMap:T_GATE.normalMap, color:c, roughness:0.45, metalness:0.35 }));
  const nGlass = std({ color:0x1d2830, roughness:0.06, metalness:0.0, envMapIntensity:1.3 });
  const FRAMES = [std({ color:0xf3f1ec, roughness:0.4 }), std({ color:0x9aa0a6, roughness:0.35, metalness:0.6 }),
                  std({ color:0x3b3026, roughness:0.5 })];
  const pave = std(withSet(T_CONC, { color:0xd2cdc2, roughness:1.0 }));
  const lawn = std(withSet(T_GROUND, { roughness:1.0 }));

  // lote em x0..x0+10; rua no alinhamento zs; o lote cresce na direção dz (+1/-1)
  function lot(x0, zs, dz, opt){
    const gy = lotY(x0 + 5);
    const lowY = Math.min(sideY(x0), sideY(x0+10)) - 0.6;
    // caixa em coordenadas do lote: u = 0..10 (x), v = 0..20 (da rua pra dentro)
    const B = (u0,u1,v0,v1,y0,y1,mat,r)=>{
      const za = zs + dz*v0, zb = zs + dz*v1;
      return box(x0+(u0+u1)/2, (y0+y1)/2, (za+zb)/2, u1-u0, y1-y0, Math.abs(zb-za), mat, false, r);
    };
    // ---- casa ----
    const depth = range(9.5, 13.5), two = R() < 0.35;
    const hh = two ? 5.75 : range(2.85, 3.15);
    const gapL = R() < 0.5;                               // recuo lateral de 1,30 num dos lados
    const ua = gapL ? 1.5 : 0.2, ub = gapL ? 9.8 : 8.5;
    const v0 = 2.0, v1 = 2.0 + depth;
    const ei = (R()*EXT.length)|0, mm = pick(MUROS);
    // terreno (arrimo) + piso cimentado + gramado no fundo
    B(0.005, 9.995, 0.01, 19.99, lowY, gy, MUROS[0], 0);
    B(0.2, 9.8, 0.19, v1+0.3, gy, gy+0.012, pave, 0);
    B(0.2, 9.8, v1+0.3, 19.8, gy, gy+0.02, lawn, 0);
    B(ua, ub, v0, v1, gy-0.05, gy+hh, EXT[ei], 0);
    // telhado de duas águas, cumeeira paralela à rua, beiral 0,60
    const zA = Math.min(zs+dz*v0, zs+dz*v1), zB = Math.max(zs+dz*v0, zs+dz*v1);
    const zc = (zA+zB)/2, OV = 0.6;
    pitchedRoof(x0+Math.max(0.2, ua-OV), x0+Math.min(9.8, ub+OV), zA-OV, zB+OV, zc, gy+hh+PITCH*(zc-zA),
      [{x:x0+ua-0.003, za:zA, zb:zB}, {x:x0+ub+0.003, za:zA, zb:zB}], gy+hh, EXTG[ei]);
    // ---- esquadrias: marco + vidro escuro + encontro das folhas + peitoril ----
    const fr = pick(FRAMES);
    const win = (face, a, y0, w, h, isDoor)=>{
      let x, z, nx = 0, nz = 0;
      if(face === 'front'){ x = x0 + a; z = zs + dz*v0; nz = -dz; }
      else if(face === 'back'){ x = x0 + a; z = zs + dz*v1; nz = dz; }
      else { z = zs + dz*a; x = x0 + (face === 'left' ? ua : ub); nx = face === 'left' ? -1 : 1; }
      const put = (off, ww, h2, th, yb, mat)=>{
        if(nz) box(x, yb+h2/2, z + nz*off, ww, h2, th, mat, false, 0.004);
        else   box(x + nx*off, yb+h2/2, z, th, h2, ww, mat, false, 0.004);
      };
      put(0.02, w+0.10, h+0.10, 0.04, y0-0.05, fr);
      put(0.035, w, h, 0.012, y0, isDoor ? matWoodDk : nGlass);
      if(!isDoor){
        put(0.045, 0.04, h, 0.02, y0, fr);
        put(0.05, w+0.20, 0.04, 0.10, y0-0.06, MUROS[2]);
      }
    };
    const mid = (ua+ub)/2;
    win('front', gapL ? ua+1.0 : ub-1.0, gy, 0.90, 2.10, true);            // porta
    win('front', mid, gy+1.0, 1.20, 1.10);
    win('front', gapL ? ub-1.3 : ua+1.3, gy+1.0, 1.20, 1.10);
    if(two) [ua+1.5, mid, ub-1.5].forEach(a=> win('front', a, gy+3.85, 1.20, 1.10));
    for(let v = v0+2.5; v < v1-1.0; v += 3.2){
      win(gapL ? 'left' : 'right', v, gy+1.1, 1.0, 1.0);
      if(two) win(gapL ? 'left' : 'right', v, gy+3.95, 1.0, 1.0);
    }
    win('back', ua+2.0, gy+1.0, 1.20, 1.10); win('back', ub-2.0, gy+1.6, 0.60, 0.50);
    // ---- muro da frente com portão da garagem (3,60) e social (1,00) ----
    const mh = range(1.9, 2.3), low = R() < 0.3, gate = pick(GATES);
    const gL = R() < 0.5;
    const holes = gL ? [[0.4, 4.0], [5.0, 6.0]] : [[3.6, 4.6], [6.0, 9.6]];
    let cu = 0;
    for(const [a, b] of holes.concat([[10, 10]])){
      if(a - cu > 0.01){
        if(low){
          B(cu, a, 0, 0.19, lowY, gy+0.6, mm, 0.006);
          B(cu, a, 0.07, 0.12, gy+0.6, gy+mh, gate, 0.004);            // gradil sobre mureta
        } else B(cu, a, 0, 0.19, lowY, gy+mh, mm, 0.006);
        B(cu, a, -0.015, 0.205, gy+(low ? 0.6 : mh), gy+(low ? 0.64 : mh+0.04), MUROS[2], 0.006); // capa
      }
      if(b > a){
        B(a, b, 0, 0.19, lowY, gy, mm, 0);                             // fundação sob o portão
        B(a, b, 0.07, 0.12, gy, gy+Math.min(2.2, mh+0.05), gate, 0.004);
      }
      cu = b;
    }
    // ---- divisas ----
    if(!opt.noLeft) B(0, 0.2, 0.19, 19.8, lowY, gy+2.2, mm, 0);
    if(opt.back)    B(0, 10, 19.8, 20, lowY, gy+2.2, mm, 0);
    // ---- plantas: arbustos no recuo, árvore no fundo ----
    const dens = HQ ? 0.6 : 0.35;
    shrub(x0 + range(1.0, 3.0), zs + dz*1.1, range(0.30, 0.45), gy, dens);
    shrub(x0 + range(6.5, 9.0), zs + dz*1.2, range(0.28, 0.42), gy, dens);
    if(HQ && v1 + 3.0 < 19.0 && R() < 0.6) tree(x0 + range(2.5, 7.5), zs + dz*(v1 + range(2.0, 3.5)), range(3.5, 5.0), gy, 0.5);
  }

  const FRONT = HQ ? [-40,-30,-20,-10,10,20,30,40] : [-20,-10,10,20];
  for(const x0 of FRONT) lot(x0, 0, 1, { noLeft: x0 === 10, back:true });          // nosso lado
  const OPPO = HQ ? [-45,-35,-25,-15,-5,5,15,25,35,45] : [-25,-15,-5,5,15,25];
  for(const x0 of OPPO) lot(x0, OPP_Z, -1, {});                                    // do outro lado da rua
  const REAR = HQ ? [-30,-20,-10,0,10,20,30] : [-10,0,10];
  for(const x0 of REAR) lot(x0, 40, -1, {});                                       // fundos (rua paralela)

  // arrimo sob o nosso muro leste: o vizinho da direita está 1 m mais baixo
  box(9.895, -0.985, 10.0925, 0.19, 1.73, 19.805, matMuro, false);   // z 0,19–19,995 (não encosta no muro da frente)

  // ============================================================
  //  POSTES DE CONCRETO + FIAÇÃO (média tensão na cruzeta, baixa tensão na
  //  armação secundária, cabos de telecom embaixo), transformador, braço com
  //  luminária LED e o ramal de entrada descendo até o nosso padrão.
  // ============================================================
  const matPole  = std(withSet(T_CONC, { color:0xbcb8b0, roughness:0.9 }));
  const matWire  = std({ color:0x18191b, roughness:0.6 });
  const matInsul = std({ color:0x9fb6a4, roughness:0.2 });
  const POLES = [-83.0, -52.0, -21.0, 9.60, 40.2, 71.0, 102.0];
  const PZ = -1.70;
  for(const px_ of POLES){
    const b = sideY(px_);
    cyl(0.085, 0.14, 10.5, 12, matPole, px_, b + 5.25, PZ);
    box(px_, b+9.75, PZ, 0.10, 0.10, 2.0, matPole, false, 0.01);                 // cruzeta
    [-0.85, 0, 0.85].forEach(d=> cyl(0.035, 0.05, 0.16, 10, matInsul, px_, b+9.88, PZ+d));
    box(px_+0.10, b+7.25, PZ, 0.05, 0.75, 0.08, matMetal, false, 0.006);         // armação secundária
    box(px_, b+5.42, PZ-0.10, 0.18, 0.28, 0.06, matDark, false, 0.01);           // suporte de telecom
    box(px_, b+8.42, PZ-0.75, 0.05, 0.05, 1.50, matPole, false, 0.01);           // braço da luminária
    box(px_, b+8.36, PZ-1.55, 0.28, 0.07, 0.52, matDark, false, 0.02);           // luminária LED
    box(px_, b+8.32, PZ-1.55, 0.22, 0.008, 0.42, matCabinet, false, 0);
  }
  cyl(0.30, 0.30, 0.95, 18, matSteel, 9.60, sideY(9.60) + 8.15, PZ + 0.42);     // transformador
  box(9.60, sideY(9.60) + 8.70, PZ + 0.42, 0.62, 0.06, 0.20, matSteel, false, 0.01);
  const wire = (ax,ay,az, bx,by,bz, sag, r, mat)=>{
    const A = new THREE.Vector3(ax,ay,az), Bv = new THREE.Vector3(bx,by,bz);
    const C = A.clone().lerp(Bv, 0.5); C.y -= sag*2;               // controle da Bézier = 2× a flecha
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, C, Bv), 28, r, 5, false), mat);
    m.castShadow = true; m.receiveShadow = false; m.userData.room = null; world.add(m);
  };
  for(let i=0;i<POLES.length-1;i++){
    const a = POLES[i], b = POLES[i+1], ya = sideY(a), yb = sideY(b);
    [-0.85, 0, 0.85].forEach(d=> wire(a, ya+9.96, PZ+d, b, yb+9.96, PZ+d, 0.35, 0.007, matWire));
    [7.55, 7.35, 7.15, 6.95].forEach(h=> wire(a+0.12, ya+h, PZ, b+0.12, yb+h, PZ, 0.45, 0.009, matWire));
    [5.55, 5.44, 5.33].forEach((h,k)=> wire(a, ya+h, PZ-0.10-k*0.03, b, yb+h, PZ-0.10-k*0.03, 0.60, 0.012, matWire));
  }
  // ramal de entrada: mastro no padrão (1,60 -> 4,20) e o cabo vindo do poste
  cyl(0.025, 0.025, 2.60, 10, matMetal, 9.58, 2.90, 0.30);
  cyl(0.05, 0.03, 0.10, 10, matDark, 9.58, 4.25, 0.30);
  wire(9.72, sideY(9.60)+7.35, PZ, 9.58, 4.22, 0.30, 0.25, 0.008, matWire);

  // ---- árvores de calçada em canteiro (oitis/ipês de 4,5–6,5 m) ----
  const pit = (x, z)=> box(x, sideY(x)+0.006, z, 0.90, 0.012, 0.90, matSoil, false, 0);
  [[-15.5,-1.45,5.5],[15.5,-1.45,6.2],[26.0,-1.45,4.8],[34.5,-1.45,5.8],
   [-28.0,-9.55,6.0],[-8.0,-9.55,5.0],[3.0,-9.55,5.6],[18.0,-9.55,6.4],[31.0,-9.55,5.2]]
    .forEach(([x,z,h])=>{ pit(x,z); tree(x, z, h, sideY(x), 0.6); });

  // ---- carros estacionados junto à guia (acompanham o declive) ----
  const tilt = Math.atan(0.108);
  car(-6.5, roadY(-6.5), -3.05,  Math.PI/2,  tilt, carPaint(0xe9ebee));
  car(29.0, roadY(29.0), -3.05,  Math.PI/2,  tilt, carPaint(0x1c1e22));
  car(17.5, roadY(17.5), -7.95, -Math.PI/2, -tilt, carPaint(0xa7adb3));
  car(-31.0, roadY(-31.0), -7.95, -Math.PI/2, -tilt, carPaint(0x6e1f22));

  // ---- lixeiras elevadas, bueiros, boca de lobo ----
  const bin = (x, z)=>{
    const b = sideY(x);
    cyl(0.03, 0.03, 1.0, 8, matDark, x, b+0.5, z);
    box(x, b+1.12, z, 0.60, 0.30, 0.38, GATES[0], false, 0.01);
  };
  bin(8.90, -0.40); bin(-3.5, -0.40); bin(13.5, -0.40); bin(14.0, -10.62); bin(-12.0, -10.62);
  [[5.0,-5.5],[33.0,-5.5],[-24.0,-5.5]].forEach(([x,z])=>
    cyl(0.32, 0.32, 0.04, 24, matDark, x, roadY(x)+0.004, z));
  box(36.0, roadY(36.0)+0.08, -2.03, 1.00, 0.12, 0.06, matDark, false, 0);
  box(36.0, roadY(36.0)+0.004, -2.18, 1.00, 0.012, 0.30, matDark, false, 0);
})();

// ============================================================
//  CORREDOR LATERAL + QUINTAL (área permeável)
// ============================================================
(function(){
  for(let z = 6.15; z < 15.8; z += 0.56) furn(0.87, z+0.25, 1.00, 0.50, 0.03, -0.04, matStone, false, 0.012);
  tree(8.40, 18.40, 3.2);
  box(5.0, -0.02, 19.54, 9.40, 0.06, 0.50, matSoil, false);
  for(let i=0;i<11;i++) shrub(0.65 + i*0.86, 19.50, 0.24 + (i%3)*0.04);
  const matBloom = [std({ color:0xd9556b, roughness:0.7 }), std({ color:0xe8c341, roughness:0.7 }), std({ color:0xf3efe6, roughness:0.7 })];
  for(let i=0;i<40;i++) sph(0.03, matBloom[i%3], rnd(0.5, 9.5), rnd(0.30, 0.48), 19.30 + rnd(-0.05, 0.12));
  [[1.0,17.2,0.30],[3.2,17.0,0.26],[0.6,15.2,0.28],[0.5,10.4,0.24]].forEach(([x,z,r])=> shrub(x,z,r));
})();

// ============================================================
//  GRAMA INSTANCIADA (lâminas curvas com gradiente da base pra ponta)
// ============================================================
(function(){
  const g = new THREE.PlaneGeometry(0.03, 1, 1, 4);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position, col = [];
  for(let i=0;i<p.count;i++){
    const y = p.getY(i);
    p.setX(i, p.getX(i) * (1 - y*0.9));
    p.setZ(i, y*y*0.22);
    const v = 0.45 + 0.55*y; col.push(v, v, v);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const nr = g.attributes.normal;
  for(let i=0;i<nr.count;i++) nr.setXYZ(i, 0, 1, 0);      // normal pra cima: grama "acende" como o chão
  const areas = [{x0:0.22,x1:2.13,z0:8.76,z1:15.92}, {x0:0.22,x1:9.78,z0:15.96,z1:19.28}];
  const tot = areas.reduce((s,a)=> s + (a.x1-a.x0)*(a.z1-a.z0), 0);
  const N = HQ ? 22000 : 8000;
  const mat = std({ vertexColors:true, roughness:0.8, side:THREE.DoubleSide });
  const im = new THREE.InstancedMesh(g, mat, N);
  const o = new THREE.Object3D(), c = new THREE.Color();
  let n = 0, guard = 0;
  while(n < N && guard++ < N*4){
    let r = Math.random()*tot, a = areas[0];
    for(const ar of areas){ const s = (ar.x1-ar.x0)*(ar.z1-ar.z0); if(r < s){ a = ar; break; } r -= s; }
    const x = rnd(a.x0, a.x1), z = rnd(a.z0, a.z1);
    if(x > 0.35 && x < 1.39 && z < 15.95 && ((z - 6.15) % 0.56) < 0.52) continue;   // pisantes
    if(Math.hypot(x-8.40, z-18.40) < 0.14) continue;                                 // tronco
    o.position.set(x, -0.04, z);
    o.rotation.set(rnd(-0.15,0.15), Math.random()*Math.PI*2, 0);
    const h = rnd(0.05, 0.13) * (z > 15.9 && z < 16.8 ? 0.8 : 1);
    o.scale.set(rnd(0.8, 1.5), h, 1);
    o.updateMatrix(); im.setMatrixAt(n, o.matrix);
    c.setHSL(rnd(0.22, 0.30), rnd(0.45, 0.65), rnd(0.22, 0.36)); im.setColorAt(n, c);
    n++;
  }
  im.count = n;
  im.receiveShadow = true; im.castShadow = false;
  world.add(im);
})();

// ---- folhas: um único InstancedMesh pra todas as plantas ----
(function(){
  if(!LEAVES.length) return;
  const mat = std({ map:T_LEAF, alphaTest:0.5, side:THREE.DoubleSide, roughness:0.65 });
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, LEAVES.length);
  const o = new THREE.Object3D();
  LEAVES.forEach((L, i)=>{
    o.position.set(L.x, L.y, L.z);
    o.rotation.set(rnd(0, Math.PI), rnd(0, Math.PI*2), rnd(0, Math.PI));
    o.scale.set(L.s*0.6, L.s, 1);
    o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, L.c);
  });
  im.castShadow = true; im.receiveShadow = true;
  im.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking:THREE.RGBADepthPacking, map:T_LEAF, alphaTest:0.5 });
  world.add(im);
})();

// ============================================================
//  FINALIZAÇÃO: AO dos pisos/forros · material por cômodo · fusão · sondas
// ============================================================
const probeMats = {};            // chave da sonda -> materiais que recebem o envMap dela
const _roomMat = {};
function roomMat(mat, key){
  const k = mat.uuid + '|' + key;
  let m = _roomMat[k];
  if(!m){ m = mat.clone(); _roomMat[k] = m; (probeMats[key] = probeMats[key] || []).push(m); }
  return m;
}
// mapa de AO de um retângulo: cantos escuros + sombra suave sob os móveis
function rectAO(r, withFeet){
  const PPM = 40, W = Math.max(8, Math.min(256, Math.round((r.x1-r.x0)*PPM))),
        Hh = Math.max(8, Math.min(256, Math.round((r.z1-r.z0)*PPM)));
  const c = cnv(W, Hh), g = c.getContext('2d');
  const sx = W/(r.x1-r.x0), sz = Hh/(r.z1-r.z0);
  g.fillStyle = '#fff'; g.fillRect(0,0,W,Hh);
  const edge = (x0,y0,x1,y1)=>{
    const grd = g.createLinearGradient(x0,y0,x1,y1);
    grd.addColorStop(0, 'rgba(0,0,0,.42)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0,0,W,Hh);
  };
  const e = 0.38;
  edge(0,0, e*sx,0); edge(W,0, W-e*sx,0); edge(0,0, 0,e*sz); edge(0,Hh, 0,Hh-e*sz);
  if(withFeet) for(const f of footprints){
    if(f.x1 < r.x0 || f.x0 > r.x1 || f.z1 < r.z0 || f.z0 > r.z1) continue;
    const str = Math.min(0.5, 0.12 + f.h*0.22), spread = Math.min(0.22, 0.03 + f.h*0.08);
    for(let k=5;k>=0;k--){
      const ex = spread*k/5;
      g.fillStyle = 'rgba(0,0,0,'+(str/4.5).toFixed(3)+')';
      g.fillRect((f.x0-ex-r.x0)*sx, (f.z0-ex-r.z0)*sz, (f.x1-f.x0+2*ex)*sx, (f.z1-f.z0+2*ex)*sz);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; t.channel = 1;
  return t;
}
// O PlaneGeometry deitado tem v=1 em z0 (piso) e v=1 em z1 (forro); o canvas
// tem z0 no topo -> piso usa direto; forro é simétrico (só cantos), tanto faz.
for(const { mesh, r } of floorMeshes){
  const f = FLOORSET[r.f];
  const m = std(withSet(f.set, { color:f.color || 0xffffff, roughness:f.rough, aoMap:rectAO(r, true), aoMapIntensity:1.0 }));
  mesh.material = m;
  if(r.indoor) (probeMats[PROBE[r.k]] = probeMats[PROBE[r.k]] || []).push(m);
}
for(const { mesh, r } of ceilMeshes){
  const m = std({ color:0xf8f6f1, roughness:0.95, aoMap:rectAO(r, false), aoMapIntensity:1.0 });
  mesh.material = m;
  (probeMats[PROBE[r.k]] = probeMats[PROBE[r.k]] || []).push(m);
}

// ---- fusão: todas as malhas estáticas viram 1 malha por material ----
// (material já trocado pela versão "do cômodo"; uv1 = altura do mundo p/ a AO vertical)
(function mergeWorld(){
  world.updateMatrixWorld(true);
  const groups = new Map(), list = [];
  const v = new THREE.Vector3(), nv3 = new THREE.Vector3(), nm = new THREE.Matrix3();
  world.traverse(o=>{ if(o.isMesh && !o.isInstancedMesh) list.push(o); });
  for(const o of list){
    if(!Array.isArray(o.material) && o.material.isMeshStandardMaterial && !o.userData.noMerge){
      let room = o.userData.room;
      if(room === undefined){
        if(!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        o.geometry.boundingBox.getCenter(v).applyMatrix4(o.matrixWorld);
        room = roomKeyAt(v.x, v.z, 0.03);
      }
      if(room) o.material = roomMat(o.material, room);
    }
    if(o.userData.noMerge || Array.isArray(o.material)) continue;
    let g = groups.get(o.material);
    if(!g) groups.set(o.material, g = []);
    g.push(o);
  }
  for(const [mat, meshes] of groups){
    let nVert = 0, nIdx = 0;
    for(const o of meshes){
      const geo = o.geometry;
      nVert += geo.attributes.position.count;
      nIdx += geo.index ? geo.index.count : geo.attributes.position.count;
    }
    const P = new Float32Array(nVert*3), N = new Float32Array(nVert*3),
          U = new Float32Array(nVert*2), U1 = new Float32Array(nVert*2), I = new Uint32Array(nIdx);
    let vo = 0, io = 0;
    for(const o of meshes){
      const geo = o.geometry, pa = geo.attributes.position, na = geo.attributes.normal, ua = geo.attributes.uv;
      nm.getNormalMatrix(o.matrixWorld);
      for(let i=0;i<pa.count;i++){
        v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
        const j = (vo+i)*3, k = (vo+i)*2;
        P[j] = v.x; P[j+1] = v.y; P[j+2] = v.z;
        nv3.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
        N[j] = nv3.x; N[j+1] = nv3.y; N[j+2] = nv3.z;
        U[k] = ua ? ua.getX(i) : 0; U[k+1] = ua ? ua.getY(i) : 0;
        U1[k] = 0.5; U1[k+1] = (v.y + 1)/4;
      }
      if(geo.index){ const ix = geo.index.array; for(let q=0;q<ix.length;q++) I[io+q] = ix[q] + vo; io += ix.length; }
      else { for(let q=0;q<pa.count;q++) I[io+q] = vo + q; io += pa.count; }
      vo += pa.count;
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(P, 3));
    mg.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    mg.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    mg.setAttribute('uv1', new THREE.BufferAttribute(U1, 2));
    mg.setIndex(new THREE.BufferAttribute(I, 1));
    mg.computeBoundingSphere(); mg.computeBoundingBox();
    const mm = new THREE.Mesh(mg, mat);
    mm.castShadow = !mat.transparent; mm.receiveShadow = true;
    world.add(mm);
    for(const o of meshes) o.parent.remove(o);
  }
  for(const k in _geo) delete _geo[k];      // malhas originais já viraram lixo
})();

// ============================================================
//  LUMINÁRIAS DINÂMICAS — N luzes fixas que "pulam" pras lâmpadas mais
//  próximas do jogador (o número de luzes nunca muda: zero recompilação).
// ============================================================
const NL = HQ ? 4 : 2, LAMP_I = 1.6;
const lamps = [];
for(let i=0;i<NL;i++){
  const l = new THREE.PointLight(0xffd7a6, 0, 6.5, 2);
  l.castShadow = false; scene.add(l);
  lamps.push({ l, spot:-1, k:0 });
}

// ============================================================
//  SONDAS DE LUZ POR CÔMODO (reflexo + luz rebatida)
//  Cada cômodo fotografa o próprio entorno num cubo HDR; esse cubo vira o
//  envMap dos materiais do cômodo. Duas passadas = duas "rebatidas" de luz:
//  o interior deixa de ser iluminado pelo céu através das paredes.
// ============================================================
(function bakeProbes(){
  const RES = HQ ? 128 : 64;
  let rt, cam, pmrem;
  // HDR (half float) só se o aparelho consegue RENDERIZAR nesse formato; senão 8 bits
  const ext = renderer.extensions;
  const hdr = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float');
  try {
    rt = new THREE.WebGLCubeRenderTarget(RES, { type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType });
    cam = new THREE.CubeCamera(0.05, 40, rt);
    pmrem = new THREE.PMREMGenerator(renderer);
  } catch(e){ return; }
  scene.add(cam);
  const centers = {};
  for(const r of INDOOR){
    const key = PROBE[r.k];
    if(!centers[key]) centers[key] = new THREE.Vector3((r.x0+r.x1)/2, 1.30, (r.z0+r.z1)/2);
  }
  const envs = {};
  for(let pass=0; pass<2; pass++){
    for(const key in centers){
      cam.position.copy(centers[key]);
      cam.update(renderer, scene);
      const out = pmrem.fromCubemap(rt.texture);
      const old = envs[key]; envs[key] = out;
      for(const m of (probeMats[key] || [])){ m.envMap = out.texture; m.needsUpdate = true; }
      if(old) old.dispose();
    }
  }
  scene.remove(cam); rt.dispose(); pmrem.dispose();
  renderer.setRenderTarget(null);
})();

// ============================================================
//  JOGADOR / CONTROLES
// ============================================================
const player = { x:7.38, z:-1.0, yaw:0, pitch:0, eye:1.6, radius:0.24, lift:0 };
let started = false;
let noclip = true;    // modo topografia — atravessa paredes por padrão

function roomAt(x,z){
  for(const r of ROOMS){ if(x>=r.x0 && x<=r.x1 && z>=r.z0 && z<=r.z1) return r; }
  return null;
}
function floorYAt(x,z){
  if(z < 0){
    if(z >= -CALC || (z <= ST_Z0 && z >= OPP_Z)) return sideY(x);        // calçadas
    if(z > ST_Z0) return roadY(x);                                       // leito da rua
    return lotY(Math.round(x/10)*10) + 0.012;                            // lotes do outro lado
  }
  if(x < 0 || x > 10 || z > ZMAX) return lotY(Math.floor(x/10)*10 + 5) + 0.012;   // lotes vizinhos
  const r = roomAt(x,z);
  if(!r) return 0.0;
  if(r.slope) return r.slope[0] + (z-r.z0)/(r.z1-r.z0)*(r.slope[1]-r.slope[0]);
  return r.fy;
}
function roomNameAt(x,z){
  const r = roomAt(x,z);
  if(r) return r.name;
  if(z < 0 && (z >= -CALC || (z <= ST_Z0 && z >= OPP_Z))) return 'Sidewalk';
  if(z < 0 && z > ST_Z0) return 'Street';
  if(z < 0 || x < 0 || x > 10 || z > ZMAX) return "Neighbor's Lot";
  return 'Outside';
}

function resolve(px,pz,dx,dz){
  const r = player.radius;
  let nx = px+dx, nz = pz+dz;
  if(!noclip){
    for(const c of colliders){
      if(nx > c.minx-r && nx < c.maxx+r && pz > c.minz-r && pz < c.maxz+r){
        nx = dx > 0 ? Math.min(nx, c.minx-r) : Math.max(nx, c.maxx+r);
      }
    }
    for(const c of colliders){
      if(nx > c.minx-r && nx < c.maxx+r && nz > c.minz-r && nz < c.maxz+r){
        nz = dz > 0 ? Math.min(nz, c.minz-r) : Math.max(nz, c.maxz+r);
      }
    }
  }
  // noclip: anda pelo bairro todo; paredes ligadas: rua e calçadas livres, dentro do lote preso nele
  const street = nz < 0.05;
  const xlo = noclip ? -60 : street ? -60 : 0.25, xhi = noclip ? 70 : street ? 70 : 9.75;
  const zlo = noclip ? -35 : OPP_Z + 0.25,       zhi = noclip ? 45 : ZMAX - 0.25;
  nx = Math.max(xlo, Math.min(xhi, nx));
  nz = Math.max(zlo, Math.min(zhi, nz));
  return [nx,nz];
}

// ---- teclado ----
const keys = {};
addEventListener('keydown', e=>{ keys[e.code]=true; });
addEventListener('keyup',   e=>{ keys[e.code]=false; });

// ---- mouse look (pointer lock no desktop) ----
canvas.addEventListener('click', ()=>{ if(started && !isTouch) canvas.requestPointerLock?.(); });
document.addEventListener('mousemove', e=>{
  if(document.pointerLockElement === canvas){
    player.yaw   -= e.movementX * 0.0022;
    player.pitch -= e.movementY * 0.0022;
    clampPitch();
  }
});
function clampPitch(){ player.pitch = Math.max(-1.35, Math.min(1.35, player.pitch)); }

// ---- toque: joystick esquerdo (mover) + arrasto direito (olhar) ----
const stick = { active:false, id:-1, ox:0, oy:0, dx:0, dy:0 };
const look  = { active:false, id:-1, lx:0, ly:0 };
const stickEl = document.getElementById('stick');
const nubEl   = document.getElementById('nub');

function onTouchStart(e){
  for(const t of e.changedTouches){
    if(t.clientX < window.innerWidth*0.45 && !stick.active){
      stick.active=true; stick.id=t.identifier; stick.ox=t.clientX; stick.oy=t.clientY; stick.dx=0; stick.dy=0;
      stickEl.style.display='block';
      stickEl.style.left=(t.clientX-60)+'px'; stickEl.style.top=(t.clientY-60)+'px';
      nubEl.style.left='30px'; nubEl.style.top='30px';
    } else if(!look.active){
      look.active=true; look.id=t.identifier; look.lx=t.clientX; look.ly=t.clientY;
    }
  }
  e.preventDefault();
}
function onTouchMove(e){
  for(const t of e.changedTouches){
    if(stick.active && t.identifier===stick.id){
      let dx=t.clientX-stick.ox, dy=t.clientY-stick.oy;
      const max=55, len=Math.hypot(dx,dy);
      if(len>max){ dx=dx/len*max; dy=dy/len*max; }
      stick.dx=dx/max; stick.dy=dy/max;
      nubEl.style.left=(30+dx)+'px'; nubEl.style.top=(30+dy)+'px';
    } else if(look.active && t.identifier===look.id){
      player.yaw   -= (t.clientX-look.lx) * 0.0045;
      player.pitch -= (t.clientY-look.ly) * 0.0045;
      clampPitch();
      look.lx=t.clientX; look.ly=t.clientY;
    }
  }
  e.preventDefault();
}
function onTouchEnd(e){
  for(const t of e.changedTouches){
    if(stick.active && t.identifier===stick.id){ stick.active=false; stick.dx=0; stick.dy=0; stickEl.style.display='none'; }
    if(look.active && t.identifier===look.id){ look.active=false; }
  }
}
canvas.addEventListener('touchstart', onTouchStart, {passive:false});
canvas.addEventListener('touchmove',  onTouchMove,  {passive:false});
canvas.addEventListener('touchend',   onTouchEnd);
canvas.addEventListener('touchcancel',onTouchEnd);

// ============================================================
//  HUD / MINIMAPA
// ============================================================
const roomEl = document.getElementById('room');
const mini = document.getElementById('mini');
const mctx = mini.getContext('2d');
const MW = 120, MH = 240;
mini.width = MW; mini.height = MH;
// Recorte = lote exato (faces externas dos muros), 64,68 px/m nos dois eixos.
const LOT = { x0:28, y0:64, x1:675, y1:1357 };
const planImg = new Image();
let planReady = false;
const planCanvas = document.createElement('canvas');
planCanvas.width = MW; planCanvas.height = MH;
planImg.onload = ()=>{
  planCanvas.getContext('2d').drawImage(planImg, LOT.x0, LOT.y0, LOT.x1-LOT.x0, LOT.y1-LOT.y0, 0, 0, MW, MH);
  planReady = true;
};
planImg.src = './house.jpeg?v=20';

function drawMini(){
  mctx.fillStyle = '#1c2530';
  mctx.fillRect(0, 0, MW, MH);
  if(planReady) mctx.drawImage(planCanvas, 0, 0);
  if(stakes.length){
    const px_ = s => (s.x/10)*MW, py = s => (1 - s.z/ZMAX)*MH;
    if(stakes.length > 1){
      mctx.strokeStyle='rgba(255,211,77,.9)'; mctx.lineWidth=1.5;
      mctx.beginPath(); mctx.moveTo(px_(stakes[0]), py(stakes[0]));
      for(let i=1;i<stakes.length;i++) mctx.lineTo(px_(stakes[i]), py(stakes[i]));
      mctx.closePath(); mctx.stroke();
    }
    mctx.fillStyle='#ffd34d';
    for(const s of stakes){ mctx.beginPath(); mctx.arc(px_(s),py(s),2.6,0,7); mctx.fill(); }
  }
  const cx = (player.x/10) * MW;
  const cy = (1 - player.z/ZMAX) * MH;
  mctx.strokeStyle='#ff2b2b'; mctx.lineWidth=2;
  mctx.beginPath(); mctx.moveTo(cx,cy);
  mctx.lineTo(cx + Math.sin(player.yaw)*13, cy - Math.cos(player.yaw)*13);
  mctx.stroke();
  mctx.fillStyle='#ff2b2b';
  mctx.beginPath(); mctx.arc(cx,cy,4,0,7); mctx.fill();
  mctx.strokeStyle='#fff'; mctx.lineWidth=1.5;
  mctx.beginPath(); mctx.arc(cx,cy,4,0,7); mctx.stroke();
}

// ============================================================
//  MODO TOPOGRAFIA — mira no chão, crava estacas, copia as cotas
// ============================================================
const stakes = [];
const stakeGroup = new THREE.Group(); scene.add(stakeGroup);
const matStake  = new THREE.MeshBasicMaterial({ color:0xff3b30 });
const matStakeT = new THREE.MeshBasicMaterial({ color:0xffd34d });
const geoPole = new THREE.CylinderGeometry(0.035,0.035,1.20,8);
const geoBall = new THREE.SphereGeometry(0.10,10,8);

const aimRing = new THREE.Mesh(
  new THREE.RingGeometry(0.11,0.18,24),
  new THREE.MeshBasicMaterial({ color:0xffd34d, side:THREE.DoubleSide, transparent:true, opacity:0.95 }));
aimRing.rotation.x = -Math.PI/2; aimRing.visible = false; scene.add(aimRing);

function aimPoint(){
  const dy = Math.sin(player.pitch);
  if(dy > -0.03) return null;
  const t = -camera.position.y / dy;
  if(!(t > 0) || t > 80) return null;
  const c = Math.cos(player.pitch);
  return { x: camera.position.x + Math.sin(player.yaw)*c*t,
           z: camera.position.z + Math.cos(player.yaw)*c*t };
}

const toastEl = document.getElementById('toast');
let toastT = 0;
function flash(msg){ toastEl.textContent = msg; toastEl.style.display='block'; toastT = 2.2; }

function addStake(){
  const p = aimPoint();
  if(!p){ flash('aim at the floor first'); return; }
  const pole = new THREE.Mesh(geoPole, matStake);  pole.position.set(p.x, 0.60, p.z);
  const ball = new THREE.Mesh(geoBall, matStakeT); ball.position.set(p.x, 1.26, p.z);
  stakeGroup.add(pole); stakeGroup.add(ball);
  stakes.push(p);
  flash('stake ' + stakes.length + ' · x ' + p.x.toFixed(2) + ' · z ' + p.z.toFixed(2));
}
function undoStake(){
  if(!stakes.length){ flash('nothing to undo'); return; }
  stakeGroup.remove(stakeGroup.children[stakeGroup.children.length-1]);
  stakeGroup.remove(stakeGroup.children[stakeGroup.children.length-1]);
  stakes.pop();
  flash(stakes.length + ' stake(s)');
}
function clearStakes(){
  while(stakeGroup.children.length) stakeGroup.remove(stakeGroup.children[0]);
  stakes.length = 0; flash('cleared');
}
function stakeText(){
  if(!stakes.length) return 'no stakes';
  const xs = stakes.map(s=>s.x), zs = stakes.map(s=>s.z);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const z0 = Math.min(...zs), z1 = Math.max(...zs);
  return 'BUILD ' + BUILD + ' — ' + stakes.length + ' stakes (metros, coord. de mundo)\n'
    + stakes.map((s,i)=> (i+1) + ': x=' + s.x.toFixed(2) + '  z=' + s.z.toFixed(2)).join('\n')
    + '\n\nbbox: x ' + x0.toFixed(2) + ' -> ' + x1.toFixed(2)
    + '   |   z ' + z0.toFixed(2) + ' -> ' + z1.toFixed(2)
    + '\nsize: ' + (x1-x0).toFixed(2) + ' x ' + (z1-z0).toFixed(2) + ' m';
}
const copyBox = document.getElementById('copybox');
const copyTxt = document.getElementById('copytext');
function copyStakes(){
  const t = stakeText();
  copyTxt.value = t;
  copyBox.style.display = 'flex';
  document.exitPointerLock?.();
  if(navigator.clipboard) navigator.clipboard.writeText(t).catch(()=>{});
  copyTxt.focus(); copyTxt.select();
}
function setNoclip(v){
  noclip = v;
  const b = document.getElementById('btnClip');
  b.textContent = 'WALLS ' + (noclip ? 'OFF' : 'ON');
  b.classList.toggle('on', !noclip);
  flash(noclip ? 'walls: no collision' : 'walls: solid');
}
function lift(d){
  player.lift = Math.max(0, Math.min(14, player.lift + d));
  flash('eye +' + player.lift.toFixed(1) + ' m');
}
// ---- qualidade: sombras liga/desliga + exposição ciclável ----
let shadowsOn = true;
function setShadows(v){
  shadowsOn = v;
  renderer.shadowMap.enabled = v;
  renderer.shadowMap.needsUpdate = true;
  scene.traverse(o=>{
    if(!o.isMesh) return;
    for(const m of (Array.isArray(o.material) ? o.material : [o.material])) m.needsUpdate = true;
  });
  const b = document.getElementById('btnShadow');
  b.textContent = 'SHADOW ' + (v ? 'ON' : 'OFF');
  b.classList.toggle('on', v);
  flash('shadows ' + (v ? 'on' : 'off'));
}
const EXPO = [0.75, 0.88, 1.00, 1.15, 1.32];
let expoI = 2;
function cycleExposure(){
  expoI = (expoI + 1) % EXPO.length;
  flash('exposure ' + EXPO[expoI].toFixed(2));
}

document.getElementById('btnStake').addEventListener('click', addStake);
document.getElementById('btnUndo') .addEventListener('click', undoStake);
document.getElementById('btnCopy') .addEventListener('click', copyStakes);
document.getElementById('btnClear').addEventListener('click', clearStakes);
document.getElementById('btnClip') .addEventListener('click', ()=> setNoclip(!noclip));
document.getElementById('btnShadow').addEventListener('click', ()=> setShadows(!shadowsOn));
document.getElementById('btnExpo') .addEventListener('click', cycleExposure);
document.getElementById('btnUp')   .addEventListener('click', ()=> lift(+0.8));
document.getElementById('btnDown') .addEventListener('click', ()=> lift(-0.8));
document.getElementById('copyclose').addEventListener('click', ()=>{ copyBox.style.display='none'; });

addEventListener('keydown', e=>{
  if(!started || e.repeat || copyBox.style.display === 'flex') return;
  switch(e.code){
    case 'Space': case 'KeyE': e.preventDefault(); addStake(); break;
    case 'KeyZ': undoStake(); break;
    case 'KeyC': copyStakes(); break;
    case 'KeyX': clearStakes(); break;
    case 'KeyN': setNoclip(!noclip); break;
    case 'KeyG': setShadows(!shadowsOn); break;
    case 'KeyB': cycleExposure(); break;
    case 'KeyR': lift(+0.8); break;
    case 'KeyF': lift(-0.8); break;
  }
});

const crossLbl = document.getElementById('crosslbl');

// ============================================================
//  LOOP
// ============================================================
let last = performance.now();
let adapt = 1.0;                       // adaptação do olho (sobe dentro de casa)
const _lampOrder = lampSpots.map((p,i)=> i);
function updateLamps(dt){
  const P = camera.position;
  _lampOrder.sort((a,b)=> lampSpots[a].distanceToSquared(P) - lampSpots[b].distanceToSquared(P));
  const want = _lampOrder.slice(0, NL);
  for(const L of lamps){
    if(L.spot >= 0 && want.includes(L.spot)){ L.k = Math.min(1, L.k + dt*3); }
    else {
      L.k -= dt*4;
      if(L.k <= 0){
        L.k = 0;
        const free = want.find(s=> !lamps.some(o=> o.spot === s));
        L.spot = free === undefined ? -1 : free;
        if(L.spot >= 0) L.l.position.copy(lampSpots[L.spot]);
      }
    }
    L.l.intensity = LAMP_I * L.k;
  }
}

function tick(now){
  const dt = Math.min(0.05, (now-last)/1000); last = now;

  if(started){
    let mf=0, ms=0;
    if(keys['KeyW']||keys['ArrowUp'])    mf += 1;
    if(keys['KeyS']||keys['ArrowDown'])  mf -= 1;
    if(keys['KeyD']||keys['ArrowRight']) ms += 1;
    if(keys['KeyA']||keys['ArrowLeft'])  ms -= 1;
    if(stick.active){ mf -= stick.dy; ms += stick.dx; }
    // passo humano: 1,4 m/s andando, 3,0 m/s correndo
    const run = keys['ShiftLeft']||keys['ShiftRight'];
    const speed = (run ? 3.0 : 1.4) * dt;
    const fx = Math.sin(player.yaw),  fz = Math.cos(player.yaw);
    const sx = -Math.cos(player.yaw), sz = Math.sin(player.yaw);
    let dx = (fx*mf + sx*ms), dz = (fz*mf + sz*ms);
    const l = Math.hypot(dx,dz);
    if(l > 0.001){ const k = Math.min(1, l); dx = dx/l*speed*k; dz = dz/l*speed*k;
      const [nx,nz] = resolve(player.x, player.z, dx, dz);
      player.x = nx; player.z = nz;
    }
  }

  const targetY = floorYAt(player.x, player.z) + player.eye + player.lift;
  camera.position.x = player.x;
  camera.position.z = player.z;
  camera.position.y += (targetY - camera.position.y) * Math.min(1, dt*10);

  const dir = new THREE.Vector3(
    Math.sin(player.yaw)*Math.cos(player.pitch),
    Math.sin(player.pitch),
    Math.cos(player.yaw)*Math.cos(player.pitch)
  );
  camera.lookAt(camera.position.x+dir.x, camera.position.y+dir.y, camera.position.z+dir.z);

  // olho se adapta: dentro de casa abre ~1,6× (com a vista lá fora estourando, como na vida real)
  const here = roomAt(player.x, player.z);
  const indoor = !!(here && here.indoor) && player.lift < 0.5;
  adapt += ((indoor ? 1.6 : 1.0) - adapt) * Math.min(1, dt*1.2);
  renderer.toneMappingExposure = EXPO[expoI] * adapt;
  updateLamps(dt);

  const ap = aimPoint();
  if(ap){ aimRing.visible = true; aimRing.position.set(ap.x, 0.02, ap.z);
          crossLbl.textContent = 'x ' + ap.x.toFixed(2) + '   z ' + ap.z.toFixed(2); }
  else  { aimRing.visible = false; crossLbl.textContent = 'aim down'; }

  if(toastT > 0 && (toastT -= dt) <= 0) toastEl.style.display = 'none';

  roomEl.textContent = roomNameAt(player.x, player.z);
  drawMini();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// ---- start ----
const overlay = document.getElementById('overlay');
function startGame(){
  if(started) return;
  started = true;
  overlay.style.display='none';
  if(!isTouch) canvas.requestPointerLock?.();
  if(isTouch){ document.getElementById('touchhint').style.display='block'; }
}
document.getElementById('startbtn').addEventListener('click', startGame);
overlay.addEventListener('click', startGame);

addEventListener('resize', ()=>{
  fitFov();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

camera.position.set(player.x, floorYAt(player.x, player.z) + player.eye, player.z);
document.getElementById('build').textContent = 'BUILD '+BUILD;
requestAnimationFrame(tick);

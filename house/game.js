// House Walkthrough — walking sim 3D em primeira pessoa.
// Reconstrução fiel da planta de house.md (Pav. Térreo). Todo texto de tela em inglês.
// Comentários/variáveis em português DE PROPÓSITO.
import * as THREE from 'three';

const BUILD = 16;

// ============================================================
//  DADOS DA PLANTA  (metros)
//  X: 0 = divisa oeste  ->  10 = divisa leste
//  Z: 0 = frente/rua    ->  20 = divisa dos fundos
//  Y: altura. Olho do jogador ~1.6.
// ============================================================
const H    = 2.70;   // pé-direito interno
const MURO = 2.20;   // altura dos muros de divisa
const CEIL = H;
// Fundo do lote. A planta tem 20,00 m, mas o André pediu o quintal com o DOBRO
// da profundidade; como a suíte foi cravada por estacas, o muro dos fundos é que
// recuou (17.35 -> 22.65 = 5,30 m de quintal) em vez de empurrar a casa pra frente.
const ZMAX = 22.65;

// ============================================================
//  CALIBRAÇÃO Z — casa estava ~2m adiantada vs planta real.
//  Remapeia o Z do layout p/ as faixas MEDIDAS na house.jpeg
//  (mesma calibração do minimap): portão z2 · varanda z2–4 ·
//  frente z4–8 · meio z8–12 · fundos z12–18 · quintal z18–20.
//  zr = layout -> mundo · zi = mundo -> layout (p/ escrever cotas
//  reais em metros direto, sem passar pelo "layout").
// ============================================================
const ZSEG = [[0,0],[0.40,2.20],[2.40,4.00],[6.00,8.00],[10.15,12.00],[15.75,18.00],[20,20]];
function zr(z){
  for(let i=0;i<ZSEG.length-1;i++){ const a=ZSEG[i], b=ZSEG[i+1];
    if(z <= b[0]+1e-6) return a[1] + (z-a[0])/(b[0]-a[0])*(b[1]-a[1]); }
  return z;
}
function zi(m){
  for(let i=0;i<ZSEG.length-1;i++){ const a=ZSEG[i], b=ZSEG[i+1];
    if(m <= b[1]+1e-6) return a[0] + (m-a[1])/(b[1]-a[1])*(b[0]-a[0]); }
  return m;
}

// Ambientes: retângulos internos. col = cor do piso. name = rótulo (EN).
// Refit geométrico (BUILD 5): dimensões reais dos cômodos + adjacências corrigidas.
// WC Suíte no fundo-esquerdo · Serviço compacto à direita · corredor oeste com janelas.
// BUILD 8: bloco da suíte refeito em metros reais (zi) — 3,80 × 5,40 com o
// WC 2,20 × 2,40 no canto dos fundos-oeste e o nicho/closet de 1,40 ao lado.
// ---- Linhas de eixo de parede da faixa oeste/fundos (metros de MUNDO) ----
// BUILD 11: cravadas pelas estacas do André na suíte master (4 pontos, média dos
// pares opostos) — o bloco da suíte passou de 1.80–5.60 / 12.60–18.00 para o
// retângulo abaixo. Os vizinhos acompanham p/ não sobrar nem faltar parede.
const L = {
  wOeste : 1.80,   // fachada oeste (dorm2 / WC social / suíte)  — estaca 1.82
  wMeio  : 4.20,   // dorm2+WC social  ↔  cozinha
  wSuiteL: 6.25,   // leste da suíte   ↔  pátio de serviço       — estacas 6.10 / 6.71
  wWcDiv : 4.50,   // WC suíte  ↔  nicho/closet
  zFrente: 7.25,   // garagem/corredor  ↔  dorm2
  zDorm2 : 10.35,  // dorm2  ↔  WC social
  zSuite : 11.85,  // WC social + cozinha  ↔  suíte              — estacas 11.61 / 11.91
  zWcSul : 14.83,  // parede sul do WC suíte
  zFundo : 17.35,  // parede dos fundos da casa                  — estacas 17.48 / 17.68
};

const ROOMS = [
  { k:'garage',   name:'Garage',            x0:0.10, z0:0.40, x1:L.wMeio, z1:zi(L.zFrente), fy:0.00, col:0x8d8f92, indoor:false },
  { k:'porch',    name:'Front Porch',       x0:4.20, z0:0.00, x1:9.90, z1:2.40,  fy:0.00, col:0xb3ab97, indoor:false },
  { k:'dorm1',    name:'Home Office',       x0:4.20, z0:2.40, x1:6.35, z1:6.00,  fy:0.00, col:0xb98a57, indoor:true  },
  { k:'sestar',   name:'Living Room',       x0:6.35, z0:2.40, x1:9.90, z1:6.00,  fy:0.00, col:0xc0925f, indoor:true  },
  { k:'corridor', name:'Side Corridor',     x0:0.10, z0:zi(L.zFrente), x1:L.wOeste, z1:zi(L.zFundo), fy:-0.05, col:0xb7b0a0, indoor:false },
  { k:'dorm2',    name:'Kids Room',         x0:L.wOeste, z0:zi(L.zFrente), x1:L.wMeio, z1:zi(L.zDorm2), fy:0.00, col:0xb98a57, indoor:true  },
  // Jantar/Coz. é o HUB de circulação: dorm1, dorm2, WC social e suíte abrem DIRETO nela.
  // Não existe corredor interno na planta; a parede norte dela É a parede sul da suíte.
  { k:'jantar',   name:'Dining / Kitchen',  x0:L.wMeio, z0:6.00, x1:9.90, z1:zi(L.zSuite), fy:0.00, col:0xd6cfbf, indoor:true  },
  { k:'wcsocial', name:'Guest Bathroom',    x0:L.wOeste, z0:zi(L.zDorm2), x1:L.wMeio, z1:zi(L.zSuite), fy:0.00, col:0xd2dad9, indoor:true  },
  // wcsuite ANTES da suíte: recortado dentro do retângulo da suíte (lookup pega o menor primeiro).
  { k:'wcsuite',  name:'Ensuite Bathroom',  x0:L.wOeste, z0:zi(L.zWcSul), x1:L.wWcDiv, z1:zi(L.zFundo), fy:0.00, col:0xd2dad9, indoor:true  },
  { k:'suite',    name:'Master Suite',      x0:L.wOeste, z0:zi(L.zSuite), x1:L.wSuiteL, z1:zi(L.zFundo), fy:0.00, col:0xb98a57, indoor:true  },
  { k:'servico',  name:'Laundry Yard',      x0:L.wSuiteL, z0:zi(L.zSuite), x1:9.90, z1:zi(L.zFundo), fy:-0.02,col:0xcacdc9, indoor:false },
  { k:'backyard', name:'Backyard',          x0:0.00, z0:zi(L.zFundo), x1:10.00, z1:ZMAX, fy:-0.05, col:0x4f8a41, indoor:false },
];

// Portas/janelas — helpers de vão (coord "at" = posição no eixo que varia)
const door = (at, w=0.85)   => ({ at, w, y0:0.00, y1:2.05 });                 // vão de porta (passável)
const opening = (at, w)     => ({ at, w, y0:0.00, y1:2.30 });                 // passagem aberta (passável)
const win  = (at,w,s,h)     => ({ at, w, y0:s, y1:s+h, glass:true });         // janela (bloqueia)
const glassdoor = (at,w)    => ({ at, w, y0:0.00, y1:2.10, glass:true });     // porta-janela de vidro (bloqueia)

// Lista de paredes: [ax,az, bx,bz, altura, vãos]
const WALLS = [
  // ---- Muros de divisa + frente com portões ----
  [0,0, 0,ZMAX, MURO, []],
  [10,0, 10,ZMAX, MURO, []],
  [0,ZMAX, 10,ZMAX, MURO, []],
  [0,0, 10,0, MURO, [opening(2.15,3.60), opening(8.00,1.00)]], // portão basculante + portão social

  // ---- Garagem (aberta): ÚNICA porta -> corredor ----
  [0.10,0.40, 0.10,zi(L.zFrente), H, []],
  [0.10,0.40, 4.20,0.40, H, [opening(2.15,3.40)]],        // portão basculante
  [4.20,0.40, 4.20,zi(L.zFrente), H, []],
  [0.10,zi(L.zFrente), 4.20,zi(L.zFrente), H, [door(0.95)]], // -> corredor

  // ---- Frente (Dorm1 + Sala) ----
  [4.20,2.40, 6.35,2.40, H, [win(5.25,1.00,1.00,1.50)]],  // janela Dorm1
  [6.35,2.40, 9.90,2.40, H, [door(7.35,1.00), win(8.95,1.00,1.00,1.50)]], // porta social + janela Sala
  [6.35,2.40, 6.35,6.00, H, []],                          // Dorm1 / Sala
  [9.90,2.40, 9.90,6.00, H, []],                          // leste da Sala: CEGA (dá no muro de divisa)
  [9.90,0.00, 9.90,2.40, MURO, []],                       // muro leste do porch
  [4.20,6.00, 6.35,6.00, H, [door(5.85,0.80)]],           // Jantar -> Dorm1 (porta na ponta leste)
  [6.35,6.00, 9.90,6.00, H, [opening(8.10,2.40)]],        // Sala <-> Jantar

  // ---- Corredor lateral (oeste): janelas dos cômodos ----
  [L.wOeste,zi(L.zFrente), L.wOeste,zi(L.zDorm2), H, [win(zi(8.80),1.50,1.10,1.00)]], // janela Dorm2
  [L.wOeste,zi(L.zDorm2),  L.wOeste,zi(L.zSuite), H, [win(zi(11.10),1.00,1.50,0.60)]],// janela WC social (alta)
  [L.wOeste,zi(L.zSuite),  L.wOeste,zi(L.zFundo), H, [glassdoor(zi(13.30),1.80)]],    // porta-janela Suíte

  // ---- Dorm 2 ----
  // porta INTEIRAMENTE ao norte de z=8.00 (divisa escritório/cozinha): abre só na cozinha
  [L.wMeio,zi(L.zFrente), L.wMeio,zi(L.zDorm2), H, [door(zi(8.62),0.80)]], // -> Jantar
  [L.wOeste,zi(L.zDorm2), L.wMeio,zi(L.zDorm2), H, []],   // fundo (WC social)

  // ---- Jantar / Cozinha ----
  [9.90,6.00, 9.90,zi(L.zSuite), H, []],                                 // leste da cozinha: CEGA (muro de divisa)
  [L.wSuiteL,zi(L.zSuite), 9.90,zi(L.zSuite), H, [opening(8.10,2.20)]],   // -> pátio (porta de correr 2,20)

  // ---- WC Social (oeste) — porta 0,70 na ponta norte da parede leste ----
  [L.wMeio,zi(L.zDorm2), L.wMeio,zi(L.zSuite), H, [door(zi(11.40),0.75)]],// -> Jantar (porta 0.70)

  // ---- Suíte Master — retângulo cravado pelas estacas (ver const L) ----
  // parede sul: fecha WC social + cozinha; porta 0,80 na ponta leste (dá direto na cozinha)
  [L.wOeste,zi(L.zSuite), L.wSuiteL,zi(L.zSuite), H, [door(5.75,0.80)]],
  [L.wSuiteL,zi(L.zSuite), L.wSuiteL,zi(L.zFundo), H, []],// leste = parede ÚNICA com o pátio de serviço
  // parede dos fundos: janela do WC (larga) + janela do nicho (0,80x1,80 h=0,30)
  [L.wOeste,zi(L.zFundo), L.wSuiteL,zi(L.zFundo), H, [win(3.15,2.30,1.10,1.00), win(5.40,0.90,0.30,1.80)]],

  // ---- WC Suíte (canto fundo-oeste) — porta na parede LESTE, dá no nicho ----
  [L.wOeste,zi(L.zWcSul), L.wWcDiv,zi(L.zWcSul), H, []],  // parede sul (cega)
  [L.wWcDiv,zi(L.zWcSul), L.wWcDiv,zi(L.zFundo), H, [door(zi(15.90),0.85)]], // -> nicho/closet

  // ---- Pátio de serviço = aberto: parede oeste = leste da suíte; leste/fundo abrem pro quintal ----
];

// ---- aplica a calibração Z (layout -> mundo) ----
for(const r of ROOMS){ r.z0 = zr(r.z0); r.z1 = zr(r.z1); }
for(const w of WALLS){
  const vert = w[0] === w[2];          // parede vertical (x const) -> vão "at" é Z
  w[1] = zr(w[1]); w[3] = zr(w[3]);
  if(vert) for(const o of w[5]) o.at = zr(o.at);
}

// ============================================================
//  THREE — cena, materiais
// ============================================================
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // resposta de luz filmica
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// A casa é 100% estática (só a câmera anda) -> o shadow map é calculado UMA vez.
// Isso tira o passe de sombra de todo frame, que é o grosso do custo no celular.
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xa8c8e4, 26, 75);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth/window.innerHeight, 0.05, 300);

// ------------------------------------------------------------
//  TEXTURAS PROCEDURAIS (canvas 2D — nada externo, tudo self-contained)
// ------------------------------------------------------------
const maxAniso = renderer.capabilities.getMaxAnisotropy();
function makeTex(size, draw, rep){
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  t.colorSpace = THREE.SRGBColorSpace;
  if(rep) t.repeat.set(rep, rep);
  return t;
}
const rnd = (a,b)=> a + Math.random()*(b-a);
function noise(g, s, n, alpha, dark){
  for(let i=0;i<n;i++){
    const v = Math.random()*255|0;
    g.fillStyle = 'rgba('+(dark?0:v)+','+(dark?0:v)+','+(dark?0:v)+','+alpha+')';
    g.fillRect(Math.random()*s, Math.random()*s, rnd(1,3), rnd(1,3));
  }
}

// piso de madeira: réguas com veio e emendas alternadas
const texWood = makeTex(512, (g,s)=>{
  const rows = 6, rh = s/rows;
  for(let r=0;r<rows;r++){
    let x = -rnd(0, s/2);
    while(x < s){
      const w = rnd(s*0.35, s*0.8);
      const t = rnd(0.78, 1.0);
      g.fillStyle = 'rgb('+(150*t|0)+','+(103*t|0)+','+(60*t|0)+')';
      g.fillRect(x, r*rh, w, rh);
      g.strokeStyle = 'rgba(60,38,18,.55)'; g.lineWidth = 1.5;
      g.strokeRect(x, r*rh, w, rh);
      for(let k=0;k<14;k++){                       // veio
        g.strokeStyle = 'rgba(90,58,28,'+rnd(0.05,0.16).toFixed(2)+')';
        g.lineWidth = rnd(0.6,1.8);
        const y = r*rh + rnd(2, rh-2);
        g.beginPath(); g.moveTo(x+2,y); g.bezierCurveTo(x+w*0.3,y+rnd(-3,3), x+w*0.6,y+rnd(-3,3), x+w-2,y); g.stroke();
      }
      x += w;
    }
  }
});
// porcelanato / azulejo: grid com rejunte
function tileTex(base, grout, n){
  return makeTex(512, (g,s)=>{
    const c = s/n;
    g.fillStyle = grout; g.fillRect(0,0,s,s);
    for(let i=0;i<n;i++) for(let j=0;j<n;j++){
      const t = rnd(0.95,1.03);
      g.fillStyle = 'rgb('+Math.min(255,base[0]*t|0)+','+Math.min(255,base[1]*t|0)+','+Math.min(255,base[2]*t|0)+')';
      g.fillRect(i*c+1.5, j*c+1.5, c-3, c-3);
    }
    noise(g, s, 2500, 0.03);
  });
}
const texTile   = tileTex([232,236,238], '#b9c0c4', 4);   // banheiros
const texTileBig= tileTex([222,216,203], '#b0a99a', 2);   // cozinha/jantar
// reboco pintado
const texPlaster = makeTex(256, (g,s)=>{
  g.fillStyle = '#f4efe6'; g.fillRect(0,0,s,s);
  noise(g, s, 6000, 0.05);
  for(let i=0;i<200;i++){
    g.fillStyle = 'rgba(150,140,125,'+rnd(0.02,0.06).toFixed(2)+')';
    g.beginPath(); g.arc(Math.random()*s, Math.random()*s, rnd(1,6), 0, 7); g.fill();
  }
}, 3);
// concreto queimado (garagem, corredor, pátio)
const texConcrete = makeTex(512, (g,s)=>{
  g.fillStyle = '#a9a9a4'; g.fillRect(0,0,s,s);
  noise(g, s, 9000, 0.07);
  for(let i=0;i<70;i++){
    g.fillStyle = 'rgba(120,120,118,'+rnd(0.05,0.15).toFixed(2)+')';
    g.beginPath(); g.arc(Math.random()*s, Math.random()*s, rnd(3,18), 0, 7); g.fill();
  }
});
// grama
const texGrass = makeTex(512, (g,s)=>{
  g.fillStyle = '#4f8a41'; g.fillRect(0,0,s,s);
  for(let i=0;i<9000;i++){
    const v = rnd(0.7,1.35);
    g.strokeStyle = 'rgba('+(70*v|0)+','+(130*v|0)+','+(55*v|0)+',.75)';
    g.lineWidth = rnd(0.7,1.8);
    const x = Math.random()*s, y = Math.random()*s;
    g.beginPath(); g.moveTo(x,y); g.lineTo(x+rnd(-2,2), y-rnd(2,6)); g.stroke();
  }
});
// telha cerâmica
const texRoof = makeTex(512, (g,s)=>{
  g.fillStyle = '#8d5236'; g.fillRect(0,0,s,s);
  const rows = 8, rh = s/rows, cw = s/8;
  for(let r=0;r<rows;r++) for(let i=0;i<8;i++){
    const t = rnd(0.82,1.12);
    g.fillStyle = 'rgb('+Math.min(255,152*t|0)+','+(86*t|0)+','+(56*t|0)+')';
    g.beginPath();
    g.moveTo(i*cw, r*rh); g.lineTo(i*cw+cw, r*rh);
    g.lineTo(i*cw+cw, r*rh+rh*0.72);
    g.quadraticCurveTo(i*cw+cw/2, r*rh+rh*1.05, i*cw, r*rh+rh*0.72);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(60,28,16,.45)'; g.lineWidth = 1.4; g.stroke();
  }
}, 2.5);
// asfalto
const texAsphalt = makeTex(256, (g,s)=>{
  g.fillStyle = '#4a4d51'; g.fillRect(0,0,s,s);
  noise(g, s, 12000, 0.09);
}, 8);
// muro de divisa rebocado
const texMuro = makeTex(256, (g,s)=>{
  g.fillStyle = '#cdc6b7'; g.fillRect(0,0,s,s);
  noise(g, s, 5000, 0.06);
}, 4);
// papel de parede infantil: céu com nuvens e estrelas (quarto das crianças)
const texKids = makeTex(512, (g,s)=>{
  const grd = g.createLinearGradient(0,0,0,s);
  grd.addColorStop(0,'#bcdcf5'); grd.addColorStop(1,'#e6f2fb');
  g.fillStyle = grd; g.fillRect(0,0,s,s);
  for(let i=0;i<9;i++){                                   // nuvens
    const x = Math.random()*s, y = rnd(s*0.05, s*0.85);
    g.fillStyle = 'rgba(255,255,255,.9)';
    [[-26,4,15],[-8,-6,20],[12,-4,18],[30,5,14]].forEach(([dx,dy,r])=>{
      g.beginPath(); g.arc(x+dx, y+dy, r, 0, 7); g.fill(); });
  }
  for(let i=0;i<44;i++){                                  // estrelinhas
    const x = Math.random()*s, y = Math.random()*s, r = rnd(3.5,7.5);
    g.fillStyle = i%3 ? '#f6cf52' : '#f19aa8';
    g.beginPath();
    for(let k=0;k<10;k++){ const a = k*Math.PI/5 - Math.PI/2, rr = k%2 ? r*0.44 : r;
      g.lineTo(x+Math.cos(a)*rr, y+Math.sin(a)*rr); }
    g.closePath(); g.fill();
  }
}, 2);
// tapete redondo colorido
const texRug = makeTex(256, (g,s)=>{
  const cols = ['#4f93d6','#f2c14e','#e0543f','#5fb37a','#e78bab','#f6f1e4'];
  for(let i=6;i>=1;i--){
    g.fillStyle = cols[(6-i) % cols.length];
    g.beginPath(); g.arc(s/2, s/2, s/2*(i/6), 0, 7); g.fill();
  }
});

// ------------------------------------------------------------
//  CÉU + AMBIENTE (IBL) — gradiente vertical gerado no canvas
// ------------------------------------------------------------
const skyTex = makeTex(512, (g,s)=>{
  const grd = g.createLinearGradient(0,0,0,s);
  grd.addColorStop(0.00, '#3f7fc4');
  grd.addColorStop(0.42, '#9dc6e8');
  grd.addColorStop(0.52, '#dbe7ee');
  grd.addColorStop(0.70, '#b8a892');
  grd.addColorStop(1.00, '#6f6656');
  g.fillStyle = grd; g.fillRect(0,0,s,s);
  for(let i=0;i<28;i++){                            // nuvens
    const y = rnd(s*0.08, s*0.40), x = Math.random()*s;
    g.fillStyle = 'rgba(255,255,255,'+rnd(0.10,0.32).toFixed(2)+')';
    g.beginPath(); g.ellipse(x, y, rnd(20,70), rnd(5,16), 0, 0, 7); g.fill();
  }
});
skyTex.mapping = THREE.EquirectangularReflectionMapping;
scene.background = skyTex;
let hasIBL = false;
try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(skyTex).texture;   // reflexo/IBL nos materiais
  pmrem.dispose();
  hasIBL = true;
} catch(e){ /* sem IBL, compensa nas luzes diretas abaixo */ }

// ------------------------------------------------------------
//  LUZES — hemisfério + ambiente + sol com sombra
//  Com IBL o céu já faz o papel de luz difusa: hemisfério/ambiente entram baixos
//  pra não estourar. Sem IBL (fallback), sobem pra cena não ficar escura.
// ------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0xdcecff, 0x8a7f6c, hasIBL ? 0.55 : 1.25));
scene.add(new THREE.AmbientLight(0xffffff, hasIBL ? 0.18 : 0.45));
const sun = new THREE.DirectionalLight(0xfff0d2, 2.0);
sun.position.set(-11, 19, -7);
sun.target.position.set(5, 0, 10);
scene.add(sun); scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
sun.shadow.camera.top  =  27; sun.shadow.camera.bottom = -27;  // cobre o lote esticado
sun.shadow.camera.near = 1;   sun.shadow.camera.far = 80;
sun.shadow.bias = -0.0007;
sun.shadow.normalBias = 0.025;

// ------------------------------------------------------------
//  MATERIAIS  (PBR — respondem ao IBL do céu)
// ------------------------------------------------------------
const std = o => new THREE.MeshStandardMaterial(o);
const matWall  = std({ map:texPlaster, color:0xffffff, roughness:0.95, metalness:0.0 });
const matMuro  = std({ map:texMuro,    color:0xffffff, roughness:0.96, metalness:0.0 });
const matTrim  = std({ color:0xf7f4ee, roughness:0.55, metalness:0.0 });  // rodapé/batente/caixilho
const matGlass = std({ color:0xcfeaf8, roughness:0.05, metalness:0.0,
                       transparent:true, opacity:0.24, envMapIntensity:2.2, side:THREE.DoubleSide });
const matRoof  = std({ map:texRoof, color:0xffffff, roughness:0.85, metalness:0.0 });
const matWood  = std({ color:0x7a5433, roughness:0.62, metalness:0.0 });
const matWhite = std({ color:0xf6f6f2, roughness:0.35, metalness:0.0 });  // louça
const matMetal = std({ color:0xc3c8ce, roughness:0.28, metalness:0.85 });
const matDark  = std({ color:0x24272b, roughness:0.55, metalness:0.15 });
const matCar   = std({ color:0x9a2c2c, roughness:0.32, metalness:0.55 });
const matSteel = std({ color:0xdadde0, roughness:0.30, metalness:0.70 });
const matSofa  = std({ color:0x40566b, roughness:0.90, metalness:0.0 });
const matBed   = std({ color:0xe6e9ee, roughness:0.92, metalness:0.0 });
const matSheet = std({ color:0xc9d4e0, roughness:0.95, metalness:0.0 });
const matCabinet = std({ color:0xe9e4da, roughness:0.45, metalness:0.0 });  // frente de armário
const matGranite = std({ color:0x3a3d42, roughness:0.22, metalness:0.25 });
const matScreen= new THREE.MeshBasicMaterial({ color:0x8fd0f5 });         // tela ligada
const matLamp  = std({ color:0xfff6e2, emissive:0xffe9bb, emissiveIntensity:1.4, roughness:0.4 });
const matGreen = std({ color:0x3f7a35, roughness:0.95, metalness:0.0 });
const matTrunk = std({ color:0x6b4a2e, roughness:0.92, metalness:0.0 });

// cache de geometrias de caixa
const _geo = {};
function boxGeo(sx,sy,sz){
  const k = sx.toFixed(3)+'|'+sy.toFixed(3)+'|'+sz.toFixed(3);
  return _geo[k] || (_geo[k] = new THREE.BoxGeometry(sx,sy,sz));
}

const world = new THREE.Group();
scene.add(world);

// colisores AABB no plano XZ (já expandidos na checagem pelo raio do jogador)
const colliders = [];
function addCollider(minx,maxx,minz,maxz){ colliders.push({minx,maxx,minz,maxz}); }

function box(cx,cy,cz,sx,sy,sz,mat,collide){
  const m = new THREE.Mesh(boxGeo(sx,sy,sz), mat);
  m.position.set(cx,cy,cz);
  m.castShadow = true; m.receiveShadow = true;
  world.add(m);
  if(collide) addCollider(cx-sx/2, cx+sx/2, cz-sz/2, cz+sz/2);
  return m;
}

// ---- construção de parede com vãos ----
// Além da alvenaria, gera automaticamente RODAPÉ em todo trecho cheio, BATENTE
// nas portas e CAIXILHO + PEITORIL + baguete nas janelas. É daqui que vem a
// maior parte da "cara de casa" — nenhuma dessas peças precisa ser posicionada à mão.
const T = 0.12;          // espessura da parede
const BB_H = 0.11, BB_P = 0.016;   // rodapé: altura e quanto sobressai de cada lado
const FR_P = 0.028;                // saliência do batente/caixilho
const FR_W = 0.055;                // largura do batente/caixilho

function buildWall(ax,az,bx,bz,h,ops){
  const horiz = Math.abs(bx-ax) > Math.abs(bz-az);
  const len = horiz ? Math.abs(bx-ax) : Math.abs(bz-az);
  const x0 = Math.min(ax,bx), z0 = Math.min(az,bz);

  // peça retangular alinhada ao eixo da parede
  function piece(s,e,y0,y1,mat,collide,thick,shadow){
    if(e-s <= 0.002 || y1-y0 <= 0.002) return;
    const mid=(s+e)/2, L=e-s, cy=(y0+y1)/2, sy=y1-y0, th=thick===undefined?T:thick;
    let cx,cz,sx,sz;
    if(horiz){ cx=x0+mid; cz=az; sx=L; sz=th; }
    else     { cz=z0+mid; cx=ax; sz=L; sx=th; }
    const m = new THREE.Mesh(boxGeo(sx,sy,sz), mat);
    m.position.set(cx,cy,cz);
    m.castShadow = shadow !== false; m.receiveShadow = true;
    world.add(m);
    if(collide && y0 < 1.7 && y1 > 0.15) addCollider(cx-sx/2,cx+sx/2,cz-sz/2,cz+sz/2);
  }

  const norm = (ops||[]).map(o=>{
    const c = horiz ? o.at - x0 : o.at - z0;
    return { s:Math.max(0,c-o.w/2), e:Math.min(len,c+o.w/2), y0:o.y0, y1:o.y1, glass:!!o.glass };
  }).sort((a,b)=>a.s-b.s);

  // trecho de alvenaria cheio, do piso ao teto, com rodapé
  const solid = (s,e)=>{
    piece(s, e, 0, h, h > 2.5 ? matWall : matMuro, true);      // h<H = muro de divisa
    if(h > 2.5) piece(s, e, 0.004, BB_H, matTrim, false, T + 2*BB_P, false);  // rodapé só na casa
  };

  let cur = 0;
  for(const o of norm){
    solid(cur, o.s);                                          // alvenaria antes do vão
    if(o.y0 > 0.002) piece(o.s, o.e, 0, o.y0, matWall, true);  // peitoril (alvenaria)
    if(o.y1 < h-0.002) piece(o.s, o.e, o.y1, h, matWall, false); // verga, sem colisão

    if(o.glass && o.y0 > 0.002){
      // JANELA: caixilho em volta + peitoril saliente + baguete horizontal e vertical
      piece(o.s, o.e, o.y0, o.y1, matGlass, true, T*0.35, false);
      piece(o.s-FR_W, o.s, o.y0-0.03, o.y1+0.03, matTrim, false, T+2*FR_P, false);
      piece(o.e, o.e+FR_W, o.y0-0.03, o.y1+0.03, matTrim, false, T+2*FR_P, false);
      piece(o.s-FR_W, o.e+FR_W, o.y1, o.y1+0.05, matTrim, false, T+2*FR_P, false);
      piece(o.s-0.09, o.e+0.09, o.y0-0.06, o.y0, matTrim, false, T+0.16, false);   // peitoril
      const my = (o.y0+o.y1)/2, mx = (o.s+o.e)/2;
      piece(o.s, o.e, my-0.02, my+0.02, matTrim, false, T*0.5, false);             // baguete h
      piece(mx-0.02, mx+0.02, o.y0, o.y1, matTrim, false, T*0.5, false);           // baguete v
    } else if(o.glass){
      // porta-janela: só vidro + caixilho lateral
      piece(o.s, o.e, o.y0, o.y1, matGlass, true, T*0.35, false);
      piece(o.s-FR_W, o.s, 0, o.y1+0.03, matTrim, false, T+2*FR_P, false);
      piece(o.e, o.e+FR_W, 0, o.y1+0.03, matTrim, false, T+2*FR_P, false);
      piece(o.s-FR_W, o.e+FR_W, o.y1, o.y1+0.05, matTrim, false, T+2*FR_P, false);
    } else if(o.y0 < 0.002 && o.y1 < h-0.05 && o.e-o.s < 2.6){
      // PORTA (vão baixo e estreito): batente em U
      piece(o.s-FR_W, o.s, 0, o.y1+FR_W, matTrim, false, T+2*FR_P, false);
      piece(o.e, o.e+FR_W, 0, o.y1+FR_W, matTrim, false, T+2*FR_P, false);
      piece(o.s-FR_W, o.e+FR_W, o.y1, o.y1+FR_W, matTrim, false, T+2*FR_P, false);
    }
    cur = o.e;
  }
  solid(cur, len);
}

for(const w of WALLS) buildWall(w[0],w[1],w[2],w[3],w[4],w[5]);

// ============================================================
//  PISOS / TETOS / TERRENO
// ============================================================
// Base do lote. O TOPO dela precisa ficar abaixo do piso mais baixo dos ambientes
// (quintal e corredor têm fy -0.05 -> plano em -0.045); com o topo em -0.02 a laje
// engolia a grama do quintal. Topo agora em -0.06.
box(5, -0.12, (ZMAX+0.4)/2 - 0.2, 10.4, 0.12, ZMAX + 0.6, std({ map:texConcrete, color:0xd2ccbe, roughness:0.9 }), false);
// rua na frente
box(5, -0.10, -4, 20, 0.06, 8, std({ map:texAsphalt, roughness:0.95 }), false);

// acabamento de piso por ambiente: textura + tamanho real do módulo (m) + tinta
const FLOOR = {
  garage  : { t:texConcrete, m:2.0, c:0xbdbdb8 },
  porch   : { t:texTileBig,  m:1.2, c:0xd6cfc0 },
  dorm1   : { t:texWood,     m:1.6, c:0xffffff },
  sestar  : { t:texWood,     m:1.6, c:0xffffff },
  corridor: { t:texConcrete, m:1.6, c:0xc6c2b6 },
  dorm2   : { t:texWood,     m:1.6, c:0xffffff },
  jantar  : { t:texTileBig,  m:1.2, c:0xffffff },
  wcsocial: { t:texTile,     m:1.2, c:0xffffff },
  wcsuite : { t:texTile,     m:1.2, c:0xffffff },
  suite   : { t:texWood,     m:1.6, c:0xffffff },
  servico : { t:texConcrete, m:1.8, c:0xcfd2ce },
  backyard: { t:texGrass,    m:2.4, c:0xffffff },
};
const matCeil = std({ color:0xf7f5f0, roughness:0.98, metalness:0.0 });

// A escala do piso é feita nos UVs da geometria, NÃO clonando a textura: assim os
// 12 ambientes compartilham 5 texturas/materiais em vez de subir 12 cópias pra GPU.
const _fmats = {};
function floorMat(f, rough){
  const k = f.t.uuid + '|' + f.c + '|' + rough;
  return _fmats[k] || (_fmats[k] = std({ map:f.t, color:f.c, roughness:rough, metalness:0.0 }));
}
function floorGeo(w, d, m){
  const g = new THREE.PlaneGeometry(w, d), uv = g.attributes.uv;
  for(let i=0;i<uv.count;i++) uv.setXY(i, uv.getX(i)*w/m, uv.getY(i)*d/m);
  uv.needsUpdate = true;
  return g;
}

const roomAt = {}; // lookup rápido
for(const r of ROOMS){
  roomAt[r.k] = r;
  const w = r.x1-r.x0, d = r.z1-r.z0;
  const f = FLOOR[r.k] || { t:texConcrete, m:1.8, c:r.col };
  const rough = (r.k==='wcsocial'||r.k==='wcsuite'||r.k==='jantar'||r.k==='porch') ? 0.24 : 0.72;
  const floor = new THREE.Mesh(floorGeo(w, d, f.m), floorMat(f, rough));
  floor.rotation.x = -Math.PI/2;
  // WC Suíte é recortada dentro da suíte -> piso um tico mais alto p/ não brigar em z
  floor.position.set((r.x0+r.x1)/2, r.fy + (r.k==='wcsuite' ? 0.012 : 0.005), (r.z0+r.z1)/2);
  floor.receiveShadow = true;
  world.add(floor);
  if(r.indoor){
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w,d), matCeil);
    ceil.rotation.x = Math.PI/2;
    // WC Suíte recortado dentro da suíte -> teto um tico mais baixo p/ não brigar em z
    ceil.position.set((r.x0+r.x1)/2, CEIL - (r.k==='wcsuite' ? 0.022 : 0.01), (r.z0+r.z1)/2);
    ceil.receiveShadow = true;
    world.add(ceil);
    // plafon central (só emissivo — mais barato que uma luz de verdade)
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.19,0.23,0.07,18), matLamp);
    lamp.position.set((r.x0+r.x1)/2, CEIL-0.05, (r.z0+r.z1)/2);
    world.add(lamp);
  }
}

// telhado só sobre a parte fechada — garagem, corredor, pátio e quintais a céu aberto.
// OV = beiral: a laje avança além da parede, o que dá volume à casa vista de fora.
const OV = 0.34;
let roofN = 0;
function roofSlab(x0,z0,x1,z1){
  const za = zr(z0)-OV, zb = zr(z1)+OV, xa = x0-OV, xb = x1+OV;
  // as lajes se sobrepõem nos beirais: degrau de 6 mm por laje evita z-fighting no topo
  const y = CEIL + 0.20 + (roofN++) * 0.006;
  box((xa+xb)/2, y, (za+zb)/2, xb-xa, 0.16, zb-za, matRoof, false);                    // telha
  box((xa+xb)/2, y-0.11, (za+zb)/2, xb-xa-0.05, 0.09, zb-za-0.05, matTrim, false);     // forro do beiral
}
roofSlab(4.20, 1.50, 9.90, 6.00);                                  // frente: escritório/sala + varanda
roofSlab(1.80, zi(L.zFrente), 9.90, zi(L.zSuite));                 // miolo: dorm2/WC social/jantar
roofSlab(1.80, zi(L.zSuite),  L.wSuiteL, zi(L.zFundo));            // fundos-esq: suíte + WC suíte

// ============================================================
//  MOBÍLIA (caixas simples, reconhecíveis) + colisão
// ============================================================
function furn(cx,cz,w,d,h,baseY,mat,collide){
  return box(cx, baseY + h/2, zr(cz), w, h, d, mat, collide);  // cz remapeado p/ as faixas medidas
}
// mesma coisa, mas com o Z já em metros reais (mundo) — usado no bloco da suíte
function furnW(cx,mz,w,d,h,baseY,mat,collide){ return furn(cx, zi(mz), w,d,h,baseY,mat,collide); }

// ------------------------------------------------------------
//  HELPERS DE MODELAGEM — todos com Z em metros de MUNDO.
//  (nx,nz) quando aparece = normal da FRENTE da peça (pra onde ela olha).
// ------------------------------------------------------------
function cyl(rt, rb, h, seg, mat, x, y, z, sx, sz){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  if(sx) m.scale.set(sx, 1, sz === undefined ? sx : sz);
  m.castShadow = true; m.receiveShadow = true; world.add(m); return m;
}
function sph(r, mat, x, y, z, sy){
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), mat);
  m.position.set(x, y, z); if(sy) m.scale.y = sy;
  m.castShadow = true; m.receiveShadow = true; world.add(m); return m;
}
// cadeira: (bx,bz) = direção do encosto
function chair(cx, mz, mat, bx, bz){
  const s = 0.44, sh = 0.45;
  furnW(cx, mz, s, s, 0.07, sh-0.07, mat, false);                       // assento
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>
    furnW(cx+a*0.18, mz+b*0.18, 0.045, 0.045, sh-0.07, 0, matWood, false)); // pés
  const ex = bx ? 0.06 : s, ez = bz ? 0.06 : s;
  furnW(cx+bx*0.20, mz+bz*0.20, ex, ez, 0.11, sh, matWood, false);      // montante
  furnW(cx+bx*0.20, mz+bz*0.20, ex, ez, 0.36, sh+0.16, mat, false);     // encosto
}
// vaso com planta
function plant(cx, mz, s){
  s = s || 1;
  cyl(0.15*s, 0.11*s, 0.30*s, 12, matTrunk, cx, 0.15*s, mz);
  cyl(0.155*s, 0.155*s, 0.03*s, 12, matDark, cx, 0.31*s, mz);
  sph(0.25*s, matGreen, cx, 0.54*s, mz, 0.92);
  sph(0.17*s, matGreen, cx+0.17*s, 0.45*s, mz+0.09*s, 0.92);
  sph(0.15*s, matGreen, cx-0.14*s, 0.47*s, mz-0.10*s, 0.92);
}
// quadro na parede
function picture(cx, mz, w, h, y, nx, nz, art){
  furnW(cx, mz, nz?w+0.07:0.035, nz?0.035:w+0.07, h+0.07, y, matWood, false);
  furnW(cx+nx*0.015, mz+nz*0.015, nz?w:0.022, nz?0.022:w, h, y+0.035, art, false);
}
// torneira (bica apontando pra (nx,nz))
function faucet(cx, mz, y, nx, nz){
  cyl(0.017, 0.020, 0.20, 10, matMetal, cx, y+0.10, mz);
  furnW(cx+nx*0.07, mz+nz*0.07, nx?0.14:0.028, nz?0.14:0.028, 0.028, y+0.19, matMetal, false);
  furnW(cx+nx*0.13, mz+nz*0.13, 0.028, 0.028, 0.055, y+0.145, matMetal, false);
  furnW(cx-nx*0.09, mz-nz*0.09, 0.05, 0.05, 0.05, y+0.20, matMetal, false);   // registro
}
// Frente de armário: n portas rebaixadas + puxadores.
// ATENÇÃO: (cx,mz) é a FACE FRONTAL do móvel, não o centro da carcaça.
// w = largura medida ao longo da frente; (nx,nz) = normal da frente.
function cabDoors(cx, mz, w, h, y, n, nx, nz, mat){
  const dw = w/n;
  for(let i=0;i<n;i++){
    const off = -w/2 + dw*(i+0.5);
    const px = nz ? cx+off : cx, pz = nz ? mz : mz+off;
    furnW(px+nx*0.013, pz+nz*0.013, nz?dw-0.025:0.022, nz?0.022:dw-0.025, h-0.05, y+0.025, mat, false);
    const hoff = (i < n/2 ? 1 : -1) * (dw/2 - 0.07);   // puxador junto da abertura central
    furnW((nz?px+hoff:px)+nx*0.035, (nz?pz:pz+hoff)+nz*0.035,
          nz?0.026:0.02, nz?0.02:0.026, 0.16, y+h*0.42, matMetal, false);
  }
}
// Gavetas empilhadas. (cx,mz) também é a FACE FRONTAL.
function drawers(cx, mz, w, h, y, n, nx, nz, mat){
  const dh = h/n;
  for(let i=0;i<n;i++){
    furnW(cx+nx*0.013, mz+nz*0.013, nz?w-0.03:0.022, nz?0.022:w-0.03, dh-0.035, y+i*dh+0.02, mat, false);
    furnW(cx+nx*0.035, mz+nz*0.035, nz?0.22:0.02, nz?0.02:0.22, 0.025, y+i*dh+dh*0.55, matMetal, false);
  }
}
// toalha pendurada numa barra
function towel(cx, mz, y, w, nx, nz, mat){
  furnW(cx, mz, nz?w:0.025, nz?0.025:w, 0.025, y, matMetal, false);
  furnW(cx+nx*0.02, mz+nz*0.02, nz?w*0.55:0.05, nz?0.05:w*0.55, 0.38, y-0.38, mat, false);
}

// cama: estrado + colchão + edredom dobrado + travesseiros. cz = centro, cabeceira ao SUL (-z).
function bed(cx, cz, w, d){
  furnW(cx, cz, w, d, 0.28, 0.00, matWood, true);              // estrado
  furnW(cx, cz, w-0.06, d-0.06, 0.22, 0.28, matBed, false);    // colchão
  furnW(cx, cz + d*0.18, w-0.04, d*0.60, 0.06, 0.49, matSheet, false); // edredom
  const pw = Math.min(0.62, w/2 - 0.06);
  furnW(cx - w*0.22, cz - d/2 + 0.30, pw, 0.34, 0.13, 0.50, matWhite, false);
  furnW(cx + w*0.22, cz - d/2 + 0.30, pw, 0.34, 0.13, 0.50, matWhite, false);
}

// -- Garagem: carro + portão levantado + bancada de ferramentas  (mundo x0.16–4.14, z2.26–7.19)
(function(){
  const matGlassCar = std({ color:0x243039, roughness:0.10, metalness:0.30 });
  const matTire = std({ color:0x1a1c1e, roughness:0.95 });
  const matTailLight = std({ color:0xc0392b, roughness:0.35 });
  const CX = 2.10, CZ = 4.60;                                  // centro do carro

  // corpo em 3 volumes (capô mais baixo que a cabine) + para-choques
  furnW(CX, CZ,        1.74, 4.20, 0.44, 0.26, matCar, true);  // caixa central
  furnW(CX, CZ-1.55,   1.66, 1.10, 0.22, 0.52, matCar, false); // capô
  furnW(CX, CZ+1.60,   1.66, 1.00, 0.26, 0.52, matCar, false); // porta-malas
  furnW(CX, CZ,        1.58, 2.00, 0.52, 0.70, matGlassCar, false);   // vidros
  furnW(CX, CZ,        1.62, 1.90, 0.10, 1.20, matCar, false); // teto
  furnW(CX, CZ-2.08,   1.70, 0.14, 0.20, 0.34, matDark, false);// para-choque diant.
  furnW(CX, CZ+2.08,   1.70, 0.14, 0.20, 0.34, matDark, false);// para-choque tras.
  [-1,1].forEach(k=>{                                          // faróis e lanternas
    furnW(CX+k*0.58, CZ-2.12, 0.36, 0.06, 0.14, 0.56, matLamp, false);
    furnW(CX+k*0.58, CZ+2.12, 0.32, 0.06, 0.12, 0.58, matDark, false);
    furnW(CX+k*0.58, CZ+2.13, 0.28, 0.04, 0.10, 0.59, matTailLight, false);
  });
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{             // rodas com aro
    const x = CX + a*0.88, z = CZ + b*1.42;
    const t = cyl(0.33, 0.33, 0.22, 18, matTire, x, 0.33, z); t.rotation.z = Math.PI/2;
    const r = cyl(0.19, 0.19, 0.24, 12, matSteel, x, 0.33, z); r.rotation.z = Math.PI/2;
  });
  // retrovisores
  [-1,1].forEach(k=> furnW(CX+k*0.92, CZ-0.80, 0.16, 0.10, 0.10, 1.02, matCar, false));

  furn(2.15, 0.55, 3.30, 0.12, 0.35, 2.30, matMetal, false);   // portão basculante levantado
  furn(3.60, 0.75, 0.35, 0.35, 0.50, 0.00, matDark, false);    // motor do portão

  // bancada de ferramentas + prateleira na parede oeste
  furnW(0.52, 6.55, 0.62, 1.40, 0.82, 0.06, matWood, true);
  cabDoors(0.83, 6.55, 1.40, 0.82, 0.06, 2, 1, 0, matCabinet);   // (0.83 = face frontal)
  furnW(0.52, 6.55, 0.68, 1.46, 0.05, 0.88, matSteel, false);
  furnW(0.42, 6.55, 0.42, 1.30, 0.04, 1.55, matWood, false);   // prateleira
  [[6.10,matCar],[6.45,matSofa],[6.80,matGreen]].forEach(([z,m])=>
    furnW(0.44, z, 0.30, 0.24, 0.26, 1.59, m, false));         // caixas
})();

// -- Home Office (o Dorm.1 da planta, mobiliado como escritório)  (mundo x4.26–6.29, z4.06–7.94)
//    Mesa sob a janela da frente, estante na parede oeste, arquivo na leste,
//    porta fica na parede norte (x5.45–6.25) -> deixar essa faixa livre.
(function(){
  // --- ESTAÇÃO 1: mesa na parede sul, sob a janela (usuário olha pra janela) ---
  furnW(5.25, 4.42, 1.50, 0.68, 0.06, 0.72, matWood,  true);   // tampo
  furnW(4.56, 4.42, 0.06, 0.64, 0.72, 0.00, matWood,  false);  // lateral
  furnW(5.86, 4.42, 0.44, 0.62, 0.70, 0.00, matSteel, false);  // gaveteiro
  furnW(5.25, 4.22, 0.24, 0.16, 0.10, 0.75, matDark, false);   // pé do monitor
  furnW(5.25, 4.20, 0.66, 0.05, 0.40, 0.85, matDark, false);   // monitor
  furnW(5.25, 4.235, 0.60, 0.02, 0.34, 0.88, matScreen, false);// tela (voltada ao norte)
  furnW(5.25, 4.58, 0.44, 0.16, 0.03, 0.75, matWhite, false);  // teclado
  furnW(4.80, 4.58, 0.11, 0.16, 0.03, 0.75, matWhite, false);  // mouse
  furnW(5.90, 4.25, 0.22, 0.42, 0.42, 0.78, matDark, false);   // gabinete sobre o gaveteiro
  furnW(5.90, 4.045, 0.10, 0.02, 0.05, 0.96, matScreen, false);// LED do gabinete
  furnW(5.25, 5.12, 0.52, 0.52, 0.05, 0.00, matDark,  false);  // cadeira 1: base
  furnW(5.25, 5.12, 0.09, 0.09, 0.40, 0.05, matMetal, false);
  furnW(5.25, 5.12, 0.48, 0.48, 0.09, 0.45, matDark,  false);
  furnW(5.25, 5.33, 0.46, 0.08, 0.52, 0.54, matDark,  false);  // encosto

  // --- ESTAÇÃO 2: mesa na parede oeste (usuário olha pra oeste) ---
  furnW(4.62, 6.55, 0.72, 1.50, 0.06, 0.72, matWood,  true);   // tampo
  furnW(4.62, 5.86, 0.68, 0.06, 0.72, 0.00, matWood,  false);  // lateral
  furnW(4.62, 7.10, 0.62, 0.44, 0.70, 0.00, matSteel, false);  // gaveteiro
  furnW(4.42, 6.55, 0.16, 0.24, 0.10, 0.75, matDark, false);   // pé do monitor
  furnW(4.40, 6.55, 0.05, 0.66, 0.40, 0.85, matDark, false);   // monitor
  furnW(4.435, 6.55, 0.02, 0.60, 0.34, 0.88, matScreen, false);// tela (voltada ao leste)
  furnW(4.80, 6.55, 0.16, 0.44, 0.03, 0.75, matWhite, false);  // teclado
  furnW(4.80, 6.10, 0.16, 0.11, 0.03, 0.75, matWhite, false);  // mouse
  furnW(4.46, 7.08, 0.22, 0.42, 0.42, 0.78, matDark, false);   // gabinete
  furnW(4.62, 6.15, 0.10, 0.10, 0.34, 0.75, matMetal, false);  // luminária
  furnW(4.70, 6.15, 0.22, 0.16, 0.08, 1.05, matWhite, false);
  furnW(5.30, 6.55, 0.52, 0.52, 0.05, 0.00, matDark,  false);  // cadeira 2: base
  furnW(5.30, 6.55, 0.09, 0.09, 0.40, 0.05, matMetal, false);
  furnW(5.30, 6.55, 0.48, 0.48, 0.09, 0.45, matDark,  false);
  furnW(5.51, 6.55, 0.08, 0.46, 0.52, 0.54, matDark,  false);  // encosto

  // --- apoio: estante e arquivo na parede leste, deixando o corredor da porta livre ---
  furnW(6.02, 6.25, 0.50, 1.30, 2.00, 0.0, matWood, true);     // estante
  [[0.42,matSofa],[0.82,matCar],[1.22,matGreen],[1.62,matSofa]].forEach(([y,m])=>
    furnW(5.76, 6.25, 0.10, 1.10, 0.26, y, m, false));         // fileiras de livros
  furnW(6.02, 5.20, 0.50, 0.80, 0.74, 0.0, matSteel, true);    // arquivo
  furnW(5.76, 5.20, 0.03, 0.30, 0.03, 0.28, matDark, false);   // puxadores
  furnW(5.76, 5.20, 0.03, 0.30, 0.03, 0.58, matDark, false);

  furnW(4.60, 7.62, 0.28, 0.28, 0.30, 0.0, matWood, false);    // vaso no canto noroeste
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.28,10,8), matGreen);
  leaf.position.set(4.60, 0.56, 7.62); world.add(leaf);   // meshes soltos já usam Z de mundo
})();

// -- Living Room  (mundo x6.41–9.84, z4.06–7.94)
//    Porta social na parede sul (x6.85–7.85) e passagem de 2,40 pra cozinha ao
//    norte (x6.90–9.30): as duas faixas ficam livres.
(function(){
  const matRugL = std({ color:0x8a7f6e, roughness:0.97, metalness:0.0 });
  const matCush = std({ color:0x33475a, roughness:0.95 });
  const matThrow= std({ color:0xc8734f, roughness:0.95 });

  // --- SOFÁ de 3 lugares na parede oeste, virado pro leste (x6.41–7.31, z5.20–7.20) ---
  const sx = 6.86, sz = 6.20;
  furnW(sx, sz, 0.90, 2.00, 0.26, 0.08, matSofa, true);         // base
  [[-1],[0],[1]].forEach(([k])=> furnW(sx+0.06, sz+k*0.62, 0.72, 0.58, 0.17, 0.34, matCush, false)); // assentos
  furnW(sx-0.33, sz, 0.24, 2.00, 0.56, 0.34, matSofa, false);   // encosto
  [[-1],[0],[1]].forEach(([k])=> furnW(sx-0.20, sz+k*0.62, 0.14, 0.56, 0.40, 0.36, matCush, false));// almofadas do encosto
  [-1,1].forEach(k=> furnW(sx+0.02, sz+k*0.91, 0.86, 0.18, 0.30, 0.26, matSofa, false));            // braços
  [-1,1].forEach(k=> furnW(sx-0.10, sz+k*0.55, 0.12, 0.34, 0.34, 0.42, matThrow, false));           // almofadas soltas
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=> furnW(sx+a*0.36, sz+b*0.88, 0.07, 0.07, 0.09, 0, matWood, false));

  // --- POLTRONA junto da janela da frente, virada pro leste ---
  const px = 7.55, pz = 4.80;
  furnW(px, pz, 0.78, 0.80, 0.26, 0.08, matSofa, true);
  furnW(px+0.05, pz, 0.62, 0.62, 0.17, 0.34, matCush, false);
  furnW(px-0.28, pz, 0.22, 0.80, 0.54, 0.34, matSofa, false);
  [-1,1].forEach(k=> furnW(px+0.02, pz+k*0.31, 0.74, 0.16, 0.28, 0.26, matSofa, false));

  // --- TAPETE ---
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.20, 1.90), matRugL);
  rug.rotation.x = -Math.PI/2; rug.position.set(8.15, 0.013, 6.10);
  rug.receiveShadow = true; world.add(rug);

  // --- MESA DE CENTRO ---
  furnW(8.15, 6.15, 0.62, 1.10, 0.05, 0.36, matWood, true);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>
    furnW(8.15+a*0.24, 6.15+b*0.46, 0.05, 0.05, 0.36, 0, matWood, false));
  furnW(8.15, 5.85, 0.26, 0.20, 0.05, 0.41, matSofa, false);    // livros
  furnW(8.13, 5.86, 0.23, 0.17, 0.04, 0.46, matCar,  false);
  cyl(0.10, 0.12, 0.10, 14, matSteel, 8.18, 0.46, 6.45);        // bowl

  // --- TV + rack na parede leste ---
  furnW(9.60, 6.20, 0.44, 1.70, 0.42, 0.14, matWood, true);     // rack
  cabDoors(9.38, 6.20, 1.70, 0.42, 0.14, 2, -1, 0, matDark);    // (9.38 = face frontal)
  [[-1],[1]].forEach(([k])=> furnW(9.60+0, 6.20+k*0.72, 0.07, 0.07, 0.14, 0, matMetal, false));
  furnW(9.78, 6.20, 0.09, 0.40, 0.06, 0.56, matDark, false);    // pé da TV
  furnW(9.78, 6.20, 0.07, 1.34, 0.78, 0.62, matDark, false);    // moldura da TV
  furnW(9.735, 6.20, 0.02, 1.26, 0.70, 0.66, matScreen, false); // tela
  furnW(9.60, 6.90, 0.16, 0.30, 0.10, 0.56, matDark, false);    // caixa de som / receiver

  // --- luminária de piso, quadros e planta ---
  cyl(0.17, 0.17, 0.03, 16, matMetal, 6.72, 0.02, 7.62);
  cyl(0.022, 0.022, 1.48, 10, matMetal, 6.72, 0.76, 7.62);
  cyl(0.20, 0.15, 0.26, 16, matLamp, 6.72, 1.62, 7.62);
  picture(6.44, 5.60, 0.62, 0.46, 1.42, 1, 0, matSofa);
  picture(6.44, 6.80, 0.62, 0.46, 1.42, 1, 0, matCar);
  plant(9.55, 4.55, 1.05);
})();

// -- Dining / Kitchen  (mundo x4.26–9.84, z8.06–11.79) — a parede norte é a parede sul da suíte
//    Bancada em L na parede leste; mesa de jantar no miolo oeste, longe das 4 portas.
(function(){
  // --- BANCADA na parede leste (z 8.90–11.70) ---
  furnW(9.56, 10.30, 0.56, 2.80, 0.82, 0.06, matCabinet, true);        // armários inferiores
  cabDoors(9.28, 10.30, 2.80, 0.82, 0.06, 4, -1, 0, matCabinet);       // (9.28 = face frontal)
  furnW(9.56, 10.30, 0.62, 2.86, 0.05, 0.88, matGranite, false);       // tampo de granito
  furnW(9.81, 10.30, 0.06, 2.86, 0.28, 0.93, matGranite, false);       // rodabanca
  furnW(9.62, 10.75, 0.44, 1.86, 0.62, 1.52, matCabinet, true);        // armários superiores
  cabDoors(9.40, 10.75, 1.86, 0.62, 1.52, 3, -1, 0, matCabinet);       // (vão livre sobre o cooktop)

  // cooktop + coifa
  furnW(9.54, 9.42, 0.48, 0.62, 0.02, 0.93, matDark, false);
  [[9.42,9.28],[9.66,9.28],[9.42,9.56],[9.66,9.56]].forEach(([x,z])=>{
    cyl(0.085, 0.085, 0.025, 14, matDark, x, 0.955, z);
    cyl(0.05, 0.05, 0.02, 10, matMetal, x, 0.975, z);
  });
  furnW(9.60, 9.42, 0.48, 0.70, 0.14, 1.52, matSteel, false);          // coifa
  furnW(9.60, 9.42, 0.30, 0.34, 0.55, 1.66, matSteel, false);          // duto

  // pia embutida + torneira
  furnW(9.54, 10.95, 0.42, 0.54, 0.02, 0.905, matSteel, false);
  furnW(9.54, 10.95, 0.36, 0.48, 0.10, 0.80, matSteel, false);         // cuba
  faucet(9.75, 10.95, 0.93, -1, 0);

  // --- GELADEIRA duplex no canto sudeste ---
  furnW(9.47, 8.44, 0.72, 0.74, 1.86, 0.0, matSteel, true);
  furnW(9.10, 8.44, 0.02, 0.70, 1.20, 0.10, matDark, false);           // frente: porta de baixo
  furnW(9.10, 8.44, 0.02, 0.70, 0.52, 1.32, matDark, false);           // freezer
  furnW(9.09, 8.16, 0.03, 0.05, 0.62, 0.55, matMetal, false);          // puxadores
  furnW(9.09, 8.16, 0.03, 0.05, 0.34, 1.42, matMetal, false);

  // --- MESA DE JANTAR + 4 cadeiras (miolo oeste) ---
  const tx = 6.20, tz = 9.90;
  furnW(tx, tz, 1.40, 0.90, 0.06, 0.72, matWood, true);                // tampo
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>
    furnW(tx+a*0.60, tz+b*0.35, 0.07, 0.07, 0.72, 0, matWood, false)); // pés
  chair(tx-0.42, tz-0.72, matSofa, 0, -1);
  chair(tx+0.42, tz-0.72, matSofa, 0, -1);
  chair(tx-0.42, tz+0.72, matSofa, 0,  1);
  chair(tx+0.42, tz+0.72, matSofa, 0,  1);
  // fruteira + jogo americano
  cyl(0.15, 0.11, 0.09, 16, matWood, tx, 0.82, tz);
  [[0.055,matCar],[0.05,matGreen],[0.05,matLamp]].forEach(([r,m],i)=>
    sph(r, m, tx-0.06+i*0.06, 0.88, tz+(i%2)*0.05));

  // --- pendentes sobre a mesa ---
  [-0.42, 0.42].forEach(d=>{
    box(tx+d, 2.30, tz, 0.014, 0.72, 0.014, matDark, false);
    cyl(0.06, 0.15, 0.20, 14, matLamp, tx+d, 1.86, tz);
  });

  // --- despenseiro alto na parede oeste, ENTRE as duas portas (z9.02 e z11.02) ---
  furnW(4.60, 10.02, 0.68, 0.60, 2.10, 0.0, matCabinet, true);
  cabDoors(4.94, 10.02, 0.60, 2.10, 0.0, 2, 1, 0, matCabinet);
  plant(6.60, 11.48, 1.0);                                             // fora dos vãos
})();

// ============================================================
//  KIDS ROOM (o Dorm.02 da planta)  — mundo x1.86–4.14, z7.31–10.29
//  Beliche na parede norte · escrivaninha sob a janela oeste · guarda-roupa,
//  baú e estante na parede sul · porta na parede leste (z8.22–9.02, deixar livre).
// ============================================================
(function(){
  const kBlue = std({ color:0x4f93d6, roughness:0.80 });
  const kRed  = std({ color:0xe0543f, roughness:0.80 });
  const kYel  = std({ color:0xf2c14e, roughness:0.80 });
  const kGrn  = std({ color:0x5fb37a, roughness:0.80 });
  const kPink = std({ color:0xe78bab, roughness:0.80 });
  const kFur  = std({ color:0xb98a5e, roughness:0.95 });
  const matPaper = std({ map:texKids, roughness:0.92, metalness:0.0 });

  // --- papel de parede nas duas paredes cegas (faces internas: z7.31 e z10.29) ---
  box(3.00, 1.39, 7.325, 2.24, 2.55, 0.02, matPaper, false);
  box(3.00, 1.39, 10.275, 2.24, 2.55, 0.02, matPaper, false);

  // --- BELICHE (parede norte, cabeceira a oeste) — x1.92–3.82, z9.34–10.26 ---
  const bx = 2.87, bz = 9.80, bw = 1.90, bd = 0.92;
  [[1.96,9.40],[1.96,10.20],[3.78,9.40],[3.78,10.20]].forEach(([x,z])=>
    furnW(x, z, 0.09, 0.09, 1.76, 0.0, matWood, false));            // montantes
  [[0.30, kBlue, 0.52],[1.26, kRed, 1.48]].forEach(([y, quilt, py])=>{
    furnW(bx, bz, bw, bd, 0.06, y, matWood, true);                  // estrado
    furnW(bx, bz, bw-0.10, bd-0.08, 0.16, y+0.06, matBed, false);   // colchão
    furnW(bx+0.14, bz+0.06, bw-0.44, bd-0.16, 0.05, y+0.22, quilt, false); // edredom
    furnW(bx-0.62, bz, 0.50, 0.30, 0.12, y+0.22, matWhite, false);  // travesseiro
    furnW(bx, bz-bd/2+0.03, bw, 0.05, 0.10, y, matWood, false);     // travessa sul
  });
  furnW(2.55, 9.36, 1.20, 0.06, 0.09, 1.63, matWood, false);        // guarda-corpo de cima
  furnW(2.55, 9.36, 0.06, 0.06, 0.28, 1.42, matWood, false);
  furnW(3.14, 9.36, 0.06, 0.06, 0.28, 1.42, matWood, false);
  [0.52, 0.78, 1.04, 1.30].forEach(y=>                              // escada (ponta leste)
    furnW(3.66, 9.29, 0.40, 0.05, 0.045, y, matWood, false));
  furnW(3.47, 9.29, 0.05, 0.05, 1.10, 0.30, matWood, false);
  furnW(3.85, 9.29, 0.05, 0.05, 1.10, 0.30, matWood, false);

  // --- ESCRIVANINHA sob a janela oeste (peitoril h=1,10) ---
  furnW(2.16, 8.75, 0.58, 1.10, 0.05, 0.68, matWood, true);         // tampo (x1.87–2.45)
  furnW(1.92, 8.75, 0.06, 1.04, 0.68, 0.00, matWood, false);        // laterais
  furnW(2.40, 8.75, 0.06, 1.04, 0.68, 0.00, matWood, false);
  furnW(2.16, 8.34, 0.50, 0.20, 0.30, 0.34, kYel, false);           // gaveteiro colorido
  furnW(2.16, 9.16, 0.44, 0.16, 0.04, 0.73, matWhite, false);       // caderno
  [[0.16,kRed],[0.20,kBlue],[0.24,kGrn]].forEach(([h,m],i)=>        // porta-lápis
    furnW(2.28+i*0.03, 8.90, 0.03, 0.03, h, 0.73, m, false));
  furnW(2.06, 8.92, 0.09, 0.09, 0.26, 0.73, matMetal, false);       // luminária
  furnW(2.11, 8.92, 0.18, 0.16, 0.07, 0.99, kRed, false);
  // cadeirinha virada pra escrivaninha
  furnW(2.78, 8.75, 0.40, 0.40, 0.05, 0.00, matWood, false);
  furnW(2.78, 8.75, 0.07, 0.07, 0.34, 0.05, matMetal, false);
  furnW(2.78, 8.75, 0.38, 0.38, 0.07, 0.39, kGrn, false);
  furnW(2.94, 8.75, 0.07, 0.36, 0.40, 0.46, kGrn, false);

  // --- GUARDA-ROUPA, BAÚ e ESTANTE na parede sul (frentes viradas p/ o NORTE) ---
  furnW(3.02, 7.60, 1.00, 0.56, 1.85, 0.00, matWood, true);         // guarda-roupa (z7.32–7.88)
  furnW(2.77, 7.865, 0.46, 0.03, 1.72, 0.06, kBlue, false);         // portas (frente)
  furnW(3.27, 7.865, 0.46, 0.03, 1.72, 0.06, kYel,  false);
  furnW(2.96, 7.895, 0.04, 0.03, 0.16, 0.90, matMetal, false);      // puxadores
  furnW(3.08, 7.895, 0.04, 0.03, 0.16, 0.90, matMetal, false);

  furnW(2.16, 7.62, 0.52, 0.60, 0.42, 0.00, kRed, true);            // baú de brinquedos
  furnW(2.16, 7.62, 0.56, 0.64, 0.06, 0.42, kYel, false);           // tampa
  furnW(2.16, 7.925, 0.10, 0.04, 0.05, 0.45, matMetal, false);      // fecho (frente)

  furnW(3.86, 7.66, 0.48, 0.68, 1.15, 0.00, matWood, true);         // estante (z7.32–8.00)
  [[0.39,kBlue],[0.75,kGrn]].forEach(([y,m])=>                      // livros salientes na frente
    furnW(3.80, 7.975, 0.26, 0.10, 0.24, y, m, false));
  [[0.39,kRed],[0.75,kYel]].forEach(([y,m])=>
    furnW(3.99, 7.975, 0.14, 0.10, 0.20, y, m, false));

  // --- TAPETE redondo colorido ---
  const rug = new THREE.Mesh(new THREE.CircleGeometry(0.60, 36),
    std({ map:texRug, roughness:0.97, metalness:0.0 }));
  rug.rotation.x = -Math.PI/2; rug.position.set(3.20, 0.012, 8.72);
  rug.receiveShadow = true; world.add(rug);

  // --- BRINQUEDOS no tapete: blocos, bola e ursinho ---
  [[3.02,8.50,kRed],[3.16,8.46,kBlue],[3.09,8.48,kYel]].forEach(([x,z,m],i)=>
    furnW(x, z, 0.12, 0.12, 0.12, i*0.12, m, false));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13,16,12), kGrn);
  ball.position.set(3.52, 0.13, 8.95); world.add(ball);
  const tx = 2.95, tz = 9.05;                                        // ursinho
  const put = (m,x,y,z,s)=>{ m.position.set(x,y,z); if(s) m.scale.setScalar(s); world.add(m); };
  put(new THREE.Mesh(new THREE.SphereGeometry(0.11,14,12), kFur), tx, 0.12, tz);
  put(new THREE.Mesh(new THREE.SphereGeometry(0.085,14,12), kFur), tx, 0.29, tz);
  put(new THREE.Mesh(new THREE.SphereGeometry(0.035,10,8), kFur), tx-0.06, 0.36, tz);
  put(new THREE.Mesh(new THREE.SphereGeometry(0.035,10,8), kFur), tx+0.06, 0.36, tz);
  put(new THREE.Mesh(new THREE.SphereGeometry(0.045,10,8), kFur), tx-0.12, 0.14, tz);
  put(new THREE.Mesh(new THREE.SphereGeometry(0.045,10,8), kFur), tx+0.12, 0.14, tz);

  // --- QUADRINHOS na parede leste (ao norte da porta) ---
  [[9.42, kYel, kBlue],[9.94, kRed, kGrn]].forEach(([z, frame, art])=>{
    furnW(4.12, z, 0.03, 0.46, 0.60, 1.32, frame, false);
    furnW(4.10, z, 0.02, 0.38, 0.52, 1.36, art,  false);
  });

  // --- MÓBILE pendurado + estrelas no teto ---
  [[2.70,8.55,kRed],[3.05,8.40,kYel],[3.35,8.62,kBlue]].forEach(([x,z,m],i)=>{
    box(x, 2.42-i*0.05, z, 0.012, 0.36, 0.012, matWood, false);
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.07,12,10), m);
    s.position.set(x, 2.20-i*0.05, z); world.add(s);
  });
  [[2.25,7.95],[3.60,8.20],[2.55,9.10],[3.85,9.60],[2.05,8.60]].forEach(([x,z])=>{
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.012,6), matLamp);
    st.position.set(x, CEIL-0.03, z); world.add(st);
  });
})();

// ---- louças (Z em metros de MUNDO). (wx,wz) = direção da parede onde a caixa encosta ----
function toilet(cx, mz, wx, wz){
  wx = wx || 0; wz = (wx === 0 && !wz) ? -1 : (wz || 0);
  const lx = wz ? 1.0 : 1.34, lz = wz ? 1.34 : 1.0;      // bacia alongada no eixo do vaso
  cyl(0.115, 0.145, 0.24, 14, matWhite, cx - wx*0.03, 0.12, mz - wz*0.03, lx*0.78, lz*0.78);  // pé
  cyl(0.185, 0.155, 0.17, 20, matWhite, cx, 0.315, mz, lx, lz);                               // bacia
  cyl(0.195, 0.195, 0.035, 20, matWhite, cx, 0.415, mz, lx, lz);                              // assento
  cyl(0.185, 0.185, 0.025, 20, matWhite, cx + wx*0.10, 0.45, mz + wz*0.10, lx*0.98, lz*0.98); // tampa
  furnW(cx + wx*0.28, mz + wz*0.28, wz?0.38:0.17, wz?0.17:0.38, 0.44, 0.20, matWhite, false); // caixa
  furnW(cx + wx*0.28, mz + wz*0.28, wz?0.40:0.19, wz?0.19:0.40, 0.03, 0.64, matWhite, false); // tampo
  furnW(cx + wx*0.28, mz + wz*0.28, 0.07, 0.07, 0.02, 0.665, matMetal, false);                // acionador
}
// lavatório de coluna. (nx,nz) = pra onde a cuba olha (lado oposto à parede)
function sink(cx, mz, nx, nz){
  nx = nx || 0; nz = (nx === 0 && !nz) ? 1 : (nz || 0);
  cyl(0.095, 0.14, 0.62, 12, matWhite, cx, 0.31, mz);                        // coluna
  furnW(cx, mz, 0.52, 0.42, 0.15, 0.62, matWhite, false);                    // corpo da cuba
  furnW(cx + nx*0.03, mz + nz*0.03, 0.36, 0.26, 0.05, 0.705, matDark, false);// bojo
  faucet(cx - nx*0.16, mz - nz*0.16, 0.77, nx, nz);
}

// -- Master Suite — sala principal (mundo x1.86–6.19, z11.91–14.77)
//    + nicho/closet ao lado do WC (mundo x4.56–6.19, z14.77–17.29)
(function(){
  const matHead = std({ color:0x4a4034, roughness:0.85 });
  const matRugS = std({ color:0x9a8b76, roughness:0.97, metalness:0.0 });

  bed(3.30, 13.15, 1.60, 2.00);                                // cama de casal, cabeceira ao sul
  furnW(3.30, 12.00, 1.86, 0.10, 1.12, 0.10, matHead, false);  // cabeceira estofada
  [-1,0,1].forEach(k=> furnW(3.30+k*0.60, 11.98, 0.54, 0.06, 0.44, 0.52, matSofa, false)); // capitonê

  // criados-mudos com gaveta e abajur (frente virada pro NORTE, pro vazio do quarto)
  [2.25, 4.35].forEach(x=>{
    furnW(x, 12.38, 0.46, 0.44, 0.50, 0.06, matWood, true);
    drawers(x, 12.60, 0.46, 0.50, 0.06, 2, 0, 1, matWood);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=> furnW(x+a*0.18, 12.38+b*0.17, 0.05, 0.05, 0.06, 0, matWood, false));
    cyl(0.07, 0.09, 0.24, 12, matMetal, x, 0.68, 12.38);
    cyl(0.13, 0.10, 0.18, 14, matLamp, x, 0.89, 12.38);
  });

  // cômoda com gavetas + espelho (parede leste)
  furnW(5.90, 13.60, 0.50, 1.30, 0.82, 0.06, matWood, true);
  drawers(5.65, 13.60, 1.30, 0.82, 0.06, 3, -1, 0, matWood);   // (5.65 = face frontal)
  furnW(5.90, 13.60, 0.54, 1.34, 0.04, 0.88, matDark, false);
  furnW(6.16, 13.60, 0.04, 0.90, 1.00, 1.00, matSteel, false);   // espelho
  furnW(6.14, 13.60, 0.03, 0.98, 0.06, 2.00, matWood, false);

  // banqueta aos pés da cama
  furnW(3.30, 14.42, 1.10, 0.42, 0.14, 0.34, matSofa, false);
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=> furnW(3.30+a*0.48, 14.42+b*0.15, 0.06, 0.06, 0.34, 0, matWood, false));

  // tapete lateral
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.60, 2.20), matRugS);
  rug.rotation.x = -Math.PI/2; rug.position.set(4.90, 0.013, 13.30);
  rug.receiveShadow = true; world.add(rug);

  // closet no nicho
  furnW(5.88, 16.00, 0.58, 1.80, 2.10, 0.0, matWood, true);
  cabDoors(5.59, 16.00, 1.80, 2.10, 0.0, 2, -1, 0, matCabinet);   // (5.59 = face frontal)
  plant(4.80, 16.90, 1.0);
  // quadro na parede sul, a leste da cama (a oeste tem a porta-janela)
  picture(4.85, 11.94, 0.55, 0.75, 1.32, 0, 1, matSofa);
})();

// -- Ensuite (WC Suíte) — canto fundo-oeste (mundo x 1.86–4.44, z 14.89–17.29).
//    Box encostado na parede dos fundos (sob a janela), vaso na parede oeste,
//    bancada com duas cubas na parede sul, porta na parede leste.
(function(){
  // --- BOX na parede dos fundos: base rebaixada, vidro com perfil e ferragens ---
  furnW(3.15, 16.85, 2.50, 0.86, 0.05, 0.0, matGranite, false);  // base de granito
  furnW(2.65, 16.40, 1.50, 0.04, 1.92, 0.05, matGlass, true);    // vidro (entrada pelo leste)
  furnW(2.65, 16.40, 1.50, 0.05, 0.05, 1.97, matMetal, false);   // perfil superior
  furnW(3.39, 16.40, 0.05, 0.05, 1.92, 0.05, matMetal, false);   // montante da abertura
  furnW(3.30, 16.42, 0.14, 0.05, 0.03, 1.10, matMetal, false);   // puxador
  // chuveiro: haste + braço + ducha + registro
  cyl(0.022, 0.022, 0.55, 10, matMetal, 1.90, 1.90, 16.85);
  furnW(2.02, 16.85, 0.26, 0.05, 0.05, 2.14, matMetal, false);
  cyl(0.11, 0.09, 0.05, 16, matMetal, 2.16, 2.11, 16.85);
  cyl(0.045, 0.045, 0.06, 12, matMetal, 1.90, 1.30, 16.85);

  toilet(2.25, 15.90, -1, 0);                                    // vaso na parede oeste
  furnW(1.90, 15.62, 0.10, 0.06, 0.09, 0.72, matMetal, false);   // papeleira

  // --- BANCADA dupla na parede sul: gabinete + granito + cubas embutidas ---
  furnW(3.30, 15.24, 1.70, 0.52, 0.76, 0.06, matCabinet, true);  // gabinete
  cabDoors(3.30, 15.50, 1.70, 0.76, 0.06, 2, 0, 1, matCabinet);  // (15.50 = face frontal)
  furnW(3.30, 15.22, 1.76, 0.58, 0.05, 0.82, matGranite, false); // tampo
  furnW(3.30, 14.98, 1.76, 0.06, 0.14, 0.87, matGranite, false); // rodabanca
  [2.92, 3.68].forEach(x=>{
    furnW(x, 15.28, 0.38, 0.32, 0.02, 0.845, matWhite, false);   // cuba embutida
    furnW(x, 15.28, 0.32, 0.26, 0.09, 0.75, matWhite, false);
    faucet(x, 15.06, 0.87, 0, 1);
  });
  furnW(3.30, 15.00, 1.60, 0.03, 0.92, 1.02, matSteel, false);   // espelho
  furnW(3.30, 14.99, 1.68, 0.04, 0.05, 1.94, matWood, false);    // sanca do espelho
  towel(1.92, 15.15, 1.25, 0.42, 1, 0, matSofa);                 // toalheiro (parede oeste, livre)
})();

// -- Guest Bathroom (WC Social) — louças na parede sul  (mundo x1.86–4.14, z10.41–11.79)
(function(){
  toilet(2.55, 10.78, 0, -1);                                  // caixa encostada na parede sul
  sink(3.58, 10.72, 0, 1);                                     // lavatório de coluna, cuba p/ o norte
  furnW(3.58, 10.48, 0.62, 0.04, 0.72, 1.02, matSteel, false); // espelho
  furnW(3.58, 10.46, 0.70, 0.04, 0.05, 1.76, matWood, false);  // moldura superior
  towel(1.92, 11.30, 1.35, 0.55, 1, 0, matSofa);               // toalheiro na parede oeste
  furnW(3.10, 10.47, 0.10, 0.06, 0.10, 0.95, matMetal, false); // papeleira
  plant(3.95, 11.55, 0.62);
})();

// -- Laundry / área de serviço (pátio aberto)  (mundo x6.31–9.84, z11.91–17.29)
(function(){
  // tanque de lavar roupa com esfregador inclinado e torneira
  furnW(6.85, 16.10, 0.60, 0.56, 0.62, 0.0, matCabinet, true);
  cabDoors(6.55, 16.10, 0.56, 0.62, 0.0, 1, -1, 0, matCabinet);  // (6.55 = face frontal)
  furnW(6.85, 16.10, 0.66, 0.62, 0.10, 0.62, matWhite, false);
  furnW(6.85, 16.10, 0.54, 0.50, 0.05, 0.68, matDark,  false); // bojo
  furnW(6.85, 16.38, 0.60, 0.16, 0.22, 0.72, matWhite, false); // esfregador
  faucet(6.85, 16.36, 0.80, 0, -1);

  // máquina de lavar com porta redonda, painel e pés
  furnW(7.60, 16.10, 0.64, 0.62, 0.88, 0.03, matSteel, true);
  furnW(7.60, 16.10, 0.60, 0.58, 0.10, 0.91, matSteel, false); // tampo
  cyl(0.20, 0.20, 0.04, 20, matDark,  7.60, 0.52, 15.78).rotation.x = Math.PI/2;
  cyl(0.155, 0.155, 0.05, 20, matGlass, 7.60, 0.52, 15.77).rotation.x = Math.PI/2;
  furnW(7.60, 15.79, 0.46, 0.02, 0.10, 0.76, matDark, false);  // painel
  [[7.42],[7.54],[7.66]].forEach(([x],i)=> furnW(x, 15.78, 0.05, 0.02, 0.05, 0.79, i?matMetal:matScreen, false));

  // prateleira com produtos, acima das máquinas
  furnW(7.25, 16.30, 1.60, 0.30, 0.04, 1.52, matWood, false);
  [[6.70,matSofa,0.24],[6.98,matGreen,0.20],[7.24,matCar,0.26],[7.52,matLamp,0.18],[7.80,matSofa,0.22]]
    .forEach(([x,m,h])=> furnW(x, 16.30, 0.16, 0.16, h, 1.56, m, false));
  // cesto de roupa
  cyl(0.24, 0.20, 0.52, 14, matCabinet, 8.30, 0.26, 16.30);

  // varal
  const matRope = std({ color:0xdad4c6, roughness:0.9 });
  [12.9, 16.9].forEach(z=>{
    furnW(6.60, z, 0.07, 0.07, 1.90, 0.0, matMetal, false);
    furnW(6.60, z, 0.60, 0.07, 0.06, 1.86, matMetal, false);
  });
  [1.62, 1.74, 1.86].forEach(y=> box(6.60, y, 14.90, 0.02, 0.02, 4.00, matRope, false));
})();

// -- Churrasqueira de alvenaria, encostada no muro leste do pátio.
//    Boca virada pro oeste (pro pátio); coifa + chaminé.
//    Porte de FOGÃO: 0,66 de profundidade x 0,95 de frente, topo da chaminé a 2,49.
//    (X = profundidade, saindo do muro · Z = frente, ao longo do muro)
(function(){
  const CX = 9.55, CZ = 13.70;                       // centro (x 9.22–9.88)
  const matBrick = std({ color:0xb4634a, roughness:0.95 });
  const matEmber = new THREE.MeshBasicMaterial({ color:0xff5a1e });

  furnW(CX, CZ,        0.66, 0.95, 0.86, 0.00, matBrick, true);   // base de alvenaria
  furnW(CX, CZ,        0.72, 1.01, 0.05, 0.86, matSteel, false);  // tampo de granito
  furnW(CX, CZ-0.42,   0.66, 0.11, 0.62, 0.91, matBrick, false);  // ombreira sul
  furnW(CX, CZ+0.42,   0.66, 0.11, 0.62, 0.91, matBrick, false);  // ombreira norte
  furnW(CX+0.28, CZ,   0.11, 0.95, 0.62, 0.91, matBrick, false);  // fundo (muro)
  furnW(CX-0.05, CZ,   0.50, 0.70, 0.07, 0.91, matDark,  false);  // leito de carvão
  furnW(CX-0.05, CZ,   0.46, 0.64, 0.02, 0.97, matEmber, false);  // brasa
  furnW(CX-0.05, CZ,   0.52, 0.72, 0.025, 1.03, matMetal, false); // grelha baixa
  furnW(CX-0.05, CZ,   0.52, 0.72, 0.025, 1.20, matMetal, false); // grelha alta

  furnW(CX, CZ,        0.72, 1.01, 0.26, 1.53, matBrick, false);  // coifa
  furnW(CX, CZ,        0.34, 0.36, 0.62, 1.79, matBrick, false);  // chaminé
  furnW(CX, CZ,        0.46, 0.48, 0.08, 2.41, matBrick, false);  // capelo

  // espetos apoiados na grelha
  [13.45, 13.70, 13.95].forEach((z,i)=>
    box(9.53 - i*0.03, 1.26, z, 0.55, 0.022, 0.022, matMetal, false));
  // bancada de apoio ao lado
  furnW(CX, 14.75, 0.66, 0.90, 0.86, 0.0, matBrick, true);
  furnW(CX, 14.75, 0.72, 0.96, 0.05, 0.86, matSteel, false);
})();

// -- Quintal: gramado (piso já é textura de grama), árvore, canteiro e arbustos.
//    Meshes soltos usam Z de MUNDO direto.
(function(){
  const put = (m,x,y,z,sy)=>{ m.position.set(x,y,z); if(sy) m.scale.y = sy; world.add(m); return m; };
  const bush = (x,z,r,tint)=> put(new THREE.Mesh(new THREE.SphereGeometry(r,10,8),
      tint || matGreen), x, r*0.62, z, 0.78);

  const matSoil  = std({ color:0x4b3a2a, roughness:1.0 });
  const matBloom = std({ color:0xd9556b, roughness:0.85 });
  const matBloom2= std({ color:0xe8c341, roughness:0.85 });
  const matSlab  = std({ color:0xbdb7a8, roughness:0.92 });

  // duas árvores, espalhadas na profundidade nova
  const tree = (x,z,s)=>{
    put(new THREE.Mesh(new THREE.CylinderGeometry(0.16*s,0.22*s,1.7*s,10), matTrunk), x, 0.77*s, z);
    put(new THREE.Mesh(new THREE.SphereGeometry(1.15*s,14,12), matGreen), x, 2.10*s, z);
    put(new THREE.Mesh(new THREE.SphereGeometry(0.82*s,14,12), matGreen), x+0.65*s, 1.80*s, z+0.45*s);
    put(new THREE.Mesh(new THREE.SphereGeometry(0.78*s,14,12), matGreen), x-0.65*s, 1.85*s, z+0.50*s);
  };
  tree(7.60, 19.30, 1.00);
  tree(2.10, 21.10, 0.82);

  // caminho de pedras do beiral até o fundo do quintal
  for(let i=0;i<8;i++)
    box(5.10 + Math.sin(i*0.9)*0.55, -0.028, 17.85 + i*0.62, 0.62, 0.06, 0.44, matSlab, false);

  // canteiro de terra rente ao NOVO muro dos fundos, com arbustos e flores
  box(5.0, -0.02, 22.18, 9.4, 0.10, 0.84, matSoil, false);
  for(let i=0;i<11;i++){
    const x = 0.7 + i*0.86;
    bush(x, 22.02 + (i%2)*0.28, 0.26 + (i%3)*0.06);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.07,8,6), i%2 ? matBloom : matBloom2);
    put(f, x + 0.18, 0.42, 22.26);
  }
  // moitas soltas espalhadas por toda a profundidade do gramado
  [[1.3,18.2,0.40],[3.9,18.1,0.36],[9.2,18.6,0.42],[0.8,17.9,0.30],
   [9.35,20.4,0.38],[0.85,20.2,0.34],[3.5,20.9,0.30],[8.6,21.6,0.32],
   [6.4,20.5,0.36],[1.6,19.4,0.28]].forEach(([x,z,r])=> bush(x,z,r));

  // canteiro lateral no corredor oeste
  box(0.95, -0.02, 14.0, 1.30, 0.10, 5.0, matSoil, false);
  [[0.7,12.4,0.30],[1.15,13.4,0.26],[0.8,14.6,0.32],[1.2,15.6,0.28]].forEach(([x,z,r])=> bush(x,z,r));
})();

// ---- sombras: tudo que foi adicionado solto ao `world` também entra ----
world.traverse(o=>{
  if(!o.isMesh) return;
  o.receiveShadow = true;
  o.castShadow = !(o.material && o.material.transparent);   // vidro não projeta sombra
});

// ============================================================
//  JOGADOR / CONTROLES
// ============================================================
const player = { x:7.35, z:zr(1.2), yaw:0, pitch:0, eye:1.6, radius:0.24, lift:0 };
let started = false;
let noclip = true;    // BUILD 10: modo topografia — atravessa paredes por padrão

function floorYAt(x,z){
  for(const r of ROOMS){ if(x>=r.x0 && x<=r.x1 && z>=r.z0 && z<=r.z1) return r.fy; }
  return 0.0;
}
function roomNameAt(x,z){
  for(const r of ROOMS){ if(x>=r.x0 && x<=r.x1 && z>=r.z0 && z<=r.z1) return r.name; }
  if(z < 0) return 'Street';
  return 'Outside';
}

// resolução de colisão por eixo (desliza nas paredes). Em noclip, só os limites do mundo.
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
  // limites do mundo (folgados no noclip, p/ dar a volta na casa)
  const xlo = noclip ? -4.0 : 0.25, xhi = noclip ? 14.0 : 9.75;
  const zlo = noclip ? -8.0 : -3.5, zhi = noclip ? ZMAX + 4 : ZMAX - 0.25;
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
// (isTouch é definido lá em cima, junto do renderer — decide o tamanho do shadow map)
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
const MW = 120, MH = 240;          // px do minimapa
mini.width = MW; mini.height = MH;

// Minimapa usa a PRÓPRIA planta (house.jpeg). Calibração do lote em pixels da imagem:
// canto sup-esq da região = mundo (x=0, z=20/fundos); canto inf-dir = mundo (x=10, z=0/frente).
// A planta cobre só os 20 m originais; o quintal esticado (20 -> ZMAX) vira uma
// faixa verde no topo do minimapa.
const LOT = { x0:47, y0:155, x1:660, y1:1481 };
const PLANH = Math.round(MH * 20 / ZMAX);   // altura do recorte da planta, em px
const planImg = new Image();
let planReady = false;
const planCanvas = document.createElement('canvas'); // recorte já escalado (offscreen)
planCanvas.width = MW; planCanvas.height = PLANH;
planImg.onload = ()=>{
  planCanvas.getContext('2d').drawImage(
    planImg, LOT.x0, LOT.y0, LOT.x1-LOT.x0, LOT.y1-LOT.y0, 0, 0, MW, PLANH);
  planReady = true;
};
planImg.src = './house.jpeg?v=16';

function drawMini(){
  mctx.fillStyle = planReady ? '#4f8a41' : '#1c2530';   // faixa do quintal esticado
  mctx.fillRect(0, 0, MW, MH);
  if(planReady) mctx.drawImage(planCanvas, 0, MH - PLANH);
  // estacas: polilinha + pontos (dá pra ver o contorno se formando)
  if(stakes.length){
    const px = s => (s.x/10)*MW, py = s => (1 - s.z/ZMAX)*MH;
    if(stakes.length > 1){
      mctx.strokeStyle='rgba(255,211,77,.9)'; mctx.lineWidth=1.5;
      mctx.beginPath(); mctx.moveTo(px(stakes[0]), py(stakes[0]));
      for(let i=1;i<stakes.length;i++) mctx.lineTo(px(stakes[i]), py(stakes[i]));
      mctx.closePath(); mctx.stroke();
    }
    mctx.fillStyle='#ffd34d';
    for(const s of stakes){ mctx.beginPath(); mctx.arc(px(s),py(s),2.6,0,7); mctx.fill(); }
  }
  // jogador: x -> direita, z=0 (frente) embaixo, fundos em cima (igual à planta)
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
//  (ferramenta de autoria: o André marca os cantos reais de um
//   cômodo e manda as coordenadas de volta pra eu ajustar a planta)
// ============================================================
const stakes = [];                                  // [{x,z}] em metros de MUNDO
const stakeGroup = new THREE.Group(); scene.add(stakeGroup);
const matStake  = new THREE.MeshBasicMaterial({ color:0xff3b30 });
const matStakeT = new THREE.MeshBasicMaterial({ color:0xffd34d });
const geoPole = new THREE.CylinderGeometry(0.035,0.035,1.20,8);
const geoBall = new THREE.SphereGeometry(0.10,10,8);

// anel que mostra onde a estaca vai cair
const aimRing = new THREE.Mesh(
  new THREE.RingGeometry(0.11,0.18,24),
  new THREE.MeshBasicMaterial({ color:0xffd34d, side:THREE.DoubleSide, transparent:true, opacity:0.95 }));
aimRing.rotation.x = -Math.PI/2; aimRing.visible = false; scene.add(aimRing);

// ponto onde a direção da câmera cruza o piso (plano y=0)
function aimPoint(){
  const dy = Math.sin(player.pitch);
  if(dy > -0.03) return null;                       // olhando pro horizonte ou pra cima
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
  pole.castShadow = ball.castShadow = true;
  stakeGroup.add(pole); stakeGroup.add(ball);
  renderer.shadowMap.needsUpdate = true;      // shadow map é manual (autoUpdate off)
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
// (não consigo testar aqui; estes dois botões deixam o André calibrar no aparelho)
let shadowsOn = true;
function setShadows(v){
  shadowsOn = v;
  renderer.shadowMap.enabled = v;
  renderer.shadowMap.needsUpdate = true;
  scene.traverse(o=>{ if(o.isMesh && o.material) o.material.needsUpdate = true; });
  const b = document.getElementById('btnShadow');
  b.textContent = 'SHADOW ' + (v ? 'ON' : 'OFF');
  b.classList.toggle('on', v);
  flash('shadows ' + (v ? 'on' : 'off'));
}
const EXPO = [0.80, 0.92, 1.00, 1.12, 1.28];
let expoI = 2;
function cycleExposure(){
  expoI = (expoI + 1) % EXPO.length;
  renderer.toneMappingExposure = EXPO[expoI];
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

// atalhos de teclado (desktop)
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
function tick(now){
  const dt = Math.min(0.05, (now-last)/1000); last = now;

  if(started){
    // entrada de movimento
    let mf=0, ms=0;
    if(keys['KeyW']||keys['ArrowUp'])    mf += 1;
    if(keys['KeyS']||keys['ArrowDown'])  mf -= 1;
    if(keys['KeyD']||keys['ArrowRight']) ms += 1;
    if(keys['KeyA']||keys['ArrowLeft'])  ms -= 1;
    if(stick.active){ mf -= stick.dy; ms += stick.dx; }

    const run = keys['ShiftLeft']||keys['ShiftRight'];
    const speed = (run ? 4.2 : 2.5) * dt;
    // vetores no plano (yaw=0 -> +Z). strafe = "direita da câmera" (-X quando olha +Z)
    const fx = Math.sin(player.yaw),  fz = Math.cos(player.yaw);
    const sx = -Math.cos(player.yaw), sz = Math.sin(player.yaw);
    let dx = (fx*mf + sx*ms), dz = (fz*mf + sz*ms);
    const l = Math.hypot(dx,dz);
    if(l > 0.001){ dx = dx/l*speed; dz = dz/l*speed;
      const [nx,nz] = resolve(player.x, player.z, dx, dz);
      player.x = nx; player.z = nz;
    }
  }

  // altura do olho (suave nas transições de nível) + "lift" do modo topografia
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

  // mira no chão: anel no mundo + leitura x/z na tela
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
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

camera.position.set(player.x, player.eye, player.z);
document.getElementById('build').textContent = 'BUILD '+BUILD;
requestAnimationFrame(tick);

import * as THREE from 'three';
import {rand,clamp} from './constants.js';
import {scene,renderer,hemi,dlight,sunDir,clouds} from './engine.js';
import {buildingMats,lampGlowMat,lampHaloMat,lampBulbMat} from './world.js';
import {state,refs} from './state.js';
import {beamMat} from './entities.js?v=12';

// Ciclo completo em segundos. tod: 0=meia-noite, .25=nascer do sol, .5=meio-dia, .75=pôr do sol
const DAY_LEN=300;
// A noite corre mais rápido que o dia (sol abaixo do horizonte = relógio 2.2x)
const NIGHT_MULT=2.2;
// ?tod=0..1 na URL força o horário inicial (debug); padrão início da tarde,
// o primeiro pôr do sol chega em ~1 min
const urlTod=parseFloat(new URLSearchParams(location.search).get('tod'));
let tod=isNaN(urlTod)?.55:((urlTod%1)+1)%1;
export const getTod=()=>tod;

// Keyframes do ciclo. sky = 5 paradas do gradiente (zênite -> horizonte).
// sun = cor da luz direcional (vira luar à noite), win = brilho das janelas dos prédios.
const KF=[
 {t:.00,sky:['#0a1226','#101a36','#182648','#203456','#2a405f'],fog:'#16243c',
  sun:'#bdd2ff',sunI:.44,hs:'#324468',hg:'#161a26',hI:.46,win:2.0,star:1,exp:1.06,cloud:'#46526e'},
 {t:.17,sky:['#0a1226','#101a36','#182648','#203456','#2a405f'],fog:'#16243c',
  sun:'#bdd2ff',sunI:.44,hs:'#324468',hg:'#161a26',hI:.46,win:2.0,star:1,exp:1.06,cloud:'#46526e'},
 {t:.215,sky:['#0b1430','#1c2048','#3c2a56','#7a3e4e','#c06a4a'],fog:'#503a44',
  sun:'#ff9a5e',sunI:.5,hs:'#3a3658',hg:'#1e161e',hI:.4,win:1.7,star:.6,exp:1.0,cloud:'#8a5e66'},
 {t:.26,sky:['#1a3a6c','#3a5c92','#9a6e8a','#ff9a56','#ffd28e'],fog:'#c08a62',
  sun:'#ffae5e',sunI:1.3,hs:'#7a7494',hg:'#36282a',hI:.62,win:.8,star:.05,exp:1.08,cloud:'#ffb892'},
 {t:.34,sky:['#2a6ec6','#4f9ade','#9ccfeb','#ffe2b8','#fff0d4'],fog:'#c6dcea',
  sun:'#ffe0ae',sunI:2.0,hs:'#aed1f4',hg:'#8a8078',hI:.98,win:.35,star:0,exp:1.2,cloud:'#fff6ea'},
 {t:.50,sky:['#2e7fd9','#5aa7e8','#a8d8f0','#d2eaf8','#eaf5fc'],fog:'#cfe2ee',
  sun:'#fff2da',sunI:2.4,hs:'#bfdfff',hg:'#8a8078',hI:1.05,win:.3,star:0,exp:1.25,cloud:'#ffffff'},
 {t:.66,sky:['#2e7fd9','#5aa7e8','#a8d8f0','#ffe7c4','#fff4dd'],fog:'#cfe2ee',
  sun:'#fff1d6',sunI:2.2,hs:'#bfdfff',hg:'#8a8078',hI:1.05,win:.3,star:0,exp:1.25,cloud:'#fff2e0'},
 {t:.735,sky:['#28509e','#5a5a96','#b06a78','#ff9450','#ffc878'],fog:'#d49a6a',
  sun:'#ffa050',sunI:1.6,hs:'#8a7a8e',hg:'#4a342e',hI:.8,win:.6,star:0,exp:1.18,cloud:'#ffc09a'},
 {t:.77,sky:['#1c2a5e','#46336e','#9c4460','#ff6e3a','#ffb060'],fog:'#b06a4a',
  sun:'#ff6a32',sunI:1.0,hs:'#5c4a6e',hg:'#2c2026',hI:.55,win:1.1,star:.12,exp:1.1,cloud:'#ff8e6a'},
 {t:.81,sky:['#0c1434','#161c44','#2e2454','#642e4e','#9a4a46'],fog:'#352640',
  sun:'#8c9ad8',sunI:.42,hs:'#303656',hg:'#16182a',hI:.43,win:1.8,star:.65,exp:1.03,cloud:'#46405e'},
 {t:.87,sky:['#0a1226','#101a36','#182648','#203456','#2a405f'],fog:'#16243c',
  sun:'#bdd2ff',sunI:.44,hs:'#324468',hg:'#161a26',hI:.46,win:2.0,star:1,exp:1.06,cloud:'#46526e'}
];
// Pré-converte cores para THREE.Color (sem alocação por frame)
const P=KF.map(k=>({t:k.t,sky:k.sky.map(c=>new THREE.Color(c)),fog:new THREE.Color(k.fog),
  sun:new THREE.Color(k.sun),hs:new THREE.Color(k.hs),hg:new THREE.Color(k.hg),
  cloud:new THREE.Color(k.cloud),sunI:k.sunI,hI:k.hI,win:k.win,star:k.star,exp:k.exp}));

const cur={sky:[0,0,0,0,0].map(()=>new THREE.Color()),fog:new THREE.Color(),
  sun:new THREE.Color(),hs:new THREE.Color(),hg:new THREE.Color(),cloud:new THREE.Color(),
  sunI:0,hI:0,win:0,star:0,exp:1};

function sampleKeyframes(){
  let a=P[P.length-1],b=P[0],span=1-a.t+b.t,u=(tod>=a.t?tod-a.t:tod+1-a.t)/span;
  for(let i=0;i<P.length-1;i++)if(tod>=P[i].t&&tod<P[i+1].t){
    a=P[i];b=P[i+1];u=(tod-a.t)/(b.t-a.t);break;
  }
  u=u*u*(3-2*u);
  for(let i=0;i<5;i++)cur.sky[i].lerpColors(a.sky[i],b.sky[i],u);
  cur.fog.lerpColors(a.fog,b.fog,u);cur.sun.lerpColors(a.sun,b.sun,u);
  cur.hs.lerpColors(a.hs,b.hs,u);cur.hg.lerpColors(a.hg,b.hg,u);
  cur.cloud.lerpColors(a.cloud,b.cloud,u);
  cur.sunI=a.sunI+(b.sunI-a.sunI)*u;cur.hI=a.hI+(b.hI-a.hI)*u;
  cur.win=a.win+(b.win-a.win)*u;cur.star=a.star+(b.star-a.star)*u;
  cur.exp=a.exp+(b.exp-a.exp)*u;
}

// --- Cúpula do céu (gradiente redesenhado conforme a hora) ---
const skyCanvas=document.createElement('canvas');skyCanvas.width=16;skyCanvas.height=512;
const skyCtx=skyCanvas.getContext('2d');
const skyTex=new THREE.CanvasTexture(skyCanvas);skyTex.colorSpace=THREE.SRGBColorSpace;
scene.add(new THREE.Mesh(new THREE.SphereGeometry(900,24,16),
  new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide,fog:false})));
const STOPS=[0,.45,.7,.86,1];
function drawSky(){
  const g=skyCtx.createLinearGradient(0,0,0,512);
  for(let i=0;i<5;i++)g.addColorStop(STOPS[i],'#'+cur.sky[i].getHexString());
  skyCtx.fillStyle=g;skyCtx.fillRect(0,0,16,512);
  skyTex.needsUpdate=true;
}

function spriteTex(draw,w=128,h=128){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

// --- Sol (textura neutra; a cor vem do tint do material) ---
const sunMat=new THREE.SpriteMaterial({map:spriteTex(x=>{
  const g=x.createRadialGradient(64,64,6,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.32,'rgba(255,255,255,.92)');
  g.addColorStop(.55,'rgba(255,244,224,.45)');g.addColorStop(1,'rgba(255,232,200,0)');
  x.fillStyle=g;x.fillRect(0,0,128,128);
}),fog:false,depthWrite:false,transparent:true});
const sunSpr=new THREE.Sprite(sunMat);scene.add(sunSpr);

// --- Lua ---
const moonMat=new THREE.SpriteMaterial({map:spriteTex(x=>{
  const halo=x.createRadialGradient(64,64,20,64,64,64);
  halo.addColorStop(0,'rgba(205,222,255,.4)');halo.addColorStop(1,'rgba(205,222,255,0)');
  x.fillStyle=halo;x.fillRect(0,0,128,128);
  x.fillStyle='#e9eff9';x.beginPath();x.arc(64,64,30,0,7);x.fill();
  x.fillStyle='rgba(165,182,210,.55)';
  for(const [cx,cy,r] of [[54,52,6],[76,68,8],[62,80,4],[80,46,3.5],[48,70,3]]){
    x.beginPath();x.arc(cx,cy,r,0,7);x.fill();
  }
}),fog:false,depthWrite:false,transparent:true,opacity:0});
const moonSpr=new THREE.Sprite(moonMat);moonSpr.scale.set(95,95,1);scene.add(moonSpr);

// --- Brilho do horizonte no nascer/pôr do sol ---
const glowMat=new THREE.SpriteMaterial({map:spriteTex((x,w,h)=>{
  x.save();x.translate(w/2,h/2);x.scale(1,.5);
  const g=x.createRadialGradient(0,0,8,0,0,w/2);
  g.addColorStop(0,'rgba(255,160,80,.9)');g.addColorStop(.5,'rgba(255,120,60,.45)');
  g.addColorStop(1,'rgba(255,100,50,0)');
  x.fillStyle=g;x.fillRect(-w/2,-w/2,w,w);x.restore();
},256,256),fog:false,depthWrite:false,transparent:true,opacity:0,
  blending:THREE.AdditiveBlending});
const glowSpr=new THREE.Sprite(glowMat);glowSpr.scale.set(880,440,1);scene.add(glowSpr);

// --- Estrelas (hemisfério de pontos com brilho variado) ---
let starMat;
{
  const n=420,pos=new Float32Array(n*3),col=new Float32Array(n*3);
  for(let i=0;i<n;i++){
    let x,y,z,l;
    do{x=rand(-1,1);y=rand(.05,1);z=rand(-1,1);l=Math.hypot(x,y,z);}while(l>1||l<.3);
    pos[i*3]=x/l*870;pos[i*3+1]=y/l*870;pos[i*3+2]=z/l*870;
    const b=rand(.35,1);
    if(Math.random()<.15){col[i*3]=b;col[i*3+1]=b*.82;col[i*3+2]=b*.66;}      // estrela quente
    else{col[i*3]=b*rand(.8,.95);col[i*3+1]=b*rand(.86,1);col[i*3+2]=b;}      // estrela fria
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  starMat=new THREE.PointsMaterial({size:1.7,sizeAttenuation:false,vertexColors:true,
    transparent:true,opacity:0,fog:false,depthWrite:false});
  scene.add(new THREE.Points(geo,starMat));
}

for(const c of clouds)c.userData.op0=c.material.opacity;

const SUNSET_TINT=new THREE.Color(0xff5a28);
// Bulbo do poste: apagado (cinza) de dia, quente e brilhante à noite
const BULB_DAY=new THREE.Color(0x9a948e),BULB_NIGHT=new THREE.Color(0xffd9a0);

// Farol do carro do jogador: um único SpotLight real que ilumina a rua à frente
const headSpot=new THREE.SpotLight(0xffe9b8,0,38,.6,.55,1.4);
headSpot.castShadow=false;
scene.add(headSpot);scene.add(headSpot.target);
const _fwd=new THREE.Vector3();

let twinkleT=0;
export function updateDayNight(dt){
  tod=(tod+dt*(tod<.24||tod>.76?NIGHT_MULT:1)/DAY_LEN)%1;
  twinkleT+=dt;
  sampleKeyframes();
  drawSky();

  scene.fog.color.copy(cur.fog);
  // Mirante: do alto da montanha o horizonte abre (a névoa recua com a altitude)
  const ppos=refs.playerPos?.();
  scene.fog.far=430+(ppos?Math.max(0,ppos.y)*14:0);
  renderer.toneMappingExposure=cur.exp;
  hemi.color.copy(cur.hs);hemi.groundColor.copy(cur.hg);hemi.intensity=cur.hI;
  dlight.color.copy(cur.sun);dlight.intensity=cur.sunI;
  for(const m of buildingMats)m.emissiveIntensity=cur.win;
  for(const c of clouds){
    c.material.color.copy(cur.cloud);
    c.material.opacity=c.userData.op0*(.55+.45*clamp(cur.sunI/2.2,0,1));
  }
  starMat.opacity=cur.star*(.82+.18*Math.sin(twinkleT*2.3));

  // Posição do sol/lua: nasce no leste (+x), se põe no oeste (-x)
  const th=(tod-.25)*Math.PI*2,sx=Math.cos(th),sy=Math.sin(th);
  const horiz=clamp(1-Math.abs(sy)/.3,0,1); // proximidade do horizonte

  sunSpr.position.set(sx*720,sy*500+18,-430);
  const s=300+horiz*170; // sol maior perto do horizonte
  sunSpr.scale.set(s,s,1);
  sunMat.color.copy(cur.sun).lerp(SUNSET_TINT,horiz*.55);
  sunMat.opacity=clamp((sy+.07)/.11,0,1);

  moonSpr.position.set(-sx*720,-sy*470+24,-430);
  moonMat.opacity=clamp((-sy+.07)/.13,0,1)*.95;

  glowSpr.position.set(sx*700,42,-426);
  glowMat.opacity=Math.pow(horiz,1.5)*.8;

  // Direção da luz: sol de dia, lua à noite (troca no escuro, intensidade baixa)
  if(sy>=0)sunDir.set(sx*.85,Math.max(sy,.16),-.5).normalize();
  else sunDir.set(-sx*.85,Math.max(-sy,.16),-.5).normalize();

  // Faróis: acendem gradualmente quando o sol se aproxima do horizonte
  const nightF=clamp((.06-sy)/.14,0,1);
  beamMat.visible=nightF>0;
  beamMat.opacity=nightF*.5;

  // Postes: mesma curva dos faróis — poça de luz no chão, halo e bulbo aceso
  lampGlowMat.visible=lampHaloMat.visible=nightF>0;
  lampGlowMat.opacity=nightF*.55;
  lampHaloMat.opacity=nightF*.85;
  lampBulbMat.color.lerpColors(BULB_DAY,BULB_NIGHT,nightF);
  const c=refs.getCur?.();
  if(nightF>0&&state.mode==='car'&&c&&!c.plane){
    _fwd.set(0,0,1).applyQuaternion(c.g.quaternion);
    headSpot.position.set(c.g.position.x+_fwd.x*2.2,1.1,c.g.position.z+_fwd.z*2.2);
    headSpot.target.position.set(c.g.position.x+_fwd.x*16,.4,c.g.position.z+_fwd.z*16);
    headSpot.intensity=nightF*140;
  }else headSpot.intensity=0;
}

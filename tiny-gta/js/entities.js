import * as THREE from 'three';
import {state} from './state.js';
import {scene} from './engine.js';

// Shrinks the top face of a box toward the center — turns boxes into
// trapezoids (beveled body, slanted windshield/rear window)
function taperTop(geo,sx,sz){
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
    if(p.getY(i)>0){p.setX(i,p.getX(i)*sx);p.setZ(i,p.getZ(i)*sz);}
  }
  geo.computeVertexNormals();
  return geo;
}

// Shared geometries/materials — every car reuses the same shapes
// Peças amassáveis são segmentadas: sem vértices intermediários o dentCar
// não teria o que deslocar no meio da lataria.
// Proporções pensadas para o ped (~1.86 de altura) sentado dentro: cabine
// alta, cabeça abaixo do teto, ombros na altura do vidro.
// Sedã 5.4m: capô 1.5 (28%), cabine 2.85 (53%), porta-malas 1.1, entre-eixos
// 3.4 (63%) — proporções de sedã real escaladas pro ped de 1.86 de altura
const bodyG=taperTop(new THREE.BoxGeometry(2.1,.6,5.4,4,2,10),.94,.97);
const cabG=taperTop(new THREE.BoxGeometry(1.8,.76,2.85),.8,.64);
const hoodG=new THREE.BoxGeometry(1.86,.14,1.5,4,1,3);
const trunkG=new THREE.BoxGeometry(1.86,.13,1.1,4,1,2);
const roofG=new THREE.BoxGeometry(1.44,.06,1.8,3,1,3);
const bumperG=new THREE.BoxGeometry(2.14,.2,.26,4,1,1);
const grilleG=new THREE.BoxGeometry(1.0,.16,.06);
const plateG=new THREE.BoxGeometry(.52,.17,.03);
const mirrorG=new THREE.BoxGeometry(.16,.1,.07);
const exhaustG=new THREE.CylinderGeometry(.05,.05,.2,6);
const wheelG=new THREE.CylinderGeometry(.44,.44,.36,12);
const hlG=new THREE.BoxGeometry(.32,.15,.07);
const tlG=new THREE.BoxGeometry(.36,.13,.07);

const tireM=new THREE.MeshStandardMaterial({color:0x14121a,roughness:.95});
const hubM=new THREE.MeshStandardMaterial({color:0xb9bec9,roughness:.3,metalness:.85});
const darkM=new THREE.MeshStandardMaterial({color:0x1a1d24,roughness:.6,metalness:.25});
// Vidro transparente sem depthWrite e desenhado por último (renderOrder no
// makeCar): senão a ordenação de transparentes faz o motorista sumir/aparecer
// conforme o ângulo da câmera
const glassM=new THREE.MeshStandardMaterial({color:0x8fc3e0,roughness:.08,metalness:.6,
  transparent:true,opacity:.42,depthWrite:false});
const seatM=new THREE.MeshStandardMaterial({color:0x2a2d38,roughness:.85});
const seatBaseG=new THREE.BoxGeometry(.62,.16,.6);
const seatBackG=new THREE.BoxGeometry(.62,.6,.13);
const benchG=new THREE.BoxGeometry(1.56,.16,.55);
const benchBackG=new THREE.BoxGeometry(1.56,.5,.13);
const dashG=new THREE.BoxGeometry(1.7,.22,.36);
const wheelRimG=new THREE.TorusGeometry(.19,.035,6,14);
const doorG=new THREE.BoxGeometry(.07,.55,1.35);
const plateM=new THREE.MeshStandardMaterial({color:0xe8e9e2,roughness:.7});
// Facho dos faróis projetado no chão — material compartilhado entre todos os
// carros; daynight.js controla visible/opacity (acende só à noite)
const beamCanvas=document.createElement('canvas');
beamCanvas.width=256;beamCanvas.height=256;
{
  const x=beamCanvas.getContext('2d');
  for(const cx of[92,164]){
    x.save();x.translate(cx,16);x.scale(1,1.7);
    const g=x.createRadialGradient(0,0,4,0,0,132);
    g.addColorStop(0,'rgba(255,238,190,.9)');
    g.addColorStop(.35,'rgba(255,222,155,.38)');
    g.addColorStop(1,'rgba(255,205,125,0)');
    x.fillStyle=g;x.beginPath();x.arc(0,0,132,0,7);x.fill();x.restore();
  }
}
const beamTex=new THREE.CanvasTexture(beamCanvas);
beamTex.colorSpace=THREE.SRGBColorSpace;
export const beamMat=new THREE.MeshBasicMaterial({map:beamTex,transparent:true,
  opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
beamMat.visible=false;
const beamGeo=new THREE.PlaneGeometry(5.4,7.4);

const paintCache=new Map();
function paintFor(color){
  if(!paintCache.has(color))
    paintCache.set(color,new THREE.MeshStandardMaterial({color,roughness:.3,metalness:.5}));
  return paintCache.get(color);
}

export function makeCar(color,police){
  const g=new THREE.Group();
  const paint=paintFor(color);

  const body=new THREE.Mesh(bodyG,paint);
  body.position.y=.72;body.castShadow=true;g.add(body);

  const hood=new THREE.Mesh(hoodG,paint);
  hood.position.set(0,1.05,1.95);hood.rotation.x=.05;hood.castShadow=true;g.add(hood);
  const trunk=new THREE.Mesh(trunkG,paint);
  trunk.position.set(0,1.04,-2.12);trunk.rotation.x=-.04;g.add(trunk);

  const cab=new THREE.Mesh(cabG,glassM);
  cab.position.set(0,1.4,-.28);cab.castShadow=true;cab.renderOrder=3;g.add(cab);
  const roof=new THREE.Mesh(roofG,paint);
  roof.position.set(0,1.81,-.28);roof.castShadow=true;g.add(roof);

  g.userData.dentable=[body,hood,trunk,roof];
  for(const bz of[2.82,-2.82]){
    const bmp=new THREE.Mesh(bumperG,darkM);
    bmp.position.set(0,.5,bz);g.add(bmp);
    g.userData.dentable.push(bmp);
  }

  // Interior visível pelo vidro: bancos, painel e volante.
  // Banco traseiro com folga do vidro inclinado (plano: z=-1.7+(y-1.02)*.668)
  for(const sx of[-.46,.46]){
    const sb=new THREE.Mesh(seatBaseG,seatM);sb.position.set(sx,1.06,-.08);g.add(sb);
    const sk=new THREE.Mesh(seatBackG,seatM);
    sk.position.set(sx,1.36,-.42);sk.rotation.x=-.12;g.add(sk);
  }
  const bench=new THREE.Mesh(benchG,seatM);bench.position.set(0,1.06,-1.0);g.add(bench);
  const benchB=new THREE.Mesh(benchBackG,seatM);
  benchB.position.set(0,1.29,-1.26);benchB.rotation.x=-.12;g.add(benchB);
  const dash=new THREE.Mesh(dashG,darkM);dash.position.set(0,1.16,.95);g.add(dash);
  const wheel=new THREE.Mesh(wheelRimG,darkM);
  wheel.position.set(-.46,1.22,.7);wheel.rotation.x=-1.15;g.add(wheel);

  // Porta do motorista articulada na dianteira (abre/fecha ao entrar e sair)
  const doorPivot=new THREE.Group();
  doorPivot.position.set(-1.04,.78,1.15);
  const door=new THREE.Mesh(doorG,paint);
  door.position.set(0,0,-.67);door.castShadow=true;
  doorPivot.add(door);g.add(doorPivot);
  g.userData.door=doorPivot;
  const grille=new THREE.Mesh(grilleG,darkM);
  grille.position.set(0,.82,2.72);g.add(grille);
  const plate=new THREE.Mesh(plateG,plateM);
  plate.position.set(0,.56,-2.76);g.add(plate);
  const ex=new THREE.Mesh(exhaustG,hubM);
  ex.rotation.x=Math.PI/2;ex.position.set(-.64,.34,-2.78);g.add(ex);
  for(const sx of[-1.1,1.1]){
    const mir=new THREE.Mesh(mirrorG,paint);
    mir.position.set(sx,1.15,1.0);g.add(mir);
  }

  g.userData.wheels=[];g.userData.front=[];
  for(const[sx,sz]of[[1,1.7],[-1,1.7],[1,-1.7],[-1,-1.7]]){
    const wg=new THREE.Group();wg.position.set(sx*1.0,.44,sz);wg.rotation.order='YXZ';
    const w=new THREE.Mesh(wheelG,[tireM,hubM,hubM]);
    w.rotation.z=Math.PI/2;w.castShadow=true;wg.add(w);
    g.add(wg);g.userData.wheels.push(wg);
    if(sz>0)g.userData.front.push(wg);
  }

  const hlM=new THREE.MeshBasicMaterial({color:0xfff2c0});
  const tlM=new THREE.MeshBasicMaterial({color:0xa01515});
  g.userData.tailM=tlM;
  for(const sx of[-.76,.76]){
    const hl=new THREE.Mesh(hlG,hlM);
    hl.position.set(sx,.84,2.71);g.add(hl);
    const tl=new THREE.Mesh(tlG,tlM);
    tl.position.set(sx,.86,-2.71);g.add(tl);
  }

  const beam=new THREE.Mesh(beamGeo,beamMat);
  beam.rotation.x=-Math.PI/2;beam.position.set(0,.07,5.9);
  beam.renderOrder=2;g.add(beam);

  if(police){
    const r=new THREE.Mesh(new THREE.BoxGeometry(.42,.18,.42),
      new THREE.MeshBasicMaterial({color:0xff2222}));
    const b=new THREE.Mesh(new THREE.BoxGeometry(.42,.18,.42),
      new THREE.MeshBasicMaterial({color:0x2266ff}));
    r.position.set(-.28,1.93,-.28);b.position.set(.28,1.93,-.28);
    g.add(r,b);g.userData.bar=[r,b];
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.12,.22,1.7),darkM);
    stripe.position.y=.72;g.add(stripe);
  }
  scene.add(g);
  return g;
}

// Anatomia do ped, uma geometria por parte do corpo
const pedHeadG=new THREE.SphereGeometry(.24,10,8);          // cabeça
const pedNeckG=new THREE.CylinderGeometry(.08,.09,.16,7);   // pescoço
const pedThoraxG=new THREE.BoxGeometry(.52,.40,.30);        // tronco/tórax
const pedAbdomenG=new THREE.BoxGeometry(.46,.26,.26);       // abdômen
const pedHipG=new THREE.BoxGeometry(.46,.20,.28);           // quadril
const pedShoulderG=new THREE.SphereGeometry(.105,8,6);      // ombro
const pedBicepsG=new THREE.BoxGeometry(.12,.30,.12);        // bíceps
const pedElbowG=new THREE.SphereGeometry(.075,7,5);         // cotovelo
const pedForearmG=new THREE.BoxGeometry(.10,.26,.10);       // antebraço
const pedPalmG=new THREE.BoxGeometry(.09,.12,.11);          // mão
const pedFingersG=new THREE.BoxGeometry(.08,.10,.10);       // dedos
const pedThumbG=new THREE.BoxGeometry(.035,.075,.04);       // polegar
const pedThighG=new THREE.BoxGeometry(.17,.30,.18);         // coxa
const pedKneeG=new THREE.SphereGeometry(.08,7,5);           // joelho
const pedCalfG=new THREE.BoxGeometry(.13,.18,.14);          // panturrilha
const pedFootG=new THREE.BoxGeometry(.18,.09,.28);          // pé
const eyeG=new THREE.SphereGeometry(.035,6,4);
const noseG=new THREE.ConeGeometry(.04,.12,6);
const mouthG=new THREE.BoxGeometry(.15,.025,.018);
const browG=new THREE.BoxGeometry(.12,.025,.02);
const beardG=new THREE.SphereGeometry(.18,8,5);
const hairG=new THREE.SphereGeometry(.255,8,5);
const skinColors=[0xf0c08b,0xd9a06b,0xb8754c,0x8f5637,0x6f3e2a];
const pantsColors=[0x202435,0x263454,0x2e2a24,0x3d3f46,0x18191f];
const shoeColors=[0x111117,0x33251e,0xe8e3d2,0x1f2733];
const skinM=new THREE.MeshStandardMaterial({color:0xd9a06b,roughness:.9,transparent:true});
const eyeM=new THREE.MeshBasicMaterial({color:0x101018});
const mouthM=new THREE.MeshBasicMaterial({color:0x6b1220});
const facialHairColors=[0x17100c,0x2a1911,0x4a2b18,0x6b5137,0x0d0d12];
export const shirtColors=[0xc23b4e,0x3b7ac2,0xcf9a3a,0x3aa06b,0xd96fae,0xe8e3d2,0x7a4f9e,0x40c8c0];

function makeMat(color,roughness=.9){
  return new THREE.MeshStandardMaterial({color,roughness,transparent:true});
}

function makeFace(head,skinMat){
  const face=new THREE.Group();
  const hairColor=facialHairColors[Math.floor(Math.random()*facialHairColors.length)];
  const hairM=new THREE.MeshStandardMaterial({color:hairColor,roughness:.95,transparent:true});
  const beardM=new THREE.MeshStandardMaterial({color:hairColor,roughness:.95,transparent:true});
  for(const sx of[-1,1]){
    const eye=new THREE.Mesh(eyeG,eyeM);
    eye.position.set(sx*.085,.045,.225);
    face.add(eye);
    if(Math.random()<.65){
      const brow=new THREE.Mesh(browG,hairM);
      brow.position.set(sx*.085,.105,.22);
      brow.rotation.z=-sx*Math.random()*.25;
      face.add(brow);
    }
  }
  const nose=new THREE.Mesh(noseG,skinMat.clone());
  nose.position.set(0,-.015,.255);
  nose.rotation.x=Math.PI/2;
  nose.scale.setScalar(.85+Math.random()*.45);
  face.add(nose);
  const mouth=new THREE.Mesh(mouthG,mouthM);
  mouth.position.set(0,-.12,.228);
  mouth.scale.x=.75+Math.random()*.55;
  face.add(mouth);
  head.userData.mouth=mouth; // exposto pra animação de fala nas cut-scenes
  if(Math.random()<.58){
    const beard=new THREE.Mesh(beardG,beardM);
    beard.position.set(0,-.115,.165);
    beard.scale.set(.82+Math.random()*.35,.42+Math.random()*.3,.26);
    face.add(beard);
  }
  if(Math.random()<.74){
    const hair=new THREE.Mesh(hairG,hairM);
    hair.position.set(0,.13,-.005);
    hair.scale.set(1.02,.42+Math.random()*.22,1);
    face.add(hair);
  }
  head.add(face);
}

export function makePed(color,pantsColor){
  const g=new THREE.Group();
  const skinMat=makeMat(skinColors[Math.floor(Math.random()*skinColors.length)]);
  const shirtM=makeMat(color);
  const pantsM=makeMat(pantsColor??pantsColors[Math.floor(Math.random()*pantsColors.length)]);
  const shoeM=makeMat(shoeColors[Math.floor(Math.random()*shoeColors.length)],.82);
  const bodyScale=.92+Math.random()*.18;

  // Corpo: quadril, abdômen e tórax empilhados
  const hip=new THREE.Mesh(pedHipG,pantsM);
  hip.position.y=.55;hip.scale.x=bodyScale;hip.castShadow=true;g.add(hip);
  const abdomen=new THREE.Mesh(pedAbdomenG,shirtM);
  abdomen.position.y=.78;abdomen.scale.x=.94*bodyScale;abdomen.castShadow=true;g.add(abdomen);
  const thorax=new THREE.Mesh(pedThoraxG,shirtM);
  thorax.position.y=1.11;
  thorax.scale.set(bodyScale,.95+Math.random()*.12,.92+Math.random()*.16);
  thorax.castShadow=true;g.add(thorax);

  // Pescoço e cabeça
  const neck=new THREE.Mesh(pedNeckG,skinMat);
  neck.position.y=1.37;neck.castShadow=true;g.add(neck);
  const head=new THREE.Mesh(pedHeadG,skinMat.clone());
  head.position.y=1.62;head.castShadow=true;
  head.scale.set(1+Math.random()*.14,.92+Math.random()*.18,1+Math.random()*.08);
  g.add(head);
  makeFace(head,skinMat);
  g.userData.head=head;
  g.userData.mouth=head.userData.mouth;

  const limbs={};
  for(const side of[-1,1]){
    // Braço: ombro > bíceps > cotovelo (pivô do antebraço) > mão com dedos.
    // Manga curta: bíceps com a cor da camisa, antebraço de pele.
    const arm=new THREE.Group();
    arm.position.set(side*.34*bodyScale,1.26,0);
    const shoulder=new THREE.Mesh(pedShoulderG,shirtM);
    const biceps=new THREE.Mesh(pedBicepsG,shirtM);
    biceps.position.y=-.16;
    shoulder.castShadow=true;biceps.castShadow=true;
    const forearm=new THREE.Group();
    forearm.position.y=-.30;
    const elbow=new THREE.Mesh(pedElbowG,skinMat.clone());
    const foreM=new THREE.Mesh(pedForearmG,skinMat.clone());
    foreM.position.y=-.14;foreM.castShadow=true;
    const hand=new THREE.Group();
    hand.position.y=-.27;
    const palm=new THREE.Mesh(pedPalmG,skinMat.clone());
    palm.position.y=-.05;
    const fingers=new THREE.Mesh(pedFingersG,skinMat.clone());
    fingers.position.y=-.15;
    const thumb=new THREE.Mesh(pedThumbG,skinMat.clone());
    thumb.position.set(-side*.06,-.06,.04);
    hand.add(palm,fingers,thumb);
    forearm.add(elbow,foreM,hand);
    arm.add(shoulder,biceps,forearm);
    g.add(arm);
    limbs[side<0?'leftArm':'rightArm']=arm;
    limbs[side<0?'leftForearm':'rightForearm']=forearm;

    // Perna: coxa > joelho (pivô da panturrilha) > pé
    const leg=new THREE.Group();
    leg.position.set(side*.15,.52,0);
    const thigh=new THREE.Mesh(pedThighG,pantsM);
    thigh.position.y=-.16;thigh.castShadow=true;
    const calf=new THREE.Group();
    calf.position.y=-.30;
    const knee=new THREE.Mesh(pedKneeG,pantsM);
    const calfM=new THREE.Mesh(pedCalfG,pantsM);
    calfM.position.y=-.10;calfM.castShadow=true;
    const foot=new THREE.Mesh(pedFootG,shoeM);
    foot.position.set(0,-.185,.05);foot.castShadow=true;
    calf.add(knee,calfM,foot);
    leg.add(thigh,calf);
    g.add(leg);
    limbs[side<0?'leftLeg':'rightLeg']=leg;
    limbs[side<0?'leftCalf':'rightCalf']=calf;
  }
  g.userData.limbs=limbs;
  scene.add(g);
  return g;
}

// Avião monomotor (frente = +z, como os carros). userData.prop gira no update.
export function makePlane(){
  const g=new THREE.Group();
  const bodyM=new THREE.MeshStandardMaterial({color:0xe84545,roughness:.5,metalness:.25});
  const trimM=new THREE.MeshStandardMaterial({color:0xf2ead6,roughness:.6});
  const darkM=new THREE.MeshStandardMaterial({color:0x1a1a22,roughness:.4,metalness:.6});
  const fus=new THREE.Mesh(new THREE.CylinderGeometry(.5,.28,5.2,10),bodyM);
  fus.rotation.x=Math.PI/2;fus.position.set(0,1.05,0);fus.castShadow=true;g.add(fus);
  const wind=new THREE.Mesh(new THREE.BoxGeometry(.66,.42,.66),darkM);
  wind.position.set(0,1.58,.78);g.add(wind);
  const wing=new THREE.Mesh(new THREE.BoxGeometry(7.6,.12,1.5),trimM);
  wing.position.set(0,1.18,.55);wing.castShadow=true;g.add(wing);
  const tailw=new THREE.Mesh(new THREE.BoxGeometry(2.7,.1,.8),trimM);
  tailw.position.set(0,1.2,-2.35);tailw.castShadow=true;g.add(tailw);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(.12,1.05,.85),bodyM);
  fin.position.set(0,1.72,-2.42);fin.castShadow=true;g.add(fin);
  const prop=new THREE.Group();
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.3,8),darkM);
  hub.rotation.x=Math.PI/2;prop.add(hub);
  for(const r of[0,Math.PI/2]){
    const blade=new THREE.Mesh(new THREE.BoxGeometry(.13,1.95,.05),darkM);
    blade.rotation.z=r;prop.add(blade);
  }
  prop.position.set(0,1.05,2.72);g.add(prop);g.userData.prop=prop;
  const wheelM=new THREE.MeshStandardMaterial({color:0x14141a,roughness:.9});
  for(const[wx,wz]of[[-.95,.7],[.95,.7],[0,-2.25]]){
    const wh=new THREE.Mesh(new THREE.CylinderGeometry(.26,.26,.2,10),wheelM);
    wh.rotation.z=Math.PI/2;wh.position.set(wx,.26,wz);g.add(wh);
    const strut=new THREE.Mesh(new THREE.BoxGeometry(.09,.62,.09),darkM);
    strut.position.set(wx,.55,wz);g.add(strut);
  }
  scene.add(g);
  return g;
}

export function animatePed(g,phase=0,amount=0){
  const l=g.userData.limbs;if(!l)return;
  const a=Math.min(1,amount);
  const swing=Math.sin(phase)*.62*a;
  const armSwing=swing*.72;
  // coxas balançam em oposição
  l.leftLeg.rotation.x=swing;
  l.rightLeg.rotation.x=-swing;
  // joelho dobra na recuperação da passada (perna voltando para a frente)
  if(l.leftCalf){
    l.leftCalf.rotation.x=(1-Math.cos(phase))*.45*a;
    l.rightCalf.rotation.x=(1-Math.cos(phase+Math.PI))*.45*a;
  }
  // braços em oposição às pernas, cotovelo dobrando quando o braço vai à frente
  l.leftArm.rotation.x=-armSwing;
  l.rightArm.rotation.x=armSwing;
  l.leftArm.rotation.z=.12;
  l.rightArm.rotation.z=-.12;
  if(l.leftForearm){
    l.leftForearm.rotation.x=-(.18+Math.max(0,Math.sin(phase))*.5)*a;
    l.rightForearm.rotation.x=-(.18+Math.max(0,-Math.sin(phase))*.5)*a;
  }
}

export function setOpacity(g,o){g.traverse(m=>{if(m.material)m.material.opacity=o;});}

// Amassa a lataria na região do impacto: clona a geometria da peça no 1º
// amassado e empurra os vértices num raio ao redor do ponto da batida, na
// direção da pancada, com ruído de metal torcido e limite pra não implodir
const _dp=new THREE.Vector3(),_dd=new THREE.Vector3(),_dq=new THREE.Quaternion();
export function dentCar(g,worldPoint,worldDir,strength=.1){
  const parts=g.userData.dentable;if(!parts)return;
  g.updateMatrixWorld();
  _dp.copy(worldPoint);g.worldToLocal(_dp);
  _dd.copy(worldDir);_dd.y*=.3;
  if(_dd.lengthSq()<1e-6)return;
  _dd.normalize().applyQuaternion(_dq.copy(g.quaternion).invert());
  const R=1.4,MAX=.42;
  for(const m of parts){
    const lx=_dp.x-m.position.x,ly=_dp.y-m.position.y,lz=_dp.z-m.position.z;
    if(Math.hypot(lx,ly,lz)>R+2.9)continue; // peça longe do impacto
    if(!m.userData.dented){
      m.geometry=m.geometry.clone();
      m.geometry.userData.orig=m.geometry.attributes.position.array.slice();
      m.userData.dented=true;
    }
    const p=m.geometry.attributes.position,orig=m.geometry.userData.orig;
    let touched=false;
    for(let i=0;i<p.count;i++){
      const d=Math.hypot(p.getX(i)-lx,p.getY(i)-ly,p.getZ(i)-lz);
      if(d>R)continue;
      const f=strength*(1-d/R);
      let nx=p.getX(i)+_dd.x*f+(Math.random()-.5)*f*.4;
      let ny=p.getY(i)+_dd.y*f-f*.15;
      let nz=p.getZ(i)+_dd.z*f+(Math.random()-.5)*f*.4;
      const ox=orig[i*3],oy=orig[i*3+1],oz=orig[i*3+2];
      const off=Math.hypot(nx-ox,ny-oy,nz-oz);
      if(off>MAX){const s=MAX/off;nx=ox+(nx-ox)*s;ny=oy+(ny-oy)*s;nz=oz+(nz-oz)*s;}
      p.setXYZ(i,nx,ny,nz);touched=true;
    }
    if(touched){p.needsUpdate=true;m.geometry.computeVertexNormals();}
  }
}

export function spinWheels(g,speed,dt,steer=0){
  const u=g.userData;if(!u.wheels)return;
  for(const w of u.wheels)w.rotation.x+=speed*dt/.42;
  for(const w of u.front)w.rotation.y=steer*.38;
}

export function blinkBar(g){
  if(!g.userData.bar)return;
  const on=Math.floor(state.time*5)%2;
  g.userData.bar[0].material.color.setHex(on?0xff2222:0x551111);
  g.userData.bar[1].material.color.setHex(on?0x2255ff:0x111155);
}

import * as THREE from 'three';
import {state} from './state.js';
export {beamMat,makeCar} from '../assets/models/vehicles/car.js';
import {makePed,shirtColors} from '../assets/models/characters/pedestrian.js';
export {makePed,shirtColors};
export {makePlane} from '../assets/models/aircraft/plane.js';
import {makeGangGun} from '../assets/models/weapons/gang-gun.js';

// ---- Empunhadura PADRÃO de arma (jogador, gangues e polícia) ----
// attachHandGun pendura a pistola na mão direita do ped (idempotente);
// poseAiming põe o boneco na pose única de mira: braço da arma esticado à
// frente, braço de apoio dobrado. Chamar DEPOIS do animatePed do frame, que
// a pose sobrescreve os braços e as pernas continuam na animação de andar.
// kick = recuo do tiro (0..~.16), usado pelo jogador.
export function attachHandGun(ped){
  const arm=ped.userData.limbs?.rightArm;
  if(!arm||arm.userData.gun)return;
  const gun=makeGangGun();
  arm.add(gun);
  arm.userData.gun=gun;
}

export function poseAiming(ped,kick=0){
  const l=ped.userData.limbs;if(!l)return;
  l.rightArm.rotation.x=-Math.PI/2+kick*1.2;
  l.rightArm.rotation.y=-.04;
  l.rightArm.rotation.z=-.08;
  l.leftArm.rotation.x=-.28;
  l.leftArm.rotation.y=.08;
  l.leftArm.rotation.z=.18;
  l.rightForearm?.rotation.set(0,0,0);
  if(l.leftForearm)l.leftForearm.rotation.x=-.35;
}

// Fade de morte: o ped fundido guarda seus materiais em userData.fadeMats.
// transparent só fica ligado durante o fade — ped opaco sai do pass de
// transparência (sem sorting por frame), que era um dos maiores custos.
export function setOpacity(g,o){
  const mats=g.userData.fadeMats;
  if(mats){
    for(const m of mats){m.opacity=o;m.transparent=o<1;}
    return;
  }
  g.traverse(m=>{if(m.material)m.material.opacity=o;});
}

export function animatePed(g,phase=0,amount=0){
  const l=g.userData.limbs;if(!l)return;
  const a=Math.min(1,amount);
  const swing=Math.sin(phase)*.62*a;
  const armSwing=swing*.72;
  l.leftLeg.rotation.x=swing;
  l.rightLeg.rotation.x=-swing;
  if(l.leftCalf){
    l.leftCalf.rotation.x=(1-Math.cos(phase))*.45*a;
    l.rightCalf.rotation.x=(1-Math.cos(phase+Math.PI))*.45*a;
  }
  l.leftArm.rotation.x=-armSwing;
  l.rightArm.rotation.x=armSwing;
  l.leftArm.rotation.z=.12;
  l.rightArm.rotation.z=-.12;
  if(l.leftForearm){
    l.leftForearm.rotation.x=-(.18+Math.max(0,Math.sin(phase))*.5)*a;
    l.rightForearm.rotation.x=-(.18+Math.max(0,-Math.sin(phase))*.5)*a;
  }
}

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
    if(Math.hypot(lx,ly,lz)>R+2.9)continue;
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
  for(const w of u.wheels)w.rotation.x+=speed*dt/.30;
  for(const w of u.front)w.rotation.y=steer*.38;
  // volante gira e os braços do motorista (jogador ou NPC) acompanham a curva
  const k=Math.min(1,12*dt);
  if(u.steer)u.steer.rotation.z+=(-steer*1.8-u.steer.rotation.z)*k;
  const l=u.driver?.userData.limbs;
  if(l){
    l.leftArm.rotation.z+=(.42-steer*.25-l.leftArm.rotation.z)*k;
    l.rightArm.rotation.z+=(-.42-steer*.25-l.rightArm.rotation.z)*k;
  }
}

// Cria um NPC já sentado no banco do motorista do carro, mãos no volante,
// coxas pra frente e pés no piso (mesma pose do jogador dirigindo)
export function seatDriver(carG,color,pants){
  const d=makePed(color,pants);
  d.traverse(o=>{if(o.isMesh)o.castShadow=false;});
  const l=d.userData.limbs;
  if(l){
    l.leftLeg.rotation.set(-2.0,0,0);
    l.rightLeg.rotation.set(-2.0,0,0);
    l.leftCalf?.rotation.set(.5,0,0);
    l.rightCalf?.rotation.set(.5,0,0);
    l.leftArm.rotation.set(-1.3,0,.42);
    l.rightArm.rotation.set(-1.3,0,-.42);
    l.leftForearm?.rotation.set(-.78,0,0);
    l.rightForearm?.rotation.set(-.78,0,0);
  }
  d.position.set(-.38,-.52,-.15);
  carG.add(d);
  carG.userData.driver=d; // spinWheels anima os braços de quem está aqui
  return d;
}

export function blinkBar(g){
  if(!g.userData.bar)return;
  const on=Math.floor(state.time*5)%2;
  g.userData.bar[0].material.color.setHex(on?0xff2222:0x551111);
  g.userData.bar[1].material.color.setHex(on?0x2255ff:0x111155);
}

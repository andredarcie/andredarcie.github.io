import * as THREE from 'three';
import {state} from './state.js';
export {beamMat,makeCar} from '../assets/models/vehicles/car.js';
export {makePed,shirtColors} from '../assets/models/characters/pedestrian.js';
export {makePlane} from '../assets/models/aircraft/plane.js';

export function setOpacity(g,o){g.traverse(m=>{if(m.material)m.material.opacity=o;});}

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
  for(const w of u.wheels)w.rotation.x+=speed*dt/.42;
  for(const w of u.front)w.rotation.y=steer*.38;
}

export function blinkBar(g){
  if(!g.userData.bar)return;
  const on=Math.floor(state.time*5)%2;
  g.userData.bar[0].material.color.setHex(on?0xff2222:0x551111);
  g.userData.bar[1].material.color.setHex(on?0x2255ff:0x111155);
}

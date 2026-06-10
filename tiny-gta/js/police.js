import * as THREE from 'three';
import {N,clamp,rand,wrapA,nodeX,irand} from './constants.js';
import {state} from './state.js';
import {scene} from './engine.js';
import {makeCar,spinWheels,blinkBar} from './entities.js';
import {thud} from './audio.js';
import {collideStatics,addWanted} from './physics.js';
import {message} from './hud.js';
import {playerPos,cur,getBusted,getWasted} from './player.js';

export const cops=[];
export let heli=null;

export function spawnCop(){
  const px=playerPos();
  let nx,nz,tries=0;
  do{nx=nodeX(irand(0,N));nz=nodeX(irand(0,N));tries++;}
  while(Math.hypot(nx-px.x,nz-px.z)<80&&tries<30);
  const c={g:makeCar(0xe8e8ee,true),heading:rand(0,6.28),speed:0,stuckT:0,backT:0};
  c.g.position.set(nx,0,nz);
  cops.push(c);
}

export function makeHeli(){
  const g=new THREE.Group();
  const bodyM=new THREE.MeshStandardMaterial({color:0x2b3a6e,roughness:.4,metalness:.3});
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.7,1.3,3.6),bodyM);
  body.castShadow=true;g.add(body);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,3),bodyM);
  tail.position.set(0,.25,-3);g.add(tail);
  const rotor=new THREE.Mesh(new THREE.BoxGeometry(7.5,.08,.4),
    new THREE.MeshStandardMaterial({color:0x222222}));
  rotor.position.y=.85;g.add(rotor);g.userData.rotor=rotor;
  const skidM=new THREE.MeshStandardMaterial({color:0x444a58});
  for(const sx of[-.8,.8]){
    const sk=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,3),skidM);
    sk.position.set(sx,-.85,0);g.add(sk);
  }
  const spot=new THREE.SpotLight(0xfff8d0,2600,90,.32,.5,1.8);
  spot.position.set(0,-.6,0);g.add(spot);
  scene.add(spot.target);g.userData.spot=spot;
  scene.add(g);return g;
}

export function updateHeli(dt){
  const need=Math.floor(state.wanted)>=4;
  if(need&&!heli){
    heli=makeHeli();
    heli.position.copy(playerPos()).add(new THREE.Vector3(60,45,60));
    message('POLICE HELICOPTER IN THE AREA!','var(--pink)');
  }
  if(!need&&heli){scene.remove(heli,heli.userData.spot.target);heli=null;return;}
  if(!heli)return;
  const pp=playerPos();
  const tgt=new THREE.Vector3(pp.x+Math.sin(state.time*.4)*14,
    26+Math.sin(state.time*1.3)*1.5,pp.z+Math.cos(state.time*.4)*14);
  heli.position.lerp(tgt,1-Math.exp(-1.2*dt));
  heli.lookAt(pp.x,heli.position.y-4,pp.z);
  heli.userData.rotor.rotation.y+=28*dt;
  heli.userData.spot.target.position.set(pp.x,0,pp.z);
}

export function updateCops(dt){
  const want=Math.floor(state.wanted);
  if(cops.length<want&&cops.length<5&&Math.random()<dt*.8)spawnCop();
  while(cops.length>want){const c=cops.pop();scene.remove(c.g);}
  const pp=playerPos();
  let minD=1e9;
  for(const c of cops){
    const p=c.g.position;
    const dx=pp.x-p.x,dz=pp.z-p.z,dist=Math.hypot(dx,dz);
    minD=Math.min(minD,dist);
    const desired=Math.atan2(dx,dz),diff=wrapA(desired-c.heading);
    if(c.backT>0){
      c.backT-=dt;c.speed+=(-8-c.speed)*3*dt;
      c.heading-=Math.sign(diff)*1.4*dt;
    }else{
      c.heading+=clamp(diff,-1,1)*2.5*dt*clamp(Math.abs(c.speed)/8+.25,0,1);
      const ts=dist>15?27:12;
      c.speed+=(ts-c.speed)*1.3*dt;
    }
    p.x+=Math.sin(c.heading)*c.speed*dt;
    p.z+=Math.cos(c.heading)*c.speed*dt;
    if(collideStatics(p,1.5)){c.speed*=.3;c.stuckT+=dt*3;}
    if(Math.abs(c.speed)<2.5)c.stuckT+=dt;else c.stuckT=Math.max(0,c.stuckT-dt*2);
    if(c.stuckT>1.2){c.backT=.9;c.stuckT=0;}
    c.g.rotation.y=c.heading;
    spinWheels(c.g,c.speed,dt,clamp(diff,-1,1));
    blinkBar(c.g);
    const activeCur=cur;
    if(state.mode==='car'&&activeCur){
      const d=p.distanceTo(activeCur.g.position);
      if(d<2.9){
        const push=new THREE.Vector3().subVectors(activeCur.g.position,p).setY(0).normalize();
        activeCur.g.position.addScaledVector(push,(2.9-d)*.7);
        activeCur.speed*=.75;c.speed*=.6;thud(8);state.shake=.35;
      }
    }else if(state.mode==='foot'&&Math.abs(c.speed)>7){
      if(p.distanceTo(playerPos())<1.8){getWasted();return;}
    }
  }
  if(cops.length&&minD<6&&(state.mode==='foot'||Math.abs(cur?.speed||0)<3.5)){
    state.bustT+=dt;
    if(state.bustT>.4)message('THE POLICE ARE SURROUNDING YOU!','var(--blue)');
    if(state.bustT>1.8){getBusted();return;}
  }else state.bustT=Math.max(0,state.bustT-dt*2);
  if(state.wanted>0&&state.time-state.lastCrime>9&&(minD>70||!cops.length))
    state.wanted=Math.max(0,state.wanted-dt/5);
}

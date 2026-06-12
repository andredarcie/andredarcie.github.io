import * as THREE from 'three';
import {N,clamp,rand,wrapA,nodeX,irand} from './constants.js';
import {state} from './state.js';
import {scene} from './engine.js';
import {makeCar,spinWheels,blinkBar,dentCar,seatDriver} from './entities.js';
import {makeHeli} from '../assets/models/police/helicopter.js';
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
  c.driver=seatDriver(c.g,0x2a3f6e,0x1a2440); // policial de uniforme azul ao volante
  c.g.position.set(nx,0,nz);
  cops.push(c);
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
    Math.max(0,pp.y)+26+Math.sin(state.time*1.3)*1.5,pp.z+Math.cos(state.time*.4)*14);
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
    // viaturas não se atravessam: empurra uma pra fora da outra
    for(const o of cops){
      if(o===c)continue;
      const sx=p.x-o.g.position.x,sz=p.z-o.g.position.z,sd=Math.hypot(sx,sz);
      if(sd<2.9&&sd>.001){
        const push=(2.9-sd)*.5/sd;
        p.x+=sx*push;p.z+=sz*push;
        o.g.position.x-=sx*push;o.g.position.z-=sz*push;
      }
    }
    if(collideStatics(p,1.3)){c.speed*=.3;c.stuckT+=dt*3;}
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
        // amassa os dois na pancada (cooldown: o encosto dura vários frames)
        if(!c.dentT||state.time-c.dentT>.5){
          c.dentT=state.time;
          const mid=new THREE.Vector3().addVectors(p,activeCur.g.position)
            .multiplyScalar(.5).setY(.7);
          dentCar(activeCur.g,mid,push,.16);
          dentCar(c.g,mid,push.clone().negate(),.16);
        }
      }
    }else if(state.mode==='foot'&&Math.abs(c.speed)>7){
      if(p.distanceTo(playerPos())<1.5){getWasted();return;}
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

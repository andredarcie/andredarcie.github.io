import * as THREE from 'three';
import {N,CELL,nodeX,pick,rand,irand,wrapA,clamp} from './constants.js';
import {state,carNames,carColors} from './state.js';
import {makeCar,spinWheels} from './entities.js';
import {collideStatics,addWanted} from './physics.js';
import {thud} from './audio.js';
import {playerPos,cur,player,getWasted} from './player.js';

export const traffic=[];

export function neighborNodes(i,j){
  const r=[];
  if(i>0)r.push([i-1,j]);if(i<N)r.push([i+1,j]);
  if(j>0)r.push([i,j-1]);if(j<N)r.push([i,j+1]);
  return r;
}

export function spawnTraffic(){
  const A=[irand(0,N),irand(0,N)],B=pick(neighborNodes(A[0],A[1]));
  const ci=irand(0,carColors.length-1);
  const t={g:makeCar(carColors[ci],false),A,B,t:Math.random(),speed:8.5,brakeT:0,
    name:carNames[ci],heading:0};
  traffic.push(t);
}

export function trafficPos(t){
  const ax=nodeX(t.A[0]),az=nodeX(t.A[1]),bx=nodeX(t.B[0]),bz=nodeX(t.B[1]);
  const dx=(bx-ax)/CELL,dz=(bz-az)/CELL;
  return{x:ax+(bx-ax)*t.t-dz*3.5,z:az+(bz-az)*t.t+dx*3.5,dx,dz};
}

for(let k=0;k<14;k++)spawnTraffic();

export function updateTraffic(dt){
  const pp=playerPos();
  for(const t of traffic){
    const pos=trafficPos(t);
    const ax=pos.x+pos.dx*6,az=pos.z+pos.dz*6;
    let blocked=Math.hypot(ax-pp.x,az-pp.z)<4.5;
    if(!blocked)for(const o of traffic){
      if(o!==t&&Math.hypot(ax-o.g.position.x,az-o.g.position.z)<3.5){blocked=true;break;}
    }
    if(t.brakeT>0){t.brakeT-=dt;blocked=true;}
    const target=blocked?0:8.5;
    t.speed+=(target-t.speed)*4*dt;
    t.t+=t.speed*dt/CELL;
    if(t.t>=1){
      const opts=neighborNodes(t.B[0],t.B[1]).filter(n=>!(n[0]===t.A[0]&&n[1]===t.A[1]));
      t.A=t.B;t.B=opts.length?pick(opts):t.A;t.t=0;
    }
    const np=trafficPos(t);
    t.g.position.set(np.x,0,np.z);
    const want=Math.atan2(np.dx,np.dz);
    t.heading+=wrapA(want-t.heading)*Math.min(1,10*dt);
    t.g.rotation.y=t.heading;
    spinWheels(t.g,t.speed,dt);
    const activeCur=cur;
    if(state.mode==='car'&&activeCur){
      const d=t.g.position.distanceTo(activeCur.g.position);
      if(d<2.9){
        const push=new THREE.Vector3().subVectors(t.g.position,activeCur.g.position).setY(0).normalize();
        activeCur.g.position.addScaledVector(push,-(2.9-d)*.6);
        if(Math.abs(activeCur.speed)>8){addWanted(.25,null,'pursuit');thud(Math.abs(activeCur.speed));state.shake=.3;}
        activeCur.speed*=.6;t.brakeT=2;
      }
    }else if(state.mode==='foot'&&t.speed>6.5){
      if(t.g.position.distanceTo(player.g.position)<1.8)getWasted();
    }
  }
}

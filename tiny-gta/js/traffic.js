import * as THREE from 'three';
import {N,CELL,nodeX,pick,rand,irand,wrapA,clamp} from './constants.js';
import {state,carNames,carColors} from './state.js';
import {makeCar,spinWheels,dentCar,seatDriver,shirtColors} from './entities.js';
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

// Próximo nó do percurso: qualquer vizinho menos o de onde veio (beco = retorno)
function pickNext(from,prev){
  const opts=neighborNodes(from[0],from[1]).filter(n=>!(n[0]===prev[0]&&n[1]===prev[1]));
  return opts.length?pick(opts):prev;
}

export function spawnTraffic(){
  const A=[irand(0,N),irand(0,N)],B=pick(neighborNodes(A[0],A[1]));
  const ci=irand(0,carColors.length-1);
  const t={g:makeCar(carColors[ci],false),A,B,C:pickNext(B,A),P:null,t:Math.random(),
    speed:8.5,brakeT:0,name:carNames[ci],heading:0};
  t.driver=seatDriver(t.g,pick(shirtColors));
  traffic.push(t);
}

const TURN=7; // metros antes/depois do nó em que a esquina vira curva
const TURN_S=TURN/CELL;

function lanePoint(A,B,t){
  const ax=nodeX(A[0]),az=nodeX(A[1]),bx=nodeX(B[0]),bz=nodeX(B[1]);
  const dx=(bx-ax)/CELL,dz=(bz-az)/CELL;
  return{x:ax+(bx-ax)*t-dz*3.5,z:az+(bz-az)*t+dx*3.5,dx,dz};
}

// Curva suave na esquina: Bezier quadrática do fim da faixa atual (E) ao
// começo da próxima (X), com controle no cruzamento das duas faixas
function cornerPos(A,B,C,u){
  const E=lanePoint(A,B,1-TURN_S),X=lanePoint(B,C,TURN_S);
  let mx,mz;
  if(Math.abs(E.dx)>.5&&Math.abs(X.dz)>.5){mx=X.x;mz=E.z;}
  else if(Math.abs(E.dz)>.5&&Math.abs(X.dx)>.5){mx=E.x;mz=X.z;}
  else{mx=(E.x+X.x)/2;mz=(E.z+X.z)/2;} // reto ou retorno: sem cruzamento único
  const v=1-u;
  const x=v*v*E.x+2*v*u*mx+u*u*X.x;
  const z=v*v*E.z+2*v*u*mz+u*u*X.z;
  let tx=v*(mx-E.x)+u*(X.x-mx),tz=v*(mz-E.z)+u*(X.z-mz);
  const len=Math.hypot(tx,tz)||1;
  return{x,z,dx:tx/len,dz:tz/len};
}

export function trafficPos(t){
  if(t.C&&t.t>1-TURN_S)return cornerPos(t.A,t.B,t.C,(t.t-(1-TURN_S))/(2*TURN_S));
  if(t.P&&t.t<TURN_S)return cornerPos(t.P,t.A,t.B,.5+t.t/(2*TURN_S));
  return lanePoint(t.A,t.B,t.t);
}

for(let k=0;k<14;k++)spawnTraffic();

export function updateTraffic(dt){
  const pp=playerPos();
  for(const t of traffic){
    const pos=trafficPos(t);
    const ax=pos.x+pos.dx*5,az=pos.z+pos.dz*5;
    let blocked=Math.hypot(ax-pp.x,az-pp.z)<3.8;
    if(!blocked)for(const o of traffic){
      if(o!==t&&Math.hypot(ax-o.g.position.x,az-o.g.position.z)<3.6){blocked=true;break;}
    }
    if(t.brakeT>0){t.brakeT-=dt;blocked=true;}
    // reduz a marcha na esquina pra curva sair suave
    const inCorner=(t.C&&t.t>1-TURN_S)||(t.P&&t.t<TURN_S);
    const target=blocked?0:inCorner?5.5:8.5;
    t.speed+=(target-t.speed)*4*dt;
    t.t+=t.speed*dt/CELL;
    if(t.t>=1){
      t.P=t.A;t.A=t.B;
      t.B=t.C||pickNext(t.A,t.P);
      t.C=pickNext(t.B,t.A);
      t.t-=1;
    }
    const np=trafficPos(t);
    t.g.position.set(np.x,0,np.z);
    const want=Math.atan2(np.dx,np.dz);
    const dh=wrapA(want-t.heading);
    t.heading+=dh*Math.min(1,10*dt);
    t.g.rotation.y=t.heading;
    spinWheels(t.g,t.speed,dt,clamp(dh*2,-1,1)); // steer anima volante e braços
    const activeCur=cur;
    if(state.mode==='car'&&activeCur){
      const d=t.g.position.distanceTo(activeCur.g.position);
      if(d<2.9){
        const push=new THREE.Vector3().subVectors(t.g.position,activeCur.g.position).setY(0).normalize();
        activeCur.g.position.addScaledVector(push,-(2.9-d)*.6);
        if(Math.abs(activeCur.speed)>8){
          addWanted(.25,null,'pursuit');thud(Math.abs(activeCur.speed));state.shake=.3;
          // amassa os dois carros no ponto de contato
          const mid=new THREE.Vector3().addVectors(t.g.position,activeCur.g.position)
            .multiplyScalar(.5).setY(.7);
          dentCar(activeCur.g,mid,push.clone().negate(),.2);
          dentCar(t.g,mid,push,.2);
        }
        activeCur.speed*=.6;t.brakeT=2;
      }
    }else if(state.mode==='foot'&&t.speed>6.5){
      if(t.g.position.distanceTo(player.g.position)<1.5)getWasted();
    }
  }
}

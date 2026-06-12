import * as THREE from 'three';
import {N,clamp,rand,wrapA,nodeX,irand,groundHeight,SWIM_BOUND} from './constants.js';
import {state,refs} from './state.js';
import {scene} from './engine.js';
import {makeCar,makePed,animatePed,spinWheels,blinkBar,dentCar,seatDriver,
  attachHandGun,poseAiming} from './entities.js';
import {makeHeli} from '../assets/models/police/helicopter.js';
import {makeBazookaModel,makeMissileModel} from '../assets/models/weapons/bazooka.js';
import {makeGangTracerLine} from '../assets/models/effects/gang-tracer.js';
import {thud,gunshot} from './audio.js';
import {collideStatics,addWanted} from './physics.js';
import {message} from './hud.js';
import {playerPos,cur,getBusted,getWasted} from './player.js';

// IA da polícia estilo GTA: a viatura persegue; perto de um alvo parado/a pé
// ela ENCOSTA e desce uma dupla de policiais que corre até a distância de
// tiro e atira. Se o jogador abre distância, a dupla volta correndo, embarca
// e a perseguição recomeça. No nível máximo de procurado (5 estrelas) os
// policiais descem com BAZUCAS e atiram mísseis (explodem via weapons.js).

export const cops=[];
export const officers=[]; // policiais a pé em campo (e corpos, por uns segundos)
export let heli=null;

const COP_BLUE=0x2a3f6e;
let lastShout=-99;

export function spawnCop(){
  const px=playerPos();
  let nx,nz,tries=0;
  do{nx=nodeX(irand(0,N));nz=nodeX(irand(0,N));tries++;}
  while(Math.hypot(nx-px.x,nz-px.z)<80&&tries<30);
  const c={g:makeCar(0xe8e8ee,true),heading:rand(0,6.28),speed:0,stuckT:0,backT:0,officers:null};
  c.driver=seatDriver(c.g,0x2a3f6e,0x1a2440); // policial de uniforme azul ao volante
  c.g.position.set(nx,0,nz);
  cops.push(c);
}

// ----- dupla a pé: desce da viatura, caça, atira, e volta se o alvo foge -----
function deployOfficers(c){
  c.officers=[];
  const h=c.heading;
  for(const side of[1.3,-1.3]){
    const o={g:makePed(COP_BLUE),car:c,bob:rand(0,6),shootT:rand(.5,1.1),
      mode:'hunt',dead:false,deadT:0,
      bazooka:Math.floor(state.wanted)>=5}; // 5 estrelas: esquadrão de bazucas
    o.g.position.set(c.g.position.x+Math.cos(h)*side,0,c.g.position.z-Math.sin(h)*side);
    if(o.bazooka){
      const bz=makeBazookaModel();
      bz.scale.set(.85,.85,.85);
      bz.position.set(.32,1.42,.12); // apoiada no ombro
      o.g.add(bz);
    }else attachHandGun(o.g); // pistola na mão direita (empunhadura padrão)
    scene.add(o.g);
    officers.push(o);c.officers.push(o);
  }
}

function removeCop(c){
  scene.remove(c.g);
  if(c.officers)for(const o of c.officers){
    scene.remove(o.g);
    const i=officers.indexOf(o);if(i>=0)officers.splice(i,1);
  }
  c.officers=null;
}

const copMissiles=[];
const tracers=[];

// WASTED/BUSTED limpam tudo de uma vez (player.js chama via refs)
export function clearCops(){
  while(cops.length)removeCop(cops.pop());
  for(const o of officers)scene.remove(o.g);
  officers.length=0;
  for(const m of copMissiles)scene.remove(m.g);
  copMissiles.length=0;
  for(const t of tracers)scene.remove(t.line);
  tracers.length=0;
}
refs.clearCops=clearCops;

// chamado por weapons.js quando bala/explosão do jogador acerta um policial
export function killOfficer(o){
  if(o.dead)return;
  o.dead=true;o.deadT=0;
  if(o.car?.officers){
    const i=o.car.officers.indexOf(o);if(i>=0)o.car.officers.splice(i,1);
    if(!o.car.officers.length)o.car.officers=null; // viatura volta à caça
  }
  o.g.rotation.x=-Math.PI/2; // tomba de costas como os outros peds
  o.g.position.y=.35;
  refs.addBloodPuddle?.(o.g.position.x,o.g.position.z);
  addWanted(1.5,'OFFICER DOWN!','cop_killed');
}

function addTracer(a,b){
  const line=makeGangTracerLine(a,b);
  scene.add(line);tracers.push({line,t:0});
}

function officerShoot(o,pp,dist){
  o.shootT=rand(.9,1.6);
  const from=o.g.position.clone();from.y+=1.25;
  const hit=Math.random()<clamp(.75-dist*.02,.15,.75);
  const to=new THREE.Vector3(pp.x,pp.y+1.1,pp.z);
  if(!hit){
    const a=rand(0,Math.PI*2);
    to.x+=Math.cos(a)*rand(.8,2.2);to.z+=Math.sin(a)*rand(.8,2.2);
  }
  addTracer(from,to);
  gunshot(.35);
  if(hit){
    state.health-=state.mode==='car'?irand(2,4):irand(4,9); // lataria protege
    state.shake=Math.max(state.shake,.12);
    if(state.health<=0){state.health=100;getWasted();}
  }
}

// míssil de bazuca: mira onde o jogador ESTÁ — o tempo de voo dá a esquiva
function officerRocket(o,pp){
  o.shootT=rand(2.6,3.8);
  const from=o.g.position.clone();from.y+=1.45;
  const to=new THREE.Vector3(pp.x+rand(-2.5,2.5),0,pp.z+rand(-2.5,2.5));
  const dir=new THREE.Vector3(to.x-from.x,0,to.z-from.z);
  const dist=Math.max(dir.length(),.001);
  dir.normalize();
  const g=makeMissileModel();
  g.position.copy(from);
  g.rotation.y=Math.atan2(dir.x,dir.z);
  scene.add(g);
  copMissiles.push({g,dir,left:Math.min(dist,46)});
  thud(6);
}

function updateOfficer(o,dt,pp){
  if(o.dead){ // corpo fica uns segundos no chão e some
    o.deadT+=dt;
    if(o.deadT>8){
      scene.remove(o.g);
      const i=officers.indexOf(o);if(i>=0)officers.splice(i,1);
    }
    return;
  }
  const p=o.g.position;
  if(o.mode==='return'){
    const c=o.car;
    if(!c){o.mode='hunt';return;}
    const dx=c.g.position.x-p.x,dz=c.g.position.z-p.z,d=Math.hypot(dx,dz);
    if(d<1.7){ // embarcou: some da rua, a viatura retoma a perseguição
      scene.remove(o.g);
      const oi=officers.indexOf(o);if(oi>=0)officers.splice(oi,1);
      const ci=c.officers?c.officers.indexOf(o):-1;if(ci>=0)c.officers.splice(ci,1);
      if(c.officers&&!c.officers.length)c.officers=null;
      return;
    }
    p.x+=dx/d*7*dt;p.z+=dz/d*7*dt;
    o.g.rotation.y=Math.atan2(dx,dz);
    o.bob+=dt*12;animatePed(o.g,o.bob,1);
    collideStatics(p,.5);
    return;
  }
  // caçando: corre até a distância de tiro e atira parado (para, mira, atira)
  const dx=pp.x-p.x,dz=pp.z-p.z,distP=Math.hypot(dx,dz);
  const stop=o.bazooka?16:9;
  if(distP>stop){
    p.x+=dx/distP*6.4*dt;p.z+=dz/distP*6.4*dt;
    o.bob+=dt*11;animatePed(o.g,o.bob,1);
  }else animatePed(o.g,o.bob,0);
  poseAiming(o.g); // arma apontada pro jogador (pose padrão de mira)
  o.g.rotation.y=Math.atan2(dx,dz);
  collideStatics(p,.5);
  o.shootT-=dt;
  // só atira em alvo no nível da rua (telhado fica fora do alcance deles)
  if(o.shootT<=0&&pp.y-p.y<3&&distP<(o.bazooka?44:26)){
    if(o.bazooka)officerRocket(o,pp);
    else officerShoot(o,pp,distP);
  }
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

const _missileProbe=new THREE.Vector3();

export function updateCops(dt){
  const want=Math.floor(state.wanted);
  if(cops.length<want&&cops.length<5&&Math.random()<dt*.8)spawnCop();
  while(cops.length>want)removeCop(cops.pop());
  const pp=playerPos();
  let minD=1e9;
  for(const c of cops){
    const p=c.g.position;
    const dx=pp.x-p.x,dz=pp.z-p.z,dist=Math.hypot(dx,dz);
    minD=Math.min(minD,dist);
    blinkBar(c.g);
    if(c.officers){
      // dupla em campo: viatura encostada esperando; se o alvo abre
      // distância (ou arranca de carro), a dupla volta pra embarcar
      c.speed+=(0-c.speed)*6*dt;
      spinWheels(c.g,c.speed,dt,0);
      const fleeing=dist>30||(state.mode==='car'&&Math.abs(cur?.speed||0)>10);
      for(const o of c.officers)o.mode=fleeing?'return':'hunt';
      continue;
    }
    const desired=Math.atan2(dx,dz),diff=wrapA(desired-c.heading);
    if(c.backT>0){
      c.backT-=dt;c.speed+=(-8-c.speed)*3*dt;
      c.heading-=Math.sign(diff)*1.4*dt;
    }else{
      c.heading+=clamp(diff,-1,1)*2.5*dt*clamp(Math.abs(c.speed)/8+.25,0,1);
      // alvo a pé: freia ao se aproximar e encosta devagar (nunca atropela)
      const ts=dist>15?27:state.mode==='foot'&&dist<9?2.5:12;
      c.speed+=(ts-c.speed)*(ts<c.speed?3.2:1.3)*dt;
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
    // alvo ao alcance: encosta e desce a dupla atirando — a pé a viatura
    // chega BEM perto antes de parar; de carro só se você estiver quase parado
    if(pp.y<6&&!c.backT&&
      (state.mode==='foot'?dist<8:dist<13&&Math.abs(cur?.speed||0)<4)){
      deployOfficers(c);
      if(state.time-lastShout>6){lastShout=state.time;message('POLICE! FREEZE!','var(--blue)');}
      continue;
    }
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
    }
    // a polícia NUNCA atropela quem está a pé: o empurrão do updateFoot
    // (jogador não atravessa carros) afasta o corpo, e a viatura já freia perto
  }

  // policiais a pé (iteração reversa: embarque/corpo somem da lista no meio)
  for(let i=officers.length-1;i>=0;i--)updateOfficer(officers[i],dt,pp);

  // mísseis das bazucas da polícia: voo reto, explode no destino/obstáculo
  for(let i=copMissiles.length-1;i>=0;i--){
    const m=copMissiles[i];
    const step=26*dt;
    m.g.position.addScaledVector(m.dir,step);
    m.left-=step;
    m.g.userData.flame.scale.setScalar(.7+Math.random()*.6);
    _missileProbe.copy(m.g.position);
    if(m.left<=0||collideStatics(_missileProbe,.3,SWIM_BOUND)||
      m.g.position.y<=groundHeight(m.g.position.x,m.g.position.z)){
      refs.explodeAt?.(m.g.position.clone());
      scene.remove(m.g);copMissiles.splice(i,1);
    }
  }
  for(let i=tracers.length-1;i>=0;i--){
    const t=tracers[i];t.t+=dt;
    if(t.t>.15){scene.remove(t.line);tracers.splice(i,1);}
  }

  // cerco: viatura colada OU policial a pé do lado, com o jogador parado/a pé
  let nearOff=1e9;
  for(const o of officers)if(!o.dead)
    nearOff=Math.min(nearOff,Math.hypot(pp.x-o.g.position.x,pp.z-o.g.position.z));
  const cornered=(minD<6||nearOff<3.4)&&pp.y<3;
  if((cops.length||officers.length)&&cornered&&
    (state.mode==='foot'||Math.abs(cur?.speed||0)<3.5)){
    state.bustT+=dt;
    if(state.bustT>.4)message('THE POLICE ARE SURROUNDING YOU!','var(--blue)');
    if(state.bustT>1.8){getBusted();return;}
  }else state.bustT=Math.max(0,state.bustT-dt*2);
  if(state.wanted>0&&state.time-state.lastCrime>9&&(minD>70||!cops.length))
    state.wanted=Math.max(0,state.wanted-dt/5);
}

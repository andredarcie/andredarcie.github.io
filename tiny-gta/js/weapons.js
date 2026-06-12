import * as THREE from 'three';
import {state,refs,saveBest} from './state.js';
import {scene,camera} from './engine.js';
import {N,ROAD,BLOCK,SIDE,rand,irand,nodeX,groundHeight,SWIM_BOUND} from './constants.js';
import {isPark} from './world.js';
import {blip,thud,gunshot} from './audio.js';
import {message} from './hud.js';
import {addWanted,collideStatics} from './physics.js';
import {player,playerPos,cameraRig,idleCars,cur,getWasted} from './player.js';
import {peds,addBloodPuddle} from './pedestrians.js';
import {traffic,spawnTraffic} from './traffic.js';
import {cops,officers as copOfficers,killOfficer} from './police.js';
import {spawnDrop} from './missions.js';
import {gangPeds,killGangPed} from './gangs.js';
import {dentCar,poseAiming} from './entities.js';
import {makeGunModel} from '../assets/models/weapons/player-gun.js';
import {makeBazookaModel,makeMissileModel} from '../assets/models/weapons/bazooka.js';
import {makeExplosionModel} from '../assets/models/effects/explosion.js';
import {makeImpactRing} from '../assets/models/effects/impact-ring.js';
import {makeBulletModel} from '../assets/models/effects/bullet.js';
import {makeWeaponTracerLine} from '../assets/models/effects/weapon-tracer.js';

const weaponPickups=[];
function makeWeaponPickup(x,z){
  const g=makeGunModel({pickup:true});
  g.scale.set(1.05,1.05,1.05);
  g.position.set(x,.82,z);
  g.userData.baseY=.82;
  scene.add(g);
  weaponPickups.push(g);
}

for(let i=0;i<N;i++)for(let j=0;j<N;j++){
  if(!isPark(i,j))continue;
  const x0=nodeX(i)+ROAD/2+SIDE,z0=nodeX(j)+ROAD/2+SIDE;
  const tucked=Math.random()<.5?-1:1;
  makeWeaponPickup(
    x0+BLOCK*.5+tucked*rand(7,12),
    z0+BLOCK*.5+rand(-11,11)
  );
}
if(!weaponPickups.length)makeWeaponPickup(nodeX(4)+12,nodeX(4)+12);

const heldGun=makeGunModel();
heldGun.position.set(.43,1.26,.67);
heldGun.rotation.set(-.03,0,-.03);
heldGun.visible=false;
player.g.add(heldGun);
const muzzlePoint=heldGun.userData.muzzlePoint;

// ----- BAZUCA: item mais potente do jogo, escondida na zona rural -----
// Encostar nela inicia um rampage estilo Vice City: destruir N carros em
// T segundos com mísseis (cada míssil destrói um carro de uma vez e a onda
// de choque mata grupos inteiros). Ganhou, leva o prêmio; perdeu, fica tudo
// normal. A bazuca só existe durante o rampage e reaparece no campo depois.
const RAMPAGE_GOAL=3,RAMPAGE_TIME=80,RAMPAGE_REWARD=1000;
const rampage={active:false,end:0,kills:0};
const missiles=[];
const BAZ_X=320,BAZ_Z=0; // fim da estrada de terra, no pé da montanha
const bazookaPickup=makeBazookaModel({pickup:true});
bazookaPickup.scale.set(1.4,1.4,1.4);
bazookaPickup.position.set(BAZ_X,groundHeight(BAZ_X,BAZ_Z)+.95,BAZ_Z);
scene.add(bazookaPickup);
let bazRespawnAt=-1;

const heldBazooka=makeBazookaModel();
heldBazooka.position.set(.43,1.48,.15); // apoiada no ombro direito
heldBazooka.visible=false;
player.g.add(heldBazooka);

const rampageEl=document.getElementById('rampage');

function startRampage(){
  rampage.active=true;rampage.end=state.time+RAMPAGE_TIME;rampage.kills=0;
  bazookaPickup.visible=false;
  message(`RAMPAGE! DESTROY ${RAMPAGE_GOAL} CARS WITH THE BAZOOKA`,'var(--pink)');
  blip([220,330,440,660],.09,'square',.2);
}

function endRampage(won){
  rampage.active=false;
  if(rampageEl)rampageEl.style.display='none';
  bazRespawnAt=state.time+75; // a bazuca volta pro pasto um tempo depois
  if(won){
    state.money+=RAMPAGE_REWARD;saveBest();
    message(`RAMPAGE PASSED! +$${RAMPAGE_REWARD}`,'var(--gold)');
    blip([523,659,784,1047],.09,'sine',.18);
  }else{
    message('RAMPAGE FAILED','var(--pink)');
    blip([220,170,120],.1,'sawtooth',.16);
  }
}

const explosions=[];
const tracers=[];
const impacts=[];
const bullets=[];
const MAX_AMMO=90;
let lastShot=-99;
let gunKick=0;
document.getElementById('buildver')?.insertAdjacentText('beforeend',' ◆ BULLET');

export function isWeaponHeld(){
  if(state.mode!=='foot')return false;
  return rampage.active||!!(state.hasGun&&state.weaponHeld);
}

export function canPickWeapon(){
  if(state.hasGun||state.mode!=='foot')return false;
  return !!nearestWeaponPickup(3);
}

// Dá a arma com pente cheio sem depender de um pickup no chão (o espólio
// dos telhados em js/doors.js também usa)
export function grantWeapon(){
  state.hasGun=true;state.weaponHeld=state.mode==='foot';
  state.ammo=MAX_AMMO;state.maxAmmo=MAX_AMMO;
  for(const g of weaponPickups)scene.remove(g);
  blip([440,660,880],.07,'square',.14);
}

export function pickupWeapon(){
  const pickup=nearestWeaponPickup(3);
  if(!pickup)return;
  grantWeapon();
  message('WEAPON PICKED UP - LEFT CLICK TO SHOOT','var(--gold)');
}

export function confiscateWeapon(){
  state.hasGun=false;
  state.weaponHeld=false;
  state.ammo=0;
  state.maxAmmo=0;
  heldGun.visible=false;
  for(const g of weaponPickups)if(!g.parent)scene.add(g);
}

function nearestWeaponPickup(maxD){
  const pp=playerPos();
  let best=null,bd=maxD;
  for(const g of weaponPickups){
    if(!g.parent)continue;
    const d=pp.distanceTo(g.position);
    if(d<bd){bd=d;best=g;}
  }
  return best;
}

function rayHitXZ(origin,dir,pos,radius,range){
  const dx=pos.x-origin.x,dz=pos.z-origin.z;
  const ahead=dx*dir.x+dz*dir.z;
  if(ahead<0||ahead>range)return null;
  const side=Math.abs(dx*dir.z-dz*dir.x);
  return side<=radius?ahead:null;
}

function aimRay(range=48){
  const camDir=new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const muzzle=getMuzzleWorldPosition();
  const flatDir=new THREE.Vector3(camDir.x,0,camDir.z);
  if(flatDir.lengthSq()<.0001)flatDir.set(Math.sin(cameraRig.yaw),0,Math.cos(cameraRig.yaw));
  flatDir.normalize();
  let aimPoint;
  if(Math.abs(camDir.y)>.001){
    const t=(muzzle.y-camera.position.y)/camDir.y;
    if(t>3&&t<range*2)aimPoint=camera.position.clone().addScaledVector(camDir,t);
  }
  if(!aimPoint)aimPoint=muzzle.clone().addScaledVector(flatDir,range);
  const dir=aimPoint.sub(muzzle);
  dir.y=0;
  if(dir.lengthSq()<.0001)dir.copy(flatDir);
  dir.normalize();
  return{origin:muzzle.addScaledVector(dir,.42),dir};
}

function getMuzzleWorldPosition(){
  if(heldBazooka.visible){
    return heldBazooka.userData.muzzlePoint.getWorldPosition(new THREE.Vector3());
  }
  if(heldGun.visible){
    return muzzlePoint.getWorldPosition(new THREE.Vector3());
  }
  const right=new THREE.Vector3(Math.cos(cameraRig.yaw),0,-Math.sin(cameraRig.yaw));
  return playerPos().clone().addScaledVector(right,.46).setY(playerPos().y+1.12);
}

function posePlayerWithGun(){
  const limbs=player.g.userData.limbs;
  if(!limbs?.rightArm)return;
  poseAiming(player.g,gunKick); // pose padrão de mira (mesma de NPCs/polícia)
  heldGun.position.set(limbs.rightArm.position.x,1.26,.67-gunKick*.75);
  heldGun.rotation.set(-.03-gunKick*.9,0,-.03);
}

function findWeaponHit(origin,dir,range=48){
  let best={kind:'miss',d:range,target:null,arr:null};
  for(const p of peds){
    if(p.state==='dead'||p.state==='fly')continue;
    const d=rayHitXZ(origin,dir,p.g.position,1.05,range);
    if(d!==null&&d<best.d)best={kind:'ped',d,target:p};
  }
  for(const p of gangPeds){
    if(p.state==='dead'||p.state==='fly')continue;
    const d=rayHitXZ(origin,dir,p.g.position,1.05,range);
    if(d!==null&&d<best.d)best={kind:'gang',d,target:p};
  }
  for(const t of refs.storyTargets?.()||[]){ // alvo de missão de assassinato
    const d=rayHitXZ(origin,dir,t.g.position,1.05,range);
    if(d!==null&&d<best.d)best={kind:'story',d,target:t};
  }
  for(const o of copOfficers){ // policiais a pé também levam bala
    if(o.dead)continue;
    const d=rayHitXZ(origin,dir,o.g.position,1.05,range);
    if(d!==null&&d<best.d)best={kind:'officer',d,target:o};
  }
  for(const arr of[traffic,idleCars,cops]){
    for(const c of arr){
      const d=rayHitXZ(origin,dir,c.g.position,2.1,range);
      if(d!==null&&d<best.d)best={kind:'car',d,target:c,arr};
    }
  }
  return best;
}

function killPed(p,dir){
  if(p.state==='dead'||p.state==='fly')return;
  p.state='fly';
  p.bloodDropped=true;
  p.vel.copy(dir).multiplyScalar(9).add(new THREE.Vector3(rand(-1.5,1.5),rand(5,7),rand(-1.5,1.5)));
  addBloodPuddle(p.g.position.x,p.g.position.z);
  spawnDrop(p.g.position.x,p.g.position.z,irand(15,55));
  addWanted(1,'SHOT FIRED!','ped_shot');
}

function makeExplosion(pos){
  const g=makeExplosionModel();g.position.copy(pos);g.position.y=1.2;scene.add(g);
  explosions.push({g,t:0});
  thud(18);blip([80,52],.12,'sawtooth',.28);
}

// Onda de choque da explosão (raio 5): mata quem está perto, amassa e pode
// detonar carros vizinhos em cadeia
function blastDamage(pos){
  const bp=pos.clone().setY(.6);
  const pp=playerPos();
  if(pp.distanceTo(pos)<5){
    if(state.mode==='foot')getWasted();
    else if(cur){
      const dir=new THREE.Vector3().subVectors(cur.g.position,pos).setY(0).normalize();
      dentCar(cur.g,bp,dir,.3);cur.speed*=.5;state.shake=.9;
    }
  }
  for(const p of peds){
    if(p.state==='dead'||p.state==='fly')continue;
    if(p.g.position.distanceTo(pos)>=5)continue;
    const dir=new THREE.Vector3().subVectors(p.g.position,pos).setY(0).normalize();
    p.state='fly';p.bloodDropped=false;
    p.vel.copy(dir).multiplyScalar(8).add(new THREE.Vector3(rand(-1,1),rand(6,9),rand(-1,1)));
  }
  for(const p of gangPeds){
    if(p.state==='dead'||p.state==='fly')continue;
    if(p.g.position.distanceTo(pos)<5)
      killGangPed(p,new THREE.Vector3().subVectors(p.g.position,pos).setY(0).normalize());
  }
  for(const o of copOfficers){ // a onda de choque também derruba a dupla
    if(!o.dead&&o.g.position.distanceTo(pos)<5)killOfficer(o);
  }
  for(const arr of[traffic,idleCars,cops]){
    for(const c of arr){
      if(c===cur||c.plane)continue;
      const d=c.g.position.distanceTo(pos);
      if(d>=5)continue;
      const dir=new THREE.Vector3().subVectors(c.g.position,pos).setY(0).normalize();
      dentCar(c.g,bp,dir,.25);
      const ud=c.g.userData;
      ud.bulletHits=(ud.bulletHits||0)+2;
      if(ud.bulletHits>=4)
        setTimeout(()=>{if(arr.indexOf(c)>=0)explodeCar(c,arr);},220);
    }
  }
}

// explosão genérica exposta via refs: police.js detona os mísseis das
// bazucas dos policiais sem criar import circular com este módulo
export function explodeAt(pos){
  makeExplosion(pos.clone());
  blastDamage(pos);
}
refs.explodeAt=explodeAt;

function explodeCar(car,arr){
  if(!car||car===cur)return;
  const pos=car.g.position.clone();
  scene.remove(car.g);
  const idx=arr.indexOf(car);
  if(idx>=0)arr.splice(idx,1);
  makeExplosion(pos);
  blastDamage(pos);
  addWanted(1.5,'VEHICLE DESTROYED!','vehicle_destroyed');
  state.shake=.7;
  if(arr===traffic)setTimeout(()=>spawnTraffic(),900);
  // rampage da bazuca: todo carro destruído conta (em cadeia também)
  if(rampage.active){
    rampage.kills++;
    if(rampage.kills>=RAMPAGE_GOAL)endRampage(true);
  }
}

function damageCar(car,arr,pos,dir){
  if(!car||car===cur)return;
  if(pos&&dir)dentCar(car.g,pos,dir,.07); // amassadinho onde a bala pegou
  const ud=car.g.userData;
  ud.bulletHits=(ud.bulletHits||0)+1;
  state.shake=Math.max(state.shake,.04);
  addWanted(.35,'SHOT FIRED!','vehicle_shot');
  if(ud.bulletHits>=4)explodeCar(car,arr);
}

function addTracer(origin,end){
  const line=makeWeaponTracerLine(origin.clone(),new THREE.Vector3(end.x,origin.y,end.z));
  scene.add(line);tracers.push({line,t:0});
}

function addImpact(pos,hit){
  const missed=hit?.kind==='miss';
  const impactRadius=missed ? .16 : .28;
  const ring=makeImpactRing(impactRadius,missed?0xfff2b0:0xffd24a);
  ring.position.set(pos.x,.08,pos.z);
  scene.add(ring);impacts.push({ring,t:0});
}

function makeBullet(origin,dir){
  const g=makeBulletModel();
  g.position.copy(origin);
  g.rotation.y=Math.atan2(dir.x,dir.z);
  g.position.addScaledVector(dir,.55);
  scene.add(g);
  bullets.push({
    g,dir:dir.clone(),prev:origin.clone(),
    speed:86,life:.62,dist:0,range:52
  });
}

function handleBulletHit(hit,pos,dir){
  addImpact(pos,hit);
  if(hit.kind==='ped')killPed(hit.target,dir);
  else if(hit.kind==='gang')killGangPed(hit.target,dir);
  else if(hit.kind==='officer')killOfficer(hit.target);
  else if(hit.kind==='story')hit.target.kill();
  else if(hit.kind==='car')damageCar(hit.target,hit.arr,pos,dir);
  else addWanted(.25,'SHOT FIRED!','gunfire');
}

// Tiro da bazuca: cadência lenta, míssil visível, coice forte; sem munição
// pra controlar — o limite do rampage é o relógio
function fireMissile(){
  if(state.time-lastShot<1.15)return;
  lastShot=state.time;
  player.heading=cameraRig.yaw;
  player.g.rotation.y=cameraRig.yaw;
  posePlayerWithGun();
  player.g.updateWorldMatrix(true,true);
  const{origin,dir}=aimRay(70);
  const g=makeMissileModel();
  g.position.copy(origin);
  g.rotation.y=Math.atan2(dir.x,dir.z);
  scene.add(g);
  missiles.push({g,dir:dir.clone(),dist:0,range:75});
  thud(7);blip([95,60],.16,'sawtooth',.3); // estampido grave do tubo
  state.crosshairKick=1;
  state.shake=Math.max(state.shake,.2);
  gunKick=.16;
}

// Impacto do míssil: carro atingido em cheio explode na hora (explodeCar já
// faz a explosão + onda de choque); qualquer outro impacto detona no ponto
function missileBlast(pos,hit){
  if(hit&&hit.kind==='car')explodeCar(hit.target,hit.arr);
  else{
    makeExplosion(pos.clone());
    blastDamage(pos);
    addWanted(1,'EXPLOSION!','explosion');
  }
  if(hit&&hit.kind==='story')hit.target.kill();
  state.shake=Math.max(state.shake,.4);
}

export function shootWeapon(){
  if(!isWeaponHeld())return;
  if(rampage.active)return fireMissile();
  if(state.time-lastShot<.18)return;
  if(state.ammo<=0){message('OUT OF AMMO','var(--pink)');return;}
  lastShot=state.time;state.ammo--;
  player.heading=cameraRig.yaw;
  player.g.rotation.y=cameraRig.yaw;
  posePlayerWithGun();
  player.g.updateWorldMatrix(true,true);
  const{origin,dir}=aimRay();
  makeBullet(origin,dir);
  addTracer(origin,origin.clone().addScaledVector(dir,3.2));
  gunshot();
  state.crosshairKick=1;
  state.shake=Math.max(state.shake,.08);
  gunKick=.09;
}

const _missileProbe=new THREE.Vector3();

export function updateWeapons(dt){
  heldBazooka.visible=rampage.active&&state.mode==='foot';
  heldGun.visible=isWeaponHeld()&&!rampage.active;
  if(heldGun.visible||heldBazooka.visible){
    posePlayerWithGun();
    gunKick=Math.max(0,gunKick-dt*.55);
  }

  // ----- rampage da bazuca: relógio, placar e fim por morte/prisão -----
  if(rampage.active){
    if(state.mode==='cut')endRampage(false); // WASTED/BUSTED encerra o desafio
    else if(state.time>rampage.end)endRampage(false);
    else if(rampageEl){
      rampageEl.style.display='block';
      rampageEl.textContent=
        `RAMPAGE ${rampage.kills}/${RAMPAGE_GOAL} CARS - ${Math.ceil(rampage.end-state.time)}s`;
    }
  }else{
    if(!bazookaPickup.visible&&bazRespawnAt>=0&&state.time>bazRespawnAt)
      bazookaPickup.visible=true;
    if(bazookaPickup.visible){
      bazookaPickup.rotation.y+=dt*1.2;
      bazookaPickup.position.y=groundHeight(BAZ_X,BAZ_Z)+.95+Math.sin(state.time*2.6)*.1;
      // pegar é encostar (igual às portas): o rampage começa na hora
      if(state.started&&state.mode==='foot'&&!state.controlsLocked&&
        playerPos().distanceTo(bazookaPickup.position)<2.6)startRampage();
    }
  }

  // mísseis em voo: raio contra alvos no passo, prédios/limites via solids
  for(let i=missiles.length-1;i>=0;i--){
    const m=missiles[i];
    const step=34*dt;
    const hit=findWeaponHit(m.g.position,m.dir,step+1.2);
    if(hit.kind!=='miss'){
      missileBlast(m.g.position.clone().addScaledVector(m.dir,hit.d),hit);
      scene.remove(m.g);missiles.splice(i,1);continue;
    }
    m.g.position.addScaledVector(m.dir,step);
    m.dist+=step;
    _missileProbe.copy(m.g.position);
    if(collideStatics(_missileProbe,.3,SWIM_BOUND)||m.dist>=m.range||
      m.g.position.y<=groundHeight(m.g.position.x,m.g.position.z)){ // encosta da montanha
      missileBlast(m.g.position.clone(),null);
      scene.remove(m.g);missiles.splice(i,1);continue;
    }
    m.g.userData.flame.scale.setScalar(.7+Math.random()*.6); // chama tremula
    addTracer(m.g.position.clone().addScaledVector(m.dir,-1.1),m.g.position);
  }
  if(isWeaponHeld()&&!state.paused&&!state.dlgActive&&!state.orientationBlocked){
    const{origin,dir}=aimRay();
    state.crosshairTarget=findWeaponHit(origin,dir,48).kind!=='miss';
  }else state.crosshairTarget=false;
  if(!state.hasGun){
    for(let i=0;i<weaponPickups.length;i++){
      const g=weaponPickups[i];
      if(!g.parent)continue;
      g.rotation.y+=dt*(1.45+i*.08);
      g.position.y=g.userData.baseY+Math.sin(state.time*3+i)*.08;
    }
  }
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    b.life-=dt;
    const step=b.speed*dt;
    const hit=findWeaponHit(b.g.position,b.dir,step);
    if(hit.kind!=='miss'){
      const hitPos=b.g.position.clone().addScaledVector(b.dir,hit.d);
      handleBulletHit(hit,hitPos,b.dir);
      scene.remove(b.g);
      bullets.splice(i,1);
      continue;
    }
    b.prev.copy(b.g.position);
    b.g.position.addScaledVector(b.dir,step);
    b.dist+=step;
    const trailEnd=b.g.position.clone().addScaledVector(b.dir,-Math.min(1.8,b.dist*.45));
    addTracer(trailEnd,b.g.position);
    if(b.life<=0||b.dist>=b.range){
      addImpact(b.g.position,{kind:'miss'});
      scene.remove(b.g);
      bullets.splice(i,1);
    }
  }
  for(let i=explosions.length-1;i>=0;i--){
    const e=explosions[i];e.t+=dt;
    const s=1+e.t*4;
    e.g.scale.set(s,s,s);
    e.g.traverse(o=>{if(o.material)o.material.opacity=Math.max(0,o.material.opacity-dt*1.6);});
    if(e.t>.75){scene.remove(e.g);explosions.splice(i,1);}
  }
  for(let i=tracers.length-1;i>=0;i--){
    const t=tracers[i];t.t+=dt;
    t.line.material.opacity=Math.max(0,1-t.t*8);
    if(t.t>.14){scene.remove(t.line);tracers.splice(i,1);}
  }
  for(let i=impacts.length-1;i>=0;i--){
    const p=impacts[i];p.t+=dt;
    const s=1+p.t*5;
    p.ring.scale.set(s,s,s);
    p.ring.material.opacity=Math.max(0,.85-p.t*4);
    if(p.t>.25){scene.remove(p.ring);impacts.splice(i,1);}
  }
}

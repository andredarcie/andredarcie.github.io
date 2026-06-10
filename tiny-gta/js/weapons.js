import * as THREE from 'three';
import {state,refs} from './state.js';
import {scene,camera} from './engine.js';
import {N,ROAD,BLOCK,SIDE,rand,irand,nodeX} from './constants.js';
import {isPark} from './world.js';
import {blip,thud} from './audio.js';
import {message} from './hud.js';
import {addWanted} from './physics.js';
import {reportPoliceCrime} from './police-radio.js';
import {player,playerPos,cameraRig,idleCars,cur} from './player.js';
import {peds,addBloodPuddle} from './pedestrians.js';
import {traffic,spawnTraffic} from './traffic.js';
import {cops} from './police.js';
import {spawnDrop} from './missions.js';

const gunMat=new THREE.MeshStandardMaterial({color:0x15121a,roughness:.45,metalness:.8});
const gunDarkMat=new THREE.MeshStandardMaterial({color:0x07070b,roughness:.35,metalness:.9});
const glowMat=new THREE.MeshBasicMaterial({color:0xffd24a,transparent:true,opacity:.25});
const bulletMat=new THREE.MeshBasicMaterial({color:0xfff4a8});
const bulletCoreMat=new THREE.MeshBasicMaterial({color:0xffffff});

function makeGunModel({pickup=false}={}){
  const g=new THREE.Group();
  const slide=new THREE.Mesh(new THREE.BoxGeometry(.54,.13,.34),gunDarkMat);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(.46,.13,.28),gunMat);
  const grip=new THREE.Mesh(new THREE.BoxGeometry(.14,.36,.17),gunMat);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.46,8),gunDarkMat);
  const trigger=new THREE.Mesh(new THREE.TorusGeometry(.08,.015,6,12),gunDarkMat);
  slide.position.set(0,.08,.1);
  frame.position.set(0,-.02,.06);
  grip.position.set(0,-.24,-.08);
  grip.rotation.x=-.38;
  barrel.rotation.x=Math.PI/2;
  barrel.position.set(0,.09,.44);
  trigger.position.set(0,-.11,.1);
  trigger.rotation.y=Math.PI/2;
  g.add(slide,frame,grip,barrel,trigger);
  if(pickup){
    const glow=new THREE.Mesh(new THREE.TorusGeometry(.9,.045,8,28),glowMat);
    glow.rotation.x=Math.PI/2;
    glow.position.y=-.46;
    g.add(glow);
  }
  return g;
}

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
heldGun.position.set(.43,1.13,.64);
heldGun.rotation.set(-.03,0,-.03);
heldGun.visible=false;
player.g.add(heldGun);
const muzzlePoint=new THREE.Object3D();
muzzlePoint.position.set(0,.09,.72);
heldGun.add(muzzlePoint);

const tracerMat=new THREE.LineBasicMaterial({color:0xfff2b0,transparent:true,opacity:.9});
const explosions=[];
const tracers=[];
const impacts=[];
const bullets=[];
const MAX_AMMO=90;
let lastShot=-99;
let gunKick=0;
document.getElementById('buildver')?.insertAdjacentText('beforeend',' ◆ BULLET');

export function isWeaponHeld(){
  return !!(state.hasGun&&state.weaponHeld&&state.mode==='foot');
}

export function canPickWeapon(){
  if(state.hasGun||state.mode!=='foot')return false;
  return !!nearestWeaponPickup(3);
}

export function pickupWeapon(){
  const pickup=nearestWeaponPickup(3);
  if(!pickup)return;
  state.hasGun=true;state.weaponHeld=true;state.ammo=MAX_AMMO;state.maxAmmo=MAX_AMMO;
  for(const g of weaponPickups)scene.remove(g);
  message('WEAPON PICKED UP - LEFT CLICK TO SHOOT','var(--gold)');
  blip([440,660,880],.07,'square',.14);
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
  if(heldGun.visible){
    return muzzlePoint.getWorldPosition(new THREE.Vector3());
  }
  const right=new THREE.Vector3(Math.cos(cameraRig.yaw),0,-Math.sin(cameraRig.yaw));
  return playerPos().clone().addScaledVector(right,.46).setY(playerPos().y+1.12);
}

function posePlayerWithGun(){
  const limbs=player.g.userData.limbs;
  if(!limbs?.rightArm)return;
  const handX=limbs.rightArm.position.x;
  limbs.rightArm.rotation.x=-Math.PI/2+gunKick*1.2;
  limbs.rightArm.rotation.y=-.04;
  limbs.rightArm.rotation.z=-.08;
  if(limbs.leftArm){
    limbs.leftArm.rotation.x=-.28;
    limbs.leftArm.rotation.y=.08;
    limbs.leftArm.rotation.z=.18;
  }
  heldGun.position.set(handX,1.13,.64-gunKick*.75);
  heldGun.rotation.set(-.03-gunKick*.9,0,-.03);
}

function findWeaponHit(origin,dir,range=48){
  let best={kind:'miss',d:range,target:null,arr:null};
  for(const p of peds){
    if(p.state==='dead'||p.state==='fly')continue;
    const d=rayHitXZ(origin,dir,p.g.position,1.05,range);
    if(d!==null&&d<best.d)best={kind:'ped',d,target:p};
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
  const g=new THREE.Group();
  const fire=new THREE.Mesh(new THREE.SphereGeometry(1.1,14,10),
    new THREE.MeshBasicMaterial({color:0xff6a00,transparent:true,opacity:.88}));
  const core=new THREE.Mesh(new THREE.SphereGeometry(.55,12,8),
    new THREE.MeshBasicMaterial({color:0xfff0a0,transparent:true,opacity:.95}));
  const smoke=new THREE.Mesh(new THREE.SphereGeometry(1.8,12,8),
    new THREE.MeshBasicMaterial({color:0x24172a,transparent:true,opacity:.35}));
  g.add(smoke,fire,core);g.position.copy(pos);g.position.y=1.2;scene.add(g);
  explosions.push({g,t:0});
  thud(18);blip([80,52],.12,'sawtooth',.28);
}

function explodeCar(car,arr){
  if(!car||car===cur)return;
  const pos=car.g.position.clone();
  scene.remove(car.g);
  const idx=arr.indexOf(car);
  if(idx>=0)arr.splice(idx,1);
  makeExplosion(pos);
  addWanted(1.5,'VEHICLE DESTROYED!','vehicle_destroyed');
  state.shake=.7;
  if(arr===traffic)setTimeout(()=>spawnTraffic(),900);
}

function damageCar(car,arr){
  if(!car||car===cur)return;
  const ud=car.g.userData;
  ud.bulletHits=(ud.bulletHits||0)+1;
  state.shake=Math.max(state.shake,.04);
  addWanted(.35,'SHOT FIRED!','vehicle_shot');
  if(ud.bulletHits>=4){
    explodeCar(car,arr);
  }else{
    message('VEHICLE HIT '+ud.bulletHits+'/4','var(--gold)');
  }
}

function addTracer(origin,end){
  const geo=new THREE.BufferGeometry().setFromPoints([
    origin.clone(),
    new THREE.Vector3(end.x,origin.y,end.z),
  ]);
  const line=new THREE.Line(geo,tracerMat.clone());
  scene.add(line);tracers.push({line,t:0});
}

function addImpact(pos,hit){
  const missed=hit?.kind==='miss';
  const impactRadius=missed ? .16 : .28;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(impactRadius,.025,6,18),
    new THREE.MeshBasicMaterial({color:missed?0xfff2b0:0xffd24a,transparent:true,opacity:.85,depthWrite:false}));
  ring.position.set(pos.x,.08,pos.z);
  ring.rotation.x=Math.PI/2;
  scene.add(ring);impacts.push({ring,t:0});
}

function makeBullet(origin,dir){
  const g=new THREE.Group();
  const slug=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.52,8),bulletMat);
  const core=new THREE.Mesh(new THREE.SphereGeometry(.075,8,6),bulletCoreMat);
  slug.rotation.x=Math.PI/2;
  core.position.z=.28;
  g.add(slug,core);
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
  else if(hit.kind==='car')damageCar(hit.target,hit.arr);
  else addWanted(.25,'SHOT FIRED!','gunfire');
}

export function shootWeapon(){
  if(!isWeaponHeld()||state.time-lastShot<.18)return;
  if(state.ammo<=0){message('OUT OF AMMO','var(--pink)');return;}
  lastShot=state.time;state.ammo--;
  player.heading=cameraRig.yaw;
  player.g.rotation.y=cameraRig.yaw;
  posePlayerWithGun();
  player.g.updateWorldMatrix(true,true);
  const{origin,dir}=aimRay();
  makeBullet(origin,dir);
  addTracer(origin,origin.clone().addScaledVector(dir,3.2));
  reportPoliceCrime('gunfire',1);
  blip([1200],.035,'square',.12);
  state.crosshairKick=1;
  state.shake=Math.max(state.shake,.08);
  gunKick=.09;
}

export function updateWeapons(dt){
  heldGun.visible=isWeaponHeld();
  if(heldGun.visible){
    posePlayerWithGun();
    gunKick=Math.max(0,gunKick-dt*.55);
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

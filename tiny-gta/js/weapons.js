import * as THREE from 'three';
import {state,refs} from './state.js';
import {scene,camera} from './engine.js';
import {rand,irand,nodeX} from './constants.js';
import {blip,thud} from './audio.js';
import {message} from './hud.js';
import {addWanted} from './physics.js';
import {playerPos,cameraRig,idleCars,cur} from './player.js';
import {peds} from './pedestrians.js';
import {traffic,spawnTraffic} from './traffic.js';
import {cops} from './police.js';
import {spawnDrop} from './missions.js';

const gunGroup=new THREE.Group();
const gunMat=new THREE.MeshStandardMaterial({color:0x15121a,roughness:.45,metalness:.8});
const glowMat=new THREE.MeshBasicMaterial({color:0xffd24a,transparent:true,opacity:.25});
{
  const body=new THREE.Mesh(new THREE.BoxGeometry(.78,.18,.22),gunMat);
  const grip=new THREE.Mesh(new THREE.BoxGeometry(.18,.42,.18),gunMat);
  const barrel=new THREE.Mesh(new THREE.BoxGeometry(.48,.1,.12),gunMat);
  const glow=new THREE.Mesh(new THREE.TorusGeometry(.9,.045,8,28),glowMat);
  body.position.y=.62;grip.position.set(-.18,.38,0);grip.rotation.z=.35;
  barrel.position.set(.54,.64,0);glow.rotation.x=Math.PI/2;glow.position.y=.08;
  gunGroup.add(body,grip,barrel,glow);
  gunGroup.position.set(nodeX(4)+12,.05,nodeX(4)+12);
  scene.add(gunGroup);
}

const tracerMat=new THREE.LineBasicMaterial({color:0xfff2b0,transparent:true,opacity:.9});
const explosions=[];
const tracers=[];
const impacts=[];
const MAX_AMMO=90;
let lastShot=-99;

export function isWeaponHeld(){
  return !!(state.hasGun&&state.weaponHeld&&state.mode==='foot');
}

export function canPickWeapon(){
  if(state.hasGun||state.mode!=='foot')return false;
  return playerPos().distanceTo(gunGroup.position)<3;
}

export function pickupWeapon(){
  if(!canPickWeapon())return;
  state.hasGun=true;state.weaponHeld=true;state.ammo=MAX_AMMO;state.maxAmmo=MAX_AMMO;
  scene.remove(gunGroup);
  message('WEAPON PICKED UP - LEFT CLICK TO SHOOT','var(--gold)');
  blip([440,660,880],.07,'square',.14);
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
  const right=new THREE.Vector3(Math.cos(cameraRig.yaw),0,-Math.sin(cameraRig.yaw));
  const muzzle=playerPos().clone().addScaledVector(right,.46);
  muzzle.y+=1.05;
  let aimPoint;
  if(Math.abs(camDir.y)>.001){
    const t=(1.05-camera.position.y)/camDir.y;
    if(t>3&&t<range*2)aimPoint=camera.position.clone().addScaledVector(camDir,t);
  }
  if(!aimPoint)aimPoint=camera.position.clone().addScaledVector(camDir,range);
  const dir=aimPoint.sub(muzzle);
  dir.y=0;
  if(dir.lengthSq()<.0001)dir.set(Math.sin(cameraRig.yaw),0,Math.cos(cameraRig.yaw));
  dir.normalize();
  return{origin:muzzle,dir};
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
  p.vel.copy(dir).multiplyScalar(9).add(new THREE.Vector3(rand(-1.5,1.5),rand(5,7),rand(-1.5,1.5)));
  spawnDrop(p.g.position.x,p.g.position.z,irand(15,55));
  addWanted(1,'SHOT FIRED!');
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
  addWanted(1.5,'VEHICLE DESTROYED!');
  state.shake=.7;
  if(arr===traffic)setTimeout(()=>spawnTraffic(),900);
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

export function shootWeapon(){
  if(!isWeaponHeld()||state.time-lastShot<.18)return;
  if(state.ammo<=0){message('OUT OF AMMO','var(--pink)');return;}
  lastShot=state.time;state.ammo--;
  const{origin,dir}=aimRay();
  const best=findWeaponHit(origin,dir);

  const end=origin.clone().addScaledVector(dir,best.d);
  addTracer(origin,end);
  addImpact(end,best);
  blip([1200],.035,'square',.12);
  state.crosshairKick=1;
  state.shake=Math.max(state.shake,.08);
  player.g.rotation.y=Math.atan2(dir.x,dir.z);
  if(best.kind==='ped')killPed(best.target,dir);
  else if(best.kind==='car')explodeCar(best.target,best.arr);
  else addWanted(.25,'SHOT FIRED!');
}

export function updateWeapons(dt){
  if(isWeaponHeld()&&!state.paused&&!state.dlgActive&&!state.orientationBlocked){
    const{origin,dir}=aimRay();
    state.crosshairTarget=findWeaponHit(origin,dir,48).kind!=='miss';
  }else state.crosshairTarget=false;
  if(!state.hasGun){
    gunGroup.rotation.y+=dt*1.8;
    gunGroup.position.y=.05+Math.sin(state.time*3)*.08;
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

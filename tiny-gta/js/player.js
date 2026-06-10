import * as THREE from 'three';
import {clamp,rand,nodeX} from './constants.js';
import {state,input,carNames,carColors,refs} from './state.js';
import {scene,camera} from './engine.js';
import {makeCar,makePed,spinWheels} from './entities.js?v=12';
import * as Entities from './entities.js?v=12';
import {thud,blip} from './audio.js';
import {radioOn,radioOff} from './radio.js';
import {collideStatics,addWanted} from './physics.js';
import {message,bigText,hideBig,hudCar,hudSpeedo} from './hud.js';

export const player={g:makePed(0x19e3ff),heading:0,bob:0};
player.g.position.set(nodeX(4)+9,0,nodeX(4)+9);
document.getElementById('buildver')?.insertAdjacentText('beforeend',' ◆ CAM-R');
export const cameraRig={
  yaw:player.heading,
  pitch:.34,
  sensitivity:.0024,
  invertY:false,
  shoulder:.28,
  touchLookIdle:0,
};

export const playerCar={g:makeCar(0xff2e88,false),heading:Math.PI/2,speed:0,name:'PINK BANSHEE',police:false};
playerCar.g.position.set(nodeX(4)+3.5,0,nodeX(4)+16);
playerCar.g.rotation.y=playerCar.heading;
export const idleCars=[playerCar];
export let cur=null;

export function playerPos(){return state.mode==='car'?cur.g.position:player.g.position;}

export function nearestCar(maxD){
  let best=null,bd=maxD,kind=null;
  const pp=player.g.position;
  const traffic=refs.traffic||[];
  const cops=refs.cops||[];
  for(const c of idleCars){
    const d=pp.distanceTo(c.g.position);if(d<bd){bd=d;best=c;kind='idle';}
  }
  for(const t of traffic){
    const d=pp.distanceTo(t.g.position);if(d<bd){bd=d;best=t;kind='traffic';}
  }
  for(const c of cops){
    const d=pp.distanceTo(c.g.position);if(d<bd){bd=d;best=c;kind='cop';}
  }
  return best?{c:best,kind}:null;
}

export function enterCar(){
  const f=nearestCar(3.6);if(!f)return;
  const{c,kind}=f;
  const traffic=refs.traffic||[];
  const cops=refs.cops||[];
  if(kind==='idle'){idleCars.splice(idleCars.indexOf(c),1);cur=c;}
  else if(kind==='traffic'){
    traffic.splice(traffic.indexOf(c),1);
    const p=refs.trafficPos({...c,t:c.t});
    cur={g:c.g,heading:Math.atan2(p.dx,p.dz),speed:0,name:c.name,police:false};
    addWanted(1,'STOLEN CAR!','vehicle_theft');refs.spawnTraffic?.();
  }else{
    cops.splice(cops.indexOf(c),1);
    cur={g:c.g,heading:c.heading,speed:0,name:'CRUISER 47',police:true};
    addWanted(2,'STOLEN POLICE CAR!','police_vehicle_theft');
  }
  state.mode='car';state.weaponHeld=false;player.g.visible=false;
  hudCar.textContent=cur.name;hudSpeedo.style.display='block';
  blip([330,440],0.07,'triangle',.12);
  radioOn();
}

export function exitCar(){
  cur.speed=0;
  const right=new THREE.Vector3(Math.cos(cur.heading),0,-Math.sin(cur.heading));
  player.g.position.copy(cur.g.position).addScaledVector(right,-2.2);
  collideStatics(player.g.position,.5);
  player.g.position.y=0;player.g.visible=true;player.heading=cur.heading;
  idleCars.push(cur);cur=null;state.mode='foot';state.weaponHeld=!!state.hasGun;hudSpeedo.style.display='none';
  radioOff();
}

export function startCut(text,col,fn){
  state.mode='cut';state.cutT=2.6;state.cutFn=fn;bigText(text,col);
  if(cur)cur.speed=0;
}

export function getBusted(){
  startCut('BUSTED','#3e7bff',()=>{
    state.money=Math.floor(state.money*.85);state.wanted=0;state.bustT=0;
    const cops=refs.cops||[];
    for(const c of cops)scene.remove(c.g);cops.length=0;
    if(cur){idleCars.push(cur);cur=null;}
    player.g.visible=true;player.g.position.set(nodeX(2)+4,0,nodeX(2)+4);
    refs.confiscateWeapon?.();
    state.mode='foot';hudSpeedo.style.display='none';radioOff();
    message('YOU WERE RELEASED. BEHAVE.','var(--cyan)');
  });
}

export function getWasted(){
  startCut('WASTED','#ff2e88',()=>{
    state.money=Math.floor(state.money*.8);state.wanted=0;state.bustT=0;
    const cops=refs.cops||[];
    for(const c of cops)scene.remove(c.g);cops.length=0;
    player.g.visible=true;player.g.position.set(nodeX(6)+4,0,nodeX(6)+4);
    state.weaponHeld=!!state.hasGun;
    state.mode='foot';hudSpeedo.style.display='none';radioOff();
    message('DISCHARGED FROM HOSPITAL. WATCH IT.','var(--cyan)');
  });
}

export function updateCar(dt){
  const th=input.moveY;
  const st=input.moveX;
  const hb=input.brake;
  const MAX=32;
  if(th>0)cur.speed+=16*dt*Math.max(.15,1-cur.speed/MAX);
  else if(th<0)cur.speed-=(cur.speed>0?30:9)*dt;
  cur.speed*=Math.exp(-(hb?2.2:.45)*dt);
  cur.speed=clamp(cur.speed,-11,MAX);
  cur.heading+=st*2.0*dt*clamp(cur.speed/11,-1,1)*(hb?1.55:1);
  const p=cur.g.position;
  p.x+=Math.sin(cur.heading)*cur.speed*dt;
  p.z+=Math.cos(cur.heading)*cur.speed*dt;
  if(collideStatics(p,1.5)){
    if(Math.abs(cur.speed)>6){thud(Math.abs(cur.speed));state.shake=Math.min(.6,Math.abs(cur.speed)*.02);}
    cur.speed*=-.25;
  }
  cur.g.rotation.y=cur.heading;
  cur.g.rotation.z=THREE.MathUtils.lerp(cur.g.rotation.z,-st*clamp(cur.speed/MAX,0,1)*.06,10*dt);
  spinWheels(cur.g,cur.speed,dt,st);
  const tail=cur.g.userData.tailM;
  if(tail)tail.color.setHex(cur.speed<-.5?0xffd6d6:(th<0||hb)?0xff4444:0xa01515);
}

export function updateFoot(dt){
  if(state.dlgActive)return;
  const f=input.moveY;
  const side=input.moveX;
  let walkAmount=0;
  if(f||side){
    const camF=new THREE.Vector3(Math.sin(cameraRig.yaw),0,Math.cos(cameraRig.yaw));
    const camR=new THREE.Vector3(Math.cos(cameraRig.yaw),0,-Math.sin(cameraRig.yaw));
    const analog=Math.min(1,Math.hypot(f,side));
    walkAmount=analog;
    const mv=new THREE.Vector3().addScaledVector(camF,f).addScaledVector(camR,side).normalize();
    const spd=(input.run?9:5.2)*analog;
    player.g.position.addScaledVector(mv,spd*dt);
    player.heading=Math.atan2(mv.x,mv.z);
    player.bob+=dt*spd*1.8;
    player.g.position.y=Math.abs(Math.sin(player.bob))*.09;
  }else player.g.position.y*=.8;
  Entities.animatePed?.(player.g,player.bob,walkAmount);
  collideStatics(player.g.position,.5);
  const armed=state.hasGun&&state.weaponHeld&&state.mode==='foot';
  if(armed){
    player.heading=cameraRig.yaw;
    player.g.rotation.y=cameraRig.yaw;
  }else player.g.rotation.y=player.heading;
}

export function updateCamera(dt){
  let tgt,heading,dist,baseH;
  if(state.mode==='car'||state.mode==='cut'&&cur){
    tgt=cur?cur.g.position:player.g.position;heading=cur?cur.heading:player.heading;dist=9.6;baseH=1.75;
  }else{tgt=player.g.position;heading=player.heading;dist=6.2;baseH=1.25;}
  if(input.lookActive&&!state.dlgActive&&!state.paused&&!state.orientationBlocked){
    // Positive lookX means "turn right". In this engine yaw increases to the LEFT
    // (forward = (sin yaw, cos yaw); keyboard A is moveX=+1; mouse-right does yaw-=),
    // so turning right requires subtracting, same as the pointer-lock mouse path.
    cameraRig.yaw-=input.lookX*dt;
    cameraRig.pitch+=(cameraRig.invertY?-1:1)*input.lookY*dt;
    cameraRig.touchLookIdle=0;
  }else cameraRig.touchLookIdle+=dt;
  const canRecentre=!document.pointerLockElement&&!input.touchActive;
  if(canRecentre){
    const diff=THREE.MathUtils.euclideanModulo(heading-cameraRig.yaw+Math.PI,Math.PI*2)-Math.PI;
    cameraRig.yaw+=diff*Math.min(1,dt*(state.mode==='car'?1.6:.7));
  }
  cameraRig.pitch=clamp(cameraRig.pitch,.18,.82);
  const forward=new THREE.Vector3(Math.sin(cameraRig.yaw),0,Math.cos(cameraRig.yaw));
  const right=new THREE.Vector3(Math.cos(cameraRig.yaw),0,-Math.sin(cameraRig.yaw));
  const flat=dist*Math.cos(cameraRig.pitch);
  const height=baseH+dist*Math.sin(cameraRig.pitch);
  const shoulder=(state.mode==='car'?0:cameraRig.shoulder);
  const focus=new THREE.Vector3(tgt.x,tgt.y+1.45,tgt.z).addScaledVector(right,shoulder);
  const want=new THREE.Vector3(tgt.x,tgt.y+height,tgt.z)
    .addScaledVector(forward,-flat)
    .addScaledVector(right,shoulder);
  const k=1-Math.exp(-4.5*dt);
  camera.position.lerp(want,k);
  const tf=state.mode==='car'?62+Math.abs(cur.speed)/32*13:62;
  camera.fov+=(tf-camera.fov)*Math.min(1,5*dt);
  camera.updateProjectionMatrix();
  if(state.shake>0){
    camera.position.x+=rand(-1,1)*state.shake;
    camera.position.y+=rand(-1,1)*state.shake*.5;
    state.shake=Math.max(0,state.shake-dt*1.6);
  }
  camera.lookAt(focus.x+forward.x*2.4,focus.y,focus.z+forward.z*2.4);
}

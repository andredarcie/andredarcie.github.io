import * as THREE from 'three';
import {clamp,rand,nodeX,WATER,SWIM_BOUND,RURAL_X1,RURAL_HALF,groundHeight} from './constants.js';
import {state,input,carNames,carColors,refs} from './state.js';
import {scene,camera} from './engine.js';
import {makeCar,makePed,makePlane,spinWheels,dentCar} from './entities.js?v=22';
import * as Entities from './entities.js?v=22';
import {thud,blip} from './audio.js';
import {radioOn,radioOff,radioRandom} from './radio.js';
import {collideStatics,addWanted} from './physics.js';
import {message,bigText,hideBig,hudCar} from './hud.js';

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

// Avião estacionado na praia oeste; a faixa de areia é a pista de decolagem
export function spawnPlane(){
  const pl={g:makePlane(),heading:Math.PI,speed:0,name:'SKY DUSTER',police:false,
    plane:true,vy:0};
  pl.g.position.set(-202,0,40);pl.g.rotation.y=pl.heading;
  idleCars.push(pl);
  return pl;
}
spawnPlane();

export function playerPos(){return state.mode==='car'?cur.g.position:player.g.position;}

const _dentPt=new THREE.Vector3(),_dentDir=new THREE.Vector3();

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

// Pose de motorista: pernas escondidas embaixo do painel, mãos no volante
function setDrivePose(on){
  const l=player.g.userData.limbs;if(!l)return;
  l.leftLeg.visible=l.rightLeg.visible=!on;
  if(on){
    l.leftArm.rotation.set(-.9,0,.1);
    l.rightArm.rotation.set(-.9,0,-.1);
    l.leftForearm?.rotation.set(-.3,0,0);
    l.rightForearm?.rotation.set(-.3,0,0);
  }else{
    for(const k of['leftArm','rightArm','leftForearm','rightForearm',
      'leftLeg','rightLeg','leftCalf','rightCalf'])l[k]?.rotation.set(0,0,0);
  }
}

// Tira o jogador de dentro do veículo (reparenta na cena e desfaz a pose)
function unseatPlayer(){
  scene.add(player.g);
  player.g.rotation.set(0,player.heading,0);
  setDrivePose(false);
}

// Entrar no carro é uma sequência: anda até a porta, ela abre, senta, fecha
let entering=null;
export function enterCar(){
  if(entering)return;
  const f=nearestCar(3.6);if(!f)return;
  entering={f,door:f.c.g.userData.door||null,t:0,phase:0};
  state.controlsLocked=true;
  if(f.kind==='traffic')f.c.brakeT=1.8; // carro do tráfego espera parado
  blip([220],.06,'square',.1); // clique da maçaneta
}

export function cancelEntering(){
  if(entering){if(entering.door)entering.door.rotation.y=0;entering=null;}
  if(exiting){exiting.door.rotation.y=0;exiting=null;}
  state.controlsLocked=false;
}

function updateEntering(dt){
  const e=entering;e.t+=dt;
  const car=e.f.c;
  if(e.phase===0){ // porta abrindo enquanto o jogador chega nela
    const k=Math.min(1,e.t/.4);
    if(e.door)e.door.rotation.y=1.15*k;
    const h=car.heading??car.g.rotation.y;
    const wx=car.g.position.x+(-1.7)*Math.cos(h)+.5*Math.sin(h);
    const wz=car.g.position.z-(-1.7)*Math.sin(h)+.5*Math.cos(h);
    player.g.position.x+=(wx-player.g.position.x)*Math.min(1,10*dt);
    player.g.position.z+=(wz-player.g.position.z)*Math.min(1,10*dt);
    player.bob+=dt*8;Entities.animatePed?.(player.g,player.bob,.7);
    if(e.t>=.45){completeEnter(e.f);e.phase=1;e.t=0;}
  }else{ // sentado: porta fechando
    const k=Math.min(1,e.t/.35);
    if(e.door)e.door.rotation.y=1.15*(1-k);
    if(cur)cur.speed=0;
    if(k>=1){
      if(e.door)e.door.rotation.y=0;
      blip([180],.05,'square',.12); // porta bate
      entering=null;state.controlsLocked=false;
    }
  }
}

function completeEnter(f){
  const{c,kind}=f;
  const traffic=refs.traffic||[];
  const cops=refs.cops||[];
  if(kind==='idle'){idleCars.splice(idleCars.indexOf(c),1);cur=c;}
  else if(kind==='traffic'){
    traffic.splice(traffic.indexOf(c),1);
    const p=refs.trafficPos({...c,t:c.t});
    cur={g:c.g,heading:Math.atan2(p.dx,p.dz),speed:0,name:c.name,police:false};
    refs.ejectDriver?.(c.g.position.x,c.g.position.z,cur.heading);
    addWanted(1,'STOLEN CAR!','vehicle_theft');refs.spawnTraffic?.();
  }else{
    cops.splice(cops.indexOf(c),1);
    cur={g:c.g,heading:c.heading,speed:0,name:'CRUISER 47',police:true};
    addWanted(2,'STOLEN POLICE CAR!','police_vehicle_theft');
  }
  state.mode='car';state.weaponHeld=false;
  // jogador sentado no banco do motorista, visível pelo vidro
  cur.g.add(player.g);
  if(cur.plane)player.g.position.set(0,-.45,.5);
  else player.g.position.set(-.46,-.06,-.08); // sentado no banco do motorista
  player.g.rotation.set(0,0,0);
  setDrivePose(true);
  hudCar.textContent=cur.name;hudCar.style.display='block';
  blip([330,440],0.07,'triangle',.12);
  radioRandom();radioOn();
}

// Sair também abre e fecha a porta (avião não tem porta: sai direto)
let exiting=null;
export function exitCar(){
  if(exiting||entering)return;
  if(cur.plane&&cur.g.position.y>groundHeight(cur.g.position.x,cur.g.position.z)+1.2){
    message('LAND BEFORE BAILING OUT!','var(--gold)');return;
  }
  cur.speed=0;
  const door=cur.g.userData.door||null;
  if(!door){completeExit();return;}
  exiting={t:0,phase:0,door};
  state.controlsLocked=true;
  blip([220],.06,'square',.1); // clique da maçaneta
}

function completeExit(){
  player.heading=cur.heading;
  unseatPlayer();
  const right=new THREE.Vector3(Math.cos(cur.heading),0,-Math.sin(cur.heading));
  player.g.position.copy(cur.g.position).addScaledVector(right,-2.6);
  collideStatics(player.g.position,.5,SWIM_BOUND);
  player.g.position.y=groundHeight(player.g.position.x,player.g.position.z);
  player.g.visible=true;
  // veículo abandonado afundando some no mar; os outros viram veículo parado
  if(cur.sinkT){scene.remove(cur.g);if(cur.plane)spawnPlane();}
  else idleCars.push(cur);
  cur=null;state.mode='foot';state.weaponHeld=!!state.hasGun;hudCar.style.display='none';
  radioOff();
}

function updateExiting(dt){
  const e=exiting;e.t+=dt;
  if(e.phase===0){ // porta abrindo, ainda sentado
    e.door.rotation.y=1.15*Math.min(1,e.t/.35);
    if(cur)cur.speed=0;
    if(e.t>=.4){completeExit();e.phase=1;e.t=0;}
  }else{ // já fora: porta fechando
    e.door.rotation.y=1.15*(1-Math.min(1,e.t/.35));
    if(e.t>=.4){
      e.door.rotation.y=0;
      blip([180],.05,'square',.12); // porta bate
      exiting=null;state.controlsLocked=false;
    }
  }
}

export const inWater=p=>{
  if(Math.max(Math.abs(p.x),Math.abs(p.z))<=WATER)return false;
  // península rural a leste é terra firme
  return !(p.x>WATER&&p.x<=RURAL_X1&&Math.abs(p.z)<=RURAL_HALF);
};

export function startCut(text,col,fn){
  state.mode='cut';state.cutT=2.6;state.cutFn=fn;bigText(text,col);
  if(cur)cur.speed=0;
}

export function getBusted(){
  cancelEntering();
  startCut('BUSTED','#3e7bff',()=>{
    state.money=Math.floor(state.money*.85);state.wanted=0;state.bustT=0;
    const cops=refs.cops||[];
    for(const c of cops)scene.remove(c.g);cops.length=0;
    if(cur){idleCars.push(cur);cur=null;}
    unseatPlayer();
    player.g.visible=true;player.g.position.set(nodeX(2)+4,0,nodeX(2)+4);
    refs.confiscateWeapon?.();
    state.mode='foot';hudCar.style.display='none';radioOff();
    message('YOU WERE RELEASED. BEHAVE.','var(--cyan)');
  });
}

export function getWasted(){
  cancelEntering();
  startCut('WASTED','#ff2e88',()=>{
    state.money=Math.floor(state.money*.8);state.wanted=0;state.bustT=0;
    const cops=refs.cops||[];
    for(const c of cops)scene.remove(c.g);cops.length=0;
    unseatPlayer();
    player.g.visible=true;player.g.position.set(nodeX(6)+4,0,nodeX(6)+4);
    state.weaponHeld=!!state.hasGun;
    state.mode='foot';hudCar.style.display='none';radioOff();
    message('DISCHARGED FROM HOSPITAL. WATCH IT.','var(--cyan)');
  });
}

const PMAX=55,VTO=22,PCEIL=130; // avião: velocidade máx, decolagem, teto

function wreckPlane(){
  thud(20);state.shake=.8;
  scene.remove(cur.g);
  spawnPlane();
  getWasted();
}

function updatePlane(dt){
  const c=cur,p=c.g.position;
  const prop=c.g.userData.prop;
  if(prop)prop.rotation.z+=(6+c.speed)*dt*4;
  // amerissagem: tocou a água = afunda, jogador sai nadando
  if(inWater(p)&&p.y<=.05){
    c.sinkT=(c.sinkT||0)+dt;
    if(c.sinkT<dt*1.5){message('YOUR PLANE IS SINKING!','var(--pink)');thud(8);}
    c.speed*=Math.exp(-2.4*dt);
    p.x+=Math.sin(c.heading)*c.speed*dt;
    p.z+=Math.cos(c.heading)*c.speed*dt;
    p.y=-Math.min(2.6,c.sinkT);
    c.g.rotation.x=Math.min(.22,c.sinkT*.1);
    if(c.sinkT>2.1){
      scene.remove(c.g);
      player.heading=c.heading;unseatPlayer();
      player.g.position.set(p.x,0,p.z);
      player.g.visible=true;
      cur=null;state.mode='foot';state.weaponHeld=!!state.hasGun;
      hudCar.style.display='none';radioOff();
      spawnPlane();
      message('SWIM BACK TO SHORE!','var(--cyan)');
    }
    return;
  }
  const th=input.moveY,st=input.moveX,hb=input.brake;
  const gh=groundHeight(p.x,p.z);
  const onGround=p.y<=gh+.06;
  // empuxo e arrasto
  if(th>0)c.speed+=(onGround?16:9)*dt*Math.max(.2,1-c.speed/PMAX);
  else if(th<0&&onGround)c.speed-=24*dt;
  // arrasto de solo baixo: a velocidade de equilíbrio fica BEM acima da de decolagem
  c.speed*=Math.exp(-(onGround?(hb?2.2:.12):.05)*dt);
  c.speed=clamp(c.speed,onGround?-6:0,PMAX);
  // guinada: taxi como carro; no ar, curva inclinada
  const turn=onGround?1.6*clamp(c.speed/11,-1,1):1.05*clamp(c.speed/32,0,1.15);
  c.heading+=st*turn*dt;
  // sustentação: só acima da velocidade de decolagem; no ar W sobe / S desce;
  // sem velocidade o avião estola e cai
  const lift=clamp((c.speed-VTO)/7,0,1);
  let vyT;
  if(onGround)vyT=th>0&&lift>0?12*lift:0;
  else if(lift>0)vyT=th>0?14*Math.max(lift,.4):th<0?-(7+9*lift):0;
  else vyT=-10; // estol
  c.vy+=(vyT-c.vy)*Math.min(1,2.6*dt);
  p.x+=Math.sin(c.heading)*c.speed*dt;
  p.z+=Math.cos(c.heading)*c.speed*dt;
  p.y+=c.vy*dt;
  if(p.y>PCEIL){p.y=PCEIL;c.vy=Math.min(c.vy,0);}
  // contato com o chão: pouso suave ou acidente (encosta da montanha conta)
  const gh2=groundHeight(p.x,p.z);
  if(p.y<=gh2){
    if(c.vy<-14||(gh2>1&&c.speed>20))return wreckPlane();
    p.y=gh2;c.vy=0;
  }
  // colisões: prédios têm altura, acima deles o céu é livre
  if(p.y<50){
    if(collideStatics(p,2.1,520)){
      if(c.speed>16)return wreckPlane();
      c.speed*=-.25;thud(Math.abs(c.speed)+4);
    }
  }else{p.x=clamp(p.x,-520,520);p.z=clamp(p.z,-520,520);}
  // visual: nariz acompanha a subida/descida, asa inclina na curva
  c.g.rotation.y=c.heading;
  c.g.rotation.x=THREE.MathUtils.lerp(c.g.rotation.x,
    -Math.atan2(c.vy,Math.max(c.speed,10)),Math.min(1,6*dt));
  c.g.rotation.z=THREE.MathUtils.lerp(c.g.rotation.z,
    -st*(onGround?.06:.55)*clamp(c.speed/PMAX,0,1)*1.5,Math.min(1,5*dt));
}

export function updateCar(dt){
  if(entering){if(cur)cur.speed=0;return updateEntering(dt);}
  if(exiting){if(cur)cur.speed=0;return updateExiting(dt);}
  if(cur.plane)return updatePlane(dt);
  // No mar o carro perde tração, afunda aos poucos e o jogador escapa nadando
  if(inWater(cur.g.position)){
    const p=cur.g.position;
    if(!cur.sinkT){cur.sinkT=1e-6;message('YOUR CAR IS SINKING!','var(--pink)');thud(8);}
    cur.sinkT+=dt;
    cur.speed*=Math.exp(-2.4*dt);
    p.x+=Math.sin(cur.heading)*cur.speed*dt;
    p.z+=Math.cos(cur.heading)*cur.speed*dt;
    p.y=-Math.min(2.6,cur.sinkT);
    cur.g.rotation.x=Math.min(.22,cur.sinkT*.1);
    spinWheels(cur.g,cur.speed,dt);
    if(cur.sinkT>2.1){
      scene.remove(cur.g);
      player.heading=cur.heading;unseatPlayer();
      player.g.position.set(p.x,0,p.z);
      player.g.visible=true;
      cur=null;state.mode='foot';state.weaponHeld=!!state.hasGun;
      hudCar.style.display='none';radioOff();
      message('SWIM BACK TO SHORE!','var(--cyan)');
    }
    return;
  }
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
  if(collideStatics(p,1.5,SWIM_BOUND)){
    if(Math.abs(cur.speed)>4){
      // até batida leve já amassa feio; em alta velocidade destrói a frente
      if(Math.abs(cur.speed)>6){thud(Math.abs(cur.speed));state.shake=Math.min(.6,Math.abs(cur.speed)*.02);}
      const fwd=cur.speed>0?1:-1;
      _dentPt.set(p.x+Math.sin(cur.heading)*2.75*fwd,p.y+.8,p.z+Math.cos(cur.heading)*2.75*fwd);
      _dentDir.set(-Math.sin(cur.heading)*fwd,0,-Math.cos(cur.heading)*fwd);
      dentCar(cur.g,_dentPt,_dentDir,Math.min(.32,.18+Math.abs(cur.speed)*.004));
    }
    cur.speed*=-.25;
  }
  cur.g.rotation.y=cur.heading;
  cur.g.rotation.z=THREE.MathUtils.lerp(cur.g.rotation.z,-st*clamp(cur.speed/MAX,0,1)*.06,10*dt);
  // Terreno: o carro acompanha a altura (dá pra subir a montanha) e inclina no morro
  const gh=groundHeight(p.x,p.z);
  p.y+=(gh-p.y)*Math.min(1,8*dt);
  const fx=Math.sin(cur.heading),fz=Math.cos(cur.heading);
  const slope=groundHeight(p.x+fx*1.7,p.z+fz*1.7)-groundHeight(p.x-fx*1.7,p.z-fz*1.7);
  cur.g.rotation.x=THREE.MathUtils.lerp(cur.g.rotation.x,-Math.atan2(slope,3.4),Math.min(1,8*dt));
  spinWheels(cur.g,cur.speed,dt,st);
  const tail=cur.g.userData.tailM;
  if(tail)tail.color.setHex(cur.speed<-.5?0xffd6d6:(th<0||hb)?0xff4444:0xa01515);
}

export function updateFoot(dt){
  if(entering)return updateEntering(dt);
  if(exiting)return updateExiting(dt);
  if(state.dlgActive)return;
  const f=input.moveY;
  const side=input.moveX;
  const swim=inWater(player.g.position);
  let walkAmount=0;
  if(f||side){
    const camF=new THREE.Vector3(Math.sin(cameraRig.yaw),0,Math.cos(cameraRig.yaw));
    const camR=new THREE.Vector3(Math.cos(cameraRig.yaw),0,-Math.sin(cameraRig.yaw));
    const analog=Math.min(1,Math.hypot(f,side));
    walkAmount=analog;
    const mv=new THREE.Vector3().addScaledVector(camF,f).addScaledVector(camR,side).normalize();
    const spd=(swim?3.2:input.run?9:5.2)*analog;
    player.g.position.addScaledVector(mv,spd*dt);
    player.heading=Math.atan2(mv.x,mv.z);
    player.bob+=dt*spd*(swim?1.3:1.8);
  }else if(swim)player.bob+=dt*2.2; // boiando: braçadas leves no lugar
  // Nadando: submerso até o peito; em terra acompanha a altura do terreno (montanha)
  if(swim){
    player.g.position.y=-1.5+Math.sin(player.bob*2)*.06;
    walkAmount=Math.max(walkAmount,.5);
  }else{
    const gh=groundHeight(player.g.position.x,player.g.position.z);
    if(f||side)player.g.position.y=gh+Math.abs(Math.sin(player.bob))*.09;
    else player.g.position.y=gh+(player.g.position.y-gh)*.8;
  }
  Entities.animatePed?.(player.g,player.bob,walkAmount);
  collideStatics(player.g.position,.5,SWIM_BOUND);
  const armed=state.hasGun&&state.weaponHeld&&state.mode==='foot';
  if(armed){
    player.heading=cameraRig.yaw;
    player.g.rotation.y=cameraRig.yaw;
  }else player.g.rotation.y=player.heading;
}

export function updateCamera(dt){
  if(state.cine)return; // em cut-scene a câmera é controlada por story.js
  let tgt,heading,dist,baseH;
  if(state.mode==='car'||state.mode==='cut'&&cur){
    tgt=cur?cur.g.position:player.g.position;heading=cur?cur.heading:player.heading;
    dist=cur?.plane?15.5:11.4;baseH=1.95;
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

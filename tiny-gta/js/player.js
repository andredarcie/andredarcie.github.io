import * as THREE from 'three';
import {clamp,rand,nodeX,WATER,SWIM_BOUND,RURAL_X1,RURAL_HALF,groundHeight} from './constants.js';
import {state,input,carNames,carColors,refs} from './state.js';
import {scene,camera} from './engine.js';
import {makeCar,makePed,makePlane,spinWheels,dentCar} from './entities.js';
import {INT_BOUNDS} from '../assets/models/city/nightclub.js';
import * as Entities from './entities.js';
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

// Pose de motorista: sentado com as coxas pra frente, pés no piso, mãos no volante
function setDrivePose(on){
  const l=player.g.userData.limbs;if(!l)return;
  l.leftLeg.visible=l.rightLeg.visible=true; // pernas sempre visíveis (cabine é oca)
  if(on){
    l.leftLeg.rotation.set(-2.0,0,0);
    l.rightLeg.rotation.set(-2.0,0,0);
    l.leftCalf?.rotation.set(.5,0,0);
    l.rightCalf?.rotation.set(.5,0,0);
    // braços esticados à frente, mãos convergindo até tocar o aro do volante
    l.leftArm.rotation.set(-1.3,0,.42);
    l.rightArm.rotation.set(-1.3,0,-.42);
    l.leftForearm?.rotation.set(-.78,0,0);
    l.rightForearm?.rotation.set(-.78,0,0);
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
  // escolhe a porta do lado em que o jogador está (carro tem duas portas)
  const cg=f.c.g,h=f.c.heading??cg.rotation.y;
  const dx=player.g.position.x-cg.position.x,dz=player.g.position.z-cg.position.z;
  const side=(dx*Math.cos(h)-dz*Math.sin(h))>0?1:-1;
  const doors=cg.userData.doors;
  const door=doors?(side>0?doors[1]:doors[0]):cg.userData.door||null;
  entering={f,door,side,t:0,phase:0};
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
    if(e.door)e.door.rotation.y=(e.door.userData.sign||1)*1.15*k;
    const h=car.heading??car.g.rotation.y;
    const lx=e.side*1.25,lz=.35; // ponto ao lado da porta escolhida
    const wx=car.g.position.x+lx*Math.cos(h)+lz*Math.sin(h);
    const wz=car.g.position.z-lx*Math.sin(h)+lz*Math.cos(h);
    player.g.position.x+=(wx-player.g.position.x)*Math.min(1,10*dt);
    player.g.position.z+=(wz-player.g.position.z)*Math.min(1,10*dt);
    player.bob+=dt*8;Entities.animatePed?.(player.g,player.bob,.7);
    if(e.t>=.45){completeEnter(e.f);e.phase=1;e.t=0;}
  }else{ // sentado: porta fechando
    const k=Math.min(1,e.t/.35);
    if(e.door)e.door.rotation.y=(e.door.userData.sign||1)*1.15*(1-k);
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
  // motorista NPC some do banco (o ejetado/fugitivo é tratado à parte)
  if(c.driver){c.g.remove(c.driver);c.driver=null;}
  state.mode='car';state.weaponHeld=false;
  // jogador sentado no banco do motorista, visível pelo vidro
  cur.g.add(player.g);
  cur.g.userData.driver=player.g; // braços seguem o volante via spinWheels
  if(cur.plane)player.g.position.set(0,-.45,.5);
  else player.g.position.set(-.38,-.52,-.15); // sentado no banco do motorista
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
  const door=cur.g.userData.doors?.[0]||cur.g.userData.door||null; // sai pela porta do motorista
  if(!door){completeExit();return;}
  exiting={t:0,phase:0,door};
  state.controlsLocked=true;
  blip([220],.06,'square',.1); // clique da maçaneta
}

function completeExit(){
  player.heading=cur.heading;
  cur.g.userData.driver=null;
  unseatPlayer();
  const right=new THREE.Vector3(Math.cos(cur.heading),0,-Math.sin(cur.heading));
  player.g.position.copy(cur.g.position).addScaledVector(right,-2.0);
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
    e.door.rotation.y=(e.door.userData.sign||1)*1.15*Math.min(1,e.t/.35);
    if(cur)cur.speed=0;
    if(e.t>=.4){completeExit();e.phase=1;e.t=0;}
  }else{ // já fora: porta fechando
    e.door.rotation.y=(e.door.userData.sign||1)*1.15*(1-Math.min(1,e.t/.35));
    if(e.t>=.4){
      e.door.rotation.y=0;
      blip([180],.05,'square',.12); // porta bate
      exiting=null;state.controlsLocked=false;
    }
  }
}

export const inWater=p=>{
  if(state.inClub)return false; // interior da boate fica fora do mapa, mas é chão seco
  if(Math.max(Math.abs(p.x),Math.abs(p.z))<=WATER)return false;
  // península rural a leste é terra firme
  return !(p.x>WATER&&p.x<=RURAL_X1&&Math.abs(p.z)<=RURAL_HALF);
};

export function startCut(text,col,fn){
  state.mode='cut';state.cutT=2.6;state.cutFn=fn;bigText(text,col);
  if(cur)cur.speed=0;
}

export function getBusted(){
  if(dying)return; // morrendo não é preso
  cancelEntering();
  startCut('BUSTED','#3e7bff',()=>{
    state.onRoof=null;roofFall=null; // delegacia fica no chão, não no telhado
    state.money=Math.floor(state.money*.85);state.wanted=0;state.bustT=0;
    refs.clearCops?.(); // viaturas, policiais a pé, mísseis e tracers
    if(cur){cur.g.userData.driver=null;idleCars.push(cur);cur=null;}
    unseatPlayer();
    player.g.visible=true;player.g.position.set(nodeX(2)+4,0,nodeX(2)+4);
    refs.confiscateWeapon?.();
    state.mode='foot';hudCar.style.display='none';radioOff();
    message('YOU WERE RELEASED. BEHAVE.','var(--cyan)');
  });
}

function wastedCut(){
  startCut('WASTED','#ff2e88',()=>{
    state.onRoof=null;roofFall=null; // hospital fica no chão, não no telhado
    state.money=Math.floor(state.money*.8);state.wanted=0;state.bustT=0;
    refs.clearCops?.(); // viaturas, policiais a pé, mísseis e tracers
    unseatPlayer();
    player.g.visible=true;player.g.position.set(nodeX(6)+4,0,nodeX(6)+4);
    state.weaponHeld=!!state.hasGun;
    state.mode='foot';hudCar.style.display='none';radioOff();
    message('DISCHARGED FROM HOSPITAL. WATCH IT.','var(--cyan)');
  });
}

// Morte a pé: o corpo tomba de costas (rosto pra cima) com poça de sangue,
// como os NPCs; o letreiro WASTED só aparece depois do corpo no chão
let dying=null;
export function getWasted(){
  if(dying)return;
  cancelEntering();
  if(state.mode==='car'||cur)return wastedCut(); // dentro de veículo: corte direto
  dying={t:0,puddle:false};
  state.controlsLocked=true;
  state.weaponHeld=false;
  Entities.animatePed?.(player.g,0,0); // relaxa os membros antes de cair
  thud(10);
}

function updateDying(dt){
  const d=dying;d.t+=dt;
  const k=Math.min(1,d.t/.45);
  // morrendo no telhado o corpo tomba na laje, não no asfalto lá embaixo
  const gh=state.onRoof?state.onRoof.y
    :groundHeight(player.g.position.x,player.g.position.z);
  player.g.rotation.x=-Math.PI/2*k; // mesma pose dos NPCs mortos
  player.g.position.y=gh+.35*k;
  if(k>=1&&!d.puddle){
    d.puddle=true;
    if(!state.onRoof)refs.addBloodPuddle?.(player.g.position.x,player.g.position.z);
  }
  if(d.t>1.5){dying=null;state.controlsLocked=false;wastedCut();}
}

// Queda do telhado: passou da borda do parapeito, despenca sem controle e
// morre no impacto com o chão (queda de prédio mata na hora)
let roofFall=null;
function startRoofFall(){
  roofFall={vy:0,dx:Math.sin(player.heading)*2.4,dz:Math.cos(player.heading)*2.4};
  state.controlsLocked=true;
  state.weaponHeld=false;
}
function updateRoofFall(dt){
  const p=player.g.position;
  roofFall.vy-=30*dt;
  p.x+=roofFall.dx*dt;p.z+=roofFall.dz*dt;p.y+=roofFall.vy*dt;
  collideStatics(p,.5,SWIM_BOUND); // escorrega pela fachada em vez de entrar nela
  player.bob+=dt*14;Entities.animatePed?.(player.g,player.bob,1); // se debate no ar
  const gh=groundHeight(p.x,p.z);
  if(p.y<=gh){
    p.y=gh;roofFall=null;state.controlsLocked=false;
    thud(18);state.shake=.45;
    getWasted();
  }
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
  // voltou pra terra firme: cancela o afundamento, senão o carro some na
  // próxima saída (completeExit remove veículo com sinkT marcado)
  cur.sinkT=0;
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
  if(collideStatics(p,1.3,SWIM_BOUND)){
    if(Math.abs(cur.speed)>4){
      // até batida leve já amassa feio; em alta velocidade destrói a frente
      if(Math.abs(cur.speed)>6){thud(Math.abs(cur.speed));state.shake=Math.min(.6,Math.abs(cur.speed)*.02);}
      const fwd=cur.speed>0?1:-1;
      _dentPt.set(p.x+Math.sin(cur.heading)*2.2*fwd,p.y+.65,p.z+Math.cos(cur.heading)*2.2*fwd);
      _dentDir.set(-Math.sin(cur.heading)*fwd,0,-Math.cos(cur.heading)*fwd);
      dentCar(cur.g,_dentPt,_dentDir,Math.min(.32,.18+Math.abs(cur.speed)*.004));
    }
    cur.speed*=-.25;
  }
  // carros estacionados também são sólidos pro carro dirigido
  for(const c of idleCars){
    if(c.plane)continue;
    const d=p.distanceTo(c.g.position);
    if(d<2.9&&d>.001){
      const push=new THREE.Vector3().subVectors(p,c.g.position).setY(0).normalize();
      p.addScaledVector(push,2.9-d);
      if(Math.abs(cur.speed)>6){
        thud(Math.abs(cur.speed));state.shake=.3;
        const mid=new THREE.Vector3().addVectors(p,c.g.position).multiplyScalar(.5).setY(.6);
        dentCar(cur.g,mid,push,.2);
        dentCar(c.g,mid,push.clone().negate(),.2);
      }
      cur.speed*=.5;
    }
  }
  cur.g.rotation.y=cur.heading;
  cur.g.rotation.z=THREE.MathUtils.lerp(cur.g.rotation.z,-st*clamp(cur.speed/MAX,0,1)*.06,10*dt);
  // Terreno: o carro acompanha a altura (dá pra subir a montanha) e inclina no morro
  const gh=groundHeight(p.x,p.z);
  p.y+=(gh-p.y)*Math.min(1,8*dt);
  const fx=Math.sin(cur.heading),fz=Math.cos(cur.heading);
  const slope=groundHeight(p.x+fx*1.3,p.z+fz*1.3)-groundHeight(p.x-fx*1.3,p.z-fz*1.3);
  cur.g.rotation.x=THREE.MathUtils.lerp(cur.g.rotation.x,-Math.atan2(slope,2.6),Math.min(1,8*dt));
  spinWheels(cur.g,cur.speed,dt,st);
  const tail=cur.g.userData.tailM;
  if(tail)tail.color.setHex(cur.speed<-.5?0xffd6d6:(th<0||hb)?0xff4444:0xa01515);
}

export function updateFoot(dt){
  if(dying)return updateDying(dt);
  if(roofFall)return updateRoofFall(dt);
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
    const r=state.onRoof,p=player.g.position;
    if(r){
      // bloco superior do prédio é sólido pra quem anda na laje (não tem
      // entrada própria no solids[]: lá em cima só este AABB importa)
      const t=r.top;
      if(t&&p.x>t.x0-.5&&p.x<t.x1+.5&&p.z>t.z0-.5&&p.z<t.z1+.5){
        const pl=p.x-t.x0+.5,pr=t.x1+.5-p.x,pt=p.z-t.z0+.5,pb=t.z1+.5-p.z;
        const m=Math.min(pl,pr,pt,pb);
        if(m===pl)p.x=t.x0-.5;else if(m===pr)p.x=t.x1+.5;
        else if(m===pt)p.z=t.z0-.5;else p.z=t.z1+.5;
      }
      // passou da borda do parapeito: vira queda livre (e morte no chão)
      if(p.x<r.x0||p.x>r.x1||p.z<r.z0||p.z>r.z1){
        state.onRoof=null;startRoofFall();return;
      }
    }
    const gh=r?r.y:groundHeight(p.x,p.z);
    if(f||side)p.y=gh+Math.abs(Math.sin(player.bob))*.09;
    else p.y=gh+(p.y-gh)*.8;
  }
  Entities.animatePed?.(player.g,player.bob,walkAmount);
  collideStatics(player.g.position,.5,SWIM_BOUND);
  // carros são sólidos a pé: dois círculos ao longo do eixo cobrem o carro
  // inteiro e empurram o jogador pra fora (também evita nascer dentro de um)
  const ppos=player.g.position;
  for(const arr of[idleCars,refs.traffic||[],refs.cops||[]]){
    for(const c of arr){
      if(c.plane)continue;
      const h=c.heading??c.g.rotation.y;
      const fx=Math.sin(h),fz=Math.cos(h);
      for(const off of[1.1,-1.1]){
        const dx=ppos.x-(c.g.position.x+fx*off),dz=ppos.z-(c.g.position.z+fz*off);
        const d=Math.hypot(dx,dz);
        if(d<1.3&&d>.001){const push=(1.3-d)/d;ppos.x+=dx*push;ppos.z+=dz*push;}
      }
    }
  }
  // armado de pistola ou no rampage da bazuca: vira junto com a câmera
  const armed=refs.isWeaponHeld?.()||false;
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
    // carro: câmera colada e baixa, estilo GTA; avião continua afastado
    dist=cur?.plane?15.5:7.2;baseH=cur?.plane?1.95:1.1;
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
  if(state.inClub){ // na boate a câmera fica presa dentro da sala (não vaza)
    want.x=clamp(want.x,INT_BOUNDS.x0,INT_BOUNDS.x1);
    want.y=Math.min(want.y,INT_BOUNDS.y1);
    want.z=clamp(want.z,INT_BOUNDS.z0,INT_BOUNDS.z1);
  }
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

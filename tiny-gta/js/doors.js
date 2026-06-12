import {state} from './state.js';
import {camera,scene} from './engine.js';
import {player,playerPos,cameraRig} from './player.js';
import {clubNear,clubInteract} from './club.js';
import {buildingDoors} from '../assets/models/city/building.js';
import {makeDoorArrow,arrowBob} from '../assets/models/city/door-arrow.js';
import {makeMoneyDrop} from '../assets/models/missions/money-drop.js';
import {makeGunModel} from '../assets/models/weapons/player-gun.js';
import {grantWeapon} from './weapons.js';
import {irand} from './constants.js';
import {message} from './hud.js';
import {blip} from './audio.js';

// Portas estilo Vice City: sem botão — encostou na porta, atravessou.
// Boate: porta da rua entra, porta de dentro sai. Prédio com porta: a porta
// leva ao telhado; o alçapão de metal lá em cima (com a seta) desce de volta.
// O latch impede o vaivém: depois de atravessar, o jogador nasce dentro do
// gatilho do outro lado e só dispara de novo depois de sair de todos eles.
let latch=true;

// Props que só existem no telhado em que o jogador está: a seta de descida
// sobre o alçapão e o espólio (dinheiro/arma). Um mesh reaproveitado de cada,
// reposicionado a cada subida, em vez de um por prédio (draw calls).
const roofArrow=makeDoorArrow();roofArrow.visible=false;scene.add(roofArrow);
const roofMoney=makeMoneyDrop();roofMoney.visible=false;scene.add(roofMoney);
const roofGun=makeGunModel({pickup:true});roofGun.visible=false;scene.add(roofGun);

function updateRoofProps(){
  const r=state.onRoof;
  roofArrow.visible=!!r;
  roofMoney.visible=!!r&&r.loot==='money';
  roofGun.visible=!!r&&r.loot==='gun';
  if(!r)return;
  roofArrow.position.set(r.topX,r.y+1.05+arrowBob(state.time),r.topZ);
  if(r.loot==='money'){
    roofMoney.position.set(r.lootX,r.y+.55+Math.sin(state.time*3)*.08,r.lootZ);
    roofMoney.rotation.y=state.time*1.5;
  }else if(r.loot==='gun'){
    roofGun.position.set(r.lootX,r.y+.85+Math.sin(state.time*3)*.08,r.lootZ);
    roofGun.rotation.y=state.time*1.5;
  }
}

function collectLoot(r){
  const pp=playerPos();
  if(!r.loot||Math.hypot(pp.x-r.lootX,pp.z-r.lootZ)>1.2)return;
  if(r.loot==='money'){
    const v=irand(60,180);
    state.money+=v;
    message('+$'+v,'var(--gold)');
    blip([660,880],.07,'square',.14);
  }else{
    const had=state.hasGun;
    grantWeapon();
    message(had?'AMMO RESTOCKED':'WEAPON PICKED UP - LEFT CLICK TO SHOOT','var(--gold)');
  }
  r.loot=null; // espólio é único: coletou, acabou
}

function trigger(){
  const pp=playerPos();
  if(state.onRoof){ // no telhado só existe o gatilho do alçapão
    const r=state.onRoof;
    return Math.hypot(pp.x-r.topX,pp.z-r.topZ)<1.4?{kind:'down',d:r}:null;
  }
  if(pp.y>1.5)return null; // caindo/voando não conta como encostar na porta
  if(clubNear())return{kind:'club'};
  if(state.inClub)return null;
  for(const d of buildingDoors)
    if(Math.hypot(pp.x-d.x,pp.z-d.z)<1.5)return{kind:'up',d};
  return null;
}

// teleporte com corte seco, igual ao da boate: câmera já atrás do jogador
function place(x,y,z,h){
  player.g.position.set(x,y,z);
  player.heading=h;player.g.rotation.y=h;
  cameraRig.yaw=h;
  camera.position.set(x-Math.sin(h)*6,y+3,z-Math.cos(h)*6);
}

export function updateDoors(){
  updateRoofProps();
  if(state.mode!=='foot'||state.controlsLocked||state.dlgActive||state.cine){latch=true;return;}
  if(state.onRoof)collectLoot(state.onRoof);
  const t=trigger();
  if(!t){latch=false;return;}
  if(latch)return;
  latch=true;
  if(t.kind==='club'){clubInteract();return;}
  const d=t.d;
  if(t.kind==='up'){ // porta do prédio: sobe pro telhado
    state.onRoof=d;
    place(d.topX,d.y,d.topZ,Math.atan2(d.topX-d.x,d.topZ-d.z));
    blip([330,440],.07,'triangle',.12);
  }else{ // alçapão do telhado: desce pra calçada em frente à porta
    state.onRoof=null;
    place(d.outX,0,d.outZ,Math.atan2(d.outX-d.x,d.outZ-d.z));
    blip([440,330],.07,'triangle',.12);
  }
}

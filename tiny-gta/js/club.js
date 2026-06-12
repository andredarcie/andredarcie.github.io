import {state} from './state.js';
import {camera} from './engine.js';
import {player,playerPos,cameraRig} from './player.js';
import {radioRandom,radioOn,radioOff} from './radio.js';
import {message} from './hud.js';
import {animatePed} from './entities.js';
import {clamp} from './constants.js';
import {CLUB_DOOR,CLUB_SPAWN_OUT,INT_CENTER,INT_DOOR,INT_SPAWN,INT_BOUNDS,clubFx,clubInterior}
  from '../assets/models/city/nightclub.js';
import {arrowBob} from '../assets/models/city/door-arrow.js';

// Boate: encostar na porta a pé já teleporta pra dentro (js/doors.js chama
// clubInteract, sem botão); encostar na porta interna volta pra rua.
// O interior fica num grupo com visible=false quando ninguém está lá.

export function clubNear(){
  if(state.mode!=='foot')return null;
  const pp=playerPos();
  if(!state.inClub&&Math.hypot(pp.x-CLUB_DOOR.x,pp.z-CLUB_DOOR.z)<2.4)return 'enter';
  if(state.inClub&&Math.hypot(pp.x-INT_DOOR.x,pp.z-INT_DOOR.z)<2.4)return 'exit';
  return null;
}

// teleporte com corte seco: jogador, heading e câmera já atrás dele
// (sem o snap, o lerp da câmera atravessaria 600m de mapa voando)
function teleport(x,z,h){
  player.g.position.set(x,0,z);
  player.heading=h;player.g.rotation.y=h;
  cameraRig.yaw=h;
  camera.position.set(x-Math.sin(h)*6,3,z-Math.cos(h)*6);
  if(state.inClub){ // o spawn fica perto da parede: o snap não pode cair fora
    camera.position.x=clamp(camera.position.x,INT_BOUNDS.x0,INT_BOUNDS.x1);
    camera.position.z=clamp(camera.position.z,INT_BOUNDS.z0,INT_BOUNDS.z1);
  }
}

function leaveClubState(){
  state.inClub=false;
  clubInterior.visible=false;
  radioOff();
}

export function clubInteract(){
  const n=clubNear();
  if(!n)return false;
  if(n==='enter'){
    state.inClub=true;
    clubInterior.visible=true;
    teleport(INT_SPAWN.x,INT_SPAWN.z,Math.PI/2);
    radioRandom();radioOn(); // som da casa por conta do sistema de rádio
    message('WELCOME TO THE FLAMINGO','var(--pink)');
  }else{
    leaveClubState();
    teleport(CLUB_SPAWN_OUT.x,CLUB_SPAWN_OUT.z,-Math.PI/2);
  }
  return true;
}

let fxT=0,step=0;
export function updateClub(dt){
  if(!state.inClub)return;
  // WASTED/BUSTED teleportam o jogador pra cidade sem passar pela porta:
  // se ele está longe da sala com a flag ligada, desliga a boate sozinho
  const pp=playerPos();
  if(Math.hypot(pp.x-INT_CENTER.x,pp.z-INT_CENTER.z)>60){leaveClubState();return;}

  clubFx.ball.rotation.y+=dt*1.4;
  if(clubFx.exitArrow)clubFx.exitArrow.position.y=1.7+arrowBob(state.time);
  fxT+=dt;
  if(fxT>=.24){ // pista pisca trocando as cores dos 4 materiais compartilhados
    fxT=0;step++;
    const PAL=[0xff2e88,0x19e3ff,0xffd24a,0x9dff2e];
    clubFx.tileMats.forEach((m,i)=>m.color.setHex(PAL[(i+step)%PAL.length]));
  }
  for(const d of clubFx.dancers){
    d.t+=dt*d.sp;
    animatePed(d.g,d.t,.9);
    d.g.position.y=Math.abs(Math.sin(d.t))*.09;
    d.g.rotation.y=d.face+Math.sin(d.t*.45)*.6;
  }
}

import * as THREE from 'three';
import {N,nodeX,rand,irand,pick,ROAD,clamp} from './constants.js';
import {state,refs,saveBest} from './state.js';
import {scene} from './engine.js';
import {makeCar,makePed,animatePed,shirtColors} from './entities.js';
import {idleCars,cur,playerPos} from './player.js';
import {parks} from './world.js';
import {makeDeliveryMarker} from '../assets/models/missions/delivery-marker.js';
import {message} from './hud.js';
import {blip} from './audio.js';

// Minigame de táxi estilo GTA: um táxi amarelo fica estacionado na rua ao
// lado de uma praça. Entrou nele, começa o expediente: sempre tem um
// passageiro acenando em algum canto da cidade — pare do lado que ele
// embarca (e fica sentado no banco do carona, visível pelo vidro), leve até
// o marcador e ele desce pagando a corrida. Emenda corridas sem limite;
// sair do táxi encerra o expediente.

const TAXI_BUILD=' ◆ TAXI';
document.getElementById('buildver')?.insertAdjacentText('beforeend',TAXI_BUILD);

const standKey=[...parks][0]||'4_4';
const[standI,standJ]=standKey.split('_').map(Number);
const stand={
  x:nodeX(standI)+3.5,
  z:nodeX(standJ)+ROAD/2+10,
  heading:0,
};

export const taxi={g:makeCar(0xffd24a,false),heading:stand.heading,speed:0,
  name:'TAXI CAB',police:false,taxi:true};
{
  // letreiro TAXI no teto (base escura + caixa amarela acesa)
  const base=new THREE.Mesh(new THREE.BoxGeometry(.78,.06,.44),
    new THREE.MeshStandardMaterial({color:0x14161a,roughness:.6}));
  base.position.set(0,1.42,-.2);taxi.g.add(base);
  const sign=new THREE.Mesh(new THREE.BoxGeometry(.7,.24,.36),
    new THREE.MeshBasicMaterial({color:0xfff0a0}));
  sign.position.set(0,1.56,-.2);taxi.g.add(sign);
  // estacionado na rua que margeia a primeira praça sorteada
  taxi.g.position.set(stand.x,0,stand.z);
  taxi.g.rotation.y=taxi.heading;
  idleCars.push(taxi);
}

let phase='off'; // off | pickup (passageiro acenando) | ride (a bordo)
let fare=null;   // {ped,x,z,dropX,dropZ,ring,beacon,pay,tip,rideStart,deadline}
const leaving=[];// passageiros recém-desembarcados indo embora a pé
let wreckT=0;    // táxi destruído: volta pro ponto depois de um tempo
let shiftFares=0,shiftEarnings=0,shiftStartedAt=0;
const taxiHud=document.getElementById('taxihud');

// blip verde no radar: táxi livre, passageiro ou destino da corrida atual
refs.taxiTarget=()=>{
  if(phase==='pickup'&&fare)return{x:fare.x,z:fare.z,kind:'pickup'};
  if(phase==='ride'&&fare)return{x:fare.dropX,z:fare.dropZ,kind:'dropoff'};
  if(phase==='off'&&taxi.g.parent&&cur!==taxi)
    return{x:taxi.g.position.x,z:taxi.g.position.z,kind:'taxi'};
  return null;
};
refs.isTaxiCar=c=>c===taxi;
refs.getTaxiState=()=>({
  phase,
  fares:shiftFares,
  earnings:shiftEarnings,
  shiftTime:phase==='off'?0:Math.max(0,state.time-shiftStartedAt),
  target:refs.taxiTarget(),
  timeLeft:phase==='ride'&&fare?Math.max(0,fare.deadline-state.time):null,
  tip:currentTip(),
  active:phase!=='off',
});

function pickSpot(minD,fx,fz){
  let x,z,tries=0;
  do{x=nodeX(irand(0,N))+rand(-3.5,3.5);z=nodeX(irand(0,N))+rand(-3.5,3.5);tries++;}
  while(Math.hypot(x-fx,z-fz)<minD&&tries<30);
  return[x,z];
}

function setMarker(x,z){
  const{ring,beacon}=makeDeliveryMarker(0x5eff8a);
  ring.rotation.x=Math.PI/2;ring.position.set(x,.4,z);scene.add(ring);
  beacon.position.set(x,30,z);scene.add(beacon);
  fare.ring=ring;fare.beacon=beacon;
}

function clearMarker(){
  if(fare?.ring){scene.remove(fare.ring,fare.beacon);fare.ring=fare.beacon=null;}
}

function currentTip(){
  if(phase!=='ride'||!fare)return 0;
  const span=Math.max(.1,fare.deadline-fare.rideStart);
  return Math.round(fare.tip*clamp((fare.deadline-state.time)/span,0,1));
}

function hideTaxiHud(){
  if(!taxiHud)return;
  taxiHud.classList.remove('show','pickup','ride');
}

function updateTaxiHud(){
  if(!taxiHud)return;
  if(phase==='off'||!fare){hideTaxiHud();return;}
  taxiHud.classList.add('show');
  taxiHud.classList.toggle('pickup',phase==='pickup');
  taxiHud.classList.toggle('ride',phase==='ride');
  if(phase==='pickup'){
    const d=Math.hypot(taxi.g.position.x-fare.x,taxi.g.position.z-fare.z);
    taxiHud.innerHTML=`
      <div class="taxi-label">TAXI</div>
      <div class="taxi-main"><span>PICK</span><b>${Math.ceil(d)}m</b></div>`;
  }else{
    const d=Math.hypot(taxi.g.position.x-fare.dropX,taxi.g.position.z-fare.dropZ);
    const span=Math.max(.1,fare.deadline-fare.rideStart);
    const pct=Math.round(clamp((fare.deadline-state.time)/span,0,1)*100);
    taxiHud.innerHTML=`
      <div class="taxi-label">TAXI</div>
      <div class="taxi-main"><span>DROP</span><b>${Math.ceil(d)}m</b></div>
      <div class="taxi-meter"><i style="width:${pct}%"></i></div>`;
  }
}

function resetTaxiCar(){
  taxi.speed=0;taxi.sinkT=0;taxi.heading=stand.heading;
  taxi.g.userData.bulletHits=0;
  taxi.g.position.set(stand.x,0,stand.z);
  taxi.g.rotation.set(0,taxi.heading,0);
  for(const d of taxi.g.userData.doors||[])d.rotation.y=0;
}

// pose sentada de carona: pernas dobradas, mãos no colo (sem volante)
function seatPassengerPose(g){
  const l=g.userData.limbs;if(!l)return;
  l.leftLeg.rotation.set(-2.0,0,0);l.rightLeg.rotation.set(-2.0,0,0);
  l.leftCalf?.rotation.set(.5,0,0);l.rightCalf?.rotation.set(.5,0,0);
  l.leftArm.rotation.set(-.6,0,.15);l.rightArm.rotation.set(-.6,0,-.15);
  l.leftForearm?.rotation.set(-.5,0,0);l.rightForearm?.rotation.set(-.5,0,0);
}

function unseatPose(g){
  const l=g.userData.limbs;if(!l)return;
  for(const k of['leftArm','rightArm','leftForearm','rightForearm',
    'leftLeg','rightLeg','leftCalf','rightCalf'])l[k]?.rotation.set(0,0,0);
}

function spawnFare(announce=true){
  const pp=playerPos();
  const[x,z]=pickSpot(70,pp.x,pp.z);
  const ped=makePed(pick(shirtColors));
  ped.position.set(x,0,z);
  ped.rotation.y=Math.random()*Math.PI*2;
  fare={ped,x,z,dropX:0,dropZ:0,pay:0,tip:0,rideStart:0,deadline:0};
  setMarker(x,z);
  phase='pickup';
  if(announce)message('PICK UP THE FARE','var(--gold)');
  updateTaxiHud();
}

function boardFare(){
  clearMarker();
  const ped=fare.ped;
  ped.rotation.set(0,0,0);
  seatPassengerPose(ped);
  ped.position.set(.38,-.52,-.15); // banco do carona, ao lado do jogador
  taxi.g.add(ped); // reparenta da cena pro carro: anda junto, visível pelo vidro
  const[dx,dz]=pickSpot(80,fare.x,fare.z);
  fare.dropX=dx;fare.dropZ=dz;
  const dist=Math.hypot(dx-fare.x,dz-fare.z);
  fare.pay=Math.round(28+dist*.42); // corrida longa paga mais
  fare.tip=Math.round(16+dist*.24);
  fare.rideStart=state.time;
  fare.deadline=state.time+clamp(24+dist/10,38,120);
  setMarker(dx,dz);
  phase='ride';
  message(`TAKE THE FARE TO THE MARKER - TIP $${fare.tip}`,'var(--gold)');
  blip([440,550],.07,'sine',.14);
  updateTaxiHud();
}

// desce do carro (fim de corrida ou expediente encerrado) e vai embora a pé
function dropPassenger(){
  const ped=fare.ped;
  taxi.g.remove(ped);
  unseatPose(ped);
  const h=taxi.heading;
  ped.position.copy(taxi.g.position)
    .add(new THREE.Vector3(Math.cos(h)*2,0,-Math.sin(h)*2)); // calçada à direita
  ped.rotation.set(0,h+Math.PI/2,0);
  scene.add(ped);
  leaving.push({g:ped,t:0,bob:0,h:ped.rotation.y});
}

function endShift(text='TAXI SHIFT ENDED',col='var(--cyan)'){
  if(phase==='pickup'&&fare){clearMarker();scene.remove(fare.ped);}
  else if(phase==='ride'&&fare){clearMarker();dropPassenger();}
  fare=null;phase='off';
  hideTaxiHud();
  const summary=shiftFares>0?` - ${shiftFares} FARES / $${shiftEarnings}`:'';
  message(text+summary,col);
}

function startShift(){
  shiftFares=0;shiftEarnings=0;shiftStartedAt=state.time;
  spawnFare(false);
  message('TAXI SHIFT STARTED - PICK UP THE FARE','var(--gold)');
  blip([523,659],.08,'sine',.16);
}

function failRide(){
  clearMarker();
  dropPassenger();
  fare=null;
  message('FARE LOST - TOO SLOW','var(--pink)');
  blip([196,146,110],.1,'sawtooth',.14);
  spawnFare(false);
}

function completeRide(){
  const tip=currentTip();
  const paid=fare.pay+tip;
  clearMarker();
  dropPassenger();
  state.money+=paid;
  state.taxiFares++;
  state.taxiEarnings+=paid;
  shiftFares++;
  shiftEarnings+=paid;
  saveBest();
  message(tip>0?`FARE PAID +$${paid} - SPEED TIP!`:`FARE PAID +$${paid}`,'var(--gold)');
  blip([523,659,784,1047],.09,'sine',.18);
  fare=null;
  spawnFare(false); // expediente contínuo: já tem outro passageiro esperando
}

export function updateTaxi(dt){
  // passageiro desembarcado caminha alguns passos e some
  for(let i=leaving.length-1;i>=0;i--){
    const p=leaving[i];
    p.t+=dt;p.bob+=dt*8;
    p.g.position.x+=Math.sin(p.h)*1.6*dt;
    p.g.position.z+=Math.cos(p.h)*1.6*dt;
    animatePed(p.g,p.bob,.5);
    if(p.t>3.5){scene.remove(p.g);leaving.splice(i,1);}
  }
  // táxi destruído: reaparece no ponto da praça depois de um tempo
  if(!taxi.g.parent&&cur!==taxi){
    wreckT+=dt;
    if(wreckT>20){
      wreckT=0;resetTaxiCar();
      scene.add(taxi.g);
      if(!idleCars.includes(taxi))idleCars.push(taxi);
      message('A NEW TAXI IS WAITING BY THE PLAZA','var(--cyan)');
    }
  }

  const driving=state.mode==='car'&&cur===taxi;
  if(phase==='off'){
    // pegou o táxi: começa o expediente
    if(driving)startShift();
    return;
  }
  if(!driving){endShift();return;} // saiu do táxi (ou WASTED/BUSTED): encerra

  if(phase==='pickup'){
    const ped=fare.ped;
    // acenando pro táxi (braço pra cima balançando)
    const l=ped.userData.limbs;
    if(l){l.rightArm.rotation.x=-2.7;l.rightArm.rotation.z=Math.sin(state.time*7)*.18;}
    const d=Math.hypot(taxi.g.position.x-fare.x,taxi.g.position.z-fare.z);
    if(d<26)ped.rotation.y=Math.atan2(taxi.g.position.x-fare.x,taxi.g.position.z-fare.z);
    if(d<3.4&&Math.abs(taxi.speed)<1.5)boardFare(); // parou do lado: embarca
  }else{ // ride
    if(state.time>=fare.deadline){failRide();return;}
    const d=Math.hypot(taxi.g.position.x-fare.dropX,taxi.g.position.z-fare.dropZ);
    if(d<3.4&&Math.abs(taxi.speed)<1.5){
      completeRide();
    }
  }
  // marcador pulsando (mesmo efeito do marcador de entrega)
  if(fare?.ring){
    fare.ring.rotation.z+=2*dt;
    const sc=1+Math.sin(state.time*4)*.12;fare.ring.scale.set(sc,sc,1);
  }
  updateTaxiHud();
}

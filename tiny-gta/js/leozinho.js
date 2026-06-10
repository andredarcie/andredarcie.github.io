import * as THREE from 'three';
import {nodeX,ROAD,N,GROUND,BEACH,rand,irand,pick,MOUNT_X,groundHeight} from './constants.js';
import {state} from './state.js';
import {scene} from './engine.js';
import {makePed} from './entities.js?v=12';
import {blip} from './audio.js';
import {message} from './hud.js';
import {playerPos} from './player.js';
import {dlgOpen} from './diego.js';

// Leozinho: o malandro que te apresenta pro mundo das drogas. Joga Tibia, faz
// os corres pra bancar a conta, e vive doidão. As missões (infinitas) são
// buscar pacotes em pontos aleatórios do mapa e voltar.
export const LEO_X=nodeX(7)+ROAD/2+3.5;
export const LEO_Z=nodeX(4)+10;

const leoPed=makePed(0x9dff2e,0x1c2f12);
leoPed.position.set(LEO_X,0,LEO_Z);
leoPed.rotation.y=-Math.PI/2; // de frente pra rua

const markerMat=new THREE.MeshBasicMaterial({color:0x9dff2e});
const leoMarker=new THREE.Mesh(new THREE.OctahedronGeometry(.52,0),markerMat);
leoMarker.position.set(LEO_X,3.6,LEO_Z);
scene.add(leoMarker);

export const LEO={state:'available',runs:0,stashX:0,stashZ:0,mesh:null,beacon:null};

// Sorteia onde o pacote vai estar: esquina da cidade, praia, zona rural
// ou (raro) o pico da montanha
function rollStash(){
  const roll=Math.random();
  if(roll<.5){
    const i=irand(0,N-1),j=irand(0,N-1);
    const xa=nodeX(i)+9,xb=nodeX(i+1)-9,za=nodeX(j)+9,zb=nodeX(j+1)-9;
    const[cx,cz]=pick([[xa,za],[xb,za],[xb,zb],[xa,zb]]);
    return{x:cx+rand(-2,2),z:cz+rand(-2,2),where:'on a street corner downtown'};
  }
  if(roll<.75){
    const side=pick(['n','s','w']); // leste virou zona rural
    const depth=rand(GROUND/2+6,GROUND/2+BEACH-8),along=rand(-190,190);
    const[x,z]=side==='n'?[along,-depth]:side==='s'?[along,depth]:[-depth,along];
    return{x,z,where:'buried in the beach sand'};
  }
  if(roll<.92){
    const[x,z]=pick([[250,-42],[222,70],[308,-54],[230,-12],[266,16]]);
    return{x:x+rand(-1.5,1.5),z:z+rand(-1.5,1.5),where:'out in the farms, past the east road'};
  }
  return{x:MOUNT_X+rand(-2,2),z:rand(-2,2),where:'on TOP of the mountain. Yes, the top. Good luck'};
}

function spawnStash(){
  const gh=groundHeight(LEO.stashX,LEO.stashZ);
  const pack=new THREE.Mesh(new THREE.BoxGeometry(.62,.42,.42),
    new THREE.MeshBasicMaterial({color:0xf4f0e2}));
  pack.position.set(LEO.stashX,gh+.75,LEO.stashZ);
  pack.userData.baseY=gh+.75;
  LEO.mesh=pack;scene.add(pack);
  const bm=new THREE.MeshBasicMaterial({color:0x9dff2e,transparent:true,
    opacity:.07,side:THREE.DoubleSide,depthWrite:false});
  LEO.beacon=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,36,8,1,true),bm);
  LEO.beacon.position.set(LEO.stashX,gh+18,LEO.stashZ);
  scene.add(LEO.beacon);
}

const NAME='LEOZINHO';
const tibiaLines=[
  'I only do this for the Tibia gold, bro. My druid needs a new wand and wands do not pay for themselves.',
  'One more run and I finally buy that addon outfit in Tibia. A man needs priorities.',
  'I was a legend in Rookgaard, you know. This street thing is just my side quest for gold.',
  'Real life is just the grind between Tibia sessions. This package? That is 50k gold, easy.',
  'My guild thinks I am rich. They do not know I move packages IRL to fund my level 8 knight.',
];
const highJokes=[
  'I tested the product once and spent three hours watching my own loading screen. Never again. Well. Maybe once.',
  'Last time I got that high I tried to right-click a pigeon to check its loot. It had nothing.',
  'I got so baked yesterday I yelled "exura" at my headache. Did not work. Or DID it?',
  'Rule one: do not get high on supply. I did, and I lost an argument with a lamppost. It had good points.',
  'I once got so stoned I walked into the sea because the minimap said there was loot. There was no loot.',
];
const introLines=()=>[
  {name:NAME,text:'Psst. Over here. They call me Leozinho. Welcome to the other economy: pharmaceutical retail, no receipts.'},
  {name:NAME,text:pick(tibiaLines)},
  {name:NAME,text:pick(highJokes)},
];
const missionLines=where=>[
  {name:NAME,text:`There is a package waiting ${where}. Follow your radar, courier. Do not open it, do not taste it. Go.`},
];
const returnLines=pay=>[
  {name:NAME,text:pick(highJokes)},
  {name:NAME,text:pick(tibiaLines)},
  {name:NAME,text:`Anyway. Here is your cut: $${pay}. Come back, there is ALWAYS another package.`},
];

export function isNearLeo(){
  if(state.mode!=='foot')return false;
  const pp=playerPos();
  return Math.hypot(pp.x-LEO_X,pp.z-LEO_Z)<3.5
    &&LEO.state!=='active'&&LEO.state!=='completing';
}

export function performLeoInteract(){
  if(state.dlgActive||state.mode!=='foot'||!isNearLeo())return false;
  if(LEO.state==='available'){
    const spot=rollStash();
    LEO.stashX=spot.x;LEO.stashZ=spot.z;
    const lines=LEO.runs?[{name:NAME,text:pick(Math.random()<.5?highJokes:tibiaLines)}]:introLines();
    dlgOpen([...lines,...missionLines(spot.where)],()=>{
      spawnStash();
      LEO.state='active';leoMarker.visible=false;
      message('LEOZINHO MISSION: FETCH THE PACKAGE','#9dff2e');
    });
    return true;
  }
  if(LEO.state==='returning'){
    LEO.state='completing';leoMarker.visible=false;
    const pay=LEO.runs===0?500:300;
    dlgOpen(returnLines(pay),()=>{
      state.money+=pay;LEO.runs++;
      LEO.state='available';leoMarker.visible=true;
      message('+$'+pay+' - DELIVERY DONE','var(--gold)');
      blip([523,659,784,1047],.09,'sine',.18);
    });
    return true;
  }
  return false;
}

export function updateLeo(dt){
  if(leoMarker.visible){
    leoMarker.position.y=3.6+Math.sin(state.time*2.8+1.3)*.2;
    leoMarker.rotation.y+=dt*1.9;
    markerMat.color.setHex(LEO.state==='returning'
      ?(Math.floor(state.time*4)%2?0xff2e88:0x9dff2e):0x9dff2e);
  }
  if(LEO.mesh){
    LEO.mesh.rotation.y+=dt*2;
    LEO.mesh.position.y=LEO.mesh.userData.baseY+Math.sin(state.time*3.2)*.18;
  }
  if(state.dlgActive||state.mode==='cut')return;
  if(LEO.state==='active'&&LEO.mesh){
    const pp=playerPos();
    if(Math.hypot(pp.x-LEO.stashX,pp.z-LEO.stashZ)<2.4){
      scene.remove(LEO.mesh,LEO.beacon);LEO.mesh=null;LEO.beacon=null;
      LEO.state='returning';leoMarker.visible=true;
      message('PACKAGE SECURED! Take it back to Leozinho.','var(--pink)');
      blip([660,880,1100],.09,'sine',.18);
    }
  }
}

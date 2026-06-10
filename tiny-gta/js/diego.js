import * as THREE from 'three';
import {nodeX,ROAD,SIDE,BLOCK,rand} from './constants.js';
import {state} from './state.js';
import {scene} from './engine.js';
import {makePed} from './entities.js';
import {blip} from './audio.js';
import {message} from './hud.js';
import {parks} from './world.js';
import {playerPos} from './player.js';

export const DIEGO_X=nodeX(1)+ROAD/2+3.5;
export const DIEGO_Z=nodeX(4);

const diegoPed=makePed(0xffd24a);
diegoPed.position.set(DIEGO_X,0,DIEGO_Z);

const _dMarkerMat=new THREE.MeshBasicMaterial({color:0xffd24a});
const diegoMarker=new THREE.Mesh(new THREE.OctahedronGeometry(.52,0),_dMarkerMat);
diegoMarker.position.set(DIEGO_X,3.6,DIEGO_Z);
scene.add(diegoMarker);

export const DIEGO={
  state:'available',
  secretX:0,secretZ:0,
  secretMesh:null,secretBeacon:null,
  lado:'',vertDir:'',
  proxLock:false,
};

function diegoCalcTarget(){
  const lst=[...parks].map(k=>{
    const[pi,pj]=k.split('_').map(Number);
    return{
      x:nodeX(pi)+ROAD/2+SIDE+(BLOCK-2*SIDE)/2,
      z:nodeX(pj)+ROAD/2+SIDE+(BLOCK-2*SIDE)/2
    };
  }).sort((a,b)=>Math.hypot(b.x-DIEGO_X,b.z-DIEGO_Z)-Math.hypot(a.x-DIEGO_X,a.z-DIEGO_Z));
  const t=lst[0];
  DIEGO.secretX=t.x+rand(-2.5,2.5);
  DIEGO.secretZ=t.z+rand(-2.5,2.5);
  DIEGO.lado=DIEGO.secretX<0?'west':'east';
  DIEGO.vertDir=DIEGO.secretZ<0?'north':'south';
}
diegoCalcTarget();

function diegoSpawnItem(){
  const g=new THREE.OctahedronGeometry(.44,1);
  const m=new THREE.MeshBasicMaterial({color:0xee00ff});
  DIEGO.secretMesh=new THREE.Mesh(g,m);
  DIEGO.secretMesh.position.set(DIEGO.secretX,.9,DIEGO.secretZ);
  scene.add(DIEGO.secretMesh);
  const bm=new THREE.MeshBasicMaterial({color:0xcc00ff,transparent:true,
    opacity:.07,side:THREE.DoubleSide,depthWrite:false});
  DIEGO.secretBeacon=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,36,8,1,true),bm);
  DIEGO.secretBeacon.position.set(DIEGO.secretX,18,DIEGO.secretZ);
  scene.add(DIEGO.secretBeacon);
}

// Dialog system
const dlg={
  el:document.getElementById('dlg'),
  nameEl:document.getElementById('dlg-name'),
  textEl:document.getElementById('dlg-text'),
  promptEl:document.getElementById('dlg-prompt'),
  queue:[],full:'',idx:0,typing:false,timer:null,onDone:null,
};

function dlgOpen(lines,onDone){
  dlg.queue=lines.slice();dlg.onDone=onDone||null;
  dlg.el.style.display='flex';state.dlgActive=true;
  dlgNext();
}
function dlgNext(){
  if(!dlg.queue.length){dlgClose();dlg.onDone&&dlg.onDone();return;}
  const line=dlg.queue.shift();
  dlg.nameEl.textContent=line.name||'DIEGO PENHA';
  dlg.full=line.text;dlg.idx=0;
  dlg.textEl.textContent='';
  dlg.promptEl.classList.remove('show');
  dlg.typing=true;dlgTick();
}
function dlgTick(){
  if(!dlg.typing)return;
  if(dlg.idx<dlg.full.length){
    dlg.idx++;dlg.textEl.textContent=dlg.full.slice(0,dlg.idx);
    dlg.timer=setTimeout(dlgTick,23);
  }else{dlg.typing=false;dlg.promptEl.classList.add('show');}
}
export function dlgPress(){
  if(!state.dlgActive)return;
  if(dlg.typing){
    clearTimeout(dlg.timer);dlg.typing=false;
    dlg.textEl.textContent=dlg.full;
    dlg.promptEl.classList.add('show');
  }else dlgNext();
}
function dlgClose(){clearTimeout(dlg.timer);dlg.el.style.display='none';state.dlgActive=false;}

function diegoMissionLines(){
  const opp=DIEGO.lado==='west'?'east':'west';
  return[
    {text:'Diego Penha. I am not the police. I am worse. I have a job for you.'},
    {text:'There is a flash drive hidden in this city. Names, kickbacks, the whole package. An informant died of a "heart attack" while telling me. Age 34. Marathon runner.'},
    {text:`Clue one: ${DIEGO.lado} side. The owner lives on the ${opp}. Paranoid people hide things opposite where they sleep.`},
    {text:`Clue two: head ${DIEGO.vertDir}, near the green. They love meetings in parks. They think trees do not testify.`},
    {text:'Do not open it. Do not read it. What you do not know keeps you alive. Go.'},
  ];
}
function diegoReturnLines(){
  return[
    {text:'You found it. I did not expect that. This flash drive will ruin a lot of sleep.'},
    {text:'You earned my respect. Around here, it is the only currency they still cannot skim.'},
  ];
}

function diegoShowMissionPass(){
  const el=document.getElementById('missionpass');
  el.style.display='flex';
  setTimeout(()=>document.getElementById('mp-bar-fill').style.width='78%',60);
  blip([392,523,659,784,1047,1319],.10,'sine',.20);
  setTimeout(()=>{
    el.style.display='none';
    document.getElementById('mp-bar-fill').style.width='0';
    DIEGO.state='done';diegoMarker.visible=false;
  },5600);
}

export function isNearDiego(){
  if(state.mode!=='foot')return false;
  const pp=playerPos();
  return Math.hypot(pp.x-DIEGO_X,pp.z-DIEGO_Z)<3.5
    && DIEGO.state!=='active'
    && DIEGO.state!=='completing';
}

export function performDiegoInteract(){
  if(state.dlgActive||state.mode!=='foot'||!isNearDiego())return false;
  if(DIEGO.state==='available'){
    dlgOpen(diegoMissionLines(),()=>{
      diegoSpawnItem();
      DIEGO.state='active';
      diegoMarker.visible=false;
      message('DIEGO PENHA MISSION: FIND THE FLASH DRIVE','var(--gold)');
    });
    return true;
  }
  if(DIEGO.state==='returning'){
    DIEGO.state='completing';
    diegoMarker.visible=false;
    dlgOpen(diegoReturnLines(),()=>diegoShowMissionPass());
    return true;
  }
  if(DIEGO.state==='done'){
    dlgOpen([{text:'Good work. Stay available.'}],null);
    return true;
  }
  return false;
}

export function updateDiego(dt){
  if(diegoMarker.visible){
    diegoMarker.position.y=3.6+Math.sin(state.time*2.8)*.2;
    diegoMarker.rotation.y+=dt*1.9;
    _dMarkerMat.color.setHex(
      DIEGO.state==='returning'
        ?(Math.floor(state.time*4)%2?0xff2e88:0xffd24a)
        :0xffd24a
    );
  }
  if(DIEGO.secretMesh){
    DIEGO.secretMesh.rotation.y+=dt*2.4;
    DIEGO.secretMesh.rotation.x+=dt*.85;
    DIEGO.secretMesh.position.y=.9+Math.sin(state.time*3.5)*.2;
  }
  if(state.dlgActive||state.mode==='cut')return;
  const pp=playerPos();
  if(DIEGO.state==='active'&&DIEGO.secretMesh){
    if(Math.hypot(pp.x-DIEGO.secretX,pp.z-DIEGO.secretZ)<2.4){
      scene.remove(DIEGO.secretMesh,DIEGO.secretBeacon);
      DIEGO.secretMesh=null;DIEGO.secretBeacon=null;
      DIEGO.state='returning';
      diegoMarker.visible=true;
      message('FLASH DRIVE FOUND! Return to Diego Penha.','var(--pink)');
      blip([660,880,1100],.09,'sine',.18);
    }
  }
}

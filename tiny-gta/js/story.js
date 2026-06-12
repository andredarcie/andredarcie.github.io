import * as THREE from 'three';
import {nodeX,ROAD,SIDE,BLOCK,N,GROUND,BEACH,rand,irand,pick,MOUNT_X,groundHeight} from './constants.js';
import {state,refs} from './state.js';
import {scene,camera} from './engine.js';
import {makePed} from './entities.js';
import {AC,master,blip,thud} from './audio.js';
import {message} from './hud.js';
import {parks} from './world.js';
import {player,playerPos} from './player.js';
import {addBloodPuddle} from './pedestrians.js';
import {setTod} from './daynight.js';
import {makeStoryGem} from '../assets/models/missions/story-gem.js';
import {makeStoryUsb} from '../assets/models/missions/story-usb.js';
import {makeStoryBottle} from '../assets/models/missions/story-bottle.js';
import {makeStoryBox} from '../assets/models/missions/story-box.js';
import {makeStoryMarker} from '../assets/models/missions/story-marker.js';
import {makeStoryBeacon} from '../assets/models/missions/story-beacon.js';
import {makeStoryArrow} from '../assets/models/missions/story-arrow.js';

// ============================================================================
// STORY: estrutura genérica de missões. Tudo que define uma missão (NPC,
// posição, voz, diálogos, objetivo, recompensa, mensagens) vive neste JSON.
// As missões são LINEARES: uma só fica disponível quando a anterior termina,
// e cada uma encerra nela mesma (sem repetição infinita). Ao fim das três,
// o prólogo acaba e fica o aviso para aguardar o capítulo 1.
//
// Placeholders nos diálogos, resolvidos quando o objetivo é sorteado:
//   {where} {side} {opp} {vert}
// ============================================================================
export const STORY={
  chapter:'PROLOGUE',
  missions:[
    {
      id:'diego-usb-drive',
      title:"ANDRÉ'S USB DRIVE",
      reward:0,
      npc:{
        name:'DIEGO PENHA',letter:'D',
        shirt:0xffd24a,pants:null,
        color:0xffd24a,css:'#ffd24a',
        x:nodeX(1)+ROAD/2+3.5,z:nodeX(4),face:0,
        voice:{freq:118,type:'square'},
      },
      intro:[
        'Hey, my dear friend! You glorious motherfucker! Welcome to the city of dreams: Andrelandia!',
        'You enjoying this crazy-ass place so far?',
        'Now you work for André N. Darcie, the biggest fucking mob boss in town, the king of crime, the ruler of every crooked deal, the master of all goddamn masters!',
        'My name is Diego Penha, but you can call me Diguifi.',
        'André needs something from you. There\'s a USB drive out there full of evidence of all the shady shit he\'s done. Some dumb bastard left it behind, and now we need it back.',
      ],
      outro:[
        'You got it! You beautiful son of a bitch, André will love this.',
        'Now go see Leozinho, a few blocks east. He has the next job for you.',
      ],
      objective:{type:'fetch',spot:'farPark',item:{shape:'usb',color:0x19e3ff},beacon:0x19e3ff},
      startMsg:'DIGUIFI: RECOVER THE USB DRIVE',
      foundMsg:'USB DRIVE RECOVERED! Return to Diguifi.',
      unlockMsg:'TALK TO DIEGO PENHA - FOLLOW THE D ON THE RADAR',
    },
    {
      id:'leozinho-last-package',
      title:'THE LAST PACKAGE',
      reward:500,
      npc:{
        name:'LEOZINHO',letter:'L',
        shirt:0x9dff2e,pants:0x1c2f12,
        color:0x9dff2e,css:'#9dff2e',
        x:nodeX(7)+ROAD/2+3.5,z:nodeX(4)+10,face:-Math.PI/2,
        voice:{freq:200,type:'square'},
      },
      intro:[
        'So Diego told me about you, you crazy bastard! You did a job for him, which means André N. Darcie, the genius, the wizard, the absolute mastermind, has more work for you!',
        'Man, I can\'t take this life of crime anymore. After today\'s job, I\'m getting the hell out of here.',
        'Listen, I\'m the king of drugs, a total weed-smoking maniac. I need you to pick up the last package for André. Tonight he\'s planning to get high as hell and party all night long.',
      ],
      outro:[
        'That\'s the one! The last package of my life, bro. I\'m out.',
        'Here\'s your cut: $500. Now go talk to Augusto, down at the south beach. And good luck.',
      ],
      objective:{type:'fetch',spot:'random',item:{shape:'box',color:0xf4f0e2},beacon:0x9dff2e},
      startMsg:'LEOZINHO: PICK UP THE LAST PACKAGE',
      foundMsg:'PACKAGE SECURED! Take it back to Leozinho.',
      unlockMsg:'LEOZINHO WANTS TO TALK - FOLLOW THE L ON THE RADAR',
    },
    {
      id:'augusto-kill-diego',
      title:'THE FILTHY RAT',
      reward:1000,
      npc:{
        name:'AUGUSTO',letter:'A',
        shirt:0xffb52e,pants:0x3d2a18,
        color:0xffb52e,css:'#ffb52e',
        x:30,z:GROUND/2+BEACH/2,face:Math.PI,
        voice:{freq:92,type:'sawtooth'},
      },
      intro:[
        'Hey there, my friend! I\'m Augusto, and I\'ve got something for you. You might want to grab a bottle of liquor first, because this is gonna be rough.',
        'I need you to kill Diego. André told me he\'s a traitor. The bastard handed the USB drive over to the cops.',
        'The guy\'s a filthy rat.',
      ],
      outro:[],
      objective:{type:'kill',target:'diego-usb-drive'},
      startMsg:'AUGUSTO: KILL DIEGO PENHA',
      foundMsg:'DIEGO PENHA IS DOWN.',
      unlockMsg:'AUGUSTO IS WAITING AT THE SOUTH BEACH - FOLLOW THE A',
    },
  ],
};

// ---------------------------------------------------------------------------
// Sorteio do local do objetivo
// ---------------------------------------------------------------------------
function rollRandomSpot(){
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

// Parque mais distante do NPC (missão do Diego): rende as pistas side/vert
function farParkSpot(fromX,fromZ){
  const lst=[...parks].map(k=>{
    const[pi,pj]=k.split('_').map(Number);
    return{
      x:nodeX(pi)+ROAD/2+SIDE+(BLOCK-2*SIDE)/2,
      z:nodeX(pj)+ROAD/2+SIDE+(BLOCK-2*SIDE)/2
    };
  }).sort((a,b)=>Math.hypot(b.x-fromX,b.z-fromZ)-Math.hypot(a.x-fromX,a.z-fromZ));
  const t=lst[0];
  const x=t.x+rand(-2.5,2.5),z=t.z+rand(-2.5,2.5);
  return{x,z,side:x<0?'west':'east',vert:z<0?'north':'south'};
}

function fillLines(lines,spot){
  return lines.map(t=>t
    .replace('{where}',spot?.where??'')
    .replace('{side}',spot?.side??'')
    .replace('{opp}',spot?(spot.side==='west'?'east':'west'):'')
    .replace('{vert}',spot?.vert??''));
}

// ---------------------------------------------------------------------------
// Atores: ped + marcador de cada NPC da história (só o da missão atual aparece)
// ---------------------------------------------------------------------------
const actors=STORY.missions.map(m=>{
  const ped=makePed(m.npc.shirt,m.npc.pants??undefined);
  ped.position.set(m.npc.x,0,m.npc.z);
  if(m.npc.face)ped.rotation.y=m.npc.face;
  const {marker,mat}=makeStoryMarker(m.npc.color);
  marker.position.set(m.npc.x,3.6,m.npc.z);
  marker.visible=false;
  scene.add(marker);
  return{ped,marker,mat,phase:rand(0,6)};
});
actors[0].marker.visible=true;

// fetch: available -> active -> returning -> (cutscene de volta) -> próxima
// kill:  available -> active -> (alvo morto) -> completing -> próxima | over
const S={idx:0,phase:'available',spot:null,itemMesh:null,beacon:null,
  target:null,targetNpc:null};
const cm=()=>STORY.missions[S.idx];
const ca=()=>actors[S.idx];
function makeStoryItem(item){
  if(item.shape==='gem')return makeStoryGem(item.color);
  if(item.shape==='usb')return makeStoryUsb(item.color);
  if(item.shape==='bottle')return makeStoryBottle(item.color);
  return makeStoryBox(item.color);
}

// ---------------------------------------------------------------------------
// Cut-scene: barras de cinema, câmera em plano aberto dos dois personagens e
// legendas estilo filme que correm sozinhas, letra a letra, com "voz" do NPC
// ---------------------------------------------------------------------------
const subEl=document.getElementById('cine-sub');
const cine={on:false,t:0,lines:[],li:-1,txt:'',shown:0,charT:0,phase:'type',
  holdT:0,voice:null,onDone:null,side:1,npcPos:null,actor:null,
  shot:'wide',shotT:0,midCut:false};

// 3 câmeras de cinema, trocadas em corte seco a cada fala:
// wide = plano aberto lateral; close = por cima do ombro do jogador, fechado
// no NPC que fala; reverse = contraplano com a reação do jogador
function pickShot(li,total){
  if(li===0||li===total-1)return 'wide';
  return li%3===0?'reverse':'close';
}

function voiceTick(v){
  if(!AC)return;
  const o=AC.createOscillator();o.type=v.type||'square';
  o.frequency.value=v.freq*(1+(Math.random()-.5)*.22);
  const g=AC.createGain();
  o.connect(g);g.connect(master);
  const t=AC.currentTime;
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(.045,t+.006);
  g.gain.exponentialRampToValueAtTime(.001,t+.055);
  o.start(t);o.stop(t+.07);
}

function startCutscene(m,actor,lines,onDone){
  cine.on=true;cine.t=0;cine.lines=lines;cine.li=-1;
  cine.voice=m.npc.voice;cine.onDone=onDone;
  cine.actor=actor;cine.npcPos=actor.ped.position;
  state.cine=true;state.dlgActive=true;
  setTod(.5); // cena sempre ao meio-dia; o relógio fica parado enquanto durar
  document.body.classList.add('cine');
  actor.marker.visible=false;
  // os dois se encaram
  const pp=playerPos();
  const dx=actor.ped.position.x-pp.x,dz=actor.ped.position.z-pp.z;
  player.heading=Math.atan2(dx,dz);player.g.rotation.y=player.heading;
  actor.ped.rotation.y=Math.atan2(-dx,-dz);
  // câmera fica do lado em que ela já está, para não atravessar a cena
  const midx=(pp.x+actor.ped.position.x)/2,midz=(pp.z+actor.ped.position.z)/2;
  cine.side=((camera.position.x-midx)*dz+(camera.position.z-midz)*-dx)>=0?1:-1;
  nextLine();
}
function nextLine(){
  cine.li++;
  if(cine.li>=cine.lines.length)return endCutscene();
  cine.txt=cine.lines[cine.li];cine.shown=0;cine.charT=0;cine.phase='type';
  cine.shot=pickShot(cine.li,cine.lines.length);
  cine.shotT=0;cine.midCut=false;
  subEl.textContent='';
}
function endCutscene(){
  cine.on=false;state.cine=false;state.dlgActive=false;
  document.body.classList.remove('cine');
  subEl.textContent='';
  // braços e boca de volta ao repouso
  const l=cine.actor?.ped.userData.limbs;
  if(l){
    l.rightArm.rotation.set(0,0,-.12);l.leftArm.rotation.set(0,0,.12);
    l.rightForearm?.rotation.set(0,0,0);l.leftForearm?.rotation.set(0,0,0);
  }
  const mouth=cine.actor?.ped.userData.mouth;
  if(mouth)mouth.scale.y=1;
  const fn=cine.onDone;cine.onDone=null;fn&&fn();
}

// Boca abrindo/fechando e mãos gesticulando enquanto o NPC fala
function setTalkPose(actor,t,talking){
  if(!actor)return;
  const l=actor.ped.userData.limbs;
  if(l){
    if(talking){
      l.rightArm.rotation.x=-.55+Math.sin(t*2.6)*.4;
      l.leftArm.rotation.x=-.3+Math.sin(t*1.9+1.4)*.32;
      l.rightArm.rotation.z=-.28-Math.max(0,Math.sin(t*1.3))*.2;
      l.leftArm.rotation.z=.18;
      // cotovelos acompanham o gesto: mão sobe e desce enquanto fala
      if(l.rightForearm)l.rightForearm.rotation.x=-.5-Math.max(0,Math.sin(t*2.2))*.4;
      if(l.leftForearm)l.leftForearm.rotation.x=-.3-Math.max(0,Math.sin(t*1.6+.7))*.3;
    }else{
      l.rightArm.rotation.x*=.85;l.leftArm.rotation.x*=.85;
      l.rightArm.rotation.z=-.12;l.leftArm.rotation.z=.12;
      if(l.rightForearm)l.rightForearm.rotation.x*=.85;
      if(l.leftForearm)l.leftForearm.rotation.x*=.85;
    }
  }
  const mouth=actor.ped.userData.mouth;
  if(mouth)mouth.scale.y=talking?1+Math.abs(Math.sin(t*16))*5:1;
}

function updateCine(dt){
  cine.t+=dt;
  if(cine.phase==='type'){
    const STEP=.034;
    cine.charT+=dt;
    while(cine.charT>=STEP&&cine.shown<cine.txt.length){
      cine.charT-=STEP;cine.shown++;
      const ch=cine.txt[cine.shown-1];
      if(/[a-z0-9]/i.test(ch))voiceTick(cine.voice);
    }
    subEl.textContent=cine.txt.slice(0,cine.shown);
    if(cine.shown>=cine.txt.length){
      cine.phase='hold';
      cine.holdT=Math.min(4,Math.max(1.3,.5+cine.txt.length*.03));
    }
  }else{
    cine.holdT-=dt;
    if(cine.holdT<=0)nextLine();
  }
  setTalkPose(cine.actor,cine.t,cine.phase==='type');

  // fala longa ganha um corte extra no meio, como num filme
  if(cine.phase==='type'&&!cine.midCut&&cine.txt.length>110
    &&cine.shown>=cine.txt.length*.55){
    cine.midCut=true;cine.shotT=0;
    cine.shot=cine.shot==='close'?'reverse':'close';
  }

  // câmera do plano atual (corte seco entre planos, dolly lento dentro deles)
  const pp=playerPos(),np=cine.npcPos;
  let dx=np.x-pp.x,dz=np.z-pp.z;
  const gap=Math.max(2,Math.hypot(dx,dz));dx/=gap;dz/=gap;
  const px=dz*cine.side,pz=-dx*cine.side;
  cine.shotT+=dt;
  const push=Math.min(.5,cine.shotT*.05); // aproximação sutil dentro do plano
  let cx,cy,cz,lx,ly,lz,fov;
  if(cine.shot==='close'){           // ombro do jogador, fechado no NPC
    cx=pp.x-dx*(1.15-push*.6)+px*.8;
    cz=pp.z-dz*(1.15-push*.6)+pz*.8;
    cy=groundHeight(cx,cz)+1.62;
    lx=np.x;ly=np.y+1.5;lz=np.z;fov=34;
  }else if(cine.shot==='reverse'){   // contraplano: reação do jogador
    cx=np.x+dx*(1.15-push*.6)+px*.8;
    cz=np.z+dz*(1.15-push*.6)+pz*.8;
    cy=groundHeight(cx,cz)+1.62;
    lx=pp.x;ly=pp.y+1.5;lz=pp.z;fov=34;
  }else{                             // wide: plano aberto lateral dos dois
    const midx=(pp.x+np.x)/2,midz=(pp.z+np.z)/2;
    const dist=Math.max(5.2,gap*1.7)-push*1.6;
    const drift=Math.sin(cine.t*.25)*1.1;
    cx=midx+px*dist+dx*drift;
    cz=midz+pz*dist+dz*drift;
    cy=Math.max(groundHeight(midx,midz),groundHeight(cx,cz))+1.7;
    lx=midx;ly=groundHeight(midx,midz)+1.25;lz=midz;fov=44;
  }
  camera.position.set(cx,cy,cz);
  camera.fov=fov;
  camera.updateProjectionMatrix();
  camera.lookAt(lx,ly,lz);
}

// ---------------------------------------------------------------------------
// Telas: MISSION PASSED e fim do prólogo
// ---------------------------------------------------------------------------
function showMissionPass(m,after){
  const el=document.getElementById('missionpass');
  document.getElementById('mp-mission').textContent=m.title;
  document.getElementById('mp-respect').textContent='▲ RESPECT WITH '+m.npc.name;
  el.style.display='flex';
  setTimeout(()=>document.getElementById('mp-bar-fill').style.width='78%',60);
  blip([392,523,659,784,1047,1319],.10,'sine',.20);
  setTimeout(()=>{
    el.style.display='none';
    document.getElementById('mp-bar-fill').style.width='0';
    after&&after();
  },5600);
}

function showPrologueEnd(){
  const el=document.getElementById('prologue-end');
  el.classList.add('show');
  blip([523,659,784,1047,1319,1568],.12,'sine',.2);
  setTimeout(()=>el.classList.remove('show'),14000);
}

// ---------------------------------------------------------------------------
// Motor da missão
// ---------------------------------------------------------------------------
function spawnItem(m){
  const gh=groundHeight(S.spot.x,S.spot.z);
  S.itemMesh=makeStoryItem(m.objective.item);
  S.itemMesh.position.set(S.spot.x,gh+.75,S.spot.z);
  S.itemMesh.userData.baseY=gh+.75;
  scene.add(S.itemMesh);
  S.beacon=makeStoryBeacon(m.objective.beacon);
  S.beacon.position.set(S.spot.x,gh+18,S.spot.z);
  scene.add(S.beacon);
}

// Missão de assassinato: o alvo é o NPC de outra missão (referência por id)
function armKillTarget(m){
  const i=STORY.missions.findIndex(x=>x.id===m.objective.target);
  S.target=actors[i];S.targetNpc=STORY.missions[i].npc;
  S.beacon=makeStoryBeacon(0xff2e88);
  S.beacon.position.set(S.targetNpc.x,18,S.targetNpc.z);
  scene.add(S.beacon);
}

function killTarget(){
  if(!S.target||S.target.dead||S.phase!=='active')return;
  const m=cm(),p=S.target.ped.position;
  S.target.dead=true;
  S.target.ped.rotation.x=-Math.PI/2; // cai no chão
  p.y=.2;
  addBloodPuddle(p.x,p.z);
  thud(14);
  if(S.beacon){scene.remove(S.beacon);S.beacon=null;}
  S.phase='completing';
  if(m.reward)state.money+=m.reward;
  message(m.foundMsg,'var(--pink)');
  setTimeout(()=>showMissionPass(m,advance),1400);
}

// Alvos da história que podem tomar tiro (weapons.js consulta via refs)
export function storyTargets(){
  if(S.idx>=STORY.missions.length||S.phase!=='active')return[];
  if(cm().objective.type!=='kill'||!S.target||S.target.dead)return[];
  return[{g:S.target.ped,kill:killTarget}];
}

function advance(){
  S.idx++;S.spot=null;S.target=null;S.targetNpc=null;
  if(S.idx>=STORY.missions.length){S.phase='over';showPrologueEnd();return;}
  S.phase='available';
  ca().marker.visible=true;
  message(cm().unlockMsg,cm().npc.css);
}

export function storyNear(){
  if(state.mode!=='foot'||state.cine)return null;
  if(S.idx>=STORY.missions.length)return null;
  if(S.phase!=='available'&&S.phase!=='returning')return null;
  const m=cm(),pp=playerPos();
  return Math.hypot(pp.x-m.npc.x,pp.z-m.npc.z)<3.5?m.npc.name:null;
}

export function storyInteract(){
  if(state.dlgActive||state.mode!=='foot'||!storyNear())return false;
  const m=cm(),a=ca();
  if(S.phase==='available'){
    const obj=m.objective;
    if(obj.type==='fetch')
      S.spot=obj.spot==='farPark'?farParkSpot(m.npc.x,m.npc.z):rollRandomSpot();
    startCutscene(m,a,fillLines(m.intro,S.spot),()=>{
      if(obj.type==='fetch')spawnItem(m);
      else armKillTarget(m);
      S.phase='active';
      message(m.startMsg,m.npc.css);
    });
    return true;
  }
  if(S.phase==='returning'){
    S.phase='completing';
    startCutscene(m,a,fillLines(m.outro,S.spot),()=>{
      if(m.reward)state.money+=m.reward;
      showMissionPass(m,advance);
    });
    return true;
  }
  return false;
}

// Blips do radar: NPC da missão atual (piscando rosa na volta), o item da
// busca ou o alvo do assassinato (piscando vermelho)
export function storyBlips(){
  if(S.idx>=STORY.missions.length)return[];
  const m=cm();
  if(S.phase==='active'&&m.objective.type==='kill'&&S.target&&!S.target.dead){
    const p=S.target.ped.position;
    return[{x:p.x,z:p.z,col:'#ff2e88',letter:S.targetNpc.letter}];
  }
  if(S.phase==='active'&&S.spot)
    return[{x:S.spot.x,z:S.spot.z,col:m.npc.css}];
  if(S.phase==='available'||S.phase==='returning'){
    if(S.phase==='returning'&&Math.floor(state.time*4)%2!==0)return[];
    return[{x:m.npc.x,z:m.npc.z,letter:m.npc.letter,
      col:S.phase==='returning'?'#ff2e88':m.npc.css}];
  }
  return[];
}

// Seta de navegação 3D sobre o jogador apontando para o objetivo atual da
// história (NPC quando disponível/retorno, item ou alvo quando a missão roda)
const {arrow:storyArrow,material:navMat}=makeStoryArrow();
storyArrow.visible=false;scene.add(storyArrow);

// Para onde a missão atual aponta agora (null = sem objetivo na tela)
function storyGoal(){
  if(S.idx>=STORY.missions.length)return null;
  const m=cm();
  if(S.phase==='available'||S.phase==='returning')
    return{x:m.npc.x,z:m.npc.z,col:S.phase==='returning'?'#ff2e88':m.npc.css};
  if(S.phase==='active'){
    if(m.objective.type==='kill')
      return S.target&&!S.target.dead
        ?{x:S.target.ped.position.x,z:S.target.ped.position.z,col:'#ff2e88'}:null;
    if(S.spot)return{x:S.spot.x,z:S.spot.z,col:m.npc.css};
  }
  return null;
}

export function updateStory(dt){
  if(cine.on)updateCine(dt);
  const goal=state.started&&!state.cine?storyGoal():null;
  storyArrow.visible=!!goal;
  if(goal){
    const pp=playerPos();
    storyArrow.position.set(pp.x,5.4+Math.sin(state.time*3)*.25,pp.z);
    storyArrow.lookAt(goal.x,storyArrow.position.y,goal.z);
    navMat.color.set(goal.col);
  }
  const a=S.idx<actors.length?ca():null;
  if(a&&a.marker.visible){
    a.marker.position.y=3.6+Math.sin(state.time*2.8+a.phase)*.2;
    a.marker.rotation.y+=dt*1.9;
    a.mat.color.setHex(S.phase==='returning'
      ?(Math.floor(state.time*4)%2?0xff2e88:cm().npc.color):cm().npc.color);
  }
  if(S.itemMesh){
    S.itemMesh.rotation.y+=dt*2;
    S.itemMesh.position.y=S.itemMesh.userData.baseY+Math.sin(state.time*3.2)*.18;
  }
  if(state.dlgActive||state.cine||state.mode==='cut')return;
  if(S.phase==='active'&&S.itemMesh){
    const pp=playerPos();
    if(Math.hypot(pp.x-S.spot.x,pp.z-S.spot.z)<2.4){
      scene.remove(S.itemMesh,S.beacon);S.itemMesh=null;S.beacon=null;
      S.phase='returning';
      a.marker.visible=true;
      message(cm().foundMsg,'var(--pink)');
      blip([660,880,1100],.09,'sine',.18);
    }
  }
  // assassinato: tiro chega via storyTargets/weapons; atropelamento conta aqui
  if(S.phase==='active'&&cm().objective.type==='kill'&&S.target&&!S.target.dead
    &&state.mode==='car'){
    const c=refs.getCur?.();
    if(c&&Math.abs(c.speed)>8){
      const p=S.target.ped.position;
      if(Math.hypot(c.g.position.x-p.x,c.g.position.z-p.z)<2.4)killTarget();
    }
  }
}

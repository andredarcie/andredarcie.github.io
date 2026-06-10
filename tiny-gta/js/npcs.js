import * as THREE from 'three';
import {nodeX,ROAD,N,GROUND,BEACH,rand,irand,pick,MOUNT_X,groundHeight} from './constants.js';
import {state} from './state.js';
import {scene} from './engine.js';
import {makePed} from './entities.js?v=12';
import {blip} from './audio.js';
import {message} from './hud.js';
import {playerPos} from './player.js';
import {dlgOpen} from './diego.js';

// Fábrica de NPCs de busca no esquema do Leozinho: marcador, diálogo,
// item sorteado em ponto aleatório do mapa, feixe de luz, blip no radar
// e missão repetível.

function rollSpot(){
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
  return{x:MOUNT_X+rand(-2,2),z:rand(-2,2),where:'on TOP of the mountain. Yes, the top'};
}

function makeFetchNpc(cfg){
  const ped=makePed(cfg.shirt,cfg.pants);
  ped.position.set(cfg.x,0,cfg.z);
  ped.rotation.y=cfg.face||0;
  const markerMat=new THREE.MeshBasicMaterial({color:cfg.colorHex});
  const marker=new THREE.Mesh(new THREE.OctahedronGeometry(.52,0),markerMat);
  marker.position.set(cfg.x,3.6,cfg.z);
  scene.add(marker);
  const phase=rand(0,6);
  const npc={state:'available',runs:0,stashX:0,stashZ:0,mesh:null,beacon:null,
    X:cfg.x,Z:cfg.z,letter:cfg.letter,css:cfg.css,name:cfg.name};

  function spawnItem(){
    const gh=groundHeight(npc.stashX,npc.stashZ);
    const item=cfg.makeItem();
    item.position.set(npc.stashX,gh+.75,npc.stashZ);
    item.userData.baseY=gh+.75;
    npc.mesh=item;scene.add(item);
    const bm=new THREE.MeshBasicMaterial({color:cfg.colorHex,transparent:true,
      opacity:.07,side:THREE.DoubleSide,depthWrite:false});
    npc.beacon=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,36,8,1,true),bm);
    npc.beacon.position.set(npc.stashX,gh+18,npc.stashZ);
    scene.add(npc.beacon);
  }

  npc.isNear=()=>{
    if(state.mode!=='foot')return false;
    const pp=playerPos();
    return Math.hypot(pp.x-cfg.x,pp.z-cfg.z)<3.5
      &&npc.state!=='active'&&npc.state!=='completing';
  };

  npc.interact=()=>{
    if(state.dlgActive||state.mode!=='foot'||!npc.isNear())return false;
    if(npc.state==='available'){
      const spot=rollSpot();
      npc.stashX=spot.x;npc.stashZ=spot.z;
      dlgOpen(cfg.missionLines(npc.runs,spot.where),()=>{
        spawnItem();
        npc.state='active';marker.visible=false;
        message(cfg.missionMsg,cfg.css);
      });
      return true;
    }
    if(npc.state==='returning'){
      npc.state='completing';marker.visible=false;
      const pay=npc.runs===0?cfg.pay0:cfg.payN;
      dlgOpen(cfg.returnLines(npc.runs,pay),()=>{
        state.money+=pay;npc.runs++;
        npc.state='available';marker.visible=true;
        message('+$'+pay+' - '+cfg.doneMsg,'var(--gold)');
        blip([523,659,784,1047],.09,'sine',.18);
      });
      return true;
    }
    return false;
  };

  npc.update=dt=>{
    if(marker.visible){
      marker.position.y=3.6+Math.sin(state.time*2.8+phase)*.2;
      marker.rotation.y+=dt*1.9;
      markerMat.color.setHex(npc.state==='returning'
        ?(Math.floor(state.time*4)%2?0xff2e88:cfg.colorHex):cfg.colorHex);
    }
    if(npc.mesh){
      npc.mesh.rotation.y+=dt*2;
      npc.mesh.position.y=npc.mesh.userData.baseY+Math.sin(state.time*3.2)*.18;
    }
    if(state.dlgActive||state.mode==='cut')return;
    if(npc.state==='active'&&npc.mesh){
      const pp=playerPos();
      if(Math.hypot(pp.x-npc.stashX,pp.z-npc.stashZ)<2.4){
        scene.remove(npc.mesh,npc.beacon);npc.mesh=null;npc.beacon=null;
        npc.state='returning';marker.visible=true;
        message(cfg.foundMsg,'var(--pink)');
        blip([660,880,1100],.09,'sine',.18);
      }
    }
  };
  return npc;
}

// ----- RUSSO: ama uma cachaça, vive na praia sul -----
const cachacaLines=[
  'Cachaca is not a drink, my friend. It is a personality.',
  'My doctor said one dose a day. He did not specify the size. I use a bucket.',
  'Beer is just water with marketing. Cachaca is the truth.',
  'I do not have a drinking problem. I drink, the problem disappears. Science.',
  'They told me to choose between her and the cachaca. I miss her sometimes.',
];
const russo=makeFetchNpc({
  name:'RUSSO',letter:'R',
  shirt:0xffb52e,pants:0x3d2a18,colorHex:0xffb52e,css:'#ffb52e',
  x:30,z:GROUND/2+BEACH/2,face:Math.PI, // praia sul, olhando pra cidade
  pay0:400,payN:250,
  missionMsg:'RUSSO MISSION: FETCH THE BOTTLE',
  foundMsg:'BOTTLE SECURED! Take it back to Russo. NO SIPPING.',
  doneMsg:'RUSSO IS HAPPY',
  missionLines:(runs,where)=>[
    ...(runs?[]:[{name:'RUSSO',text:'Opa! They call me Russo. You look thirsty. I am always thirsty too, but only for one thing: cachaca.'}]),
    {name:'RUSSO',text:pick(cachacaLines)},
    {name:'RUSSO',text:`Tragedy: my emergency bottle is hidden ${where}. The GOOD one, aged in oak. Bring it whole — I count the milliliters.`},
  ],
  returnLines:(runs,pay)=>[
    {name:'RUSSO',text:'You did not sip it, did you? ...I am watching you. And the bottle.'},
    {name:'RUSSO',text:pick(cachacaLines)},
    {name:'RUSSO',text:`Here, $${pay} for the rescue. There is always another bottle hidden somewhere. A man must plan ahead.`},
  ],
  makeItem:()=>{
    const g=new THREE.Group();
    const glass=new THREE.MeshBasicMaterial({color:0x2e8a4a});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.16,.18,.55,8),glass);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(.05,.07,.25,8),glass);
    neck.position.y=.38;
    g.add(body,neck);
    return g;
  },
});

// ----- RODRIGO ALISTER: escrevendo o livro de RPG dele -----
const rpgLines=[
  'My RPG book will have 800 pages. 600 of them are tables. Players LOVE tables.',
  'My homebrew system uses a d20, a d12 and a coin from 1994. For balance reasons.',
  'I killed a player character last session. He cried. Best session ever.',
  'Chapter 3 is only rules for inventory weight. The critics will call it "brave".',
  'I playtested my system with my grandmother. She min-maxed a healer. Terrifying.',
];
const rodrigo=makeFetchNpc({
  name:'RODRIGO ALISTER',letter:'A',
  shirt:0x40c8c0,pants:0x202435,colorHex:0x40c8c0,css:'#40c8c0',
  x:nodeX(3)+ROAD/2+3.5,z:nodeX(5)+10,face:-Math.PI/2,
  pay0:300,payN:200,
  missionMsg:'RODRIGO MISSION: RECOVER THE MANUSCRIPT',
  foundMsg:'MANUSCRIPT FOUND! Return it to Rodrigo Alister.',
  doneMsg:'CHAPTER SAVED',
  missionLines:(runs,where)=>[
    ...(runs?[]:[{name:'RODRIGO ALISTER',text:'Greetings, traveler! Rodrigo Alister, game designer. I am writing the greatest RPG book of this generation. Probably.'}]),
    {name:'RODRIGO ALISTER',text:pick(rpgLines)},
    {name:'RODRIGO ALISTER',text:`Disaster: chapter ${runs+1} of my manuscript ended up ${where}. Yes, this is literally a fetch quest. They are classics for a reason. Go, hero.`},
  ],
  returnLines:(runs,pay)=>[
    {name:'RODRIGO ALISTER',text:'My chapter! Barely any blood on it. You rolled a natural 20 on this delivery.'},
    {name:'RODRIGO ALISTER',text:pick(rpgLines)},
    {name:'RODRIGO ALISTER',text:`Take $${pay}. You will be credited in the acknowledgments. Page 793. In small print.`},
  ],
  makeItem:()=>new THREE.Mesh(new THREE.BoxGeometry(.52,.07,.68),
    new THREE.MeshBasicMaterial({color:0xf4f0e2})),
});

export const npcs=[russo,rodrigo];

export function updateNpcs(dt){for(const n of npcs)n.update(dt);}

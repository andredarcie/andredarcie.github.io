import * as THREE from 'three';
import {rand,irand,clamp,nodeX} from './constants.js';
import {state,refs} from './state.js';
import {scene} from './engine.js';
import {makePed,setOpacity} from './entities.js?v=12';
import * as Entities from './entities.js?v=12';
import {collideStatics,addWanted} from './physics.js';
import {blip,thud} from './audio.js';
import {message} from './hud.js';
import {playerPos,getWasted} from './player.js';
import {addBloodPuddle} from './pedestrians.js';
import {spawnDrop} from './missions.js';

// Três gangues, cada uma com cor própria, território circular (aparece no
// minimapa) e membros uniformizados e armados. Matar um membro encolhe o
// território; reforços internos chegam sempre — só que mais devagar quanto
// menor a área.
const GANG_MIN_R=14, GANG_R0=52, KILL_SHRINK=3.2;
export const gangs=[
  {name:'VIPERS', color:0x35d435,pants:0x14401c,css:'#35d435',cssA:'rgba(53,212,53,.22)',
   x:nodeX(6)+22,z:nodeX(1)+22,r:GANG_R0},
  {name:'SKULLS', color:0x9d2eff,pants:0x2a1440,css:'#9d2eff',cssA:'rgba(157,46,255,.22)',
   x:nodeX(1)+22,z:nodeX(6)+22,r:GANG_R0},
  // norte-centro: os cantos SE/NW ficam livres (respawns do hospital e da delegacia)
  {name:'JACKALS',color:0xff7a1a,pants:0x4a2410,css:'#ff7a1a',cssA:'rgba(255,122,26,.22)',
   x:nodeX(3)+22,z:nodeX(1)+22,r:GANG_R0},
];
for(const g of gangs){g.spawnT=rand(4,10);g.alarmT=0;g.wasInside=false;}

export const gangPeds=[];

const gunM=new THREE.MeshStandardMaterial({color:0x15121a,roughness:.5,metalness:.7});
function attachGun(g){
  const arm=g.userData.limbs?.rightArm;if(!arm)return;
  const gun=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(.1,.13,.34),gunM);
  const barrel=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.22),gunM);
  barrel.position.set(0,.04,.26);
  gun.add(body,barrel);
  gun.position.set(0,-.62,.14);
  arm.add(gun);
}

function spawnMember(gang){
  const pp=playerPos();
  let x=gang.x,z=gang.z;
  for(let k=0;k<24;k++){
    const a=rand(0,Math.PI*2),d=Math.sqrt(Math.random())*gang.r*.9;
    x=gang.x+Math.cos(a)*d;z=gang.z+Math.sin(a)*d;
    if(Math.hypot(x-pp.x,z-pp.z)>26)break; // não nasce na cara do jogador
  }
  const m={g:makePed(gang.color,gang.pants),gang,state:'walk',vel:new THREE.Vector3(),
    t:0,bob:0,shootT:rand(.6,1.6),tgt:null,tgtT:0};
  m.g.position.set(x,0,z);
  collideStatics(m.g.position,.4);
  attachGun(m.g);
  gangPeds.push(m);
}
for(const g of gangs)for(let k=0;k<5;k++)spawnMember(g);

function gangCasualty(m){
  addBloodPuddle(m.g.position.x,m.g.position.z);
  spawnDrop(m.g.position.x,m.g.position.z,irand(25,90));
  m.gang.r=Math.max(GANG_MIN_R,m.gang.r-KILL_SHRINK);
  m.gang.alarmT=9; // a gangue toda revida por um tempo
}

// chamado por weapons.js quando uma bala acerta um membro
export function killGangPed(m,dir){
  if(m.state==='dead'||m.state==='fly')return;
  m.state='fly';
  m.vel.copy(dir).multiplyScalar(9).add(new THREE.Vector3(rand(-1.5,1.5),rand(5,7),rand(-1.5,1.5)));
  gangCasualty(m);
  addWanted(.4,null,'ped_shot');
}

const tracerM=new THREE.LineBasicMaterial({color:0xffd9a8,transparent:true,opacity:.9});
const tracers=[];
function addTracer(a,b){
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),tracerM.clone());
  scene.add(line);tracers.push({line,t:0});
}

function memberShoot(m,pp,dist){
  m.shootT=rand(1.1,1.9);
  const from=m.g.position.clone();from.y+=1.25;
  const hit=Math.random()<clamp(.8-dist*.018,.18,.8);
  const to=new THREE.Vector3(pp.x,pp.y+1.1,pp.z);
  if(!hit){
    const a=rand(0,Math.PI*2);
    to.x+=Math.cos(a)*rand(.8,2.2);to.z+=Math.sin(a)*rand(.8,2.2);
  }
  addTracer(from,to);
  blip([860,520],.04,'square',.07);
  if(hit){
    state.health-=state.mode==='car'?irand(2,5):irand(5,10); // lataria protege um pouco
    state.shake=Math.max(state.shake,.14);
    if(state.health<=0){state.health=100;getWasted();}
  }
}

export function updateGangs(dt){
  const pp=playerPos();
  const c=refs.getCur?.();
  const danger=state.mode==='car'&&c&&Math.abs(c.speed)>6;
  for(const g of gangs){
    g.alarmT=Math.max(0,g.alarmT-dt);
    const inside=Math.hypot(pp.x-g.x,pp.z-g.z)<g.r;
    if(inside&&!g.wasInside&&state.started&&state.mode!=='cut')
      message(g.name+' TERRITORY - WATCH YOUR BACK!',g.css);
    g.wasInside=inside;
    // reforço interno: área maior = spawn mais rápido; nunca cessa de vez
    const cap=Math.max(2,Math.round(g.r/9));
    const interval=clamp(46-g.r*.55,10,46);
    g.spawnT-=dt;
    if(g.spawnT<=0){
      let count=0;for(const m of gangPeds)if(m.gang===g&&m.state!=='dead')count++;
      if(count<cap)spawnMember(g);
      g.spawnT=interval*rand(.85,1.25);
    }
  }
  for(let i=gangPeds.length-1;i>=0;i--){
    const m=gangPeds[i],p=m.g.position;
    if(m.state==='fly'){
      p.addScaledVector(m.vel,dt);
      m.vel.y-=22*dt;m.g.rotation.x+=9*dt;
      if(p.y<.35&&m.vel.y<0){
        p.y=.35;m.state='dead';m.t=0;
        m.g.rotation.set(-Math.PI/2,m.g.rotation.y,0);
      }
      continue;
    }
    if(m.state==='dead'){
      m.t+=dt;
      if(m.t>3)setOpacity(m.g,Math.max(0,1-(m.t-3)/.8));
      if(m.t>3.8){scene.remove(m.g);gangPeds.splice(i,1);}
      continue;
    }
    // atropelamento também conta como baixa (e encolhe o território)
    if(danger&&p.distanceTo(c.g.position)<2.3){
      m.state='fly';
      m.vel.set(Math.sin(c.heading),0,Math.cos(c.heading)).multiplyScalar(c.speed*.4)
        .add(new THREE.Vector3(rand(-2,2),rand(5,8),rand(-2,2)));
      gangCasualty(m);
      addWanted(1,'HIT AND RUN!','hit_run');
      thud(Math.abs(c.speed));state.shake=.35;
      continue;
    }
    const g=m.gang;
    const distP=Math.hypot(pp.x-p.x,pp.z-p.z);
    const playerInside=Math.hypot(pp.x-g.x,pp.z-g.z)<g.r;
    const aggro=state.started&&state.mode!=='cut'
      &&(playerInside||g.alarmT>0)&&distP<g.r+30;
    let mvAmount=0;
    if(aggro){
      const dir=new THREE.Vector3(pp.x-p.x,0,pp.z-p.z).normalize();
      m.g.rotation.y=Math.atan2(dir.x,dir.z);
      if(distP>13){p.addScaledVector(dir,4.6*dt);mvAmount=.85;m.bob+=dt*10;}
      m.shootT-=dt;
      if(m.shootT<=0&&distP<34)memberShoot(m,pp,distP);
    }else{
      m.tgtT-=dt;
      if(!m.tgt||m.tgtT<=0||p.distanceTo(m.tgt)<1.2){
        const a=rand(0,Math.PI*2),d=Math.sqrt(Math.random())*g.r*.85;
        m.tgt=new THREE.Vector3(g.x+Math.cos(a)*d,0,g.z+Math.sin(a)*d);
        m.tgtT=rand(5,9); // troca de alvo mesmo se travar num prédio
      }
      const dir=new THREE.Vector3().subVectors(m.tgt,p);dir.y=0;
      if(dir.length()>.1){
        dir.normalize();p.addScaledVector(dir,1.3*dt);
        m.g.rotation.y=Math.atan2(dir.x,dir.z);mvAmount=.3;m.bob+=dt*2.9;
      }
    }
    collideStatics(p,.4);
    p.y=Math.abs(Math.sin(m.bob))*.07;
    Entities.animatePed?.(m.g,m.bob,mvAmount);
    if(aggro){ // braço da arma apontado, por cima da animação de andar
      const arm=m.g.userData.limbs?.rightArm;
      if(arm){arm.rotation.x=-Math.PI/2;arm.rotation.z=-.06;}
    }
  }
  for(let i=tracers.length-1;i>=0;i--){
    const t=tracers[i];t.t+=dt;
    t.line.material.opacity=Math.max(0,.9-t.t*7);
    if(t.t>.15){scene.remove(t.line);tracers.splice(i,1);}
  }
}

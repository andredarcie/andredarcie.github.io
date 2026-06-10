import * as THREE from 'three';
import {N,nodeX,irand,rand,pick} from './constants.js';
import {state} from './state.js';
import {scene} from './engine.js';
import {makePed,setOpacity,shirtColors} from './entities.js';
import {collideStatics,addWanted} from './physics.js';
import {thud} from './audio.js';
import {message} from './hud.js';
import {playerPos,cur,getWasted} from './player.js';
import {spawnDrop} from './missions.js';

export function pedCorner(p){
  const[i,j]=p.block;
  const xa=nodeX(i)+9,xb=nodeX(i+1)-9,za=nodeX(j)+9,zb=nodeX(j+1)-9;
  return[[xa,za],[xb,za],[xb,zb],[xa,zb]][p.corner];
}

export const peds=[];
const bloodPuddles=[];
const bloodMat=new THREE.MeshBasicMaterial({
  color:0x5f0018,transparent:true,opacity:.78,depthWrite:false
});
const bloodGeo=new THREE.CircleGeometry(1,18);

export function addBloodPuddle(x,z){
  const puddle=new THREE.Group();
  const main=new THREE.Mesh(bloodGeo,bloodMat.clone());
  main.rotation.x=-Math.PI/2;
  main.scale.set(rand(.55,1.25),rand(.38,.9),1);
  main.position.y=.018;
  puddle.add(main);
  for(let i=0;i<3;i++){
    const spot=new THREE.Mesh(bloodGeo,bloodMat.clone());
    spot.rotation.x=-Math.PI/2;
    spot.scale.set(rand(.12,.34),rand(.08,.24),1);
    spot.position.set(rand(-.75,.75),.02,rand(-.55,.55));
    puddle.add(spot);
  }
  puddle.position.set(x+rand(-.12,.12),0,z+rand(-.12,.12));
  puddle.rotation.y=rand(0,Math.PI*2);
  scene.add(puddle);
  bloodPuddles.push(puddle);
  while(bloodPuddles.length>36)scene.remove(bloodPuddles.shift());
}

function leaveBlood(p){
  if(p.bloodDropped)return;
  p.bloodDropped=true;
  addBloodPuddle(p.g.position.x,p.g.position.z);
}

for(let k=0;k<42;k++){
  const bi=irand(0,N-1),bj=irand(0,N-1);
  peds.push({g:makePed(pick(shirtColors)),block:[bi,bj],corner:irand(0,3),
    dir:Math.random()<.5?1:-1,state:'walk',vel:new THREE.Vector3(),t:0,speed:rand(1,1.8),
    bloodDropped:false});
  const p=peds[k];
  const c=pedCorner(p);p.g.position.set(c[0]+rand(-2,2),0,c[1]+rand(-2,2));
}

export function updatePeds(dt){
  const pp=playerPos();
  const activeCur=cur;
  const danger=state.mode==='car'&&activeCur&&Math.abs(activeCur.speed)>6;
  for(const p of peds){
    if(p.state==='fly'){
      p.g.position.addScaledVector(p.vel,dt);
      p.vel.y-=22*dt;p.g.rotation.x+=9*dt;
      if(p.g.position.y<.35&&p.vel.y<0){
        p.g.position.y=.35;p.state='dead';p.t=0;
        p.g.rotation.set(-Math.PI/2,p.g.rotation.y,0);
        leaveBlood(p);
      }
      continue;
    }
    if(p.state==='dead'){
      p.t+=dt;
      if(p.t>3)setOpacity(p.g,Math.max(0,1-(p.t-3)/.8));
      if(p.t>3.8){
        p.block=[irand(0,N-1),irand(0,N-1)];p.corner=irand(0,3);p.state='walk';
        p.bloodDropped=false;
        p.g.rotation.set(0,0,0);setOpacity(p.g,1);
        const c=pedCorner(p);p.g.position.set(c[0]+rand(-2,2),.0,c[1]+rand(-2,2));
      }
      continue;
    }
    if(danger&&p.g.position.distanceTo(activeCur.g.position)<2.3){
      p.state='fly';
      p.bloodDropped=false;
      const dir=new THREE.Vector3(Math.sin(activeCur.heading),0,Math.cos(activeCur.heading));
      p.vel.copy(dir).multiplyScalar(activeCur.speed*.4)
        .add(new THREE.Vector3(rand(-2,2),rand(5,8),rand(-2,2)));
      state.comboN=state.time-state.lastHit<4?state.comboN+1:1;
      state.lastHit=state.time;
      spawnDrop(p.g.position.x,p.g.position.z,irand(20,80)*state.comboN);
      addWanted(1,'HIT AND RUN! ★'+Math.min(5,Math.floor(state.wanted+1)));
      if(state.comboN>1)message('COMBO x'+state.comboN+'!','var(--pink)');
      thud(Math.abs(activeCur.speed));state.shake=.35;
      continue;
    }
    let tgt;
    if(danger&&p.g.position.distanceTo(activeCur.g.position)<11){
      p.state='flee';
      tgt=new THREE.Vector3().subVectors(p.g.position,activeCur.g.position).setY(0).normalize()
        .multiplyScalar(20).add(p.g.position);
    }else{
      if(p.state==='flee')p.state='walk';
      const c=pedCorner(p);tgt=new THREE.Vector3(c[0],0,c[1]);
    }
    const d=new THREE.Vector3().subVectors(tgt,p.g.position);d.y=0;
    const dist=d.length();
    if(p.state==='walk'&&dist<1){p.corner=(p.corner+p.dir+4)%4;continue;}
    d.normalize();
    const spd=p.state==='flee'?5.5:p.speed;
    p.g.position.addScaledVector(d,spd*dt);
    collideStatics(p.g.position,.4);
    p.g.rotation.y=Math.atan2(d.x,d.z);
    p.t+=dt*spd*2.2;
    p.g.position.y=Math.abs(Math.sin(p.t))*.07;
  }
}

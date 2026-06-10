import * as THREE from 'three';
import {N,nodeX,irand,rand} from './constants.js';
import {state,saveBest} from './state.js';
import {scene} from './engine.js';
import {blip} from './audio.js';
import {message} from './hud.js';
import {playerPos} from './player.js';

// Money pickups
export const drops=[];
const dropG=new THREE.BoxGeometry(.5,.5,.5);
const dropM=new THREE.MeshBasicMaterial({color:0x4dff7a});
export function spawnDrop(x,z,val){
  const m=new THREE.Mesh(dropG,dropM);m.position.set(x,.5,z);scene.add(m);
  drops.push({g:m,val,t:0});
}

const MISSIONS=[
  {title:'COMMITTEE FEE',desc:'The inquiry chair got an "institutional thank-you" from the people he was supposed to investigate. He calls it consulting. The penal code calls it something else. Quiet drop: ring the bell, leave it, vanish.',reward:210},
  {title:'SHADOW CAMPAIGN CASH',desc:"A campaign donation that legally does not exist for a candidate who officially never asked. The money came from a shell company owned by the treasurer's brother-in-law. Democracy is expensive.",reward:195},
  {title:'OFFSHORE PARADISE',desc:'Holding-company papers from the Cayman Islands, through Panama, into a Miami apartment the senator says he has never visited. Deliver them to a man who does not exist.',reward:230},
  {title:'SCHOOL LUNCH SKIM',desc:"A four-million-dollar food contract for meals that never reached the schools. The supplier is the secretary's wife. The kids eat crackers. The aide eats sushi. Drop off the change.",reward:175},
  {title:'PORK BARREL PACKAGE',desc:'Federal money for a nonprofit at an empty address in a neighborhood the congressman has never entered. The beneficiary is thankful. The taxpayer has no idea. Take this envelope there.',reward:185},
  {title:'FIXED BID',desc:'Five different companies, one address, one accountant, one handwriting style on every proposal. The winner was picked before the envelopes opened. Deliver the congratulations.',reward:200},
  {title:'PUBLIC TRAVEL RECEIPT',desc:"A state employee on official business stayed at the only hotel in town owned by the mayor's brother, billed at $1,200 a night. Get the receipt signed before the audit.",reward:165},
  {title:'JUDGE DOSSIER',desc:'The magistrate requested "research material" on the defendant. It came from a private investigator hired by the other side. The ruling is due soon. Do not read it, just deliver it.',reward:220},
  {title:'STATE FUEL',desc:`Two hundred liters of public gasoline went into the deputy secretary's private car, his wife's car, and the family ranch generator. Bring the voucher for signature. "Official travel."`,reward:170},
  {title:'GHOST CONTRACT',desc:"A company opened three weeks ago, with no staff, no office, no history, and an eight-million-dollar city contract. The owner is 22 and the councilman's godson. Deliver the first installment.",reward:240},
  {title:'UNFINISHED BRIDGE',desc:'The same governor inaugurated the bridge twice, in two different terms, and it still is not finished. The budget tripled. The contractor donated to the campaign. Bring the third bid invoice.',reward:190},
  {title:'VIP CONFERENCE',desc:'First-class flight, five-star hotel, "representation" allowances, all for an international conference the deputy attended for three hours before flying home. Deliver the receipt.',reward:180},
  {title:'DECLARED SHACK',desc:'A $3.2 million mansion was declared as a two-room wooden house on the official asset form. Property tax was paid with a corporate card. Get the deeds to the lawyer before filing time.',reward:215},
  {title:'SOCIAL PROJECT',desc:'A nonprofit with no office, staff, or activity got $600,000 to "train young people." The only person trained was its president, who bought a new pickup. Deliver the activity report.',reward:185},
  {title:'COURT DEAL',desc:`Three justices, two deciding votes, and a ruling nobody understands but everybody recognizes. The lawyer needs the "support material" before tomorrow's session. Do not ask what it is.`,reward:225},
  {title:'HEALTH BUDGET',desc:'Ventilators bought for $40,000 each when they cost $8,000 on the market. The manufacturer registered the day before the bid. Approved during a pandemic. Deliver the "technical" manuals.',reward:210},
];

export let curMission=null;
let missionPool=[];
function nextMission(){
  if(missionPool.length===0){
    missionPool=MISSIONS.map((_,i)=>i);
    for(let i=missionPool.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [missionPool[i],missionPool[j]]=[missionPool[j],missionPool[i]];
    }
  }
  return MISSIONS[missionPool.pop()];
}

export let delivery=null;
export function spawnDelivery(){
  if(delivery){scene.remove(delivery.g,delivery.beacon);}
  const px=playerPos();let x,z,tries=0;
  do{x=nodeX(irand(0,N))+rand(-3.5,3.5);z=nodeX(irand(0,N))+rand(-3.5,3.5);tries++;}
  while(Math.hypot(x-px.x,z-px.z)<90&&tries<30);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.2,.25,8,28),
    new THREE.MeshBasicMaterial({color:0x19e3ff}));
  ring.rotation.x=Math.PI/2;ring.position.set(x,.4,z);scene.add(ring);
  const beacon=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.4,60,12,1,true),
    new THREE.MeshBasicMaterial({color:0x19e3ff,transparent:true,opacity:.16,
      side:THREE.DoubleSide,depthWrite:false}));
  beacon.position.set(x,30,z);scene.add(beacon);
  curMission=nextMission();
  delivery={g:ring,beacon,x,z,t0:state.time};
  setMissionHUD();
}

export function setMissionHUD(){
  const mb=document.getElementById('missionblock');
  if(!curMission||!state.started){mb.style.display='none';return;}
  document.getElementById('mission-title').textContent=curMission.title;
  document.getElementById('mission-desc').textContent=curMission.desc;
  document.getElementById('mission-val').textContent='$'+curMission.reward+'+';
  mb.style.display='block';
}

// Navigation arrow
export const navArrow=new THREE.Group();
{
  const cone=new THREE.Mesh(new THREE.ConeGeometry(.45,1.3,6),
    new THREE.MeshBasicMaterial({color:0x19e3ff,transparent:true,opacity:.85}));
  cone.rotation.x=Math.PI/2;navArrow.add(cone);
  navArrow.visible=false;scene.add(navArrow);
}

export function updatePickups(dt){
  const pp=playerPos();
  for(let i=drops.length-1;i>=0;i--){
    const d=drops[i];d.t+=dt;
    d.g.rotation.y+=3*dt;d.g.position.y=.5+Math.sin(d.t*4)*.12;
    if(d.t>25){scene.remove(d.g);drops.splice(i,1);continue;}
    if(pp.distanceTo(d.g.position)<2.6){
      state.money+=d.val;blip([660,990],0.07,'sine',.15);
      scene.remove(d.g);drops.splice(i,1);saveBest();
    }
  }
  if(delivery){
    delivery.g.rotation.z+=2*dt;
    const sc=1+Math.sin(state.time*4)*.12;delivery.g.scale.set(sc,sc,1);
    navArrow.visible=true;
    navArrow.position.set(pp.x,4.4+Math.sin(state.time*3)*.25,pp.z);
    navArrow.lookAt(delivery.x,navArrow.position.y,delivery.z);
    if(Math.hypot(pp.x-delivery.x,pp.z-delivery.z)<3.2){
      const base=curMission?curMission.reward:150;
      const fast=Math.max(0,Math.round(120-(state.time-delivery.t0)*4));
      state.money+=base+fast;state.deliveries++;
      message(fast>0?`DELIVERY +$${base+fast} - SPEED BONUS!`:`DELIVERY COMPLETE  +$${base}`,'var(--gold)');
      blip([523,659,784,1047],0.09,'sine',.18);
      saveBest();spawnDelivery();
    }
  }
}

import * as THREE from 'three';
import {state} from './state.js';
import {scene} from './engine.js';

// Shrinks the top face of a box toward the center — turns boxes into
// trapezoids (beveled body, slanted windshield/rear window)
function taperTop(geo,sx,sz){
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
    if(p.getY(i)>0){p.setX(i,p.getX(i)*sx);p.setZ(i,p.getZ(i)*sz);}
  }
  geo.computeVertexNormals();
  return geo;
}

// Shared geometries/materials — every car reuses the same shapes
const bodyG=taperTop(new THREE.BoxGeometry(2,.5,4.25),.94,.97);
const cabG=taperTop(new THREE.BoxGeometry(1.72,.5,2.3),.78,.55);
const hoodG=new THREE.BoxGeometry(1.78,.14,1.15);
const trunkG=new THREE.BoxGeometry(1.78,.13,.78);
const roofG=new THREE.BoxGeometry(1.34,.06,1.26);
const bumperG=new THREE.BoxGeometry(2.04,.18,.24);
const grilleG=new THREE.BoxGeometry(.95,.15,.06);
const plateG=new THREE.BoxGeometry(.52,.17,.03);
const mirrorG=new THREE.BoxGeometry(.16,.1,.07);
const exhaustG=new THREE.CylinderGeometry(.05,.05,.2,6);
const wheelG=new THREE.CylinderGeometry(.42,.42,.34,12);
const hlG=new THREE.BoxGeometry(.32,.15,.07);
const tlG=new THREE.BoxGeometry(.36,.13,.07);

const tireM=new THREE.MeshStandardMaterial({color:0x14121a,roughness:.95});
const hubM=new THREE.MeshStandardMaterial({color:0xb9bec9,roughness:.3,metalness:.85});
const darkM=new THREE.MeshStandardMaterial({color:0x1a1d24,roughness:.6,metalness:.25});
const glassM=new THREE.MeshStandardMaterial({color:0x8fc3e0,roughness:.08,metalness:.6});
const plateM=new THREE.MeshStandardMaterial({color:0xe8e9e2,roughness:.7});
const paintCache=new Map();
function paintFor(color){
  if(!paintCache.has(color))
    paintCache.set(color,new THREE.MeshStandardMaterial({color,roughness:.3,metalness:.5}));
  return paintCache.get(color);
}

export function makeCar(color,police){
  const g=new THREE.Group();
  const paint=paintFor(color);

  const body=new THREE.Mesh(bodyG,paint);
  body.position.y=.62;body.castShadow=true;g.add(body);

  const hood=new THREE.Mesh(hoodG,paint);
  hood.position.set(0,.9,1.42);hood.rotation.x=.05;hood.castShadow=true;g.add(hood);
  const trunk=new THREE.Mesh(trunkG,paint);
  trunk.position.set(0,.89,-1.72);trunk.rotation.x=-.04;g.add(trunk);

  const cab=new THREE.Mesh(cabG,glassM);
  cab.position.set(0,1.08,-.22);cab.castShadow=true;g.add(cab);
  const roof=new THREE.Mesh(roofG,paint);
  roof.position.set(0,1.36,-.22);roof.castShadow=true;g.add(roof);

  for(const bz of[2.12,-2.12]){
    const bmp=new THREE.Mesh(bumperG,darkM);
    bmp.position.set(0,.45,bz);g.add(bmp);
  }
  const grille=new THREE.Mesh(grilleG,darkM);
  grille.position.set(0,.68,2.16);g.add(grille);
  const plate=new THREE.Mesh(plateG,plateM);
  plate.position.set(0,.52,-2.2);g.add(plate);
  const ex=new THREE.Mesh(exhaustG,hubM);
  ex.rotation.x=Math.PI/2;ex.position.set(-.62,.32,-2.16);g.add(ex);
  for(const sx of[-1.02,1.02]){
    const mir=new THREE.Mesh(mirrorG,paint);
    mir.position.set(sx,1.02,.72);g.add(mir);
  }

  g.userData.wheels=[];g.userData.front=[];
  for(const[sx,sz]of[[1,1.35],[-1,1.35],[1,-1.35],[-1,-1.35]]){
    const wg=new THREE.Group();wg.position.set(sx*.95,.42,sz);wg.rotation.order='YXZ';
    const w=new THREE.Mesh(wheelG,[tireM,hubM,hubM]);
    w.rotation.z=Math.PI/2;w.castShadow=true;wg.add(w);
    g.add(wg);g.userData.wheels.push(wg);
    if(sz>0)g.userData.front.push(wg);
  }

  const hlM=new THREE.MeshBasicMaterial({color:0xfff2c0});
  const tlM=new THREE.MeshBasicMaterial({color:0xa01515});
  g.userData.tailM=tlM;
  for(const sx of[-.72,.72]){
    const hl=new THREE.Mesh(hlG,hlM);
    hl.position.set(sx,.72,2.15);g.add(hl);
    const tl=new THREE.Mesh(tlG,tlM);
    tl.position.set(sx,.74,-2.15);g.add(tl);
  }

  if(police){
    const r=new THREE.Mesh(new THREE.BoxGeometry(.42,.18,.42),
      new THREE.MeshBasicMaterial({color:0xff2222}));
    const b=new THREE.Mesh(new THREE.BoxGeometry(.42,.18,.42),
      new THREE.MeshBasicMaterial({color:0x2266ff}));
    r.position.set(-.28,1.48,-.22);b.position.set(.28,1.48,-.22);
    g.add(r,b);g.userData.bar=[r,b];
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.02,.22,1.4),darkM);
    stripe.position.y=.62;g.add(stripe);
  }
  scene.add(g);
  return g;
}

const pedBodyG=new THREE.CylinderGeometry(.3,.34,.95,7);
const pedHeadG=new THREE.SphereGeometry(.24,8,7);
const pedArmG=new THREE.BoxGeometry(.13,.62,.13);
const pedLegG=new THREE.BoxGeometry(.16,.56,.15);
const skinM=new THREE.MeshStandardMaterial({color:0xd9a06b,roughness:.9,transparent:true});
const pantsM=new THREE.MeshStandardMaterial({color:0x202435,roughness:.9,transparent:true});
export const shirtColors=[0xc23b4e,0x3b7ac2,0xcf9a3a,0x3aa06b,0xd96fae,0xe8e3d2,0x7a4f9e,0x40c8c0];

export function makePed(color){
  const g=new THREE.Group();
  const shirtM=new THREE.MeshStandardMaterial({color,roughness:.9,transparent:true});
  const body=new THREE.Mesh(pedBodyG,
    shirtM);
  body.position.y=.85;body.castShadow=true;g.add(body);
  const head=new THREE.Mesh(pedHeadG,skinM.clone());
  head.position.y=1.55;head.castShadow=true;g.add(head);
  const limbs={};
  for(const side of[-1,1]){
    const arm=new THREE.Group();
    const armMesh=new THREE.Mesh(pedArmG,skinM.clone());
    arm.position.set(side*.39,1.18,0);
    armMesh.position.y=-.31;
    armMesh.castShadow=true;
    arm.add(armMesh);
    g.add(arm);
    limbs[side<0?'leftArm':'rightArm']=arm;

    const leg=new THREE.Group();
    const legMesh=new THREE.Mesh(pedLegG,pantsM.clone());
    leg.position.set(side*.15,.44,0);
    legMesh.position.y=-.28;
    legMesh.castShadow=true;
    leg.add(legMesh);
    g.add(leg);
    limbs[side<0?'leftLeg':'rightLeg']=leg;
  }
  g.userData.limbs=limbs;
  scene.add(g);
  return g;
}

export function animatePed(g,phase=0,amount=0){
  const l=g.userData.limbs;if(!l)return;
  const a=Math.min(1,amount);
  const swing=Math.sin(phase)*.62*a;
  const armSwing=swing*.72;
  l.leftLeg.rotation.x=swing;
  l.rightLeg.rotation.x=-swing;
  l.leftArm.rotation.x=-armSwing;
  l.rightArm.rotation.x=armSwing;
  l.leftArm.rotation.z=.12;
  l.rightArm.rotation.z=-.12;
}

export function setOpacity(g,o){g.traverse(m=>{if(m.material)m.material.opacity=o;});}

export function spinWheels(g,speed,dt,steer=0){
  const u=g.userData;if(!u.wheels)return;
  for(const w of u.wheels)w.rotation.x+=speed*dt/.42;
  for(const w of u.front)w.rotation.y=steer*.38;
}

export function blinkBar(g){
  if(!g.userData.bar)return;
  const on=Math.floor(state.time*5)%2;
  g.userData.bar[0].material.color.setHex(on?0xff2222:0x551111);
  g.userData.bar[1].material.color.setHex(on?0x2255ff:0x111155);
}

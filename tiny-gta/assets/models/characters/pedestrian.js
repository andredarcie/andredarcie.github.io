import * as THREE from 'three';
import {scene} from '../../../js/engine.js';

const pedHeadG=new THREE.SphereGeometry(.24,10,8);
const pedNeckG=new THREE.CylinderGeometry(.08,.09,.16,7);
const pedThoraxG=new THREE.BoxGeometry(.52,.40,.30);
const pedAbdomenG=new THREE.BoxGeometry(.46,.26,.26);
const pedHipG=new THREE.BoxGeometry(.46,.20,.28);
const pedShoulderG=new THREE.SphereGeometry(.105,8,6);
const pedBicepsG=new THREE.BoxGeometry(.12,.30,.12);
const pedElbowG=new THREE.SphereGeometry(.075,7,5);
const pedForearmG=new THREE.BoxGeometry(.10,.26,.10);
const pedPalmG=new THREE.BoxGeometry(.09,.12,.11);
const pedFingersG=new THREE.BoxGeometry(.08,.10,.10);
const pedThumbG=new THREE.BoxGeometry(.035,.075,.04);
const pedThighG=new THREE.BoxGeometry(.17,.30,.18);
const pedKneeG=new THREE.SphereGeometry(.08,7,5);
const pedCalfG=new THREE.BoxGeometry(.13,.18,.14);
const pedFootG=new THREE.BoxGeometry(.18,.09,.28);
const eyeG=new THREE.SphereGeometry(.035,6,4);
const noseG=new THREE.ConeGeometry(.04,.12,6);
const mouthG=new THREE.BoxGeometry(.15,.025,.018);
const browG=new THREE.BoxGeometry(.12,.025,.02);
const beardG=new THREE.SphereGeometry(.18,8,5);
const hairG=new THREE.SphereGeometry(.255,8,5);

const skinColors=[0xf0c08b,0xd9a06b,0xb8754c,0x8f5637,0x6f3e2a];
const pantsColors=[0x202435,0x263454,0x2e2a24,0x3d3f46,0x18191f];
const shoeColors=[0x111117,0x33251e,0xe8e3d2,0x1f2733];
const eyeM=new THREE.MeshBasicMaterial({color:0x101018});
const mouthM=new THREE.MeshBasicMaterial({color:0x6b1220});
const facialHairColors=[0x17100c,0x2a1911,0x4a2b18,0x6b5137,0x0d0d12];
export const shirtColors=[0xc23b4e,0x3b7ac2,0xcf9a3a,0x3aa06b,0xd96fae,0xe8e3d2,0x7a4f9e,0x40c8c0];

function makeMat(color,roughness=.9){
  return new THREE.MeshStandardMaterial({color,roughness,transparent:true});
}

function makeFace(head,skinMat){
  const face=new THREE.Group();
  const hairColor=facialHairColors[Math.floor(Math.random()*facialHairColors.length)];
  const hairM=new THREE.MeshStandardMaterial({color:hairColor,roughness:.95,transparent:true});
  const beardM=new THREE.MeshStandardMaterial({color:hairColor,roughness:.95,transparent:true});
  for(const sx of[-1,1]){
    const eye=new THREE.Mesh(eyeG,eyeM);
    eye.position.set(sx*.085,.045,.225);
    face.add(eye);
    if(Math.random()<.65){
      const brow=new THREE.Mesh(browG,hairM);
      brow.position.set(sx*.085,.105,.22);
      brow.rotation.z=-sx*Math.random()*.25;
      face.add(brow);
    }
  }
  const nose=new THREE.Mesh(noseG,skinMat.clone());
  nose.position.set(0,-.015,.255);
  nose.rotation.x=Math.PI/2;
  nose.scale.setScalar(.85+Math.random()*.45);
  face.add(nose);
  const mouth=new THREE.Mesh(mouthG,mouthM);
  mouth.position.set(0,-.12,.228);
  mouth.scale.x=.75+Math.random()*.55;
  face.add(mouth);
  head.userData.mouth=mouth;
  if(Math.random()<.58){
    const beard=new THREE.Mesh(beardG,beardM);
    beard.position.set(0,-.115,.165);
    beard.scale.set(.82+Math.random()*.35,.42+Math.random()*.3,.26);
    face.add(beard);
  }
  if(Math.random()<.74){
    const hair=new THREE.Mesh(hairG,hairM);
    hair.position.set(0,.13,-.005);
    hair.scale.set(1.02,.42+Math.random()*.22,1);
    face.add(hair);
  }
  head.add(face);
}

export function makePed(color,pantsColor){
  const g=new THREE.Group();
  const skinMat=makeMat(skinColors[Math.floor(Math.random()*skinColors.length)]);
  const shirtM=makeMat(color);
  const pantsM=makeMat(pantsColor??pantsColors[Math.floor(Math.random()*pantsColors.length)]);
  const shoeM=makeMat(shoeColors[Math.floor(Math.random()*shoeColors.length)],.82);
  const bodyScale=.92+Math.random()*.18;

  const hip=new THREE.Mesh(pedHipG,pantsM);
  hip.position.y=.55;hip.scale.x=bodyScale;hip.castShadow=true;g.add(hip);
  const abdomen=new THREE.Mesh(pedAbdomenG,shirtM);
  abdomen.position.y=.78;abdomen.scale.x=.94*bodyScale;abdomen.castShadow=true;g.add(abdomen);
  const thorax=new THREE.Mesh(pedThoraxG,shirtM);
  thorax.position.y=1.11;
  thorax.scale.set(bodyScale,.95+Math.random()*.12,.92+Math.random()*.16);
  thorax.castShadow=true;g.add(thorax);

  const neck=new THREE.Mesh(pedNeckG,skinMat);
  neck.position.y=1.37;neck.castShadow=true;g.add(neck);
  const head=new THREE.Mesh(pedHeadG,skinMat.clone());
  head.position.y=1.62;head.castShadow=true;
  head.scale.set(1+Math.random()*.14,.92+Math.random()*.18,1+Math.random()*.08);
  g.add(head);
  makeFace(head,skinMat);
  g.userData.head=head;
  g.userData.mouth=head.userData.mouth;

  const limbs={};
  for(const side of[-1,1]){
    const arm=new THREE.Group();
    arm.position.set(side*.34*bodyScale,1.26,0);
    const shoulder=new THREE.Mesh(pedShoulderG,shirtM);
    const biceps=new THREE.Mesh(pedBicepsG,shirtM);
    biceps.position.y=-.16;
    shoulder.castShadow=true;biceps.castShadow=true;
    const forearm=new THREE.Group();
    forearm.position.y=-.30;
    const elbow=new THREE.Mesh(pedElbowG,skinMat.clone());
    const foreM=new THREE.Mesh(pedForearmG,skinMat.clone());
    foreM.position.y=-.14;foreM.castShadow=true;
    const hand=new THREE.Group();
    hand.position.y=-.27;
    const palm=new THREE.Mesh(pedPalmG,skinMat.clone());
    palm.position.y=-.05;
    const fingers=new THREE.Mesh(pedFingersG,skinMat.clone());
    fingers.position.y=-.15;
    const thumb=new THREE.Mesh(pedThumbG,skinMat.clone());
    thumb.position.set(-side*.06,-.06,.04);
    hand.add(palm,fingers,thumb);
    forearm.add(elbow,foreM,hand);
    arm.add(shoulder,biceps,forearm);
    g.add(arm);
    limbs[side<0?'leftArm':'rightArm']=arm;
    limbs[side<0?'leftForearm':'rightForearm']=forearm;

    const leg=new THREE.Group();
    leg.position.set(side*.15,.52,0);
    const thigh=new THREE.Mesh(pedThighG,pantsM);
    thigh.position.y=-.16;thigh.castShadow=true;
    const calf=new THREE.Group();
    calf.position.y=-.30;
    const knee=new THREE.Mesh(pedKneeG,pantsM);
    const calfM=new THREE.Mesh(pedCalfG,pantsM);
    calfM.position.y=-.10;calfM.castShadow=true;
    const foot=new THREE.Mesh(pedFootG,shoeM);
    foot.position.set(0,-.185,.05);foot.castShadow=true;
    calf.add(knee,calfM,foot);
    leg.add(thigh,calf);
    g.add(leg);
    limbs[side<0?'leftLeg':'rightLeg']=leg;
    limbs[side<0?'leftCalf':'rightCalf']=calf;
  }
  g.userData.limbs=limbs;
  scene.add(g);
  return g;
}

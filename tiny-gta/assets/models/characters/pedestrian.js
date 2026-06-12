import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scene} from '../../../js/engine.js';

// Pedestre otimizado: cada segmento que se move junto vira UM mesh fundido com
// vertex colors (tronco+cabeça+rosto = 1, braço = 1, antebraço+mão = 1, coxa = 1,
// panturrilha+pé = 1) — ~10 meshes/ped em vez de ~38, e UM material por ped em
// vez de dezenas de clones. A hierarquia de grupos e o userData.limbs continuam
// idênticos: animatePed, poses de motorista/arma e attachGun não mudam.
// A boca fica num mesh próprio porque story.js anima scale.y dela na fala.

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
const facialHairColors=[0x17100c,0x2a1911,0x4a2b18,0x6b5137,0x0d0d12];
export const shirtColors=[0xc23b4e,0x3b7ac2,0xcf9a3a,0x3aa06b,0xd96fae,0xe8e3d2,0x7a4f9e,0x40c8c0];

const EYE_COLOR=0x101018,MOUTH_COLOR=0x6b1220;

const _p=new THREE.Vector3(),_q=new THREE.Quaternion(),_s=new THREE.Vector3(),
  _e=new THREE.Euler(),_c=new THREE.Color();

function partM(p,r,s){
  return new THREE.Matrix4().compose(
    _p.set(p[0],p[1],p[2]),
    _q.setFromEuler(_e.set(r?r[0]:0,r?r[1]:0,r?r[2]:0)),
    _s.set(s?s[0]:1,s?s[1]:1,s?s[2]:1));
}

// Clona a geometria base já transformada e com a cor cozida por vértice
function tinted(geo,m,c){
  const g=geo.clone();
  g.applyMatrix4(m);
  _c.set(c);
  const n=g.attributes.position.count,col=new Float32Array(n*3);
  for(let i=0;i<n;i++){col[i*3]=_c.r;col[i*3+1]=_c.g;col[i*3+2]=_c.b;}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  return g;
}

function pickOf(arr){return arr[Math.floor(Math.random()*arr.length)];}

export function makePed(color,pantsColor){
  const g=new THREE.Group();
  const skin=pickOf(skinColors);
  const pants=pantsColor??pickOf(pantsColors);
  const shoe=pickOf(shoeColors);
  const hairColor=pickOf(facialHairColors);
  const bodyScale=.92+Math.random()*.18;
  const hsx=1+Math.random()*.14,hsy=.92+Math.random()*.18,hsz=1+Math.random()*.08;

  const mat=new THREE.MeshStandardMaterial({roughness:.9,vertexColors:true});

  // ----- corpo + cabeça + rosto: um mesh só -----
  const headM=partM([0,1.62,0],null,[hsx,hsy,hsz]);
  const onHead=(p,r,s)=>headM.clone().multiply(partM(p,r,s));
  const noseS=.85+Math.random()*.45;
  const bodyParts=[
    tinted(pedHipG,partM([0,.55,0],null,[bodyScale,1,1]),pants),
    tinted(pedAbdomenG,partM([0,.78,0],null,[.94*bodyScale,1,1]),color),
    tinted(pedThoraxG,partM([0,1.11,0],null,
      [bodyScale,.95+Math.random()*.12,.92+Math.random()*.16]),color),
    tinted(pedNeckG,partM([0,1.37,0]),skin),
    tinted(pedHeadG,headM,skin),
    tinted(noseG,onHead([0,-.015,.255],[Math.PI/2,0,0],[noseS,noseS,noseS]),skin),
  ];
  for(const sx of[-1,1]){
    bodyParts.push(tinted(eyeG,onHead([sx*.085,.045,.225]),EYE_COLOR));
    if(Math.random()<.65)bodyParts.push(tinted(browG,
      onHead([sx*.085,.105,.22],[0,0,-sx*Math.random()*.25]),hairColor));
  }
  if(Math.random()<.58)bodyParts.push(tinted(beardG,
    onHead([0,-.115,.165],null,[.82+Math.random()*.35,.42+Math.random()*.3,.26]),hairColor));
  if(Math.random()<.74)bodyParts.push(tinted(hairG,
    onHead([0,.13,-.005],null,[1.02,.42+Math.random()*.22,1]),hairColor));

  const body=new THREE.Mesh(mergeGeometries(bodyParts,false),mat);
  body.castShadow=true;g.add(body);

  // boca separada: story.js anima scale.y enquanto o NPC fala
  const mouthMat=new THREE.MeshBasicMaterial({color:MOUTH_COLOR});
  const mouth=new THREE.Mesh(mouthG,mouthMat);
  mouth.position.set(0,1.62-.12*hsy,.228*hsz);
  mouth.scale.x=(.75+Math.random()*.55)*hsx;
  g.add(mouth);
  g.userData.mouth=mouth;

  // ----- membros: geometria local ao grupo articulado -----
  const armGeo=mergeGeometries([
    tinted(pedShoulderG,partM([0,0,0]),color),
    tinted(pedBicepsG,partM([0,-.16,0]),color),
  ],false);
  const thighGeo=tinted(pedThighG,partM([0,-.16,0]),pants);
  const calfGeo=mergeGeometries([
    tinted(pedKneeG,partM([0,0,0]),pants),
    tinted(pedCalfG,partM([0,-.10,0]),pants),
    tinted(pedFootG,partM([0,-.185,.05]),shoe),
  ],false);

  const limbs={};
  for(const side of[-1,1]){
    const arm=new THREE.Group();
    arm.position.set(side*.34*bodyScale,1.26,0);
    const armMesh=new THREE.Mesh(armGeo,mat);
    arm.add(armMesh);
    const forearm=new THREE.Group();
    forearm.position.y=-.30;
    // mão (palma+dedos+polegar) fundida no antebraço; polegar muda de lado
    const foreGeo=mergeGeometries([
      tinted(pedElbowG,partM([0,0,0]),skin),
      tinted(pedForearmG,partM([0,-.14,0]),skin),
      tinted(pedPalmG,partM([0,-.32,0]),skin),
      tinted(pedFingersG,partM([0,-.42,0]),skin),
      tinted(pedThumbG,partM([-side*.06,-.33,.04]),skin),
    ],false);
    const foreMesh=new THREE.Mesh(foreGeo,mat);
    forearm.add(foreMesh);
    arm.add(forearm);
    g.add(arm);
    limbs[side<0?'leftArm':'rightArm']=arm;
    limbs[side<0?'leftForearm':'rightForearm']=forearm;

    const leg=new THREE.Group();
    leg.position.set(side*.15,.52,0);
    const thighMesh=new THREE.Mesh(thighGeo,mat);
    leg.add(thighMesh);
    const calf=new THREE.Group();
    calf.position.y=-.30;
    const calfMesh=new THREE.Mesh(calfGeo,mat);
    calf.add(calfMesh);
    leg.add(calf);
    g.add(leg);
    limbs[side<0?'leftLeg':'rightLeg']=leg;
    limbs[side<0?'leftCalf':'rightCalf']=calf;
  }
  g.userData.limbs=limbs;
  // fade de morte (setOpacity) mexe só nos materiais DESTE ped — a arma da
  // gangue usa material compartilhado e não pode ser afetada
  g.userData.fadeMats=[mat,mouthMat];
  scene.add(g);
  return g;
}

import * as THREE from 'three';
import {scene} from '../../../js/engine.js';

export function makePlane(){
  const g=new THREE.Group();
  const bodyM=new THREE.MeshStandardMaterial({color:0xe84545,roughness:.5,metalness:.25});
  const trimM=new THREE.MeshStandardMaterial({color:0xf2ead6,roughness:.6});
  const darkM=new THREE.MeshStandardMaterial({color:0x1a1a22,roughness:.4,metalness:.6});
  const fus=new THREE.Mesh(new THREE.CylinderGeometry(.5,.28,5.2,10),bodyM);
  fus.rotation.x=Math.PI/2;fus.position.set(0,1.05,0);fus.castShadow=true;g.add(fus);
  const wind=new THREE.Mesh(new THREE.BoxGeometry(.66,.42,.66),darkM);
  wind.position.set(0,1.58,.78);g.add(wind);
  const wing=new THREE.Mesh(new THREE.BoxGeometry(7.6,.12,1.5),trimM);
  wing.position.set(0,1.18,.55);wing.castShadow=true;g.add(wing);
  const tailw=new THREE.Mesh(new THREE.BoxGeometry(2.7,.1,.8),trimM);
  tailw.position.set(0,1.2,-2.35);tailw.castShadow=true;g.add(tailw);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(.12,1.05,.85),bodyM);
  fin.position.set(0,1.72,-2.42);fin.castShadow=true;g.add(fin);
  const prop=new THREE.Group();
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.3,8),darkM);
  hub.rotation.x=Math.PI/2;prop.add(hub);
  for(const r of[0,Math.PI/2]){
    const blade=new THREE.Mesh(new THREE.BoxGeometry(.13,1.95,.05),darkM);
    blade.rotation.z=r;prop.add(blade);
  }
  prop.position.set(0,1.05,2.72);g.add(prop);g.userData.prop=prop;
  const wheelM=new THREE.MeshStandardMaterial({color:0x14141a,roughness:.9});
  for(const[wx,wz]of[[-.95,.7],[.95,.7],[0,-2.25]]){
    const wh=new THREE.Mesh(new THREE.CylinderGeometry(.26,.26,.2,10),wheelM);
    wh.rotation.z=Math.PI/2;wh.position.set(wx,.26,wz);g.add(wh);
    const strut=new THREE.Mesh(new THREE.BoxGeometry(.09,.62,.09),darkM);
    strut.position.set(wx,.55,wz);g.add(strut);
  }
  scene.add(g);
  return g;
}

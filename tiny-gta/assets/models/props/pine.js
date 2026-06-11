import * as THREE from 'three';
import {scene} from '../../../js/engine.js';
import {rand,groundHeight} from '../../../js/constants.js';

const pineLeafM=new THREE.MeshStandardMaterial({color:0x2e7a44,roughness:1});
const pineTrunkM=new THREE.MeshStandardMaterial({color:0x7a5a3e,roughness:1});

export function addPine(px,pz){
  const g=new THREE.Group(),h=rand(2.2,3.6);
  const tr=new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,h*.5,5),pineTrunkM);
  tr.position.y=h*.25;tr.castShadow=true;g.add(tr);
  for(let k=0;k<2;k++){
    const cone=new THREE.Mesh(new THREE.ConeGeometry(.9-k*.3,h*.6,7),pineLeafM);
    cone.position.y=h*.45+k*h*.32;cone.castShadow=true;g.add(cone);
  }
  g.position.set(px,groundHeight(px,pz)-.02,pz);scene.add(g);
  return g;
}

import * as THREE from 'three';
import {bakeProp} from './prop-merge.js';
import {rand} from '../../../js/constants.js';

const palmLeafMat=new THREE.MeshStandardMaterial({color:0x3aa856,roughness:1});
const palmTrunkMat=new THREE.MeshStandardMaterial({color:0x96704e,roughness:1});

export function addPalm(x,z){
  const g=new THREE.Group(),h=rand(4,6);
  const tr=new THREE.Mesh(new THREE.CylinderGeometry(.16,.26,h,5),palmTrunkMat);
  tr.position.y=h/2;tr.castShadow=true;g.add(tr);
  for(let k=0;k<6;k++){
    const leaf=new THREE.Mesh(new THREE.BoxGeometry(2.4,.08,.55),palmLeafMat);
    leaf.position.y=h;leaf.rotation.y=k*Math.PI/3;leaf.rotation.z=-.42;
    leaf.geometry.translate?.(0,0,0);leaf.translateX(1.0);leaf.castShadow=true;g.add(leaf);
  }
  g.position.set(x,0,z);bakeProp(g);
  return g;
}

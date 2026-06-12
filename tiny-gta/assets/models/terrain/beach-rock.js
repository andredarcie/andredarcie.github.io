import * as THREE from 'three';
import {bakeProp} from '../props/prop-merge.js';
import {rand} from '../../../js/constants.js';

const rockM=new THREE.MeshStandardMaterial({color:0x8d8f99,roughness:.95});

export function addBeachRock(x,z,scale){
  const rk=new THREE.Mesh(new THREE.DodecahedronGeometry(scale,0),rockM);
  rk.position.set(x,-.12,z);
  rk.rotation.set(rand(0,3),rand(0,3),rand(0,3));
  rk.castShadow=true;bakeProp(rk);
  return rk;
}

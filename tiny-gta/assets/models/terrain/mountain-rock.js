import * as THREE from 'three';
import {bakeProp} from '../props/prop-merge.js';
import {rand,groundHeight} from '../../../js/constants.js';

const rockM=new THREE.MeshStandardMaterial({color:0x84868f,roughness:.95});

export function addMountainRock(x,z,scale){
  const rk=new THREE.Mesh(new THREE.DodecahedronGeometry(scale,0),rockM);
  rk.position.set(x,groundHeight(x,z)+.1,z);
  rk.rotation.set(rand(0,3),rand(0,3),rand(0,3));
  rk.castShadow=true;bakeProp(rk);
  return rk;
}

import * as THREE from 'three';
import {scene} from '../../../js/engine.js';
import {rand,groundHeight} from '../../../js/constants.js';

export function addMountainRock(x,z,scale){
  const rk=new THREE.Mesh(new THREE.DodecahedronGeometry(scale,0),
    new THREE.MeshStandardMaterial({color:0x84868f,roughness:.95}));
  rk.position.set(x,groundHeight(x,z)+.1,z);
  rk.rotation.set(rand(0,3),rand(0,3),rand(0,3));
  rk.castShadow=true;scene.add(rk);
  return rk;
}

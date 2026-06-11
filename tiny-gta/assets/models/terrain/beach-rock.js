import * as THREE from 'three';
import {scene} from '../../../js/engine.js';
import {rand} from '../../../js/constants.js';

export function addBeachRock(x,z,scale){
  const rk=new THREE.Mesh(new THREE.DodecahedronGeometry(scale,0),
    new THREE.MeshStandardMaterial({color:0x8d8f99,roughness:.95}));
  rk.position.set(x,-.12,z);
  rk.rotation.set(rand(0,3),rand(0,3),rand(0,3));
  rk.castShadow=true;scene.add(rk);
  return rk;
}

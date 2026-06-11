import * as THREE from 'three';

export function makeSkyDome(skyTex){
  return new THREE.Mesh(new THREE.SphereGeometry(900,24,16),
    new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide,fog:false}));
}

import * as THREE from 'three';

export function makeStoryGem(color){
  return new THREE.Mesh(new THREE.OctahedronGeometry(.44,1),
    new THREE.MeshBasicMaterial({color}));
}

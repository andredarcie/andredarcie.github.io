import * as THREE from 'three';

export function makeStoryBox(color){
  return new THREE.Mesh(new THREE.BoxGeometry(.62,.42,.42),
    new THREE.MeshBasicMaterial({color}));
}

import * as THREE from 'three';

const dropG=new THREE.BoxGeometry(.5,.5,.5);
const dropM=new THREE.MeshBasicMaterial({color:0x4dff7a});

export function makeMoneyDrop(){
  return new THREE.Mesh(dropG,dropM);
}

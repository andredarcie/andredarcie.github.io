import * as THREE from 'three';

export function makeStoryBeacon(color){
  const bm=new THREE.MeshBasicMaterial({color,transparent:true,
    opacity:.07,side:THREE.DoubleSide,depthWrite:false});
  return new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,36,8,1,true),bm);
}

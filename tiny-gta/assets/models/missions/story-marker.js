import * as THREE from 'three';

export function makeStoryMarker(color){
  const mat=new THREE.MeshBasicMaterial({color});
  const marker=new THREE.Mesh(new THREE.OctahedronGeometry(.52,0),mat);
  return{marker,mat};
}

import * as THREE from 'three';

export function makeStoryArrow(){
  const material=new THREE.MeshBasicMaterial({color:0xffd24a,transparent:true,opacity:.85});
  const arrow=new THREE.Group();
  const cone=new THREE.Mesh(new THREE.ConeGeometry(.45,1.3,6),material);
  cone.rotation.x=Math.PI/2;
  arrow.add(cone);
  return{arrow,material};
}

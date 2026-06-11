import * as THREE from 'three';

export function makeTexturedPlane(sizeOrW,sizeOrD,texture,y=0){
  const w=sizeOrW,d=sizeOrD??sizeOrW;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,d),
    new THREE.MeshStandardMaterial({map:texture,roughness:1}));
  mesh.rotation.x=-Math.PI/2;
  mesh.position.y=y;
  mesh.receiveShadow=true;
  return mesh;
}

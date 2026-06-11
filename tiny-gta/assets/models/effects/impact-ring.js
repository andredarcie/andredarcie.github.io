import * as THREE from 'three';

export function makeImpactRing(radius,color){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.025,6,18),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false}));
  ring.rotation.x=Math.PI/2;
  return ring;
}

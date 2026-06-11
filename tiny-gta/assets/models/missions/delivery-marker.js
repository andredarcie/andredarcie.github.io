import * as THREE from 'three';

export function makeDeliveryMarker(color=0x19e3ff){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.2,.25,8,28),
    new THREE.MeshBasicMaterial({color}));
  ring.rotation.x=Math.PI/2;
  const beacon=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.4,60,12,1,true),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:.16,
      side:THREE.DoubleSide,depthWrite:false}));
  return{ring,beacon};
}

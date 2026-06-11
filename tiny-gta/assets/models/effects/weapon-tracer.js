import * as THREE from 'three';

const weaponTracerMat=new THREE.LineBasicMaterial({color:0xfff2b0,transparent:true,opacity:.9});

export function makeWeaponTracerLine(a,b){
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),weaponTracerMat.clone());
}

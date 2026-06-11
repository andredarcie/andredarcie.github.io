import * as THREE from 'three';

const gangTracerMat=new THREE.LineBasicMaterial({color:0xffd9a8,transparent:true,opacity:.9});

export function makeGangTracerLine(a,b){
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),gangTracerMat.clone());
}

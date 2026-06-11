import * as THREE from 'three';
import {scene} from '../../../js/engine.js';

function squareRing(half,thick){
  const sh=new THREE.Shape();
  sh.moveTo(-half-thick,-half-thick);sh.lineTo(half+thick,-half-thick);
  sh.lineTo(half+thick,half+thick);sh.lineTo(-half-thick,half+thick);sh.closePath();
  const hole=new THREE.Path();
  hole.moveTo(-half,-half);hole.lineTo(half,-half);
  hole.lineTo(half,half);hole.lineTo(-half,half);
  sh.holes.push(hole);
  return new THREE.ShapeGeometry(sh);
}

export function addShallowsAndWaves(groundHalf,beach){
  const sw=new THREE.Mesh(squareRing(groundHalf+beach-2,16),
    new THREE.MeshBasicMaterial({color:0x55d8d8,transparent:true,opacity:.45,depthWrite:false}));
  sw.rotation.x=-Math.PI/2;sw.position.y=-.305;scene.add(sw);
  const sw2=new THREE.Mesh(squareRing(groundHalf+beach+14,18),
    new THREE.MeshBasicMaterial({color:0x3fc2cf,transparent:true,opacity:.25,depthWrite:false}));
  sw2.rotation.x=-Math.PI/2;sw2.position.y=-.305;scene.add(sw2);
  const waves=[];
  for(let k=0;k<3;k++){
    const m=new THREE.Mesh(squareRing(groundHalf+beach-3,2.4),
      new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.2,depthWrite:false}));
    m.rotation.x=-Math.PI/2;m.position.y=-.045+k*.004;
    scene.add(m);
    waves.push({m,ph:k*2.1,spd:.55+k*.12,amp:.012+k*.004});
  }
  return waves;
}

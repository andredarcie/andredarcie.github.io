import * as THREE from 'three';
import {scene} from '../../../js/engine.js';

export function addSummitFlag(x,y,z){
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,4.6,6),
    new THREE.MeshStandardMaterial({color:0xd8dde6,roughness:.5}));
  pole.position.set(x,y+2.3,z);pole.castShadow=true;scene.add(pole);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1),
    new THREE.MeshBasicMaterial({color:0xff2e88,side:THREE.DoubleSide}));
  flag.position.set(x+.9,y+4.1,z);scene.add(flag);
  return{pole,flag};
}

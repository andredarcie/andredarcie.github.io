import * as THREE from 'three';
import {bakeProp} from '../props/prop-merge.js';
import {rand} from '../../../js/constants.js';

const hayM=new THREE.MeshStandardMaterial({color:0xd9b25e,roughness:1});
const hayG=new THREE.CylinderGeometry(.55,.55,.9,9);

export function addHayBales(){
  const spots=[[214,30],[238,48],[228,-40],[212,-52],[278,52],[296,70],[272,-62],[288,-78]];
  for(const[hx,hz]of spots){
    const hay=new THREE.Mesh(hayG,hayM);
    hay.rotation.z=Math.PI/2;hay.rotation.y=rand(0,3);
    hay.position.set(hx,.55,hz);hay.castShadow=true;bakeProp(hay);
  }
}

import * as THREE from 'three';
import {scene} from '../../../js/engine.js';

export function makeHeli(){
  const g=new THREE.Group();
  const bodyM=new THREE.MeshStandardMaterial({color:0x2b3a6e,roughness:.4,metalness:.3});
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.7,1.3,3.6),bodyM);
  body.castShadow=true;g.add(body);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,3),bodyM);
  tail.position.set(0,.25,-3);g.add(tail);
  const rotor=new THREE.Mesh(new THREE.BoxGeometry(7.5,.08,.4),
    new THREE.MeshStandardMaterial({color:0x222222}));
  rotor.position.y=.85;g.add(rotor);g.userData.rotor=rotor;
  const skidM=new THREE.MeshStandardMaterial({color:0x444a58});
  for(const sx of[-.8,.8]){
    const sk=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,3),skidM);
    sk.position.set(sx,-.85,0);g.add(sk);
  }
  const spot=new THREE.SpotLight(0xfff8d0,2600,90,.32,.5,1.8);
  spot.position.set(0,-.6,0);g.add(spot);
  scene.add(spot.target);g.userData.spot=spot;
  scene.add(g);
  return g;
}

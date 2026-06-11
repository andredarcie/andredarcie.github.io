import * as THREE from 'three';
import {scene} from '../../../js/engine.js';

export function addLifeguard(x0,z0,ry){
  const g=new THREE.Group();
  const woodM=new THREE.MeshStandardMaterial({color:0xc9885a,roughness:.9});
  for(const[lx,lz]of[[-1,-1],[1,-1],[-1,1],[1,1]]){
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.16,2.2,.16),woodM);
    leg.position.set(lx*.85,1.1,lz*.85);leg.castShadow=true;g.add(leg);
  }
  const plat=new THREE.Mesh(new THREE.BoxGeometry(2.3,.12,2.3),woodM);
  plat.position.y=2.2;plat.castShadow=true;g.add(plat);
  const hut=new THREE.Mesh(new THREE.BoxGeometry(1.9,1.3,1.9),
    new THREE.MeshStandardMaterial({color:0xffd24a,roughness:.8}));
  hut.position.y=2.95;hut.castShadow=true;g.add(hut);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(1.7,.7,4),
    new THREE.MeshStandardMaterial({color:0xff2e88,roughness:.8}));
  roof.position.y=3.95;roof.rotation.y=Math.PI/4;roof.castShadow=true;g.add(roof);
  g.position.set(x0,-.06,z0);g.rotation.y=ry;scene.add(g);
  return g;
}

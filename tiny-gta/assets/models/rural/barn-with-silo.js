import * as THREE from 'three';
import {scene} from '../../../js/engine.js';

export function addBarnWithSilo(solids){
  const barnM=new THREE.MeshStandardMaterial({color:0xb03a2e,roughness:.95});
  const barn=new THREE.Mesh(new THREE.BoxGeometry(7,3.4,5),barnM);
  barn.position.set(250,1.68,-34);barn.castShadow=true;barn.receiveShadow=true;scene.add(barn);
  const broof=new THREE.Mesh(new THREE.ConeGeometry(4.6,2,4),
    new THREE.MeshStandardMaterial({color:0x6e5a50,roughness:.9}));
  broof.position.set(250,4.4,-34);broof.rotation.y=Math.PI/4;broof.castShadow=true;scene.add(broof);
  const trim=new THREE.Mesh(new THREE.BoxGeometry(2.2,2.2,.08),
    new THREE.MeshStandardMaterial({color:0xf2ead6,roughness:.9}));
  trim.position.set(250,1.5,-31.45);scene.add(trim);
  solids.push({x0:246.2,x1:253.8,z0:-36.8,z1:-31.2,h:5.5});

  const silo=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,6,10),
    new THREE.MeshStandardMaterial({color:0xc9cdd6,roughness:.6}));
  silo.position.set(257,3,-32);silo.castShadow=true;scene.add(silo);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1.5,10,6,0,Math.PI*2,0,Math.PI/2),
    new THREE.MeshStandardMaterial({color:0x9aa0ad,roughness:.6}));
  dome.position.set(257,6,-32);scene.add(dome);
  solids.push({x0:255.4,x1:258.6,z0:-33.6,z1:-30.4,h:7.5});
}

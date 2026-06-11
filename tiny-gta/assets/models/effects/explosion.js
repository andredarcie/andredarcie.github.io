import * as THREE from 'three';

export function makeExplosionModel(){
  const g=new THREE.Group();
  const fire=new THREE.Mesh(new THREE.SphereGeometry(1.1,14,10),
    new THREE.MeshBasicMaterial({color:0xff6a00,transparent:true,opacity:.88}));
  const core=new THREE.Mesh(new THREE.SphereGeometry(.55,12,8),
    new THREE.MeshBasicMaterial({color:0xfff0a0,transparent:true,opacity:.95}));
  const smoke=new THREE.Mesh(new THREE.SphereGeometry(1.8,12,8),
    new THREE.MeshBasicMaterial({color:0x24172a,transparent:true,opacity:.35}));
  g.add(smoke,fire,core);
  return g;
}

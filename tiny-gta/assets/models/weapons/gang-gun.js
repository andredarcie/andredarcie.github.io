import * as THREE from 'three';

const gunM=new THREE.MeshStandardMaterial({color:0x15121a,roughness:.5,metalness:.7});

export function makeGangGun(){
  const gun=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(.1,.13,.34),gunM);
  const barrel=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.22),gunM);
  barrel.position.set(0,.04,.26);
  gun.add(body,barrel);
  gun.position.set(0,-.62,.14);
  return gun;
}

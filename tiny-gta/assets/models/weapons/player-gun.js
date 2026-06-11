import * as THREE from 'three';

const gunMat=new THREE.MeshStandardMaterial({color:0x15121a,roughness:.45,metalness:.8});
const gunDarkMat=new THREE.MeshStandardMaterial({color:0x07070b,roughness:.35,metalness:.9});
const glowMat=new THREE.MeshBasicMaterial({color:0xffd24a,transparent:true,opacity:.25});

export function makeGunModel({pickup=false}={}){
  const g=new THREE.Group();
  const slide=new THREE.Mesh(new THREE.BoxGeometry(.54,.13,.34),gunDarkMat);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(.46,.13,.28),gunMat);
  const grip=new THREE.Mesh(new THREE.BoxGeometry(.14,.36,.17),gunMat);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.46,8),gunDarkMat);
  const trigger=new THREE.Mesh(new THREE.TorusGeometry(.08,.015,6,12),gunDarkMat);
  slide.position.set(0,.08,.1);
  frame.position.set(0,-.02,.06);
  grip.position.set(0,-.24,-.08);
  grip.rotation.x=-.38;
  barrel.rotation.x=Math.PI/2;
  barrel.position.set(0,.09,.44);
  trigger.position.set(0,-.11,.1);
  trigger.rotation.y=Math.PI/2;
  g.add(slide,frame,grip,barrel,trigger);
  if(pickup){
    const glow=new THREE.Mesh(new THREE.TorusGeometry(.9,.045,8,28),glowMat);
    glow.rotation.x=Math.PI/2;
    glow.position.y=-.46;
    g.add(glow);
  }
  const muzzlePoint=new THREE.Object3D();
  muzzlePoint.position.set(0,.09,.72);
  g.userData.muzzlePoint=muzzlePoint;
  g.add(muzzlePoint);
  return g;
}

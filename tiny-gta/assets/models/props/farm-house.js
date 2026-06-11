import * as THREE from 'three';
import {scene} from '../../../js/engine.js';
import {rand,pick} from '../../../js/constants.js';

const ruralWallCols=[0xf4e3c2,0xe8d8c8,0xd9e4d0,0xf0d9b0,0xe4c9b0];

export function addFarmHouse(cx,cz,ry){
  const g=new THREE.Group();
  const bw=rand(4.4,5.8),bd=rand(3.6,4.6),bh=rand(2.4,2.9);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),
    new THREE.MeshStandardMaterial({color:pick(ruralWallCols),roughness:.95}));
  wall.position.y=bh/2;wall.castShadow=true;wall.receiveShadow=true;g.add(wall);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(bw,bd)/2+.3,1.6,4),
    new THREE.MeshStandardMaterial({color:pick([0xb05438,0x8a4a3a,0xa05a40]),roughness:.9}));
  roof.position.y=bh+.8;roof.rotation.y=Math.PI/4;roof.castShadow=true;g.add(roof);
  const door=new THREE.Mesh(new THREE.BoxGeometry(.85,1.5,.1),
    new THREE.MeshStandardMaterial({color:0x6e4a32,roughness:.9}));
  door.position.set(rand(-bw/4,bw/4),.75,bd/2+.04);g.add(door);
  const winM=new THREE.MeshStandardMaterial({color:0x9ecbe0,roughness:.4});
  for(const sx of[-1,1]){
    const win=new THREE.Mesh(new THREE.BoxGeometry(.7,.7,.08),winM);
    win.position.set(sx*bw/3,1.5,bd/2+.04);g.add(win);
  }
  g.position.set(cx,-.02,cz);g.rotation.y=ry;scene.add(g);
  const r=Math.max(bw,bd)/2+.3;
  return{x0:cx-r,x1:cx+r,z0:cz-r,z1:cz+r,h:bh+1.7};
}

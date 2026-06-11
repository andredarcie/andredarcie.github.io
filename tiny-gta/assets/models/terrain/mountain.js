import * as THREE from 'three';
import {rand,groundHeight,MOUNT_X,MOUNT_H} from '../../../js/constants.js';

export function makeMountain(size,segments){
  const geo=new THREE.PlaneGeometry(size,size,segments,segments);
  geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;
  const col=new Float32Array(pos.count*3);
  const grass=new THREE.Color(0x69a85e),dirt=new THREE.Color(0x8a7a52),
        rock=new THREE.Color(0x8d8f99),peakC=new THREE.Color(0xc2c6cf),
        trail=new THREE.Color(0xb08a5e),tmp=new THREE.Color();
  const cell=size/segments;
  for(let i=0;i<pos.count;i++){
    const vx=pos.getX(i),vz=pos.getZ(i);
    const h=groundHeight(vx+MOUNT_X,vz);
    pos.setY(i,h);
    const f=h/MOUNT_H;
    if(f<.25)tmp.lerpColors(grass,dirt,f/.25);
    else if(f<.7)tmp.lerpColors(dirt,rock,(f-.25)/.45);
    else tmp.lerpColors(rock,peakC,(f-.7)/.3);
    if(Math.abs(vz)<cell/2&&vx<2)tmp.lerp(trail,.7);
    tmp.offsetHSL(0,0,rand(-.025,.025));
    col[i*3]=tmp.r;col[i*3+1]=tmp.g;col[i*3+2]=tmp.b;
  }
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,
    new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:true}));
  m.castShadow=true;m.receiveShadow=true;
  return m;
}

import * as THREE from 'three';
import {rand} from '../../../js/constants.js';

export function makeStarField(){
  const n=420,pos=new Float32Array(n*3),col=new Float32Array(n*3);
  for(let i=0;i<n;i++){
    let x,y,z,l;
    do{x=rand(-1,1);y=rand(.05,1);z=rand(-1,1);l=Math.hypot(x,y,z);}while(l>1||l<.3);
    pos[i*3]=x/l*870;pos[i*3+1]=y/l*870;pos[i*3+2]=z/l*870;
    const b=rand(.35,1);
    if(Math.random()<.15){col[i*3]=b;col[i*3+1]=b*.82;col[i*3+2]=b*.66;}
    else{col[i*3]=b*rand(.8,.95);col[i*3+1]=b*rand(.86,1);col[i*3+2]=b;}
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  const material=new THREE.PointsMaterial({size:1.7,sizeAttenuation:false,vertexColors:true,
    transparent:true,opacity:0,fog:false,depthWrite:false});
  return{points:new THREE.Points(geo,material),material};
}

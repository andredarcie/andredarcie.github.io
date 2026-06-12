import * as THREE from 'three';
import {scene} from '../../../js/engine.js';
import {bakeProp} from './prop-merge.js';

function lampTex(){
  const c=document.createElement('canvas');c.width=128;c.height=128;
  const x=c.getContext('2d');
  const g=x.createRadialGradient(64,64,4,64,64,64);
  g.addColorStop(0,'rgba(255,222,160,.9)');
  g.addColorStop(.4,'rgba(255,200,125,.38)');
  g.addColorStop(1,'rgba(255,185,105,0)');
  x.fillStyle=g;x.fillRect(0,0,128,128);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export const lampGlowMat=new THREE.MeshBasicMaterial({map:lampTex(),transparent:true,
  opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
lampGlowMat.visible=false;
export const lampHaloMat=new THREE.SpriteMaterial({map:lampTex(),transparent:true,
  opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
lampHaloMat.visible=false;
export const lampBulbMat=new THREE.MeshBasicMaterial({color:0xffd9a0});

const poleG=new THREE.CylinderGeometry(.08,.1,5.4,5);
const poleM=new THREE.MeshStandardMaterial({color:0x7d7787,roughness:.8});
const bulbG=new THREE.SphereGeometry(.22,8,6);
const glowG=new THREE.PlaneGeometry(9,9);

export function addStreetLamp(px,pz){
  const p=new THREE.Mesh(poleG,poleM);p.position.set(px,2.7,pz);p.castShadow=true;bakeProp(p);
  const b=new THREE.Mesh(bulbG,lampBulbMat);b.position.set(px,5.5,pz);bakeProp(b);
  const gl=new THREE.Mesh(glowG,lampGlowMat);
  gl.rotation.x=-Math.PI/2;gl.position.set(px,.07,pz);gl.renderOrder=2;bakeProp(gl);
  // halo é Sprite (não funde): fica individual, invisível de dia via material
  const h=new THREE.Sprite(lampHaloMat);
  h.position.set(px,5.5,pz);h.scale.set(2.6,2.6,1);scene.add(h);
  return{halo:h};
}

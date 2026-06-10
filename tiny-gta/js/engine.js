import * as THREE from 'three';
import {rand,irand} from './constants.js';

export const canvas=document.getElementById('game');
export const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
const isMobileLike=()=>matchMedia('(pointer: coarse)').matches||innerWidth<900;
const viewportSize=()=>({
  w:Math.round(window.visualViewport?.width||innerWidth),
  h:Math.round(window.visualViewport?.height||innerHeight)
});
function pixelRatioLimit(){return isMobileLike()?1.5:2;}
const initialSize=viewportSize();
renderer.setPixelRatio(Math.min(devicePixelRatio,pixelRatioLimit()));
renderer.setSize(initialSize.w,initialSize.h);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;

export const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0xcfe2ee,120,430);
export const camera=new THREE.PerspectiveCamera(62,initialSize.w/initialSize.h,.1,2000);
camera.position.set(0,60,120);

export function resizeRenderer(){
  const {w,h}=viewportSize();
  renderer.setPixelRatio(Math.min(devicePixelRatio,pixelRatioLimit()));
  camera.aspect=w/h;camera.updateProjectionMatrix();
  renderer.setSize(w,h);
}

addEventListener('resize',resizeRenderer);
addEventListener('orientationchange',resizeRenderer);
window.visualViewport?.addEventListener?.('resize',resizeRenderer);

// Céu, sol, lua e estrelas vivem em daynight.js (ciclo de dia e noite)

export const hemi=new THREE.HemisphereLight(0xbfdfff,0x8a8078,1.05);scene.add(hemi);
export const sunDir=new THREE.Vector3(-.45,.9,-.55).normalize();
export const dlight=new THREE.DirectionalLight(0xfff1d6,2.2);
dlight.castShadow=true;
dlight.shadow.mapSize.set(isMobileLike()?1024:2048,isMobileLike()?1024:2048);
dlight.shadow.camera.left=-95;dlight.shadow.camera.right=95;
dlight.shadow.camera.top=95;dlight.shadow.camera.bottom=-95;
dlight.shadow.camera.far=420;dlight.shadow.bias=-.0015;
scene.add(dlight);scene.add(dlight.target);

{
  const sea=new THREE.Mesh(new THREE.CircleGeometry(1400,40),
    new THREE.MeshStandardMaterial({color:0x2e9ec4,roughness:.3,metalness:.2}));
  sea.rotation.x=-Math.PI/2;sea.position.y=-.32;scene.add(sea);
}

export const clouds=[];
{
  const c=document.createElement('canvas');c.width=256;c.height=128;
  const x=c.getContext('2d');
  for(let k=0;k<14;k++){
    const r=rand(18,42),px=rand(40,216),py=rand(45,86);
    const g2=x.createRadialGradient(px,py,2,px,py,r);
    g2.addColorStop(0,'rgba(255,255,255,.85)');g2.addColorStop(1,'rgba(255,255,255,0)');
    x.fillStyle=g2;x.fillRect(0,0,256,128);
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  for(let k=0;k<10;k++){
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,
      opacity:rand(.45,.8),fog:false,depthWrite:false}));
    const s=rand(90,170);sp.scale.set(s,s*.45,1);
    sp.position.set(rand(-500,500),rand(110,175),rand(-500,500));
    sp.userData.v=rand(1.5,3.5);
    scene.add(sp);clouds.push(sp);
  }
}

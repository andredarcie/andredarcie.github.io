import * as THREE from 'three';
import {makeSea} from '../assets/models/environment/sea.js';
import {makeClouds} from '../assets/models/environment/clouds.js';

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

scene.add(makeSea());

export const clouds=[];
{
  clouds.push(...makeClouds(10));
  for(const sp of clouds)scene.add(sp);
}

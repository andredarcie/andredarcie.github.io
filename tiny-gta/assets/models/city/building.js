import * as THREE from 'three';
import {scene} from '../../../js/engine.js';
import {rand,irand,pick,clamp} from '../../../js/constants.js';

const facadePalette=['#f4c2d0','#a8e0d8','#f9e4b8','#ffb88a','#b8d4f0','#e8c8f0','#8ad8c8','#f49a8a'];

function windowTexPair(base){
  const c=document.createElement('canvas');c.width=256;c.height=512;
  const e=document.createElement('canvas');e.width=256;e.height=512;
  const cx=c.getContext('2d'),ex=e.getContext('2d');
  cx.fillStyle=base;cx.fillRect(0,0,256,512);
  ex.fillStyle='#000';ex.fillRect(0,0,256,512);
  for(let q=0;q<8;q+=2){cx.fillStyle='rgba(0,0,0,.05)';cx.fillRect(q*32,0,32,512);}
  for(let r=0;r<16;r++){
    cx.fillStyle='rgba(0,0,0,.16)';cx.fillRect(0,r*32,256,3);
    cx.fillStyle='rgba(255,255,255,.08)';cx.fillRect(0,r*32+3,256,2);
  }
  const glassCols=['#7fc4d9','#8fd0e4','#6eb4cc','#9fd8e8','#86c8d8'];
  for(let r=0;r<16;r++)for(let q=0;q<8;q++){
    const wx=q*32+7,wy=r*32+9,ww=18,wh=17;
    cx.fillStyle='rgba(18,20,28,.55)';cx.fillRect(wx-2,wy-2,ww+4,wh+4);
    cx.fillStyle='rgba(255,255,255,.2)';cx.fillRect(wx-3,wy+wh+2,ww+6,2);
    if(Math.random()<.12){
      const col=pick(['#ffeec8','#fff4d8','#f0dcae']);
      const g=cx.createLinearGradient(0,wy,0,wy+wh);
      g.addColorStop(0,col);g.addColorStop(1,'#d9a85e');
      cx.fillStyle=g;cx.fillRect(wx,wy,ww,wh);
      ex.fillStyle=col;ex.fillRect(wx,wy,ww,wh);
      if(Math.random()<.3){
        const px=wx+irand(2,11);
        cx.fillStyle='rgba(40,30,45,.6)';cx.fillRect(px,wy+6,5,11);
        ex.fillStyle='rgba(0,0,0,.6)';ex.fillRect(px,wy+6,5,11);
      }
    }else{
      const g=cx.createLinearGradient(0,wy,0,wy+wh);
      g.addColorStop(0,'#d4ecf4');g.addColorStop(.35,pick(glassCols));g.addColorStop(1,'#3f7f9e');
      cx.fillStyle=g;cx.fillRect(wx,wy,ww,wh);
      if(Math.random()<.3){cx.fillStyle='rgba(238,232,214,.85)';cx.fillRect(wx,wy,ww,irand(4,10));}
      cx.fillStyle='rgba(18,20,28,.45)';cx.fillRect(wx+ww/2-1,wy,2,wh);
    }
  }
  for(let k=0;k<10;k++){
    cx.fillStyle='rgba(18,18,26,.05)';
    cx.fillRect(Math.random()*256,Math.random()*60,irand(2,5),512);
  }
  const mk=cv=>{const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;
    t.wrapS=t.wrapT=THREE.RepeatWrapping;return t};
  return{map:mk(c),emis:mk(e)};
}

const texVariants=facadePalette.map(windowTexPair);
export const buildingMats=[];
const roofMat=new THREE.MeshStandardMaterial({color:0x8a857c,roughness:1});
const neonColors=[0xff2e88,0x19e3ff,0x9dff2e,0xffb52e];
const unitBox=new THREE.BoxGeometry(1,1,1);
const parapetMat=new THREE.MeshStandardMaterial({color:0xf0eadc,roughness:.9});
const roofEquipMat=new THREE.MeshStandardMaterial({color:0x9aa0a8,roughness:.8,metalness:.2});
const tankMat=new THREE.MeshStandardMaterial({color:0x8a705a,roughness:.9});
const doorMat=new THREE.MeshStandardMaterial({color:0x2a2230,roughness:.8});
const antennaTipMat=new THREE.MeshBasicMaterial({color:0xff3030});
const awningMats=[0xff5f9e,0x2ec8c8,0xffd24a,0xff8c2e,0xb06ad8]
  .map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.85}));

export function addBuilding(cx,cz,w,d,solids){
  const dist=Math.hypot(cx,cz);
  const h=clamp(rand(7,17)+Math.max(0,1-dist/200)*rand(8,30),7,46);
  const v=pick(texVariants);
  const map=v.map.clone(),emis=v.emis.clone();
  const rep=[w/17.6,h/48],off=[Math.random(),Math.random()];
  map.repeat.set(...rep);map.offset.set(...off);map.needsUpdate=true;
  emis.repeat.set(...rep);emis.offset.set(...off);emis.needsUpdate=true;
  const side=new THREE.MeshStandardMaterial({map,emissiveMap:emis,emissive:0xffe9b0,
    emissiveIntensity:.3,roughness:.9});
  buildingMats.push(side);
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),[side,side,roofMat,roofMat,side,side]);
  m.position.set(cx,h/2,cz);m.castShadow=true;m.receiveShadow=true;scene.add(m);
  solids.push({x0:cx-w/2,x1:cx+w/2,z0:cz-d/2,z1:cz+d/2,h});
  if(h>20&&Math.random()<.5){
    const nh=h*rand(.35,.55);
    const neon=new THREE.Mesh(new THREE.BoxGeometry(.5,nh,.5),
      new THREE.MeshBasicMaterial({color:pick(neonColors)}));
    const sgn=Math.random()<.5?1:-1;
    if(Math.random()<.5)neon.position.set(cx+sgn*(w/2+.3),h*.55,cz+rand(-d/4,d/4));
    else neon.position.set(cx+rand(-w/4,w/4),h*.55,cz+sgn*(d/2+.3));
    scene.add(neon);
  }

  const par=new THREE.Mesh(unitBox,parapetMat);
  par.scale.set(w+.35,.55,d+.35);par.position.set(cx,h+.12,cz);
  par.castShadow=true;scene.add(par);

  let topH=h;
  if(h>26&&Math.random()<.6){
    const w2=w*.62,d2=d*.62,h2=rand(3.5,6.5);
    const map2=v.map.clone(),emis2=v.emis.clone();
    const rep2=[w2/17.6,h2/48],off2=[Math.random(),Math.random()];
    map2.repeat.set(...rep2);map2.offset.set(...off2);map2.needsUpdate=true;
    emis2.repeat.set(...rep2);emis2.offset.set(...off2);emis2.needsUpdate=true;
    const side2=new THREE.MeshStandardMaterial({map:map2,emissiveMap:emis2,
      emissive:0xffe9b0,emissiveIntensity:.3,roughness:.9});
    buildingMats.push(side2);
    const top=new THREE.Mesh(new THREE.BoxGeometry(w2,h2,d2),
      [side2,side2,roofMat,roofMat,side2,side2]);
    top.position.set(cx,h+h2/2,cz);top.castShadow=true;scene.add(top);
    topH=h+h2;
  }

  if(Math.random()<.75){
    const eh=rand(.5,1.3);
    const eq=new THREE.Mesh(unitBox,roofEquipMat);
    eq.scale.set(rand(.9,2.2),eh,rand(.9,2));
    eq.position.set(cx+rand(-w/2+1.6,w/2-1.6),h+eh/2+.1,cz+rand(-d/2+1.6,d/2-1.6));
    eq.castShadow=true;scene.add(eq);
  }
  if(h>13&&Math.random()<.22){
    const tx=cx+rand(-w/4,w/4),tz=cz+rand(-d/4,d/4);
    const tk=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,1.3,8),tankMat);
    tk.position.set(tx,h+.75,tz);tk.castShadow=true;scene.add(tk);
    const lid=new THREE.Mesh(new THREE.ConeGeometry(.92,.5,8),parapetMat);
    lid.position.set(tx,h+1.65,tz);scene.add(lid);
  }
  if(h>24&&Math.random()<.55){
    const ah=rand(2.4,4),ax=cx+rand(-w/4,w/4),az=cz+rand(-d/4,d/4);
    const an=new THREE.Mesh(new THREE.CylinderGeometry(.04,.07,ah,5),roofEquipMat);
    an.position.set(ax,topH+ah/2,az);scene.add(an);
    const tip=new THREE.Mesh(new THREE.SphereGeometry(.12,6,5),antennaTipMat);
    tip.position.set(ax,topH+ah+.05,az);scene.add(tip);
  }
  if(Math.random()<.65){
    const sgn=Math.random()<.5?1:-1,onX=Math.random()<.5;
    const dx=onX?sgn*(w/2+.07):rand(-w/4+1,w/4-1);
    const dz=onX?rand(-d/4+1,d/4-1):sgn*(d/2+.07);
    const door=new THREE.Mesh(unitBox,doorMat);
    door.scale.set(onX?.14:1.3,2.3,onX?1.3:.14);
    door.position.set(cx+dx,1.15,cz+dz);scene.add(door);
    const aw=new THREE.Mesh(unitBox,pick(awningMats));
    aw.scale.set(onX?.85:rand(2.6,4),.13,onX?rand(2.6,4):.85);
    aw.position.set(cx+dx+(onX?sgn*.42:0),2.55,cz+dz+(onX?0:sgn*.42));
    if(onX)aw.rotation.z=-sgn*.14;else aw.rotation.x=sgn*.14;
    aw.castShadow=true;scene.add(aw);
  }
}

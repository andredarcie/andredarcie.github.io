import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scene} from '../../../js/engine.js';
import {rand,irand,pick,clamp} from '../../../js/constants.js';
import {addDoorArrow} from './door-arrow.js';

// Portas funcionais: encostar nelas leva o jogador ao telhado do prédio
// (js/doors.js cuida do gatilho e do teleporte; js/player.js da queda)
export const buildingDoors=[];

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

// Materiais COMPARTILHADOS (um por variante de fachada). A variação por prédio
// (escala e deslocamento das janelas) é cozida nas UVs de cada geometria, o
// que permite fundir a cidade inteira em pouquíssimos meshes (draw calls).
export const buildingMats=[];
const sideMats=texVariants.map(v=>{
  const m=new THREE.MeshStandardMaterial({map:v.map,emissiveMap:v.emis,
    emissive:0xffe9b0,emissiveIntensity:.3,roughness:.9});
  buildingMats.push(m);
  return m;
});
const roofMat=new THREE.MeshStandardMaterial({color:0x8a857c,roughness:1});
const parapetMat=new THREE.MeshStandardMaterial({color:0xf0eadc,roughness:.9});
const roofEquipMat=new THREE.MeshStandardMaterial({color:0x9aa0a8,roughness:.8,metalness:.2});
const tankMat=new THREE.MeshStandardMaterial({color:0x8a705a,roughness:.9});
const doorMat=new THREE.MeshStandardMaterial({color:0x2a2230,roughness:.8});
const antennaTipMat=new THREE.MeshBasicMaterial({color:0xff3030});
const awningMats=[0xff5f9e,0x2ec8c8,0xffd24a,0xff8c2e,0xb06ad8]
  .map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.85}));

// Baldes de geometria por material; finalizeBuildings() funde cada balde num
// único mesh — a cidade toda vira ~18 draw calls em vez de ~900
const buckets={
  sides:texVariants.map(()=>[]),
  roof:[],parapet:[],equip:[],tank:[],tip:[],door:[],
  awning:awningMats.map(()=>[]),
};

// Tiling que antes era texture.repeat/offset, agora por face nas UVs
function bakeBoxUVs(geo,w,h,d){
  const uv=geo.attributes.uv;
  const offU=Math.random(),offV=Math.random();
  const widths=[d,d,w,w,w,w]; // dimensão horizontal de cada face do box
  for(let f=0;f<6;f++){
    const su=widths[f]/17.6,sv=h/48;
    for(let i=f*6;i<f*6+6;i++)uv.setXY(i,uv.getX(i)*su+offU,uv.getY(i)*sv+offV);
  }
}

// Extrai faces de um BoxGeometry não-indexado (cada face = 6 vértices,
// ordem +x,-x,+y,-y,+z,-z)
function sliceFaces(geo,faces){
  const out=new THREE.BufferGeometry();
  for(const name of['position','normal','uv']){
    const src=geo.attributes[name];
    const dst=new Float32Array(faces.length*6*src.itemSize);
    faces.forEach((f,k)=>dst.set(
      src.array.subarray(f*6*src.itemSize,(f+1)*6*src.itemSize),k*6*src.itemSize));
    out.setAttribute(name,new THREE.BufferAttribute(dst,src.itemSize));
  }
  return out;
}

// Caixa de fachada: laterais no balde da variante, topo no balde de telhado;
// a face de baixo nunca aparece e é descartada
function addFacadeBox(vi,cx,cy,cz,w,h,d){
  const nb=new THREE.BoxGeometry(w,h,d).toNonIndexed();
  bakeBoxUVs(nb,w,h,d);
  nb.translate(cx,cy,cz);
  buckets.sides[vi].push(sliceFaces(nb,[0,1,4,5]));
  buckets.roof.push(sliceFaces(nb,[2]));
}

function pushBox(arr,sx,sy,sz,x,y,z,rx=0,rz=0){
  const g=new THREE.BoxGeometry(sx,sy,sz);
  if(rz)g.rotateZ(rz);
  if(rx)g.rotateX(rx);
  g.translate(x,y,z);
  arr.push(g);
}

export function addBuilding(cx,cz,w,d,solids){
  const dist=Math.hypot(cx,cz);
  const h=clamp(rand(7,17)+Math.max(0,1-dist/200)*rand(8,30),7,46);
  const vi=irand(0,texVariants.length-1);
  addFacadeBox(vi,cx,h/2,cz,w,h,d);
  solids.push({x0:cx-w/2,x1:cx+w/2,z0:cz-d/2,z1:cz+d/2,h});

  pushBox(buckets.parapet,w+.35,.55,d+.35,cx,h+.12,cz);

  let topH=h;
  if(h>26&&Math.random()<.6){
    const w2=w*.62,d2=d*.62,h2=rand(3.5,6.5);
    addFacadeBox(vi,cx,h+h2/2,cz,w2,h2,d2);
    topH=h+h2;
  }

  if(Math.random()<.75){
    const eh=rand(.5,1.3);
    pushBox(buckets.equip,rand(.9,2.2),eh,rand(.9,2),
      cx+rand(-w/2+1.6,w/2-1.6),h+eh/2+.1,cz+rand(-d/2+1.6,d/2-1.6));
  }
  if(h>13&&Math.random()<.22){
    const tx=cx+rand(-w/4,w/4),tz=cz+rand(-d/4,d/4);
    const tk=new THREE.CylinderGeometry(.8,.8,1.3,8);
    tk.translate(tx,h+.75,tz);buckets.tank.push(tk);
    const lid=new THREE.ConeGeometry(.92,.5,8);
    lid.translate(tx,h+1.65,tz);buckets.parapet.push(lid);
  }
  if(h>24&&Math.random()<.55){
    const ah=rand(2.4,4),ax=cx+rand(-w/4,w/4),az=cz+rand(-d/4,d/4);
    const an=new THREE.CylinderGeometry(.04,.07,ah,5);
    an.translate(ax,topH+ah/2,az);buckets.equip.push(an);
    const tip=new THREE.SphereGeometry(.12,6,5);
    tip.translate(ax,topH+ah+.05,az);buckets.tip.push(tip);
  }
  if(Math.random()<.65){
    const sgn=Math.random()<.5?1:-1,onX=Math.random()<.5;
    const dx=onX?sgn*(w/2+.07):rand(-w/4+1,w/4-1);
    const dz=onX?rand(-d/4+1,d/4-1):sgn*(d/2+.07);
    pushBox(buckets.door,onX?.14:1.3,2.3,onX?1.3:.14,cx+dx,1.15,cz+dz);
    pushBox(buckets.awning[irand(0,awningMats.length-1)],
      onX?.85:rand(2.6,4),.13,onX?rand(2.6,4):.85,
      cx+dx+(onX?sgn*.42:0),2.55,cz+dz+(onX?0:sgn*.42),
      onX?0:sgn*.14,onX?-sgn*.14:0);
    // registro da porta: gatilho na calçada, spawn/saída no telhado e os
    // limites da laje (parapeito) — passar deles é queda livre
    const nx=onX?sgn:0,nz=onX?0:sgn; // normal da fachada (aponta pra rua)
    const door={
      x:cx+dx,z:cz+dz,                      // gatilho de entrada (na porta)
      outX:cx+dx+nx*1.3,outZ:cz+dz+nz*1.3,  // desembarque na calçada
      topX:cx+dx-nx*1.9,topZ:cz+dz-nz*1.9,  // spawn e saída no telhado
      y:h+.395,                             // topo da laje (parapeito)
      x0:cx-(w+.35)/2,x1:cx+(w+.35)/2,
      z0:cz-(d+.35)/2,z1:cz+(d+.35)/2,
      // bloco superior (quando existe) é sólido pra quem anda no telhado
      top:topH>h?{x0:cx-w*.31,x1:cx+w*.31,z0:cz-d*.31,z1:cz+d*.31}:null,
      // espólio do telhado: uns têm dinheiro, outros arma, outros nada
      // (visual e coleta em js/doors.js, só pra quem está neste telhado)
      loot:Math.random()<.35?'money':Math.random()<.4?'gun':null,
      lootX:cx+(nx?-nx:1)*(w/2-1.6),lootZ:cz+(nz?-nz:1)*(d/2-1.6),
    };
    buildingDoors.push(door);
    addDoorArrow(cx+dx+nx*.85,1.55,cz+dz+nz*.85); // seta rente ao chão, na porta
    // alçapão de metal no telhado marcando o ponto de descida (a seta de lá
    // é dinâmica: js/doors.js só a mostra quando o jogador está neste telhado)
    pushBox(buckets.door,1.8,.05,1.8,door.topX,h+.41,door.topZ);  // moldura escura
    pushBox(buckets.equip,1.4,.07,1.4,door.topX,h+.45,door.topZ); // folha de metal
    pushBox(buckets.door,.5,.07,.13,door.topX,h+.5,door.topZ+.4); // alça
  }
}

// Funde cada balde num único mesh — chamar UMA vez, depois da cidade montada
export function finalizeBuildings(){
  const addMerged=(geos,mat,cast=true,receive=false)=>{
    if(!geos.length)return;
    const m=new THREE.Mesh(mergeGeometries(geos),mat);
    m.castShadow=cast;m.receiveShadow=receive;
    scene.add(m);
    geos.length=0;
  };
  buckets.sides.forEach((g,i)=>addMerged(g,sideMats[i],true,true));
  addMerged(buckets.roof,roofMat,true,true);
  addMerged(buckets.parapet,parapetMat);
  addMerged(buckets.equip,roofEquipMat);
  addMerged(buckets.tank,tankMat);
  addMerged(buckets.tip,antennaTipMat,false);
  addMerged(buckets.door,doorMat,false);
  buckets.awning.forEach((g,i)=>addMerged(g,awningMats[i]));
}

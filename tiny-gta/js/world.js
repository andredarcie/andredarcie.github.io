import * as THREE from 'three';
import {N,CELL,ROAD,BLOCK,SIDE,HALF,GROUND,BEACH,nodeX,rand,irand,pick,clamp} from './constants.js';
import {scene,renderer} from './engine.js';

export const solids=[];
export const parks=new Set();
while(parks.size<6){const i=irand(0,N-1),j=irand(0,N-1);if(Math.abs(i-4)+Math.abs(j-4)>1)parks.add(i+'_'+j);}
export const isPark=(i,j)=>parks.has(i+'_'+j);

// Ground texture (asphalt, sidewalks, crosswalks)
const groundCv=document.createElement('canvas');groundCv.width=2048;groundCv.height=2048;
{
  const x=groundCv.getContext('2d'),s=2048/GROUND,M=v=>(v+GROUND/2)*s;
  x.fillStyle='#54545f';x.fillRect(0,0,2048,2048);
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){
    const x0=nodeX(i)+ROAD/2,z0=nodeX(j)+ROAD/2;
    x.fillStyle='#b3acb8';x.fillRect(M(x0),M(z0),BLOCK*s,BLOCK*s);
    x.fillStyle=isPark(i,j)?'#5fae62':'#9a93a2';
    x.fillRect(M(x0+SIDE),M(z0+SIDE),(BLOCK-2*SIDE)*s,(BLOCK-2*SIDE)*s);
    if(isPark(i,j)){
      x.strokeStyle='#d8c79a';x.lineWidth=1.4*s;
      x.beginPath();x.moveTo(M(x0+SIDE),M(z0+BLOCK/2));x.lineTo(M(x0+BLOCK-SIDE),M(z0+BLOCK/2));
      x.moveTo(M(x0+BLOCK/2),M(z0+SIDE));x.lineTo(M(x0+BLOCK/2),M(z0+BLOCK-SIDE));x.stroke();
    }
  }
  for(let i=0;i<=N;i++){
    const r=nodeX(i);
    for(let j=0;j<N;j++){
      const a=nodeX(j)+ROAD/2+2.5,b=nodeX(j+1)-ROAD/2-2.5;
      x.fillStyle='#f0bd2e';
      x.fillRect(M(r-.55),M(a),.32*s,(b-a)*s);x.fillRect(M(r+.23),M(a),.32*s,(b-a)*s);
      x.fillRect(M(a),M(r-.55),(b-a)*s,.32*s);x.fillRect(M(a),M(r+.23),(b-a)*s,.32*s);
      x.fillStyle='rgba(240,240,245,.7)';
      x.fillRect(M(r-ROAD/2+.5),M(a),.22*s,(b-a)*s);x.fillRect(M(r+ROAD/2-.72),M(a),.22*s,(b-a)*s);
      x.fillRect(M(a),M(r-ROAD/2+.5),(b-a)*s,.22*s);x.fillRect(M(a),M(r+ROAD/2-.72),(b-a)*s,.22*s);
    }
  }
  x.fillStyle='rgba(235,235,240,.75)';
  for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){
    const cx=nodeX(i),cz=nodeX(j);
    for(let k=-2;k<=2;k++){
      x.fillRect(M(cx+k*2.4-.7),M(cz-ROAD/2-2.2),1.4*s,1.6*s);
      x.fillRect(M(cx+k*2.4-.7),M(cz+ROAD/2+.6),1.4*s,1.6*s);
      x.fillRect(M(cx-ROAD/2-2.2),M(cz+k*2.4-.7),1.6*s,1.4*s);
      x.fillRect(M(cx+ROAD/2+.6),M(cz+k*2.4-.7),1.6*s,1.4*s);
    }
  }
  for(let k=0;k<5000;k++){
    x.fillStyle=`rgba(${irand(120,200)},${irand(120,190)},${irand(130,200)},.1)`;
    x.fillRect(Math.random()*2048,Math.random()*2048,irand(2,7),irand(2,7));
  }
  const gt=new THREE.CanvasTexture(groundCv);gt.colorSpace=THREE.SRGBColorSpace;
  gt.anisotropy=renderer.capabilities.getMaxAnisotropy();
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(GROUND,GROUND),
    new THREE.MeshStandardMaterial({map:gt,roughness:.95}));
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
}

// Window textures for buildings
const facadePalette=['#f2d4a8','#e8b8c8','#bfe0d8','#f4e3c2','#cfd9ea','#f0c9a0','#dfe6d2','#e6cfe0'];
function windowTexPair(base){
  const c=document.createElement('canvas');c.width=128;c.height=256;
  const e=document.createElement('canvas');e.width=128;e.height=256;
  const cx=c.getContext('2d'),ex=e.getContext('2d');
  cx.fillStyle=base;cx.fillRect(0,0,128,256);
  ex.fillStyle='#000';ex.fillRect(0,0,128,256);
  for(let r=0;r<16;r++)for(let q=0;q<8;q++){
    const wx=q*16+4,wy=r*16+3,lit=Math.random()<.12;
    if(lit){
      const col=pick(['#ffe9b0','#fff3cc']);
      cx.fillStyle=col;cx.fillRect(wx,wy,8,10);
      ex.fillStyle=col;ex.fillRect(wx,wy,8,10);
    }else{
      cx.fillStyle=pick(['#7fb2d9','#92c4e4','#6ea3cc','#a4cfe8']);cx.fillRect(wx,wy,8,10);
    }
  }
  const mk=cv=>{const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;
    t.wrapS=t.wrapT=THREE.RepeatWrapping;return t};
  return{map:mk(c),emis:mk(e)};
}
const texVariants=facadePalette.map(windowTexPair);
const roofMat=new THREE.MeshStandardMaterial({color:0xa39aa8,roughness:1});
const neonColors=[0xff2e88,0x19e3ff,0x9dff2e,0xffb52e];

function addBuilding(cx,cz,w,d){
  const dist=Math.hypot(cx,cz);
  const h=clamp(rand(7,17)+Math.max(0,1-dist/200)*rand(8,30),7,46);
  const v=pick(texVariants);
  const map=v.map.clone(),emis=v.emis.clone();
  const rep=[w/17.6,h/48],off=[Math.random(),Math.random()];
  map.repeat.set(...rep);map.offset.set(...off);map.needsUpdate=true;
  emis.repeat.set(...rep);emis.offset.set(...off);emis.needsUpdate=true;
  const side=new THREE.MeshStandardMaterial({map,emissiveMap:emis,emissive:0xffe9b0,
    emissiveIntensity:.3,roughness:.9});
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),[side,side,roofMat,roofMat,side,side]);
  m.position.set(cx,h/2,cz);m.castShadow=true;m.receiveShadow=true;scene.add(m);
  solids.push({x0:cx-w/2,x1:cx+w/2,z0:cz-d/2,z1:cz+d/2});
  if(h>20&&Math.random()<.45){
    const nh=h*rand(.35,.55);
    const neon=new THREE.Mesh(new THREE.BoxGeometry(.5,nh,.5),
      new THREE.MeshBasicMaterial({color:pick(neonColors)}));
    const sgn=Math.random()<.5?1:-1;
    if(Math.random()<.5)neon.position.set(cx+sgn*(w/2+.3),h*.55,cz+rand(-d/4,d/4));
    else neon.position.set(cx+rand(-w/4,w/4),h*.55,cz+sgn*(d/2+.3));
    scene.add(neon);
  }
}

const palmLeafMat=new THREE.MeshStandardMaterial({color:0x3aa856,roughness:1});
const palmTrunkMat=new THREE.MeshStandardMaterial({color:0x96704e,roughness:1});
function addPalm(x,z){
  const g=new THREE.Group(),h=rand(4,6);
  const tr=new THREE.Mesh(new THREE.CylinderGeometry(.16,.26,h,5),palmTrunkMat);
  tr.position.y=h/2;tr.castShadow=true;g.add(tr);
  for(let k=0;k<6;k++){
    const leaf=new THREE.Mesh(new THREE.BoxGeometry(2.4,.08,.55),palmLeafMat);
    leaf.position.y=h;leaf.rotation.y=k*Math.PI/3;leaf.rotation.z=-.42;
    leaf.geometry.translate?.(0,0,0);leaf.translateX(1.0);leaf.castShadow=true;g.add(leaf);
  }
  g.position.set(x,0,z);scene.add(g);
}

for(let i=0;i<N;i++)for(let j=0;j<N;j++){
  const x0=nodeX(i)+ROAD/2+SIDE,z0=nodeX(j)+ROAD/2+SIDE,inner=BLOCK-2*SIDE;
  if(isPark(i,j)){
    for(let k=0;k<7;k++)addPalm(x0+rand(1,inner-1),z0+rand(1,inner-1));
    continue;
  }
  const sx=Math.random()<.5?1:2,sz=Math.random()<.5?1:2;
  for(let a=0;a<sx;a++)for(let b=0;b<sz;b++){
    const w=inner/sx-1.6,d=inner/sz-1.6;
    addBuilding(x0+(a+.5)*inner/sx,z0+(b+.5)*inner/sz,w,d);
  }
}

// Beach ring around the whole city: sand plane slightly below the city ground,
// foam painted on the outer edge where it meets the sea
{
  const W=GROUND+BEACH*2;
  const c=document.createElement('canvas');c.width=1024;c.height=1024;
  const x=c.getContext('2d');
  x.fillStyle='#ecd9a4';x.fillRect(0,0,1024,1024);
  for(let k=0;k<2600;k++){
    x.fillStyle=`rgba(${irand(195,238)},${irand(168,208)},${irand(118,158)},.16)`;
    x.fillRect(Math.random()*1024,Math.random()*1024,irand(2,6),irand(2,6));
  }
  // wet sand: darkens gradually toward the water line
  for(let k=0;k<24;k++){
    x.strokeStyle=`rgba(146,118,80,${.4*(1-k/24)})`;
    x.lineWidth=2;
    x.strokeRect(k*1.5,k*1.5,1024-k*3,1024-k*3);
  }
  // shells and starfish specks scattered on the dry band
  for(let k=0;k<240;k++){
    const e=irand(0,3),a=Math.random()*1024,d=rand(14,80);
    const px=e<2?a:(e===2?d:1024-d),py=e<2?(e===0?d:1024-d):a;
    x.fillStyle=pick(['rgba(255,244,235,.85)','rgba(255,170,185,.8)','rgba(255,214,140,.8)','rgba(190,235,255,.75)']);
    x.fillRect(px,py,irand(1,3),irand(1,3));
  }
  // organic foam blobs at the water line
  for(let k=0;k<900;k++){
    const e=irand(0,3),a=Math.random()*1024,d=Math.pow(Math.random(),2)*9;
    const px=e<2?a:(e===2?d:1024-d),py=e<2?(e===0?d:1024-d):a;
    x.fillStyle=`rgba(255,255,255,${rand(.2,.55)})`;
    x.beginPath();x.arc(px,py,rand(1.2,4.5),0,7);x.fill();
  }
  const st=new THREE.CanvasTexture(c);st.colorSpace=THREE.SRGBColorSpace;
  const sand=new THREE.Mesh(new THREE.PlaneGeometry(W,W),
    new THREE.MeshStandardMaterial({map:st,roughness:1}));
  sand.rotation.x=-Math.PI/2;sand.position.y=-.06;sand.receiveShadow=true;scene.add(sand);
}

function beachSpot(margin=4){
  const inner=GROUND/2+3,outer=GROUND/2+BEACH-margin;
  const side=irand(0,3),along=rand(-outer,outer),depth=rand(inner,outer);
  return side===0?[along,-depth]:side===1?[along,depth]:side===2?[-depth,along]:[depth,along];
}
for(let k=0;k<46;k++){const[bx,bz]=beachSpot(5);addPalm(bx,bz);}

const umbCols=[0xff2e88,0x19e3ff,0xffd24a,0x9dff2e,0xff8c2e];
function addUmbrella(x0,z0){
  const g=new THREE.Group();
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.06,2.3,5),
    new THREE.MeshStandardMaterial({color:0xefe6d0,roughness:.8}));
  pole.position.y=1.15;g.add(pole);
  const top=new THREE.Mesh(new THREE.ConeGeometry(1.5,.6,8),
    new THREE.MeshStandardMaterial({color:pick(umbCols),roughness:.85,side:THREE.DoubleSide}));
  top.position.y=2.3;top.castShadow=true;g.add(top);
  g.rotation.z=rand(-.07,.07);
  g.position.set(x0,-.06,z0);scene.add(g);
  if(Math.random()<.8){
    const t=new THREE.Mesh(new THREE.BoxGeometry(.95,.04,1.9),
      new THREE.MeshStandardMaterial({color:pick(umbCols),roughness:1}));
    t.position.set(x0+rand(-2.4,2.4),-.03,z0+rand(-2.4,2.4));
    t.rotation.y=rand(0,Math.PI);scene.add(t);
  }
}
for(let k=0;k<16;k++){const[bx,bz]=beachSpot(7);addUmbrella(bx,bz);}

function addChair(x0,z0){
  const m=new THREE.MeshStandardMaterial({color:pick(umbCols),roughness:.9});
  const g=new THREE.Group();
  const seat=new THREE.Mesh(new THREE.BoxGeometry(.72,.08,1.15),m);
  seat.position.y=.3;seat.castShadow=true;g.add(seat);
  const back=new THREE.Mesh(new THREE.BoxGeometry(.72,.68,.08),m);
  back.position.set(0,.58,-.58);back.rotation.x=.4;back.castShadow=true;g.add(back);
  const legM=new THREE.MeshStandardMaterial({color:0xf2ead6,roughness:.8});
  for(const[lx,lz]of[[-.3,.45],[.3,.45],[-.3,-.45],[.3,-.45]]){
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.07,.3,.07),legM);
    leg.position.set(lx,.15,lz);g.add(leg);
  }
  g.rotation.y=rand(0,6.28);g.position.set(x0,-.06,z0);scene.add(g);
}
for(let k=0;k<14;k++){const[bx,bz]=beachSpot(8);addChair(bx,bz);}

// half-buried rock clusters near the water
{
  const rockM=new THREE.MeshStandardMaterial({color:0x8d8f99,roughness:.95});
  for(let k=0;k<10;k++){
    const[bx,bz]=beachSpot(3);
    for(let r=0;r<irand(2,4);r++){
      const rk=new THREE.Mesh(new THREE.DodecahedronGeometry(rand(.3,.9),0),rockM);
      rk.position.set(bx+rand(-1.6,1.6),-.12,bz+rand(-1.6,1.6));
      rk.rotation.set(rand(0,3),rand(0,3),rand(0,3));
      rk.castShadow=true;scene.add(rk);
    }
  }
}

// lifeguard towers, one per side facing the sea
function addLifeguard(x0,z0,ry){
  const g=new THREE.Group();
  const woodM=new THREE.MeshStandardMaterial({color:0xc9885a,roughness:.9});
  for(const[lx,lz]of[[-1,-1],[1,-1],[-1,1],[1,1]]){
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.16,2.2,.16),woodM);
    leg.position.set(lx*.85,1.1,lz*.85);leg.castShadow=true;g.add(leg);
  }
  const plat=new THREE.Mesh(new THREE.BoxGeometry(2.3,.12,2.3),woodM);
  plat.position.y=2.2;plat.castShadow=true;g.add(plat);
  const hut=new THREE.Mesh(new THREE.BoxGeometry(1.9,1.3,1.9),
    new THREE.MeshStandardMaterial({color:0xffd24a,roughness:.8}));
  hut.position.y=2.95;hut.castShadow=true;g.add(hut);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(1.7,.7,4),
    new THREE.MeshStandardMaterial({color:0xff2e88,roughness:.8}));
  roof.position.y=3.95;roof.rotation.y=Math.PI/4;roof.castShadow=true;g.add(roof);
  g.position.set(x0,-.06,z0);g.rotation.y=ry;scene.add(g);
}
{
  const LG=GROUND/2+BEACH/2;
  addLifeguard(0,-LG,0);addLifeguard(0,LG,Math.PI);
  addLifeguard(-LG,0,Math.PI/2);addLifeguard(LG,0,-Math.PI/2);
}

// square ring geometry helper (frame with a hole) for water/foam bands
function squareRing(half,thick){
  const sh=new THREE.Shape();
  sh.moveTo(-half-thick,-half-thick);sh.lineTo(half+thick,-half-thick);
  sh.lineTo(half+thick,half+thick);sh.lineTo(-half-thick,half+thick);sh.closePath();
  const hole=new THREE.Path();
  hole.moveTo(-half,-half);hole.lineTo(half,-half);
  hole.lineTo(half,half);hole.lineTo(-half,half);
  sh.holes.push(hole);
  return new THREE.ShapeGeometry(sh);
}

// turquoise shallows fading into the deep sea color
{
  const sw=new THREE.Mesh(squareRing(GROUND/2+BEACH-2,16),
    new THREE.MeshBasicMaterial({color:0x55d8d8,transparent:true,opacity:.45,depthWrite:false}));
  sw.rotation.x=-Math.PI/2;sw.position.y=-.305;scene.add(sw);
  const sw2=new THREE.Mesh(squareRing(GROUND/2+BEACH+14,18),
    new THREE.MeshBasicMaterial({color:0x3fc2cf,transparent:true,opacity:.25,depthWrite:false}));
  sw2.rotation.x=-Math.PI/2;sw2.position.y=-.305;scene.add(sw2);
}

// animated foam waves lapping over the sand edge
const waves=[];
for(let k=0;k<3;k++){
  const m=new THREE.Mesh(squareRing(GROUND/2+BEACH-3,2.4),
    new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.2,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.y=-.045+k*.004;
  scene.add(m);
  waves.push({m,ph:k*2.1,spd:.55+k*.12,amp:.012+k*.004});
}
export function updateBeach(time){
  for(const w of waves){
    const s=1+w.amp*(.5+.5*Math.sin(time*w.spd+w.ph));
    w.m.scale.set(s,s,1);
    w.m.material.opacity=.05+.3*Math.max(0,Math.sin(time*w.spd+w.ph+1.2));
  }
}

// Street poles
{
  const poleG=new THREE.CylinderGeometry(.08,.1,5.4,5);
  const poleM=new THREE.MeshStandardMaterial({color:0x7d7787,roughness:.8});
  const bulbG=new THREE.SphereGeometry(.22,8,6);
  const bulbM=new THREE.MeshBasicMaterial({color:0xffd9a0});
  for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){
    if((i+j)%2)continue;
    const px=nodeX(i)+8.2*((i+j)%4<2?1:-1),pz=nodeX(j)+8.2;
    const p=new THREE.Mesh(poleG,poleM);p.position.set(px,2.7,pz);p.castShadow=true;scene.add(p);
    const b=new THREE.Mesh(bulbG,bulbM);b.position.set(px,5.5,pz);scene.add(b);
  }
}

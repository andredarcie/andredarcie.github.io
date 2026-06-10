import * as THREE from 'three';
import {N,CELL,ROAD,BLOCK,SIDE,HALF,GROUND,BEACH,nodeX,rand,irand,pick,clamp,
  RURAL_X0,RURAL_X1,RURAL_HALF,MOUNT_X,MOUNT_R,MOUNT_H,MOUNT_SEG,MOUNT_S,groundHeight} from './constants.js';
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
export const buildingMats=[]; // daynight.js controla emissiveIntensity (janelas acesas à noite)
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
  buildingMats.push(side);
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
  for(;;){
    const side=irand(0,3),along=rand(-outer,outer),depth=rand(inner,outer);
    const[x,z]=side===0?[along,-depth]:side===1?[along,depth]:side===2?[-depth,along]:[depth,along];
    // a faixa leste virou zona rural — nada de guarda-sol no pasto
    if(!(x>RURAL_X0-2&&Math.abs(z)<RURAL_HALF+2))return[x,z];
  }
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
  addLifeguard(-LG,0,Math.PI/2); // o posto leste saiu: lá agora é zona rural
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
// ----- Zona rural: península a leste, da saída da cidade até a montanha-mirante -----
{
  const RW=RURAL_X1-RURAL_X0,RD=RURAL_HALF*2;
  // chão de grama com estrada de terra (continuação da rua central) e roças pintadas
  const c=document.createElement('canvas');c.width=1024;c.height=512;
  const x=c.getContext('2d');
  const u=v=>(v-RURAL_X0)/RW*1024,w=v=>(v+RURAL_HALF)/RD*512;
  x.fillStyle='#69a85e';x.fillRect(0,0,1024,512);
  for(let k=0;k<2600;k++){
    x.fillStyle=`rgba(${irand(70,115)},${irand(130,175)},${irand(60,95)},.22)`;
    x.fillRect(Math.random()*1024,Math.random()*512,irand(2,7),irand(2,7));
  }
  // roças: terra arada com linhas de plantação
  const fields=[[202,250,14,62],[200,244,-64,-22],[262,310,30,86],[258,300,-90,-42]];
  for(const[fx0,fx1,fz0,fz1]of fields){
    x.fillStyle='#8a6a3e';x.fillRect(u(fx0),w(fz0),u(fx1)-u(fx0),w(fz1)-w(fz0));
    x.strokeStyle='rgba(120,185,90,.9)';x.lineWidth=3;
    for(let r=w(fz0)+5;r<w(fz1)-2;r+=7){
      x.beginPath();x.moveTo(u(fx0)+3,r);x.lineTo(u(fx1)-3,r);x.stroke();
    }
  }
  // estrada de terra: sai da rua central da cidade e morre no pé da montanha
  x.fillStyle='#b08a5e';x.fillRect(u(RURAL_X0),w(-3.4),u(MOUNT_X-MOUNT_R+16)-u(RURAL_X0),w(3.4)-w(-3.4));
  for(let k=0;k<420;k++){
    x.fillStyle=`rgba(${irand(140,180)},${irand(105,135)},${irand(70,95)},.5)`;
    x.fillRect(rand(u(RURAL_X0),u(MOUNT_X-MOUNT_R+16)),rand(w(-3.4),w(3.4)),irand(2,6),irand(1,3));
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(RW,RD),
    new THREE.MeshStandardMaterial({map:t,roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.set(RURAL_X0+RW/2,-.02,0);
  ground.receiveShadow=true;scene.add(ground);
}

const ruralWallCols=[0xf4e3c2,0xe8d8c8,0xd9e4d0,0xf0d9b0,0xe4c9b0];
function addFarmHouse(cx,cz,ry){
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
  solids.push({x0:cx-r,x1:cx+r,z0:cz-r,z1:cz+r});
}
addFarmHouse(212,-12,0);addFarmHouse(236,10,-.4);addFarmHouse(258,12,.3);
addFarmHouse(282,-12,.2);addFarmHouse(302,10,-.25);addFarmHouse(222,74,2.8);
addFarmHouse(310,-58,1.3);

// celeiro vermelho com silo
{
  const barnM=new THREE.MeshStandardMaterial({color:0xb03a2e,roughness:.95});
  const barn=new THREE.Mesh(new THREE.BoxGeometry(7,3.4,5),barnM);
  barn.position.set(250,1.68,-34);barn.castShadow=true;barn.receiveShadow=true;scene.add(barn);
  const broof=new THREE.Mesh(new THREE.ConeGeometry(4.6,2,4),
    new THREE.MeshStandardMaterial({color:0x6e5a50,roughness:.9}));
  broof.position.set(250,4.4,-34);broof.rotation.y=Math.PI/4;broof.castShadow=true;scene.add(broof);
  const trim=new THREE.Mesh(new THREE.BoxGeometry(2.2,2.2,.08),
    new THREE.MeshStandardMaterial({color:0xf2ead6,roughness:.9}));
  trim.position.set(250,1.5,-31.45);scene.add(trim);
  solids.push({x0:246.2,x1:253.8,z0:-36.8,z1:-31.2});
  const silo=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,6,10),
    new THREE.MeshStandardMaterial({color:0xc9cdd6,roughness:.6}));
  silo.position.set(257,3,-32);silo.castShadow=true;scene.add(silo);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1.5,10,6,0,Math.PI*2,0,Math.PI/2),
    new THREE.MeshStandardMaterial({color:0x9aa0ad,roughness:.6}));
  dome.position.set(257,6,-32);scene.add(dome);
  solids.push({x0:255.4,x1:258.6,z0:-33.6,z1:-30.4});
}

// pinheiros pela zona rural e encostas baixas da montanha
const pineLeafM=new THREE.MeshStandardMaterial({color:0x2e7a44,roughness:1});
const pineTrunkM=new THREE.MeshStandardMaterial({color:0x7a5a3e,roughness:1});
function addPine(px,pz){
  const g=new THREE.Group(),h=rand(2.2,3.6);
  const tr=new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,h*.5,5),pineTrunkM);
  tr.position.y=h*.25;tr.castShadow=true;g.add(tr);
  for(let k=0;k<2;k++){
    const cone=new THREE.Mesh(new THREE.ConeGeometry(.9-k*.3,h*.6,7),pineLeafM);
    cone.position.y=h*.45+k*h*.32;cone.castShadow=true;g.add(cone);
  }
  g.position.set(px,groundHeight(px,pz)-.02,pz);scene.add(g);
}
{
  const fields=[[202,250,14,62],[200,244,-64,-22],[262,310,30,86],[258,300,-90,-42]];
  let placed=0,guard=0;
  while(placed<44&&guard++<400){
    const px=rand(RURAL_X0+6,RURAL_X1-8),pz=rand(-RURAL_HALF+6,RURAL_HALF-6);
    if(Math.abs(pz)<7&&px<MOUNT_X)continue;            // estrada de terra
    if(groundHeight(px,pz)>18)continue;                 // encosta alta é rocha
    if(fields.some(([a,b,d,e])=>px>a-2&&px<b+2&&pz>d-2&&pz<e+2))continue;
    addPine(px,pz);placed++;
  }
}

// fardos de feno nas roças
{
  const hayM=new THREE.MeshStandardMaterial({color:0xd9b25e,roughness:1});
  const hayG=new THREE.CylinderGeometry(.55,.55,.9,9);
  const spots=[[214,30],[238,48],[228,-40],[212,-52],[278,52],[296,70],[272,-62],[288,-78]];
  for(const[hx,hz]of spots){
    const hay=new THREE.Mesh(hayG,hayM);
    hay.rotation.z=Math.PI/2;hay.rotation.y=rand(0,3);
    hay.position.set(hx,.55,hz);hay.castShadow=true;scene.add(hay);
  }
}

// montanha low poly: a malha usa a MESMA grade/triangulação da groundHeight
// da física (vértices = nós da grade), então colisão e visual batem 1:1
{
  const geo=new THREE.PlaneGeometry(MOUNT_S,MOUNT_S,MOUNT_SEG,MOUNT_SEG);
  geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;
  const col=new Float32Array(pos.count*3);
  const grass=new THREE.Color(0x69a85e),dirt=new THREE.Color(0x8a7a52),
        rock=new THREE.Color(0x8d8f99),peakC=new THREE.Color(0xc2c6cf),
        trail=new THREE.Color(0xb08a5e),tmp=new THREE.Color();
  const cell=MOUNT_S/MOUNT_SEG;
  for(let i=0;i<pos.count;i++){
    const vx=pos.getX(i),vz=pos.getZ(i);
    const h=groundHeight(vx+MOUNT_X,vz);
    pos.setY(i,h);
    const f=h/MOUNT_H;
    if(f<.25)tmp.lerpColors(grass,dirt,f/.25);
    else if(f<.7)tmp.lerpColors(dirt,rock,(f-.25)/.45);
    else tmp.lerpColors(rock,peakC,(f-.7)/.3);
    // trilha na face oeste: a fileira de vértices em z=0, alinhada à estrada
    if(Math.abs(vz)<cell/2&&vx<2)tmp.lerp(trail,.7);
    tmp.offsetHSL(0,0,rand(-.025,.025));
    col[i*3]=tmp.r;col[i*3+1]=tmp.g;col[i*3+2]=tmp.b;
  }
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,
    new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:true}));
  m.position.set(MOUNT_X,.02,0);m.castShadow=true;m.receiveShadow=true;scene.add(m);
  // pedras espalhadas nas encostas
  const rockM=new THREE.MeshStandardMaterial({color:0x84868f,roughness:.95});
  for(let k=0;k<14;k++){
    const a=rand(0,Math.PI*2),d=rand(MOUNT_R*.3,MOUNT_R*.9);
    const rx=MOUNT_X+Math.cos(a)*d,rz=Math.sin(a)*d;
    const rk=new THREE.Mesh(new THREE.DodecahedronGeometry(rand(.5,1.3),0),rockM);
    rk.position.set(rx,groundHeight(rx,rz)+.1,rz);
    rk.rotation.set(rand(0,3),rand(0,3),rand(0,3));
    rk.castShadow=true;scene.add(rk);
  }
  // mirante no pico: mastro com bandeira (e a vista da cidade)
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,4.6,6),
    new THREE.MeshStandardMaterial({color:0xd8dde6,roughness:.5}));
  pole.position.set(MOUNT_X,MOUNT_H+2.3,0);pole.castShadow=true;scene.add(pole);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.7,1),
    new THREE.MeshBasicMaterial({color:0xff2e88,side:THREE.DoubleSide}));
  flag.position.set(MOUNT_X+.9,MOUNT_H+4.1,0);scene.add(flag);
}

export function updateBeach(time){
  for(const w of waves){
    const s=1+w.amp*(.5+.5*Math.sin(time*w.spd+w.ph));
    w.m.scale.set(s,s,1);
    w.m.material.opacity=.05+.3*Math.max(0,Math.sin(time*w.spd+w.ph+1.2));
  }
}

// Street poles
// Luz dos postes: mesmo truque dos faróis dos carros — texturas aditivas em
// materiais compartilhados; daynight.js controla visible/opacity pelo nightF.
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
{
  const poleG=new THREE.CylinderGeometry(.08,.1,5.4,5);
  const poleM=new THREE.MeshStandardMaterial({color:0x7d7787,roughness:.8});
  const bulbG=new THREE.SphereGeometry(.22,8,6);
  const glowG=new THREE.PlaneGeometry(9,9);
  for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){
    if((i+j)%2)continue;
    const px=nodeX(i)+8.2*((i+j)%4<2?1:-1),pz=nodeX(j)+8.2;
    const p=new THREE.Mesh(poleG,poleM);p.position.set(px,2.7,pz);p.castShadow=true;scene.add(p);
    const b=new THREE.Mesh(bulbG,lampBulbMat);b.position.set(px,5.5,pz);scene.add(b);
    const gl=new THREE.Mesh(glowG,lampGlowMat);
    gl.rotation.x=-Math.PI/2;gl.position.set(px,.07,pz);gl.renderOrder=2;scene.add(gl);
    const h=new THREE.Sprite(lampHaloMat);
    h.position.set(px,5.5,pz);h.scale.set(2.6,2.6,1);scene.add(h);
  }
}

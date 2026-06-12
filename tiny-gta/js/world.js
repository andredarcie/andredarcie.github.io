import * as THREE from 'three';
import {N,CELL,ROAD,BLOCK,SIDE,HALF,GROUND,BEACH,nodeX,rand,irand,pick,clamp,
  RURAL_X0,RURAL_X1,RURAL_HALF,MOUNT_X,MOUNT_R,MOUNT_H,MOUNT_SEG,MOUNT_S,groundHeight} from './constants.js';
import {scene,renderer} from './engine.js';
import {addPalm} from '../assets/models/props/palm.js';
import {addUmbrella} from '../assets/models/props/umbrella.js';
import {addChair} from '../assets/models/props/chair.js';
import {addLifeguard} from '../assets/models/props/lifeguard.js';
import {addFarmHouse} from '../assets/models/props/farm-house.js';
import {addPine} from '../assets/models/props/pine.js';
import {addStreetLamp,lampGlowMat,lampHaloMat,lampBulbMat} from '../assets/models/props/street-lamp.js';
import {addBuilding,finalizeBuildings,buildingMats} from '../assets/models/city/building.js';
import {addAbandonedLot,finalizeAbandonedLots} from '../assets/models/city/abandoned-lot.js';
import {finalizeProps} from '../assets/models/props/prop-merge.js';
import {addNightclub,CLUB_I,CLUB_J} from '../assets/models/city/nightclub.js';
import {addBarnWithSilo} from '../assets/models/rural/barn-with-silo.js';
import {addHayBales} from '../assets/models/rural/hay-bales.js';
import {addSummitFlag} from '../assets/models/rural/summit-flag.js';
import {makeTexturedPlane} from '../assets/models/terrain/textured-plane.js';
import {addShallowsAndWaves} from '../assets/models/terrain/shallows-waves.js';
import {addBeachRock} from '../assets/models/terrain/beach-rock.js';
import {makeMountain} from '../assets/models/terrain/mountain.js';
import {addMountainRock} from '../assets/models/terrain/mountain-rock.js';

export const solids=[];
export const parks=new Set();
while(parks.size<6){
  const i=irand(0,N-1),j=irand(0,N-1);
  if(i===CLUB_I&&j===CLUB_J)continue; // quarteirão reservado pra boate
  if(Math.abs(i-4)+Math.abs(j-4)>1)parks.add(i+'_'+j);
}
export const isPark=(i,j)=>parks.has(i+'_'+j);

// Lotes da cidade, sorteados ANTES da textura do chão: ~1/3 não ganha prédio
// e vira lote abandonado (terra batida pintada no canvas + entulho 3D)
const cityLots=[];
for(let i=0;i<N;i++)for(let j=0;j<N;j++){
  if(isPark(i,j))continue;
  if(i===CLUB_I&&j===CLUB_J)continue; // o quarteirão da boate não vira lote
  const x0=nodeX(i)+ROAD/2+SIDE,z0=nodeX(j)+ROAD/2+SIDE,inner=BLOCK-2*SIDE;
  const sx=Math.random()<.5?1:2,sz=Math.random()<.5?1:2;
  for(let a=0;a<sx;a++)for(let b=0;b<sz;b++)
    cityLots.push({cx:x0+(a+.5)*inner/sx,cz:z0+(b+.5)*inner/sz,
      w:inner/sx-1.6,d:inner/sz-1.6,empty:Math.random()<1/3});
}

// Ground texture (asphalt, sidewalks, crosswalks)
const groundCv=document.createElement('canvas');groundCv.width=2048;groundCv.height=2048;
{
  const x=groundCv.getContext('2d'),s=2048/GROUND,M=v=>(v+GROUND/2)*s;
  x.fillStyle='#46464a';x.fillRect(0,0,2048,2048);                // asfalto neutro
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){
    const x0=nodeX(i)+ROAD/2,z0=nodeX(j)+ROAD/2;
    x.fillStyle='#bcb6a8';x.fillRect(M(x0),M(z0),BLOCK*s,BLOCK*s); // calçadão claro
    x.fillStyle=isPark(i,j)?'#5fae62':'#9c968a';
    x.fillRect(M(x0+SIDE),M(z0+SIDE),(BLOCK-2*SIDE)*s,(BLOCK-2*SIDE)*s);
    if(isPark(i,j)){
      x.strokeStyle='#d8c79a';x.lineWidth=1.4*s;
      x.beginPath();x.moveTo(M(x0+SIDE),M(z0+BLOCK/2));x.lineTo(M(x0+BLOCK-SIDE),M(z0+BLOCK/2));
      x.moveTo(M(x0+BLOCK/2),M(z0+SIDE));x.lineTo(M(x0+BLOCK/2),M(z0+BLOCK-SIDE));x.stroke();
    }
  }
  // lotes abandonados: terra batida com manchas de entulho e mato ralo
  for(const lot of cityLots){
    if(!lot.empty)continue;
    const lx=M(lot.cx-lot.w/2),lz=M(lot.cz-lot.d/2),lw=lot.w*s,ld=lot.d*s;
    x.fillStyle='#8a7a62';x.fillRect(lx,lz,lw,ld);
    for(let k=0;k<46;k++){
      x.fillStyle=Math.random()<.3
        ?`rgba(${irand(80,110)},${irand(120,150)},${irand(60,85)},.5)`
        :`rgba(${irand(125,165)},${irand(108,140)},${irand(82,112)},.5)`;
      x.fillRect(lx+Math.random()*lw,lz+Math.random()*ld,irand(2,6),irand(2,6));
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
  const ground=makeTexturedPlane(GROUND,GROUND,gt);
  ground.material.roughness=.95;
  scene.add(ground);
}

export {buildingMats}; // daynight.js controla emissiveIntensity (janelas acesas à noite)

for(let i=0;i<N;i++)for(let j=0;j<N;j++){
  if(!isPark(i,j))continue;
  const x0=nodeX(i)+ROAD/2+SIDE,z0=nodeX(j)+ROAD/2+SIDE,inner=BLOCK-2*SIDE;
  for(let k=0;k<7;k++)addPalm(x0+rand(1,inner-1),z0+rand(1,inner-1));
}
for(const lot of cityLots){
  if(lot.empty)addAbandonedLot(lot.cx,lot.cz,lot.w,lot.d,solids);
  else addBuilding(lot.cx,lot.cz,lot.w,lot.d,solids);
}
addNightclub(solids); // boate de frente pro mar no quarteirão reservado
finalizeBuildings();     // funde a cidade inteira em ~18 meshes (draw calls)
finalizeAbandonedLots(); // e todos os lotes abandonados em ~5

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
  scene.add(makeTexturedPlane(W,W,st,-.06));
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

for(let k=0;k<16;k++){const[bx,bz]=beachSpot(7);addUmbrella(bx,bz);}

for(let k=0;k<14;k++){const[bx,bz]=beachSpot(8);addChair(bx,bz);}

// half-buried rock clusters near the water
{
  for(let k=0;k<10;k++){
    const[bx,bz]=beachSpot(3);
    for(let r=0;r<irand(2,4);r++){
      addBeachRock(bx+rand(-1.6,1.6),bz+rand(-1.6,1.6),rand(.3,.9));
    }
  }
}

// lifeguard towers, one per side facing the sea
{
  const LG=GROUND/2+BEACH/2;
  addLifeguard(0,-LG,0);addLifeguard(0,LG,Math.PI);
  addLifeguard(-LG,0,Math.PI/2); // o posto leste saiu: lá agora é zona rural
}

// turquoise shallows fading into the deep sea color, plus animated foam waves
const waves=addShallowsAndWaves(GROUND/2,BEACH);
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
  // borda de praia onde o pasto encontra o mar: faixa de areia (~12 un) nos
  // lados norte/sul e na ponta leste, com areia molhada escura rente à água
  const SZ=26,SX=47; // 12 unidades em px nos eixos z e x do canvas
  x.fillStyle='#e3cf9c';
  x.fillRect(0,0,1024,SZ);x.fillRect(0,512-SZ,1024,SZ);x.fillRect(1024-SX,0,SX,512);
  for(let k=0;k<800;k++){ // transição irregular pasto→areia + grão
    x.fillStyle=`rgba(${irand(205,238)},${irand(178,212)},${irand(128,162)},.5)`;
    const e=irand(0,2);
    if(e===0)x.fillRect(Math.random()*1024,SZ-7+Math.random()*14,irand(3,8),irand(2,5));
    else if(e===1)x.fillRect(Math.random()*1024,512-SZ-7+Math.random()*14,irand(3,8),irand(2,5));
    else x.fillRect(1024-SX-12+Math.random()*24,Math.random()*512,irand(2,5),irand(3,8));
  }
  x.fillStyle='rgba(146,116,78,.6)'; // areia úmida na linha d'água
  x.fillRect(0,0,1024,8);x.fillRect(0,512-8,1024,8);x.fillRect(1024-15,0,15,512);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const ground=makeTexturedPlane(RW,RD,t,-.02);
  ground.position.set(RURAL_X0+RW/2,-.02,0);
  scene.add(ground);
}

solids.push(addFarmHouse(212,-12,0),addFarmHouse(236,10,-.4),addFarmHouse(258,12,.3),
  addFarmHouse(282,-12,.2),addFarmHouse(302,10,-.25),addFarmHouse(222,74,2.8),
  addFarmHouse(310,-58,1.3));

// celeiro vermelho com silo
addBarnWithSilo(solids);

// pinheiros pela zona rural e encostas baixas da montanha
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
addHayBales();

// montanha low poly: a malha usa a MESMA grade/triangulação da groundHeight
// da física (vértices = nós da grade), então colisão e visual batem 1:1
{
  const m=makeMountain(MOUNT_S,MOUNT_SEG);
  m.position.set(MOUNT_X,.02,0);scene.add(m);
  // pedras espalhadas nas encostas
  for(let k=0;k<14;k++){
    const a=rand(0,Math.PI*2),d=rand(MOUNT_R*.3,MOUNT_R*.9);
    const rx=MOUNT_X+Math.cos(a)*d,rz=Math.sin(a)*d;
    addMountainRock(rx,rz,rand(.5,1.3));
  }
  // mirante no pico: mastro com bandeira (e a vista da cidade)
  addSummitFlag(MOUNT_X,MOUNT_H,0);
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
export {lampGlowMat,lampHaloMat,lampBulbMat};
{
  for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){
    if((i+j)%2)continue;
    const px=nodeX(i)+8.2*((i+j)%4<2?1:-1),pz=nodeX(j)+8.2;
    addStreetLamp(px,pz);
  }
}

// Fusão dos props estáticos: TEM que ser a última linha do mundo — qualquer
// addPalm/addPine/addStreetLamp depois daqui não apareceria na cena
finalizeProps();

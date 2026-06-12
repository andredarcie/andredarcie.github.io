import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scene} from '../../../js/engine.js';
import {rand,irand} from '../../../js/constants.js';

// Lote abandonado no lugar de prédio que não nasceu: entulho, cerca de tábuas
// caindo, pneus, mato e caçamba de entulho. Mesmo truque do building.js:
// geometria vai para baldes por material e finalizeAbandonedLots() funde a
// cidade inteira em ~5 meshes (draw calls).

const concreteM=new THREE.MeshStandardMaterial({color:0x9a958c,roughness:.95});
const woodM=new THREE.MeshStandardMaterial({color:0x7a5c3a,roughness:.9});
const tireM=new THREE.MeshStandardMaterial({color:0x1c1a20,roughness:.95});
const binM=new THREE.MeshStandardMaterial({color:0x55684c,roughness:.8,metalness:.25});
const weedM=new THREE.MeshStandardMaterial({color:0x5f8a48,roughness:.95});

const buckets={concrete:[],wood:[],tire:[],bin:[],weed:[]};

function push(arr,geo,x,y,z,ry=0,rx=0,rz=0){
  if(rx)geo.rotateX(rx);
  if(rz)geo.rotateZ(rz);
  if(ry)geo.rotateY(ry);
  geo.translate(x,y,z);
  arr.push(geo);
}

export function addAbandonedLot(cx,cz,w,d,solids){
  // pilhas de entulho: lajes e blocos quebrados meio afundados na terra
  for(let k=0;k<irand(2,3);k++){
    const px=cx+rand(-w/2+1.2,w/2-1.2),pz=cz+rand(-d/2+1.2,d/2-1.2);
    for(let q=0;q<irand(2,4);q++)
      push(buckets.concrete,
        new THREE.BoxGeometry(rand(.5,1.3),rand(.16,.45),rand(.4,1.1)),
        px+rand(-.7,.7),rand(.08,.28),pz+rand(-.7,.7),
        rand(0,Math.PI),rand(-.1,.1),rand(-.12,.12));
  }
  // cerca de tábuas em 1–2 lados, com buracos e tábuas tortas
  const order=[[1,0],[-1,0],[0,1],[0,-1]].sort(()=>Math.random()-.5);
  const nf=irand(1,2);
  for(let e=0;e<nf;e++){
    const[ex,ez]=order[e];
    const alongX=ez!==0; // borda norte/sul: a cerca corre no eixo x
    const len=(alongX?w:d)-1.2;
    const bx=alongX?cx:cx+ex*(w/2-.25);
    const bz=alongX?cz+ez*(d/2-.25):cz;
    for(let t=-len/2;t<=len/2;t+=.42){
      if(Math.random()<.28)continue; // tábua que já caiu
      push(buckets.wood,
        new THREE.BoxGeometry(alongX?.2:.045,rand(.7,.95),alongX?.045:.2),
        bx+(alongX?t:0),.42,bz+(alongX?0:t),0,rand(-.08,.08),rand(-.14,.14));
    }
    if(Math.random()<.85){ // travessa que sobrou pendurada
      const rl=len*rand(.4,.9);
      push(buckets.wood,
        new THREE.BoxGeometry(alongX?rl:.05,.09,alongX?.05:rl),
        bx+(alongX?rand(-1,1):0),.6,bz+(alongX?0:rand(-1,1)),
        0,alongX?0:rand(-.05,.05),alongX?rand(-.05,.05):0);
    }
  }
  // pneus largados: a maioria deitada, alguns encostados de pé
  for(let k=0;k<irand(2,4);k++){
    const flat=Math.random()<.7;
    push(buckets.tire,new THREE.TorusGeometry(.3,.11,6,12),
      cx+rand(-w/2+.8,w/2-.8),flat?.12:.41,cz+rand(-d/2+.8,d/2-.8),
      rand(0,Math.PI),flat?Math.PI/2:rand(-.2,.2));
  }
  // mato crescendo nas rachaduras
  for(let k=0;k<irand(5,9);k++){
    const h=rand(.2,.45);
    push(buckets.weed,new THREE.ConeGeometry(rand(.05,.1),h,5),
      cx+rand(-w/2+.5,w/2-.5),h/2,cz+rand(-d/2+.5,d/2-.5),
      rand(0,Math.PI),rand(-.15,.15),rand(-.15,.15));
  }
  // tambores enferrujados, alguns tombados
  for(let k=0;k<irand(0,2);k++){
    const down=Math.random()<.4;
    push(buckets.bin,new THREE.CylinderGeometry(.3,.3,.85,8),
      cx+rand(-w/2+.9,w/2-.9),down?.3:.43,cz+rand(-d/2+.9,d/2-.9),
      rand(0,Math.PI),0,down?Math.PI/2:rand(-.05,.05));
  }
  // caçamba de entulho (sólida: carro e pedestre batem nela)
  if(Math.random()<.45){
    const px=cx+rand(-w/2+1.6,w/2-1.6),pz=cz+rand(-d/2+1.4,d/2-1.4);
    const ry=rand(-.25,.25);
    push(buckets.bin,new THREE.BoxGeometry(2.1,1.0,1.15),px,.62,pz,ry);
    push(buckets.bin,new THREE.BoxGeometry(2.18,.08,1.22),px,1.16,pz,ry,0,-.06);
    solids.push({x0:px-1.25,x1:px+1.25,z0:pz-.85,z1:pz+.85,h:1.25});
  }
}

// Funde cada balde num único mesh — chamar UMA vez, depois da cidade montada
export function finalizeAbandonedLots(){
  const addMerged=(geos,mat,cast=true)=>{
    if(!geos.length)return;
    const m=new THREE.Mesh(mergeGeometries(geos),mat);
    m.castShadow=cast;
    scene.add(m);
    geos.length=0;
  };
  addMerged(buckets.concrete,concreteM);
  addMerged(buckets.wood,woodM);
  addMerged(buckets.tire,tireM);
  addMerged(buckets.bin,binM);
  addMerged(buckets.weed,weedM,false);
}

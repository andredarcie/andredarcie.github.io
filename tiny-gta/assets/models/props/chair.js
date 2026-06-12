import * as THREE from 'three';
import {bakeProp} from './prop-merge.js';
import {rand,pick} from '../../../js/constants.js';

const umbCols=[0xff2e88,0x19e3ff,0xffd24a,0x9dff2e,0xff8c2e];

// Materiais cacheados por cor para a fusão de props (um material por instância
// impediria o merge)
const legM=new THREE.MeshStandardMaterial({color:0xf2ead6,roughness:.8});
const seatMats=new Map();
const seatFor=c=>{if(!seatMats.has(c))seatMats.set(c,
  new THREE.MeshStandardMaterial({color:c,roughness:.9}));
  return seatMats.get(c);};

export function addChair(x0,z0){
  const m=seatFor(pick(umbCols));
  const g=new THREE.Group();
  const seat=new THREE.Mesh(new THREE.BoxGeometry(.72,.08,1.15),m);
  seat.position.y=.3;seat.castShadow=true;g.add(seat);
  const back=new THREE.Mesh(new THREE.BoxGeometry(.72,.68,.08),m);
  back.position.set(0,.58,-.58);back.rotation.x=.4;back.castShadow=true;g.add(back);
  for(const[lx,lz]of[[-.3,.45],[.3,.45],[-.3,-.45],[.3,-.45]]){
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.07,.3,.07),legM);
    leg.position.set(lx,.15,lz);g.add(leg);
  }
  g.rotation.y=rand(0,6.28);g.position.set(x0,-.06,z0);bakeProp(g);
  return g;
}

import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scene} from '../../../js/engine.js';

// Fusão de props estáticos (palmeira, pinheiro, poste, guarda-sol, cadeira,
// posto de salva-vidas, casas rurais, pedras, feno): cada módulo continua
// montando o prop do jeito antigo (grupo + meshes), mas em vez de entrar na
// cena, bakeProp() assa a matriz de mundo de cada mesh num balde por material.
// finalizeProps() funde cada balde num único mesh — ~1.200 draw calls viram ~30.
// Flags de sombra/renderOrder vêm do primeiro mesh visto com aquele material.
const buckets=new Map(); // material -> {geos,cast,receive,order}

export function bakeProp(root){
  root.updateMatrixWorld(true);
  root.traverse(o=>{
    if(!o.isMesh)return;
    let b=buckets.get(o.material);
    if(!b){
      b={geos:[],cast:!!o.castShadow,receive:!!o.receiveShadow,order:o.renderOrder};
      buckets.set(o.material,b);
    }
    b.geos.push(o.geometry.clone().applyMatrix4(o.matrixWorld));
  });
}

// Chamar UMA vez, no fim do world.js, depois de todos os props colocados
export function finalizeProps(){
  for(const[mat,b]of buckets){
    if(!b.geos.length)continue;
    const m=new THREE.Mesh(mergeGeometries(b.geos),mat);
    m.castShadow=b.cast;m.receiveShadow=b.receive;m.renderOrder=b.order;
    scene.add(m);
    b.geos.length=0;
  }
}

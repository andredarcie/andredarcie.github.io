import * as THREE from 'three';
import {scene} from '../../../js/engine.js';
import {rand,pick} from '../../../js/constants.js';

const umbCols=[0xff2e88,0x19e3ff,0xffd24a,0x9dff2e,0xff8c2e];

export function addUmbrella(x0,z0){
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
  return g;
}

import * as THREE from 'three';
import {rand} from '../../../js/constants.js';

const bloodMat=new THREE.MeshBasicMaterial({
  color:0x5f0018,transparent:true,opacity:.78,depthWrite:false
});
const bloodGeo=new THREE.CircleGeometry(1,18);

export function makeBloodPuddle(){
  const puddle=new THREE.Group();
  const main=new THREE.Mesh(bloodGeo,bloodMat.clone());
  main.rotation.x=-Math.PI/2;
  main.scale.set(rand(.55,1.25),rand(.38,.9),1);
  main.position.y=.018;
  puddle.add(main);
  for(let i=0;i<3;i++){
    const spot=new THREE.Mesh(bloodGeo,bloodMat.clone());
    spot.rotation.x=-Math.PI/2;
    spot.scale.set(rand(.12,.34),rand(.08,.24),1);
    spot.position.set(rand(-.75,.75),.02,rand(-.55,.55));
    puddle.add(spot);
  }
  return puddle;
}

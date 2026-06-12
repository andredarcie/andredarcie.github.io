import * as THREE from 'three';

// Bazuca: tubo verde-oliva com boca e culatra escuras, empunhadura e mira.
// A versão pickup ganha o anel de brilho no chão (laranja: perigo) — ela fica
// escondida na zona rural e dispara o rampage de destruição (js/weapons.js).

const tubeMat=new THREE.MeshStandardMaterial({color:0x4a5a2a,roughness:.55,metalness:.45});
const darkMat=new THREE.MeshStandardMaterial({color:0x14161a,roughness:.4,metalness:.8});
const glowMat=new THREE.MeshBasicMaterial({color:0xff5f2e,transparent:true,opacity:.32});

export function makeBazookaModel({pickup=false}={}){
  const g=new THREE.Group();
  const tube=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,1.25,10),tubeMat);
  tube.rotation.x=Math.PI/2;g.add(tube);
  const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.16,10),darkMat);
  muzzle.rotation.x=Math.PI/2;muzzle.position.z=.62;g.add(muzzle);
  const rear=new THREE.Mesh(new THREE.CylinderGeometry(.105,.14,.18,10),darkMat);
  rear.rotation.x=Math.PI/2;rear.position.z=-.6;g.add(rear);
  const grip=new THREE.Mesh(new THREE.BoxGeometry(.07,.22,.1),darkMat);
  grip.position.set(0,-.18,.12);g.add(grip);
  const sight=new THREE.Mesh(new THREE.BoxGeometry(.05,.12,.16),darkMat);
  sight.position.set(0,.17,.18);g.add(sight);
  if(pickup){
    const glow=new THREE.Mesh(new THREE.TorusGeometry(1.05,.05,8,28),glowMat);
    glow.rotation.x=Math.PI/2;
    glow.position.y=-.55;
    g.add(glow);
  }
  const muzzlePoint=new THREE.Object3D();
  muzzlePoint.position.set(0,0,.85);
  g.userData.muzzlePoint=muzzlePoint;
  g.add(muzzlePoint);
  return g;
}

// Míssil: corpo metálico, ogiva vermelha e chama do motor (tremula no voo)
export function makeMissileModel(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.5,8),
    new THREE.MeshBasicMaterial({color:0x9aa0a8}));
  body.rotation.x=Math.PI/2;g.add(body);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.07,.18,8),
    new THREE.MeshBasicMaterial({color:0xc23b3b}));
  nose.rotation.x=Math.PI/2;nose.position.z=.34;g.add(nose);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.09,.3,6),
    new THREE.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.85}));
  flame.rotation.x=-Math.PI/2;flame.position.z=-.4;g.add(flame);
  g.userData.flame=flame;
  return g;
}

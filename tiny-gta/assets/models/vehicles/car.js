import * as THREE from 'three';
import {scene} from '../../../js/engine.js';

function taperTop(geo,sx,sz){
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
    if(p.getY(i)>0){p.setX(i,p.getX(i)*sx);p.setZ(i,p.getZ(i)*sz);}
  }
  geo.computeVertexNormals();
  return geo;
}

const bodyG=taperTop(new THREE.BoxGeometry(2.1,.6,5.4,4,2,10),.94,.97);
const cabG=taperTop(new THREE.BoxGeometry(1.8,.76,2.85),.8,.64);
const hoodG=new THREE.BoxGeometry(1.86,.14,1.5,4,1,3);
const trunkG=new THREE.BoxGeometry(1.86,.13,1.1,4,1,2);
const roofG=new THREE.BoxGeometry(1.44,.06,1.8,3,1,3);
const bumperG=new THREE.BoxGeometry(2.14,.2,.26,4,1,1);
const grilleG=new THREE.BoxGeometry(1.0,.16,.06);
const plateG=new THREE.BoxGeometry(.52,.17,.03);
const mirrorG=new THREE.BoxGeometry(.16,.1,.07);
const exhaustG=new THREE.CylinderGeometry(.05,.05,.2,6);
const wheelG=new THREE.CylinderGeometry(.44,.44,.36,12);
const hlG=new THREE.BoxGeometry(.32,.15,.07);
const tlG=new THREE.BoxGeometry(.36,.13,.07);
const seatBaseG=new THREE.BoxGeometry(.62,.16,.6);
const seatBackG=new THREE.BoxGeometry(.62,.6,.13);
const benchG=new THREE.BoxGeometry(1.56,.16,.55);
const benchBackG=new THREE.BoxGeometry(1.56,.5,.13);
const dashG=new THREE.BoxGeometry(1.7,.22,.36);
const wheelRimG=new THREE.TorusGeometry(.19,.035,6,14);
const doorG=new THREE.BoxGeometry(.07,.55,1.35);
const beamGeo=new THREE.PlaneGeometry(5.4,7.4);

const tireM=new THREE.MeshStandardMaterial({color:0x14121a,roughness:.95});
const hubM=new THREE.MeshStandardMaterial({color:0xb9bec9,roughness:.3,metalness:.85});
const darkM=new THREE.MeshStandardMaterial({color:0x1a1d24,roughness:.6,metalness:.25});
const glassM=new THREE.MeshStandardMaterial({color:0x8fc3e0,roughness:.08,metalness:.6,
  transparent:true,opacity:.42,depthWrite:false});
const seatM=new THREE.MeshStandardMaterial({color:0x2a2d38,roughness:.85});
const plateM=new THREE.MeshStandardMaterial({color:0xe8e9e2,roughness:.7});

const beamCanvas=document.createElement('canvas');
beamCanvas.width=256;beamCanvas.height=256;
{
  const x=beamCanvas.getContext('2d');
  for(const cx of[92,164]){
    x.save();x.translate(cx,16);x.scale(1,1.7);
    const g=x.createRadialGradient(0,0,4,0,0,132);
    g.addColorStop(0,'rgba(255,238,190,.9)');
    g.addColorStop(.35,'rgba(255,222,155,.38)');
    g.addColorStop(1,'rgba(255,205,125,0)');
    x.fillStyle=g;x.beginPath();x.arc(0,0,132,0,7);x.fill();x.restore();
  }
}
const beamTex=new THREE.CanvasTexture(beamCanvas);
beamTex.colorSpace=THREE.SRGBColorSpace;
export const beamMat=new THREE.MeshBasicMaterial({map:beamTex,transparent:true,
  opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
beamMat.visible=false;

const paintCache=new Map();
function paintFor(color){
  if(!paintCache.has(color))
    paintCache.set(color,new THREE.MeshStandardMaterial({color,roughness:.3,metalness:.5}));
  return paintCache.get(color);
}

export function makeCar(color,police){
  const g=new THREE.Group();
  const paint=paintFor(color);

  const body=new THREE.Mesh(bodyG,paint);
  body.position.y=.72;body.castShadow=true;g.add(body);

  const hood=new THREE.Mesh(hoodG,paint);
  hood.position.set(0,1.05,1.95);hood.rotation.x=.05;hood.castShadow=true;g.add(hood);
  const trunk=new THREE.Mesh(trunkG,paint);
  trunk.position.set(0,1.04,-2.12);trunk.rotation.x=-.04;g.add(trunk);

  const cab=new THREE.Mesh(cabG,glassM);
  cab.position.set(0,1.4,-.28);cab.castShadow=true;cab.renderOrder=3;g.add(cab);
  const roof=new THREE.Mesh(roofG,paint);
  roof.position.set(0,1.81,-.28);roof.castShadow=true;g.add(roof);

  g.userData.dentable=[body,hood,trunk,roof];
  for(const bz of[2.82,-2.82]){
    const bmp=new THREE.Mesh(bumperG,darkM);
    bmp.position.set(0,.5,bz);g.add(bmp);
    g.userData.dentable.push(bmp);
  }

  for(const sx of[-.46,.46]){
    const sb=new THREE.Mesh(seatBaseG,seatM);sb.position.set(sx,1.06,-.08);g.add(sb);
    const sk=new THREE.Mesh(seatBackG,seatM);
    sk.position.set(sx,1.36,-.42);sk.rotation.x=-.12;g.add(sk);
  }
  const bench=new THREE.Mesh(benchG,seatM);bench.position.set(0,1.06,-1.0);g.add(bench);
  const benchB=new THREE.Mesh(benchBackG,seatM);
  benchB.position.set(0,1.29,-1.26);benchB.rotation.x=-.12;g.add(benchB);
  const dash=new THREE.Mesh(dashG,darkM);dash.position.set(0,1.16,.95);g.add(dash);
  const wheel=new THREE.Mesh(wheelRimG,darkM);
  wheel.position.set(-.46,1.22,.7);wheel.rotation.x=-1.15;g.add(wheel);

  const doorPivot=new THREE.Group();
  doorPivot.position.set(-1.04,.78,1.15);
  const door=new THREE.Mesh(doorG,paint);
  door.position.set(0,0,-.67);door.castShadow=true;
  doorPivot.add(door);g.add(doorPivot);
  g.userData.door=doorPivot;
  const grille=new THREE.Mesh(grilleG,darkM);
  grille.position.set(0,.82,2.72);g.add(grille);
  const plate=new THREE.Mesh(plateG,plateM);
  plate.position.set(0,.56,-2.76);g.add(plate);
  const ex=new THREE.Mesh(exhaustG,hubM);
  ex.rotation.x=Math.PI/2;ex.position.set(-.64,.34,-2.78);g.add(ex);
  for(const sx of[-1.1,1.1]){
    const mir=new THREE.Mesh(mirrorG,paint);
    mir.position.set(sx,1.15,1.0);g.add(mir);
  }

  g.userData.wheels=[];g.userData.front=[];
  for(const[sx,sz]of[[1,1.7],[-1,1.7],[1,-1.7],[-1,-1.7]]){
    const wg=new THREE.Group();wg.position.set(sx*1.0,.44,sz);wg.rotation.order='YXZ';
    const w=new THREE.Mesh(wheelG,[tireM,hubM,hubM]);
    w.rotation.z=Math.PI/2;w.castShadow=true;wg.add(w);
    g.add(wg);g.userData.wheels.push(wg);
    if(sz>0)g.userData.front.push(wg);
  }

  const hlM=new THREE.MeshBasicMaterial({color:0xfff2c0});
  const tlM=new THREE.MeshBasicMaterial({color:0xa01515});
  g.userData.tailM=tlM;
  for(const sx of[-.76,.76]){
    const hl=new THREE.Mesh(hlG,hlM);
    hl.position.set(sx,.84,2.71);g.add(hl);
    const tl=new THREE.Mesh(tlG,tlM);
    tl.position.set(sx,.86,-2.71);g.add(tl);
  }

  const beam=new THREE.Mesh(beamGeo,beamMat);
  beam.rotation.x=-Math.PI/2;beam.position.set(0,.07,5.9);
  beam.renderOrder=2;g.add(beam);

  if(police){
    const r=new THREE.Mesh(new THREE.BoxGeometry(.42,.18,.42),
      new THREE.MeshBasicMaterial({color:0xff2222}));
    const b=new THREE.Mesh(new THREE.BoxGeometry(.42,.18,.42),
      new THREE.MeshBasicMaterial({color:0x2266ff}));
    r.position.set(-.28,1.93,-.28);b.position.set(.28,1.93,-.28);
    g.add(r,b);g.userData.bar=[r,b];
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.12,.22,1.7),darkM);
    stripe.position.y=.72;g.add(stripe);
  }
  scene.add(g);
  return g;
}

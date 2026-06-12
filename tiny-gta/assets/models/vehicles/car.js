import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scene} from '../../../js/engine.js';

function taperTop(geo,sx,sz){
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
    if(p.getY(i)>0){p.setX(i,p.getX(i)*sx);p.setZ(i,p.getZ(i)*sz);}
  }
  geo.computeVertexNormals();
  return geo;
}

// Chevrolet Chevette em escala ×1.06 (pedestre do jogo tem ~1.86 de altura):
// 4.37 comprimento, 1.66 largura, 1.40 altura, entre-eixos 2.53,
// capô .95 / cabine 2.57 / porta-malas .85, rodas Ø.60, vão livre .15
//
// Carro otimizado: as peças que se movem juntas são FUNDIDAS por material em
// coordenadas do carro — carroceria pintada (1 mesh), para-choques (1),
// interior escuro (1), bancos (1), faróis (1), lanternas (1). Vivos e
// separados: 4 rodas, 2 portas, volante, vidro da cabine, placa, escape e
// facho de farol — ~17 meshes em vez de ~45. O dentCar deforma os vértices
// das geometrias fundidas direto (clone na 1ª batida), como antes.
const noseG=taperTop(new THREE.BoxGeometry(1.66,.58,.95,4,2,3),.94,.97);
const tailG=taperTop(new THREE.BoxGeometry(1.66,.58,.85,4,2,3),.94,.97);
const quarterG=new THREE.BoxGeometry(.07,.58,1.19);
const pillarG=new THREE.BoxGeometry(.07,.58,.23);
const sillG=new THREE.BoxGeometry(.07,.16,1.15);
const floorG=new THREE.BoxGeometry(1.54,.06,2.57);
const cowlG=new THREE.BoxGeometry(1.5,.12,.44);  // fecha o vão capô → para-brisa
const shelfG=new THREE.BoxGeometry(1.4,.1,.22);  // fecha o vão vidro traseiro → mala
const spokeG=new THREE.BoxGeometry(.3,.035,.02); // raios do volante (giro visível)
const cabG=taperTop(new THREE.BoxGeometry(1.46,.6,2.1),.8,.64);
const hoodG=new THREE.BoxGeometry(1.5,.12,.95,4,1,3);
const trunkG=new THREE.BoxGeometry(1.5,.11,.85,4,1,2);
const roofG=new THREE.BoxGeometry(1.12,.05,1.5,3,1,3);
const bumperG=new THREE.BoxGeometry(1.7,.16,.22,4,1,1);
const grilleG=new THREE.BoxGeometry(.85,.14,.05);
const plateG=new THREE.BoxGeometry(.44,.14,.03);
const mirrorG=new THREE.BoxGeometry(.13,.08,.06);
const exhaustG=new THREE.CylinderGeometry(.04,.04,.18,6);
const columnG=new THREE.CylinderGeometry(.03,.03,.52,6);
const wheelG=new THREE.CylinderGeometry(.30,.30,.26,12);
const hlG=new THREE.BoxGeometry(.26,.13,.06);
const tlG=new THREE.BoxGeometry(.3,.11,.06);
const seatBaseG=new THREE.BoxGeometry(.5,.14,.5);
const seatBackG=new THREE.BoxGeometry(.5,.5,.11);
const benchG=new THREE.BoxGeometry(1.26,.14,.45);
const benchBackG=new THREE.BoxGeometry(1.26,.42,.11);
const dashG=new THREE.BoxGeometry(1.38,.18,.3);
const wheelRimG=new THREE.TorusGeometry(.16,.03,6,14);
const doorG=new THREE.BoxGeometry(.06,.42,1.15);
const beamGeo=new THREE.PlaneGeometry(4.4,6.2);

// Clona a geometria base já posicionada em coordenadas do carro
function placed(geo,x,y,z,rx=0,rz=0){
  const g=geo.clone();
  if(rx)g.rotateX(rx);
  if(rz)g.rotateZ(rz);
  g.translate(x,y,z);
  return g;
}

// Carroceria pintada: tudo que amassa + espelhos (mesmas posições de antes)
const bodyGeo=mergeGeometries([
  placed(noseG,0,.46,1.705),
  placed(tailG,0,.46,-1.765),
  placed(quarterG,-.795,.46,-.745),placed(quarterG,.795,.46,-.745),
  placed(pillarG,-.795,.46,1.115),placed(pillarG,.795,.46,1.115),
  placed(sillG,-.795,.25,.425),placed(sillG,.795,.25,.425),
  placed(hoodG,0,.79,1.70,.05),
  placed(trunkG,0,.78,-1.77,-.04),
  placed(cowlG,0,.74,1.05),
  placed(shelfG,0,.71,-1.27),
  placed(roofG,0,1.37,-.2),
  placed(mirrorG,-.88,.92,.78),placed(mirrorG,.88,.92,.78),
],false);
const bumpersGeo=mergeGeometries([
  placed(bumperG,0,.38,2.21),placed(bumperG,0,.38,-2.21),
],false);
const interiorGeo=mergeGeometries([ // piso, painel, grade e coluna da direção
  placed(floorG,0,.12,-.055),
  placed(dashG,0,.84,.85),
  placed(grilleG,0,.60,2.19),
  placed(columnG,-.38,.84,.58,1.4),
],false);
const seatsGeo=mergeGeometries([
  placed(seatBaseG,-.38,.26,-.15),placed(seatBaseG,.38,.26,-.15),
  placed(seatBackG,-.38,.50,-.43,-.12),placed(seatBackG,.38,.50,-.43,-.12),
  placed(benchG,0,.26,-.95),
  placed(benchBackG,0,.47,-1.13,-.12),
],false);
const steerGeo=mergeGeometries([ // aro + raios, no espaço local do volante
  wheelRimG.clone(),
  spokeG.clone(),
  placed(spokeG,0,0,0,0,Math.PI/2),
],false);
const headlightsGeo=mergeGeometries([
  placed(hlG,-.58,.62,2.20),placed(hlG,.58,.62,2.20),
],false);
const taillightsGeo=mergeGeometries([
  placed(tlG,-.58,.63,-2.20),placed(tlG,.58,.63,-2.20),
],false);
// faixas escuras da viatura no capô e na traseira
const policeStripesGeo=mergeGeometries([
  placed(new THREE.BoxGeometry(1.68,.2,.96),0,.46,1.705),
  placed(new THREE.BoxGeometry(1.68,.2,.86),0,.46,-1.765),
],false);
const policeLightG=new THREE.BoxGeometry(.36,.16,.36);

const tireM=new THREE.MeshStandardMaterial({color:0x14121a,roughness:.95});
const hubM=new THREE.MeshStandardMaterial({color:0xb9bec9,roughness:.3,metalness:.85});
const darkM=new THREE.MeshStandardMaterial({color:0x1a1d24,roughness:.6,metalness:.25});
const glassM=new THREE.MeshStandardMaterial({color:0x8fc3e0,roughness:.08,metalness:.6,
  transparent:true,opacity:.42,depthWrite:false});
const seatM=new THREE.MeshStandardMaterial({color:0x2a2d38,roughness:.85});
const plateM=new THREE.MeshStandardMaterial({color:0xe8e9e2,roughness:.7});
const hlM=new THREE.MeshBasicMaterial({color:0xfff2c0});
// giroflex: todas as viaturas piscam em sincronia (blinkBar usa o mesmo clock),
// então os materiais podem ser compartilhados
const barRM=new THREE.MeshBasicMaterial({color:0xff2222});
const barBM=new THREE.MeshBasicMaterial({color:0x2266ff});

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

  // geometria fundida compartilhada entre os carros; dentCar clona na 1ª batida
  const body=new THREE.Mesh(bodyGeo,paint);
  body.castShadow=true;g.add(body);
  const bumpers=new THREE.Mesh(bumpersGeo,darkM);g.add(bumpers);
  g.userData.dentable=[body,bumpers];

  g.add(new THREE.Mesh(interiorGeo,darkM));
  g.add(new THREE.Mesh(seatsGeo,seatM));

  const cab=new THREE.Mesh(cabG,glassM);
  cab.position.set(0,1.05,-.2);cab.castShadow=true;cab.renderOrder=3;g.add(cab);

  // Volante de pé, de frente pro motorista; spinWheels gira via userData.steer
  const wheel=new THREE.Mesh(steerGeo,darkM);
  wheel.position.set(-.38,.88,.34);wheel.rotation.x=-.35;g.add(wheel);
  g.userData.steer=wheel;

  // Duas portas com dobradiça na frente; sign = sentido de abertura de cada lado
  g.userData.doors=[];
  for(const side of[-1,1]){
    const doorPivot=new THREE.Group();
    doorPivot.position.set(side*.84,.54,1.0); // da soleira (.33) à cintura (.75)
    doorPivot.userData.sign=side<0?1:-1;
    const door=new THREE.Mesh(doorG,paint);
    door.position.set(0,0,-.575);door.castShadow=true;
    doorPivot.add(door);g.add(doorPivot);
    g.userData.doors.push(doorPivot);
  }
  g.userData.door=g.userData.doors[0]; // porta do motorista (compatibilidade)

  const plate=new THREE.Mesh(plateG,plateM);
  plate.position.set(0,.40,-2.23);g.add(plate);
  const ex=new THREE.Mesh(exhaustG,hubM);
  ex.rotation.x=Math.PI/2;ex.position.set(-.5,.24,-2.24);g.add(ex);

  // Eixos no entre-eixos real: dianteiro +1.45, traseiro -1.08.
  // Rodas em ±.75 pra face externa (.88) passar da lateral do corpo (.83);
  // coplanar dá z-fighting (roda piscando contra a carroceria)
  g.userData.wheels=[];g.userData.front=[];
  for(const[sx,sz]of[[1,1.45],[-1,1.45],[1,-1.08],[-1,-1.08]]){
    const wg=new THREE.Group();wg.position.set(sx*.75,.30,sz);wg.rotation.order='YXZ';
    const w=new THREE.Mesh(wheelG,[tireM,hubM,hubM]);
    w.rotation.z=Math.PI/2;w.castShadow=true;wg.add(w);
    g.add(wg);g.userData.wheels.push(wg);
    if(sz>0)g.userData.front.push(wg);
  }

  g.add(new THREE.Mesh(headlightsGeo,hlM));
  const tlM=new THREE.MeshBasicMaterial({color:0xa01515}); // freio muda a cor: por carro
  g.userData.tailM=tlM;
  g.add(new THREE.Mesh(taillightsGeo,tlM));

  const beam=new THREE.Mesh(beamGeo,beamMat);
  beam.rotation.x=-Math.PI/2;beam.position.set(0,.07,4.8);
  beam.renderOrder=2;g.add(beam);

  if(police){
    const r=new THREE.Mesh(policeLightG,barRM);
    const b=new THREE.Mesh(policeLightG,barBM);
    r.position.set(-.22,1.46,-.2);b.position.set(.22,1.46,-.2);
    g.add(r,b);g.userData.bar=[r,b];
    g.add(new THREE.Mesh(policeStripesGeo,darkM));
  }
  scene.add(g);
  return g;
}

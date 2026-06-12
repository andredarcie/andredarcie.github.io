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

// Chevrolet Chevette em escala ×1.06 (pedestre do jogo tem ~1.86 de altura):
// 4.37 comprimento, 1.66 largura, 1.40 altura, entre-eixos 2.53,
// capô .95 / cabine 2.57 / porta-malas .85, rodas Ø.60, vão livre .15
// Carroceria em casca: nariz e traseira sólidos, cabine OCA (piso, soleiras,
// colunas e painéis traseiros) — pela porta aberta se vê o interior de verdade
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

  const nose=new THREE.Mesh(noseG,paint);
  nose.position.set(0,.46,1.705);nose.castShadow=true;g.add(nose);
  const tail=new THREE.Mesh(tailG,paint);
  tail.position.set(0,.46,-1.765);tail.castShadow=true;g.add(tail);
  const floor=new THREE.Mesh(floorG,darkM);
  floor.position.set(0,.12,-.055);g.add(floor);
  for(const sx of[-.795,.795]){ // lateral da cabine: painel traseiro, coluna A, soleira
    const q=new THREE.Mesh(quarterG,paint);
    q.position.set(sx,.46,-.745);q.castShadow=true;g.add(q);
    const ap=new THREE.Mesh(pillarG,paint);
    ap.position.set(sx,.46,1.115);g.add(ap);
    const sl=new THREE.Mesh(sillG,paint);
    sl.position.set(sx,.25,.425);g.add(sl);
  }

  const hood=new THREE.Mesh(hoodG,paint);
  hood.position.set(0,.79,1.70);hood.rotation.x=.05;hood.castShadow=true;g.add(hood);
  const trunk=new THREE.Mesh(trunkG,paint);
  trunk.position.set(0,.78,-1.77);trunk.rotation.x=-.04;g.add(trunk);
  const cowl=new THREE.Mesh(cowlG,paint);
  cowl.position.set(0,.74,1.05);g.add(cowl);
  const shelf=new THREE.Mesh(shelfG,paint);
  shelf.position.set(0,.71,-1.27);g.add(shelf);

  const cab=new THREE.Mesh(cabG,glassM);
  cab.position.set(0,1.05,-.2);cab.castShadow=true;cab.renderOrder=3;g.add(cab);
  const roof=new THREE.Mesh(roofG,paint);
  roof.position.set(0,1.37,-.2);roof.castShadow=true;g.add(roof);

  g.userData.dentable=[nose,tail,hood,trunk,roof];
  for(const bz of[2.21,-2.21]){
    const bmp=new THREE.Mesh(bumperG,darkM);
    bmp.position.set(0,.38,bz);g.add(bmp);
    g.userData.dentable.push(bmp);
  }

  for(const sx of[-.38,.38]){ // bancos baixos, apoiados no piso da cabine
    const sb=new THREE.Mesh(seatBaseG,seatM);sb.position.set(sx,.26,-.15);g.add(sb);
    const sk=new THREE.Mesh(seatBackG,seatM);
    sk.position.set(sx,.50,-.43);sk.rotation.x=-.12;g.add(sk);
  }
  const bench=new THREE.Mesh(benchG,seatM);bench.position.set(0,.26,-.95);g.add(bench);
  const benchB=new THREE.Mesh(benchBackG,seatM);
  benchB.position.set(0,.47,-1.13);benchB.rotation.x=-.12;g.add(benchB);
  const dash=new THREE.Mesh(dashG,darkM);dash.position.set(0,.84,.85);g.add(dash);
  // Volante de pé, de frente pro motorista (leve inclinação de coluna), ao
  // alcance das mãos; a coluna liga o aro ao painel
  const wheel=new THREE.Mesh(wheelRimG,darkM);
  wheel.position.set(-.38,.88,.34);wheel.rotation.x=-.35;g.add(wheel);
  const spokeH=new THREE.Mesh(spokeG,darkM);
  const spokeV=new THREE.Mesh(spokeG,darkM);spokeV.rotation.z=Math.PI/2;
  wheel.add(spokeH,spokeV);
  g.userData.steer=wheel; // spinWheels gira o volante junto com a direção
  const column=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.52,6),darkM);
  column.position.set(-.38,.84,.58);column.rotation.x=1.4;g.add(column);

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
  const grille=new THREE.Mesh(grilleG,darkM);
  grille.position.set(0,.60,2.19);g.add(grille);
  const plate=new THREE.Mesh(plateG,plateM);
  plate.position.set(0,.40,-2.23);g.add(plate);
  const ex=new THREE.Mesh(exhaustG,hubM);
  ex.rotation.x=Math.PI/2;ex.position.set(-.5,.24,-2.24);g.add(ex);
  for(const sx of[-.88,.88]){
    const mir=new THREE.Mesh(mirrorG,paint);
    mir.position.set(sx,.92,.78);g.add(mir);
  }

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

  const hlM=new THREE.MeshBasicMaterial({color:0xfff2c0});
  const tlM=new THREE.MeshBasicMaterial({color:0xa01515});
  g.userData.tailM=tlM;
  for(const sx of[-.58,.58]){
    const hl=new THREE.Mesh(hlG,hlM);
    hl.position.set(sx,.62,2.20);g.add(hl);
    const tl=new THREE.Mesh(tlG,tlM);
    tl.position.set(sx,.63,-2.20);g.add(tl);
  }

  const beam=new THREE.Mesh(beamGeo,beamMat);
  beam.rotation.x=-Math.PI/2;beam.position.set(0,.07,4.8);
  beam.renderOrder=2;g.add(beam);

  if(police){
    const r=new THREE.Mesh(new THREE.BoxGeometry(.36,.16,.36),
      new THREE.MeshBasicMaterial({color:0xff2222}));
    const b=new THREE.Mesh(new THREE.BoxGeometry(.36,.16,.36),
      new THREE.MeshBasicMaterial({color:0x2266ff}));
    r.position.set(-.22,1.46,-.2);b.position.set(.22,1.46,-.2);
    g.add(r,b);g.userData.bar=[r,b];
    // faixas escuras no capô e na traseira (a cabine agora é oca)
    const stripeF=new THREE.Mesh(new THREE.BoxGeometry(1.68,.2,.96),darkM);
    stripeF.position.set(0,.46,1.705);g.add(stripeF);
    const stripeR=new THREE.Mesh(new THREE.BoxGeometry(1.68,.2,.86),darkM);
    stripeR.position.set(0,.46,-1.765);g.add(stripeR);
  }
  scene.add(g);
  return g;
}

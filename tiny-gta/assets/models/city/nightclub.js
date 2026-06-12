import * as THREE from 'three';
import {scene} from '../../../js/engine.js';
import {rand,pick} from '../../../js/constants.js';
import {addPalm} from '../props/palm.js';
import {makePed,shirtColors} from '../characters/pedestrian.js';

// Boate "THE FLAMINGO", estilo Vice City: prédio na orla oeste (quarteirão
// CLUB_I/CLUB_J, reservado pelo world.js) com letreiro neon e entrada coberta.
// O interior é um cenário separado construído a ~600m do mapa, dentro de um
// Group com visible=false — só é renderizado enquanto o jogador está lá
// (js/club.js liga/desliga no teleporte da porta).

export const CLUB_I=0,CLUB_J=3; // quarteirão reservado (borda oeste, meio do mapa)

// porta externa (fachada oeste, de frente pro mar) e spawn de saída
export const CLUB_DOOR={x:-162.6,z:-22};
export const CLUB_SPAWN_OUT={x:-164.4,z:-22};
// interior: centro da sala, porta de saída e spawn de entrada
export const INT_CENTER={x:-800,z:-22};
export const INT_DOOR={x:-812.2,z:-22};
export const INT_SPAWN={x:-810.4,z:-22};
// área onde a câmera pode ficar lá dentro (sala menos uma margem da parede)
export const INT_BOUNDS={x0:-812.3,x1:-787.7,z0:-29.3,z1:-14.7,y1:4.9};

const neonPinkM=new THREE.MeshBasicMaterial({color:0xff2e88});
const neonCyanM=new THREE.MeshBasicMaterial({color:0x19e3ff});
const darkM=new THREE.MeshStandardMaterial({color:0x14101e,roughness:.8});

function signTexture(){
  const c=document.createElement('canvas');c.width=512;c.height=128;
  const x=c.getContext('2d');
  x.textAlign='center';x.textBaseline='middle';
  x.font='bold 56px monospace';
  x.shadowColor='#ff2e88';x.shadowBlur=26;
  x.fillStyle='#ffe6f4';
  for(let k=0;k<3;k++)x.fillText('THE FLAMINGO',256,64); // passadas extras = glow
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  return t;
}

export const clubFx={tiles:[],tileMats:[],ball:null,dancers:[]};
export const clubInterior=new THREE.Group();
clubInterior.visible=false;

export function addNightclub(solids){
  // ----- exterior: caixa rosa com faixas neon, marquise e letreiro -----
  const wallM=new THREE.MeshStandardMaterial({color:0xf2c4d8,roughness:.95});
  const bld=new THREE.Mesh(new THREE.BoxGeometry(16,7,18),wallM);
  bld.position.set(-154,3.5,-22);bld.castShadow=true;bld.receiveShadow=true;scene.add(bld);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(16.2,.25,18.2),darkM);
  roof.position.set(-154,7.1,-22);scene.add(roof);
  // anéis neon em volta do prédio (caixas um tico maiores que a parede)
  const ringTop=new THREE.Mesh(new THREE.BoxGeometry(16.4,.16,18.4),neonCyanM);
  ringTop.position.set(-154,6.85,-22);scene.add(ringTop);
  const ringMid=new THREE.Mesh(new THREE.BoxGeometry(16.3,.12,18.3),neonPinkM);
  ringMid.position.set(-154,4.4,-22);scene.add(ringMid);
  // porta dupla escura na fachada oeste
  const door=new THREE.Mesh(new THREE.BoxGeometry(.18,3.2,2.6),darkM);
  door.position.set(-162.05,1.6,-22);scene.add(door);
  // barras neon verticais ladeando a porta
  for(const dz of[-2.2,2.2]){
    const bar=new THREE.Mesh(new THREE.BoxGeometry(.12,4.6,.12),neonCyanM);
    bar.position.set(-162.1,2.5,-22+dz);scene.add(bar);
  }
  // marquise sobre a entrada com colunas
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(2.6,.16,4.2),
    new THREE.MeshStandardMaterial({color:0xff5f9e,roughness:.8}));
  canopy.position.set(-163.4,3.3,-22);canopy.castShadow=true;scene.add(canopy);
  for(const dz of[-1.8,1.8]){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,3.2,6),darkM);
    pole.position.set(-164.5,1.6,-22+dz);scene.add(pole);
  }
  // letreiro neon (canvas) de frente pro mar
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(9.5,2.4),
    new THREE.MeshBasicMaterial({map:signTexture(),transparent:true}));
  sign.position.set(-162.18,5.7,-22);sign.rotation.y=-Math.PI/2;scene.add(sign);
  // palmeiras na calçada (entram na fusão de props do world.js)
  addPalm(-164.2,-13.2);addPalm(-164.2,-30.8);
  solids.push({x0:-162.2,x1:-145.8,z0:-31.2,z1:-12.8,h:7.2});

  // ----- interior: sala 26x16 a ~600m do mapa, num grupo liga/desliga -----
  // casca BackSide: de dentro é parede/teto/chão; de fora é invisível, então
  // a câmera atrás do jogador enxerga a sala mesmo "atravessando" a parede
  const shell=new THREE.Mesh(new THREE.BoxGeometry(26,5.5,16),
    new THREE.MeshStandardMaterial({color:0x140b26,roughness:1,side:THREE.BackSide}));
  shell.position.set(-800,2.75,-22);clubInterior.add(shell);
  // backstop: caixa preta envolvendo a sala — se a câmera escapar da casca
  // interna por um frame, vê escuridão em vez do mar e da cidade ao fundo
  const outer=new THREE.Mesh(new THREE.BoxGeometry(30,9,20),
    new THREE.MeshBasicMaterial({color:0x05030a,side:THREE.BackSide}));
  outer.position.set(-800,3.5,-22);clubInterior.add(outer);

  // pista de dança: ladrilhos que trocam de cor (4 materiais compartilhados)
  const PAL=[0xff2e88,0x19e3ff,0xffd24a,0x9dff2e];
  clubFx.tileMats=PAL.map(c=>new THREE.MeshBasicMaterial({color:c}));
  const tileG=new THREE.PlaneGeometry(1.7,1.7);
  for(let i=0;i<6;i++)for(let j=0;j<4;j++){
    const t=new THREE.Mesh(tileG,clubFx.tileMats[(i+j)%4]);
    t.rotation.x=-Math.PI/2;
    t.position.set(-805.6+i*1.85,.03,-24.8+j*1.85);
    clubInterior.add(t);clubFx.tiles.push(t);
  }

  // fitas neon nas paredes (duas alturas)
  for(const[y,m]of[[3.4,neonCyanM],[1.1,neonPinkM]]){
    for(const z of[-29.9,-14.1]){
      const s=new THREE.Mesh(new THREE.BoxGeometry(25.6,.08,.08),m);
      s.position.set(-800,y,z);clubInterior.add(s);
    }
    for(const x of[-812.9,-787.1]){
      const s=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,15.6),m);
      s.position.set(x,y,-22);clubInterior.add(s);
    }
  }

  // balcão do bar na parede norte, com tampo neon e garrafas na prateleira
  const bar=new THREE.Mesh(new THREE.BoxGeometry(8.4,1.1,1.3),
    new THREE.MeshStandardMaterial({color:0x3a2350,roughness:.7}));
  bar.position.set(-802,.55,-28.6);clubInterior.add(bar);
  const barTop=new THREE.Mesh(new THREE.BoxGeometry(8.6,.08,1.45),neonCyanM);
  barTop.position.set(-802,1.14,-28.6);clubInterior.add(barTop);
  const shelf=new THREE.Mesh(new THREE.BoxGeometry(8.4,.12,.4),darkM);
  shelf.position.set(-802,2.4,-29.7);clubInterior.add(shelf);
  for(let k=0;k<8;k++){
    const b=new THREE.Mesh(new THREE.BoxGeometry(.18,.45,.18),
      new THREE.MeshBasicMaterial({color:pick([0xff2e88,0x19e3ff,0xffd24a,0x9dff2e,0xc77dff])}));
    b.position.set(-805.4+k*.95,2.68,-29.7);clubInterior.add(b);
  }

  // cabine do DJ e caixas de som na parede leste
  const booth=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.3,4.6),darkM);
  booth.position.set(-789.2,.65,-22);clubInterior.add(booth);
  for(const z of[-26.8,-17.2]){
    const sp=new THREE.Mesh(new THREE.BoxGeometry(1.3,2.6,1.3),
      new THREE.MeshStandardMaterial({color:0x0c0a14,roughness:.9}));
    sp.position.set(-789.4,1.3,z);clubInterior.add(sp);
  }

  // globo de espelhos girando sobre a pista
  clubFx.ball=new THREE.Mesh(new THREE.SphereGeometry(.75,12,10),
    new THREE.MeshStandardMaterial({color:0xdde2f0,metalness:.95,roughness:.12}));
  clubFx.ball.position.set(-801,4.3,-22);clubInterior.add(clubFx.ball);
  const mount=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.7,5),darkM);
  mount.position.set(-801,5.1,-22);clubInterior.add(mount);

  // luz quente da pista: vive dentro do grupo, então só existe com a boate
  // visível (luz extra encarece o shader da cena inteira quando ligada)
  const light=new THREE.PointLight(0xff7ad8,80,42,1.8);
  light.position.set(-800,4.6,-22);clubInterior.add(light);

  // porta de saída (parede oeste) com letreiro neon em cima
  const exitDoor=new THREE.Mesh(new THREE.BoxGeometry(.16,3,2.4),darkM);
  exitDoor.position.set(-812.85,1.5,-22);clubInterior.add(exitDoor);
  const exitNeon=new THREE.Mesh(new THREE.BoxGeometry(.1,.3,1.6),neonPinkM);
  exitNeon.position.set(-812.8,3.3,-22);clubInterior.add(exitNeon);

  // dançarinos: peds fundidos reaproveitados, animados pelo js/club.js
  const spots=[[-804,-23.5],[-801.8,-21],[-799.5,-24],[-803,-19.8],[-800.6,-26],[-797.8,-21.6]];
  for(const[dx,dz]of spots){
    const g=makePed(pick(shirtColors));
    g.position.set(dx+rand(-.3,.3),0,dz+rand(-.3,.3));
    clubInterior.add(g); // reparenta da cena pro grupo do interior
    clubFx.dancers.push({g,t:rand(0,6),sp:rand(5,8),face:rand(0,Math.PI*2)});
  }

  scene.add(clubInterior);

  // paredes, bar e cabine são sólidos (o jogador não atravessa nem sai da sala)
  solids.push(
    {x0:-814,x1:-812.9,z0:-30.5,z1:-13.5,h:6},
    {x0:-787.1,x1:-786,z0:-30.5,z1:-13.5,h:6},
    {x0:-813.5,x1:-786.5,z0:-30.6,z1:-29.9,h:6},
    {x0:-813.5,x1:-786.5,z0:-14.1,z1:-13.4,h:6},
    {x0:-806.3,x1:-797.7,z0:-29.4,z1:-27.9,h:1.4},
    {x0:-790.4,x1:-788,z0:-24.4,z1:-19.6,h:1.6},
  );
}

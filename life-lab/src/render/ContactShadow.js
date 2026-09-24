import * as THREE from 'three';

// Sombra de contato: uma mancha escura e macia deitada no chão, embaixo de quem pisa
// nele. O mapa de sombra do sol dá a sombra comprida, mas não o escurinho colado no
// pé — é isso que tira o aspecto de coisa flutuando e assenta tudo no chão.
// Geometria, textura e material são um só, compartilhados por todas as manchas.
const SHAPE = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);

// Quem descarta geometria ao remover um objeto precisa pular esta, que é de todos.
export function isContactShadowShape(geometry) {
  return geometry === SHAPE;
}

function paintBlob() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
  gradient.addColorStop(.45, 'rgba(0, 0, 0, .6)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

const MATERIAL = new THREE.MeshBasicMaterial({
  map: paintBlob(),
  color: 0x1a1408,
  transparent: true,
  opacity: .42,
  depthWrite: false,
  // Rente ao chão sem brigar com ele no z-buffer.
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2
});

// `radius` em unidades do mundo. Pendurar no objeto (a mancha acompanha posição e
// escala dele) ou soltar na camada, conforme quem chama.
export function createContactShadow(radius) {
  const blob = new THREE.Mesh(SHAPE, MATERIAL);
  blob.scale.setScalar(radius);
  blob.position.y = .12;
  blob.renderOrder = 1;
  // A mancha é do chão, não da planta: não esmaece quando a planta fica translúcida.
  blob.userData.skipFade = true;
  return blob;
}

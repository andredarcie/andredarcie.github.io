import * as THREE from 'three';

/* ===================== renderer + câmera ===================== */
// stencil: a água não entra na canoa. logarithmicDepthBuffer: com o mundo inteiro montado junto (perto de
// .05 m, longe até a névoa do avião) o depth linear não separava faces vizinhas a meia distância e elas
// piscavam (z-fighting); shader próprio precisa dos chunks logdepthbuf (o mar da praia tem)
export const renderer = new THREE.WebGLRenderer({ antialias: true, stencil: true, logarithmicDepthBuffer: true });
document.body.prepend(renderer.domElement);

export const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .05, 80);
camera.rotation.order = 'YXZ';

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2); // resolução nativa, teto 2x para não pesar no celular
  renderer.setSize(Math.floor(innerWidth * dpr), Math.floor(innerHeight * dpr), false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
resize();
addEventListener('resize', resize);

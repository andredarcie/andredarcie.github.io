import * as THREE from 'three';

/* ===================== renderer + câmera ===================== */
export const renderer = new THREE.WebGLRenderer({ antialias: true });
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

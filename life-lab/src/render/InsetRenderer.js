import * as THREE from 'three';
import { CAMERA_DIRECTION } from './CameraRig.js';

// Câmera de acontecimentos: um segundo enquadramento, bem mais fechado, desenhado
// no mesmo canvas dentro de um retângulo (tesoura do WebGL). Mesma direção
// isométrica, então parece uma lupa sobre a cena. O foco desliza até o alvo em vez
// de pular, e o mapa de sombra do quadro principal é reaproveitado — a sombra não
// depende de onde a câmera olha, e refazê-la dobraria o custo.
export class InsetRenderer {
  #renderer;
  #scene;
  #rig;
  #space;
  #camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 6000);
  #focus = new THREE.Vector3();
  #target = new THREE.Vector3();
  #ready = false;

  constructor(renderer, scene, cameraRig, space) {
    this.#renderer = renderer;
    this.#scene = scene;
    this.#rig = cameraRig;
    this.#space = space;
  }

  // Acontecimento novo começa com a câmera já no lugar, sem viajar do anterior.
  reset() {
    this.#ready = false;
  }

  render({ x, y, span = 50, rect }) {
    const place = this.#space.toScene(x, y);
    // Mira um pouco acima do chão, na altura do corpo, e não nos pés.
    this.#target.set(place.x, 6, place.z);
    if (!this.#ready) {
      this.#focus.copy(this.#target);
      this.#ready = true;
    } else {
      this.#focus.lerp(this.#target, .18);
    }
    const camera = this.#camera;
    const aspect = rect.width / Math.max(1, rect.height);
    camera.top = span;
    camera.bottom = -span;
    camera.left = -span * aspect;
    camera.right = span * aspect;
    camera.updateProjectionMatrix();
    camera.position.copy(CAMERA_DIRECTION).multiplyScalar(this.#rig.radius).add(this.#focus);
    camera.lookAt(this.#focus);
    camera.updateMatrixWorld();

    const renderer = this.#renderer;
    const bottom = this.#rig.viewHeight - rect.top - rect.height;
    renderer.setScissorTest(true);
    renderer.setScissor(rect.left, bottom, rect.width, rect.height);
    renderer.setViewport(rect.left, bottom, rect.width, rect.height);
    const autoShadow = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.render(this.#scene, camera);
    renderer.shadowMap.autoUpdate = autoShadow;
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, this.#rig.viewWidth, this.#rig.viewHeight);
  }
}

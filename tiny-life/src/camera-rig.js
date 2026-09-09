import * as THREE from 'three';

const PHI_MIN = 0.24;   // quase de cima
const PHI_MAX = 1.42;   // quase rente ao chão
const TAP_MOVE = 7;     // px de tolerância pra ainda ser toque, não arrasto
const TAP_TIME = 420;   // ms

/**
 * Órbita em volta do formigueiro e distingue toque de arrasto.
 *
 * O mesmo ponteiro faz duas coisas — girar a câmara e largar comida —, então
 * quem decide qual foi é aqui: arrastou, girou; encostou e soltou parado, é
 * toque. Sem essa separação, toda tentativa de girar espalharia comida.
 */
export class CameraRig {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.target = new THREE.Vector3(0, 0, 0);
    this.theta = -Math.PI / 2;
    this.phi = 0.92;
    this.radius = 900;
    this.fit = 900;
    this.userZoom = false;   // depois que a pessoa aproxima, o resize não desfaz
    this.onTap = null;

    this.pointers = new Map();
    this.moved = 0;
    this.startedAt = 0;
    this.pinch = 0;

    this.#bind();
  }

  /** Distância que enquadra um terreiro de width x height px. */
  fitTo(width, height, fov) {
    const half = Math.max(width, height * 1.35) * 0.5;
    this.fit = (half / Math.tan((fov * Math.PI) / 360)) * 1.12;
    this.radius = this.userZoom
      ? THREE.MathUtils.clamp(this.radius, this.fit * 0.35, this.fit * 1.6)
      : this.fit;
    this.apply();
  }

  apply() {
    const s = Math.sin(this.phi);
    this.camera.position.set(
      this.target.x + this.radius * s * Math.cos(this.theta),
      this.target.y + this.radius * Math.cos(this.phi),
      this.target.z + this.radius * s * Math.sin(this.theta)
    );
    this.camera.lookAt(this.target);
  }

  #bind() {
    const dom = this.dom;

    dom.addEventListener('pointerdown', (e) => {
      dom.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) {
        this.moved = 0;
        this.startedAt = performance.now();
      } else {
        this.pinch = this.#spread();
      }
    });

    dom.addEventListener('pointermove', (e) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      prev.x = e.clientX;
      prev.y = e.clientY;

      if (this.pointers.size >= 2) {
        const spread = this.#spread();
        if (this.pinch > 0 && spread > 0) this.#zoom(this.pinch / spread);
        this.pinch = spread;
        return;
      }

      this.moved += Math.abs(dx) + Math.abs(dy);
      this.theta -= dx * 0.005;
      this.phi = THREE.MathUtils.clamp(this.phi - dy * 0.005, PHI_MIN, PHI_MAX);
      this.apply();
    });

    const release = (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      const single = this.pointers.size === 1;
      this.pointers.delete(e.pointerId);
      this.pinch = 0;
      if (!single) return;
      if (this.moved <= TAP_MOVE && performance.now() - this.startedAt <= TAP_TIME && this.onTap) {
        this.onTap(e.clientX, e.clientY);
      }
    };
    dom.addEventListener('pointerup', release);
    dom.addEventListener('pointercancel', release);

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.#zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });
  }

  #zoom(factor) {
    this.userZoom = true;
    this.radius = THREE.MathUtils.clamp(this.radius * factor, this.fit * 0.35, this.fit * 1.6);
    this.apply();
  }

  #spread() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}

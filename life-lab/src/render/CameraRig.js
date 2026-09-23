import * as THREE from 'three';

// Isometria verdadeira: o losango da referência tem altura/largura ≈ 0,583, e
// arcsen(0,583) ≈ 35,26°, que é exatamente o ângulo do eixo (1,1,1).
export const CAMERA_DIRECTION = new THREE.Vector3(1, 1, 1).normalize();
// Quanto do losango do mundo o enquadramento inicial ocupa. 1 seria a tela inteira
// dentro da área dos bichos (e metade do mundo fora de vista); menos que isso deixa
// aparecer um pouco da mata em volta, nos cantos, e mostra mais do mundo de uma vez.
const DEFAULT_FILL = .8;
const SIN_ISO = 1 / Math.sqrt(3);

// A câmera isométrica: enquadramento, passeio, zoom, e as conversões entre mundo e
// tela (projetar um ponto, a matriz do chão para o desenho 2D, acertar o clique).
export class CameraRig {
  #space;
  #focus = new THREE.Vector3(0, 0, 0);
  #panX = 0;
  #panZ = 0;
  #baseZoom = 1;
  #zoomLevel = 1;
  #raycaster = new THREE.Raycaster();
  #pointer = new THREE.Vector2();
  #groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  #projected = new THREE.Vector3();
  #diamondHalfWidth;
  #diamondHalfHeight;

  constructor(space) {
    const world = space.world;
    this.#space = space;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 6000);
    this.radius = Math.max(world.width, world.height) * 2.4;
    this.viewWidth = 1;
    this.viewHeight = 1;
    // Quanto o mundo ocupa na tela, em unidades, já projetado: um quadrado girado 45°
    // vira um losango de (W + H)/√2 de largura, e a altura é essa largura vezes o seno
    // da elevação isométrica.
    this.#diamondHalfWidth = (world.width + world.height) / Math.SQRT2 / 2;
    this.#diamondHalfHeight = this.#diamondHalfWidth * SIN_ISO;
    this.#applyPan();
  }

  resize(width, height) {
    this.viewWidth = Math.max(1, width);
    this.viewHeight = Math.max(1, height);
    this.#applyCamera();
  }

  // O passeio é pedido em pixels de tela, não em unidades do mundo: numa vista a 45
  // graus "para cima" é uma diagonal, e acertar isso no olho dá errado. A matriz do
  // chão já mapeia mundo → tela, então basta invertê-la. Como ela já embute o zoom,
  // uma mesma quantidade de pixels anda o mesmo tanto na tela em qualquer zoom.
  panByScreen(screenX, screenY) {
    const m = this.groundMatrix();
    const determinant = m.a * m.d - m.b * m.c;
    if (!determinant) return;
    this.#panX += (m.d * screenX - m.c * screenY) / determinant;
    this.#panZ += (-m.b * screenX + m.a * screenY) / determinant;
    this.#clampPan();
    this.#applyPan();
  }

  zoomBy(factor) {
    this.#zoomLevel = Math.max(.5, Math.min(3, this.#zoomLevel * factor));
    this.#applyCamera();
  }

  reset() {
    this.#zoomLevel = 1;
    this.#panX = 0;
    this.#panZ = 0;
    this.#applyCamera();
  }

  // O chão é um plano, e projeção ortográfica de um plano é uma transformação afim.
  // Devolvendo essa matriz, todo desenho 2D em coordenadas do mundo funciona sem
  // alteração, deitado no chão e com a inclinação certa.
  groundMatrix() {
    const origin = this.project(0, 0);
    const alongX = this.project(1, 0);
    const alongY = this.project(0, 1);
    return {
      a: alongX.x - origin.x, b: alongX.y - origin.y,
      c: alongY.x - origin.x, d: alongY.y - origin.y,
      e: origin.x, f: origin.y
    };
  }

  // Projeta um ponto do mundo da simulação para pixels do canvas de sobreposição,
  // que é onde continuam desenhados os nomes, os balões e a chuva.
  project(x, y, lift = 0) {
    const place = this.#space.toScene(x, y);
    this.#projected.set(place.x, lift, place.z);
    this.#projected.project(this.camera);
    return {
      x: (this.#projected.x * .5 + .5) * this.viewWidth,
      y: (-this.#projected.y * .5 + .5) * this.viewHeight
    };
  }

  // Caminho inverso: da tela para o chão, para o clique semear e inspecionar bicho.
  pickGround(canvas, clientX, clientY) {
    const bounds = canvas.getBoundingClientRect();
    this.#pointer.x = (clientX - bounds.left) / bounds.width * 2 - 1;
    this.#pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
    this.#raycaster.setFromCamera(this.#pointer, this.camera);
    const hit = new THREE.Vector3();
    if (!this.#raycaster.ray.intersectPlane(this.#groundPlane, hit)) return null;
    return this.#space.toWorld(hit.x, hit.z);
  }

  // O centro da tela pode ir a qualquer ponto da área dos bichos, e não além: o
  // terreno em volta existe para a tela nunca mostrar vazio, não para passear nele.
  #clampPan() {
    const world = this.#space.world;
    const limitX = world.width / 2, limitZ = world.height / 2;
    this.#panX = Math.max(-limitX, Math.min(limitX, this.#panX));
    this.#panZ = Math.max(-limitZ, Math.min(limitZ, this.#panZ));
  }

  #applyPan() {
    this.#focus.set(this.#panX, 0, this.#panZ);
    this.camera.position.copy(CAMERA_DIRECTION).multiplyScalar(this.radius).add(this.#focus);
    this.camera.lookAt(this.#focus);
    // lookAt mexe na orientação mas não na matriz de mundo, que só seria refeita no
    // próximo render. Sem isso, projetar e acertar o clique usariam a câmera de antes.
    this.camera.updateMatrixWorld();
  }

  #applyCamera() {
    const camera = this.camera;
    const aspect = this.viewWidth / Math.max(1, this.viewHeight);
    const halfHeight = this.#diamondHalfHeight;
    const halfWidth = halfHeight * aspect;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    // Um retângulo de meia-largura w e meia-altura h cabe inteiro dentro do losango
    // quando w/W + h/H ≤ 1. Com zoom z a tela mostra w = halfWidth/z e h = halfHeight/z,
    // então o zoom que encaixa a tela no losango, sem sobra, é a soma das duas razões.
    // O enquadramento inicial fica um pouco abaixo disso (DEFAULT_FILL).
    const inscribed = halfWidth / this.#diamondHalfWidth + halfHeight / this.#diamondHalfHeight;
    this.#baseZoom = inscribed * DEFAULT_FILL;
    camera.zoom = this.#baseZoom * this.#zoomLevel;
    camera.updateProjectionMatrix();
    this.#clampPan();
    this.#applyPan();
  }
}

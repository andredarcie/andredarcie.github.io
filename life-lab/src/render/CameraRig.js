import * as THREE from 'three';
import { BOARD_THICKNESS } from '../config/world.js';
import { BoardFraming } from './BoardFraming.js';

// Isometria verdadeira: o losango da referência tem altura/largura ≈ 0,583, e
// arcsen(0,583) ≈ 35,26°, que é exatamente o ângulo do eixo (1,1,1).
export const CAMERA_DIRECTION = new THREE.Vector3(1, 1, 1).normalize();
const SIN_ISO = 1 / Math.sqrt(3);
// Plano de corte do fundo; o céu fica logo antes dele (SkyRenderer).
export const CAMERA_FAR = 16000;
// Uma coisa em pé de altura h aparece na tela com h·cos(35,26°) de altura.
const COS_ISO = Math.sqrt(2 / 3);
// O que mais sobe acima do chão (copa de árvore, bandeira de cabana). Na ponta de
// trás do losango é isso que passaria da borda de cima da tela.
const TALLEST_PROP = 42;
// Zoom: 1 é o mundo inteiro. Aproximar vai até o boneco ficar grande na tela
// (MAX_PIXELS_PER_UNIT) ou, no mínimo, 4× a visão inteira.
const MIN_ZOOM_LEVEL = 1;
const MIN_MAX_ZOOM_LEVEL = 4;
const MAX_PIXELS_PER_UNIT = 7;
// Rapidez com que o enquadramento acompanha a HUD mudando de tamanho (por segundo).
const REFRAME_RATE = 9;

// A câmera isométrica: enquadramento, passeio, zoom, e as conversões entre mundo e
// tela (projetar um ponto, a matriz do chão para o desenho 2D, acertar o clique).
//
// Enquadramento: no zoom 1 o tabuleiro inteiro (chão, o que sobe dele e a lateral que
// desce) aparece do maior tamanho possível, sem encostar em painel da HUD. Fica no
// centro da tela sempre que isso não custa tamanho; se a HUD atrapalha, desliza para
// o lado livre (BoardFraming).
// O frustum fica em pixels (1 unidade = 1 pixel no zoom 1), então camera.zoom é
// direto "pixels por unidade do mundo".
export class CameraRig {
  #space;
  #focus = new THREE.Vector3(0, 0, 0);
  #panX = 0;
  #panZ = 0;
  #zoomLevel = 1;
  #raycaster = new THREE.Raycaster();
  #pointer = new THREE.Vector2();
  #groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  #projected = new THREE.Vector3();
  #diamondHalfWidth;
  #diamondHalfHeight;
  // Painéis da HUD por cima da cena, em pixels do canvas.
  #obstacles = [];
  // Enquadramento da visão inteira — zoom e deslocamento do meio do tabuleiro em
  // relação ao centro da tela (pixels, y para baixo): o alvo e o atual, que desliza.
  #target = { zoom: 1, offsetX: 0, offsetY: 0 };
  #current = { zoom: 1, offsetX: 0, offsetY: 0 };
  #framed = false;
  // Quanto o meio do conteúdo fica acima do centro do mundo (copa das árvores em
  // cima menos a lateral do tabuleiro embaixo), em unidades.
  #raise = 0;

  constructor(space) {
    const world = space.world;
    this.#space = space;
    // Distância e alcance folgados: numa tela alta a vista vai longe para trás (mais
    // fundo) e para a frente (mais perto da câmera) do foco, e o tabuleiro e o céu ao
    // fundo não podem sair dos planos de corte.
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, CAMERA_FAR);
    this.radius = Math.max(world.width, world.height) * 4.4;
    this.viewWidth = 1;
    this.viewHeight = 1;
    // Quanto o mundo ocupa na tela, em unidades, já projetado: um quadrado girado 45°
    // vira um losango de (W + H)/√2 de largura, e a altura é essa largura vezes o seno
    // da elevação isométrica.
    this.#diamondHalfWidth = (world.width + world.height) / Math.SQRT2 / 2;
    this.#diamondHalfHeight = this.#diamondHalfWidth * SIN_ISO;
    this.#applyPan();
  }

  // Centro da tela no chão, em coordenadas da cena.
  get focus() {
    return this.#focus;
  }

  // O retângulo que a tela mostra agora, no espaço da câmera: centro (um pouco fora
  // do foco, pelo acerto vertical do conteúdo) e meias-dimensões.
  visibleFrame() {
    const camera = this.camera;
    return {
      centerX: (camera.left + camera.right) / 2,
      centerY: (camera.top + camera.bottom) / 2,
      halfWidth: (camera.right - camera.left) / 2 / camera.zoom,
      halfHeight: (camera.top - camera.bottom) / 2 / camera.zoom
    };
  }

  // Maior meia-dimensão do que a tela mostra agora, em unidades da cena: encolhe
  // com o zoom.
  visibleHalfSize() {
    const frame = this.visibleFrame();
    return Math.max(frame.halfWidth, frame.halfHeight);
  }

  resize(width, height) {
    this.viewWidth = Math.max(1, width);
    this.viewHeight = Math.max(1, height);
    // Janela mudou de tamanho ou o celular girou: encaixa na hora, sem deslizar.
    this.#retarget();
    this.#snap();
    this.#applyCamera();
  }

  // Painéis da HUD por cima da cena, em pixels do canvas ({left, top, right,
  // bottom}). Mudança de HUD (lista de tribos crescendo) desliza até o novo tamanho
  // em vez de pular.
  setObstacles(rects) {
    this.#obstacles = rects ?? [];
    this.#retarget();
    if (!this.#framed) this.#snap();
    this.#applyCamera();
  }

  // Um passo do deslize do enquadramento, em tempo real.
  update(dt) {
    const current = this.#current, target = this.#target;
    const settled = Math.abs(current.zoom - target.zoom) < target.zoom * 1e-4 &&
      Math.abs(current.offsetX - target.offsetX) < .5 &&
      Math.abs(current.offsetY - target.offsetY) < .5;
    if (settled) return;
    const k = 1 - Math.exp(-dt * REFRAME_RATE);
    current.zoom += (target.zoom - current.zoom) * k;
    current.offsetX += (target.offsetX - current.offsetX) * k;
    current.offsetY += (target.offsetY - current.offsetY) * k;
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

  // `anchor` (pixels do canvas): o ponto do chão sob ele fica parado na tela, como
  // no zoom de mapa. Sem âncora, aproxima em volta do centro.
  zoomBy(factor, anchor = null) {
    const before = anchor ? this.#groundUnder(anchor.x, anchor.y) : null;
    this.#zoomLevel = Math.max(MIN_ZOOM_LEVEL, Math.min(this.#maxZoomLevel(), this.#zoomLevel * factor));
    this.#applyCamera();
    if (!before) return;
    const after = this.project(before.x, before.y);
    this.panByScreen(after.x - anchor.x, after.y - anchor.y);
  }

  // De volta ao mundo inteiro.
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

  // Ponto do chão (coordenadas da simulação) sob um pixel do canvas, pela inversa da
  // matriz do chão.
  #groundUnder(screenX, screenY) {
    const m = this.groundMatrix();
    const determinant = m.a * m.d - m.b * m.c;
    if (!determinant) return null;
    const dx = screenX - m.e, dy = screenY - m.f;
    return {
      x: (m.d * dx - m.c * dy) / determinant,
      y: (-m.b * dx + m.a * dy) / determinant
    };
  }

  // Aproximar até o boneco ficar grande, e nunca menos que 4× a visão inteira: no
  // celular em pé o mundo inteiro fica pequeno, e ali o zoom precisa ir mais longe.
  #maxZoomLevel() {
    return Math.max(MIN_MAX_ZOOM_LEVEL, MAX_PIXELS_PER_UNIT / this.#target.zoom);
  }

  // Enquadramento da visão inteira: a silhueta do tabuleiro vai para o BoardFraming,
  // que acha a posição e o zoom de maior aproveitamento.
  #retarget() {
    const a = this.#diamondHalfWidth, b = this.#diamondHalfHeight;
    // Em cima, o que sobe do chão (copa, bandeira); embaixo, a lateral do tabuleiro.
    const rise = TALLEST_PROP * COS_ISO;
    const drop = BOARD_THICKNESS * COS_ISO;
    // O meio do conteúdo, e não o do mundo, é que vai para o centro da tela.
    this.#raise = (rise - drop) / 2;
    const top = rise - this.#raise, bottom = -drop - this.#raise;
    // Silhueta do tabuleiro na tela, em unidades a partir do centro, y para cima: o
    // losango do chão erguido pela copa das árvores e esticado para baixo pela
    // lateral. Convexa, e o centro fica dentro dela: crescer só cobre mais tela.
    const silhouette = [
      { x: -a, y: top }, { x: 0, y: b + top }, { x: a, y: top },
      { x: a, y: bottom }, { x: 0, y: bottom - b }, { x: -a, y: bottom }
    ];
    this.#target = BoardFraming.fit({
      width: this.viewWidth,
      height: this.viewHeight,
      silhouette,
      obstacles: this.#obstacles
    });
    this.#zoomLevel = Math.min(this.#zoomLevel, this.#maxZoomLevel());
  }

  #snap() {
    this.#current = { ...this.#target };
    this.#framed = true;
  }

  // O foco (centro do passeio) pode ir até a borda do mundo só quando aproximado:
  // no zoom 1 o mundo inteiro já está na tela e o passeio fica travado no meio, e
  // cada aproximação libera o tanto que sai de vista.
  #clampPan() {
    const world = this.#space.world;
    const freedom = 1 - 1 / this.#zoomLevel;
    const limitX = world.width / 2 * freedom, limitZ = world.height / 2 * freedom;
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

  // O three.js encolhe o frustum pelo zoom em volta do centro dele, mas não o
  // deslocamento do centro: por isso o deslocamento em pixels vira unidades aqui,
  // dividido pelo zoom. O meio do tabuleiro cai no ponto escolhido pelo
  // enquadramento; o "raise" (copa das árvores em cima, lateral embaixo) só importa na
  // visão inteira, então some conforme aproxima.
  #applyCamera() {
    const camera = this.camera;
    const { zoom: baseZoom, offsetX, offsetY } = this.#current;
    const zoom = baseZoom * this.#zoomLevel;
    const shiftX = -offsetX / zoom;
    const shiftY = offsetY / zoom + this.#raise / this.#zoomLevel;
    camera.left = shiftX - this.viewWidth / 2;
    camera.right = shiftX + this.viewWidth / 2;
    camera.top = shiftY + this.viewHeight / 2;
    camera.bottom = shiftY - this.viewHeight / 2;
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    this.#clampPan();
    this.#applyPan();
  }
}

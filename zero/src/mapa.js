import * as THREE from 'three';
import { day } from './state.js';

/* ===================== o mapa: onde cada lugar fica no mundo ===================== */
// O jogo é um mundo só. Cada lugar continua sendo montado nas suas próprias coordenadas (o builder
// da cena não mudou de referencial); aqui se diz onde ele está no mundo. A rua de casa fica na
// origem e cada lugar se prende ao vizinho pela peça que os dois já compartilham: o vestíbulo (o
// mesmo cômodo montado nas duas cenas) ou o poço do elevador (a mesma cabine, alguns andares acima).
// Como as duas cópias da peça coincidem no mundo, a porta de uma cena dá de verdade na outra.
//
// Referencial { x, y, z, yaw }: o mesmo que a peça recebe no builder (vestibulo/elevador).
//   de: lugar vizinho já posicionado · a: a peça no vizinho · b: a mesma peça neste lugar
//   raiz: fica na origem do mundo (as coordenadas do builder já são as do mundo)
//   fixo: referencial do lugar no mundo, dado direto
//   veiculo: o controlador do lugar move ele a cada quadro (trem, avião)
//   presente: o lugar só existe quando devolve true · margem: até que distância (m) da caixa dele
//   ainda é desenhado · sempre: as animações rodam mesmo longe (veículos têm horário)

export const ANDAR = 3.0;            // pé-direito de um andar (o elevador sobe ANDAR por andar)
export const LINHA = 360;            // CENTRAL → VIADUTO, no referencial da plataforma (para -x)
export const TZ_TREM = -1.41;        // eixo do trem na plataforma

const R = Math.PI;
export const LUGARES = {
  rua:         { raiz: true, margem: 260 },
  recepcao:    { de: 'rua', a: { x: -5.75, y: .12, z: -34, yaw: 0 }, b: { x: 7, y: 0, z: 0, yaw: R / 2 }, margem: 30 },
  corredor:    { de: 'recepcao', a: { x: -6, y: 23 * ANDAR, z: 0, yaw: R / 2 }, b: { x: 6, y: 0, z: 0, yaw: -R / 2 }, margem: 30 },
  quarto:      { de: 'corredor', a: { x: -7, y: 0, z: 0, yaw: R / 2 }, b: { x: -3.2, y: 0, z: 3.3, yaw: 0 }, margem: 160 },
  loja:        { de: 'rua', a: { x: 13.5, y: .12, z: 20, yaw: -R / 2 }, b: { x: 0, y: 0, z: 4.5, yaw: 0 }, margem: 40,
                 presente: () => day === 5 },
  plataforma:  { de: 'rua', a: { x: 7, y: -3, z: 36.42, yaw: R }, b: { x: -6, y: 2.4, z: 10.9, yaw: 0 }, margem: 50 },
  linha:       { de: 'plataforma', a: {}, b: {}, margem: 30 },
  plataforma2: { de: 'plataforma', a: { x: -LINHA }, b: {}, margem: 50 },
  rua2:        { de: 'plataforma2', a: { x: 6, y: 2.4, z: 10.9, yaw: 0 }, b: { x: 7, y: -3, z: 11.42, yaw: R }, margem: 260 },
  recepcao2:   { de: 'rua2', a: { x: 9.2, y: .12, z: -19.8, yaw: -R / 2 }, b: { x: -5, y: 0, z: 0, yaw: -R / 2 }, margem: 30 },
  empresa:     { de: 'recepcao2', a: { x: 4, y: 12 * ANDAR, z: 0, yaw: -R / 2 }, b: { x: 5.5, y: 0, z: -8, yaw: 0 }, margem: 30 },
  bairro:      { raiz: true, margem: 320 },
  cidadeLonge: { raiz: true, margem: 1e5 },
  aeroporto:   { raiz: true, margem: 700 },
  praia:       { fixo: { x: 60, y: 0, z: -6500, yaw: R / 2 }, margem: 650 },
  trem:        { veiculo: true, margem: 70, sempre: true },
  aviao:       { veiculo: true, margem: 1500, sempre: true },
};

// veículos: o controlador de cada um escreve aqui a matriz (local → mundo) do quadro
export const veiculos = {};

// matriz do referencial (giro em y e posição)
export function matriz({ x = 0, y = 0, z = 0, yaw = 0 } = {}) {
  return new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
}

// onde o lugar está no mundo (matriz local → mundo). Veículos: a de partida (o controlador move)
const cache = {};
export function transformada(nome) {
  if (cache[nome]) return cache[nome];
  const c = LUGARES[nome];
  let T;
  if (!c || c.raiz || c.veiculo) T = new THREE.Matrix4();
  else if (c.fixo) T = matriz(c.fixo);
  else T = transformada(c.de).clone().multiply(matriz(c.a)).multiply(matriz(c.b).invert());
  cache[nome] = T;
  return T;
}

// um referencial dado nas coordenadas de um lugar, levado para o mundo: { x, y, z, yaw }
export function noMundo(nome, f) {
  const M = transformada(nome).clone().multiply(matriz(f)), e = M.elements;
  return { x: e[12], y: e[13], z: e[14], yaw: Math.atan2(e[8], e[0]) };
}

import * as THREE from 'three';
import { PALETTE } from './Palette.js';

// Madeira: casca por fora e miolo claro no corte. Cilindro do three.js tem três grupos
// de face (lado, topo, base), então o mesmo par de materiais serve para tora, toco e
// parede de cabana.
export const BARK_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.trunk });
export const CUT_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xd2b27e });
export const WOOD_MATERIALS = [BARK_MATERIAL, CUT_MATERIAL, CUT_MATERIAL];
export const LOG_RADIUS = 1.5;

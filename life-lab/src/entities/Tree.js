// Árvore da simulação: pode ser cortada, cai, vira toco e rebrota.
export class Tree {
  constructor({ id, x, y, kind, seed, health }) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.seed = seed;
    this.health = health;
    this.growth = 1;
    this.stump = false;
    this.stumpAge = 0;
    // Queda em andamento: { angle, speed, dir, phase, timer, landed }.
    this.fall = null;
    this.shake = 0;
    this.chopper = null;
  }
}

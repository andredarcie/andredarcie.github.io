import { hutSize } from '../settlement/HutDimensions.js';

// Cabana de toras: obra enquanto `built` é falso, abrigo depois. O dono é a chave da
// turma (cor do uniforme da tribo, ou "solo-<id>" para quem anda sozinho).
export class Hut {
  constructor({ id, x, y, owner, angle, seed, capacity }) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.owner = owner;
    this.logs = 0;
    this.built = false;
    this.angle = angle;
    this.beds = new Set();
    this.seed = seed;
    this.capacity = capacity;
    this.inside = 0;
    this.members = 0;
    this.guestBeds = 0;
    this.doorX = x;
    this.doorY = y;
    this.placeDoor();
  }

  // A porta fica logo depois do degrau, e o degrau anda junto quando a cabana cresce.
  placeDoor() {
    const offset = hutSize(this.capacity).width / 2 + 5;
    this.doorX = this.x + Math.cos(this.angle) * offset;
    this.doorY = this.y + Math.sin(this.angle) * offset;
  }

  deliverRadius() {
    return hutSize(this.capacity).width / 2 + 7;
  }
}

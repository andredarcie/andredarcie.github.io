// Corpo de quem morreu: guarda a aparência para a cena e o relógio da decomposição.
export class Corpse {
  constructor(organism) {
    this.x = organism.x;
    this.y = organism.y;
    this.size = organism.size;
    this.sex = organism.sex;
    this.stage = organism.stage;
    this.color = organism.color;
    this.outfit = organism.outfit;
    this.name = organism.name;
    this.heading = organism.heading;
    this.direction = Math.random() < .5 ? -1 : 1;
    // Segundos de simulação desde a morte (queda) e dias do céu (decomposição).
    this.time = 0;
    this.age = 0;
    this.seed = Math.random() * 100;
  }
}

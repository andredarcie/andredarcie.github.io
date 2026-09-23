// Um bicho. É só estado: quem decide o que ele faz são os sistemas da simulação.
// A fábrica (OrganismFactory) é quem preenche os valores iniciais.
export class Organism {
  constructor(fields) {
    // Identidade e herança.
    this.id = fields.id;
    this.name = fields.name;
    this.genome = fields.genome;
    this.genes = fields.genes;
    this.lineage = fields.lineage;
    this.generation = fields.generation;
    // Corpo no espaço.
    this.x = fields.x;
    this.y = fields.y;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
    this.heading = fields.heading;
    this.wanderHeading = fields.heading;
    this.walkTimer = fields.walkTimer;
    this.restTimer = 0;
    this.gait = fields.gait;
    this.wanderPhase = fields.wanderPhase;
    this.pace = fields.genes.speed;
    // Ciclo de vida.
    this.sex = fields.sex;
    this.age = fields.age;
    this.stage = fields.stage;
    this.size = fields.size;
    this.color = fields.color;
    this.outfit = null;
    // Necessidades.
    this.life = 100;
    this.hunger = 100;
    this.thirst = 100;
    // Cada um tem sua hora: uns deitam ainda no crepúsculo, outros só no escuro,
    // e acordam também espalhados. Sem isso a ilha inteira apagaria num estalo.
    this.energy = fields.energy;
    this.asleep = false;
    // Madeira, abrigo e luto.
    this.carrying = false;
    this.chop = null;
    this.woodTarget = null;
    this.hut = null;
    this.inHut = false;
    this.mourn = null;
    this.crying = false;
    this.bedLight = fields.bedLight;
    this.wakeLight = fields.wakeLight;
    // Busca de recurso, fala e consumo.
    this.need = null;
    this.target = null;
    this.thought = 0;
    this.message = '';
    this.eating = 0;
    this.drinking = 0;
    this.drinkingPond = null;
    // Reprodução e tribo.
    this.pair = null;
    this.mateCooldown = 0;
    this.pregnancy = null;
    this.birthAnimation = fields.birthAnimation;
    this.tribe = [];
    this.band = null;
    this.search = fields.search;
  }

  get hungriest() {
    return Math.min(this.hunger, this.thirst);
  }

  // Para de andar na hora: comer, beber, cortar, chorar, dormir.
  halt() {
    this.speed = 0;
    this.vx = 0;
    this.vy = 0;
  }

  say(message, duration) {
    this.message = message;
    this.thought = duration;
  }
}

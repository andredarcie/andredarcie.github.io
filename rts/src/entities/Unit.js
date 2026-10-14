// Uma unidade do RTS. Carrega os mesmos campos que a cena lê dos bichos
// (OrganismRenderer, CorpseRenderer, sangue), mais o que o RTS precisa: time, tipo,
// ordem atual e o alvo da briga.
export class Unit {
  constructor({ id, team, type, stats, x, y, heading, sex, color, outfit, trousers = null, look = null, hpScale = 1, power = 1 }) {
    this.id = id;
    this.team = team;
    this.type = type;
    this.stats = stats;
    this.name = stats.label;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
    this.heading = heading;
    this.gait = Math.random() * 10;
    this.pace = stats.speed;
    this.wanderPhase = Math.random();
    this.sex = sex;
    this.stage = 'adult';
    this.size = stats.size;
    this.color = color;
    this.outfit = outfit;
    this.trousers = trousers;
    // Os renderizadores criam o leque de visão a partir disto; fica escondido.
    this.genes = { visionAngle: 120, visionRange: stats.sight };
    this.maxLife = stats.hp * hpScale;
    this.life = this.maxLife;
    // Multiplica o dano do golpe: invasor de onda avançada bate mais forte.
    this.power = power;
    // O traje (CharacterModel.equip): chapéu, saia, camisolão, correame, canhão...
    this.look = look;
    // Sob a pregação de Antônio Conselheiro (ou o comando de João Abade): bate mais
    // forte (`boost`) e se recupera.
    this.inspired = false;
    this.boost = 1;
    // Tocaia: parado na caatinga, some da vista do inimigo; `ambush` multiplica o
    // primeiro golpe de quem saiu dela.
    this.hidden = false;
    this.still = 0;
    this.ambush = 1;
    // Da tropa: sede (segundos desde a última água), debandada e o fuzil largado.
    this.thirst = 0;
    this.flee = 0;
    this.disarmed = false;
    this.gone = false;
    // Fogo da flecha incendiária: segundos que ainda queima e o dano por segundo.
    this.burn = 0;
    this.burnDps = 0;
    this.birthAnimation = 0;
    this.energy = 100;
    // Ordem dada (move, attackMove, attack, gather, build, raid) e o que o soldado
    // persegue por conta própria; `post` é onde ele estava de guarda.
    this.order = null;
    this.engage = null;
    this.post = { x, y };
    this.retaliate = 0;
    // Trabalho: tora no ombro, comida na mão, golpe de machado ou colheita.
    this.carrying = false;
    this.carryFood = 0;
    this.chop = null;
    this.eating = 0;
    // Campos que a cena dos bichos espera e que aqui ficam parados.
    this.drinking = 0;
    this.asleep = false;
    this.pregnancy = null;
    this.crying = false;
    this.torch = false;
    this.inHut = false;
    this.thought = 0;
    this.message = '';
    // Briga: arma (sempre à mostra no soldado), golpe em andamento e feridas.
    this.weapon = stats.weapon ?? (stats.cannon ? 'cannon' : null);
    this.armed = type !== 'worker';
    this.foe = null;
    this.strike = 0;
    this.strikeSwing = 1;
    this.strikeKind = null;
    this.strikeTarget = null;
    this.strikeLanded = true;
    this.strikeTimer = 0;
    this.hurt = 0;
    this.wounds = 0;
    this.bleed = 0;
    this.dripTimer = 0;
    this.woundedBy = null;
    this.slainBy = null;
    this.bledOut = false;
    this.beheaded = false;
  }

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

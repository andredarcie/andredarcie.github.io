import {
  NEST_R, EGG_COST, MIN_ANTS, TOUCH_DIST, HASH_CELL, CHAMBER_OFF
} from './config.js';
import { rand, TAU } from './math.js';
import { Ant } from './ant.js';
import { Queen } from './queen.js';
import { BroodItem } from './brood.js';
import { SpatialHash } from './spatial-hash.js';

/**
 * A população: quem nasce, quem morre e quanta comida entrou.
 *
 * Cuida do coletivo; o que uma formiga faz sozinha é problema dela. O laço de
 * quadro só chama `update` — a política de natalidade fica aqui.
 */
export class Colony {
  constructor(nest) {
    this.nest = nest;
    this.ants = [];
    this.queen = new Queen();
    this.brood = [];      // ovos, larvas e pupas esperando pra virar operária
    this.chamber = { x: 0, y: 0 };
    this.store = 0;       // comida guardada, ainda não virou ovo
    this.delivered = 0;   // total histórico, é o número do HUD
    this.popCap = 200;
    this.hash = new SpatialHash(HASH_CELL);
  }

  get size() {
    return this.ants.length;
  }

  resize(width, height, popCap) {
    this.popCap = popCap;
    this.hash.resize(width, height);
    this.#placeChamber();
  }

  reset(count) {
    this.ants = [];
    this.brood = [];
    this.store = 0;
    this.delivered = 0;
    this.#placeChamber();
    for (let i = 0; i < count; i++) this.spawn();
  }

  // A câmara fica ao lado da entrada, em cima da terra cavada: é onde as
  // operárias põem a ninhada pra pegar sol, e é claro o bastante pra pilha
  // aparecer.
  #placeChamber() {
    const th = Math.random() * TAU;
    const d = NEST_R + CHAMBER_OFF;
    this.chamber.x = this.nest.x + Math.cos(th) * d;
    this.chamber.y = this.nest.y + Math.sin(th) * d;
    this.queen.moveTo(this.chamber.x, this.chamber.y);
  }

  spawn() {
    const th = Math.random() * TAU;
    const d = rand(0, NEST_R);
    this.ants.push(new Ant(this.nest.x + Math.cos(th) * d, this.nest.y + Math.sin(th) * d, th));
  }

  /** Uma formiga entregou um grão. Comer no ninho também rejuvenesce um pouco. */
  receive(ant) {
    this.delivered++;
    this.store++;
    ant.age = Math.max(0, ant.age - 12);
  }

  /** A rainha pergunta isto antes de pôr: tem comida e tem espaço? */
  canLay() {
    if (this.ants.length + this.brood.length >= this.popCap) return false;
    return this.store >= EGG_COST || this.ants.length < MIN_ANTS;
  }

  /**
   * Põe um ovo. Abaixo do mínimo de operárias a postura sai de graça: sem isso
   * uma colônia que perdeu todo mundo não teria como voltar, já que não sobra
   * ninguém pra trazer comida.
   */
  layEgg(x, y) {
    if (this.store >= EGG_COST) this.store -= EGG_COST;
    const spread = Math.min(16, 5 + Math.sqrt(this.brood.length) * 0.9);
    this.brood.push(new BroodItem(x, y, spread));
  }

  update(dt, world) {
    this.#meetings();

    for (let i = this.ants.length - 1; i >= 0; i--) {
      const ant = this.ants[i];
      if (ant.dead) {
        this.ants[i] = this.ants[this.ants.length - 1];
        this.ants.pop();
        continue;
      }
      ant.step(dt, world);
    }

    this.queen.update(dt, this);
    this.#hatch(dt);
  }

  // Encontros: as duas travam um instante e se antenam. É o que dá o vai-e-vem
  // engarrafado numa trilha cheia.
  #meetings() {
    this.hash.build(this.ants);
    this.hash.forEachPair(TOUCH_DIST, (a, b) => {
      if (a.touchCd > 0 || b.touchCd > 0) return;
      a.greet();
      b.greet();
    });
  }

  // A cria amadurece; pupa pronta vira operária ali mesmo, na pilha.
  #hatch(dt) {
    for (let i = this.brood.length - 1; i >= 0; i--) {
      const item = this.brood[i];
      item.update(dt);
      if (!item.hatched) continue;
      this.ants.push(new Ant(item.x, item.y, Math.random() * TAU));
      this.brood[i] = this.brood[this.brood.length - 1];
      this.brood.pop();
    }
  }
}

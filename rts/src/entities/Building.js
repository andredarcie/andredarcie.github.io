import { hutSize } from '../settlement/HutDimensions.js';
import { HUT_LOGS } from '../config/settlement.js';

// Construção do jogo. Cabana (hall, lodge, house) e fogueira de guerra (camp) usam os
// renderizadores que já existiam: por isso carrega os campos que eles leem
// (logs/built/capacity/owner/angle da cabana; flame/seed da fogueira). A torre tem
// renderizador próprio (TowerRenderer).
export class Building {
  constructor({ id, team, kind, stats, x, y, angle, outfit, built = false }) {
    this.id = id;
    this.team = team;
    this.kind = kind;
    this.stats = stats;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.seed = Math.random() * 100;
    this.radius = stats.radius;
    this.maxLife = stats.hp;
    // Obra começa com um décimo da vida e ganha o resto conforme sobe.
    this.progress = built ? 1 : 0;
    this.life = built ? stats.hp : stats.hp * .1;
    this.built = built;
    // Cabana: o renderizador sobe as fiadas pelas toras entregues.
    this.capacity = stats.capacity || 4;
    this.logs = built ? HUT_LOGS : 0;
    this.owner = built ? outfit : null;
    this.outfit = outfit;
    this.inside = 0;
    // Fogueira: chama de 0 a 1.
    this.flame = built ? 1 : 0;
    this.dying = false;
    // Fila de treino ([{ type, time }]) e para onde vai quem sai dela.
    this.queue = [];
    this.rally = null;
    // Trincheira: níveis das melhorias, recarga do tiro, alvo e para onde o atirador mira.
    this.levels = { power: 0, range: 0, scatter: 0 };
    this.cooldown = 0;
    this.target = null;
    this.aim = angle;
    this.hurt = 0;
    this.doorX = x;
    this.doorY = y;
    this.placeDoor();
  }

  // Desenhadas pelo modelo das construções da era (HutRenderer): tudo o que não é
  // torre nem fogueira — inclusive as do inimigo (barraca, engenho, senzala).
  get isHut() {
    return !this.isTower && this.kind !== 'camp';
  }

  // Atira sozinha: a trincheira e as torres da Igreja Nova.
  get shoots() {
    return this.isTower || Boolean(this.stats.turret);
  }

  get isTower() {
    return this.kind === 'tower';
  }

  // Na fogueira e na torre a "porta" é um ponto ao lado.
  placeDoor() {
    // As ocas dos tupinambás dizem onde fica a porta (`door`, numa das pontas).
    const offset = this.stats.door ?? (this.isHut ? hutSize(this.capacity).width / 2 + 7 : this.radius + 6);
    this.doorX = this.x + Math.cos(this.angle) * offset;
    this.doorY = this.y + Math.sin(this.angle) * offset;
  }

  // Avança a obra; devolve true no instante em que fica pronta.
  advance(amount) {
    if (this.built) return false;
    const before = this.progress;
    this.progress = Math.min(1, this.progress + amount);
    this.life = Math.min(this.maxLife, this.life + (this.progress - before) * this.maxLife * .9);
    this.logs = Math.min(HUT_LOGS - 1, Math.floor(this.progress * HUT_LOGS));
    this.flame = 0;
    if (this.progress < 1) return false;
    this.built = true;
    this.logs = HUT_LOGS;
    this.owner = this.outfit;
    this.flame = 1;
    return true;
  }
}

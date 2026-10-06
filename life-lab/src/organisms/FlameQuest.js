import { WORLD } from '../config/world.js';
import { RUN_SPEED, LIFE_SIZE } from '../config/organisms.js';
import { OUTFIT_COLORS } from '../config/social.js';
import {
  FLAME_PICKUP_RANGE, FLAME_MIN_NEED, STRIKE_ENERGY,
  FLAME_DROP_CHANCE, ATTACK_MIN_LIFE, ATTACK_MIN_ENERGY, MAX_ATTACKERS, DEFEND_RANGE, FIGHT_LEASH,
  FIGHT_IDLE_TIMEOUT, FIGHT_COOLDOWN, HURT_FLASH
} from '../config/flame.js';
import {
  WEAPONS, WEAPON_TRADITIONS, STRIKE_SLACK, WOUND_MAX, BLEED_SECONDS, BLEED_MAX
} from '../config/combat.js';

// A disputa pela Chama Primordial: ir buscá-la no chão, tomá-la à força de quem a
// carrega e brigar — atacar, revidar, defender o portador da própria tribo ou fugir.
// Quem decide se vale a pena é a rede neural: a cobiça põe o bicho atrás da chama e
// a coragem decide entre revidar e correr.
//
// Cada um briga com a arma da tradição da tribo (porrete, lança ou machado de
// pedra). O golpe tem tempo: a animação começa, e só no instante do impacto o golpe
// acerta — se a vítima já saiu do alcance, erra. O acerto tira vida, abre ferida,
// faz sangrar, espirra sangue e empurra; o machado que mata pode arrancar a cabeça.
export class FlameQuest {
  #state;
  #perception;
  #locomotion;
  #primordial;
  #sleep;
  #woodcutting;
  #mind;
  #blood;

  constructor({ state, perception, locomotion, primordialFlame, sleep, woodcutting, mind, blood }) {
    this.#blood = blood;
    this.#state = state;
    this.#perception = perception;
    this.#locomotion = locomotion;
    this.#primordial = primordialFlame;
    this.#sleep = sleep;
    this.#woodcutting = woodcutting;
    this.#mind = mind;
  }

  // Briga em andamento. Roda antes do sono: quem apanha dormindo acorda e não volta
  // a deitar no meio da briga. Devolve true enquanto o bicho está ocupado brigando.
  fight(o, dt) {
    o.hurt = Math.max(0, o.hurt - dt);
    o.strike = Math.max(0, o.strike - dt);
    o.strikeTimer = Math.max(0, o.strikeTimer - dt);
    o.fightCooldown = Math.max(0, o.fightCooldown - dt);
    this.#landSwing(o);
    const foe = o.foe;
    if (!foe) return false;
    o.fightIdle += dt;
    const distance = Math.hypot(foe.x - o.x, foe.y - o.y);
    if (!this.#state.organisms.includes(foe) || foe.life <= 0 || distance > FIGHT_LEASH ||
      o.fightIdle > FIGHT_IDLE_TIMEOUT || o.pair || o.pregnancy?.labor ||
      (o.foeRole === 'attack' && !this.#worthAttacking(o, foe))) {
      this.#endFight(o);
      return false;
    }
    if (o.asleep) this.#sleep.wakeUp(o, 'socorro!');
    this.#woodcutting.stopChop(o);
    // Briga corta o luto: ninguém chora com as mãos no rosto no meio dos golpes.
    o.mourn = null;
    o.crying = false;
    o.eating = 0;
    o.drinking = 0;
    o.restTimer = 0;
    const direction = Math.atan2(foe.y - o.y, foe.x - o.x);
    o.weapon = FlameQuest.#weaponFor(o);
    const weapon = WEAPONS[o.weapon];
    // No meio do golpe ninguém sai do lugar: o corpo está no movimento da arma.
    if (o.strike > 0) {
      o.halt();
      return true;
    }

    // Sem coragem (ou sem vida para isso), quem foi atacado corre.
    if (o.foeRole === 'defend' && (this.#mind.courage(o) < 0 || o.life < 20)) {
      if (o.thought <= 0) o.say('fuja!', 1.2);
      this.#locomotion.move(o, dt, {
        direction: direction + Math.PI,
        desiredSpeed: RUN_SPEED * o.pace * this.#locomotion.stageSpeed(o)
      });
      return true;
    }
    if (distance > weapon.reach) {
      this.#locomotion.move(o, dt, {
        direction,
        desiredSpeed: RUN_SPEED * o.pace * this.#locomotion.stageSpeed(o)
      });
      return true;
    }
    o.halt();
    o.heading = direction;
    if (o.strikeTimer <= 0) {
      // Começa o golpe; o acerto vem no impacto (ver #landSwing).
      o.strike = weapon.swing;
      o.strikeSwing = weapon.swing;
      o.strikeKind = o.weapon;
      o.strikeTarget = foe;
      o.strikeLanded = false;
      o.strikeTimer = weapon.interval;
      o.energy = Math.max(0, o.energy - STRIKE_ENERGY);
    }
    return true;
  }

  // A arma da tradição da tribo, pela cor do uniforme; sem tribo, porrete.
  static #weaponFor(o) {
    if (!o.outfit) return 'club';
    const index = Math.max(0, OUTFIT_COLORS.indexOf(o.outfit));
    return WEAPON_TRADITIONS[index % WEAPON_TRADITIONS.length];
  }

  // Chegou o instante do impacto: acerta se a vítima ainda está ao alcance.
  #landSwing(o) {
    if (o.strike <= 0 || o.strikeLanded || !o.strikeTarget) return;
    const weapon = WEAPONS[o.strikeKind];
    if (1 - o.strike / o.strikeSwing < weapon.impact) return;
    o.strikeLanded = true;
    const target = o.strikeTarget;
    o.strikeTarget = null;
    if (target.life <= 0 || !this.#state.organisms.includes(target)) return;
    if (Math.hypot(target.x - o.x, target.y - o.y) > weapon.reach * STRIKE_SLACK) return;
    this.#hit(o, target, weapon);
  }

  // Sem briga: vê a chama e, se a cobiça manda, vai atrás. No chão, pega; na mão de
  // outro povo, parte para cima de quem a carrega.
  pursue(o, dt) {
    const flame = this.#state.flame;
    if (!flame || o.torch || o.stage === 'infant' || o.pair || o.pregnancy) return false;
    if (o.hungriest < FLAME_MIN_NEED || this.#mind.greed(o) <= 0) return false;
    const holder = flame.holder;
    if (!holder) {
      if (!this.#perception.inVision(o, flame)) return false;
      const distance = Math.hypot(flame.x - o.x, flame.y - o.y);
      this.#woodcutting.stopChop(o);
      o.restTimer = 0;
      if (distance <= FLAME_PICKUP_RANGE) {
        o.halt();
        this.#primordial.take(o);
        return true;
      }
      if (o.thought <= 0) o.say('a chama!', 1.2);
      this.#locomotion.move(o, dt, {
        direction: Math.atan2(flame.y - o.y, flame.x - o.x),
        desiredSpeed: RUN_SPEED * o.pace * this.#locomotion.stageSpeed(o)
      });
      return true;
    }
    // Pegar do chão vale logo depois de uma briga; atacar de novo, só depois do fôlego.
    if (o.fightCooldown > 0 || o.life < ATTACK_MIN_LIFE || o.energy < ATTACK_MIN_ENERGY) return false;
    if (!this.#worthAttacking(o, holder) || !this.#perception.inVision(o, holder, holder.size)) return false;
    if (this.#attackersOf(holder) >= MAX_ATTACKERS) return false;
    o.foe = holder;
    o.foeRole = 'attack';
    o.fightIdle = 0;
    o.say('a chama é nossa!', 1.6);
    return this.fight(o, dt);
  }

  // Ainda vale atacar: o alvo segue com a chama, é de outro povo e não está
  // protegido dentro da cabana.
  #worthAttacking(o, target) {
    return this.#primordial.holder === target && !target.inHut && !this.#primordial.sameSide(o, target);
  }

  #attackersOf(target) {
    let count = 0;
    for (const other of this.#state.organisms) if (other.foe === target) count++;
    return count;
  }

  #hit(o, foe, weapon) {
    const power = (o.stage === 'elder' ? .6 : 1) * (o.size / LIFE_SIZE) * (.7 + .3 * o.energy / 100);
    const damage = weapon.damage * power * (.8 + Math.random() * .4);
    const direction = Math.atan2(foe.y - o.y, foe.x - o.x);
    foe.life -= damage;
    foe.hurt = HURT_FLASH;
    foe.woundedBy = o.name;
    foe.wounds = Math.min(WOUND_MAX, foe.wounds + 1);
    foe.bleed = Math.min(BLEED_MAX, foe.bleed + weapon.bleed * BLEED_SECONDS * damage / 10);
    // O tranco empurra a vítima para trás.
    foe.x = Math.max(foe.size, Math.min(WORLD.width - foe.size, foe.x + Math.cos(direction) * weapon.knock));
    foe.y = Math.max(foe.size, Math.min(WORLD.height - foe.size, foe.y + Math.sin(direction) * weapon.knock));
    this.#blood.splash(foe, direction, damage);
    o.fightIdle = 0;
    foe.fightIdle = 0;
    if (foe.life <= 0) {
      foe.slainBy = o.name;
      // Machado no golpe final pode levar a cabeça: o jato sai do pescoço.
      if (Math.random() < weapon.behead) {
        foe.beheaded = true;
        this.#blood.splash(foe, direction, 40, 13);
        o.say('decapitou!', 1.6);
      } else {
        o.say('venci', 1.4);
      }
      return;
    }
    if (foe.asleep) this.#sleep.wakeUp(foe, 'socorro!');
    foe.eating = 0;
    foe.drinking = 0;
    // Quem apanha revida (ou foge, se faltar coragem: ver fight).
    if (!foe.foe && foe.stage !== 'infant') {
      foe.foe = o;
      foe.foeRole = 'defend';
      foe.fightIdle = 0;
    }
    this.#callAllies(foe, o);
    if (this.#primordial.holder === foe && Math.random() < FLAME_DROP_CHANCE) {
      this.#primordial.drop();
      foe.say('a chama caiu!', 1.6);
    }
  }

  // A tribo de quem apanha corre para cima do agressor, até MAX_ATTACKERS por vez.
  #callAllies(victim, striker) {
    let attackers = this.#attackersOf(striker);
    for (const ally of this.#state.organisms) {
      if (attackers >= MAX_ATTACKERS) return;
      if (ally === victim || ally === striker || ally.foe || ally.asleep || ally.pair) continue;
      if (ally.stage === 'infant' || ally.pregnancy?.labor || ally.life < 30) continue;
      if (!victim.band || ally.band !== victim.band) continue;
      if (this.#mind.courage(ally) < 0) continue;
      if (Math.hypot(ally.x - victim.x, ally.y - victim.y) > DEFEND_RANGE) continue;
      ally.foe = striker;
      ally.foeRole = 'defend';
      ally.fightIdle = 0;
      ally.say(`deixa ${victim.name}!`, 1.4);
      attackers++;
    }
  }

  #endFight(o) {
    o.foe = null;
    o.foeRole = null;
    o.fightCooldown = FIGHT_COOLDOWN;
  }
}

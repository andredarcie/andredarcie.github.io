import { WORLD } from '../config/world.js';
import { LIFE_SIZE, MATE_MIN_ENERGY } from '../config/organisms.js';
import {
  MATE_MIN_RESOURCE, MATE_COOLDOWN, COURTSHIP_DURATION, MATING_DURATION, GESTATION_DURATION,
  LABOR_DURATION, BIRTH_ANIMATION_DURATION
} from '../config/reproduction.js';
import { Pair } from '../entities/Pair.js';

// Do olhar ao nascimento: quem está em condição de acasalar, a aproximação, o
// cortejo, a cópula (que já fecunda), a gestação, o parto e o filhote.
export class ReproductionSystem {
  #state;
  #perception;
  #genetics;
  #factory;
  #events;
  #motion;

  constructor({ state, perception, genetics, factory, events, motionPreference }) {
    this.#state = state;
    this.#perception = perception;
    this.#genetics = genetics;
    this.#factory = factory;
    this.#events = events;
    this.#motion = motionPreference;
  }

  update({ dt }) {
    this.updatePairs(dt);
    this.updatePregnancies(dt);
  }

  canMate(o) {
    const minimum = MATE_MIN_RESOURCE + (1 - o.genes.fertility) * 18;
    return o.stage === 'adult' && o.life > 0 && !o.asleep && !o.mourn && o.energy >= MATE_MIN_ENERGY &&
      o.hunger >= minimum &&
      o.thirst >= minimum && o.mateCooldown <= 0 && !o.pregnancy &&
      o.eating <= 0 && o.drinking <= 0;
  }

  seekMate(observer) {
    let partner = null, closest = this.#perception.sightRange(observer);
    for (const candidate of this.#state.organisms) {
      if (candidate.sex === observer.sex || candidate.pair || !this.canMate(candidate)) continue;
      if (!this.#perception.inVision(observer, candidate, candidate.size)) continue;
      const distance = Math.max(0, Math.hypot(candidate.x - observer.x, candidate.y - observer.y) - candidate.size);
      if (distance < closest) { partner = candidate; closest = distance; }
    }
    if (!partner) return;
    const male = observer.sex === 'male' ? observer : partner;
    const female = observer.sex === 'female' ? observer : partner;
    const pair = new Pair(male, female);
    this.#state.pairs.push(pair);
    for (const o of [male, female]) {
      o.pair = pair;
      o.need = null;
      o.target = null;
      o.restTimer = 0;
      o.say(o === observer ? (o.sex === 'male' ? 'vi fêmea' : 'vi macho') : 'atração', 1.5);
    }
  }

  updatePairs(dt) {
    const state = this.#state;
    const pairs = state.pairs;
    for (let i = pairs.length - 1; i >= 0; i--) {
      const pair = pairs[i];
      const { male, female } = pair;
      const missing = !state.organisms.includes(male) || !state.organisms.includes(female);
      if (missing || male.stage !== 'adult' || female.stage !== 'adult') {
        male.pair = null;
        female.pair = null;
        pairs.splice(i, 1);
        continue;
      }

      const distance = Math.hypot(male.x - female.x, male.y - female.y);
      const fertility = (male.genes.fertility + female.genes.fertility) / 2;
      if (pair.phase === 'approach' && distance <= 30) {
        pair.phase = 'courtship';
        pair.timer = COURTSHIP_DURATION / Math.sqrt(fertility);
        const courtshipMargin = LIFE_SIZE + 14;
        pair.centerX = Math.max(courtshipMargin, Math.min(WORLD.width - courtshipMargin,
          (male.x + female.x) / 2));
        pair.centerY = Math.max(courtshipMargin, Math.min(WORLD.height - courtshipMargin,
          (male.y + female.y) / 2));
        for (const o of [male, female]) {
          o.halt();
          o.thought = 0;
        }
      } else if (pair.phase === 'courtship') {
        this.#courtship(pair, dt, fertility);
      } else if (pair.phase === 'mating') {
        if (this.#mating(pair, dt, fertility)) pairs.splice(i, 1);
      }
    }
  }

  updatePregnancies(dt) {
    const state = this.#state;
    const newborns = [];
    for (const mother of state.organisms) {
      if (!mother.pregnancy || mother.life <= 0) continue;
      mother.pregnancy.elapsed += dt;
      const remaining = mother.pregnancy.duration - mother.pregnancy.elapsed;
      if (!mother.pregnancy.labor && remaining <= LABOR_DURATION) {
        mother.pregnancy.labor = true;
        mother.target = null;
        mother.need = null;
        mother.eating = 0;
        mother.drinking = 0;
        mother.drinkingPond = null;
        mother.say('vai nascer', LABOR_DURATION);
      }
      if (mother.pregnancy.elapsed < mother.pregnancy.duration) continue;
      newborns.push(this.#deliver(mother));
    }
    state.organisms.push(...newborns);
    for (const effect of state.birthEffects) effect.time += dt;
    state.birthEffects = state.birthEffects.filter(effect => effect.time < BIRTH_ANIMATION_DURATION);
  }

  // Mãe de mais meninas nasce menino, e vice-versa: a proporção se equilibra sozinha.
  #offspringSex() {
    const organisms = this.#state.organisms;
    const males = organisms.reduce((total, o) => total + (o.sex === 'male' ? 1 : 0), 0);
    const females = organisms.length - males;
    if (males === females) return Math.random() < .5 ? 'male' : 'female';
    return males < females ? 'male' : 'female';
  }

  #courtship(pair, dt, fertility) {
    const { male, female } = pair;
    pair.timer -= dt;
    pair.orbit += dt * 2.25;
    const radius = 11 + Math.sin(pair.orbit * 2) * 1.5;
    const cos = Math.cos(pair.orbit), sin = Math.sin(pair.orbit);
    male.x = pair.centerX + cos * radius;
    male.y = pair.centerY + sin * radius * .62;
    female.x = pair.centerX - cos * radius;
    female.y = pair.centerY - sin * radius * .62;
    male.heading = Math.atan2(female.y - male.y, female.x - male.x);
    female.heading = Math.atan2(male.y - female.y, male.x - female.x);
    male.gait += dt * 8;
    female.gait += dt * 8;
    if (pair.timer <= 0) {
      pair.phase = 'mating';
      pair.timer = MATING_DURATION / fertility;
    }
  }

  // Devolve true quando a cópula termina e o casal se desfaz.
  #mating(pair, dt, fertility) {
    const { male, female } = pair;
    pair.timer -= dt;
    const pulse = this.#motion.reduced ? 0 : Math.sin(pair.timer * 10) * 1.2;
    const direction = Math.atan2(female.y - male.y, female.x - male.x);
    const centerX = (male.x + female.x) / 2;
    const centerY = (male.y + female.y) / 2;
    male.x = centerX - Math.cos(direction) * (7 + pulse);
    male.y = centerY - Math.sin(direction) * (7 + pulse);
    female.x = centerX + Math.cos(direction) * (7 + pulse);
    female.y = centerY + Math.sin(direction) * (7 + pulse);
    male.heading = direction;
    female.heading = direction + Math.PI;
    if (pair.timer > 0) return false;
    male.pair = null;
    female.pair = null;
    male.mateCooldown = MATE_COOLDOWN / male.genes.fertility;
    female.mateCooldown = 0;
    for (const o of [male, female]) {
      o.hunger = Math.max(0, o.hunger - 22);
      o.thirst = Math.max(0, o.thirst - 18);
    }
    // A fecundação acontece aqui: cada pai gera um gameta agora, então o filhote
    // já tem genoma definido mesmo que o pai morra durante a gestação.
    female.pregnancy = {
      elapsed: 0,
      duration: GESTATION_DURATION / fertility,
      genome: this.#genetics.createZygote(
        this.#genetics.createGamete(male.genome), this.#genetics.createGamete(female.genome)),
      fatherId: male.id,
      fatherName: male.name,
      generation: (male.generation + female.generation) / 2 + 1,
      labor: false
    };
    female.say('grávida', 1.8);
    return true;
  }

  #deliver(mother) {
    const offset = mother.size + LIFE_SIZE * .72;
    const x = Math.max(LIFE_SIZE, Math.min(WORLD.width - LIFE_SIZE,
      mother.x - Math.cos(mother.heading) * offset));
    const y = Math.max(LIFE_SIZE, Math.min(WORLD.height - LIFE_SIZE,
      mother.y - Math.sin(mother.heading) * offset));
    const child = this.#factory.create({
      x,
      y,
      sex: this.#offspringSex(),
      genome: mother.pregnancy.genome,
      lineage: {
        fatherId: mother.pregnancy.fatherId, motherId: mother.id,
        // O nome vai junto: o pai pode já ter morrido quando a ficha for aberta.
        fatherName: mother.pregnancy.fatherName, motherName: mother.name
      },
      generation: mother.pregnancy.generation
    });
    child.heading = mother.heading + Math.PI;
    child.wanderHeading = child.heading;
    this.#state.birthEffects.push({ x, y, color: child.color, time: 0 });
    this.#events.emit('birth', { mother, child, x, y });
    mother.pregnancy = null;
    mother.mateCooldown = MATE_COOLDOWN * .55 / mother.genes.fertility;
    mother.say('nasceu!', 1.8);
    this.#state.births++;
    return child;
  }
}

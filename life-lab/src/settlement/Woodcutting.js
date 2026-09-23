import {
  CHOP_SWING, CHOP_IMPACT, CHOP_REACH, ENERGY_PER_SWING, TREE_LANDMARK_RANGE, HUT_LOGS,
  WORK_MIN_ENERGY, WORK_MIN_LIGHT
} from '../config/settlement.js';

// O trabalho da madeira: escolher árvore, bater o machado no ritmo do golpe,
// derrubar, pegar a tora e levar até a obra da própria turma.
export class Woodcutting {
  #state;
  #sky;
  #perception;
  #locomotion;
  #shelter;
  #forest;
  #events;

  constructor({ state, skyClock, perception, locomotion, shelter, forest, events }) {
    this.#state = state;
    this.#sky = skyClock;
    this.#perception = perception;
    this.#locomotion = locomotion;
    this.#shelter = shelter;
    this.#forest = forest;
    this.#events = events;
  }

  stopChop(o) {
    if (o.chop && o.chop.tree.chopper === o.id) o.chop.tree.chopper = null;
    o.chop = null;
  }

  // O trabalho da madeira, em ordem: tora no ombro vai para a obra; tora no chão à
  // vista vai para o ombro; sem tora, corta árvore. Devolve o movimento do tique, ou
  // nada quando o bicho não tem o que fazer com madeira agora.
  work(o, dt) {
    if (!this.#canWork(o) || (!o.carrying && !this.#shelter.needsShelter(o))) {
      if (o.chop) this.stopChop(o);
      return null;
    }
    if (o.carrying) return this.#deliver(o);
    if (o.chop) return this.#chopTick(o, dt);
    const log = this.#perception.nearest(o, this.#state.logs);
    if (log) {
      if (Math.hypot(log.x - o.x, log.y - o.y) <= 7) {
        this.#forest.takeLog(log);
        o.carrying = true;
        o.say('peguei a tora', 1.2);
        return { direction: o.heading, desiredSpeed: 0 };
      }
      return this.#locomotion.approach(o, log.x, log.y, 5);
    }
    const tree = this.#targetTree(o);
    if (!tree) return null;
    if (Math.hypot(tree.x - o.x, tree.y - o.y) <= CHOP_REACH) {
      o.chop = { tree, timer: 0 };
      tree.chopper = o.id;
      o.heading = Math.atan2(tree.y - o.y, tree.x - o.x);
      o.halt();
      o.say('vou cortar', 1.2);
      return { direction: o.heading, desiredSpeed: 0 };
    }
    return this.#locomotion.approach(o, tree.x, tree.y, CHOP_REACH - 1);
  }

  #canWork(o) {
    return o.stage === 'adult' && o.energy > WORK_MIN_ENERGY && !o.pregnancy?.labor &&
      this.#sky.current.daylight > WORK_MIN_LIGHT;
  }

  #deliver(o) {
    const site = this.#shelter.buildSite(o, true);
    if (!site) return null;
    if (Math.hypot(site.x - o.x, site.y - o.y) <= site.deliverRadius()) {
      site.logs++;
      o.carrying = false;
      o.halt();
      if (site.logs >= HUT_LOGS) {
        site.built = true;
        this.#events.emit('hutBuilt', { hut: site, builder: o });
        o.message = 'cabana pronta!';
      } else {
        o.message = `tora ${site.logs}/${HUT_LOGS}`;
      }
      o.thought = 1.5;
      return { direction: o.heading, desiredSpeed: 0 };
    }
    return this.#locomotion.approach(o, site.x, site.y, site.deliverRadius() - 3);
  }

  #choppable(tree, o) {
    return !tree.stump && !tree.fall && tree.growth >= 1 &&
      (!tree.chopper || tree.chopper === o.id ||
        !this.#state.organisms.some(other => other.id === tree.chopper && other.chop?.tree === tree));
  }

  // Árvore alvo: a que já estava escolhida, se continua de pé; senão a mais perto à
  // vista; senão a mais perto num raio grande — árvore se enxerga de longe.
  #targetTree(o) {
    const trees = this.#state.trees;
    if (o.woodTarget && trees.includes(o.woodTarget) && this.#choppable(o.woodTarget, o)) return o.woodTarget;
    let best = null, bestDistance = Infinity;
    for (const tree of trees) {
      if (!this.#choppable(tree, o)) continue;
      const distance = Math.hypot(tree.x - o.x, tree.y - o.y);
      const seen = this.#perception.inVision(o, tree, 8);
      if (!seen && distance > TREE_LANDMARK_RANGE) continue;
      // Uma árvore à vista vale como se estivesse bem mais perto que uma lembrada.
      const score = seen ? distance : distance + 200;
      if (score < bestDistance) { best = tree; bestDistance = score; }
    }
    o.woodTarget = best;
    return best;
  }

  #chopTick(o, dt) {
    const tree = o.chop.tree;
    if (!this.#state.trees.includes(tree) || tree.stump || tree.fall) { this.stopChop(o); return null; }
    o.heading = Math.atan2(tree.y - o.y, tree.x - o.x);
    const before = o.chop.timer;
    o.chop.timer += dt;
    if (before < CHOP_IMPACT && o.chop.timer >= CHOP_IMPACT) this.#chopHit(o, tree);
    if (o.chop && o.chop.timer >= CHOP_SWING) o.chop.timer -= CHOP_SWING;
    return { direction: o.heading, desiredSpeed: 0 };
  }

  #chopHit(o, tree) {
    tree.health--;
    tree.shake = 1;
    o.energy = Math.max(0, o.energy - ENERGY_PER_SWING);
    this.#state.woodChips.push({ x: tree.x, y: tree.y, dir: o.heading, time: 0, seed: Math.random() * 100 });
    if (tree.health > 0) return;
    // Cai para longe de quem cortou, que é para onde o corte empurra.
    tree.fall = { angle: .04, speed: 0, dir: o.heading, phase: 'falling', timer: 0, landed: false };
    this.stopChop(o);
    o.woodTarget = null;
    o.say('lá vai!', 1.6);
  }
}

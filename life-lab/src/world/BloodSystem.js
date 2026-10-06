import { WORLD } from '../config/world.js';
import {
  WOUND_HEAL, BLEED_DAMAGE, BLEED_DRIP, BLOOD_GRAVITY, BLOOD_DROPS_PER_DAMAGE, BLOOD_STAIN_LIFE,
  BLOOD_POOL_LIFE, BLOOD_POOL_RADIUS, BLOOD_POOL_GROW, BLOOD_MAX_STAINS, BLOOD_MAX_DROPS
} from '../config/combat.js';

// Sangue e ferida: as gotas que saltam do golpe e caem no chão, as manchas que elas
// deixam (e a poça embaixo de quem morreu brigando), a sangria de quem foi cortado e
// as feridas fechando com o tempo. As gotas são só aparência; a sangria tira vida.
export class BloodSystem {
  #state;

  constructor(state, events) {
    this.#state = state;
    events.on('death', ({ organism }) => {
      if (organism.slainBy || organism.bledOut) this.pool(organism.x, organism.y);
    });
  }

  // Jato do golpe: sai do corpo da vítima para o lado em que o golpe empurra.
  splash(victim, direction, damage, height = 9) {
    const count = Math.round(4 + damage * BLOOD_DROPS_PER_DAMAGE);
    for (let i = 0; i < count; i++) {
      const spread = direction + (Math.random() - .5) * 1.6;
      const speed = 25 + Math.random() * 55;
      this.#drop(victim.x, victim.y, height * (victim.size / 10) * (.7 + Math.random() * .5),
        Math.cos(spread) * speed, Math.sin(spread) * speed, 15 + Math.random() * 55);
    }
  }

  // Poça que cresce devagar embaixo do corpo.
  pool(x, y) {
    this.#stain(x, y, BLOOD_POOL_RADIUS * (.8 + Math.random() * .4), BLOOD_POOL_LIFE, BLOOD_POOL_GROW);
  }

  update({ dt }) {
    const state = this.#state;
    for (const o of state.organisms) {
      if (o.wounds > 0) o.wounds = Math.max(0, o.wounds - dt * WOUND_HEAL);
      if (o.bleed <= 0) continue;
      o.bleed = Math.max(0, o.bleed - dt);
      o.life -= BLEED_DAMAGE * dt;
      if (o.life <= 0 && !o.slainBy) o.bledOut = true;
      o.dripTimer -= dt;
      if (o.dripTimer <= 0) {
        o.dripTimer = BLEED_DRIP * (.6 + Math.random() * .8);
        this.#drop(o.x + (Math.random() - .5) * 3, o.y + (Math.random() - .5) * 3, 6 * (o.size / 10),
          (Math.random() - .5) * 8, (Math.random() - .5) * 8, 0);
      }
    }

    for (const drop of state.bloodDrops) {
      drop.vz -= BLOOD_GRAVITY * dt;
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      drop.z += drop.vz * dt;
      if (drop.z <= 0) {
        drop.landed = true;
        this.#stain(drop.x, drop.y, 1 + Math.random() * 1.8, BLOOD_STAIN_LIFE, 0);
      }
    }
    state.bloodDrops = state.bloodDrops.filter(drop => !drop.landed);
    for (const stain of state.bloodStains) stain.time += dt;
    state.bloodStains = state.bloodStains.filter(stain => stain.time < stain.life);
  }

  #drop(x, y, z, vx, vy, vz) {
    const drops = this.#state.bloodDrops;
    if (drops.length >= BLOOD_MAX_DROPS) drops.shift();
    drops.push({ x, y, z, vx, vy, vz, landed: false });
  }

  #stain(x, y, radius, life, grow) {
    if (x < 0 || y < 0 || x > WORLD.width || y > WORLD.height) return;
    const stains = this.#state.bloodStains;
    if (stains.length >= BLOOD_MAX_STAINS) stains.shift();
    stains.push({ x, y, radius, life, grow, time: 0, seed: Math.random() * 100 });
  }
}

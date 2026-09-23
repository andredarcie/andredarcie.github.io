import { WORLD } from '../config/world.js';
import { MOURN_CRY, MOURN_GIVE_UP, MOURN_RING, MOURN_BREAK_NEED } from '../config/social.js';

// Luto: a tribo vem até o corpo, faz roda, chora e vai embora.
export class MourningSystem {
  #state;
  #locomotion;
  #woodcutting;

  constructor({ state, locomotion, woodcutting }) {
    this.#state = state;
    this.#locomotion = locomotion;
    this.#woodcutting = woodcutting;
  }

  // Quem da tribo está acordado e livre larga o que fazia e vai até o corpo. Cada um
  // ganha um lugar numa roda em volta dele, para ninguém se amontoar em cima.
  callMourners(dead, corpse) {
    if (!dead.band) return;
    const mourners = dead.band.members.filter(member => member !== dead && member.life > 0 &&
      !member.asleep && !member.pair && !member.pregnancy?.labor);
    mourners.forEach((member, index) => {
      const angle = index / mourners.length * Math.PI * 2 + corpse.seed;
      const ring = MOURN_RING + (mourners.length > 8 ? 8 : 0);
      this.#woodcutting.stopChop(member);
      member.mourn = {
        corpse, phase: 'go', timer: MOURN_GIVE_UP,
        x: Math.max(12, Math.min(WORLD.width - 12, corpse.x + Math.cos(angle) * ring)),
        y: Math.max(12, Math.min(WORLD.height - 12, corpse.y + Math.sin(angle) * ring))
      };
      member.say(`${dead.name}!`, 1.6);
    });
  }

  // Um tique de luto. Devolve true enquanto o luto comanda o bicho neste tique.
  tick(o, dt) {
    const mourn = o.mourn;
    if (!mourn) return false;
    if (o.hungriest < MOURN_BREAK_NEED || !this.#state.corpses.includes(mourn.corpse)) {
      o.mourn = null;
      o.crying = false;
      return false;
    }
    mourn.timer -= dt;
    const facing = Math.atan2(mourn.corpse.y - o.y, mourn.corpse.x - o.x);
    if (mourn.phase === 'go') {
      const distance = Math.hypot(mourn.x - o.x, mourn.y - o.y);
      if (distance <= 3 || mourn.timer <= 0) {
        // Chegou (ou desistiu de chegar mais perto): chora onde está.
        mourn.phase = 'cry';
        mourn.timer = MOURN_CRY * (.85 + Math.random() * .3);
        o.crying = true;
        o.heading = facing;
        o.halt();
        o.say('buáá', 2.2);
        return true;
      }
      const motion = this.#locomotion.approach(o, mourn.x, mourn.y, 1);
      this.#locomotion.move(o, dt, {
        direction: motion.direction,
        desiredSpeed: Math.max(motion.desiredSpeed, 8) * this.#locomotion.stageSpeed(o)
      });
      return true;
    }
    o.heading = facing;
    o.halt();
    if (mourn.timer <= 0) {
      o.mourn = null;
      o.crying = false;
      o.say('adeus', 1.4);
      o.walkTimer = 0;
    }
    return true;
  }
}

import { WORLD } from '../config/world.js';
import { WALK_SPEED, RUN_SPEED, ACCELERATION, BRAKING, FATIGUE_ENERGY } from '../config/organisms.js';
import { TRIBE_SPACING } from '../config/social.js';
import { CARRY_SPEED } from '../config/settlement.js';

// Como o bicho se move: vira aos poucos, acelera e freia, desvia dos outros e não
// sai do mundo. Os comportamentos só dizem para onde e com que pressa.
export class Locomotion {
  #state;

  constructor(state) {
    this.#state = state;
  }

  move(o, dt, { direction, desiredSpeed }) {
    if (desiredSpeed > 0) {
      let avoidX = 0, avoidY = 0;
      for (const other of this.#state.organisms) {
        if (other === o || (o.pair && (other === o.pair.male || other === o.pair.female))) continue;
        const dx = o.x - other.x, dy = o.y - other.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < 28) {
          const strength = (28 - distance) / 28;
          avoidX += dx / distance * strength;
          avoidY += dy / distance * strength;
        }
      }
      direction = Math.atan2(
        Math.sin(direction) + avoidY * .7,
        Math.cos(direction) + avoidX * .7
      );
      const angle = Math.atan2(Math.sin(direction - o.heading), Math.cos(direction - o.heading));
      const turn = (desiredSpeed > WALK_SPEED ? 4.6 : 3.1) * dt;
      o.heading += Math.max(-turn, Math.min(turn, angle));
      desiredSpeed *= Math.max(.28, 1 - Math.abs(angle) / Math.PI);
    }

    const change = (desiredSpeed > o.speed ? ACCELERATION : BRAKING) * dt;
    o.speed += Math.max(-change, Math.min(change, desiredSpeed - o.speed));
    o.vx = Math.cos(o.heading) * o.speed;
    o.vy = Math.sin(o.heading) * o.speed;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.gait += o.speed * dt * .17;

    const x = Math.max(o.size, Math.min(WORLD.width - o.size, o.x));
    const y = Math.max(o.size, Math.min(WORLD.height - o.size, o.y));
    if (x !== o.x || y !== o.y) {
      o.x = x; o.y = y; o.speed = 0;
      o.wanderHeading = Math.atan2(WORLD.height / 2 - o.y, WORLD.width / 2 - o.x);
    }
  }

  // Ir até um ponto e frear para parar a `arrival` dele, sem passar do ponto.
  approach(o, x, y, arrival) {
    const distance = Math.hypot(x - o.x, y - o.y);
    return {
      direction: Math.atan2(y - o.y, x - o.x),
      desiredSpeed: Math.min(WALK_SPEED * o.pace, Math.sqrt(2 * BRAKING * Math.max(0, distance - arrival)))
    };
  }

  // Multiplicador de passo: filhote e idoso são mais lentos, cansaço encurta a
  // passada e tora no ombro pesa.
  stageSpeed(o) {
    const stage = o.stage === 'infant' ? .62 : o.stage === 'elder' ? .48 : 1;
    const fatigue = o.energy < FATIGUE_ENERGY ? .55 + .45 * o.energy / FATIGUE_ENERGY : 1;
    return stage * fatigue * (o.carrying ? CARRY_SPEED : 1);
  }

  // Seguir um aliado mantendo a distância de bando: aproxima quando longe, se
  // afasta quando colado e, no meio, acompanha o passo dele.
  followMate(o, ally) {
    const dx = ally.x - o.x;
    const dy = ally.y - o.y;
    const distance = Math.hypot(dx, dy);
    if (distance > TRIBE_SPACING + 8) {
      return {
        direction: Math.atan2(dy, dx),
        desiredSpeed: Math.min(RUN_SPEED * .62 * o.pace,
          Math.max(WALK_SPEED * .82 * o.pace, ally.speed + (distance - TRIBE_SPACING) * .36))
      };
    }
    if (distance < TRIBE_SPACING - 10) {
      return {
        direction: Math.atan2(-dy, -dx),
        desiredSpeed: WALK_SPEED * .42 * o.pace
      };
    }
    return {
      direction: ally.heading,
      desiredSpeed: Math.min(WALK_SPEED * o.pace, ally.speed * .92)
    };
  }
}

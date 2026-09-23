import { WORLD } from '../config/world.js';
import { WALK_SPEED } from '../config/organisms.js';

// O passeio de quem não tem nada para fazer: anda, para, muda de rumo aos poucos, e
// de noite anda mais devagar e descansa mais. Perto da borda, vira para dentro.
export class Wandering {
  #state;

  constructor(state) {
    this.#state = state;
  }

  // `activity` vai de .5 (noite) a 1 (dia).
  stroll(o, dt, activity) {
    const elapsed = this.#state.elapsed;
    // Parado, o rumo é o de antes do sorteio: o novo só vale quando voltar a andar.
    const heading = o.wanderHeading;
    if (o.restTimer > 0) {
      o.restTimer -= dt;
      return { direction: heading, desiredSpeed: 0 };
    }
    o.walkTimer -= dt;
    if (o.walkTimer <= 0) {
      o.restTimer = (.25 + Math.random() * .8) * (3 - 2 * activity);
      o.walkTimer = 1.1 + Math.random() * 2.1;
      o.wanderHeading += (Math.random() - .5) * 1.6;
      return { direction: heading, desiredSpeed: 0 };
    }
    o.wanderHeading += Math.sin(elapsed * .75 + o.wanderPhase) * .48 * dt;
    return {
      direction: o.wanderHeading,
      desiredSpeed: WALK_SPEED * o.pace * activity *
        (.82 + .18 * Math.sin(elapsed * 1.3 + o.wanderPhase))
    };
  }

  // Perto da borda do mundo o rumo é puxado para dentro.
  steerInside(o, motion) {
    const margin = 35;
    const inwardX = o.x < margin ? margin - o.x : o.x > WORLD.width - margin ? WORLD.width - margin - o.x : 0;
    const inwardY = o.y < margin ? margin - o.y : o.y > WORLD.height - margin ? WORLD.height - margin - o.y : 0;
    if (!inwardX && !inwardY) return motion;
    const direction = Math.atan2(Math.sin(motion.direction) + inwardY / margin * 2,
      Math.cos(motion.direction) + inwardX / margin * 2);
    o.wanderHeading = direction;
    const desiredSpeed = o.restTimer <= 0 ? Math.max(motion.desiredSpeed, WALK_SPEED * .7) : motion.desiredSpeed;
    return { direction, desiredSpeed };
  }
}

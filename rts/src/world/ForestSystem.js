import { WORLD } from '../config/world.js';
import {
  CHOP_HITS, TREE_FALL_GRAVITY, TREE_DOWN_TIME, LOGS_PER_TREE, TREE_REGROW_DAYS, TREE_GROW_DAYS
} from '../config/settlement.js';
import { Log } from '../entities/Log.js';

// A vida das árvores depois do machado: a queda com física, as toras que ficam no
// chão, o toco que rebrota e a muda que cresce. Também envelhece os efeitos de corte
// (lascas e poeira), que só existem para serem desenhados.
export class ForestSystem {
  #state;

  constructor(state) {
    this.#state = state;
  }

  update({ dt, days }) {
    const state = this.#state;
    for (const tree of state.trees) {
      tree.shake = Math.max(0, tree.shake - dt * 2.5);
      const fall = tree.fall;
      if (fall) {
        if (fall.phase === 'falling') {
          fall.speed += TREE_FALL_GRAVITY * Math.sin(fall.angle) * dt;
          fall.angle += fall.speed * dt;
          if (fall.angle >= Math.PI / 2) {
            fall.angle = Math.PI / 2;
            if (!fall.landed) {
              fall.landed = true;
              state.fallDust.push({ x: tree.x, y: tree.y, dir: fall.dir, time: 0 });
            }
            // Quica um pouco na copa e assenta.
            if (fall.speed > .35) fall.speed = -fall.speed * .18;
            else { fall.phase = 'down'; fall.speed = 0; }
          }
        } else {
          fall.timer += dt;
          if (fall.timer >= TREE_DOWN_TIME) {
            this.#spawnLogs(tree);
            tree.fall = null;
            tree.stump = true;
            tree.stumpAge = 0;
            tree.chopper = null;
          }
        }
      } else if (tree.stump) {
        tree.stumpAge += days;
        if (tree.stumpAge >= TREE_REGROW_DAYS) {
          tree.stump = false;
          tree.growth = 0;
          tree.health = CHOP_HITS;
        }
      } else if (tree.growth < 1) {
        tree.growth = Math.min(1, tree.growth + days / TREE_GROW_DAYS);
      }
    }
    for (const chip of state.woodChips) chip.time += dt;
    state.woodChips = state.woodChips.filter(chip => chip.time < .7);
    for (const dust of state.fallDust) dust.time += dt;
    state.fallDust = state.fallDust.filter(dust => dust.time < 1.6);
  }

  // Tora solta no chão onde alguém a largou (morreu carregando).
  dropLog(x, y, angle) {
    this.#state.logs.push(new Log({ x, y, angle, seed: Math.random() * 100 }));
  }

  takeLog(log) {
    this.#state.logs = this.#state.logs.filter(item => item !== log);
  }

  // O tronco caído vira toras deitadas ao longo de onde ele tombou.
  #spawnLogs(tree) {
    const dx = Math.cos(tree.fall.dir), dy = Math.sin(tree.fall.dir);
    for (let i = 0; i < LOGS_PER_TREE; i++) {
      const along = 6 + i * 7.5, side = (Math.random() - .5) * 3;
      this.#state.logs.push(new Log({
        x: Math.max(8, Math.min(WORLD.width - 8, tree.x + dx * along - dy * side)),
        y: Math.max(8, Math.min(WORLD.height - 8, tree.y + dy * along + dx * side)),
        angle: tree.fall.dir + (Math.random() - .5) * .35,
        seed: Math.random() * 100
      }));
    }
  }
}

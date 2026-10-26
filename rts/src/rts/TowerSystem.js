import { TOWER, HILL_REACH, SNARE, TEXT } from '../config/rts.js';
import { hillAt } from '../world/Hills.js';

// Altura de onde a bala sai (o atirador agachado atrás do parapeito, ou de pé no
// jirau) e onde ela acerta (o peito de quem leva), em unidades da cena.
const LAUNCH_HEIGHT = 9;
const RANGE_LAUNCH_BONUS = 9;
const HIT_HEIGHT = 8;

// As trincheiras do arraial: cada uma escolhe o soldado mais adiantado dentro do
// alcance (o que está mais perto da igreja), atira no ritmo dela e a bala voa até
// ele. Com carga de bacamarte, o tiro espalha e pega também quem está do lado.
export class TowerSystem {
  #state;
  #units;
  #ledger;
  #events;

  constructor({ state, units, ledger, events }) {
    this.#state = state;
    this.#units = units;
    this.#ledger = ledger;
    this.#events = events;
  }

  // O que a trincheira faz agora, pelos níveis das melhorias (a Igreja Nova tem os
  // números dela). Do alto do morro, o tiro vai mais longe.
  static stats(tower) {
    const turret = tower.stats.turret;
    const range = (turret ? turret.range : TOWER.range[tower.levels.range]) * (hillAt(tower.x, tower.y) ? HILL_REACH : 1);
    return {
      range: Math.round(range),
      damage: turret ? turret.damage : TOWER.damage[tower.levels.power],
      interval: turret ? turret.interval : TOWER.interval,
      // Na cerca dos tupinambás o terceiro nível é a rede de madeira (UnitSystem), não carga
      // que espalha.
      scatter: !turret && !SNARE && tower.levels.scatter > 0
    };
  }

  update({ dt }) {
    const state = this.#state;
    if (state.winner) return;
    const hall = this.#ledger.hall();
    for (const tower of state.buildings) {
      if (!tower.shoots || !tower.built) continue;
      tower.cooldown = Math.max(0, tower.cooldown - dt);
      const stats = TowerSystem.stats(tower);
      const target = this.#pick(tower, stats.range, hall);
      tower.target = target;
      if (!target) continue;
      tower.aim = Math.atan2(target.y - tower.y, target.x - tower.x);
      if (tower.cooldown > 0) continue;
      tower.cooldown = stats.interval;
      this.#shoot(tower, target, stats);
    }
    this.#fly(dt);
    for (const spark of state.sparks) spark.time += dt;
    state.sparks = state.sparks.filter(spark => spark.time < spark.life);
  }

  // Fica no mesmo alvo enquanto ele estiver ao alcance; senão, o mais adiantado.
  #pick(tower, range, hall) {
    // Canoa vazia encalhada não vale flecha.
    const inRange = u => u.life > 0 && !(u.stats.boat && !u.crew?.length) && Math.hypot(u.x - tower.x, u.y - tower.y) <= range;
    if (tower.target && this.#state.organisms.includes(tower.target) && inRange(tower.target)) return tower.target;
    let best = null, bestScore = Infinity;
    for (const u of this.#state.organisms) {
      if (u.team === tower.team || !inRange(u)) continue;
      const score = hall ? Math.hypot(u.x - hall.x, u.y - hall.y) : 0;
      if (score < bestScore) { best = u; bestScore = score; }
    }
    return best;
  }

  #shoot(tower, target, stats) {
    // Da Igreja Nova o tiro sai do alto das torres.
    const z = tower.stats.turret ? 36 : LAUNCH_HEIGHT + tower.levels.range * RANGE_LAUNCH_BONUS;
    this.#state.projectiles.push({
      x: tower.x, y: tower.y, z, px: tower.x, py: tower.y, pz: z,
      target, tx: target.x, ty: target.y,
      damage: stats.damage, scatter: stats.scatter, team: tower.team, time: 0,
      // Da cerca sai flecha: voa em arco (EffectsLayer) e não faz fumaça.
      arrow: Boolean(SNARE), total: Math.hypot(target.x - tower.x, target.y - tower.y), lift: 0, plift: 0
    });
    // Fumaça da pólvora negra na boca da arma.
    if (!SNARE) this.#state.shots.push({ x: tower.x, y: tower.y, z, tx: tower.x, ty: tower.y, tz: z, puffOnly: true, time: 0, life: 1 });
    this.#events.emit('towerShot', { scatter: stats.scatter, x: tower.x, y: tower.y });
  }

  // Bala até o peito do alvo; se ele morreu no caminho, ela se perde onde ele estava.
  #fly(dt) {
    const state = this.#state;
    const step = TOWER.bulletSpeed * dt;
    for (const p of state.projectiles) {
      const alive = p.target.life > 0 && state.organisms.includes(p.target);
      if (alive) {
        p.tx = p.target.x;
        p.ty = p.target.y;
      }
      p.px = p.x; p.py = p.y; p.pz = p.z;
      p.plift = p.lift;
      p.time += dt;
      const dx = p.tx - p.x, dy = p.ty - p.y, dz = (alive ? HIT_HEIGHT : 0) - p.z;
      const distance = Math.hypot(dx, dy, dz);
      if (distance <= step) {
        p.done = true;
        if (alive) this.#hit(p);
        continue;
      }
      p.x += dx / distance * step;
      p.y += dy / distance * step;
      p.z += dz / distance * step;
      // A curva da flecha: sobe e desce ao longo do caminho (só no desenho).
      if (p.arrow && p.total > 0) {
        const left = Math.hypot(p.tx - p.x, p.ty - p.y);
        p.lift = Math.sin(Math.PI * Math.max(0, Math.min(1, 1 - left / p.total))) * Math.min(22, p.total * .14);
      }
      if (p.time > 3) p.done = true;
    }
    state.projectiles = state.projectiles.filter(p => !p.done);
  }

  #hit(p) {
    const target = p.target;
    const direction = Math.atan2(target.y - p.py, target.x - p.px);
    const damage = p.damage * (.9 + Math.random() * .2);
    this.#units.wound(target, damage, direction, { by: TEXT.towerHit, weapon: p.arrow ? 'arrow' : 'bullet' });
    if (!p.scatter) return;
    this.#state.sparks.push({ x: target.x, y: target.y, time: 0, life: .45, radius: TOWER.splash, kind: 'scatter' });
    // A carga espalha: parte do dano em quem está colado no alvo.
    for (const other of this.#state.organisms) {
      if (other === target || other.team === p.team || other.life <= 0) continue;
      const distance = Math.hypot(other.x - target.x, other.y - target.y);
      if (distance > TOWER.splash) continue;
      this.#units.wound(other, damage * TOWER.splashShare, Math.atan2(other.y - target.y, other.x - target.x),
        { by: TEXT.splashHit, weapon: 'bullet' });
    }
  }
}

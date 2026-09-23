import { TRIBE_CALL_RANGE, TRIBE_LOOSE_DISTANCE } from '../config/social.js';
import { Band } from '../entities/Band.js';

// Os bandos: quem está ligado a quem, por tabela, e onde fica o centro de cada bando.
export class BandFormation {
  #state;

  constructor(state) {
    this.#state = state;
  }

  update() {
    this.regroup();
  }

  // Uma tribo é tudo que está ligado por amizade, direta ou por tabela: com dois
  // vínculos por bicho os grupos viram correntes, e é a corrente inteira que veste
  // igual e anda junto, não só o par que acabou de se conhecer. Refeito a cada
  // tique porque o centro do bando muda junto com quem se move.
  regroup() {
    const organisms = this.#state.organisms;
    const living = new Map(organisms.map(o => [o.id, o]));
    for (const o of organisms) o.band = null;
    const seen = new Set();
    for (const start of organisms) {
      if (seen.has(start.id) || !start.tribe.length) continue;
      const members = [], queue = [start];
      seen.add(start.id);
      while (queue.length) {
        const current = queue.shift();
        members.push(current);
        for (const id of current.tribe) {
          if (seen.has(id)) continue;
          const mate = living.get(id);
          if (!mate) continue;
          seen.add(id);
          queue.push(mate);
        }
      }
      if (members.length < 2) continue;
      const band = new Band(members);
      for (const member of members) member.band = band;
    }
  }

  // Puxada na direção do centro do bando, devolvida como mistura e não como modo:
  // o bicho continua caçando comida, explorando ou fugindo, só que sem se soltar do
  // grupo. Fora do alcance do chamado devolve nada, e aí ele está perdido mesmo.
  cohesionFor(o) {
    if (!o.band) return null;
    const dx = o.band.x - o.x, dy = o.band.y - o.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= TRIBE_LOOSE_DISTANCE || distance > TRIBE_CALL_RANGE) return null;
    const strain = (distance - TRIBE_LOOSE_DISTANCE) / (TRIBE_CALL_RANGE - TRIBE_LOOSE_DISTANCE);
    return {
      direction: Math.atan2(dy, dx),
      weight: .35 + strain * 1.5,
      urgency: Math.min(1, .35 + strain)
    };
  }
}

import {
  SOCIAL_CONTACT_DISTANCE, SOCIAL_BOND_DURATION, SOCIAL_BOND_DECAY, MAX_TRIBE_BONDS,
  TRIBE_FOLLOW_RANGE, OUTFIT_COLORS
} from '../config/social.js';

// Amizade e tribo: convivência vira vínculo, o bando veste o mesmo uniforme (com
// nome próprio), e membros se guiam uns pelos outros.
export class TribeSystem {
  #state;
  #perception;
  #names;
  #bands;

  constructor({ state, perception, tribeNames, bands }) {
    this.#state = state;
    this.#perception = perception;
    this.#names = tribeNames;
    this.#bands = bands;
  }

  sameTribe(a, b) {
    return a.tribe.includes(b.id);
  }

  update({ dt }) {
    const state = this.#state;
    const organisms = state.organisms;
    const living = new Map(organisms.map(o => [o.id, o]));
    for (const o of organisms) {
      o.tribe = o.tribe.filter(id => id !== o.id && living.has(id));
    }
    for (const [key, bond] of state.socialBonds) {
      if (!living.has(bond.aId) || !living.has(bond.bId)) state.socialBonds.delete(key);
    }

    for (let i = 0; i < organisms.length; i++) {
      for (let j = i + 1; j < organisms.length; j++) {
        const a = organisms[i], b = organisms[j];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance < 18 && Math.random() < dt * .12) state.encounters++;
        if (this.sameTribe(a, b)) continue;

        const key = TribeSystem.#bondKey(a, b);
        let bond = state.socialBonds.get(key);
        const pairedTogether = a.pair && a.pair === b.pair;
        const canBond = a.tribe.length < MAX_TRIBE_BONDS && b.tribe.length < MAX_TRIBE_BONDS;
        if (distance <= SOCIAL_CONTACT_DISTANCE && !pairedTogether && canBond) {
          if (!bond) {
            bond = { aId: a.id, bId: b.id, value: 0 };
            state.socialBonds.set(key, bond);
          }
          bond.value += dt;
          if (bond.value >= SOCIAL_BOND_DURATION) this.#join(a, b);
        } else if (bond) {
          bond.value -= dt * SOCIAL_BOND_DECAY;
          if (bond.value <= 0 || !canBond) state.socialBonds.delete(key);
        }
      }
    }
  }

  // Aliado visível que já achou o recurso que este procura: vale segui-lo.
  resourceGuide(o, need) {
    return this.#closestVisibleMate(o, ally =>
      !ally.pair && !ally.pregnancy?.labor && !ally.asleep && ally.need === need && Boolean(ally.target));
  }

  // Aliado visível para seguir em formação quando não há nada para fazer.
  formationGuide(o) {
    return this.#closestVisibleMate(o, ally =>
      ally.id < o.id && !ally.pair && !ally.pregnancy?.labor && !ally.asleep);
  }

  #closestVisibleMate(o, predicate) {
    let closest = null, closestDistance = Infinity;
    for (const mateId of o.tribe) {
      const ally = this.#state.organisms.find(candidate => candidate.id === mateId);
      if (!ally || ally.life <= 0 || !this.#perception.inVision(o, ally) || !predicate(ally)) continue;
      const distance = Math.hypot(ally.x - o.x, ally.y - o.y);
      if (distance <= TRIBE_FOLLOW_RANGE && distance < closestDistance) {
        closest = ally;
        closestDistance = distance;
      }
    }
    return closest;
  }

  #join(a, b) {
    if (this.sameTribe(a, b) || a.tribe.length >= MAX_TRIBE_BONDS || b.tribe.length >= MAX_TRIBE_BONDS) return;
    a.tribe.push(b.id);
    b.tribe.push(a.id);
    this.#state.socialBonds.delete(TribeSystem.#bondKey(a, b));
    // Refaz os bandos antes de vestir: o vínculo acabou de nascer e o grupo do a
    // ainda não inclui o b nem a tribo que vinha junto com ele.
    this.#bands.regroup();
    this.#dress(a);
    // Quem entra anuncia o nome da tribo em que acabou de entrar.
    for (const o of [a, b]) o.say(this.#names.nameOf(o.outfit) || 'tribo!', 2.2);
  }

  // A cor é sorteada uma vez, quando nasce a amizade. Se um dos lados já vestia
  // alguma, a mais usada no grupo vence e o outro lado troca de roupa — senão, ao
  // juntar dois bandos, o mesmo grupo ficaria com duas cores.
  #dress(member) {
    const group = member.band ? member.band.members : [member];
    const worn = new Map();
    for (const o of group) {
      if (o.outfit) worn.set(o.outfit, (worn.get(o.outfit) || 0) + 1);
    }
    let outfit = null, most = 0;
    for (const [color, count] of worn) {
      if (count > most) { outfit = color; most = count; }
    }
    if (!outfit) {
      // Tribo nova: cor que nenhuma tribo viva está usando, para duas tribos nunca
      // se confundirem; só se todas estiverem em uso é que uma repete. E nasce com
      // nome novo, mesmo que a cor já tenha sido de uma tribo que acabou.
      const inUse = new Set(this.#state.organisms.map(o => o.outfit).filter(Boolean));
      const free = OUTFIT_COLORS.filter(color => !inUse.has(color));
      const pool = free.length ? free : OUTFIT_COLORS;
      outfit = pool[Math.floor(Math.random() * pool.length)];
      const name = this.#names.christen(outfit);
      for (const o of group) o.say(name, 2.2);
    }
    for (const o of group) o.outfit = outfit;
  }

  static #bondKey(a, b) {
    return a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
  }
}

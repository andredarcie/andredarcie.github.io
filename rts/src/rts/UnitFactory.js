import { UNIT_TYPES, LOOKS, CLOTH, SKIN_TONES } from '../config/rts.js';
import { Unit } from '../entities/Unit.js';

const pick = list => list[Math.floor(Math.random() * list.length)];

// Cria as unidades e veste cada uma. No arraial, cada sertanejo sai com a roupa
// sorteada entre os algodões e riscados do sertão — homem de chapéu de palha ou de
// couro, mulher de saia comprida e lenço —; o jagunço com chapéu de couro (e gibão
// ou cartucheira, conforme a arma); o Conselheiro de camisolão azul, barba e bordão.
// Na tropa, todo soldado sai igual: fardado.
export class UnitFactory {
  #state;

  constructor(state) {
    this.#state = state;
  }

  // `hpScale` e `power`: o soldado de onda avançada vem mais duro e bate mais forte.
  create(teamId, type, x, y, heading = Math.random() * Math.PI * 2, { hpScale = 1, power = 1 } = {}) {
    const stats = UNIT_TYPES[type];
    const base = LOOKS[stats.look] ?? LOOKS.villager;
    const sex = base.kind === 'villager' && Math.random() < .5 ? 'female' : 'male';
    const { look, outfit, trousers } = UnitFactory.#dress(base, sex, stats);
    return new Unit({
      id: this.#state.newId(),
      team: teamId,
      type,
      stats,
      x, y, heading,
      sex,
      color: base.skin ?? pick(SKIN_TONES),
      outfit, trousers, look, hpScale, power
    });
  }

  static #dress(base, sex, stats) {
    if (base.kind === 'villager') {
      if (sex === 'female') {
        const dress = pick(CLOTH.dresses);
        return {
          outfit: pick(CLOTH.shirts), trousers: dress,
          look: { hat: 'scarf', hatColor: pick(CLOTH.scarves), skirt: dress }
        };
      }
      const leather = Math.random() < .4;
      return {
        outfit: pick(CLOTH.shirts), trousers: pick(CLOTH.trousers),
        look: { hat: leather ? 'leather' : 'straw', hatColor: leather ? CLOTH.leather : CLOTH.straw }
      };
    }
    if (base.army) {
      const officer = base.hat === 'officer';
      return {
        outfit: CLOTH.armyTunic, trousers: officer ? CLOTH.armyTunic : CLOTH.armyTrousers,
        look: {
          ...base, hatColor: CLOTH.armyKepi, bandColor: officer ? CLOTH.officerBand : CLOTH.armyBand,
          belt: CLOTH.belt, stripeColor: CLOTH.armyStripe, cannon: Boolean(stats.cannon) && !base.bigCannon
        }
      };
    }
    if (base.tunic) {
      return { outfit: CLOTH.tunic, trousers: CLOTH.tunic, look: { ...base, shirt: CLOTH.tunic, hair: '#5a5048' } };
    }
    // Jagunço (e os chefes): roupa do sertão, chapéu de couro ou de palha; o gibão é
    // de couro também.
    return {
      outfit: pick(CLOTH.shirts), trousers: pick(CLOTH.trousers),
      look: { ...base, hatColor: base.hat === 'straw' ? CLOTH.straw : CLOTH.leather, gibao: base.gibao ? '#8a5a34' : null }
    };
  }
}

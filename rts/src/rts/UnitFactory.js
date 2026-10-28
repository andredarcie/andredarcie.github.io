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
    const sex = base.sex ?? (base.kind === 'villager' && Math.random() < .5 ? 'female' : 'male');
    const skin = base.skin ?? pick(base.skins ?? SKIN_TONES);
    const { look, outfit, trousers } = base.tupi ? UnitFactory.#paint(base, sex, skin)
      : base.palmares || base.troop ? UnitFactory.#palmares(base, sex, skin, stats)
      : UnitFactory.#dress(base, sex, stats);
    return new Unit({
      id: this.#state.newId(),
      team: teamId,
      type,
      stats,
      x, y, heading,
      sex,
      color: skin,
      outfit, trousers, look, hpScale, power
    });
  }

  // Na aldeia tupinambá ninguém se veste ("andaõ nũs sem cobertura alguã", Gândavo):
  // o boneco fica da cor da pele e o traje é pintura e pena. Cada morador sai com os
  // seus lavores de jenipapo sorteados; a moça com o cabelo comprido, os tapacurás
  // vermelhos abaixo do joelho e contas ao pescoço (Soares, cap. CLIII); o homem com o
  // cabelo aparado e a testa rapada e, muitas vezes, a pedra no beiço (cap. CLIV).
  static #paint(base, sex, skin) {
    const female = sex === 'female';
    const villager = base.kind === 'villager';
    const paint = base.paint ?? pick(female ? ['legs', 'quartered', 'stripes'] : ['stripes', 'legs', 'quartered', 'none']);
    const look = {
      ...base, tupi: true, skin, paint,
      paintColor: CLOTH.jenipapo, red: CLOTH.urucum,
      featherColor: base.enemy ? (Math.random() < .5 ? CLOTH.featherRed : CLOTH.featherBrown) : CLOTH.featherYellow,
      rheaColor: CLOTH.rhea,
      hair: female ? 'long' : 'crop',
      hairColor: base.grey ? CLOTH.greyHair : CLOTH.hair,
      tembeta: !female && (base.tembeta || (villager && Math.random() < .55)) ? (Math.random() < .7 ? CLOTH.greenStone : CLOTH.bone) : null,
      necklace: base.necklace || (villager && female) || (villager && Math.random() < .3) ? CLOTH.shell : null,
      tapacura: female && !base.grey ? CLOTH.tapacura : null
    };
    return { outfit: null, trousers: null, look };
  }

  // Nos Palmares (missão de 1644–1694): "O modo de vestir entre si é o mesmo que
  // observam entre nós. Mais ou menos enroupados conforme as possibilidades" (Relação
  // das guerras feitas aos Palmares); "as suas roupas são quase tôdas de entrecasca de
  // árvores e pouca chita" (diário de Blaer, 1645). O homem de calção de entrecasca e,
  // às vezes, camisa de chita (sem ela, o tronco nu); a mulher de saia e pano na
  // cabeça. Descalços: os documentos não falam de calçado, e o jogo não inventa um.
  // A tropa: camisa e calção de pano, chapéu de feltro, o correame e, nas costas, a
  // mochila do capote e da rede; o capitão de gibão.
  static #palmares(base, sex, skin, stats) {
    if (base.troop) {
      const officer = Boolean(base.officer);
      return {
        outfit: officer ? CLOTH.officerCoat : pick(CLOTH.troopShirts), trousers: pick(CLOTH.troopBreeches),
        look: {
          ...base, hat: 'leather', hatColor: CLOTH.felt, belt: CLOTH.belt,
          gibao: officer ? CLOTH.leather : null, cannon: Boolean(stats.cannon)
        }
      };
    }
    const female = sex === 'female';
    const cloth = pick(Math.random() < .3 ? CLOTH.chita : CLOTH.entrecasca);
    if (base.robe) {
      return { outfit: CLOTH.linen, trousers: CLOTH.linen, look: { ...base, tunic: true, shirt: CLOTH.linen, barefoot: true, skin } };
    }
    if (female) {
      return {
        outfit: Math.random() < .4 ? pick(CLOTH.chita) : skin, trousers: cloth,
        look: { ...base, skirt: cloth, hat: Math.random() < .6 ? 'scarf' : null, hatColor: pick(CLOTH.chita), barefoot: true, skin }
      };
    }
    const shirt = base.shirt || (base.kind === 'villager' && Math.random() < .25);
    return {
      outfit: shirt ? pick(CLOTH.chita) : skin, trousers: cloth,
      look: { ...base, gibao: base.gibao ? CLOTH.leather : null, barefoot: true, skin }
    };
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

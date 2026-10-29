// O cenário de cada missão: o tamanho do lugar (`size`, o lado do tabuleiro), as
// estradas (só a boca na beirada; o resto é calculado em config/rts.js), os morros,
// o rio, a enseada (`coast`, só no litoral) e o raio do chão aberto em volta do
// meio. Cada missão tem o seu; sem entrada aqui, ela usaria o cenário da era
// (missions/<era>.js e world/BiomeMap.js). Só depende da URL, para poder ser lido por
// config/world.js, config/rts.js e o BiomeMap sem dar volta nos imports.
//
// O tempo também passa no mesmo lugar (Canudos de 1893, de março e de julho de 1897):
//   `ponds`: quantas poças (a seca, as chuvas); `dry`: sem chuva nenhuma;
//   `stumps`: { radius, share } — a mata cortada em volta do meio (só tocos);
//   `ruins`: escombros (toras e pedras) onde houve casa; `fires`: os que ainda ardem.
//
// O meio do tabuleiro é sempre o lugar da missão: a casa do meio, o povoado inimigo
// ou a aldeia contrária; as estradas todas dão nele. Tudo é escrito em frações do
// lado (0 a 1) e convertido para o tamanho daquela missão.
import { MISSION, STAGE } from './mission.js';

// Um cenário de lado `size`: `p(u, v)` é um ponto, `line([[u, v], ...])` uma polilinha
// de rio e `r(f)` um comprimento — tudo em frações do lado.
function place(size, build) {
  const p = (u, v) => ({ x: Math.round(u * size), y: Math.round(v * size) });
  const line = points => points.map(([u, v]) => [Math.round(u * size), Math.round(v * size)]);
  const r = f => Math.round(f * size);
  return { size, ...build({ p, line, r }) };
}

// O Vaza-Barris como Euclides o descreve (world/BiomeMap.js): vem do oeste-sudoeste,
// passa ao sul do arraial — entre a praça e a Favela —, sobe pelo leste e sai para
// o leste. O mesmo traçado, em frações, serve aos três cenários do arraial.
const VAZA_BARRIS = [[0, .8], [.134, .78], [.262, .754], [.366, .72], [.5, .746], [.616, .72], [.701, .634],
  [.744, .5], [.713, .372], [.646, .293], [.744, .244], [.872, .217], [1, .201]];

const BUILDERS = {
  canudos: {
    // 1893: a tapera de "cinqüenta capuabas" à beira do Vaza-Barris, com a igreja
    // velha no meio e, no alto de um esporão da Favela, "a antiga vivenda senhoril, em
    // ruínas" (Os Sertões, O Homem, V). Lugar pequeno; só três caminhos, e a romaria
    // chega pelo sul.
    1: () => place(760, ({ p, line, r }) => ({
      roads: [
        { id: 'montesanto', short: 'MSA', label: 'Monte Santo', mouth: p(.5, 1) },
        { id: 'uaua', short: 'UAU', label: 'Uauá', mouth: p(.5, 0) },
        { id: 'jeremoabo', short: 'JER', label: 'Jeremoabo', mouth: p(1, .5) }
      ],
      hills: [{ id: 'favela', label: 'Morro da Favela', ...p(.72, .88), radius: r(.11), height: 34 }],
      river: line(VAZA_BARRIS),
      // A tapera "em plena decadência": "tajupares em abandono; vazios os pousos", e no
      // esporão da Favela "a antiga vivenda senhoril, em ruínas" (O Homem, V). A
      // caatinga ainda chega perto, e ninguém cortou nada.
      ruins: [[.4, .41], [.6, .42], [.43, .61], [.59, .6], [.35, .52], [.7, .83]],
      ponds: 4,
      openRadius: r(.24)
    })),
    // Uauá, 21 de novembro de 1896: "duas ruas desembocando numa praça irregular",
    // "agrupamento desgracioso de cerca de cem casas", no meio da várzea, onde chegam
    // "quatro estradas que, a partir de Jeremoabo passando em Canudos, de Monte Santo,
    // de Juazeiro e Patamuté" (A Luta, II). Lugarejo: o menor dos tabuleiros. Sem rio e
    // sem morro; a caatinga fechada logo depois da várzea.
    2: () => place(600, ({ p, r }) => ({
      roads: [
        { id: 'juazeiro', short: 'JUA', label: 'Juazeiro', mouth: p(.5, 0) },
        { id: 'patamute', short: 'PAT', label: 'Patamuté', mouth: p(0, .4) },
        { id: 'montesanto', short: 'MSA', label: 'Monte Santo', mouth: p(.2, 1) },
        { id: 'canudos', short: 'CAN', label: 'Canudos', mouth: p(1, .85) }
      ],
      hills: [],
      river: [],
      quixabeiras: null,
      openRadius: r(.27)
    })),
    // 3 de março de 1897: o campo inteiro da batalha. O arraial no meio, o rio
    // abarcando-o, o "morro dos Pelados, [que] termina de chofre em barranca a prumo
    // sobre o rio", onde ficou a artilharia; a Favela ao sul; e o Alto do Mário, para
    // onde a tropa recuou de noite (Expedição Moreira César, V e VI).
    3: () => place(960, ({ p, line, r }) => ({
      hills: [
        { id: 'favela', label: 'Morro da Favela', ...p(.68, .88), radius: r(.11), height: 50 },
        { id: 'pelados', label: 'Morro dos Pelados', ...p(.82, .56), radius: r(.075), height: 42 },
        { id: 'mario', label: 'Alto do Mário', ...p(.55, .92), radius: r(.06), height: 30 }
      ],
      river: line(VAZA_BARRIS),
      quixabeiras: [.57, .8],
      // Março, com "a vinda recente das chuvas" (Expedição Moreira César, II): água
      // nas poças. O arraial de milhares de casas já cortou parte da caatinga em volta.
      ponds: 6,
      stumps: { radius: r(.3), share: .35 },
      openRadius: r(.3)
    })),
    // Junho e julho de 1897: a 4ª expedição. A Favela enorme, de frente para o arraial,
    // onde a tropa ficou presa, e a estrada de Monte Santo comprida, por onde vinha o
    // comboio. O maior dos cenários de Canudos.
    4: () => place(1100, ({ p, line, r }) => ({
      hills: [
        { id: 'favela', label: 'Morro da Favela', ...p(.71, .87), radius: r(.15), height: 68 },
        { id: 'mario', label: 'Alto do Mário', ...p(.52, .93), radius: r(.06), height: 30 }
      ],
      river: line(VAZA_BARRIS),
      quixabeiras: [.58, .79],
      // Julho, na seca: o rio "cortado em cacimbas", nenhuma chuva; a caatinga em volta
      // cortada quase toda para lenha e trincheira; casas derrubadas pelo canhoneio da
      // Favela, algumas ainda queimando.
      ponds: 1,
      dry: true,
      stumps: { radius: r(.36), share: .75 },
      ruins: [[.42, .43], [.57, .4], [.6, .57], [.39, .58], [.47, .64], [.55, .36]],
      fires: [[.42, .43], [.6, .57], [.47, .64]],
      openRadius: r(.34)
    }))
  },
  palmares: {
    // 1645, o Palmares Grande de Blaer: "meia milha de comprido", "a rua, larga duma
    // braça, corria de oeste para leste e, do lado norte, ficava um grande alagadiço"
    // — aqui o córrego largo ao norte. Os holandeses chegaram "à porta ocidental"; o
    // rei morava numa roça "duas milhas" adiante, a leste.
    1: () => place(880, ({ p, line, r }) => ({
      roads: [
        { id: 'alagoas', short: 'ALA', label: 'Alagoas', mouth: p(0, .54) },
        { id: 'roca', short: 'ROÇ', label: 'Roças do rei', mouth: p(1, .68) }
      ],
      hills: [],
      river: line([[0, .3], [.2, .27], [.36, .31], [.54, .28], [.72, .31], [.88, .26], [1, .28]]),
      openRadius: r(.2)
    })),
    // As prêsas: o mocambo na encosta da serra, a oeste, e o caminho longo, mata
    // adentro, até o Mundaú e o engenho do outro lado — a casa-grande e a senzala.
    2: () => place(1040, ({ p, line, r }) => ({
      roads: [
        { id: 'serra', short: 'SER', label: 'Serra', mouth: p(0, .5) },
        { id: 'engenho', short: 'ENG', label: 'Engenho', mouth: p(1, .3) }
      ],
      hills: [{ id: 'barriga', label: 'Serra da Barriga', ...p(.26, .5), radius: r(.2), height: 46 }],
      river: line([[.68, 0], [.66, .18], [.69, .38], [.665, .58], [.69, .78], [.67, 1]]),
      openRadius: r(.16)
    })),
    // Subupira, 1677: "uma grande cidade muito fortificada na distância de três montes",
    // "entre os ribeiros Paraibinha e Satuba" (Carneiro). Os três morros em volta, o
    // Satuba a oeste; Fernão Carrilho vem de Porto Calvo, a nordeste.
    3: () => place(860, ({ p, line, r }) => ({
      roads: [
        { id: 'portocalvo', short: 'PCA', label: 'Porto Calvo', mouth: p(1, .3) },
        { id: 'alagoas', short: 'ALA', label: 'Alagoas', mouth: p(.6, 1) }
      ],
      hills: [
        { id: 'monte1', label: 'Morro', ...p(.34, .36), radius: r(.11), height: 40 },
        { id: 'monte2', label: 'Morro', ...p(.66, .37), radius: r(.1), height: 36 },
        { id: 'monte3', label: 'Morro', ...p(.48, .68), radius: r(.1), height: 38 }
      ],
      river: line([[.2, 0], [.22, .23], [.18, .49], [.215, .74], [.185, 1]]),
      openRadius: r(.2)
    })),
    // A cerca do Macaco em 1694, "no cume da . . . Serra [do Barriga], lugar forte por
    // natureza, e com água perene dentro" (Domingos Jorge Velho): a serra ocupa quase o
    // tabuleiro inteiro, o maior de todos, com o topo achatado onde fica a cerca; o
    // Mundaú corre lá embaixo, a leste, no pé da encosta.
    4: () => place(1180, ({ p, line, r }) => ({
      hills: [{ id: 'barriga', label: 'Serra da Barriga', ...p(.5, .5), radius: r(.41), height: 72 }],
      river: line([[.93, 0], [.915, .22], [.94, .44], [.915, .68], [.945, .88], [.93, 1]]),
      openRadius: r(.22)
    }))
  },
  tupinamba: {
    // A aldeia nova: "busca sempre um sítio alto e desabafado dos ventos, para que lhe
    // lave as casas, e que tenha a água muito perto" (Soares, cap. CLI). Um alto no
    // meio, o rio a leste e a enseada ao sul; a gente vem da aldeia velha, a oeste.
    1: () => place(820, ({ p, line, r }) => ({
      hills: [
        { id: 'alto', label: 'Alto da aldeia nova', ...p(.5, .49), radius: r(.18), height: 22 },
        { id: 'morro', label: 'Morro', ...p(.26, .26), radius: r(.1), height: 44 }
      ],
      river: line([[.73, 0], [.72, .11], [.75, .22], [.725, .33], [.755, .44], [.73, .56], [.77, .67], [.79, .82]]),
      coast: { bay: r(.83), headland: r(.07) },
      openRadius: r(.2)
    })),
    // A aldeia tupiniquim do salto: menor, no meio das roças, com o mar chegando perto
    // numa enseada funda e aberta, o morro a nordeste e o rio a oeste, entre ela e a
    // trilha da costa, por onde se vem e se volta.
    2: () => place(700, ({ p, line, r }) => ({
      hills: [{ id: 'morro', label: 'Morro', ...p(.76, .26), radius: r(.12), height: 42 }],
      river: line([[.3, 0], [.28, .17], [.32, .35], [.285, .52], [.31, .7]]),
      coast: { bay: r(.79), headland: r(.17) },
      openRadius: r(.24)
    })),
    // A caiçá "ao longo da água" (Soares, cap. CLXIX): um trecho estreito de rio, no
    // meio da mata, que desce até uma nesga de mar lá no fundo.
    3: () => place(660, ({ p, line, r }) => ({
      roads: [
        { id: 'casa', short: 'CAS', label: 'Trilha de casa', mouth: p(0, .52) },
        { id: 'serra', short: 'SER', label: 'Trilha da serra', mouth: p(.68, 0) },
        { id: 'rio', short: 'RIO', label: 'Trilha do rio', mouth: p(1, .4) },
        // A praia no fundo da enseada (config/rts.js a desce até a linha d'água).
        { id: 'praia', short: 'MAR', label: 'Praia', sea: true, mouth: p(.5, .9) }
      ],
      hills: [{ id: 'morro', label: 'Morro', ...p(.82, .2), radius: r(.12), height: 40 }],
      river: line([[.55, 0], [.525, .2], [.555, .4], [.52, .6], [.55, .8], [.535, .95]]),
      coast: { bay: r(.91), headland: r(.03) },
      openRadius: r(.17)
    })),
    // A aldeia cercada: a maior das aldeias, com a mata em volta que dá madeira às
    // caiçás dos contrários, dois morros ao norte, o rio a leste e uma enseada larga de
    // pontas altas, de onde chegam as igaras.
    4: () => place(940, ({ p, line, r }) => ({
      hills: [
        { id: 'morro', label: 'Morro', ...p(.24, .23), radius: r(.09), height: 44 },
        { id: 'morro2', label: 'Morro', ...p(.76, .2), radius: r(.08), height: 36 }
      ],
      river: line([[.72, 0], [.71, .14], [.74, .3], [.715, .46], [.745, .6], [.72, .76]]),
      coast: { bay: r(.8), headland: r(.1) },
      openRadius: r(.26)
    }))
  }
};

export const MAP = Object.freeze(BUILDERS[MISSION]?.[STAGE]?.() ?? null);

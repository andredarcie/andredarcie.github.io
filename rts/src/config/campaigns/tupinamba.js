// A campanha dos tupinambás (antes de 1500), em 4 missões que seguem o que os
// cronistas contam da guerra entre as aldeias: a aldeia e as espias (tutorial), o
// ataque ao romper do dia, a vingança dos tupiniquins pelas trilhas e pelo mar
// (defesa em ondas) e a grande guerra, com o socorro das aldeias vizinhas. Fecha com
// a chegada dos portugueses, em 1500.
//
// As cenas são personagens conversando (ui/Cutscene.js): `lines` são as falas, cada
// uma de quem (`who`) e, se ele está no mapa, de que unidade (`unit`: tipo ou marca).
// Antes de 1500 não sobrou fala registrada de ninguém: todas são imaginadas a partir
// do que contam Gabriel Soares, Gândavo e Caminha (citados na narração, copiados do
// texto integral), e a cena avisa isso.
import { near, around, MIDDLE } from './places.js';

const SOARES = chapter => `Gabriel Soares de Sousa, <cite>Tratado descritivo do Brasil em 1587</cite> · cap. ${chapter}`;
const GANDAVO = 'Pero de Magalhães Gândavo, <cite>Tractado da terra do Brasil</cite> (c. 1570)';
const CAMINHA = 'Pero Vaz de Caminha, <cite>Carta a El-Rei D. Manuel</cite> (1500)';

// A aldeia já crescida das missões de depois.
const ALDEIA = [
  { kind: 'house', ...around(250, 150) }, { kind: 'house', ...around(290, 150) },
  { kind: 'camp', ...around(200, 150) }, { kind: 'moquem', ...around(20, 170) }
];
// As aldeias dos tupiniquins: a da serra, a noroeste, e a do outro lado do rio.
const SERRA = { x: 290, y: 105 };
const RIO = { x: 720, y: 240 };
const aldeiaSerra = tag => [
  { kind: 'hall', ...SERRA, tag }, { kind: 'house', x: 215, y: 90, tag }, { kind: 'house', x: 350, y: 75, tag },
  { kind: 'house', x: 240, y: 170, tag }, { kind: 'tower', x: 330, y: 165, tag: 'cerca' }, { kind: 'tower', x: 190, y: 135, tag: 'cerca' }
];
const aldeiaRio = tag => [
  { kind: 'hall', ...RIO, tag }, { kind: 'house', x: 670, y: 165, tag }, { kind: 'house', x: 785, y: 195, tag },
  { kind: 'house', x: 770, y: 315, tag }, { kind: 'tower', x: 655, y: 300, tag: 'cerca' }, { kind: 'tower', x: 715, y: 325, tag: 'cerca' }
];

export const CAMPAIGN = Object.freeze([
  {
    number: 1, title: 'A aldeia', year: 'antes de 1500', kind: 'rts', tutorial: true,
    summary: 'Uma aldeia tupinambá se ergue entre a mata e o mar. Aprenda a colher, construir e preparar os guerreiros.',
    start: { food: 60, wood: 90, rifles: 20, hall: true, workers: 6, preacher: true },
    build: ['tower', 'house', 'moquem', 'camp'], train: ['warrior', 'rifleman'],
    sequential: true,
    objectives: [
      { type: 'gather', resource: 'wood', amount: 150, text: 'Junte 150 de madeira',
        hint: 'Toque num morador e depois numa árvore da mata. Para escolher vários, segure e arraste.' },
      { type: 'gather', resource: 'food', amount: 120, text: 'Junte 120 de comida',
        hint: 'Mande moradores a uma roça de mandioca. Eles levam a colheita até a casa do principal.' },
      { type: 'build', kind: 'house', count: 1, text: 'Erga uma oca',
        hint: 'Com um morador escolhido, toque em "Oca" no painel de baixo e depois no chão.' },
      { type: 'build', kind: 'camp', count: 1, text: 'Acenda o fogo do conselho',
        hint: 'No fogo do conselho se decide a guerra e se preparam os guerreiros.' },
      { type: 'units', unit: 'army', count: 3, text: 'Prepare três guerreiros',
        hint: 'Toque no fogo do conselho e escolha guerreiros de tacape ou flecheiros.',
        then: [
          { spawnEnemy: [{ type: 'private', count: 2, from: 'costa', tag: 'espias' }, { type: 'bayonet', count: 2, from: 'costa', tag: 'espias' }] },
          { toast: 'Espias tupiniquins na trilha da costa!', focus: 'costa' }
        ] },
      { type: 'kill', tag: 'espias', text: 'Derrote as espias tupiniquins',
        hint: 'Escolha os guerreiros e toque num contrário para atacar. Parados no mato, eles ficam de tocaia.' }
    ],
    lose: { hall: true },
    defeat: { hall: 'A casa do principal caiu.' },
    story: ['aldeia'],
    intro: [
      { at: MIDDLE, zoom: 1.4, kicker: 'Litoral do Rio de Janeiro · antes de 1500', title: 'A aldeia',
        text: 'No litoral entre a Guanabara e Ubatuba, os tupinambás viviam em aldeias de poucas casas, mas enormes: cada oca, coberta de folhas de palmeira, abrigava várias famílias. Em volta, as roças de mandioca, a mata, o rio e o mar.',
        quote: { text: 'faz o principal sua casa muito comprida, coberta da palma, a que os índios chamam pindoba, e as outras casas da aldeia se fazem também muito compridas e arrumadas, de maneira que lhes fica no meio um terreiro quadrado, onde fazem bailes e os seus ajuntamentos', cite: SOARES('CLI') },
        lines: [
          { who: 'Morador', unit: 'worker', text: 'A mata tem madeira boa, e o rio está perto.' },
          { who: 'Pajé', unit: 'paje', text: 'Ergam as ocas em volta do terreiro. E abram as roças antes da chuva.' }
        ] },
      { at: near('costa', 280), zoom: 1.3, kicker: 'Os contrários', title: 'Os tupiniquins',
        text: 'Mais ao sul viviam os tupiniquins: a mesma língua, as mesmas casas, as mesmas armas. Entre as aldeias de um lado e do outro, a guerra passava de pai para filho.',
        quote: { text: 'E ainda que são contrários os tupiniquins dos tupinambás, não há entre eles na língua e costumes mais diferença da que têm os moradores de Lisboa dos da Beira', cite: SOARES('XXXIX') },
        lines: [
          { who: 'Morador', unit: 'worker', text: 'Vi pegadas na trilha da costa.' },
          { who: 'Pajé', unit: 'paje', text: 'Os contrários mandam espias. Que os guerreiros fiquem prontos.' }
        ] }
    ],
    outro: [
      { at: near('costa', 200), zoom: 1.5, kicker: 'A trilha da costa', title: 'As espias',
        text: 'As espias não voltaram para a aldeia delas. Morte pede vingança: no terreiro, o conselho decide a guerra.',
        quote: { text: 'Estes indios saõ mui bellicosos e tem sempre grandes gerras hũs contra os outros nunca se acha nelles paz nẽ he possiuel auer antrelles amizade porque huãs nasçoẽs pellejaõ contra outras e mataõse muitos delles, e assy vai creçendo o odio cada vez mais e ficaõ imigos verdadeiros perpetuamente.', cite: GANDAVO },
        lines: [
          { who: 'Guerreiro', unit: 'warrior', text: 'As espias caíram na trilha. Nenhuma voltou.' },
          { who: 'Pajé', unit: 'paje', text: 'Os parentes delas vão querer vingança. Agora o conselho decide a guerra.' }
        ] }
    ]
  },
  {
    number: 2, title: 'Ao romper do dia', year: 'antes de 1500', kind: 'rts',
    summary: 'Os guerreiros caem de madrugada sobre a aldeia tupiniquim da serra. Derrube a casa do principal e as ocas.',
    start: { food: 150, wood: 200, rifles: 40, hall: true, workers: 5, preacher: true,
      units: [['warrior', 6], ['rifleman', 4], ['spearman', 2]], buildings: ALDEIA },
    build: null, train: null,
    enemy: {
      buildings: aldeiaSerra('aldeia'),
      guards: [
        { type: 'bayonet', count: 5, x: 285, y: 140, spread: 45, tag: 'serra' },
        { type: 'private', count: 4, x: 285, y: 120, spread: 45, tag: 'serra' },
        { type: 'officer', count: 1, x: 290, y: 140, spread: 0, tag: 'chefe' }
      ]
    },
    raids: [
      { from: 'serra', at: 120, every: 150, roster: [['bayonet', 2], ['private', 2]], grow: .2, text: 'Guerreiros tupiniquins descem a trilha da serra' }
    ],
    objectives: [
      { type: 'destroy', tag: 'aldeia', text: 'Derrube a casa do principal e as ocas tupiniquins',
        hint: 'Junte os guerreiros e toque numa oca para atacar. Os flecheiros dão conta dos defensores; a cerca de seteiras flecha quem chega perto.' }
    ],
    lose: { hall: true },
    defeat: { hall: 'A casa do principal caiu.' },
    story: ['madrugada'],
    intro: [
      { at: MIDDLE, zoom: 1.5, kicker: 'O terreiro', title: 'O conselho decide a guerra',
        text: 'Os guerreiros partem em fila, com os arcos, as flechas, a farinha de guerra e as redes às costas, e mandam espias à frente. Perto da aldeia inimiga, não acendem mais fogo, para a fumaça não os denunciar.',
        lines: [
          { who: 'Guerreiro de tacape', unit: 'warrior', text: 'Partimos de noite, pelo luar. Ninguém acende fogo daqui em diante.' },
          { who: 'Flecheiro', unit: 'rifleman', text: 'Quando clarear, estaremos em cima da aldeia deles.' }
        ] },
      { at: SERRA, zoom: 1.6, kicker: 'A aldeia da serra', title: 'Ao romper do dia',
        text: 'O ataque vem de madrugada, de surpresa, com gritos, buzinas e tambores.',
        quote: { text: 'ordenam-se de maneira que possam dar nos contrários de madrugada, e em conjunção de lua cheia para andarem a derradeira jornada de noite pelo luar, e tomarem seus contrários despercebidos e descuidados; e em chegando à aldeia dão todos juntos tamanho urro, gritando, que fazem com isso e com suas buzinas e tamboris grande espanto', cite: SOARES('CLXVIII') },
        lines: [
          { who: 'Principal tupiniquim', unit: 'chefe', text: 'A noite está quieta. Quem vigia a trilha?' },
          { who: 'Guerreiro tupiniquim', unit: 'serra', text: 'Ninguém viu nada, principal. Só o mato e o luar.' }
        ] }
    ],
    outro: [
      { at: SERRA, zoom: 1.5, kicker: 'A aldeia da serra', title: 'Os cativos',
        text: 'Nem todo contrário morria na luta: muitos eram levados vivos para a aldeia, onde viviam meses até o dia de uma grande festa no terreiro. Não era fome: era o ponto alto da vingança. E a guerra continuava.',
        quote: { text: 'a qual se não come por mantimento, senão por vingança', cite: SOARES('CLXXIV') },
        lines: [
          { who: 'Guerreiro de tacape', unit: 'warrior', text: 'A aldeia da serra arde. Levamos cativos.' },
          { who: 'Pajé', unit: 'paje', text: 'Os parentes deles vão vir. Pelas trilhas, e pelo mar.' }
        ] }
    ]
  },
  {
    number: 3, title: 'Pelas trilhas e pelo mar', year: 'antes de 1500', kind: 'defense',
    summary: 'Os tupiniquins vêm vingar os seus, pelas trilhas e em igaras pelo mar. Defenda a aldeia por seis ataques.',
    start: { food: 200, wood: 300, rifles: 40, hall: true, workers: 6, preacher: true,
      units: [['warrior', 3], ['rifleman', 3]],
      buildings: [...ALDEIA, { kind: 'tower', ...near('serra', 140, 40) }, { kind: 'tower', ...near('praia', 120, 40) }] },
    build: null, train: null,
    waves: { count: 6, offset: 1 },
    objectives: [
      { type: 'waves', count: 6, text: 'Resista a 6 ataques tupiniquins',
        hint: 'Erga cercas de seteiras na beira das trilhas e da praia. As flechas que os contrários erram ficam no chão: apanhe e leve à casa do principal.' }
    ],
    lose: { hall: true },
    defeat: { hall: 'A casa do principal caiu.' },
    story: ['tupiniquins'],
    intro: [
      { at: near('praia', 220), zoom: 1.4, kicker: 'A enseada', title: 'As igaras',
        text: 'A vingança não demora. Os tupiniquins vêm pelas trilhas da mata e pelo mar, nas canoas de guerra cavadas num tronco só.',
        quote: { text: 'são grandes remadores, assim nas suas canoas, que fazem de um só pau, que remam em pé vinte e trinta índios, com o que as fazem voar', cite: SOARES('CLX') },
        lines: [
          { who: 'Flecheiro', unit: 'rifleman', text: 'Igaras na enseada! Muitas, cheias de guerreiros!' },
          { who: 'Pajé', unit: 'paje', text: 'Todos para a cerca. Flecheiros nas seteiras.' }
        ] },
      { at: MIDDLE, zoom: 1.6, kicker: 'Aldeia em lugar de guerra', title: 'A cerca de pau a pique',
        text: 'Aldeia de frente para os contrários se fechava com uma cerca de troncos, com portas e seteiras por onde se flechava quem chegasse.',
        quote: { text: 'faz este gentio de roda da aldeia uma cerca de pau a pique muito forte, com suas portas e seteiras', cite: SOARES('CLI') },
        lines: [
          { who: 'Guerreiro de tacape', unit: 'warrior', text: 'E as flechas que eles errarem?' },
          { who: 'Pajé', unit: 'paje', text: 'As velhas apanham no chão e trazem de volta. Nenhuma se perde.' }
        ] }
    ],
    outro: [
      { at: MIDDLE, zoom: 1.4, kicker: 'Depois do último ataque', title: 'Os contrários recuam',
        text: 'Os tupiniquins voltaram às suas aldeias — e foram pedir ajuda às vizinhas. A próxima guerra seria maior, e a aldeia também mandou chamar os seus aliados.',
        quote: { text: 'Em cada aldeia dos tupinambás há um principal, a que seguem somente na guerra onde lhe dão alguma obediência, pela confiança que têm em seu esforço e experiência', cite: SOARES('CLI') },
        lines: [
          { who: 'Pajé', unit: 'paje', text: 'Recuaram. Mas vão chamar a aldeia do outro lado do rio.' },
          { who: 'Guerreiro de tacape', unit: 'warrior', text: 'Então chamamos os nossos também.' }
        ] }
    ]
  },
  {
    number: 4, title: 'O socorro dos vizinhos', year: 'antes de 1500', kind: 'rts',
    summary: 'Duas aldeias tupiniquins se juntam contra você, por terra e pelo mar. Com os aliados, derrube as duas e o principal delas.',
    start: { food: 250, wood: 350, rifles: 60, hall: true, workers: 6, preacher: true, heroes: ['principal', 'matador', 'velha'],
      units: [['warrior', 6], ['rifleman', 6], ['spearman', 3]],
      buildings: [...ALDEIA, { kind: 'tower', ...near('serra', 140, 40) }, { kind: 'tower', ...near('rio', 140, -40) },
        { kind: 'tower', ...near('praia', 120, 40) }] },
    build: null, train: null,
    enemy: {
      buildings: [...aldeiaSerra('serra'), ...aldeiaRio('rio')],
      guards: [
        { type: 'bayonet', count: 6, x: 285, y: 140, spread: 50, tag: 'serra' },
        { type: 'private', count: 5, x: 285, y: 120, spread: 50, tag: 'serra' },
        { type: 'officer', count: 1, x: 290, y: 140, spread: 0, tag: 'serra' },
        { type: 'bayonet', count: 6, x: 715, y: 270, spread: 50, tag: 'rio' },
        { type: 'private', count: 5, x: 720, y: 250, spread: 50, tag: 'rio' },
        { type: 'gunner', count: 2, x: 715, y: 280, spread: 30, tag: 'rio' },
        { type: 'officer', count: 1, x: 720, y: 270, spread: 0, tag: 'chefe' }
      ]
    },
    raids: [
      { from: 'serra', at: 90, every: 120, roster: [['bayonet', 3], ['private', 2], ['gunner', 1]], grow: .15, text: 'Guerreiros descem a trilha da serra' },
      { from: 'rio', at: 160, every: 140, roster: [['bayonet', 2], ['private', 3]], grow: .15, text: 'Guerreiros atravessam o rio' },
      { from: 'praia', at: 240, every: 200, roster: [['bayonet', 3], ['private', 3]], grow: .1, text: 'Igaras tupiniquins na enseada!' }
    ],
    objectives: [
      { type: 'destroy', tag: 'serra', text: 'Derrube a aldeia tupiniquim da serra',
        hint: 'Não deixe a aldeia sem defesa: os contrários atacam pela serra, pelo rio e pelo mar.' },
      { type: 'destroy', tag: 'rio', text: 'Derrube a aldeia do outro lado do rio',
        hint: 'O rio é raso: dá para passar a vau.' },
      { type: 'kill', tag: 'chefe', text: 'Derrube o principal tupiniquim',
        hint: 'Morto o principal, os de perto fogem.' }
    ],
    lose: { hall: true },
    defeat: { hall: 'A casa do principal caiu.' },
    story: ['principal'],
    intro: [
      { at: RIO, zoom: 1.4, kicker: 'O socorro', title: 'As aldeias se juntam',
        text: 'Os tupiniquins da serra pediram socorro à aldeia do outro lado do rio, e ela veio. A aldeia tupinambá também chamou os seus.',
        quote: { text: 'mandar pedir socorro a seus vizinhos, e lho veem logo dar com muita presteza', cite: SOARES('CLXIX') },
        lines: [
          { who: 'Principal tupiniquim', unit: 'chefe', text: 'A aldeia da serra é nossa parente. Vamos vingar os que eles levaram.' }
        ] },
      { at: MIDDLE, zoom: 1.8, kicker: 'A aldeia tupinambá', title: 'Os aliados',
        lines: [
          { who: 'Principal aliado', unit: 'principal', text: 'Viemos ao socorro, como se faz entre parentes. Os guerreiros que lutarem perto de mim não vão recuar.' },
          { who: 'Matador de muitos nomes', unit: 'matador', text: 'Cada contrário que eu derrubar me dá mais um nome.' },
          { who: 'Velha curandeira', unit: 'velha', text: 'Tragam os feridos para perto de mim. Tenho as ervas da mata.' }
        ] }
    ],
    outro: [
      { at: near('praia', 230), zoom: 1.3, kicker: 'Porto Seguro · abril de 1500', title: 'O que veio pelo mar',
        text: 'Em abril de 1500, a armada de Pedro Álvares Cabral chegou à costa da Bahia. O que veio depois foi o fim deste mundo: o ferro, o comércio de pau-brasil, a escravidão e as epidemias. Hoje vivem no Brasil povos que descendem desta gente, como os Tupinambá de Olivença, na Bahia, e os Tupiniquim, no Espírito Santo.',
        quote: { text: 'Nem há aqui boi ou vaca, cabra, ovelha ou galinha, ou qualquer outro animal que esteja acostumado ao viver do homem.', cite: CAMINHA } }
    ]
  }
]);

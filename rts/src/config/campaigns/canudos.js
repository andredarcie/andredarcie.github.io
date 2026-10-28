// A campanha de Canudos (1893–1897), em 4 missões que seguem a guerra: a fundação de
// Belo Monte (tutorial), o ataque em Uauá contra a 1ª expedição (no cenário do
// povoado, config/maps.js), a defesa contra a 3ª expedição (Moreira César) e o cerco
// da 4ª, com os comboios de Monte Santo.
//
// As cenas são personagens conversando (ui/Cutscene.js): `lines` são as falas, cada
// uma de quem (`who`) e, se ele está no mapa, de que unidade (`unit`: tipo ou marca),
// para a câmera ir até ele. As falas com `cite` foram registradas na época (copiadas
// do texto integral de Os Sertões); as outras são imaginadas a partir do que os
// documentos contam, e a cena avisa isso. O texto de narração conta a história em
// linguagem de hoje.
import { near, around, MIDDLE } from './places.js';

const EUCLIDES = part => `Euclides da Cunha, <cite>Os Sertões</cite> · ${part}`;

// O arraial já crescido das missões de depois: casas, curral, acampamento.
const ARRAIAL = [
  { kind: 'house', ...around(250, 150) }, { kind: 'house', ...around(290, 150) },
  { kind: 'house', ...around(20, 165) }, { kind: 'house', ...around(160, 165) },
  { kind: 'curral', ...around(70, 175) }, { kind: 'camp', ...around(200, 150) }
];
const FAVELA = { x: 600, y: 690 };
// Uauá: o acampamento da tropa no meio do povoado; os sertanejos chegam do sul.
const UAUA = { x: 410, y: 330 };

export const CAMPAIGN = Object.freeze([
  {
    number: 1, title: 'Belo Monte', year: '1893', kind: 'rts', tutorial: true,
    summary: 'O Conselheiro e os seus erguem o arraial à beira do Vaza-Barris. Aprenda a colher, construir e armar os jagunços.',
    start: { food: 60, wood: 90, rifles: 5, hall: true, workers: 6, preacher: true },
    build: ['tower', 'house', 'curral', 'camp'], train: ['warrior', 'spearman'],
    sequential: true,
    objectives: [
      { type: 'gather', resource: 'wood', amount: 150, text: 'Junte 150 de madeira',
        hint: 'Toque num sertanejo e depois numa árvore da caatinga. Para escolher vários, segure e arraste.' },
      { type: 'gather', resource: 'food', amount: 120, text: 'Junte 120 de comida',
        hint: 'Mande sertanejos a uma roça de milho e mandioca. Eles levam a colheita até a igreja.' },
      { type: 'build', kind: 'house', count: 1, text: 'Erga uma casa de taipa',
        hint: 'Com um sertanejo escolhido, toque em "Casa de taipa" no painel de baixo e depois no chão.' },
      { type: 'build', kind: 'curral', count: 1, text: 'Erga o curral de cabras',
        hint: 'O curral dá comida sozinho, sem ninguém colhendo.' },
      { type: 'build', kind: 'camp', count: 1, text: 'Erga o acampamento',
        hint: 'É no acampamento que se armam os jagunços.' },
      { type: 'units', unit: 'army', count: 2, text: 'Arme dois jagunços',
        hint: 'Toque no acampamento e escolha jagunços. Cada um leva um fuzil: você tem poucos.',
        then: [
          { spawnEnemy: [{ type: 'private', count: 3, from: 'montesanto', tag: 'policia' }, { type: 'bayonet', count: 1, from: 'montesanto', tag: 'policia' }] },
          { toast: 'Uma força da polícia vem pela estrada de Monte Santo!', focus: 'montesanto' }
        ] },
      { type: 'kill', tag: 'policia', text: 'Repila a força da polícia',
        hint: 'Escolha os jagunços e toque num soldado para atacar. Parados na caatinga, eles ficam de tocaia.' }
    ],
    lose: { hall: true },
    defeat: { hall: 'A igreja caiu antes de o arraial crescer.' },
    story: ['canudos'],
    intro: [
      { at: MIDDLE, zoom: 1.4, kicker: 'Sertão da Bahia · 1893', title: 'Belo Monte',
        text: 'Em 1893, Antônio Conselheiro e milhares de seguidores se fixaram numa fazenda abandonada à beira do rio Vaza-Barris. Deram ao lugar o nome de Belo Monte. O povo o chamava de Canudos.',
        quote: { text: 'Canudos, velha fazenda de gado à beira do Vaza-Barris, era, em 1890, uma tapera de cerca de cinqüenta capuabas de pau-a-pique.', cite: EUCLIDES('O Homem') },
        lines: [
          { who: 'Sertanejo', unit: 'worker', text: 'Conselheiro, aqui só tem tapera velha e o rio.' },
          { who: 'Antônio Conselheiro', unit: 'conselheiro', text: 'Pois aqui vai ser Belo Monte. Quem chegar, trabalha e reza, e o que se colher se divide.' },
          { who: 'Sertanejo', unit: 'worker', text: 'Então é cortar a lenha e levantar as casas.' }
        ] },
      { at: MIDDLE, zoom: 2.2, kicker: 'O beato', title: 'Antônio Conselheiro',
        text: 'Havia mais de vinte anos ele andava pelos sertões pregando e erguendo igrejas e açudes com o povo que o seguia. Não pegava em armas.',
        quote: { text: 'E surgia na Bahia o anacoreta sombrio, cabelos crescidos até aos ombros, barba inculta e longa; face escaveirada; olhar fulgurante; monstruoso, dentro de um hábito azul de brim americano; abordoado ao clássico bastão em que se apóia o passo tardo dos peregrinos...', cite: EUCLIDES('O Homem') } },
      { at: near('montesanto', 260), zoom: 1.3, kicker: 'Masseté · 1893', title: 'A polícia',
        text: 'No caminho até Belo Monte, uma força da polícia da Bahia foi atrás do Conselheiro e foi repelida em Masseté. O arraial sabia que outras viriam.',
        lines: [
          { who: 'Sertanejo', unit: 'worker', text: 'E se a polícia voltar?' },
          { who: 'Antônio Conselheiro', unit: 'conselheiro', text: 'Arme quem souber se defender. Mas primeiro, as casas e a comida.' }
        ] }
    ],
    outro: [
      { at: MIDDLE, zoom: 1.5, kicker: 'Belo Monte · 1893–1896', title: 'O arraial cresce',
        text: 'Em poucos anos Belo Monte virou uma das maiores povoações da Bahia, com milhares de casas de taipa. Chegavam vaqueiros, lavradores sem terra, gente que tinha sido escravizada até 1888. A República, proclamada em 1889, passou a ver no arraial uma ameaça.',
        quote: { text: 'O sertanejo é, antes de tudo, um forte.', cite: EUCLIDES('O Homem') },
        lines: [
          { who: 'Jagunço', unit: 'warrior', text: 'A polícia voltou correndo pela estrada.' },
          { who: 'Sertanejo', unit: 'worker', text: 'E chega gente nova todo dia, de todo canto do sertão.' }
        ] }
    ]
  },
  {
    number: 2, title: 'Uauá', year: '21 de novembro de 1896', kind: 'rts',
    summary: 'De madrugada, os jagunços atacam a tropa da 1ª expedição acampada no povoado de Uauá. Sem vila: só os homens que você leva.',
    start: { food: 0, wood: 0, rifles: 0, hall: false, at: { x: 410, y: 650 },
      units: [['warrior', 8], ['spearman', 5], ['rifleman', 5]] },
    build: [], train: [],
    enemy: {
      buildings: [
        { kind: 'barraca', x: 360, y: 300, tag: 'acampamento' }, { kind: 'barraca', x: 452, y: 292, tag: 'acampamento' },
        { kind: 'barraca', x: 368, y: 372, tag: 'acampamento' }, { kind: 'barraca', x: 456, y: 368, tag: 'acampamento' }
      ],
      guards: [
        { type: 'private', count: 14, x: UAUA.x, y: UAUA.y, spread: 80, tag: 'tropa' },
        { type: 'bayonet', count: 5, x: UAUA.x, y: UAUA.y + 50, spread: 40, tag: 'tropa' },
        { type: 'officer', count: 1, x: UAUA.x, y: UAUA.y - 5, spread: 0, tag: 'tenente' }
      ]
    },
    objectives: [
      { type: 'kill', tag: 'tropa', count: 13, text: 'Faça a tropa recuar: derrube 13 soldados',
        hint: 'Avance pela caatinga, não pela estrada: no mato a tropa enxerga mal e anda devagar. Os atiradores de longe, os de facão e chuço para o corpo a corpo.',
        then: [{ flee: true }, { toast: 'A tropa de Pires Ferreira larga Uauá e volta para Juazeiro!' }] }
    ],
    lose: { wiped: true },
    defeat: { wiped: 'Os jagunços caíram em Uauá.' },
    story: ['uaua'],
    intro: [
      { at: UAUA, zoom: 1.6, kicker: 'Uauá · 20 de novembro de 1896', title: 'A primeira expedição',
        text: 'Uma encomenda de madeira para a igreja nova de Belo Monte foi paga e não entregue em Juazeiro. Correu o boato de que os conselheiristas viriam buscá-la à força. O governo da Bahia mandou o tenente Pires Ferreira com pouco mais de cem soldados, e a tropa acampou em Uauá, no caminho de Canudos.',
        lines: [
          { who: 'Sentinela', unit: 'tropa', text: 'Tenente, o povo daqui diz que os de Canudos vêm aí.' },
          { who: 'Tenente Pires Ferreira', unit: 'tenente', text: 'Que venham. Amanhã cedo seguimos para o arraial.' }
        ] },
      { at: { x: 410, y: 640 }, zoom: 1.7, kicker: 'Uauá · madrugada de 21 de novembro', title: 'A procissão',
        text: 'Antes do sol, os sertanejos chegaram como numa procissão, com cruzes, estandartes e rezas — e atacaram.',
        quote: { text: 'A multidão guerreira avançava para Uauá, derivando à toada vagarosa dos kyries, rezando.', cite: EUCLIDES('A Luta') },
        lines: [
          { who: 'Jagunço', unit: 'warrior', text: 'A tropa ainda dorme. Vamos pela caatinga, até em cima deles.' },
          { who: 'Atirador', unit: 'rifleman', text: 'Levem as cruzes. Vamos rezando até o povoado.' }
        ] }
    ],
    outro: [
      { at: UAUA, zoom: 1.4, kicker: 'Uauá · 21 de novembro de 1896', title: 'A tropa volta',
        text: 'Depois de horas de luta, os soldados, exaustos e sem condições de seguir, voltaram para Juazeiro. Em janeiro de 1897 veio a segunda expedição, do major Febrônio de Brito, barrada na serra do Cambaio. A República mandaria uma terceira, maior.',
        lines: [
          { who: 'Jagunço', unit: 'warrior', text: 'Correram para Juazeiro!' },
          { who: 'Atirador', unit: 'rifleman', text: 'Voltam. E da próxima vez com mais gente.' }
        ] }
    ]
  },
  {
    number: 3, title: 'A terceira expedição', year: 'março de 1897', kind: 'defense',
    summary: 'O coronel Moreira César marcha sobre Belo Monte com artilharia. Defenda a igreja por quatro ondas.',
    start: { food: 220, wood: 300, rifles: 6, hall: true, workers: 6, preacher: true,
      units: [['warrior', 3], ['rifleman', 3], ['spearman', 2]],
      buildings: [...ARRAIAL,
        { kind: 'tower', ...near('montesanto', 140, 40) }, { kind: 'tower', ...near('uaua', 140, -40) },
        { kind: 'tower', ...near('cambaio', 140, 40) }] },
    build: null, train: null,
    waves: { count: 4, offset: 4, kicker: '3ª expedição · Cel. Moreira César', matadeira: false },
    objectives: [
      { type: 'waves', count: 4, text: 'Resista às 4 ondas da 3ª expedição',
        hint: 'Cave trincheiras na beira das estradas. Oficial abatido põe os soldados em debandada, largando os fuzis.' }
    ],
    lose: { hall: true },
    defeat: { hall: 'A igreja de Santo Antônio caiu.' },
    intro: [
      { at: near('montesanto', 300), zoom: 1.3, kicker: 'Monte Santo · fevereiro de 1897', title: 'Moreira César',
        text: 'Depois de duas expedições derrotadas, a República mandou o coronel Antônio Moreira César, com mais de mil soldados e canhões Krupp. Ele marchou depressa, para tomar o arraial de assalto.',
        lines: [
          { who: 'Coronel Moreira César', text: 'Nada de cerco. Entramos no arraial de uma vez.' },
          { who: 'Um oficial', text: 'A tropa está cansada da marcha, coronel.' },
          { who: 'Coronel Moreira César', text: 'Descansa em Canudos.' }
        ] },
      { at: MIDDLE, zoom: 1.6, kicker: 'Belo Monte · 3 de março de 1897', title: 'O assalto',
        text: 'A tropa desceu sobre o arraial em colunas. Nas vielas estreitas entre as casas de taipa, a artilharia não servia de muito: cada casa era uma trincheira.',
        lines: [
          { who: 'Jagunço', unit: 'warrior', text: 'Lá vêm eles, pelas estradas todas!' },
          { who: 'Antônio Conselheiro', unit: 'conselheiro', text: 'Defendam a igreja. Quem cair ferido, tragam para perto de mim.' }
        ] }
    ],
    outro: [
      { at: MIDDLE, zoom: 1.4, kicker: 'Belo Monte · 4 de março de 1897', title: 'A debandada',
        text: 'Moreira César foi ferido de morte no assalto. Sem o comandante, a tropa fugiu em desordem, largando armas e munição pelo caminho — os fuzis Mannlicher que os jagunços usariam até o fim. O país inteiro se assustou, e a República preparou a quarta expedição.',
        lines: [
          { who: 'Jagunço', unit: 'warrior', text: 'O coronel caiu! Estão fugindo e largando os fuzis!' },
          { who: 'Sertanejo', unit: 'worker', text: 'Juntem as armas. Eles voltam com mais gente.' }
        ] }
    ]
  },
  {
    number: 4, title: 'A Favela', year: 'junho a outubro de 1897', kind: 'rts',
    summary: 'A 4ª expedição acampa no alto da Favela, com a Matadeira. Tome os comboios de Monte Santo e resista.',
    start: { food: 300, wood: 400, rifles: 10, hall: true, workers: 8, preacher: true,
      heroes: ['abade', 'pajeu', 'quadrado', 'vilanova', 'macambira'],
      units: [['warrior', 6], ['spearman', 4], ['rifleman', 6]],
      buildings: [...ARRAIAL, { kind: 'lodge', ...around(110, 170) }, { kind: 'igrejanova', ...around(330, 105) },
        { kind: 'tower', ...near('montesanto', 140, 40), levels: { power: 1 } }, { kind: 'tower', ...near('jeremoabo', 140, 40), levels: { power: 1 } },
        { kind: 'tower', ...near('uaua', 140, -40), levels: { power: 1 } }, { kind: 'tower', ...near('cambaio', 140, 40), levels: { power: 1 } }] },
    build: null, train: null,
    enemy: {
      buildings: [
        { kind: 'barraca', x: 605, y: 700, tag: 'favela' }, { kind: 'barraca', x: 650, y: 655, tag: 'favela' },
        { kind: 'barraca', x: 565, y: 745, tag: 'favela' }, { kind: 'barraca', x: 660, y: 740, tag: 'favela' }
      ],
      guards: [
        { type: 'private', count: 10, x: FAVELA.x, y: FAVELA.y, spread: 70, tag: 'favela' },
        { type: 'bayonet', count: 4, x: FAVELA.x, y: FAVELA.y, spread: 50, tag: 'favela' },
        { type: 'officer', count: 1, x: 620, y: 700, spread: 0, tag: 'favela' },
        { type: 'gunner', count: 2, x: 590, y: 650, spread: 20, tag: 'favela' },
        { type: 'matadeira', count: 1, x: 545, y: 622, spread: 0, tag: 'matadeira' }
      ]
    },
    raids: [
      { from: 'montesanto', at: 90, every: 100, roster: [['private', 4], ['bayonet', 2]], grow: .15, text: 'Colunas da 4ª expedição atacam pela estrada de Monte Santo' },
      { from: 'jeremoabo', at: 170, every: 130, roster: [['private', 3], ['bayonet', 2], ['officer', 1]], grow: .12, text: 'A coluna de Sergipe ataca pela estrada de Jeremoabo' },
      { from: 'edges', at: 320, every: 160, roster: [['private', 3], ['bayonet', 1]], grow: .1, text: 'A tropa fecha o cerco pela caatinga' }
    ],
    convoys: { first: 45, every: 110, road: 'montesanto' },
    objectives: [
      { type: 'convoys', count: 3, text: 'Tome 3 comboios de Monte Santo',
        hint: 'O comboio é o carro de bois com farinha e munição para a Favela, com escolta. Pegue-o na estrada, de tocaia, antes que chegue.' },
      { type: 'survive', seconds: 600, text: 'Resista ao cerco: 10 minutos',
        hint: 'A Matadeira, no alto da Favela, mira as igrejas. O filho de Macambira pode tentar arrebentá-la.' }
    ],
    lose: { hall: true },
    defeat: { hall: 'A igreja de Santo Antônio caiu.' },
    story: ['macambira'],
    intro: [
      { at: FAVELA, zoom: 1.5, kicker: 'Alto da Favela · junho de 1897', title: 'A quarta expedição',
        text: 'Desta vez vieram milhares de soldados, em duas colunas, sob o general Artur Oscar. A coluna principal tomou o alto da Favela, de frente para o arraial, e ali ficou presa: sem água e sem comida, dependia dos comboios que vinham de Monte Santo.',
        lines: [
          { who: 'Pajeú', unit: 'pajeu', text: 'Estão presos lá em cima, sem água. Comem o que chega pela estrada de Monte Santo.' },
          { who: 'João Abade', unit: 'abade', text: 'Então os comboios não chegam. Pajeú, a estrada é sua.' },
          { who: 'Antônio Vilanova', unit: 'vilanova', text: 'E o que se tomar deles vem para o armazém.' }
        ] },
      { at: { x: 545, y: 622 }, zoom: 2, kicker: 'A Matadeira', title: 'O canhão de sítio',
        text: 'Com a tropa veio um canhão Whitworth enorme, que os sertanejos chamaram de Matadeira. Do alto da Favela, ela mirava as igrejas de Belo Monte.',
        lines: [
          { who: 'O filho de Macambira', unit: 'macambira', text: '"Pai! quero escangalhar a matadeira!"', cite: EUCLIDES('A Luta') },
          { who: 'Joaquim Macambira', text: '"Consulta o Conselheiro — e vai."', cite: EUCLIDES('A Luta') }
        ] }
    ],
    outro: [
      { at: FAVELA, zoom: 1.3, kicker: 'Belo Monte · julho a setembro de 1897', title: 'O cerco aperta',
        text: 'Os comboios tomados deixaram a tropa da Favela passando fome por semanas. Mas os reforços não paravam de chegar, e o cerco se fechou. Antônio Conselheiro morreu em setembro. João Abade, Pajeú e os outros chefes caíram um a um.',
        lines: [
          { who: 'João Abade', unit: 'abade', text: 'Sem os comboios, a tropa da Favela está passando fome.' },
          { who: 'Antônio Vilanova', unit: 'vilanova', text: 'Mas pela estrada de Monte Santo chega gente nova toda semana.' }
        ] },
      { at: MIDDLE, zoom: 1.5, kicker: 'Belo Monte · 5 de outubro de 1897', title: 'Canudos não se rendeu',
        text: 'O arraial foi tomado casa por casa e destruído. Hoje o lugar está debaixo das águas do açude de Cocorobó. O que sobrou foi a memória — e o livro de Euclides da Cunha.',
        quote: { text: 'Canudos não se rendeu. Exemplo único em toda a história, resistiu até ao esgotamento completo. Expugnado palmo a palmo, na precisão integral do termo, caiu no dia 5, ao entardecer, quando caíram os seus últimos defensores, que todos morreram. Eram quatro apenas: um velho, dois homens feitos e uma criança, na frente dos quais rugiam raivosamente 5 mil soldados.', cite: EUCLIDES('A Luta') } }
    ]
  }
]);

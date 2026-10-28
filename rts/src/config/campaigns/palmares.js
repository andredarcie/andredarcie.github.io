// A campanha de Palmares (1645–1694), em 4 missões que seguem a guerra: o mocambo e a
// patrulha holandesa de 1645 (tutorial), as "prêsas" nos engenhos, as entradas de
// 1675–1677 (defesa em ondas) e o cerco da cerca do Macaco em 1694, no alto da serra
// da Barriga (cenário próprio, config/maps.js), quando Zumbi rompeu a contra-cerca e
// escapou.
//
// As cenas são personagens conversando (ui/Cutscene.js): `lines` são as falas, cada
// uma de quem (`who`) e, se ele está no mapa, de que unidade (`unit`: tipo ou marca).
// As falas com `cite` foram registradas na época (copiadas do texto integral de
// Edison Carneiro, O Quilombo dos Palmares, 1958, na grafia da edição); as outras são
// imaginadas a partir do que os documentos contam, e a cena avisa isso.
import { near, around, MIDDLE } from './places.js';

const BOOK = 'Edison Carneiro, <cite>O Quilombo dos Palmares</cite>';
const RELACAO = '<cite>Relação das guerras feitas aos Palmares</cite> (1678)';
const BLAER = '<cite>Diário da viagem do capitão João Blaer aos Palmares</cite> (1645)';
const quoted = who => `${who}, citado em ${BOOK}`;

// O mocambo já crescido das missões de depois: casas de palha, roça, forja.
const MOCAMBO = [
  { kind: 'house', ...around(250, 150) }, { kind: 'house', ...around(290, 150) },
  { kind: 'roca', ...around(20, 170) }, { kind: 'camp', ...around(200, 150) }
];
const ENGENHO = { x: 730, y: 230 };
const SENZALA = { x: 740, y: 320 };
// A brecha da contra-cerca, no pé da serra, a sudeste, à beira do Mundaú.
const BRECHA = { x: 700, y: 770 };

export const CAMPAIGN = Object.freeze([
  {
    number: 1, title: 'O mocambo', year: 'década de 1640', kind: 'rts', tutorial: true,
    summary: 'Gente fugida dos engenhos ergue um mocambo na mata da serra. Aprenda a colher, construir e preparar os guerreiros.',
    start: { food: 60, wood: 90, rifles: 0, hall: true, workers: 6, preacher: true },
    build: ['tower', 'house', 'roca', 'camp'], train: ['warrior', 'archer'],
    sequential: true,
    objectives: [
      { type: 'gather', resource: 'wood', amount: 150, text: 'Junte 150 de madeira',
        hint: 'Toque num palmarino e depois numa árvore da mata. Para escolher vários, segure e arraste.' },
      { type: 'gather', resource: 'food', amount: 120, text: 'Junte 120 de comida',
        hint: 'Mande palmarinos a uma roça. Eles levam a colheita até a Casa do Conselho.' },
      { type: 'build', kind: 'house', count: 1, text: 'Erga uma casa de palha',
        hint: 'Com um palmarino escolhido, toque em "Casa de palha" no painel de baixo e depois no chão.' },
      { type: 'build', kind: 'roca', count: 1, text: 'Abra uma roça de milho',
        hint: 'O milho grosso era "o seu principal sustento". A roça dá comida sozinha.' },
      { type: 'build', kind: 'camp', count: 1, text: 'Erga a forja',
        hint: 'Na forja se fazem as armas e se preparam os guerreiros.' },
      { type: 'units', unit: 'army', count: 3, text: 'Prepare três guerreiros',
        hint: 'Toque na forja e escolha guerreiros de espada ou flecheiros.',
        then: [
          { spawnEnemy: [{ type: 'private', count: 3, from: 'alagoas', tag: 'patrulha' }, { type: 'bayonet', count: 3, from: 'alagoas', tag: 'patrulha' }] },
          { toast: 'Uma patrulha holandesa sobe pelo caminho das Alagoas!', focus: 'alagoas' }
        ] },
      { type: 'kill', tag: 'patrulha', text: 'Rechace a patrulha',
        hint: 'Escolha os guerreiros e toque num soldado para atacar. Parados no mato, eles ficam de tocaia.' }
    ],
    lose: { hall: true },
    defeat: { hall: 'A Casa do Conselho caiu.' },
    story: ['palmares'],
    intro: [
      { at: MIDDLE, zoom: 1.4, kicker: 'Serra da Barriga · década de 1640', title: 'Os Palmares',
        text: 'Gente escravizada nos engenhos de açúcar de Pernambuco fugia para as serras de mata fechada do interior. Ali ergueu mocambos: casas de palha, roças de milho, uma cerca. O lugar tirou o nome das palmeiras.',
        quote: { text: 'estende-se pela parte superior do rio São Francisco uma corda de mata brava, que vem a fazer têrmo sôbre o sertão do cabo de Santo Agostinho, correndo quase norte a sul, do mesmo modo que corre a costa do mar; são as árvores principais palmeiras agrestes, que deram ao terreno o nome de Palmares', cite: RELACAO },
        lines: [
          { who: 'Palmarino', unit: 'worker', text: 'Aqui o feitor não acha a gente. A mata é fechada e a palmeira dá de tudo: casa, cama, azeite.' },
          { who: 'Pároco do Macaco', unit: 'paroco', text: 'Então ergam as casas e abram as roças. Quem chega aqui por conta própria é livre.' },
          { who: 'Palmarino', unit: 'worker', text: 'Primeiro a lenha, depois o milho.' }
        ] },
      { at: near('alagoas', 280), zoom: 1.3, kicker: 'Pernambuco holandês · 1630–1654', title: 'Os holandeses',
        text: 'Os holandeses ocuparam Pernambuco em 1630. Na guerra entre os senhores, muita gente fugiu para a mata, e os Palmares cresceram. Em 1644 e 1645, os holandeses mandaram expedições contra eles.',
        lines: [
          { who: 'Vigia', unit: 'worker', text: 'Do lado das Alagoas dizem que vem gente armada, com índios na frente.' },
          { who: 'Pároco do Macaco', unit: 'paroco', text: 'Então que a forja não pare.' }
        ] }
    ],
    outro: [
      { at: MIDDLE, zoom: 1.5, kicker: 'Palmares · 1645', title: 'O mocambo continua',
        text: 'A expedição de 1645 achou o Palmares Grande, com as casas, uma igreja e as forjas, queimou o que pôde e voltou sem prender ninguém de importância. Os palmarinos reergueram os mocambos, e eles cresceram.',
        quote: { text: 'as casas eram em número de 220 e no meio delas erguia-se uma igreja, quatro forjas e uma grande casa de conselho; havia entre os habitantes tôda sorte de artífices', cite: BLAER },
        lines: [
          { who: 'Guerreiro', unit: 'warrior', text: 'A patrulha desceu a serra de volta.' },
          { who: 'Pároco do Macaco', unit: 'paroco', text: 'Casa de palha se ergue de novo. E mais gente vai chegar.' }
        ] }
    ]
  },
  {
    number: 2, title: 'As prêsas', year: 'década de 1670', kind: 'rts',
    summary: 'Desça ao engenho do outro lado do Mundaú, abra a senzala e traga os libertos para a mata.',
    start: { food: 150, wood: 200, rifles: 2, hall: true, workers: 5, preacher: true, heroes: ['zumbi'],
      units: [['warrior', 4], ['archer', 4], ['spearman', 2]], buildings: MOCAMBO },
    build: null, train: null,
    enemy: {
      buildings: [
        { kind: 'engenho', ...ENGENHO, tag: 'engenho' }, { kind: 'senzala', ...SENZALA, tag: 'senzala' }
      ],
      guards: [
        { type: 'private', count: 6, x: 715, y: 280, spread: 50, tag: 'engenho' },
        { type: 'officer', count: 1, x: 720, y: 270, spread: 0, tag: 'capitao' }
      ]
    },
    raids: [
      { from: ENGENHO, after: 'senzala', at: 25, every: 35, times: 3, roster: [['private', 3], ['bayonet', 1]], text: 'A gente do engenho sai atrás dos fugidos' }
    ],
    sequential: true,
    objectives: [
      { id: 'senzala', type: 'reach', x: SENZALA.x, y: SENZALA.y, radius: 55, count: 1, unit: 'army', text: 'Chegue à senzala do engenho',
        hint: 'Atravesse o Mundaú com os guerreiros. Os soldados do senhor guardam a casa-grande; os flecheiros os enfrentam de longe.',
        then: [
          { spawnPlayer: [{ type: 'worker', count: 8, x: SENZALA.x - 30, y: SENZALA.y, tag: 'libertos' }] },
          { toast: 'Oito pessoas largam a senzala e seguem os palmarinos!', focus: SENZALA }
        ] },
      { type: 'reach', x: MIDDLE.x, y: MIDDLE.y, radius: 110, count: 6, tag: 'libertos', text: 'Leve ao menos 6 libertos à Casa do Conselho',
        hint: 'Escolha os libertos (segure e arraste sobre eles) e toque perto da Casa do Conselho. Os guerreiros cobrem a retirada.' }
    ],
    lose: { hall: true, min: { tag: 'libertos', count: 6 } },
    defeat: { hall: 'A Casa do Conselho caiu.', min: 'Não sobraram libertos bastantes para chegar à mata.' },
    intro: [
      { at: MIDDLE, zoom: 1.5, kicker: 'Palmares · década de 1670', title: 'As prêsas',
        text: 'Os palmarinos desciam da serra aos engenhos e às vilas e voltavam com gente para a mata. Os senhores chamavam isso de roubo; para quem saía da senzala, era a liberdade.',
        quote: { text: 'uns levados do amor da liberdade, outros do mêdo do castigo, alguns induzidos pelos mesmos negros, e muitos roubados na campanha por êles', cite: quoted('Fernão Carrilho (1687)') },
        lines: [
          { who: 'Zumbi', unit: 'zumbi', text: 'Do outro lado do Mundaú tem um engenho. Na senzala tem gente esperando.' },
          { who: 'Guerreiro', unit: 'warrior', text: 'Os homens do senhor guardam a casa-grande.' },
          { who: 'Zumbi', unit: 'zumbi', text: 'Então a gente chega pela mata, abre a senzala e volta antes que eles se juntem.' }
        ] },
      { at: { x: 735, y: 275 }, zoom: 1.7, kicker: 'Além do Mundaú', title: 'O engenho',
        text: 'A leste, do outro lado do rio, fica um engenho: a casa-grande, a senzala e os homens armados do senhor.',
        lines: [
          { who: 'Capitão do engenho', unit: 'capitao', text: 'Olho na mata. Os negros dos Palmares descem de noite.' },
          { who: 'Soldado', unit: 'engenho', text: 'A senzala está trancada, capitão. Daqui ninguém foge.' }
        ] }
    ],
    outro: [
      { at: MIDDLE, zoom: 1.6, kicker: 'Palmares · década de 1670', title: 'Gente nova no mocambo',
        text: 'Quem chegava aos Palmares fugindo era tido por livre. Para os senhores, cada mocambo era um chamado aos escravizados das redondezas — e os governadores decidiram acabar com eles.',
        quote: { text: 'com prêsas, que começaram a fazer, e com persuasões de liberdade, que começaram a espalhar, se foram multiplicando.', cite: RELACAO },
        lines: [
          { who: 'Liberto', unit: 'libertos', text: 'É verdade que aqui ninguém é dono de ninguém?' },
          { who: 'Zumbi', unit: 'zumbi', text: 'Quem chega aos Palmares é livre. Agora, aprenda a defender isso.' }
        ] }
    ]
  },
  {
    number: 3, title: 'As entradas', year: '1675–1677', kind: 'defense',
    summary: 'Manuel Lopes e depois Fernão Carrilho entram nos Palmares. Defenda a Casa do Conselho por seis entradas.',
    start: { food: 200, wood: 300, rifles: 3, hall: true, workers: 6, preacher: true, heroes: ['zumbi'],
      units: [['warrior', 3], ['archer', 3]],
      buildings: [...MOCAMBO, { kind: 'tower', ...near('portocalvo', 140, 40) }, { kind: 'tower', ...near('alagoas', 140, -40) }] },
    build: null, train: null,
    waves: { count: 6, offset: 2 },
    objectives: [
      { type: 'waves', count: 6, text: 'Resista a 6 entradas',
        hint: 'Erga cercas de pau a pique na beira dos caminhos e semeie estrepes. Capitão abatido faz os soldados fugirem.' }
    ],
    lose: { hall: true },
    defeat: { hall: 'A Casa do Conselho caiu.' },
    story: ['macaco'],
    intro: [
      { at: near('alagoas', 260), zoom: 1.3, kicker: 'Porto Calvo · setembro de 1675', title: 'As entradas',
        text: 'Expulsos os holandeses em 1654, os portugueses fizeram mais de vinte entradas contra os Palmares. Em 1675 o sargento-mor Manuel Lopes subiu com 280 homens "brancos, mulatos e índios".',
        quote: { text: 'em que se descobriu uma grande cidade de mais de 2 000 casas, fortificadas de estacada de pau-a-pique e defendida com três fôrças e com soma grande de defensores, prevenidos com todo gênero de armas', cite: RELACAO },
        lines: [
          { who: 'Sargento-mor Manuel Lopes', text: 'Subimos até a cidade deles. Se não se renderem, fogo nas casas.' },
          { who: 'Um soldado', text: 'Na mata, sargento-mor, eles enxergam a gente e a gente não enxerga ninguém.' }
        ] },
      { at: MIDDLE, zoom: 2, kicker: 'O general das armas', title: 'Zumbi',
        text: 'Na defesa estava um sobrinho do rei Ganga-Zumba, que os portugueses chamavam de general das armas.',
        quote: { text: 'negro de singular valor, grande ânimo e constância rara', cite: RELACAO },
        lines: [
          { who: 'Zumbi', unit: 'zumbi', text: 'Fechem as cercas e semeiem os estrepes nos caminhos.' },
          { who: 'Flecheiro', unit: 'archer', text: 'Os flecheiros estão nas torneiras, general.' },
          { who: 'Zumbi', unit: 'zumbi', text: 'Ninguém sai atrás deles na mata. Deixem que venham até a cerca.' }
        ] }
    ],
    outro: [
      { at: MIDDLE, zoom: 1.4, kicker: 'Recife · junho de 1678', title: 'A paz de Ganga-Zumba',
        text: 'O Macaco aguentou, mas a entrada de Fernão Carrilho, em 1677, prendeu chefes, filhos e netos do rei. Em 1678 o Ganga-Zumba mandou os filhos ao Recife pedir a paz, e foi morar no Cucaú. Pelos termos da paz, quem tinha fugido para os Palmares seria devolvido aos senhores. Zumbi não aceitou, e passou a comandar os Palmares.',
        lines: [
          { who: 'Os filhos de Ganga-Zumba, no Recife', text: 'estavam sem cidades, sem mantimentos, sem mulheres, nem filhos', cite: `${RELACAO} · em discurso indireto` },
          { who: 'Zumbi', unit: 'zumbi', text: 'Paz que devolve os fugidos aos senhores não é paz. Eu fico na serra.' }
        ] }
    ]
  },
  {
    number: 4, title: 'A cerca do Macaco', year: 'janeiro e fevereiro de 1694', kind: 'rts',
    summary: 'Três mil homens cercam o alto da serra da Barriga. Resista ao cerco e tire Zumbi pela brecha da contra-cerca.',
    start: { food: 300, wood: 400, rifles: 6, hall: true, workers: 8, preacher: true, heroes: ['zumbi'],
      units: [['warrior', 8], ['spearman', 6], ['archer', 6], ['rifleman', 4]],
      buildings: [...MOCAMBO, { kind: 'roca', ...around(160, 170) }, { kind: 'lodge', ...around(110, 170) },
        ...['serinhaem', 'portocalvo', 'alagoas', 'saofrancisco'].flatMap(road => [
          { kind: 'tower', ...near(road, 135, 42), levels: { scatter: 1, range: 1 } },
          { kind: 'tower', ...near(road, 135, -42), levels: { scatter: 1 } }
        ])] },
    build: null, train: null,
    enemy: {
      guards: [{ type: 'private', count: 4, x: BRECHA.x - 25, y: BRECHA.y - 35, spread: 35, tag: 'sentinelas' }]
    },
    raids: [
      { from: 'roads', at: 50, every: 65, roster: [['private', 3], ['bayonet', 3], ['gunner', 1]], grow: .15, text: 'A tropa sobe a serra contra a cerca' },
      { from: 'edges', at: 140, every: 110, roster: [['private', 2], ['bayonet', 2]], grow: .1, text: 'Os paulistas sobem pela mata' },
      { from: 'alagoas', at: 200, every: 170, roster: [['matadeira', 1], ['private', 2]], text: 'A artilharia sobe pelo caminho das Alagoas' }
    ],
    sequential: true,
    objectives: [
      { type: 'survive', seconds: 360, text: 'Resista ao cerco',
        hint: 'As cercas com estrepes seguram a tropa; mande palmarinos consertar o que quebrar. Em 1694 o Macaco resistiu 22 dias.',
        then: [{ toast: 'A contra-cerca tem uma brecha no pé da serra, à beira do precipício! Zumbi precisa sair por ela.', focus: BRECHA }] },
      { type: 'reach', x: BRECHA.x, y: BRECHA.y, radius: 70, count: 10, must: 'zumbi', text: 'Leve Zumbi e mais 9 palmarinos até a brecha',
        hint: 'Junte Zumbi e um grupo (segure e arraste), desça a serra, passe pelas sentinelas e chegue à brecha. A Casa do Conselho pode cair: o que importa é sair.' }
    ],
    lose: { hall: false, units: ['zumbi'], min: { count: 10 } },
    defeat: { units: 'Zumbi caiu na serra da Barriga.', min: 'Não sobrou gente bastante para romper o cerco.' },
    story: ['cerco'],
    intro: [
      { at: MIDDLE, zoom: 1.4, kicker: 'Serra da Barriga · janeiro de 1694', title: 'A cerca do Macaco',
        text: 'Contratados pelo governo, os bandeirantes de Domingos Jorge Velho, com as tropas das Alagoas e de Pernambuco — cerca de três mil homens —, cercaram o alto da serra. Pela primeira vez trouxeram artilharia.',
        lines: [
          { who: 'Domingos Jorge Velho', text: 'se tinha fortificado com uma triplicada cêrca no cume da . . . Serra [do Barriga], lugar forte por natureza, e com água perene dentro', cite: quoted('Domingos Jorge Velho, em relato ao rei') },
          { who: 'Zumbi', unit: 'zumbi', text: 'Lá embaixo eles cercam a serra inteira. Aqui em cima temos água e as três cercas.' },
          { who: 'Guerreiro', unit: 'warrior', text: 'Os estrepes estão no chão, general, até onde a vista alcança.' }
        ] },
      { at: BRECHA, zoom: 1.6, kicker: 'A contra-cerca', title: 'O cerco se fecha',
        text: 'Os sitiantes ergueram uma contra-cerca em volta da dos palmarinos e, de noite, uma cerca oblíqua até a beira de um precipício. Num canto, ela ainda não se fechava.',
        lines: [
          { who: 'Zumbi', unit: 'zumbi', text: '"E tu deixaste fazer essa cêrca aos brancos? Amanhã seremos entrados, e mortos, e nossas mulheres e filhos cativos!"', cite: quoted('Domingos Jorge Velho') },
          { who: 'Chefe do posto', unit: 'spearman', text: 'Trabalharam de noite, general. Mas do outro lado, no pé da serra, ainda há uma brecha.' }
        ] }
    ],
    outro: [
      { at: BRECHA, zoom: 1.6, kicker: 'Madrugada de 6 de fevereiro de 1694', title: 'A brecha',
        text: 'Zumbi rompeu o cerco com a sua gente pela brecha. Na escuridão, à beira do abismo, cerca de duzentos palmarinos caíram no precipício e centenas foram presos. Zumbi foi ferido, mas escapou.',
        lines: [
          { who: 'Zumbi', unit: 'zumbi', text: 'Pela beira, sem barulho. Quem passar, não para.' }
        ] },
      { at: MIDDLE, zoom: 1.3, kicker: '20 de novembro de 1695', title: 'Zumbi',
        text: 'Zumbi continuou a luta na mata por quase dois anos, até ser traído e morto. A cabeça dele foi exposta no Recife, para provar que não era imortal. Hoje, 20 de novembro é o Dia Nacional de Zumbi e da Consciência Negra.',
        lines: [
          { who: 'Domingos Jorge Velho', text: 'os tais negros . . . sempre serão 30 vêzes 30, pelo menos', cite: quoted('Domingos Jorge Velho') }
        ] }
    ]
  }
]);

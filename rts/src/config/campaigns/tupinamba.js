// A campanha dos tupinambás (antes de 1500), em 4 missões que seguem o que Gabriel
// Soares conta da vida e da guerra das aldeias, cada uma no seu lugar
// (config/maps.js) e com a mecânica do capítulo de onde vem:
//   1. A aldeia nova (tutorial): a palma das casas apodreceu e a aldeia muda de lugar
//      (cap. CLI); erguer a casa do principal, roçar o mato, as ocas, o moquém e o
//      fogo do conselho, e pegar as espias dos contrários antes que voltem (CLXVII).
//   2. Ao romper do dia: a marcha pelo luar, o salto sobre a aldeia contrária que
//      dorme, o fogo nas casas e a volta, com os contrários no alcance (CLXVIII).
//   3. A caiçá: alcançados na volta, os guerreiros se fortificam à beira d'água, com
//      a caiçá feita às pressas, e aguentam a noite até o socorro (CLXIX).
//   4. O cerco da aldeia: os contrários cercam a aldeia com caiçás, que verdes não se
//      rompem, e vivem do mantimento que chega pelo mar (CLXVIII). Fecha com 1500.
//
// As cenas são personagens conversando (ui/Cutscene.js): `lines` são as falas, cada
// uma de quem (`who`) e, se ele está no mapa, de que unidade (`unit`: tipo ou marca);
// `cast` põe na cena quem só existe nela. Antes de 1500 não sobrou fala registrada de
// ninguém: todas são imaginadas a partir do que contam Gabriel Soares, Gândavo e
// Caminha (citados na narração, copiados do texto integral), e a cena avisa isso.
import { near, around, spot, HALF, MIDDLE } from './places.js';

const SOARES = chapter => `Gabriel Soares de Sousa, <cite>Tratado descritivo do Brasil em 1587</cite> · cap. ${chapter}`;
const GANDAVO = 'Pero de Magalhães Gândavo, <cite>Tractado da terra do Brasil</cite> (c. 1570)';
const CAMINHA = 'Pero Vaz de Caminha, <cite>Carta a El-Rei D. Manuel</cite> (1500)';

// A aldeia já crescida da última missão.
const ALDEIA = [
  { kind: 'house', ...around(250, 150) }, { kind: 'house', ...around(290, 150) },
  { kind: 'camp', ...around(200, 150) }, { kind: 'moquem', ...around(20, 170) }
];
// A aldeia contrária da 2ª missão, no meio do mapa: a casa do principal, as ocas em
// volta do terreiro e dois lanços de cerca virados para a trilha da costa.
// As casas são "cobertas de palmas até o chão" (Soares, cap. CLXVIII): pegam fogo
// depressa (`armor` acima de 1 é dano multiplicado).
const CONTRARIA = [
  { kind: 'hall', ...MIDDLE, tag: 'aldeia', armor: 3.5 },
  ...[45, 135, 225, 315].map(angle => ({ kind: 'house', ...around(angle, 100), tag: 'aldeia', armor: 2.5 })),
  { kind: 'tower', ...around(155, 118), tag: 'cerca' }, { kind: 'tower', ...around(205, 118), tag: 'cerca' }
];
// As caiçás dos contrários em volta da aldeia (4ª missão), fora dos caminhos.
const CAICAS = [35, 145, 215, 250, 290, 325].map(angle => around(angle, HALF * .6));

export const CAMPAIGN = Object.freeze([
  {
    number: 1, title: 'A aldeia nova', year: 'antes de 1500', kind: 'rts', tutorial: true,
    summary: 'A palma das casas velhas apodreceu e a aldeia muda de lugar. Leve a gente ao alto, erga a casa do principal, roce o mato e pegue as espias dos contrários antes que voltem.',
    start: { food: 260, wood: 420, rifles: 30, hall: 'ruin', ruin: .45, at: near('costa', 300), workers: 8, preacher: true, home: 'A aldeia nova',
      units: [['warrior', 2], ['rifleman', 2]] },
    build: ['tower', 'house', 'moquem', 'camp'], train: ['warrior', 'rifleman'],
    sequential: true,
    script: [
      { at: 2, say: [
        { who: 'Morador', unit: 'worker', text: 'Chove dentro das casas velhas. A palma já não segura nada.' },
        { who: 'Pajé', unit: 'paje', text: 'Então vamos para o alto, perto do rio. Lá o vento lava as casas.' }
      ] }
    ],
    objectives: [
      { type: 'reach', ...MIDDLE, radius: 115, count: 10, unit: 'any', text: 'Leve a gente da aldeia velha até o alto',
        hint: 'Segure e arraste o dedo sobre todos para escolher, e toque no alto, no meio do mapa: tocar no chão manda andar.' },
      { type: 'build', kind: 'hall', count: 1, text: 'Erga a casa do principal',
        hint: 'Escolha os moradores e toque na armação da casa: eles batem até ela ficar de pé. É a primeira casa da aldeia.' },
      { type: 'gather', resource: 'wood', amount: 60, gain: true, text: 'Roce o mato em volta: 60 de madeira',
        hint: '"Os machos costumam a roçar os matos" (cap. CLIX): escolha moradores e toque numa árvore. A madeira vai para a casa do principal.' },
      { type: 'build', kind: 'house', count: 1, text: 'Erga uma oca',
        hint: 'Com um morador escolhido, toque em "Oca" no painel de baixo e depois no chão, em volta do terreiro.' },
      { type: 'build', kind: 'moquem', count: 1, text: 'Erga o moquém',
        hint: 'No moquém se moqueia o peixe e a caça: dá comida sem ninguém colhendo. Mande também colher na roça de mandioca.' },
      { type: 'build', kind: 'camp', count: 1, text: 'Acenda o fogo do conselho',
        hint: 'No fogo do conselho se decide a guerra e se preparam os guerreiros.' },
      { type: 'units', unit: 'army', count: 5, text: 'Tenha cinco guerreiros prontos',
        hint: 'Toque no fogo do conselho e escolha guerreiros de tacape ou flecheiros.',
        then: [
          { spawnEnemy: [{ type: 'private', count: 3, from: 'serra', tag: 'espias', route: { road: 'serra', depth: .8, back: true, wait: 18, exit: true, evade: true } }],
            toast: 'Espias tupiniquins descem a trilha da serra!', focus: near('serra', 200) },
          { say: [
            { who: 'Guerreiro de tacape', unit: 'warrior', text: 'São espias dos contrários. Vieram ver onde fica a aldeia nova.' },
            { who: 'Pajé', unit: 'paje', text: 'Se uma voltar e contar, eles vêm de madrugada. Nenhuma pode voltar.' }
          ] }
        ] },
      { type: 'kill', tag: 'espias', count: 3, text: 'Pegue as três espias antes que voltem',
        hint: 'Elas olham a aldeia da trilha e depois voltam correndo para a serra. Mande os guerreiros cortar o caminho delas: espia não para para brigar.',
        then: [{ say: [{ who: 'Guerreiro de tacape', unit: 'warrior', text: 'Nenhuma voltou. Cada uma me dá um nome novo.' }] }] }
    ],
    lose: { escaped: { tag: 'espias' } },
    defeat: { escaped: 'Uma espia voltou à aldeia dela e contou onde fica a aldeia nova.' },
    story: ['aldeia'],
    intro: [
      { at: near('costa', 300), zoom: 1.5, kicker: 'Litoral do Rio de Janeiro · antes de 1500', title: 'A palma apodrece',
        text: 'No litoral entre a Guanabara e Ubatuba, os tupinambás viviam em aldeias de poucas casas, mas enormes: cada oca, coberta de folhas de palmeira, abrigava várias famílias. Quando a palma apodrecia, a aldeia inteira mudava de lugar.',
        quote: { text: 'não vivem mais nesta aldeia, que enquanto lhes não apodrece a palma das casas, que lhes dura três, quatro anos. E quando lhes chove muito nelas, passam a aldeia para outra parte.', cite: SOARES('CLI') },
        lines: [
          { who: 'Morador', unit: 'worker', text: 'A mandioca da roça velha já cansou a terra também.' },
          { who: 'Pajé', unit: 'paje', text: 'Os antigos escolheram o lugar. Amanhã a gente vai.' }
        ] },
      { at: near('costa', 240), pan: MIDDLE, zoom: 1.3, kicker: 'O lugar novo', title: 'Um sítio alto',
        text: 'O principal escolhia o lugar com os mais velhos, e a casa dele era a primeira a subir. As outras ocas se arrumavam em volta de um terreiro quadrado, onde se faziam as festas e os conselhos.',
        quote: { text: 'Quando este principal assenta a sua aldeia, busca sempre um sítio alto e desabafado dos ventos, para que lhe lave as casas, e que tenha a água muito perto, e que a terra tenha disposição para de redor da aldeia fazerem suas roças e granjearias', cite: SOARES('CLI') } }
    ],
    outro: [
      { at: MIDDLE, zoom: 1.4, kicker: 'A aldeia nova', title: 'O terreiro',
        text: 'A aldeia nova ficou de pé: a casa do principal, as ocas em volta do terreiro, o moquém e as roças abertas a fogo na mata. Mas as espias tinham vindo da serra — e os contrários sabiam que havia gente nova ali.',
        quote: { text: 'Estes indios saõ mui bellicosos e tem sempre grandes gerras hũs contra os outros nunca se acha nelles paz nẽ he possiuel auer antrelles amizade porque huãs nasçoẽs pellejaõ contra outras e mataõse muitos delles, e assy vai creçendo o odio cada vez mais e ficaõ imigos verdadeiros perpetuamente.', cite: GANDAVO },
        lines: [
          { who: 'Guerreiro de tacape', unit: 'warrior', text: 'As espias não voltaram. Os parentes delas vão querer vingança.' },
          { who: 'Pajé', unit: 'paje', text: 'Então é melhor ir até eles antes que venham até nós. O conselho decide.' }
        ] }
    ]
  },
  {
    number: 2, title: 'Ao romper do dia', year: 'antes de 1500', kind: 'rts',
    summary: 'Depois de duas jornadas sem fogo, os guerreiros chegam pelo luar à aldeia tupiniquim, que dorme. Dê o salto, ponha fogo nas casas e volte para casa com os contrários no alcance.',
    start: { food: 0, wood: 0, rifles: 60, hall: false, hour: 4.5, skyScale: .3, at: near('costa', HALF * .86), home: 'Os guerreiros',
      units: [['warrior', 7], ['rifleman', 6], ['spearman', 3]] },
    build: [], train: [],
    enemy: {
      buildings: CONTRARIA,
      guards: [
        { type: 'bayonet', count: 6, ...MIDDLE, spread: 80, tag: 'contrarios', asleep: true },
        { type: 'private', count: 5, ...MIDDLE, spread: 80, tag: 'contrarios', asleep: true },
        { type: 'officer', count: 1, x: MIDDLE.x + 10, y: MIDDLE.y + 30, spread: 0, tag: 'chefe', asleep: true },
        // Os vigias na trilha, longe o bastante do grupo para o salto começar em silêncio.
        { type: 'private', count: 2, ...near('costa', HALF * .4), spread: 36, tag: 'contrarios', sentry: true }
      ]
    },
    alarm: 'O urro, as buzinas e os tamboris: a aldeia acorda em espanto!',
    raids: [
      { from: 'serra', after: 'salto', at: 10, every: 26, times: 5, roster: [['bayonet', 2], ['private', 2]], grow: .1, tag: 'alcance',
        text: 'Os da aldeia da serra vêm no alcance' },
      { from: 'rio', after: 'salto', at: 22, every: 30, times: 4, roster: [['bayonet', 2], ['private', 1]], tag: 'alcance',
        text: 'Guerreiros atravessam o rio atrás de vocês' }
    ],
    script: [
      { at: 2, say: [
        { who: 'Guerreiro de tacape', unit: 'warrior', text: 'Duas jornadas sem acender fogo. Agora é a última, pelo luar.' },
        { who: 'Flecheiro', unit: 'rifleman', text: 'Dois vigias na trilha. Se gritarem, a aldeia acorda.' }
      ] }
    ],
    sequential: true,
    objectives: [
      { id: 'salto', type: 'destroy', tag: 'aldeia', text: 'Dê o salto: ponha abaixo a casa do principal e as ocas',
        hint: 'Os flecheiros derrubam os vigias de longe, antes que deem o grito. A aldeia dorme: caia em cima de todos juntos e toque numa oca para atacar.',
        then: [
          { toast: 'As casas cobertas de palma ardem. Os das outras aldeias se ajuntam para vir no alcance!' },
          { say: [
            { who: 'Guerreiro de tacape', unit: 'warrior', text: 'Fogo nas casas e para casa, sem parar. Eles vão se juntar.' },
            { who: 'Flecheiro', unit: 'rifleman', text: 'Os de trás fazem de espia. Ninguém para até a trilha da costa.' }
          ] }
        ] },
      { type: 'reach', ...near('costa', HALF * .93), radius: 70, count: 6, unit: 'army', text: 'Volte pela trilha da costa com ao menos 6 guerreiros',
        hint: 'Escolha todos e toque na saída da trilha, a oeste. Quem parar para brigar fica para trás.' }
    ],
    lose: { wiped: true },
    defeat: { wiped: 'Nenhum guerreiro voltou da aldeia contrária.' },
    story: ['madrugada'],
    intro: [
      { at: near('costa', HALF * .86), zoom: 1.6, kicker: 'Duas jornadas da aldeia contrária', title: 'Sem fogo',
        text: 'O conselho decidiu a guerra no terreiro. Os guerreiros partiram em fila, com os arcos, os paveses e a farinha de guerra às costas, e as espias na frente. Perto da aldeia inimiga, ninguém acende fogo.',
        quote: { text: 'Tanto que os tupinambás chegam duas jornadas da aldeia de seus contrários não fazem fogo de dia, por não serem sentidos deles pelos fumos que vêm de longe', cite: SOARES('CLXVIII') },
        lines: [
          { who: 'Guerreiro de tacape', unit: 'warrior', text: 'Partimos pela lua cheia. Quando clarear, estaremos em cima deles.' },
          { who: 'Flecheiro', unit: 'rifleman', text: 'E o grito todo de uma vez, com as buzinas.' }
        ] },
      { at: MIDDLE, zoom: 1.6, kicker: 'A aldeia tupiniquim', title: 'Ao romper do dia',
        text: 'O ataque vem de madrugada, de surpresa, com gritos, buzinas e tambores.',
        quote: { text: 'ordenam-se de maneira que possam dar nos contrários de madrugada, e em conjunção de lua cheia para andarem a derradeira jornada de noite pelo luar, e tomarem seus contrários despercebidos e descuidados; e em chegando à aldeia dão todos juntos tamanho urro, gritando, que fazem com isso e com suas buzinas e tamboris grande espanto', cite: SOARES('CLXVIII') },
        lines: [
          { who: 'Vigia tupiniquim', unit: 'contrarios', text: 'A noite está quieta. Só o mato e o luar.' }
        ] }
    ],
    outro: [
      { at: MIDDLE, zoom: 1.5, kicker: 'A aldeia contrária', title: 'A volta',
        text: 'Quem deu o salto não esperava o dia acabar: punha fogo nas casas e voltava andando o resto do dia e a noite inteira, com as espias atrás. Os cativos iam junto, para viver meses na aldeia até o dia da festa no terreiro — não por fome, mas por vingança. E a vingança chamava outra.',
        quote: { text: 'quando os vencedores se recolhem, põem fogo às casas da aldeia em que deram, que são cobertas de palmas até o chão. E recolhem-se logo andando todo o que lhes resta do dia, e toda a noite pelo luar com o passo mais apressado, trazendo suas espias detrás, por se arrecearem de se ajuntarem muitos do contrário', cite: SOARES('CLXVIII') },
        lines: [
          { who: 'Flecheiro', unit: 'rifleman', text: 'Eles não desistiram. Vêm atrás, cada vez mais.' },
          { who: 'Guerreiro de tacape', unit: 'warrior', text: 'Então paramos na beira d\'água e fazemos a caiçá.' }
        ] }
    ]
  },
  {
    number: 3, title: 'A caiçá', year: 'antes de 1500', kind: 'rts',
    summary: 'Alcançados pelos contrários na volta, os guerreiros param à beira do rio. Levante a caiçá antes que eles cheguem, aguente a noite e espere o socorro da aldeia.',
    start: { food: 120, wood: 260, rifles: 60, hall: false, hour: 16.5, skyScale: .5, at: spot(.43, .52), workers: 5, home: 'A caiçá',
      heroes: ['velha'], units: [['warrior', 5], ['rifleman', 6], ['spearman', 2]] },
    build: ['tower'], train: [],
    raids: [
      { from: 'serra', after: 'caica', at: 5, every: 16, times: 5, roster: [['bayonet', 2], ['private', 2]], grow: .12, tag: 'cerco',
        text: 'Os contrários descem a trilha da serra' },
      { from: 'rio', after: 'caica', at: 12, every: 22, times: 4, roster: [['bayonet', 2], ['private', 1], ['gunner', 1]], grow: .1, tag: 'cerco',
        text: 'Guerreiros com tições vêm pela trilha do rio' },
      { from: 'praia', after: 'caica', at: 25, every: 35, times: 2, roster: [['bayonet', 3], ['private', 3]], tag: 'cerco',
        text: 'Igaras dos contrários entram pela enseada' }
    ],
    script: [
      { at: 2, say: [
        { who: 'Flecheiro', unit: 'rifleman', text: 'Eles vêm no alcance, e são muitos. Não dá para chegar em casa antes deles.' },
        { who: 'Guerreiro de tacape', unit: 'warrior', text: 'Então aqui, na beira do rio. Cortem rama e espinho: a caiçá, depressa.' }
      ] },
      { after: 'caica', at: 50, say: [
        { who: 'Guerreiro de tacape', unit: 'warrior', text: 'Ninguém tenha medo deles! O socorro não tarda, e logo nos vemos vingados.' },
        { who: 'Velha curandeira', unit: 'velha', text: 'Tragam os feridos para cá, para trás da caiçá.' }
      ] },
      { after: 'noite', at: 10, flee: true, toast: 'Sem mantimento e diante do socorro, os contrários levantam o cerco.' }
    ],
    sequential: true,
    objectives: [
      { id: 'caica', type: 'build', kind: 'tower', count: 3, text: 'Levante a caiçá à beira d\'água: 3 lanços',
        hint: 'Escolha as mulheres (moradoras) e toque em "Cerca de seteiras" no painel; ponha os lanços do lado de cá do rio. De trás da caiçá vocês veem e flecham, e eles não veem quem atira.',
        deadline: 110, late: 'Os contrários chegaram com a caiçá por fazer, e ninguém tinha onde se abrigar.',
        then: [{ toast: 'A caiçá está de pé. Agora, boa vigia: eles vêm de todo lado.' }] },
      { id: 'noite', type: 'survive', seconds: 100, text: 'Aguente o cerco com boa vigia até o socorro',
        hint: 'Os flecheiros atrás da caiçá; os de tacape e de pavês na frente, onde a caiçá abre. As flechas que eles erram ficam no chão: quem passa apanha.',
        then: [
          { spawnPlayer: [{ type: 'warrior', count: 6, ...near('casa', HALF * .9), tag: 'socorro', route: { path: [spot(.38, .53)] } },
            { type: 'rifleman', count: 4, ...near('casa', HALF * .95), tag: 'socorro', route: { path: [spot(.36, .5)] } }],
            toast: 'O socorro chega pela trilha de casa!', focus: near('casa', HALF * .8) },
          { say: [{ who: 'Guerreiro do socorro', unit: 'socorro', text: 'Mandaram chamar e viemos! Onde estão eles?' }] }
        ] },
      { type: 'kill', tag: 'cerco', text: 'Veja os contrários levantarem o cerco',
        hint: 'Com o socorro do seu lado, eles recuam. Quem ainda brigar, derrube.' }
    ],
    lose: { wiped: true },
    defeat: { wiped: 'Os contrários romperam a caiçá e ninguém escapou.' },
    story: ['cerca', 'flechas'],
    intro: [
      { at: spot(.43, .52), zoom: 1.6, kicker: 'A volta da guerra', title: 'No alcance',
        text: 'Muitas vezes os contrários se juntavam e alcançavam quem voltava de um ataque. Então era preciso parar e esperar por eles — e se fortificar à beira d\'água, com uma cerca de rama e espinhos feita às pressas: a caiçá.',
        quote: { text: 'ajuntar-se grande soma deles, e virem-lhes no alcance até lhes não poderem fugir; e ser-lhes necessário esperá-los, o que fazem ao longo da água, onde se fortificam fazendo sua cerca de caiçá', cite: SOARES('CLXIX') },
        lines: [
          { who: 'Guerreiro de tacape', unit: 'warrior', text: 'Aqui tem água e tem mato para a cerca. Paramos aqui.' }
        ] },
      { at: spot(.43, .52), pan: near('serra', HALF * .7), zoom: 1.3, kicker: 'O cerco', title: 'Atrás da caiçá',
        text: 'Por trás da caiçá, os cercados viam quem estava de fora e flechavam à vontade. De noite, os de mais autoridade andavam pregando para que ninguém temesse, porque o socorro não tardaria.',
        quote: { text: 'mas os cercados veem por detrás desta cerca a quem está de fora, para empregarem todas as suas flechas à vontade, e os de fora não veem quem lhes atira', cite: SOARES('CLXIX') } }
    ],
    outro: [
      { at: MIDDLE, zoom: 1.4, kicker: 'Depois da noite', title: 'O cerco levantado',
        text: 'Quem cercava sem mantimento para continuar e sem força para romper a cerca, voltava para casa. Os vizinhos chamados em socorro vinham depressa — e da próxima vez seriam os contrários a chamar os deles.',
        quote: { text: 'mandar pedir socorro a seus vizinhos, e lho veem logo dar com muita presteza', cite: SOARES('CLXIX') },
        lines: [
          { who: 'Guerreiro do socorro', unit: 'socorro', text: 'Recuaram para as aldeias deles. Mas vão chamar os parentes.' },
          { who: 'Guerreiro de tacape', unit: 'warrior', text: 'E da próxima vez é a nossa aldeia que eles vão cercar.' }
        ] }
    ]
  },
  {
    number: 4, title: 'O cerco da aldeia', year: 'antes de 1500', kind: 'rts',
    summary: 'Os tupiniquins e os aliados cercam a aldeia com caiçás, que verdes não se rompem, e vivem do mantimento que chega pelo mar. Afunde as igaras de carga, rompa as caiçás secas e derrube o principal deles.',
    start: { food: 250, wood: 350, rifles: 60, hall: true, workers: 8, preacher: true, hour: 6.4, home: 'A aldeia cercada', heroes: ['principal', 'matador', 'velha'],
      units: [['warrior', 6], ['rifleman', 6], ['spearman', 3]],
      buildings: [...ALDEIA, { kind: 'tower', ...near('serra', 140, 40) }, { kind: 'tower', ...near('rio', 140, -40) },
        { kind: 'tower', ...near('praia', 120, 40) }] },
    build: null, train: null,
    enemy: {
      buildings: CAICAS.map(spot => ({ kind: 'tower', ...spot, tag: 'caica', armor: .08 })),
      guards: [
        ...CAICAS.map(spot => ({ type: 'private', count: 2, x: spot.x + (410 - spot.x) * -.12, y: spot.y + (410 - spot.y) * -.12, spread: 16, tag: 'cerco' })),
        { type: 'bayonet', count: 4, ...around(250, HALF * .6 + 34), spread: 25, tag: 'cerco' },
        { type: 'officer', count: 1, ...around(250, HALF * .6 + 42), spread: 0, tag: 'chefe' }
      ]
    },
    raids: [
      { from: 'praia', at: 12, every: 22, times: 9, boats: 1, tag: 'mantimento', text: 'Uma igara de mantimento encalha na praia' },
      { from: 'serra', at: 40, every: 50, roster: [['bayonet', 3], ['private', 2]], grow: .12, tag: 'cerco', text: 'Os contrários descem a trilha da serra contra a cerca' },
      { from: 'rio', at: 70, every: 60, roster: [['bayonet', 2], ['private', 2], ['gunner', 1]], grow: .12, tag: 'cerco', text: 'Guerreiros com tições atravessam o rio' },
      { from: 'praia', at: 95, every: 80, roster: [['bayonet', 3], ['private', 3]], grow: .1, tag: 'cerco', text: 'Igaras de guerra na enseada!' }
    ],
    script: [
      { at: 3, say: [
        { who: 'Principal aliado', unit: 'principal', text: 'Eles levantaram as caiçás de noite, em volta de tudo. Enquanto a rama estiver verde, não há quem rompa.' },
        { who: 'Matador de muitos nomes', unit: 'matador', text: 'Mas comem do que chega pelo mar. Sem mantimento, ninguém sustenta um cerco.' }
      ] },
      { at: 60, weaken: { tag: 'caica', life: .5, armor: 1 }, toast: 'A rama das caiçás secou: agora elas se rompem.' },
      { at: 70, say: [{ who: 'Velha curandeira', unit: 'velha', text: 'De noite eles gritam roncarias do lado de lá. É medo de fome.' }] }
    ],
    sequential: true,
    objectives: [
      { id: 'mantimento', type: 'kill', tag: 'mantimento', count: 3, text: 'Afunde 3 igaras de mantimento na praia',
        hint: 'As igaras de carga encalham vazias de guerreiros na areia, ao sul. Escolha guerreiros e toque na canoa para atacá-la.',
        then: [{ say: [{ who: 'Principal aliado', unit: 'principal', text: 'Três canoas no fundo. Agora a fome é deles.' }] }] },
      { type: 'destroy', tag: 'caica', count: 4, text: 'Rompa 4 caiçás',
        hint: 'Verde, a caiçá quase não sente golpe; quando a rama seca, cai. Junte os de tacape numa só, com os flecheiros atrás contra quem a guarda.' },
      { type: 'kill', tag: 'chefe', text: 'Derrube o principal tupiniquim',
        hint: 'Ele fica atrás da caiçá do noroeste, com a guarda. Morto o principal, os de perto fogem.',
        then: [{ flee: true, toast: 'Morto o principal, os contrários levantam o cerco e fogem para as canoas!' }] }
    ],
    lose: { hall: true },
    defeat: { hall: 'A casa do principal caiu.' },
    story: ['principal', 'igaras'],
    intro: [
      { at: MIDDLE, zoom: 1.3, pan: CAICAS[2], kicker: 'A aldeia, de manhã', title: 'As caiçás',
        text: 'Os tupiniquins vieram com os aliados e não deram o salto: cercaram a aldeia com as suas caiçás, de rama e espinhos amarrados com madeira, e ficaram ali, gritando de noite, esperando a fome de dentro chegar antes da de fora.',
        quote: { text: 'fazem-lhes por de redor outra contracerca de rama e espinhos muito liada com madeira que metem no chão, a que chamam caiçá, pela qual enquanto verde não há coisa que os rompa', cite: SOARES('CLXVIII') },
        lines: [
          { who: 'Principal tupiniquim', unit: 'chefe', text: 'Ninguém sai, ninguém entra. Quem tem farinha, espera.' }
        ] },
      { at: near('praia', 220), zoom: 1.4, kicker: 'A enseada', title: 'As igaras',
        text: 'O mantimento de quem cerca chega pelo mar, nas canoas cavadas num tronco só.',
        quote: { text: 'são grandes remadores, assim nas suas canoas, que fazem de um só pau, que remam em pé vinte e trinta índios, com o que as fazem voar', cite: SOARES('CLX') },
        lines: [
          { who: 'Principal aliado', unit: 'principal', text: 'Viemos ao socorro, como se faz entre parentes. Quem lutar perto de mim não recua.' },
          { who: 'Velha curandeira', unit: 'velha', text: 'E quem cair ferido, tragam para perto de mim. Tenho as ervas da mata.' }
        ] }
    ],
    outro: [
      { at: MIDDLE, zoom: 1.4, kicker: 'O cerco levantado', title: 'A aldeia resiste',
        text: 'Sem mantimento, com as caiçás rompidas e o principal morto, os contrários voltaram às suas canoas. Era assim a guerra entre as aldeias, de vingança em vingança, havia gerações.',
        quote: { text: 'de noite falam mil roncarias, e jogam as pulhas de parte a parte, até que os tupinambás abalroam a cerca ou levantam cerco, se se não atrevem com ele, ou por lhes faltar o mantimento.', cite: SOARES('CLXVIII') } },
      { at: near('praia', 230), zoom: 1.3, kicker: 'Porto Seguro · abril de 1500', title: 'O que veio pelo mar',
        text: 'Em abril de 1500, a armada de Pedro Álvares Cabral chegou à costa da Bahia. O que veio depois foi o fim deste mundo: o ferro, o comércio de pau-brasil, a escravidão e as epidemias. Hoje vivem no Brasil povos que descendem desta gente, como os Tupinambá de Olivença, na Bahia, e os Tupiniquim, no Espírito Santo.',
        quote: { text: 'Nem há aqui boi ou vaca, cabra, ovelha ou galinha, ou qualquer outro animal que esteja acostumado ao viver do homem.', cite: CAMINHA } }
    ]
  }
]);

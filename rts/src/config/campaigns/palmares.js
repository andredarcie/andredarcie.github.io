// A campanha de Palmares (1645–1694), em 4 missões que seguem a guerra, cada uma no
// seu lugar (config/maps.js) e com a mecânica do que aconteceu ali:
//   1. O Palmares Grande (1645, tutorial): o mocambo se ergue; chega de Alagoas o
//      aviso da expedição holandesa; a gente se interna no mato e a patrulha, que só
//      acha casas vazias, é fustigada na mata.
//   2. As prêsas (década de 1670): de noite, descer ao engenho do outro lado do
//      Mundaú, abrir a senzala e voltar com os libertos antes de clarear.
//   3. Subupira (1677): Fernão Carrilho vem por Porto Calvo; o povo vai para a mata,
//      a cidade é queimada pelos próprios palmarinos e as tropas que "batem o mato"
//      são fustigadas até a deserção.
//   4. A cerca do Macaco (1694): a contra-cerca se fecha em volta da serra; resistir e
//      tirar Zumbi pela brecha.
//
// As cenas são personagens conversando (ui/Cutscene.js): `lines` são as falas, cada
// uma de quem (`who`) e, se ele está no mapa, de que unidade (`unit`: tipo ou marca);
// `cast` põe na cena quem só existe nela. As falas com `cite` foram registradas na
// época (copiadas do texto integral de Edison Carneiro, O Quilombo dos Palmares,
// 1958, na grafia da edição); as outras são imaginadas a partir do que os documentos
// contam, e a cena avisa isso. Durante a partida, `say` continua a conversa.
import { near, around, spot, HALF, MIDDLE } from './places.js';

const BOOK = 'Edison Carneiro, <cite>O Quilombo dos Palmares</cite>';
const RELACAO = '<cite>Relação das guerras feitas aos Palmares</cite> (1678)';
const BLAER = '<cite>Diário da viagem do capitão João Blaer aos Palmares</cite> (1645)';
const quoted = who => `${who}, citado em ${BOOK}`;

// O mocambo já crescido das missões de depois: casas de palha, roça, forja.
const MOCAMBO = [
  { kind: 'house', ...around(250, 150) }, { kind: 'house', ...around(290, 150) },
  { kind: 'roca', ...around(20, 170) }, { kind: 'camp', ...around(200, 150) }
];
// Os lugares em frações do lado (places.spot): cada missão tem o tamanho dela
// (config/maps.js), e estes só valem no cenário da missão que os usa.
const ENGENHO = spot(.87, .27);
const SENZALA = spot(.88, .37);
// O esconderijo de 1645, nas roças do rei, a leste ("duas milhas" adiante).
const ROCAS = near('roca', 330);
// A mata do Satuba, do outro lado do ribeiro, para onde vai o povo de Subupira.
const SATUBA = spot(.09, .42);
// A brecha da contra-cerca, no pé da serra, a sudeste, à beira do Mundaú.
const BRECHA = spot(.83, .9);
// A contra-cerca de 1694: estacas que vão fechando o anel em volta da cerca do
// Macaco, de noite, deixando por último o canto da brecha (sudeste). Os ângulos fogem
// dos caminhos (0, 90, 180 e 270 graus), para a estaca não nascer em cima da trilha.
const contraCerca = angles => angles.map(angle => ({ team: 'enemy', kind: 'tower', ...around(angle, HALF * .55), tag: 'contracerca' }));

export const CAMPAIGN = Object.freeze([
  {
    number: 1, title: 'O Palmares Grande', year: '1645', kind: 'rts', tutorial: true,
    summary: 'Gente fugida dos engenhos ergue o mocambo na mata. Quando chega de Alagoas o aviso da expedição holandesa, interne o povo no mato e fustigue a patrulha.',
    start: { food: 220, wood: 260, rifles: 0, hall: true, workers: 6, workersTag: 'povo', preacher: true, hour: 6.8, home: 'O Palmares Grande' },
    build: ['tower', 'house', 'roca', 'camp'], train: ['warrior', 'archer'],
    sequential: true,
    script: [
      { at: 3, say: [
        { who: 'Palmarino', unit: 'worker', text: 'Aqui o feitor não acha a gente. Mas casa e roça não se fazem sozinhas.' },
        { who: 'Pároco do Macaco', unit: 'paroco', text: 'Primeiro a lenha. Quem chegou por conta própria trabalha por conta própria.' }
      ] }
    ],
    objectives: [
      { type: 'gather', resource: 'wood', amount: 150, gain: true, text: 'Corte 150 de lenha na mata',
        hint: 'Toque num palmarino e depois numa árvore. Para escolher vários, segure e arraste. Eles levam a lenha à Casa do Conselho.' },
      { type: 'build', kind: 'roca', count: 1, text: 'Abra uma roça de milho',
        hint: 'Com um palmarino escolhido, toque em "Roça de milho" no painel de baixo e depois no chão. O milho era "o seu principal sustento": a roça dá comida sozinha.' },
      { type: 'build', kind: 'camp', count: 1, text: 'Erga a forja',
        hint: 'Os holandeses acharam quatro forjas no Palmares Grande. Nela se fazem as armas.' },
      { id: 'guerreiros', type: 'units', unit: 'army', count: 3, text: 'Prepare três guerreiros',
        hint: 'Toque na forja e escolha guerreiros de espada ou flecheiros.',
        then: [
          { spawnPlayer: [{ type: 'worker', count: 1, ...near('alagoas', 320), tag: 'aviso', route: { path: [{ x: MIDDLE.x - 30, y: MIDDLE.y + 15 }] } }],
            toast: 'Um mensageiro chega correndo pelo caminho de Alagoas.', focus: near('alagoas', 300) },
          { say: [
            { who: 'Mensageiro de Alagoas', unit: 'aviso', text: 'Os holandeses saíram de Alagoas para a mata, com índios na frente. Daqui a uns dias estão aqui.' },
            { who: 'Pároco do Macaco', unit: 'paroco', text: 'Então fechem a porta de oeste e semeiem os estrepes. E o povo vai para as roças do rei.' }
          ] }
        ] },
      { type: 'build', kind: 'tower', count: 1, text: 'Feche a porta de oeste com a cerca e os estrepes',
        hint: 'Erga a "Cerca de pau a pique" perto do caminho de Alagoas, a oeste: é por ali que eles vêm. Os estrepes no chão em volta seguram quem passa.' },
      { id: 'mato', type: 'reach', ...ROCAS, radius: 75, count: 5, tag: 'povo', text: 'Interne o povo no mato, nas roças do rei',
        hint: 'Escolha os palmarinos (segure e arraste sobre eles) e toque nas roças a leste, onde a trilha sai do mapa. A casa pode ficar vazia: casa de palha se ergue de novo.',
        deadline: 110, late: 'A patrulha holandesa chegou com o povo ainda no mocambo.',
        then: [
          { spawnEnemy: [{ type: 'private', count: 3, from: 'alagoas', tag: 'patrulha' }, { type: 'bayonet', count: 3, from: 'alagoas', tag: 'patrulha' }],
            toast: 'A patrulha holandesa arromba a porta ocidental!', focus: near('alagoas', 200) },
          { say: [{ who: 'Guerreiro', unit: 'warrior', text: 'Achar, eles vão achar casa vazia. Nós ficamos no mato, esperando.' }] }
        ] },
      { type: 'kill', tag: 'patrulha', count: 4, text: 'Fustigue a patrulha na mata: derrube 4',
        hint: 'Parados no meio do mato, os guerreiros ficam de tocaia e o primeiro golpe vale mais. Deixe a patrulha vir até vocês.',
        then: [{ flee: 'patrulha', toast: 'A patrulha volta para Alagoas sem prender ninguém de importância.' }] }
    ],
    lose: { min: { tag: 'povo', count: 3 } },
    defeat: { min: 'Quase todo o povo do mocambo caiu nas mãos dos holandeses.' },
    story: ['palmares', 'holandeses'],
    intro: [
      { at: MIDDLE, zoom: 1.4, kicker: 'Serra da Barriga · década de 1640', title: 'Os Palmares',
        text: 'Gente escravizada nos engenhos de açúcar de Pernambuco fugia para as serras de mata fechada do interior. Ali erguia mocambos: casas de palha, roças de milho, uma cerca. O lugar tirou o nome das palmeiras.',
        quote: { text: 'estende-se pela parte superior do rio São Francisco uma corda de mata brava, que vem a fazer têrmo sôbre o sertão do cabo de Santo Agostinho, correndo quase norte a sul, do mesmo modo que corre a costa do mar; são as árvores principais palmeiras agrestes, que deram ao terreno o nome de Palmares', cite: RELACAO },
        lines: [
          { who: 'Palmarino', unit: 'worker', text: 'A palmeira dá de tudo: casa, cama, azeite.' },
          { who: 'Pároco do Macaco', unit: 'paroco', text: 'Quem chega aqui por conta própria é livre. Agora, que se trabalhe.' }
        ] },
      { at: near('alagoas', 330), pan: near('alagoas', 160), zoom: 1.3, kicker: 'Alagoas · fevereiro de 1645', title: 'A expedição de Blaer',
        text: 'Os holandeses, que ocupavam Pernambuco desde 1630, mandaram o capitão João Blaer contra os Palmares, com soldados e índios. Doente, Blaer voltou no caminho, e o tenente Jürgens Reijmbach seguiu no comando, escrevendo um diário de cada dia de marcha.',
        cast: [
          { type: 'officer', team: 'enemy', ...near('alagoas', 395), walk: near('alagoas', 345), tag: 'reijmbach' },
          { type: 'private', team: 'enemy', count: 3, ...near('alagoas', 405), walk: near('alagoas', 360), spread: 24 }
        ],
        lines: [
          { who: 'Tenente Jürgens Reijmbach', unit: 'reijmbach', text: 'O guia diz que o Palmares Grande fica a leste, depois do velho, que eles largaram.' },
          { who: 'Soldado holandês', unit: 'private', text: 'Tenente, nesta mata a gente anda um dia inteiro e não vê o sol.' }
        ] }
    ],
    outro: [
      { at: MIDDLE, zoom: 1.5, kicker: 'Palmares · 21 a 23 de março de 1645', title: 'Casas vazias',
        text: 'Os quilombolas tinham sido avisados, de Alagoas, da vinda dos holandeses, e a maior parte se internara no mato dias antes. A expedição arrombou a porta, caiu nos estrepes, achou o mocambo vazio e o queimou.',
        quote: { text: 'A nossa gente regressou à tarde sem nada ter conseguido', cite: BLAER },
        lines: [
          { who: 'Guerreiro', unit: 'warrior', text: 'Queimaram as casas e foram embora.' },
          { who: 'Pároco do Macaco', unit: 'paroco', text: 'Casa de palha se ergue de novo. A gente, não.' }
        ] },
      { at: MIDDLE, zoom: 1.3, kicker: 'O Palmares Grande', title: 'O que eles viram',
        text: 'O diário da expedição deixou a melhor descrição de um mocambo dos Palmares: a rua de meia milha, as portas de paliçada dupla, o fosso de estrepes. Os palmarinos reergueram tudo, e os mocambos cresceram.',
        quote: { text: 'as casas eram em número de 220 e no meio delas erguia-se uma igreja, quatro forjas e uma grande casa de conselho; havia entre os habitantes tôda sorte de artífices', cite: BLAER } }
    ]
  },
  {
    number: 2, title: 'As prêsas', year: 'década de 1670', kind: 'rts',
    summary: 'De noite, desça ao engenho do outro lado do Mundaú, abra a senzala e traga os libertos para a mata antes de clarear.',
    start: { food: 150, wood: 200, rifles: 2, hall: true, workers: 5, preacher: true, heroes: ['zumbi'], hour: 21, skyScale: .2,
      units: [['warrior', 4], ['archer', 4], ['spearman', 2]], buildings: MOCAMBO },
    build: null, train: null,
    enemy: {
      buildings: [
        { kind: 'engenho', ...ENGENHO, tag: 'engenho' }, { kind: 'senzala', ...SENZALA, tag: 'senzala', armor: .5 }
      ],
      guards: [
        { type: 'private', count: 5, ...{ x: ENGENHO.x + 5, y: ENGENHO.y + 40 }, spread: 45, tag: 'engenho', asleep: true },
        { type: 'officer', count: 1, ...{ x: ENGENHO.x + 12, y: ENGENHO.y + 22 }, spread: 0, tag: 'capitao', asleep: true },
        { type: 'private', count: 2, ...spot(.8, .33), spread: 25, tag: 'engenho', sentry: true }
      ]
    },
    alarm: 'Um vigia dispara para o alto: o engenho acorda!',
    raids: [
      { from: ENGENHO, after: 'senzala', at: 6, every: 26, times: 5, roster: [['private', 3], ['bayonet', 2]], grow: .15, text: 'A gente do engenho sai atrás dos fugidos' }
    ],
    script: [
      { at: 3, say: [
        { who: 'Zumbi', unit: 'zumbi', text: 'Sem fogo e sem barulho até o rio. Os vigias ficam do lado de cá da casa-grande.' }
      ] }
    ],
    sequential: true,
    objectives: [
      // "A senzala está trancada": é preciso arrombá-la, e o barulho acorda o engenho.
      { id: 'senzala', type: 'destroy', tag: 'senzala', text: 'Arrombe a senzala do engenho',
        hint: 'Atravesse o Mundaú de noite e bata na senzala com os guerreiros de espada. Os soldados do engenho dormem, mas o barulho acorda todos; os dois vigias perto do rio dão o alarma se virem vocês.',
        then: [
          { spawnPlayer: [{ type: 'worker', count: 8, x: SENZALA.x - 30, y: SENZALA.y, tag: 'libertos' }] },
          { toast: 'Oito pessoas largam a senzala e seguem os palmarinos!', focus: SENZALA },
          { say: [
            { who: 'Liberta', unit: 'libertos', text: 'Para onde a gente vai?' },
            { who: 'Zumbi', unit: 'zumbi', text: 'Para a serra. Lá em cima ninguém é dono de ninguém. Corram, que o dia vem.' }
          ] }
        ] },
      { type: 'reach', x: MIDDLE.x, y: MIDDLE.y, radius: 110, count: 6, tag: 'libertos', text: 'Leve ao menos 6 libertos ao mocambo antes de clarear',
        hint: 'Escolha os libertos (segure e arraste sobre eles) e toque perto da Casa do Conselho. Os guerreiros cobrem a retirada.',
        deadline: 210, late: 'O dia clareou com os libertos ainda no caminho, e a gente do engenho os alcançou.' }
    ],
    lose: { hall: true, min: { tag: 'libertos', count: 6 } },
    defeat: { hall: 'A Casa do Conselho caiu.', min: 'Não sobraram libertos bastantes para chegar à mata.' },
    intro: [
      { at: MIDDLE, zoom: 1.5, kicker: 'Palmares · década de 1670', title: 'As prêsas',
        text: 'Os palmarinos desciam da serra aos engenhos e às vilas e voltavam com gente para a mata. Os senhores chamavam isso de roubo; para quem saía da senzala, era a liberdade.',
        quote: { text: 'uns levados do amor da liberdade, outros do mêdo do castigo, alguns induzidos pelos mesmos negros, e muitos roubados na campanha por êles', cite: quoted('Documento da guerra palmarina') },
        lines: [
          { who: 'Zumbi', unit: 'zumbi', text: 'Do outro lado do Mundaú tem um engenho. Na senzala tem gente esperando.' },
          { who: 'Guerreiro', unit: 'warrior', text: 'Os homens do senhor guardam a casa-grande.' },
          { who: 'Zumbi', unit: 'zumbi', text: 'De noite eles dormem. A gente chega pela mata, abre a senzala e volta antes do sol.' }
        ] },
      { at: spot(.8, .33), pan: SENZALA, zoom: 1.7, kicker: 'Além do Mundaú', title: 'O engenho',
        text: 'A leste, do outro lado do rio, fica um engenho: a casa-grande, a senzala e os homens armados do senhor. Só dois vigias acordados, olhando para a mata.',
        lines: [
          { who: 'Capitão do engenho', unit: 'capitao', text: 'Olho na mata. Os negros dos Palmares descem de noite.' },
          { who: 'Vigia', unit: 'engenho', text: 'A senzala está trancada, capitão. Daqui ninguém foge.' }
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
    number: 3, title: 'Subupira', year: 'outubro de 1677', kind: 'rts',
    summary: 'Fernão Carrilho vem por Porto Calvo atrás da "segunda cidade" dos Palmares. Leve o povo para a mata do Satuba, deixe a tropa achar só cinzas e fustigue quem vier bater o mato.',
    start: { food: 150, wood: 200, rifles: 2, hall: true, hallTag: 'subupira', workers: 10, workersTag: 'povo', preacher: false, hour: 17, skyScale: .5, home: 'Subupira',
      heroes: ['zumbi', 'ganazona'], units: [['warrior', 4], ['archer', 6], ['spearman', 2]],
      buildings: [
        ...[250, 290, 160, 20].map(angle => ({ kind: 'house', ...around(angle, 150), tag: 'subupira' })),
        { kind: 'camp', ...around(200, 150), tag: 'subupira' },
        { kind: 'tower', ...near('portocalvo', 125, 38), tag: 'subupira' }, { kind: 'tower', ...near('portocalvo', 125, -38), tag: 'subupira' },
        { kind: 'tower', ...near('alagoas', 125, 38), tag: 'subupira' }
      ] },
    build: ['tower'], train: ['warrior', 'archer', 'spearman'],
    script: [
      { at: 3, say: [
        { who: 'Gana-Zona', unit: 'ganazona', text: 'Os presos de Aqualtune contaram a Carrilho onde estamos. Ele vem por Porto Calvo.' },
        { who: 'Zumbi', unit: 'zumbi', text: 'Então ele não acha nada: nem gente, nem casa.' }
      ] },
      { at: 75, spawnEnemy: [{ type: 'private', count: 6, from: 'portocalvo', tag: 'batedores' }, { type: 'bayonet', count: 4, from: 'portocalvo', tag: 'batedores' }],
        toast: 'A tropa de Fernão Carrilho entra pelo caminho de Porto Calvo!', focus: near('portocalvo', 260) },
      { after: 'mata', at: 1, burn: 'subupira', toast: 'Subupira arde: a tropa só vai achar "as cinzas ainda quentes do mocambo".', focus: MIDDLE },
      { after: 'mata', at: 15,
        // "fortificou-se em baterias" (Carneiro): estacadas da tropa em cima das cinzas.
        spawnBuilding: [{ kind: 'tower', ...around(270, 30), tag: 'arraial' }, { kind: 'tower', ...around(30, 48), tag: 'arraial' }, { kind: 'tower', ...around(150, 48), tag: 'arraial' }],
        say: [{ who: 'Guerreiro', unit: 'warrior', text: 'Carrilho assentou arraial em cima das cinzas. Agora vai mandar gente bater o mato.' }] }
    ],
    raids: [
      { from: around(45, 15), after: 'mata', at: 18, every: 22, times: 9, roster: [['private', 2], ['bayonet', 2]], tag: 'batedores',
        text: 'Uma tropa sai do arraial de Carrilho a bater o mato' }
    ],
    sequential: true,
    objectives: [
      { id: 'mata', type: 'reach', ...SATUBA, radius: 80, count: 8, tag: 'povo', text: 'Leve o povo de Subupira para a mata do Satuba',
        hint: 'Escolha os palmarinos (segure e arraste) e toque na mata do outro lado do ribeiro, a oeste. Quando o povo sair, a cidade é queimada.',
        deadline: 105, late: 'A tropa de Carrilho chegou a Subupira com o povo ainda dentro.' },
      { type: 'kill', tag: 'batedores', count: 18, text: 'Fustigue quem vier bater o mato: derrube 18',
        hint: 'Os guerreiros parados no mato ficam de tocaia. Os flecheiros de longe, os de espada para o corpo a corpo. Não deixe a tropa chegar ao povo nem a Gana-Zona.',
        then: [
          { flee: true, toast: '"Outros 25 desertavam": a tropa de Carrilho se desfaz no mato.' },
          { say: [
            { who: 'Gana-Zona', unit: 'ganazona', text: 'Desta vez a mata foi nossa.' },
            { who: 'Zumbi', unit: 'zumbi', text: 'Desta. Mas pegaram gente nossa no Amaro, e o rei fugiu ferido. Eles voltam.' }
          ] }
        ] }
    ],
    lose: { units: ['ganazona', 'zumbi'], min: { tag: 'povo', count: 5 } },
    defeat: { units: 'Caiu um dos chefes dos Palmares.', min: 'A tropa alcançou o povo de Subupira na mata.' },
    story: ['carrilho'],
    intro: [
      { at: MIDDLE, zoom: 1.5, kicker: 'Subupira · outubro de 1677', title: 'A segunda cidade',
        text: 'Subupira, entre os ribeiros Paraibinha e Satuba, era onde os palmarinos treinavam para a guerra. O chefe era Gana-Zona, irmão do rei Ganga-Zumba e presidente do conselho dos Palmares.',
        quote: { text: 'uma grande cidade muito fortificada na distância de três montes, de pau a pique, com baterias de pedra, e madeira', cite: quoted('Documento da entrada de 1677') },
        lines: [
          { who: 'Gana-Zona', unit: 'ganazona', text: 'Carrilho já caiu sobre o mocambo de Aqualtune, a mãe do rei. O rei fugiu.' },
          { who: 'Zumbi', unit: 'zumbi', text: 'Aqui ele não vai brigar com a cerca. Vai brigar com a mata.' }
        ] },
      { at: near('portocalvo', 330), pan: near('portocalvo', 180), zoom: 1.4, kicker: 'Porto Calvo · setembro de 1677', title: 'Fernão Carrilho',
        text: 'O capitão-mor Fernão Carrilho saiu de Porto Calvo com 185 homens, brancos e índios de Filipe Camarão, em vez dos 400 prometidos pelo governador. Na orla da mata, falou à tropa.',
        cast: [
          { type: 'officer', team: 'enemy', ...near('portocalvo', 360), walk: near('portocalvo', 330), tag: 'carrilho' },
          { type: 'private', team: 'enemy', count: 4, ...near('portocalvo', 380), walk: near('portocalvo', 350), spread: 26 }
        ],
        lines: [
          { who: 'Fernão Carrilho', unit: 'carrilho', text: 'que os negros pelejavam como fugidos, que êles os iam buscar como senhores', cite: `${quoted('Fernão Carrilho, à tropa (1677)')} · em discurso indireto` }
        ] }
    ],
    outro: [
      { at: MIDDLE, zoom: 1.5, kicker: 'Subupira · outubro de 1677', title: 'As cinzas',
        text: 'A tropa achou Subupira em cinzas, assentou arraial em cima delas e mandou gente bater o mato. Muitos não voltaram, e outros desertaram. Mas Carrilho seguiu com os que restaram: no mocambo do Amaro prendeu dois filhos do rei, e o próprio Ganga-Zumba escapou ferido de flecha.',
        quote: { text: 'podendo mais o desabrido do sítio para os levar que o brio da emprêsa para os deter', cite: quoted('Documento da entrada de 1677') },
        lines: [{ who: 'Gana-Zona', unit: 'ganazona', text: 'O rei está cansado. Vai querer a paz.' }] },
      { at: MIDDLE, zoom: 1.4, kicker: 'Recife · junho de 1678', title: 'A paz de Ganga-Zumba',
        text: 'Em 1678 o Ganga-Zumba mandou os filhos ao Recife pedir a paz, e foi morar no Cucaú. Pelos termos dela, quem tinha fugido para os Palmares seria devolvido aos senhores. Zumbi não aceitou, e passou a comandar os Palmares.',
        lines: [
          { who: 'Os filhos de Ganga-Zumba, no Recife', text: 'estavam sem cidades, sem mantimentos, sem mulheres, nem filhos', cite: `${RELACAO} · em discurso indireto` },
          { who: 'Zumbi', unit: 'zumbi', text: 'Paz que devolve os fugidos aos senhores não é paz. Eu fico na serra.' }
        ] }
    ]
  },
  {
    number: 4, title: 'A cerca do Macaco', year: 'janeiro e fevereiro de 1694', kind: 'rts',
    summary: 'Três mil homens cercam o alto da serra da Barriga e erguem a contra-cerca. Resista ao cerco e tire Zumbi pela brecha antes que ela se feche.',
    start: { food: 300, wood: 400, rifles: 6, hall: true, workers: 8, preacher: true, heroes: ['zumbi'], hour: 15,
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
      { from: 'roads', at: 15, every: 28, roster: [['private', 3], ['bayonet', 3], ['gunner', 1]], grow: .15, text: 'A tropa sobe a serra contra a cerca' },
      { from: 'edges', at: 45, every: 45, roster: [['private', 2], ['bayonet', 2]], grow: .1, text: 'Os paulistas sobem pela mata' },
      { from: 'alagoas', at: 60, every: 80, roster: [['matadeira', 1], ['private', 2]], text: 'A artilharia sobe pelo caminho das Alagoas' }
    ],
    script: [
      { at: 4, say: [
        { who: 'Zumbi', unit: 'zumbi', text: 'Lá embaixo eles cercam a serra inteira. Aqui em cima temos água e as três cercas.' },
        { who: 'Guerreiro', unit: 'warrior', text: 'Os estrepes estão no chão, general, até onde a vista alcança.' }
      ] },
      { at: 25, spawnBuilding: contraCerca([150, 165, 195, 210]), toast: 'De noite, os sitiantes levantam a contra-cerca a oeste.' },
      { at: 50, spawnBuilding: contraCerca([240, 255, 285, 300]), toast: 'A contra-cerca avança pelo norte.' },
      { at: 80, spawnBuilding: contraCerca([315, 330, 15, 105, 120, 135]), toast: 'A contra-cerca fecha o leste e o sul. Só o canto do precipício segue aberto.' },
      { at: 88, say: [
        { who: 'Zumbi', unit: 'zumbi', text: '"E tu deixaste fazer essa cêrca aos brancos? Amanhã seremos entrados, e mortos, e nossas mulheres e filhos cativos!"', cite: quoted('Domingos Jorge Velho') }
      ] }
    ],
    sequential: true,
    objectives: [
      { type: 'survive', seconds: 100, text: 'Resista ao cerco',
        hint: 'As cercas com estrepes seguram a tropa; mande palmarinos consertar o que quebrar. A contra-cerca deles atira: não deixe a sua gente parada perto dela.',
        then: [{ toast: 'A contra-cerca tem uma brecha no pé da serra, à beira do precipício! Zumbi precisa sair por ela.', focus: BRECHA },
          { say: [{ who: 'Chefe do posto', unit: 'spearman', text: 'General, no pé da serra, do lado do abismo, a cerca deles ainda não fechou.' }] }] },
      { type: 'reach', x: BRECHA.x, y: BRECHA.y, radius: 70, count: 10, must: 'zumbi', text: 'Leve Zumbi e mais 9 palmarinos até a brecha',
        hint: 'Junte Zumbi e um grupo (segure e arraste), desça a serra, passe pelas sentinelas e chegue à brecha. A Casa do Conselho pode cair: o que importa é sair.',
        deadline: 75, late: 'A contra-cerca se fechou de vez antes de Zumbi chegar à brecha.' }
    ],
    lose: { hall: false, units: ['zumbi'], min: { count: 10 } },
    defeat: { units: 'Zumbi caiu na serra da Barriga.', min: 'Não sobrou gente bastante para romper o cerco.' },
    story: ['cerco'],
    intro: [
      { at: MIDDLE, zoom: 1.4, kicker: 'Serra da Barriga · janeiro de 1694', title: 'A cerca do Macaco',
        text: 'Contratados pelo governo, os bandeirantes de Domingos Jorge Velho, com as tropas das Alagoas e de Pernambuco — cerca de três mil homens —, cercaram o alto da serra. Pela primeira vez em toda a guerra dos Palmares trouxeram artilharia.',
        lines: [
          { who: 'Domingos Jorge Velho', text: 'se tinha fortificado com uma triplicada cêrca no cume da . . . Serra [do Barriga], lugar forte por natureza, e com água perene dentro', cite: quoted('Domingos Jorge Velho, em relato ao rei') },
          { who: 'Zumbi', unit: 'zumbi', text: 'Daqui de cima a gente vê eles chegando. Ninguém sobe esta serra sem pagar caro.' }
        ] },
      { at: spot(.7, .8), pan: BRECHA, zoom: 1.5, kicker: 'A contra-cerca', title: 'O cerco se fecha',
        text: 'Os sitiantes começaram a levantar uma contra-cerca em volta da dos palmarinos e, de noite, uma cerca oblíqua até a beira de um precipício. Num canto, junto do abismo, ela ainda não se fechava.' }
    ],
    outro: [
      { at: BRECHA, zoom: 1.6, kicker: 'Madrugada de 6 de fevereiro de 1694', title: 'A brecha',
        text: 'Zumbi rompeu o cerco com a sua gente pela brecha. Na escuridão, à beira do abismo, cerca de duzentos palmarinos caíram no precipício e centenas foram presos. Zumbi foi ferido, mas escapou.',
        lines: [{ who: 'Zumbi', unit: 'zumbi', text: 'Pela beira, sem barulho. Quem passar, não para.' }] },
      { at: MIDDLE, zoom: 1.3, kicker: '20 de novembro de 1695', title: 'Zumbi',
        text: 'Zumbi continuou a luta na mata por quase dois anos, até ser traído e morto. A cabeça dele foi exposta no Recife, para provar que não era imortal. Hoje, 20 de novembro é o Dia Nacional de Zumbi e da Consciência Negra.',
        lines: [{ who: 'Domingos Jorge Velho', text: 'os tais negros . . . sempre serão 30 vêzes 30, pelo menos', cite: quoted('Domingos Jorge Velho') }] }
    ]
  }
]);

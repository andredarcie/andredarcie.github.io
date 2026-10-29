// A campanha de Canudos (1893–1897), em 4 missões que seguem a guerra, cada uma no
// seu lugar (config/maps.js) e com a mecânica do que aconteceu ali:
//   1. Belo Monte (1893, tutorial): a força da polícia alcança a romaria em Maceté, a
//      gente chega à tapera, reergue a igreja velha e levanta as casas.
//   2. Uauá (1896): a procissão de madrugada contra a tropa que dormia no povoado; a
//      cruz e a bandeira do Divino na frente, e a tropa recua depois das dez mortes.
//   3. Moreira César (1897): aguentar o assalto, derrubar o coronel quando ele desce
//      para "dar brio" à tropa, tomar os quatro Krupps e recolher as armas largadas.
//   4. A Favela (1897): o comboio de munição na retaguarda, os doze da Matadeira e o
//      assalto de 18 de julho. Fecha com 5 de outubro.
//
// As cenas são personagens conversando (ui/Cutscene.js): `lines` são as falas, cada
// uma de quem (`who`) e, se ele está no mapa, de que unidade (`unit`: tipo ou marca),
// para a câmera ir até ele; `cast` põe na cena quem só existe nela (o coronel na
// estrada). As falas com `cite` foram registradas na época (copiadas do texto
// integral de Os Sertões, edição do Wikisource); as outras são imaginadas a partir do
// que os documentos contam, e a cena avisa isso. Durante a partida, `say` (no
// roteiro `script` ou no `then` de um objetivo) continua a conversa sem parar o jogo.
import { near, around, spot, MIDDLE } from './places.js';

const EUCLIDES = part => `Euclides da Cunha, <cite>Os Sertões</cite> · ${part}`;

// O arraial crescido da 4ª missão: casas, curral, acampamento.
const ARRAIAL = [
  { kind: 'house', ...around(250, 150) }, { kind: 'house', ...around(290, 150) },
  { kind: 'house', ...around(20, 165) }, { kind: 'house', ...around(160, 165) },
  { kind: 'curral', ...around(70, 175) }, { kind: 'camp', ...around(200, 150) }
];
// O arraial de março de 1897, mais cerrado: "dédalo desesperador de becos
// estreitíssimos" (O Homem, V), nos vãos entre as estradas.
const CASARIO = [
  ...[35, 55, 125, 145, 215, 235].map(angle => ({ kind: 'house', ...around(angle, 140) })),
  ...[20, 65, 110, 160, 200, 245, 290, 340].map(angle => ({ kind: 'house', ...around(angle, 205) }))
];
// Os lugares em frações do lado (places.spot): cada missão tem o tamanho dela
// (config/maps.js), e estes só valem no cenário da missão que os usa.
const FAVELA = spot(.71, .87);
const MATADEIRA = spot(.64, .78);
// Os Pelados, onde Moreira César assentou a artilharia (missão 3).
const PELADOS = spot(.81, .56);

export const CAMPAIGN = Object.freeze([
  {
    number: 1, title: 'Belo Monte', year: '1893', kind: 'rts', tutorial: true,
    summary: 'A polícia alcança a romaria do Conselheiro em Maceté. Repila a força, leve o povo à tapera de Canudos, reerga a igreja velha e levante as casas.',
    start: { food: 260, wood: 420, rifles: 5, hall: 'ruin', ruin: .5, at: spot(.5, .84), workers: 8, preacher: true,
      units: [['warrior', 3], ['spearman', 2]] },
    build: ['tower', 'house', 'curral', 'camp'], train: ['warrior', 'spearman'],
    sequential: true,
    script: [
      { at: 2, say: [
        { who: 'Sertanejo', unit: 'worker', text: 'Ouvi cavalo na estrada, lá atrás.' },
        { who: 'Jagunço', unit: 'warrior', text: 'É a polícia. Fiquem atrás de nós.' }
      ] },
      { at: 7, spawnEnemy: [{ type: 'private', count: 4, from: 'montesanto', tag: 'policia' }, { type: 'bayonet', count: 2, from: 'montesanto', tag: 'policia' }],
        toast: 'A força da polícia alcança a romaria!', focus: spot(.5, .93) }
    ],
    objectives: [
      { type: 'kill', tag: 'policia', count: 2, text: 'Repila a força da polícia',
        hint: 'Toque num jagunço para escolher; segure e arraste para escolher vários. Depois toque num soldado para atacar.',
        then: [
          { flee: 'policia', toast: 'A polícia foge — e o comandante na frente!' },
          { say: [
            { who: 'Jagunço', unit: 'warrior', text: 'Correram na primeira descarga, eles que vinham nos destroçar.' },
            { who: 'Antônio Conselheiro', unit: 'conselheiro', text: 'Agora seguimos para o norte. Lá ninguém vem nos buscar.' }
          ] }
        ] },
      { type: 'reach', ...MIDDLE, radius: 115, count: 10, unit: 'any', must: 'conselheiro', text: 'Leve a romaria e o Conselheiro à tapera de Canudos',
        hint: 'Escolha todos (segure e arraste sobre eles) e toque perto da igreja velha, no meio do mapa. Tocar no chão manda andar.',
        then: [{ say: [
          { who: 'Sertanejo', unit: 'worker', text: 'Lá está o campanário da capela velha.' },
          { who: 'Antônio Conselheiro', unit: 'conselheiro', text: 'Aqui vai ser Belo Monte. Primeiro, a casa de Deus.' }
        ] }] },
      { type: 'build', kind: 'hall', count: 1, text: 'Reerga a igreja velha de Santo Antônio',
        hint: 'Escolha os sertanejos e toque na igreja em ruína: eles batem o maço até ela ficar de pé.' },
      { id: 'lenha', type: 'gather', resource: 'wood', amount: 60, gain: true, text: 'Corte 60 de lenha na caatinga',
        hint: 'Escolha sertanejos e toque numa árvore. Eles levam a lenha até a igreja.' },
      { id: 'casas', type: 'build', kind: 'house', count: 2, text: 'Erga duas casas de taipa',
        hint: 'Com um sertanejo escolhido, toque em "Casa de taipa" no painel de baixo e depois no chão. Casa dá lugar a mais gente.' },
      { type: 'build', kind: 'curral', count: 1, text: 'Erga o curral de cabras',
        hint: 'Mande colher na roça de milho e mandioca. O curral dá comida sozinho, sem ninguém colhendo.' },
      { type: 'build', kind: 'camp', count: 1, text: 'Erga o acampamento da guarda',
        hint: 'É no acampamento que se armam os jagunços. Cada um leva um fuzil: você tem poucos.' }
    ],
    lose: { units: ['conselheiro'] },
    defeat: { units: 'Antônio Conselheiro caiu no caminho.' },
    story: ['canudos'],
    intro: [
      { at: spot(.5, .86), zoom: 1.5, kicker: 'Maceté, entre Tucano e Cumbe · 1893', title: 'A romaria',
        text: 'Em 1893, em Bom Conselho, Antônio Conselheiro mandou queimar numa fogueira, no largo, os editais de cobrança de impostos que as Câmaras tinham afixado. Saiu da vila com os seus — não passavam de duzentos — e a polícia da Bahia foi atrás deles.',
        quote: { text: 'As trinta praças, bem armadas, atacaram impetuosamente a turba de penitentes depauperados, certas de os destroçarem à primeira descarga. Deram, porém, de frente, com os jagunços destemerosos.', cite: EUCLIDES('O Homem') },
        cast: [{ type: 'private', team: 'enemy', count: 4, ...spot(.5, .99), walk: spot(.5, .96), tag: 'cenaPolicia' }],
        lines: [
          { who: 'Sertanejo', unit: 'worker', text: 'Conselheiro, a polícia vem atrás de nós.' },
          { who: 'Antônio Conselheiro', unit: 'conselheiro', text: 'Quem quiser, que fique. Quem vem comigo, não larga o caminho.' },
          { who: 'Jagunço', unit: 'warrior', text: 'Então eles vão ter de passar por nós.' }
        ] },
      { at: spot(.5, .78), pan: MIDDLE, zoom: 1.3, kicker: 'Rumo ao norte', title: 'A tapera',
        text: 'Depois de Maceté, o Conselheiro deixou os povoados e seguiu para o norte, para uma fazenda abandonada à beira do Vaza-Barris, que ele conhecia das romarias. No meio das casas velhas, ainda de pé, a capela.',
        quote: { text: 'O aldeamento efêmero dos matutos vadios, centralizado pela igreja velha, que já existia, ia transmudar-se, ampliando-se, em pouco tempo, na Tróia de taipa dos jagunços.', cite: EUCLIDES('O Homem') } },
      { at: MIDDLE, zoom: 2.2, kicker: 'O beato', title: 'Antônio Conselheiro',
        text: 'Havia mais de vinte anos ele andava pelos sertões pregando e erguendo igrejas, cemitérios e açudes com o povo que o seguia.',
        quote: { text: 'E surgia na Bahia o anacoreta sombrio, cabelos crescidos até aos ombros, barba inculta e longa; face escaveirada; olhar fulgurante; monstruoso, dentro de um hábito azul de brim americano; abordoado ao clássico bastão em que se apóia o passo tardo dos peregrinos...', cite: EUCLIDES('O Homem') } }
    ],
    outro: [
      { at: MIDDLE, zoom: 1.5, kicker: 'Belo Monte · 1893–1896', title: 'O arraial cresce',
        text: 'O Conselheiro deu ao lugar o nome de Belo Monte. Chegavam famílias inteiras de toda a Bahia e de Sergipe: vaqueiros, lavradores sem terra, gente que tinha sido escravizada até 1888. Em poucos anos o arraial tinha milhares de casas.',
        quote: { text: 'A edificação rudimentar permitia à multidão sem lares fazer até doze casas por dia', cite: EUCLIDES('O Homem') },
        lines: [
          { who: 'Sertanejo', unit: 'worker', text: 'Chega gente nova todo dia, de todo canto do sertão.' },
          { who: 'Antônio Conselheiro', unit: 'conselheiro', text: 'É para minha guarda que tenho comigo estes homens armados, porque V. V.Rev.ma há de saber que a polícia atacou-me e quis matar-me no lugar chamado Maceté, onde houve mortes de um e outro lado.',
            cite: `${EUCLIDES('O Homem')} · relatado por frei João Evangelista (1895)` }
        ] },
      { at: MIDDLE, zoom: 1.3, kicker: '1896', title: 'A República olha para o sertão',
        text: 'Para a República, proclamada em 1889, um arraial de milhares de pessoas que não pagava imposto e não reconhecia o governo era uma ameaça. Faltava só um pretexto.',
        quote: { text: 'O sertanejo é, antes de tudo, um forte.', cite: EUCLIDES('O Homem') } }
    ]
  },
  {
    number: 2, title: 'Uauá', year: '21 de novembro de 1896', kind: 'rts',
    summary: 'De madrugada, a procissão dos jagunços chega a Uauá, onde a tropa da 1ª expedição dorme. A cruz e a bandeira do Divino na frente: quem luta perto delas luta mais forte.',
    start: { food: 0, wood: 0, rifles: 0, hall: false, hour: 4.6, at: near('canudos', 345), home: 'A procissão',
      units: [['cruzeiro', 1, 'cruz'], ['warrior', 6], ['spearman', 4], ['rifleman', 4]] },
    build: [], train: [],
    enemy: {
      buildings: [[315, 95], [345, 112], [70, 100], [85, 128], [152, 106], [225, 100], [245, 124], [300, 118]]
        .map(([angle, distance]) => ({ kind: 'house', ...around(angle, distance), tag: 'uaua' })),
      guards: [
        // Cem praças aquarteladas nas casas: muitas, e de Comblain, "cem tiros" contra
        // "um disparo de clavinote"; abrigadas pelas paredes, custam a cair (`hp`). A luta
        // durou "cerca de quatro horas".
        { type: 'private', count: 18, ...MIDDLE, spread: 95, tag: 'tropa', asleep: true, hp: 3.2 },
        { type: 'bayonet', count: 10, ...MIDDLE, spread: 80, tag: 'tropa', asleep: true, hp: 3.2 },
        ...['juazeiro', 'patamute', 'montesanto', 'canudos'].map(road => ({ type: 'private', count: 1, ...near(road, 135), spread: 0, tag: 'tropa', sentry: true }))
      ]
    },
    alarm: 'As sentinelas atiram à toa e correm para a praça. A tropa acorda!',
    script: [
      { at: 3, say: [
        { who: 'Porta-cruz', unit: 'cruz', text: 'Levantem a cruz e a bandeira do Divino. Vamos rezando até a praça.' },
        { who: 'Jagunço', unit: 'warrior', text: 'Fiquem perto da cruz, que ela segura a gente.' }
      ] }
    ],
    objectives: [
      { type: 'kill', tag: 'tropa', count: 10, text: 'Faça a tropa recuar: derrube 10 soldados',
        hint: 'Avance com todos juntos em volta do porta-cruz: perto dele, cada um luta com mais força. Não deixe a cruz cair. Os soldados atiram das casas: no corpo a corpo eles perdem a vantagem.',
        then: [
          { flee: true, toast: 'A tropa de Pires Ferreira larga Uauá e volta para Juazeiro!' },
          { say: [{ who: 'Jagunço', unit: 'warrior', text: 'Correram! Largaram o povoado!' }] }
        ] }
    ],
    lose: { wiped: true, units: ['cruz'] },
    defeat: { wiped: 'Os jagunços caíram em Uauá.', units: 'A cruz caiu, e com ela a coragem da procissão.' },
    story: ['uaua'],
    intro: [
      { at: MIDDLE, zoom: 1.7, kicker: 'Uauá · 19 de novembro de 1896', title: 'A primeira expedição',
        text: 'Uma encomenda de madeira para a igreja nova de Belo Monte foi paga e não entregue em Juazeiro. Correu o boato de que os conselheiristas viriam buscá-la à força, e o governo da Bahia mandou o tenente Pires Ferreira com cem soldados. A tropa chegou exausta a Uauá e se aquartelou nas casas.',
        quote: { text: 'Fez-se em torno um círculo de vigilância: postaram-se sentinelas à saídas dos quatro caminhos e nomeou-se o pessoal das rondas.', cite: EUCLIDES('A Luta · Uauá') },
        cast: [{ type: 'officer', team: 'enemy', x: MIDDLE.x + 15, y: MIDDLE.y - 18, tag: 'tenente' }],
        lines: [
          { who: 'Sentinela', unit: 'tropa', text: 'Tenente, o povo do lugar fugiu de noite. Não ficou ninguém nas casas.' },
          { who: 'Tenente Pires Ferreira', unit: 'tenente', text: 'Deixa fugir. Amanhã cedo seguimos para Canudos.' }
        ] },
      { at: near('canudos', 345), zoom: 1.7, kicker: 'Madrugada de 21 de novembro', title: 'A procissão',
        text: 'Os moradores tinham corrido para Canudos com o aviso. Os sertanejos vieram de lá como numa procissão de penitência: na frente, a bandeira do Divino e uma grande cruz de madeira; atrás, rezas, santos, velhas espingardas, chuços e foices.',
        quote: { text: 'Evitando as vantagens de uma arrancada noturna, os sertanejos chegavam com o dia e anunciavam-se de longe. Despertavam os adversários para a luta.', cite: EUCLIDES('A Luta · Uauá') },
        lines: [
          { who: 'Porta-cruz', unit: 'cruz', text: 'Ninguém corre. Vamos cantando, que é para eles ouvirem.' },
          { who: 'Atirador', unit: 'rifleman', text: 'A espingarda é velha, demora a carregar. Melhor chegar perto.' }
        ] },
      { at: near('canudos', 250), pan: MIDDLE, zoom: 1.4, kicker: 'Uauá', title: 'Dormia',
        quote: { text: 'O arraial na frente, porém, não revelava lutadores a postos. Dormia.', cite: EUCLIDES('A Luta · Uauá') } }
    ],
    outro: [
      { at: MIDDLE, zoom: 1.4, kicker: 'Uauá · 21 de novembro de 1896', title: 'Quatro horas',
        text: 'A luta durou cerca de quatro horas, casa por casa. Os soldados atiravam pelas paredes furadas em seteiras, e os sertanejos, reunidos em volta da bandeira do Divino, morreram aos montes: cento e cinquenta, diz a parte oficial, contra dez da tropa. Mesmo assim, foi a tropa quem se retirou.',
        quote: { text: 'Foi como uma fuga.', cite: EUCLIDES('A Luta · Uauá') },
        lines: [
          { who: 'Jagunço', unit: 'warrior', text: 'Voltaram para Juazeiro.' },
          { who: 'Porta-cruz', unit: 'cruz', text: 'Mas ficou muita gente nossa na praça. Vamos levar a bandeira de volta a Belo Monte.' }
        ] },
      { at: MIDDLE, zoom: 1.2, kicker: 'Janeiro de 1897', title: 'A segunda expedição',
        text: 'Em janeiro veio o major Febrônio de Brito, com centenas de soldados e artilharia, e foi barrado na serra do Cambaio. A República preparou então uma terceira expedição, entregue ao coronel mais temido do Exército.' }
    ]
  },
  {
    number: 3, title: 'Moreira César', year: '3 e 4 de março de 1897', kind: 'rts',
    summary: 'A 3ª expedição desce sobre Belo Monte com a artilharia no morro dos Pelados. Aguente o assalto, derrube o coronel quando ele vier "dar brio" à tropa, tome os Krupps e recolha as armas largadas.',
    start: { food: 220, wood: 300, rifles: 4, hall: true, workers: 6, preacher: true, hour: 11.5, heroes: ['abade', 'pajeu'],
      units: [['warrior', 5], ['rifleman', 5], ['spearman', 3]],
      buildings: [...CASARIO, { kind: 'igrejanova', ...around(330, 105) }, { kind: 'camp', ...around(200, 150) },
        { kind: 'tower', ...near('montesanto', 150, 40) }, { kind: 'tower', ...near('jeremoabo', 150, -40) },
        { kind: 'tower', ...near('montesanto', 150, -45) }] },
    build: null, train: null,
    enemy: {
      guards: [
        { type: 'gunner', count: 4, x: PELADOS.x, y: PELADOS.y, spread: 22, tag: 'krupps' },
        { type: 'private', count: 3, x: PELADOS.x + 20, y: PELADOS.y + 25, spread: 20, tag: 'bateria' }
      ]
    },
    raids: [
      { from: 'montesanto', at: 8, every: 20, times: 5, roster: [['private', 4], ['bayonet', 2]], grow: .12, tag: 'tropa',
        text: 'A infantaria desce pelo vale das quixabeiras e atravessa o rio' },
      { from: 'jeremoabo', at: 40, every: 35, times: 2, roster: [['private', 3], ['bayonet', 2]], tag: 'tropa',
        text: 'A polícia contorna o arraial pela direita, pela estrada de Jeremoabo' },
      { from: 'edges', at: 55, every: 35, times: 2, roster: [['bayonet', 3]], tag: 'tropa', text: 'Soldados se perdem nos becos e entram por todo lado' }
    ],
    script: [
      { at: 4, say: [
        { who: 'João Abade', unit: 'abade', text: 'Ninguém sai para o descampado. Cada casa é uma trincheira.' },
        { who: 'Pajeú', unit: 'pajeu', text: 'Deixa descer. No beco, canhão não serve.' }
      ] },
      { at: 40, say: [{ who: 'Sertanejo', unit: 'worker', text: 'Toquem o sino da igreja velha! Que eles ouçam que Belo Monte está de pé.' }] }
    ],
    sequential: true,
    objectives: [
      { id: 'assalto', type: 'survive', seconds: 100, text: 'Aguente o assalto da 3ª expedição',
        hint: 'Os atiradores da Igreja Nova e as trincheiras atiram sozinhos; ponha os jagunços entre as casas, de tocaia. Mande sertanejos consertar o que o Krupp derrubar.',
        then: [
          { spawnEnemy: [{ type: 'officer', count: 1, x: PELADOS.x - 50, y: PELADOS.y + 40, tag: 'moreira' }, { type: 'bayonet', count: 4, x: PELADOS.x - 50, y: PELADOS.y + 40, tag: 'tropa' }],
            toast: 'Moreira César desce dos Pelados a cavalo!', focus: { x: PELADOS.x - 50, y: PELADOS.y + 40 } },
          { say: [{ who: 'Coronel Moreira César', unit: 'moreira', text: '— Eu vou dar brio àquela gente...', cite: EUCLIDES('A Luta · Expedição Moreira César') }] }
        ] },
      { type: 'kill', tag: 'moreira', text: 'Derrube o coronel Moreira César',
        hint: 'Ele desce com a escolta. Os atiradores e Pajeú de tocaia derrubam de longe; o oficial caído faz a tropa debandar.',
        then: [
          { flee: 'tropa', toast: 'O coronel caiu! Sem comando, a tropa debanda.' },
          { say: [
            { who: 'Coronel Tamarindo', text: 'É tempo de murici cada um cuide de si...', cite: EUCLIDES('A Luta · Expedição Moreira César') },
            { who: 'Pajeú', unit: 'pajeu', text: 'Os canhões ficaram no morro com meia dúzia. Vamos buscar.' }
          ] }
        ] },
      { type: 'kill', tag: 'krupps', count: 4, text: 'Tome os quatro Krupps no morro dos Pelados',
        hint: 'A bateria ficou para trás com poucos soldados. Chegue pelo lado, em grupo: o Krupp atira em construção, não em gente.' },
      { type: 'gather', resource: 'rifles', amount: 10, gain: true, text: 'Recolha 10 fuzis largados',
        hint: 'Cada soldado que cai larga o fuzil no chão (o contorno verde). Quem passa por cima apanha e leva à igreja.' }
    ],
    lose: { hall: true },
    defeat: { hall: 'A igreja de Santo Antônio caiu.' },
    story: ['sertoes'],
    intro: [
      { at: spot(.5, .95), zoom: 1.6, kicker: 'Estrada do Rosário · 3 de março de 1897', title: 'Moreira César',
        text: 'Depois de duas expedições derrotadas, a República mandou o coronel Antônio Moreira César, com 1.281 homens e uma bateria de quatro canhões Krupp. Doente, ele apressou a marcha para tomar o arraial de assalto, no mesmo dia.',
        cast: [
          { type: 'officer', team: 'enemy', ...spot(.5, .985), walk: spot(.5, .945), tag: 'cenaMoreira' },
          { type: 'private', team: 'enemy', count: 6, ...spot(.5, .995), walk: spot(.5, .958), spread: 26 }
        ],
        lines: [
          { who: 'Coronel Moreira César', unit: 'cenaMoreira', text: '— Meus camaradas! Como sabem, estou visivelmente enfermo. Há muitos dias não me alimento; mas Canudos está muito perto... Vamos tomá-lo!', cite: EUCLIDES('A Luta · Expedição Moreira César') },
          { who: 'Coronel Moreira César', unit: 'cenaMoreira', text: '— Vamos almoçar em Canudos!', cite: EUCLIDES('A Luta · Expedição Moreira César') }
        ] },
      { at: PELADOS, pan: MIDDLE, zoom: 1.5, kicker: 'Morro dos Pelados · meio-dia', title: 'Os cartões de visita',
        text: 'A artilharia subiu o morro dos Pelados, de frente para as igrejas, e abriu fogo. A infantaria desceu pelo vale das quixabeiras e atravessou o Vaza-Barris com água pelos joelhos.',
        lines: [{ who: 'Coronel Moreira César', unit: 'cenaMoreira', text: '— Lá vão dois cartões de visita ao Conselheiro...', cite: EUCLIDES('A Luta · Expedição Moreira César') }] },
      { at: MIDDLE, zoom: 1.8, kicker: 'Belo Monte', title: 'O labirinto',
        text: 'Lá embaixo, as casas de taipa sem rua, encostadas umas nas outras, os becos que mal davam passagem a um homem, e as duas igrejas. Cada casa era uma trincheira.',
        lines: [
          { who: 'João Abade', unit: 'abade', text: 'Eles vão entrar. Que entrem: no beco, a gente conhece cada parede.' },
          { who: 'Antônio Conselheiro', unit: 'conselheiro', text: 'Quem cair ferido, tragam para perto de mim.' }
        ] }
    ],
    outro: [
      { at: near('montesanto', 260), zoom: 1.4, kicker: 'Estrada do Rosário · 4 de março de 1897', title: 'A debandada',
        text: 'Moreira César morreu de madrugada. O coronel Tamarindo, que herdou o comando, mandou a retirada, e a retirada virou fuga. Tamarindo caiu baleado no córrego do Angico; o capitão Salomão morreu junto dos canhões, que não quis largar.',
        quote: { text: 'Oitocentos homens desapareciam em fuga, abandonando as espingardas; arriando as padiolas, em que se estorciam feridos: jogando fora as peças de equipamento; desarmando-se', cite: EUCLIDES('A Luta · Expedição Moreira César') },
        lines: [
          { who: 'Jagunço', unit: 'warrior', text: 'A estrada inteira está cheia de fuzil, de cartucheira, de farda.' },
          { who: 'Pajeú', unit: 'pajeu', text: 'Juntem tudo. Eles voltam, e com mais gente.' }
        ] },
      { at: MIDDLE, zoom: 1.4, kicker: 'Belo Monte · março de 1897', title: 'A "fraqueza" do governo',
        text: 'O país inteiro se assustou. Os jornais do Rio falavam em monarquistas e em armas estrangeiras escondidas no sertão. A República preparou a quarta expedição, com milhares de soldados e dois generais.',
        quote: { text: 'Levaram para o arraial os quatro Krupps; substituíram nas mãos dos lutadores da primeira linha as espingardas velhas de carregamento moroso pelas Mannlichers e Comblains fulminantes', cite: EUCLIDES('A Luta · Expedição Moreira César') } }
    ]
  },
  {
    number: 4, title: 'A Favela', year: 'junho e julho de 1897', kind: 'rts',
    summary: 'A 4ª expedição fica presa no alto da Favela. Assalte o comboio de munição na retaguarda, leve os doze do filho de Macambira até a Matadeira e aguente o assalto de 18 de julho.',
    start: { food: 300, wood: 400, rifles: 10, hall: true, workers: 8, preacher: true, hour: 16.8, skyScale: .5,
      heroes: ['abade', 'pajeu', 'quadrado', 'vilanova'],
      units: [['warrior', 6], ['spearman', 4], ['rifleman', 6]],
      buildings: [...ARRAIAL.map((spot, i) => (i % 2 ? { ...spot, life: .5 } : spot)), { kind: 'lodge', ...around(110, 170) },
        { kind: 'igrejanova', ...around(330, 105), life: .45 },
        { kind: 'tower', ...near('montesanto', 140, 40), levels: { power: 1 } }, { kind: 'tower', ...near('jeremoabo', 140, 40), levels: { power: 1 } },
        { kind: 'tower', ...near('uaua', 140, -40), levels: { power: 1 } }, { kind: 'tower', ...near('cambaio', 140, 40), levels: { power: 1 } }] },
    build: null, train: null,
    enemy: {
      buildings: [
        { kind: 'barraca', ...{ x: FAVELA.x + 5, y: FAVELA.y + 10 }, tag: 'favela' }, { kind: 'barraca', ...{ x: FAVELA.x + 50, y: FAVELA.y + -35 }, tag: 'favela' },
        { kind: 'barraca', ...{ x: FAVELA.x + -35, y: FAVELA.y + 55 }, tag: 'favela' }, { kind: 'barraca', ...{ x: FAVELA.x + 60, y: FAVELA.y + 50 }, tag: 'favela' }
      ],
      // "Dão-lhes as costas com indiferença soberana vinte batalhões tranqüilos": o
      // acampamento não vigia (`calm`) até levar o primeiro golpe.
      guards: [
        { type: 'private', count: 10, ...{ x: FAVELA.x + 25, y: FAVELA.y + 15 }, spread: 60, tag: 'favela', calm: true },
        { type: 'bayonet', count: 4, ...{ x: FAVELA.x + 30, y: FAVELA.y + 10 }, spread: 45, tag: 'favela', calm: true },
        { type: 'officer', count: 1, ...{ x: FAVELA.x + 35, y: FAVELA.y + 20 }, spread: 0, tag: 'favela', calm: true },
        { type: 'gunner', count: 2, ...{ x: FAVELA.x + 0, y: FAVELA.y + -30 }, spread: 15, tag: 'favela', calm: true },
        { type: 'matadeira', count: 1, ...MATADEIRA, spread: 0, tag: 'matadeira', calm: true }
      ]
    },
    raids: [
      { from: 'edges', at: 120, every: 140, roster: [['private', 2], ['bayonet', 1]], grow: .1, text: 'Uma patrulha da tropa desce da Favela pela caatinga' },
      { after: 'volta', from: 'montesanto', at: 4, every: 20, times: 4, roster: [['private', 4], ['bayonet', 3]], grow: .15,
        text: 'O assalto: as brigadas descem a Favela e atravessam o rio' },
      { after: 'volta', from: 'jeremoabo', at: 12, every: 25, times: 3, roster: [['private', 3], ['bayonet', 2], ['officer', 1]], grow: .1,
        text: 'A coluna de Savaget ataca pela estrada de Jeremoabo' },
      { after: 'volta', from: 'edges', at: 25, every: 25, times: 2, roster: [['bayonet', 3]], text: 'Soldados entram pelos becos do outro lado' }
    ],
    convoys: { first: 15, every: 90, road: 'montesanto', escort: 5 },
    script: [
      { at: 3, say: [
        { who: 'Pajeú', unit: 'pajeu', text: 'Eles estão presos lá em cima, sem água. O comboio de munição ficou para trás, sozinho na estrada.' },
        { who: 'João Abade', unit: 'abade', text: 'Então é lá que a gente bate. Pajeú, a estrada é sua.' }
      ] }
    ],
    sequential: true,
    objectives: [
      { id: 'comboio', type: 'convoys', count: 1, text: 'Assalte o comboio de munição na estrada de Monte Santo',
        hint: 'O carro de bois vem com escolta pela estrada do sul. Espere de tocaia na caatinga, perto da estrada, e caia em cima quando ele passar.',
        then: [
          { say: [
            { who: 'General Artur Oscar', text: 'Toda a primeira coluna estava aprisionada.', cite: EUCLIDES('A Luta · Quarta Expedição') },
            { who: 'Antônio Vilanova', unit: 'vilanova', text: 'Munição deles, agora nossa. Vai tudo para o armazém.' }
          ] },
          { spawnPlayer: [{ type: 'macambira', count: 1, ...spot(.37, .72), tag: 'doze' }, { type: 'warrior', count: 11, ...spot(.37, .72), tag: 'doze' }],
            toast: 'O filho de Macambira e onze companheiros esperam na beira do rio.', focus: spot(.37, .72) },
          { say: [
            { who: 'Filho de Macambira', unit: 'macambira', text: '"Pai! quero escangalhar a matadeira!"', cite: EUCLIDES('A Luta · Quarta Expedição') },
            { who: 'Joaquim Macambira', text: '"Consulta o Conselheiro — e vai."', cite: EUCLIDES('A Luta · Quarta Expedição') }
          ] }
        ] },
      { id: 'matadeira', type: 'reach', ...MATADEIRA, radius: 34, count: 1, tag: 'doze', must: 'macambira', text: 'Leve o filho de Macambira até a Matadeira',
        hint: 'Escolha os doze (segure e arraste sobre eles) e suba a Favela pela caatinga, longe das barracas. O acampamento está de costas: não brigue no caminho.',
        then: [
          { wake: true, toast: 'A pancada bate, estrídula e alta, retinindo... e o acampamento inteiro acorda!', focus: MATADEIRA },
          { spawnEnemy: [{ type: 'bayonet', count: 8, x: MATADEIRA.x + 40, y: MATADEIRA.y + 30, tag: 'batalhoes' }] }
        ] },
      { id: 'volta', type: 'reach', ...MIDDLE, radius: 130, count: 1, tag: 'doze', text: 'Traga de volta quem escapar',
        hint: 'Corra para o arraial: desça a Favela e atravesse o rio. Em 1897, de doze, um só voltou.',
        then: [{ say: [
          { who: 'João Abade', unit: 'abade', text: 'Voltou um. Os outros onze ficaram lá em cima.' },
          { who: 'Antônio Vilanova', unit: 'vilanova', text: 'E agora o comboio deles chegou. Vão descer com tudo.' }
        ] }] },
      { type: 'survive', seconds: 80, text: 'Aguente o assalto de 18 de julho',
        hint: 'As brigadas descem a Favela e entram pelos dois lados. Segure as igrejas: perto de Manuel Quadrado os feridos saram.' }
    ],
    lose: { hall: true, min: { tag: 'doze', count: 1, until: 'volta' } },
    defeat: { hall: 'A igreja de Santo Antônio caiu.', min: 'Nenhum dos doze voltou da Favela.' },
    story: ['macambira'],
    intro: [
      { at: FAVELA, zoom: 1.5, kicker: 'Alto da Favela · fim de junho de 1897', title: 'A quarta expedição',
        text: 'Desta vez vieram milhares de soldados, em duas colunas, sob o general Artur Oscar. A primeira tomou o alto da Favela, de frente para o arraial, e ali ficou presa: sem água, debaixo de fogo, longe da munição que vinha atrás.',
        quote: { text: 'Tendo arrastado até lá a expedição, restava-lhes, de todo desprotegido, à retaguarda, o comboio de munições de guerra e de boca.', cite: EUCLIDES('A Luta · Quarta Expedição') },
        lines: [
          { who: 'Antônio Vilanova', unit: 'vilanova', text: 'Eles comem o que chega pela estrada de Monte Santo. Sem comboio, passam fome.' }
        ] },
      { at: MATADEIRA, zoom: 2, kicker: 'A Matadeira', title: 'O canhão de sítio',
        text: 'Com a tropa veio um canhão Whitworth de 32, enorme, que os sertanejos chamaram de Matadeira. Do alto da Favela, ela mirava as igrejas de Belo Monte.',
        lines: [{ who: 'Pajeú', unit: 'pajeu', text: 'Cada tiro daquilo derruba um pedaço da igreja nova.' }] }
    ],
    outro: [
      { at: MIDDLE, zoom: 1.4, kicker: 'Belo Monte · 18 de julho de 1897', title: 'O assalto',
        text: 'As brigadas desceram a Favela, atravessaram o rio e conquistaram um pedaço do arraial — e dali não passaram. O cerco foi se fechando nos meses seguintes. Antônio Conselheiro morreu em setembro. João Abade, Pajeú e os outros chefes caíram um a um.',
        quote: { text: 'Tivera cerca de mil homens, 947, entre mortos e feridos', cite: EUCLIDES('A Luta · Quarta Expedição') },
        lines: [
          { who: 'João Abade', unit: 'abade', text: 'Tomaram um pedaço do arraial e pararam ali.' },
          { who: 'Antônio Vilanova', unit: 'vilanova', text: 'Mas pela estrada de Monte Santo chega gente nova toda semana.' }
        ] },
      { at: MIDDLE, zoom: 1.5, kicker: 'Belo Monte · 5 de outubro de 1897', title: 'Canudos não se rendeu',
        text: 'O arraial foi tomado casa por casa e destruído. Hoje o lugar está debaixo das águas do açude de Cocorobó. O que sobrou foi a memória — e o livro de Euclides da Cunha.',
        quote: { text: 'Canudos não se rendeu. Exemplo único em toda a história, resistiu até ao esgotamento completo. Expugnado palmo a palmo, na precisão integral do termo, caiu no dia 5, ao entardecer, quando caíram os seus últimos defensores, que todos morreram. Eram quatro apenas: um velho, dois homens feitos e uma criança, na frente dos quais rugiam raivosamente 5 mil soldados.', cite: EUCLIDES('A Luta') } }
    ]
  }
]);

// O livro de história da missão de Palmares (o mesmo StoryBook de Canudos): cada
// registro se abre num momento da partida e conta, em poucas linhas, o que se sabe,
// com um trecho de quem escreveu sobre os Palmares.
//
// Quase tudo foi escrito por quem fazia a guerra ao quilombo. As citações foram
// copiadas do texto integral, não reescritas de memória, de Edison Carneiro, "O
// Quilombo dos Palmares", 2ª ed. revista (Companhia Editora Nacional, Brasiliana
// vol. 302, 1958), na grafia dessa edição:
//   do apêndice, a "Relação das guerras feitas aos Palmares de Pernambuco no tempo do
//     governador D. Pedro de Almeida, de 1675 a 1678" e o "Diário da viagem do
//     capitão João Blaer aos Palmares em 1645";
//   do corpo do livro, os trechos de cartas e requerimentos que Carneiro transcreve
//     (governadores, Domingos Jorge Velho).
// `cite` é a linha de baixo da citação (marcação: vai em innerHTML).
const BOOK = 'Edison Carneiro, <cite>O Quilombo dos Palmares</cite>';
const RELACAO = '<cite>Relação das guerras feitas aos Palmares</cite> (1678)';
const BLAER = '<cite>Diário da viagem do capitão João Blaer aos Palmares</cite> (1645)';
const quoted = who => `${who}, citado em ${BOOK}`;

export const STORY = Object.freeze({
  palmares: {
    kicker: 'Serra da Barriga · século XVII',
    title: 'Os Palmares',
    body: [
      'Nas serras de mata fechada do interior de Pernambuco, no que hoje é Alagoas, gente fugida dos engenhos de açúcar ergueu os Palmares. Não era uma aldeia só: eram muitos mocambos espalhados pela mata, cada um com o seu chefe, todos obedecendo a um rei.',
      'Ninguém sabe ao certo quando começou. Um documento de 1678 diz que os Palmares tiveram gente desde que houve escravizados naquelas capitanias, e que o número cresceu durante a ocupação holandesa (1630–1654), quando a guerra entre os senhores abriu caminho para a fuga. O mesmo documento calcula que aqueles matos sustentavam "de 16 até 20 000 almas".',
      'Tudo o que sabemos foi escrito por quem fazia a guerra aos Palmares — governadores, capitães, mercenários holandeses —, gente que chamava os palmarinos de bárbaros e de escravos. O jogo usa esses relatos, mas lembra sempre quem está falando.'
    ],
    quote: {
      text: 'estende-se pela parte superior do rio São Francisco uma corda de mata brava, que vem a fazer têrmo sôbre o sertão do cabo de Santo Agostinho, correndo quase norte a sul, do mesmo modo que corre a costa do mar; são as árvores principais palmeiras agrestes, que deram ao terreno o nome de Palmares',
      cite: RELACAO
    }
  },
  paroco: {
    kicker: 'A capela do Macaco',
    title: 'O pároco',
    body: [
      'Quando a tropa entrou na cerca do Macaco, achou uma capela com três imagens: o Menino Jesus, Nossa Senhora da Conceição e São Brás. Os palmarinos escolhiam um dos seus para batizar e casar, e ensinavam algumas orações cristãs.',
      'O autor da Relação acha que tudo isso era feito errado — o batismo "sem a forma determinada pela Igreja". Edison Carneiro supõe que a reza dos Palmares misturava o catolicismo com as crenças que vieram de Angola. Os holandeses de 1645 anotaram que o rei não permitia feiticeiros entre a sua gente. No jogo, o pároco reza por quem chega ferido perto dele, e a pessoa sara.'
    ],
    quote: {
      text: 'Nesta cidade têm capela a que recorrem nos seus apertos e imagens a quem recomendam suas tenções. Quando se entrou nesta capela achou-se uma imagem do Menino Jesus muito perfeita; outra de N. S. da Conceição, outra de São Brás. Escolhem um dos mais ladinos, a quem veneram como pároco, que os batiza e os casa.',
      cite: RELACAO
    }
  },
  holandeses: {
    kicker: 'Os primeiros a vir · 1644–1645',
    title: 'As expedições holandesas',
    body: [
      'Os holandeses, senhores de Pernambuco desde 1630, mandaram duas expedições aos Palmares. A de Rodolfo Baro, em 1644, era feita quase só de mulatos e índios. A de 1645 saiu com o capitão João Blaer, que caiu doente no caminho e voltou carregado; quem seguiu no comando foi o tenente Jürgens Reijmbach.',
      'Acharam o Palmares velho abandonado — os moradores tinham saído dele por ser um lugar doentio — e, mais adiante, o novo: meia milha de comprido, duas ordens de paliçadas e, atrás da porta, um fosso cheio de estrepes, onde caíram os dois corneteiros da tropa. Quase todos estavam fora, nas roças. Os presos disseram que eram 500 homens, fora as mulheres e as crianças. A tropa queimou as casas e voltou.'
    ],
    quote: {
      text: 'as casas eram em número de 220 e no meio delas erguia-se uma igreja, quatro forjas e uma grande casa de conselho; havia entre os habitantes tôda sorte de artífices',
      cite: BLAER
    }
  },
  macaco: {
    kicker: 'A cidade real',
    title: 'O Macaco e o Ganga-Zumba',
    body: [
      'A capital dos Palmares era a cerca real do Macaco, ao pé da serra da Barriga, junto ao rio Mundaú — onde hoje fica a cidade de União dos Palmares. Ali morava o rei, o Ganga-Zumba, com a família, guardas e oficiais. Quem chegava diante dele se ajoelhava e batia as palmas das mãos.',
      'Os outros mocambos tinham os seus chefes. O segundo em tamanho era Subupira, do irmão do rei, o Gana-Zona: mais de 800 casas, cercado de madeira e pedra. Era ali que os palmarinos se preparavam para a guerra.'
    ],
    quote: {
      text: 'Esta é a metrópole entre as mais cidades e povoações; [...] ocupa esta cidade dilatado espaço, forma-se de mais de 1 500 casas. Há entre êles Ministros de Justiça para suas execuções necessárias e todos os arremedos de qualquer República se acham entre êles.',
      cite: RELACAO
    }
  },
  cerca: {
    kicker: 'Como se defendiam',
    title: 'A cerca, os estrepes e os fojos',
    body: [
      'Cada mocambo grande era cercado de paus a pique, com aberturas para atirar sem se expor — as torneiras. Do lado de fora, o chão era semeado de estrepes, paus de ponta aguda escondidos no mato, e de fojos, buracos cobertos com estrepes no fundo. Em 1645, os holandeses acharam ainda grandes árvores derrubadas umas sobre as outras, fechando um dos lados.',
      'No jogo, a cerca pode ganhar torneiras a dois fogos (mais gente atirando), uma guarita e o campo de estrepes e fojos, que obriga a tropa a chegar devagar, sondando o chão.'
    ],
    quote: {
      text: 'fortificado com uma cêrca de pau a pique, com torneiras abertas para ofender a seu salvo os combatentes; e pela parte de fora tôda se semêa de estrepes de ferro, e de fojos tão cavilosos, que perigara nêles a maior vigilância',
      cite: `${RELACAO}, citada em ${BOOK}`
    }
  },
  armas: {
    kicker: 'O que se toma',
    title: 'As armas de fogo',
    body: [
      'Os palmarinos lutavam com o que tinham: arcos, flechas, lanças, pedras e as armas que saíam das suas forjas. As de fogo vinham de fora — tomadas da tropa, como as que levaram das ordenanças de um capitão em 1673, ou compradas.',
      'Muitos moradores que se arranchavam perto da mata pagavam aos palmarinos para viver em paz, e pagavam em ferramentas, pólvora, chumbo e armas: quem conta é o próprio Domingos Jorge Velho, o bandeirante que destruiu o Macaco. No jogo, a espingarda que a tropa larga no chão é de quem apanhar.'
    ],
    quote: {
      text: 'o tempo os fêz crescer na quantidade e a vizinhança dos moradores os fêz destros nas armas; usam hoje de tôdas, umas que fazem, outras que roubam, e as que compram são de fogo.',
      cite: RELACAO
    }
  },
  lavoura: {
    kicker: 'O que se planta',
    title: 'As roças',
    body: [
      'Os Palmares viviam da terra. Os holandeses atravessaram canaviais e roças de pacova (banana) para chegar até lá, e acharam lavouras grandes, "na maior parte de milho novo", e muito azeite de palmeira. Cada roça era cuidada por duas ou três pessoas.',
      'Por isso a guerra aos Palmares foi, cada vez mais, uma guerra contra as roças. Os governadores de Pernambuco escreviam que o que mais enfraquecia o quilombo era não o deixar plantar nem colher.'
    ],
    quote: {
      text: 'São grandemente trabalhadores, plantam todos os legumes da terra, de cujos frutos formam providamente celeiros para os tempos de guerra e de inverno. O seu principal sustento é o milho grosso, dêle fazem várias iguarias; as caças os ajudam muito, porque são aquêles matos abundantes delas.',
      cite: RELACAO
    }
  },
  forjas: {
    kicker: 'Ferreiros',
    title: 'As forjas',
    body: [
      'Muitos dos que fugiam para os Palmares já sabiam um ofício — eram "práticos em tôdas as mecânicas", escreveu um governador. Em 1645 os holandeses contaram quatro forjas no meio das casas e "tôda sorte de artífices" entre os moradores. Ali se faziam ferramentas para as roças e armas para a guerra.',
      'O governador de Pernambuco temia justamente isso: que o quilombo, com ferreiros e com o salitre da serra, aprendesse a se armar sozinho.'
    ],
    quote: {
      text: 'tendas de ferreiro, e outras oficinas, com que poderão fazer armas, pois usam de algumas de fogo que de cá levam; e êste sertão é tão fértil de metais, e salitre, que tudo lhes oferece para a sua defesa',
      cite: quoted('Governador Fernão Coutinho (1671)')
    }
  },
  lopes: {
    kicker: 'A entrada de 1675',
    title: 'Manuel Lopes',
    body: [
      'Depois que os holandeses foram expulsos, em 1654, os portugueses fizeram mais de vinte entradas contra os Palmares, quase todas sem resultado. Em 1675 o sargento-mor Manuel Lopes subiu de Porto Calvo com 280 homens "brancos, mulatos e índios".',
      'Em 22 de dezembro achou uma cidade fortificada. Lutou-se mais de duas horas e meia, até que a tropa pôs fogo nas casas de palha. Lopes ficou quase cinco meses acampado na mata, passando fome. Numa das brigas, um palmarino que os portugueses chamavam de general das armas foi ferido por uma bala na perna: o Zumbi.'
    ],
    quote: {
      text: 'em que se descobriu uma grande cidade de mais de 2 000 casas, fortificadas de estacada de pau-a-pique e defendida com três fôrças e com soma grande de defensores, prevenidos com todo gênero de armas',
      cite: RELACAO
    }
  },
  carrilho: {
    kicker: 'A entrada de 1677',
    title: 'Fernão Carrilho',
    body: [
      'Em 1677 o capitão-mor Fernão Carrilho entrou nos Palmares com apenas 185 homens, brancos e índios do Camarão. Antes de partir, prometeu aos soldados o que eles ganhariam com a vitória.',
      'Os palmarinos de Subupira puseram fogo na própria cidade para não a entregar, e Carrilho se fortificou nas cinzas. Dali mandou tropas pequenas varrer a mata: prendeu chefes, filhos e netos do rei. O Ganga-Zumba escapou — ferido de flecha, dizia-se —, largando "uma pistola dourada e a espada de que usava".'
    ],
    quote: {
      text: 'se destruíssem os palmaristas, teriam terras para a sua cultura, negros para o seu serviço, honra para a sua estimação',
      cite: `${RELACAO} · a fala de Fernão Carrilho aos soldados`
    }
  },
  gaspar: {
    kicker: 'Os chefes',
    title: 'Gaspar',
    body: [
      'Gaspar era o capitão da guarda do rei: cuidava da defesa do Macaco e da pessoa do Ganga-Zumba. É quase tudo o que se sabe dele.',
      'A Relação o põe entre os chefes que "acabaram" no ataque de 1677, ao lado de João Tapuia — o nome diz que havia índios entre os palmarinos. Edison Carneiro entende que Gaspar foi preso, e o nome dele volta entre os presos de 1679. No jogo, ele é o mais resistente dos lanceiros.'
    ],
    quote: {
      text: 'acabaram nêle os cabos de maior fama, como foram Gaspar, capitão da guarda do rei; João Tapuia e Ambrósio, ambos capitães afamados, e outros a quem a ignorância dos mesmos sepultou em perpétuo esquecimento',
      cite: RELACAO
    }
  },
  muica: {
    kicker: 'Os chefes',
    title: 'Ganga-Muíça',
    body: [
      'Ganga-Muíça comandava em chefe os guerreiros dos Palmares: o "Mestre de Campo da gente de Angola". Muitos palmarinos tinham vindo de Angola, e os escravizados das vilas vizinhas chegavam a dizer que os Palmares eram uma "Angola janga" — uma pequena Angola.',
      'Foi preso em 1677. Ganga, nas línguas bantas, quer dizer senhor: era um título, como o do rei, o Ganga-Zumba. O autor da Relação o chama de corsário. No jogo, os guerreiros perto dele lutam com mais força.'
    ],
    quote: {
      text: 'entrando nêles por prisioneiro o Ganga-Muíça, Mestre de Campo da gente de Angola; era êste grande corsário muito soberbo e insolente',
      cite: RELACAO
    }
  },
  zumbi: {
    kicker: 'Os chefes',
    title: 'Zumbi',
    body: [
      'Zumbi era sobrinho do rei Ganga-Zumba e chefe de um mocambo a 16 léguas de Porto Calvo. Em 1675 já era o "general das armas" dos Palmares, e foi ferido a bala numa perna. Não se sabe ao certo o que o nome queria dizer: a Relação traduz "deus da guerra".',
      'Quando o rei aceitou a paz com o governador, em 1678, Zumbi recusou. Depois que o Ganga-Zumba morreu — envenenado pelos próprios palmarinos, segundo Edison Carneiro —, foi Zumbi quem comandou os Palmares até o fim. Até os inimigos o descreviam com admiração.'
    ],
    quote: {
      text: 'aqui se feriu com uma bala o general das armas, que se chamava Zambi, que quer dizer deus da guerra, negro de singular valor, grande ânimo e constância rara. Êste é o espectador dos mais, porque a sua indústria, juízo e fortaleza aos nossos serve de embaraço, aos seus de exemplo. Ficou vivo, porém aleijado de uma perna.',
      cite: RELACAO
    }
  },
  paz: {
    kicker: 'Recife · junho de 1678',
    title: 'A paz do Ganga-Zumba',
    body: [
      'Em junho de 1678 chegaram ao Recife três filhos do Ganga-Zumba com mais doze palmarinos, de arco e flecha e uma arma de fogo, para pedir a paz em nome do rei. O governador aceitou: os nascidos nos Palmares seriam livres e o rei iria morar, com a sua gente, num lugar dado pelo governo — o Cucaú.',
      'Zumbi não aceitou — e, pelos termos da paz, os que tinham fugido para os Palmares seriam devolvidos aos senhores. Pouco depois, o Ganga-Zumba morreu, e os que tinham ido para o Cucaú foram voltando, aos poucos, para o lado de Zumbi.'
    ],
    quote: {
      text: 'que só pediam a liberdade para os nascidos nos Palmares; que entregariam os que para êles tinham fugido das nossas povoações; que largariam os Palmares; que lhes assinasse sítio onde pudessem viver à sua obediência.',
      cite: RELACAO
    }
  },
  paulistas: {
    kicker: 'Os bandeirantes · 1692',
    title: 'Domingos Jorge Velho',
    body: [
      'Sem conseguir acabar com os Palmares, o governo de Pernambuco contratou em 1687 um bandeirante de São Paulo, Domingos Jorge Velho, que vivia de caçar índios no sertão. O acordo prometia aos paulistas pólvora, chumbo, farinha, as terras dos Palmares e os palmarinos capturados, para vender.',
      'A tropa dele era quase toda de índios. Chegou no fim de 1692 e foi derrotada na primeira cerca que atacou. Os próprios moradores e governadores desconfiavam dos paulistas.'
    ],
    quote: {
      text: 'gente bárbara, indômita, e que vive do que rouba',
      cite: quoted('Governador Caetano de Melo e Castro, sobre os paulistas (1694)')
    }
  },
  cerco: {
    kicker: 'Serra da Barriga · janeiro de 1694',
    title: 'O cerco do Macaco',
    body: [
      'Em janeiro de 1694 cerca de três mil homens — paulistas, tropas das vilas de Alagoas e de Pernambuco — cercaram a fortaleza de Zumbi no alto da serra da Barriga. Pela primeira vez trouxeram artilharia. Os dois assaltos gerais, em 23 e 29 de janeiro, não passaram dos estrepes.',
      'Os sitiantes ergueram então uma contra-cerca em volta da dos palmarinos e, de noite, uma cerca oblíqua até a beira de um precipício. Na madrugada de 6 de fevereiro, Zumbi rompeu o cerco por uma brecha com a sua gente. Na escuridão, à beira do abismo, cerca de duzentos palmarinos caíram no precipício; outros tantos foram mortos e 519 foram presos. O Macaco tinha resistido 22 dias.'
    ],
    quote: {
      text: 'se tinha fortificado com uma triplicada cêrca no cume da . . . Serra [do Barriga], lugar forte por natureza, e com água perene dentro, cêrca muito forte, de 2 470 braças craveiras, com torneiras a dois fogos a cada braça, com flancos, redutos, redentes, faces, e guaritas, coisas antes não usadas dêles',
      cite: quoted('Domingos Jorge Velho')
    }
  },
  fim: {
    kicker: '20 de novembro de 1695',
    title: 'Zumbi',
    body: [
      'Zumbi escapou da serra da Barriga e continuou a luta na mata por quase dois anos. Em 20 de novembro de 1695, uma tropa de paulistas comandada por André Furtado de Mendonça, guiada por um palmarino preso, achou o esconderijo dele. Zumbi tinha só vinte homens; lutou e não se rendeu.',
      'A cabeça dele foi levada ao Recife e espetada num poste, no lugar mais público, para que os escravizados, que o tinham por imortal, vissem que ele tinha morrido. Hoje, 20 de novembro é o Dia Nacional de Zumbi e da Consciência Negra, feriado em todo o Brasil desde 2024.'
    ],
    quote: {
      text: 'os tais negros . . . sempre serão 30 vêzes 30, pelo menos',
      cite: quoted('Domingos Jorge Velho, depois da morte de Zumbi')
    }
  }
});

// As citações das telas de abertura e de fim.
export const QUOTES = Object.freeze({
  start: {
    text: 'Os nossos assaltos os têm feito prevenidos e o seu exercício os tem feito experimentados; não vivem todos juntos por que um sucesso não acabe a todos.',
    cite: RELACAO
  },
  end: {
    text: 'E tu deixaste fazer essa cêrca aos brancos? Amanhã seremos entrados, e mortos, e nossas mulheres e filhos cativos!',
    cite: quoted('Zumbi ao chefe de um posto da cerca, na véspera da queda do Macaco, segundo Domingos Jorge Velho')
  }
});

// Quando cada registro se abre (StoryBook): no começo, depois de uns segundos de
// partida, quando cada entrada começa ou é rechaçada, numa obra ou num acontecimento.
// Gaspar e Ganga-Muíça se abrem sozinhos quando chegam ao Macaco; Zumbi, que começa
// a partida lá, na segunda entrada.
export const STORY_TRIGGERS = Object.freeze({
  begin: 'palmares',
  after: { id: 'paroco', seconds: 25 },
  waveStart: { 1: 'holandeses', 2: 'zumbi', 3: 'lopes', 5: 'carrilho', 8: 'paulistas', 10: 'cerco' },
  waveCleared: { 1: 'macaco', 3: 'paz', 12: 'fim' },
  built: { tower: 'cerca', roca: 'lavoura', camp: 'forjas' },
  riflePickup: 'armas',
  canoes: null
});

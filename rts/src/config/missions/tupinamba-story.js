// O livro de história da missão dos tupinambás (o mesmo StoryBook de Canudos): cada
// registro se abre num momento da partida e conta, em poucas linhas, o que se sabe,
// com um trecho dos que escreveram sobre esta gente.
//
// As citações foram copiadas do texto integral, não reescritas de memória:
//   Gabriel Soares de Sousa, "Tratado descritivo do Brasil em 1587" — edição da
//     Biblioteca Básica Brasileira (Fundar, 2014), em grafia atualizada;
//   Pero de Magalhães Gândavo, "Tractado da terra do Brasil" (c. 1570) — Projeto
//     Gutenberg nº 28122, na grafia original do século XVI;
//   Pero Vaz de Caminha, carta a El-Rei D. Manuel (1500) — Wikisource, ortografia
//     atualizada.
// `cite` é a linha de baixo da citação (marcação: vai em innerHTML).
const SOARES = chapter => `Gabriel Soares de Sousa, <cite>Tratado descritivo do Brasil em 1587</cite> · cap. ${chapter}`;
const GANDAVO = 'Pero de Magalhães Gândavo, <cite>Tractado da terra do Brasil</cite> (c. 1570)';
const CAMINHA = 'Pero Vaz de Caminha, <cite>Carta a El-Rei D. Manuel</cite> (1500)';

export const STORY = Object.freeze({
  aldeia: {
    kicker: 'Litoral do Rio de Janeiro e de São Paulo · antes de 1500',
    title: 'Uma aldeia tupinambá',
    body: [
      'Quando os portugueses chegaram, os tupinambás ocupavam boa parte da costa do Brasil. No litoral do Rio de Janeiro, os portugueses os chamariam também de tamoios. Falavam o tupi antigo, a língua que se ouvia de uma ponta a outra do litoral.',
      'Uma aldeia tinha poucas casas, mas enormes: cada oca, coberta de folhas de palmeira, abrigava várias famílias, cada uma no seu lanço, com as redes armadas entre os esteios. As casas ficavam em volta de um terreiro, onde se dançava e se decidia a guerra. Em volta de tudo, as roças de mandioca e de milho, a mata, o rio e o mar.',
      'Quase tudo o que sabemos foi escrito por europeus depois de 1500 — viajantes, cativos, colonos e padres que olhavam os indígenas com muito preconceito. O jogo usa esses relatos, mas lembra sempre quem está falando.'
    ],
    quote: {
      text: 'faz o principal sua casa muito comprida, coberta da palma, a que os índios chamam pindoba, e as outras casas da aldeia se fazem também muito compridas e arrumadas, de maneira que lhes fica no meio um terreiro quadrado, onde fazem bailes e os seus ajuntamentos',
      cite: SOARES('CLI')
    }
  },
  paje: {
    kicker: 'O que cura',
    title: 'O pajé',
    body: [
      'O pajé era o homem que falava com os espíritos, aconselhava a aldeia e curava os doentes. Vivia numa casa à parte, era respeitado e temido.',
      'Gabriel Soares, um senhor de engenho português, o chama de "feiticeiro" e diz que ele só contava mentiras — mas é o próprio Soares quem descreve as curas. No jogo, o pajé cura quem chega ferido perto dele.'
    ],
    quote: {
      text: 'das quais são os feiticeiros grandes médicos, chupando-lhes com a boca o lugar onde lhes dói',
      cite: SOARES('CLXV')
    }
  },
  tupiniquins: {
    kicker: 'Os contrários',
    title: 'Os tupiniquins',
    body: [
      'Os tupiniquins viviam mais ao sul, para os lados de São Vicente e Bertioga, e também em outros trechos da costa. Eram do mesmo tronco que os tupinambás: a mesma língua, as mesmas casas, as mesmas armas, as mesmas festas.',
      'Mesmo assim, as aldeias de um lado e do outro se faziam guerra. A guerra não era por terra nem por riqueza: era por vingança. Cada morte pedia outra, e a rivalidade passava de pai para filho. Mas não era uma inimizade de todos contra todos e para sempre: alianças e rivalidades mudavam de uma região para outra e de uma época para outra.',
      'É uma rivalidade que conhecemos sobretudo por relatos posteriores a 1500, como o do alemão Hans Staden, preso pelos tupinambás de Ubatuba em 1554.'
    ],
    quote: {
      text: 'E ainda que são contrários os tupiniquins dos tupinambás, não há entre eles na língua e costumes mais diferença da que têm os moradores de Lisboa dos da Beira',
      cite: SOARES('XXXIX')
    }
  },
  madrugada: {
    kicker: 'Como se atacava',
    title: 'Ao romper do dia',
    body: [
      'A guerra se decidia no conselho, no terreiro. Os guerreiros partiam em fila, com os arcos, as flechas, a farinha de guerra e as redes às costas, e mandavam espias à frente.',
      'Perto da aldeia inimiga paravam de acender fogo, para a fumaça não os denunciar. O ataque vinha de madrugada, de surpresa, com gritos, buzinas e tambores.'
    ],
    quote: {
      text: 'ordenam-se de maneira que possam dar nos contrários de madrugada, e em conjunção de lua cheia para andarem a derradeira jornada de noite pelo luar, e tomarem seus contrários despercebidos e descuidados; e em chegando à aldeia dão todos juntos tamanho urro, gritando, que fazem com isso e com suas buzinas e tamboris grande espanto',
      cite: SOARES('CLXVIII')
    }
  },
  cerca: {
    kicker: 'Aldeia em lugar de guerra',
    title: 'A cerca de pau a pique',
    body: [
      'As aldeias que ficavam de frente para os inimigos se fechavam com uma cerca de troncos fincados no chão, com portas e seteiras por onde se flechava quem chegasse.',
      'Do lado de fora, a uma boa distância, ainda armavam uma segunda cerca, mais baixa, a "rede de madeira": quem entrava se embaraçava entre as duas e virava alvo fácil. No jogo, essa é a melhoria da rede.'
    ],
    quote: {
      text: 'faz este gentio de roda da aldeia uma cerca de pau a pique muito forte, com suas portas e seteiras, e afastado da cerca vinte e trinta palmos fazem de redor dela uma rede de madeira, com suas entradas de fora para entre ela e a cerca; para que, se lhe entrarem os contrários dentro, lhe saírem; e ao recolher se embaracem de maneira que os possam flechar e desbaratar, como acontece muitas vezes.',
      cite: SOARES('CLI')
    }
  },
  flechas: {
    kicker: 'No meio da luta',
    title: 'As flechas do chão',
    body: [
      'Na batalha ninguém ficava parado: os guerreiros pulavam de um lado para o outro, assobiando, para não serem alvo fácil. E as flechas que caíam não se perdiam.',
      'No jogo, as flechas que os contrários erram ficam no chão. Qualquer um dos seus que passe por cima apanha e leva até a casa do principal.'
    ],
    quote: { text: 'alguãs velhas custumaõ apanharlhes as frechas pello chaõ e seruillos emquanto pellejaõ', cite: GANDAVO }
  },
  igaras: {
    kicker: 'Pelo mar',
    title: 'As canoas de guerra',
    body: [
      'As igaras eram canoas cavadas num tronco só, compridas o bastante para levar dezenas de remadores de pé. Com elas os tupinambás pescavam, viajavam pela costa e faziam a guerra: havia batalhas inteiras entre canoas, e emboscadas atrás das ilhas.',
      'No jogo, os ataques que vêm pelo mar desembarcam na praia. Uma igara afundada não afoga ninguém: os guerreiros nadam até a areia.'
    ],
    quote: {
      text: 'são grandes remadores, assim nas suas canoas, que fazem de um só pau, que remam em pé vinte e trinta índios, com o que as fazem voar',
      cite: SOARES('CLX')
    }
  },
  principal: {
    kicker: 'O socorro dos vizinhos',
    title: 'O principal',
    body: [
      'Cada aldeia tinha o seu principal, que só mandava de verdade na guerra — e só porque os outros confiavam na sua coragem e na sua experiência. Na paz, cada um fazia o que queria.',
      'Quando uma aldeia era atacada, pedia socorro às vizinhas, e o socorro vinha depressa. Na véspera da luta, o principal andava em volta dos seus, falando alto, dando ânimo. No jogo, os guerreiros perto dele lutam com mais força.'
    ],
    quote: {
      text: 'Em cada aldeia dos tupinambás há um principal, a que seguem somente na guerra onde lhe dão alguma obediência, pela confiança que têm em seu esforço e experiência',
      cite: SOARES('CLI')
    }
  },
  matador: {
    kicker: 'Nomes e riscos',
    title: 'O matador de muitos nomes',
    body: [
      'Quem matava um contrário ganhava um nome novo, revelado numa festa, e às vezes riscava o corpo com um dente de cutia para guardar a marca. Quanto mais nomes, mais respeito.',
      'No jogo, cada guerreiro seu que derruba um contrário toma um nome e fica um pouco mais forte. O matador já chega com muitos.'
    ],
    quote: {
      text: 'e há alguns índios que tomaram tantos nomes, e se riscaram tantas vezes que não têm parte onde não esteja o corpo riscado.',
      cite: SOARES('CLXX')
    }
  },
  velha: {
    kicker: 'As ervas da mata',
    title: 'A velha curandeira',
    body: [
      'Não havia médicos, mas havia muito conhecimento das plantas. As feridas de flecha eram tratadas com ervas, e as mulheres mais velhas cuidavam de muita coisa na aldeia: faziam a louça, a farinha, sangravam os doentes e choravam os mortos.',
      'No jogo, quem fica perto dela sara depressa.'
    ],
    quote: { text: 'Curam as grandes feridas e flechadas com umas ervas, que chamam cabureíba, que é milagrosa', cite: SOARES('CLXV') }
  },
  cativos: {
    kicker: 'Vingança',
    title: 'Os cativos',
    body: [
      'Nem todo contrário morria na luta. Muitos eram levados vivos para a aldeia, onde viviam meses, às vezes anos, bem tratados, até o dia de uma grande festa em que eram mortos no terreiro, diante de todos — e comidos.',
      'Não era fome. Era o ponto alto da vingança, um ritual que ligava os vivos aos mortos de cada lado: o cativo morria com coragem, dizendo que os parentes dele o vingariam. E a guerra continuava. Para os europeus foi a prova de que eram "selvagens"; hoje se estuda como parte de um modo de pensar a guerra, a honra e a memória.'
    ],
    quote: { text: 'a qual se não come por mantimento, senão por vingança', cite: SOARES('CLXXIV') }
  },
  pintura: {
    kicker: 'Jenipapo e urucum',
    title: 'O corpo pintado',
    body: [
      'Ninguém usava roupa. O que se vestia era pintura, pena e enfeite: os lavores pretos de jenipapo, o vermelho do urucum nos pés e no rosto, as contas de búzio ao pescoço, as pedras no beiço furado, os diademas e as carapuças de penas.',
      'No jogo, é pelas penas que se distingue um lado do outro: amarelas nos tupinambás, como diz Soares; vermelhas e pardas nos tupiniquins, como as que Caminha viu em Porto Seguro.'
    ],
    quote: { text: 'Ali veríeis galantes, pintados de preto e vermelho, e quartejados, assim pelos corpos como pelas pernas, que, certo, assim pareciam bem.', cite: CAMINHA }
  },
  cabral: {
    kicker: 'Porto Seguro · abril de 1500',
    title: 'O que veio pelo mar',
    body: [
      'Em abril de 1500, a armada de Pedro Álvares Cabral chegou à costa da Bahia. O escrivão Pero Vaz de Caminha descreveu os tupiniquins que encontrou na praia: arcos nas mãos, corpos pintados, beiços furados. E reparou que não havia ali nenhum dos bichos que os europeus criavam.',
      'O que veio depois foi o fim deste mundo. Em poucas décadas chegaram o ferro, o comércio de pau-brasil, a escravidão e as epidemias. Os tupinambás do Rio de Janeiro se aliaram aos franceses e foram vencidos pelos portugueses nos anos 1560. Os tupiniquins, aliados dos portugueses, também foram dizimados.',
      'Hoje vivem no Brasil povos que descendem desta gente, como os Tupinambá de Olivença, na Bahia, e os Tupiniquim, no Espírito Santo.'
    ],
    quote: { text: 'Nem há aqui boi ou vaca, cabra, ovelha ou galinha, ou qualquer outro animal que esteja acostumado ao viver do homem.', cite: CAMINHA }
  }
});

// As citações das telas de abertura e de fim.
export const QUOTES = Object.freeze({
  start: {
    text: 'As armas com que pellejaõ saõ arcos e frechas a cousa que apontarẽ naõ na erraõ, saõ mui çertos com esta arma e mui temidos nagerra',
    cite: GANDAVO
  },
  end: {
    text: 'Estes indios saõ mui bellicosos e tem sempre grandes gerras hũs contra os outros nunca se acha nelles paz nẽ he possiuel auer antrelles amizade porque huãs nasçoẽs pellejaõ contra outras e mataõse muitos delles, e assy vai creçendo o odio cada vez mais e ficaõ imigos verdadeiros perpetuamente.',
    cite: GANDAVO
  }
});

// Quando cada registro se abre (StoryBook): no começo, depois de uns segundos de
// partida, num ataque, depois de um ataque vencido, ou num acontecimento.
export const STORY_TRIGGERS = Object.freeze({
  begin: 'aldeia',
  after: { id: 'paje', seconds: 25 },
  waveStart: { 1: 'tupiniquins', 2: 'pintura' },
  waveCleared: { 1: 'madrugada', 3: 'cativos', 6: 'cabral' },
  built: { tower: 'cerca' },
  riflePickup: 'flechas',
  canoes: 'igaras'
});

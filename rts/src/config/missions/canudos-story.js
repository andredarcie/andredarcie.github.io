// Os registros do livro de história (botão do livro, ao lado da pausa). Cada um se
// abre num momento da partida (StoryBook decide quando) e conta, em poucas linhas,
// o que de fato aconteceu em Canudos, com um trecho de "Os Sertões".
//
// As citações foram copiadas do texto integral (edição da BibVirt/USP, a mesma de
// config/sertoes.js) — não reescritas de memória, na grafia do livro. `part` é a
// parte do livro. O texto em volta é nosso, contando a história em linguagem de hoje.
export const STORY = Object.freeze({
  canudos: {
    kicker: 'Sertão da Bahia · 1893–1897',
    title: 'Belo Monte, o arraial de Canudos',
    body: [
      'Em 1893, Antônio Conselheiro e seus seguidores se fixaram numa fazenda abandonada à beira do rio Vaza-Barris, no norte da Bahia, e lhe deram o nome de Belo Monte. O lugar era conhecido como Canudos.',
      'Em poucos anos o arraial virou uma das maiores povoações da Bahia, com milhares de casas de taipa. Chegavam vaqueiros, lavradores sem terra, gente que tinha sido escravizada até a abolição de 1888, famílias inteiras fugindo da seca e da miséria. Ali se trabalhava, se rezava e se dividia o que se colhia.',
      'A República, proclamada em 1889, viu no arraial uma ameaça. Entre 1896 e 1897 o Exército mandou quatro expedições contra Belo Monte. É essa guerra que o jogo conta.'
    ],
    quote: { text: 'Canudos, velha fazenda de gado à beira do Vaza-Barris, era, em 1890, uma tapera de cerca de cinqüenta capuabas de pau-a-pique.', part: 'O Homem' }
  },
  conselheiro: {
    kicker: 'Quixeramobim, 1830 — Belo Monte, 1897',
    title: 'Antônio Conselheiro',
    image: './img/story/conselheiro.jpg',
    imageAlt: 'Antônio Conselheiro no jogo: camisolão azul, barba longa e o bordão na mão, no adro da igreja',
    body: [
      'Antônio Vicente Mendes Maciel nasceu no Ceará, em 1830. Depois de uma vida de perdas, largou tudo e passou mais de vinte anos andando pelos sertões como beato: pregava, aconselhava e, com o povo que o seguia, erguia igrejas, cemitérios e açudes nos lugares por onde passava. Daí o nome pelo qual ficou conhecido.',
      'De camisolão azul, cabelos e barba compridos e o bordão de peregrino na mão, juntou em Belo Monte milhares de pessoas que viam nele um homem santo.',
      'Não pegava em armas. Morreu em setembro de 1897, durante o cerco final, duas semanas antes da queda do arraial. No jogo, ele reza pelos feridos que chegam perto dele.'
    ],
    quote: { text: 'E surgia na Bahia o anacoreta sombrio, cabelos crescidos até aos ombros, barba inculta e longa; face escaveirada; olhar fulgurante; monstruoso, dentro de um hábito azul de brim americano; abordoado ao clássico bastão em que se apóia o passo tardo dos peregrinos...', part: 'O Homem' }
  },
  uaua: {
    kicker: 'Uauá · 21 de novembro de 1896',
    title: 'A primeira expedição',
    body: [
      'O estopim foi uma encomenda de madeira para a igreja nova de Belo Monte, paga e não entregue em Juazeiro. Correu o boato de que os conselheiristas viriam buscá-la à força, e o governo da Bahia mandou o tenente Pires Ferreira com pouco mais de cem soldados.',
      'A tropa parou em Uauá, um povoado a caminho de Canudos. Na madrugada de 21 de novembro, os sertanejos chegaram como numa procissão, com cruzes, estandartes e rezas, e atacaram. Depois de horas de luta, os soldados ganharam o terreno, mas exaustos e sem condições de seguir, voltaram para Juazeiro.',
      'Foi a primeira das quatro expedições.'
    ],
    quote: { text: 'A multidão guerreira avançava para Uauá, derivando à toada vagarosa dos kyries, rezando.', part: 'A Luta' }
  },
  sertoes: {
    kicker: 'Euclides da Cunha · 1902',
    title: 'Os Sertões',
    body: [
      'Euclides da Cunha, engenheiro e jornalista, foi a Canudos em 1897 como correspondente do jornal O Estado de S. Paulo e acompanhou a quarta expedição até o fim. Partiu achando que ia ver a República vencer uma revolta de fanáticos; voltou dizendo que tinha visto um crime.',
      'Em 1902 publicou Os Sertões, em três partes: A Terra, sobre o sertão e a seca; O Homem, sobre o sertanejo e Antônio Conselheiro; e A Luta, sobre a guerra.',
      'O livro carrega ideias da ciência da época sobre raça que hoje sabemos erradas, mas é o grande relato da guerra e um dos livros mais importantes do Brasil. Os trechos deste diário vêm dele.'
    ],
    quote: { text: 'O sertanejo é, antes de tudo, um forte.', part: 'O Homem' }
  },
  abade: {
    kicker: 'O chefe do povo',
    title: 'João Abade',
    body: [
      'Braço direito de Antônio Conselheiro na defesa, João Abade comandava os homens de Belo Monte: organizava as rondas, recebia quem chegava ao arraial e liderava a luta nas estradas. O povo o chamava de "comandante da rua".',
      'Morreu em agosto de 1897, durante o cerco. No jogo, os jagunços perto dele lutam com mais força.'
    ],
    quote: { text: 'O comandante da praça, o "chefe do povo", o astuto João Abade, abrange no olhar dominador a turba genuflexa.', part: 'O Homem' }
  },
  pajeu: {
    kicker: 'Mestre da tocaia',
    title: 'Pajeú',
    body: [
      'Pajeú conhecia a caatinga como ninguém. Atacava de surpresa, pelo flanco, e sumia no mato antes que a tropa pudesse responder. Foi um dos grandes responsáveis pela derrota da terceira expedição, a do coronel Moreira César, em março de 1897, e voltou a fustigar a quarta pelo caminho.',
      'Morreu nos combates de julho de 1897. No jogo, parado na caatinga ele some de vista, e o primeiro tiro vale por três.'
    ],
    quote: { text: 'Ladeia-o o afoito Pajeú, rosto de bronze vincado de apófises duras, mal aprumado o arcabouço atlético.', part: 'O Homem' }
  },
  quadrado: {
    kicker: 'O curandeiro',
    title: 'Manuel Quadrado',
    body: [
      'Num arraial sem médico, era Manuel Quadrado quem tratava os doentes e os feridos, com as ervas e raízes que conhecia da caatinga.',
      'No jogo, quem fica perto dele sara depressa.'
    ],
    quote: { text: 'Era o curandeiro; o médico. Na multidão suspeita a natureza tinha, afinal, um devoto.', part: 'O Homem' }
  },
  vilanova: {
    kicker: 'O negociante',
    title: 'Antônio Vilanova',
    body: [
      'Comerciante, Antônio Vilanova cuidava do abastecimento de Belo Monte: comprava, vendia e distribuía o que entrava no arraial, e mantinha os negócios com as vilas em volta.',
      'Deixou o arraial antes do fim e sobreviveu à guerra. No jogo, tudo o que entra rende mais com ele por perto, e dá para trocar comida por madeira.'
    ],
    quote: { text: 'Alheio à credulidade geral, um explorador solerte, Vila-Nova, finge que ora, remascando cifras.', part: 'O Homem' }
  },
  macambira: {
    kicker: 'Alto da Favela · 1º de julho de 1897',
    title: 'O filho de Macambira',
    body: [
      'A quarta expedição trouxe a "Matadeira", um canhão Whitworth enorme que, do alto da Favela, derrubava as igrejas de Belo Monte.',
      'No dia 1º de julho de 1897, o filho mais velho de Joaquim Macambira, um rapaz de dezoito anos, pediu ao pai para ir destruí-la. Atravessou o Vaza-Barris com onze companheiros, subiu a encosta pela caatinga e chegou até a artilharia, no meio do acampamento do Exército. Batalhões inteiros caíram sobre eles. Só um escapou.'
    ],
    quote: { text: '"Pai! quero escangalhar a matadeira!" […] "Consulta o Conselheiro — e vai."', part: 'A Luta' }
  }
});

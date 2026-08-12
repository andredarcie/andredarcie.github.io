// Todo o texto que a interface diz, em um lugar só.
// Trocar este objeto muda o idioma; nenhum outro arquivo guarda texto visível.

export const LOCALE = 'pt-BR';

export const S = {
  tally: {
    photos: 'Fotos',
    states: 'Estados',
    cidades: 'Cidades',
    km: 'Quilômetros',
    days: 'Dias na estrada',
  },

  // Escrito a partir dos dados, não fixo: a rota corre no sentido em que correu.
  route: (de, ate, n) =>
    de === ate
      ? `${de} · ${n} ${n === 1 ? 'estado' : 'estados'}`
      : `De ${de} a ${ate} · ${n} estados, na ordem em que foram percorridos`,

  count: (n, total) =>
    n === total
      ? `${fmtNum(n)} fotos`
      : `${fmtNum(n)} de ${fmtNum(total)} fotos`,

  clear: 'Limpar',

  // Semanas contadas dentro do estado, em blocos corridos de sete dias a partir
  // da chegada — não semana do calendário, que partiria uma estadia ao meio.
  semana: {
    titulo: (n) => `Semana ${n}`,
    semLugar: 'Sem localização',
  },

  // Faixa de resumo. Sem filtro mostra a viagem inteira; com um estado
  // selecionado, mostra quanto tempo ele durou — que diz mais sobre a viagem
  // do que a contagem de fotos.
  dossier: {
    all: (de, ate, dias, estados, km) =>
      `${de} a ${ate} · ${fmtNum(dias)} dias · ${estados} estados · ${fmtNum(km)} km`,
    state: (nome, de, ate, dias, fotos, km, cidades) =>
      [
        nome,
        `${de} a ${ate}`,
        `${dias} ${dias === 1 ? 'dia' : 'dias'}`,
        `${fmtNum(fotos)} fotos`,
        `${fmtNum(km)} km`,
      ].join(' · ') + (cidades ? ` · ${cidades}` : ''),
  },

  cull: {
    on: 'Apagar fotos',
    off: 'Sair do modo apagar',
    count: (n) => (n === 1 ? '1 foto marcada' : `${fmtNum(n)} fotos marcadas`),
    empty: 'Clique nas fotos para marcar. Nada é apagado aqui.',
    copied: 'Lista copiada. Cole para o Claude, ou rode: npm run exclude',
    copyFailed: 'Área de transferência bloqueada — selecione o texto acima e copie.',
    copy: 'Copiar lista',
    unmark: 'Desmarcar todas',
  },

  noMatch: {
    title: 'Nada corresponde a esses filtros.',
    hint: 'Amplie o período ou limpe a seleção de estado.',
  },

  noData: {
    title: 'Nenhum manifesto ainda.',
    steps: ['npm install', 'npm run all'],
    hint: 'Antes, aponte takeoutDir no config.json para o export descompactado.',
  },

  mapEmpty: 'Contorno dos estados indisponível — rode npm run geo',

  // Como a posição da foto foi determinada. A distinção é real e o site a mostra
  // em vez de fingir que todas têm a mesma confiança.
  loc: {
    exact: 'GPS',
    coast: 'GPS · na faixa de praia',
    offshore: 'GPS · sobre a água',
    inferred: 'inferida pelo horário',
  },

  lb: {
    day: (n, total) => `dia ${fmtNum(n)} de ${fmtNum(total)}`,
    position: (i, n) => `${fmtNum(i)} / ${fmtNum(n)}`,
    close: 'Fechar',
    prev: 'Foto anterior',
    next: 'Próxima foto',
  },

  map: {
    photos: (n, uf) => `${fmtNum(n)} fotos${uf ? ` · ${uf}` : ''}`,
    onWater: ' · sobre a água',
    label: 'Mapa do Brasil com todas as fotos geolocalizadas',
  },

  legend: {
    land: 'Em terra',
    water: 'Sobre a água',
    inferred: 'Inferida pelo horário',
    route: 'Rota percorrida',
    hint: 'Os círculos numerados agrupam fotos próximas — clique para aproximar',
  },

  curio: {
    secao: 'O que os metadados sabem',
    intro: 'Nada disso foi anotado — sai da hora, da posição e da própria imagem de cada foto.',

    vertical: 'na vertical',
    verticalNota: 'O celular quase nunca virou de lado.',

    fimDeSemana: 'sábado sobre segunda',
    fimDeSemanaNota: (sab, seg) => `${sab} fotos por sábado contra ${seg} por segunda. Nômade digital ainda trabalha.`,

    diaMaisCheio: 'no dia mais cheio',
    diaMaisCheioNota: (data, uf) => `${data}${uf ? `, no ${uf}` : ''}.`,

    maiorSalto: 'no maior salto',
    maiorSaltoNota: (data) => `Entre fotos consecutivas em ${data}.`,

    silencio: 'dias sem foto',
    silencioNota: (de, ate) => `O maior silêncio: ${de} a ${ate}.`,

    altitude: 'de altitude mediana',
    altitudeNota: (max) => `A viagem inteira ao nível do mar — com um pico de ${max} m.`,

    rajada: 'em rajada',
    rajadaNota: 'Fotos tiradas a menos de três segundos da anterior.',

    diasComFoto: 'dias com foto',
    diasComFotoNota: 'De um ano inteiro.',

    tira: 'O ano, foto a foto',
    tiraNota: 'Cada listra é a cor média de uma foto, na ordem em que foram tiradas.',
    tiraAlt: (n) => `Faixa com a cor média de ${n} fotos em ordem cronológica`,

    porDiaSemana: 'Fotos por dia da semana',
    porDiaSemanaNota: 'Média por dia, não total — houve mais sábados que segundas no caminho.',
    porHora: 'Fotos por hora do dia',
    porHoraNota: 'Horário de Brasília.',
    fotos: 'fotos',
    fotosPorDia: 'fotos por dia',
  },

  // Museu da Travessia. Tudo que a experiência em primeira pessoa diz — inclusive
  // o que é pintado em canvas e vira textura de parede.
  museu: {
    acervo: (fotos, salas) => `${fmtNum(fotos)} fotos emolduradas em ${salas} salas`,
    semAcervo: 'Acervo não encontrado. Rode npm run build.',
    abrindo: 'Acendendo as luzes…',

    notaQualidade: {
      alta: 'Sombra projetada, brilho na claraboia, poeira no ar.',
      leve: 'Sem sombra nem pós-produção. Para celular e máquina antiga.',
    },

    som: 'Som',
    ligado: 'Ligado',
    desligado: 'Desligado',

    ajudaMouse: [
      'WASD ou setas para andar',
      'Mouse para olhar · Shift para correr',
      'E para ver a foto de perto',
      'Tab abre o índice de salas',
    ],
    ajudaToque: [
      'Arraste para olhar',
      'Manche para andar',
      'Toque na etiqueta para ver de perto',
      '“Salas” troca de estado',
    ],

    quadros: (n) => `${fmtNum(n)} quadros`,

    verDePerto: 'E · ver de perto',
    verDePertoToque: 'Ver de perto',
    retomar: 'Clique para voltar a andar',

    lupaPos: (i, n) => `${fmtNum(i)} de ${fmtNum(n)} nesta sala`,
    camera: (c) => `Feita com ${c}`,

    aSeguir: 'A SEGUIR',
    deVolta: 'DE VOLTA A',
    fim: 'FIM DA TRAVESSIA',
    inicio: 'ANTES DAQUI, NADA',
    fimNota: 'Daqui só se volta.',
    inicioNota: 'A primeira foto do ano foi tirada nesta sala.',

    // Texto de parede: o painel que toda exposição tem logo depois da entrada.
    // Nada aqui é escrito à mão — sai inteiro dos metadados das fotos da sala.
    painel: {
      sala: (romano) => `SALA ${romano}`,
      periodo: (de, ate) => `${de} — ${ate}`,
      numeros: (dias, km, fotos) =>
        `${fmtNum(dias)} ${dias === 1 ? 'dia' : 'dias'} · ${fmtNum(km)} km · ${fmtNum(fotos)} fotos`,
      cheio: (data, n) => `O dia mais cheio foi ${data}, com ${fmtNum(n)} fotos.`,
      assinatura: 'MUSEU DA TRAVESSIA · 2024',
    },
  },

  skip: 'Pular para as fotos',
  filterByState: 'Filtrar por estado',
  filterByDate: 'Filtrar por data',
  timelineLabel: 'Mostrar fotos até esta data',
  markedLabel: 'Nomes das fotos marcadas',

  months: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
};

export const fmtNum = (n) => Number(n).toLocaleString(LOCALE);

/**
 * Numeral romano. Cada estado é um canto da travessia, numerado na ordem em que
 * foi percorrido — a moldura armorial pede algarismo romano, não índice de array.
 */
export function romano(n) {
  const tabela = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let resto = Number(n);
  let saida = '';
  for (const [valor, letra] of tabela) {
    while (resto >= valor) {
      saida += letra;
      resto -= valor;
    }
  }
  return saida || '—';
}

export const fmtDate = (ms) =>
  ms
    ? new Date(ms).toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' })
        .replace('.', '')
    : '—';

/** Por extenso — para o texto de parede, onde a data é frase e não etiqueta. */
export const fmtDateLong = (ms) =>
  ms
    ? new Date(ms).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

/** Sem o ano — para intervalos onde o ano já está dito uma vez. */
export const fmtDay = (ms) =>
  ms
    ? new Date(ms).toLocaleDateString(LOCALE, { day: '2-digit', month: 'short' }).replace('.', '')
    : '—';

/**
 * Só o mês, por extenso. Serve para desambiguar salas do museu que repetem o
 * estado: a viagem passa pela Bahia três vezes, e "Bahia" três vezes no índice
 * não diz qual é qual.
 */
export const fmtMonth = (ms) =>
  ms ? new Date(ms).toLocaleDateString(LOCALE, { month: 'long' }) : '';

export const fmtTime = (ms) =>
  ms ? new Date(ms).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' }) : '';

export const fmtCoord = (lat, lon) =>
  lat === null || lon === null ? '—' : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

/** Dias inclusivos entre dois instantes. */
export const daysBetween = (a, b) =>
  a && b ? Math.round((b - a) / 86400000) + 1 : null;

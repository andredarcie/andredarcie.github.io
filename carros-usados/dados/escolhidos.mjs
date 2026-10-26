// Versões escolhidas para cada comparativo: a versão mais simples (a mais barata) de cada modelo
// que sai de fábrica com airbag frontal e freio ABS de série. Cada linha liga as fontes:
// fc = página na Ficha Completa (triagem), fipe = [código da marca, código do modelo] na FIPE.
export const GRUPOS = {
  2008: [
    { nome: 'Chevrolet Vectra Elegance 2.0', fc: 'chevrolet/vectra-elegance-2-0-8v-2008', fipe: [23, 3821], mobi: ['chevrolet', 'vectra'], mobiVersao: '^Elegance 2\\.0 \\(Flex\\)$' },
    { nome: 'Fiat Stilo 1.8', fc: 'fiat/stilo-1-8-8v-2008', fipe: [21, 3813], mobi: ['fiat', 'stilo'], mobiVersao: '^1\\.8 8V \\(Flex\\)$' },
    { nome: 'Fiat Punto ELX 1.4', fc: 'fiat/punto-elx-1-4-2008', fipe: [21, 4421], mobi: ['fiat', 'punto'], mobiVersao: '^ELX 1\\.4' },
    { nome: 'Volkswagen Jetta 2.5', fc: 'volkswagen/jetta-2-5-tiptronic-2008', fipe: [59, 4147], mobi: ['volkswagen', 'jetta'], mobiVersao: '^2\\.5' },
    { nome: 'Renault Mégane Sedan Expression 1.6', fc: 'renault/megane-expression-1-6-2008', fipe: [48, 3976], mobi: ['renault', 'megane-sedan'], mobiVersao: 'Expression 1\\.6' },
    { nome: 'Renault Mégane Grand Tour Expression 1.6', fc: 'renault/megane-grand-tour-expression-1-6-2008', fipe: [48, 4728], mobi: ['renault', 'megane-grand-tour'], mobiVersao: 'Expression 1\\.6' },
    { nome: 'Renault Grand Scénic Dynamique 2.0 AT', fc: 'renault/scenic-grand-dynamique-2-0-16v-at-2008', fipe: [48, 4580], mobi: ['renault', 'scenic'], mobiVersao: 'Grand' },
    { nome: 'Citroën C3 Exclusive 1.6 AT', fc: 'citroen/c3-exclusive-1-6-at-2008', fipe: [13, 4761], mobi: ['citroen', 'c3'], mobiVersao: '^Exclusive 1\\.6' },
    { nome: 'Citroën C4 VTR 2.0', fc: 'citroen/c4-vtr-2-0-2008', fipe: [13, 4159], mobi: ['citroen', 'c4'], mobiVersao: 'VTR' },
    { nome: 'Citroën C4 Pallas GLX 2.0', fc: 'citroen/c4-pallas-glx-2-0-2008', fipe: [13, 4400], mobi: ['citroen', 'c4-pallas'], mobiVersao: '^GLX 2\\.0 16V$' },
    { nome: 'Honda Civic LXS 1.8', fc: 'honda/civic-lxs-1-8-2008', fipe: [25, 4011], mobi: ['honda', 'civic'], mobiVersao: '^New LXS 1\\.8 16V \\(Flex\\)$' },
    { nome: 'Toyota Corolla Fielder XEi 1.8', fc: 'toyota/fielder-xei-1-8-2008', fipe: [56, 2222], mobi: ['toyota', 'fielder'], mobiVersao: '^XEi 1\\.8 16V \\(flex\\)$' },
    { nome: 'Nissan Tiida SL 1.8', fc: 'nissan/tiida-sl-1-8-2008', fipe: [43, 4406], mobi: ['nissan', 'tiida'], mobiVersao: '^SL 1\\.8$' },
    { nome: 'Nissan Sentra 2.0', fc: 'nissan/sentra-2-0-2008', fipe: [43, 4295], mobi: ['nissan', 'sentra'], mobiVersao: '^2\\.0 16V( \\(flex\\))?$' },
  ],
  // 2014 (desde 1º/1/2014 airbag e ABS são obrigatórios em carro novo): quase todo modelo passa no
  // filtro, então ficam os 15 modelos cuja versão mais simples com os dois itens tem o menor preço
  // FIPE (agosto/2026), sempre na carroceria de 4 ou 5 portas
  2014: [
    { nome: 'Chevrolet Classic LS 1.0', fc: 'chevrolet/classic-ls-1-0-2014', fipe: [23, 4924], mobi: ['chevrolet', 'classic'], mobiVersao: '^LS ' },
    { nome: 'Volkswagen up! take 1.0 (5 portas)', fc: 'volkswagen/up-take-1-0-2014', fipe: [59, 6718], mobi: ['volkswagen', 'up'], mobiVersao: 'take up!(?! 2p)' },
    { nome: 'Renault Logan Authentique 1.0', fc: 'renault/logan-authentique-1-0-16v-2014', fipe: [48, 4387], mobi: ['renault', 'logan'], mobiVersao: '^Authentique 1\\.0' },
    { nome: 'Fiat Uno Vivace/Rua 1.0 (4 portas)', fc: 'fiat/uno-rua-1-0-2014', fipe: [21, 5241], mobi: ['fiat', 'uno'], mobiVersao: '^(Vivace|Rua) 1\\.0 8V \\(Flex\\) 4p$' },
    { nome: 'Renault Sandero Expression 1.0', fc: 'renault/sandero-expression-1-0-16v-2014', fipe: [48, 4506], mobi: ['renault', 'sandero'], mobiVersao: '^Expression 1\\.0' },
    { nome: 'Ford Fiesta 1.0 (hatch)', fc: 'ford/fiesta-1-0-2014', fipe: [22, 6425], mobi: ['ford', 'fiesta-hatch'], mobiVersao: '^S Rocam 1\\.0' },
    { nome: 'Volkswagen Gol City 1.0 (4 portas)', fc: 'volkswagen/gol-city-1-0-2014', fipe: [59, 2414], mobi: ['volkswagen', 'gol'], mobiVersao: '^City \\(Trend\\)' },
    { nome: 'Fiat Palio Fire 1.0 (4 portas)', fc: 'fiat/palio-fire-1-0-2014', fipe: [21, 4828], mobi: ['fiat', 'palio'], mobiVersao: '^Fire 1\\.0 8V \\(Flex\\) 4p$' },
    { nome: 'Chevrolet Celta LT 1.0 (4 portas)', fc: 'chevrolet/celta-lt-1-0-2014', fipe: [23, 1002], mobi: ['chevrolet', 'celta'], mobiVersao: '^LT 1\\.0 \\(Flex\\)$|^Spirit/ LT 1\\.0' },
    { nome: 'Fiat Siena EL 1.0', fc: 'fiat/siena-el-1-0-2014', fipe: [21, 4860], mobi: ['fiat', 'siena'], mobiVersao: '^EL 1\\.0 8V \\(Flex\\)$' },
    { nome: 'Peugeot 208 Active 1.5', fc: 'peugeot/208-active-1-5-2014', fipe: [44, 6396], mobi: ['peugeot', '208'], mobiVersao: '^Active (Pack )?1\\.5' },
    { nome: 'Chevrolet Cobalt LS 1.4', fc: 'chevrolet/cobalt-ls-1-4-2014', fipe: [23, 5723], mobi: ['chevrolet', 'cobalt'], mobiVersao: '^LS 1\\.4' },
    { nome: 'Fiat Linea Essence 1.8', fc: 'fiat/linea-essence-1-8-2014', fipe: [21, 5577], mobi: ['fiat', 'linea'], mobiVersao: '^Essence 1\\.8' },
    { nome: 'Chevrolet Spin LS 1.8', fc: 'chevrolet/spin-ls-1-8-2014', fipe: [23, 6490], mobi: ['chevrolet', 'spin'], mobiVersao: '^LS ' },
    { nome: 'Nissan Livina 1.6', fc: 'nissan/livina-1-6-2014', fipe: [43, 4864], mobi: ['nissan', 'livina'], mobiVersao: '^1\.6' },
  ],
};
// tabelas FIPE de agosto (código de referência → ano), para o histórico de 5 anos
export const AGOSTOS = { 2021: 273, 2022: 288, 2023: 300, 2024: 312, 2025: 324, 2026: 336 };

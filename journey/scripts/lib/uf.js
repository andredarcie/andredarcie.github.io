// IBGE state codes -> identity. The `malhas` API only returns `codarea`, so this
// table is what turns a polygon into a place name.

export const UF = {
  11: { sigla: 'RO', nome: 'Rondônia', regiao: 'Norte' },
  12: { sigla: 'AC', nome: 'Acre', regiao: 'Norte' },
  13: { sigla: 'AM', nome: 'Amazonas', regiao: 'Norte' },
  14: { sigla: 'RR', nome: 'Roraima', regiao: 'Norte' },
  15: { sigla: 'PA', nome: 'Pará', regiao: 'Norte' },
  16: { sigla: 'AP', nome: 'Amapá', regiao: 'Norte' },
  17: { sigla: 'TO', nome: 'Tocantins', regiao: 'Norte' },
  21: { sigla: 'MA', nome: 'Maranhão', regiao: 'Nordeste' },
  22: { sigla: 'PI', nome: 'Piauí', regiao: 'Nordeste' },
  23: { sigla: 'CE', nome: 'Ceará', regiao: 'Nordeste' },
  24: { sigla: 'RN', nome: 'Rio Grande do Norte', regiao: 'Nordeste' },
  25: { sigla: 'PB', nome: 'Paraíba', regiao: 'Nordeste' },
  26: { sigla: 'PE', nome: 'Pernambuco', regiao: 'Nordeste' },
  27: { sigla: 'AL', nome: 'Alagoas', regiao: 'Nordeste' },
  28: { sigla: 'SE', nome: 'Sergipe', regiao: 'Nordeste' },
  29: { sigla: 'BA', nome: 'Bahia', regiao: 'Nordeste' },
  31: { sigla: 'MG', nome: 'Minas Gerais', regiao: 'Sudeste' },
  32: { sigla: 'ES', nome: 'Espírito Santo', regiao: 'Sudeste' },
  33: { sigla: 'RJ', nome: 'Rio de Janeiro', regiao: 'Sudeste' },
  35: { sigla: 'SP', nome: 'São Paulo', regiao: 'Sudeste' },
  41: { sigla: 'PR', nome: 'Paraná', regiao: 'Sul' },
  42: { sigla: 'SC', nome: 'Santa Catarina', regiao: 'Sul' },
  43: { sigla: 'RS', nome: 'Rio Grande do Sul', regiao: 'Sul' },
  50: { sigla: 'MS', nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste' },
  51: { sigla: 'MT', nome: 'Mato Grosso', regiao: 'Centro-Oeste' },
  52: { sigla: 'GO', nome: 'Goiás', regiao: 'Centro-Oeste' },
  53: { sigla: 'DF', nome: 'Distrito Federal', regiao: 'Centro-Oeste' },
};

// Geographic coast order, north to south. Used only to identify the Northeast
// and as a tiebreaker — NOT to order the site.
//
// Ordering by this was a mistake worth recording: the trip actually ran the
// other way, Bahia northward, and no hardcoded geography could have known that.
// build.js sorts states by the timestamp of their first photo instead, so the
// order on screen is the order they were travelled, whichever way that goes.
export const NORDESTE_COAST_ORDER = ['MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA'];

export function ufByCode(code) {
  return UF[Number(code)] || null;
}

const BY_SIGLA = new Map(Object.values(UF).map((u) => [u.sigla, u]));

export function ufBySigla(sigla) {
  return BY_SIGLA.get(sigla) || null;
}

export function isNordeste(sigla) {
  return NORDESTE_COAST_ORDER.includes(sigla);
}

export function coastIndex(sigla) {
  const i = NORDESTE_COAST_ORDER.indexOf(sigla);
  return i === -1 ? 99 : i;
}

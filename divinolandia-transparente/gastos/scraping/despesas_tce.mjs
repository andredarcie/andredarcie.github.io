// Despesas de um exercício fechado, a partir de fontes oficiais estruturadas:
//   - SICONFI (Tesouro Nacional), DCA Anexo I-E: empenhado e pago por função;
//   - API do TCE-SP: cada empenho, anulação e pagamento, para os recortes por mês e por credor.
// Substitui o scraping_despesas.py, que somava os empenhos sem descontar as anulações
// (2025: R$ 87,8 mi brutos contra R$ 77,8 mi do balanço oficial).
//
// Uso: node scraping/despesas_tce.mjs [ano]   (padrão 2025; a DCA do ano precisa estar publicada)
// Grava data/despesas.json e reescreve a constante DESPESAS_DATA em js/data.js.
// Aborta sem gravar nada se os totais do TCE-SP e do SICONFI não baterem no centavo.

import { readFile, writeFile } from 'node:fs/promises';

const ANO = Number(process.argv[2] ?? 2025);
const MUNICIPIO_TCE = 'divinolandia';
const IBGE = 3513900;
const TOP_CREDORES = 25;
const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const RAIZ = new URL('../', import.meta.url);

const centavos = v => Math.round(v * 100) / 100;
const valorBR = s => Number(String(s).replace(/\./g, '').replace(',', '.'));
const espera = ms => new Promise(r => setTimeout(r, ms));

async function baixar(url) {
  for (let tentativa = 1; ; tentativa++) {
    const resp = await fetch(url);
    if (resp.ok) return resp.json();
    if (tentativa === 3) throw new Error(`HTTP ${resp.status} em ${url}`);
    await espera(2000 * tentativa);
  }
}

// ── Por função: DCA do SICONFI ─────────────────────────────────────
const dca = (await baixar(
  `https://apidatalake.tesouro.gov.br/ords/siconfi/tt/dca?an_exercicio=${ANO}&no_anexo=DCA-Anexo%20I-E&id_ente=${IBGE}`
)).items ?? [];
if (!dca.length) throw new Error(`DCA ${ANO} ainda não publicada no SICONFI`);
const dcaValor = (conta, coluna) => dca.find(x => x.conta === conta && x.coluna === coluna)?.valor ?? 0;

const porFuncao = dca
  .filter(x => x.coluna === 'Despesas Empenhadas' && /^\d{2} - /.test(x.conta))
  .map(x => ({
    funcao: x.conta.replace(/^\d{2} - /, ''),
    empenhado: centavos(x.valor),
    pago: centavos(dcaValor(x.conta, 'Despesas Pagas')),
  }));

// Intraorçamentárias: pagamentos entre órgãos do próprio município (ex.: contribuição
// patronal ao instituto de previdência). A DCA não abre por função, então viram uma linha só.
const INTRA = 'Despesas Intraorçamentárias';
const EXCETO = 'Despesas Exceto Intraorçamentárias';
const intra = { empenhado: dcaValor(INTRA, 'Despesas Empenhadas'), pago: dcaValor(INTRA, 'Despesas Pagas') };
if (intra.empenhado) {
  porFuncao.push({ funcao: 'Repasses internos', empenhado: centavos(intra.empenhado), pago: centavos(intra.pago), interno: true });
}
porFuncao.sort((a, b) => b.empenhado - a.empenhado);

const totalEmpenhado = centavos(dcaValor(EXCETO, 'Despesas Empenhadas') + intra.empenhado);
const totalPago = centavos(dcaValor(EXCETO, 'Despesas Pagas') + intra.pago);

// ── Por mês e por credor: eventos do TCE-SP ────────────────────────
const eventos = [];
for (let mes = 1; mes <= 12; mes++) {
  const lote = await baixar(`https://transparencia.tce.sp.gov.br/api/json/despesas/${MUNICIPIO_TCE}/${ANO}/${mes}`);
  for (const e of lote) eventos.push({ ...e, mes });
  await espera(500);
}

// CNPJ de cada órgão do município. Empenho de um órgão para o próprio CNPJ é a folha dele; a do
// instituto de previdência são as aposentadorias e pensões, que não podem se misturar com os
// repasses que a prefeitura faz ao mesmo CNPJ.
const ORGAOS = [
  { padrao: /PREVID/i, cnpj: '05119717000170', folha: 'APOSENTADORIAS E PENSÕES (FOLHA DO INSTITUTO DE PREVIDÊNCIA)' },
  { padrao: /C.MARA/i, cnpj: '00579769000106', folha: null },
  { padrao: /PREFEITURA/i, cnpj: '46435921000188', folha: null },
];
function folhaPropria(e) {
  const orgao = ORGAOS.find(o => o.padrao.test(e.orgao));
  return orgao && e.id_fornecedor.includes(orgao.cnpj) ? orgao : null;
}

const chave = e => `${e.orgao}|${e.nr_empenho.trim()}`;
// A anulação conta no mês em que o empenho foi emitido, não no mês em que foi anulada:
// assim dezembro não fica negativo com os cancelamentos de fim de ano.
const mesDeEmissao = new Map(eventos.filter(e => e.evento === 'Empenhado').map(e => [chave(e), e.mes]));

const soma = { 'Empenhado': 0, 'Anulação': 0, 'Valor Pago': 0 };
const porMes = MESES.map(mes => ({ mes, empenhado: 0, pago: 0 }));
const credores = new Map();
for (const e of eventos) {
  const valor = valorBR(e.vl_despesa);
  if (e.evento in soma) soma[e.evento] += valor;

  // Agrupa pelo documento (CNPJ, ou código do TCE para pessoa física), o que junta grafias diferentes do
  // mesmo credor. A folha própria de cada órgão fica num grupo à parte.
  const propria = folhaPropria(e);
  const chaveCredor = propria ? `folha|${e.orgao}` : e.id_fornecedor;
  let c = credores.get(chaveCredor);
  if (!c) credores.set(chaveCredor, c = { nomes: new Map(), empenhos: new Set(), empenhado: 0, pago: 0, nomeFixo: propria?.folha });
  const nome = e.nm_fornecedor.replace(/\s+/g, ' ').trim();
  c.nomes.set(nome, (c.nomes.get(nome) ?? 0) + 1);

  if (e.evento === 'Empenhado') {
    porMes[e.mes - 1].empenhado += valor;
    c.empenhado += valor;
    c.empenhos.add(chave(e));
  } else if (e.evento === 'Anulação') {
    porMes[(mesDeEmissao.get(chave(e)) ?? e.mes) - 1].empenhado -= valor;
    c.empenhado -= valor;
  } else if (e.evento === 'Valor Pago') {
    porMes[e.mes - 1].pago += valor;
    c.pago += valor;
  }
}

// ── Trava: as duas fontes têm que bater no centavo ─────────────────
const confere = (rotulo, tce, siconfi) => {
  if (Math.abs(tce - siconfi) > 0.01) throw new Error(`${rotulo}: TCE-SP ${tce.toFixed(2)} ≠ SICONFI ${siconfi.toFixed(2)}`);
};
confere('Empenhado menos anulações', soma['Empenhado'] - soma['Anulação'], totalEmpenhado);
confere('Pago', soma['Valor Pago'], totalPago);

const dados = {
  ano: String(ANO),
  fonte: 'SICONFI (DCA, Anexo I-E) e TCE-SP (API de despesas)',
  gerado_em: new Date().toISOString().slice(0, 10),
  total_empenhado: totalEmpenhado,
  total_pago: totalPago,
  total_anulado: centavos(soma['Anulação']),
  por_funcao: porFuncao,
  por_credor: [...credores.values()]
    .filter(c => c.empenhado > 0.005)
    .sort((a, b) => b.empenhado - a.empenhado)
    .slice(0, TOP_CREDORES)
    .map(c => ({
      credor: c.nomeFixo ?? [...c.nomes].sort((a, b) => b[1] - a[1])[0][0],
      empenhado: centavos(c.empenhado),
      pago: centavos(c.pago),
      empenhos: c.empenhos.size,
    })),
  por_mes: porMes.map(m => ({ mes: m.mes, empenhado: centavos(m.empenhado), pago: centavos(m.pago) })),
};

await writeFile(new URL('data/despesas.json', RAIZ), JSON.stringify(dados, null, 2) + '\n', 'utf8');
const arquivoJs = new URL('js/data.js', RAIZ);
const js = await readFile(arquivoJs, 'utf8');
const linha = /^const DESPESAS_DATA = .*;$/m;
if (!linha.test(js)) throw new Error('constante DESPESAS_DATA não encontrada em js/data.js');
await writeFile(arquivoJs, js.replace(linha, () => `const DESPESAS_DATA = ${JSON.stringify(dados)};`), 'utf8');

const reais = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
console.log(`Despesas ${ANO}: empenhado ${reais(totalEmpenhado)} · pago ${reais(totalPago)} · anulado ${reais(dados.total_anulado)}`);
console.log(`${eventos.length} eventos do TCE-SP · ${porFuncao.length} linhas por função · ${dados.por_credor.length} credores`);

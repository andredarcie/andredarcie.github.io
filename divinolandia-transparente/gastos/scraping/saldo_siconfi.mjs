// Sobra ou déficit de cada ano, caixa e dívidas do município, a partir de fontes oficiais:
//   - SICONFI, RREO Anexo 1 (Balanço Orçamentário): receita arrecadada e despesa empenhada. Ano fechado usa
//     o balanço de dezembro; o ano em andamento usa o bimestre mais recente que o TCE-SP também já cobre;
//   - SICONFI, RGF Anexo 2 (Dívida Consolidada Líquida): caixa, empréstimos e precatórios no fim do ano ou,
//     no ano em andamento, no último quadrimestre/semestre publicado;
//   - SICONFI, RREO Anexo 7 do ano seguinte: o que ficou para pagar e acabou cancelado;
//   - API do TCE-SP: contas do instituto de previdência (IPMD), repasses da prefeitura a ele e pagamentos de
//     precatórios ao Tribunal de Justiça.
// Uso: node scraping/saldo_siconfi.mjs [ano inicial]   (padrão 2020; vai até o ano corrente)
// Grava data/saldo.json e a constante SALDO_DATA em js/data.js.
// Aborta sem gravar se: receita − despesa não bater com o superávit/déficit do balanço; o TCE-SP
// divergir do balanço em mais de R$ 100 mil; ou a dívida consolidada tiver item além de contratos e precatórios.

import { readFile, writeFile } from 'node:fs/promises';

const IBGE = 3513900;
const MUNICIPIO_TCE = 'divinolandia';
const INICIO = Number(process.argv[2] ?? 2020);
const SICONFI = 'https://apidatalake.tesouro.gov.br/ords/siconfi/tt/';
const TCE = 'https://transparencia.tce.sp.gov.br/api/json/';
const TOLERANCIA_TCE = 100_000; // R$: TCE-SP e balanço podem diferir por ajustes pequenos
const CNPJ_IPMD = '05119717000170'; // Instituto de Previdência do Município de Divinolândia
const RAIZ = new URL('../', import.meta.url);

// Quem estava na prefeitura em cada ano. Fontes, no site da prefeitura: posse de Padoca
// (Antônio de Pádua Aquisti) em 01/01/2021 e de novo em 01/01/2025, e notícia de 13/02/2020
// que cita o prefeito Dr. Naief Haddad Neto.
const PREFEITOS = [
  { ate: 2020, nome: 'Dr. Naief Haddad Neto', periodo: 'até 2020' },
  { ate: 2024, nome: 'Padoca', periodo: '1º mandato, 2021–2024' },
  { ate: 2028, nome: 'Padoca', periodo: '2º mandato, 2025–2028' },
];

const centavos = v => Math.round(v * 100) / 100;
const valorBR = s => Number(String(s).replace(/\./g, '').replace(',', '.'));
const mi = v => (v / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const reais = v => `${v < 0 ? '−' : ''}R$ ${mi(Math.abs(v))} mi`;
const espera = ms => new Promise(r => setTimeout(r, ms));
const casa = (padrao, texto) => (padrao instanceof RegExp ? padrao.test(texto) : padrao === texto);

async function baixar(url, pausa) {
  for (let tentativa = 1; ; tentativa++) {
    await espera(pausa);
    const resp = await fetch(url).catch(() => null);
    if (resp?.ok) return resp.json();
    if (tentativa === 3) throw new Error(`HTTP ${resp?.status ?? 'sem resposta'} em ${url}`);
    await espera(3000 * tentativa);
  }
}
// A API do Tesouro limita as requisições por segundo; a do TCE-SP aguenta mais
const siconfi = async caminho => (await baixar(SICONFI + caminho, 1200)).items ?? [];
const tce = (tipo, ano, mes) => baixar(`${TCE}${tipo}/${MUNICIPIO_TCE}/${ano}/${mes}`, 250);

function valor(itens, conta, coluna) {
  const achado = itens.find(x => casa(conta, String(x.conta).trim()) && casa(coluna, x.coluna));
  return achado ? Number(achado.valor) : 0;
}

const rreoAnexo1 = (ano, bimestre) => siconfi(`rreo?an_exercicio=${ano}&nr_periodo=${bimestre}` +
  `&co_tipo_demonstrativo=RREO&no_anexo=RREO-Anexo%2001&id_ente=${IBGE}`);
const receitaDe = rreo => valor(rreo, /^SUBTOTAL DAS RECEITAS/, /^Até o Bimestre/i);
// Mesma régua do balanço: no fechamento de dezembro, despesa empenhada; nos bimestres do meio do ano,
// despesa liquidada (o que já foi entregue), porque contratos do ano inteiro são empenhados em janeiro.
const COLUNA_DESPESA = {
  empenhado: /DESPESAS EMPENHADAS ATÉ O BIMESTRE/i,
  liquidado: /DESPESAS LIQUIDADAS ATÉ O BIMESTRE/i,
};
const despesaDe = (rreo, base) => valor(rreo, /^SUBTOTAL DAS DESPESAS/, COLUNA_DESPESA[base]);
// Prazo do RREO: 30 dias depois do fim do bimestre (LRF, art. 52)
const prazoRreo = (ano, bimestre) => new Date(Date.UTC(ano, 2 * bimestre, 30));

function conferirBalanco(ano, rreo, base) {
  if (!rreo.some(x => /^(SUPERÁVIT|DÉFICIT) \(/.test(String(x.conta).trim()))) return;
  const resultado = receitaDe(rreo) - despesaDe(rreo, base);
  const doBalanco = valor(rreo, /^SUPERÁVIT \(/, COLUNA_DESPESA[base])
                  - valor(rreo, /^DÉFICIT \(/, /^Até o Bimestre/i);
  if (Math.abs(resultado - doBalanco) > 1) {
    throw new Error(`${ano}: receita − despesa = ${resultado.toFixed(2)}, mas o balanço diz ${doBalanco.toFixed(2)}`);
  }
}

// RGF Anexo 2 mais recente do ano: o de fim de ano, se já saiu; senão o último quadrimestre ou semestre.
// Município pequeno pode publicar por semestre em vez de quadrimestre.
async function rgfAnexo2(ano) {
  const tentativas = [['Q', 3, 'dez'], ['S', 2, 'dez'], ['Q', 2, 'ago'], ['S', 1, 'jun'], ['Q', 1, 'abr']];
  for (const [periodicidade, periodo, mes] of tentativas) {
    const itens = await siconfi(`rgf?an_exercicio=${ano}&in_periodicidade=${periodicidade}&nr_periodo=${periodo}` +
      `&co_tipo_demonstrativo=RGF&no_anexo=RGF-Anexo%2002&co_esfera=M&co_poder=E&id_ente=${IBGE}`);
    if (!itens.length) continue;
    const nome = new RegExp(`${periodo}º ${periodicidade === 'Q' ? 'Quadrimestre' : 'Semestre'}`, 'i');
    const coluna = [...new Set(itens.map(x => x.coluna))].find(c => nome.test(c));
    if (coluna) return { itens, coluna, mes };
  }
  return null;
}

// Quanto do que ficou para pagar no fim do ano foi cancelado no ano seguinte (RREO Anexo 7 do ano
// seguinte). Esse valor conta como gasto do ano em que foi empenhado, mas nunca virou gasto de fato.
async function canceladoNoAnoSeguinte(ano) {
  const itens = await siconfi(`rreo?an_exercicio=${ano + 1}&nr_periodo=6&co_tipo_demonstrativo=RREO` +
    `&no_anexo=RREO-Anexo%2007&id_ente=${IBGE}`);
  const totais = [...new Set(itens.map(x => String(x.conta).trim()).filter(c => /^TOTAL/i.test(c)))];
  if (!totais.length) return null; // relatório do ano seguinte ainda não publicado
  const total = totais.find(c => /\(I \+ II\)/.test(c)) ?? totais[totais.length - 1];
  return itens
    .filter(x => String(x.conta).trim() === total && /^Cancelados/i.test(x.coluna))
    .reduce((soma, x) => soma + Number(x.valor), 0);
}

// Receitas e despesas de janeiro até ateMes no TCE-SP, com o instituto de previdência à parte.
// base 'empenhado' = empenhos menos anulações; base 'liquidado' = liquidações.
async function contasTce(ano, ateMes, base) {
  const t = { receita: 0, despesa: 0, receitaPrev: 0, despesaPrev: 0, pagoTj: 0,
              repasse: { empenhado: 0, anulado: 0, pago: 0 } };
  for (let mes = 1; mes <= ateMes; mes++) {
    for (const r of await tce('receitas', ano, mes)) {
      const v = valorBR(r.vl_arrecadacao);
      t.receita += v;
      if (/PREVID/i.test(r.orgao)) t.receitaPrev += v;
    }
    for (const e of await tce('despesas', ano, mes)) {
      const v = valorBR(e.vl_despesa);
      const sinal = base === 'liquidado'
        ? (e.evento === 'Valor Liquidado' ? 1 : 0)
        : (e.evento === 'Empenhado' ? 1 : e.evento === 'Anulação' ? -1 : 0);
      t.despesa += sinal * v;
      if (/PREVID/i.test(e.orgao)) t.despesaPrev += sinal * v;
      // Precatório é pago por depósito ao Tribunal de Justiça
      if (e.evento === 'Valor Pago' && /TRIBUNAL DE JUSTI/i.test(e.nm_fornecedor)) t.pagoTj += v;
      // Repasses da prefeitura e da câmara ao instituto: contribuição patronal, aportes e parcelamentos
      if (!/PREVID/i.test(e.orgao) && e.id_fornecedor.includes(CNPJ_IPMD)) {
        if (e.evento === 'Empenhado') t.repasse.empenhado += v;
        else if (e.evento === 'Anulação') t.repasse.anulado += v;
        else if (e.evento === 'Valor Pago') t.repasse.pago += v;
      }
    }
  }
  return t;
}

function conferirTce(ano, t, receita, despesa) {
  const dif = Math.max(Math.abs(t.receita - receita), Math.abs(t.despesa - despesa));
  if (dif > TOLERANCIA_TCE) throw new Error(`${ano}: TCE-SP difere do balanço em R$ ${dif.toFixed(2)}`);
  return dif;
}

const anoAtual = new Date().getFullYear();
const anos = [];
let passivoAtuarial = null;
for (let ano = INICIO; ano <= anoAtual; ano++) {
  const fechado = ano < anoAtual;
  const base = fechado ? 'empenhado' : 'liquidado';
  // Ano fechado: balanço de dezembro. Ano em andamento: o bimestre mais recente que o TCE-SP também cobre.
  let bimestre = fechado ? 6 : 5;
  let rreo = [];
  let ultimoPublicado = null;
  for (; bimestre >= 1; bimestre--) {
    rreo = await rreoAnexo1(ano, bimestre);
    if (rreo.length && ultimoPublicado === null) ultimoPublicado = bimestre;
    if (fechado || (rreo.length && (await tce('despesas', ano, 2 * bimestre)).length)) break;
    rreo = [];
  }
  if (!rreo.length) {
    console.log(`${ano}: ainda sem balanço no SICONFI, parei aqui`);
    break;
  }
  const ateMes = 2 * bimestre;
  // Balanço seguinte que já passou do prazo e ainda não está no SICONFI
  let balancoAtrasado = null;
  if (!fechado && ultimoPublicado < 6 && new Date() > prazoRreo(ano, ultimoPublicado + 1)) {
    balancoAtrasado = { bimestre: ultimoPublicado + 1, prazo: prazoRreo(ano, ultimoPublicado + 1).toISOString().slice(0, 10) };
  }

  conferirBalanco(ano, rreo, base);
  const receita = receitaDe(rreo);
  const despesa = despesaDe(rreo, base);
  const resultado = receita - despesa;

  const t = await contasTce(ano, ateMes, base);
  const difTce = conferirTce(ano, t, receita, despesa);
  const previdencia = t.receitaPrev - t.despesaPrev;

  const rgf = await rgfAnexo2(ano);
  if (fechado && rgf?.mes !== 'dez') throw new Error(`${ano}: RGF de fim de ano não encontrado`);
  // Ano em andamento sem nenhum RGF, depois do prazo do primeiro (30 dias após o 1º quadrimestre)
  const rgfAtrasado = !fechado && !rgf && new Date() > new Date(Date.UTC(ano, 4, 30));
  let caixa = null, contratos = null, precatorios = null;
  if (rgf) {
    // Caixa bruto: a linha líquida passou a descontar depósitos de terceiros em 2022 e quebraria a série
    caixa = valor(rgf.itens, 'Disponibilidade de Caixa Bruta', rgf.coluna);
    const dc = valor(rgf.itens, /^DÍVIDA CONSOLIDADA - DC/, rgf.coluna);
    contratos = valor(rgf.itens, 'Dívida Contratual', rgf.coluna);
    const precatoriosNaDc = valor(rgf.itens, /^Precatórios Posteriores a 05\/05\/2000 \(inclusive\) Vencidos e Não Pagos/, rgf.coluna);
    // Desde 2024 o Tesouro tira os precatórios da dívida consolidada; somar mantém a série comparável
    const precatoriosFora = valor(rgf.itens, /^Precatórios.*Não incluídos na DC/i, rgf.coluna);
    if (Math.abs(contratos + precatoriosNaDc - dc) > 1) {
      throw new Error(`${ano}: a dívida consolidada tem itens além de contratos e precatórios`);
    }
    precatorios = precatoriosNaDc + precatoriosFora;
    const atuarial = valor(rgf.itens, /^Passivo Atuarial/, rgf.coluna);
    if (atuarial) passivoAtuarial = { ano, valor: centavos(atuarial) };
  }

  // Ano em andamento: o mesmo período do ano anterior, para comparar sem o efeito da época do ano
  let anteriorMesmoPeriodo = null;
  if (!fechado) {
    const rreoAnterior = await rreoAnexo1(ano - 1, bimestre);
    if (rreoAnterior.length) {
      const receitaAnt = receitaDe(rreoAnterior);
      const despesaAnt = despesaDe(rreoAnterior, base);
      const tAnt = await contasTce(ano - 1, ateMes, base);
      conferirTce(ano - 1, tAnt, receitaAnt, despesaAnt);
      const previdenciaAnt = tAnt.receitaPrev - tAnt.despesaPrev;
      anteriorMesmoPeriodo = {
        ano: ano - 1,
        resultado: centavos(receitaAnt - despesaAnt),
        previdencia: centavos(previdenciaAnt),
        resultado_prefeitura: centavos(receitaAnt - despesaAnt - previdenciaAnt),
      };
    }
  }

  const canceladoDepois = fechado ? await canceladoNoAnoSeguinte(ano) : null;
  const prefeito = PREFEITOS.find(p => ano <= p.ate);
  anos.push({
    ano,
    prefeito: prefeito.nome,
    periodo: prefeito.periodo,
    parcial: fechado ? null : {
      ate_mes: ateMes, bimestre, base, caixa_em: rgf?.mes ?? null,
      balanco_atrasado: balancoAtrasado, rgf_atrasado: rgfAtrasado,
    },
    anterior_mesmo_periodo: anteriorMesmoPeriodo,
    receita: centavos(receita),
    despesa: centavos(despesa),
    resultado: centavos(resultado),
    previdencia: centavos(previdencia),
    receita_prefeitura: centavos(receita - t.receitaPrev),
    despesa_prefeitura: centavos(despesa - t.despesaPrev),
    resultado_prefeitura: centavos(resultado - previdencia),
    // "Superávit financeiro utilizado": dinheiro que sobrou de anos anteriores e entrou no orçamento
    reserva_usada: centavos(valor(rreo, /^Superávit Financeiro Utilizado/, /^Até o Bimestre/i)),
    caixa: rgf ? centavos(caixa) : null,
    contratos: rgf ? centavos(contratos) : null,
    precatorios: rgf ? centavos(precatorios) : null,
    dividas: rgf ? centavos(contratos + precatorios) : null,
    pago_tj: centavos(t.pagoTj),
    repasse_previdencia: {
      empenhado: centavos(t.repasse.empenhado),
      anulado: centavos(t.repasse.anulado),
      pago: centavos(t.repasse.pago),
    },
    cancelado_depois: canceladoDepois === null ? null : centavos(canceladoDepois),
    dif_tce: centavos(difTce),
    alerta: null,
    alerta_resultado: null,
  });
}
if (!anos.length) throw new Error('nenhum ano encontrado no SICONFI');

// Anos em que o próprio relatório de dívida não fecha; aparecem com asterisco na página.
// O ano em andamento fica de fora: no meio do ano o relatório costuma repetir os valores de dezembro.
for (let i = 1; i < anos.length; i++) {
  const atual = anos[i];
  const anterior = anos[i - 1];
  if (atual.parcial) continue;
  if (atual.precatorios > 0 && atual.contratos === anterior.contratos && atual.precatorios === anterior.precatorios) {
    atual.alerta = `o relatório repete, centavo por centavo, as dívidas de ${anterior.ano}.`;
  }
  const queda = anterior.precatorios - atual.precatorios;
  if (queda > 1e6 && queda > 2 * atual.pago_tj) {
    anterior.alerta = `os precatórios caíram de R$ ${mi(anterior.precatorios)} mi para R$ ${mi(atual.precatorios)} mi ` +
      `em ${atual.ano}, mas naquele ano só R$ ${mi(atual.pago_tj)} mi foram pagos ao Tribunal de Justiça. ` +
      'A queda não é explicada pelos pagamentos.';
  }
}

// Resultado que depende de cancelar o que tinha sido empenhado para o instituto de previdência:
// cancelar o repasse melhora a conta da prefeitura e piora a do instituto na mesma medida
for (const a of anos) {
  const r = a.repasse_previdencia;
  if (a.parcial || r.anulado < 500_000 || r.anulado < 0.2 * r.empenhado) continue;
  const anterior = anos.find(b => b.ano === a.ano - 1);
  a.alerta_resultado = `a prefeitura cancelou ${reais(r.anulado)} que tinha empenhado para o instituto de previdência ` +
    `e pagou a ele ${reais(r.pago)}${anterior ? `, contra ${reais(anterior.repasse_previdencia.pago)} em ${anterior.ano}` : ''}. ` +
    `Sem esse cancelamento, o resultado da prefeitura seria de ${reais(a.resultado_prefeitura - r.anulado)}.`;
}

const dados = {
  fonte: 'SICONFI (RREO Anexos 1 e 7, RGF Anexo 2) e TCE-SP (instituto de previdência, repasses e precatórios)',
  gerado_em: new Date().toISOString().slice(0, 10),
  anos,
  passivo_atuarial: passivoAtuarial,
};

await writeFile(new URL('data/saldo.json', RAIZ), JSON.stringify(dados, null, 2) + '\n', 'utf8');
const arquivoJs = new URL('js/data.js', RAIZ);
let js = await readFile(arquivoJs, 'utf8');
const linha = `const SALDO_DATA = ${JSON.stringify(dados)};`;
const existente = /^const SALDO_DATA = .*;$/m;
if (existente.test(js)) {
  js = js.replace(existente, () => linha);
} else {
  const ancora = /^const DESPESAS_DATA = .*;$/m;
  if (!ancora.test(js)) throw new Error('constante DESPESAS_DATA não encontrada em js/data.js');
  const quebra = js.includes('\r\n') ? '\r\n' : '\n';
  js = js.replace(ancora, m => m + quebra + quebra + linha);
}
await writeFile(arquivoJs, js, 'utf8');

const col = v => (v === null ? '—' : mi(v)).padStart(6);
console.log('ano         | total  prev.  prefeitura | repasse ao IPMD: emp. anul.  pago | caixa  contratos precat. pago TJ | dif. TCE');
for (const a of anos) {
  const r = a.repasse_previdencia;
  const rotulo = a.parcial ? `${a.ano} até ${a.parcial.ate_mes}` : `${a.ano}      `;
  console.log(`${rotulo.padEnd(11)} | ${col(a.resultado)} ${col(a.previdencia)} ${col(a.resultado_prefeitura)}     | ` +
    `                ${col(r.empenhado)} ${col(r.anulado)} ${col(r.pago)} | ` +
    `${col(a.caixa)} ${col(a.contratos)}    ${col(a.precatorios)} ${col(a.pago_tj)} | ${String(Math.round(a.dif_tce)).padStart(8)}`);
  if (a.parcial) {
    console.log(`       parcial: até o mês ${a.parcial.ate_mes} (${a.parcial.bimestre}º bimestre, despesa ${a.parcial.base}); ` +
      `caixa e dívidas em ${a.parcial.caixa_em ?? 'sem RGF'}` +
      (a.parcial.balanco_atrasado ? `; ${a.parcial.balanco_atrasado.bimestre}º bimestre atrasado (prazo ${a.parcial.balanco_atrasado.prazo})` : '') +
      (a.parcial.rgf_atrasado ? '; nenhum RGF do ano, com o prazo do primeiro já vencido' : ''));
    const m = a.anterior_mesmo_periodo;
    if (m) console.log(`       mesmo período de ${m.ano}: total ${mi(m.resultado)}, previdência ${mi(m.previdencia)}, prefeitura ${mi(m.resultado_prefeitura)}`);
  }
  if (a.cancelado_depois !== null) console.log(`       cancelado em ${a.ano + 1} do que ficou pendente: ${mi(a.cancelado_depois)}`);
  if (a.alerta_resultado) console.log(`       * resultado: ${a.alerta_resultado}`);
  if (a.alerta) console.log(`       * dívidas: ${a.alerta}`);
}

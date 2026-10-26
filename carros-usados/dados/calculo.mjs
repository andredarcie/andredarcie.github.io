// Junta todas as fontes e calcula o custo de ter cada carro por 5 anos (2027–2031), em reais de
// agosto/2026 (preços constantes: nada de inflação projetada). Saída: dados/resultado.json, que o
// site lê. Cada número guarda de onde veio.
//   node dados/calculo.mjs
import fs from 'node:fs';
import { GRUPOS, AGOSTOS } from './escolhidos.mjs';
import { anos, preco } from './fipe.mjs';
import { anuncios } from './mobiauto.mjs';

const ler = (f) => JSON.parse(fs.readFileSync(new URL(f, import.meta.url), 'utf8'));
const brl = (s) => +String(s).replace(/[R$\s.]/g, '').replace(',', '.');

// ---- premissas (todas com fonte; ver a página "Como foi calculado")
export const P = {
  kmAno: 7000, anos: 5, primeiroAno: 2027,
  urbanoParte: 0.5,                         // metade dos km na cidade, metade na estrada
  ipvaAliquota: 0.04,                       // Lei SP 13.296/2008, art. 9º, III
  ipvaIsencaoIdade: 21,                     // art. 13, VIII ("mais de 20 anos"); SEFAZ: em 2026, fabricados até 2005
  licenciamento: 174.08,                    // taxa Detran-SP 2026
  // ANP, levantamento semanal por município, semanas iniciadas em agosto/2026 (2, 9, 16 e 23)
  etanol: { 'São João da Boa Vista': (3.73 + 3.77 + 3.72 + 3.73) / 4, Mococa: (4.10 + 4.10 + 4.09 + 4.09) / 4 },
  gasolina: { 'São João da Boa Vista': (6.39 + 6.44 + 6.38 + 6.38) / 4, Mococa: (6.74 + 6.74 + 6.73 + 6.73) / 4 },
  ipca: Object.fromEntries(ler('./ibge/ipca.json').slice(1).map(r => [r.D3C.slice(0, 4), +r.V])),   // IBGE, IPCA nº-índice de agosto
  autosegMinExposicao: 20,                  // abaixo disso, usa todo o estado de SP em vez da região 13
  mobiMin: 5,                               // menos anúncios que isso no estado: usa o Brasil
};
const media = (o) => Object.values(o).reduce((s, v) => s + v, 0) / Object.keys(o).length;
P.precoEtanol = +media(P.etanol).toFixed(3);
P.precoGasolina = +media(P.gasolina).toFixed(3);

const fichas = { 2008: ler('./triagem-2008.json'), 2014: ler('./triagem-2014.json') };
const opin = ler('./opinioes.json');
const autoseg = ler('./susep/autoseg-2021A.json');
const extras = ler('./extras.json');          // dados achados fora das fichas (vão livre, consumo), cada um com fonte

const mediana = (v) => { const s = [...v].sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };

const resultado = { premissas: P, geradoEm: new Date().toISOString(), grupos: {} };
for (const [ano, carros] of Object.entries(GRUPOS)) {
  const lista = [];
  for (const c of carros) {
    const ext = extras[c.nome] || {};
    // FIPE: agosto de cada ano
    const ys = (await anos(...c.fipe)).filter(y => y.Value.startsWith(ano + '-'));
    const fipe = {};
    let codigoFipe = null, combFipe = null;
    for (const [a, t] of Object.entries(AGOSTOS)) {
      try { const p = await preco(...c.fipe, ys[0].Value, t); fipe[a] = brl(p.Valor); codigoFipe = p.CodigoFipe; combFipe = p.Combustivel; } catch { fipe[a] = null; }
    }
    const P0 = fipe[2026];
    // depreciação real: variação do valor FIPE nos últimos 5 anos (ou o período disponível), descontado o IPCA
    const a0 = Object.keys(fipe).find(a => fipe[a] != null);
    const nAnos = 2026 - +a0;
    const real = (fipe[2026] / fipe[a0]) / (P.ipca[2026] / P.ipca[a0]);
    const taxaReal = Math.pow(real, 1 / nAnos) - 1;
    const valorAno = (k) => P0 * Math.pow(1 + taxaReal, k);        // k anos depois de agosto/2026
    // ficha técnica
    const fc = fichas[ano].find(f => f.slug === c.fc.split('/')[1]);
    const cons = { ...fc.consumo, ...(ext.consumo || {}) };
    const temEtanol = cons.etanolUrbano && cons.etanolRodoviario;
    const comb = temEtanol ? 'etanol' : 'gasolina';
    const urb = temEtanol ? cons.etanolUrbano : cons.gasolinaUrbano, rod = temEtanol ? cons.etanolRodoviario : cons.gasolinaRodoviario;
    const litrosAno = P.kmAno * P.urbanoParte / urb + P.kmAno * (1 - P.urbanoParte) / rod;
    const precoComb = temEtanol ? P.precoEtanol : P.precoGasolina;
    // seguro: taxa (prêmio ÷ valor segurado) do AUTOSEG na região de Divinolândia, aplicada ao valor do carro
    // cascata, parando na primeira amostra com exposição suficiente: versão na região 13 → versão em
    // SP → modelo (grupo SUSEP, todas as versões) na região 13 → modelo em SP
    const av = autoseg.versao[`${codigoFipe}|${ano}`] || {}, gid = autoseg.grupoDe[codigoFipe], ag = autoseg.grupo[`${gid}|${ano}`] || {};
    const opcoes = [[av.r13, 'versão, região 13'], [av.sp, 'versão, estado de SP'], [ag.r13, `modelo (${ag.nome}), região 13`], [ag.sp, `modelo (${ag.nome}), estado de SP`]];
    const achada = opcoes.find(([x]) => x && x.exposicao >= P.autosegMinExposicao);
    const base = achada ? { ...achada[0], regiao: achada[1] } : null;
    const taxaSeguro = base ? base.premioMedio / base.isMedia : null;
    // ano a ano
    const anosCusto = [];
    for (let k = 0; k < P.anos; k++) {
      const y = P.primeiroAno + k, valorInicio = valorAno(k);
      const isento = y - +ano >= P.ipvaIsencaoIdade;
      anosCusto.push({ ano: y, valorInicio: Math.round(valorInicio), ipva: isento ? 0 : P.ipvaAliquota * valorInicio, isento,
        seguro: taxaSeguro ? taxaSeguro * valorInicio : null, licenciamento: P.licenciamento, combustivel: litrosAno * precoComb });
    }
    const soma = (k) => anosCusto.reduce((s, x) => s + (x[k] || 0), 0);
    const revenda = valorAno(P.anos);
    const custo = { depreciacao: P0 - revenda, ipva: soma('ipva'), seguro: taxaSeguro ? soma('seguro') : null, licenciamento: soma('licenciamento'), combustivel: soma('combustivel') };
    custo.total = custo.depreciacao + custo.ipva + (custo.seguro || 0) + custo.licenciamento + custo.combustivel;
    // preço real anunciado (Mobiauto): SP; se tiver menos de mobiMin da versão, Brasil
    let real0 = null;
    for (const reg of ['sp', 'br']) {
      const o = await anuncios(...c.mobi, +ano, reg);
      const ok = o.anuncios.filter(a => a.anoModelo === +ano && !a.zeroKm && a.preco > 1000 && (!c.mobiVersao || new RegExp(c.mobiVersao, 'i').test(a.versao || ''))
        && (!a.modelo || new RegExp(c.mobiModelo || '.', 'i').test(a.modelo)));
      real0 = { regiao: reg === 'sp' ? 'SP' : 'Brasil', fonte: o.fonte, coletadoEm: o.coletadoEm, n: ok.length,
        mediana: mediana(ok.map(a => a.preco)), media: ok.length ? ok.reduce((s, a) => s + a.preco, 0) / ok.length : null,
        kmMediana: mediana(ok.map(a => a.km).filter(k => k > 0)), versoes: [...new Set(ok.map(a => a.versao))], ids: ok.map(a => a.id) };
      if (ok.length >= P.mobiMin) break;
    }
    lista.push({
      nome: c.nome, ano: +ano, codigoFipe, combFipe, fipe, fipePeriodo: [+a0, 2026], taxaRealAno: taxaReal, revenda,
      precoReal: real0,
      ficha: { url: fc.url, titulo: fc.titulo, airbag: fc.airbag, abs: fc.abs, consumo: cons },
      consumoUsado: { combustivel: comb, urbano: urb, rodoviario: rod, kmPorLitroMedio: P.kmAno / litrosAno,
        fonte: ext.consumo ? ext.consumoFonte : fc.url, fonteNome: ext.consumo ? ext.consumoFonteNome : 'Ficha Completa', confirma: ext.consumoConfirma || null },
      alturaSolo: fc.alturaSolo ?? ext.alturaSolo ?? null, alturaSoloFonte: fc.alturaSolo ? fc.url : ext.alturaSoloFonte || null, alturaSoloNota: ext.alturaSoloNota || null,
      seguro: base ? { regiao: base.regiao, exposicao: base.exposicao, premioMedio2021: base.premioMedio, isMedia2021: base.isMedia, taxa: taxaSeguro } : null,
      opiniao: opin[c.nome] ? { nota: opin[c.nome].nota, avaliacoes: opin[c.nome].avaliacoes, anos: opin[c.nome].anos, resumo: extras[c.nome]?.resumo || null, fontes: opin[c.nome].fontes } : null,
      anosCusto, custo,
    });
  }
  lista.sort((a, b) => a.custo.total - b.custo.total);
  resultado.grupos[ano] = lista;
}
fs.writeFileSync(new URL('./resultado.json', import.meta.url), JSON.stringify(resultado, null, 1));
for (const [ano, l] of Object.entries(resultado.grupos)) {
  console.log(`\n== ${ano}`);
  for (const x of l) console.log(`${x.nome.padEnd(42)} FIPE ${x.fipe[2026]}  real ${Math.round(x.precoReal.mediana || 0)} (${x.precoReal.n} ${x.precoReal.regiao})  total5a ${Math.round(x.custo.total)}  [dep ${Math.round(x.custo.depreciacao)} ipva ${Math.round(x.custo.ipva)} seg ${Math.round(x.custo.seguro || 0)} comb ${Math.round(x.custo.combustivel)} (${x.consumoUsado.combustivel})]`);
}

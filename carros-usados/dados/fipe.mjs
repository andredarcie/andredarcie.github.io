// Consulta a Tabela FIPE oficial (veiculos.fipe.org.br, a mesma API que o site da FIPE usa)
// e guarda as respostas em dados/fipe-cache/, para que cada preço do comparativo tenha rastro:
// código FIPE, mês de referência e data da consulta.
//   node dados/fipe.mjs modelos <marca> <regex>          lista modelos da marca (tabela agosto/2026)
//   node dados/fipe.mjs anos <marca> <codModelo>         anos/combustíveis de um modelo
//   node dados/fipe.mjs preco <marca> <codModelo> <ano-comb> [tabela]   preço (padrão: 336 = agosto/2026)
import fs from 'node:fs';
import path from 'node:path';

const API = 'https://veiculos.fipe.org.br/api/veiculos';
const DIR = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), 'fipe-cache');
fs.mkdirSync(DIR, { recursive: true });
export const AGO_2026 = 336;

let ultimaFipe = 0;
export async function fipe(rota, corpo) {
  const chave = rota + '_' + Object.values(corpo).join('_').replace(/[^\w-]/g, '');
  const f = path.join(DIR, chave + '.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')).resposta;
  for (let t = 0; t < 6; t++) {
    // a API limita a frequência: no máximo uma consulta a cada 2,5 s, e espera mais a cada recusa
    const espera = 2500 - (Date.now() - ultimaFipe); if (espera > 0) await new Promise(res => setTimeout(res, espera));
    ultimaFipe = Date.now();
    const r = await fetch(`${API}/${rota}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://veiculos.fipe.org.br/' }, body: JSON.stringify(corpo) });
    if (r.ok) {
      const resposta = await r.json();
      if (resposta && !resposta.erro) { fs.writeFileSync(f, JSON.stringify({ rota, corpo, consultadoEm: new Date().toISOString(), resposta }, null, 1)); return resposta; }
      throw new Error(`${rota}: ${JSON.stringify(resposta)}`);
    }
    await new Promise(res => setTimeout(res, 15000 * (t + 1)));
  }
  throw new Error(`${rota}: falhou`);
}
export const modelos = (marca, tabela = AGO_2026) => fipe('ConsultarModelos', { codigoTabelaReferencia: tabela, codigoTipoVeiculo: 1, codigoMarca: marca });
export const anos = (marca, modelo, tabela = AGO_2026) => fipe('ConsultarAnoModelo', { codigoTabelaReferencia: tabela, codigoTipoVeiculo: 1, codigoMarca: marca, codigoModelo: modelo });
export function preco(marca, modelo, anoComb, tabela = AGO_2026) {
  const [ano, comb] = anoComb.split('-');
  return fipe('ConsultarValorComTodosParametros', {
    codigoTabelaReferencia: tabela, codigoTipoVeiculo: 1, codigoMarca: marca, codigoModelo: modelo,
    anoModelo: +ano, codigoTipoCombustivel: +comb, ano: anoComb, tipoVeiculo: 'carro', tipoConsulta: 'tradicional',
  });
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const [cmd, a, b, c, d] = process.argv.slice(2);
  if (cmd === 'modelos') { const re = new RegExp(b || '.', 'i'); for (const m of (await modelos(+a)).Modelos.filter(m => re.test(m.Label))) console.log(m.Value, m.Label); }
  if (cmd === 'anos') for (const y of await anos(+a, +b)) console.log(y.Value, y.Label);
  if (cmd === 'preco') console.log(JSON.stringify(await preco(+a, +b, c, d ? +d : AGO_2026)));
}

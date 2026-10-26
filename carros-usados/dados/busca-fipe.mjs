// Auxiliar de mapeamento: modelos FIPE de uma marca (filtro por regex) que têm o ano pedido,
// com o preço de agosto/2026 — para escolher o código FIPE de cada versão da ficha técnica.
//   node dados/busca-fipe.mjs <marca> <regex> <ano>
import { modelos, anos, preco } from './fipe.mjs';
const [marca, re, ano] = process.argv.slice(2);
const rx = new RegExp(re, 'i');
for (const m of (await modelos(+marca)).Modelos.filter(m => rx.test(m.Label))) {
  const ys = (await anos(+marca, m.Value)).filter(y => y.Value.startsWith(ano + '-'));
  for (const y of ys) { const p = await preco(+marca, m.Value, y.Value); console.log(m.Value, '|', m.Label, '|', y.Label, '|', p.Valor, '|', p.CodigoFipe); }
}

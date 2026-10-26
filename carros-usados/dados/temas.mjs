// Conta, nas opiniões de donos (dados/opinioes.json), quantas avaliações citam cada tema nos
// prós e nos contras/problemas. Serve de base, conferível, para a linha de resumo de cada carro.
//   node dados/temas.mjs  → dados/temas.json e um resumo no console
import fs from 'node:fs';

export const TEMAS = {
  consumo: /econ[oô]m|consumo|gast(a|o) pouco|bebe|beberr/i,
  manutenção: /manuten|pe[çc]as?|revis[aã]o|oficina|mec[aâ]nica/i,
  conforto: /conforto|confort[aá]vel|macio|silenci|barulh|ru[ií]do/i,
  espaço: /espa[çc]o|porta[- ]malas|bagageiro|apertad|banco traseiro/i,
  desempenho: /desempenho|pot[eê]ncia|fraco|arranc|retomada|torque|ultrapass|for[çc]a/i,
  estabilidade: /estabilidade|est[aá]vel|curva|dirigibilidade|suspens/i,
  câmbio: /c[aâ]mbio|embreagem|marcha/i,
  acabamento: /acabamento|pl[aá]stic|ranger|rangid|batid|grilo/i,
  ar: /ar[- ]condicionado|\bar\b/i,
  elétrica: /el[eé]tric|sensor|painel|luz de|inje[çc][aã]o/i,
  segurança: /segur|airbag|abs|freio/i,
  robustez: /robust|resistente|dur[aá]vel|confi[aá]vel|n[aã]o d[aá] problema|nunca deu|sem problema/i,
  'preço/revenda': /pre[çc]o|revenda|valoriza|desvaloriza|barato|caro/i,
};

if (process.argv[1]?.endsWith('temas.mjs')) {
  const op = JSON.parse(fs.readFileSync(new URL('./opinioes.json', import.meta.url), 'utf8'));
  const out = {};
  for (const [carro, o] of Object.entries(op)) {
    const n = o.lista.length, t = {};
    for (const [tema, re] of Object.entries(TEMAS)) {
      t[tema] = { pros: o.lista.filter(r => re.test(r.pros || '')).length, contras: o.lista.filter(r => re.test((r.contras || '') + ' ' + (r.problemas || ''))).length };
    }
    out[carro] = { n, nota: o.nota, temas: t };
    const top = (k) => Object.entries(t).filter(([, v]) => v[k] > 0).sort((a, b) => b[1][k] - a[1][k]).slice(0, 4).map(([k2, v]) => `${k2} ${v[k]}`).join(', ');
    console.log(`${carro} (n=${n}, nota ${o.nota}) | PRÓS: ${top('pros')} | CONTRAS: ${top('contras')}`);
  }
  fs.writeFileSync(new URL('./temas.json', import.meta.url), JSON.stringify(out, null, 1));
}

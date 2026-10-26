// Triagem: para cada modelo candidato num ano, todas as versões na Ficha Completa e quais têm
// airbag frontal e freio ABS de série. Saída: dados/triagem-<ano>.json
//   node dados/triagem.mjs 2008
import fs from 'node:fs';
import { pagina, versoes, ficha } from './fc.mjs';

const MODELOS = {
  2008: { chevrolet: ['celta', 'prisma', 'corsa', 'corsa-sedan', 'classic', 'astra', 'astra-sedan', 'vectra', 'vectra-gt', 'meriva', 'zafira'],
    fiat: ['uno', 'palio', 'palio-weekend', 'siena', 'stilo', 'idea', 'punto', 'doblo'], ford: ['ka', 'fiesta', 'fiesta-sedan', 'focus', 'focus-sedan', 'ecosport'],
    volkswagen: ['gol', 'fox', 'polo', 'polo-sedan', 'golf', 'parati', 'spacefox', 'jetta', 'bora', 'crossfox'],
    renault: ['clio', 'clio-sedan', 'logan', 'sandero', 'megane', 'megane-grand-tour', 'scenic'], peugeot: ['206', '207', '307', '307-sedan'],
    citroen: ['c3', 'c4', 'c4-pallas', 'xsara-picasso'], honda: ['fit', 'civic'], toyota: ['corolla', 'fielder'], nissan: ['tiida', 'sentra', 'livina'],
    hyundai: ['i30'], kia: ['cerato'], mitsubishi: ['lancer'] },
  2014: { chevrolet: ['onix', 'prisma', 'celta', 'classic', 'cobalt', 'agile', 'sonic', 'sonic-sedan', 'spin', 'cruze'],
    fiat: ['uno', 'palio', 'siena', 'grand-siena', 'punto', 'idea', 'bravo', 'linea'], ford: ['ka', 'fiesta', 'new-fiesta', 'new-fiesta-sedan', 'focus', 'ecosport'],
    volkswagen: ['gol', 'voyage', 'fox', 'up', 'polo', 'golf', 'jetta'], renault: ['clio', 'logan', 'sandero', 'fluence'], peugeot: ['207', '208', '308'],
    citroen: ['c3', 'c4', 'c4-lounge'], honda: ['fit', 'city', 'civic'], toyota: ['etios', 'etios-sedan', 'corolla'], nissan: ['march', 'versa', 'sentra', 'livina'],
    hyundai: ['hb20', 'hb20s', 'i30'], kia: ['picanto', 'cerato'] },
};

const ano = +process.argv[2];
const out = [];
for (const [marca, mods] of Object.entries(MODELOS[ano])) {
  // confere os nomes de modelo que a marca tem na Ficha Completa
  const idx = await pagina(`${marca}/`);
  const existem = new Set([...(idx || '').matchAll(new RegExp(`href="/carros/${marca}/([a-z0-9-]+)/"`, 'g'))].map(m => m[1]));
  for (const mod of mods) {
    if (!existem.has(mod)) { console.log(`(sem página) ${marca}/${mod}`); continue; }
    const vs = await versoes(marca, mod, ano);
    let ok = 0;
    for (const v of vs) {
      const f = await ficha(marca, v);
      if (!f) continue;
      out.push({ marca, modelo: mod, ...f, seguranca: undefined });
      if (f.airbag && f.abs) ok++;
    }
    console.log(`${marca} ${mod}: ${vs.length} versões, ${ok} com airbag + ABS de série`);
  }
}
fs.writeFileSync(new URL(`./triagem-${ano}.json`, import.meta.url), JSON.stringify(out, null, 1));

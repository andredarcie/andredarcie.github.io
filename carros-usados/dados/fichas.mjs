// Lê todas as versões de cada modelo candidato num ano (catálogo do Carros na Web) e extrai da
// ficha técnica: airbag frontal e freio ABS (de série ou não), consumo urbano/rodoviário com etanol
// (A) e gasolina (G), altura mínima do solo, nota dos leitores, custo das revisões e o código da
// página — tudo conferível em dados/cnw-cache/. Saída: dados/fichas-<ano>.json
//   node dados/fichas.mjs 2008
import fs from 'node:fs';
import { pagina, texto, catalogo } from './cnw.mjs';

// modelos de passeio vendidos no Brasil em cada ano (fabricante e nome como no Carros na Web)
const MODELOS = {
  2008: [['Chevrolet', 'Celta'], ['Chevrolet', 'Prisma'], ['Chevrolet', 'Corsa'], ['Chevrolet', 'Classic'], ['Chevrolet', 'Astra'], ['Chevrolet', 'Vectra'], ['Chevrolet', 'Meriva'], ['Chevrolet', 'Zafira'],
    ['Fiat', 'Uno'], ['Fiat', 'Palio'], ['Fiat', 'Siena'], ['Fiat', 'Stilo'], ['Fiat', 'Idea'], ['Fiat', 'Punto'], ['Fiat', 'Doblò'],
    ['Ford', 'Ka'], ['Ford', 'Fiesta'], ['Ford', 'Focus'], ['Ford', 'EcoSport'],
    ['Volkswagen', 'Gol'], ['Volkswagen', 'Fox'], ['Volkswagen', 'Polo'], ['Volkswagen', 'Golf'], ['Volkswagen', 'Parati'], ['Volkswagen', 'SpaceFox'], ['Volkswagen', 'Jetta'], ['Volkswagen', 'Bora'], ['Volkswagen', 'CrossFox'],
    ['Renault', 'Clio'], ['Renault', 'Logan'], ['Renault', 'Sandero'], ['Renault', 'Mégane'], ['Renault', 'Scénic'],
    ['Peugeot', '206'], ['Peugeot', '207'], ['Peugeot', '307'], ['Citroën', 'C3'], ['Citroën', 'C4'], ['Citroën', 'Xsara Picasso'],
    ['Honda', 'Fit'], ['Honda', 'Civic'], ['Toyota', 'Corolla'], ['Toyota', 'Fielder'], ['Nissan', 'Tiida'], ['Nissan', 'Sentra'], ['Nissan', 'Livina'],
    ['Hyundai', 'i30'], ['Kia', 'Cerato'], ['Mitsubishi', 'Lancer']],
  2014: [['Chevrolet', 'Onix'], ['Chevrolet', 'Prisma'], ['Chevrolet', 'Celta'], ['Chevrolet', 'Classic'], ['Chevrolet', 'Cobalt'], ['Chevrolet', 'Agile'], ['Chevrolet', 'Sonic'], ['Chevrolet', 'Spin'], ['Chevrolet', 'Cruze'],
    ['Fiat', 'Uno'], ['Fiat', 'Palio'], ['Fiat', 'Siena'], ['Fiat', 'Grand Siena'], ['Fiat', 'Punto'], ['Fiat', 'Idea'], ['Fiat', 'Bravo'], ['Fiat', 'Linea'],
    ['Ford', 'Ka'], ['Ford', 'Fiesta'], ['Ford', 'New Fiesta'], ['Ford', 'Focus'], ['Ford', 'EcoSport'],
    ['Volkswagen', 'Gol'], ['Volkswagen', 'Voyage'], ['Volkswagen', 'Fox'], ['Volkswagen', 'up!'], ['Volkswagen', 'Polo'], ['Volkswagen', 'Golf'], ['Volkswagen', 'Jetta'],
    ['Renault', 'Clio'], ['Renault', 'Logan'], ['Renault', 'Sandero'], ['Renault', 'Fluence'], ['Peugeot', '207'], ['Peugeot', '208'], ['Peugeot', '308'], ['Citroën', 'C3'], ['Citroën', 'C4'],
    ['Honda', 'Fit'], ['Honda', 'City'], ['Honda', 'Civic'], ['Toyota', 'Etios'], ['Toyota', 'Corolla'], ['Nissan', 'March'], ['Nissan', 'Versa'], ['Nissan', 'Sentra'], ['Nissan', 'Livina'],
    ['Hyundai', 'HB20'], ['Hyundai', 'HB20S'], ['Hyundai', 'i30'], ['Kia', 'Picanto'], ['Kia', 'Cerato']],
};

const num = (s) => s == null ? null : +String(s).replace(/\./g, '').replace(',', '.');
export function lerFicha(html, codigo) {
  const t = texto(html).join(' | ');
  const titulo = (html.match(/<title>Carros na Web \| ([^|]+?) \|/) || [])[1]?.trim();
  // equipamentos: cada item vem depois do ícone (título = "Equipamento de série" / "Equipamento opcional")
  const eq = {};
  for (const m of html.matchAll(/<img src="\/imgsite\/\w+\.gif" title="(Equipamento [^"]+)">\s*<\/td>\s*<td[^>]*>\s*<font[^>]*>([^<]+)<\/font>/g)) eq[m[2].trim()] = m[1] === 'Equipamento de série' ? 'série' : m[1] === 'Equipamento opcional' ? 'opcional' : 'desconhecido:' + m[1];
  const consumoTxt = (t.match(/CONSUMO \|(.*?)\| AUTONOMIA/) || [])[1] || '';
  const A = [...consumoTxt.matchAll(/([\d,]+) km\/l\s*\(A\)/g)].map(m => num(m[1]));
  const G = [...consumoTxt.matchAll(/([\d,]+) km\/l\s*\(G\)/g)].map(m => num(m[1]));
  const sem = [...consumoTxt.matchAll(/([\d,]+) km\/l(?!\s*\()/g)].map(m => num(m[1]));
  return {
    codigo, url: `https://www.carrosnaweb.com.br/fichadetalhe.asp?codigo=${codigo}`, titulo,
    combustivel: (t.match(/Combustível \| ([^|]+)/) || [])[1]?.trim(),
    airbag: eq['Airbags frontais'] || 'não', abs: eq['Freios ABS'] || 'não',
    consumo: { etanol: A.length ? { urbano: A[0], rodoviario: A[1] } : null, gasolina: G.length ? { urbano: G[0], rodoviario: G[1] } : (sem.length ? { urbano: sem[0], rodoviario: sem[1] } : null) },
    alturaSolo: num((t.match(/Altura mínima do solo \| ([\d.,]+) mm/) || [])[1]),
    notaLeitor: num((t.match(/Nota do leitor \| ([\d,]+)/) || [])[1]),
    revisoes: (t.match(/Revisões \| R\$ ([\d.]+) \| até ([\d.]+) km/) || []).slice(1).map(num),
    potencia: (t.match(/Potência\s+máxima \| ([^|]+)/) || [])[1]?.trim(),
  };
}

if (process.argv[1]?.endsWith('fichas.mjs')) {
  const ano = +process.argv[2];
  const out = [];
  for (const [fab, mod] of MODELOS[ano]) {
    const lista = (await catalogo({ anoini: ano, anofim: ano, fabricante: fab, varnome: mod }))
      .filter(c => c.nome.replace(/&nbsp;/g, ' ').toLowerCase().includes(mod.toLowerCase()) && c.nome.endsWith(String(ano)));
    for (const c of lista) {
      try { const f = lerFicha(await pagina('fichadetalhe.asp?codigo=' + c.codigo), c.codigo); out.push({ fabricante: fab, modelo: mod, ...f }); }
      catch (e) { console.error('falhou', c.codigo, c.nome, e.message); }
    }
    const ok = out.filter(f => f.modelo === mod && f.fabricante === fab);
    console.log(`${fab} ${mod}: ${ok.length} versões, ${ok.filter(f => f.airbag === 'série' && f.abs === 'série').length} com airbag + ABS de série`);
  }
  fs.writeFileSync(new URL(`./fichas-${ano}.json`, import.meta.url), JSON.stringify(out, null, 1));
}

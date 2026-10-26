// Opinião de donos por GERAÇÃO: junta os anos-modelo do CarroClub em que o carro é o mesmo
// (mesma geração/carroceria), porque um ano sozinho costuma ter poucas avaliações. Quando a
// página mistura versões diferentes, um filtro pelo nome da versão separa a certa.
// Saída: dados/opinioes.json  { "<nome do carro>": { anos, nota, avaliacoes, lista } }
import fs from 'node:fs';
import { opinioes } from './carroclub.mjs';

const R = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
export const GERACOES = {
  // 2008
  'Chevrolet Vectra Elegance 2.0': ['chevrolet', 'vectra', R(2006, 2011)],
  'Fiat Stilo 1.8': ['fiat', 'stilo', R(2006, 2011)],
  'Fiat Punto ELX 1.4': ['fiat', 'punto', R(2008, 2012), /1\.4/],
  'Volkswagen Jetta 2.5': ['volkswagen', 'jetta', R(2006, 2010), /2\.5/],
  'Renault Mégane Sedan Expression 1.6': ['renault', 'megane', R(2006, 2012), /(?!.*grand)1\.6/i],
  'Renault Mégane Grand Tour Expression 1.6': ['renault', 'megane', R(2006, 2012), /grand tour/i],
  'Renault Grand Scénic Dynamique 2.0 AT': ['renault', 'scenic', R(2008, 2011), /grand/i],
  'Citroën C3 Exclusive 1.6 AT': ['citroen', 'c3', R(2003, 2012), /1\.6/],
  'Citroën C4 VTR 2.0': ['citroen', 'c4', R(2007, 2013), /vtr/i],
  'Citroën C4 Pallas GLX 2.0': ['citroen', 'c4', R(2007, 2013), /pallas/i],
  'Honda Civic LXS 1.8': ['honda', 'civic', R(2007, 2011), /1\.8/],
  'Toyota Corolla Fielder XEi 1.8': ['toyota', 'fielder', R(2004, 2008)],
  'Nissan Tiida SL 1.8': ['nissan', 'tiida', R(2007, 2013), /1\.8/],
  'Nissan Sentra 2.0': ['nissan', 'sentra', R(2007, 2013)],
  // 2014
  'Chevrolet Classic LS 1.0': ['chevrolet', 'corsa-classic', R(2010, 2016)],
  'Volkswagen up! take 1.0 (5 portas)': ['volkswagen', 'up', R(2014, 2017), /(?!.*tsi)1\.0/i],
  'Renault Logan Authentique 1.0': ['renault', 'logan', R(2014, 2016), /1\.0/],
  'Fiat Uno Vivace/Rua 1.0 (4 portas)': ['fiat', 'uno', R(2011, 2016), /1\.0/],
  'Renault Sandero Expression 1.0': ['renault', 'sandero', R(2012, 2014), /1\.0/],
  'Ford Fiesta 1.0 (hatch)': ['ford', 'fiesta', R(2011, 2014), /1\.0/],
  'Volkswagen Gol City 1.0 (4 portas)': ['volkswagen', 'gol-g5', R(2013, 2016), /1\.0/],
  'Fiat Palio Fire 1.0 (4 portas)': ['fiat', 'palio', R(2010, 2016), /fire/i],
  'Chevrolet Celta LT 1.0 (4 portas)': ['chevrolet', 'celta', R(2006, 2015), /1\.0/],
  'Fiat Siena EL 1.0': ['fiat', 'siena', R(2010, 2016), /1\.0/],
  'Peugeot 208 Active 1.5': ['peugeot', '208', R(2013, 2016), /1\.5/],
  'Chevrolet Cobalt LS 1.4': ['chevrolet', 'cobalt', R(2012, 2019), /1\.4/],
  'Fiat Linea Essence 1.8': ['fiat', 'linea', R(2011, 2016), /1\.8/],
  'Chevrolet Spin LS 1.8': ['chevrolet', 'spin', R(2013, 2016)],
  'Nissan Livina 1.6': ['nissan', 'livina', R(2010, 2014), /1\.6/],
};

if (process.argv[1]?.endsWith('opinioes.mjs')) {
  const out = {};
  for (const [nome, [marca, modelo, anos, filtro]] of Object.entries(GERACOES)) {
    const lista = [], fontes = [];
    for (const a of anos) {
      const o = await opinioes(marca, modelo, a);
      fontes.push(o.fonte);
      for (const r of o.lista || []) if (!filtro || filtro.test(r.versao || '')) lista.push({ ...r, ano: a });
    }
    const notas = lista.map(r => r.nota).filter(n => typeof n === 'number');
    out[nome] = { anos: [anos[0], anos.at(-1)], filtro: filtro?.source || null, avaliacoes: lista.length,
      nota: notas.length ? +(notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1) : null, fontes, lista };
    console.log(`${nome}: ${lista.length} avaliações (${anos[0]}–${anos.at(-1)}), nota ${out[nome].nota}`);
  }
  fs.writeFileSync(new URL('./opinioes.json', import.meta.url), JSON.stringify(out, null, 1));
}

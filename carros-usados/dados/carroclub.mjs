// Opinião de donos no CarroClub (carroclub.com.br/carros/<marca>/<modelo>/<ano>/opiniao-do-dono/):
// nota média, número de avaliações e cada avaliação (versão, data, nota, prós, contras, problemas),
// lidos dos dados estruturados (JSON-LD) da própria página. Saída: dados/carroclub/<marca>-<modelo>-<ano>.json
//   node dados/carroclub.mjs fiat punto 2008
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), 'carroclub');
fs.mkdirSync(DIR, { recursive: true });
let ultimo = 0;
async function get(url) {
  const espera = 3000 - (Date.now() - ultimo); if (espera > 0) await new Promise(r => setTimeout(r, espera));
  ultimo = Date.now();
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', Accept: 'text/html', 'Accept-Language': 'pt-BR,pt;q=0.9' } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status} (coleta interrompida)`);
  return r.text();
}
const produto = (html) => {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { const j = JSON.parse(m[1]); const p = (j['@graph'] || [j]).find(x => x['@type'] === 'Product'); if (p) return p; } catch { /* outro bloco */ }
  }
  return null;
};
const campo = (txt, nome) => (txt.match(new RegExp(`${nome}: ([\\s\\S]*?)(?: \\| (?:Pros|Contras|Problemas|Opiniao):|$)`)) || [])[1]?.trim() || '';

export async function opinioes(marca, modelo, ano) {
  const f = path.join(DIR, `${marca}-${modelo}-${ano}.json`);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  const base = `https://www.carroclub.com.br/carros/${marca}/${modelo}/${ano}/opiniao-do-dono/`;
  const html = await get(base);
  const p = html && produto(html);
  if (!p) { const out = { fonte: base, coletadoEm: new Date().toISOString(), semDados: true }; fs.writeFileSync(f, JSON.stringify(out, null, 1)); return out; }
  const reviews = [...(p.review || [])];
  const total = p.aggregateRating?.reviewCount || reviews.length;
  for (let pg = 2; reviews.length < total && pg <= 20; pg++) {
    const h = await get(`${base}?p=${pg}`); const q = h && produto(h);
    const novos = (q?.review || []).filter(r => !reviews.some(x => x['@id'] === r['@id']));
    if (!novos.length) break;
    reviews.push(...novos);
  }
  const out = {
    fonte: base, coletadoEm: new Date().toISOString(),
    nota: p.aggregateRating?.ratingValue ?? null, avaliacoes: total,
    lista: reviews.map(r => ({ id: r['@id'], versao: r.name, data: r.datePublished, nota: r.reviewRating?.ratingValue,
      pros: campo(r.reviewBody || '', 'Pros'), contras: campo(r.reviewBody || '', 'Contras'), problemas: campo(r.reviewBody || '', 'Problemas'), opiniao: campo(r.reviewBody || '', 'Opiniao') })),
  };
  fs.writeFileSync(f, JSON.stringify(out, null, 1));
  return out;
}

if (process.argv[1]?.endsWith('carroclub.mjs')) {
  const [marca, modelo, ano] = process.argv.slice(2);
  const o = await opinioes(marca, modelo, ano);
  console.log(o.semDados ? 'sem dados' : `${o.nota} (${o.avaliacoes} avaliações, ${o.lista.length} lidas)`);
  for (const r of (o.lista || []).slice(0, 2)) console.log(JSON.stringify(r).slice(0, 400));
}

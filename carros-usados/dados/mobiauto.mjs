// Preço real anunciado: anúncios de carros usados no estado de SP na Mobiauto (página pública de
// busca, dados que a própria página traz embutidos). Guarda cada anúncio (id, versão, ano-modelo,
// km, preço, cidade) em dados/mobiauto/<marca>-<modelo>-<ano>.json com a data da coleta.
// São preços pedidos pelo vendedor, não preços de fechamento.
//   node dados/mobiauto.mjs honda civic 2008
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), 'mobiauto');
fs.mkdirSync(DIR, { recursive: true });
let ultimo = 0;
async function get(url) {
  const espera = 3000 - (Date.now() - ultimo); if (espera > 0) await new Promise(r => setTimeout(r, espera));
  ultimo = Date.now();
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', Accept: 'text/html', 'Accept-Language': 'pt-BR,pt;q=0.9' } });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status} (coleta interrompida)`);
  const html = await r.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`${url}: sem dados embutidos (coleta interrompida)`);
  return JSON.parse(m[1]).props.pageProps.deals;
}

// regiao: 'sp' (estado de São Paulo) ou 'br' (todo o Brasil, quando SP tem poucos anúncios)
export async function anuncios(marca, modelo, ano, regiao = 'sp') {
  const f = path.join(DIR, `${marca}-${modelo}-${ano}${regiao === 'br' ? '-br' : ''}.json`);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  const base = `https://www.mobiauto.com.br/comprar/carros-usados/${regiao === 'br' ? 'brasil/' : 'sp/'}${marca}/${modelo}/ano-${ano}`;
  const d1 = await get(base);
  const paginas = Math.min(20, Math.ceil((d1.numResults || 0) / 24));
  const todos = [...d1.results];
  for (let p = 2; p <= paginas; p++) todos.push(...(await get(`${base}/pagina-${p}`)).results);
  const vistos = new Set();
  const lista = todos.filter(r => !vistos.has(r.id) && vistos.add(r.id)).map(r => ({
    id: r.id, marca: r.trim?.make?.name, modelo: r.trim?.model?.name,
    versao: r.trim?.name?.replace(/\s+/g, ' ').trim(), anoModelo: r.trim?.model?.year, anoFabricacao: r.trim?.productionYear,
    combustivel: r.trim?.fuel?.name, cambio: r.trim?.transmission?.name, km: r.km, preco: r.price, zeroKm: r.deal0km,
    cidade: r.dealer?.location?.city, uf: r.dealer?.location?.state,
  }));
  const out = { fonte: base, coletadoEm: new Date().toISOString(), totalInformado: d1.numResults, anuncios: lista };
  fs.writeFileSync(f, JSON.stringify(out, null, 1));
  return out;
}

if (process.argv[1]?.endsWith('mobiauto.mjs')) {
  const [marca, modelo, ano] = process.argv.slice(2);
  const o = await anuncios(marca, modelo, +ano);
  console.log(o.totalInformado, 'informados,', o.anuncios.length, 'coletados');
  for (const a of o.anuncios.slice(0, 5)) console.log(JSON.stringify(a));
}

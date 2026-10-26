// Ficha Completa (fichacompleta.com.br): lista de versões por modelo e ficha técnica de cada
// versão (equipamentos de série, consumo, dimensões). Usada para a triagem de airbag + ABS; a
// confirmação final é cruzada com o Carros na Web. Páginas originais em dados/fc-cache/.
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://www.fichacompleta.com.br/carros/';
const DIR = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), 'fc-cache');
fs.mkdirSync(DIR, { recursive: true });
let ultimo = 0;
const INTERVALO = +(process.env.FC_INTERVALO || 2500);

export async function pagina(rel) {
  const f = path.join(DIR, rel.replace(/[^\w.-]+/g, '_') + '.html');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  const espera = INTERVALO - (Date.now() - ultimo); if (espera > 0) await new Promise(r => setTimeout(r, espera));
  ultimo = Date.now();
  const r = await fetch(BASE + rel, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', Accept: 'text/html', 'Accept-Language': 'pt-BR,pt;q=0.9' } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${rel}: HTTP ${r.status} (coleta interrompida)`);
  const html = await r.text();
  if (!/<title>/.test(html) || /captcha|verifica[çc][ãa]o de seguran|cf-challenge/i.test(html)) throw new Error(`${rel}: página de verificação (coleta interrompida)`);
  fs.writeFileSync(f, html);
  return html;
}
const linhas = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&').split('\n').map(s => s.trim()).filter(Boolean);

// versões de um modelo num ano: [slug]
export async function versoes(marca, modelo, ano) {
  const html = await pagina(`${marca}/${modelo}/`);
  if (!html) return [];
  return [...new Set([...html.matchAll(new RegExp(`href="/carros/${marca}/([a-z0-9-]+-${ano})"`, 'g'))].map(m => m[1]))];
}

const num = (s) => s == null ? null : +String(s).replace(/\./g, '').replace(',', '.');
export async function ficha(marca, slug) {
  const html = await pagina(`${marca}/${slug}`);
  if (!html) return null;
  const L = linhas(html);
  const titulo = (html.match(/<title>([^<]+)<\/title>/) || [])[1]?.trim();
  // equipamentos da seção "Segurança" (até a próxima seção/fim da lista)
  const iSeg = L.indexOf('Segurança'), iAval = L.findIndex((s, i) => i > iSeg && /^Avalia/.test(s));
  const seg = iSeg >= 0 ? L.slice(iSeg + 1, iAval > 0 ? iAval : iSeg + 40) : [];
  const valor = (rot) => { const i = L.indexOf(rot); return i >= 0 ? L[i + 1] : null; };
  const consumo = {};
  for (const [rot, k] of [['Urbano (A)', 'etanolUrbano'], ['Rodoviário (A)', 'etanolRodoviario'], ['Urbano (G)', 'gasolinaUrbano'], ['Rodoviário (G)', 'gasolinaRodoviario'], ['Urbano', 'urbano'], ['Rodoviário', 'rodoviario']]) {
    const i = L.lastIndexOf(rot); if (i >= 0 && /km\/l/.test(L[i + 1] || '')) consumo[k] = num(L[i + 1].replace(/\s*km\/l/, ''));
  }
  return {
    // sem seção "Segurança" a página simplesmente não informa os equipamentos: não é o mesmo que
    // "não tem" (o Golf GTI 2008 aparece assim) — a triagem trata como desconhecido
    slug, url: BASE + `${marca}/${slug}`, titulo, seguranca: seg, semEquipamentos: seg.length === 0,
    airbag: seg.some(s => /^Airbags? frontais?/i.test(s)), abs: seg.some(s => /^Freios ABS/i.test(s)),
    consumo, alturaSolo: num((valor('Vão livre do solo') || valor('Altura livre do solo') || '').replace(/\s*mm/, '') || null),
  };
}

if (process.argv[1]?.endsWith('fc.mjs')) {
  const [cmd, a, b, c] = process.argv.slice(2);
  if (cmd === 'versoes') console.log((await versoes(a, b, c)).join('\n'));
  if (cmd === 'ficha') console.log(JSON.stringify(await ficha(a, b), null, 1));
}

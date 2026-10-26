// Carros na Web (carrosnaweb.com.br): catálogo, ficha técnica e opiniões de donos.
// Cada página baixada fica em dados/cnw-cache/ (HTML original, latin1 → utf-8), para que tudo o
// que o site afirma possa ser conferido de novo. Uma requisição por segundo, no máximo.
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://www.carrosnaweb.com.br/';
const DIR = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), 'cnw-cache');
fs.mkdirSync(DIR, { recursive: true });
let ultimo = 0;
const INTERVALO = +(process.env.CNW_INTERVALO || 8000);   // ms entre pedidos: o site passa a pedir verificação se for rápido

export async function pagina(rel) {
  const f = path.join(DIR, rel.replace(/[^\w.=&-]+/g, '_').slice(0, 180) + '.html');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  const espera = INTERVALO - (Date.now() - ultimo); if (espera > 0) await new Promise(r => setTimeout(r, espera));
  ultimo = Date.now();
  const r = await fetch(BASE + rel, { headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'pt-BR,pt;q=0.9' } });
  if (!r.ok) throw new Error(`${rel}: HTTP ${r.status}`);
  const html = new TextDecoder('latin1').decode(await r.arrayBuffer());
  // página de verificação anti-robô no lugar do conteúdo: para tudo (não tentamos passar por ela)
  if (html.includes('var pageUrl') && !html.includes('Carros na Web |') && !html.includes('fichadetalhe.asp?codigo=')) throw new Error('VERIFICACAO: o site pediu verificação anti-robô; coleta interrompida');
  fs.writeFileSync(f, html);
  return html;
}
export const texto = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').split('\n').map(s => s.trim()).filter(Boolean);

// catálogo: lista [{codigo, nome}] de uma busca (todas as páginas)
export async function catalogo(params) {
  const out = []; const vistos = new Set();
  for (let pg = 1; pg < 60; pg++) {
    const q = new URLSearchParams({ ...params, curpage: String(pg) }).toString();
    const html = await pagina('catalogo.asp?' + q);
    const novos = [...html.matchAll(/fichadetalhe\.asp\?codigo=(\d+)"[^>]*>([\s\S]*?)<\/a>/g)]
      .map(m => ({ codigo: m[1], nome: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }))
      .filter(x => x.nome && !vistos.has(x.codigo));
    if (!novos.length) break;
    for (const n of novos) { vistos.add(n.codigo); out.push(n); }
    if (!html.includes(`curpage=${pg + 1}&`)) break;
  }
  return out;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'catalogo') { const p = Object.fromEntries(rest.map(s => s.split('='))); for (const c of await catalogo(p)) console.log(c.codigo, c.nome); }
  if (cmd === 'texto') console.log(texto(await pagina(rest[0])).join(' | '));
}

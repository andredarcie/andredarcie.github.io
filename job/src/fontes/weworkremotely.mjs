import { dormir } from '../lib/http.mjs';
import { htmlParaTexto, decodificarEntidades } from '../lib/texto.mjs';

export const id = 'weworkremotely';
export const nome = 'We Work Remotely';
export const site = 'https://weworkremotely.com';
export const escopo = 'Remoto global — feeds RSS por categoria (25 por feed)';

const FEEDS = [
  'remote-programming-jobs',
  'remote-back-end-programming-jobs',
  'remote-front-end-programming-jobs',
  'remote-full-stack-programming-jobs',
  'remote-devops-sysadmin-jobs',
];

function extrair(bloco, tag) {
  const m = bloco.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  return decodificarEntidades(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '')).trim();
}

export async function coletar({ quota = 150, log }) {
  const brutos = [];
  const vistos = new Set();

  for (const feed of FEEDS) {
    if (brutos.length >= quota * 1.6) break;
    try {
      const resp = await fetch(`https://weworkremotely.com/categories/${feed}.rss`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; radar-vagas-dev/1.0)' },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const xml = await resp.text();
      const itens = xml.split('<item>').slice(1);
      for (const bruto of itens) {
        const bloco = bruto.split('</item>')[0];
        const link = extrair(bloco, 'link');
        if (!link || vistos.has(link)) continue;
        vistos.add(link);
        brutos.push({
          feed,
          link,
          title: extrair(bloco, 'title'),
          region: extrair(bloco, 'region'),
          category: extrair(bloco, 'category'),
          type: extrair(bloco, 'type'),
          pubDate: extrair(bloco, 'pubDate'),
          description: extrair(bloco, 'description'),
        });
      }
      log(`feed ${feed}: acumulado ${brutos.length}`);
    } catch (erro) {
      log(`feed ${feed} falhou: ${erro.message}`);
    }
    await dormir(800);
  }

  return { brutos, vagas: normalizar(brutos) };
}

export function normalizar(brutos) {
  return brutos.map((j) => {
    // O título vem como "Empresa: Cargo".
    const idx = j.title.indexOf(':');
    const empresa = idx > 0 ? j.title.slice(0, idx).trim() : '';
    const titulo = idx > 0 ? j.title.slice(idx + 1).trim() : j.title;
    return {
      fonte: id,
      idExterno: j.link,
      titulo,
      empresa,
      local: j.region || 'Remoto',
      modalidadeBruta: 'remoto',
      tipoContrato: j.type || '',
      salario: '',
      url: j.link,
      publicadoEm: j.pubDate
        ? new Date(j.pubDate).toISOString().slice(0, 10)
        : '',
      tags: [j.category, j.feed].filter(Boolean),
      texto: htmlParaTexto(j.description),
    };
  });

}

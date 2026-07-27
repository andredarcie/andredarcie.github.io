import { buscarJSON, dormir } from '../lib/http.mjs';
import { htmlParaTexto } from '../lib/texto.mjs';

export const id = 'jobicy';
export const nome = 'Jobicy';
export const site = 'https://jobicy.com';
export const escopo = 'Remoto global — API limitada a 50 por chamada, varrida por região';

// A API devolve no máximo 50 itens por chamada; varremos por região para
// acumular volume sem repetir o mesmo recorte.
const REGIOES = ['anywhere', 'usa', 'europe', 'uk', 'canada', 'emea', 'latam', 'apac'];

export async function coletar({ quota = 150, log }) {
  const brutos = [];
  const vistos = new Set();

  for (const geo of REGIOES) {
    if (brutos.length >= quota * 1.6) break;
    const url = `https://jobicy.com/api/v2/remote-jobs?count=50&industry=dev&geo=${geo}`;
    let dados;
    try {
      dados = await buscarJSON(url);
    } catch (erro) {
      log(`região ${geo} falhou: ${erro.message}`);
      continue;
    }
    for (const j of dados.jobs || []) {
      if (vistos.has(j.id)) continue;
      vistos.add(j.id);
      brutos.push(j);
    }
    log(`região ${geo}: acumulado ${brutos.length}`);
    await dormir(700);
  }

  return { brutos, vagas: normalizar(brutos) };
}

export function normalizar(brutos) {
  return brutos.map((j) => ({
    fonte: id,
    idExterno: String(j.id),
    titulo: j.jobTitle || '',
    empresa: j.companyName || '',
    local: j.jobGeo || 'Remoto',
    modalidadeBruta: 'remoto',
    tipoContrato: Array.isArray(j.jobType) ? j.jobType.join(', ') : j.jobType || '',
    salario:
      j.salaryMin && j.salaryMax
        ? `${j.salaryMin}–${j.salaryMax} ${j.salaryCurrency || ''}`.trim()
        : '',
    url: j.url || '',
    publicadoEm: (j.pubDate || '').slice(0, 10),
    tags: [
      ...(Array.isArray(j.jobIndustry) ? j.jobIndustry : []),
      ...(Array.isArray(j.jobLevel) ? j.jobLevel : [j.jobLevel].filter(Boolean)),
    ],
    texto: htmlParaTexto(j.jobDescription || j.jobExcerpt),
  }));

}

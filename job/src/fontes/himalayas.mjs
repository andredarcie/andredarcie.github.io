import { buscarJSON, dormir } from '../lib/http.mjs';
import { htmlParaTexto } from '../lib/texto.mjs';

export const id = 'himalayas';
export const nome = 'Himalayas';
export const site = 'https://himalayas.app';
export const escopo = 'Remoto global — API paginada de 20 em 20';

export async function coletar({ quota = 300, paginas = 20, log }) {
  const brutos = [];
  for (let p = 0; p < paginas && brutos.length < quota * 2; p++) {
    const dados = await buscarJSON(
      `https://himalayas.app/jobs/api?limit=20&offset=${p * 20}`
    );
    const lote = dados.jobs || [];
    if (lote.length === 0) break;
    brutos.push(...lote);
    if (p % 5 === 0) log(`offset ${p * 20}: acumulado ${brutos.length}`);
    await dormir(700);
  }

  return { brutos, vagas: normalizar(brutos) };
}

export function normalizar(brutos) {
  return brutos.map((j) => ({
    fonte: id,
    idExterno: String(j.guid || j.applicationLink),
    titulo: j.title || '',
    empresa: j.companyName || '',
    local: (j.locationRestrictions || []).join(', ') || 'Remoto',
    modalidadeBruta: 'remoto',
    tipoContrato: Array.isArray(j.employmentType)
      ? j.employmentType.join(', ')
      : j.employmentType || '',
    salario:
      j.minSalary && j.maxSalary
        ? `${j.minSalary}–${j.maxSalary} ${j.currency || ''}`.trim()
        : '',
    url: j.applicationLink || '',
    publicadoEm: j.pubDate
      ? new Date(
          typeof j.pubDate === 'number' ? j.pubDate * 1000 : j.pubDate
        ).toISOString().slice(0, 10)
      : '',
    tags: [
      ...(j.categories || []),
      ...(Array.isArray(j.seniority) ? j.seniority : []),
    ],
    texto: htmlParaTexto(j.description || j.excerpt),
  }));

}

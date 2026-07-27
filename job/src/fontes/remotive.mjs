import { buscarJSON } from '../lib/http.mjs';
import { htmlParaTexto } from '../lib/texto.mjs';

export const id = 'remotive';
export const nome = 'Remotive';
export const site = 'https://remotive.com';
export const escopo = 'Remoto global — categoria software-dev';

export async function coletar({ quota = 250, log }) {
  const url = 'https://remotive.com/api/remote-jobs?category=software-dev';
  const dados = await buscarJSON(url);
  const brutos = (dados.jobs || []).slice(0, quota);
  log(`${brutos.length} anúncios (de ${dados['job-count'] ?? dados.jobs?.length ?? '?'} disponíveis)`);

  return { brutos, vagas: normalizar(brutos) };
}

export function normalizar(brutos) {
  return brutos.map((j) => ({
    fonte: id,
    idExterno: String(j.id),
    titulo: j.title || '',
    empresa: j.company_name || '',
    local: j.candidate_required_location || 'Remoto',
    modalidadeBruta: 'remoto',
    tipoContrato: j.job_type || '',
    salario: j.salary || '',
    url: j.url || '',
    publicadoEm: (j.publication_date || '').slice(0, 10),
    tags: j.tags || [],
    texto: htmlParaTexto(j.description),
  }));

}

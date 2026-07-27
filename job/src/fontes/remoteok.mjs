import { buscarJSON } from '../lib/http.mjs';
import { htmlParaTexto } from '../lib/texto.mjs';

export const id = 'remoteok';
export const nome = 'Remote OK';
export const site = 'https://remoteok.com';
export const escopo = 'Remoto global — feed completo do board';

export async function coletar({ quota = 200, log }) {
  const dados = await buscarJSON('https://remoteok.com/api');
  // O primeiro item do feed é um aviso legal, não uma vaga.
  const brutos = (Array.isArray(dados) ? dados : [])
    .filter((j) => j && (j.position || j.title))
    .slice(0, quota);
  log(`${brutos.length} anúncios`);

  return { brutos, vagas: normalizar(brutos) };
}

export function normalizar(brutos) {
  return brutos.map((j) => ({
    fonte: id,
    idExterno: String(j.id || j.slug),
    titulo: j.position || j.title || '',
    empresa: j.company || '',
    local: j.location || 'Remoto',
    modalidadeBruta: 'remoto',
    tipoContrato: '',
    salario:
      j.salary_min && j.salary_max ? `${j.salary_min}–${j.salary_max} USD/ano` : '',
    url: j.url || j.apply_url || '',
    publicadoEm: (j.date || '').slice(0, 10),
    tags: j.tags || [],
    texto: htmlParaTexto(j.description),
  }));

}

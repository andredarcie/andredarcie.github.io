import { buscarJSON, dormir } from '../lib/http.mjs';
import { htmlParaTexto } from '../lib/texto.mjs';

export const id = 'gupy';
export const nome = 'Gupy';
export const site = 'https://portal.gupy.io';
export const escopo = 'Brasil — maior ATS do país, vagas em português';

const API = 'https://employability-portal.gupy.io/api/v1/jobs';

export async function coletar({ quota = 400, consultas = ['desenvolvedor'], log }) {
  const brutos = [];
  const vistos = new Set();
  const porConsulta = Math.max(20, Math.ceil((quota * 1.6) / consultas.length));

  for (const termo of consultas) {
    let obtidos = 0;
    for (let offset = 0; obtidos < porConsulta; offset += 100) {
      const url = `${API}?jobName=${encodeURIComponent(termo)}&limit=100&offset=${offset}`;
      const dados = await buscarJSON(url);
      const lote = dados.data || [];
      if (lote.length === 0) break;
      for (const j of lote) {
        if (vistos.has(j.id)) continue;
        vistos.add(j.id);
        brutos.push(j);
        obtidos++;
      }
      await dormir(700);
      if (lote.length < 100) break;
    }
    log(`"${termo}": acumulado ${brutos.length}`);
    if (brutos.length >= quota * 1.6) break;
  }

  return { brutos, vagas: normalizar(brutos) };
}

export function normalizar(brutos) {
  return brutos.map((j) => ({
    fonte: id,
    idExterno: String(j.id),
    titulo: j.name || '',
    empresa: j.careerPageName || '',
    local: [j.city, j.state, j.country].filter(Boolean).join(', '),
    modalidadeBruta: j.isRemoteWork
      ? 'remoto'
      : (j.workplaceType || 'presencial/híbrido'),
    tipoContrato: j.type || '',
    salario: '',
    url: j.jobUrl || '',
    publicadoEm: (j.publishedDate || '').slice(0, 10),
    tags: (j.skills || []).map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean),
    texto: htmlParaTexto(j.description),
  }));

}

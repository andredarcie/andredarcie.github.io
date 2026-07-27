import { buscarJSON, dormir } from '../lib/http.mjs';
import { htmlParaTexto } from '../lib/texto.mjs';

export const id = 'arbeitnow';
export const nome = 'Arbeitnow';
export const site = 'https://www.arbeitnow.com';
export const escopo = 'Europa (forte na Alemanha) — board generalista, 100 por página';

export async function coletar({ quota = 300, paginas = 6, log }) {
  const brutos = [];
  for (let p = 1; p <= paginas && brutos.length < quota * 2; p++) {
    const dados = await buscarJSON(
      `https://www.arbeitnow.com/api/job-board-api?page=${p}`
    );
    const lote = dados.data || [];
    if (lote.length === 0) break;
    brutos.push(...lote);
    log(`página ${p}: +${lote.length} (acumulado ${brutos.length})`);
    await dormir(700);
  }

  return { brutos, vagas: normalizar(brutos) };
}

export function normalizar(brutos) {
  return brutos.map((j) => ({
    fonte: id,
    idExterno: j.slug,
    titulo: j.title || '',
    empresa: j.company_name || '',
    local: j.location || '',
    modalidadeBruta: j.remote ? 'remoto' : 'presencial/híbrido',
    tipoContrato: (j.job_types || []).join(', '),
    salario: '',
    url: j.url || '',
    publicadoEm: j.created_at
      ? new Date(j.created_at * 1000).toISOString().slice(0, 10)
      : '',
    tags: j.tags || [],
    texto: htmlParaTexto(j.description),
  }));

}

import { buscarJSON, dormir } from '../lib/http.mjs';
import { htmlParaTexto, decodificarEntidades, normalizarParaBusca } from '../lib/texto.mjs';

export const id = 'greenhouse_br';
export const nome = 'Greenhouse — empresas brasileiras';
export const site = 'https://boards.greenhouse.io';
export const escopo =
  'Brasil — página de carreiras de empresas de tecnologia e fintechs brasileiras';

// Boards públicos de empresas brasileiras. A lista é o recorte: cada slug é uma
// empresa com sede no Brasil, e o filtro de local abaixo descarta as posições
// que essas mesmas empresas abrem fora do país.
const API = 'https://boards-api.greenhouse.io/v1/boards';

const CIDADES_BR = [
  'sao paulo', 'rio de janeiro', 'belo horizonte', 'curitiba', 'porto alegre',
  'recife', 'salvador', 'fortaleza', 'brasilia', 'campinas', 'florianopolis',
  'goiania', 'manaus', 'belem', 'vitoria', 'natal', 'joao pessoa', 'maceio',
  'teresina', 'sao luis', 'cuiaba', 'campo grande', 'aracaju', 'uberlandia',
  'ribeirao preto', 'sorocaba', 'santos', 'joinville', 'blumenau', 'londrina',
  'maringa', 'feira de santana', 'guarulhos', 'osasco', 'barueri', 'caxias do sul',
  'juiz de fora', 'sao jose dos campos', 'niteroi', 'santo andre', 'sao bernardo',
];

function ehBrasil(local) {
  const l = normalizarParaBusca(local);
  if (/\bbrasil\b|\bbrazil\b/.test(l)) return true;
  return CIDADES_BR.some((cidade) => l.includes(cidade));
}

export async function coletar({ empresas = [], log }) {
  const porEmpresa = [];

  for (const slug of empresas) {
    let dados;
    try {
      dados = await buscarJSON(`${API}/${slug}/jobs?content=true`);
    } catch (erro) {
      log(`${slug} falhou: ${erro.message}`);
      continue;
    }
    const todas = dados.jobs || [];
    const noBrasil = todas.filter((j) => ehBrasil(j.location?.name || ''));
    if (noBrasil.length) porEmpresa.push(noBrasil.map((j) => ({ ...j, _empresa: slug })));
    log(`${slug}: ${noBrasil.length} no Brasil (de ${todas.length})`);
    await dormir(600);
  }

  // Intercala as empresas em rodízio. A quota é aplicada depois, na ordem da
  // lista: sem intercalar, os três bancos — que são os maiores boards e quase
  // só publicam vaga comercial — consumiriam a cota inteira antes de a primeira
  // empresa de produto aparecer.
  const brutos = [];
  const maior = Math.max(0, ...porEmpresa.map((lista) => lista.length));
  for (let i = 0; i < maior; i++) {
    for (const lista of porEmpresa) {
      if (lista[i]) brutos.push(lista[i]);
    }
  }

  log(`${brutos.length} anúncios no Brasil, de ${porEmpresa.length} empresas`);
  return { brutos, vagas: normalizar(brutos) };
}

export function normalizar(brutos) {
  return brutos.map((j) => ({
    fonte: id,
    idExterno: String(j.id),
    titulo: j.title || '',
    empresa: j.company_name || j._empresa || '',
    local: j.location?.name || 'Brasil',
    modalidadeBruta: /remoto|remote/i.test(j.location?.name || '')
      ? 'remoto'
      : /hibrido|híbrido|hybrid/i.test(j.location?.name || '')
        ? 'hibrido'
        : '',
    tipoContrato: '',
    salario: '',
    url: j.absolute_url || '',
    publicadoEm: (j.first_published || j.updated_at || '').slice(0, 10),
    tags: (j.departments || []).map((d) => d.name).filter(Boolean),
    // O conteúdo vem com HTML escapado (&lt;p&gt;): decodifica antes de limpar.
    texto: htmlParaTexto(decodificarEntidades(j.content || '')),
  }));
}

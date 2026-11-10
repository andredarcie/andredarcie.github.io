import { writeFile } from 'node:fs/promises';

const DESTINO = new URL('./vagas.js', import.meta.url);
const AGORA = Date.now();
const DIA = 86_400_000;

function texto(html = '') {
  return String(html)
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&(?:nbsp|amp|apos|rsquo|lsquo|ndash|mdash|hellip);/gi, (entity) => ({
      '&nbsp;': ' ', '&amp;': '&', '&apos;': "'", '&rsquo;': '’', '&lsquo;': '‘',
      '&ndash;': '–', '&mdash;': '—', '&hellip;': '…',
    })[entity.toLowerCase()] || ' ')
    .replace(/\s+/g, ' ').trim();
}

function normalizar(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function linhasDoAnuncio(html = '') {
  return String(html)
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/<\/(?:p|li|div|h[1-6])\s*>|<br\s*\/?\s*>/gi, '\n')
    .split(/\n+/).map((line) => normalizar(texto(line))).filter(Boolean);
}

function eOpcionalOuBeneficio(line) {
  return /\b(?:desejavel|diferencial|preferencial|opcional|nao obrigatori[oa]|nao exigid[oa]|bolsa|auxilio educacao|parceria|desconto|curso gratuito)\b/.test(line)
    && !/\b(?:obrigatori[oa]|requisito obrigatorio|exigid[oa]|indispensavel)\b/.test(line);
}

function pedeSuperior(job) {
  if (/\b(?:advogad[oa]|psicolog[oa]|enfermeir[oa]|medic[oa]|nutricionista|farmaceutic[oa]|professor universitari[oa]|graduacao|ensino superior)\b/.test(normalizar(job.title))) return true;
  const education = normalizar(job.education);
  if (/\b(?:graduacao|superior|bacharelado|licenciatura|tecnologo|mestrado|doutorado)\b/.test(education)
    && !/\b(?:medio|tecnico|fundamental)\b/.test(education)) return true;
  return linhasDoAnuncio(`${job.description || ''}\n${job.requirements || ''}`).some((line) => {
    if (!/\b(?:ensino superior|nivel superior|curso superior|superior completo|superior cursando|graduac(?:ao|oes)|graduad[oa]s?|bacharel(?:ado)?|licenciatura|tecnologo|pos.graduacao|mestrado|doutorado|mba)\b/.test(line)) return false;
    if (eOpcionalOuBeneficio(line) || /\bensino medio\b.{0,45}\bou\s+(?:ensino\s+)?superior\b/.test(line)) return false;
    if (/\b(?:instituicao|empresa|faculdade|universidade|escola)\b.{0,35}\bensino superior\b/.test(line)
      && !/\b(?:formacao|escolaridade|exig|requisit|necessari|completo|cursando)\b/.test(line)) return false;
    return true;
  }) || linhasDoAnuncio(job.requirements || job.description).some((line) =>
    /^.{0,15}formacao\s+(?:academica\s+)?(?:completa\s+)?em\s+(?!ensino medio|curso tecnico)/.test(line)
    && !eOpcionalOuBeneficio(line));
}

function exigeOutroIdioma(job) {
  if (/\b(?:ingles|english|espanhol|spanish|frances|french|alemao|german|italiano|italian|bilingue|multilingue)\b/.test(normalizar(job.languages))) return true;
  return linhasDoAnuncio(`${job.title || ''}\n${job.description || ''}\n${job.requirements || ''}`).some((line) =>
    /\b(?:ingles|english|espanhol|spanish|frances|french|alemao|german|italiano|italian|bilingue|multilingue)\b/.test(line)
    && !eOpcionalOuBeneficio(line));
}

function naoEIntegralmenteRemoto(value) {
  const content = normalizar(value);
  return /\b(?:hibrid[oa]|hybrid|on.?site|onsite|viagens? frequentes|vendas? externas?|comercial externo|atuacao externa|visitas? presenciais|visitas? a clientes)\b/.test(content)
    || /\b(?:modelo|modalidade|regime|trabalho|atuacao|vaga|dias?)\b.{0,30}\bpresencial\b|\bpresencial\b.{0,30}\b(?:obrigatori[oa]|dias?|semana)\b/.test(content);
}

function eTrabalhoDeCampo(value) {
  return /\b(?:trabalho de campo|auditor de campo|representante comercial|supervisor regional de vendas|promotor de vendas|motorista|entregador|visitas? a clientes|atendimento externo|inspecao|intervencao em pocos|vendas externas?|offshore)\b|\blocal de trabalho\s*:/.test(normalizar(value));
}

function tituloEmIngles(title) {
  return /^(?:\s*\[[^\]]+\])?\s*(?:sr\.?\s*)?product designer\b/i.test(title);
}

function eProgramacaoOuDesenvolvimento(job, description) {
  const title = normalizar(job.title);
  const category = normalizar(job.category);
  const content = normalizar(description);
  if (/\b(?:desenvolv\w*|programa(?:dor|dora|cao)|devops|sre|software|full.?stack|front.?end|back.?end|tech lead)\b/.test(title)) return true;
  if (/\b(?:agile coach|scrum master|qa|testes?|sistemas?|requisitos|produto|product|ux|ui|arquiteto|arquiteta|engenheiro|engenheira|appsec|cientista de dados|machine learning|mlops)\b/.test(title)) return true;
  if (/(?:\bc\+\+|\bc#|\.net\b|\b(?:javascript|typescript|python|php|react|angular|nodejs|ruby|golang|delphi|kotlin|swift)\b)/.test(title)) return true;
  if (/\b(?:engenheir[oa]|arquiteto|analista)\s+de\s+(?:sistemas|software|cloud|dados)\b/.test(title)) return true;
  if (/\b(?:sap|erp)\b/.test(title) || (/\btecnologia\b/.test(category) && /\b(?:projetos|produto|product|consultor|sistemas)\b/.test(title))) return true;
  if (/\b(?:desenvolvimento|programacao|codificacao|implementacao)\s+de\s+(?:software|sistemas|aplicac(?:ao|oes)|aplicativos?|sites?|plataformas?|apis?|codigo|funcionalidades|interfaces)\b/.test(content)) return true;
  if (/\b(?:escrever|criar|manter|revisar|testar)\s+(?:o\s+)?codigo\b/.test(content)) return true;
  return /\b(?:javascript|typescript|python|php|reactjs|angular|vuejs|nodejs|ruby|golang|delphi|kotlin|swift|c#|\.net)\b/.test(content);
}

function estaEmPortugues(title, description) {
  if (/\b(?:soporte|estratega|datos|atencion|ventas|ingeniero|desarrollador|trabajo)\b/.test(normalizar(title))) return false;
  if (!/\b(?:analista|assistente|auxiliar|atendente|pessoa|tecnic[oa]|desenvolvedor|programador|coordenador|gerente|consultor|vendedor|operador|especialista|supervisor|agente|redator|designer|arquiteto|engenheiro|recrutador|representante|aprendiz|profissional|suporte|executiv[oa]|lider)\b/.test(normalizar(title))) return false;
  const content = normalizar(description).slice(0, 5000);
  const count = (words) => words.reduce((sum, word) => sum + (content.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
  const pt = count(['para', 'com', 'voce', 'sua', 'nosso', 'nossa', 'buscamos', 'requisitos', 'atividades', 'experiencia', 'conhecimento', 'ensino', 'vaga', 'trabalho', 'profissional', 'equipe', 'beneficios', 'empresa', 'atendimento', 'habilidades', 'atuar', 'responsabilidades', 'desejavel']);
  const en = count(['the', 'and', 'with', 'our', 'your', 'you', 'we', 'for', 'required', 'experience', 'responsibilities', 'skills', 'team', 'role', 'apply']);
  return pt >= (content.length < 600 ? 4 : 7) && pt > en * 2;
}

function dataMs(value) {
  return Date.parse(value || '') || 0;
}

function urlSegura(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; }
  catch { return ''; }
}

async function buscar(url, accept = 'application/json') {
  const response = await fetch(url, {
    headers: { Accept: accept, 'Accept-Language': 'pt-BR,pt;q=0.9', 'User-Agent': 'VagasDeQualquerLugar/1.0' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${response.status} em ${url}`);
  return accept === 'application/json' ? response.json() : response.text();
}

async function solides() {
  const jobs = [];
  for (let page = 1; page <= 110; page++) {
    let data;
    try {
      data = await buscar(`https://vagas.solides.com.br/api/vacancies?page=${page}&take=14&jobsType=remoto&locations=`);
    } catch (error) {
      console.warn(`Sólides indisponível na página ${page}: ${error.message}`);
      break;
    }
    for (const job of data.data || []) {
      if (job.jobType !== 'remoto' || job.currentState !== 'em_andamento' || job.isDisabled || !/^\d+$/.test(String(job.id))) continue;
      const url = `https://vagas.solides.com.br/vaga/${job.id}`;
      jobs.push({
        id: `solides:${job.id}`, title: job.title, company: job.companyName,
        category: (job.occupationAreas || []).map((area) => area.name).join(', '),
        location: [job.city?.name, job.state?.code].filter(Boolean).join(' - ') || 'Brasil',
        date: dataMs(job.createdAt), expiry: dataMs(job.date?.due),
        applyUrl: url, sourceName: 'Sólides Vagas', description: job.description,
        education: (job.education || []).map((level) => level.name).join(', '),
        languages: (job.language || []).map((language) => language.name).join(', '),
      });
    }
    if (page >= (data.totalPages || 1)) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return jobs;
}

const EMPRESAS = ['arcoeducacao', 'jusbrasil', 'rdstation', 'stone', 'quintoandar', 'c6bank', 'xpinc'];

async function greenhouseBrasil() {
  const jobs = [];
  for (const company of EMPRESAS) {
    try {
      const data = await buscar(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`);
      for (const job of data.jobs || []) {
        if (job.language !== 'pt' || !/\bremot[oa]?\b|home office/i.test(`${job.location?.name} ${job.title}`)) continue;
        jobs.push({
          id: `greenhouse:${job.id}`, title: job.title, company: job.company_name || company,
          category: (job.departments || []).map((department) => department.name).join(', '),
          location: job.location?.name || 'Brasil',
          date: dataMs(job.first_published || job.updated_at), expiry: dataMs(job.application_deadline),
          applyUrl: job.absolute_url, sourceUrl: `https://job-boards.greenhouse.io/${company}`,
          sourceName: 'Carreiras da empresa', description: job.content,
          education: '',
        });
      }
    } catch (error) { console.warn(`Quadro ${company} indisponível: ${error.message}`); }
  }
  return jobs;
}

async function remotar() {
  const jobs = [];
  for (let page = 1; page <= 100; page++) {
    let data;
    try {
      data = await buscar(`https://api.remotar.com.br/jobs?search=&active=true&page=${page}`);
    } catch (error) {
      console.warn(`Remotar indisponível na página ${page}: ${error.message}`);
      break;
    }
    for (const job of data.data || []) {
      if (job.type !== 'remote' || !job.active || job.expired) continue;
      const country = normalizar(`${job.country?.name || ''} ${job.country?.code || ''}`);
      if (country && !/\b(?:brasil|brazil|br)\b/.test(country)) continue;
      const detailUrl = `https://remotar.com.br/job/${job.id}`;
      jobs.push({
        id: `remotar:${job.id}`, title: job.title,
        company: job.companyDisplayName || job.company?.name,
        category: (job.jobCategories || []).map((category) => category.name).filter(Boolean).join(', '),
        location: [job.city, job.state].filter(Boolean).join(' - ') || 'Brasil',
        date: dataMs(job.createdAt), expiry: dataMs(job.expiresAt),
        applyUrl: urlSegura(job.externalLink) || detailUrl,
        sourceUrl: detailUrl, sourceName: 'Remotar',
        description: [job.subtitle, job.description].filter(Boolean).join('\n'), requirements: job.jobRequirements,
        education: '', languages: '',
      });
    }
    if (page >= (data.meta?.last_page || 1)) break;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return jobs;
}

const fontes = await Promise.allSettled([solides(), greenhouseBrasil(), remotar()]);
const coletadas = fontes.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
if (coletadas.length === 0) throw new Error('Nenhuma fonte retornou vagas; o arquivo anterior foi preservado.');
for (const [index, result] of fontes.entries()) {
  if (result.status === 'rejected') console.warn(`Fonte ${index + 1} indisponível: ${result.reason.message}`);
  else console.log(`Fonte ${index + 1}: ${result.value.length} anúncios coletados.`);
}

const vistas = new Set();
const linksVistos = new Set();
const sitesDasFontes = {
  'Sólides Vagas': 'https://vagas.solides.com.br/',
  Remotar: 'https://remotar.com.br/',
};
function areaDaVaga(job) {
  const areaInformada = texto(job.category).replace(/^(?:,\s*)+|(?:\s*,)+$/g, '');
  if (areaInformada) return areaInformada.slice(0, 90);
  const title = normalizar(job.title);
  const areas = [
    [/atendimento|suporte|relacionamento|customer success|contact center|call center/, 'Atendimento e suporte'],
    [/administrativ|operac|backoffice|secretari/, 'Administrativo e operações'],
    [/marketing|midias|designer|conteudo|copywriter|social media|e-commerce|growth/, 'Marketing e criação'],
    [/vendas|comercial|sdr|closer|contas|negocios/, 'Vendas e comercial'],
    [/financeir|fiscal|contabil|cobranca|faturamento|folha de pagamento/, 'Financeiro e contábil'],
    [/recrutamento|selecao|talentos|people|remuneracao|beneficios/, 'Recursos humanos'],
    [/juridic|legal/, 'Jurídico'],
    [/pedagogic|professor|instrutor|educacao/, 'Educação'],
  ];
  return areas.find(([pattern]) => pattern.test(title))?.[1] || 'Outras áreas';
}
const vagas = coletadas.filter((job) => {
  const description = texto(job.description);
  if (description.length < 80 || !job.title || !job.company || !urlSegura(job.applyUrl)) return false;
  if (!job.date || job.date > AGORA + DIA) return false;
  if (job.expiry && job.expiry < AGORA) return false;
  if (!estaEmPortugues(job.title, description)) return false;
  if (tituloEmIngles(job.title) || /\b(?:estagio|estagiari[oa]|trainee)\b/.test(normalizar(job.title))) return false;
  if (/\b(?:banco de talentos|cadastro reserva)\b/.test(normalizar(job.title))) return false;
  if (eProgramacaoOuDesenvolvimento(job, description)) return false;
  if (pedeSuperior(job) || exigeOutroIdioma(job)) return false;
  if (naoEIntegralmenteRemoto(`${job.title} ${description}`) || eTrabalhoDeCampo(`${job.title} ${description}`)) return false;
  const key = normalizar(`${job.company} ${job.title} ${job.location}`).replace(/[^a-z0-9]+/g, '');
  const link = new URL(job.applyUrl);
  const linkKey = `${link.hostname}${link.pathname}`;
  if (vistas.has(key) || linksVistos.has(linkKey)) return false;
  vistas.add(key);
  linksVistos.add(linkKey);
  return true;
}).sort((a, b) => b.date - a.date).map((job) => {
  const area = areaDaVaga(job);
  return {
    id: job.id, titulo: texto(job.title), empresa: texto(job.company),
    area, local: texto(job.location || 'Brasil').slice(0, 90),
    publicadoEm: new Date(job.date).toISOString().slice(0, 10),
    expiraEm: job.expiry ? new Date(job.expiry).toISOString().slice(0, 10) : '',
    resumo: `Vaga remota em português na área de ${area.toLowerCase()}. Confira as atividades e os requisitos no anúncio original.`,
    candidatura: urlSegura(job.applyUrl), fonteUrl: job.sourceUrl || sitesDasFontes[job.sourceName], fonte: job.sourceName,
  };
});

const snapshot = { atualizadoEm: new Date(AGORA).toISOString(), totalAnalisado: coletadas.length, vagas };
await writeFile(DESTINO, `window.__VAGAS__ = ${JSON.stringify(snapshot, null, 2)};\n`, 'utf8');
console.log(`${coletadas.length} anúncios analisados; ${vagas.length} vagas remotas em português, sem superior, outro idioma ou programação exigidos.`);

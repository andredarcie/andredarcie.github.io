import { dormir } from '../lib/http.mjs';
import { htmlParaTexto } from '../lib/texto.mjs';

export const id = 'programathor';
export const nome = 'ProgramaThor';
export const site = 'https://programathor.com.br';
export const escopo = 'Brasil — board só de vagas de tecnologia, empresas menores e startups';

const BASE = 'https://programathor.com.br';
const CABECALHOS = {
  'User-Agent': 'radar-vagas-dev/1.0 (pesquisa de mercado; contato: andrendarcie@gmail.com)',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'pt-BR,pt;q=0.9',
};

// O JSON-LD do site sai com quebras de linha cruas dentro das strings, o que é
// JSON inválido. Trocar os caracteres de controle por espaço resolve.
const CARACTERES_DE_CONTROLE = new RegExp('[\\u0000-\\u001f]', 'g');

async function buscarHTML(url) {
  const resp = await fetch(url, { headers: CABECALHOS });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} em ${url}`);
  return resp.text();
}

// A listagem não expõe a descrição; ela só existe na página da vaga, em JSON-LD.
function extrairJobPosting(html) {
  const blocos = [
    ...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g),
  ];
  for (const bloco of blocos) {
    let json;
    try {
      json = JSON.parse(bloco[1].replace(CARACTERES_DE_CONTROLE, ' '));
    } catch {
      continue;
    }
    const nos = json['@graph'] || [json];
    const vaga = nos.find((n) => n && n['@type'] === 'JobPosting');
    if (vaga) return vaga;
  }
  return null;
}

export async function coletar({ quota = 160, paginas = 14, log }) {
  const caminhos = new Set();

  for (let p = 1; p <= paginas && caminhos.size < quota * 1.4; p++) {
    let html;
    try {
      html = await buscarHTML(`${BASE}/jobs?page=${p}`);
    } catch (erro) {
      log(`listagem página ${p} falhou: ${erro.message}`);
      break;
    }
    const antes = caminhos.size;
    for (const m of html.matchAll(/href="(\/jobs\/[0-9]+-[^"#?]+)"/g)) {
      caminhos.add(m[1]);
    }
    if (caminhos.size === antes) break;
    await dormir(700);
  }

  log(`${caminhos.size} anúncios listados; buscando a descrição de cada um`);

  const brutos = [];
  let falhas = 0;
  for (const caminho of caminhos) {
    if (brutos.length >= quota * 1.4) break;
    try {
      const html = await buscarHTML(`${BASE}${caminho}`);
      const vaga = extrairJobPosting(html);
      if (vaga) brutos.push({ ...vaga, _url: `${BASE}${caminho}` });
      else falhas++;
    } catch {
      falhas++;
    }
    if (brutos.length && brutos.length % 40 === 0) log(`${brutos.length} descrições obtidas`);
    await dormir(600);
  }

  log(`${brutos.length} anúncios com descrição (${falhas} sem JSON-LD utilizável)`);
  return { brutos, vagas: normalizar(brutos) };
}

export function normalizar(brutos) {
  return brutos.map((j) => {
    const local = [
      j.jobLocation?.address?.addressLocality,
      j.jobLocation?.address?.addressRegion,
    ]
      .filter(Boolean)
      .join(', ');
    return {
      fonte: id,
      // O identifier do JSON-LD deles identifica a EMPRESA, não a vaga: duas
      // vagas da mesma empresa vinham com o mesmo valor. O número do anúncio na
      // URL (/jobs/33384-...) é o que de fato é único.
      idExterno: (j._url.match(/\/jobs\/(\d+)/) || [null, j._url])[1],
      // O título do board carrega marcações como "#Júnior #Back-End".
      titulo: (j.title || '').replace(/\s*#\S+/g, '').trim(),
      empresa: j.hiringOrganization?.name || '',
      local: local || 'Brasil',
      modalidadeBruta: j.jobLocationType === 'TELECOMMUTE' ? 'remoto' : '',
      tipoContrato: j.employmentType || '',
      salario: j.baseSalary?.value?.value ? String(j.baseSalary.value.value) : '',
      url: j._url,
      publicadoEm: (j.datePosted || '').slice(0, 10),
      tags: [],
      texto: htmlParaTexto(j.description),
    };
  });
}

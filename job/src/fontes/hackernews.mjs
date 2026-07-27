import { buscarJSON, dormir } from '../lib/http.mjs';
import { htmlParaTexto } from '../lib/texto.mjs';

export const id = 'hackernews';
export const nome = 'Hacker News — "Who is hiring?"';
export const site = 'https://news.ycombinator.com';
export const escopo =
  'Global — anúncio escrito pela própria engenharia, sem template de RH';

// Nas threads "Who is hiring?" o padrão de fato é a primeira linha no formato
// "Empresa | Cargo | Local | REMOTE | Faixa". Só comentários de primeiro nível
// são anúncios; o resto é discussão.
// O cabeçalho do "Who is hiring?" é convenção, não formato: a maioria escreve
// "Empresa | Cargo | Local", mas muita gente começa pelo cargo, mete a URL no
// meio ou não põe quebra de linha nenhuma — o post inteiro vira um parágrafo.
// Em vez de confiar na posição, procuramos o campo que PARECE cargo.
const PADRAO_CARGO =
  /\b(engineers?|engineering|developers?|programmers?|scientists?|architects?|sre|devops|designers?|analysts?|interns?|founding|full[ -]?stack|back[ -]?end|front[ -]?end|mobile|ios|android|infra(structure)?|platform|security|data|ml|ai|qa|tech lead|team lead|cto|head of|vp of)\b/i;
const PADRAO_URL = /^(https?:\/\/|www\.)|\.(com|io|ai|dev|co|org|net|app|xyz)\b/i;

function separarCabecalho(texto) {
  const primeiraLinha = (texto.split('\n').find((l) => l.trim()) || '').trim();
  const partes = primeiraLinha
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (partes.length >= 2) {
    const ehCargo = (s) => PADRAO_CARGO.test(s) && !PADRAO_URL.test(s);
    let idxCargo = partes.findIndex((p, i) => i > 0 && ehCargo(p));
    let empresa = partes[0];

    if (idxCargo === -1 && ehCargo(partes[0])) {
      // Anúncio que abre pelo cargo e não nomeia a empresa no cabeçalho.
      idxCargo = 0;
      empresa = '';
    } else if (idxCargo === -1) {
      // Nenhum campo parece cargo (costuma estar só no corpo do anúncio):
      // fica o primeiro campo que ao menos não seja um link.
      const idxNaoUrl = partes.findIndex((p, i) => i > 0 && !PADRAO_URL.test(p));
      idxCargo = idxNaoUrl === -1 ? 1 : idxNaoUrl;
    }

    const local = partes
      .filter((p, i) => i !== 0 && i !== idxCargo && !PADRAO_URL.test(p))
      .join(' | ');

    return {
      empresa: (empresa || 'Empresa não identificada').slice(0, 80),
      titulo: partes[idxCargo].slice(0, 110),
      local: local.slice(0, 110) || 'Não informado',
      cabecalho: partes.join(' | ').slice(0, 300),
    };
  }

  // Sem barras: o melhor palpite é a primeira frase.
  const frase = primeiraLinha.split(/(?<=[.:;–—-])\s/)[0] || primeiraLinha;
  return {
    empresa: frase.slice(0, 80),
    titulo: frase.slice(0, 110),
    local: 'Não informado',
    cabecalho: primeiraLinha.slice(0, 300),
  };
}

export async function coletar({ quota = 300, threads = [], log }) {
  const brutos = [];

  for (const thread of threads) {
    for (let pagina = 0; pagina < 8; pagina++) {
      const url =
        `https://hn.algolia.com/api/v1/search?tags=comment,story_${thread}` +
        `&hitsPerPage=100&page=${pagina}`;
      const dados = await buscarJSON(url);
      const hits = (dados.hits || []).filter(
        (h) => String(h.parent_id) === String(h.story_id) && h.comment_text
      );
      brutos.push(...hits.map((h) => ({ ...h, _thread: thread })));
      if (pagina + 1 >= (dados.nbPages || 1)) break;
      await dormir(500);
    }
    log(`thread ${thread}: acumulado ${brutos.length} anúncios de topo`);
    if (brutos.length >= quota * 1.5) break;
  }

  return { brutos, vagas: normalizar(brutos) };
}

export function normalizar(brutos) {
  return brutos.map((h) => {
    const texto = htmlParaTexto(h.comment_text);
    const { empresa, titulo, local, cabecalho } = separarCabecalho(texto);
    return {
      fonte: id,
      idExterno: String(h.objectID),
      titulo,
      empresa,
      local,
      modalidadeBruta: /\bremote\b/i.test(cabecalho) ? 'remoto' : '',
      tipoContrato: '',
      salario: '',
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      publicadoEm: (h.created_at || '').slice(0, 10),
      tags: [`thread:${h._thread}`],
      texto,
    };
  });
}

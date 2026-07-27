// Utilidades de texto: HTML -> texto puro, normalização para busca por padrões
// e hash de deduplicação.

import { createHash } from 'node:crypto';

const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  '#39': "'", '#039': "'", '#x27': "'", '#x2F': '/', '#47': '/',
  '#x60': '`', '#x3D': '=', hellip: '…', mdash: '—', ndash: '–',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', bull: '•',
  eacute: 'é', ccedil: 'ç', atilde: 'ã', otilde: 'õ', aacute: 'á',
  oacute: 'ó', iacute: 'í', uacute: 'ú', ecirc: 'ê', ocirc: 'ô',
  acirc: 'â', agrave: 'à',
};

export function decodificarEntidades(s) {
  return s
    .replace(/&([a-zA-Z]+|#x?[0-9a-fA-F]+);/g, (todo, ent) => {
      if (ENTIDADES[ent] !== undefined) return ENTIDADES[ent];
      if (/^#x/i.test(ent)) {
        const cod = parseInt(ent.slice(2), 16);
        return Number.isFinite(cod) ? String.fromCodePoint(cod) : todo;
      }
      if (/^#/.test(ent)) {
        const cod = parseInt(ent.slice(1), 10);
        return Number.isFinite(cod) ? String.fromCodePoint(cod) : todo;
      }
      return todo;
    })
    .replace(/ /g, ' ');
}

export function htmlParaTexto(html) {
  if (!html) return '';
  return decodificarEntidades(
    String(html)
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\s*\/\s*(p|div|li|tr|h[1-6]|ul|ol|section)\s*>/gi, '\n')
      .replace(/<\s*li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t ​]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Texto usado pelos padrões da taxonomia: minúsculas, sem acento, sem
// pontuação exótica. Assim um único padrão pega "comunicação" e "comunicacao".
export function normalizarParaBusca(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[^\S\n]+/g, ' ');
}

export function hash(texto, tamanho = 12) {
  return createHash('sha1').update(String(texto)).digest('hex').slice(0, tamanho);
}

// Assinatura para deduplicação: título + empresa reduzidos ao essencial.
export function assinatura(titulo, empresa) {
  const t = normalizarParaBusca(titulo)
    .replace(/\b(sr|jr|senior|junior|pleno|mid|level|i{1,3}|iv|v)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const e = normalizarParaBusca(empresa).replace(/[^a-z0-9]+/g, ' ').trim();
  return hash(`${e}::${t}`);
}

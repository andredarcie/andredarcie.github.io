// Resolve nomes do jeito do RGSS (Windows): sem distinção de maiúsculas, com
// "\" ou "/", e sem extensão ("Graphics/Characters/$Brian" → ".png").
// O índice vem de arquivos.json, gerado por ferramentas/montar-web.mjs.

export const RAIZ = '../projeto/';

const porNome = new Map(); // "graphics/characters/$brian.png" → caminho real

export async function carregarIndice(build) {
  const lista = await (await fetch(`arquivos.json?v=${build}`)).json();
  for (const real of lista) porNome.set(real.toLowerCase(), real);
  return lista;
}

export function normalizar(caminho) {
  return String(caminho).replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/{2,}/g, '/');
}

// Devolve o caminho real ou null.
export function resolver(caminho, extensoes = []) {
  const base = normalizar(caminho).toLowerCase();
  if (porNome.has(base)) return porNome.get(base);
  for (const ext of extensoes) {
    const comExt = base + ext;
    if (porNome.has(comExt)) return porNome.get(comExt);
  }
  return null;
}

export function url(real) {
  return RAIZ + real.split('/').map(encodeURIComponent).join('/');
}

export function listar(prefixo) {
  const p = prefixo.toLowerCase();
  return [...porNome.entries()].filter(([k]) => k.startsWith(p)).map(([, v]) => v);
}

// Carregamento de imagens. Os nomes seguem assets/: 'tiles/iB', 'chars/r0305', 'pics/carta'.
const cache = new Map();
const VERSAO = new URL(import.meta.url).searchParams.get('v') || '0';

export function img(nome) {
  const i = cache.get(nome);
  if (!i) throw new Error('imagem não carregada: ' + nome);
  return i;
}

export function carregar(nomes, aoProgresso) {
  let feitas = 0;
  return Promise.all(nomes.map((nome) => new Promise((ok, falha) => {
    if (cache.has(nome)) { ok(); return; }
    const i = new Image();
    i.onload = () => { cache.set(nome, i); feitas++; aoProgresso?.(feitas / nomes.length); ok(); };
    i.onerror = () => falha(new Error('falhou: ' + nome));
    i.src = `assets/${nome}.png?v=${VERSAO}`;
  })));
}

// Canvas auxiliar.
export function tela(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Gancho de resolução do Node para rodar fora do navegador o que usa o
// import map da página: 'rb' → web/src/rb/rb.js.
// Uso: import { register } from 'node:module'; register('./resolver-rb.mjs', import.meta.url);
export async function resolve(especificador, contexto, proximo) {
  if (especificador === 'rb') return { url: new URL('../web/src/rb/rb.js', import.meta.url).href, shortCircuit: true };
  return proximo(especificador, contexto);
}

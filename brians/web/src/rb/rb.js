// O "rb" do código traduzido (import * as rb from 'rb', resolvido pelo import
// map): a semântica do Ruby que o JS não tem igual. Junta, num nome só:
//   nucleo.js     verdade, divisão/módulo, round, rand com semente, RbHash, Symbol
//   objeto.js     classes, reabertura, alias, include, módulos, fora do escopo
//   biblioteca.js métodos de Array/Hash/String/número/Range e o despacho
//   io.js         File, Dir, Time, Marshal sobre arquivo, load_data, print
// Ver README.md.
export * from './nucleo.js';
export * from './objeto.js';
export * from './biblioteca.js';
export * from './io.js';
// nomes que o núcleo também tem: valem os da biblioteca (que despacham para
// objetos e tratam Float na divisão)
export { div, to_i, to_f, round, compact } from './biblioteca.js';

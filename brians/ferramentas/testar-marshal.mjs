// Etapa 1 da fase 3: o Marshal em JS (web/src/rb/marshal.js) lê e grava de
// volta EXATAMENTE os mesmos bytes de todos os .rvdata originais e do
// ks_checkpoint de 2014. Qualquer byte diferente é falha, com o contexto.
// Uso: node ferramentas/testar-marshal.mjs   (a partir de brians/)
import fs from 'node:fs';
import path from 'node:path';
import { loadTodos, dumpTodos, FLOATS } from '../web/src/rb/marshal.js';
import { RbHash } from '../web/src/rb/rb.js';
import { Table, Color, Tone } from '../web/src/rb/tipos.js';
import { carregar as carregarAntigo } from './marshal.mjs';

const PROJETO = path.resolve('projeto');
const arquivos = [
  ...fs.readdirSync(path.join(PROJETO, 'Data')).filter((f) => f.endsWith('.rvdata')).map((f) => `Data/${f}`),
  'ks_checkpoint',
];

// Precisão do texto do Float: descobre pelos próprios dados qual o RGSS usou.
const OPCOES = { digitosFloat: 17, mantissa: true };

let falhas = 0;
const contagem = { floats: 0, floatsInteiros: 0, objetos: 0, tables: 0, colors: 0, tones: 0 };

for (const nome of arquivos) {
  const original = new Uint8Array(fs.readFileSync(path.join(PROJETO, nome)));
  let valores, gravado;
  try {
    valores = loadTodos(original);
    gravado = dumpTodos(valores, OPCOES);
  } catch (e) {
    console.log(`FALHA ${nome}: ${e.stack}`);
    falhas++;
    continue;
  }
  contar(valores);
  const i = primeiraDiferenca(original, gravado);
  if (i < 0) { console.log(`ok    ${nome} (${original.length} bytes, ${valores.length} dump${valores.length > 1 ? 's' : ''})`); continue; }
  falhas++;
  const trecho = (b) => [...b.subarray(Math.max(0, i - 24), i + 24)].map((x) => x.toString(16).padStart(2, '0')).join(' ');
  console.log(`FALHA ${nome}: primeiro byte diferente em ${i} (original ${original.length}, gravado ${gravado.length})`);
  console.log(`  original: ${trecho(original)}`);
  console.log(`  gravado:  ${trecho(gravado)}`);
}

// Bytes iguais não bastam: um erro simétrico (ler e gravar errado do mesmo
// jeito) passaria. Então o conteúdo lido é comparado com o leitor antigo
// (ferramentas/marshal.mjs), que é uma implementação independente.
for (const nome of arquivos.filter((n) => n.startsWith('Data/'))) {
  const b = fs.readFileSync(path.join(PROJETO, nome));
  const diferenca = comparar(paraArvore(loadTodos(new Uint8Array(b))[0]), carregarAntigo(b), nome);
  if (diferenca) { falhas++; console.log(`FALHA ${nome}: conteúdo difere do leitor antigo em ${diferenca}`); }
}
console.log('conteúdo dos .rvdata conferido com o leitor antigo');

console.log(`\nconteúdo visto: ${JSON.stringify(contagem)}`);
console.log(falhas ? `\n${falhas} arquivo(s) com diferença` : `\ntodos os ${arquivos.length} arquivos voltam byte a byte`);
process.exitCode = falhas ? 1 : 0;

// Modelo novo → árvore no formato do leitor antigo.
function paraArvore(x, vistos = new Map()) {
  if (x === null || typeof x === 'boolean' || typeof x === 'string') return x;
  if (typeof x === 'number') return x;
  if (typeof x === 'bigint') return Number(x);
  if (typeof x === 'symbol') return { '@sym': Symbol.keyFor(x) };
  if (x instanceof Uint8Array) return { '@bytes': Buffer.from(x).toString('base64') };
  if (vistos.has(x)) return vistos.get(x);
  if (x instanceof Table) return { '@class': 'Table', dim: x.dim, xsize: x.xsize, ysize: x.ysize, zsize: x.zsize, data: [...x.data] };
  if (x instanceof Color) return { '@class': 'Color', red: x.red, green: x.green, blue: x.blue, alpha: x.alpha };
  if (x instanceof Tone) return { '@class': 'Tone', red: x.red, green: x.green, blue: x.blue, gray: x.gray };
  if (Array.isArray(x)) {
    const a = []; vistos.set(x, a);
    x.forEach((y, i) => a.push(x[FLOATS]?.has(i) ? { '@float': y } : paraArvore(y, vistos)));
    return a;
  }
  if (x instanceof RbHash) {
    const h = { '@hash': [] }; vistos.set(x, h);
    for (const [k, y] of x.entries()) h['@hash'].push([paraArvore(k, vistos), x[FLOATS]?.has(k) ? { '@float': y } : paraArvore(y, vistos)]);
    if (x.padrao !== null) h['@default'] = paraArvore(x.padrao, vistos);
    return h;
  }
  const o = { '@class': x.constructor.rubyName }; vistos.set(x, o);
  for (const k of Object.keys(x)) o[`@${k.slice(1)}`] = x[FLOATS]?.has(k) ? { '@float': x[k] } : paraArvore(x[k], vistos);
  return o;
}

// O leitor antigo devolve todo Float como {'@float': v} e sem a mantissa do
// 1.8 (só o texto): aceita diferença na última casa.
function comparar(a, b, onde, vistos = new Set()) {
  if (a && typeof a === 'object' && '@float' in a) a = a['@float'];
  if (b && typeof b === 'object' && '@float' in b) b = b['@float'];
  if (typeof a === 'number' && typeof b === 'number') {
    return a === b || Math.abs(a - b) <= Math.abs(b) * 1e-15 ? null : `${onde} (${a} ≠ ${b})`;
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b ? null : `${onde} (${JSON.stringify(a)} ≠ ${JSON.stringify(b)})`;
  if (vistos.has(a)) return null;
  vistos.add(a);
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return `${onde} (campos ${ka} ≠ ${kb})`;
  for (const k of ka) {
    const d = comparar(a[k], b[k], `${onde}.${k}`, vistos);
    if (d) return d;
  }
  return null;
}

function primeiraDiferenca(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}

function contar(raiz) {
  const vistos = new Set();
  (function andar(x) {
    if (x === null || typeof x !== 'object' || vistos.has(x)) return;
    vistos.add(x);
    if (x instanceof Table) { contagem.tables++; return; }
    if (x instanceof Color) { contagem.colors++; return; }
    if (x instanceof Tone) { contagem.tones++; return; }
    if (x[FLOATS]) contagem.floatsInteiros += x[FLOATS].size;
    const filhos = x instanceof RbHash ? x.entries().flat() : Array.isArray(x) ? x : Object.values(x);
    if (!Array.isArray(x) && !(x instanceof RbHash)) contagem.objetos++;
    for (const y of filhos) {
      if (typeof y === 'number' && !Number.isInteger(y)) contagem.floats++;
      andar(y);
    }
  })(raiz);
}

// Núcleo da semântica do Ruby (1.8, a do RGSS2) que o JS não tem igual. A tradução dos
// scripts usa estas funções em toda operação em que a diferença importa,
// nunca o operador do JS "de cabeça" (ver README.md).

// ------------------------------------------------------------------ verdade
// Em Ruby só nil e false são falsos: 0, "" e [] são verdadeiros.
export const v = (x) => x !== null && x !== false && x !== undefined;

// ------------------------------------------------------------------ números
// Fixnum do Ruby 1.8 de 32 bits (o RGSS200E): 31 bits com sinal.
export const FIXNUM_MIN = -(2 ** 30), FIXNUM_MAX = 2 ** 30 - 1;

export class ZeroDivisionError extends Error {
  constructor() { super('divided by 0'); this.name = 'ZeroDivisionError'; }
}

// Integer#/: arredonda para baixo (-7 / 2 == -4). Só para inteiros; divisão
// com Float é o "/" do JS.
export function div(a, b) {
  if (b === 0) throw new ZeroDivisionError();
  return Math.floor(a / b);
}

// Integer#% e Float#%: o resultado tem o sinal do divisor (-7 % 3 == 2).
export function mod(a, b) {
  if (b === 0 && Number.isInteger(a)) throw new ZeroDivisionError();
  const r = a % b;
  return (r !== 0 && (r < 0) !== (b < 0) ? r + b : r) + 0;   // + 0: sem -0
}

// Integer#divmod
export const divmod = (a, b) => [div(a, b), mod(a, b)];

// Float#round: metade para longe do zero (-2.5.round == -3; Math.round dá -2).
export function round(x, casas = 0) {
  if (casas === 0) return Math.sign(x) * Math.round(Math.abs(x)) + 0;
  const f = 10 ** casas;
  return Math.sign(x) * Math.round(Math.abs(x) * f) / f + 0;
}

// Float#to_i / Float#truncate: corta a parte fracionária (-2.7 → -2).
export const trunc = (x) => Math.trunc(x) + 0;

// String#to_i / to_f: lê o prefixo numérico, o resto é ignorado ("12px" → 12, "x" → 0).
export function to_i(x) {
  if (typeof x === 'number') return trunc(x);
  if (x === null) return 0;
  const m = /^\s*([+-]?\d[\d_]*)/.exec(String(x));
  return m ? parseInt(m[1].replace(/_/g, ''), 10) : 0;
}
export function to_f(x) {
  if (typeof x === 'number') return x;
  if (x === null) return 0;
  const m = /^\s*([+-]?\d[\d_]*(\.\d+)?([eE][+-]?\d+)?)/.exec(String(x));
  return m ? parseFloat(m[1].replace(/_/g, '')) : 0;
}

// Comparable#between? e o clamp idiomático do RGSS ([[x, a].max, b].min).
export const limitar = (x, min, max) => Math.min(Math.max(x, min), max);

// ------------------------------------------------------------------ rand
// Um gerador só, com semente, para as duas versões (Ruby e JS) tirarem os
// mesmos números no modo determinístico. xoshiro128** (32 bits).
let s0, s1, s2, s3;
function prox32() {
  const r = Math.imul(rotl(Math.imul(s1, 5), 7), 9);
  const t = s1 << 9;
  s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3;
  s2 ^= t; s3 = rotl(s3, 11);
  return r >>> 0;
}
const rotl = (x, k) => (x << k) | (x >>> (32 - k));

// srand(n): devolve a semente anterior, como no Ruby.
let sementeAtual = 0;
export function srand(semente = (Math.random() * 2 ** 32) >>> 0) {
  const anterior = sementeAtual;
  sementeAtual = semente >>> 0;
  // splitmix32 espalha a semente pelos 4 estados
  let z = sementeAtual;
  const mix = () => {
    z = (z + 0x9E3779B9) | 0;
    let t = z ^ (z >>> 16); t = Math.imul(t, 0x21F0AAAD);
    t ^= t >>> 15; t = Math.imul(t, 0x735A2D97);
    return (t ^ (t >>> 15)) >>> 0;
  };
  s0 = mix(); s1 = mix(); s2 = mix(); s3 = mix();
  return anterior;
}
srand();

// Float em [0, 1) com 53 bits, como o Ruby.
function aleatorio() {
  const a = prox32() >>> 5, b = prox32() >>> 6;
  return (a * 67108864 + b) / 9007199254740992;
}

// Kernel#rand do Ruby 1.8: rand / rand(0) → Float em [0, 1);
// rand(n) → inteiro em [0, |n|) (n Float é truncado; rand(1.5) == rand(1)).
export function rand(max = 0) {
  const n = Math.trunc(Math.abs(max === null ? 0 : max));
  if (n === 0) return aleatorio();
  return Math.floor(aleatorio() * n);
}

// ------------------------------------------------------------------ Array
// a[i]: índice negativo conta do fim; fora do array é nil.
export function at(a, i) {
  if (i < 0) i += a.length;
  return i >= 0 && i < a.length ? a[i] : null;
}

// a[i] = x: além do fim, completa com nil.
export function aset(a, i, x) {
  if (i < 0) {
    i += a.length;
    if (i < 0) throw new RangeError(`index ${i - a.length} too small for array`);
  }
  while (a.length < i) a.push(null);
  a[i] = x;
  return x;
}

// Array#compact, nitems (1.8), include?, delete
export const compact = (a) => a.filter((x) => x !== null);
export const nitems = (a) => compact(a).length;

// ------------------------------------------------------------------ Hash
// Hash do Ruby: ordem de inserção, valor padrão e chave por conteúdo para
// Array e String (eql?): $game_self_switches[[map_id, event_id, "A"]].
// Outros objetos são chave por identidade, como no Ruby.
export class RbHash {
  constructor(padrao = null, blocoPadrao = null) {
    this.mapa = new Map();      // chave normalizada → [chave original, valor]
    this.padrao = padrao;       // Hash.new(x)
    this.blocoPadrao = blocoPadrao; // Hash.new { |h, k| … }
  }

  static de(pares) {
    const h = new RbHash();
    for (const [k, x] of pares) h.set(k, x);
    return h;
  }

  get size() { return this.mapa.size; }

  // h[k]
  get(k) {
    const par = this.mapa.get(chave(k));
    if (par) return par[1];
    return this.blocoPadrao ? this.blocoPadrao(this, k) : this.padrao;
  }

  // h[k] = x. A chave guardada é a primeira inserida (como o Ruby).
  set(k, x) {
    const c = chave(k);
    const par = this.mapa.get(c);
    if (par) par[1] = x;
    else this.mapa.set(c, [k, x]);
    return x;
  }

  has(k) { return this.mapa.has(chave(k)); }   // has_key? / include?

  delete(k) {
    const c = chave(k);
    const par = this.mapa.get(c);
    if (!par) return null;
    this.mapa.delete(c);
    return par[1];
  }

  clear() { this.mapa.clear(); return this; }
  keys() { return [...this.mapa.values()].map((p) => p[0]); }
  values() { return [...this.mapa.values()].map((p) => p[1]); }
  entries() { return [...this.mapa.values()].map((p) => [p[0], p[1]]); }  // to_a
  each(f) { for (const [k, x] of this.entries()) f(k, x); return this; }
  [Symbol.iterator]() { return this.entries()[Symbol.iterator](); }
}

// Chave normalizada: primitivos por valor (1 e "1" são chaves diferentes,
// como no Ruby), Array por conteúdo, o resto por identidade.
function chave(k) {
  if (Array.isArray(k)) return `\u0000[${k.map(chaveTexto).join('\u0001')}]`;
  return k;
}
const idsObjetos = new WeakMap();
let proximoId = 1;
function chaveTexto(k) {
  if (k === null) return 'n';
  if (Array.isArray(k)) return chave(k);
  switch (typeof k) {
    case 'number': return `i${k}`;
    case 'string': return `s${k.length}:${k}`;
    case 'boolean': return k ? 't' : 'f';
    case 'symbol': return `y${Symbol.keyFor(k)}`;
    default:
      if (!idsObjetos.has(k)) idsObjetos.set(k, proximoId++);
      return `o${idsObjetos.get(k)}`;
  }
}

// ------------------------------------------------------------------ Symbol
// :nome do Ruby → Symbol.for("nome") (mesma identidade em todo lugar).
export const sym = (nome) => Symbol.for(nome);
export const symNome = (s) => Symbol.keyFor(s);

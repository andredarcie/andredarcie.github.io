// Os métodos de Array, Hash, String, número e Range que o código traduzido
// chama como rb.nome(obj, …) (ver as convenções no README.md).
//
// Regra geral: para Array, RbHash, String, número, nil e Range vale a
// implementação do Ruby 1.8; qualquer outro objeto despacha para o método JS
// de mesmo nome (rb.clear chama Bitmap#clear, Game_Message#clear…). Se o
// objeto não tem o método, o erro é o NoMethodError do Ruby, não um
// undefined silencioso.
import { v, div as divInteira, round, trunc, to_i, to_f, at, aset, RbHash, ZeroDivisionError, symNome } from './nucleo.js';
import { FLOATS } from './marshal.js';

// ------------------------------------------------------------------ erros
// Os nomes são os do Ruby: o rescue do código traduzido testa com rb.is_a.
export class StandardError extends Error {
  constructor(msg) { super(msg ?? new.target.name); this.name = new.target.name; }
}
export class RuntimeError extends StandardError {}
export class TypeError_ extends StandardError {}
export class ArgumentError extends StandardError {}
export class NoMethodError extends StandardError {}
export class IndexError extends StandardError {}
export class RangeError_ extends StandardError {}
export class SystemExit extends Error {
  constructor() { super('exit'); this.name = 'SystemExit'; }
}
Object.defineProperty(TypeError_, 'name', { value: 'TypeError' });
Object.defineProperty(RangeError_, 'name', { value: 'RangeError' });
export { TypeError_ as TypeError, RangeError_ as RangeError, ZeroDivisionError };
export const Exception = Error;

// ------------------------------------------------------------------ tipos
export class Range {
  constructor(first, last, excluiFim = false) { this.first = first; this.last = last; this.excluiFim = excluiFim; }

  get begin() { return this.first; }
  get end() { return this.last; }
  exclude_end_p() { return this.excluiFim; }

  include_p(x) {
    if (typeof x !== 'number') return false;
    return x >= this.first && (this.excluiFim ? x < this.last : x <= this.last);
  }

  * [Symbol.iterator]() {
    const fim = this.excluiFim ? this.last : this.last + 1;
    for (let i = this.first; i < fim; i++) yield i;
  }

  to_a() { return [...this]; }
  get size() { return Math.max(0, (this.excluiFim ? this.last : this.last + 1) - this.first); }
}

// Fichas das classes embutidas, para is_a?/=== e Classe.new. Integer e Float
// também são as funções Kernel#Integer/Float (o Ruby usa o mesmo nome).
// O JS não separa 1 de 1.0: Integer é "número sem parte fracionária".
const ficha = (nome, teste) => Object.assign(Object.create(null), { __embutida: nome, teste });

export function Integer(x) {
  if (typeof x === 'number') {
    if (!Number.isFinite(x)) throw new FloatDomainError(String(x));
    return trunc(x);
  }
  if (typeof x === 'string') {
    // "0x1f", "0b101", "017" (octal) e decimal, com sinal e "_"
    const m = /^([+-]?)(?:0x([0-9a-f]+)|0b([01]+)|0o?([0-7]+)|(\d+))$/i.exec(x.trim().replace(/_/g, ''));
    if (!m) throw new ArgumentError(`invalid value for Integer: ${inspect(x)}`);
    const n = m[2] ? parseInt(m[2], 16) : m[3] ? parseInt(m[3], 2) : m[4] ? parseInt(m[4], 8) : parseInt(m[5], 10);
    return m[1] === '-' ? -n : n;
  }
  if (x === null) throw new TypeError_("can't convert nil into Integer");
  return chamar(x, 'to_i', []);
}
Integer.__embutida = 'Integer';
Integer.teste = (x) => typeof x === 'number' && Number.isInteger(x);

export function Float(x) {
  if (typeof x === 'number') return x;
  if (typeof x === 'string') {
    const t = x.trim().replace(/_/g, '');
    if (!/^[+-]?(\d+(\.\d+)?([eE][+-]?\d+)?)$/.test(t)) throw new ArgumentError(`invalid value for Float(): ${inspect(x)}`);
    return Number(t);
  }
  if (x === null) throw new TypeError_("can't convert nil into Float");
  return chamar(x, 'to_f', []);
}
Float.__embutida = 'Float';
Float.teste = (x) => typeof x === 'number' && !Number.isInteger(x);

class FloatDomainError extends RangeError_ {}

export const Fixnum = Integer;
export const Bignum = ficha('Bignum', (x) => typeof x === 'bigint');
export const Numeric = ficha('Numeric', (x) => typeof x === 'number' || typeof x === 'bigint');
export const String_ = ficha('String', (x) => typeof x === 'string');
export const Array_ = ficha('Array', (x) => Array.isArray(x));
export const Hash = ficha('Hash', (x) => x instanceof RbHash);
export const Symbol_ = ficha('Symbol', (x) => typeof x === 'symbol');
export const NilClass = ficha('NilClass', (x) => x === null || x === undefined);
export const TrueClass = ficha('TrueClass', (x) => x === true);
export const FalseClass = ficha('FalseClass', (x) => x === false);
export const Proc = ficha('Proc', (x) => typeof x === 'function');
export const Comparable = ficha('Comparable', (x) => typeof x === 'number' || typeof x === 'string');
export const Object_ = ficha('Object', () => true);
export const Kernel = Object_;
export { String_ as String, Array_ as Array, Symbol_ as Symbol, Object_ as Object };
export const Math_ = Math;
export { Math_ as Math };

const embutidos = (x) => x === null || x === undefined || typeof x !== 'object' || Array.isArray(x) || x instanceof RbHash || x instanceof Range;

// ------------------------------------------------------------------ despacho
// obj.nome(…) de um objeto do jogo ou da fachada: método, ou getter (attr)
// quando não há argumentos.
function chamar(obj, nome, args) {
  if (obj === null || obj === undefined) throw new NoMethodError(`undefined method \`${nome}' for nil:NilClass`);
  const m = obj[nome];
  if (typeof m === 'function') return m.apply(obj, args);
  if (m !== undefined && args.length === 0) return m;
  throw new NoMethodError(`undefined method \`${nome}' for ${inspect(obj)}`);
}

// Gera um rb.nome que trata os embutidos com `proprio` e despacha o resto.
// proprio devolve NADA quando o tipo não é dele.
const NADA = Symbol('nada');
function metodo(nome, proprio) {
  return (obj, ...args) => {
    if (embutidos(obj)) {
      const r = proprio(obj, ...args);
      if (r !== NADA) return r;
      if (obj !== null && obj !== undefined && typeof obj === 'object' && typeof obj[nome] === 'function') return obj[nome](...args);
      throw new NoMethodError(`undefined method \`${nome}' for ${inspect(obj)}`);
    }
    return chamar(obj, nome, args);
  };
}

// ------------------------------------------------------------------ texto
// String no Ruby 1.8 é bytes: size é em bytes (UTF-8), não em caracteres.
const utf8 = new TextEncoder();
const utf8Dec = new TextDecoder();
const SO_ASCII = /^[\x00-\x7f]*$/;
const bytesDe = (s) => utf8.encode(s).length;

// to_s do Ruby 1.8: nil → "", Array junta sem separador, Symbol → nome.
// O JS não guarda se o número é Float: 1.0 sai "1" (a única diferença).
export function str(x) {
  if (x === null || x === undefined) return '';
  switch (typeof x) {
    case 'string': return x;
    case 'number': return numeroTexto(x);
    case 'boolean': return String(x);
    case 'symbol': return symNome(x);
    case 'bigint': return String(x);
    case 'function': return '#<Proc>';
    default:
      if (Array.isArray(x)) return x.map(str).join('');
      if (x instanceof RbHash) return x.entries().map(([k, y]) => str(k) + str(y)).join('');
      if (x instanceof Range) return `${str(x.first)}${x.excluiFim ? '...' : '..'}${str(x.last)}`;
      if (typeof x.to_s === 'function') return x.to_s();
      return `#<${x.constructor?.rubyName ?? x.constructor?.name ?? 'Object'}>`;
  }
}
export const to_s = str;

function numeroTexto(x) {
  if (Number.isInteger(x)) return String(x);
  if (Number.isNaN(x)) return 'NaN';
  if (!Number.isFinite(x)) return x > 0 ? 'Infinity' : '-Infinity';
  const a = Math.abs(x);
  if (a >= 1e16 || a < 1e-4) return x.toExponential().replace(/e([+-])(\d)$/, 'e$10$2').replace(/^(-?\d)e/, '$1.0e');
  return String(x);
}

// inspect (p e mensagens de erro)
export function inspect(x) {
  if (x === null || x === undefined) return 'nil';
  if (typeof x === 'string') return JSON.stringify(x);
  if (typeof x === 'symbol') return `:${symNome(x)}`;
  if (Array.isArray(x)) return `[${x.map(inspect).join(', ')}]`;
  if (x instanceof RbHash) return `{${x.entries().map(([k, y]) => `${inspect(k)}=>${inspect(y)}`).join(', ')}}`;
  if (typeof x === 'object' && typeof x.inspect === 'function') return x.inspect();
  return str(x);
}

// sprintf / format: %d %i %s %f %x %X %o %b %c %e %g e %%, com flags
// (- + espaço 0), largura e precisão, inclusive "*".
export function sprintf(formato, ...args) {
  let i = 0;
  const prox = () => (i < args.length ? args[i++] : (() => { throw new ArgumentError('too few arguments'); })());
  return String(formato).replace(/%([-+ 0#]*)(\*|\d+)?(?:\.(\*|\d+))?([diuxXobBcsfeEgGp%])/g, (m, flags, larg, prec, tipo) => {
    if (tipo === '%') return '%';
    let largura = larg === '*' ? to_i(prox()) : larg ? Number(larg) : 0;
    let menos = flags.includes('-');
    if (largura < 0) { menos = true; largura = -largura; }
    const precisao = prec === '*' ? to_i(prox()) : prec !== undefined ? Number(prec) : null;
    const x = prox();
    let corpo, sinal = '';
    const numero = (n) => {
      if (n < 0) { sinal = '-'; return -n; }
      if (flags.includes('+')) sinal = '+'; else if (flags.includes(' ')) sinal = ' ';
      return n;
    };
    switch (tipo) {
      case 'd': case 'i': case 'u': corpo = String(numero(Integer(x))); break;
      case 'x': corpo = numero(Integer(x)).toString(16); break;
      case 'X': corpo = numero(Integer(x)).toString(16).toUpperCase(); break;
      case 'o': corpo = numero(Integer(x)).toString(8); break;
      case 'b': case 'B': corpo = numero(Integer(x)).toString(2); break;
      case 'f': corpo = numero(Float(x)).toFixed(precisao ?? 6); break;
      case 'e': case 'E': corpo = numero(Float(x)).toExponential(precisao ?? 6).replace(/e([+-])(\d)$/, 'e$10$2'); if (tipo === 'E') corpo = corpo.toUpperCase(); break;
      case 'g': case 'G': corpo = String(Number(numero(Float(x)).toPrecision(precisao || 6))); break;
      case 'c': corpo = typeof x === 'number' ? String.fromCodePoint(x) : str(x).slice(0, 1); break;
      case 'p': corpo = inspect(x); break;
      default: corpo = str(x); if (precisao !== null) corpo = corpo.slice(0, precisao);
    }
    if ('diuxXobB'.includes(tipo) && precisao !== null) corpo = corpo.padStart(precisao, '0');
    const zeros = flags.includes('0') && !menos && 'diuxXobBfeEgG'.includes(tipo);
    if (zeros) return sinal + corpo.padStart(largura - sinal.length, '0');
    const tudo = sinal + corpo;
    return menos ? tudo.padEnd(largura) : tudo.padStart(largura);
  });
}

// $~ e $1…$9: o último casamento de regex (sub, gsub, slice!, =~, ===).
let ultimoCasamento = null;
export function ultimo(n) {
  if (!ultimoCasamento) return null;
  const x = ultimoCasamento[n];
  return x === undefined ? null : x;
}
export const casamento = () => ultimoCasamento;

const global = (re) => new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
const umaVez = (re) => new RegExp(re.source, re.flags.replace('g', ''));
const literal = (s) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

// troca no estilo do Ruby: \0 \& (tudo), \1…\9, \\ ; bloco recebe o texto
// casado e lê os grupos por rb.ultimo
function troca(m, subst) {
  ultimoCasamento = m;
  if (typeof subst === 'function') return str(subst(m[0]));
  return String(subst).replace(/\\(\d|&|\\)/g, (x, c) => (c === '\\' ? '\\' : c === '&' ? m[0] : m[Number(c)] ?? ''));
}

function substituir(s, padrao, subst, todas) {
  const re = typeof padrao === 'string' ? literal(padrao) : padrao;
  let saida = '', pos = 0, achou = false;
  if (!todas) {
    const m = umaVez(re).exec(s);
    if (!m) return { texto: s, achou: false };
    ultimoCasamento = m;
    return { texto: s.slice(0, m.index) + troca(m, subst) + s.slice(m.index + m[0].length), achou: true };
  }
  const g = global(re);
  let m, final = null;
  while ((m = g.exec(s))) {
    achou = true;
    saida += s.slice(pos, m.index) + troca(m, subst);
    final = m;
    pos = m.index + m[0].length;
    if (m[0].length === 0) {
      if (g.lastIndex >= s.length) break;
      saida += s[g.lastIndex];
      pos = ++g.lastIndex;
    }
  }
  ultimoCasamento = final;
  return { texto: achou ? saida + s.slice(pos) : s, achou };
}

// String#sub / gsub (devolvem texto novo). rb.sub também é o "-" binário:
// String - x não existe no Ruby, então texto aqui é sempre String#sub.
export const gsub = metodo('gsub', (s, padrao, subst) => (typeof s === 'string' ? substituir(s, padrao, subst, true).texto : NADA));
// Os "!": o tradutor reatribui (this._text = rb.gsub_inplace(this._text, …)).
export const gsub_inplace = (s, padrao, subst) => substituir(s, padrao, subst, true).texto;
export const sub_inplace = (s, padrao, subst) => substituir(s, padrao, subst, false).texto;

// c = @text.slice!(/./m): tira o primeiro casamento, devolve o pedaço (ou nil)
// e entrega o texto novo ao setter
export function slice_bang(s, padrao, ...resto) {
  const setter = resto.pop();
  const re = typeof padrao === 'string' ? literal(padrao) : padrao;
  const m = umaVez(re).exec(s);
  ultimoCasamento = m;
  if (!m) return null;
  setter(s.slice(0, m.index) + s.slice(m.index + m[0].length));
  return m[0];
}

// String#split: sem argumento ou " " separa por espaços (ignorando os do
// começo); vazios do fim saem; com limite, para no limite.
export const split = metodo('split', (s, sep = null, limite = 0) => {
  if (typeof s !== 'string') return NADA;
  let partes;
  if (sep === null || sep === ' ') {
    const t = s.replace(/^\s+/, '');
    partes = t === '' ? [] : t.split(/\s+/);
  } else if (sep instanceof RegExp) partes = s.split(new RegExp(sep.source, sep.flags.replace('g', '')));
  else if (sep === '') partes = [...s];
  else partes = s.split(sep);
  if (limite > 0 && partes.length > limite) {
    const sepTxt = sep === null || sep === ' ' ? null : sep;
    if (typeof sepTxt === 'string') partes = [...partes.slice(0, limite - 1), partes.slice(limite - 1).join(sepTxt)];
  }
  if (limite === 0) while (partes.length && partes[partes.length - 1] === '') partes.pop();
  return partes;
});

export const center = metodo('center', (s, largura, enchimento = ' ') => {
  if (typeof s !== 'string') return NADA;
  const falta = largura - [...s].length;
  if (falta <= 0) return s;
  const esq = Math.floor(falta / 2);
  const encher = (n) => enchimento.repeat(Math.ceil(n / enchimento.length)).slice(0, n);
  return encher(esq) + s + encher(falta - esq);
});

// ------------------------------------------------------------------ operadores
const num = (x) => typeof x === 'number';

export function add(a, b) {
  if (num(a) && num(b)) return a + b;
  if (typeof a === 'string') {
    if (typeof b !== 'string') throw new TypeError_(`can't convert ${classeDe(b)} into String`);
    return a + b;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) throw new TypeError_(`can't convert ${classeDe(b)} into Array`);
    return [...a, ...b];
  }
  if (num(a)) throw new TypeError_(`${classeDe(b)} can't be coerced into ${classeDe(a)}`);
  return chamar(a, 'add', [b]);
}

// "-" binário e String#sub (o tradutor usa o mesmo nome para os dois)
export function sub(a, ...args) {
  if (typeof a === 'string') return substituir(a, args[0], args[1], false).texto;
  const b = args[0];
  if (num(a) && num(b)) return a - b;
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) throw new TypeError_(`can't convert ${classeDe(b)} into Array`);
    return a.filter((x) => !b.some((y) => eq(x, y)));
  }
  if (num(a)) throw new TypeError_(`${classeDe(b)} can't be coerced into ${classeDe(a)}`);
  return chamar(a, 'sub', args);
}

export function mul(a, b) {
  if (num(a) && num(b)) return a * b;
  if (typeof a === 'string') return a.repeat(Integer(b));
  if (Array.isArray(a)) {
    if (typeof b === 'string') return a.map(str).join(b);
    const saida = [];
    for (let i = 0; i < Integer(b); i++) saida.push(...a);
    return saida;
  }
  if (num(a)) throw new TypeError_(`${classeDe(b)} can't be coerced into ${classeDe(a)}`);
  return chamar(a, 'mul', [b]);
}

// "/" com tipo incerto: inteiro com inteiro arredonda para baixo; Float
// (número com parte fracionária) divide de verdade. Um Float de valor
// inteiro (100.0) cai na divisão inteira: são as divisões do relatório.
export function div(a, b) {
  if (num(a) && num(b)) return Number.isInteger(a) && Number.isInteger(b) ? divInteira(a, b) : a / b;
  return chamar(a, 'div', [b]);
}

// "&" fora de inteiros: true & x, false & x, nil & x
export function and(a, b) {
  if (num(a) && num(b)) return a & b;
  if (a === true) return v(b);
  if (a === false || a === null) return false;
  return chamar(a, 'and', [b]);
}
export function or(a, b) {
  if (num(a) && num(b)) return a | b;
  if (a === true) return true;
  if (a === false || a === null) return v(b);
  return chamar(a, 'or', [b]);
}

// a && b / a || b com valor (o segundo só é avaliado se precisar)
export const e = (a, b) => (v(a) ? b() : a);
export const ou = (a, b) => (v(a) ? a : b());

export const abs = metodo('abs', (x) => (num(x) ? Math.abs(x) + 0 : NADA));

// <=>: números, textos, arrays (posição a posição); nil se não comparáveis
export function cmp(a, b) {
  if (num(a) && num(b)) return a < b ? -1 : a > b ? 1 : a === b ? 0 : null;
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const c = cmp(a[i], b[i]);
      if (c !== 0) return c;
    }
    return a.length - b.length === 0 ? 0 : a.length < b.length ? -1 : 1;
  }
  if (a !== null && typeof a === 'object' && typeof a.cmp === 'function') return a.cmp(b);
  return null;
}
function comparar(a, b) {
  const c = cmp(a, b);
  if (c === null) throw new ArgumentError(`comparison of ${classeDe(a)} with ${inspect(b)} failed`);
  return c;
}

// ------------------------------------------------------------------ igualdade
// ==: Array e Hash por conteúdo, objeto com "==" próprio (eq), o resto por
// identidade. 1 == 1.0 é true (no JS também).
export function eq(a, b) {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return (a ?? null) === (b ?? null);
  if (num(a) || typeof a === 'string' || typeof a === 'boolean' || typeof a === 'symbol') return false;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => eq(x, b[i]));
  if (a instanceof RbHash) {
    if (!(b instanceof RbHash) || a.size !== b.size) return false;
    return a.entries().every(([k, x]) => b.has(k) && eq(x, b.get(k)));
  }
  if (a instanceof Range) return b instanceof Range && a.first === b.first && a.last === b.last && a.excluiFim === b.excluiFim;
  if (typeof a.eq === 'function') return v(a.eq(b));
  return false;
}

// ===: classe → is_a?, Range → include?, Regexp → casa, senão ==
export function caseEq(padrao, x) {
  if (padrao instanceof RegExp) {
    if (typeof x !== 'string') return false;
    ultimoCasamento = umaVez(padrao).exec(x);
    return ultimoCasamento !== null;
  }
  if (padrao instanceof Range) return padrao.include_p(x);
  if (ehClasse(padrao)) return is_a_p(x, padrao);
  if (padrao !== null && typeof padrao === 'object' && typeof padrao.caseEq === 'function') return v(padrao.caseEq(x));
  return eq(padrao, x);
}

// =~: posição do casamento ou nil
export function casa(s, re) {
  if (typeof s !== 'string') { [s, re] = [re, s]; }
  if (typeof s !== 'string') return null;
  ultimoCasamento = umaVez(re).exec(s);
  return ultimoCasamento ? ultimoCasamento.index : null;
}

// ------------------------------------------------------------------ classes
const ehClasse = (C) => typeof C === 'function' || (C !== null && typeof C === 'object' && (C.__embutida || C.__modulo));

export function is_a_p(x, C) {
  if (C === null || C === undefined) throw new TypeError_('class or module required');
  if (C.__embutida) return C.teste(x);
  if (C === Range) return x instanceof Range;
  if (C.__modulo) {
    for (let K = x?.constructor; K; K = Object.getPrototypeOf(K)) if (Object.prototype.hasOwnProperty.call(K, '__modulos') && K.__modulos.includes(C)) return true;
    return false;
  }
  if (typeof C === 'function') return x !== null && x !== undefined && typeof x === 'object' && x instanceof C;
  throw new TypeError_('class or module required');
}
export const is_a = is_a_p;          // no rescue
export const kind_of_p = is_a_p;

export function classeDe(x) {
  if (x === null || x === undefined) return 'NilClass';
  if (x === true) return 'TrueClass';
  if (x === false) return 'FalseClass';
  if (num(x)) return Number.isInteger(x) ? 'Fixnum' : 'Float';
  if (typeof x === 'string') return 'String';
  if (typeof x === 'symbol') return 'Symbol';
  if (Array.isArray(x)) return 'Array';
  if (x instanceof RbHash) return 'Hash';
  if (x instanceof Range) return 'Range';
  if (typeof x === 'function') return 'Proc';
  return x.constructor?.rubyName ?? x.constructor?.name ?? 'Object';
}

// Classe.new das embutidas: Array.new(n, x) / Array.new(n) { |i| }, Hash.new(x) / Hash.new { |h, k| }
export function novo(C, ...args) {
  const bloco = typeof args[args.length - 1] === 'function' ? args.pop() : null;
  if (C === Array_) {
    const n = args.length ? Integer(args[0]) : 0;
    if (n < 0) throw new ArgumentError('negative array size');
    const a = new Array(n);
    for (let i = 0; i < n; i++) a[i] = bloco ? bloco(i) : args.length > 1 ? args[1] : null;
    return a;
  }
  if (C === Hash) return new RbHash(args.length ? args[0] : null, bloco);
  if (C === String_) return args.length ? String(args[0]) : '';
  if (C === Object_) return {};
  if (C === Range) return new Range(...args);
  if (typeof C === 'function' && typeof C.new === 'function') return C.new(...args);
  throw new NoMethodError(`${C?.__embutida ?? C}.new não implementado`);
}

// Literais
export const hash = (pares) => RbHash.de(pares);
export const range = (a, b, excluiFim) => new Range(a, b, excluiFim);

// *x (splat): Array é ele mesmo, nil é vazio, Hash vira pares, o resto [x]
export function a(x) {
  if (Array.isArray(x)) return x;
  if (x === null || x === undefined) return [];
  if (x instanceof RbHash) return x.entries();
  if (x instanceof Range) return x.to_a();
  if (typeof x === 'object' && typeof x.to_a === 'function') return x.to_a();
  return [x];
}

// ------------------------------------------------------------------ índice
// x[…] e x[…] = v
export function idx(x, ...args) {
  if (Array.isArray(x)) {
    const [i, n] = args;
    if (i instanceof Range) {
      const ini = i.first < 0 ? i.first + x.length : i.first, fim = i.last < 0 ? i.last + x.length : i.last;
      return fatia(x, ini, Math.max(0, fim - ini + (i.excluiFim ? 0 : 1)));
    }
    if (args.length === 2) return fatia(x, i, n);
    return at(x, Integer(i));
  }
  if (x instanceof RbHash) return x.get(args[0]);
  if (typeof x === 'string') {
    const [i, n] = args;
    if (i instanceof RegExp) {
      ultimoCasamento = umaVez(i).exec(x);
      return ultimoCasamento ? ultimoCasamento[n ?? 0] ?? null : null;
    }
    if (typeof i === 'string') return x.includes(i) ? i : null;
    // Ruby 1.8: s[i] é o byte (Integer); s[i, n] é o pedaço em bytes.
    // Só ASCII: byte = caractere, sem codificar (object? faz name[0, 1] em
    // todo personagem a cada quadro).
    if (SO_ASCII.test(x)) return args.length === 2 ? fatia(x, i, n) : at(x, i)?.charCodeAt(0) ?? null;
    const b = utf8.encode(x);
    if (args.length === 2) {
      const pedaco = fatia([...b], i, n);
      return pedaco === null ? null : utf8Dec.decode(Uint8Array.from(pedaco));
    }
    return at([...b], i);
  }
  if (x === null || x === undefined) throw new NoMethodError("undefined method `[]' for nil:NilClass");
  if (typeof x.idx === 'function') return x.idx(...args);
  if (typeof x.get === 'function') return x.get(...args);   // Table de tipos.js
  throw new NoMethodError(`undefined method \`[]' for ${inspect(x)}`);
}

function fatia(a, i, n) {
  if (i < 0) i += a.length;
  if (i < 0 || i > a.length || n < 0) return null;
  return a.slice(i, i + n);
}

export function idxSet(x, ...args) {
  const valor = args[args.length - 1];
  if (Array.isArray(x)) {
    if (args.length === 3) {   // a[i, n] = v
      let [i, n] = args;
      if (i < 0) i += x.length;
      while (x.length < i) x.push(null);
      x.splice(i, n, ...(Array.isArray(valor) ? valor : [valor]));
      return valor;
    }
    return aset(x, Integer(args[0]), valor);
  }
  if (x instanceof RbHash) {
    // chave String é copiada e congelada no Ruby; aqui texto já é imutável
    return x.set(args[0], valor);
  }
  if (x === null || x === undefined) throw new NoMethodError("undefined method `[]=' for nil:NilClass");
  if (typeof x.idxSet === 'function') return x.idxSet(...args);
  if (typeof x.set === 'function') {   // Table de tipos.js: set(x, y, z, v)
    const c = args.slice(0, -1);
    while (c.length < 3) c.push(0);
    return x.set(...c, valor);
  }
  throw new NoMethodError(`undefined method \`[]=' for ${inspect(x)}`);
}

// ------------------------------------------------------------------ coleções
export const size = metodo('size', (x) => {
  if (Array.isArray(x)) return x.length;
  if (typeof x === 'string') return bytesDe(x);
  if (x instanceof RbHash || x instanceof Range) return x.size;
  return NADA;
});
export const length = size;

export const empty_p = metodo('empty_p', (x) => {
  if (Array.isArray(x) || typeof x === 'string') return x.length === 0;
  if (x instanceof RbHash) return x.size === 0;
  return NADA;
});

export const include_p = metodo('include_p', (x, y) => {
  if (Array.isArray(x)) return x.some((z) => eq(z, y));
  if (typeof x === 'string') return x.includes(typeof y === 'number' ? String.fromCharCode(y) : y);
  if (x instanceof RbHash) return x.has(y);
  if (x instanceof Range) return x.include_p(y);
  return NADA;
});
export const has_key_p = metodo('has_key_p', (x, k) => (x instanceof RbHash ? x.has(k) : NADA));
export const key_p = has_key_p;

export const push = metodo('push', (x, ...ys) => (Array.isArray(x) ? (x.push(...ys), x) : NADA));

export const pop = metodo('pop', (x) => (Array.isArray(x) ? (x.length ? x.pop() : null) : NADA));
export const shift = metodo('shift', (x) => (Array.isArray(x) ? (x.length ? x.shift() : null) : NADA));
export const unshift = metodo('unshift', (x, ...ys) => (Array.isArray(x) ? (x.unshift(...ys), x) : NADA));
export const first = metodo('first', (x) => (Array.isArray(x) ? (x.length ? x[0] : null) : x instanceof Range ? x.first : NADA));
export const last = metodo('last', (x) => (Array.isArray(x) ? (x.length ? x[x.length - 1] : null) : x instanceof Range ? x.last : NADA));

// Array#delete tira todos os iguais (==) e devolve o objeto, ou nil;
// Hash#delete devolve o valor
export const del = metodo('delete', (x, y) => {
  if (Array.isArray(x)) {
    let achou = null;
    for (let i = x.length - 1; i >= 0; i--) if (eq(x[i], y)) { achou = x[i]; x.splice(i, 1); }
    return achou;
  }
  if (x instanceof RbHash) return x.delete(y);
  return NADA;
});
export { del as delete };

export const delete_at = metodo('delete_at', (x, i) => {
  if (!Array.isArray(x)) return NADA;
  if (i < 0) i += x.length;
  return i >= 0 && i < x.length ? x.splice(i, 1)[0] : null;
});

export const clear = metodo('clear', (x) => {
  if (Array.isArray(x)) { x.length = 0; return x; }
  if (x instanceof RbHash) return x.clear();
  return NADA;
});

export const compact = metodo('compact', (x) => (Array.isArray(x) ? x.filter((y) => y !== null && y !== undefined) : NADA));

export const keys = metodo('keys', (x) => (x instanceof RbHash ? x.keys() : NADA));
export const values = metodo('values', (x) => (x instanceof RbHash ? x.values() : NADA));

export const reverse = metodo('reverse', (x) => {
  if (Array.isArray(x)) return [...x].reverse();
  if (typeof x === 'string') return [...x].reverse().join('');
  return NADA;
});

// sort do Ruby não é estável; o do JS é. Os sort do escopo ordenam chaves
// distintas, então dá o mesmo resultado.
export const sort = metodo('sort', (x, bloco) => (Array.isArray(x) ? [...x].sort(bloco ? (p, q) => bloco(p, q) : comparar) : NADA));
export const sort_bang = metodo('sort_bang', (x, bloco) => (Array.isArray(x) ? x.sort(bloco ? (p, q) => bloco(p, q) : comparar) : NADA));

export const max = metodo('max', (x, bloco) => {
  if (!Array.isArray(x)) return NADA;
  if (!x.length) return null;
  const f = bloco ?? comparar;
  return x.reduce((m, y) => (f(y, m) > 0 ? y : m));
});
export const min = metodo('min', (x, bloco) => {
  if (!Array.isArray(x)) return NADA;
  if (!x.length) return null;
  const f = bloco ?? comparar;
  return x.reduce((m, y) => (f(y, m) < 0 ? y : m));
});

// index: Array#index (por ==) e String#index; nos objetos do jogo é o attr
export const index = metodo('index', (x, y) => {
  if (Array.isArray(x)) {
    const i = typeof y === 'function' ? x.findIndex((z) => v(y(z))) : x.findIndex((z) => eq(z, y));
    return i < 0 ? null : i;
  }
  if (typeof x === 'string') {
    const i = y instanceof RegExp ? x.search(y) : x.indexOf(y);
    return i < 0 ? null : i;
  }
  return NADA;
});

export const join = metodo('join', (x, sep = '') => (Array.isArray(x) ? x.map((y) => (Array.isArray(y) ? join(y, sep) : str(y))).join(sep ?? '') : NADA));

// ------------------------------------------------------------------ números
export const to_i_ = metodo('to_i', (x) => (x === null || num(x) || typeof x === 'string' ? to_i(x) : NADA));   // nil.to_i == 0
export const to_f_ = metodo('to_f', (x) => (x === null || num(x) || typeof x === 'string' ? to_f(x) : NADA));
export { to_i_ as to_i, to_f_ as to_f };
export const round_ = metodo('round', (x, casas = 0) => (num(x) ? round(x, casas) : NADA));
export { round_ as round };
export const floor = metodo('floor', (x) => (num(x) ? Math.floor(x) + 0 : NADA));
export const ceil = metodo('ceil', (x) => (num(x) ? Math.ceil(x) + 0 : NADA));
export const truncate = metodo('truncate', (x) => (num(x) ? trunc(x) : NADA));
export const between_p = metodo('between_p', (x, p, q) => (num(x) || typeof x === 'string' ? x >= p && x <= q : NADA));

// ------------------------------------------------------------------ Float × inteiro
// @x = valor numa ivar de tipo misto (o tradutor decide quais): o JS não
// separa 1 de 1.0, então a atribuição anota no objeto se o valor de agora é
// Float (o Marshal grava 0.0, não 0). tipo: 'float', 'int' ou null (não se
// sabe: um valor com parte fracionária é Float; um inteiro mantém a anotação).
function numIvar(obj, chave, valor, tipo) {
  obj[chave] = valor;
  if (typeof valor !== 'number') { obj[FLOATS]?.delete(chave); return valor; }
  if (tipo === 'float' || !Number.isInteger(valor)) (obj[FLOATS] ??= new Set()).add(chave);
  else if (tipo === 'int') obj[FLOATS]?.delete(chave);
  return valor;
}
export { numIvar as num };

// ------------------------------------------------------------------ objetos
// clone: Array, Hash e objetos são cópia rasa (as ivars apontam para os
// mesmos objetos); texto, número, nil e Symbol são o próprio valor. Um
// objeto da fachada com clone próprio (Bitmap, Color…) usa o dele.
export function clone(x) {
  if (x === null || typeof x !== 'object') return x;
  if (Array.isArray(x)) {
    const c = [...x];
    if (x[FLOATS]) c[FLOATS] = new Set(x[FLOATS]);
    return c;
  }
  if (x instanceof RbHash) {
    const c = new RbHash(x.padrao, x.blocoPadrao);
    for (const [k, y] of x.entries()) c.set(k, y);
    if (x[FLOATS]) c[FLOATS] = new Set(x[FLOATS]);
    return c;
  }
  if (x instanceof Range) return new Range(x.first, x.last, x.excluiFim);
  if (typeof x.clone === 'function') return x.clone();
  const c = Object.create(Object.getPrototypeOf(x));
  for (const k of Reflect.ownKeys(x)) Object.defineProperty(c, k, Object.getOwnPropertyDescriptor(x, k));
  if (x[FLOATS]) c[FLOATS] = new Set(x[FLOATS]);
  return c;
}
export const dup = clone;

// object_id (também é o "id" do Ruby 1.8 quando o objeto não tem attr id)
const ids = new WeakMap();
let proximoId = 8;
export function object_id(x) {
  if (num(x) && Number.isInteger(x)) return 2 * x + 1;
  if (x === null || x === undefined) return 4;
  if (x === true) return 2;
  if (x === false) return 0;
  if (typeof x !== 'object' && typeof x !== 'function') return x;
  if (!ids.has(x)) { ids.set(x, proximoId); proximoId += 8; }
  return ids.get(x);
}

// .id: o attr id dos RPG::* (e de quem tiver), senão object_id
export function id(x) {
  if (x !== null && typeof x === 'object' && 'id' in x) return x.id;
  return object_id(x);
}

// métodos que só existem nos objetos do jogo (Rect#empty, Game_Player#center…)
export const empty = (x, ...args) => chamar(x, 'empty', args);

export const message = (e) => (e && typeof e === 'object' ? (e.message ?? '') : str(e));

// Proc#call (e qualquer objeto com call)
export function call(f, ...args) {
  if (typeof f === 'function') return f(...args);
  return chamar(f, 'call', args);
}

// Kernel#exit: sai do laço do Main (quem roda o Main trata SystemExit)
export function exit() { throw new SystemExit(); }

export function raise(x = null, msg = null) {
  if (x === null) throw new RuntimeError('unhandled exception');
  if (typeof x === 'string') throw new RuntimeError(x);
  if (typeof x === 'function') throw new x(msg ?? undefined);
  throw x;
}

// ------------------------------------------------------------------ eval
// Os scripts só fazem eval de textos conhecidos: os 4
// "Chamar Script" dos eventos e o Input::X do Simples Pause. Texto fora da
// tabela é erro, nunca execução de código.
const textosEval = new Map([
  ['$game_checkpoint.create_ksch', () => globalThis.$game_checkpoint.create_ksch()],
  ['$game_checkpoint.load_ksch', () => globalThis.$game_checkpoint.load_ksch()],
  ['$wvar.show', () => globalThis.$wvar.show()],
  ['$wvar.hide', () => globalThis.$wvar.hide()],
]);

function avaliar(texto) {
  const t = String(texto).trim();
  const constante = /^Input::([A-Z][A-Z0-9_]*)$/.exec(t);
  if (constante) {
    const valor = globalThis.Input?.[constante[1]];
    if (valor === undefined) throw new NoMethodError(`uninitialized constant Input::${constante[1]}`);
    return valor;
  }
  const f = textosEval.get(t);
  if (!f) throw new NoMethodError(`eval fora da tabela da migração: ${JSON.stringify(t)}`);
  return f();
}
export { avaliar as eval };

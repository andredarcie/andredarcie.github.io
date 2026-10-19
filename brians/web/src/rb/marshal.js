// Ruby Marshal 4.8, leitura e escrita, como o Ruby 1.8 do RGSS2 grava:
// os .rvdata do editor, os Save*.rvdata e o ks_checkpoint.
//
// Modelo de objetos no JS (o mesmo que a tradução dos scripts usa):
//   nil/true/false → null/true/false      Fixnum/Bignum → number (BigInt se passar de 2^53)
//   Float          → number               String → string (UTF-8); binária → Uint8Array
//   Symbol         → Symbol.for(nome)     Array → Array     Hash → RbHash (rb.js)
//   objeto         → instância da classe JS registrada com o nome Ruby
//                    (sem registro: uma subclasse de RbObject criada na hora),
//                    com cada @ivar como propriedade "_ivar" (@actors → _actors)
//   _dump/_load    → classe registrada com _dump() e static _load(bytes) (Table, Color, Tone)
//
// Em JS 1 e 1.0 são o mesmo número, mas no Ruby não (5 / 2 == 2, 5.0 / 2 == 2.5).
// Por isso um Float de valor inteiro lido do arquivo é anotado no objeto que o
// contém (FLOATS) e volta a ser gravado como Float. Classes traduzidas podem
// declarar static rubyFloats = ['_x', …] para os campos que são sempre Float.
import { RbHash, FIXNUM_MIN, FIXNUM_MAX } from './nucleo.js';
import { Table, Color, Tone } from './tipos.js';

export const FLOATS = Symbol('floats');   // chaves (ivar, índice, chave de hash) com Float inteiro
export const EXTRA = Symbol('marshal');   // o que o JS não representa sozinho ('e', 'C', 'U')

// ------------------------------------------------------------------ classes
export class RbObject {}
export class RbClassRef { constructor(nome, modulo = false) { this.nome = nome; this.modulo = modulo; } }
export class RbRegexp { constructor(fonte, opcoes) { this.fonte = fonte; this.opcoes = opcoes; } }
// String de subclasse do usuário ('C' sobre String): o JS não pendura nada numa string
export class RbStringDe { constructor(classe, valor) { this.classe = classe; this.valor = valor; } }

const classes = new Map();   // nome Ruby → classe JS

export function registrar(Classe, nome = Classe.rubyName) {
  Classe.rubyName = nome;
  classes.set(nome, Classe);
  return Classe;
}

export function classePorNome(nome) {
  let C = classes.get(nome);
  if (!C) {
    C = class extends RbObject {};
    Object.defineProperty(C, 'name', { value: nome.replace(/::/g, '_') });
    C.rubyName = nome;
    classes.set(nome, C);
  }
  return C;
}

for (const C of [Table, Color, Tone]) registrar(C);

const ivarJs = (nome) => `_${nome.slice(1)}`;     // "@actors" → "_actors"
const ivarRuby = (nome) => `@${nome.slice(1)}`;   // "_actors" → "@actors"

function marcarFloat(alvo, chave) {
  (alvo[FLOATS] ??= new Set()).add(chave);
}

// ------------------------------------------------------------------ Float
// Formato do Ruby 1.8 (marshal.c, w_float/r_float): o número em texto
// ("%.*g") e, depois de um byte 0, os bits de mantissa que o texto não
// carrega (save_mantissa). Assim o valor volta exato.
const DECIMAL_MANT = 53 - 16, MANT_BITS = 32;

function frexp(x) {
  if (x === 0 || !Number.isFinite(x)) return [x, 0];
  const d = new DataView(new ArrayBuffer(8));
  d.setFloat64(0, x);
  const exp = (d.getUint16(0) >> 4) & 0x7ff;
  if (exp === 0) { const [m, e] = frexp(x * 2 ** 64); return [m, e - 64]; }  // subnormal
  const e = exp - 1022;
  return [ldexp(x, -e), e];
}

function ldexp(x, e) {
  while (e > 1000) { x *= 2 ** 1000; e -= 1000; }
  while (e < -1000) { x *= 2 ** -1000; e += 1000; }
  return x * 2 ** e;
}

const modf = (x) => { const i = Math.trunc(x); return [x - i, i]; };   // [fração, inteiro]

function salvarMantissa(d) {
  let [f] = frexp(Math.abs(d));
  [f] = modf(ldexp(f, DECIMAL_MANT));
  if (!(f > 0)) return [];
  const saida = [0];
  do {
    let n;
    [f, n] = modf(ldexp(f, MANT_BITS));
    saida.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
  } while (f > 0);
  while (saida.length > 1 && !saida[saida.length - 1]) saida.pop();
  return saida;
}

function carregarMantissa(d, extra) {
  if (extra.length < 2 || extra[0] !== 0) return d;
  const negativo = d < 0;
  let [f, e] = frexp(Math.abs(d));
  [, d] = modf(ldexp(f, DECIMAL_MANT));
  let pos = 1, len = extra.length - 1, dig = 0;
  do {
    let m = 0;
    const n = Math.min(len, MANT_BITS / 8);
    for (let i = 0; i < n; i++) m = m * 256 + extra[pos++];
    dig -= len < MANT_BITS / 8 ? 8 * len : MANT_BITS;
    d += ldexp(m, dig);
  } while ((len -= MANT_BITS / 8) > 0);
  d = ldexp(d, e - DECIMAL_MANT);
  return negativo ? -d : d;
}

// printf("%.<p>g")
function formatoG(d, p) {
  const a = Math.abs(d);
  const tirarZeros = (s) => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s);
  let [mant, exp] = a.toExponential(p - 1).split('e');
  const x = parseInt(exp, 10);
  let s;
  if (x < -4 || x >= p) s = `${tirarZeros(mant)}e${x < 0 ? '-' : '+'}${String(Math.abs(x)).padStart(2, '0')}`;
  else s = tirarZeros(a.toFixed(p - 1 - x));
  return (d < 0 ? '-' : '') + s;
}

export function textoFloat(d, { digitosFloat = 17, mantissa = true } = {}) {
  if (Number.isNaN(d)) return [...'nan'].map((c) => c.charCodeAt(0));
  if (d === Infinity) return [...'inf'].map((c) => c.charCodeAt(0));
  if (d === -Infinity) return [...'-inf'].map((c) => c.charCodeAt(0));
  if (d === 0) return [...(Object.is(d, -0) ? '-0' : '0')].map((c) => c.charCodeAt(0));
  const texto = [...formatoG(d, digitosFloat)].map((c) => c.charCodeAt(0));
  return mantissa ? texto.concat(salvarMantissa(d)) : texto;
}

function lerFloat(b) {
  let fim = b.indexOf(0);
  if (fim < 0) fim = b.length;
  const s = String.fromCharCode(...b.subarray(0, fim));
  if (s === 'nan') return NaN;
  if (s === 'inf') return Infinity;
  if (s === '-inf') return -Infinity;
  return carregarMantissa(parseFloat(s), b.subarray(fim));
}

// ------------------------------------------------------------------ leitura
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const latin = new TextDecoder('latin1');

// String, Float e Bignum são objetos no Ruby 1.8: dois campos podem apontar
// para o MESMO objeto (o arquivo grava um link '@'). No JS são primitivos,
// sem identidade. Cada um vira uma Ref na tabela de objetos, e o valor sai
// embrulhado (Lido) até o contêiner guardar. Só as Refs que o arquivo de
// fato compartilha ficam anotadas no contêiner (IDENT), para o escritor
// refazer o link e devolver os mesmos bytes.
export const IDENT = Symbol('identidade');
class Ref { constructor(v, float) { this.v = v; this.float = float; this.usos = []; this.linkada = false; } }
class Lido { constructor(ref) { this.ref = ref; } }

class Leitor {
  constructor(b, pos = 0) {
    this.b = b; this.pos = pos;
    this.simbolos = []; this.objetos = [];
  }

  byte() {
    if (this.pos >= this.b.length) throw new Error('Marshal: fim inesperado dos dados');
    return this.b[this.pos++];
  }

  // r_long
  inteiro() {
    const c = (this.byte() << 24) >> 24;
    if (c === 0) return 0;
    if (c >= 5) return c - 5;
    if (c <= -5) return c + 5;
    let n = 0;
    if (c > 0) {
      for (let i = 0; i < c; i++) n += this.byte() * 2 ** (8 * i);
      return n;
    }
    for (let i = 0; i < -c; i++) n += this.byte() * 2 ** (8 * i);
    return n - 2 ** (8 * -c);
  }

  bytes() {
    const n = this.inteiro();
    if (this.pos + n > this.b.length) throw new Error('Marshal: fim inesperado dos dados');
    const r = this.b.subarray(this.pos, this.pos + n);
    this.pos += n;
    return r;
  }

  simbolo() {
    const t = this.byte();
    if (t === 0x3a) { const s = utf8Ou(this.bytes()); this.simbolos.push(s); return s; }  // ':'
    if (t === 0x3b) return this.simbolos[this.inteiro()];                               // ';'
    throw new Error(`Marshal: símbolo esperado, veio '${String.fromCharCode(t)}' em ${this.pos - 1}`);
  }

  entrar(o) { this.objetos.push(o); return o; }

  primitivo(v, float = false) {
    const ref = new Ref(v, float);
    this.objetos.push(ref);
    return new Lido(ref);
  }

  // Guarda o valor em alvo[chave], anotando Float inteiro e identidade.
  guardar(alvo, chave, x) {
    if (x instanceof Lido) {
      const { ref } = x;
      if (ref.float && Number.isInteger(ref.v) && !Object.is(ref.v, -0)) marcarFloat(alvo, chave);
      ref.usos.push([alvo, chave]);
      x = ref.v;
    }
    if (alvo instanceof RbHash) alvo.set(chave, x);
    else alvo[chave] = x;
  }

  semFloat(x) { return x instanceof Lido ? x.ref.v : x; }

  // Fim do documento: anota só as Refs compartilhadas.
  anotarIdentidades() {
    for (const ref of this.objetos) {
      if (!(ref instanceof Ref) || !ref.linkada) continue;
      for (const [alvo, chave] of ref.usos) (alvo[IDENT] ??= new Map()).set(chave, ref);
    }
  }

  valor() {
    const t = String.fromCharCode(this.byte());
    switch (t) {
      case '0': return null;
      case 'T': return true;
      case 'F': return false;
      case 'i': return this.inteiro();
      case ':': this.pos--; return Symbol.for(this.simbolo());
      case ';': this.pos--; return Symbol.for(this.simbolo());
      case '@': {
        const i = this.inteiro();
        if (i >= this.objetos.length) throw new Error(`Marshal: link para objeto ${i} inexistente`);
        const o = this.objetos[i];
        if (o instanceof Ref) { o.linkada = true; return new Lido(o); }
        return o;
      }
      case 'I': {
        // ivars de String/Regexp: no Ruby 1.9+ é o encoding (:E true).
        const x = this.valor();
        const n = this.inteiro();
        for (let i = 0; i < n; i++) { this.simbolo(); this.valor(); }
        return x;
      }
      case '"': {
        const s = utf8Ou(this.bytes(), true);
        return typeof s === 'string' ? this.primitivo(s) : this.entrar(s);   // Uint8Array já tem identidade
      }
      case 'f': return this.primitivo(lerFloat(this.bytes()), true);
      case 'l': {
        const sinal = this.byte();
        const n = this.inteiro() * 2;
        let x = 0n;
        for (let i = n - 1; i >= 0; i--) x = (x << 8n) | BigInt(this.b[this.pos + i]);
        this.pos += n;
        if (sinal === 0x2d) x = -x;
        return this.primitivo(x >= BigInt(Number.MIN_SAFE_INTEGER) && x <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(x) : x);
      }
      case '[': {
        const a = this.entrar([]);
        const n = this.inteiro();
        for (let i = 0; i < n; i++) this.guardar(a, i, this.valor());
        return a;
      }
      case '{': case '}': {
        const h = this.entrar(new RbHash());
        const n = this.inteiro();
        for (let i = 0; i < n; i++) {
          const k = this.semFloat(this.valor());
          this.guardar(h, k, this.valor());
        }
        if (t === '}') h.padrao = this.semFloat(this.valor());
        return h;
      }
      case 'o': {
        const C = classePorNome(this.simbolo());
        const o = this.entrar(Object.create(C.prototype));
        const n = this.inteiro();
        for (let i = 0; i < n; i++) { const k = ivarJs(this.simbolo()); this.guardar(o, k, this.valor()); }
        return o;
      }
      case 'S': {
        const C = classePorNome(this.simbolo());
        C.rubyStruct = true;
        const o = this.entrar(Object.create(C.prototype));
        const n = this.inteiro();
        for (let i = 0; i < n; i++) { const k = `_${this.simbolo()}`; this.guardar(o, k, this.valor()); }
        return o;
      }
      case 'u': {
        const nome = this.simbolo();
        const dados = this.bytes().slice();
        const C = classes.get(nome);
        if (C?._load) return this.entrar(C._load(dados));
        // _dump de classe desconhecida: guarda os bytes como estão
        const o = Object.create(classePorNome(nome).prototype);
        o[EXTRA] = { dump: dados };
        return this.entrar(o);
      }
      case 'U': {
        const C = classePorNome(this.simbolo());
        const o = this.entrar(Object.create(C.prototype));
        const dados = this.semFloat(this.valor());
        if (typeof o.marshal_load === 'function') o.marshal_load(dados);
        else o[EXTRA] = { ...o[EXTRA], marshal: dados };
        return o;
      }
      case 'e': {
        const modulo = this.simbolo();
        const x = this.valor();
        if (x && typeof x === 'object' && !(x instanceof Lido)) (x[EXTRA] ??= {}).extends = [modulo, ...(x[EXTRA].extends ?? [])];
        return x;
      }
      case 'C': {
        const classe = this.simbolo();
        const x = this.semFloat(this.valor());
        if (typeof x === 'string' || x instanceof Uint8Array) {
          const o = new RbStringDe(classe, x);
          this.objetos[this.objetos.length - 1] = o;   // a string acabou de entrar na tabela
          return o;
        }
        (x[EXTRA] ??= {}).classe = classe;
        return x;
      }
      case 'c': return this.entrar(new RbClassRef(utf8Ou(this.bytes()), false));
      case 'm': return this.entrar(new RbClassRef(utf8Ou(this.bytes()), true));
      case '/': {
        const fonte = utf8Ou(this.bytes());
        return this.entrar(new RbRegexp(fonte, this.byte()));
      }
      default:
        throw new Error(`Marshal: tipo '${t}' (0x${t.charCodeAt(0).toString(16)}) não suportado em ${this.pos - 1}`);
    }
  }

  documento() {
    const maior = this.byte(), menor = this.byte();
    if (maior !== 4 || menor !== 8) throw new Error(`Marshal: versão ${maior}.${menor} não suportada`);
    this.simbolos = []; this.objetos = [];
    const x = this.semFloat(this.valor());
    this.anotarIdentidades();
    return x;
  }
}

// Texto UTF-8 válido → string; senão os bytes como estão (zlib, binário).
function utf8Ou(b, copiar = false) {
  try { return utf8.decode(b); }
  catch { return copiar ? b.slice() : latin.decode(b); }
}

// Marshal.load
export function load(bytes) {
  return new Leitor(bytes).documento();
}

// Marshal.load(arquivo) a partir da posição atual: devolve o valor e onde o
// próximo começa (o File do io.js lê um dump por chamada, como o Ruby).
export function loadEm(bytes, pos) {
  const l = new Leitor(bytes, pos);
  const valor = l.documento();
  return { valor, pos: l.pos };
}

// Vários Marshal.dump seguidos no mesmo arquivo (é assim que o Scene_File e o
// KS Checkpoint gravam): devolve todos, na ordem.
export function loadTodos(bytes) {
  const l = new Leitor(bytes);
  const valores = [];
  while (l.pos < bytes.length) valores.push(l.documento());
  return valores;
}

// ------------------------------------------------------------------ escrita
const utf8Enc = new TextEncoder();

class Escritor {
  constructor(opcoes) {
    this.opcoes = opcoes;
    this.buf = new Uint8Array(1024);
    this.n = 0;
  }

  byte(x) {
    if (this.n === this.buf.length) {
      const maior = new Uint8Array(this.buf.length * 2);
      maior.set(this.buf);
      this.buf = maior;
    }
    this.buf[this.n++] = x & 255;
  }

  // w_long
  inteiro(x) {
    if (x === 0) return this.byte(0);
    if (x > 0 && x < 123) return this.byte(x + 5);
    if (x < 0 && x > -124) return this.byte(x - 5);
    const bytes = [];
    for (let i = 1; i <= 4; i++) {
      bytes.push(x & 255);
      x = Math.floor(x / 256);
      if (x === 0) { this.byte(i); break; }
      if (x === -1) { this.byte(-i); break; }
    }
    for (const b of bytes) this.byte(b);
  }

  bytes(b) {
    this.inteiro(b.length);
    for (const x of b) this.byte(x);
  }

  simbolo(nome) {
    const i = this.simbolos.get(nome);
    if (i !== undefined) { this.byte(0x3b); this.inteiro(i); return; }
    this.simbolos.set(nome, this.simbolos.size);
    this.byte(0x3a);
    this.bytes(utf8Enc.encode(nome));
  }

  letra(c) { this.byte(c.charCodeAt(0)); }

  // Objeto com identidade (Array, Hash, objeto): repetido vira link '@'.
  // Retorna true se escreveu o link.
  link(x) {
    const i = this.objetos.get(x);
    if (i !== undefined) { this.letra('@'); this.inteiro(i); return true; }
    this.objetos.set(x, this.contador++);
    return false;
  }

  // String, Float e Bignum também ocupam um número na tabela de objetos do
  // Ruby, mas no JS não têm identidade: cada um é gravado de novo, a não ser
  // que o leitor tenha anotado que o arquivo original compartilhava aquele
  // objeto (ref da anotação IDENT, ainda com o mesmo valor).
  primitivo(x, ref) {
    if (!ref || !Object.is(ref.v, x) || this.opcoes.identidade === false) { this.contador++; return false; }
    return this.link(ref);
  }

  string(b) {
    if (this.opcoes.encoding && typeof b === 'string') {
      this.letra('I'); this.letra('"'); this.bytes(utf8Enc.encode(b));
      this.inteiro(1); this.simbolo('E'); this.letra('T');
      return;
    }
    this.letra('"');
    this.bytes(typeof b === 'string' ? utf8Enc.encode(b) : b);
  }

  float(d) {
    this.letra('f');
    this.bytes(textoFloat(d, this.opcoes));
  }

  bignum(x) {
    let v = BigInt(x);
    this.letra('l');
    this.byte(v < 0n ? 0x2d : 0x2b);
    if (v < 0n) v = -v;
    const bytes = [];
    while (v > 0n) { bytes.push(Number(v & 255n)); v >>= 8n; }
    if (bytes.length % 2) bytes.push(0);
    this.inteiro(bytes.length / 2);
    for (const b of bytes) this.byte(b);
  }

  // ehFloat: o contêiner diz que este número é Float; ref: a anotação de
  // identidade do contêiner para esta posição (ver IDENT na leitura).
  valor(x, ehFloat = false, ref = null) {
    if (x === null || x === undefined) return this.letra('0');
    if (x === true) return this.letra('T');
    if (x === false) return this.letra('F');
    if (typeof x === 'number') {
      // Inteiro além de 2^53 não é exato em JS: é Float (Bignum de verdade é BigInt).
      if (ehFloat || !Number.isSafeInteger(x)) return this.primitivo(x, ref) || this.float(x);
      if (x >= FIXNUM_MIN && x <= FIXNUM_MAX) { this.letra('i'); return this.inteiro(x); }
      return this.primitivo(x, ref) || this.bignum(x);
    }
    if (typeof x === 'bigint') {
      if (x >= BigInt(FIXNUM_MIN) && x <= BigInt(FIXNUM_MAX)) { this.letra('i'); return this.inteiro(Number(x)); }
      return this.primitivo(x, ref) || this.bignum(x);
    }
    if (typeof x === 'symbol') return this.simbolo(Symbol.keyFor(x));
    if (typeof x === 'string') return this.primitivo(x, ref) || this.string(x);
    if (x instanceof Uint8Array) return this.link(x) || this.string(x);
    if (x instanceof RbStringDe) {
      if (this.link(x)) return;
      this.letra('C'); this.simbolo(x.classe);
      return this.string(x.valor);   // o número na tabela é o do RbStringDe
    }

    if (this.link(x)) return;
    const extra = x[EXTRA];
    for (const m of extra?.extends ?? []) { this.letra('e'); this.simbolo(m); }
    if (extra?.classe) { this.letra('C'); this.simbolo(extra.classe); }
    const floats = x[FLOATS];
    const ident = x[IDENT];

    if (Array.isArray(x)) {
      this.letra('[');
      this.inteiro(x.length);
      x.forEach((y, i) => this.valor(y, floats?.has(i), ident?.get(i)));
      return;
    }
    if (x instanceof RbHash) {
      const comPadrao = x.padrao !== null;
      this.letra(comPadrao ? '}' : '{');
      this.inteiro(x.size);
      for (const [k, y] of x.entries()) { this.valor(k); this.valor(y, floats?.has(k), ident?.get(k)); }
      if (comPadrao) this.valor(x.padrao);
      return;
    }
    if (x instanceof RbClassRef) { this.letra(x.modulo ? 'm' : 'c'); return this.bytes(utf8Enc.encode(x.nome)); }
    if (x instanceof RbRegexp) {
      this.letra('/'); this.bytes(utf8Enc.encode(x.fonte)); return this.byte(x.opcoes);
    }

    const C = x.constructor;
    const nome = C.rubyName;
    if (!nome) throw new Error(`Marshal: ${C.name || 'objeto'} sem nome Ruby (registre a classe)`);
    if (typeof x._dump === 'function' || extra?.dump) {
      this.letra('u'); this.simbolo(nome);
      return this.bytes(extra?.dump ?? x._dump());
    }
    if (typeof x.marshal_dump === 'function' || (extra && 'marshal' in extra)) {
      this.letra('U'); this.simbolo(nome);
      return this.valor(typeof x.marshal_dump === 'function' ? x.marshal_dump() : extra.marshal);
    }
    const ivars = Object.keys(x).filter((k) => k.startsWith('_'));
    const sempreFloat = C.rubyFloats;
    this.letra(C.rubyStruct ? 'S' : 'o');
    this.simbolo(nome);
    this.inteiro(ivars.length);
    for (const k of ivars) {
      this.simbolo(C.rubyStruct ? k.slice(1) : ivarRuby(k));
      this.valor(x[k], floats?.has(k) || sempreFloat?.includes(k), ident?.get(k));
    }
  }

  documento(x) {
    this.simbolos = new Map();
    this.objetos = new Map();
    this.contador = 0;
    this.byte(4); this.byte(8);
    this.valor(x);
  }

  resultado() { return this.buf.slice(0, this.n); }
}

// Marshal.dump. Opções: digitosFloat (precisão do texto do Float),
// mantissa (bytes extras do Ruby 1.8), encoding (String com :E como no 1.9+),
// identidade: false (forma canônica do rastro: String e Float compartilhados
// são gravados de novo, sem link, porque no JS não há como compartilhá-los).
export function dump(x, opcoes = {}) {
  return dumpTodos([x], opcoes);
}

// Vários Marshal.dump seguidos (o write_save_data do Scene_File).
export function dumpTodos(valores, opcoes = {}) {
  const e = new Escritor({ digitosFloat: 17, mantissa: true, encoding: false, ...opcoes });
  for (const x of valores) e.documento(x);
  return e.resultado();
}

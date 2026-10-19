// Modelo de objetos do Ruby para os scripts do jogo (ver as convenções no
// README.md): classes com `K.new` + `initialize`, reabertura de classe em
// pedaços, alias, include de módulo, módulos com métodos próprios, e esboços
// do que o jogo não usa (batalha, loja, menu…).
import { registrar } from './marshal.js';

// Raiz de toda classe traduzida. `K.new(…)` cria o objeto e chama
// `initialize`, como no Ruby (o constructor do JS não é usado: o Ruby pode
// mexer em @ivars antes do super, e o Marshal cria objetos sem initialize).
export class Objeto {
  static new(...args) {
    const o = new this();
    const r = o.initialize(...args);
    // initialize que espera quadro (carrega imagem): quem cria usa await
    return r instanceof Promise ? r.then(() => o) : o;
  }

  initialize() {}
}

// Class nova: registra o nome Ruby (Marshal) e acerta getter/setter herdados.
export function classe(nome, C) {
  registrar(C, nome);
  consertarAcessores(C);
  return C;
}

// A superclasse de C (para `class extends rb.superDe(C)` na reabertura:
// assim o `super` dos métodos novos chega na superclasse de C, como no Ruby).
export function superDe(C) {
  return Object.getPrototypeOf(C);
}

// Reabertura: os membros de Temp passam para C (os de instância no
// protótipo, os estáticos na própria classe).
export function reabrir(C, Temp) {
  copiar(Temp.prototype, C.prototype, ['constructor']);
  copiar(Temp, C, ['length', 'name', 'prototype']);
  consertarAcessores(C);
  return C;
}

function copiar(de, para, ignorar) {
  for (const k of Reflect.ownKeys(de)) {
    if (ignorar.includes(k)) continue;
    Object.defineProperty(para, k, Object.getOwnPropertyDescriptor(de, k));
  }
}

// Um `set x` sem `get x` na mesma classe esconderia o getter herdado (e o
// contrário). No Ruby, attr_reader numa classe e def x= em outra convivem.
function consertarAcessores(C) {
  for (const alvo of [C.prototype, C]) {
    for (const k of Reflect.ownKeys(alvo)) {
      const d = Object.getOwnPropertyDescriptor(alvo, k);
      if (!d || (!d.get && !d.set) || (d.get && d.set)) continue;
      const herdado = procurar(Object.getPrototypeOf(alvo), k);
      if (!herdado) continue;
      Object.defineProperty(alvo, k, {
        get: d.get ?? herdado.get, set: d.set ?? herdado.set, configurable: true, enumerable: false,
      });
    }
  }
}

function procurar(o, k) {
  for (; o; o = Object.getPrototypeOf(o)) {
    const d = Object.getOwnPropertyDescriptor(o, k);
    if (d) return d;
  }
  return null;
}

// alias novo velho: o novo nome guarda o método de agora (a redefinição
// seguinte de `velho` não o afeta)
export function alias(C, novo, velho) {
  const alvo = ehModulo(C) ? C : C.prototype;
  const d = procurar(alvo, velho);
  if (!d) throw new Error(`alias: ${nomeDe(C)}#${velho} não existe`);
  Object.defineProperty(alvo, novo, { ...d, configurable: true });
}

// ---------------------------------------------------------------- módulos
// Módulo: objeto com os métodos do próprio módulo (def self.x) e os de
// instância (para include) em __instancia.
export function modulo(nome) {
  const M = { __nome: nome, __instancia: {} };
  Object.defineProperty(M, '__modulo', { value: true });
  return M;
}
const ehModulo = (x) => !!x && typeof x === 'object' && x.__modulo === true;

export function singleton(M, membros) {
  copiar(membros, M, []);
  return M;
}

export function instancia(M, Temp) {
  copiar(Temp.prototype, M.__instancia, ['constructor']);
  return M;
}

// include M: os métodos de M entram em C, sem passar por cima dos que C já
// define (no Ruby o módulo fica entre a classe e a superclasse)
export function incluir(C, M) {
  for (const k of Reflect.ownKeys(M.__instancia)) {
    if (!Object.prototype.hasOwnProperty.call(C.prototype, k)) {
      Object.defineProperty(C.prototype, k, Object.getOwnPropertyDescriptor(M.__instancia, k));
    }
  }
  C.__modulos = [...(C.__modulos ?? []), M];
  consertarAcessores(C);
  return C;
}

// ivars que são sempre Float (o Marshal precisa saber: 100.0 não é 100)
export function floats(C, lista) {
  const herdados = Object.getPrototypeOf(C)?.rubyFloats ?? [];
  C.rubyFloats = [...new Set([...herdados, ...(Object.prototype.hasOwnProperty.call(C, 'rubyFloats') ? C.rubyFloats : []), ...lista])];
}

// setter que espera quadro (o JS não tem setter async): obj.atribuir_x(v)
export async function atribuir(obj, nome, v) {
  const f = obj[`atribuir_${nome}`];
  if (typeof f === 'function') await f.call(obj, v);
  else obj[nome] = v;
  return v;
}

// ---------------------------------------------------------------- fora do escopo
export class ForaDoEscopo extends Error {
  constructor(nome, motivo) {
    super(`fora do escopo da migração: ${nome} (${motivo})`);
    this.name = 'ForaDoEscopo';
  }
}

export function foraDoEscopo(nome, motivo) {
  throw new ForaDoEscopo(nome, motivo);
}

export function classeForaDoEscopo(nome, motivo) {
  const C = class extends Objeto {
    static new() { return foraDoEscopo(nome, motivo); }
  };
  Object.defineProperty(C, 'name', { value: nome.replace(/::/g, '_') });
  return C;
}

export function nomeDe(C) {
  if (ehModulo(C)) return C.__nome;
  return C?.rubyName ?? C?.name ?? String(C);
}

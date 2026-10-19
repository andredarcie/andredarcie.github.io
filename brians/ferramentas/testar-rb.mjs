// Etapa 1 da fase 3: a semântica do Ruby em web/src/rb/rb.js e os casos do
// Marshal que os arquivos do jogo não cobrem (limites do Fixnum de 32 bits,
// Bignum, Float especial, links, Hash com padrão). Os bytes esperados são os
// do Marshal.dump do Ruby 1.8.
// Uso: node ferramentas/testar-rb.mjs   (a partir de brians/)
import * as rb from '../web/src/rb/rb.js';
import { load, dump, registrar, FLOATS } from '../web/src/rb/marshal.js';
import { Table, Color, Tone } from '../web/src/rb/tipos.js';

let falhas = 0, total = 0;
function igual(obtido, esperado, nome) {
  total++;
  const ok = Object.is(obtido, esperado) || fmt(obtido) === fmt(esperado);
  if (!ok) { falhas++; console.log(`FALHA ${nome}: obtido ${fmt(obtido)}, esperado ${fmt(esperado)}`); }
}
function lanca(f, nome) {
  total++;
  try { f(); falhas++; console.log(`FALHA ${nome}: não lançou erro`); } catch { /* esperado */ }
}
const fmt = (x) => (typeof x === "number" && Object.is(x, -0) ? "-0" : typeof x === "bigint" ? `${x}n` : JSON.stringify(x));
const hex = (b) => [...b.subarray(2)].map((x) => x.toString(16).padStart(2, '0')).join(' ');

// ------------------------------------------------------------------ verdade
igual(rb.v(0), true, 'v(0)');
igual(rb.v(''), true, 'v("")');
igual(rb.v(null), false, 'v(nil)');
igual(rb.v(false), false, 'v(false)');

// ------------------------------------------------------------------ números
igual(rb.div(7, 2), 3, '7 / 2');
igual(rb.div(-7, 2), -4, '-7 / 2');
igual(rb.div(7, -2), -4, '7 / -2');
igual(rb.div(-8, 2), -4, '-8 / 2');
lanca(() => rb.div(1, 0), '1 / 0');
igual(rb.mod(-7, 3), 2, '-7 % 3');
igual(rb.mod(7, -3), -2, '7 % -3');
igual(rb.mod(7, 3), 1, '7 % 3');
igual(rb.mod(-6, 3), 0, '-6 % 3');
igual(rb.mod(-7.5, 2), 0.5, '-7.5 % 2');
igual(rb.divmod(-7, 2), [-4, 1], '-7.divmod(2)');
igual(rb.round(2.5), 3, '2.5.round');
igual(rb.round(-2.5), -3, '-2.5.round');
igual(rb.round(-2.4), -2, '-2.4.round');
igual(rb.round(-0.4), 0, '-0.4.round (sem -0)');
igual(rb.trunc(-2.7), -2, '-2.7.to_i');
igual(rb.trunc(-0.5), 0, '-0.5.to_i (sem -0)');
igual(rb.to_i('12px'), 12, '"12px".to_i');
igual(rb.to_i('  -3'), -3, '"  -3".to_i');
igual(rb.to_i('1_000'), 1000, '"1_000".to_i');
igual(rb.to_i('x1'), 0, '"x1".to_i');
igual(rb.to_i(null), 0, 'nil.to_i');
igual(rb.to_f('1.5e2x'), 150, '"1.5e2x".to_f');
igual(rb.to_f('.5'), 0, '".5".to_f');
igual(rb.limitar(300, 0, 255), 255, '[[300, 0].max, 255].min');

// ------------------------------------------------------------------ rand
rb.srand(42);
const a = [rb.rand(100), rb.rand(100), rb.rand()];
rb.srand(42);
igual([rb.rand(100), rb.rand(100), rb.rand()], a, 'srand repete a sequência');
igual(rb.srand(7), 42, 'srand devolve a semente anterior');
let dentro = true;
for (let i = 0; i < 10000; i++) {
  const n = rb.rand(6), f = rb.rand(0);
  if (!Number.isInteger(n) || n < 0 || n >= 6 || f < 0 || f >= 1) dentro = false;
}
igual(dentro, true, 'rand(6) em 0...6 e rand(0) em [0, 1)');
rb.srand(1);
const x = rb.rand(1.9);
igual(x, 0, 'rand(1.9) == rand(1) == 0');
rb.srand(1);
const neg = rb.rand(-6);
rb.srand(1);
igual(neg, rb.rand(6), 'rand(-6) == rand(6)');

// ------------------------------------------------------------------ Array
const arr = [1, 2, 3];
igual(rb.at(arr, -1), 3, '[1,2,3][-1]');
igual(rb.at(arr, 5), null, '[1,2,3][5]');
igual(rb.at(arr, -4), null, '[1,2,3][-4]');
const arr2 = [1];
rb.aset(arr2, 3, 9);
igual(arr2, [1, null, null, 9], 'a[3] = 9 completa com nil');
igual(rb.nitems([1, null, 2, null]), 2, 'nitems');

// ------------------------------------------------------------------ Hash
const h = new rb.RbHash();
h.set([25, 44, 'A'], true);
igual(h.get([25, 44, 'A']), true, 'chave Array por conteúdo');
igual(h.get([25, 44, 'B']), null, 'chave Array diferente');
igual(h.get(['25', 44, 'A']), null, '25 e "25" são chaves diferentes');
h.set(1, 'um'); h.set('1', 'texto'); h.set(Symbol.for('a'), 'sym');
igual(h.get(1), 'um', 'chave 1');
igual(h.get('1'), 'texto', 'chave "1"');
igual(h.get(rb.sym('a')), 'sym', 'chave :a');
igual(h.keys().length, 4, 'tamanho');
h.set([25, 44, 'A'], false);
igual(h.size, 4, 'reatribuir não duplica');
igual(h.values()[0], false, 'reatribuir mantém a posição');
h.delete(1);
igual(h.has(1), false, 'delete');
const objChave = {};
h.set(objChave, 'obj');
igual(h.get(objChave), 'obj', 'objeto como chave por identidade');
igual(h.get({}), null, 'outro objeto não é a mesma chave');
const comPadrao = new rb.RbHash(0);
igual(comPadrao.get('x'), 0, 'Hash.new(0)');
const comBloco = new rb.RbHash(null, (hh, k) => hh.set(k, k * 2));
igual(comBloco.get(21), 42, 'Hash.new { |h, k| h[k] = k * 2 }');
igual(comBloco.has(21), true, 'o bloco gravou a chave');

// ------------------------------------------------------------------ Marshal: bytes do Ruby 1.8
const casos = [
  [null, '30'], [true, '54'], [false, '46'],
  [0, '69 00'], [1, '69 06'], [-1, '69 fa'], [122, '69 7f'], [123, '69 01 7b'],
  [-123, '69 80'], [-124, '69 ff 84'], [255, '69 01 ff'], [256, '69 02 00 01'],
  [-256, '69 ff 00'], [-257, '69 fe ff fe'],
  [2 ** 30 - 1, '69 04 ff ff ff 3f'], [-(2 ** 30), '69 fc 00 00 00 c0'],
  [2 ** 30, '6c 2b 07 00 00 00 40'],            // Bignum no Ruby de 32 bits
  [-(2 ** 30) - 1, '6c 2d 07 01 00 00 40'],
  [2 ** 40, '6c 2b 08 00 00 00 00 00 01'],
  ['a', '22 06 61'], [rb.sym('a'), '3a 06 61'], [[rb.sym('a'), rb.sym('a')], '5b 07 3a 06 61 3b 00'],
  [[], '5b 00'], [new rb.RbHash(), '7b 00'], [1.5, '66 08 31 2e 35'], [-0.5, '66 09 2d 30 2e 35'],
  [Infinity, '66 08 69 6e 66'], [-Infinity, '66 09 2d 69 6e 66'], [NaN, '66 08 6e 61 6e'],
];
for (const [valor, esperado] of casos) igual(hex(dump(valor)), esperado, `dump(${fmt(valor)})`);
igual(hex(dump(rb.RbHash.de([[1, 2]]))), '7b 06 69 06 69 07', 'dump({1 => 2})');
const hp = new rb.RbHash(5); hp.set(1, 2);
igual(hex(dump(hp)), '7d 06 69 06 69 07 69 0a', 'dump(Hash.new(5) com 1 => 2)');

// ------------------------------------------------------------------ Marshal: ida e volta
const volta = (x) => load(dump(x));
igual(volta(2 ** 40), 2 ** 40, 'Bignum volta');
igual(volta(-(2 ** 30) - 1), -(2 ** 30) - 1, 'Bignum negativo volta');
igual(typeof volta(2n ** 80n), 'bigint', 'Bignum > 2^53 volta como BigInt');
igual(volta(2n ** 80n), 2n ** 80n, 'valor do BigInt');
for (const d of [0.1, -0.6, 1 / 3, 1e300, -1e-300, 5e-324, 123456789.125, Math.PI]) igual(volta(d), d, `Float ${d} volta exato`);
igual(Object.is(volta(-0), 0), true, '-0 inteiro grava como 0');
igual(volta('com acento: ção ÿ ✓'), 'com acento: ção ÿ ✓', 'UTF-8 volta');
igual(volta('﻿bom'), '﻿bom', 'BOM no começo da string é mantido');
const bin = new Uint8Array([0xff, 0xfe, 0x00, 0x80]);
igual([...volta(bin)], [...bin], 'string binária volta como bytes');

const comum = [1];
const par = volta([comum, comum]);
igual(par[0] === par[1], true, 'mesmo Array duas vezes continua o mesmo');
const ciclo = []; ciclo.push(ciclo);
const c2 = volta(ciclo);
igual(c2[0] === c2, true, 'Array que contém a si mesmo');

class Game_Teste { constructor() { this._x = 1; this._zoom = 100; this._nome = 'Brian'; } }
Game_Teste.rubyFloats = ['_zoom'];
registrar(Game_Teste, 'Game_Teste');
const gt = volta(new Game_Teste());
igual(gt instanceof Game_Teste, true, 'objeto volta na classe registrada');
igual([gt._x, gt._zoom, gt._nome], [1, 100, 'Brian'], 'ivars voltam');
igual(gt[FLOATS]?.has('_zoom'), true, 'rubyFloats: 100 gravado como Float (100.0)');
igual(gt[FLOATS]?.has('_x'), false, 'inteiro continua inteiro');

const t = new Table(3, 2);
t.set(2, 1, 0, -5); t.set(0, 0, 0, 40000);
const t2 = volta(t);
igual([t2.dim, t2.xsize, t2.ysize, t2.zsize], [2, 3, 2, 1], 'Table dimensões');
igual([t2.get(2, 1), t2.get(0, 0), t2.get(3, 0)], [-5, 40000 - 65536, null], 'Table int16 e fora dos limites');
const cor = volta(new Color(300, 10.5, -3, 128));
igual([cor.red, cor.green, cor.blue, cor.alpha], [255, 10.5, 0, 128], 'Color limitada e volta');
const tom = volta(new Tone(-300, 0, 20, 300));
igual([tom.red, tom.green, tom.blue, tom.gray], [-255, 0, 20, 255], 'Tone limitado e volta');

console.log(falhas ? `\n${falhas} de ${total} verificações falharam` : `todas as ${total} verificações passaram`);
process.exitCode = falhas ? 1 : 0;

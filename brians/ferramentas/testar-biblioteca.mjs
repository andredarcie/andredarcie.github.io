// Etapa 4 da fase 3: os helpers rb.* que o código traduzido chama
// (web/src/rb/biblioteca.js e io.js). Os valores esperados são os do Ruby 1.8.
// Uso: node ferramentas/testar-biblioteca.mjs   (a partir de brians/)
import * as rb from '../web/src/rb/rb.js';

let falhas = 0, total = 0;
function igual(obtido, esperado, nome) {
  total++;
  const ok = Object.is(obtido, esperado) || fmt(obtido) === fmt(esperado);
  if (!ok) { falhas++; console.log(`FALHA ${nome}: obtido ${fmt(obtido)}, esperado ${fmt(esperado)}`); }
}
function lanca(f, Erro, nome) {
  total++;
  try { f(); falhas++; console.log(`FALHA ${nome}: não lançou erro`); } catch (e) {
    if (Erro && !(e instanceof Erro)) { falhas++; console.log(`FALHA ${nome}: lançou ${e.name}`); }
  }
}
const fmt = (x) => JSON.stringify(x instanceof rb.RbHash ? x.entries() : x);

// ------------------------------------------------------------------ índice
const a = [10, 20, 30, 40];
igual(rb.idx(a, -1), 40, 'a[-1]');
igual(rb.idx(a, 9), null, 'a[9]');
igual(rb.idx(a, 1, 2), [20, 30], 'a[1, 2]');
igual(rb.idx(a, 4, 1), [], 'a[4, 1] (no fim é [])');
igual(rb.idx(a, 5, 1), null, 'a[5, 1]');
igual(rb.idx(a, rb.range(1, -1, false)), [20, 30, 40], 'a[1..-1]');
igual(rb.idx(a, rb.range(1, 3, true)), [20, 30], 'a[1...3]');
const b = [1];
rb.idxSet(b, 3, 'x');
igual(b, [1, null, null, 'x'], 'a[3] = x completa com nil');
const h = rb.hash([[[1, 2, 'A'], true]]);
igual(rb.idx(h, [1, 2, 'A']), true, 'hash com Array de chave');
igual(rb.idx(h, [1, 2, 'B']), null, 'hash sem a chave');
igual(rb.idx('abc', 0), 97, '"abc"[0] é o byte (1.8)');
igual(rb.idx('ação', 0, 3), 'aç', '"ação"[0, 3] é em bytes ("ç" tem 2)');
const tabela = { idx: (x, y) => x * 10 + y, idxSet: (x, y, v) => v };
igual(rb.idx(tabela, 3, 4), 34, 'objeto com [] próprio');

// ------------------------------------------------------------------ operadores
igual(rb.add('a', 'b'), 'ab', '"a" + "b"');
igual(rb.add([1], [2]), [1, 2], '[1] + [2]');
lanca(() => rb.add('a', 1), rb.TypeError, '"a" + 1');
lanca(() => rb.add(null, 1), rb.NoMethodError, 'nil + 1');
igual(rb.sub([1, 2, 1, 3], [1]), [2, 3], '[1, 2, 1, 3] - [1]');
igual(rb.sub(5, 7), -2, '5 - 7');
igual(rb.sub('Arquivo não encontrado - X', 'Arquivo não encontrado - ', ''), 'X', 'String#sub com texto');
igual(rb.mul('ab', 3), 'ababab', '"ab" * 3');
igual(rb.mul([1, 2], ','), '1,2', '[1, 2] * ","');
igual(rb.div(7, 2), 3, '7 / 2');
igual(rb.div(-7, 2), -4, '-7 / 2');
igual(rb.div(7.5, 2), 3.75, '7.5 / 2');
igual(rb.and(6, 3), 2, '6 & 3');
igual(rb.and(true, 0), true, 'true & 0');
igual(rb.e(0, () => 'x'), 'x', '0 && "x"');
igual(rb.e(null, () => 'x'), null, 'nil && "x"');
igual(rb.ou(false, () => 2), 2, 'false || 2');
igual(rb.abs(-3), 3, '-3.abs');

// ------------------------------------------------------------------ igualdade
igual(rb.eq([1, [2, 'a']], [1, [2, 'a']]), true, 'Array == por conteúdo');
igual(rb.eq([1], [1, 2]), false, 'Array de tamanhos diferentes');
igual(rb.eq(rb.hash([[1, 2]]), rb.hash([[1, 2]])), true, 'Hash == por conteúdo');
igual(rb.eq({}, {}), false, 'objetos por identidade');
igual(rb.eq({ eq: () => true }, 5), true, 'objeto com == próprio');
igual(rb.eq(null, undefined), true, 'nil == nil');
igual(rb.caseEq(rb.range(2, 4, false), 4), true, '(2..4) === 4');
igual(rb.caseEq(rb.range(2, 4, true), 4), false, '(2...4) === 4');
class Bicho {}
class Gato extends Bicho {}
igual(rb.caseEq(Bicho, new Gato()), true, 'Classe === instância da subclasse');
igual(rb.caseEq(rb.String, 'x'), true, 'String === "x"');
igual(rb.caseEq(/b(.)/, 'abc') && rb.ultimo(1), 'c', 'Regexp === e $1');

// ------------------------------------------------------------------ classes
igual(rb.is_a_p(3, rb.Integer), true, '3.is_a?(Integer)');
igual(rb.is_a_p(3.5, rb.Integer), false, '3.5.is_a?(Integer)');
igual(rb.is_a_p(3.5, rb.Numeric), true, '3.5.is_a?(Numeric)');
igual(rb.is_a_p([], rb.Array), true, '[].is_a?(Array)');
igual(rb.is_a_p(new rb.RbHash(), rb.Hash), true, '{}.is_a?(Hash)');
igual(rb.is_a_p(null, rb.Object), true, 'nil.is_a?(Object)');
const M = rb.modulo('M');
const ComM = rb.classe('ComM', class ComM extends rb.Objeto {});
rb.incluir(ComM, M);
class FilhaDeComM extends ComM {}
igual(rb.is_a_p(new FilhaDeComM(), M), true, 'is_a?(módulo incluído na superclasse)');
igual(rb.is_a(new rb.Errno.ENOENT('x'), rb.Errno.ENOENT), true, 'rescue Errno::ENOENT');
igual(rb.is_a(new rb.Errno.ENOENT('x'), rb.StandardError), true, 'Errno::ENOENT é StandardError');
igual(rb.Integer(3.9), 3, 'Integer(3.9)');
igual(rb.Integer('0x1f'), 31, 'Integer("0x1f")');
igual(rb.Integer('-017'), -15, 'Integer("-017") é octal');
lanca(() => rb.Integer('12px'), rb.ArgumentError, 'Integer("12px")');
lanca(() => rb.Integer(null), rb.TypeError, 'Integer(nil)');
igual(rb.novo(rb.Array, 3), [null, null, null], 'Array.new(3)');
igual(rb.novo(rb.Array, 3, (i) => i * 2), [0, 2, 4], 'Array.new(3) { |i| i * 2 }');
const hp = rb.novo(rb.Hash, 0);
igual(rb.idx(hp, 'x'), 0, 'Hash.new(0)');

// ------------------------------------------------------------------ texto
igual(rb.str(null), '', 'nil.to_s');
igual(rb.str([1, 'a', null]), '1a', '[1, "a", nil].to_s (1.8 junta)');
igual(rb.str(rb.sym('abc')), 'abc', ':abc.to_s');
igual(rb.str(0.5), '0.5', '0.5.to_s');
igual(rb.sprintf('Data/Map%03d.rvdata', 7), 'Data/Map007.rvdata', '%03d');
igual(rb.sprintf('%02d:%02d:%02d', 1, 2, 3), '01:02:03', '%02d');
igual(rb.sprintf('%0*d', 4, 42), '0042', '%0*d');
igual(rb.sprintf('%s de %s', 'Brian', 3), 'Brian de 3', '%s');
igual(rb.sprintf('%5.1f|%-4d|%+d|%%', 3.14159, 7, 2), '  3.1|7   |+2|%', '%f, %-d, %+d, %%');
igual(rb.sprintf('%d', -2.7), '-2', '%d de Float trunca');
igual(rb.gsub_inplace('a\\V[12]b\\v[3]', /\\V\[([0-9]+)\]/i, () => `<${rb.ultimo(1)}>`), 'a<12>b<3>', 'gsub! com $1 no bloco');
igual(rb.gsub_inplace('x', /y/, () => 'z'), 'x', 'gsub! sem casamento');
igual(rb.gsub_inplace('a1b', /\d/, () => 7), 'a7b', 'valor do bloco vira texto');
igual(rb.gsub('aXbX', /X/, '[\\0]'), 'a[X]b[X]', 'gsub com \\0');
let texto = '[3]resto';
texto = rb.sub_inplace(texto, /\[([0-9]+)\]/, '');
igual([texto, rb.to_i(rb.ultimo(1))], ['resto', 3], 'sub! e $1 depois');
texto = 'ão';
const c = rb.slice_bang(texto, /./s, (s) => { texto = s; });
igual([c, texto], ['ã', 'o'], 'slice!(/./m) tira um caractere');
igual(rb.slice_bang('', /./s, () => {}), null, 'slice! em texto vazio');
igual(rb.split('a,b,,', ','), ['a', 'b'], 'split tira vazios do fim');
igual(rb.split('  a  b '), ['a', 'b'], 'split sem argumento');
igual(rb.split('PARTICLE=fogo', '='), ['PARTICLE', 'fogo'], 'split("=")');
igual(rb.center('ab', 6, '*'), '**ab**', 'center');
igual(rb.size('ação'), 6, '"ação".size é em bytes (1.8)');
igual(rb.empty_p(''), true, '"".empty?');
igual(rb.include_p('$Brian', '$'), true, 'String#include?');

// ------------------------------------------------------------------ coleções
const d = [1, null, 2, 1];
igual(rb.delete(d, 1), 1, 'Array#delete devolve o objeto');
igual(d, [null, 2], 'Array#delete tira todos os iguais');
igual(rb.delete(d, 9), null, 'Array#delete sem achar');
igual(rb.compact([1, null, 2]), [1, 2], 'compact');
igual(rb.max([3, 9, 2]), 9, 'max');
igual(rb.min([]), null, '[].min');
igual(rb.sort([3, 1, 2]), [1, 2, 3], 'sort');
igual(rb.reverse([1, 2]), [1, 2].reverse(), 'reverse');
igual(rb.include_p([[1, 2]], [1, 2]), true, 'include? por ==');
igual(rb.index([5, 6], 6), 1, 'Array#index');
igual(rb.push([1], 2, 3), [1, 2, 3], 'push');
igual([...rb.range(0, 3, true)], [0, 1, 2], '0...3');
igual([...rb.range(0, 3, false)], [0, 1, 2, 3], '0..3');
igual(rb.size(rb.range(2, 99, false)), 98, '(2..99).size');
igual(rb.a(null), [], '*nil');
igual(rb.a([1, 2]), [1, 2], '*[1, 2]');
igual(rb.a(5), [5], '*5');
const hh = rb.hash([[2, 'b'], [1, 'a']]);
igual([rb.keys(hh), rb.values(hh)], [[2, 1], ['b', 'a']], 'keys/values na ordem de inserção');

// ------------------------------------------------------------------ despacho
const janela = { _index: 2, get index() { return this._index; }, contents: { limpou: 0, clear() { this.limpou++; } } };
igual(rb.index(janela), 2, 'rb.index → attr do objeto');
rb.clear(janela.contents);
igual(janela.contents.limpou, 1, 'rb.clear → método do objeto');
igual(rb.size({ size: 22 }), 22, 'rb.size → attr (Font#size)');
igual(rb.center({ center: (x, y) => x + y }, 1, 2), 3, 'rb.center → Game_Player#center');
lanca(() => rb.clear({}), rb.NoMethodError, 'método que não existe');
igual(rb.call((x) => x + 1, 1), 2, 'Proc#call');
igual(rb.id({ id: 7 }), 7, 'id do RPG::*');
igual(rb.id(5), 11, '5.id (object_id do Fixnum)');

// ------------------------------------------------------------------ clone
const Ponto = rb.classe('Ponto', class Ponto extends rb.Objeto {
  initialize(x) { this._x = x; this._lista = [1]; }
  get x() { return this._x; }
});
const p1 = Ponto.new(3);
const p2 = rb.clone(p1);
igual([p2 instanceof Ponto, p2.x, p2 !== p1, p2._lista === p1._lista], [true, 3, true, true], 'clone: mesma classe, cópia rasa');
const arr = [1, [2]];
const arr2 = rb.clone(arr);
igual([arr2 !== arr, arr2[1] === arr[1]], [true, true], 'Array#clone raso');
igual(rb.clone('x'), 'x', 'String#clone');

// ------------------------------------------------------------------ eval
globalThis.Input = { C: 13 };
igual(rb.eval('Input::C'), 13, 'eval("Input::C")');
let mostrou = 0;
globalThis.$wvar = { show: () => { mostrou++; } };
rb.eval('$wvar.show\n');
igual(mostrou, 1, 'eval de Chamar Script conhecido');
lanca(() => rb.eval('system("x")'), rb.NoMethodError, 'eval fora da tabela');

// ------------------------------------------------------------------ io
rb.guardar('Data/System.rvdata', rb.Marshal.dump([1, 'dois', 3.5]));
igual(rb.load_data('data\\system.rvdata'), [1, 'dois', 3.5], 'load_data sem caixa e com "\\"');
let f = rb.File.open('Save1.rvdata', 'wb');
rb.Marshal.dump(rb.hash([[1, 2]]), f);
rb.Marshal.dump(42, f);
f.close();
f = rb.File.open('Save1.rvdata', 'rb');
const h1 = rb.Marshal.load(f), n1 = rb.Marshal.load(f);
f.close();
igual([rb.idx(h1, 1), n1], [2, 42], 'vários Marshal.dump no mesmo arquivo');
igual(rb.FileTest.exist_p('save1.rvdata'), true, 'FileTest.exist?');
igual(rb.FileTest.exist_p('Save2.rvdata'), false, 'FileTest.exist? sem o arquivo');
igual(rb.Dir.glob('Save*.rvdata'), ['Save1.rvdata'], 'Dir.glob');
lanca(() => rb.File.open('nada.rvdata', 'rb'), rb.Errno.ENOENT, 'File.open de arquivo que não existe');
igual(rb.File.open('Save1.rvdata', 'r').mtime() > rb.Time.at(0), true, 'mtime > Time.at(0)');
let texto2 = null;
rb.configurarMensagem(async (t) => { texto2 = t; });
await rb.print('a', 1, null);
igual(texto2, 'a1', 'print junta com to_s');
igual(await rb.p('x', 2), ['x', 2], 'p devolve os argumentos');
igual(texto2, '"x"\n2', 'p usa inspect');
lanca(() => rb.exit(), rb.SystemExit, 'exit');

console.log(falhas ? `\n${falhas} de ${total} verificações falharam` : `todas as ${total} verificações passaram`);
process.exitCode = falhas ? 1 : 0;

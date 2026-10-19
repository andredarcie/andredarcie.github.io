// Ligação da fachada RGSS2 em JS com o motor (src/rgss/: render, bitmap,
// tilemap, áudio, entrada). É a mesma API que a versão Ruby chamava por
// JS.global[:RGSS] (src/rgss/api.js), agora chamada direto.
//
// Objetos de cena marcam-se "sujos" quando mudam e são empurrados ao motor
// uma vez por quadro, em Graphics.update, como em rgss.rb: o motor vê os
// mesmos valores nos mesmos quadros que na versão Ruby.
//
// Convenção dos campos: o estado da fachada fica em `$x` (só do JS). Não é
// ivar (`_x`): no RGSS original Sprite/Window são classes em C, e a ivar de
// uma subclasse (o @opacity do Particle) é outra coisa que o Sprite#opacity.
let api = null;

export function ligarMotor(a) { api = a; }
export function motor() {
  if (!api) throw new Error('RGSS2: o motor não foi ligado (ligarMotor)');
  return api;
}

let sujos = [];
export function sujar(obj) { sujos.push(obj); }

export function sincronizar() {
  if (!sujos.length) return;
  const lista = sujos;
  sujos = [];
  for (const o of lista) if (!o.$descartado) o.$sync();
}

// ObjetoDeCena.limitar_byte: to_i e 0..255
export function limitarByte(v) {
  v = inteiro(v);
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

// to_i / to_f das conversões da fachada (número é o caso comum)
export const inteiro = (v) => (typeof v === 'number' ? Math.trunc(v) + 0 : paraInteiro(v));
export const real = (v) => (typeof v === 'number' ? v : paraReal(v));

function paraInteiro(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'string') return parseInt(v, 10) || 0;
  if (typeof v.to_i === 'function') return v.to_i();
  throw new TypeError(`RGSS2: não sei converter ${v} para inteiro`);
}
function paraReal(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'string') return parseFloat(v) || 0;
  if (typeof v.to_f === 'function') return v.to_f();
  throw new TypeError(`RGSS2: não sei converter ${v} para Float`);
}

// verdade do Ruby (só nil e false são falsos), para os booleanos da ponte
export const verdade = (x) => x !== null && x !== false && x !== undefined;

// Compara dois rastros (de tocar-replay.mjs) e mostra o primeiro quadro em
// que divergem: estado do jogo, cena (o que é desenhado), áudio ou entrada.
// Se os dois rastros tiverem o detalhe desse quadro (--detalhe N no
// tocar-replay), mostra também os campos que diferem.
// Uso: node ferramentas/comparar-rastros.mjs a.json b.json
import fs from 'node:fs';
import { loadTodos } from '../web/src/rb/marshal.js';
import { RbHash } from '../web/src/rb/rb.js';
import { Table } from '../web/src/rb/tipos.js';

const [arqA, arqB] = process.argv.slice(2);
if (!arqA || !arqB) { console.log('uso: node ferramentas/comparar-rastros.mjs a.json b.json'); process.exit(2); }
const a = JSON.parse(fs.readFileSync(arqA, 'utf8'));
const b = JSON.parse(fs.readFileSync(arqB, 'utf8'));
const CANAIS = ['estado', 'cena', 'áudio', 'entrada'];
// a ordem do rastro.rb (RGSSRastro.objetos)
const OBJETOS = ['$scene.class', 'Graphics.frame_count', 'Graphics.brightness', '$game_temp', '$game_system',
  '$game_message', '$game_switches', '$game_variables', '$game_self_switches', '$game_actors', '$game_party',
  '$game_troop', '$game_map', '$game_player', '$load_from_gameover', '$tela_size_width', '$tela_size_height'];

console.log(`A: ${arqA} (${a.motor}, build ${a.build}, ${a.quadros.length} quadros, fim: ${a.fim})`);
console.log(`B: ${arqB} (${b.motor}, build ${b.build}, ${b.quadros.length} quadros, fim: ${b.fim})`);

const n = Math.min(a.quadros.length, b.quadros.length);
let divergencia = -1;
for (let i = 0; i < n; i++) {
  if (a.quadros[i].some((x, c) => x !== b.quadros[i][c])) { divergencia = i; break; }
}

if (divergencia < 0) {
  if (a.quadros.length === b.quadros.length && a.fim === b.fim) {
    console.log(`\nIGUAIS: ${n} quadros idênticos (estado, cena, áudio e entrada).`);
    process.exit(0);
  }
  console.log(`\nOs ${n} primeiros quadros são iguais, mas um rastro é mais longo (fim A: ${a.fim}; fim B: ${b.fim}).`);
  process.exit(1);
}

const q = divergencia;
const canais = CANAIS.filter((_, c) => a.quadros[q][c] !== b.quadros[q][c]);
console.log(`\nDIVERGEM no quadro ${q} (entrada ${a.quadros[q][3]}): ${canais.join(', ')}`);
if (canais.includes('áudio')) console.log(`  áudio A: ${a.quadros[q][2] || '(nada)'}\n  áudio B: ${b.quadros[q][2] || '(nada)'}`);

if (a.detalhe?.quadro === q && b.detalhe?.quadro === q) {
  if (canais.includes('estado')) {
    const ea = loadTodos(new Uint8Array(Buffer.from(a.detalhe.estado, 'base64')));
    const eb = loadTodos(new Uint8Array(Buffer.from(b.detalhe.estado, 'base64')));
    const difs = [];
    ea.forEach((x, i) => diferencas(x, eb[i], OBJETOS[i] ?? `objeto ${i}`, difs));
    console.log(`  estado: ${difs.length} diferença(s)${difs.length > 20 ? ', as 20 primeiras' : ''}:`);
    for (const d of difs.slice(0, 20)) console.log(`    ${d}`);
  }
  if (canais.includes('cena')) {
    const porId = (lista) => new Map(lista.map((o) => [o.criacao, o]));
    const ca = porId(a.detalhe.cena), cb = porId(b.detalhe.cena);
    for (const id of new Set([...ca.keys(), ...cb.keys()])) {
      const x = JSON.stringify(ca.get(id) ?? null), y = JSON.stringify(cb.get(id) ?? null);
      if (x !== y) console.log(`  cena, objeto ${id}:\n    A ${x}\n    B ${y}`);
    }
  }
} else {
  console.log(`\nPara ver os campos, toque os dois replays de novo com --detalhe ${q} e compare outra vez.`);
}
process.exit(1);

// Diferenças entre dois valores do Marshal, com o caminho de cada uma.
function diferencas(x, y, caminho, saida, vistos = new Set()) {
  if (saida.length > 200) return;
  if (Object.is(x, y)) return;
  const tipo = (v) => (v === null ? 'nil' : Array.isArray(v) ? 'Array' : typeof v === 'object' ? (v.constructor?.rubyName ?? v.constructor?.name) : typeof v);
  if (tipo(x) !== tipo(y)) { saida.push(`${caminho}: ${tipo(x)} ≠ ${tipo(y)}`); return; }
  if (typeof x !== 'object' || x === null) { saida.push(`${caminho}: ${fmt(x)} ≠ ${fmt(y)}`); return; }
  if (vistos.has(x)) return;
  vistos.add(x);
  if (x instanceof Uint8Array) { if (Buffer.compare(x, y)) saida.push(`${caminho}: bytes diferentes`); return; }
  if (x instanceof Table) {
    if (x.xsize !== y.xsize || x.ysize !== y.ysize || x.zsize !== y.zsize) { saida.push(`${caminho}: Table ${x.xsize}×${x.ysize}×${x.zsize} ≠ ${y.xsize}×${y.ysize}×${y.zsize}`); return; }
    for (let i = 0; i < x.data.length; i++) if (x.data[i] !== y.data[i]) saida.push(`${caminho}[${i % x.xsize}, ${Math.floor(i / x.xsize) % x.ysize}, ${Math.floor(i / x.xsize / x.ysize)}]: ${x.data[i]} ≠ ${y.data[i]}`);
    return;
  }
  if (Array.isArray(x)) {
    if (x.length !== y.length) saida.push(`${caminho}: tamanho ${x.length} ≠ ${y.length}`);
    for (let i = 0; i < Math.min(x.length, y.length); i++) diferencas(x[i], y[i], `${caminho}[${i}]`, saida, vistos);
    return;
  }
  if (x instanceof RbHash) {
    const kx = x.keys(), ky = y.keys();
    for (const k of kx) if (!y.has(k)) saida.push(`${caminho}[${fmt(k)}]: só em A`);
    for (const k of ky) if (!x.has(k)) saida.push(`${caminho}[${fmt(k)}]: só em B`);
    for (const k of kx) if (y.has(k)) diferencas(x.get(k), y.get(k), `${caminho}[${fmt(k)}]`, saida, vistos);
    return;
  }
  const chaves = new Set([...Object.keys(x), ...Object.keys(y)]);
  for (const k of chaves) {
    const nome = k.startsWith('_') ? `@${k.slice(1)}` : k;
    if (!(k in x)) saida.push(`${caminho}.${nome}: só em B`);
    else if (!(k in y)) saida.push(`${caminho}.${nome}: só em A`);
    else diferencas(x[k], y[k], `${caminho}.${nome}`, saida, vistos);
  }
}

function fmt(v) {
  if (typeof v === 'symbol') return `:${Symbol.keyFor(v)}`;
  if (typeof v === 'bigint') return `${v}`;
  if (Array.isArray(v)) return `[${v.map(fmt).join(', ')}]`;
  return JSON.stringify(v);
}

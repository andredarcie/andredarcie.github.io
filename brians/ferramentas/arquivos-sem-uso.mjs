// Quais arquivos de projeto/ o jogo nunca usa. Um arquivo conta como usado se
// o nome dele (sem extensão, sem diferenciar maiúsculas):
//   - é exatamente um texto dos dados (Data/*.rvdata): gráfico de evento,
//     imagem, som, troca de gráfico em rota, ator, veículo, sons do sistema…;
//   - aparece dentro de um "Chamar Script" ou comentário de evento;
//   - é exatamente uma string literal do código (web/), pelo último pedaço do
//     caminho ('Window', 'Audio/SE/Book', "Graphics/System/TileA1"…).
// Exceções exatas:
//   - animações: só as que algum evento mostra (comando 212), com os gráficos
//     e os sons delas; o resto do banco de animações é de batalha;
//   - batalha: inimigos, tropas e a música de batalha só contam se algum
//     evento inicia batalha (comando 301).
// Data/, Fonts/ (a fonte é carregada pelo boot) e ks_checkpoint ficam sempre.
// Uso: node ferramentas/arquivos-sem-uso.mjs [--json saida.json]   (a partir de brians/)
import fs from 'node:fs';
import path from 'node:path';
import { carregar } from './marshal.mjs';

const DADOS = 'projeto/Data';
const ler = (n) => carregar(fs.readFileSync(path.join(DADOS, n)));

function textos(v, saida, vistos = new Set()) {
  if (typeof v === 'string') { saida.add(v.toLowerCase()); return saida; }
  if (!v || typeof v !== 'object' || vistos.has(v)) return saida;
  vistos.add(v);
  for (const x of Object.values(v)) textos(x, saida, vistos);
  return saida;
}

// ---------------------------------------------------------------- comandos de evento
const listas = [];
for (const f of fs.readdirSync(DADOS).filter((f) => /^Map\d+\.rvdata$/.test(f))) {
  for (const [, ev] of ler(f)['@events']['@hash']) for (const p of ev['@pages']) listas.push(p['@list']);
}
for (const ce of ler('CommonEvents.rvdata')) if (ce) listas.push(ce['@list']);
const comandos = listas.flat();
const usaBatalha = comandos.some((c) => c['@code'] === 301);
const animacoesUsadas = new Set(comandos.filter((c) => c['@code'] === 212).map((c) => c['@parameters'][1]));

// ---------------------------------------------------------------- textos dos dados
const banidos = new Set(['Animations.rvdata', ...(usaBatalha ? [] : ['Enemies.rvdata', 'Troops.rvdata'])]);
const dados = new Set();
for (const f of fs.readdirSync(DADOS)) if (!banidos.has(f)) textos(ler(f), dados);
const sistema = ler('System.rvdata');
const soBatalha = usaBatalha ? [] : [sistema['@battle_bgm']?.['@name'], sistema['@battle_end_me']?.['@name']].filter(Boolean).map((n) => n.toLowerCase());
const animacoes = ler('Animations.rvdata');
for (const id of animacoesUsadas) {
  const a = animacoes[id];
  if (!a) continue;
  textos([a['@animation1_name'], a['@animation2_name']], dados);
  for (const t of a['@timings'] ?? []) textos(t['@se'], dados);
}
// "Chamar Script" e comentários: nomes montados dentro de texto
const textoEventos = comandos.filter((c) => [108, 408, 355, 655].includes(c['@code']))
  .map((c) => String(c['@parameters']?.[0] ?? '').toLowerCase()).join('\n');

// ---------------------------------------------------------------- literais do código
const literais = new Set();
const LITERAL = /(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g;
(function andar(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { andar(p); continue; }
    if (!/\.(js|html)$/.test(e.name)) continue;
    for (const [, , s] of fs.readFileSync(p, 'utf8').matchAll(LITERAL)) {
      const ultimo = s.split(/[\\/]/).pop().replace(/\.[a-z0-9]+$/i, '').toLowerCase();
      if (ultimo) literais.add(ultimo);
    }
  }
})('web');

// ---------------------------------------------------------------- arquivos
const sem = [], com = [];
(function andar(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { andar(p); continue; }
    const rel = path.relative('projeto', p).split(path.sep).join('/');
    if (/^(Data|Fonts)\//.test(rel) || rel === 'ks_checkpoint') { com.push([rel, 'essencial']); continue; }
    const base = e.name.replace(/\.[^.]+$/, '').toLowerCase();
    const motivo = soBatalha.includes(base) ? null
      : dados.has(base) ? 'dados'
        : textoEventos.includes(base) ? 'texto de evento'
          : literais.has(base) ? 'código'
            : null;
    (motivo ? com : sem).push([rel, motivo ?? '', fs.statSync(p).size]);
  }
})('projeto');

const porPasta = {};
for (const [rel, , tam] of sem) {
  const pasta = rel.split('/').slice(0, -1).join('/') || '.';
  (porPasta[pasta] ??= { arquivos: 0, bytes: 0 }).arquivos++;
  porPasta[pasta].bytes += tam;
}
console.log(`batalha usada por algum evento: ${usaBatalha ? 'SIM' : 'não'} · animações mostradas por eventos: ${[...animacoesUsadas].sort((a, b) => a - b).join(', ') || 'nenhuma'}`);
console.log(`${com.length} arquivos usados, ${sem.length} sem uso (${(sem.reduce((s, x) => s + x[2], 0) / 1048576).toFixed(2)} MB)`);
for (const [pasta, v] of Object.entries(porPasta).sort((a, b) => b[1].bytes - a[1].bytes)) console.log(`  ${pasta.padEnd(24)} ${String(v.arquivos).padStart(4)} arquivos  ${(v.bytes / 1048576).toFixed(2)} MB`);
const i = process.argv.indexOf('--json');
if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify({ usaBatalha, animacoes: [...animacoesUsadas], sem: sem.map((s) => s[0]), com }, null, 1));

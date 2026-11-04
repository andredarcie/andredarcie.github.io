// Writes the full scripts (every spoken line, with its time in the episode) into index.html,
// between <!-- roteiros:inicio --> and <!-- roteiros:fim -->, from the episodes' narration
// files in C:\repos\fotossintese. Run again after an episode changes:
//   node lendas-divinolandia/roteiros.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FONTE = 'C:/repos/fotossintese';
const EPS = [
  {pasta: 'leobaldo', titulo: 'Episódio 1: Leobaldo, o de olhos azuis'},
  {pasta: 'sapecado', titulo: 'Episódio 2: A maldição do Sapecado'},
  {pasta: 'adriano', titulo: 'Episódio 3: Adriano Lobo'},
];
// who speaks a line that is not the narrator
const QUEM = {bruxa: 'A bruxa', mulher: 'A vítima'};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tempo = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

let html = '';
for (const ep of EPS) {
  const n = JSON.parse(fs.readFileSync(path.join(FONTE, ep.pasta, 'narracao.json'), 'utf8'));
  const tl = JSON.parse(fs.readFileSync(path.join(FONTE, ep.pasta, 'saida-linha-do-tempo.json'), 'utf8'));
  const linhas = n.falas.map((f) => {
    const t = tl[f.id] ? `<time>${tempo(tl[f.id][0])}</time>` : '<time></time>';
    const quem = f.voz && QUEM[f.voz] ? `<span class="quem">${QUEM[f.voz]}</span>` : '';
    return `            <li>${t}<p>${quem}${esc(f.legenda || f.texto)}</p></li>`;
  }).join('\n');
  html += `
      <details class="roteiro">
        <summary><span class="roteiro__titulo">${ep.titulo}</span><span class="roteiro__acao"><span class="se-fechado">Ver o roteiro (spoiler)</span><span class="se-aberto">Esconder o roteiro</span></span></summary>
        <ol class="falas">
${linhas}
        </ol>
      </details>`;
}

const arq = path.join(here, 'index.html');
const page = fs.readFileSync(arq, 'utf8');
const ini = '<!-- roteiros:inicio -->', fim = '<!-- roteiros:fim -->';
const a = page.indexOf(ini), b = page.indexOf(fim);
if (a < 0 || b < 0) throw new Error('marcadores dos roteiros não encontrados em index.html');
fs.writeFileSync(arq, page.slice(0, a + ini.length) + html + '\n      ' + page.slice(b));
console.log('roteiros escritos:', EPS.length, 'episódios');

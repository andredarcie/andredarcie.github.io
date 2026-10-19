// Gera web/niveis.json para o seletor de fases (só localhost): os mapas na
// ordem da árvore do editor e, para cada um, as entradas de verdade, ou seja,
// os destinos de "Transferir jogador" (comando 201) que apontam para ele em
// qualquer evento do jogo. Lê os .rvdata de projeto/Data (Marshal).
// Uso: node ferramentas/montar-niveis.mjs   (a partir de brians/)
import fs from 'node:fs';
import path from 'node:path';
import { carregar } from './marshal.mjs';

const DADOS = path.resolve('projeto/Data');
// mesmo formato do dump: objetos com '@campos', Hash como { '@hash': [[k, v]…] }
const ler = (nome) => carregar(fs.readFileSync(path.join(DADOS, nome.replace(/\.json$/, '.rvdata'))));

const infos = new Map(ler('MapInfos.json')['@hash'].map(([id, i]) => [id, i]));
const mapas = new Map();
for (const id of infos.keys()) {
  const arq = `Map${String(id).padStart(3, '0')}.json`;
  if (fs.existsSync(path.join(DADOS, arq.replace(/\.json$/, '.rvdata')))) mapas.set(id, ler(arq));
}

const entradas = new Map(); // id do mapa → [{x, y, dir, origem}]
function anotar(lista, origem) {
  for (const c of lista ?? []) {
    const p = c?.['@parameters'];
    if (c?.['@code'] !== 201 || !Array.isArray(p) || p[0] !== 0) continue; // 1 = destino por variável
    const [, mapa, x, y, dir] = p;
    const doMapa = entradas.get(mapa) ?? [];
    if (!doMapa.some((e) => e.x === x && e.y === y)) doMapa.push({ x, y, dir: dir || 2, origem });
    entradas.set(mapa, doMapa);
  }
}
for (const [id, mapa] of mapas) {
  for (const [, ev] of mapa['@events']['@hash']) {
    for (const pagina of ev['@pages'] ?? []) anotar(pagina['@list'], `${infos.get(id)['@name']} › ${ev['@name']}`);
  }
}
for (const ce of ler('CommonEvents.json')) if (ce) anotar(ce['@list'], `Evento comum › ${ce['@name']}`);

const sistema = ler('System.json');
const inicio = { x: sistema['@start_x'], y: sistema['@start_y'], dir: 2, origem: 'Início do jogo' };

// Árvore do editor: filhos sob o pai, na ordem do @order.
const filhos = (pai) => [...infos].filter(([, i]) => i['@parent_id'] === pai).sort((a, b) => a[1]['@order'] - b[1]['@order']);
const niveis = [];
(function descer(pai, profundidade) {
  for (const [id, info] of filhos(pai)) {
    const mapa = mapas.get(id);
    if (mapa) {
      const lista = [...(id === sistema['@start_map_id'] ? [inicio] : []), ...(entradas.get(id) ?? [])];
      if (!lista.length) lista.push({ x: mapa['@width'] >> 1, y: mapa['@height'] >> 1, dir: 2, origem: 'centro do mapa (sem entrada)' });
      niveis.push({ id, nome: info['@name'], profundidade, entradas: lista });
    }
    descer(id, profundidade + 1);
  }
})(0, 0);

fs.writeFileSync(path.resolve('web/niveis.json'), JSON.stringify(niveis));
console.log(`${niveis.length} mapas em web/niveis.json`);

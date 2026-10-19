// Catálogo das músicas do jogo, todas geradas por código: o nome que o jogo
// pede (Audio/BGM/…, Audio/BGS/…, os nomes dos arquivos de 2014, que os mapas
// e eventos ainda usam) → a faixa composta em src/musica/faixas/. Os arquivos
// originais saíram do projeto (backup em brians-legado.zip); as fichas
// medidas deles ficam em musica-fichas/, para afinar as faixas.
import { renderizar } from './render.js';
import { tiro, teleporte } from './efeitos-sonoros.js';

const faixa = (id, arquivo, pitches, onde, carregar) => ({ id, nome: `Audio/${arquivo}`, pitches, onde, carregar });
export const FAIXAS = [
  faixa('mansao', 'BGM/4-14 - Haunted House BGM', [50, 100],
    'título (50), Floresta, Segunda Parte, Corredor', () => import('./faixas/01-mansao.js')),
  faixa('jardim', 'BGM/PVZ_Soundtrack-Daytime_in_a_Front_Yard', [100, 65],
    'Primeira Parte, cena do Hall, Os namorados (65)', () => import('./faixas/02-jardim.js')),
  faixa('noite', 'BGM/PVZ_Soundtrack-Nighttime_at_the_Backyard', [100],
    'Celas (1ª e 2ª parte)', () => import('./faixas/03-noite.js')),
  faixa('caverna', 'BGM/Super Mario World - Underground', [100],
    'Caverna, Lugar secreto', () => import('./faixas/04-caverna.js')),
  faixa('quartos', 'BGM/3-06-world-map-6-iced-land-', [50],
    'Os Quartos (50)', () => import('./faixas/05-quartos.js')),
  faixa('chefe1', 'BGM/4-20 - Koopa Junior BGM', [100],
    'chefe, fase 1', () => import('./faixas/06-chefe1.js')),
  faixa('chefe2', 'BGM/PVZ_Soundtrack-Daytime_at_a_Back_Yard', [95],
    'chefe, fase 2 (95)', () => import('./faixas/07-chefe2.js')),
  faixa('final', 'BGM/PVZ_Soundtrack-The_Roof', [100],
    'final (Fine)', () => import('./faixas/08-final.js')),
  faixa('fuga', 'BGS/4-16 - Switch BGM', [100],
    'BGS: contagem da fuga', () => import('./faixas/09-fuga.js')),
  faixa('ronco', 'BGS/Darkness', [100],
    'BGS: ambiente do Corredor', () => import('./faixas/10-ronco.js')),
  // efeitos sonoros gerados (os dois maiores arquivos de som); cache próprio, nunca saem
  { ...faixa('tiro', 'SE/magnum_fire', [100], 'SE: tiro (A morte)', null), gerar: tiro },
  { ...faixa('teleporte', 'SE/Teleport', [100], 'SE: teletransporte', null), gerar: teleporte },
];

const chave = (nome) => String(nome).replace(/\\/g, '/').replace(/\.(ogg|mp3|wav|mid|midi|wma)$/i, '').toLowerCase();
const porNome = new Map(FAIXAS.map((f) => [chave(f.nome), f]));

// a faixa gerada para este nome, ou null (não há música com esse nome)
export function faixaGerada(nome) {
  return porNome.get(chave(nome)) ?? null;
}

// AudioBuffer da faixa (renderiza uma vez). O cache guarda só as 3 mais
// recentes: um loop gerado ocupa ~10–15 MB, e no celular isso pesa.
const MAX_CACHE = 3;
const cache = new Map();
const efeitos = new Map();
export function bufferDe(faixa) {
  if (faixa.gerar) {
    if (!efeitos.has(faixa.id)) efeitos.set(faixa.id, Promise.resolve().then(() => faixa.gerar()));
    return efeitos.get(faixa.id);
  }
  let p = cache.get(faixa.id);
  if (p) cache.delete(faixa.id);
  else p = faixa.carregar().then((m) => renderizar(m.default));
  cache.set(faixa.id, p);
  while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
  return p;
}

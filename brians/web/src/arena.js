// Arena de teste da visão dos inimigos (?arena; ligada por src/boot.js depois
// dos ajustes, então não existe com &original nem em gravar/replay).
// Pula o título e monta um mapa inteiro de chão liso, sem nenhum outro
// evento: o Brian no centro e os três inimigos de verdade (fantasma,
// caveira e dragãozinho, com os eventos originais dos mapas deles) nos
// buracos de origem. Por cima, o círculo de visão de cada um: verde
// vagando, vermelho perseguindo.
//   - inimigo que pega o Brian volta (na arena o "derrotado não volta" de
//     src/dano.js fica desligado) e a vida nunca acaba;
//   - R remonta a arena.
import * as rb from 'rb';
import { VISAO } from './ajustes.js';
import { dano } from './dano.js';
import { tutorial } from './tutoriais.js';

const BASE = 11;             // o mapa da Primeira Parte (70×60) dá o tamanho
const PISO = 1554;           // chão de pedra do mapa 11
const BRIAN = [35, 30];
const INIMIGOS = [
  { nome: 'fantasma', mapa: 11, ev: 44 },
  { nome: 'caveira', mapa: 26, ev: 18 },
  { nome: 'dragãozinho', mapa: 1, ev: 57 },
];
const TILE = 32;

async function montar() {
  if (rb.empty_p($game_party.members)) $game_party.setup_starting_members();
  $game_player._transferring = false;
  $game_map.interpreter.clear();
  $game_message.clear();
  $game_message.visible = false;
  $game_temp.next_scene = null;
  $game_map.screen.clear();
  await $game_map.setup(BASE);
  const d = $game_map._map.data;
  for (let y = 0; y < d.ysize; y++) {
    for (let x = 0; x < d.xsize; x++) { d.set(x, y, 0, PISO); d.set(x, y, 1, 0); d.set(x, y, 2, 0); }
  }
  const eventos = rb.hash([]);
  for (const i of INIMIGOS) {
    const dados = rb.idx(load_data(rb.sprintf('Data/Map%03d.rvdata', i.mapa)).events, i.ev);
    const ev = await Game_Event.new(BASE, dados);
    ev.$arena = i.nome;
    rb.idxSet(eventos, i.ev, ev);
  }
  $game_map._events = eventos;
  $game_map._common_events = rb.hash([]);
  // o evento automático de entrada do mapa 11 já começou no setup: cancela
  $game_map.interpreter.clear();
  tutorial.descartar();
  rb.idxSet($game_variables, 2, 4);
  await $game_player.moveto(...BRIAN);
  $game_player.set_direction(2);
  $game_player.refresh();
  $game_map.autoplay();
  Graphics.brightness = 255;
  $scene = Scene_Map.new();
}

// os círculos numa camada da página por cima da tela do jogo
function criarCamada() {
  const c = document.createElement('canvas');
  c.width = 544; c.height = 416;
  Object.assign(c.style, { position: 'fixed', pointerEvents: 'none', zIndex: 5, imageRendering: 'pixelated' });
  document.body.appendChild(c);
  return c;
}

function desenhar(camada) {
  const r = document.querySelector('#tela').getBoundingClientRect();
  Object.assign(camada.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  const g = camada.getContext('2d');
  g.clearRect(0, 0, 544, 416);
  if (!rb.is_a($scene, Scene_Map)) return;
  g.font = 'bold 11px "Open Sans", sans-serif';
  g.textAlign = 'center';
  for (const ev of rb.values($game_map.events)) {
    if (!ev.$arena || ev.$perseguindo === undefined) continue;  // sumido (voltando ao buraco)
    const cor = ev.$perseguindo ? 'rgba(255, 70, 70, 0.9)' : 'rgba(90, 230, 120, 0.8)';
    const x = ev.screen_x, y = ev.screen_y - TILE / 2;
    g.strokeStyle = cor; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, VISAO * TILE, 0, Math.PI * 2); g.stroke();
    g.fillStyle = cor;
    g.fillText(`${ev.$arena}${ev.$perseguindo ? ' · perseguindo' : ''}`, x, y + TILE);
  }
  g.textAlign = 'left';
  g.fillStyle = 'rgba(0, 0, 0, 0.55)';
  g.fillRect(6, 376, 300, 34);
  g.fillStyle = '#ddd';
  g.fillText(`Arena · raio de visão ${VISAO} tiles · R remonta`, 12, 390);
  g.fillStyle = 'rgba(90, 230, 120, 1)'; g.fillText('verde vagando', 12, 404);
  g.fillStyle = 'rgba(255, 70, 70, 1)'; g.fillText('vermelho perseguindo', 100, 404);
}

export function ligarArena() {
  dano.bloquearRespawn = () => false;
  const camada = criarCamada();
  let montar_ = true;
  addEventListener('keydown', (e) => { if (e.code === 'KeyR') montar_ = true; });
  const update = Graphics.update;
  Graphics.update = async function () {
    if (montar_ && $game_map && (rb.is_a($scene, Scene_Title) || rb.is_a($scene, Scene_Map)) &&
      !$game_map.interpreter.running_p()) {
      montar_ = false;
      await montar();
    }
    if (rb.is_a($scene, Scene_Map) && rb.to_i(rb.idx($game_variables, 2)) < 1) rb.idxSet($game_variables, 2, 4);
    desenhar(camada);
    return update.call(this);
  };
}

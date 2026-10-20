// Puzzle das plataformas giratórias da Caverna (mapa 1; ligado por
// src/ajustes.js). Cinco plataformas (eventos 2 a 6, gráfico "Itens 2") que
// giram com a ação e mostram uma seta; cada uma tem um alvo, e com as cinco
// apontando certo a variável 64 chega a 5 e o portal (30, 5) abre. A corrente:
//   5 (14,15) ↓ → 2 (14,36) → → 3 (38,36) ↑ → 4 (38,21) ← → 6 (30,21) ↑ → portal
// Facilitadores, só visuais (a lógica do evento segue a de 2014):
//   - dica sobre a cabeça: em cima de uma plataforma, uma pílula pequena
//     "Enter para girar" (no celular, "A para girar": src/dispositivo.js);
//   - laser: plataforma apontando para o alvo solta um laser da ponta da seta
//     até a próxima peça (estende com som ao acertar o giro, recolhe ao
//     errar). O laser também é luz (src/luz.js, luzesExtras).
import * as rb from 'rb';
import { botoes } from './dispositivo.js';
import { luzesExtras } from './luz.js';

const MAPA = 1;
const PORTAL = { x: 30, y: 5 };
const ALVO = { 5: 2, 2: 3, 3: 4, 4: 6, 6: PORTAL };   // evento → próximo
const TILE = 32;
// a seta de cada quadro do "Itens 2": [índice, padrão] → direção
const SETA = { '0,0': [0, 1], '1,0': [1, 0], '0,1': [0, -1], '0,2': [-1, 0] };
const CRESCE = 10, ENCOLHE = 6;                       // quadros
const COR = [255, 70, 60];

let feixes = null;   // evento → { sprite, p, ligado }
let spriteset = null, bmpH = null, bmpV = null;
let dica = null, dicaTexto = '';

function perfil(horizontal) {
  // 7 px de espessura: núcleo branco, bordas vermelhas (somado à tela)
  const alfa = [35, 100, 200, 255, 200, 100, 35];
  const b = horizontal ? Bitmap.new(1, 7) : Bitmap.new(7, 1);
  alfa.forEach((a, i) => {
    const branco = i === 3 ? 1 : i === 2 || i === 4 ? 0.45 : 0;
    const c = Color.new(...COR.map((v) => Math.round(v + (255 - v) * branco)), a);
    if (horizontal) b.fill_rect(0, i, 1, 1, c); else b.fill_rect(i, 0, 1, 1, c);
  });
  return b;
}

const centro = (ev) => ({ x: ev.screen_x, y: ev.screen_y - TILE / 2 });
function alvoNaTela(alvo) {
  if (typeof alvo === 'number') return centro(rb.idx($game_map.events, alvo));
  return { x: (alvo.x * 256 - $game_map.display_x + 128) / 8, y: (alvo.y * 256 - $game_map.display_y + 128) / 8 };
}

// a plataforma aponta para o alvo dela?
function aponta(ev, alvo) {
  const seta = SETA[`${ev._character_index},${ev._original_pattern}`];
  if (!seta || rb.str(ev._character_name) !== 'Itens 2') return null;
  const ax = typeof alvo === 'number' ? rb.idx($game_map.events, alvo).x : alvo.x;
  const ay = typeof alvo === 'number' ? rb.idx($game_map.events, alvo).y : alvo.y;
  const dx = Math.sign(ax - ev.x), dy = Math.sign(ay - ev.y);
  return seta[0] === dx && seta[1] === dy ? seta : null;
}

function montar() {
  descartar();
  spriteset = $scene._spriteset;
  bmpH = perfil(true); bmpV = perfil(false);
  feixes = new Map();
  for (const id of Object.keys(ALVO).map(Number)) {
    const s = Sprite.new(spriteset._viewport1);
    s.blend_type = 1; s.z = 80; s.visible = false;
    // quem já começa certo (a plataforma 5) aparece aceso, sem som
    const ev = rb.idx($game_map.events, id);
    const certo = !!(ev && aponta(ev, ALVO[id]));
    feixes.set(id, { s, p: certo ? 1 : 0, ligado: certo });
  }
}

function descartar() {
  if (feixes) for (const f of feixes.values()) f.s.dispose();
  feixes = null; spriteset = null;
  for (const b of [bmpH, bmpV]) if (b && !b.disposed_p()) b.dispose();
  bmpH = bmpV = null;
  luzesExtras.length = 0;
}

function atualizarFeixes() {
  luzesExtras.length = 0;
  const t = Graphics.frame_count;
  for (const [id, f] of feixes) {
    const ev = rb.idx($game_map.events, id);
    const seta = ev && aponta(ev, ALVO[id]);
    if (seta && !f.ligado) Audio.se_play('Audio/SE/Magic', 45, 150);
    f.ligado = !!seta;
    f.p = Math.max(0, Math.min(1, f.p + (f.ligado ? 1 / CRESCE : -1 / ENCOLHE)));
    const s = f.s;
    if (f.p <= 0 || !ev) { s.visible = false; continue; }
    // da ponta da seta (meio tile à frente do centro) até o centro do alvo
    const de = centro(ev), ate = alvoNaTela(ALVO[id]);
    const dir = seta ?? f.dir;
    if (!dir) { s.visible = false; continue; }
    f.dir = dir;
    const x0 = de.x + dir[0] * TILE / 2, y0 = de.y + dir[1] * TILE / 2;
    const total = Math.abs(ate.x - x0) + Math.abs(ate.y - y0);
    const comp = Math.max(1, Math.round(total * f.p));
    s.visible = true;
    s.opacity = 190 + Math.round(55 * Math.sin(t * 0.35 + id));
    if (dir[0]) {
      s.bitmap = bmpH; s.oy = 3; s.zoom_y = 1; s.zoom_x = comp;
      s.x = dir[0] > 0 ? x0 : x0 - comp; s.y = y0;
    } else {
      s.bitmap = bmpV; s.ox = 3; s.zoom_x = 1; s.zoom_y = comp;
      s.y = dir[1] > 0 ? y0 : y0 - comp; s.x = x0;
    }
    // o laser ilumina: luzinhas ao longo dele e um ponto mais forte na ponta
    const cor = COR.map((v) => v / 255);
    for (let d = 48; d < comp; d += 128) luzesExtras.push({ x: x0 + dir[0] * d, y: y0 + dir[1] * d, raio: 56, forca: 0.55 * f.p, cor });
    luzesExtras.push({ x: x0 + dir[0] * comp, y: y0 + dir[1] * comp, raio: 64, forca: 0.8 * f.p, cor });
  }
}

// a pílula "Enter para girar" sobre a cabeça do Brian
function atualizarDica() {
  const em = rb.values($game_map.events).find((ev) => ALVO[rb.to_i(ev._id)] !== undefined && ev.x === $game_player.x && ev.y === $game_player.y);
  const mostrar = !!em && !$game_player.moving_p() && !$game_map.interpreter.running_p() && !$game_message.visible;
  const texto = `${botoes().acao} para girar`;
  if (!dica) {
    dica = Sprite.new(); dica.z = 9000; dica.opacity = 0;
  }
  if (texto !== dicaTexto) {
    dicaTexto = texto;
    dica.bitmap?.dispose();
    const b = Bitmap.new(120, 18);
    b.font.size = 12;
    const w = Math.min(116, b.text_size(texto).width + 12), x = (120 - w) >> 1;
    b.fill_rect(x + 1, 0, w - 2, 18, Color.new(0, 0, 0, 160));
    b.fill_rect(x, 1, w, 16, Color.new(0, 0, 0, 160));
    b.font.color.set(235, 232, 245, 255);
    b.draw_text(0, 1, 120, 16, texto, 1);
    dica.bitmap = b; dica.ox = 60; dica.oy = 18;
  }
  dica.opacity = Math.max(0, Math.min(255, dica.opacity + (mostrar ? 40 : -40)));
  const sobe = Math.round(Math.sin(Graphics.frame_count * 0.12) * 1.5);
  dica.x = $game_player.screen_x; dica.y = $game_player.screen_y - 50 + sobe;
}

function tirarDica() {
  if (!dica) return;
  dica.bitmap?.dispose(); dica.dispose(); dica = null; dicaTexto = '';
}

export const plataformas = {
  // a cada quadro desenhado, antes do desenho
  quadro() {
    if (!rb.is_a($scene, Scene_Map) || $game_map.map_id !== MAPA) {
      if (feixes) descartar();
      tirarDica();
      return;
    }
    if (!feixes || spriteset !== $scene._spriteset) montar();
    atualizarFeixes();
    atualizarDica();
  },
};

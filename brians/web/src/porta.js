// Portas de chave (ligado por src/ajustes.js). As portas trancadas são
// eventos altos (Other3, índice 6: 32×64, dois tiles) que, com a chave
// (variável 10), tocam "Key", ligam o interruptor local A e somem (a página
// A não tem gráfico). Por cima disso:
//   - camada: personagens da mesma prioridade empatam em z e o desempate
//     é a ordem de criação, então o Brian (criado depois) parado acima de
//     uma porta alta ficava desenhado por cima da metade de cima dela, como
//     se tivesse subido na porta. Evento alto com o Brian acima dele (y
//     menor) vai uma camada à frente;
//   - abertura com juice: no instante em que a porta liga o A, uma cópia do
//     sprite dela faz a animação (o evento real some como antes): o ícone
//     da chave salta acima da porta, a porta treme (a chave girando), range
//     (Open1) e gira na dobradiça (estreita para a esquerda, escurece e
//     some), levantando poeira no pé.
import * as rb from 'rb';

const CHAVE = { x: 368, y: 12, w: 20, h: 21 };   // o ícone dentro de Pictures/Chave
const GIRO = 10, FIM = 40;                        // quadros: começa a girar, acaba

let chave = null;
export async function prepararPorta() { chave = await Bitmap.new('Graphics/Pictures/Chave'); }

const spriteDe = (c) => ($scene?._spriteset?._character_sprites ?? []).find((s) => s.character === c);
const suave = (t) => t * t * (3 - 2 * t);

// porta de chave: a página atual gasta uma chave (Variável 10 − 1)
const ehPortaDeChave = (lista) => lista.some((c) => c.code === 122 && rb.idx(c.parameters, 0) === 10 && rb.idx(c.parameters, 2) === 2);

const efeitos = [];
let cena = null;
let poeira = null;

function particulaPoeira(viewport, x, y) {
  if (!poeira || poeira.disposed_p()) {
    poeira = Bitmap.new(2, 2);
    poeira.fill_rect(0, 0, 2, 2, Color.new(170, 160, 150, 255));
  }
  const s = Sprite.new(viewport);
  s.bitmap = poeira; s.z = 300; s.ox = s.oy = 1;
  const vx = (Math.random() - 0.5) * 1.6, vy = -0.2 - Math.random() * 0.7, vida = 22 + (Math.random() * 14 | 0);
  efeitos.push({ s, vida, total: vida, compartilhado: true, x, y,
    passo(e) { e.x += vx; e.y += vy; e.s.x = Math.round(e.x); e.s.y = Math.round(e.y); e.s.opacity = 200 * (e.vida / e.total); } });
}

function abrir(ev, original) {
  const v = original.viewport;
  // a porta: cópia do quadro dela, presa na dobradiça (borda esquerda)
  const r = original.src_rect;
  const porta = Sprite.new(v);
  porta.bitmap = original.bitmap;
  porta.src_rect.set(r.x, r.y, r.width, r.height);
  porta.oy = original.oy;
  porta.z = original.z;
  const largura = r.width;
  efeitos.push({ s: porta, vida: FIM, total: FIM, poeira: false,
    passo(e) {
      const k = FIM - e.vida;                     // quadros desde o começo
      e.s.x = ev.screen_x - (largura >> 1);
      e.s.y = ev.screen_y;
      if (k < GIRO) {                             // a chave girando: tremidinha
        e.s.x += k % 4 < 2 ? 1 : -1;
        return;
      }
      if (k === GIRO) Audio.se_play('Audio/SE/Open1', 70, 85);
      const t = suave(Math.min(1, (k - GIRO) / (FIM - GIRO - 8)));
      e.s.zoom_x = 1 - 0.85 * t;
      e.s.color.set(0, 0, 0, Math.round(150 * t));
      e.s.opacity = k > FIM - 10 ? 255 * (FIM - k) / 10 : 255;
      if (!e.poeira && k >= GIRO + 2) {
        e.poeira = true;
        for (let i = 0; i < 10; i++) particulaPoeira(v, ev.screen_x - 12 + Math.random() * 24, ev.screen_y - 2);
      }
    } });
  // o ícone da chave salta acima da porta e sobe sumindo
  if (chave) {
    const ic = Sprite.new(v);
    ic.bitmap = chave;
    ic.src_rect.set(CHAVE.x, CHAVE.y, CHAVE.w, CHAVE.h);
    ic.ox = CHAVE.w >> 1; ic.oy = CHAVE.h;
    ic.z = original.z + 200;
    efeitos.push({ s: ic, vida: FIM + 4, total: FIM + 4, compartilhado: true,
      passo(e) {
        const k = e.total - e.vida;
        e.s.x = ev.screen_x;
        e.s.y = ev.screen_y - r.height - 2 - (k < 8 ? 0 : (k - 8) * 0.5);
        const pulo = k < 8 ? 1.5 - 0.5 * (k / 8) : 1;
        e.s.zoom_x = e.s.zoom_y = pulo;
        e.s.opacity = k < 4 ? 255 * k / 4 : k > e.total - 14 ? 255 * e.vida / 14 : 255;
      } });
  }
}

export const porta = {
  // Interruptor local A ligado (comando 123) pelo interpretador de uma porta
  // de chave: a animação começa antes de a página trocar
  aoAbrir(interp, params) {
    if (rb.str(rb.idx(params, 0)) !== 'A' || rb.idx(params, 1) !== 0) return;
    if (!ehPortaDeChave(interp._list ?? []) || !(interp._event_id > 0)) return;
    const ev = rb.idx($game_map.events, interp._event_id);
    const original = ev && spriteDe(ev);
    if (!original?.bitmap || !rb.is_a($scene, Scene_Map)) return;
    if (cena !== $scene) this.descartar();
    cena = $scene;
    abrir(ev, original);
  },

  // a cada quadro desenhado, antes do desenho
  quadro() {
    // camada: evento alto à frente do Brian quando o Brian está acima dele
    if (rb.is_a($scene, Scene_Map)) {
      for (const s of $scene._spriteset?._character_sprites ?? []) {
        const c = s.character;
        if (c === $game_player || !(s._ch > 32) || c._priority_type !== 1) continue;
        s.z = c.screen_z() + ($game_player.y < c.y ? 1 : 0);
      }
    }
    if (!efeitos.length) return;
    if ($scene !== cena || !rb.is_a($scene, Scene_Map)) { this.descartar(); return; }
    for (let i = efeitos.length - 1; i >= 0; i--) {
      const e = efeitos[i];
      e.vida -= 1;
      if (e.vida <= 0) { e.s.dispose(); efeitos.splice(i, 1); } else e.passo(e);
    }
  },

  descartar() {
    for (const e of efeitos) e.s.dispose();
    efeitos.length = 0;
  },
};

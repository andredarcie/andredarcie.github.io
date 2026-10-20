// Dano com juice (ligado por src/ajustes.js). Quando um inimigo
// pega o Brian, o evento original (Bite, vida − 1, pulinho, inimigo volta ao
// buraco) segue igual; por cima dele:
//   - parada de impacto (alguns quadros congelados), tremor e clarão
//     vermelho na tela e o Brian pisca em vermelho (sem texto de "−1");
//   - o coração perdido salta da HUD, racha em duas metades que caem
//     girando e solta faíscas;
//   - o inimigo se extingue: clarão branco, achata, é puxado para cima
//     num redemoinho de fumaça e some, com som de dissipação.
// Fantasma derrotado não volta: a página escondida do fantasma (gatilho
// paralelo com o interruptor local A) esperava e desligava o A, e ele
// reaparecia no buraco; agora o A fica ligado, e isso vai no save.
import * as rb from 'rb';

const FANTASMA = 'RetroMonster-2';
const PARADA = 7;            // quadros de parada no impacto
const CORACAO = { x: 12, y: 14, passo: 23, tam: 18 };

const limitar = (v) => Math.max(0, Math.min(1, v));

let vidas = null;            // Vida_4: os corações cheios, para recortar
export async function prepararDano() { vidas = await Bitmap.new('Graphics/Pictures/Vida_4'); }

// ---------------------------------------------------------------- consultas ao jogo
const evento = (id) => (id > 0 ? rb.idx($game_map.events, id) : null);
const graficoBase = (ev) => rb.str(ev?._event?.pages?.[0]?.graphic?.character_name ?? '');
const spriteDe = (personagem) => ($scene?._spriteset?._character_sprites ?? []).find((s) => s.character === personagem);

// página de dano: encostar (gatilho 2) que tira 1 da vida e manda o inimigo de volta
function ehPaginaDeDano(lista) {
  return lista.some((c) => c.code === 203) && lista.some((c) => c.code === 205);
}

// ---------------------------------------------------------------- efeitos
const efeitos = [];
let piscando = 0;            // quadros de piscar do Brian
let cena = null;             // a cena dos efeitos (morrer recarrega o checkpoint numa cena nova)

function bitmapCor(c, tam = 3) {
  const b = Bitmap.new(tam, tam);
  b.fill_rect(0, 0, tam, tam, Color.new(...c));
  return b;
}
const CORES_PARTICULA = new Map();
function particula(viewport, x, y, c, { vx = 0, vy = 0, g = 0.12, vida = 28, z = 300, tam = 3 } = {}) {
  const k = `${c.join(',')}/${tam}`;
  if (!CORES_PARTICULA.has(k) || CORES_PARTICULA.get(k).disposed_p()) CORES_PARTICULA.set(k, bitmapCor(c, tam));
  const s = Sprite.new(viewport);
  s.bitmap = CORES_PARTICULA.get(k);
  s.z = z; s.ox = s.oy = tam >> 1;
  efeitos.push({ s, x, y, vx, vy, g, vida, total: vida, compartilhado: true,
    passo(e) { e.vy += e.g; e.x += e.vx; e.y += e.vy; e.s.x = Math.round(e.x); e.s.y = Math.round(e.y); e.s.opacity = 255 * (e.vida / e.total); } });
}

// o inimigo se extingue: cópia do sprite dele no lugar do toque
function extinguir(spriteInimigo, fantasma) {
  const v = spriteInimigo.viewport;
  const s = Sprite.new(v);
  s.bitmap = spriteInimigo.bitmap;
  const r = spriteInimigo.src_rect;
  s.src_rect.set(r.x, r.y, r.width, r.height);
  s.ox = r.width >> 1; s.oy = r.height;
  const x0 = spriteInimigo.x - spriteInimigo.ox + (r.width >> 1), y0 = spriteInimigo.y - spriteInimigo.oy + r.height;
  s.x = x0; s.y = y0; s.z = spriteInimigo.z + 2;
  const cx = x0, cy = y0 - (r.height >> 1);
  // anel de fumaça e brilho
  const fumaca = fantasma ? [200, 190, 255, 255] : [255, 170, 80, 255];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    particula(v, cx, cy, fumaca, { vx: Math.cos(a) * 2.6, vy: Math.sin(a) * 2.6, g: 0, vida: 22, z: s.z + 1 });
  }
  efeitos.push({ s, vida: 46, total: 46, compartilhado: true,
    passo(e) {
      const t = e.total - e.vida;
      if (t < 6) {
        // clarão branco e esmagamento do impacto
        e.s.color.set(255, 255, 255, 255 - t * 20);
        e.s.zoom_x = 1 + 0.5 * Math.sin((t / 6) * Math.PI); e.s.zoom_y = 1 - 0.3 * Math.sin((t / 6) * Math.PI);
      } else {
        // puxado para cima, afinando, girando a fumaça em volta
        const u = limitar((t - 6) / 40);
        e.s.color.set(fantasma ? 190 : 255, fantasma ? 180 : 140, 255, 120 + 100 * u);
        e.s.zoom_x = Math.max(0.05, 1 - u * 0.95); e.s.zoom_y = 1 + u * 1.4;
        e.s.y = y0 - Math.round(u * u * 26);
        e.s.opacity = 255 * (1 - u);
        if (t % 2 === 0) {
          const a = t * 0.7, raio = 14 * (1 - u);
          particula(v, cx + Math.cos(a) * raio, cy - u * 20 + Math.sin(a) * raio * 0.4, fumaca, { vy: -1.2, g: -0.02, vida: 24, z: e.s.z + 1 });
        }
      }
    } });
  Audio.se_play('Audio/SE/Collapse1', 85, fantasma ? 115 : 140);
  Audio.se_play('Audio/SE/Darkness1', 55, 150);
}

// o coração perdido salta da HUD e racha em duas metades
function perderCoracao(indice) {
  if (!vidas || indice < 0 || indice > 3) return;
  const x = CORACAO.x + CORACAO.passo * indice, y = CORACAO.y, t = CORACAO.tam;
  const metade = (lado) => {
    const s = Sprite.new();
    s.bitmap = vidas;
    s.src_rect.set(x + (lado ? t / 2 : 0), y, t / 2, t);
    s.ox = lado ? 0 : t / 2; s.oy = t / 2;
    s.x = x + t / 2; s.y = y + t / 2; s.z = 9100;
    return s;
  };
  const esq = metade(0), dir = metade(1);
  const cx = x + t / 2, cy = y + t / 2;
  const efeito = (s, lado) => ({ s, vida: 64, total: 64, compartilhado: true, vx: lado ? 1.3 : -1.3, vy: -2.6, px: cx, py: cy,
    passo(e) {
      const k = e.total - e.vida;
      if (k < 16) {
        // salta e pulsa branco, inteiro
        const u = k / 16;
        e.s.zoom_x = e.s.zoom_y = 1 + Math.sin(u * Math.PI) * 1.1;
        e.s.color.set(255, 255, 255, Math.round(200 * (1 - u)));
        e.s.x = cx + (k < 12 ? Math.round((Math.random() - 0.5) * 3) : 0);
        e.s.y = cy + Math.round(Math.sin(u * Math.PI) * 6);
        if (k === 15) {
          Audio.se_play('Audio/SE/Blow3', 60, 130);
          for (let i = 0; i < 10; i++) particula(null, cx, cy, [255, 60, 60, 255], { vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3, vida: 26, z: 9101, tam: 2 });
        }
      } else {
        // rachou: cada metade cai girando
        e.vy += 0.22; e.px += e.vx; e.py += e.vy;
        e.s.x = Math.round(e.px + (lado ? 2 : -2)); e.s.y = Math.round(e.py + 6);
        e.s.angle = (lado ? -1 : 1) * (k - 16) * 6;
        e.s.zoom_x = e.s.zoom_y = 1.2;
        e.s.opacity = 255 * Math.min(1, e.vida / 20);
      }
    } });
  efeitos.push(efeito(esq, 0), efeito(dir, 1));
}

// ---------------------------------------------------------------- API
export const dano = {
  // há animação de dano rodando (aí as cutscenes não aceleram)
  ativo() { return efeitos.length > 0 || piscando > 0; },

  // Variável 2 − 1 numa página de dano: dispara tudo e segura a parada de
  // impacto (desenhar() desenha um quadro sem rodar a lógica do jogo)
  async aoPerderVida(interp, desenhar) {
    const ev = evento(interp._event_id);
    if (!ev || !ehPaginaDeDano(interp._list ?? [])) return;
    if (cena !== $scene) this.descartar();
    cena = $scene;
    const vida = rb.to_i(rb.idx($game_variables, 2));
    const spriteInimigo = spriteDe(ev);
    const fantasma = graficoBase(ev) === FANTASMA;
    if (spriteInimigo?.bitmap) { extinguir(spriteInimigo, fantasma); ev.$escondidoAte = { x: ev.x, y: ev.y }; }
    perderCoracao(vida - 1);
    piscando = 70;
    $game_map.screen.start_shake(6, 9, 14);
    $game_map.screen.start_flash(Color.new(255, 40, 40, 140), 14);
    Audio.se_play('Audio/SE/Damage2', 70, 90);
    for (let i = 0; i < PARADA; i++) await desenhar();
  },

  // A desligado na página escondida de um fantasma = respawn: não acontece mais
  bloquearRespawn(interp, params) {
    if (rb.str(rb.idx(params, 0)) !== 'A' || rb.to_i(rb.idx(params, 1)) !== 1) return false;
    const ev = evento(interp._event_id);
    if (!ev || graficoBase(ev) !== FANTASMA) return false;
    const pagina = ev._page;
    return !!pagina && pagina.trigger === 4 && rb.str(pagina.graphic.character_name) === '';
  },

  // a cada quadro desenhado, antes do desenho
  quadro() {
    if (!efeitos.length && !piscando) return;
    if ($scene !== cena || !rb.is_a($scene, Scene_Map)) { this.descartar(); return; }
    for (let i = efeitos.length - 1; i >= 0; i--) {
      const e = efeitos[i];
      e.vida -= 1;
      if (e.vida <= 0) {
        if (!e.compartilhado && e.s.bitmap) e.s.bitmap.dispose();
        e.s.dispose();
        efeitos.splice(i, 1);
      } else e.passo(e);
    }
    // o inimigo real some na hora (a cópia faz a extinção); volta quando sai do lugar
    for (const s of $scene._spriteset?._character_sprites ?? []) {
      const c = s.character, onde = c?.$escondidoAte;
      if (!onde) continue;
      if (c.x === onde.x && c.y === onde.y) s.visible = false; else c.$escondidoAte = null;
    }
    // Brian: vermelho no começo, depois pisca
    if (piscando > 0) {
      piscando -= 1;
      const s = spriteDe($game_player);
      if (s) {
        const k = 70 - piscando;
        s.color.set(255, 40, 40, k < 10 ? 200 - k * 12 : 0);
        s.visible = piscando === 0 || Math.floor(piscando / 3) % 2 === 0;
      }
    }
  },

  descartar() {
    for (const e of efeitos) { if (!e.compartilhado && e.s.bitmap) e.s.bitmap.dispose(); e.s.dispose(); }
    efeitos.length = 0;
    piscando = 0;
  },
};

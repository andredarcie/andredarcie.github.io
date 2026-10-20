// Luz e sombra 2D (ligada por src/ajustes.js; &semluz desliga, para comparar).
// A cada quadro o Spriteset_Map entrega ao viewport do mapa (viewport1) as
// fontes de luz visíveis; o renderizador (src/rgss/render.js, efeitoLuz)
// troca o tom chapado da tela por escuro + poças de luz.
//   - fontes: o Brian (luz fraca, neutra) e os objetos acesos dos gráficos
//     !Flame, Other2 e Other3 (braseiros laranja, azuis e verdes — as tochas
//     azuis —, velas, lampiões, candelabros, fogueiras, bolas de fogo). Nesses gráficos a
//     direção escolhe a variante do objeto, então a luz vem de nome +
//     índice + direção; as variantes apagadas não brilham. Chamas tremulam;
//   - o escuro vem do tom de tela do próprio mapa (quanto mais escuro o tom,
//     mais escuro fora da luz). Ligar ou não é decidido pelo MAPA (tom escuro
//     ou alguma luminária em qualquer página de evento), não pelo que está
//     na tela: antes, num mapa claro, a iluminação inteira ligava e desligava
//     cada vez que a única luminária entrava ou saía da tela (pisca-pisca).
//     O escuro muda devagar. Mapa claro e sem nenhuma luminária fica
//     idêntico ao original (vp.luz = null, o tom de sempre).
import * as rb from 'rb';

const MAX = 32;   // igual a MAX_LUZES de src/rgss/render.js
// luzes de fora dos eventos (os lasers do puzzle, src/plataformas.js): em
// coordenadas de tela, { x, y, raio, forca, cor }, refeitas a cada quadro
export const luzesExtras = [];
const TILE = 32;
// [raio em px, intensidade, cor, tremula]
const LARANJA = [120, 1.0, [1.0, 0.62, 0.3], true];
const AZUL = [120, 1.0, [0.45, 0.7, 1.0], true];
const VERDE = [120, 1.0, [0.45, 1.0, 0.55], true];
const BRASA = [64, 0.6, [1.0, 0.45, 0.2], true];
const VELA = [88, 0.85, [1.0, 0.8, 0.5], true];
const FOGUEIRA = [140, 1.05, [1.0, 0.55, 0.25], true];
const FOGO_GRANDE = [160, 1.1, [1.0, 0.5, 0.2], true];
const BOLA = [72, 0.8, [1.0, 0.55, 0.25], true];
const BOLA_AZUL = [72, 0.8, [0.4, 0.65, 1.0], true];
const BRIAN = [100, 0.6, [1.0, 0.9, 0.75], false];

// gráfico → índice → direção (2, 4, 6, 8) → luz; '*' vale para todas
const FONTES = {
  '!Flame': {
    0: { 2: LARANJA, 4: AZUL, 8: VELA },        // braseiros e candelabro (6: lampião apagado)
    1: { 2: VELA, 4: VELA, 6: VELA },           // vela, lampião, candelabro (8: apagados)
    2: { 2: FOGUEIRA, 4: FOGUEIRA },            // fogueira (6, 8: lenha apagada)
    3: { 2: FOGO_GRANDE, 4: FOGO_GRANDE },
    4: { '*': BOLA },
    5: { '*': BOLA_AZUL },
  },
  Other2: {
    2: { '*': FOGUEIRA },                       // faixas de fogo
    3: { '*': BOLA },
    6: { 2: FOGO_GRANDE, 4: FOGUEIRA, 6: FOGUEIRA, 8: BRASA },
    7: { 2: AZUL, 4: VERDE, 6: LARANJA },       // braseiros (8: apagado)
  },
  Other3: { 0: { 2: VELA, 4: VELA, 6: VELA } }, // vela, lampião, candelabro (8: apagados)
};

function fonteDe(c) {
  if (c._transparent || c._opacity === 0) return null;
  const porIndice = FONTES[rb.str(c._character_name)];
  const porDirecao = porIndice?.[c._character_index];
  return porDirecao?.[c._direction] ?? porDirecao?.['*'] ?? null;
}

// tremulação leve, em degraus de 6 quadros, cada fonte no seu ritmo (forte
// demais, a borda da luz em degraus pulava de um degrau para o outro)
function tremor(t, semente) {
  const q = Math.floor(t / 6);
  return 0.96 + 0.025 * Math.sin(q * 0.7 + semente * 1.7) + 0.015 * Math.sin(q * 1.9 + semente * 3.1);
}

// o mapa tem alguma luminária em alguma página de evento?
function mapaComLuz() {
  return rb.values($game_map.events).some((ev) => (ev._event?.pages ?? []).some((p) => {
    const g = p.graphic, porIndice = FONTES[rb.str(g.character_name)]?.[g.character_index];
    return !!(porIndice?.[g.direction] ?? porIndice?.['*']);
  }));
}

export function prepararLuz() {
  if (new URLSearchParams(location.search).has('semluz')) return;
  const luzes = new Float32Array(MAX * 4), cores = new Float32Array(MAX * 3);
  const update = Spriteset_Map.prototype.update;
  Spriteset_Map.prototype.update = async function () {
    const r = await update.call(this);
    const vp = this._viewport1?.$js;
    if (!vp) return r;
    const t = Graphics.frame_count;
    const fontes = [];
    for (const s of this._character_sprites ?? []) {
      const c = s.character;
      const f = c && c !== $game_player && fonteDe(c);
      if (!f) continue;
      const x = c.screen_x, y = c.screen_y - TILE / 2;
      if (x < -f[0] || x > Graphics.width + f[0] || y < -f[0] || y > Graphics.height + f[0]) continue;
      const k = f[3] ? tremor(t, rb.to_i(c._id ?? 0)) : 1;
      fontes.push({ x, y, raio: f[0], forca: f[1] * k, cor: f[2] });
    }
    for (const f of luzesExtras) {
      if (f.x < -f.raio || f.x > Graphics.width + f.raio || f.y < -f.raio || f.y > Graphics.height + f.raio) continue;
      fontes.push(f);
    }
    const tom = $game_map.screen.tone;
    const media = (tom.red + tom.green + tom.blue) / 3;
    const breu = Math.max(0, Math.min(1, -media / 90));
    this.$comLuz ??= mapaComLuz();
    // qualquer tom escurecido liga (o leve azulado do Hall, herdado pela
    // Lareira e outras salas sem vela, tem breu ≈ 0,06; com o corte em 0,1
    // essas salas ficavam sem luz nenhuma, nem a do Brian)
    const alvo = breu > 0.03 || this.$comLuz ? Math.min(0.6, 0.2 + 0.45 * breu) : 0;
    this.$escuro = this.$escuro === undefined ? alvo : this.$escuro + Math.max(-0.01, Math.min(0.01, alvo - this.$escuro));
    if (this.$escuro <= 0 && alvo <= 0) { vp.luz = null; return r; }
    const px = $game_player.screen_x, py = $game_player.screen_y - TILE / 2;
    fontes.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py));
    fontes.unshift({ x: px, y: py, raio: BRIAN[0], forca: BRIAN[1], cor: BRIAN[2] });
    const n = Math.min(MAX, fontes.length);
    for (let i = 0; i < n; i++) {
      const f = fontes[i];
      luzes.set([f.x, f.y, f.raio, f.forca], i * 4);
      cores.set(f.cor, i * 3);
    }
    vp.luz = { escuro: this.$escuro, n, luzes, cores };
    return r;
  };
}

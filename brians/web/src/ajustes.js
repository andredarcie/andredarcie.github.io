// Ajustes de jogabilidade por cima dos scripts do jogo (jogo/, que continuam
// iguais ao jogo de 2014). Ficam desligados em ?gravar/?replay, para os
// replays seguirem o jogo original quadro a quadro, e em &original.
//   - cutscenes 2×: enquanto o interpretador do mapa roda (evento automático
//     ou acionado; o jogador não anda), um quadro em cada dois não é
//     desenhado nem esperado. Tudo que conta quadros (esperas, rotas,
//     texto, fades, partículas) anda 2× mais rápido; a música não muda.
//   - pular cutscene: em evento automático ou comum (a introdução inclusive),
//     segurar C (Enter/espaço/Z, ou A no controle de toque) avança a cena até o
//     fim em alta velocidade: a lógica roda quadro a quadro (rotas,
//     interruptores, teleportes ficam como se a cena tivesse sido vista),
//     só 1 quadro em AVANCO é desenhado, as mensagens passam sozinhas e os
//     efeitos sonoros ficam mudos. Para no fim da cena (a seguinte pede
//     outro "segurar"), em escolhas e nos tutoriais.
//   - tutoriais refeitos (src/tutoriais.js): as imagens Ajuda_1…5 viram um
//     cartão animado desenhado por código; Enter pula. Enquanto o cartão está
//     na tela as cutscenes não aceleram (dá tempo de ler).
//   - dano com juice e fantasma derrotado para sempre (src/dano.js).
import * as rb from 'rb';
import { prepararTutoriais, tutorial } from './tutoriais.js';
import { prepararDano, dano } from './dano.js';
import { botoes } from './dispositivo.js';

const SEGURAR = 40;        // quadros segurando C para pular
const AVANCO = 40;         // quadros de lógica por quadro desenhado ao pular
const LIMITE = 30000;      // trava de segurança do avanço (quadros de lógica)

const emCutscene = () =>
  rb.is_a($scene, Scene_Map) && $game_map?.interpreter?.running_p() === true;

// cutscene pulável: evento automático (gatilho 3) ou evento comum (id 0)
function pulavel() {
  if (!emCutscene() || tutorial.emUso()) return false;
  if ($game_message.visible && $game_message.choice_max > 0) return false;
  const id = $game_map.interpreter._event_id;
  if (id === 0) return true;
  return rb.idx($game_map.events, id)?.trigger === 3;
}

export async function aplicarAjustes() {
  await Promise.all([prepararTutoriais(), prepararDano()]);
  const pressionado = Input.press_p.bind(Input);

  // ------------------------------------------------------------ pular cutscene
  let segurando = 0, avancando = 0, tempoPulavel = 0, dica = null, veu = null, cenaAlvo = null;

  // dica discreta no topo, centralizada (no celular os botões ficam embaixo):
  // "Segure Enter para pular" no teclado, "Segure A para pular" no toque, com
  // um traço que enche enquanto segura
  const LARGURA_DICA = 220;
  const tirarDica = () => { if (dica) { dica.bitmap.dispose(); dica.dispose(); dica = null; } };
  const desenharDica = (fracao) => {
    if (!dica) {
      dica = Sprite.new();
      dica.bitmap = Bitmap.new(LARGURA_DICA, 20);
      dica.x = (Graphics.width - LARGURA_DICA) >> 1; dica.y = 6; dica.z = 9999;
      dica.opacity = 0;
      dica.$chave = '';
    }
    dica.opacity = fracao > 0 ? 255 : Math.min(180, dica.opacity + 12);
    const texto = `Segure ${botoes().acao} para pular`;
    const chave = `${texto}/${Math.round(fracao * 24)}`;
    if (dica.$chave === chave) return;
    dica.$chave = chave;
    const b = dica.bitmap;
    b.clear();
    b.font.size = 13;
    const w = Math.min(LARGURA_DICA - 12, b.text_size(texto).width), x = (LARGURA_DICA - w) >> 1;
    // pílula escura translúcida: lê-se também em cena clara (névoa, flash)
    b.fill_rect(x - 6, 1, w + 12, 18, Color.new(0, 0, 0, 90));
    b.fill_rect(x - 5, 0, w + 10, 1, Color.new(0, 0, 0, 90));
    b.fill_rect(x - 5, 19, w + 10, 1, Color.new(0, 0, 0, 90));
    b.font.color.set(235, 232, 245, 255);
    b.draw_text(0, 1, LARGURA_DICA, 16, texto, 1);
    if (fracao > 0) {
      b.fill_rect(x, 17, w, 1, Color.new(255, 255, 255, 60));
      b.fill_rect(x, 17, Math.round(w * fracao), 1, Color.new(150, 196, 255, 255));
    }
  };
  const tirarVeu = () => { if (veu) { veu.bitmap.dispose(); veu.dispose(); veu = null; } };
  const comecarAvanco = () => {
    avancando = 1;
    // só esta cena: o avanço para quando o interpretador troca de lista
    // (a próxima cena automática pede outro "segurar")
    cenaAlvo = $game_map.interpreter._list;
    tirarDica();
    veu = Sprite.new();
    veu.bitmap = Bitmap.new(Graphics.width, Graphics.height);
    veu.bitmap.fill_rect(0, 0, Graphics.width, Graphics.height, Color.new(0, 0, 0, 110));
    veu.bitmap.font.size = 13;
    veu.bitmap.font.color.set(150, 196, 255, 255);
    veu.bitmap.draw_text(0, 6, Graphics.width, 16, 'Pulando…', 1);
    veu.z = 9998;
  };
  const pararAvanco = () => { avancando = 0; segurando = 0; tirarVeu(); };

  // a cada quadro desenhado: a dica de pular e a contagem
  const atualizarPulo = () => {
    if (!pulavel()) { tempoPulavel = 0; segurando = 0; tirarDica(); return; }
    tempoPulavel += 1;
    segurando = pressionado(Input.C) ? segurando + 1 : 0;
    if (segurando >= SEGURAR) { comecarAvanco(); return; }
    if (tempoPulavel >= 20) desenharDica(segurando / SEGURAR); else tirarDica();
  };

  // ------------------------------------------------------------ Graphics
  const update = Graphics.update, transition = Graphics.transition;
  let pulouQuadro = false;
  Graphics.update = async function () {
    if (avancando) {
      avancando += 1;
      if (!emCutscene() || $game_map.interpreter._list !== cenaAlvo || tutorial.emUso() || avancando > LIMITE ||
        ($game_message.visible && $game_message.choice_max > 0)) pararAvanco();
      else if (avancando % AVANCO !== 0) { Graphics.frame_count += 1; return; }
      else return update.call(this);
    }
    if (emCutscene() && !tutorial.ativo() && !dano.ativo() && !pulouQuadro) {
      pulouQuadro = true;
      Graphics.frame_count += 1;
      return;
    }
    pulouQuadro = false;
    atualizarPulo();
    return desenhar();
  };
  // um quadro desenhado (também usado na parada de impacto, sem lógica)
  const desenhar = () => {
    tutorial.quadro();
    dano.quadro();
    return update.call(Graphics);
  };
  Graphics.transition = function (duration = 10, ...resto) {
    if (avancando) return transition.call(this, 0, ...resto);
    return transition.call(this, emCutscene() ? Math.ceil(rb.to_i(duration) / 2) : duration, ...resto);
  };

  // ao pular: mensagens passam sozinhas (C a cada dois quadros) e sem SE/ME
  const trigger = Input.trigger_p.bind(Input);
  Input.trigger_p = function (b) {
    if (avancando && rb.to_i(b) === Input.C && $game_message.visible) return avancando % 2 === 0;
    return trigger(b);
  };
  Input.press_p = function (b) {
    if (avancando && rb.to_i(b) === Input.C && $game_message.visible) return true;
    return pressionado(b);
  };
  const se = Audio.se_play, me = Audio.me_play;
  Audio.se_play = function (...a) { return avancando ? null : se.apply(this, a); };
  Audio.me_play = function (...a) { return avancando ? null : me.apply(this, a); };

  // depuração pelo console
  globalThis.__ajustes = { tutorial, estado: () => ({ avancando, segurando, tempoPulavel }) };

  // ------------------------------------------------------------ esperas
  const command_230 = Game_Interpreter.prototype.command_230;
  Game_Interpreter.prototype.command_230 = function () {
    if (avancando || tutorial.pulado()) { this._wait_count = 0; return true; }
    const r = command_230.call(this);
    tutorial.ler(this);
    return r;
  };

  // ------------------------------------------------------------ dano
  // Variável 2 (vida) − 1: a animação de dano antes de a vida cair
  const command_122 = Game_Interpreter.prototype.command_122;
  Game_Interpreter.prototype.command_122 = async function () {
    const p = this._params;
    if (!avancando && rb.idx(p, 0) === 2 && rb.idx(p, 1) === 2 && rb.idx(p, 2) === 2 && rb.idx(p, 3) === 0 && rb.idx(p, 4) === 1) {
      await dano.aoPerderVida(this, desenhar);
    }
    return command_122.call(this);
  };
  // fantasma derrotado não volta: a página escondida não desliga mais o A
  const command_123 = Game_Interpreter.prototype.command_123;
  Game_Interpreter.prototype.command_123 = function () {
    if (dano.bloquearRespawn(this, this._params)) return true;
    return command_123.call(this);
  };

  // ------------------------------------------------------------ tutoriais
  // Mostrar Imagem Ajuda_N: a imagem vai sem nome (a figura fica para o
  // tempo do evento) e o cartão toma o lugar; Mover Imagem 8 para y=0 é a
  // entrada e para y=80 a saída.
  const command_231 = Game_Interpreter.prototype.command_231;
  Game_Interpreter.prototype.command_231 = function () {
    const m = /^Ajuda_(\d)$/.exec(rb.str(rb.idx(this._params, 1)));
    if (m && tutorial.mostrar(Number(m[1]))) {
      const params = [...this._params];
      params[1] = '';
      this._params = params;
    }
    return command_231.call(this);
  };
  const command_232 = Game_Interpreter.prototype.command_232;
  Game_Interpreter.prototype.command_232 = function () {
    if (rb.idx(this._params, 0) === 8 && rb.idx(this._params, 3) === 0) {
      const y = rb.idx(this._params, 5);
      if (y === 0) tutorial.entrar();
      else if (y === 80) tutorial.sair();
    }
    return command_232.call(this);
  };
}

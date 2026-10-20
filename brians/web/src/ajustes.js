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
//   - abertura sem texto (src/abertura.js): no lugar da imagem que contava
//     a história, o Brian joga bola na Floresta até chutar a bola na mansão.
//   - portas de chave (src/porta.js): a porta alta cobre o Brian quando ele
//     está acima dela, e abre com animação (chave, tremida, giro, poeira).
//   - puzzle das plataformas da Caverna (src/plataformas.js): dica "Enter
//     para girar" sobre a cabeça e laser de cada plataforma que aponta certo.
//   - luz e sombra 2D (src/luz.js; &semluz desliga): escuro pelo tom do mapa
//     e poças de luz no Brian, velas, braseiros e chamas.
//   - visão dos inimigos: fantasma, caveira e dragãozinho só perseguem o
//     Brian dentro de um raio, com balão "!" ao ver e "?" ao perder.
import * as rb from 'rb';
import { prepararTutoriais, tutorial } from './tutoriais.js';
import { prepararDano, dano } from './dano.js';
import { prepararAbertura } from './abertura.js';
import { prepararLuz } from './luz.js';
import { prepararPorta, porta } from './porta.js';
import { plataformas } from './plataformas.js';
import { botoes } from './dispositivo.js';

export const VISAO = 5;    // raio de visão dos inimigos, em tiles
const SEGURAR = 40;        // quadros segurando C para pular
const AVANCO = 40;         // quadros de lógica por quadro desenhado ao pular
const LIMITE = 30000;      // trava de segurança do avanço (quadros de lógica)

// avanço rápido pedido de fora (src/fases.js): roda como o "pular cutscene"
// até fim() dar true; o véu mostra o texto
let avancoPedido = null;
export function avancarAte(fim, texto) { avancoPedido = { fim, texto }; }

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
  await Promise.all([prepararTutoriais(), prepararDano(), prepararPorta()]);
  prepararAbertura();
  prepararLuz();
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
  let fimAvanco = null;
  const comecarAvanco = (texto = 'Pulando…') => {
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
    veu.bitmap.draw_text(0, 6, Graphics.width, 16, texto, 1);
    veu.z = 9998;
  };
  const pararAvanco = () => { avancando = 0; segurando = 0; fimAvanco = null; tirarVeu(); };

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
    if (avancoPedido) {
      const { fim, texto } = avancoPedido;
      avancoPedido = null;
      if (avancando) pararAvanco();
      comecarAvanco(texto);
      fimAvanco = fim;
    }
    if (avancando) {
      avancando += 1;
      const acabou = fimAvanco ? fimAvanco()
        : !emCutscene() || $game_map.interpreter._list !== cenaAlvo || tutorial.emUso();
      if (acabou || avancando > LIMITE || ($game_message.visible && $game_message.choice_max > 0)) pararAvanco();
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
    porta.quadro();
    plataformas.quadro();
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
    porta.aoAbrir(this, this._params);
    return command_123.call(this);
  };

  // ------------------------------------------------------------ visão dos inimigos
  // Os inimigos com movimento "aproximar" perseguiam o Brian de qualquer
  // ponto do mapa (só desistiam a 20 passos) e se amontoavam nas portas.
  // Todos são do RetroMonster-2: fantasma (índice 0), caveira (1), dragãozinho
  // da caverna (3) e o Chefe (5). Agora cada um, menos o Chefe, tem um
  // círculo de visão de VISAO tiles: fora dele vaga à toa; dentro, persegue
  // como antes. Saiu do círculo, volta a vagar, então fugir funciona. As
  // chamas (!Flame) seguem como antes.
  // Vagar não usa o "aleatório" do VX: metade dele é "um passo à frente", e
  // o inimigo que acabou de perder o Brian está virado para ele, então
  // seguia reto até entrar no círculo de novo. Aqui é passo em direção
  // sorteada (4 em 6) ou pausa (2 em 6).
  // $perseguindo guarda o estado (campos $ não vão para o save). Ele é
  // conferido a cada quadro, e a virada mostra um balão do VX (Balloon.png)
  // na cabeça do inimigo: "!" ao ver o Brian, "?" ao perdê-lo (este sobe e
  // some no fim). Sem balão com evento rodando (dano, cutscene).
  // A arena de teste (?arena, src/arena.js) mostra os círculos.
  // Também os de movimento "aleatório" (três fantasmas d'Os Quartos, que
  // antes nunca perseguiam): todo inimigo usa a mesma IA.
  const perseguir = Game_Character.prototype.move_type_toward_player;
  const temVisao = (c) => rb.is_a(c, Game_Event) && (c._move_type === 1 || c._move_type === 2) &&
    rb.str(c._character_name) === 'RetroMonster-2' && rb.str(c._event?.name ?? '') !== 'Chefe';
  const olhar = (c) => {
    const dx = rb.to_i(c._x) - rb.to_i($game_player.x), dy = rb.to_i(c._y) - rb.to_i($game_player.y);
    const antes = c.$perseguindo, agora = dx * dx + dy * dy <= VISAO * VISAO;
    c.$perseguindo = agora;
    if (agora === !!antes || $game_map.interpreter.running_p()) return;
    if (agora) { c.balloon_id = 1; c.$balaoSobe = false; } else if (antes) { c.balloon_id = 2; c.$balaoSobe = true; }
  };
  const decidir = async (c) => {
    olhar(c);
    if (c.$perseguindo) return await perseguir.call(c);
    if (rb.rand(6) < 4) return await c.move_random();
    return c._stop_count = 0;
  };
  Game_Character.prototype.move_type_toward_player = async function () {
    return temVisao(this) ? await decidir(this) : await perseguir.call(this);
  };
  const aleatorio = Game_Character.prototype.move_type_random;
  Game_Character.prototype.move_type_random = async function () {
    return temVisao(this) ? await decidir(this) : await aleatorio.call(this);
  };
  const updateEvento = Game_Event.prototype.update;
  Game_Event.prototype.update = async function () {
    const r = await updateEvento.call(this);
    // página que não persegue (fugir, apagado…): esquece o estado, para não
    // soltar um "?" quando a página de perseguir voltar
    if (temVisao(this)) olhar(this); else this.$perseguindo = undefined;
    return r;
  };
  // "?": nos últimos SOBE quadros (o desenho já está completo) sobe e some
  const SOBE = 20;
  const startBalloon = Sprite_Character.prototype.start_balloon;
  Sprite_Character.prototype.start_balloon = async function () {
    this.$sobe = !!this._character?.$balaoSobe;
    if (this._character) this._character.$balaoSobe = false;
    return await startBalloon.call(this);
  };
  const updateBalloon = Sprite_Character.prototype.update_balloon;
  Sprite_Character.prototype.update_balloon = function () {
    const r = updateBalloon.call(this);
    const b = this._balloon_sprite;
    if (b && this.$sobe && this._balloon_duration < SOBE) {
      const k = 1 - this._balloon_duration / SOBE;
      b.y -= Math.round(k * k * 16);
      b.opacity = Math.round(255 * (1 - k));
    } else if (b) b.opacity = 255;
    return r;
  };

  // ------------------------------------------------------------ tutoriais
  // Mostrar Imagem Ajuda_N: a imagem vai sem nome (a figura fica para o
  // tempo do evento) e o cartão toma o lugar; Mover Imagem 8 para y=0 é a
  // entrada e para y=80 a saída.
  const command_231 = Game_Interpreter.prototype.command_231;
  Game_Interpreter.prototype.command_231 = function () {
    // a tela de "Inventário" dos Quartos (tecla X) é uma imagem de 16 vagas que
    // nada preenche no jogo: não aparece mais (o evento original continua)
    if (rb.str(rb.idx(this._params, 1)) === 'Inventario') return true;
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

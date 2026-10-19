// 099 - Simples Pause: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//================================================================
// RPG Maker VX
// Simple Pause
// Autor : Desconhecido
// Modificado por: Atoa
// Tradução : LegendsX
// Disponibilizado por : Darknan
// Versão : 2.0
//================================================================
// Apertando a tecla A, é possivel pausar o jogo!
//================================================================
globalThis.TRCS19_STOPPING = rb.modulo("TRCS19_STOPPING");
// Botão de Pausa
TRCS19_STOPPING.PAUSE_BUTTON = "B";
// Texto da pausa
TRCS19_STOPPING.PAUSE_TEXT = "Pause";
// Cor do texto de pausa
TRCS19_STOPPING.PAUSE_TEXT_COLOR = [255, 255, 255, 255];
// Nome da fonte do texto de pausa
TRCS19_STOPPING.PAUSE_FONT_NAME = "Arial";
// Tamanho da fonte do texto de pausa
TRCS19_STOPPING.PAUSE_FONT_SIZE = 35;
//Som de inicio da pausa
TRCS19_STOPPING.PAUSE_START_SE = "";
// Som de final da pausa
TRCS19_STOPPING.PAUSE_END_SE = "";
// Parar tempo quando pausado
TRCS19_STOPPING.STOP_TIME = true;
// Taxa de diminuição do volume da musica
TRCS19_STOPPING.VOL_DOWN_RATE = 80;
// ID do switch que impede a pausa, quando ligado, não se pode pausar
TRCS19_STOPPING.PAUSE_SW_ID = 1;
// Nome do arquivo de imagem para o fundo
TRCS19_STOPPING.BACK_IMAGE = "backpause";
// Transparência da imagem de pausa
TRCS19_STOPPING.BACK_OPACITY = 128;
//--------------------------------------------------------------------------
rb.instancia(TRCS19_STOPPING, class {
  async stopping() {
    let dummy_vol, new_vol, viewport1, sprite1, sprite2;
    if (!(rb.empty_p(TRCS19_STOPPING.PAUSE_START_SE))) {
      Audio.se_play(("Audio/SE/" + TRCS19_STOPPING.PAUSE_START_SE));
    }
    if (!($game_temp.in_battle) && ($game_temp.map_bgm != null) && !(rb.empty_p($game_temp.map_bgm.name))) {
      dummy_vol = $game_temp.map_bgm.volume;
      new_vol = rb.to_i((rb.div(rb.mul(dummy_vol, TRCS19_STOPPING.VOL_DOWN_RATE), 100)));
      Audio.bgm_play(("Audio/BGM/" + $game_temp.map_bgm.name), new_vol);
    }
    viewport1 = Viewport.new(0, 0, 544, 416);
    viewport1.z = 10000;
    sprite1 = Plane.new(viewport1);
    sprite1.bitmap = (await Cache.picture(TRCS19_STOPPING.BACK_IMAGE));
    sprite1.opacity = TRCS19_STOPPING.BACK_OPACITY;
    sprite2 = Sprite.new();
    sprite2.bitmap = Bitmap.new(544, 416);
    sprite2.bitmap.font = Font.new();
    sprite2.bitmap.font.name = TRCS19_STOPPING.PAUSE_FONT_NAME;
    sprite2.bitmap.font.size = TRCS19_STOPPING.PAUSE_FONT_SIZE;
    sprite2.bitmap.font.color = Color.new(...rb.a(TRCS19_STOPPING.PAUSE_TEXT_COLOR));
    sprite2.bitmap.draw_text(0, (208 - (rb.div(TRCS19_STOPPING.PAUSE_FONT_SIZE, 2))), 544, TRCS19_STOPPING.PAUSE_FONT_SIZE, TRCS19_STOPPING.PAUSE_TEXT, 1);
    sprite2.z = 10000;
    while (true) {
      await Graphics.update();
      Input.update();
      if (Input.trigger_p(rb.eval(`Input::${rb.str(TRCS19_STOPPING.PAUSE_BUTTON)}`) /* eval pela tabela de rb.eval */)) {
        if (!(rb.empty_p(TRCS19_STOPPING.PAUSE_START_SE))) {
          Audio.se_play(("Audio/SE/" + TRCS19_STOPPING.PAUSE_START_SE));
        }
        if (!($game_temp.in_battle) && ($game_temp.map_bgm != null) && !(rb.empty_p($game_temp.map_bgm.name))) {
          Audio.bgm_play(("Audio/BGM/" + $game_temp.map_bgm.name), dummy_vol);
        }
        break;
      }
    }
    sprite1.dispose();
    sprite2.dispose();
    sprite1 = null;
    return sprite2 = null;
  }
  //--------------------------------------------------------------------------
  can_stop_p() {
    return !rb.v(rb.idx($game_switches, TRCS19_STOPPING.PAUSE_SW_ID));
  }
});
//==============================================================================
// Scene_Map
//==============================================================================
//--------------------------------------------------------------------------
rb.incluir(Scene_Map, TRCS19_STOPPING);
//--------------------------------------------------------------------------
rb.alias(Scene_Map, "trcs19_update", "update");
rb.reabrir(Scene_Map, class extends rb.superDe(Scene_Map) {
  async update() {
    let tmp;
    if (Input.trigger_p(rb.eval(`Input::${rb.str(TRCS19_STOPPING.PAUSE_BUTTON)}`) /* eval pela tabela de rb.eval */) && this.can_stop_p()) {
      tmp = Graphics.frame_count;
      await this.stopping();
      if (rb.v(TRCS19_STOPPING.STOP_TIME)) {
        Graphics.frame_count = tmp;
      }
    }
    return await this.trcs19_update();
  }
});
//--------------------------------------------------------------------------
rb.alias(Scene_Map, "trcs19_update_basic", "update_basic");
rb.reabrir(Scene_Map, class extends rb.superDe(Scene_Map) {
  async update_basic() {
    let tmp;
    if (Input.trigger_p(rb.eval(`Input::${rb.str(TRCS19_STOPPING.PAUSE_BUTTON)}`) /* eval pela tabela de rb.eval */) && this.can_stop_p()) {
      tmp = Graphics.frame_count;
      await this.stopping();
      if (rb.v(TRCS19_STOPPING.STOP_TIME)) {
        Graphics.frame_count = tmp;
      }
    }
    return await this.trcs19_update_basic();
  }
});
//==============================================================================
// Scene_Battle
//==============================================================================
//--------------------------------------------------------------------------
rb.incluir(Scene_Battle, TRCS19_STOPPING);
//--------------------------------------------------------------------------
rb.alias(Scene_Battle, "trcs19_update", "update");
rb.reabrir(Scene_Battle, class extends rb.superDe(Scene_Battle) {
  // fora do escopo (nada do jogo chama): update
});
//--------------------------------------------------------------------------
// alias trcs19_update_basic update_basic: fora do escopo (Scene_Battle#update_basic não é alcançado)
rb.reabrir(Scene_Battle, class extends rb.superDe(Scene_Battle) {
  // fora do escopo (nada do jogo chama): update_basic
});

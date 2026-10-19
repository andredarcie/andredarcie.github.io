// 036 - Sprite_Timer: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Sprite_Timer
//------------------------------------------------------------------------------
// Classe que gerencia o gráfico do timer.
// Esta classe está vinculada à variável $game_system, que a monitora e
// automaticamente muda o status do sprite.
//==============================================================================
//--------------------------------------------------------------------------
// Inicialização do objeto
//     viewport : "camada"
//--------------------------------------------------------------------------
globalThis.Sprite_Timer = rb.classe("Sprite_Timer", class Sprite_Timer extends Sprite {
  initialize(viewport) {
    super.initialize(viewport);
    this.bitmap = Bitmap.new(88, 48);
    this.bitmap.font.name = "Arial";
    this.bitmap.font.size = 32;
    this.x = (544 - this.bitmap.width);
    this.y = 0;
    this.z = 200;
    this.update();
  }
  //--------------------------------------------------------------------------
  // Dispose
  //--------------------------------------------------------------------------
  dispose() {
    this.bitmap.dispose();
    return super.dispose();
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  update() {
    let min, sec, text;
    super.update();
    this.visible = $game_system.timer_working;
    if (!rb.eq(rb.div($game_system.timer, Graphics.frame_rate), this._total_sec)) {
      rb.clear(this.bitmap);
      this._total_sec = rb.div($game_system.timer, Graphics.frame_rate);
      min = rb.div(this._total_sec, 60);
      sec = rb.mod(this._total_sec, 60);
      text = rb.sprintf("%02d:%02d", min, sec);
      this.bitmap.font.color.set(255, 255, 255);
      return this.bitmap.draw_text(this.bitmap.rect, text, 1);
    }
  }
});

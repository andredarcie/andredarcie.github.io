// 045 - Window_Help: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Window_Help
//------------------------------------------------------------------------------
// Esta é a classe da janela responsável pela descrição dos items e das
// habilidades, assim como do status dos heróis.
//==============================================================================
//--------------------------------------------------------------------------
// Inicialização do objeto
//--------------------------------------------------------------------------
globalThis.Window_Help = rb.classe("Window_Help", class Window_Help extends Window_Base {
  async initialize() {
    await super.initialize(0, 0, 544, (Window_Base.WLH + 32));
  }
  //--------------------------------------------------------------------------
  // Configuração do texto
  //     text  : janela da string
  //     align : alinhamento (0: esquerda 1: centro 2: direita)
  //--------------------------------------------------------------------------
  set_text(text, align = 0) {
    if ((!rb.eq(text, this._text) || !rb.eq(align, this._align))) {
      rb.clear(this.contents);
      this.contents.font.color = this.normal_color();
      this.contents.draw_text(4, 0, (this.width - 40), Window_Base.WLH, text, align);
      this._text = text;
      return this._align = align;
    }
  }
});

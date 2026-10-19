// 046 - Window_Gold: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Window_Gold
//------------------------------------------------------------------------------
// Janela responsável pela exibição do dinheiro.
//==============================================================================
//--------------------------------------------------------------------------
// Inicialização do objeto
//     x : coordenada X da janela
//     y : coordenada Y da janela
//--------------------------------------------------------------------------
globalThis.Window_Gold = rb.classe("Window_Gold", class Window_Gold extends Window_Base {
  async initialize(x, y) {
    await super.initialize(x, y, 160, (Window_Base.WLH + 32));
    this.refresh();
  }
  //--------------------------------------------------------------------------
  // Atualização
  //--------------------------------------------------------------------------
  refresh() {
    rb.clear(this.contents);
    return this.draw_currency_value($game_party.gold, 4, 0, 120);
  }
});

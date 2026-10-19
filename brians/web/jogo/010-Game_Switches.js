// 010 - Game_Switches: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Game_Switches
//------------------------------------------------------------------------------
// Classe que gerencia as switches.
// Pode ser acessada utilizando $game_switches.
//==============================================================================
//--------------------------------------------------------------------------
// Inicialização do objeto
//--------------------------------------------------------------------------
globalThis.Game_Switches = rb.classe("Game_Switches", class Game_Switches extends rb.Objeto {
  initialize() {
    this._data = [];
  }
  //--------------------------------------------------------------------------
  // Resgate de informação da ID da switch
  //     switch_id : ID da switch
  //--------------------------------------------------------------------------
  idx(switch_id) {
    if ((rb.idx(this._data, switch_id) == null)) {
      return false;
    } else {
      return rb.idx(this._data, switch_id);
    }
  }
  //--------------------------------------------------------------------------
  // Configuração da switch
  //     switch_id : ID da switch
  //     value     : ON (verdadeiro) / OFF (falso)
  //--------------------------------------------------------------------------
  idxSet(switch_id, value) {
    if ((switch_id <= 5000)) {
      return rb.idxSet(this._data, switch_id, value);
    }
  }
});

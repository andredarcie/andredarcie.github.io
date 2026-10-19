// 012 - Game_SelfSwitches: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Game_SelfSwitches
//------------------------------------------------------------------------------
// Classe que gerencia as switches locais.
// Pode ser acessada utilizando $game_self_switches.
//==============================================================================
//--------------------------------------------------------------------------
// Inicialização do objeto
//--------------------------------------------------------------------------
globalThis.Game_SelfSwitches = rb.classe("Game_SelfSwitches", class Game_SelfSwitches extends rb.Objeto {
  initialize() {
    this._data = rb.hash([]);
  }
  //--------------------------------------------------------------------------
  // Resgate de informação da switch local
  //     key : chave
  //--------------------------------------------------------------------------
  idx(key) {
    return ((rb.idx(this._data, key) === true) ? true : false);
  }
  //--------------------------------------------------------------------------
  // Configuração da switch local
  //     key   : chave
  //     value : ON (verdadeiro) / OFF (falso)
  //--------------------------------------------------------------------------
  idxSet(key, value) {
    return rb.idxSet(this._data, key, value);
  }
});

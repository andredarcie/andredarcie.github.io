// 011 - Game_Variables: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Game_Variables
//------------------------------------------------------------------------------
// Classe que gerencia as variáveis.
// Pode ser acessada utilizando $game_variables.
//==============================================================================
//--------------------------------------------------------------------------
// Inicialização do objeto
//--------------------------------------------------------------------------
globalThis.Game_Variables = rb.classe("Game_Variables", class Game_Variables extends rb.Objeto {
  initialize() {
    this._data = [];
  }
  //--------------------------------------------------------------------------
  // Resgate de informação da ID da variável
  //     variable_id : id da variável
  //--------------------------------------------------------------------------
  idx(variable_id) {
    if ((rb.idx(this._data, variable_id) == null)) {
      return 0;
    } else {
      return rb.idx(this._data, variable_id);
    }
  }
  //--------------------------------------------------------------------------
  // Configuração da variável
  //     variable_id : id da variável
  //     value       : valor da variável
  //--------------------------------------------------------------------------
  idxSet(variable_id, value) {
    if ((variable_id <= 5000)) {
      return rb.idxSet(this._data, variable_id, value);
    }
  }
});

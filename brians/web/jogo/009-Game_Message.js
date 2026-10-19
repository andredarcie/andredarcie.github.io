// 009 - Game_Message: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Game_Message
//------------------------------------------------------------------------------
// Esta classe controla a janela de mensagens, escolhas e etc.
// Pode ser acessada utilizando $game_message.
//==============================================================================
globalThis.Game_Message = rb.classe("Game_Message", class Game_Message extends rb.Objeto {
});
//--------------------------------------------------------------------------
// Constantes
//--------------------------------------------------------------------------
Game_Message.MAX_LINE = 4; // Número máximo de linhas
//--------------------------------------------------------------------------
// Variáveis públicas
//--------------------------------------------------------------------------
rb.reabrir(Game_Message, class extends rb.superDe(Game_Message) {
  get texts() { return this._texts; }
  set texts(v) { this._texts = v; } // Texto da mensagem
  get face_name() { return this._face_name; }
  set face_name(v) { this._face_name = v; } // Nome do arquivo de face
  get face_index() { return this._face_index; }
  set face_index(v) { this._face_index = v; } // Índice do arquivo de face
  get background() { return this._background; }
  set background(v) { this._background = v; } // Tipo de fundo
  get position() { return this._position; }
  set position(v) { this._position = v; } // Posição da janela
  get main_proc() { return this._main_proc; }
  set main_proc(v) { this._main_proc = v; } // Chamada de mensagem (Proc)
  get choice_proc() { return this._choice_proc; }
  set choice_proc(v) { this._choice_proc = v; } // Chamada de escolha (Proc)
  get choice_start() { return this._choice_start; }
  set choice_start(v) { this._choice_start = v; } // Escolha inicial
  get choice_max() { return this._choice_max; }
  set choice_max(v) { this._choice_max = v; } // Máximo de escolhas
  get choice_cancel_type() { return this._choice_cancel_type; }
  set choice_cancel_type(v) { this._choice_cancel_type = v; } // Cancelamento
  get num_input_variable_id() { return this._num_input_variable_id; }
  set num_input_variable_id(v) { this._num_input_variable_id = v; } // ID da variável numérica
  get num_input_digits_max() { return this._num_input_digits_max; }
  set num_input_digits_max(v) { this._num_input_digits_max = v; } // Máximo de dígitos
  get visible() { return this._visible; }
  set visible(v) { this._visible = v; } // Visibilidade da janela
  //--------------------------------------------------------------------------
  // Inicialização de objetos
  //--------------------------------------------------------------------------
  initialize() {
    this.clear();
    this._visible = false;
  }
  //--------------------------------------------------------------------------
  // Limpa a tela
  //--------------------------------------------------------------------------
  clear() {
    this._texts = [];
    this._face_name = "";
    this._face_index = 0;
    this._background = 0;
    this._position = 2;
    this._main_proc = null;
    this._choice_start = 99;
    this._choice_max = 0;
    this._choice_cancel_type = 0;
    this._choice_proc = null;
    this._num_input_variable_id = 0;
    return this._num_input_digits_max = 0;
  }
  //--------------------------------------------------------------------------
  // Ocupado
  //--------------------------------------------------------------------------
  busy() {
    return (rb.size(this._texts) > 0);
  }
  // fora do escopo (nada do jogo chama): new_page
});
//--------------------------------------------------------------------------
// Nova página
//--------------------------------------------------------------------------

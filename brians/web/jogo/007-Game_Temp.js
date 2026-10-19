// 007 - Game_Temp: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Game_Temp
//------------------------------------------------------------------------------
// Esta classe controla dados que não são salvos pelo jogo, os dados temporários
// Pode ser acessada utilizando $game_temp
//==============================================================================
//--------------------------------------------------------------------------
// Variáveis públicas
//--------------------------------------------------------------------------
globalThis.Game_Temp = rb.classe("Game_Temp", class Game_Temp extends rb.Objeto {
  get next_scene() { return this._next_scene; }
  set next_scene(v) { this._next_scene = v; } // Espera para troca de tela
  get map_bgm() { return this._map_bgm; }
  set map_bgm(v) { this._map_bgm = v; } // BGM do mapa
  get map_bgs() { return this._map_bgs; }
  set map_bgs(v) { this._map_bgs = v; } // BGS do mapa
  get common_event_id() { return this._common_event_id; }
  set common_event_id(v) { this._common_event_id = v; } // ID do evento comum
  get in_battle() { return this._in_battle; }
  set in_battle(v) { this._in_battle = v; } // Dentro da batalha
  get battle_proc() { return this._battle_proc; }
  set battle_proc(v) { this._battle_proc = v; } // Processos da batalha
  get shop_goods() { return this._shop_goods; }
  set shop_goods(v) { this._shop_goods = v; } // Lista de produtos na loja
  get shop_purchase_only() { return this._shop_purchase_only; }
  set shop_purchase_only(v) { this._shop_purchase_only = v; } // Loja de apenas compra
  get name_actor_id() { return this._name_actor_id; }
  set name_actor_id(v) { this._name_actor_id = v; } // ID do herói
  get name_max_char() { return this._name_max_char; }
  set name_max_char(v) { this._name_max_char = v; } // Número máximo de caracteres
  get menu_beep() { return this._menu_beep; }
  set menu_beep(v) { this._menu_beep = v; } // SE ao ser tocado no menu
  get last_file_index() { return this._last_file_index; }
  set last_file_index(v) { this._last_file_index = v; } // Index numérico do último arquivo
  get debug_top_row() { return this._debug_top_row; }
  set debug_top_row(v) { this._debug_top_row = v; } // Debug do status da tela
  get debug_index() { return this._debug_index; }
  set debug_index(v) { this._debug_index = v; } // Debug do status da tela
  get background_bitmap() { return this._background_bitmap; }
  set background_bitmap(v) { this._background_bitmap = v; } // Bitmap de fundo
  //--------------------------------------------------------------------------
  // Inicialização do objeto
  //--------------------------------------------------------------------------
  initialize() {
    this._next_scene = null;
    this._map_bgm = null;
    this._map_bgs = null;
    this._common_event_id = 0;
    this._in_battle = false;
    this._battle_proc = null;
    this._shop_goods = null;
    this._shop_purchase_only = false;
    this._name_actor_id = 0;
    this._name_max_char = 0;
    this._menu_beep = false;
    this._last_file_index = 0;
    this._debug_top_row = 0;
    this._debug_index = 0;
    this._background_bitmap = Bitmap.new(1, 1);
  }
});

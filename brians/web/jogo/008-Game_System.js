// 008 - Game_System: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Game_System
//------------------------------------------------------------------------------
// Esta classe controla os dados em torno do sistema de jogo. Ela controla os
// veículos, músicas, etc. Pode ser acessada utilizando $game_system
//==============================================================================
//--------------------------------------------------------------------------
// Variáveis públicas
//--------------------------------------------------------------------------
globalThis.Game_System = rb.classe("Game_System", class Game_System extends rb.Objeto {
  get timer() { return this._timer; }
  set timer(v) { this._timer = v; } // Timer
  get timer_working() { return this._timer_working; }
  set timer_working(v) { this._timer_working = v; } // Execução do timer
  get save_disabled() { return this._save_disabled; }
  set save_disabled(v) { this._save_disabled = v; } // Save desabilitado
  get menu_disabled() { return this._menu_disabled; }
  set menu_disabled(v) { this._menu_disabled = v; } // Menu desabilitado
  get encounter_disabled() { return this._encounter_disabled; }
  set encounter_disabled(v) { this._encounter_disabled = v; } // Encontros desabilitados
  get save_count() { return this._save_count; }
  set save_count(v) { this._save_count = v; } // Número de saves
  get version_id() { return this._version_id; }
  set version_id(v) { this._version_id = v; } // Versão da ID
  //--------------------------------------------------------------------------
  // Inicialização do objeto
  //--------------------------------------------------------------------------
  initialize() {
    this._timer = 0;
    this._timer_working = false;
    this._save_disabled = false;
    this._menu_disabled = false;
    this._encounter_disabled = false;
    this._save_count = 0;
    this._version_id = 0;
  }
  //--------------------------------------------------------------------------
  // Resgate de informação de BGM de batalha
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Configuração da BGM de batalha
  //     battle_bgm : nova BGM de batalha
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Resgate de informação de BGM de fim de batalha
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Configuração da BGM de fim de batalha
  //     battle_end_me : nova BGM de fim de batalha
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  update() {
    if (this._timer_working && (this._timer > 0)) {
      this._timer -= 1;
      if ((this._timer === 0) && $game_temp.in_battle) { // Se o timer de combate for 0
        $game_temp.next_scene = "map"; // Suspender hostilidades
      }
    }
  }
  // fora do escopo (nada do jogo chama): battle_bgm, battle_bgm=, battle_end_me, battle_end_me=
});

// 073 - Scene_Base: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Scene_Base
//------------------------------------------------------------------------------
// Classe superior à todas as classes Scene_.
//==============================================================================
//--------------------------------------------------------------------------
// Processo principal
//--------------------------------------------------------------------------
globalThis.Scene_Base = rb.classe("Scene_Base", class Scene_Base extends rb.Objeto {
  async main() {
    await this.start(); // Inicia o processo
    await this.perform_transition(); // Executa a transição
    await this.post_start(); // Processo pós-inicialização
    Input.update(); // Atualiza as informações inseridas
    while (true) {
      await Graphics.update(); // Atualiza os gráficos
      Input.update(); // Atualiza as informações inseridas
      await this.update(); // Atualização
      if (!rb.eq($scene, this)) { // Descontinuação do loop
        break;
      }
    }
    await Graphics.update();
    await this.pre_terminate(); // Preparação para finalização
    Graphics.freeze(); // Congelamento dos gráficos
    return await this.terminate(); // Fim
  }
  //--------------------------------------------------------------------------
  // Inicialização do processo
  //--------------------------------------------------------------------------
  start() {
  }
  //--------------------------------------------------------------------------
  // Execução da transição
  //--------------------------------------------------------------------------
  async perform_transition() {
    return await Graphics.transition(10);
  }
  //--------------------------------------------------------------------------
  // Processo pós-inicialização
  //--------------------------------------------------------------------------
  post_start() {
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  update() {
  }
  //--------------------------------------------------------------------------
  // Preparação para finalização
  //--------------------------------------------------------------------------
  pre_terminate() {
  }
  //--------------------------------------------------------------------------
  // Fim do processo
  //--------------------------------------------------------------------------
  terminate() {
  }
  //--------------------------------------------------------------------------
  // Preparação do background para uma tela diferente
  //--------------------------------------------------------------------------
  snapshot_for_background() {
    $game_temp.background_bitmap.dispose();
    $game_temp.background_bitmap = Graphics.snap_to_bitmap();
    return $game_temp.background_bitmap.blur();
  }
  //--------------------------------------------------------------------------
  // Criação do background do menu
  //--------------------------------------------------------------------------
  create_menu_background() {
    this._menuback_sprite = Sprite.new();
    this._menuback_sprite.bitmap = $game_temp.background_bitmap;
    this._menuback_sprite.color.set(16, 16, 16, 128);
    return this.update_menu_background();
  }
  //--------------------------------------------------------------------------
  // Dispose do background do menu
  //--------------------------------------------------------------------------
  dispose_menu_background() {
    return this._menuback_sprite.dispose();
  }
  //--------------------------------------------------------------------------
  // Atualização do background do menu
  //--------------------------------------------------------------------------
  update_menu_background() {
  }
});

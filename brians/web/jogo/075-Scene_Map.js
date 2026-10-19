// 075 - Scene_Map: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Scene_Map
//------------------------------------------------------------------------------
// Classe das operações nos mapas.
//==============================================================================
//--------------------------------------------------------------------------
// Inicialização do processo
//--------------------------------------------------------------------------
globalThis.Scene_Map = rb.classe("Scene_Map", class Scene_Map extends Scene_Base {
  async start() {
    super.start();
    await $game_map.refresh();
    this._spriteset = (await Spriteset_Map.new());
    return this._message_window = (await Window_Message.new());
  }
  //--------------------------------------------------------------------------
  // Transição
  //--------------------------------------------------------------------------
  async perform_transition() {
    if ((Graphics.brightness === 0)) { // Após a batalha e o carregamento
      return await this.fadein(30);
    } else {
      // Retorno do menu
      return await Graphics.transition(15);
    }
  }
  //--------------------------------------------------------------------------
  // Fim do processo
  //--------------------------------------------------------------------------
  async terminate() {
    super.terminate();
    if (rb.is_a_p($scene, Scene_Battle)) { // Se for uma batalha
      this._spriteset.dispose_characters(); // Usa um gráfico para ocultar o herói
    }
    this.snapshot_for_background();
    this._spriteset.dispose();
    this._message_window.dispose();
    if (rb.is_a_p($scene, Scene_Battle)) { // Se for uma batalha
      return await this.perform_battle_transition(); // Executa uma transição
    }
  }
  //--------------------------------------------------------------------------
  // Atualização básica
  //--------------------------------------------------------------------------
  async update_basic() {
    await Graphics.update(); // Atualização da tela de jogo
    Input.update(); // Atualização da informação inserida
    await $game_map.update(); // Atualização do mapa
    return await this._spriteset.update(); // Atualização do spriteset
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  async update() {
    super.update();
    await $game_map.interpreter.update(); // Atualização do interpretador
    await $game_map.update(); // Atualização do mapa
    await $game_player.update(); // Atualização do jogador
    $game_system.update(); // Atualização do timer
    await this._spriteset.update(); // Atualização do spriteset
    await this._message_window.update(); // Atualização da janela de mensagem
    if (!(rb.v($game_message.visible))) {
      // Exibe apenas se a mensagem for visível
      await this.update_transfer_player();
      this.update_encounter();
      this.update_call_menu();
      this.update_call_debug();
      return await this.update_scene_change();
    }
  }
  //--------------------------------------------------------------------------
  // Fade-in da tela
  //     duration : duração
  //     Usa o Graphics.fadeout diretamente e pára quaisquer efeitos que
  //     possam atrapalhar o fade-in.
  //--------------------------------------------------------------------------
  async fadein(duration) {
    let i;
    await Graphics.transition(0);
    for (i of rb.range(0, (duration - 1), false)) {
      Graphics.brightness = rb.div((255 * i), duration);
      await this.update_basic();
    }
    Graphics.brightness = 255;
  }
  //--------------------------------------------------------------------------
  // Fade-out da tela
  //     duration : duração
  //    Assim como no anterior, usa o Graphics.fadein diretamente.
  //--------------------------------------------------------------------------
  async fadeout(duration) {
    let i;
    await Graphics.transition(0);
    for (i of rb.range(0, (duration - 1), false)) {
      Graphics.brightness = (255 - rb.div((255 * i), duration));
      await this.update_basic();
    }
    Graphics.brightness = 0;
  }
  //--------------------------------------------------------------------------
  // Processo de movimento
  //--------------------------------------------------------------------------
  async update_transfer_player() {
    let fade;
    if (!($game_player.transfer_p())) {
      return;
    }
    fade = ((Graphics.brightness > 0));
    if (fade) {
      await this.fadeout(30);
    }
    this._spriteset.dispose(); // Dispose do spriteset
    await $game_player.perform_transfer(); // Executa o movimento
    $game_map.autoplay(); // Troca automática de BGM e BGS
    await $game_map.update();
    await Graphics.wait(15);
    this._spriteset = (await Spriteset_Map.new()); // Recriação do sprite
    if (fade) {
      await this.fadein(30);
    }
    return Input.update();
  }
  //--------------------------------------------------------------------------
  // Processo de encontros
  //--------------------------------------------------------------------------
  update_encounter() {
    let troop_id;
    if (($game_player.encounter_count() > 0)) { // Menor que encontrador?
      return;
    }
    if ($game_map.interpreter.running_p()) { // Execução do evento?
      return;
    }
    if ($game_system.encounter_disabled) { // Encontros desabilitados?
      return;
    }
    troop_id = $game_player.make_encounter_troop_id(); // Cria encontro
    if ((rb.idx($data_troops, troop_id) == null)) { // Grupo sem inimigos?
      return;
    }
    $game_troop.setup(troop_id);
    $game_troop.can_escape = true;
    $game_temp.battle_proc = null;
    $game_temp.next_scene = "battle";
    return this.preemptive_or_surprise();
  }
  //--------------------------------------------------------------------------
  // Determina a possibilidade de uma batalha com iniciativa
  //--------------------------------------------------------------------------
  preemptive_or_surprise() {
    let actors_agi, enemies_agi, percent_preemptive, percent_surprise;
    actors_agi = $game_party.average_agi();
    enemies_agi = $game_troop.average_agi();
    if ((actors_agi >= enemies_agi)) {
      percent_preemptive = 5;
      percent_surprise = 3;
    } else {
      percent_preemptive = 3;
      percent_surprise = 5;
    }
    if ((rb.rand(100) < percent_preemptive)) {
      $game_troop.preemptive = true;
    } else if ((rb.rand(100) < percent_surprise)) {
      $game_troop.surprise = true;
    }
  }
  //--------------------------------------------------------------------------
  // Chama o menu pelo botão de cancelamento
  //--------------------------------------------------------------------------
  update_call_menu() {
    if (Input.trigger_p(Input.B)) {
      if ($game_map.interpreter.running_p()) { // Eventos em execução?
        return;
      }
      if ($game_system.menu_disabled) { // Menu desabilitado?
        return;
      }
      $game_temp.menu_beep = true; // Execução de SE
      $game_temp.next_scene = "menu";
    }
  }
  //--------------------------------------------------------------------------
  // Tela de debug (F9)
  //--------------------------------------------------------------------------
  update_call_debug() {
    if (rb.v($TEST) && Input.press_p(Input.F9)) { // Tecla F9 em teste
      $game_temp.next_scene = "debug";
    }
  }
  //--------------------------------------------------------------------------
  // Execução da troca de cena
  //--------------------------------------------------------------------------
  async update_scene_change() {
    if ($game_player.moving_p()) { // Jogadores em movimento?
      return;
    }
    const caso1 = $game_temp.next_scene;
    if (caso1 === "battle") {
      return await this.call_battle();
    } else if (caso1 === "shop") {
      return this.call_shop();
    } else if (caso1 === "name") {
      return this.call_name();
    } else if (caso1 === "menu") {
      return this.call_menu();
    } else if (caso1 === "save") {
      return this.call_save();
    } else if (caso1 === "debug") {
      return this.call_debug();
    } else if (caso1 === "gameover") {
      return this.call_gameover();
    } else if (caso1 === "title") {
      return await this.call_title();
    } else {
      $game_temp.next_scene = null;
    }
  }
  call_battle() { return rb.foraDoEscopo("Scene_Map#call_battle", "nenhum mapa tem encontros aleatórios e nenhum evento usa \"Iniciar batalha\" (301)"); }
  call_shop() { return rb.foraDoEscopo("Scene_Map#call_shop", "nenhum evento usa \"Abrir loja\" (302)"); }
  call_name() { return rb.foraDoEscopo("Scene_Map#call_name", "nenhum evento usa \"Digitar nome\" (303)"); }
  call_menu() { return rb.foraDoEscopo("Scene_Map#call_menu", "o menu do VX é desligado (comando 135 no evento comum \"Vida\") ainda na introdução, antes de o jogador ter controle, e nada o religa; o ks_checkpoint de 2014 já tem menu_disabled"); }
  //--------------------------------------------------------------------------
  // Tela de batalha
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Tela de loja
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Tela de inserção de nome
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Tela de menu
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Tela de saves
  //--------------------------------------------------------------------------
  call_save() {
    $game_temp.next_scene = null;
    return $scene = Scene_File.new(true, false, true);
  }
  call_debug() { return rb.foraDoEscopo("Scene_Map#call_debug", "a tela de debug (F9) só existe no teste do editor ($TEST)"); }
  call_gameover() { return rb.foraDoEscopo("Scene_Map#call_gameover", "nenhum evento usa \"Game over\" (353); a morte passa pelo evento comum \"Vida\", que recarrega o checkpoint"); }
  //--------------------------------------------------------------------------
  // Tela de debugs
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Tela de game over
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Tela de título
  //--------------------------------------------------------------------------
  async call_title() {
    $game_temp.next_scene = null;
    $scene = Scene_Title.new();
    return await this.fadeout(60);
  }
  //--------------------------------------------------------------------------
  // Execução da transição de batalha
  //--------------------------------------------------------------------------
  async perform_battle_transition() {
    await Graphics.transition(80, "Graphics/System/BattleStart", 80);
    return Graphics.freeze();
  }
});

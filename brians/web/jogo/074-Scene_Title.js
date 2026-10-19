// 074 - Scene_Title: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Scene_Title
//------------------------------------------------------------------------------
// Classe das operações na tela de título.
//==============================================================================
//--------------------------------------------------------------------------
// Processo principal
//--------------------------------------------------------------------------
globalThis.Scene_Title = rb.classe("Scene_Title", class Scene_Title extends Scene_Base {
  async main() {
    if (rb.v($BTEST)) { // Se for teste de batalha
      return await this.battle_test(); // Teste inicia
    } else {
      // Se você está jogando normal
      return await super.main(); // Vá ao processo principal
    }
  }
  //--------------------------------------------------------------------------
  // Inicialização do processo
  //--------------------------------------------------------------------------
  async start() {
    super.start();
    this.load_database(); // Carrega o banco de dados
    await this.create_game_objects(); // Cria os objetos do jogo
    this.check_continue(); // Verifica se há arquivos salvos
    await this.create_title_graphic(); // Cria o gráfico de título
    await this.create_command_window(); // Cria a janela de comandos
    return this.play_title_music(); // Toca a música de título
  }
  //--------------------------------------------------------------------------
  // Transição
  //--------------------------------------------------------------------------
  async perform_transition() {
    return await Graphics.transition(20);
  }
  //--------------------------------------------------------------------------
  // Início do processo
  //--------------------------------------------------------------------------
  async post_start() {
    super.post_start();
    return await this.open_command_window();
  }
  //--------------------------------------------------------------------------
  // Preparação para fim do processo
  //--------------------------------------------------------------------------
  async pre_terminate() {
    super.pre_terminate();
    return await this.close_command_window();
  }
  //--------------------------------------------------------------------------
  // Fim do processo
  //--------------------------------------------------------------------------
  terminate() {
    super.terminate();
    this.dispose_command_window();
    this.snapshot_for_background();
    return this.dispose_title_graphic();
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  async update() {
    super.update();
    this._command_window.update();
    if (Input.trigger_p(Input.C)) {
      const caso1 = rb.index(this._command_window);
      if (caso1 === 0) { // Novo Jogo
        return await this.command_new_game();
      } else if (caso1 === 1) { // Continuar
        return this.command_continue();
      } else if (caso1 === 2) { // Sair
        return this.command_shutdown();
      }
    }
  }
  //--------------------------------------------------------------------------
  // Carregamento do banco de dados
  //--------------------------------------------------------------------------
  load_database() {
    $data_actors = load_data("Data/Actors.rvdata");
    $data_classes = load_data("Data/Classes.rvdata");
    $data_skills = load_data("Data/Skills.rvdata");
    $data_items = load_data("Data/Items.rvdata");
    $data_weapons = load_data("Data/Weapons.rvdata");
    $data_armors = load_data("Data/Armors.rvdata");
    $data_enemies = load_data("Data/Enemies.rvdata");
    $data_troops = load_data("Data/Troops.rvdata");
    $data_states = load_data("Data/States.rvdata");
    $data_animations = load_data("Data/Animations.rvdata");
    $data_common_events = load_data("Data/CommonEvents.rvdata");
    $data_system = load_data("Data/System.rvdata");
    return $data_areas = load_data("Data/Areas.rvdata");
  }
  //--------------------------------------------------------------------------
  // Carregamento do banco de dados para teste de batalha
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Criação dos objetos do jogo
  //--------------------------------------------------------------------------
  async create_game_objects() {
    $game_temp = Game_Temp.new();
    $game_message = Game_Message.new();
    $game_system = Game_System.new();
    $game_switches = Game_Switches.new();
    $game_variables = Game_Variables.new();
    $game_self_switches = Game_SelfSwitches.new();
    $game_actors = Game_Actors.new();
    $game_party = Game_Party.new();
    $game_troop = (await Game_Troop.new());
    $game_map = (await Game_Map.new());
    return $game_player = Game_Player.new();
  }
  //--------------------------------------------------------------------------
  // Verifica se há arquivos salvos
  //--------------------------------------------------------------------------
  check_continue() {
    return this._continue_enabled = ((rb.size(rb.Dir.glob("Save*.rvdata")) > 0));
  }
  //--------------------------------------------------------------------------
  // Criação do gráfico de título
  //--------------------------------------------------------------------------
  async create_title_graphic() {
    this._sprite = Sprite.new();
    this._sprite.bitmap = (await Cache.system("Title"));
  }
  //--------------------------------------------------------------------------
  // Dispose do gráfico de título
  //--------------------------------------------------------------------------
  dispose_title_graphic() {
    this._sprite.bitmap.dispose();
    return this._sprite.dispose();
  }
  //--------------------------------------------------------------------------
  // Criação da janela de comandos
  //--------------------------------------------------------------------------
  async create_command_window() {
    let s1, s2, s3;
    s1 = Vocab.new_game;
    s2 = Vocab.continue;
    s3 = Vocab.shutdown;
    this._command_window = (await Window_Command.new(172, [s1, s2, s3]));
    this._command_window.x = rb.div(((544 - this._command_window.width)), 2);
    this._command_window.y = 288;
    if (rb.v(this._continue_enabled)) { // Se houver arquivos salvos
      this._command_window.index = 1; // Opção habilitada
    } else {
      // Se não houver arquivos salvos
      this._command_window.draw_item(1, false); // Opção desabilitada
    }
    this._command_window.openness = 0;
    return this._command_window.open();
  }
  //--------------------------------------------------------------------------
  // Dispose da janela de comandos
  //--------------------------------------------------------------------------
  dispose_command_window() {
    return this._command_window.dispose();
  }
  //--------------------------------------------------------------------------
  // Abre a janela de comandos
  //--------------------------------------------------------------------------
  async open_command_window() {
    this._command_window.open();
    do {
      this._command_window.update();
      await Graphics.update();
    } while (!((this._command_window.openness === 255)));
  }
  //--------------------------------------------------------------------------
  // Fecha a janela de comandos
  //--------------------------------------------------------------------------
  async close_command_window() {
    this._command_window.close();
    do {
      this._command_window.update();
      await Graphics.update();
    } while (!((this._command_window.openness === 0)));
  }
  //--------------------------------------------------------------------------
  // Toca a música de título
  //--------------------------------------------------------------------------
  play_title_music() {
    $data_system.title_bgm.play();
    RPG.BGS.stop();
    return RPG.ME.stop();
  }
  //--------------------------------------------------------------------------
  // Verifica se há uma Posição Inicial de Personagem
  //--------------------------------------------------------------------------
  async confirm_player_location() {
    if (($data_system.start_map_id === 0)) {
      await print("A Posição Inicial de Personagem não foi definida.");
      return rb.exit();
    }
  }
  //--------------------------------------------------------------------------
  // Comando: Novo Jogo
  //--------------------------------------------------------------------------
  async command_new_game() {
    await this.confirm_player_location();
    Sound.play_decision();
    $game_party.setup_starting_members(); // A equipe (party) inicial
    await $game_map.setup($data_system.start_map_id); // Posição inicial no mapa
    await $game_player.moveto($data_system.start_x, $data_system.start_y);
    $game_player.refresh();
    $scene = Scene_Map.new();
    RPG.BGM.fade(1500);
    await this.close_command_window();
    await Graphics.fadeout(60);
    await Graphics.wait(40);
    Graphics.frame_count = 0;
    RPG.BGM.stop();
    return $game_map.autoplay();
  }
  //--------------------------------------------------------------------------
  // Coomando: Continuar
  //--------------------------------------------------------------------------
  command_continue() {
    if (rb.v(this._continue_enabled)) {
      Sound.play_decision();
      return $scene = Scene_File.new(false, true, false);
    } else {
      return Sound.play_buzzer();
    }
  }
  //--------------------------------------------------------------------------
  // Comando: Sair
  //--------------------------------------------------------------------------
  command_shutdown() {
    Sound.play_decision();
    RPG.BGM.fade(800);
    RPG.BGS.fade(800);
    RPG.ME.fade(800);
    return $scene = null;
  }
  battle_test() { return rb.foraDoEscopo("Scene_Title#battle_test", "teste de batalha do editor ($BTEST)"); }
  // fora do escopo (nada do jogo chama): load_bt_database
});
//--------------------------------------------------------------------------
// Teste de batalha
//--------------------------------------------------------------------------

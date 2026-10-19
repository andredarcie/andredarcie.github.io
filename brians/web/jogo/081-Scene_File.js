// 081 - Scene_File: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Scene_File
//------------------------------------------------------------------------------
// Classe de operações na tela de arquivos salvos.
//==============================================================================
//--------------------------------------------------------------------------
// Inicialização do objeto
//     saving     : uso do save (se falso, carregar tela)
//     from_title : o comando "Continuar" do título
//     from_event : o comando "Salvar" por eventos
//--------------------------------------------------------------------------
globalThis.Scene_File = rb.classe("Scene_File", class Scene_File extends Scene_Base {
  initialize(saving, from_title, from_event) {
    this._saving = saving;
    this._from_title = from_title;
    this._from_event = from_event;
  }
  //--------------------------------------------------------------------------
  // Inicialização do processo
  //--------------------------------------------------------------------------
  async start() {
    super.start();
    this.create_menu_background();
    this._help_window = (await Window_Help.new());
    await this.create_savefile_windows();
    if (rb.v(this._saving)) {
      this._index = $game_temp.last_file_index;
      this._help_window.set_text(Vocab.SaveMessage);
    } else {
      this._index = this.latest_file_index();
      this._help_window.set_text(Vocab.LoadMessage);
    }
    rb.idx(this._savefile_windows, this._index).selected = true;
  }
  //--------------------------------------------------------------------------
  // Fim do processo
  //--------------------------------------------------------------------------
  terminate() {
    super.terminate();
    this.dispose_menu_background();
    this._help_window.dispose();
    return this.dispose_item_windows();
  }
  //--------------------------------------------------------------------------
  // Retornar à tela original
  //--------------------------------------------------------------------------
  return_scene() {
    if (rb.v(this._from_title)) {
      return $scene = Scene_Title.new();
    } else if (rb.v(this._from_event)) {
      return $scene = Scene_Map.new();
    } else {
      return $scene = Scene_Menu.new(4);
    }
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  async update() {
    super.update();
    this.update_menu_background();
    this._help_window.update();
    this.update_savefile_windows();
    return await this.update_savefile_selection();
  }
  //--------------------------------------------------------------------------
  // Criação da janela de save
  //--------------------------------------------------------------------------
  async create_savefile_windows() {
    let i;
    this._savefile_windows = [];
    for (i of rb.range(0, 3, false)) {
      rb.push(this._savefile_windows, (await Window_SaveFile.new(i, this.make_filename(i))));
    }
    return this._item_max = 4;
  }
  //--------------------------------------------------------------------------
  // Dispose da janela de save
  //--------------------------------------------------------------------------
  dispose_item_windows() {
    let window;
    for (window of this._savefile_windows) {
      window.dispose();
    }
  }
  //--------------------------------------------------------------------------
  // Atualização da janela de save
  //--------------------------------------------------------------------------
  update_savefile_windows() {
    let window;
    for (window of this._savefile_windows) {
      window.update();
    }
  }
  //--------------------------------------------------------------------------
  // Atualização da seleção de arquivo save
  //--------------------------------------------------------------------------
  async update_savefile_selection() {
    let last_index;
    if (Input.trigger_p(Input.C)) {
      return await this.determine_savefile();
    } else if (Input.trigger_p(Input.B)) {
      Sound.play_cancel();
      return this.return_scene();
    } else {
      last_index = this._index;
      if (Input.repeat_p(Input.DOWN)) {
        this.cursor_down(Input.trigger_p(Input.DOWN));
      }
      if (Input.repeat_p(Input.UP)) {
        this.cursor_up(Input.trigger_p(Input.UP));
      }
      if (!rb.eq(this._index, last_index)) {
        Sound.play_cursor();
        rb.idx(this._savefile_windows, last_index).selected = false;
        rb.idx(this._savefile_windows, this._index).selected = true;
      }
    }
  }
  //--------------------------------------------------------------------------
  // Decisão de arquivo
  //--------------------------------------------------------------------------
  async determine_savefile() {
    if (rb.v(this._saving)) {
      Sound.play_save();
      this.do_save();
    } else {
      if (rb.v(rb.idx(this._savefile_windows, this._index).file_exist)) {
        Sound.play_load();
        await this.do_load();
      } else {
        Sound.play_buzzer();
        return;
      }
    }
    $game_temp.last_file_index = this._index;
  }
  //--------------------------------------------------------------------------
  // Mover cursor para baixo
  //     wrap : permissão de wrap
  //--------------------------------------------------------------------------
  cursor_down(wrap) {
    if (((this._index < (this._item_max - 1)) || rb.v(wrap))) {
      return this._index = rb.mod(((this._index + 1)), this._item_max);
    }
  }
  //--------------------------------------------------------------------------
  // Mover cursor para cima
  //     wrap : permissão de wrap
  //--------------------------------------------------------------------------
  cursor_up(wrap) {
    if (((this._index > 0) || rb.v(wrap))) {
      return this._index = rb.mod((((this._index - 1) + this._item_max)), this._item_max);
    }
  }
  //--------------------------------------------------------------------------
  // Criar um nome de arquivo
  //     file_index : salvo no index de arquivos (0～3)
  //--------------------------------------------------------------------------
  make_filename(file_index) {
    return `Save${rb.str((file_index + 1))}.rvdata`;
  }
  //--------------------------------------------------------------------------
  // Arquivo de última seleção
  //--------------------------------------------------------------------------
  latest_file_index() {
    let index, latest_time, i;
    index = 0;
    latest_time = rb.Time.at(0);
    for (i of rb.range(0, rb.size(this._savefile_windows), true)) {
      if ((rb.idx(this._savefile_windows, i).time_stamp > latest_time)) {
        latest_time = rb.idx(this._savefile_windows, i).time_stamp;
        index = i;
      }
    }
    return index;
  }
  //--------------------------------------------------------------------------
  // Salvando arquivos
  //--------------------------------------------------------------------------
  do_save() {
    let file;
    file = rb.File.open(rb.idx(this._savefile_windows, this._index).filename, "wb");
    this.write_save_data(file);
    file.close();
    return this.return_scene();
  }
  //--------------------------------------------------------------------------
  // Carregando arquivos
  //--------------------------------------------------------------------------
  async do_load() {
    let file;
    file = rb.File.open(rb.idx(this._savefile_windows, this._index).filename, "rb");
    await this.read_save_data(file);
    file.close();
    $scene = Scene_Map.new();
    RPG.BGM.fade(1500);
    await Graphics.fadeout(60);
    await Graphics.wait(40);
    this._last_bgm.play();
    return this._last_bgs.play();
  }
  //--------------------------------------------------------------------------
  // Escreve dados de save
  //     file : arquivo onde será salvo
  //--------------------------------------------------------------------------
  write_save_data(file) {
    let characters, actor;
    characters = [];
    for (actor of $game_party.members) {
      rb.push(characters, [actor.character_name, actor.character_index]);
    }
    $game_system.save_count += 1;
    $game_system.version_id = $data_system.version_id;
    this._last_bgm = RPG.BGM.last();
    this._last_bgs = RPG.BGS.last();
    rb.Marshal.dump(characters, file);
    rb.Marshal.dump(Graphics.frame_count, file);
    rb.Marshal.dump(this._last_bgm, file);
    rb.Marshal.dump(this._last_bgs, file);
    rb.Marshal.dump($game_system, file);
    rb.Marshal.dump($game_message, file);
    rb.Marshal.dump($game_switches, file);
    rb.Marshal.dump($game_variables, file);
    rb.Marshal.dump($game_self_switches, file);
    rb.Marshal.dump($game_actors, file);
    rb.Marshal.dump($game_party, file);
    rb.Marshal.dump($game_troop, file);
    rb.Marshal.dump($game_map, file);
    return rb.Marshal.dump($game_player, file);
  }
  //--------------------------------------------------------------------------
  // Lê dados de save
  //     file : arquivo onde está salvo
  //--------------------------------------------------------------------------
  async read_save_data(file) {
    let characters;
    characters = rb.Marshal.load(file);
    Graphics.frame_count = rb.Marshal.load(file);
    this._last_bgm = rb.Marshal.load(file);
    this._last_bgs = rb.Marshal.load(file);
    $game_system = rb.Marshal.load(file);
    $game_message = rb.Marshal.load(file);
    $game_switches = rb.Marshal.load(file);
    $game_variables = rb.Marshal.load(file);
    $game_self_switches = rb.Marshal.load(file);
    $game_actors = rb.Marshal.load(file);
    $game_party = rb.Marshal.load(file);
    $game_troop = rb.Marshal.load(file);
    $game_map = rb.Marshal.load(file);
    $game_player = rb.Marshal.load(file);
    if (($game_system.version_id !== $data_system.version_id)) {
      await $game_map.setup($game_map.map_id);
      return rb.center($game_player, $game_player.x, $game_player.y);
    }
  }
});

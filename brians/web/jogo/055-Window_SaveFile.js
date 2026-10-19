// 055 - Window_SaveFile: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Window_SaveFile
//------------------------------------------------------------------------------
// Exibe a tela dos arquivos de saves e permite carregar e salvar um arquivo.
//==============================================================================
//--------------------------------------------------------------------------
// Variáveis públicas
//--------------------------------------------------------------------------
globalThis.Window_SaveFile = rb.classe("Window_SaveFile", class Window_SaveFile extends Window_Base {
  get filename() { return this._filename; } // Nome do arquivo
  get file_exist() { return this._file_exist; } // Verifica existência do arquivo
  get time_stamp() { return this._time_stamp; } // Estampa de tempo
  get selected() { return this._selected; } // Seleções
  //--------------------------------------------------------------------------
  // Inicialização do objeto
  //     file_index : salva o index dos arquivos (0～3)
  //     filename   : nome do arquivo
  //--------------------------------------------------------------------------
  async initialize(file_index, filename) {
    await super.initialize(0, (56 + (rb.mod(file_index, 4) * 90)), 544, 90);
    this._file_index = file_index;
    this._filename = filename;
    this.load_gamedata();
    await this.refresh();
    this._selected = false;
  }
  //--------------------------------------------------------------------------
  // Carregar arquivo
  //--------------------------------------------------------------------------
  load_gamedata() {
    let file;
    this._time_stamp = rb.Time.at(0);
    this._file_exist = rb.FileTest.exist_p(this._filename);
    if (rb.v(this._file_exist)) {
      file = rb.File.open(this._filename, "r");
      this._time_stamp = file.mtime();
      try {
        this._characters = rb.Marshal.load(file);
        this._frame_count = rb.Marshal.load(file);
        this._last_bgm = rb.Marshal.load(file);
        this._last_bgs = rb.Marshal.load(file);
        this._game_system = rb.Marshal.load(file);
        this._game_message = rb.Marshal.load(file);
        this._game_switches = rb.Marshal.load(file);
        this._game_variables = rb.Marshal.load(file);
        return this._total_sec = rb.div(this._frame_count, Graphics.frame_rate);
      } catch (erro) {
        return this._file_exist = false;
      } finally {
        file.close();
      }
    }
  }
  //--------------------------------------------------------------------------
  // Atualização
  //--------------------------------------------------------------------------
  async refresh() {
    let name;
    rb.clear(this.contents);
    this.contents.font.color = this.normal_color();
    name = (Vocab.File + ` ${rb.str((this._file_index + 1))}`);
    this.contents.draw_text(4, 0, 200, Window_Base.WLH, name);
    this._name_width = this.contents.text_size(name).width;
    if (rb.v(this._file_exist)) {
      await this.draw_party_characters(152, 58);
      return this.draw_playtime(0, 34, (this.contents.width - 4), 2);
    }
  }
  //--------------------------------------------------------------------------
  // Desenho dos membros da euqipe
  //     x : desenha na coordenada X
  //     y : desenha na coordenada Y
  //--------------------------------------------------------------------------
  async draw_party_characters(x, y) {
    let i, name, index;
    for (i of rb.range(0, rb.size(this._characters), true)) {
      name = rb.idx(rb.idx(this._characters, i), 0);
      index = rb.idx(rb.idx(this._characters, i), 1);
      await this.draw_character(name, index, rb.add(x, (i * 48)), y);
    }
  }
  //--------------------------------------------------------------------------
  // Exibição do tempo de jogo
  //     x     : exibe na coordenada X
  //     y     : exibe na coordenada Y
  //     width : largura
  //     align : altura
  //--------------------------------------------------------------------------
  draw_playtime(x, y, width, align) {
    let hour, min, sec, time_string;
    hour = rb.div(rb.div(this._total_sec, 60), 60);
    min = rb.mod(rb.div(this._total_sec, 60), 60);
    sec = rb.mod(this._total_sec, 60);
    time_string = rb.sprintf("%02d:%02d:%02d", hour, min, sec);
    this.contents.font.color = this.normal_color();
    return this.contents.draw_text(x, y, width, Window_Base.WLH, time_string, 2);
  }
  //--------------------------------------------------------------------------
  // Definindo estado da seleção
  //     selected : escolha de um novo estado (true = selecionado
  //     false = não selecionado)
  //--------------------------------------------------------------------------
  set selected(selected) {
    this._selected = selected;
    this.update_cursor();
  }
  //--------------------------------------------------------------------------
  // Atualização do cursor
  //--------------------------------------------------------------------------
  update_cursor() {
    if (rb.v(this._selected)) {
      return this.cursor_rect.set(0, 0, (this._name_width + 8), Window_Base.WLH);
    } else {
      return rb.empty(this.cursor_rect);
    }
  }
});

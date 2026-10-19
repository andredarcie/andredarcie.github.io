// 063 - Window_Message: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Window_Message
//------------------------------------------------------------------------------
// Janela reponsável pela exibição de sentenças na caixa de mensagens.
//==============================================================================
globalThis.Window_Message = rb.classe("Window_Message", class Window_Message extends Window_Selectable {
});
//--------------------------------------------------------------------------
// Contantes
//--------------------------------------------------------------------------
Window_Message.MAX_LINE = 4; // Número máximo de linhas
//--------------------------------------------------------------------------
// Inicialização do objeto
//--------------------------------------------------------------------------
rb.reabrir(Window_Message, class extends rb.superDe(Window_Message) {
  async initialize() {
    await super.initialize(0, 288, 544, 128);
    this.z = 200;
    this.active = false;
    this.index = -1;
    this.openness = 0;
    this._opening = false; // Abrir a janela
    this._closing = false; // Fechar a janela
    this._text = null; // Sentenças a serem exibidas
    this._contents_x = 0; // Coordenada X para exibir a próxima letra
    this._contents_y = 0; // Coordenada Y para exibir a próxima letra
    this._line_count = 0; // Número de linhas
    this._wait_count = 0; // Espera
    this._background = 0; // Background
    this._position = 2; // Exibir posição
    this._show_fast = false; // Avanço rápido
    this._line_show_fast = false; // Avanço rápido de linha
    this._pause_skip = false; // Espera para fechar
    await this.create_gold_window();
    await this.create_number_input_window();
    await this.create_back_sprite();
  }
  //--------------------------------------------------------------------------
  // Dispose
  //--------------------------------------------------------------------------
  dispose() {
    super.dispose();
    this.dispose_gold_window();
    this.dispose_number_input_window();
    return this.dispose_back_sprite();
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  async update() {
    super.update();
    this.update_gold_window();
    this.update_number_input_window();
    await this.update_back_sprite();
    this.update_show_fast();
    if (!((this._opening || this._closing))) {
      // Exceto se estiver abrindo/fechando
      if ((this._wait_count > 0)) { // Esperar a escrita
        return this._wait_count -= 1;
      } else if (rb.v(this.pause)) {
        // Aguardo do fim da sentença
        return await this.input_pause();
      } else if (rb.v(this.active)) {
        // Opções de tipagem
        return this.input_choice();
      } else if (rb.v(this._number_input_window.visible)) {
        // Em inserção numérica
        return this.input_number();
      } else if ((this._text != null)) {
        // Se houverem sentenças sobrando
        return this.update_message(); // Atualize a mensagem
      } else if (this.continue_p()) {
        // Se você continuar
        await this.start_message(); // Iniciar mensagem
        this.open(); // Abrir janela
        $game_message.visible = true;
      } else {
        // Se você não continuar
        this.close(); // Fechar janela
        $game_message.visible = this._closing;
      }
    }
  }
  //--------------------------------------------------------------------------
  // Criação da janela de dinheiro
  //--------------------------------------------------------------------------
  async create_gold_window() {
    this._gold_window = (await Window_Gold.new(384, 0));
    this._gold_window.openness = 0;
  }
  //--------------------------------------------------------------------------
  // Criação da janela de inserção de número
  //--------------------------------------------------------------------------
  async create_number_input_window() {
    this._number_input_window = (await Window_NumberInput.new());
    this._number_input_window.visible = false;
  }
  //--------------------------------------------------------------------------
  // Criação do sprite de fundo
  //--------------------------------------------------------------------------
  async create_back_sprite() {
    this._back_sprite = Sprite.new();
    this._back_sprite.bitmap = (await Cache.system("MessageBack"));
    this._back_sprite.visible = ((this._background === 1));
    this._back_sprite.z = 190;
  }
  //--------------------------------------------------------------------------
  // Dispose da janela de dinheiro
  //--------------------------------------------------------------------------
  dispose_gold_window() {
    return this._gold_window.dispose();
  }
  //--------------------------------------------------------------------------
  // Dispose da janela de inserção de número
  //--------------------------------------------------------------------------
  dispose_number_input_window() {
    return this._number_input_window.dispose();
  }
  //--------------------------------------------------------------------------
  // Dispose do sprite de fundo
  //--------------------------------------------------------------------------
  dispose_back_sprite() {
    return this._back_sprite.dispose();
  }
  //--------------------------------------------------------------------------
  // Atualização da janela de dinheiro
  //--------------------------------------------------------------------------
  update_gold_window() {
    return this._gold_window.update();
  }
  //--------------------------------------------------------------------------
  // Atualização da janela de inserção de número
  //--------------------------------------------------------------------------
  update_number_input_window() {
    return this._number_input_window.update();
  }
  //--------------------------------------------------------------------------
  // Atualização do sprite de fundo
  //--------------------------------------------------------------------------
  async update_back_sprite() {
    this._back_sprite.visible = ((this._background === 1));
    this._back_sprite.y = (this.y - 16);
    this._back_sprite.opacity = this.openness;
    return await this._back_sprite.update();
  }
  //--------------------------------------------------------------------------
  // Atualização da exibição rápida
  //--------------------------------------------------------------------------
  update_show_fast() {
    if ((rb.v(this.pause) || (this.openness < 255))) {
      this._show_fast = false;
    } else if (Input.trigger_p(Input.C) && (this._wait_count < 2)) {
      this._show_fast = true;
    } else if (!(Input.press_p(Input.C))) {
      this._show_fast = false;
    }
    if (this._show_fast && (this._wait_count > 0)) {
      return this._wait_count -= 1;
    }
  }
  //--------------------------------------------------------------------------
  // Verificação de continuidade da mensagem
  //--------------------------------------------------------------------------
  continue_p() {
    if (($game_message.num_input_variable_id > 0)) {
      return true;
    }
    if (rb.empty_p($game_message.texts)) {
      return false;
    }
    if ((this.openness > 0) && !($game_temp.in_battle)) {
      if (!rb.eq(this._background, $game_message.background)) {
        return false;
      }
      if (!rb.eq(this._position, $game_message.position)) {
        return false;
      }
    }
    return true;
  }
  //--------------------------------------------------------------------------
  // Início da mensagem
  //--------------------------------------------------------------------------
  async start_message() {
    let i;
    this._text = "";
    for (i of rb.range(0, rb.size($game_message.texts), true)) {
      if ((i >= $game_message.choice_start)) {
        this._text = (this._text + "　　");
      }
      this._text = (this._text + (rb.clone(rb.idx($game_message.texts, i)) + "\u0000"));
    }
    this._item_max = $game_message.choice_max;
    this.convert_special_characters();
    this.reset_window();
    return await this.new_page();
  }
  //--------------------------------------------------------------------------
  // Processo de paginação
  //--------------------------------------------------------------------------
  async new_page() {
    let name, index;
    rb.clear(this.contents);
    if (rb.empty_p($game_message.face_name)) {
      this._contents_x = 0;
    } else {
      name = $game_message.face_name;
      index = $game_message.face_index;
      await this.draw_face(name, index, 0, 0);
      this._contents_x = 112;
    }
    this._contents_y = 0;
    this._line_count = 0;
    this._show_fast = false;
    this._line_show_fast = false;
    this._pause_skip = false;
    this.contents.font.color = this.text_color(0);
  }
  //--------------------------------------------------------------------------
  // Operações de nova linha
  //--------------------------------------------------------------------------
  new_line() {
    if (rb.empty_p($game_message.face_name)) {
      this._contents_x = 0;
    } else {
      this._contents_x = 112;
    }
    this._contents_y = rb.add(this._contents_y, Window_Base.WLH);
    this._line_count += 1;
    return this._line_show_fast = false;
  }
  //--------------------------------------------------------------------------
  // Conversão de caracteres especiais
  //--------------------------------------------------------------------------
  convert_special_characters() {
    this._text = rb.gsub_inplace(this._text, /\\V\[([0-9]+)\]/i, () => {
      return rb.idx($game_variables, rb.to_i(rb.ultimo(1)));
    });
    this._text = rb.gsub_inplace(this._text, /\\V\[([0-9]+)\]/i, () => {
      return rb.idx($game_variables, rb.to_i(rb.ultimo(1)));
    });
    this._text = rb.gsub_inplace(this._text, /\\N\[([0-9]+)\]/i, () => {
      return rb.idx($game_actors, rb.to_i(rb.ultimo(1))).name;
    });
    this._text = rb.gsub_inplace(this._text, /\\C\[([0-9]+)\]/i, () => {
      return `\u0001[${rb.str(rb.ultimo(1))}]`;
    });
    this._text = rb.gsub_inplace(this._text, /\\G/, () => {
      return "\u0002";
    });
    this._text = rb.gsub_inplace(this._text, /\\\./, () => {
      return "\u0003";
    });
    this._text = rb.gsub_inplace(this._text, /\\\|/, () => {
      return "\u0004";
    });
    this._text = rb.gsub_inplace(this._text, /\\!/, () => {
      return "\u0005";
    });
    this._text = rb.gsub_inplace(this._text, /\\>/, () => {
      return "\u0006";
    });
    this._text = rb.gsub_inplace(this._text, /\\</, () => {
      return "\u0007";
    });
    this._text = rb.gsub_inplace(this._text, /\\\^/, () => {
      return "\b";
    });
    this._text = rb.gsub_inplace(this._text, /\\\\/, () => {
      return "\\";
    });
  }
  //--------------------------------------------------------------------------
  // Posição do background e da janela
  //--------------------------------------------------------------------------
  reset_window() {
    this._background = $game_message.background;
    this._position = $game_message.position;
    if ((this._background === 0)) { // Janela comum
      this.opacity = 255;
    } else {
      // Escurecer o background
      this.opacity = 0;
    }
    const caso1 = this._position;
    if (caso1 === 0) { // Acima
      this.y = 0;
      this._gold_window.y = 360;
    } else if (caso1 === 1) { // Centro
      this.y = 144;
      this._gold_window.y = 0;
    } else if (caso1 === 2) { // Abaixo
      this.y = 288;
      this._gold_window.y = 0;
    }
  }
  //--------------------------------------------------------------------------
  // Fim da mensagem
  //--------------------------------------------------------------------------
  terminate_message() {
    this.active = false;
    this.pause = false;
    this.index = -1;
    this._gold_window.close();
    this._number_input_window.active = false;
    this._number_input_window.visible = false;
    if (($game_message.main_proc != null)) {
      rb.call($game_message.main_proc);
    }
    return rb.clear($game_message);
  }
  //--------------------------------------------------------------------------
  // Atualização da mensagem
  //--------------------------------------------------------------------------
  update_message() {
    while (true) {
      let c, c_width;
      c = rb.slice_bang(this._text, /./s, (s) => { this._text = s; }); // Dividir o texto
      const caso2 = c;
      if (caso2 === null) { // Exibição sem caractere
        this.finish_message(); // Fim da mensagem
        break;
      } else if (caso2 === "\u0000") { // Nova linha
        this.new_line();
        if ((this._line_count >= Window_Message.MAX_LINE)) { // Se for o máximo de linhas
          if (!(rb.empty_p(this._text))) {
            // Se você timer mais a ser escrito
            this.pause = true; // Pausar
            break;
          }
        }
      } else if (caso2 === "\u0001") { // \C[n]  (Troca de cor)
        this._text = rb.sub_inplace(this._text, /\[([0-9]+)\]/, "");
        this.contents.font.color = this.text_color(rb.to_i(rb.ultimo(1)));
        continue;
      } else if (caso2 === "\u0002") { // \G  (Exibição de dinheiro)
        this._gold_window.refresh();
        this._gold_window.open();
      } else if (caso2 === "\u0003") { // \.  (Espera de 1/4 de segundo)
        this._wait_count = 15;
        break;
      } else if (caso2 === "\u0004") { // \|  (Esera de 1 segundo)
        this._wait_count = 60;
        break;
      } else if (caso2 === "\u0005") { // \!  (Esperar pressionar)
        this.pause = true;
        break;
      } else if (caso2 === "\u0006") { // \>  (Exibição instantânea ligada)
        this._line_show_fast = true;
      } else if (caso2 === "\u0007") { // \<  (Exibição instantânea desliagada)
        this._line_show_fast = false;
      } else if (caso2 === "\b") { // \^  (Pausar até pressionar)
        this._pause_skip = true;
      } else {
        // Caracteres normais
        this.contents.draw_text(this._contents_x, this._contents_y, 40, Window_Base.WLH, c);
        c_width = this.contents.text_size(c).width;
        this._contents_x = rb.add(this._contents_x, c_width);
      }
      if (!((this._show_fast || this._line_show_fast))) {
        break;
      }
    }
  }
  //--------------------------------------------------------------------------
  // Fim das atualizações de mensagem
  //--------------------------------------------------------------------------
  finish_message() {
    if (($game_message.choice_max > 0)) {
      this.start_choice();
    } else if (($game_message.num_input_variable_id > 0)) {
      this.start_number_input();
    } else if (this._pause_skip) {
      this.terminate_message();
    } else {
      this.pause = true;
    }
    this._wait_count = 10;
    return this._text = null;
  }
  //--------------------------------------------------------------------------
  // Iniciar escolha
  //--------------------------------------------------------------------------
  start_choice() {
    this.active = true;
    this.index = 0;
  }
  //--------------------------------------------------------------------------
  // Iniciar inserção de números
  //--------------------------------------------------------------------------
  start_number_input() {
    let digits_max, number;
    digits_max = $game_message.num_input_digits_max;
    number = rb.idx($game_variables, $game_message.num_input_variable_id);
    this._number_input_window.digits_max = digits_max;
    this._number_input_window.number = number;
    if (rb.empty_p($game_message.face_name)) {
      this._number_input_window.x = this.x;
    } else {
      this._number_input_window.x = (this.x + 112);
    }
    this._number_input_window.y = rb.add(this.y, this._contents_y);
    this._number_input_window.active = true;
    this._number_input_window.visible = true;
    return this._number_input_window.update();
  }
  //--------------------------------------------------------------------------
  // Atualização do cursor
  //--------------------------------------------------------------------------
  update_cursor() {
    let x, y;
    if ((this._index >= 0)) {
      x = (rb.empty_p($game_message.face_name) ? 0 : 112);
      y = rb.mul((($game_message.choice_start + this._index)), Window_Base.WLH);
      return this.cursor_rect.set(x, y, rb.sub(this.contents.width, x), Window_Base.WLH);
    } else {
      return rb.empty(this.cursor_rect);
    }
  }
  //--------------------------------------------------------------------------
  // Inserção: pausa
  //--------------------------------------------------------------------------
  async input_pause() {
    if ((Input.trigger_p(Input.B) || Input.trigger_p(Input.C))) {
      this.pause = false;
      if ((this._text != null) && !(rb.empty_p(this._text))) {
        if ((this._line_count >= Window_Message.MAX_LINE)) {
          return await this.new_page();
        }
      } else {
        return this.terminate_message();
      }
    }
  }
  //--------------------------------------------------------------------------
  // Inserção: escolha
  //--------------------------------------------------------------------------
  input_choice() {
    if (Input.trigger_p(Input.B)) {
      if (($game_message.choice_cancel_type > 0)) {
        Sound.play_cancel();
        rb.call($game_message.choice_proc, ($game_message.choice_cancel_type - 1));
        return this.terminate_message();
      }
    } else if (Input.trigger_p(Input.C)) {
      Sound.play_decision();
      rb.call($game_message.choice_proc, this.index);
      return this.terminate_message();
    }
  }
  //--------------------------------------------------------------------------
  // Inserção: número
  //--------------------------------------------------------------------------
  input_number() {
    if (Input.trigger_p(Input.C)) {
      Sound.play_decision();
      rb.idxSet($game_variables, $game_message.num_input_variable_id, this._number_input_window.number);
      $game_map.need_refresh = true;
      return this.terminate_message();
    }
  }
});

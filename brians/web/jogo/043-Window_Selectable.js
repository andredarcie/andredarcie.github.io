// 043 - Window_Selectable: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Window_Selectable
//------------------------------------------------------------------------------
// Classe que tem a função de gerenciar os movimentos do cursor nas janelas
// de seleção.
//==============================================================================
//--------------------------------------------------------------------------
// Variáveis públicas
//--------------------------------------------------------------------------
globalThis.Window_Selectable = rb.classe("Window_Selectable", class Window_Selectable extends Window_Base {
  get item_max() { return this._item_max; } // Máximo de items
  get column_max() { return this._column_max; } // Máximo de colunas
  get index() { return this._index; } // Posição do cursor
  get help_window() { return this._help_window; } // Janela de ajuda
  //--------------------------------------------------------------------------
  // Inicialização do objeto
  //     x       : coordenada X da janela
  //     y       : coordenada Y da janela
  //     width   : largura da janela
  //     height  : altura da janela
  //     spacing : espaçamento entre items localizados próximos
  //--------------------------------------------------------------------------
  async initialize(x, y, width, height, spacing = 32) {
    this._item_max = 1;
    this._column_max = 1;
    this._index = -1;
    this._spacing = spacing;
    await super.initialize(x, y, width, height);
  }
  //--------------------------------------------------------------------------
  // Criação do conteúdo da janela
  //--------------------------------------------------------------------------
  create_contents() {
    this.contents.dispose();
    this.contents = Bitmap.new((this.width - 32), rb.max([(this.height - 32), rb.mul(this.row_max(), Window_Base.WLH)]));
  }
  //--------------------------------------------------------------------------
  // Posicionamento do cursor
  //     index : o novo cursor
  //--------------------------------------------------------------------------
  set index(index) {
    this._index = index;
    this.update_cursor();
    this.call_update_help();
  }
  //--------------------------------------------------------------------------
  // Número de linhas
  //--------------------------------------------------------------------------
  row_max() {
    return rb.div((((this._item_max + this._column_max) - 1)), this._column_max);
  }
  //--------------------------------------------------------------------------
  // Resgate da informação da primeira linha
  //--------------------------------------------------------------------------
  get top_row() {
    return rb.div(this.oy, Window_Base.WLH);
  }
  //--------------------------------------------------------------------------
  // Configuração da primeira linha
  //     row : exibição da primeira linha
  //--------------------------------------------------------------------------
  set top_row(row) {
    if ((row < 0)) {
      row = 0;
    }
    if ((row > (this.row_max() - 1))) {
      row = (this.row_max() - 1);
    }
    this.oy = rb.mul(row, Window_Base.WLH);
  }
  //--------------------------------------------------------------------------
  // Máximo de linhas em uma página
  //--------------------------------------------------------------------------
  page_row_max() {
    return rb.div(((this.height - 32)), Window_Base.WLH);
  }
  //--------------------------------------------------------------------------
  // Máximo de itens em uma página
  //--------------------------------------------------------------------------
  page_item_max() {
    return (this.page_row_max() * this._column_max);
  }
  //--------------------------------------------------------------------------
  // Resgate da informação da última linha
  //--------------------------------------------------------------------------
  get bottom_row() {
    return (rb.add(this.top_row, this.page_row_max()) - 1);
  }
  //--------------------------------------------------------------------------
  // Configuração da última linha
  //     row : exibição da última linha
  //--------------------------------------------------------------------------
  set bottom_row(row) {
    this.top_row = rb.sub(row, ((this.page_row_max() - 1)));
  }
  //--------------------------------------------------------------------------
  // Configuração do retângulo onde o item é desenhado
  //     index : número de itens
  //--------------------------------------------------------------------------
  item_rect(index) {
    let rect;
    rect = Rect.new(0, 0, 0, 0);
    rect.width = rb.sub(rb.div((rb.add(this.contents.width, this._spacing)), this._column_max), this._spacing);
    rect.height = Window_Base.WLH;
    rect.x = rb.mul(rb.mod(index, this._column_max), (rb.add(rect.width, this._spacing)));
    rect.y = rb.mul(rb.div(index, this._column_max), Window_Base.WLH);
    return rect;
  }
  //--------------------------------------------------------------------------
  // Configurações da janela de ajuda
  //     help_window : nova janela de ajuda
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Verificação da possibilidade de movimento do cursor
  //--------------------------------------------------------------------------
  cursor_movable_p() {
    if (((!(rb.v(this.visible)) || !(rb.v(this.active))))) {
      return false;
    }
    if (((((this.index < 0) || (this.index > this._item_max)) || (this._item_max === 0)))) {
      return false;
    }
    if (((this._opening || this._closing))) {
      return false;
    }
    return true;
  }
  //--------------------------------------------------------------------------
  // Mover cursor para baixo
  //     wrap : permissão de wrap
  //--------------------------------------------------------------------------
  cursor_down(wrap = false) {
    if ((((this._index < (this._item_max - this._column_max))) || (rb.v(wrap) && (this._column_max === 1)))) {
      return this._index = rb.mod(((this._index + this._column_max)), this._item_max);
    }
  }
  //--------------------------------------------------------------------------
  // Mover cursor para cima
  //     wrap : permissão de wrap
  //--------------------------------------------------------------------------
  cursor_up(wrap = false) {
    if ((((this._index >= this._column_max)) || (rb.v(wrap) && (this._column_max === 1)))) {
      return this._index = rb.mod((((this._index - this._column_max) + this._item_max)), this._item_max);
    }
  }
  //--------------------------------------------------------------------------
  // Mover cursor para direita
  //     wrap : permissão de wrap
  //--------------------------------------------------------------------------
  cursor_right(wrap = false) {
    if (((this._column_max >= 2)) && (((this._index < (this._item_max - 1)) || (rb.v(wrap) && (this.page_row_max() === 1))))) {
      return this._index = rb.mod(((this._index + 1)), this._item_max);
    }
  }
  //--------------------------------------------------------------------------
  // Mover cursor para esquerda
  //     wrap : permissão de wrap
  //--------------------------------------------------------------------------
  cursor_left(wrap = false) {
    if (((this._column_max >= 2)) && (((this._index > 0) || (rb.v(wrap) && (this.page_row_max() === 1))))) {
      return this._index = rb.mod((((this._index - 1) + this._item_max)), this._item_max);
    }
  }
  //--------------------------------------------------------------------------
  // Volta uma página com o cursor
  //--------------------------------------------------------------------------
  cursor_pagedown() {
    if ((rb.add(this.top_row, this.page_row_max()) < this.row_max())) {
      this._index = rb.min([rb.add(this._index, this.page_item_max()), (this._item_max - 1)]);
      return this.top_row = rb.add(this.top_row, this.page_row_max());
    }
  }
  //--------------------------------------------------------------------------
  // Avança uma página com o cursor
  //--------------------------------------------------------------------------
  cursor_pageup() {
    if ((this.top_row > 0)) {
      this._index = rb.max([rb.sub(this._index, this.page_item_max()), 0]);
      return this.top_row = rb.sub(this.top_row, this.page_row_max());
    }
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  update() {
    let last_index;
    super.update();
    if (this.cursor_movable_p()) {
      last_index = this._index;
      if (Input.repeat_p(Input.DOWN)) {
        this.cursor_down(Input.trigger_p(Input.DOWN));
      }
      if (Input.repeat_p(Input.UP)) {
        this.cursor_up(Input.trigger_p(Input.UP));
      }
      if (Input.repeat_p(Input.RIGHT)) {
        this.cursor_right(Input.trigger_p(Input.RIGHT));
      }
      if (Input.repeat_p(Input.LEFT)) {
        this.cursor_left(Input.trigger_p(Input.LEFT));
      }
      if (Input.repeat_p(Input.R)) {
        this.cursor_pagedown();
      }
      if (Input.repeat_p(Input.L)) {
        this.cursor_pageup();
      }
      if (!rb.eq(this._index, last_index)) {
        Sound.play_cursor();
      }
    }
    this.update_cursor();
    return this.call_update_help();
  }
  //--------------------------------------------------------------------------
  // Atualização do cursor
  //--------------------------------------------------------------------------
  update_cursor() {
    let row, rect;
    if ((this._index < 0)) { // Se o cursor for menor que 0
      return rb.empty(this.cursor_rect); // Desabilita o cursor
    } else {
      // Ou se o cursor for maior que 0
      row = rb.div(this._index, this._column_max); // Pegue a linha atual
      if ((row < this.top_row)) { // Aparece na primeira linha
        this.top_row = row; // A linha atual se torna uma "scroll"
      }
      if ((row > this.bottom_row)) { // É exibida a partir do final
        this.bottom_row = row; // A linha atual se torna uma "scroll"
      }
      rect = this.item_rect(this._index); // Escolhe items que o retângulo pega
      rect.y = rb.sub(rect.y, this.oy); // Scroll da posição retangular
      this.cursor_rect = rect; // Atualização do cursor retangular
    }
  }
  //--------------------------------------------------------------------------
  // Atualização da janela de ajuda
  //--------------------------------------------------------------------------
  call_update_help() {
    if (rb.v(this.active) && (this._help_window != null)) {
      return this.update_help();
    }
  }
  //--------------------------------------------------------------------------
  // Atualização da janela de ajuda (quando hereditariedade está definida)
  //--------------------------------------------------------------------------
  update_help() {
  }
  // fora do escopo (nada do jogo chama): help_window=
});

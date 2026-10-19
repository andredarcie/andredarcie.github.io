// 062 - Window_NumberInput: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Window_NumberInput
//------------------------------------------------------------------------------
// Essa classe é utilizada dentro da janela de mensagens para inserir um
// número.
//==============================================================================
//--------------------------------------------------------------------------
// Inicialização do objeto
//     digits_max : número de dígitos
//--------------------------------------------------------------------------
globalThis.Window_NumberInput = rb.classe("Window_NumberInput", class Window_NumberInput extends Window_Base {
  async initialize() {
    await super.initialize(0, 0, 544, 64);
    this._number = 0;
    this._digits_max = 6;
    this._index = 0;
    this.opacity = 0;
    this.active = false;
    this.z += 9999;
    this.refresh();
    this.update_cursor();
  }
  //--------------------------------------------------------------------------
  // Informação: números
  //--------------------------------------------------------------------------
  get number() {
    return this._number;
  }
  //--------------------------------------------------------------------------
  // Definição do valor numérico
  //     number : o novo número
  //--------------------------------------------------------------------------
  set number(number) {
    this._number = rb.min([rb.max([number, 0]), ((10 ** this._digits_max) - 1)]);
    this._index = 0;
    this.refresh();
  }
  //--------------------------------------------------------------------------
  // Resgate de informação do máximo de dígitos
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Definição do número de dígitos
  //     digits_max : novos dígitos
  //--------------------------------------------------------------------------
  set digits_max(digits_max) {
    this._digits_max = digits_max;
    this.refresh();
  }
  //--------------------------------------------------------------------------
  // Mover cursor para direita
  //     wrap : permissão de wrap
  //--------------------------------------------------------------------------
  cursor_right(wrap) {
    if (((this._index < (this._digits_max - 1)) || rb.v(wrap))) {
      return this._index = rb.mod(((this._index + 1)), this._digits_max);
    }
  }
  //--------------------------------------------------------------------------
  // Mover cursor para esquerda
  //     wrap : permissão de wrap
  //--------------------------------------------------------------------------
  cursor_left(wrap) {
    if (((this._index > 0) || rb.v(wrap))) {
      return this._index = rb.mod(((rb.add(this._index, this._digits_max) - 1)), this._digits_max);
    }
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  update() {
    let place, n, last_index;
    super.update();
    if (rb.v(this.active)) {
      if ((Input.repeat_p(Input.UP) || Input.repeat_p(Input.DOWN))) {
        Sound.play_cursor();
        place = (10 ** (rb.sub((this._digits_max - 1), this._index)));
        n = rb.mod(rb.div(this._number, place), 10);
        this._number = rb.sub(this._number, rb.mul(n, place));
        if (Input.repeat_p(Input.UP)) {
          n = rb.mod(((n + 1)), 10);
        }
        if (Input.repeat_p(Input.DOWN)) {
          n = rb.mod(((n + 9)), 10);
        }
        this._number = rb.add(this._number, rb.mul(n, place));
        this.refresh();
      }
      last_index = this._index;
      if (Input.repeat_p(Input.RIGHT)) {
        this.cursor_right(Input.trigger_p(Input.RIGHT));
      }
      if (Input.repeat_p(Input.LEFT)) {
        this.cursor_left(Input.trigger_p(Input.LEFT));
      }
      if (!rb.eq(this._index, last_index)) {
        Sound.play_cursor();
      }
      return this.update_cursor();
    }
  }
  //--------------------------------------------------------------------------
  // Atualização
  //--------------------------------------------------------------------------
  refresh() {
    let s, i;
    rb.clear(this.contents);
    this.contents.font.color = this.normal_color();
    s = rb.sprintf("%0*d", this._digits_max, this._number);
    for (i of rb.range(0, this._digits_max, true)) {
      this.contents.draw_text((24 + (i * 16)), 0, 16, Window_Base.WLH, rb.idx(s, i, 1), 1);
    }
  }
  //--------------------------------------------------------------------------
  // Atualização do cursor
  //--------------------------------------------------------------------------
  update_cursor() {
    return this.cursor_rect.set((24 + (this._index * 16)), 0, 16, Window_Base.WLH);
  }
  // fora do escopo (nada do jogo chama): digits_max
});

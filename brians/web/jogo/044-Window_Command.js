// 044 - Window_Command: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Window_Command
//------------------------------------------------------------------------------
// Esta é a janela que faz uma seleção geral de comandos.
//==============================================================================
//--------------------------------------------------------------------------
// Variáveis públicas
//--------------------------------------------------------------------------
globalThis.Window_Command = rb.classe("Window_Command", class Window_Command extends Window_Selectable {
  get commands() { return this._commands; } // Comandos
  //--------------------------------------------------------------------------
  // Inicialização do objeto
  //     width      : largura da janela
  //     commands   : array de comandos
  //     column_max : número de colunas (2 ou mais)
  //     row_max    : número de linhas (0: número de comandos)
  //     spacing    : espaçamento entre items localizados próximos
  //--------------------------------------------------------------------------
  async initialize(width, commands, column_max = 1, row_max = 0, spacing = 32) {
    if ((row_max === 0)) {
      row_max = rb.div((((rb.size(commands) + column_max) - 1)), column_max);
    }
    await super.initialize(0, 0, width, (rb.mul(row_max, Window_Base.WLH) + 32), spacing);
    this._commands = commands;
    this._item_max = rb.size(commands);
    this._column_max = column_max;
    this.refresh();
    this.index = 0;
  }
  //--------------------------------------------------------------------------
  // Atualização
  //--------------------------------------------------------------------------
  refresh() {
    let i;
    rb.clear(this.contents);
    for (i of rb.range(0, this._item_max, true)) {
      this.draw_item(i);
    }
  }
  //--------------------------------------------------------------------------
  // Desenho do item
  //     index   : número (ID) do item
  //     enabled : espaço ativo. Quando translúcido significa falso
  //--------------------------------------------------------------------------
  draw_item(index, enabled = true) {
    let rect;
    rect = this.item_rect(index);
    rect.x += 4;
    rect.width -= 8;
    this.contents.clear_rect(rect);
    this.contents.font.color = this.normal_color();
    this.contents.font.color.alpha = (rb.v(enabled) ? 255 : 128);
    return this.contents.draw_text(rect, rb.idx(this._commands, index));
  }
});

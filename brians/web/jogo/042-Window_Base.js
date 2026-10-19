// 042 - Window_Base: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Window_Base
//------------------------------------------------------------------------------
// Esta é a classe superior à todas as classes de janelas do jogo.
//==============================================================================
globalThis.Window_Base = rb.classe("Window_Base", class Window_Base extends Window {
});
//--------------------------------------------------------------------------
// Contantes
//--------------------------------------------------------------------------
Window_Base.WLH = 24; // Altura da linha da janela (Window Line Height)
//--------------------------------------------------------------------------
// Inicialização do objeto
//     x      : coordenada X da janela
//     y      : coordenada Y da janela
//     width  : largura da janela
//     height : altura da janela
//--------------------------------------------------------------------------
rb.reabrir(Window_Base, class extends rb.superDe(Window_Base) {
  async initialize(x, y, width, height) {
    super.initialize();
    this.windowskin = (await Cache.system("Window"));
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.z = 100;
    this.back_opacity = 200;
    this.openness = 255;
    this.create_contents();
    this._opening = false;
    this._closing = false;
  }
  //--------------------------------------------------------------------------
  // Dispose
  //--------------------------------------------------------------------------
  dispose() {
    this.contents.dispose();
    return super.dispose();
  }
  //--------------------------------------------------------------------------
  // Criação do conteúdo da janela
  //--------------------------------------------------------------------------
  create_contents() {
    this.contents.dispose();
    this.contents = Bitmap.new((this.width - 32), (this.height - 32));
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  update() {
    super.update();
    if (this._opening) {
      this.openness += 48;
      if ((this.openness === 255)) {
        return this._opening = false;
      }
    } else if (this._closing) {
      this.openness -= 48;
      if ((this.openness === 0)) {
        return this._closing = false;
      }
    }
  }
  //--------------------------------------------------------------------------
  // Abrir janela
  //--------------------------------------------------------------------------
  open() {
    if ((this.openness < 255)) {
      this._opening = true;
    }
    return this._closing = false;
  }
  //--------------------------------------------------------------------------
  // Fechar janela
  //--------------------------------------------------------------------------
  close() {
    if ((this.openness > 0)) {
      this._closing = true;
    }
    return this._opening = false;
  }
  //--------------------------------------------------------------------------
  // Configuração da cor da letra
  //     n : cor da letra (0～31)
  //--------------------------------------------------------------------------
  text_color(n) {
    let x, y;
    x = (64 + ((rb.mod(n, 8)) * 8));
    y = (96 + ((rb.div(n, 8)) * 8));
    return this.windowskin.get_pixel(x, y);
  }
  //--------------------------------------------------------------------------
  // Configuração da cor padrão da letra
  //--------------------------------------------------------------------------
  normal_color() {
    return this.text_color(0);
  }
  //--------------------------------------------------------------------------
  // Configuração da cor da letra do sistema
  //--------------------------------------------------------------------------
  system_color() {
    return this.text_color(16);
  }
  //--------------------------------------------------------------------------
  // Configuração da cor da letra de estado crítico
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Configuração da cor da letra da derrota em batalha
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Configuração da cor da letra do contador
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Configuração do medidor de HP 1
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Configuração do medidor de HP 2
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Configuração do medidor de MP 1
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Configuração do medidor de MP 2
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Configuração da cor de um power up na tela de equipamentos
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Configuração de um power down na tela de equipamentos
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Exibição do ícone
  //     icon_index : número do ícone
  //     x          : exibe na coordenada X
  //     y          : exibe na coordenada Y
  //     enabled    : um espaço permitido. Fica transparente quando falso
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Exibição dos gráficos de face
  //     face_name  : nome do arquivo de face
  //     face_index : número do arquivo de face
  //     x          : exibe na coordenada X
  //     y          : exibe na coordenada Y
  //     size       : exibe o tamanho
  //--------------------------------------------------------------------------
  async draw_face(face_name, face_index, x, y, size = 96) {
    let bitmap, rect;
    bitmap = (await Cache.face(face_name));
    rect = Rect.new(0, 0, 0, 0);
    rect.x = rb.add((rb.mod(face_index, 4) * 96), rb.div(((96 - size)), 2));
    rect.y = rb.add((rb.div(face_index, 4) * 96), rb.div(((96 - size)), 2));
    rect.width = size;
    rect.height = size;
    this.contents.blt(x, y, bitmap, rect);
    return bitmap.dispose();
  }
  //--------------------------------------------------------------------------
  // Exibição dos gráficos de movimento
  //     character_name  : nome do arquivo em movimento
  //     character_index : número do arquivo em movimento
  //     x               : exibe na coordenada X destino
  //     y               : exobe na coordenada Y destino
  //--------------------------------------------------------------------------
  async draw_character(character_name, character_index, x, y) {
    let bitmap, sign, cw, ch, n, src_rect;
    if ((character_name == null)) {
      return;
    }
    bitmap = (await Cache.character(character_name));
    sign = rb.idx(character_name, /^[\!\$]./);
    if ((sign != null) && rb.include_p(sign, "$")) {
      cw = rb.div(bitmap.width, 3);
      ch = rb.div(bitmap.height, 4);
    } else {
      cw = rb.div(bitmap.width, 12);
      ch = rb.div(bitmap.height, 8);
    }
    n = character_index;
    src_rect = Rect.new(rb.mul((((rb.mod(n, 4) * 3) + 1)), cw), rb.mul(((rb.div(n, 4) * 4)), ch), cw, ch);
    return this.contents.blt(rb.sub(x, rb.div(cw, 2)), rb.sub(y, ch), bitmap, src_rect);
  }
  //--------------------------------------------------------------------------
  // Configuração da cor do HP
  //     actor : herói
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Configuração da cor do MP
  //     actor : herói
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Exibição dos gráficos do herói
  //     actor : herói
  //     x     : exibe na coordenada X
  //     y     : exibe na coordenada Y
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Exibição dos gráficos de face do herói
  //     actor : herói
  //     x     : exibe na coordenada X
  //     y     : exibe na coordenada Y
  //     size  : exibe o tamanho
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Exibição dos nomes
  //     actor : herói
  //     x     : exibe na coordenada X
  //     y     : exibe na coordenada Y
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Exibição da classe
  //     actor : herói
  //     x     : exibe na coordenada X
  //     y     : exibe na coordenada Y
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Exibição do nível
  //     actor : herói
  //     x     : exibe na coordenada X
  //     y     : exibe na coordenada Y
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Exibição do status
  //     actor : herói
  //     x     : exibe na coordenada X
  //     y     : exibe na coordenada Y
  //     width : largura
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Exibição do HP
  //     actor : herói
  //     x     : exibe na coordenada X
  //     y     : exibe na coordenada Y
  //     width : largura
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Exibição do HP em estado crítico
  //     actor : herói
  //     x     : exibe na coordenada X
  //     y     : exibe na coordenada Y
  //     width : largura
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Exibição do MP
  //     actor : herói
  //     x     : exibe na coordenada X
  //     y     : exibe na coordenada Y
  //     width : largura
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Exibição do MP com baixo nível
  //     actor : herói
  //     x     : exibe na coordenada X
  //     y     : exibe na coordenada Y
  //     width : largura
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Exibição dos parâmetros
  //     actor : herói
  //     x     : exibe na coordenada X
  //     y     : exibe na coordenada Y
  //     type  : tipo do valor (0～3)
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Exibição do nome do item
  //     item    : itens (habilidades, armas e equipamentos são bem-vindos)
  //     x       : exibe na coordenada X
  //     y       : exibe na coordenada Y
  //     enabled : um espaço permitido. Fica translúcido quando falso
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Exibição da unidade monetária com valor em posse
  //     value : valor em posse
  //     x     : exibe na coordenada X
  //     y     : exibe na coordenada Y
  //     width : largura
  //--------------------------------------------------------------------------
  draw_currency_value(value, x, y, width) {
    let cx;
    cx = this.contents.text_size(Vocab.gold).width;
    this.contents.font.color = this.normal_color();
    this.contents.draw_text(x, y, (rb.sub(width, cx) - 2), Window_Base.WLH, value, 2);
    this.contents.font.color = this.system_color();
    return this.contents.draw_text(x, y, width, Window_Base.WLH, Vocab.gold, 2);
  }
  // fora do escopo (nada do jogo chama): crisis_color, knockout_color, gauge_back_color, hp_gauge_color1, hp_gauge_color2, mp_gauge_color1, mp_gauge_color2, power_up_color, power_down_color, draw_icon, hp_color, mp_color, draw_actor_graphic, draw_actor_face, draw_actor_name, draw_actor_class, draw_actor_level, draw_actor_state, draw_actor_hp, draw_actor_hp_gauge, draw_actor_mp, draw_actor_mp_gauge, draw_actor_parameter, draw_item_name
});

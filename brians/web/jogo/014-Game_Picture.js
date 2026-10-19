// 014 - Game_Picture: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Game_Picture
//------------------------------------------------------------------------------
// Classe responsável pelas operações com imagens (pictures).Esta classe é
// utilizada dentro da classe Game_Screen.
// Imagens do mapa de combate e imagens gerais são tratadas separadamente.
//==============================================================================
//--------------------------------------------------------------------------
// Variáveis públicas
//--------------------------------------------------------------------------
globalThis.Game_Picture = rb.classe("Game_Picture", class Game_Picture extends rb.Objeto {
  get number() { return this._number; } // Número da imagem (ID)
  get name() { return this._name; } // Nome do arquivo
  get origin() { return this._origin; } // Origem do arquivo
  get x() { return this._x; } // Coordenada X
  get y() { return this._y; } // Coordenada Y
  get zoom_x() { return this._zoom_x; } // Coordenada X para zoom
  get zoom_y() { return this._zoom_y; } // Coordenada Y para zoom
  get opacity() { return this._opacity; } // Opacidade
  get blend_type() { return this._blend_type; } // Tipo de siteticidade
  get tone() { return this._tone; } // Tonalidade
  get angle() { return this._angle; } // ângulo de rotação
  //--------------------------------------------------------------------------
  // Inicialização do objeto
  //     number : número da imagem (ID)
  //--------------------------------------------------------------------------
  initialize(number) {
    this._number = number;
    this._name = "";
    this._origin = 0;
    this._x = 0.0;
    this._y = 0.0;
    this._zoom_x = 100.0;
    this._zoom_y = 100.0;
    this._opacity = 255.0;
    this._blend_type = 1;
    this._duration = 0;
    this._target_x = this._x;
    this._target_y = this._y;
    this._target_zoom_x = this._zoom_x;
    this._target_zoom_y = this._zoom_y;
    this._target_opacity = this._opacity;
    this._tone = Tone.new(0, 0, 0, 0);
    this._tone_target = Tone.new(0, 0, 0, 0);
    this._tone_duration = 0;
    rb.num(this, "_angle", 0, "int");
    this._rotate_speed = 0;
  }
  //--------------------------------------------------------------------------
  // Exibição da imagem
  //     name         : nome do arquivo
  //     origin       : origem do arquivo
  //     x            : coordenada X
  //     y            : coordenada Y
  //     zoom_x       : coordenada X para zoom
  //     zoom_y       : coordenada Y para zoom
  //     opacity      : opacidade
  //     blend_type   : tipo de sinteticidade
  //--------------------------------------------------------------------------
  show(name, origin, x, y, zoom_x, zoom_y, opacity, blend_type) {
    this._name = name;
    this._origin = origin;
    this._x = rb.to_f(x);
    this._y = rb.to_f(y);
    this._zoom_x = rb.to_f(zoom_x);
    this._zoom_y = rb.to_f(zoom_y);
    this._opacity = rb.to_f(opacity);
    this._blend_type = blend_type;
    this._duration = 0;
    this._target_x = this._x;
    this._target_y = this._y;
    this._target_zoom_x = this._zoom_x;
    this._target_zoom_y = this._zoom_y;
    this._target_opacity = this._opacity;
    this._tone = Tone.new(0, 0, 0, 0);
    this._tone_target = Tone.new(0, 0, 0, 0);
    this._tone_duration = 0;
    rb.num(this, "_angle", 0, "int");
    return this._rotate_speed = 0;
  }
  //--------------------------------------------------------------------------
  // Movimento da imagem
  //     origin       : origem
  //     x            : coordenada X
  //     y            : coordenada Y
  //     zoom_x       : coordenada X para zoom
  //     zoom_y       : coordenada Y para zoom
  //     opacity      : opacidade
  //     blend_type   : tipo de sinteticidade
  //     duration     : tempo de duração
  //--------------------------------------------------------------------------
  move(origin, x, y, zoom_x, zoom_y, opacity, blend_type, duration) {
    this._origin = origin;
    this._target_x = rb.to_f(x);
    this._target_y = rb.to_f(y);
    this._target_zoom_x = rb.to_f(zoom_x);
    this._target_zoom_y = rb.to_f(zoom_y);
    this._target_opacity = rb.to_f(opacity);
    this._blend_type = blend_type;
    return this._duration = duration;
  }
  //--------------------------------------------------------------------------
  // Rotação da imagem
  //     speed : velocidade da rotação
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Mudança de tonalidade
  //     tone     : tonalidade
  //     duration : tempo de duração
  //--------------------------------------------------------------------------
  start_tone_change(tone, duration) {
    this._tone_target = rb.clone(tone);
    this._tone_duration = duration;
    if ((this._tone_duration === 0)) {
      return this._tone = rb.clone(this._tone_target);
    }
  }
  //--------------------------------------------------------------------------
  // Limpar imagem
  //--------------------------------------------------------------------------
  erase() {
    return this._name = "";
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  update() {
    let d;
    if ((this._duration >= 1)) {
      d = this._duration;
      this._x = ((((this._x * ((d - 1))) + this._target_x)) / d);
      this._y = ((((this._y * ((d - 1))) + this._target_y)) / d);
      this._zoom_x = ((((this._zoom_x * ((d - 1))) + this._target_zoom_x)) / d);
      this._zoom_y = ((((this._zoom_y * ((d - 1))) + this._target_zoom_y)) / d);
      this._opacity = ((((this._opacity * ((d - 1))) + this._target_opacity)) / d);
      this._duration -= 1;
    }
    if ((this._tone_duration >= 1)) {
      d = this._tone_duration;
      this._tone.red = ((((this._tone.red * ((d - 1))) + this._tone_target.red)) / d);
      this._tone.green = ((((this._tone.green * ((d - 1))) + this._tone_target.green)) / d);
      this._tone.blue = ((((this._tone.blue * ((d - 1))) + this._tone_target.blue)) / d);
      this._tone.gray = ((((this._tone.gray * ((d - 1))) + this._tone_target.gray)) / d);
      this._tone_duration -= 1;
    }
    if ((this._rotate_speed !== 0)) {
      rb.num(this, "_angle", (this._angle + (this._rotate_speed / 2.0)), "float");
      while ((this._angle < 0)) {
        rb.num(this, "_angle", (this._angle + 360), null);
      }
      return this._angle = rb.mod(this._angle, 360);
    }
  }
  // fora do escopo (nada do jogo chama): rotate
});
rb.floats(Game_Picture, ["_target_opacity","_target_zoom_y","_target_zoom_x","_target_y","_target_x","_opacity","_zoom_y","_zoom_x","_y","_x"]);

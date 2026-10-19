// 013 - Game_Screen: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Game_Screen
//------------------------------------------------------------------------------
// Classe que gerencia os efeitos da tela em geral, como tonalidade, flashes,
// terremotos e etc. Esta classe é utilizada dentro das classes Game_Map e
// Game_Troop.
//==============================================================================
//--------------------------------------------------------------------------
// Variáveis públicas
//--------------------------------------------------------------------------
globalThis.Game_Screen = rb.classe("Game_Screen", class Game_Screen extends rb.Objeto {
  get brightness() { return this._brightness; } // Luminosidade
  get tone() { return this._tone; } // Tom da tela
  get flash_color() { return this._flash_color; } // Cor do flash
  get shake() { return this._shake; } // Efeito de tremor
  get pictures() { return this._pictures; } // Pictures (imagens)
  get weather_type() { return this._weather_type; } // Tipo de clima
  get weather_max() { return this._weather_max; } // Máximo de imagens de clima
  //--------------------------------------------------------------------------
  // Inicialização do objeto
  //--------------------------------------------------------------------------
  initialize() {
    this.clear();
  }
  //--------------------------------------------------------------------------
  // Limpar
  //--------------------------------------------------------------------------
  clear() {
    let i;
    this._brightness = 255;
    this._fadeout_duration = 0;
    this._fadein_duration = 0;
    this._tone = Tone.new(0, 0, 0, 0);
    this._tone_target = Tone.new(0, 0, 0, 0);
    this._tone_duration = 0;
    this._flash_color = Color.new(0, 0, 0, 0);
    this._flash_duration = 0;
    this._shake_power = 0;
    this._shake_speed = 0;
    this._shake_duration = 0;
    this._shake_direction = 1;
    this._shake = 0;
    this._pictures = [];
    for (i of rb.range(0, 20, false)) {
      rb.push(this._pictures, Game_Picture.new(i));
    }
    this._weather_type = 0;
    this._weather_max = 0.0;
    this._weather_type_target = 0;
    this._weather_max_target = 0.0;
    return this._weather_duration = 0;
  }
  //--------------------------------------------------------------------------
  // Iniciar fade-out
  //     duration : tempo de duração
  //--------------------------------------------------------------------------
  start_fadeout(duration) {
    this._fadeout_duration = duration;
    return this._fadein_duration = 0;
  }
  //--------------------------------------------------------------------------
  // Iniciar fade-in
  //     duration : tempo de duraçãoi
  //--------------------------------------------------------------------------
  start_fadein(duration) {
    this._fadein_duration = duration;
    return this._fadeout_duration = 0;
  }
  //--------------------------------------------------------------------------
  // Iniciar mudanças de tonalidade
  //     tone     : tonalidade da tela
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
  // Iniciar flash
  //     color    : cor
  //     duration : tempo de duração
  //--------------------------------------------------------------------------
  start_flash(color, duration) {
    this._flash_color = rb.clone(color);
    return this._flash_duration = duration;
  }
  //--------------------------------------------------------------------------
  // Iniciar tremor
  //     power    : potência do tremor
  //     speed    : velocidade
  //     duration : tempo de duração
  //--------------------------------------------------------------------------
  start_shake(power, speed, duration) {
    this._shake_power = power;
    this._shake_speed = speed;
    return this._shake_duration = duration;
  }
  //--------------------------------------------------------------------------
  // Iniciar efeito climático
  //     type     : tipo de efeito
  //     power    : grau do efeito (poder)
  //     duration : tempo de duração
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  update() {
    this.update_fadeout();
    this.update_fadein();
    this.update_tone();
    this.update_flash();
    this.update_shake();
    this.update_weather();
    return this.update_pictures();
  }
  //--------------------------------------------------------------------------
  // Atualização do fade-out
  //--------------------------------------------------------------------------
  update_fadeout() {
    let d;
    if ((this._fadeout_duration >= 1)) {
      d = this._fadeout_duration;
      this._brightness = rb.div((rb.mul(this._brightness, ((d - 1)))), d);
      return this._fadeout_duration -= 1;
    }
  }
  //--------------------------------------------------------------------------
  // Atualização do fade-in
  //--------------------------------------------------------------------------
  update_fadein() {
    let d;
    if ((this._fadein_duration >= 1)) {
      d = this._fadein_duration;
      this._brightness = rb.div(((rb.mul(this._brightness, ((d - 1))) + 255)), d);
      return this._fadein_duration -= 1;
    }
  }
  //--------------------------------------------------------------------------
  // Atualização da tonalidade
  //--------------------------------------------------------------------------
  update_tone() {
    let d;
    if ((this._tone_duration >= 1)) {
      d = this._tone_duration;
      this._tone.red = ((((this._tone.red * ((d - 1))) + this._tone_target.red)) / d);
      this._tone.green = ((((this._tone.green * ((d - 1))) + this._tone_target.green)) / d);
      this._tone.blue = ((((this._tone.blue * ((d - 1))) + this._tone_target.blue)) / d);
      this._tone.gray = ((((this._tone.gray * ((d - 1))) + this._tone_target.gray)) / d);
      return this._tone_duration -= 1;
    }
  }
  //--------------------------------------------------------------------------
  // Atualização do flash
  //--------------------------------------------------------------------------
  update_flash() {
    let d;
    if ((this._flash_duration >= 1)) {
      d = this._flash_duration;
      this._flash_color.alpha = ((this._flash_color.alpha * ((d - 1))) / d);
      return this._flash_duration -= 1;
    }
  }
  //--------------------------------------------------------------------------
  // Atualização do tremor
  //--------------------------------------------------------------------------
  update_shake() {
    let delta;
    if (((this._shake_duration >= 1) || (this._shake !== 0))) {
      delta = (((rb.mul(this._shake_power, this._shake_speed) * this._shake_direction)) / 10.0);
      if ((this._shake_duration <= 1) && ((this._shake * ((this._shake + delta))) < 0)) {
        this._shake = 0;
      } else {
        this._shake += delta;
      }
      if ((this._shake > (this._shake_power * 2))) {
        this._shake_direction = -1;
      }
      if ((this._shake < ((-this._shake_power) * 2))) {
        this._shake_direction = 1;
      }
      if ((this._shake_duration >= 1)) {
        return this._shake_duration -= 1;
      }
    }
  }
  //--------------------------------------------------------------------------
  // Atualização do clima
  //--------------------------------------------------------------------------
  update_weather() {
    let d;
    if ((this._weather_duration >= 1)) {
      d = this._weather_duration;
      this._weather_max = ((((this._weather_max * ((d - 1))) + this._weather_max_target)) / d);
      this._weather_duration -= 1;
      if ((this._weather_duration === 0)) {
        return this._weather_type = this._weather_type_target;
      }
    }
  }
  //--------------------------------------------------------------------------
  // Atualização das pictures
  //--------------------------------------------------------------------------
  update_pictures() {
    let picture;
    for (picture of this._pictures) {
      picture.update();
    }
  }
  // fora do escopo (nada do jogo chama): weather
});
rb.floats(Game_Screen, ["_weather_max_target","_weather_max"]);

// 037 - Spriteset_Weather: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Spriteset_Weather
//------------------------------------------------------------------------------
// Classe dos efeitos climáticos (chuva, tempestade e neve).
// Essa classe é utilizada dentro da classe Spriteset_Map.
//==============================================================================
//--------------------------------------------------------------------------
// Variáveis públicas
//--------------------------------------------------------------------------
globalThis.Spriteset_Weather = rb.classe("Spriteset_Weather", class Spriteset_Weather extends rb.Objeto {
  get type() { return this._type; }
  get max() { return this._max; }
  get ox() { return this._ox; }
  get oy() { return this._oy; }
  //--------------------------------------------------------------------------
  // Inicialização do objeto
  //--------------------------------------------------------------------------
  initialize(viewport = null) {
    let color1, color2, i, sprite;
    this._type = 0;
    this._max = 0;
    this._ox = 0;
    this._oy = 0;
    color1 = Color.new(255, 255, 255, 160);
    color2 = Color.new(255, 255, 255, 80);
    this._rain_bitmap = Bitmap.new(7, 56);
    for (i of rb.range(0, 6, false)) {
      this._rain_bitmap.fill_rect((6 - i), (i * 8), 1, 8, color1);
    }
    this._storm_bitmap = Bitmap.new(34, 64);
    for (i of rb.range(0, 31, false)) {
      this._storm_bitmap.fill_rect((33 - i), (i * 2), 1, 2, color2);
      this._storm_bitmap.fill_rect((32 - i), (i * 2), 1, 2, color1);
      this._storm_bitmap.fill_rect((31 - i), (i * 2), 1, 2, color2);
    }
    this._snow_bitmap = Bitmap.new(6, 6);
    this._snow_bitmap.fill_rect(0, 1, 6, 4, color2);
    this._snow_bitmap.fill_rect(1, 0, 4, 6, color2);
    this._snow_bitmap.fill_rect(1, 2, 4, 2, color1);
    this._snow_bitmap.fill_rect(2, 1, 2, 4, color1);
    this._sprites = [];
    for (i of rb.range(1, 40, false)) {
      sprite = Sprite.new(viewport);
      sprite.visible = false;
      sprite.opacity = 0;
      rb.push(this._sprites, sprite);
    }
  }
  //--------------------------------------------------------------------------
  // Dispose
  //--------------------------------------------------------------------------
  dispose() {
    let sprite;
    for (sprite of this._sprites) {
      sprite.dispose();
    }
    this._rain_bitmap.dispose();
    this._storm_bitmap.dispose();
    return this._snow_bitmap.dispose();
  }
  //--------------------------------------------------------------------------
  // Definição do tipo de tempo
  //     type : tipos de tempo
  //--------------------------------------------------------------------------
  set type(type) {
    let bitmap, i, sprite;
    if (rb.eq(this._type, type)) {
      return;
    }
    this._type = type;
    const caso1 = this._type;
    if (caso1 === 1) {
      bitmap = this._rain_bitmap;
    } else if (caso1 === 2) {
      bitmap = this._storm_bitmap;
    } else if (caso1 === 3) {
      bitmap = this._snow_bitmap;
    } else {
      bitmap = null;
    }
    for (i of rb.range(0, rb.size(this._sprites), true)) {
      sprite = rb.idx(this._sprites, i);
      sprite.visible = ((i <= this._max));
      sprite.bitmap = bitmap;
    }
  }
  //--------------------------------------------------------------------------
  // Configuração da coordenada X
  //     ox : coordenada X
  //--------------------------------------------------------------------------
  set ox(ox) {
    let sprite;
    if (rb.eq(this._ox, ox)) {
      return;
    }
    this._ox = ox;
    for (sprite of this._sprites) {
      sprite.ox = this._ox;
    }
  }
  //--------------------------------------------------------------------------
  // Configuração da coordenada Y
  //     oy : coordenada Y
  //--------------------------------------------------------------------------
  set oy(oy) {
    let sprite;
    if (rb.eq(this._oy, oy)) {
      return;
    }
    this._oy = oy;
    for (sprite of this._sprites) {
      sprite.oy = this._oy;
    }
  }
  //--------------------------------------------------------------------------
  // Configuração do número máximo de sprites
  //     max : número máximo de sprites
  //--------------------------------------------------------------------------
  set max(max) {
    let i, sprite;
    if (rb.eq(this._max, max)) {
      return;
    }
    this._max = rb.min([rb.max([max, 0]), 40]);
    for (i of rb.range(1, 40, false)) {
      sprite = rb.idx(this._sprites, i);
      if ((sprite != null)) {
        sprite.visible = ((i <= this._max));
      }
    }
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  update() {
    let i, sprite, x, y;
    if ((this._type === 0)) {
      return;
    }
    for (i of rb.range(1, this._max, false)) {
      sprite = rb.idx(this._sprites, i);
      if ((sprite == null)) {
        break;
      }
      if ((this._type === 1)) {
        sprite.x -= 2;
        sprite.y += 16;
        sprite.opacity -= 8;
      }
      if ((this._type === 2)) {
        sprite.x -= 8;
        sprite.y += 16;
        sprite.opacity -= 12;
      }
      if ((this._type === 3)) {
        sprite.x -= 2;
        sprite.y += 8;
        sprite.opacity -= 8;
      }
      x = rb.sub(sprite.x, this._ox);
      y = rb.sub(sprite.y, this._oy);
      if ((sprite.opacity < 64)) {
        sprite.x = ((rb.rand(800) - 100) + this._ox);
        sprite.y = ((rb.rand(600) - 200) + this._oy);
        sprite.opacity = 255;
      }
    }
  }
});

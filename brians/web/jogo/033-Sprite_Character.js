// 033 - Sprite_Character: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Sprite_Character
//------------------------------------------------------------------------------
// Classe que gerencia os gráficos de personagens a serem exibidos.
// Esta classe está vinculada à classe Game_Character, que a monitora e
// automaticamente muda o status do sprite.
//==============================================================================
globalThis.Sprite_Character = rb.classe("Sprite_Character", class Sprite_Character extends Sprite_Base {
});
//--------------------------------------------------------------------------
// Constantes
//--------------------------------------------------------------------------
Sprite_Character.BALLOON_WAIT = 12; // Tempo de espera do frame final
//--------------------------------------------------------------------------
// Variáveis públicas
//--------------------------------------------------------------------------
rb.reabrir(Sprite_Character, class extends rb.superDe(Sprite_Character) {
  get character() { return this._character; }
  set character(v) { this._character = v; }
  //--------------------------------------------------------------------------
  // Iniialização do objeto
  //     viewport  : "camada"
  //     character : Personagem (Game_Character)
  //--------------------------------------------------------------------------
  async initialize(viewport, character = null) {
    super.initialize(viewport);
    this._character = character;
    this._balloon_duration = 0;
    await this.update();
  }
  //--------------------------------------------------------------------------
  // Dispose
  //--------------------------------------------------------------------------
  dispose() {
    this.dispose_balloon();
    return super.dispose();
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  async update() {
    let animation;
    super.update();
    await this.update_bitmap();
    this.visible = (!this._character.transparent);
    this.update_src_rect();
    this.x = this._character.screen_x;
    this.y = this._character.screen_y;
    this.z = this._character.screen_z();
    this.opacity = this._character.opacity;
    this.blend_type = this._character.blend_type;
    this.bush_depth = this._character.bush_depth;
    this.update_balloon();
    if ((this._character.animation_id !== 0)) {
      animation = rb.idx($data_animations, this._character.animation_id);
      await this.start_animation(animation);
      this._character.animation_id = 0;
    }
    if ((this._character.balloon_id !== 0)) {
      this._balloon_id = this._character.balloon_id;
      await this.start_balloon();
      this._character.balloon_id = 0;
    }
  }
  //--------------------------------------------------------------------------
  // Resgate da informação de imagem de tile set definida a ser incluída
  //     tile_id : ID do tile
  //--------------------------------------------------------------------------
  async tileset_bitmap(tile_id) {
    let set_number;
    set_number = rb.div(tile_id, 256);
    if ((set_number === 0)) {
      return await Cache.system("TileB");
    }
    if ((set_number === 1)) {
      return await Cache.system("TileC");
    }
    if ((set_number === 2)) {
      return await Cache.system("TileD");
    }
    if ((set_number === 3)) {
      return await Cache.system("TileE");
    }
    return null;
  }
  //--------------------------------------------------------------------------
  // Atualização do bitmap
  //--------------------------------------------------------------------------
  async update_bitmap() {
    let sx, sy, sign;
    if (((!rb.eq(this._tile_id, this._character.tile_id) || !rb.eq(this._character_name, this._character.character_name)) || !rb.eq(this._character_index, this._character.character_index))) {
      this._tile_id = this._character.tile_id;
      this._character_name = this._character.character_name;
      this._character_index = this._character.character_index;
      if ((this._tile_id > 0)) {
        sx = ((rb.add((rb.mod(rb.div(this._tile_id, 128), 2) * 8), rb.mod(this._tile_id, 8))) * 32);
        sy = (rb.mod(rb.div(rb.mod(this._tile_id, 256), 8), 16) * 32);
        this.bitmap = (await this.tileset_bitmap(this._tile_id));
        this.src_rect.set(sx, sy, 32, 32);
        this.ox = 16;
        this.oy = 32;
      } else {
        this.bitmap = (await Cache.character(this._character_name));
        sign = rb.idx(this._character_name, /^[\!\$]./);
        if ((sign != null) && rb.include_p(sign, "$")) {
          this._cw = rb.div(this.bitmap.width, 3);
          this._ch = rb.div(this.bitmap.height, 4);
        } else {
          this._cw = rb.div(this.bitmap.width, 12);
          this._ch = rb.div(this.bitmap.height, 8);
        }
        this.ox = rb.div(this._cw, 2);
        this.oy = this._ch;
      }
    }
  }
  //--------------------------------------------------------------------------
  // Atualização de bitmap retangular
  //--------------------------------------------------------------------------
  update_src_rect() {
    let index, pattern, sx, sy;
    if ((this._tile_id === 0)) {
      index = this._character.character_index;
      pattern = ((this._character.pattern < 3) ? this._character.pattern : 1);
      sx = rb.mul((rb.add((rb.mod(index, 4) * 3), pattern)), this._cw);
      sy = rb.mul((rb.add((rb.div(index, 4) * 4), rb.div(((this._character.direction - 2)), 2))), this._ch);
      return this.src_rect.set(sx, sy, this._cw, this._ch);
    }
  }
  //--------------------------------------------------------------------------
  // Início da exibição de balões
  //--------------------------------------------------------------------------
  async start_balloon() {
    this.dispose_balloon();
    this._balloon_duration = ((8 * 8) + Sprite_Character.BALLOON_WAIT);
    this._balloon_sprite = Sprite.new(this.viewport);
    this._balloon_sprite.bitmap = (await Cache.system("Balloon"));
    this._balloon_sprite.ox = 16;
    this._balloon_sprite.oy = 32;
    return this.update_balloon();
  }
  //--------------------------------------------------------------------------
  // Atualização dos balões
  //--------------------------------------------------------------------------
  update_balloon() {
    let sx, sy;
    if ((this._balloon_duration > 0)) {
      this._balloon_duration -= 1;
      if ((this._balloon_duration === 0)) {
        return this.dispose_balloon();
      } else {
        this._balloon_sprite.x = this.x;
        this._balloon_sprite.y = rb.sub(this.y, this.height);
        this._balloon_sprite.z = (this.z + 200);
        if ((this._balloon_duration < Sprite_Character.BALLOON_WAIT)) {
          sx = (7 * 32);
        } else {
          sx = (((7 - rb.div((rb.sub(this._balloon_duration, Sprite_Character.BALLOON_WAIT)), 8))) * 32);
        }
        sy = (((this._balloon_id - 1)) * 32);
        return this._balloon_sprite.src_rect.set(sx, sy, 32, 32);
      }
    }
  }
  //--------------------------------------------------------------------------
  // Dispose dos balões
  //--------------------------------------------------------------------------
  dispose_balloon() {
    if ((this._balloon_sprite != null)) {
      this._balloon_sprite.dispose();
      return this._balloon_sprite = null;
    }
  }
});

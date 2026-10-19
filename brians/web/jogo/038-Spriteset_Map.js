// 038 - Spriteset_Map: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Spriteset_Map
//------------------------------------------------------------------------------
// Classe responsável pela compilação dos sprites utilizados nos mapas.
// Esta classe é utilizada dentro da classe Scene_Map.
//==============================================================================
//--------------------------------------------------------------------------
// Inicialização do objeto
//--------------------------------------------------------------------------
globalThis.Spriteset_Map = rb.classe("Spriteset_Map", class Spriteset_Map extends rb.Objeto {
  async initialize() {
    this.create_viewports();
    await this.create_tilemap();
    this.create_parallax();
    await this.create_characters();
    await this.create_shadow();
    this.create_weather();
    await this.create_pictures();
    this.create_timer();
    await this.update();
  }
  //--------------------------------------------------------------------------
  // Criação dos viewports
  //--------------------------------------------------------------------------
  create_viewports() {
    this._viewport1 = Viewport.new(0, 0, 544, 416);
    this._viewport2 = Viewport.new(0, 0, 544, 416);
    this._viewport3 = Viewport.new(0, 0, 544, 416);
    this._viewport2.z = 50;
    this._viewport3.z = 100;
  }
  //--------------------------------------------------------------------------
  // Criação dos tiles
  //--------------------------------------------------------------------------
  async create_tilemap() {
    this._tilemap = Tilemap.new(this._viewport1);
    rb.idxSet(this._tilemap.bitmaps, 0, (await Cache.system("TileA1")));
    rb.idxSet(this._tilemap.bitmaps, 1, (await Cache.system("TileA2")));
    rb.idxSet(this._tilemap.bitmaps, 2, (await Cache.system("TileA3")));
    rb.idxSet(this._tilemap.bitmaps, 3, (await Cache.system("TileA4")));
    rb.idxSet(this._tilemap.bitmaps, 4, (await Cache.system("TileA5")));
    rb.idxSet(this._tilemap.bitmaps, 5, (await Cache.system("TileB")));
    rb.idxSet(this._tilemap.bitmaps, 6, (await Cache.system("TileC")));
    rb.idxSet(this._tilemap.bitmaps, 7, (await Cache.system("TileD")));
    rb.idxSet(this._tilemap.bitmaps, 8, (await Cache.system("TileE")));
    this._tilemap.map_data = $game_map.data;
    this._tilemap.passages = $game_map.passages;
  }
  //--------------------------------------------------------------------------
  // Criação do panorama
  //--------------------------------------------------------------------------
  create_parallax() {
    this._parallax = Plane.new(this._viewport1);
    this._parallax.z = -100;
  }
  //--------------------------------------------------------------------------
  // Criação dos characters
  //--------------------------------------------------------------------------
  async create_characters() {
    let i, sprite, vehicle;
    this._character_sprites = [];
    for (i of rb.sort(rb.keys($game_map.events))) {
      sprite = (await Sprite_Character.new(this._viewport1, rb.idx($game_map.events, i)));
      rb.push(this._character_sprites, sprite);
    }
    for (vehicle of $game_map.vehicles) {
      sprite = (await Sprite_Character.new(this._viewport1, vehicle));
      rb.push(this._character_sprites, sprite);
    }
    return rb.push(this._character_sprites, (await Sprite_Character.new(this._viewport1, $game_player)));
  }
  //--------------------------------------------------------------------------
  // Criação das sombras
  //--------------------------------------------------------------------------
  async create_shadow() {
    this._shadow_sprite = Sprite.new(this._viewport1);
    this._shadow_sprite.bitmap = (await Cache.system("Shadow"));
    this._shadow_sprite.ox = rb.div(this._shadow_sprite.bitmap.width, 2);
    this._shadow_sprite.oy = this._shadow_sprite.bitmap.height;
    this._shadow_sprite.z = 180;
  }
  //--------------------------------------------------------------------------
  // Criação do clima
  //--------------------------------------------------------------------------
  create_weather() {
    return this._weather = Spriteset_Weather.new(this._viewport2);
  }
  //--------------------------------------------------------------------------
  // Criação das pictures
  //--------------------------------------------------------------------------
  async create_pictures() {
    let i;
    this._picture_sprites = [];
    for (i of rb.range(1, 20, false)) {
      rb.push(this._picture_sprites, (await Sprite_Picture.new(this._viewport2, rb.idx($game_map.screen.pictures, i))));
    }
  }
  //--------------------------------------------------------------------------
  // Criação do timer
  //--------------------------------------------------------------------------
  create_timer() {
    return this._timer_sprite = Sprite_Timer.new(this._viewport2);
  }
  //--------------------------------------------------------------------------
  // Dispose
  //--------------------------------------------------------------------------
  dispose() {
    this.dispose_tilemap();
    this.dispose_parallax();
    this.dispose_characters();
    this.dispose_shadow();
    this.dispose_weather();
    this.dispose_pictures();
    this.dispose_timer();
    return this.dispose_viewports();
  }
  //--------------------------------------------------------------------------
  // Dispose dos tiles
  //--------------------------------------------------------------------------
  dispose_tilemap() {
    return this._tilemap.dispose();
  }
  //--------------------------------------------------------------------------
  // Dispose do panorama
  //--------------------------------------------------------------------------
  dispose_parallax() {
    return this._parallax.dispose();
  }
  //--------------------------------------------------------------------------
  // Dispose dos characters
  //--------------------------------------------------------------------------
  dispose_characters() {
    let sprite;
    for (sprite of this._character_sprites) {
      sprite.dispose();
    }
  }
  //--------------------------------------------------------------------------
  // Dispose das sombras
  //--------------------------------------------------------------------------
  dispose_shadow() {
    return this._shadow_sprite.dispose();
  }
  //--------------------------------------------------------------------------
  // Dispose dos tempos
  //--------------------------------------------------------------------------
  dispose_weather() {
    return this._weather.dispose();
  }
  //--------------------------------------------------------------------------
  // Dispose das pictures
  //--------------------------------------------------------------------------
  dispose_pictures() {
    let sprite;
    for (sprite of this._picture_sprites) {
      sprite.dispose();
    }
  }
  //--------------------------------------------------------------------------
  // Dispose do timer
  //--------------------------------------------------------------------------
  dispose_timer() {
    return this._timer_sprite.dispose();
  }
  //--------------------------------------------------------------------------
  // Dispose dos viewports
  //--------------------------------------------------------------------------
  dispose_viewports() {
    this._viewport1.dispose();
    this._viewport2.dispose();
    return this._viewport3.dispose();
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  async update() {
    this.update_tilemap();
    await this.update_parallax();
    await this.update_characters();
    await this.update_shadow();
    this.update_weather();
    await this.update_pictures();
    this.update_timer();
    return this.update_viewports();
  }
  //--------------------------------------------------------------------------
  // Atualização dos tiles
  //--------------------------------------------------------------------------
  update_tilemap() {
    this._tilemap.ox = rb.div($game_map.display_x, 8);
    this._tilemap.oy = rb.div($game_map.display_y, 8);
    return this._tilemap.update();
  }
  //--------------------------------------------------------------------------
  // Atualização do panorama
  //--------------------------------------------------------------------------
  async update_parallax() {
    if (!rb.eq(this._parallax_name, $game_map.parallax_name)) {
      this._parallax_name = $game_map.parallax_name;
      if ((this._parallax.bitmap != null)) {
        this._parallax.bitmap.dispose();
        this._parallax.bitmap = null;
      }
      if ((this._parallax_name !== "")) {
        this._parallax.bitmap = (await Cache.parallax(this._parallax_name));
      }
      Graphics.frame_reset();
    }
    this._parallax.ox = $game_map.calc_parallax_x(this._parallax.bitmap);
    this._parallax.oy = $game_map.calc_parallax_y(this._parallax.bitmap);
  }
  //--------------------------------------------------------------------------
  // Atualização dos characters
  //--------------------------------------------------------------------------
  async update_characters() {
    let sprite;
    for (sprite of this._character_sprites) {
      await sprite.update();
    }
  }
  //--------------------------------------------------------------------------
  // Atualização das sombras
  //--------------------------------------------------------------------------
  async update_shadow() {
    let airship;
    airship = $game_map.airship;
    this._shadow_sprite.x = airship.screen_x;
    this._shadow_sprite.y = (airship.screen_y + airship.altitude);
    this._shadow_sprite.opacity = (airship.altitude * 8);
    return await this._shadow_sprite.update();
  }
  //--------------------------------------------------------------------------
  // Atualização do clima
  //--------------------------------------------------------------------------
  update_weather() {
    this._weather.type = $game_map.screen.weather_type;
    this._weather.max = $game_map.screen.weather_max;
    this._weather.ox = rb.div($game_map.display_x, 8);
    this._weather.oy = rb.div($game_map.display_y, 8);
    return this._weather.update();
  }
  //--------------------------------------------------------------------------
  // Atualização das pictures
  //--------------------------------------------------------------------------
  async update_pictures() {
    let sprite;
    for (sprite of this._picture_sprites) {
      await sprite.update();
    }
  }
  //--------------------------------------------------------------------------
  // Atualização do timer
  //--------------------------------------------------------------------------
  update_timer() {
    return this._timer_sprite.update();
  }
  //--------------------------------------------------------------------------
  // Atualização dos viewports
  //--------------------------------------------------------------------------
  update_viewports() {
    this._viewport1.tone = $game_map.screen.tone;
    this._viewport1.ox = $game_map.screen.shake;
    this._viewport2.color = $game_map.screen.flash_color;
    this._viewport3.color.set(0, 0, 0, (255 - $game_map.screen.brightness));
    this._viewport1.update();
    this._viewport2.update();
    return this._viewport3.update();
  }
});

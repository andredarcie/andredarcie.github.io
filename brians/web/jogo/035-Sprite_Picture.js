// 035 - Sprite_Picture: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Sprite_Picture
//------------------------------------------------------------------------------
// Classe que gerencia os gráficos de pictures a serem exibidos.
// Esta classe está vinculada à classe Picture, que a monitora e
// automaticamente muda o status do sprite.
//==============================================================================
//--------------------------------------------------------------------------
// Inicialização do objeto
//     viewport : camada
//     picture  : imagem (Game_Picture)
//--------------------------------------------------------------------------
globalThis.Sprite_Picture = rb.classe("Sprite_Picture", class Sprite_Picture extends Sprite {
  async initialize(viewport, picture) {
    super.initialize(viewport);
    this._picture = picture;
    await this.update();
  }
  //--------------------------------------------------------------------------
  // Dispose
  //--------------------------------------------------------------------------
  dispose() {
    if ((this.bitmap != null)) {
      this.bitmap.dispose();
    }
    return super.dispose();
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  async update() {
    super.update();
    if (!rb.eq(this._picture_name, this._picture.name)) {
      this._picture_name = this._picture.name;
      if ((this._picture_name !== "")) {
        this.bitmap = (await Cache.picture(this._picture_name));
      }
    }
    if ((this._picture_name === "")) {
      this.visible = false;
    } else {
      this.visible = true;
      if ((this._picture.origin === 0)) {
        this.ox = 0;
        this.oy = 0;
      } else {
        this.ox = rb.div(this.bitmap.width, 2);
        this.oy = rb.div(this.bitmap.height, 2);
      }
      this.x = this._picture.x;
      this.y = this._picture.y;
      this.z = (100 + this._picture.number);
      this.zoom_x = (this._picture.zoom_x / 100.0);
      this.zoom_y = (this._picture.zoom_y / 100.0);
      this.opacity = this._picture.opacity;
      this.blend_type = this._picture.blend_type;
      this.angle = this._picture.angle;
      this.tone = this._picture.tone;
    }
  }
});

// 032 - Sprite_Base: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Sprite_Base
//------------------------------------------------------------------------------
// Classe responsável pelo processo de animação dos sprites.
//==============================================================================
globalThis.Sprite_Base = rb.classe("Sprite_Base", class Sprite_Base extends Sprite {
});
//--------------------------------------------------------------------------
// Variáveis da classe
//--------------------------------------------------------------------------
Sprite_Base.__cv_animations = [];
Sprite_Base.__cv__reference_count = rb.hash([]);
//--------------------------------------------------------------------------
// Inicialização do objeto
//--------------------------------------------------------------------------
rb.reabrir(Sprite_Base, class extends rb.superDe(Sprite_Base) {
  initialize(viewport = null) {
    super.initialize(viewport);
    this._use_sprite = true; // Salva o uso do sprite na memória
    this._animation_duration = 0; // Duração de animação
  }
  //--------------------------------------------------------------------------
  // Dispose da animação
  //--------------------------------------------------------------------------
  dispose() {
    super.dispose();
    return this.dispose_animation();
  }
  //--------------------------------------------------------------------------
  // Atualização da tela
  //--------------------------------------------------------------------------
  update() {
    super.update();
    if ((this._animation != null)) {
      this._animation_duration -= 1;
      if ((rb.mod(this._animation_duration, 4) === 0)) {
        this.update_animation();
      }
    }
    return rb.clear(Sprite_Base.__cv_animations);
  }
  //--------------------------------------------------------------------------
  // Exibição da animação
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Início da animação
  //--------------------------------------------------------------------------
  async start_animation(animation, mirror = false) {
    let i, sprite;
    this.dispose_animation();
    this._animation = animation;
    if ((this._animation == null)) {
      return;
    }
    this._animation_mirror = mirror;
    this._animation_duration = ((this._animation.frame_max * 4) + 1);
    await this.load_animation_bitmap();
    this._animation_sprites = [];
    if (((this._animation.position !== 3) || !(rb.include_p(Sprite_Base.__cv_animations, animation)))) {
      if (this._use_sprite) {
        for (i of rb.range(0, 15, false)) {
          sprite = Sprite.new(this.viewport);
          sprite.visible = false;
          rb.push(this._animation_sprites, sprite);
        }
        if (!(rb.include_p(Sprite_Base.__cv_animations, animation))) {
          rb.push(Sprite_Base.__cv_animations, animation);
        }
      }
    }
    if ((this._animation.position === 3)) {
      if ((this.viewport == null)) {
        this._animation_ox = rb.div(544, 2);
        return this._animation_oy = rb.div(416, 2);
      } else {
        this._animation_ox = rb.div(this.viewport.rect.width, 2);
        return this._animation_oy = rb.div(this.viewport.rect.height, 2);
      }
    } else {
      this._animation_ox = rb.add(rb.sub(this.x, this.ox), rb.div(this.width, 2));
      this._animation_oy = rb.add(rb.sub(this.y, this.oy), rb.div(this.height, 2));
      if ((this._animation.position === 0)) {
        return this._animation_oy = rb.sub(this._animation_oy, rb.div(this.height, 2));
      } else if ((this._animation.position === 2)) {
        return this._animation_oy = rb.add(this._animation_oy, rb.div(this.height, 2));
      }
    }
  }
  //--------------------------------------------------------------------------
  // Carregamento do gráfico de animação
  //--------------------------------------------------------------------------
  async load_animation_bitmap() {
    let animation1_name, animation1_hue, animation2_name, animation2_hue;
    animation1_name = this._animation.animation1_name;
    animation1_hue = this._animation.animation1_hue;
    animation2_name = this._animation.animation2_name;
    animation2_hue = this._animation.animation2_hue;
    this._animation_bitmap1 = (await Cache.animation(animation1_name, animation1_hue));
    this._animation_bitmap2 = (await Cache.animation(animation2_name, animation2_hue));
    if (rb.include_p(Sprite_Base.__cv__reference_count, this._animation_bitmap1)) {
      rb.idxSet(Sprite_Base.__cv__reference_count, this._animation_bitmap1, (rb.idx(Sprite_Base.__cv__reference_count, this._animation_bitmap1) + 1));
    } else {
      rb.idxSet(Sprite_Base.__cv__reference_count, this._animation_bitmap1, 1);
    }
    if (rb.include_p(Sprite_Base.__cv__reference_count, this._animation_bitmap2)) {
      rb.idxSet(Sprite_Base.__cv__reference_count, this._animation_bitmap2, (rb.idx(Sprite_Base.__cv__reference_count, this._animation_bitmap2) + 1));
    } else {
      rb.idxSet(Sprite_Base.__cv__reference_count, this._animation_bitmap2, 1);
    }
    return Graphics.frame_reset();
  }
  //--------------------------------------------------------------------------
  // Dispose da animação
  //--------------------------------------------------------------------------
  dispose_animation() {
    let sprite;
    if ((this._animation_bitmap1 != null)) {
      rb.idxSet(Sprite_Base.__cv__reference_count, this._animation_bitmap1, (rb.idx(Sprite_Base.__cv__reference_count, this._animation_bitmap1) - 1));
      if ((rb.idx(Sprite_Base.__cv__reference_count, this._animation_bitmap1) === 0)) {
        this._animation_bitmap1.dispose();
      }
    }
    if ((this._animation_bitmap2 != null)) {
      rb.idxSet(Sprite_Base.__cv__reference_count, this._animation_bitmap2, (rb.idx(Sprite_Base.__cv__reference_count, this._animation_bitmap2) - 1));
      if ((rb.idx(Sprite_Base.__cv__reference_count, this._animation_bitmap2) === 0)) {
        this._animation_bitmap2.dispose();
      }
    }
    if ((this._animation_sprites != null)) {
      for (sprite of this._animation_sprites) {
        sprite.dispose();
      }
      this._animation_sprites = null;
      return this._animation = null;
    }
  }
  //--------------------------------------------------------------------------
  // Atualização da animação
  //--------------------------------------------------------------------------
  update_animation() {
    let frame_index, timing;
    if ((this._animation_duration > 0)) {
      frame_index = (this._animation.frame_max - rb.div(((this._animation_duration + 3)), 4));
      this.animation_set_sprites(rb.idx(this._animation.frames, frame_index));
      for (timing of this._animation.timings) {
        if (rb.eq(timing.frame, frame_index)) {
          this.animation_process_timing(timing);
        }
      }
    } else {
      return this.dispose_animation();
    }
  }
  //--------------------------------------------------------------------------
  // Configuração dos frames (RPG::Animation::Frame)
  //--------------------------------------------------------------------------
  animation_set_sprites(frame) {
    let cell_data, i, sprite, pattern;
    cell_data = frame.cell_data;
    for (i of rb.range(0, 15, false)) {
      sprite = rb.idx(this._animation_sprites, i);
      if ((sprite == null)) {
        continue;
      }
      pattern = rb.idx(cell_data, i, 0);
      if (((pattern == null) || (pattern === -1))) {
        sprite.visible = false;
        continue;
      }
      if ((pattern < 100)) {
        sprite.bitmap = this._animation_bitmap1;
      } else {
        sprite.bitmap = this._animation_bitmap2;
      }
      sprite.visible = true;
      sprite.src_rect.set((rb.mod(pattern, 5) * 192), (rb.div(rb.mod(pattern, 100), 5) * 192), 192, 192);
      if (rb.v(this._animation_mirror)) {
        sprite.x = rb.sub(this._animation_ox, rb.idx(cell_data, i, 1));
        sprite.y = rb.sub(this._animation_oy, rb.idx(cell_data, i, 2));
        sprite.angle = ((360 - rb.idx(cell_data, i, 4)));
        sprite.mirror = ((rb.idx(cell_data, i, 5) === 0));
      } else {
        sprite.x = rb.add(this._animation_ox, rb.idx(cell_data, i, 1));
        sprite.y = rb.add(this._animation_oy, rb.idx(cell_data, i, 2));
        sprite.angle = rb.idx(cell_data, i, 4);
        sprite.mirror = ((rb.idx(cell_data, i, 5) === 1));
      }
      sprite.z = (this.z + 300);
      sprite.ox = 96;
      sprite.oy = 96;
      sprite.zoom_x = (rb.idx(cell_data, i, 3) / 100.0);
      sprite.zoom_y = (rb.idx(cell_data, i, 3) / 100.0);
      sprite.opacity = (rb.mul(rb.idx(cell_data, i, 6), this.opacity) / 255.0);
      sprite.blend_type = rb.idx(cell_data, i, 7);
    }
  }
  //--------------------------------------------------------------------------
  // Temporização e uso de SE (RPG::Animation::Timing)
  //--------------------------------------------------------------------------
  animation_process_timing(timing) {
    timing.se.play();
    const caso1 = timing.flash_scope;
    if (caso1 === 1) {
      return this.flash(timing.flash_color, (timing.flash_duration * 4));
    } else if (caso1 === 2) {
      if ((this.viewport != null)) {
        return this.viewport.flash(timing.flash_color, (timing.flash_duration * 4));
      }
    } else if (caso1 === 3) {
      return this.flash(null, (timing.flash_duration * 4));
    }
  }
  // fora do escopo (nada do jogo chama): animation?
});

// 090 - VX_SP1: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// VX_SP1
//------------------------------------------------------------------------------
// Correção do sistema de pré-configuração
//==============================================================================
//------------------------------------------------------------------------------
// Código de correção
//------------------------------------------------------------------------------
// * Em uma animação, quando um frame possui dimensões maiores ou menores
//   que as dimensões de uma imagem utilizada, ocorre um erro de exibição
// * Problemas na exibição de animações com coordenada Y inválida (causada
//   pelo problema acima)
// * Problemas relacionados ao caminho dos gráficos de uma animação, que, se
//   indisponíveis, não reportavam problema
//------------------------------------------------------------------------------
//--------------------------------------------------------------------------
// Exibição da animação
//--------------------------------------------------------------------------
rb.alias(Sprite_Base, "eb_sp1_dispose_animation", "dispose_animation");
rb.reabrir(Sprite_Base, class extends rb.superDe(Sprite_Base) {
  dispose_animation() {
    this.eb_sp1_dispose_animation();
    this._animation_bitmap1 = null;
    return this._animation_bitmap2 = null;
  }
});
//--------------------------------------------------------------------------
// Configuração do gráfico de animação
//     frame : informações do frame (RPG::Animation::Frame)
//--------------------------------------------------------------------------
rb.alias(Sprite_Base, "eb_sp1_animation_set_sprites", "animation_set_sprites");
rb.reabrir(Sprite_Base, class extends rb.superDe(Sprite_Base) {
  animation_set_sprites(frame) {
    let cell_data, i, sprite, pattern;
    this.eb_sp1_animation_set_sprites(frame);
    cell_data = frame.cell_data;
    for (i of rb.range(0, 15, false)) {
      sprite = rb.idx(this._animation_sprites, i);
      if ((sprite == null)) {
        continue;
      }
      pattern = rb.idx(cell_data, i, 0);
      if (((pattern == null) || (pattern === -1))) {
        continue;
      }
      if (rb.v(this._animation_mirror)) {
        sprite.y = rb.add(this._animation_oy, rb.idx(cell_data, i, 2));
      }
      sprite.z = ((this.z + 300) + i);
    }
  }
});

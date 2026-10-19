// 004 - Cache: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Cache
//------------------------------------------------------------------------------
// Nesta classe vários gráficos são carregados e guardados como Bitmaps. Para
// acelerar o processo e preservar a memória, os Bitmaps são guardados em cache
// para uso futuro.
//==============================================================================
//--------------------------------------------------------------------------
// Carregamento dos gráficos de animação
//     filename: Nome do arquivo
//     hue: Informações da alteração de tonalidade
//--------------------------------------------------------------------------
globalThis.Cache = rb.modulo("Cache");
rb.singleton(Cache, {
  async animation(filename, hue) {
    return await this.load_bitmap("Graphics/Animations/", filename, hue);
  },
  //--------------------------------------------------------------------------
  // Carregamento dos gráficos de batalha
  //     filename: Nome do arquivo
  //     hue: Informações da alteração de tonalidade
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Carregamento dos gráficos de personagens
  //     filename: Nome do arquivo
  //--------------------------------------------------------------------------
  async character(filename) {
    return await this.load_bitmap("Graphics/Characters/", filename);
  },
  //--------------------------------------------------------------------------
  // Carregamento dos gráficos de face
  //     filename: Nome do arquivo
  //--------------------------------------------------------------------------
  async face(filename) {
    return await this.load_bitmap("Graphics/Faces/", filename);
  },
  //--------------------------------------------------------------------------
  // Carregamento dos gráficos de panorama (Parallax)
  //     filename: Nome do arquivo
  //--------------------------------------------------------------------------
  async parallax(filename) {
    return await this.load_bitmap("Graphics/Parallaxes/", filename);
  },
  //--------------------------------------------------------------------------
  // Carregamento dos gráficos em geral (Pictures)
  //     filename: Nome do arquivo
  //--------------------------------------------------------------------------
  async picture(filename) {
    return await this.load_bitmap("Graphics/Pictures/", filename);
  },
  //--------------------------------------------------------------------------
  // Carregamento dos gráficos de sistema
  //     filename: Nome do arquivo
  //--------------------------------------------------------------------------
  async system(filename) {
    return await this.load_bitmap("Graphics/System/", filename);
  },
  //--------------------------------------------------------------------------
  // Limpeza do cache
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  // Carregamento dos bitmaps
  //--------------------------------------------------------------------------
  async load_bitmap(folder_name, filename, hue = 0) {
    let path, key;
    if ((this._cache == null)) {
      this._cache = rb.hash([]);
    }
    path = rb.add(folder_name, filename);
    if ((!(rb.include_p(this._cache, path)) || rb.idx(this._cache, path).disposed_p())) {
      if (rb.empty_p(filename)) {
        rb.idxSet(this._cache, path, Bitmap.new(32, 32));
      } else {
        rb.idxSet(this._cache, path, (await Bitmap.new(path)));
      }
    }
    if ((hue === 0)) {
      return rb.idx(this._cache, path);
    } else {
      key = [path, hue];
      if ((!(rb.include_p(this._cache, key)) || rb.idx(this._cache, key).disposed_p())) {
        rb.idxSet(this._cache, key, rb.clone(rb.idx(this._cache, path)));
        rb.idx(this._cache, key).hue_change(hue);
      }
      return rb.idx(this._cache, key);
    }
  },
  // fora do escopo (nada do jogo chama): battler, clear
});

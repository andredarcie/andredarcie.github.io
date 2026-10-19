// 100 - (sem nome): script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//===============================================================================
//                          KS Checkpoint
//                             by Khas
//===============================================================================
//
//  Esse script cria a possibilidade de fazer Checkpoints automaticos no game,
//  bem como carrega-los sem nescessidade de menus. Além disso o script pode
//  fazer com que seja carregado o ultimo checkpoint caso ocorra o gameover.
//
//  Nos Checkpoints todas as informações são salvas, como quantia de Gold
//  e switchs ativos. Ao carregar um Checkpoint o game voltará como estava
//  naquele momento.
//
//
//  Para criar um Checkpoint use o comando "Chamar Script" e coloque:
//  $game_checkpoint.create_ksch
//
//  Para carregar um Checkpoint use o comando "Chamar Script" e coloque:
//  $game_checkpoint.load_ksch
//
//
//  Habilitar continuação após gameover?
//  (iguale a true para habilitar e false para não habilitar)
globalThis.Enable_Gameover_Continue = true;
//  Mostrar imagem de gameover?
//  (iguale a true para mostrar e false para não mostrar)
globalThis.Show_Gameover_Picture = false;
//  Tocar som de gameover?
//  (iguale a true para tocar e false para não tocar)
globalThis.Play_Gameover_Sound = false;
//  Mostrar imagem de carregando Checkpoint ao Gameover?
//  (deve estar na pasta System com o nome "Gameover_load" sem aspas)
//  (iguale a true para mostrar e false para não mostrar)
globalThis.Show_Load_Checkpoint = true;
//===============================================================================
globalThis.Khas_Check = rb.classe("Khas_Check", class Khas_Check extends Scene_File {
  create_ks_check() {
    let file;
    file = rb.File.open("ks_checkpoint", "wb");
    this.write_save_data(file);
    return file.close();
  }
  async load_ks_check() {
    let file;
    if (($load_from_gameover === true)) {
      if (!(rb.FileTest.exist_p("ks_checkpoint"))) {
        $scene = Scene_Title.new();
        await Graphics.fadeout(40);
      } else {
        file = rb.File.open("ks_checkpoint", "rb");
        await this.read_save_data(file);
        file.close();
        $scene = Scene_Map.new();
        RPG.BGM.fade(1500);
        await Graphics.fadeout(60);
        await Graphics.wait(60);
        $game_map.autoplay();
      }
      return $load_from_gameover = false;
    } else {
      if (!(rb.FileTest.exist_p("ks_checkpoint"))) {
        return;
      }
      file = rb.File.open("ks_checkpoint", "rb");
      await this.read_save_data(file);
      file.close();
      $scene = Scene_Map.new();
      RPG.BGM.fade(1500);
      await Graphics.fadeout(60);
      await Graphics.wait(40);
      return $game_map.autoplay();
    }
  }
});
rb.alias(Scene_File, "original_do_load", "do_load");
rb.reabrir(Scene_File, class extends rb.superDe(Scene_File) {
  async do_load() {
    let file;
    await this.original_do_load();
    file = rb.File.open("ks_checkpoint", "wb");
    this.write_save_data(file);
    return file.close();
  }
});
globalThis.Khas_Checkpoints = rb.classe("Khas_Checkpoints", class Khas_Checkpoints extends rb.Objeto {
  create_ksch() {
    let ks;
    ks = Khas_Check.new(true, false, false);
    return ks.create_ks_check();
  }
  async load_ksch() {
    let ks;
    ks = Khas_Check.new(true, false, false);
    return await ks.load_ks_check();
  }
});
$game_checkpoint = Khas_Checkpoints.new();
// classe Scene_Gameover: fora do escopo (o jogo não usa; README.md)

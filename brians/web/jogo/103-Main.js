// 103 - Main: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

let filename;
//==============================================================================
// Main
//------------------------------------------------------------------------------
// Após o final de cada definição de classe o processo principal
// do jogo é iniciado. Esta é a classe principal do jogo.
//==============================================================================
if (!(Font.exist_p("UmePlus Gothic"))) {
  await print("A fonte UmePlus Gothic não foi encontrada.");
  rb.exit();
}
try {
  Graphics.freeze();
  $scene = Scene_Title.new();
  while (($scene != null)) {
    await $scene.main();
  }
  await Graphics.transition(30);
} catch (erro) {
  if (!(rb.is_a(erro, rb.Errno.ENOENT))) throw erro;
  filename = rb.sub(rb.message(erro), "Arquivo não encontrado - ", "");
  await print(`O arquivo ${rb.str(filename)} não foi encontrado.`);
}

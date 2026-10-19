// 076 - Scene_Menu: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Scene_Menu
//------------------------------------------------------------------------------
// Classe de operações na tela do menu.
//==============================================================================
globalThis.Scene_Menu = rb.classeForaDoEscopo("Scene_Menu", "o menu do VX nunca abre: o Esc está desligado (Scene_Map#call_menu), e a volta da tela de save (Scene_File#return_scene) só vai ao menu quando o save não veio de evento nem do título; no jogo ele sempre vem de um dos dois (comando 352 ou \"Continuar\"), e o checkpoint (Khas_Check) não usa return_scene");

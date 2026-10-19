// A fachada RGSS2 em JS (fase 3): as classes que o RGSS200E.dll dava aos
// scripts, agora JS direto sobre o motor (src/rgss/), sem Ruby. Importar este
// módulo define os globais (Rect, Bitmap, Sprite, Graphics, RPG…) na ordem
// de dependência; ligar(api) liga o motor antes de o Main rodar.
import * as rb from 'rb';
import { ligarMotor } from './motor.js';
import './basicos.js';
import './bitmap.js';
import './cena.js';
import './modulos.js';
import './rpg.js';

// Funções globais do RGSS (Kernel)
globalThis.load_data = rb.load_data;
globalThis.save_data = rb.save_data;
globalThis.print = rb.print;
globalThis.p = rb.p;
globalThis.msgbox = rb.msgbox;

export function ligar(api) {
  ligarMotor(api);
  rb.configurarMensagem(api.mensagem);
}

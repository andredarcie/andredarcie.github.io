// 003 - Sound: script do jogo (o RGSS2 de 2014, em JavaScript).
import * as rb from 'rb'; // import map: web/src/rb/rb.js

//==============================================================================
// Sound
//------------------------------------------------------------------------------
// Esta classe controla os efeitos sonoros do jogo. Os efeitos sonoros são
// definidos utilizando a variável global $data_system.
//==============================================================================
// Movimento de cursos
globalThis.Sound = rb.modulo("Sound");
rb.singleton(Sound, {
  play_cursor() {
    return rb.idx($data_system.sounds, 0).play();
  },
  // OK
  play_decision() {
    return rb.idx($data_system.sounds, 1).play();
  },
  // Cancelar
  play_cancel() {
    return rb.idx($data_system.sounds, 2).play();
  },
  // Erro
  play_buzzer() {
    return rb.idx($data_system.sounds, 3).play();
  },
  // Equipar
  // Salvar
  play_save() {
    return rb.idx($data_system.sounds, 5).play();
  },
  // Carregar
  play_load() {
    return rb.idx($data_system.sounds, 6).play();
  },
  // fora do escopo (nada do jogo chama): play_equip, play_battle_start, play_escape, play_enemy_attack, play_enemy_damage, play_enemy_collapse, play_actor_damage, play_actor_collapse, play_recovery, play_miss, play_evasion, play_shop, play_use_item, play_use_skill
});
// Início da batalha
// Fuga
// Ataque inimigo
// Dano inimigo
// Inimigo morrendo
// Dano aliado
// Aliado morrendo
// Cura
// Errar ataque
// Esquivar ataque
// Loja
// Usar item
// Usar habilidade

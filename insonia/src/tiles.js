// Registro dos tiles usados pelos mapas. Folhas em assets/tiles/ (todas em cinza):
//   i* = RTP VX Ace Inside, d* = RTP VX Ace Dungeon, m* = Mack (REFMAP), x* = recortes próprios.
// Tipos: a2 (autotile de piso), top (topo de parede do A4), wall (lado de parede do A4),
//        a5 (tile simples do A5), b (objeto de B–E; w/h em tiles, acima = linhas sobre o herói).
export const TILES = {
  // ----- bordas e paredes -----
  borda_madeira: { top: 'mA4', bx: 1, by: 1, mult: 0.6 },
  parede_tabua: { wall: 'mA4', bx: 1, by: 1, mult: 0.62 },
  vazio: { vazio: true },

  // ----- pisos -----
  piso_tacos: { a2: 'iA2', bx: 0, by: 0, mult: 0.47 },

  // ----- objetos -----
  cama_ferro: { b: 'iB', x: 3, y: 10, w: 1, h: 2 },
  mesa_rasgada: { b: 'mE', x: 14, y: 13 },
  coluna: { b: 'mD', x: 6, y: 14, w: 1, h: 2 },
  respiro: { b: 'xA', x: 7, y: 4 },
  rabisco: { b: 'xA', x: 0, y: 0, solido: false },
  rabisco2: { b: 'xA', x: 1, y: 0, solido: false },
  canos_h: { b: 'xA', x: 0, y: 1, w: 2, h: 1, solido: false },
  canos_v: { b: 'xA', x: 2, y: 1, w: 1, h: 2, solido: false },
  boca_duto: { b: 'xA', x: 3, y: 1, solido: false },
  biombo: { b: 'xA', x: 4, y: 1, w: 2, h: 2 },
  comoda: { b: 'mD', x: 12, y: 0, w: 1, h: 2 },
  placa_aviso: { b: 'dB', x: 15, y: 3, solido: false },
  grade_parede: { b: 'xA', x: 7, y: 4, solido: false },
  papeis: { b: 'iC', x: 0, y: 9, solido: false },
  vao_porta: { b: 'xA', x: 3, y: 4, w: 1, h: 2, solido: false },
  papeis_parede: { b: 'xA', x: 2, y: 4, solido: false },
  porta_arco: { b: 'xA', x: 1, y: 4, w: 1, h: 2 },
  banco: { b: 'mD', x: 0, y: 15, w: 3, h: 1 },
  mesinha: { b: 'iB', x: 4, y: 12 },
  entulho: { b: 'dB', x: 3, y: 13 },
  banqueta: { b: 'iB', x: 0, y: 12 },
  rachadura: { b: 'iB', x: 12, y: 12, solido: false },
  estante_quebrada: { b: 'mE', x: 14, y: 11, w: 1, h: 2 },
  papeis_chao: { b: 'mE', x: 15, y: 15, solido: false },
  jarro: { b: 'iB', x: 9, y: 9 },
  cortina_rasgada: { b: 'iB', x: 15, y: 2, w: 1, h: 2, solido: false },
  caixa: { b: 'xA', x: 6, y: 6 },
  cortina_escura: { b: 'iB', x: 9, y: 2, w: 1, h: 2, solido: false },
  prateleira: { b: 'iB', x: 0, y: 6 },
  tabuas: { b: 'mD', x: 3, y: 13, w: 1, h: 2 },
  cadeira: { b: 'mD', x: 1, y: 8 },
  banco_e: { b: 'mD', x: 0, y: 15 },
  banco_d: { b: 'mD', x: 2, y: 15 },
  cruz_quebrada: { b: 'dB', x: 5, y: 13 },
  balde: { b: 'iB', x: 8, y: 10 },
  porta_painel: { b: 'mD', x: 6, y: 3, w: 1, h: 2 },

  // quarto do menino (flashback)
  borda_pedra: { top: 'mA4', bx: 7, by: 1 },
  parede_ripas: { wall: 'mA4', bx: 2, by: 1 },
  piso_escuro: { a2: 'iA2', bx: 0, by: 0, mult: 0.35 },
  janela_cortina: { b: 'mD', x: 5, y: 8, w: 1, h: 2, solido: false },
  cortina_longa: { b: 'mD', x: 6, y: 8, w: 1, h: 2, solido: false },
  poltrona: { b: 'mD', x: 4, y: 8, w: 1, h: 2 },
  cama_menino: { b: 'mD', x: 8, y: 2, w: 1, h: 3 },
  comoda2: { b: 'mD', x: 11, y: 0, w: 1, h: 2 },
  armario: { b: 'mD', x: 14, y: 3, w: 1, h: 2 },
  vaso_planta: { b: 'mD', x: 6, y: 10, w: 1, h: 2 },
  mesa_redonda: { b: 'iB', x: 0, y: 12 },
  banquinho: { b: 'iB', x: 2, y: 13 },
  banquinho2: { b: 'iB', x: 0, y: 13 },
  caixote: { b: 'mD', x: 15, y: 0 },

  // hospital (flashback)
  borda_branca: { top: 'mA4', bx: 4, by: 1 },
  parede_branca: { wall: 'mA4', bx: 4, by: 1 },
  piso_azulejo: { a5: 'iA5', x: 0, y: 4 },
  // a janela em arco tem 2 tiles na folha (arco + vidraças com o peitoril); antes só o arco aparecia
  janela_arco: { b: 'mD', x: 7, y: 8, w: 1, h: 2, solido: false },
  vaso_folhas: { b: 'mD', x: 7, y: 10, w: 1, h: 2 },
  porta_hospital: { b: 'xA', x: 2, y: 5, w: 1, h: 2 },
  luminaria: { b: 'xA', x: 4, y: 5, w: 1, h: 2 },
  lixeira_branca: { b: 'xA', x: 7, y: 5 },
  lixeira: { b: 'mD', x: 14, y: 7 },   // (a do quarto da rachadura)

  // banheiro
  parede_tijolo_escuro: { wall: 'dA4', bx: 2, by: 0 },
  piso_pedra: { a2: 'iA2', bx: 0, by: 2, mult: 0.8 },
  vaso: { b: 'xA', x: 7, y: 1, w: 1, h: 2 },
  pia: { b: 'xA', x: 6, y: 2 },
  espelho: { b: 'xA', x: 7, y: 6, solido: false },
  parede_banheiro: { wall: 'mA4', bx: 3, by: 1, mult: 0.5 },
  armario_escuro: { b: 'mD', x: 14, y: 3, w: 1, h: 2, solido: false },
  num1: { b: 'xA', x: 4, y: 3, solido: false },
  num2: { b: 'xA', x: 5, y: 3, solido: false },
  num6: { b: 'xA', x: 6, y: 3, solido: false },
  num4: { b: 'xA', x: 7, y: 3, solido: false },
  divisoria: { b: 'xA', x: 6, y: 4, w: 1, h: 2 },

  // sala das lâmpadas (porta com código)
  escada_escura: { b: 'mE', x: 1, y: 0, w: 1, h: 2, mult: 0.6 },
  nicho: { b: 'xA', x: 0, y: 2, w: 1, h: 3 },

  // salão
  tapete: { a2: 'mA2', bx: 6, by: 3 },
  teia: { b: 'mE', x: 15, y: 10, solido: false },
  raizes: { b: 'dB', x: 9, y: 3, w: 1, h: 2, solido: false },
  goteira: { b: 'xA', x: 1, y: 3, solido: false },
  escada_madeira: { b: 'mD', x: 2, y: 0, w: 1, h: 2 },
  grades: { b: 'iB', x: 12, y: 14, w: 4, h: 2 },
  grades1: { b: 'iB', x: 12, y: 14, w: 1, h: 2 },
  pedrinhas: { b: 'dB', x: 1, y: 6, solido: false },
  estante: { b: 'mD', x: 9, y: 0, w: 1, h: 2 },
  pedra_grande: { b: 'dB', x: 0, y: 13 },
  cano_rodape: { b: 'xA', x: 4, y: 4, solido: false },
  cano_L: { b: 'xA', x: 0, y: 6, w: 3, h: 2, solido: false },
  cano_L2: { b: 'xA', x: 3, y: 6, w: 3, h: 2, solido: false },
  cano_registro: { b: 'xA', x: 5, y: 4, solido: false },
  // armadilhas
  ossos: { b: 'dB', x: 10, y: 14, solido: false },
  pedras: { b: 'dB', x: 15, y: 12 },
  vaso_quebrado: { b: 'dB', x: 15, y: 11 },
  cadeira_caida: { b: 'iB', x: 11, y: 11 },
  lampiao: { b: 'mD', x: 7, y: 3, solido: false },
  quadro_pequeno: { b: 'mD', x: 12, y: 1 },
  cama_rasgada: { b: 'mE', x: 14, y: 11, w: 1, h: 2 },
  armadilha: { b: 'xA', x: 2, y: 3, solido: false },
  // cela gradeada
  grade_alta: { b: 'iB', x: 12, y: 14, w: 1, h: 2, solido: true },
  // sala do enigma e sala de descanso (tijolo do Mack e o piso de escamas do duto)
  pedra_parede: { wall: 'mA4', bx: 3, by: 1 },
  piso_escamas: { a2: 'iA2', bx: 0, by: 3 },
  borda_clara: { top: 'mA4', bx: 4, by: 1 },
  bau: { b: 'mD', x: 12, y: 0 },
  raiz_parede: { b: 'dB', x: 8, y: 3, w: 1, h: 2, solido: false },
  parede_preta: { wall: 'mA4', bx: 1, by: 1, mult: 0.25 },

  // o fim do jogo: o fundo inteiro de cada sala, tirado das capturas 14, 20 e 21 de 2014
  // (folha xC, tools/salas_finais.py); o mapa por baixo só dá a passagem
  fundo_piano: { b: 'xC', x: 0, y: 0, w: 17, h: 13, solido: false },
  fundo_guilhotina: { b: 'xC', x: 0, y: 13, w: 17, h: 13, solido: false },

  // duto de ventilação
  pedra_clara: { a5: 'iA5', x: 5, y: 3, passa: false },
  grade_chao: { a2: 'iA2', bx: 0, by: 3, mult: 0.55 },
  faixa_metal: { a5: 'iA5', x: 5, y: 7, passa: false },
};

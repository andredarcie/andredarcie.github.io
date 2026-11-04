// Flashback: o corredor do hospital, claro e enevoado (7:10–8:36).
export default {
  nome: 'hospital', w: 17, h: 13, cena: true, // só existe dentro da cena: não salva aqui
  tom: 0, amb: 1, tomPersonagem: 0,
  vinheta: 0.45, nevoa: { cor: '215,215,215', a: 0.34 },
  legenda: {
    '#': 'borda_branca', W: 'parede_branca', '.': 'piso_azulejo',
    D: 'porta_painel', j: 'janela_arco', v: 'vaso_planta', b: 'banco', l: 'luminaria', x: 'lixeira',
  },
  chao: [
    '#################',
    '#################',
    '#######.#########',
    '##WWWWWWWWWWW####',
    '##WWWWWWWWWWWW###',
    '##............###',
    '##............###',
    '##............###',
    '##............###',
    '##............###',
    '##............###',
    '######..#########',
    '#################',
  ],
  objs: [
    ['D', 7, 2], ['j', 3, 3], ['j', 5, 3], ['j', 9, 3], ['j', 11, 3],
    ['v', 2, 4], ['l', 12, 4], ['b', 3, 5], ['b', 9, 5], ['b', 9, 10], ['x', 2, 10],
  ],
};

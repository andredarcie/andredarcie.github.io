// Duto de ventilação entre a cela e o quarto 2 (2:07–2:31). Só a luz em volta dele.
export default {
  nome: 'duto', w: 30, h: 13,
  tom: 55, amb: 0.06, tomPersonagem: 20,
  lanterna: { r: 230, i: 1 },
  legenda: {
    ' ': 'vazio', P: 'pedra_clara', '.': 'grade_chao', F: 'faixa_metal',
    h: 'canos_h', v: 'canos_v', b: 'boca_duto', a: 'placa_aviso',
  },
  chao: [
    '', '', '', '',
    'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
    'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
    '..............................',
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    '', '', '', '', '',
  ],
  obj: [[
    '', '', '', '',
    '     h    a  v  h       v',
    '        b',
  ]],
};

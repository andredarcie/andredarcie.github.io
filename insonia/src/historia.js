// Roteiro de cada mapa: eventos, falas e quebra-cabeças, na ordem do trailer de 2014.
// Falas copiadas do jogo (inclusive a grafia original: "Mais" por "mas", "esta" sem acento etc.).
import { quadros, entrada, LARG, ALT } from './base.js';
import { som } from './som.js';
import { HEROI, Evento } from './jogo.js';
import { janela, texto, cursor } from './janela.js';

const V = '\\c[2]', B = '\\c[0]'; // vermelho / normal

const KID = { folha: 'chars/m03b', tipo: 'mack', idx: 6 };
const PAI = { folha: 'chars/m04a', tipo: 'mack', idx: 2 };
const MEDICO = { folha: 'chars/m03d', tipo: 'mack', idx: 4 };
const SOMBRA = { folha: 'chars/m06a', tipo: 'mack', idx: 7 };

// Lâmpada que pisca de vez em quando.
function piscar(j, id, chance = 0.004) {
  let n = 0;
  return () => {
    const l = j.luzes.find((x) => x.id === id);
    if (!l) return;
    if (n > 0) { n--; l.mult = (n % 6 < 3) ? 0.15 : 1; if (!n) l.mult = 1; return; }
    if (Math.random() < chance) n = 6 + Math.floor(Math.random() * 3) * 6;
  };
}

// Marcador de saída no chão (▽ ▷ ◁ △).
const MARCA = { baixo: 2, direita: 3, esquerda: 4, cima: 5 };
// Lampião pendurado (Other3 da era VX, animado). O centro da chama fica em (x*32+16, y*32+14).
const lampiao = (x, y) => ({ id: 'lampada', x, y, prioridade: 0, brilha: true, dy: 10,
  grafico: { folha: 'chars/vOther3', tipo: 'alto', idx: 0, linha: 1, objeto: true, anima: true } });

const seta = (x, y, dir = 'baixo', cond) => ({ x, y, prioridade: 0, grafico: { tile: 'xA', x: MARCA[dir], y: 0 }, cond });

// Saída: pisar no tile (prioridade 0) ou esbarrar (prioridade 1, para portas na parede).
const saida = (x, y, mapa, tx, ty, dir, extra = {}) => ({
  x, y, gatilho: 'toque', prioridade: extra.parede ? 1 : 0, solido: !!extra.parede, ...extra,
  async rodar(j) {
    if (extra.antes && (await extra.antes(j)) === false) return;
    if (extra.som !== false) som.porta();
    await j.transferir(typeof mapa === 'function' ? mapa(j) : mapa, tx, ty, dir);
  },
});

const trancada = (x, y, msgs = ['A porta esta trancada.'], extra = {}) => ({
  x, y, gatilho: 'toque', prioridade: 1, solido: true, ...extra,
  async rodar(j) { som.trancada(); for (const m of msgs) await j.fala(m); },
});

const fala = (x, y, msgs, extra = {}) => ({
  x, y, prioridade: 1, solido: true, ...extra,
  async rodar(j) { for (const m of msgs) await j.fala(m); },
});

async function falas(j, lista) { for (const m of lista) await j.fala(m); }

// Anda (em roteiro) por pontos absolutos do mapa: primeiro na horizontal, depois na vertical.
async function rota(j, quem, pontos) {
  for (const [x, y] of pontos) {
    while (quem.x !== x) await quem.andar(quem.x < x ? 'direita' : 'esquerda', j, 1);
    while (quem.y !== y) await quem.andar(quem.y < y ? 'baixo' : 'cima', j, 1);
  }
}

export const HISTORIA = {
  // ======================================================================
  cela: {
    async aoEntrar(j) {
      j.paralelos.push(piscar(j, 'lampada'));
      if (j.flags.intro) return;
      j.flags.intro = true;
      const h = j.heroi;
      j.brilho = 0; j.alvoBrilho = 0;
      h.x = 9; h.y = 6; h.rx = 9 * 32; h.ry = 6 * 32; h.dir = 'cima';
      await quadros(30);
      await j.acender(60);
      await quadros(20);
      await j.fala('Meu Deus que dor de cabeça.');
      h.virar('esquerda'); await quadros(20); h.virar('direita'); await quadros(20); h.virar('baixo');
      await j.fala('Mais que lugar é esse?');
      await j.fala('Eu não me lembro de nada, esta tudo\n muito confuso agora.');
      h.virar('cima'); await quadros(16);
      await j.fala('Que lugar sombrio.');
      h.virar('baixo'); await quadros(10);
      await j.fala('Sim... , deve ser um sonho.');
      await j.fala('Para mover o personagem principal pressione as setas\n"Acima", "abaixo", "direita", "esquerda".', 'alto');
      await j.fala('Para fazer alguma ação no jogo pressione\n"Enter" e para cancelar pressione "Esc".', 'alto');
      await j.fala('Para abrir o inventário pressione "i"', 'alto');
    },
    eventos: [
      lampiao(8, 3),
      seta(9, 10),
      trancada(9, 11),
      {
        id: 'carta', x: 7, y: 9, prioridade: 0, brilha: true, grafico: { tile: 'xA', x: 7, y: 0 },
        async rodar(j) {
          await j.mostrarFigura('carta', 24);
          await j.fala(`${V}Nascido do fogo.\nBem vindo ao seu novo lar.`);
          await j.fala(`${V}Agora que você esta sozinho não\npoderá pedir ajuda.`);
          await j.tirarFigura(24);
          await j.fala('Mais que tipo de carta é essa?');
        },
      },
      {
        id: 'respiro', x: 10, y: 4, prioridade: 0, solido: true, alcance: true,
        async rodar(j) {
          const h = j.heroi;
          if (j.flags.grito) return respiroDepoisDoGrito(j);
          if (j.flags.tentouGrade) { await j.fala('Droga! Não consigo quebrar a grade.'); return; }
          await falas(j, ['Uma entrada de ar.', 'Um cheiro estranho vem daqui.', 'Um cheiro de carne podre.', 'Oque será que tem lá?',
            'A grade esta um pouco enferrujada,\ntalvez eu possa quebra-la.']);
          await forcarGrade(j);
          await j.fala('O único modo de eu sair é por aqui.');
          await quadros(20);
          await j.fala('Isso é um pesadelo.');
          await j.fala('Não aguento mais.');
          await forcarGrade(j);
          await j.fala('Droga! Não consigo quebrar a grade.');
          j.flags.tentouGrade = true;
          await h.andar('baixo', j, 2);
          await quadros(30);
          await j.fala('Quando eu abrir os olhos, vou ver que isso\nnão passava de um pesadelo.');
          await j.apagar(40); await quadros(50); await j.acender(40);
          h.virar('esquerda'); await quadros(30); h.virar('direita'); await quadros(30);
          await h.andar('baixo', j, 1);
          await j.fala('Isso é real.');
          await j.fala('Oque esta acontecendo?');
          await h.andar('esquerda', j, 1);
          await j.fala('Droga! Isso tudo é real.');
          h.virar('baixo');
          await falas(j, ['Não estou em um sonho.', 'Deus por favor me tire daqui.', 'Por favor!']);
          await quadros(30);
          await j.fala('Socorro!');
          await quadros(60);
          await j.fala('Estou perdido...');
          await quadros(40);
          som.grito(); j.tremor = 40;
          await quadros(70);
          j.flags.grito = true;
        },
      },
      { id: 'cano', x: 11, y: 5, prioridade: 1, solido: true, async rodar(j) { await respiroDepoisDoGrito(j); } },
      fala(7, 6, ['Não tem nada aqui.']),
      fala(7, 5, ['Não tem nada aqui.']),
      fala(8, 5, ['Não tem nada aqui.']),
    ],
  },

  // ======================================================================
  duto: {
    eventos: [
      {
        // a grade solta no chão, onde ele cai: aparece no piso e responde ao OK em cima ou de frente
        id: 'grade', x: 8, y: 6, prioridade: 0, alcance: true, grafico: { tile: 'xA', x: 6, y: 1 },
        async rodar(j) {
          if (!j.temItem('cano')) { await j.fala('Uma grade no chão.'); return; }
          await quebrarGradeDuto(j);
        },
        async usar(j, item) {
          if (item !== 'cano') return false;
          await quebrarGradeDuto(j);
          return true;
        },
      },
      // as duas pontas do duto não dão em nada: o herói lembra da grade
      { x: 0, y: 6, gatilho: 'toque', prioridade: 0, async rodar(j) { await becoDuto(j); } },
      { x: 29, y: 6, gatilho: 'toque', prioridade: 0, async rodar(j) { await becoDuto(j); } },
    ],
  },

  // ======================================================================
  quarto2: {
    async aoEntrar(j) { j.paralelos.push(piscar(j, 'lampada')); },
    eventos: [
      lampiao(6, 3),
      seta(7, 10),
      saida(7, 10, 'corredor', 21, 6, 'baixo'),
      fala(6, 5, ['Não tem nada aqui.']), fala(6, 6, ['Não tem nada aqui.']),
      fala(9, 6, ['Não tem nada aqui.']), fala(10, 6, ['Não tem nada aqui.']), fala(9, 7, ['Não tem nada aqui.']), fala(10, 7, ['Não tem nada aqui.']),
      {
        x: 7, y: 5, prioridade: 1, solido: true,
        async rodar(j) {
          if (j.flags.pequena) { await j.fala('Não tem nada aqui.'); return; }
          j.flags.pequena = true;
          await j.fala('Uma pequena chave.');
          await j.ganhar('pequena');
        },
      },
    ],
  },

  // ======================================================================
  corredor: {
    async aoEntrar(j) { j.paralelos.push(piscar(j, 'lampada', 0.006)); },
    eventos: [
      lampiao(18, 4),
      // portas em arco
      saida(21, 5, 'quarto2', 7, 9, 'cima', { parede: true }),
      saida(27, 5, 'pilares', 48, 8, 'esquerda', {
        parede: true,
        async antes(j) { if (!j.flags.bronzeUsada) { som.trancada(); await j.fala('A porta esta trancada.'); return false; } },
      }),
      trancada(14, 5),
      // vão de porta do banheiro
      saida(6, 5, 'banheiro', 7, 9, 'cima', { parede: true }),
      // saídas de baixo
      seta(6, 9), saida(6, 9, 'quarto_caixa', 7, 6, 'baixo'),
      seta(14, 9), saida(14, 9, 'quarto_rachadura', 7, 9, 'cima', {
        async antes(j) { if (!j.flags.bronzeUsada) { som.trancada(); await j.fala('A porta esta trancada.'); return false; } },
      }),
      seta(21, 9), trancada(21, 10),
      seta(41, 10),
      {
        id: 'porta14', x: 41, y: 11, gatilho: 'toque', prioridade: 1, solido: true,
        async rodar(j) {
          if (j.flags.porta14) { som.porta(); await j.transferir('sala14', 7, 5, 'baixo'); return; }
          som.trancada();
          await j.fala('A porta esta trancada.');
          await j.fala(`Um aviso na porta:\n${V}"Essa porta tem que estar sempre trancada."`);
        },
        async usar(j, item) {
          if (item !== 'chave14') return false;
          await j.fala('Esta porta esta trancada deve ter algo\nde alguma importância aqui dentro.');
          som.destrancar();
          await j.fala('Destrancou.');
          j.flags.porta14 = true;
          return true;
        },
      },
      // saída da esquerda
      seta(2, 7, 'esquerda'),
      saida(2, 7, 'sala_lampadas', 10, 6, 'esquerda', { som: false }),
      saida(2, 6, 'sala_lampadas', 10, 6, 'esquerda', { som: false }),
    ],
  },

  // ======================================================================
  quarto_caixa: {
    eventos: [
      saida(7, 5, 'corredor', 6, 8, 'baixo', { parede: true }),
      {
        id: 'caixa', x: 9, y: 8, prioridade: 1, solido: true, grafico: { tile: 'iB', x: 4, y: 5 },
        async rodar(j) {
          if (j.flags.caixa2) { await j.fala('Não tem mais nada aqui.'); return; }
          if (!j.flags.caixa1) {
            await j.fala('Para abrir essa caixa é preciso um código.', 'baixo');
            const s = await j.digitarNome(12);
            if (s.trim().toLowerCase() !== 'perdido') { som.erro(); await j.fala('Não deu certo.', 'baixo'); return; }
            j.flags.caixa1 = true;
            await j.fala('Deu certo.', 'baixo');
          }
          const n = await j.numero('Tem mais um código agora é com números.', 4, 0, 'baixo');
          if (n !== 11) { som.erro(); await j.fala('Não abriu.', 'baixo'); return; }
          som.destrancar();
          await j.fala('Abriu.', 'baixo');
          j.flags.caixa2 = true;
          await j.ganhar('chave14');
          await j.fala('Não tem mais nada aqui.', 'baixo');
        },
      },
      fala(6, 7, [`Folhas rasgadas, só consigo ler uma palavra:\n${V}"Perdido"`]),
      fala(6, 9, [`Tem um número riscado no jarro:\n${V}"0011"`]),
      fala(10, 6, ['Não tem nada aqui.']), fala(10, 7, ['Não tem nada aqui.']),
      {
        x: 5, y: 6, prioridade: 1, solido: true,
        async rodar(j) {
          if (j.flags.ladrao) { await j.fala('Não tem mais nada aqui.'); return; }
          await j.fala('Um armario trancado.');
        },
        async usar(j, item) {
          if (item !== 'pequena' || j.flags.ladrao) return false;
          som.destrancar();
          await j.fala('Destrancou.');
          j.flags.ladrao = true;
          await j.ganhar('ladrao');
          return true;
        },
      },
    ],
  },

  // ======================================================================
  sala14: {
    async aoEntrar(j) {
      if (j.flags.voltou14) return;
    },
    eventos: [
      {
        x: 7, y: 4, gatilho: 'toque', prioridade: 1, solido: true,
        async rodar(j) {
          if (j.flags.monstro && !j.flags.flashback) return;
          som.porta(); await j.transferir('corredor', 41, 10, 'cima');
        },
      },
      {
        id: 'banco', x: 5, y: 9, prioridade: 1, solido: true,
        async rodar(j) {
          if (j.flags.armario) { await j.fala('Não tem nada aqui.'); return; }
          j.flags.armario = true;
          await j.fala('Uma chave.');
          // no jogo original esta chave entra no inventário como uma segunda "Chave 14"
          await j.ganhar('chave14', false);
          await j.fala(`${V}Chave de armario${B} adicionada.`, 'baixo');
          await cenaMonstro(j);
        },
      },
      fala(6, 9, ['Não tem nada aqui.']), fala(4, 9, ['Não tem nada aqui.']), fala(4, 10, ['Não tem nada aqui.']),
      fala(9, 6, ['Não tem nada aqui.']), fala(10, 9, ['Não tem nada aqui.']),
    ],
  },

  // ======================================================================
  quarto_menino: {
    async aoEntrar(j) {
      j.paralelos.push(relampagos(j));
    },
    eventos: [
      { id: 'kid', x: 12, y: 7, grafico: KID, dir: 'cima' },
      { id: 'pai', x: 12, y: 11, grafico: PAI, dir: 'cima', oculto: true },
    ],
  },

  hospital: {
    eventos: [
      { id: 'medico', x: 7, y: 4, grafico: MEDICO, dir: 'baixo' },
    ],
  },

  // ======================================================================
  banheiro: {
    async aoEntrar(j) {
      if (j.flags.banheiro) return;
      j.flags.banheiro = true;
      await quadros(20);
      await j.fala('Ei tem alguém ai?');
      await quadros(20);
      await j.fala('Parece que eu estava enganado.');
      await j.fala(`${V}Olhe no espelho.`);
    },
    eventos: [
      seta(7, 10), saida(7, 10, 'corredor', 6, 6, 'baixo'),
      {
        x: 15, y: 6, prioridade: 1, solido: true,
        async rodar(j) {
          await j.fala('Não consigo ver meu reflexo.');
          await j.fala('Mais... O espelho parece estar limpo.');
          await j.fala('Mais oque tem de errado.');
        },
      },
      fala(3, 3, ['Tem um número riscado na parede.']), fala(6, 3, ['Tem um número riscado na parede.']),
      fala(9, 3, ['Tem um número riscado na parede.']), fala(12, 3, ['Tem um número riscado na parede.']),
    ],
  },

  // ======================================================================
  sala_lampadas: {
    async aoEntrar(j) { j.paralelos.push(piscar(j, 'l1', 0.003), piscar(j, 'l2', 0.003)); },
    eventos: [
      { ...lampiao(5, 3), id: 'l1' }, { ...lampiao(9, 3), id: 'l2' },
      seta(11, 6, 'direita'), saida(11, 6, 'corredor', 3, 7, 'direita', { som: false }),
      {
        x: 7, y: 4, gatilho: 'toque', prioridade: 1, solido: true,
        async rodar(j) {
          if (!j.flags.escada) {
            const n = await j.numero('Esta porta esta trancada com código.', 4, 1320, 'meio');
            if (n !== 1264) { som.trancada(); return; }
            som.destrancar();
            j.flags.escada = true;
          }
          som.passo();
          await j.transferir('salao', 33, 13, 'cima');
        },
      },
    ],
  },

  salao: {
    eventos: [
      seta(33, 14), saida(33, 14, 'sala_lampadas', 7, 5, 'baixo'),
      seta(2, 10, 'esquerda'), trancada(1, 10),
      {
        x: 8, y: 8, gatilho: 'toque', prioridade: 1, solido: true,
        async rodar(j) {
          await j.fala(`A um aviso na porta:\n${V}"Não entre aqui, por favor!"`);
          const s = await j.escolha('Entrar?', ['Sim', '\\c[2]Não']);
          if (s !== 0) return;
          som.porta();
          await j.transferir('pilares', 48, 8, 'esquerda');
        },
      },
      fala(24, 12, ['Não tem nada aqui.']), fala(25, 12, ['Não tem nada aqui.']), fala(26, 12, ['Não tem nada aqui.']),
    ],
  },

  // ======================================================================
  pilares: {
    async aoEntrar(j) {
      j.paralelos.push(luzesSoltas(j));
      if (j.flags.pilares) return;
      j.flags.pilares = true;
      await quadros(20);
      som.batida(); j.tremor = 10;
      await quadros(30);
      await j.fala('Oque foi isso?');
      j.heroi.virar('direita');
      await quadros(20);
      await j.fala('Droga a porta esta trancada.');
      await j.fala('Ei quem é você?');
      await j.fala('Abra a porta agora!');
      await quadros(30);
      await j.fala('Parece que ele se foi...');
      j.heroi.virar('esquerda');
      await j.fala('Vou ter que procurar outra saída por aqui.');
    },
    eventos: [
      seta(49, 8, 'direita'),
      {
        x: 50, y: 8, gatilho: 'toque', prioridade: 1, solido: true,
        async rodar(j) {
          if (j.flags.bronzeUsada) { som.porta(); await j.transferir('corredor', 27, 6, 'baixo'); return; }
          som.trancada(); await j.fala('Droga a porta esta trancada.');
        },
        async usar(j, item) {
          if (item !== 'bronze') return false;
          som.destrancar();
          await j.fala('Abriu porta.');
          j.flags.bronzeUsada = true;
          const s = await j.escolha('Deseja descartar chave?', ['Sim', '\\c[2]Não'], 'meio');
          if (s === 0) j.perder('bronze');
          return true;
        },
      },
      seta(3, 8, 'esquerda'),
      saida(3, 8, 'celas', 13, 7, 'esquerda', { som: false }),
    ],
  },

  // ======================================================================
  celas: {
    async aoEntrar(j) {
      if (!j.temItem('bronze') && !j.flags.bronzeUsada) return;
      if (j.flags.voz) return;
      j.flags.voz = true;
      await quadros(30);
      await cenaVoz(j);
    },
    eventos: [
      seta(14, 7, 'direita'), saida(14, 7, 'pilares', 4, 8, 'direita', { som: false }),
      seta(2, 7, 'esquerda'), saida(2, 7, 'armadilhas', 14, 7, 'esquerda', { som: false }),
    ],
  },

  // ======================================================================
  armadilhas: {
    async aoEntrar(j) {
      if (j.flags.armadilhas) return;
      j.flags.armadilhas = true;
      await quadros(20);
      await j.fala('Sala sem saída.\nVou procurar algo que possa me ajudar.');
      await j.fala('Esse lugar esta cheio de armadilhas.');
      await j.fala('Tenho que tomar cuidado.');
    },
    porQuadro(j) {
      const h = j.heroi;
      if (h.movendo || j.rodando) return;
      const k = h.x + ',' + h.y;
      if (k === j._ultTrap) return;
      j._ultTrap = k;
      if (ehArmadilha(h.x, h.y)) j.executar(() => cairArmadilha(j));
    },
    eventos: [
      seta(15, 7, 'direita'), saida(15, 7, 'celas', 3, 7, 'direita', { som: false }),
      {
        x: 8, y: 2, prioridade: 1, solido: true,
        async rodar(j) {
          if (j.flags.bronze) { await j.fala('Não tem mais nada aqui.'); return; }
          j.flags.bronze = true;
          await j.ganhar('bronze');
          await j.fala('Talvez essa chave sirva para abrir a porta no\nfim do corredor.');
          await j.fala('Porque alguém está fazendo isso?');
          await j.fala('É algum tipo de teste para dificultar a saída\ndesse lugar?');
          await j.fala('Pesadelo ou realidade eu tenho que sair daqui.');
        },
      },
    ],
  },

  // ======================================================================
  quarto_rachadura: {
    async aoEntrar(j) { j.paralelos.push(piscar(j, 'lampada')); },
    eventos: [
      lampiao(9, 4),
      seta(7, 10), saida(7, 10, 'corredor', 14, 8, 'baixo'),
      {
        x: 5, y: 5, prioridade: 1, solido: true,
        async rodar(j) {
          const s = await j.escolha('<> Passar pela rachadura?', ['Sim', '\\c[2]Não']);
          if (s !== 0) return;
          await j.transferir('sala_enigma', 8, 8, 'cima');
        },
      },
    ],
  },

  sala_enigma: {
    eventos: [
      {
        x: 7, y: 5, prioridade: 1, solido: true,
        async rodar(j) {
          await j.fala(`Tem algo escrito:\n${V}"O enigma já esta resolvido, agora só\nfalta imitar as outras peças."`);
          await j.apagar(20);
          const ok = await tabuleiro(j);
          if (!ok) { await j.acender(20); return; }
          j.brilho = 0; j.alvoBrilho = 0;
          // depois do salto no tempo ele só tem o que achar dali em diante (no trailer, o
          // inventário do fim mostra apenas a "Chave")
          j.itens = [];
          await quadros(30);
          await j.narrar('Algum tempo depois...', 120, 196);
          await j.transferir('descanso', 9, 7, 'baixo', { fade: false });
          await j.acender(30);
        },
      },
    ],
  },

  // ======================================================================
  descanso: {
    async aoEntrar(j) {
      if (j.flags.descanso) return;
      j.flags.descanso = true;
      await quadros(40);
      await falas(j, ['Estou com muita dor de cabeça.', 'Vou parar um pouco.', 'Não sei como estou aguentado.',
        'Esse lugar passa uma energia negativa.', 'Parece que outras pessoas estiveram\naqui antes de mim.', 'E elas sentiam medo.',
        'Como vou saber se isso tudo é real, pode ser\ntudo um simples pesadelo.', 'A libertação seria suicidio?', 'Mais...',
        'Não tenho coragem.', 'Eu creio que estar aqui tem algum\nsentido.', 'Vou seguir até o fim.']);
      await j.apagar(40);
      await j.narrar('Apos caminhar por esse lugar, em busca de uma\nforma de sair, encontro algo que não poderia\nimaginar', 300, 170);
      await j.transferir('giratoria', 9, 7, 'cima', { fade: false });
      await j.acender(40);
    },
    eventos: [seta(3, 7, 'esquerda'), trancada(2, 7), seta(14, 9, 'direita'), trancada(15, 9)],
  },

  giratoria: {
    async aoEntrar(j) { j.vars.giro = j.vars.giro || 0; },
    eventos: [
      {
        x: 9, y: 6, prioridade: 1, solido: true, grafico: { tile: 'xA', x: 3, y: 3 },
        async rodar(j) {
          const s = await j.escolha('<>Girar?', ['Esquerda', '\\c[2]Direita'], 'baixo', { cancelar: -1 });
          await j.apagar(20);
          som.girar(); j.tremor = 30;
          j.vars.giro = (j.vars.giro + (s === 0 ? 3 : 1)) % 4;
          await quadros(50);
          await j.acender(20);
        },
      },
      { ...seta(3, 7, 'esquerda'), cond: () => giro() === 0 },
      { ...trancada(3, 7), prioridade: 1, cond: () => giro() === 0 },
      { x: 8, y: 3, prioridade: 1, grafico: { tile: 'mD', x: 10, y: 9 }, cond: () => giro() === 1 },
      { ...trancada(8, 4), cond: () => giro() === 1 },
      { ...seta(13, 7, 'direita'), cond: () => giro() === 2 },
      { ...trancada(13, 7), cond: () => giro() === 2 },
      { ...seta(8, 10), cond: () => giro() === 3 },
      { ...saida(8, 10, 'quarto_urso', 12, 6, 'baixo'), cond: () => giro() === 3 },
    ],
  },

  quarto_urso: {
    async aoEntrar(j) { j.paralelos.push(piscar(j, 'lampada')); },
    eventos: [
      lampiao(8, 3),
      {
        x: 12, y: 5, gatilho: 'toque', prioridade: 1, solido: true,
        async rodar(j) {
          som.porta();
          if (j.flags.urso) await j.transferir('corredor_final', 8, 52, 'cima');
          else await j.transferir('giratoria', 8, 9, 'cima');
        },
      },
      {
        id: 'urso', x: 6, y: 6, prioridade: 1, solido: true, dy: 14, cond: () => !estado().urso,
        grafico: { folha: 'chars/vOther3', tipo: 'alto', idx: 3, linha: 3, quadro: 0, objeto: true },
        async rodar(j) {
          await falas(j, ['Um urso de pelúcia, em um lugar como\nesse?', 'Será que a alguma criança por aqui?',
            'Tem um buraco na barriga do urso,\num corte de faca.', 'Espere!', 'Tem um bilhete aqui.']);
          await falas(j, [`${V}Meu querido papai.`, `${V}Eu estou rezando por você.`, `${V}Mais eu acho que não vai resolver.`,
            `${V}Eles, os homens do mal estão atrás de\nvocê.`, `${V}Eu tenho uma amiga.`, `${V}Todos falam que é minha imaginação.`,
            `${V}Porque ela não existe.`, `${V}Mais ela é única para mim, mais ela diz\ncoisas ruins sobre você.`,
            `${V}Deste que você desapareceu só tenho\na companhia dela.`, `${V}Hoje foi visitar seu tumulo.`,
            `${V}Eu deixei um presente para ela.`, `${V}Um ursinho de pelúcia.`]);
          await quadros(30);
          await j.fala('Parece que eu já vi esse urso de pelúcia\nem algum lugar.');
          await j.apagar(50);
          j.flags.urso = true;
          som.susto();
          await quadros(60);
          await j.acender(50);
          await j.fala('Mais oque aconteceu?\nAonde esta o urso de pelúcia?');
        },
      },
    ],
  },

  corredor_final: {
    async aoEntrar(j) { j.paralelos.push(apagoes(j)); },
    eventos: [
      seta(8, 53),
      {
        x: 8, y: 14, prioridade: 0, brilha: true, grafico: { tile: 'xA', x: 7, y: 0 }, cond: () => !estado().chaveFim,
        async rodar(j) { j.flags.chaveFim = true; await j.fala('Uma chave.'); await j.ganhar('chave'); },
      },
      {
        x: 8, y: 4, gatilho: 'toque', prioridade: 1, solido: true,
        async rodar(j) { som.trancada(); await j.fala('A porta esta trancada.'); },
        async usar(j, item) {
          if (item !== 'chave') return false;
          som.destrancar();
          await j.fala('Destrancou porta.');
          j.perder('chave');
          await j.fala('A chave quebrou ao abrir a porta.');
          await finalTrailer(j);
          return true;
        },
      },
    ],
  },
};

// ---------------- estado global usado pelas condições ----------------
let jogoAtual = null;
export function ligarHistoria(j) { jogoAtual = j; }
const estado = () => jogoAtual?.flags || {};
const giro = () => jogoAtual?.vars.giro || 0;

// ---------------- cela ----------------
async function forcarGrade(j) {
  const h = j.heroi;
  for (let i = 0; i < 3; i++) {
    h.ry -= 4; som.metal(); j.tremor = 6;
    await quadros(8); h.ry += 4; await quadros(14);
  }
}

async function respiroDepoisDoGrito(j) {
  if (!j.flags.grito) { await j.fala('Não tem nada aqui.'); return; }
  if (!j.flags.viuRachadura) {
    await falas(j, ['O grito veio daqui.', 'Uma rachadura no cano de ferro.', 'Mais... Como eu não tinha visto isso antes?', 'Tenho que sair daqui.']);
    j.flags.viuRachadura = true;
  }
  const s = await j.escolha('<> Quebrar grade?', ['Sim', '\\c[2]Não']);
  if (s !== 0) return;
  await j.apagar(30);
  som.metal(); await quadros(20); som.quebrar(); await quadros(30);
  await j.ganhar('cano');
  await quadros(20);
  await j.transferir('duto', 8, 6, 'baixo', { fade: false });
  await j.acender(30);
}

// ---------------- duto ----------------
async function quebrarGradeDuto(j) {
  await j.fala('Eu posso utilizar o cano para quebrar\na grade forçando ela.');
  const s = await j.escolha('<> Deseja quebrar?', ['Sim', '\\c[2]Não']);
  if (s !== 0) return;
  som.metal(); j.tremor = 10; await quadros(30); som.quebrar(); j.tremor = 20;
  await j.apagar(30);
  som.batida();
  await quadros(40);
  await j.transferir('quarto2', 9, 5, 'baixo', { fade: false });
  await j.acender(30);
}
async function becoDuto(j) {
  await j.fala('Não tem saída por aqui.');
  if (j.temItem('cano')) await j.fala('Talvez eu consiga forçar aquela grade no\nchão com o cano.');
}

// ---------------- sala 14: a voz, o esconderijo, o monstro, o flashback ----------------
async function cenaMonstro(j) {
  const h = j.heroi;
  await quadros(20);
  await j.fala(`${V}Ei saia daqui.`);
  h.virar('cima'); await quadros(20);
  await j.fala('O que foi isso?');
  await j.fala(`${V}Oque você esta fazendo saia\ndaqui`);
  som.batida(); j.tremor = 8; await quadros(20); som.batida(); j.tremor = 8;
  await j.fala('Alguem esta tentando entrar aqui.');
  await j.fala('Sinto que tem algo de errado tenho que me\nesconder.');
  j.flags.monstro = true;
  // esconde-se atrás da cadeira, junto da prateleira (como no trailer, 4:06)
  await rota(j, h, [[9, h.y], [9, 7], [10, 7], [10, 6]]);
  h.virar('cima');
  await quadros(10);
  await j.apagar(30);
  h.visivel = false;
  j.amb = 0.05; j.brilho = 0.35; j.alvoBrilho = 0.35;
  // o monstro entra e anda pela sala no escuro
  som.porta();
  const ev = new Evento({ x: 7, y: 5, grafico: SOMBRA, dir: 'baixo', id: 'monstro', vel: 2, pesado: true });
  ev.opac = 0.35; j.eventos.push(ev);
  som.tensao(1);
  for (const [x, y] of [[7, 7], [5, 7], [5, 8], [8, 8], [8, 10], [7, 10], [7, 5]]) {
    while (ev.x !== x || ev.y !== y) {
      const d = ev.x !== x ? (ev.x < x ? 'direita' : 'esquerda') : (ev.y < y ? 'baixo' : 'cima');
      await ev.andar(d, j, 1); await quadros(10);   // os passos (pesados) saem sozinhos
    }
  }
  som.porta();
  j.eventos = j.eventos.filter((e) => e !== ev);
  som.tensao(0);
  await quadros(120);
  await j.fadeAte(1, 40);
  j.amb = j.def.amb;
  h.visivel = true;
  await rota(j, h, [[10, 7], [7, 7]]);
  h.virar('baixo');
  await falas(j, ['Mais oque era aquilo?', 'Não pude ver.', 'Um monstro ele estava atrás de mim.', 'Eu sei o que ele queria, estava me\ncaçando.',
    'É melhor eu tomar cuidado.', 'Sorte que ele não me viu.', 'Isso esta parecendo um pesadelo que\nnão posso acordar.']);
  await j.apagar(40);
  await flashback(j);
}

async function flashback(j) {
  // quarto do menino
  j.carregar('quarto_menino', 12, 11, 'cima');
  j.heroi.visivel = false;
  const kid = j.evento('kid'), pai = j.evento('pai');
  await j.acender(40);
  await quadros(30);
  pai.visivel = true;
  som.porta();
  await pai.andar('cima', j, 3);
  await j.fala(`${V}Ei você esta bem?`);
  kid.virar('baixo');
  await j.fala('Pai eu vi algo escondido nas sombras.');
  await j.fala(`${V}Você de novo com essa historia.`);
  await quadros(20);
  await j.fala(`${V}Deixa-me ver.`);
  await rota(j, pai, [[9, 8], [9, 7], [7, 7]]);
  pai.virar('cima'); await quadros(40); pai.virar('esquerda'); await quadros(30); pai.virar('direita'); await quadros(20);
  await j.fala(`${V}Não tem nada aqui filho.`);
  await rota(j, pai, [[10, 7]]);
  await j.fala(`${V}Não tem nada aqui, não fique imaginando\ncoisas.`);
  await j.fala(`${V}Isso é fruto de sua imaginação.`);
  await j.fala('Mais pai.');
  await j.fala(`${V}Não tenha medo de nada vou sempre\nlhe proteger.`);
  await j.fala(`${V}Durma tranquilo.`);
  // o pai sai pela porta de baixo (12,11)
  await rota(j, pai, [[11, 7], [11, 10], [12, 10], [12, 11]]);
  som.porta();
  pai.visivel = false;
  await quadros(60);
  await rota(j, kid, [[9, 7], [9, 6]]);
  await j.fala('Isso esta acontecendo cada vez mais.');
  await j.fala('Eu sei oque eu vi.');
  // vai até a janela
  await rota(j, kid, [[7, 6], [7, 5]]);
  kid.virar('cima');
  await j.fala('Ele aparece nessa janela sempre me olhando.');
  await j.fala('O que ele quer de mim?');
  await j.fala('As coisas estão fugindo de controle.');
  await j.fala('Será que eu fui o escolhido por ele?');
  j.flash = 0.9; som.trovao();
  await quadros(80);
  await j.apagar(40);
  await quadros(30);
  // tela preta
  j.mapa = null;
  j.brilho = 1; j.alvoBrilho = 1;
  await j.fala('Só eu posso ver eles.');
  await quadros(40);
  await j.fala('Eu tinha uma família.');
  await quadros(30);
  // hospital
  j.brilho = 0; j.alvoBrilho = 0;
  j.carregar('hospital', 10, 9, 'cima');
  const med = j.evento('medico');
  await j.acender(40);
  await med.andar('baixo', j, 3);
  await med.andar('direita', j, 3);
  med.virar('baixo');
  await j.fala('Médico.');
  await j.fala('Me de noticias de minha esposa.');
  await j.fala(`${V}Vou lhe dar um conselho meu amigo, volte\npara casa tome um bom banho e durma, você\ntem a filha para cuidar.`);
  await j.fala('Eu não posso deixa-la aqui do jeito em\nque esta.');
  await j.fala(`${V}Nós estamos cuidando, tenha calma.`);
  await j.fala(`${V}Além do mais você não pode ajudar\nem nada.`);
  await j.fala('Pelo menos me diga oque ela tem.');
  await j.fala(`${V}Esta bem eu vou falar.`);
  await j.fala(`${V}Sua mulher tem uma doença muito grave\ne que não tem cura.`);
  await j.fala(`${V}Nos aqui do hospital tentamos de\ntudo mais...`);
  await j.fala(`${V}Mas, infelizmente os dias dela estão\ncontados.`);
  await j.fala('Não acredito.');
  await j.fala(`${V}Acalme-se.`);
  await j.fala(`${V}Você é católico?`);
  await j.fala('Eu sou sim, mais não sou praticante.');
  await j.fala(`${V}A unica coisa que digo a você é reze\nmuito porque para salvar sua mulher só\num milagre.`);
  await j.fala('Isso não pode estar acontecendo ela\nnão pode nos deixar assim.');
  await j.fala('Nós temos uma bela filha, eu ia casar\ncom ela, agora isso acontece.');
  await j.fala('Não estou acreditando.');
  await j.fala(`${V}Você mais do que nunca tem que ter fé.`);
  await quadros(30);
  await j.apagar(50);
  j.flags.flashback = true;
  j.heroi.grafico = HEROI;
  await quadros(30);
  await j.transferir('corredor', 41, 10, 'cima', { fade: false });
  await j.acender(40);
}

function relampagos(j) {
  let n = 200;
  return () => {
    if (--n > 0) return;
    n = 360 + Math.floor(Math.random() * 400);
    j.flash = 0.35 + Math.random() * 0.3;
    setTimeout(() => som.trovao(), 400);
  };
}

// ---------------- corredor final: a luz apaga a cada passos ----------------
// No trailer a tela vai ao preto por ~1,5 s a cada ~1,5–2,5 s de caminhada.
// Só apaga enquanto ele anda; parado (ou num evento) a luz volta.
function apagoes(j) {
  let t = 0, ciclo = 200;
  return () => {
    if (j.rodando || j.mapaId !== 'corredor_final') return;
    const andando = j.heroi.movendo || entrada.dir4();
    if (!andando) {
      if (j.alvoBrilho === 0) { j.alvoBrilho = 1; j.passoBrilho = 0.1; }
      return;
    }
    t++;
    const f = t % ciclo;
    if (f === 0) { ciclo = 170 + Math.floor(Math.random() * 60); j.alvoBrilho = 1; j.passoBrilho = 0.1; }
    if (f === ciclo - 90) { j.alvoBrilho = 0; j.passoBrilho = 0.1; som.apagao(); }
  };
}

// ---------------- pilares: luzes soltas ----------------
function luzesSoltas(j) {
  let t = 0;
  return () => {
    t++;
    const ls = j.luzes;
    ls.forEach((l, i) => {
      const fase = (t + i * 97) % 300;
      l.on = fase < 150;
      l.mult = fase < 20 ? fase / 20 : fase > 130 && fase < 150 ? (150 - fase) / 20 : 1;
    });
  };
}

// ---------------- sala das grades: a voz ----------------
async function cenaVoz(j) {
  const h = j.heroi;
  // vai até o meio da sala, de frente para as grades (12:02 do trailer)
  await rota(j, h, [[8, h.y], [8, 7]]);
  h.virar('cima');
  await j.fala(`${V}Para aonde você vai?`);
  await j.fala('Ei quem é você?');
  await j.fala('Você me prendeu aqui nesse lugar?\nOque você quer de mim?');
  await quadros(30);
  await j.fala('Você esta preso aqui também?');
  await j.fala('Por favor, me ajude a sair desse lugar.');
  await j.fala('Estou tentando fugir daqui, estou indo\npelo corredor.');
  await j.fala('Encontrei uma chave dentro de uma caixa,\ntalvez ela sirva.');
  await j.fala('Alguém me trancou eu não pude fazer nada,\nespere... Foi você que trancou a porta?');
  await j.fala(`${V}Oque? Corredor?`);
  som.tensao(0.6);
  await j.fala(`${V}Não! Não vá por lá! Não vá por lá!`);
  await j.fala(`${V}O mal em forma física o esta esperando no\nfinal do corredor!`);
  await j.fala(`${V}Ele está lá!`);
  await j.fala(`${V}É algo além que possa imaginar você não\npode fazer isso!`);
  await j.fala(`${V}Você encontrara algo pior que o sofrimento!`);
  await j.fala('Mais... Não tem para onde eu ir!');
  await j.fala('O corredor é o único caminho!');
  await j.fala('Você está falando do monstro?');
  await quadros(40);
  await j.fala('Ei? Você está ai?');
  await quadros(40);
  som.tensao(0);
  await j.fala('Acho que ele se foi...');
}

// ---------------- armadilhas ----------------
function ehArmadilha(x, y) {
  if (y >= 5 && y <= 8 && x >= 4 && x <= 13) return true;
  if (y === 4 && x >= 9 && x <= 13) return true;
  return false;
}
async function cairArmadilha(j) {
  som.armadilha();
  j.flash = 0.6; j.tremor = 20;
  await quadros(20);
  await j.apagar(20);
  const h = j.heroi;
  h.x = 14; h.y = 7; h.rx = 14 * 32; h.ry = 7 * 32; h.dir = 'esquerda';
  j._ultTrap = '14,7';
  await quadros(20);
  await j.acender(20);
}

// ---------------- o tabuleiro do enigma ----------------
// Formas apagadas em uma grade 6x6; as acesas formam o desenho que "imita" a inscrição.
const FORMAS = [
  ['q', 'q', 't', '', '', 't'],
  ['', 't', '', '', '', 'h'],
  ['', 'p', '', 'q', 't', ''],
  ['q', '', 'q', 't', '', ''],
  ['h', 'h', '', '', 't', ''],
  ['t', 'h', '', 'p', '', 'q'],
];
// (conferido com a captura 16 de 2014, que mostra o tabuleiro resolvido)
const SOLUCAO = new Set(['3,3', '0,2', '4,0', '5,0', '5,5']);

function desenharForma(g, f, cx, cy, r, cor, larg) {
  g.strokeStyle = cor; g.lineWidth = larg;
  g.beginPath();
  if (f === 'q') g.rect(cx - r * 0.8, cy - r * 0.8, r * 1.6, r * 1.6);
  else {
    const n = f === 't' ? 3 : f === 'p' ? 5 : 7;
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r + (f === 't' ? r * 0.2 : 0);
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
  }
  g.stroke();
}

function tabuleiro(j) {
  return new Promise((fim) => {
    const acesas = new Set(['3,3']);
    let cx = 3, cy = 3, t = 0;
    // casas de 32 px a partir de (192,128); moldura de ripas de 1 tile em volta (captura 16)
    const X0 = 192, Y0 = 128, C = 32;
    j.brilho = 1; j.alvoBrilho = 1;
    j.overlay = {
      atualizar() {
        t++;
        if (entrada.repetiu('direita')) { cx = (cx + 1) % 6; som.cursor(); }
        if (entrada.repetiu('esquerda')) { cx = (cx + 5) % 6; som.cursor(); }
        if (entrada.repetiu('baixo')) { cy = (cy + 1) % 6; som.cursor(); }
        if (entrada.repetiu('cima')) { cy = (cy + 5) % 6; som.cursor(); }
        if (entrada.disparou('ok')) {
          const k = `${cy},${cx}`;
          if (!FORMAS[cy][cx]) { som.erro(); return; }
          if (acesas.has(k)) acesas.delete(k); else acesas.add(k);
          som.ok();
          if (acesas.size === SOLUCAO.size && [...SOLUCAO].every((s) => acesas.has(s))) {
            j.overlay = null; som.destrancar(); fim(true);
          }
        }
        if (entrada.disparou('cancelar')) { j.overlay = null; fim(false); }
      },
      desenhar(g) {
        g.fillStyle = '#000'; g.fillRect(0, 0, LARG, ALT);
        // moldura de ripas verticais (1 tile) em volta das 6x6 casas
        const fx = X0 - 32, fy = Y0 - 32, fw = C * 6 + 64, fh = C * 6 + 64;
        g.fillStyle = '#161616'; g.fillRect(fx, fy, fw, fh);
        for (let i = 0; i < fw; i += 6) {
          g.fillStyle = '#272727'; g.fillRect(fx + i, fy, 1, fh);
          g.fillStyle = '#1d1d1d'; g.fillRect(fx + i + 3, fy, 1, fh);
        }
        g.fillStyle = '#000'; g.fillRect(X0 - 4, Y0 - 4, C * 6 + 8, C * 6 + 8);
        for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
          const f = FORMAS[y][x];
          const px = X0 + x * C + C / 2, py = Y0 + y * C + C / 2;
          if (f) {
            const on = acesas.has(`${y},${x}`);
            desenharForma(g, f, px, py, 11, on ? '#e0e0e0' : '#3c3c3c', on ? 2 : 1.4);
          }
          if (x === cx && y === cy) cursor(g, px - 15, py - 15, 30, 30, t);
        }
      },
    };
  });
}

// ---------------- o fim do trailer ----------------
async function finalTrailer(j) {
  som.porta();
  som.tensao(1);
  await quadros(30);
  await j.apagar(30);
  await quadros(30);
  const h = j.heroi;
  const s = { x: h.x, y: h.y + 2, grafico: SOMBRA, dir: 'cima', id: 'sombra' };
  const ev = new Evento(s);
  ev.opac = 0.6;
  j.eventos.push(ev);
  await j.fadeAte(0.6, 30);
  som.susto();
  await quadros(90);
  await j.apagar(60);
  j.eventos = j.eventos.filter((e) => e !== ev);
  som.silencio(3);
  await quadros(60);
  await j.narrar('Insônia', 240);
  try { localStorage.removeItem('insonia.save'); } catch { /* */ }
  location.reload();
}

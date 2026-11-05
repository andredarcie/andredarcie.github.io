// Roteiro de cada mapa: eventos, falas e quebra-cabeças, na ordem do trailer de 2014.
// Falas do jogo de 2014, com a ortografia revisada (acentos, vírgulas, "mas"/"mais", "o que" etc.).
import { quadros, entrada, TELA } from './base.js';
import { som } from './som.js';
import { HEROI, Evento } from './jogo.js';
import { janela, texto, cursor, fonteTexto, fonteSerif, pxCaixa, textoDica } from './janela.js';

const V = '\\c[2]', B = '\\c[0]'; // vermelho / normal

// a filha (o roteiro inteiro fala da "nossa filha"; o sprite antes era o menino 03b #6)
const KID = { folha: 'chars/m03b', tipo: 'mack', idx: 7 };
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

const trancada = (x, y, msgs = ['A porta está trancada.'], extra = {}) => ({
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
      h.x = 9; h.y = 7; h.rx = 9 * 32; h.ry = 7 * 32; h.dir = 'cima';   // (9,7): onde ele acorda no trailer
      await quadros(30);
      await j.acender(60);
      await quadros(20);
      await j.fala('Meu Deus, que dor de cabeça.');
      h.virar('esquerda'); await quadros(80); h.virar('direita'); await quadros(80); h.virar('baixo'); await quadros(40);
      await j.fala('Mas que lugar é esse?');
      await j.fala('Eu não me lembro de nada, está tudo\nmuito confuso agora.');
      h.virar('cima'); await quadros(16);
      await j.fala('Que lugar sombrio.');
      h.virar('baixo'); await quadros(10);
      await j.fala('Sim... deve ser um sonho.');
      if (document.body.classList.contains('toque')) {
        await j.fala('Para mover o personagem, use o direcional.', 'alto');
        await j.fala('Para interagir com algo, toque em "OK"; para cancelar, toque em "Esc". Tocar na tela também passa as mensagens.', 'alto');
        await j.fala('Para abrir o inventário, toque em "I".', 'alto');
      } else {
        await j.fala('Para mover o personagem, use as setas (ou W, A, S, D). Segure Shift para correr.', 'alto');
        await j.fala('Para interagir com algo, pressione Enter (ou Espaço); para cancelar, pressione Esc.', 'alto');
        await j.fala('Para abrir o inventário, pressione I. A tecla M liga e desliga o som.', 'alto');
      }
    },
    eventos: [
      lampiao(8, 3),
      seta(9, 10),
      trancada(9, 11),
      {
        id: 'carta', x: 7, y: 9, prioridade: 0, brilha: true, grafico: { tile: 'xA', x: 7, y: 0 },
        async rodar(j) {
          await j.mostrarFigura('carta', 24);
          await j.fala(`${V}Nascido do fogo.\nBem-vindo ao seu novo lar.`);
          await j.fala(`${V}Agora que você está sozinho, não\npoderá pedir ajuda.`);
          await j.tirarFigura(24);
          await j.fala('Mas que tipo de carta é essa?');
        },
      },
      {
        id: 'respiro', x: 10, y: 4, prioridade: 0, solido: true, alcance: true,
        async rodar(j) {
          const h = j.heroi;
          if (j.flags.grito) return respiroDepoisDoGrito(j);
          if (j.flags.tentouGrade) { await j.fala('Droga! Não consigo quebrar a grade.'); return; }
          await falas(j, ['Uma entrada de ar.', 'Um cheiro estranho vem daqui.', 'Um cheiro de carne podre.', 'O que será que tem lá?',
            'A grade está um pouco enferrujada,\ntalvez eu possa quebrá-la.']);
          await forcarGrade(j);
          await j.fala('O único modo de eu sair é por aqui.');
          await quadros(20);
          await j.fala('Isso é um pesadelo.');
          await j.fala('Não aguento mais.');
          await forcarGrade(j);
          await j.fala('Droga! Não consigo quebrar a grade.');
          j.flags.tentouGrade = true;
          // (ritmo e passos conferidos com o trailer, 1:08–1:32)
          await h.andar('baixo', j, 2);
          await quadros(120);
          await h.andar('esquerda', j, 1);
          await quadros(40); h.virar('cima'); await quadros(60); h.virar('baixo');
          await quadros(150);
          await j.fala('Quando eu abrir os olhos, vou ver que isso\nnão passava de um pesadelo.');
          await j.apagar(40); await quadros(50); await j.acender(40);
          await quadros(290);
          h.virar('esquerda'); await quadros(60); h.virar('direita'); await quadros(60); h.virar('baixo'); await quadros(10);
          await j.fala('Isso é real.');
          await h.andar('direita', j, 1);
          await j.fala('O que está acontecendo?');
          await h.andar('esquerda', j, 2);
          await j.fala('Droga! Isso tudo é real.');
          h.virar('baixo');
          await falas(j, ['Não estou em um sonho.', 'Deus, por favor, me tire daqui.', 'Por favor!']);
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
        async antes(j) { if (!j.flags.bronzeUsada) { som.trancada(); await j.fala('A porta está trancada.'); return false; } },
      }),
      trancada(14, 5),
      // vão de porta do banheiro
      saida(6, 5, 'banheiro', 7, 9, 'cima', { parede: true }),
      // saídas de baixo
      seta(6, 9), saida(6, 9, 'quarto_caixa', 7, 6, 'baixo'),
      seta(14, 9), saida(14, 9, 'quarto_rachadura', 7, 9, 'cima', {
        async antes(j) { if (!j.flags.bronzeUsada) { som.trancada(); await j.fala('A porta está trancada.'); return false; } },
      }),
      seta(21, 9), trancada(21, 10),
      seta(41, 10),
      {
        id: 'porta14', x: 41, y: 11, gatilho: 'toque', prioridade: 1, solido: true,
        async rodar(j) {
          if (j.flags.porta14) { som.porta(); await j.transferir('sala14', 7, 5, 'baixo'); return; }
          som.trancada();
          await j.fala('A porta está trancada.');
          await j.fala(`Um aviso na porta:\n${V}"Essa porta tem que estar sempre trancada."`);
        },
        async usar(j, item) {
          if (item !== 'chave14') return false;
          await j.fala('Esta porta está trancada. Deve ter algo\nde alguma importância aqui dentro.');
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
            await j.fala('Para abrir esta caixa, é preciso um código.', 'baixo');
            const s = await j.digitarNome(12);
            if (s.trim().toLowerCase() !== 'perdido') { som.erro(); await j.fala('Não deu certo.', 'baixo'); return; }
            j.flags.caixa1 = true;
            await j.fala('Deu certo.', 'baixo');
          }
          const n = await j.numero('Tem mais um código. Agora é com números.', 4, 0, 'baixo');
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
          await j.fala('Um armário trancado.');
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
          await j.fala(`${V}Chave de armário${B} adicionada.`, 'baixo');
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
      await j.fala('Ei, tem alguém aí?');
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
          await j.fala('Mas... o espelho parece estar limpo.');
          await j.fala('Mas o que tem de errado?');
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
            const n = await j.numero('Esta porta está trancada com um código.', 4, 1320, 'meio');
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
          await j.fala(`Há um aviso na porta:\n${V}"Não entre aqui, por favor!"`);
          if (!j.flags.portaoCanos) {
            // a porta é trancada por água: um painel de canos do lado (puzzleCanos)
            som.trancada();
            await j.fala('A porta não abre. Do lado tem um painel de\ncanos, com um registro em cima.');
            const m = await j.escolha('Mexer nos canos?', ['Sim', '\\c[2]Não']);
            if (m !== 0) return;
            await j.apagar(15);
            const ok = await puzzleCanos(j);
            await j.acender(15);
            if (!ok) return;
            j.flags.portaoCanos = true;
            await j.fala('A água desceu pelos canos... e alguma coisa\nse soltou do outro lado da porta.');
          }
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
      await j.fala('O que foi isso?');
      j.heroi.virar('direita');
      await quadros(20);
      await j.fala('Droga, a porta está trancada.');
      await j.fala('Ei, quem é você?');
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
          som.trancada(); await j.fala('Droga, a porta está trancada.');
        },
        async usar(j, item) {
          if (item !== 'bronze') return false;
          som.destrancar();
          await j.fala('A porta abriu.');
          j.flags.bronzeUsada = true;
          const s = await j.escolha('Deseja descartar a chave?', ['Sim', '\\c[2]Não'], 'meio');
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
      await j.fala('Esse lugar está cheio de armadilhas.');
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
    desenharChao: desenharPlacas,
    eventos: [
      seta(15, 7, 'direita'), saida(15, 7, 'celas', 3, 7, 'direita', { som: false }),
      {
        x: 8, y: 2, prioridade: 1, solido: true,
        async rodar(j) {
          if (j.flags.bronze) { await j.fala('Não tem mais nada aqui.'); return; }
          j.flags.bronze = true;
          await j.ganhar('bronze');
          await j.fala('Talvez essa chave sirva para abrir a porta no\nfim do corredor.');
          await j.fala('Por que alguém está fazendo isso?');
          await j.fala('É algum tipo de teste para dificultar a saída\ndesse lugar?');
          await j.fala('Pesadelo ou realidade, eu tenho que sair daqui.');
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
          await j.fala(`Tem algo escrito:\n${V}"O enigma já está resolvido, agora só\nfalta imitar as outras peças."`);
          if (!j.flags.viuTabuleiro) {
            j.flags.viuTabuleiro = true;
            await j.fala('Algumas peças já brilham em vermelho... e tem\numa linha no meio do tabuleiro, como um espelho.');
          }
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
      await falas(j, ['Estou com muita dor de cabeça.', 'Vou parar um pouco.', 'Não sei como estou aguentando.',
        'Esse lugar passa uma energia negativa.', 'Parece que outras pessoas estiveram\naqui antes de mim.', 'E elas sentiam medo.',
        'Como vou saber se isso tudo é real? Pode ser\ntudo um simples pesadelo.', 'A libertação seria suicídio?', 'Mas...',
        'Não tenho coragem.', 'Eu creio que estar aqui tem algum\nsentido.', 'Vou seguir até o fim.']);
      await j.apagar(40);
      await j.narrar('Após caminhar por esse lugar em busca de uma\nforma de sair, encontro algo que eu não poderia\nimaginar.', 300, 170);
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
          await falas(j, ['Um urso de pelúcia em um lugar como\nesse?', 'Será que há alguma criança por aqui?',
            'Tem um buraco na barriga do urso,\num corte de faca.', 'Espere!', 'Tem um bilhete aqui.']);
          await falas(j, [`${V}Meu querido papai.`, `${V}Eu estou rezando por você.`, `${V}Mas eu acho que não vai resolver.`,
            `${V}Eles, os homens do mal, estão atrás de\nvocê.`, `${V}Eu tenho um amigo.`, `${V}Todos falam que é minha imaginação.`,
            `${V}Porque ele não existe.`, `${V}Ele fica na janela do meu quarto, me\nolhando.`, `${V}E ele diz coisas ruins sobre você.`,
            `${V}Desde que você desapareceu, só tenho\na companhia dele.`, `${V}Hoje fui visitar seu túmulo.`,
            `${V}Eu deixei um presente para você.`, `${V}Um ursinho de pelúcia.`]);
          await quadros(30);
          await j.fala('Parece que eu já vi esse urso de pelúcia\nem algum lugar.');
          await j.apagar(50);
          j.flags.urso = true;
          som.susto();
          await quadros(60);
          await j.acender(50);
          await j.fala('Mas o que aconteceu?\nOnde está o urso de pelúcia?');
        },
      },
    ],
  },

  corredor_final: {
    async aoEntrar(j) { j.paralelos.push(apagoes(j)); },
    eventos: [
      seta(8, 53),
      {
        // a chave fica logo antes da porta: no trailer ele a pega em (8,6) e destranca 2 s depois
        x: 8, y: 6, prioridade: 0, brilha: true, grafico: { tile: 'xA', x: 7, y: 0 }, cond: () => !estado().chaveFim,
        async rodar(j) { j.flags.chaveFim = true; await j.fala('Uma chave.'); await j.ganhar('chave'); },
      },
      {
        x: 8, y: 4, gatilho: 'toque', prioridade: 1, solido: true,
        async rodar(j) {
          if (j.flags.portaFinal) { som.porta(); await j.transferir('sala_piano', 14, 8, 'esquerda'); return; }
          som.trancada(); await j.fala('A porta está trancada.');
        },
        async usar(j, item) {
          if (item !== 'chave') return false;
          som.destrancar();
          await j.fala('A porta foi destrancada.');
          j.perder('chave');
          await j.fala('A chave quebrou ao abrir a porta.');
          // (aqui acabava o trailer; o jogo segue pelas salas das capturas de 2014 até o fim)
          j.flags.portaFinal = true;
          som.porta();
          await j.transferir('sala_piano', 14, 8, 'esquerda');
          return true;
        },
      },
    ],
  },

  // ======================================================================
  // O fim do jogo (capturas 14, 15 e 21 de 2014; o roteiro destas salas é novo)
  sala_piano: {
    async aoEntrar(j) {
      if (j.flags.salaPiano) return;
      j.flags.salaPiano = true;
      await quadros(30);
      await j.fala('Um piano... aqui embaixo?');
      await j.fala('Essa sala é diferente das outras. Parece que\nalguém cuidava dela.');
    },
    eventos: [
      // ▷ em (15,8) já está no fundo (captura 14): volta para o corredor final
      { ...saida(16, 8, 'corredor_final', 8, 5, 'baixo', { parede: true }) },
      trancada(4, 7),
      fala(4, 6, ['Uma porta velha, pintada de branco.']),
      {
        // a carta, no chão perto da parede (o envelope da captura 14)
        x: 12, y: 6, prioridade: 0, brilha: true, grafico: { tile: 'xA', x: 7, y: 0 }, cond: () => !estado().carta,
        async rodar(j) {
          j.flags.carta = true;
          await j.fala('Um envelope. Tem uma carta dentro.');
          await falas(j, [`${V}Meu amor,`, `${V}os médicos dizem que não há mais nada\na fazer.`, `${V}Não fique triste. Prometa que vai cuidar\nda nossa filha.`,
            `${V}E toque para ela a nossa música, para ela\ndormir, como você tocava para mim.`, `${V}Eu sempre vou estar com vocês.`]);
          await quadros(30);
          await j.fala('É a letra dela...');
          await j.fala('Como essa carta veio parar aqui?');
        },
      },
      // de frente para o teclado (9,8): chegar ali abre o teclado; OK no piano também
      { x: 9, y: 8, gatilho: 'toque', prioridade: 0, cond: () => !estado().piano, async rodar(j) { await verPiano(j); } },
      ...[8, 9, 10].map((x) => ({ x, y: 7, prioridade: 1, solido: true, async rodar(j) { await verPiano(j); } })),
      // a caixinha de música pequenininha, embaixo à esquerda
      { x: 5, y: 10, prioridade: 1, solido: true, async rodar(j) { await caixinhaMusica(j); } },
      fala(6, 6, ['Uma caixa velha. Está vazia.']),
      ...[11, 12, 13].map((x) => fala(x, 10, ['Um banco comprido, de madeira.', 'Alguém se sentava aqui para ouvir o piano?'])),
    ],
  },

  // a sala da guilhotina só aparece na cena do fim (finalGuilhotina)
  guilhotina: { eventos: [] },
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
    await j.fala('O grito veio daqui.');
    await quadros(320);      // no trailer ele fica olhando a grade uns 5 s antes de ver a rachadura (1:50–1:56)
    await falas(j, ['Uma rachadura no cano de ferro.', 'Mas... como eu não tinha visto isso antes?', 'Tenho que sair daqui.']);
    j.flags.viuRachadura = true;
  }
  const s = await j.escolha('<> Quebrar a grade?', ['Sim', '\\c[2]Não']);
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
  await j.fala('Eu posso usar o cano para forçar\na grade e quebrá-la.');
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
  await j.fala(`${V}Ei, saia daqui.`);
  h.virar('cima'); await quadros(20);
  await j.fala('O que foi isso?');
  await j.fala(`${V}O que você está fazendo? Saia\ndaqui!`);
  await quadros(30);
  som.batida(); j.tremor = 8; await quadros(50); som.batida(); j.tremor = 8; await quadros(50); som.batida(); j.tremor = 8; await quadros(30);
  await j.fala('Alguém está tentando entrar aqui.');
  await j.fala('Sinto que tem algo de errado. Tenho que me\nesconder.');
  j.flags.monstro = true;
  // esconde-se atrás da cadeira, junto da prateleira: o caminho e o ritmo do trailer (4:06–4:57)
  await rota(j, h, [[6, h.y], [6, 10], [8, 10], [8, 8], [10, 8], [10, 7]]);
  h.virar('cima');
  await quadros(10);
  await j.apagar(30);
  h.visivel = false;
  j.amb = 0.05; j.brilho = 0.35; j.alvoBrilho = 0.35;
  await quadros(60);
  // o monstro entra e anda devagar pela sala no escuro (quase não se vê nada, uns 48 s)
  som.porta();
  const ev = new Evento({ x: 7, y: 5, grafico: SOMBRA, dir: 'baixo', id: 'monstro', vel: 2, pesado: true });
  ev.opac = 0.35; j.eventos.push(ev);
  som.tensao(1);
  for (const [x, y] of [[7, 7], [5, 7], [5, 8], [8, 8], [8, 10], [7, 10], [7, 5]]) {
    while (ev.x !== x || ev.y !== y) {
      const d = ev.x !== x ? (ev.x < x ? 'direita' : 'esquerda') : (ev.y < y ? 'baixo' : 'cima');
      await ev.andar(d, j, 1); await quadros(60);   // os passos (pesados) saem sozinhos
    }
  }
  som.porta();
  j.eventos = j.eventos.filter((e) => e !== ev);
  som.tensao(0);
  await quadros(1030);
  await j.fadeAte(1, 40);
  j.amb = j.def.amb;
  h.visivel = true;
  // olha em volta e sai do esconderijo
  h.virar('baixo'); await quadros(60); h.virar('direita'); await quadros(60); h.virar('esquerda'); await quadros(80);
  await rota(j, h, [[7, 7]]);
  h.virar('cima');
  await quadros(300);
  await falas(j, ['Mas o que era aquilo?', 'Não pude ver.', 'Um monstro... ele estava atrás de mim.', 'Eu sei o que ele queria, estava me\ncaçando.',
    'É melhor eu tomar cuidado.', 'Sorte que ele não me viu.', 'Isso está parecendo um pesadelo do qual\nnão consigo acordar.']);
  await rota(j, h, [[7, 5]]);
  await j.apagar(40);
  await flashback(j);
}

async function flashback(j) {
  await flashbackMenino(j);
  await flashbackHospital(j);
}

// Cenas que o seletor de fases (dev.js, só em localhost) roda direto, sem passar pelo caminho.
export const CENAS_DEV = {
  flashback: async (j) => { j.brilho = 0; j.alvoBrilho = 0; await flashback(j); },
  hospital: (j) => flashbackHospital(j),
  fim: (j) => finalGuilhotina(j),
  // telas soltas, para conferir o layout em cada tamanho de tela
  teclado: (j) => tecladoPiano(j),
  canos: (j) => puzzleCanos(j),
  tabuleiro: (j) => tabuleiro(j),
  telaFim: (j) => telaFim(j),
};

async function flashbackMenino(j) {
  // quarto da filha (o mapa continua se chamando quarto_menino)
  j.carregar('quarto_menino', 12, 11, 'cima');
  j.heroi.visivel = false;
  const kid = j.evento('kid'), pai = j.evento('pai');
  await j.acender(40);
  await quadros(200);
  pai.visivel = true;
  som.porta();
  await pai.andar('cima', j, 3);
  await j.fala(`${V}Ei, você está bem?`);
  kid.virar('baixo');
  await j.fala('Pai, eu vi algo escondido nas sombras.');
  await j.fala(`${V}Você de novo com essa história?`);
  await quadros(20);
  await j.fala(`${V}Deixe-me ver.`);
  await rota(j, pai, [[9, 8], [9, 7], [7, 7]]);
  pai.virar('cima'); await quadros(180); pai.virar('esquerda'); await quadros(200); pai.virar('direita'); await quadros(210);
  await j.fala(`${V}Não tem nada aqui, filha.`);
  await rota(j, pai, [[10, 7]]);
  await j.fala(`${V}Não tem nada aqui, não fique imaginando\ncoisas.`);
  await j.fala(`${V}Isso é fruto de sua imaginação.`);
  await j.fala('Mas, pai...');
  await j.fala(`${V}Não tenha medo de nada, eu vou sempre\nproteger você.`);
  await quadros(380);
  await j.fala(`${V}Durma tranquilo.`);
  // o pai sai pela porta de baixo (12,11)
  await rota(j, pai, [[11, 7], [11, 10], [12, 10], [12, 11]]);
  som.porta();
  pai.visivel = false;
  await quadros(290);
  await rota(j, kid, [[9, 7], [9, 6]]);
  await j.fala('Isso está acontecendo cada vez mais.');
  await j.fala('Eu sei o que eu vi.');
  // vai até a janela
  await rota(j, kid, [[7, 6], [7, 5]]);
  kid.virar('cima');
  await j.fala('Ele aparece nessa janela sempre me olhando.');
  await j.fala('O que ele quer de mim?');
  await j.fala('As coisas estão fugindo do controle.');
  await j.fala('Será que eu fui a escolhida por ele?');
  j.flash = 0.9; som.trovao();
  await quadros(400);
  await j.apagar(40);
  await quadros(280);
  // tela preta
  j.mapa = null;
  j.brilho = 1; j.alvoBrilho = 1;
  await j.fala('Só eu posso vê-los.');
  await quadros(40);
  await j.fala('Eu tinha uma família.');
  await quadros(30);
}

async function flashbackHospital(j) {
  j.brilho = 0; j.alvoBrilho = 0;
  j.carregar('hospital', 10, 9, 'cima');
  const med = j.evento('medico');
  await j.acender(40);
  await med.andar('baixo', j, 3);
  await med.andar('direita', j, 3);
  med.virar('baixo');
  await quadros(120);
  await j.fala('Médico.');
  await j.fala('Me dê notícias da minha esposa.');
  await j.fala(`${V}Vou lhe dar um conselho, meu amigo: volte\npara casa, tome um bom banho e durma. Você\ntem uma filha para cuidar.`);
  await j.fala('Eu não posso deixá-la aqui do jeito\nque está.');
  await j.fala(`${V}Nós estamos cuidando, tenha calma.`);
  await j.fala(`${V}Além do mais, você não pode ajudar\nem nada.`);
  await j.fala('Pelo menos me diga o que ela tem.');
  await j.fala(`${V}Está bem, eu vou falar.`);
  await j.fala(`${V}Sua mulher tem uma doença muito grave,\nque não tem cura.`);
  await j.fala(`${V}Nós aqui do hospital tentamos de\ntudo, mas...`);
  await j.fala(`${V}Infelizmente, os dias dela estão\ncontados.`);
  await j.fala('Não acredito.');
  await j.fala(`${V}Acalme-se.`);
  await quadros(200);
  await j.fala(`${V}Você é católico?`);
  await j.fala('Sou, sim, mas não sou praticante.');
  await j.fala(`${V}A única coisa que digo a você é: reze\nmuito, porque, para salvar sua mulher, só\num milagre.`);
  await j.fala('Isso não pode estar acontecendo. Ela\nnão pode nos deixar assim.');
  await j.fala('Nós temos uma bela filha, eu ia me casar\ncom ela, e agora isso acontece.');
  await j.fala('Não estou acreditando.');
  await j.fala(`${V}Você, mais do que nunca, tem que ter fé.`);
  await quadros(30);
  await j.apagar(50);
  j.flags.flashback = true;
  j.heroi.grafico = HEROI;
  await quadros(30);
  await j.transferir('corredor', 41, 10, 'cima', { fade: false });
  await j.acender(40);
}

function relampagos(j) {
  let n = 200, trovao = 0;
  return () => {
    // o trovão chega ~0,4 s depois do clarão (contado em quadros: igual na gravação de vídeo)
    if (trovao > 0 && --trovao === 0) som.trovao();
    if (--n > 0) return;
    n = 360 + Math.floor(Math.random() * 400);
    j.flash = 0.35 + Math.random() * 0.3;
    trovao = 24;
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
  await quadros(220);
  // vai até o meio da sala, de frente para as grades (12:02 do trailer)
  await rota(j, h, [[8, h.y], [8, 7]]);
  h.virar('cima');
  await j.fala(`${V}Para onde você vai?`);
  await j.fala('Ei, quem é você?');
  await j.fala('Você me prendeu aqui nesse lugar?\nO que você quer de mim?');
  await quadros(30);
  await j.fala('Você está preso aqui também?');
  await j.fala('Por favor, me ajude a sair desse lugar.');
  await j.fala('Estou tentando fugir daqui, estou indo\npelo corredor.');
  await j.fala('Encontrei uma chave dentro de uma caixa,\ntalvez ela sirva.');
  await j.fala('Alguém me trancou, eu não pude fazer nada.\nEspere... Foi você que trancou a porta?');
  await quadros(170);
  await j.fala(`${V}O quê? Corredor?`);
  som.tensao(0.6);
  await j.fala(`${V}Não! Não vá por lá! Não vá por lá!`);
  await j.fala(`${V}O mal em forma física está esperando você no\nfinal do corredor!`);
  await j.fala(`${V}Ele está lá!`);
  await j.fala(`${V}É algo além do que você possa imaginar!\nVocê não pode fazer isso!`);
  await j.fala(`${V}Você encontrará algo pior que o sofrimento!`);
  await j.fala('Mas... não tem para onde eu ir!');
  await j.fala('O corredor é o único caminho!');
  await quadros(60);
  await j.fala(`${V}Eu também achei isso.`);
  await j.fala(`${V}Todas as vezes.`);
  await j.fala('Você está falando do monstro?');
  await quadros(40);
  await j.fala('Ei? Você está aí?');
  await quadros(210);
  som.tensao(0);
  await j.fala('Acho que ele se foi...');
}

// ---------------- armadilhas ----------------
// Armadilhas escondidas (x). O trailer (10:40–11:33) mostra o caminho em zigue-zague que o jogador
// fez sem cair nenhuma vez; o resto do chão é armadilha. Os rabiscos no chão ficam todos em cima de
// armadilhas: são a pista do caminho.
const SALA_ARMADILHAS = [
  '#################',
  '#################',
  '#################',
  '#x.#xx#x.x#x.xx##',
  '#x..xxx..xxx.xx##',
  '#x..xx...xxx.x#x#',
  '#x..x..xxx#..xxx#',
  '#..#..xx#...x...#',
  '#..x.xxx#.xxx..##',
  '#....xxxx.....x##',
  '#xxx......xxxx###',
  '#xx#xxxxxxxx#xx##',
  '#################',
];
function ehArmadilha(x, y) { return SALA_ARMADILHAS[y]?.[x] === 'x'; }
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
  // na primeira queda, o herói entende a regra (a dica visual são as placas)
  if (!j.flags.dicaPlacas) {
    j.flags.dicaPlacas = true;
    await j.fala('Alguma coisa afundou no chão quando eu pisei...\nPreciso olhar melhor onde piso.');
  }
}

// Dica visual das armadilhas, sutil de propósito: cada uma é uma placa de pressão no assoalho.
// Fase 0 (antes da luz): só a junta da placa, quase invisível; perto da lanterna, quem reparar vê.
// Fase 1 (depois da luz): nas quatro casas vizinhas do herói, de vez em quando a borda de metal da
// placa pega um lampejo da lanterna (curto, e cada placa no seu tempo). Nada na diagonal nem longe.
function desenharPlacas(j, c, cx, cy, fase) {
  const h = j.heroi, hx = h.rx + 16, hy = h.ry + 16;
  for (let y = 0; y < SALA_ARMADILHAS.length; y++) {
    for (let x = 0; x < SALA_ARMADILHAS[y].length; x++) {
      if (SALA_ARMADILHAS[y][x] !== 'x') continue;
      const px = x * 32 - cx, py = y * 32 - cy;
      if (fase === 0) {
        c.strokeStyle = 'rgba(0,0,0,0.26)'; c.lineWidth = 1; c.strokeRect(px + 4.5, py + 4.5, 23, 23);
        continue;
      }
      const d = Math.hypot(x * 32 + 16 - hx, y * 32 + 16 - hy) / 32;
      const perto = Math.max(0, Math.min(1, (1.25 - d) / 0.25));
      if (!perto) continue;
      // lampejo intermitente: sobe e some em ~1/3 de segundo, a cada ~3 s
      const lampejo = Math.pow(Math.max(0, Math.sin(j.t / 28 + x * 1.7 + y * 2.3)), 8);
      const a = 0.34 * perto * lampejo;
      if (a < 0.02) continue;
      const g = c.createLinearGradient(px + 6, 0, px + 22, 0);
      g.addColorStop(0, 'rgba(220,220,220,0)');
      g.addColorStop(0.5, `rgba(220,220,220,${a})`);
      g.addColorStop(1, 'rgba(220,220,220,0)');
      c.fillStyle = g; c.fillRect(px + 6, py + 4, 16, 1);
      c.fillStyle = `rgba(230,230,230,${a * 0.7})`; c.fillRect(px + 13, py + 5, 1, 1);
    }
  }
}

// ---------------- o tabuleiro do enigma ----------------
// Grade 6x6 de formas com uma linha de espelho no meio (entre as colunas 2 e 3). As peças vermelhas
// vêm acesas e travadas: são o "enigma já resolvido". O jogador só tem que "imitar" cada uma do outro
// lado do espelho: acender a forma igual na casa espelhada (mesma linha, coluna 5 - c). Formas iguais
// perto das certas (e pares espelhados que não são vermelhos) estão lá para confundir.
const FORMAS = [
  ['q', 't', '', 't', 't', ''],
  ['', 'h', 'q', '', 'h', 'q'],
  ['q', '', 't', 'p', '', 'q'],
  ['h', '', 'p', 'p', 't', ''],
  ['t', 'p', '', '', 'q', 't'],
  ['h', '', 'q', 't', '', 'h'],
];
// peças vermelhas, fixas (linha,coluna)
const FIXAS = new Set(['0,1', '2,5', '3,2', '5,0']);
// a resposta é o espelho de cada peça vermelha (a forma do outro lado é sempre a mesma)
const SOLUCAO = new Set([...FIXAS].map((k) => { const [y, x] = k.split(',').map(Number); return `${y},${5 - x}`; }));

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
    const acesas = new Set();      // só as do jogador; as vermelhas ficam à parte
    let cx = 1, cy = 1, t = 0, errou = 0, travada = null;
    // casas de 32 px a partir de (192,128); moldura de ripas de 1 tile em volta (captura 16)
    const X0 = 192, Y0 = 128, C = 32;
    j.brilho = 1; j.alvoBrilho = 1;
    j.overlay = {
      regiao: [150, 88, 276, 296],   // a moldura (160..416) e a dica embaixo (o resto do 544x416 é preto)
      atualizar() {
        t++;
        if (errou) errou--;
        if (travada && --travada.t <= 0) travada = null;
        if (entrada.repetiu('direita')) { cx = (cx + 1) % 6; som.cursor(); }
        if (entrada.repetiu('esquerda')) { cx = (cx + 5) % 6; som.cursor(); }
        if (entrada.repetiu('baixo')) { cy = (cy + 1) % 6; som.cursor(); }
        if (entrada.repetiu('cima')) { cy = (cy + 5) % 6; som.cursor(); }
        if (entrada.disparou('ok')) {
          const k = `${cy},${cx}`;
          if (!FORMAS[cy][cx]) { som.erro(); return; }
          // as vermelhas não mudam de jeito nenhum: só um tranco de recusa
          if (FIXAS.has(k)) { som.erro(); travada = { k, t: 16 }; return; }
          if (acesas.has(k)) acesas.delete(k); else acesas.add(k);
          som.ok();
          if (acesas.size === SOLUCAO.size && [...SOLUCAO].every((s) => acesas.has(s))) {
            j.overlay = null; som.destrancar(); fim(true);
          } else if (acesas.size === SOLUCAO.size) {
            // tantas acesas quanto vermelhas, mas o reflexo não bate: o tabuleiro estremece
            som.erro(); errou = 24;
          }
        }
        if (entrada.disparou('cancelar')) { j.overlay = null; fim(false); }
      },
      // (desenhado na caixa de desenho 544x416; o jogo já pintou a tela de preto)
      desenhar(g) {
        const sx = errou ? ((errou * 7) % 5) - 2 : 0;
        g.save(); g.translate(sx, 0);
        // moldura de ripas verticais (1 tile) em volta das 6x6 casas
        const fx = X0 - 32, fy = Y0 - 32, fw = C * 6 + 64, fh = C * 6 + 64;
        g.fillStyle = '#161616'; g.fillRect(fx, fy, fw, fh);
        for (let i = 0; i < fw; i += 6) {
          g.fillStyle = '#272727'; g.fillRect(fx + i, fy, 1, fh);
          g.fillStyle = '#1d1d1d'; g.fillRect(fx + i + 3, fy, 1, fh);
        }
        g.fillStyle = '#000'; g.fillRect(X0 - 4, Y0 - 4, C * 6 + 8, C * 6 + 8);
        // a linha do espelho: um vidro fino no meio, com um brilho que corre devagar
        const mx = X0 + C * 3;
        g.fillStyle = '#2c2c2c'; g.fillRect(mx - 1, Y0 - 4, 2, C * 6 + 8);
        const by = Y0 - 4 + (((t * 0.6) % (C * 6 + 40)) - 20);
        const gr = g.createLinearGradient(0, by - 20, 0, by + 20);
        gr.addColorStop(0, 'rgba(200,200,200,0)'); gr.addColorStop(0.5, 'rgba(200,200,200,0.35)'); gr.addColorStop(1, 'rgba(200,200,200,0)');
        g.fillStyle = gr; g.fillRect(mx - 1, Math.max(Y0 - 4, by - 20), 2, 40);
        for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
          const f = FORMAS[y][x], k = `${y},${x}`;
          let px = X0 + x * C + C / 2;
          const py = Y0 + y * C + C / 2;
          if (f) {
            if (FIXAS.has(k)) {
              if (travada?.k === k) px += ((travada.t * 5) % 3) - 1;
              // luz vermelha fixa, pulsando de leve
              const p = 0.75 + 0.25 * Math.sin(t / 30 + x + y);
              const halo = g.createRadialGradient(px, py, 0, px, py, 16);
              halo.addColorStop(0, `rgba(170,30,30,${0.35 * p})`); halo.addColorStop(1, 'rgba(170,30,30,0)');
              g.fillStyle = halo; g.fillRect(px - 16, py - 16, 32, 32);
              desenharForma(g, f, px, py, 11, `rgba(220,60,60,${0.8 + 0.2 * p})`, 2.2);
            } else {
              const on = acesas.has(k);
              desenharForma(g, f, px, py, 11, on ? '#e0e0e0' : '#3c3c3c', on ? 2 : 1.4);
            }
          }
          if (x === cx && y === cy) cursor(g, px - 15, py - 15, 30, 30, t);
        }
        g.restore();
        const dica = document.body.classList.contains('toque')
          ? 'Direcional: mover · OK: acender/apagar · Esc: sair'
          : 'Setas: mover · Enter: acender/apagar · Esc: sair';
        textoDica(g, dica, X0 + C * 3, Y0 + C * 6 + 48);   // no centro do tabuleiro (que fica em 160..416)
      },
    };
  });
}

// ---------------- o fim do jogo: a caixinha, o piano e a guilhotina ----------------
// A melodia tem 8 notas. Cada traço do teclado (captura 15) escolhe entre duas notas daquela
// posição: em pé = a mais aguda, deitado = a mais grave. A caixinha de música toca a melodia
// certa; o jogador ouve, volta ao piano, acerta os traços e toca (▶).
const NOTA = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0 };
const PARES = [['E4', 'G4'], ['D4', 'F4'], ['C4', 'E4'], ['D4', 'G4'], ['E4', 'A4'], ['D4', 'F4'], ['C4', 'E4'], ['C4', 'E4']];
const ALVO = [true, false, true, true, false, false, true, false];      // em pé? → sol ré mi sol mi ré mi dó
const INICIAL = [false, true, true, false, true, true, true, true];     // como na captura 15: – | | – | | | |
const notaDe = (i, emPe) => NOTA[PARES[i][emPe ? 1 : 0]];
const QUADROS_NOTA = 30, QUADROS_ULTIMA = 70;

async function tocarMelodia(j, timbre, emPe) {
  for (let i = 0; i < 8; i++) {
    som[timbre](notaDe(i, emPe(i)));
    await quadros(i === 7 ? QUADROS_ULTIMA : QUADROS_NOTA);
  }
}

// a caixinha de música pequenininha, no canto de baixo à esquerda (5,10)
async function caixinhaMusica(j) {
  if (!j.flags.caixinha) {
    await j.fala('Uma caixinha de música, pequenininha.');
    await j.fala('Tem uma manivela do lado.');
  }
  const s = await j.escolha('Girar a manivela?', ['Sim', '\\c[2]Não']);
  if (s !== 0) return;
  som.ambiente(0.35);
  await quadros(20);
  await tocarMelodia(j, 'caixinha', (i) => ALVO[i]);
  som.ambiente(1);
  if (!j.flags.caixinha) {
    j.flags.caixinha = true;
    await j.fala('Essa música... eu conheço essa música.');
    await j.fala('Será que eu consigo tocar ela no piano?');
  }
}

// o piano: só de frente para o teclado, em (9,8) olhando para cima
async function verPiano(j) {
  const h = j.heroi;
  if (j.flags.piano) { await j.fala('O piano está em silêncio.'); return; }
  if (h.x !== 9 || h.y !== 8) { await j.fala('Preciso ficar de frente para o teclado.'); return; }
  h.virar('cima');
  await j.apagar(15);
  const ok = await tecladoPiano(j);
  await j.acender(15);
  if (ok) await desfechoPiano(j);
}

// O teclado (captura 15): oito traços, deitados ou em pé, e embaixo "Sair" e o ▶ que toca.
// A posição dos traços fica guardada (vars.teclas).
function tecladoPiano(j) {
  return new Promise((fim) => {
    if (j.vars.teclas === undefined) j.vars.teclas = INICIAL.reduce((m, v, i) => m | (v ? 1 << i : 0), 0);
    const pe = (i) => !!(j.vars.teclas & (1 << i));
    let sel = 0, t = 0, mexe = new Array(8).fill(0), tocando = null;
    // medidas da captura 15 levadas ao 544x416: moldura (22,179)-(524,269), traços a cada ~64 px.
    // No celular em pé, a mesma moldura em 2 fileiras de 4 (senão os traços ficam minúsculos).
    const L = () => (TELA.h > TELA.w
      ? { PX: 144, PY: 160, PW: 256, PH: 158, x: (i) => 176 + (i % 4) * 64, y: (i) => 194 + Math.floor(i / 4) * 54, by: 272, duas: true }
      : { PX: 22, PY: 179, PW: 502, PH: 90, x: (i) => 46 + i * 64.1, y: () => 204, by: 220, duas: false });
    const SAIR = 8, PLAY = 9;
    j.brilho = 1; j.alvoBrilho = 1;
    const sair = (ok) => { j.overlay = null; fim(ok); };
    j.overlay = {
      regiao: () => { const l = L(); return [l.PX - 8, l.PY - 8, l.PW + 16, l.PH + 16]; },
      atualizar() {
        t++;
        mexe = mexe.map((v) => Math.max(0, v - 1));
        if (tocando) {
          // toca nota por nota, acendendo o traço da vez
          if (--tocando.espera > 0) return;
          tocando.i++;
          if (tocando.i >= 8) {
            const certo = ALVO.every((v, i) => pe(i) === v);
            tocando = null;
            // marca já aqui (e não no desfecho, 15 quadros depois): a presença para na mesma hora
            if (certo) { j.flags.piano = true; sair(true); }
            return;
          }
          som.piano(notaDe(tocando.i, pe(tocando.i)));
          tocando.espera = tocando.i === 7 ? QUADROS_ULTIMA : QUADROS_NOTA;
          return;
        }
        const duas = L().duas;
        if (sel < 8) {
          if (entrada.repetiu('direita')) { sel = (sel + 1) % 8; som.cursor(); }
          if (entrada.repetiu('esquerda')) { sel = (sel + 7) % 8; som.cursor(); }
          if (entrada.disparou('baixo')) { sel = duas && sel < 4 ? sel + 4 : PLAY; som.cursor(); }
          else if (entrada.disparou('cima') && duas && sel >= 4) { sel -= 4; som.cursor(); }
        } else {
          if (entrada.disparou('direita') || entrada.disparou('esquerda')) { sel = sel === SAIR ? PLAY : SAIR; som.cursor(); }
          if (entrada.disparou('cima')) { sel = duas ? 4 : 0; som.cursor(); }
        }
        if (entrada.disparou('ok')) {
          if (sel === SAIR) { som.cancelar(); sair(false); return; }
          if (sel === PLAY) { tocando = { i: -1, espera: 12 }; return; }
          j.vars.teclas ^= 1 << sel;
          mexe[sel] = 10;
          som.piano(notaDe(sel, pe(sel)), { vol: 0.16 });   // ao mexer, ouve a nota nova daquele traço
        }
        if (entrada.disparou('cancelar')) sair(false);
      },
      desenhar(g) {
        // a moldura arredondada clara sobre o preto, como na captura 15
        const l = L();
        g.strokeStyle = '#c8c8c8'; g.lineWidth = 2;
        g.beginPath(); g.roundRect(l.PX, l.PY, l.PW, l.PH, 11); g.stroke();
        for (let i = 0; i < 8; i++) {
          const x = l.x(i), y = l.y(i), d = mexe[i] ? ((mexe[i] * 3) % 3) - 1 : 0;
          const vez = tocando && tocando.i === i;
          if (vez) {
            const gr = g.createRadialGradient(x, y, 0, x, y, 24);
            gr.addColorStop(0, 'rgba(255,255,255,0.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = gr; g.fillRect(x - 24, y - 24, 48, 48);
          }
          g.fillStyle = vez ? '#ffffff' : '#d2d2d2';
          if (pe(i)) g.fillRect(x - 3 + d, y - 12, 5, 25);
          else g.fillRect(x - 12 + d, y - 3, 25, 5);
          if (sel === i && !tocando) cursor(g, x - 17, y - 17, 34, 34, t);
        }
        // "Sair" e o botão ▶ (tocar)
        const bx = 257, by = l.by, bw = 30, bh = 31;
        const fonte = `${Math.max(12, Math.round(pxCaixa(0.72)))}px Arial, Helvetica, sans-serif`;
        g.font = fonte;
        const ws = g.measureText('Sair').width;
        texto(g, 'Sair', bx - 6, by + 9, '#bdbdbd', fonte, 'right');
        g.fillStyle = '#0c0c0c'; g.fillRect(bx, by, bw, bh);
        g.strokeStyle = '#3a3a3a'; g.lineWidth = 1; g.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
        g.fillStyle = tocando ? '#ffffff' : '#d6d6d6';
        g.beginPath(); g.moveTo(bx + 7, by + 6); g.lineTo(bx + 24, by + 15.5); g.lineTo(bx + 7, by + 25); g.closePath(); g.fill();
        if (!tocando && sel === SAIR) cursor(g, bx - 12 - ws, by + 1, ws + 12, bh - 2, t);
        if (!tocando && sel === PLAY) cursor(g, bx - 3, by - 3, bw + 6, bh + 6, t);
      },
    };
  });
}

// a luz da sala pisca (a sala não tem lâmpada: a tela inteira falha)
async function piscarLuz(j, n) {
  som.apagao();
  for (let i = 0; i < n; i++) {
    j.brilho = j.alvoBrilho = Math.random() < 0.55 ? 0.2 + Math.random() * 0.15 : 1;
    await quadros(2 + Math.floor(Math.random() * 6));
  }
  j.brilho = j.alvoBrilho = 1;
}

// tocou a música certa: a luz falha, uma criança grita, ele lembra da promessa
async function desfechoPiano(j) {
  j.flags.piano = true;
  await quadros(40);
  som.tensao(1);
  await piscarLuz(j, 14);
  som.gritoCrianca(); j.tremor = 30;
  await piscarLuz(j, 22);
  await quadros(80);
  await j.fala('Nossa...');
  await j.fala('Eu prometi para ela que ia cuidar da nossa\nfilha.');
  await j.fala('Eu prometi para ela... e eu me lembro.');
  await j.fala('Infelizmente, eu não consegui.');
  await quadros(40);
  await j.fala('Eu não consigo me perdoar.');
  await j.fala('Eu carrego uma culpa imensa no meu coração.');
  await quadros(40);
  // o amigo da janela, do bilhete do urso, é o monstro daqui: e ela ficou com ele
  await j.fala('Aquilo que me caça aqui...');
  await j.fala('É o mesmo que olhava pela janela dela.');
  await j.fala('E eu a deixei sozinha com ele.');
  await quadros(30);
  await j.apagar(70);
  await quadros(40);
  await finalGuilhotina(j);
}

// A cena do fim: a sala da guilhotina; ele sobe até ela e pensa. No escuro, a lâmina desce. E ele
// acorda de novo na cela, como no começo: ele já se matou, e este lugar é o castigo, onde ele vive
// tudo de novo para sempre. Isso fecha a carta ("Bem-vindo ao seu novo lar"), o espelho sem
// reflexo e o túmulo do bilhete da filha.
async function finalGuilhotina(j) {
  j.semSalvar = true;              // daqui até o fim nada salva (o "Continuar" não pode cair no ciclo)
  j.brilho = 0; j.alvoBrilho = 0;
  j.flags.salaGuilhotina = true;
  j.carregar('guilhotina', 7, 10, 'cima');
  const h = j.heroi;
  await quadros(30);
  await j.acender(80);
  await quadros(90);
  h.vel = 3;                       // passo lento
  await rota(j, h, [[7, 7]]);
  h.virar('cima');
  await quadros(120);
  // a frase dele na sala das grades: a voz que respondeu "todas as vezes" era ele mesmo, de outra volta
  await j.fala('O corredor era o único caminho.');
  await quadros(40);
  await j.fala('Eu acho que só existe uma solução.');
  await quadros(60);
  som.silencio(2);
  await j.apagar(120);
  await quadros(70);
  som.guilhotina();                // no escuro: só o som da lâmina
  await quadros(200);
  await cicloCela(j);
  await quadros(60);
  await telaFim(j);
  try { localStorage.removeItem('insonia.save'); } catch { /* */ }
  location.reload();
}

// O ciclo: a cela do começo, com a lâmpada piscando e a carta no chão, e as mesmas primeiras
// falas e o mesmo olhar em volta do despertar (cela.aoEntrar), até a tela apagar de novo.
async function cicloCela(j) {
  j.brilho = 0; j.alvoBrilho = 0;
  j.carregar('cela', 9, 7, 'cima');   // flags.intro já existe: a cela só liga a lâmpada
  const h = j.heroi;
  await quadros(90);
  await j.acender(90);
  await quadros(30);
  await j.fala('Meu Deus, que dor de cabeça.');
  h.virar('esquerda'); await quadros(80); h.virar('direita'); await quadros(80); h.virar('baixo'); await quadros(40);
  await j.fala('Mas que lugar é esse?');
  await j.fala('Eu não me lembro de nada, está tudo\nmuito confuso agora.');
  await quadros(120);
  som.silencio(3);
  await j.apagar(150);
}

// ---------------- o portão dos canos (porta do salão; visual da captura 20) ----------------
// Só a tela: um cursor escolhe o cano e o OK gira (90° no sentido do relógio). A água entra no
// alto e tem que descer até o ralo embaixo passando por todos os canos; aí o portão abre.
// Os canos estão só no caminho (não há cano sobrando): o enigma é achar a posição de cada um.
const CANOS_COLS = 3, CANOS_LINHAS = 5;
const CANOS_CAMINHO = [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2], [3, 2], [3, 1], [3, 0], [4, 0], [4, 1], [4, 2]];   // [linha, coluna]
const CANOS_GIRO_INICIAL = [1, 2, 1, 1, 3, 1, 2, 1, 1, 3, 2];   // quanto cada cano começa fora do lugar
const LADOS = { N: [-1, 0], L: [0, 1], S: [1, 0], O: [0, -1] };
const OPOSTO = { N: 'S', S: 'N', L: 'O', O: 'L' };
// aberturas de cada peça por rotação: reto (2 posições) e curva (4)
const ABERTURAS = { reto: [['N', 'S'], ['L', 'O']], curva: [['N', 'L'], ['L', 'S'], ['S', 'O'], ['O', 'N']] };
function montarCanos() {
  const pecas = new Map();
  const lado = (a, b) => Object.keys(LADOS).find((k) => LADOS[k][0] === b[0] - a[0] && LADOS[k][1] === b[1] - a[1]);
  CANOS_CAMINHO.forEach(([r, c], i) => {
    const ent = i === 0 ? 'N' : lado([r, c], CANOS_CAMINHO[i - 1]);
    const sai = i === CANOS_CAMINHO.length - 1 ? 'S' : lado([r, c], CANOS_CAMINHO[i + 1]);
    const tipo = OPOSTO[ent] === sai ? 'reto' : 'curva';
    const n = ABERTURAS[tipo].length;
    const certo = ABERTURAS[tipo].findIndex((ab) => ab.includes(ent) && ab.includes(sai));
    pecas.set(`${r},${c}`, { tipo, rot: (certo + CANOS_GIRO_INICIAL[i]) % n });
  });
  return pecas;
}
const abre = (p) => ABERTURAS[p.tipo][p.rot];
// segue a água a partir do alto; chegou = desceu até o ralo passando por todos os canos
function seguirAgua(pecas) {
  const molhadas = [];
  let [r, c] = CANOS_CAMINHO[0], vem = 'N';
  const [fr, fc] = CANOS_CAMINHO[CANOS_CAMINHO.length - 1];
  for (let n = 0; n < 40; n++) {
    const p = pecas.get(`${r},${c}`);
    if (!p || !abre(p).includes(vem)) return { molhadas, chegou: false };
    molhadas.push(`${r},${c}`);
    const sai = abre(p).find((l) => l !== vem);
    if (r === fr && c === fc && sai === 'S') return { molhadas, chegou: molhadas.length === CANOS_CAMINHO.length };
    r += LADOS[sai][0]; c += LADOS[sai][1]; vem = OPOSTO[sai];
  }
  return { molhadas, chegou: false };
}

function puzzleCanos(j) {
  return new Promise((fim) => {
    const pecas = montarCanos();
    let cr = 0, cc = 0, t = 0, enchendo = null;
    const C = 52, X0 = 272 - (CANOS_COLS * C) / 2, Y0 = 62;
    j.brilho = 1; j.alvoBrilho = 1;
    const sair = (ok) => { j.overlay = null; fim(ok); };
    j.overlay = {
      regiao: [150, 14, 244, 376],   // registro, tábuas, ralo e a dica
      atualizar() {
        t++;
        if (enchendo) {
          // a água desce casa por casa; no fim, o portão
          if (--enchendo.espera > 0) return;
          enchendo.n++;
          if (enchendo.n > CANOS_CAMINHO.length + 1) { sair(true); return; }
          if (enchendo.n === CANOS_CAMINHO.length + 1) { som.destrancar(); enchendo.espera = 60; return; }
          enchendo.espera = 9;
          return;
        }
        if (entrada.repetiu('direita')) { cc = (cc + 1) % CANOS_COLS; som.cursor(); }
        if (entrada.repetiu('esquerda')) { cc = (cc + CANOS_COLS - 1) % CANOS_COLS; som.cursor(); }
        if (entrada.repetiu('baixo')) { cr = (cr + 1) % CANOS_LINHAS; som.cursor(); }
        if (entrada.repetiu('cima')) { cr = (cr + CANOS_LINHAS - 1) % CANOS_LINHAS; som.cursor(); }
        if (entrada.disparou('ok')) {
          const p = pecas.get(`${cr},${cc}`);
          if (!p) { som.erro(); return; }
          p.rot = (p.rot + 1) % ABERTURAS[p.tipo].length;
          som.metal();
          if (seguirAgua(pecas).chegou) enchendo = { n: 0, espera: 20 };
        }
        if (entrada.disparou('cancelar')) sair(false);
      },
      desenhar(g) {
        // tábuas escuras atrás, como o chão da captura 20
        const fx = X0 - 26, fy = Y0 - 26, fw = CANOS_COLS * C + 52, fh = CANOS_LINHAS * C + 52;
        g.fillStyle = '#1a1a1a'; g.fillRect(fx, fy, fw, fh);
        for (let x = fx; x < fx + fw; x += 9) { g.fillStyle = '#121212'; g.fillRect(x, fy, 1, fh); g.fillStyle = '#222'; g.fillRect(x + 4, fy, 1, fh); }
        g.strokeStyle = '#555'; g.lineWidth = 2; g.strokeRect(fx + 1, fy + 1, fw - 2, fh - 2);
        const molhadas = enchendo ? CANOS_CAMINHO.slice(0, enchendo.n).map(([r, c]) => `${r},${c}`) : [];
        const centro = (r, c) => [X0 + c * C + C / 2, Y0 + r * C + C / 2];
        // entrada da água no alto (registro) e o ralo embaixo
        const [ex, ey] = centro(...CANOS_CAMINHO[0]);
        const [sx, sy] = centro(...CANOS_CAMINHO[CANOS_CAMINHO.length - 1]);
        tubo(g, ex, fy - 4, ex, ey - C / 2, !!enchendo && enchendo.n > 0);
        tubo(g, sx, sy + C / 2, sx, fy + fh + 4, !!enchendo && enchendo.n > CANOS_CAMINHO.length);
        g.fillStyle = '#cfcfcf'; g.fillRect(ex - 9, fy - 14, 18, 10);
        g.fillStyle = '#0a0a0a'; g.fillRect(sx - 10, fy + fh + 4, 20, 8);
        g.strokeStyle = '#777'; g.lineWidth = 1; g.strokeRect(sx - 10.5, fy + fh + 3.5, 21, 9);
        for (const [k, p] of pecas) {
          const [r, c] = k.split(',').map(Number), [x, y] = centro(r, c);
          const agua = molhadas.includes(k);
          for (const l of abre(p)) tubo(g, x, y, x + LADOS[l][1] * C / 2, y + LADOS[l][0] * C / 2, agua);
          // a caixa da junta no meio, como na captura
          g.fillStyle = '#bdbdbd'; g.fillRect(x - 8, y - 8, 16, 16);
          g.strokeStyle = '#2a2a2a'; g.lineWidth = 1; g.strokeRect(x - 7.5, y - 7.5, 15, 15);
          g.fillStyle = agua ? '#ffffff' : '#7a7a7a'; g.fillRect(x - 4, y - 4, 8, 8);
        }
        if (!enchendo) { const [x, y] = centro(cr, cc); cursor(g, x - C / 2 + 2, y - C / 2 + 2, C - 4, C - 4, t); }
        const dica = document.body.classList.contains('toque') ? 'Direcional: escolher · OK: girar · Esc: sair' : 'Setas: escolher · Enter: girar · Esc: sair';
        textoDica(g, dica, 272, fy + fh + 26);
      },
    };
  });
}
// um trecho de cano claro (com a água, se passou por ali)
function tubo(g, x0, y0, x1, y1, agua) {
  const v = x0 === x1, w = 10;
  const x = Math.min(x0, x1) - (v ? w / 2 : 0), y = Math.min(y0, y1) - (v ? 0 : w / 2);
  const ww = v ? w : Math.abs(x1 - x0), hh = v ? Math.abs(y1 - y0) : w;
  g.fillStyle = '#2a2a2a'; g.fillRect(x - 1, y - 1, ww + 2, hh + 2);
  g.fillStyle = '#c4c4c4'; g.fillRect(x, y, ww, hh);
  g.fillStyle = '#e8e8e8'; if (v) g.fillRect(x + 2, y, 2, hh); else g.fillRect(x, y + 2, ww, 2);
  if (agua) { g.fillStyle = 'rgba(255,255,255,0.95)'; if (v) g.fillRect(x + 3, y, 4, hh); else g.fillRect(x, y + 3, ww, 4); }
}

// Tela de fim do jogo: "The End" e o nome do jogo (é o final de verdade, não há continuação). As linhas entram uma de cada vez; OK (ou toque) antes da hora mostra tudo, o próximo
// OK volta ao título.
function telaFim(j) {
  const TUDO = 240, SAIDA = 50;
  return new Promise((fim) => {
    let t = 0, saindo = -1;
    const surgir = (ini, dur = 60) => Math.max(0, Math.min(1, (t - ini) / dur));
    j.overlay = {
      toque: true, // tocar na tela vale OK aqui (main.js)
      atualizar() {
        if (saindo >= 0) {
          if (++saindo >= SAIDA) { j.overlay = null; fim(); }
          return;
        }
        t++;
        if (t > 40 && entrada.disparou('ok')) {
          if (t < TUDO) t = TUDO; else { som.ok(); saindo = 0; }
        }
      },
      desenhar(g) {
        const sai = saindo >= 0 ? 1 - saindo / SAIDA : 1;
        const cx = 272;
        // "The End"
        g.globalAlpha = surgir(0, 90) * sai;
        const pxG = pxCaixa(2.6);
        texto(g, 'The End', cx, 120, '#d0d0d0', fonteSerif(pxG), 'center');
        // filete e o nome do jogo, embaixo: é o fim da história
        g.globalAlpha = surgir(110) * sai;
        const yF = 120 + pxG * 1.35;
        const meia = 70 * surgir(110, 50);
        g.fillStyle = '#6a6a6a'; g.fillRect(cx - meia, yF, meia * 2, 1);
        const pxM = pxCaixa(1.15);
        texto(g, 'Insônia', cx, yF + pxM * 0.8, '#8a8a8a', `italic ${fonteSerif(pxM)}`, 'center');
        // dica para voltar ao título, piscando devagar
        if (t >= TUDO) {
          g.globalAlpha = (0.35 + 0.25 * Math.sin(t / 22)) * surgir(TUDO, 40) * sai;
          const pxP = pxCaixa(0.8);
          texto(g, 'Pressione OK para voltar ao título', cx, 416 - pxP * 3, '#8a8a8a', fonteTexto(pxP), 'center');
        }
        g.globalAlpha = 1;
      },
    };
    // a narração deixou a tela apagada; a própria tela de fim cuida dos seus fades sobre o preto
    j.brilho = j.alvoBrilho = 1;
  });
}

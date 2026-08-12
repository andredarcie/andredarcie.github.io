// A seção de curiosidades: o que os metadados sabem e a galeria não mostra.
//
// Escolhas de forma, nesta ordem:
//
//   Números soltos viram ladrilho, não gráfico. "93% das fotos são verticais" é
//   um fato único; plotar dois valores num gráfico de pizza seria decoração.
//
//   Dia da semana e hora do dia viram barra. São série única sobre categorias
//   ordenadas, então uma cor só, com a brasa reservada para destacar o extremo
//   que o gráfico existe para mostrar.
//
//   A tira de cores não é gráfico nenhum — é o próprio dado. Cada foto vira uma
//   listra fina na ordem em que foi tirada, e o ano aparece como uma faixa.
//
// Cores validadas contra o fundo de papel: céu #2C6E9B e brasa #C1342B dão
// ΔE 17.0 em protanopia e 26.7 em visão normal, ambos acima do piso, com
// contraste ≥3:1. O par verde/vermelho da bandeirinha foi descartado justamente
// aqui: ΔE 5.9 em protanopia, indistinguível.

import { S, fmtNum, fmtDate } from './strings.js';

const CEU = '#2C6E9B';
const BRASA = '#C1342B';
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const el = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
};

export function renderCuriosidades(node, m) {
  const s = m.stats;
  if (!node || !s) return;
  node.replaceChildren();

  node.append(ladrilhos(s, m));
  node.append(tiraDeCores(s));
  node.append(
    barras({
      titulo: S.curio.porDiaSemana,
      nota: S.curio.porDiaSemanaNota,
      rotulos: DIAS,
      // Média por dia, não total: houve 21 sábados e 13 segundas no caminho, e
      // o total puniria a segunda duas vezes pelo mesmo motivo.
      valores: s.diaDaSemana.map((n, i) => (s.diasPorSemana[i] ? n / s.diasPorSemana[i] : 0)),
      unidade: S.curio.fotosPorDia,
      destaque: (v, i, vs) => v === Math.max(...vs),
      formata: (v) => Math.round(v),
    })
  );
  node.append(
    barras({
      titulo: S.curio.porHora,
      nota: S.curio.porHoraNota,
      rotulos: s.horas.map((_, h) => String(h).padStart(2, '0')),
      valores: s.horas,
      unidade: S.curio.fotos,
      destaque: (v, i, vs) => v === Math.max(...vs),
      formata: (v) => fmtNum(v),
      rotulaCada: 3,
    })
  );
}

/** Fatos que não pedem gráfico. */
function ladrilhos(s, m) {
  const o = s.orientacao ?? {};
  const totalOri = (o.retrato ?? 0) + (o.paisagem ?? 0) + (o.quadrada ?? 0);
  const pctVertical = totalOri ? Math.round((o.retrato / totalOri) * 100) : null;

  const sab = s.diasPorSemana[6] ? s.diaDaSemana[6] / s.diasPorSemana[6] : 0;
  const seg = s.diasPorSemana[1] ? s.diaDaSemana[1] / s.diasPorSemana[1] : 0;
  const razao = seg > 0 ? Math.round(sab / seg) : null;

  const fatos = [
    pctVertical != null && [`${pctVertical}%`, S.curio.vertical, S.curio.verticalNota],
    razao && [`${razao}×`, S.curio.fimDeSemana, S.curio.fimDeSemanaNota(Math.round(sab), Math.round(seg))],
    s.diaMaisCheio && [
      fmtNum(s.diaMaisCheio.n),
      S.curio.diaMaisCheio,
      S.curio.diaMaisCheioNota(fmtDate(Date.parse(s.diaMaisCheio.data)), s.diaMaisCheio.uf),
    ],
    s.maiorDeslocamento && [
      `${fmtNum(s.maiorDeslocamento.km)} km`,
      S.curio.maiorSalto,
      S.curio.maiorSaltoNota(fmtDate(Date.parse(s.maiorDeslocamento.data))),
    ],
    s.silencio?.dias && [
      `${String(s.silencio.dias).replace('.', ',')}`,
      S.curio.silencio,
      S.curio.silencioNota(fmtDate(s.silencio.de), fmtDate(s.silencio.ate)),
    ],
    s.altitude && [
      `${fmtNum(s.altitude.mediana)} m`,
      S.curio.altitude,
      S.curio.altitudeNota(fmtNum(s.altitude.max)),
    ],
    s.rajada && [fmtNum(s.rajada), S.curio.rajada, S.curio.rajadaNota],
    s.diasComFoto && [fmtNum(s.diasComFoto), S.curio.diasComFoto, S.curio.diasComFotoNota],
  ].filter(Boolean);

  const grade = el('div', 'fatos');
  for (const [numero, rotulo, nota] of fatos) {
    const card = el('div', 'fato');
    card.append(el('p', 'fato__n', numero));
    card.append(el('p', 'fato__r', rotulo));
    card.append(el('p', 'fato__nota', nota));
    grade.append(card);
  }
  return grade;
}

/**
 * O ano como uma faixa de cor: uma listra por foto, em ordem cronológica.
 * Renderizado em canvas — três mil elementos SVG travariam a rolagem.
 */
function tiraDeCores(s) {
  const bloco = el('figure', 'tira');
  bloco.append(el('h3', 'tira__titulo', S.curio.tira));

  const canvas = document.createElement('canvas');
  canvas.className = 'tira__canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', S.curio.tiraAlt(s.tira.length));
  bloco.append(canvas);
  bloco.append(el('figcaption', 'tira__nota', S.curio.tiraNota));

  const pinta = () => {
    const largura = canvas.clientWidth || 900;
    const altura = 84;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = largura * dpr;
    canvas.height = altura * dpr;
    canvas.style.height = `${altura}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const n = s.tira.length;
    if (!n) return;

    const passo = largura / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = `#${s.tira[i]}`;
      // +1 para cobrir o arredondamento e não deixar frestas de fundo.
      ctx.fillRect(i * passo, 0, passo + 1, altura);
    }
  };

  requestAnimationFrame(pinta);
  new ResizeObserver(pinta).observe(canvas);
  return bloco;
}

/**
 * Barras horizontais, série única.
 *
 * Marcas finas, extremidade arredondada em 4px ancorada na linha de base, 2px
 * de respiro entre barras vizinhas, eixo recessivo. Sem legenda: com uma série
 * só, o título já diz o que é.
 */
function barras({ titulo, nota, rotulos, valores, unidade, destaque, formata, rotulaCada = 1 }) {
  const fig = el('figure', 'gr');
  fig.append(el('h3', 'gr__titulo', titulo));

  const max = Math.max(...valores) || 1;
  const corpo = el('div', 'gr__corpo');

  valores.forEach((v, i) => {
    const linha = el('div', 'gr__linha');
    const ehDestaque = destaque?.(v, i, valores);

    const rot = el('span', 'gr__rotulo', rotulos[i]);
    if (rotulaCada > 1 && i % rotulaCada !== 0 && !ehDestaque) rot.classList.add('is-fraca');

    const trilho = el('div', 'gr__trilho');
    const barra = el('div', 'gr__barra');
    barra.style.width = `${(v / max) * 100}%`;
    barra.style.background = ehDestaque ? BRASA : CEU;
    trilho.append(barra);

    // Rótulo direto só onde interessa: o extremo. Número em toda barra vira ruído.
    const val = el('span', 'gr__valor', formata(v));
    if (!ehDestaque) val.classList.add('is-fraca');

    linha.append(rot, trilho, val);
    linha.title = `${rotulos[i]} · ${formata(v)} ${unidade}`;
    linha.setAttribute('role', 'listitem');
    linha.setAttribute('aria-label', `${rotulos[i]}: ${formata(v)} ${unidade}`);
    corpo.append(linha);
  });

  corpo.setAttribute('role', 'list');
  fig.append(corpo);
  if (nota) fig.append(el('figcaption', 'gr__nota', nota));
  return fig;
}

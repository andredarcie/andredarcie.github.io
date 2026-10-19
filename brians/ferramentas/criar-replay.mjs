// Monta um replay a partir de um roteiro de texto, sem precisar jogar.
// Serve para testes automáticos (o mesmo replay tocado duas vezes tem de dar o
// mesmo rastro) e para chegar rápido a um ponto do jogo.
//
// Roteiro: um comando por linha; # começa comentário. Cada "quadro" é um
// Input.update do jogo.
//   espera N                 N quadros sem apertar nada
//   aperta BOTOES [N]        segura os botões por N quadros (padrão 1) e solta
//                            BOTOES: C, B, A, X, Y, Z, L, R, SHIFT, CTRL, ALT,
//                            F5–F9, cima, baixo, esquerda, direita; junte com +
//                            (direita+A). Shift do teclado = A+SHIFT.
//   ir MAPA X Y [DIRECAO]    seletor de fases (localhost): leva o Brian ao mapa
//   variavel N V             $game_variables[N] = V (teste: morte pela variável
//                            de vidas, condição de um evento)
//   semente N                semente do rand (padrão 1)
//
// Uso: node ferramentas/criar-replay.mjs roteiro.txt saida.json
import fs from 'node:fs';

const BOTOES = {
  baixo: 2, esquerda: 4, direita: 6, cima: 8,
  a: 11, b: 12, c: 13, x: 14, y: 15, z: 16, l: 17, r: 18,
  shift: 21, ctrl: 22, alt: 23, f5: 25, f6: 26, f7: 27, f8: 28, f9: 29,
};

const [entrada, saida] = process.argv.slice(2);
if (!entrada || !saida) { console.log('uso: node ferramentas/criar-replay.mjs roteiro.txt saida.json'); process.exit(2); }

const mascaras = [];
const pedidos = [];
let semente = 1;
fs.readFileSync(entrada, 'utf8').split(/\r?\n/).forEach((linha, i) => {
  const [cmd, ...args] = linha.replace(/#.*/, '').trim().split(/\s+/);
  if (!cmd) return;
  const erro = (m) => { throw new Error(`${entrada}:${i + 1}: ${m}`); };
  const numero = (s, padrao) => {
    if (s === undefined) return padrao;
    const n = Number(s);
    if (!Number.isInteger(n) || n < 0) erro(`número inválido: ${s}`);
    return n;
  };
  switch (cmd.toLowerCase()) {
    case 'espera':
      for (let n = numero(args[0]); n > 0; n--) mascaras.push(0);
      break;
    case 'aperta': {
      if (!args[0]) erro('aperta sem botões');
      let m = 0;
      for (const b of args[0].toLowerCase().split('+')) {
        if (!(b in BOTOES)) erro(`botão desconhecido: ${b}`);
        m |= 1 << BOTOES[b];
      }
      for (let n = numero(args[1], 1); n > 0; n--) mascaras.push(m >>> 0);
      break;
    }
    case 'variavel': {
      const [n, v] = [numero(args[0]), numero(args[1])];
      if (n === undefined || v === undefined) erro('variavel N V');
      pedidos.push([mascaras.length, `var,${n},${v}`]);
      break;
    }
    case 'ir': {
      const [mapa, x, y, dir] = [numero(args[0]), numero(args[1]), numero(args[2]), numero(args[3], 2)];
      if (mapa === undefined || x === undefined || y === undefined) erro('ir MAPA X Y [DIRECAO]');
      pedidos.push([mascaras.length, `${mapa},${x},${y},${dir}`]);
      break;
    }
    case 'semente':
      semente = numero(args[0]);
      break;
    default:
      erro(`comando desconhecido: ${cmd}`);
  }
});

const rle = [];
for (const m of mascaras) {
  const ultimo = rle[rle.length - 1];
  if (ultimo && ultimo[0] === m) ultimo[1]++;
  else rle.push([m, 1]);
}
// um pedido por entrada: as duas versões aplicam um só por Graphics.update
for (let i = 1; i < pedidos.length; i++) {
  if (pedidos[i][0] === pedidos[i - 1][0]) erro(`dois pedidos na mesma entrada (${pedidos[i - 1][1]} e ${pedidos[i][1]}): ponha "espera 1" entre eles`);
}
fs.writeFileSync(saida, JSON.stringify({ versao: 1, roteiro: entrada, semente, total: mascaras.length, entradas: rle, pedidos }));
console.log(`${saida}: ${mascaras.length} quadros de entrada, ${pedidos.length} saltos de fase, semente ${semente}`);

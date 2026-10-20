// Tilemap do RPG Maker VX (tiles 32×32).
// IDs: B 0–255, C 256–511, D 512–767, E 768–1023, A5 1536–1663,
//      A1 2048–2815, A2 2816–4351, A3 4352–5887, A4 5888–8191 (autotiles: 48 formas cada).
// bitmaps: 0=A1 1=A2 2=A3 3=A4 4=A5 5=B 6=C 7=D 8=E.
// Tiles com a flag 0x10 em passages vão para a camada de cima (z=200).
// As tabelas de quartos de autotile são as do formato VX (herdadas pelo VX Ace).

const T = 32, M = 16; // tile e meio tile

const PISO = [
  [[2, 4], [1, 4], [2, 3], [1, 3]], [[2, 0], [1, 4], [2, 3], [1, 3]], [[2, 4], [3, 0], [2, 3], [1, 3]], [[2, 0], [3, 0], [2, 3], [1, 3]],
  [[2, 4], [1, 4], [2, 3], [3, 1]], [[2, 0], [1, 4], [2, 3], [3, 1]], [[2, 4], [3, 0], [2, 3], [3, 1]], [[2, 0], [3, 0], [2, 3], [3, 1]],
  [[2, 4], [1, 4], [2, 1], [1, 3]], [[2, 0], [1, 4], [2, 1], [1, 3]], [[2, 4], [3, 0], [2, 1], [1, 3]], [[2, 0], [3, 0], [2, 1], [1, 3]],
  [[2, 4], [1, 4], [2, 1], [3, 1]], [[2, 0], [1, 4], [2, 1], [3, 1]], [[2, 4], [3, 0], [2, 1], [3, 1]], [[2, 0], [3, 0], [2, 1], [3, 1]],
  [[0, 4], [1, 4], [0, 3], [1, 3]], [[0, 4], [3, 0], [0, 3], [1, 3]], [[0, 4], [1, 4], [0, 3], [3, 1]], [[0, 4], [3, 0], [0, 3], [3, 1]],
  [[2, 2], [1, 2], [2, 3], [1, 3]], [[2, 2], [1, 2], [2, 3], [3, 1]], [[2, 2], [1, 2], [2, 1], [1, 3]], [[2, 2], [1, 2], [2, 1], [3, 1]],
  [[2, 4], [3, 4], [2, 3], [3, 3]], [[2, 4], [3, 4], [2, 1], [3, 3]], [[2, 0], [3, 4], [2, 3], [3, 3]], [[2, 0], [3, 4], [2, 1], [3, 3]],
  [[2, 4], [1, 4], [2, 5], [1, 5]], [[2, 0], [1, 4], [2, 5], [1, 5]], [[2, 4], [3, 0], [2, 5], [1, 5]], [[2, 0], [3, 0], [2, 5], [1, 5]],
  [[0, 4], [3, 4], [0, 3], [3, 3]], [[2, 2], [1, 2], [2, 5], [1, 5]], [[0, 2], [1, 2], [0, 3], [1, 3]], [[0, 2], [1, 2], [0, 3], [3, 1]],
  [[2, 2], [3, 2], [2, 3], [3, 3]], [[2, 2], [3, 2], [2, 1], [3, 3]], [[2, 4], [3, 4], [2, 5], [3, 5]], [[2, 0], [3, 4], [2, 5], [3, 5]],
  [[0, 4], [1, 4], [0, 5], [1, 5]], [[0, 4], [3, 0], [0, 5], [1, 5]], [[0, 2], [3, 2], [0, 3], [3, 3]], [[0, 2], [1, 2], [0, 5], [1, 5]],
  [[0, 4], [3, 4], [0, 5], [3, 5]], [[2, 2], [3, 2], [2, 5], [3, 5]], [[0, 2], [3, 2], [0, 5], [3, 5]], [[0, 0], [1, 0], [0, 1], [1, 1]],
];

const PAREDE = [
  [[2, 2], [1, 2], [2, 1], [1, 1]], [[0, 2], [1, 2], [0, 1], [1, 1]], [[2, 0], [1, 0], [2, 1], [1, 1]], [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[2, 2], [3, 2], [2, 1], [3, 1]], [[0, 2], [3, 2], [0, 1], [3, 1]], [[2, 0], [3, 0], [2, 1], [3, 1]], [[0, 0], [3, 0], [0, 1], [3, 1]],
  [[2, 2], [1, 2], [2, 3], [1, 3]], [[0, 2], [1, 2], [0, 3], [1, 3]], [[2, 0], [1, 0], [2, 3], [1, 3]], [[0, 0], [1, 0], [0, 3], [1, 3]],
  [[2, 2], [3, 2], [2, 3], [3, 3]], [[0, 2], [3, 2], [0, 3], [3, 3]], [[2, 0], [3, 0], [2, 3], [3, 3]], [[0, 0], [3, 0], [0, 3], [3, 3]],
];

const CASCATA = [
  [[2, 0], [1, 0], [2, 1], [1, 1]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[2, 0], [3, 0], [2, 1], [3, 1]], [[0, 0], [3, 0], [0, 1], [3, 1]],
];

const NEUTRO = [0, 0, 0, 0];
const PRETO = [0, 0, 0, 255];
const SOMBRA_ALFA = 0.5;

// Classificação dos autotiles de prédio: A3 e A4 alternam linhas de topo
// (pares) e de face de parede (ímpares).
function ehParede(id) {
  if (id < 4352) return false;
  const ty = Math.floor((id - 2048) / 48 / 8);
  return ty % 2 === 1;
}
function ehPredio(id) { return id >= 4352; }

// O VX não grava sombras no mapa: o Tilemap escurece a metade esquerda de um
// tile de chão quando o vizinho à esquerda é face de parede e o de cima-à-esquerda
// também é prédio (parede ou topo).
function temSombra(dados, xs, ys, x, y) {
  const aqui = dados[x + y * xs];
  if (ehPredio(aqui)) return false;
  const xe = (x - 1 + xs) % xs, yc = (y - 1 + ys) % ys;
  return ehParede(dados[xe + y * xs]) && ehPredio(dados[xe + yc * xs]);
}

export function desenharTilemap(r, camada, bx, by, area) {
  const tm = camada.tilemap;
  if (!tm.mapa || !tm.visivel) return;
  const { xs, ys, zs, dados } = tm.mapa;
  if (xs <= 0 || ys <= 0) return;
  const a = area ?? { x: 0, y: 0, w: r.largura, h: r.altura };
  // Tile (mx,my) vai para a tela em bx + mx*32 - ox (bx já inclui viewport.x - viewport.ox).
  // O mapa repete nas bordas, como no RGSS (mapas em loop dependem disso).
  const ox = tm.ox, oy = tm.oy;
  const tx0 = Math.floor((a.x - bx + ox) / T), ty0 = Math.floor((a.y - by + oy) / T);
  const colunas = Math.ceil(a.w / T) + 2, linhas = Math.ceil(a.h / T) + 2;
  const quadro = tm.quadroAnimacao;
  const acima = camada.indice === 1;
  const pass = tm.passagens;
  const porCamada = xs * ys;
  // Tiles de uma mesma camada z não se sobrepõem (cada um no seu quadrado),
  // então a ordem entre células não importa: desenha camada por camada e,
  // dentro dela, um bitmap por vez. Tile a tile, cada troca de bitmap
  // (A1, A2, B…) virava uma chamada de desenho (~70 por quadro).
  for (let z = 0; z < zs; z++) {
    // uma passada pelas células: separa os tiles da camada por bitmap
    for (const l of LOTES) l.length = 0;
    const base = z * porCamada;
    for (let j = 0; j < linhas; j++) {
      const my = ty0 + j, y = ((my % ys) + ys) % ys;
      const dy = by + my * T - oy;
      for (let i = 0; i < colunas; i++) {
        const mx = tx0 + i, x = ((mx % xs) + xs) % xs;
        const dx = bx + mx * T - ox;
        // Sombra automática do VX: depois das camadas A, antes dos objetos B–E.
        if (z === 2 && !acima && temSombra(dados, xs, ys, x, y)) LOTES[SOMBRA].push(0, dx, dy);
        const id = dados[x + y * xs + base];
        if (id <= 0) continue;
        const ehAcima = pass ? (pass[id] & 0x10) !== 0 : false;
        if (ehAcima !== acima) continue;
        LOTES[indiceBitmap(id)].push(id, dx, dy);
      }
    }
    const sombras = LOTES[SOMBRA];
    if (sombras.length) {
      r.preparar(r.branco, SOMBRA_ALFA, PRETO, NEUTRO, 0);
      for (let k = 0; k < sombras.length; k += 3) r.quad(sombras[k + 1], sombras[k + 2], M, T, 0, 0, 1, 1, 1, 1);
    }
    for (let b = 0; b < SOMBRA; b++) {
      const l = LOTES[b];
      for (let k = 0; k < l.length; k += 3) desenharTile(r, tm, l[k], l[k + 1], l[k + 2], quadro);
    }
  }
}

// (id, dx, dy) por bitmap, reaproveitados de quadro em quadro; o último é o das sombras
const SOMBRA = 10;
const LOTES = Array.from({ length: SOMBRA + 1 }, () => []);

// bitmap do tile (0=A1 … 8=E; 9 = nenhum, ids de 1024 a 1535)
function indiceBitmap(id) {
  if (id >= 2048) return id < 2816 ? 0 : id < 4352 ? 1 : id < 5888 ? 2 : 3;
  if (id >= 1536) return 4;
  return id < 1024 ? 5 + (id >> 8) : 9;
}

function desenharTile(r, tm, id, dx, dy, quadro) {
  if (id >= 2048) return desenharAutotile(r, tm, id, dx, dy, quadro);
  let bmp, sx, sy;
  if (id >= 1536) {
    bmp = tm.bitmaps[4];
    const i = id - 1536;
    sx = (i % 8) * T; sy = Math.floor(i / 8) * T;
  } else if (id < 1024) {
    bmp = tm.bitmaps[5 + Math.floor(id / 256)];
    const i = id % 256;
    sx = ((i % 8) + Math.floor(i / 128) * 8) * T;
    sy = Math.floor((i % 128) / 8) * T;
  } else return;
  if (!bmp || bmp.descartado) return;
  r.preparar(r.texturaDe(bmp), 1, NEUTRO, NEUTRO, 0);
  r.quad(dx, dy, T, T, sx, sy, T, T, bmp.largura, bmp.altura);
}

function desenharAutotile(r, tm, id, dx, dy, quadro) {
  const tipo = Math.floor((id - 2048) / 48), forma = (id - 2048) % 48;
  const tx = tipo % 8, ty = Math.floor(tipo / 8);
  let tabela = PISO, conjunto = 0, bx = 0, by = 0;
  if (id < 2816) {          // A1: água animada
    const superficie = [0, 1, 2, 1][quadro % 4];
    conjunto = 0;
    if (tipo === 0) { bx = superficie * 2; by = 0; }
    else if (tipo === 1) { bx = superficie * 2; by = 3; }
    else if (tipo === 2) { bx = 6; by = 0; }
    else if (tipo === 3) { bx = 6; by = 3; }
    else {
      bx = Math.floor(tx / 4) * 8;
      by = ty * 6 + (Math.floor(tx / 2) % 2) * 3;
      if (tipo % 2 === 0) bx += superficie * 2;
      else { bx += 6; tabela = CASCATA; by += quadro % 3; }
    }
  } else if (id < 4352) {   // A2: chão
    conjunto = 1; bx = tx * 2; by = (ty - 2) * 3;
  } else if (id < 5888) {   // A3: telhados/paredes de prédio
    conjunto = 2; bx = tx * 2; by = (ty - 6) * 2; tabela = PAREDE;
  } else {                  // A4: topo (piso) e face (parede) alternados
    conjunto = 3; bx = tx * 2;
    by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0));
    if (ty % 2 === 1) tabela = PAREDE;
  }
  const quartos = tabela[forma];
  const bmp = tm.bitmaps[conjunto];
  if (!quartos || !bmp || bmp.descartado) return;
  r.preparar(r.texturaDe(bmp), 1, NEUTRO, NEUTRO, 0);
  for (let i = 0; i < 4; i++) {
    const [qx, qy] = quartos[i];
    r.quad(dx + (i % 2) * M, dy + Math.floor(i / 2) * M, M, M, (bx * 2 + qx) * M, (by * 2 + qy) * M, M, M, bmp.largura, bmp.altura);
  }
}

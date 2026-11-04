// Draws the map of Divinolândia (inline SVG) into index.html, between <!-- mapa:inicio -->
// and <!-- mapa:fim -->, from the town baked for Divino City (tiny-gta: OpenStreetMap streets,
// rivers and the surveyed houses, in metres centred on the Igreja Matriz, x = east, z = south).
// The pins are the places of the legends. Run again after the town or the pins change:
//   node lendas-divinolandia/mapa.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const d = JSON.parse(fs.readFileSync('C:/repos/tiny-gta/src/data/divinolandia.json', 'utf8'));

// the frame: the town and the hill of the Cristo, in local metres
const X0 = -1150, Z0 = -700, W = 2400, H = 1700;
const inside = ([x, z], m = 0) => x >= X0 - m && x <= X0 + W + m && z >= Z0 - m && z <= Z0 + H + m;
const r = (v) => Math.round(v);

// polyline → path data, clipped loosely to the frame (segments fully outside are dropped)
function linha(pts) {
  let s = '', pen = false;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], prev = pts[i - 1], next = pts[i + 1];
    const keep = inside(p, 60) || (prev && inside(prev, 60)) || (next && inside(next, 60));
    if (!keep) { pen = false; continue; }
    s += (pen ? 'L' : 'M') + r(p[0]) + ' ' + r(p[1]);
    pen = true;
  }
  return s;
}

// streets by weight
const PESO = {primary: 'r1', secondary: 'r1', primary_link: 'r2', tertiary: 'r2', unclassified: 'r3', residential: 'r3', service: 'r4'};
const ruas = {r1: '', r2: '', r3: '', r4: ''};
for (const rd of d.roads) ruas[PESO[rd.k] || 'r3'] += linha(rd.pts);

// water: the Rio do Peixe and the streams
let rio = '', corregos = '';
for (const w of d.waters) {
  const pts = w.pts.map((p) => [p[0], p[1]]);
  if (w.name === 'Rio do Peixe') rio += linha(pts); else corregos += linha(pts);
}

// the houses, as their real footprints (x, z, width, depth, rotation about the vertical)
let casas = '';
for (const h of d.houses) {
  const [x, z, w, dd, rot] = h;
  if (!inside([x, z])) continue;
  const c = Math.cos(rot), s = Math.sin(rot), hw = w / 2, hd = dd / 2;
  const pt = (u, v) => r(x + u * c + v * s) + ' ' + r(z - u * s + v * c);
  casas += `M${pt(-hw, -hd)}L${pt(hw, -hd)}L${pt(hw, hd)}L${pt(-hw, hd)}Z`;
}

// squares and named areas (hospital, schools, cemetery, stadium)
const poli = (pts) => 'M' + pts.map((p) => r(p[0]) + ' ' + r(p[1])).join('L') + 'Z';
const pracas = d.plazas.map((p) => poli(p.pts)).join('');
const areas = d.areas.filter((a) => a.pts.every((p) => inside(p, 100))).map((a) => poli(a.pts)).join('');

// the Rio do Peixe point closest to the centre, where the label and its pin go
const rioPts = d.waters.find((w) => w.name === 'Rio do Peixe').pts.map((p) => [p[0], p[1]]);
const perto = (alvo) => rioPts.reduce((b, p) => (Math.hypot(p[0] - alvo[0], p[1] - alvo[1]) < Math.hypot(b[0] - alvo[0], b[1] - alvo[1]) ? p : b));
const rioPin = perto([150, -350]);

const L = d.landmarks;
const PINS = [
  {n: 1, x: L.matriz.cx, z: L.matriz.cz, nome: 'Igreja Matriz', dx: -1},
  {n: 2, x: 75, z: 243, nome: 'Escola Euclides da Cunha', dx: 1},
  {n: 3, x: L.hospital[0], z: L.hospital[1], nome: 'Hospital Regional', dx: 1},
  {n: 4, x: 455, z: 176, nome: 'Lagoa dos Populares', dx: 1},
  {n: 5, x: rioPin[0], z: rioPin[1], nome: 'Rio do Peixe', dx: 1},
  {n: 6, x: 940, z: -477, nome: 'Cristo Redentor', dx: -1},
];
const pins = PINS.map((p) => {
  const tx = p.dx > 0 ? 34 : -34, anchor = p.dx > 0 ? 'start' : 'end';
  return `<g class="pin" transform="translate(${r(p.x)} ${r(p.z)})"><circle r="22"/><text class="pin__n" y="9">${p.n}</text><text class="pin__nome" x="${tx}" y="10" text-anchor="${anchor}">${p.nome}</text></g>`;
}).join('\n      ');

// north arrow and a 500 m bar, bottom left
const bx = X0 + 70, by = Z0 + H - 70;
const extras = `<g class="escala" transform="translate(${bx} ${by})"><path d="M0 0H500M0 -14V14M250 -8V8M500 -14V14"/><text x="0" y="-30">0</text><text x="500" y="-30" text-anchor="middle">500 m</text></g>
      <g class="norte" transform="translate(${X0 + W - 90} ${Z0 + 110})"><path d="M0 -60L22 20L0 6L-22 20Z"/><text y="70" text-anchor="middle">N</text></g>`;

const svg = `
      <svg class="mapa__svg" viewBox="${X0} ${Z0} ${W} ${H}" role="img" aria-labelledby="mapa-titulo mapa-desc" preserveAspectRatio="xMidYMid meet">
      <title id="mapa-titulo">Mapa de Divinolândia com os lugares das lendas</title>
      <desc id="mapa-desc">As ruas, as casas e o Rio do Peixe de Divinolândia, com seis pontos marcados: Igreja Matriz, Escola Euclides da Cunha, Hospital Regional, Lagoa dos Populares, Rio do Peixe e Cristo Redentor.</desc>
      <path class="areas" d="${areas}"/>
      <path class="pracas" d="${pracas}"/>
      <path class="corregos" d="${corregos}"/>
      <path class="rio" d="${rio}"/>
      <path class="ruas r4" d="${ruas.r4}"/>
      <path class="ruas r3" d="${ruas.r3}"/>
      <path class="ruas r2" d="${ruas.r2}"/>
      <path class="ruas r1" d="${ruas.r1}"/>
      <path class="casas" d="${casas}"/>
      ${extras}
      ${pins}
      </svg>
      `;

const arq = path.join(here, 'index.html');
const page = fs.readFileSync(arq, 'utf8');
const ini = '<!-- mapa:inicio -->', fim = '<!-- mapa:fim -->';
const a = page.indexOf(ini), b = page.indexOf(fim);
if (a < 0 || b < 0) throw new Error('marcadores do mapa não encontrados em index.html');
fs.writeFileSync(arq, page.slice(0, a + ini.length) + svg + page.slice(b));
console.log('mapa:', (svg.length / 1024).toFixed(0), 'KB,', d.houses.filter((h) => inside([h[0], h[1]])).length, 'casas');

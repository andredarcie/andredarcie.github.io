// Museu da Travessia — nove salas, uma por estado, percorridas em primeira pessoa.
//
// UMA SALA POR VEZ. Nada da sala vizinha existe: ao trocar de estado, a anterior
// é desmontada e a memória de vídeo devolvida. Esta é a decisão que sustenta
// todo o resto — com um único ambiente carregado dá para gastar em sombra, luz
// e material o que se economiza em quantidade.
//
// A planta não é corredor: é salão com divisórias, como galeria de exposição
// temporária de verdade. Cada divisória tem duas faces, então o mesmo metro
// quadrado de prédio pendura o dobro de quadros, e o caminho vira serpentina em
// vez de reta — você dobra a esquina e encontra a parede seguinte, que é o que
// faz um museu parecer um museu.
//
// Entrada e saída ficam vazias de propósito: nove metros e meio de saguão antes
// do primeiro quadro, onde vai o texto de parede. Toda exposição séria começa
// com uma parede de texto, e sem esse respiro a primeira coisa que você vê ao
// atravessar a porta é uma foto a dois metros do nariz.
//
// LUZ: quatro refletores num trilho imaginário que se realocam para as obras
// mais próximas, com transição — luz que salta de quadro em quadro é a coisa
// que mais denuncia o truque. Mais um mapa de ambiente procedural, que é o que
// dá reflexo ao piso encerado e direção ao dourado da moldura.

import * as THREE from 'three';
import { DATA_URL, thumbUrl, fullUrl, setImageExt } from './config.js';
import { S, fmtDate, fmtDateLong, fmtNum, fmtTime, daysBetween, romano } from './strings.js';
import { aplicarCidades, listarCidades } from './lugares.js';
import { PosProducao, ambienteDeGaleria } from './museu-fx.js';
import { criarSom } from './museu-som.js';

// --- medidas ----------------------------------------------------------------

const OLHO = 1.62;
const LARGURA = 15;          // largura do salão
const DIVISORIA_VAO = 4.2;   // passagem que sobra ao lado de cada divisória

// Divisórias mais juntas que os 7,5 m de antes. Com duas fileiras em vez de
// três, cada metro de prédio pendura um terço a menos, e sem adensar os painéis
// Pernambuco viraria um corredor de duzentos metros.
const ESPACO_DIVISORIA = 6.4;

// Saguões livres nas duas pontas. É onde entram o texto de parede e o banco.
const SAGUAO = 9.5;

const DIV_ESPESSURA = 0.34;
const DIV_MEIA = DIV_ESPESSURA / 2;
const PORTA_LARG = 3.2;
const PORTA_ALT = 3.1;

/**
 * DUAS FILEIRAS, e não três.
 *
 * A terceira ficava com o centro a 4,24 m — dois metros e meio acima da linha do
 * olho. De pé, a três metros da parede, aquilo é um retângulo colorido no alto:
 * não dava para ver a foto, só para saber que havia uma foto ali. Um terço do
 * acervo estava pendurado onde ninguém consegue olhar.
 *
 * As duas que sobraram já estavam nas alturas certas e não se mexeram. O que
 * muda é que o salão precisa ser mais comprido para caber o mesmo acervo — e é
 * uma troca boa, porque comprimento se anda e altura não se alcança.
 */
const FILEIRAS = [1.42, 2.84];
const VAO_FILEIRAS = 1.42;

// O tamanho da obra não é escolhido no olho: sai da restrição. A moldura mais
// larga do rodízio (0,21) sobre a obra maior (fator 1,12) tem de caber no vão
// entre fileiras com folga — senão os quadros se invadem, que foi o que
// aconteceu ao aumentá-los sem refazer esta conta.
const FOLGA = 0.13;
const MAIOR_PERFIL = 1.12;
const MAIOR_MOLDURA = 0.21;
const QUADRO = (VAO_FILEIRAS - FOLGA - MAIOR_MOLDURA) / MAIOR_PERFIL;   // ≈ 0,96

// Metade do maior quadro emoldurado, na largura e na altura — os dois casos dão
// no mesmo, porque a obra maior é quadrada dentro da moldura maior. Daqui saem
// todas as folgas que impedem quadro cortado.
const MEIO_QUADRO = (QUADRO * MAIOR_PERFIL + MAIOR_MOLDURA) / 2;        // ≈ 0,645

// Passo horizontal com a mesma folga, para a pendura ler como grade.
const PASSO = QUADRO * MAIOR_PERFIL + MAIOR_MOLDURA + FOLGA + 0.06;

/**
 * A borda de cima da obra mais alta. Tudo que fecha a parede por cima é medido
 * A PARTIR daqui, e não escolhido à parte.
 *
 * Era exatamente esse o defeito: a fileira de cima terminava em 4,885 m e a
 * divisória em 4,704 m, então o topo de cada quadro da fileira de cima passava
 * 18 cm da borda do painel e ficava pendurado no ar. Dois números escolhidos
 * separadamente nunca se conferem — derivados, não têm como divergir.
 */
const TOPO_PENDURA = FILEIRAS[FILEIRAS.length - 1] + MEIO_QUADRO;       // ≈ 3,49

const ALTURA_DIVISORIA = TOPO_PENDURA + 0.88;   // sobra de painel acima da obra
const CIMALHA = TOPO_PENDURA + 0.77;            // filete que fecha a parede
const PE_DIREITO = 5.2;                         // teto logo acima da cimalha

/**
 * Quanto de parede lateral cada divisória inutiliza.
 *
 * A divisória encosta numa das laterais, e o trecho de parede atrás dela não
 * existe mais: pendurar ali enterra metade do quadro dentro do bloco de 34 cm.
 * Era o segundo jeito de o museu cortar quadro na parede.
 */
const RAIO_DIVISORIA = DIV_MEIA + MEIO_QUADRO + 0.05;

// Espessuras empilhadas a partir da superfície da parede, para fora. A ordem
// importa: moldura encostada na parede, filete sobre ela, paspatur, tela, vidro.
const MOLDURA_FUNDO = 0.075;
const FILETE_FORA = 0.0765;
const PASPATUR_FORA = 0.079;
const TELA_FORA = 0.086;
const VIDRO_FORA = 0.0895;

const ANDAR = 3.0;
const CORRER = 6.4;
const ACELERACAO = 11;       // quanto o corpo demora a partir e a parar

const RAIO_CARGA = 22;
const RAIO_DESCARTE = 38;

// Tamanho do ladrilho de cada material, em metros. É esta constante, e não um
// número de repetições, que mantém o grão do reboco igual numa sala de 30 m e
// numa de 130 m.
const LADRILHO_PAREDE = 2.2;
const LADRILHO_CHAO = 3.4;

const INTENSIDADE_REFLETOR = 26;

/**
 * Paleta por estado. As nove salas eram idênticas, e nove salas idênticas são
 * uma sala repetida nove vezes — atravessar a porta não significava nada.
 *
 * O desvio é pequeno de propósito: mesmo reboco, mesma cal, deslocado de um
 * passo de matiz. Você não consegue nomear a diferença, mas sabe que mudou de
 * sala — que é como museu de verdade funciona, porque cada ala foi pintada num
 * ano diferente e ninguém acertou o tom.
 */
// O piso é sempre mais escuro que a parede. Não é escolha de gosto: quando os
// dois têm o mesmo valor a sala perde o chão, e as primeiras versões destas nove
// paletas renderizavam o concreto mais claro que o reboco — dava uma caixa
// branca sem base, que é o oposto de um salão com pé-direito.
const PALETAS = {
  BA: { parede: 0xE2D4B9, chao: 0x7C6F65, teto: 0xCCBDA3, luz: 0xFFE6C4, acento: 0xC1342B },
  SE: { parede: 0xDCD8C2, chao: 0x75746A, teto: 0xC7C4B0, luz: 0xFFEBD2, acento: 0x7A8B4F },
  AL: { parede: 0xD9DCD4, chao: 0x737876, teto: 0xC4C8C1, luz: 0xFFF0DC, acento: 0x2F8C86 },
  PE: { parede: 0xE4D2AE, chao: 0x7F7063, teto: 0xCEBC9A, luz: 0xFFE4BE, acento: 0xD2452B },
  PB: { parede: 0xE3D5CB, chao: 0x7B7068, teto: 0xCDC0B6, luz: 0xFFE9CC, acento: 0xD98324 },
  RN: { parede: 0xE7DFCE, chao: 0x80796C, teto: 0xD1C9B8, luz: 0xFFEFD8, acento: 0xC98A2E },
  CE: { parede: 0xE9DCB8, chao: 0x837663, teto: 0xD3C6A3, luz: 0xFFE5B8, acento: 0xE0A21C },
  PI: { parede: 0xDCD1BE, chao: 0x786F61, teto: 0xC6BCA9, luz: 0xFFE8C8, acento: 0xA85A2B },
  MA: { parede: 0xE4E2DA, chao: 0x7B7C78, teto: 0xCECCC4, luz: 0xFFF2E4, acento: 0x3E7EA8 },
};
const PALETA_PADRAO = { parede: 0xDED4C0, chao: 0x7A7167, teto: 0xC9BFAC, luz: 0xFFEAD2, acento: 0xC1342B };

const COR = {
  rodape: 0x5A5148,
  paspatur: 0xF7F2E7,
  espera: 0x8A8175,
  banco: 0x3A2E20,
  ferragem: 0x171209,
};

// Tons de moldura em rodízio. Uma coleção de verdade foi emoldurada em épocas
// diferentes, e molduras todas iguais é o que fazia a parede ler como planilha.
const MADEIRAS = [0x171209, 0x2E2013, 0x0F0C08, 0x3A2A15];
const FILETES = [0x8A6A2B, 0x9A8352, 0x6E5A2E, 0xA98F45];

// Dois perfis de qualidade. Não é enfeite: a diferença entre uma sala com
// sombra projetada e pós-produção e a mesma sala sem elas é de três vezes o
// custo por quadro, e o celular do visitante não tem esse orçamento.
const QUALIDADES = {
  alta: { sombras: true, pos: true, poeira: true, vidro: true, refletores: 4, pixel: 2, aniso: 8, cargas: 8, sombraMapa: 2048 },
  leve: { sombras: false, pos: false, poeira: false, vidro: false, refletores: 3, pixel: 1.5, aniso: 2, cargas: 4, sombraMapa: 1024 },
};

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Declarações, e não `const`, porque a portaria é montada durante a avaliação do
// módulo — antes de qualquer `const` mais abaixo existir.
function lembrar(chave) { try { return localStorage.getItem(chave); } catch { return null; } }
function guardar(chave, valor) { try { localStorage.setItem(chave, valor); } catch { /* modo privado */ } }

// --- estado -----------------------------------------------------------------

const app = { salas: [], atual: null, fila: [], carregando: 0 };

let cena, camera, renderizador, relogio, filme = null, poeira = null;
let refletores = [];
let salaViva = null;
let ehToque = false;
let Q = QUALIDADES.alta;
let ambiente = null;
const som = criarSom();

const jogador = {
  pos: new THREE.Vector3(4.5, OLHO, 0),
  vel: new THREE.Vector3(),
  giro: -Math.PI / 2,
  inclinacao: 0,
  correndo: false,
  fase: 0,
  passoAnterior: 0,
};

const teclas = new Set();
const manche = { ativo: false, x: 0, y: 0, id: null, ox: 0, oy: 0 };
const olhar = { id: null, x: 0, y: 0 };

// Geometrias compartilhadas por todas as salas — criadas uma vez, nunca liberadas.
const geoPlano = new THREE.PlaneGeometry(1, 1);
const geoCaixa = new THREE.BoxGeometry(1, 1, 1);
let matEspera = null;

// --- texturas procedurais ----------------------------------------------------

/**
 * Superfície com duas oitavas de ruído: manchas largas e macias por cima do grão
 * fino. Uma oitava só é o que fazia o reboco ler como carpete — a escala do
 * ruído é o que diz de que material a superfície é feita, e material de verdade
 * tem variação em mais de uma escala.
 *
 * Sai neutra, quase branca, e é a cor do material que pinta a sala. Assim as
 * nove paletas dividem uma textura só, em vez de nove.
 */
function texturaSuperficie({ base = 244, manchas = 22, forcaMancha = 16, grao = 16, escala = 5, linear = false }) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = `rgb(${base},${base},${base})`;
  ctx.fillRect(0, 0, 256, 256);

  // Manchas largas. Cada uma é desenhada NOVE vezes, deslocada de um azulejo em
  // cada direção: o que sai por uma borda tem de voltar pela oposta.
  //
  // Sem esse contorno a mancha que cai na borda é simplesmente cortada pelo
  // canvas, e o corte é uma linha reta que se repete a cada ladrilho — era isso
  // que desenhava um xadrez de retângulos no piso de concreto, visível de longe
  // e impossível de confundir com sujeira de chão.
  for (let i = 0; i < manchas; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 26 + Math.random() * 74;
    const tom = Math.random() > 0.5 ? 255 : 0;
    const a = (Math.random() * forcaMancha) / 255;

    for (const dx of [-256, 0, 256]) {
      for (const dy of [-256, 0, 256]) {
        const cx = x + dx;
        const cy = y + dy;
        if (cx + r < 0 || cx - r > 256 || cy + r < 0 || cy - r > 256) continue;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(${tom},${tom},${tom},${a})`);
        g.addColorStop(1, `rgba(${tom},${tom},${tom},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    }
  }

  const img = ctx.getImageData(0, 0, 256, 256);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    // Ruído fino e sem cor: só variação de valor, para não sujar o pigmento.
    const n = (Math.random() - 0.5) * grao;
    d[i] = clamp(d[i] + n, 0, 255);
    d[i + 1] = clamp(d[i + 1] + n, 0, 255);
    d[i + 2] = clamp(d[i + 2] + n, 0, 255);
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  // Mapa de dado — rugosidade — não é cor e não pode passar pela conversão sRGB.
  if (!linear) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(escala, escala);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Estica as coordenadas de textura da geometria para que o ladrilho tenha
 * tamanho em METROS, e não em frações da parede.
 *
 * Sem isto, uma parede de 130 m e uma de 30 m recebem o mesmo número de
 * repetições e o reboco sai esticado vinte e três vezes na horizontal numa e
 * apertado na outra — o defeito mais visível que uma superfície pode ter, e o
 * que faz qualquer sala parecer feita de papel de parede mal colado. Vai na
 * geometria, e não no `repeat` da textura, para que todas as paredes das nove
 * salas continuem dividindo uma única imagem.
 */
function escalarUV(geo, u, v) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
  uv.needsUpdate = true;
  return geo;
}

/** Disco macio para a poeira em suspensão. */
function texturaPonto() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,246,232,1)');
  g.addColorStop(0.4, 'rgba(255,240,214,0.5)');
  g.addColorStop(1, 'rgba(255,235,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let texParede = null;
let texChao = null;
let texRugosidade = null;

// Perfis de emolduramento em rodízio. A variação é pequena de propósito: o
// suficiente para a parede não ler como planilha, pouco o bastante para não
// virar bagunça.
const PERFIS = [
  { tamanho: 1.0, moldura: 0.15, paspatur: 0.085 },
  { tamanho: 0.86, moldura: 0.10, paspatur: 0.05 },
  { tamanho: 1.12, moldura: 0.21, paspatur: 0.13 },
  { tamanho: 0.94, moldura: 0.13, paspatur: 0.075 },
];

// --- entrada ----------------------------------------------------------------

const manifesto = await fetch(DATA_URL, { cache: 'no-cache' })
  .then((r) => (r.ok ? r.json() : null))
  .catch(() => null);

if (!manifesto?.photos?.length) {
  $('portaria-linha').textContent = S.museu.semAcervo;
} else {
  setImageExt(manifesto.imageExt);
  aplicarCidades(manifesto);
  prepararPortaria(manifesto);
}

function prepararPortaria(m) {
  ehToque = matchMedia('(pointer: coarse)').matches;
  $('portaria-linha').textContent = S.museu.acervo(m.counts.photos, m.states.length);

  const lista = $('portaria-ajuda');
  lista.replaceChildren();
  for (const linha of ehToque ? S.museu.ajudaToque : S.museu.ajudaMouse) {
    const li = document.createElement('li');
    li.textContent = linha;
    lista.append(li);
  }

  // A escolha de qualidade fica antes da porta porque depois dela não dá para
  // trocar: sombra e pós-produção decidem como o renderizador foi construído.
  const salvo = lembrar('museu.qualidade');
  let escolha = salvo === 'alta' || salvo === 'leve' ? salvo : (ehToque ? 'leve' : 'alta');
  const botoes = [...document.querySelectorAll('[data-qualidade]')];
  const pintar = () => {
    for (const b of botoes) {
      const seu = b.dataset.qualidade;
      b.setAttribute('aria-pressed', String(seu === escolha));
    }
    $('portaria-nota').textContent = S.museu.notaQualidade[escolha];
  };
  for (const b of botoes) {
    b.addEventListener('click', () => {
      escolha = b.dataset.qualidade;
      guardar('museu.qualidade', escolha);
      pintar();
    });
  }
  pintar();

  const botaoSom = $('portaria-som');
  const pintarSom = () => {
    botaoSom.setAttribute('aria-pressed', String(som.ligado));
    botaoSom.textContent = som.ligado ? S.museu.ligado : S.museu.desligado;
  };
  botaoSom.addEventListener('click', () => { som.alternar(); pintarSom(); });
  pintarSom();

  const botao = $('entrar');
  botao.disabled = false;
  botao.addEventListener('click', () => entrar(m, escolha), { once: true });
}

async function entrar(m, qualidade) {
  Q = QUALIDADES[qualidade] ?? QUALIDADES.alta;

  const botao = $('entrar');
  botao.disabled = true;
  botao.textContent = S.museu.abrindo;

  // Antes de qualquer `await`: um AudioContext criado fora do próprio gesto do
  // clique nasce suspenso na política de reprodução automática do navegador.
  som.iniciar();

  // As placas e o texto de parede são canvas com Alfa Slab One e Space Mono. Se
  // a fonte ainda não baixou na hora de pintar, a textura fica com o desenho da
  // fonte de sistema para sempre — canvas não repinta sozinho.
  await Promise.race([document.fonts?.ready ?? Promise.resolve(), espera(2500)]);

  $('portaria').hidden = true;
  $('hud').hidden = false;
  if (ehToque) $('toque').hidden = false;

  montarCena();
  planejar(m);
  montarIndice();
  ligarControles();

  // O laço começa antes da primeira sala existir, de propósito: a cortina leva
  // meio segundo para abrir, e sem nada desenhando por baixo dela o visitante vê
  // preto e depois um salto. Com o laço rodando, a sala já está lá quando a
  // cortina sobe. Tudo dentro dele tolera `salaViva` nula.
  renderizador.setAnimationLoop(laco);
  await irPara(0);

  // Alça de inspeção, só em desenvolvimento. Um museu só pode ser julgado de
  // dentro, e sem isto a única forma de olhar uma parede é caminhar até ela às
  // cegas — mas expor a cena inteira em produção não tem porquê.
  if (['localhost', '127.0.0.1'].includes(location.hostname)) {
    window.__museu = { app, cena, jogador, camera, renderizador, irPara, Q,
      cuidarDasTexturas, escolherRefletores, moverRefletores,
      get filme() { return filme; },
      get sala() { return salaViva; } };
  }
}

// --- cena -------------------------------------------------------------------

function montarCena() {
  cena = new THREE.Scene();
  cena.background = new THREE.Color(0x0A0806);
  // Névoa mais rala que antes: com o salão iluminado, 0,016 transformava o fundo
  // da sala em breu e escondia justamente a profundidade que ele deveria vender.
  cena.fog = new THREE.FogExp2(0x100C08, 0.0115);

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.08, 200);

  renderizador = new THREE.WebGLRenderer({
    canvas: $('cena'),
    antialias: !Q.pos && !ehToque,   // com pós-produção o antisserrilhado é do alvo
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderizador.setSize(innerWidth, innerHeight);
  renderizador.setPixelRatio(Math.min(devicePixelRatio, Q.pixel));

  renderizador.outputColorSpace = THREE.SRGBColorSpace;
  // Com pós-produção a curva é aplicada no último passe, à mão. Deixar as duas
  // ligadas mapearia o tom duas vezes e lavaria a sala inteira.
  renderizador.toneMapping = Q.pos ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  renderizador.toneMappingExposure = 1.05;

  renderizador.shadowMap.enabled = Q.sombras;
  renderizador.shadowMap.type = THREE.PCFSoftShadowMap;

  // Mapa de ambiente: uma caixa com teto luminoso, pré-filtrada. É o que faz o
  // piso encerado devolver a claraboia e a moldura ter lado claro e lado escuro.
  // Sem ele, `roughness` baixo não produz nada e todo material vira plástico.
  try {
    ambiente = ambienteDeGaleria(renderizador);
    cena.environment = ambiente;
  } catch (erro) {
    console.warn('Museu: mapa de ambiente indisponível', erro);
  }

  // Preenchimento difuso, baixo. Quem desenha a sala é o refletor e o ambiente;
  // isto existe só para o canto escuro não virar buraco preto.
  cena.add(new THREE.HemisphereLight(0xFFF4E4, 0x5A5148, 0.26));
  cena.add(new THREE.AmbientLight(0xFFF3E2, 0.05));

  for (let i = 0; i < Q.refletores; i++) {
    // Intensidade baixa, cone largo e queda quadrática. A versão anterior usava
    // 90 num cone estreito a dois metros da parede: virava um borrão branco sem
    // meio-tom nenhum, que é o oposto de luz de galeria.
    const luz = new THREE.SpotLight(0xFFEAD2, 0, 20, Math.PI / 3.4, 0.85, 2);
    luz.castShadow = Q.sombras && i < 2;
    if (luz.castShadow) {
      luz.shadow.mapSize.set(Q.sombraMapa, Q.sombraMapa);
      // Viés apertado e câmera curta: a sombra que interessa é a de 8 cm que a
      // moldura joga na parede, e ela some se o mapa cobrir trinta metros.
      luz.shadow.bias = -0.0004;
      luz.shadow.normalBias = 0.02;
      luz.shadow.camera.near = 0.4;
      luz.shadow.camera.far = 12;
      luz.shadow.radius = 3;
    }
    luz.target = new THREE.Object3D();
    luz.userData.alvo = null;
    cena.add(luz, luz.target);
    refletores.push(luz);
  }

  matEspera = new THREE.MeshStandardMaterial({ color: COR.espera, roughness: 0.9, envMapIntensity: 0.3 });

  if (Q.pos) {
    try {
      filme = new PosProducao(renderizador);
    } catch (erro) {
      // Placa velha, WebGL1 sem float, driver capenga: o museu continua de pé
      // sem brilho nem grão, que é infinitamente melhor que uma tela preta.
      console.warn('Museu: pós-produção indisponível, seguindo sem ela', erro);
      filme = null;
      renderizador.toneMapping = THREE.ACESFilmicToneMapping;
    }
  }

  if (Q.poeira) montarPoeira();

  relogio = new THREE.Clock();
  addEventListener('resize', aoRedimensionar);
  addEventListener('visibilitychange', () => som.retomar());
}

function aoRedimensionar() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderizador.setSize(innerWidth, innerHeight);
  filme?.redimensionar();
}

/**
 * Poeira em suspensão, presa ao visitante. Uma caixa de vinte metros que anda
 * junto e envolve a cada partícula que sai pelo outro lado — trezentos pontos
 * cobrem o museu inteiro sem que nenhum deles exista longe de você.
 *
 * É o efeito mais barato que existe e o que mais convence: ar com corpo é o que
 * diz que há volume entre você e a parede.
 */
function montarPoeira() {
  const n = 320;
  const caixa = new THREE.Vector3(20, 5.2, 15);
  const posicoes = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    posicoes[i * 3] = (Math.random() - 0.5) * caixa.x;
    posicoes[i * 3 + 1] = Math.random() * caixa.y + 0.2;
    posicoes[i * 3 + 2] = (Math.random() - 0.5) * caixa.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posicoes, 3));

  const material = new THREE.PointsMaterial({
    map: texturaPonto(),
    // Menor e mais discreta que a primeira tentativa, que lia como neve caindo
    // dentro do museu em vez de pó suspenso no facho.
    size: 0.028,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  poeira = new THREE.Points(geo, material);
  poeira.frustumCulled = false;
  poeira.userData = { caixa, base: posicoes.slice(), fase: new Float32Array(n).map(() => Math.random() * 100) };
  cena.add(poeira);
}

function moverPoeira(t) {
  if (!poeira) return;
  const { caixa } = poeira.userData;
  const atrib = poeira.geometry.attributes.position;
  const base = poeira.userData.base;
  const fase = poeira.userData.fase;

  for (let i = 0; i < fase.length; i++) {
    const j = i * 3;
    // Subida lenta com deriva lateral. O módulo devolve a partícula ao chão da
    // caixa quando ela passa do teto, e a caixa acompanha o visitante.
    const sobe = (base[j + 1] + t * 0.055) % caixa.y;
    atrib.array[j] = jogador.pos.x + base[j] + Math.sin(t * 0.22 + fase[i]) * 0.35;
    atrib.array[j + 1] = 0.25 + sobe;
    atrib.array[j + 2] = jogador.pos.z + base[j + 2] + Math.cos(t * 0.18 + fase[i]) * 0.35;
  }
  atrib.needsUpdate = true;
}

// --- planta -----------------------------------------------------------------

function planejar(m) {
  const porEstado = new Map(m.states.map((s) => [s.uf, []]));
  for (const p of m.photos) porEstado.get(p.uf)?.push(p);

  m.states.forEach((estado, i) => {
    const fotos = porEstado.get(estado.uf) ?? [];

    // O comprimento sai da capacidade real, medida pelo mesmo gerador que
    // constrói as paredes — e não de uma fórmula paralela. Estimar a capacidade
    // por um lado e gerar a parede por outro foi o que deixou 46 fotos de fora
    // na Bahia: as duas contas nunca se conferiam.
    // Teto de 260 m, e não de 200: com duas fileiras o salão de Pernambuco
    // precisa de 184 m para pendurar as 1.103 fotos. Parar antes deixaria fotos
    // de fora em silêncio, que é o pior desfecho possível para um acervo.
    let comprimento = 30;
    while (comprimento < 260 && capacidade(comprimento) < fotos.length) comprimento += 2;

    app.salas.push({
      indice: i,
      uf: estado.uf,
      nome: estado.nome ?? estado.uf,
      total: fotos.length,
      km: estado.km ?? 0,
      primeira: estado.first,
      ultima: estado.last,
      dias: daysBetween(estado.first, estado.last) ?? 1,
      cheio: diaMaisCheio(fotos),
      cidades: listarCidades(fotos, 4),
      paleta: PALETAS[estado.uf] ?? PALETA_PADRAO,
      fotos,
      comprimento,
    });
  });
}

/** O dia com mais fotos dentro do estado. Sai dos metadados, não de anotação. */
function diaMaisCheio(fotos) {
  const contagem = new Map();
  for (const f of fotos) {
    if (!f.t) continue;
    const d = new Date(f.t);
    const chave = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const item = contagem.get(chave) ?? { n: 0, t: f.t };
    item.n++;
    contagem.set(chave, item);
  }
  let melhor = null;
  for (const item of contagem.values()) if (!melhor || item.n > melhor.n) melhor = item;
  return melhor;
}

/** Quantos quadros cabem num salão deste comprimento. Fonte única da verdade. */
function capacidade(L) {
  let n = 0;
  for (const seg of segmentos(L)) n += pontos(seg).length;
  return n;
}

/** Onde ficam as divisórias, e para que lado sobra a passagem. */
function divisorias(L) {
  const out = [];
  const primeira = SAGUAO + 2.5;
  const ultima = L - SAGUAO - 2.5;
  for (let i = 0; ; i++) {
    const x = primeira + i * ESPACO_DIVISORIA;
    if (x > ultima) break;
    out.push({ x, paraCima: i % 2 === 0 });
  }
  return out;
}

/**
 * Os trechos de parede disponíveis para pendurar, em ordem de percurso.
 * Abstrair a parede num segmento faz laterais e divisórias virarem o mesmo
 * problema — e a serpentina sai de graça, porque os segmentos já saem na
 * ordem em que o visitante os encontra.
 */
function segmentos(L) {
  const meia = LARGURA / 2;
  const segs = [];
  const fundo = LARGURA - DIVISORIA_VAO;
  const divs = divisorias(L);

  for (const d of divs) {
    const z0 = d.paraCima ? -meia : meia;
    const z1 = d.paraCima ? -meia + fundo : meia - fundo;
    segs.push({ tipo: 'divisoria', x: d.x, z0, z1, face: 1 });
    segs.push({ tipo: 'divisoria', x: d.x, z0, z1, face: -1 });
  }

  // Laterais: percorridas por inteiro, uma de ida e outra de volta, respeitando
  // os saguões das duas pontas.
  //
  // Cada lateral leva consigo a lista de divisórias que ENCOSTAM nela. Uma
  // divisória com `paraCima` nasce em z=-meia; a de baixo, em z=+meia. O trecho
  // de parede que ela cobre não pode receber quadro — e quem sabe disso é a
  // planta, não o pendurador.
  const encostamEm = (paraCima) => divs.filter((d) => d.paraCima === paraCima).map((d) => d.x);

  segs.push({ tipo: 'lateral', z: -meia, x0: SAGUAO, x1: L - SAGUAO, face: 1, tapadas: encostamEm(true) });
  segs.push({ tipo: 'lateral', z: meia, x0: L - SAGUAO, x1: SAGUAO, face: -1, tapadas: encostamEm(false) });
  return segs;
}

/**
 * Pontos de pendura, três fileiras.
 *
 * Devolve a posição NA SUPERFÍCIE da parede mais a normal que aponta para
 * dentro do salão. Quem pendura é que empilha moldura, paspatur e tela ao longo
 * dessa normal — um único lugar decide o afastamento.
 *
 * Antes cada tipo de parede calculava o seu, e ambos erravam o sinal: a lateral
 * jogava a foto para fora do prédio (parede em z=+7,5 virava foto em z=+7,59) e
 * a divisória enterrava a foto dentro do bloco de 34 cm. Era a parede vazia.
 */
function pontos(seg) {
  const out = [];

  if (seg.tipo === 'lateral') {
    const dir = Math.sign(seg.x1 - seg.x0) || 1;
    const n = Math.floor(Math.abs(seg.x1 - seg.x0) / PASSO);
    const nz = seg.face;              // +1 na parede z=-meia, -1 na z=+meia
    for (let c = 0; c < n; c++) {
      const x = seg.x0 + dir * (c + 0.5) * PASSO;
      // Coluna atrás de uma divisória não vira quadro: vira quadro pela metade.
      if (seg.tapadas?.some((tx) => Math.abs(x - tx) < RAIO_DIVISORIA)) continue;
      for (const y of FILEIRAS) {
        out.push({ x, y, z: seg.z, nx: 0, nz, giro: nz > 0 ? 0 : Math.PI });
      }
    }
  } else {
    const dir = Math.sign(seg.z1 - seg.z0) || 1;
    const n = Math.floor(Math.abs(seg.z1 - seg.z0) / PASSO);
    const nx = seg.face;
    // A superfície fica meia espessura fora do eixo da divisória.
    const x = seg.x + nx * DIV_MEIA;
    for (let c = 0; c < n; c++) {
      const z = seg.z0 + dir * (c + 0.5) * PASSO;
      for (const y of FILEIRAS) {
        out.push({ x, y, z, nx, nz: 0, giro: nx > 0 ? Math.PI / 2 : -Math.PI / 2 });
      }
    }
  }
  return out;
}

// --- construção de uma sala -------------------------------------------------

function construirSala(sala) {
  const grupo = new THREE.Group();
  const L = sala.comprimento;
  const meia = LARGURA / 2;
  const paleta = sala.paleta;
  const morrer = [];        // o que esta sala criou e vai levar embora consigo

  // O ladrilho destas três vem das UVs de cada geometria, em metros — por isso
  // `escala` aqui é 1. A exceção é a rugosidade, que tem de variar numa escala
  // maior que o grão do concreto para as manchas de cera não virarem chuvisco.
  texParede ??= texturaSuperficie({ base: 244, manchas: 24, forcaMancha: 18, grao: 15, escala: 1 });
  // Grão largo e fraco no piso. Fino e forte lia como carpete, não como
  // concreto — a escala do ruído é o que diz de que material a superfície é.
  texChao ??= texturaSuperficie({ base: 246, manchas: 16, forcaMancha: 22, grao: 10, escala: 1 });
  // Mapa de rugosidade do piso: as manchas de cera. Sem ele o reflexo do
  // refletor é um oval perfeito, que só existe em render.
  texRugosidade ??= texturaSuperficie({ base: 104, manchas: 20, forcaMancha: 90, grao: 26, escala: 0.42, linear: true });

  const matParede = novo(morrer, new THREE.MeshStandardMaterial({
    color: paleta.parede,
    map: texParede,
    bumpMap: texParede,
    bumpScale: 0.55,
    roughness: 0.96,
    metalness: 0,
    envMapIntensity: 0.4,
  }));
  // Rodapé cinza-pedra, fino. A faixa preta grossa de antes cortava a sala ao
  // meio e puxava o olho para o rodapé em vez de para as obras.
  const matRodape = novo(morrer, new THREE.MeshStandardMaterial({
    color: COR.rodape, roughness: 0.5, metalness: 0.05, envMapIntensity: 0.7,
  }));

  // Chão de concreto encerado: o reflexo especular do refletor no piso é metade
  // da sensação de "sala grande", e agora ele existe de verdade porque há mapa
  // de ambiente para refletir.
  const chao = new THREE.Mesh(
    novo(morrer, escalarUV(new THREE.PlaneGeometry(L, LARGURA), L / LADRILHO_CHAO, LARGURA / LADRILHO_CHAO)),
    novo(morrer, new THREE.MeshStandardMaterial({
      color: paleta.chao,
      map: texChao,
      roughnessMap: texRugosidade,
      roughness: 1,
      metalness: 0.12,
      envMapIntensity: 0.85,
    }))
  );
  chao.rotation.x = -Math.PI / 2;
  chao.position.set(L / 2, 0, 0);
  chao.receiveShadow = Q.sombras;
  grupo.add(chao);

  // O teto é a única superfície da sala que nenhuma luz alcança: os refletores
  // apontam para baixo e a claraboia é um material que brilha sem iluminar. Sem
  // um pouco de emissiva ele renderiza preto, e a claraboia deixa de parecer
  // luminária para parecer buraco recortado no escuro.
  const teto = new THREE.Mesh(
    novo(morrer, new THREE.PlaneGeometry(L, LARGURA)),
    novo(morrer, new THREE.MeshStandardMaterial({
      color: paleta.teto,
      emissive: 0x4A4034,
      roughness: 1,
      envMapIntensity: 0.25,
    }))
  );
  teto.rotation.x = Math.PI / 2;
  teto.position.set(L / 2, PE_DIREITO, 0);
  grupo.add(teto);

  claraboia(grupo, morrer, L);
  arquitetura(grupo, morrer, L, meia, matParede, matRodape);
  divisoriasEBancos(grupo, morrer, sala, L, meia, matParede, matRodape);
  portais(grupo, morrer, sala, L);
  textoDeParede(grupo, morrer, sala, L, meia);
  pendurar(grupo, morrer, sala);

  sala.grupo = grupo;
  sala.morrer = morrer;
  cena.add(grupo);
}

/** Marca um recurso como propriedade desta sala, e devolve o próprio recurso. */
function novo(lista, recurso) {
  lista.push(recurso);
  return recurso;
}

/**
 * Claraboia: painéis translúcidos em módulos, atravessados por travessas, e um
 * trilho de luminárias correndo por cima das duas laterais.
 *
 * A cor dos painéis passa de 1 de propósito. Em luz linear isso é o que
 * significa "fonte de luz": o brilho da pós-produção sabe onde estourar, e a
 * curva ACES rola o excesso para o branco sozinha em vez de chapar.
 */
function claraboia(grupo, morrer, L) {
  const matVidro = novo(morrer, new THREE.MeshBasicMaterial());
  matVidro.color.setRGB(2.4, 2.25, 1.98);
  matVidro.fog = false;

  const matTravessa = novo(morrer, new THREE.MeshStandardMaterial({
    color: 0x3A3128, roughness: 0.7, metalness: 0.3, envMapIntensity: 0.8,
  }));
  const modulos = Math.max(2, Math.round(L / 5.5));

  for (let i = 0; i < modulos; i++) {
    const cx = ((i + 0.5) * L) / modulos;
    const painel = new THREE.Mesh(
      novo(morrer, new THREE.PlaneGeometry((L / modulos) * 0.72, LARGURA * 0.46)),
      matVidro
    );
    painel.rotation.x = Math.PI / 2;
    painel.position.set(cx, PE_DIREITO - 0.04, 0);
    grupo.add(painel);

    const travessa = new THREE.Mesh(geoCaixa, matTravessa);
    travessa.scale.set(0.14, 0.12, LARGURA * 0.5);
    travessa.position.set(cx, PE_DIREITO - 0.11, 0);
    grupo.add(travessa);
  }

  // Bordas longas da claraboia, para ela ter contorno em vez de flutuar.
  for (const lado of [-1, 1]) {
    const borda = new THREE.Mesh(geoCaixa, matTravessa);
    borda.scale.set(L, 0.12, 0.16);
    borda.position.set(L / 2, PE_DIREITO - 0.11, lado * LARGURA * 0.23);
    grupo.add(borda);

    // Trilho eletrificado: de onde os refletores fingem sair. Custa duas caixas
    // e responde à pergunta que a luz sem origem sempre deixa no ar.
    const trilho = new THREE.Mesh(geoCaixa, matTravessa);
    trilho.scale.set(L - 1, 0.09, 0.09);
    trilho.position.set(L / 2, PE_DIREITO - 0.42, lado * 4.4);
    grupo.add(trilho);
  }
}

/** Laterais, rodapé, cimalha e as duas testeiras com vão de porta. */
function arquitetura(grupo, morrer, L, meia, matParede, matRodape) {
  const emMetros = (geo, l, a) => escalarUV(geo, l / LADRILHO_PAREDE, a / LADRILHO_PAREDE);

  for (const z of [-meia, meia]) {
    const parede = new THREE.Mesh(
      novo(morrer, emMetros(new THREE.PlaneGeometry(L, PE_DIREITO), L, PE_DIREITO)), matParede);
    parede.position.set(L / 2, PE_DIREITO / 2, z);
    parede.rotation.y = z < 0 ? 0 : Math.PI;
    parede.receiveShadow = Q.sombras;
    grupo.add(parede);

    const rodape = new THREE.Mesh(geoCaixa, matRodape);
    rodape.scale.set(L, 0.12, 0.055);
    rodape.position.set(L / 2, 0.06, z + (z < 0 ? 0.035 : -0.035));
    grupo.add(rodape);

    // Cimalha: filete que fecha a parede acima da pendura. Sem ela a parede
    // sobe sem fim até o teto e a obra parece pequena dentro de um vazio.
    const cimalha = new THREE.Mesh(geoCaixa, matRodape);
    cimalha.scale.set(L, 0.07, 0.05);
    cimalha.position.set(L / 2, CIMALHA, z + (z < 0 ? 0.03 : -0.03));
    grupo.add(cimalha);
  }

  // Testeiras com vão de porta: três painéis em volta do buraco. Um plano
  // inteiro não tem como ter furo, e portal de verdade é o que faz a sala
  // parecer parte de um prédio em vez de uma caixa.
  const ombro = (LARGURA - PORTA_LARG) / 2;
  for (const [x, ry] of [[0, Math.PI / 2], [L, -Math.PI / 2]]) {
    for (const lado of [-1, 1]) {
      const p = new THREE.Mesh(
        novo(morrer, emMetros(new THREE.PlaneGeometry(ombro, PE_DIREITO), ombro, PE_DIREITO)), matParede);
      p.position.set(x, PE_DIREITO / 2, lado * (PORTA_LARG / 2 + ombro / 2));
      p.rotation.y = ry;
      p.receiveShadow = Q.sombras;
      grupo.add(p);
    }
    const alturaVerga = PE_DIREITO - PORTA_ALT;
    const verga = new THREE.Mesh(
      novo(morrer, emMetros(new THREE.PlaneGeometry(PORTA_LARG, alturaVerga), PORTA_LARG, alturaVerga)), matParede
    );
    verga.position.set(x, PORTA_ALT + (PE_DIREITO - PORTA_ALT) / 2, 0);
    verga.rotation.y = ry;
    grupo.add(verga);
  }
}

function divisoriasEBancos(grupo, morrer, sala, L, meia, matParede, matRodape) {
  const fundo = LARGURA - DIVISORIA_VAO;
  const divs = divisorias(L);
  const altDiv = ALTURA_DIVISORIA;

  // Uma geometria só para todas as divisórias da sala, no tamanho real. A caixa
  // unitária esticada dava conta da forma mas não das UVs: as duas faces de
  // 10,8 m recebiam um ladrilho de reboco cada uma, esticado ao longo delas — e
  // são justamente as faces que carregam metade das obras.
  const geoDiv = novo(morrer, escalarUV(
    new THREE.BoxGeometry(DIV_ESPESSURA, altDiv, fundo),
    fundo / LADRILHO_PAREDE,
    altDiv / LADRILHO_PAREDE
  ));

  for (const d of divs) {
    const centroZ = d.paraCima ? -meia + fundo / 2 : meia - fundo / 2;
    const bloco = new THREE.Mesh(geoDiv, matParede);
    bloco.position.set(d.x, altDiv / 2, centroZ);
    bloco.castShadow = Q.sombras;
    bloco.receiveShadow = Q.sombras;
    grupo.add(bloco);

    const rod = new THREE.Mesh(geoCaixa, matRodape);
    rod.scale.set(DIV_ESPESSURA + 0.04, 0.12, fundo);
    rod.position.set(d.x, 0.06, centroZ);
    grupo.add(rod);
  }

  const matBanco = novo(morrer, new THREE.MeshStandardMaterial({
    color: COR.banco, roughness: 0.45, metalness: 0.08, envMapIntensity: 0.7,
  }));

  // Bancos na passagem entre duas divisórias, mais um em cada saguão. Presença
  // humana e escala: sem mobília, o pé-direito de 5,6 m não tem contra o que ser
  // medido e a sala parece uma maquete.
  const lugares = [];
  divs.forEach((d, i) => {
    if (i % 2 || i === divs.length - 1) return;
    lugares.push([d.x + ESPACO_DIVISORIA / 2, d.paraCima ? meia - 2.2 : -meia + 2.2]);
  });
  // Fora do eixo da porta: um banco no meio do vão é uma canelada garantida.
  lugares.push([SAGUAO - 3.4, -3.2], [L - SAGUAO + 3.4, 3.2]);

  // Móvel que se atravessa é pior que móvel nenhum: o banco existe para dar
  // escala, e a escala vai embora no instante em que o visitante passa por
  // dentro dele. A colisão lê esta lista junto com as paredes.
  sala.moveis = [];
  for (const [x, z] of lugares) {
    if (x < 2 || x > L - 2) continue;
    banco(grupo, matBanco, x, z);
    sala.moveis.push({ x, z, rx: 0.31, rz: 0.95 });
  }
}

/** Tampo sobre dois pés — não um bloco. A sombra por baixo é metade do móvel. */
function banco(grupo, material, x, z) {
  const tampo = new THREE.Mesh(geoCaixa, material);
  tampo.scale.set(0.62, 0.09, 1.9);
  tampo.position.set(x, 0.44, z);
  tampo.castShadow = Q.sombras;
  grupo.add(tampo);

  for (const lado of [-1, 1]) {
    const pe = new THREE.Mesh(geoCaixa, material);
    pe.scale.set(0.5, 0.4, 0.1);
    pe.position.set(x, 0.2, z + lado * 0.7);
    pe.castShadow = Q.sombras;
    grupo.add(pe);
  }
}

/**
 * Portas nas duas testeiras: a de trás volta ao estado anterior, a da frente
 * leva ao próximo. Atravessar é o que troca de sala — o índice fica como atalho,
 * não como único caminho. Uma travessia se anda, não se escolhe num menu.
 */
function portais(grupo, morrer, sala, L) {
  const matBatente = novo(morrer, new THREE.MeshStandardMaterial({
    color: COR.ferragem, roughness: 0.4, metalness: 0.35, envMapIntensity: 1.1,
  }));
  sala.portas = [];

  const vizinhos = [
    { x: 0, alvo: sala.indice - 1, sentido: -1 },
    { x: L, alvo: sala.indice + 1, sentido: 1 },
  ];

  for (const v of vizinhos) {
    const destino = app.salas[v.alvo];

    if (!destino) {
      // Sem vizinho, o vão vira parede com placa. O museu tem começo e fim, e um
      // buraco para o vazio denunciaria que não há prédio em volta.
      const tampa = new THREE.Mesh(
        novo(morrer, new THREE.PlaneGeometry(PORTA_LARG, PORTA_ALT)),
        novo(morrer, new THREE.MeshStandardMaterial({ color: sala.paleta.parede, roughness: 0.94, envMapIntensity: 0.4 }))
      );
      tampa.position.set(v.x, PORTA_ALT / 2, 0);
      tampa.rotation.y = v.x === 0 ? Math.PI / 2 : -Math.PI / 2;
      grupo.add(tampa);
      grupo.add(placaDeFim(morrer, v, sala.paleta));
      continue;
    }

    // Batente: duas ombreiras e uma bandeira, em madeira escura.
    for (const lado of [-1, 1]) {
      const ombreira = new THREE.Mesh(geoCaixa, matBatente);
      ombreira.scale.set(0.4, PORTA_ALT + 0.18, 0.22);
      ombreira.position.set(v.x, (PORTA_ALT + 0.18) / 2, lado * (PORTA_LARG / 2 + 0.11));
      ombreira.castShadow = Q.sombras;
      grupo.add(ombreira);
    }
    const bandeira = new THREE.Mesh(geoCaixa, matBatente);
    bandeira.scale.set(0.4, 0.18, PORTA_LARG + 0.44);
    bandeira.position.set(v.x, PORTA_ALT + 0.09, 0);
    grupo.add(bandeira);

    // O vão: a sala seguinte não existe ainda, mas preto absoluto lia como
    // buraco recortado. Um degradê com um resto de luz quente no chão lê como
    // sala acesa lá adiante — que é a promessa que faz o visitante andar.
    const vao = new THREE.Mesh(
      novo(morrer, new THREE.PlaneGeometry(PORTA_LARG, PORTA_ALT)),
      novo(morrer, new THREE.MeshBasicMaterial({ map: novo(morrer, texturaVao(destino.paleta)), fog: false }))
    );
    vao.position.set(v.x + v.sentido * 0.35, PORTA_ALT / 2, 0);
    vao.rotation.y = v.x === 0 ? Math.PI / 2 : -Math.PI / 2;
    grupo.add(vao);

    grupo.add(letreiroDaPorta(morrer, destino, v));
    sala.portas.push({ x: v.x, alvo: v.alvo });
  }
}

/** Degradê do vão: escuro em cima, um resto de luz da sala vizinha embaixo. */
function texturaVao(paleta) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  const cor = new THREE.Color(paleta.luz);
  const hex = `${Math.round(cor.r * 90)},${Math.round(cor.g * 78)},${Math.round(cor.b * 60)}`;
  g.addColorStop(0, '#050403');
  g.addColorStop(0.55, '#0A0806');
  g.addColorStop(1, `rgb(${hex})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Placa acima do vão dizendo para onde aquela porta leva. */
function letreiroDaPorta(morrer, destino, v) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#171209';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(227,161,28,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(7, 7, c.width - 14, c.height - 14);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#E3A11C';
  ctx.font = '400 24px "Space Mono", monospace';
  ctx.fillText(v.sentido > 0 ? S.museu.aSeguir : S.museu.deVolta, c.width / 2, 36);
  ctx.fillStyle = '#EFE7D6';
  ctx.font = `400 ${destino.nome.length > 14 ? 40 : 52}px "Alfa Slab One", Georgia, serif`;
  ctx.fillText(destino.nome.toUpperCase(), c.width / 2, 86);

  const tex = novo(morrer, new THREE.CanvasTexture(c));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Q.aniso;

  const placa = new THREE.Mesh(
    novo(morrer, new THREE.PlaneGeometry(2.6, 0.65)),
    novo(morrer, new THREE.MeshBasicMaterial({ map: tex }))
  );
  placa.position.set(v.x + v.sentido * -0.24, PORTA_ALT + 0.62, 0);
  placa.rotation.y = v.x === 0 ? Math.PI / 2 : -Math.PI / 2;
  return placa;
}

/** A ponta do museu: parede cega com uma linha que explica por quê. */
function placaDeFim(morrer, v, paleta) {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 200;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#171209';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#EFE7D6';
  ctx.font = '400 46px "Alfa Slab One", Georgia, serif';
  ctx.fillText(v.sentido > 0 ? S.museu.fim : S.museu.inicio, c.width / 2, 78);
  ctx.fillStyle = new THREE.Color(paleta.acento).getStyle();
  ctx.font = '400 24px "Space Mono", monospace';
  ctx.fillText(v.sentido > 0 ? S.museu.fimNota : S.museu.inicioNota, c.width / 2, 134);

  const tex = novo(morrer, new THREE.CanvasTexture(c));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Q.aniso;

  const placa = new THREE.Mesh(
    novo(morrer, new THREE.PlaneGeometry(3.2, 1.0)),
    novo(morrer, new THREE.MeshBasicMaterial({ map: tex }))
  );
  placa.position.set(v.x + v.sentido * -0.04, 1.85, 0);
  placa.rotation.y = v.x === 0 ? Math.PI / 2 : -Math.PI / 2;
  return placa;
}

/**
 * Texto de parede: o painel que toda exposição tem logo depois da entrada, com
 * o nome da ala e o que ela reúne.
 *
 * Nada aqui é escrito à mão. Período, dias, quilômetros e dia mais cheio saem
 * dos metadados das fotos que estão penduradas nesta sala — que é a mesma regra
 * do resto do site: o site não conta a viagem, ele lê o que a viagem deixou.
 *
 * Vai nos dois saguões, porque a sala pode ser atravessada nos dois sentidos.
 */
function textoDeParede(grupo, morrer, sala, L, meia) {
  const l = 1380;
  const a = 780;
  const c = document.createElement('canvas');
  c.width = l;
  c.height = a;
  const ctx = c.getContext('2d');

  const acento = new THREE.Color(sala.paleta.acento).getStyle();
  ctx.fillStyle = new THREE.Color(sala.paleta.parede).getStyle();
  ctx.fillRect(0, 0, l, a);

  // Uma sombra de papel: o painel é impresso e colado, não pintado na parede.
  ctx.fillStyle = 'rgba(23,18,9,0.06)';
  ctx.fillRect(0, a - 10, l, 10);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = acento;
  ctx.font = '400 34px "Space Mono", monospace';
  ctx.fillText(S.museu.painel.sala(romano(sala.indice + 1)), 88, 132);

  ctx.fillStyle = '#171209';
  const corpo = sala.nome.length > 14 ? 106 : 142;
  ctx.font = `400 ${corpo}px "Alfa Slab One", Georgia, serif`;
  ctx.fillText(sala.nome.toUpperCase(), 84, 290);

  ctx.fillStyle = acento;
  ctx.fillRect(88, 344, 300, 7);

  ctx.fillStyle = '#171209';
  ctx.font = '400 40px "Space Mono", monospace';
  ctx.fillText(S.museu.painel.periodo(fmtDateLong(sala.primeira), fmtDateLong(sala.ultima)), 88, 448);

  ctx.font = '700 44px "Space Mono", monospace';
  ctx.fillText(S.museu.painel.numeros(sala.dias, Math.round(sala.km), sala.total), 88, 528);

  // Onde, dentro do estado. "Pernambuco" é a ala; "Recife, Olinda, Ipojuca" é o
  // que a ala tem dentro — e é a única linha do painel que responde à pergunta
  // que um visitante realmente faz diante do nome de um estado.
  if (sala.cidades) {
    ctx.fillStyle = '#171209';
    ctx.font = '400 34px "Space Mono", monospace';
    // A lista já vem escrita de `listarCidades`. É dado, como o nome do estado
    // logo acima — não passa por strings.js porque não há o que traduzir nela.
    ctx.fillText(sala.cidades, 88, 596);
  }

  if (sala.cheio) {
    ctx.fillStyle = 'rgba(23,18,9,0.66)';
    ctx.font = '400 30px "Space Mono", monospace';
    ctx.fillText(S.museu.painel.cheio(fmtDateLong(sala.cheio.t), sala.cheio.n), 88, 656);
  }

  ctx.fillStyle = 'rgba(23,18,9,0.4)';
  ctx.font = '400 26px "Space Mono", monospace';
  ctx.fillText(S.museu.painel.assinatura, 88, a - 62);

  const tex = novo(morrer, new THREE.CanvasTexture(c));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Q.aniso;

  // Emissiva no próprio mapa. O painel fica no saguão, onde nenhum refletor
  // alcança — e o refletor não pode ir até lá, porque ele segue as OBRAS. Sem
  // isto, o texto que apresenta a sala é a coisa mais escura da sala, o que é
  // exatamente o contrário do que uma parede de texto existe para fazer.
  const material = novo(morrer, new THREE.MeshStandardMaterial({
    map: tex,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 0.42,
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.35,
  }));
  const geo = novo(morrer, new THREE.PlaneGeometry(4.6, 2.6));

  const painelA = new THREE.Mesh(geo, material);
  painelA.position.set(SAGUAO - 3.3, 2.35, -meia + 0.04);
  painelA.receiveShadow = Q.sombras;
  grupo.add(painelA);

  const painelB = new THREE.Mesh(geo, material);
  painelB.position.set(L - SAGUAO + 3.3, 2.35, meia - 0.04);
  painelB.rotation.y = Math.PI;
  painelB.receiveShadow = Q.sombras;
  grupo.add(painelB);
}

/**
 * Pendura tudo. Moldura, filete, paspatur e vidro são malhas instanciadas para a
 * sala inteira — quatro chamadas de desenho para mil e cem quadros. Só a tela
 * precisa de malha própria, porque cada uma tem a sua textura.
 */
function pendurar(grupo, morrer, sala) {
  const lugares = [];
  for (const seg of segmentos(sala.comprimento)) lugares.push(...pontos(seg));

  const n = Math.min(lugares.length, sala.fotos.length);
  sala.pendurados = n;
  sala.quadros = [];
  if (!n) return;

  const molduras = new THREE.InstancedMesh(
    geoCaixa,
    novo(morrer, new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2, envMapIntensity: 1.0 })),
    n
  );
  // Filete: a fita clara entre a madeira e o paspatur. É a coisa que separa
  // "quadro emoldurado" de "retângulo escuro em volta da foto".
  const filetes = new THREE.InstancedMesh(
    geoPlano,
    novo(morrer, new THREE.MeshStandardMaterial({ roughness: 0.34, metalness: 0.75, envMapIntensity: 1.5 })),
    n
  );
  const paspaturs = new THREE.InstancedMesh(
    geoPlano,
    novo(morrer, new THREE.MeshStandardMaterial({ color: COR.paspatur, roughness: 0.95, envMapIntensity: 0.4 })),
    n
  );

  // A sombra que a moldura joga na parede é o que dá espessura à obra e cola
  // o quadro na superfície. Sem ela o quadro flutua como adesivo.
  molduras.castShadow = Q.sombras;
  molduras.receiveShadow = Q.sombras;
  paspaturs.receiveShadow = Q.sombras;

  // Vidro: só o reflexo, sem difusa nenhuma — cor preta com mistura aditiva quer
  // dizer "só acrescente o que a superfície espelha". É o brilho que atravessa a
  // sala quando você anda de lado na frente da parede.
  let vidros = null;
  if (Q.vidro) {
    vidros = new THREE.InstancedMesh(
      geoPlano,
      novo(morrer, new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0.08,
        metalness: 0,
        envMapIntensity: 1.6,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })),
      n
    );
    vidros.renderOrder = 2;
  }

  const d = new THREE.Object3D();
  const cor = new THREE.Color();

  for (let i = 0; i < n; i++) {
    const foto = sala.fotos[i];

    // A sala quase nunca tem exatamente o número de vagas que tem de fotos: o
    // comprimento cresce de dois em dois metros até caber, e sobra o resto.
    //
    // Preencher as vagas em ordem joga TODA a sobra no fim da última parede, e a
    // última parede é a de volta — o Maranhão ficava com vinte metros de parede
    // nua bem na entrada, que lê como museu inacabado. Espalhando o resto, as
    // vagas viram folgas de um quadro aqui e ali, que é como toda parede de
    // exposição respira de qualquer forma.
    const p = lugares[Math.floor((i * lugares.length) / n)];

    const prop = foto.w && foto.h ? foto.w / foto.h : 0.75;

    // Perfis de moldura em rodízio, mais uma variação de tamanho por obra.
    const perfil = PERFIS[i % PERFIS.length];
    const escala = QUADRO * perfil.tamanho;
    const larg = prop >= 1 ? escala : escala * prop;
    const alt = prop >= 1 ? escala / prop : escala;

    // Tudo se afasta da parede ao longo da normal que veio do ponto. A moldura
    // é uma caixa: seu centro fica a meia profundidade, para que a face de trás
    // encoste na parede em vez de atravessá-la.
    const off = (t) => [p.x + p.nx * t, p.y, p.z + p.nz * t];
    d.rotation.set(0, p.giro, 0);

    let [x, y, z] = off(MOLDURA_FUNDO / 2);
    d.position.set(x, y, z);
    d.scale.set(larg + perfil.moldura, alt + perfil.moldura, MOLDURA_FUNDO);
    d.updateMatrix();
    molduras.setMatrixAt(i, d.matrix);
    molduras.setColorAt(i, cor.setHex(MADEIRAS[i % MADEIRAS.length]));

    [x, y, z] = off(FILETE_FORA);
    d.position.set(x, y, z);
    d.scale.set(larg + (perfil.moldura + perfil.paspatur) / 2, alt + (perfil.moldura + perfil.paspatur) / 2, 1);
    d.updateMatrix();
    filetes.setMatrixAt(i, d.matrix);
    filetes.setColorAt(i, cor.setHex(FILETES[i % FILETES.length]));

    [x, y, z] = off(PASPATUR_FORA);
    d.position.set(x, y, z);
    d.scale.set(larg + perfil.paspatur, alt + perfil.paspatur, 1);
    d.updateMatrix();
    paspaturs.setMatrixAt(i, d.matrix);

    if (vidros) {
      [x, y, z] = off(VIDRO_FORA);
      d.position.set(x, y, z);
      d.scale.set(larg + perfil.paspatur * 0.85, alt + perfil.paspatur * 0.85, 1);
      d.updateMatrix();
      vidros.setMatrixAt(i, d.matrix);
    }

    const [tx, ty, tz] = off(TELA_FORA);
    const tela = new THREE.Mesh(geoPlano, matEspera);
    tela.position.set(tx, ty, tz);
    tela.rotation.y = p.giro;
    tela.scale.set(larg, alt, 1);
    grupo.add(tela);

    sala.quadros.push({
      mesh: tela,
      foto,
      indice: i,
      pos: tela.position.clone(),
      normal: new THREE.Vector3(p.nx, 0, p.nz),
      tex: null,
      material: null,
      pendente: false,
    });
  }

  for (const malha of [molduras, filetes, paspaturs, vidros]) {
    if (!malha) continue;
    malha.instanceMatrix.needsUpdate = true;
    if (malha.instanceColor) malha.instanceColor.needsUpdate = true;
    // A própria malha instanciada guarda buffers na placa: sem `dispose` a
    // matriz de mil e cem instâncias da sala anterior fica lá.
    novo(morrer, malha);
    grupo.add(malha);
  }
}

function destruirSala(sala) {
  if (!sala?.grupo) return;
  for (const q of sala.quadros ?? []) {
    q.tex?.dispose();
    q.material?.dispose();
  }
  // Só o que esta sala criou vai embora. Geometrias e materiais compartilhados
  // — o plano, a caixa, o material de espera, as texturas de reboco — sobrevivem
  // à troca, que é o que torna a troca instantânea da segunda vez em diante.
  for (const recurso of sala.morrer ?? []) recurso.dispose?.();

  cena.remove(sala.grupo);
  sala.grupo = null;
  sala.morrer = null;
  sala.quadros = [];
  app.fila = [];
  app.carregando = 0;
  naMira = null;
  aoAlcance = [];
  malhas = [];
}

// --- troca de sala ----------------------------------------------------------

async function irPara(indice, entrandoPor = 'inicio') {
  const sala = app.salas[indice];
  if (!sala || sala === salaViva) return;

  fecharLupa();

  const cortina = $('cortina');
  cortina.hidden = false;
  requestAnimationFrame(() => cortina.classList.add('is-fechada'));
  som.porta();
  await espera(320);

  destruirSala(salaViva);
  salaViva = sala;
  app.atual = sala;
  construirSala(sala);

  // Entra no saguão, de frente para o salão. Nascer encarando uma divisória a
  // cinco metros é o que fazia a primeira vista ser uma parede branca estourada.
  const pelaFrente = entrandoPor === 'inicio';
  jogador.pos.set(pelaFrente ? 2.6 : sala.comprimento - 2.6, OLHO, 0);
  jogador.vel.set(0, 0, 0);
  jogador.giro = pelaFrente ? -Math.PI / 2 : Math.PI / 2;
  jogador.inclinacao = 0;

  // A luz recomeça apagada e sobe com a sala; herdar a posição da sala anterior
  // acendia um refletor no ar, apontado para nada.
  for (const luz of refletores) { luz.intensity = 0; luz.userData.alvo = null; }

  atualizarHud(sala);
  cuidarDasTexturas();
  escolherRefletores();
  moverRefletores(1);

  cortina.classList.remove('is-fechada');
  await espera(340);
  cortina.hidden = true;
}

function atualizarHud(sala) {
  const alvo = $('hud-sala');
  alvo.replaceChildren();

  const canto = document.createElement('span');
  canto.className = 'hud__canto';
  canto.textContent = romano(sala.indice + 1);
  const nome = document.createElement('span');
  nome.className = 'hud__nome';
  nome.textContent = sala.nome;
  const n = document.createElement('span');
  n.className = 'hud__n';
  n.textContent = S.museu.quadros(sala.pendurados ?? sala.total);
  alvo.append(canto, nome, n);

  // No HUD inteiro, e não só na caixa do nome: a barra de percurso e os botões
  // também bebem desta variável, e são irmãos e não filhos dela.
  $('hud').style.setProperty('--acento', new THREE.Color(sala.paleta.acento).getStyle());

  for (const b of botoesIndice) b.setAttribute('aria-current', String(b.dataset.sala === String(sala.indice)));
}

// --- texturas das fotos -----------------------------------------------------

const carregador = new THREE.TextureLoader();
const frente = new THREE.Vector3();

function cuidarDasTexturas() {
  const sala = salaViva;
  if (!sala?.quadros) return;
  const p = jogador.pos;

  frente.set(-Math.sin(jogador.giro), 0, -Math.cos(jogador.giro));

  for (const q of sala.quadros) {
    const d = q.pos.distanceTo(p);
    // Malha longe não é só invisível: ela ainda entra na lista de desenho todo
    // quadro. Com mil e cem quadros por sala isso se paga.
    q.mesh.visible = d < RAIO_DESCARTE;

    if (d < RAIO_CARGA && !q.tex && !q.pendente) {
      q.pendente = true;
      app.fila.push(q);
    } else if (d > RAIO_DESCARTE && q.tex) {
      q.tex.dispose();
      q.material?.dispose();
      q.tex = null;
      q.material = null;
      q.mesh.material = matEspera;
    }
  }

  // A ordem da fila é por distância descontada da direção do olhar. Sem o
  // desconto, virar de costas para uma parede ainda a carregava antes da parede
  // que você está encarando — e o que você vê é o que precisa estar pronto.
  if (app.fila.length > 1) app.fila.sort((a, b) => prioridade(a, p) - prioridade(b, p));

  while (app.carregando < Q.cargas && app.fila.length) {
    const q = app.fila.shift();
    if (q.pos.distanceTo(p) > RAIO_DESCARTE) { q.pendente = false; continue; }
    app.carregando++;

    carregador.load(
      thumbUrl(q.foto),
      (tex) => {
        app.carregando--;
        q.pendente = false;
        if (!salaViva?.quadros?.includes(q)) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Q.aniso;
        // Emissiva no mesmo mapa: a obra fica legível na penumbra e ainda
        // responde ao refletor. Só emissiva vira adesivo; só difusa some.
        q.tex = tex;
        q.material = new THREE.MeshStandardMaterial({
          map: tex,
          emissive: 0xffffff,
          emissiveMap: tex,
          emissiveIntensity: 0.26,
          roughness: 0.82,
          envMapIntensity: 0.25,
        });
        q.mesh.material = q.material;
      },
      undefined,
      () => { app.carregando--; q.pendente = false; }
    );
  }

  $('carregando').hidden = app.carregando === 0;
}

function prioridade(q, p) {
  const dx = q.pos.x - p.x;
  const dz = q.pos.z - p.z;
  const d = Math.hypot(dx, dz) || 0.0001;
  const alinhamento = (dx * frente.x + dz * frente.z) / d;   // -1 atrás, +1 à frente
  return d - Math.max(0, alinhamento) * 10;
}

// --- luz que segue ----------------------------------------------------------

const aoLado = new THREE.Vector3();

/**
 * Escolhe que obras ganham refletor. Roda cinco vezes por segundo, não sessenta:
 * varrer mil e cem quadros por quadro de animação só para descobrir que os
 * vizinhos continuam os mesmos é o tipo de conta que come um celular.
 *
 * A alocação é estável de propósito. Ordenar por distância e distribuir de novo
 * a cada passada fazia dois refletores trocarem de quadro de ida e de volta
 * enquanto você andava, e o resultado era uma parede piscando. Aqui um refletor
 * só larga a obra que iluminava quando ela sai do conjunto dos vizinhos — e,
 * mesmo então, apaga antes de reacender no lugar novo.
 */
function escolherRefletores() {
  const sala = salaViva;
  if (!sala?.quadros?.length) return;

  const perto = new Set(
    sala.quadros
      .filter((q) => q.pos.distanceTo(jogador.pos) < 13)
      .sort((a, b) => a.pos.distanceTo(jogador.pos) - b.pos.distanceTo(jogador.pos))
      .slice(0, refletores.length)
  );

  const livres = [];
  for (const luz of refletores) {
    if (luz.userData.alvo && perto.has(luz.userData.alvo)) perto.delete(luz.userData.alvo);
    else livres.push(luz);
  }

  const orfas = [...perto];
  for (const luz of livres) {
    // Ainda acesa no alvo antigo: apaga primeiro, troca na passada seguinte.
    if (luz.intensity > 1.5) continue;
    luz.userData.alvo = orfas.shift() ?? null;
  }
}

/** Por quadro: aponta o que está aceso e faz a intensidade subir e descer. */
function moverRefletores(dt) {
  const sala = salaViva;
  if (!sala) return;
  const k = Math.min(1, dt * 5);

  for (const luz of refletores) {
    const alvo = luz.userData.alvo;
    if (!alvo) { luz.intensity += (0 - luz.intensity) * k; continue; }

    // No trilho: alto e recuado 2,2 m da parede, ao longo da normal da obra.
    // De frente a luz achata a parede; em diagonal ela desenha a moldura — e
    // ficar preso à parede, e não ao visitante, é o que faz a poça de luz
    // parecer uma luminária instalada em vez de uma lanterna na testa.
    aoLado.copy(alvo.normal).multiplyScalar(2.2);
    luz.position.set(alvo.pos.x + aoLado.x, PE_DIREITO - 0.42, alvo.pos.z + aoLado.z);
    luz.target.position.copy(alvo.pos);
    luz.target.updateMatrixWorld();
    luz.color.set(sala.paleta.luz);
    luz.intensity += (INTENSIDADE_REFLETOR - luz.intensity) * k;
  }
}

// --- controles --------------------------------------------------------------

function ligarControles() {
  addEventListener('keydown', (e) => {
    if (e.code === 'Tab') { e.preventDefault(); alternarIndice(); return; }

    // Com um painel aberto o teclado é dele. Sem esta guarda, um W apertado
    // enquanto se lê o índice fica registrado e o visitante volta andando.
    if (!$('indice').hidden) {
      if (e.code === 'Escape') alternarIndice(false);
      return;
    }

    if (!$('lupa').hidden) {
      if (e.code === 'Escape') fecharLupa();
      if (e.code === 'ArrowLeft') moverLupa(-1);
      if (e.code === 'ArrowRight') moverLupa(1);
      return;
    }

    teclas.add(e.code);
    if (e.code.startsWith('Shift')) jogador.correndo = true;
    if (e.code === 'KeyE') abrirLupa(naMira);
    if (e.code === 'KeyM') alternarSom();
  });
  addEventListener('keyup', (e) => {
    teclas.delete(e.code);
    if (e.code.startsWith('Shift')) jogador.correndo = false;
  });

  // Perder o travamento do ponteiro esvazia o teclado. Sem isto, sair com Esc
  // enquanto anda deixa o W preso e o visitante entra na parede sozinho.
  addEventListener('blur', soltarTudo);
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement) soltarTudo();
    pintarTravamento();
  });
  // Uma vez agora: ao entrar, o ponteiro ainda não foi travado, e é justamente
  // aí que o aviso de "clique para andar" mais faz falta.
  pintarTravamento();

  const tela = $('cena');
  if (!ehToque) {
    tela.addEventListener('click', () => {
      if (!document.pointerLockElement && $('indice').hidden && $('lupa').hidden) tela.requestPointerLock();
    });
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== tela) return;
      jogador.giro -= e.movementX * 0.0022;
      jogador.inclinacao = clamp(jogador.inclinacao - e.movementY * 0.0022, -1.2, 1.2);
    });
  } else {
    ligarToque(tela);
  }

  $('hud-mapa').addEventListener('click', () => alternarIndice(true));
  $('indice-fechar').addEventListener('click', () => alternarIndice(false));
  $('hud-som').addEventListener('click', alternarSom);
  $('hud-sair').addEventListener('click', () => { location.href = './index.html'; });

  $('placa-ver').addEventListener('click', () => abrirLupa(naMira));
  $('lupa-fechar').addEventListener('click', fecharLupa);
  $('lupa-ant').addEventListener('click', () => moverLupa(-1));
  $('lupa-prox').addEventListener('click', () => moverLupa(1));
  $('lupa').addEventListener('click', (e) => { if (e.target === $('lupa')) fecharLupa(); });

  $('hud-retomar').textContent = S.museu.retomar;
  pintarSomHud();
}

function pintarTravamento() {
  $('hud').classList.toggle('is-solto', !ehToque && !document.pointerLockElement);
}

function soltarTudo() {
  teclas.clear();
  jogador.correndo = false;
  manche.ativo = false;
  manche.id = null;
  manche.x = manche.y = 0;
}

function alternarSom() {
  som.alternar();
  pintarSomHud();
}

function pintarSomHud() {
  const b = $('hud-som');
  b.setAttribute('aria-pressed', String(som.ligado));
  b.classList.toggle('is-mudo', !som.ligado);
  b.title = `${S.museu.som}: ${som.ligado ? S.museu.ligado : S.museu.desligado}`;
}

function ligarToque(tela) {
  const zona = $('manche');
  const polegar = $('manche-polegar');
  const raio = 52;

  zona.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    manche.ativo = true;
    manche.id = t.identifier;
    manche.ox = t.clientX;
    manche.oy = t.clientY;
    e.preventDefault();
  }, { passive: false });

  addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (manche.ativo && t.identifier === manche.id) {
        const dx = clamp(t.clientX - manche.ox, -raio, raio);
        const dy = clamp(t.clientY - manche.oy, -raio, raio);
        manche.x = dx / raio;
        manche.y = dy / raio;
        polegar.style.transform = `translate(${dx}px, ${dy}px)`;
      } else if (olhar.id === t.identifier) {
        jogador.giro -= (t.clientX - olhar.x) * 0.005;
        jogador.inclinacao = clamp(jogador.inclinacao - (t.clientY - olhar.y) * 0.005, -1.2, 1.2);
        olhar.x = t.clientX;
        olhar.y = t.clientY;
      }
    }
    if (manche.ativo || olhar.id !== null) e.preventDefault();
  }, { passive: false });

  const soltar = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === manche.id) {
        manche.ativo = false;
        manche.id = null;
        manche.x = manche.y = 0;
        polegar.style.transform = '';
      }
      if (t.identifier === olhar.id) olhar.id = null;
    }
  };
  addEventListener('touchend', soltar);
  addEventListener('touchcancel', soltar);

  tela.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    if (olhar.id === null) { olhar.id = t.identifier; olhar.x = t.clientX; olhar.y = t.clientY; }
  }, { passive: true });

  const correr = $('correr');
  correr.addEventListener('touchstart', (e) => { jogador.correndo = true; e.preventDefault(); }, { passive: false });
  correr.addEventListener('touchend', () => { jogador.correndo = false; });
}

// --- ver de perto -----------------------------------------------------------

// A miniatura pendurada tem 96 cm e 440 px de largura. De pé, a dois metros, ela
// é um borrão bonito — e um museu em que não dá para chegar perto da obra falhou
// no essencial. Aqui a foto grande entra por cima, com a etiqueta inteira.

let lupaQuadro = null;

function abrirLupa(quadro) {
  if (!quadro || !salaViva) return;
  lupaQuadro = quadro;
  som.toque(true);

  const lupa = $('lupa');
  lupa.hidden = false;
  soltarTudo();
  if (document.pointerLockElement) document.exitPointerLock();
  pintarLupa();
}

function pintarLupa() {
  const q = lupaQuadro;
  if (!q) return;
  const f = q.foto;

  const img = $('lupa-img');
  img.src = fullUrl(f);
  img.alt = [fmtDate(f.t), f.cidade ?? f.uf].filter(Boolean).join(' · ');

  $('lupa-data').textContent = [fmtDate(f.t), fmtTime(f.t)].filter(Boolean).join(' · ');
  // Aqui cabe o nome do estado por extenso: é a tela grande, não a etiqueta.
  $('lupa-local').textContent = [f.cidade, salaViva.nome, f.loc ? S.loc[f.loc] : null]
    .filter(Boolean).join(' · ');
  $('lupa-cam').textContent = f.cam ? S.museu.camera(f.cam) : '';
  $('lupa-pos').textContent = S.museu.lupaPos(q.indice + 1, salaViva.pendurados ?? salaViva.total);
}

function moverLupa(passo) {
  if (!lupaQuadro || !salaViva?.quadros?.length) return;
  const lista = salaViva.quadros;
  const i = clamp(lupaQuadro.indice + passo, 0, lista.length - 1);
  if (i === lupaQuadro.indice) return;
  lupaQuadro = lista[i];
  som.toque();
  pintarLupa();
}

function fecharLupa() {
  const lupa = $('lupa');
  if (lupa.hidden) return;
  lupa.hidden = true;
  $('lupa-img').removeAttribute('src');
  lupaQuadro = null;
}

// --- índice -----------------------------------------------------------------

let botoesIndice = [];

function montarIndice() {
  const lista = $('indice-lista');
  lista.replaceChildren();
  botoesIndice = [];

  app.salas.forEach((sala, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'indice__sala';
    b.dataset.sala = String(i);
    b.style.setProperty('--acento', new THREE.Color(sala.paleta.acento).getStyle());

    const canto = document.createElement('span');
    canto.className = 'indice__canto';
    canto.textContent = romano(i + 1);

    const nome = document.createElement('span');
    nome.className = 'indice__nome';
    nome.textContent = sala.nome;

    const periodo = document.createElement('span');
    periodo.className = 'indice__periodo';
    periodo.textContent = `${fmtDate(sala.primeira)} — ${fmtDate(sala.ultima)}`;

    const n = document.createElement('span');
    n.className = 'indice__n';
    n.textContent = `${fmtNum(sala.total)} fotos`;

    b.append(canto, nome, periodo, n);
    b.addEventListener('click', () => { alternarIndice(false); irPara(i); });
    lista.append(b);
    botoesIndice.push(b);
  });
}

function alternarIndice(forcar) {
  const caixa = $('indice');
  const abrir = forcar ?? caixa.hidden;
  if (abrir) fecharLupa();
  caixa.hidden = !abrir;
  if (abrir) {
    soltarTudo();
    if (document.pointerLockElement) document.exitPointerLock();
  }
}

// --- laço -------------------------------------------------------------------

let desde = 0;
let tempo = 0;
const alvoCamera = new THREE.Vector3();

function laco() {
  const dt = Math.min(relogio.getDelta(), 0.1);
  tempo += dt;

  // Com a lupa aberta o museu congela: o último quadro fica na tela por trás do
  // vidro fosco, e a placa de vídeo para de trabalhar enquanto se olha uma foto.
  if (!$('lupa').hidden) return;

  andar(dt);
  posicionarCamera(dt);
  moverRefletores(dt);
  moverPoeira(tempo);

  desde += dt;
  if (desde > 0.2) {
    desde = 0;
    cuidarDasTexturas();
    escolherRefletores();
    refazerAlcance();
    atualizarPercurso();
  }

  olharObra();

  if (filme) filme.render(cena, camera, dt);
  else renderizador.render(cena, camera);
}

/**
 * Corpo com inércia e passada.
 *
 * A versão anterior ligava e desligava a velocidade no mesmo quadro: você
 * deslizava como uma câmera em trilho, e a cabeça não subia nem descia. São as
 * duas coisas que separam "andar por um lugar" de "sobrevoar uma maquete".
 */
function andar(dt) {
  let frenteEntrada = 0;
  let lado = 0;
  if (teclas.has('KeyW') || teclas.has('ArrowUp')) frenteEntrada += 1;
  if (teclas.has('KeyS') || teclas.has('ArrowDown')) frenteEntrada -= 1;
  if (teclas.has('KeyA') || teclas.has('ArrowLeft')) lado -= 1;
  if (teclas.has('KeyD') || teclas.has('ArrowRight')) lado += 1;
  if (manche.ativo) { frenteEntrada -= manche.y; lado += manche.x; }

  const t = Math.hypot(frenteEntrada, lado);
  const sin = Math.sin(jogador.giro);
  const cos = Math.cos(jogador.giro);

  let alvoX = 0;
  let alvoZ = 0;
  if (t > 0.02) {
    const v = (jogador.correndo ? CORRER : ANDAR) * Math.min(t, 1);
    alvoX = ((-sin * frenteEntrada + cos * lado) / t) * v;
    alvoZ = ((-cos * frenteEntrada - sin * lado) / t) * v;
  }

  const k = 1 - Math.exp(-ACELERACAO * dt);
  jogador.vel.x += (alvoX - jogador.vel.x) * k;
  jogador.vel.z += (alvoZ - jogador.vel.z) * k;

  const velocidade = Math.hypot(jogador.vel.x, jogador.vel.z);
  if (velocidade < 0.01) { jogador.vel.set(0, 0, 0); return; }

  colidir(jogador.pos.x + jogador.vel.x * dt, jogador.pos.z + jogador.vel.z * dt);

  // A passada avança com a distância percorrida, não com o tempo — correr dá
  // passos mais rápidos porque cobre mais chão, e não porque um relógio mudou.
  jogador.fase += velocidade * dt * 2.6;
  const passoAtual = Math.floor(jogador.fase / Math.PI);
  if (passoAtual !== jogador.passoAnterior) {
    jogador.passoAnterior = passoAtual;
    som.passo(clamp(velocidade / CORRER, 0.25, 1));
  }
}

function posicionarCamera(dt) {
  const velocidade = Math.hypot(jogador.vel.x, jogador.vel.z);
  const peso = clamp(velocidade / ANDAR, 0, 1.6);

  // Balanço: sobe e desce no dobro da frequência da passada, e joga o corpo de
  // um pé para o outro na frequência dela. Amplitude pequena de propósito —
  // balanço grande enjoa e ninguém aguenta trinta segundos.
  const sobe = Math.sin(jogador.fase * 2) * 0.026 * peso;
  const balanca = Math.cos(jogador.fase) * 0.02 * peso;

  const sin = Math.sin(jogador.giro);
  const cos = Math.cos(jogador.giro);
  alvoCamera.set(
    jogador.pos.x + cos * balanca,
    jogador.pos.y + sobe,
    jogador.pos.z - sin * balanca
  );
  camera.position.copy(alvoCamera);
  camera.rotation.set(jogador.inclinacao, jogador.giro, Math.sin(jogador.fase) * 0.006 * peso, 'YXZ');

  // Abertura que respira ao correr. Dois graus e meio bastam: a periferia se
  // alarga e a sala parece passar mais rápido do que a velocidade sozinha diz.
  const alvoFov = jogador.correndo && velocidade > ANDAR * 0.8 ? 74.5 : 70;
  if (Math.abs(camera.fov - alvoFov) > 0.02) {
    camera.fov += (alvoFov - camera.fov) * Math.min(1, dt * 4);
    camera.updateProjectionMatrix();
  }
}

function atualizarPercurso() {
  if (!salaViva) return;
  const p = clamp(jogador.pos.x / salaViva.comprimento, 0, 1);
  $('hud-percurso-barra').style.transform = `scaleX(${p.toFixed(3)})`;
}

/**
 * Colisão: paredes do salão e as divisórias, tratadas como retângulos. Sem
 * física — o prédio é ortogonal, então basta testar cada eixo em separado, o
 * que ainda deixa deslizar rente à parede em vez de travar.
 */
function colidir(nx, nz) {
  const sala = salaViva;
  if (!sala) return;
  const L = sala.comprimento;
  const meia = LARGURA / 2;
  const r = 0.42;
  const fundo = LARGURA - DIVISORIA_VAO;
  const divs = divisorias(L);

  const livre = (x, z) => {
    if (z < -meia + r || z > meia - r) return false;

    // Nas testeiras só passa por dentro do vão da porta. Fora dele, parede.
    const noVao = Math.abs(z) < PORTA_LARG / 2 - r * 0.5;
    if (x < r) return noVao && x > -1.4;
    if (x > L - r) return noVao && x < L + 1.4;

    for (const d of divs) {
      if (Math.abs(x - d.x) > DIV_MEIA + r) continue;
      const z0 = d.paraCima ? -meia : meia - fundo;
      const z1 = d.paraCima ? -meia + fundo : meia;
      if (z > z0 - r && z < z1 + r) return false;
    }

    for (const m of sala.moveis ?? []) {
      if (Math.abs(x - m.x) < m.rx + r && Math.abs(z - m.z) < m.rz + r) return false;
    }
    return true;
  };

  if (livre(nx, jogador.pos.z)) jogador.pos.x = nx;
  else jogador.vel.x *= 0.2;

  if (livre(jogador.pos.x, nz)) jogador.pos.z = nz;
  else jogador.vel.z *= 0.2;

  atravessarPorta();
}

/** Passou do batente: troca de sala. */
let trocando = false;
function atravessarPorta() {
  const sala = salaViva;
  if (trocando || !sala?.portas) return;
  for (const porta of sala.portas) {
    const dentro = porta.x === 0 ? jogador.pos.x < 0.35 : jogador.pos.x > sala.comprimento - 0.35;
    if (dentro && Math.abs(jogador.pos.z) < PORTA_LARG / 2) {
      trocando = true;
      // Entra na sala nova pelo lado oposto, como quem atravessa de fato.
      irPara(porta.alvo, porta.x === 0 ? 'fim' : 'inicio').then(() => { trocando = false; });
      return;
    }
  }
}

// --- etiqueta da obra -------------------------------------------------------

const raio = new THREE.Raycaster();
raio.far = 5.5;
const centro = new THREE.Vector2(0, 0);
let naMira = null;
let aoAlcance = [];
let malhas = [];

function refazerAlcance() {
  const sala = salaViva;
  aoAlcance = sala?.quadros?.filter((q) => q.tex && q.pos.distanceTo(jogador.pos) < 7) ?? [];
  malhas = aoAlcance.map((q) => q.mesh);
}

function olharObra() {
  if (!malhas.length) {
    if (naMira) mostrarEtiqueta(null);
    return;
  }
  raio.setFromCamera(centro, camera);
  const bateu = raio.intersectObjects(malhas, false)[0];
  const achado = bateu ? aoAlcance.find((q) => q.mesh === bateu.object) : null;
  if (achado === naMira) return;
  mostrarEtiqueta(achado);
}

function mostrarEtiqueta(quadro) {
  naMira = quadro;
  const placa = $('placa');
  $('hud').classList.toggle('is-mirando', Boolean(quadro));

  if (!quadro) { placa.hidden = true; return; }

  // Cidade primeiro, estado depois, e a procedência da posição no fim. A ordem
  // é a de uma etiqueta de museu: o lugar, e então quanto se sabe sobre ele.
  const f = quadro.foto;
  $('placa-data').textContent = fmtDate(f.t);
  $('placa-local').textContent = [f.cidade, f.uf, f.loc ? S.loc[f.loc] : null]
    .filter(Boolean).join(' · ');
  $('placa-ver').textContent = ehToque ? S.museu.verDePertoToque : S.museu.verDePerto;
  placa.hidden = false;
}

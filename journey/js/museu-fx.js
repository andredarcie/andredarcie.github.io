// Pós-produção do museu, escrita à mão sobre o núcleo do three.
//
// O three só traz composer, bloom e tone mapping de composer nos "addons", que
// este projeto não vendora. São duzentas linhas para reescrever, e sem elas a
// sala fica tecnicamente correta e visualmente morta: a claraboia é um retângulo
// branco chapado em vez de uma fonte de luz, o canto da parede não escurece, e a
// imagem não tem grão nenhum — que é o que denuncia render de exercício.
//
// COMO ISTO SE ENCAIXA NO THREE: ao renderizar para um render target, o three
// desliga o tone mapping e a conversão para sRGB (`toneMapping` só entra quando
// o alvo é a tela). Então a cena chega aqui em luz linear, com valores acima de
// 1 preservados — que é exatamente o que o brilho precisa para saber o que
// estoura. A curva ACES e a codificação sRGB são aplicadas por conta própria no
// último passe, uma única vez.

import * as THREE from 'three';

const VERTICE = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// A mesma curva que o three usa em ACESFilmicToneMapping, copiada para que os
// dois caminhos — com e sem pós-produção — não tenham cores diferentes.
const CURVA = `
vec3 aces(vec3 cor) {
  const mat3 entrada = mat3(
    vec3(0.59719, 0.07600, 0.02840),
    vec3(0.35458, 0.90834, 0.13383),
    vec3(0.04823, 0.01566, 0.83777)
  );
  const mat3 saida = mat3(
    vec3( 1.60475, -0.10208, -0.00327),
    vec3(-0.53108,  1.10813, -0.07276),
    vec3(-0.07367, -0.00605,  1.07602)
  );
  cor = entrada * cor;
  vec3 a = cor * (cor + 0.0245786) - 0.000090537;
  vec3 b = cor * (0.983729 * cor + 0.4329510) + 0.238081;
  return clamp(saida * (a / b), 0.0, 1.0);
}

vec3 paraSRGB(vec3 cor) {
  return mix(pow(cor, vec3(0.41666)) * 1.055 - vec3(0.055), cor * 12.92,
             vec3(lessThanEqual(cor, vec3(0.0031308))));
}
`;

// Passe de brilho: guarda só o que passa do limiar, com joelho macio para a
// transição não virar uma borda dura em volta da claraboia.
const BRILHO = `
uniform sampler2D tCena;
uniform float limiar;
uniform float joelho;
varying vec2 vUv;

void main() {
  vec3 cor = texture2D(tCena, vUv).rgb;
  float luz = dot(cor, vec3(0.2126, 0.7152, 0.0722));
  float peso = smoothstep(limiar, limiar + joelho, luz);
  gl_FragColor = vec4(cor * peso, 1.0);
}
`;

// Borrão gaussiano separável de nove toques em cinco amostras, aproveitando a
// interpolação bilinear da placa. Roda em meia e em um quarto de resolução.
const BORRAO = `
uniform sampler2D tFonte;
uniform vec2 passo;
varying vec2 vUv;

void main() {
  vec3 soma = texture2D(tFonte, vUv).rgb * 0.2270270270;
  soma += texture2D(tFonte, vUv + passo * 1.3846153846).rgb * 0.3162162162;
  soma += texture2D(tFonte, vUv - passo * 1.3846153846).rgb * 0.3162162162;
  soma += texture2D(tFonte, vUv + passo * 3.2307692308).rgb * 0.0702702703;
  soma += texture2D(tFonte, vUv - passo * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(soma, 1.0);
}
`;

const COMPOSICAO = `
uniform sampler2D tCena;
uniform sampler2D tBrilhoPerto;
uniform sampler2D tBrilhoLonge;
uniform float exposicao;
uniform float forcaBrilho;
uniform float vinheta;
uniform float grao;
uniform float franja;
uniform float tempo;
varying vec2 vUv;

${CURVA}

void main() {
  vec2 doCentro = vUv - 0.5;
  float r2 = dot(doCentro, doCentro);

  // Franja cromática só nas bordas: a lente do olho também erra lá, e é o que
  // impede o quadro de parecer recortado em vetor.
  vec2 desvio = doCentro * r2 * franja;
  vec3 cor;
  cor.r = texture2D(tCena, vUv + desvio).r;
  cor.g = texture2D(tCena, vUv).g;
  cor.b = texture2D(tCena, vUv - desvio).b;

  cor += (texture2D(tBrilhoPerto, vUv).rgb * 0.62 +
          texture2D(tBrilhoLonge, vUv).rgb * 0.38) * forcaBrilho;

  cor = aces(cor * exposicao / 0.6);

  // Gradação: sombra puxada para o âmbar frio do concreto, alta para a cal.
  vec3 sombra = cor * vec3(0.96, 0.98, 1.05);
  cor = mix(sombra, cor, smoothstep(0.0, 0.45, dot(cor, vec3(0.33))));

  // Queda vale 1 no centro e 0 no canto. Escrita como 1 menos smoothstep porque
  // smoothstep com a borda de baixo maior que a de cima é indefinida em GLSL.
  float queda = 1.0 - smoothstep(0.08, 0.50, r2);
  cor *= mix(1.0, queda, vinheta);

  // Grão: um valor por pixel por quadro. Sem ele os degradês de parede exibem
  // as faixas de quantização, que é o defeito mais visível numa sala clara.
  float ruido = fract(sin(dot(vUv + fract(tempo), vec2(12.9898, 78.233))) * 43758.5453);
  cor += (ruido - 0.5) * grao;

  gl_FragColor = vec4(paraSRGB(max(cor, 0.0)), 1.0);
}
`;

function alvo(l, a, extras = {}) {
  const rt = new THREE.WebGLRenderTarget(Math.max(2, Math.floor(l)), Math.max(2, Math.floor(a)), {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    ...extras,
  });
  rt.texture.generateMipmaps = false;
  return rt;
}

/**
 * A cadeia inteira. Só há um objeto porque só há uma cadeia: criar, redimensionar
 * e desenhar são as três coisas que quem chama precisa saber.
 */
export class PosProducao {
  constructor(renderizador) {
    this.renderizador = renderizador;
    this.tempo = 0;

    const tamanho = renderizador.getDrawingBufferSize(new THREE.Vector2());
    const l = tamanho.x;
    const a = tamanho.y;

    // MSAA no alvo da cena. Sem isto o `antialias: true` do canvas não serve
    // para nada — ele só vale para o que é desenhado direto na tela.
    this.rtCena = alvo(l, a, { depthBuffer: true, samples: 4 });
    this.rtBrilho = alvo(l / 2, a / 2);
    this.rtPertoA = alvo(l / 2, a / 2);
    this.rtPertoB = alvo(l / 2, a / 2);
    this.rtLongeA = alvo(l / 4, a / 4);
    this.rtLongeB = alvo(l / 4, a / 4);

    this.matBrilho = new THREE.ShaderMaterial({
      uniforms: {
        tCena: { value: this.rtCena.texture },
        // Limiar acima de 1: só a claraboia estoura. Com 0,85 a parede clara
        // inteira entrava no brilho e a sala ficava leitosa, como fotografada
        // através de um vidro sujo.
        limiar: { value: 1.0 },
        joelho: { value: 0.7 },
      },
      vertexShader: VERTICE,
      fragmentShader: BRILHO,
      depthTest: false,
      depthWrite: false,
    });

    this.matBorrao = new THREE.ShaderMaterial({
      uniforms: { tFonte: { value: null }, passo: { value: new THREE.Vector2() } },
      vertexShader: VERTICE,
      fragmentShader: BORRAO,
      depthTest: false,
      depthWrite: false,
    });

    this.matComposicao = new THREE.ShaderMaterial({
      uniforms: {
        tCena: { value: this.rtCena.texture },
        tBrilhoPerto: { value: this.rtPertoB.texture },
        tBrilhoLonge: { value: this.rtLongeB.texture },
        exposicao: { value: 1.05 },
        forcaBrilho: { value: 0.55 },
        vinheta: { value: 0.45 },
        grao: { value: 0.022 },
        // O desvio máximo é franja/4 em UV — dois pixéis no canto de uma tela de
        // 1920. Franja que se enxerga não é lente, é defeito.
        franja: { value: 0.005 },
        tempo: { value: 0 },
      },
      vertexShader: VERTICE,
      fragmentShader: COMPOSICAO,
      depthTest: false,
      depthWrite: false,
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.matBrilho);
    this.quad.frustumCulled = false;
    this.cenaQuad = new THREE.Scene();
    this.cenaQuad.add(this.quad);
    this.cameraQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  redimensionar() {
    const t = this.renderizador.getDrawingBufferSize(new THREE.Vector2());
    this.rtCena.setSize(t.x, t.y);
    this.rtBrilho.setSize(t.x / 2, t.y / 2);
    this.rtPertoA.setSize(t.x / 2, t.y / 2);
    this.rtPertoB.setSize(t.x / 2, t.y / 2);
    this.rtLongeA.setSize(t.x / 4, t.y / 4);
    this.rtLongeB.setSize(t.x / 4, t.y / 4);
  }

  /** Desenha o quadrilátero de tela inteira com um material, para um alvo. */
  passe(material, destino) {
    this.quad.material = material;
    this.renderizador.setRenderTarget(destino);
    this.renderizador.clear();
    this.renderizador.render(this.cenaQuad, this.cameraQuad);
  }

  borrar(origem, destino, dx, dy) {
    this.matBorrao.uniforms.tFonte.value = origem.texture;
    this.matBorrao.uniforms.passo.value.set(dx / destino.width, dy / destino.height);
    this.passe(this.matBorrao, destino);
  }

  render(cena, camera, dt) {
    const r = this.renderizador;

    r.setRenderTarget(this.rtCena);
    r.clear();
    r.render(cena, camera);

    this.passe(this.matBrilho, this.rtBrilho);
    this.borrar(this.rtBrilho, this.rtPertoA, 1, 0);
    this.borrar(this.rtPertoA, this.rtPertoB, 0, 1);
    this.borrar(this.rtPertoB, this.rtLongeA, 1, 0);
    this.borrar(this.rtLongeA, this.rtLongeB, 0, 1);

    this.tempo = (this.tempo + dt) % 1000;
    this.matComposicao.uniforms.tempo.value = this.tempo;
    this.passe(this.matComposicao, null);
  }

  dispose() {
    for (const rt of [this.rtCena, this.rtBrilho, this.rtPertoA, this.rtPertoB,
                      this.rtLongeA, this.rtLongeB]) rt.dispose();
    for (const m of [this.matBrilho, this.matBorrao, this.matComposicao]) m.dispose();
    this.quad.geometry.dispose();
  }
}

/**
 * Mapa de ambiente procedural: uma caixa escura com teto luminoso, passada pelo
 * PMREM. Nenhum arquivo para baixar.
 *
 * É o que faz o piso encerado devolver a claraboia, o dourado da moldura ter
 * direção e o vidro ter para onde refletir. Sem mapa de ambiente, `metalness` e
 * `roughness` baixos não produzem nada — não há o que refletir — e todo material
 * vira plástico fosco, que era o estado anterior desta sala.
 */
export function ambienteDeGaleria(renderizador) {
  const pmrem = new THREE.PMREMGenerator(renderizador);
  const cena = new THREE.Scene();
  const descartar = [];

  const luz = (r, g, b) => {
    const m = new THREE.MeshBasicMaterial();
    m.color.setRGB(r, g, b);
    descartar.push(m);
    return m;
  };

  // ORÇAMENTO DE LUZ: o mapa de ambiente não acende só reflexo — no three ele
  // também entra como luz difusa, e a média de radiância da caixa inteira vira
  // preenchimento em cada superfície da sala. A primeira versão tinha paredes a
  // 0,62 e teto a 3,1, e o resultado foi uma galeria sem sombra nenhuma: piso de
  // concreto renderizando quase branco e nenhuma poça de luz visível.
  //
  // Os valores abaixo somam mais ou menos um terço daquilo, com o teto ainda
  // sete vezes mais claro que as paredes. É a razão entre eles, e não o total,
  // que faz a moldura ter lado claro e lado escuro.
  const caixa = new THREE.BoxGeometry(14, 9, 14);
  descartar.push(caixa);
  const casca = new THREE.Mesh(caixa, luz(0.028, 0.024, 0.02));
  casca.material.side = THREE.BackSide;
  cena.add(casca);

  const plano = new THREE.PlaneGeometry(1, 1);
  descartar.push(plano);

  // Claraboia: a fonte, e a única coisa que os materiais lisos vão espelhar.
  const teto = new THREE.Mesh(plano, luz(1.05, 0.98, 0.86));
  teto.scale.set(10, 10, 1);
  teto.rotation.x = Math.PI / 2;
  teto.position.y = 4.4;
  cena.add(teto);

  // Paredes de cal: o rebote que dá volume às laterais das molduras.
  for (const [x, z, ry] of [[-6.9, 0, Math.PI / 2], [6.9, 0, -Math.PI / 2],
                            [0, -6.9, 0], [0, 6.9, Math.PI]]) {
    const p = new THREE.Mesh(plano, luz(0.14, 0.128, 0.108));
    p.scale.set(13, 8, 1);
    p.position.set(x, 1.2, z);
    p.rotation.y = ry;
    cena.add(p);
  }

  // Piso: escuro, para o reflexo ter contraste em vez de lavar tudo.
  const piso = new THREE.Mesh(plano, luz(0.028, 0.026, 0.024));
  piso.scale.set(13, 13, 1);
  piso.rotation.x = -Math.PI / 2;
  piso.position.y = -4.4;
  cena.add(piso);

  const alvoEnv = pmrem.fromScene(cena, 0.035, 0.1, 60);
  pmrem.dispose();
  for (const d of descartar) d.dispose();

  return alvoEnv.texture;
}

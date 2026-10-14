// Armas, ferimentos e sangue do combate pela Chama Primordial.

// Cada tribo luta com a arma da sua tradição (pela cor do uniforme); quem não tem
// tribo pega um porrete. `reach` é a distância do golpe, `damage` o dano base,
// `interval` o tempo entre golpes, `swing` a duração da animação e `impact` em que
// fração dela o golpe acerta. `knock` empurra a vítima, `bleed` diz quanto o corte
// sangra, `behead` é a chance de o golpe que mata arrancar a cabeça.
// Tempos em segundos de simulação, que no "1×" correm 2× mais rápido que o real:
// com o golpe de .5 a animação durava 0,25 s na tela e não dava para ver (visto
// rodando o jogo). Agora cada golpe leva ~0,45 a 0,6 s reais.
export const WEAPONS = Object.freeze({
  club: { label: 'porrete', reach: 13, damage: 13, interval: 1.35, swing: .95, impact: .58, knock: 5, bleed: .5, behead: 0 },
  spear: { label: 'lança', reach: 22, damage: 11, interval: 1.45, swing: .85, impact: .52, knock: 3, bleed: 1, behead: 0 },
  axe: { label: 'machado de pedra', reach: 12, damage: 19, interval: 1.9, swing: 1.2, impact: .62, knock: 7, bleed: 1.4, behead: .6 }
});
export const WEAPON_TRADITIONS = Object.freeze(['club', 'spear', 'axe']);
// Golpe que chega até aqui além do alcance ainda pega (a vítima recuou um tico).
export const STRIKE_SLACK = 1.4;

// Feridas: cada golpe abre uma (até WOUND_MAX à vista) e elas fecham devagar.
export const WOUND_MAX = 5;
export const WOUND_HEAL = 1 / 25;
// Sangramento: segundos de sangria por ponto de `bleed` da arma, a cada 10 de dano;
// enquanto sangra, perde vida e pinga.
export const BLEED_SECONDS = 2.4;
export const BLEED_MAX = 12;
export const BLEED_DAMAGE = 1.6;
export const BLEED_DRIP = .28;

// Sangue: gotas saltam do golpe com gravidade (unidades do mundo) e viram mancha
// onde caem; a mancha seca e some. Poça grande embaixo de quem morre brigando.
export const BLOOD_GRAVITY = 230;
// Poça do tamanho de um corpo deitado (o boneco tem ~6 de largura): com 15 ela
// engolia a briga inteira. Com 360 manchas o limite estourava antes do fim do
// primeiro dia e as mais velhas sumiam de estalo.
export const BLOOD_DROPS_PER_DAMAGE = .6;
export const BLOOD_STAIN_LIFE = 100;
export const BLOOD_POOL_LIFE = 220;
export const BLOOD_POOL_RADIUS = 7;
export const BLOOD_POOL_GROW = 6;
export const BLOOD_MAX_STAINS = 640;
export const BLOOD_MAX_DROPS = 500;

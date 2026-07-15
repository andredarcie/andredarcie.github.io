/* ══════════════════════════════════════════════════════════════════════════
   Biblioteca de ícones do inspetor de rede neural.

   São ícones vetoriais no estilo Lucide (https://lucide.dev, ISC) — grade de
   24×24, traço de 2 px, cantos e pontas arredondados — EMBUTIDOS aqui para o
   jogo seguir 100% offline (sem CDN, coerente com o resto do projeto).

   Cada entrada é só o MIOLO do SVG (paths/circles). Quem desenha (em main.js)
   embrulha num <g> com viewBox 0 0 24 24, aplica cor via `color`/currentColor e
   escala para o tamanho do quadrado do neurônio. Elementos que precisam de
   preenchimento usam fill="currentColor"; o resto herda stroke="currentColor".

   Módulo clássico (não é type="module"): expõe window.TinyCreaturesIcons, no
   mesmo padrão de sprites.js. Deve carregar ANTES de main.js.
   ══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var ICONS = {
    // — entrada: visão (grupo do cone) —
    eye:
      '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>' +
      '<circle cx="12" cy="12" r="3"/>',

    // — conteúdo enxergado em cada célula do cone —
    crown:                                   // castelo / objetivo
      '<path d="M4.5 17 2.5 6l5.5 4L12 4l3.5 6 5.5-4-2 11Z"/><path d="M4.5 20h15"/>',
    wall:                                    // torre / parede (bloqueio)
      '<rect x="3" y="5" width="18" height="14" rx="1.5"/>' +
      '<path d="M3 12h18M12 5v3.5M8.5 8.5v3.5M15.5 8.5v3.5M12 12v3.5M8.5 15.5v3.5M15.5 15.5v3.5"/>',
    swords:                                  // sentinela (inimigo)
      '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>' +
      '<line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/>' +
      '<line x1="19" y1="21" x2="21" y2="19"/>' +
      '<polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/>' +
      '<line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/>' +
      '<line x1="3" y1="19" x2="5" y2="21"/>',
    alert:                                   // barricada / armadilha (perigo)
      '<path d="M12 3 2 20h20Z"/><path d="M12 9v5"/><path d="M12 17.5h.01"/>',
    leaf:                                    // grama livre
      '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/>' +
      '<path d="M2 21c0-3 1.85-5.36 5.08-6"/>',

    // — entrada: faro (proximidade do objetivo à frente) —
    target:
      '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>' +
      '<circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',

    // — entrada: aleatório —
    dice:
      '<rect x="3" y="3" width="18" height="18" rx="3"/>' +
      '<circle cx="8"  cy="8"  r="1.3" fill="currentColor" stroke="none"/>' +
      '<circle cx="16" cy="8"  r="1.3" fill="currentColor" stroke="none"/>' +
      '<circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>' +
      '<circle cx="8"  cy="16" r="1.3" fill="currentColor" stroke="none"/>' +
      '<circle cx="16" cy="16" r="1.3" fill="currentColor" stroke="none"/>',

    // — viés (entrada constante) —
    plus: '<path d="M12 5v14M5 12h14"/>',

    // — saídas: mover e virar —
    walk:                                    // andar (para a frente)
      '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
    turnLeft:                                // virar à esquerda
      '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a4 4 0 0 1 4 4v7"/>',
    turnRight:                               // virar à direita
      '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a4 4 0 0 0-4 4v7"/>',
    uturn:                                   // meia-volta (180°)
      '<path d="M21 12a9 9 0 1 1-2.6-6.36"/><path d="M21 3.5v4.5h-4.5"/>'
  };

  global.TinyCreaturesIcons = ICONS;
})(typeof window !== 'undefined' ? window : this);

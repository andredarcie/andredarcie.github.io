import { polygonOverlapsRect } from '../core/geometry.js';

// Folga, em pixels, entre o tabuleiro e a borda da tela ou um painel da HUD.
const FRAME_MARGIN = 12;
// Grade inicial de posições testadas (colunas × linhas) e quantos refinamentos em
// volta da melhor.
const GRID_COLUMNS = 15;
const GRID_ROWS = 11;
const REFINE_STEPS = 6;
// Posições que perdem menos que isto do melhor tamanho contam como empate, e no
// empate vence a mais perto do centro: o tabuleiro só sai do meio se ganhar tamanho.
const TIE_SHARE = .015;
const SEARCH_STEPS = 22;

// Onde pôr o tabuleiro na tela e de que tamanho, para aproveitar o máximo: procura a
// posição e o zoom juntos, com a silhueta inteira dentro da tela e sem encostar em
// painel da HUD. Pura geometria em pixels: não sabe de three.js nem de DOM.
export class BoardFraming {
  // `silhouette`: polígono convexo em unidades, y para cima, com (0, 0) dentro dele —
  // é esse ponto que vai para (centro da tela + deslocamento).
  // Devolve { zoom (pixels por unidade), offsetX, offsetY (pixels, y para baixo) }.
  static fit({ width, height, silhouette, obstacles }) {
    const panels = obstacles.map(panel => ({
      left: panel.left - FRAME_MARGIN, top: panel.top - FRAME_MARGIN,
      right: panel.right + FRAME_MARGIN, bottom: panel.bottom + FRAME_MARGIN
    }));
    const bounds = BoardFraming.#bounds(silhouette);
    // Teto: o maior zoom em que a silhueta cabe na tela, ignorando a HUD.
    const ceiling = Math.max(1e-3, Math.min(
      (width - FRAME_MARGIN * 2) / (bounds.right - bounds.left),
      (height - FRAME_MARGIN * 2) / (bounds.top - bounds.bottom)
    ));
    const fits = (zoom, offsetX, offsetY) => {
      const points = silhouette.map(point => ({
        x: width / 2 + offsetX + point.x * zoom,
        y: height / 2 + offsetY - point.y * zoom
      }));
      for (const point of points) {
        if (point.x < FRAME_MARGIN || point.x > width - FRAME_MARGIN ||
          point.y < FRAME_MARGIN || point.y > height - FRAME_MARGIN) return false;
      }
      return panels.every(panel => !polygonOverlapsRect(points, panel));
    };
    // Maior zoom numa posição fixa. Crescer a partir de um ponto de dentro só cobre
    // mais tela, então caber é monótono no zoom e a busca binária serve.
    const largestAt = (offsetX, offsetY) => {
      if (fits(ceiling, offsetX, offsetY)) return ceiling;
      let low = 0, high = ceiling;
      for (let step = 0; step < SEARCH_STEPS; step++) {
        const middle = (low + high) / 2;
        if (fits(middle, offsetX, offsetY)) low = middle; else high = middle;
      }
      return low;
    };

    const tried = [];
    const attempt = (offsetX, offsetY) => {
      const zoom = largestAt(offsetX, offsetY);
      tried.push({ zoom, offsetX, offsetY });
      return zoom;
    };
    // Centro primeiro: sem HUD no caminho ele já é o melhor, e para aí.
    if (attempt(0, 0) >= ceiling) return { zoom: ceiling, offsetX: 0, offsetY: 0 };

    const stepX = width / (GRID_COLUMNS - 1), stepY = height / (GRID_ROWS - 1);
    for (let column = 0; column < GRID_COLUMNS; column++) {
      for (let row = 0; row < GRID_ROWS; row++) {
        attempt(column * stepX - width / 2, row * stepY - height / 2);
      }
    }
    // Refino em volta da melhor posição, com passo cada vez menor.
    let best = tried.reduce((a, b) => (b.zoom > a.zoom ? b : a));
    let reachX = stepX / 2, reachY = stepY / 2;
    for (let step = 0; step < REFINE_STEPS; step++) {
      const center = best;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        attempt(center.offsetX + dx * reachX, center.offsetY + dy * reachY);
      }
      best = tried.reduce((a, b) => (b.zoom > a.zoom ? b : a));
      reachX /= 2;
      reachY /= 2;
    }
    const tie = best.zoom * (1 - TIE_SHARE);
    return tried
      .filter(option => option.zoom >= tie)
      .reduce((a, b) => (Math.hypot(b.offsetX, b.offsetY) < Math.hypot(a.offsetX, a.offsetY) ? b : a));
  }

  static #bounds(polygon) {
    return {
      left: Math.min(...polygon.map(point => point.x)),
      right: Math.max(...polygon.map(point => point.x)),
      bottom: Math.min(...polygon.map(point => point.y)),
      top: Math.max(...polygon.map(point => point.y))
    };
  }
}

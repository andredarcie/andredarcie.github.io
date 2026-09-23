import { Format } from './Format.js';

// O gráfico de linhas da evolução: mudança percentual de cada gene desde o início,
// ao longo do tempo, num eixo que se ajusta ao gene que mais andou.
export class EvolutionPlot {
  #canvas;
  #theme;
  #stats;
  #readings;

  constructor(canvas, theme, geneStatistics, geneReadings) {
    this.#canvas = canvas;
    this.#theme = theme;
    this.#stats = geneStatistics;
    this.#readings = geneReadings;
  }

  draw(traits, visibleGenes) {
    const canvas = this.#canvas;
    const history = this.#stats.history;
    const paint = this.#theme.paint;
    const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
    const pixelRatio = devicePixelRatio || 1;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    const graph = canvas.getContext('2d');
    graph.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    const left = 54, right = 16, top = 27, bottom = 38;
    const plotWidth = Math.max(1, width - left - right);
    const plotHeight = Math.max(1, height - top - bottom);
    const firstTime = history[0].time;
    const lastTime = Math.max(firstTime + 10, history[history.length - 1].time);
    let largestChange = 0;
    for (const trait of traits) {
      if (!visibleGenes.has(trait.key)) continue;
      for (const sample of history) {
        const value = sample.values[trait.key];
        if (value !== null) largestChange = Math.max(largestChange,
          Math.abs(this.#readings.change(value, trait.key)));
      }
    }
    const scale = Math.max(1, Math.ceil(largestChange * 2) / 2);

    graph.strokeStyle = paint.ink;
    graph.lineWidth = 1;
    graph.font = `10px ${this.#theme.bodyFont}`;
    graph.textBaseline = 'middle';
    for (let tick = -2; tick <= 2; tick++) {
      const value = tick * scale / 2;
      const y = top + plotHeight / 2 - value / scale * plotHeight / 2;
      graph.save();
      graph.globalAlpha = tick === 0 ? .35 : .12;
      graph.beginPath();
      graph.moveTo(left, y);
      graph.lineTo(left + plotWidth, y);
      graph.stroke();
      graph.restore();
      graph.fillStyle = paint.ink;
      graph.globalAlpha = .65;
      graph.textAlign = 'right';
      graph.fillText(`${value > 0 ? '+' : ''}${Number.isInteger(value) ? value : value.toFixed(1).replace('.', ',')}`, left - 8, y);
    }
    const xTickCount = width < 360 ? 2 : 4;
    for (let tick = 0; tick <= xTickCount; tick++) {
      const x = left + tick / xTickCount * plotWidth;
      graph.save();
      graph.globalAlpha = .1;
      graph.beginPath();
      graph.moveTo(x, top);
      graph.lineTo(x, top + plotHeight);
      graph.stroke();
      graph.restore();
      graph.fillStyle = paint.ink;
      graph.globalAlpha = .65;
      graph.textAlign = tick === 0 ? 'left' : tick === xTickCount ? 'right' : 'center';
      graph.fillText(Format.clock(firstTime + tick / xTickCount * (lastTime - firstTime)), x, height - 19);
    }
    graph.globalAlpha = .7;
    graph.textAlign = 'left';
    graph.fillText('Δ % desde o início', left, 13);
    graph.globalAlpha = 1;

    for (const trait of traits) {
      if (!visibleGenes.has(trait.key)) continue;
      graph.strokeStyle = trait.color;
      graph.fillStyle = trait.color;
      graph.lineWidth = 2;
      graph.lineJoin = 'round';
      graph.lineCap = 'round';
      graph.beginPath();
      let connected = false, lastPoint = null;
      for (const sample of history) {
        const value = sample.values[trait.key];
        if (value === null) { connected = false; continue; }
        const change = this.#readings.change(value, trait.key);
        const x = left + (sample.time - firstTime) / (lastTime - firstTime) * plotWidth;
        const y = top + plotHeight / 2 - change / scale * plotHeight / 2;
        if (connected) graph.lineTo(x, y);
        else graph.moveTo(x, y);
        connected = true;
        lastPoint = { x, y };
      }
      graph.stroke();
      if (lastPoint) {
        graph.beginPath();
        graph.arc(lastPoint.x, lastPoint.y, 2.5, 0, Math.PI * 2);
        graph.fill();
      }
    }
  }
}

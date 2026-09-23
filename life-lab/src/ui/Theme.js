// As cores e fontes da interface vêm dos tokens do CSS (tokens.css), lidas uma vez.
// Quem desenha pede aqui, em vez de repetir cor no código.
export class Theme {
  constructor(root = document.documentElement) {
    const styles = getComputedStyle(root);
    const color = name => styles.getPropertyValue(`--color-${name}`).trim();
    this.paint = Object.freeze({
      ink: color('ink'), ink2: color('ink-2'), panel: color('panel'), panelStrong: color('panel-strong'),
      field: color('field'), fieldEdge: color('field-edge'), grid: color('grid'), rule: color('rule'),
      accent: color('accent'), accent2: color('accent-2'), shadow: color('shadow'),
      grass: color('grass'), grassLight: color('grass-light'), sleep: color('sleep'),
      water: color('water'), waterLight: color('water-light'),
      life: color('life'), eye: color('eye')
    });
    // Cor do corpo por alelo de pigmento, na ordem de dominância.
    this.pigments = Object.freeze([color('coral'), color('cyan'), color('yellow'), color('lilac')]);
    this.chartColor = index => color(`chart-${index + 1}`);
    this.bodyFont = styles.getPropertyValue('--font-body').trim();
    this.displayFont = styles.getPropertyValue('--font-display').trim();
  }
}

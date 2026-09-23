import {
  VISION, VISION_ANGLE, VISION_ENERGY_LINEAR_COST, VISION_ENERGY_EXTREME_COST,
  VISION_ENERGY_MIN_MULTIPLIER, VISION_ENERGY_MAX_MULTIPLIER, VISION_RANGE_ANGLE_PENALTY
} from '../config/organisms.js';
import { GENE_SPECS } from '../config/genetics.js';

// O custo e os limites do olho: quanto mais longe e mais aberto ele enxerga, mais
// energia gasta, e um alcance extremo não consegue abrir o cone inteiro.
export class VisionPhysiology {
  halfAngle(organism) {
    return organism.genes.visionAngle * Math.PI / 360;
  }

  maximumAngleForRange(range) {
    const rangeSpec = GENE_SPECS.visionRange;
    const angleSpec = GENE_SPECS.visionAngle;
    const rangeProgress = (range - rangeSpec.min) / (rangeSpec.max - rangeSpec.min);
    return angleSpec.max - Math.max(0, Math.min(1, rangeProgress)) * VISION_RANGE_ANGLE_PENALTY;
  }

  energyMultiplier(genes) {
    const visualAreaRatio = (genes.visionRange / VISION) ** 2 *
      (genes.visionAngle / VISION_ANGLE);
    const difference = visualAreaRatio - 1;
    const extremeCost = difference > 0 ? difference ** 2 * VISION_ENERGY_EXTREME_COST : 0;
    return Math.max(VISION_ENERGY_MIN_MULTIPLIER, Math.min(VISION_ENERGY_MAX_MULTIPLIER,
      1 + difference * VISION_ENERGY_LINEAR_COST + extremeCost));
  }
}

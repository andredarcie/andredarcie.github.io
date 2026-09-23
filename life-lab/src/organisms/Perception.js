// O que o bicho enxerga agora: o alcance do gene encolhido pela escuridão (menos
// perto de uma fogueira) e só dentro da abertura do cone, para o lado que ele olha.
export class Perception {
  #sky;
  #vision;
  #firelight;

  // `firelight` responde hasAny() e lightAt(organismo): quem ilumina a noite.
  constructor(skyClock, visionPhysiology, firelight) {
    this.#sky = skyClock;
    this.#vision = visionPhysiology;
    this.#firelight = firelight;
  }

  // Alcance efetivo agora: o gene diz até onde o olho vai com sol, a luz diz o resto.
  sightRange(o) {
    const sight = this.#sky.sight;
    return o.genes.visionRange *
      (this.#firelight.hasAny() ? Math.max(sight, this.#firelight.lightAt(o)) : sight);
  }

  inVision(o, item, radius = 0) {
    const dx = item.x - o.x, dy = item.y - o.y;
    const distance = Math.hypot(dx, dy);
    if (distance - radius > this.sightRange(o)) return false;
    if (distance <= radius) return true;
    const bearing = Math.atan2(dy, dx);
    const angle = Math.abs(Math.atan2(Math.sin(bearing - o.heading), Math.cos(bearing - o.heading)));
    return angle <= this.#vision.halfAngle(o) + Math.asin(Math.min(1, radius / distance));
  }

  // O item visível mais perto (poça conta pela borda, não pelo centro).
  nearest(o, items) {
    let best = null, distance = this.sightRange(o);
    for (const item of items) {
      const radius = item.r || 0;
      const next = Math.max(0, Math.hypot(item.x - o.x, item.y - o.y) - radius);
      if (!this.inVision(o, item, radius)) continue;
      if (next < distance) { best = item; distance = next; }
    }
    return best;
  }
}

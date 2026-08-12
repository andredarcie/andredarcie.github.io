import { fullUrl } from './config.js';
import { S, fmtDate, fmtTime, fmtCoord, fmtNum, daysBetween } from './strings.js';

export class Lightbox {
  constructor(dialog, { img, meta, prev, next, close }) {
    this.dialog = dialog;
    this.img = img;
    this.meta = meta;
    this.photos = [];
    this.index = 0;
    this.journeyStart = null;
    this.journeyDays = null;

    prev.addEventListener('click', () => this.step(-1));
    next.addEventListener('click', () => this.step(1));
    close.addEventListener('click', () => dialog.close());

    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.step(-1);
      if (e.key === 'ArrowRight') this.step(1);
    });

    // Click the backdrop (anywhere outside the figure) to dismiss.
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });

    let startX = null;
    dialog.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    dialog.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 60) this.step(dx < 0 ? 1 : -1);
    });
  }

  /** Permite dizer "dia 47 de 184" em vez de só a data absoluta. */
  setJourney(first, last) {
    this.journeyStart = first;
    this.journeyDays = daysBetween(first, last);
  }

  open(photos, id) {
    this.photos = photos;
    this.index = Math.max(0, photos.findIndex((p) => p.id === id));
    this.show();
    if (!this.dialog.open) this.dialog.showModal();
  }

  step(delta) {
    if (!this.photos.length) return;
    this.index = (this.index + delta + this.photos.length) % this.photos.length;
    this.show();
  }

  show() {
    const p = this.photos[this.index];
    if (!p) return;

    this.img.src = fullUrl(p);
    const onde = p.cidade ?? p.uf;
    this.img.alt = `Foto de ${fmtDate(p.t)}${onde ? ` em ${onde}` : ''}`;

    // Onde a foto cai dentro da viagem — contexto que a data absoluta não dá.
    const dia =
      this.journeyStart && p.t
        ? S.lb.day(daysBetween(this.journeyStart, p.t), this.journeyDays)
        : null;

    const bits = [
      [fmtDate(p.t), fmtTime(p.t)].filter(Boolean).join(' · '),
      dia,
      // Cidade e estado juntos num só campo: "Recife · PE" é um lugar, duas
      // etiquetas separadas seriam dois fatos soltos.
      [p.cidade, p.uf].filter(Boolean).join(' · ') || null,
      fmtCoord(p.lat, p.lon),
      p.loc ? S.loc[p.loc] : null,
      p.cam ?? null,
      S.lb.position(this.index + 1, this.photos.length),
    ].filter(Boolean);

    this.meta.replaceChildren();
    for (const bit of bits) {
      const span = document.createElement('span');
      span.textContent = bit;
      this.meta.append(span);
    }

    // Warm the neighbours so arrowing through feels immediate.
    for (const offset of [1, -1]) {
      const near = this.photos[(this.index + offset + this.photos.length) % this.photos.length];
      if (near) new Image().src = fullUrl(near);
    }
  }
}

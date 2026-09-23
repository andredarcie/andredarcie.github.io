import { GENE_SPECS, GENE_TRAITS, PIGMENT_NAMES } from '../config/genetics.js';
import { Dom } from './Dom.js';
import { Format } from './Format.js';

const STAGE_NAMES = { infant: 'infância', adult: 'adulto', elder: 'idoso' };

// A ficha de um bicho: nome, estado do corpo, família, tribo e cada gene com as duas
// cópias herdadas num medidor.
export class GeneDialog {
  #root;
  #dialog;
  #genetics;
  #tribeNames;
  #rows = new Map();

  constructor(root, genetics, tribeNames) {
    this.#root = root;
    this.#dialog = root.querySelector('#genes-dialog');
    this.#genetics = genetics;
    this.#tribeNames = tribeNames;
    root.querySelector('#genes-close').addEventListener('click', () => this.#dialog.close());
    this.#buildRows();
  }

  get open() {
    return this.#dialog.open;
  }

  show(o) {
    const root = this.#root;
    for (const [key, row] of this.#rows) {
      const { spec } = row;
      const [paternal, maternal] = this.#genetics.haplotypeAverages(o.genome, key);
      const position = value => (value - spec.min) / (spec.max - spec.min);
      row.paternal.style.setProperty('--pos', position(paternal));
      row.maternal.style.setProperty('--pos', position(maternal));
      row.expressed.style.setProperty('--pos', position(o.genes[key]));
      row.link.style.setProperty('--pos', position(Math.min(paternal, maternal)));
      row.link.style.setProperty('--span', Math.abs(position(paternal) - position(maternal)));
      row.value.textContent = Format.geneValue(key, o.genes[key]);
      row.alleles.textContent =
        `pai ${Format.geneValue(key, paternal)} · mãe ${Format.geneValue(key, maternal)}`;
      const description = `expresso ${Format.geneValue(key, o.genes[key])}, ` +
        `${row.alleles.textContent}, faixa possível de ${Format.geneValue(key, spec.min)} ` +
        `a ${Format.geneValue(key, spec.max)}`;
      row.meter.setAttribute('aria-label', description);
      row.meter.title = description;
    }
    const [paternalPigment, maternalPigment] = o.genome.pigment;
    const carrier = paternalPigment === maternalPigment ? ''
      : ` · portador de ${PIGMENT_NAMES[Math.max(paternalPigment, maternalPigment)]}`;
    root.querySelector('#gene-color').textContent = PIGMENT_NAMES[o.genes.pigment] + carrier;
    root.querySelector('#allele-pigment').textContent =
      `pai ${PIGMENT_NAMES[paternalPigment]} · mãe ${PIGMENT_NAMES[maternalPigment]}`;
    // Roupa não é herança: é marca de grupo social, por isso fica fora dos alelos.
    const outfitSwatch = root.querySelector('#outfit-swatch');
    outfitSwatch.style.display = o.outfit ? '' : 'none';
    if (o.outfit) outfitSwatch.style.backgroundColor = o.outfit;
    root.querySelector('#outfit-label').textContent = o.outfit ? 'uniforme da tribo' : 'pelado';
    root.querySelector('#outfit-note').textContent = o.outfit
      ? 'cor da tribo, sorteada quando ela nasceu'
      : 'veste ao entrar numa tribo';
    root.querySelector('#genes-title').textContent = o.name;
    root.querySelector('#gene-identity').textContent = this.#identity(o);
    root.querySelector('#gene-swatch').style.backgroundColor = o.color;
    this.#dialog.showModal();
  }

  #identity(o) {
    const pregnancy = o.pregnancy
      ? ` · grávida ${Math.round(o.pregnancy.elapsed / o.pregnancy.duration * 100)}%`
      : '';
    const tribe = o.band
      ? ` · ${this.#tribeNames.nameOf(o.outfit) || 'tribo'} (${o.band.members.length})` : ' · sem tribo';
    const lineage = o.lineage
      ? ` · ${o.sex === 'male' ? 'filho' : 'filha'} de ${o.lineage.fatherName} e ${o.lineage.motherName}`
      : ' · fundador, sem pais';
    // As barras saíram de cima da cabeça; o estado do corpo fica aqui na ficha,
    // como retrato do momento em que ela foi aberta.
    const condition = ` · vida ${Math.round(o.life)} · fome ${Math.round(o.hunger)}` +
      ` · sede ${Math.round(o.thirst)} · energia ${Math.round(o.energy)}${o.asleep ? ' (dormindo)' : ''}`;
    return `${o.sex === 'male' ? 'Macho' : 'Fêmea'} · ${STAGE_NAMES[o.stage]} · ${Format.age(o.age)} de vida` +
      `${pregnancy}${tribe}${lineage}${condition}`;
  }

  #buildRows() {
    const list = this.#root.querySelector('#gene-list');
    for (const [key, spec] of Object.entries(GENE_SPECS)) {
      const term = document.createElement('dt');
      term.textContent = GENE_TRAITS.find(trait => trait.key === key).label;

      const meter = Dom.create('span', 'allele-meter');
      meter.setAttribute('role', 'img');
      const link = Dom.create('span', 'allele-link');
      const paternal = Dom.create('span', 'allele-mark is-paternal');
      const maternal = Dom.create('span', 'allele-mark is-maternal');
      const expressed = Dom.create('span', 'allele-expressed');
      meter.append(Dom.create('span', 'allele-track'), link, paternal, maternal, expressed);

      const value = Dom.create('span', 'gene-value');
      const alleles = Dom.create('small', 'gene-alleles');
      const detail = document.createElement('dd');
      detail.append(meter, value, alleles);

      const row = Dom.create('div', 'gene-row');
      row.append(term, detail);
      list.append(row);
      this.#rows.set(key, { spec, meter, value, alleles, link, paternal, maternal, expressed });
    }
    // Nem a cor nem a roupa têm medidor: uma é loco com dominância e a outra nem
    // gene é, então as duas vão para o fim da lista, depois do que tem faixa.
    list.append(this.#root.querySelector('#gene-color-row'), this.#root.querySelector('#gene-outfit-row'));
  }
}

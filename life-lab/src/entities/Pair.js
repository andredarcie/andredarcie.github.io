// Casal em aproximação, cortejo ou cópula.
export class Pair {
  constructor(male, female) {
    this.male = male;
    this.female = female;
    this.phase = 'approach';
    this.timer = 0;
    this.orbit = Math.random() * Math.PI * 2;
    this.centerX = 0;
    this.centerY = 0;
  }
}

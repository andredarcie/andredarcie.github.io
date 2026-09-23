// Como números viram texto na interface, em português.
export class Format {
  // Idade em dias do céu; abaixo de um dia fala em horas, que é como se conta filhote.
  static age(days) {
    if (days < 1) return `${Math.floor(days * 24)} h`;
    const whole = Math.floor(days);
    return `${whole} ${whole === 1 ? 'dia' : 'dias'} e ${Math.floor((days - whole) * 24)} h`;
  }

  static speed(value) {
    const compact = Number(value).toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
    return `${compact}×`;
  }

  static geneValue(key, value) {
    if (key === 'visionRange') return `${Math.round(value)} px`;
    if (key === 'visionAngle') return `${Math.round(value)}°`;
    if (key === 'maturity' || key === 'longevity') return `${value.toFixed(1).replace('.', ',')} dias`;
    return `${value.toFixed(2).replace('.', ',')}×`;
  }

  static share(value) {
    return `${value.toFixed(1).replace('.', ',')}%`;
  }

  static clock(seconds) {
    return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' +
      String(Math.floor(seconds % 60)).padStart(2, '0');
  }

  static hourOfDay(hour) {
    const minutes = Math.floor(hour * 60);
    return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
  }
}

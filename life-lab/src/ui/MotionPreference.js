// "Reduzir movimento" do sistema: com ele ligado, animações decorativas param.
export class MotionPreference {
  #query = matchMedia('(prefers-reduced-motion: reduce)');

  get reduced() {
    return this.#query.matches;
  }

  get animate() {
    return !this.#query.matches;
  }
}

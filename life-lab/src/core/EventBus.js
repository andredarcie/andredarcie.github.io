// Barramento de acontecimentos: a simulação anuncia o que aconteceu (nasceu,
// morreu, cabana pronta, amostra de genes) sem saber quem está ouvindo. É o que
// deixa a interface depender da simulação, e nunca o contrário.
export class EventBus {
  #handlers = new Map();

  on(type, handler) {
    if (!this.#handlers.has(type)) this.#handlers.set(type, new Set());
    this.#handlers.get(type).add(handler);
    return () => this.#handlers.get(type)?.delete(handler);
  }

  emit(type, payload) {
    for (const handler of this.#handlers.get(type) ?? []) handler(payload);
  }
}

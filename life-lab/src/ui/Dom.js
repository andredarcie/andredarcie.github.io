// Atalho para montar elementos da interface.
export class Dom {
  static create(tag, className) {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  }
}

/*
 * realce.js — realce de sintaxe Python bem simples (sem bibliotecas).
 *
 * Usado no editor (camada colorida atrás do textarea) e no bloco da solução.
 * Não é um parser completo: reconhece comentários, textos, números, palavras-chave
 * e nomes de função chamados/definidos, o que basta para os desafios.
 *
 * API: window.Realce.html(codigo) -> HTML com <span class="tk-...">
 */
(function () {
  "use strict";

  const PALAVRAS = [
    "def", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or", "is",
    "break", "continue", "pass", "lambda", "class", "try", "except", "finally", "raise",
    "with", "as", "import", "from", "global", "nonlocal", "yield", "del", "assert", "match", "case",
  ];
  const LITERAIS = ["True", "False", "None"];

  // Ordem dos grupos = prioridade: comentário > texto > número > palavra > literal > chamada
  const TOKEN = new RegExp(
    [
      "(#[^\\n]*)",                                                                          // 1 comentário
      "((?:\\b[rRbBfFuU]{1,2})?(?:" +                                                        // 2 texto (com prefixo f, r, b…)
        "\"\"\"[\\s\\S]*?(?:\"\"\"|$)|'''[\\s\\S]*?(?:'''|$)|" +
        "\"(?:[^\"\\\\\\n]|\\\\.)*\"?|'(?:[^'\\\\\\n]|\\\\.)*'?))",
      "(\\b\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?\\b)",                                              // 3 número
      "\\b(" + PALAVRAS.join("|") + ")\\b",                                                   // 4 palavra-chave
      "\\b(" + LITERAIS.join("|") + ")\\b",                                                   // 5 literal
      "([A-Za-z_][\\w]*)(?=\\s*\\()",                                                         // 6 chamada / def
    ].join("|"),
    "g"
  );

  const CLASSES = [null, "tk-comentario", "tk-texto", "tk-numero", "tk-palavra", "tk-literal", "tk-funcao"];

  function escapar(texto) {
    return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function html(codigo) {
    let saida = "";
    let ultimo = 0;
    TOKEN.lastIndex = 0;
    let m;
    while ((m = TOKEN.exec(codigo)) !== null) {
      if (m[0] === "") { TOKEN.lastIndex++; continue; }
      saida += escapar(codigo.slice(ultimo, m.index));
      let classe = null;
      for (let g = 1; g < CLASSES.length; g++) {
        if (m[g] !== undefined) { classe = CLASSES[g]; break; }
      }
      saida += '<span class="' + classe + '">' + escapar(m[0]) + "</span>";
      ultimo = TOKEN.lastIndex;
    }
    return saida + escapar(codigo.slice(ultimo));
  }

  window.Realce = { html: html };
})();

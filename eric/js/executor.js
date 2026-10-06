/*
 * executor.js — roda o código do usuário contra os testes de um desafio.
 *
 * O código roda dentro de um Web Worker criado a partir de um Blob. Isso:
 *   - isola o código da página (ele não enxerga nem quebra a interface);
 *   - permite matar o worker se o código travar (loop infinito) após um tempo limite.
 * Se o navegador não deixar criar o worker, cai para execução direta na página.
 *
 * API: window.Executor.executar(codigo, nomeFuncao, testes) -> Promise<{ erro, resultados }>
 *      window.Executor.formatar(valor) -> texto legível de um valor JS
 */
(function () {
  "use strict";

  const TEMPO_LIMITE_MS = 2000;

  // -------------------------------------------------------------------------
  // As três funções abaixo também rodam DENTRO do worker: são convertidas em
  // texto com toString(). Por isso não podem usar nada definido fora delas.
  // -------------------------------------------------------------------------

  /** Converte um valor JS em texto legível (strings com aspas, arrays, objetos). */
  function formatar(valor, profundidade) {
    profundidade = profundidade || 0;
    if (profundidade > 5) return "…";
    if (valor === undefined) return "undefined";
    if (valor === null) return "null";
    if (typeof valor === "string") return JSON.stringify(valor);
    if (typeof valor === "number") return Object.is(valor, -0) ? "0" : String(valor);
    if (typeof valor === "bigint") return valor + "n";
    if (typeof valor === "function") return "[função]";
    if (Array.isArray(valor)) {
      return "[" + valor.map(function (item) { return formatar(item, profundidade + 1); }).join(", ") + "]";
    }
    if (typeof valor === "object") {
      const chaves = Object.keys(valor);
      if (chaves.length === 0) return "{}";
      return "{ " + chaves.map(function (k) {
        return k + ": " + formatar(valor[k], profundidade + 1);
      }).join(", ") + " }";
    }
    return String(valor);
  }

  /** Igualdade profunda: compara arrays e objetos pelo conteúdo. */
  function iguais(a, b) {
    if (Object.is(a, b)) return true;
    // Números: tolera erro de ponto flutuante (0.1 + 0.2 vs 0.3)
    if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!iguais(a[i], b[i])) return false;
      }
      return true;
    }
    if (a && b && typeof a === "object" && typeof b === "object") {
      const chavesA = Object.keys(a);
      const chavesB = Object.keys(b);
      if (chavesA.length !== chavesB.length) return false;
      for (const k of chavesA) {
        if (!Object.prototype.hasOwnProperty.call(b, k) || !iguais(a[k], b[k])) return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Compila o código do usuário UMA vez e avalia cada chamada de teste no mesmo escopo.
   * Retorna { erro, saidaInicial, resultados: [{ chamada, esperado, recebido, passou, logs }] }.
   */
  function rodarTestes(codigo, nomeFuncao, testes) {
    // console falso: o destino das linhas é trocado a cada teste
    const saida = { linhas: [] };
    function escrever() {
      const partes = [];
      for (let i = 0; i < arguments.length; i++) {
        const arg = arguments[i];
        partes.push(typeof arg === "string" ? arg : formatar(arg));
      }
      saida.linhas.push(partes.join(" "));
    }
    const consoleFalso = { log: escrever, info: escrever, warn: escrever, error: escrever, debug: escrever };

    function descreverErro(erro) {
      if (erro && typeof erro === "object" && "message" in erro) {
        return (erro.name || "Erro") + ": " + erro.message;
      }
      return "Erro: " + String(erro);
    }

    // O código do usuário vira o corpo de uma função. No fim, devolvemos um
    // "avaliador" que usa eval direto e por isso enxerga as declarações dele.
    let avaliar;
    try {
      avaliar = new Function(
        "console",
        codigo + "\n;return function (__chamada__) { return eval(__chamada__); };"
      )(consoleFalso);
    } catch (erro) {
      const prefixo = erro instanceof SyntaxError ? "Erro de sintaxe — " : "Erro ao carregar o código — ";
      return { erro: prefixo + descreverErro(erro), saidaInicial: saida.linhas, resultados: [] };
    }
    const saidaInicial = saida.linhas;

    if (avaliar("typeof " + nomeFuncao) !== "function") {
      return {
        erro: "Não encontrei a função " + nomeFuncao + "(...). Confira se o nome está escrito exatamente assim.",
        saidaInicial: saidaInicial,
        resultados: [],
      };
    }

    const resultados = testes.map(function (teste) {
      saida.linhas = [];
      const r = {
        chamada: teste.chamada,
        esperado: formatar(teste.esperado),
        recebido: "",
        passou: false,
        logs: saida.linhas,
      };
      try {
        const valor = avaliar(teste.chamada);
        r.recebido = formatar(valor);
        r.passou = iguais(valor, teste.esperado);
      } catch (erro) {
        r.recebido = descreverErro(erro);
      }
      return r;
    });

    return { erro: null, saidaInicial: saidaInicial, resultados: resultados };
  }

  // -------------------------------------------------------------------------
  // Montagem do worker
  // -------------------------------------------------------------------------

  const FONTE_WORKER =
    [formatar, iguais, rodarTestes].map(String).join("\n\n") +
    "\n\nself.onmessage = function (e) {\n" +
    "  var d = e.data;\n" +
    "  var resposta;\n" +
    "  try { resposta = rodarTestes(d.codigo, d.funcao, d.testes); }\n" +
    "  catch (erro) { resposta = { erro: 'Erro inesperado — ' + (erro && erro.message || erro), saidaInicial: [], resultados: [] }; }\n" +
    "  self.postMessage(resposta);\n" +
    "};\n";

  let urlWorker = null;
  function obterUrlWorker() {
    if (!urlWorker) {
      urlWorker = URL.createObjectURL(new Blob([FONTE_WORKER], { type: "text/javascript" }));
    }
    return urlWorker;
  }

  /** Execução direta na página — só usada se Web Workers não estiverem disponíveis. */
  function executarSemWorker(codigo, nomeFuncao, testes) {
    try {
      return Promise.resolve(rodarTestes(codigo, nomeFuncao, testes));
    } catch (erro) {
      return Promise.resolve({ erro: "Erro inesperado — " + (erro && erro.message), saidaInicial: [], resultados: [] });
    }
  }

  function executar(codigo, nomeFuncao, testes) {
    let worker;
    try {
      worker = new Worker(obterUrlWorker());
    } catch (e) {
      return executarSemWorker(codigo, nomeFuncao, testes);
    }

    return new Promise(function (resolver) {
      let terminou = false;
      function finalizar(resultado) {
        if (terminou) return;
        terminou = true;
        clearTimeout(relogio);
        worker.terminate();
        resolver(resultado);
      }

      const relogio = setTimeout(function () {
        finalizar({
          erro: "Tempo esgotado: seu código demorou mais de " + (TEMPO_LIMITE_MS / 1000) +
                " segundos. Provavelmente há um loop infinito — confira a condição de parada dos seus loops.",
          saidaInicial: [],
          resultados: [],
        });
      }, TEMPO_LIMITE_MS);

      worker.onmessage = function (e) { finalizar(e.data); };
      worker.onerror = function (e) {
        e.preventDefault();
        finalizar({ erro: "Erro — " + (e.message || "falha ao executar o código"), saidaInicial: [], resultados: [] });
      };

      worker.postMessage({ codigo: codigo, funcao: nomeFuncao, testes: testes });
    });
  }

  window.Executor = { executar: executar, formatar: formatar };
})();

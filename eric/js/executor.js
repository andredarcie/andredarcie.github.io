/*
 * executor.js — roda o código Python do usuário contra os testes de um desafio.
 *
 * O Python é o Pyodide (CPython compilado para WebAssembly), carregado de uma CDN
 * dentro de um Web Worker criado a partir de um Blob. Isso:
 *   - isola o código da página (ele não enxerga nem quebra a interface);
 *   - permite matar o worker se o código travar (loop infinito) após um tempo limite.
 * Carregar o Pyodide leva alguns segundos, então o worker é reaproveitado entre
 * execuções e só é recriado quando precisa ser morto (tempo esgotado ou falha).
 *
 * API: window.Executor.preparar()                        -> começa a carregar o Python
 *      window.Executor.carregado()                       -> true se o Python já está pronto
 *      window.Executor.executar(codigo, funcao, testes)  -> Promise<{ erro, saidaInicial, resultados }>
 */
(function () {
  "use strict";

  const TEMPO_LIMITE_MS = 3000;
  const URL_PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

  // -------------------------------------------------------------------------
  // Lado Python: compila o código do usuário UMA vez e avalia cada chamada de
  // teste no mesmo namespace. Recebe e devolve JSON.
  // -------------------------------------------------------------------------
  const FONTE_PYTHON = [
    "import ast, json, math",
    "from contextlib import redirect_stdout, redirect_stderr",
    "",
    "ARQUIVO = 'solucao.py'",
    "LIMITE_SAIDA = 20000  # caracteres de print guardados por fase",
    "LIMITE_REPR = 500",
    "",
    "class Saida:",
    "    def __init__(self):",
    "        self.partes = []",
    "        self.tamanho = 0",
    "    def write(self, s):",
    "        if self.tamanho < LIMITE_SAIDA:",
    "            self.partes.append(s)",
    "        self.tamanho += len(s)",
    "        return len(s)",
    "    def flush(self):",
    "        pass",
    "    def linhas(self):",
    "        texto = ''.join(self.partes)[:LIMITE_SAIDA]",
    "        if self.tamanho > LIMITE_SAIDA:",
    "            texto += '\\n… (saída cortada)'",
    "        linhas = texto.split('\\n')",
    "        if linhas and linhas[-1] == '':",
    "            linhas.pop()",
    "        return linhas",
    "",
    "def mostrar(valor):",
    "    try:",
    "        texto = repr(valor)",
    "    except Exception:",
    "        texto = '<valor sem representação>'",
    "    return texto if len(texto) <= LIMITE_REPR else texto[:LIMITE_REPR] + '…'",
    "",
    "def iguais(a, b):",
    "    # bool é subclasse de int em Python: True não pode passar por 1",
    "    if isinstance(a, bool) or isinstance(b, bool):",
    "        return type(a) is type(b) and a == b",
    "    if isinstance(a, (int, float)) and isinstance(b, (int, float)):",
    "        if isinstance(a, int) and isinstance(b, int):",
    "            return a == b",
    "        # tolera erro de ponto flutuante (0.1 + 0.2 vs 0.3)",
    "        return math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-9)",
    "    if type(a) is not type(b):",
    "        return False",
    "    if isinstance(a, (list, tuple)):",
    "        return len(a) == len(b) and all(iguais(x, y) for x, y in zip(a, b))",
    "    if isinstance(a, dict):",
    "        return a.keys() == b.keys() and all(iguais(a[k], b[k]) for k in a)",
    "    return a == b",
    "",
    "def descrever_erro(erro):",
    "    linha = None",
    "    tb = erro.__traceback__",
    "    while tb is not None:",
    "        if tb.tb_frame.f_code.co_filename == ARQUIVO:",
    "            linha = tb.tb_lineno",
    "        tb = tb.tb_next",
    "    texto = type(erro).__name__",
    "    if str(erro):",
    "        texto += ': ' + str(erro)",
    "    if linha is not None:",
    "        texto += ' (linha ' + str(linha) + ')'",
    "    return texto",
    "",
    "def normalizar_nome(nome):",
    "    return nome.replace('_', '').lower()",
    "",
    "def rodar_testes(codigo, funcao, testes_json):",
    "    testes = json.loads(testes_json)",
    "    resposta = {'erro': None, 'saidaInicial': [], 'resultados': []}",
    "",
    "    try:",
    "        compilado = compile(codigo, ARQUIVO, 'exec')",
    "    except SyntaxError as erro:",
    "        tipo = 'Erro de indentação' if isinstance(erro, IndentationError) else 'Erro de sintaxe'",
    "        resposta['erro'] = tipo + ' — linha ' + str(erro.lineno) + ': ' + str(erro.msg)",
    "        return json.dumps(resposta, ensure_ascii=False)",
    "",
    "    ns = {'__name__': '__main__', '__builtins__': __builtins__}",
    "    saida = Saida()",
    "    try:",
    "        with redirect_stdout(saida), redirect_stderr(saida):",
    "            exec(compilado, ns)",
    "    except BaseException as erro:",
    "        resposta['saidaInicial'] = saida.linhas()",
    "        resposta['erro'] = 'Erro ao carregar o código — ' + descrever_erro(erro)",
    "        return json.dumps(resposta, ensure_ascii=False)",
    "    resposta['saidaInicial'] = saida.linhas()",
    "",
    "    if not callable(ns.get(funcao)):",
    "        parecido = [n for n in ns if n != funcao and normalizar_nome(n) == normalizar_nome(funcao)]",
    "        msg = 'Não encontrei a função ' + funcao + '(...). Confira se o nome está escrito exatamente assim.'",
    "        if parecido:",
    "            msg += ' Encontrei ' + parecido[0] + ' — em Python o nome precisa ser idêntico, com os _ e minúsculas.'",
    "        resposta['erro'] = msg",
    "        return json.dumps(resposta, ensure_ascii=False)",
    "",
    "    for teste in testes:",
    "        esperado = ast.literal_eval(teste['esperado'])",
    "        r = {'chamada': teste['chamada'], 'esperado': mostrar(esperado), 'recebido': '', 'passou': False, 'logs': []}",
    "        saida = Saida()",
    "        try:",
    "            with redirect_stdout(saida), redirect_stderr(saida):",
    "                valor = eval(compile(teste['chamada'], '<teste>', 'eval'), ns)",
    "            r['recebido'] = mostrar(valor)",
    "            r['passou'] = iguais(valor, esperado)",
    "        except RecursionError:",
    "            r['recebido'] = 'RecursionError: recursão sem fim (a função chama a si mesma sem parar)'",
    "        except BaseException as erro:",
    "            r['recebido'] = descrever_erro(erro)",
    "        r['logs'] = saida.linhas()",
    "        resposta['resultados'].append(r)",
    "",
    "    return json.dumps(resposta, ensure_ascii=False)",
  ].join("\n");

  // -------------------------------------------------------------------------
  // Fonte do worker: carrega o Pyodide, define o lado Python e atende pedidos.
  // -------------------------------------------------------------------------
  const FONTE_WORKER =
    "var URL_PYODIDE = " + JSON.stringify(URL_PYODIDE) + ";\n" +
    "var FONTE_PYTHON = " + JSON.stringify(FONTE_PYTHON) + ";\n" +
    "var rodar = null;\n" +
    "(async function () {\n" +
    "  try {\n" +
    "    importScripts(URL_PYODIDE + 'pyodide.js');\n" +
    "    var pyodide = await loadPyodide({ indexURL: URL_PYODIDE });\n" +
    "    pyodide.runPython(FONTE_PYTHON);\n" +
    "    rodar = pyodide.globals.get('rodar_testes');\n" +
    "    self.postMessage({ tipo: 'pronto' });\n" +
    "  } catch (erro) {\n" +
    "    self.postMessage({ tipo: 'falha', erro: String(erro && erro.message || erro) });\n" +
    "  }\n" +
    "})();\n" +
    "self.onmessage = function (e) {\n" +
    "  var d = e.data;\n" +
    "  var resposta;\n" +
    "  try { resposta = JSON.parse(rodar(d.codigo, d.funcao, JSON.stringify(d.testes))); }\n" +
    "  catch (erro) { resposta = { erro: 'Erro inesperado — ' + (erro && erro.message || erro), saidaInicial: [], resultados: [] }; }\n" +
    "  self.postMessage({ tipo: 'resultado', resposta: resposta });\n" +
    "};\n";

  let urlWorker = null;
  function obterUrlWorker() {
    if (!urlWorker) {
      urlWorker = URL.createObjectURL(new Blob([FONTE_WORKER], { type: "text/javascript" }));
    }
    return urlWorker;
  }

  // Worker atual e a promessa de que ele terminou de carregar o Python
  let worker = null;
  let prontoPromessa = null;
  let estaPronto = false;

  function descartarWorker() {
    if (worker) worker.terminate();
    worker = null;
    prontoPromessa = null;
    estaPronto = false;
  }

  /** Cria o worker (se ainda não existe) e devolve uma promessa que resolve quando o Python está pronto. */
  function preparar() {
    if (prontoPromessa) return prontoPromessa;
    try {
      worker = new Worker(obterUrlWorker());
    } catch (e) {
      worker = null;
      return Promise.reject(new Error("este navegador não permitiu criar um Web Worker"));
    }
    const w = worker;
    prontoPromessa = new Promise(function (resolver, rejeitar) {
      w.onmessage = function (e) {
        if (e.data.tipo === "pronto") { estaPronto = true; resolver(w); }
        else if (e.data.tipo === "falha") rejeitar(new Error(e.data.erro));
      };
      w.onerror = function (e) {
        e.preventDefault();
        rejeitar(new Error(e.message || "falha ao iniciar o worker"));
      };
    });
    // Falhou ao carregar (ex.: sem internet): a próxima execução tenta de novo do zero
    prontoPromessa.catch(function () { if (worker === w) descartarWorker(); });
    return prontoPromessa;
  }

  function erroCarregamento(erro) {
    return {
      erro: "Não consegui carregar o Python (Pyodide) — " + (erro && erro.message || erro) +
            ". Ele vem da internet na primeira vez; confira a conexão e tente de novo.",
      saidaInicial: [],
      resultados: [],
    };
  }

  function executar(codigo, nomeFuncao, testes) {
    return preparar().then(function (w) {
      return new Promise(function (resolver) {
        let terminou = false;
        function finalizar(resultado) {
          if (terminou) return;
          terminou = true;
          clearTimeout(relogio);
          resolver(resultado);
        }

        // O relógio só começa depois que o Python está carregado
        const relogio = setTimeout(function () {
          descartarWorker();
          preparar().catch(function () {}); // já recarrega para a próxima tentativa
          finalizar({
            erro: "Tempo esgotado: seu código demorou mais de " + (TEMPO_LIMITE_MS / 1000) +
                  " segundos. Provavelmente há um loop infinito — confira a condição de parada dos seus while.",
            saidaInicial: [],
            resultados: [],
          });
        }, TEMPO_LIMITE_MS);

        w.onmessage = function (e) {
          if (e.data.tipo === "resultado") finalizar(e.data.resposta);
        };
        w.onerror = function (e) {
          e.preventDefault();
          descartarWorker();
          finalizar({ erro: "Erro — " + (e.message || "falha ao executar o código"), saidaInicial: [], resultados: [] });
        };

        w.postMessage({ codigo: codigo, funcao: nomeFuncao, testes: testes });
      });
    }, erroCarregamento);
  }

  window.Executor = {
    preparar: function () { preparar().catch(function () {}); },
    carregado: function () { return estaPronto; },
    executar: executar,
  };
})();

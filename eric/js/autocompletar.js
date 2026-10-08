/*
 * autocompletar.js — sugestões de código Python enquanto se digita no editor.
 *
 * Sugere palavras-chave, funções embutidas (com a assinatura), métodos de
 * str/list/dict depois de um ponto e os nomes já usados no próprio código.
 * Não analisa tipos: depois de "x." mostra os métodos de todos os tipos básicos.
 *
 * API: window.Autocompletar.anexar(campo, area, inserir) -> { teclar(e), aoDigitar(e), fechar() }
 *   campo    o <textarea> do editor
 *   area     o elemento posicionado onde a lista flutua (o mesmo pai do textarea)
 *   inserir  função que insere texto no lugar da seleção (mantém o Ctrl+Z)
 */
(function () {
  "use strict";

  const MAX_ITENS = 8;

  // Palavras-chave: o texto inserido já traz o espaço ou os dois-pontos que sempre vêm depois
  const PALAVRAS = [
    ["def", "def "], ["return", "return "], ["if", "if "], ["elif", "elif "], ["else", "else:"],
    ["for", "for "], ["while", "while "], ["in", "in "], ["not", "not "], ["and", "and "],
    ["or", "or "], ["is", "is "], ["break", "break"], ["continue", "continue"], ["pass", "pass"],
    ["lambda", "lambda "], ["import", "import "], ["from", "from "], ["as", "as "],
    ["try", "try:"], ["except", "except "], ["finally", "finally:"], ["raise", "raise "],
    ["class", "class "], ["with", "with "], ["global", "global "], ["nonlocal", "nonlocal "],
    ["yield", "yield "], ["del", "del "], ["assert", "assert "],
    ["True", "True"], ["False", "False"], ["None", "None"],
  ];

  // Funções embutidas: [nome, parâmetros mostrados]. "" = chamada sem argumentos
  const EMBUTIDAS = [
    ["print", "*valores"], ["len", "obj"], ["range", "início, fim, passo"], ["str", "x"],
    ["int", "x"], ["float", "x"], ["bool", "x"], ["list", "iterável"], ["dict", ""],
    ["set", "iterável"], ["tuple", "iterável"], ["abs", "x"], ["min", "a, b, …"], ["max", "a, b, …"],
    ["sum", "iterável"], ["sorted", "iterável"], ["reversed", "sequência"], ["enumerate", "iterável"],
    ["zip", "a, b"], ["map", "fn, iterável"], ["filter", "fn, iterável"], ["round", "x, casas"],
    ["isinstance", "obj, tipo"], ["type", "obj"], ["input", "mensagem"], ["any", "iterável"],
    ["all", "iterável"], ["chr", "código"], ["ord", "caractere"], ["divmod", "a, b"], ["pow", "base, exp"],
  ];

  // Métodos: [nome, parâmetros, tipo]
  const METODOS = [
    ["upper", "", "str"], ["lower", "", "str"], ["strip", "", "str"], ["lstrip", "", "str"],
    ["rstrip", "", "str"], ["split", "sep", "str"], ["join", "iterável", "str"], ["replace", "velho, novo", "str"],
    ["find", "sub", "str"], ["startswith", "prefixo", "str"], ["endswith", "sufixo", "str"],
    ["isdigit", "", "str"], ["isalpha", "", "str"], ["isspace", "", "str"], ["isupper", "", "str"],
    ["islower", "", "str"], ["title", "", "str"], ["capitalize", "", "str"], ["format", "*valores", "str"],
    ["append", "x", "list"], ["extend", "iterável", "list"], ["insert", "i, x", "list"], ["pop", "i", "list"],
    ["remove", "x", "list"], ["index", "x", "list"], ["count", "x", "list · str"], ["sort", "", "list"],
    ["reverse", "", "list"], ["copy", "", "list · dict"], ["clear", "", "list · dict"],
    ["get", "chave, padrão", "dict"], ["keys", "", "dict"], ["values", "", "dict"], ["items", "", "dict"],
    ["setdefault", "chave, padrão", "dict"], ["update", "outro", "dict"],
  ];

  const NOMES_RESERVADOS = Object.create(null); // sem protótipo: "toString" etc. não podem parecer já reservados
  PALAVRAS.forEach(function (p) { NOMES_RESERVADOS[p[0]] = true; });
  EMBUTIDAS.forEach(function (f) { NOMES_RESERVADOS[f[0]] = true; });

  /** Nomes usados no código (variáveis, parâmetros, funções definidas), sem contar a palavra que está sendo digitada. */
  function nomesDoCodigo(codigo, ini, fim) {
    const semAtual = codigo.slice(0, ini) + codigo.slice(fim);
    // Tira textos e comentários para não sugerir palavras de dentro deles (inclusive texto ainda sem fechar)
    const limpo = semAtual
      .replace(/"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|#[^\n]*/g, " ");
    const funcoes = Object.create(null);
    limpo.replace(/\bdef\s+([A-Za-z_]\w*)/g, function (_, nome) { funcoes[nome] = true; });
    const vistos = Object.create(null);
    const nomes = [];
    (limpo.match(/[A-Za-z_]\w*/g) || []).forEach(function (nome) {
      if (vistos[nome] || NOMES_RESERVADOS[nome]) return;
      // Nomes usados só depois de um ponto (métodos) entram pela lista de métodos
      vistos[nome] = true;
      nomes.push({ nome: nome, funcao: !!funcoes[nome] });
    });
    return nomes;
  }

  /** true se a posição está dentro de um comentário ou de um texto (análise só da linha atual). */
  function emComentarioOuTexto(linha) {
    let aspas = null;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (aspas) {
        if (c === "\\") i++;
        else if (c === aspas) aspas = null;
      } else if (c === "\"" || c === "'") {
        aspas = c;
      } else if (c === "#") {
        return true;
      }
    }
    return aspas !== null;
  }

  function anexar(campo, area, inserir) {
    const lista = document.createElement("ul");
    lista.className = "autocompletar";
    lista.setAttribute("role", "listbox");
    lista.hidden = true;
    area.appendChild(lista);

    let itens = [];        // sugestões visíveis
    let escolhido = 0;     // índice destacado
    let navegou = false;   // usuário mexeu com as setas desde que a lista abriu
    let inicio = 0;        // onde começa a palavra que está sendo completada
    let aceitando = false; // ignora o "input" disparado pela própria inserção

    const medidor = document.createElement("canvas").getContext("2d");

    function aberta() { return !lista.hidden; }

    function fechar() {
      lista.hidden = true;
      itens = [];
    }

    /** Monta as sugestões para a palavra antes do cursor. Retorna [] quando não há o que sugerir. */
    function sugestoes(forcado) {
      if (campo.selectionStart !== campo.selectionEnd) return [];
      const v = campo.value;
      const cursor = campo.selectionStart;
      let ini = cursor;
      while (ini > 0 && /\w/.test(v[ini - 1])) ini--;
      const prefixo = v.slice(ini, cursor);
      if (/^\d/.test(prefixo)) return [];
      // Não interrompe quem está no meio de uma palavra
      if (/\w/.test(v[cursor] || "")) return [];

      const linha = v.slice(v.lastIndexOf("\n", ini - 1) + 1, ini);
      if (emComentarioOuTexto(linha)) return [];

      // "nome." / "lista[0]." / "texto"." abrem os métodos; "3." é só um número decimal
      const antesDoPonto = linha.slice(0, -1);
      const depoisDoPonto = v[ini - 1] === "." && /[\w)\]"']$/.test(antesDoPonto) &&
        !/(^|[^\w])\d+$/.test(antesDoPonto);
      if (!depoisDoPonto && prefixo.length < 1 && !forcado) return []; // Ctrl+Espaço abre mesmo sem nada digitado
      // "def nome" e "for nome": nome novo, nada a sugerir
      if (/\b(def|class|for|as|import|from)\s+$/.test(linha)) return [];

      inicio = ini;
      const p = prefixo.toLowerCase();
      const candidatos = [];
      function considerar(c) {
        const n = c.rotulo.toLowerCase();
        if (!n.startsWith(p)) return;
        c.peso = (c.rotulo.startsWith(prefixo) ? 0 : 10) + c.ordem;
        candidatos.push(c);
      }

      if (depoisDoPonto) {
        METODOS.forEach(function (m) {
          considerar({ rotulo: m[0], detalhe: "(" + m[1] + ")", tipo: m[2], texto: m[0] + "()", dentro: m[1] !== "", ordem: 0 });
        });
      } else {
        nomesDoCodigo(v, ini, cursor).forEach(function (n) {
          considerar({
            rotulo: n.nome, detalhe: n.funcao ? "(…)" : "", tipo: n.funcao ? "sua função" : "nome",
            texto: n.funcao ? n.nome + "()" : n.nome, dentro: n.funcao, ordem: 0,
          });
        });
        PALAVRAS.forEach(function (k) {
          considerar({ rotulo: k[0], detalhe: "", tipo: "palavra-chave", texto: k[1], dentro: false, ordem: 1 });
        });
        EMBUTIDAS.forEach(function (f) {
          considerar({ rotulo: f[0], detalhe: "(" + f[1] + ")", tipo: "função", texto: f[0] + "()", dentro: f[1] !== "", ordem: 1 });
        });
      }

      candidatos.sort(function (a, b) {
        // Igual ao que já foi digitado vem primeiro; depois os mais curtos
        const exatoA = a.rotulo === prefixo ? 0 : 1;
        const exatoB = b.rotulo === prefixo ? 0 : 1;
        return exatoA - exatoB || a.peso - b.peso || a.rotulo.length - b.rotulo.length || (a.rotulo < b.rotulo ? -1 : 1);
      });
      const unicos = [];
      const vistos = Object.create(null);
      candidatos.forEach(function (c) {
        if (!vistos[c.rotulo]) { vistos[c.rotulo] = true; unicos.push(c); }
      });
      // A palavra já está completa e não há outra opção: nada a mostrar
      if (unicos.length === 1 && unicos[0].rotulo === prefixo && unicos[0].texto === prefixo) return [];
      return unicos.slice(0, MAX_ITENS);
    }

    function desenhar() {
      lista.innerHTML = "";
      const prefixo = campo.value.slice(inicio, campo.selectionStart);
      itens.forEach(function (item, i) {
        const li = document.createElement("li");
        li.className = "autocompletar-item" + (i === escolhido ? " escolhido" : "");
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(i === escolhido));
        const nome = document.createElement("span");
        nome.className = "autocompletar-nome";
        const casado = document.createElement("strong");
        casado.textContent = item.rotulo.slice(0, prefixo.length);
        nome.appendChild(casado);
        nome.appendChild(document.createTextNode(item.rotulo.slice(prefixo.length)));
        if (item.detalhe) {
          const det = document.createElement("span");
          det.className = "autocompletar-detalhe";
          det.textContent = item.detalhe;
          nome.appendChild(det);
        }
        const tipo = document.createElement("span");
        tipo.className = "autocompletar-tipo";
        tipo.textContent = item.tipo;
        li.appendChild(nome);
        li.appendChild(tipo);
        // mousedown (e não click) para o textarea não perder o foco
        li.addEventListener("mousedown", function (e) {
          e.preventDefault();
          escolhido = i;
          aceitar();
        });
        lista.appendChild(li);
      });
      posicionar();
    }

    /** Coloca a lista logo abaixo da palavra (ou acima, se não couber embaixo). */
    function posicionar() {
      const estilo = getComputedStyle(campo);
      medidor.font = estilo.fontSize + " " + estilo.fontFamily;
      const larguraLetra = medidor.measureText("M").width;
      const alturaLinha = parseFloat(estilo.lineHeight);
      const antes = campo.value.slice(0, inicio);
      const numLinha = antes.split("\n").length - 1;
      const coluna = inicio - (antes.lastIndexOf("\n") + 1);

      const x = parseFloat(estilo.paddingLeft) + coluna * larguraLetra - campo.scrollLeft;
      const topoLinha = parseFloat(estilo.paddingTop) + numLinha * alturaLinha - campo.scrollTop;

      lista.style.left = "0px";
      lista.style.top = "0px";
      const largura = lista.offsetWidth;
      const altura = lista.offsetHeight;
      const maxX = Math.max(0, area.clientWidth - largura - 4);
      lista.style.left = Math.max(0, Math.min(x - 6, maxX)) + "px";
      const abaixo = topoLinha + alturaLinha + 2;
      const cabeEmbaixo = abaixo + altura <= area.clientHeight || topoLinha - altura - 2 < 0;
      lista.style.top = (cabeEmbaixo ? abaixo : topoLinha - altura - 2) + "px";
    }

    function abrirOuAtualizar(forcado) {
      const novos = sugestoes(forcado);
      if (!novos.length) { fechar(); return; }
      const anterior = itens[escolhido] && itens[escolhido].rotulo;
      itens = novos;
      // Mantém o item escolhido se ele continua na lista
      const mesmo = itens.findIndex(function (it) { return it.rotulo === anterior; });
      escolhido = navegou && mesmo !== -1 ? mesmo : 0;
      if (!aberta()) navegou = false;
      lista.hidden = false;
      desenhar();
    }

    function aceitar() {
      const item = itens[escolhido];
      if (!item) return;
      const cursor = campo.selectionStart;
      aceitando = true;
      campo.setSelectionRange(inicio, cursor);
      inserir(item.texto);
      aceitando = false;
      if (item.dentro) {
        const pos = campo.selectionStart - 1; // entre os parênteses
        campo.setSelectionRange(pos, pos);
      }
      fechar();
    }

    /** Teclas enquanto a lista está aberta. Retorna true se a tecla foi consumida. */
    function teclar(e) {
      if (e.ctrlKey && e.key === " ") {
        e.preventDefault();
        abrirOuAtualizar(true);
        return true;
      }
      if (!aberta()) return false;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        navegou = true;
        const n = itens.length;
        escolhido = (escolhido + (e.key === "ArrowDown" ? 1 : n - 1)) % n;
        desenhar();
        return true;
      }
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        aceitar();
        return true;
      }
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const item = itens[escolhido];
        const prefixo = campo.value.slice(inicio, campo.selectionStart);
        // Palavra já digitada por inteiro (ex.: "return", "pass"): o Enter é quebra de linha mesmo
        if (!navegou && item && item.rotulo === prefixo) {
          fechar();
          return false;
        }
        e.preventDefault();
        aceitar();
        return true;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        fechar();
        return true;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End" ||
          e.key === "PageUp" || e.key === "PageDown") {
        fechar();
      }
      return false;
    }

    /** Chamado no evento "input" do textarea. */
    function aoDigitar(e) {
      if (aceitando) return;
      const tipo = (e && e.inputType) || "";
      if (tipo === "insertText") abrirOuAtualizar();
      else if (tipo.indexOf("delete") === 0 && aberta()) abrirOuAtualizar();
      else fechar();
    }

    campo.addEventListener("blur", fechar);
    campo.addEventListener("mousedown", fechar);
    campo.addEventListener("scroll", function () { if (aberta()) posicionar(); });

    return { teclar: teclar, aoDigitar: aoDigitar, fechar: fechar };
  }

  window.Autocompletar = { anexar: anexar };
})();

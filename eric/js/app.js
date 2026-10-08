/*
 * app.js — interface: lista de desafios, editor, execução, feedback,
 * pontuação e progresso (salvo no localStorage).
 */
(function () {
  "use strict";

  const DESAFIOS = window.DESAFIOS;
  const CATEGORIAS = window.CATEGORIAS;
  const Executor = window.Executor;
  const Realce = window.Realce;

  const PONTOS_POR_NIVEL = { iniciante: 10, intermediario: 20 };
  const BONUS_DE_PRIMEIRA = 0.5; // +50% ao acertar sem nenhum erro
  const NOME_NIVEL = { iniciante: "Iniciante", intermediario: "Intermediário" };
  const ERROS_PARA_SOLUCAO = 3;
  const EXEMPLOS_PADRAO = 2;
  const RECUO = "    "; // PEP 8: 4 espaços

  const porId = {};
  DESAFIOS.forEach(function (d) { porId[d.id] = d; });

  // =========================================================================
  // Progresso — tudo que precisa sobreviver a um recarregamento da página
  // =========================================================================
  const Progresso = (function () {
    // Chave nova na troca de JavaScript para Python: o progresso e os códigos da versão JS não valem aqui
    const CHAVE = "treino-logica:progresso:python:v1";

    function vazio() {
      return {
        concluidos: {},    // id -> { pontos, comAjuda, dePrimeira }
        erros: {},         // id -> nº de tentativas erradas
        solucaoVista: {},  // id -> true
        codigos: {},       // id -> último código digitado
        atual: null,       // id do desafio aberto
      };
    }

    function carregar() {
      try {
        const bruto = localStorage.getItem(CHAVE);
        if (bruto) return Object.assign(vazio(), JSON.parse(bruto));
      } catch (e) { /* storage indisponível ou corrompido: começa do zero */ }
      return vazio();
    }

    let dados = carregar();

    function salvar() {
      try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch (e) { /* segue sem salvar */ }
    }

    return {
      concluido: function (id) { return !!dados.concluidos[id]; },
      comAjuda: function (id) { return !!(dados.concluidos[id] && dados.concluidos[id].comAjuda); },
      erros: function (id) { return dados.erros[id] || 0; },
      solucaoVista: function (id) { return !!dados.solucaoVista[id]; },
      codigo: function (id) { return dados.codigos[id]; },
      atual: function () { return dados.atual; },

      registrarErro: function (id) { dados.erros[id] = (dados.erros[id] || 0) + 1; salvar(); },
      concluir: function (id, info) { dados.concluidos[id] = info; salvar(); },
      marcarSolucaoVista: function (id) { dados.solucaoVista[id] = true; salvar(); },
      guardarCodigo: function (id, codigo) { dados.codigos[id] = codigo; salvar(); },
      definirAtual: function (id) { dados.atual = id; salvar(); },

      totalConcluidos: function () { return Object.keys(dados.concluidos).filter(function (id) { return porId[id]; }).length; },
      pontuacao: function () {
        return Object.keys(dados.concluidos).reduce(function (soma, id) {
          return porId[id] ? soma + (dados.concluidos[id].pontos || 0) : soma;
        }, 0);
      },
      zerar: function () { dados = vazio(); salvar(); },
    };
  })();

  // =========================================================================
  // Referências do DOM
  // =========================================================================
  const $ = function (id) { return document.getElementById(id); };
  const el = {
    lateral: $("lateral"),
    alternarLateral: $("lateral-alternar"),
    lista: $("lista-desafios"),
    zerar: $("zerar"),
    tema: $("tema"),
    placarConcluidos: $("placar-concluidos"),
    placarPontos: $("placar-pontos"),
    barra: $("barra"),
    barraPreenchida: $("barra-preenchida"),
    etqCategoria: $("etiqueta-categoria"),
    etqNivel: $("etiqueta-nivel"),
    etqPontos: $("etiqueta-pontos"),
    etqStatus: $("etiqueta-status"),
    titulo: $("titulo"),
    enunciado: $("enunciado"),
    exemplos: $("exemplos"),
    dicas: $("dicas"),
    dicasResumo: $("dicas-resumo"),
    dicasLista: $("dicas-lista"),
    codigo: $("codigo"),
    realce: $("editor-realce"),
    linhas: $("editor-linhas"),
    executar: $("executar"),
    restaurar: $("restaurar"),
    tentativas: $("tentativas"),
    verSolucao: $("ver-solucao"),
    avisoSolucao: $("aviso-solucao"),
    feedback: $("feedback"),
    solucao: $("solucao"),
    solucaoCodigo: $("solucao-codigo"),
    usarSolucao: $("usar-solucao"),
    anterior: $("anterior"),
    proximo: $("proximo"),
  };

  let atual = null;        // desafio aberto
  let executando = false;
  // Último código que errou, por desafio (só nesta sessão): reenviar o mesmo código não gasta tentativa
  const ultimoCodigoErrado = {};

  // =========================================================================
  // Utilitários
  // =========================================================================

  /** Cria um elemento com classe e texto (texto sempre via textContent, nunca HTML). */
  function criar(tag, classe, texto) {
    const no = document.createElement(tag);
    if (classe) no.className = classe;
    if (texto !== undefined) no.textContent = texto;
    return no;
  }

  /** Anexa um texto onde trechos entre `crases` viram <code>, sem usar innerHTML. */
  function anexarComCodigo(destino, texto) {
    texto.split("`").forEach(function (parte, i) {
      if (!parte) return;
      destino.appendChild(i % 2 === 1 ? criar("code", "", parte) : document.createTextNode(parte));
    });
  }

  function codigoInicial(d) {
    return "def " + d.funcao + "(" + d.parametros + "):\n" + RECUO + "# seu código aqui\n" + RECUO + "pass\n";
  }

  function nomeCategoria(id) {
    const c = CATEGORIAS.find(function (cat) { return cat.id === id; });
    return c ? c.nome : id;
  }

  function indiceDe(d) { return DESAFIOS.indexOf(d); }

  function pontosBase(d) { return PONTOS_POR_NIVEL[d.nivel]; }
  function bonusDePrimeira(d) { return Math.round(pontosBase(d) * BONUS_DE_PRIMEIRA); }

  /** Próximo desafio não concluído a partir de `d` (dá a volta na lista). */
  function proximoPendente(d) {
    const inicio = d ? indiceDe(d) : -1;
    for (let passo = 1; passo <= DESAFIOS.length; passo++) {
      const candidato = DESAFIOS[(inicio + passo) % DESAFIOS.length];
      if (!Progresso.concluido(candidato.id)) return candidato;
    }
    return null;
  }

  function categoriaCompleta(idCategoria) {
    return DESAFIOS.every(function (d) {
      return d.categoria !== idCategoria || Progresso.concluido(d.id);
    });
  }

  // =========================================================================
  // Tema (auto → claro → escuro)
  // =========================================================================
  const CHAVE_TEMA = "treino-logica:tema";
  const TEMAS = [
    { valor: "auto", rotulo: "◐ Auto" },
    { valor: "light", rotulo: "☀ Claro" },
    { valor: "dark", rotulo: "☾ Escuro" },
  ];

  function temaSalvo() {
    try { return localStorage.getItem(CHAVE_TEMA) || "auto"; } catch (e) { return "auto"; }
  }

  function aplicarTema(valor) {
    if (valor === "light" || valor === "dark") document.documentElement.setAttribute("data-theme", valor);
    else document.documentElement.removeAttribute("data-theme");
    const tema = TEMAS.find(function (t) { return t.valor === valor; }) || TEMAS[0];
    el.tema.textContent = tema.rotulo;
    el.tema.title = "Tema: " + tema.rotulo.slice(2) + " (clique para alternar)";
    try { localStorage.setItem(CHAVE_TEMA, tema.valor); } catch (e) { /* ignora */ }
  }

  el.tema.addEventListener("click", function () {
    const i = TEMAS.findIndex(function (t) { return t.valor === temaSalvo(); });
    aplicarTema(TEMAS[(i + 1) % TEMAS.length].valor);
  });

  // =========================================================================
  // Placar e lista lateral
  // =========================================================================

  function renderPlacar() {
    const feitos = Progresso.totalConcluidos();
    const total = DESAFIOS.length;
    const pct = total ? Math.round((feitos / total) * 100) : 0;
    el.placarConcluidos.textContent = feitos + "/" + total;
    el.placarPontos.textContent = Progresso.pontuacao();
    el.barraPreenchida.style.width = pct + "%";
    el.barra.setAttribute("aria-valuenow", String(pct));
  }

  function renderLista() {
    el.lista.innerHTML = "";
    CATEGORIAS.forEach(function (cat) {
      const doGrupo = DESAFIOS.filter(function (d) { return d.categoria === cat.id; });
      if (!doGrupo.length) return;
      const feitos = doGrupo.filter(function (d) { return Progresso.concluido(d.id); }).length;

      const grupo = criar("section", "grupo");
      const cabecalho = criar("h3", "grupo-titulo");
      cabecalho.appendChild(criar("span", "", cat.nome));
      cabecalho.appendChild(criar("span", "", (feitos === doGrupo.length ? "✓ " : "") + feitos + "/" + doGrupo.length));
      grupo.appendChild(cabecalho);

      const ol = criar("ol");
      doGrupo.forEach(function (d) {
        const item = criar("button", "item");
        item.type = "button";
        item.dataset.id = d.id;
        if (Progresso.concluido(d.id)) item.classList.add("concluido");
        if (Progresso.comAjuda(d.id)) item.classList.add("com-ajuda");
        if (!Progresso.concluido(d.id) && Progresso.erros(d.id) > 0) item.classList.add("tentado");
        if (atual && atual.id === d.id) {
          item.classList.add("atual");
          item.setAttribute("aria-current", "true");
        }
        item.appendChild(criar("span", "item-marca"));
        item.appendChild(criar("span", "item-titulo", d.titulo));
        item.appendChild(criar("span", "item-nivel", d.nivel === "iniciante" ? "inic." : "inter."));

        const li = criar("li");
        li.appendChild(item);
        ol.appendChild(li);
      });
      grupo.appendChild(ol);
      el.lista.appendChild(grupo);
    });
  }

  // =========================================================================
  // Desafio aberto
  // =========================================================================

  function abrirDesafio(d) {
    atual = d;
    Progresso.definirAtual(d.id);
    // Endereço com #id: dá para favoritar/compartilhar e usar o voltar do navegador
    if (location.hash.slice(1) !== d.id) location.hash = d.id;
    document.title = d.titulo + " · Treino de Lógica";

    el.etqCategoria.textContent = nomeCategoria(d.categoria);
    el.etqNivel.textContent = NOME_NIVEL[d.nivel];
    el.etqPontos.textContent = pontosBase(d) + " pts";
    el.titulo.textContent = d.titulo;
    el.enunciado.innerHTML = d.enunciado; // HTML vem do banco de desafios (conteúdo nosso)

    // Exemplos: os primeiros testes, no formato  chamada  →  resultado
    el.exemplos.innerHTML = "";
    d.testes.slice(0, d.exemplos || EXEMPLOS_PADRAO).forEach(function (t) {
      const linha = criar("div", "exemplo");
      linha.appendChild(document.createTextNode(t.chamada));
      linha.appendChild(criar("span", "seta", "→"));
      linha.appendChild(document.createTextNode(t.esperado));
      el.exemplos.appendChild(linha);
    });

    const salvo = Progresso.codigo(d.id);
    sugestoes.fechar();
    el.codigo.value = typeof salvo === "string" ? salvo : codigoInicial(d);
    el.codigo.scrollTop = 0;
    el.codigo.scrollLeft = 0;
    atualizarEditor();

    el.feedback.hidden = true;
    el.feedback.innerHTML = "";
    el.solucao.hidden = true;

    el.anterior.disabled = indiceDe(d) === 0;
    el.proximo.disabled = indiceDe(d) === DESAFIOS.length - 1;

    renderEstado();
    renderLista();
    window.scrollTo({ top: 0 });
  }

  /** Atualiza o que depende de erros/conclusão: status, dicas, contador e botão de solução. */
  function renderEstado() {
    const d = atual;
    const concluido = Progresso.concluido(d.id);
    const erros = Progresso.erros(d.id);
    const liberada = concluido || erros >= ERROS_PARA_SOLUCAO || Progresso.solucaoVista(d.id);

    el.etqStatus.hidden = !concluido;
    el.etqStatus.textContent = Progresso.comAjuda(d.id) ? "✓ Concluído com ajuda" : "✓ Concluído";

    el.tentativas.textContent = !concluido && erros > 0 ? "Tentativas erradas: " + erros : "";

    el.verSolucao.disabled = !liberada;
    if (liberada) {
      el.verSolucao.textContent = "Ver solução";
      el.verSolucao.title = "";
    } else {
      const faltam = ERROS_PARA_SOLUCAO - erros;
      el.verSolucao.textContent = "Ver solução (" + faltam + ")";
      el.verSolucao.title = "Liberada após " + ERROS_PARA_SOLUCAO + " tentativas erradas. Faltam " + faltam + ".";
    }

    // Aviso de que ver a solução zera os pontos do desafio
    el.avisoSolucao.hidden = !(liberada && !concluido && !Progresso.solucaoVista(d.id));

    renderDicas();
  }

  /** Painel com todas as dicas já desbloqueadas (uma por erro). Concluído = todas liberadas. */
  function renderDicas() {
    const d = atual;
    const total = (d.dicas || []).length;
    const liberadas = Progresso.concluido(d.id) ? total : Math.min(Progresso.erros(d.id), total);
    const estavaAberto = el.dicas.open;

    el.dicas.hidden = liberadas === 0;
    el.dicasLista.innerHTML = "";
    for (let i = 0; i < liberadas; i++) {
      const li = criar("li");
      anexarComCodigo(li, d.dicas[i]);
      el.dicasLista.appendChild(li);
    }
    el.dicasResumo.textContent = "Dicas desbloqueadas (" + liberadas + "/" + total + ")";
    el.dicas.open = estavaAberto;
  }

  // =========================================================================
  // Execução e feedback
  // =========================================================================

  function definirExecutando(sim) {
    executando = sim;
    el.executar.disabled = sim;
    el.executar.textContent = !sim ? "Executar" : Executor.carregado() ? "Executando…" : "Carregando Python…";
  }

  async function executar() {
    if (executando) return;
    const d = atual;
    const codigo = el.codigo.value;
    Progresso.guardarCodigo(d.id, codigo);

    // Atalhos proibidos (ex.: .sort() no desafio de ordenação)
    const violacao = (d.proibido || []).find(function (regra) {
      return new RegExp(regra.padrao).test(codigo);
    });

    let resultado;
    let tempoMs = null;
    if (violacao) {
      resultado = { erro: violacao.mensagem, saidaInicial: [], resultados: [], proibido: true };
    } else {
      definirExecutando(true);
      const inicio = performance.now();
      resultado = await Executor.executar(codigo, d.funcao, d.testes);
      tempoMs = Math.round(performance.now() - inicio);
      definirExecutando(false);
    }

    const acertou = !resultado.erro &&
      resultado.resultados.length > 0 &&
      resultado.resultados.every(function (r) { return r.passou; });

    const jaConcluido = Progresso.concluido(d.id);
    const info = { jaConcluido: jaConcluido, pontos: 0, bonus: 0, repetido: false, tempoMs: tempoMs, categoriaFechada: false };

    if (acertou && !jaConcluido) {
      const comAjuda = Progresso.solucaoVista(d.id);
      const dePrimeira = !comAjuda && Progresso.erros(d.id) === 0;
      info.bonus = dePrimeira ? bonusDePrimeira(d) : 0;
      info.pontos = comAjuda ? 0 : pontosBase(d) + info.bonus;
      Progresso.concluir(d.id, { pontos: info.pontos, comAjuda: comAjuda, dePrimeira: dePrimeira });
      info.categoriaFechada = categoriaCompleta(d.categoria);
    } else if (!acertou && !jaConcluido) {
      // Mesmo código que já errou antes: não conta como nova tentativa
      if (ultimoCodigoErrado[d.id] === codigo) {
        info.repetido = true;
      } else {
        ultimoCodigoErrado[d.id] = codigo;
        Progresso.registrarErro(d.id);
      }
    }

    renderPlacar();
    renderLista();
    // Se o usuário trocou de desafio enquanto o código rodava, não mostra o feedback no desafio errado
    if (atual !== d) return;
    renderEstado();
    renderFeedback(d, resultado, acertou, info);
  }

  function renderFeedback(d, resultado, acertou, info) {
    const fb = el.feedback;
    fb.innerHTML = "";
    fb.hidden = false;
    fb.className = "feedback " + (acertou ? "certo" : "errado");

    const total = resultado.resultados.length;
    const passaram = resultado.resultados.filter(function (r) { return r.passou; }).length;
    const sufixoTempo = info.tempoMs !== null ? " (" + info.tempoMs + " ms)" : "";

    // --- Título e mensagem ---
    if (acertou) {
      fb.appendChild(criar("h4", "feedback-titulo", info.bonus ? "Correto de primeira!" : "Correto!"));
      let msg = "Todos os " + total + " testes passaram" + sufixoTempo + ". ";
      if (info.jaConcluido) msg += "Este desafio já estava concluído.";
      else if (info.pontos > 0) msg += "+" + info.pontos + " pontos" + (info.bonus ? " (inclui +" + info.bonus + " de bônus por acertar de primeira)." : ".");
      else msg += "Concluído com ajuda da solução (0 pontos).";
      fb.appendChild(criar("p", "feedback-texto", msg));
      if (info.categoriaFechada) {
        fb.appendChild(criar("p", "feedback-texto", "🏅 Você completou a categoria " + nomeCategoria(d.categoria) + "!"));
      }
    } else {
      fb.appendChild(criar("h4", "feedback-titulo", "Incorreto"));
      if (resultado.erro) {
        fb.appendChild(criar("p", "feedback-texto", resultado.proibido
          ? "Regra do desafio:"
          : "Seu código não pôde ser testado:"));
        fb.appendChild(criar("div", "erro-codigo", resultado.erro));
      } else {
        fb.appendChild(criar("p", "feedback-texto", passaram + " de " + total + " testes passaram" + sufixoTempo + "."));
      }

      if (info.repetido) {
        fb.appendChild(criar("p", "feedback-texto", "É o mesmo código da tentativa anterior, então não contou como nova tentativa."));
      }

      // Dica mais recente (o painel acima do editor guarda todas as já liberadas)
      if (!info.jaConcluido && d.dicas && d.dicas.length && Progresso.erros(d.id) > 0) {
        const indice = Math.min(Progresso.erros(d.id), d.dicas.length) - 1;
        const dica = criar("div", "dica");
        dica.appendChild(criar("strong", "", "Dica " + (indice + 1) + "/" + d.dicas.length + ": "));
        anexarComCodigo(dica, d.dicas[indice]);
        fb.appendChild(dica);
      }

      if (!info.jaConcluido && !info.repetido &&
          Progresso.erros(d.id) === ERROS_PARA_SOLUCAO && !Progresso.solucaoVista(d.id)) {
        fb.appendChild(criar("p", "feedback-texto", "A solução foi liberada — mas vale tentar mais uma vez antes de olhar."));
      }
    }

    // --- Saída de print() fora das chamadas de teste ---
    if (resultado.saidaInicial && resultado.saidaInicial.length) {
      fb.appendChild(criar("div", "console", "print:\n" + resultado.saidaInicial.join("\n")));
    }

    // --- Tabela de testes ---
    if (total > 0) {
      const moldura = criar("div", "testes-moldura");
      const tabela = criar("table", "testes");
      const cab = criar("tr");
      ["", "Chamada", "Esperado", "Recebido"].forEach(function (t) { cab.appendChild(criar("th", "", t)); });
      const thead = criar("thead");
      thead.appendChild(cab);
      tabela.appendChild(thead);

      const tbody = criar("tbody");
      resultado.resultados.forEach(function (r) {
        const tr = criar("tr");
        tr.appendChild(criar("td", r.passou ? "ok" : "falha", r.passou ? "✓" : "✗"));
        tr.appendChild(criar("td", "", r.chamada));
        tr.appendChild(criar("td", "", r.esperado));
        const recebido = criar("td", "", r.recebido);
        (r.logs || []).forEach(function (linha) {
          recebido.appendChild(criar("span", "log", "print: " + linha));
        });
        tr.appendChild(recebido);
        tbody.appendChild(tr);
      });
      tabela.appendChild(tbody);
      moldura.appendChild(tabela);
      fb.appendChild(moldura);
    }

    // --- Seguir em frente ---
    if (acertou) {
      const seguinte = proximoPendente(d);
      const acoes = criar("div", "feedback-acoes");
      if (seguinte) {
        const botao = criar("button", "botao sucesso", "Próximo desafio: " + seguinte.titulo + " →");
        botao.type = "button";
        botao.addEventListener("click", function () { abrirDesafio(seguinte); });
        acoes.appendChild(botao);
      } else {
        acoes.appendChild(criar("p", "feedback-texto",
          "🎉 Você concluiu todos os " + DESAFIOS.length + " desafios, com " + Progresso.pontuacao() + " pontos!"));
      }
      fb.appendChild(acoes);
    }

    fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // =========================================================================
  // Solução
  // =========================================================================

  function mostrarSolucao() {
    const d = atual;
    if (el.verSolucao.disabled) return;
    if (!Progresso.concluido(d.id)) Progresso.marcarSolucaoVista(d.id);
    el.solucaoCodigo.innerHTML = Realce.html(d.solucao);
    el.solucao.hidden = false;
    renderEstado();
    el.solucao.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // =========================================================================
  // Editor: textarea transparente sobre uma camada com realce de sintaxe
  // =========================================================================

  const campo = el.codigo;
  let totalLinhas = 0;

  /** Redesenha realce e números de linha a partir do conteúdo do textarea. */
  function atualizarEditor() {
    // O espaço final garante que uma última linha vazia também ocupe altura
    el.realce.innerHTML = Realce.html(campo.value) + " ";

    const n = campo.value.split("\n").length;
    if (n !== totalLinhas) {
      totalLinhas = n;
      const numeros = [];
      for (let i = 1; i <= n; i++) numeros.push(i);
      el.linhas.textContent = numeros.join("\n");
    }
    sincronizarRolagem();
  }

  function sincronizarRolagem() {
    el.realce.style.transform = "translate(" + -campo.scrollLeft + "px, " + -campo.scrollTop + "px)";
    el.linhas.scrollTop = campo.scrollTop;
  }

  /** Insere texto no lugar da seleção, mantendo o desfazer (Ctrl+Z) quando possível. */
  function inserirNoCursor(texto) {
    if (!document.execCommand("insertText", false, texto)) {
      campo.setRangeText(texto, campo.selectionStart, campo.selectionEnd, "end");
      aoEditar();
    }
  }

  /** Substitui todo o conteúdo do editor. */
  function trocarCodigo(texto) {
    campo.focus();
    campo.select();
    inserirNoCursor(texto);
    campo.setSelectionRange(0, 0);
    campo.scrollTop = 0;
    sincronizarRolagem();
  }

  /** Início e fim das linhas tocadas pela seleção atual. */
  function linhasDaSelecao() {
    const v = campo.value;
    const ini = campo.selectionStart === 0 ? 0 : v.lastIndexOf("\n", campo.selectionStart - 1) + 1;
    let fimSel = campo.selectionEnd;
    // Seleção que termina logo no começo de uma linha não inclui essa linha
    if (fimSel > campo.selectionStart && v[fimSel - 1] === "\n") fimSel--;
    let fim = v.indexOf("\n", fimSel);
    if (fim === -1) fim = v.length;
    return { ini: ini, fim: fim, texto: v.slice(ini, fim) };
  }

  /** Aplica `transformar` a cada linha tocada pela seleção (indentar, comentar…). */
  function transformarLinhas(transformar) {
    const vazia = campo.selectionStart === campo.selectionEnd;
    const cursor = campo.selectionStart;
    const bloco = linhasDaSelecao();
    const linhas = bloco.texto.split("\n");
    const novo = transformar(linhas).join("\n");
    if (novo === bloco.texto) return;

    campo.setSelectionRange(bloco.ini, bloco.fim);
    inserirNoCursor(novo);
    if (vazia) {
      // Sem seleção: o cursor anda junto com o texto acrescentado/removido
      const pos = Math.max(bloco.ini, cursor + (novo.length - bloco.texto.length));
      campo.setSelectionRange(pos, pos);
    } else {
      campo.setSelectionRange(bloco.ini, bloco.ini + novo.length);
    }
  }

  function indentar(linhas) {
    return linhas.map(function (l) { return l.length ? RECUO + l : l; });
  }

  function desindentar(linhas) {
    return linhas.map(function (l) { return l.replace(/^ {1,4}/, ""); });
  }

  function alternarComentario(linhas) {
    const comConteudo = linhas.filter(function (l) { return l.trim() !== ""; });
    const todasComentadas = comConteudo.length > 0 && comConteudo.every(function (l) { return /^\s*#/.test(l); });
    return linhas.map(function (l) {
      if (l.trim() === "") return l;
      if (todasComentadas) return l.replace(/^(\s*)# ?/, "$1");
      return l.replace(/^(\s*)/, "$1# ");
    });
  }

  function aoTeclar(e) {
    const ctrl = e.ctrlKey || e.metaKey;

    // Lista de sugestões aberta: setas, Tab, Enter e Esc são dela
    if (sugestoes.teclar(e)) return;

    // Ctrl/Cmd + Enter: executar
    if (e.key === "Enter" && ctrl) {
      e.preventDefault();
      executar();
      return;
    }

    // Ctrl/Cmd + /: comentar ou descomentar as linhas
    if (ctrl && e.key === "/") {
      e.preventDefault();
      transformarLinhas(alternarComentario);
      return;
    }

    // Tab / Shift+Tab: indenta (várias linhas, se houver seleção) ou desindenta
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        transformarLinhas(desindentar);
      } else if (campo.value.slice(campo.selectionStart, campo.selectionEnd).indexOf("\n") !== -1) {
        transformarLinhas(indentar);
      } else {
        inserirNoCursor(RECUO);
      }
      return;
    }

    // Esc solta o foco do editor (para quem navega pelo teclado)
    if (e.key === "Escape") {
      campo.blur();
      return;
    }

    // Backspace no recuo (só espaços antes do cursor): apaga um nível inteiro de 4 espaços
    if (e.key === "Backspace" && campo.selectionStart === campo.selectionEnd) {
      const antes = campo.value.slice(0, campo.selectionStart);
      const linhaAtual = antes.slice(antes.lastIndexOf("\n") + 1);
      if (/^ +$/.test(linhaAtual)) {
        const apagar = linhaAtual.length % RECUO.length || RECUO.length;
        e.preventDefault();
        campo.setSelectionRange(campo.selectionStart - apagar, campo.selectionStart);
        if (!document.execCommand("delete")) {
          campo.setRangeText("", campo.selectionStart, campo.selectionEnd, "end");
          aoEditar();
        }
      }
      return;
    }

    // Enter: mantém a indentação; depois de ":" (ou de "(", "[", "{") entra um nível;
    // depois de return/pass/break/continue/raise sai um nível
    if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
      const v = campo.value;
      const antes = v.slice(0, campo.selectionStart);
      const linhaAtual = antes.slice(antes.lastIndexOf("\n") + 1);
      let recuo = (linhaAtual.match(/^\s*/) || [""])[0];
      const semComentario = linhaAtual.replace(/\s*#.*$/, "");
      const abreBloco = /[:{[(]\s*$/.test(semComentario);
      const abreParenteses = /[{[(]\s*$/.test(semComentario);
      const fechaLogoDepois = /^[}\])]/.test(v.slice(campo.selectionEnd));
      const encerraBloco = /^\s*(return|pass|break|continue|raise)\b/.test(linhaAtual);
      if (encerraBloco) recuo = recuo.slice(0, Math.max(0, recuo.length - RECUO.length));
      e.preventDefault();
      if (abreParenteses && fechaLogoDepois) {
        const posCursor = campo.selectionStart + 1 + recuo.length + RECUO.length;
        inserirNoCursor("\n" + recuo + RECUO + "\n" + recuo);
        campo.setSelectionRange(posCursor, posCursor);
      } else {
        inserirNoCursor("\n" + recuo + (abreBloco ? RECUO : ""));
      }
    }
  }

  function aoEditar(e) {
    atualizarEditor();
    sugestoes.aoDigitar(e);
    if (atual) Progresso.guardarCodigo(atual.id, campo.value);
  }

  const sugestoes = window.Autocompletar.anexar(campo, campo.parentNode, inserirNoCursor);

  campo.addEventListener("keydown", aoTeclar);
  campo.addEventListener("input", aoEditar);
  campo.addEventListener("scroll", sincronizarRolagem);

  // =========================================================================
  // Eventos gerais
  // =========================================================================

  el.executar.addEventListener("click", executar);
  el.restaurar.addEventListener("click", function () { trocarCodigo(codigoInicial(atual)); });
  el.verSolucao.addEventListener("click", mostrarSolucao);
  el.usarSolucao.addEventListener("click", function () { trocarCodigo(atual.solucao); });

  function irPara(deslocamento) {
    const i = indiceDe(atual) + deslocamento;
    if (i >= 0 && i < DESAFIOS.length) abrirDesafio(DESAFIOS[i]);
  }
  el.anterior.addEventListener("click", function () { irPara(-1); });
  el.proximo.addEventListener("click", function () { irPara(1); });

  // Atalhos fora do editor: Alt+←/→ troca de desafio, Ctrl+Enter executa
  document.addEventListener("keydown", function (e) {
    if (e.target === campo) return;
    if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); irPara(-1); }
    else if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); irPara(1); }
    else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); executar(); }
  });

  // Voltar/avançar do navegador ou link com #id
  window.addEventListener("hashchange", function () {
    const d = porId[location.hash.slice(1)];
    if (d && d !== atual) abrirDesafio(d);
  });

  // Clique em um item da lista (delegação de evento)
  el.lista.addEventListener("click", function (e) {
    const item = e.target.closest(".item");
    if (!item || !porId[item.dataset.id]) return;
    abrirDesafio(porId[item.dataset.id]);
    fecharLateral();
  });

  // Lista recolhível no celular
  function fecharLateral() {
    el.lateral.classList.remove("aberta");
    el.alternarLateral.setAttribute("aria-expanded", "false");
  }
  el.alternarLateral.addEventListener("click", function () {
    const aberta = el.lateral.classList.toggle("aberta");
    el.alternarLateral.setAttribute("aria-expanded", String(aberta));
  });

  el.zerar.addEventListener("click", function () {
    if (!window.confirm("Apagar todo o progresso, pontos e códigos salvos?")) return;
    Progresso.zerar();
    Object.keys(ultimoCodigoErrado).forEach(function (k) { delete ultimoCodigoErrado[k]; });
    renderPlacar();
    abrirDesafio(DESAFIOS[0]);
  });

  // =========================================================================
  // Início: #id do endereço > último desafio aberto > primeiro pendente
  // =========================================================================
  aplicarTema(temaSalvo());
  Executor.preparar(); // o Pyodide leva alguns segundos: já começa a baixar enquanto o usuário lê o enunciado
  renderPlacar();
  const inicial = porId[location.hash.slice(1)] ||
    porId[Progresso.atual()] ||
    proximoPendente(null) ||
    DESAFIOS[0];
  abrirDesafio(inicial);
})();

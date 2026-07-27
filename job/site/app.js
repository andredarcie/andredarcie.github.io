/* Radar de vagas dev — montagem da página a partir de site/dados.js.
   Sem dependências. Toda porcentagem vem do arquivo de dados: nada de número
   escrito à mão aqui, para a página não descolar do relatório. */

(() => {
  const dados = window.__RADAR__;
  if (!dados) return;

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

  const pct = (n) =>
    `${Number(n).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`;
  const inteiro = (n) => Number(n).toLocaleString('pt-BR');

  const elemento = (tag, classe, texto) => {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    return el;
  };

  const porId = Object.fromEntries(dados.ranking.map((r) => [r.id, r]));

  /* ---------------- tema ---------------- */

  const raiz = document.documentElement;
  const botaoTema = $('#botao-tema');
  const CICLO = { auto: 'claro', claro: 'escuro', escuro: 'auto' };
  const NOME_TEMA = { auto: 'Tema: sistema', claro: 'Tema: claro', escuro: 'Tema: escuro' };

  function aplicarTema(tema) {
    raiz.dataset.tema = tema;
    botaoTema.textContent = NOME_TEMA[tema];
    try {
      localStorage.setItem('radar-tema', tema);
    } catch {
      /* navegação privada: só não persiste */
    }
  }

  let temaSalvo = 'auto';
  try {
    temaSalvo = localStorage.getItem('radar-tema') || 'auto';
  } catch {
    /* idem */
  }
  aplicarTema(temaSalvo);
  botaoTema.addEventListener('click', () => aplicarTema(CICLO[raiz.dataset.tema] || 'claro'));

  /* ---------------- dica flutuante ---------------- */

  const dica = $('#dica');
  let dicaAtiva = null;

  function mostrarDica(alvo, titulo, linhas) {
    dica.innerHTML = '';
    dica.append(elemento('span', 'dica__titulo', titulo));
    linhas.filter(Boolean).forEach((l) => dica.append(elemento('span', 'dica__valor', l)));
    dica.dataset.visivel = 'true';
    dicaAtiva = alvo;
    posicionarDica(alvo);
  }

  function posicionarDica(alvo) {
    const caixa = alvo.getBoundingClientRect();
    const propria = dica.getBoundingClientRect();
    const margem = 10;
    let esquerda = caixa.left + caixa.width / 2 - propria.width / 2;
    esquerda = Math.max(margem, Math.min(esquerda, window.innerWidth - propria.width - margem));
    let topo = caixa.top - propria.height - 8;
    if (topo < margem) topo = caixa.bottom + 8;
    dica.style.left = `${esquerda}px`;
    dica.style.top = `${topo}px`;
  }

  function esconderDica() {
    dica.dataset.visivel = 'false';
    dicaAtiva = null;
  }

  window.addEventListener('scroll', () => dicaAtiva && posicionarDica(dicaAtiva), {
    passive: true,
  });

  // Alvo de hover é sempre o elemento inteiro (linha, cartão, degrau), nunca a
  // barra de 10px: o alvo precisa ser maior que a marca.
  function ligarDica(alvo, titulo, linhas) {
    const abrir = () => mostrarDica(alvo, titulo, linhas);
    alvo.addEventListener('mouseenter', abrir);
    alvo.addEventListener('focus', abrir);
    alvo.addEventListener('mouseleave', esconderDica);
    alvo.addEventListener('blur', esconderDica);
  }

  /* ---------------- números da abertura ---------------- */

  const meta = dados.meta;
  const mapaMeta = {
    total: inteiro(meta.total),
    requisitos: inteiro(meta.totalRequisitos),
    media: meta.mediaRequisitos.toLocaleString('pt-BR', { minimumFractionDigits: 1 }),
    idiomas: `${meta.porIdioma.pt} / ${meta.porIdioma.en}`,
    data: new Date(`${meta.geradoEm}T12:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
    recorte: pct(meta.recorteBeneficios.pctDoCorpus),
    silencioHn: pct(meta.silencio.hackernews),
    silencioGupy: pct(meta.silencio.gupy),
  };
  $$('[data-meta]').forEach((el) => {
    const valor = mapaMeta[el.dataset.meta];
    if (valor !== undefined) el.textContent = valor;
  });

  $('#olho-abertura').textContent =
    `Relatório · ${inteiro(meta.total)} anúncios · ${meta.fontes.length} boards · ${mapaMeta.data}`;

  // Chips do anúncio ilustrativo.
  $$('[data-req]').forEach((el) => {
    const r = porId[el.dataset.req];
    if (r) el.textContent = pct(r.pct);
  });

  /* ---------------- tripé ---------------- */

  const alvoTripe = $('#tripe-cartoes');
  dados.tripe.forEach((eixo) => {
    const cartao = elemento('article', 'eixo');
    cartao.append(elemento('h3', 'eixo__titulo', eixo.titulo));
    cartao.append(elemento('p', 'eixo__texto', eixo.texto));

    const itens = elemento('div', 'eixo__itens');
    eixo.itens.forEach((item) => {
      const linha = elemento('div', 'linha-dado');
      linha.append(elemento('span', 'linha-dado__rotulo', item.rotulo));
      linha.append(elemento('span', 'linha-dado__valor', pct(item.pct)));

      const trilho = elemento('div', 'trilho');
      const preenchimento = elemento('div', 'trilho__preenchimento');
      preenchimento.style.width = `${item.pct}%`;
      const piso = elemento('div', 'trilho__piso');
      piso.style.left = `${item.piso}%`;
      trilho.append(preenchimento, piso);
      linha.append(trilho);

      ligarDica(linha, item.rotulo, [
        `${pct(item.pct)} de todos os anúncios`,
        `piso entre fontes: ${pct(item.piso)}`,
      ]);
      linha.tabIndex = 0;
      itens.append(linha);
    });

    cartao.append(itens);
    alvoTripe.append(cartao);
  });

  /* ---------------- cobertura por categoria ---------------- */

  const alvoCobertura = $('#cobertura');
  dados.cobertura.forEach((cat) => {
    const item = elemento('div', 'cobertura__item');
    item.tabIndex = 0;
    item.append(elemento('h3', 'cobertura__nome', cat.nome));
    item.append(
      elemento(
        'span',
        'cobertura__detalhe',
        `${cat.requisitos} itens na taxonomia · ${inteiro(cat.n)} anúncios`
      )
    );

    const grafico = elemento('div', 'cobertura__grafico');
    const trilho = elemento('div', 'cobertura__trilho');
    const preenchimento = elemento('div', 'cobertura__preenchimento');
    preenchimento.style.width = `${cat.pct}%`;
    trilho.append(preenchimento);
    grafico.append(trilho, elemento('span', 'cobertura__valor', pct(cat.pct)));
    item.append(grafico);

    ligarDica(item, cat.nome, [
      `${pct(cat.pct)} dos anúncios · ${inteiro(cat.n)} vagas`,
      `português ${pct(cat.pt)} · inglês ${pct(cat.en)}`,
    ]);
    alvoCobertura.append(item);
  });

  /* ---------------- ranking ---------------- */

  const estado = { categoria: 'todas', ordem: 'pct', busca: '' };
  const alvoLinhas = $('#ranking-linhas');
  const alvoFiltros = $('#filtros-categoria');

  const categorias = [['todas', 'Todas'], ...Object.entries(dados.categorias)];
  categorias.forEach(([id, nome]) => {
    const chip = elemento('button', 'chip', nome);
    chip.type = 'button';
    chip.setAttribute('aria-pressed', String(id === 'todas'));
    chip.addEventListener('click', () => {
      estado.categoria = id;
      $$('button', alvoFiltros).forEach((b) =>
        b.setAttribute('aria-pressed', String(b === chip))
      );
      desenharRanking();
    });
    alvoFiltros.append(chip);
  });

  $$('[data-ordem]').forEach((botao) => {
    botao.addEventListener('click', () => {
      estado.ordem = botao.dataset.ordem;
      $$('[data-ordem]').forEach((b) =>
        b.setAttribute('aria-pressed', String(b === botao))
      );
      desenharRanking();
    });
  });

  const busca = $('#busca');
  busca.addEventListener('input', () => {
    estado.busca = busca.value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    desenharRanking();
  });

  function filtrados() {
    return dados.ranking
      .filter((r) => estado.categoria === 'todas' || r.categoria === estado.categoria)
      .filter(
        (r) =>
          !estado.busca ||
          r.rotulo
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .includes(estado.busca)
      )
      .sort((a, b) => b[estado.ordem] - a[estado.ordem]);
  }

  function desenharRanking() {
    const lista = filtrados();
    alvoLinhas.innerHTML = '';

    if (lista.length === 0) {
      alvoLinhas.append(
        elemento('p', 'ranking__vazio', 'Nenhum requisito bate com esse filtro.')
      );
      desenharTabelaRanking(lista);
      return;
    }

    lista.forEach((r, i) => {
      const linha = elemento('div', 'ranking__linha');
      linha.tabIndex = 0;
      linha.append(elemento('span', 'ranking__posicao', String(i + 1)));

      const nome = elemento('div', 'ranking__nome', r.rotulo);
      nome.append(elemento('span', 'ranking__categoria', dados.categorias[r.categoria]));
      linha.append(nome);

      const barra = elemento('div', 'ranking__barra');
      const faixa = elemento('div', 'ranking__faixa');
      faixa.style.left = `${r.piso}%`;
      faixa.style.width = `${Math.max(0.6, r.teto - r.piso)}%`;
      const preenchimento = elemento('div', 'ranking__preenchimento');
      preenchimento.style.width = `${r.pct}%`;
      barra.append(faixa, preenchimento);
      linha.append(barra);

      linha.append(elemento('span', 'ranking__num', pct(r.pct)));
      linha.append(elemento('span', 'ranking__num ranking__num--fraco', pct(r.pt)));
      linha.append(elemento('span', 'ranking__num ranking__num--fraco', pct(r.en)));

      ligarDica(linha, r.rotulo, [
        `${pct(r.pct)} dos anúncios · ${inteiro(r.n)} vagas`,
        `entre fontes: de ${pct(r.piso)} a ${pct(r.teto)}`,
        `só nos boards estruturados: ${pct(r.pctBoards)}`,
      ]);

      alvoLinhas.append(linha);
    });

    desenharTabelaRanking(lista);
  }

  function tabela(cabecalhos, linhas) {
    const t = elemento('table');
    const thead = elemento('thead');
    const trCabecalho = elemento('tr');
    cabecalhos.forEach((c) => trCabecalho.append(elemento('th', null, c)));
    thead.append(trCabecalho);
    const tbody = elemento('tbody');
    linhas.forEach((l) => {
      const tr = elemento('tr');
      l.forEach((celula, i) => tr.append(elemento(i === 0 ? 'th' : 'td', null, celula)));
      tbody.append(tr);
    });
    t.append(thead, tbody);
    return t;
  }

  function desenharTabelaRanking(lista) {
    const alvo = $('#tabela-ranking');
    alvo.innerHTML = '';
    alvo.append(
      tabela(
        ['Requisito', 'Categoria', 'Geral', 'Boards', 'PT', 'EN', 'Piso', 'Teto', 'Vagas'],
        lista.map((r) => [
          r.rotulo,
          dados.categorias[r.categoria],
          pct(r.pct),
          pct(r.pctBoards),
          pct(r.pt),
          pct(r.en),
          pct(r.piso),
          pct(r.teto),
          inteiro(r.n),
        ])
      )
    );
  }

  desenharRanking();

  /* ---------------- Brasil × global ---------------- */

  const alvoComparacao = $('#comparacao');
  [
    ['Cobrado mais no Brasil', 'Diferença em pontos percentuais sobre o mercado global', dados.brasil],
    ['Cobrado mais lá fora', 'Diferença em pontos percentuais sobre o mercado brasileiro', dados.global],
  ].forEach(([titulo, nota, itens]) => {
    const bloco = elemento('div');
    bloco.append(elemento('h3', 'comparacao__titulo', titulo));
    bloco.append(elemento('p', 'comparacao__nota', nota));

    itens.forEach((item) => {
      const par = elemento('div', 'par');
      par.tabIndex = 0;
      par.append(
        elemento('div', 'par__rotulo', `${item.rotulo} · +${pct(Math.abs(item.diff))
          .replace('%', ' p.p.')
          .trim()}`)
      );

      const barras = elemento('div', 'par__barras');
      [
        ['PT', item.pt, 'pt'],
        ['EN', item.en, 'en'],
      ].forEach(([sigla, valor, classe]) => {
        const linha = elemento('div', 'par__linha');
        linha.append(elemento('span', 'par__sigla', sigla));
        const trilho = elemento('div', 'par__trilho');
        const preenchimento = elemento('div', `par__preenchimento par__preenchimento--${classe}`);
        preenchimento.style.width = `${valor}%`;
        trilho.append(preenchimento);
        linha.append(trilho, elemento('span', 'par__valor', pct(valor)));
        barras.append(linha);
      });

      par.append(barras);
      ligarDica(par, item.rotulo, [
        `português ${pct(item.pt)} · inglês ${pct(item.en)}`,
        `diferença de ${pct(Math.abs(item.diff)).replace('%', '')} pontos percentuais`,
      ]);
      bloco.append(par);
    });

    alvoComparacao.append(bloco);
  });

  /* ---------------- as três fontes brasileiras ---------------- */

  const brasilFontes = dados.brasilFontes;
  if (brasilFontes && brasilFontes.itens.length) {
    const alvoLegenda = $('#legenda-brasil');
    brasilFontes.fontes.forEach((fonte, i) => {
      const item = elemento('span', 'legenda__item');
      item.append(elemento('span', `legenda__amostra legenda__amostra--serie${i + 1}`));
      item.append(
        elemento('span', null, `${fonte.nome} — ${fonte.rotulo} (${inteiro(fonte.total)})`)
      );
      alvoLegenda.append(item);
    });

    const alvoGrupos = $('#brasil-fontes');
    brasilFontes.itens.forEach((item) => {
      const grupo = elemento('div', 'grupo');
      grupo.tabIndex = 0;

      const topo = elemento('div', 'grupo__topo');
      topo.append(elemento('span', 'grupo__rotulo', item.rotulo));
      topo.append(
        elemento(
          'span',
          'grupo__amplitude',
          `${item.amplitude.toLocaleString('pt-BR')} p.p. de distância`
        )
      );
      grupo.append(topo);

      const barras = elemento('div', 'grupo__barras');
      item.valores.forEach((valor, i) => {
        const linha = elemento('div', 'grupo__linha');
        const trilho = elemento('div', 'grupo__trilho');
        const preenchimento = elemento('div', 'grupo__preenchimento');
        preenchimento.style.width = `${valor}%`;
        preenchimento.style.background = `var(--serie-${i + 1})`;
        trilho.append(preenchimento);
        linha.append(trilho, elemento('span', 'grupo__valor', pct(valor)));
        barras.append(linha);
      });
      grupo.append(barras);

      ligarDica(
        grupo,
        item.rotulo,
        brasilFontes.fontes.map((f, i) => `${f.nome}: ${pct(item.valores[i])}`)
      );
      alvoGrupos.append(grupo);
    });

    $('#tabela-brasil').append(
      tabela(
        ['Requisito', ...brasilFontes.fontes.map((f) => f.nome), 'Distância'],
        brasilFontes.itens.map((item) => [
          item.rotulo,
          ...item.valores.map(pct),
          `${item.amplitude.toLocaleString('pt-BR')} p.p.`,
        ])
      )
    );
  }

  /* ---------------- senioridade ---------------- */

  const alvoSenioridade = $('#senioridade');
  const faixas = dados.senioridade.faixas;

  dados.senioridade.itens.forEach((item) => {
    const linha = elemento('div', 'senioridade__linha');
    linha.tabIndex = 0;
    linha.append(elemento('div', 'senioridade__nome', item.rotulo));

    const degraus = elemento('div', 'senioridade__degraus');
    const maximo = Math.max(...item.valores, 1);
    item.valores.forEach((valor, i) => {
      const degrau = elemento('div', 'degrau');
      const preenchimento = elemento('div', 'degrau__preenchimento');
      preenchimento.style.height = `${Math.max(3, (valor / maximo) * 100)}%`;
      preenchimento.style.background = `var(--ord-${i + 1})`;
      degrau.append(elemento('span', 'degrau__valor', pct(valor)), preenchimento);
      degraus.append(degrau);
    });
    linha.append(degraus);

    const marca = elemento(
      'div',
      `senioridade__marca senioridade__marca--${item.confundido ? 'alerta' : 'ok'}`
    );
    marca.append(
      elemento('span', null, item.confundido ? '⚠' : '↗'),
      elemento(
        'span',
        null,
        item.confundido
          ? 'confundido'
          : `${item.delta > 0 ? '+' : ''}${item.delta.toLocaleString('pt-BR')} p.p.`
      )
    );
    linha.append(marca);

    ligarDica(linha, item.rotulo, [
      faixas.map((f, i) => `${f.rotulo} ${pct(item.valores[i])}`).join(' · '),
      `diferença PT–EN: ${item.gap.toLocaleString('pt-BR')} p.p.`,
      item.confundido
        ? 'A diferença entre os dois mercados explica boa parte da curva.'
        : 'A curva sobrevive à diferença entre mercados.',
    ]);

    alvoSenioridade.append(linha);
  });

  const eixo = elemento('div', 'senioridade__eixo');
  const rotulos = elemento('div', 'senioridade__faixas');
  faixas.forEach((f) => rotulos.append(elemento('span', null, `${f.rotulo} (${f.total})`)));
  eixo.append(rotulos);
  alvoSenioridade.append(eixo);

  $('#tabela-senioridade').append(
    tabela(
      ['Requisito', ...faixas.map((f) => f.rotulo), 'Variação', 'Gap PT–EN'],
      dados.senioridade.itens.map((item) => [
        item.rotulo,
        ...item.valores.map(pct),
        `${item.delta > 0 ? '+' : ''}${item.delta.toLocaleString('pt-BR')} p.p.`,
        `${item.gap > 0 ? '+' : ''}${item.gap.toLocaleString('pt-BR')} p.p.`,
      ])
    )
  );

  /* ---------------- anos de experiência ---------------- */

  const anos = dados.anos;
  $('#anos-intro').textContent =
    `${pct(anos.pctDoCorpus)} dos anúncios (${inteiro(anos.vagasComNumero)} vagas) declaram um ` +
    `número mínimo de anos. Entre elas, a mediana é ${anos.mediana} anos e a média ` +
    `${anos.media.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}. ` +
    `Os outros ${pct(100 - anos.pctDoCorpus)} não cravam número nenhum.`;

  const distribuicao = Object.entries(anos.distribuicao)
    .map(([ano, n]) => ({ ano: Number(ano), n }))
    .sort((a, b) => a.ano - b.ano);
  const maiorBarra = Math.max(...distribuicao.map((d) => d.n));

  const alvoColunas = $('#colunas-anos');
  const alvoEixo = $('#colunas-eixo');
  distribuicao.forEach((d) => {
    const coluna = elemento('div', 'coluna');
    coluna.tabIndex = 0;
    coluna.append(elemento('span', 'coluna__valor', String(d.n)));
    // 88% e não 100%: o rótulo com a contagem ocupa a faixa de cima da coluna.
    const barra = elemento('div', 'coluna__barra');
    barra.style.height = `${(d.n / maiorBarra) * 88}%`;
    coluna.append(barra);
    ligarDica(coluna, `${d.ano} ${d.ano === 1 ? 'ano' : 'anos'} de experiência`, [
      `${inteiro(d.n)} vagas`,
      `${pct(Math.round((d.n / anos.vagasComNumero) * 1000) / 10)} das que cravam número`,
    ]);
    alvoColunas.append(coluna);
    alvoEixo.append(elemento('span', 'colunas__marca', String(d.ano)));
  });

  /* ---------------- raros e duplas ---------------- */

  const alvoRaros = $('#raros');
  dados.raros.forEach((r) => {
    const item = elemento('div', 'raro');
    item.append(elemento('span', 'raro__valor', pct(r.pct)));
    const nome = elemento('div', 'raro__nome', r.rotulo);
    nome.append(elemento('span', 'raro__categoria', dados.categorias[r.categoria]));
    item.append(nome);
    alvoRaros.append(item);
  });

  const alvoDuplas = $('#duplas');
  dados.coocorrencia.forEach((par) => {
    const item = elemento('div', 'dupla');
    item.append(elemento('span', 'dupla__valor', pct(par.pct)));
    item.append(elemento('span', null, `${par.a} + ${par.b}`));
    alvoDuplas.append(item);
  });

  /* ---------------- arquivos do dataset ---------------- */

  const tamanho = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
    return `${Math.round(bytes / 1024)} kB`;
  };

  const alvoArquivos = $('#arquivos');
  if (dados.dataset && alvoArquivos) {
    dados.dataset.arquivos.forEach((arq) => {
      const item = elemento('a', 'arquivo');
      item.href = `dados/${arq.arquivo}`;
      item.setAttribute('download', '');

      const topo = elemento('div', 'arquivo__topo');
      topo.append(elemento('span', 'arquivo__nome', arq.arquivo));
      topo.append(elemento('span', 'arquivo__tamanho', tamanho(arq.bytes)));
      item.append(topo);

      item.append(elemento('p', 'arquivo__descricao', arq.descricao));
      item.append(
        elemento(
          'span',
          'arquivo__forma',
          `${inteiro(arq.linhas)} linhas · ${arq.colunas} colunas`
        )
      );
      alvoArquivos.append(item);
    });
  } else if (alvoArquivos) {
    alvoArquivos.append(
      elemento(
        'p',
        'ranking__vazio',
        'Os CSVs ainda não foram gerados. Rode `npm run exportar`.'
      )
    );
  }

  /* ---------------- fontes ---------------- */

  const alvoFontes = $('#fontes');
  meta.fontes.forEach((fonte) => {
    const cartao = elemento('div', 'fonte');
    const nome = elemento('div', 'fonte__nome');
    nome.append(elemento('span', null, fonte.nome), elemento('span', 'fonte__n', inteiro(fonte.n)));
    cartao.append(nome, elemento('p', 'fonte__escopo', fonte.escopo));
    alvoFontes.append(cartao);
  });

  /* ---------------- alternar tabelas ---------------- */

  $$('.alternar').forEach((botao) => {
    const alvo = document.getElementById(botao.dataset.alvo);
    botao.addEventListener('click', () => {
      const escondido = alvo.hasAttribute('hidden');
      alvo.toggleAttribute('hidden', !escondido);
      botao.textContent = escondido ? 'Ocultar tabela' : 'Ver como tabela';
    });
  });
})();

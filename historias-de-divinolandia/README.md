# Histórias de Divinolândia

Um livro aberto sobre a história de Divinolândia (SP), a antiga Sapecado, escrito um capítulo de cada vez a partir de fontes públicas.

Online: <https://andredarcie.github.io/historias-de-divinolandia/index.html>

## Como é o livro

É uma página só (`index.html`) que se lê como um PDF aberto, sem baixar nada: capa, página de apresentação, sumário, capítulos com abertura, cabeçalho, número de página e notas no fim de cada capítulo. Funciona no computador e no celular.

O texto não é dividido em páginas à mão. O script lê os capítulos escondidos em `#fonte` e corta o texto em páginas do tamanho da tela:

- no computador, páginas de 600 × 860 px;
- no celular, páginas da largura da tela (proporção 2:3), com o texto repaginado para continuar legível.

O sumário é montado depois da paginação, com os números de página de verdade. Por isso a numeração muda entre o computador e o celular, como mudaria entre duas edições impressas.

A fonte é a EB Garamond, do Google Fonts. Imprimir a página (Ctrl+P) sai uma página do livro por folha.

## Como escrever um capítulo novo

1. Dentro de `<div id="fonte">`, copie um `<section class="capitulo">` inteiro.
2. Ajuste `data-num`, `data-titulo` e `data-sub`.
3. Escreva em `<p>`, com intertítulos em `<h3>`. O primeiro parágrafo pode levar `class="capitular"`, para ter a letra grande.
4. Toda afirmação leva nota: `<sup><a href="#c2-n1">1</a></sup>`. As notas vão no `<ol class="notas">` do fim do capítulo, com `id` iguais (`c2-n1`, `c2-n2`…) e o endereço da fonte.
5. Tire o título da lista `#proximos` (os capítulos em pesquisa, que aparecem no sumário sem página).

## Regras do texto

- Toda afirmação tem fonte, e a fonte tem endereço, para quem quiser conferir.
- Onde as fontes não dizem, o texto diz que não sabe. Nada de completar com suposição.
- Citação só curta e entre aspas; o resto é contado com as nossas palavras.
- Os temas seguem o índice de *Divinolândia... Nos Caminhos do Tempo* (Válter Roberto Lopes e Orlanda Maria Grespan de Faria, 1991), que não está disponível na internet.

## Capítulos

| Nº | Título | Estado |
|---|---|---|
| 1 | Quando a guerra chegou: Sapecado na Revolução de 1932 | escrito (14 notas) |
| 2 | As fazendas e a escravidão: do quilombo do Careca aos colonos do café | escrito (9 notas) |
| — | O pouso que pegou fogo: as origens de Sapecado | em pesquisa |
| — | Capela, freguesia e patrimônio | em pesquisa |
| — | O tempo dos coronéis | em pesquisa |
| — | Os imigrantes | em pesquisa |
| — | Os primeiros tempos: comércio, saúde, rádio e cinema | em pesquisa |
| — | A capital da batata | em pesquisa |
| — | A fé: a matriz e o Padre Ladislau | em pesquisa |
| — | O sanatório e o Hospital Regional | em pesquisa |
| — | Os bairros | em pesquisa |
| — | De Sapecado a Divinolândia | em pesquisa |

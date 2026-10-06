/*
 * desafios.js — banco de desafios.
 *
 * A ordem do array é a trilha sugerida: por categoria e, dentro dela,
 * do nível iniciante para o intermediário.
 *
 * Formato de cada desafio:
 *   id          identificador único (usado no progresso salvo)
 *   categoria   id de uma das CATEGORIAS
 *   nivel       "iniciante" | "intermediario"
 *   titulo      nome curto
 *   enunciado   HTML do enunciado
 *   funcao      nome da função que o usuário precisa escrever
 *   parametros  parâmetros do código inicial (ex.: "a, b")
 *   testes      [{ chamada: "expressão JS", esperado: valor }]
 *               os primeiros `exemplos` testes aparecem como exemplo (padrão 2)
 *   dicas       mostradas uma por vez, a cada tentativa errada
 *   solucao     código de referência (liberado após 3 erros ou ao acertar)
 *   proibido    (opcional) [{ padrao: regex em texto, mensagem }] para vetar atalhos
 */

window.CATEGORIAS = [
  { id: "condicionais", nome: "Condicionais" },
  { id: "loops", nome: "Loops" },
  { id: "arrays", nome: "Arrays" },
  { id: "funcoes", nome: "Funções" },
  { id: "algoritmos", nome: "Algoritmos" },
];

window.DESAFIOS = [
  // ===================================================================
  // CONDICIONAIS
  // ===================================================================
  {
    id: "par-ou-impar",
    categoria: "condicionais",
    nivel: "iniciante",
    titulo: "Par ou ímpar",
    enunciado:
      "<p>Escreva a função <code>parOuImpar(n)</code> que recebe um número inteiro e retorna o texto " +
      "<code>\"par\"</code> se ele for par, ou <code>\"ímpar\"</code> se for ímpar.</p>" +
      "<p>Atenção: números negativos também podem aparecer.</p>",
    funcao: "parOuImpar",
    parametros: "n",
    testes: [
      { chamada: "parOuImpar(4)", esperado: "par" },
      { chamada: "parOuImpar(7)", esperado: "ímpar" },
      { chamada: "parOuImpar(0)", esperado: "par" },
      { chamada: "parOuImpar(-3)", esperado: "ímpar" },
      { chamada: "parOuImpar(-8)", esperado: "par" },
    ],
    dicas: [
      "O operador % devolve o resto da divisão. Um número é par quando o resto da divisão por 2 é zero.",
      "Cuidado: em JavaScript, -3 % 2 vale -1 (e não 1). Compare o resto com 0 em vez de comparar com 1.",
      "Confira se o texto retornado está exatamente igual: \"ímpar\" leva acento.",
    ],
    solucao:
      "function parOuImpar(n) {\n" +
      "  if (n % 2 === 0) {\n" +
      "    return \"par\";\n" +
      "  }\n" +
      "  return \"ímpar\";\n" +
      "}",
  },
  {
    id: "maior-de-tres",
    categoria: "condicionais",
    nivel: "iniciante",
    titulo: "Maior de três",
    enunciado:
      "<p>Escreva <code>maiorDeTres(a, b, c)</code>, que retorna o maior dos três números recebidos.</p>" +
      "<p>Tente resolver só com <code>if</code>, sem usar <code>Math.max</code>.</p>",
    funcao: "maiorDeTres",
    parametros: "a, b, c",
    testes: [
      { chamada: "maiorDeTres(1, 5, 3)", esperado: 5 },
      { chamada: "maiorDeTres(9, 2, 4)", esperado: 9 },
      { chamada: "maiorDeTres(2, 2, 8)", esperado: 8 },
      { chamada: "maiorDeTres(-1, -7, -3)", esperado: -1 },
      { chamada: "maiorDeTres(6, 6, 6)", esperado: 6 },
    ],
    dicas: [
      "Guarde o primeiro número numa variável `maior` e depois compare com os outros dois.",
      "Se b for maior que `maior`, troque. Depois faça o mesmo com c.",
      "Lembre de retornar o valor com `return` no final.",
    ],
    solucao:
      "function maiorDeTres(a, b, c) {\n" +
      "  let maior = a;\n" +
      "  if (b > maior) maior = b;\n" +
      "  if (c > maior) maior = c;\n" +
      "  return maior;\n" +
      "}",
  },
  {
    id: "faixa-etaria",
    categoria: "condicionais",
    nivel: "iniciante",
    titulo: "Faixa etária",
    enunciado:
      "<p>Escreva <code>classificarIdade(idade)</code> que retorna a faixa etária:</p>" +
      "<ul>" +
      "<li>0 a 12 → <code>\"criança\"</code></li>" +
      "<li>13 a 17 → <code>\"adolescente\"</code></li>" +
      "<li>18 a 59 → <code>\"adulto\"</code></li>" +
      "<li>60 ou mais → <code>\"idoso\"</code></li>" +
      "</ul>",
    funcao: "classificarIdade",
    parametros: "idade",
    testes: [
      { chamada: "classificarIdade(8)", esperado: "criança" },
      { chamada: "classificarIdade(30)", esperado: "adulto" },
      { chamada: "classificarIdade(12)", esperado: "criança" },
      { chamada: "classificarIdade(13)", esperado: "adolescente" },
      { chamada: "classificarIdade(17)", esperado: "adolescente" },
      { chamada: "classificarIdade(18)", esperado: "adulto" },
      { chamada: "classificarIdade(59)", esperado: "adulto" },
      { chamada: "classificarIdade(60)", esperado: "idoso" },
      { chamada: "classificarIdade(91)", esperado: "idoso" },
    ],
    dicas: [
      "Use uma sequência de if / else if, testando as faixas da menor para a maior idade.",
      "Os limites são inclusivos: 12 ainda é criança, 13 já é adolescente. Revise o uso de < e <=.",
      "Confira acentos e letras: \"criança\" tem ç.",
    ],
    solucao:
      "function classificarIdade(idade) {\n" +
      "  if (idade <= 12) return \"criança\";\n" +
      "  if (idade <= 17) return \"adolescente\";\n" +
      "  if (idade <= 59) return \"adulto\";\n" +
      "  return \"idoso\";\n" +
      "}",
  },
  {
    id: "calculadora",
    categoria: "condicionais",
    nivel: "iniciante",
    titulo: "Calculadora",
    enunciado:
      "<p>Escreva <code>calculadora(a, operador, b)</code>. O operador é um texto: " +
      "<code>\"+\"</code>, <code>\"-\"</code>, <code>\"*\"</code> ou <code>\"/\"</code>. Retorne o resultado da conta.</p>" +
      "<p>Retorne o texto <code>\"erro\"</code> se o operador não for nenhum desses ou se houver divisão por zero.</p>",
    funcao: "calculadora",
    parametros: "a, operador, b",
    testes: [
      { chamada: 'calculadora(2, "+", 3)', esperado: 5 },
      { chamada: 'calculadora(10, "/", 4)', esperado: 2.5 },
      { chamada: 'calculadora(7, "-", 9)', esperado: -2 },
      { chamada: 'calculadora(6, "*", 7)', esperado: 42 },
      { chamada: 'calculadora(5, "/", 0)', esperado: "erro" },
      { chamada: 'calculadora(1, "%", 1)', esperado: "erro" },
    ],
    dicas: [
      "Quando uma mesma variável é comparada com vários valores, o `switch (operador)` deixa o código mais limpo que vários if.",
      "Em JavaScript, 5 / 0 não dá erro: dá Infinity. Por isso você precisa checar `b === 0` antes de dividir.",
      "O `default` do switch (ou o último else) cobre os operadores desconhecidos.",
    ],
    solucao:
      "function calculadora(a, operador, b) {\n" +
      "  switch (operador) {\n" +
      "    case \"+\": return a + b;\n" +
      "    case \"-\": return a - b;\n" +
      "    case \"*\": return a * b;\n" +
      "    case \"/\":\n" +
      "      if (b === 0) return \"erro\";\n" +
      "      return a / b;\n" +
      "    default:\n" +
      "      return \"erro\";\n" +
      "  }\n" +
      "}",
  },
  {
    id: "ano-bissexto",
    categoria: "condicionais",
    nivel: "intermediario",
    titulo: "Ano bissexto",
    enunciado:
      "<p>Escreva <code>anoBissexto(ano)</code> que retorna <code>true</code> se o ano for bissexto e " +
      "<code>false</code> caso contrário.</p>" +
      "<p>Regra: um ano é bissexto se for divisível por 4, <strong>exceto</strong> os divisíveis por 100 — " +
      "a não ser que também sejam divisíveis por 400.</p>",
    funcao: "anoBissexto",
    parametros: "ano",
    testes: [
      { chamada: "anoBissexto(2024)", esperado: true },
      { chamada: "anoBissexto(1900)", esperado: false },
      { chamada: "anoBissexto(2023)", esperado: false },
      { chamada: "anoBissexto(2000)", esperado: true },
      { chamada: "anoBissexto(2100)", esperado: false },
      { chamada: "anoBissexto(1600)", esperado: true },
    ],
    dicas: [
      "Divisível por X é o mesmo que `ano % X === 0`.",
      "1900 é divisível por 4 e por 100, mas não por 400 — então NÃO é bissexto. 2000 é divisível por 400, então é.",
      "Dá para escrever tudo numa linha: (divisível por 4 E não por 100) OU divisível por 400.",
    ],
    solucao:
      "function anoBissexto(ano) {\n" +
      "  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;\n" +
      "}",
  },
  {
    id: "fizzbuzz-numero",
    categoria: "condicionais",
    nivel: "intermediario",
    titulo: "FizzBuzz de um número",
    enunciado:
      "<p>Escreva <code>fizzBuzzNumero(n)</code> que retorna:</p>" +
      "<ul>" +
      "<li><code>\"FizzBuzz\"</code> se n for divisível por 3 e por 5</li>" +
      "<li><code>\"Fizz\"</code> se for divisível só por 3</li>" +
      "<li><code>\"Buzz\"</code> se for divisível só por 5</li>" +
      "<li>o próprio número <strong>como texto</strong> nos outros casos (ex.: <code>\"7\"</code>)</li>" +
      "</ul>",
    funcao: "fizzBuzzNumero",
    parametros: "n",
    testes: [
      { chamada: "fizzBuzzNumero(9)", esperado: "Fizz" },
      { chamada: "fizzBuzzNumero(15)", esperado: "FizzBuzz" },
      { chamada: "fizzBuzzNumero(10)", esperado: "Buzz" },
      { chamada: "fizzBuzzNumero(7)", esperado: "7" },
      { chamada: "fizzBuzzNumero(3)", esperado: "Fizz" },
      { chamada: "fizzBuzzNumero(30)", esperado: "FizzBuzz" },
      { chamada: "fizzBuzzNumero(1)", esperado: "1" },
    ],
    dicas: [
      "A ordem dos if importa: teste o caso \"divisível por 3 e por 5\" ANTES dos outros.",
      "Divisível por 3 e por 5 é o mesmo que divisível por 15.",
      "Para o último caso, converta o número em texto com String(n).",
    ],
    solucao:
      "function fizzBuzzNumero(n) {\n" +
      "  if (n % 15 === 0) return \"FizzBuzz\";\n" +
      "  if (n % 3 === 0) return \"Fizz\";\n" +
      "  if (n % 5 === 0) return \"Buzz\";\n" +
      "  return String(n);\n" +
      "}",
  },

  // ===================================================================
  // LOOPS
  // ===================================================================
  {
    id: "soma-ate-n",
    categoria: "loops",
    nivel: "iniciante",
    titulo: "Soma de 1 até N",
    enunciado:
      "<p>Escreva <code>somaAte(n)</code> que retorna a soma de todos os inteiros de 1 até <code>n</code>.</p>" +
      "<p>Se <code>n</code> for 0, o resultado é 0.</p>",
    funcao: "somaAte",
    parametros: "n",
    testes: [
      { chamada: "somaAte(5)", esperado: 15 },
      { chamada: "somaAte(10)", esperado: 55 },
      { chamada: "somaAte(1)", esperado: 1 },
      { chamada: "somaAte(0)", esperado: 0 },
      { chamada: "somaAte(100)", esperado: 5050 },
    ],
    dicas: [
      "Crie uma variável `total` começando em 0 e use um for de 1 até n.",
      "A condição do for precisa incluir o próprio n: use `i <= n`.",
    ],
    solucao:
      "function somaAte(n) {\n" +
      "  let total = 0;\n" +
      "  for (let i = 1; i <= n; i++) {\n" +
      "    total += i;\n" +
      "  }\n" +
      "  return total;\n" +
      "}",
  },
  {
    id: "tabuada",
    categoria: "loops",
    nivel: "iniciante",
    titulo: "Tabuada",
    enunciado:
      "<p>Escreva <code>tabuada(n)</code> que retorna um array com os resultados de " +
      "<code>n × 1</code> até <code>n × 10</code>, nessa ordem.</p>",
    funcao: "tabuada",
    parametros: "n",
    testes: [
      { chamada: "tabuada(2)", esperado: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20] },
      { chamada: "tabuada(7)", esperado: [7, 14, 21, 28, 35, 42, 49, 56, 63, 70] },
      { chamada: "tabuada(0)", esperado: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { chamada: "tabuada(-1)", esperado: [-1, -2, -3, -4, -5, -6, -7, -8, -9, -10] },
    ],
    dicas: [
      "Comece com um array vazio: `const resultado = [];`",
      "Use um for de 1 até 10 e, a cada volta, faça `resultado.push(n * i)`.",
    ],
    solucao:
      "function tabuada(n) {\n" +
      "  const resultado = [];\n" +
      "  for (let i = 1; i <= 10; i++) {\n" +
      "    resultado.push(n * i);\n" +
      "  }\n" +
      "  return resultado;\n" +
      "}",
  },
  {
    id: "fatorial",
    categoria: "loops",
    nivel: "iniciante",
    titulo: "Fatorial",
    enunciado:
      "<p>Escreva <code>fatorial(n)</code>. O fatorial de n é o produto de todos os inteiros de 1 até n: " +
      "<code>5! = 5 × 4 × 3 × 2 × 1 = 120</code>.</p>" +
      "<p>Por definição, <code>0! = 1</code>.</p>",
    funcao: "fatorial",
    parametros: "n",
    testes: [
      { chamada: "fatorial(5)", esperado: 120 },
      { chamada: "fatorial(0)", esperado: 1 },
      { chamada: "fatorial(1)", esperado: 1 },
      { chamada: "fatorial(7)", esperado: 5040 },
      { chamada: "fatorial(10)", esperado: 3628800 },
    ],
    dicas: [
      "Numa multiplicação acumulada, a variável começa em 1 (e não em 0, senão tudo vira 0).",
      "Se o loop vai de 2 até n, o caso n = 0 já devolve 1 sem precisar de if.",
    ],
    solucao:
      "function fatorial(n) {\n" +
      "  let resultado = 1;\n" +
      "  for (let i = 2; i <= n; i++) {\n" +
      "    resultado *= i;\n" +
      "  }\n" +
      "  return resultado;\n" +
      "}",
  },
  {
    id: "contar-vogais",
    categoria: "loops",
    nivel: "iniciante",
    titulo: "Contar vogais",
    enunciado:
      "<p>Escreva <code>contarVogais(texto)</code> que retorna quantas vogais (a, e, i, o, u) existem no texto, " +
      "contando maiúsculas e minúsculas.</p>" +
      "<p>Os textos dos testes não têm acentos.</p>",
    funcao: "contarVogais",
    parametros: "texto",
    testes: [
      { chamada: 'contarVogais("programar")', esperado: 3 },
      { chamada: 'contarVogais("JavaScript")', esperado: 3 },
      { chamada: 'contarVogais("xyz")', esperado: 0 },
      { chamada: 'contarVogais("")', esperado: 0 },
      { chamada: 'contarVogais("AEIOU aeiou")', esperado: 10 },
    ],
    dicas: [
      "Dá para percorrer um texto letra por letra com `for (const letra of texto)`.",
      "Transforme o texto em minúsculas antes com `texto.toLowerCase()` para não precisar testar \"A\" e \"a\".",
      "`\"aeiou\".includes(letra)` diz se a letra é uma vogal.",
    ],
    solucao:
      "function contarVogais(texto) {\n" +
      "  const vogais = \"aeiou\";\n" +
      "  let total = 0;\n" +
      "  for (const letra of texto.toLowerCase()) {\n" +
      "    if (vogais.includes(letra)) total++;\n" +
      "  }\n" +
      "  return total;\n" +
      "}",
  },
  {
    id: "soma-digitos",
    categoria: "loops",
    nivel: "iniciante",
    titulo: "Soma dos dígitos",
    enunciado:
      "<p>Escreva <code>somaDigitos(n)</code> que retorna a soma dos dígitos de um inteiro não negativo. " +
      "Exemplo: <code>4096</code> → <code>4 + 0 + 9 + 6 = 19</code>.</p>" +
      "<p>Desafio extra: resolva só com matemática, sem converter o número em texto.</p>",
    funcao: "somaDigitos",
    parametros: "n",
    testes: [
      { chamada: "somaDigitos(123)", esperado: 6 },
      { chamada: "somaDigitos(4096)", esperado: 19 },
      { chamada: "somaDigitos(9)", esperado: 9 },
      { chamada: "somaDigitos(0)", esperado: 0 },
      { chamada: "somaDigitos(1001)", esperado: 2 },
    ],
    dicas: [
      "`n % 10` dá o último dígito. `Math.floor(n / 10)` remove o último dígito.",
      "Repita com `while (n > 0)`: some o último dígito e depois corte-o.",
    ],
    solucao:
      "function somaDigitos(n) {\n" +
      "  let soma = 0;\n" +
      "  while (n > 0) {\n" +
      "    soma += n % 10;\n" +
      "    n = Math.floor(n / 10);\n" +
      "  }\n" +
      "  return soma;\n" +
      "}",
  },
  {
    id: "numero-primo",
    categoria: "loops",
    nivel: "intermediario",
    titulo: "Número primo",
    enunciado:
      "<p>Escreva <code>ehPrimo(n)</code> que retorna <code>true</code> se n for primo.</p>" +
      "<p>Um número primo é maior que 1 e só é divisível por 1 e por ele mesmo. " +
      "0 e 1 <strong>não</strong> são primos.</p>",
    funcao: "ehPrimo",
    parametros: "n",
    testes: [
      { chamada: "ehPrimo(7)", esperado: true },
      { chamada: "ehPrimo(10)", esperado: false },
      { chamada: "ehPrimo(2)", esperado: true },
      { chamada: "ehPrimo(1)", esperado: false },
      { chamada: "ehPrimo(0)", esperado: false },
      { chamada: "ehPrimo(9)", esperado: false },
      { chamada: "ehPrimo(97)", esperado: true },
      { chamada: "ehPrimo(100)", esperado: false },
    ],
    dicas: [
      "Trate primeiro o caso especial: se n < 2, retorne false.",
      "Teste os divisores de 2 até n - 1. Se algum dividir n sem resto, ele não é primo.",
      "Otimização: basta testar até a raiz quadrada de n (condição `i * i <= n`). Cuidado para não pular o 9 = 3 × 3.",
    ],
    solucao:
      "function ehPrimo(n) {\n" +
      "  if (n < 2) return false;\n" +
      "  for (let i = 2; i * i <= n; i++) {\n" +
      "    if (n % i === 0) return false;\n" +
      "  }\n" +
      "  return true;\n" +
      "}",
  },
  {
    id: "fibonacci",
    categoria: "loops",
    nivel: "intermediario",
    titulo: "Fibonacci",
    enunciado:
      "<p>Na sequência de Fibonacci, cada termo é a soma dos dois anteriores: " +
      "<code>0, 1, 1, 2, 3, 5, 8, 13, 21…</code></p>" +
      "<p>Escreva <code>fibonacci(n)</code> que retorna o termo de posição n, começando em " +
      "<code>fibonacci(0) = 0</code> e <code>fibonacci(1) = 1</code>.</p>",
    funcao: "fibonacci",
    parametros: "n",
    testes: [
      { chamada: "fibonacci(7)", esperado: 13 },
      { chamada: "fibonacci(10)", esperado: 55 },
      { chamada: "fibonacci(0)", esperado: 0 },
      { chamada: "fibonacci(1)", esperado: 1 },
      { chamada: "fibonacci(2)", esperado: 1 },
      { chamada: "fibonacci(20)", esperado: 6765 },
    ],
    dicas: [
      "Guarde dois valores: o termo anterior e o atual. Comece com 0 e 1.",
      "A cada volta do loop, o novo atual é a soma dos dois, e o anterior passa a ser o atual antigo.",
      "Use uma variável temporária para não perder um valor durante a troca.",
    ],
    solucao:
      "function fibonacci(n) {\n" +
      "  let anterior = 0;\n" +
      "  let atual = 1;\n" +
      "  for (let i = 0; i < n; i++) {\n" +
      "    const proximo = anterior + atual;\n" +
      "    anterior = atual;\n" +
      "    atual = proximo;\n" +
      "  }\n" +
      "  return anterior;\n" +
      "}",
  },

  // ===================================================================
  // ARRAYS
  // ===================================================================
  {
    id: "soma-array",
    categoria: "arrays",
    nivel: "iniciante",
    titulo: "Soma dos elementos",
    enunciado:
      "<p>Escreva <code>somaArray(numeros)</code> que retorna a soma de todos os números do array. " +
      "Um array vazio soma 0.</p>",
    funcao: "somaArray",
    parametros: "numeros",
    testes: [
      { chamada: "somaArray([1, 2, 3])", esperado: 6 },
      { chamada: "somaArray([])", esperado: 0 },
      { chamada: "somaArray([10])", esperado: 10 },
      { chamada: "somaArray([-5, 10, -2])", esperado: 3 },
      { chamada: "somaArray([1.5, 2.5])", esperado: 4 },
    ],
    dicas: [
      "Comece um acumulador em 0 e percorra o array com `for (const n of numeros)`.",
      "Não esqueça de retornar o acumulador depois do loop.",
    ],
    solucao:
      "function somaArray(numeros) {\n" +
      "  let total = 0;\n" +
      "  for (const n of numeros) {\n" +
      "    total += n;\n" +
      "  }\n" +
      "  return total;\n" +
      "}",
  },
  {
    id: "maior-elemento",
    categoria: "arrays",
    nivel: "iniciante",
    titulo: "Maior elemento",
    enunciado:
      "<p>Escreva <code>maiorElemento(numeros)</code> que retorna o maior número do array. " +
      "O array sempre terá pelo menos um elemento.</p>" +
      "<p>Resolva sem <code>Math.max</code>.</p>",
    funcao: "maiorElemento",
    parametros: "numeros",
    testes: [
      { chamada: "maiorElemento([3, 9, 2])", esperado: 9 },
      { chamada: "maiorElemento([-4, -1, -8])", esperado: -1 },
      { chamada: "maiorElemento([7])", esperado: 7 },
      { chamada: "maiorElemento([1, 2, 3, 4, 5])", esperado: 5 },
      { chamada: "maiorElemento([50, 2, 50, 1])", esperado: 50 },
    ],
    proibido: [
      { padrao: "Math\\.max", mensagem: "Neste desafio a ideia é resolver sem Math.max — use um loop." },
    ],
    dicas: [
      "Comece supondo que o maior é o primeiro elemento: `let maior = numeros[0];`",
      "Se você começou com `let maior = 0`, um array só de negativos vai dar errado. Comece pelo primeiro elemento.",
    ],
    solucao:
      "function maiorElemento(numeros) {\n" +
      "  let maior = numeros[0];\n" +
      "  for (let i = 1; i < numeros.length; i++) {\n" +
      "    if (numeros[i] > maior) maior = numeros[i];\n" +
      "  }\n" +
      "  return maior;\n" +
      "}",
  },
  {
    id: "filtrar-pares",
    categoria: "arrays",
    nivel: "iniciante",
    titulo: "Filtrar pares",
    enunciado:
      "<p>Escreva <code>filtrarPares(numeros)</code> que retorna um <strong>novo</strong> array só com os números pares, " +
      "mantendo a ordem original.</p>",
    funcao: "filtrarPares",
    parametros: "numeros",
    testes: [
      { chamada: "filtrarPares([1, 2, 3, 4, 5, 6])", esperado: [2, 4, 6] },
      { chamada: "filtrarPares([1, 3, 5])", esperado: [] },
      { chamada: "filtrarPares([])", esperado: [] },
      { chamada: "filtrarPares([0, -2, 7])", esperado: [0, -2] },
      { chamada: "filtrarPares([8, 8, 1])", esperado: [8, 8] },
    ],
    dicas: [
      "Crie um array vazio e use `push` para colocar só os elementos que passam no teste `n % 2 === 0`.",
      "Também dá para resolver em uma linha com `numeros.filter(...)`.",
    ],
    solucao:
      "function filtrarPares(numeros) {\n" +
      "  const pares = [];\n" +
      "  for (const n of numeros) {\n" +
      "    if (n % 2 === 0) pares.push(n);\n" +
      "  }\n" +
      "  return pares;\n" +
      "}",
  },
  {
    id: "media",
    categoria: "arrays",
    nivel: "iniciante",
    titulo: "Média",
    enunciado:
      "<p>Escreva <code>media(numeros)</code> que retorna a média aritmética dos números do array " +
      "(soma dividida pela quantidade).</p>" +
      "<p>Se o array estiver vazio, retorne <code>0</code>.</p>",
    funcao: "media",
    parametros: "numeros",
    testes: [
      { chamada: "media([2, 4, 6])", esperado: 4 },
      { chamada: "media([1, 2])", esperado: 1.5 },
      { chamada: "media([])", esperado: 0 },
      { chamada: "media([10])", esperado: 10 },
      { chamada: "media([-3, 3])", esperado: 0 },
    ],
    dicas: [
      "Some tudo como no desafio \"Soma dos elementos\" e divida por `numeros.length`.",
      "Array vazio: 0 / 0 dá NaN em JavaScript. Trate esse caso antes com um if.",
    ],
    solucao:
      "function media(numeros) {\n" +
      "  if (numeros.length === 0) return 0;\n" +
      "  let soma = 0;\n" +
      "  for (const n of numeros) {\n" +
      "    soma += n;\n" +
      "  }\n" +
      "  return soma / numeros.length;\n" +
      "}",
  },
  {
    id: "inverter-array",
    categoria: "arrays",
    nivel: "intermediario",
    titulo: "Inverter array",
    enunciado:
      "<p>Escreva <code>inverterArray(lista)</code> que retorna um novo array com os elementos em ordem inversa.</p>" +
      "<p>Não vale usar <code>.reverse()</code>: monte o array invertido com um loop.</p>",
    funcao: "inverterArray",
    parametros: "lista",
    testes: [
      { chamada: "inverterArray([1, 2, 3])", esperado: [3, 2, 1] },
      { chamada: 'inverterArray(["a", "b"])', esperado: ["b", "a"] },
      { chamada: "inverterArray([])", esperado: [] },
      { chamada: "inverterArray([42])", esperado: [42] },
      { chamada: "inverterArray([1, 2, 3, 4])", esperado: [4, 3, 2, 1] },
    ],
    proibido: [
      { padrao: "\\.reverse\\s*\\(", mensagem: "Neste desafio não vale usar .reverse() — percorra o array de trás para frente." },
    ],
    dicas: [
      "O último índice de um array é `lista.length - 1`.",
      "Faça um for que começa no último índice e vai diminuindo até 0 (`i--`), dando `push` em cada elemento.",
    ],
    solucao:
      "function inverterArray(lista) {\n" +
      "  const invertido = [];\n" +
      "  for (let i = lista.length - 1; i >= 0; i--) {\n" +
      "    invertido.push(lista[i]);\n" +
      "  }\n" +
      "  return invertido;\n" +
      "}",
  },
  {
    id: "remover-duplicados",
    categoria: "arrays",
    nivel: "intermediario",
    titulo: "Remover duplicados",
    enunciado:
      "<p>Escreva <code>removerDuplicados(lista)</code> que retorna um novo array sem elementos repetidos, " +
      "mantendo a ordem da <strong>primeira</strong> aparição de cada um.</p>",
    funcao: "removerDuplicados",
    parametros: "lista",
    testes: [
      { chamada: "removerDuplicados([1, 2, 2, 3, 1])", esperado: [1, 2, 3] },
      { chamada: 'removerDuplicados(["a", "a", "b"])', esperado: ["a", "b"] },
      { chamada: "removerDuplicados([])", esperado: [] },
      { chamada: "removerDuplicados([5, 4, 5, 4, 3])", esperado: [5, 4, 3] },
      { chamada: "removerDuplicados([7, 7, 7])", esperado: [7] },
    ],
    dicas: [
      "Monte um array de resultado e, antes de dar push, verifique se o elemento já está nele.",
      "`resultado.includes(x)` retorna true se x já foi adicionado.",
      "Alternativa elegante: `[...new Set(lista)]` (o Set guarda só valores únicos e mantém a ordem).",
    ],
    solucao:
      "function removerDuplicados(lista) {\n" +
      "  const resultado = [];\n" +
      "  for (const item of lista) {\n" +
      "    if (!resultado.includes(item)) resultado.push(item);\n" +
      "  }\n" +
      "  return resultado;\n" +
      "}",
  },

  {
    id: "segundo-maior",
    categoria: "arrays",
    nivel: "intermediario",
    titulo: "Segundo maior",
    enunciado:
      "<p>Escreva <code>segundoMaior(numeros)</code> que retorna o segundo maior valor <strong>distinto</strong> " +
      "do array. Em <code>[5, 5, 4]</code> a resposta é <code>4</code>, não <code>5</code>.</p>" +
      "<p>O array sempre terá pelo menos dois valores diferentes. Tente percorrê-lo uma vez só, sem ordenar.</p>",
    funcao: "segundoMaior",
    parametros: "numeros",
    testes: [
      { chamada: "segundoMaior([3, 9, 2])", esperado: 3 },
      { chamada: "segundoMaior([5, 5, 4])", esperado: 4 },
      { chamada: "segundoMaior([-1, -2, -3])", esperado: -2 },
      { chamada: "segundoMaior([10, 10, 9, 8])", esperado: 9 },
      { chamada: "segundoMaior([1, 2])", esperado: 1 },
      { chamada: "segundoMaior([4, 1, 7, 7, 6])", esperado: 6 },
    ],
    proibido: [
      { padrao: "\\.sort\\s*\\(", mensagem: "Neste desafio a ideia é não ordenar — guarde o maior e o segundo maior enquanto percorre o array." },
    ],
    dicas: [
      "Guarde duas variáveis: `maior` e `segundo`. Comece as duas com `-Infinity`.",
      "Se um número é maior que `maior`, o antigo `maior` vira o `segundo`.",
      "Se ele não é maior que `maior`, mas é maior que `segundo` (e diferente de `maior`), ele vira o novo `segundo`.",
    ],
    solucao:
      "function segundoMaior(numeros) {\n" +
      "  let maior = -Infinity;\n" +
      "  let segundo = -Infinity;\n" +
      "  for (const n of numeros) {\n" +
      "    if (n > maior) {\n" +
      "      segundo = maior;\n" +
      "      maior = n;\n" +
      "    } else if (n < maior && n > segundo) {\n" +
      "      segundo = n;\n" +
      "    }\n" +
      "  }\n" +
      "  return segundo;\n" +
      "}",
  },

  // ===================================================================
  // FUNÇÕES
  // ===================================================================
  {
    id: "saudacao",
    categoria: "funcoes",
    nivel: "iniciante",
    titulo: "Saudação",
    enunciado:
      "<p>Escreva <code>saudacao(nome)</code> que retorna o texto <code>\"Olá, NOME!\"</code>, " +
      "trocando NOME pelo nome recebido.</p>",
    funcao: "saudacao",
    parametros: "nome",
    testes: [
      { chamada: 'saudacao("Ana")', esperado: "Olá, Ana!" },
      { chamada: 'saudacao("Bruno")', esperado: "Olá, Bruno!" },
      { chamada: 'saudacao("Mundo")', esperado: "Olá, Mundo!" },
    ],
    dicas: [
      "Use `return` — mostrar com console.log não conta como retornar.",
      "Junte textos com + (`\"Olá, \" + nome`) ou use uma template string, que é um texto entre crases com ${nome} dentro.",
      "Confira a vírgula, o espaço depois dela e a exclamação no final.",
    ],
    solucao:
      "function saudacao(nome) {\n" +
      "  return \"Olá, \" + nome + \"!\";\n" +
      "}",
  },
  {
    id: "contar-palavras",
    categoria: "funcoes",
    nivel: "iniciante",
    titulo: "Contar palavras",
    enunciado:
      "<p>Escreva <code>contarPalavras(frase)</code> que retorna quantas palavras a frase tem.</p>" +
      "<p>As palavras podem estar separadas por mais de um espaço, e pode haver espaços no começo e no fim. " +
      "Uma frase vazia (ou só com espaços) tem 0 palavras.</p>",
    funcao: "contarPalavras",
    parametros: "frase",
    testes: [
      { chamada: 'contarPalavras("eu gosto de lógica")', esperado: 4 },
      { chamada: 'contarPalavras("  muitos   espaços  aqui ")', esperado: 3 },
      { chamada: 'contarPalavras("uma")', esperado: 1 },
      { chamada: 'contarPalavras("")', esperado: 0 },
      { chamada: 'contarPalavras("    ")', esperado: 0 },
    ],
    dicas: [
      "`frase.trim()` remove os espaços do começo e do fim.",
      "`texto.split(\" \")` quebra nos espaços, mas espaços repetidos geram pedaços vazios. Ignore os pedaços vazios (ou use `split(/\\s+/)`).",
      "Trate a frase vazia à parte: depois do trim, se sobrar \"\", a resposta é 0.",
    ],
    solucao:
      "function contarPalavras(frase) {\n" +
      "  const limpa = frase.trim();\n" +
      "  if (limpa === \"\") return 0;\n" +
      "  return limpa.split(/\\s+/).length;\n" +
      "}",
  },
  {
    id: "capitalizar",
    categoria: "funcoes",
    nivel: "intermediario",
    titulo: "Capitalizar palavras",
    enunciado:
      "<p>Escreva <code>capitalizar(frase)</code> que retorna a frase com a primeira letra de cada palavra " +
      "em maiúscula. O resto de cada palavra fica como está.</p>" +
      "<p>As palavras estão separadas por um único espaço.</p>",
    funcao: "capitalizar",
    parametros: "frase",
    testes: [
      { chamada: 'capitalizar("olá mundo")', esperado: "Olá Mundo" },
      { chamada: 'capitalizar("javaScript é legal")', esperado: "JavaScript É Legal" },
      { chamada: 'capitalizar("a")', esperado: "A" },
      { chamada: 'capitalizar("")', esperado: "" },
    ],
    dicas: [
      "Quebre a frase em palavras com `split(\" \")`, transforme cada uma e junte de volta com `join(\" \")`.",
      "Para uma palavra: `palavra.charAt(0).toUpperCase() + palavra.slice(1)`.",
      "`map` aplica uma função a cada elemento do array e devolve o array transformado.",
    ],
    solucao:
      "function capitalizar(frase) {\n" +
      "  return frase\n" +
      "    .split(\" \")\n" +
      "    .map(function (palavra) {\n" +
      "      return palavra.charAt(0).toUpperCase() + palavra.slice(1);\n" +
      "    })\n" +
      "    .join(\" \");\n" +
      "}",
  },
  {
    id: "aplicar-duas-vezes",
    categoria: "funcoes",
    nivel: "intermediario",
    titulo: "Aplicar duas vezes",
    enunciado:
      "<p>Funções podem receber outras funções como parâmetro.</p>" +
      "<p>Escreva <code>aplicarDuasVezes(fn, valor)</code> que aplica <code>fn</code> ao valor e, depois, " +
      "aplica <code>fn</code> de novo ao resultado. Ou seja, retorna <code>fn(fn(valor))</code>.</p>",
    funcao: "aplicarDuasVezes",
    parametros: "fn, valor",
    testes: [
      { chamada: "aplicarDuasVezes(n => n * 2, 3)", esperado: 12 },
      { chamada: "aplicarDuasVezes(n => n + 10, 0)", esperado: 20 },
      { chamada: 'aplicarDuasVezes(s => s + "!", "oi")', esperado: "oi!!" },
      { chamada: "aplicarDuasVezes(n => n * n, 3)", esperado: 81 },
    ],
    dicas: [
      "`fn` é uma função como qualquer outra: você pode chamá-la com `fn(algumaCoisa)`.",
      "Chame uma vez, guarde o resultado, e chame de novo passando esse resultado.",
    ],
    solucao:
      "function aplicarDuasVezes(fn, valor) {\n" +
      "  const primeira = fn(valor);\n" +
      "  return fn(primeira);\n" +
      "}",
  },
  {
    id: "compor-funcoes",
    categoria: "funcoes",
    nivel: "intermediario",
    titulo: "Compor funções",
    enunciado:
      "<p>Funções também podem <strong>retornar</strong> funções.</p>" +
      "<p>Escreva <code>compor(f, g)</code> que retorna uma nova função. Essa nova função recebe um valor " +
      "<code>x</code> e devolve <code>f(g(x))</code> — primeiro aplica g, depois f.</p>",
    funcao: "compor",
    parametros: "f, g",
    testes: [
      { chamada: "compor(n => n + 1, n => n * 2)(5)", esperado: 11 },
      { chamada: "compor(n => n * 2, n => n + 1)(5)", esperado: 12 },
      { chamada: 'compor(s => s.toUpperCase(), s => s.trim())("  oi  ")', esperado: "OI" },
      { chamada: "compor(n => n, n => n)(7)", esperado: 7 },
    ],
    dicas: [
      "O retorno de `compor` não é um número: é uma função. Algo como `return function (x) { ... };`",
      "Dentro da função retornada, aplique g em x e passe o resultado para f.",
    ],
    solucao:
      "function compor(f, g) {\n" +
      "  return function (x) {\n" +
      "    return f(g(x));\n" +
      "  };\n" +
      "}",
  },

  // ===================================================================
  // ALGORITMOS BÁSICOS
  // ===================================================================
  {
    id: "busca-linear",
    categoria: "algoritmos",
    nivel: "iniciante",
    titulo: "Busca linear",
    enunciado:
      "<p>Escreva <code>buscaLinear(lista, alvo)</code> que procura o alvo percorrendo a lista do começo ao fim " +
      "e retorna o <strong>índice</strong> da primeira ocorrência. Se não encontrar, retorna <code>-1</code>.</p>" +
      "<p>Não vale usar <code>indexOf</code>, <code>findIndex</code> nem <code>includes</code>.</p>",
    funcao: "buscaLinear",
    parametros: "lista, alvo",
    testes: [
      { chamada: "buscaLinear([4, 8, 15, 16], 15)", esperado: 2 },
      { chamada: "buscaLinear([4, 8, 15], 99)", esperado: -1 },
      { chamada: "buscaLinear([7, 7, 7], 7)", esperado: 0 },
      { chamada: "buscaLinear([], 1)", esperado: -1 },
      { chamada: 'buscaLinear(["a", "b", "c"], "c")', esperado: 2 },
    ],
    proibido: [
      { padrao: "\\.(indexOf|findIndex|includes)\\s*\\(", mensagem: "Neste desafio a busca precisa ser feita com o seu próprio loop (sem indexOf, findIndex ou includes)." },
    ],
    dicas: [
      "Use um for com índice (`let i = 0; i < lista.length; i++`), porque você precisa devolver a posição.",
      "Assim que achar, retorne `i` na hora. O `return -1` fica depois do loop.",
    ],
    solucao:
      "function buscaLinear(lista, alvo) {\n" +
      "  for (let i = 0; i < lista.length; i++) {\n" +
      "    if (lista[i] === alvo) return i;\n" +
      "  }\n" +
      "  return -1;\n" +
      "}",
  },
  {
    id: "palindromo",
    categoria: "algoritmos",
    nivel: "iniciante",
    titulo: "Palíndromo",
    enunciado:
      "<p>Um palíndromo é um texto que se lê igual de trás para frente, como <em>arara</em>.</p>" +
      "<p>Escreva <code>ehPalindromo(texto)</code> que retorna <code>true</code> ou <code>false</code>, " +
      "ignorando maiúsculas/minúsculas e espaços. Os testes não têm acentos nem pontuação.</p>",
    funcao: "ehPalindromo",
    parametros: "texto",
    testes: [
      { chamada: 'ehPalindromo("arara")', esperado: true },
      { chamada: 'ehPalindromo("javascript")', esperado: false },
      { chamada: 'ehPalindromo("Ana")', esperado: true },
      { chamada: 'ehPalindromo("A base do teto desaba")', esperado: true },
      { chamada: 'ehPalindromo("socorram me subi no onibus em marrocos")', esperado: true },
      { chamada: 'ehPalindromo("ab")', esperado: false },
    ],
    dicas: [
      "Primeiro normalize: minúsculas (`toLowerCase`) e sem espaços (`split(\" \").join(\"\")`).",
      "Compare o primeiro caractere com o último, o segundo com o penúltimo, e assim por diante, usando dois índices.",
      "Atalho válido: inverter o texto com `split(\"\").reverse().join(\"\")` e comparar com o original.",
    ],
    solucao:
      "function ehPalindromo(texto) {\n" +
      "  const limpo = texto.toLowerCase().split(\" \").join(\"\");\n" +
      "  let i = 0;\n" +
      "  let j = limpo.length - 1;\n" +
      "  while (i < j) {\n" +
      "    if (limpo[i] !== limpo[j]) return false;\n" +
      "    i++;\n" +
      "    j--;\n" +
      "  }\n" +
      "  return true;\n" +
      "}",
  },
  {
    id: "anagrama",
    categoria: "algoritmos",
    nivel: "intermediario",
    titulo: "Anagramas",
    enunciado:
      "<p>Duas palavras são anagramas quando usam exatamente as mesmas letras, nas mesmas quantidades, " +
      "em outra ordem: <em>roma</em> e <em>amor</em>.</p>" +
      "<p>Escreva <code>saoAnagramas(a, b)</code> que retorna <code>true</code> ou <code>false</code>, " +
      "ignorando maiúsculas/minúsculas e espaços.</p>",
    funcao: "saoAnagramas",
    parametros: "a, b",
    testes: [
      { chamada: 'saoAnagramas("roma", "amor")', esperado: true },
      { chamada: 'saoAnagramas("abc", "abd")', esperado: false },
      { chamada: 'saoAnagramas("Roma", "Mora")', esperado: true },
      { chamada: 'saoAnagramas("aab", "abb")', esperado: false },
      { chamada: 'saoAnagramas("dormitory", "dirty room")', esperado: true },
      { chamada: 'saoAnagramas("ab", "abc")', esperado: false },
    ],
    dicas: [
      "Normalize os dois textos do mesmo jeito: minúsculas e sem espaços.",
      "Se você ordenar as letras dos dois textos, anagramas viram textos idênticos: `texto.split(\"\").sort().join(\"\")`.",
      "Outra saída: conte as letras de cada um (como em \"Contar frequência\") e compare as contagens.",
    ],
    solucao:
      "function saoAnagramas(a, b) {\n" +
      "  function normalizar(texto) {\n" +
      "    return texto.toLowerCase().split(\" \").join(\"\").split(\"\").sort().join(\"\");\n" +
      "  }\n" +
      "  return normalizar(a) === normalizar(b);\n" +
      "}",
  },
  {
    id: "mdc",
    categoria: "algoritmos",
    nivel: "intermediario",
    titulo: "MDC de Euclides",
    enunciado:
      "<p>Escreva <code>mdc(a, b)</code> que retorna o máximo divisor comum de dois inteiros não negativos.</p>" +
      "<p>Use o algoritmo de Euclides: enquanto <code>b</code> não for zero, troque <code>(a, b)</code> por " +
      "<code>(b, a % b)</code>. Quando <code>b</code> chegar a zero, <code>a</code> é a resposta.</p>",
    funcao: "mdc",
    parametros: "a, b",
    testes: [
      { chamada: "mdc(12, 18)", esperado: 6 },
      { chamada: "mdc(17, 5)", esperado: 1 },
      { chamada: "mdc(100, 75)", esperado: 25 },
      { chamada: "mdc(7, 0)", esperado: 7 },
      { chamada: "mdc(0, 9)", esperado: 9 },
    ],
    dicas: [
      "Use `while (b !== 0)`.",
      "Na troca, guarde `a % b` numa variável temporária antes de sobrescrever a e b.",
    ],
    solucao:
      "function mdc(a, b) {\n" +
      "  while (b !== 0) {\n" +
      "    const resto = a % b;\n" +
      "    a = b;\n" +
      "    b = resto;\n" +
      "  }\n" +
      "  return a;\n" +
      "}",
  },
  {
    id: "busca-binaria",
    categoria: "algoritmos",
    nivel: "intermediario",
    titulo: "Busca binária",
    enunciado:
      "<p>Escreva <code>buscaBinaria(lista, alvo)</code>. A lista está <strong>ordenada</strong> em ordem crescente; " +
      "retorne o índice do alvo ou <code>-1</code> se ele não existir.</p>" +
      "<p>Em vez de olhar elemento por elemento, olhe o meio da faixa: se o alvo for maior, descarte a metade " +
      "da esquerda; se for menor, descarte a da direita. Repita até achar ou a faixa ficar vazia.</p>",
    funcao: "buscaBinaria",
    parametros: "lista, alvo",
    testes: [
      { chamada: "buscaBinaria([1, 3, 5, 7, 9, 11], 7)", esperado: 3 },
      { chamada: "buscaBinaria([1, 3, 5], 4)", esperado: -1 },
      { chamada: "buscaBinaria([1, 3, 5, 7, 9, 11], 1)", esperado: 0 },
      { chamada: "buscaBinaria([1, 3, 5, 7, 9, 11], 11)", esperado: 5 },
      { chamada: "buscaBinaria([], 3)", esperado: -1 },
      { chamada: "buscaBinaria([2, 4, 6, 8, 10, 12, 14, 16], 14)", esperado: 6 },
    ],
    proibido: [
      { padrao: "\\.(indexOf|findIndex|includes)\\s*\\(", mensagem: "Neste desafio implemente a busca binária você mesmo (sem indexOf, findIndex ou includes)." },
    ],
    dicas: [
      "Mantenha dois índices: `inicio = 0` e `fim = lista.length - 1`. Repita enquanto `inicio <= fim`.",
      "O meio é `Math.floor((inicio + fim) / 2)`.",
      "Se `lista[meio] < alvo`, faça `inicio = meio + 1`; se for maior, `fim = meio - 1`. Sem o +1/-1 o loop pode não terminar.",
    ],
    solucao:
      "function buscaBinaria(lista, alvo) {\n" +
      "  let inicio = 0;\n" +
      "  let fim = lista.length - 1;\n" +
      "  while (inicio <= fim) {\n" +
      "    const meio = Math.floor((inicio + fim) / 2);\n" +
      "    if (lista[meio] === alvo) return meio;\n" +
      "    if (lista[meio] < alvo) {\n" +
      "      inicio = meio + 1;\n" +
      "    } else {\n" +
      "      fim = meio - 1;\n" +
      "    }\n" +
      "  }\n" +
      "  return -1;\n" +
      "}",
  },
  {
    id: "bubble-sort",
    categoria: "algoritmos",
    nivel: "intermediario",
    titulo: "Ordenação (Bubble Sort)",
    enunciado:
      "<p>Escreva <code>ordenar(lista)</code> que retorna um novo array com os números em ordem crescente, " +
      "<strong>sem usar</strong> <code>.sort()</code>.</p>" +
      "<p>Sugestão — Bubble Sort: percorra o array comparando vizinhos e trocando os que estão fora de ordem. " +
      "A cada passada, o maior valor \"borbulha\" para o fim. Repita até não haver mais trocas.</p>",
    funcao: "ordenar",
    parametros: "lista",
    testes: [
      { chamada: "ordenar([5, 2, 9, 1])", esperado: [1, 2, 5, 9] },
      { chamada: "ordenar([3, -1, 0])", esperado: [-1, 0, 3] },
      { chamada: "ordenar([])", esperado: [] },
      { chamada: "ordenar([1, 2, 3])", esperado: [1, 2, 3] },
      { chamada: "ordenar([4, 4, 2, 4])", esperado: [2, 4, 4, 4] },
      { chamada: "ordenar([10, 9, 8, 7, 6, 5])", esperado: [5, 6, 7, 8, 9, 10] },
    ],
    proibido: [
      { padrao: "\\.sort\\s*\\(", mensagem: "Neste desafio não vale usar .sort() — implemente a ordenação com loops." },
    ],
    dicas: [
      "Trabalhe numa cópia para não alterar o original: `const copia = lista.slice();`",
      "Dois loops: o externo conta as passadas; o interno compara `copia[j]` com `copia[j + 1]`.",
      "Para trocar dois elementos: `const temp = copia[j]; copia[j] = copia[j + 1]; copia[j + 1] = temp;`",
    ],
    solucao:
      "function ordenar(lista) {\n" +
      "  const copia = lista.slice();\n" +
      "  for (let i = 0; i < copia.length - 1; i++) {\n" +
      "    for (let j = 0; j < copia.length - 1 - i; j++) {\n" +
      "      if (copia[j] > copia[j + 1]) {\n" +
      "        const temp = copia[j];\n" +
      "        copia[j] = copia[j + 1];\n" +
      "        copia[j + 1] = temp;\n" +
      "      }\n" +
      "    }\n" +
      "  }\n" +
      "  return copia;\n" +
      "}",
  },
  {
    id: "frequencia",
    categoria: "algoritmos",
    nivel: "intermediario",
    titulo: "Contar frequência",
    enunciado:
      "<p>Escreva <code>contarFrequencia(lista)</code> que retorna um objeto dizendo quantas vezes cada valor " +
      "aparece. Exemplo: <code>[\"a\", \"b\", \"a\"]</code> vira <code>{ a: 2, b: 1 }</code>.</p>" +
      "<p>A ordem das chaves no objeto não importa.</p>",
    funcao: "contarFrequencia",
    parametros: "lista",
    testes: [
      { chamada: 'contarFrequencia(["a", "b", "a"])', esperado: { a: 2, b: 1 } },
      { chamada: "contarFrequencia([])", esperado: {} },
      { chamada: 'contarFrequencia(["sol", "sol", "sol"])', esperado: { sol: 3 } },
      { chamada: "contarFrequencia([1, 2, 1, 3, 1])", esperado: { 1: 3, 2: 1, 3: 1 } },
    ],
    dicas: [
      "Comece com um objeto vazio: `const contagem = {};`",
      "Para cada item, se `contagem[item]` ainda não existe, ele vale `undefined`. Trate isso com `(contagem[item] || 0) + 1`.",
    ],
    solucao:
      "function contarFrequencia(lista) {\n" +
      "  const contagem = {};\n" +
      "  for (const item of lista) {\n" +
      "    contagem[item] = (contagem[item] || 0) + 1;\n" +
      "  }\n" +
      "  return contagem;\n" +
      "}",
  },
];

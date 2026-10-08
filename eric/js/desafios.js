/*
 * desafios.js — banco de desafios (em Python).
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
 *   testes      [{ chamada: "expressão Python", esperado: "literal Python" }]
 *               o esperado é lido com ast.literal_eval e mostrado com repr()
 *               os primeiros `exemplos` testes aparecem como exemplo (padrão 2)
 *   dicas       mostradas uma por vez, a cada tentativa errada
 *   solucao     código de referência (liberado após 3 erros ou ao acertar)
 *   proibido    (opcional) [{ padrao: regex em texto, mensagem }] para vetar atalhos
 */

window.CATEGORIAS = [
  { id: "condicionais", nome: "Condicionais" },
  { id: "loops", nome: "Loops" },
  { id: "arrays", nome: "Listas" },
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
      "<p>Escreva a função <code>par_ou_impar(n)</code> que recebe um número inteiro e retorna o texto " +
      "<code>\"par\"</code> se ele for par, ou <code>\"ímpar\"</code> se for ímpar.</p>" +
      "<p>Atenção: números negativos também podem aparecer.</p>",
    funcao: "par_ou_impar",
    parametros: "n",
    testes: [
      { chamada: "par_ou_impar(4)", esperado: "'par'" },
      { chamada: "par_ou_impar(7)", esperado: "'ímpar'" },
      { chamada: "par_ou_impar(0)", esperado: "'par'" },
      { chamada: "par_ou_impar(-3)", esperado: "'ímpar'" },
      { chamada: "par_ou_impar(-8)", esperado: "'par'" },
    ],
    dicas: [
      "O operador % devolve o resto da divisão. Um número é par quando o resto da divisão por 2 é zero.",
      "Em Python a comparação de igualdade é `==` (um `=` só é atribuição). E não esqueça dos `:` no fim do `if` e do `else`.",
      "Confira se o texto retornado está exatamente igual: \"ímpar\" leva acento.",
    ],
    solucao:
      "def par_ou_impar(n):\n" +
      "    if n % 2 == 0:\n" +
      "        return \"par\"\n" +
      "    return \"ímpar\"\n",
  },
  {
    id: "maior-de-tres",
    categoria: "condicionais",
    nivel: "iniciante",
    titulo: "Maior de três",
    enunciado:
      "<p>Escreva <code>maior_de_tres(a, b, c)</code>, que retorna o maior dos três números recebidos.</p>" +
      "<p>Resolva só com <code>if</code>, sem usar <code>max()</code>.</p>",
    funcao: "maior_de_tres",
    parametros: "a, b, c",
    testes: [
      { chamada: "maior_de_tres(1, 5, 3)", esperado: "5" },
      { chamada: "maior_de_tres(9, 2, 4)", esperado: "9" },
      { chamada: "maior_de_tres(2, 2, 8)", esperado: "8" },
      { chamada: "maior_de_tres(-1, -7, -3)", esperado: "-1" },
      { chamada: "maior_de_tres(6, 6, 6)", esperado: "6" },
    ],
    proibido: [
      { padrao: "\\bmax\\s*\\(", mensagem: "Neste desafio a ideia é resolver sem max() — use if." },
    ],
    dicas: [
      "Guarde o primeiro número numa variável `maior` e depois compare com os outros dois.",
      "Se b for maior que `maior`, troque. Depois faça o mesmo com c.",
      "Lembre de retornar o valor com `return` no final.",
    ],
    solucao:
      "def maior_de_tres(a, b, c):\n" +
      "    maior = a\n" +
      "    if b > maior:\n" +
      "        maior = b\n" +
      "    if c > maior:\n" +
      "        maior = c\n" +
      "    return maior\n",
  },
  {
    id: "faixa-etaria",
    categoria: "condicionais",
    nivel: "iniciante",
    titulo: "Faixa etária",
    enunciado:
      "<p>Escreva <code>classificar_idade(idade)</code> que retorna a faixa etária:</p>" +
      "<ul>" +
      "<li>0 a 12 → <code>\"criança\"</code></li>" +
      "<li>13 a 17 → <code>\"adolescente\"</code></li>" +
      "<li>18 a 59 → <code>\"adulto\"</code></li>" +
      "<li>60 ou mais → <code>\"idoso\"</code></li>" +
      "</ul>",
    funcao: "classificar_idade",
    parametros: "idade",
    testes: [
      { chamada: "classificar_idade(8)", esperado: "'criança'" },
      { chamada: "classificar_idade(30)", esperado: "'adulto'" },
      { chamada: "classificar_idade(12)", esperado: "'criança'" },
      { chamada: "classificar_idade(13)", esperado: "'adolescente'" },
      { chamada: "classificar_idade(17)", esperado: "'adolescente'" },
      { chamada: "classificar_idade(18)", esperado: "'adulto'" },
      { chamada: "classificar_idade(59)", esperado: "'adulto'" },
      { chamada: "classificar_idade(60)", esperado: "'idoso'" },
      { chamada: "classificar_idade(91)", esperado: "'idoso'" },
    ],
    dicas: [
      "Use uma sequência de `if` / `elif` / `else`, testando as faixas da menor para a maior idade.",
      "Os limites são inclusivos: 12 ainda é criança, 13 já é adolescente. Revise o uso de < e <=.",
      "Confira acentos e letras: \"criança\" tem ç.",
    ],
    solucao:
      "def classificar_idade(idade):\n" +
      "    if idade <= 12:\n" +
      "        return \"criança\"\n" +
      "    elif idade <= 17:\n" +
      "        return \"adolescente\"\n" +
      "    elif idade <= 59:\n" +
      "        return \"adulto\"\n" +
      "    else:\n" +
      "        return \"idoso\"\n",
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
      { chamada: 'calculadora(2, "+", 3)', esperado: "5" },
      { chamada: 'calculadora(10, "/", 4)', esperado: "2.5" },
      { chamada: 'calculadora(7, "-", 9)', esperado: "-2" },
      { chamada: 'calculadora(6, "*", 7)', esperado: "42" },
      { chamada: 'calculadora(5, "/", 0)', esperado: "'erro'" },
      { chamada: 'calculadora(1, "%", 1)', esperado: "'erro'" },
    ],
    dicas: [
      "Compare o operador com cada símbolo usando `if operador == \"+\":`, depois `elif`, e assim por diante.",
      "Em Python, 5 / 0 não devolve infinito: lança ZeroDivisionError e o programa para. Cheque `b == 0` antes de dividir.",
      "O `else` final cobre os operadores desconhecidos. (Quem já conhece pode usar `match operador:` com `case \"+\":`.)",
    ],
    solucao:
      "def calculadora(a, operador, b):\n" +
      "    if operador == \"+\":\n" +
      "        return a + b\n" +
      "    elif operador == \"-\":\n" +
      "        return a - b\n" +
      "    elif operador == \"*\":\n" +
      "        return a * b\n" +
      "    elif operador == \"/\":\n" +
      "        if b == 0:\n" +
      "            return \"erro\"\n" +
      "        return a / b\n" +
      "    else:\n" +
      "        return \"erro\"\n",
  },
  {
    id: "ano-bissexto",
    categoria: "condicionais",
    nivel: "intermediario",
    titulo: "Ano bissexto",
    enunciado:
      "<p>Escreva <code>ano_bissexto(ano)</code> que retorna <code>True</code> se o ano for bissexto e " +
      "<code>False</code> caso contrário.</p>" +
      "<p>Regra: um ano é bissexto se for divisível por 4, <strong>exceto</strong> os divisíveis por 100 — " +
      "a não ser que também sejam divisíveis por 400.</p>",
    funcao: "ano_bissexto",
    parametros: "ano",
    testes: [
      { chamada: "ano_bissexto(2024)", esperado: "True" },
      { chamada: "ano_bissexto(1900)", esperado: "False" },
      { chamada: "ano_bissexto(2023)", esperado: "False" },
      { chamada: "ano_bissexto(2000)", esperado: "True" },
      { chamada: "ano_bissexto(2100)", esperado: "False" },
      { chamada: "ano_bissexto(1600)", esperado: "True" },
    ],
    dicas: [
      "Divisível por X é o mesmo que `ano % X == 0`.",
      "1900 é divisível por 4 e por 100, mas não por 400 — então NÃO é bissexto. 2000 é divisível por 400, então é.",
      "Em Python os operadores lógicos são palavras: `and`, `or`, `not`. Dá para escrever tudo numa linha: (divisível por 4 and não por 100) or divisível por 400.",
    ],
    solucao:
      "def ano_bissexto(ano):\n" +
      "    return (ano % 4 == 0 and ano % 100 != 0) or ano % 400 == 0\n",
  },
  {
    id: "fizzbuzz-numero",
    categoria: "condicionais",
    nivel: "intermediario",
    titulo: "FizzBuzz de um número",
    enunciado:
      "<p>Escreva <code>fizz_buzz_numero(n)</code> que retorna:</p>" +
      "<ul>" +
      "<li><code>\"FizzBuzz\"</code> se n for divisível por 3 e por 5</li>" +
      "<li><code>\"Fizz\"</code> se for divisível só por 3</li>" +
      "<li><code>\"Buzz\"</code> se for divisível só por 5</li>" +
      "<li>o próprio número <strong>como texto</strong> nos outros casos (ex.: <code>\"7\"</code>)</li>" +
      "</ul>",
    funcao: "fizz_buzz_numero",
    parametros: "n",
    testes: [
      { chamada: "fizz_buzz_numero(9)", esperado: "'Fizz'" },
      { chamada: "fizz_buzz_numero(15)", esperado: "'FizzBuzz'" },
      { chamada: "fizz_buzz_numero(10)", esperado: "'Buzz'" },
      { chamada: "fizz_buzz_numero(7)", esperado: "'7'" },
      { chamada: "fizz_buzz_numero(3)", esperado: "'Fizz'" },
      { chamada: "fizz_buzz_numero(30)", esperado: "'FizzBuzz'" },
      { chamada: "fizz_buzz_numero(1)", esperado: "'1'" },
    ],
    dicas: [
      "A ordem dos if importa: teste o caso \"divisível por 3 e por 5\" ANTES dos outros.",
      "Divisível por 3 e por 5 é o mesmo que divisível por 15.",
      "Para o último caso, converta o número em texto com `str(n)`.",
    ],
    solucao:
      "def fizz_buzz_numero(n):\n" +
      "    if n % 15 == 0:\n" +
      "        return \"FizzBuzz\"\n" +
      "    if n % 3 == 0:\n" +
      "        return \"Fizz\"\n" +
      "    if n % 5 == 0:\n" +
      "        return \"Buzz\"\n" +
      "    return str(n)\n",
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
      "<p>Escreva <code>soma_ate(n)</code> que retorna a soma de todos os inteiros de 1 até <code>n</code>.</p>" +
      "<p>Se <code>n</code> for 0, o resultado é 0. Use um loop (sem <code>sum()</code>).</p>",
    funcao: "soma_ate",
    parametros: "n",
    testes: [
      { chamada: "soma_ate(5)", esperado: "15" },
      { chamada: "soma_ate(10)", esperado: "55" },
      { chamada: "soma_ate(1)", esperado: "1" },
      { chamada: "soma_ate(0)", esperado: "0" },
      { chamada: "soma_ate(100)", esperado: "5050" },
    ],
    proibido: [
      { padrao: "\\bsum\\s*\\(", mensagem: "Neste desafio a ideia é somar com um loop, sem sum()." },
    ],
    dicas: [
      "Crie uma variável `total = 0` e use `for i in range(...)`.",
      "`range(a, b)` vai de a até b - 1: o b fica de fora. Para incluir o n, use `range(1, n + 1)`.",
    ],
    solucao:
      "def soma_ate(n):\n" +
      "    total = 0\n" +
      "    for i in range(1, n + 1):\n" +
      "        total += i\n" +
      "    return total\n",
  },
  {
    id: "tabuada",
    categoria: "loops",
    nivel: "iniciante",
    titulo: "Tabuada",
    enunciado:
      "<p>Escreva <code>tabuada(n)</code> que retorna uma lista com os resultados de " +
      "<code>n × 1</code> até <code>n × 10</code>, nessa ordem.</p>",
    funcao: "tabuada",
    parametros: "n",
    testes: [
      { chamada: "tabuada(2)", esperado: "[2, 4, 6, 8, 10, 12, 14, 16, 18, 20]" },
      { chamada: "tabuada(7)", esperado: "[7, 14, 21, 28, 35, 42, 49, 56, 63, 70]" },
      { chamada: "tabuada(0)", esperado: "[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]" },
      { chamada: "tabuada(-1)", esperado: "[-1, -2, -3, -4, -5, -6, -7, -8, -9, -10]" },
    ],
    dicas: [
      "Comece com uma lista vazia: `resultado = []`",
      "Use `for i in range(1, 11):` e, a cada volta, faça `resultado.append(n * i)`.",
    ],
    solucao:
      "def tabuada(n):\n" +
      "    resultado = []\n" +
      "    for i in range(1, 11):\n" +
      "        resultado.append(n * i)\n" +
      "    return resultado\n",
  },
  {
    id: "fatorial",
    categoria: "loops",
    nivel: "iniciante",
    titulo: "Fatorial",
    enunciado:
      "<p>Escreva <code>fatorial(n)</code>. O fatorial de n é o produto de todos os inteiros de 1 até n: " +
      "<code>5! = 5 × 4 × 3 × 2 × 1 = 120</code>.</p>" +
      "<p>Por definição, <code>0! = 1</code>. Use um loop (sem <code>math.factorial</code>).</p>",
    funcao: "fatorial",
    parametros: "n",
    testes: [
      { chamada: "fatorial(5)", esperado: "120" },
      { chamada: "fatorial(0)", esperado: "1" },
      { chamada: "fatorial(1)", esperado: "1" },
      { chamada: "fatorial(7)", esperado: "5040" },
      { chamada: "fatorial(10)", esperado: "3628800" },
    ],
    proibido: [
      { padrao: "\\bfactorial\\b", mensagem: "Neste desafio a ideia é multiplicar com um loop, sem math.factorial." },
    ],
    dicas: [
      "Numa multiplicação acumulada, a variável começa em 1 (e não em 0, senão tudo vira 0).",
      "Se o loop for `range(2, n + 1)`, o caso n = 0 já devolve 1 sem precisar de if.",
    ],
    solucao:
      "def fatorial(n):\n" +
      "    resultado = 1\n" +
      "    for i in range(2, n + 1):\n" +
      "        resultado *= i\n" +
      "    return resultado\n",
  },
  {
    id: "contar-vogais",
    categoria: "loops",
    nivel: "iniciante",
    titulo: "Contar vogais",
    enunciado:
      "<p>Escreva <code>contar_vogais(texto)</code> que retorna quantas vogais (a, e, i, o, u) existem no texto, " +
      "contando maiúsculas e minúsculas.</p>" +
      "<p>Os textos dos testes não têm acentos.</p>",
    funcao: "contar_vogais",
    parametros: "texto",
    testes: [
      { chamada: 'contar_vogais("programar")', esperado: "3" },
      { chamada: 'contar_vogais("Paralelepipedo")', esperado: "7" },
      { chamada: 'contar_vogais("xyz")', esperado: "0" },
      { chamada: 'contar_vogais("")', esperado: "0" },
      { chamada: 'contar_vogais("AEIOU aeiou")', esperado: "10" },
    ],
    dicas: [
      "Dá para percorrer um texto letra por letra com `for letra in texto:`.",
      "Transforme o texto em minúsculas antes com `texto.lower()` para não precisar testar \"A\" e \"a\".",
      "`letra in \"aeiou\"` diz se a letra é uma vogal.",
    ],
    solucao:
      "def contar_vogais(texto):\n" +
      "    total = 0\n" +
      "    for letra in texto.lower():\n" +
      "        if letra in \"aeiou\":\n" +
      "            total += 1\n" +
      "    return total\n",
  },
  {
    id: "soma-digitos",
    categoria: "loops",
    nivel: "iniciante",
    titulo: "Soma dos dígitos",
    enunciado:
      "<p>Escreva <code>soma_digitos(n)</code> que retorna a soma dos dígitos de um inteiro não negativo. " +
      "Exemplo: <code>4096</code> → <code>4 + 0 + 9 + 6 = 19</code>.</p>" +
      "<p>Desafio extra: resolva só com matemática, sem converter o número em texto.</p>",
    funcao: "soma_digitos",
    parametros: "n",
    testes: [
      { chamada: "soma_digitos(123)", esperado: "6" },
      { chamada: "soma_digitos(4096)", esperado: "19" },
      { chamada: "soma_digitos(9)", esperado: "9" },
      { chamada: "soma_digitos(0)", esperado: "0" },
      { chamada: "soma_digitos(1001)", esperado: "2" },
    ],
    dicas: [
      "`n % 10` dá o último dígito. `n // 10` (divisão inteira) remove o último dígito.",
      "Repita com `while n > 0:` — some o último dígito e depois corte-o. Cuidado: `n / 10` dá número quebrado e o loop não termina como você espera.",
    ],
    solucao:
      "def soma_digitos(n):\n" +
      "    soma = 0\n" +
      "    while n > 0:\n" +
      "        soma += n % 10\n" +
      "        n = n // 10\n" +
      "    return soma\n",
  },
  {
    id: "numero-primo",
    categoria: "loops",
    nivel: "intermediario",
    titulo: "Número primo",
    enunciado:
      "<p>Escreva <code>eh_primo(n)</code> que retorna <code>True</code> se n for primo e <code>False</code> se não for.</p>" +
      "<p>Um número primo é maior que 1 e só é divisível por 1 e por ele mesmo. " +
      "0 e 1 <strong>não</strong> são primos.</p>",
    funcao: "eh_primo",
    parametros: "n",
    testes: [
      { chamada: "eh_primo(7)", esperado: "True" },
      { chamada: "eh_primo(10)", esperado: "False" },
      { chamada: "eh_primo(2)", esperado: "True" },
      { chamada: "eh_primo(1)", esperado: "False" },
      { chamada: "eh_primo(0)", esperado: "False" },
      { chamada: "eh_primo(9)", esperado: "False" },
      { chamada: "eh_primo(97)", esperado: "True" },
      { chamada: "eh_primo(100)", esperado: "False" },
    ],
    dicas: [
      "Trate primeiro o caso especial: se n < 2, retorne False.",
      "Teste os divisores com `for i in range(2, n):`. Se algum dividir n sem resto, ele não é primo.",
      "Otimização: basta testar enquanto `i * i <= n` (um while). Cuidado para não pular o 9 = 3 × 3.",
    ],
    solucao:
      "def eh_primo(n):\n" +
      "    if n < 2:\n" +
      "        return False\n" +
      "    i = 2\n" +
      "    while i * i <= n:\n" +
      "        if n % i == 0:\n" +
      "            return False\n" +
      "        i += 1\n" +
      "    return True\n",
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
      { chamada: "fibonacci(7)", esperado: "13" },
      { chamada: "fibonacci(10)", esperado: "55" },
      { chamada: "fibonacci(0)", esperado: "0" },
      { chamada: "fibonacci(1)", esperado: "1" },
      { chamada: "fibonacci(2)", esperado: "1" },
      { chamada: "fibonacci(20)", esperado: "6765" },
    ],
    dicas: [
      "Guarde dois valores: o termo anterior e o atual. Comece com 0 e 1.",
      "A cada volta do loop, o novo atual é a soma dos dois, e o anterior passa a ser o atual antigo.",
      "Python troca duas variáveis de uma vez, sem variável temporária: `anterior, atual = atual, anterior + atual`.",
    ],
    solucao:
      "def fibonacci(n):\n" +
      "    anterior, atual = 0, 1\n" +
      "    for _ in range(n):\n" +
      "        anterior, atual = atual, anterior + atual\n" +
      "    return anterior\n",
  },

  // ===================================================================
  // LISTAS
  // ===================================================================
  {
    id: "soma-array",
    categoria: "arrays",
    nivel: "iniciante",
    titulo: "Soma dos elementos",
    enunciado:
      "<p>Escreva <code>soma_lista(numeros)</code> que retorna a soma de todos os números da lista. " +
      "Uma lista vazia soma 0.</p>" +
      "<p>Percorra a lista com um loop, sem usar <code>sum()</code>.</p>",
    funcao: "soma_lista",
    parametros: "numeros",
    testes: [
      { chamada: "soma_lista([1, 2, 3])", esperado: "6" },
      { chamada: "soma_lista([])", esperado: "0" },
      { chamada: "soma_lista([10])", esperado: "10" },
      { chamada: "soma_lista([-5, 10, -2])", esperado: "3" },
      { chamada: "soma_lista([1.5, 2.5])", esperado: "4.0" },
    ],
    proibido: [
      { padrao: "\\bsum\\s*\\(", mensagem: "Neste desafio a ideia é somar com um loop, sem sum()." },
    ],
    dicas: [
      "Comece um acumulador em 0 e percorra a lista com `for n in numeros:`.",
      "Não esqueça de retornar o acumulador depois do loop — fora dele, com a indentação do `for`.",
    ],
    solucao:
      "def soma_lista(numeros):\n" +
      "    total = 0\n" +
      "    for n in numeros:\n" +
      "        total += n\n" +
      "    return total\n",
  },
  {
    id: "maior-elemento",
    categoria: "arrays",
    nivel: "iniciante",
    titulo: "Maior elemento",
    enunciado:
      "<p>Escreva <code>maior_elemento(numeros)</code> que retorna o maior número da lista. " +
      "A lista sempre terá pelo menos um elemento.</p>" +
      "<p>Resolva sem <code>max()</code>.</p>",
    funcao: "maior_elemento",
    parametros: "numeros",
    testes: [
      { chamada: "maior_elemento([3, 9, 2])", esperado: "9" },
      { chamada: "maior_elemento([-4, -1, -8])", esperado: "-1" },
      { chamada: "maior_elemento([7])", esperado: "7" },
      { chamada: "maior_elemento([1, 2, 3, 4, 5])", esperado: "5" },
      { chamada: "maior_elemento([50, 2, 50, 1])", esperado: "50" },
    ],
    proibido: [
      { padrao: "\\bmax\\s*\\(", mensagem: "Neste desafio a ideia é resolver sem max() — use um loop." },
      { padrao: "\\bsort(ed)?\\s*\\(", mensagem: "Neste desafio a ideia é não ordenar — percorra a lista guardando o maior." },
    ],
    dicas: [
      "Comece supondo que o maior é o primeiro elemento: `maior = numeros[0]`",
      "Se você começou com `maior = 0`, uma lista só de negativos vai dar errado. Comece pelo primeiro elemento.",
    ],
    solucao:
      "def maior_elemento(numeros):\n" +
      "    maior = numeros[0]\n" +
      "    for n in numeros:\n" +
      "        if n > maior:\n" +
      "            maior = n\n" +
      "    return maior\n",
  },
  {
    id: "filtrar-pares",
    categoria: "arrays",
    nivel: "iniciante",
    titulo: "Filtrar pares",
    enunciado:
      "<p>Escreva <code>filtrar_pares(numeros)</code> que retorna uma <strong>nova</strong> lista só com os números pares, " +
      "mantendo a ordem original.</p>",
    funcao: "filtrar_pares",
    parametros: "numeros",
    testes: [
      { chamada: "filtrar_pares([1, 2, 3, 4, 5, 6])", esperado: "[2, 4, 6]" },
      { chamada: "filtrar_pares([1, 3, 5])", esperado: "[]" },
      { chamada: "filtrar_pares([])", esperado: "[]" },
      { chamada: "filtrar_pares([0, -2, 7])", esperado: "[0, -2]" },
      { chamada: "filtrar_pares([8, 8, 1])", esperado: "[8, 8]" },
    ],
    dicas: [
      "Crie uma lista vazia e use `append` para colocar só os elementos que passam no teste `n % 2 == 0`.",
      "Também dá para resolver em uma linha com uma list comprehension: `[n for n in numeros if ...]`.",
    ],
    solucao:
      "def filtrar_pares(numeros):\n" +
      "    pares = []\n" +
      "    for n in numeros:\n" +
      "        if n % 2 == 0:\n" +
      "            pares.append(n)\n" +
      "    return pares\n",
  },
  {
    id: "media",
    categoria: "arrays",
    nivel: "iniciante",
    titulo: "Média",
    enunciado:
      "<p>Escreva <code>media(numeros)</code> que retorna a média aritmética dos números da lista " +
      "(soma dividida pela quantidade).</p>" +
      "<p>Se a lista estiver vazia, retorne <code>0</code>.</p>",
    funcao: "media",
    parametros: "numeros",
    testes: [
      { chamada: "media([2, 4, 6])", esperado: "4.0" },
      { chamada: "media([1, 2])", esperado: "1.5" },
      { chamada: "media([])", esperado: "0" },
      { chamada: "media([10])", esperado: "10.0" },
      { chamada: "media([-3, 3])", esperado: "0.0" },
    ],
    dicas: [
      "Some tudo (aqui pode usar `sum(numeros)`) e divida pela quantidade, `len(numeros)`.",
      "Lista vazia: dividir por 0 lança ZeroDivisionError. Trate esse caso antes com um if.",
    ],
    solucao:
      "def media(numeros):\n" +
      "    if len(numeros) == 0:\n" +
      "        return 0\n" +
      "    return sum(numeros) / len(numeros)\n",
  },
  {
    id: "inverter-array",
    categoria: "arrays",
    nivel: "intermediario",
    titulo: "Inverter lista",
    enunciado:
      "<p>Escreva <code>inverter_lista(lista)</code> que retorna uma nova lista com os elementos em ordem inversa.</p>" +
      "<p>Não vale usar <code>.reverse()</code>, <code>reversed()</code> nem o fatiamento <code>[::-1]</code>: " +
      "monte a lista invertida com um loop.</p>",
    funcao: "inverter_lista",
    parametros: "lista",
    testes: [
      { chamada: "inverter_lista([1, 2, 3])", esperado: "[3, 2, 1]" },
      { chamada: 'inverter_lista(["a", "b"])', esperado: "['b', 'a']" },
      { chamada: "inverter_lista([])", esperado: "[]" },
      { chamada: "inverter_lista([42])", esperado: "[42]" },
      { chamada: "inverter_lista([1, 2, 3, 4])", esperado: "[4, 3, 2, 1]" },
    ],
    proibido: [
      { padrao: "\\.reverse\\s*\\(|\\breversed\\s*\\(|::\\s*-", mensagem: "Neste desafio não vale usar .reverse(), reversed() nem [::-1] — percorra a lista de trás para frente." },
    ],
    dicas: [
      "O último índice de uma lista é `len(lista) - 1`.",
      "`range(len(lista) - 1, -1, -1)` conta de trás para frente até 0. Dê `append` em `lista[i]` a cada volta.",
    ],
    solucao:
      "def inverter_lista(lista):\n" +
      "    invertida = []\n" +
      "    for i in range(len(lista) - 1, -1, -1):\n" +
      "        invertida.append(lista[i])\n" +
      "    return invertida\n",
  },
  {
    id: "remover-duplicados",
    categoria: "arrays",
    nivel: "intermediario",
    titulo: "Remover duplicados",
    enunciado:
      "<p>Escreva <code>remover_duplicados(lista)</code> que retorna uma nova lista sem elementos repetidos, " +
      "mantendo a ordem da <strong>primeira</strong> aparição de cada um.</p>",
    funcao: "remover_duplicados",
    parametros: "lista",
    testes: [
      { chamada: "remover_duplicados([1, 2, 2, 3, 1])", esperado: "[1, 2, 3]" },
      { chamada: 'remover_duplicados(["a", "a", "b"])', esperado: "['a', 'b']" },
      { chamada: "remover_duplicados([])", esperado: "[]" },
      { chamada: "remover_duplicados([5, 4, 5, 4, 3])", esperado: "[5, 4, 3]" },
      { chamada: "remover_duplicados([7, 7, 7])", esperado: "[7]" },
    ],
    dicas: [
      "Monte uma lista de resultado e, antes de dar `append`, verifique se o elemento já está nela.",
      "`x not in resultado` é True quando x ainda não foi adicionado.",
      "Cuidado com `list(set(lista))`: o set remove repetidos, mas não garante a ordem. `list(dict.fromkeys(lista))` garante.",
    ],
    solucao:
      "def remover_duplicados(lista):\n" +
      "    resultado = []\n" +
      "    for item in lista:\n" +
      "        if item not in resultado:\n" +
      "            resultado.append(item)\n" +
      "    return resultado\n",
  },

  {
    id: "segundo-maior",
    categoria: "arrays",
    nivel: "intermediario",
    titulo: "Segundo maior",
    enunciado:
      "<p>Escreva <code>segundo_maior(numeros)</code> que retorna o segundo maior valor <strong>distinto</strong> " +
      "da lista. Em <code>[5, 5, 4]</code> a resposta é <code>4</code>, não <code>5</code>.</p>" +
      "<p>A lista sempre terá pelo menos dois valores diferentes. Tente percorrê-la uma vez só, sem ordenar.</p>",
    funcao: "segundo_maior",
    parametros: "numeros",
    testes: [
      { chamada: "segundo_maior([3, 9, 2])", esperado: "3" },
      { chamada: "segundo_maior([5, 5, 4])", esperado: "4" },
      { chamada: "segundo_maior([-1, -2, -3])", esperado: "-2" },
      { chamada: "segundo_maior([10, 10, 9, 8])", esperado: "9" },
      { chamada: "segundo_maior([1, 2])", esperado: "1" },
      { chamada: "segundo_maior([4, 1, 7, 7, 6])", esperado: "6" },
    ],
    proibido: [
      { padrao: "\\bsort(ed)?\\s*\\(", mensagem: "Neste desafio a ideia é não ordenar — guarde o maior e o segundo maior enquanto percorre a lista." },
    ],
    dicas: [
      "Guarde duas variáveis: `maior` e `segundo`. Comece as duas com `float(\"-inf\")` (menos infinito).",
      "Se um número é maior que `maior`, o antigo `maior` vira o `segundo`.",
      "Se ele não é maior que `maior`, mas é maior que `segundo` (e diferente de `maior`), ele vira o novo `segundo`.",
    ],
    solucao:
      "def segundo_maior(numeros):\n" +
      "    maior = float(\"-inf\")\n" +
      "    segundo = float(\"-inf\")\n" +
      "    for n in numeros:\n" +
      "        if n > maior:\n" +
      "            segundo = maior\n" +
      "            maior = n\n" +
      "        elif maior > n > segundo:\n" +
      "            segundo = n\n" +
      "    return segundo\n",
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
      { chamada: 'saudacao("Ana")', esperado: "'Olá, Ana!'" },
      { chamada: 'saudacao("Bruno")', esperado: "'Olá, Bruno!'" },
      { chamada: 'saudacao("Mundo")', esperado: "'Olá, Mundo!'" },
    ],
    dicas: [
      "Use `return` — mostrar com print() não conta como retornar (sem return a função devolve None).",
      "Junte textos com + (`\"Olá, \" + nome`) ou use uma f-string: `f\"Olá, {nome}!\"`.",
      "Confira a vírgula, o espaço depois dela e a exclamação no final.",
    ],
    solucao:
      "def saudacao(nome):\n" +
      "    return f\"Olá, {nome}!\"\n",
  },
  {
    id: "contar-palavras",
    categoria: "funcoes",
    nivel: "iniciante",
    titulo: "Contar palavras",
    enunciado:
      "<p>Escreva <code>contar_palavras(frase)</code> que retorna quantas palavras a frase tem.</p>" +
      "<p>As palavras podem estar separadas por mais de um espaço, e pode haver espaços no começo e no fim. " +
      "Uma frase vazia (ou só com espaços) tem 0 palavras.</p>",
    funcao: "contar_palavras",
    parametros: "frase",
    testes: [
      { chamada: 'contar_palavras("eu gosto de lógica")', esperado: "4" },
      { chamada: 'contar_palavras("  muitos   espaços  aqui ")', esperado: "3" },
      { chamada: 'contar_palavras("uma")', esperado: "1" },
      { chamada: 'contar_palavras("")', esperado: "0" },
      { chamada: 'contar_palavras("    ")', esperado: "0" },
    ],
    dicas: [
      "`frase.split(\" \")` quebra em cada espaço, mas espaços repetidos geram pedaços vazios (\"\").",
      "`frase.split()` SEM argumento já ignora espaços repetidos e os das pontas.",
      "`len(lista)` dá a quantidade de itens da lista.",
    ],
    solucao:
      "def contar_palavras(frase):\n" +
      "    return len(frase.split())\n",
  },
  {
    id: "capitalizar",
    categoria: "funcoes",
    nivel: "intermediario",
    titulo: "Capitalizar palavras",
    enunciado:
      "<p>Escreva <code>capitalizar(frase)</code> que retorna a frase com a primeira letra de cada palavra " +
      "em maiúscula. O resto de cada palavra fica <strong>como está</strong>.</p>" +
      "<p>As palavras estão separadas por um único espaço.</p>",
    funcao: "capitalizar",
    parametros: "frase",
    testes: [
      { chamada: 'capitalizar("olá mundo")', esperado: "'Olá Mundo'" },
      { chamada: 'capitalizar("javaScript é legal")', esperado: "'JavaScript É Legal'" },
      { chamada: 'capitalizar("a")', esperado: "'A'" },
      { chamada: 'capitalizar("")', esperado: "''" },
    ],
    dicas: [
      "Quebre a frase em palavras com `split(\" \")`, transforme cada uma e junte de volta com `\" \".join(palavras)`.",
      "`.title()` e `.capitalize()` deixam o resto da palavra em minúscula (\"Javascript\") — por isso não servem aqui.",
      "Para uma palavra: `palavra[:1].upper() + palavra[1:]`. O fatiamento `[:1]` não quebra com texto vazio, ao contrário de `palavra[0]`.",
    ],
    solucao:
      "def capitalizar(frase):\n" +
      "    palavras = frase.split(\" \")\n" +
      "    return \" \".join(p[:1].upper() + p[1:] for p in palavras)\n",
  },
  {
    id: "aplicar-duas-vezes",
    categoria: "funcoes",
    nivel: "intermediario",
    titulo: "Aplicar duas vezes",
    enunciado:
      "<p>Funções podem receber outras funções como parâmetro.</p>" +
      "<p>Escreva <code>aplicar_duas_vezes(fn, valor)</code> que aplica <code>fn</code> ao valor e, depois, " +
      "aplica <code>fn</code> de novo ao resultado. Ou seja, retorna <code>fn(fn(valor))</code>.</p>" +
      "<p>Nos testes, <code>lambda n: n * 2</code> é uma função curta, sem nome, que devolve o dobro de n.</p>",
    funcao: "aplicar_duas_vezes",
    parametros: "fn, valor",
    testes: [
      { chamada: "aplicar_duas_vezes(lambda n: n * 2, 3)", esperado: "12" },
      { chamada: "aplicar_duas_vezes(lambda n: n + 10, 0)", esperado: "20" },
      { chamada: 'aplicar_duas_vezes(lambda s: s + "!", "oi")', esperado: "'oi!!'" },
      { chamada: "aplicar_duas_vezes(lambda n: n * n, 3)", esperado: "81" },
    ],
    dicas: [
      "`fn` é uma função como qualquer outra: você pode chamá-la com `fn(alguma_coisa)`.",
      "Chame uma vez, guarde o resultado, e chame de novo passando esse resultado.",
    ],
    solucao:
      "def aplicar_duas_vezes(fn, valor):\n" +
      "    primeira = fn(valor)\n" +
      "    return fn(primeira)\n",
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
      { chamada: "compor(lambda n: n + 1, lambda n: n * 2)(5)", esperado: "11" },
      { chamada: "compor(lambda n: n * 2, lambda n: n + 1)(5)", esperado: "12" },
      { chamada: 'compor(lambda s: s.upper(), lambda s: s.strip())("  oi  ")', esperado: "'OI'" },
      { chamada: "compor(lambda n: n, lambda n: n)(7)", esperado: "7" },
    ],
    dicas: [
      "O retorno de `compor` não é um número: é uma função. Dá para definir uma função dentro da outra com `def` e retorná-la pelo nome (sem parênteses).",
      "Dentro da função interna, aplique g em x e passe o resultado para f. Versão curta: `return lambda x: f(g(x))`.",
    ],
    solucao:
      "def compor(f, g):\n" +
      "    def composta(x):\n" +
      "        return f(g(x))\n" +
      "    return composta\n",
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
      "<p>Escreva <code>busca_linear(lista, alvo)</code> que procura o alvo percorrendo a lista do começo ao fim " +
      "e retorna o <strong>índice</strong> da primeira ocorrência. Se não encontrar, retorna <code>-1</code>.</p>" +
      "<p>Não vale usar <code>.index()</code>.</p>",
    funcao: "busca_linear",
    parametros: "lista, alvo",
    testes: [
      { chamada: "busca_linear([4, 8, 15, 16], 15)", esperado: "2" },
      { chamada: "busca_linear([4, 8, 15], 99)", esperado: "-1" },
      { chamada: "busca_linear([7, 7, 7], 7)", esperado: "0" },
      { chamada: "busca_linear([], 1)", esperado: "-1" },
      { chamada: 'busca_linear(["a", "b", "c"], "c")', esperado: "2" },
    ],
    proibido: [
      { padrao: "\\.(index|find)\\s*\\(", mensagem: "Neste desafio a busca precisa ser feita com o seu próprio loop (sem .index())." },
    ],
    dicas: [
      "Você precisa devolver a posição, então percorra pelos índices: `for i in range(len(lista)):`.",
      "Assim que achar, retorne `i` na hora. O `return -1` fica depois do loop, fora dele.",
      "Jeito pythônico: `for i, item in enumerate(lista):` entrega o índice e o valor juntos.",
    ],
    solucao:
      "def busca_linear(lista, alvo):\n" +
      "    for i, item in enumerate(lista):\n" +
      "        if item == alvo:\n" +
      "            return i\n" +
      "    return -1\n",
  },
  {
    id: "palindromo",
    categoria: "algoritmos",
    nivel: "iniciante",
    titulo: "Palíndromo",
    enunciado:
      "<p>Um palíndromo é um texto que se lê igual de trás para frente, como <em>arara</em>.</p>" +
      "<p>Escreva <code>eh_palindromo(texto)</code> que retorna <code>True</code> ou <code>False</code>, " +
      "ignorando maiúsculas/minúsculas e espaços. Os testes não têm acentos nem pontuação.</p>",
    funcao: "eh_palindromo",
    parametros: "texto",
    testes: [
      { chamada: 'eh_palindromo("arara")', esperado: "True" },
      { chamada: 'eh_palindromo("python")', esperado: "False" },
      { chamada: 'eh_palindromo("Ana")', esperado: "True" },
      { chamada: 'eh_palindromo("A base do teto desaba")', esperado: "True" },
      { chamada: 'eh_palindromo("socorram me subi no onibus em marrocos")', esperado: "True" },
      { chamada: 'eh_palindromo("ab")', esperado: "False" },
    ],
    dicas: [
      "Primeiro normalize: minúsculas (`lower()`) e sem espaços (`replace(\" \", \"\")`).",
      "Compare o primeiro caractere com o último, o segundo com o penúltimo, e assim por diante, usando dois índices.",
      "Atalho válido em Python: `limpo[::-1]` é o texto invertido. Basta comparar com o original.",
    ],
    solucao:
      "def eh_palindromo(texto):\n" +
      "    limpo = texto.lower().replace(\" \", \"\")\n" +
      "    i = 0\n" +
      "    j = len(limpo) - 1\n" +
      "    while i < j:\n" +
      "        if limpo[i] != limpo[j]:\n" +
      "            return False\n" +
      "        i += 1\n" +
      "        j -= 1\n" +
      "    return True\n",
  },
  {
    id: "anagrama",
    categoria: "algoritmos",
    nivel: "intermediario",
    titulo: "Anagramas",
    enunciado:
      "<p>Duas palavras são anagramas quando usam exatamente as mesmas letras, nas mesmas quantidades, " +
      "em outra ordem: <em>roma</em> e <em>amor</em>.</p>" +
      "<p>Escreva <code>sao_anagramas(a, b)</code> que retorna <code>True</code> ou <code>False</code>, " +
      "ignorando maiúsculas/minúsculas e espaços.</p>",
    funcao: "sao_anagramas",
    parametros: "a, b",
    testes: [
      { chamada: 'sao_anagramas("roma", "amor")', esperado: "True" },
      { chamada: 'sao_anagramas("abc", "abd")', esperado: "False" },
      { chamada: 'sao_anagramas("Roma", "Mora")', esperado: "True" },
      { chamada: 'sao_anagramas("aab", "abb")', esperado: "False" },
      { chamada: 'sao_anagramas("dormitory", "dirty room")', esperado: "True" },
      { chamada: 'sao_anagramas("ab", "abc")', esperado: "False" },
    ],
    dicas: [
      "Normalize os dois textos do mesmo jeito: minúsculas e sem espaços.",
      "Se você ordenar as letras dos dois textos, anagramas viram listas idênticas: `sorted(texto)` devolve a lista de letras em ordem.",
      "Outra saída: conte as letras de cada um (como em \"Contar frequência\") e compare os dicionários.",
    ],
    solucao:
      "def sao_anagramas(a, b):\n" +
      "    def normalizar(texto):\n" +
      "        return sorted(texto.lower().replace(\" \", \"\"))\n" +
      "    return normalizar(a) == normalizar(b)\n",
  },
  {
    id: "mdc",
    categoria: "algoritmos",
    nivel: "intermediario",
    titulo: "MDC de Euclides",
    enunciado:
      "<p>Escreva <code>mdc(a, b)</code> que retorna o máximo divisor comum de dois inteiros não negativos.</p>" +
      "<p>Use o algoritmo de Euclides: enquanto <code>b</code> não for zero, troque <code>(a, b)</code> por " +
      "<code>(b, a % b)</code>. Quando <code>b</code> chegar a zero, <code>a</code> é a resposta. " +
      "(Sem <code>math.gcd</code>.)</p>",
    funcao: "mdc",
    parametros: "a, b",
    testes: [
      { chamada: "mdc(12, 18)", esperado: "6" },
      { chamada: "mdc(17, 5)", esperado: "1" },
      { chamada: "mdc(100, 75)", esperado: "25" },
      { chamada: "mdc(7, 0)", esperado: "7" },
      { chamada: "mdc(0, 9)", esperado: "9" },
    ],
    proibido: [
      { padrao: "\\bgcd\\b", mensagem: "Neste desafio implemente o algoritmo de Euclides você mesmo, sem math.gcd." },
    ],
    dicas: [
      "Use `while b != 0:`.",
      "Atribuição dupla faz a troca numa linha só, sem variável temporária: `a, b = b, a % b`.",
    ],
    solucao:
      "def mdc(a, b):\n" +
      "    while b != 0:\n" +
      "        a, b = b, a % b\n" +
      "    return a\n",
  },
  {
    id: "busca-binaria",
    categoria: "algoritmos",
    nivel: "intermediario",
    titulo: "Busca binária",
    enunciado:
      "<p>Escreva <code>busca_binaria(lista, alvo)</code>. A lista está <strong>ordenada</strong> em ordem crescente; " +
      "retorne o índice do alvo ou <code>-1</code> se ele não existir.</p>" +
      "<p>Em vez de olhar elemento por elemento, olhe o meio da faixa: se o alvo for maior, descarte a metade " +
      "da esquerda; se for menor, descarte a da direita. Repita até achar ou a faixa ficar vazia.</p>",
    funcao: "busca_binaria",
    parametros: "lista, alvo",
    testes: [
      { chamada: "busca_binaria([1, 3, 5, 7, 9, 11], 7)", esperado: "3" },
      { chamada: "busca_binaria([1, 3, 5], 4)", esperado: "-1" },
      { chamada: "busca_binaria([1, 3, 5, 7, 9, 11], 1)", esperado: "0" },
      { chamada: "busca_binaria([1, 3, 5, 7, 9, 11], 11)", esperado: "5" },
      { chamada: "busca_binaria([], 3)", esperado: "-1" },
      { chamada: "busca_binaria([2, 4, 6, 8, 10, 12, 14, 16], 14)", esperado: "6" },
    ],
    proibido: [
      { padrao: "\\.(index|find)\\s*\\(|\\bbisect\\b", mensagem: "Neste desafio implemente a busca binária você mesmo (sem .index() nem bisect)." },
    ],
    dicas: [
      "Mantenha dois índices: `inicio = 0` e `fim = len(lista) - 1`. Repita enquanto `inicio <= fim`.",
      "O meio é `(inicio + fim) // 2` — com `//`, porque índice precisa ser inteiro.",
      "Se `lista[meio] < alvo`, faça `inicio = meio + 1`; se for maior, `fim = meio - 1`. Sem o +1/-1 o loop pode não terminar.",
    ],
    solucao:
      "def busca_binaria(lista, alvo):\n" +
      "    inicio = 0\n" +
      "    fim = len(lista) - 1\n" +
      "    while inicio <= fim:\n" +
      "        meio = (inicio + fim) // 2\n" +
      "        if lista[meio] == alvo:\n" +
      "            return meio\n" +
      "        if lista[meio] < alvo:\n" +
      "            inicio = meio + 1\n" +
      "        else:\n" +
      "            fim = meio - 1\n" +
      "    return -1\n",
  },
  {
    id: "bubble-sort",
    categoria: "algoritmos",
    nivel: "intermediario",
    titulo: "Ordenação (Bubble Sort)",
    enunciado:
      "<p>Escreva <code>ordenar(lista)</code> que retorna uma nova lista com os números em ordem crescente, " +
      "<strong>sem usar</strong> <code>.sort()</code> nem <code>sorted()</code>.</p>" +
      "<p>Sugestão — Bubble Sort: percorra a lista comparando vizinhos e trocando os que estão fora de ordem. " +
      "A cada passada, o maior valor \"borbulha\" para o fim. Repita até não haver mais trocas.</p>",
    funcao: "ordenar",
    parametros: "lista",
    testes: [
      { chamada: "ordenar([5, 2, 9, 1])", esperado: "[1, 2, 5, 9]" },
      { chamada: "ordenar([3, -1, 0])", esperado: "[-1, 0, 3]" },
      { chamada: "ordenar([])", esperado: "[]" },
      { chamada: "ordenar([1, 2, 3])", esperado: "[1, 2, 3]" },
      { chamada: "ordenar([4, 4, 2, 4])", esperado: "[2, 4, 4, 4]" },
      { chamada: "ordenar([10, 9, 8, 7, 6, 5])", esperado: "[5, 6, 7, 8, 9, 10]" },
    ],
    proibido: [
      { padrao: "\\bsort(ed)?\\s*\\(", mensagem: "Neste desafio não vale usar .sort() nem sorted() — implemente a ordenação com loops." },
    ],
    dicas: [
      "Trabalhe numa cópia para não alterar a original: `copia = lista[:]` (ou `list(lista)`).",
      "Dois loops: o externo conta as passadas; o interno compara `copia[j]` com `copia[j + 1]`.",
      "Para trocar dois elementos: `copia[j], copia[j + 1] = copia[j + 1], copia[j]`.",
    ],
    solucao:
      "def ordenar(lista):\n" +
      "    copia = lista[:]\n" +
      "    for i in range(len(copia) - 1):\n" +
      "        for j in range(len(copia) - 1 - i):\n" +
      "            if copia[j] > copia[j + 1]:\n" +
      "                copia[j], copia[j + 1] = copia[j + 1], copia[j]\n" +
      "    return copia\n",
  },
  {
    id: "frequencia",
    categoria: "algoritmos",
    nivel: "intermediario",
    titulo: "Contar frequência",
    enunciado:
      "<p>Escreva <code>contar_frequencia(lista)</code> que retorna um dicionário dizendo quantas vezes cada valor " +
      "aparece. Exemplo: <code>[\"a\", \"b\", \"a\"]</code> vira <code>{\"a\": 2, \"b\": 1}</code>.</p>" +
      "<p>A ordem das chaves no dicionário não importa. Sem <code>collections.Counter</code>.</p>",
    funcao: "contar_frequencia",
    parametros: "lista",
    testes: [
      { chamada: 'contar_frequencia(["a", "b", "a"])', esperado: "{'a': 2, 'b': 1}" },
      { chamada: "contar_frequencia([])", esperado: "{}" },
      { chamada: 'contar_frequencia(["sol", "sol", "sol"])', esperado: "{'sol': 3}" },
      { chamada: "contar_frequencia([1, 2, 1, 3, 1])", esperado: "{1: 3, 2: 1, 3: 1}" },
    ],
    proibido: [
      { padrao: "\\bCounter\\b", mensagem: "Neste desafio monte o dicionário você mesmo, sem Counter." },
    ],
    dicas: [
      "Comece com um dicionário vazio: `contagem = {}`",
      "Ler uma chave que não existe com `contagem[item]` dá KeyError. Use `contagem.get(item, 0) + 1` — o get devolve 0 quando a chave ainda não existe.",
    ],
    solucao:
      "def contar_frequencia(lista):\n" +
      "    contagem = {}\n" +
      "    for item in lista:\n" +
      "        contagem[item] = contagem.get(item, 0) + 1\n" +
      "    return contagem\n",
  },
];

# Metodologia

Como as vagas são encontradas, filtradas, documentadas e contadas. O objetivo é
que qualquer número do relatório final possa ser rastreado até o anúncio original.

## 1. Pergunta

O que as vagas de desenvolvedor mais pedem em comum, **descontando linguagem de
programação e framework**? Stack é a parte visível e a mais volátil dos anúncios;
a hipótese do projeto é que embaixo dela existe um conjunto estável de exigências
que quase ninguém tabula.

## 2. Fontes

Nove boards com API ou feed público, escolhidos para cobrir recortes diferentes
de mercado ao mesmo tempo — e, dentro do Brasil, três tipos distintos de empresa:

| Fonte | Recorte | Por que está aqui |
| --- | --- | --- |
| Gupy | Brasil — empresa grande, varejo, consultoria | Maior ATS do país |
| Greenhouse (empresas BR) | Brasil — produto e fintech | Página de carreiras de Stone, XP, C6, Inter, Arco, QuintoAndar, Wellhub, EBANX, VTEX, RD Station, Wildlife e Jusbrasil; recorte oposto ao da Gupy |
| ProgramaThor | Brasil — startup e empresa pequena | Board exclusivo de tecnologia |
| Hacker News "Who is hiring?" | Global, startups | Texto escrito pela engenharia, sem template de RH |
| We Work Remotely | Remoto global | Board remoto clássico |
| Himalayas | Remoto global | Volume e metadados de senioridade |
| Jobicy | Remoto global | Cobertura por região |
| Arbeitnow | Europa | Contrapeso não-americano |
| Remotive | Remoto global | Complemento (API degradada, ver abaixo) |

**Por que três fontes brasileiras e não uma.** Na primeira versão deste projeto a
Gupy era 100% do corpus em português, o que fazia "o mercado brasileiro" ser, na
prática, "o mercado que publica na Gupy". Com as três fontes, a Gupy passou a ser
57% das 565 vagas brasileiras — e a comparação entre elas virou um resultado por
si só: empresa de produto cobra inglês em 38,8% dos anúncios contra 18,8% na
Gupy, e profundidade de engenharia (arquitetura, observabilidade, escala) em
proporção quase o dobro.

O Greenhouse só entra com as posições **localizadas no Brasil**: as mesmas
empresas abrem vagas fora do país, e um filtro de local (nome do país ou de uma
das capitais e cidades brasileiras) descarta essas. O ProgramaThor não expõe a
descrição na listagem, então cada anúncio custa uma requisição à página da vaga,
de onde sai o JSON-LD `JobPosting`.

**Sobre acesso.** Antes de incluir qualquer fonte raspada de HTML, o `robots.txt`
foi consultado. O `vagas.com.br` foi descartado por isso: ele proíbe o ClaudeBot
explicitamente (`User-agent: ClaudeBot / Disallow: /`). Trampos.co e Remotar
foram descartados por motivo técnico — renderizam a listagem no cliente, e este
projeto não usa navegador headless.

Duas decisões de fonte ficaram registradas em `config/criterios.json`:

- **Remote OK foi desativado.** Em 27/07/2026 o endpoint `/api` parou de devolver
  vagas de tecnologia e passou a retornar conteúdo genérico ("Current Vacancies",
  restaurantes, lojas). Dos 100 registros amostrados, nenhum sobreviveu ao filtro
  de título.
- **Remotive foi mantido com peso baixo.** A API passou a ignorar os parâmetros
  `category` e `limit` e devolve ~36 anúncios misturando vendas e suporte.
  Contribui 13 vagas válidas.

## 3. Critérios de busca

Definidos em [`config/criterios.json`](../config/criterios.json) e aplicados em cascata:

1. **Normalização do título** — minúsculas, sem acento e **sem a flexão inclusiva
   entre parênteses**. "Engenheiro(a) de Software" vira "engenheiro de software"
   antes de qualquer teste. Sem esse passo o "(a)" no meio da palavra quebra todo
   padrão que espere o cargo colado, e como essa é a grafia padrão em vaga
   brasileira, o filtro descartava vaga de desenvolvimento em silêncio: corrigir
   isso quadruplicou o que era reconhecido nas empresas de produto.
2. **Inclusão por título** — o título precisa casar com pelo menos um padrão de
   cargo de desenvolvimento (`developer`, `engineer`, `desenvolvedor`,
   `programador`, `engenheiro de software`, `engenharia de software`, `arquiteto
   de solucoes`, `analista de sistemas`, `tech lead`, `SRE`, `DevOps`…). No Hacker
   News, onde o cargo às vezes só aparece no corpo, a verificação também considera
   os primeiros 600 caracteres do anúncio.
3. **Exclusão por título** — vence a inclusão. Tira as outras engenharias
   (mecânica, civil, elétrica, química, de produção…), papéis comerciais que
   contêm a palavra *engineer* (`sales engineer`, `business development`),
   recrutamento, design, marketing, `developer advocate` e funções que não
   escrevem código.
4. **Qualidade** — descrição com pelo menos 500 caracteres, empresa e URL
   preenchidas. Anúncio sem corpo não serve para medir requisito.
5. **Deduplicação** — por hash de `empresa + título` normalizados e por hash do
   texto. Boards republicam a mesma vaga e empresas repostam o mesmo anúncio todo
   mês.
6. **Teto de 12 vagas por empresa** — impede que uma empresa com dezenas de
   posições abertas domine a estatística.
7. **Quota por fonte** — nenhuma fonte pode crescer sem limite. A quota é aplicada
   na ordem em que a fonte devolve os anúncios, então o coletor do Greenhouse
   intercala as empresas em rodízio: sem isso os três bancos, que são os maiores
   boards e publicam quase só vaga comercial, consumiriam a cota inteira antes de
   a primeira empresa de produto aparecer.

O funil completo de cada execução (quantos anúncios caíram em cada etapa, por
fonte) fica em `data/corpus/coleta.json`.

## 4. Taxonomia

[`config/taxonomia.json`](../config/taxonomia.json) define 50 requisitos
não-stack em 6 categorias, cada um com uma lista de padrões regex e, quando
necessário, exceções. Versão tabular: [`dados/taxonomia.csv`](../dados/taxonomia.csv).

Regras de contagem:

- A medida é **presença ou ausência por vaga**. Um anúncio que repete "comunicação"
  oito vezes conta igual a um que menciona uma vez.
- Os padrões rodam sobre o texto **normalizado**: minúsculas, sem acento. Um único
  padrão pega "comunicação" e "comunicacao".
- **URLs e e-mails são removidos antes do casamento.** Sem isso, um link para
  `github.com/empresa` marcava a vaga como exigindo controle de versão.
- **O bloco final de benefícios é descartado** quando um cabeçalho reconhecido
  ("Informações adicionais", "Benefícios", "What we offer", "Perks"…) aparece na
  metade final do texto. Ocorreu em 52,9% das vagas, cortando ~949 caracteres em
  média. É a correção com maior impacto no resultado: sem ela, "curso de inglês in
  company" conta como exigência de inglês.
- Linguagem de programação e framework **não entram na taxonomia**, por definição
  do escopo. Aparecem apenas como sinal para classificar a família da vaga
  (`mobile`, `frontend`…), nunca como requisito contado.

## 5. Classificação de cada vaga

- **Senioridade** — do título, na ordem estágio → staff/lead → sênior → pleno →
  júnior. Sem sinal no título, fica `nao_informado`.
- **Família** — do título: `backend`, `frontend`, `fullstack`, `mobile`,
  `devops_sre`, `dados_ml`, `qa`, `embarcado`, `jogos`, `generico`.
- **Modalidade** — do campo estruturado da API quando existe, senão do início do
  texto. Calculada sobre o texto inteiro, incluindo o rodapé, porque a modalidade
  costuma ser mencionada ali.
- **Anos de experiência** — número extraído só quando aparece perto de uma palavra
  de experiência, aceitando de 1 a 20 anos. Quando o anúncio cita vários números,
  vale o menor: é o que de fato gatilha a triagem.

## 6. Métricas do relatório

- **% geral** — percentual sobre as 1.209 vagas.
- **% boards** — exclui o Hacker News. Os anúncios de lá são pitches curtos
  escritos por engenheiros e raramente listam requisito; mantê-los na conta
  derruba artificialmente tudo que é exigência declarada.
- **piso – teto entre fontes** — menor e maior percentual entre as fontes com pelo
  menos 70 vagas. É a métrica mais honesta para a pergunta "o que se pede em
  comum": um requisito com piso alto aparece em toda parte, e não só onde uma
  fonte grande o repete.
- **Cobertura por categoria** — percentual de vagas com pelo menos um requisito
  daquela categoria.

## 7. Limitações conhecidas

1. **Presença de padrão não é exigência formal.** "Arquitetura" pode ser requisito
   ou descrição do produto. O texto original de cada vaga está preservado na
   coluna `descricao` de `dados/vagas.csv` justamente para permitir conferência.
2. **Silêncio não é ausência de exigência.** Empresa que não escreve "trabalho em
   equipe" continua esperando isso.
3. **Idioma é um recorte imperfeito de mercado.** "PT" aproxima o Brasil e "EN" o
   mercado internacional remoto, mas há empresa brasileira publicando em inglês.
4. **Viés de board.** Boards remotos sobre-representam empresas de produto e
   startups; a Gupy sobre-representa empresa grande e consultoria. Vaga que só
   circula por indicação não aparece em lugar nenhum.
5. **Amostra pequena em júnior e pleno** (41 e 111 vagas, contra 440 sênior). A
   direção da curva de senioridade é confiável; os valores exatos dessas duas
   faixas, não. Some-se a isso o confundimento com a fonte: 85% das vagas júnior
   são brasileiras contra 15% das de staff, então a curva mistura carreira com
   mercado. O relatório marca as linhas em que esse efeito domina.
6. **É uma foto.** Os números valem para a data da coleta.

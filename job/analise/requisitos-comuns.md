# O que as vagas de desenvolvedor mais pedem em comum

> Fora linguagem de programação e framework.

**Corpus:** 1209 anúncios de vaga de desenvolvedor coletados em 2026-07-27, de 9 fontes, 506 em português e 703 em inglês.
**Método:** 50 requisitos não-stack procurados por padrões de texto em cada anúncio; a medida é presença ou ausência por vaga, nunca número de repetições.
**Regerado por:** `npm run agregar` · dados em [estatisticas.json](estatisticas.json) · corpus em [../dados/vagas.csv](../dados/README.md)

---

## A resposta curta

Tirando linguagem e framework, o que se repete nas vagas de desenvolvedor é um **tripé**:

1. **Mover dados entre sistemas.** API/integração (55,4%) e banco de dados/SQL (53,3%) são os dois itens mais pedidos do corpus inteiro, e nenhum deles depende da linguagem. Aparecem juntos no mesmo anúncio em 36,2% dos casos — a dupla mais frequente de todas. A descrição honesta do trabalho na maioria das vagas é: ler dados de um lugar, transformar, expor em outro.

2. **Colocar em produção sozinho.** Cloud (41,4%), CI/CD (31,9%) e containers (28,5%) deixaram de ser assunto de infraestrutura. Cloud é uma das exigências mais uniformes do corpus: não cai abaixo de 23,9% em nenhuma fonte, seja board brasileiro, europeu ou americano. Ninguém mais contrata quem só escreve código e entrega para outro subir.

3. **Trabalhar com gente.** Colaboração (49,3%) e comunicação (36,5%) são, disparado, as exigências não-técnicas mais frequentes — nos boards com formulário estruturado, 61,9% e 45,9%. A terceira colocada entre as comportamentais fica bem atrás: autonomia, com 23,0%. Não existe uma lista longa de soft skills cobradas; existem duas, repetidas à exaustão.

Por categoria: **90,0%** dos anúncios pedem ao menos um fundamento técnico que independe de linguagem, **78,1%** pedem algo de processo de engenharia e **73,5%** pedem algo comportamental. A média é de 9,9 requisitos não-stack por vaga.

## O Brasil não é um mercado só

Este é o achado que só apareceu quando o corpus deixou de depender de uma fonte brasileira só. As três fontes do país descrevem mundos diferentes — e a diferença entre elas é maior que a diferença entre Brasil e exterior em vários itens.

A **Gupy**, onde publica a empresa grande, o varejo e a consultoria, enumera ferramenta e ritual: Git em 64,7% dos anúncios, ágil/Scrum em 50,6%, testes automatizados em 48,1%. O **Greenhouse das empresas de produto e fintechs** (Stone, XP, C6, Inter, QuintoAndar, VTEX, RD Station, Wildlife e outras) cobra profundidade de engenharia: performance e escala em 62,4%, cloud em 62,4%, arquitetura em 58,8%, observabilidade em 57,6% — contra 37,5% na Gupy. O **ProgramaThor**, de startup e empresa pequena, fica abaixo dos dois em quase tudo, com anúncios mais curtos e menos formalizados.

O contraste mais prático é o inglês: **18,8% na Gupy, 26,9% no ProgramaThor e 38,8% nas empresas de produto**. Dobrar de um para o outro muda a conta de quem pode se candidatar. O mesmo vale para liderança técnica (14,7% na Gupy contra 31,8% nas empresas de produto).

Ou seja: "o mercado brasileiro pede X" é uma frase perigosa. Depende de qual Brasil.

## Cinco coisas que os números contrariam

**O inglês aparece menos do que se imagina — e isso engana.** 18,0% dos anúncios citam inglês explicitamente, 16,8% entre os escritos em português. Mas 703 das 1.209 vagas do corpus *estão escritas em inglês*: ali o idioma não é requisito listado, é o pedágio para ler o anúncio. A leitura correta não é "inglês importa pouco", é "no mercado doméstico brasileiro o inglês raramente é filtro formal — exceto nas empresas de produto — e é exatamente ele que separa você de quase 60% das vagas deste corpus".

**Algoritmo e estrutura de dados quase não são pedidos: 5,2%.** O conteúdo que domina a preparação para entrevista aparece em 1 a cada 20 anúncios. É filtro de processo seletivo de um punhado de empresas, não requisito de mercado.

**Diploma pesa no começo e evapora depois.** 18,7% das vagas pedem ensino superior, mas são 22,0% nas júnior e 30,6% nas plenas contra 16,4% nas sênior e 16,9% nas staff. Só 2,7% dizem explicitamente que diploma não é necessário — o mais comum não é dispensar, é parar de mencionar.

**Portfólio e open source: 6,6%.** Contribuir para projeto público é ótimo para aprender e para a sua rede, mas praticamente nenhum anúncio cobra isso.

**O que promove não é stack.** Comparando júnior com staff/lead, as exigências que mais crescem são arquitetura/system design (14,6% → 70,8%), liderança técnica (7,3% → 50,8%) e mentoria (7,3% → 38,5%). Nenhuma é uma tecnologia. A senioridade é medida em escopo de influência: quanto do sistema e de quantas pessoas você responde.

Uma ressalva verificada nessa comparação: a faixa júnior/pleno do corpus é 85% e 95% brasileira, enquanto a de staff é 15%. Como os dois mercados escrevem anúncios diferentes, parte da variação é efeito da fonte. É por isso que Git e banco de dados *caem* com a senioridade na tabela da seção 6 — estão marcados como confundidos lá. Arquitetura, liderança e mentoria passam no teste: a diferença entre PT e EN nesses três não passa de 12 p.p., pequena demais para explicar variações de 31 a 56 p.p.

## Brasil x lá fora: dois jeitos de escrever a mesma vaga

O anúncio brasileiro descreve **como** você vai trabalhar; o internacional descreve **pelo que** você vai responder.

O Brasil enumera ferramenta e ritual: Git 60,1% contra 20,8%, ágil/Scrum 41,1% contra 19,2%, testes automatizados 41,5% contra 12,7%, clean code/SOLID 54,2% contra 32,3%. Lá fora se cobra resultado e escopo: arquitetura 44,7% contra 33,0%, ownership 24,0% contra 12,8%, mentoria 21,3% contra 10,5%, e tempo mínimo de experiência em número fechado 22,5% contra 7,3%.

Isso tem consequência prática para currículo. Para vaga brasileira, o anúncio pede que você prove familiaridade com o processo — vale citar as práticas pelo nome. Para vaga internacional, dizer "trabalho com Scrum" não diferencia ninguém: conta o que você foi dono e em que escala.

## O ruído que o método precisou tirar

Quatro correções mudaram materialmente os números e vale saber delas antes de comparar este levantamento com qualquer outro:

- **Benefício não é requisito.** Um bloco final de benefícios aparece em 52,9% das vagas, com 949 caracteres em média. Sem descartá-lo, "curso de inglês in company" contava como exigência de inglês e "horário flexível" como pedido de adaptabilidade.
- **Link não é requisito.** URLs e e-mails saem do texto antes da busca por padrões. Sem isso, um anúncio que apenas linkava um repositório era contado como exigindo controle de versão.
- **Flexão inclusiva quebrava o filtro.** "Engenheiro(a) de Software" não casava com nenhum padrão de cargo por causa do "(a)" no meio da palavra — e essa é a grafia padrão em vaga brasileira. O filtro passou a remover a flexão entre parênteses antes de testar. Só nas empresas de produto isso multiplicou por quatro o número de vagas reconhecidas como sendo de desenvolvimento.
- **Silêncio não é dispensa.** Nos anúncios do Hacker News, escritos pela própria engenharia, "trabalho em equipe" aparece em 7,5% — contra 65,6% na Gupy. Nenhuma dessas empresas contrata quem não trabalha em equipe; elas apenas não escrevem listas de requisitos. Por isso o ranking traz o piso entre fontes.

---

## 1. O corpus

| Fonte | Vagas | Escopo |
| --- | --- | --- |
| Gupy (BR) | 320 | Brasil — maior ATS do país, vagas em português |
| Hacker News | 280 | Global — anúncio escrito pela própria engenharia, sem template de RH |
| programathor | 160 | Brasil — board só de vagas de tecnologia, empresas menores e startups |
| We Work Remotely | 108 | Remoto global — feeds RSS por categoria (25 por feed) |
| greenhouse_br | 85 | Brasil — página de carreiras de empresas de tecnologia e fintechs brasileiras |
| Himalayas | 84 | Remoto global — API paginada de 20 em 20 |
| Jobicy | 80 | Remoto global — API limitada a 50 por chamada, varrida por região |
| Arbeitnow | 79 | Europa (forte na Alemanha) — board generalista, 100 por página |
| Remotive | 13 | Remoto global — categoria software-dev |

Distribuição do corpus:

- **Idioma:** en 703 · pt 506
- **Senioridade declarada no título:** Não informado 483 · Sênior 440 · Staff/Lead 130 · Pleno 111 · Júnior 41 · Estágio 4
- **Modalidade:** remoto 718 · hibrido 209 · nao_informado 146 · presencial 136
- **Família:** generico 527 · fullstack 242 · backend 140 · devops_sre 84 · dados_ml 82 · mobile 62 · frontend 53 · qa 14 · embarcado 4 · jogos 1
- **Média de requisitos não-stack por vaga:** 9.9

## 2. Quanto cada tipo de exigência aparece

Percentual de anúncios que pedem **pelo menos um** item da categoria.

| Categoria | Itens na taxonomia | % das vagas | PT | EN |
| --- | --- | --- | --- | --- |
| Fundamentos técnicos que independem de linguagem | 11 | **90.0%** | 96.8% | 85.1% |
| Processo e prática de engenharia | 11 | **78.1%** | 90.9% | 68.8% |
| Comportamento e colaboração | 12 | **73.5%** | 75.5% | 72.1% |
| Credenciais, contexto e formato de trabalho | 8 | **58.9%** | 66.6% | 53.3% |
| Comunicação e idioma | 4 | **44.0%** | 44.5% | 43.7% |
| Produto e negócio | 4 | **28.9%** | 27.7% | 29.9% |

## 3. Ranking completo

- **% geral** — todas as 1209 vagas.
- **% boards** — só os boards com formulário estruturado (exclui Hacker News, cujos anúncios são pitches curtos e quase nunca listam requisito).
- **piso – teto** — menor e maior percentual entre as 8 fontes com amostra relevante. Um piso alto significa que a exigência aparece em toda parte, não só onde uma fonte grande a repete.

| # | Requisito | Categoria | % geral | % boards | PT | EN | piso – teto |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | APIs e integrações | Fundamentos técnicos que independem de linguagem | **55.4%** | 64.9% | 75.9% | 40.7% | 23.9% – 78.8% |
| 2 | Banco de dados / SQL | Fundamentos técnicos que independem de linguagem | **53.3%** | 59.1% | 72.3% | 39.7% | 32.9% – 74.4% |
| 3 | Trabalho em equipe / colaboração | Comportamento e colaboração | **49.3%** | 61.9% | 57.7% | 43.2% | 7.5% – 78.8% |
| 4 | Clean code / SOLID / boas práticas | Fundamentos técnicos que independem de linguagem | **41.4%** | 51.9% | 54.2% | 32.3% | 6.8% – 74.1% |
| 5 | Cloud (AWS/Azure/GCP) | Fundamentos técnicos que independem de linguagem | **41.4%** | 46.6% | 43.1% | 40.1% | 23.9% – 62.4% |
| 6 | Arquitetura / system design | Fundamentos técnicos que independem de linguagem | **39.8%** | 45.6% | 33.0% | 44.7% | 20.4% – 67.5% |
| 7 | Experiência prévia comprovada (sem número) | Credenciais, contexto e formato de trabalho | **38.7%** | 48.9% | 51.8% | 29.3% | 5.0% – 58.8% |
| 8 | Controle de versão (Git) | Processo e prática de engenharia | **37.2%** | 46.1% | 60.1% | 20.8% | 7.9% – 64.7% |
| 9 | Comunicação (falar/escrever bem) | Comunicação e idioma | **36.5%** | 45.9% | 34.8% | 37.7% | 5.4% – 73.8% |
| 10 | Performance e escala | Processo e prática de engenharia | **34.8%** | 43.3% | 36.2% | 33.9% | 6.8% – 62.4% |
| 11 | Observabilidade / monitoramento | Processo e prática de engenharia | **32.8%** | 38.4% | 33.6% | 32.3% | 14.3% – 57.6% |
| 12 | CI/CD e automação de deploy | Processo e prática de engenharia | **31.9%** | 39.0% | 40.1% | 26.0% | 8.6% – 44.4% |
| 13 | Dados / IA no dia a dia | Fundamentos técnicos que independem de linguagem | **29.4%** | 30.7% | 26.1% | 31.7% | 23.1% – 47.5% |
| 14 | Containers / Kubernetes | Fundamentos técnicos que independem de linguagem | **28.5%** | 32.5% | 31.4% | 26.5% | 15.4% – 38.8% |
| 15 | Metodologias ágeis (Scrum/Kanban) | Processo e prática de engenharia | **28.4%** | 34.8% | 41.1% | 19.2% | 7.1% – 50.6% |
| 16 | Testes automatizados / TDD | Processo e prática de engenharia | **24.7%** | 31.8% | 41.5% | 12.7% | 1.4% – 48.1% |
| 17 | Autonomia / trabalhar sem supervisão | Comportamento e colaboração | **23.0%** | 25.4% | 26.1% | 20.8% | 13.9% – 33.8% |
| 18 | Documentação técnica | Processo e prática de engenharia | **22.0%** | 28.3% | 30.0% | 16.2% | 1.1% – 33.8% |
| 19 | Cultura DevOps | Processo e prática de engenharia | **20.3%** | 22.7% | 20.4% | 20.3% | 12.5% – 31.5% |
| 20 | Ownership / senso de dono | Comportamento e colaboração | **19.4%** | 19.7% | 12.8% | 24.0% | 8.8% – 31.3% |
| 21 | Diploma / ensino superior | Credenciais, contexto e formato de trabalho | **18.7%** | 24.2% | 24.5% | 14.5% | 0.4% – 40.5% |
| 22 | Mensageria / arquitetura orientada a eventos | Fundamentos técnicos que independem de linguagem | **18.2%** | 22.9% | 29.2% | 10.2% | 2.5% – 35.3% |
| 23 | Inglês | Comunicação e idioma | **18.0%** | 22.5% | 16.8% | 18.9% | 3.2% – 38.8% |
| 24 | Code review / pull request | Processo e prática de engenharia | **17.5%** | 22.4% | 26.9% | 10.8% | 1.4% – 29.4% |
| 25 | Mentoria de outras pessoas | Comportamento e colaboração | **16.8%** | 20.1% | 10.5% | 21.3% | 5.7% – 38.8% |
| 26 | Microsserviços | Fundamentos técnicos que independem de linguagem | **16.6%** | 21.2% | 25.7% | 10.1% | 1.4% – 30.6% |
| 27 | Liderança técnica | Comportamento e colaboração | **16.1%** | 18.7% | 15.2% | 16.8% | 7.5% – 31.8% |
| 28 | Tempo mínimo de experiência (em anos) | Credenciais, contexto e formato de trabalho | **16.1%** | 19.3% | 7.3% | 22.5% | 5.7% – 41.3% |
| 29 | Resolução de problemas / raciocínio analítico | Comportamento e colaboração | **14.9%** | 19.3% | 18.6% | 12.2% | 0.4% – 32.1% |
| 30 | Times multidisciplinares / cross-functional | Comportamento e colaboração | **13.6%** | 17.0% | 11.3% | 15.2% | 2.1% – 25.9% |
| 31 | Aprendizado contínuo / curiosidade | Comportamento e colaboração | **13.1%** | 16.1% | 12.6% | 13.4% | 2.9% – 33.8% |
| 32 | Infraestrutura como código | Fundamentos técnicos que independem de linguagem | **11.3%** | 12.1% | 4.7% | 16.1% | 3.1% – 26.9% |
| 33 | Entender o negócio / gerar impacto | Produto e negócio | **11.2%** | 14.4% | 13.4% | 9.7% | 0.7% – 19.0% |
| 34 | Organização / gestão de prazos | Comportamento e colaboração | **11.2%** | 14.0% | 16.8% | 7.1% | 1.8% – 21.3% |
| 35 | Relação com stakeholders | Produto e negócio | **11.2%** | 14.0% | 7.1% | 14.1% | 1.8% – 28.7% |
| 36 | Adaptabilidade / ambiente de mudança | Comportamento e colaboração | **9.7%** | 11.6% | 4.3% | 13.5% | 3.2% – 26.3% |
| 37 | Proatividade / iniciativa | Comportamento e colaboração | **9.5%** | 12.1% | 8.9% | 10.0% | 1.1% – 21.4% |
| 38 | Foco no cliente / usuário final | Produto e negócio | **8.5%** | 10.8% | 7.7% | 9.1% | 1.1% – 20.0% |
| 39 | Segurança / conformidade | Processo e prática de engenharia | **7.9%** | 9.9% | 9.3% | 7.0% | 1.4% – 16.5% |
| 40 | Visão de produto / trabalho com PM e design | Produto e negócio | **7.9%** | 8.7% | 3.8% | 11.0% | 3.8% – 16.3% |
| 41 | Portfólio / open source / projetos pessoais | Credenciais, contexto e formato de trabalho | **6.6%** | 7.2% | 3.4% | 9.0% | 3.4% – 12.9% |
| 42 | Plantão / on-call | Processo e prática de engenharia | **5.7%** | 6.8% | 0.8% | 9.2% | 0.6% – 24.1% |
| 43 | Algoritmos e estruturas de dados | Fundamentos técnicos que independem de linguagem | **5.2%** | 5.9% | 5.1% | 5.3% | 2.9% – 12.9% |
| 44 | Fuso horário / janela de sobreposição | Credenciais, contexto e formato de trabalho | **4.9%** | 4.1% | 0.2% | 8.3% | 0.0% – 18.8% |
| 45 | Atenção a detalhes / qualidade | Comportamento e colaboração | **3.6%** | 4.6% | 1.4% | 5.3% | 0.4% – 12.5% |
| 46 | Diploma explicitamente dispensável | Credenciais, contexto e formato de trabalho | **2.7%** | 3.3% | 0.6% | 4.3% | 0.0% – 13.1% |
| 47 | Comunicação escrita explícita | Comunicação e idioma | **2.6%** | 3.2% | 0.6% | 4.1% | 0.6% – 13.1% |
| 48 | Autorização de trabalho / visto | Credenciais, contexto e formato de trabalho | **1.9%** | 0.8% | 0.0% | 3.3% | 0.0% – 6.0% |
| 49 | Espanhol | Comunicação e idioma | **1.4%** | 1.8% | 2.8% | 0.4% | 0.0% – 4.1% |
| 50 | Disponibilidade para viagem / presença | Credenciais, contexto e formato de trabalho | **0.4%** | 0.5% | 0.4% | 0.4% | 0.0% – 2.5% |

## 4. O núcleo que aparece em toda fonte

Ordenado pelo **piso** entre fontes — o que sobrevive independentemente de onde a vaga foi publicada.

| Requisito | Piso entre fontes | % geral |  |
| --- | --- | --- | --- |
| Banco de dados / SQL | 32.9% | 53.3% | `███████████████` |
| APIs e integrações | 23.9% | 55.4% | `███████████` |
| Cloud (AWS/Azure/GCP) | 23.9% | 41.4% | `███████████` |
| Dados / IA no dia a dia | 23.1% | 29.4% | `██████████` |
| Arquitetura / system design | 20.4% | 39.8% | `█████████` |
| Containers / Kubernetes | 15.4% | 28.5% | `███████` |
| Observabilidade / monitoramento | 14.3% | 32.8% | `██████` |
| Autonomia / trabalhar sem supervisão | 13.9% | 23.0% | `██████` |
| Cultura DevOps | 12.5% | 20.3% | `██████` |
| Ownership / senso de dono | 8.8% | 19.4% | `████` |
| CI/CD e automação de deploy | 8.6% | 31.9% | `████` |
| Controle de versão (Git) | 7.9% | 37.2% | `████` |

## 5. Brasil x mercado global

Vagas em português (majoritariamente Gupy) contra vagas em inglês (boards remotos internacionais).

**Cobrado mais no Brasil:**

| Requisito | PT | EN | Diferença |
| --- | --- | --- | --- |
| Controle de versão (Git) | 60.1% | 20.8% | +39.3 p.p. |
| APIs e integrações | 75.9% | 40.7% | +35.2 p.p. |
| Banco de dados / SQL | 72.3% | 39.7% | +32.6 p.p. |
| Testes automatizados / TDD | 41.5% | 12.7% | +28.8 p.p. |
| Experiência prévia comprovada (sem número) | 51.8% | 29.3% | +22.5 p.p. |
| Clean code / SOLID / boas práticas | 54.2% | 32.3% | +21.9 p.p. |
| Metodologias ágeis (Scrum/Kanban) | 41.1% | 19.2% | +21.9 p.p. |
| Mensageria / arquitetura orientada a eventos | 29.2% | 10.2% | +19.0 p.p. |

**Cobrado mais lá fora:**

| Requisito | EN | PT | Diferença |
| --- | --- | --- | --- |
| Tempo mínimo de experiência (em anos) | 22.5% | 7.3% | +15.2 p.p. |
| Arquitetura / system design | 44.7% | 33.0% | +11.7 p.p. |
| Infraestrutura como código | 16.1% | 4.7% | +11.4 p.p. |
| Ownership / senso de dono | 24.0% | 12.8% | +11.2 p.p. |
| Mentoria de outras pessoas | 21.3% | 10.5% | +10.8 p.p. |
| Adaptabilidade / ambiente de mudança | 13.5% | 4.3% | +9.2 p.p. |
| Relação com stakeholders | 14.1% | 7.1% | +7.0 p.p. |
| Dados / IA no dia a dia | 31.7% | 26.1% | +5.6 p.p. |

## 6. O que muda conforme a senioridade

Requisitos com maior variação entre júnior e staff/lead.

**Leia esta tabela com cuidado.** As vagas júnior e plenas do corpus são quase
todas brasileiras (79% e 96% vêm da Gupy) e as de staff/lead são quase todas
internacionais (21% da Gupy). Como o anúncio brasileiro e o internacional pedem
coisas diferentes, parte da variação abaixo é efeito da fonte, não da senioridade.
A coluna **gap PT–EN** mostra a diferença do mesmo requisito entre os dois
idiomas: quando ela é grande em relação à variação, a linha está marcada como
confundida e não deve ser lida como "isso muda com a senioridade".

| Requisito | Júnior | Pleno | Sênior | Staff/Lead | Variação | Gap PT–EN | Leitura |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Arquitetura / system design | 14.6% | 23.4% | 46.8% | 70.8% | +56.2 p.p. | -11.7 p.p. | ok |
| Liderança técnica | 7.3% | 6.3% | 16.4% | 50.8% | +43.5 p.p. | -1.6 p.p. | ok |
| Observabilidade / monitoramento | 9.8% | 25.2% | 39.8% | 48.5% | +38.7 p.p. | +1.3 p.p. | ok |
| Controle de versão (Git) | 65.9% | 65.8% | 35.9% | 30.8% | -35.1 p.p. | +39.3 p.p. | ⚠️ confundido |
| CI/CD e automação de deploy | 9.8% | 36.0% | 37.5% | 43.8% | +34.0 p.p. | +14.1 p.p. | ok |
| Cloud (AWS/Azure/GCP) | 19.5% | 40.5% | 48.9% | 51.5% | +32.0 p.p. | +3.0 p.p. | ok |
| Banco de dados / SQL | 68.3% | 79.3% | 57.5% | 36.9% | -31.4 p.p. | +32.6 p.p. | ⚠️ confundido |
| Performance e escala | 17.1% | 34.2% | 45.5% | 48.5% | +31.4 p.p. | +2.3 p.p. | ok |
| Mentoria de outras pessoas | 7.3% | 6.3% | 21.6% | 38.5% | +31.2 p.p. | -10.8 p.p. | ok |
| Times multidisciplinares / cross-functional | 2.4% | 12.6% | 14.5% | 28.5% | +26.1 p.p. | -3.9 p.p. | ok |
| Ownership / senso de dono | 4.9% | 8.1% | 22.0% | 30.0% | +25.1 p.p. | -11.2 p.p. | ok |
| Autonomia / trabalhar sem supervisão | 7.3% | 25.2% | 22.3% | 30.8% | +23.5 p.p. | +5.3 p.p. | ok |

Tamanho de cada grupo: Júnior 41 · Pleno 111 · Sênior 440 · Staff/Lead 130 · Não informado 483.

## 7. Tempo de experiência exigido

27.4% dos anúncios (331 vagas) declaram um número mínimo de anos. Entre elas, a mediana é **5 anos** e a média 5.3.

```
 1 ano(s) █ 4
 2 ano(s) ███████████ 39
 3 ano(s) █████████████ 46
 4 ano(s) ███████ 23
 5 ano(s) ██████████████████████████████████ 117
 6 ano(s) ██████████ 34
 7 ano(s) ███ 12
 8 ano(s) ███████ 23
10 ano(s) █████ 17
12 ano(s) ██ 7
15 ano(s) █ 5
16 ano(s) █ 3
20 ano(s) █ 1
```

## 8. Exigências que andam juntas

Pares que mais aparecem no mesmo anúncio.

| Par | % das vagas |
| --- | --- |
| APIs e integrações + Banco de dados / SQL | 36.2% |
| APIs e integrações + Trabalho em equipe / colaboração | 31.7% |
| APIs e integrações + Clean code / SOLID / boas práticas | 29.4% |
| Banco de dados / SQL + Trabalho em equipe / colaboração | 28.9% |
| APIs e integrações + Controle de versão (Git) | 28.7% |
| Trabalho em equipe / colaboração + Clean code / SOLID / boas práticas | 28.3% |
| APIs e integrações + Experiência prévia comprovada (sem número) | 27.2% |
| Banco de dados / SQL + Cloud (AWS/Azure/GCP) | 26.8% |
| Trabalho em equipe / colaboração + Experiência prévia comprovada (sem número) | 26.6% |
| Banco de dados / SQL + Clean code / SOLID / boas práticas | 26.1% |

## 9. O que quase ninguém pede

| Requisito | Categoria | % das vagas |
| --- | --- | --- |
| Disponibilidade para viagem / presença | Credenciais, contexto e formato de trabalho | 0.4% |
| Espanhol | Comunicação e idioma | 1.4% |
| Autorização de trabalho / visto | Credenciais, contexto e formato de trabalho | 1.9% |
| Comunicação escrita explícita | Comunicação e idioma | 2.6% |
| Diploma explicitamente dispensável | Credenciais, contexto e formato de trabalho | 2.7% |
| Atenção a detalhes / qualidade | Comportamento e colaboração | 3.6% |
| Fuso horário / janela de sobreposição | Credenciais, contexto e formato de trabalho | 4.9% |
| Algoritmos e estruturas de dados | Fundamentos técnicos que independem de linguagem | 5.2% |
| Plantão / on-call | Processo e prática de engenharia | 5.7% |
| Portfólio / open source / projetos pessoais | Credenciais, contexto e formato de trabalho | 6.6% |

## 10. Como ler estes números

1. **Presença de padrão não é exigência formal.** O projeto mede se o assunto aparece no anúncio. "Arquitetura" pode ser requisito ("experiência com arquitetura de sistemas") ou descrição do produto ("nossa arquitetura distribuída"). O texto original de cada vaga fica na coluna `descricao` de [../dados/vagas.csv](../dados/README.md) para conferência.
2. **O bloco de benefícios é descartado** quando aparece na metade final do anúncio (52.9% das vagas, ~949 caracteres em média). Sem isso, "curso de inglês in company" viraria exigência de inglês e "horário flexível" viraria pedido de adaptabilidade.
3. **Silêncio não é ausência de exigência.** Nenhuma vaga do Hacker News pede "trabalho em equipe" por escrito, e é óbvio que essas empresas esperam isso. Por isso o ranking traz a coluna de boards estruturados e o piso entre fontes.
4. **O idioma do anúncio é um recorte imperfeito de mercado.** "PT" aproxima o mercado brasileiro e "EN" o internacional remoto, mas há empresa brasileira publicando em inglês.
5. **É uma foto, não um filme.** Os números valem para a coleta de 2026-07-27.

## 11. Reproduzir

```bash
npm run pipeline    # coleta → análise → este relatório → site → CSV
```

Critérios de busca em [`config/criterios.json`](../config/criterios.json), dicionário de requisitos em [`config/taxonomia.json`](../config/taxonomia.json) (versão tabular em [`dados/taxonomia.csv`](../dados/taxonomia.csv)), metodologia em [`docs/metodologia.md`](../docs/metodologia.md).

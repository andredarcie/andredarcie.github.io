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

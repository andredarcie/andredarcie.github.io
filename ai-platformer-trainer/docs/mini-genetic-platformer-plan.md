# Plano do Projeto: Mini Plataforma com Rede Neural + Algoritmo Genetico

## Objetivo

Criar uma versao web simples, usando HTML, CSS e JavaScript, inspirada no projeto MarI/O: um cubo deve atravessar uma fase 2D curta pulando buracos e chegando ao final. Em vez de ser controlado por um jogador, o cubo sera controlado por uma pequena rede neural treinada por algoritmo genetico ao longo de varias geracoes.

## Escopo Inicial

- Um unico mapa curto e fixo.
- Um personagem em forma de cubo.
- Tres acoes possiveis: andar para a esquerda, andar para a direita e pular.
- Fisica simples: gravidade, colisao com o chao e queda em buracos.
- Multiplos agentes testados automaticamente em sequencia ou em paralelo visual simplificado.
- Fitness baseado em progresso horizontal, sobrevivencia e bonus por concluir a fase.
- Interface minima mostrando geracao atual, agente atual, melhor fitness e melhor agente.

## O que sera fiel ao projeto original

- Uso de rede neural para decidir a acao do personagem.
- Uso de algoritmo genetico para evoluir os agentes.
- Avaliacao repetida em tentativas curtas com score de fitness.
- Melhoria gradual por geracoes.

## O que sera simplificado

- Nada de emulador, ROM ou leitura de memoria.
- Nada de NEAT completo com topologia mutavel e especiacao no primeiro momento.
- Rede neural de topologia fixa no inicio.
- Entradas pequenas e diretas, extraidas do proprio estado do jogo.
- Um unico tipo de obstaculo: buracos.

## Arquitetura Proposta

### 1. Camada do jogo

Responsavel por:

- representar o mapa;
- atualizar fisica do cubo;
- detectar colisao, queda e fim de fase;
- expor o estado atual do jogo para a IA.

Arquivos previstos:

- `index.html`
- `styles.css`
- `src/game.js`
- `src/physics.js`
- `src/level.js`
- `src/renderer.js`

### 2. Camada da IA

Responsavel por:

- definir a rede neural;
- processar entradas e gerar saidas;
- representar um individuo da populacao;
- aplicar crossover, mutacao e selecao.

Arquivos previstos:

- `src/nn.js`
- `src/genome.js`
- `src/genetic.js`
- `src/evaluator.js`

### 3. Camada de controle da simulacao

Responsavel por:

- inicializar populacao;
- rodar tentativas;
- controlar geracoes;
- exibir metricas e permitir assistir ao melhor agente.

Arquivos previstos:

- `src/main.js`
- `src/ui.js`

## Modelo do jogo

### Mapa

O mapa pode ser um array 1D ou 2D com:

- `1` para chao;
- `0` para vazio;
- linha de chegada no fim.

Exemplo de ideia:

- trechos de chao seguros;
- alguns buracos pequenos;
- um buraco final um pouco maior;
- objetivo de cruzar toda a fase.

### Personagem

Estado minimo:

- `x`, `y`
- `vx`, `vy`
- `isGrounded`
- `isAlive`
- `finished`

### Acoes

Saidas da rede:

- mover esquerda
- mover direita
- pular

Regra simples:

- se `saida > limite`, acao ativa;
- esquerda e direita nao podem ser aplicadas juntas sem prioridade definida;
- pulo so funciona se estiver no chao.

## Modelo da rede neural

Para manter o projeto viavel, a primeira versao deve usar uma rede fixa pequena:

- camada de entrada;
- uma camada oculta;
- camada de saida com 3 neuronios.

### Entradas sugeridas

Usar poucas entradas objetivas:

- distancia ate o proximo buraco;
- largura do proximo buraco;
- velocidade horizontal atual;
- velocidade vertical atual;
- esta no chao ou nao;
- distancia ate a linha de chegada.

Opcional depois:

- altura relativa do terreno a frente;
- mais de um sensor para olhar o mapa adiante.

## Modelo genetico

Primeira versao:

- populacao fixa, por exemplo 30 a 100 agentes;
- rede com pesos aleatorios iniciais;
- fitness calculado ao final de cada tentativa;
- selecao dos melhores;
- crossover simples entre dois pais;
- mutacao aleatoria nos pesos;
- elitismo pequeno para preservar os melhores.

Configuracao inicial sugerida:

- populacao: 50
- taxa de elitismo: 10%
- taxa de mutacao: 10% a 20% dos pesos por filho
- maximo de frames por tentativa: 600 a 1200

## Fitness

Formula inicial simples:

- recompensa principal por distancia maxima atingida no eixo X;
- bonus por sobreviver mais tempo sem travar;
- bonus grande por concluir a fase;
- penalidade se cair cedo.

Exemplo:

`fitness = distanciaMaxima + bonusConclusao - penalidadePorMorte`

Se o agente ficar parado por muito tempo:

- encerrar tentativa cedo;
- aplicar penalidade leve;
- seguir para o proximo agente.

## Fases de implementacao

### Fase 1: Base visual e do jogo

- criar pagina HTML com canvas;
- desenhar mapa simples;
- desenhar cubo;
- implementar gravidade, movimento lateral e pulo;
- detectar queda em buracos;
- detectar fim da fase;
- permitir testar manualmente pelo teclado.

Resultado esperado:

O jogo funciona normalmente com controle humano.

### Fase 2: Estado observavel para IA

- criar funcao que retorna o estado resumido do jogo;
- normalizar valores de entrada;
- desacoplar logica de renderizacao da logica de simulacao.

Resultado esperado:

A simulacao consegue fornecer entradas consistentes para qualquer agente.

### Fase 3: Rede neural

- implementar feedforward simples;
- definir pesos e biases;
- gerar saidas para esquerda, direita e pulo;
- conectar a rede ao personagem.

Resultado esperado:

Um agente aleatorio ja consegue jogar, mesmo muito mal.

### Fase 4: Algoritmo genetico

- criar populacao inicial;
- avaliar todos os agentes;
- calcular fitness;
- selecionar melhores;
- gerar nova geracao por crossover e mutacao;
- repetir ciclo automaticamente.

Resultado esperado:

As geracoes avancam sem intervencao manual.

### Fase 5: Visualizacao do treino

- mostrar geracao atual;
- mostrar indice do agente em teste;
- mostrar melhor fitness historico;
- permitir assistir ao melhor agente da geracao;
- opcionalmente acelerar simulacao sem renderizar todos os frames.

Resultado esperado:

O treino fica observavel e depuravel.

### Fase 6: Ajuste e refinamento

- ajustar formula de fitness;
- ajustar sensores de entrada;
- ajustar parametros geneticos;
- evitar comportamento de travamento;
- validar se o agente aprende de forma consistente.

Resultado esperado:

O melhor agente conclui a fase com alguma regularidade.

## Estrutura minima de pastas

```text
/
  index.html
  styles.css
  /src
    main.js
    game.js
    physics.js
    level.js
    renderer.js
    nn.js
    genome.js
    genetic.js
    evaluator.js
    ui.js
  /docs
    mini-genetic-platformer-plan.md
```

## Riscos e decisoes importantes

- Se a fisica estiver instavel, o treino nao converge.
- Se as entradas forem pobres demais, a rede nao aprende a pular no momento certo.
- Se o fitness premiar apenas distancia, o agente pode explorar comportamentos ruins mas lucrativos.
- Se a simulacao for lenta demais no navegador, sera preciso reduzir renderizacao ou acelerar o loop interno.

## Estrategia recomendada

A melhor estrategia e fazer primeiro um jogo manual muito simples e confiavel, depois conectar a IA, e so entao adicionar a evolucao genetica. O maior erro aqui seria tentar montar rede neural, algoritmo genetico e jogo ao mesmo tempo sem uma base jogavel.

## Criterios de sucesso

- O jogo roda localmente no navegador sem dependencias complexas.
- O cubo consegue ser controlado por teclado.
- A IA recebe entradas consistentes do estado do jogo.
- O algoritmo genetico gera novas geracoes automaticamente.
- Depois de varias geracoes, pelo menos alguns agentes conseguem atravessar a fase.

## Proximos passos sugeridos

1. Implementar a Fase 1 com controle manual.
2. Definir exatamente quais serao as entradas da rede.
3. Implementar a rede neural fixa.
4. Implementar o ciclo de avaliacao genetica.
5. Ajustar fitness e parametros ate o agente aprender.

## Status atual da implementacao

Itens ja implementados:

- pagina principal com `canvas` e painel lateral;
- fase fixa com buracos;
- cubo com gravidade, deslocamento lateral e pulo;
- modo manual por teclado;
- simulacao desacoplada da renderizacao;
- rede neural pequena com topologia fixa;
- algoritmo genetico com populacao, elitismo, crossover e mutacao;
- visualizacao do melhor fitness, progresso atual e historico por geracao;
- persistencia do melhor agente em `localStorage`;
- modo para assistir ao melhor agente encontrado.
- modo turbo sem renderizacao do canvas.

O que isso significa:

- o projeto ja saiu da fase de prototipo conceitual;
- agora o foco deve mudar de "construir a base" para "melhorar convergencia, clareza visual e robustez".

## Continuacao do plano

### Fase 7: Instrumentacao do treino

Objetivo:

Entender melhor por que os agentes acertam ou erram.

Tarefas:

- desenhar no `canvas` os sensores usados pela rede;
- mostrar as saidas da rede em tempo real;
- mostrar se o agente decidiu esquerda, direita ou pulo;
- destacar visualmente o proximo buraco considerado pela IA;
- exibir no painel a fitness do melhor agente da geracao atual e nao apenas o historico geral.

Resultado esperado:

Fica possivel inspecionar visualmente se a entrada e a decisao da IA fazem sentido.

### Fase 8: Refinamento da fase e do fitness

Objetivo:

Reduzir comportamentos oportunistas e melhorar a estabilidade do aprendizado.

Tarefas:

- testar diferentes distribuicoes de buracos;
- ajustar largura dos buracos para criar curva de dificuldade;
- revisar o bonus por conclusao;
- revisar penalidade por queda precoce;
- revisar regra de encerramento por inatividade;
- testar recompensa adicional por manter velocidade util para saltos.

Resultado esperado:

Os agentes passam a aprender comportamentos mais consistentes e menos acidentais.

### Fase 9: Melhorias no modelo de entrada

Objetivo:

Dar mais contexto para a rede sem explodir a complexidade.

Tarefas:

- adicionar mais de um sensor a frente do cubo;
- incluir informacao sobre profundidade relativa do buraco;
- testar distancia para o segundo proximo buraco;
- testar representacao do estado em grade pequena em vez de poucos valores manuais;
- comparar desempenho entre modelo simples atual e modelo com sensores extras.

Resultado esperado:

A rede ganha mais previsibilidade para decidir o momento do pulo.

### Fase 10: Melhorias no algoritmo genetico

Objetivo:

Aumentar qualidade da evolucao sem ir direto para NEAT completo.

Tarefas:

- experimentar taxa de mutacao adaptativa;
- experimentar elitismo menor ou maior;
- experimentar selecao por torneio com tamanho variavel;
- manter mais de um campeao historico;
- introduzir pequenas mutacoes estruturais opcionais em uma segunda etapa;
- comparar redes com tamanhos diferentes de camada oculta.

Resultado esperado:

O treino fica menos sensivel a configuracoes arbitrarias.

### Fase 11: Modos extras de simulacao

Objetivo:

Melhorar depuracao e demonstracao do projeto.

Tarefas:

- adicionar modo com varios agentes visiveis na mesma geracao;
- adicionar modo "turbo" sem renderizacao;
- adicionar botao para assistir ao melhor agente de uma geracao especifica;
- adicionar replay simples do melhor agente salvo;
- mostrar tempo estimado por geracao.

Resultado esperado:

O projeto fica melhor tanto para estudo quanto para apresentacao.

### Fase 12: Polimento final

Objetivo:

Fechar a primeira versao apresentavel do projeto.

Tarefas:

- revisar responsividade da interface;
- melhorar textos e labels do painel;
- documentar parametros principais no `README`;
- organizar constantes em um arquivo de configuracao;
- limpar codigo morto e padronizar nomes;
- adicionar capturas de tela ou GIF ao projeto.

Resultado esperado:

O repositorio fica pronto para demonstracao publica.

## Backlog priorizado

### Prioridade alta

- desenhar sensores da IA no `canvas`;
- mostrar saidas da rede em tempo real;
- ajustar formula de fitness;
- testar variacoes de mapa;
- calibrar o modo turbo sem renderizacao.

### Prioridade media

- adicionar multiplos agentes visiveis;
- salvar historico de melhores por geracao;
- permitir replay de agentes historicos;
- mover parametros para arquivo de configuracao.

### Prioridade baixa

- experimentar mutacoes estruturais;
- testar representacao de entrada em grade;
- criar mais de uma fase.

## Criterios da proxima entrega

A proxima entrega deve cumprir pelo menos estes pontos:

- mostrar sensores e decisoes da IA na tela;
- permitir treino acelerado sem depender do render completo;
- produzir comportamento mais consistente do melhor agente em varias geracoes;
- deixar o painel claro o suficiente para entender rapidamente se o treino melhorou ou regrediu.

## Sequencia recomendada a partir daqui

1. Instrumentar sensores e saidas da rede.
2. Ajustar fitness com base no que for observado visualmente.
3. Calibrar modo turbo.
4. Testar parametros geneticos em ciclos curtos.
5. Refinar a fase para exigir um aprendizado menos acidental.

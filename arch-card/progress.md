Original prompt: fazendo uma analise profunda do jogo, deixe ele mais facil de entender, mais viciante e gostoso de jogar

- Analise inicial: maior friccao esta em pouca telemetria antes da jogada, descarte punitivo e autoplay de carta ao selecionar.
- Plano em andamento: adicionar painel tatico, explicacao do objetivo, preview da jogada, streak/combos e troca de carta imediata.
- Implementado: painel de leitura rapida do objetivo e painel tatico com preview da jogada.
- Implementado: fim do autoplay de carta; agora o fluxo e selecionar carta e depois escolher slot.
- Implementado: troca de carta imediata 1x por turno, streak visivel, dificuldade inicial suavizada e breakdown de pontuacao no modal.
- Validacao: script.js passou em node --check e fluxo principal foi exercitado no navegador local.
- Ajuste final: labels com texto claro em vez de simbolos corrompidos (SC/AV/CO/SI, HP, Pontuacao, etc.).
- Ajuste solicitado: removido painel intel e reduzido feedback persistente para uma única statusline compacta.
- Redesign completo: loop novo inspirado em pedra-papel-tesoura com 3 escolhas, sinal do rival e rounds curtos.
- Correcao de direcao: loop continua simples, mas voltou a ser card game com mao de 3 cartas e carta rival fechada.
- Restaurado o loop de card game com mao, mesa, objetivo, metricas e modal de resultado.

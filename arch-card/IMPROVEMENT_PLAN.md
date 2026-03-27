# Plano de Melhoria do ArchCard

## Objetivo

Deixar o jogo mais divertido e viciante sem perder a simplicidade de entendimento. A prioridade e melhorar clareza, ritmo de partida e recompensa ao jogador antes de expandir o escopo.

## Fase 1

Objetivo: deixar o jogo imediatamente mais claro.

1. Fazer `Custo Maximo` valer de verdade.
2. Reescrever a faixa de status para sempre mostrar `meta atual`, `valor atual`, `custo usado` e `bonus`.
3. Simplificar o texto do resultado final para 3 blocos: `venceu/perdeu`, `por que`, `quanto ganhou`.
4. Revisar nomes e labels para linguagem de jogador, nao de prototipo.
5. Atualizar o `README.md` para refletir as regras reais.

## Fase 2

Objetivo: melhorar a tomada de decisao sem aumentar complexidade.

1. Reduzir a mao para 3 ou 4 cartas por turno.
2. Mostrar preview completo antes da jogada: `estatistica alvo`, `custo total`, `sinergia ativa ou nao`.
3. Destacar combos com nome curto e efeito visual forte.
4. Mostrar claramente quando uma jogada fecha a meta.
5. Sinalizar "quase la" quando faltar 1 ponto.

## Fase 3

Objetivo: aumentar retencao com recompensas simples.

1. Dar multiplicador de `streak` com impacto real na pontuacao.
2. Adicionar recompensa entre turnos: escolher 1 entre 2 bonus pequenos.
3. Criar bonus permanentes simples por run: `+1 em uma metrica`, `1 troca extra`, `-1 custo em carta comum`.
4. Tornar a derrota menos seca: falha por pouco gera penalidade menor.
5. Acelerar a transicao entre turnos para estimular "so mais uma".

## Fase 4

Objetivo: melhorar variedade sem complicar as regras.

1. Separar objetivos por dificuldade.
2. Introduzir cartas com identidade mais forte, mas leitura simples.
3. Adicionar 4 a 6 novas sinergias faceis de entender.
4. Variar recompensas de turno para evitar repeticao.
5. Salvar melhor pontuacao e maior streak em `localStorage`.

## Fase 5

Objetivo: sustentar evolucao do projeto.

1. Extrair regras do jogo para funcoes puras.
2. Criar testes para `custo`, `sinergias`, `objetivos` e `pontuacao`.
3. Limpar funcoes mortas e inconsistencias do prototipo.
4. Organizar melhor estado, renderizacao e regras.
5. Documentar o loop principal e as decisoes de design.

## Ordem Recomendada

1. Validar custo e clarear HUD.
2. Melhorar preview e reduzir mao.
3. Adicionar `streak` forte e upgrades entre turnos.
4. Expandir conteudo.
5. Refatorar e testar.

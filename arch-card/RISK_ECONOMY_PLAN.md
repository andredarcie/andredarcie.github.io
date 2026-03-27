# Plano de Economia de Risco para o ArchCard

## Objetivo

Adicionar uma camada de decisao mais tensa ao jogo sem deixá-lo dificil de entender. A ideia central e simples:

- cartas boas nao podem ser usadas livremente desde o inicio
- o jogador comeca sem poder de compra
- para ganhar poder de compra, precisa usar cartas ruins, feias ou arriscadas
- essas cartas destravam jogadas fortes, mas cobram um preco

Isso cria uma balanca clara:

- curto prazo: usar carta ruim para conseguir recurso
- medio prazo: montar uma mesa forte
- longo prazo: lidar com as consequencias do atalho

## Conceito Base

Em vez de pensar apenas em `custo`, o jogo passa a ter dois eixos:

1. `Poder de Compra`
   - quanto o jogador pode gastar em cartas fortes no turno
   - comeca baixo ou zerado

2. `Divida Tecnica`
   - penalidade acumulada por usar cartas oportunistas
   - ajuda agora, machuca depois

O jogador nao escolhe so a melhor arquitetura.
Ele escolhe tambem o quanto quer se comprometer com gambiarra para sobreviver ao turno.

## Exemplo de fantasia

Carta: `Go Horse`

- efeito imediato:
  - `+3 Poder de Compra`
- efeito colateral:
  - `+2 Divida Tecnica`
  - `-1 Estabilidade`
  - `-1 Bonus final`

Leitura para o jogador:

- "Se eu jogar Go Horse, consigo bancar uma carta forte agora."
- "Mas vou piorar minha mesa e deixar a run mais perigosa."

Isso e facil de entender e gera tensao real.

## Modelo Recomendado

## Regra principal

Todo turno passa a mostrar:

- `Meta`
- `Bonus`
- `Poder disponivel`
- `Divida acumulada`

O fluxo vira:

1. O jogador comeca com pouco ou nenhum poder.
2. Algumas cartas ruins geram poder.
3. Cartas boas consomem poder.
4. O turno e validado considerando mesa, custo e consequencias.

## Tipos de carta

Separar cartas em 3 familias bem legiveis:

1. `Boost`
   - cartas ruins ou arriscadas
   - geram poder de compra
   - exemplos:
     - `Go Horse`
     - `Remendo em Producao`
     - `Banco Compartilhado`
     - `Deploy Manual`

2. `Core`
   - cartas de arquitetura boa
   - consomem poder
   - exemplos:
     - `Microsservicos`
     - `Mensageria`
     - `CQRS`
     - `Event Sourcing`

3. `Mitigacao`
   - cartas que limpam ou reduzem o estrago
   - exemplos:
     - `Observabilidade`
     - `Testes de Contrato`
     - `Feature Flag`
     - `Pipeline de Deploy`

Essa classificacao ajuda muito a ensinar o jogo.

## Recursos sugeridos

## Poder de Compra

- comeca em `0`
- algumas cartas geram poder
- cartas fortes gastam poder
- poder nao usado pode:
  - zerar no fim do turno
  - ou carregar parcialmente

Recomendacao inicial:

- poder zera a cada turno
- mais simples e facil de balancear

## Divida Tecnica

Funciona como a cicatriz das cartas ruins.

Pode impactar:

- limite de custo
- pontuacao final
- exigencia dos objetivos
- chance de eventos negativos
- vida ao fim do turno

Recomendacao inicial:

- `Divida Tecnica` global da run
- cada 3 pontos de divida:
  - `-1 vida maxima temporaria`
  - ou `-10% na pontuacao`

Mais simples ainda:

- cada ponto de divida tira pontos no fim do turno
- se a divida passar de um limite, perde 1 vida

## Exemplos de cartas novas

## Cartas arriscadas

### Go Horse

- `+3 Poder`
- `-1 Estabilidade`
- `+2 Divida`

### Banco Compartilhado

- `+2 Poder`
- `+1 Capacidade`
- `-2 Estabilidade`
- `+1 Divida`

### Deploy na Sexta

- `+2 Poder`
- `+1 Velocidade`
- `-2 Estabilidade`
- se falhar no turno: perde 1 vida extra

### Script Magico

- `+1 Poder`
- `+1 Velocidade`
- `+1 Divida`
- remove 1 ponto de bonus

## Cartas de mitigacao

### Observabilidade

- `-1 Divida`
- `+1 Estabilidade`

### Pipeline CI/CD

- `-1 risco de carta ruim`
- `+1 Velocidade`

### Testes Automatizados

- `-1 Divida`
- `+1 Estabilidade`
- `-1 Poder disponivel`

A mitigacao tambem e decisao: limpar bagunca ou empurrar mais poder para a mesa.

## Como manter isso simples de entender

A regra precisa caber na cabeca do jogador em poucos segundos.

## HUD recomendado

Sempre mostrar:

- `Meta atual`
- `Poder: 2/5`
- `Divida: 3`
- `Custo da mesa`

## Preview recomendado

Ao selecionar a carta:

- `Poder 1 -> 4`
- `Divida 2 -> 4`
- `Estabilidade 3 -> 2`
- `Agora da para jogar Microsservicos`

## Linguagem recomendada

Evitar termos muito abstratos.

Usar:

- `Poder`
- `Divida`
- `Risco`
- `Atalho`

Evitar:

- `economia sistêmica`
- `capacidade de budget operacional`

## Loop ideal

1. O objetivo pede uma mesa forte.
2. O jogador percebe que nao tem poder suficiente.
3. Usa uma carta ruim para destravar a jogada.
4. Monta a mesa forte.
5. Decide se aceita a divida ou tenta mitigar.
6. Fecha o turno e sofre ou colhe o resultado.

Isso cria historia por turno.

## Progressao recomendada

## Fase 1

Adicionar apenas:

- `Poder`
- 3 cartas ruins
- 2 cartas boas consumindo poder

Sem eventos, sem sistemas extras.

## Fase 2

Adicionar:

- `Divida Tecnica`
- 2 cartas de mitigacao
- penalidade simples de fim de turno

## Fase 3

Adicionar:

- objetivos que pedem jogar limpo
- objetivos que aceitam alto risco
- upgrades que mexem com risco versus poder

## Regras concretas para primeira implementacao

Para nao complicar demais, recomendo comecar assim:

1. Todo turno comeca com `Poder = 0`.
2. Cartas boas exigem `Poder` para serem jogadas.
3. Cartas ruins geram `Poder`.
4. Algumas cartas ruins tambem geram `Divida`.
5. No fim do turno:
   - sucesso da meta da pontos
   - cada `Divida` tira pontos
   - se `Divida >= 4`, perde 1 vida

Isso ja cria:

- tensao
- sacrificio
- leitura simples
- identidade propria

## Beneficios para o jogo

Esse sistema resolve varias coisas ao mesmo tempo:

1. As cartas ruins deixam de ser lixo e viram ferramenta.
2. O jogador precisa fazer escolhas moralmente feias para vencer.
3. O turno ganha uma narrativa forte.
4. O jogo fica mais viciante porque a decisao fica mais dramatica.
5. O jogo continua facil de entender porque a regra base e:
   - use cartas ruins para conseguir jogar cartas boas

## Riscos de design

## Se exagerar

- o jogo vira planilha
- o jogador sente punicao demais
- as cartas boas deixam de ser divertidas

## Como evitar

- poucas variaveis na tela
- no maximo 2 recursos novos: `Poder` e `Divida`
- cartas com texto curto
- preview sempre muito claro
- punicao progressiva, nao explosiva demais no inicio

## Recomendacao final

A melhor versao dessa ideia nao e transformar o jogo em um simulador complexo.
E transformar a gambiarra em recurso de jogo.

Frase central do design:

> Para fazer a arquitetura certa, as vezes voce precisa fazer a coisa errada primeiro.

Isso da identidade, humor e tensao ao ArchCard.

## Backlog tecnico sugerido

1. Criar recurso global `power`.
2. Criar recurso global `debt`.
3. Adicionar family/type nas cartas: `boost`, `core`, `mitigation`.
4. Bloquear jogada de cartas fortes sem poder suficiente.
5. Implementar 3 cartas ruins iniciais.
6. Mostrar `power` e `debt` no HUD.
7. Atualizar preview para mostrar impacto nesses recursos.
8. Penalizar `debt` no fechamento do turno.
9. Rebalancear score com essa nova economia.
10. Testar se o turno continua rapido e legivel.

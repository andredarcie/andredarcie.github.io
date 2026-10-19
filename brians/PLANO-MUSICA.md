# Plano: trilha sonora gerada por código

## Concluído (build 27)

A trilha gerada substituiu as originais:
- **Arquivos apagados:** as 83 músicas de `projeto/Audio/BGM`, `BGS` e `ME` (56,5 MB). Todas estão no `brians-legado.zip`, conferidas por nome e tamanho.
- **Sem volta ao original:** o `?musica=original` saiu. `web/musica.html` só toca as faixas novas.
- **Afinação:** `ferramentas/renderizar-musica.mjs` compara com as fichas salvas em `musica-fichas/<id>-p<pitch>.json` (os números e as notas da voz aguda das originais, no pitch do jogo).
- **Peso:**
  - O site serve 40,3 MB do jogo, contra 96,8 MB antes (−58%).
  - A música que um jogador baixava (26,4 MB) virou 54 KB de código.
- **Ajustes depois da escuta:**
  - O **ronco** virou ruído marrom largo; antes eram dois senos de 41 Hz, que não se ouviam em alto-falante pequeno.
  - A **fuga** perdeu os compassos de respiro e ganhou a escada com salto grande, o martelo de colcheias, a subida de meio tom a cada 4 compassos e o alarme final.

## Onde parei (2026-10-19, build 23)

- **A. Análise ✅**
  - `ferramentas/analisar-musica.py` gera a ficha (JSON) e três imagens: espectrograma, croma por batida e estrutura.
  - `--pitch` analisa no pitch do jogo, usando a taxa real do arquivo.
  - O trecho ampliado de espectrograma é o melhor "ouvido" para entender textura e articulação.
- **B. Motor ✅** — `web/src/musica/`:
  - **Síntese própria em JS:** amostra a amostra, com tabelas de onda, biquad, envelopes, glide e vibrato, sino aditivo, ruído, eco e Freeverb. A primeira versão com nós do WebAudio levava 15 s por faixa: o custo era a quantidade de nós.
  - **Cache de notas iguais:** cada nota diferente é gerada uma vez e depois só mixada.
  - **Render em pedaços:** com pausas via `MessageChannel`.
  - **Loop:** a cauda é dobrada sobre o começo; o volume é igualado pela mediana de RMS.
  - **Tempo de render:** mansão 0,7 s (3,3 s com CPU 4×) e caverna 0,3 s (0,6 s com CPU 4×).
  - **Integração:** catálogo em `audio.js`, com `?musica=original` para comparar; a música do título é pré-renderizada no boot, antes do "Jogar".
  - **Ferramentas:** `web/musica.html` (comparação A/B nos pitches do jogo), `ferramentas/renderizar-musica.mjs` (WAV + comparação) e `ferramentas/comparar-musica.py` (tabela de tolerâncias + n-gramas).
- **Escuta dos pilotos (2026-10-19):** o André achou "ainda muito diferente".
  - **Primeira escolha:** "base igual, melodia nova", ou seja, copiar acordes, baixo, ritmo e forma.
  - **Tentativa:** a transcrição por áudio (`ferramentas/transcrever-musica.py`, soma de harmônicos, média de ciclos e YIN no baixo) saiu instável demais para reproduzir a base com fidelidade.
  - **Decisão final do André:** seguir com o método de parâmetros, "menos trabalhoso".
  - **O que ficou da transcrição:** a caverna mudou para o universo de Fá menor com o cromatismo Si-Dó-Dó#, que a análise automática de tom tinha errado (dizia Lá menor).
- **D. Todas as faixas (build 24) ✅, faltando a escuta:**
  - **Kit:** `web/src/musica/kit.js` (marimba, celesta, pinçado, flauta, baixo, cordas, chip, metal e bateria) mais o atalho `frase()`.
  - **Faixas:** 02 a 10 compostas.
  - **Motivos em comum:** o chefe 2 reaproveita o motivo do chefe 1 em Sol menor; o final usa o desenho da caixinha da mansão.
  - **Comparação:**

    | Faixa | Dentro da tolerância |
    |---|---|
    | Noite | 13/13 |
    | Mansão a 100 | 12/13 |
    | Caverna | 11/13 |
    | Chefe 2, final | 10/13 |
    | Jardim (a 100), quartos, chefe 1, ronco | 9/13 |
    | Fuga | 8/13 |

  - **Desvios que sobram:** em geral densidade de ataques e faixa dinâmica.
  - **Render:** de 57 a 572 ms por faixa no PC; o cache guarda as 3 faixas mais recentes.
  - **No jogo:** todos os mapas tocam a faixa gerada (Os Quartos a 50, Os namorados a 65); o replay continua idêntico.
- **C. Pilotos ⏳ (falta a escuta do André)**:
  - **Mansão:** 12/13 a pitch 100 e 9/13 a pitch 50; a diferença maior é o brilho, mais escura que a original. Originalidade: 0–2% de n-gramas em comum.
  - **Caverna:** 12/13, também mais escura. Originalidade: 0%.
  - **Jogo:** o título, a Floresta e a Caverna já tocam as faixas novas; o replay `curto` continua idêntico.
- **Próximo:**
  1. Ouvir na página de comparação e ajustar o que o ouvido pedir.
  2. Faixas 2, 3 e 10.
  3. Chefe: faixas 6 e 7.
  4. Faixas 5, 8 e 9.
  5. Pré-render da música do próximo mapa (etapa E).

Trocar as músicas do jogo (MP3/OGG de terceiros, ~27 MB das que tocam) por
**músicas próprias do Brian's Mansion, geradas por código** no navegador.

Objetivo de fidelidade: ouvir a nova e lembrar da antiga, com o mesmo ritmo,
clima, textura e o mesmo lugar no jogo. Mas a música é outra: **nada de
transcrever melodia**. As originais são da Nintendo (Mario) e da PopCap
(Plants vs. Zombies). Copiar a melodia nota a nota seria a mesma música com
outro timbre. O que se copia são os **parâmetros musicais**: andamento,
tonalidade e modo, registro, densidade, groove, ritmo harmônico, timbres,
dinâmica, estrutura e loop. Melodia, harmonia e arranjo são compostos do zero
sobre esses parâmetros.

## 1. Inventário: o que de fato toca no jogo

Levantado de todos os mapas, eventos comuns e do `System.rvdata`. São 10
faixas: 8 BGMs e 2 BGSs. As outras 52 BGMs da pasta e as MEs nunca tocam.

| # | Faixa original | Onde toca | Pitch usado | Duração | Peso |
|---|---|---|---|---|---|
| 1 | `4-14 - Haunted House BGM` | **Título** (pitch 50), Floresta, Segunda Parte, Corredor | **50** e 100 | 1:45 | 1,6 MB |
| 2 | `PVZ_Soundtrack-Daytime_in_a_Front_Yard` | Primeira Parte, cena do Hall, **Os namorados (pitch 65)** | 100 e **65** | 4:51 | 5,7 MB |
| 3 | `PVZ_Soundtrack-Nighttime_at_the_Backyard` | Celas (1ª e 2ª parte) | 100 | 3:58 | 4,6 MB |
| 4 | `Super Mario World - Underground` | Caverna, Lugar secreto | 100 | 1:33 | 2,2 MB |
| 5 | `3-06-world-map-6-iced-land-` | **Os Quartos (pitch 50)** | **50** | 1:47 | 1,7 MB |
| 6 | `4-20 - Koopa Junior BGM` | Chefe, fase 1 | 100 | 1:07 | 1,0 MB |
| 7 | `PVZ_Soundtrack-Daytime_at_a_Back_Yard` | Chefe, fase 2 (pitch 95) | 95 | 3:27 | 4,0 MB |
| 8 | `PVZ_Soundtrack-The_Roof` | Final (Fine) | 100 | 4:47 | 5,6 MB |
| 9 | BGS `4-16 - Switch BGM` | Evento comum "Sistema de Fuga" (contagem da fuga) | 100 | 0:21 | 0,3 MB |
| 10 | BGS `Darkness` | Corredor (ambiente, com a BGM 1) | 100 | 0:12 | 0,1 MB |

**O pitch faz parte da memória do jogo.** O RGSS muda o pitch mudando a
velocidade: em 50, a música toca na metade da velocidade e uma oitava
abaixo. É assim que o título soa arrastado e assombrado, e Os Quartos soam
como uma caixinha de música lenta. A música gerada passa pelo mesmo caminho
(`playbackRate`) e **tem de soar bem nas duas velocidades em que é usada**.
Cada faixa é composta e conferida no pitch em que toca.

## 2. Ficha preliminar (medida, a confirmar na etapa A)

Medido com `numpy`/`scipy` sobre os arquivos (script de rascunho da sessão):

- **BPM:** autocorrelação do fluxo espectral; pode sair dobrado ou pela metade.
- **Tom:** croma com perfis de Krumhansl.
- **Timbre:** centroide espectral e partilha de graves (<250 Hz).
- **Dinâmica e textura:** ataques por segundo, correlação estéreo e semelhança entre começo e fim (loop).

| # | BPM | Tom | Notas fortes | Centroide | Graves | Ataques/s | Estéreo | Leitura |
|---|---|---|---|---|---|---|---|---|
| 1 | ~92 | Sol/Ré maior? (0,66) | Ré Dó Lá Sol Fá# | 524 Hz | 61% | 4,3 | 0,41 (largo) | grave, esparso, 30 dB de faixa dinâmica (silêncios); loop pouco óbvio (0,34) |
| 2 | ~118 | **Lá menor** (0,90) | Lá Mi Dó Fá Ré | 667 Hz | 23% | 2,5 | 0,91 | leve e saltitante, faixa dinâmica estável |
| 3 | ~74 (ou 147) | **Lá menor** (0,76) | Mi Lá Dó Fá Ré | 589 Hz | 17% | 2,9 | 0,95 | noturno, mesmo tom da 2, mais lento |
| 4 | ~118 | Lá menor? (0,63), muito cromático | Dó Lá Lá# Dó# Fá | **224 Hz** | **79%** | 5,1 | 0,30 | baixo andante e sincopado, quase só graves |
| 5 | ~99 | Sol (maior/menor, 0,49), cromático | Sol Sol# Fá Dó Si | 799 Hz | 59% | 4,4 | **1,0 (mono)** | chiptune mono; a pitch 50 vira caixinha lenta |
| 6 | ~99 | **Dó menor** (0,74) | Dó Sol Láb Fá Lá | 879 Hz | 16% | 3,7 | 0,82 | tensão de chefe, brilhante |
| 7 | ~108 | **Sol menor** (0,77) | Ré Sol Dó Sib Fá | 521 Hz | 10% | 3,6 | 0,97 | dançante e ameaçador; toca a 95 |
| 8 | ~81 (ou 161) | **Lá menor** (0,91) | Lá Mi Dó Ré Sol | 518 Hz | 5% | 3,9 | 0,97 | encerramento, médio-agudo, sem grave |
| 9 | ~161 | Láb? (0,47) | Láb Sol Dó Dó# Lá | 466 Hz | 23% | 6,3 | 0,46 | urgência, loop curto de 20 s, 69 dB de faixa (pulsos e silêncio) |
| 10 | — | — | — | **44 Hz** | **99%** | — | mono | ronco grave contínuo (drone) |

As medidas automáticas erram andamento por oitava e tom em música
cromática. A etapa A refaz tudo com mais cuidado e marca o que foi
conferido.

## 3. Arquitetura

### 3.1 Onde a música entra

O motor de áudio (`web/src/rgss/audio.js`) já trata BGM, BGS e ME: carrega o
arquivo, faz o loop, aplica pitch como `playbackRate`, faz fade e pausa a BGM
durante uma ME. A troca fica num ponto só:

```
audio.carregar(nome)  →  se nome está no catálogo de músicas geradas:
                            renderiza a música (OfflineAudioContext) → AudioBuffer
                         senão: baixa o arquivo como hoje (SEs continuam arquivos)
```

Os nomes não mudam. Os eventos do jogo continuam pedindo
`"4-14 - Haunted House BGM"`, e o catálogo associa esse nome à composição
nova. Assim:

- loop, fade, pitch, volume e ME funcionam sem mudança;
- os scripts e os mapas não são tocados;
- o rastro e os replays continuam idênticos, porque o rastro anota o
  **nome** do comando de áudio, não o som.

Renderizar offline para um buffer, em vez de tocar nota a nota em tempo
real, tem três vantagens:

- **loop sem emenda:** a cauda do reverb é dobrada sobre o começo do buffer;
- **pitch fiel:** igual ao RGSS, de graça;
- **nada roda por quadro:** só há custo uma vez, no carregamento, e zero
  durante o jogo. Isso conta no celular.

### 3.2 Módulos novos (`web/src/musica/`)

| Arquivo | O que faz |
|---|---|
| `sintese.js` | instrumentos: osciladores (pulso com largura variável, triângulo, serra, seno), FM simples (sinos, piano elétrico), cordas pinçadas (Karplus-Strong), ruído filtrado (percussão, vento, ronco), envelopes ADSR, vibrato e portamento |
| `efeitos.js` | reverb por convolução com impulso gerado por código (sala, corredor, caverna), eco, filtros, compressor e saturação leve |
| `partitura.js` | sequenciador: compasso, andamento, swing, padrões, notas por grau da escala, acordes por cifra, variações por seção (A/B/ponte), humanização determinística (semente fixa: a mesma música sempre sai igual) |
| `render.js` | `OfflineAudioContext` → `AudioBuffer`; dobra a cauda para o loop; cache por nome; pré-render em segundo plano |
| `catalogo.js` | nome do jogo → faixa |
| `faixas/*.js` | **uma composição por música**: só dados e pequenas funções (alguns KB cada) |

Meta de peso: **menos de 150 KB de código para as 10 faixas**, contra os
~27 MB de hoje.

### 3.3 Celular

- **Memória:** render em 32 kHz estéreo (BGM) e mono (BGS). Um loop de 90 s
  dá ~23 MB de float na memória; o cache guarda só a faixa atual e a
  próxima, e o resto é solto.
- **Quando renderizar:** o pré-render roda em `requestIdleCallback`. Dá para
  saber de antemão a música do próximo mapa (a `autoplay` dos mapas de
  destino dos teleportes, lida do `niveis.json`). A do título é renderizada
  antes do botão "Jogar".
- **Meta de tempo de render por faixa:** < 300 ms no PC e < 1,5 s com a CPU
  4× mais lenta, medido com `ferramentas/perfilar.mjs --cpu 4`.
- **Fallback:** se o render atrasar, a BGM entra com fade quando ficar
  pronta, sem travar o jogo.

## 4. Como cada música é feita (o método)

Para cada faixa, um ciclo fechado:

1. **Ficha da original** (`ferramentas/analisar-musica.py`; numpy e scipy já
   estão na máquina, e o librosa é opcional): gera um JSON com:
   - andamento e grade de batidas; compasso e swing (desvio das colcheias);
   - tom e modo, com a lista das notas fora da escala (o "sabor cromático");
   - **ritmo harmônico:** de quanto em quanto tempo o acorde muda (novidade do croma);
   - registro por camada: baixo, acompanhamento e melodia (energia por faixa de frequência);
   - **contorno e estatística da melodia, não as notas:** extensão, proporção grau conjunto × salto, notas por compasso, onde caem as notas longas;
   - famílias de timbre: pulso de chip, sino, pinçado, cordas, órgão, percussão, ruído (centroide, planicidade, harmônicos, ataque e decaimento);
   - densidade de ataques, faixa dinâmica e silêncios;
   - estéreo, reverb aparente (tempo de decaimento) e estrutura (matriz de autossimilaridade: A, B, A', ponte) com o ponto de loop.

   Também gera um espectrograma PNG e a estrutura desenhada, para ver.
2. **Briefing** (na própria `faixas/X.js`, como comentário curto): o que
   tem de lembrar a original, por exemplo "baixo andante cromático,
   percussão seca, cavernoso", e o que é novo (a melodia e a progressão).
3. **Composição:**
   - **Parâmetros:** andamento, tom, modo, compasso, swing, registro, timbres e densidade vêm da ficha.
   - **Material novo:** a progressão, a melodia, os motivos e os contracantos são criados para o Brian's Mansion. Um tema próprio curto pode atravessar várias faixas, como assinatura do jogo.
4. **Render e ficha da nova:** a mesma ferramenta analisa o WAV gerado (um
   Chromium headless exporta o buffer).
5. **Comparação automática** (`ferramentas/comparar-musica.mjs`): uma tabela
   da original × nova, com tolerâncias:
   - andamento ±2% (no pitch em que toca);
   - mesmo tom e modo;
   - centroide ±20%;
   - partilha de graves ±10 pontos;
   - ataques/s ±25%;
   - faixa dinâmica ±5 dB;
   - mesma correlação estéreo (mono continua mono);
   - **loop sem clique:** a diferença de amostra e de RMS na emenda abaixo de um limiar.
6. **Trava de originalidade:** extrair o contorno melódico das duas
   (rastreamento de altura) e medir a sobreposição de n-gramas de
   intervalos (4 a 6 notas). Precisa ficar abaixo de um limite baixo. Se a
   nova "copiou sem querer" uma frase reconhecível, reescreve.
7. **Escuta do André** na página de comparação (abaixo): o critério final é
   o ouvido dele, porque eu não ouço; as fichas são o meu ouvido. Cada faixa
   só é dada como pronta com o "ok, lembra a antiga e é outra" dele.

### Página de comparação (só localhost)

`web/musica.html`: lista as 10 faixas e mostra, para cada uma:

- a original e a nova, lado a lado;
- **nos pitches em que o jogo usa** (o título a 50, Os namorados a 65, Os Quartos a 50, o chefe a 95);
- a tabela da comparação e o espectrograma das duas;
- botões para tocar o loop na emenda e para trocar A/B na mesma posição.

## 5. Briefing de cada faixa

Os números saem da ficha. O que se busca **lembrar** está descrito pelo
clima e pela textura, nunca pela melodia.

1. **Mansão (Haunted House).** É a faixa mais ouvida: título, Floresta,
   Segunda Parte e Corredor. Grave, espaçada, com silêncios e bom estéreo,
   em torno de 92 BPM. Órgão ou pulso grave, baixo em ostinato e notas
   soltas no agudo com eco. **Teste crítico: soar ainda mais assombrada a
   pitch 50** (título). No Corredor toca junto do ronco da faixa 10: as duas
   precisam combinar no tom.
2. **Jardim de dia (Front Yard).** Exploração da Primeira Parte, Lá menor,
   ~118 BPM, saltitante e leve, pinçados e marimba, baixo em semínimas,
   percussão leve. A pitch 65 (Os namorados), vira uma valsa triste em
   câmera lenta; tem de funcionar assim também.
3. **Quintal à noite (Nighttime).** Celas, Lá menor (o mesmo tom da 2, que
   ajuda a parecer da mesma família), ~74 BPM, noturno, cordas e sinos
   suaves, menos ataques.
4. **Caverna (Underground).** Caverna e Lugar secreto, ~118 BPM, quase só
   graves (79%, centroide 224 Hz): baixo andante cromático e sincopado,
   percussão seca, eco de caverna. Pouca melodia; o groove do baixo é a
   música.
5. **Os Quartos (iced land).** Toca **só a pitch 50**. Chiptune mono, Sol
   com cromatismo, ~99 BPM na fonte. Compor pensando no resultado lento:
   uma caixinha de música mono e etérea.
6. **Chefe, fase 1 (Koopa Junior).** Dó menor, ~99 BPM, brilhante e tensa,
   baixo pulsante, ostinato no agudo, loop curto (~1 min).
7. **Chefe, fase 2 (Back Yard, pitch 95).** Sol menor, ~108 BPM (soa ~103),
   dançante e ameaçadora, a virada da luta. Deve parecer a fase 1 subindo
   um degrau: o mesmo motivo próprio, em outro arranjo.
8. **Final (The Roof).** Lá menor, ~81 BPM, médio-agudo, sem grave pesado,
   tom de despedida. Pode retomar o tema próprio da faixa 1 em maior, como
   fechamento.
9. **Fuga (Switch, BGS).** ~161 BPM, loop de 20 s, pulsos com silêncio entre
   eles (relógio e alarme), urgência. Curta e repetitiva de propósito.
10. **Ronco (Darkness, BGS).** Drone grave (~44 Hz), mono, contínuo:
    ruído filtrado com movimento lento. Afinado para não brigar com a
    faixa 1.

**Ordem sugerida:**

1. **Pilotos:** a 1 (é a mais ouvida e testa o pitch 50) e a 4 (testa o groove só de graves).
2. **Exploração:** a 2, a 3 e a 10.
3. **Chefe:** a 6 e a 7, juntas, pelo motivo comum.
4. **Restantes:** a 5, a 8 e a 9.

## 6. Etapas

| Etapa | Entrega | Pronto quando |
|---|---|---|
| A. Análise | `ferramentas/analisar-musica.py` + fichas e espectrogramas das 10 originais | a ficha revisada faixa a faixa (andamento e tom conferidos, sem erro de oitava) |
| B. Motor | `web/src/musica/` (síntese, efeitos, partitura, render, catálogo) + página `web/musica.html` | um loop de teste renderiza, faz o loop sem clique e toca no jogo com pitch e fade |
| C. Pilotos | faixas 1 e 4 | comparação dentro das tolerâncias, trava de originalidade ok, **aprovação do André ouvindo** (inclusive o título a pitch 50) |
| D. Restante | faixas 2, 3, 5, 6, 7, 8, 9, 10 | idem, faixa a faixa |
| E. Integração | catálogo ligado em `audio.js`, pré-render por mapa | jogo inteiro com música gerada; replays continuam idênticos; perfil no celular (CPU 4×) dentro da meta |
| F. Limpeza | remover os 10 arquivos usados **e** as 52 BGMs e MEs que nunca tocam; atualizar `arquivos.json` e o README | `Audio/BGM` e `Audio/BGS` vazios ou fora do projeto; as originais seguem no `brians-legado.zip` |

Um interruptor de segurança vale até a etapa F: `?musica=original` toca os
arquivos antigos, para comparar dentro do jogo.

## 7. Ganho esperado

| | Hoje | Depois |
|---|---|---|
| Música que toca | ~27 MB de MP3/OGG | ~150 KB de código |
| Pasta `Audio/BGM` + `BGS` | ~57 MB | 0 |
| Download para jogar | cada música baixada na hora em que toca | nada; render local (< 0,3 s no PC) |
| Direitos | músicas da Nintendo e da PopCap | trilha própria do Brian's Mansion |

## 8. Riscos e cuidados

- **Parecida demais × diferente demais.** Por isso há duas travas
  opostas: a ficha (tem de ficar perto) e o n-grama melódico (não pode
  copiar). E a palavra final é a escuta do André.
- **Pitch 50/65/95.** Toda faixa é ouvida e medida no pitch em que toca;
  o andamento-alvo da ficha é o efetivo (BPM × pitch/100).
- **Erros da análise automática** (oitava do BPM, tom de música
  cromática): a etapa A revisa à mão o que a ferramenta marcar como incerto.
- **Celular.** Render offline custa CPU e memória uma vez por faixa;
  medir com CPU 4× e manter o cache em duas faixas.
- **Determinismo.** A humanização usa semente fixa, e a mesma faixa sai
  sempre idêntica. Os replays não mudam de qualquer jeito, porque o rastro
  guarda o nome do áudio.
- **Eu não ouço.** As fichas e espectrogramas guiam a composição, mas o
  ajuste fino de "lembra a antiga" depende das rodadas de escuta do André.
  Por isso o plano prevê os pilotos antes do resto.

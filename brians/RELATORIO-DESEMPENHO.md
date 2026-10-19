# Relatório de desempenho: versão JavaScript (build 9, 2026-10-19)

> A coluna Ruby é histórica: medida antes de o Ruby sair do projeto (build 20).

## Como foi medido

- Profiler próprio, ligado com `?perfil` (`web/src/perfil.js`). Tem painel na tela (tecla P) e exporta para a IA ler:
  - `__perfil.relatorio()` devolve JSON;
  - `__perfil.markdown()` devolve Markdown.
- Ele mede cada quadro em fases (lógica do jogo, sync da fachada, desenho, espera) e conta:
  - chamadas de desenho, quads e trocas de estado;
  - envios de textura, com os bytes;
  - tempo por tipo de objeto e operações de bitmap;
  - imagens carregadas e áudio;
  - objetos de cena, bitmaps vivos, memória e tarefas longas;
  - tempo por mapa e os quadros mais pesados.
- Rodador: `node ferramentas/perfilar.mjs replay.json pasta [--tempo-real] [--gpu] [--cpu N]`.
  - Toca o replay só como entrada (`&semrastro`, sem os hashes do comparador).
  - Liga também o profiler de CPU do Chrome por CDP: funções, arquivos e chamadores.
  - `--cpu N` simula uma CPU N vezes mais lenta (celular).
- Máquina: GPU Intel Iris Xe (ANGLE/D3D11, a real, não emulada); Chromium do Playwright.
- Cenários:
  - `replays/curto.json` em tempo real;
  - `replays/passeio.json` (os 37 mapas, 18.973 quadros) em turbo, em tempo real com a CPU 4× mais lenta, e na versão Ruby para comparar.
- O próprio profiler custa ~0,1 ms por quadro (`performance.now`, séries). Os números incluem esse custo.

## Resultado

| | JS | Ruby |
|---|---|---|
| fps, tempo real (curto) | **58,1** | — |
| fps, tempo real, CPU 4× mais lenta (passeio) | **58,1** (0,4% dos quadros acima de 16,7 ms) | 51,9 (19% dos quadros acima de 16,7 ms; trabalho p95 25 ms) |
| trabalho por quadro, média (passeio, turbo) | **0,65 ms** | 2,21 ms |
| lógica do jogo, média / p95 | **0,29 / 0,8 ms** | 1,8 / 6 ms |
| desenho, média | 0,16 ms | 0,18 ms (mesmo motor) |
| memória JS (pico) | **40 MB** | 127 MB + 60 MB de wasm |
| chamadas de desenho / quads por quadro | 101 / 558 (p95 230 / 1.475) | igual |

- O jogo usa ~4% do orçamento de 16,7 ms por quadro. Com a CPU 4× mais lenta, sobe para 3,2 ms em média (p95 6 ms) e continua a 58 fps.
- Mapas mais pesados, com a CPU 4× mais lenta:
  - 26 (Lugar secreto): 6,6 ms, até 292 objetos de cena (partículas);
  - 11 (Primeira Parte): 6,1 ms;
  - 27 (Os Quartos): 5,4 ms.
- Em tempo normal, todos ficam abaixo de 2 ms.
- O problema não é o ritmo: são **picos isolados nas trocas de cena**. Quase todos os quadros acima de 16,7 ms (0,2–0,4%) caem aí.

## Onde o tempo vai (profiler de CPU e quadros mais pesados)

1. **`Bitmap#blur` na troca de cena: o maior problema.**
   - Números: 40 chamadas, 2,4 s no total, média 60 ms, máximo 260 ms. Com a CPU 4× mais lenta, o pior quadro chega a **1,2 s parado**.
   - Quem chama: `Scene_Base#snapshot_for_background`, no `terminate` do Scene_Map e do Scene_Title.
   - Por que é lento: o blur é um laço JS 3×3 por canal sobre `getImageData`/`putImageData`, 544×416×4×9 leituras.
   - No jogo real, isso acontece ao abrir a tela de save, ao morrer e voltar ao checkpoint, e ao sair do título.
2. **`capturar` (snap_to_bitmap): `readPixels` síncrono, ~22 ms por chamada (887 ms em 40).** Trava a CPU esperando a GPU, e é a mesma troca de cena.
3. **`Game_Character#object?` chamado a cada quadro, por personagem.**
   - Faz `@character_name[0, 1]`. O `rb.idx` de String (semântica de bytes do Ruby 1.8) roda `TextEncoder.encode` + spread + `TextDecoder` a cada chamada.
   - Custo: ~400 ms no passeio. É o maior custo da lógica.
4. **`Game_SelfSwitches#[]` com chave Array.**
   - O `RbHash` monta uma string de chave (`\0[...]`) a cada consulta. O `Game_Event#conditions_met?` faz isso em todo `refresh`, e o Mapa 11 dá refresh todo quadro.
   - Custo: ~140 ms.
5. **`Input.update`:** a entrada vem do motor como texto `"p,t,r,d4,d8"` e é lida com `split` + `rb.to_i` (regex). Custo: ~140 ms.
6. **Acessores da fachada e do RPG** (`rpg.js`, `basicos.js`, `cena.js`): montam a chave `` `_${nome}` `` / `` `$${nome}` `` em cada leitura e escrita. Custo: ~250 ms somados.
7. **Envio de texturas na troca de cena:** 2–16 envios, de 1,7 a 9,5 MB, num quadro. É a foto do fundo e o seu blur (884 KB cada), mais os tilesets do mapa novo.
8. **Primeiro quadro: 130 ms de lógica.** É o `load_database`, que lê todos os `.rvdata` pelo Marshal.
9. **Fora do jogo:** o selo de replay faz 633 layouts. Só existe no modo replay.

## Melhorias, por prioridade

Restrição: o jogo tem de continuar idêntico pixel a pixel e no rastro.

| # | Melhoria | Ganho esperado | Risco para a fidelidade |
|---|---|---|---|
| 1 | **Blur preguiçoso:** marca o bitmap como "a borrar" e só calcula quando alguém lê (desenho com textura, `get_pixel`, `blt`). A foto do fundo só é usada na tela de save. | acaba o pico de 60–260 ms (1,2 s em celular) na maioria das trocas | nenhum: mesmo resultado, só mais tarde |
| 2 | Blur mais rápido quando preciso: soma em caixa separável (horizontal + vertical, com os mesmos divisores nas bordas) ou um shader na GPU. | ~10× | baixo com a caixa separável; um shader exige conferir o arredondamento |
| 3 | **Captura sem travar:** `snap_to_bitmap` copia a tela para uma textura (GPU→GPU) e só faz `readPixels` se alguém ler os pixels. | –22 ms por troca de cena | nenhum |
| 4 | **`rb.idx` de String:** atalho quando o trecho até `i+n` é ASCII (o caso de `@character_name[0, 1]`), sem `TextEncoder`. | –400 ms no passeio (~25% da lógica) | nenhum: mesma semântica |
| 5 | **Chave do `RbHash` para Array:** cache por Array, ou chave numérica para `[map_id, event_id, letra]`. | –140 ms | nenhum |
| 6 | **Acessores com a chave pronta:** `const k = '_' + nome` fora do getter. | –200 ms | nenhum |
| 7 | **`Input.update` com números:** o motor entrega os 5 valores direto para a fachada JS, sem texto. | –130 ms | nenhum |
| 8 | Pré-carregar os tilesets (`TileA1`–`E`) e as imagens do próximo mapa enquanto o atual roda; manter as texturas entre mapas. | troca de mapa mais lisa | nenhum |
| 9 | Tilemap: montar a geometria das camadas uma vez por mapa (VBO estático, só a água animada muda) e agrupar por textura. | desenho 0,1 → ~0,03 ms; importa em GPU fraca | baixo (ordem de desenho entre camadas) |
| 10 | `load_database` mais rápido: guardar os `.rvdata` lidos (IndexedDB) ou ler mapa a mapa sob demanda. | –100 ms na abertura | nenhum |
| 11 | ✅ Feito no build 20: o Ruby saiu do projeto (sem ruby-wasm no `main.js`). | download e parse menores | nenhum |

Com 1, 3 e 4 resolvidos, o jogo fica sem nenhum pico perceptível mesmo em celular fraco, e a lógica cai uns 25%. O ritmo normal já é folgado: 4% do quadro em PC e ~20% com a CPU 4× mais lenta.

## Arquivos

- `web/src/perfil.js`: o profiler (`?perfil`).
- `ferramentas/perfilar.mjs`: rodador com profiler de CPU, `--gpu` e `--cpu N`.
- Os perfis brutos desta análise (JSON e MD por cenário) ficaram na pasta temporária da sessão. Para refazer:
  `node ferramentas/perfilar.mjs replays/passeio.json capturas/perfil --gpu [--tempo-real] [--cpu 4]`.

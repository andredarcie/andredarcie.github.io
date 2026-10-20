// Fases do seletor (só localhost, src/seletor-niveis.js): cada mapa do jogo na
// ordem de uma partida linear, entrando como se tivesse vindo jogando.
//
// Ir para a fase N:
//   1. partida nova (os objetos do jogo recriados, como "Novo jogo");
//   2. o estado da história até ali: as cenas únicas (eventos automáticos ou
//      paralelos que se desligam pelo interruptor local A ou que saem do mapa)
//      dos mapas das fases anteriores contam como vistas, e os eventos de
//      transição das fases anteriores como executados. Deles saem os
//      interruptores, as variáveis (operando constante), o tom da tela, a
//      música e a janela de variável ($wvar). Moedas, chaves e poções que o
//      jogador pegaria no caminho não entram;
//   3. o mapa de origem e o evento que de verdade leva à fase (porta,
//      teleporte ou o fim da cena anterior) rodando desde o começo, em
//      avanço rápido (src/ajustes.js), até o Brian chegar. O resto do
//      evento, a cena de entrada e os efeitos da fase seguem no tempo normal;
//   4. um checkpoint na chegada (morrer volta para o começo da fase).
import * as rb from 'rb';
import { avancarAte } from './ajustes.js';
import { dano } from './dano.js';
import { tutorial } from './tutoriais.js';

// [mapa, nome, origem: [mapa, evento, página]] na ordem da partida
export const FASES = [
  [5, 'Floresta', null],     // o jogo novo começa aqui (src/abertura.js)
  [6, 'Hall', [5, 4, 0]],
  [7, 'Buraco', [6, 7, 0]],
  [8, 'Lado Direito', [6, 12, 0]],
  [9, 'A mesa', [6, 14, 0]],
  [10, 'Dentro da Lareira', [9, 16, 0]],
  [11, 'Primeira Parte', [9, 19, 0]],
  [12, 'Lugar Escuro', [11, 38, 0]],
  [28, 'Corredor espinhos', [11, 12, 0]],
  [25, 'Segunda Parte', [28, 4, 0]],
  [26, 'Lugar secreto', [25, 38, 0]],
  [1, 'Caverna', [26, 206, 0]],
  [13, 'Sub-Caverna', [1, 86, 0]],
  [38, 'Corredor', [26, 1, 0]],
  [27, 'Os Quartos', [38, 2, 0]],
  [22, 'Pego', [27, 60, 0]],
  [21, 'Celas Primeira Parte', [22, 2, 0]],
  [15, 'Os namorados', [21, 9, 0]],
  [17, 'A morte', [15, 3, 0]],
  [16, 'O cemitério', [17, 2, 0]],
  [18, 'Fantasmas', [16, 2, 0]],
  [19, 'Prisão', [18, 7, 0]],
  [40, 'Celas Segunda Parte', [19, 3, 0]],
  [41, 'Preparando', [40, 6, 1]],
  [42, 'Hall Diferente', [41, 2, 0]],
  [43, 'Buraco (de novo)', [42, 7, 0]],
  [2, 'Corredor final', [43, 13, 0]],
  [44, 'Salvando', [2, 12, 0]],
  [29, 'Boss', [44, 4, 0]],
  [45, 'Fine', [29, 75, 1]],
  [47, 'Floresta (fim)', [45, 1, 0]],
  [46, 'Fim', [47, 3, 0]],
].map(([mapa, nome, origem]) => ({ mapa, nome, origem: origem && { mapa: origem[0], ev: origem[1], pagina: origem[2] } }));

const dadosMapa = (id) => load_data(rb.sprintf('Data/Map%03d.rvdata', id));
const lista = (o) => rb.idx(rb.idx(dadosMapa(o.mapa).events, o.ev).pages, o.pagina).list;

// cena única: automática ou paralela que se desliga (liga o próprio
// interruptor local), se apaga (214) ou sai do mapa (201)
const cenaUnica = (pagina) => (pagina.trigger === 3 || pagina.trigger === 4) && pagina.list.some((c) =>
  (c.code === 123 && rb.idx(c.parameters, 1) === 0) || c.code === 214 || c.code === 201);

// o que uma lista de comandos deixa no estado, em ordem (sem seguir os "se")
function aplicar(lista, mapa, ev, e) {
  for (const c of lista) {
    const p = c.parameters;
    switch (c.code) {
      case 121:
        for (let i = rb.idx(p, 0); i <= rb.idx(p, 1); i++) e.sw.set(i, rb.idx(p, 2) === 0);
        break;
      case 122: {
        if (rb.idx(p, 3) !== 0) break;  // operando constante só
        const v = rb.idx(p, 4);
        for (let i = rb.idx(p, 0); i <= rb.idx(p, 1); i++) {
          const a = e.vars.get(i) ?? 0;
          e.vars.set(i, [v, a + v, a - v, a * v, v ? Math.trunc(a / v) : a, v ? a % v : a][rb.idx(p, 2)]);
        }
        break;
      }
      case 123: e.self.set(`${mapa},${ev},${rb.str(rb.idx(p, 0))}`, rb.idx(p, 1) === 0); break;
      case 223: e.tom = rb.idx(p, 0); break;
      case 241: e.bgm = rb.idx(p, 0); break;
      case 355: {
        const s = rb.str(rb.idx(p, 0));
        if (s.includes('$wvar.show')) e.wvar = true;
        else if (s.includes('$wvar.hide')) e.wvar = false;
        break;
      }
    }
  }
}

// o estado da história ao começar a transição para a fase n
function estadoAte(n) {
  const e = { sw: new Map(), vars: new Map(), self: new Map(), tom: null, bgm: null, wvar: null };
  // as transições contam na vez delas (antes das cenas do mapa a que levam),
  // nunca como cena do mapa de onde saem
  const transicoes = new Set(FASES.filter((f) => f.origem).map((f) => `${f.origem.mapa},${f.origem.ev}`));
  const vistos = new Set();
  for (let k = 0; k < n; k++) {
    const f = FASES[k];
    if (f.origem) aplicar(lista(f.origem), f.origem.mapa, f.origem.ev, e);
    if (vistos.has(f.mapa)) continue;
    vistos.add(f.mapa);
    const mapa = dadosMapa(f.mapa);
    if (mapa.autoplay_bgm) e.bgm = mapa.bgm;
    for (const id of rb.keys(mapa.events)) {
      if (transicoes.has(`${f.mapa},${id}`)) continue;
      for (const pagina of rb.idx(mapa.events, id).pages) if (cenaUnica(pagina)) aplicar(pagina.list, f.mapa, id, e);
    }
  }
  return e;
}

// onde o Brian aparece ao chegar na fase k: o destino do "Transferir
// jogador" da transição, ou a posição inicial do jogo
function chegada(k) {
  const f = FASES[k];
  if (!f.origem) return { x: $data_system.start_x, y: $data_system.start_y, dir: 0 };
  const t = lista(f.origem).find((c) => c.code === 201 && rb.idx(c.parameters, 0) === 0 && rb.idx(c.parameters, 1) === f.mapa);
  return t && { x: rb.idx(t.parameters, 2), y: rb.idx(t.parameters, 3), dir: rb.idx(t.parameters, 4) };
}

// partida nova, como o "Novo jogo" do título (sem o fade)
async function partidaNova() {
  await Scene_Title.prototype.create_game_objects.call(null);
  $game_party.setup_starting_members();
}

// O pedido chega no meio de um Graphics.update de qualquer cena, às vezes
// dentro de uma cutscene (num fade de transferência, com mensagem ou cartão
// de tutorial na tela). Trocar os objetos do jogo ali deixava a cena antiga
// seguindo com o mapa novo, e a chegada nunca acontecia ("Indo para…"
// parado). Então o pedido só troca a cena: a atual termina do jeito dela,
// com os objetos dela, e a fase é montada no main da cena de troca.
export function irParaFase(n) {
  if (FASES[n]) $scene = { main: () => montarFase(n) };
}

async function montarFase(n) {
  const fase = FASES[n];
  tutorial.descartar();
  dano.descartar();
  RPG.BGM.stop(); RPG.BGS.stop();
  await partidaNova();
  if (!fase.origem) {   // a primeira fase é o começo do jogo
    await $game_map.setup($data_system.start_map_id);
    await $game_player.moveto($data_system.start_x, $data_system.start_y);
    $game_player.refresh();
    $game_map.autoplay();
    Graphics.brightness = 255;
    $scene = Scene_Map.new();
    return;
  }
  const e = estadoAte(n);
  for (const [i, v] of e.sw) rb.idxSet($game_switches, i, v);
  for (const [i, v] of e.vars) rb.idxSet($game_variables, i, v);
  for (const [k, v] of e.self) {
    const [m, ev, ch] = k.split(',');
    rb.idxSet($game_self_switches, [Number(m), Number(ev), ch], v);
  }
  if (e.wvar !== null) (e.wvar ? $wvar.show() : $wvar.hide());

  const o = fase.origem;
  await $game_map.setup(o.mapa);
  if (e.tom) $game_map.screen.start_tone_change(e.tom, 0);
  if (dadosMapa(o.mapa).autoplay_bgm) $game_map.autoplay();
  else if (e.bgm) e.bgm.play();
  // Onde o Brian fica: numa porta ou teleporte, no lugar do evento, virado
  // para onde o evento pede (condição "personagem olhando para", tipo 6);
  // numa cena automática ou paralela, onde ele chegou naquele mapa na
  // partida (no canto do evento, as rotas da cena esbarravam na borda e a
  // cena esperava para sempre)
  const ev = rb.idx($game_map.events, o.ev);
  const comandos = lista(o);
  const cena = [3, 4].includes(rb.idx(rb.idx(dadosMapa(o.mapa).events, o.ev).pages, o.pagina).trigger);
  let k = n - 1;
  while (k >= 0 && FASES[k].mapa !== o.mapa) k--;
  const lugar = cena && k >= 0 ? chegada(k) : null;
  const olhar = comandos.find((c) => c.code === 111 && rb.idx(c.parameters, 0) === 6 && rb.idx(c.parameters, 1) === -1);
  await $game_player.moveto(lugar ? lugar.x : ev.x, lugar ? lugar.y : ev.y);
  $game_player.set_direction(lugar?.dir || (olhar ? rb.idx(olhar.parameters, 2) : 2));
  $game_player.refresh();
  $game_map.interpreter.setup(comandos, o.ev);
  Graphics.brightness = 255;
  $scene = Scene_Map.new();
  // avanço rápido até o Brian chegar na fase; aí o checkpoint
  avancarAte(() => {
    const chegou = $game_map.map_id === fase.mapa && !$game_player.transfer_p() && rb.is_a($scene, Scene_Map);
    if (chegou) $game_checkpoint.create_ksch();
    return chegou;
  }, `Indo para ${fase.nome}…`);
}

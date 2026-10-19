// Ganchos do rastro e do seletor de fases: embrulham o Graphics.update da
// fachada, nesta ordem:
//   1. o estado do jogo deste quadro vai para o rastro;
//   2. o pedido do seletor de fases é aplicado;
//   3. o Graphics.update de verdade.
// Tem de ser ligado antes de os scripts carregarem.
//
// O estado: os objetos do save + $game_temp, a cena, frame_count, brightness
// e os globais dos scripts de terceiros, com os dados estáticos (mapa,
// passagens, evento, página, lista) trocados pelo hash do conteúdo.
import * as rb from './rb/rb.js';
import { dumpTodos } from './rb/marshal.js';
import { Hash } from './rastro.js';

const hashDe = (f) => { const h = new Hash(); f(h); return h.valor(); };

// ------------------------------------------------------------------ estado
function objetos() {
  return [$scene ? rb.classeDe($scene) : 'NilClass', Graphics.frame_count, Graphics.brightness,
    $game_temp, $game_system, $game_message, $game_switches, $game_variables,
    $game_self_switches, $game_actors, $game_party, $game_troop, $game_map,
    $game_player, $load_from_gameover, $tela_size_width, $tela_size_height];
}

// Objeto com Proc, Bitmap ou objeto de cena direto numa ivar vai como
// [classe, [[ivar, valor ou nome da classe], …]] (RGSSRastro.por_partes)
const naoSerializa = (x) => typeof x === 'function'
  || [Bitmap, Sprite, Plane, Window, Viewport, Tilemap].some((C) => x instanceof C);
const ivars = (o) => (o !== null && typeof o === 'object' && !Array.isArray(o) && !(o instanceof rb.RbHash)
  ? Object.keys(o).filter((k) => k.startsWith('_')) : []);
const porPartes = (o) => [rb.classeDe(o), ivars(o).map((k) => [`@${k.slice(1)}`, naoSerializa(o[k]) ? rb.classeDe(o[k]) : o[k]])];

function despejar(o) {
  if (ivars(o).some((k) => naoSerializa(o[k]))) return porPartes(o);
  try {
    dumpTodos([o], { identidade: false });   // o rescue TypeError do Ruby: algo mais fundo não serializa
    return o;
  } catch {
    return porPartes(o);
  }
}

// hash do conteúdo de um dado estático, recalculado só quando o objeto muda
const hashes = new WeakMap();
function hashConteudo(obj) {
  if (!hashes.has(obj)) hashes.set(obj, hashDe((h) => h.bytes(dumpTodos([obj], { identidade: false }))));
  return hashes.get(obj);
}

function semEstaticos(f) {
  const trocas = [];
  const trocar = (obj, ivar, valor) => {
    if (!Object.hasOwn(obj, ivar)) return;
    trocas.push([obj, ivar, obj[ivar]]);
    obj[ivar] = valor;
  };
  try {
    if ($game_map) {
      const mapa = $game_map._map, passagens = $game_map._passages;
      trocar($game_map, '_map', [rb.sym('mapa'), $game_map.map_id, mapa && hashConteudo(mapa)]);
      trocar($game_map, '_passages', [rb.sym('passagens'), passagens && hashConteudo(passagens)]);
      for (const ev of $game_map.events ? $game_map.events.values() : []) {
        const evento = ev._event, pagina = ev._page, lista = ev._list;
        trocar(ev, '_event', [rb.sym('evento'), evento && evento.id]);
        const indice = evento && pagina ? evento.pages.indexOf(pagina) : -1;
        trocar(ev, '_page', [rb.sym('pagina'), evento && pagina ? (indice < 0 ? null : indice) : (evento && pagina)]);
        if (pagina && lista === pagina.list) trocar(ev, '_list', [rb.sym('lista')]);
      }
    }
    return f();
  } finally {
    for (const [obj, ivar, valor] of trocas.reverse()) obj[ivar] = valor;
  }
}

function estado() {
  return semEstaticos(() => dumpTodos(objetos().map(despejar), { identidade: false }));
}

// ------------------------------------------------------------------ seletor de fases
// O mesmo que o "Novo jogo" do título faz, mas para qualquer mapa e sem
// esperar.
async function irParaNivel(seletor, mapa, x, y, dir) {
  if (!($game_map && $game_party && $game_player && $game_message)) {
    seletor.avisarNivel?.('Espere a tela de título carregar.');
    return;
  }
  if (rb.empty_p($game_party.members)) $game_party.setup_starting_members();
  $game_player._transferring = false; // cancela teleporte em andamento
  $game_map.interpreter.clear();
  $game_message.clear();
  $game_message.visible = false;
  $game_temp.next_scene = null;
  $game_map.screen.clear();
  await $game_map.setup(mapa);
  await $game_player.moveto(x, y);
  $game_player.set_direction(dir);
  $game_player.refresh();
  $game_map.autoplay();
  Graphics.brightness = 255;
  $scene = Scene_Map.new();
}

// Teste (replays): $game_variables[n] = v, como o comando "Variável" de evento
function mudarVariavel(n, v) {
  if (!($game_variables && $game_map)) return;
  rb.idxSet($game_variables, n, v);
  $game_map.need_refresh = true;
}

// ------------------------------------------------------------------ ligação
// rastro: o Rastro de src/rastro.js (ou null); seletor: o de
// src/seletor-niveis.js (ou null); detalhe: quadro em que o estado completo
// fica guardado para o comparador.
export function ligarRastroJs({ rastro, seletor, detalhe = -1 }) {
  const updateOriginal = Graphics.update;
  let mapaAvisado = null;

  // seletor de fases
  const comNiveis = !seletor ? updateOriginal : async function () {
    const pedido = String(seletor.pegarPedidoNivel() ?? '');
    if (pedido.startsWith('var,')) mudarVariavel(...pedido.split(',').slice(1, 3).map((n) => rb.to_i(n)));
    else if (pedido) await irParaNivel(seletor, ...pedido.split(',').map((n) => rb.to_i(n)));
    if ($game_map && $game_map.map_id !== mapaAvisado) {
      mapaAvisado = $game_map.map_id;
      seletor.avisarMapa?.(mapaAvisado);
    }
    return updateOriginal.call(this);
  };

  // rastro
  const comRastro = !rastro ? comNiveis : async function () {
    const parametros = new URLSearchParams(location.search);
    const coletar = !parametros.has('semestado') && !parametros.has('semrastro');
    const t0 = performance.now();
    if (coletar) {
      const bytes = estado();
      rastro.estado = hashDe((h) => h.bytes(bytes));
      rastro.tempos.js += performance.now() - t0;
      rastro.tempos.bytes += bytes.length;
      if (rastro.quadros.length === detalhe) rastro.estadoBase64 = bytes;
    } else rastro.estado = '';
    return comNiveis.call(this);
  };

  Graphics.update = comRastro;
}

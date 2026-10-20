// Boot do jogo: índice de arquivos → fonte → Data/ e saves em memória
// (rb/io.js) → clique (libera o áudio) → fachada RGSS2 ligada ao motor →
// ganchos de rastro e do seletor de fases → ajustes de jogabilidade → os
// scripts do jogo (jogo/) na ordem de _ordem.json; o Main roda o jogo com
// top-level await e só termina quando o jogo acaba.
// Modos: ?gravar, ?replay=<url> (&semtela, &detalhe=N, &tempo=real),
// seletor de fases e Tab em localhost; ?perfil liga o profiler (src/perfil.js).
import { carregarIndice, url } from './arquivos.js';
import { Renderizador } from './rgss/render.js';
import { Graficos } from './rgss/graficos.js';
import { Entrada } from './rgss/entrada.js';
import { Audio } from './rgss/audio.js';
import { criarApi } from './rgss/api.js';
import { cena } from './rgss/objetos.js';
import { LOCAL, ligarSeletorNiveis } from './seletor-niveis.js';
import { MODO, SEM_TELA, DETALHE, Rastro, baixar as baixarArquivo } from './rastro.js';
import * as rb from './rb/rb.js';
import { ligar } from './rgss2/rgss2.js';
import { ligarRastroJs } from './rastro-js.js';
import { faixaGerada, bufferDe } from './musica/catalogo.js';

const LARGURA = 544, ALTURA = 416;
// fetch é relativo à página (web/); import é relativo a este módulo (web/src/)
const JOGO = './jogo/';
const JOGO_IMPORT = '../jogo/';

export async function iniciar({ build, $, status, esperarClique, mensagem, mostrarAviso }) {
  status('carregando…');
  const lista = await carregarIndice(build);

  // Open Sans (48 KB, só latino): a interface da página e a reserva da Verdana
  // onde ela não existe (Android, Linux). O texto do jogo continua em Verdana.
  const fonte = new FontFace('Open Sans', `url("${url('Fonts/open-sans-latin.woff2')}")`, { weight: '300 800' });
  document.fonts.add(await fonte.load());

  const baixar = async (real) => {
    const r = await fetch(url(real));
    if (!r.ok) throw new Error(`não consegui baixar ${real} (${r.status})`);
    return new Uint8Array(await r.arrayBuffer());
  };
  const [ordem] = await Promise.all([
    fetch(`${JOGO}_ordem.json?v=${build}`).then((r) => r.json()),
    // gravar/replay começam limpos: só o ks_checkpoint do instalador, nada persistido
    rb.montarArquivos(lista, baixar, { persistidos: !MODO }),
  ]);

  // a música do título (gerada por código) já vai sendo renderizada enquanto
  // o botão Jogar espera o clique
  const titulo = faixaGerada('Audio/BGM/4-14 - Haunted House BGM');
  if (titulo) bufferDe(titulo);

  const renderizador = new Renderizador($('#tela'), LARGURA, ALTURA);
  const entrada = new Entrada();
  entrada.ligarControleVirtual($('#controle'));
  const audio = new Audio();

  status('');
  if (MODO !== 'replay') await esperarClique();
  audio.iniciar();

  let rastro = null;
  const graficos = new Graficos(renderizador, (n) => { if (rastro && n % 30 === 0) mostrarRastro(); });
  const mostrarRastro = () => {
    const selo = $('#rastro');
    selo.hidden = false;
    selo.textContent = MODO === 'gravar'
      ? `● gravando · ${rastro.entradas.length} entradas · semente ${rastro.semente}`
      : `▶ replay · quadro ${rastro.quadros.length} · entrada ${rastro.indice}/${rastro.entradas.length}${rastro.fim ? ` · ${rastro.fim}` : ''}`;
  };
  if (MODO) {
    rastro = new Rastro({ entrada, graficos, audio });
    if (MODO === 'replay') {
      await rastro.carregarReplay(new URLSearchParams(location.search).get('replay'));
      graficos.turbo = new URLSearchParams(location.search).get('tempo') !== 'real';
      graficos.semTela = SEM_TELA;
      rastro.aoParar = (motivo) => {
        mostrarRastro();
        mostrarAviso(`Replay parou (${motivo}) no quadro ${rastro.quadros.length}.`, true,
          () => baixarArquivo('rastro.json', rastro.resultado()), 'Baixar rastro');
      };
    } else {
      const botao = $('#baixar-replay');
      botao.hidden = false;
      botao.addEventListener('click', () => baixarArquivo(`replay-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`, rastro.arquivoReplay()));
    }
    rastro.iniciar();
  }
  window.__rastro = rastro;

  // seletor de fases: o modal em localhost; no replay, os pedidos gravados
  let seletor = LOCAL ? ligarSeletorNiveis({ entrada, graficos, build }) : null;
  if (rastro) {
    const pegar = seletor?.pegarPedidoNivel ?? (() => '');
    seletor = { ...seletor, pegarPedidoNivel: () => rastro.filtrarPedido(MODO === 'replay' ? '' : pegar()) };
  }

  // ?perfil: profiler (src/perfil.js), painel na tecla P
  const perfil = new URLSearchParams(location.search).has('perfil')
    ? (await import('./perfil.js')).instalarPerfil({ renderizador, graficos, audio, versao: 'js' }) : null;
  ligar(criarApi({ renderizador, graficos, entrada, audio, mensagem: MODO === 'replay' ? async () => {} : mensagem }));
  perfil?.instrumentarFachadaJs();
  ligarRastroJs({ rastro, seletor, detalhe: DETALHE });
  window.__brians = { js: true, graficos, renderizador, audio, entrada, cena, rb }; // depuração pelo console

  const fim = () => {
    if (MODO === 'replay') return rastro.parar('o jogo foi encerrado');
    mostrarAviso('O jogo foi encerrado.', true, () => location.reload(), 'Jogar de novo');
  };
  // ajustes de jogabilidade (src/ajustes.js): fora de gravar/replay, para os
  // replays seguirem o jogo original quadro a quadro; &original desliga
  const ajustes = !MODO && !new URLSearchParams(location.search).has('original');
  let script = '';
  try {
    for (const arquivo of ordem) {
      script = arquivo;
      if (ajustes && arquivo === ordem[ordem.length - 1]) {
        await (await import('./ajustes.js')).aplicarAjustes();
        // ?arena: arena de teste da visão dos inimigos (src/arena.js)
        if (new URLSearchParams(location.search).has('arena')) (await import('./arena.js')).ligarArena();
      }
      await import(`${JOGO_IMPORT}${arquivo}`);
    }
    fim();
  } catch (e) {
    if (e instanceof rb.SystemExit) { fim(); return; }
    console.error(e);
    // a primeira linha da pilha que é de um script do jogo (ou de onde parou)
    const linha = (e.stack ?? '').split('\n').find((l) => l.includes('/jogo/')) ?? '';
    const onde = /\/jogo\/([^?:]+)(?:\?[^:]*)?:(\d+)/.exec(linha);
    const cabecalho = onde ? `Script '${onde[1]}' linha ${onde[2]}` : `Script '${script}'`;
    const texto = `${cabecalho}: ${e.name ?? 'Error'} ocorreu.\n\n${e.message ?? e}`;
    if (MODO === 'replay') return rastro.parar(`erro: ${texto.replace(/\n+/g, ' ')}`);
    mostrarAviso(texto, true, () => location.reload(), 'Recomeçar');
  }
}

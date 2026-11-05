// Seletor de fases, só para desenvolvimento: em localhost, a tecla M abre um modal com cada fase do
// jogo, em ordem. Escolher uma recarrega a página no atalho ?mapa=... com o herói no ponto em que o
// jogador chega ali e com as flags, itens e variáveis de quem fez tudo o que vem antes (?semsalvar:
// não mexe no save de verdade). Em localhost o som (que é a M) passa para a tecla N. Fora de
// localhost nada disto existe.
import { entrada } from './base.js';

const LOCAL = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname);

// Cada fase soma ao estado das anteriores: f = flags novas, i = itens novos (id ou id:n),
// tira = itens que saem, zera = inventário vazio a partir dali, v = variáveis.
const PASSOS = [
  { cap: 'Porão' },
  { nome: 'Cela: o despertar', mapa: 'cela', x: 9, y: 7, dir: 'cima' },
  { nome: 'Duto', mapa: 'duto', x: 8, y: 6, dir: 'baixo', f: ['intro', 'tentouGrade', 'grito', 'viuRachadura'], i: ['cano'] },
  { nome: 'Quarto 2: a chave pequena', mapa: 'quarto2', x: 9, y: 5, dir: 'baixo' },
  { nome: 'Corredor', mapa: 'corredor', x: 21, y: 6, dir: 'baixo', f: ['pequena'], i: ['pequena'] },
  { nome: 'Quarto da caixa', mapa: 'quarto_caixa', x: 7, y: 6, dir: 'baixo' },
  { nome: 'Sala 14: o esconderijo', mapa: 'sala14', x: 7, y: 5, dir: 'baixo', f: ['caixa1', 'caixa2', 'ladrao', 'porta14'], i: ['chave14', 'ladrao'] },
  { cap: 'Flashback' },
  { nome: 'Quarto da filha', mapa: 'quarto_menino', x: 12, y: 11, dir: 'cima', cena: 'flashback', f: ['armario', 'monstro'], i: ['chave14'] },
  { nome: 'Hospital', mapa: 'hospital', x: 10, y: 9, dir: 'cima', cena: 'hospital' },
  { cap: 'De volta ao porão' },
  { nome: 'Corredor, depois do flashback', mapa: 'corredor', x: 41, y: 10, dir: 'cima', f: ['flashback'] },
  { nome: 'Banheiro: o espelho', mapa: 'banheiro', x: 7, y: 9, dir: 'cima' },
  { nome: 'Sala das lâmpadas: o código', mapa: 'sala_lampadas', x: 10, y: 6, dir: 'esquerda', f: ['banheiro'] },
  { nome: 'Salão', mapa: 'salao', x: 33, y: 13, dir: 'cima', f: ['escada'] },
  { nome: 'Salão: o portão dos canos', mapa: 'salao', x: 8, y: 9, dir: 'cima' },
  { nome: 'Corredor dos pilares', mapa: 'pilares', x: 48, y: 8, dir: 'esquerda', f: ['portaoCanos'] },
  { nome: 'Celas', mapa: 'celas', x: 13, y: 7, dir: 'esquerda', f: ['pilares'] },
  { nome: 'Sala das armadilhas', mapa: 'armadilhas', x: 14, y: 7, dir: 'esquerda' },
  { nome: 'Celas: a voz', mapa: 'celas', x: 3, y: 7, dir: 'direita', f: ['armadilhas', 'bronze'], i: ['bronze'] },
  { nome: 'Pilares: a porta de bronze', mapa: 'pilares', x: 4, y: 8, dir: 'direita', f: ['voz'] },
  { nome: 'Quarto da rachadura', mapa: 'quarto_rachadura', x: 7, y: 9, dir: 'cima', f: ['bronzeUsada'], tira: ['bronze'] },
  { nome: 'Sala do enigma', mapa: 'sala_enigma', x: 8, y: 8, dir: 'cima' },
  { cap: 'Algum tempo depois' },
  { nome: 'Descanso', mapa: 'descanso', x: 9, y: 7, dir: 'baixo', zera: true },
  { nome: 'Sala giratória', mapa: 'giratoria', x: 9, y: 7, dir: 'cima', f: ['descanso'], v: { giro: 0 } },
  { nome: 'Quarto do urso', mapa: 'quarto_urso', x: 12, y: 6, dir: 'baixo', v: { giro: 3 } },
  { nome: 'Corredor final', mapa: 'corredor_final', x: 8, y: 52, dir: 'cima', f: ['urso'] },
  { nome: 'Corredor final: na porta, com a chave', mapa: 'corredor_final', x: 8, y: 5, dir: 'cima', f: ['chaveFim'], i: ['chave'] },
  { cap: 'O fim' },
  { nome: 'Sala do piano', mapa: 'sala_piano', x: 14, y: 8, dir: 'esquerda', f: ['portaFinal'], tira: ['chave'] },
  { nome: 'Sala do piano: na caixinha de música', mapa: 'sala_piano', x: 5, y: 9, dir: 'baixo', f: ['salaPiano', 'carta'] },
  { nome: 'Sala do piano: um passo antes do teclado', mapa: 'sala_piano', x: 9, y: 9, dir: 'cima', f: ['caixinha'] },
  { nome: 'Final: a guilhotina e "The End"', mapa: 'guilhotina', x: 7, y: 10, dir: 'cima', f: ['piano'], cena: 'fim' },
];

// Acumula o estado e monta a URL de cada fase.
function montarFases() {
  const flags = new Set(), itens = new Map(), vars = {};
  const fases = [];
  for (const p of PASSOS) {
    if (p.cap) { fases.push({ cap: p.cap }); continue; }
    if (p.zera) itens.clear();
    for (const f of p.f || []) flags.add(f);
    for (const i of p.i || []) itens.set(i, (itens.get(i) || 0) + 1);
    for (const i of p.tira || []) itens.delete(i);
    Object.assign(vars, p.v || {});
    const q = new URLSearchParams({ mapa: p.mapa, x: p.x, y: p.y, dir: p.dir });
    if (flags.size) q.set('flags', [...flags].join(','));
    if (itens.size) q.set('itens', [...itens].map(([id, n]) => (n > 1 ? `${id}:${n}` : id)).join(','));
    const vs = Object.entries(vars);
    if (vs.length) q.set('vars', vs.map(([k, n]) => `${k}:${n}`).join(','));
    if (p.cena) q.set('cena', p.cena);
    q.set('semsalvar', '');
    fases.push({ nome: p.nome, mapa: p.mapa, url: '?' + q.toString().replace(/=(&|$)/g, '$1') });
  }
  return fases;
}

const CSS = `
#dev-fases { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.72); font: 14px "Courier New", Courier, monospace; color: #bbb; }
#dev-fases .caixa { width: min(460px, 92vw); max-height: 86vh; display: flex; flex-direction: column;
  background: #111; border: 1px solid #444; box-shadow: 0 0 0 4px #000, 0 10px 40px #000; }
#dev-fases h2 { margin: 0; padding: 10px 14px; font-size: 14px; font-weight: bold; color: #ddd;
  border-bottom: 1px solid #333; letter-spacing: .08em; }
#dev-fases ol { list-style: none; margin: 0; padding: 6px 0; overflow-y: auto; }
#dev-fases .cap { padding: 10px 14px 4px; color: #a04848; font-size: 12px; text-transform: uppercase; letter-spacing: .1em; }
#dev-fases .fase { padding: 5px 14px 5px 24px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#dev-fases .fase .n { color: #555; display: inline-block; width: 2.4em; }
#dev-fases .fase.aqui { color: #eee; }
#dev-fases .fase.aqui::after { content: "  (aqui)"; color: #666; }
#dev-fases .fase.sel { background: #2a2a2a; color: #fff; }
#dev-fases .fase.sel .n { color: #a04848; }
#dev-fases p { margin: 0; padding: 8px 14px; border-top: 1px solid #333; color: #666; font-size: 12px; }
`;

export function ligarSeletorDeFases(mapaAtual) {
  if (!LOCAL) return;
  const fases = montarFases();
  const itensFase = fases.filter((f) => !f.cap);
  let el = null, sel = 0;

  function abrir() {
    if (!document.getElementById('dev-fases-css')) {
      const st = document.createElement('style'); st.id = 'dev-fases-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    el = document.createElement('div');
    el.id = 'dev-fases';
    const atual = mapaAtual();
    let n = 0, html = '<div class="caixa"><h2>FASES (dev)</h2><ol>';
    for (const f of fases) {
      if (f.cap) { html += `<li class="cap">${f.cap}</li>`; continue; }
      html += `<li class="fase${f.mapa === atual ? ' aqui' : ''}" data-i="${n}"><span class="n">${String(n + 1).padStart(2, '0')}</span>${f.nome}</li>`;
      n++;
    }
    html += '</ol><p>↑↓ escolher · Enter ir · Esc ou M fechar · N: som (localhost)</p></div>';
    el.innerHTML = html;
    // começa na última fase do mapa atual (ou na primeira)
    const aqui = itensFase.map((f, i) => (f.mapa === atual ? i : -1)).filter((i) => i >= 0);
    sel = aqui.length ? aqui[aqui.length - 1] : 0;
    el.addEventListener('click', (e) => {
      const li = e.target.closest('.fase');
      if (li) ir(+li.dataset.i);
      else if (!e.target.closest('.caixa')) fechar();
    });
    el.addEventListener('mousemove', (e) => {
      const li = e.target.closest('.fase');
      if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; marcar(false); }
    });
    document.body.appendChild(el);
    entrada.seguro.clear();
    marcar(true);
  }
  function fechar() { el?.remove(); el = null; entrada.seguro.clear(); }
  function marcar(rolar) {
    el.querySelectorAll('.fase').forEach((li) => li.classList.toggle('sel', +li.dataset.i === sel));
    if (rolar) el.querySelector('.fase.sel')?.scrollIntoView({ block: 'nearest' });
  }
  function ir(i) { location.href = location.pathname + itensFase[i].url; }

  // Captura antes da Entrada do jogo: com o modal aberto, o jogo não recebe nenhuma tecla.
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!el) {
      if (e.code === 'KeyM') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) abrir(); return; }
      if (e.code === 'KeyN') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) entrada.pressionar('mudo'); }
      return;
    }
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { sel = (sel + 1) % itensFase.length; marcar(true); }
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') { sel = (sel + itensFase.length - 1) % itensFase.length; marcar(true); }
    else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') ir(sel);
    else if (e.code === 'Escape' || (e.code === 'KeyM' && !e.repeat)) fechar();
  }, { capture: true });
  addEventListener('keyup', (e) => {
    if (e.code === 'KeyN') entrada.soltar('mudo');
    if (el) e.stopImmediatePropagation();
  }, { capture: true });
}

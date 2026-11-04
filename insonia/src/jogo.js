// O jogo: mapa atual, herói, eventos, câmera, luz e efeitos de tela, e a camada de interface.
import { LARG, ALT, T, DIRS, OPOSTA, entrada, quadros, tickEsperas } from './base.js';
import { tela } from './recursos.js';
import { Mapa } from './mapa.js';
import { Personagem, aplicarTom } from './personagem.js';
import { Mensagem } from './mensagem.js';
import { Inventario, Aviso, TecladoNome, fundoBorrado } from './menus.js';
import { texto, FONTE_NARRACAO } from './janela.js';
import { ITENS } from './itens.js';
import { MAPAS } from './mapas/index.js';
import { HISTORIA, ligarHistoria } from './historia.js';
import { som } from './som.js';
import { img } from './recursos.js';

export const HEROI = { folha: 'chars/m03a', tipo: 'mack', idx: 2 };

export class Evento extends Personagem {
  constructor(def) {
    super(def.x, def.y, def.grafico || null, def.dir || 'baixo');
    this.def = def;
    this.id = def.id;
    if (def.prioridade !== undefined) this.prioridade = def.prioridade;
    else this.prioridade = def.grafico ? 1 : 0;
    if (def.vel) this.vel = def.vel;
    if (def.oculto) this.visivel = false;
    if (def.dy) this.dy = def.dy;
    if (def.dx) this.dx = def.dx;
  }
  get ativo() { return !this.def.cond || this.def.cond(); }
}

export class Jogo {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.g.imageSmoothingEnabled = false;
    this.cena = tela(LARG, ALT);       // mapa + personagens (antes da luz)
    this.luzC = tela(LARG, ALT);       // mapa de luz
    this.flags = {};
    this.vars = {};
    this.itens = [];
    this.msg = new Mensagem();
    this.inv = new Inventario(this);
    this.aviso = new Aviso();
    this.teclado = new TecladoNome();
    this.rodando = 0;
    this.brilho = 1; this.alvoBrilho = 1; this.passoBrilho = 0;
    this.flash = 0; this.tremor = 0;
    this.figura = null;    // imagem de tela cheia (a carta)
    this.narracao = null;  // texto centralizado em fonte serifada
    this.lanterna = null;
    this.t = 0;
    this.heroi = new Personagem(0, 0, HEROI, 'baixo');
    this.paralelos = [];
    ligarHistoria(this);
  }

  // ---------------- itens ----------------
  temItem(id) { return this.itens.some((i) => i.id === id && i.n > 0); }
  async ganhar(id, aviso = true) {
    const e = this.itens.find((i) => i.id === id);
    if (e) e.n++; else this.itens.push({ id, n: 1 });
    const ordem = Object.keys(ITENS);
    this.itens.sort((a, b) => ordem.indexOf(a.id) - ordem.indexOf(b.id));
    if (aviso) await this.aviso.mostrar(`${ITENS[id].nome} Adicionado.`.replace('. Adicionado', ' Adicionado'), ITENS[id].icone);
  }
  perder(id) { const e = this.itens.find((i) => i.id === id); if (e) e.n = Math.max(0, e.n - 1); this.itens = this.itens.filter((i) => i.n > 0); }

  // ---------------- mapas ----------------
  carregar(id, x, y, dir) {
    const def = MAPAS[id];
    if (!def) throw new Error('mapa? ' + id);
    this.mapaId = id;
    this.def = def;
    this.mapa = new Mapa(def);
    this.tom = def.tom || 0;
    aplicarTom(this.mapa.baixo.getContext('2d'), this.mapa.baixo.width, this.mapa.baixo.height, this.tom);
    aplicarTom(this.mapa.cima.getContext('2d'), this.mapa.cima.width, this.mapa.cima.height, this.tom);
    this.heroi.x = x; this.heroi.y = y; this.heroi.rx = x * T; this.heroi.ry = y * T;
    if (dir) this.heroi.dir = dir;
    this.heroi.visivel = true;
    this.encostado = null;
    this.ultimoTile = x + ',' + y;
    const h = HISTORIA[id] || {};
    this.eventos = (h.eventos || []).map((d) => new Evento(d));
    this.luzes = (def.luzes || []).map((l) => ({ ...l }));
    this.lanterna = def.lanterna || null;
    this.paralelos = [];
    this.amb = def.amb ?? 1;
    this.vinheta = def.vinheta || 0;
    this.extra = h;
    this.heroi._movia = false;
    som.mapa(id);
    this.salvar();
    if (h.aoEntrar) this.executar(() => h.aoEntrar(this));
  }

  async transferir(id, x, y, dir, { fade = true } = {}) {
    if (fade) await this.apagar(18);
    this.carregar(id, x, y, dir);
    if (fade) await this.acender(18);
  }

  evento(id) { return this.eventos.find((e) => e.id === id); }

  livre(x, y, quem) {
    if (!this.mapa.podePassar(x, y)) return false;
    for (const e of this.eventos) {
      if (e === quem || !e.ativo || e.prioridade !== 1 || e.def.passavel) continue;
      if (e.x === x && e.y === y && (e.grafico || e.def.solido)) return false;
    }
    if (quem !== this.heroi && this.heroi.x === x && this.heroi.y === y && this.heroi.visivel) return false;
    return true;
  }

  // ---------------- roteiro ----------------
  async executar(fn) {
    this.rodando++;
    try { await fn(); } catch (e) { console.error(e); }
    this.rodando--;
  }

  msgTexto(s, op) { return this.msg.mostrar(s, op); }
  // Atalhos usados pela história: fala('texto') usa a posição do meio, como no jogo.
  fala(s, pos = 'meio') { return this.msg.mostrar(s, { pos }); }
  escolha(pergunta, opcoes, pos = 'baixo', op = {}) { return this.msg.escolha(pergunta, opcoes, { pos, ...op }); }
  numero(pergunta, dig, inicial = 0, pos = 'meio') { return this.msg.numero(pergunta, dig, inicial, { pos }); }
  esperar(n) { return quadros(n); }

  apagar(n = 30) { return this.fadeAte(0, n); }
  acender(n = 30) { return this.fadeAte(1, n); }
  async fadeAte(alvo, n) {
    this.alvoBrilho = alvo; this.passoBrilho = Math.abs(alvo - this.brilho) / Math.max(1, n);
    if (n <= 0) this.brilho = alvo;
    while (this.brilho !== this.alvoBrilho) await quadros(1);
  }

  async mostrarFigura(nome, n = 20) {
    this.figura = { nome, op: 0 };
    for (let i = 1; i <= n; i++) { this.figura.op = i / n; await quadros(1); }
  }
  async tirarFigura(n = 20) {
    if (!this.figura) return;
    for (let i = n - 1; i >= 0; i--) { this.figura.op = i / n; await quadros(1); }
    this.figura = null;
  }

  async narrar(s, quadrosNaTela = 180, y = null) {
    this.narracao = { s, op: 0, y };
    for (let i = 1; i <= 30; i++) { this.narracao.op = i / 30; await quadros(1); }
    let n = 0;
    while (n < quadrosNaTela && !(n > 30 && entrada.disparou('ok'))) { n++; await quadros(1); }
    for (let i = 29; i >= 0; i--) { this.narracao.op = i / 30; await quadros(1); }
    this.narracao = null;
  }

  async abrirInventario() {
    const r = await this.inv.abrir(fundoBorrado(this.canvas));
    return r;
  }

  async digitarNome(max = 12) {
    return this.teclado.abrir(fundoBorrado(this.canvas), max);
  }

  // ---------------- quadro a quadro ----------------
  atualizar() {
    this.t++;
    tickEsperas();
    // fade
    if (this.brilho !== this.alvoBrilho) {
      if (this.brilho < this.alvoBrilho) this.brilho = Math.min(this.alvoBrilho, this.brilho + this.passoBrilho);
      else this.brilho = Math.max(this.alvoBrilho, this.brilho - this.passoBrilho);
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - 0.04);
    if (this.tremor > 0) this.tremor--;
    if (this.inv.ativo) { this.inv.atualizar(); entrada.fimDoQuadro(); return; }
    if (this.teclado.ativo) { this.teclado.atualizar(); entrada.fimDoQuadro(); return; }
    if (this.overlay && !this.msg.aberta) { this.overlay.atualizar(this); entrada.fimDoQuadro(); return; }
    this.msg.atualizar();
    this.aviso.atualizar();
    for (const p of this.paralelos) p(this);
    this.extra?.porQuadro?.(this);
    if (this.mapa) {
      this.heroi.atualizar();
      for (const e of this.eventos) e.atualizar();
      this.sonsDePasso();
      if (!this.rodando && !this.msg.aberta && !this.aviso.atual) this.controlarHeroi();
    }
    entrada.fimDoQuadro();
  }

  // Um passo por tile, no piso de destino. Os dos outros personagens soam do lado em que
  // estão na tela e mais abafados quanto mais longe (pesado: o monstro arrastando os pés).
  sonsDePasso() {
    const h = this.heroi;
    const piso = (x, y) => som.superficie(this.mapa.specChao(x, y)?.nome, this.mapaId);
    if (h.movendo && !h._movia && h.visivel) som.passo(piso(h.x, h.y), { vol: 0.5 });
    h._movia = h.movendo;
    let ox = null, oy = null;
    for (const e of this.eventos) {
      const m = e.movendo;
      if (m && !e._movia && e.visivel && e.opac > 0 && e.grafico && !e.grafico.tile && !e.grafico.objeto && e.def.passos !== false) {
        if (ox === null) { const [cx, cy] = this.camera(); ox = (cx + LARG / 2) / T; oy = (cy + ALT / 2) / T; }
        const dx = e.x + 0.5 - ox, dy = e.y + 0.5 - oy;
        som.passo(piso(e.x, e.y), { pan: Math.max(-0.9, Math.min(0.9, dx / 8)), dist: Math.min(0.75, Math.hypot(dx, dy) / 12), vol: 0.45, pesado: !!e.def.pesado });
      }
      e._movia = m;
    }
  }

  controlarHeroi() {
    const h = this.heroi;
    if (h.movendo) return;
    // eventos automáticos
    for (const e of this.eventos) {
      if (e.ativo && e.def.gatilho === 'auto') { this.executar(() => e.def.rodar(this, e)); return; }
    }
    if (entrada.disparou('inventario')) { this.executar(() => this.usarMenu()); return; }
    if (entrada.disparou('ok')) {
      const [fx, fy] = h.frente();
      const alvo = this.eventos.find((e) => e.ativo && e.def.rodar && e.def.gatilho !== 'toque' && e.def.gatilho !== 'auto' &&
        ((e.x === fx && e.y === fy && e.prioridade === 1) || (e.x === h.x && e.y === h.y && e.prioridade !== 1) || (e.x === fx && e.y === fy && e.def.alcance)));
      if (alvo) {
        if (alvo.grafico && alvo.def.virar !== false && !alvo.fixoDir) alvo.virar(OPOSTA[h.dir]);
        this.executar(() => alvo.def.rodar(this, alvo));
        return;
      }
    }
    const d = entrada.dir4();
    if (d) {
      const ok = h.passo(d, this);
      if (!ok) {
        // encostar num evento de toque (ex.: porta): dispara ao apertar a direção ou ao chegar
        // andando nele com a tecla segurada; não repete enquanto ele continuar encostado
        const [fx, fy] = h.frente();
        const e = this.eventos.find((e) => e.ativo && e.def.gatilho === 'toque' && e.x === fx && e.y === fy && e.prioridade === 1);
        if (e && (entrada.disparou(d) || this.encostado !== e)) { this.encostado = e; this.executar(() => e.def.rodar(this, e)); }
      } else {
        this.encostado = null;
        this.aoChegar = true;
      }
    } else if (this.aoChegar) {
      this.aoChegar = false;
    }
    // toque ao chegar num tile
    if (!h.movendo && this.ultimoTile !== h.x + ',' + h.y) {
      this.ultimoTile = h.x + ',' + h.y;
      const e = this.eventos.find((e) => e.ativo && e.def.gatilho === 'toque' && e.x === h.x && e.y === h.y && e.prioridade !== 1);
      if (e) this.executar(() => e.def.rodar(this, e));
    }
  }

  async usarMenu() {
    const r = await this.abrirInventario();
    if (!r) return;
    const nome = ITENS[r.item].nome;
    if (r.acao === 'analisar') { await this.fala(`${nome} - ${ITENS[r.item].desc}`); return; }
    if (r.acao === 'descartar') {
      const s = await this.escolha(`Deseja descartar ${nome.toLowerCase().replace(/\.$/, '')}?`, ['Sim', '\\c[2]Não'], 'meio');
      if (s === 0) this.perder(r.item);
      return;
    }
    // usar: procura quem aceita o item na frente do herói (ou embaixo)
    const [fx, fy] = this.heroi.frente();
    const alvo = this.eventos.find((e) => e.ativo && e.def.usar && ((e.x === fx && e.y === fy) || (e.x === this.heroi.x && e.y === this.heroi.y)));
    if (alvo) { const feito = await alvo.def.usar(this, r.item, alvo); if (feito !== false) return; }
    await this.fala('Não posso usar isso aqui.');
  }

  // ---------------- câmera ----------------
  camera() {
    const W = this.mapa.w * T, H = this.mapa.h * T;
    let cx, cy;
    if (W <= LARG) cx = (W - LARG) / 2; else cx = Math.max(0, Math.min(W - LARG, this.heroi.rx + T / 2 - LARG / 2));
    if (H <= ALT) cy = (H - ALT) / 2; else cy = Math.max(0, Math.min(H - ALT, this.heroi.ry + T / 2 - ALT / 2));
    if (this.def.camera) { const c = this.def.camera(this, cx, cy); cx = c[0]; cy = c[1]; }
    return [Math.round(cx), Math.round(cy)];
  }

  // ---------------- desenho ----------------
  desenhar() {
    const g = this.g;
    g.fillStyle = '#000';
    g.fillRect(0, 0, LARG, ALT);
    if (this.inv.ativo) { this.inv.desenhar(g); return; }
    if (this.teclado.ativo) { this.teclado.desenhar(g); return; }
    if (this.mapa) {
      let [cx, cy] = this.camera();
      if (this.tremor) cx += ((this.t * 7) % 5) - 2;
      const c = this.cena.getContext('2d');
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#000'; c.fillRect(0, 0, LARG, ALT);
      c.drawImage(this.mapa.baixo, -cx, -cy);
      // objetos de evento abaixo do herói fazem parte do cenário (recebem a luz do mapa)
      for (const e of this.eventos) if (e.ativo && e.prioridade === 0 && !e.def.brilha) e.desenhar(c, cx, cy, this.tom);
      this.aplicarLuz(c, cx, cy, false);
      // personagens: no jogo original eles ficam bem mais visíveis que o cenário
      const tc = this.def.tomPersonagem ?? this.tom;
      const ps = [...this.eventos.filter((e) => e.ativo && e.prioridade === 1), this.heroi].sort((a, b) => a.ry - b.ry || (a === this.heroi ? 1 : -1));
      for (const p of ps) p.desenhar(c, cx, cy, p.grafico?.tile ? this.tom : tc);
      const cimaT = this.mapa.cima;
      c.drawImage(cimaT, -cx, -cy);
      for (const e of this.eventos) if (e.ativo && (e.prioridade === 2 || e.def.brilha)) e.desenhar(c, cx, cy, e.def.brilha ? 0 : this.tom);
      this.aplicarLuz(c, cx, cy, true);
      g.drawImage(this.cena, 0, 0);
    }
    if (this.overlay) this.overlay.desenhar(g, this);
    if (this.figura) { g.globalAlpha = this.figura.op; g.drawImage(img('pics/' + this.figura.nome), 0, 0, LARG, ALT); g.globalAlpha = 1; }
    if (this.brilho < 1) { g.fillStyle = `rgba(0,0,0,${1 - this.brilho})`; g.fillRect(0, 0, LARG, ALT); }
    if (this.flash > 0) { g.fillStyle = `rgba(255,255,255,${this.flash})`; g.fillRect(0, 0, LARG, ALT); }
    if (this.narracao) {
      g.globalAlpha = this.narracao.op;
      const linhas = this.narracao.s.split('\n');
      const y0 = this.narracao.y ?? (ALT / 2 - linhas.length * 12);
      linhas.forEach((l, i) => texto(g, l, LARG / 2, y0 + i * 24, '#bdbdbd', FONTE_NARRACAO, 'center'));
      g.globalAlpha = 1;
    }
    this.extra?.desenharTopo?.(this, g);
    this.msg.desenhar(g);
    this.aviso.desenhar(g);
  }

  aplicarLuz(c, cx, cy, fase) {
    if (fase) return this.aplicarHalos(c, cx, cy);
    const amb = this.amb;
    const L = this.luzC.getContext('2d');
    if (amb < 1 || this.luzes.length || this.lanterna) {
      L.globalCompositeOperation = 'source-over';
      const v = Math.round(amb * 255);
      L.fillStyle = `rgb(${v},${v},${v})`;
      L.fillRect(0, 0, LARG, ALT);
      L.globalCompositeOperation = 'lighter';
      const fontes = [...this.luzes.filter((l) => l.on !== false && l.r)];
      if (this.lanterna) fontes.push({ x: this.heroi.rx + 16, y: this.heroi.ry + 8, r: this.lanterna.r, i: this.lanterna.i ?? 0.6 });
      for (const l of fontes) {
        const x = l.x - cx, y = l.y - cy;
        const gr = L.createRadialGradient(x, y, 0, x, y, l.r);
        const i = l.i * (l.mult ?? 1);
        gr.addColorStop(0, `rgba(255,255,255,${i})`);
        gr.addColorStop(0.5, `rgba(255,255,255,${i * 0.45})`);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        L.fillStyle = gr;
        L.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
      }
      c.globalCompositeOperation = 'multiply';
      c.drawImage(this.luzC, 0, 0);
      c.globalCompositeOperation = 'source-over';
    }
  }

  aplicarHalos(c, cx, cy) {
    // halos (a névoa clara em volta das lâmpadas, que aparece até sobre o preto)
    c.globalCompositeOperation = 'lighter';
    for (const l of this.luzes) {
      if (l.on === false || !l.halo) continue;
      const x = l.x - cx, y = l.y - cy;
      const a = l.halo.a * (l.mult ?? 1);
      // a névoa do jogo é mais larga que alta e bem suave nas bordas
      const sy = l.halo.sy ?? 0.72;
      c.save();
      c.translate(x, y); c.scale(1, sy);
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, l.halo.r);
      gr.addColorStop(0, `rgba(255,255,255,${a})`);
      gr.addColorStop(0.18, `rgba(255,255,255,${a * 0.8})`);
      gr.addColorStop(0.5, `rgba(255,255,255,${a * 0.3})`);
      gr.addColorStop(0.8, `rgba(255,255,255,${a * 0.08})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr;
      c.fillRect(-l.halo.r, -l.halo.r, l.halo.r * 2, l.halo.r * 2);
      c.restore();
    }
    c.globalCompositeOperation = 'source-over';
    if (this.def.nevoa) {
      c.fillStyle = `rgba(${this.def.nevoa.cor},${this.def.nevoa.a})`;
      c.fillRect(0, 0, LARG, ALT);
    }
    if (this.vinheta) {
      const gr = c.createRadialGradient(LARG / 2, ALT / 2, ALT * 0.3, LARG / 2, ALT / 2, LARG * 0.62);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, `rgba(0,0,0,${this.vinheta})`);
      c.fillStyle = gr; c.fillRect(0, 0, LARG, ALT);
    }
  }

  // Ferramenta de desenvolvimento: o mapa inteiro (com tom, sem luz) como PNG.
  fotoMapa() {
    const W = this.mapa.w * T, H = this.mapa.h * T;
    const c = tela(W, H), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.drawImage(this.mapa.baixo, 0, 0);
    for (const e of this.eventos) if (e.ativo && e.prioridade === 0) e.desenhar(g, 0, 0, this.tom);
    for (const e of this.eventos) if (e.ativo && e.prioridade === 1) e.desenhar(g, 0, 0, this.tom);
    g.drawImage(this.mapa.cima, 0, 0);
    return c.toDataURL('image/png');
  }

  // ---------------- progresso (salvamento automático ao trocar de mapa) ----------------
  salvar() {
    // mapas de cena (flashbacks) não têm saída: o "Continuar" volta para o último mapa jogável
    if (this.semSalvar || this.def?.cena) return;
    try {
      localStorage.setItem('insonia.save', JSON.stringify({ m: this.mapaId, x: this.heroi.x, y: this.heroi.y, d: this.heroi.dir, f: this.flags, v: this.vars, i: this.itens }));
    } catch { /* sem armazenamento */ }
  }
  static temSave() { try { return !!localStorage.getItem('insonia.save'); } catch { return false; } }
  continuar() {
    const s = JSON.parse(localStorage.getItem('insonia.save'));
    this.flags = s.f || {}; this.vars = s.v || {}; this.itens = s.i || [];
    this.carregar(s.m, s.x, s.y, s.d);
  }
}

// Gera historias-de-divinolandia.pdf a partir do próprio index.html (o texto de #fonte e a apresentação).
// uso (dentro desta pasta): npm install && npm run gerar
// Rode de novo a cada mudança no livro: o PDF não se atualiza sozinho.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { parse } from 'node-html-parser';
import { Resvg } from '@resvg/resvg-js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const LIVRO = path.resolve(AQUI, '..');
const SAIDA = path.join(LIVRO, 'historias-de-divinolandia.pdf');
const html = fs.readFileSync(path.join(LIVRO, 'index.html'), 'utf8');
const raiz = parse(html);
const fonte = raiz.querySelector('#fonte');
const rostoHtml = (html.match(/fluir\('rosto', `([\s\S]*?)`\);/) || [])[1] || '';

// ---------- medidas (A5) ----------
const PW = 419.53, PH = 595.28;
const MX = 52, MT = 58, MB = 66;
const LARG = PW - 2 * MX;
const CORPO = 10.6, LINHA = 2.6;
const COR = { tinta: '#27231d', suave: '#6b6253', ocre: '#9a6f22', mata: '#2e3b2f', capa: '#22301f', ouro: '#d9bd7e' };
const F = {
  r: path.join(AQUI, 'fontes/EBGaramond-Regular.ttf'),
  i: path.join(AQUI, 'fontes/EBGaramond-Italic.ttf'),
  m: path.join(AQUI, 'fontes/EBGaramond-Medium.ttf'),
  b: path.join(AQUI, 'fontes/EBGaramond-SemiBold.ttf'),
  bi: path.join(AQUI, 'fontes/EBGaramond-SemiBoldItalic.ttf'),
};
const SITE = 'https://andredarcie.github.io/historias-de-divinolandia/index.html';

// ---------- texto: de HTML para trechos com estilo ----------
const limpa = (s) => s.replace(/\s+/g, ' ');
const decod = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
function trechos(no, est = {}, saida = []) {
  for (const c of no.childNodes) {
    if (c.nodeType === 3) { const t = decod(limpa(c.rawText)); if (t) saida.push({ t, ...est }); continue; }
    if (c.nodeType !== 1) continue;
    const tag = c.tagName.toLowerCase();
    if (tag === 'br') { saida.push({ t: '\n', ...est }); continue; }
    const novo = { ...est };
    if (tag === 'em' || tag === 'i') novo.it = true;
    if (tag === 'strong' || tag === 'b') novo.ng = true;
    if (tag === 'sup') novo.sup = true;
    if (tag === 'a') {
      const h = c.getAttribute('href') || '';
      if (h.startsWith('#')) novo.ir = h.slice(1); else if (/^https?:/.test(h)) novo.link = h;
      else if (h) novo.link = new URL(h, SITE).href;
    }
    trechos(c, novo, saida);
  }
  return saida;
}
const aparar = (ts) => {
  const r = ts.filter((x) => x.t !== '');
  if (r.length) { r[0] = { ...r[0], t: r[0].t.replace(/^\s+/, '') }; const u = r.length - 1; r[u] = { ...r[u], t: r[u].t.replace(/\s+$/, '') }; }
  return r.filter((x) => x.t !== '');
};
const fonteDe = (x) => (x.ng && x.it ? F.bi : x.ng ? F.b : x.it ? F.i : F.r);

// ---------- imagens ----------
const cacheImg = new Map();
function imagem(src) {
  if (cacheImg.has(src)) return cacheImg.get(src);
  const arq = path.join(LIVRO, src);
  let dado;
  if (src.endsWith('.svg')) {
    const r = new Resvg(fs.readFileSync(arq), { fitTo: { mode: 'width', value: 1500 }, font: { fontFiles: [F.r, F.i, F.b], defaultFontFamily: 'EB Garamond', loadSystemFonts: true } });
    dado = r.render().asPng();
  } else dado = fs.readFileSync(arq);
  cacheImg.set(src, dado);
  return dado;
}

// ---------- montagem ----------
function gerar(paginasCap) {
  const doc = new PDFDocument({
    size: [PW, PH], margins: { top: MT, bottom: MB, left: MX, right: MX }, bufferPages: true, autoFirstPage: false,
    lang: 'pt-BR', displayTitle: true,
    info: { Title: 'Histórias de Divinolândia', Author: 'André N. Darcie', Subject: 'A história de Divinolândia (SP), a antiga Sapecado', Keywords: 'Divinolândia, Sapecado, história' },
  });
  const inicioCap = {};     // num -> índice da página (0-based)
  const tituloPag = [];     // índice da página -> título do cabeçalho ('' = sem cabeçalho)
  let tituloAtual = '';
  doc.on('pageAdded', () => { tituloPag[doc.bufferedPageRange().count - 1] = tituloAtual; });
  const novaPagina = () => doc.addPage();
  const resta = () => PH - MB - doc.y;

  // Parágrafo com trechos de estilo misto. Notas viram números sobrescritos com link para a nota.
  const paragrafo = (ts, o = {}) => {
    ts = aparar(ts);
    // notas vizinhas (¹²) viram uma só marca separada por vírgula (¹,²); o link vai para a primeira
    ts = ts.reduce((acc, x) => {
      const ant = acc[acc.length - 1];
      if (x.sup && ant && ant.sup && /^\d+$/.test(x.t) && /\d$/.test(ant.t)) acc[acc.length - 1] = { ...ant, t: `,` };
      else acc.push(x);
      return acc;
    }, []);
    if (!ts.length) return;
    // Espaço no começo de um trecho some no pdfkit: passa para o fim do trecho anterior.
    for (let k = 1; k < ts.length; k++) {
      if (/^\s/.test(ts[k].t)) { ts[k - 1] = { ...ts[k - 1], t: ts[k - 1].t.replace(/\s*$/, ' ') }; ts[k] = { ...ts[k], t: ts[k].t.replace(/^\s+/, '') }; }
    }
    ts = ts.filter((x) => x.t !== '');
    const tam = o.tam || CORPO;
    doc.x = MX + (o.recuoEsq || 0);
    // Sobrescrito com os caracteres Unicode (¹²³…): o pdfkit mede a largura certa, o que não acontece com o
    // recurso OpenType 'sups' (ele mede o algarismo normal e sobra um buraco depois da nota).
    const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', ',': '·' };
    ts.forEach((x, k) => {
      doc.font(fonteDe(x)).fontSize(tam).fillColor(x.sup ? COR.ocre : (x.cor || o.cor || COR.tinta));
      const opc = {
        continued: k < ts.length - 1, width: LARG - (o.recuoEsq || 0), align: o.align || 'left', lineGap: o.linha ?? LINHA,
        link: x.link || null, goTo: x.ir || null, underline: false, features: ['kern', 'liga'],
      };
      if (k === 0) { opc.indent = o.indent || 0; opc.paragraphGap = 0; }
      doc.text(x.sup ? x.t.replace(/[\d,]/g, (c) => SUP[c]) : x.t, opc);
    });
    doc.moveDown(o.depois ?? 0.15);
  };

  const intertitulo = (t) => {
    if (resta() < 70) novaPagina(); else doc.moveDown(0.5);
    doc.font(F.b).fontSize(CORPO + 0.6).fillColor(COR.tinta).text(t, MX, doc.y, { width: LARG, features: ['smcp', 'c2sc', 'kern'], characterSpacing: 0.3, lineGap: 1 });
    doc.moveDown(0.25);
  };

  const figura = (fig) => {
    const img = fig.querySelector('img');
    if (!img) return;
    const src = img.getAttribute('src');
    const w = +img.getAttribute('width'), h = +img.getAttribute('height');
    const cap = fig.querySelector('figcaption');
    const maxH = PH * 0.42;
    let lw = LARG, lh = lw * h / w;
    if (lh > maxH) { lh = maxH; lw = lh * w / h; }
    if (resta() < lh + 48) novaPagina(); else doc.moveDown(0.4);
    const y = doc.y;
    // A imagem leva ao arquivo grande no site (no PDF não dá para ampliar clicando, como na página).
    const grande = fig.querySelector('a')?.getAttribute('href') || src;
    doc.image(imagem(src), MX + (LARG - lw) / 2, y, { width: lw, height: lh, link: new URL(grande, SITE).href });
    doc.y = y + lh + 5;
    if (cap) {
      const ts = trechos(cap).map((x) => ({ ...x, t: x.t.replace(/;?\s*[Cc]lique para ver em tamanho maior/, '; toque na imagem para abrir em tamanho maior no site') }));
      paragrafo(ts, { tam: 8.2, align: 'left', cor: COR.suave, linha: 1.2, depois: 0.6 });
    }
  };

  const notas = (ol, prefixoTitulo) => {
    if (resta() < 80) novaPagina(); else doc.moveDown(0.8);
    doc.font(F.b).fontSize(CORPO + 1.5).fillColor(COR.tinta).text(prefixoTitulo, MX, doc.y, { width: LARG, features: ['smcp', 'c2sc'], characterSpacing: 0.3 });
    doc.moveDown(0.4);
    ol.querySelectorAll(':scope > li').forEach((li, i) => {
      if (resta() < 26) novaPagina();
      const id = li.getAttribute('id');
      const y = doc.y;
      if (id) doc.addNamedDestination(id, 'XYZ', null, PH - y + 4, null);
      doc.font(F.b).fontSize(8.4).fillColor(COR.ocre).text(`${i + 1}.`, MX, y, { width: 18, align: 'right', lineBreak: false });
      doc.y = y;
      paragrafo(trechos(li), { tam: 8.4, align: 'left', recuoEsq: 22, linha: 1.1, depois: 0.35 });
    });
  };

  // Blocos do texto (capítulo, apresentação)
  const blocos = (container, numCap) => {
    for (const el of container.childNodes) {
      if (el.nodeType !== 1) continue;
      const tag = el.tagName.toLowerCase();
      const cls = el.getAttribute('class') || '';
      if (tag === 'header') continue;
      if (tag === 'h2') { doc.moveDown(0.6); doc.font(F.m).fontSize(17).fillColor(COR.tinta).text(decod(limpa(el.text)).trim(), MX, doc.y, { width: LARG, align: 'center' }); doc.moveDown(0.6); continue; }
      if (tag === 'h3') { intertitulo(decod(limpa(el.text)).trim()); continue; }
      if (tag === 'p') { paragrafo(trechos(el), { indent: 14 }); continue; }
      if (tag === 'figure') { figura(el); continue; }
      if (tag === 'ul' || (tag === 'ol' && !cls.includes('notas'))) {
        el.querySelectorAll(':scope > li').forEach((li) => paragrafo([{ t: '•  ' }, ...trechos(li)], { recuoEsq: 10, align: 'left' }));
        continue;
      }
      if (cls.includes('notas-titulo')) continue;
      if (tag === 'ol' && cls.includes('notas')) { notas(el, 'Notas e fontes'); continue; }
      if (tag === 'div' && cls.includes('colofao')) { doc.moveDown(1); paragrafo(trechos(el), { align: 'center', tam: 8.8, cor: COR.suave }); continue; }
      if (tag === 'blockquote') { paragrafo(trechos(el), { recuoEsq: 18, tam: CORPO - 0.4 }); continue; }
    }
  };

  // ---- capa ----
  tituloAtual = '';
  novaPagina();
  doc.page.margins.bottom = 0;
  doc.rect(0, 0, PW, PH).fill(COR.capa);
  doc.lineWidth(0.8).strokeColor(COR.ouro).rect(18, 18, PW - 36, PH - 36).stroke();
  doc.fillColor(COR.ouro).font(F.r).fontSize(8.5).text('DO SAPECADO À TERRA DO DIVINO', 0, 120, { width: PW, align: 'center', characterSpacing: 2.4 });
  doc.fillColor('#e7d6ae').font(F.i).fontSize(20).text('Histórias de', 0, 158, { width: PW, align: 'center' });
  doc.fillColor('#efe6d2').font(F.m).fontSize(40).text('Divinolândia', 0, 182, { width: PW, align: 'center' });
  doc.moveTo(PW / 2 - 50, 250).lineTo(PW / 2 + 50, 250).lineWidth(0.6).strokeColor(COR.ouro).stroke();
  doc.fillColor('#efe0bb').font(F.i).fontSize(12).text('Doze capítulos, do século XVIII aos dias de hoje', 0, 410, { width: PW, align: 'center' });
  doc.fillColor('#e7d6ae').font(F.r).fontSize(11).text('Reunido por André N. Darcie', 0, 432, { width: PW, align: 'center' });
  doc.fillColor('#bfa774').fontSize(8).text('DIVINOLÂNDIA · SÃO PAULO · 2026', 0, 456, { width: PW, align: 'center', characterSpacing: 2 });
  const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.fillColor('#9f8d66').fontSize(7.5).text(`Versão em PDF de ${hoje}. A versão mais nova está em`, 0, 520, { width: PW, align: 'center' });
  doc.fillColor('#bfa774').text('andredarcie.github.io/historias-de-divinolandia', 0, 531, { width: PW, align: 'center', link: SITE });

  // ---- apresentação ----
  tituloAtual = '';
  novaPagina();
  doc.fillColor(COR.tinta);
  blocos(parse(`<div>${rostoHtml}</div>`).firstChild);

  // ---- sumário ----
  tituloAtual = '';
  novaPagina();
  doc.font(F.m).fontSize(17).fillColor(COR.tinta).text('Sumário', MX, MT + 10, { width: LARG, align: 'center' });
  doc.moveDown(1.2);
  const secoes = fonte.querySelectorAll('section.capitulo');
  for (const sec of secoes) {
    const n = sec.getAttribute('data-num');
    const pag = paginasCap ? String(paginasCap[n] + 1) : '000';
    const y = doc.y;
    doc.font(F.r).fontSize(CORPO + 0.4).fillColor(COR.tinta).text(`${n}. ${sec.getAttribute('data-titulo')}`, MX, y, { width: LARG - 34, goTo: `capitulo-${n}`, continued: false });
    const yFim = doc.y;
    doc.font(F.r).fontSize(CORPO + 0.4).text(pag, MX, y, { width: LARG, align: 'right', features: ['onum'], goTo: `capitulo-${n}` });
    doc.y = yFim;
    doc.font(F.i).fontSize(CORPO - 1).fillColor(COR.suave).text(sec.getAttribute('data-sub') || '', MX + 12, doc.y, { width: LARG - 46 });
    doc.moveDown(0.55);
  }

  // ---- capítulos ----
  for (const sec of secoes) {
    const n = sec.getAttribute('data-num');
    const titulo = sec.getAttribute('data-titulo');
    tituloAtual = '';
    novaPagina();
    tituloAtual = titulo;
    inicioCap[n] = doc.bufferedPageRange().count - 1;
    doc.addNamedDestination(`capitulo-${n}`);
    doc.outline.addItem(`${n}. ${titulo}`);
    const y0 = PH * 0.16;
    doc.font(F.r).fontSize(8.5).fillColor(COR.ocre).text(`CAPÍTULO ${n}`, MX, y0, { width: LARG, align: 'center', characterSpacing: 2.6 });
    doc.font(F.m).fontSize(21).fillColor(COR.tinta).text(titulo, MX, doc.y + 8, { width: LARG, align: 'center', lineGap: -2 });
    doc.font(F.i).fontSize(11.5).fillColor(COR.suave).text(sec.getAttribute('data-sub') || '', MX, doc.y + 6, { width: LARG, align: 'center' });
    const yf = doc.y + 16;
    doc.moveTo(PW / 2 - 22, yf).lineTo(PW / 2 + 22, yf).lineWidth(0.6).strokeColor(COR.ocre).stroke();
    doc.y = yf + 26;
    doc.fillColor(COR.tinta);
    blocos(sec, n);
  }

  // ---- cabeçalhos e números de página ----
  const { count } = doc.bufferedPageRange();
  for (let i = 0; i < count; i++) {
    if (i === 0) continue;
    doc.switchToPage(i);
    doc.page.margins.bottom = 0; doc.page.margins.top = 0; // escrever fora da mancha sem abrir página nova
    const t = tituloPag[i];
    const ehAbertura = Object.values(inicioCap).includes(i);
    if (t && !ehAbertura) {
      doc.font(F.i).fontSize(7.8).fillColor(COR.suave);
      doc.text('Histórias de Divinolândia', MX, 28, { width: LARG / 2, align: 'left', lineBreak: false });
      doc.text(t, MX + LARG / 2, 28, { width: LARG / 2, align: 'right', lineBreak: false, ellipsis: true, height: 10 });
    }
    doc.font(F.r).fontSize(8.6).fillColor(COR.suave).text(String(i + 1), MX, PH - 36, { width: LARG, align: 'center', lineBreak: false, features: ['onum'] });
  }
  return { doc, inicioCap };
}

// Duas passagens: a primeira descobre em que página cada capítulo começa; a segunda escreve o sumário com elas.
const primeira = gerar(null);
primeira.doc.end();
const { doc } = gerar(primeira.inicioCap);
const fluxo = fs.createWriteStream(SAIDA);
doc.pipe(fluxo);
doc.end();
fluxo.on('finish', () => {
  const kb = (fs.statSync(SAIDA).size / 1024).toFixed(0);
  console.log(`ok: ${path.relative(process.cwd(), SAIDA)} (${kb} KB, ${doc.bufferedPageRange ? '' : ''}${Object.keys(primeira.inicioCap).length} capítulos)`);
});

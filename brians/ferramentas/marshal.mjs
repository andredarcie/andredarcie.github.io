// Leitor de Ruby Marshal 4.8 (o formato dos .rvdata do RPG Maker VX, Ruby 1.8).
// Devolve uma árvore JSON-compatível que preserva tudo o que o Ruby gravou:
//   objeto       → { "@class": "RPG::Map", "@ivar": valor, ... }
//   símbolo      → { "@sym": "nome" }
//   _dump (u)    → { "@class": "Table", "@dump": "<base64>" } (+ campos decodificados)
//   hash         → { "@hash": [[chave, valor], ...] } (chaves podem ser não-string)
//   string       → string JS (UTF-8, como o editor do VX grava); binária → { "@bytes": "<base64>" }
// Referências repetidas (@ objlink) viram a MESMA instância JS, então a árvore
// pode ter compartilhamento; o conversor para JSON trata isso.
import zlib from 'node:zlib';

const utf8 = new TextDecoder('utf-8', { fatal: true });

export function carregar(buf, info) {
  if (buf[0] !== 4 || buf[1] !== 8) throw new Error(`versão Marshal ${buf[0]}.${buf[1]} não suportada`);
  let pos = 2;
  const simbolos = [];
  const objetos = [];

  const byte = () => buf[pos++];
  function inteiro() {
    const c = (byte() << 24) >> 24;
    if (c === 0) return 0;
    if (c >= 5) return c - 5;
    if (c <= -5) return c + 5;
    if (c > 0) { let n = 0; for (let i = 0; i < c; i++) n |= byte() << (8 * i); return n >>> 0 === n ? n : n >>> 0; }
    let n = -1; for (let i = 0; i < -c; i++) { n &= ~(0xFF << (8 * i)); n |= byte() << (8 * i); } return n;
  }
  function bytes() { const n = inteiro(); const b = buf.subarray(pos, pos + n); pos += n; return b; }
  function simbolo() {
    const t = String.fromCharCode(byte());
    if (t === ':') { const s = bytes().toString('utf8'); simbolos.push(s); return s; }
    if (t === ';') return simbolos[inteiro()];
    throw new Error(`símbolo esperado, veio '${t}' em ${pos - 1}`);
  }
  function registrar(o) { objetos.push(o); return o; }
  function ivars(alvo) {
    const n = inteiro();
    for (let i = 0; i < n; i++) { const k = simbolo(); alvo[k] = valor(); }
  }

  function valor() {
    const t = String.fromCharCode(byte());
    switch (t) {
      case '0': return null;
      case 'T': return true;
      case 'F': return false;
      case 'i': return inteiro();
      case ':': pos--; return { '@sym': simbolo() };
      case ';': pos--; return { '@sym': simbolo() };
      case '@': return objetos[inteiro()];
      case 'I': {
        // String/regexp com ivars (no 1.8 raramente aparece; no 1.9+ guarda encoding).
        const v = valor();
        const extra = {}; ivars(extra);
        return v;
      }
      case '"': {
        const b = bytes();
        try { return registrar(utf8.decode(b)); }
        catch { return registrar({ '@bytes': Buffer.from(b).toString('base64') }); }
      }
      case 'f': {
        const s = bytes().toString('latin1');
        const v = s === 'inf' ? Infinity : s === '-inf' ? -Infinity : s === 'nan' ? NaN : parseFloat(s);
        return registrar({ '@float': v });
      }
      case 'l': {
        const sinal = String.fromCharCode(byte()); const n = inteiro() * 2;
        let v = 0n; for (let i = n - 1; i >= 0; i--) v = (v << 8n) | BigInt(buf[pos + i]);
        pos += n; return registrar(Number(sinal === '-' ? -v : v));
      }
      case '[': {
        const a = registrar([]); const n = inteiro();
        for (let i = 0; i < n; i++) a.push(valor());
        return a;
      }
      case '{': case '}': {
        const h = registrar({ '@hash': [] }); const n = inteiro();
        for (let i = 0; i < n; i++) { const k = valor(); h['@hash'].push([k, valor()]); }
        if (t === '}') h['@default'] = valor();
        return h;
      }
      case 'o': {
        const o = registrar({ '@class': simbolo() });
        ivars(o);
        return o;
      }
      case 'u': {
        const classe = simbolo();
        const dados = Buffer.from(bytes());
        return registrar(decodificarDump(classe, dados));
      }
      case 'S': {
        const o = registrar({ '@class': simbolo(), '@struct': true });
        const n = inteiro(); for (let i = 0; i < n; i++) { const k = simbolo(); o[k] = valor(); }
        return o;
      }
      case 'U': { const o = registrar({ '@class': simbolo() }); o['@marshal_load'] = valor(); return o; }
      case 'e': { const m = simbolo(); const v = valor(); if (v && typeof v === 'object') v['@extends'] = m; return v; }
      case 'C': { const c = simbolo(); const v = valor(); return registrar({ '@class': c, '@value': v }); }
      case 'c': case 'm': return registrar({ '@classref': bytes().toString('utf8') });
      case '/': { const src = bytes().toString('utf8'); const flags = byte(); return registrar({ '@regexp': src, '@flags': flags }); }
      default: throw new Error(`tipo Marshal '${t}' (0x${t.charCodeAt(0).toString(16)}) não suportado em ${pos - 1}`);
    }
  }

  const v = valor();
  if (info) info.fim = pos;
  return v;
}

// Classes nativas do RGSS que se serializam por _dump.
function decodificarDump(classe, d) {
  const base = { '@class': classe, '@dump': d.toString('base64') };
  if (classe === 'Table') {
    const dim = d.readInt32LE(0), xs = d.readInt32LE(4), ys = d.readInt32LE(8), zs = d.readInt32LE(12);
    const n = d.readInt32LE(16);
    const valores = new Array(n);
    for (let i = 0; i < n; i++) valores[i] = d.readInt16LE(20 + i * 2);
    return { '@class': 'Table', dim, xsize: xs, ysize: ys, zsize: zs, data: valores };
  }
  if (classe === 'Color' || classe === 'Tone') {
    const v = [0, 1, 2, 3].map((i) => d.readDoubleLE(i * 8));
    return classe === 'Color'
      ? { '@class': 'Color', red: v[0], green: v[1], blue: v[2], alpha: v[3] }
      : { '@class': 'Tone', red: v[0], green: v[1], blue: v[2], gray: v[3] };
  }
  return base;
}

// Scripts.rvdata = [[id, nome, zlib(código)], ...]
export function scripts(arvore) {
  return arvore.map(([id, nome, comprimido]) => ({
    id, nome,
    codigo: zlib.inflateSync(Buffer.from(comprimido['@bytes'] ?? '', 'base64')).toString('utf8'),
  }));
}

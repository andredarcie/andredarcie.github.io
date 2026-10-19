// O que os scripts do jogo usam do sistema e de arquivos: File, FileTest, Dir,
// Time, GC, Marshal sobre File, load_data/save_data e print/p/msgbox.
//
// Os arquivos ficam em memória, com os mesmos nomes que o jogo usa:
//   Data/*.rvdata   → os originais (baixados antes do Main rodar)
//   Save1.rvdata …  → saves do Scene_File
//   ks_checkpoint   → save do KS Checkpoint (o do instalador, na primeira vez)
// Saves e checkpoint vão para o localStorage (as chaves são as mesmas desde a
// primeira versão web, então saves antigos continuam valendo).
// Nomes como no Windows: sem distinção de maiúsculas, "\" ou "/".
import { loadEm, dumpTodos } from './marshal.js';
import { StandardError, inspect, str } from './biblioteca.js';

const PREFIXO = 'brians-mansion:arquivo:';
const PREFIXO_DATA = 'brians-mansion:mtime:';   // data de gravação (a tela de save mostra)
const PERSISTIR = /^(Save\d+\.rvdata|ks_checkpoint)$/i;

const arquivos = new Map();     // nome normalizado → { nome, bytes, mtime }
let persistir = true;

const normalizar = (nome) => String(nome).replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();

// ------------------------------------------------------------------ montagem
// lista: os caminhos reais do jogo (arquivos.json); baixar(caminho) → Uint8Array.
// persistidos: false → ignora e não grava o localStorage (gravar/replay começam limpos).
export async function montarArquivos(lista, baixar, { persistidos = true } = {}) {
  arquivos.clear();
  persistir = persistidos;
  await Promise.all(lista.filter((p) => /^Data\/[^/]+\.rvdata$/i.test(p)).map(async (real) => {
    guardar(real, await baixar(real), new Date(0));
  }));
  if (persistidos) for (const [nome, bytes, mtime] of lerPersistidos()) guardar(nome, bytes, mtime);
  if (!existe('ks_checkpoint') && lista.includes('ks_checkpoint')) guardar('ks_checkpoint', await baixar('ks_checkpoint'), new Date(0));
}

// Para as ferramentas (Node) e testes: põe um arquivo direto.
export function guardar(nome, bytes, mtime = new Date()) {
  arquivos.set(normalizar(nome), { nome, bytes, mtime });
}
export const lerArquivo = (nome) => arquivos.get(normalizar(nome))?.bytes ?? null;
const existe = (nome) => arquivos.has(normalizar(nome));

function lerPersistidos() {
  const saida = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (!chave.startsWith(PREFIXO)) continue;
      const bin = atob(localStorage.getItem(chave));
      const bytes = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
      const nome = chave.slice(PREFIXO.length);
      const ms = Number(localStorage.getItem(PREFIXO_DATA + nome));
      saida.push([nome, bytes, new Date(ms || 0)]);
    }
  } catch (e) { console.warn('localStorage indisponível; os saves não vão persistir', e); }
  return saida;
}

function gravarPersistido(nome, bytes) {
  if (!persistir || !PERSISTIR.test(nome) || typeof localStorage === 'undefined') return;
  try {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    localStorage.setItem(PREFIXO + nome, btoa(bin));
    localStorage.setItem(PREFIXO_DATA + nome, String(arquivos.get(normalizar(nome)).mtime.getTime()));
  } catch (e) { console.warn(`não consegui salvar ${nome}`, e); }
}

// ------------------------------------------------------------------ erros
export class SystemCallError extends StandardError {}
class ENOENT extends SystemCallError {
  constructor(nome) { super(`No such file or directory - ${nome}`); this.name = 'Errno::ENOENT'; }
}
export const Errno = { ENOENT };

// ------------------------------------------------------------------ File
class Arquivo {
  constructor(nome, modo) {
    this.nome = nome;
    this.escrita = /[wa]/.test(modo);
    this.fechado = false;
    const atual = arquivos.get(normalizar(nome));
    if (this.escrita) {
      this.partes = modo.includes('a') && atual ? [atual.bytes] : [];
    } else {
      if (!atual) throw new ENOENT(nome);
      this.bytes = atual.bytes;
      this.pos = 0;
      this._mtime = atual.mtime;
    }
  }

  // Marshal.dump(obj, arquivo) junta os pedaços; o close grava.
  escrever(bytes) { this.partes.push(bytes); }

  // Marshal.load(arquivo): um dump a partir da posição atual
  lerMarshal() {
    const { valor, pos } = loadEm(this.bytes, this.pos);
    this.pos = pos;
    return valor;
  }

  read() {
    const r = this.bytes.subarray(this.pos);
    this.pos = this.bytes.length;
    return r;
  }

  eof_p() { return this.pos >= this.bytes.length; }

  mtime() { return new Time(this.escrita ? new Date() : this._mtime); }

  close() {
    if (this.fechado) return null;
    this.fechado = true;
    if (this.escrita) {
      const total = this.partes.reduce((n, p) => n + p.length, 0);
      const bytes = new Uint8Array(total);
      let i = 0;
      for (const p of this.partes) { bytes.set(p, i); i += p.length; }
      guardar(this.nome, bytes);
      gravarPersistido(this.nome, bytes);
    }
    return null;
  }
}

export const File = {
  // File.open(nome, modo) ou com bloco (fecha no fim, devolve o valor do bloco)
  open(nome, modo = 'r', bloco = null) {
    if (typeof modo === 'function') { bloco = modo; modo = 'r'; }
    const f = new Arquivo(nome, modo);
    if (!bloco) return f;
    let r;
    try { r = bloco(f); } finally { if (!(r instanceof Promise)) f.close(); }
    return r instanceof Promise ? r.finally(() => f.close()) : r;
  },
  exist_p: (nome) => existe(nome),
  mtime(nome) {
    const a = arquivos.get(normalizar(nome));
    if (!a) throw new ENOENT(nome);
    return new Time(a.mtime);
  },
  delete(...nomes) {
    for (const nome of nomes) {
      if (!existe(nome)) throw new ENOENT(nome);
      arquivos.delete(normalizar(nome));
      if (persistir && PERSISTIR.test(nome)) { try { localStorage.removeItem(PREFIXO + nome); localStorage.removeItem(PREFIXO_DATA + nome); } catch { /* ok */ } }
    }
    return nomes.length;
  },
};

export const FileTest = { exist_p: (nome) => existe(nome) };

// Dir.glob: só "*" e "?" (o jogo usa "Save*.rvdata"), na raiz ou numa pasta
export const Dir = {
  glob(padrao) {
    const re = new RegExp(`^${normalizar(padrao).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]')}$`);
    return [...arquivos.entries()].filter(([k]) => re.test(k)).map(([, a]) => a.nome).sort();
  },
};

// ------------------------------------------------------------------ Time
// Comparado com > e < (valueOf em milissegundos)
export class Time {
  constructor(data = new Date()) { this.data = data; }
  static at(segundos) { return new Time(new Date(segundos * 1000)); }
  static now() { return new Time(); }
  valueOf() { return this.data.getTime(); }
  to_i() { return Math.floor(this.data.getTime() / 1000); }
  get year() { return this.data.getFullYear(); }
  get month() { return this.data.getMonth() + 1; }
  get day() { return this.data.getDate(); }
  get hour() { return this.data.getHours(); }
  get min() { return this.data.getMinutes(); }
  get sec() { return this.data.getSeconds(); }
  strftime(f) {
    const d = this.data, z = (n) => String(n).padStart(2, '0');
    return f.replace(/%([YmdHMS%])/g, (m, c) => ({ Y: d.getFullYear(), m: z(d.getMonth() + 1), d: z(d.getDate()), H: z(d.getHours()), M: z(d.getMinutes()), S: z(d.getSeconds()), '%': '%' })[c]);
  }
}

export const GC = { start: () => null };

// ------------------------------------------------------------------ Marshal
export const Marshal = {
  // Marshal.load(arquivo) lê um dump e avança; Marshal.load(bytes) lê o primeiro
  load(fonte) {
    if (fonte instanceof Arquivo) return fonte.lerMarshal();
    return loadEm(fonte, 0).valor;
  },
  // Marshal.dump(obj, arquivo) escreve; Marshal.dump(obj) devolve os bytes
  dump(x, arquivo = null) {
    const bytes = dumpTodos([x]);
    if (!arquivo) return bytes;
    arquivo.escrever(bytes);
    return arquivo;
  },
};

// ------------------------------------------------------------------ Kernel
export function load_data(nome) {
  const f = File.open(String(nome), 'rb');
  try { return Marshal.load(f); } finally { f.close(); }
}

export function save_data(obj, nome) {
  const f = File.open(String(nome), 'wb');
  try { Marshal.dump(obj, f); } finally { f.close(); }
  return null;
}

// print/p/msgbox do RGSS: caixa com OK que segura o jogo até fechar. Quem
// monta a página passa a função que mostra a caixa (devolve Promise).
let mostrarMensagem = async (texto) => { console.log(texto); };
export function configurarMensagem(f) { mostrarMensagem = f; }

export async function print(...args) {
  await mostrarMensagem(args.map(str).join(''));
  return null;
}
export async function p(...args) {
  await mostrarMensagem(args.map(inspect).join('\n'));
  return args.length <= 1 ? (args[0] ?? null) : args;
}
export const msgbox = print;

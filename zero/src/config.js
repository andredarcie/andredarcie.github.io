/* ===================== conteúdo do jogo (game-context.json) ===================== */
async function loadGameContext() {
  try {
    const res = await fetch(new URL('../game-context.json', import.meta.url), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    const msg = document.createElement('pre');
    msg.style.cssText = 'position:fixed;inset:0;z-index:99;padding:24px;background:#263848;color:#dde8e9;font:22px monospace;white-space:pre-wrap';
    msg.textContent = 'Não foi possível carregar game-context.json.\nRode o jogo por um servidor local para permitir fetch de arquivos JSON.';
    document.body.append(msg);
    throw err;
  }
}

export const GAME_CONTEXT = await loadGameContext();
export const UI_TEXT = GAME_CONTEXT.ui;
export const ROTEIRO = GAME_CONTEXT.roteiro;
export const MUSIC = GAME_CONTEXT.audio.musicThemes;
export const DAYS = GAME_CONTEXT.days;
export const SCENES = GAME_CONTEXT.scenes;
export const LABELS = GAME_CONTEXT.labels;
export const SEQUENCES = GAME_CONTEXT.sequences;
export const ASSETS = GAME_CONTEXT.assets;

/* ===================== paleta (3 cores das referências) ===================== */
export const DARK  = 0x2e4358;  // fundo / portas / detalhes escuros
export const DARK2 = 0x263848;  // sombra / rodapés / teto
export const NAVY  = 0x3a5066;  // vidros e telas (variação do escuro)
export const LIGHT = 0xa6b6b8;  // paredes
export const LIGHT2= 0x8da2a5;  // mobília clara
export const FLOOR = 0x7e9498;  // chão
export const BLUE  = 0x3aa2ea;  // pessoas e objetos vivos
export const GLOW  = 0xdde8e9;  // luz
export const LAMP  = 0xeaf2f2;  // cor padrão das luminárias

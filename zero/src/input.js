/* ===================== entrada: teclado + analógicos touch ===================== */
export const IS_MOBILE = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
export const IS_LOCAL = ['localhost', '127.0.0.1', '::1', ''].includes(location.hostname);

export const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; });
addEventListener('keyup', e => { keys[e.code] = false; });

export const joyL = { x: 0, y: 0 }; // esquerdo: move o personagem
export const joyR = { x: 0, y: 0 }; // direito: gira a câmera
export function resetSticks() { joyL.x = joyL.y = 0; joyR.x = joyR.y = 0; }

export function bindStick(el, vec) {
  const nub = el.firstElementChild, RAD = 44;
  let id = null;
  function move(e) {
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > RAD) { dx *= RAD / d; dy *= RAD / d; }
    vec.x = dx / RAD; vec.y = dy / RAD;
    nub.style.transform = `translate(${dx}px,${dy}px)`;
  }
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    id = e.pointerId;
    el.setPointerCapture(id);
    move(e);
  });
  el.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
  const end = e => {
    if (e.pointerId !== id) return;
    id = null;
    vec.x = 0; vec.y = 0;
    nub.style.transform = '';
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

// eixos de movimento [frente, lado], somando teclado e analógico esquerdo
export function moveAxes() {
  const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joyL.y;
  const st = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joyL.x;
  return [f, st];
}

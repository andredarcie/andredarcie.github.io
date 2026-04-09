// DEBUG FINALE - localhost only

(function () {
  const isLocal = location.hostname === 'localhost'
               || location.hostname === '127.0.0.1'
               || location.hostname === '';
  if (!isLocal) return;

  const btn = document.createElement('button');
  btn.textContent = 'finale';
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '16px',
    left: '16px',
    zIndex: '9999',
    padding: '8px 14px',
    background: '#000',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.35)',
    fontFamily: 'monospace',
    fontSize: '12px',
    cursor: 'pointer',
    letterSpacing: '1px',
    opacity: '0.75',
    borderRadius: '3px',
  });

  btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
  btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.75'; });
  btn.addEventListener('click', () => {
    if (typeof state === 'undefined' || state === 'menu') {
      initGame();
    }
    wave = PLANETS.length + 1;
    initFinale();
    state = 'finale';
  });

  document.body.appendChild(btn);
})();

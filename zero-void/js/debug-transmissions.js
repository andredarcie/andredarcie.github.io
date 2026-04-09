// DEBUG TRANSMISSIONS - localhost only

(function () {
  const isLocal = location.hostname === 'localhost'
               || location.hostname === '127.0.0.1'
               || location.hostname === '';
  if (!isLocal) return;

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed',
    bottom: '64px',
    right: '16px',
    zIndex: '9999',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  });

  const baseButtonStyle = {
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
  };

  function makeButton(label, onClick) {
    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, baseButtonStyle);
    btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.75'; });
    btn.addEventListener('click', onClick);
    panel.appendChild(btn);
  }

  function ensureGameStarted() {
    if (typeof state === 'undefined' || state === 'menu') {
      initGame();
      state = 'play';
    }
  }

  for (let i = 0; i < 4; i++) {
    makeButton(`📡 transmission ${i + 1}`, () => {
      ensureGameStarted();
      initTransmissionScene(i);
      state = 'transmission';
    });
  }

  document.body.appendChild(panel);
})();

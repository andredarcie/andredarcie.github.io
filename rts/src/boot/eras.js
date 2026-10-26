// O menu inicial, Eras do Brasil. Script clássico (fora do import map), pequeno, que
// roda antes de qualquer código do jogo: sem era na URL, a página mostra só o menu
// das eras, na hora, e nada do jogo é baixado. Escolher uma era recarrega com
// ?missao= e aí, sim, o index.html importa src/main.js e a carga da era começa.
(() => {
  if (new URLSearchParams(location.search).has('missao')) return;
  // O recorde de cada era, das chaves que cada missão grava (RECORD_KEY em
  // src/config/missions/), e a palavra da onda de cada uma.
  const ERAS = {
    canudos: { key: 'canudos-melhor', unit: ['onda', 'ondas'] },
    tupinamba: { key: 'tupinamba-melhor', unit: ['ataque', 'ataques'] }
  };
  document.body.classList.add('eras-menu');
  document.title = 'Eras do Brasil';
  const dialog = document.getElementById('eras-dialog');
  for (const line of dialog.querySelectorAll('[data-record]')) {
    const era = ERAS[line.dataset.record];
    let best = 0;
    try { best = Math.max(0, ...Object.values(JSON.parse(localStorage.getItem(era.key)) ?? {})); } catch { /* sem armazenamento */ }
    line.textContent = best > 0 ? `Recorde: ${best} ${best === 1 ? era.unit[0] : era.unit[1]}` : '';
  }
  for (const button of dialog.querySelectorAll('[data-mission]')) {
    button.addEventListener('click', () => {
      if (!ERAS[button.dataset.mission]) return;
      location.search = `?missao=${button.dataset.mission}`;
    });
  }
  // Sem era escolhida não há jogo: o menu não fecha com Esc.
  dialog.addEventListener('cancel', event => event.preventDefault());
  dialog.showModal();
})();

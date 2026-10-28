// O menu inicial, Eras do Brasil. Script clássico (fora do import map), pequeno, que
// roda antes de qualquer código do jogo: sem era na URL, a página mostra só o menu
// das eras, na hora, e nada do jogo é baixado. Escolher uma era recarrega com
// ?missao= (e a fase da campanha onde o jogador parou) e aí, sim, o index.html
// importa src/main.js e a carga da era começa.
(() => {
  if (new URLSearchParams(location.search).has('missao')) return;
  // Cada era é uma campanha de 4 missões; o progresso (a maior missão liberada, 5 =
  // tudo vencido) é o mesmo que src/config/campaign.js grava em 'eras-progresso'.
  const ERAS = ['canudos', 'tupinamba', 'palmares'];
  const STAGES = 4;
  let progress = {};
  try { progress = JSON.parse(localStorage.getItem('eras-progresso')) ?? {}; } catch { /* sem armazenamento */ }
  document.body.classList.add('eras-menu');
  document.title = 'Eras do Brasil';
  const dialog = document.getElementById('eras-dialog');
  for (const line of dialog.querySelectorAll('[data-record]')) {
    const reached = progress[line.dataset.record] ?? 1;
    line.textContent = reached > STAGES ? 'Campanha vencida' : reached > 1 ? `Missão ${reached} de ${STAGES}` : '';
  }
  for (const button of dialog.querySelectorAll('[data-mission]')) {
    button.addEventListener('click', () => {
      const era = button.dataset.mission;
      if (!ERAS.includes(era)) return;
      const stage = Math.min(STAGES, progress[era] ?? 1);
      location.search = `?missao=${era}&fase=${stage}`;
    });
  }
  // Sem era escolhida não há jogo: o menu não fecha com Esc.
  dialog.addEventListener('cancel', event => event.preventDefault());
  dialog.showModal();
})();

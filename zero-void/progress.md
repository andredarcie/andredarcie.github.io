Original prompt: no modo invação, faça a parte do jogo pacman mode, ficar na parte superior da tela, 50% da parte superior, e na parte 50% inferior, continue o jogo da navinha rodando ainda, só que sem inimigos e apenas pedras para você desviar, o controle funciona assim, você vai controlar o personagem astronauta pacman, mas a nave em baixo vai seguir o rastro no eixo Y, ou seja você vai encontrar os dosi ao mesmo tempo, só que a nave apenas segue o astronauta no exio Y e o foco continua em fazer o astrounata matar os aliens ou pegar todos os pontos

- 2026-04-09: Interpretei "seguir o rastro no eixo Y" como nave na metade inferior seguindo o astronauta com deslocamento vertical fixo e alinhamento horizontal projetado; isso preserva a mecânica de desviar pedras.
- 2026-04-09: Implementado split-screen do modo invasion. O maze usa apenas a metade superior; a metade inferior ganhou uma lane de escolta com nave + pedras.
- 2026-04-09: Adicionado `js/invasion/invasion-split.js` para sobrepor o fluxo antigo do invasion sem reescrever o arquivo legado corrompido.
- 2026-04-09: Validação local via `http.server` + Playwright: layout dividido renderizou, HUD permaneceu visível, pedras apareceram, e a nave inferior acompanhou o movimento horizontal do astronauta.
- TODO: Se quiser refinar depois, revisar se a penalidade de perder vida ao bater pedra está no nível certo de dificuldade.

- 2026-04-09: Added finale state before the normal escape screen. Passing the last planet now enters a p5 fractal sequence before the final score screen.
- 2026-04-09: Added js/debug-finale.js for a localhost-only button to jump directly into the finale.
- 2026-04-09: Increased final score readability on the escape screen with stronger contrast and larger score text.

- 2026-04-09: Made finale and escape transitions time-based with millis() so the heavy fractal and final score screen have stable real-time duration even if FPS changes.

- 2026-04-09: Reworked finale visuals: removed all canvas text and replaced the scene with Mandelbrot sampling, projected Menger sponge wireframe, recursive tetrahedra, IFS point cloud, and depth rings.

- 2026-04-09: Optimized finale for mobile: removed per-frame Mandelbrot, cached Menger cubes, added automatic low-detail profile for touch/small screens, and reduced points/rings/tetrahedra.

- 2026-04-09: Fixed transmission ending. Last dialogue now starts an outro phase, fades the dialogue box, animates the ship back to the normal play position, resumes fire, resets spawn clocks, and returns to play.

- 2026-04-09: Transmission outro now hides the dialogue block immediately while the ship returns to normal position.

- 2026-04-09: Added visual polish pass: transition echo, wave collapse ritual, low-life damaged ship feedback, and enhanced life pickup geometry.

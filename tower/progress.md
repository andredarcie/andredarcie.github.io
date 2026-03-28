Original prompt: usando libs se for necessario, crie um mini jogo de towerdefence que funcione bem no celular, faça um design elegante minimalista e que usa formas geometricas simples.

- Projeto inicializado do zero com foco em HTML/CSS/JS puro para manter o carregamento leve no celular.
- Loop principal, HUD mobile-first, overlays, torres Bolt/Pulse, ondas automáticas e hooks `render_game_to_text` e `advanceTime` implementados.
- Validação em navegador concluída: colocação de torres, avanço determinístico, HUD e fluxo das ondas funcionando.
- Ajustes de polimento aplicados: favicon inline para evitar erro 404, textos da UI revisados e status da rodada mais claro durante ondas ativas.
- Sem pendências críticas abertas; próximo agente pode focar apenas em novos modos, áudio ou refinamento de balanceamento.
- Rework visual solicitado em andamento: HTML trocado para layout de terminal industrial e novo renderer `game-p5.js` criado com tema sovietico retro, scanlines CRT e animacoes p5.

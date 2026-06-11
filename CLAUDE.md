# Instruções para o Claude Code

## Testes
- **NUNCA testar nada.** Não rodar o jogo, não abrir navegador, não usar Playwright,
  não subir servidor local, não criar scripts de verificação. Todo teste é feito
  manualmente pelo usuário, que reporta os bugs de volta.
- Checagem de sintaxe (`node --check`) é permitida, nada além disso.

## Convenções do projeto (tiny-gta)
- Módulos com `?v=N` nos imports (`entities.js`, `weapons.js`): ao alterar o arquivo,
  incrementar o `?v=` em TODOS os importadores, usando a ferramenta Edit (nunca
  reescrever arquivos via PowerShell — já corrompeu acentos UTF-8 uma vez).
- A cada alteração, incrementar o "BUILD N" no `index.html`.
- GitHub Pages tem cache de ~10 min; o usuário confere o número do BUILD na tela
  de título antes de reportar que algo não funcionou.

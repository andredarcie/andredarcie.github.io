# Instruções para o Claude Code

## Testes
- **NUNCA testar nada.** Não rodar o jogo, não abrir navegador, não usar Playwright,
  não subir servidor local, não criar scripts de verificação. Todo teste é feito
  manualmente pelo usuário, que reporta os bugs de volta.
- Checagem de sintaxe (`node --check`) é permitida, nada além disso.

## Convenções do projeto (tiny-gta)
- Cache-busting é centralizado no import map do `index.html`: cada módulo local é
  mapeado para sua URL com `?v=N`. Os arquivos `.js` usam imports SEM query string
  (nunca adicionar `?v=` dentro de módulos JS).
- A cada alteração em qualquer `.js`: no `index.html`, substituir TODAS as
  ocorrências de `?v=N` pelo número novo (replace all) e atualizar o "BUILD N"
  do badge para o MESMO número.
- Ao criar um módulo `.js` novo, adicionar a entrada dele no import map.
- Editar arquivos sempre com a ferramenta Edit (nunca reescrever via PowerShell —
  já corrompeu acentos UTF-8 uma vez).
- GitHub Pages tem cache de ~10 min; o usuário confere o número do BUILD na tela
  de título antes de reportar que algo não funcionou.

// Fase 3: checagem de carga da tradução. Importa a fachada RGSS2 em JS e os
// scripts de web/jogo/ na ordem de _ordem.json, sem o Main (o jogo não roda,
// e nada chama o motor). Mostra o primeiro erro de cada script: classe que
// falta, reabertura de algo que não existe, alias de método inexistente…
// Uso: node ferramentas/carregar-jogo.mjs   (a partir de brians/)
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

register('./resolver-rb.mjs', import.meta.url);
const { ligar } = await import('../web/src/rgss2/rgss2.js');
// Motor de mentira: como no Game.exe, a tela existe antes dos scripts (o
// Módulo Vs lê Graphics.width no topo). Qualquer outra chamada ao motor no
// topo de um script é acusada.
ligar(new Proxy({ largura: () => 544, altura: () => 416, mensagem: async () => {} }, {
  get: (alvo, k) => alvo[k] ?? (() => { throw new Error(`motor.${String(k)} chamado ao carregar`); }),
}));

const PASTA = path.resolve('web/jogo');
const ordem = JSON.parse(fs.readFileSync(path.join(PASTA, '_ordem.json'), 'utf8')).filter((f) => !/Main\.js$/.test(f));
let erros = 0;
for (const f of ordem) {
  try {
    await import(pathToFileURL(path.join(PASTA, f)).href);
  } catch (e) {
    erros++;
    const onde = (e.stack ?? '').split('\n').find((l) => l.includes('/jogo/')) ?? '';
    console.log(`${f}: ${e.name}: ${e.message}\n    ${onde.trim()}`);
  }
}
console.log(erros ? `\n${erros} de ${ordem.length} scripts falharam ao carregar` : `os ${ordem.length} scripts carregaram (sem o Main)`);
process.exitCode = erros ? 1 : 0;

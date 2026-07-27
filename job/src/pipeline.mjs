// Roda as cinco etapas em ordem: coleta -> análise -> relatório -> site -> CSV.

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));

const ETAPAS = [
  ['coletar.mjs', 'Coleta nas fontes e aplica os critérios de busca'],
  ['analisar.mjs', 'Classifica as vagas e aplica a taxonomia'],
  ['agregar.mjs', 'Monta o relatório final'],
  ['site.mjs', 'Gera os dados da página web'],
  ['exportar.mjs', 'Exporta o corpus em CSV'],
];

function executar(script) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(AQUI, script)], {
      stdio: 'inherit',
    });
    proc.on('exit', (codigo) =>
      codigo === 0 ? resolve() : reject(new Error(`${script} saiu com código ${codigo}`))
    );
    proc.on('error', reject);
  });
}

for (const [script, descricao] of ETAPAS) {
  console.log(`\n${'='.repeat(70)}\n${script} — ${descricao}\n${'='.repeat(70)}`);
  await executar(script);
}

console.log('\nPronto.');
console.log('  relatório: analise/requisitos-comuns.md');
console.log('  site:      index.html');
console.log('  dados:     dados/*.csv');

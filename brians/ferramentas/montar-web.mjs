// Gera web/arquivos.json: a lista de todos os arquivos de projeto/ que o
// navegador pode pedir. O RGSS roda no Windows (sem distinção de maiúsculas e
// sem extensão nos nomes: "Graphics/Characters/$Brian"); o GitHub Pages
// distingue maiúsculas. O motor usa este índice para resolver nome → arquivo real.
// Uso: node ferramentas/montar-web.mjs   (a partir de brians/)
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve('projeto');
const ignorar = /\.(exe|dll|rvproj)$/i;
const lista = [];

(function andar(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) andar(p);
    else if (!ignorar.test(e.name)) lista.push(path.relative(raiz, p).split(path.sep).join('/'));
  }
})(raiz);

lista.sort();
fs.writeFileSync(path.resolve('web/arquivos.json'), JSON.stringify(lista));
console.log(`${lista.length} arquivos em web/arquivos.json`);

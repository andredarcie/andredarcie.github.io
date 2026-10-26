// Gera dados.js (window.DADOS) a partir de dados/resultado.json, para o index.html funcionar aberto
// direto do disco (file://), sem servidor.
//   node dados/gerar-site.mjs
import fs from 'node:fs';
const r = JSON.parse(fs.readFileSync(new URL('./resultado.json', import.meta.url), 'utf8'));
const extras = JSON.parse(fs.readFileSync(new URL('./extras.json', import.meta.url), 'utf8'));
for (const l of Object.values(r.grupos)) for (const c of l) {
  delete c.precoReal.ids; delete c.anosCusto; c.combustivelNota = extras[c.nome]?.combustivelNota || null; c.alerta = extras[c.nome]?.alerta || null; c.confirmacao = extras[c.nome]?.confirmacao || null;
}
fs.writeFileSync(new URL('../dados.js', import.meta.url), '// gerado por dados/gerar-site.mjs a partir de dados/resultado.json — não editar à mão\nwindow.DADOS = ' + JSON.stringify(r) + ';\n');
console.log('dados.js:', (fs.statSync(new URL('../dados.js', import.meta.url)).size / 1024).toFixed(0), 'KB');

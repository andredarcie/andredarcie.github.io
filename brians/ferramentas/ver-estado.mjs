// Resumo do estado guardado no detalhe de um rastro (tocar-replay.mjs
// --detalhe N): cena, mapa, posição do Brian, evento em execução e mensagem.
// Uso: node ferramentas/ver-estado.mjs rastro.json [mais.json …]
import fs from 'node:fs';
import { loadTodos } from '../web/src/rb/marshal.js';

if (process.argv.length < 3) { console.log('uso: node ferramentas/ver-estado.mjs rastro.json [mais.json …]'); process.exit(2); }
for (const arquivo of process.argv.slice(2)) {
  const r = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  if (!r.detalhe?.estado) { console.log(`${arquivo}: sem detalhe (toque com --detalhe N)`); continue; }
  // a ordem do rastro.rb (RGSSRastro.objetos)
  const [cena, quadros, brilho, , , mensagem, , , , , , , mapa, brian] = loadTodos(new Uint8Array(Buffer.from(r.detalhe.estado, 'base64')));
  const it = mapa?._interpreter;
  const textos = Array.isArray(mensagem) ? 'em andamento (com Proc)' : JSON.stringify(mensagem?._texts ?? []);
  console.log(`${arquivo} · quadro ${r.detalhe.quadro} (frame_count ${quadros}, brilho ${brilho})`);
  console.log(`  cena ${cena} · mapa ${mapa?._map_id} · Brian em (${brian?._x}, ${brian?._y}) olhando ${brian?._direction}`);
  console.log(`  evento rodando: ${it?._list ? `${it._event_id}, comando ${it._index}` : 'nenhum'} · mensagem: ${textos}`);
}

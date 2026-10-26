// Coleta, para cada carro escolhido: histórico FIPE de agosto 2021–2026 e os anúncios da Mobiauto
// em SP. Tudo fica em cache (fipe-cache/, mobiauto/), então pode ser rodado de novo sem refazer.
//   node dados/coleta.mjs
import { GRUPOS, AGOSTOS } from './escolhidos.mjs';
import { anos, preco } from './fipe.mjs';
import { anuncios } from './mobiauto.mjs';

for (const [ano, carros] of Object.entries(GRUPOS)) {
  for (const c of carros) {
    const ys = (await anos(...c.fipe)).filter(y => y.Value.startsWith(ano + '-'));
    if (ys.length !== 1) console.log(`ATENÇÃO ${c.nome}: ${ys.length} anos-combustível ${ano} na FIPE`, ys.map(y => y.Value));
    const hist = [];
    for (const [a, t] of Object.entries(AGOSTOS)) { try { hist.push(a + ':' + (await preco(...c.fipe, ys[0].Value, t)).Valor); } catch { hist.push(a + ':—'); } }
    let mob = '—';
    try { const o = await anuncios(...c.mobi, +ano); mob = `${o.totalInformado} anúncios (${o.anuncios.filter(x => x.anoModelo === +ano).length} do ano-modelo)`; }
    catch (e) { mob = 'falhou: ' + e.message; }
    console.log(`${ano} | ${c.nome} | ${hist.join(' ')} | ${mob}`);
  }
}

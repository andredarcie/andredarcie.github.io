import { buildQuarto } from './quarto.js';
import { buildCorredor } from './corredor.js';
import { buildRecepcao } from './recepcao.js';
import { buildRua } from './rua.js';
import { buildPlataforma, buildPlataforma2 } from './plataforma.js';
import { buildMetro } from './metro.js';
import { buildRua2 } from './rua2.js';
import { buildRecepcao2 } from './recepcao2.js';
import { buildEmpresa } from './empresa.js';
import { buildLoja } from './loja.js';
import { buildAviao } from './aviao.js';
import { buildPraia } from './praia.js';

// cada builder recebe nav = { entry, rel } (por onde se chegou; rel = posição na cabine do elevador),
// monta a cena em kit.scene e devolve a definição:
// { spawn: {x, z, yaw}, caption, auto: {name, lines} | null, wake?, sway?, seated?, elevFn? }
// O trajeto é contínuo: quarto ⇄ corredor ⇄ (elevador) ⇄ recepção ⇄ rua ⇄ estação CENTRAL ⇄ metrô
// ⇄ estação VIADUTO ⇄ rua do viaduto ⇄ recepção do trabalho ⇄ (elevador) ⇄ escritório
export const builders = {
  quarto: buildQuarto,
  corredor: buildCorredor,
  recepcao: buildRecepcao,
  rua: buildRua,
  plataforma: buildPlataforma,
  metro: buildMetro,
  plataforma2: buildPlataforma2,
  rua2: buildRua2,
  recepcao2: buildRecepcao2,
  empresa: buildEmpresa,
  loja: buildLoja,
  aviao: buildAviao,
  praia: buildPraia,
};

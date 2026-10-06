import { buildQuarto } from './quarto.js';
import { buildCorredor } from './corredor.js';
import { buildRecepcao } from './recepcao.js';
import { buildRua } from './rua.js';
import { buildPlataforma } from './plataforma.js';
import { buildMetro } from './metro.js';
import { buildEmpresa } from './empresa.js';
import { buildLoja } from './loja.js';
import { buildAviao } from './aviao.js';
import { buildPraia } from './praia.js';

// cada builder monta a cena em kit.scene e devolve a definição:
// { spawn: {x, z, yaw}, caption, auto: {name, lines} | null, wake?, sway?, seated?, elevFn? }
export const builders = {
  quarto: buildQuarto,
  corredor: buildCorredor,
  recepcao: buildRecepcao,
  rua: buildRua,
  plataforma: buildPlataforma,
  metro: buildMetro,
  empresa: buildEmpresa,
  loja: buildLoja,
  aviao: buildAviao,
  praia: buildPraia,
};

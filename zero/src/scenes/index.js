import { buildQuarto } from './quarto.js';
import { buildCorredor } from './corredor.js';
import { buildRecepcao } from './recepcao.js';
import { buildRua } from './rua.js';
import { buildPlataforma, buildPlataforma2 } from './plataforma.js';
import { buildLinha } from './linha.js';
import { buildTrem } from './trem.js';
import { buildRua2 } from './rua2.js';
import { buildRecepcao2 } from './recepcao2.js';
import { buildEmpresa } from './empresa.js';
import { buildBairro } from './bairro.js';
import { buildCidadeLonge } from './cidadeLonge.js';
import { buildLoja } from './loja.js';
import { buildAeroporto } from './aeroporto.js';
import { buildAviao } from './aviao.js';
import { buildPraia } from './praia.js';

// cada builder recebe nav = { entry, rel } (por onde se chegou: só muda o spawn devolvido, para o
// seletor de cenas), monta o lugar num mundo do kit (freshScene) e devolve a definição:
// { spawn: {x, z, yaw}, caption, auto: {name, lines} | null, wake?, sway?, seated?, bodySeat?, elevFn? }
// (sway, seated e bodySeat podem ser funções: valem a cada quadro)
// Onde cada lugar fica no mundo está em ../mapa.js; o mundo.js monta todos juntos.
export const builders = {
  quarto: buildQuarto,
  corredor: buildCorredor,
  recepcao: buildRecepcao,
  rua: buildRua,
  plataforma: buildPlataforma,
  linha: buildLinha,
  plataforma2: buildPlataforma2,
  trem: buildTrem,
  rua2: buildRua2,
  recepcao2: buildRecepcao2,
  empresa: buildEmpresa,
  bairro: buildBairro,
  cidadeLonge: buildCidadeLonge,
  loja: buildLoja,
  aeroporto: buildAeroporto,
  aviao: buildAviao,
  praia: buildPraia,
};

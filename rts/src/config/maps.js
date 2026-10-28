// O cenário de cada missão, quando ela pede um lugar diferente do da era: as estradas
// (só a boca na beirada; o resto é calculado em config/rts.js), os morros, o rio e o
// raio do chão aberto em volta do meio. Sem entrada aqui, a missão usa o cenário da
// era (missions/<era>.js e world/BiomeMap.js). Só depende da URL, para poder ser lido
// por config/rts.js e pelo BiomeMap sem dar volta nos imports.
import { MISSION, STAGE } from './mission.js';

const MAPS = Object.freeze({
  canudos: {
    // Uauá, 21 de novembro de 1896: o povoado no meio da caatinga, no caminho entre
    // Juazeiro (de onde veio a tropa, ao norte) e Canudos (de onde vieram os
    // sertanejos, ao sul). Sem o Vaza-Barris, sem morro; a caatinga fechada chega
    // perto do povoado, e é por ela que se avança de tocaia.
    2: {
      roads: [
        { id: 'juazeiro', short: 'JUA', label: 'Juazeiro', mouth: { x: 410, y: 0 } },
        { id: 'canudos', short: 'CAN', label: 'Canudos', mouth: { x: 410, y: 820 } }
      ],
      hills: [],
      river: [],
      openRadius: 150
    },
    // A Favela da 4ª expedição: o morro maior, de frente para o arraial, onde a tropa
    // ficou presa (Os Sertões, A Luta).
    4: {
      hills: [
        { id: 'favela', label: 'Morro da Favela', x: 600, y: 690, radius: 118, height: 60 },
        { id: 'mario', label: 'Alto do Mário', x: 215, y: 205, radius: 72, height: 36 }
      ]
    }
  },
  palmares: {
    // A cerca do Macaco em 1694, "no cume da . . . Serra [do Barriga], lugar forte
    // por natureza, e com água perene dentro" (Domingos Jorge Velho): a serra ocupa
    // quase o mapa todo, com o topo achatado onde fica a cerca; o Mundaú corre lá
    // embaixo, a leste, no pé da encosta.
    4: {
      hills: [{ id: 'barriga', label: 'Serra da Barriga', x: 410, y: 410, radius: 330, height: 56 }],
      river: [[762, 0], [748, 180], [772, 360], [750, 560], [774, 720], [762, 820]]
    }
  }
});

export const MAP = MAPS[MISSION]?.[STAGE] ?? null;

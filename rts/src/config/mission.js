// Qual missão está aberta: `?missao=tupinamba` ou `?missao=palmares` na URL; sem
// nada, Canudos. A escolha vale para a página inteira (mapa, regras, cena e textos
// são montados uma vez, no carregamento), então trocar de missão é recarregar com o
// outro parâmetro.
export const MISSIONS = Object.freeze(['canudos', 'tupinamba', 'palmares']);

const query = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const asked = query.get('missao');
export const MISSION = MISSIONS.includes(asked) ? asked : 'canudos';
// Cada era é uma campanha de 4 missões (config/campaign.js): `?fase=2` abre a 2ª.
export const STAGE_COUNT = 4;
const stage = Number(query.get('fase'));
export const STAGE = Number.isInteger(stage) && stage >= 1 && stage <= STAGE_COUNT ? stage : 1;
export const TUPI = MISSION === 'tupinamba';
export const PALMARES = MISSION === 'palmares';
// A mata atlântica: os tupinambás no litoral e Palmares na serra têm o mesmo chão,
// a mesma flora e o mesmo rio de água corrente; o mar e a praia são só do litoral
// (TUPI).
export const FOREST = TUPI || PALMARES;

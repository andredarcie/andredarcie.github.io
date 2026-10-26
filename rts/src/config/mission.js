// Qual missão está aberta: `?missao=tupinamba` na URL; sem nada, Canudos. A
// escolha vale para a página inteira (mapa, regras, cena e textos são montados uma
// vez, no carregamento), então trocar de missão é recarregar com o outro parâmetro.
export const MISSIONS = Object.freeze(['canudos', 'tupinamba']);

const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('missao');
export const MISSION = MISSIONS.includes(asked) ? asked : 'canudos';
export const TUPI = MISSION === 'tupinamba';

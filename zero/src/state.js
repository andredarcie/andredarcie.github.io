/* ===================== fase narrativa ===================== */
// `day` é lido por cenas, áudio e roteiro; só muda via setDay (import não pode reatribuir)
export let day = 1;
// a volta para casa depois do trabalho: as cenas do trajeto se montam escuras
export let night = false;
export function setDay(d) { day = Number(d); night = false; }
export function setNight(on) { night = !!on; }

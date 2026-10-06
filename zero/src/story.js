import { ROTEIRO, DAYS, SCENES, LABELS } from './config.js';
import { day } from './state.js';

/* ===================== roteiro: nomes, falas e legendas do game-context.json ===================== */
export function objectName(key) {
  return LABELS.objects[key] || key;
}
export function speakerName(key) {
  if (!key) return '';
  return LABELS.speakers[key] || key;
}
export function linesOf(key) {
  const lines = ROTEIRO[key];
  if (!Array.isArray(lines)) {
    console.warn(`Roteiro ausente em game-context.json: ${key}`);
    return [];
  }
  return lines;
}
function dayInfo() {
  return DAYS[String(day)] || {};
}
export function roomCaption() {
  return dayInfo().roomCaption || '';
}
export function roomAuto() {
  const auto = dayInfo().roomAuto;
  return auto ? { name: speakerName(auto.speaker), lines: linesOf(auto.script) } : null;
}
export function sceneCaption(name) {
  return (SCENES[name] && SCENES[name].caption) || name.toUpperCase();
}

// Morte: o corpo tomba (em segundos), apodrece até só sobrar o esqueleto (em dias)
// e o esqueleto fica 2 dias antes de sumir de vez.
export const DEATH_FALL = .9;
export const DECAY_DAYS = .45;
export const SKELETON_DAYS = 2;
export const CORPSE_DAYS = DECAY_DAYS + SKELETON_DAYS;

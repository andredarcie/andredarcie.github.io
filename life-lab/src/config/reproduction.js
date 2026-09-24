// Cortejo, gestação e parto.

export const MATE_MIN_RESOURCE = 50;
export const MATE_COOLDOWN = 16;
export const COURTSHIP_DURATION = 2.4;
export const MATING_DURATION = 1.4;
// Gestação longa o bastante para a barriga crescer à vista (era 9 s): a mãe passa
// um bom tempo grávida andando pelo mundo antes do parto.
export const GESTATION_DURATION = 16;
// Trabalho de parto, os últimos segundos da gestação (era 1,2 s, um piscar). Dá tempo
// de contração em pé, deitar, as ondas de força e o bebê saindo aos poucos.
export const LABOR_DURATION = 5.5;
// Fases do parto, em fração do trabalho de parto: até LABOR_LIE_DOWN a mãe sente as
// contrações em pé; depois deita; o bebê começa a sair em LABOR_CROWN e está todo
// fora em LABOR_OUT (o resto é o bebê já no chão, antes de virar filhote).
export const LABOR_LIE_DOWN = .18;
export const LABOR_CROWN = .34;
export const LABOR_OUT = .94;
// Onde o recém-nascido nasce: à frente da mãe deitada, logo além dos pés dela, em
// unidades do corpo dela (o renderizador põe o bebê exatamente ali).
export const NEWBORN_DISTANCE = 3.2;
export const BIRTH_ANIMATION_DURATION = 1.4;

// Amizade, tribos e luto.

export const SOCIAL_CONTACT_DISTANCE = 44;
export const SOCIAL_BOND_DURATION = 3;
export const SOCIAL_BOND_DECAY = .08;
export const MAX_TRIBE_BONDS = 2;
export const TRIBE_SPACING = 30;
export const TRIBE_FOLLOW_RANGE = 240;
// Até onde um membro sente o resto da tribo. Deliberadamente maior que a visão e
// independente do cone: bicho de bando se acha por chamado, não só de olho. Isso
// afrouxa de propósito a regra antiga de "nada fora do campo de visão", mas segue
// finito — passou disso, perdeu a tribo de vez, e não há coordenada onisciente.
export const TRIBE_CALL_RANGE = 340;
// Folga antes de a coesão começar a puxar; medida até o centro do bando, então
// numa dupla corresponde ao dobro disso entre os dois.
export const TRIBE_LOOSE_DISTANCE = 46;

// Tecido tingido: mais escuro e mais fechado que qualquer cor de corpo, para a roupa
// ler como roupa e para dois grupos vizinhos nunca se confundirem.
export const OUTFIT_COLORS = Object.freeze([
  '#8c3b2e', '#2f5b86', '#3a7a5c', '#6d4a86',
  '#a8762a', '#455168', '#94395e', '#2f7480'
]);

// Luto: a tribo inteira que estiver acordada vem, faz roda em volta do corpo,
// chora um tempo e vai embora. Fome ou sede apertada interrompe o luto.
export const MOURN_CRY = 7;
export const MOURN_GIVE_UP = 40;
export const MOURN_RING = 20;
export const MOURN_BREAK_NEED = 20;

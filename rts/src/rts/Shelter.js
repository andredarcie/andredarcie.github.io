// O sino da igreja (a buzina na aldeia, o alarma no Macaco), como o "town bell" dos
// jogos de estratégia: os trabalhadores largam o que faziam e correm para dentro da
// casa do meio; lá dentro ninguém os alcança, e a casa atira mais quanto mais gente
// abriga — em Canudos, "os atiradores da igreja nova permaneciam firmes" (Os Sertões,
// Expedição Moreira César, V). Tocado de novo, todos saem e voltam ao que faziam.

// O tiro da casa com gente dentro: alcance, recarga e dano (mais um tanto por pessoa).
export const GARRISON = Object.freeze({ range: 150, interval: 1.2, damage: 3, perPerson: 1.2, max: 12 });

// O tiro da casa do meio agora (null sem ninguém dentro).
export function garrisonTurret(building) {
  const inside = Math.min(GARRISON.max, building.garrison ?? 0);
  if (inside <= 0) return null;
  return { range: GARRISON.range, interval: GARRISON.interval, damage: GARRISON.damage + GARRISON.perPerson * inside };
}

// Sai pela porta, num leque, e retoma a ordem de antes do sino.
export function leaveShelter(u) {
  const hall = u.shelter;
  u.inHut = false;
  u.shelter = null;
  if (hall) hall.garrison = Math.max(0, (hall.garrison ?? 1) - 1);
  const angle = (hall?.angle ?? 0) + (Math.random() - .5) * 1.6;
  const from = hall ? { x: hall.doorX, y: hall.doorY } : u;
  u.x = from.x + Math.cos(angle) * (6 + Math.random() * 10);
  u.y = from.y + Math.sin(angle) * (6 + Math.random() * 10);
  u.post = { x: u.x, y: u.y };
  u.order = u.resume ?? null;
  u.resume = null;
}

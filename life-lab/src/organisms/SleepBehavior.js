import {
  SLEEP_MIN_NEED, SLEEP_WAKE_HUNGER, SLEEP_WAKE_THIRST, SLEEP_WAKE_ENERGY, DRY_MOUTH_THIRST
} from '../config/organisms.js';
import { TRIBE_LOOSE_DISTANCE, TRIBE_CALL_RANGE } from '../config/social.js';
import { CAMPFIRE_GATHER_LEAD, CAMPFIRE_SEAT_TOLERANCE, HUT_DOOR_TOLERANCE } from '../config/settlement.js';

// Deitar e levantar. Dormir de noite é hábito, não escolha: quem está bem alimentado
// deita quando escurece para ele. Quem zera a energia apaga onde estiver, de dia ou
// de noite, com fome ou sem.
export class SleepBehavior {
  #sky;
  #shelter;
  #campfires;
  #woodcutting;
  #foraging;

  constructor({ skyClock, shelter, campfires, woodcutting, foraging }) {
    this.#sky = skyClock;
    this.#shelter = shelter;
    this.#campfires = campfires;
    this.#woodcutting = woodcutting;
    this.#foraging = foraging;
  }

  // Perto da hora de deitar: é quando cada um já vai para a cama dele.
  nearBedtime(o) {
    return this.#sky.current.daylight < o.bedLight + CAMPFIRE_GATHER_LEAD;
  }

  fallAsleep(o) {
    this.#woodcutting.stopChop(o);
    o.mourn = null;
    o.crying = false;
    o.asleep = true;
    o.target = null;
    o.need = null;
    o.restTimer = 0;
    o.halt();
    this.#foraging.clearSearch(o);
    o.thought = 0;
  }

  wakeUp(o, message) {
    o.asleep = false;
    o.walkTimer = 0;
    // Quem dormiu na cabana sai pela porta e devolve a vaga.
    if (o.inHut && o.hut) {
      o.x = o.hut.doorX;
      o.y = o.hut.doorY;
      o.heading = o.hut.angle;
    }
    o.inHut = false;
    this.#shelter.releaseBed(o);
    if (message) o.say(message, 1.3);
  }

  // Onde passar a noite: vaga em cabana, senão lugar na roda da fogueira.
  restSpot(o) {
    const hut = this.#shelter.claimHut(o);
    if (hut) return { x: hut.doorX, y: hut.doorY, faceX: hut.x, faceY: hut.y, hut };
    const fire = this.#campfires.fireFor(o);
    if (fire) {
      const seat = this.#campfires.seatFor(fire, o);
      return { x: seat.x, y: seat.y, faceX: fire.x, faceY: fire.y, fire };
    }
    return null;
  }

  update(o) {
    const sky = this.#sky.current;
    const hungriest = o.hungriest;
    if (o.asleep) {
      if (o.pregnancy?.labor) return this.wakeUp(o, null);
      if (o.energy > SLEEP_WAKE_ENERGY) {
        if (o.thirst < SLEEP_WAKE_THIRST) return this.wakeUp(o, 'boca seca');
        if (o.hunger < SLEEP_WAKE_HUNGER) return this.wakeUp(o, 'que fome');
      }
      const morning = sky.daylight >= o.wakeLight;
      // Energia cheia só tira da cama fora da noite dele (é o cochilo de quem
      // apagou de dia); de noite ele continua deitado até clarear.
      if ((morning && o.energy > 55) || (o.energy >= 100 && sky.daylight > o.bedLight)) {
        // Ao acordar a sensação volta: quem passou a noite perdendo água sente.
        const greeting = o.thirst < DRY_MOUTH_THIRST ? 'boca seca'
          : morning && sky.daylight < .9 ? 'bom dia' : null;
        this.wakeUp(o, greeting);
      }
      return;
    }
    if (o.pair || o.eating > 0 || o.drinking > 0 || o.pregnancy?.labor) return;
    if (o.energy <= 0) return this.fallAsleep(o);
    // De luto ninguém vai dormir; só a exaustão, acima, derruba.
    if (o.mourn) return;
    if (sky.daylight > o.bedLight || hungriest < SLEEP_MIN_NEED) return;
    const spot = this.restSpot(o);
    // Com vaga em cabana, entra pela porta e dorme lá dentro, fora de vista.
    if (spot?.hut) {
      if (Math.hypot(spot.x - o.x, spot.y - o.y) > HUT_DOOR_TOLERANCE) return;
      o.inHut = true;
      o.x = spot.hut.x;
      o.y = spot.hut.y;
      return this.fallAsleep(o);
    }
    // Com fogueira, só deita no próprio lugar da roda, com os pés para o fogo —
    // deitar de costas tomba a cabeça para trás, para longe da chama.
    if (spot?.fire) {
      if (Math.hypot(spot.x - o.x, spot.y - o.y) > CAMPFIRE_SEAT_TOLERANCE) return;
      o.heading = Math.atan2(spot.faceY - o.y, spot.faceX - o.x);
      return this.fallAsleep(o);
    }
    // Sem fogo, dorme perto da tribo: longe do bando ainda anda até ele (a coesão
    // puxa), e só deita quando chega. Perdido de vez, dorme onde estiver.
    if (o.band) {
      const distance = Math.hypot(o.band.x - o.x, o.band.y - o.y);
      if (distance > TRIBE_LOOSE_DISTANCE && distance <= TRIBE_CALL_RANGE) return;
    }
    this.fallAsleep(o);
  }
}

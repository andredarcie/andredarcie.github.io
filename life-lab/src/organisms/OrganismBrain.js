import { WALK_SPEED, RUN_SPEED, BRAKING, SLEEP_MIN_NEED } from '../config/organisms.js';

// Um tique de vida de um bicho, com a ordem de prioridade entre os comportamentos:
// corpo → sono → luto → parto → namoro → comer/beber em andamento → necessidade →
// (sem necessidade) cama, trabalho, bando ou passeio → puxada do bando → passo.
// Cada comportamento mora na própria classe; aqui só se decide quem fala primeiro.
export class OrganismBrain {
  #metabolism;
  #sleep;
  #mourning;
  #reproduction;
  #foraging;
  #woodcutting;
  #tribes;
  #bands;
  #locomotion;
  #wandering;

  constructor({ metabolism, sleep, mourning, reproduction, foraging, woodcutting, tribes, bands, locomotion, wandering }) {
    this.#metabolism = metabolism;
    this.#sleep = sleep;
    this.#mourning = mourning;
    this.#reproduction = reproduction;
    this.#foraging = foraging;
    this.#woodcutting = woodcutting;
    this.#tribes = tribes;
    this.#bands = bands;
    this.#locomotion = locomotion;
    this.#wandering = wandering;
  }

  tick(o, dt, { days, activity }) {
    this.#metabolism.tick(o, dt, days);
    if (o.life <= 0) return;

    this.#sleep.update(o);
    if (o.asleep) {
      o.halt();
      return;
    }

    // Luto passa na frente de trabalho, passeio e namoro; só a necessidade
    // apertada (tratada dentro do luto) e o parto passam na frente dele.
    if (o.mourn && !o.pregnancy?.labor && this.#mourning.tick(o, dt)) return;

    if (o.pregnancy?.labor) {
      this.#woodcutting.stopChop(o);
      o.halt();
      return;
    }

    if (!o.pair && this.#reproduction.canMate(o)) this.#reproduction.seekMate(o);
    if (o.pair) {
      this.#woodcutting.stopChop(o);
      this.#approachPartner(o, dt);
      return;
    }

    if (this.#foraging.consume(o, dt)) return;

    // Com sono, a fome e a sede moderadas deixam de ser sentidas como urgência: na
    // hora de deitar, quem não está apertado vai para a cama (cabana, roda do fogo
    // ou o chão perto do bando) em vez de passar a noite atrás de comida no escuro.
    // Só a necessidade de verdade, abaixo de SLEEP_MIN_NEED, vence o sono.
    const drowsy = this.#sleep.nearBedtime(o) && o.hungriest >= SLEEP_MIN_NEED;
    const need = this.#foraging.decideNeed(o, drowsy);
    // Fome e sede passam na frente do machado; o dano na árvore fica, e ela
    // continua ferida esperando o próximo lenhador.
    if (need && o.chop) this.#woodcutting.stopChop(o);
    this.#foraging.updateTarget(o, need);

    let motion = { direction: o.wanderHeading, desiredSpeed: 0 };
    let seat = null, working = false;
    if (o.target) {
      motion = this.#foraging.pursueTarget(o, need);
      if (!motion) return;
    } else if (need) {
      const guide = this.#tribes.resourceGuide(o, need);
      if (guide) {
        this.#foraging.clearSearch(o);
        motion = this.#locomotion.followMate(o, guide);
      } else {
        motion = this.#foraging.explore(o, need, dt);
      }
      o.restTimer = 0;
    } else {
      ({ motion, seat, working } = this.#idle(o, dt, activity));
    }

    // A caminho da cama a coesão sai de cena: a cabana e o fogo já estão no bando.
    // Trabalhando também: o lenhador parado no machado não larga a árvore para
    // voltar à formação, e quem leva tora vai para a obra, que fica no bando.
    const cohesion = seat || working ? null : this.#bands.cohesionFor(o);
    if (cohesion) {
      // Recurso à vista vence o bando: quem já enxergou comida ou água não larga
      // o alvo para voltar para a formação, senão a tribo inteira passa fome junta
      // só para andar bonito. Explorando, que é a maior parte do tempo, a puxada
      // vale cheia.
      const pull = cohesion.weight * (o.target ? .4 : 1);
      motion = {
        direction: Math.atan2(
          Math.sin(motion.direction) + Math.sin(cohesion.direction) * pull,
          Math.cos(motion.direction) + Math.cos(cohesion.direction) * pull
        ),
        // Longe do bando ninguém fica parado descansando.
        desiredSpeed: Math.max(motion.desiredSpeed, WALK_SPEED * o.pace * cohesion.urgency)
      };
      o.restTimer = 0;
    }
    this.#locomotion.move(o, dt, {
      direction: motion.direction,
      desiredSpeed: motion.desiredSpeed * this.#locomotion.stageSpeed(o)
    });
  }

  // Sem fome nem sede: perto da hora de deitar, cama; de dia, madeira; senão, andar
  // com o bando ou passear.
  #idle(o, dt, activity) {
    this.#foraging.clearSearch(o);
    const seat = this.#sleep.nearBedtime(o) ? this.#sleep.restSpot(o) : null;
    if (seat) this.#woodcutting.stopChop(o);
    const work = seat ? null : this.#woodcutting.work(o, dt);
    const working = Boolean(work);
    const guide = seat || work ? null : this.#tribes.formationGuide(o);
    let motion;
    if (seat) {
      motion = this.#toSeat(o, seat);
      o.restTimer = 0;
    } else if (work) {
      motion = work;
      o.restTimer = 0;
    } else if (guide) {
      motion = this.#locomotion.followMate(o, guide);
      o.restTimer = 0;
    } else {
      motion = this.#wandering.stroll(o, dt, activity);
    }
    if (!seat && !working) motion = this.#wandering.steerInside(o, motion);
    return { motion, seat, working };
  }

  // Vai até a cama (porta da cabana ou lugar na roda) e, chegando, olha para ela.
  #toSeat(o, seat) {
    const distance = Math.hypot(seat.x - o.x, seat.y - o.y);
    if (distance > 2) {
      return {
        direction: Math.atan2(seat.y - o.y, seat.x - o.x),
        desiredSpeed: Math.min(WALK_SPEED * o.pace, Math.sqrt(2 * BRAKING * distance))
      };
    }
    o.heading = Math.atan2(seat.faceY - o.y, seat.faceX - o.x);
    return { direction: o.wanderHeading, desiredSpeed: 0 };
  }

  #approachPartner(o, dt) {
    if (o.pair.phase !== 'approach') {
      o.halt();
      return;
    }
    const partner = o.sex === 'male' ? o.pair.female : o.pair.male;
    const distance = Math.hypot(partner.x - o.x, partner.y - o.y);
    const direction = Math.atan2(partner.y - o.y, partner.x - o.x);
    const desiredSpeed = Math.min(RUN_SPEED * .72 * o.pace, Math.sqrt(2 * BRAKING * Math.max(0, distance - 12)));
    this.#locomotion.move(o, dt, { direction, desiredSpeed: desiredSpeed * this.#locomotion.stageSpeed(o) });
  }
}

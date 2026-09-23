import { BIOMES } from '../config/world.js';
import { DEATH_FALL, DECAY_DAYS } from '../config/death.js';
import { CAMPFIRE_WARM_RADIUS } from '../config/settlement.js';

// O estado do mundo em JSON, para quem analisa a simulação de fora
// (window.render_game_to_text).
export class StateSerializer {
  #state;
  #sky;
  #simulation;
  #genetics;
  #biomes;
  #ponds;
  #tribeNames;

  constructor({ state, skyClock, simulation, genetics, biomes, ponds, tribeNames }) {
    this.#state = state;
    this.#sky = skyClock;
    this.#simulation = simulation;
    this.#genetics = genetics;
    this.#biomes = biomes;
    this.#ponds = ponds;
    this.#tribeNames = tribeNames;
  }

  toJSON() {
    const state = this.#state;
    const sky = this.#sky.current;
    const biomes = this.#biomes;
    return JSON.stringify({
      coordinateSystem: 'origin top-left; x right, y down',
      simulationSpeed: this.#simulation.speed,
      organisms: state.organisms.map(o => this.#organism(o)),
      trees: {
        standing: state.trees.filter(tree => !tree.stump && !tree.fall && tree.growth >= 1).length,
        growing: state.trees.filter(tree => !tree.stump && tree.growth < 1).length,
        falling: state.trees.filter(tree => tree.fall).length,
        stumps: state.trees.filter(tree => tree.stump).length
      },
      logs: state.logs.length,
      huts: state.huts.map(hut => ({
        x: Math.round(hut.x), y: Math.round(hut.y), logs: hut.logs, built: hut.built,
        owner: hut.owner, capacity: hut.capacity, members: hut.members ?? 0,
        beds: hut.beds.size, inside: hut.inside ?? 0
      })),
      grass: state.grass.length, grassRegrowing: state.grassRegrow.length,
      ponds: state.ponds.length, waterRemaining: state.ponds.map(p => Math.round(p.water)),
      biomes: BIOMES.map(biome => ({
        id: biome.id,
        earthShare: biome.earthShare,
        worldShare: Math.round(biome.worldShare * 1000) / 10,
        food: state.grass.filter(item => biomes.biomeAt(item.x, item.y) === biome.id).length,
        ponds: state.ponds.filter(item => biomes.biomeAt(item.x, item.y) === biome.id).length
      })),
      rain: state.rain ? {
        time: Math.round(state.rain.time * 10) / 10,
        fill: Math.round(this.#ponds.totalWater() / Math.max(1, this.#ponds.totalCapacity()) * 100) / 100
      } : null,
      rainEvents: state.rainEvents,
      sky: {
        day: sky.day, hour: Math.round(sky.hour * 100) / 100, period: sky.period,
        season: sky.season,
        sunAltitude: Math.round(sky.sun.altitude * 10) / 10,
        moonAltitude: Math.round(sky.moon.altitude * 10) / 10,
        moonIllumination: Math.round(sky.illumination * 100) / 100,
        daylight: Math.round(sky.daylight * 100) / 100,
        rate: Math.round(this.#sky.rate * 100) / 100,
        sight: Math.round(this.#sky.sight * 100) / 100,
        sleeping: state.organisms.filter(o => o.asleep).length
      },
      campfires: state.campfires.map(fire => ({
        x: Math.round(fire.x), y: Math.round(fire.y), outfit: fire.outfit,
        flame: Math.round(fire.flame * 100) / 100, dying: fire.dying,
        seated: [...fire.seats.keys()].length,
        sleepingAround: state.organisms.filter(o => o.asleep &&
          Math.hypot(o.x - fire.x, o.y - fire.y) < CAMPFIRE_WARM_RADIUS).length
      })),
      corpses: state.corpses.map(c => ({
        name: c.name, x: Math.round(c.x), y: Math.round(c.y),
        ageDays: Math.round(c.age * 100) / 100,
        phase: c.time < DEATH_FALL ? 'caindo' : c.age < DECAY_DAYS ? 'apodrecendo' : 'esqueleto'
      })),
      mourning: state.organisms.filter(o => o.mourn).length,
      birthEffects: state.birthEffects.map(effect => ({
        x: Math.round(effect.x), y: Math.round(effect.y), time: Math.round(effect.time * 10) / 10
      })),
      tribes: [...new Set(state.organisms.map(o => o.band).filter(Boolean))].map(band => ({
        name: this.#tribeNames.nameOf(band.members[0].outfit),
        size: band.members.length,
        outfit: band.members[0].outfit,
        x: Math.round(band.x), y: Math.round(band.y)
      })),
      formingBonds: state.socialBonds.size,
      encounters: state.encounters, births: state.births, elapsed: Math.round(state.elapsed)
    });
  }

  #organism(o) {
    return {
      id: o.id, name: o.name, x: Math.round(o.x), y: Math.round(o.y), genes: { ...o.genes },
      genome: this.#genetics.summarize(o.genome), lineage: o.lineage, outfit: o.outfit,
      sex: o.sex, biome: this.#biomes.biomeAt(o.x, o.y), stage: o.stage,
      ageDays: Math.round(o.age * 100) / 100, size: Math.round(o.size),
      speed: Math.round(o.speed), need: o.need, target: Boolean(o.target),
      tribe: [...o.tribe],
      exploration: o.search.waypoint ? {
        need: o.search.need,
        x: Math.round(o.search.waypoint.x),
        y: Math.round(o.search.waypoint.y),
        zone: o.search.waypoint.zone,
        scanning: o.search.scanTimer > 0
      } : null,
      mating: o.pair ? o.pair.phase : null,
      pregnancy: o.pregnancy ? {
        elapsed: Math.round(o.pregnancy.elapsed * 10) / 10,
        duration: Math.round(o.pregnancy.duration * 10) / 10,
        progress: Math.round(o.pregnancy.elapsed / o.pregnancy.duration * 100) / 100,
        fatherId: o.pregnancy.fatherId,
        labor: o.pregnancy.labor
      } : null,
      birthAnimation: Math.round(o.birthAnimation * 10) / 10,
      life: Math.round(o.life), hunger: Math.round(o.hunger), thirst: Math.round(o.thirst),
      energy: Math.round(o.energy), asleep: o.asleep,
      carrying: o.carrying, chopping: Boolean(o.chop), inHut: o.inHut
    };
  }
}

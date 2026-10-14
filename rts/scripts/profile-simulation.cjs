const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const url = process.argv[2] || 'http://127.0.0.1:4173';
const outputDir = path.resolve(process.argv[3] || 'output/simulation-profile');
const profileDurationSeconds = Number(process.argv[4] || 300);
const profileSeed = Number(process.argv[5] || 20260921);
fs.mkdirSync(outputDir, { recursive: true });

function seededRandomScript(seed) {
  return ({ seedValue }) => {
    let value = seedValue >>> 0;
    Math.random = () => {
      value += 0x6D2B79F5;
      let next = value;
      next = Math.imul(next ^ next >>> 15, next | 1);
      next ^= next + Math.imul(next ^ next >>> 7, next | 61);
      return ((next ^ next >>> 14) >>> 0) / 4294967296;
    };
  };
}

function parseState(raw) {
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function summarizeState(state, wallMs, diagnostics = {}) {
  const count = state.organisms.length;
  const sum = (selector) => state.organisms.reduce((total, organism) => total + selector(organism), 0);
  const average = (selector) => count ? sum(selector) / count : null;
  const stages = { infant: 0, adult: 0, elder: 0 };
  for (const organism of state.organisms) stages[organism.stage]++;
  return {
    elapsed: state.elapsed,
    population: count,
    births: state.births,
    inferredDeaths: state.births + 12 - count,
    grass: state.grass,
    grassRegrowing: state.grassRegrowing,
    ponds: state.ponds,
    waterRemaining: state.waterRemaining.reduce((total, value) => total + value, 0),
    rainEvents: state.rainEvents,
    raining: Boolean(state.rain),
    encounters: state.encounters,
    averageLife: average((organism) => organism.life),
    averageHunger: average((organism) => organism.hunger),
    averageThirst: average((organism) => organism.thirst),
    averageSpeed: average((organism) => organism.speed),
    mating: state.organisms.filter((organism) => organism.mating).length,
    ...stages,
    ...diagnostics,
    wallMs
  };
}

async function collectEcosystemSample(page, advanceMilliseconds = 0) {
  return page.evaluate((milliseconds) => {
    if (milliseconds > 0) window.advanceTime(milliseconds);
    const averageNearestDistance = (items, radiusSelector = () => 0) => {
      if (!organisms.length || !items.length) return null;
      const total = organisms.reduce((sum, organism) => {
        const closest = items.reduce((best, item) => Math.min(best,
          Math.max(0, Math.hypot(item.x - organism.x, item.y - organism.y) - radiusSelector(item))), Infinity);
        return sum + closest;
      }, 0);
      return total / organisms.length;
    };
    const diagnostic = {
      males: organisms.filter((organism) => organism.sex === 'male').length,
      females: organisms.filter((organism) => organism.sex === 'female').length,
      adultMales: organisms.filter((organism) => organism.stage === 'adult' && organism.sex === 'male').length,
      adultFemales: organisms.filter((organism) => organism.stage === 'adult' && organism.sex === 'female').length,
      eligibleMales: organisms.filter((organism) => organism.sex === 'male' && canMate(organism)).length,
      eligibleFemales: organisms.filter((organism) => organism.sex === 'female' && canMate(organism)).length,
      activePairs: pairs.length,
      needingFood: organisms.filter((organism) => organism.need === 'food').length,
      needingWater: organisms.filter((organism) => organism.need === 'water').length,
      organismsWithTarget: organisms.filter((organism) => organism.target).length,
      averageNearestGrassDistance: averageNearestDistance(grass),
      averageNearestPondDistance: averageNearestDistance(ponds, (pond) => pond.r),
      averageVisionRange: organisms.length ? organisms.reduce((total, organism) =>
        total + organism.genes.visionRange, 0) / organisms.length : null,
      averageVisionAngle: organisms.length ? organisms.reduce((total, organism) =>
        total + organism.genes.visionAngle, 0) / organisms.length : null,
      averageVisionEnergy: organisms.length ? organisms.reduce((total, organism) =>
        total + visionEnergyMultiplier(organism.genes), 0) / organisms.length : null,
      visionConstraintViolations: organisms.filter((organism) =>
        organism.genes.visionAngle > maximumVisionAngleForRange(organism.genes.visionRange) + 1e-9).length
    };
    return { rawState: window.render_game_to_text(), diagnostic };
  }, advanceMilliseconds);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader']
  });
  const consoleErrors = [];
  const attachErrorCollection = (page) => {
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push({ type: 'console.error', text: message.text() });
    });
    page.on('pageerror', (error) => consoleErrors.push({ type: 'pageerror', text: String(error) }));
  };

  const movementPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  attachErrorCollection(movementPage);
  await movementPage.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await movementPage.goto(url, { waitUntil: 'domcontentloaded' });
  const isolatedProfiles = await movementPage.evaluate(() => {
    const organism = organisms[0];
    organisms = [organism];
    grass = [];
    grassRegrow = [];
    ponds = [];
    pairs = [];
    corpses = [];
    rain = null;
    updateRain = () => {};
    organism.genes.metabolism = 1;
    organism.genes.visionRange = VISION;
    organism.genes.visionAngle = VISION_ANGLE;
    organism.genes.maturity = 0;
    organism.genes.longevity = 1e9;
    organism.age = 30;
    organism.stage = 'adult';
    organism.mateCooldown = Infinity;
    organism.pair = null;
    organism.need = null;
    organism.target = null;
    organism.restTimer = Infinity;
    organism.eating = 0;
    organism.drinking = 0;
    organism.life = 100;
    const durationSeconds = 5;
    const samples = [];
    for (const speed of [0, WALK_SPEED, RUN_SPEED, RUN_SPEED * GENE_SPECS.speed.max]) {
      organism.x = canvas.clientWidth / 2;
      organism.y = canvas.clientHeight / 2;
      organism.heading = 0;
      organism.hunger = 100;
      organism.thirst = 100;
      for (let frame = 0; frame < durationSeconds * 60; frame++) {
        organism.speed = speed;
        update(1 / 60);
      }
      const movementLoad = (speed / RUN_SPEED) ** 2;
      const expectedHungerDrain = durationSeconds * BASE_HUNGER_DRAIN *
        (1 + movementLoad * MOVEMENT_HUNGER_COST);
      const expectedThirstDrain = durationSeconds * BASE_THIRST_DRAIN *
        (1 + movementLoad * MOVEMENT_THIRST_COST);
      samples.push({
        speed,
        durationSeconds,
        hungerDrain: 100 - organism.hunger,
        thirstDrain: 100 - organism.thirst,
        expectedHungerDrain,
        expectedThirstDrain,
        hungerError: Math.abs(100 - organism.hunger - expectedHungerDrain),
        thirstError: Math.abs(100 - organism.thirst - expectedThirstDrain)
      });
    }
    const visionSamples = [];
    const visionScenarios = [
      { label: 'mínima', visionRange: GENE_SPECS.visionRange.min, visionAngle: GENE_SPECS.visionAngle.min },
      { label: 'ampla e curta', visionRange: GENE_SPECS.visionRange.min, visionAngle: GENE_SPECS.visionAngle.max },
      { label: 'referência', visionRange: VISION, visionAngle: VISION_ANGLE },
      { label: 'longa e estreita', visionRange: GENE_SPECS.visionRange.max,
        visionAngle: maximumVisionAngleForRange(GENE_SPECS.visionRange.max) }
    ];
    for (const scenario of visionScenarios) {
      organism.genes.visionRange = scenario.visionRange;
      organism.genes.visionAngle = scenario.visionAngle;
      organism.hunger = 100;
      organism.thirst = 100;
      for (let frame = 0; frame < durationSeconds * 60; frame++) {
        organism.speed = 0;
        update(1 / 60);
      }
      const energyMultiplier = visionEnergyMultiplier(organism.genes);
      const expectedHungerDrain = durationSeconds * BASE_HUNGER_DRAIN * energyMultiplier;
      const expectedThirstDrain = durationSeconds * BASE_THIRST_DRAIN * energyMultiplier;
      visionSamples.push({
        ...scenario,
        energyMultiplier,
        hungerDrain: 100 - organism.hunger,
        thirstDrain: 100 - organism.thirst,
        expectedHungerDrain,
        expectedThirstDrain,
        hungerError: Math.abs(100 - organism.hunger - expectedHungerDrain),
        thirstError: Math.abs(100 - organism.thirst - expectedThirstDrain)
      });
    }
    const angleLimits = [GENE_SPECS.visionRange.min, VISION, GENE_SPECS.visionRange.max]
      .map((visionRange) => ({ visionRange, maximumVisionAngle: maximumVisionAngleForRange(visionRange) }));
    return { movementSamples: samples, visionSamples, angleLimits };
  });
  await movementPage.close();
  const movementProfile = { samples: isolatedProfiles.movementSamples };
  const visionProfile = { samples: isolatedProfiles.visionSamples, angleLimits: isolatedProfiles.angleLimits };

  const ecosystemPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  attachErrorCollection(ecosystemPage);
  await ecosystemPage.addInitScript(seededRandomScript(profileSeed), { seedValue: profileSeed });
  await ecosystemPage.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await ecosystemPage.goto(url, { waitUntil: 'domcontentloaded' });
  const timeline = [];
  let sample = await collectEcosystemSample(ecosystemPage);
  let state = parseState(sample.rawState);
  timeline.push(summarizeState(state, 0, sample.diagnostic));
  for (let elapsed = 5; elapsed <= profileDurationSeconds; elapsed += 5) {
    const started = Date.now();
    sample = await collectEcosystemSample(ecosystemPage, 5000);
    state = parseState(sample.rawState);
    timeline.push(summarizeState(state, Date.now() - started, sample.diagnostic));
    if (state.organisms.length > 1000) break;
  }
  await ecosystemPage.screenshot({ path: path.join(outputDir, 'ecosystem-final.png'), fullPage: true });
  await ecosystemPage.close();

  const interactionPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  attachErrorCollection(interactionPage);
  await interactionPage.addInitScript(seededRandomScript(profileSeed), { seedValue: profileSeed });
  await interactionPage.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await interactionPage.goto(url, { waitUntil: 'domcontentloaded' });
  const initialInteractionState = parseState(await interactionPage.evaluate(() => window.render_game_to_text()));
  const canvasBox = await interactionPage.locator('#arena').boundingBox();
  await interactionPage.mouse.click(canvasBox.x + 100, canvasBox.y + 100);
  const seededState = parseState(await interactionPage.evaluate(() => window.render_game_to_text()));
  await interactionPage.click('#inspect-toggle');
  const selectable = seededState.organisms.find((organism) => organism.x < 1000) || seededState.organisms[0];
  await interactionPage.mouse.click(canvasBox.x + selectable.x, canvasBox.y + selectable.y);
  const genesDialogOpen = await interactionPage.locator('#genes-dialog').evaluate((dialog) => dialog.open);
  const genesTitle = await interactionPage.locator('#genes-title').textContent();
  const genesNote = await interactionPage.locator('#genes-dialog .gene-note').textContent();
  await interactionPage.screenshot({ path: path.join(outputDir, 'genes.png'), fullPage: true });
  await interactionPage.click('#genes-close');
  await interactionPage.click('#evolution-toggle');
  const evolutionDialogOpen = await interactionPage.locator('#evolution-dialog').evaluate((dialog) => dialog.open);
  const legendCount = await interactionPage.locator('.series-toggle').count();
  const firstLegend = interactionPage.locator('.series-toggle').first();
  await firstLegend.click();
  const firstLegendPressed = await firstLegend.getAttribute('aria-pressed');
  await interactionPage.screenshot({ path: path.join(outputDir, 'interactions.png'), fullPage: true });
  const interactionProfile = {
    initialPopulation: initialInteractionState.organisms.length,
    populationAfterCanvasClick: seededState.organisms.length,
    canvasClickCreatedOrganism: seededState.organisms.length === initialInteractionState.organisms.length + 1,
    genesDialogOpen,
    genesTitle,
    genesNote,
    evolutionDialogOpen,
    legendCount,
    firstLegendPressedAfterClick: firstLegendPressed
  };
  await interactionPage.close();

  await browser.close();

  const result = {
    generatedAt: new Date().toISOString(),
    url,
    seed: profileSeed,
    profileDurationSeconds,
    movementProfile,
    visionProfile,
    ecosystemTimeline: timeline,
    interactionProfile,
    consoleErrors
  };
  fs.writeFileSync(path.join(outputDir, 'profile.json'), JSON.stringify(result, null, 2));

  const columns = Object.keys(timeline[0]);
  const csv = [columns.join(','), ...timeline.map((row) => columns.map((column) => row[column]).join(','))].join('\n');
  fs.writeFileSync(path.join(outputDir, 'ecosystem-timeline.csv'), `${csv}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

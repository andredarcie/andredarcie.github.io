const assert = require("assert");
const rules = require("./game-rules.js");

function findCard(id) {
  return rules.CARDS.find((card) => card.id === id);
}

function run() {
  const lockedBoard = [findCard("microservices"), null, null];
  const lockedState = rules.computeBoardState(lockedBoard, []);
  assert.strictEqual(lockedState.power < 0, true, "core card should need power first");

  const riskyBoard = [findCard("gohorse"), findCard("microservices"), null];
  const riskyState = rules.computeBoardState(riskyBoard, []);
  assert.strictEqual(riskyState.power >= 0, true, "boost card should unlock the expensive card");
  assert.ok(riskyState.debt > 0, "boost card should add debt");

  const cleanUpBoard = [findCard("gohorse"), findCard("observability"), null];
  const cleanEval = rules.evaluateBoard(cleanUpBoard, rules.OBJECTIVES[0], [], 1, 2);
  assert.strictEqual(cleanEval.debtAfter <= 2, true, "mitigation should reduce debt pressure");

  const rewards = rules.buildRewardChoices([], 2);
  assert.strictEqual(rewards.length, 2, "should build two reward choices");

  console.log("rules smoke test passed");
}

run();

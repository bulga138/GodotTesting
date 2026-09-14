// Level 5: step definitions for features/coin_collection.feature.
// Drives the player with REAL input (key_down/key_up holds) toward coin
// positions read through the driver API - no teleporting, no direct
// signal emission. Requires @godriver 0.2.x + cucumber-js.
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { MainScreen } from "../screens/MainScreen.js";

const SPEED_PX_PER_SEC = 300; // Player.SPEED

/** Hold a key for a real-time duration (key stays pressed across the sleep). */
async function holdKeyFor(driver, key, ms) {
	await driver.keyDown(key);
	await new Promise((r) => setTimeout(r, ms));
	await driver.keyUp(key);
}

/** Read a Vector2 property of a node. @returns {Promise<{x: number, y: number}>} */
async function readVec(driver, path, prop) {
  const data = await driver.request(`/node/${path}/property/${prop}`);
  return data.value;
}

/** List the Area2D children of Main (the coins). */
async function coinPaths(driver) {
  const info = await driver.request("/node/root/Main");
  const coins = [];
  for (const name of info.children) {
    if (name === "Player" || name === "HUD" || name.startsWith("Wall")) continue;
    try {
      const child = await driver.request(`/node/root/Main/${encodeURIComponent(name)}`);
      if (child.type === "Area2D") coins.push(`/root/Main/${name}`);
    } catch {
      // freed coin (already collected) - skip
    }
  }
  return coins;
}

/**
 * Move the player to within pickup range of (tx, ty) with real key holds:
 * read position, hold the needed direction keys for the computed frame
 * count, re-read, repeat. Tolerance 20px (coin radius 10 + player half 16
 * = ~26px pickup range; also avoids wall-hugging where the exact center
 * is unreachable).
 * @param {number} tx
 * @param {number} ty
 */
async function movePlayerTo(driver, tx, ty) {
	const TOL = 20;
	for (let leg = 0; leg < 12; leg++) {
		const pos = await readVec(driver, "/root/Main/Player", "position");
		const dx = tx - pos.x;
		const dy = ty - pos.y;
		if (Math.abs(dx) < TOL && Math.abs(dy) < TOL) return;
		// Time-based holds: frame counts are display-rate dependent in
		// windowed runs (process frames != fixed 60/s physics), so hold for
		// milliseconds instead. 20% margin for ramp-up/latency.
		const msFor = (d) => Math.max(16, ((Math.abs(d) - TOL * 0.5) / SPEED_PX_PER_SEC) * 1000 * 1.2);
		if (Math.abs(dx) > TOL) {
			await holdKeyFor(driver, dx > 0 ? "move_right" : "move_left", msFor(dx));
		}
		if (Math.abs(dy) > TOL) {
			await holdKeyFor(driver, dy > 0 ? "move_down" : "move_up", msFor(dy));
		}
	}
	throw new Error(`player did not reach target (${tx}, ${ty}) after 12 legs`);
}

/** Wait until score_label text matches, polling via assertText. */
async function assertScore(driver, expected) {
  await driver.assertText("test_id:score_label", expected, { timeoutMs: 10000 });
}

Given("the game is running with deterministic coin spawns", async function () {
  this.driver = await this.resetDriver();
  await this.driver.waitFrames(3);
  this.screen = new MainScreen(this.driver);
  await this.screen.assertVisible("score_label", { timeoutMs: 5000 });
});

When("the player touches a coin", async function () {
  const coins = await coinPaths(this.driver);
  assert.ok(coins.length > 0, "no coins found in the scene");
  const pos = await readVec(this.driver, coins[0], "position");
  await movePlayerTo(this.driver, pos.x, pos.y);
  await this.driver.waitFrames(3);
});

When("the player collects all {int} coins", async function (total) {
  for (let i = 0; i < 8; i++) {
    const coins = await coinPaths(this.driver);
    if (coins.length === 0) break;
    const pos = await readVec(this.driver, coins[0], "position");
    await movePlayerTo(this.driver, pos.x, pos.y);
    await this.driver.waitFrames(3);
  }
});

Then('the element with test_id {string} should have text {string}', async function (testId, expected) {
  await this.driver.assertText(`test_id:${testId}`, expected, { timeoutMs: 5000 });
});


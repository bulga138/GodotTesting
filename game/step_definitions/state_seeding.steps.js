// Game-state seeding steps (GTD-055): arrange a specific game state via
// property writes WITHOUT breaking the normal game flow. The player is
// teleported (white-box arrange), and "already picked" coins are delivered
// to the player's new position so the game's OWN pickup logic runs -
// score, label, and signals all update through the real code path.
import { Given, When } from "@cucumber/cucumber";

const SPEED_PX_PER_SEC = 300;

async function holdKeyFor(driver, key, ms) {
	await driver.keyDown(key);
	await new Promise((r) => setTimeout(r, ms));
	await driver.keyUp(key);
}

async function movePlayerTo(driver, tx, ty) {
	const TOL = 20;
	for (let leg = 0; leg < 12; leg++) {
		const pos = await driver.request("/node/root/Main/Player/property/position");
		const dx = tx - pos.value.x;
		const dy = ty - pos.value.y;
		if (Math.abs(dx) < TOL && Math.abs(dy) < TOL) return;
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

async function listCoins(driver) {
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

Given('the player is at "{int}, {int}" with {int} coins already collected', async function (x, y, picked) {
	const driver = await this.initDriver();
	// 1. Teleport the player (white-box arrange).
	await driver.setProperty("/root/Main/Player", "position", { x, y });
	await driver.waitFrames(2);
	// 2. Deliver `picked` coins to the player's position: the game's own
	//    body_entered pickup runs, so score/label update through the real
	//    code path - no counter writes, no flow break.
	for (let i = 0; i < picked; i++) {
		const coins = await listCoins(driver);
		if (coins.length === 0) break;
		const player = await driver.request("/node/root/Main/Player/property/position");
		await driver.setProperty(coins[0], "position", player.value);
		await driver.waitFrames(3);
	}
});

When("the player collects the remaining coins", async function () {
	for (let i = 0; i < 8; i++) {
		const coins = await listCoins(this.driver);
		if (coins.length === 0) return;
		const pos = await this.driver.request(`/node${coins[0]}/property/position`);
		await movePlayerTo(this.driver, pos.value.x, pos.value.y);
		await this.driver.waitFrames(3);
	}
});



// Level 3/5: pause behavior steps (features/pause.feature).
// Demonstrates the driver-works-while-paused contract: the Godriver
// autoload is PROCESS_MODE_ALWAYS, so reads and assertions keep working
// while get_tree().paused is true, while PAUSABLE game nodes freeze.
//
// Visibility is checked via /ui/layout's visible_in_tree (the node's own
// `visible` flag stays true when a parent hides it).
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";

/** Read the player position. @returns {Promise<{x: number, y: number}>} */
async function playerPos(driver) {
	const data = await driver.request("/node/root/Main/Player/property/position");
	return data.value;
}

/** visible_in_tree for a test_id target, via /ui/layout. */
async function visibleInTree(driver, testId) {
	const layout = await driver.layout(testId, { testId: true });
	return layout.visible_in_tree;
}

When("the player presses pause", async function () {
	await this.driver.pressKey("pause");
	await this.driver.waitFrames(2);
});

When("the player presses pause again", async function () {
	await this.driver.pressKey("pause");
	await this.driver.waitFrames(2);
});

Then('the element with test_id {string} should be visible', async function (testId) {
	assert.equal(await visibleInTree(this.driver, testId), true, `${testId} should be visible in tree`);
});

Then('the element with test_id {string} should not be visible', async function (testId) {
	assert.equal(await visibleInTree(this.driver, testId), false, `${testId} should not be visible in tree`);
});

Then("the player position should not change while paused", async function () {
	const before = await playerPos(this.driver);
	await this.driver.waitFrames(10);
	const after = await playerPos(this.driver);
	assert.deepEqual(after, before, "player moved while the tree is paused");
});

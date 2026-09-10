// Level 5: step definitions for features/coin_collection.feature.
// Requires @godriver + cucumber-js (docs/testing/03, section 6).
import { Given, When, Then } from '@cucumber/cucumber';
import { MainScreen } from '../screens/MainScreen.js';

Given('the game is running with RNG seeded to {int}', async function (seed) {
  await this.driver.reset();
  await this.driver.seed(seed);
  this.screen = new MainScreen(this.driver);
  await this.screen.assertVisible('score_label', { timeout: 3000 });
});

When('the player touches a coin', async function () {
  await this.screen.moveTowardCoin();
});

Then(
  'the element with test_id {string} should have text {string}',
  async function (testId, expected) {
    await this.driver.assertText(`test_id:${testId}`, expected, { timeout: 3000 });
  }
);

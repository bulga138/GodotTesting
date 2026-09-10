// Level 5: hooks (docs/testing/03, section 6.3).
import { Before, After } from '@cucumber/cucumber';

Before(async function () {
  await this.driver.reset();
});

After(async function (scenario) {
  if (scenario.result.status === 'FAILED') {
    await this.screenshot.capture(`failure-${scenario.pickle.name}`);
  }
});

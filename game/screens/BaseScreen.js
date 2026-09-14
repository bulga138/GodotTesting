// Level 5: base class for Screen Objects (docs/testing/03, section 6.1).
// Requires the @godriver addon at runtime (vendored as addons/godriver) and
// test_id metadata on the nodes under interaction.
export class BaseScreen {
  constructor(driver) {
    this.driver = driver;
  }

  async assertVisible(testId, options = {}) {
    await this.driver.assertVisible(`test_id:${testId}`, options);
  }

  async click(testId) {
    await this.driver.click(`test_id:${testId}`);
  }

  async type(testId, text) {
    await this.driver.type(`test_id:${testId}`, text);
  }

  // Wait for a signal emitted by a node in the current scene.
  async waitForSignal(name, timeoutMs, target = '/root/Main') {
    await this.driver.waitSignal(target, name, { timeoutMs });
  }
}

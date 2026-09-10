// Level 5: base class for Screen Objects (docs/testing/03, section 6.1).
// Requires the godot-test-driver addon at runtime.
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

  async waitForSignal(name, timeoutMs) {
    await this.driver.waitForSignal(name, timeoutMs);
  }
}

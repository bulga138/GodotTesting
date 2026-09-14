// Level 5: Cucumber World for the GodotTesting demo.
// The driver connects to the game launched with `godot --path . -- --test-driver`.
import { setWorldConstructor, World, setDefaultTimeout } from "@cucumber/cucumber";

setDefaultTimeout(30000);

class DemoWorld extends World {
  constructor(options) {
    super(options);
    this._driver = null;
  }

  async initDriver() {
    if (!this._driver) {
      const { connect } = await import("@godriver/core");
      const port = this.parameters?.port ?? 9090;
      const host = this.parameters?.host ?? "127.0.0.1";
      this._driver = await connect(port, { host });
    }
    return this._driver;
  }

  // Reset that tolerates the benign 409 STATE_AUTOLOAD_MISSING (no GameState in this demo).
  async resetDriver() {
    const driver = await this.initDriver();
    try {
      await driver.reset({ tweenMode: "await" });
    } catch (err) {
      if (err.code !== "STATE_AUTOLOAD_MISSING") throw err;
    }
    return driver;
  }
}

setWorldConstructor(DemoWorld);


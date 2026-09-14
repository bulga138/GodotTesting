// Level 5: Screen Object for the demo's main scene.
import { BaseScreen } from './BaseScreen.js';

export class MainScreen extends BaseScreen {
  // The driver injects press+release in the same frame (no key-down/key-up
  // split endpoint yet), so a "hold" is emulated as repeated taps with
  // frame waits between them.
  async moveTowardCoin() {
    for (let i = 0; i < 10; i++) {
      await this.driver.pressKey('move_right');
      await this.driver.waitFrames(3);
    }
  }

  async togglePause() {
    await this.driver.pressKey('pause');
  }

  async waitForWin() {
    await this.waitForSignal('collected', 30000, '/root/Main/Player');
  }
}

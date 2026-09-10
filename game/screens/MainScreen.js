// Level 5: Screen Object for the demo's main scene.
import { BaseScreen } from './BaseScreen.js';

export class MainScreen extends BaseScreen {
  async moveTowardCoin() {
    await this.driver.holdAction('move_right', 500);
  }

  async togglePause() {
    await this.driver.pressAction('pause');
  }

  async waitForWin() {
    await this.waitForSignal('collected', 30000);
  }
}

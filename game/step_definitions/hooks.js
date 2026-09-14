// Level 5: hooks (docs/testing/03, section 6.3).
import { Before, After } from '@cucumber/cucumber';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

Before(async function () {
  this.driver = await this.resetDriver();
});

After(async function (scenario) {
  if (scenario.result.status === 'FAILED') {
    // Capture a failure screenshot (windowed runs only; /screenshot/*
    // rejects headless with 400 HEADLESS_RENDERING_DISABLED).
    try {
      const shot = await this.driver.screenshot();
      const dir = join('artifacts', 'failures');
      await mkdir(dir, { recursive: true });
      const name = `failure-${scenario.pickle.name.replace(/[^a-z0-9_-]+/gi, '_')}.png`;
      await writeFile(join(dir, name), Buffer.from(shot.buffer));
      console.log(`failure screenshot: ${join(dir, name)}`);
    } catch (err) {
      console.warn(`failure screenshot unavailable: ${err.message}`);
    }
  }
});


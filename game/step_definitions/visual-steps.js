// Visual-regression step (GTD-052) with the demo's baseline convention:
// baselines/ (git-tracked) + artifacts/visual/ (gitignored).
// Requires a WINDOWED game: /screenshot/* endpoints reject headless runs
// (400 HEADLESS_RENDERING_DISABLED). Run via `npm run test:visual`.
import { Then } from "@cucumber/cucumber";
import { BaselineStore, assertMatchesBaseline } from "@godriver/visual";

Then("the screen should match baseline {string}", async function (name) {
  const driver = await this.initDriver();
  const store = new BaselineStore({ dir: "baselines", artifactsDir: "artifacts/visual" });
  await assertMatchesBaseline(store, name, {
    screenshot: driver.screenshot.bind(driver),
    driverLabel: "godottesting-demo",
  });
});

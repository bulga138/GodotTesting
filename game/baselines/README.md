Baselines for Level 4 visual regression.

This directory ships with BASELINE_DRIVER only. The PNG baselines are
captured per the recipe in docs/testing/03-implementation-guide.md, section 5:

    xvfb-run --auto-servernum godot --rendering-driver opengl3 --test-driver

Suggested first captures for this demo:

    main_menu.png      the arena at frame 1, before any input
    workshop_friday.png  the arena after collecting the first coin

Never capture on a local GPU (anti-pattern A9). Every baseline update
requires art direction review.

## The GTD-052 workflow

The recommended assertion path is `assertMatchesBaseline` from `@godriver/visual`:

```javascript
import { BaselineStore, assertMatchesBaseline } from '@godriver/visual';

const store = new BaselineStore({ dir: 'baselines' });
await assertMatchesBaseline(store, 'main_menu', {
  screenshot: driver.screenshot.bind(driver),
  threshold: 0.01,
});
```

- `UPDATE_BASELINE=true` captures/regenerates `<name>.png` + `<name>.json` sidecar.
- Mismatch writes `artifacts/visual/<name>/{actual,diff,report}.png|html` and throws with the report path.
- Baselines are git-tracked; `artifacts/` is gitignored.
- Screenshots require a windowed game (headless returns `400 HEADLESS_RENDERING_DISABLED`); use `xvfb` in CI.
- Responsive testing: `driver.resize(w, h)` changes the root window at runtime; name baselines per resolution and restore afterwards.

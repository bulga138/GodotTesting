# STATUS

Last updated: 2026-09-14

## Demo test suites (game/)

| Suite | Command | Status |
| --- | --- | --- |
| E2E coin collection (real input holds) | `npm test` | GREEN - 2/2 scenarios |
| E2E pause behavior (driver works while paused) | `npm test` | GREEN - 2/2 scenarios |
| E2E state seeding (teleport + delivered coins) | `npm test` | GREEN - 1/1 scenario |
| Visual regression (arena baseline) | `npm run test:visual` | GREEN - 1/1 (windowed game required) |
| Unit / integration (Levels 2-3) | GdUnit4 | NOT CONFIGURED (reference docs only) |
| Static audits (Level 1) | `python game/tools/ci/generate_report.py` | see dashboard |

## Recent changes

- 2026-09-14: Levels 4-5 made runnable - vendored godriver addon, test_id metadata, real-input coin collection, pause feature, state seeding via property writes (GTD-055). See [.github/issues/001-runnable-e2e-demo.md](.github/issues/001-runnable-e2e-demo.md).
- 2026-09-14: Game fixes from the tests - pause menu visible flag restored, unpause-via-input fixed (game.gd PROCESS_MODE_ALWAYS + Player PAUSABLE), arena baseline regenerated.

## Notes

- E2E runs headless; visual runs require the windowed game (`godot --path game -- --test-driver`).
- Arrangement patterns: black-box (real input) and white-box seeding (property writes) - docs/testing/03 §6.0.

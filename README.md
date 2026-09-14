# GodotTesting

A documentation-first repository for testing Godot games. The docs define a five-level test strategy. A small playable demo shows how each level works in practice.

## What's Inside

**`docs/testing/`** (8 documents): a complete test strategy for Godot, organized as a safety net that catches bugs at increasing levels of integration:

1. Static validation: file integrity, locale keys, project imports
2. Isolated logic: pure rules without loading any scene
3. Component integration: real scenes, real input, real physics
4. Visual regression: screenshot comparison against baselines
5. E2E BDD: player journeys written in Gherkin

**`game/`**: a minimal top-down coin collector. Move a blue square with WASD or arrow keys, pick up 8 yellow coins, press Esc to pause. No external assets, no sprites, no audio. Every shape is a Godot primitive. The point is testable structure, not gameplay.

## How the Demo Maps to the Test Levels

| Level | What it covers | Where in the demo |
|---|---|---|
| 1. Static | Locale audits, resource mutation checks, puzzle DAG solving | `tools/ci/`, `locales/`, `data/puzzle_dependency_chart.json` |
| 2. Isolated | Pure logic, no scene dependency | `scripts/inventory.gd` (RefCounted) |
| 3. Integration | Movement, collision, pause behavior | `scripts/player.gd`, `scripts/game.gd` |
| 4. Visual | Screenshot baselines | `baselines/` |
| 5. E2E | Full player journeys | `features/coin_collection.feature`, `screens/`, `step_definitions/` |

## Running the Demo

```bash
godot --path game
```

Validate like CI would (headless import check):

```bash
godot --headless --path game --import
```

`reports/dashboard.html` shows the status of every automated check: green for passing, grey for not yet configured. Auto-refreshes every 60 seconds. Runs in-browser with no server required. Toggle between light and dark themes.

Generate it:

```bash
python game/tools/ci/generate_report.py --godot godot
```

## The Test Suites

The E2E and visual suites in `game/` are **runnable for real**: the godriver
addon is vendored at `game/addons/godriver` (plus `godottpd`), the HUD nodes
carry `test_id` metadata, and the steps drive the player with real input
(`key_down`/`key_up` holds toward coin positions read through the API).

```bash
# 1. install the JS tooling (published @godriver packages)
cd game && npm install

# 2. launch the game with the driver active (terminal 1)
godot --path game -- --test-driver

# 3. run the E2E suite (terminal 2)
npm test

# 4. visual regression (requires the WINDOWED game from step 2)
npm run test:visual
```

# 5. generate Screen Objects from the live scene tree
node node_modules/@godriver/cli/bin/godriver.js generate --out screens.generated.js

What the suites cover:

- **E2E (`npm test`)**: coin collection driven by real input holds, and
  pause behavior - the driver keeps working while the game is paused
  (the addon runs with `PROCESS_MODE_ALWAYS`), while PAUSABLE game nodes
  freeze. Visibility is asserted via `/ui/layout` `visible_in_tree`.
- **Visual (`npm run test:visual`)**: screenshot baseline of the arena
  (`baselines/arena.png`, git-tracked). Mismatch writes a self-contained
  HTML report under `artifacts/visual/` (gitignored). Recapture with
  `UPDATE_BASELINE=true npm run test:visual`.

Unit and integration tests (Levels 2-3) require **GdUnit4** (Document 04
covers setup). Install per the [CI/CD & Tooling Reference](docs/testing/04-ci-cd-tooling-reference.md).

## Project Layout

The `game/` folder follows the structure recommended in the Implementation Guide:

```
game/
  tests/unit/          # Pure logic tests
  tests/integration/   # Scene-level tests
  tests/fixtures/      # Calibration maps
  features/            # Gherkin feature files
  step_definitions/    # Cucumber step defs
  screens/             # Screen Objects for E2E
  baselines/           # Visual regression captures
  tools/ci/            # Automated audit scripts
  locales/             # Translation files
  data/                # Puzzle DAG and game data
```

## Reading Order for New Contributors

1. [05 Onboarding Playbook](docs/testing/05-onboarding-playbook.md): write your first test in about 30 minutes
2. Open `game/` in the editor and read the scripts
3. [02 Technical Testing Standard](docs/testing/02-technical-testing-standard.md) for the rules, [03 Implementation Guide](docs/testing/03-implementation-guide.md) for the recipes



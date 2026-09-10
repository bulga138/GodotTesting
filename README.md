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

## Quality Dashboard

`reports/dashboard.html` shows the status of every automated check: green for passing, grey for not yet configured. Auto-refreshes every 60 seconds. Runs in-browser with no server required. Toggle between light and dark themes.

Generate it:

```bash
python game/tools/ci/generate_report.py --godot godot
```

## The Test Suites

Reference implementations of the patterns in the docs. They require:

- **GdUnit4** for unit and integration tests (Document 04 covers setup)
- **@godriver** + **cucumber-js** for E2E BDD tests

Install per the [CI/CD & Tooling Reference](docs/testing/04-ci-cd-tooling-reference.md).

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

# Onboarding Playbook

**Document ID:** 05
**Audience:** New developers, contractors, junior GDScript developers
**Status:** Tutorial
**Companion documents:** [03 Implementation Guide](03-implementation-guide.md), [04 CI/CD & Tooling Reference](04-ci-cd-tooling-reference.md)

> Welcome. This document gets you from `git clone` to a running test in about half an hour. It assumes no prior experience with the testing framework. For normative rules, see [02 Technical Testing Standard](02-technical-testing-standard.md).

---

## 1. Setup (5 minutes)

### 1.1 Clone and Open

```bash
git clone https://github.com/bulga138/GodotTesting.git
cd GodotTesting/game
```

Open the `game/` folder in Godot 4.7 or later. The project name is "Testing Demo".

### 1.2 Run the Demo

Press **F5** in the editor. You get a coin collector: move the character with arrow keys, collect 8 coins, press Escape to pause/unpause.

### 1.3 Install GdUnit4 (for Level 2/3 tests)

The unit and integration tests require the GdUnit4 addon. See [04 CI/CD & Tooling Reference](04-ci-cd-tooling-reference.md) for installation. Without it, the Level 1 checks still run.

---

## 2. Level 1 Checks (no addon required)

These run with just Python and Godot. No GdUnit4 needed.

### 2.1 Locale Audit

```bash
cd game
python tools/ci/audit_locales.py --source locales/en.csv --target locales/ --max-expansion 1.35
```

Checks that every locale key exists and translation expansion stays within 35% of English.

### 2.2 Resource Mutation Audit

```bash
cd game
python tools/ci/audit_resource_mutations.py
```

Scans test files for direct `.resource` or `.tres` writes that would corrupt cached resources.

### 2.3 Puzzle DAG Solver

```bash
cd game
godot --headless --path . --script res://tools/pdc_solver.gd
```

Verifies all game endings are reachable and no dead-end cycles exist in the puzzle graph.

### 2.4 Generate Dashboard

```bash
cd game
python tools/ci/generate_report.py --godot godot --out ../reports/dashboard.html
```

Runs all Level 1 checks and renders `reports/dashboard.html` with pass/fail status.

---

## 3. Tutorial 1. Your First Unit Test (5 minutes)

### 3.1 The Code Under Test

The project includes an `Inventory` class used by the coin collector:

```gdscript
# game/scripts/inventory.gd (autoloaded or referenced in game.gd)
class_name Inventory
extends RefCounted

var items: Dictionary = {}

func add(item: String, count: int) -> void:
    items[item] = items.get(item, 0) + count

func count(item: String) -> int:
    return items.get(item, 0)
```

### 3.2 The Test

The project already has `game/tests/unit/test_inventory_rules.gd`:

```gdscript
extends GdUnitTestSuite

func test_stacking_two_partial_stacks_merges() -> void:
    var inv := Inventory.new()
    inv.add("coin", 3)
    inv.add("coin", 2)
    assert_int(inv.count("coin")).is_equal(5)
```

### 3.3 Run It

In the GdUnit4 panel, click the play icon next to `test_inventory_rules.gd`. All three tests should pass.

From the CLI:

```bash
cd game
godot --headless --path . -s addons/gdUnit4/bin/GdUnitCmdTool.gd -a res://tests/unit
```

---

## 4. Tutorial 2. Your First Scene Test (10 minutes)

### 4.1 The Test

The project has `game/tests/integration/test_player_movement.gd`:

```gdscript
extends GdUnitTestSuite

func test_character_horizontal_run_matches_velocity() -> void:
    var runner := scene_runner("res://tests/fixtures/movement_test_map.tscn")
    var player := runner.find_child("Player") as CharacterBody2D

    runner.simulate_action_press("move_right")
    await runner.await_input_processed()
    await runner.simulate_frames(10)

    assert_float(player.velocity.x).is_greater(150.0)
```

### 4.2 Run It

```bash
cd game
godot --headless --path . -s addons/gdUnit4/bin/GdUnitCmdTool.gd -a res://tests/integration
```

The pause menu test verifies that pressing Escape toggles `get_tree().paused` correctly.

---

## 5. Tutorial 3. Your First E2E Scenario (5 minutes)

### 5.1 Project Structure

E2E tests live in `game/`:

- `features/` - Gherkin feature files
- `step_definitions/` - JavaScript step definitions
- `screens/` - Screen Object wrappers

### 5.2 Run It

```bash
cd game
# Terminal 1: start the game with the driver
godot --test-driver

# Terminal 2: run Gherkin scenarios
npx cucumber-js features/ --require support/
```

---

## 6. Troubleshooting Cookbook

### "Why did my test fail with `ORPHAN_NODE_DETECTED`?"

You created a node without registering it for cleanup. Fix:

```gdscript
# Wrong
var node := Node.new()

# Right
var node := auto_free(Node.new())
```

`auto_free()` tells GdUnit4 to free the node after the test. Manual `queue_free()` in teardown is forbidden; it leaks across tests.

### "Why does my click test pass locally but fail in headless CI?"

Two common causes:

1. **Input not flushed.** Under `--headless`, `Input.parse_input_event()` does nothing. The driver handles this automatically for targeted clicks, but if you are writing a custom step for a global key, you must call `Input.flush_buffered_events()` afterward.
2. **Missing virtual display.** Visual tests require `xvfb-run`. If your test takes a screenshot, it cannot run under `--headless`.

### "Why did my visual baseline fail?"

Check three things:

1. **Was the baseline captured with `opengl3` + `llvmpipe`?** A Vulkan baseline will not match CI.
2. **Did the UI genuinely change?** If yes, review and update the baseline intentionally.
3. **Is a volatile element in the frame?** Timers, FPS counters, and clocks must be excluded via mask.

### "My E2E test times out. Where do I look?"

1. Check the JUnit XML artifact in CI.
2. Check the Godot stderr dump from the `@godriver/cli` watchdog.
3. Common causes: scene `_ready()` hangs (returns `504`), engine crash (exit code 2), or port collision (override with `--test-driver-port=N`).

---

## 7. Where to Go Next

| If you want to...           | Read...                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| Understand the full pyramid | [01 Testing Strategy Overview](01-testing-strategy-overview.md)   |
| Know the mandatory rules    | [02 Technical Testing Standard](02-technical-testing-standard.md) |
| Write more advanced tests   | [03 Implementation Guide](03-implementation-guide.md)             |
| Configure or debug CI       | [04 CI/CD & Tooling Reference](04-ci-cd-tooling-reference.md)     |

---

## 8. Getting Help

- For GdUnit4 issues: check the GdUnit4 documentation or open an issue.
- For `@godriver` issues: see `spec/SPEC.md` for the HTTP contract.
- For CI issues: see the failure triage guide in [04 CI/CD & Tooling Reference](04-ci-cd-tooling-reference.md).

Welcome to the team.

# Implementation Guide

**Document ID:** 03
**Audience:** Gameplay programmers, UI scripters, QA engineers
**Status:** Procedural guide
**Companion documents:** [02 Technical Testing Standard](02-technical-testing-standard.md), [04 CI/CD & Tooling Reference](04-ci-cd-tooling-reference.md), [05 Onboarding Playbook](05-onboarding-playbook.md)

> This document shows **how** to satisfy the rules in Document 02. It contains patterns, recipes, and directory structures — not normative requirements. If a rule here conflicts with Document 02, Document 02 wins.

---

## 1. Directory Layout

```
project/
├── tests/
│   ├── unit/                    ← GdUnit4 unit suites (Level 2)
│   ├── integration/             ← GdUnit4 SceneRunner suites (Level 3)
│   └── fixtures/                ← Reusable test scenes and resources
│       └── movement_test_map.tscn
├── features/                    ← Gherkin .feature files (Level 5)
├── step_definitions/            ← Custom step implementations (Level 5)
├── screens/                     ← Screen Objects (Level 5)
├── baselines/                   ← Visual baselines (Level 4)
│   └── BASELINE_DRIVER
├── tools/
│   ├── pdc_solver.gd            ← Custom DAG solver (Level 1)
│   └── ci/
│       ├── audit_locales.py     ← Localization QA (Level 1)
│       └── audit_resource_mutations.py
└── addons/
    └── godot-test-driver/       ← E2E driver addon
```

---

## 2. Level 1 — Static Audits

### 2.1 Asset Import Validation

Run in CI before every other step:

```bash
godot --headless --import
```

A non-zero exit code means an asset is missing or a UID reference is broken. Never suppress this step.

### 2.2 Localization QA

Create `tools/ci/audit_locales.py` to:

1. Load `res://locales/en.csv` as the source of truth.
2. Verify every key in `en.csv` exists in every target locale.
3. Flag any target string whose length exceeds the source by more than 35%.

Invoke in CI:

```bash
python3 tools/ci/audit_locales.py \
  --source res://locales/en.csv \
  --target res://locales/ \
  --max-expansion 1.35
```

### 2.3 Conditional DAG Solver

Only runs when `res://data/puzzle_dependency_chart.tres` exists. The solver:

- Parses the PDC into a directed graph.
- Asserts reachability from the initial state to every defined ending.
- Asserts the absence of cyclic dependency locks.
- Asserts no required item is gated behind an inaccessible timeline state.

Invoke in CI:

```bash
if [ -f "res://data/puzzle_dependency_chart.tres" ]; then
  godot --headless --script res://tools/pdc_solver.gd
fi
```

**Note:** `godot_puzzle_dependencies` is a visualization addon; the CI solver must be authored. `gdcruiser` can supplement with general static dependency analysis across `.gd` and `.tscn` files.

### 2.4 Resource Mutation Audit Tool

Create `tools/ci/audit_resource_mutations.py` to statically verify Policy 2 (`duplicate(true)` requirement) during CI. It parses test scripts to detect any direct assignments on disk-backed `.tres` resources without deep copies:

```python
#!/usr/bin/env python3
"""Audit test scripts for resource mutations without duplicate(true).

Scans tests/ for .tres loads followed by property assignments that
lack a duplicate(true) call. Fails CI if any are found.
"""
import os
import re
import sys

# Match: var x = load("...tres") or preload("...tres")
MUTATION_PATTERN = re.compile(
    r'(\w+)\s*=\s*(?:load|preload)\s*\(\s*[\'"][^\'"]*\.tres[\'"]\s*\)'
)
WRITE_PATTERN = re.compile(r'(\w+)\.\w+\s*=')

failed = False
for root, _, files in os.walk("tests/"):
    for f in files:
        if not f.endswith(".gd"):
            continue
        path = os.path.join(root, f)
        with open(path, "r", encoding="utf-8") as handle:
            content = handle.read()
        loaded_vars = set(MUTATION_PATTERN.findall(content))
        for var in loaded_vars:
            if re.search(rf'{var}\.\w+\s*=', content):
                print(
                    f"ERROR: {path} mutates cached resource "
                    f"'{var}' without duplicate(true)!"
                )
                failed = True

sys.exit(1 if failed else 0)
```

**Origin note:** This script is project-authored, not a third-party dependency. The pattern is inspired by `godot-auditor`'s lifecycle checks but is specific to this project's `duplicate(true)` policy.

---

## 3. Level 2 — Unit Logic

### 3.1 Suite Structure

```gdscript
# res://tests/unit/test_inventory_rules.gd
extends GdUnitTestSuite

func test_stacking_two_partial_stacks_merges() -> void:
    var inv := Inventory.new()
    inv.add("wrench", 3)
    inv.add("wrench", 2)
    assert_int(inv.count("wrench")).is_equal(5)
```

### 3.2 Parameterized Tests

Use `@TestCase` for boundary conditions:

```gdscript
@TestCase(0, 0, 0)
@TestCase(3, 5, 15)
@TestCase(-1, 5, 0)  # negative damage clamps to zero
func test_damage_calculation(base: int, mult: int, expected: int) -> void:
    assert_int(DamageCalculator.compute(base, mult)).is_equal(expected)
```

### 3.3 Variant Serializer Round-Trip

```gdscript
func test_rect2_serialization_roundtrip() -> void:
    var original := Rect2(10.0, 20.0, 100.0, 50.0)
    var json_data: Dictionary = VariantSerializer.to_json(original)
    assert_float(json_data["x"]).is_equal(10.0)
    assert_float(json_data["w"]).is_equal(100.0)
    var restored: Rect2 = VariantSerializer.from_json(json_data, TYPE_RECT2)
    assert_object(restored).is_equal(original)
```

Cover Vector2/3/4, Rect2, Transform2D/3D, Basis, Quaternion, Color, NodePath.

### 3.4 Save Integrity & Migration

Save files are the most common source of "works on my machine" bugs in shipped games. Test them at the unit level, not at the E2E level — the failure modes are deterministic and cheap to isolate.

**Coverage checklist:**

1. **Checksum validation** — reject tampered or truncated saves
2. **Version field enforcement** — reject unknown future versions; migrate known past versions
3. **Migration path** — every shipped version has a fixture; v1 → v2 → latest preserves semantic state
4. **Corrupt-file handling** — graceful failure with a typed error, never a crash
5. **Round-trip parity** — save on latest, load on latest, assert deep equality

```gdscript
# res://tests/unit/test_save_migration.gd
extends GdUnitTestSuite

const FIXTURE_V1 := "res://tests/fixtures/saves/save_v1.json"
const FIXTURE_V2 := "res://tests/fixtures/saves/save_v2.json"

func test_v1_migrates_to_latest_preserving_inventory() -> void:
    var raw := FileAccess.get_file_as_string(FIXTURE_V1)
    var save := SaveData.from_json(raw)
    save.migrate_to_latest()
    assert_int(save.version).is_equal(SaveData.CURRENT_VERSION)
    assert_array(save.items).contains("wrench")

func test_checksum_mismatch_rejected() -> void:
    var tampered := { "version": 2, "checksum": "deadbeef", "payload": {} }
    var result := SaveData.try_load(tampered)
    assert_bool(result.ok).is_false()
    assert_int(result.error_code).is_equal(SaveData.ERR_CHECKSUM_MISMATCH)

func test_unknown_future_version_rejected() -> void:
    var future := { "version": 9999, "payload": {} }
    assert_int(SaveData.try_load(future).error_code).is_equal(
        SaveData.ERR_UNKNOWN_VERSION
    )
```

**Policy:** Fixtures for every shipped save version MUST live in `tests/fixtures/saves/` and MUST be exercised on every PR. Deleting a version fixture is a breaking change requiring explicit sign-off from the technical director.

**Out of scope for automated tests:** anti-cheat (encryption, server-authoritative checks), cloud-save conflict resolution, and platform SDK sync. These are separate domains with separate test strategies.

---

---

## 4. Level 3 — Scene Integration

### 4.1 The Movement Fixture

Create `res://tests/fixtures/movement_test_map.tscn` with:

- Flat ground, slopes at 15°/30°/45°
- Walls at known distances
- Gaps of known widths
- Collision layers matching production

Never run movement tests inside production rooms.

### 4.2 SceneRunner Recipe

```gdscript
# res://tests/integration/test_player_movement.gd
extends GdUnitTestSuite

func test_character_horizontal_run_matches_velocity() -> void:
    var runner := scene_runner("res://tests/fixtures/movement_test_map.tscn")
    var player := runner.find_child("Player") as CharacterBody2D

    runner.simulate_action_press("move_right")
    await runner.await_input_processed()  # flush + one full frame cycle
    await runner.simulate_frames(10)      # settle physics

    assert_float(player.velocity.x).is_greater(150.0)

    runner.simulate_action_release("move_right")
    await runner.simulate_frames(5)
```

### 4.3 Pause-Mode Tests

```gdscript
func test_pause_menu_remains_interactive_while_paused() -> void:
    var runner := scene_runner("res://scenes/pause_menu.tscn")
    var menu := runner.scene() as Control
    get_tree().paused = true
    await runner.simulate_frames(1)
    assert_int(menu.process_mode).is_equal(Node.PROCESS_MODE_WHEN_PAUSED)
    # simulate click on the resume button
    runner.simulate_action_press("ui_accept")
    await runner.await_input_processed()
    await runner.await_signal_on(menu, "resume_requested", [], 1000)
    get_tree().paused = false
```

`await_signal_on` waits for the specified signal to be emitted by a particular source node within a timeout, replacing the looser `assert_signal_emitted` pattern for scene-bound signals.

### 4.4 Input Echo Filtering

`input_echo_filter.gd` is an authored pattern, not a built-in. Filter `InputEventKey.echo` events so UI navigation keys do not leak into gameplay:

```gdscript
func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventKey and event.is_echo():
        return
    # normal handling
```

Test explicitly: while a modal is open, `ui_down` must not move the player.

---

## 5. Level 4 — Visual Regression

### 5.1 Local Capture

Run under virtual display:

```bash
xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" \
  godot --rendering-driver opengl3 --test-driver
```

### 5.2 Baseline Directory

```
baselines/
├── BASELINE_DRIVER     ← "opengl3-llvmpipe-linux"
├── main_menu.png
├── workshop_friday.png
└── workshop_sunday.png
```

`BASELINE_DRIVER` is a proposed project convention, not an industry standard. It documents the driver, OS, and rendering backend used to capture the baselines.

### 5.3 Exclusion Masks

For volatile elements (timers, FPS counters), define masks by `test_id`:

```javascript
await visual.compare('hud', {
  mask: ['test_id:fps_counter', 'test_id:clock_display'],
  threshold: 0.01,
});
```

### 5.4 Updating Baselines

Only update baselines intentionally:

```bash
UPDATE_BASELINE=true npx cucumber-js features/visual/
```

Every update must be reviewed by art direction before merging.

### 5.5 Accessibility Checks

Visual regression catches unintended _changes_; accessibility checks catch _unusable_ designs. Run these at Level 4 alongside visual baselines.

**Minimum checklist per screen:**

| Check                   | How to verify                                   | Automation                                       |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------ |
| Text contrast           | WCAG AA: 4.5:1 body, 3:1 large                  | `sharp` pixel sampling on known text regions     |
| UI element contrast     | WCAG AA: 3:1 interactive elements               | Same                                             |
| No color-only signaling | Grayscale baseline comparison                   | Second baseline captured with saturation filter  |
| Focus traversal         | Every interactive element reachable by keyboard | GdUnit4: simulate `ui_focus_next` until cycle    |
| Remappable keys         | All gameplay actions remappable                 | GdUnit4: `InputMap.action_set_events` round-trip |
| Caption parity          | Voiced content has captions                     | Static audit: audio assets vs. caption file keys |

**What automation cannot verify:** caption accuracy, colorblind-mode usability, and subtitle timing comfort. Automate the mechanical checks; schedule human review for the rest.

---

## 6. Level 5 — E2E BDD

### 6.1 Screen Objects

Every screen gets a class extending `BaseScreen.js`:

```javascript
// screens/WorkshopScreen.js
import { BaseScreen } from './BaseScreen.js';

export class WorkshopScreen extends BaseScreen {
  async depositItem(itemName) {
    await this.click(`test_id:deposit_button`);
    await this.type(`test_id:item_input`, itemName);
    await this.click(`test_id:confirm_button`);
  }

  async waitForCraftComplete() {
    await this.waitForSignal('craft_complete', 10000);
  }
}
```

### 6.2 Gherkin Features

```gherkin
Scenario: Aging dough into sourdough slime
  Given the game is running with RNG seeded to 42
  And the current temporal state is "Friday"
  When I navigate to the "Kitchen"
  And I deposit "Raw Dough" into the "Dumbwaiter"
  And I shift the temporal state to "Sunday"
  And I retrieve the transformed item from the "Dumbwaiter"
  Then the inventory should contain "Acidic Mother Slime"
  And the element with test_id "status_callout" should have text "Pungent and Fermented"
```

### 6.3 The `/reset` Hook

```javascript
// support/hooks.js
import { Before, After } from '@cucumber/cucumber';

Before(async function () {
  await this.driver.reset();
});

After(async function (scenario) {
  if (scenario.result.status === 'FAILED') {
    await this.screenshot.capture(`failure-${scenario.pickle.name}`);
  }
});
```

### 6.4 Auto-Retrying Assertions

Assertions poll until a deadline (default 3000ms, interval 50–100ms):

```javascript
await this.driver.assertVisible('test_id:main_menu', { timeout: 3000 });
```

Never use `sleep()` or `await new Promise(r => setTimeout(r, n))` in step definitions.

---

## 7. Common Pitfalls

| Symptom                              | Cause                                           | Fix                                                                |
| ------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------ |
| Test passes locally, fails in CI     | Missing `xvfb` for visual, or input not flushed | Use `Input.flush_buffered_events()` in global paths; enable `xvfb` |
| Orphan node warning                  | Node not registered with `auto_free()`          | Wrap node creation: `var n := auto_free(Node.new())`               |
| Flaky physics assertion              | Asserting before physics settles                | Add `simulate_frames(n)` after input                               |
| Visual baseline fails cross-platform | Driver mismatch                                 | Recapture with `opengl3` + `llvmpipe` on Linux                     |
| Puzzle test times out at `/reset`    | Scene `_ready()` hangs                          | Check for async init in `_ready()`; return `504` intentionally     |
| State mutation leaks across tests    | Missing `duplicate(true)`                       | Duplicate resource before mutation                                 |

---

## 8. Anti-Patterns

Every MUST/SHOULD rule in Document 02 has a corresponding "what not to do." Each entry below pairs a real failure mode with its correct form.

### A1. Wall-Clock Timers

```gdscript
# WRONG — depends on OS scheduling; subject to Engine.time_scale
await get_tree().create_timer(1.0).timeout

# RIGHT — deterministic, frame-based
await runner.simulate_frames(60)
```

### A2. Manual Teardown Frees

```gdscript
# WRONG — deferred free leaks across suite boundaries
func after_test() -> void:
    my_node.queue_free()

# RIGHT — auto_free registers cleanup with the test lifecycle
var my_node := auto_free(Node.new())
```

### A3. Unseeded Randomness

```gdscript
# WRONG — test outcome depends on run order
var damage := randi_range(1, 100)

# RIGHT — deterministic
seed(12345)
var damage := randi_range(1, 100)
```

For E2E tests, call `POST /dev/seed {"seed": 12345}` before the scenario.

### A4. Direct Resource Mutation

```gdscript
# WRONG — mutates the ResourceLoader cache; pollutes later tests
var stats := load("res://data/player_stats.tres")
stats.base_health = 999

# RIGHT — deep copy before mutation
var stats := load("res://data/player_stats.tres").duplicate(true)
stats.base_health = 999
```

See Policy 2 in Document 02 for the `PackedScene` exception.

### A5. Signal Watches Without Registration

```gdscript
# WRONG — no registration; assertion has nothing to inspect
button.pressed.connect(_on_pressed)
assert_signal_emitted(button, "pressed")  # fails

# RIGHT — use SceneRunner's wait helper
await runner.await_signal_on(button, "pressed", [], 1000)
```

### A6. Coordinate Clicks in Gherkin

```gherkin
# WRONG — brittle; breaks on any layout change
When I click at position 640, 360

# RIGHT — stable across refactors
When I click the element with test_id "start_button"
```

### A7. Sleep in Step Definitions

```javascript
# WRONG — slow and flaky
await new Promise(r => setTimeout(r, 2000));
await driver.assertVisible('test_id:main_menu');

// RIGHT — auto-retry polls until deadline
await driver.assertVisible('test_id:main_menu', { timeout: 3000 });
```

### A8. Testing Production Rooms

```gdscript
# WRONG — test depends on production geometry
var runner := scene_runner("res://scenes/levels/workshop.tscn")

# RIGHT — calibrated fixture
var runner := scene_runner("res://tests/fixtures/movement_test_map.tscn")
```

### A9. Local GPU Baselines

```bash
# WRONG — captured on developer's Vulkan GPU; will fail in software CI
godot --rendering-driver vulkan  # then commit baselines/

# RIGHT — same driver as CI
xvfb-run --auto-servernum godot --rendering-driver opengl3 --test-driver
```

### A10. Asserting Before Frame Advance

```gdscript
# WRONG — input delivered but not yet processed by _physics_process
runner.simulate_action_press("jump")
assert_bool(player.is_jumping)  # fails

# RIGHT — advance the frame, then assert
runner.simulate_action_press("jump")
await runner.await_input_processed()
await runner.simulate_frames(1)
assert_bool(player.is_jumping)
```

---

## 9. Further Reading

- Normative rules: [02 Technical Testing Standard](02-technical-testing-standard.md)
- CI configuration: [04 CI/CD & Tooling Reference](04-ci-cd-tooling-reference.md)
- First test tutorial: [05 Onboarding Playbook](05-onboarding-playbook.md)

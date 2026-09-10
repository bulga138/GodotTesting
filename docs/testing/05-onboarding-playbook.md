# Onboarding Playbook

**Document ID:** 05
**Audience:** New developers, contractors, junior GDScript developers
**Status:** Tutorial
**Companion documents:** [03 Implementation Guide](03-implementation-guide.md), [04 CI/CD & Tooling Reference](04-ci-cd-tooling-reference.md)

> Welcome. This document gets you from `git clone` to a passing test in about half an hour. It assumes no prior experience with the testing framework. For normative rules, see [02 Technical Testing Standard](02-technical-testing-standard.md).

---

## 1. Setup (5 minutes)

### 1.1 Clone and Open

```bash
git clone <repo-url>
cd <project>
```

Open the project in Godot 4.5 or later. The `gdUnit4` addon is already in `addons/`.

### 1.2 Run Existing Tests Locally

From the Godot editor:

1. Open the **GdUnit4** panel at the bottom of the screen.
2. Click **Run All**.
3. All green means your environment is working.

From the CLI:

```bash
godot --headless --path . -s addons/gdUnit4/bin/GdUnitCmdTool.gd -a res://tests
```

The `-a` flag runs all tests in the specified path. Replace `res://tests` with a narrower path (e.g., `res://tests/unit`) to run a subset.

### 1.3 Run the E2E Suite (optional)

```bash
# Terminal 1: start the game with the driver
godot --test-driver

# Terminal 2: run Gherkin scenarios
cd test/
npx cucumber-js features/ --require support/
```

---

## 2. Tutorial 1. Your First Unit Test (5 minutes)

### 2.1 The Code Under Test

Create `res://src/inventory/Inventory.gd`:

```gdscript
class_name Inventory
extends RefCounted

var items: Dictionary = {}

func add(item: String, count: int) -> void:
    items[item] = items.get(item, 0) + count

func count(item: String) -> int:
    return items.get(item, 0)
```

### 2.2 The Test

Create `res://tests/unit/test_inventory.gd`:

```gdscript
extends GdUnitTestSuite

func test_add_increases_count() -> void:
    var inv := Inventory.new()
    inv.add("wrench", 3)
    assert_int(inv.count("wrench")).is_equal(3)

func test_add_twice_accumulates() -> void:
    var inv := Inventory.new()
    inv.add("wrench", 3)
    inv.add("wrench", 2)
    assert_int(inv.count("wrench")).is_equal(5)
```

### 2.3 Run It

In the GdUnit4 panel, click the play icon next to your test file. Both tests should pass.

---

## 3. Tutorial 2. Your First Scene Test (10 minutes)

### 3.1 Add a `test_id` to a Button

1. Open your scene in the editor.
2. Select a Button node.
3. In the Inspector, scroll to **Metadata**.
4. Add `test_id` = `"start_button"`.

No script needed. The E2E driver finds it by metadata.

### 3.2 Write a SceneRunner Test

Create `res://tests/integration/test_start_button.gd`:

```gdscript
extends GdUnitTestSuite

func test_start_button_emits_signal_when_pressed() -> void:
    var runner := scene_runner("res://scenes/main_menu.tscn")
    var button := runner.find_child("StartButton") as Button

    runner.simulate_action_press("ui_accept")
    await runner.await_input_processed()
    await runner.simulate_frames(1)

    await runner.await_signal_on(button, "pressed", [], 1000)
```

`runner.find_child()` searches the runner's scene for the named node. `await_signal_on()` waits for a signal emitted by a specific source node within a timeout.

### 3.3 Run It

Run the test. If it passes, you have verified a real scene with real input.

---

## 4. Tutorial 3. Your First E2E Scenario (5 minutes)

### 4.1 Write the Gherkin

Create `test/features/start_game.feature`:

```gherkin
Feature: Start a new game

  Scenario: Player can start a new game from the main menu
    Given the game is running
    When I click the element with test_id "start_button"
    Then the current scene should be "Workshop"
```

> **Note:** Steps such as `When I click the element with test_id "..."` and `Then the current scene should be "..."` are provided out of the box by `@godriver/cucumber`. No custom JavaScript step definitions are required for basic navigation and verification.

### 4.2 Run It

```bash
cd test/
npx cucumber-js features/start_game.feature --require support/
```

If the scenario passes, you have driven the real game from outside.

### 4.3 What Just Happened

1. Cucumber.js loaded the feature file.
2. The `Before` hook called `POST /reset` to clean the game.
3. The pre-built step `I click the element with test_id "start_button"` sent `POST /input/click`.
4. The step waited one frame.
5. The assertion sent `GET /scene/current` and verified the scene name.

### 4.4 Using Screen Objects for Complex Flows

Rather than scripting raw UI clicks across multiple rooms, group operations into reusable Screen Objects extending `BaseScreen.js`:

```javascript
// screens/KitchenScreen.js
import { BaseScreen } from './BaseScreen.js';

export class KitchenScreen extends BaseScreen {
  async depositTheremin() {
    await this.click('test_id:dumbwaiter_door');
    await this.click('test_id:inv_theremin');
    await this.click('test_id:dumbwaiter_send');
    await this.waitForSignal('dumbwaiter_sent', 5000);
  }

  async assertGhoulStunned() {
    await this.driver.assertProperty('test_id:ghoul', 'is_stunned', true, { timeout: 3000 });
  }
}
```

Call these Screen Objects inside your step definitions to keep your Gherkin scenarios declarative and resilient to layout changes.

---

## 5. Troubleshooting Cookbook

### "Why did my test fail with `ORPHAN_NODE_DETECTED`?"

You created a node without registering it for cleanup. Fix:

```gdscript
# Wrong
var node := Node.new()

# Right
var node := auto_free(Node.new())
```

`auto_free()` tells GdUnit4 to free the node after the test. Manual `queue_free()` in teardown is forbidden; it leaks across tests. GdUnit4 reports orphans with full stack traces via `collect_orphan_node_details()`, so you can pinpoint exactly where the leak occurred.

### "Why does my click test pass locally but fail in headless CI?"

Two common causes:

1. **Input not flushed.** Under `--headless`, `Input.parse_input_event()` does nothing. The driver handles this automatically for targeted clicks, but if you are writing a custom step for a global key, you must call `Input.flush_buffered_events()` afterward.
2. **Missing virtual display.** Visual tests require `xvfb-run`. If your test takes a screenshot, it cannot run under `--headless`.

### "Why did my visual baseline fail?"

Check three things:

1. **Was the baseline captured with `opengl3` + `llvmpipe`?** A Vulkan baseline will not match CI.
2. **Did the UI genuinely change?** If yes, review and update the baseline intentionally.
3. **Is a volatile element in the frame?** Timers, FPS counters, and clocks must be excluded via mask.

### "How do I update an approved visual baseline?"

```bash
UPDATE_BASELINE=true npx cucumber-js features/visual/
```

Then commit the new PNGs and `BASELINE_DRIVER` file. Every update must be reviewed by art direction before merging.

### "My E2E test times out. Where do I look?"

1. Check the JUnit XML artifact in CI.
2. Check the Godot stderr dump from the `@godriver/cli` watchdog.
3. Common causes: scene `_ready()` hangs (returns `504`), engine crash (exit code 2), or port collision (override with `--test-driver-port=N`).

---

## 6. Where to Go Next

| If you want to...           | Read...                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| Understand the full pyramid | [01 Testing Strategy Overview](01-testing-strategy-overview.md)   |
| Know the mandatory rules    | [02 Technical Testing Standard](02-technical-testing-standard.md) |
| Write more advanced tests   | [03 Implementation Guide](03-implementation-guide.md)             |
| Configure or debug CI       | [04 CI/CD & Tooling Reference](04-ci-cd-tooling-reference.md)     |

---

## 7. Getting Help

- For framework issues: check the GdUnit4 documentation or open an issue.
- For `@godriver` issues: see `spec/SPEC.md` for the HTTP contract.
- For CI issues: see the failure triage guide in [04 CI/CD & Tooling Reference](04-ci-cd-tooling-reference.md).

Welcome to the team.

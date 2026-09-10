# Technical Testing Standard

**Document ID:** 02
**Audience:** Core engine developers, framework maintainers, QA automation engineers
**Status:** NORMATIVE: single source of truth
**Companion documents:** All other documents in `docs/testing/`

> **This is the only normative document in the suite.** It uses RFC-style keywords:
> **MUST** = mandatory, **SHOULD** = recommended, **MAY** = optional,
> **PROHIBITED** = forbidden. Every other document explains, guides, or references
> this one. If any document conflicts with this one, this one wins.

---

## 1. The Five-Level Quality Pyramid

### 1.1 Layer Execution Matrix

| Level | Name              | Primary Tool                                                  | Scope & Surface                                                                     | Execution Context                       | CI Frequency                |
| ----- | ----------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------- | --------------------------- |
| **1** | Static Audits     | `godot --check-only`, `--import`, DAG solver, `audit_locales` | Syntax, missing resources, cyclic narrative locks, translation key/expansion parity | Headless CLI                            | Pre-commit / Every PR       |
| **2** | Unit Logic        | GdUnit4 (headless)                                            | Pure GDScript math, inventory calculations, JSON ↔ Variant serializers              | Headless engine (`--headless`)          | Every PR                    |
| **3** | Scene Integration | GdUnit4 `SceneRunner`                                         | Hotspots, verb dispatch, character state machines, physics ticks, tween lifecycles  | Headless engine (`--headless`)          | Every PR                    |
| **4** | Visual Regression | `@godriver/visual` (`pixelmatch` + `sharp`)                   | Room states, UI themes, custom shaders, accessibility contrast modes                | Virtual display (`xvfb-run` + llvmpipe) | Milestone / Merge to `main` |
| **5** | E2E BDD Flows     | `@godriver/cucumber` (Cucumber.js + Node.js)                  | Multi-room puzzle chains, transit mechanics, save/load cycles, golden paths         | External driver (REST port 9090)        | Nightly / Pre-release       |

### 1.2 Execution Order

Layers **MUST** execute in ascending order. A failure at any layer **MUST** halt the pipeline; higher layers **MUST NOT** run against a build that has failed a lower layer.

---

## 2. Framework Standardization

### 2.1 In-Engine Framework: GdUnit4 Alone

- The project **MUST** standardize exclusively on GdUnit4.
- GUT **MUST NOT** be used as a parallel framework. Running both frameworks is **PROHIBITED** due to maintenance overhead and inconsistent orphan detection.

**Rationale:**

- GUT's `add_child_autofree()` provides teardown cleanup only; it does not offer deterministic frame-stepping isolation.
- GdUnit4 provides `SceneRunner` with `simulate_frames(n)`, `simulate_action_press()`, `simulate_action_release()`, and `await_input_processed()`.
- GdUnit4 reports per-node orphan stack traces via `collect_orphan_node_details()`. GUT logs only a numeric count.

### 2.2 Version Floor & Compatibility Contract

| Project Godot version | Required GdUnit4 version |
| --------------------- | ------------------------ |
| 4.3 – 4.4.1           | v5.x                     |
| 4.5+                  | v6.x                     |

Raising the GdUnit4 version **MUST** be accompanied by raising the project engine floor. Downgrading below v5.x is **PROHIBITED**.

### 2.3 Scene Cleanup

- All test-created nodes, mocks, and runners **MUST** be registered with `auto_free()`.
- Calling `queue_free()` manually in `after_test()` or equivalent teardown hooks is **PROHIBITED**. Deferred frees leak across suite boundaries and produce false-positive orphan warnings.

---

## 3. Determinism & Isolation Policies

### Policy 1. Absolute State Cleansing Between Scenarios

Prior to every E2E scenario, the harness **MUST** invoke `POST /reset`. The engine **MUST** execute the following sequence, dispatched to the main thread:

1. Resolve all pending blocked `/signal/wait` promises with `{"signaled": false, "reset": true}`.
2. Disconnect all active signal observers.
3. Restore `Engine.time_scale = 1.0` and `get_tree().paused = false`.
4. Reset the `GameState` autoload to its initial property values.
5. Load the main scene via `change_scene_to_file()`, **NOT** `reload_current_scene()`.
6. Kill all running SceneTree tweens via `get_tree().get_processed_tweens()`.
7. Flush unhandled input via `Input.flush_buffered_events()`.
8. Wait until `is_node_ready()` is `true` on the new scene, bounded at 5 seconds. On timeout, return `504 SCENE_READY_TIMEOUT`.

### Policy 2. Deep Duplication on Resource Mutation

- Godot's `ResourceLoader` caches disk-backed `.tres` files indefinitely while memory references persist. There is no public API to clear this cache.
- Any test that mutates a loaded resource **MUST** call `res.duplicate(true)` first.
- Shallow `.duplicate()` is **PROHIBITED** when the resource contains nested sub-resources.
- **PackedScene exception:** Per godot#108220, `duplicate(true)` on a resource containing an exported `PackedScene` with a `class_name` script throws an assertion because the Script subresource cannot be duplicated (flagged `PROPERTY_USAGE_NEVER_DUPLICATE`). Affected resources **MUST** be handled by shallow duplication plus separate scene instantiation and reference re-assignment.

### Policy 3. Headless Input Delivery vs. Effect

- `Input.parse_input_event()` does not pump the OS queue under `--headless`.
- **Dual-path routing contract:**
  - Targeted requests (`test_id` or path) **MUST** route via `Viewport.push_input()`. Mouse events **MUST** convert coordinates via `local_pos = target_viewport.get_final_transform().affine_inverse() * global_pos`.
  - Global untargeted requests **MUST** use `Input.parse_input_event()` followed immediately by `Input.flush_buffered_events()`.
- **Delivery vs. effect invariant:** `flush_buffered_events()` delivers events into `_input()` and updates `Input` action states. Handlers in `_physics_process()` and `_unhandled_input()` execute on the _subsequent_ engine tick. Tests **MUST** advance at least one frame before asserting side effects.

### Policy 4. Headless Root-Size Initialization

Under `--headless`, the driver **MUST** enforce project settings:

- Read `display/window/size/viewport_width` and `display/window/size/viewport_height`.
- Apply via `get_tree().root.size = Vector2i(width, height)` inside the test driver autoload's `_enter_tree()`, prior to initial scene tree layout processing.

This guarantees `/ui/layout` bounds evaluate against the intended resolution.

### Policy 5. Zero Orphan Node Tolerance

- Orphan detection is enabled by default in GdUnit4.
- CI **MUST** fail on any orphan node warning.
- All test nodes **MUST** be registered via `auto_free()`.

### Policy 6. Flake Detection over Flake Masking

- GdUnit4 defaults to 3 retries in its settings, which can silently mask non-deterministic race conditions.
- CI **MUST** override this to `retries: 1` via the GitHub Action input or `GdUnitRunner.cfg`.
- A test that fails on the initial attempt and passes on retry **MUST** be marked `FLAKY_DEFECT` and **MUST** fail the pipeline.
- Retries are diagnostic tools, not pass-through masks.

---

## 4. Input Ordering Semantics

- Input endpoints inject events and return immediately. A `200` response means **injected**, not **processed**.
- Correctness is the client's responsibility:
  - `POST /wait/frames` to advance frames.
  - `GET /signal/wait` to block on a signal.
- Pre-built interaction steps **SHOULD** wait at least one frame after injection. This is delivery confirmation, not effect confirmation.
- Games with frame-bound side effects **SHOULD** raise the auto-wait value or add explicit signal waits.

---

## 5. Visual Regression Constraints

- Visual regression **MUST NOT** run under `--headless`. `RendererDummy` disables rendering; `ViewportTexture.get_image()` returns null.
- Visual tests **MUST** execute under a virtual frame buffer: `xvfb-run --auto-servernum godot --rendering-driver opengl3 --test-driver`.
- **Driver parity:** Baselines **MUST** be captured with the same rendering driver as CI (`opengl3` + `llvmpipe` on Linux; `d3d12` on Windows).
- **SDR only:** Baselines **MUST** be captured with HDR output disabled. Requests for HDR capture **MUST** be rejected with `400 HDR_NOT_SUPPORTED`.
- **Platform scope:** Visual regression is Linux/Windows-only for v0.1. macOS headless rendering is deferred.

---

## 6. State Autoload Contract

- The state autoload is discovered via project setting `godot_test_driver/state_autoload`, default `GameState`.
- `/state/set` **MUST** coerce JSON values to the declared property type.
- Unknown keys **MUST** return `400 UNKNOWN_KEY` with `details.valid_keys`.
- Missing state autoload when no target is passed **MUST** return `409 STATE_AUTOLOAD_MISSING`.
- `null` writes **MUST** be accepted for nullable types (`Object`, `Resource`, `Variant`, untyped) and **MUST** be rejected with `400 NULL_NOT_ALLOWED` for value types.

---

## 7. Definition of Done (Normative)

### Every Pull Request

- [ ] `godot --headless --check-only` reports zero syntax errors.
- [ ] `godot --headless --import` reports zero missing assets or unresolved GUIDs.
- [ ] Resource mutation linter reports zero direct mutations on raw `.tres` resources.
- [ ] Localization parity and expansion checks pass (`--max-expansion 1.35`).
- [ ] If a PDC resource exists, the DAG solver reports zero unreachable endings or cyclic deadlocks.
- [ ] Pure calculations have 100% branch coverage in GdUnit4 unit suites.
- [ ] Created scenes include a SceneRunner integration suite using `auto_free()` with explicit frame stepping.
- [ ] GdUnit4 reports zero orphan node leaks.

### Every Milestone

- [ ] All critical-path journeys pass as green Gherkin scenarios via `@godriver/cucumber`.
- [ ] All screens match software-rendered SDR baselines within 1% tolerance.
- [ ] No scenario times out or leaks state across `/reset`.
- [ ] The `@godriver/cli` watchdog detects zero engine crashes or lockups.

---

## 8. Change Policy

This document is versioned with SemVer. Additive changes bump minor; breaking changes bump major. All other documents in the suite reference this document by version.

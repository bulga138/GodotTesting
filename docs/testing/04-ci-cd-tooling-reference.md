# CI/CD & Tooling Reference

**Document ID:** 04
**Audience:** DevOps, build engineers, technical directors
**Status:** Operational reference
**Companion documents:** [02 Technical Testing Standard](02-technical-testing-standard.md), [03 Implementation Guide](03-implementation-guide.md)

> This document is the runbook for configuring and troubleshooting the test pipeline. It contains exact commands, flags, and failure triage procedures.

---

## 1. Pipeline Overview

Four jobs run in sequence. Each job gates the next.

| Job                         | Level | Runner               | Runs On                                 |
| --------------------------- | ----- | -------------------- | --------------------------------------- |
| `static-and-schemas`        | 1     | ubuntu-latest        | Every PR                                |
| `unit-and-integration`      | 2 & 3 | ubuntu-latest        | Every PR                                |
| `e2e-and-visual-regression` | 4 & 5 | ubuntu-latest + xvfb | Main branch, or PR with `run-e2e` label |
| `release-gate`              | —     | ubuntu-latest        | Tagged releases only                    |

---

## 2. Complete GitHub Actions Workflow

```yaml
name: Game Quality & Verification Pipeline

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

env:
  GODOT_VERSION: '4.5' # Must match GdUnit4 v6.x floor
  GODOT_DISABLE_LEAK_CHECKS: '1'

jobs:
  static-and-schemas:
    name: 'Level 1: Static Integrity & Contract Solvers'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Godot Headless
        uses: chickensoft-games/setup-godot@v2
        with:
          version: ${{ env.GODOT_VERSION }}
          use-dotnet: false
      - name: Syntax Check & Asset Re-import
        run: |
          godot --headless --check-only -s
          godot --headless --import
      - name: Resource Mutation Audit (Custom Project Script)
        # Scans tests/ for disk-backed .tres loads followed by
        # property assignments lacking duplicate(true)
        run: python3 tools/ci/audit_resource_mutations.py --scan-dir tests/
      - name: Conditional Crossroads DAG Solver
        run: |
          if [ -f "res://data/puzzle_dependency_chart.tres" ]; then
            godot --headless --script res://tools/pdc_solver.gd
          fi
      - name: Localization Parity & Expansion Guard
        run: python3 tools/ci/audit_locales.py --source res://locales/en.csv --target res://locales/ --max-expansion 1.35

  unit-and-integration:
    name: 'Level 2 & 3: In-Engine GdUnit4 Suites'
    needs: static-and-schemas
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Godot
        uses: chickensoft-games/setup-godot@v2
        with:
          version: ${{ env.GODOT_VERSION }}
          use-dotnet: false
      - name: Execute Headless GdUnit4 Suites
        uses: godot-gdunit-labs/gdUnit4-action@v1
        with:
          godot-version: ${{ env.GODOT_VERSION }}
          paths: 'res://tests/unit,res://tests/integration'
          arguments: '-v'
          retries: 1

  e2e-and-visual-regression:
    name: 'Level 4 & 5: External BDD & Visual Diffs'
    needs: unit-and-integration
    if: github.ref == 'refs/heads/main' || contains(github.event.pull_request.labels.*.name, 'run-e2e')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Install Test Client Dependencies
        run: npm ci
      - name: Execute E2E Suites under Virtual Display
        run: |
          xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" \
            godot --rendering-driver opengl3 --test-driver &
          npx cucumber-js features/ --require support/ \
            --format summary \
            --format junit:reports/e2e-junit.xml
      - name: Upload JUnit Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-junit
          path: reports/e2e-junit.xml
```

---

## 3. Environment Variables

| Variable                    | Default | Purpose                                      |
| --------------------------- | ------- | -------------------------------------------- |
| `GODOT_VERSION`             | `4.5`   | Engine version for all jobs                  |
| `GODOT_DISABLE_LEAK_CHECKS` | `1`     | Suppresses false-positive leak logs          |
| `GODRIVER_PORT`             | `9090`  | HTTP REST port for `@godriver`               |
| `GODRIVER_AUTOWAIT_FRAMES`  | `1`     | Frames to advance after each injection       |
| `UPDATE_BASELINE`           | unset   | Set to `true` to regenerate visual baselines |

---

## 4. Tool Versions

| Tool                 | Version   | Notes                       |
| -------------------- | --------- | --------------------------- |
| Godot                | 4.5       | Matches GdUnit4 v6.x floor  |
| GdUnit4              | v6.x      | Pinned in `addons/gdUnit4/` |
| Node.js              | 20 LTS    | For `@godriver/cucumber`    |
| `@godriver/core`     | `0.1.x`   | Pinned in `package.json`    |
| `@godriver/cucumber` | `0.1.x`   | Pinned in `package.json`    |
| `pixelmatch`         | `^5.x`    | MIT                         |
| `sharp`              | `^0.33.x` | Apache 2.0                  |

---

## 5. CLI Flags Reference

### Godot

| Flag                         | Purpose                                  |
| ---------------------------- | ---------------------------------------- |
| `--headless`                 | No rendering, no window (Levels 1–3)     |
| `--rendering-driver opengl3` | Software GL for visual tests (Level 4–5) |
| `--test-driver`              | Activates `@godriver` HTTP server        |
| `--test-driver-port=N`       | Override default port 9090               |
| `--test-driver-token=SECRET` | Optional bearer token                    |
| `--fixed-fps 60`             | Deterministic frame delta                |

### GdUnit4 GitHub Action

| Input           | Default  | Purpose                                       |
| --------------- | -------- | --------------------------------------------- |
| `godot-version` | required | Must match project floor                      |
| `paths`         | required | Comma-separated test directories              |
| `arguments`     | —        | Extra CLI args (e.g., `-v`)                   |
| `retries`       | `0`      | Retry count; set to `1` for diagnostic flakes |

### GdUnit4 CLI Runner (`GdUnitCmdTool.gd`)

| Flag              | Purpose                                                      |
| ----------------- | ------------------------------------------------------------ |
| `-a <path>`       | Run all tests in the specified path (e.g., `-a res://tests`) |
| `-c`              | Continue on failure                                          |
| `-conf`           | Specify a configuration file                                 |
| `--help-advanced` | Show all available options                                   |

### Cucumber.js

| Flag                                   | Purpose                       |
| -------------------------------------- | ----------------------------- |
| `--require support/`                   | Load World and hooks          |
| `--format summary`                     | Human-readable console output |
| `--format junit:reports/e2e-junit.xml` | CI-consumable report          |

---

## 6. Failure Triage Guide

### Level 1 — Static

| Symptom                               | Likely Cause                        | Action                       |
| ------------------------------------- | ----------------------------------- | ---------------------------- |
| `--check-only` reports syntax errors  | Parse error in `.gd` file           | Fix syntax before committing |
| `--import` reports missing UIDs       | Asset deleted but reference remains | Re-import or fix reference   |
| Locale parity fails                   | Missing translation key             | Add to target locale         |
| Locale expansion > 35%                | Text overflow risk                  | Shorten string or widen UI   |
| DAG solver reports unreachable ending | Narrative dead-end                  | Fix puzzle graph             |

### Level 2 & 3 — GdUnit4

| Symptom                   | Likely Cause                           | Action                                           |
| ------------------------- | -------------------------------------- | ------------------------------------------------ |
| `ORPHAN_NODE_DETECTED`    | Node not registered with `auto_free()` | Wrap creation in `auto_free()`                   |
| `await_signal_on` timeout | Signal fired before wait started       | Start `await_signal_on` before triggering action |
| Flaky physics assertion   | Insufficient frame settling            | Add `simulate_frames(n)`                         |
| `FLAKY_DEFECT` flagged    | Non-deterministic test                 | Seed RNG, remove wall-clock timers               |

### Level 4 — Visual

| Symptom                             | Likely Cause             | Action                                          |
| ----------------------------------- | ------------------------ | ----------------------------------------------- |
| Diff fails on CI but passes locally | Driver mismatch          | Recapture baselines with `opengl3` + `llvmpipe` |
| Entire screen differs               | HDR capture              | Disable HDR; SDR only                           |
| Diff fails on one region            | Legitimate visual change | Review and update baseline if intentional       |

### Level 5 — E2E

| Symptom                   | Likely Cause           | Action                          |
| ------------------------- | ---------------------- | ------------------------------- |
| Watchdog exit code 2      | Engine crash or stall  | Check Godot stderr in artifact  |
| `504 SCENE_READY_TIMEOUT` | Scene `_ready()` hangs | Check async init in scene       |
| `/reset` leaves state     | Tween leak or orphan   | Verify reset sequence in addon  |
| Port already bound        | Another tool on 9090   | Override `--test-driver-port=N` |

---

## 7. Port Collision Reference

Default port 9090 is also used by:

- `tugcantopaloglu/godot-mcp` runtime server
- `Smalldy/godot-bridge`

If either is installed, override via `--test-driver-port=N` or use ephemeral `--test-driver-port=0` (port printed to stdout as `GODRIVER_PORT=<n>`).

---

## 8. Watchdog Behavior

`@godriver/cli` runs a health watchdog:

- Health tick interval: 15 seconds.
- On timeout: dump Godot stderr, kill process, exit code 2.
- Detects both graceful stalls (socket open, no response) and hard crashes (process exit without clean socket close).

Exit codes:

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| 0    | All scenarios passed                    |
| 1    | One or more scenarios failed            |
| 2    | Driver error (crash, timeout, watchdog) |

---

## 9. Suite Health Metrics

Track four metrics. They answer "is the suite healthy?" — not "is the team productive?" Metrics that reward writing tests distort the suite; metrics that describe it keep it useful.

### 9.1 Suite Duration Budget

| Level           | Budget   | Enforcement    |
| --------------- | -------- | -------------- |
| 1 — Static      | < 30s    | CI job timeout |
| 2 & 3 — GdUnit4 | < 5 min  | CI job timeout |
| 4 — Visual      | < 5 min  | CI job timeout |
| 5 — E2E         | < 30 min | CI job timeout |

A suite that exceeds its budget MUST be optimized before new tests are added. Slow suites get skipped by developers; skipped suites catch nothing.

### 9.2 Flake Rate

- **Target:** < 2% of test runs
- **Definition:** a test that fails on the initial attempt and passes on the single diagnostic retry
- **Tracking:** aggregate `FLAKY_DEFECT` markers per test file across CI runs
- **Action:** any test with more than 1 flake per 100 runs MUST be quarantined (marked `@flaky`, excluded from release gates) until stabilized

Quarantine is a temporary state. A quarantined test that is not fixed within one milestone MUST be deleted and its coverage reimplemented. Permanent quarantines are technical debt with a nicer name.

### 9.3 Coverage Floor

- **Level 2 deterministic logic:** 100% branch coverage REQUIRED
- **Levels 3–5:** no numeric target
- **Why:** coverage percentages reward trivial tests. Scope-completeness — every character, every menu, every golden path — rewards the tests that actually catch bugs.

The Level 2 floor is enforced by GdUnit4's coverage report. Levels 3–5 are reviewed qualitatively at milestone gates.

### 9.4 Orphan Count

- **Target:** 0 (already enforced by Policy 5 in Document 02)
- **Tracking:** CI fails on any orphan warning emitted by `collect_orphan_node_details()`
- **No exceptions.** An orphan is a test leaking state into the next test. Fix the test, not the threshold.

---

## 10. Godot / GdUnit4 Migration Runbook

When the project's engine floor or test-framework version moves, follow this sequence. Never bump both in the same PR.

### 10.1 Pre-Migration Checklist

- [ ] Target Godot version is a stable release (not `.dev` or `.rc`)
- [ ] GdUnit4 compatibility table confirms the matching release
- [ ] Godot release notes reviewed for `SceneRunner` or input API changes
- [ ] Branch created: `chore/upgrade-godot-X.Y` or `chore/upgrade-gdunit4-X.Y`
- [ ] Full suite run on the branch to establish a baseline

### 10.2 Godot Version Bump Procedure

1. Update `GODOT_VERSION` in `.github/workflows/quality_pipeline.yml`
2. Run `godot --headless --import` to regenerate import caches
3. Run Levels 1–3 locally; fix any new warnings before proceeding
4. Run the full CI matrix (4.3 / 4.5 / 4.7 × Linux / Windows)
5. Merge only after two consecutive green runs on `main`

### 10.3 GdUnit4 Version Bump Procedure

1. Update `addons/gdUnit4/` to the compatible release
2. Confirm the Godot floor is at or above the GdUnit4 minimum
3. Run all suites locally; check for orphan-reporting behavior changes
4. Update any test that relied on old orphan output format
5. Merge only after two consecutive green runs on `main`

### 10.4 Known Breaking Changes by Version

| Migration           | Breaking change                                                                                             | Mitigation                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Godot 4.6 → 4.7     | Keyboard/mouse device IDs changed from `0` to `InputEvent.DEVICE_ID_KEYBOARD`/`DEVICE_ID_MOUSE` (GH-116274) | Injected events set `device` explicitly; the driver handles this automatically |
| Godot 4.5 → 4.6     | `Viewport.push_input` behavior for `SubViewportContainer` scaling refined                                   | Coordinate-transform invariant already handles this; re-run Spike B validation |
| GdUnit4 v5 → v6     | Requires Godot 4.5+; orphan detection overhauled with per-node stack traces                                 | Update any CI assertions that relied on old aggregate orphan counts            |
| GdUnit4 v6.0 → v6.2 | `collect_orphan_node_details()` API added                                                                   | Optional adoption; existing orphan reports continue to work                    |

### 10.5 Post-Migration Validation

- [ ] Full CI matrix passes
- [ ] Orphan count remains 0
- [ ] Flake rate unchanged or improved
- [ ] Visual baselines still match (regenerate only if the rendering driver changed)
- [ ] Two consecutive green runs on `main` before declaring the migration complete

### 10.6 Rollback Procedure

If the migration introduces more than 2 new failures that cannot be fixed within 1 day:

1. Revert the branch
2. File an issue documenting the failing tests
3. Schedule a dedicated migration sprint

Do not merge a partially-migrated state. Half-migrated engines are worse than old engines.

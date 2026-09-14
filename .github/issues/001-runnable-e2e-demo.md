---
title: GTT-001 · Runnable E2E + visual + state-seeding demo
labels: area/e2e, type/feature, size/M
phase: demo
resolution: DONE 2026-09-14 — see Resolution.
---

# GTT-001 · Runnable E2E + visual + state-seeding demo

## Context

The demo's Levels 4-5 were reference-only. They are now executable against the published `@godriver` packages (core 0.4.0, cucumber 0.1.0, visual 0.1.0, cli 0.1.0).

## What landed

- **Vendored addon**: `game/addons/godriver` + `game/addons/godottpd` (synced from the godriver repo), autoload registered in `project.godot`.
- **test_id metadata**: `score_label`, `pause_menu`, `paused_label` in `main.tscn`.
- **E2E (`npm test`)**: coin collection driven by real input (`key_down`/`key_up` time-based holds toward coin positions read through the API); pause behavior (driver works while paused, PAUSABLE nodes freeze; visibility asserted via `/ui/layout` `visible_in_tree`).
- **Visual (`npm run test:visual`)**: arena baseline in `baselines/` (git-tracked), artifacts gitignored.
- **State seeding (`features/state_seeding.feature`)**: teleport the player via `setProperty`, then deliver coins to the player so the game's OWN pickup logic runs - no counter writes, no flow break. Both arrangement patterns documented in docs/testing/03 §6.0.

## Game fixes made by the tests

- `PauseMenu.visible = false` + `ScoreLabel.offset_left` restored (clobbered by the test_id metadata edit).
- Pause could never be unpaused via input: `game.gd` now runs `PROCESS_MODE_ALWAYS` (pause toggle stays reachable while paused) and the Player is explicitly `PAUSABLE` (freezes while paused).

## Key findings

- Frame-count holds are display-rate dependent in windowed runs (process frames != fixed 60/s physics) - use time-based holds (`key_down` + real sleep + `key_up`).
- A node's own `visible` flag stays true when a parent hides it - assert via `/ui/layout` `visible_in_tree`.
- White-box counter writes do not re-derive derived UI; deliver objects through the real flow instead.

## Verification

- `npm test`: 5 scenarios / 18 steps green (headless).
- `npm run test:visual`: 1/1 green (windowed), baseline regenerated after the pause-menu fix.

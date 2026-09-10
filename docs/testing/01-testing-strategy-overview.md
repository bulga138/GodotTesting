# Testing Strategy Overview

**Document ID:** 01
**Audience:** Producers, tech leads, game designers, QA coordinators
**Status:** Approved strategy
**Companion documents:** [00 Quality Policy](00-quality-policy.md), [02 Technical Testing Standard](02-technical-testing-standard.md), [03 Implementation Guide](03-implementation-guide.md)

---

## 1. What This Document Is

This is the bridge between the business-level [Quality Policy](00-quality-policy.md) and the engineering-level [Technical Testing Standard](02-technical-testing-standard.md). It explains **what each layer of testing protects against**, in conceptual terms, without requiring knowledge of specific tools or code.

Read this if you need to understand coverage, risk, or where a given test belongs, but not if you need to write one. For writing tests, see the [Implementation Guide](03-implementation-guide.md).

---

## 2. The Five-Level Safety Net

Testing in a game engine is organized into five layers. Each layer protects against a different class of failure. Lower layers are fast and run constantly; higher layers are slower and run at milestones. A failure caught at a lower layer is cheaper than the same failure caught at a higher layer.

```
                     ▲
                    / \
                   / 5 \      Complete player journeys
                  /-----\
                 /   4   \    Visual appearance
                /---------\
               /     3     \  Characters, menus, physics
              /-------------\
             /       2       \Isolated rules and math
            /-----------------\
           /         1         \Files, links, translations
          /---------------------\
```

### Level 1. Static Validation

**Protects against:** Broken file references, missing assets, corrupt data files, untranslated strings, unreachable narrative branches.

**Plain-language description:** "Before the game even launches, we check that every file it needs exists, every link between scenes is valid, and every translation is present."

**When it runs:** On every change, before any other test.

**Who owns it:** Engineering, with input from localization and narrative design.

**What it cannot catch:** Anything that only manifests when the game is actually running.

---

### Level 2. Isolated Logic

**Protects against:** Incorrect math, broken inventory rules, failed data conversions, state aggregation errors.

**Plain-language description:** "We test the rules of the game (damage formulas, crafting outcomes, inventory stacking) as pure logic, without loading any scenes."

**When it runs:** On every change.

**Who owns it:** Engineering, with designers defining expected outcomes.

**What it cannot catch:** Anything that depends on the scene tree, timing, or player interaction.

---

### Level 3. Component & Scene Integration

**Protects against:** Characters that move incorrectly, menus that do not pause the world, hotspots that fail to respond, physics that behaves unexpectedly.

**Plain-language description:** "We load a real scene with a real character and verify that movement, interaction, and UI behave as designed."

**When it runs:** On every change.

**Who owns it:** Engineering and QA.

**What it cannot catch:** Visual appearance, multi-scene flows, or full journeys.

---

### Level 4. Visual Regression

**Protects against:** Unintended visual changes from shader edits, lighting adjustments, theme changes, or UI layout drift.

**Plain-language description:** "We take a picture of each screen and compare it to an approved reference. If anything changed, we are told, even if the change was subtle."

**When it runs:** At milestones and merges to the main branch.

**Who owns it:** Art direction, QA, and engineering.

**What it cannot catch:** Whether the visual change was _intentional_. That requires human review.

---

### Level 5. Complete Player Journeys

**Protects against:** Puzzle soft-locks, narrative dead-ends, save/load corruption, broken scene transitions, and any failure that only appears when a real player moves through the game.

**Plain-language description:** "We play the game from start to finish, automatically, and verify that the golden path completes cleanly."

**When it runs:** Nightly and before every release.

**Who owns it:** QA, with designers defining the golden paths.

**What it cannot catch:** Feel, polish, and subjective quality. Those remain human responsibilities.

---

## 3. Why the Pyramid Is Shaped This Way

- **Lower layers are cheap.** A static check takes milliseconds; a full playthrough takes minutes.
- **Lower layers are precise.** A failed math test tells you exactly which formula broke. A failed playthrough tells you only that _something_ broke.
- **Higher layers are realistic.** Only a full journey can catch a puzzle that is technically solvable but narratively soft-locked.
- **You need all five.** Skipping a layer creates a blind spot that will eventually cost more than the layer would have.

The goal is not to test everything at every layer. The goal is to place each test at the **lowest layer that can catch the failure it targets**.

---

## 4. Coverage Expectations

| Layer              | Coverage Expectation                             |
| ------------------ | ------------------------------------------------ |
| 1. Static         | All assets, all scenes, all translations         |
| 2. Isolated Logic | All deterministic rules and formulas             |
| 3. Integration    | Every character, menu, and interactive component |
| 4. Visual         | Every screen and major visual state              |
| 5. Journeys       | Every golden path and critical user flow         |

Coverage is not measured as a single percentage. Each layer has its own scope, and completeness means "every item in scope has at least one test."

---

## 5. Where to Go Next

- To understand the business rationale and release gates: [00 Quality Policy](00-quality-policy.md)
- To understand the mandatory engineering rules: [02 Technical Testing Standard](02-technical-testing-standard.md)
- To write your first test: [05 Onboarding Playbook](05-onboarding-playbook.md)
- To configure CI: [04 CI/CD & Tooling Reference](04-ci-cd-tooling-reference.md)

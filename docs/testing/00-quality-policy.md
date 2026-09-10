# Quality Policy

**Document ID:** 00
**Audience:** Executive producers, studio leadership, publishers, non-technical stakeholders
**Status:** Approved policy
**Companion documents:** [01 Testing Strategy Overview](01-testing-strategy-overview.md), [02 Technical Testing Standard](02-technical-testing-standard.md)

---

## 1. Why We Test

Every hour of manual playtesting that a machine can perform is an hour returned to design, art, and narrative. Manual QA cannot scale across an 18-room game with 3 temporal states, dozens of item combinations, and a branching puzzle graph. Automated testing does not replace human judgment — it protects it from being spent on regressions.

Automated testing exists to answer three questions before a build reaches a player:

1. **Does the game still run?** — Can it launch, load its data, and complete its golden path?
2. **Does the game still behave correctly?** — Do the rules, math, and interactions produce the intended outcomes?
3. **Does the game still look correct?** — Have any visual changes occurred that were not intended?

If any of these questions is answered "no," the build does not ship.

### Why This Stack

We standardize on Godot's native test ecosystem rather than importing patterns from Unity or Unreal. The rationale is simple: our engine is Godot, our language is GDScript, and our CI is Node.js-based. A Unity-style C# harness would add a second runtime; an Unreal-style C++ harness would add a build step. The stack we chose — GdUnit4 for in-engine tests, `@godriver` for external end-to-end tests — runs on the same toolchain the team already uses daily.

If you are evaluating this policy against prior experience on other engines: the pyramid structure, determinism rules, and CI gates are engine-agnostic. The tool names are Godot-specific. The principles transfer; the commands do not.

---

## 2. What We Protect Against

| Risk                          | Consequence Without Automation                      | How We Mitigate                          |
| ----------------------------- | --------------------------------------------------- | ---------------------------------------- |
| A broken file reference ships | Game crashes on load; player cannot start           | Static asset validation on every change  |
| A math formula regresses      | Inventory, damage, or economy breaks silently       | Isolated logic tests on every change     |
| A character or menu breaks    | Player is blocked; game is unplayable               | Scene integration tests on every change  |
| A shader or theme drifts      | Art direction is compromised; accessibility suffers | Visual baseline comparison per milestone |
| A full playthrough breaks     | Puzzle soft-locks; narrative dead-ends              | End-to-end journey tests per milestone   |

---

## 3. Roles & Responsibilities

| Role           | Responsibility                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Engineers**  | Write and maintain automated tests for code they own. Keep tests passing on their branch before requesting review. |
| **Designers**  | Define expected outcomes for narrative, puzzle, and economy logic. Provide the "golden path" for each milestone.   |
| **QA**         | Maintain end-to-end journey scenarios. Investigate and triage automated failures. Manage visual baselines.         |
| **Leads**      | Enforce the Definition of Done. Refuse to merge work that does not meet the gates below.                           |
| **Production** | Schedule time for test maintenance. Treat test infrastructure as a deliverable, not overhead.                      |

---

## 4. Definition of Done

### For every pull request

- All automated checks pass.
- No new visual regressions are introduced without explicit approval.
- No new translation strings are added without a corresponding translation entry.

### For every milestone

- The full golden path — from new game to ending — completes cleanly in an automated end-to-end run.
- All screens and major visual states match their approved baselines.
- No known flaky tests remain in the suite.

---

## 5. Release Gates

A milestone cannot ship unless:

1. **The build is green.** All automated test layers pass on the release branch.
2. **The golden path is verified.** A full player journey completes without manual intervention.
3. **Visual changes are reviewed.** Every visual difference from the previous baseline has been explicitly approved or intentionally updated.
4. **No regressions are unexplained.** Any test failure is either fixed or documented as an accepted risk with sign-off.

---

## 6. What This Policy Does Not Cover

- Manual exploratory testing, which remains essential for feel, polish, and fun.
- Performance benchmarks and stress testing, which are handled separately.
- Localization quality review by native speakers, which cannot be automated.

These remain human responsibilities. Automation protects them from being wasted on regressions.

---

## 7. Review Cadence

This policy is reviewed at the start of each milestone. Changes require sign-off from the technical director and the QA lead. The companion [Technical Testing Standard](02-technical-testing-standard.md) may evolve more frequently; this policy changes only when the business rationale or release criteria change.

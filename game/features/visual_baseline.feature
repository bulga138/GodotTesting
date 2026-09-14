@visual
Feature: Visual regression baselines
  Screenshots require a windowed game (headless rendering is disabled),
  so these scenarios run only via `npm run test:visual`.

  Scenario: The arena matches its baseline
    Given the game is running with deterministic coin spawns
    Then the screen should match baseline "arena"

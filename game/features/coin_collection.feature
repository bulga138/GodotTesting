# Level 5 reference feature. Requires @godriver 0.2.x + cucumber-js (docs/testing/03, section 6).
# To run it for real the demo needs: the godriver addon vendored at game/addons/godriver
# (launched with --test-driver), test_id metadata on score_label, and the InputMap
# actions move_right/pause. The step definitions and Screen Objects target the
# current @godriver API (setSeed, assertText, waitSignal, pressKey).
Feature: Coin collection
  The player collects every coin in the arena.

  Scenario: Collecting a coin increments the score
    Given the game is running with RNG seeded to 42
    When the player touches a coin
    Then the element with test_id "score_label" should have text "Coins: 1 / 8"

  Scenario: Collecting all coins wins the game
    Given the game is running with RNG seeded to 42
    When the player collects all 8 coins
    Then the element with test_id "score_label" should have text "You win! All 8 coins collected."


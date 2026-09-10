# Level 5 reference feature. Requires godot-test-driver + cucumber-js (docs/testing/03, section 6).
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

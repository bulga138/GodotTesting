# Level 5 reference feature. Requires @godriver 0.2.x + cucumber-js
# (docs/testing/03, section 6). The demo IS runnable: the godriver addon is
# vendored at game/addons/godriver (launch with --test-driver) and the HUD
# nodes carry test_id metadata. Coin spawns are deterministic via the game's
# own seed(12345) in game.gd _ready(); the player is driven with REAL input
# (key_down/key_up holds toward coin positions read through the API).
Feature: Coin collection
  The player collects every coin in the arena.

  Scenario: Collecting a coin increments the score
    Given the game is running with deterministic coin spawns
    When the player touches a coin
    Then the element with test_id "score_label" should have text "Coins: 1 / 8"

  Scenario: Collecting all coins wins the game
    Given the game is running with deterministic coin spawns
    When the player collects all 8 coins
    Then the element with test_id "score_label" should have text "You win! All 8 coins collected."

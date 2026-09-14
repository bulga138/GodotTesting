# Game-state seeding (GTD-055): start from a specific state without
# replaying the flow - the web-QA "testing API endpoint" pattern.
# The player is placed near the top right of the arena (the demo arena is
# 60..900 x 60..480, so the requested x=500,y=1000 is adjusted to x=850,y=100)
# and the score state is declared via property writes. The remaining coins
# are then collected with REAL input.
Feature: State seeding
  Tests can arrange a specific game state directly.

  Scenario: Starting from 5 picked coins near the top right
    Given the game is running with deterministic coin spawns
    Given the player is at "850, 100" with 5 coins already collected
    When the player collects the remaining coins
    Then the element with test_id "score_label" should have text "You win! All 8 coins collected."


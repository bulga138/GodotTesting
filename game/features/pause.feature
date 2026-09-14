# Pause-aware testing: the driver keeps working while the game is paused.
#
# The Godriver autoload runs with PROCESS_MODE_ALWAYS, so every driver
# command (reads, assertions, screenshots, state) works while
# get_tree().paused is true. The PLAYER freezes (default PAUSABLE process
# mode) - which is the correct game behavior and exactly what these
# scenarios assert.
Feature: Pause behavior
  The driver stays operational while the game is paused.

  Scenario: Pausing shows the menu and freezes the player
    Given the game is running with deterministic coin spawns
    When the player presses pause
    Then the element with test_id "paused_label" should be visible
    And the player position should not change while paused

  Scenario: Unpausing resumes the game
    Given the game is running with deterministic coin spawns
    When the player presses pause
    And the player presses pause again
    Then the element with test_id "paused_label" should not be visible

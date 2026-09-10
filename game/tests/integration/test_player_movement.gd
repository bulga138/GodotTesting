# Level 3 reference suite. Requires the GdUnit4 addon (see docs/testing/04).
# res://tests/integration/test_player_movement.gd
extends GdUnitTestSuite


func test_character_horizontal_run_matches_velocity() -> void:
	var runner := scene_runner("res://tests/fixtures/movement_test_map.tscn")
	var player := runner.find_child("Player") as CharacterBody2D

	runner.simulate_action_press("move_right")
	await runner.await_input_processed()
	await runner.simulate_frames(10)

	assert_float(player.velocity.x).is_greater(150.0)

	runner.simulate_action_release("move_right")
	await runner.simulate_frames(5)


func test_pause_menu_toggles_world_pause() -> void:
	var runner := scene_runner("res://scenes/main.tscn")

	runner.simulate_action_press("pause")
	await runner.await_input_processed()
	await runner.simulate_frames(1)
	assert_bool(get_tree().paused).is_true()

	runner.simulate_action_release("pause")
	runner.simulate_action_press("pause")
	await runner.await_input_processed()
	await runner.simulate_frames(1)
	assert_bool(get_tree().paused).is_false()
